---
project_id: ark-simulator
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_run.md"]
  dev:        ["sop/creating-scenarios.md", "system/configuration.md"]
  monitoring: ["testing/usage.md", "sop/analyzing-results.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  config: ["system/configuration.md", "sop/creating-scenarios.md"]
  aws: ["system/aws-deployment.md", "testing/aws-setup.md"]
scripts:
  run_local: "make run ARGS='--sim simulation.yaml'"
  run_web: "make run-web"
  run_web_docker: "make run-web-docker"
  build_client: "make build-client"
  push_ecr: "make push-to-ecr AWS_ACCOUNT_ID=<id> AWS_REGION=<region>"
---

# Ark Simulator — Project Index

**ark-simulator** is a simulation framework for testing the Ark Server by simulating multiple clients performing various actions over several rounds.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/` — System Architecture & Design
Core technical documentation about the simulator:

- **${ARKADIAN_DIR}/docs/projects/ark-simulator/system/project_overview.md** — — What ark-simulator is, its purpose, and capabilities
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/system/architecture.md** — — Orchestrator, clients, and deployment modes
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/system/configuration.md** — — Simulation YAML schema and configuration
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/system/aws-deployment.md** — — AWS/ECS deployment architecture
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/system/components.md** — — Orchestrator and client components

### `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/` — Usage & Operations
Practical guides for running simulations:

- **${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/usage.md** — — Quick start and common simulation workflows
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/local-deployment.md** — — Running locally (single/multi-process)
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/aws-setup.md** — — AWS deployment and configuration
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/` — Standard Operating Procedures
Step-by-step guides for simulation operations:

- **${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/creating-scenarios.md** — — How to create simulation YAML files
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/analyzing-results.md** — — Reading and interpreting simulation results
- **${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/scaling-simulations.md** — — Running large-scale tests on AWS

### `${ARKADIAN_DIR}/docs/projects/ark-simulator/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Recent Changes
Curated summaries of significant changes.

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Orchestrator
Main controller that:
- Reads simulation configurations from YAML files
- Starts Ark Server and Ark clients
- Orchestrates interactions between clients and server
- Supports single-process (local) and multi-process (distributed) modes
- Provides web UI for AWS deployments

### Ark Clients
Simulated clients that:
- Interact with Ark Server based on orchestrated instructions
- Execute actions: Onboard, SendAsync, Claim, Redeem, Balance, Stats
- Run in parallel to simulate realistic multi-user load
- Can run locally or on AWS ECS tasks

### Simulation Configuration
YAML-based scenario definitions:
- Client definitions with IDs and initial funding
- Round-by-round action specifications
- Schema validation against `schema.yaml`
- Pre-configured scenarios for 20, 32, 50, 128, 200 clients

### Deployment Modes

**Local Deployment:**
- Single-process: Orchestrator and clients in same process
- Multi-process: Orchestrator and clients as separate processes
- Best for small tests (≤50 clients)
- Requires Nigiri (Bitcoin regtest) and Ark Server

**AWS Deployment:**
- Orchestrator runs externally (Hetzner, DigitalOcean, local)
- Clients run as ECS Fargate tasks
- Scales to hundreds of clients
- Uses CloudFormation for infrastructure
- ECR for Docker image storage
- GitHub Actions for automated builds

---

## Quick Reference

### Local Simulation
```bash
# Prerequisites
# 1. Start Nigiri (Bitcoin regtest)
# 2. Start Ark Server (arkd)

# Build clients
make build

# Run simulation with specific config
make run ARGS="--sim simulation.yaml"

# Run with pre-configured scenarios
make run ARGS="--sim config/simulation_1_32.yaml"  # 32 clients
make run ARGS="--sim config/simulation_1_128.yaml" # 128 clients
```

### AWS Simulation
```bash
# Setup (one-time)
# 1. Deploy CloudFormation template
# 2. Configure IAM users and policies
# 3. Setup GitHub Actions for ECR
# 4. Copy .env.example to .env and configure

# Build and push client image to ECR
make push-to-ecr AWS_ACCOUNT_ID=<id> AWS_REGION=<region>

# Run orchestrator (web UI)
make run-web-docker

# Access web UI at http://localhost:9000
```

### Available Simulation Scenarios
- `simulation.yaml` — Basic example
- `simulation_1_20.yaml` — 20 clients
- `simulation_1_32.yaml` — 32 clients
- `simulation_1_40.yaml` — 40 clients
- `simulation_1_50.yaml` — 50 clients
- `simulation_1_59.yaml` — 59 clients
- `simulation_1_128.yaml` — 128 clients
- `simulation_1_170.yaml` — 170 clients
- `simulation_1_200.yaml` — 200 clients

---

## Simulation Actions

### Onboard
Onboard Bitcoin (on-chain) to Ark (off-chain).
```yaml
- type: "Onboard"
  amount: 100000  # satoshis
```

### SendAsync
Send off-chain payment to another client.
```yaml
- type: "SendAsync"
  amount: 10000
  to: "client_5"
```

### Claim
Claim received VTXOs (finalize off-chain payment).
```yaml
- type: "Claim"
```

### Redeem
Redeem VTXOs back to on-chain Bitcoin.
```yaml
- type: "Redeem"
```

### Balance
Check current balance.
```yaml
- type: "Balance"
```

### Stats
Get client statistics.
```yaml
- type: "Stats"
```

---

## AWS Architecture

```
GitHub Actions → Build Client Image → Push to ECR
                                        ↓
External Orchestrator (Web UI) → ECS Fargate Tasks (Clients)
         ↓                              ↓
    VPC, Subnets, Security Groups ← CloudFormation
```

**Components:**
- **ECR**: Docker image registry for client containers
- **ECS Fargate**: Serverless container execution for clients
- **VPC/Subnets**: Isolated network for simulation
- **Security Groups**: Network access control
- **IAM**: Permissions for GitHub Actions and orchestrator

**External Orchestrator:**
- Runs on any host (Hetzner, DigitalOcean, local)
- Provides web UI for starting/monitoring simulations
- Manages ECS task lifecycle
- Authenticates with username/password

---

## Integration with Ark

### Required Services
1. **Bitcoin Node** (Nigiri for regtest)
2. **Ark Server** (arkd) — running and accessible
3. **Ark Telemetry** (optional) — for monitoring simulation metrics

### Client Configuration
Clients connect to Ark Server via:
- gRPC endpoint (default: localhost:7070)
- Configurable in simulation YAML

### Metrics Collection
Simulations can export metrics to OpenTelemetry Collector:
- Round participation metrics
- Transaction success/failure rates
- Latency measurements
- VTXO statistics

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **configuration guide**: 400-800 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
