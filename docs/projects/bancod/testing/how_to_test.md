# Bancod — How to Test

## Unit Tests

```bash
make test
# Runs: go test -v -race --count=1 (excludes test/e2e)
```

Unit tests cover:
- `pkg/banco/` — offer parsing, pair matching, price validation, plugin logic
- `pkg/banco/contract/` — maker/taker helpers, offer serialization
- `pkg/preimage/` — ECIES crypto, contract validation, maker helpers
- `pkg/banco/config_test.go` — configuration parsing

## Integration Tests (E2E)

Require a running nigiri + arkd + introspector stack.

```bash
# Setup (starts nigiri + arkd + introspector, funds wallet)
make setup-test-env

# Run e2e tests
make integrationtest
# Runs: go test -v -count=1 -timeout=10m -race -p=1 ./test/e2e/...

# Teardown
make teardown-test-env
```

Test files:
- `internal/interface/grpc/e2e_test.go` — gRPC handler tests
- `internal/interface/web/smoke_test.go` — Web UI smoke test
- `test/e2e/` — Full end-to-end tests

## Code Analysis

```bash
make vet     # go vet ./...
make lint    # golangci-lint (via Docker)
```

## Coverage

```bash
make cov     # go test -cover ./...
```

## Code Generation

```bash
make proto   # regenerate protobuf (buf)
make sqlc    # regenerate SQL queries
```
