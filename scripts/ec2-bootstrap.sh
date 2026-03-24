#!/usr/bin/env bash
#
# ec2-bootstrap.sh — Full Arkadian setup for a fresh EC2 instance
#
# Installs all prerequisites, clones all repos from .env.example GitHub URLs,
# generates .env with correct local paths, and runs make install.
#
# Usage:
#   export ANTHROPIC_API_KEY="sk-ant-..."
#   bash scripts/ec2-bootstrap.sh
#

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$HOME/arkadian_repos}"
ENV_EXAMPLE="$ARKADIAN_DIR/.env.example"
ENV_FILE="$ARKADIAN_DIR/.env"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { printf "${GREEN}[bootstrap]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[bootstrap]${NC} %s\n" "$1"; }
fail() { printf "${RED}[bootstrap]${NC} %s\n" "$1"; exit 1; }

log "Arkadian EC2 Bootstrap"
log "Repos will be cloned to: $REPOS_DIR"
echo ""

# ── Step 1: System packages ──────────────────────────────────────
log "Step 1: System packages"

if command -v apt-get &>/dev/null; then
  PKG="apt"
  sudo apt-get update -qq
elif command -v dnf &>/dev/null; then
  PKG="dnf"
elif command -v yum &>/dev/null; then
  PKG="yum"
else
  fail "No supported package manager found (need apt, dnf, or yum)"
fi

sudo $PKG install -y git curl unzip make jq
log "✓ git, curl, unzip, make, jq"
echo ""

# ── Step 2: Runtimes ─────────────────────────────────────────────
log "Step 2: Runtimes"

# Node.js
if command -v node &>/dev/null; then
  log "✓ Node.js: $(node --version)"
else
  log "Installing Node.js via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install --lts
  log "✓ Node.js $(node --version)"
fi

# Bun
if command -v bun &>/dev/null; then
  log "✓ Bun: $(bun --version)"
else
  log "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  log "✓ Bun $(bun --version)"
fi

# Go
if command -v go &>/dev/null; then
  log "✓ Go: $(go version)"
else
  log "Installing Go..."
  GO_VERSION=$(curl -s https://go.dev/VERSION?m=text | head -1)
  curl -fsSL "https://go.dev/dl/${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz
  export PATH="/usr/local/go/bin:$HOME/go/bin:$PATH"
  SHELL_RC="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"
  if ! grep -q '/usr/local/go/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="/usr/local/go/bin:$HOME/go/bin:$PATH"' >> "$SHELL_RC"
  fi
  log "✓ Go $(go version)"
fi
echo ""

# ── Step 3: Docker ────────────────────────────────────────────────
log "Step 3: Docker"

if command -v docker &>/dev/null; then
  log "✓ Docker: $(docker --version)"
else
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  log "✓ Docker $(docker --version)"
  warn "Log out and back in for docker group to take effect (or run: newgrp docker)"
fi

if docker compose version &>/dev/null 2>&1; then
  log "✓ Docker Compose: $(docker compose version --short)"
else
  log "Installing Docker Compose plugin..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
  sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  log "✓ Docker Compose $(docker compose version --short)"
fi
echo ""

# ── Step 4: CLI tools ─────────────────────────────────────────────
log "Step 4: CLI tools"

# GitHub CLI
if command -v gh &>/dev/null; then
  log "✓ GitHub CLI: $(gh --version | head -1)"
else
  log "Installing GitHub CLI..."
  if [ "$PKG" = "apt" ]; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update -qq && sudo apt-get install -y -qq gh
  else
    sudo $PKG install -y gh 2>/dev/null || warn "Could not install gh — progress tracking will be limited"
  fi
  command -v gh &>/dev/null && log "✓ GitHub CLI $(gh --version | head -1)"
fi

# Claude Code CLI
if command -v claude &>/dev/null; then
  log "✓ Claude Code CLI installed"
else
  log "Installing Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code
  log "✓ Claude Code CLI installed"
fi
echo ""

# ── Step 5: Clone repos from .env.example GitHub URLs ────────────
log "Step 5: Cloning repositories to $REPOS_DIR"
mkdir -p "$REPOS_DIR"

if [ ! -f "$ENV_EXAMPLE" ]; then
  fail ".env.example not found at $ENV_EXAMPLE"
fi

# Parse _GITHUB entries and clone each repo
# Map: GITHUB var name → REPO var name → clone URL → local dir name
declare -A GITHUB_TO_REPO=(
  ["ARKD_GITHUB"]="ARKD_REPO"
  ["GO_SDK_GITHUB"]="GO_SDK_REPO"
  ["WALLET_GITHUB"]="WALLET_REPO"
  ["TS_SDK_GITHUB"]="TS_SDK_REPO"
  ["RUST_SDK_GITHUB"]="RUST_SDK_REPO"
  ["DOTNET_SDK_GITHUB"]="DOTNET_SDK_REPO"
  ["FULMINE_GITHUB"]="FULMINE_REPO"
  ["ARK_FAUCET_GITHUB"]="ARK_FAUCET_REPO"
  ["BOLTZ_BACKEND_GITHUB"]="BOLTZ_BACKEND_REPO"
  ["BOLTZ_SWAP_GITHUB"]="BOLTZ_SWAP_REPO"
  ["COMPILER_GITHUB"]="COMPILER_REPO"
  ["INTROSPECTOR_GITHUB"]="INTROSPECTOR_REPO"
  ["ARKADE_ESCROW_GITHUB"]="ARKADE_ESCROW_REPO"
  ["ARKADE_EXPLORER_GITHUB"]="ARKADE_EXPLORER_REPO"
  ["ARKADE_ASSETS_GITHUB"]="ARKADE_ASSETS_REPO"
  ["ARK_SIMULATOR_GITHUB"]="ARK_SIMULATOR_REPO"
  ["ARK_TELEMETRY_GITHUB"]="ARK_TELEMETRY_REPO"
  ["ARK_INFRA_GITHUB"]="ARK_INFRA_REPO"
  ["KMS_UNLOCKER_GITHUB"]="KMS_UNLOCKER_REPO"
  ["ARK_DOCS_GITHUB"]="ARK_DOCS_REPO"
)

# Read all _GITHUB values from .env.example
declare -A GITHUB_URLS=()
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  if [[ "$key" == *_GITHUB ]]; then
    GITHUB_URLS["$key"]="$value"
  fi
done < "$ENV_EXAMPLE"

# Clone each repo
CLONED_REPOS=()
FAILED_REPOS=()

for github_var in "${!GITHUB_URLS[@]}"; do
  org_repo="${GITHUB_URLS[$github_var]}"
  repo_name="${org_repo##*/}"  # e.g., "ark" from "arkade-os/ark"
  clone_dir="$REPOS_DIR/$repo_name"
  clone_url="https://github.com/${org_repo}.git"

  if [ -d "$clone_dir/.git" ]; then
    log "  ✓ $repo_name (already cloned)"
    CLONED_REPOS+=("$github_var")
  else
    if git clone --quiet "$clone_url" "$clone_dir" 2>/dev/null; then
      log "  ✓ $repo_name (cloned from $org_repo)"
      CLONED_REPOS+=("$github_var")
    else
      warn "  ✗ $repo_name (failed — may be private, skipping)"
      FAILED_REPOS+=("$github_var")
    fi
  fi
done

echo ""
log "Cloned ${#CLONED_REPOS[@]} repos, ${#FAILED_REPOS[@]} skipped"
echo ""

# ── Step 6: Generate .env ────────────────────────────────────────
log "Step 6: Generating .env"

DATA_DIR=$("$ARKADIAN_DIR/scripts/get-data-dir.sh")

cat > "$ENV_FILE" << EOF
# Arkadian Environment Variables
# Generated by ec2-bootstrap.sh on $(date)

ARKADIAN_DIR=$ARKADIAN_DIR
ARKADIAN_DATA_DIR=$DATA_DIR
EOF

# Write _REPO entries for each successfully cloned repo
for github_var in "${!GITHUB_URLS[@]}"; do
  repo_var="${GITHUB_TO_REPO[$github_var]:-}"
  [ -z "$repo_var" ] && continue

  org_repo="${GITHUB_URLS[$github_var]}"
  repo_name="${org_repo##*/}"
  clone_dir="$REPOS_DIR/$repo_name"

  if [ -d "$clone_dir/.git" ]; then
    echo "$repo_var=$clone_dir" >> "$ENV_FILE"
  fi
done

# Write all _GITHUB entries
echo "" >> "$ENV_FILE"
echo "# GitHub repository URLs (for progress tracking)" >> "$ENV_FILE"
for github_var in "${!GITHUB_URLS[@]}"; do
  echo "$github_var=${GITHUB_URLS[$github_var]}" >> "$ENV_FILE"
done

log "✓ Generated $ENV_FILE"
echo ""

# ── Step 7: Run make install (skip generate-env — .env already exists) ─
log "Step 7: Running make install"
echo ""

cd "$ARKADIAN_DIR"
make check-prereqs setup-dirs install-data-dir copy-settings-with-env export-env make-executable install-arkadian-cmd install-agents install-skills install-commands verify

# ── Step 8: API key check ────────────────────────────────────────
echo ""
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  log "✓ ANTHROPIC_API_KEY is set"
  # Persist in shell config
  SHELL_RC="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"
  if ! grep -q "ANTHROPIC_API_KEY" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Anthropic API key for Claude Code" >> "$SHELL_RC"
    echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> "$SHELL_RC"
    log "  Persisted to $SHELL_RC"
  fi
else
  warn "ANTHROPIC_API_KEY is NOT set — export it before running arkadian"
fi

# ── Done ──────────────────────────────────────────────────────────
echo ""
log "=========================================="
log "Arkadian fully installed!"
log "=========================================="
echo ""
echo "  Repos:    $REPOS_DIR"
echo "  Arkadian: $ARKADIAN_DIR"
echo "  .env:     $ENV_FILE"
echo ""
echo "  Reload shell:  source ~/.bashrc"
echo "  Test:          arkadian \"How does round finalization work?\""
echo "  Detached:      arkadian -d \"Fix VTXO expiry in fulmine\""
echo ""

if [ ${#FAILED_REPOS[@]} -gt 0 ]; then
  warn "Some repos failed to clone (likely private). To add them later:"
  for github_var in "${FAILED_REPOS[@]}"; do
    org_repo="${GITHUB_URLS[$github_var]}"
    repo_name="${org_repo##*/}"
    echo "  git clone git@github.com:${org_repo}.git $REPOS_DIR/$repo_name"
  done
  echo ""
  echo "  Then: vim .env  # add the _REPO path"
  echo "        make copy-settings-with-env"
fi
