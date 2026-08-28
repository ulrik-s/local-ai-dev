# InnoTrans demo: SeatSense, a fake Yggio, and Claude

A self-contained trade-show demo. A visitor talks to Claude in plain English;
Claude reads a **fake Yggio tenant** over MCP and answers with real numbers
from generated JSON files. The story it tells is what **SeatSense** - knowing
whether a seat is *physically occupied* - is worth to a train operator.

Everything is in this one directory. No network, no database, no npm install,
no API keys. Node 20+ is the only requirement.

---

## Snabbstart (svenska)

```bash
cd demo/innotrans-seatsense
node src/selftest.mjs        # pre-flight: anropar alla 13 verktyg, ska ge "All checks passed"
claude                       # starta Claude i den här katalogen - .mcp.json kopplar in fejk-Yggio
```

Svara **ja** när Claude frågar om den får använda MCP-servern `yggio`.
Fråga sedan: *"What data do you have?"* och följ `DEMO-SCRIPT.md`.

Kör i det här repots container istället: `make demo` från repo-roten.

---

## Quick start

```bash
cd demo/innotrans-seatsense

node src/selftest.mjs        # pre-flight check - calls all 13 tools, prints OK per tool
claude                      # Claude Code picks up ./.mcp.json and connects to the fake Yggio
```

Approve the `yggio` MCP server when Claude asks. Then ask
*"What data do you have?"* and work through `DEMO-SCRIPT.md`.

Optional, for showing the platform behind Claude on a second screen:

```bash
node src/yggio-api.mjs      # http://localhost:8787
curl -s localhost:8787/api/demo/overview | jq .headline
curl -s "localhost:8787/api/demo/blind-spot" | jq .narrative
```

---

## The story

**Northbank Rail** is a fictional British operator: three routes, 52 daily
departures, ~4.6 million journeys and ~£109m of ticket revenue a year.

### 2025 - running on ticket sales, which cannot see a seat

The operator had tickets sold, gateline counts, and four manual load surveys a
year. None of those see an empty seat, because **a ticket is a sale, not a
person in a seat**. So it had *no cabin factor at all*. What it reported as its
load factor was tickets ÷ seats - a number that silently counts every no-show
as a passenger on board:

- Reported load factor on the morning crush departures across 2025: **105.4%**.
- The four manual load surveys found ticket sales overstating the people
  actually on board by **11.8%** - four days out of 365, counted by hand, one
  direction. Enough to suspect the gap, nowhere near enough to price on.
- Sales were closed at a **112%-of-seats** threshold: seats plus an assumed
  standing allowance, set from ticket counts because there was no way to check.
  That closed sales on **24.3%** of peak departures and turned away **26
  passengers a weekday**.
- With 9-12% no-shows, the people who actually turned up on those closed
  departures were about **99-102% of seats** - so most of the standing
  allowance being protected never materialised.

That is the blind spot in one line: capacity and pricing decisions for a whole
network, made on a load factor roughly 11% too high, with no way to find out.

### Q4 2025 - the pilot

SeatSense on 3 units measured the waste directly: on departures sold at 100%+,
**11.2% of seats travelled empty**, and ticket sales overstated the people on
board by 9-12% - matching the manual surveys.

### 1 January 2026 - fleet-wide, and pricing off measurement

240 SeatSense nodes, one per coach. Fares are now set from *measured* cabin
factor: peak core **+14%**, the half-empty shoulder departures **-5%**, seats
released for on-day sale as soon as the sensors prove nobody is in them, and
the sales threshold set from the measured no-show rate instead of a guess.
Rules were re-tuned monthly, so the effect ramps from ~45% of end-state in
January to 100% by August.

### What that produced

Like-for-like, 1 January - 31 August, 2025 vs 2026:

| | 2025 | 2026 | Change |
| --- | --- | --- | --- |
| Tickets sold | 2,976,973 | 3,108,557 | **+4.4%** |
| Revenue | £70.65m | £75.37m | **+6.7%** (+£4.72m) |
| Average fare | £23.73 | £24.25 | +2.2% |

At the **August run-rate** (rules fully tuned): passengers +5.9%, revenue
+8.9%, which annualises to about **£9.7m**. Of the like-for-like growth,
**£3.45m** is attributable to SeatSense once a 1.8% assumed market trend is
netted off.

The morning peak stopped being a crush (NBR1, August weekdays). Note the two
different load columns - the first is what ticket data reports, the second is
what SeatSense measures, and 2025 has no second column at all:

| Departure | Class | Ticket load factor 2025 → 2026 | Cabin factor 2026 (measured) | Fare 2025 → 2026 | Passengers/weekday |
| --- | --- | --- | --- | --- | --- |
| 06:41 | shoulder | 57% → 71% | 69.0% | £21.93 → £20.76 | 275 → 342 |
| 07:41 | **peak core** | 96% → 92% | **88.5%** | £24.71 → £28.12 | 459 → 442 |
| 09:11 | shoulder | 58% → 71% | 68.6% | £21.93 → £20.77 | 278 → 340 |

Peak core's share of morning peak passengers fell from **55.5% to 49.3%**.
Departures sold at 95%+ of capacity fell from **55% to 3.3%** of peak-core
departures, and sales were closed on **9.4% → 0.2%** of them. Crowding
complaints went 41.2 → 23.8 per 100k journeys, PPM punctuality 88.4% → 91.1%.

Two lines worth having ready. First, the gap ticket data still hides, now
measured (August, peak core): **ticket data would report 91.5% - the real cabin
factor is 88.0%.** Second, from
`seatsense_snapshot(NBR1-0741, 2026-06-16)`:

> 522 tickets sold against 480 seats. SeatSense measured 460 seats occupied,
> **42 passengers standing and 20 paid-for seats travelling empty.**

---

## How it fits together

```
   visitor
     │  plain English
     ▼
  ┌────────────┐   MCP over stdio    ┌──────────────────┐   reads   ┌──────────┐
  │  Claude    │ ──────────────────▶ │  fake Yggio      │ ────────▶ │ data/    │
  │  Code      │ ◀────────────────── │  mcp-server.mjs  │           │ *.json   │
  └────────────┘   13 tools, JSON    │  + dataset.mjs   │           └──────────┘
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
| `assumed_load_factor_pct` | Tickets sold ÷ seats. What an operator without sensors reports as its load factor. Counts every no-show as a passenger, so it overstates how full the train was - and it is the number decisions get made on. Exists for **both** years. |
| `cabin_factor_pct` | Seats SeatSense measured as physically occupied ÷ seats. The real number. **2026 only** - it did not exist before the sensors were fitted, and the tools return `null` plus an explanation for 2025 rather than a figure. |
| `ghost_seats` | Seats that were paid for and travelled empty. |
| `sales_closed` / `demand_turned_away` | Recorded in both years: whether the operator stopped selling a departure, and how many passengers wanted it afterwards. |
| `manual_load_survey` | 2025 only, four dates: passengers counted by hand on board. The single 2025 field that saw actual people. |

## Files

| Path | What it is |
| --- | --- |
| `src/model.mjs` | The whole fiction: operator, network, timetable, demand classes, fares, sales thresholds, the 2026 effect. Edit here to change the story. |
| `src/generate.mjs` | Writes `data/*.json`. Deterministic - same input, identical output. |
| `src/dataset.mjs` | Query + aggregation layer. Shared by the MCP server and the REST API. |
| `src/mcp-server.mjs` | The fake Yggio as an MCP server over stdio. Zero dependencies. |
| `src/yggio-api.mjs` | The same data as a Yggio-shaped REST API, for showing on a screen. |
| `src/selftest.mjs` | Pre-flight check. Drives the MCP server the way Claude does and calls every tool. |
| `.mcp.json` | Wires the MCP server into Claude Code when it starts in this directory. |
| `CLAUDE.md` | Tells Claude how to behave during the demo. |
| `DEMO-SCRIPT.md` | The stage script: questions, expected answers, talking points, recovery. |
| `data/*.json` | Generated data, committed so the demo needs no build step. `operator.json` carries a data dictionary explaining which fields exist in which year, and why. |

## The 13 tools

| Tool | Answers |
| --- | --- |
| `yggio_overview` | "What data do you have?" - start here |
| `ticket_data_blind_spot` | "Operators already have ticket data" - what 2025 reported, why it could not be an occupancy figure, and what it really was |
| `compare_years` | 2025 vs 2026 by total, month, route, service, demand class or day type |
| `peak_spreading_report` | How the morning peak redistributed, departure by departure |
| `seatsense_snapshot` | One train, one day, per coach: sold vs actually occupied vs ghost seats |
| `seatsense_attribution` | Price vs volume split, market-trend counterfactual, ghost-seat value |
| `pricing_actions` | What was done to fares on 1 January 2026 and how demand responded |
| `crowding_and_performance` | Crush departures, closed sales, turn-aways, complaints, dwell, PPM |
| `repricing_candidates` | "What should we do next?" - ranked, with the rule behind each |
| `list_services` | The timetable, to find a `service_id` |
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

- `DEMAND_CLASSES[*].load2025 / load2026` - ticket-derived load factor before
  and after.
- `DEMAND_CLASSES[*].fareDelta2026` - the fare move for that class.
- `noShowStart/End` and `wasteStart/End` - the two ways a paid seat ends up
  empty (a no-show, or a seat nobody can use even on a full train). Both
  shrink as the operator learns from SeatSense; the End values are the fully
  tuned state. `noShowStart` is also what makes the 2025 reported load factor
  wrong, via `TICKET_DATA.pilotNoShowRange`.
- `salesCap2025 / salesCap2026` - where sales close, as a multiple of seats.
  The 2025 value is the guess; the 2026 value is set from measured no-shows.
- `TICKET_DATA` - what ticket data could and could not see, the manual survey
  dates, and the no-show range the 2025 inference uses.
- `rampFor()` - how fast the 2026 changes phase in.
- `ROUTES[*].effectStrength` - how strongly a route responds to price.
- `KPI_ENDPOINTS` - complaints, dwell, PPM, NPS.
- `ATTRIBUTION.assumedMarketGrowthPct` - the counterfactual in the attribution.

## Honesty notes

Worth knowing before someone in the audience asks:

- Northbank Rail does not exist and every figure is synthetic. Station names
  are real so the network reads as plausible to rail people.
- Revenue, tickets sold and the ticket-derived load factor are comparable
  across both years. **Cabin factor, standing passengers and ghost seats are
  2026-only** - nothing measured seats in 2025, and the tools return `null`
  with an explanation rather than inventing a baseline.
- The one place the demo does estimate 2025 occupancy is
  `ticket_data_blind_spot`, and there it is flagged `inference: true`, states
  its method and the 9-12% no-show range it uses, and gives a range rather
  than a point figure.
- Year-on-year figures compare the same calendar window in both years
  (1 January - 31 August), because 2026 data stops on 31 August.
- The elasticities, the market-growth counterfactual and the indicative effects
  in `repricing_candidates` are modelling assumptions, and each tool states
  the one it used.
- Every service runs every day in this model, with weekend and bank-holiday
  demand factors rather than a reduced weekend timetable.
