# Bancod — Usage Guide

## Quick Start

### Build from Source

```bash
make build    # produces ./bancod and ./banco binaries
```

### Run the Daemon

```bash
export BANCOD_ARK_URL=localhost:7070
export BANCOD_WALLET_SEED=<hex-encoded-seed>
export BANCOD_INTROSPECTOR_URL=localhost:8080
./bancod
```

### Docker

```bash
make docker   # build image
docker run -d --name bancod \
  -e BANCOD_ARK_URL=arkd:7070 \
  -e BANCOD_WALLET_SEED=<seed> \
  -e BANCOD_INTROSPECTOR_URL=introspector:8080 \
  -p 7070:7070 -p 7071:7071 \
  bancod
```

## CLI Client

The `banco` CLI connects to the HTTP API (default `http://localhost:7071`).

Override with `--server` flag or `BANCO_SERVER` env var.

### Pair Management

```bash
banco pair add --pair BTC/<asset> --min 1000 --max 100000 --price-feed <url>
banco pair update --pair BTC/<asset> --min 500
banco pair remove --pair BTC/<asset>
banco pair list
```

### Status & Wallet

```bash
banco status     # check if solver is running
banco balance    # onchain + offchain balances
banco address    # offchain + boarding addresses
```

## API Endpoints

- **gRPC**: `localhost:7070` (BancoService + PreimageService)
- **REST**: `localhost:7071/v1/...` (grpc-gateway)
- **Web UI**: `localhost:7071` (embedded static files)
