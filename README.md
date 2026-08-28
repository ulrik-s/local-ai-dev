# local-ai-dev

A `docker compose` stack that gives you [**ruflo**](https://github.com/ruvnet/ruflo)
(agent orchestration) plus [**Claude Code**](https://github.com/anthropics/claude-code),
both pointed at a **local LLM via Ollama** — with nothing installed on your host
except Docker, `make`, and (optionally on Mac) Ollama itself for Metal
acceleration.

You don't need ruflo, Node, npm, or claude-code installed locally. Everything
runs inside the `ruflo` container; `make shell` drops you into it.

---

## Prerequisites

| Platform              | Required                                            |
| --------------------- | --------------------------------------------------- |
| **Linux**             | Docker + `docker compose` v2 + `make`               |
| **Mac (recommended)** | Docker Desktop + `make` + `brew install ollama`     |
| **Mac (alternative)** | Docker Desktop + `make` only — CPU-only, no Metal   |

> **Mac note:** Docker Desktop cannot pass the Metal GPU into containers.
> For real performance on Apple Silicon, run Ollama natively on the host
> (`brew install ollama && ollama serve`) and use the `MAC=1` mode below.

---

## Quick start

### Linux (everything in Docker)

```bash
make up                 # boot ollama + litellm, pre-pull the model
make shell              # drop into the ruflo container TTY
```

### Mac (native Ollama for Metal acceleration)

```bash
brew install ollama
ollama serve &          # or launch the Ollama.app

make up-mac-native      # pulls model into host Ollama, starts LiteLLM in Docker
make shell MAC=1        # drop into the ruflo container TTY
```

**First boot pulls ~4.7 GB of model weights — be patient. Subsequent boots
are seconds.**

---

## Daily usage

Inside the `ruflo` shell:

```bash
ruflo --help
ruflo init wizard       # first-time setup in a new /workspace
claude                  # Claude Code, routed to local Ollama
exit                    # back to the host
```

`/workspace` inside the container is bind-mounted to the directory where you
ran `make` from, so file edits persist on the host.

---

## Demo: InnoTrans SeatSense

`demo/innotrans-seatsense/` is a self-contained trade-show demo built on this
stack: a visitor asks Claude questions in plain English, and Claude reads a
**fake Yggio tenant** over MCP to answer with real figures from generated JSON.
The story is what SeatSense - measuring whether a seat is *physically occupied*
- earned a (fictional) British train operator.

```bash
make demo-check      # pre-flight: calls all 12 fake-Yggio tools, prints OK per tool
make demo            # Claude + fake Yggio, ready for questions
make demo-yggio      # optional: the same data as REST on http://localhost:8787
make demo-data       # regenerate the dataset
```

It needs nothing but Node 20+, so it also runs without Docker:

```bash
cd demo/innotrans-seatsense && node src/selftest.mjs && claude
```

See `demo/innotrans-seatsense/README.md` for the data model and
`DEMO-SCRIPT.md` for the stage script.

---

## Switching model tiers

| Tier   | Model                  | Size    | Notes                          |
| ------ | ---------------------- | ------- | ------------------------------ |
| small  | `llama3.2:3b`          | ~2 GB   | Fast on CPU, general-purpose   |
| medium | `qwen2.5-coder:7b`     | ~4.7 GB | Default, good coding balance   |
| large  | `qwen2.5-coder:32b`    | ~20 GB  | Strong coding, slow on CPU     |

```bash
# Linux
make model-small
make model-medium
make model-large
make model-show

# Mac-native — append MAC=1
make model-small MAC=1
```

Switching pulls the new model, rewrites `.env`, and force-recreates LiteLLM
so the next `make shell` uses it.

---

## All Make targets

Run `make help` to see them all. Highlights:

```
make up              # Linux: start ollama + litellm, pull model
make up-mac-native   # Mac:   use native host Ollama, start litellm only
make shell           # enter ruflo container shell  (add MAC=1 on Mac)
make claude          # launch Claude Code directly  (add MAC=1 on Mac)
make ruflo ARGS=...  # run an arbitrary ruflo command
make status          # docker compose ps
make logs            # tail all logs
make down            # stop containers, keep volumes
make clean           # stop and remove containers, keep volumes
make nuke            # stop and remove ALL volumes (including models)
make model-show      # print currently selected model
```

> Anything that talks to compose accepts `MAC=1` to layer in the
> `docker-compose.mac-native.yml` override.

---

## How it fits together

```
            ┌──────────────────────────────────────────────┐
            │  Docker                                      │
            │                                              │
HOST ───────┤   ┌──────────┐    Anthropic    ┌───────────┐ │
            │   │ litellm  │  ◀── proto ──▶  │  ruflo    │ │
            │   │  :4000   │                 │  container│ │
            │   └────┬─────┘                 │ - ruflo   │ │
            │        │                       │ - claude  │ │
            │        │ Ollama proto          │ /workspace│ │
            │        ▼                       └───────────┘ │
            └────────┼──────────────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────┐
         │  Ollama (:11434)    │
         │                     │
         │  Linux: container   │
         │  Mac:   host native │
         │         (Metal)     │
         └─────────────────────┘
```

- **LiteLLM** speaks Anthropic's `/v1/messages` API on the outside and
  translates to Ollama on the inside. Claude Code thinks it's hitting
  Anthropic; it's actually hitting your local model.
- **ruflo container** has `ANTHROPIC_BASE_URL=http://litellm:4000` baked in,
  plus `OLLAMA_HOST` pointing directly at Ollama for ruflo's own
  local-model features (memory, embeddings).
- **Mac override** (`docker-compose.mac-native.yml`) disables the `ollama`
  service in compose and re-points everything at
  `host.docker.internal:11434`.

---

## Configuration

Anything you might want to tweak lives in `.env` (created from
`.env.example` on first run):

```bash
MODELS=qwen2.5-coder:7b                       # space-separated, pre-pulled on `make up`
RUFLO_DEFAULT_MODEL=qwen2.5-coder:7b           # passed to ruflo as its default
LITELLM_MODEL=ollama_chat/qwen2.5-coder:7b     # what LiteLLM routes Anthropic calls to
```

The `make model-{small,medium,large}` targets rewrite all three keys
atomically; you usually shouldn't need to edit `.env` by hand.

---

## Troubleshooting

**"UID 1000 is not unique" during build** — fixed in `c2c0cdf`. Make sure
your checkout is current; the container reuses the base image's existing
`node` user.

**`make up-mac-native` says Ollama isn't running** — start it with
`ollama serve &` or open the Ollama.app. Verify with
`curl http://localhost:11434/api/tags`.

**LiteLLM returns "model not found"** — `make litellm-logs` will show what
model name it tried to route to. The `os.environ/LITELLM_MODEL` substitution
needs `LITELLM_MODEL` set in `.env`; `make model-medium` re-writes it.

**Model is unbearably slow** — you're on CPU. On Apple Silicon, switch to
`make up-mac-native` for Metal. On Linux without an NVIDIA GPU, drop to
`make model-small` (llama3.2:3b).

**Need to start over completely** — `make nuke` removes all volumes,
including the multi-GB model cache. Next `make up` will re-pull.

---

## What about ruflo I already have on my host?

You don't need it. The container has its own ruflo CLI with all the
right env vars (`OLLAMA_HOST`, `ANTHROPIC_BASE_URL`, etc.) baked in.
A host-installed ruflo won't see those settings and will try to talk to
real Anthropic, which is the opposite of what this stack is for.

Either ignore it or uninstall:

```bash
which ruflo
npm uninstall -g ruflo        # if installed via npm
```
