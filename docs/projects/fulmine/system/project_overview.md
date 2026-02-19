# Fulmine Project Overview

## What is Fulmine?

Fulmine is a Bitcoin wallet daemon designed for swap providers and payment hubs to optimize Lightning Network channel liquidity while minimizing on-chain transaction fees. It serves as a bridge between Bitcoin's on-chain layer, the Ark protocol's off-chain layer, and the Lightning Network.

The name "fulmine" means "lightning" in Italian, reflecting its focus on Lightning Network operations and fast payments.

## Purpose

Fulmine addresses the challenge of efficiently managing liquidity across multiple Bitcoin layers:

- **Minimize on-chain fees**: Use Ark's VTXO (Virtual Transaction Output) system to keep transactions off-chain when possible
- **Optimize Lightning liquidity**: Seamlessly move funds between on-chain, off-chain (Ark), and Lightning channels
- **Enable swap operations**: Provide atomic swaps between different Bitcoin layers using Boltz protocol
- **Support payment hubs**: Give payment hub operators tools to manage their liquidity efficiently

## Key Features

### Ark Protocol Integration
- Manage off-chain VTXOs (Virtual Transaction Outputs)
- Board funds into Ark for low-cost off-chain transactions
- Settle and renew VTXOs in batched rounds
- Exit to on-chain when needed

### Boltz Submarine Swaps
- **Submarine swaps**: Move funds from Ark/on-chain to Lightning Network
- **Reverse submarine swaps**: Move funds from Lightning Network to Ark/on-chain
- **Chain swaps**: Move funds between Ark and Bitcoin on-chain (Ark → BTC and BTC → Ark)
- Atomic swap guarantees using HTLCs (Hash Time-Locked Contracts)
- Swap restoration on restart for interrupted swaps

### Virtual HTLCs (VHTLC)
- Enable Lightning-style HTLCs within the Ark protocol
- Atomic swaps between Ark VTXOs and Lightning channels
- Multiple refund paths for security and flexibility
- VHTLC renewal (extend expiring VHTLCs)
- SettleVHTLC API for claim/refund with delegate refund support
- Recoverable VHTLC handling in claim and refund APIs

### Multi-Interface Access
- **Web UI**: Browser-based dashboard at http://localhost:7001
- **REST API**: JSON endpoints for programmatic access
- **gRPC**: High-performance service interface on port 7000

### Delegator Service
- Separate gRPC/REST service for VTXO refresh delegation (port 7002)
- Clients can delegate VTXO renewal to Fulmine by submitting partially-signed intents
- Automatic scheduling and execution of delegated tasks near VTXO expiration
- Fee support for delegation service
- Batch handling for delegated transactions

### OpenTelemetry Observability
- Full OpenTelemetry SDK integration (traces, metrics, logs)
- Go runtime metrics collection (CPU, GC, goroutines, memory, mutex)
- Pyroscope continuous profiling (CPU, memory, goroutines, mutex)
- Logrus hook for structured log export to OTEL collector

### Auto-Unlock for Unattended Operation
- File-based password unlocking
- Environment variable password unlocking
- Useful for running as a service or in production environments

## Use Cases

### Swap Providers
Swap providers using Boltz can use Fulmine to:
- Manage their liquidity pool efficiently
- Perform submarine and reverse submarine swaps
- Handle both on-chain and Lightning operations
- Minimize transaction fees using Ark

### Payment Hubs
Payment hubs can leverage Fulmine to:
- Optimize channel liquidity management
- Rebalance channels using submarine swaps
- Reduce on-chain footprint with Ark VTXOs
- Provide efficient payment routing

### Lightning Liquidity Management
Node operators can use Fulmine to:
- Add inbound Lightning capacity via submarine swaps
- Drain channels efficiently via reverse submarine swaps
- Keep operational costs low with off-chain Ark transactions

## Architecture

Fulmine follows **hexagonal architecture** (ports and adapters pattern) for clean separation of concerns:

- **Core domain**: Business entities and logic (Wallet, VTXO, Transaction, Swap)
- **Application layer**: Use case orchestration
- **Infrastructure adapters**: Implementations for Ark, Boltz, Lightning, database, etc.
- **Interface layer**: gRPC, REST API, and Web UI

See [architecture.md](./architecture.md) for detailed architecture documentation.

## Integration Points

### Ark Server (arkd)
- Required for all Ark protocol operations
- Manages VTXO lifecycle and rounds
- Provides off-chain transaction capabilities
- Configuration: `FULMINE_ARK_SERVER` environment variable

### Boltz Backend
- Coordinates submarine and reverse submarine swaps
- Manages HTLC lifecycle
- Optional component (only needed for swap operations)
- Configuration: `FULMINE_BOLTZ_URL` and `FULMINE_BOLTZ_WS_URL`

### Esplora
- Bitcoin blockchain indexer
- Monitors on-chain transactions
- Required for boarding and on-chain operations
- Configuration: `FULMINE_ESPLORA_URL` environment variable

### Lightning Nodes
- Optional LND or CLN integration
- Required for Lightning payments and swaps
- See [lightning-integration.md](./lightning-integration.md) for details

## Technology Stack

- **Language**: Go 1.25.7+
- **Web Templates**: Templ (type-safe Go templating)
- **Database**: SQLite (default) or Badger
- **Protocols**: Bitcoin, Ark, Lightning Network, Boltz
- **APIs**: gRPC, REST, WebSocket
- **Observability**: OpenTelemetry (traces, metrics, logs), Pyroscope (profiling)

## Security Considerations

- Wallet seeds are encrypted using AES-256 with user-provided password
- REST API and gRPC currently lack authentication (tracked in issue #98)
- **Do not expose interfaces over public internet** until authentication is implemented
- Use auto-unlock feature carefully - store passwords securely

## Project Status

Fulmine is actively developed by ArkLabs. It is experimental software and should be used with caution. The project is open source under the MIT license.

For production use, ensure proper security measures are in place, especially around API access and password management.
