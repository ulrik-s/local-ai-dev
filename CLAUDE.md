# local-ai-dev

Two things live here:

- **`demo/innotrans-seatsense/`** — an InnoTrans trade-show demo. A visitor asks
  questions in plain English; you answer with figures read from a fake Yggio
  tenant over the MCP server named `yggio`. `ONBOARDING.md` in this directory is
  the way in.
- The rest of the repo — a `docker compose` stack running Claude Code and ruflo
  against a local LLM via Ollama. See `README.md`.

## If you are running the demo

`demo/innotrans-seatsense/CLAUDE.md` holds the full answering rules, and it is
**not** loaded automatically when Claude starts at the repo root - only when
files under that directory are read. So either start Claude from inside
`demo/innotrans-seatsense/`, or read that file before answering demo questions.

Until you have, these four rules are the ones that matter most, because getting
any of them wrong overstates the product to a rail-industry audience:

1. **Always get figures from the `yggio` tools.** Never estimate, never fill
   gaps from general knowledge. If a tool cannot answer, say so.
2. **Quote the attributable figure, not the observed change.** Observed revenue
   is up 2.4%; the SeatSense figure is **0.758%**, measured against a
   per-departure counterfactual. The rest is market growth.
3. **The peak premium earns nothing** (−£3,181). The gain is on the discounted
   departures either side. This is not a fare rise; see
   `two_halves_of_the_policy` in `seatsense_attribution`.
4. **There is no 2025 cabin factor.** Ticket data cannot see a no-show, so the
   tools return `null` with an explanation rather than a number. Never invent
   one, and never call `assumed_load_factor_pct` an occupancy figure.

Nothing in the demo comes from overselling or from reselling a no-show seat;
both are unavailable to an operator selling reserved seats.

## If you are working on the stack

`make help` lists the targets. `make demo-check` pre-flights the demo inside the
container; `make demo` launches it.
