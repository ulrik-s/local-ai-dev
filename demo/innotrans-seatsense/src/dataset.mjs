/**
 * Query layer over the generated JSON files.
 *
 * The MCP server (fake Yggio) and the REST API are both thin wrappers around
 * the functions here. Every function returns pre-aggregated numbers plus a
 * short `narrative` string, so a small local model does not have to do
 * arithmetic over thousands of rows to answer a question correctly.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8'));

const META = load('operator.json');
const TICKET_DATA = META.ticket_data;
const OPERATOR_PILOT = META.operator.seatsense.pilot;
const SERVICES = load('services.json');
const DEVICES = load('devices.json');
const PRICING = load('pricing.json');
const KPIS = load('kpis.json');
const ROWS = { 2025: load('daily-2025.json'), 2026: load('daily-2026.json') };

const SVC = Object.fromEntries(SERVICES.map((s) => [s.service_id, s]));
const BASELINE = META.coverage.baselineYear;
const CURRENT = META.coverage.seatsenseYear;
const COVERAGE_END = META.coverage.end;
const LAST_MONTH = Number(COVERAGE_END.slice(5, 7)); // last month with 2026 data
/** Last ordinary weekday in the data - the sensible default for "show me a train". */
const LATEST_WEEKDAY = ROWS[2026].filter((r) => r.day_type === 'weekday').at(-1).date;

const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);
const gbp = (n) => `GBP ${Math.round(n).toLocaleString('en-GB')}`;
const pct = (n) => `${n > 0 ? '+' : ''}${r1(n)}%`;
const growth = (a, b) => (a ? r1((b / a - 1) * 100) : null);
const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The vocabulary this dataset insists on, because the difference between the
 * first two entries is the entire argument for SeatSense.
 */
export const DEFINITIONS = {
  assumed_load_factor_pct:
    'Tickets sold / seats. This is what an operator without seat sensors reports as its load factor. It counts every no-show as a passenger on board, so it overstates how full the train was - and it is the number capacity and pricing decisions get made on.',
  cabin_factor_pct:
    'Seats SeatSense measured as physically occupied / seats. The real number. 2026 only: it did not exist before the sensors were fitted.',
  ghost_seats: 'Seats that were paid for and travelled empty.',
  sales_closed_departures_pct:
    'Share of departures where the operator stopped selling before demand ran out. In 2025 that threshold was set from ticket counts, with no way to check whether the train was actually full.',
  passengers_turned_away: 'Passengers who wanted a departure after sales had closed.',
};

/** The window both years have data for - the only honest comparison. */
export const LIKE_FOR_LIKE = {
  from_month: 1,
  to_month: LAST_MONTH,
  label: `1 January - ${COVERAGE_END.slice(8)} ${MONTH_NAMES[LAST_MONTH - 1]}`,
  note: `${CURRENT} data ends ${COVERAGE_END}, so year-on-year figures compare the same calendar window in both years unless you ask for something else.`,
};

// ---------------------------------------------------------------------------
// Filtering and aggregation
// ---------------------------------------------------------------------------

function select(year, { route_id, demand_class, service_id, day_type, from_month, to_month, from_date, to_date } = {}) {
  const fm = from_month ?? 1;
  const tm = to_month ?? 12;
  return ROWS[year].filter((row) => {
    const svc = SVC[row.service_id];
    const m = Number(row.date.slice(5, 7));
    if (m < fm || m > tm) return false;
    if (from_date && row.date < from_date) return false;
    if (to_date && row.date > to_date) return false;
    if (route_id && svc.route_id !== route_id) return false;
    if (demand_class && svc.demand_class !== demand_class) return false;
    if (service_id && row.service_id !== service_id) return false;
    if (day_type && row.day_type !== day_type) return false;
    return true;
  });
}

function aggregate(rows, year) {
  const departures = rows.length;
  if (!departures) return null;
  const seats = rows.reduce((a, r) => a + SVC[r.service_id].seats, 0);
  const sold = sum(rows, 'tickets_sold');
  const revenue = sum(rows, 'revenue_gbp');
  const assumed = r1((sold / seats) * 100);
  const out = {
    departures,
    seats_offered: seats,
    tickets_sold: sold,
    revenue_gbp: r2(revenue),
    avg_fare_gbp: r2(revenue / sold),
    assumed_load_factor_pct: assumed,
    sales_closed_departures_pct: r1((rows.filter((r) => r.sales_closed).length / departures) * 100),
    passengers_turned_away: sum(rows, 'demand_turned_away'),
  };
  if (year >= CURRENT) {
    const occupied = sum(rows, 'seats_occupied');
    const ghost = sum(rows, 'ghost_seats');
    const cabin = r1((occupied / seats) * 100);
    out.cabin_factor_pct = cabin;
    out.seatsense = {
      boarded: sum(rows, 'boarded'),
      seats_occupied: occupied,
      cabin_factor_pct: cabin,
      ticket_data_would_have_reported_pct: assumed,
      overstatement_pp: r1(assumed - cabin),
      overstatement_pct: r1((assumed / cabin - 1) * 100),
      ghost_seats: ghost,
      ghost_seat_pct: r1((ghost / seats) * 100),
      standing_passengers: sum(rows, 'standing'),
    };
  } else {
    // Deliberately null. Ticket data cannot see a no-show, so there is no
    // honest occupancy figure for 2025 - only the assumption above.
    out.cabin_factor_pct = null;
    out.cabin_factor_status =
      'Not measurable in 2025: no seat sensors, and ticket data cannot see a no-show. Only assumed_load_factor_pct exists, and it overstates how full the train was.';
    out.seatsense = null;
  }
  return out;
}

const GROUPERS = {
  total: () => ({ key: 'network', label: `${META.operator.name} - whole network` }),
  month: (row) => {
    const m = Number(row.date.slice(5, 7));
    return { key: String(m).padStart(2, '0'), label: MONTH_NAMES[m - 1] };
  },
  route: (row) => {
    const s = SVC[row.service_id];
    return { key: s.route_id, label: `${s.route_id} ${s.route_name}` };
  },
  service: (row) => {
    const s = SVC[row.service_id];
    return { key: s.service_id, label: `${s.departure_time} ${s.origin} - ${s.destination}` };
  },
  demand_class: (row) => ({ key: SVC[row.service_id].demand_class, label: SVC[row.service_id].demand_class }),
  day_type: (row) => ({ key: row.day_type, label: row.day_type }),
};

function groupAggregate(year, filters, groupBy) {
  const grouper = GROUPERS[groupBy] || GROUPERS.total;
  const buckets = new Map();
  for (const row of select(year, filters)) {
    const { key, label } = grouper(row);
    if (!buckets.has(key)) buckets.set(key, { key, label, rows: [] });
    buckets.get(key).rows.push(row);
  }
  const out = new Map();
  for (const [key, b] of buckets) out.set(key, { key, label: b.label, agg: aggregate(b.rows, year) });
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function overview() {
  const head = compareYears({ group_by: 'total' });
  const t = head.rows[0];
  return {
    yggio_tenant: META.operator.yggioTenant,
    operator: {
      name: META.operator.name,
      country: META.operator.country,
      currency: META.operator.currency,
      profile: `${META.routes.length} routes, ${SERVICES.length} daily departures, ${DEVICES.length} SeatSense nodes`,
      disclaimer: META.operator.disclaimer,
    },
    seatsense: {
      product: META.operator.seatsense.product,
      measures: META.operator.seatsense.measures,
      fleet_go_live: META.operator.seatsense.fleetGoLive,
      pilot: META.operator.seatsense.pilot,
      nodes_online: DEVICES.filter((d) => d.status === 'online').length,
      nodes_offline: DEVICES.filter((d) => d.status !== 'online').length,
    },
    data_coverage: {
      baseline_year: `${BASELINE} - ticket sales only, no occupancy measurement`,
      seatsense_year: `${CURRENT}-01-01 .. ${COVERAGE_END} - ticket sales plus measured seat occupancy`,
      rows: { [BASELINE]: ROWS[2025].length, [CURRENT]: ROWS[2026].length },
      like_for_like_window: LIKE_FOR_LIKE,
    },
    headline: {
      window: head.window.label,
      tickets_sold: { [BASELINE]: t.y2025.tickets_sold, [CURRENT]: t.y2026.tickets_sold, change_pct: t.delta.tickets_sold_pct },
      revenue_gbp: { [BASELINE]: t.y2025.revenue_gbp, [CURRENT]: t.y2026.revenue_gbp, change_pct: t.delta.revenue_pct },
      avg_fare_gbp: { [BASELINE]: t.y2025.avg_fare_gbp, [CURRENT]: t.y2026.avg_fare_gbp, change_pct: t.delta.avg_fare_pct },
      run_rate: head.run_rate,
    },
    routes: META.routes,
    demand_classes: META.demand_classes,
    blind_spot_2025: {
      what_2025_measured: 'Tickets sold. Nothing that saw a seat.',
      so_the_2025_load_factor_is: DEFINITIONS.assumed_load_factor_pct,
      there_is_no_2025_cabin_factor:
        'Not in this dataset and not at the operator: ticket data cannot see a no-show, so the number never existed. Use ticket_data_blind_spot for what it most likely was and what the gap cost.',
    },
    suggested_questions: [
      'How did revenue and passenger numbers change after SeatSense went live?',
      'What did they think their load factor was in 2025, and what was it really?',
      'Break the year-on-year change down by demand class - where did the money come from?',
      'Show me the morning peak on the Anglia Metro before and after.',
      'How many paid seats travelled empty on the 07:41 last Tuesday?',
      'How much of the revenue growth can we actually attribute to SeatSense?',
      'Which departures should we reprice next?',
    ],
    narrative: `${META.operator.name} (fictional) has ${BASELINE} ticket-sales data and ${CURRENT} data with SeatSense measured seat occupancy from ${META.operator.seatsense.fleetGoLive}. Like-for-like (${head.window.label}): tickets sold ${pct(t.delta.tickets_sold_pct)}, revenue ${pct(t.delta.revenue_pct)} (${gbp(t.delta.revenue_gbp_abs)}), average fare ${pct(t.delta.avg_fare_pct)}.`,
  };
}

export function listServices({ route_id, demand_class, direction } = {}) {
  const rows = SERVICES.filter(
    (s) => (!route_id || s.route_id === route_id) &&
      (!demand_class || s.demand_class === demand_class) &&
      (!direction || s.direction === direction),
  );
  return {
    count: rows.length,
    services: rows,
    narrative: `${rows.length} daily departures${route_id ? ` on ${route_id}` : ''}${demand_class ? ` in demand class ${demand_class}` : ''}. fare_2026_target_gbp is the fully phased-in fare; realised fares ramp through ${CURRENT}.`,
  };
}

export function compareYears({ group_by = 'total', route_id, demand_class, service_id, day_type, from_month, to_month, metric } = {}) {
  const fm = from_month ?? LIKE_FOR_LIKE.from_month;
  const tm = to_month ?? LIKE_FOR_LIKE.to_month;
  const filters = { route_id, demand_class, service_id, day_type, from_month: fm, to_month: tm };
  const a = groupAggregate(BASELINE, filters, group_by);
  const b = groupAggregate(CURRENT, filters, group_by);

  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  const rows = keys.map((key) => {
    const x = a.get(key), y = b.get(key);
    const y2025 = x?.agg ?? null, y2026 = y?.agg ?? null;
    return {
      key,
      label: (y || x).label,
      y2025,
      y2026,
      delta: y2025 && y2026 ? {
        tickets_sold_pct: growth(y2025.tickets_sold, y2026.tickets_sold),
        tickets_sold_abs: y2026.tickets_sold - y2025.tickets_sold,
        revenue_pct: growth(y2025.revenue_gbp, y2026.revenue_gbp),
        revenue_gbp_abs: r2(y2026.revenue_gbp - y2025.revenue_gbp),
        avg_fare_pct: growth(y2025.avg_fare_gbp, y2026.avg_fare_gbp),
        assumed_load_factor_pp: r1(y2026.assumed_load_factor_pct - y2025.assumed_load_factor_pct),
        sales_closed_departures_pp: r1(y2026.sales_closed_departures_pct - y2025.sales_closed_departures_pct),
        passengers_turned_away_abs: y2026.passengers_turned_away - y2025.passengers_turned_away,
      } : null,
    };
  });
  if (group_by !== 'total' && metric !== 'none') {
    rows.sort((p, q) => (q.delta?.revenue_gbp_abs ?? -Infinity) - (p.delta?.revenue_gbp_abs ?? -Infinity));
  }

  const out = {
    window: {
      months: `${MONTH_NAMES[fm - 1]} - ${MONTH_NAMES[tm - 1]}`,
      label: fm === LIKE_FOR_LIKE.from_month && tm === LIKE_FOR_LIKE.to_month ? LIKE_FOR_LIKE.label : `${MONTH_NAMES[fm - 1]} - ${MONTH_NAMES[tm - 1]}, both years`,
      like_for_like: true,
      note: LIKE_FOR_LIKE.note,
    },
    filters: { group_by, route_id: route_id ?? 'all', demand_class: demand_class ?? 'all', service_id: service_id ?? 'all', day_type: day_type ?? 'all' },
    rows,
    notes: [
      `tickets_sold and revenue_gbp are directly comparable between years. Cabin factor, ghost seats and standing exist for ${CURRENT} only - nothing measured seats in ${BASELINE}.`,
      'assumed_load_factor_pct is available for both years but is not an occupancy figure: it is tickets / seats, which counts no-shows as passengers.',
    ],
    definitions: DEFINITIONS,
  };

  if (group_by === 'total') {
    out.run_rate = runRate({ route_id, demand_class, service_id });
    const t = rows[0];
    out.narrative = t?.delta
      ? `${LIKE_FOR_LIKE.label}: tickets sold ${t.y2025.tickets_sold.toLocaleString('en-GB')} -> ${t.y2026.tickets_sold.toLocaleString('en-GB')} (${pct(t.delta.tickets_sold_pct)}), revenue ${gbp(t.y2025.revenue_gbp)} -> ${gbp(t.y2026.revenue_gbp)} (${pct(t.delta.revenue_pct)}, ${gbp(t.delta.revenue_gbp_abs)} more), average fare GBP ${t.y2025.avg_fare_gbp} -> GBP ${t.y2026.avg_fare_gbp} (${pct(t.delta.avg_fare_pct)}). Ticket-derived load factor ${t.y2025.assumed_load_factor_pct}% -> ${t.y2026.assumed_load_factor_pct}%, and in 2026 SeatSense puts the real cabin factor at ${t.y2026.cabin_factor_pct}% - ${t.y2026.seatsense.overstatement_pp} points below what ticket data alone would have reported. 2025 has no cabin factor at all: nobody measured it.`
      : 'No data for the requested filters.';
  } else {
    const best = rows[0], worst = rows[rows.length - 1];
    out.narrative = `Grouped by ${group_by}. Biggest revenue gain: ${best?.label} (${pct(best?.delta?.revenue_pct ?? 0)}, ${gbp(best?.delta?.revenue_gbp_abs ?? 0)}). Smallest: ${worst?.label} (${pct(worst?.delta?.revenue_pct ?? 0)}).`;
  }
  return out;
}

/** Latest complete month year-on-year, annualised - the "where are we now" number. */
export function runRate({ route_id, demand_class, service_id } = {}) {
  const filters = { route_id, demand_class, service_id, from_month: LAST_MONTH, to_month: LAST_MONTH };
  const a = aggregate(select(BASELINE, filters), BASELINE);
  const b = aggregate(select(CURRENT, filters), CURRENT);
  if (!a || !b) return null;
  const revPct = growth(a.revenue_gbp, b.revenue_gbp);
  const fullYear2025 = aggregate(select(BASELINE, { route_id, demand_class, service_id }), BASELINE);
  return {
    month: `${MONTH_NAMES[LAST_MONTH - 1]} ${CURRENT} vs ${MONTH_NAMES[LAST_MONTH - 1]} ${BASELINE}`,
    why: `Pricing rules were tuned monthly through ${CURRENT}, so the latest month shows the effect at full strength while the year-to-date average is diluted by the phase-in.`,
    tickets_sold_pct: growth(a.tickets_sold, b.tickets_sold),
    revenue_pct: revPct,
    avg_fare_pct: growth(a.avg_fare_gbp, b.avg_fare_gbp),
    network_avg_cabin_factor_pct: b.seatsense?.cabin_factor_pct ?? null,
    network_avg_cabin_factor_note: 'Averaged over every departure of the day including the quiet ones - not a peak figure. Use peak_spreading_report for the peak.',
    ghost_seat_pct: b.seatsense?.ghost_seat_pct ?? null,
    annualised_revenue_uplift_gbp: r2((fullYear2025.revenue_gbp * revPct) / 100),
    annualised_basis: `Full ${BASELINE} revenue ${gbp(fullYear2025.revenue_gbp)} x ${pct(revPct)}`,
  };
}

export function serviceHistory({ service_id, from_date, to_date, limit = 60 } = {}) {
  const svc = SVC[service_id];
  if (!svc) return { error: `Unknown service_id "${service_id}". Use list_services to see the ${SERVICES.length} valid ids.` };
  const pick = (year) => select(year, { service_id, from_date, to_date }).slice(-limit);
  const a = pick(BASELINE), b = pick(CURRENT);
  return {
    service: svc,
    window: { from_date: from_date ?? 'start of data', to_date: to_date ?? COVERAGE_END, rows_per_year: limit },
    [BASELINE]: { rows: a, summary: aggregate(select(BASELINE, { service_id, from_date, to_date }), BASELINE) },
    [CURRENT]: { rows: b, summary: aggregate(select(CURRENT, { service_id, from_date, to_date }), CURRENT) },
    narrative: `${svc.departure_time} ${svc.origin} - ${svc.destination} (${svc.demand_class}, ${svc.seats} seats). Showing the last ${limit} days of each year in the window.`,
  };
}

/**
 * Per-coach seat occupancy for one departure - the "SeatSense sees the actual
 * seat" moment. 2026 only; nothing measured seats in 2025.
 */
export function seatsenseSnapshot({ service_id, date }) {
  const svc = SVC[service_id];
  if (!svc) return { error: `Unknown service_id "${service_id}".` };
  if (!date) return { error: 'A date is required, e.g. 2026-06-16.' };
  if (date < `${CURRENT}-01-01`) {
    return {
      error: `No seat-level data for ${date}. SeatSense went live ${META.operator.seatsense.fleetGoLive}; before that the operator only had ticket sales.`,
      available_from: META.operator.seatsense.fleetGoLive,
    };
  }
  const row = ROWS[CURRENT].find((r) => r.service_id === service_id && r.date === date);
  if (!row) return { error: `No data for ${service_id} on ${date}. Data runs ${CURRENT}-01-01 .. ${COVERAGE_END}.` };

  // Which unit worked the diagram - deterministic from service + date.
  const route = META.routes.find((r) => r.route_id === svc.route_id);
  const unitNo = (hash(`${service_id}${date}`) % route.units) + 1;
  const unit = `${svc.route_id}-U${String(unitNo).padStart(3, '0')}`;

  // Coaches nearest the doors fill first; the rear coaches carry the slack.
  const letters = 'ABCDEFGHIJ'.slice(0, svc.coaches).split('');
  const weights = letters.map((c, i) => 1.12 - 0.05 * i + (hash(`${unit}${c}${date}`) % 100) / 2500);
  const wsum = weights.reduce((a, b) => a + b, 0);

  const alloc = letters.map((_, i) => Math.min(svc.seats_per_coach, Math.round((row.seats_occupied * weights[i]) / wsum)));
  // Spread the rounding remainder round-robin over the coaches that have room,
  // so the per-coach figures always add up to the measured train total.
  let remainder = row.seats_occupied - alloc.reduce((a, b) => a + b, 0);
  for (let guard = 0; remainder !== 0 && guard < svc.seats; guard++) {
    let moved = false;
    for (let i = 0; i < alloc.length && remainder !== 0; i++) {
      const step = Math.sign(remainder);
      const next = alloc[i] + step;
      if (next >= 0 && next <= svc.seats_per_coach) { alloc[i] = next; remainder -= step; moved = true; }
    }
    if (!moved) break;
  }
  const coaches = letters.map((coach, i) => ({
    coach,
    device_id: `iot-${unit}-${coach}`.toLowerCase(),
    seats: svc.seats_per_coach,
    seats_occupied: alloc[i],
    seats_empty: svc.seats_per_coach - alloc[i],
    occupancy_pct: r1((alloc[i] / svc.seats_per_coach) * 100),
  }));

  const soldLoad = r1((row.tickets_sold / svc.seats) * 100);
  const worst = [...coaches].sort((a, b) => b.seats_empty - a.seats_empty)[0];
  return {
    service: { service_id, departure_time: svc.departure_time, origin: svc.origin, destination: svc.destination, demand_class: svc.demand_class, seats: svc.seats, coaches: svc.coaches },
    date,
    day_type: row.day_type,
    unit_id: unit,
    train: {
      tickets_sold: row.tickets_sold,
      assumed_load_factor_pct: soldLoad,
      boarded: row.boarded,
      seats_occupied: row.seats_occupied,
      cabin_factor_pct: r1((row.seats_occupied / svc.seats) * 100),
      overstatement_pp: r1(soldLoad - (row.seats_occupied / svc.seats) * 100),
      ghost_seats: row.ghost_seats,
      ghost_seat_pct: r1((row.ghost_seats / svc.seats) * 100),
      standing_passengers: row.standing,
      revenue_gbp: row.revenue_gbp,
      ghost_seat_value_gbp: r2(row.ghost_seats * (row.revenue_gbp / row.tickets_sold)),
    },
    coaches,
    definitions: {
      tickets_sold: 'Tickets sold for this departure. In 2025 this was the only number the operator had, and it was treated as the passenger count.',
      boarded: 'People SeatSense saw on board. Tickets sold minus no-shows.',
      assumed_load_factor_pct: DEFINITIONS.assumed_load_factor_pct,
      cabin_factor_pct: DEFINITIONS.cabin_factor_pct,
      ghost_seats: DEFINITIONS.ghost_seats,
    },
    narrative: `${svc.departure_time} ${svc.origin} - ${svc.destination} on ${date}: ${row.tickets_sold} tickets sold against ${svc.seats} seats (${soldLoad}% sold). SeatSense measured ${row.seats_occupied} seats occupied, ${row.standing} passengers standing and ${row.ghost_seats} ghost seats worth ${gbp(row.ghost_seats * (row.revenue_gbp / row.tickets_sold))}${row.standing > 0 && row.ghost_seats > 0 ? ` - people were standing while ${row.ghost_seats} paid-for seats travelled empty` : ''}. Emptiest coach: ${worst.coach} with ${worst.seats_empty} free seats out of ${svc.seats_per_coach}.`,
  };
}

/**
 * The core of the pitch: how the morning peak load redistributed after
 * SeatSense-informed pricing pushed passengers into the shoulder departures.
 */
export function peakSpreadingReport({ route_id, month } = {}) {
  const m = month ?? LAST_MONTH;
  const window = { from_month: m, to_month: m, day_type: 'weekday' };
  const morning = SERVICES.filter(
    (s) => s.direction === 'up' && (!route_id || s.route_id === route_id) &&
      ['peak_core', 'peak_shoulder'].includes(s.demand_class) &&
      s.departure_time >= '05:30' && s.departure_time <= '09:30',
  ).sort((a, b) => (a.route_id + a.departure_time).localeCompare(b.route_id + b.departure_time));

  const perService = morning.map((s) => {
    const a = aggregate(select(BASELINE, { ...window, service_id: s.service_id }), BASELINE);
    const b = aggregate(select(CURRENT, { ...window, service_id: s.service_id }), CURRENT);
    const weekdays = b?.departures ?? 0;
    return {
      service_id: s.service_id,
      departure_time: s.departure_time,
      route_id: s.route_id,
      demand_class: s.demand_class,
      seats: s.seats,
      fare_2025_gbp: a ? a.avg_fare_gbp : null,
      fare_2026_gbp: b ? b.avg_fare_gbp : null,
      fare_change_pct: a && b ? growth(a.avg_fare_gbp, b.avg_fare_gbp) : null,
      assumed_load_factor_2025_pct: a?.assumed_load_factor_pct ?? null,
      assumed_load_factor_2026_pct: b?.assumed_load_factor_pct ?? null,
      cabin_factor_2026_pct: b?.cabin_factor_pct ?? null,
      cabin_factor_2025_pct: null,
      ghost_seats_per_departure_2026: b && weekdays ? r1(b.seatsense.ghost_seats / weekdays) : null,
      passengers_per_weekday_2025: a ? Math.round(a.tickets_sold / a.departures) : null,
      passengers_per_weekday_2026: b ? Math.round(b.tickets_sold / weekdays) : null,
    };
  });

  // How concentrated the morning peak is: peak_core's share of the passengers
  // travelling in the morning peak window. Falling = demand has spread out.
  const share = (year) => {
    const c = aggregate(select(year, { ...window, route_id, demand_class: 'peak_core' }), year);
    const sh = aggregate(select(year, { ...window, route_id, demand_class: 'peak_shoulder' }), year);
    return c && sh ? r1((c.tickets_sold / (c.tickets_sold + sh.tickets_sold)) * 100) : null;
  };
  const core = (year) => aggregate(select(year, { ...window, route_id, demand_class: 'peak_core' }), year);
  const shoulder = (year) => aggregate(select(year, { ...window, route_id, demand_class: 'peak_shoulder' }), year);
  const a25 = core(BASELINE), a26 = core(CURRENT), s25 = shoulder(BASELINE), s26 = shoulder(CURRENT);
  const over95 = (year) => {
    const rows = select(year, { ...window, route_id, demand_class: 'peak_core' });
    return rows.length ? r1((rows.filter((r) => r.tickets_sold / SVC[r.service_id].seats >= 0.95).length / rows.length) * 100) : null;
  };

  return {
    scope: { route_id: route_id ?? 'all routes', month: `${MONTH_NAMES[m - 1]}, weekdays only, ${BASELINE} vs ${CURRENT}`, services: morning.length },
    summary: {
      peak_core: {
        assumed_load_factor_pct: { [BASELINE]: a25?.assumed_load_factor_pct, [CURRENT]: a26?.assumed_load_factor_pct },
        cabin_factor_pct: { [BASELINE]: null, [CURRENT]: a26?.cabin_factor_pct ?? null },
        ticket_data_overstatement_2026_pp: a26?.seatsense?.overstatement_pp ?? null,
        passengers: { [BASELINE]: a25?.tickets_sold, [CURRENT]: a26?.tickets_sold, change_pct: growth(a25?.tickets_sold, a26?.tickets_sold) },
        avg_fare_gbp: { [BASELINE]: a25?.avg_fare_gbp, [CURRENT]: a26?.avg_fare_gbp, change_pct: growth(a25?.avg_fare_gbp, a26?.avg_fare_gbp) },
        revenue_gbp: { [BASELINE]: a25?.revenue_gbp, [CURRENT]: a26?.revenue_gbp, change_pct: growth(a25?.revenue_gbp, a26?.revenue_gbp) },
        departures_sold_at_95pct_or_more: { [BASELINE]: over95(BASELINE), [CURRENT]: over95(CURRENT) },
        standing_passengers_2026: a26?.seatsense?.standing_passengers ?? null,
      },
      peak_shoulder: {
        assumed_load_factor_pct: { [BASELINE]: s25?.assumed_load_factor_pct, [CURRENT]: s26?.assumed_load_factor_pct },
        cabin_factor_pct: { [BASELINE]: null, [CURRENT]: s26?.cabin_factor_pct ?? null },
        passengers: { [BASELINE]: s25?.tickets_sold, [CURRENT]: s26?.tickets_sold, change_pct: growth(s25?.tickets_sold, s26?.tickets_sold) },
        avg_fare_gbp: { [BASELINE]: s25?.avg_fare_gbp, [CURRENT]: s26?.avg_fare_gbp, change_pct: growth(s25?.avg_fare_gbp, s26?.avg_fare_gbp) },
        revenue_gbp: { [BASELINE]: s25?.revenue_gbp, [CURRENT]: s26?.revenue_gbp, change_pct: growth(s25?.revenue_gbp, s26?.revenue_gbp) },
      },
      share_of_morning_peak_passengers_on_peak_core_pct: {
        [BASELINE]: share(BASELINE),
        [CURRENT]: share(CURRENT),
        means: 'Peak-core share of all passengers travelling in the morning peak window. Falling means demand has spread into the shoulder departures.',
      },
      morning_peak_total: {
        passengers_change_pct: growth((a25?.tickets_sold ?? 0) + (s25?.tickets_sold ?? 0), (a26?.tickets_sold ?? 0) + (s26?.tickets_sold ?? 0)),
        revenue_change_pct: growth((a25?.revenue_gbp ?? 0) + (s25?.revenue_gbp ?? 0), (a26?.revenue_gbp ?? 0) + (s26?.revenue_gbp ?? 0)),
      },
    },
    services: perService,
    definitions: DEFINITIONS,
    narrative: `Morning peak, ${MONTH_NAMES[m - 1]} weekdays. Peak-core's share of morning peak passengers fell from ${share(BASELINE)}% to ${share(CURRENT)}% - that is the spreading. The crush departures went from ${a25?.assumed_load_factor_pct}% to ${a26?.assumed_load_factor_pct}% on ticket-derived load factor - and SeatSense now measures the real cabin factor at ${a26?.cabin_factor_pct}%, ${a26?.seatsense?.overstatement_pp} points below what tickets alone would have said - while their fares rose ${pct(growth(a25?.avg_fare_gbp, a26?.avg_fare_gbp))}. The shoulder departures went from ${s25?.assumed_load_factor_pct}% to ${s26?.assumed_load_factor_pct}% sold on fares ${pct(growth(s25?.avg_fare_gbp, s26?.avg_fare_gbp))}. Across the whole morning peak that is ${pct(growth((a25?.tickets_sold ?? 0) + (s25?.tickets_sold ?? 0), (a26?.tickets_sold ?? 0) + (s26?.tickets_sold ?? 0)))} passengers and ${pct(growth((a25?.revenue_gbp ?? 0) + (s25?.revenue_gbp ?? 0), (a26?.revenue_gbp ?? 0) + (s26?.revenue_gbp ?? 0)))} revenue.`,
  };
}

export function pricingActions({ route_id, demand_class } = {}) {
  const classRows = PRICING.class_actions
    .filter((c) => !demand_class || c.demand_class === demand_class)
    .map((c) => {
      const f = { route_id, demand_class: c.demand_class };
      const a = aggregate(select(BASELINE, { ...f, from_month: LAST_MONTH, to_month: LAST_MONTH }), BASELINE);
      const b = aggregate(select(CURRENT, { ...f, from_month: LAST_MONTH, to_month: LAST_MONTH }), CURRENT);
      return {
        ...c,
        realised_avg_fare_gbp: { [BASELINE]: a?.avg_fare_gbp, [CURRENT]: b?.avg_fare_gbp, change_pct: growth(a?.avg_fare_gbp, b?.avg_fare_gbp) },
        realised_passengers_change_pct: growth(a?.tickets_sold, b?.tickets_sold),
        realised_revenue_change_pct: growth(a?.revenue_gbp, b?.revenue_gbp),
        implied_arc_elasticity: a && b && growth(a.avg_fare_gbp, b.avg_fare_gbp)
          ? r2(growth(a.tickets_sold, b.tickets_sold) / growth(a.avg_fare_gbp, b.avg_fare_gbp))
          : null,
      };
    });
  return {
    effective_from: PRICING.effective_from,
    mechanism: PRICING.mechanism,
    rationale: PRICING.rationale,
    phase_in: PRICING.phase_in,
    measured_in: `${MONTH_NAMES[LAST_MONTH - 1]} ${CURRENT} vs ${MONTH_NAMES[LAST_MONTH - 1]} ${BASELINE} (effect at full strength)`,
    class_actions: classRows,
    service_actions: PRICING.service_actions.filter((s) => !route_id || s.service_id.startsWith(route_id)),
    notes: [
      'implied_arc_elasticity is passengers %change divided by fare %change for the class. Negative on the discounted classes means the discount bought volume; on the peak classes it shows how little volume the increase cost.',
      'Fare changes are averages of a demand-based rule, not a single published fare.',
    ],
    narrative: `From ${PRICING.effective_from} fares follow measured occupancy: ${classRows.map((c) => `${c.demand_class} ${pct(c.fare_change_pct)}`).join(', ')}. ${PRICING.phase_in}`,
  };
}

export function seatsenseAttribution({ assumed_market_growth_pct } = {}) {
  const g = assumed_market_growth_pct ?? KPIS.attribution.assumedMarketGrowthPct;
  const f = { from_month: LIKE_FOR_LIKE.from_month, to_month: LIKE_FOR_LIKE.to_month };
  const a = aggregate(select(BASELINE, f), BASELINE);
  const b = aggregate(select(CURRENT, f), CURRENT);

  // Standard price / volume decomposition of the revenue delta.
  const priceEffect = (b.avg_fare_gbp - a.avg_fare_gbp) * b.tickets_sold;
  const volumeEffect = (b.tickets_sold - a.tickets_sold) * a.avg_fare_gbp;
  const total = b.revenue_gbp - a.revenue_gbp;
  const counterfactual = a.revenue_gbp * (1 + g / 100);

  // Ghost-seat recovery: how much of the fleet's paid-but-empty seat problem
  // has been closed since January, valued at the realised fare.
  const jan = aggregate(select(CURRENT, { from_month: 1, to_month: 1 }), CURRENT);
  const now = aggregate(select(CURRENT, { from_month: LAST_MONTH, to_month: LAST_MONTH }), CURRENT);
  const ghostRateDrop = (jan.seatsense.ghost_seat_pct - now.seatsense.ghost_seat_pct) / 100;
  const seatsPerDay = now.seats_offered / new Date(Date.UTC(CURRENT, LAST_MONTH, 0)).getUTCDate();
  const recoveredPerDay = seatsPerDay * ghostRateDrop;

  return {
    window: LIKE_FOR_LIKE.label,
    revenue: { [BASELINE]: a.revenue_gbp, [CURRENT]: b.revenue_gbp, change_gbp: r2(total), change_pct: growth(a.revenue_gbp, b.revenue_gbp) },
    decomposition: {
      price_effect_gbp: r2(priceEffect),
      volume_effect_gbp: r2(volumeEffect),
      method: 'price_effect = (fare_2026 - fare_2025) x tickets_2026; volume_effect = (tickets_2026 - tickets_2025) x fare_2025',
      residual_gbp: r2(total - priceEffect - volumeEffect),
    },
    counterfactual: {
      assumed_market_growth_pct: g,
      assumption: KPIS.attribution.note,
      revenue_without_seatsense_gbp: r2(counterfactual),
      seatsense_attributable_gbp: r2(b.revenue_gbp - counterfactual),
      seatsense_attributable_pct_of_2025: growth(a.revenue_gbp, counterfactual) != null ? r1(((b.revenue_gbp - counterfactual) / a.revenue_gbp) * 100) : null,
    },
    ghost_seat_recovery: {
      ghost_seat_pct_january: jan.seatsense.ghost_seat_pct,
      ghost_seat_pct_latest_month: now.seatsense.ghost_seat_pct,
      seats_recovered_per_day: Math.round(recoveredPerDay),
      valued_at_avg_fare_gbp: now.avg_fare_gbp,
      annualised_value_gbp: r2(recoveredPerDay * now.avg_fare_gbp * 365),
      assumption: 'Assumes every recovered ghost seat is resold at the current average fare across a full year. Illustrative, not booked revenue.',
    },
    run_rate: runRate(),
    narrative: `Like-for-like revenue is up ${gbp(total)} (${pct(growth(a.revenue_gbp, b.revenue_gbp))}). Split: ${gbp(priceEffect)} from higher average fare, ${gbp(volumeEffect)} from carrying more passengers. Against a ${g}% assumed market trend, ${gbp(b.revenue_gbp - counterfactual)} is attributable to SeatSense-informed pricing. Ghost seats fell from ${jan.seatsense.ghost_seat_pct}% of capacity in January to ${now.seatsense.ghost_seat_pct}% now - about ${Math.round(recoveredPerDay)} paid-but-empty seats a day recovered.`,
  };
}

export function crowdingAndPerformance({ month } = {}) {
  const m = month ?? LAST_MONTH;
  const ramp = Math.min(1, 0.45 + 0.08 * (m - 1));
  const kpis = Object.fromEntries(
    Object.entries(KPIS.endpoints).map(([k, v]) => [k, {
      [BASELINE]: v.y2025,
      [CURRENT]: r1(v.y2025 + (v.y2026End - v.y2025) * ramp),
      end_state_target: v.y2026End,
      change_pct: growth(v.y2025, v.y2025 + (v.y2026End - v.y2025) * ramp),
    }]),
  );
  const over = (year, threshold) => {
    const rows = select(year, { from_month: m, to_month: m, day_type: 'weekday' });
    return r1((rows.filter((r) => r.tickets_sold / SVC[r.service_id].seats >= threshold).length / rows.length) * 100);
  };
  const b = aggregate(select(CURRENT, { from_month: m, to_month: m, day_type: 'weekday' }), CURRENT);
  const a = aggregate(select(BASELINE, { from_month: m, to_month: m, day_type: 'weekday' }), BASELINE);
  // Sales caps and turn-aways only bite in busy months, so those two are
  // reported over the whole like-for-like window instead of one month.
  const lfl = { day_type: 'weekday', from_month: LIKE_FOR_LIKE.from_month, to_month: LIKE_FOR_LIKE.to_month };
  const yA = aggregate(select(BASELINE, lfl), BASELINE);
  const yB = aggregate(select(CURRENT, lfl), CURRENT);
  const yWeekdays = (year) => new Set(select(year, lfl).map((r) => r.date)).size;
  const pk = (year) => aggregate(select(year, { ...lfl, demand_class: 'peak_core' }), year);
  const pkA = pk(BASELINE), pkB = pk(CURRENT);
  const monthly = [];
  for (let i = 1; i <= LAST_MONTH; i++) {
    const rows = select(CURRENT, { from_month: i, to_month: i, day_type: 'weekday' });
    const agg = aggregate(rows, CURRENT);
    monthly.push({
      month: MONTH_NAMES[i - 1],
      ghost_seat_pct: agg.seatsense.ghost_seat_pct,
      cabin_factor_pct: agg.seatsense.cabin_factor_pct,
      standing_passengers: agg.seatsense.standing_passengers,
      crowding_complaints_per_100k: r1(KPIS.endpoints.crowding_complaints_per_100k_journeys.y2025 +
        (KPIS.endpoints.crowding_complaints_per_100k_journeys.y2026End - KPIS.endpoints.crowding_complaints_per_100k_journeys.y2025) * Math.min(1, 0.45 + 0.08 * (i - 1))),
    });
  }
  return {
    scope: `${MONTH_NAMES[m - 1]}, weekdays, ${BASELINE} vs ${CURRENT}`,
    service_quality: kpis,
    crowding_from_data: {
      departures_sold_at_95pct_or_more: { [BASELINE]: over(BASELINE, 0.95), [CURRENT]: over(CURRENT, 0.95) },
      departures_sold_over_100pct: { [BASELINE]: over(BASELINE, 1.0), [CURRENT]: over(CURRENT, 1.0) },
      standing_passengers_2026: b.seatsense.standing_passengers,
      cabin_factor_pct_2026: b.seatsense.cabin_factor_pct,
      ghost_seat_pct_2026: b.seatsense.ghost_seat_pct,
      sales_closed_departures_pct: { [BASELINE]: yA.sales_closed_departures_pct, [CURRENT]: yB.sales_closed_departures_pct, window: LIKE_FOR_LIKE.label },
      sales_closed_peak_core_departures_pct: { [BASELINE]: pkA.sales_closed_departures_pct, [CURRENT]: pkB.sales_closed_departures_pct, window: LIKE_FOR_LIKE.label, note: 'The network figure above is diluted by the 44 departures a day that never approach the threshold. This is the morning crush only.' },
      passengers_turned_away_per_weekday: {
        [BASELINE]: r1(yA.passengers_turned_away / yWeekdays(BASELINE)),
        [CURRENT]: r1(yB.passengers_turned_away / yWeekdays(CURRENT)),
        window: LIKE_FOR_LIKE.label,
        means: 'Passengers who wanted a departure after sales had closed. In 2025 sales were closed on a ticket-derived threshold, so some of these were turned away from trains that had empty seats. Measured over the like-for-like window rather than a single month, since a quiet month never hits the threshold.',
      },
    },
    monthly_2026: monthly,
    notes: [
      'Service-quality KPIs are modelled to follow the same monthly phase-in as the pricing rules; the crowding percentages are counted directly from the departure data.',
      `${BASELINE} has no seat-level measurement, so standing and ghost seats are ${CURRENT}-only.`,
    ],
    narrative: `Crush departures (sold at 95%+ of seats) fell from ${over(BASELINE, 0.95)}% of weekday departures to ${over(CURRENT, 0.95)}%. Crowding complaints ${KPIS.endpoints.crowding_complaints_per_100k_journeys.y2025} -> ${kpis.crowding_complaints_per_100k_journeys[CURRENT]} per 100k journeys, PPM punctuality ${KPIS.endpoints.ppm_punctuality_pct.y2025}% -> ${kpis.ppm_punctuality_pct[CURRENT]}%. Over ${LIKE_FOR_LIKE.label}, sales were closed on ${yA.sales_closed_departures_pct}% of weekday departures in ${BASELINE} against ${yB.sales_closed_departures_pct}% in ${CURRENT}, turning away ${r1(yA.passengers_turned_away / yWeekdays(BASELINE))} passengers a weekday then versus ${r1(yB.passengers_turned_away / yWeekdays(CURRENT))} now - and in ${BASELINE} nobody could check whether those trains were actually full.`,
  };
}

/**
 * Forward-looking: what should the revenue team do next week?
 *
 * The rules are deliberately explicit and reported back with the answer -
 * the point of the demo is that every recommendation traces to a measured
 * number, not to a black box.
 */
export function repricingCandidates({ limit = 8, days = 28, month } = {}) {
  const RULES = {
    raise_fare: 'Measured occupancy at or above 93%, or 5+ passengers standing per departure: the train is physically full, so only price can shift demand.',
    release_seats_earlier: 'Ghost seats at or above 3% of capacity on a departure sold at 80%+: paid seats are travelling empty, so release them for on-day sale instead of capping availability.',
    oversell_to_measured_capacity: 'Sold at 88%+ but measured occupancy 90% or less: there is proven room to sell beyond nominal capacity.',
    discount_to_fill: 'Sold load 45% or less: spare capacity the neighbouring peak could be priced into.',
  };
  const window = month
    ? { from_month: month, to_month: month }
    : { from_date: new Date(new Date(COVERAGE_END + 'T00:00:00Z').getTime() - days * 86400000).toISOString().slice(0, 10) };

  const out = [];
  for (const svc of SERVICES) {
    const rows = select(CURRENT, { ...window, service_id: svc.service_id, day_type: 'weekday' });
    if (!rows.length) continue;
    const agg = aggregate(rows, CURRENT);
    const soldLoad = agg.assumed_load_factor_pct;
    const ghost = agg.seatsense.ghost_seat_pct;
    const occ = agg.seatsense.cabin_factor_pct;
    const standingPerDeparture = agg.seatsense.standing_passengers / agg.departures;

    let action = null, move = 0;
    if (occ >= 93 || standingPerDeparture >= 5) { action = 'raise_fare'; move = 3; }
    else if (ghost >= 3 && soldLoad >= 80) action = 'release_seats_earlier';
    else if (soldLoad >= 88 && occ <= 90) action = 'oversell_to_measured_capacity';
    else if (soldLoad <= 45) { action = 'discount_to_fill'; move = -4; }
    if (!action) continue;

    const revenuePerWeekdayYear = (agg.revenue_gbp / agg.departures) * 253;
    out.push({
      service_id: svc.service_id,
      departure_time: svc.departure_time,
      route_id: svc.route_id,
      demand_class: svc.demand_class,
      measured: {
        assumed_load_factor_pct: soldLoad,
        cabin_factor_pct: occ,
        ghost_seat_pct: ghost,
        ghost_seats_per_departure: r1(agg.seatsense.ghost_seats / agg.departures),
        standing_per_departure: r1(standingPerDeparture),
        avg_fare_gbp: agg.avg_fare_gbp,
      },
      recommended_action: action,
      suggested_fare_move_pct: move,
      reason: RULES[action],
      indicative_annual_revenue_effect_gbp: move
        ? r2(revenuePerWeekdayYear * (move / 100) * (move > 0 ? 0.75 : -1.4))
        : r2(revenuePerWeekdayYear * (action === 'release_seats_earlier' ? ghost / 100 : 0.02)),
      effect_assumption: move
        ? 'Fare increases assume 25% of the gain is lost to demand; discounts assume a 1.4x volume response.'
        : 'Assumes the measured spare capacity is sold at the current average fare. Indicative only.',
    });
  }

  // Actions that need a commercial decision come before the ones that are
  // just availability housekeeping; within each, biggest money first.
  const priority = ['raise_fare', 'release_seats_earlier', 'oversell_to_measured_capacity', 'discount_to_fill'];
  out.sort((a, b) =>
    priority.indexOf(a.recommended_action) - priority.indexOf(b.recommended_action) ||
    Math.abs(b.indicative_annual_revenue_effect_gbp) - Math.abs(a.indicative_annual_revenue_effect_gbp));
  const top = out.slice(0, limit);
  const counts = {};
  for (const c of out) counts[c.recommended_action] = (counts[c.recommended_action] || 0) + 1;

  return {
    window: month ? `${MONTH_NAMES[month - 1]} ${CURRENT} weekdays` : `Weekdays ${window.from_date} .. ${COVERAGE_END}`,
    rules_applied: RULES,
    sort_order: 'Action priority (fare decisions, then seat release, then oversell, then discounts), then largest indicative money first.',
    candidates: top,
    total_candidates: out.length,
    by_action: counts,
    indicative_total_annual_effect_gbp: r2(top.reduce((a, c) => a + c.indicative_annual_revenue_effect_gbp, 0)),
    narrative: `${out.length} departures have a clear next move (${Object.entries(counts).map(([k, v]) => `${v} x ${k}`).join(', ')}); showing the ${top.length} largest. ${top[0] ? `Top: ${top[0].service_id} at ${top[0].departure_time} - ${top[0].recommended_action}. ${top[0].reason}` : ''}`,
  };
}


/**
 * The 2025 blind spot, quantified.
 *
 * This is the tool for "but operators already have ticket data". It shows what
 * the operator reported in 2025 and what it decided on that basis, why the
 * number could not be an occupancy figure, what the four manual load surveys
 * hinted at, what SeatSense now measures the same gap to be in 2026, and -
 * clearly flagged as an inference - what 2025 most likely actually looked like.
 */
export function ticketDataBlindSpot({ demand_class = 'peak_core', month } = {}) {
  const m = month ?? LAST_MONTH;
  const yearWin = { demand_class, day_type: 'weekday' };
  const a = aggregate(select(BASELINE, yearWin), BASELINE);           // all of 2025
  const monthWin = { demand_class, day_type: 'weekday', from_month: m, to_month: m };
  const aM = aggregate(select(BASELINE, monthWin), BASELINE);
  const bM = aggregate(select(CURRENT, monthWin), CURRENT);
  const weekdays2025 = new Set(select(BASELINE, yearWin).map((r) => r.date)).size;
  const perWeekday = (n) => r1(n / weekdays2025);

  // The four 2025 manual load surveys - the only 2025 data that saw bodies.
  const surveyRows = ROWS[BASELINE].filter((r) => r.manual_load_survey !== undefined);
  const surveys = TICKET_DATA.loadSurveyDates2025.map((date) => {
    const rows = surveyRows.filter((r) => r.date === date);
    const tickets = sum(rows, 'tickets_sold');
    const counted = sum(rows, 'manual_load_survey');
    return { date, services_counted: rows.length, tickets_sold: tickets, passengers_counted_by_hand: counted, tickets_overstated_by_pct: r1((tickets / counted - 1) * 100) };
  });
  const surveyGapPct = r1((sum(surveyRows, 'tickets_sold') / sum(surveyRows, 'manual_load_survey') - 1) * 100);

  // Inference: apply the pilot's no-show range to what 2025 reported.
  const [lo, hi] = TICKET_DATA.pilotNoShowRange;
  const bodies = (loadPct) => [r1(loadPct * (1 - hi)), r1(loadPct * (1 - lo))];
  const [estLow, estHigh] = bodies(a.assumed_load_factor_pct);
  const seatsPerTrain = Math.round(a.seats_offered / a.departures);
  const emptyRange = [
    Math.round((seatsPerTrain * Math.max(0, 100 - estHigh)) / 100),
    Math.round((seatsPerTrain * Math.max(0, 100 - estLow)) / 100),
  ];

  // The departures where the operator actually stopped selling.
  const closedRows = select(BASELINE, yearWin).filter((r) => r.sales_closed);
  const closedLoad = closedRows.length
    ? r1((sum(closedRows, 'tickets_sold') / closedRows.reduce((s, r) => s + SVC[r.service_id].seats, 0)) * 100)
    : null;
  const threshold = SERVICES.find((x) => x.demand_class === demand_class)?.sales_close_threshold_2025_pct ?? null;
  const turnedAwayPerYear = (a.passengers_turned_away / weekdays2025) * 253;

  return {
    scope: {
      demand_class,
      baseline: `All ${BASELINE} weekdays (${a.departures} departures)`,
      measured_comparison: `${MONTH_NAMES[m - 1]} ${BASELINE} vs ${MONTH_NAMES[m - 1]} ${CURRENT}`,
    },
    what_2025_reported: {
      assumed_load_factor_pct: a.assumed_load_factor_pct,
      how_it_was_calculated: DEFINITIONS.assumed_load_factor_pct,
      cabin_factor_pct: null,
      cabin_factor_status: a.cabin_factor_status,
      sales_close_threshold_pct: threshold,
      threshold_basis: 'Seats plus an assumed standing allowance. Set from ticket counts, because there was no way to see how many people were actually on board.',
      sales_closed_departures_pct: a.sales_closed_departures_pct,
      mean_assumed_load_factor_when_sales_closed_pct: closedLoad,
      passengers_turned_away_per_weekday: perWeekday(a.passengers_turned_away),
      decisions_made_on_it: 'Where to close sales, which departures to lengthen, and what to charge.',
    },
    why_ticket_data_cannot_answer_it: {
      available_in_2025: TICKET_DATA.what_2025_had,
      not_available_in_2025: TICKET_DATA.what_2025_could_not_have,
    },
    manual_load_surveys_2025: {
      method: TICKET_DATA.loadSurveyMethod,
      surveys,
      tickets_overstated_passengers_by_pct: surveyGapPct,
      why_it_was_not_enough:
        'Four days out of 365, one direction, counted by hand. Enough to suspect the gap, nowhere near enough to price a network on - and it still says nothing about which seats were empty.',
    },
    pilot_2025_q4: OPERATOR_PILOT,
    measured_in_2026: {
      month: `${MONTH_NAMES[m - 1]}, both years`,
      assumed_load_factor_pct: { [BASELINE]: aM.assumed_load_factor_pct, [CURRENT]: bM.assumed_load_factor_pct },
      cabin_factor_pct: { [BASELINE]: null, [CURRENT]: bM.cabin_factor_pct },
      ticket_data_overstates_by_pp: bM.seatsense.overstatement_pp,
      ticket_data_overstates_by_pct: bM.seatsense.overstatement_pct,
      note: 'Same trains, same ticketing system. The gap is what an operator running on ticket sales alone is still carrying, unmeasured.',
    },
    inferred_for_2025: {
      inference: true,
      method: `${BASELINE} assumed load factor x (1 - no-show rate), using the ${lo * 100}-${hi * 100}% range that the Q4 ${BASELINE} pilot and the four manual surveys both landed in. The operator could not have computed this at the time.`,
      estimated_cabin_factor_pct_range: [estLow, estHigh],
      estimated_empty_seats_per_departure_range: emptyRange,
      seats_per_train: seatsPerTrain,
      on_departures_where_sales_closed: closedLoad ? {
        share_of_departures_pct: a.sales_closed_departures_pct,
        assumed_load_factor_pct: closedLoad,
        estimated_passengers_on_board_pct_of_seats_range: bodies(closedLoad),
        what_that_means:
          `Sales were closed at ${threshold}% of seats to protect a standing allowance. With ${lo * 100}-${hi * 100}% no-shows, the people who actually turned up were roughly ${bodies(closedLoad)[0]}-${bodies(closedLoad)[1]}% of seats - so most of that allowance was never used, and passengers were turned away from trains that had room.`,
      } : null,
      cost_of_the_blind_spot: {
        revenue_turned_away_gbp_per_year: r2(turnedAwayPerYear * a.avg_fare_gbp),
        revenue_turned_away_basis: `${perWeekday(a.passengers_turned_away)} passengers a weekday x 253 weekdays x ${gbp(a.avg_fare_gbp)} average fare. Directly foregone - these people wanted to travel and were refused.`,
        seats_travelling_empty_per_weekday_range: [emptyRange[0] * Math.round(a.departures / weekdays2025), emptyRange[1] * Math.round(a.departures / weekdays2025)],
        bigger_cost_note:
          `The turned-away fares are the small half. The larger cost was pricing the entire network off a load factor roughly ${surveyGapPct}% too high - peak departures looked full so they were never repriced, and the half-empty departures either side were never discounted. What that was worth is what ${CURRENT} shows: see seatsense_attribution.`,
      },
      caveat: `An estimate built on a measured range, not a measurement. ${CURRENT} is the first year these numbers are observed rather than inferred.`,
    },
    definitions: DEFINITIONS,
    narrative: `Across ${BASELINE} the operator reported a ${a.assumed_load_factor_pct}% load factor on its ${demand_class} departures, closed sales on ${a.sales_closed_departures_pct}% of them (threshold ${threshold}% of seats) and turned away ${perWeekday(a.passengers_turned_away)} passengers a weekday. That figure was tickets divided by seats: it counted every no-show as a passenger, and no cabin factor existed - ticket data cannot see an empty seat. The four manual load surveys that year found ticket sales overstating passengers by ${surveyGapPct}%. In ${MONTH_NAMES[m - 1]} ${CURRENT} SeatSense measures the gap directly: ticket data would report ${bM.assumed_load_factor_pct}%, the real cabin factor is ${bM.cabin_factor_pct}%, ${bM.seatsense.overstatement_pp} points lower. Applying the pilot's ${lo * 100}-${hi * 100}% range to ${BASELINE} puts the real cabin factor then at ${estLow}-${estHigh}% - an estimated ${emptyRange[0]}-${emptyRange[1]} of ${seatsPerTrain} seats travelling empty on trains the operator believed were full.`,
  };
}

// ---------------------------------------------------------------------------
// Yggio device surface
// ---------------------------------------------------------------------------

export function listDevices({ route_id, unit_id, status, limit = 25, offset = 0 } = {}) {
  const all = DEVICES.filter(
    (d) => (!route_id || d.contextMap.route_id === route_id) &&
      (!unit_id || d.contextMap.unit_id === unit_id) &&
      (!status || d.status === status),
  );
  const page = all.slice(offset, offset + limit);
  const byRoute = {};
  for (const d of DEVICES) byRoute[d.contextMap.route_id] = (byRoute[d.contextMap.route_id] || 0) + 1;
  return {
    total: all.length,
    offset,
    limit,
    fleet_summary: {
      nodes: DEVICES.length,
      by_route: byRoute,
      online: DEVICES.filter((d) => d.status === 'online').length,
      offline: DEVICES.filter((d) => d.status !== 'online').length,
      installed_at: META.operator.seatsense.fleetGoLive,
      device_model: META.operator.seatsense.deviceModel,
    },
    iotnodes: page,
    narrative: `${DEVICES.length} SeatSense nodes in Yggio tenant ${META.operator.yggioTenant} - one per instrumented coach, all installed ${META.operator.seatsense.fleetGoLive}. Showing ${page.length} of ${all.length} matching.`,
  };
}

/** Latest values plus a same-day occupancy series for one coach's sensor. */
export function deviceReadings({ device_id, date }) {
  const dev = DEVICES.find((d) => d._id === device_id || d._id === `iot-${String(device_id).toLowerCase()}`);
  if (!dev) return { error: `Unknown device_id "${device_id}". Use yggio_list_iotnodes to find ids (they look like iot-nbr1-u003-b).` };
  const day = date ?? LATEST_WEEKDAY;
  if (day < `${CURRENT}-01-01`) return { error: `SeatSense was installed ${META.operator.seatsense.fleetGoLive}; no readings exist for ${day}.` };

  const routeServices = SERVICES.filter((s) => s.route_id === dev.contextMap.route_id);
  const series = [];
  for (const svc of routeServices.sort((a, b) => a.departure_time.localeCompare(b.departure_time))) {
    const row = ROWS[CURRENT].find((r) => r.service_id === svc.service_id && r.date === day);
    if (!row) continue;
    const snap = seatsenseSnapshot({ service_id: svc.service_id, date: day });
    const coach = snap.coaches?.find((c) => c.coach === dev.contextMap.coach);
    series.push({
      time: `${day}T${svc.departure_time}:00Z`,
      service_id: svc.service_id,
      seats: dev.contextMap.seat_count,
      seatsOccupied: coach ? Math.round((coach.occupancy_pct / 100) * dev.contextMap.seat_count) : null,
      occupancyPercent: coach ? coach.occupancy_pct : null,
    });
  }
  const peak = series.reduce((a, s) => ((s.occupancyPercent ?? 0) > (a?.occupancyPercent ?? -1) ? s : a), null);
  return {
    iotnode: { _id: dev._id, name: dev.name, deviceModelName: dev.deviceModelName, contextMap: dev.contextMap, status: dev.status },
    date: day,
    latestValues: { ...dev.latestValues, seatsOccupied: series.at(-1)?.seatsOccupied ?? null },
    occupancy_series: series,
    narrative: `${dev.name} (${dev.contextMap.seat_count} seats) on ${day}: ${series.length} departures reported.${peak ? ` Busiest was the ${peak.service_id.slice(-4).replace(/(\d\d)(\d\d)/, '$1:$2')} at ${peak.occupancyPercent}% seat occupancy.` : ''}`,
  };
}

export function meta() {
  return { operator: META, services: SERVICES.length, devices: DEVICES.length, coverage: META.coverage, like_for_like: LIKE_FOR_LIKE };
}

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
