# How to Run Ark Simulator

This guide covers setting up and running ark-simulator in local and AWS environments.

## Prerequisites

### Local Development

- **Go**: 1.24.6 or later
- **Docker**: For running Ark server stack
- **Nigiri**: Bitcoin regtest environment
- **arkd**: Running Ark server

### AWS Deployment

- **AWS Account**: With ECS/EC2 access
- **AWS CLI**: Configured with credentials
- See [AWS Setup Guide](./aws-setup.md) for detailed instructions

## Local Deployment

### 1. Setup Bitcoin Regtest

Start Nigiri for local Bitcoin regtest:

```bash
# Start Nigiri
nigiri start

# Verify it's running
nigiri status

# Mine initial blocks
nigiri rpc generatetoaddress 600 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf
```

### 2. Setup Ark Server Stack

Start the arkd stack before running simulations:

```bash
cd ${ARKD_REPO}

# Start arkd-wallet
make run-wallet

# In another terminal, start arkd
make run-light
```

Wait 10-20 seconds for services to initialize.

Verify services are running:
```bash
# Check arkd
curl http://localhost:7070/v1/info

# Check arkd-wallet
curl http://localhost:6060/v1/wallet/status
```

### 3. Clone and Build Simulator

```bash
# Clone repository (if not already cloned)
git clone https://github.com/arkade-os/ark-simulator.git
cd ark-simulator

# Install dependencies
go mod download

# Build simulator
make build
```

This creates `./build/client` binary.

### 4. Run Simulation

#### Option A: Using Makefile (Recommended)

```bash
# Run with default config
make run ARGS="--sim config/simulation1.yaml"

# Run with specific config
make run ARGS="--sim config/simulation_1_20.yaml"

# Run with custom parameters
make run ARGS="--sim config/simulation1.yaml --verbose"
```

#### Option B: Using Built Binary

```bash
./build/client --sim config/simulation1.yaml
```

#### Option C: Using go run

```bash
go run ./local/main.go --sim config/simulation1.yaml
```

### 5. Monitor Simulation

Watch the console output for:
- Round progression
- Client actions (onboard, send, claim)
- Balance updates
- Error messages

In a separate terminal, monitor arkd logs:
```bash
# If running with make run-light
# View logs in the terminal where arkd is running

# If running with docker
docker logs -f arkd
```

### 6. Verify Results

After simulation completes, check:

```bash
# Check final balances
curl http://localhost:7070/v1/wallet/balance

# Check server stats
curl http://localhost:7070/v1/info
```

## Configuration Modes

### Quick Test (5-20 clients)

For rapid iteration and testing:

```bash
make run ARGS="--sim config/simulation_1_20.yaml"
```

**Runtime**: 1-3 minutes
**Use for**: Development, CI/CD, quick validation

### Medium Scale (32-50 clients)

For performance testing:

```bash
make run ARGS="--sim config/simulation_1_32.yaml"
make run ARGS="--sim config/simulation_1_40.yaml"
make run ARGS="--sim config/simulation_1_50.yaml"
```

**Runtime**: 3-10 minutes
**Use for**: Regression testing, baseline performance

### Large Scale (100+ clients)

For capacity planning (AWS recommended):

```bash
make run ARGS="--sim config/simulation_1_128.yaml"
make run ARGS="--sim config/simulation_1_170.yaml"
make run ARGS="--sim config/simulation_1_200.yaml"
```

**Runtime**: 10-60+ minutes (local), 5-25 minutes (AWS)
**Use for**: Bottleneck identification, capacity planning

### Endurance Testing

For stability over multiple rounds:

```bash
# 20 rounds
make run ARGS="--sim config/simulation_20.yaml"

# 60 rounds
make run ARGS="--sim config/simulation_60.yaml"
```

**Runtime**: Varies by client count and rounds
**Use for**: Long-duration reliability testing

## Custom Configuration

### Create Custom Simulation

Create a new YAML file in `config/`:

```yaml
# config/my_simulation.yaml
metadata:
  name: "My Custom Simulation"
  description: "Custom test scenario"

ark_server:
  url: "http://localhost:7070"

clients:
  - id: "client_0"
  - id: "client_1"
  - id: "client_2"

rounds:
  - number: 1
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.001
      client_1:
        - type: "Onboard"
          amount: 0.001
  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0005
          to: "client_1"
  - number: 3
    actions:
      client_1:
        - type: "Claim"
```

Run your custom simulation:
```bash
make run ARGS="--sim config/my_simulation.yaml"
```

### Command-Line Options

```bash
# Verbose output
make run ARGS="--sim config/simulation1.yaml --verbose"

# Custom Ark server URL
make run ARGS="--sim config/simulation1.yaml --server http://localhost:7070"

# Help information
./build/client --help
```

## Environment Variables

Customize simulator behavior:

```bash
# Ark server URL
export ARK_SERVER_URL="http://localhost:7070"

# Timeout settings
export SIMULATION_TIMEOUT="30m"

# Log level
export LOG_LEVEL="debug"

# Run simulation
make run ARGS="--sim config/simulation1.yaml"
```

## Troubleshooting

### Simulation Fails to Start

**Problem**: "Cannot connect to Ark server"

**Solution**:
```bash
# Verify arkd is running
curl http://localhost:7070/v1/info

# If not running, start it
cd ${ARKD_REPO}
make run-light
```

### Bitcoin Regtest Issues

**Problem**: "Insufficient funds" or "Cannot broadcast transaction"

**Solution**:
```bash
# Check Nigiri is running
nigiri status

# Mine more blocks
nigiri rpc generatetoaddress 100 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf

# Fund arkd wallet
arkd_address=$(curl -s http://localhost:7070/v1/wallet/address | jq -r '.address')
nigiri faucet $arkd_address 1.0
```

### Timeout Errors

**Problem**: "Timeout waiting for round finalization"

**Solution**:
- Increase round interval in arkd config
- Reduce number of clients in simulation
- Check arkd logs for errors

### Build Failures

**Problem**: "Cannot build client binary"

**Solution**:
```bash
# Update dependencies
go mod download
go mod tidy

# Clean and rebuild
make clean
make build
```

## Performance Tips

1. **Pre-mine blocks**: Mine 600+ blocks before starting simulation
2. **Allow settling time**: Wait 10-20s between simulations
3. **Monitor resources**: Watch CPU/memory during large simulations
4. **Start small**: Test with 5-10 clients before scaling up
5. **Use AWS for scale**: 100+ clients run better in AWS environment

## Next Steps

- See [Usage Guide](./usage.md) for simulation patterns and configurations
- See [Local Deployment Guide](./local-deployment.md) for advanced local setup
- See [AWS Setup Guide](./aws-setup.md) for cloud deployment
- See [Troubleshooting Guide](./troubleshooting.md) for common issues
