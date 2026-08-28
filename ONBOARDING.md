# Northbank Rail / SeatSense demo — start here

This repo holds two things:

1. **`demo/innotrans-seatsense/`** — a trade-show demo where a visitor talks to
   Claude in plain English and Claude answers with real figures from a **fake
   Yggio tenant** it reads over MCP. This is almost certainly why you are here.
2. The rest of the repo — a `docker compose` stack that runs Claude Code and
   ruflo against a **local** LLM via Ollama. Optional for the demo.

The demo needs **Node 20 or newer and nothing else**. No npm install, no
network, no API keys, no database. The data is committed.

---

## 60 seconds to a working demo

```bash
git clone -b claude/innotrans-seatsense-demo-7edpxk \
  https://github.com/ulrik-s/local-ai-dev
cd local-ai-dev/demo/innotrans-seatsense

node src/selftest.mjs     # must end: "All checks passed - the demo is ready."
claude                    # starts Claude with the fake Yggio already wired in
```

The `-b` matters: the demo lives on that branch. Once it has been merged, a
plain `git clone` is enough — check whether the branch still exists before
passing it on.

Then ask it: **“What data do you have?”**

`demo/innotrans-seatsense/DEMO-SCRIPT.md` is the stage script — twelve
questions, the figure to look for in each answer, and the line to say while the
audience reads it. Work through that before you present.

> Launching `claude` from the **repo root** also works — the root `.mcp.json`
> resolves the server through `${CLAUDE_PROJECT_DIR}`, so it does not care where
> you started from. Launching from the demo directory is still better: a
> `CLAUDE.md` in a subdirectory is only loaded once Claude reads files there, so
> starting at the root means the demo's answering rules are not in context.
> The root `CLAUDE.md` carries the four rules that matter most as a safety net,
> but the full set lives in `demo/innotrans-seatsense/CLAUDE.md`.

---

## What the MCP integration actually is

```
  visitor ──▶ Claude Code ──MCP over stdio──▶ src/mcp-server.mjs ──▶ data/*.json
                                              ("yggio", 14 tools)
```

- `.mcp.json` registers one stdio server named **`yggio`**. That is the whole
  integration — no daemon, no port, no credentials.
- `src/mcp-server.mjs` is **zero-dependency**: the MCP stdio transport is
  newline-delimited JSON-RPC, which is short enough to implement directly.
  Nothing to install means nothing to fail on the stand.
- It exposes **14 tools**. Each one returns pre-aggregated numbers *plus* a
  one-paragraph `narrative`, deliberately: if you run the demo against a small
  local model, a model that only has to *read* a number gets it right far more
  often than one that has to compute it.
- `.claude/settings.json` (committed) pre-approves the `yggio` server via
  `enabledMcpjsonServers` and allowlists its 14 tools, so you should get no
  permission prompts at all. If you do, answer yes — the server only reads
  JSON files inside this repo, opens no network connection and writes nothing.

To see the platform behind Claude on a second screen:

```bash
node src/yggio-api.mjs        # http://localhost:8787, same data as REST
```

---

## The demo in one paragraph, so you can present it

Northbank Rail is a fictional British operator selling **reserved seats: one
ticket per seat, no overselling**. A departure sold to 100% cannot take another
passenger, so in 2025 its morning peak closed sales on 67.5% of weekdays and
refused 31 passengers a weekday — revenue that simply did not happen, and an
airline's overbooking is not available to it. From 1 January 2026 each popular
departure's fare is solved against that day's demand so sales land just below
full and never at the cap, with the departures either side discounted in
proportion. Sold-out peak departures fell to 2.4% and turn-aways to 0.5 a
weekday. It is worth **0.758% of total revenue (£596,914; £904,307 annualised)**
— matching the operator's own business case of 0.75%.

It needs SeatSense because the sold-target is the occupancy target **plus that
departure's own no-show rate**, and ticket data cannot see a no-show: revenue is
booked whether the passenger travels or not. Two departures thirty minutes
apart, sold within a point of each other, travel five points apart.

### Three things not to get wrong on stage

1. Observed revenue is up **2.4%**. The SeatSense figure is **0.758%** — the
   rest is market growth. Quote the small one.
2. **The peak premium earns nothing** (−£3,181). All the money lands on the
   discounted departures either side. If you present this as a peak fare rise
   you have described the opposite of what happened. Ask the demo for
   `two_halves_of_the_policy`.
3. Nothing comes from overselling or from reselling a no-show seat. Both are
   unavailable, and the tools say so themselves.

---

## Changing the story

Everything about the fiction lives in **`src/model.mjs`** — operator, network,
timetable, train formations, no-show rates, the pricing policy and its
parameters. Edit it and regenerate:

```bash
node src/generate.mjs      # rewrites data/*.json, deterministic
node src/selftest.mjs      # always re-check afterwards
```

The two knobs that move the headline are `PRICING_POLICY.maxPremium` and
`ROUTES[*].demandIndex`. Be aware of the tension between them: a bigger premium
clears the peak more completely *and* earns more, so “nobody is ever turned
away” and “0.75% of revenue” pull against each other. `README.md` in the demo
directory explains how they are currently reconciled.

If you change parameters, the figures in `README.md`, `DEMO-SCRIPT.md` and
`CLAUDE.md` will be stale. They are all cross-checked against the data today —
ask Claude to re-verify them rather than trusting them blind.

---

## Where things are

| Path | What it is |
| --- | --- |
| `demo/innotrans-seatsense/DEMO-SCRIPT.md` | The stage script. Read this first. |
| `demo/innotrans-seatsense/README.md` | The full argument, every figure, and what the demo deliberately does *not* claim. |
| `demo/innotrans-seatsense/CLAUDE.md` | How Claude should answer during the demo, including what not to overstate. |
| `demo/innotrans-seatsense/src/model.mjs` | The whole fiction and every tunable parameter. |
| `demo/innotrans-seatsense/src/mcp-server.mjs` | The fake Yggio: 14 tools over MCP stdio. |
| `demo/innotrans-seatsense/src/selftest.mjs` | Pre-flight. Drives the server the way Claude does. |
| `.mcp.json`, `.claude/settings.json` | The whole integration: one stdio server, pre-approved. |
| `CLAUDE.md` (root) | Repo orientation plus the four answering rules, for when Claude starts at the root. |

## Running it inside the Docker stack instead

From the repo root, if you would rather run against a local LLM:

```bash
make demo-check      # pre-flight inside the container
make demo            # Claude + fake Yggio in the container
make demo-yggio      # the REST view on http://localhost:8787
```

Note that a small local model is weaker at choosing the right tool than a
frontier one. The figures are identical either way; the answers are less
polished. `make model-medium` / `make model-large` switch tiers.

---

## Honesty notes worth knowing before someone asks

- Northbank Rail does not exist and every figure is synthetic. Station names are
  real so the network reads as plausible.
- **Cabin factor and ghost seats are 2026-only.** The tools return `null` with
  an explanation for 2025 rather than inventing a baseline. That refusal is a
  good moment in the demo, not a bug.
- The no-oversell constraint is framed contractually — a reservation is a right
  to that seat, and denied boarding triggers passenger-rights obligations — and
  cites no statute. If someone wants the legal basis in their own market, that
  is a conversation, not a slide.
- No sensor price is stored anywhere in the repo. `seatsense_attribution` takes
  a `cost_per_coach_gbp` you supply at the time and computes payback from it.
