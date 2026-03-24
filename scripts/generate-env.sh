#!/usr/bin/env bash
# Generate .env file from user input
# Prompts for paths to Ark repositories
#
# Usage:
#   bash scripts/generate-env.sh            # Interactive (all repos)
#   bash scripts/generate-env.sh --minimal  # Only 3 required repos

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ARKADIAN_DIR/.env"
MINIMAL=false

if [ "${1:-}" = "--minimal" ]; then
  MINIMAL=true
fi

echo "=========================================="
echo "Arkadian Environment Configuration"
echo "=========================================="
echo ""

# Get OS-specific data directory
ARKADIAN_DATA_DIR=$("$SCRIPT_DIR/get-data-dir.sh")

# Start with ARKADIAN_DIR and ARKADIAN_DATA_DIR (auto-detected)
echo "# Arkadian Environment Variables" > "$ENV_FILE"
echo "# Generated on $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Core Arkadian directory (this repository)" >> "$ENV_FILE"
echo "ARKADIAN_DIR=$ARKADIAN_DIR" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Runtime data directory (OS-specific)" >> "$ENV_FILE"
echo "ARKADIAN_DATA_DIR=$ARKADIAN_DATA_DIR" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo "✓ ARKADIAN_DIR set to: $ARKADIAN_DIR"
echo "✓ ARKADIAN_DATA_DIR set to: $ARKADIAN_DATA_DIR"
echo ""

# Function to prompt for path
prompt_path() {
  local var_name=$1
  local description=$2
  local required=${3:-false}

  while true; do
    read -p "  $description: " path

    # Skip if empty and not required
    if [ -z "$path" ] && [ "$required" = "false" ]; then
      echo "    Skipped"
      return
    fi

    if [ -z "$path" ] && [ "$required" = "true" ]; then
      echo "    ❌ This repo is required. Please enter a path."
      continue
    fi

    # Expand tilde
    path="${path/#\~/$HOME}"

    # Check if directory exists
    if [ -d "$path" ]; then
      echo "$var_name=$path" >> "$ENV_FILE"
      echo "    ✓ $path"
      return
    else
      echo "    ❌ Directory not found: $path"
      if [ "$required" = "false" ]; then
        read -p "    Skip this repo? (y/n): " skip
        if [ "$skip" = "y" ] || [ "$skip" = "Y" ]; then
          echo "    Skipped"
          return
        fi
      fi
    fi
  done
}

echo "# Project repositories" >> "$ENV_FILE"

# ─── Required repos ──────────────────────────────────────────────
echo "Step 1: Core Repositories (required)"
echo "───────────────────────────────────────"
echo "These 3 repos must be cloned locally."
echo ""
prompt_path "ARKD_REPO" "arkd (protocol server)" true
prompt_path "GO_SDK_REPO" "go-sdk (Go client SDK)" true
prompt_path "WALLET_REPO" "wallet (PWA wallet)" true
echo ""

if [ "$MINIMAL" = true ]; then
  echo "Minimal mode: skipping optional repos."
  echo ""
else
  # ─── Optional repos ──────────────────────────────────────────────
  echo "Step 2: Optional Repositories"
  echo "───────────────────────────────────────"
  echo "Press Enter to skip any repo you haven't cloned."
  echo ""

  echo "SDKs:"
  prompt_path "TS_SDK_REPO" "ts-sdk (TypeScript SDK)" false
  prompt_path "RUST_SDK_REPO" "rust-sdk (Rust SDK)" false
  prompt_path "DOTNET_SDK_REPO" "dotnet-sdk (.NET SDK)" false
  echo ""

  echo "Services:"
  prompt_path "FULMINE_REPO" "fulmine (Lightning wallet + swaps)" false
  prompt_path "ARK_FAUCET_REPO" "ark-faucet (testnet faucet)" false
  echo ""

  echo "Swap infrastructure:"
  prompt_path "BOLTZ_BACKEND_REPO" "boltz-backend (atomic swaps)" false
  prompt_path "BOLTZ_SWAP_REPO" "boltz-swap (swap client library)" false
  echo ""

  echo "Smart contracts:"
  prompt_path "COMPILER_REPO" "compiler (Arkade Script compiler)" false
  prompt_path "INTROSPECTOR_REPO" "introspector (script engine)" false
  echo ""

  echo "Applications:"
  prompt_path "ARKADE_ESCROW_REPO" "arkade-escrow (3-party escrow)" false
  prompt_path "ARKADE_EXPLORER_REPO" "arkade-explorer (block explorer)" false
  prompt_path "ARKADE_ASSETS_REPO" "arkade-assets (asset protocol)" false
  echo ""

  echo "Testing & simulation:"
  prompt_path "ARK_SIMULATOR_REPO" "ark-simulator (load testing)" false
  echo ""

  echo "Infrastructure & ops:"
  prompt_path "ARK_TELEMETRY_REPO" "ark-telemetry (monitoring)" false
  prompt_path "ARK_INFRA_REPO" "ark-infra (IaC)" false
  prompt_path "KMS_UNLOCKER_REPO" "kms-unlocker (AWS KMS unlock)" false
  echo ""

  echo "Documentation:"
  prompt_path "ARK_DOCS_REPO" "ark-docs (protocol docs)" false
  echo ""
fi

# ─── GitHub URLs (auto-accept defaults) ──────────────────────────
echo "" >> "$ENV_FILE"
echo "# GitHub repository URLs (for progress tracking)" >> "$ENV_FILE"
echo "# Format: org/repo" >> "$ENV_FILE"

GITHUB_DEFAULTS=(
  "ARKD_GITHUB=arkade-os/ark"
  "GO_SDK_GITHUB=arkade-os/go-sdk"
  "WALLET_GITHUB=arkade-os/wallet"
  "TS_SDK_GITHUB=arkade-os/ts-sdk"
  "RUST_SDK_GITHUB=arkade-os/rust-sdk"
  "DOTNET_SDK_GITHUB=arkade-os/dotnet-sdk"
  "FULMINE_GITHUB=ArkLabsHQ/fulmine"
  "ARK_FAUCET_GITHUB=ArkLabsHQ/ark-faucet"
  "BOLTZ_BACKEND_GITHUB=BoltzExchange/boltz-backend"
  "BOLTZ_SWAP_GITHUB=arkade-os/boltz-swap"
  "COMPILER_GITHUB=ArkLabsHQ/compiler"
  "INTROSPECTOR_GITHUB=ArkLabsHQ/introspector"
  "ARKADE_ESCROW_GITHUB=ArkLabsHQ/arkade-escrow"
  "ARKADE_EXPLORER_GITHUB=ArkLabsHQ/arkade-explorer"
  "ARKADE_ASSETS_GITHUB=ArkLabsHQ/arkade-assets"
  "ARK_SIMULATOR_GITHUB=ArkLabsHQ/ark-simulator"
  "ARK_TELEMETRY_GITHUB=ArkLabsHQ/ark-telemetry"
  "ARK_INFRA_GITHUB=ArkLabsHQ/ark-infra"
  "KMS_UNLOCKER_GITHUB=ArkLabsHQ/kms-unlocker"
  "ARK_DOCS_GITHUB=arkade-os/docs"
)

echo "Step 3: GitHub URLs"
echo "───────────────────────────────────────"
echo "Default GitHub URLs are pre-configured for progress tracking."
read -p "Accept all defaults? (Y/n): " accept_defaults

if [ "$accept_defaults" = "n" ] || [ "$accept_defaults" = "N" ]; then
  echo ""
  echo "Enter GitHub URLs in format: org/repo (press Enter to keep default)"
  echo ""
  for entry in "${GITHUB_DEFAULTS[@]}"; do
    var_name="${entry%%=*}"
    default_value="${entry#*=}"
    read -p "  $var_name [$default_value]: " custom_value
    value="${custom_value:-$default_value}"
    echo "$var_name=$value" >> "$ENV_FILE"
  done
else
  for entry in "${GITHUB_DEFAULTS[@]}"; do
    echo "$entry" >> "$ENV_FILE"
  done
  echo "  ✓ All GitHub URLs set to defaults"
fi

echo ""
echo "=========================================="
echo "✅ Environment configuration complete!"
echo "=========================================="
echo ""
echo "Generated: $ENV_FILE"
echo ""
echo "To edit later: vim .env"
echo "To regenerate: rm .env && make generate-env"
echo ""
