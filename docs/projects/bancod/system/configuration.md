# Bancod — Configuration

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `BANCOD_ARK_URL` | arkd gRPC endpoint |
| `BANCOD_WALLET_SEED` | Wallet seed (hex-encoded) |
| `BANCOD_INTROSPECTOR_URL` | Introspector service endpoint |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `BANCOD_WALLET_PASSWORD` | (none) | Wallet unlock password |
| `BANCOD_DATADIR` | `$HOME/.bancod` | Data directory (SQLite DB) |
| `BANCOD_GRPC_PORT` | `7070` | gRPC listener port |
| `BANCOD_HTTP_PORT` | `7071` | HTTP REST + web UI port |
| `BANCOD_LOG_LEVEL` | `4` (Info) | Logrus log level |
| `BANCOD_BANCO_ENABLED` | `true` | Enable banco swap plugin |
| `BANCOD_PREIMAGE_ENABLED` | `false` | Enable preimage claim plugin |

### Rules

- At least one plugin must be enabled (`BANCOD_BANCO_ENABLED` or `BANCOD_PREIMAGE_ENABLED`)
- gRPC and HTTP ports must be different
- Ports must be in range 1-65535
