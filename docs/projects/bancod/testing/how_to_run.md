# Bancod — How to Run

## Prerequisites

- Go 1.26+
- arkd instance (for tx stream subscription)
- Introspector service (for signing)
- Docker (optional, for containerized deployment)
- nigiri (for integration testing)

## Development

```bash
# Build
make build

# Run locally
export BANCOD_ARK_URL=localhost:7070
export BANCOD_WALLET_SEED=<hex>
export BANCOD_INTROSPECTOR_URL=localhost:8080
./bancod

# With preimage plugin enabled
export BANCOD_PREIMAGE_ENABLED=true
./bancod
```

## Docker Deployment

```bash
# Build image
make docker

# Run with docker-compose (for test environments)
docker compose -f test/docker-compose.yml up -d
```

## Integration Test Environment

```bash
# Full stack: nigiri + arkd + introspector + fund wallet
make setup-test-env

# Run integration tests
make integrationtest

# Teardown
make teardown-test-env
```

### CI Environment (nigiri already running)

```bash
# Start arkd stack only (assumes nigiri is up)
make docker-run

# Stop arkd stack
make docker-stop
```
