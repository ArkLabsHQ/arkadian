---
project_id: fulmine
version: 1.1.0
last_sync_commit: 193e61784688f9c5615358e3894d64b357c57deb
last_sync_date: 2026-02-19T12:00:00Z
repository_path: ${FULMINE_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/fulmine
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  swaps: ["system/swap-system.md", "sop/swap-operations.md"]
  lightning: ["system/lightning-integration.md", "sop/lightning-setup.md"]
  web: ["system/web-interface.md", "testing/usage.md"]
scripts:
  test: "make test"
  test_vhtlc: "make test-vhtlc"
  integration: "make integrationtest"
  run_dev: "make run"
  build: "make build"
  docker_run: "docker run -d --name fulmine -p 7000:7000 -p 7001:7001 -v fulmine-data:/app/data ghcr.io/arklabshq/fulmine:latest"
---

# Fulmine — Project Index

**fulmine** (⚡️ Italian for "lightning") is a Bitcoin wallet daemon that enables swap providers and payment hubs to optimize Lightning Network channel liquidity while minimizing on-chain fees. It combines Ark protocol (off-chain VTXOs) with Lightning Network (via Boltz swaps) to provide seamless liquidity management.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/fulmine/system/` — System Architecture & Components
Core documentation about fulmine architecture and design:

- **${ARKADIAN_DIR}/docs/projects/fulmine/system/project_overview.md** — — What fulmine is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/architecture.md** — — Hexagonal architecture, core domain, infrastructure
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/web-interface.md** — — Web UI and REST API overview
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/swap-system.md** — — Boltz integration, swap types (on-chain ↔ Lightning)
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/lightning-integration.md** — — Lightning Network integration (LND, CLN support)
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/vhtlc.md** — — Virtual HTLC implementation for Ark-Lightning interoperability
- **${ARKADIAN_DIR}/docs/projects/fulmine/system/configuration.md** — — Environment variables and configuration options

### `${ARKADIAN_DIR}/docs/projects/fulmine/testing/` — Usage & Operations
Practical guides for using and operating fulmine:

- **${ARKADIAN_DIR}/docs/projects/fulmine/testing/usage.md** — — Quick start guide (Docker and binary)
- **${ARKADIAN_DIR}/docs/projects/fulmine/testing/api-reference.md** — — REST API and gRPC endpoints
- **${ARKADIAN_DIR}/docs/projects/fulmine/testing/how_to_run.md** — — Development and production deployment
- **${ARKADIAN_DIR}/docs/projects/fulmine/testing/how_to_test.md** — — Unit tests, integration tests, E2E tests
- **${ARKADIAN_DIR}/docs/projects/fulmine/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/fulmine/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/fulmine/sop/development-workflow.md** — — Development setup and workflow
- **${ARKADIAN_DIR}/docs/projects/fulmine/sop/swap-operations.md** — — How to perform swaps (on-chain ↔ Lightning)
- **${ARKADIAN_DIR}/docs/projects/fulmine/sop/lightning-setup.md** — — Setting up LND or CLN integration
- **${ARKADIAN_DIR}/docs/projects/fulmine/sop/wallet-management.md** — — Wallet creation, backup, recovery

### `${ARKADIAN_DIR}/docs/projects/fulmine/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Ark Protocol Integration
- **VTXOs**: Virtual Transaction Outputs (off-chain Bitcoin UTXOs)
- **Off-chain Payments**: Fast, low-fee transfers within Ark
- **Onboarding**: Moving on-chain Bitcoin into Ark (boarding addresses)
- **Redemption**: Moving Ark funds back on-chain (collaborative exit)

### Lightning Network Swaps
- **Boltz Integration**: Trustless submarine swaps via Boltz backend
- **On-chain → Lightning**: Convert Bitcoin to Lightning capacity
- **Lightning → On-chain**: Convert Lightning to Bitcoin UTXOs
- **Chain Swaps**: Direct Ark ↔ Bitcoin on-chain swaps (no Lightning required)
- **Atomic Swaps**: HTLCs ensure trustless execution
- **Swap Restoration**: Interrupted swaps resume automatically on restart

### VHTLC (Virtual HTLC)
- **Purpose**: Enable Lightning-style HTLCs within Ark protocol
- **Use Case**: Atomic swaps between Ark VTXOs and Lightning channels
- **Implementation**: Hash-locked outputs in VTXO tree structure
- **Refund Mechanism**: Cooperative or unilateral refund after timeout

### Web Interface
- **Dashboard**: At http://localhost:7001 by default
- **Wallet Management**: Create, unlock, lock wallet via UI
- **Balance Display**: On-chain, off-chain (Ark), and Lightning
- **Transaction History**: View all transactions and swaps
- **Settings**: Configure Ark server, Esplora, Boltz backend

### Delegator Service
- **Purpose**: Allows clients to delegate VTXO refresh to Fulmine
- **Protocol**: Separate gRPC/REST service (default port 7002)
- **Operation**: Clients submit partially-signed intents and forfeit txs
- **Scheduling**: Delegated tasks are executed near VTXO expiration
- **Fee Support**: Configurable delegation fee

### OpenTelemetry Observability
- **Traces**: Distributed tracing via OTLP exporter
- **Metrics**: Go runtime metrics (CPU, GC, goroutines, heap, mutex)
- **Logs**: Structured log export via Logrus hook
- **Profiling**: Pyroscope continuous profiling support

### Auto-Unlock Feature
- **File-based**: Read password from file (for services)
- **Env-based**: Password from environment variable
- **Security**: File permissions (chmod 600) or Docker secrets

---

## Quick Reference

### Docker Usage (Recommended)
```bash
# Run fulmine with default configuration
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest

# Access web UI
open http://localhost:7001

# View logs
docker logs -f fulmine

# Stop container
docker stop fulmine

# Update to latest version
docker pull ghcr.io/arklabshq/fulmine:latest
docker stop fulmine && docker rm fulmine
# Then run again with same command
```

### Binary Usage
```bash
# Download from releases page
# https://github.com/ArkLabsHQ/fulmine/releases

# Extract and run
chmod +x fulmine
./fulmine

# Access web UI at http://localhost:7001
```

### Development
```bash
# Prerequisites: Go 1.25.7+, Node.js 18.17.1+
git clone https://github.com/ArkLabsHQ/fulmine.git
cd fulmine
go mod download
make run

# Access at http://localhost:7001
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FULMINE_DATADIR` | Data directory | `/app/data` (Docker), `~/.fulmine` (binary) |
| `FULMINE_HTTP_PORT` | Web UI and REST API port | `7001` |
| `FULMINE_GRPC_PORT` | gRPC service port | `7000` |
| `FULMINE_ARK_SERVER` | Ark server URL | Pre-filled default |
| `FULMINE_ESPLORA_URL` | Esplora API URL | Pre-filled default |
| `FULMINE_BOLTZ_URL` | Boltz backend URL | Not set (uses default) |
| `FULMINE_BOLTZ_WS_URL` | Boltz WebSocket URL | Not set (uses default) |
| `FULMINE_UNLOCKER_TYPE` | Auto-unlock type (`file` or `env`) | Not set (manual unlock) |
| `FULMINE_UNLOCKER_FILE_PATH` | Password file path | Not set |
| `FULMINE_UNLOCKER_PASSWORD` | Password string | Not set |
| `FULMINE_DELEGATOR_ENABLED` | Enable delegator service | `false` |
| `FULMINE_DELEGATOR_PORT` | Delegator service port | `7002` |
| `FULMINE_DELEGATOR_FEE` | Delegation fee (sats) | `0` |
| `FULMINE_OTEL_COLLECTOR_URL` | OpenTelemetry collector URL | Not set |
| `FULMINE_PYROSCOPE_URL` | Pyroscope profiling URL | Not set |
| `FULMINE_DISABLE_TELEMETRY` | Opt out of telemetry | `false` |
| `FULMINE_LOG_LEVEL` | Log level (0-5) | `4` (info) |

### Docker Configuration Example
```bash
docker run -d \
  --name fulmine \
  -p 7001:7001 \
  -e FULMINE_HTTP_PORT=7001 \
  -e FULMINE_ARK_SERVER="https://ark.example.com" \
  -e FULMINE_ESPLORA_URL="https://mempool.space/api" \
  -e FULMINE_UNLOCKER_TYPE="file" \
  -e FULMINE_UNLOCKER_FILE_PATH="/app/password.txt" \
  -v fulmine-data:/app/data \
  -v /path/to/password.txt:/app/password.txt \
  ghcr.io/arklabshq/fulmine:latest
```

---

## API Overview

### Security Warning
⚠️ **The REST API and gRPC interfaces are currently NOT protected by authentication.** Do not expose these over the public internet. Access only from trusted networks or localhost. See [issue #98](https://github.com/ArkLabsHQ/fulmine/issues/98).

### API Interfaces
1. **Web UI**: http://localhost:7001 (dashboard)
2. **REST API**: http://localhost:7001/api (JSON)
3. **gRPC Service**: localhost:7000 (protobuf)
4. **Delegator Service**: localhost:7002 (gRPC + REST, when enabled)

### Key REST Endpoints

**Wallet Operations**
```bash
# Generate seed
GET /api/v1/wallet/genseed

# Create wallet
POST /api/v1/wallet/create
Body: {"private_key": "<hex or nsec>", "password": "<password>", "server_url": "<ark_server>"}

# Unlock wallet
POST /api/v1/wallet/unlock
Body: {"password": "<password>"}

# Lock wallet
POST /api/v1/wallet/lock

# Get wallet status
GET /api/v1/wallet/status
```

**Service Operations**
```bash
# Get receive address
GET /api/v1/address

# Get balance
GET /api/v1/balance

# Send offchain (within Ark)
POST /api/v1/send/offchain
Body: {"address": "<ark_address>", "amount": <sats>}

# Send onchain (Bitcoin)
POST /api/v1/send/onchain
Body: {"address": "<bitcoin_address>", "amount": <sats>}

# Settle/renew VTXOs
GET /api/v1/settle

# Get transaction history
GET /api/v1/transactions

# Settle VHTLC (claim or refund)
POST /api/v1/vhtlc/settle

# Refund VHTLC
POST /api/v1/vhtlc/refundWithoutReceiver
Body: {"preimage_hash": "<hex>"}

# Get VTXOs (with optional filter)
GET /api/v1/vtxos?spendable_only=true

# Next settlement time
GET /api/v1/settlement/next

# Chain swaps
POST /api/v1/chainswap
GET /api/v1/chainswaps
POST /api/v1/chainswap/{id}/refund

# List delegates
GET /api/v1/delegates?status=pending
```

---

## Architecture Overview

### Hexagonal Architecture

**Core Domain** (`internal/core/`)
- `domain/`: Business entities (Wallet, VTXO, Transaction, Swap)
- `application/`: Use case orchestration
- `ports/`: Interface definitions for external adapters

**Infrastructure** (`internal/infrastructure/`)
- `db/`: SQLite storage for wallet state
- `ark-client/`: Integration with Ark server (go-sdk)
- `boltz-client/`: Integration with Boltz swap backend
- `ln-client/`: Lightning Network client (LND/CLN support)
- `unlocker/`: Auto-unlock implementations (file, env)

**Interface** (`internal/interface/`)
- `grpc/`: gRPC service handlers
- `web/`: Web UI (templ templates) and REST API

**Packages** (`pkg/`)
- `boltz/`: Boltz API client and swap logic
- `swap/`: Swap state machine and coordination
- `vhtlc/`: Virtual HTLC implementation
- `macaroon/`: Authentication service (future)

### Service Flow
```
┌───────────────────────────────────────────────────────────┐
│                   Fulmine Wallet                          │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  Web UI (7001)  ←→  REST API  ←→  gRPC Service (7000)   │
│                           ↓                                 │
│                  Application Layer                          │
│                  (Wallet, Swaps, Transfers)                │
│                           ↓                                 │
│  ┌─────────────┬──────────────┬──────────────────────┐   │
│  │ Ark Client  │ Boltz Client │ Lightning Client     │   │
│  │ (VTXOs)     │ (Swaps)      │ (LND/CLN - optional) │   │
│  └─────────────┴──────────────┴──────────────────────┘   │
│           ↓             ↓                  ↓               │
│    Ark Server      Boltz Backend    Lightning Node        │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

---

## Swap System

### Swap Types
1. **Submarine Swap** (On-chain → Lightning)
   - Deposit Bitcoin on-chain
   - Receive Lightning capacity
   - Use case: Add Lightning liquidity

2. **Reverse Submarine Swap** (Lightning → On-chain)
   - Send Lightning payment
   - Receive Bitcoin on-chain
   - Use case: Drain Lightning capacity

### Swap Flow
1. **Initiate**: Request swap from Boltz backend
2. **Deposit**: Send funds to swap address (on-chain) or invoice (Lightning)
3. **Wait**: Boltz monitors blockchain/Lightning
4. **Claim**: Boltz releases funds on opposite side
5. **Complete**: Swap finalized atomically via HTLC

### VHTLC Integration
- VHTLCs enable Lightning-style swaps within Ark
- Atomic swaps between Ark VTXOs and Lightning channels
- Refund mechanism if swap fails or times out

---

## Lightning Integration

### Supported Implementations
- **LND** (Lightning Network Daemon)
- **CLN** (Core Lightning)

### Configuration
```bash
# LND
FULMINE_LND_URL=localhost:10009
FULMINE_LND_DATADIR=/path/to/.lnd

# CLN
FULMINE_CLN_URL=/path/to/lightning-rpc
FULMINE_CLN_DATADIR=/path/to/.lightning
```

### Use Cases
- **Channel Management**: Open/close channels via on-chain ↔ Lightning swaps
- **Liquidity Optimization**: Balance on-chain and Lightning funds
- **Payment Hub**: Route payments through Ark + Lightning

---

## Development Commands

### Building
```bash
# Build for your platform
make build

# Build for all platforms
make build-all

# Build static assets (web UI)
make build-static-assets

# Build HTML templates
make build-templates
```

### Testing
```bash
# Unit tests
make test

# VHTLC-specific tests
make test-vhtlc

# Integration tests (requires Docker)
make build-test-env
make up-test-env
make setup-test-env
make integrationtest
make down-test-env
```

### Running
```bash
# Development mode (with hot reload)
make run

# With CLN support
make run-cln
```

### Code Quality
```bash
# Lint code
make lint

# Static analysis
make vet

# Coverage report
make cov
```

### Protocol Buffers
```bash
# Generate proto stubs
make proto

# Lint protos
make proto-lint
```

### Database Migrations
```bash
# Create migration file
make mig_file FILE=init

# Apply migrations
make mig_up

# Rollback migrations
make mig_down

# Verify migrations
make vet_db

# Generate SQL code (sqlc)
make sqlc
```

---

## Integration Points

### Ark Server
- **Connection**: gRPC to `FULMINE_ARK_SERVER`
- **Operations**: Onboard, send offchain, redeem, settle
- **VTXOs**: Manage off-chain virtual UTXOs

### Boltz Backend
- **Connection**: HTTP/WebSocket to `FULMINE_BOLTZ_URL` and `FULMINE_BOLTZ_WS_URL`
- **Operations**: Initiate swaps, monitor status, claim funds
- **Swap Types**: Submarine and reverse submarine

### Esplora
- **Connection**: HTTP to `FULMINE_ESPLORA_URL`
- **Operations**: Query blockchain data, monitor transactions
- **Use Case**: On-chain balance and transaction history

### Lightning Node (Optional)
- **LND**: gRPC connection
- **CLN**: Unix socket or network RPC
- **Operations**: Invoice generation, payment routing, channel management

---

## Security Considerations

### Wallet Encryption
- Seed encrypted with AES-256
- User-provided password required
- Password strength requirements:
  - Minimum 8 characters
  - At least one number
  - At least one special character

### API Security
⚠️ **Current Limitation**: No authentication on REST/gRPC APIs
- Do not expose ports 7000/7001 publicly
- Use firewall rules or reverse proxy
- Access only from localhost or trusted networks

### Auto-Unlock Security
- File-based: Protect password file (chmod 600)
- Env-based: Be careful with environment visibility
- Production: Use Docker secrets or secrets management service

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
