#!/usr/bin/env bash
# Generate .env file from user input
# Prompts for paths to all 20 Ark repositories

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
echo "# macOS: ~/Library/Application Support/Arkadian" >> "$ENV_FILE"
echo "# Linux: ~/.arkadian" >> "$ENV_FILE"
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

echo "# Project repositories (20 total)" >> "$ENV_FILE"

# Core repositories (required)
echo "Core Repositories (required):"
echo "-----------------------------"
prompt_path "ARKD_REPO" "arkd (Core protocol server)" true
prompt_path "GO_SDK_REPO" "go-sdk (Go client SDK)" true
prompt_path "WALLET_REPO" "wallet (PWA wallet)" true

# SDK repositories
echo ""
echo "SDK Repositories:"
echo "-----------------"
prompt_path "TS_SDK_REPO" "ts-sdk (TypeScript SDK - @arkade-os/sdk)" false
prompt_path "RUST_SDK_REPO" "rust-sdk (Rust SDK - ark-rs)" false
prompt_path "DOTNET_SDK_REPO" "dotnet-sdk (.NET SDK - NArk)" false

# Service repositories
echo ""
echo "Service Repositories:"
echo "---------------------"
prompt_path "FULMINE_REPO" "fulmine (Lightning wallet + swaps)" false
prompt_path "ARK_FAUCET_REPO" "ark-faucet (Testnet faucet)" false

# Swap infrastructure
echo ""
echo "Swap Infrastructure:"
echo "--------------------"
prompt_path "BOLTZ_BACKEND_REPO" "boltz-backend (Atomic swaps)" false
prompt_path "BOLTZ_SWAP_REPO" "boltz-swap (Swap client library)" false

# Smart contracts
echo ""
echo "Smart Contract Tooling:"
echo "-----------------------"
prompt_path "COMPILER_REPO" "compiler (Arkade Script compiler)" false
prompt_path "INTROSPECTOR_REPO" "introspector (Script engine + co-signer)" false

# Application repositories
echo ""
echo "Application Repositories:"
echo "-------------------------"
prompt_path "ARKADE_ESCROW_REPO" "arkade-escrow (3-party escrow)" false
prompt_path "ARKADE_EXPLORER_REPO" "arkade-explorer (Block explorer)" false
prompt_path "ARKADE_ASSETS_REPO" "arkade-assets (Asset protocol)" false

# Testing & simulation
echo ""
echo "Testing & Simulation:"
echo "---------------------"
prompt_path "ARK_SIMULATOR_REPO" "ark-simulator (Load testing)" false

# Infrastructure & ops
echo ""
echo "Infrastructure & Ops:"
echo "---------------------"
prompt_path "ARK_TELEMETRY_REPO" "ark-telemetry (Monitoring stack)" false
prompt_path "ARK_INFRA_REPO" "ark-infra (IaC - Terraform/Docker)" false
prompt_path "KMS_UNLOCKER_REPO" "kms-unlocker (AWS KMS wallet unlock)" false

# Documentation
echo ""
echo "Documentation:"
echo "--------------"
prompt_path "ARK_DOCS_REPO" "ark-docs (Protocol documentation)" false

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
prompt_github "TS_SDK_GITHUB" "ts-sdk" "arkade-os/ts-sdk"
prompt_github "RUST_SDK_GITHUB" "rust-sdk" "arkade-os/rust-sdk"
prompt_github "DOTNET_SDK_GITHUB" "dotnet-sdk" "arkade-os/dotnet-sdk"
prompt_github "FULMINE_GITHUB" "fulmine" "ArkLabsHQ/fulmine"
prompt_github "ARK_FAUCET_GITHUB" "ark-faucet" "ArkLabsHQ/ark-faucet"
prompt_github "BOLTZ_BACKEND_GITHUB" "boltz-backend" "BoltzExchange/boltz-backend"
prompt_github "BOLTZ_SWAP_GITHUB" "boltz-swap" "arkade-os/boltz-swap"
prompt_github "COMPILER_GITHUB" "compiler" "ArkLabsHQ/compiler"
prompt_github "INTROSPECTOR_GITHUB" "introspector" "ArkLabsHQ/introspector"
prompt_github "ARKADE_ESCROW_GITHUB" "arkade-escrow" "ArkLabsHQ/arkade-escrow"
prompt_github "ARKADE_EXPLORER_GITHUB" "arkade-explorer" "ArkLabsHQ/arkade-explorer"
prompt_github "ARKADE_ASSETS_GITHUB" "arkade-assets" "ArkLabsHQ/arkade-assets"
prompt_github "ARK_SIMULATOR_GITHUB" "ark-simulator" "ArkLabsHQ/ark-simulator"
prompt_github "ARK_TELEMETRY_GITHUB" "ark-telemetry" "ArkLabsHQ/ark-telemetry"
prompt_github "ARK_INFRA_GITHUB" "ark-infra" "ArkLabsHQ/ark-infra"
prompt_github "KMS_UNLOCKER_GITHUB" "kms-unlocker" "ArkLabsHQ/kms-unlocker"
prompt_github "ARK_DOCS_GITHUB" "ark-docs" "arkade-os/docs"

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
