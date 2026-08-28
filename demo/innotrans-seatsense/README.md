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
node src/selftest.mjs        # pre-flight: anropar alla 12 verktyg, ska ge "All checks passed"
claude                       # starta Claude i den här katalogen - .mcp.json kopplar in fejk-Yggio
```

Svara **ja** när Claude frågar om den får använda MCP-servern `yggio`.
Fråga sedan: *"What data do you have?"* och följ `DEMO-SCRIPT.md`.

Kör i det här repots container istället: `make demo` från repo-roten.

---

## Quick start

```bash
cd demo/innotrans-seatsense

node src/selftest.mjs        # pre-flight check - calls all 12 tools, prints OK per tool
claude                      # Claude Code picks up ./.mcp.json and connects to the fake Yggio
```

Approve the `yggio` MCP server when Claude asks. Then ask
*"What data do you have?"* and work through `DEMO-SCRIPT.md`.

Optional, for showing the platform behind Claude on a second screen:

```bash
node src/yggio-api.mjs      # http://localhost:8787
curl -s localhost:8787/api/demo/overview | jq .headline
curl -s "localhost:8787/api/demo/snapshot?service_id=NBR1-0741&date=2026-06-16" | jq .
```

---

## The story

**Northbank Rail** is a fictional British operator: three routes, 52 daily
departures, ~4.6 million journeys and ~£109m of ticket revenue a year.

- **2025 - blind.** The operator knew only how many tickets it sold. Morning
  peak trains looked sold out, so sales were capped - while paid-for seats
  travelled empty (no-shows, unclaimed reservations, bags on seats, the coach
  at the far end nobody walks to) and other passengers stood.
- **Q4 2025 - the pilot.** SeatSense on 3 units measured the waste: on
  departures sold at 100%+, **11.2% of seats travelled empty**, and ticket
  sales overstated the people on board by 9-12%.
- **1 January 2026 - fleet-wide.** 240 SeatSense nodes, one per coach. Fares
  are now set from *measured* occupancy: peak core **+14%**, the half-empty
  shoulder departures **-5%**, and seats are released for on-day sale as soon
  as the sensors prove nobody is in them. Rules were re-tuned monthly, so the
  effect ramps from ~45% of end-state in January to 100% by August.

What that produced (like-for-like, 1 January - 31 August, 2025 vs 2026):

| | 2025 | 2026 | Change |
| --- | --- | --- | --- |
| Tickets sold | 2,977,895 | 3,108,560 | **+4.4%** |
| Revenue | £70.67m | £75.37m | **+6.7%** (+£4.71m) |
| Average fare | £23.73 | £24.25 | +2.2% |

At the **August run-rate** (rules fully tuned): passengers +5.9%, revenue
+8.9%, which annualises to about **£9.7m**. Of the like-for-like growth,
**£3.4m** is attributable to SeatSense once a 1.8% assumed market trend is
netted off.

And the morning peak stopped being a crush (NBR1, August weekdays):

| Departure | Class | Sold load 2025 → 2026 | Fare 2025 → 2026 | Passengers/weekday |
| --- | --- | --- | --- | --- |
| 06:41 | shoulder | 57% → 71% | £21.93 → £20.76 | 275 → 342 |
| 07:41 | **peak core** | 96% → 92% | £24.71 → £28.12 | 459 → 442 |
| 09:11 | shoulder | 58% → 71% | £21.93 → £20.77 | 278 → 340 |

Peak core's share of morning peak passengers fell from **55.5% to 49.3%**.
Departures sold at 95%+ of capacity fell from **55% to 3.3%** of peak-core
departures. Crowding complaints went 41.2 → 23.8 per 100k journeys, PPM
punctuality 88.4% → 91.1%.

The single most useful line on the stand, from
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
  └────────────┘   12 tools, JSON    │  + dataset.mjs   │           └──────────┘
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

## Files

| Path | What it is |
| --- | --- |
| `src/model.mjs` | The whole fiction: operator, network, timetable, demand classes, fares, the 2026 effect. Edit here to change the story. |
| `src/generate.mjs` | Writes `data/*.json`. Deterministic - same input, identical output. |
| `src/dataset.mjs` | Query + aggregation layer. Shared by the MCP server and the REST API. |
| `src/mcp-server.mjs` | The fake Yggio as an MCP server over stdio. Zero dependencies. |
| `src/yggio-api.mjs` | The same data as a Yggio-shaped REST API, for showing on a screen. |
| `src/selftest.mjs` | Pre-flight check. Drives the MCP server the way Claude does and calls every tool. |
| `.mcp.json` | Wires the MCP server into Claude Code when it starts in this directory. |
| `CLAUDE.md` | Tells Claude how to behave during the demo. |
| `DEMO-SCRIPT.md` | The stage script: questions, expected answers, talking points, recovery. |
| `data/*.json` | Generated data, committed so the demo needs no build step. |

## The 12 tools

| Tool | Answers |
| --- | --- |
| `yggio_overview` | "What data do you have?" - start here |
| `compare_years` | 2025 vs 2026 by total, month, route, service, demand class or day type |
| `peak_spreading_report` | How the morning peak redistributed, departure by departure |
| `seatsense_snapshot` | One train, one day, per coach: sold vs actually occupied vs ghost seats |
| `seatsense_attribution` | Price vs volume split, market-trend counterfactual, ghost-seat value |
| `pricing_actions` | What was done to fares on 1 January 2026 and how demand responded |
| `crowding_and_performance` | Crush departures, complaints, dwell, PPM, passengers left behind |
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

- `DEMAND_CLASSES[*].load2025 / load2026` - sold load factor before and after.
- `DEMAND_CLASSES[*].fareDelta2026` - the fare move for that class.
- `noShowStart/End` and `wasteStart/End` - the two ways a paid seat ends up
  empty (a no-show, or a seat nobody can use even on a full train). Both
  shrink as the operator learns from SeatSense; the End values are the fully
  tuned state.
- `rampFor()` - how fast the 2026 changes phase in.
- `ROUTES[*].effectStrength` - how strongly a route responds to price.
- `KPI_ENDPOINTS` - complaints, dwell, PPM, passengers left behind.
- `ATTRIBUTION.assumedMarketGrowthPct` - the counterfactual in the attribution.

## Honesty notes

Worth knowing before someone in the audience asks:

- Northbank Rail does not exist and every figure is synthetic. Station names
  are real so the network reads as plausible to rail people.
- Revenue and tickets sold are comparable across 2025 and 2026. **Occupancy,
  standing passengers and ghost seats are 2026-only** - nothing measured seats
  in 2025, and the tools refuse to invent a 2025 occupancy figure.
- Year-on-year figures compare the same calendar window in both years
  (1 January - 31 August), because 2026 data stops on 31 August.
- The elasticities, the market-growth counterfactual and the indicative effects
  in `repricing_candidates` are modelling assumptions, and each tool states
  the one it used.
- Every service runs every day in this model, with weekend and bank-holiday
  demand factors rather than a reduced weekend timetable.
