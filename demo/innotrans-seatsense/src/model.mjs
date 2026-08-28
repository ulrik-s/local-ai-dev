/**
 * Scenario model for the InnoTrans SeatSense demo.
 *
 * Everything about the fictional operator lives here: network, timetable,
 * demand classes, fares, the sales policy and the 2026 SeatSense effect.
 * `generate.mjs` turns this into the JSON files under ../data. Nothing here is
 * real data.
 *
 * The story in one paragraph:
 *   Northbank Rail sells one seat per ticket and may not oversell. Its morning
 *   peak sells out every weekday and turns passengers away - and then departs
 *   with around a tenth of those paid-for seats empty, because the people who
 *   bought them did not turn up. Through 2025 the operator could not see any
 *   of that: ticket data knows exactly how many seats are unsold, but it
 *   cannot tell a passenger from a no-show, so it does not know how full any
 *   train actually is. SeatSense measures it from 1 January 2026. The empty
 *   seats themselves are not recoverable - a sold seat belongs to its buyer
 *   and overselling is not an option - so the entire value is in pricing the
 *   right departures, which is now possible because the operator finally knows
 *   which departures are genuinely full.
 */

export const GENERATOR_VERSION = '2.0.0';

/** Full 2025 baseline year; 2026 runs to the last day of data we ship. */
export const COVERAGE = {
  baselineYear: 2025,
  seatsenseYear: 2026,
  start: '2025-01-01',
  end: '2026-08-31',
  seatsenseGoLive: '2026-01-01',
};

/**
 * The constraint that makes this a rail problem rather than an airline one.
 *
 * A European operator selling reserved seats sells at most one ticket per seat
 * per departure. A reservation is a contractual right to that specific seat,
 * and denied boarding triggers passenger-rights obligations, so the deliberate
 * overbooking an airline prices into its yield model is not available. Two
 * consequences run through the whole dataset:
 *
 *   - Sales stop at 100% of seated capacity. Demand above that is turned away
 *     and recorded in demand_turned_away, in both years.
 *   - A no-show seat is dead revenue. It cannot be resold, because it still
 *     belongs to the person who bought it, and it cannot be covered by
 *     overselling. Nothing SeatSense does recovers that seat.
 *
 * So the only lever measurement unlocks is price: knowing which departures are
 * genuinely full, rather than merely sold out, and pricing accordingly.
 */
export const SALES_POLICY = {
  reservation: 'compulsory - every ticket carries a specific seat',
  tickets_per_seat: 1,
  sales_cap_pct_of_seats: 100,
  overselling: 'not permitted',
  basis:
    'A seat reservation is a contractual right to that seat, and denied boarding triggers passenger-rights obligations. European operators therefore sell at most one ticket per seat per departure, unlike airlines, which deliberately overbook and price the denied-boarding risk into their yield model.',
  consequences: [
    'The morning peak sells out and turns passengers away rather than absorbing them.',
    'A seat sold to someone who does not travel departs empty and the revenue is not recoverable: the seat is still theirs, and overselling to cover it is not an option.',
    'Ticket data knows precisely how many seats are unsold. What it cannot know is how many of the sold seats will actually be sat in - so it cannot rank departures by how full they really are.',
    'That ranking is what pricing decisions are made on, which is why measuring it is worth money even though the empty seats themselves are not.',
  ],
  what_seatsense_does_not_do: [
    'It does not let the operator oversell. That is a policy and passenger-rights question, not a data question.',
    'It does not let the operator resell a no-show seat mid-journey: the reservation still belongs to its buyer for the whole journey.',
    'It does not reduce the no-show rate. People who have paid still fail to travel at roughly the same rate in 2026 as in 2025.',
  ],
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
  product: 'Seat-reserved commuter and regional services. Every ticket carries a specific seat; there is no standing-permitted product.',
  seatsense: {
    product: 'Sensative SeatSense',
    deviceModel: 'sensative-seatsense-v2',
    measures:
      'Per-seat occupancy - whether a seat is physically occupied by a person, reported continuously per coach.',
    fleetGoLive: '2026-01-01',
    businessCase:
      'The operator signed off on the rollout against a projected +0.75% of total revenue, from demand-based pricing on measured occupancy alone. No overselling, no reselling of no-show seats, no fare-basket increase.',
    pilot: {
      window: '2025-10-01 .. 2025-12-19',
      scope: '3 units on the Anglia Metro (NBR1), 24 coaches instrumented',
      findings: [
        'Departures that had sold every seat and closed sales departed with an average of 10.4% of those seats empty.',
        'Median 47 paid-for seats travelling empty per sold-out peak departure; worst observed 71.',
        'Ticket data overstated the people on board peak departures by 9-12%.',
        'Two departures the ticket system ranked as equally sold out differed by 5 points of actual occupancy - the no-show rate is a property of who buys that particular train.',
      ],
    },
  },
};

/**
 * Demand classes.
 *
 * `demand2025` is mean weekday demand as a multiple of seated capacity, before
 * the 100% sales cap is applied - so a value above 1.0 means the departure
 * sells out and turns passengers away. `fareIndex` is the mean realised yield
 * per passenger as a fraction of the route's peak fare.
 *
 * `noShowRate` is the share of ticket holders who do not travel. It is the
 * same in both years by design: SeatSense measures no-shows, it does not
 * prevent them. In 2025 nobody could observe it, which is exactly why the
 * reported load factor was wrong.
 *
 * The 2026 columns are the pricing response, and they are deliberately small.
 * Fares here are regulated and publicly scrutinised; the demo's claim is not
 * that measurement permits a fare rise, but that it permits moving fares by
 * one or two percent on the *right* departures. `fareDelta2026` is the fare
 * move; `demandDelta2026` is the demand response to it.
 *
 * The elasticities are conservative on purpose. On the classes taking an
 * increase, demand falls by the same percentage as the fare rises - unit
 * elasticity, so on a departure with spare seats the move earns nothing. On
 * the discounted classes demand responds at about 1.5x the fare cut, which is
 * defensible only because the substitute is the adjacent departure of the same
 * journey rather than another mode.
 *
 * That is what makes the whole business case rest on capacity: only where the
 * 100% sales cap binds does a fare rise reach revenue without losing volume.
 * Getting that right requires knowing which departures are genuinely full,
 * which is exactly what ticket data cannot tell you.
 */
export const DEMAND_CLASSES = {
  peak_core: {
    label: 'Morning peak core',
    description: 'The 07:00-08:30 arrivals. Sells out every weekday and turns passengers away.',
    demand2025: 1.1,
    fareIndex: 1.0,
    noShowRate: 0.105,
    fareDelta2026: 0.019,
    demandDelta2026: -0.019,
    weekendFactor: 0.34,
    pricingRationale:
      'SeatSense confirms these departures are physically full, not just sold out. A small fare rise is safe here because the demand behind the sales cap is real.',
  },
  peak_shoulder: {
    label: 'Peak shoulder',
    description: 'The departures either side of the crush, with genuine measured spare capacity.',
    demand2025: 0.64,
    fareIndex: 0.89,
    noShowRate: 0.075,
    fareDelta2026: -0.0115,
    demandDelta2026: 0.0173,
    weekendFactor: 0.46,
    pricingRationale:
      'Measured occupancy shows real room, so a small discount buys volume from passengers turned away by the crush departures rather than cannibalising them.',
  },
  offpeak: {
    label: 'Off-peak',
    description: 'Midday and late evening leisure travel.',
    demand2025: 0.43,
    fareIndex: 0.62,
    noShowRate: 0.042,
    fareDelta2026: -0.0032,
    demandDelta2026: 0.0048,
    weekendFactor: 0.74,
    pricingRationale: 'Advance-purchase heavy, low no-show, little to correct. Minor bucket reallocation only.',
  },
  evening_peak: {
    label: 'Evening peak',
    description: 'The 16:30-18:00 exodus out of the city. Sells out in the busier months.',
    demand2025: 1.02,
    fareIndex: 0.94,
    noShowRate: 0.09,
    fareDelta2026: 0.014,
    demandDelta2026: -0.014,
    weekendFactor: 0.58,
    pricingRationale:
      'Capacity-constrained on most weekdays once measured, though less consistently than the morning peak, so the fare move is smaller.',
  },
  early_late: {
    label: 'Early / late',
    description: 'First and last departures of the day.',
    demand2025: 0.31,
    fareIndex: 0.56,
    noShowRate: 0.035,
    fareDelta2026: -0.0057,
    demandDelta2026: 0.0086,
    weekendFactor: 0.44,
    pricingRationale: 'Cheap already; a token discount to pull a little demand off the shoulder.',
  },
};

/**
 * Background market growth in 2026, unrelated to SeatSense. It is generated
 * into the data so that the attribution tool has something real to net off:
 * the observed year-on-year change is market growth plus the pricing effect,
 * and only the second part is the business case.
 */
export const MARKET_GROWTH_2026 = 0.018;

/** What the customer's own business case projects, for reference in the docs. */
export const BUSINESS_CASE_TARGET_PCT = 0.75;

/** Seats per coach x coaches per unit gives the seated capacity we sell against. */
export const ROUTES = [
  {
    id: 'NBR1',
    name: 'Anglia Metro',
    origin: 'Colchester',
    destination: 'London Liverpool Street',
    calling: ['Colchester', 'Marks Tey', 'Kelvedon', 'Witham', 'Chelmsford', 'Shenfield', 'London Liverpool Street'],
    profile: 'Seat-reserved commuter',
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
    profile: 'Seat-reserved long-distance commuter',
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
    profile: 'Seat-reserved regional',
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
 * The pricing rules were live in full from 1 January 2026, so there is no
 * phase-in to model. The month-to-month variation in the measured effect comes
 * from something more interesting: whether the peak actually sold out that
 * month. In a quiet month the sales cap never binds, the fare increase simply
 * loses the volume it gains, and the effect goes to nearly nothing.
 */
export function pricingActive(year) {
  return year >= COVERAGE.seatsenseYear ? 1 : 0;
}

/**
 * The 2025 blind spot, stated explicitly because it is the whole argument.
 *
 * Note what ticket data *does* know under a one-ticket-per-seat policy: how
 * many seats are unsold, exactly. Availability is not the gap. The gap is that
 * revenue looks identical whether a ticket holder travels or not, so nothing
 * in the ticket system distinguishes a departure that is full from one that
 * merely sold out - and that distinction is what pricing runs on.
 */
export const TICKET_DATA = {
  what_2025_had: [
    'Tickets sold and unsold per departure, exactly - one ticket per seat leaves no ambiguity about availability.',
    'Revenue per departure, which is the same whether the ticket holder travels or not.',
    'Whether sales were closed on a departure, and how much demand arrived afterwards.',
    'Gateline entries and exits at staffed stations - a station total, not a seat.',
    'Manual load surveys: a counter with a clicker on a handful of days a year.',
  ],
  what_2025_could_not_have: [
    'How many of the sold seats were actually sat in - a no-show is invisible to ticket data.',
    'Therefore the cabin factor of any departure, on any day.',
    'Therefore which of two equally sold-out departures was genuinely full and which was not.',
    'Therefore whether a fare move on a given departure was safe or self-defeating.',
  ],
  reported_metric_2025: 'assumed_load_factor_pct = tickets sold / seats. Overstates the people on board by the no-show rate.',
  /** Four manual load-survey days in 2025 - the only 2025 data that saw bodies. */
  loadSurveyDates2025: ['2025-02-12', '2025-05-14', '2025-09-17', '2025-11-12'],
  loadSurveyMethod:
    'Manual count of passengers on board at the busiest point of the journey, morning up services only, plus or minus a few percent counting error. Four days out of 365.',
  /** No-show range the pilot and the surveys agreed on, used for the 2025 inference. */
  pilotNoShowRange: [0.09, 0.12],
};

/** Assumption used when attributing revenue growth to SeatSense. */
export const ATTRIBUTION = {
  assumedMarketGrowthPct: MARKET_GROWTH_2026 * 100,
  note:
    'Underlying market growth is the counterfactual: what revenue would have done in 2026 without SeatSense-informed pricing. It is generated into the 2026 demand at this rate, so netting it off isolates the pricing effect. Change the parameter to test how sensitive the attribution is.',
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

/**
 * The no-show rate of an individual departure, not just its class.
 *
 * This is the number the whole demo turns on. Two departures can be equally
 * sold out and still differ by ten points of actual occupancy, because their
 * passengers differ: a 07:11 full of flexible-fare season travellers no-shows
 * far more than an 07:41 sold mostly on date-specific advance tickets. The
 * variation is persistent per departure - it is a property of who buys that
 * train - so it is stable enough to price against, and completely invisible to
 * ticket data, which books the same revenue either way.
 */
export function noShowRateFor(serviceId, demandClass) {
  const spread = 1 + (hash32(`noshow|${serviceId}`) / 4294967296 - 0.5) * 0.8; // +/-40%
  return DEMAND_CLASSES[demandClass].noShowRate * spread;
}

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
        no_show_rate_pct: round1(noShowRateFor(`${route.id}-${time}`, demandClass) * 100),
        no_show_rate_known_from: COVERAGE.seatsenseGoLive,
        sales_cap_pct_of_seats: SALES_POLICY.sales_cap_pct_of_seats,
      });
    }
  }
  return out;
}

export const round1 = (n) => Math.round(n * 10) / 10;
export const round2 = (n) => Math.round(n * 100) / 100;
