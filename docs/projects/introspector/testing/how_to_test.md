# Introspector — Testing Guide

## Test Structure

```
test/
├── e2e_test.go        — End-to-end tests (full round lifecycle)
├── pay_2_out_test.go  — Pay-to-output Arkade Script tests
└── utils_test.go      — Test utilities and helpers

pkg/arkade/
├── engine_test.go     — Script engine unit tests
├── opcode_test.go     — Opcode implementation tests
├── scriptnum_test.go  — Script number encoding tests
└── stack_test.go      — Stack operation tests
```

## Unit Tests

### Arkade Script Engine

```bash
# Run all unit tests in the arkade package
go test -v ./pkg/arkade/...

# Run specific test
go test -v ./pkg/arkade/ -run TestEngine
go test -v ./pkg/arkade/ -run TestOpcodes
go test -v ./pkg/arkade/ -run TestScriptNum
go test -v ./pkg/arkade/ -run TestStack
```

## Integration Tests

### Prerequisites

1. Start the Docker test infrastructure:
```bash
# Start nigiri (Bitcoin regtest)
nigiri start

# Start arkd + introspector + dependencies
make docker-run
```

2. Wait for services to be ready.

### Run Integration Tests

```bash
# Run all integration tests
make integrationtest

# Or directly:
go test -v ./test/...

# Run specific E2E test
go test -v ./test/ -run TestE2E
go test -v ./test/ -run TestPay2Out
```

### Teardown

```bash
make docker-stop
nigiri stop
```

## What Tests Cover

### E2E Tests (`test/e2e_test.go`)
- Full Ark round lifecycle with Arkade Script
- SubmitTx → SubmitIntent → SubmitFinalization flow
- Script execution success and failure cases
- Multi-input transaction signing
- Checkpoint transaction correlation

### Pay-to-Output Tests (`test/pay_2_out_test.go`)
- Arkade Script pay-to-output conditions
- Output value and script validation via introspection opcodes
- Transaction structure enforcement

### Script Engine Tests (`pkg/arkade/engine_test.go`)
- Individual opcode execution
- Stack manipulation
- Error handling and edge cases
- Script parsing and tokenization

## Code Quality

```bash
# Format code
make format

# Lint
make lint

# Protobuf linting
make proto-lint
```
