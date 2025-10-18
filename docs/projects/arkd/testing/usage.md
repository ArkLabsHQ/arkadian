# arkd Usage Guide

Quick reference for common arkd operations and workflows.

## Installation

### From GitHub Releases

```bash
# Download the latest binary
wget https://github.com/arkade-os/arkd/releases/latest/download/arkd-<platform>

# Make executable and install
chmod +x arkd
sudo mv arkd /usr/local/bin/
```

### From Source

```bash
# Clone repository
git clone https://github.com/arkade-os/arkd.git
cd arkd

# Build for your platform
make build              # Single platform
make build-all          # All platforms

# Build related tools
make build-cli          # ark CLI client
make build-wallet       # arkd-wallet
```

## Initial Setup

### 1. Start Bitcoin Regtest (Development)

```bash
# Install and start Nigiri
nigiri start
```

### 2. Start arkd-wallet

```bash
# With signer enabled
make run-wallet

# Or manually with NBXplorer
export ARKD_WALLET_NBXPLORER_URL=http://localhost:32838
export ARKD_WALLET_SIGNER_KEY=<your-private-key>
arkd-wallet
```

### 3. Start arkd

```bash
# Light mode (SQLite + in-memory cache)
make run-light

# Full mode (PostgreSQL + Redis)
make run

# Or manually
export ARKD_WALLET_ADDR=localhost:6060
arkd
```

### 4. Initialize Wallet

```bash
# Create new wallet
arkd wallet create --password <password>

# Or restore from mnemonic
arkd wallet create --mnemonic "your twelve words here" --password <password>

# Unlock wallet
arkd wallet unlock --password <password>

# Get funding address
arkd wallet address

# Fund wallet (regtest)
nigiri faucet <address> 1.0

# Check balance
arkd wallet balance
```

## Common Operations

### Wallet Management

```bash
# Get wallet status
arkd wallet status

# Get receiving address
arkd wallet address

# Check balance
arkd wallet balance

# Withdraw funds
arkd wallet withdraw --address <btc-address> --amount <btc>
```

### Server Operations

```bash
# Get server info
arkd info

# Check server status
curl http://localhost:7070/v1/info
```

### Development Commands

```bash
# Code quality
make lint               # Lint and format
make vet               # Static analysis

# Protocol buffers
make proto             # Compile proto files
make proto-lint        # Lint protos only

# Database operations (PostgreSQL)
make pg                # Start postgres
make pgmigrate FILE=name  # Create migration
make pgsqlc            # Generate SQL code
make droppg            # Stop postgres

# Database operations (SQLite)
make migrate FILE=name # Create migration
make sqlc              # Generate SQL code
```

## Configuration

### Key Environment Variables

```bash
# Network & Connectivity
ARKD_PORT=7070
ARKD_ADMIN_PORT=7070
ARKD_ESPLORA_URL=http://localhost:3000
ARKD_WALLET_ADDR=localhost:6060

# Database
ARKD_DB_TYPE=sqlite                    # sqlite | postgres | badger
ARKD_EVENT_DB_TYPE=badger              # badger | postgres

# Cache
ARKD_LIVE_STORE_TYPE=inmemory          # inmemory | redis

# Round Configuration
ARKD_ROUND_INTERVAL=30                 # Seconds
ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1
ARKD_ROUND_MAX_PARTICIPANTS_COUNT=128

# Timeouts
ARKD_VTXO_TREE_EXPIRY=604672          # 7 days
ARKD_UNILATERAL_EXIT_DELAY=86400      # 24 hours
ARKD_BOARDING_EXIT_DELAY=7776000      # 3 months
```

### Configuration Profiles

See `envs/` directory:
- `arkd.dev.env` - Full mode with PostgreSQL + Redis
- `arkd.light.env` - Light mode with SQLite + in-memory
- `arkd-wallet.regtest.env` - Wallet with signer
- `signer.dev.env` - Standalone signer

## Data Directories

Default locations:
- **Linux**: `~/.arkd/`
- **macOS**: `~/Library/Application Support/arkd/`
- **Windows**: `%APPDATA%\arkd\`

Override with: `export ARKD_DATADIR=/custom/path`

## See Also

- [How to Run](./how_to_run.md) - Development environment setup
- [How to Test](./how_to_test.md) - Running tests
- [Troubleshooting](./troubleshooting.md) - Common issues
