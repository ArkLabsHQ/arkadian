# Fulmine Simulator - Testing Guide

## Test Categories

| Type | Command | Description |
|------|---------|-------------|
| Unit | `make test` | Fast, isolated tests |
| Integration | `make integrationtest` | Requires Nigiri/Fulmine |
| Coverage | `make coverage` | Generate coverage report |

## Unit Tests

### Run All Unit Tests

```bash
make test
```

### Run Specific Package

```bash
go test -v ./orchestrator/...
go test -v ./internal/config/...
```

### Run Specific Test

```bash
go test -v -run TestConfigParser ./internal/config/...
```

### With Race Detection

```bash
go test -v -race ./...
```

## Integration Tests

### Prerequisites

Integration tests require a running stack:

1. Nigiri with Bitcoin + Lightning
2. Fulmine instance
3. Boltz backend

### Run Integration Tests

```bash
# Start required services first
nigiri start
# Start Fulmine in another terminal

# Run integration tests
make integrationtest
```

### Integration Test Tags

Integration tests use build tags:

```go
//go:build integration

package integration_test
```

Run only integration tests:

```bash
go test -v -tags=integration ./tests/integration/...
```

## Coverage

### Generate Coverage Report

```bash
make coverage
```

This generates:
- `coverage.out` - Raw coverage data
- `coverage.html` - HTML report

### View Coverage Report

```bash
# Open in browser
open coverage.html

# Or view in terminal
go tool cover -func=coverage.out
```

### Coverage by Package

```bash
go test -coverprofile=coverage.out -covermode=atomic ./...
go tool cover -func=coverage.out | grep -E "^(total|github.com)"
```

## Linting

### Run Linter

```bash
make lint
```

This runs:
- `gofmt -s -w .` - Format code
- `go vet ./...` - Static analysis

### Additional Linters (optional)

```bash
# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run comprehensive linting
golangci-lint run
```

## Test Configuration

### Test Fixtures

Test configurations are in `configs/`:

```bash
configs/
├── test.yaml              # Basic test config
├── regtest-5-clients.yaml # 5-client regtest
└── integration/           # Integration test configs
```

### Environment for Tests

```bash
# Set test environment
export FULMINE_URL=localhost:7001
export NIGIRI_FAUCET_URL=http://localhost:3000/faucet

# Run tests
make test
```

## Writing Tests

### Unit Test Example

```go
func TestConfigParser_ValidConfig(t *testing.T) {
    config, err := ParseConfig("testdata/valid.yaml")
    require.NoError(t, err)
    assert.Equal(t, "regtest", config.Network)
    assert.Len(t, config.Clients, 2)
}
```

### Table-Driven Tests

```go
func TestActionValidation(t *testing.T) {
    tests := []struct {
        name    string
        action  Action
        wantErr bool
    }{
        {"valid wait", Action{Type: "wait", Duration: 5}, false},
        {"invalid type", Action{Type: "unknown"}, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.action.Validate()
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## CI/CD Testing

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - run: make test
      - run: make lint
```

## Debugging Tests

### Verbose Output

```bash
go test -v -run TestName ./...
```

### With Delve

```bash
# Install delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug specific test
dlv test ./internal/config -- -test.run TestConfigParser
```
