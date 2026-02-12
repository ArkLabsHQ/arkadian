.PHONY: install uninstall check-prereqs setup-dirs install-data-dir copy-settings export-env make-executable install-arkadian-cmd update-shell test-hook verify clean help install-agents install-skills install-commands

# Detect shell config file based on user's actual SHELL
# Priority: 1) Check $SHELL variable, 2) Fall back to checking files
SHELL_CONFIG := $(shell bash -c '\
	user_shell=$$(basename "$$SHELL" 2>/dev/null); \
	if [ "$$user_shell" = "zsh" ]; then \
		echo "$$HOME/.zshrc"; \
	elif [ "$$user_shell" = "bash" ]; then \
		if [ -f "$$HOME/.bash_profile" ]; then echo "$$HOME/.bash_profile"; \
		elif [ -f "$$HOME/.bashrc" ]; then echo "$$HOME/.bashrc"; \
		else echo "$$HOME/.profile"; fi; \
	elif [ "$$user_shell" = "fish" ]; then \
		echo "$$HOME/.config/fish/config.fish"; \
	elif [ "$$user_shell" = "ksh" ]; then \
		echo "$$HOME/.kshrc"; \
	elif [ -f "$$HOME/.zshrc" ]; then \
		echo "$$HOME/.zshrc"; \
	elif [ -f "$$HOME/.bashrc" ]; then \
		echo "$$HOME/.bashrc"; \
	else \
		echo "$$HOME/.profile"; \
	fi')

# Get absolute path to arkadian directory
ARKADIAN_DIR := $(shell pwd)

# Get OS-specific data directory (~/Library/Application Support/Arkadian on macOS, ~/.arkadian on Linux)
ARKADIAN_DATA_DIR := $(shell bash $(ARKADIAN_DIR)/scripts/get-data-dir.sh)

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

install: check-prereqs setup-dirs install-data-dir generate-env copy-settings-with-env export-env make-executable install-arkadian-cmd install-agents install-skills install-commands verify ## Complete installation (one-liner setup)
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✅ Arkadian Assistant Installed!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@is_fish=$$(echo "$(SHELL_CONFIG)" | grep -q "fish" && echo "yes" || echo "no"); \
	if [ "$$is_fish" = "yes" ]; then \
		echo "$(YELLOW)IMPORTANT: Restart your terminal or run:$(NC)"; \
		echo "  source $(SHELL_CONFIG)"; \
		echo "  $(YELLOW)(or just open a new terminal tab)$(NC)"; \
	else \
		echo "$(YELLOW)IMPORTANT: Restart your terminal or run:$(NC)"; \
		echo "  source $(SHELL_CONFIG)"; \
	fi
	@echo ""
	@echo "$(GREEN)Usage:$(NC)"
	@echo "  $(GREEN)arkadian$(NC)  - Launch with orchestrator mode (recommended)"
	@echo "             Uses --append-system-prompt for strict instruction following"
	@echo ""
	@echo "  $(YELLOW)claude$(NC)    - Standard mode with CLAUDE.md (less strict)"
	@echo "             Instructions may be ignored as 'not relevant'"
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

install-data-dir: ## Create OS-specific data directory for runtime state
	@echo "$(YELLOW)Creating data directory...$(NC)"
	@mkdir -p "$(ARKADIAN_DATA_DIR)"
	@echo "$(GREEN)✓ Created data directory: $(ARKADIAN_DATA_DIR)$(NC)"

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

export-env: ## Add ARKADIAN_DIR and ARKADIAN_DATA_DIR to shell config
	@echo "$(YELLOW)Configuring environment variables...$(NC)"
	@echo "$(YELLOW)  Shell config: $(SHELL_CONFIG)$(NC)"
	@# Remove old entries first (handles both fish and bash/zsh)
	@is_fish=$$(echo "$(SHELL_CONFIG)" | grep -q "fish" && echo "yes" || echo "no"); \
	if [ "$$is_fish" = "yes" ]; then \
		sed -i.bak '/# Arkadian Assistant Configuration/d; /set -gx ARKADIAN_DIR/d; /set -gx ARKADIAN_DATA_DIR/d' $(SHELL_CONFIG) 2>/dev/null || true; \
		mkdir -p $$(dirname $(SHELL_CONFIG)); \
		echo "" >> $(SHELL_CONFIG); \
		echo "# Arkadian Assistant Configuration" >> $(SHELL_CONFIG); \
		echo "set -gx ARKADIAN_DIR \"$(ARKADIAN_DIR)\"" >> $(SHELL_CONFIG); \
		echo "set -gx ARKADIAN_DATA_DIR \"$(ARKADIAN_DATA_DIR)\"" >> $(SHELL_CONFIG); \
	else \
		sed -i.bak '/# Arkadian Assistant Configuration/d; /export ARKADIAN_DIR=/d; /export ARKADIAN_DATA_DIR=/d' $(SHELL_CONFIG) 2>/dev/null || true; \
		echo "" >> $(SHELL_CONFIG); \
		echo "# Arkadian Assistant Configuration" >> $(SHELL_CONFIG); \
		echo "export ARKADIAN_DIR=\"$(ARKADIAN_DIR)\"" >> $(SHELL_CONFIG); \
		echo "export ARKADIAN_DATA_DIR=\"$(ARKADIAN_DATA_DIR)\"" >> $(SHELL_CONFIG); \
	fi
	@echo "$(GREEN)✓ Added ARKADIAN_DIR to $(SHELL_CONFIG)$(NC)"
	@echo "$(GREEN)✓ Added ARKADIAN_DATA_DIR to $(SHELL_CONFIG)$(NC)"
	@echo "$(YELLOW)  Run 'source $(SHELL_CONFIG)' to load the variables$(NC)"

make-executable: ## Make hooks executable
	@echo "$(YELLOW)Making hooks executable...$(NC)"
	@chmod +x hooks/*.ts hooks/*.js 2>/dev/null || true
	@echo "$(GREEN)✓ Hooks are now executable$(NC)"

install-arkadian-cmd: ## Install 'arkadian' command to ~/bin (uses --append-system-prompt)
	@echo "$(YELLOW)Installing arkadian command...$(NC)"
	@mkdir -p $$HOME/bin
	@cp scripts/arkadian $$HOME/bin/arkadian
	@chmod +x $$HOME/bin/arkadian
	@# Add ~/bin to PATH if not already there (handle fish shell separately)
	@is_fish=$$(echo "$(SHELL_CONFIG)" | grep -q "fish" && echo "yes" || echo "no"); \
	if ! echo "$$PATH" | grep -q "$$HOME/bin"; then \
		if [ "$$is_fish" = "yes" ]; then \
			if ! grep -q 'fish_add_path.*bin' $(SHELL_CONFIG) 2>/dev/null && ! grep -q 'set.*PATH.*bin' $(SHELL_CONFIG) 2>/dev/null; then \
				echo 'fish_add_path $$HOME/bin' >> $(SHELL_CONFIG); \
				echo "$(YELLOW)  Added ~/bin to PATH in $(SHELL_CONFIG)$(NC)"; \
			fi; \
		else \
			if ! grep -q 'export PATH="$$HOME/bin:$$PATH"' $(SHELL_CONFIG) 2>/dev/null; then \
				echo 'export PATH="$$HOME/bin:$$PATH"' >> $(SHELL_CONFIG); \
				echo "$(YELLOW)  Added ~/bin to PATH in $(SHELL_CONFIG)$(NC)"; \
			fi; \
		fi; \
	fi
	@echo "$(GREEN)✓ Installed 'arkadian' command to ~/bin/arkadian$(NC)"
	@echo "$(YELLOW)  Usage: arkadian (instead of claude) for orchestrator mode$(NC)"

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
	@is_fish=$$(echo "$(SHELL_CONFIG)" | grep -q "fish" && echo "yes" || echo "no"); \
	if [ "$$is_fish" = "yes" ]; then \
		echo "$(YELLOW)(or just open a new terminal tab)$(NC)"; \
	fi

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
	@# Check arkadian command (uses --append-system-prompt for strict instruction following)
	@if [ -x "$$HOME/bin/arkadian" ]; then \
		echo "$(GREEN)✓ 'arkadian' command installed (uses --append-system-prompt)$(NC)"; \
	else \
		echo "$(RED)❌ 'arkadian' command not installed (run: make install-arkadian-cmd)$(NC)"; exit 1; \
	fi
	@# Warn if CLAUDE.md symlink exists (deprecated)
	@if [ -L "$$HOME/.claude/CLAUDE.md" ]; then \
		LINK_TARGET=$$(readlink $$HOME/.claude/CLAUDE.md); \
		if echo "$$LINK_TARGET" | grep -q "arkadian"; then \
			echo "$(YELLOW)⚠️  Old CLAUDE.md symlink exists - run: rm ~/.claude/CLAUDE.md$(NC)"; \
		fi; \
	fi
	@# Check hooks
	@if [ -x "hooks/user-submit-reminder.ts" ]; then \
		echo "$(GREEN)✓ User submit reminder hook is executable$(NC)"; \
	else \
		echo "$(RED)❌ Hook not executable$(NC)"; exit 1; \
	fi
	@# Check agents - compare installed count with source count
	@SOURCE_AGENTS=$$(ls -1 $(ARKADIAN_DIR)/agents/*.md 2>/dev/null | wc -l | tr -d ' '); \
	INSTALLED_AGENTS=$$(ls -1 $$HOME/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' '); \
	if [ "$$INSTALLED_AGENTS" -eq "$$SOURCE_AGENTS" ] && [ "$$INSTALLED_AGENTS" -gt 0 ]; then \
		echo "$(GREEN)✓ $$INSTALLED_AGENTS agents installed in ~/.claude/agents$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Agents not fully installed ($$INSTALLED_AGENTS/$$SOURCE_AGENTS) - run: make install-agents$(NC)"; \
	fi
	@# Check skills - compare installed count with source count
	@SOURCE_SKILLS=$$(ls -1d $(ARKADIAN_DIR)/skills/*/ 2>/dev/null | wc -l | tr -d ' '); \
	INSTALLED_SKILLS=$$(ls -1d $$HOME/.claude/skills/*/ 2>/dev/null | wc -l | tr -d ' '); \
	if [ "$$INSTALLED_SKILLS" -eq "$$SOURCE_SKILLS" ] && [ "$$INSTALLED_SKILLS" -gt 0 ]; then \
		echo "$(GREEN)✓ $$INSTALLED_SKILLS skills installed in ~/.claude/skills$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Skills not fully installed ($$INSTALLED_SKILLS/$$SOURCE_SKILLS) - run: make install-skills$(NC)"; \
	fi
	@# Check commands
	@if [ -d "$$HOME/.claude/commands" ] && [ $$(ls -1 $$HOME/.claude/commands/*.md 2>/dev/null | wc -l) -ge 8 ]; then \
		echo "$(GREEN)✓ $$(ls -1 $$HOME/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ') commands installed in ~/.claude/commands$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Commands not fully installed (run: make install-commands)$(NC)"; \
	fi
	@# Check shell config (handles both fish and bash/zsh syntax)
	@if grep -q "ARKADIAN_DIR" $(SHELL_CONFIG) 2>/dev/null; then \
		echo "$(GREEN)✓ ARKADIAN_DIR in $(SHELL_CONFIG)$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  ARKADIAN_DIR not in shell config (run: make export-env)$(NC)"; \
	fi
	@if grep -q "ARKADIAN_DATA_DIR" $(SHELL_CONFIG) 2>/dev/null; then \
		echo "$(GREEN)✓ ARKADIAN_DATA_DIR in $(SHELL_CONFIG)$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  ARKADIAN_DATA_DIR not in shell config (run: make export-env)$(NC)"; \
	fi
	@# Check data directory exists
	@if [ -d "$(ARKADIAN_DATA_DIR)" ]; then \
		echo "$(GREEN)✓ Data directory exists: $(ARKADIAN_DATA_DIR)$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Data directory missing (run: make install-data-dir)$(NC)"; \
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
	@# Remove CLAUDE.md (orchestrator)
	@if [ -f "$$HOME/.claude/CLAUDE.md" ]; then \
		if grep -q "Arkadian Orchestrator" $$HOME/.claude/CLAUDE.md; then \
			cp $$HOME/.claude/CLAUDE.md $$HOME/.claude/CLAUDE.md.pre-uninstall; \
			rm $$HOME/.claude/CLAUDE.md; \
			echo "$(GREEN)✓ Removed CLAUDE.md (backup saved)$(NC)"; \
		else \
			echo "$(YELLOW)⚠️  CLAUDE.md exists but is not Arkadian - skipping$(NC)"; \
		fi; \
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
	@# Remove ARKADIAN_DIR and ARKADIAN_DATA_DIR from shell config (handle fish shell separately)
	@is_fish=$$(echo "$(SHELL_CONFIG)" | grep -q "fish" && echo "yes" || echo "no"); \
	if grep -q "ARKADIAN_DIR" $(SHELL_CONFIG); then \
		if [ "$$is_fish" = "yes" ]; then \
			sed -i.bak '/# Arkadian Assistant Configuration/d; /set -gx ARKADIAN_DIR/d; /set -gx ARKADIAN_DATA_DIR/d' $(SHELL_CONFIG); \
		else \
			sed -i.bak '/# Arkadian Assistant Configuration/d; /export ARKADIAN_DIR=/d; /export ARKADIAN_DATA_DIR=/d' $(SHELL_CONFIG); \
		fi; \
		echo "$(GREEN)✓ Removed ARKADIAN_DIR from $(SHELL_CONFIG)$(NC)"; \
		echo "$(GREEN)✓ Removed ARKADIAN_DATA_DIR from $(SHELL_CONFIG)$(NC)"; \
	fi
	@# Note: Data directory at $(ARKADIAN_DATA_DIR) is preserved (may contain user data)
	@echo "$(YELLOW)ℹ️  Data directory preserved: $(ARKADIAN_DATA_DIR)$(NC)"
	@echo "$(YELLOW)   To remove manually: rm -rf \"$(ARKADIAN_DATA_DIR)\"$(NC)"
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
	@echo "  Data directory: $(ARKADIAN_DATA_DIR)"
	@echo "  Shell config: $(SHELL_CONFIG)"
	@echo ""
	@echo "$(YELLOW)Installation:$(NC)"
	@[ -f "$$HOME/.claude/settings.json" ] && echo "$(GREEN)✓ settings.json installed$(NC)" || echo "$(RED)✗ settings.json missing$(NC)"
	@[ -d "$(ARKADIAN_DATA_DIR)" ] && echo "$(GREEN)✓ Data directory exists$(NC)" || echo "$(RED)✗ Data directory missing$(NC)"
	@grep -q "ARKADIAN_DIR" $(SHELL_CONFIG) 2>/dev/null && echo "$(GREEN)✓ ARKADIAN_DIR in shell config$(NC)" || echo "$(RED)✗ ARKADIAN_DIR not in shell config$(NC)"
	@grep -q "ARKADIAN_DATA_DIR" $(SHELL_CONFIG) 2>/dev/null && echo "$(GREEN)✓ ARKADIAN_DATA_DIR in shell config$(NC)" || echo "$(RED)✗ ARKADIAN_DATA_DIR not in shell config$(NC)"
	@[ -x "hooks/load-arkadian-context.ts" ] && echo "$(GREEN)✓ Hooks executable$(NC)" || echo "$(RED)✗ Hooks not executable$(NC)"
	@echo ""
	@echo "$(YELLOW)Current Environment:$(NC)"
	@echo "  ARKADIAN_DIR=$$ARKADIAN_DIR"
	@echo "  ARKADIAN_DATA_DIR=$$ARKADIAN_DATA_DIR"
	@if [ -z "$$ARKADIAN_DIR" ] || [ -z "$$ARKADIAN_DATA_DIR" ]; then \
		echo "$(YELLOW)  (Some vars not set - restart terminal or run: source $(SHELL_CONFIG))$(NC)"; \
	fi
