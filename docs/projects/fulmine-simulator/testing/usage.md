# Fulmine Simulator — Usage Guide

## Quick Start (Regtest)

### Prerequisites
- Go 1.24.6 or higher
- Docker (for Nigiri and Fulmine)
- Git

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

### Start Required Services

#### 1. Start Nigiri (Bitcoin Regtest + Faucet)
```bash
docker run -d \
  --name nigiri \
  -p 3000:3000 \
  -p 18443:18443 \
  vulpemventures/nigiri
```

#### 2. Start Fulmine (Wallet Daemon)
```bash
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Run a Simple Simulation
```bash
# Run 5-client regtest simulation
./bin/orchestrator --config configs/regtest-5-clients.yaml
```

**Expected Output:**
```
[INFO] Parsing configuration: configs/regtest-5-clients.yaml
[INFO] Validating configuration...
[INFO] Configuration valid. Network: regtest, Clients: 5
[INFO] Distributing initial funds...
[INFO] Distributed 100000 sats to client_0 (txid: abc123...)
[INFO] Distributed 100000 sats to client_1 (txid: def456...)
...
[INFO] Spawning 5 clients...
[INFO] All clients started. Waiting for completion...
[INFO] Round 1: Wait for funding
[INFO] Round 2: Execute swaps
...
[INFO] All clients completed. Collecting funds...
[INFO] Collected 100000 sats from client_0
[INFO] Fund recovery: 100.00% (500000/500000 sats)
[INFO] Simulation completed successfully!
[INFO] Audit log: audit_logs/simulation_regtest_20251128_123456.jsonl
```

## Configuration

### Basic Configuration
Create a YAML file (e.g., `my-simulation.yaml`):

```yaml
version: "1.0"
network: "regtest"

clients:
  - id: "client_0"
    initial_funding_sats: 100000
  - id: "client_1"
    initial_funding_sats: 100000

rounds:
  - number: 1
    description: "Wait for funding confirmation"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 10
      client_1:
        - type: "wait"
          duration_seconds: 10
```

### Run Custom Configuration
```bash
./bin/orchestrator --config my-simulation.yaml
```

## Example Configurations

### 1. Simple Wait Test (2 clients)
```yaml
# configs/regtest-2-clients-wait.yaml
version: "1.0"
network: "regtest"
clients:
  - id: "client_0"
    initial_funding_sats: 50000
  - id: "client_1"
    initial_funding_sats: 50000
rounds:
  - number: 1
    description: "Wait and verify funding"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 5
      client_1:
        - type: "wait"
          duration_seconds: 5
```

### 2. Swap Execution (5 clients)
```yaml
# configs/regtest-5-clients-swaps.yaml
version: "1.0"
network: "regtest"
clients:
  - id: "client_0"
    initial_funding_sats: 100000
  - id: "client_1"
    initial_funding_sats: 100000
  - id: "client_2"
    initial_funding_sats: 100000
  - id: "client_3"
    initial_funding_sats: 100000
  - id: "client_4"
    initial_funding_sats: 100000
rounds:
  - number: 1
    description: "Wait for funding"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 10
      client_1:
        - type: "wait"
          duration_seconds: 10
      client_2:
        - type: "wait"
          duration_seconds: 10
      client_3:
        - type: "wait"
          duration_seconds: 10
      client_4:
        - type: "wait"
          duration_seconds: 10
  - number: 2
    description: "Execute submarine swaps"
    actions:
      client_0:
        - type: "submarine_swap"
          amount_sats: 50000
      client_1:
        - type: "submarine_swap"
          amount_sats: 50000
```

## Viewing Results

### Audit Logs
```bash
# View full audit log
cat audit_logs/simulation_regtest_20251128_123456.jsonl | jq

# View only fund distribution events
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "fund_distributed")'

# View client_0 events
cat audit_logs/simulation_*.jsonl | jq 'select(.client_id == "client_0")'

# View swap events
cat audit_logs/simulation_*.jsonl | jq 'select(.event | contains("swap"))'
```

### Reports
```bash
# View final report
cat reports/simulation_regtest_20251128_123456_report.txt
```

## Development Workflow

### Build and Run Locally
```bash
# Build from local directories
make build-local

# Run with custom config
make run ARGS="--config configs/regtest-5-clients.yaml"
```

### Clean Up
```bash
# Kill running processes and remove containers
make clean-processes

# Remove build artifacts
make clean
```

## Common Use Cases

### Load Testing (50 clients)
```bash
./bin/orchestrator --config configs/regtest-50-clients.yaml
```

### Debugging a Specific Scenario
```bash
# Enable debug logging
FULMINE_LOG_LEVEL=debug ./bin/orchestrator --config my-debug-config.yaml
```

### Fund Recovery Verification
After simulation completes, check audit log for recovery percentage:
```bash
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "simulation_completed") | .recovery_percentage'
```

## Docker Usage (Alternative)

### Build Docker Image
```bash
docker build -t fulmine-simulator .
```

### Run in Docker
```bash
docker run --rm \
  --network host \
  -v $(pwd)/configs:/configs \
  -v $(pwd)/audit_logs:/audit_logs \
  fulmine-simulator --config /configs/regtest-5-clients.yaml
```
