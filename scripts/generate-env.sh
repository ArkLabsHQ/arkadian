#!/usr/bin/env bash
# Generate .env file from user input
# Prompts for paths to all 12 Ark repositories

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ARKADIAN_DIR/.env"

echo "=========================================="
echo "Arkadian Environment Configuration"
echo "=========================================="
echo ""
echo "This script will prompt you for the paths to all Ark repositories."
echo "Press Enter to skip optional repositories."
echo ""

# Start with ARKADIAN_DIR (auto-detected)
echo "# Arkadian Environment Variables" > "$ENV_FILE"
echo "# Generated on $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Core Arkadian directory (this repository)" >> "$ENV_FILE"
echo "ARKADIAN_DIR=$ARKADIAN_DIR" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo "✓ ARKADIAN_DIR set to: $ARKADIAN_DIR"
echo ""

# Function to prompt for path
prompt_path() {
  local var_name=$1
  local description=$2
  local required=${3:-false}

  while true; do
    read -p "Enter path for $description: " path

    # Skip if empty and not required
    if [ -z "$path" ] && [ "$required" = "false" ]; then
      echo "  Skipped (optional)"
      echo ""
      return
    fi

    # Expand tilde
    path="${path/#\~/$HOME}"

    # Check if directory exists
    if [ -d "$path" ]; then
      echo "$var_name=$path" >> "$ENV_FILE"
      echo "  ✓ $var_name=$path"
      echo ""
      return
    else
      echo "  ❌ Directory not found: $path"
      if [ "$required" = "false" ]; then
        read -p "  Skip this repository? (y/n): " skip
        if [ "$skip" = "y" ]; then
          echo "  Skipped"
          echo ""
          return
        fi
      fi
    fi
  done
}

echo "# Project repositories (12 total)" >> "$ENV_FILE"

# Core repositories (required)
echo "Core Repositories:"
echo "-----------------"
prompt_path "ARKD_REPO" "arkd (Core daemon)" true
prompt_path "GO_SDK_REPO" "go-sdk (Go client SDK)" true
prompt_path "WALLET_REPO" "wallet (Reference wallet)" true

# Optional repositories
echo "Optional Repositories:"
echo "---------------------"
prompt_path "ARK_FAUCET_REPO" "ark-faucet (Testnet faucet)" false
prompt_path "ARK_SIMULATOR_REPO" "ark-simulator (Load simulation)" false
prompt_path "ARK_TELEMETRY_REPO" "ark-telemetry (Monitoring)" false
prompt_path "ARK_INFRA_REPO" "ark-infra (Infrastructure)" false
prompt_path "KMS_UNLOCKER_REPO" "kms-unlocker (Key management)" false
prompt_path "FULMINE_REPO" "fulmine (Lightning integration)" false
prompt_path "BOLTZ_BACKEND_REPO" "boltz-backend (Submarine swaps)" false
prompt_path "ARK_DOCS_REPO" "ark-docs (Protocol documentation)" false
prompt_path "ARKADE_ESCROW_REPO" "arkade-escrow (Escrow prototype)" false

echo "" >> "$ENV_FILE"
echo "# GitHub repository URLs (for progress tracking)" >> "$ENV_FILE"
echo "# Format: org/repo (e.g., arkade-os/ark or ArkLabsHQ/ark-faucet)" >> "$ENV_FILE"
echo "# Used by ark-progress-tracker for fetching PRs via GitHub CLI" >> "$ENV_FILE"

# Function to prompt for GitHub URL with default
prompt_github() {
  local var_name=$1
  local description=$2
  local default=$3

  if [ -n "$default" ]; then
    read -p "Enter GitHub URL for $description [$default]: " github_url
    github_url=${github_url:-$default}
  else
    read -p "Enter GitHub URL for $description (org/repo, or press Enter to skip): " github_url
  fi

  if [ -n "$github_url" ]; then
    echo "$var_name=$github_url" >> "$ENV_FILE"
    echo "  ✓ $var_name=$github_url"
  else
    echo "  Skipped"
  fi
  echo ""
}

echo ""
echo "GitHub Repository URLs:"
echo "----------------------"
echo "Enter GitHub URLs in format: org/repo (e.g., arkade-os/ark)"
echo ""

prompt_github "ARKD_GITHUB" "arkd" "arkade-os/ark"
prompt_github "GO_SDK_GITHUB" "go-sdk" "arkade-os/go-sdk"
prompt_github "WALLET_GITHUB" "wallet" "arkade-os/wallet"
prompt_github "ARK_FAUCET_GITHUB" "ark-faucet" "ArkLabsHQ/ark-faucet"
prompt_github "ARK_SIMULATOR_GITHUB" "ark-simulator" "ArkLabsHQ/ark-simulator"
prompt_github "ARK_TELEMETRY_GITHUB" "ark-telemetry" "ArkLabsHQ/ark-telemetry"
prompt_github "ARK_INFRA_GITHUB" "ark-infra" "ArkLabsHQ/ark-infra"
prompt_github "KMS_UNLOCKER_GITHUB" "kms-unlocker" "ArkLabsHQ/kms-unlocker"
prompt_github "FULMINE_GITHUB" "fulmine" "ArkLabsHQ/fulmine"
prompt_github "BOLTZ_BACKEND_GITHUB" "boltz-backend" "BoltzExchange/boltz-backend"
prompt_github "ARK_DOCS_GITHUB" "ark-docs" "arkade-os/docs"
prompt_github "ARKADE_ESCROW_GITHUB" "arkade-escrow" ""

echo ""
echo "=========================================="
echo "✅ Environment configuration complete!"
echo "=========================================="
echo ""
echo "Generated: $ENV_FILE"
echo ""
echo "To edit paths later, run:"
echo "  vim .env"
echo ""
