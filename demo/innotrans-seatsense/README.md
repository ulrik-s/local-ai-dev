# InnoTrans demo: SeatSense, a fake Yggio, and Claude

A self-contained trade-show demo. A visitor talks to Claude in plain English;
Claude reads a **fake Yggio tenant** over MCP and answers with real numbers
from generated JSON files. The story it tells is what **SeatSense** - knowing
whether a seat is *physically occupied* - is worth to a European train operator
that **may not oversell**.

Everything is in this one directory. No network, no database, no npm install,
no API keys. Node 20+ is the only requirement.

---

## Snabbstart (svenska)

```bash
cd demo/innotrans-seatsense
node src/selftest.mjs        # pre-flight: anropar alla 15 verktyg, ska ge "All checks passed"
claude                       # starta Claude i den här katalogen - .mcp.json kopplar in fejk-Yggio
```

Svara **ja** när Claude frågar om den får använda MCP-servern `yggio`.
Fråga sedan: *"What data do you have?"* och följ `DEMO-SCRIPT.md`.

Kör i det här repots container istället: `make demo` från repo-roten.

---

## Quick start

```bash
cd demo/innotrans-seatsense

node src/selftest.mjs        # pre-flight check - calls all 15 tools, prints OK per tool
claude                      # Claude Code picks up ./.mcp.json and connects to the fake Yggio
```

Approve the `yggio` MCP server when Claude asks. Then ask
*"What data do you have?"* and work through `DEMO-SCRIPT.md`.

Optional, for showing the platform behind Claude on a second screen:

```bash
node src/yggio-api.mjs      # http://localhost:8787
curl -s localhost:8787/api/demo/overview | jq .headline
curl -s localhost:8787/api/demo/fullness-ranking | jq .narrative
```

---

## The argument

**Northbank Rail** is a fictional British operator selling reserved seats:
three routes, 52 daily departures, ~4.5 million journeys and ~£108m of ticket
revenue a year.

### The constraint

**One ticket per seat. No overselling.** A reservation is a contractual right
to that specific seat, and denied boarding triggers passenger-rights
obligations, so the deliberate overbooking an airline prices into its yield
model is not available to a European operator. That produces two facts the
whole demo turns on:

- The morning peak **sells out and turns passengers away** - 377 a weekday
  across the peak departures - rather than absorbing them.
- A seat sold to someone who does not travel **departs empty and cannot be
  recovered**: it still belongs to its buyer, and overselling to cover it is
  not permitted.

### 2025: the numbers were not just lower, they were wrong

Ticket data knew **exactly** how many seats were unsold - one ticket per seat
leaves no ambiguity about availability. What it could not know is how many of
the *sold* seats were actually sat in, because **revenue is booked whether the
passenger travels or not**. Nothing anywhere in a ticket system distinguishes a
passenger from a no-show.

So Northbank Rail had **no cabin factor at all**. What it reported as load
factor was tickets ÷ seats:

- Reported load factor on the morning crush across 2025: **99.8%**, with sales
  closed on **90.1%** of those departures.
- The four manual load surveys that year - a counter with a clicker, four days
  out of 365 - found ticket sales overstating the people on board by **8.8%**.
- Inferring from the pilot's 9-12% no-show range, the real cabin factor was
  **87.8-90.8%**: an estimated **42-55 of 454 seats** departing empty on trains
  that had just refused passengers.

And the deeper problem: **the ticket system mis-ranked its own departures.**

### The proof (August 2026 weekdays, peak core)

| Departure | Sold | **Actually full** | No-show | Rank by sales → by fullness |
| --- | --- | --- | --- | --- |
| NBR3-0752 | **99.8%** | 89.5% | 10.1% | **1 → 4** |
| NBR3-0722 | 99.6% | 90.0% | 9.5% | 2 → 3 |
| NBR1-0811 | 99.0% | **91.8%** | 7.3% | 3 → **1** |
| NBR1-0711 | 98.9% | 91.6% | 7.2% | 4 → 2 |
| NBR1-0741 | 98.8% | **86.8%** | **12.0%** | 5 → **7** |
| NBR2-0718 | 97.0% | 85.7% | 11.6% | 6 → 8 |
| NBR2-0818 | 96.5% | 88.4% | 8.3% | 7 → 6 |
| NBR2-0748 | 96.4% | 89.2% | 7.3% | 8 → 5 |

Ticket sales spread these eight departures across **3.4 points** and call them
near-identical. Measured occupancy spreads them across **6.1 points**, and
**all eight change rank**. Pricing and capacity decisions are made on that
ranking.

### 1 January 2026: pricing on measurement

240 SeatSense nodes, one per coach. Fares now follow measured cabin factor -
**+1.9%** on peak core, **+1.4%** on the evening peak, **-1.1%** on the peak
shoulder, small discounts off-peak. The fare basket is unchanged overall.

The moves are one to two percent, and that is the point: the value is in aiming
them at the right departures. A fare increase on a departure with spare seats
earns nothing here - demand falls by the same percentage the fare rises. **Only
where the 100% sales cap binds does an increase reach revenue**, and knowing
which departures those genuinely are is exactly what ticket data cannot tell
you.

### What it produced

Like-for-like, 1 January - 31 August, 2025 vs 2026 (both windows contain 173
weekdays, so no calendar adjustment is needed):

| | 2025 | 2026 | Observed |
| --- | --- | --- | --- |
| Revenue | £70.58m | £71.93m | +1.9% |
| Tickets sold | 2,970,224 | 3,013,434 | +1.5% |

Most of that is background market growth. Splitting it against a per-departure
counterfactual - what each departure would have taken on 2025's pricing rules,
with the same market growth:

| | |
| --- | --- |
| Market growth | £809,795 |
| **Attributable to SeatSense** | **£534,722 = 0.749% of total revenue** |
| Business case | 0.75% |
| Annualised on 2025 revenue | **~£0.8m** |

Almost all of it is price, not volume: **£360k price effect against £177k
volume**. By demand class, attributable revenue: peak core **+1.41%**, evening
peak +0.64%, peak shoulder +0.54%, early/late +0.28%, off-peak +0.16%.

And by month, which is the most convincing table in the demo:

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.47% | 0.71% | 0.93% | 0.76% | 0.88% | 0.95% | 0.93% | **0.31%** |
| peak sold out 61% of weekdays | 99% | 100% | 100% | 100% | 100% | 100% | **30%** |

The effect appears **only in the months when the peak actually sells out**. In
August it does not, so the fare increase loses exactly the volume it gains, and
the money nearly vanishes. Nothing in the demo makes that point better.

### The line to have ready

From `seatsense_snapshot(NBR1-0741, 2026-06-16)`:

> Every one of the 480 seats sold. Sales closed. **78 passengers turned away.**
> SeatSense measured 432 seats occupied - a cabin factor of 90% against the
> 100% the ticket system reported - so **48 paid-for seats worth £1,222
> departed empty.** They could not be resold and could not be covered by
> overselling. What they change is the price of this departure next time.

---

## What this demo deliberately does not claim

Rail people will test these, so the tools state them:

- **No revenue from overselling.** Not permitted, and the dataset never sells
  more tickets than there are seats.
- **No revenue from reselling no-show seats.** The seat is still the buyer's for
  the whole journey.
- **No claim that ticket data misses unsold seats.** It knows those exactly.
  What it misses is how many sold seats are used.
- **No reduction in the no-show rate.** It is identical in both years by
  construction - SeatSense measures no-shows, it does not prevent them.
- **No service-quality improvement.** Turn-aways did not fall: market growth
  pushes against a hard cap. One- and two-percent fare moves do not fix
  crowding, and there are no invented punctuality or complaint figures in here.
- The one genuine non-revenue benefit is stated as such: a peak reported at
  99.7% that measurably travels at 90.6% has about **41 of 454 seats a train
  already there and unused**, which changes the size of a rolling-stock case.

---

## How it fits together

```
   visitor
     │  plain English
     ▼
  ┌────────────┐   MCP over stdio    ┌──────────────────┐   reads   ┌──────────┐
  │  Claude    │ ──────────────────▶ │  fake Yggio      │ ────────▶ │ data/    │
  │  Code      │ ◀────────────────── │  mcp-server.mjs  │           │ *.json   │
  └────────────┘   15 tools, JSON    │  + dataset.mjs   │           └──────────┘
                                     └──────────────────┘                ▲
                                     ┌──────────────────┐                │
   second screen ──── HTTP ─────────▶│  yggio-api.mjs   │────────────────┘
                                     └──────────────────┘
```

`dataset.mjs` does all the aggregation and hands back **pre-computed numbers
plus a one-paragraph `narrative`** for every query. That is deliberate: the
demo may be running against a small local model (this repo routes Claude Code
to Ollama through LiteLLM), and a small model that only has to *read* a number
answers correctly far more often than one that has to compute it.

## The vocabulary the dataset insists on

The whole argument lives in the difference between the first two:

| Term | Meaning |
| --- | --- |
| `assumed_load_factor_pct` | Tickets sold ÷ seats. What an operator without sensors reports as its load factor. Revenue is booked whether the ticket holder travels or not, so this counts every no-show as a passenger - and it is the number decisions get made on. Exists for **both** years. |
| `cabin_factor_pct` | Seats SeatSense measured as physically occupied ÷ seats. The real number. **2026 only** - the tools return `null` plus an explanation for 2025 rather than a figure. |
| `ghost_seats` | Seats paid for that travelled empty. A measurement, not recoverable inventory. |
| `sales_closed` / `demand_turned_away` | Recorded in both years: whether demand exceeded the 100%-of-seats cap, and how many passengers arrived after it did. |
| `cf_tickets_sold` / `cf_revenue_gbp` | 2026 only: what the departure would have done on 2025's pricing rules with the same market growth. Observed minus counterfactual is the business case. |
| `no_show_rate_pct` | Per departure: 2-12% across the network, 7-12% on the peak-core departures. A property of who buys that particular train - flexible-fare peak travellers no-show far more than advance-purchase off-peak ones - stable enough to price against, and invisible to ticket data. |
| `manual_load_survey` | 2025 only, four dates: passengers counted by hand. The single 2025 field that saw actual people. |

## Files

| Path | What it is |
| --- | --- |
| `src/model.mjs` | The whole fiction: sales policy, operator, network, timetable, demand classes, fares, no-show rates, the 2026 pricing response. Edit here to change the story. |
| `src/generate.mjs` | Writes `data/*.json`, including each 2026 departure's counterfactual. Deterministic - same input, identical output. |
| `src/dataset.mjs` | Query + aggregation layer. Shared by the MCP server and the REST API. |
| `src/mcp-server.mjs` | The fake Yggio as an MCP server over stdio. Zero dependencies. |
| `src/yggio-api.mjs` | The same data as a Yggio-shaped REST API, for showing on a screen. |
| `src/selftest.mjs` | Pre-flight check. Drives the MCP server the way Claude does and calls every tool. |
| `.mcp.json` | Wires the MCP server into Claude Code when it starts in this directory. |
| `CLAUDE.md` | Tells Claude how to behave during the demo, including what not to claim. |
| `DEMO-SCRIPT.md` | The stage script: questions, expected answers, talking points, recovery. |
| `data/*.json` | Generated data, committed so the demo needs no build step. `operator.json` carries the sales policy, the business case and a data dictionary of which fields exist in which year, and why. |

## The 15 tools

| Tool | Answers |
| --- | --- |
| `yggio_overview` | "What data do you have?" - start here |
| `ticket_data_blind_spot` | "Operators already have ticket data" - what 2025 reported, why it could not be an occupancy figure, and what it really was |
| `fullness_ranking` | The proof: departures ranked by tickets sold vs by measured occupancy, and which ones change place |
| `seatsense_attribution` | The 0.75%: observed change split into market growth and pricing effect, plus what the demo does *not* claim |
| `compare_years` | 2025 vs 2026 by total, month, route, service, demand class or day type, each with its attributable revenue |
| `pricing_actions` | The fare moves of 1 January 2026, what each class earned, and what was not available |
| `morning_peak_report` | The morning peak departure by departure - and what did not move, because it could not |
| `seatsense_snapshot` | One train, one day, per coach: sold vs occupied, turn-aways, ghost seats |
| `capacity_pressure` | Sold-out departures, turn-aways, and what measurement changes for a rolling-stock case |
| `repricing_candidates` | "What should we do next?" - including the departures that look full but are not |
| `list_services` | The timetable and each departure's measured no-show rate |
| `service_history` | Day-by-day rows for one departure |
| `yggio_list_iotnodes` | The SeatSense device estate as Yggio IoT nodes |
| `yggio_iotnode_readings` | One coach's sensor: latest values plus that day's occupancy series |

## Regenerating or changing the data

```bash
node src/generate.mjs                        # rewrite data/ from src/model.mjs
node src/generate.mjs --through 2026-09-30   # extend the 2026 window
node src/selftest.mjs                        # always re-check afterwards
```

To change the story, edit `src/model.mjs` and regenerate. The knobs worth
knowing:

- `SALES_POLICY` - the one-ticket-per-seat constraint and its contractual
  basis. Everything else follows from this.
- `DEMAND_CLASSES[*].demand2025` - mean weekday demand as a multiple of seated
  capacity, *before* the cap. Above 1.0 means the departure sells out and turns
  passengers away, which is what makes a fare increase earn anything.
- `fareDelta2026` / `demandDelta2026` - the fare move and the demand response.
  Increases assume unit elasticity, discounts about 1.5x. Scale these to move
  the headline: they currently land the attributable figure on 0.749%.
- `noShowRate` per class and `noShowRateFor()` per departure (±40%) - the
  variation that makes the two rankings disagree.
- `MARKET_GROWTH_2026` - background growth baked into 2026 demand, which the
  attribution nets off via each departure's counterfactual.
- `TICKET_DATA` - what ticket data could and could not see, the manual survey
  dates, and the no-show range the 2025 inference uses.
- `ROUTES[*].effectStrength` - how strongly a route responds to price.

## Honesty notes

- Northbank Rail does not exist and every figure is synthetic. Station names
  are real so the network reads as plausible to rail people.
- The no-oversell constraint is framed contractually - a reservation is a right
  to that seat, and denied boarding triggers passenger-rights obligations - not
  as a citation of a specific statute. If someone in the audience wants the
  legal basis in their own market, that is a conversation, not a slide.
- Revenue, tickets sold and the ticket-derived load factor are comparable
  across both years. **Cabin factor and ghost seats are 2026-only** - the tools
  return `null` with an explanation rather than inventing a baseline.
- The one place the demo estimates 2025 occupancy is `ticket_data_blind_spot`,
  where it is flagged `inference: true`, states its method and 9-12% range, and
  gives a range rather than a point figure.
- The elasticities and the indicative effects in `repricing_candidates` are
  modelling assumptions, and each tool states the one it used.
- Every service runs every day in this model, with weekend and bank-holiday
  demand factors rather than a reduced weekend timetable.
