# Manas 2026 — App Store / landing-page screenshots.
# Run from apple/screenshots:
#   make           full build + every shot (HU + EN)
#   make fast      regenerate without rebuilding (reuse the installed app)
#   make hu / en   one language, no rebuild
#   make clean     delete generated screenshots
#   make help      list targets

PY := uv run make_screenshots.py

.PHONY: all fast hu en clean help

all: ## Build the apps and generate every screenshot (HU + EN)
	$(PY)

fast: ## Regenerate all shots without rebuilding
	$(PY) --no-build

hu: ## Hungarian shots only, no rebuild
	$(PY) --no-build --lang hu

en: ## English shots only, no rebuild
	$(PY) --no-build --lang en

clean: ## Delete generated hu/ and en/ screenshots
	rm -rf hu en

help: ## List targets
	@grep -hE '^[a-z]+:.*##' $(MAKEFILE_LIST) | sed -E 's/:.*## / — /' | sort
