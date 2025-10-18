# Ark Simulator - Local Deployment Guide

## Overview

Local deployment runs ark-simulator on a single machine using Nigiri for Bitcoin regtest environment. Suitable for development, functional testing, and small-scale load testing (up to ~50 clients).

## Prerequisites

### Required Software

**1. Bitcoin Regtest Environment - Nigiri**:

Install Nigiri (Docker-based Bitcoin regtest + Esplora):
```bash
curl https://getnigiri.vulpem.com | bash
```

Verify installation:
```bash
nigiri --version
```

**2. Ark Server (arkd)**:

Clone and build arkd:
```bash
cd ${ARKD_REPO}
make build
```

**3. Go Development Environment**:

Verify Go 1.24+ installed:
```bash
go version
```

**4. Ark Simulator**:

Clone repository:
```bash
git clone https://github.com/arkade-os/ark-simulator.git
cd ark-simulator
```

Build client binary (optional, auto-built on first run):
```bash
make build
```

### System Requirements

**Minimum**:
- CPU: 4 cores
- RAM: 8 GB
- Disk: 5 GB free space
- OS: macOS, Linux (Windows via WSL2)

**Recommended for 50+ clients**:
- CPU: 8+ cores
- RAM: 16 GB
- Disk: 10 GB free space

## Setup Process

### 1. Start Bitcoin Regtest Environment

Start Nigiri (Bitcoin node + Esplora explorer):
```bash
nigiri start
```

Wait for startup (30-60 seconds), then verify:
```bash
# Check Bitcoin node responsive
curl http://localhost:18443

# Check Esplora API
curl http://localhost:3000/api/blocks/tip/height
```

Mine initial blocks (required for wallet operation):
```bash
nigiri faucet <bitcoin_address>
```

### 2. Configure Ark Server

Create arkd configuration (example for regtest):
```bash
cd ${ARKD_REPO}
export ARKD_PORT=7070
export ARKD_NETWORK=regtest
export ARKD_ESPLORA_URL=http://localhost:3000
export ARKD_ROUND_INTERVAL=30
export ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1
export ARKD_ROUND_MAX_PARTICIPANTS_COUNT=200
export ARKD_DB_TYPE=sqlite
export ARKD_LIVE_STORE_TYPE=inmemory
```

Or use pre-configured environment file:
```bash
source envs/arkd.light.env
```

### 3. Start Ark Wallet (with Signer)

In a separate terminal:
```bash
cd ${ARKD_REPO}
make run-wallet
```

Expected output:
```
[arkd-wallet] Starting wallet on port 6060
[arkd-wallet] Signer enabled
[arkd-wallet] Connected to NBXplorer
```

### 4. Start Ark Server

In another terminal:
```bash
cd ${ARKD_REPO}
make run-light
```

Wait for server ready message:
```
[arkd] Server listening on :7070
[arkd] Wallet connected
[arkd] Round scheduler started
```

### 5. Verify Stack Health

Check all components responsive:
```bash
# Bitcoin regtest
curl http://localhost:3000/api/blocks/tip/height

# Ark Server
grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo

# Ark Wallet
curl http://localhost:6060/wallet/balance
```

## Running Simulations

### Single-Process Mode (Default)

Orchestrator and clients run in same process, sharing memory:

```bash
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation1.yaml"
```

**Characteristics**:
- Fastest startup time
- Lower resource usage
- Simplified debugging (single process logs)
- Best for: Development, functional testing, small simulations (<20 clients)

### Multi-Process Mode

Orchestrator and clients run as separate processes:

**Step 1**: Start client processes (one per client):
```bash
# Terminal 1: Client 0
./build/client --id client_0 --orchestrator http://localhost:9000

# Terminal 2: Client 1
./build/client --id client_1 --orchestrator http://localhost:9000

# Terminal N: Client N
./build/client --id client_N --orchestrator http://localhost:9000
```

**Step 2**: Start orchestrator:
```bash
make run-web ARGS="--sim config/simulation1.yaml"
```

**Characteristics**:
- More realistic (separate network calls)
- Higher resource usage
- Independent client failure isolation
- Best for: Testing client resilience, simulating network conditions

**Note**: Multi-process mode is primarily used for AWS deployment. For local testing, single-process mode is recommended.

## Deployment Modes Comparison

| Feature | Single-Process | Multi-Process |
|---------|----------------|---------------|
| Setup Complexity | Low | Medium |
| Resource Usage | Lower | Higher |
| Startup Time | Fast (~5s) | Slower (~30s) |
| Network Realism | No network calls | Real network calls |
| Debugging | Easier (single log) | Harder (multiple logs) |
| Client Isolation | No | Yes |
| Recommended For | Dev, functional tests | Network testing, AWS prep |

## Configuration Selection

### Small-Scale Testing (5-20 clients)

Use pre-configured small simulations:
```bash
make run ARGS="--sim config/simulation_1_20.yaml"
```

Expected runtime: 1-3 minutes

### Medium-Scale Testing (20-50 clients)

Requires adequate CPU resources:
```bash
make run ARGS="--sim config/simulation_1_40.yaml"
```

Expected runtime: 5-10 minutes

Monitor CPU usage during run:
```bash
top -pid $(pgrep -f "go run")
```

### Large-Scale Testing (50+ clients)

Local deployment possible but slow. Consider AWS for >50 clients.

```bash
make run ARGS="--sim config/simulation_1_50.yaml"
```

Expected runtime: 15-30+ minutes

## Monitoring Local Simulations

### View Ark Server Logs

Follow server logs in real-time:
```bash
# If running via make
tail -f /tmp/arkd.log

# If running via docker
docker logs -f arkd
```

### View Simulation Output

Simulation logs print to stdout. Redirect to file:
```bash
make run ARGS="--sim config/simulation1.yaml" 2>&1 | tee simulation.log
```

### Check Bitcoin Blockchain State

Query current block height:
```bash
curl http://localhost:3000/api/blocks/tip/height
```

View recent transactions:
```bash
curl http://localhost:3000/api/txs/recent
```

## Cleanup and Reset

### Stop All Services

```bash
# Stop Nigiri
nigiri stop

# Stop arkd (Ctrl+C in terminal)
# Stop arkd-wallet (Ctrl+C in terminal)
```

### Reset State for Fresh Run

Clear Ark Server state:
```bash
cd ${ARKD_REPO}
rm -rf ~/.arkd
```

Restart Nigiri with fresh blockchain:
```bash
nigiri stop
nigiri start --delete
```

### Quick Restart Sequence

```bash
# Stop and restart all services
nigiri stop && nigiri start
cd ${ARKD_REPO}&& make run-wallet &
cd ${ARKD_REPO}&& make run-light &
cd ${ARK_SIMULATOR_REPO} && make run ARGS="--sim config/simulation1.yaml"
```

## Next Steps

- See `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/usage.md` for simulation usage patterns
- See `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/troubleshooting.md` for common issues
- See `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/aws-setup.md` for large-scale deployment
