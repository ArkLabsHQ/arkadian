# Fulmine Simulator — How to Run

## Prerequisites

### System Requirements
- **OS**: Linux, macOS, or Windows (with WSL2)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Disk**: 2GB free space
- **CPU**: 2 cores minimum

### Software Dependencies
- **Go**: 1.24.6 or higher
- **Docker**: 20.10 or higher
- **Docker Compose**: 1.29 or higher (optional, for Boltz stack)
- **Git**: For cloning repository

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator
```

### 2. Build Binaries
```bash
# Build orchestrator and client
make build

# Verify binaries created
ls -lh bin/
# Expected output:
# -rwxr-xr-x  1 user  staff   10M Nov 28 12:00 orchestrator
# -rwxr-xr-x  1 user  staff    8M Nov 28 12:00 client
```

### 3. (Optional) Install to GOPATH
```bash
make install
```

## Running on Regtest

### Setup Regtest Environment

#### 1. Start Nigiri (Bitcoin Regtest + Faucet)
```bash
docker run -d \
  --name nigiri \
  -p 3000:3000 \
  -p 18443:18443 \
  vulpemventures/nigiri

# Verify Nigiri is running
curl http://localhost:3000/faucet
```

#### 2. Start Fulmine
```bash
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest

# Verify Fulmine is running
curl http://localhost:7001
```

### Run Simulation
```bash
# Run with example config
./bin/orchestrator --config configs/regtest-5-clients.yaml

# Or use make command
make run ARGS="--config configs/regtest-5-clients.yaml"
```

### Monitor Progress
Open another terminal and watch audit log in real-time:
```bash
tail -f audit_logs/simulation_regtest_*.jsonl | jq
```

### Stop Services
```bash
# Stop containers
docker stop nigiri fulmine

# Remove containers
docker rm nigiri fulmine

# Or use make command to clean up processes
make clean-processes
```

## Running on Mutinynet

### Setup Mutinynet Environment

#### 1. Configure Fulmine for Mutinynet
```bash
docker run -d \
  --name fulmine-mutinynet \
  -p 7000:7000 \
  -p 7001:7001 \
  -e FULMINE_ARK_SERVER="https://mutiny.ark-server.example.com" \
  -e FULMINE_ESPLORA_URL="https://mutinynet.com/api" \
  -v fulmine-mutinynet-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

#### 2. Fund Orchestrator Wallet Manually
Get initial funds from Mutinynet faucet (external service).

#### 3. Update Configuration
Create `configs/mutinynet-5-clients.yaml`:
```yaml
version: "1.0"
network: "mutinynet"
clients:
  - id: "client_0"
    initial_funding_sats: 100000
  # ... more clients
rounds:
  # ... rounds definition
```

#### 4. Run Simulation
```bash
./bin/orchestrator --config configs/mutinynet-5-clients.yaml
```

## Running on Mainnet

**⚠️ WARNING**: Mainnet involves real Bitcoin. Use with extreme caution.

### Prerequisites for Mainnet
- **Real Funds**: Orchestrator wallet must have sufficient Bitcoin
- **Confirmation**: You will be prompted to type "I ACKNOWLEDGE MAINNET"
- **Fund Limits**: Configuration must specify fund limits
- **Recovery Plan**: Have emergency recovery tools ready

### Setup Mainnet Environment

#### 1. Configure Fulmine for Mainnet
```bash
docker run -d \
  --name fulmine-mainnet \
  -p 7000:7000 \
  -p 7001:7001 \
  -e FULMINE_ARK_SERVER="https://mainnet.ark-server.example.com" \
  -e FULMINE_ESPLORA_URL="https://mempool.space/api" \
  -v fulmine-mainnet-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

#### 2. Create Mainnet Configuration with Safety Limits
Create `configs/mainnet-safe-test.yaml`:
```yaml
version: "1.0"
network: "mainnet"

# REQUIRED: Fund safety limits
fund_limits:
  max_per_client_sats: 10000      # 0.0001 BTC per client
  max_total_sats: 50000           # 0.0005 BTC total

clients:
  - id: "client_0"
    initial_funding_sats: 10000
  - id: "client_1"
    initial_funding_sats: 10000

rounds:
  - number: 1
    description: "Wait and verify"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 30
      client_1:
        - type: "wait"
          duration_seconds: 30
```

#### 3. Run with Safety Confirmations
```bash
./bin/orchestrator --config configs/mainnet-safe-test.yaml

# You will be prompted:
# ⚠️  WARNING: This simulation will use MAINNET (real Bitcoin)
# ⚠️  Total funding required: 20000 sats (0.0002 BTC)
# ⚠️  Type "I ACKNOWLEDGE MAINNET" to proceed:

# Type exactly (case-sensitive):
I ACKNOWLEDGE MAINNET
```

#### 4. Monitor Closely
Watch audit log and be prepared to intervene if issues occur:
```bash
tail -f audit_logs/simulation_mainnet_*.jsonl | jq
```

## Development Mode

### Local Build and Run
```bash
# Build from local directories (faster iteration)
make build-local

# Run orchestrator directly
cd orchestrator
FULMINE_REPO=https://github.com/ArkLabsHQ/fulmine.git \
./orchestrator --config ../configs/regtest-5-clients.yaml
```

### Debug Mode
```bash
# Enable debug logging
export FULMINE_LOG_LEVEL=debug
./bin/orchestrator --config configs/regtest-5-clients.yaml
```

## Command-Line Options

### Orchestrator Options
```bash
./bin/orchestrator [OPTIONS]

Options:
  --config PATH          Path to YAML configuration file (required)
  --log-level LEVEL      Log level: debug, info, warn, error (default: info)
  --audit-dir PATH       Audit log output directory (default: ./audit_logs)
  --report-dir PATH      Report output directory (default: ./reports)
  --dry-run              Validate config without executing (default: false)
  --help                 Show help message
```

### Examples
```bash
# Dry run (validate config only)
./bin/orchestrator --config configs/regtest-5-clients.yaml --dry-run

# Custom log level
./bin/orchestrator --config configs/regtest-5-clients.yaml --log-level debug

# Custom output directories
./bin/orchestrator \
  --config configs/regtest-5-clients.yaml \
  --audit-dir /tmp/my-audits \
  --report-dir /tmp/my-reports
```

## Environment Variables

### Orchestrator Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `FULMINE_ORCHESTRATOR_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |
| `FULMINE_ORCHESTRATOR_AUDIT_DIR` | Audit log directory | `./audit_logs` |
| `FULMINE_ORCHESTRATOR_REPORT_DIR` | Report directory | `./reports` |
| `NIGIRI_FAUCET_URL` | Nigiri faucet API URL (regtest) | `http://localhost:3000` |
| `FULMINE_GRPC_URL` | Fulmine gRPC service URL | `localhost:7000` |

### Example with Environment Variables
```bash
export FULMINE_ORCHESTRATOR_LOG_LEVEL=debug
export NIGIRI_FAUCET_URL=http://192.168.1.100:3000
./bin/orchestrator --config configs/regtest-5-clients.yaml
```

## CI/CD Integration

### Running in CI Pipeline
```bash
# Example GitHub Actions workflow
- name: Run Fulmine Simulator
  run: |
    # Start services
    docker-compose up -d nigiri fulmine

    # Build simulator
    make build

    # Run simulation
    ./bin/orchestrator --config configs/ci-test.yaml

    # Check results
    test -f audit_logs/simulation_*.jsonl

    # Cleanup
    make clean-processes
```

### Docker Compose Setup (CI)
```yaml
# docker-compose.ci.yml
version: '3.8'
services:
  nigiri:
    image: vulpemventures/nigiri
    ports:
      - "3000:3000"
      - "18443:18443"

  fulmine:
    image: ghcr.io/arklabshq/fulmine:latest
    ports:
      - "7000:7000"
      - "7001:7001"
    volumes:
      - fulmine-ci-data:/app/data
```

## Cleanup

### Clean Build Artifacts
```bash
make clean
```

### Clean Running Processes
```bash
# Kill lnd-daemon and remove containers
make clean-processes
```

### Clean Everything
```bash
# Remove build artifacts and stop processes
make clean && make clean-processes

# Remove Docker containers and volumes
docker stop nigiri fulmine
docker rm nigiri fulmine
docker volume rm fulmine-data
```
