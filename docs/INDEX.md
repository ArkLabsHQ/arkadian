# Arkadian  Project Index & Registry

This is the **master index** for all projects in the Arkade ecosystem. It provides a machine-readable registry with project metadata, dependencies, and routing hints for AI agents.

---

## Project Registry

### arkd
**ID**: `arkd`
**Name**: Arkd Server
**Type**: Core Infrastructure
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md`
**Repository**: `${ARKD_REPO}`
**GitHub**: `${ARKD_GITHUB}`

**Description**:
Bitcoin Ark protocol server implementation that enables fast, low-cost off-chain transactions while maintaining Bitcoin's security guarantees. The server acts as an Arkade Operator, creating and managing Batch Outputs (VTXOs), facilitating off-chain transactions through rounds, and providing liquidity for commitment transactions. Uses hexagonal architecture with strict layering (domain, application, infrastructure).

**Key Capabilities**:
- VTXO (Virtual Transaction Output) management and lifecycle
- Round-based batch settlement (every 10-30 seconds)
- Covenantless Bitcoin architecture (no consensus changes required)
- Onchain boarding and offchain payment processing
- Collaborative and unilateral exit mechanisms
- gRPC and REST API interfaces
- Multiple database backends (PostgreSQL, SQLite, Badger, MongoDB)
- Multiple cache backends (Redis, in-memory)

**Tags**: `ark`, `protocol`, `server`, `vtxo`, `rounds`, `bitcoin`, `layer2`, `grpc`, `rest-api`, `postgresql`, `sqlite`, `redis`

**Synonyms**: `ark-server`, `arkd-server`, `ark-daemon`, `operator`

**Triggers**:
- **ask_question**: `vtxo`, `rounds`, `settlement`, `boarding`, `offchain`, `ark protocol`, `how does ark work`
- **develop**: `add endpoint`, `new database`, `migration`, `grpc service`, `round logic`
- **test_or_run**: `start arkd`, `run rounds`, `integration test`, `e2e test`, `simulation`
- **debug**: `vtxo not found`, `round failed`, `settlement error`, `database issue`
- **monitor_or_alert**: `arkd metrics`, `round latency`, `vtxo expiry`

**Dependencies**: `arkd-wallet`, `go-sdk` (protocol implementation)
**Depended On By**: `go-sdk`, `wallet`, `ark-faucet`, `ark-simulator`, `arkade-escrow`, `ark-telemetry`

---

### go-sdk
**ID**: `go-sdk`
**Name**: Ark Go SDK
**Type**: Client Library
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md`
**Repository**: `${GO_SDK_REPO}`
**GitHub**: `${GO_SDK_GITHUB}`

**Description**:
Go client library for building Ark wallets and applications. Provides high-level abstractions for wallet operations, VTXO management, transaction building, and arkd server communication. Implements the Ark protocol client-side logic with support for multiple storage backends (SQLite, PostgreSQL, Badger).

**Key Capabilities**:
- Wallet initialization and key management (BIP39, BIP32)
- Send and receive Ark payments (onchain and offchain)
- VTXO lifecycle management (creation, renewal, expiry)
- Ark address generation (Taproot-based)
- Round participation and settlement handling
- Boarding (onchain to offchain) and redemption (offchain to onchain)
- Multiple storage backends with unified interface
- gRPC client for arkd communication

**Tags**: `sdk`, `wallet`, `client`, `library`, `vtxo`, `ark`, `go`, `grpc-client`, `bip39`, `taproot`

**Synonyms**: `ark-sdk`, `go-client`, `wallet-sdk`

**Triggers**:
- **ask_question**: `how to build wallet`, `sdk usage`, `client library`, `integrate ark`
- **develop**: `add feature to sdk`, `new storage backend`, `wallet operation`
- **test_or_run**: `sdk example`, `test wallet`, `alice to bob example`

**Dependencies**: `arkd` (server communication)
**Depended On By**: `ark-faucet`, `ark-simulator`, `kms-unlocker` (indirectly via arkd)

---

### wallet
**ID**: `wallet`
**Name**: Arkade Wallet (PWA)
**Type**: End-User Application
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/wallet/INDEX.md`
**Repository**: `${WALLET_REPO}`
**GitHub**: `${WALLET_GITHUB}`

**Description**:
Self-custodial Bitcoin wallet delivered as a Progressive Web App (PWA). Built with React 18, TypeScript, Ionic, and Vite. Provides a user-friendly interface for Ark protocol operations including VTXOs, off-chain payments, Lightning swaps via Boltz, and on-chain boarding. Installable on mobile (iOS, Android) and desktop without app store gatekeepers.

**Key Capabilities**:
- Create and restore wallets (BIP39 seed phrases)
- Send and receive Bitcoin (onchain and offchain via Ark)
- VTXO management and visualization
- Lightning Network swaps (submarine and reverse submarine via Boltz)
- Progressive Web App features (installable, offline-capable, auto-updates)
- IndexedDB storage with Dexie (encrypted client-side)
- Service worker for offline functionality
- @arkade-os/sdk integration for Ark protocol operations

**Tags**: `wallet`, `pwa`, `react`, `typescript`, `mobile`, `desktop`, `vtxo`, `lightning`, `boltz`, `self-custodial`, `offline`, `indexeddb`

**Synonyms**: `arkade-wallet`, `web-wallet`, `pwa-wallet`, `client-app`

**Triggers**:
- **ask_question**: `how to use wallet`, `pwa features`, `lightning swap`, `install wallet`
- **develop**: `add wallet feature`, `fix ui bug`, `update sdk version`
- **test_or_run**: `start wallet dev server`, `build pwa`, `test components`

**Dependencies**: `@arkade-os/sdk` (JavaScript SDK, separate from go-sdk), `@arkade-os/boltz-swap`, `arkd` (server connection)
**Depended On By**: None (end-user application)

---

### ark-faucet
**ID**: `ark-faucet`
**Name**: Ark Faucet
**Type**: Service/Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-faucet/INDEX.md`
**Repository**: `${ARK_FAUCET_REPO}`
**GitHub**: `${ARK_FAUCET_GITHUB}`

**Description**:
Offchain-only wallet service that provides HTTP APIs for distributing Ark coins to both onchain and offchain addresses. Supports covenant (Liquid) and covenantless (Bitcoin) modes. Used for testnet distributions, developer testing, and onboarding new users to the Ark ecosystem.

**Key Capabilities**:
- Public faucet endpoint (no auth required)
- Protected admin endpoints (balance, refill)
- Basic authentication for admin operations
- Note-based refill system (mints notes via arkd admin API)
- Offchain-only wallet (no direct blockchain interaction)
- Dual network support (Bitcoin/Liquid)
- Docker deployment ready

**Tags**: `faucet`, `testnet`, `distribution`, `http-api`, `offchain`, `wallet-service`, `notes`

**Synonyms**: `testnet-faucet`, `coin-dispenser`

**Triggers**:
- **ask_question**: `how to get testnet coins`, `faucet usage`, `refill faucet`
- **develop**: `add faucet feature`, `rate limiting`
- **test_or_run**: `start faucet`, `test distribution`

**Dependencies**: `arkd` (server connection), `go-sdk` (wallet operations)
**Depended On By**: Developers and testers needing testnet coins

---

### ark-simulator
**ID**: `ark-simulator`
**Name**: Ark Simulator
**Type**: Testing/Simulation Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-simulator/INDEX.md`
**Repository**: `${ARK_SIMULATOR_REPO}`
**GitHub**: `${ARK_SIMULATOR_GITHUB}`

**Description**:
Simulation tool for testing Ark protocol under various load conditions. Creates multiple concurrent wallet clients that perform send/receive operations to stress-test arkd server performance, round settlement, VTXO management, and network throughput. Used for performance testing, capacity planning, and regression detection.

**Key Capabilities**:
- Concurrent client simulation (5-128+ clients)
- Automated send/receive cycles
- Round participation testing
- Performance metrics collection
- Configurable test scenarios (client count, transaction amounts, duration)
- Integration with arkd test environment
- Docker-based test orchestration

**Tags**: `simulation`, `testing`, `load-test`, `performance`, `stress-test`, `e2e`, `concurrent-clients`

**Synonyms**: `load-tester`, `performance-test`, `stress-test`

**Triggers**:
- **test_or_run**: `run simulation`, `load test`, `stress test arkd`, `performance test`
- **develop**: `add simulation scenario`, `modify test parameters`
- **monitor_or_alert**: `simulation metrics`, `throughput measurement`

**Dependencies**: `arkd` (server under test), `go-sdk` (client wallets)
**Depended On By**: CI/CD pipelines, performance monitoring

---

### ark-telemetry
**ID**: `ark-telemetry`
**Name**: Ark Telemetry
**Type**: Observability/Monitoring
**Language**: Go (instrumentation) + YAML (config)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/INDEX.md`
**Repository**: `${ARK_TELEMETRY_REPO}`
**GitHub**: `${ARK_TELEMETRY_GITHUB}`

**Description**:
OpenTelemetry-based observability stack for Ark protocol monitoring. Provides metrics, traces, and logs collection from arkd and related services. Includes Prometheus for metrics storage, Grafana for visualization, Loki for log aggregation, and Tempo for distributed tracing.

**Key Capabilities**:
- OpenTelemetry instrumentation for arkd
- Prometheus metrics collection and alerting
- Grafana dashboards (rounds, VTXOs, transactions, performance)
- Loki log aggregation and querying
- Tempo distributed tracing
- Pre-built dashboards for common monitoring scenarios
- Alert rules for critical conditions
- Docker Compose stack for easy deployment

**Tags**: `observability`, `monitoring`, `metrics`, `logs`, `traces`, `opentelemetry`, `prometheus`, `grafana`, `loki`, `tempo`

**Synonyms**: `monitoring`, `observability-stack`, `telemetry`

**Triggers**:
- **monitor_or_alert**: `arkd metrics`, `view dashboards`, `check alerts`, `query logs`, `trace requests`
- **test_or_run**: `start telemetry stack`, `grafana setup`
- **debug**: `check logs`, `view traces`, `investigate errors`

**Dependencies**: `arkd` (instrumented service)
**Depended On By**: Operations, SRE, debugging workflows

---

### ark-infra
**ID**: `ark-infra`
**Name**: Ark Infrastructure
**Type**: Infrastructure-as-Code
**Language**: HCL (OpenTofu/Terraform) + YAML (Docker Compose)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-infra/INDEX.md`
**Repository**: `${ARK_INFRA_REPO}`
**GitHub**: `${ARK_INFRA_GITHUB}`

**Description**:
Infrastructure-as-Code (IaC) for deploying and managing Ark protocol infrastructure across local, staging, and production environments. Uses OpenTofu (Terraform alternative) for AWS resources and Docker Compose for local development stacks. Includes production-ready configurations for arkd, databases, monitoring, and networking.

**Key Capabilities**:
- OpenTofu modules for AWS infrastructure (EC2, RDS, S3, VPC, ALB)
- Docker Compose stacks for local development
- Multi-environment support (local, dev, staging, prod)
- Database provisioning (PostgreSQL, Redis)
- Network configuration (VPC, security groups, load balancers)
- Monitoring stack deployment (Prometheus, Grafana)
- Secret management (AWS Secrets Manager)
- Automated backups and disaster recovery

**Tags**: `infrastructure`, `iac`, `terraform`, `opentofu`, `aws`, `docker-compose`, `deployment`, `devops`, `postgres`, `redis`, `vpc`

**Synonyms**: `infrastructure-as-code`, `deployment`, `iac`, `terraform-stack`

**Triggers**:
- **develop**: `add infrastructure`, `modify aws resources`, `update compose stack`
- **test_or_run**: `deploy stack`, `provision infrastructure`, `terraform apply`
- **monitor_or_alert**: `infrastructure monitoring`, `resource usage`

**Dependencies**: `arkd`, `ark-telemetry` (deployed services)
**Depended On By**: Production deployments, staging environments

---

### kms-unlocker
**ID**: `kms-unlocker`
**Name**: KMS Unlocker
**Type**: Service/Security Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/kms-unlocker/INDEX.md`
**Repository**: `${KMS_UNLOCKER_REPO}`
**GitHub**: `${KMS_UNLOCKER_GITHUB}`

**Description**:
Automated wallet unlock service with AWS KMS integration. Monitors arkd-wallet for lock state and automatically unlocks using credentials stored in AWS Secrets Manager. Provides production-grade secret management, connection resilience, backup systems (SSM fallback), and graceful degradation.

**Key Capabilities**:
- Automatic wallet unlock on startup and lock detection
- AWS KMS integration for secure credential storage
- AWS Secrets Manager for password retrieval
- SSM Parameter Store fallback (backup system)
- Connection resilience (exponential backoff, circuit breaker)
- Health check endpoint
- LocalStack support for local testing
- Graceful shutdown and cleanup

**Tags**: `security`, `automation`, `wallet`, `kms`, `secrets-manager`, `aws`, `unlock`, `credentials`, `resilience`

**Synonyms**: `wallet-unlocker`, `kms-service`, `secret-management`

**Triggers**:
- **ask_question**: `how to unlock wallet`, `kms integration`, `secret management`
- **develop**: `add unlock logic`, `improve resilience`, `backup system`
- **test_or_run**: `test with localstack`, `integration test`
- **debug**: `unlock failed`, `connection issues`, `kms errors`

**Dependencies**: `arkd-wallet` (wallet service to unlock)
**Depended On By**: Production arkd deployments requiring automated unlocking

---

### fulmine
**ID**: `fulmine`
**Name**: Fulmine
**Type**: Service/Bitcoin Wallet
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md`
**Repository**: `${FULMINE_REPO}`
**GitHub**: `${FULMINE_GITHUB}`

**Description**:
Bitcoin wallet daemon with Lightning Network swap integration via Boltz. Provides both CLI and web interface for wallet management, submarine swaps (onchain � Lightning), and VHTLC (Virtual Hash Time-Locked Contract) support for Ark integration. Built with btcd wallet backend.

**Key Capabilities**:
- Bitcoin wallet operations (send, receive, balance)
- Lightning Network submarine swaps (onchain � Lightning)
- Reverse submarine swaps (Lightning � onchain)
- Boltz provider integration
- VHTLC support for Ark-Lightning bridge
- Web interface for swap management
- CLI for wallet operations
- PostgreSQL storage for swap state
- Docker deployment ready

**Tags**: `wallet`, `lightning`, `swap`, `submarine-swap`, `boltz`, `bitcoin`, `vhtlc`, `cli`, `web-interface`, `postgres`

**Synonyms**: `lightning-wallet`, `swap-service`, `fulmine-wallet`

**Triggers**:
- **ask_question**: `lightning swap`, `submarine swap`, `how to swap`, `vhtlc`
- **develop**: `add swap feature`, `improve swap logic`, `web ui`
- **test_or_run**: `start fulmine`, `test swap`, `run web interface`
- **debug**: `swap failed`, `htlc issues`, `boltz errors`

**Dependencies**: `boltz-backend` (external swap provider), Bitcoin node (btcd/bitcoind)
**Depended On By**: `wallet` (for Lightning swap functionality), users needing Lightning liquidity, `fulmine-simulator` (testing tool)

---

### fulmine-simulator
**ID**: `fulmine-simulator`
**Name**: Fulmine Swap Simulator
**Type**: Testing/Simulation Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/fulmine-simulator/INDEX.md`
**Repository**: `${FULMINE_SIMULATOR_REPO}`
**GitHub**: `${FULMINE_SIMULATOR_GITHUB}`

**Description**:
Lightning Network swap simulator that simulates multiple concurrent clients performing submarine and reverse swaps through a Fulmine/Boltz stack. Supports three networks (regtest, mutinynet, mainnet) with YAML-based configuration, automated fund management, comprehensive audit logging, and mainnet safety features. Uses orchestrator-client pattern for scalable load testing and validation of swap scenarios.

**Key Capabilities**:
- Multi-network support (regtest with Nigiri faucet, mutinynet testnet, mainnet production)
- YAML-based configuration for simulation definitions
- Automated fund distribution and collection with 100% recovery tracking
- Comprehensive audit logging (JSON Lines format, crash-resistant)
- Mainnet safety features (fund limits, confirmation prompts, mandatory recovery)
- Concurrent client support (50+ clients)
- Orchestrator-client pattern for scalability
- Round-based execution coordination
- Submarine and reverse submarine swap simulation
- Integration with Fulmine gRPC API

**Tags**: `simulator`, `testing`, `load-test`, `lightning`, `swap`, `submarine-swap`, `fulmine`, `boltz`, `orchestrator`, `yaml`, `audit-logging`, `concurrent`, `regtest`, `mainnet-safety`

**Synonyms**: `swap-simulator`, `fulmine-tester`, `lightning-simulator`, `swap-load-test`

**Triggers**:
- **test_or_run**: `run simulation`, `load test fulmine`, `test swaps`, `simulate lightning swaps`, `orchestrator`
- **develop**: `add simulation scenario`, `modify simulator config`, `new action type`
- **monitor_or_alert**: `simulation metrics`, `swap throughput`, `fund recovery rate`
- **debug**: `simulation failed`, `fund recovery issue`, `client timeout`, `swap stuck`

**Dependencies**: `fulmine` (swap provider under test), `boltz-backend` (via fulmine), Nigiri (regtest funding), LND (Lightning integration)
**Depended On By**: CI/CD pipelines for fulmine testing, performance validation workflows

---

### boltz-backend
**ID**: `boltz-backend`
**Name**: Boltz Backend
**Type**: External Service/Swap Infrastructure
**Language**: TypeScript/Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-backend/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/boltz-backend`
**GitHub**: `${BOLTZ_BACKEND_GITHUB}`

**Description**:
Backend infrastructure for Boltz Exchange enabling non-custodial atomic swaps between Bitcoin layers. Provides trustless swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM chains using HTLCs and Taproot. RESTful API for swap creation and monitoring. Hybrid TypeScript + Rust architecture for performance and reliability.

**Key Capabilities**:
- Submarine swaps (Chain → Lightning)
- Reverse submarine swaps (Lightning → Chain)
- Chain swaps (Chain → Chain) across Bitcoin/Liquid/EVM
- Atomic HTLC-based swaps (non-custodial)
- Taproot cooperative claims for privacy
- 0-confirmation support for small amounts
- BOLT12 offers and blinded paths
- RESTful HTTP API (v1 and v2)
- WebSocket real-time swap updates
- PostgreSQL/SQLite storage
- LND and CLN integration

**Tags**: `swap`, `lightning`, `submarine-swap`, `atomic-swap`, `htlc`, `taproot`, `bitcoin`, `liquid`, `evm`, `rest-api`, `typescript`, `rust`, `postgres`

**Synonyms**: `boltz`, `swap-backend`, `swap-provider`, `boltz-exchange`

**Triggers**:
- **ask_question**: `atomic swap`, `submarine swap`, `how to swap chains`, `lightning swap`, `boltz api`
- **develop**: `add swap type`, `improve swap logic`, `api endpoint`, `htlc implementation`
- **test_or_run**: `start boltz backend`, `regtest environment`, `integration test`
- **debug**: `swap stuck`, `htlc timeout`, `lightning payment failed`, `chain lockup failed`

**Dependencies**: Bitcoin node (bitcoind/btcd), Lightning node (LND/CLN), Liquid node (elementsd - optional), PostgreSQL/SQLite
**Depended On By**: `fulmine` (uses Boltz for Lightning swaps), Ark users via fulmine integration

---

### ark-docs
**ID**: `ark-docs`
**Name**: Ark Documentation
**Type**: Documentation
**Language**: MDX (Markdown + JSX)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-docs/INDEX.md`
**Repository**: `${ARK_DOCS_REPO}`
**GitHub**: `${ARK_DOCS_GITHUB}`

**Description**:
Official documentation repository for the Ark protocol and ecosystem. Built with Mintlify and published as interactive documentation site. Includes comprehensive guides on Ark concepts, arkd server, wallet development, smart contracts (Arkade language), and security model. Used as knowledge base for Q&A agents.

**Key Capabilities**:
- Ark protocol concepts (VTXOs, rounds, settlement)
- Arkd server documentation (components, transactions, security)
- Wallet development guide (integration, APIs)
- Arkade smart contracts (language reference, examples)
- Security deep-dives (economic security, finality, exit mechanisms)
- FAQ (20+ common questions)
- Mintlify-powered interactive documentation
- Auto-published via GitHub integration

**Tags**: `documentation`, `docs`, `mintlify`, `ark-protocol`, `arkd`, `wallet-guide`, `smart-contracts`, `arkade-language`, `faq`, `security`

**Synonyms**: `docs`, `documentation-site`, `knowledge-base`, `ark-manual`

**Triggers**:
- **ask_question**: Any Ark protocol question (VTXOs, rounds, security, how it works)
- **develop**: `update docs`, `add documentation`

**Dependencies**: None (standalone documentation)
**Depended On By**: All projects (reference documentation), Q&A agents (knowledge base)

---

### arkade-escrow
**ID**: `arkade-escrow`
**Name**: Arkade Escrow
**Type**: Service/Application
**Language**: TypeScript/NestJS
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-escrow/INDEX.md`
**Repository**: `${ARKADE_ESCROW_REPO}`
**GitHub**: `${ARKADE_ESCROW_GITHUB}`

**Description**:
Generic 3-party escrow system built on Ark protocol. Provides secure escrow contracts between sender (buyer), receiver (seller), and arbitrator using Virtual Escrow Contracts (VEC) with 6 spending paths (collaborative and unilateral). NestJS backend with Schnorr signature authentication, REST API, and Swagger documentation. POC/alpha status.

**Key Capabilities**:
- Virtual Escrow Contract (VEC) with Taproot multisig
- 6 spending paths: direct, release, refund (collaborative + unilateral with timelock)
- Schnorr signature-based authentication (no passwords)
- JWT token management
- Escrow request orderbook (public/private listings)
- Automated funding detection
- Dispute resolution and arbitration
- NestJS REST API with Swagger UI
- SQLite (dev) / PostgreSQL (production)
- TypeORM entities and migrations

**Tags**: `escrow`, `typescript`, `nestjs`, `taproot`, `multisig`, `schnorr`, `jwt`, `rest-api`, `swagger`, `postgres`, `arbitration`, `vec`

**Synonyms**: `escrow-service`, `3-party-escrow`, `vec-escrow`

**Triggers**:
- **ask_question**: `escrow how to`, `vec implementation`, `taproot escrow`, `arbitration process`
- **develop**: `add escrow feature`, `improve vec`, `web app`
- **test_or_run**: `start escrow api`, `test e2e`, `signup user`
- **debug**: `psbt error`, `funding not detected`, `execution failed`

**Dependencies**: `arkd` (server connection), `@arkade-os/sdk` (TypeScript SDK for Ark protocol)
**Depended On By**: E-commerce platforms, P2P marketplaces requiring escrow

---

### arkade-explorer
**ID**: `arkade-explorer`
**Name**: Arkade Explorer
**Type**: End-User Application/Web App
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/INDEX.md`
**Repository**: `/Users/dusansekulic/code/fe/arkade-explorer`
**GitHub**: `${ARKADE_EXPLORER_GITHUB}`

**Description**:
Modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of commitment transactions, Arkade transactions, and VTXO addresses using the Arkade Indexer API. Features include smart search, transaction/address browsing, VTXO status tracking, and responsive design.

**Key Capabilities**:
- Commitment transaction explorer with batch details and raw hex viewer
- Address VTXO explorer with balance statistics and status badges
- Smart search (auto-detects transaction IDs vs addresses)
- Real-time data via Arkade Indexer API
- Responsive design (mobile + desktop)
- Progressive Web App ready
- Retro Space Invaders UI theme
- Copy-to-clipboard functionality
- TanStack Query for data fetching and caching

**Tags**: `explorer`, `blockchain`, `vtxo`, `transactions`, `react`, `typescript`, `vite`, `tailwindcss`, `pwa`, `indexer`, `web-app`, `frontend`

**Synonyms**: `ark-explorer`, `block-explorer`, `tx-explorer`, `vtxo-explorer`

**Triggers**:
- **ask_question**: `view transaction`, `check vtxo`, `explore address`, `transaction details`, `block explorer`
- **develop**: `add explorer feature`, `fix ui bug`, `update sdk version`, `new transaction view`
- **test_or_run**: `start explorer`, `build explorer`, `dev server`, `preview build`
- **debug**: `transaction not found`, `vtxo status wrong`, `api error`, `loading issue`

**Dependencies**: `@arkade-os/sdk` (TypeScript SDK), Arkade Indexer API (external service)
**Depended On By**: None (end-user application)

---

## Project Relationships & Dependencies

### Dependency Graph

```
arkd (core)
   go-sdk (client library)
      ark-faucet (uses go-sdk)
      ark-simulator (uses go-sdk)
   wallet (uses @arkade-os/sdk, TypeScript equivalent)
   arkade-escrow (uses @arkade-os/sdk, TypeScript equivalent)
   ark-faucet (uses arkd APIs)
   kms-unlocker (unlocks arkd-wallet)
   fulmine (independent, but can integrate)
   ark-telemetry (monitors arkd)
   ark-infra (deploys arkd + dependencies)
   ark-docs (documents arkd)
```

### Correlation Matrix

| Project | Related To | Relationship Type |
|---------|-----------|-------------------|
| arkd | go-sdk | Server-Client |
| arkd | wallet | Server-Client (via @arkade-os/sdk) |
| arkd | arkade-escrow | Server-Client (via @arkade-os/sdk) |
| arkd | ark-faucet | Server-Client |
| arkd | ark-simulator | Server-Under-Test |
| arkd | ark-telemetry | Instrumented-Service |
| arkd | kms-unlocker | Unlocks arkd-wallet |
| go-sdk | ark-simulator | Library-Consumer |
| go-sdk | ark-faucet | Library-Consumer |
| wallet | fulmine | Integrates Lightning swaps |
| fulmine | boltz-backend | Client-Server (Swap API) |
| boltz-backend | fulmine | Swap-Provider |
| ark-infra | arkd | Deployment-Target |
| ark-infra | ark-telemetry | Deployment-Target |
| ark-docs | All | Documentation-Reference |
| arkade-explorer | arkd | Client-Server (via Indexer API) |
| arkade-explorer | wallet | Sibling Frontend (same @arkade-os/sdk) |

### Technology Groupings

**Go Projects**: arkd, go-sdk, ark-faucet, ark-simulator, kms-unlocker, fulmine
**TypeScript/JavaScript Projects**: wallet, arkade-escrow, arkade-explorer, boltz-backend (TypeScript + Rust hybrid)
**Infrastructure/Config**: ark-infra, ark-telemetry
**Documentation**: ark-docs
**External Services**: boltz-backend
**Frontend Applications**: wallet (PWA), arkade-explorer (Web App)

---

## Agent Routing Guidelines

### Intent-Based Project Selection

**Q&A / Conceptual Questions**:
- Ark protocol concepts � `ark-docs`, `arkd`
- VTXOs, rounds, settlement � `arkd`, `ark-docs`
- Wallet usage � `wallet`, `go-sdk`, `ark-docs`
- Lightning swaps � `wallet`, `fulmine`, `ark-docs`
- Escrow system � `arkade-escrow`
- Security model � `ark-docs`, `arkd`

**Development Tasks**:
- Add arkd feature � `arkd`
- Build wallet � `go-sdk`, `wallet` (depending on language)
- Escrow development � `arkade-escrow`
- Lightning integration � `fulmine`, `wallet`
- Infrastructure changes � `ark-infra`

**Testing & QA**:
- Integration testing � `arkd`, `ark-simulator`
- Load testing � `ark-simulator`
- E2E testing � `arkd`, `go-sdk`, `arkade-escrow`
- Local dev stack � `ark-infra`

**Monitoring & Debugging**:
- Metrics, dashboards � `ark-telemetry`
- Logs, traces � `ark-telemetry`
- Debug arkd issues � `arkd`, `ark-telemetry`
- Production monitoring � `ark-infra`, `ark-telemetry`

**Operations & Deployment**:
- Deploy to AWS � `ark-infra`
- Local dev environment � `ark-infra`
- Wallet unlock automation � `kms-unlocker`
- Testnet faucet � `ark-faucet`

---

## Usage Notes for Agents

### Multi-Project Queries

When a user asks about topics spanning multiple projects, load context from all relevant projects:

**Example**: "How do I test arkd with multiple wallets?"
- Load: `arkd` (server setup), `ark-simulator` (multi-client testing), `go-sdk` (wallet client)

**Example**: "Set up monitoring for production arkd deployment"
- Load: `arkd` (instrumentation), `ark-telemetry` (monitoring stack), `ark-infra` (deployment)

**Example**: "Build an escrow application"
- Load: `arkade-escrow` (example implementation), `arkd` (server requirements), `ark-docs` (protocol concepts)

### Dependency Loading

When working on a project, consider loading dependent projects:

- Working on `ark-simulator` � Also load `arkd`, `go-sdk`
- Working on `wallet` � Also load `arkd` (for server API reference)
- Working on `ark-infra` � Also load `arkd`, `ark-telemetry` (deployment targets)

### Documentation Priority

For conceptual questions, prioritize documentation loading order:
1. `ark-docs` (official protocol documentation)
2. Project-specific INDEX.md (project overview)
3. Project-specific system/ docs (architecture, design)
4. Project code (implementation details)

---

## Project Status Summary

| Project | Status | Production Ready | Notes |
|---------|--------|------------------|-------|
| arkd | Stable | � Alpha | Core protocol, active development |
| go-sdk | Stable | � Alpha | Client library, API may change |
| wallet | Active Dev | L Alpha | PWA wallet, under development |
| ark-faucet | Stable |  (Testnet) | Production-ready for testnet |
| ark-simulator | Stable |  | Testing tool, production-ready |
| ark-telemetry | Stable |  | Monitoring stack, production-ready |
| ark-infra | Active Dev | � Beta | IaC, production configurations available |
| kms-unlocker | Stable |  | Production-ready with AWS |
| fulmine | Active Dev | � Alpha | Lightning wallet, under development |
| ark-docs | Active |  | Documentation site, continuously updated |
| arkade-escrow | POC | L Alpha | Proof-of-concept, known issues |
| arkade-explorer | Active Dev | ✓ Beta | Block explorer, production-ready |

---

## Versioning & Updates

This index should be updated when:
- New projects are added to the ecosystem
- Project relationships change
- Major architectural changes occur
- New capabilities are added to existing projects
- Project status changes (alpha � beta � stable)

**Last Updated**: 2025-11-27
**Version**: 1.1.0
**Maintained By**: Arkadian Documentation Team
