SHELL := /bin/bash
COMPOSE := docker compose
ENV_FILE := .env

SMALL_MODEL  := llama3.2:3b
MEDIUM_MODEL := qwen2.5-coder:7b
LARGE_MODEL  := qwen2.5-coder:32b

.DEFAULT_GOAL := help

.PHONY: help up down restart build rebuild status logs ollama-logs litellm-logs \
        shell claude ruflo pull-models clean nuke \
        model-small model-medium model-large model-show _set-model

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} \
	     /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Model tiers:"
	@echo "  small  = $(SMALL_MODEL)"
	@echo "  medium = $(MEDIUM_MODEL)"
	@echo "  large  = $(LARGE_MODEL)"
	@echo ""

$(ENV_FILE):
	@cp .env.example $(ENV_FILE)
	@echo ">> created $(ENV_FILE) from .env.example"

up: $(ENV_FILE) ## Start ollama + litellm and pre-pull the configured model
	$(COMPOSE) up -d ollama litellm
	$(COMPOSE) run --rm ollama-pull

down: ## Stop all services (volumes preserved)
	$(COMPOSE) down

restart: ## Restart background services
	$(COMPOSE) restart ollama litellm

build: ## Build the ruflo image
	$(COMPOSE) build ruflo

rebuild: ## Rebuild the ruflo image without cache
	$(COMPOSE) build --no-cache ruflo

status: ## Show running services
	$(COMPOSE) ps

logs: ## Tail all service logs
	$(COMPOSE) logs -f

ollama-logs: ## Tail ollama logs only
	$(COMPOSE) logs -f ollama

litellm-logs: ## Tail litellm logs only
	$(COMPOSE) logs -f litellm

shell: $(ENV_FILE) ## Drop into the ruflo container TTY
	$(COMPOSE) run --rm ruflo

claude: $(ENV_FILE) ## Launch Claude Code inside the ruflo container
	$(COMPOSE) run --rm ruflo claude

ruflo: $(ENV_FILE) ## Run a ruflo command, e.g. `make ruflo ARGS="--help"`
	$(COMPOSE) run --rm ruflo ruflo $(ARGS)

pull-models: $(ENV_FILE) ## Re-run the model pull step
	$(COMPOSE) run --rm ollama-pull

clean: ## Stop services and remove containers (volumes preserved)
	$(COMPOSE) down --remove-orphans

nuke: ## Stop services and DELETE all volumes (models + ruflo home)
	$(COMPOSE) down -v --remove-orphans

# ---------------- model tier switching ----------------

model-show: $(ENV_FILE) ## Show the currently selected model
	@grep -E '^(MODELS|RUFLO_DEFAULT_MODEL|LITELLM_MODEL)=' $(ENV_FILE)

model-small:  MODEL := $(SMALL_MODEL)
model-small:  _set-model ## Switch to the small tier (llama3.2:3b)

model-medium: MODEL := $(MEDIUM_MODEL)
model-medium: _set-model ## Switch to the medium tier (qwen2.5-coder:7b)

model-large:  MODEL := $(LARGE_MODEL)
model-large:  _set-model ## Switch to the large tier (qwen2.5-coder:32b)

_set-model: $(ENV_FILE)
	@echo ">> switching to $(MODEL)"
	@sed -i.bak -E 's|^MODELS=.*|MODELS=$(MODEL)|'                       $(ENV_FILE)
	@sed -i.bak -E 's|^RUFLO_DEFAULT_MODEL=.*|RUFLO_DEFAULT_MODEL=$(MODEL)|' $(ENV_FILE)
	@sed -i.bak -E 's|^LITELLM_MODEL=.*|LITELLM_MODEL=ollama_chat/$(MODEL)|' $(ENV_FILE)
	@rm -f $(ENV_FILE).bak
	@$(COMPOSE) run --rm ollama-pull
	@$(COMPOSE) up -d --force-recreate litellm
	@echo ">> active model: $(MODEL)"
