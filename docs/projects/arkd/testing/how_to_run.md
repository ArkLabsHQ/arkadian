# How to Run arkd

Guide for setting up and running arkd in development environments.

## Prerequisites

- Go 1.26.3 or later
- Docker and Docker Compose
- [Nigiri](https://nigiri.vulpem.com/) for local Bitcoin regtest

## Quick Start (Development)

### 1. Setup Bitcoin Regtest

```bash
# Install Nigiri (if not installed)
curl https://nigiri.vulpem.com | bash

# Start Bitcoin regtest + Esplora
nigiri start
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/arkade-os/arkd.git
cd arkd

# Install dependencies
go mod download
```

### 3. Run arkd-wallet

```bash
# Option A: With signer enabled (recommended)
make run-wallet

# Option B: Wallet without signer
make run-wallet-nosigner

# Option C: Separate signer
make run-wallet-nosigner  # Terminal 1
make run-signer           # Terminal 2
```

This automatically starts:
- PostgreSQL for NBXplorer
- NBXplorer service
- arkd-wallet with pre-configured signer key

### 4. Run arkd

```bash
# Option A: Light mode (SQLite + in-memory)
make run-light

# Option B: Full mode (PostgreSQL + Redis)
make run
```

## Docker Environment

For integration testing with full stack:

```bash
# Start all services
make docker-run

# Services started:
# - pgnbxplorer (PostgreSQL for NBXplorer)
# - nbxplorer (Bitcoin wallet indexer)
# - arkd-wallet (on port 6060)
# - arkd (on port 7070)

# Verify services are running
docker ps

# View logs
docker logs arkd -f
docker logs arkd-wallet -f

# Stop all services
make docker-stop
```

## Configuration Modes

### Light Mode (Development)

```bash
make run-light
```

Uses:
- SQLite for main database
- Badger for event store
- In-memory cache
- Block-based scheduler

**Pros**: No external dependencies, fast startup
**Cons**: Limited persistence, single instance only

### Full Mode (Production-like)

```bash
make run
```

Uses:
- PostgreSQL for main database
- PostgreSQL for event store
- Redis for cache
- Gocron scheduler

**Pros**: Production-ready, scalable
**Cons**: Requires Docker services

## Manual Configuration

### Environment Variables

Create `.env` file or export variables:

```bash
# Network
export ARKD_PORT=7070
export ARKD_ESPLORA_URL=http://localhost:3000
export ARKD_WALLET_ADDR=localhost:6060

# Database
export ARKD_DB_TYPE=sqlite
export ARKD_EVENT_DB_TYPE=badger
export ARKD_LIVE_STORE_TYPE=inmemory

# Round config
export ARKD_ROUND_INTERVAL=30
export ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1
export ARKD_ROUND_MAX_PARTICIPANTS_COUNT=128

# Run
go run ./cmd/arkd
```

### Custom Signer Setup

```bash
# Option 1: Environment variable (wallet as signer)
export ARKD_WALLET_SIGNER_KEY=<private-key-hex>
make run-wallet

# Option 2: Load via API (runtime configuration)
arkd signer load --signer-prvkey <private-key>

# Option 3: External signer service
export ARKD_SIGNER_ADDR=localhost:7071
make run-signer  # In separate terminal
```

## Verifying Setup

```bash
# Check arkd is running
curl http://localhost:7070/v1/info

# Check arkd-wallet is running
curl http://localhost:6060/v1/wallet/status

# Check Bitcoin network
nigiri rpc getblockchaininfo

# Generate test blocks
nigiri rpc --generate 10
```

## Common Workflows

### Development Workflow

```bash
# Terminal 1: Start Bitcoin + Explorer
nigiri start

# Terminal 2: Start wallet
make run-wallet

# Terminal 3: Start arkd
make run-light

# Terminal 4: Run commands
arkd wallet create --password test123
arkd wallet unlock --password test123
```

### Testing Workflow

```bash
# Start test environment
make docker-run

# Wait for services (30 seconds)
sleep 30

# Run tests
make test               # Unit tests
make integrationtest    # E2E tests

# Cleanup
make docker-stop
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues.

## See Also

- [Usage Guide](./usage.md) - Common commands
- [How to Test](./how_to_test.md) - Running tests
- [Troubleshooting](./troubleshooting.md) - Problem resolution
