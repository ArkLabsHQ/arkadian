# arkd Development Reference

Complete reference for developers writing code for arkd. This guide covers architecture patterns, code generation tools, and development workflows but does NOT cover running services or testing (see [arkd Environment & Testing Guide](./arkd-environment-and-testing-guide.md) for that).

**Target Audience**: ark-developer agent, developers writing code
**For Running/Testing**: See [arkd Environment & Testing Guide](./arkd-environment-and-testing-guide.md)

---

## Table of Contents

1. [Architecture & Design Patterns](#architecture--design-patterns)
2. [Repository Structure](#repository-structure)
3. [Configuration Reference](#configuration-reference)
4. [Code Generation Tools](#code-generation-tools)
5. [Building](#building)
6. [Implementation Guidelines](#implementation-guidelines)
7. [Code Quality Tools](#code-quality-tools)

---

## Architecture & Design Patterns

### Hexagonal Architecture (Ports & Adapters)

arkd follows strict hexagonal architecture with three layers:

**1. Domain Layer** (`internal/core/domain/`)
- Pure business logic
- No external dependencies
- Domain entities and value objects
- MUST NOT import infrastructure or application layers

**2. Application Layer** (`internal/core/application/`)
- Use cases and service orchestration
- Coordinates domain operations
- MUST NOT import infrastructure layer
- MAY import domain layer

**3. Infrastructure Layer** (`internal/infrastructure/`)
- External dependencies (databases, APIs, gRPC handlers)
- Repository implementations
- HTTP/gRPC handlers
- MAY import domain and application layers

### Event Sourcing + CQRS

arkd uses event sourcing for the write model:
- All state changes are captured as immutable events
- Events stored in event store (Badger or PostgreSQL)
- Read models (projections) built from events
- Separate command and query paths

### Dependency Rules (CRITICAL)

```
Domain Layer
    ↑ (can import)
Application Layer
    ↑ (can import)
Infrastructure Layer
```

**Violations will break the build.** Never allow domain to import infrastructure.

---

## Repository Structure

```
ark/
├── cmd/
│   ├── arkd/           # Main server binary
│   └── arkd-wallet/    # Wallet service binary
├── pkg/
│   ├── ark-cli/        # CLI client for users
│   └── client-sdk/     # Client SDK
├── internal/
│   ├── core/
│   │   ├── domain/     # Business logic (NO external deps)
│   │   └── application/ # Use cases (NO infrastructure imports)
│   └── infrastructure/
│       ├── db/         # Database implementations
│       │   ├── postgres/
│       │   ├── sqlite/
│       │   └── badger/
│       ├── grpc-handler/ # gRPC service implementations
│       └── rest-handler/ # REST API handlers
├── api-spec/
│   └── protobuf/       # Protocol buffer definitions
│       └── ark/v1/
│           ├── service.proto
│           ├── admin.proto
│           ├── wallet.proto
│           └── types.proto
├── test/
│   └── e2e/            # Integration tests
├── envs/               # Configuration profiles
│   ├── arkd.dev.env
│   └── arkd.light.env
└── scripts/            # Build and utility scripts
```

### Where to Put New Code

- **New business logic**: `internal/core/domain/`
- **New use case**: `internal/core/application/`
- **New gRPC endpoint**: `api-spec/protobuf/` + `internal/infrastructure/grpc-handler/`
- **New database table**: `internal/infrastructure/db/<backend>/sqlc/queries/` + migration
- **New REST endpoint**: `internal/infrastructure/rest-handler/`
- **Unit tests**: Same package as code being tested
- **Integration tests**: `test/e2e/`

---

## Configuration Reference

### Environment Variables

**Network & Connectivity:**
```bash
ARKD_PORT=7070                      # Main gRPC/REST port
ARKD_ADMIN_PORT=7070                # Admin API port (same as main)
ARKD_ESPLORA_URL=http://localhost:3000   # Bitcoin explorer URL
ARKD_WALLET_ADDR=localhost:6060     # arkd-wallet address
```

**Database (Main Store):**
```bash
ARKD_DB_TYPE=sqlite                 # sqlite | postgres | badger
ARKD_DB_HOST=localhost              # For postgres
ARKD_DB_PORT=5432                   # For postgres
ARKD_DB_USER=postgres               # For postgres
ARKD_DB_PASSWORD=password           # For postgres
ARKD_DB_NAME=arkd                   # For postgres
```

**Event Store:**
```bash
ARKD_EVENT_DB_TYPE=badger           # badger | postgres
```

**Cache:**
```bash
ARKD_LIVE_STORE_TYPE=inmemory       # inmemory | redis
ARKD_REDIS_HOST=localhost           # For redis
ARKD_REDIS_PORT=6379                # For redis
```

**Round Configuration:**
```bash
ARKD_ROUND_INTERVAL=30                      # Seconds between rounds
ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1         # Min participants per round
ARKD_ROUND_MAX_PARTICIPANTS_COUNT=128       # Max participants per round
```

**Security & Timeouts:**
```bash
ARKD_VTXO_TREE_EXPIRY=604672          # 7 days in seconds
ARKD_UNILATERAL_EXIT_DELAY=86400      # 24 hours in seconds
ARKD_BOARDING_EXIT_DELAY=7776000      # 3 months in seconds
```

**Logging:**
```bash
ARKD_LOG_LEVEL=4                      # 0=panic, 6=trace
```

### Configuration Profiles

Pre-defined profiles in `envs/` directory:

| Profile | Database | Cache | Use Case |
|---------|----------|-------|----------|
| `arkd.light.env` | SQLite | In-memory | Local development |
| `arkd.dev.env` | PostgreSQL | Redis | Production-like |
| `arkd-wallet.regtest.env` | PostgreSQL (NBXplorer) | - | Wallet with signer |
| `signer.dev.env` | - | - | Standalone signer |

### Data Directories

**Default locations:**
- **Linux**: `~/.arkd/`
- **macOS**: `~/Library/Application Support/arkd/`
- **Windows**: `%APPDATA%\arkd\`

**Override:**
```bash
export ARKD_DATADIR=/custom/path
```

---

## Code Generation Tools

### Protocol Buffers

**Compile proto files:**
```bash
make proto
```

This generates:
- Go service definitions
- gRPC stubs
- REST gateway code (grpc-gateway)

**Lint protos only:**
```bash
make proto-lint
```

**Manual compilation:**
```bash
# arkd uses buf for proto compilation
docker run --rm -v $(pwd):/workspace bufbuild/buf generate
```

**Proto file locations:**
- Source: `api-spec/protobuf/ark/v1/*.proto`
- Generated: `pkg/client-sdk/` (Go client code)

### Database Code Generation (sqlc)

arkd uses sqlc to generate type-safe Go code from SQL queries.

**For PostgreSQL:**
```bash
make pgsqlc
```

**For SQLite:**
```bash
make sqlc
```

**What it does:**
- Reads `internal/infrastructure/db/<backend>/sqlc/queries/*.sql`
- Generates type-safe Go functions in `internal/infrastructure/db/<backend>/sqlc/`
- Creates models based on schema

**sqlc configuration:**
- PostgreSQL: `internal/infrastructure/db/postgres/sqlc/sqlc.yaml`
- SQLite: `internal/infrastructure/db/sqlite/sqlc/sqlc.yaml`

### Database Migrations

**Create new PostgreSQL migration:**
```bash
make pgmigrate FILE=add_rounds_table
```

Creates:
- `internal/infrastructure/db/postgres/sqlc/migrations/<timestamp>_add_rounds_table.up.sql`
- `internal/infrastructure/db/postgres/sqlc/migrations/<timestamp>_add_rounds_table.down.sql`

**Create new SQLite migration:**
```bash
make migrate FILE=add_rounds_table
```

**Migration naming convention:**
- Use snake_case
- Be descriptive: `add_user_table`, `alter_vtxo_add_index`
- Migrations auto-apply on arkd startup

**Migration best practices:**
- Always provide both `up` and `down` migrations
- Test migrations on empty database
- Test migrations on database with data
- Never edit existing migrations (create new ones)

---

## Building

### Build Binaries

**Build arkd server:**
```bash
make build
```
Output: `build/arkd`

**Build ark CLI client:**
```bash
make build-cli
```
Output: `pkg/ark-cli/build/ark`

**Build arkd-wallet:**
```bash
make build-wallet
```
Output: `build/arkd-wallet`

**Build for all platforms:**
```bash
make build-all
```
Outputs platform-specific binaries in `build/`

### Build Scripts

Build scripts are in `scripts/`:
- `scripts/build-arkd` - Main server build
- `scripts/build-arkd-wallet` - Wallet build
- `scripts/build-all` - Multi-platform build

---

## Implementation Guidelines

### Adding a gRPC Endpoint

**1. Define proto:**

Edit `api-spec/protobuf/ark/v1/service.proto`:
```protobuf
service ArkService {
  rpc GetRoundStatus(GetRoundStatusRequest) returns (GetRoundStatusResponse);
}

message GetRoundStatusRequest {}

message GetRoundStatusResponse {
  string round_id = 1;
  string state = 2;
}
```

**2. Generate code:**
```bash
make proto
```

**3. Implement handler:**

Create/edit `internal/infrastructure/grpc-handler/service.go`:
```go
func (s *service) GetRoundStatus(
    ctx context.Context,
    req *arkv1.GetRoundStatusRequest,
) (*arkv1.GetRoundStatusResponse, error) {
    // Call application service
    status, err := s.roundService.GetStatus(ctx)
    if err != nil {
        return nil, err
    }

    return &arkv1.GetRoundStatusResponse{
        RoundId: status.ID,
        State:   status.State.String(),
    }, nil
}
```

**4. Wire to application layer:**

Implement in `internal/core/application/round_service.go`:
```go
func (s *roundService) GetStatus(ctx context.Context) (*RoundStatus, error) {
    // Business logic here
}
```

**5. Write tests:**
- Unit test for application service
- Integration test in `test/e2e/`

### Adding a Database Table

**1. Create migration:**
```bash
make pgmigrate FILE=add_rounds_table
```

**2. Write migration SQL:**

`migrations/<timestamp>_add_rounds_table.up.sql`:
```sql
CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rounds_state ON rounds(state);
CREATE INDEX idx_rounds_created_at ON rounds(created_at);
```

**3. Add queries:**

`internal/infrastructure/db/postgres/sqlc/queries/rounds.sql`:
```sql
-- name: InsertRound :exec
INSERT INTO rounds (id, state, created_at)
VALUES ($1, $2, $3);

-- name: GetRound :one
SELECT * FROM rounds
WHERE id = $1;

-- name: ListActiveRounds :many
SELECT * FROM rounds
WHERE state = 'active'
ORDER BY created_at DESC;
```

**4. Generate code:**
```bash
make pgsqlc
```

**5. Implement repository:**

`internal/infrastructure/db/postgres/round_repository.go`:
```go
type roundRepository struct {
    db *sqlc.Queries
}

func (r *roundRepository) Save(ctx context.Context, round *domain.Round) error {
    return r.db.InsertRound(ctx, sqlc.InsertRoundParams{
        ID:        round.ID,
        State:     round.State.String(),
        CreatedAt: round.CreatedAt,
    })
}
```

**6. Write tests:**
- Unit test repository with test database
- Integration test with real postgres

### Writing Unit Tests

**Location:** Same package as code being tested

**Naming:** `<file>_test.go`

**Example:**

`internal/core/application/round_service_test.go`:
```go
package application_test

import (
    "context"
    "testing"

    "github.com/arkade-os/arkd/internal/core/application"
    "github.com/stretchr/testify/require"
)

func TestRoundService_GetStatus(t *testing.T) {
    // Arrange
    svc := application.NewRoundService(mockRepo)

    // Act
    status, err := svc.GetStatus(context.Background())

    // Assert
    require.NoError(t, err)
    require.NotNil(t, status)
    require.Equal(t, "active", status.State)
}
```

**Run tests:**
```bash
go test ./internal/core/application/...
```

---

## Code Quality Tools

### Linting

```bash
make lint
```

Uses `golangci-lint` with configuration in `.golangci.yml`

**Common checks:**
- gofmt, goimports
- govet
- staticcheck
- errcheck
- gosec (security)

### Static Analysis

```bash
make vet
```

Runs `go vet` across all packages.

### Code Coverage

```bash
make cov
```

Generates HTML coverage report in `coverage.html`

**View coverage:**
```bash
go tool cover -html=coverage.out
```

---

## Related Documentation

- **[arkd Environment & Testing Guide](./arkd-environment-and-testing-guide.md)** - Running services and testing
- **[Architecture](../system/architecture.md)** - Detailed architecture patterns
- **[Folder Structure](../system/folder_structure.md)** - Complete directory layout
- **[Configuration](../system/configuration.md)** - Complete configuration reference

---

**Last Updated**: 2026-02-19
**For**: ark-developer agent (code writing only, no service execution)
