# Arkadian   Project Index & Registry

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
- Arkade Assets: UTXO-native fungible/non-fungible token protocol with teleport transfers
- CEL-based programmable fee system with admin management APIs
- Liquidity analysis and manual sweep admin tools
- gRPC and REST API interfaces
- Multiple database backends (PostgreSQL with auto-creation, SQLite, Badger)
- Multiple cache backends (Redis, in-memory)

**Tags**: `ark`, `protocol`, `server`, `vtxo`, `rounds`, `bitcoin`, `layer2`, `grpc`, `rest-api`, `postgresql`, `sqlite`, `redis`, `assets`, `teleport`, `fees`, `cel`

**Synonyms**: `ark-server`, `arkd-server`, `ark-daemon`, `operator`

**Triggers**:
- **ask_question**: `vtxo`, `rounds`, `settlement`, `boarding`, `offchain`, `ark protocol`, `how does ark work`, `arkade assets`, `fees`, `teleport`
- **develop**: `add endpoint`, `new database`, `migration`, `grpc service`, `round logic`, `asset`, `fee program`
- **test_or_run**: `start arkd`, `run rounds`, `integration test`, `e2e test`, `simulation`
- **debug**: `vtxo not found`, `round failed`, `settlement error`, `database issue`
- **monitor_or_alert**: `arkd metrics`, `round latency`, `vtxo expiry`

**Dependencies**: `arkd-wallet`, `go-sdk` (protocol implementation)
**Depended On By**: `go-sdk`, `wallet`, `ark-faucet`, `ark-simulator`, `ark-telemetry`

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
- Intent fee estimation and automatic fee handling in coin selection
- Auto-finalization of pending transactions
- Expiry threshold configuration for Settle and CollaborativeExit
- Event stream topic management (UpdateStreamTopics)
- Multiple storage backends with unified interface
- gRPC-only client for arkd communication (REST removed)

**Tags**: `sdk`, `wallet`, `client`, `library`, `vtxo`, `ark`, `go`, `grpc-client`, `bip39`, `taproot`, `fees`, `auto-finalize`

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
Self-custodial Bitcoin wallet delivered as a Progressive Web App (PWA). Built with React 18, TypeScript, and Vite, using a custom in-tree component library (Ionic React was removed in PR #534). Provides a user-friendly interface for Ark protocol operations including VTXOs, off-chain payments, Lightning swaps via Boltz, LNURL receives, and on-chain boarding. Installable on mobile (iOS, Android) and desktop without app store gatekeepers.

**Key Capabilities**:
- Create and restore wallets (BIP39 seed phrases)
- Send and receive Bitcoin (onchain and offchain via Ark)
- Redesigned Send (pill Paste/Scan, Max-tap confirmation, animated overlays) and Receive v2 (styled QR, tap-to-copy)
- VTXO management, coin control, and expiry threshold handling
- Lightning Network swaps via SwapManager (submarine, reverse submarine, chain swaps via Boltz)
- LNURL receive via lnurl-server SSE session (amountless Lightning receives)
- Swap restoration from Boltz endpoint
- Nostr-based encrypted wallet backups (chunked for relay compatibility)
- In-app announcements and Chatwoot customer support (with git-commit custom attribute)
- Keyboard navigation, URL hash deep-linking, prefers-reduced-motion support
- JS/JIT capability detection for restricted environments
- Fees provider for on-chain and collaborative exit fee estimation
- Fiat currency symbol-prefix display (`$100.00`, `€50.00`, `¥1,000`); CHF/CNY keep trailing-code form
- Pill navbar overlay shown only on root pages (Wallet/Apps/Settings)
- E2E testing with Playwright using shared `arkade-regtest` submodule + `nak` Nostr relay
- Multi-arch Docker build (amd64 + arm64) via GHCR
- Progressive Web App features (installable, offline-capable)
- @arkade-os/sdk 0.4.21 and @arkade-os/boltz-swap 0.3.22

**Tags**: `wallet`, `pwa`, `react`, `typescript`, `mobile`, `desktop`, `vtxo`, `lightning`, `boltz`, `lnurl`, `self-custodial`, `offline`, `indexeddb`, `nostr`, `playwright`, `chatwoot`, `announcements`, `arkade-regtest`

**Synonyms**: `arkade-wallet`, `web-wallet`, `pwa-wallet`, `client-app`

**Triggers**:
- **ask_question**: `how to use wallet`, `pwa features`, `lightning swap`, `lnurl receive`, `install wallet`, `nostr backup`, `announcements`
- **develop**: `add wallet feature`, `fix ui bug`, `update sdk version`, `playwright test`, `swap manager`, `lnurl session`, `pill navbar`
- **test_or_run**: `start wallet dev server`, `build pwa`, `test components`, `playwright`, `e2e test`, `arkade-regtest`, `regtest:start`

**Dependencies**: `@arkade-os/sdk` (0.3.12, JavaScript SDK), `@arkade-os/boltz-swap` (0.2.19), `arkd` (server connection), `nostr-tools`
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

### arkana-knowledge
**ID**: `arkana-knowledge`
**Name**: Arkana Knowledge Base
**Type**: AI Assistant Configuration / Knowledge Base
**Language**: Markdown + TypeScript + Bash
**Index**: `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/INDEX.md`
**Repository**: `${ARKANA_KNOWLEDGE_REPO}`
**GitHub**: `ArkLabsHQ/arkana-knowledge`

**Description**:
Configuration, knowledge base, and audit trail for **Arkana**, Ark Labs' always-on AI assistant deployed on a private Hetzner VPS. Contains 16 active agent system prompts, the deep `arkwiki` knowledge base, the MCP server (TypeScript), the Slack bot (TypeScript), GitHub webhook relay (Node.js), shared agent memory, security policies, and infrastructure configs. Arkana monitors repos across ArkLabsHQ and arkade-os, reviews PRs, triages issues, surfaces security findings, and runs scheduled engineering health agents — orchestrated by Paperclip on the Claude Agent SDK.

**Key Capabilities**:
- 16 specialized AI agents (daily-briefing, pr-lifecycle, security-triage, sdk-parity, repo-sync, issue-triage, release-coordinator, research-monitor, onboarding-buddy, team-pulse-weekly, self-improver, docs-auditor, linear-sync, slack-monitor, repo-detector, executive-digest)
- Paperclip orchestration of cron-scheduled and webhook-triggered agent runs
- MCP server (`https://arkana.arkade.sh/mcp`, port 3458) for external AI tool integration
- Slack bot identity `@arkanaai` with channel allowlist enforcement
- GitHub App `arkanaai[bot]` (App ID 2923031) with dual-org auth (ArkLabsHQ + arkade-os)
- Webhook relay (port 3456) for real-time GitHub event processing
- Semantic knowledge base (676MB SQLite, Gemini embeddings, 59+ repos, 6,422+ AST chunks)
- Shared agent memory with executive-digest-queue for non-noisy Slack posting
- Information classification policy (PUBLIC / INTERNAL / CONFIDENTIAL) preventing leakage to public surfaces
- Branch+PR enforcement with `agent/{name}/{date}-{slug}` naming convention
- Protocol-critical code boundary requiring human sign-off on VTXO/signing/forfeit/round/connector/exit changes
- systemd-managed services (paperclip, arkana-mcp, arkana-slack, arkana-webhook-relay)
- Nginx reverse proxy with Let's Encrypt SSL auto-renewal

**Tags**: `ai-assistant`, `knowledge-base`, `claude-agent-sdk`, `mcp-server`, `slack-bot`, `github-integration`, `paperclip`, `agent-configs`, `semantic-search`, `vps`, `automation`, `arkana`, `arklabs`, `monitoring`, `webhook-relay`, `systemd`, `nginx`

**Synonyms**: `arkana`, `arkana-config`, `arkana-brain`, `arkanaai`, `ark-labs-ai`, `arkana-bot`

**Triggers**:
- **ask_question**: `arkana`, `ai assistant`, `agent configs`, `paperclip`, `mcp server`, `arkana brain`, `what does arkana do`, `ark labs ai`, `executive digest`, `arkwiki`
- **develop**: `add agent`, `modify agent prompt`, `mcp server feature`, `slack bot`, `webhook relay`, `arkana config`, `agent config`, `paperclip schedule`
- **test_or_run**: `deploy arkana`, `restart arkana`, `arkana service`, `start mcp`, `start slack bot`, `paperclip run`
- **debug**: `agent failed`, `arkana down`, `mcp error`, `slack bot down`, `webhook missed`, `daily briefing missing`, `paperclip not firing`, `gh-token expired`

**Dependencies**: External services only — Slack API, GitHub API (two Apps), Linear API, Anthropic Claude API / OpenRouter (GLM-5), Gemini API (embeddings)
**Depended On By**: Internal Ark Labs operations (PR review automation, security triage, executive briefings) — not consumed by other Ark protocol projects

---

### arkade-regtest
**ID**: `arkade-regtest`
**Name**: Arkade Regtest
**Type**: Testing Infrastructure / Local Stack Orchestration
**Language**: Bash + Docker Compose
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-regtest/INDEX.md`
**Repository**: `${ARKADE_REGTEST_REPO}`
**GitHub**: `arkade-os/arkade-regtest`

**Description**:
Self-contained regtest environment for Ark protocol development. Orchestrates Nigiri (Bitcoin + Liquid regtest), arkd, arkd-wallet, Fulmine, Boltz Backend, an LND Lightning node, an LNURL server, an Nginx CORS proxy, and the Ark Wallet PWA into a single reproducible Docker Compose stack. Designed to be embedded as a git submodule in projects that need a local Ark test network. Ships shell scripts and Compose files only — no compiled code.

**Key Capabilities**:
- One-command bring-up of the full Ark stack (`./start-env.sh`)
- Nigiri built from source on a pinned branch (deterministic Bitcoin regtest)
- Pluggable arkd via `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` for testing release candidates
- Layered environment loading (`--env <path>` → `../.env.regtest` → `.env` → `.env.defaults`)
- Submodule-first design: auto-discovers parent-repo `.env.regtest`
- Configurable image versions for Fulmine, Boltz, LND, LNURL, Wallet, Nginx
- Fully configurable arkd parameters (round interval, session duration, exit delays, fees, etc.) when in override mode
- Lightning helper scripts for invoice creation/payment via Boltz LND
- Stop / clean lifecycle scripts (preserve volumes vs full teardown)
- Ready-made GitHub Actions integration pattern with `_build/` cache

**Tags**: `regtest`, `docker-compose`, `nigiri`, `bitcoin`, `ark`, `arkd`, `fulmine`, `boltz`, `lightning`, `lnd`, `submodule`, `e2e`, `integration-test`, `local-stack`, `ci`

**Synonyms**: `regtest-stack`, `ark-regtest`, `regtest-env`, `local-stack`, `arkade-regtest-stack`

**Triggers**:
- **ask_question**: `regtest`, `local stack`, `nigiri`, `start ark locally`, `how to run ark stack`, `submodule regtest`, `ark dev environment`
- **develop**: `bump regtest image`, `add service to regtest`, `modify .env.defaults`, `arkd override mode`, `compose stack`
- **test_or_run**: `start regtest`, `start-env.sh`, `stop-env.sh`, `clean-env.sh`, `run e2e`, `bring up ark stack`, `local boltz`, `ci regtest`
- **debug**: `regtest stuck`, `port in use`, `nigiri build fails`, `arkd override not working`, `boltz lnd not synced`, `clean regtest`

**Dependencies**: `arkd` (server image), `arkd-wallet` (signer image), `fulmine` (image), `boltz-backend` (image), `wallet` (PWA image), Nigiri (upstream)
**Depended On By**: `arkd`, `fulmine`, `go-sdk`, `ts-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet`, `boltz-swap`, `boltz-backend`, CI pipelines (consumed as a submodule)

---

### arkade-assets
**ID**: `arkade-assets`
**Name**: Arkade Assets
**Type**: Protocol Specification
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-assets/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/arkade-assets`
**GitHub**: `https://github.com/ArkLabsHQ/arkade-assets`

**Description**:
UTXO-native asset system for Bitcoin transactions designed to operate seamlessly within the Ark protocol. Provides complete specification and reference implementation for creating, transferring, and managing digital assets (fungible and non-fungible) both on-chain (Bitcoin) and off-chain (Ark VTXOs). Features teleport transfers for asset continuity across Ark batch swaps, control assets for reissuance, metadata management with Merkle-based verification, and introspection opcodes for smart contract capabilities via Arkade Script.

**Key Capabilities**:
- UTXO-native asset protocol inspired by Runes and Liquid Assets
- Hybrid on-chain/off-chain operation with unified state view
- Teleport transfers for seamless asset movement across Ark batches
- Control assets for token reissuance and metadata updates
- Flexible metadata system with Merkle root verification
- Arkade Script introspection opcodes for smart contracts
- Reference codec implementation in TypeScript
- Indexer for tracking asset state across blockchain
- CLI tools for transaction creation and testing
- Complete examples including NFT game (ArkadeKitties)

**Tags**: `arkade`, `assets`, `protocol`, `specification`, `bitcoin`, `utxo`, `nft`, `tokens`, `teleport`, `metadata`, `smart-contracts`, `arkade-script`, `codec`, `indexer`

**Synonyms**: `arkass`, `arkade-asset-protocol`, `arkade-assets-v1`, `asset-protocol`, `arkade-nft`, `arkade-tokens`, `vtxo-assets`, `teleport-transfers`

**Triggers**:
- **ask_question**: `arkade assets`, `asset protocol`, `teleport`, `control asset`, `metadata`, `arkade script`, `asset id`, `reissuance`, `op_return`, `tlv`, `packet format`, `asset group`, `arkadekitties`
- **develop**: `implement asset`, `create asset`, `add teleport`, `metadata update`, `encode packet`, `decode packet`, `arkade script contract`
- **test_or_run**: `test codec`, `run indexer`, `build docs`, `example transaction`, `cli`
- **debug**: `invalid packet`, `asset not found`, `teleport failed`, `indexer error`, `metadata mismatch`

**Dependencies**: `arkd` (protocol implementation), `wallet` (asset UI)
**Depended On By**: `wallet`, `arkade-explorer` (asset features)

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
- Multi-AZ HA: 3-AZ VPC (eu-central-1a/1b/1c), Multi-AZ RDS, Multi-AZ Redis with automatic failover
- NAT-per-AZ feature flag (`vpc_nat_per_az`) for HA vs cost-optimized topologies
- RDS Performance Insights and configurable automatic backups (prod: 30 days)
- Network configuration (VPC, security groups, load balancers)
- Monitoring stack deployment (Prometheus, Grafana)
- Centralized container logging to AWS CloudWatch via Docker `awslogs` driver (`/ark/${env}` log group)
- Secret management (AWS Secrets Manager)
- Automated backups and disaster recovery
- Admin dashboard with URL-based deployment via SSM (`Ark-DeployService`)
- Port forwarding to EC2 services and remote hosts (RDS, Redis)
- Image pinning script for running container digest collection
- Deploys arkd / arkd-wallet `v0.9.4` from GHCR (`ghcr.io/arkade-os/arkd*`); Traefik upgraded to `v3.6.14`

**Tags**: `infrastructure`, `iac`, `terraform`, `opentofu`, `aws`, `docker-compose`, `deployment`, `devops`, `postgres`, `redis`, `vpc`, `multi-az`, `nat-per-az`, `ssm`, `port-forwarding`, `admin-dashboard`, `cloudwatch-logs`, `awslogs`, `performance-insights`, `traefik`, `ghcr`

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
Bitcoin wallet daemon with Lightning Network swap integration via Boltz. Provides both CLI and web interface for wallet management, submarine swaps (onchain → Lightning), and VHTLC (Virtual Hash Time-Locked Contract) support for Ark integration. Built with btcd wallet backend.

**Key Capabilities**:
- Bitcoin wallet operations (send, receive, balance)
- Lightning Network submarine swaps (onchain → Lightning)
- Reverse submarine swaps (Lightning → onchain)
- Chain swaps (Ark ↔ Bitcoin on-chain, no Lightning required)
- Boltz provider integration with swap restoration on restart
- VHTLC support for Ark-Lightning bridge (with renewal and settle APIs)
- Delegator service for VTXO refresh delegation (separate gRPC/REST on port 7002)
- OpenTelemetry observability (traces, metrics, logs) and Pyroscope profiling
- GetVtxos and NextSettlement query APIs
- Web interface for swap management and delegation
- CLI for wallet operations
- SQLite/Badger storage for wallet and swap state
- Docker deployment ready

**Tags**: `wallet`, `lightning`, `swap`, `submarine-swap`, `chain-swap`, `boltz`, `bitcoin`, `vhtlc`, `delegator`, `opentelemetry`, `cli`, `web-interface`, `sqlite`

**Synonyms**: `lightning-wallet`, `swap-service`, `fulmine-wallet`

**Triggers**:
- **ask_question**: `lightning swap`, `submarine swap`, `chain swap`, `how to swap`, `vhtlc`, `delegator`, `delegation`
- **develop**: `add swap feature`, `improve swap logic`, `web ui`, `chain swap`, `delegator`
- **test_or_run**: `start fulmine`, `test swap`, `run web interface`, `e2e test`
- **debug**: `swap failed`, `htlc issues`, `boltz errors`, `chain swap stuck`, `delegation failed`

**Dependencies**: `boltz-backend` (external swap provider), Bitcoin node (btcd/bitcoind)
**Depended On By**: `wallet` (for Lightning swap functionality), users needing Lightning liquidity

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
- Taproot cooperative claims/refunds for privacy (with documented `transaction.claim.pending` / `transaction.refund.pending` states)
- 0-confirmation support for small amounts; recomputed on chain-swap renegotiation
- BOLT12 offers and blinded paths (hardened)
- Persisted claim transaction tracking for reverse/chain swaps with FK-enforcing Postgres trigger
- Positive-slippage tolerance via shared `OverpaymentProtector`
- Hardened mempool.space integration (deduplicated, one-decimal-rounded BTC fee estimations)
- Fulmine integration via macaroon auth and `ListVHTLCs`
- CLI tool to rotate referral API keys
- RESTful HTTP API (v1 and v2) with improved HTTP status codes
- WebSocket real-time swap updates
- PostgreSQL/SQLite storage
- LND and CLN (v26.04.1) integration; Bitcoin Core v31.0; Elements v23.3.3
- Hybrid TypeScript v6 + Rust stack

**Tags**: `swap`, `lightning`, `submarine-swap`, `atomic-swap`, `htlc`, `taproot`, `cooperative-claim`, `bitcoin`, `liquid`, `evm`, `rest-api`, `typescript`, `rust`, `postgres`, `bolt12`, `fulmine-integration`, `mempool-space`, `claim-tracking`

**Synonyms**: `boltz`, `swap-backend`, `swap-provider`, `boltz-exchange`

**Triggers**:
- **ask_question**: `atomic swap`, `submarine swap`, `how to swap chains`, `lightning swap`, `boltz api`
- **develop**: `add swap type`, `improve swap logic`, `api endpoint`, `htlc implementation`
- **test_or_run**: `start boltz backend`, `regtest environment`, `integration test`
- **debug**: `swap stuck`, `htlc timeout`, `lightning payment failed`, `chain lockup failed`

**Dependencies**: Bitcoin node (bitcoind/btcd), Lightning node (LND/CLN), Liquid node (elementsd - optional), PostgreSQL/SQLite
**Depended On By**: `fulmine` (uses Boltz for Lightning swaps), `boltz-swap` (client library), Ark users via fulmine integration

---

### boltz-swap
**ID**: `boltz-swap`
**Name**: Arkade Boltz Swap Library
**Type**: Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-swap/INDEX.md`
**Repository**: `/Users/dusansekulic/code/fe/boltz-swap`
**GitHub**: `git@github.com:arkade-os/boltz-swap.git`

**Description**:
A production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. Provides bidirectional swaps (Lightning ↔ Arkade) with automated swap monitoring via SwapManager, support for both submarine and reverse swaps, and comprehensive error handling with automatic refund capabilities.

**Key Capabilities**:
- Create Lightning invoices that deposit funds into Arkade wallets (reverse swaps)
- Send Lightning payments from Arkade wallets (submarine swaps)
- Automated background swap monitoring via SwapManager with WebSocket and polling fallback
- Automatic claim/refund execution for swaps with configurable retry and timeout policies
- Invoice decoding and validation with swap limit checking
- Swap fee calculation for both submarine and reverse swaps
- VHTLC (Virtual HTLC) creation, monitoring, and refund handling
- Persistent swap storage using wallet contract repository
- Event-driven architecture with flexible subscription patterns for swap lifecycle events
- Support for both standard Wallet and ServiceWorkerWallet implementations

**Tags**: `lightning-network`, `submarine-swaps`, `boltz`, `arkade`, `typescript`, `swap-manager`, `vhtlc`, `bitcoin`, `payment-integration`, `event-driven`, `websocket`, `invoice-decoding`

**Synonyms**: `lightning-swaps`, `arkade-lightning`, `boltz-integration`, `swap-library`

**Triggers**:
- **ask_question**: `lightning swap`, `boltz swap`, `submarine swap`, `reverse swap`, `arkade lightning`, `vhtlc`, `swap manager`, `lightning invoice`, `lightning payment`, `swap monitoring`, `swap refund`, `swap claim`, `invoice decoding`, `swap fees`, `swap limits`
- **develop**: `add lightning`, `integrate boltz`, `implement swap`, `create invoice`, `send lightning`, `monitor swap`, `handle refund`, `swap provider`, `arkade lightning`
- **test_or_run**: `test swap`, `test lightning`, `run swap test`, `integration test`, `e2e swap`, `regtest swap`
- **debug**: `swap failing`, `invoice expired`, `swap timeout`, `refund failed`, `claim failed`, `vhtlc issue`, `swap stuck`, `websocket disconnect`

**Dependencies**: `@arkade-os/sdk` (Arkade Wallet SDK), Boltz API server, Bitcoin/Lightning infrastructure
**Depended On By**: Arkade PWA wallet, Arkade-powered applications requiring Lightning integration

---

### compiler
**ID**: `compiler`
**Name**: Arkade Compiler
**Type**: Tool/Compiler
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/compiler/INDEX.md`
**Repository**: `${COMPILER_REPO}`
**GitHub**: `${COMPILER_GITHUB}`

**Description**:
Rust-based compiler for the Arkade Script language that transforms `.ark` smart contract source files into JSON artifacts containing Bitcoin Taproot script assembly (ASM). Uses a three-stage pipeline: PEG parsing (pest) → typed AST → JSON output with dual-variant compilation (cooperative server path + unilateral exit path). Supports transaction and asset introspection, 64-bit arithmetic, and compile-time loop unrolling.

**Key Capabilities**:
- Compiles `.ark` source files to JSON with Bitcoin Taproot ASM
- Three-stage pipeline: PEG parser (pest) → typed AST → JSON output
- Dual-variant compilation: cooperative (server signature) + exit (timelock or N-of-N)
- 8 data types: pubkey, signature, bytes, bytes20, bytes32, int, bool, asset
- Cryptographic primitives: checkSig, checkMultisig, checkSigFromStack, sha256
- Transaction introspection: tx.version, tx.locktime, tx.inputs, tx.outputs
- Asset introspection: assetLookup, assetCount, assetAt, group operations
- Compile-time loop unrolling and array flattening
- 64-bit arithmetic with OP_*64 opcodes
- CLI tool (`arkadec`) and Rust library (`arkade_compiler`)

**Tags**: `compiler`, `arkade-script`, `rust`, `pest`, `peg`, `bitcoin`, `taproot`, `asm`, `smart-contract`, `introspection`, `opcodes`, `json`

**Synonyms**: `arkadec`, `arkade-compiler`, `ark-compiler`, `script-compiler`

**Triggers**:
- **ask_question**: `arkade script`, `compiler`, `ark language`, `.ark files`, `contract syntax`, `opcode`, `introspection`, `asset group`
- **develop**: `add opcode`, `new language feature`, `update grammar`, `compiler bug`, `expression type`
- **test_or_run**: `compile contract`, `cargo test`, `test compilation`, `example contract`
- **debug**: `parse error`, `compilation error`, `unexpected rule`, `asm output wrong`

**Dependencies**: None (standalone tool)
**Depended On By**: `introspector` (executes compiled Arkade Script), `arkd` (uses compiled contract artifacts)

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
Official documentation repository for the Ark protocol and ecosystem. Built with Mintlify and published as interactive documentation site. Includes comprehensive guides on Ark concepts, arkd server, wallet development (v0.3 and v0.4), smart contracts (Tapscript and Arkade language), Arkade Assets, and security model. Used as knowledge base for Q&A agents.

**Key Capabilities**:
- Ark protocol core concepts (`learn/concepts/`: vtxos, transactions, settlement, lifecycle, security)
- Arkd server documentation (components, transactions, server-security, core-services with configuration)
- Wallet development v0.4 (Latest): getting-started, operations, assets workflows, advanced (settlement-process, ramps, vtxo-management, storage adapters, service worker, Expo/React Native, AI agents)
- Wallet development v0.3 (Legacy): retained for compatibility
- Arkade contracts: deep-dive, Tapscript primitives (escrow, hashlock, Spilman channel, Dryja-Poon channel) and use cases (lightning-swaps, lightning-channels, chain-swaps, oracle-dlc)
- Arkade Assets overview and core concepts (`learn/arkade-assets/`)
- Experimental Arkade language (compiler, functions, non-interactive-swaps)
- FAQ (9 curated questions)
- LLM context menu integration (Claude, ChatGPT, Grok, Devin, Cursor, VSCode)
- Mintlify-powered interactive documentation, auto-published via GitHub

**Tags**: `documentation`, `docs`, `mintlify`, `ark-protocol`, `arkd`, `wallet-guide`, `wallets-v0.4`, `tapscript`, `smart-contracts`, `arkade-language`, `arkade-assets`, `faq`, `security`, `llm-context`

**Synonyms**: `docs`, `documentation-site`, `knowledge-base`, `ark-manual`

**Triggers**:
- **ask_question**: Any Ark protocol question (VTXOs, rounds, security, how it works)
- **develop**: `update docs`, `add documentation`

**Dependencies**: None (standalone documentation)
**Depended On By**: All projects (reference documentation), Q&A agents (knowledge base)

---

### arkade-explorer
**ID**: `arkade-explorer`
**Name**: Arkade Explorer
**Type**: End-User Application/Web App
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/INDEX.md`
**Repository**: `${ARKADE_EXPLORER_REPO}`
**GitHub**: `${ARKADE_EXPLORER_GITHUB}`

**Description**:
Modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of commitment transactions, Arkade transactions, asset details, and VTXO addresses using the Arkade Indexer API. Features smart search (auto-detects txids, outpoints, Ark addresses, and 68-hex asset IDs), VTXO tree visualization, light/dark theme, money unit toggle, real-time activity stream, and asset icon verification.

**Key Capabilities**:
- Commitment transaction explorer with batch details, VTXO tree viewer, and raw hex
- Address VTXO explorer with balance statistics, status badges, and pagination
- Asset explorer with verified asset icon system; ticker+icon (`AssetAmountDisplay`) and extension-type badges (`AssetBadge`) across tx outputs/inputs and the Packet section
- Smart search (auto-detects 64-hex txids, `txid:vout` outpoints, `tark1`/`ark1` addresses, and exactly-68-hex asset IDs)
- Real-time activity stream on homepage
- Light/dark theme toggle with persistent preference
- Money display unit toggle (sats/BTC)
- 5 React Context providers (Theme, MoneyDisplay, ServerInfo, ActivityStream, AssetIconApproval)
- TanStack Query for data fetching and caching
- Multi-arch Docker deployment via GHCR (`linux/amd64` + `linux/arm64`)
- Responsive design (mobile + desktop)

**Tags**: `explorer`, `blockchain`, `vtxo`, `transactions`, `assets`, `react`, `typescript`, `vite`, `tailwindcss`, `indexer`, `web-app`, `frontend`, `theme`, `docker`

**Synonyms**: `ark-explorer`, `block-explorer`, `tx-explorer`, `vtxo-explorer`

**Triggers**:
- **ask_question**: `view transaction`, `check vtxo`, `explore address`, `explore asset`, `transaction details`, `block explorer`
- **develop**: `add explorer feature`, `fix ui bug`, `update sdk version`, `new transaction view`, `asset page`
- **test_or_run**: `start explorer`, `build explorer`, `dev server`, `preview build`, `docker explorer`
- **debug**: `transaction not found`, `vtxo status wrong`, `api error`, `loading issue`, `asset icon not showing`

**Dependencies**: `@arkade-os/sdk` (^0.4.0-next.7, TypeScript SDK), Arkade Indexer API (external service), `arkade-assets` (asset protocol data)
**Depended On By**: None (end-user application)

---

### arkade-escrow
**ID**: `arkade-escrow`
**Name**: Arkade Escrow
**Type**: Service/Application
**Language**: TypeScript (NestJS + React)
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-escrow/INDEX.md`
**Repository**: `/Users/dusansekulic/code/typescript/arkade-escrow`
**GitHub**: `ArkLabsHQ/arkade-escrow`

**Description**:
Lightweight, browser-native escrow platform for instant, trust-minimized Bitcoin deals on Ark. Monorepo with NestJS API server, React client SPA, and React backoffice admin panel. Uses 2-of-3 multisig Virtual Escrow Contracts (VEC) with 6 Taproot spending paths (collaborative and unilateral). Deployable standalone or embedded inside Ark-enabled wallets via iframe.

**Key Capabilities**:
- Virtual Escrow Contract (VEC) with 6 Taproot spending paths
- Escrow request orderbook (public/private listings)
- Full contract lifecycle: request → accept → fund → execute/dispute → settle
- Automated VTXO funding detection (FundingWatcherService)
- Schnorr signature-based authentication (no passwords, JWT tokens)
- React client SPA for escrow users (orderbook, contracts, identity)
- React backoffice SPA for admin/arbitrator (contract management, dispute resolution)
- NestJS REST API with Swagger UI documentation
- Server-Sent Events for real-time contract updates
- SQLite storage with TypeORM (better-sqlite3)

**Tags**: `escrow`, `typescript`, `nestjs`, `react`, `taproot`, `multisig`, `schnorr`, `jwt`, `rest-api`, `swagger`, `sqlite`, `arbitration`, `vec`, `vtxo`, `vite`, `tailwind`

**Synonyms**: `escrow-service`, `3-party-escrow`, `vec-escrow`, `arkade-escrow-api`

**Triggers**:
- **ask_question**: `escrow`, `vec`, `taproot escrow`, `arbitration`, `3-party multisig`, `escrow contract`
- **develop**: `add escrow feature`, `escrow ui`, `contract lifecycle`, `arbitration`, `escrow api`
- **test_or_run**: `start escrow`, `test escrow`, `escrow e2e`, `run escrow`
- **debug**: `psbt error`, `funding not detected`, `execution failed`, `escrow contract error`

**Dependencies**: `arkd` (server connection), `@arkade-os/sdk` (TypeScript SDK for Ark protocol)
**Depended On By**: Arkade wallet (iframe embedding), P2P marketplaces requiring escrow

---

### introspector
**ID**: `introspector`
**Name**: Introspector
**Type**: Service/Co-Signer
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/introspector/INDEX.md`
**Repository**: `${INTROSPECTOR_REPO}`
**GitHub**: `${INTROSPECTOR_GITHUB}`

**Description**:
Arkade Script execution and signing microservice for the Ark protocol. Receives Ark transactions (PSBTs) carrying an **Introspector Packet** (a TLV inside an ARK extension OP_RETURN) that lists per-input Arkade Script bytecode + witness, executes those scripts in a custom VM extending Bitcoin Script with 50+ introspection opcodes (incl. unified BigNum arithmetic and packet introspection), and signs transactions upon successful execution. Participates in the Ark round lifecycle (off-chain tx, intent proofs, batch finalization) and also signs onchain Bitcoin PSBTs for unrolled VTXOs (`SubmitOnchainTx`). When this introspector is the last required non-`arkd` signer, it forwards the set to `arkd`, merges its signatures and finalizes.

**Key Capabilities**:
- Arkade Script engine with 50+ custom opcodes (introspection, packet introspection `OP_INSPECTPACKET`/`OP_INSPECTINPUTPACKET`, BigNum arithmetic with `NUM2BIN`/`BIN2NUM`, EC operations, SHA256 streaming, asset introspection)
- Introspector Packet (TLV inside ARK extension OP_RETURN) — per-input script + witness payload (max 1000 entries, script ≤10KB, witness ≤1MB)
- Off-chain Ark transaction validation and Schnorr/Taproot signing; auto-finalization with `arkd` when last non-`arkd` signer
- Onchain VTXO signing via `SubmitOnchainTx` (rejects inputs whose tapscript closure also contains the `arkd` signer pubkey)
- Intent proof validation and signing before round registration
- Batch finalization signing (forfeits and commitment transactions)
- Connector tree validation for forfeit transactions
- gRPC + REST API via meshapi gateway (port 7073)
- Go client library (`pkg/client`) for programmatic access
- Per-script key derivation (tweaked signing keys; `tagged_hash("ArkScriptHash", script)`)
- TLS with auto-generated certificates
- Tapscript signature verification delegated to `ark-lib`
- Fuzz-tested tokenizer, opcodes, and engine

**Tags**: `arkade-script`, `introspection`, `signing`, `co-signer`, `psbt`, `schnorr`, `taproot`, `grpc`, `opcodes`, `bitcoin-script`, `covenant`, `smart-contract`, `bignum`, `introspector-packet`, `onchain-signing`, `fuzz-tested`

**Synonyms**: `arkade-script-engine`, `script-validator`, `co-signer`, `introspector-service`

**Triggers**:
- **ask_question**: `arkade script`, `introspection opcodes`, `script engine`, `co-signing`, `transaction introspection`, `covenant`, `OP_INSPECT`, `OP_INSPECTPACKET`, `bignum arithmetic`, `introspector packet`, `ARK extension`
- **develop**: `add opcode`, `script engine`, `introspector api`, `signing logic`, `finalization`, `onchain signing`, `submitonchain`
- **test_or_run**: `run introspector`, `integration test`, `test arkade script`, `e2e test`, `fuzz arkade`, `htlc test`, `delegate test`
- **debug**: `script execution failed`, `signing error`, `connector not in tree`, `intent not signed`, `arkd url missing`, `last non-arkd signer`

**Dependencies**: `arkd` (ark-lib packages for intent, tree, script, txutils, tapscript signature verification; runtime gRPC connection via `INTROSPECTOR_ARKD_URL` to fetch arkd's signer pubkey and to forward last-signer finalization sets), `go-sdk` (gRPC transport client)
**Depended On By**: `arkd` (uses introspector for Arkade Script validation and signing)

---

### enclave
**ID**: `enclave`
**Name**: Simple Enclave (introspector-enclave)
**Type**: Infrastructure Framework / Security Tool
**Language**: Go (CLI/SDK), Rust (verified client)
**Index**: `${ARKADIAN_DIR}/docs/projects/enclave/INDEX.md`
**Repository**: `${ENCLAVE_REPO}`
**GitHub**: `ArkLabsHQ/enclave`

**Description**:
CLI framework + runtime SDK for deploying any plain HTTP server inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, reproducible Nix-based EIF builds, and a PCR0-locked KMS confidentiality root. Apps need zero enclave-specific code — the runtime supervisor handles attestation, KMS secret decryption, PCR extension, response signing, encrypted storage, and dynamic secrets. The host-side `enclave-supervisor.service` runs as a single binary owning gvproxy (vsock outbound), viproxy (IMDS forwarding), the nitro-cli watchdog, and a localhost management API. Supports Go (1.25+), Node.js (22+), and .NET (10.0+) app templates.

**Key Capabilities**:
- Reproducible EIF builds via pinned NixOS Docker image + `monzo/aws-nitro-util` (byte-identical PCR0 across builders)
- PCR0-locked KMS policy — `kms:Decrypt` only when `RecipientAttestation:PCR0` matches; optional irreversible lockdown (`is_kms_key_locked: true` / `enclave lock`) where even AWS root cannot rewrite the policy
- BIP-340 Schnorr response-signing middleware — every HTTP response carries `X-Attestation-Signature` + `X-Attestation-Pubkey` bound to the attestation document's `UserData` via `appKeyHash`
- PCR16+ extension on boot with `SHA256(compressed_secp256k1_pubkey)` per configured secret
- Locked-key migration — 9-step in-place re-encryption flow (`POST /migrate`, NDJSON streaming, idempotent) for rotating PCR0 even when the KMS policy is permanently frozen
- PCR0 attestation chain — each version records its predecessor's PCR0 + an NSM signed proof; `enclave verify` walks the chain against the AWS Nitro root
- Encrypted persistent storage — `PUT/GET/DELETE/LIST /v1/storage/{key}` backed by S3 + AES-256-GCM with a KMS-protected DEK (up to 10 MB per object)
- Dynamic secrets API — runtime-mutable secrets persisted encrypted in S3 (reuses storage DEK), optional `env_var` boot binding, max 64 KB per secret
- Build-time vs deploy-time env split — `app.env` baked into PCR0 (schema attested); `env_values` overlay via `TF_VAR` / `*.auto.tfvars.json` / `-var` (values not attested)
- Two artifact-source modes — local upload (default, fast iteration) or remote curl from a published GitHub Release at apply time (`enclave tofu --remote`)
- Verified clients in Go (`client/`) and Rust (`client-rs/` Cargo workspace member) — verify NSM attestation chain + Schnorr signatures on every response
- Local QEMU integration test harness (`-M nitro-enclave` via QEMU 9.2 + vhost-device-vsock) — 15 integration tests + full locked-key migration + post-migration verification
- CI scaffolding — `enclave init` and `enclave generate template` write `deploy-enclave.yml`, `destroy-enclave.yml`, `verify-enclave.yml` with OIDC, GitHub artifact attestations, and a `gh-pages` attestation status page
- OpenTofu deployment scaffold (`./tofu/`) — merge-only-new module tree with inline `enclave-supervisor.service` systemd unit in `user_data.sh.tftpl`

**Tags**: `aws-nitro`, `enclave`, `confidential-computing`, `kms`, `attestation`, `pcr0`, `schnorr`, `bip-340`, `reproducible-build`, `nix`, `vsock`, `gvproxy`, `nitriding`, `viproxy`, `cdk`, `opentofu`, `iam`, `s3`, `aes-256-gcm`, `secrets`, `framework`, `cli`, `go`, `nodejs`, `dotnet`, `rust-client`

**Synonyms**: `simple-enclave`, `introspector-enclave`, `nitro-enclave-framework`, `enclave-cli`, `enclave-supervisor`

**Triggers**:
- **ask_question**: `nitro enclave`, `attestation`, `pcr0`, `kms locked`, `schnorr signature`, `confidential computing`, `enclave migration`, `pcr extension`, `appKeyHash`, `nitriding`, `gvproxy`, `viproxy`
- **develop**: `add cli command`, `runtime feature`, `supervisor change`, `kms policy`, `migration step`, `dynamic secret`, `storage api`, `tofu module`, `cdk stack`, `attestation chain`
- **test_or_run**: `enclave build`, `enclave deploy`, `enclave verify`, `enclave migrate`, `qemu nitro-enclave`, `integration test eif`, `make test`, `make test-docker`, `vsock loopback`
- **debug**: `pcr0 mismatch`, `kms decrypt failed`, `attestation hash 403`, `migration already in progress`, `secret too large`, `vsock device not found`, `imds proxy unreachable`, `signature verification failed`

**Dependencies**: AWS services (KMS, SSM, S3, EC2, IAM), Nix + Docker (build), `nitriding` (TLS termination), `gvproxy` (vsock outbound), `vhost-device-vsock` (local test harness), `monzo/aws-nitro-util` (EIF packaging)
**Depended On By**: Any ArkLabs / Arkade Bitcoin / Ark protocol service that needs attested confidential execution (e.g., `introspector` co-signer deployment, future signing services, custodial wallet services)

---

### dotnet-sdk
**ID**: `dotnet-sdk`
**Name**: NArk (.NET Ark SDK)
**Type**: Client Library
**Language**: C# / .NET 8+
**Index**: `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/INDEX.md`
**Repository**: `${DOTNET_SDK_REPO}`
**GitHub**: `arkade-os/dotnet-sdk`

**Description**:
.NET SDK for building Ark protocol wallets and applications. Provides a complete client-side implementation including VTXO management, batch session participation (MuSig2 tree signing), intent-based transaction construction, coin selection, sweeping, on-chain operations, payment tracking, and Boltz integration (submarine / reverse / chain swaps). Published as NuGet packages with a fluent builder pattern for DI configuration. Ships a Blazor WASM sample wallet and DocFX-generated docs site, both deployed to GitHub Pages.

**Key Capabilities**:
- VTXO lifecycle management with resilient sync (stream + 5 s routine poll + retry schedule, time-window `after` filtering)
- Batch round participation with MuSig2 tree signing
- Intent-based off-chain transactions (create, register, sync, schedule)
- Automatic coin selection with dust / sub-dust handling and server-driven `MaxOpReturnOutputs` / `MaxTxWeight`
- Server-enforced VTXO/UTXO amount bounds and `BoardingAllowed` gate
- Taproot contracts (payment, note, hash-locked, VHTLC)
- On-chain boarding, settlement, and collaborative exit
- Sweeping expired/swept VTXOs on-chain
- Boltz submarine (Ark→Lightning), reverse (Lightning→Ark), and chain (ARK<->BTC) swaps with MuSig2 cross-signatures
- Payment tracking (`ArkPayment`, `ArkPaymentRequest`, `PaymentTrackingService`) — opt-in via `AddArkPaymentTracking()`
- Vendored NBitcoin.Scripting (`OutputDescriptor`, parsers, `SigningRepository`) in `NArk.Abstractions`
- HD wallet support with descriptor recycling
- EF Core storage package (pluggable DB provider, opt-in payment entities)
- gRPC + REST/SSE transports with camelCase, string-encoded int64, and custom-signet (mutinynet) handling
- Shared regtest E2E environment via the `arkade-os/arkade-regtest` git submodule + .NET Aspire AppHost
- Blazor WASM sample wallet (`samples/NArk.Wallet/`) deployed to GitHub Pages alongside DocFX docs

**Tags**: `sdk`, `dotnet`, `csharp`, `nuget`, `client`, `library`, `vtxo`, `musig2`, `batch`, `intent`, `boltz`, `swap`, `efcore`, `aspire`, `regtest-submodule`, `grpc-client`, `rest-client`, `sse`, `taproot`, `output-descriptor`, `payment-tracking`, `lnurl`, `blazor`, `wasm`, `docfx`

**Synonyms**: `nark`, `nark-sdk`, `dotnet-client`, `csharp-sdk`, `.net-sdk`

**Triggers**:
- **ask_question**: `dotnet sdk`, `csharp ark`, `.net wallet`, `nark`, `nuget ark`, `nark wasm wallet`, `nark sample wallet`
- **develop**: `dotnet feature`, `csharp wallet`, `.net integration`, `efcore storage`, `payment tracking`, `output descriptor`, `blazor wasm wallet`
- **test_or_run**: `dotnet test`, `aspire apphost`, `nark e2e`, `arkade-regtest submodule`, `docfx serve`
- **debug**: `grpc connection`, `rest sse 501`, `batch session error`, `musig2 mismatch`, `swap failed`, `mutinynet network`, `bit besql sqlite`, `vtxo 11k cap`

**Dependencies**: `arkd` (server communication via gRPC + REST/SSE), `fulmine` (Boltz-side wallet in E2E), `boltz-backend` (swap provider), `arkade-regtest` (shared regtest env, git submodule)
**Depended On By**: .NET applications building on Ark protocol

---

### ts-sdk
**ID**: `ts-sdk`
**Name**: Ark TypeScript SDK
**Type**: Client Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/ts-sdk/INDEX.md`
**Repository**: `${TS_SDK_REPO}`
**GitHub**: `arkade-os/ts-sdk`

**Description**:
Official TypeScript SDK (`@arkade-os/sdk`) for the Ark protocol. Provides a complete client library for building Bitcoin wallets with Taproot and Ark VTXO support. Features wallet management (full + watch-only), HD identity (BIP39/BIP86), VTXO operations, batch settlement with MuSig2, asset management, VTXO delegation, unilateral exit, and service worker support. Runs in browsers, Node.js, React Native/Expo with pluggable storage adapters.

**Key Capabilities**:
- Wallet creation and management (Wallet, ReadonlyWallet, ServiceWorkerWallet, OnchainWallet)
- HD identity with BIP39 mnemonic and BIP86 Taproot derivation
- VTXO operations (send, receive, settle, renew, recover)
- Batch settlement with MuSig2 tree signing
- Asset management (issue, reissue, burn, transfer)
- VTXO delegation to third-party delegator services
- Onboarding/offboarding (on-chain to off-chain conversion)
- Unilateral exit (unroll + timelock)
- Service worker wallet for background operation
- 5 storage adapters (InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage)
- Expo/React Native support with SSE-compatible providers
- ArkNote serializable payment format

**Tags**: `typescript`, `sdk`, `wallet`, `vtxo`, `bitcoin`, `taproot`, `musig2`, `bip39`, `bip86`, `service-worker`, `react-native`, `expo`, `storage-adapters`, `npm`

**Synonyms**: `@arkade-os/sdk`, `ark-ts-sdk`, `typescript-sdk`, `js-sdk`

**Triggers**:
- **ask_question**: `typescript sdk`, `wallet api`, `vtxo management`, `storage adapter`, `service worker wallet`, `ark address`, `boarding address`
- **develop**: `add wallet feature`, `new provider`, `storage adapter`, `asset management`, `delegation`, `expo support`
- **test_or_run**: `run sdk tests`, `vitest`, `nigiri`, `integration test`, `regtest`
- **debug**: `sse not working`, `crypto polyfill`, `service worker error`, `vtxo expired`, `settlement timeout`

**Dependencies**: `arkd` (REST API + SSE), `fulmine` (delegator service, optional)
**Depended On By**: `wallet`, `arkade-escrow`

---

### rust-sdk
**ID**: `rust-sdk`
**Name**: Arkade Rust SDK (ark-rs)
**Type**: Library/SDK
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/rust-sdk/INDEX.md`
**Repository**: `${RUST_SDK_REPO}`
**GitHub**: `${RUST_SDK_GITHUB}`

**Description**:
Collection of Rust crates for building Bitcoin wallets with Ark protocol support. Workspace includes ark-core (protocol types, MuSig2, coin selection, Arkade Asset V1), ark-client (high-level API with VTXO watcher and chain swaps), ark-grpc/ark-rest (transport), ark-bdk-wallet (BDK integration), ark-delegator (REST client for delegator services), and ark-fees (fee estimation). Supports WASM compilation for browser use.

**Key Capabilities**:
- Core Ark protocol types (ArkAddress, VTXO, BoardingOutput, ArkNote, vHTLC)
- High-level client API (send VTXOs, settle rounds, check balances, transaction history)
- Generic offchain transaction builder (shared by VTXO and asset sends)
- gRPC transport (tonic) and REST transport (reqwest, WASM-compatible) — arkd 0.9.2
- MuSig2 cooperative signing for round participation
- BDK wallet integration for on-chain operations
- Boltz submarine, reverse submarine, **and chain swaps** (ARK ↔ on-chain BTC)
- **Arkade Asset V1**: issue, transfer, burn, reissue with asset-preserving settlement
- **VTXO delegation**: 3-of-3 delegated VTXOs, REST delegator client (`ark-delegator`), background `VtxoWatcher` for auto-renewal
- DLC (Discreet Log Contracts) support
- Key discovery (probes delegate addresses too)
- Coin selection algorithms and fee estimation
- WASM build support (ark-core, ark-rest)
- Comprehensive E2E test suite against live arkd (incl. `e2e_assets`, `fulmine_delegator_smoke`)

**Tags**: `rust`, `sdk`, `ark`, `vtxo`, `musig2`, `grpc`, `rest`, `wasm`, `bdk`, `boltz`, `bitcoin`, `wallet-library`, `delegator`, `vtxo-watcher`, `arkade-asset`, `chain-swap`

**Synonyms**: `ark-rs`, `rust-ark-sdk`, `ark-rust`

**Triggers**:
- **ask_question**: `rust sdk`, `ark-rs`, `ark-core`, `ark-client`, `ark-delegator`, `rust wallet`, `wasm ark`, `bdk integration`, `vtxo watcher`, `arkade asset rust`, `rust chain swap`
- **develop**: `add rust feature`, `new crate`, `ark-core type`, `musig2 signing`, `wasm support`, `e2e test`, `delegator client`, `asset issuance rust`, `chain swap rust`
- **test_or_run**: `cargo test`, `just test`, `e2e-tests`, `nigiri`, `wasm-pack test`, `just e2e-full`, `e2e_assets`, `fulmine_delegator_smoke`
- **debug**: `tonic error`, `grpc connection`, `round signing failed`, `wasm build error`, `musig nonce`, `delegator error`, `vtxo watcher error`, `chain swap refund`

**Dependencies**: `arkd` (gRPC/REST server, 0.9.2), `boltz-backend` (swap provider, optional — used for chain swaps), `fulmine` (delegator service, optional), `Nigiri` (testing)
**Depended On By**: None (library — consumed by external wallet applications)

---

## Project Relationships & Dependencies

### Dependency Graph

```
arkd (core)
   go-sdk (client library)
      ark-faucet (uses go-sdk)
      ark-simulator (uses go-sdk)
   dotnet-sdk (.NET client library, gRPC to arkd)
   rust-sdk (Rust client library - ark-rs, gRPC/REST to arkd)
   ts-sdk (TypeScript client library - @arkade-os/sdk)
      wallet (uses ts-sdk)
      arkade-escrow (uses ts-sdk)
   ark-faucet (uses arkd APIs)
   kms-unlocker (unlocks arkd-wallet)
   fulmine (independent, but can integrate)
   ark-telemetry (monitors arkd)
   introspector (Arkade Script co-signer)
   compiler (Arkade Script compiler, produces contract artifacts)
   ark-infra (deploys arkd + dependencies)
   ark-docs (documents arkd)

boltz-backend (external swap provider)
   fulmine (uses Boltz for Lightning swaps)
   boltz-swap (client library for Boltz API)

wallet / @arkade-os/sdk
   boltz-swap (Lightning integration for Arkade wallets)
   arkade-escrow (uses @arkade-os/sdk for VEC escrow)

arkana-knowledge (Ark Labs AI assistant — operational, not protocol)
   monitors all ArkLabsHQ + arkade-os repos via GitHub App
   produces digests, PR reviews, issue triage; not consumed by protocol projects

enclave (AWS Nitro Enclave framework — confidential execution for any HTTP app)
   independent infrastructure framework
   potential deployment target for: introspector (co-signer), future signing services
   external deps: AWS KMS/SSM/S3/EC2/IAM, Nix, Docker, nitriding, gvproxy

arkade-regtest (local Ark stack — Bash + Docker Compose orchestration)
   consumed as a git submodule by:
      arkd, fulmine, go-sdk, ts-sdk, rust-sdk, dotnet-sdk
      wallet, boltz-swap, boltz-backend (integration tests)
   bundles upstream services: nigiri, arkd, arkd-wallet, fulmine, boltz, lnd, lnurl, wallet PWA, nginx
```

### Correlation Matrix

| Project | Related To | Relationship Type |
|---------|-----------|-------------------|
| arkd | go-sdk | Server-Client |
| arkd | dotnet-sdk | Server-Client (via gRPC) |
| arkd | wallet | Server-Client (via @arkade-os/sdk) |
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
| arkade-assets | arkd | Protocol-Implementation |
| arkade-assets | wallet | Asset-UI-Provider |
| arkade-assets | arkade-explorer | Asset-Visualization-Provider |
| arkade-explorer | arkd | Client-Server (via Indexer API) |
| arkade-explorer | wallet | Sibling Frontend (same @arkade-os/sdk) |
| arkade-explorer | arkade-assets | Asset-Consumer |
| wallet | arkade-assets | Asset-Consumer |
| wallet | boltz-swap | Library-Consumer (Lightning integration) |
| boltz-swap | boltz-backend | Client-Server (Boltz API) |
| boltz-swap | @arkade-os/sdk | Library-Consumer (Wallet SDK) |
| arkade-escrow | arkd | Server-Client (via @arkade-os/sdk) |
| arkade-escrow | @arkade-os/sdk | Library-Consumer |
| introspector | arkd | Co-Signer (Arkade Script validation) |
| dotnet-sdk | arkd | Client-Server (via gRPC and REST/SSE) |
| dotnet-sdk | fulmine | E2E-Test-Dependency |
| dotnet-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| dotnet-sdk | arkade-regtest | Shared E2E regtest environment (git submodule) |
| arkade-regtest | arkd | Bundles arkd image (nigiri-built or override) |
| arkade-regtest | fulmine | Bundles fulmine image |
| arkade-regtest | boltz-backend | Bundles Boltz backend image |
| arkade-regtest | wallet | Bundles wallet PWA image |
| arkade-regtest | go-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | ts-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | rust-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | boltz-swap | Provides regtest target for Lightning swap UI tests |
| ts-sdk | arkd | Client-Server (REST/SSE) |
| ts-sdk | wallet | Library-Consumer |
| ts-sdk | arkade-escrow | Library-Consumer |
| ts-sdk | fulmine | Delegator-Integration |
| rust-sdk | arkd | Client-Server (via gRPC/REST, 0.9.2) |
| rust-sdk | go-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | ts-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | dotnet-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| rust-sdk | fulmine | Delegator-Integration (VTXO auto-renewal) |
| compiler | introspector | Compiler-Runtime (compiler produces, introspector executes) |
| compiler | arkd | Compiler-Consumer (arkd uses compiled contract artifacts) |
| compiler | arkade-assets | Language-Specification (compiler implements Arkade Script) |
| arkana-knowledge | All ArkLabsHQ + arkade-os repos | Observer/Reviewer (PR reviews, issue triage, digests) |
| arkana-knowledge | None (downstream) | Operations meta-project — not consumed by protocol projects |
| enclave | AWS Nitro | Confidential-Execution-Framework (PCR0-locked KMS, attested boot) |
| enclave | introspector | Potential-Deployment-Target (co-signer in attested enclave) |

### Technology Groupings

**Go Projects**: arkd, go-sdk, ark-faucet, ark-simulator, kms-unlocker, fulmine, introspector, enclave (CLI + runtime + supervisor)
**Rust Projects**: rust-sdk, compiler, enclave (`client-rs/` Cargo workspace member)
**C#/.NET Projects**: dotnet-sdk
**TypeScript/JavaScript Projects**: ts-sdk, wallet, arkade-assets, arkade-explorer, arkade-escrow, boltz-swap, boltz-backend (TypeScript + Rust hybrid)
**Infrastructure/Config**: ark-infra, ark-telemetry, arkade-regtest (Bash + Docker Compose orchestration), enclave (Nix + Docker + AWS CDK + OpenTofu)
**Confidential Computing / Security**: enclave (AWS Nitro Enclaves), kms-unlocker (KMS + Secrets Manager)
**Documentation**: ark-docs
**External Services**: boltz-backend
**Frontend Applications**: wallet (PWA), arkade-explorer (Web App)
**Protocol Specifications**: arkade-assets
**AI Assistant / Operations**: arkana-knowledge (configuration + knowledge base for Arkana, the Ark Labs AI assistant)

---

## Agent Routing Guidelines

### Intent-Based Project Selection

**Q&A / Conceptual Questions**:
- Ark protocol concepts → `ark-docs`, `arkd`
- VTXOs, rounds, settlement → `arkd`, `ark-docs`
- Wallet usage → `wallet`, `ts-sdk`, `go-sdk`, `rust-sdk`, `ark-docs`
- Lightning swaps → `wallet`, `boltz-swap`, `fulmine`, `ark-docs`
- Security model → `ark-docs`, `arkd`
- Asset protocol, NFTs, tokens → `arkade-assets`, `ark-docs`
- Escrow system → `arkade-escrow`
- Arkade Script, covenants → `compiler`, `introspector`, `arkd`

**Development Tasks**:
- Add arkd feature → `arkd`
- Build wallet → `go-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet` (depending on language)
- Escrow development → `arkade-escrow`
- Lightning integration → `fulmine`, `boltz-swap`, `wallet`
- Infrastructure changes → `ark-infra`
- Asset implementation → `arkade-assets`, `arkd`
- Arkade Script/opcode development → `compiler`, `introspector`

**Testing & QA**:
- Integration testing → `arkd`, `ark-simulator`, `arkade-regtest`
- Load testing → `ark-simulator`
- E2E testing → `arkd`, `go-sdk`, `arkade-regtest`
- Local dev stack → `arkade-regtest` (regtest), `ark-infra` (cloud)
- Bring up Ark + Boltz + LND locally → `arkade-regtest`

**Monitoring & Debugging**:
- Metrics, dashboards → `ark-telemetry`
- Logs, traces → `ark-telemetry`
- Debug arkd issues → `arkd`, `ark-telemetry`
- Production monitoring → `ark-infra`, `ark-telemetry`

**Operations & Deployment**:
- Deploy to AWS → `ark-infra`
- Local dev environment → `arkade-regtest` (preferred for protocol dev), `ark-infra` (cloud)
- Wallet unlock automation → `kms-unlocker`
- Testnet faucet → `ark-faucet`

---

## Usage Notes for Agents

### Multi-Project Queries

When a user asks about topics spanning multiple projects, load context from all relevant projects:

**Example**: "How do I test arkd with multiple wallets?"
- Load: `arkd` (server setup), `ark-simulator` (multi-client testing), `go-sdk` (wallet client)

**Example**: "Set up monitoring for production arkd deployment"
- Load: `arkd` (instrumentation), `ark-telemetry` (monitoring stack), `ark-infra` (deployment)

### Dependency Loading

When working on a project, consider loading dependent projects:

- Working on `ark-simulator` → Also load `arkd`, `go-sdk`
- Working on `wallet` → Also load `ts-sdk`, `arkd` (for SDK and server API reference)
- Working on `ts-sdk` → Also load `arkd` (for server API reference)
- Working on `ark-infra` → Also load `arkd`, `ark-telemetry` (deployment targets)

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
| arkd | Stable | →  Alpha | Core protocol, active development |
| go-sdk | Stable | →  Alpha | Client library, API may change |
| wallet | Active Dev | L Alpha | PWA wallet, under development |
| ark-faucet | Stable |   (Testnet) | Production-ready for testnet |
| ark-simulator | Stable |   | Testing tool, production-ready |
| ark-telemetry | Stable |   | Monitoring stack, production-ready |
| ark-infra | Active Dev | →  Beta | IaC, production configurations available |
| kms-unlocker | Stable |   | Production-ready with AWS |
| fulmine | Active Dev | →  Alpha | Lightning wallet, under development |
| ark-docs | Active |   | Documentation site, continuously updated |
| arkade-assets | Specification | N/A | Protocol spec + reference implementation |
| arkade-escrow | POC | L Alpha | Escrow platform, proof-of-concept |
| arkade-explorer | Active Dev | ✓ Beta | Block explorer, production-ready |
| introspector | Active Dev | → Alpha | Arkade Script co-signer |
| dotnet-sdk | Active Dev | Beta | .NET SDK, 1.0-beta, NuGet packages, DocFX site + Blazor WASM sample wallet on GitHub Pages |
| boltz-swap | Active Dev | ✓ Beta | TypeScript Boltz swap library, v0.3.22, @arkade-os/sdk 0.4.21 |
| compiler | Active Dev | Alpha | Arkade Script compiler, Rust CLI + library |
| ts-sdk | Active Dev | ✓ Beta | v0.4.21, npm published, multi-platform |
| arkana-knowledge | Active | ✓ Production | AI assistant config + KB for Arkana on Hetzner CPX32 VPS, 16 active agents |

---

## Versioning & Updates

This index should be updated when:
- New projects are added to the ecosystem
- Project relationships change
- Major architectural changes occur
- New capabilities are added to existing projects
- Project status changes (alpha → beta → stable)

**Last Updated**: 2026-04-30
**Version**: 1.5.4
**Maintained By**: Arkadian Documentation Team
