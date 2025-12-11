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
go mod download

# Build orchestrator binary
make build
# Binary created at: ./orchestrator/bin/orchestrator
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
make run ARGS="--sim ./configs/fulmine-endpoints-test.yaml"

# Or run binary directly
./orchestrator/bin/orchestrator --sim ./configs/fulmine-endpoints-test.yaml
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
./orchestrator/bin/orchestrator --sim ./configs/mutinynet-test.yaml
```

## Running on Mainnet

### Safety Requirements

Mainnet requires explicit acknowledgment:

```bash
# Will prompt for confirmation
./orchestrator/bin/orchestrator --sim ./configs/mainnet-production.yaml
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
./orchestrator/bin/orchestrator --sim mainnet.yaml --show-address

# Send Bitcoin to this address
# Wait for confirmations
# Then run simulation
```

## Development Mode

### Verbose Logging

```bash
./orchestrator/bin/orchestrator --sim test.yaml --verbose
```

### Dry Run

Validate configuration without executing:

```bash
./orchestrator/bin/orchestrator --sim test.yaml --dry-run
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

# Kill lingering processes (manual)
pkill -f orchestrator || true
```

### Docker Cleanup

```bash
# Remove LND client containers
docker ps -a | grep lnd-client | awk '{print $1}' | xargs docker rm -f
```

## Common Commands

```bash
# Build orchestrator
make build

# Run with custom config
make run ARGS="--sim ./configs/your-config.yaml"

# Run vet (static analysis)
make vet

# Clean build artifacts
make clean

# Show help
make help
```
