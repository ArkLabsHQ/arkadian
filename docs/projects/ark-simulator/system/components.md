# Ark Simulator - Components

## Component Overview

Ark Simulator consists of four primary component categories: orchestrators (local and web-based), client implementations (single-process, multi-process, and containerized), configuration management components, and external dependencies. Each component has distinct responsibilities and interfaces, designed for modularity and extensibility. This document provides detailed specifications for each component, including implementation details, interfaces, and interaction patterns.

## Orchestrator Components

Orchestrators serve as the control plane for simulations, managing client lifecycle, round progression, and result aggregation. Two orchestrator implementations exist with different deployment targets and operational models.

### Local Orchestrator

**Location**: `${ARK_SIMULATOR_REPO}/local/main.go`

**Purpose**: Command-line orchestrator for terminal-based simulation execution on a single machine.

**Capabilities**:
- Parses YAML configuration files and validates against schema
- Spawns clients as either goroutines (single-process mode) or separate OS processes (multi-process mode)
- Coordinates round execution sequentially based on configuration
- Collects and displays results in console output
- Supports direct interaction with local Ark Server (localhost)

**Operational Modes**:

**Single-Process Mode**:
- Clients run as goroutines within the orchestrator process
- Minimal resource isolation (shared memory, CPU scheduling)
- Fast startup and teardown (<1 second)
- Limited scalability (5-20 clients before CPU saturation)
- Ideal for rapid development and functional testing

**Multi-Process Mode**:
- Clients spawn as separate OS processes via exec
- Better resource isolation with OS-level process boundaries
- Slightly slower startup (~1-2 seconds)
- More realistic inter-process communication patterns
- Supports up to 30-40 clients on typical developer machines

**Execution Flow**:
1. Parse command-line arguments for simulation file path
2. Load and validate YAML configuration
3. Initialize client instances (goroutines or processes)
4. Iterate through rounds sequentially
5. Distribute actions to clients for current round
6. Wait for all clients to report completion (if sync: true)
7. Aggregate results and print summary
8. Clean up client instances and exit

**CLI Usage**:
```bash
make run ARGS="--sim config/simulation.yaml"
```

### Web Orchestrator

**Location**: `${ARK_SIMULATOR_REPO}/web/main.go`

**Purpose**: HTTP server with browser-based UI for remote simulation management and AWS ECS client orchestration.

**Capabilities**:
- Serves HTML/JavaScript UI for simulation control (port 9000)
- Authenticates users via USERNAME/PASSWORD environment variables
- Accepts YAML configuration uploads via web form
- Manages ECS task lifecycle via AWS SDK (RunTask, StopTask, DescribeTasks)
- Receives HTTP callbacks from distributed clients for status updates
- Provides real-time simulation progress monitoring
- Displays aggregated results and links to CloudWatch logs

**API Endpoints**:
- `GET /`: Main UI page (requires authentication)
- `POST /login`: Authenticate with username/password
- `POST /upload`: Accept YAML configuration file
- `POST /start`: Initiate simulation with uploaded config
- `GET /status`: Retrieve current simulation status
- `POST /callback`: Receive client status updates
- `GET /results`: Fetch final simulation results

**Authentication**:
- Basic HTTP authentication with session cookies
- Credentials from environment variables (USERNAME, PASSWORD)
- Sessions expire after 24 hours or on browser close

**AWS Integration**:
- Uses AWS SDK for Go v2 (github.com/aws/aws-sdk-go-v2)
- Requires IAM credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Manages ECS tasks in specified cluster (OrchestratorCluster)
- Injects environment variables into tasks (CLIENT_ID, ORCHESTRATOR_URL, ARK_SERVER_URL)
- Polls DescribeTasks API for task status (PENDING, RUNNING, STOPPED)

**Execution Flow**:
1. Start HTTP server on port 9000
2. User logs in via web form
3. User uploads simulation YAML file
4. Orchestrator validates configuration
5. User clicks "Start Simulation"
6. Orchestrator creates ECS tasks for each client
7. Clients register via /callback endpoint upon startup
8. Orchestrator sends actions to clients for each round
9. Clients report results via /callback endpoint
10. Orchestrator aggregates results and displays in UI
11. Orchestrator stops ECS tasks after completion

**Docker Execution**:
```bash
make run-web-docker
```

The orchestrator runs in a Docker container with `.env` file for configuration.

## Client Components

Clients represent simulation participants that execute Ark protocol operations by interfacing with the Ark Server via the go-sdk library. Three client implementations exist for different deployment scenarios.

### Local Client (Goroutine)

**Location**: Embedded in `${ARK_SIMULATOR_REPO}/local/main.go`

**Purpose**: Lightweight client running as a goroutine within the local orchestrator process.

**Characteristics**:
- Shares memory space with orchestrator
- Minimal overhead (no process creation)
- Direct function calls for action execution
- Uses Go channels for orchestrator communication
- No network overhead between orchestrator and client

**State Management**:
- Client ID (e.g., "client_0")
- Seed phrase for key derivation
- Ark Server gRPC connection
- go-sdk client instance
- Local VTXO state (balance, pending payments)

**Action Execution**:
Each action type maps to a go-sdk method:
- Onboard → `sdk.Onboard(amount)`
- SendAsync → `sdk.SendAsync(to, amount)`
- Claim → `sdk.Claim()`
- Redeem → `sdk.Redeem(amount)`
- Balance → `sdk.GetBalance()`
- Stats → `sdk.GetStats()`

### Local Client (Process)

**Location**: `${ARK_SIMULATOR_REPO}/local/client/main.go`

**Purpose**: Standalone client process for multi-process local simulations.

**Characteristics**:
- Separate OS process spawned by orchestrator
- Accepts configuration via command-line arguments or stdin
- Communicates with orchestrator via HTTP or Unix sockets
- Provides process-level isolation
- Can be killed independently without affecting orchestrator

**Command-Line Interface**:
```bash
./build/client \
  --client-id client_0 \
  --server-url localhost:7070 \
  --orchestrator-url http://localhost:8080
```

**Lifecycle**:
1. Process spawned by orchestrator
2. Client parses command-line arguments
3. Initializes go-sdk with generated seed
4. Connects to Ark Server gRPC endpoint
5. Registers with orchestrator
6. Waits for action commands
7. Executes actions and reports results
8. Exits upon simulation completion

### Containerized Client (AWS ECS)

**Location**: `${ARK_SIMULATOR_REPO}/web/client/main.go`

**Purpose**: Docker-packaged client for distributed AWS ECS Fargate execution.

**Dockerfile**: `${ARK_SIMULATOR_REPO}/web/client/Dockerfile`

**Build Process**:
1. Base image: golang:1.24-alpine
2. Copy source code and dependencies
3. Build static binary with CGO disabled
4. Create minimal runtime image (alpine:latest)
5. Expose no ports (outbound connections only)
6. Set entrypoint to client binary

**Environment Variables**:
- `CLIENT_ID`: Unique client identifier (injected by orchestrator)
- `ORCHESTRATOR_URL`: Orchestrator HTTP endpoint for callbacks
- `ARK_SERVER_URL`: Ark Server gRPC endpoint (e.g., ark.example.com:7070)
- `AWS_REGION`: AWS region for SDK operations (optional)

**Container Specifications**:
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB (2 GB)
- Network mode: awsvpc (required for Fargate)
- Logs: Streamed to CloudWatch `/ecs/ClientContainer`

**Execution Flow**:
1. ECS Fargate pulls image from ECR
2. Container starts with environment variables
3. Client reads CLIENT_ID and ORCHESTRATOR_URL
4. Client generates seed based on CLIENT_ID
5. Client connects to Ark Server gRPC endpoint
6. Client registers with orchestrator via HTTP POST
7. Client polls orchestrator for action commands
8. Client executes actions using go-sdk
9. Client sends results to orchestrator via HTTP POST
10. Client exits after simulation completion

**HTTP Callback Interface**:

**Registration**:
```http
POST /callback
Content-Type: application/json

{
  "client_id": "client_0",
  "status": "ready",
  "timestamp": "2023-10-15T12:00:00Z"
}
```

**Action Result**:
```http
POST /callback
Content-Type: application/json

{
  "client_id": "client_0",
  "round": 2,
  "action": "SendAsync",
  "status": "success",
  "message": "Sent 0.0001 BTC to client_5",
  "timestamp": "2023-10-15T12:01:30Z"
}
```

## Configuration Components

### Schema Validator

**Location**: Embedded in orchestrator code (both local and web)

**Purpose**: Validates simulation YAML files against JSON Schema specification.

**Library**: Uses a Go JSON Schema validation library (e.g., gojsonschema)

**Validation Process**:
1. Load schema from `config/schema.yaml`
2. Parse simulation YAML file
3. Convert YAML to JSON (schema validators operate on JSON)
4. Validate against schema
5. Report errors with specific field paths and validation failures

**Validation Errors Examples**:
- "clients[0].id: Does not match pattern '^client_\\d+$'"
- "rounds[3].number: Must be sequential (expected 4, got 5)"
- "rounds[2].actions.client_5[0].type: Must be one of [Onboard, SendAsync, Claim, Redeem, Balance, Stats]"

### Configuration Parser

**Location**: Orchestrator initialization code

**Purpose**: Parses validated YAML into Go structs for execution.

**Data Structures**:

```go
type SimulationConfig struct {
    Version     string
    Description string
    Clients     []ClientConfig
    Rounds      []RoundConfig
}

type ClientConfig struct {
    ID             string
    Name           string
    InitialFunding float64
}

type RoundConfig struct {
    Number  int
    Sync    bool
    Actions map[string][]ActionConfig // client ID -> actions
}

type ActionConfig struct {
    Type   string  // "Onboard", "SendAsync", etc.
    Amount float64 // optional
    To     string  // optional, for SendAsync
}
```

**Parsing Libraries**:
- gopkg.in/yaml.v3 for YAML unmarshaling
- Standard library for JSON operations

## External Dependencies

Ark Simulator integrates with several external systems that provide essential functionality for simulations.

### Ark Server (arkd)

**Purpose**: The primary system under test, implementing the Ark protocol server.

**Interface**: gRPC API defined in go-sdk protobuf specifications

**Key Operations**:
- Onboarding: Clients lock Bitcoin on-chain and receive VTXOs
- Payment Registration: Clients submit payment intents for round inclusion
- Round Coordination: Server aggregates payments and constructs VTXO trees
- Signing: Clients sign multi-sig transactions for VTXO tree validation
- Claiming: Clients accept received VTXOs and update state
- Redemption: Clients exit Ark cooperatively or unilaterally

**Deployment**:
- Can run locally (localhost:7070) for development
- Can run remotely (public endpoint) for AWS deployments
- Must be compatible with go-sdk version used by simulator

**Configuration Requirements**:
- Ark Server must be started before running simulations
- Server must be configured for same Bitcoin network (regtest/testnet/mainnet)
- Server must have sufficient liquidity for client onboarding operations

### Bitcoin Node (via Esplora)

**Purpose**: Provides blockchain data and transaction broadcast capabilities.

**Interface**: Esplora REST API (HTTP JSON endpoints)

**Used By**: Ark Server (indirectly affects simulator behavior)

**Operations**:
- Query UTXOs for funding transactions
- Broadcast on-chain transactions (onboarding, redemptions)
- Monitor transaction confirmations
- Retrieve block headers and chain state

**Local Deployment**: Nigiri provides a containerized Bitcoin regtest environment with Esplora API

**Nigiri Setup**:
```bash
nigiri start
```

This starts:
- Bitcoin Core in regtest mode (port 18443)
- Esplora API server (port 3000)
- Optional Electrum server

### NBXplorer (Bitcoin Indexer)

**Purpose**: Indexes Bitcoin blockchain data for wallet operations.

**Used By**: Ark Server's wallet component for UTXO management

**Interface**: REST API and WebSocket notifications

**Deployment**:
- Typically run as a Docker container
- Configured to connect to Bitcoin node
- Provides real-time transaction notifications

**Required for**: On-chain transaction monitoring and wallet balance queries

### Go SDK (github.com/arkade-os/go-sdk)

**Purpose**: Client library for interacting with Ark Server gRPC API.

**Used By**: All client components for Ark protocol operations

**Key Functionality**:
- Establishes gRPC connections to Ark Server
- Implements client-side Ark protocol logic
- Handles cryptographic operations (signing, key derivation)
- Manages local VTXO state
- Provides high-level methods for each action type

**Updating SDK**:
```bash
make update-go-sdk
```

This updates to the latest commit on the go-sdk master branch.

### AWS Services (for Distributed Deployments)

**ECS (Elastic Container Service)**:
- Manages Docker container lifecycle
- Schedules tasks on Fargate infrastructure
- Provides task networking (awsvpc mode)
- Enforces resource limits (CPU, memory)

**ECR (Elastic Container Registry)**:
- Stores versioned Docker images
- Integrates with ECS for image pulls
- Supports lifecycle policies for image retention

**CloudWatch**:
- Collects logs from ECS task stdout/stderr
- Provides metrics for task CPU and memory usage
- Enables log queries with CloudWatch Insights

**IAM (Identity and Access Management)**:
- Controls access to AWS resources
- Provides credentials for orchestrator
- Enforces least-privilege policies

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator (Local/Web)                 │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Config Parser  │→ │ Validator    │→ │ Client Manager │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
│           ↓                                      ↓          │
│  ┌────────────────┐              ┌──────────────────────┐  │
│  │ Round Executor │              │ Result Aggregator    │  │
│  └────────────────┘              └──────────────────────┘  │
└────────────┬────────────────────────────────────┬──────────┘
             ↓                                    ↑
      Actions/Commands                        Status/Results
             ↓                                    ↑
┌────────────┴────────────────────────────────────┴──────────┐
│                 Client Components (n instances)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Client 0    │  │  Client 1    │  │  Client N    │     │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │     │
│  │ │ go-sdk   │ │  │ │ go-sdk   │ │  │ │ go-sdk   │ │     │
│  │ │ Client   │ │  │ │ Client   │ │  │ │ Client   │ │     │
│  │ └────┬─────┘ │  │ └────┬─────┘ │  │ └────┬─────┘ │     │
│  └──────┼───────┘  └──────┼───────┘  └──────┼───────┘     │
└─────────┼──────────────────┼──────────────────┼───────────┘
          ↓ gRPC              ↓ gRPC             ↓ gRPC
┌─────────┴──────────────────┴──────────────────┴───────────┐
│                      Ark Server (arkd)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Round Engine │  │ VTXO Manager │  │ Tx Builder   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         └───────────────┬──┴────────────────┘             │
└─────────────────────────┼────────────────────────────────┘
                          ↓ Esplora API
┌────────────────────────────────────────────────────────────┐
│               Bitcoin Node (Regtest/Testnet)               │
│                  + Esplora + NBXplorer                     │
└────────────────────────────────────────────────────────────┘
```

## Build and Deployment Components

### Makefile Targets

The `${ARK_SIMULATOR_REPO}/Makefile` provides comprehensive build and deployment automation:

#### Local Simulation Targets

**`make run ARGS="--sim config/simulation.yaml"`**:
- Builds local client binary at `./build/client`
- Runs single-process simulation with Go runtime
- Usage: `make run ARGS="--sim config/simulation1.yaml"`
- Executes: `go run ./local/main.go $(ARGS)`

**`make build`**:
- Compiles local client binary only
- Output: `./build/client`
- Useful for testing client standalone

#### AWS Deployment Targets

**`make build-web`**:
- Builds web orchestrator Docker image
- Image name: `ark-web`
- Dockerfile: `./web/Dockerfile`
- Includes UI, AWS SDK, and orchestration logic

**`make run-web-docker`**:
- Builds and runs web orchestrator container
- Loads environment variables from `.env` file
- Exposes port 9000 for web UI
- Command: `docker run --env-file .env -p 9000:9000 ark-web`

**`make push-to-ecr AWS_ACCOUNT_ID=<id> AWS_REGION=<region>`**:
- Builds client Docker image
- Authenticates with ECR
- Tags with `:latest` and git commit SHA
- Pushes to ECR repository
- Invokes: `./script/build_and_push.sh` with parameters

**`make build-client AWS_ACCOUNT_ID=<id> AWS_REGION=<region>`**:
- Builds client image locally without pushing
- Same as `push-to-ecr` but with `--no-push` flag
- Useful for local testing before ECR upload

**Customizable Variables**:
```bash
make push-to-ecr \
  AWS_ACCOUNT_ID=123456789012 \
  AWS_REGION=eu-central-1 \
  ECR_REPOSITORY_NAME=my-repo \  # default: ark-client-repo
  IMAGE_NAME=my-client \          # default: arkclient
  DOCKERFILE_PATH=./web/client \  # default
  BUILD_CONTEXT=../               # default
```

#### Web Orchestrator Target

**`make run-web ARGS="<optional-args>"`**:
- Runs web orchestrator without Docker (direct Go execution)
- Requires `.env` variables to be exported to environment
- Usage: `go run ./web/main.go $(ARGS)`
- For development/debugging only

#### Maintenance Targets

**`make vet`**:
- Runs Go static analysis on all packages
- Command: `go vet ./...`
- Catches common Go coding errors

**`make update-go-sdk`**:
- Updates arkade-os/go-sdk to latest master commit
- Commands:
  - `go get github.com/arkade-os/go-sdk@master`
  - `go mod tidy`
  - Displays resolved version after update
- Important for keeping simulator compatible with latest Ark protocol changes

### Build Scripts

**Script**: `${ARK_SIMULATOR_REPO}/script/build_and_push.sh`

**Purpose**: Automates Docker image build and ECR publishing for client containers.

**Parameters**:
- `-a`: AWS account ID
- `-r`: AWS region
- `-e`: ECR repository name (default: ark-client-repo)
- `-i`: Local image name (default: arkclient)
- `-d`: Dockerfile path (default: ./web/client)
- `-c`: Build context path (default: ../)
- `--no-push`: Build only, skip ECR push

**Operations**:
1. Authenticate Docker to ECR using `aws ecr get-login-password`
2. Build Docker image with context and Dockerfile
3. Tag image with `:latest` and `:<git-commit-sha>`
4. Push both tags to ECR (unless `--no-push` specified)

## Component Extension Guidelines

### Adding New Action Types

1. Update schema enum in `config/schema.yaml`
2. Add action struct fields in configuration parser
3. Implement action handler in client components
4. Add corresponding go-sdk method call
5. Update documentation and examples

### Adding New Orchestrator Implementations

1. Implement configuration loading and validation
2. Implement client lifecycle management (start, stop, monitor)
3. Implement round execution and synchronization logic
4. Implement result aggregation and reporting
5. Document deployment requirements and usage

### Supporting New Cloud Providers

1. Abstract ECS-specific code into interface
2. Implement provider-specific task management (GCP Cloud Run, Azure Container Instances)
3. Adapt networking and IAM configurations
4. Update deployment documentation
5. Provide CloudFormation/Terraform equivalents

## Component Dependencies

**Local Orchestrator Dependencies**:
- Go standard library
- gopkg.in/yaml.v3 (YAML parsing)
- JSON Schema validator
- go-sdk (indirectly via clients)

**Web Orchestrator Dependencies**:
- Go standard library
- net/http (HTTP server)
- github.com/aws/aws-sdk-go-v2 (AWS integration)
- gopkg.in/yaml.v3 (YAML parsing)
- JSON Schema validator

**Client Dependencies**:
- github.com/arkade-os/go-sdk (Ark protocol operations)
- google.golang.org/grpc (gRPC client)
- Standard library for HTTP callbacks

**Build Dependencies**:
- Docker and Docker CLI
- AWS CLI (for ECR authentication)
- Make (build automation)
- Git (for commit SHA tagging)
