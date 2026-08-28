# Stage script

Eleven questions, roughly nine minutes, building from "what is this?" to "what
do we do next?". Type them in English into Claude running in this directory.
Each block gives the question, the number to look for, and the line to say
while the audience reads it.

Every figure comes from the shipped data - if a number in the answer does not
match, the data has been regenerated with different parameters.

**Two things not to get wrong on stage:**

1. Observed revenue is up **2.4%**, but the SeatSense number is **0.757%**. The
   rest is market growth. Quote the small one - it is the customer's own
   business case, and it is the one that survives scrutiny.
2. Nothing here comes from overselling or from reselling a no-show seat. If you
   imply it does, the first rail person in the room will stop listening.

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

> A British operator, reserved seats, one ticket per seat - so no overselling.
> SeatSense on every coach since 1 January. Ask it anything.

---

## 1. "What data do you have?"

**Tool:** `yggio_overview`

Look for: three routes, 58 daily departures, **240 SeatSense nodes**, 2025 =
ticket sales only, 2026 = ticket sales *plus* measured cabin factor, and the
sales policy: **one ticket per seat, overselling not permitted.**

> The policy first, because it's what makes this a rail problem and not an
> airline one. And note what's missing from 2025: they knew what they sold.
> They did not know who actually sat down.

## 2. "A train sold out at 100% can't take another passenger. What did that cost?"

**Tool:** `capacity_pressure`

Look for the 2025 column: peak core closed sales on **82.3%** of weekdays, the
evening peak on **67.7%**, and **47 passengers a weekday** were refused across
the network.

> Every one of those is a fare that didn't happen. An airline absorbs them -
> it overbooks and prices the denied-boarding risk in. A European operator
> selling reserved seats can't do that: the seat is contractually somebody's,
> and refusing a boarding triggers passenger rights. So the only way to keep
> those passengers is to make sure the train never fills in the first place.

## 3. "So what did they change?"

**Tool:** `pricing_actions`

Look for the principle - **"it must always be possible to travel on the
departure you want; it may cost more"** - and the parameters: target cabin
factor **88%**, sold ceiling **97%**, maximum premium **7%**. Realised fares:
peak core **+4.7%**, evening peak **+3.2%**, peak shoulder **−7%**.

Then back to `capacity_pressure` for the result: peak core closing sales
**82.3% → 9.1%**, evening peak **67.7% → 10.8%**, turn-aways **47 → 1 a
weekday**, peak shoulder sold **58.5% → 61.9%**.

> The fare is solved against each day's demand, not set once a year. Raise the
> popular departure until it lands just under full, discount the ones either
> side so the people it prices off have somewhere to go. Nobody is refused any
> more. The train you want is still available - it just costs about a fiver
> more.

## 4. "Why do you need a sensor for that? The booking system knows what's sold."

**Tool:** `fullness_ranking` with `month=6` - **the proof, and the best table
in the demo**

Look for: ticket sales spread these eight peak departures across **0.8
points** - the booking system genuinely cannot tell them apart. Measured
occupancy spreads them across **5.1 points**, and **six of eight change rank**.
Specifically **NBR1-0741**: 3rd by tickets sold, **7th** by actual fullness,
because 12% of its ticket holders don't turn up.

> It does know what's sold. What it can't know is who turns up, because the
> revenue is booked either way. And the headroom has to be measured against
> the people, not the tickets - otherwise you hold a train at 96% sold that's
> actually running at 84%, and you've priced away passengers to protect seats
> that were never going to be used.

## 5. "Show me two departures where that changes the price."

**Tool:** `list_services` with `route_id=NBR1`, or read them off question 4

- **NBR1-0711**: no-show **7.2%** → held to **95.2%** sold → premium **+5.2%**
- **NBR1-0741**: no-show **12.0%** → can be sold to **97%** → premium **+4.4%**

> Thirty minutes apart. Sold within a point of each other. The one that looks
> fuller gets the *smaller* increase, because more of its passengers won't
> show up, so it can safely be sold closer to the cap. Ticket data would have
> done the exact opposite.

## 6. "How much is this worth, and how do you know?"

**Tool:** `seatsense_attribution`

Look for: observed **+2.4%** (£1.86m), split into **£1,276,352 market growth**
and **£587,324 SeatSense = 0.757% of total revenue**, against a business case
of **0.75%**. Annualised, about **£0.9m**. Price effect **£601k**, volume
**−£23k**.

> Not a flat growth assumption - that would be wrong, because the peak was
> already sold out and physically couldn't absorb growth. Every 2026 departure
> carries what it *would* have taken on the old fares, so the counterfactual
> is per departure. And notice it's almost all yield: passenger numbers are
> flat. They're not carrying more people, they're charging the right fare on
> the right train and no longer turning anyone away.

**Ready for "0.757% sounds small":** about £0.9m a year, from 240 sensors, with
no overselling and nothing resold.

## 7. "Break it down by month."

**Tool:** `capacity_pressure` or `compare_years group_by=month`

Look for: Jan **0.19%**, Mar 1.28%, May 1.36%, Jun **1.49%**, Aug **0.07%** -
next to how often the peak sold out in 2025: 46%, 100%, 100%, 100%, 15%.

> My favourite number in the demo. The fare is solved per day, so a departure
> that wouldn't have filled carries no premium at all. In August nothing was
> being rationed, so there was nothing to price and the effect is 0.07%. You
> get paid for pricing a train that would otherwise have refused someone -
> which is precisely the thing you couldn't measure.

## 8. "How many paid seats travelled empty on the 07:41 on 17 March?"

**Tool:** `seatsense_snapshot`, `service_id=NBR1-0741`, `date=2026-03-17`

Look for: **469 of 480 sold, sales still open, nobody refused**, 405 boarded,
cabin factor **84.4%** against the 97.7% the ticket system reported, **64 ghost
seats** - plus the per-coach breakdown.

> Sixty-four seats paid for and empty, on a train the booking system called
> 98% full. We can't sell them - they're already sold, to people who didn't
> come. We can't oversell to cover them. What we can do is know it, and that's
> what set this departure's price.

**Optional:** try `date=2026-06-16` for the other case - one of the 9% of days
where the premium cap binds and the train fills anyway.

## 9. "What did they think their load factor was in 2025?"

**Tool:** `ticket_data_blind_spot`

Look for: reported **99.6%** on the morning crush, **`cabin_factor_pct: null`**,
the four manual load surveys finding ticket sales overstating passengers by
**8.8%**, and the inferred truth: **87.6-90.6%**, an estimated **43-56 of 454
seats** departing empty.

> Four people with clickers, four days a year. That was the state of the art.
> And every pricing and capacity decision was made on a number nine percent
> too high.

## 10. "What still needs attention?"

**Tool:** `repricing_candidates`

Look for **3 `lengthen_the_train`, 4 `premium_cap_is_binding`**, and the
contrast inside them:

- **NBR1-0711**: cabin **89.6%**, still closing sales 12.6% of weekdays,
  no-show 7.2% → *lengthen the train.* Price has done its job.
- **NBR1-0741**: cabin **85.9%**, closing sales 13.2%, no-show 12% → *the
  premium cap is binding.* It fills on tickets while travelling 14 points
  empty.

> Same route, thirty minutes apart, and the answers are opposite. One needs
> steel; the other needs a decision about how much premium is defensible.
> That's the conversation the sensor data makes possible - and note what's not
> on this list, because it isn't legal: overselling, and reselling the empty
> seats.

## 11. "What would you tell the board?"

No specific tool - Claude summarises what it has already pulled.

> Same fleet, same timetable, nothing oversold and nothing resold. One sensor
> per coach, 0.757% of revenue, and a peak that stopped turning people away.

---

## If the visitor goes off-script

- *"What was the cabin factor in 2025?"* → the tools **refuse**: `null` with an
  explanation. The best moment in the demo, not a failure.
- *"Couldn't you resell the empty seat mid-journey?"* → no, and
  `seatsense_snapshot` says why: the reservation belongs to its buyer for the
  whole journey.
- *"So no-shows went down?"* → no. Identical in both years by construction.
  SeatSense measures them; it doesn't prevent them.
- *"Did crowding improve?"* → `capacity_pressure` says no service-quality claim
  is made. What improved is that far fewer passengers meet a closed sale.
- *"Aren't you just putting peak fares up?"* → +4.7% on peak core, −7% on the
  shoulders, and passenger numbers flat. `pricing_actions` shows the whole
  parameter set including the 7% cap.
- *"Which route benefited most?"* → `compare_years group_by=route`
- *"Show me one train over time."* → `service_history`
- *"Are all the sensors working?"* → `yggio_list_iotnodes` (a handful offline
  with a last-reported timestamp - it's a fleet, not a lab)
- *"What's the legal basis in my market?"* → the demo frames it contractually
  and cites no statute. Say that plainly and offer to follow up.

## Recovery

- **Claude doesn't see the tools** - it wasn't started in this directory, or
  the MCP server wasn't approved. Quit, `cd demo/innotrans-seatsense`, restart,
  approve.
- **A number looks wrong** - run `node src/selftest.mjs`. It calls every tool
  and prints the headline of each.
- **The model quotes 2.4% as the SeatSense figure** - it has confused observed
  with attributable. Ask "how much of that is attributable to SeatSense rather
  than market growth?" and it will correct itself.
- **The model quotes a 2025 cabin factor** - it has invented it. Ask it to
  check with `ticket_data_blind_spot`; the tool returns `null` and says why.
- **The model waffles instead of calling a tool** - name the tool:
  *"Use fullness_ranking for peak core in June."*
- **Someone asks whether this is real** - the operator is fictional and the
  data synthetic, generated to be internally consistent. The constraint, the
  blind spot and the pricing mechanism are real.
