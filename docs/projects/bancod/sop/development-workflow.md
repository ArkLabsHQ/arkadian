# Bancod — Development Workflow

## Setup

1. Clone the repository
2. Ensure Go 1.26+ is installed
3. Install development tools:
   - `buf` for protobuf generation
   - `sqlc` for SQL code generation
   - `golangci-lint` (or use Docker-based lint via Makefile)

## Development Cycle

```bash
# Build
make build

# Build and run bancod locally against the fulmine test stack
# (arkd@7070, introspector@7273; preimage plugin enabled, banco disabled).
# Uses a temp BANCOD_DATADIR unless one is exported.
make run

# Run unit tests
make test

# Lint
make lint

# Code analysis
make vet

# Format
make format
```

## Code Generation

When modifying protobuf definitions or SQL queries:

```bash
# After editing api-spec/protobuf/bancod/v1/*.proto
make proto

# After editing internal/infrastructure/db/sqlite/sqlc/query.sql
make sqlc
```

## Integration Testing

```bash
# Full stack setup
make setup-test-env

# Run e2e tests
make integrationtest

# Cleanup
make teardown-test-env
```

## CI Pipeline

GitHub Actions workflows:
- `unit.yaml` — Unit tests on every push
- `integration.yaml` — E2E tests with nigiri + arkd stack
- `release.yaml` — Cross-compile release binaries

## PR Workflow

1. Create feature branch
2. Make changes
3. Run `make lint && make test`
4. Run `make integrationtest` if touching core logic
5. Push and create PR
