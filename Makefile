.PHONY: install uninstall check-prereqs setup-dirs copy-settings copy-mcp export-env make-executable update-shell test-hook verify clean help install-agents install-skills install-commands

# Detect shell config file
SHELL_CONFIG := $(shell \
	if [ -n "$$ZSH_VERSION" ] || [ -f "$$HOME/.zshrc" ]; then \
		echo "$$HOME/.zshrc"; \
	elif [ -f "$$HOME/.bashrc" ]; then \
		echo "$$HOME/.bashrc"; \
	else \
		echo "$$HOME/.profile"; \
	fi)

# Get absolute path to arkadian directory
ARKADIAN_DIR := $(shell pwd)

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "Arkadian Assistant Installation"
	@echo "================================"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

install: check-prereqs setup-dirs generate-env copy-settings-with-env copy-mcp export-env make-executable install-agents install-skills install-commands verify ## Complete installation (one-liner setup)
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✅ Arkadian Assistant Installed!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)IMPORTANT: Restart your terminal or run:$(NC)"
	@echo "  source $(SHELL_CONFIG)"
	@echo ""
	@echo "$(YELLOW)Then restart Claude Code to activate Arkadian.$(NC)"
	@echo ""
	@echo "Test with: make test-hook"

check-prereqs: ## Check for required dependencies
	@echo "$(YELLOW)Checking prerequisites...$(NC)"
	@command -v bun >/dev/null 2>&1 || { echo "$(RED)❌ ERROR: bun is not installed. Install from https://bun.sh$(NC)"; exit 1; }
	@echo "$(GREEN)✓ bun found: $$(bun --version)$(NC)"
	@command -v git >/dev/null 2>&1 || { echo "$(RED)❌ ERROR: git is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✓ git found: $$(git --version | head -1)$(NC)"

setup-dirs: ## Create necessary directories
	@echo "$(YELLOW)Creating directories...$(NC)"
	@mkdir -p $$HOME/.claude
	@echo "$(GREEN)✓ Created ~/.claude/$(NC)"

generate-env: ## Generate .env from user prompts
	@if [ -f ".env" ]; then \
		echo "$(YELLOW)⚠️  .env already exists. To regenerate, delete it first:$(NC)"; \
		echo "  rm .env && make generate-env"; \
	else \
		bash scripts/generate-env.sh; \
	fi

copy-settings-with-env: ## Generate settings.json with all env vars from .env
	@echo "$(YELLOW)Installing settings.json with environment variables...$(NC)"
	@bash scripts/generate-claude-settings.sh

copy-settings: ## Copy settings.json to ~/.claude/ (legacy - use copy-settings-with-env)
	@echo "$(YELLOW)Installing settings.json...$(NC)"
	@if [ -f "$$HOME/.claude/settings.json" ]; then \
		echo "$(YELLOW)⚠️  Backing up existing settings.json to settings.json.backup$(NC)"; \
		cp $$HOME/.claude/settings.json $$HOME/.claude/settings.json.backup; \
	fi
	@# Create settings.json with ARKADIAN_DIR substituted
	@sed "s|ARKADIAN_DIR_PLACEHOLDER|$(ARKADIAN_DIR)|g" .claude-settings.template.json > $$HOME/.claude/settings.json
	@echo "$(GREEN)✓ Installed ~/.claude/settings.json$(NC)"
	@echo "$(GREEN)  ARKADIAN_DIR set to: $(ARKADIAN_DIR)$(NC)"

copy-mcp: ## Configure MCP for browser automation
	@echo "$(YELLOW)Configuring MCP for browser automation...$(NC)"
	@echo "$(GREEN)✓ Skipping .mcp.json installation (deprecated)$(NC)"
	@echo "$(YELLOW)  Using Claude CLI to configure Playwright MCP instead$(NC)"
	claude mcp add --transport stdio playwright --scope user -- bunx @playwright/mcp@latest --extension || true
	@echo "$(GREEN)✓ Playwright MCP configuration attempted$(NC)"

export-env: ## Add ARKADIAN_DIR to shell config
	@echo "$(YELLOW)Configuring environment variables...$(NC)"
	@echo "$(YELLOW)  Shell config: $(SHELL_CONFIG)$(NC)"
	@# Check if ARKADIAN_DIR already exists in shell config
	@if grep -q "export ARKADIAN_DIR=" $(SHELL_CONFIG) 2>/dev/null; then \
		echo "$(YELLOW)⚠️  ARKADIAN_DIR already exists in $(SHELL_CONFIG)$(NC)"; \
		echo "$(YELLOW)  Updating to: $(ARKADIAN_DIR)$(NC)"; \
		sed -i.bak '/export ARKADIAN_DIR=/d' $(SHELL_CONFIG); \
	fi
	@# Add ARKADIAN_DIR export
	@echo "" >> $(SHELL_CONFIG)
	@echo "# Arkadian Assistant Configuration" >> $(SHELL_CONFIG)
	@echo "export ARKADIAN_DIR=\"$(ARKADIAN_DIR)\"" >> $(SHELL_CONFIG)
	@echo "$(GREEN)✓ Added ARKADIAN_DIR to $(SHELL_CONFIG)$(NC)"
	@echo "$(YELLOW)  Run 'source $(SHELL_CONFIG)' to load the variable$(NC)"

make-executable: ## Make hooks executable
	@echo "$(YELLOW)Making hooks executable...$(NC)"
	@chmod +x hooks/*.ts hooks/*.js 2>/dev/null || true
	@echo "$(GREEN)✓ Hooks are now executable$(NC)"

install-agents: ## Install agents to ~/.claude/agents
	@echo "$(YELLOW)Installing agents...$(NC)"
	@./scripts/install-agents.sh
	@echo "$(GREEN)✓ Agents installed$(NC)"

install-skills: ## Install skills to ~/.claude/skills
	@echo "$(YELLOW)Installing skills...$(NC)"
	@./scripts/install-skills.sh
	@echo "$(GREEN)✓ Skills installed$(NC)"

install-commands: ## Install commands to ~/.claude/commands
	@echo "$(YELLOW)Installing commands...$(NC)"
	@./scripts/install-commands.sh
	@echo "$(GREEN)✓ Commands installed$(NC)"

update-shell: ## Source shell config (run in new shell)
	@echo "$(YELLOW)To activate environment variables, run:$(NC)"
	@echo "  source $(SHELL_CONFIG)"

test-hook: ## Test the context loading hook
	@echo "$(YELLOW)Testing hook...$(NC)"
	@echo '{"session_id":"test","prompt":"test arkd","transcript_path":"/tmp/test.json"}' | bun hooks/load-arkadian-context.ts | head -20
	@echo ""
	@echo "$(GREEN)✓ Hook test complete$(NC)"

verify: ## Verify installation
	@echo "$(YELLOW)Verifying installation...$(NC)"
	@# Check settings.json
	@if [ -f "$$HOME/.claude/settings.json" ]; then \
		echo "$(GREEN)✓ Settings file exists (settings.json)$(NC)"; \
	else \
		echo "$(RED)❌ Settings file missing$(NC)"; exit 1; \
	fi
	@# Check ARKADIAN_DIR in settings.json
	@if grep -q "$(ARKADIAN_DIR)" $$HOME/.claude/settings.json; then \
		echo "$(GREEN)✓ ARKADIAN_DIR configured correctly$(NC)"; \
	else \
		echo "$(RED)❌ ARKADIAN_DIR not found in settings file$(NC)"; exit 1; \
	fi
	@# Check hooks
	@if [ -x "hooks/load-arkadian-context.ts" ]; then \
		echo "$(GREEN)✓ Context loading hook is executable$(NC)"; \
	else \
		echo "$(RED)❌ Hook not executable$(NC)"; exit 1; \
	fi
	@# Check agents
	@if [ -d "$$HOME/.claude/agents" ] && [ $$(ls -1 $$HOME/.claude/agents/*.md 2>/dev/null | wc -l) -eq 7 ]; then \
		echo "$(GREEN)✓ 7 agents installed in ~/.claude/agents$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Agents not fully installed (run: make install-agents)$(NC)"; \
	fi
	@# Check skills
	@if [ -d "$$HOME/.claude/skills" ] && [ $$(ls -1d $$HOME/.claude/skills/*/ 2>/dev/null | wc -l) -eq 8 ]; then \
		echo "$(GREEN)✓ 8 skills installed in ~/.claude/skills$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Skills not fully installed (run: make install-skills)$(NC)"; \
	fi
	@# Check commands
	@if [ -d "$$HOME/.claude/commands" ] && [ $$(ls -1 $$HOME/.claude/commands/*.md 2>/dev/null | wc -l) -ge 8 ]; then \
		echo "$(GREEN)✓ $$(ls -1 $$HOME/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ') commands installed in ~/.claude/commands$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Commands not fully installed (run: make install-commands)$(NC)"; \
	fi
	@# Check shell config
	@if grep -q "ARKADIAN_DIR" $(SHELL_CONFIG); then \
		echo "$(GREEN)✓ ARKADIAN_DIR in $(SHELL_CONFIG)$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  ARKADIAN_DIR not in shell config (run: make export-env)$(NC)"; \
	fi

uninstall: ## Remove Arkadian installation
	@echo "$(YELLOW)Uninstalling Arkadian...$(NC)"
	@# Backup settings.json
	@if [ -f "$$HOME/.claude/settings.json" ]; then \
		echo "$(YELLOW)Backing up settings.json...$(NC)"; \
		cp $$HOME/.claude/settings.json $$HOME/.claude/settings.json.pre-uninstall; \
		rm $$HOME/.claude/settings.json; \
		echo "$(GREEN)✓ Removed settings.json (backup saved)$(NC)"; \
	fi
	@# Remove agents
	@if [ -d "$$HOME/.claude/agents" ]; then \
		rm -rf $$HOME/.claude/agents; \
		echo "$(GREEN)✓ Removed agents$(NC)"; \
	fi
	@# Remove skills
	@if [ -d "$$HOME/.claude/skills" ]; then \
		rm -rf $$HOME/.claude/skills; \
		echo "$(GREEN)✓ Removed skills$(NC)"; \
	fi
	@# Remove commands
	@if [ -d "$$HOME/.claude/commands" ]; then \
		rm -rf $$HOME/.claude/commands; \
		echo "$(GREEN)✓ Removed commands$(NC)"; \
	fi
	@# Remove ARKADIAN_DIR from shell config
	@if grep -q "ARKADIAN_DIR" $(SHELL_CONFIG); then \
		sed -i.bak '/# Arkadian Assistant Configuration/d; /export ARKADIAN_DIR=/d' $(SHELL_CONFIG); \
		echo "$(GREEN)✓ Removed ARKADIAN_DIR from $(SHELL_CONFIG)$(NC)"; \
	fi
	@echo "$(GREEN)✓ Uninstall complete$(NC)"
	@echo "$(YELLOW)Restart your terminal to complete uninstall$(NC)"

clean: ## Clean backup files
	@echo "$(YELLOW)Cleaning backup files...$(NC)"
	@rm -f $(SHELL_CONFIG).bak
	@rm -f $$HOME/.claude/settings.json.backup
	@rm -f $$HOME/.claude/settings.json.pre-uninstall
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

status: ## Show installation status
	@echo "Arkadian Installation Status"
	@echo "============================"
	@echo ""
	@echo "$(YELLOW)Prerequisites:$(NC)"
	@command -v bun >/dev/null 2>&1 && echo "$(GREEN)✓ bun: $$(bun --version)$(NC)" || echo "$(RED)✗ bun not installed$(NC)"
	@command -v git >/dev/null 2>&1 && echo "$(GREEN)✓ git: $$(git --version | head -1)$(NC)" || echo "$(RED)✗ git not installed$(NC)"
	@echo ""
	@echo "$(YELLOW)Configuration:$(NC)"
	@echo "  Arkadian directory: $(ARKADIAN_DIR)"
	@echo "  Shell config: $(SHELL_CONFIG)"
	@echo ""
	@echo "$(YELLOW)Installation:$(NC)"
	@[ -f "$$HOME/.claude/settings.json" ] && echo "$(GREEN)✓ settings.json installed$(NC)" || echo "$(RED)✗ settings.json missing$(NC)"
	@grep -q "ARKADIAN_DIR" $(SHELL_CONFIG) 2>/dev/null && echo "$(GREEN)✓ ARKADIAN_DIR in shell config$(NC)" || echo "$(RED)✗ ARKADIAN_DIR not in shell config$(NC)"
	@[ -x "hooks/load-arkadian-context.ts" ] && echo "$(GREEN)✓ Hooks executable$(NC)" || echo "$(RED)✗ Hooks not executable$(NC)"
	@echo ""
	@echo "$(YELLOW)Current ARKADIAN_DIR value:$(NC)"
	@echo "  $$ARKADIAN_DIR"
	@if [ -z "$$ARKADIAN_DIR" ]; then \
		echo "$(YELLOW)  (Not set - restart terminal or run: source $(SHELL_CONFIG))$(NC)"; \
	fi
