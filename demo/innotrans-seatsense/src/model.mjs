/**
 * Scenario model for the InnoTrans SeatSense demo.
 *
 * Everything about the fictional operator lives here: network, timetable,
 * demand classes, fares and the 2026 SeatSense effect. `generate.mjs` turns
 * this into the JSON files under ../data. Nothing here is real data.
 *
 * The story in one paragraph:
 *   Northbank Rail ran 2025 blind - it only knew how many tickets it sold,
 *   not how many people actually sat down. Its morning peak trains looked
 *   sold out (and were capped), while a chunk of paid seats travelled empty
 *   (no-shows, unclaimed reservations, bags on seats). A Q4-2025 SeatSense
 *   pilot on three units measured that waste. On 1 January 2026 SeatSense
 *   went fleet-wide and the operator started pricing off measured occupancy:
 *   peak fares up, shoulder fares down, seats released the moment SeatSense
 *   proves nobody is in them. Result: fewer crush-loaded trains, more
 *   passengers carried, higher revenue.
 */

export const GENERATOR_VERSION = '1.0.0';

/** Full 2025 baseline year; 2026 runs to the last day of data we ship. */
export const COVERAGE = {
  baselineYear: 2025,
  seatsenseYear: 2026,
  start: '2025-01-01',
  end: '2026-08-31',
  seatsenseGoLive: '2026-01-01',
};

export const OPERATOR = {
  id: 'northbank-rail',
  name: 'Northbank Rail',
  legalName: 'Northbank Rail Operations Ltd',
  country: 'United Kingdom',
  headquarters: 'London, UK',
  currency: 'GBP',
  fictional: true,
  disclaimer:
    'Northbank Rail is a fictional train operating company. All figures in this dataset are synthetic and generated for demonstration purposes.',
  yggioTenant: 'northbank-rail-prod',
  seatsense: {
    product: 'Sensative SeatSense',
    deviceModel: 'sensative-seatsense-v2',
    measures:
      'Per-seat occupancy - whether a seat is physically occupied by a person, reported continuously per coach.',
    fleetGoLive: '2026-01-01',
    pilot: {
      window: '2025-10-01 .. 2025-12-19',
      scope: '3 units on the Anglia Metro (NBR1), 24 coaches instrumented',
      findings: [
        'On departures sold at 100% or more of seated capacity, an average of 11.2% of seats travelled empty.',
        'Median 54 paid-but-empty seats per peak departure; worst observed 81 seats.',
        'Ticket sales overstated the number of people on board peak trains by 9-12%.',
        'Sales caps were being applied to trains that had seats available the whole journey.',
      ],
    },
  },
};

/**
 * Demand classes. `load2025` is the mean weekday sold load factor (tickets
 * sold / seats) before SeatSense; `load2026` is the end-state target once the
 * SeatSense-informed pricing is fully phased in. `fareIndex` is the mean
 * realised yield per passenger as a fraction of the route's peak fare.
 */
export const DEMAND_CLASSES = {
  peak_core: {
    label: 'Morning peak core',
    description: 'The 07:00-08:30 arrivals. Sold out, capped, standing passengers.',
    load2025: 1.06,
    load2026: 1.02,
    fareIndex: 1.0,
    fareDelta2026: 0.14,
    noShowStart: 0.095,
    noShowEnd: 0.038,
    wasteStart: 0.075,
    wasteEnd: 0.03,
    salesCap2025: 1.12,
    salesCap2026: 1.14,
    weekendFactor: 0.34,
  },
  peak_shoulder: {
    label: 'Peak shoulder',
    description: 'The half-empty departures either side of the crush - the demo\'s real prize.',
    load2025: 0.64,
    load2026: 0.79,
    fareIndex: 0.89,
    fareDelta2026: -0.05,
    noShowStart: 0.06,
    noShowEnd: 0.03,
    wasteStart: 0.05,
    wasteEnd: 0.025,
    salesCap2025: 1.2,
    salesCap2026: 1.2,
    weekendFactor: 0.46,
  },
  offpeak: {
    label: 'Off-peak',
    description: 'Midday and late evening leisure travel.',
    load2025: 0.43,
    load2026: 0.48,
    fareIndex: 0.62,
    fareDelta2026: -0.04,
    noShowStart: 0.045,
    noShowEnd: 0.028,
    wasteStart: 0.032,
    wasteEnd: 0.02,
    salesCap2025: 1.2,
    salesCap2026: 1.2,
    weekendFactor: 0.74,
  },
  evening_peak: {
    label: 'Evening peak',
    description: 'The 16:30-18:00 exodus out of the city.',
    load2025: 0.98,
    load2026: 0.92,
    fareIndex: 0.94,
    fareDelta2026: 0.1,
    noShowStart: 0.075,
    noShowEnd: 0.035,
    wasteStart: 0.066,
    wasteEnd: 0.028,
    salesCap2025: 1.1,
    salesCap2026: 1.13,
    weekendFactor: 0.58,
  },
  early_late: {
    label: 'Early / late',
    description: 'First and last departures of the day.',
    load2025: 0.31,
    load2026: 0.36,
    fareIndex: 0.56,
    fareDelta2026: -0.06,
    noShowStart: 0.04,
    noShowEnd: 0.025,
    wasteStart: 0.03,
    wasteEnd: 0.02,
    salesCap2025: 1.2,
    salesCap2026: 1.2,
    weekendFactor: 0.44,
  },
};

/** Seats per coach x coaches per unit gives the seated capacity we sell against. */
export const ROUTES = [
  {
    id: 'NBR1',
    name: 'Anglia Metro',
    origin: 'Colchester',
    destination: 'London Liverpool Street',
    calling: ['Colchester', 'Marks Tey', 'Kelvedon', 'Witham', 'Chelmsford', 'Shenfield', 'London Liverpool Street'],
    profile: 'High-frequency commuter',
    units: 12,
    coachesPerUnit: 8,
    seatsPerCoach: 60,
    peakFareGbp: 24.6,
    loadAdjust: 1.0,
    effectStrength: 1.0,
    services: [
      ['0541', 'up', 'early_late'],
      ['0611', 'up', 'peak_shoulder'],
      ['0641', 'up', 'peak_shoulder'],
      ['0711', 'up', 'peak_core'],
      ['0741', 'up', 'peak_core'],
      ['0811', 'up', 'peak_core'],
      ['0841', 'up', 'peak_shoulder'],
      ['0911', 'up', 'peak_shoulder'],
      ['1011', 'up', 'offpeak'],
      ['1211', 'up', 'offpeak'],
      ['1411', 'up', 'offpeak'],
      ['1657', 'down', 'evening_peak'],
      ['1727', 'down', 'evening_peak'],
      ['1757', 'down', 'evening_peak'],
      ['1927', 'down', 'offpeak'],
      ['2057', 'down', 'offpeak'],
      ['2227', 'down', 'early_late'],
      ['2327', 'down', 'early_late'],
    ],
  },
  {
    id: 'NBR2',
    name: 'Great Northern Line',
    origin: 'Peterborough',
    destination: "London King's Cross",
    calling: ['Peterborough', 'Huntingdon', 'St Neots', 'Sandy', 'Biggleswade', 'Hitchin', 'Stevenage', "London King's Cross"],
    profile: 'Long-distance commuter',
    units: 11,
    coachesPerUnit: 9,
    seatsPerCoach: 56,
    peakFareGbp: 41.2,
    loadAdjust: 0.98,
    effectStrength: 0.95,
    services: [
      ['0548', 'up', 'early_late'],
      ['0618', 'up', 'peak_shoulder'],
      ['0648', 'up', 'peak_shoulder'],
      ['0718', 'up', 'peak_core'],
      ['0748', 'up', 'peak_core'],
      ['0818', 'up', 'peak_core'],
      ['0848', 'up', 'peak_shoulder'],
      ['0918', 'up', 'peak_shoulder'],
      ['1018', 'up', 'offpeak'],
      ['1218', 'up', 'offpeak'],
      ['1418', 'up', 'offpeak'],
      ['1633', 'down', 'evening_peak'],
      ['1703', 'down', 'evening_peak'],
      ['1733', 'down', 'evening_peak'],
      ['1903', 'down', 'offpeak'],
      ['2033', 'down', 'offpeak'],
      ['2203', 'down', 'early_late'],
      ['2303', 'down', 'early_late'],
    ],
  },
  {
    id: 'NBR3',
    name: 'Pennine Shuttle',
    origin: 'Huddersfield',
    destination: 'York',
    calling: ['Huddersfield', 'Dewsbury', 'Leeds', 'Garforth', 'Church Fenton', 'York'],
    profile: 'Regional commuter',
    units: 9,
    coachesPerUnit: 5,
    seatsPerCoach: 68,
    peakFareGbp: 11.4,
    loadAdjust: 1.03,
    effectStrength: 1.08,
    services: [
      ['0552', 'up', 'early_late'],
      ['0622', 'up', 'peak_shoulder'],
      ['0652', 'up', 'peak_shoulder'],
      ['0722', 'up', 'peak_core'],
      ['0752', 'up', 'peak_core'],
      ['0822', 'up', 'peak_shoulder'],
      ['0922', 'up', 'offpeak'],
      ['1122', 'up', 'offpeak'],
      ['1322', 'up', 'offpeak'],
      ['1644', 'down', 'evening_peak'],
      ['1714', 'down', 'evening_peak'],
      ['1744', 'down', 'evening_peak'],
      ['1914', 'down', 'offpeak'],
      ['2044', 'down', 'offpeak'],
      ['2214', 'down', 'early_late'],
      ['2314', 'down', 'early_late'],
    ],
  },
];

/** Month-of-year demand multipliers (1 = January). */
export const SEASONALITY = [0.92, 0.96, 1.02, 0.98, 1.03, 1.05, 1.01, 0.9, 1.09, 1.08, 1.06, 0.94];

/** Great Britain bank holidays that matter to a GB timetable. */
export const BANK_HOLIDAYS = new Set([
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31',
]);

/**
 * The 2026 changes did not land fully formed on 1 January. Pricing rules were
 * tuned month by month as SeatSense history accumulated, so the measured
 * effect ramps from 45% of end-state in January to 100% in August.
 */
export function rampFor(year, month) {
  if (year < COVERAGE.seatsenseYear) return 0;
  return Math.min(1, 0.45 + 0.08 * (month - 1));
}

/** Static KPI endpoints the ramp interpolates between. */
export const KPI_ENDPOINTS = {
  crowding_complaints_per_100k_journeys: { y2025: 41.2, y2026End: 23.8 },
  mean_peak_dwell_seconds: { y2025: 78, y2026End: 66 },
  ppm_punctuality_pct: { y2025: 88.4, y2026End: 91.1 },
  net_promoter_score: { y2025: 12, y2026End: 27 },
};

/**
 * The 2025 blind spot, stated explicitly because it is the whole argument.
 *
 * An operator without seat sensors has ticket sales, gateline counts and a
 * handful of manual load surveys a year. None of those see an empty seat:
 * a ticket is a sale, not a person in a seat. So the "load factor" such an
 * operator reports is tickets / seats - a number that silently counts every
 * no-show as a passenger, and it is the number capacity and pricing decisions
 * are then made on.
 */
export const TICKET_DATA = {
  what_2025_had: [
    'Tickets sold per departure, and the revenue from them.',
    'Gateline entries and exits at staffed stations - a station total, not a seat.',
    'Manual load surveys: a counter with a clicker on a handful of days a year.',
    'Whether sales were closed on a departure, and at what threshold.',
  ],
  what_2025_could_not_have: [
    'How many people were actually on board - a no-show is invisible to ticket data.',
    'Whether a seat was occupied, reserved-and-empty, or holding a bag.',
    'The cabin factor of any given departure on any given day.',
    'Therefore: whether closing sales on a departure was justified.',
  ],
  reported_metric_2025: 'assumed_load_factor_pct = tickets sold / seats. Overstates the people on board by the no-show rate.',
  /** Four manual load-survey days in 2025 - the only 2025 data that saw bodies. */
  loadSurveyDates2025: ['2025-02-12', '2025-05-14', '2025-09-17', '2025-11-12'],
  loadSurveyMethod:
    'Manual count of passengers on board at the busiest point of the journey, morning up services only, plus or minus a few percent counting error. Four days out of 365.',
  /** No-show rate the pilot measured in Q4 2025, used for the 2025 inference. */
  pilotNoShowRange: [0.09, 0.12],
};

/** Assumption used when attributing revenue growth to SeatSense. */
export const ATTRIBUTION = {
  assumedMarketGrowthPct: 1.8,
  note:
    'Underlying market growth is the counterfactual: what revenue would have done in 2026 without SeatSense-informed pricing. 1.8% is the assumed regional rail market trend. Change it to test the attribution.',
};

// ---------------------------------------------------------------------------
// Deterministic randomness - same seed always produces the same dataset.
// ---------------------------------------------------------------------------

export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed) {
  let a = hash32(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Symmetric multiplicative jitter, e.g. jitter(seed, 0.035) -> 0.965 .. 1.035 */
export function jitter(seed, amplitude) {
  return 1 + (rng(seed)() * 2 - 1) * amplitude;
}

export const lerp = (a, b, t) => a + (b - a) * t;

/** Flattened timetable: one row per daily departure. */
export function buildServices() {
  const out = [];
  for (const route of ROUTES) {
    const seats = route.coachesPerUnit * route.seatsPerCoach;
    for (const [time, direction, demandClass] of route.services) {
      const cls = DEMAND_CLASSES[demandClass];
      const fare2025 = round2(route.peakFareGbp * cls.fareIndex);
      out.push({
        service_id: `${route.id}-${time}`,
        route_id: route.id,
        route_name: route.name,
        departure_time: `${time.slice(0, 2)}:${time.slice(2)}`,
        direction,
        origin: direction === 'up' ? route.origin : route.destination,
        destination: direction === 'up' ? route.destination : route.origin,
        demand_class: demandClass,
        seats,
        coaches: route.coachesPerUnit,
        seats_per_coach: route.seatsPerCoach,
        fare_2025_gbp: fare2025,
        fare_2026_target_gbp: round2(fare2025 * (1 + cls.fareDelta2026 * route.effectStrength)),
        fare_change_pct: round1(cls.fareDelta2026 * route.effectStrength * 100),
        sales_close_threshold_2025_pct: round1(cls.salesCap2025 * 100),
        sales_close_threshold_2026_pct: round1(cls.salesCap2026 * 100),
      });
    }
  }
  return out;
}

export const round1 = (n) => Math.round(n * 10) / 10;
export const round2 = (n) => Math.round(n * 100) / 100;
