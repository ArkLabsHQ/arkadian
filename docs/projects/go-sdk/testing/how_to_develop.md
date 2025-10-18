# Go SDK Development Guide

Guide for developing and contributing to the Arkade Go SDK.

## Prerequisites

- Go 1.21 or higher
- Docker (for code generation tools)
- Running arkd server (for testing)
- Git

## Setup

### Clone and Install Dependencies

```bash
# Get the SDK
go get github.com/arkade-os/go-sdk

# Or clone the repository
git clone https://github.com/arkade-os/go-sdk.git
cd go-sdk

# Download dependencies
go mod download
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
make test

# Run specific package tests
go test -v -count=1 ./store/...
go test -v -count=1 ./client/...

# Run with race detection
go test -v -count=1 -race ./...

# Run with coverage
go test -v -count=1 -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Integration Tests

Requires a running arkd server:

```bash
# Start arkd (see arkd documentation)
# Then run tests that connect to the server
go test -v -count=1 ./test/...
```

## Code Generation

### Protocol Buffers

```bash
# Generate gRPC stubs from proto files
make proto
```

This compiles `.proto` files using Docker-based buf toolchain.

### REST Client

```bash
# Generate REST client from OpenAPI spec
make genrest

# Skip proto generation in CI
CI=true make genrest
```

Generated files:
- `client/rest/service/` - Ark client
- `indexer/rest/service/` - Indexer client

### SQL Code

```bash
# Generate type-safe SQL code with sqlc
make sqlc
```

This generates Go code from SQL queries in `store/sql/`.

## Linting

```bash
# Run golangci-lint (via Docker)
make lint

# Run code analysis
make vet
```

The linter runs in a Docker container to ensure consistent results across environments.

## Database Migrations

### Create New Migration

```bash
# Create migration files
make migrate FILE=add_new_field

# This creates:
# store/sql/migration/<timestamp>_add_new_field.up.sql
# store/sql/migration/<timestamp>_add_new_field.down.sql
```

### Edit Migration Files

```sql
-- up.sql
ALTER TABLE vtxos ADD COLUMN new_field TEXT;

-- down.sql
ALTER TABLE vtxos DROP COLUMN new_field;
```

After creating migrations, regenerate SQL code:

```bash
make sqlc
```

## Running Examples

### Alice to Bob Example

```bash
cd example/alice_to_bob
go run alice_to_bob.go
```

This demonstrates:
- Setting up two clients
- Onboarding funds
- Sending offchain payment
- Collaborative exit

### Multi-Connection Demo

```bash
cd example/multi_connection_demo
go run multi_connection_demo.go
```

## Local arkd Setup for Testing

### Using Docker

```bash
# Start arkd with dependencies
docker-compose up -d

# Check logs
docker-compose logs -f arkd
```

### Manual Setup

```bash
# Start Bitcoin regtest (requires Nigiri)
nigiri start

# Start arkd
cd /path/to/arkd
make run-light
```

Default arkd configuration:
- gRPC: `localhost:7070`
- Network: regtest
- Round interval: 30 seconds

## Debugging Tips

### Enable Debug Logging

```go
import log "github.com/sirupsen/logrus"

log.SetLevel(log.DebugLevel)
```

### Inspect Storage State

```go
// For file storage, check the directory
ls -la /path/to/storage/directory

// For in-memory, use debugger breakpoints
```

### Check Server Connection

```bash
# Test gRPC connection
grpcurl -plaintext localhost:7070 list

# Check arkd health
curl http://localhost:7070/health
```

### Common Debug Scenarios

**Transaction not completing:**
- Check arkd round timing
- Verify sufficient balance
- Check arkd logs for errors

**Storage errors:**
- Verify directory permissions
- Check disk space
- Ensure no concurrent access conflicts

## Contributing Guidelines

### Before Submitting PR

1. Run tests: `make test`
2. Run linter: `make lint`
3. Update documentation if adding features
4. Add tests for new functionality

### Code Style

- Follow standard Go conventions
- Use meaningful variable names
- Add comments for exported functions
- Keep functions focused and small

### Commit Messages

```
feat: add support for multiple recipients
fix: resolve balance calculation issue
docs: update installation instructions
test: add integration test for SendOffChain
```

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG updated (if applicable)
- [ ] Examples work
- [ ] No breaking changes (or clearly documented)

## Useful Commands Summary

```bash
make proto        # Generate protobuf stubs
make genrest      # Generate REST client
make sqlc         # Generate SQL code
make test         # Run unit tests
make lint         # Lint code
make vet          # Code analysis
make migrate FILE=name  # Create migration
```

## Resources

- API Documentation: https://pkg.go.dev/github.com/arkade-os/go-sdk
- GitHub Issues: https://github.com/arkade-os/go-sdk/issues
- arkd Documentation: ${ARKADIAN_DIR}/docs/projects/arkd/
