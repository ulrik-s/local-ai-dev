#!/usr/bin/env node
/**
 * Generates the demo dataset into ../data as plain JSON.
 *
 *   node src/generate.mjs            # regenerate everything
 *   node src/generate.mjs --through 2026-09-30
 *
 * Output is deterministic: same inputs, byte-identical files. The data is
 * committed to the repo so the demo needs no build step on site.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  GENERATOR_VERSION, COVERAGE, OPERATOR, ROUTES, DEMAND_CLASSES, SEASONALITY,
  BANK_HOLIDAYS, KPI_ENDPOINTS, ATTRIBUTION, TICKET_DATA, rampFor, jitter, lerp,
  buildServices, round1, round2, rng,
} from './model.mjs';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const through = arg('--through', COVERAGE.end);

const iso = (d) => d.toISOString().slice(0, 10);
const eachDate = (from, to) => {
  const out = [];
  for (let d = new Date(from + 'T00:00:00Z'); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(iso(d));
  return out;
};

/** Weekend / bank-holiday demand multiplier for a given demand class. */
function dayTypeFactor(date, demandClass) {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  const cls = DEMAND_CLASSES[demandClass];
  const holiday = BANK_HOLIDAYS.has(date);
  if (dow === 0 || holiday) return cls.weekendFactor * 0.82;
  if (dow === 6) return cls.weekendFactor;
  return 1;
}

const dayType = (date) => {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  if (BANK_HOLIDAYS.has(date)) return 'bank_holiday';
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  return 'weekday';
};

const services = buildServices();
const routeById = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

/**
 * One departure on one day.
 *
 * 2025 rows carry only what the operator could actually know back then:
 * tickets sold and revenue. 2026 rows add the SeatSense measurements -
 * boarded passengers, seats physically occupied, standing, and ghost seats
 * (paid for, travelled empty).
 */
function makeRow(svc, date) {
  const route = routeById[svc.route_id];
  const cls = DEMAND_CLASSES[svc.demand_class];
  const [y, m] = date.split('-').map(Number);
  const ramp = rampFor(y, m);
  const seed = `${svc.service_id}|${date}`;

  const load = lerp(cls.load2025, lerp(cls.load2025, cls.load2026, route.effectStrength), ramp);
  const fareMult = lerp(1, 1 + cls.fareDelta2026 * route.effectStrength, ramp);

  const demand =
    svc.seats * load * route.loadAdjust * SEASONALITY[m - 1] *
    dayTypeFactor(date, svc.demand_class) * jitter(seed + '|vol', 0.035);

  // Sales close at a threshold the operator sets. In 2025 that threshold is a
  // guess built on ticket counts; demand above it walks away.
  const cap = svc.seats * (y >= COVERAGE.seatsenseYear ? cls.salesCap2026 : cls.salesCap2025);
  const sold = Math.max(0, Math.round(Math.min(demand, cap)));
  const turnedAway = Math.max(0, Math.round(demand) - sold);
  const fare = round2(svc.fare_2025_gbp * fareMult * jitter(seed + '|fare', 0.02));

  const row = {
    date,
    service_id: svc.service_id,
    day_type: dayType(date),
    tickets_sold: sold,
    revenue_gbp: round2(sold * fare),
    sales_closed: turnedAway > 0,
    demand_turned_away: turnedAway,
  };

  // The only 2025 data that ever saw an actual passenger: four manual load
  // surveys, morning up services, with a counting error.
  if (y < COVERAGE.seatsenseYear && TICKET_DATA.loadSurveyDates2025.includes(date) &&
      svc.direction === 'up' && svc.departure_time < '10:00') {
    const [lo, hi] = TICKET_DATA.pilotNoShowRange;
    const noShow = lerp(lo, hi, rng(seed + '|survey')());
    row.manual_load_survey = Math.round(sold * (1 - noShow) * jitter(seed + '|count', 0.03));
  }

  if (y >= COVERAGE.seatsenseYear) {
    const noShowRate = lerp(cls.noShowStart, cls.noShowEnd, ramp) * jitter(seed + '|ns', 0.18);
    const wasteRate = lerp(cls.wasteStart, cls.wasteEnd, ramp) * jitter(seed + '|w', 0.22);
    const boarded = Math.round(sold * (1 - noShowRate));
    // Usable seats: even a crush-loaded train never gets every seat sat on.
    const usable = Math.floor(svc.seats * (1 - wasteRate));
    const occupied = Math.min(usable, boarded);
    row.boarded = boarded;
    row.seats_occupied = occupied;
    // Standing passengers can coexist with empty seats - that is the point.
    row.standing = Math.max(0, boarded - occupied);
    row.ghost_seats = Math.max(0, Math.min(sold, svc.seats) - occupied);
  }
  return row;
}

function buildDaily(from, to) {
  const rows = [];
  for (const date of eachDate(from, to)) for (const svc of services) rows.push(makeRow(svc, date));
  return rows;
}

/** Yggio-shaped IoT nodes: one SeatSense gateway per instrumented coach. */
function buildDevices() {
  const nodes = [];
  const coachLetters = 'ABCDEFGHIJ';
  for (const route of ROUTES) {
    for (let u = 1; u <= route.units; u++) {
      const unit = `${route.id}-U${String(u).padStart(3, '0')}`;
      for (let c = 0; c < route.coachesPerUnit; c++) {
        const coach = coachLetters[c];
        const id = `${unit}-${coach}`.toLowerCase();
        const j = jitter(id, 1);
        const battery = Math.round(lerp(74, 99, (j + 1) / 2));
        const offline = jitter(id + '|off', 1) > 0.985;
        nodes.push({
          _id: `iot-${id}`,
          name: `SeatSense ${unit} coach ${coach}`,
          deviceModelName: OPERATOR.seatsense.deviceModel,
          contextMap: {
            operator: OPERATOR.id,
            route_id: route.id,
            unit_id: unit,
            coach,
            seat_count: route.seatsPerCoach,
            installed_at: OPERATOR.seatsense.fleetGoLive,
            firmware: '2.4.1',
          },
          status: offline ? 'offline' : 'online',
          latestValues: {
            seatsOccupied: null, // filled per-query by the snapshot endpoints
            batteryPercent: battery,
            rssi: -Math.round(lerp(58, 96, jitter(id + '|rssi', 1) / 2 + 0.5)),
            reportedAt: offline ? '2026-08-19T04:12:07Z' : '2026-08-31T23:58:02Z',
          },
        });
      }
    }
  }
  return nodes;
}

/** Fare actions taken on 1 January 2026, by demand class. */
function buildPricing() {
  return {
    effective_from: COVERAGE.seatsenseGoLive,
    mechanism: 'SeatSense-informed demand-based pricing',
    rationale:
      'Fares are set from measured seat occupancy rather than ticket sales. Departures that SeatSense proves are physically full take a fare increase; the half-empty departures either side are discounted to attract the displaced demand; paid seats that SeatSense sees empty after departure are released for on-day sale.',
    phase_in:
      'Rules were tuned monthly through 2026 as SeatSense history accumulated. January reflects ~45% of the end-state effect, August ~100%.',
    class_actions: Object.entries(DEMAND_CLASSES).map(([id, cls]) => ({
      demand_class: id,
      label: cls.label,
      fare_change_pct: round1(cls.fareDelta2026 * 100),
      intent:
        cls.fareDelta2026 > 0
          ? 'Suppress marginal demand on physically full departures and raise yield'
          : 'Attract displaced demand into measured spare capacity',
      sold_load_2025_pct: round1(cls.load2025 * 100),
      sold_load_2026_target_pct: round1(cls.load2026 * 100),
    })),
    service_actions: services
      .filter((s) => s.demand_class === 'peak_core' || s.demand_class === 'peak_shoulder')
      .map((s) => ({
        service_id: s.service_id,
        departure_time: s.departure_time,
        demand_class: s.demand_class,
        fare_2025_gbp: s.fare_2025_gbp,
        fare_2026_target_gbp: s.fare_2026_target_gbp,
        fare_change_pct: s.fare_change_pct,
      })),
  };
}

mkdirSync(DATA_DIR, { recursive: true });

const write = (name, obj) => {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(obj, null, name.startsWith('daily-') ? 0 : 2) + '\n');
  return name;
};

const daily2025 = buildDaily('2025-01-01', '2025-12-31');
const daily2026 = buildDaily('2026-01-01', through);

const files = [
  write('operator.json', {
    operator: OPERATOR,
    coverage: { ...COVERAGE, end: through },
    routes: ROUTES.map((r) => ({
      route_id: r.id,
      name: r.name,
      origin: r.origin,
      destination: r.destination,
      calling_points: r.calling,
      profile: r.profile,
      units: r.units,
      coaches_per_unit: r.coachesPerUnit,
      seats_per_coach: r.seatsPerCoach,
      seats_per_train: r.coachesPerUnit * r.seatsPerCoach,
      daily_departures: r.services.length,
      peak_fare_gbp: r.peakFareGbp,
    })),
    demand_classes: Object.entries(DEMAND_CLASSES).map(([id, c]) => ({
      demand_class: id, label: c.label, description: c.description,
    })),
    ticket_data: TICKET_DATA,
    data_dictionary: {
      both_years: {
        tickets_sold: 'Tickets sold for the departure. A sale, not a person in a seat.',
        revenue_gbp: 'Ticket revenue for the departure.',
        sales_closed: 'True if the operator stopped selling this departure before demand ran out.',
        demand_turned_away: 'Passengers who wanted this departure after sales closed.',
      },
      [`${COVERAGE.baselineYear}_only`]: {
        manual_load_survey: 'Passengers counted by hand on board, on the four survey days only. The single 2025 field that saw actual people.',
        note: 'There is no occupancy field for 2025 because no such measurement existed. tickets_sold / seats is an assumed load factor and overstates the people on board by the no-show rate.',
      },
      [`${COVERAGE.seatsenseYear}_only`]: {
        boarded: 'People SeatSense saw on board. Tickets sold minus no-shows.',
        seats_occupied: 'Seats SeatSense measured as physically occupied - the cabin factor numerator.',
        standing: 'People on board with no seat, measured.',
        ghost_seats: 'Seats paid for that travelled empty.',
      },
    },
    generator: { version: GENERATOR_VERSION, generated_at: new Date().toISOString().slice(0, 10) },
  }),
  write('services.json', services),
  write('devices.json', buildDevices()),
  write('pricing.json', buildPricing()),
  write('kpis.json', { endpoints: KPI_ENDPOINTS, attribution: ATTRIBUTION }),
  write('daily-2025.json', daily2025),
  write('daily-2026.json', daily2026),
];

const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
console.log(`wrote ${files.join(', ')}`);
console.log(`2025: ${daily2025.length} rows, ${sum(daily2025, 'tickets_sold').toLocaleString()} tickets, GBP ${Math.round(sum(daily2025, 'revenue_gbp')).toLocaleString()}`);
console.log(`2026: ${daily2026.length} rows (through ${through}), ${sum(daily2026, 'tickets_sold').toLocaleString()} tickets, GBP ${Math.round(sum(daily2026, 'revenue_gbp')).toLocaleString()}`);
