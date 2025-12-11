# Ark Operations Skill

## SKILL TYPE: Hybrid Router

This skill routes operational tasks to specialized agents while handling simple queries directly.

## USE WHEN

User requests related to:
- Setting up Ark projects (arkd, fulmine, ark-simulator)
- Running tests and validations
- Troubleshooting environment issues
- Verifying service health
- Starting/stopping services
- Running simulations

## ROUTING LOGIC

This skill analyzes the request and either:
1. **Handles directly** - For simple queries, status checks, and documentation references
2. **Routes to ark-env-tester** - For environment provisioning, testing, and validation
3. **Routes to ark-developer** - For code changes or debugging

## DECISION TREE

```
User Request
│
├─ Documentation/Info Query?
│  └─ Handle directly → Provide docs/commands
│
├─ Setup/Test/Validate?
│  └─ Route to ark-env-tester
│
└─ Code Issue/Bug?
   └─ Route to ark-developer
```

## DIRECT HANDLING SCENARIOS

### Scenario 1: Command Reference

**User asks**: "How do I run arkd in light mode?"

**Response**:
```bash
cd ${ARKD_REPO}
make run-light
```

See: `${ARKADIAN_DIR}/docs/projects/arkd/testing/how_to_run.md`

### Scenario 2: Quick Status Check

**User asks**: "How do I check if arkd is running?"

**Response**:
```bash
curl -s http://localhost:7070/v1/info | jq .
```

### Scenario 3: Common Command Sequences

**User asks**: "What's the startup sequence for Ark?"

**Response**: Reference the startup sequence document:
`${ARKADIAN_DIR}/sessions/[latest]/artifacts/S1/startup_sequence.md`

Or provide inline summary:
1. Start Nigiri: `nigiri start`
2. Start arkd-wallet: `make run-wallet`
3. Start arkd: `make run-light`
4. Initialize wallet: `arkd wallet create --password test123`

## ROUTING SCENARIOS

### Route to ark-env-tester

When user requests involve:
- Setting up test environments
- Running test suites (unit, integration, E2E)
- Validating configurations
- Environment health checks
- Performance testing
- Simulation runs

**Example requests**:
- "Set up and test the arkd environment"
- "Run integration tests for fulmine"
- "Validate the arkd configuration"
- "Run a simulation with 50 clients"
- "Test the full stack"

**How to route**:
```
The user is requesting [environment setup/testing/validation].
I will route this to ark-env-tester.

Invoking ark-env-tester with execution specification...
```

### Route to ark-developer

When user requests involve:
- Code issues or bugs
- Implementation changes
- Debugging failures
- Fixing tests
- Adding features

**Example requests**:
- "The arkd service is crashing, can you debug?"
- "Fix the failing integration test"
- "Add logging to this function"

**How to route**:
```
The user is requesting [code debugging/changes].
I will route this to ark-developer.

Invoking ark-developer with task specification...
```

## QUICK REFERENCE COMMANDS

### Nigiri (Bitcoin Regtest)

```bash
# Start Nigiri
nigiri start

# Check status
nigiri status

# Mine blocks
nigiri rpc generatetoaddress 600 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf

# Fund address
nigiri faucet <address> 1.0

# Stop Nigiri
nigiri stop
```

### arkd Operations

```bash
# Start arkd-wallet
cd ${ARKD_REPO}
make run-wallet

# Start arkd (light mode)
cd ${ARKD_REPO}
make run-light

# Start arkd (full mode)
cd ${ARKD_REPO}
make run

# Run unit tests
cd ${ARKD_REPO}
make test

# Run integration tests
cd ${ARKD_REPO}
make integrationtest

# Run simulation
cd ${ARKD_REPO}
make run-simulation CLIENTS=10

# Check arkd health
curl http://localhost:7070/v1/info

# Check arkd-wallet health
curl http://localhost:6060/v1/wallet/status
```

### Fulmine Operations

```bash
# Build test environment
cd ${FULMINE_REPO}
make build-test-env

# Start test environment
cd ${FULMINE_REPO}
docker compose -f test.docker-compose.yml up -d

# Setup test environment
cd ${FULMINE_REPO}
make setup-test-env

# Run unit tests
cd ${FULMINE_REPO}
make test

# Run integration tests
cd ${FULMINE_REPO}
make integrationtest

# Stop test environment
cd ${FULMINE_REPO}
make down-test-env

# Check Fulmine health
curl http://localhost:7001/api/v1/wallet/status
```

### Ark Simulator Operations

```bash
# Build simulator
cd ${ARK_SIMULATOR_REPO}
make build

# Run smoke test (20 clients)
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation_1_20.yaml"

# Run standard test (70 clients)
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation1.yaml"

# Run large scale (128 clients)
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation_1_128.yaml"
```

### Fulmine Simulator Operations

```bash
# Build orchestrator
cd ${FULMINE_SIMULATOR_REPO}
make build

# Run with config
cd ${FULMINE_SIMULATOR_REPO}
make run ARGS="--sim ./configs/fulmine-endpoints-test.yaml"

# Run directly
./orchestrator/bin/orchestrator --sim ./configs/your-config.yaml

# Clean
make clean
```

### Arkade Explorer Operations

```bash
# Install dependencies
cd /Users/dusansekulic/code/fe/arkade-explorer
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Ark Telemetry Operations

```bash
# Production mode
cd ${ARK_TELEMETRY_REPO}
export SLACK_API_URL='https://hooks.slack.com/services/YOUR/WEBHOOK'
export SLACK_CHANNEL='#ark-alerts'
make docker-run

# Development mode (connects to Nigiri network)
make docker-run-dev

# Stop (WARNING: deletes volumes)
make docker-stop

# Restart (preserves data)
make docker-restart

# Verify services
curl http://localhost:9090/-/healthy      # Prometheus
curl http://localhost:3333/api/health     # Grafana
curl http://localhost:3100/ready          # Loki
```

### Health Checks

```bash
# Bitcoin/Nigiri
curl -s http://localhost:3000/api/blocks/tip/height

# NBXplorer
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq '.isFullySynced'

# arkd-wallet
curl -s http://localhost:6060/v1/wallet/status | jq '.synced'

# arkd
curl -s http://localhost:7070/v1/info | jq '.pubkey'

# Fulmine
curl -s http://localhost:7001/api/v1/wallet/status | jq '.initialized'

# Boltz
curl -s http://localhost:9001/v1/info

# Prometheus
curl -s http://localhost:9090/-/healthy

# Grafana
curl -s http://localhost:3333/api/health
```

## DOCUMENTATION REFERENCES

### By Project

**arkd**:
- Setup: `${ARKADIAN_DIR}/docs/projects/arkd/testing/how_to_run.md`
- Testing: `${ARKADIAN_DIR}/docs/projects/arkd/testing/how_to_test.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/arkd/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/arkd/testing/troubleshooting.md`

**fulmine**:
- Setup: `${ARKADIAN_DIR}/docs/projects/fulmine/testing/how_to_run.md`
- Testing: `${ARKADIAN_DIR}/docs/projects/fulmine/testing/how_to_test.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/fulmine/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/fulmine/testing/troubleshooting.md`

**ark-simulator**:
- Setup: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/how_to_run.md`
- Testing: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/how_to_test.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/troubleshooting.md`

**fulmine-simulator**:
- Setup: `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_run.md`
- Testing: `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/how_to_test.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/testing/troubleshooting.md`

**arkade-explorer**:
- Setup: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/how_to_run.md`
- Testing: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/how_to_test.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/troubleshooting.md`

**ark-telemetry**:
- Setup: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/how_to_run.md`
- Usage: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/usage.md`
- Troubleshooting: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/troubleshooting.md`

### Startup Sequence

Complete dependency-ordered startup guide:
`${ARKADIAN_DIR}/sessions/[latest]/artifacts/S1/startup_sequence.md`

## COMMON WORKFLOWS

### Workflow 1: Setup Minimal Ark Stack

```bash
# 1. Start Bitcoin regtest
nigiri start
nigiri rpc generatetoaddress 600 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf

# 2. Start arkd-wallet
cd ${ARKD_REPO}
make run-wallet
# Wait 15 seconds

# 3. Start arkd
cd ${ARKD_REPO}
make run-light
# Wait 10 seconds

# 4. Initialize wallet
arkd wallet create --password test123
arkd wallet unlock --password test123

# 5. Fund wallet
ARKD_ADDRESS=$(arkd wallet address)
nigiri faucet $ARKD_ADDRESS 1.0
nigiri rpc generatetoaddress 6 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf
```

### Workflow 2: Run arkd Tests

```bash
# 1. Ensure Nigiri is running
nigiri status || nigiri start

# 2. Run unit tests
cd ${ARKD_REPO}
make test

# 3. Start Docker test environment
make docker-run
sleep 30

# 4. Run integration tests
make integrationtest

# 5. Cleanup
make docker-stop
```

### Workflow 3: Run Fulmine Tests

```bash
# 1. Build and start test environment
cd ${FULMINE_REPO}
make build-test-env
docker compose -f test.docker-compose.yml up -d
sleep 30

# 2. Setup environment
make setup-test-env

# 3. Run tests
make integrationtest

# 4. Cleanup
make down-test-env
```

### Workflow 4: Run Ark Simulator

```bash
# 1. Ensure Ark stack is running
curl http://localhost:7070/v1/info || echo "Start arkd first"

# 2. Build simulator
cd ${ARK_SIMULATOR_REPO}
make build

# 3. Run simulation
make run ARGS="--sim config/simulation_1_20.yaml"

# 4. Verify results
# Check console output for completion
```

## TROUBLESHOOTING QUICK REFERENCE

### Issue: Nigiri not starting

```bash
# Check Docker
docker ps

# Reset Nigiri
nigiri stop --delete
nigiri start
```

### Issue: NBXplorer not syncing

```bash
# Check logs
docker logs nbxplorer

# Wait longer (can take 60+ seconds)
# Verify Bitcoin RPC
curl http://localhost:18443
```

### Issue: arkd cannot connect to arkd-wallet

```bash
# Verify arkd-wallet is running
curl http://localhost:6060/v1/wallet/status

# Check environment variable
echo $ARKD_WALLET_ADDR
# Should be: localhost:6060
```

### Issue: Port conflicts

```bash
# Find process using port
lsof -i :7070

# Kill process
kill -9 <PID>
```

### Issue: Tests failing

For complex test failures, route to **ark-env-tester** for comprehensive analysis.

## EXAMPLE INTERACTIONS

### Example 1: Simple Command Request

**User**: "How do I start arkd in light mode?"

**ark-ops (direct response)**:
```
To start arkd in light mode:

cd ${ARKD_REPO}
make run-light

This uses SQLite database and in-memory cache for fast development.

See: ${ARKADIAN_DIR}/docs/projects/arkd/testing/how_to_run.md
```

### Example 2: Testing Request (Route to ark-env-tester)

**User**: "Set up and run tests for arkd"

**ark-ops (router)**:
```
This requires environment provisioning and test execution.
Routing to ark-env-tester...

[Creates execution specification for ark-env-tester]
```

### Example 3: Debugging Request (Route to ark-developer)

**User**: "arkd is crashing with segfault, can you debug?"

**ark-ops (router)**:
```
This is a code debugging issue.
Routing to ark-developer...

[Creates task for ark-developer]
```

### Example 4: Status Check

**User**: "Is my Ark stack healthy?"

**ark-ops (direct response)**:
```
Run these health checks:

# Bitcoin/Esplora
curl -s http://localhost:3000/api/blocks/tip/height

# NBXplorer
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq '.isFullySynced'

# arkd-wallet
curl -s http://localhost:6060/v1/wallet/status | jq '.synced'

# arkd
curl -s http://localhost:7070/v1/info | jq '.pubkey'

All services should respond with valid data.
```

## SKILL BEHAVIOR

When invoked:

1. **Analyze request type**:
   - Simple query/command → Handle directly
   - Complex setup/testing → Route to ark-env-tester
   - Debugging/code issue → Route to ark-developer

2. **Provide immediate value**:
   - Always give quick commands if available
   - Reference documentation paths
   - Summarize workflows

3. **Route efficiently**:
   - Create proper execution specifications
   - Include relevant context
   - Set clear success criteria

4. **Follow up**:
   - After routing, wait for agent response
   - Summarize results for user
   - Suggest next steps

## PORT REFERENCE TABLE

| Service | Port | Check Command |
|---------|------|---------------|
| Bitcoin RPC | 18443 | `curl http://localhost:18443` |
| Esplora | 3000 | `curl http://localhost:3000/api/blocks/tip/height` |
| NBXplorer | 32838 | `curl http://localhost:32838/v1/cryptos/BTC/status` |
| arkd-wallet | 6060 | `curl http://localhost:6060/v1/wallet/status` |
| arkd | 7070 | `curl http://localhost:7070/v1/info` |
| Fulmine gRPC | 7000 | N/A (gRPC only) |
| Fulmine HTTP | 7001 | `curl http://localhost:7001/api/v1/wallet/status` |
| Boltz | 9001 | `curl http://localhost:9001/v1/info` |
| Prometheus | 9090 | `curl http://localhost:9090/-/healthy` |
| Grafana | 3001 | `curl http://localhost:3001/api/health` |

---

**Summary**: This skill is your operational hub for Ark ecosystem tasks. Use it for quick commands, documentation, and intelligent routing to specialized agents.
