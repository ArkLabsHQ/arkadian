.PHONY: install uninstall check-prereqs setup-dirs copy-settings export-env make-executable update-shell test-hook verify clean help

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

install: check-prereqs setup-dirs copy-settings export-env make-executable verify ## Complete installation (one-liner setup)
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

copy-settings: ## Copy settings.json to ~/.claude/
	@echo "$(YELLOW)Installing settings.json...$(NC)"
	@if [ -f "$$HOME/.claude/settings.json" ]; then \
		echo "$(YELLOW)⚠️  Backing up existing settings.json to settings.json.backup$(NC)"; \
		cp $$HOME/.claude/settings.json $$HOME/.claude/settings.json.backup; \
	fi
	@# Create settings.json with ARKADIAN_DIR substituted
	@sed "s|ARKADIAN_DIR_PLACEHOLDER|$(ARKADIAN_DIR)|g" .claude-settings.template.json > $$HOME/.claude/settings.json
	@echo "$(GREEN)✓ Installed ~/.claude/settings.json$(NC)"
	@echo "$(GREEN)  ARKADIAN_DIR set to: $(ARKADIAN_DIR)$(NC)"

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
		echo "$(GREEN)✓ Settings file exists$(NC)"; \
	else \
		echo "$(RED)❌ Settings file missing$(NC)"; exit 1; \
	fi
	@# Check ARKADIAN_DIR in settings.json
	@if grep -q "$(ARKADIAN_DIR)" $$HOME/.claude/settings.json; then \
		echo "$(GREEN)✓ ARKADIAN_DIR configured correctly$(NC)"; \
	else \
		echo "$(RED)❌ ARKADIAN_DIR not found in settings.json$(NC)"; exit 1; \
	fi
	@# Check hooks
	@if [ -x "hooks/load-arkadian-context.ts" ]; then \
		echo "$(GREEN)✓ Context loading hook is executable$(NC)"; \
	else \
		echo "$(RED)❌ Hook not executable$(NC)"; exit 1; \
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
