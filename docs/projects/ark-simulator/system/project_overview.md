# Ark Simulator - Project Overview

## Introduction

Ark Simulator is a comprehensive testing framework designed to validate and stress-test the Ark Server implementation under realistic, high-load conditions. The simulator orchestrates multiple virtual Ark clients performing concurrent operations across multiple settlement rounds, enabling developers to verify server behavior, identify performance bottlenecks, and ensure system reliability before production deployment. Built with Go and utilizing YAML-based declarative configuration, the simulator provides a flexible, scalable approach to testing from small-scale functional validation to large-scale distributed load testing.

## Purpose and Objectives

The Bitcoin Ark protocol enables fast, low-cost off-chain transactions through a coordinated round-based settlement system. Testing such a system with real users at scale is impractical during development. Ark Simulator bridges this gap by providing comprehensive testing capabilities across multiple dimensions:

**Load Testing and Capacity Planning**: Simulate hundreds of concurrent clients performing various operations to stress-test the Ark Server's capacity and identify performance limits. The simulator reveals how the system behaves as VTXO trees grow exponentially with participant counts, exposing critical bottlenecks in cryptographic signing operations, transaction construction, and round coordination.

**Behavioral Validation**: Verify that the Ark Server correctly processes different transaction types (onboarding, async payments, claims, redemptions), maintains state consistency across rounds, and handles edge cases like conflicting claims, timed-out operations, or concurrent round participation.

**Infrastructure Validation**: Test the complete Ark ecosystem including the server, Bitcoin regtest environment (Nigiri), client SDK integration, and optional cloud infrastructure to ensure all components work harmoniously under realistic network conditions.

**Performance Benchmarking**: Establish baseline performance metrics by systematically testing with increasing client counts (20, 50, 100, 200+) to measure round completion times, throughput, CPU utilization, and identify when specific operations become constraining factors.

## Key Features

### YAML-Based Configuration

The simulator uses a schema-driven YAML configuration approach that provides:
- Declarative simulation scenarios with version control
- Clear specification of client identities and initial funding amounts
- Round-by-round action definitions for each participating client
- Validation against a predefined schema ensuring configuration correctness
- Multiple pre-configured simulation templates for common testing scenarios

### Dual Orchestration Modes

**Local Orchestrator**: Runs simulations on a single machine with two operational modes:
- Single-process mode where orchestrator and clients share the same process
- Multi-process mode with separate orchestrator and client processes for more realistic testing

**Web Orchestrator**: Provides a browser-based UI for:
- Remote simulation management and monitoring
- Distributed client execution on AWS ECS (Fargate)
- Real-time simulation status and progress tracking
- Authentication-protected access for secure operations

### Flexible Deployment Options

The simulator supports two primary deployment strategies:

**Local Deployment**: Ideal for rapid development and small-scale testing:
- Runs on developer machines using Nigiri for local Bitcoin regtest environment
- Quick iteration cycles for testing configuration changes
- Minimal infrastructure requirements

**AWS Deployment**: Designed for large-scale, realistic load testing:
- Client containers run on AWS ECS Fargate for CPU resource isolation
- Orchestrator runs externally (Hetzner, DigitalOcean, or any VPS)
- ECR-hosted Docker images with automated CI/CD publishing via GitHub Actions
- Scales to hundreds of concurrent clients with dedicated compute resources

### Action Types

Clients can perform various Ark protocol operations:
- **Onboard**: Join the Ark by locking Bitcoin on-chain and receiving VTXOs
- **SendAsync**: Initiate off-chain VTXO transfers to other clients
- **Claim**: Accept and process received VTXOs
- **Redeem**: Exit the Ark by claiming VTXOs back to on-chain Bitcoin
- **Balance**: Query current VTXO holdings
- **Stats**: Retrieve client and server statistics

## Use Cases

### Development and Testing

- **Feature Validation**: Test new Ark Server features with controlled client behaviors
- **Regression Testing**: Ensure updates don't break existing functionality
- **Performance Benchmarking**: Measure throughput and latency under various loads
- **Configuration Tuning**: Optimize round intervals, participant counts, and timeout settings

### Research and Analysis

- **Scalability Studies**: Determine maximum sustainable client counts and transaction throughput
- **Resource Profiling**: Identify CPU, memory, and network bottlenecks
- **Economic Modeling**: Simulate fee structures and liquidity requirements
- **Attack Vector Analysis**: Test resilience against various failure modes and adversarial behaviors

### Pre-Production Validation

- **Mainnet Preparation**: Validate server readiness before production deployment
- **Disaster Recovery Testing**: Simulate node failures and recovery procedures
- **Upgrade Testing**: Verify smooth transitions during protocol version updates
- **Monitoring Validation**: Ensure observability systems capture relevant metrics

## Project Structure

The simulator follows a modular architecture with clear separation of concerns:

```
ark-simulator/
├── config/           # YAML simulation scenarios and schema definitions
├── local/            # Local orchestrator and single-process client implementations
├── web/              # Web-based orchestrator with UI and distributed client support
│   ├── client/       # Dockerized client for AWS ECS deployment
│   └── infra/        # CloudFormation templates for AWS infrastructure
├── docs/             # Architecture diagrams and deployment guides
└── script/           # Build and deployment automation scripts
```

## Technology Stack

- **Language**: Go 1.24+ with arkade-os/go-sdk for Ark protocol implementation
- **Configuration**: YAML with JSON Schema Draft 07 validation
- **Containerization**: Docker with multi-stage builds for optimized client images
- **Cloud Infrastructure**: AWS ECS Fargate (serverless containers), ECR (image registry), VPC with public subnets, CloudWatch Logs
- **Infrastructure as Code**: CloudFormation templates for reproducible AWS deployments
- **Bitcoin Environment**: Nigiri (Bitcoin regtest + Esplora) for local testing, esplora-compatible nodes for remote deployments
- **CI/CD**: GitHub Actions workflow for automated ECR image publishing on code changes
- **Build Automation**: GNU Make with targets for local/AWS builds, ECR publishing, and orchestrator deployment

## Integration Points

The simulator integrates with several external systems:

- **Ark Server**: The primary system under test, receiving all client requests
- **Bitcoin Node**: Provides regtest/testnet/mainnet blockchain access via esplora API
- **NBXplorer**: Bitcoin blockchain indexer for wallet operations
- **AWS Services**: ECS, ECR, CloudWatch for distributed deployments
- **Monitoring Stack**: Optional integration with Prometheus, Grafana, or OpenTelemetry

## Getting Started

### Local Simulation (Quick Start)

Basic local simulation workflow for development and testing:

1. **Start Bitcoin Regtest Environment**:
   ```bash
   nigiri start
   ```

2. **Launch Ark Server**:
   Configure and run arkd with appropriate settings for your test scenario

3. **Select or Create Simulation Configuration**:
   Choose from pre-configured templates in `config/` directory:
   - `simulation1.yaml` - Small 5-client functional test
   - `simulation_1_20.yaml` - 20 clients for moderate load
   - `simulation.yaml` - 100-client stress test

4. **Run Simulation**:
   ```bash
   make run ARGS="--sim config/simulation.yaml"`
   ```

5. **Monitor Execution**:
   Observe real-time console output showing client actions, round progressions, and results

### AWS Deployment (Large Scale)

For production-realistic load testing with 50-200+ clients:

1. Deploy CloudFormation infrastructure stack
2. Configure IAM users with ECR and ECS permissions
3. Build and push client Docker image to ECR (manual or via GitHub Actions)
4. Configure `.env` file with AWS credentials and infrastructure IDs
5. Run web orchestrator: `make run-web-docker`
6. Access web UI at `http://localhost:9000` to upload configuration and start simulation

See `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/aws-deployment.md` for complete AWS setup instructions.

## Limitations and Considerations

- **Alpha Status**: The simulator is designed for testing an experimental protocol and should not be used with real mainnet funds beyond test amounts
- **CPU Intensive**: Large simulations with many participants require significant computational resources for cryptographic operations
- **AWS Costs**: Cloud deployments incur ECS task, ECR storage, and data transfer charges
- **Network Latency**: Distributed deployments introduce network delays not present in local testing
- **Configuration Complexity**: Large simulations require careful YAML construction to avoid resource exhaustion

## Future Directions

Potential enhancements include:
- Advanced failure injection for chaos engineering
- Built-in performance metrics collection and visualization
- Support for heterogeneous client behaviors and timing patterns
- Integration with continuous benchmarking pipelines
- Multi-region AWS deployments for geographic distribution testing
- Automated scenario generation for comprehensive coverage
