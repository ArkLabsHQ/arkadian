# Fulmine Simulator - Architecture

## Overview

The Fulmine Simulator follows a proven **orchestrator-client pattern** for scalable load testing. A single orchestrator process manages multiple client processes, coordinates simulation rounds, and handles fund management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Orchestrator                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Config    │  │    Fund     │  │      Process        │ │
│  │   Parser    │  │   Manager   │  │      Manager        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Audit     │  │   Round     │  │      Report         │ │
│  │   Logger    │  │  Executor   │  │     Generator       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ spawns & monitors
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │ Client_0 │    │ Client_1 │    │ Client_N │
     │  ┌────┐  │    │  ┌────┐  │    │  ┌────┐  │
     │  │LND │  │    │  │LND │  │    │  │LND │  │
     │  └────┘  │    │  └────┘  │    │  └────┘  │
     └────┬─────┘    └────┬─────┘    └────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                ┌─────────────────────┐
                │   Fulmine / Boltz   │
                │   (Swap Provider)   │
                └─────────────────────┘
```

## Components

### Orchestrator

The central coordinator that manages the simulation lifecycle:

| Component | Responsibility |
|-----------|----------------|
| **Config Parser** | Parse YAML config, validate with JSON Schema |
| **Fund Manager** | Distribute initial funds, collect at end |
| **Process Manager** | Spawn, monitor, and terminate client processes |
| **Audit Logger** | Log all fund movements and state transitions |
| **Round Executor** | Coordinate client actions per round |
| **Report Generator** | Generate final simulation report |

### Client

Each client is a separate process that executes actions:

- Receives configuration from orchestrator
- Manages its own LND instance (Docker container)
- Executes actions (wait, swap, assert_balance)
- Reports status back to orchestrator
- Returns funds on completion

### Network Integration

| Network | Faucet | Funding Method |
|---------|--------|----------------|
| regtest | Nigiri | Automatic via faucet API |
| mutinynet | Mutinynet | Automatic via faucet API |
| mainnet | None | Manual pre-funding required |

## Data Flow

```
1. CONFIG LOAD
   YAML File → Config Parser → Validated Config

2. FUND DISTRIBUTION
   Faucet → Orchestrator Wallet → Client Wallets

3. SIMULATION EXECUTION
   Round N: Orchestrator → Broadcast Actions → Clients Execute → Report Status

4. FUND COLLECTION
   Client Wallets → Orchestrator Wallet → Verify 100% Recovery

5. REPORTING
   Audit Logs → Report Generator → Final Report
```

## Simulation Lifecycle

```
┌─────────────────┐
│     INIT        │ Parse config, validate
└────────┬────────┘
         ▼
┌─────────────────┐
│ FUND_DISTRIBUTE │ Distribute initial funds
└────────┬────────┘
         ▼
┌─────────────────┐
│  SPAWN_CLIENTS  │ Start client processes
└────────┬────────┘
         ▼
┌─────────────────┐
│ EXECUTE_ROUNDS  │ Run simulation rounds
└────────┬────────┘
         ▼
┌─────────────────┐
│ COLLECT_FUNDS   │ Collect funds from clients
└────────┬────────┘
         ▼
┌─────────────────┐
│ VERIFY_RECOVERY │ Verify 100% fund recovery
└────────┬────────┘
         ▼
┌─────────────────┐
│    COMPLETE     │ Generate report
└─────────────────┘
```

## Configuration Schema

```yaml
version: "1.0"
network: "regtest|mutinynet|mainnet"

clients:
  - id: string
    initial_funding_sats: number

rounds:
  - number: number
    description: string
    actions:
      <client_id>:
        - type: "wait|swap|reverse_swap|assert_balance"
          # action-specific parameters
```

## Safety Design (Mainnet)

```
┌─────────────────────────────────────────┐
│           MAINNET SAFETY GATES          │
├─────────────────────────────────────────┤
│ 1. Network Detection                    │
│    └─ Detect mainnet in config          │
│                                         │
│ 2. Fund Limit Check                     │
│    └─ Total < configured limit          │
│                                         │
│ 3. User Confirmation                    │
│    └─ Require "I ACKNOWLEDGE MAINNET"   │
│                                         │
│ 4. Network Validation                   │
│    └─ Verify chain parameters           │
│                                         │
│ 5. Recovery Verification                │
│    └─ 100% fund recovery required       │
└─────────────────────────────────────────┘
```

## Technology Choices

| Choice | Rationale |
|--------|-----------|
| Go | Performance, concurrency, Fulmine ecosystem |
| YAML Config | Human-readable, widely supported |
| JSON Lines Audit | Append-only, crash-resistant |
| Process-per-Client | Isolation, independent failure |
| Docker for LND | Consistent environment, easy cleanup |
