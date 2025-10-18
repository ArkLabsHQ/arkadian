#!/usr/bin/env bash
# Arkadian Environment Setup Template
#
# This file defines all environment variables required for the Arkadian
# documentation system to work across different machines and setups.
#
# INSTRUCTIONS:
# 1. Copy this file to your home directory: cp env-setup-template.sh ~/.arkadian-env.sh
# 2. Edit ~/.arkadian-env.sh and replace the example paths with your actual paths
# 3. Source it in your shell RC file (~/.zshrc, ~/.bashrc, etc.):
#    echo 'source ~/.arkadian-env.sh' >> ~/.zshrc
# 4. Reload your shell: source ~/.zshrc
# 5. Verify setup: scripts/init-arkadian.sh

# =============================================================================
# CORE PATHS
# =============================================================================

# Arkadian root directory (this repository)
export ARKADIAN_ROOT="$/Users/dusansekulic/.claude/code/go/arkadian"

# Arkadian documentation root (this repository)
export ARKADIAN_DOCS="${ARKADIAN_ROOT}/docs"

# =============================================================================
# PROJECT REPOSITORIES
# =============================================================================

# Core Infrastructure
export ARKD_REPO="$/Users/dusansekulic/.claude/code/go/ark"
export ARKD_WALLET_REPO="$/Users/dusansekulic/.claude/code/go/ark"  # arkd-wallet is part of ark repo

# SDK & Libraries
export GO_SDK_REPO="$/Users/dusansekulic/.claude/code/go/go-sdk"

# Client Applications
export WALLET_REPO="$/Users/dusansekulic/.claude/code/fe/wallet"
export ARK_FAUCET_REPO="$/Users/dusansekulic/.claude/code/go/ark-faucet"

# Testing & Simulation
export ARK_SIMULATOR_REPO="$/Users/dusansekulic/.claude/code/go/ark-simulator"
export ARK_TELEMETRY_REPO="$/Users/dusansekulic/.claude/code/go/ark-telemetry"

# Infrastructure & DevOps
export ARK_INFRA_REPO="$/Users/dusansekulic/.claude/code/go/ark-infra"

# Security & Key Management
export KMS_UNLOCKER_REPO="$/Users/dusansekulic/.claude/code/go/kms-unlocker"

# Lightning Integration
export FULMINE_REPO="$/Users/dusansekulic/.claude/code/go/fulmine"

# Documentation
export ARK_DOCS_REPO="$/Users/dusansekulic/.claude/code/go/docs"

# Smart Contracts & Escrow
export ARKADE_ESCROW_REPO="$/Users/dusansekulic/.claude/code/typescript/arkade-escrow"

# =============================================================================
# OPTIONAL: DEVELOPMENT TOOLS
# =============================================================================

# Bitcoin development environment (Nigiri)
export NIGIRI_PATH="$/Users/dusansekulic/.claude/.nigiri"

# Docker compose files location (if separated from repos)
export ARKD_COMPOSE_DIR="${ARKD_REPO}"

# =============================================================================
# OPTIONAL: NETWORK CONFIGURATIONS
# =============================================================================

# Default network for development
export ARKD_NETWORK="regtest"

# Esplora URL for development
export ARKD_ESPLORA_URL="http://localhost:3000"

# arkd-wallet address
export ARKD_WALLET_ADDR="localhost:6060"

# =============================================================================
# OPTIONAL: DATABASE PATHS (for local development)
# =============================================================================

# Data directory for arkd
export ARKD_DATADIR="$/Users/dusansekulic/.claude/.arkd"

# Data directory for arkd-wallet
export ARKD_WALLET_DATADIR="$/Users/dusansekulic/.claude/.arkd-wallet"

# =============================================================================
# VERIFICATION HELPERS
# =============================================================================

# Function to verify all required repos exist
verify_arkadian_repos() {
  local missing=()

  # Check required repositories
  [[ ! -d "${ARKADIAN_DOCS}" ]] && missing+=("ARKADIAN_DOCS")
  [[ ! -d "${ARKD_REPO}" ]] && missing+=("ARKD_REPO")
  [[ ! -d "${GO_SDK_REPO}" ]] && missing+=("GO_SDK_REPO")
  [[ ! -d "${WALLET_REPO}" ]] && missing+=("WALLET_REPO")
  [[ ! -d "${ARK_FAUCET_REPO}" ]] && missing+=("ARK_FAUCET_REPO")
  [[ ! -d "${ARK_SIMULATOR_REPO}" ]] && missing+=("ARK_SIMULATOR_REPO")
  [[ ! -d "${ARK_TELEMETRY_REPO}" ]] && missing+=("ARK_TELEMETRY_REPO")
  [[ ! -d "${ARK_INFRA_REPO}" ]] && missing+=("ARK_INFRA_REPO")
  [[ ! -d "${KMS_UNLOCKER_REPO}" ]] && missing+=("KMS_UNLOCKER_REPO")
  [[ ! -d "${FULMINE_REPO}" ]] && missing+=("FULMINE_REPO")
  [[ ! -d "${ARK_DOCS_REPO}" ]] && missing+=("ARK_DOCS_REPO")
  [[ ! -d "${ARKADE_ESCROW_REPO}" ]] && missing+=("ARKADE_ESCROW_REPO")

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "❌ Missing repositories:"
    for repo in "${missing[@]}"; do
      echo "   - ${repo}: $(eval echo \$${repo})"
    done
    return 1
  fi

  echo "✅ All Arkadian repositories found"
  return 0
}

# =============================================================================
# MACHINE-SPECIFIC PROFILES (OPTIONAL)
# =============================================================================

# Uncomment the profile that matches your machine, or create your own

# # Profile: macOS Development Machine
# if [[ "$(uname)" == "Darwin" ]]; then
#   export ARKADIAN_DOCS="$/Users/dusansekulic/.claude/code/go/arkadian/docs"
#   export ARKD_REPO="$/Users/dusansekulic/.claude/code/go/ark"
#   # ... other paths
# fi

# # Profile: Linux CI Server
# if [[ "$(hostname)" == "ci-server" ]]; then
#   export ARKADIAN_DOCS="/opt/arkadian/docs"
#   export ARKD_REPO="/opt/repos/ark"
#   # ... other paths
# fi

# # Profile: Docker Container
# if [[ -f /.dockerenv ]]; then
#   export ARKADIAN_DOCS="/workspace/arkadian/docs"
#   export ARKD_REPO="/workspace/ark"
#   # ... other paths
# fi

# =============================================================================
# COMPLETION MESSAGE
# =============================================================================

echo "🚀 Arkadian environment loaded"
echo "   Run 'verify_arkadian_repos' to check repository paths"
echo "   Run 'scripts/init-arkadian.sh' for full validation"
