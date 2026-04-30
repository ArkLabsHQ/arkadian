# Introspector — Usage Guide

## Quick Start

### Prerequisites

- Go 1.26+
- Docker and Docker Compose
- Buf CLI (for protobuf generation)
- A running arkd instance (REQUIRED — `INTROSPECTOR_ARKD_URL` must point to it; the service fetches arkd's signer pubkey at startup)

### 1. Build

```bash
# Generate protobuf stubs
make proto

# Build binary
make build
# Output: build/introspector-<os>-<arch>
```

### 2. Configure

Set the required environment variables:

```bash
export INTROSPECTOR_SECRET_KEY=<hex_encoded_private_key>
export INTROSPECTOR_ARKD_URL=<grpc_url_of_arkd>   # Required — used for finalization in SubmitTx
```

Optional configuration:

```bash
export INTROSPECTOR_PORT=7073           # gRPC port (default: 7073)
export INTROSPECTOR_NO_TLS=true         # Disable TLS for dev
export INTROSPECTOR_LOG_LEVEL=4         # Debug level (0-6)
export INTROSPECTOR_DATADIR=/app/data   # Data directory
```

### 3. Run

```bash
# Development mode (with dev env file)
make run

# Or directly
go run cmd/introspector.go
```

### 4. Verify

```bash
# Check service info via REST
curl http://localhost:7073/v1/info

# Response:
# {"version":"v0.0.1","signer_pubkey":"02..."}
```

## Docker Deployment

### Standalone

```bash
docker build -t introspector .
docker run -d \
  -p 7073:7073 \
  -e INTROSPECTOR_SECRET_KEY=<key> \
  -e INTROSPECTOR_NO_TLS=true \
  introspector
```

### With arkd (Regtest)

```bash
# Start full test environment (arkd + wallet + bitcoin + introspector)
make docker-run

# Stop
make docker-stop
```

## API Usage

### Get Service Info

```bash
curl http://localhost:7073/v1/info
```

### Submit Transaction

```bash
curl -X POST http://localhost:7073/v1/tx \
  -H "Content-Type: application/json" \
  -d '{
    "ark_tx": "<base64_psbt>",
    "checkpoint_txs": ["<base64_checkpoint_psbt>"]
  }'
```

### Submit Intent

```bash
curl -X POST http://localhost:7073/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {
      "proof": "<base64_psbt>",
      "message": "<base64_register_message>"
    }
  }'
```

### Submit Finalization

```bash
curl -X POST http://localhost:7073/v1/finalization \
  -H "Content-Type: application/json" \
  -d '{
    "signed_intent": {
      "proof": "<base64_signed_psbt>",
      "message": "<base64_register_message>"
    },
    "forfeits": ["<base64_forfeit_psbt>"],
    "connector_tree": [...],
    "commitment_tx": "<base64_psbt>"
  }'
```

## Go Client Library

```go
import (
    "github.com/ArkLabsHQ/introspector/pkg/client"
    "google.golang.org/grpc"
)

conn, _ := grpc.Dial("localhost:7073", grpc.WithInsecure())
c := client.NewGRPCClient(conn)

info, _ := c.GetInfo(ctx)
fmt.Println(info.SignerPublicKey)
```
