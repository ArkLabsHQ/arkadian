---
project_id: fulmine-simulator
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md", "testing/how_to_run.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md", "system/architecture.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  config: ["testing/usage.md"]
scripts:
  build: "make build"
  build_local: "make build-local"
  test: "make test"
  integration: "make integrationtest"
  run: "make run ARGS='--config configs/regtest-5-clients.yaml'"
  lint: "make lint"
  coverage: "make coverage"
  clean: "make clean"
  clean_processes: "make clean-processes"
---

# Fulmine Simulator — Project Index

**fulmine-simulator** is a Lightning Network swap simulator that simulates multiple concurrent clients performing submarine and reverse swaps through a Fulmine/Boltz stack. It supports three networks: regtest (local development with Nigiri faucet), mutinynet (testnet), and mainnet (production with strict fund management). The simulator uses an orchestrator-client pattern with YAML-based configuration, round-based execution, automated fund distribution/collection, comprehensive audit logging, and full fund recovery tracking.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/` — System Architecture & Components
Core documentation about fulmine-simulator architecture and design:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/project_overview.md** — What fulmine-simulator is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/architecture.md** — Orchestrator-client pattern, components, and data flow

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/` — Usage & Operations
Practical guides for using and operating fulmine-simulator:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/usage.md** — Quick start guide and configuration examples
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_run.md** — Running simulations on different networks
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_test.md** — Testing guide (unit, integration)
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/sop/development-workflow.md** — Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/change-log/` — Sync Tracking & History
Documentation sync tracking and change history:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/change-log/last-sync.txt** — Last synced commit hash
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/change-log/SYNC_HISTORY.md** — History of documentation syncs

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Multi-Network Support
- **Regtest**: Local development using Nigiri faucet for Bitcoin, localhost Fulmine instance
- **Mutinynet**: Bitcoin testnet for realistic testing without real funds
- **Mainnet**: Production use with strict safety measures (fund limits, confirmations, recovery)

### Orchestrator-Client Pattern
- **Orchestrator**: Coordinates simulation lifecycle, manages funds, spawns clients, monitors progress
- **Clients**: Lightweight gRPC clients that connect to shared Fulmine instance and execute swaps
- **Fund Management**: Orchestrator distributes initial funds, tracks all movements, collects funds back, verifies 100% recovery

### YAML-Based Configuration
- **Simple Format**: Human-readable YAML files define clients, funding, and round-based actions
- **Validation**: Configuration validated before simulation starts
- **Examples**: Multiple example configs provided in `configs/` directory

### Audit Logging
- **JSON Lines Format**: Each fund movement logged as structured JSON event
- **Crash-Resistant**: Append-only logging ensures no data loss
- **Analysis**: Easy to query and analyze with `jq` or similar tools

### Mainnet Safety
- **Fund Limits**: Per-client and total funding limits enforced
- **Confirmation Prompts**: User must type "I ACKNOWLEDGE MAINNET" exactly
- **Network Validation**: Verifies blockchain parameters match configuration
- **Recovery Requirement**: Simulation fails if funds not fully recovered
- **Emergency Tools**: Manual recovery utilities for failure scenarios

---

## Quick Reference

### Installation
```bash
# Clone repository
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator

# Build binaries
make build

# Verify installation
./bin/orchestrator --help
./bin/client --help
```

### Running a Simple Simulation (Regtest)
```bash
# Prerequisites: Nigiri running, Fulmine on localhost:7001

# Run 5-client regtest simulation
./bin/orchestrator --config configs/regtest-5-clients.yaml
```

### Development Build and Run
```bash
# Build from local directories
make build-local

# Run with custom config
make run ARGS="--config configs/regtest-5-clients.yaml"

# Clean up processes and containers
make clean-processes
```

### Testing
```bash
# Run unit tests
make test

# Run integration tests (requires stack)
make integrationtest

# Lint code
make lint

# Generate coverage report
make coverage
```

---

## Configuration

### YAML Structure
```yaml
version: "1.0"
network: "regtest"  # regtest, mutinynet, or mainnet

clients:
  - id: "client_0"
    initial_funding_sats: 100000
  - id: "client_1"
    initial_funding_sats: 100000

rounds:
  - number: 1
    description: "Wait for funding"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 5
      client_1:
        - type: "wait"
          duration_seconds: 5
```

See `configs/` directory for more examples.

---

## Architecture Overview

### Orchestrator-Client Pattern
```
┌─────────────────────────────────────────────────────┐
│                  Orchestrator                        │
│  - Parses YAML config                               │
│  - Distributes initial funds                        │
│  - Spawns client processes                          │
│  - Monitors execution                               │
│  - Collects funds                                   │
│  - Generates reports                                │
└──────────────┬──────────────────────────────────────┘
               │ spawns
               ├─────────┬─────────┬─────────┐
               ▼         ▼         ▼         ▼
            Client_0  Client_1  Client_2  Client_N
               │         │         │         │
               └─────────┴─────────┴─────────┘
                         │
                         ▼
                  Fulmine/Boltz
                  (Swap Provider)
```

### Project Structure
```
fulmine-simulator/
├── cmd/
│   ├── orchestrator/    # Main orchestrator binary
│   └── client/          # Client binary
├── orchestrator/        # Orchestrator logic (Go)
├── fulmine-client/      # Fulmine gRPC client
├── lnd-client/          # LND client wrapper
├── arkade-client/       # Arkade client (Ark protocol)
├── boltz-stack/         # Boltz backend Docker setup
├── configs/             # Example YAML configurations
├── scripts/             # Utility scripts
└── docs/                # Design documents and specs
```

---

## Development Status

### ✅ Phase 1: Setup (Complete)
- Project structure
- Dependencies
- Build system

### ✅ Phase 2: Foundational (Complete)
- Data models
- Configuration parsing and validation
- Audit logging infrastructure
- Network configuration management

### ✅ Phase 3: User Story 1 - Regtest MVP (Complete)
- Nigiri faucet integration
- Fund distribution and collection
- Client process management
- Basic orchestration lifecycle

### 🚧 Phase 4: User Story 2 - Swap Execution (In Progress)
- Fulmine REST API client
- Submarine swap execution
- Reverse swap execution

### 📋 Upcoming Phases
- Phase 5: Multi-Network (Mutinynet, Mainnet basic)
- Phase 6: Mainnet Safety (Limits, confirmations, recovery)
- Phase 7: Monitoring (Progress tracking, reporting)
- Phase 8: Polish & Testing

---

## Integration Points

### Fulmine
- **Connection**: gRPC client connects to Fulmine instance (default: localhost:7001)
- **Operations**: Wallet creation, swap execution, balance queries
- **Use Case**: Clients perform submarine and reverse swaps

### Boltz Backend
- **Connection**: HTTP/WebSocket to Boltz API
- **Operations**: Swap initiation, status monitoring, fund claiming
- **Integration**: Via Fulmine (clients don't interact directly with Boltz)

### Nigiri (Regtest Only)
- **Connection**: HTTP to Nigiri faucet API (default: localhost:3000)
- **Operations**: Fund distribution to orchestrator, fund collection after simulation
- **Use Case**: Automated Bitcoin funding for local development

### LND (Lightning Network Daemon)
- **Connection**: gRPC to LND instances (via lnd-client wrapper)
- **Operations**: Channel management, invoice generation, payment routing
- **Use Case**: Lightning side of submarine/reverse swaps

---

## Mainnet Safety Features

**⚠️ IMPORTANT**: Mainnet operations involve real Bitcoin. The simulator enforces multiple safety layers:

1. **Fund Limits**: Configurable per-client and total limits
2. **Explicit Confirmation**: Must type "I ACKNOWLEDGE MAINNET"
3. **Network Validation**: Verifies chain parameters match configuration
4. **100% Recovery Requirement**: Simulation fails if funds not fully recovered
5. **Emergency Recovery**: Manual recovery tools for failure scenarios

---

## Audit Logs

All simulations generate audit logs in JSON Lines format:

```bash
# View audit log
cat audit_logs/simulation_regtest_20251026_123456.jsonl | jq

# Analyze fund movements
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "fund_distributed")'

# Track specific client
cat audit_logs/simulation_*.jsonl | jq 'select(.client_id == "client_0")'
```

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **SOP procedures**: ≤ 120 lines
- **troubleshooting**: ≤ 150 lines

Keep files focused and cross-reference when needed.
