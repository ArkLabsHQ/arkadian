# Introspector — Development Workflow

## Prerequisites

- Go 1.26+
- Docker and Docker Compose
- Buf CLI (for protobuf generation)
- Nigiri (Bitcoin regtest environment)
- golangci-lint (for linting)

## Setup

```bash
# Clone the repository
git clone git@github.com:ArkLabsHQ/introspector.git
cd introspector

# Generate protobuf stubs
make proto
```

## Development Cycle

### 1. Make Changes

The project structure:
- `cmd/introspector.go` — Entry point
- `internal/application/` — Business logic
- `internal/interface/grpc/` — gRPC handlers
- `internal/config/` — Configuration
- `pkg/arkade/` — Arkade Script engine
- `pkg/client/` — Go client library
- `api-spec/protobuf/` — Protobuf definitions

### 2. Format & Lint

```bash
make format
make lint
```

### 3. Run Unit Tests

```bash
go test -v ./pkg/arkade/...
```

### 3b. Run Fuzz Tests (optional)

The Arkade Script engine has fuzz harnesses for the tokenizer, opcodes, and engine:

```bash
cd pkg/arkade
go test -run=^$ -fuzz=FuzzArkadeScriptTokenizer -fuzztime=10m
go test -run=^$ -fuzz=FuzzOpcodes -fuzztime=10m
go test -run=^$ -fuzz=FuzzEngine -fuzztime=10m
```

Seed corpora live under `pkg/arkade/testdata/fuzz/`.

### 4. Run Integration Tests

```bash
# Start infrastructure
nigiri start
make docker-run

# Wait for services to be healthy, then:
make integrationtest

# Cleanup
make docker-stop
```

### 5. Build

```bash
make build
```

## Protobuf Changes

If modifying `api-spec/protobuf/introspector/v1/service.proto`:

```bash
# Lint protos first
make proto-lint

# Generate stubs
make proto
```

## PR Checklist

- [ ] Code formatted (`make format`)
- [ ] Linter passes (`make lint`)
- [ ] Unit tests pass (`go test ./pkg/arkade/...`)
- [ ] Integration tests pass (`make integrationtest`)
- [ ] Protobuf generated if proto files changed (`make proto`)
- [ ] New opcodes documented in README
- [ ] Breaking API changes documented
