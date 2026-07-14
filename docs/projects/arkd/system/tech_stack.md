# Technology Stack

## Overview

arkd is built with Go 1.26.5+ using modern Bitcoin libraries and infrastructure components. The stack emphasizes reliability, testability, and maintainability through clean architecture patterns.

## Core Technologies

### Programming Language
**Go 1.26.5+** - Compiled, statically-typed language with excellent concurrency primitives for managing rounds and background services. Strong Bitcoin development ecosystem with cross-platform compilation support. The toolchain is pinned to `go 1.26.5` in every module (bumped from `1.26.4` in PR #1151) (`go.mod`, `api-spec/go.mod`, `pkg/ark-cli/go.mod`, `pkg/ark-lib/go.mod`, `pkg/arkd-wallet/go.mod`, `pkg/client-lib/go.mod`, `pkg/errors/go.mod`, `pkg/kvdb/go.mod`, `pkg/macaroons/go.mod`) and in the CI workflows (`.github/workflows/{unit,integration,artifacts,release}.yaml`) and Docker builds (`Dockerfile`, `arkdwallet.Dockerfile`, `arkdwallet.btcwallet.Dockerfile`).

### Bitcoin Libraries

**btcsuite (btcd)** - Core Bitcoin protocol implementation with full taproot and schnorr signature support:
- `btcec/v2` - Elliptic curve cryptography and schnorr signatures
- `btcutil` - Address encoding and amount handling
- `btcutil/psbt` - Partially Signed Bitcoin Transaction support
- `chaincfg` - Network parameters (mainnet, testnet, regtest, signet)
- `txscript` - Bitcoin script parsing and execution

**MuSig2** - Multi-signature scheme for tree transaction signing with efficient signature aggregation (BIP-327 compatible).

## Communication & APIs

**gRPC** - Protocol Buffers-based RPC framework for:
- Server-client communication between arkd and wallets
- arkd-to-arkd-wallet communication
- Strongly-typed API contracts with bidirectional streaming

**gRPC-Gateway** - Automatic REST API generation from gRPC definitions with Swagger/OpenAPI documentation.

**Protocol Buffers** - Interface Definition Language for efficient binary serialization with generated Go code.

The public and admin HTTP servers configure HTTP/2 through the Go stdlib `http.Protocols` / `http.HTTP2Config` API (`internal/interface/grpc/service.go`): HTTP/1 is always enabled, unencrypted HTTP/2 (h2c) is enabled in insecure mode and TLS HTTP/2 otherwise, with the `ARKD_MAX_CONCURRENT_STREAMS` budget passed via `HTTP2Config.MaxConcurrentStreams`. This replaced the prior manual `golang.org/x/net/http2` + `h2c` wiring as of the `x/net` 0.55.0 bump (PR #1126).

## Database Technologies

**PostgreSQL (Production)** - Primary database with ACID transactions, JSONB support for tree structures, advanced indexing, and connection pooling. Integrated with sqlc for type-safe queries and Watermill for event streaming. The bundled `docker-compose.regtest.yml` uses `postgres:17.8`.

**SQLite (Development)** - Embedded SQL database with zero configuration, compatible schema with PostgreSQL, excellent for testing and development.

**BadgerDB (Embedded)** - LSM tree-based key-value store with high write throughput, transaction support, and both in-memory and disk-backed modes.

## Cache & State Management

**Redis (Production)** - Distributed in-memory cache for multi-instance deployments with pub/sub, transaction support (WATCH/MULTI), and clustering for high availability. Used for current round state, intent queue, forfeit transactions, and MuSig2 sessions.

**In-Memory Cache (Development)** - Simple Go map-based cache for single-instance deployments and testing.

## Code Generation Tools

**sqlc** - Type-safe Go code generation from SQL, compiling queries at build time to catch errors before runtime. Supports PostgreSQL and SQLite dialects.

**protoc** - Protocol Buffers compiler generating strongly-typed message structs and gRPC service interfaces.

**golang-migrate** - Database migration management with sequential versioned migrations, embedded via go:embed, supporting both up and down migrations.

## Scheduling & Background Tasks

**gocron (Time-Based)** - Cron-like scheduler for fixed time intervals, suitable for development and testing.

**Block-Based Scheduler** - Custom scheduler tied to Bitcoin block height, monitoring Esplora API for more accurate production operations.

**Esplora API** - HTTP REST API for blockchain queries, fee estimation, and transaction broadcasting.

## Development Tools

**Nigiri** - Docker-based Bitcoin regtest network with pre-configured Esplora and Electrs for quick development setup.

**Docker & Docker Compose** - Containerization with isolated testing environments and service orchestration.

**Make** - Build automation with commands for compilation, testing, code generation, and running services.

## Testing Libraries

**testify** - Assertion and mocking library with fluent APIs (`assert`, `require`, `mock`).

**Test Containers** - Docker-based integration testing with isolated test databases and automatic cleanup.

## Configuration & Observability

**Viper** - Configuration management with environment variable binding (ARKD_ prefix), default values, and type-safe access.

**Logrus** - Structured logging with JSON/text formatters, multiple log levels, and contextual fields.

**OpenTelemetry (Optional)** - Distributed tracing, metrics collection, and log aggregation.

## Security

**Macaroons** - Capability-based bearer token authentication system compatible with gRPC metadata.

**TLS** - Transport Layer Security with auto-generated certificates and custom certificate support.

## Event Streaming

**Watermill** - Event-driven architecture library with pub/sub abstraction, PostgreSQL-backed event store, and exactly-once delivery semantics.

## Infrastructure Components

**NBXplorer** - Bitcoin blockchain indexer with transaction indexing, WebSocket notifications, and REST API. Used by arkd-wallet for blockchain scanning.

**Bitcoin Core (Optional)** - Full Bitcoin node required by NBXplorer for blockchain data.

## Cross-References

- [Configuration Guide](./configuration.md) - Environment variables and settings
- [Integration Points](./integration_points.md) - Component communication patterns
- [Database Overview](../technical/database.md) - Database implementation details
