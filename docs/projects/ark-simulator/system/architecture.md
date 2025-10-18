# Ark Simulator - Architecture

## System Overview

Ark Simulator employs a centralized orchestration architecture where a single orchestrator component manages the lifecycle of multiple client instances that interact with an Ark Server. The system is designed to support both local single-machine deployments for rapid development and distributed cloud deployments for large-scale load testing. At its core, the architecture separates simulation control logic (orchestrator) from execution (clients), enabling flexible scaling and deployment strategies.

## Core Components

### Orchestrator

The orchestrator serves as the central coordinator and control plane for simulations. It reads YAML configuration files, validates them against the schema, and orchestrates client actions according to the specified round schedule.

**Responsibilities**:
- Parse and validate simulation configuration files
- Initialize and manage client lifecycle (creation, execution, teardown)
- Coordinate round progression and synchronization
- Aggregate and report simulation results and metrics
- Handle errors and retry logic for failed operations

**Implementation Variants**:

**Local Orchestrator** (`local/main.go`):
- Command-line interface for terminal-based execution
- Supports single-process mode (clients as goroutines) and multi-process mode (clients as separate processes)
- Direct console output for real-time monitoring
- Minimal overhead for quick iteration

**Web Orchestrator** (`web/main.go`):
- HTTP server with browser-based UI (port 9000)
- RESTful API for simulation control and status queries
- Authentication via username/password environment variables
- Manages distributed ECS task execution via AWS SDK
- Provides real-time status updates and logs

### Client Components

Clients are the simulation participants that execute Ark protocol operations by communicating with the Ark Server through the go-sdk library.

**Client Responsibilities**:
- Establish gRPC connections to Ark Server
- Execute assigned actions (Onboard, SendAsync, Claim, Redeem, Balance, Stats)
- Maintain local state (seed, VTXOs, balances)
- Report success/failure status back to orchestrator
- Handle Bitcoin address generation and transaction signing

**Local Client** (`local/client/main.go`):
- Runs as goroutines within the orchestrator process (single-process mode)
- Can be launched as separate OS processes (multi-process mode)
- Lightweight with minimal resource isolation

**Containerized Client** (`web/client/main.go`):
- Packaged as Docker image and pushed to AWS ECR
- Runs as ECS Fargate tasks for resource isolation
- Receives orchestrator URL and configuration via environment variables
- Reports status via HTTP callbacks to orchestrator
- Enables horizontal scaling to hundreds of concurrent clients

### Configuration Schema

The schema defines the structure and validation rules for simulation configurations.

**Schema Components** (`config/schema.yaml`):
```yaml
version: string           # Configuration format version
description: string       # Human-readable simulation description
clients: array            # Client definitions
  - id: string           # Unique identifier (required)
    name: string         # Display name
    initial_funding: number  # Starting Bitcoin amount (optional)
rounds: array             # Ordered sequence of simulation rounds
  - number: integer      # Round number (must be sequential)
    sync: boolean        # Whether to synchronize client actions
    actions: object      # Client ID to action list mapping
      client_0:
        - type: enum     # Action type (Onboard, SendAsync, Claim, etc.)
          amount: number  # Bitcoin amount for transfers
          to: string     # Target client ID for sends
```

**Validation Rules**:
- Client IDs must follow pattern `client_\d+`
- Round numbers must be sequential starting from 1
- Action types restricted to defined enum values
- Amounts must be non-negative
- SendAsync actions require a valid "to" client ID

## Deployment Architectures

### Local Deployment Architecture

```
┌─────────────────────────────────────────┐
│          Developer Machine              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    Orchestrator Process           │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Client 0  (goroutine)      │ │ │
│  │  │  Client 1  (goroutine)      │ │ │
│  │  │  Client 2  (goroutine)      │ │ │
│  │  │  ...                         │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│           ↓ gRPC                       │
│  ┌───────────────────────────────────┐ │
│  │       Ark Server (arkd)           │ │
│  └───────────────────────────────────┘ │
│           ↓                            │
│  ┌───────────────────────────────────┐ │
│  │  Nigiri (Bitcoin Regtest)         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Characteristics**:
- All components on single machine
- Shared CPU and memory resources
- Low network latency (localhost)
- Fast startup and teardown
- Limited scalability (typically <20 clients)
- Ideal for development and quick testing

### AWS Distributed Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│               External Host (Hetzner/DO/VPS)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Web Orchestrator (Docker Container)               │  │
│  │  - UI on port 9000                                 │  │
│  │  - AWS SDK for ECS management                      │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │ AWS API
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     AWS Infrastructure                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ECS Cluster (Fargate)                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Client 0 │  │ Client 1 │  │ Client N │  ...      │  │
│  │  │ (Task)   │  │ (Task)   │  │ (Task)   │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                    │                           │
│  ┌────────┴────────────────────┴───────────────────────┐  │
│  │  VPC (10.0.0.0/16)                                   │  │
│  │  - Subnet (10.0.1.0/24)                              │  │
│  │  - Security Group (ports 9000, 22)                   │  │
│  │  - Internet Gateway                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ECR (Elastic Container Registry)                    │  │
│  │  - ark-client-repo (Docker images)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CloudWatch Logs                                     │  │
│  │  - /ecs/ClientContainer log group                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ gRPC
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Ark Server (External/On-premise)                  │
│           - Can be anywhere with public endpoint            │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Orchestrator decoupled from client execution
- Clients run in isolated containers with dedicated CPU/memory
- Horizontal scaling to hundreds of concurrent clients
- Network latency between orchestrator and clients
- Higher infrastructure costs but realistic load testing
- Orchestrator can be on any cloud provider or VPS

## Data Flow

### Simulation Initialization Flow

1. **Configuration Loading**: Orchestrator reads and parses YAML simulation file
2. **Schema Validation**: Configuration validated against `schema.yaml` rules
3. **Client Provisioning**:
   - Local: Spawn goroutines or processes
   - AWS: Create ECS task definitions and launch tasks
4. **Connection Establishment**: Clients connect to Ark Server gRPC endpoint
5. **Initial State Setup**: Clients generate seeds, addresses, and initial state

### Round Execution Flow

1. **Round Start**: Orchestrator signals start of new round (e.g., round 2)
2. **Action Distribution**: Orchestrator sends action lists to relevant clients
3. **Client Execution**:
   - Each client processes its assigned actions sequentially
   - Actions may be synchronous (wait for round) or asynchronous
   - go-sdk handles gRPC communication with Ark Server
4. **Server Processing**:
   - Ark Server aggregates client requests into a round
   - Constructs batch transactions (VTXO tree)
   - Coordinates signing with clients
   - Finalizes round and settles on-chain (if needed)
5. **Result Collection**: Clients report success/failure to orchestrator
6. **Round Completion**: Orchestrator waits for all clients to finish before proceeding
7. **Next Round**: Process repeats for subsequent rounds

### Action Execution Flow (Example: SendAsync)

Detailed sequence showing how a client sends off-chain funds to another client:

```
Client 0                   Ark Server                   Client 1
   |                           |                           |
   |-- SendAsync(to=1) ------->|                           |
   |   (amount=0.00002)         |                           |
   |                           |<--- Register for Round ---|
   |                           |     (Client 1 active)     |
   |                           |                           |
   |<----- Payment ID ---------|                           |
   |                           |                           |
   |                      [Round Processing]               |
   |                      - Aggregate payments             |
   |                      - Build VTXO tree                |
   |                      - Create batch txs               |
   |                           |                           |
   |<-- Sign Request ----------|---------- Sign Request -->|
   |   (VTXO tree leaf)         |       (VTXO tree leaf)   |
   |                           |                           |
   |--- Signature ------------>|<---------- Signature -----|
   |                           |                           |
   |                      [Round Finalized]                |
   |                      - Settle on-chain (if needed)    |
   |                           |                           |
   |<-- VTXOs Updated ---------|------- VTXOs Updated ---->|
   |   (balance: -0.00002)     |     (pending: +0.00002)   |
   |                           |                           |
   |                           |<------ Claim() -----------|
   |                           |      (Next Round)         |
   |                           |                           |
   |                           |------- VTXOs Updated ---->|
   |                           |     (balance: +0.00002)   |
```

This flow demonstrates the three-round pattern common in Ark:
- **Round 1**: Client 0 onboards funds
- **Round 2**: Client 0 sends to Client 1 (async payment registered)
- **Round 3**: Client 1 claims payment (balance updated)

## Deployment Mode Trade-offs

### Local Deployment

**Advantages**:
- Zero cloud infrastructure costs
- Instant startup and teardown
- Simple debugging with local logs
- No network latency overhead
- Easy to reproduce issues

**Disadvantages**:
- Limited client count due to shared CPU
- Signing operations become bottleneck quickly
- Unrealistic load patterns
- Cannot test geographic distribution
- Poor isolation between clients

### AWS Deployment

**Advantages**:
- Scales to hundreds of clients with isolated resources
- Realistic CPU load per client (signing operations)
- Fault isolation (one client failure doesn't affect others)
- Production-like network latency patterns
- CloudWatch integration for monitoring

**Disadvantages**:
- Higher infrastructure costs (ECS tasks, data transfer)
- Complex setup with IAM, VPC, ECR configuration
- Longer startup time (container pulls, task scheduling)
- Network latency between orchestrator and clients
- AWS account and region dependencies

## Concurrency and Synchronization

### Round Synchronization

The `sync` boolean in round configuration controls synchronization behavior:
- **sync: true**: Orchestrator waits for all clients to complete actions before starting next round (default)
- **sync: false**: Allows rounds to overlap, enabling more chaotic testing scenarios

### Client Concurrency

- **Local Mode**: Clients run as goroutines with Go runtime scheduling
- **AWS Mode**: Clients run as separate ECS tasks with true parallelism
- **Action Execution**: Within each client, actions execute sequentially in defined order

## Extensibility Points

The architecture supports several extension mechanisms:

1. **Custom Action Types**: Add new Ark protocol operations by extending the schema enum and client handlers
2. **Alternative Orchestrators**: Implement new control interfaces (CLI, API, GUI) using the same client components
3. **Additional Cloud Providers**: Adapt the ECS-based deployment to GCP Cloud Run, Azure Container Instances, etc.
4. **Monitoring Integration**: Inject observability hooks at orchestrator and client levels
5. **Chaos Engineering**: Add failure injection between orchestrator and clients or clients and server
6. **Alternative Configurations**: Extend schema to support probabilistic actions, timing variations, etc.

## Security Considerations

- **Orchestrator Authentication**: Web orchestrator requires USERNAME/PASSWORD environment variables
- **IAM Permissions**: AWS deployment requires precise IAM policies for ECS, ECR, and CloudWatch access
- **Network Isolation**: Security groups restrict access to necessary ports only (9000 for orchestrator)
- **Credential Management**: AWS credentials passed via environment variables, never hardcoded
- **Client Isolation**: ECS tasks provide process-level isolation between clients
- **No Production Data**: Simulator should only interact with testnet/regtest environments

## Performance Characteristics

- **Local Mode**: Typically handles 5-20 clients before CPU saturation
- **AWS Mode**: Scales to 100+ clients with proper resource allocation (1 vCPU, 2GB RAM per task)
- **Signing Bottleneck**: VTXO tree signing dominates CPU usage as client count grows
- **Network Overhead**: AWS mode adds 10-50ms latency compared to local deployment
- **Startup Time**: Local <1 second, AWS 30-60 seconds for container pulls and task scheduling
