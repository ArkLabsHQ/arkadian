#!/usr/bin/env bash
# Generate .env file with Ark repository paths
#
# Behavior:
#   - If .env exists with repo paths configured → skip (idempotent for re-installs)
#   - If .env is missing or incomplete → offer to clone repos automatically
#   - Clones to ARKADIAN_DATA_DIR/repos/ (OS-specific data dir)
#   - Falls back to manual path prompts if user declines cloning

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ARKADIAN_DIR/.env"
ENV_EXAMPLE="$ARKADIAN_DIR/.env.example"
ARKADIAN_DATA_DIR=$("$SCRIPT_DIR/get-data-dir.sh")
REPOS_DIR="$ARKADIAN_DATA_DIR/repos"

# ── Check if already configured ──────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  # Check if at least the 3 required repos are configured with valid paths
  has_repos=true
  for var in ARKD_REPO GO_SDK_REPO WALLET_REPO; do
    val=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
    if [ -z "$val" ] || [ ! -d "$val" ]; then
      has_repos=false
      break
    fi
  done

  if [ "$has_repos" = true ]; then
    repo_count=$(grep -c '_REPO=' "$ENV_FILE" 2>/dev/null || echo 0)
    echo "✓ .env already configured with $repo_count repos"
    echo "  To reconfigure: rm .env && make generate-env"
    exit 0
  else
    echo "⚠️  .env exists but repos are missing or invalid. Regenerating..."
    rm -f "$ENV_FILE"
  fi
fi

# ── GitHub URL → env var mapping ─────────────────────────────────
# Each entry: GITHUB_VAR|REPO_VAR|org/repo|description
REPO_ENTRIES=(
  "ARKD_GITHUB|ARKD_REPO|arkade-os/ark|arkd (protocol server)|required"
  "GO_SDK_GITHUB|GO_SDK_REPO|arkade-os/go-sdk|go-sdk (Go client SDK)|required"
  "WALLET_GITHUB|WALLET_REPO|arkade-os/wallet|wallet (PWA)|required"
  "TS_SDK_GITHUB|TS_SDK_REPO|arkade-os/ts-sdk|ts-sdk (TypeScript SDK)|optional"
  "RUST_SDK_GITHUB|RUST_SDK_REPO|arkade-os/rust-sdk|rust-sdk (Rust SDK)|optional"
  "DOTNET_SDK_GITHUB|DOTNET_SDK_REPO|arkade-os/dotnet-sdk|dotnet-sdk (.NET SDK)|optional"
  "FULMINE_GITHUB|FULMINE_REPO|ArkLabsHQ/fulmine|fulmine (Lightning wallet)|optional"
  "ARK_FAUCET_GITHUB|ARK_FAUCET_REPO|ArkLabsHQ/ark-faucet|ark-faucet (testnet faucet)|optional"
  "BOLTZ_BACKEND_GITHUB|BOLTZ_BACKEND_REPO|BoltzExchange/boltz-backend|boltz-backend (atomic swaps)|optional"
  "BOLTZ_SWAP_GITHUB|BOLTZ_SWAP_REPO|arkade-os/boltz-swap|boltz-swap (swap library)|optional"
  "COMPILER_GITHUB|COMPILER_REPO|ArkLabsHQ/compiler|compiler (Arkade Script)|optional"
  "INTROSPECTOR_GITHUB|INTROSPECTOR_REPO|ArkLabsHQ/introspector|introspector (script engine)|optional"
  "ARKADE_ESCROW_GITHUB|ARKADE_ESCROW_REPO|ArkLabsHQ/arkade-escrow|arkade-escrow (3-party escrow)|optional"
  "ARKADE_EXPLORER_GITHUB|ARKADE_EXPLORER_REPO|ArkLabsHQ/arkade-explorer|arkade-explorer (block explorer)|optional"
  "ARKADE_ASSETS_GITHUB|ARKADE_ASSETS_REPO|ArkLabsHQ/arkade-assets|arkade-assets (asset protocol)|optional"
  "ARK_SIMULATOR_GITHUB|ARK_SIMULATOR_REPO|ArkLabsHQ/ark-simulator|ark-simulator (load testing)|optional"
  "ARK_TELEMETRY_GITHUB|ARK_TELEMETRY_REPO|ArkLabsHQ/ark-telemetry|ark-telemetry (monitoring)|optional"
  "ARK_INFRA_GITHUB|ARK_INFRA_REPO|ArkLabsHQ/ark-infra|ark-infra (IaC)|optional"
  "KMS_UNLOCKER_GITHUB|KMS_UNLOCKER_REPO|ArkLabsHQ/kms-unlocker|kms-unlocker (AWS KMS unlock)|optional"
  "ARK_DOCS_GITHUB|ARK_DOCS_REPO|arkade-os/docs|ark-docs (protocol docs)|optional"
)

# ── Start .env ───────────────────────────────────────────────────
echo "=========================================="
echo "Arkadian Environment Configuration"
echo "=========================================="
echo ""

cat > "$ENV_FILE" << EOF
# Arkadian Environment Variables
# Generated on $(date)

ARKADIAN_DIR=$ARKADIAN_DIR
ARKADIAN_DATA_DIR=$ARKADIAN_DATA_DIR
EOF

echo "✓ ARKADIAN_DIR set to: $ARKADIAN_DIR"
echo "✓ ARKADIAN_DATA_DIR set to: $ARKADIAN_DATA_DIR"
echo ""

# ── Ask: clone repos automatically? ──────────────────────────────
echo "Arkadian needs access to Ark repositories."
echo "You can either:"
echo "  (a) Auto-clone all repos to $REPOS_DIR"
echo "  (b) Enter paths to already-cloned repos manually"
echo ""
read -p "Auto-clone all repos? (Y/n): " auto_clone

if [ "$auto_clone" != "n" ] && [ "$auto_clone" != "N" ]; then
  # ── Auto-clone mode ─────────────────────────────────────────────
  echo ""
  echo "Cloning repos to $REPOS_DIR ..."
  mkdir -p "$REPOS_DIR"

  echo "" >> "$ENV_FILE"
  echo "# Project repositories" >> "$ENV_FILE"

  cloned=0
  skipped=0

  for entry in "${REPO_ENTRIES[@]}"; do
    IFS='|' read -r github_var repo_var org_repo description req <<< "$entry"
    repo_name="${org_repo##*/}"
    clone_dir="$REPOS_DIR/$repo_name"
    clone_url="https://github.com/${org_repo}.git"

    if [ -d "$clone_dir/.git" ]; then
      echo "  ✓ $repo_name (already cloned)"
      echo "$repo_var=$clone_dir" >> "$ENV_FILE"
      cloned=$((cloned + 1))
    else
      if git clone --quiet "$clone_url" "$clone_dir" 2>/dev/null; then
        echo "  ✓ $repo_name"
        echo "$repo_var=$clone_dir" >> "$ENV_FILE"
        cloned=$((cloned + 1))
      else
        if [ "$req" = "required" ]; then
          echo "  ❌ $repo_name (FAILED — this repo is required!)"
          echo "     Try with SSH: git clone git@github.com:${org_repo}.git $clone_dir"
        else
          echo "  ✗ $repo_name (skipped — private or unavailable)"
        fi
        skipped=$((skipped + 1))
      fi
    fi
  done

  echo ""
  echo "  Cloned: $cloned  Skipped: $skipped"

else
  # ── Manual mode ─────────────────────────────────────────────────
  echo ""
  echo "" >> "$ENV_FILE"
  echo "# Project repositories" >> "$ENV_FILE"

  prompt_path() {
    local var_name=$1
    local description=$2
    local required=$3

    while true; do
      read -p "  $description: " path

      if [ -z "$path" ] && [ "$required" = "optional" ]; then
        echo "    Skipped"
        return
      fi

      if [ -z "$path" ] && [ "$required" = "required" ]; then
        echo "    ❌ This repo is required. Please enter a path."
        continue
      fi

      path="${path/#\~/$HOME}"

      if [ -d "$path" ]; then
        echo "$var_name=$path" >> "$ENV_FILE"
        echo "    ✓ $path"
        return
      else
        echo "    ❌ Directory not found: $path"
        if [ "$required" = "optional" ]; then
          read -p "    Skip? (y/n): " skip
          if [ "$skip" = "y" ] || [ "$skip" = "Y" ]; then
            echo "    Skipped"
            return
          fi
        fi
      fi
    done
  }

  echo "Core Repositories (required):"
  echo "───────────────────────────────────────"
  for entry in "${REPO_ENTRIES[@]}"; do
    IFS='|' read -r github_var repo_var org_repo description req <<< "$entry"
    [ "$req" = "required" ] && prompt_path "$repo_var" "$description" "$req"
  done

  echo ""
  echo "Optional Repositories (press Enter to skip):"
  echo "───────────────────────────────────────"
  for entry in "${REPO_ENTRIES[@]}"; do
    IFS='|' read -r github_var repo_var org_repo description req <<< "$entry"
    [ "$req" = "optional" ] && prompt_path "$repo_var" "$description" "$req"
  done
fi

# ── GitHub URLs (always write defaults) ──────────────────────────
echo "" >> "$ENV_FILE"
echo "# GitHub repository URLs (for progress tracking)" >> "$ENV_FILE"

for entry in "${REPO_ENTRIES[@]}"; do
  IFS='|' read -r github_var repo_var org_repo description req <<< "$entry"
  echo "$github_var=$org_repo" >> "$ENV_FILE"
done

echo ""
echo "=========================================="
echo "✅ Environment configuration complete!"
echo "=========================================="
echo ""
echo "Generated: $ENV_FILE"
echo "To edit later: vim .env"
echo "To regenerate: rm .env && make generate-env"
echo ""
