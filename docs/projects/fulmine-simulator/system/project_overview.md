# Fulmine Simulator — Project Overview

## What is Fulmine Simulator?

**fulmine-simulator** is a Lightning Network swap simulator that simulates multiple concurrent clients performing submarine and reverse swaps through a Fulmine/Boltz stack. It enables testing and validation of swap scenarios at scale with automated fund management, comprehensive audit logging, and multi-network support.

## Core Features

### Multi-Network Support
- **Regtest**: Local development using Nigiri faucet for Bitcoin, localhost Fulmine instance
- **Mutinynet**: Bitcoin testnet for realistic testing without real funds
- **Mainnet**: Production use with strict safety measures (fund limits, confirmations, mandatory recovery)

### YAML-Based Configuration
- Simple, human-readable simulation definitions
- Define clients, initial funding amounts, and round-based actions
- Validation before execution ensures configuration correctness
- Multiple example configs provided

### Automated Fund Management
- Orchestrator distributes initial funds to clients from Nigiri faucet (regtest)
- Tracks all fund movements with audit logging
- Collects funds back to orchestrator after simulation
- Verifies 100% fund recovery with detailed reporting

### Comprehensive Audit Logging
- JSON Lines format for structured event logging
- Crash-resistant append-only logging
- Tracks fund distribution, client actions, swap execution, fund collection
- Easy analysis with `jq` or similar tools

### Mainnet Safety Features
- Fund limits (per-client and total) enforced
- User confirmation prompt ("I ACKNOWLEDGE MAINNET")
- Network validation verifies blockchain parameters
- 100% recovery requirement (simulation fails if funds not recovered)
- Emergency recovery tools for failure scenarios

### Concurrent Client Support
- Supports 50+ concurrent simulated clients
- Lightweight clients connect to shared Fulmine instance via gRPC
- Round-based execution coordinates client actions
- Real-time progress monitoring

## Use Cases

### Development Testing
- Test Fulmine/Boltz integration locally with Nigiri
- Simulate various swap scenarios (submarine, reverse submarine)
- Validate fund management and recovery logic
- Debug client-server interactions

### Load Testing
- Simulate high concurrency (50+ clients)
- Test Fulmine performance under load
- Identify bottlenecks and scaling issues
- Validate resource usage

### Integration Testing
- Test full stack (Orchestrator → Clients → Fulmine → Boltz)
- Validate multi-client coordination
- Test fund distribution and collection flows
- Verify audit logging accuracy

### Mainnet Validation
- Carefully test production scenarios with real funds
- Validate safety features (limits, confirmations, recovery)
- Verify fund recovery mechanisms work correctly
- Build confidence before production deployment

## Technology Stack

### Language
- **Go 1.24.6+**: All components written in Go
- **Makefile**: Build automation and task orchestration

### Dependencies
- **btcsuite**: Bitcoin libraries for address generation, transaction handling
- **gRPC**: Client-server communication (Clients ↔ Fulmine)
- **YAML (gopkg.in/yaml.v3)**: Configuration parsing
- **testify**: Unit testing framework

### External Services
- **Fulmine**: Lightning wallet daemon (swap provider)
- **Boltz Backend**: Submarine swap infrastructure (via Fulmine)
- **Nigiri**: Local Bitcoin regtest environment with faucet
- **LND**: Lightning Network Daemon (optional for direct Lightning integration)

### Development Tools
- **Docker**: Container orchestration for Boltz stack and LND clients
- **Docker Compose**: Multi-container setup (Boltz, LND, etc.)
- **go fmt/vet**: Code quality and linting
- **go test**: Unit and integration testing

## Architecture Pattern

### Orchestrator-Client Pattern
```
Orchestrator (Central Coordinator)
├── Parses YAML config
├── Validates configuration
├── Distributes initial funds
├── Spawns N client processes
├── Monitors client progress
├── Collects funds after completion
└── Generates audit log and report

Client (Lightweight Process)
├── Receives config from orchestrator
├── Connects to Fulmine via gRPC
├── Executes round-based actions
├── Reports progress to orchestrator
└── Returns funds after completion
```

### Component Separation
- **cmd/orchestrator**: Main orchestrator binary
- **cmd/client**: Client binary
- **orchestrator/**: Orchestrator logic (lifecycle, fund management)
- **fulmine-client/**: Fulmine gRPC client wrapper
- **lnd-client/**: LND client wrapper (Docker-based)
- **arkade-client/**: Arkade client for Ark protocol integration
- **boltz-stack/**: Boltz backend Docker Compose setup
- **configs/**: Example YAML configurations

## Project Structure

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
├── docs/                # Design documents and specs
├── bin/                 # Build output directory
├── audit_logs/          # Simulation audit logs (generated)
├── reports/             # Simulation reports (generated)
├── Makefile             # Build automation
├── go.mod               # Go module definition
└── README.md            # User-facing documentation
```

## Development Status

### ✅ Completed Phases
- **Phase 1: Setup** — Project structure, dependencies, build system
- **Phase 2: Foundational** — Data models, config parsing, audit logging, network config
- **Phase 3: Regtest MVP** — Nigiri integration, fund management, client spawning, basic orchestration

### 🚧 In Progress
- **Phase 4: Swap Execution** — Fulmine REST API client, submarine/reverse swap logic

### 📋 Planned
- **Phase 5: Multi-Network** — Mutinynet support, basic mainnet support
- **Phase 6: Mainnet Safety** — Fund limits, confirmation prompts, recovery tools
- **Phase 7: Monitoring** — Real-time progress tracking, enhanced reporting
- **Phase 8: Polish & Testing** — Comprehensive tests, documentation, code quality

## Integration with Ark Ecosystem

### Fulmine Integration
- Clients connect to Fulmine instance via gRPC (default: localhost:7001)
- Execute submarine swaps (on-chain → Lightning)
- Execute reverse swaps (Lightning → on-chain)
- Query balance and transaction history

### Boltz Integration (Indirect)
- Fulmine handles Boltz interaction internally
- Clients don't interact directly with Boltz backend
- Swaps executed atomically via HTLCs

### Ark Protocol Integration
- **arkade-client** provides Ark protocol support
- Potential future use: Simulating Ark VTXO ↔ Lightning swaps
- Integration point for Ark-specific testing scenarios

## Getting Started

### Quick Start (Regtest)
1. Start Nigiri: `docker run -d --name nigiri -p 3000:3000 vulpemventures/nigiri`
2. Start Fulmine: `docker run -d --name fulmine -p 7001:7001 ghcr.io/arklabshq/fulmine:latest`
3. Clone repository: `git clone https://github.com/ark-network/fulmine-simulator`
4. Build binaries: `make build`
5. Run simulation: `./bin/orchestrator --config configs/regtest-5-clients.yaml`

### Development Workflow
1. Make code changes
2. Build locally: `make build-local`
3. Run with custom config: `make run ARGS="--config configs/my-config.yaml"`
4. View audit logs: `cat audit_logs/simulation_*.jsonl | jq`
5. Clean up: `make clean-processes`

## Key Design Decisions

### Why Orchestrator-Client Pattern?
- **Scalability**: Easy to spawn many concurrent clients
- **Isolation**: Each client is independent process with own state
- **Simplicity**: Clients are lightweight, orchestrator handles complexity
- **Realistic**: Mimics real-world multi-user scenarios

### Why YAML Configuration?
- **Human-Readable**: Easy to write and understand
- **Version Control Friendly**: Plain text, easy to diff
- **Validation**: Schema validation before execution prevents errors
- **Examples**: Easy to provide reference configurations

### Why Audit Logging?
- **Accountability**: Track every fund movement
- **Debugging**: Understand what happened during simulation
- **Crash-Resistant**: Append-only JSON Lines survives crashes
- **Analysis**: Easy to query and aggregate with standard tools

### Why Multi-Network Support?
- **Development**: Regtest for fast local iteration
- **Testing**: Mutinynet for realistic testnet validation
- **Production**: Mainnet with safety guardrails for confidence building

## Documentation Philosophy

This project follows Arkadian documentation standards:
- **Concise**: Keep files focused and under line limits
- **Practical**: Focus on "how to" rather than "why"
- **Cross-Referenced**: Link related docs instead of duplicating
- **Machine-Readable**: Structured for Claude agent consumption
