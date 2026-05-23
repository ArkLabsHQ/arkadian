# Configuration

## Overview

arkd uses environment variables with the `ARKD_` prefix for configuration. The system provides sensible defaults, validates at startup, and supports multiple deployment scenarios (development, testing, production).

## Key Environment Variables

### Server Configuration
- `ARKD_PORT` (default: 7070) - Main gRPC/REST server port
- `ARKD_ADMIN_PORT` (default: PORT) - Admin RPC port (can be separate)
- `ARKD_LOG_LEVEL` (default: 4) - Logging level (0-6, where 6 is trace)
- `ARKD_NO_TLS` (default: true) - Disable TLS for development
- `ARKD_NO_MACAROONS` (default: false) - Disable authentication

### Database Configuration
- `ARKD_DB_TYPE` (default: postgres) - Database type: postgres, sqlite, badger
- `ARKD_EVENT_DB_TYPE` (default: postgres) - Event store type: postgres, badger
- `ARKD_PG_DB_URL` - PostgreSQL connection URL for main database
- `ARKD_PG_EVENT_DB_URL` - PostgreSQL connection URL for event store
- `ARKD_DB_DIR` - Directory for file-based databases

### Cache Configuration
- `ARKD_LIVE_STORE_TYPE` (default: redis) - Cache type: redis, inmemory
- `ARKD_REDIS_URL` - Redis connection URL
- `ARKD_REDIS_NUM_OF_RETRIES` (default: 10) - Max retries for Redis transactions

### External Services
- `ARKD_WALLET_ADDR` - Wallet service address (host:port)
- `ARKD_SIGNER_ADDR` (default: WALLET_ADDR) - Signer service address
- `ARKD_ESPLORA_URL` (default: https://blockstream.info/api) - Esplora API URL

### Round Configuration
- `ARKD_ROUND_INTERVAL` (default: 30) - Interval between rounds in seconds
- `ARKD_SESSION_DURATION` (default: 30) - Session duration in seconds; must be >=2 and <= `ARKD_UNROLLED_VTXO_MIN_EXPIRY_MARGIN`
- `ARKD_SCHEDULER_TYPE` (default: gocron) - Scheduler type: gocron, block
- `ARKD_ROUND_MIN_PARTICIPANTS_COUNT` (default: 1) - Minimum participants
- `ARKD_ROUND_MAX_PARTICIPANTS_COUNT` (default: 128) - Maximum participants

### Security Settings
- `ARKD_VTXO_TREE_EXPIRY` (default: 604672) - VTXO tree expiration (7 days in seconds)
- `ARKD_UNILATERAL_EXIT_DELAY` (default: 86400) - Exit delay (24 hours in seconds)
- `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY` (default: same as UNILATERAL_EXIT_DELAY) - Public unilateral exit delay
- `ARKD_BOARDING_EXIT_DELAY` (default: 7776000) - Boarding delay (3 months in seconds)
- `ARKD_ALLOW_CSV_BLOCK_TYPE` (default: false) - Allow block-height timelocks
- `ARKD_VTXO_NO_CSV_VALIDATION_CUTOFF_DATE` (default: 0) - Skip CSV validation for VTXOs created before this Unix timestamp (disabled by default)
- `ARKD_SETTLEMENT_MIN_EXPIRY_GAP` (default: 0) - Minimum expiry gap for settlement (disabled by default)

### Amount Limits
- `ARKD_UTXO_MAX_AMOUNT` (default: -1) - Maximum UTXO amount (-1 = no limit)
- `ARKD_UTXO_MIN_AMOUNT` (default: -1) - Minimum UTXO amount (-1 = dust limit)
- `ARKD_VTXO_MAX_AMOUNT` (default: -1) - Maximum VTXO amount (-1 = no limit)
- `ARKD_VTXO_MIN_AMOUNT` (default: -1) - Minimum VTXO amount (-1 = dust limit)

### Transaction Fees
Fees are now managed via a programmable CEL formula engine (see Admin Fee APIs). The static `ARKD_ONCHAIN_OUTPUT_FEE` has been **[DEPRECATED]** and replaced by the dynamic fee system.

### Database Auto-Creation
- `ARKD_PG_DB_AUTOCREATE` (default: false) - Automatically create PostgreSQL databases if they don't exist

### Wallet Unlocking
- `ARKD_UNLOCKER_TYPE` - Unlocker type: env, file
- `ARKD_UNLOCKER_FILE_PATH` - File path for file-based unlocker
- `ARKD_UNLOCKER_PASSWORD` - Password for env-based unlocker

### gRPC Gateway / Streaming
- `ARKD_MAX_CONCURRENT_STREAMS` (default: 1000) - HTTP/2 `MAX_CONCURRENT_STREAMS` budget advertised per gateway connection
- `ARKD_STREAM_CONN_POOL_SIZE` (default: 4, max: 64) - Number of pooled `grpc.ClientConn`s the gateway uses for streaming RPCs. Each connection carries an independent stream budget, so the effective concurrent-stream capacity is `MAX_CONCURRENT_STREAMS * STREAM_CONN_POOL_SIZE`. `splitConn` round-robins `NewStream` calls across the pool; values are clamped to `[1, 64]`. Set to `1` to restore the previous single-connection behavior.

### Observability & Monitoring
- `ARKD_OTEL_COLLECTOR_ENDPOINT` - OpenTelemetry collector endpoint
- `ARKD_OTEL_PUSH_INTERVAL` (default: 10) - Push interval in seconds
- `ARKD_PYROSCOPE_SERVER_URL` - Pyroscope profiling server URL
- `ARKD_ALERT_MANAGER_URL` - AlertManager URL for alerts integration
- `ARKD_ENABLE_PPROF` (default: false) - Enable pprof profiling endpoint

## Configuration Examples

### Development (Light Mode)
Minimal dependencies with embedded databases:

```bash
ARKD_LOG_LEVEL=5
ARKD_NO_MACAROONS=true
ARKD_VTXO_TREE_EXPIRY=512
ARKD_UNILATERAL_EXIT_DELAY=512
ARKD_BOARDING_EXIT_DELAY=1024
ARKD_ESPLORA_URL=http://localhost:3000
ARKD_WALLET_ADDR=localhost:6060
ARKD_LIVE_STORE_TYPE=inmemory
ARKD_DB_TYPE=sqlite
ARKD_EVENT_DB_TYPE=badger
ARKD_ALLOW_CSV_BLOCK_TYPE=true
ARKD_ROUND_INTERVAL=10
```

### Development (Full Mode)
With PostgreSQL and Redis:

```bash
ARKD_LOG_LEVEL=5
ARKD_NO_MACAROONS=true
ARKD_VTXO_TREE_EXPIRY=512
ARKD_UNILATERAL_EXIT_DELAY=512
ARKD_BOARDING_EXIT_DELAY=1024
ARKD_ESPLORA_URL=http://localhost:3000
ARKD_WALLET_ADDR=localhost:6060
ARKD_PG_DB_URL=postgresql://root:secret@127.0.0.1:5432/projection?sslmode=disable
ARKD_PG_EVENT_DB_URL=postgresql://root:secret@127.0.0.1:5432/event?sslmode=disable
ARKD_REDIS_URL=redis://localhost:6379/0
ARKD_ALLOW_CSV_BLOCK_TYPE=true
```

### Production
Production-ready configuration:

```bash
ARKD_LOG_LEVEL=3
ARKD_NO_MACAROONS=false
ARKD_NO_TLS=false
ARKD_PORT=7070
ARKD_ADMIN_PORT=7071
ARKD_DB_TYPE=postgres
ARKD_PG_DB_URL=postgresql://arkd:password@db.example.com:5432/arkd?sslmode=require
ARKD_EVENT_DB_TYPE=postgres
ARKD_PG_EVENT_DB_URL=postgresql://arkd:password@db.example.com:5432/arkd_events?sslmode=require
ARKD_LIVE_STORE_TYPE=redis
ARKD_REDIS_URL=rediss://redis.example.com:6379/0
ARKD_ESPLORA_URL=https://blockstream.info/api
ARKD_WALLET_ADDR=wallet:6060
ARKD_SCHEDULER_TYPE=block
ARKD_VTXO_TREE_EXPIRY=1008
ARKD_UNILATERAL_EXIT_DELAY=144
ARKD_BOARDING_EXIT_DELAY=43200
ARKD_ROUND_INTERVAL=600
ARKD_ALLOW_CSV_BLOCK_TYPE=true
```

## Data Directories

Platform-specific locations:
- Linux: `~/.arkd/`
- macOS: `~/Library/Application Support/arkd/`
- Windows: `%APPDATA%\arkd\`

Override with `ARKD_DATADIR` environment variable.

## Validation Rules

### Locktime Validation
- Values >= 512 are interpreted as seconds
- Values < 512 are interpreted as blocks
- Second-based values must be multiples of 512 (auto-rounded)
- Unilateral and Boarding delays must be different
- Block-based delays only allowed for VtxoTreeExpiry with block scheduler

### Round Validation
- Round interval must be at least 2 seconds
- Min participants must be at least 1
- Max participants should be reasonable (default 128)

### Database Validation
- PostgreSQL URL required if DB_TYPE=postgres
- Event PostgreSQL URL required if EVENT_DB_TYPE=postgres
- Redis URL required if LIVE_STORE_TYPE=redis

### Scheduler Validation
- If VtxoTreeExpiry is in blocks, SchedulerType must be "block"
- If VtxoTreeExpiry is in seconds, SchedulerType must be "gocron"
- AllowCSVBlockType automatically set to true if SchedulerType=block

## Best Practices

### Development
- Use SQLite or Badger for simplicity
- In-memory live store for testing
- Short timelocks (512s) for faster testing
- Disable TLS and macaroons

### Production
- Use PostgreSQL for reliability
- Separate databases for data and events
- Enable SSL/TLS for database connections
- Use Redis for clustering support
- Enable TLS and macaroons
- Longer timelocks for security
- Block-based scheduler for accuracy
- Set reasonable amount limits

### Security
- Always enable TLS in production (NO_TLS=false)
- Always enable macaroons in production (NO_MACAROONS=false)
- Use file-based unlocker with secure permissions (0600)
- Consider not using auto-unlock in high-security environments
- Use secrets management (Vault, AWS Secrets Manager)

## Cross-References

- [Tech Stack](./tech_stack.md) - Technologies and libraries
- [Integration Points](./integration_points.md) - Service communication
- [Architecture Overview](./architecture.md) - System architecture
