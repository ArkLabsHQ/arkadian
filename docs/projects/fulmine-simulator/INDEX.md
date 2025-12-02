---
project_id: fulmine-simulator
version: 1.0.0
last_sync_commit: f65b94d248e83afbc5e5b41efb5b750f32004d4e
last_sync_date: 2025-12-02T15:30:00Z
repository_path: ${FULMINE_SIMULATOR_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/fulmine-simulator
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  simulation: ["testing/usage.md", "system/architecture.md"]
scripts:
  build: "make build"
  build_all: "make build-all"
  run: "make run CONFIG=configs/test.yaml"
  test: "make test"
  integration: "make integrationtest"
  lint: "make lint"
  coverage: "make coverage"
  clean: "make clean"
---

# Fulmine Simulator - Project Index

**fulmine-simulator** is a testing and simulation tool for validating the Fulmine/Boltz swap stack and Arkade wallet integration. It simulates multiple concurrent clients performing submarine and reverse swaps to stress-test the infrastructure, verify swap flows, and ensure fund recovery. Supports three networks (regtest, mutinynet, mainnet) with YAML-based configuration, automated fund management, comprehensive audit logging, and mainnet safety features.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/` - System Architecture & Components
Core documentation about fulmine-simulator architecture and design:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/project_overview.md** - What fulmine-simulator is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/system/architecture.md** - Orchestrator-client architecture, components, data flow

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/` - Usage & Operations
Practical guides for using and operating fulmine-simulator:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/usage.md** - Quick start guide, configuration examples
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_run.md** - Running simulations on different networks
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_test.md** - Testing guide (unit, integration)
- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/troubleshooting.md** - Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/sop/` - Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/fulmine-simulator/sop/development-workflow.md** - Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/tasks/` - Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` - Sync Tracking & History
- **change-log/last-sync.txt** - Last synced commit hash
- **change-log/SYNC_HISTORY.md** - History of documentation syncs

### `pr-report/` - Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

### Prerequisites
- Go 1.21 or higher
- (For regtest) Nigiri running with faucet available
- (For regtest) Fulmine instance running on localhost:7001

### Build & Run
```bash
# Build binaries
make build

# Run simulation with config
make run CONFIG=configs/regtest-5-clients.yaml

# Or run directly
./bin/orchestrator --config configs/test.yaml
```

### Testing
```bash
# Unit tests
make test

# Integration tests (requires Nigiri/Fulmine stack)
make integrationtest

# Coverage report
make coverage
```

---

## Configuration

### YAML Configuration Structure
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
```

### Networks
| Network | Description | Faucet |
|---------|-------------|--------|
| `regtest` | Local development | Nigiri faucet |
| `mutinynet` | Testnet | Mutinynet faucet |
| `mainnet` | Production | Manual funding |

---

## Key Features

- **Multi-Network Support**: Regtest, Mutinynet, Mainnet
- **YAML Configuration**: Human-readable simulation definitions
- **Fund Management**: Automated distribution and 100% recovery tracking
- **Audit Logging**: JSON Lines format, crash-resistant
- **Mainnet Safety**: Fund limits, confirmation prompts, mandatory recovery
- **Concurrent Clients**: Support for 50+ clients
- **Orchestrator Pattern**: Scalable client management

---

## Mainnet Safety

When running on mainnet, the simulator enforces:

1. **Fund Limits**: Configurable per-client and total limits
2. **Explicit Confirmation**: Must type "I ACKNOWLEDGE MAINNET"
3. **Network Validation**: Verifies chain parameters
4. **100% Recovery Requirement**: Fails if funds not fully recovered
5. **Emergency Recovery**: Manual tools for failure scenarios

---

## Audit Logs

All simulations generate audit logs:

```bash
# View audit log
cat audit_logs/simulation_regtest_20251026_123456.jsonl | jq

# Analyze fund movements
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "fund_distributed")'
```

---

## Integration Points

- **Fulmine**: Swap execution via gRPC API
- **Boltz**: Swap provider (via Fulmine)
- **Nigiri**: Regtest Bitcoin/LN funding
- **LND**: Lightning Network integration

