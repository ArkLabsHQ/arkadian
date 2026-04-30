---
project_id: boltz-backend
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/api-reference.md"]
  dev:        ["system/architecture.md", "testing/api-reference.md"]
  monitoring: ["system/architecture.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  swaps: ["system/project_overview.md", "testing/api-reference.md"]
  integration: ["system/integration-with-arkd.md"]
scripts:
  start: "npm run start"
  dev: "npm run dev"
  compile: "npm run compile"
  compile_release: "npm run compile:release"
  test_unit: "npm run test:unit"
  docker_regtest_start: "npm run regtest:start"
  docker_regtest_stop: "npm run regtest:stop"
---

# Boltz Backend — Project Index

**boltz-backend** is the official backend powering [Boltz Exchange](https://boltz.exchange/), enabling non-custodial atomic swaps between different Bitcoin layers. It provides trustless swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM chains using Hash Time-Locked Contracts (HTLCs) and Taproot.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/system/` — System Architecture & Components
Core documentation about boltz-backend architecture and design:

- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/project_overview.md** — What boltz-backend is, swap types, and use cases
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/architecture.md** — Hybrid TypeScript + Rust architecture, components
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/integration-with-arkd.md** — How boltz-backend integrates with Ark ecosystem via fulmine

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/` — Usage & Operations
Practical guides for using and operating boltz-backend:

- **${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/usage.md** — Quick start guide (Docker and local development)
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/api-reference.md** — REST API endpoints and swap operations

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/sop/` — Standard Operating Procedures
Step-by-step guides for operations.

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/change-log/` — Recent Changes
Curated summaries of significant changes (`SYNC_HISTORY.md`, `last-sync.txt`).

---

## Key Concepts

### Swap Types
Boltz offers three types of atomic swaps:

1. **Submarine Swaps** (Chain → Lightning)
   - User sends Bitcoin on-chain
   - Receives Lightning payment
   - Use case: Add Lightning liquidity

2. **Reverse Submarine Swaps** (Lightning → Chain)
   - User pays Lightning invoice
   - Receives Bitcoin on-chain
   - Use case: Drain Lightning capacity, exit to on-chain

3. **Chain Swaps** (Chain → Chain)
   - User sends Bitcoin on one chain
   - Receives Bitcoin on another chain
   - Use case: Move between Bitcoin mainchain, Liquid, or EVM chains

### Atomic Swap Mechanism
- **HTLCs**: Hash Time-Locked Contracts ensure trustless execution
- **Preimage/Hash**: User generates preimage, server locks funds with hash
- **Claim/Refund**: User claims with preimage, or refunds after timeout
- **Taproot**: Key path spends for privacy and efficiency

### Supported Chains
- **Bitcoin Mainchain**: Native Bitcoin blockchain
- **Lightning Network**: Off-chain payment channels
- **Liquid**: Bitcoin sidechain with confidential transactions
- **EVM Chains**: Ethereum and EVM-compatible networks

---

## Quick Reference

### REST API
```bash
# Get supported swap pairs
curl https://api.boltz.exchange/getpairs

# Create submarine swap (Chain → Lightning)
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{"type":"submarine","pairId":"BTC/BTC","orderSide":"sell","invoice":"lnbc..."}'

# Create reverse submarine swap (Lightning → Chain)
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{"type":"reversesubmarine","pairId":"BTC/BTC","orderSide":"buy","preimageHash":"..."}'

# Get swap status
curl https://api.boltz.exchange/swapstatus?id=<swap_id>
```

### Docker Deployment
```bash
# Clone repository
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend

# Start regtest environment (Bitcoin + Lightning + Liquid)
npm run regtest:start

# Stop regtest environment
npm run regtest:stop
```

### Local Development
```bash
# Prerequisites: Node.js 20+, Rust toolchain
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend

# Install dependencies
npm install

# Compile TypeScript + Rust
npm run compile

# Run backend
npm run dev
```

---

## Configuration

### Database
- **PostgreSQL**: Primary database (production)
- **SQLite**: Development and testing
- **Sequelize ORM**: Database abstraction layer

### Lightning Integration
- **LND**: gRPC integration
- **CLN**: gRPC integration (boltzr sidecar) — pinned to **v26.04.1**
- **BOLT12**: Support for offers and blinded paths (hardened)

### Bitcoin / Liquid Nodes
- **Bitcoin Core**: **v31.0**
- **Elements (Liquid)**: **v23.3.3**

### Fulmine Integration
- **Macaroon authentication** for Fulmine RPCs (also exposed by `boltzr-cli`)
- Uses Fulmine **`ListVHTLCs`** for VHTLC discovery
- Optimized startup call sequence to Fulmine

### Observability
- **Prometheus**: Metrics collection
- **OpenTelemetry**: Distributed tracing
- **Grafana**: Visualization (via Loki integration)

---

## Architecture Overview

### Hybrid TypeScript + Rust Stack

**TypeScript Components** (`lib/`):
- `api/`: REST API server (Express)
- `service/`: Swap orchestration and state management
- `swap/`: Swap logic (submarine, reverse, chain)
- `chain/`: Bitcoin/Liquid blockchain integration
- `lightning/`: Lightning Network integration (LND/CLN)
- `db/`: Database models and migrations (Sequelize)
- `wallet/`: Wallet management and UTXO selection
- `grpc/`: gRPC client for Lightning nodes

**Rust Components** (`boltzr/`, `boltz-core/`):
- `boltzr`: High-performance Lightning sidecar (CLN integration, swap logic)
- `boltz-core`: Core cryptographic operations (Taproot, HTLCs)
- `boltzr-cli`: Command-line interface for boltzr

### Service Flow
```
┌─────────────────────────────────────────────────────────┐
│                   Boltz Backend                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  REST API (Express)  ←→  Swap Service                   │
│                           ↓                               │
│  ┌─────────────┬──────────────┬──────────────────────┐ │
│  │ Chain Layer │ Lightning    │ Wallet Manager       │ │
│  │ (Bitcoin,   │ Integration  │ (UTXO selection)     │ │
│  │  Liquid,    │ (LND, CLN)   │                      │ │
│  │  EVM)       │              │                      │ │
│  └─────────────┴──────────────┴──────────────────────┘ │
│           ↓             ↓                  ↓             │
│    Bitcoin Node   Lightning Node      PostgreSQL        │
│   (bitcoind/btcd)  (LND/CLN)          (Database)        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Fulmine Integration
- **Purpose**: Fulmine uses boltz-backend for Lightning Network swaps
- **Swap Types**: Submarine and reverse submarine swaps
- **Use Case**: Convert Ark VTXOs to/from Lightning liquidity
- **Implementation**: Fulmine acts as API client to boltz-backend

### Ark Ecosystem Integration
- **Via Fulmine**: Ark users access boltz swaps through fulmine wallet
- **Liquidity Management**: Move between Ark (VTXOs), Lightning, and on-chain
- **Use Cases**:
  - Add Lightning liquidity from Ark off-chain balance
  - Exit Ark to Lightning or on-chain Bitcoin
  - Route payments across Ark + Lightning networks

See `system/integration-with-arkd.md` for detailed integration patterns.

---

## API Documentation

Boltz provides comprehensive API documentation:
- **V1 API**: Legacy endpoints (deprecated)
- **V2 API**: Current recommended API
- **Swagger UI**: Interactive API explorer

See `testing/api-reference.md` for endpoint details.

---

## Documentation Size Guidelines

To keep context lean for AI agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
