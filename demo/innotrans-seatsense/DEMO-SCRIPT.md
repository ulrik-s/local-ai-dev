# Stage script

Eleven questions, roughly nine minutes, building from "what is this?" to "what
do we do next?". Type them in English into Claude running in this directory.
Each block gives the question, the number to look for in the answer, and the
line to say while the audience reads it.

Every figure below comes from the shipped data - if a number in the answer does
not match, the data has been regenerated with different parameters.

**The one thing not to get wrong on stage:** observed revenue is up 1.9%, but
the SeatSense number is **0.75%**. The rest is market growth. Quote the small
number - it is the one that survives scrutiny, and it is the customer's own
business case.

---

## 0. Before the visitor arrives

```bash
cd demo/innotrans-seatsense
node src/selftest.mjs      # must end with "All checks passed"
claude                     # approve the yggio MCP server when asked
```

Optionally on a second screen: `node src/yggio-api.mjs`, browser at
`http://localhost:8787`.

One sentence of setup:

> This is a British train operator's Yggio tenant. Reserved seats, one ticket
> per seat, no overselling - and SeatSense on every coach since 1 January.
> Ask it anything.

---

## 1. "What data do you have?"

**Tool:** `yggio_overview`

Look for: three routes, 52 daily departures, **240 SeatSense nodes**, 2025 =
ticket sales only, 2026 = ticket sales *plus* measured cabin factor, and the
sales policy block: **one ticket per seat, overselling not permitted.**

> Note the policy first, because it's what makes this different from an
> airline. And note what's missing from 2025: they knew what they sold. They
> did not know who actually sat down.

## 2. "European operators can't oversell like airlines. So why does measuring occupancy make money?"

**Tool:** `seatsense_attribution`, or `yggio_overview` if it starts there

This is the question the whole demo answers, and it is worth asking out loud
before the data does.

Look for the `what_this_does_not_claim` block: no revenue from overselling,
none from reselling no-show seats, and no claim that ticket data misses unsold
seats - **it knows those exactly.**

> An airline oversells the peak and prices the denied-boarding risk in. You
> can't. So when someone doesn't show up, that seat departs empty and the money
> is gone - you can't resell it, it's still theirs. Nothing SeatSense does
> recovers that seat. What it does is tell you which of your departures are
> *genuinely* full - and that's the number every pricing decision runs on.

## 3. "In 2025 they only had ticket sales. What did they think their load factor was, and what was it really?"

**Tool:** `ticket_data_blind_spot`

Look for:

- Reported load factor on the morning crush across 2025: **99.8%**, sales
  closed on **90.1%** of those departures, **377 passengers a weekday** turned
  away.
- **`cabin_factor_pct: null`** - not missing from the demo, missing from the
  industry. And the reason, which is the sharpest sentence in the dataset:
  **revenue is booked whether the passenger travels or not**, so nothing in a
  ticket system can tell the two apart.
- The four manual load surveys: ticket sales overstated passengers by **8.8%**.
- Inferred real cabin factor for 2025: **87.8-90.8%** - an estimated **42-55 of
  454 seats** departing empty on trains that had just refused passengers.

> Four people with clickers, four days a year. That was the state of the art.
> And every capacity and pricing decision was made on a number nine percent
> too high.

## 4. "Show me the morning peak departures ranked by how full they actually are."

**Tool:** `fullness_ranking` - **the proof, and the best table in the demo**

Look for: ticket sales spread these eight departures across **3.4 points**;
measured occupancy spreads them across **6.1 points**; and **all eight change
rank**. Specifically:

- **NBR3-0752** is ranked **1st** by tickets sold (99.8%) and **4th** by actual
  fullness (89.5%).
- **NBR1-0811** is 3rd by sales (99.0%) and **1st** by fullness (91.8%).
- **NBR1-0741** is 5th by sales (98.8%) and **7th** by fullness - **86.8%**,
  because 12% of its ticket holders don't turn up.

> Same ticket system, same day, and it ranks these trains wrong. Raise the fare
> on the 07:41 because your dashboard says it's the fullest, and you push away
> real passengers while the empty seats stay empty. That's the product in one
> table.

## 5. "How much revenue is attributable to SeatSense, and how do you know?"

**Tool:** `seatsense_attribution`

Look for: observed **+1.9%** (£1.34m), split into **£809,795 market growth**
and **£534,722 SeatSense = 0.749% of total revenue**, against a business case
of **0.75%**. Annualised, about **£0.8m**. And the method: every 2026 departure
carries what it *would* have taken on 2025's pricing rules with the same market
growth.

> Not a flat growth assumption - that would be wrong here, because the peak was
> already sold out and physically could not absorb growth. So the counterfactual
> is per departure. And almost all of the gain is fare, not volume: £360k price
> against £177k volume. They aren't carrying more people. They're charging the
> right fare on the right train.

**Follow-up worth having ready:** *"0.75% sounds small."* → about £0.8m a year
from 240 sensors, with no fare-basket increase and no overselling.

## 6. "Break that down by month."

**Tool:** `compare_years` with `group_by=month`, or `capacity_pressure`

Look for: Jan **0.47%**, Feb 0.71%, Mar 0.93%, Apr 0.76%, May 0.88%, Jun
**0.95%**, Jul 0.93%, Aug **0.31%** - alongside how often the peak sold out:
61%, 99%, 100%, 100%, 100%, 100%, 100%, **30%**.

> This is my favourite number in the demo. The money only appears in the months
> when the peak actually sells out. In August it doesn't, so the fare increase
> loses exactly the volume it gains and the effect nearly vanishes. That's not
> a flaw in the model - it's the mechanism. You get paid for pricing a train
> that's genuinely full, which is precisely the thing you couldn't measure.

## 7. "How many paid seats travelled empty on the 07:41 on 16 June?"

**Tool:** `seatsense_snapshot`, `service_id=NBR1-0741`, `date=2026-06-16`

Look for: **480 of 480 seats sold, sales closed, 78 passengers turned away**,
432 boarded, cabin factor **90%** against the 100% the ticket system reported,
**48 ghost seats worth £1,222** - plus the per-coach breakdown.

> Seventy-eight people told the train was full. Forty-eight paid-for seats
> travelling empty. Both true, same train, same morning. We can't sell those
> seats - they're already sold, to people who didn't come. What we can do is
> know it, and price this departure differently next time.

**Optional:** *"What did the sensor in coach B see that day?"*
(`yggio_iotnode_readings`, `device_id=iot-nbr1-u003-b`) - drops to the raw
device level if someone doubts there's a real device model underneath.

## 8. "What did they actually change on 1 January?"

**Tool:** `pricing_actions`

Look for: peak core **+1.9%**, evening peak **+1.4%**, peak shoulder
**-1.1%**, small discounts off-peak; fare basket unchanged; and the
`not_available` block. Attributable by class: peak core **+1.41%**, evening
peak +0.64%, shoulder +0.54%.

> One to two percent. That's it. In a regulated fare environment that's all
> you get, and it's all you need - if you aim it correctly.

## 9. "Did crowding improve?"

**Tool:** `capacity_pressure`

Look for the honest answer: peak sold-out departures **86.5% → 86.7%**,
essentially unchanged; network turn-aways **402 → 409 a weekday**, slightly
**up**; and `no_service_quality_claim`.

> No. And I'd be suspicious of anyone who told you a sensor fixed crowding.
> Market growth pushes against a hard cap, so it becomes turn-aways. What did
> change is the capacity *case*: this peak reports 99.7% and measurably travels
> at 90.6% - about 41 of 454 seats a train already there and unused. Before you
> sign for more rolling stock, you'd want to know that.

## 10. "Which departures should we reprice next?"

**Tool:** `repricing_candidates`

Look for: **3 raise_fare, 2 hold_fare_high_no_show, 24 discount_to_fill** -
and the two `hold` entries, which are the interesting ones:

- **NBR3-0752**: sold 99.8%, closes sales on 70% of weekdays - and travels at
  **89.5%**. Do *not* raise its fare.
- **NBR1-0741**: sold 98.8%, cabin factor **86.8%**. Same.

> The recommendation that earns its keep isn't "raise this fare" - it's "don't
> raise that one". On ticket data the 0752 is your fullest train in the whole
> network. Measured, it's fourth, and a fare rise there costs you real
> passengers to protect seats that were never going to be used.

## 11. "What would you tell the board?"

No specific tool - Claude summarises what it has already pulled.

> Same fleet, same timetable, same fare basket, no overselling, nothing resold.
> One sensor per coach, and 0.75% of revenue - because for the first time the
> pricing team knows which trains are actually full.

---

## If the visitor goes off-script

All real queries against the shipped dataset:

- *"What was the cabin factor in 2025?"* → the tools **refuse**: `null` with an
  explanation. That refusal is the best moment in the demo, not a failure.
- *"Couldn't you just resell the empty seat mid-journey?"* → no, and
  `seatsense_snapshot` says why: the reservation belongs to its buyer for the
  whole journey.
- *"So no-shows went down?"* → no. Identical in both years by construction.
  SeatSense measures them; it doesn't prevent them.
- *"Which route benefited most?"* → `compare_years group_by=route`
- *"Was the evening peak the same story?"* → `fullness_ranking` or
  `ticket_data_blind_spot` with `demand_class=evening_peak`
- *"Show me one specific train over time."* → `service_history`
- *"Are all the sensors working?"* → `yggio_list_iotnodes` (a handful are
  offline, with a last-reported timestamp - it's a fleet, not a lab)
- *"What's the legal basis for no overselling in my market?"* → the demo frames
  it contractually (a reservation is a right to that seat; denied boarding
  triggers passenger-rights obligations) and does not cite a statute. Say that
  plainly and offer to follow up.

## Recovery

- **Claude doesn't see the tools** - it wasn't started in this directory, or
  the MCP server wasn't approved. Quit, `cd demo/innotrans-seatsense`, restart,
  approve.
- **A number looks wrong** - run `node src/selftest.mjs`. It calls every tool
  and prints the headline of each.
- **The model quotes 1.9% as the SeatSense figure** - it has confused observed
  with attributable. Say "how much of that is attributable to SeatSense rather
  than market growth?" and it will correct itself.
- **The model quotes a 2025 cabin factor** - it has invented it. Ask it to
  check with `ticket_data_blind_spot`; the tool returns `null` and says why.
- **The model waffles instead of calling a tool** - name the tool in the
  question: *"Use fullness_ranking for peak core."*
- **Someone asks whether this is real** - say plainly that the operator is
  fictional and the data synthetic, generated to be internally consistent; the
  constraint, the blind spot and the pricing mechanism are real.
