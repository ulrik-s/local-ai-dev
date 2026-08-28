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
  BANK_HOLIDAYS, TICKET_DATA, SALES_POLICY, ATTRIBUTION,
  MARKET_GROWTH_2026, BUSINESS_CASE_TARGET_PCT, pricingActive, noShowRateFor, jitter, lerp,
  buildServices, round1, round2,
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
 * Both years record what ticket data can see: seats sold (never more than the
 * seats there are), revenue, whether sales closed, and the demand that arrived
 * afterwards. 2026 rows add what SeatSense measures - who boarded, how many
 * seats were physically occupied, and how many paid-for seats departed empty.
 *
 * 2026 rows also carry `cf_*`: the counterfactual, meaning what the departure
 * would have done on 2025's pricing rules with the same market growth. That is
 * how the attribution isolates the pricing effect, rather than netting off a
 * flat growth rate - which would be wrong here, because a departure that is
 * already sold out cannot absorb market growth at all.
 */
function makeRow(svc, date) {
  const route = routeById[svc.route_id];
  const cls = DEMAND_CLASSES[svc.demand_class];
  const [y, m] = date.split('-').map(Number);
  const seed = `${svc.service_id}|${date}`;
  const seatsense = y >= COVERAGE.seatsenseYear;

  // One ticket per seat, no overselling: sales stop at seated capacity.
  const cap = Math.round((svc.seats * SALES_POLICY.sales_cap_pct_of_seats) / 100);
  const baseDemand =
    svc.seats * cls.demand2025 * route.loadAdjust * SEASONALITY[m - 1] *
    dayTypeFactor(date, svc.demand_class) * jitter(seed + '|vol', 0.035) *
    (seatsense ? 1 + MARKET_GROWTH_2026 : 1);

  /** Sell one scenario: a fare multiplier and a demand response to it. */
  const sell = (fareMult, demandMult) => {
    const demand = Math.round(baseDemand * demandMult);
    const sold = Math.max(0, Math.min(demand, cap));
    const fare = round2(svc.fare_2025_gbp * fareMult * jitter(seed + '|fare', 0.02));
    return { demand, sold, revenue: round2(sold * fare), turnedAway: Math.max(0, demand - sold) };
  };

  const effect = route.effectStrength * pricingActive(y);
  const priced = sell(1 + cls.fareDelta2026 * effect, 1 + cls.demandDelta2026 * effect);

  const row = {
    date,
    service_id: svc.service_id,
    day_type: dayType(date),
    tickets_sold: priced.sold,
    revenue_gbp: priced.revenue,
    sales_closed: priced.demand > cap,
    demand_turned_away: priced.turnedAway,
  };

  // The no-show rate is the same in both years. SeatSense measures it; it does
  // not change it. In 2025 nobody could observe it at all.
  const noShowRate = noShowRateFor(svc.service_id, svc.demand_class) * jitter(seed + '|ns', 0.18);

  if (seatsense) {
    const boarded = Math.round(priced.sold * (1 - noShowRate));
    row.boarded = boarded;
    row.seats_occupied = boarded;                 // every ticket carries a seat
    row.ghost_seats = priced.sold - boarded;      // paid for, travelled empty
    const cf = sell(1, 1);                        // same year, 2025's pricing
    row.cf_tickets_sold = cf.sold;
    row.cf_revenue_gbp = cf.revenue;
  } else if (TICKET_DATA.loadSurveyDates2025.includes(date) &&
             svc.direction === 'up' && svc.departure_time < '10:00') {
    // The only 2025 data that ever saw an actual passenger: four manual load
    // surveys, morning up services, counted by hand with an error margin.
    row.manual_load_survey = Math.round(priced.sold * (1 - noShowRate) * jitter(seed + '|count', 0.03));
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
    mechanism: 'Demand-based pricing on measured seat occupancy',
    rationale:
      'Fares are set from measured cabin factor rather than tickets sold. Departures SeatSense proves are physically full carry a small increase, because the demand sitting behind their closed sale is real. Departures with measured spare capacity are discounted to attract the passengers those closed sales turn away. The moves are one to two percent: the value is in aiming them at the right departures, not in their size.',
    not_available: SALES_POLICY.what_seatsense_does_not_do,
    phase_in: 'None - the rules were live in full from 1 January 2026.',
    why_the_effect_varies_by_month:
      'A fare increase only reaches revenue on a departure whose sales cap binds. In a quiet month the morning peak does not sell out, the increase loses exactly the volume it gains, and the effect falls to almost nothing. The gain is concentrated in the months when the peak is genuinely full.',
    fare_basket: 'Unchanged overall - the increases and discounts are set to offset in the regulated basket.',
    class_actions: Object.entries(DEMAND_CLASSES).map(([id, cls]) => ({
      demand_class: id,
      label: cls.label,
      fare_change_pct: round1(cls.fareDelta2026 * 100),
      demand_response_pct: round1(cls.demandDelta2026 * 100),
      rationale: cls.pricingRationale,
      no_show_rate_pct: round1(cls.noShowRate * 100),
      demand_2025_pct_of_seats: round1(cls.demand2025 * 100),
      capacity_constrained: cls.demand2025 > 1,
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
    sales_policy: SALES_POLICY,
    ticket_data: TICKET_DATA,
    business_case: {
      target_total_revenue_uplift_pct: BUSINESS_CASE_TARGET_PCT,
      source: 'The operator\'s own projection, signed off before rollout.',
      mechanism: 'Demand-based pricing on measured occupancy. No overselling, no reselling of no-show seats, no increase to the fare basket.',
      assumed_market_growth_pct: MARKET_GROWTH_2026 * 100,
      market_growth_note: ATTRIBUTION.note,
    },
    data_dictionary: {
      both_years: {
        tickets_sold: 'Tickets sold for the departure, never more than the seats there are. A sale, not a person in a seat.',
        revenue_gbp: 'Ticket revenue for the departure. Identical whether the ticket holder travels or not - which is why ticket data cannot see a no-show.',
        sales_closed: 'True if demand exceeded the 100%-of-seats cap and sales were stopped.',
        demand_turned_away: 'Passengers who wanted this departure after sales closed. Not absorbed by overselling, because overselling is not permitted.',
      },
      [`${COVERAGE.baselineYear}_only`]: {
        manual_load_survey: 'Passengers counted by hand on board, on the four survey days only. The single 2025 field that saw actual people.',
        note: 'There is no occupancy field for 2025 because no such measurement existed. tickets_sold / seats is an assumed load factor and overstates the people on board by the no-show rate.',
      },
      [`${COVERAGE.seatsenseYear}_only`]: {
        boarded: 'People SeatSense saw on board. Tickets sold minus no-shows.',
        seats_occupied: 'Seats SeatSense measured as physically occupied - the cabin factor numerator. Equal to boarded, since every ticket carries a seat and there is no standing product.',
        ghost_seats: 'Seats paid for that travelled empty. Not recoverable: the seat still belongs to its buyer and overselling to cover it is not permitted.',
        cf_tickets_sold: "Counterfactual: seats this departure would have sold on 2025's pricing rules, with the same market growth applied.",
        cf_revenue_gbp: 'Counterfactual revenue on the same basis. Observed minus counterfactual is the pricing effect, and that is the SeatSense business case.',
      },
    },
    generator: { version: GENERATOR_VERSION, generated_at: new Date().toISOString().slice(0, 10) },
  }),
  write('services.json', services),
  write('devices.json', buildDevices()),
  write('pricing.json', buildPricing()),
  write('daily-2025.json', daily2025),
  write('daily-2026.json', daily2026),
];

const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
console.log(`wrote ${files.join(', ')}`);
console.log(`2025: ${daily2025.length} rows, ${sum(daily2025, 'tickets_sold').toLocaleString()} tickets, GBP ${Math.round(sum(daily2025, 'revenue_gbp')).toLocaleString()}`);
console.log(`2026: ${daily2026.length} rows (through ${through}), ${sum(daily2026, 'tickets_sold').toLocaleString()} tickets, GBP ${Math.round(sum(daily2026, 'revenue_gbp')).toLocaleString()}`);
