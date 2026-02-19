# Fulmine Architecture

Fulmine follows **hexagonal architecture** (also known as ports and adapters pattern) to maintain clean separation between business logic and infrastructure concerns. This architectural approach ensures that the core domain remains independent of external services and frameworks.

## Architectural Layers

### Core Domain (`internal/core/domain/`)

The innermost layer contains pure business entities and domain logic with no external dependencies:

- **Wallet**: Bitcoin wallet with seed management and encryption
- **VTXO**: Virtual Transaction Outputs representing off-chain funds in Ark
- **Transaction**: On-chain and off-chain transaction records
- **Swap**: Submarine and reverse submarine swap state and metadata
- **ChainSwap**: Chain swap entity for Ark ↔ BTC swaps with full status lifecycle
- **VHTLC**: Virtual HTLC entities for Ark-Lightning atomic swaps
- **DelegateTask**: Delegation task entity with intent, forfeit txs, scheduling, and status tracking
- **Settings**: User configuration and preferences

Domain entities contain validation rules and business invariants but no infrastructure concerns like database access or network calls.

### Application Layer (`internal/core/application/`)

The application layer orchestrates use cases by coordinating domain entities and calling port interfaces:

- **Service**: Main application service implementing business workflows
- **DelegatorService**: Separate service for VTXO delegation operations (accepts and schedules refresh tasks)
- **DelegatorBatchHandler**: Handles batch processing of delegated transactions
- **Use cases**: Wallet creation/unlock, sending/receiving funds, swap coordination, VHTLC management, chain swaps, delegation
- **Subscription management**: Monitors blockchain and Ark server for events

This layer depends on domain entities and port interfaces but never imports infrastructure implementations directly.

### Ports (`internal/core/ports/`)

Ports define interface contracts that infrastructure adapters must implement:

- **RepoManager**: Database repository interfaces for persistence
- **ArkClient**: Interface for Ark protocol operations
- **BoltzClient**: Interface for Boltz swap coordination
- **LnClient**: Interface for Lightning Network operations
- **Unlocker**: Interface for auto-unlock implementations
- **Scheduler**: Interface for background job scheduling

Ports enable dependency inversion - the core defines what it needs, and infrastructure provides implementations.

## Infrastructure Adapters (`internal/infrastructure/`)

Infrastructure adapters implement the port interfaces, connecting the core to external systems:

### Ark Client Adapter
- **Implementation**: Uses `go-sdk` from arkade-os
- **Responsibilities**: VTXO management, off-chain transactions, round participation
- **Key operations**: Send off-chain, receive VTXOs, settle transactions

### Boltz Client Adapter
- **Implementation**: HTTP client + WebSocket for Boltz API
- **Location**: `pkg/boltz/`
- **Responsibilities**: Create swaps, monitor swap status, reveal preimages
- **Features**: Automatic reconnection, status parsing, swap validation

### Lightning Client Adapters
- **LND adapter** (`internal/infrastructure/lnd/`): gRPC client for Lightning Network Daemon
- **CLN adapter** (`internal/infrastructure/cln/`): REST/Unix socket client for Core Lightning
- **Common interface**: Abstract Lightning operations (invoices, payments, channel info)

### Database Adapters
- **SQLite** (`internal/infrastructure/db/sqlite/`): Default lightweight database
- **Badger** (`internal/infrastructure/db/badger/`): Alternative embedded key-value store
- **Repositories**: Implement RepoManager ports for wallet, transaction, VTXO, swap, and settings storage

### Unlocker Adapters
- **File unlocker** (`internal/infrastructure/unlocker/file/`): Reads password from file
- **Env unlocker** (`internal/infrastructure/unlocker/env/`): Reads password from environment variable
- **Use case**: Auto-unlock wallet on startup for unattended operation

### Telemetry Adapters
- **OpenTelemetry** (`internal/infrastructure/telemetry/otel.go`): Full OTEL SDK with traces, metrics, and logs export
- **Pyroscope** (`internal/infrastructure/telemetry/pyroscope.go`): Continuous profiling (CPU, memory, goroutines, mutex)
- **Logrus OTel Hook** (`internal/infrastructure/telemetry/logrus_hook.go`): Bridges application logs to OTEL collector
- **Runtime metrics**: Go runtime metrics collection (GC, CPU, goroutines, heap, mutex)

### Esplora Adapter
- **Implementation**: HTTP client for Esplora blockchain indexer
- **Responsibilities**: Monitor on-chain transactions, broadcast transactions, query UTXOs

## Interface Layer (`internal/interface/`)

The interface layer exposes the application to external consumers through various protocols:

### gRPC Service (`internal/interface/grpc/`)
- **Port**: 7000 (configurable via `FULMINE_GRPC_PORT`)
- **Protocol Buffers**: Defined in `api-spec/protobuf/fulmine/v1/`
- **Handlers**: Wallet, service, and notification handlers
- **Interceptors**: Logging, error handling, authentication (macaroons)

Key gRPC services:
- `WalletService`: Wallet creation, unlock, status
- `ServiceRPC`: Send/receive funds, balance, transaction history, chain swaps, VTXOs, settlement
- `DelegatorService`: Separate gRPC service for delegation (runs on port 7002 by default)
- `NotificationService`: Stream updates for transactions and swaps

### REST API (`internal/interface/web/`)
- **Port**: 7001 (configurable via `FULMINE_HTTP_PORT`)
- **Base path**: `/api/v1/`
- **Format**: JSON request/response
- **Operations**: Wallet management, payments, swaps, VHTLC operations

REST endpoints mirror gRPC functionality for easier integration with web applications and scripts.

### Web UI (`internal/interface/web/`)
- **Technology**: Templ templates (type-safe Go templating)
- **Port**: 7001 (same as REST API)
- **Features**: Dashboard, send/receive, transaction history, settings, swap management
- **Real-time updates**: Uses HTMX for dynamic content

Web templates are located in `internal/interface/web/templates/` with components, pages, and modals.

## Package Structure (`pkg/`)

Reusable packages that can be imported by external projects:

### Boltz Package (`pkg/boltz/`)
Complete Boltz API client implementation:
- HTTP client for REST API
- WebSocket client for real-time swap events
- Type definitions for requests/responses
- Status parsing and validation

### Swap Package (`pkg/swap/`)
High-level swap coordination logic:
- Submarine swap flow (on-chain/Ark → Lightning)
- Reverse submarine swap flow (Lightning → on-chain/Ark)
- Chain swap flow (Ark → BTC and BTC → Ark)
- Chain swap monitoring, resume, and validation
- VHTLC creation and verification
- MuSig2 signing support
- Preimage management
- Swap restoration on restart

### VHTLC Package (`pkg/vhtlc/`)
Virtual HTLC implementation for Ark:
- VHTLC script generation
- Claim and refund tapscripts
- Multiple refund paths (with/without receiver)
- Locktime validation

### Macaroon Package (`pkg/macaroon/`)
Authentication service using macaroons:
- Token-based authentication
- Permission management
- Expiration handling
- Storage and verification

## Data Flow

### Sending Off-Chain Payment
1. User calls REST API or gRPC `SendOffChain`
2. Interface layer validates input and calls application service
3. Application service retrieves wallet from repository
4. Application uses Ark client adapter to submit off-chain transaction
5. Ark client interacts with arkd server via go-sdk
6. Transaction is stored via repository
7. Response flows back through layers

### Submarine Swap (Ark → Lightning)
1. User provides Lightning invoice via API
2. Application layer calls swap handler with invoice
3. Swap handler creates VHTLC and submits to Boltz
4. Funds are sent to VHTLC address on Ark
5. WebSocket monitors Boltz for payment success
6. On success, VHTLC is claimed automatically
7. On failure, funds are refunded via VHTLC refund path

### Reverse Submarine Swap (Lightning → Ark)
1. User requests invoice for amount via API
2. Application generates preimage and creates reverse swap with Boltz
3. Boltz returns Lightning invoice
4. User returns invoice to their application to pay
5. When payment detected, application claims VHTLC with preimage
6. Funds arrive in user's Ark wallet as VTXOs

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Interface Layer                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │ Web UI   │    │ REST API │    │   gRPC Handlers      │  │
│  └────┬─────┘    └────┬─────┘    └──────────┬───────────┘  │
└───────┼───────────────┼────────────────────┼─────────────────┘
        │               │                    │
        └───────────────┴────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────┐
│              Application Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Application Service (Use Cases)              │   │
│  │  • Wallet Management    • VHTLC Operations           │   │
│  │  • Send/Receive         • Subscription Management    │   │
│  │  • Swap Coordination                                 │   │
│  └─────────────┬────────────────────────────────────────┘   │
└────────────────┼──────────────────────────────────────────────┘
                 │
┌────────────────┼──────────────────────────────────────────────┐
│         Core Domain (Entities & Validation)                   │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐  ┌──────┐    │
│  │ Wallet │  │  VTXO  │  │  Swap  │  │ VHTLC│  │  Tx  │    │
│  └────────┘  └────────┘  └────────┘  └──────┘  └──────┘    │
└───────────────────────────────────────────────────────────────┘
                 │
┌────────────────┼──────────────────────────────────────────────┐
│                Ports (Interfaces)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Repo   │  │   Ark    │  │  Boltz   │  │Lightning │    │
│  │ Manager  │  │  Client  │  │  Client  │  │  Client  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼──────────────┼──────────────┼───────────┘
        │             │              │              │
┌───────┼─────────────┼──────────────┼──────────────┼───────────┐
│  Infrastructure Adapters (Implementations)                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐    │
│  │  SQLite  │  │ go-sdk   │  │  Boltz   │  │   LND    │    │
│  │  Badger  │  │ (Ark)    │  │   HTTP   │  │   CLN    │    │
│  └──────────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└─────────────────────┼──────────────┼──────────────┼───────────┘
                      │              │              │
                ┌─────┴──────┬───────┴──────┬───────┴──────┐
                │            │              │              │
          ┌─────▼─────┐ ┌───▼────┐  ┌──────▼──────┐ ┌────▼──────┐
          │   arkd    │ │ Boltz  │  │  Esplora    │ │    LN     │
          │  Server   │ │Backend │  │   Server    │ │   Nodes   │
          └───────────┘ └────────┘  └─────────────┘ └───────────┘
```

## Design Principles

1. **Dependency Inversion**: Core depends on abstractions (ports), not concrete implementations
2. **Single Responsibility**: Each layer has a clear, focused purpose
3. **Testability**: Core logic can be tested without external dependencies using mocks
4. **Flexibility**: Infrastructure can be swapped without changing core logic
5. **Separation of Concerns**: Business logic isolated from transport, storage, and external APIs

This architecture enables Fulmine to adapt to changing requirements and integrate with different Bitcoin infrastructure components while maintaining a stable core.
