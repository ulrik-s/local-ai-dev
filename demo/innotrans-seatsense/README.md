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
curl -s localhost:8787/api/demo/capacity-pressure | jq .narrative
curl -s "localhost:8787/api/demo/fullness-ranking?month=6" | jq .narrative
```

---

## The argument

**Northbank Rail** is a fictional British operator selling reserved seats:
three routes, 58 daily departures, ~4.9 million journeys and ~£117m of ticket
revenue a year.

### The problem: a full train is a lost sale

**One ticket per seat. No overselling.** A reservation is a contractual right
to that specific seat, and denied boarding triggers passenger-rights
obligations, so the deliberate overbooking an airline prices into its yield
model is not available.

Which means: **a departure sold to 100% cannot take another passenger.** In
2025 the morning peak sold out on **82% of weekdays** and the evening peak on
**68%**, and everyone who arrived after that was refused - **47 passengers a
weekday** across the network. An airline absorbs those. This operator cannot.

### The policy: never let it fill

> **It must always be possible to travel on the departure you want. It may cost
> more.**

From 1 January 2026, each popular departure's fare is **solved against that
day's demand** so that predicted sales land on a measured-occupancy target and
never reach the sales cap. The departures either side are discounted in
proportion to the premium the peak is carrying. A quiet Tuesday in August
carries no premium at all, because nothing would have filled.

| Parameter | Value |
| --- | --- |
| Target cabin factor | 88% measured occupancy |
| Sold ceiling | 97% of seats - never higher, so it cannot fill |
| Maximum premium | 7% |
| Substitution between adjacent departures | elasticity 2.5 |
| Not travelling at all | elasticity 0.3 |

### What it did

Like-for-like, 1 January - 31 August, weekdays:

| | 2025 | 2026 |
| --- | --- | --- |
| Peak core sold | 99.4% | **97.0%** |
| Peak core closing sales | 82.3% of weekdays | **9.1%** |
| Evening peak closing sales | 67.7% | **10.8%** |
| Passengers turned away | 47 a weekday | **1** |
| Peak core fare | £29.00 | £30.42 (+4.9%) |
| Peak shoulder sold | 58.5% | **61.9%** |
| Peak shoulder fare | £24.76 | £24.00 (−3.1%) |

The peak is now deliberately held below full, the shoulders carry the
difference, and almost nobody is refused.

### Why it needs SeatSense

The headroom has to be set against **actual** occupancy, not tickets sold - and
ticket data cannot see the difference, because revenue is booked whether the
passenger travels or not.

June 2026 weekdays, peak core. Ticket sales spread these eight departures
across **0.8 points** - the system cannot tell them apart. Measured occupancy
spreads them across **5.1 points**, and **six of eight change rank**:

| Departure | Sold | **Actually full** | No-show | Rank by sales → by fullness |
| --- | --- | --- | --- | --- |
| NBR1-0811 | 99.6% | **92.7%** | 7.3% | 1 → 1 |
| NBR1-0711 | 99.5% | 92.6% | 7.2% | 2 → 2 |
| NBR2-0748 | 99.0% | 92.0% | 7.3% | 6 → 3 |
| NBR2-0818 | 98.8% | 90.7% | 8.3% | 7 → 4 |
| NBR3-0722 | 99.3% | 89.7% | 9.5% | 4 → 5 |
| NBR3-0752 | 98.8% | 88.7% | 10.1% | 8 → 6 |
| **NBR1-0741** | **99.5%** | **87.9%** | **12.0%** | **3 → 7** |
| NBR2-0718 | 99.0% | 87.6% | 11.6% | 5 → 8 |

So the sold-target and the premium are set **per departure**. The 07:11 has a
7.2% no-show rate, so it is held to 95.2% sold and takes a **+5.2%** premium.
The 07:41, thirty minutes later and sold within a point of it, has a 12%
no-show rate, so it can be sold to 97% and takes only **+4.4%**. Ticket data
would have ranked them the other way round and priced them the other way round.

### What it is worth

| | |
| --- | --- |
| Observed revenue change | +2.4% (£1.86m) |
| of which market growth | £1,276,352 |
| **of which attributable to SeatSense** | **£587,324 = 0.757% of total revenue** |
| The operator's business case | 0.75% |
| Annualised on 2025 revenue | **~£0.9m** |

Almost all of it is yield, not volume: **£601k price effect, −£23k volume.**
Passenger numbers are flat. The gain is that the passenger who must have the
07:41 pays for the certainty, the flexible one is paid to move, and the ones
who used to be refused now travel at all.

And by month, which is the most convincing table in the demo:

| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Attributable | 0.19% | 0.60% | 1.28% | 0.84% | 1.36% | **1.49%** | 1.18% | **0.07%** |
| Peak sold out 2025 → 2026 | 46→0% | 97→0% | 100→3% | 100→0% | 100→18% | 100→51% | 100→0% | 15→0% |

The fare is solved per day, so a departure that would not have filled carries
no premium. In August nothing was being rationed, so there was nothing to price
and the effect is 0.07%. **You get paid for pricing a train that would
otherwise have refused someone** - which is exactly the thing you could not
measure.

### The line to have ready

From `seatsense_snapshot(NBR1-0741, 2026-03-17)`:

> 469 of 480 seats sold, **sales still open, nobody refused.** SeatSense
> measured 405 seats occupied - a cabin factor of 84.4% against the 97.7% the
> ticket system reported - so **64 paid-for seats travelled empty.** They
> cannot be resold and cannot be covered by overselling. What they change is
> the price of this departure next time.

---

## What this demo deliberately does not claim

Rail people will test these, so the tools state them:

- **No revenue from overselling.** Not permitted, and no row in either year
  sells more tickets than there are seats.
- **No revenue from reselling no-show seats.** The seat is still the buyer's
  for the whole journey.
- **No claim that ticket data misses unsold seats.** It knows those exactly.
  What it misses is how many sold seats get used.
- **No reduction in the no-show rate.** Identical in both years by
  construction - SeatSense measures no-shows, it does not prevent them.
- **No passenger growth.** Flat. The gain is yield.
- **No service-quality improvement**, and no modelled punctuality or complaint
  figures anywhere in the dataset. What did improve is that far fewer
  passengers meet a closed sale.
- **The policy does not abolish sold-out trains.** 9.1% of peak departures
  still fill, because the premium is capped at 7%. `repricing_candidates`
  separates those into the ones that are genuinely full at the target - buy
  seats - and the ones that fill on tickets while travelling 12 points empty.

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

## How the data is generated

Departures cannot be simulated independently, because the interesting thing
happens between them. `generate.mjs` allocates each route's whole day at once:

1. **Preferred demand** per departure - who would take it if price and capacity
   were no object.
2. **Competition windows** - the morning peak plus its shoulders, the evening
   peak plus its shoulders. Inside a window, a fare change moves passengers
   between departures (elasticity 2.5). What the window costs on average
   decides how many travel at all (elasticity 0.3). Outside a window a
   departure competes with nothing, so it is left alone.
3. **The fare solver** - for each popular departure, raise the fare until
   predicted sales land on its own sold-target (88% cabin factor plus its
   no-show rate, capped at 97% sold), or until the 7% premium cap. Then set the
   window's shoulder discount in proportion to the premium the peak ended up
   carrying. Ten passes.
4. **Capacity and spillover** - sales stop at 100% of seats. Of the demand
   refused, 88% takes a neighbouring departure within 90 minutes; the rest does
   not travel at all, and that is the revenue the policy exists to keep.
5. **The counterfactual** - the same day, run again on 2025's flat fares with
   the same market growth, stored on every 2026 row as `cf_*`. Attribution is
   the difference, per departure.

## The vocabulary the dataset insists on

| Term | Meaning |
| --- | --- |
| `assumed_load_factor_pct` | Tickets sold ÷ seats. What an operator without sensors reports as its load factor. Revenue is booked whether the ticket holder travels or not, so this counts every no-show as a passenger - and it is the number decisions get made on. Both years. |
| `cabin_factor_pct` | Seats SeatSense measured as physically occupied ÷ seats. The real number. **2026 only** - the tools return `null` plus an explanation for 2025. |
| `ghost_seats` | Seats paid for that travelled empty. A measurement, not recoverable inventory. |
| `sales_closed` / `demand_turned_away` | Both years: whether the departure hit the 100% cap, and how many passengers arrived after it did. |
| `cf_tickets_sold` / `cf_revenue_gbp` | 2026 only: the same departure on 2025's fares with the same market growth. Observed minus counterfactual is the business case. |
| `no_show_rate_pct` | Per departure: 2-12% network-wide, 7-12% on the peak. A property of who buys that particular train, stable enough to price against, invisible to ticket data. |
| `sold_target_pct` | Per departure, 2026: where the pricing rule aims its sales. Cabin-factor target plus that departure's no-show rate, capped at the ceiling. |
| `manual_load_survey` | 2025 only, four dates: passengers counted by hand. The single 2025 field that saw actual people. |

## Files

| Path | What it is |
| --- | --- |
| `src/model.mjs` | The whole fiction: sales policy, pricing policy, operator, network, timetable, demand classes, fares, no-show rates. Edit here to change the story. |
| `src/generate.mjs` | Writes `data/*.json`: the day allocator, the fare solver and each 2026 departure's counterfactual. Deterministic. |
| `src/dataset.mjs` | Query + aggregation layer. Shared by the MCP server and the REST API. |
| `src/mcp-server.mjs` | The fake Yggio as an MCP server over stdio. Zero dependencies. |
| `src/yggio-api.mjs` | The same data as a Yggio-shaped REST API, for showing on a screen. |
| `src/selftest.mjs` | Pre-flight check. Drives the MCP server the way Claude does and calls every tool. |
| `.mcp.json` | Wires the MCP server into Claude Code when it starts in this directory. |
| `CLAUDE.md` | Tells Claude how to behave during the demo, including what not to claim. |
| `DEMO-SCRIPT.md` | The stage script: questions, expected answers, talking points, recovery. |
| `data/*.json` | Generated data, committed so the demo needs no build step. `operator.json` carries both policies, the business case and a data dictionary of which fields exist in which year, and why. |

## The 15 tools

| Tool | Answers |
| --- | --- |
| `yggio_overview` | "What data do you have?" - start here |
| `capacity_pressure` | The policy in operation: sold-out departures, turn-aways, and where price stops being the answer |
| `ticket_data_blind_spot` | "Operators already have ticket data" - what 2025 reported, why it could not be an occupancy figure, and what it really was |
| `fullness_ranking` | The proof: departures ranked by tickets sold vs by measured occupancy, and which ones change place |
| `seatsense_attribution` | The 0.757%: observed change split into market growth and pricing effect, plus what the demo does *not* claim |
| `pricing_actions` | The policy, its parameters, and the fare each class actually realised |
| `compare_years` | 2025 vs 2026 by total, month, route, service, demand class or day type, each with its attributable revenue |
| `morning_peak_report` | The morning peak departure by departure, before and after |
| `seatsense_snapshot` | One train, one day, per coach: sold vs occupied, turn-aways, ghost seats |
| `repricing_candidates` | "What still needs attention?" - separating capacity questions from premium judgement calls |
| `list_services` | The timetable, each departure's no-show rate and its sold-target |
| `service_history` | Day-by-day rows for one departure |
| `yggio_list_iotnodes` | The SeatSense device estate as Yggio IoT nodes |
| `yggio_iotnode_readings` | One coach's sensor: latest values plus that day's occupancy series |

## Regenerating or changing the data

```bash
node src/generate.mjs                        # rewrite data/ from src/model.mjs
node src/generate.mjs --through 2026-09-30   # extend the 2026 window
node src/selftest.mjs                        # always re-check afterwards
```

The knobs worth knowing, all in `src/model.mjs`:

- `SALES_POLICY` - one ticket per seat, no overselling. Everything follows.
- `PRICING_POLICY` - the whole 2026 mechanism: `targetCabinFactor` (0.88),
  `soldCeiling` (0.97), `maxPremium` (0.07), `choiceElasticity` (2.5),
  `marketElasticity` (0.3), `spillShare` (0.88). Raising `maxPremium` pushes
  the peak further below full and earns more; raising `spillShare` means less
  demand was lost outright in 2025 and earns less. These two land the
  attributable figure on 0.757%.
- `DEMAND_CLASSES[*].preferredLoad` - demand as a multiple of seats before any
  cap or price effect. Above 1.0 is what makes a departure ration itself.
- `noShowRate` per class and `noShowRateFor()` per departure (±40%) - the
  variation that makes the two rankings disagree, and that the sold-target is
  built from.
- `COMPETITION_WINDOWS` and `MAX_SHOULDER_DISCOUNT` - which departures compete,
  and how far each may be discounted to receive displaced demand.
- `MARKET_GROWTH_2026` - background growth baked into 2026 demand, netted off
  by each departure's counterfactual.
- `TICKET_DATA` - what ticket data could and could not see, the manual survey
  dates, and the no-show range the 2025 inference uses.

## Honesty notes

- Northbank Rail does not exist and every figure is synthetic. Station names
  are real so the network reads as plausible to rail people.
- The no-oversell constraint is framed contractually - a reservation is a right
  to that seat, and denied boarding triggers passenger-rights obligations - not
  as a citation of a specific statute. If someone wants the legal basis in
  their own market, that is a conversation, not a slide.
- Revenue, tickets sold and the ticket-derived load factor are comparable
  across both years. **Cabin factor and ghost seats are 2026-only** - the tools
  return `null` with an explanation rather than inventing a baseline.
- The one place the demo estimates 2025 occupancy is `ticket_data_blind_spot`,
  where it is flagged `inference: true`, states its method and 9-12% no-show
  range, and gives a range rather than a point figure.
- The elasticities, the spill share and the indicative effects in
  `repricing_candidates` are modelling assumptions. Each tool states the one it
  used, and `pricing_actions` prints the whole parameter set.
- Every service runs every day in this model, with weekend and bank-holiday
  demand factors rather than a reduced weekend timetable.
