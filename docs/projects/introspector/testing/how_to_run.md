# Introspector — How to Run

## Prerequisites

- Go 1.25.3+
- Docker and Docker Compose
- Buf CLI (for protobuf generation)
- Nigiri (Bitcoin regtest, for integration testing)

## Development Mode

```bash
# 1. Generate protobuf stubs (requires Docker + Buf)
make proto

# 2. Run with dev environment variables
make run
```

This loads `envs/introspector.dev.env` which sets:
- `INTROSPECTOR_SECRET_KEY` — Dev private key
- `INTROSPECTOR_NO_TLS=true` — TLS disabled for local dev

## Binary Build

```bash
# Build for current platform
make build

# Output: build/introspector-<os>-<arch>

# Run directly
INTROSPECTOR_SECRET_KEY=<key> ./build/introspector-linux-amd64
```

## Docker

### Build Image

```bash
docker build -t introspector .
```

### Run Container

```bash
docker run -d \
  --name introspector \
  -p 7073:7073 \
  -e INTROSPECTOR_SECRET_KEY=<hex_key> \
  -e INTROSPECTOR_NO_TLS=true \
  introspector
```

### With Full Test Stack

The `docker-compose.regtest.yml` starts the complete test environment:

```bash
# Start all services (requires nigiri network)
make docker-run

# Services started:
# - introspector (port 7073)
# - arkd (ports 7070, 7071)
# - arkd-wallet (port 6060)
# - nbxplorer (port 32838)
# - PostgreSQL for nbxplorer (port 5433)

# Stop all services
make docker-stop
```

**Note**: The Docker Compose stack requires the `nigiri` external Docker network. Start Nigiri first:
```bash
nigiri start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INTROSPECTOR_SECRET_KEY` | Yes | — | Hex-encoded private key |
| `INTROSPECTOR_DATADIR` | No | OS app data dir | Data directory |
| `INTROSPECTOR_PORT` | No | 7073 | gRPC/REST port |
| `INTROSPECTOR_NO_TLS` | No | false | Disable TLS |
| `INTROSPECTOR_TLS_EXTRA_IPS` | No | [] | Extra IPs for TLS cert |
| `INTROSPECTOR_TLS_EXTRA_DOMAINS` | No | [] | Extra domains for TLS cert |
| `INTROSPECTOR_LOG_LEVEL` | No | 4 (Debug) | Log verbosity (0-6) |

## Health Check

```bash
curl http://localhost:7073/v1/info
# Should return: {"version":"v0.0.1","signer_pubkey":"02..."}
```
