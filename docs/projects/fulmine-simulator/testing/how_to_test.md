# Fulmine Simulator — Testing Guide

## Test Structure

The project includes multiple test layers:
- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Test interactions between components and external services
- **End-to-End Tests**: Full simulation scenarios

## Running Tests

### Unit Tests
```bash
# Run all unit tests
make test

# Run with verbose output
go test -v -race ./...

# Run tests for specific package
go test -v ./orchestrator/...

# Run specific test
go test -v -run TestConfigParser ./orchestrator/...
```

### Integration Tests
```bash
# Prerequisites: Docker, Nigiri, and Fulmine running
docker run -d --name nigiri -p 3000:3000 vulpemventures/nigiri
docker run -d --name fulmine -p 7000:7000 -p 7001:7001 ghcr.io/arklabshq/fulmine:latest

# Run integration tests
make integrationtest

# Or directly with go test
go test -v -race -timeout 5m -tags=integration ./tests/integration/...
```

### Coverage Report
```bash
# Generate coverage report
make coverage

# View coverage in browser
open coverage.html
```

## Test Categories

### 1. Configuration Tests
Test YAML parsing and validation:

```bash
# Run config tests
go test -v ./orchestrator/config/...
```

**Test Cases:**
- Valid configuration parsing
- Invalid YAML syntax detection
- Missing required fields
- Invalid network values
- Fund limit validation
- Client ID uniqueness

### 2. Fund Management Tests
Test fund distribution and collection:

```bash
# Run fund management tests
go test -v ./orchestrator/fund/...
```

**Test Cases:**
- Fund distribution to multiple clients
- Fund collection from clients
- Recovery percentage calculation
- Nigiri faucet integration (integration test)

### 3. Client Spawn Tests
Test process spawning and monitoring:

```bash
# Run process management tests
go test -v ./orchestrator/process/...
```

**Test Cases:**
- Client process spawning
- Process monitoring and health checks
- Graceful shutdown
- Error handling on process failure

### 4. Audit Logging Tests
Test JSON Lines logging:

```bash
# Run audit log tests
go test -v ./orchestrator/audit/...
```

**Test Cases:**
- Event logging (fund_distributed, client_started, etc.)
- Append-only behavior
- Crash recovery
- Log parsing and analysis

### 5. Network Configuration Tests
Test network-specific logic:

```bash
# Run network tests
go test -v ./orchestrator/network/...
```

**Test Cases:**
- Regtest configuration
- Mutinynet configuration
- Mainnet safety features
- Network validation

## Writing Tests

### Unit Test Example
```go
// orchestrator/config/config_test.go
package config

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestParseValidConfig(t *testing.T) {
    yamlContent := `
version: "1.0"
network: "regtest"
clients:
  - id: "client_0"
    initial_funding_sats: 100000
rounds:
  - number: 1
    description: "Test round"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 5
`
    config, err := ParseYAML([]byte(yamlContent))
    assert.NoError(t, err)
    assert.Equal(t, "regtest", config.Network)
    assert.Len(t, config.Clients, 1)
    assert.Equal(t, "client_0", config.Clients[0].ID)
}

func TestValidateInvalidNetwork(t *testing.T) {
    config := &Config{
        Version: "1.0",
        Network: "invalid_network",
        Clients: []Client{{ID: "client_0", InitialFundingSats: 100000}},
    }
    err := Validate(config)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "invalid network")
}
```

### Integration Test Example
```go
// tests/integration/orchestrator_test.go
//go:build integration
// +build integration

package integration

import (
    "testing"
    "time"
    "github.com/stretchr/testify/assert"
)

func TestFullSimulationRegtest(t *testing.T) {
    // Skip if Nigiri/Fulmine not available
    if !isNigiriAvailable() || !isFulmineAvailable() {
        t.Skip("Nigiri or Fulmine not available")
    }

    // Run simulation
    orchestrator := NewOrchestrator("../configs/regtest-2-clients.yaml")
    err := orchestrator.Run()

    assert.NoError(t, err)

    // Verify audit log created
    assert.FileExists(t, "audit_logs/simulation_regtest_*.jsonl")

    // Verify fund recovery
    recovery := orchestrator.GetRecoveryPercentage()
    assert.Equal(t, 100.0, recovery)
}
```

## Test Data

### Test Configuration Files
Located in `configs/` directory:

```bash
configs/
├── regtest-2-clients.yaml     # Simple 2-client test
├── regtest-5-clients.yaml     # Medium 5-client test
├── regtest-50-clients.yaml    # Load test 50 clients
└── test-invalid-*.yaml        # Invalid configs for error testing
```

### Mock Data
Use table-driven tests for comprehensive coverage:

```go
func TestConfigValidation(t *testing.T) {
    tests := []struct {
        name        string
        config      *Config
        expectError bool
        errorMsg    string
    }{
        {
            name: "valid config",
            config: &Config{
                Version: "1.0",
                Network: "regtest",
                Clients: []Client{{ID: "client_0", InitialFundingSats: 100000}},
            },
            expectError: false,
        },
        {
            name: "missing version",
            config: &Config{
                Network: "regtest",
                Clients: []Client{{ID: "client_0", InitialFundingSats: 100000}},
            },
            expectError: true,
            errorMsg:    "version is required",
        },
        // ... more test cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := Validate(tt.config)
            if tt.expectError {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorMsg)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## Continuous Integration

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: '1.24.6'
      - name: Run unit tests
        run: make test
      - name: Upload coverage
        uses: codecov/codecov-action@v2

  integration-tests:
    runs-on: ubuntu-latest
    services:
      nigiri:
        image: vulpemventures/nigiri
        ports:
          - 3000:3000
      fulmine:
        image: ghcr.io/arklabshq/fulmine:latest
        ports:
          - 7000:7000
          - 7001:7001
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: '1.24.6'
      - name: Run integration tests
        run: make integrationtest
```

## Benchmarking

### Run Benchmarks
```bash
# Run all benchmarks
go test -bench=. ./...

# Run specific benchmark
go test -bench=BenchmarkFundDistribution ./orchestrator/fund/...

# With memory profiling
go test -bench=. -benchmem ./...
```

### Benchmark Example
```go
func BenchmarkConfigParsing(b *testing.B) {
    yamlContent := loadTestConfig("regtest-5-clients.yaml")
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _, err := ParseYAML(yamlContent)
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

## Test Best Practices

### 1. Use Table-Driven Tests
Organize test cases in a table for comprehensive coverage.

### 2. Isolate External Dependencies
Use mocks for external services (Nigiri, Fulmine) in unit tests.

### 3. Clean Up Resources
Always clean up processes, files, and Docker containers after tests.

### 4. Test Error Paths
Ensure error handling is tested, not just happy paths.

### 5. Use Build Tags
Separate integration tests with `//go:build integration` to avoid slow CI.

## Debugging Tests

### Run Single Test with Debug Output
```bash
go test -v -run TestConfigParser ./orchestrator/config/...
```

### Use Delve Debugger
```bash
# Install delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug test
dlv test ./orchestrator/config -- -test.run TestConfigParser
```

### Enable Trace Logging
```bash
FULMINE_LOG_LEVEL=debug go test -v ./...
```

## Test Coverage Goals

### Current Coverage Targets
- **Overall**: 70%+
- **Core Components** (config, fund, process): 80%+
- **Integration Tests**: Key scenarios covered

### Generate Coverage Report
```bash
make coverage
open coverage.html
```

### View Coverage by Package
```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```
