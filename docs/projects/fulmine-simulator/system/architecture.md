# Fulmine Simulator — Architecture

## High-Level Architecture

The simulator follows a proven **orchestrator-client pattern** where a central orchestrator coordinates multiple lightweight client processes that interact with a shared Fulmine instance.

```
┌─────────────────────────────────────────────────────┐
│                  Orchestrator                        │
│  ┌──────────────────────────────────────────────┐  │
│  │ 1. Parse & Validate YAML Config             │  │
│  │ 2. Distribute Initial Funds (Nigiri Faucet) │  │
│  │ 3. Spawn N Client Processes                 │  │
│  │ 4. Monitor Progress (Round-Based)           │  │
│  │ 5. Collect Funds Back                       │  │
│  │ 6. Verify 100% Recovery                     │  │
│  │ 7. Generate Audit Log & Report              │  │
│  └──────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────┘
               │ spawns & coordinates
               ├─────────┬─────────┬─────────┐
               ▼         ▼         ▼         ▼
            Client_0  Client_1  Client_2  Client_N
               │         │         │         │
               │ gRPC    │ gRPC    │ gRPC    │ gRPC
               └─────────┴─────────┴─────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │    Fulmine Instance        │
            │  (localhost:7001/7000)     │
            └────────────┬───────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │     Boltz Backend          │
            │  (Submarine Swap Provider) │
            └────────────────────────────┘
```

## Component Breakdown

### 1. Orchestrator (`cmd/orchestrator`, `orchestrator/`)

**Responsibilities:**
- Parse YAML configuration files
- Validate configuration (schema, network consistency, fund limits)
- Distribute initial funds to clients from funding source (Nigiri faucet on regtest)
- Spawn client processes with configuration
- Monitor client progress (round-based coordination)
- Collect funds back to orchestrator after simulation completes
- Verify 100% fund recovery (fail if any funds missing)
- Generate audit log (JSON Lines format) and final report

**Key Components:**
- **Config Parser**: YAML unmarshaling and validation
- **Fund Manager**: Bitcoin fund distribution and collection
- **Process Manager**: Spawns and monitors client processes
- **Audit Logger**: Append-only JSON Lines logging
- **Network Manager**: Network-specific configuration (regtest, mutinynet, mainnet)

**Data Flow:**
```
YAML Config → Parser → Validator
                         ↓
            Fund Distribution (Nigiri/Manual)
                         ↓
            Client Spawn (N processes)
                         ↓
            Round Coordination (Wait for completion)
                         ↓
            Fund Collection (Back to orchestrator)
                         ↓
            Recovery Verification (100% check)
                         ↓
            Report Generation (Audit log + summary)
```

### 2. Client (`cmd/client`)

**Responsibilities:**
- Receive configuration from orchestrator (via command-line args or IPC)
- Connect to Fulmine instance via gRPC (localhost:7000)
- Execute round-based actions (wait, swap, query balance)
- Report progress back to orchestrator
- Return funds to orchestrator after simulation completes

**Key Components:**
- **Fulmine gRPC Client**: Connects to Fulmine service
- **Action Executor**: Executes configured actions (wait, swap, etc.)
- **State Tracker**: Maintains client state across rounds

**Data Flow:**
```
Orchestrator → Client Config
                    ↓
            Fulmine gRPC Connection
                    ↓
            Round-Based Execution
                    ↓
            Progress Reporting
                    ↓
            Fund Return (to orchestrator)
```

### 3. Fulmine Client (`fulmine-client/`)

**Responsibilities:**
- Wrapper around Fulmine gRPC API
- Handles wallet operations (create, unlock, lock)
- Executes swaps (submarine, reverse submarine)
- Queries balance and transaction history

**Key Operations:**
- `CreateWallet(privateKey, password, serverURL)`
- `UnlockWallet(password)`
- `GetBalance()`
- `SendOnchain(address, amount)`
- `SendOffchain(address, amount)`
- `InitiateSubmarineSwap(amount)`
- `InitiateReverseSwap(amount)`

### 4. LND Client (`lnd-client/`)

**Responsibilities:**
- Docker-based LND wrapper
- Provides Lightning Network integration
- Manages LND instances for clients
- Handles invoice generation and payment routing

**Key Operations:**
- `StartLNDContainer(clientID)`
- `GetNodeInfo(clientID)`
- `CreateInvoice(clientID, amount)`
- `PayInvoice(clientID, invoice)`
- `GetChannelBalance(clientID)`

### 5. Arkade Client (`arkade-client/`)

**Responsibilities:**
- Ark protocol integration
- VTXO management
- Potential future use for Ark ↔ Lightning swap simulations

**Key Operations:**
- `CreateArkWallet()`
- `OnboardToArk(amount)`
- `SendOffchain(address, amount)`
- `RedeemVTXOs()`

### 6. Boltz Stack (`boltz-stack/`)

**Responsibilities:**
- Docker Compose setup for Boltz backend
- Provides local Boltz instance for regtest
- Handles submarine swap infrastructure

**Components:**
- Boltz backend (HTTP/WebSocket API)
- Bitcoin Core (regtest)
- CLN (Core Lightning)
- Database (PostgreSQL)

## Configuration Model

### YAML Structure
```yaml
version: "1.0"
network: "regtest"  # regtest, mutinynet, mainnet

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
      client_1:
        - type: "wait"
          duration_seconds: 5

  - number: 2
    description: "Execute swaps"
    actions:
      client_0:
        - type: "submarine_swap"
          amount_sats: 50000
      client_1:
        - type: "reverse_swap"
          amount_sats: 50000
```

### Action Types
- **wait**: Pause for specified duration
- **submarine_swap**: On-chain → Lightning
- **reverse_swap**: Lightning → On-chain
- **query_balance**: Check current balance
- **send_onchain**: Send Bitcoin on-chain
- **send_offchain**: Send within Ark/Lightning

## Network-Specific Configurations

### Regtest
- **Bitcoin**: Nigiri local regtest environment
- **Fulmine**: `localhost:7001` (Docker container)
- **Faucet**: Nigiri faucet API (`localhost:3000`)
- **Fund Source**: Automated via Nigiri faucet
- **Fund Return**: Automated to orchestrator address

### Mutinynet
- **Bitcoin**: Mutinynet testnet
- **Fulmine**: Remote instance or local with testnet config
- **Faucet**: Public Mutinynet faucet (manual or API)
- **Fund Source**: Manual or testnet faucet
- **Fund Return**: Manual or automated collection

### Mainnet
- **Bitcoin**: Bitcoin mainnet
- **Fulmine**: Production instance
- **Safety**: Fund limits, confirmation prompts, recovery verification
- **Fund Source**: User-provided (orchestrator wallet)
- **Fund Return**: Mandatory 100% recovery check

## Audit Logging

### JSON Lines Format
Each event is logged as a single JSON object on one line:

```json
{"timestamp":"2025-11-28T12:00:00Z","event":"fund_distributed","client_id":"client_0","amount_sats":100000,"txid":"abc123..."}
{"timestamp":"2025-11-28T12:00:05Z","event":"client_started","client_id":"client_0","pid":12345}
{"timestamp":"2025-11-28T12:00:10Z","event":"action_executed","client_id":"client_0","round":1,"action":"wait"}
{"timestamp":"2025-11-28T12:01:00Z","event":"swap_initiated","client_id":"client_0","swap_type":"submarine","amount_sats":50000}
{"timestamp":"2025-11-28T12:05:00Z","event":"fund_collected","client_id":"client_0","amount_sats":100000,"txid":"def456..."}
```

### Event Types
- **fund_distributed**: Initial funding to client
- **client_started**: Client process spawned
- **action_executed**: Client executed action in round
- **swap_initiated**: Swap started
- **swap_completed**: Swap finished successfully
- **swap_failed**: Swap failed with error
- **fund_collected**: Funds returned to orchestrator
- **simulation_completed**: Full simulation finished

## Security & Safety

### Fund Safety (Mainnet)
1. **Pre-Validation**: Check fund limits before starting
2. **User Confirmation**: Require "I ACKNOWLEDGE MAINNET" input
3. **Network Validation**: Verify blockchain parameters match config
4. **Audit Logging**: Log every fund movement
5. **Recovery Verification**: Fail simulation if funds not 100% recovered
6. **Emergency Recovery**: Manual tools to recover funds if orchestrator crashes

### Process Isolation
- Each client runs in separate process
- No shared state between clients (except Fulmine instance)
- Orchestrator coordinates but doesn't interfere

### Error Handling
- **Graceful Shutdown**: Clean up processes on SIGINT/SIGTERM
- **Partial Recovery**: Collect funds from successful clients even if some fail
- **Audit Trail**: Log all errors with context

## Technology Choices

### Why Go?
- **Concurrency**: Excellent support for concurrent client management
- **Performance**: Fast execution, low overhead
- **Bitcoin Libraries**: btcsuite provides robust Bitcoin utilities
- **Simplicity**: Easy to build, deploy, and maintain

### Why gRPC?
- **Type Safety**: Protobuf schemas prevent API mismatches
- **Performance**: Binary protocol, HTTP/2 multiplexing
- **Streaming**: Bi-directional streaming for real-time updates
- **Ecosystem**: Fulmine uses gRPC, natural integration

### Why YAML?
- **Human-Readable**: Easy to write and understand
- **Schema Validation**: Catch errors early
- **Version Control**: Plain text, easy to diff and review
- **Flexibility**: Supports complex nested structures

### Why JSON Lines?
- **Streaming**: Append-only, no need to rewrite entire file
- **Crash-Resistant**: Each line is valid JSON, partial writes recoverable
- **Queryable**: Standard tools (jq, grep) work out of the box
- **Structured**: Easy to parse and analyze programmatically

## Deployment Model

### Local Development (Regtest)
```
Developer Machine
├── Nigiri (Docker) — Bitcoin regtest + faucet
├── Fulmine (Docker) — Wallet daemon
├── Boltz Stack (Docker Compose) — Swap backend
└── fulmine-simulator (Binary) — Orchestrator + Clients
```

### Integration Testing (Mutinynet)
```
CI/CD Environment
├── Mutinynet Node (Remote) — Bitcoin testnet
├── Fulmine (Docker/Remote) — Wallet daemon
├── Boltz Stack (Remote) — Swap backend
└── fulmine-simulator (Binary) — Orchestrator + Clients
```

### Production Validation (Mainnet)
```
Secure Environment
├── Bitcoin Mainnet (Remote) — Bitcoin network
├── Fulmine (Production) — Wallet daemon
├── Boltz Backend (Production) — Swap provider
└── fulmine-simulator (Binary) — Orchestrator + Clients
    ├── Fund Limits: Enforced
    ├── Confirmation: Required
    └── Recovery: Mandatory
```

## Future Extensions

### Monitoring & Observability
- Real-time progress dashboard
- Prometheus metrics export
- Grafana dashboards
- Alert integration

### Advanced Scenarios
- Multi-hop swaps (Ark → Lightning → On-chain)
- Concurrent swap types (submarine + reverse)
- Failure injection (network partitions, Fulmine crashes)
- Performance benchmarking

### Production Features
- API for programmatic control
- Web UI for monitoring
- Integration with CI/CD pipelines
- Automated regression testing
