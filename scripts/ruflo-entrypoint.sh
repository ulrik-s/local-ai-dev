#!/usr/bin/env bash
set -e

cat <<EOF
================================================================
  ruflo local AI dev environment
================================================================
  Ollama       : ${OLLAMA_HOST}
  Claude Code  : routed via LiteLLM (${ANTHROPIC_BASE_URL}) -> Ollama
  Workspace    : /workspace  (mounted from your host CWD)
  Default model: ${RUFLO_DEFAULT_MODEL}

  CLIs ready:
    ruflo      - agent orchestration platform
    claude     - Claude Code (talks to local LLM)

  Quick start:
    ruflo --help
    ruflo init wizard     # first-time setup inside /workspace
    claude                # interactive coding session

================================================================
EOF

exec "$@"
