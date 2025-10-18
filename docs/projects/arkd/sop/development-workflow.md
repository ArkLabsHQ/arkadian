# SOP: Development Workflow

General development best practices and common workflows for arkd development.

## Prerequisites

- Go 1.24.6 or later
- Docker (for integration tests)
- PostgreSQL (via `make pg` or Docker)
- Understanding of hexagonal architecture

## Environment Setup

### Initial Setup

```bash
# Clone repository
git clone https://github.com/ark-network/ark.git
cd ark

# Install dependencies
go mod download

# Start local Bitcoin regtest
nigiri start

# Start PostgreSQL
make pg

# Build arkd
make build
```

### Development Environment

```bash
# Full mode (PostgreSQL + Redis)
make run

# Light mode (SQLite + in-memory)
make run-light

# With wallet
make run-wallet
```

## Common Development Commands

### Building

```bash
make build              # Build arkd
make build-all          # Build for all platforms
make build-cli          # Build ark CLI
make build-wallet       # Build arkd-wallet
```

### Testing

```bash
make test               # Unit tests
make integrationtest    # E2E tests (requires docker-run first)
make lint               # Lint and format
make cov                # Coverage report

# Run specific test
go test -v -count=1 ./internal/core/application/...
```

### Database Operations

```bash
# PostgreSQL
make pg                 # Start container
make psql               # Connect to postgres
make pgmigrate FILE=x   # Create migration
make pgsqlc             # Generate from queries
make droppg             # Stop and remove

# SQLite
make migrate FILE=x     # Create migration
make sqlc               # Generate from queries
```

### Protocol Buffers

```bash
make proto              # Compile proto files
make proto-lint         # Lint proto files
```

### Docker Testing

```bash
make docker-run         # Start all services
make integrationtest    # Run E2E tests
make docker-stop        # Tear down
```

## Development Workflows

### Workflow 1: Feature Development

Complete cycle for adding a new feature.

#### 1. Plan Changes

Identify required changes:
- [ ] Proto definitions (new endpoints)
- [ ] Domain entities (business logic)
- [ ] Database schema (new tables/columns)
- [ ] Application service (use cases)
- [ ] Infrastructure (repositories)
- [ ] Interface (gRPC handlers)

#### 2. Create Feature Branch

```bash
git checkout -b feature/round-cancellation
```

#### 3. Implement Domain Layer

Start with domain (innermost layer):

```go
// internal/core/domain/round.go
type Round struct {
    // ... existing fields
    Cancelled          bool
    CancellationReason string
}

func (r *Round) CanBeCancelled() bool {
    return !r.Ended && !r.Failed
}

// internal/core/domain/errors.go
var ErrCannotCancelRound = errors.New("cannot cancel round")
```

#### 4. Add Database Support

```bash
# Create migration
make pgmigrate FILE=add_round_cancellation

# Write migration (see database-workflows.md)
# Generate queries (see database-workflows.md)
make pgsqlc
```

#### 5. Update Application Layer

```go
// internal/core/application/admin.go
func (a *adminService) CancelRound(ctx, roundID, reason string) error {
    // Implementation
}
```

#### 6. Add Interface Layer

```bash
# Update proto
vim api-spec/protobuf/ark/v1/admin.proto

# Generate
make proto

# Implement handler
vim internal/interface/grpc/handlers/adminservice.go
```

#### 7. Test

```bash
# Unit tests
make test

# Integration tests
make docker-run
make integrationtest
make docker-stop
```

#### 8. Commit and Push

```bash
git add .
git commit -m "Add round cancellation feature"
git push origin feature/round-cancellation
```

### Workflow 2: Bug Fix

#### 1. Reproduce Bug

```bash
# Write failing test first
vim internal/core/application/service_test.go

# Run test to confirm failure
go test -v ./internal/core/application/...
```

#### 2. Identify Root Cause

- Check logs
- Debug with delve
- Review related code

#### 3. Fix Issue

Make minimal changes to fix the bug:

```go
// Fix the issue
func (s *service) ProcessIntent(...) error {
    // Fixed logic
}
```

#### 4. Verify Fix

```bash
# Run test again
go test -v ./internal/core/application/...

# Run all tests
make test
```

#### 5. Commit

```bash
git add .
git commit -m "Fix: prevent panic when processing empty intent"
git push origin bugfix/empty-intent-panic
```

### Workflow 3: Refactoring

#### 1. Ensure Test Coverage

```bash
# Check current coverage
make cov

# Add tests if needed
vim internal/core/application/service_test.go
```

#### 2. Make Changes

Refactor while keeping tests green:

```bash
# Watch tests continuously
watch -n 1 "make test"
```

#### 3. Verify No Behavior Change

```bash
# All tests should still pass
make test

# Integration tests
make integrationtest
```

## Code Organization Principles

### Hexagonal Architecture

```
Internal dependencies flow inward:
Interface → Application → Domain
                ↑
         Infrastructure
```

**Rules:**
- Domain NEVER imports Application or Infrastructure
- Application NEVER imports Infrastructure directly
- Infrastructure implements Ports from Domain
- Interface depends on Application only

### Dependency Examples

✅ **Correct:**
```go
// Application depends on domain
import "github.com/arkade-os/arkd/internal/core/domain"

// Infrastructure depends on domain (ports)
import "github.com/arkade-os/arkd/internal/core/ports"

// Interface depends on application
import "github.com/arkade-os/arkd/internal/core/application"
```

❌ **Wrong:**
```go
// Domain importing infrastructure - NEVER!
import "github.com/arkade-os/arkd/internal/infrastructure/db/postgres"

// Application importing infrastructure - NO!
import "github.com/arkade-os/arkd/internal/infrastructure/cache"
```

## Testing Strategy

### Unit Tests

Test business logic in isolation:

```go
func TestAdminService_CancelRound(t *testing.T) {
    // Setup mocks
    mockRepo := &MockRoundRepository{}
    svc := NewAdminService(mockRepo)

    // Execute
    err := svc.CancelRound(context.Background(), "round-1", "test")

    // Assert
    assert.NoError(t, err)
}
```

### Integration Tests

Test with real infrastructure:

```bash
# Start services
make docker-run

# Run tests
make integrationtest

# Cleanup
make docker-stop
```

## Code Quality

### Pre-commit Checks

```bash
# Format code
make lint

# Run tests
make test

# Build
make build
```

### Code Review Checklist

- [ ] Follows hexagonal architecture
- [ ] Unit tests added
- [ ] Integration tests (if needed)
- [ ] No infrastructure in domain
- [ ] Error handling proper
- [ ] Type conversions at boundaries
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Configuration Management

### Environment Variables

```bash
# Network
ARKD_PORT=7070
ARKD_ADMIN_PORT=7070

# Database
ARKD_DB_TYPE=postgres
ARKD_PG_DB_URL=postgresql://...

# Cache
ARKD_LIVE_STORE_TYPE=redis
ARKD_REDIS_URL=redis://localhost:6379/0
```

### Configuration Files

Located in `envs/`:
- `arkd.dev.env` - Development (full)
- `arkd.light.env` - Development (light)
- `arkd-wallet.regtest.env` - Wallet config

## Debugging

### Local Debugging

```bash
# Run with debug logging
ARKD_LOG_LEVEL=debug make run

# Use delve
dlv debug cmd/arkd/main.go
```

### Database Inspection

```bash
# Connect to postgres
make psql

# View tables
\dt

# Query data
SELECT * FROM round WHERE ended = false;
```

### gRPC Testing

```bash
# List services
grpcurl -plaintext localhost:7070 list

# Describe service
grpcurl -plaintext localhost:7070 describe ark.v1.ArkService

# Call method
grpcurl -d '{"round_id": "123"}' \
  -plaintext localhost:7070 \
  ark.v1.ArkService/GetRound
```

## Performance Monitoring

### Profiling

```go
import _ "net/http/pprof"

// Enable pprof endpoint
go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()
```

Access profiles:
- CPU: `http://localhost:6060/debug/pprof/profile`
- Memory: `http://localhost:6060/debug/pprof/heap`
- Goroutines: `http://localhost:6060/debug/pprof/goroutine`

## Common Pitfalls

### ❌ Breaking Hexagonal Architecture
```go
// Domain importing infrastructure
import "github.com/.../postgres"  // NEVER!
```

### ❌ Not Converting Types
```go
// Returning infrastructure type
func GetRound() (*queries.Round, error)  // BAD

// Should return domain type
func GetRound() (*domain.Round, error)   // GOOD
```

### ❌ Forgetting to Regenerate
```bash
# After proto changes
make proto  # REQUIRED

# After query changes
make pgsqlc  # REQUIRED
```

## See Also

- `adding-grpc-endpoint.md` - Adding endpoints
- `database-workflows.md` - Database operations
- `making-changes.md` - Change checklists
- `system/architecture/hexagonal-architecture.md` - Architecture details
