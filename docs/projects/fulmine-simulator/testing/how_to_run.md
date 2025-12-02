# Fulmine Simulator - How to Run

## Prerequisites

### Required
- Go 1.21 or higher
- Docker and Docker Compose
- Make

### For Regtest
- [Nigiri](https://github.com/vulpemventures/nigiri) running
- Fulmine instance on `localhost:7001`

### For Mutinynet
- Internet connection
- Mutinynet faucet access

### For Mainnet
- Manual wallet funding
- Enhanced safety awareness

## Installation

```bash
# Clone repository
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator

# Download dependencies
make deps

# Build all binaries
make build-all
```

## Running on Regtest

### 1. Start Nigiri

```bash
# Start Nigiri with all services
nigiri start

# Verify faucet is available
curl http://localhost:3000/faucet
```

### 2. Start Fulmine

```bash
# In a separate terminal
cd /path/to/fulmine
make run-regtest
```

### 3. Run Simulation

```bash
# Use example regtest config
make run CONFIG=configs/regtest-5-clients.yaml

# Or custom config
./bin/orchestrator --config my-config.yaml
```

## Running on Mutinynet

### 1. Configure for Mutinynet

```yaml
version: "1.0"
network: "mutinynet"

clients:
  - id: "client_0"
    initial_funding_sats: 100000

rounds:
  - number: 1
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 30
```

### 2. Run Simulation

```bash
./bin/orchestrator --config configs/mutinynet-test.yaml
```

## Running on Mainnet

### Safety Requirements

Mainnet requires explicit acknowledgment:

```bash
# Will prompt for confirmation
./bin/orchestrator --config configs/mainnet-production.yaml
# Type: I ACKNOWLEDGE MAINNET
```

### Configuration

```yaml
version: "1.0"
network: "mainnet"

safety:
  max_total_sats: 1000000      # 0.01 BTC total
  max_per_client_sats: 100000  # 0.001 BTC per client
  require_confirmation: true

clients:
  - id: "production_client"
    initial_funding_sats: 50000
```

### Pre-Funding

For mainnet, fund the orchestrator wallet before running:

```bash
# Get orchestrator address
./bin/orchestrator --config mainnet.yaml --show-address

# Send Bitcoin to this address
# Wait for confirmations
# Then run simulation
```

## Development Mode

### Verbose Logging

```bash
./bin/orchestrator --config test.yaml --verbose
```

### Dry Run

Validate configuration without executing:

```bash
./bin/orchestrator --config test.yaml --dry-run
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FULMINE_URL` | Fulmine gRPC endpoint | `localhost:7001` |
| `NIGIRI_FAUCET_URL` | Nigiri faucet endpoint | `http://localhost:3000/faucet` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Cleanup

### After Simulation

```bash
# Clean build artifacts
make clean

# Kill lingering processes
make clean-processes
```

### Docker Cleanup

```bash
# Remove LND client containers
docker ps -a | grep lnd-client | awk '{print $1}' | xargs docker rm -f
```

## Common Commands

```bash
# Build
make build

# Run with default config
make run

# Run with custom config
make run CONFIG=path/to/config.yaml

# Run tests
make test

# Clean everything
make clean && make clean-processes
```
