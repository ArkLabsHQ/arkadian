# Fulmine Simulator - Usage Guide

## Quick Start

### Prerequisites
- Go 1.21 or higher
- Docker (for LND clients)
- Nigiri running with faucet (for regtest)
- Fulmine instance on localhost:7001 (for regtest)

### Installation

```bash
# Clone repository
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator

# Build binaries
make build

# Verify installation
./bin/orchestrator --help
```

### Run First Simulation

```bash
# Run with example config
make run CONFIG=configs/regtest-5-clients.yaml

# Or run orchestrator directly
./bin/orchestrator --config configs/test.yaml
```

## Configuration

### Basic Configuration

Create a YAML file (e.g., `my-simulation.yaml`):

```yaml
version: "1.0"
network: "regtest"

clients:
  - id: "alice"
    initial_funding_sats: 100000
  - id: "bob"
    initial_funding_sats: 100000

rounds:
  - number: 1
    description: "Initial wait"
    actions:
      alice:
        - type: "wait"
          duration_seconds: 5
      bob:
        - type: "wait"
          duration_seconds: 5
```

### Action Types

| Action | Description | Parameters |
|--------|-------------|------------|
| `wait` | Wait for duration | `duration_seconds` |
| `swap` | Submarine swap | `amount_sats` |
| `reverse_swap` | Reverse submarine swap | `amount_sats` |
| `assert_balance` | Verify balance | `expected_sats`, `tolerance` |

### Network Configuration

**Regtest** (default):
```yaml
network: "regtest"
# Uses Nigiri faucet for funding
```

**Mutinynet**:
```yaml
network: "mutinynet"
# Uses Mutinynet faucet for funding
```

**Mainnet** (requires extra safety):
```yaml
network: "mainnet"
safety:
  max_total_sats: 1000000
  max_per_client_sats: 100000
  require_confirmation: true
```

## Running Simulations

### Using Make

```bash
# Default config
make run

# Custom config
make run CONFIG=configs/my-simulation.yaml

# With additional args
make run CONFIG=configs/test.yaml ARGS="--verbose"
```

### Direct Execution

```bash
./bin/orchestrator --config configs/my-simulation.yaml
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--config` | Path to YAML config file |
| `--verbose` | Enable verbose logging |
| `--dry-run` | Validate config without executing |

## Monitoring

### During Simulation

The orchestrator outputs progress to stdout:

```
[INFO] Loading config: configs/test.yaml
[INFO] Network: regtest
[INFO] Clients: 5
[INFO] Distributing funds...
[INFO] Spawning clients...
[INFO] Executing round 1/3...
[INFO] Collecting funds...
[INFO] Recovery: 100% (500000/500000 sats)
```

### Audit Logs

All simulations generate audit logs:

```bash
# View latest audit log
cat audit_logs/simulation_regtest_*.jsonl | jq

# Filter by event type
cat audit_logs/*.jsonl | jq 'select(.event == "fund_distributed")'
```

## Example Configs

### Simple 2-Client Test
```yaml
version: "1.0"
network: "regtest"
clients:
  - id: "client_0"
    initial_funding_sats: 50000
  - id: "client_1"
    initial_funding_sats: 50000
rounds:
  - number: 1
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 10
```

### Swap Simulation
```yaml
version: "1.0"
network: "regtest"
clients:
  - id: "swapper"
    initial_funding_sats: 200000
rounds:
  - number: 1
    actions:
      swapper:
        - type: "swap"
          amount_sats: 50000
  - number: 2
    actions:
      swapper:
        - type: "reverse_swap"
          amount_sats: 25000
```

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for common issues.
