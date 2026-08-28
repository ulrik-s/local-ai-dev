# Stage script

Eleven questions, roughly nine minutes, building from "what is this?" to "what
do we do next?". Type them in English into Claude running in this directory.
Each block gives the question, the number to look for in the answer, and the
line to say while the audience reads it.

Every figure below comes from the shipped data - if a number in the answer
does not match, the data has been regenerated with different parameters.

---

## 0. Before the visitor arrives

```bash
cd demo/innotrans-seatsense
node src/selftest.mjs      # must end with "All checks passed"
claude                     # approve the yggio MCP server when asked
```

Optionally on a second screen: `node src/yggio-api.mjs`, browser at
`http://localhost:8787`.

One sentence of setup for the visitor:

> This is a British train operator's Yggio tenant. They fitted SeatSense to
> every coach on 1 January 2026. Ask it anything.

---

## 1. "What data do you have?"

**Tool:** `yggio_overview`

Look for: three routes, 52 daily departures, **240 SeatSense nodes**, 2025 =
ticket sales only, 2026 = ticket sales *plus* measured cabin factor.

> Note what's missing from 2025. They knew what they sold. They did not know
> who actually sat down.

## 2. "In 2025 they only had ticket sales. What did they think their load factor was, and what was it really?"

**Tool:** `ticket_data_blind_spot` - **the question that answers "but we
already have ticket data"**

Look for:

- Reported load factor on the morning crush across 2025: **105.4%** - which is
  tickets ÷ seats, so every no-show counted as a passenger on board.
- **`cabin_factor_pct: null`** - not missing from the demo, missing from the
  industry. Ticket data cannot see an empty seat.
- The four manual load surveys: ticket sales overstated the people on board by
  **11.8%**. Four days out of 365, counted by hand.
- Sales closed at a **112%-of-seats** threshold on **24.3%** of peak
  departures, turning away **26 passengers a weekday** - while an estimated
  **19-33 of 454 seats** travelled empty.
- The same gap measured in 2026: ticket data would say **91.5%**, SeatSense
  measures **88.0%**.

> This is the pitch. Not "you'd get a nicer dashboard" - your load factor is
> wrong by about eleven percent, in the direction that makes you close sales on
> trains that have seats. And the only way you'd ever find out is four people
> with clickers, four days a year.

Ask a follow-up if they push: *"How do you know the 2025 estimate is right?"* -
it will show you `inference: true`, the method, and the 9-12% range, and say
plainly that the operator could not have computed it at the time.

## 3. "How did revenue and passenger numbers change after SeatSense went live?"

**Tool:** `compare_years`

Look for: tickets **+4.4%**, revenue **+6.7%** (**+£4.72m**), average fare
+2.2%, and the run-rate block: August year-on-year **+8.9%** revenue,
annualising to about **£9.7m**.

> More passengers *and* more per passenger. That combination is the point -
> they didn't just put fares up.

## 4. "Break that down by demand class. Where did the money come from?"

**Tool:** `compare_years` with `group_by=demand_class`

Look for: peak shoulder **+17.1% passengers, +12.6% revenue on a 3.9% cheaper
fare**; peak core **-2.6% passengers but +7.1% revenue** on a 10% higher fare.

> They deliberately carried *fewer* people on the crush trains and made more
> money doing it. The growth is in the half-empty departures either side.

## 5. "Show me the morning peak on the Anglia Metro, before and after."

**Tool:** `peak_spreading_report` with `route_id=NBR1`

Look for the departure-by-departure table: the 07:41 goes 96% → 92% on
ticket-derived load factor at £24.71 → £28.12, with the **measured cabin factor
at 88.5%** - and no 2025 column beside it, because that number never existed.
The 06:41 goes 57% → 71% at a slightly cheaper fare, 275 → 342 passengers a
day. Peak core's share of morning peak passengers: **55.5% → 49.3%**.

> This is the whole product in one table. Same trains, same track, same
> timetable. The passengers moved because the price told them to - and the
> price could move because someone finally measured the seats.

## 6. "How many paid seats travelled empty on the 07:41 on 16 June?"

**Tool:** `seatsense_snapshot` with `service_id=NBR1-0741`, `date=2026-06-16`

Look for: 522 sold against 480 seats (**108.7% by ticket data, 95.8% cabin
factor**), **460 seats occupied, 42 standing, 20 ghost seats** worth about
£559 - plus the per-coach breakdown showing coaches A-D full and coach H with
9 free seats.

> Forty-two people standing. Twenty paid-for seats travelling empty. Ticket
> data cannot see either number, and this happens on every train, every day.

**Optional follow-up:** *"What did the sensor in coach B see that day?"*
(`yggio_iotnode_readings`, `device_id=iot-nbr1-u003-b`) - drops to the raw
device level if someone doubts there's a real device model underneath.

## 7. "How much of the revenue growth is actually SeatSense?"

**Tool:** `seatsense_attribution`

Look for: **£1.62m from price, £3.12m from volume**; against a 1.8% assumed
market trend, **£3.45m attributable**; ghost seats down from 2.6% to 1.6% of
capacity, about **232 paid-but-empty seats a day recovered**.

> Ask it to redo that with 4% market growth instead. It states its assumption
> and recalculates - it isn't hiding the counterfactual.

## 8. "What did crowding and punctuality do?"

**Tool:** `crowding_and_performance`

Look for: departures sold at 95%+ down from **8.3% to 1.4%** of weekday
departures; sales closed on **9.4% → 0.2%** of peak-core departures;
complaints **41.2 → 23.8** per 100k journeys; PPM **88.4% → 91.1%**; dwell
**78s → 66s**.

> For a franchise bid or a regulator, this half is worth as much as the money.
> Less crush means shorter dwell times, which means better punctuality.

## 9. "Which departures should we reprice next?"

**Tool:** `repricing_candidates`

Look for: 35 candidates - **13 "release seats earlier"** (peak trains where 3%+
of seats are still paid-for-and-empty) and **22 "discount to fill"**, each with
the rule and an indicative annual effect.

> That's next Monday's revenue meeting, generated from sensor data. Try
> `month=6` and the recommendations change to "raise fare" - June is when
> people were still standing.

## 10. "What would you tell the board?"

No specific tool - Claude summarises what it has already pulled.

> Same fleet, same timetable, one sensor per coach. The difference is that
> every number they price on is now measured instead of assumed.

---

## If the visitor goes off-script

The data can carry these too - all real queries against the shipped dataset:

- *"What was the cabin factor in 2025?"* → the tools **refuse**: no sensors
  existed, so the field is `null` with an explanation. That refusal is the
  best moment in the demo, not a failure.
- *"Which route benefited most?"* → `compare_years group_by=route`
  (NBR2 Great Northern Line, +£2.64m)
- *"Show me month by month."* → `compare_years group_by=month`
  (January +2.3% rising to June +10.4% - the rules were being tuned)
- *"What about weekends?"* → `compare_years group_by=day_type`
- *"Was the evening peak the same story?"* → `ticket_data_blind_spot` with
  `demand_class=evening_peak`
- *"Are all the sensors working?"* → `yggio_list_iotnodes` (a handful are
  offline, with a last-reported timestamp - it's a fleet, not a lab)
- *"What were fares before and after?"* → `pricing_actions`, including the
  implied elasticity per class
- *"Show me one specific train over time."* → `service_history`

## Recovery

- **Claude doesn't see the tools** - it wasn't started in this directory, or
  the MCP server wasn't approved. Quit, `cd demo/innotrans-seatsense`, restart,
  approve.
- **A number looks wrong** - run `node src/selftest.mjs`. It calls every tool
  and prints the headline of each.
- **The model waffles instead of calling a tool** - name the tool in the
  question: *"Use compare_years grouped by demand class."*
- **The model quotes a 2025 cabin factor** - it has invented it. Ask it to
  check with `ticket_data_blind_spot`; the tool returns `null` and says why.
- **Someone asks whether this is real** - say plainly that the operator is
  fictional and the data synthetic, generated to be internally consistent; the
  sensor behaviour, the blind spot and the pricing mechanism are what
  SeatSense actually addresses.
