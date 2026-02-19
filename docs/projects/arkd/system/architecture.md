# arkd Architecture

arkd follows **Hexagonal Architecture** (Ports and Adapters pattern), ensuring clean separation of concerns and strict dependency management.

## Hexagonal Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Interface Layer                     │
│         (gRPC, REST adapters)                    │
│           internal/interface/                    │
└──────────────────┬──────────────────────────────┘
                   │ depends on ↓
┌─────────────────────────────────────────────────┐
│             Application Layer                    │
│        (Use case orchestration)                  │
│         internal/core/application/               │
└──────────────────┬──────────────────────────────┘
                   │ depends on ↓
┌─────────────────────────────────────────────────┐
│              Domain Layer                        │
│      (Business logic, entities)                  │
│          internal/core/domain/                   │
│                                                   │
│      ┌─────────────────────────┐                │
│      │      Ports Layer         │                │
│      │  (Port interfaces)       │                │
│      │  internal/core/ports/    │                │
│      └─────────────────────────┘                │
└──────────────────┬──────────────────────────────┘
                   ↑ implements
┌─────────────────────────────────────────────────┐
│           Infrastructure Layer                   │
│    (DB, Wallet, Cache, External APIs)            │
│        internal/infrastructure/                  │
└─────────────────────────────────────────────────┘
```

**Golden Rule:** Dependencies point **inward only**. Core never depends on infrastructure.

## Layer Responsibilities

### Domain Layer (`internal/core/domain/`)
Pure business logic with zero external dependencies.

**Contains:**
- Entities: `Round`, `Vtxo`, `Intent`, `OffchainTx`, `Asset`, `Fee`
- Business rules: round state machine, VTXO lifecycle, asset validation
- Domain events: `RoundFinalizationStarted`, `VtxoCreated`
- Asset domain: `asset.go`, `asset_repo.go` - asset entities and repository contracts

**Rules:**
- ✅ Pure Go (no frameworks, no external dependencies)
- ❌ No I/O, database queries, or HTTP/gRPC

### Ports Layer (`internal/core/ports/`)
Defines contracts for external services.

**Contains:**
- Repository interfaces: `RepoManager`
- External service interfaces: `WalletService`, `SignerService`, `Scanner`
- Infrastructure interfaces: `TxBuilder`, `LiveStore`, `Scheduler`, `FeeManager`

**Rules:**
- ✅ Only interfaces (no implementations)
- ✅ Return domain types
- ❌ No concrete implementations

### Application Layer (`internal/core/application/`)
Orchestrates business use cases.

**Contains:**
- Main service: `service.go`
- Background services: `sweeper.go`, `fraud.go`, `indexer.go`
- Asset validation: `asset_validation.go`
- Use cases: register payment, finalize round, redeem VTXO, estimate fees

**Rules:**
- ✅ Depends on domain and ports only
- ✅ Coordinates repositories via ports
- ❌ No business logic (delegate to domain)
- ❌ No direct database/API access

### Infrastructure Layer (`internal/infrastructure/`)
Implements port interfaces with real services.

**Contains:**
- Databases: PostgreSQL, SQLite, Badger, MongoDB
- External services: wallet, signer, scanner
- Internal infrastructure: tx-builder, live-store, scheduler

**Rules:**
- ✅ Implements port interfaces
- ✅ Converts infrastructure types → domain types
- ❌ Never expose infrastructure types to core
- ❌ Never import application or interface layers

### Interface Layer (`internal/interface/`)
Exposes application services via external protocols.

**Contains:**
- gRPC handlers: `arkservice.go`, `adminservice.go`, `indexer.go`
- Event broker: `broker.go` (stream events with topic management)
- Interceptors: authentication, logging
- Type conversions: proto ↔ domain

**Rules:**
- ✅ Validates requests
- ✅ Converts external types (proto) ↔ domain types
- ❌ No business logic
- ❌ No direct database access

## Dependency Rule Visualization

```
Interface Layer
    ↓ depends on
Application Layer
    ↓ depends on
Domain Layer
    ↓ defines interfaces for
Ports Layer
    ↑ implemented by
Infrastructure Layer
```

**What this means:**
- ✅ Interface can import Application
- ✅ Application can import Domain and Ports
- ✅ Infrastructure implements Ports
- ❌ Domain NEVER imports Infrastructure
- ❌ Application NEVER imports Infrastructure
- ❌ Domain NEVER imports Application

## Request Flow Example

**Use Case:** Register payment intent

```
1. gRPC Request arrives at Interface Layer
   ↓
2. Handler validates and converts proto → domain
   ↓
3. Application Service orchestrates:
   - Load round via repository (port)
   - Validate with domain logic
   - Persist via repository (port)
   - Publish domain event
   ↓
4. Repository (Infrastructure) persists:
   - Convert domain → DB types
   - Execute SQL query
   - Return domain entity
```

## Benefits

**Testability:** Mock ports for unit tests; no external dependencies in core.

**Flexibility:** Swap database (Postgres → MongoDB) or add new interface (CLI, WebSocket) without changing core.

**Maintainability:** Clear boundaries make changes isolated to specific layers.

**Domain Focus:** Business logic is first-class citizen, not obscured by infrastructure concerns.

## Anti-Patterns to Avoid

❌ **Domain depending on Infrastructure**
```go
package domain
import "github.com/lib/pq"  // ❌ NO!
```

❌ **Returning Infrastructure Types**
```go
func (s *service) GetRound(ctx, id) (*queries.Round, error)  // ❌
```

❌ **Business Logic in Handlers**
```go
func (h *handler) RegisterIntent(ctx, req) {
    if time.Now().Unix() > round.EndingTimestamp { ... }  // ❌
}
```

❌ **Application Importing Infrastructure**
```go
package application
import "arkd/infrastructure/db/postgres"  // ❌
```

## Testing Strategy

**Domain:** Pure unit tests with no dependencies.
**Application:** Mock ports for use case testing.
**Infrastructure:** Integration tests with real services.
**Interface:** Mock application service for handler testing.

## Related Documentation

- **system/folder_structure.md** — Where to find each layer
- **system/integration_points.md** — How layers communicate
- **system/application_core.md** — Application service details
- **system/repo_manager.md** — Repository patterns
