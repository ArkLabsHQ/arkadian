# Configuration

## Overview

arkd uses environment variables with the `ARKD_` prefix for configuration. The system provides sensible defaults, validates at startup, and supports multiple deployment scenarios (development, testing, production).

**Two-tier model (PR #939):** configuration is now split into two categories:

1. **Infrastructure variables** (database, wallet/signer addresses, ports, TLS, unlocker, observability, …) — read from the environment on **every** boot, as before.
2. **Operational settings** (exit delays, amount limits, round participants, ban config, tx weight, fees, scheduled session, …) — persisted as a **single row in the database** (`domain.Settings`). The corresponding `ARKD_*` env vars are used **only on first boot** to seed that row (defaults apply if unset). On every later boot the env vars are **ignored** — the stored row wins — and settings are managed exclusively via the admin API (`GET`/`POST /v1/admin/settings`, partial updates). The seed runs once, gated on the settings table being empty, and never overwrites admin changes. Legacy `intent_fees` / `scheduled_session` rows are carried over into the settings row during the first-boot seed.

See `docs/settings.md` in the arkd repo for the full seed-variable table and lifecycle diagram.

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

### Operational Settings (First-Boot Seed Only)

> **These variables only matter on the first boot against an empty settings table.** After that they are ignored; change values via `POST /v1/admin/settings` instead. Setting names in the DB/API are the snake_case form without the `ARKD_` prefix (e.g. `vtxo_min_amount`).

**Round / session:**
- `ARKD_SESSION_DURATION` (default: 30) - Session duration in seconds; must be >=2 and <= `ARKD_UNROLLED_VTXO_MIN_EXPIRY_MARGIN`
- `ARKD_UNROLLED_VTXO_MIN_EXPIRY_MARGIN` (default: 300) - Minimum expiry margin for unrolled VTXOs, in seconds
- `ARKD_ROUND_MIN_PARTICIPANTS_COUNT` (default: 1) - Minimum participants
- `ARKD_ROUND_MAX_PARTICIPANTS_COUNT` (default: 128) - Maximum participants
- `ARKD_BATCH_TRIGGER` (default: "" = always start) - Optional [CEL](https://github.com/google/cel-spec) formula that gates whether the server starts a new batch round (PR #1046). Empty/unset preserves the legacy "start every session" behaviour. Seeded into the settings row on first boot; thereafter admin-updatable at runtime via the `batch_trigger` field of `POST /v1/admin/settings` (also settable with the `--batch-trigger` CLI flag). See [Batch Trigger Gate](#batch-trigger-gate) below.

**Timelocks (relative locktimes: >= 512 = seconds, < 512 = blocks; block-based only on regtest):**
- `ARKD_VTXO_TREE_EXPIRY` (default: 604672) - VTXO tree expiration (7 days in seconds)
- `ARKD_UNILATERAL_EXIT_DELAY` (default: 86400) - Exit delay (24 hours in seconds)
- `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY` (default: 86400) - Public unilateral exit delay
- `ARKD_CHECKPOINT_EXIT_DELAY` (default: 86400) - Checkpoint exit delay
- `ARKD_BOARDING_EXIT_DELAY` (default: 7776000) - Boarding delay (3 months in seconds)

**Validation / limits:**
- `ARKD_VTXO_NO_CSV_VALIDATION_CUTOFF_DATE` (default: 0) - Skip CSV validation for VTXOs created before this Unix timestamp (disabled by default)
- `ARKD_SETTLEMENT_MIN_EXPIRY_GAP` (default: 0) - Minimum expiry gap for settlement (disabled by default)
- `ARKD_UTXO_MAX_AMOUNT` (default: -1) - Maximum UTXO amount (-1 = no limit, 0 = boarding disabled)
- `ARKD_UTXO_MIN_AMOUNT` (default: -1) - Minimum UTXO amount (-1 = dust limit)
- `ARKD_VTXO_MAX_AMOUNT` (default: -1) - Maximum VTXO amount (-1 = no limit)
- `ARKD_VTXO_MIN_AMOUNT` (default: -1) - Minimum VTXO amount (-1 = dust limit)
- `ARKD_MAX_TX_WEIGHT` (default: 40000) - Maximum transaction weight in weight units
- `ARKD_MAX_OP_RETURN_OUTS` (default: 3) - Maximum OP_RETURN outputs (floored to a minimum of 1)
- `ARKD_ASSET_TX_MAX_WEIGHT_RATIO` (default: 0.5) - Asset tx max weight ratio, open interval (0, 1)

**Anti-abuse:**
- `ARKD_BAN_THRESHOLD` (default: 3) - Number of crimes to trigger a ban (0 disables banning)
- `ARKD_BAN_DURATION` (default: 300) - Ban duration in seconds

**Other:**
- `ARKD_NOTE_URI_PREFIX` (default: "") - Note URI prefix

**Removed variables:**
- `ARKD_SCHEDULER_TYPE` **[REMOVED]** - The scheduler is now derived from the `vtxo_tree_expiry` locktime type (seconds → gocron, blocks → block scheduler)
- `ARKD_ALLOW_CSV_BLOCK_TYPE` **[REMOVED]** - Block-based locktimes are simply allowed on regtest only
- `ARKD_ROUND_INTERVAL` **[REMOVED]** - Superseded by `ARKD_SESSION_DURATION`

### Admin Settings API

Once seeded, settings are managed exclusively through the admin API (macaroon: `manager:read` / `manager:write`):

| Endpoint                | Method | Description                                            |
|-------------------------|--------|--------------------------------------------------------|
| `/v1/admin/settings`    | GET    | Retrieve current settings (`AdminService.GetSettings`) |
| `/v1/admin/settings`    | POST   | Update settings (`AdminService.UpdateSettings`; partial — only provided fields change; response returns a `change_log`) |

Updates are validated server-side (locktime rules, amount min/max consistency, uint32 overflow guards, `MaxTxWeight`, `BanThreshold`, etc.), serialized under a mutex, and applied to the live-store settings cache synchronously, so concurrent updates can't lose each other. The scheduled-session (`/v1/admin/scheduledSession`) and batch-fee (`/v1/admin/intentFees`) endpoints now mutate the same unified settings row.

### Batch Trigger Gate

`ARKD_BATCH_TRIGGER` (PR #1046) is an optional CEL formula, stored as the `batch_trigger` field of the unified settings row, that decides whether the server starts a new batch round. It is evaluated at the top of `startRound()` before any round state is created; the compiled program is cached and recompiled only when the text changes, so a runtime update via `UpdateSettings` takes effect on the next round without a restart. If it returns `false`, the server waits one sixth of `ARKD_SESSION_DURATION` and re-checks. The program **must return `bool`** and is validated both at startup (a bad `ARKD_BATCH_TRIGGER` fails `Validate()`) and on every `UpdateSettings` call. At round time the gate **fails open** — a program that fails to compile or evaluate allows the round and logs a warning, so a buggy formula can never wedge the scheduler. A nil/empty program is permissive (always allow).

Exposed variables (all typed as `double`; numeric literals must use the `.0` form) plus a `now() -> double` helper (current Unix seconds):

| Variable | Description |
|----------|-------------|
| `intents_count` | Number of pending intents queued |
| `current_feerate` | Current mempool fee rate in sat/kvbyte (from the wallet) |
| `time_since_last_batch` | Seconds since the last finalized batch (`0` if none since boot) |
| `boarding_inputs_count` | Total pending boarding UTXOs across all queued intents |
| `total_boarding_amount` | Total satoshis across all pending boarding UTXOs |
| `total_intent_fees` | Total implicit fees (sum of input − output amounts) across pending intents |

Example — only batch when there is more than one intent and either fees are low or an hour has passed:

```cel
intents_count > 1.0 && (current_feerate <= 2.0 || time_since_last_batch >= 3600.0)
```

See `internal/core/domain/batchtrigger/README.md` in the arkd repo for the full variable reference and more examples.

### Transaction Fees
Fees are managed via a programmable CEL formula engine (see Admin Fee APIs) and are persisted as `BatchFees` inside the unified settings row. The static `ARKD_ONCHAIN_OUTPUT_FEE` has been **[DEPRECATED]** and replaced by the dynamic fee system.

### Database Auto-Creation
- `ARKD_PG_DB_AUTOCREATE` (default: false) - Automatically create PostgreSQL databases if they don't exist

### Wallet Unlocking
- `ARKD_UNLOCKER_TYPE` - Unlocker type: env, file
- `ARKD_UNLOCKER_FILE_PATH` - File path for file-based unlocker
- `ARKD_UNLOCKER_PASSWORD` - Password for env-based unlocker

### arkd-wallet Signer Keys (PR #1097)

These variables are read by the **arkd-wallet** service (env prefix `ARKD_WALLET_`), not arkd itself:

- `ARKD_WALLET_SIGNER_KEY` - Hex-encoded 32-byte private key used as the current server signing key
- `ARKD_WALLET_DEPRECATED_SIGNER_KEYS` (default: "") - Comma-separated list of previously-used signing keys still accepted for VTXOs signed before rotation. Each entry is `<hexkey>[:<unix-cutoff>]`: a 32-byte hex private key, optionally followed by a Unix timestamp after which the key is no longer accepted (`0` or omitted = no cutoff). Startup fails if any deprecated key equals `ARKD_WALLET_SIGNER_KEY`. The wallet exposes these via the signer `GetPubkey` RPC (`deprecated_signers`), and arkd verifies intents / strips signer signatures against current + deprecated keys.

### gRPC Gateway / Streaming
- `ARKD_MAX_CONCURRENT_STREAMS` (default: 1000) - HTTP/2 `MAX_CONCURRENT_STREAMS` budget advertised per gateway connection
- `ARKD_STREAM_CONN_POOL_SIZE` (default: 4, max: 64) - Number of pooled `grpc.ClientConn`s the gateway uses for streaming RPCs. Each connection carries an independent stream budget, so the effective concurrent-stream capacity is `MAX_CONCURRENT_STREAMS * STREAM_CONN_POOL_SIZE`. `splitConn` round-robins `NewStream` calls across the pool; values are clamped to `[1, 64]`. Set to `1` to restore the previous single-connection behavior.

### Observability & Monitoring
- `ARKD_OTEL_COLLECTOR_ENDPOINT` - OpenTelemetry collector endpoint
- `ARKD_OTEL_PUSH_INTERVAL` (default: 10) - Push interval in seconds
- `ARKD_PYROSCOPE_SERVER_URL` - Pyroscope profiling server URL
- `ARKD_ALERT_MANAGER_URL` - AlertManager URL for alerts integration
- `ARKD_ENABLE_PPROF` (default: false) - Enable pprof profiling endpoint
- `ARKD_ENABLE_CHANNELZ` (default: false) - Expose gRPC channelz introspection on the admin port; query via `grpc_cli`. The channelz RPCs (`GetTopChannels`, `GetServers`, `GetServer`, `GetServerSockets`, `GetChannel`, `GetSubchannel`, `GetSocket`) are macaroon-whitelisted (auth-free) since they are already restricted to the admin port (PR #1133)

## Configuration Examples

> Timelock/round settings in these examples only take effect on the **first** start against a fresh database; afterwards use the admin settings API.

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
ARKD_SESSION_DURATION=10
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
# Settings below are first-boot seeds; manage at runtime via POST /v1/admin/settings
ARKD_VTXO_TREE_EXPIRY=604672
ARKD_UNILATERAL_EXIT_DELAY=86400
ARKD_BOARDING_EXIT_DELAY=7776000
```

## Data Directories

Platform-specific locations:
- Linux: `~/.arkd/`
- macOS: `~/Library/Application Support/arkd/`
- Windows: `%APPDATA%\arkd\`

Override with `ARKD_DATADIR` environment variable.

## Validation Rules

### Locktime Validation
- Values >= 512 (`arklib.MinAllowedSequence`) are interpreted as seconds, values < 512 as blocks (`arklib.ParseRelativeLocktime`)
- Second-based values must be multiples of 512 (auto-rounded)
- Unilateral and Boarding delays must be different
- Block-based locktimes are only allowed on regtest

### Round Validation
- Session duration must be at least 2 seconds and <= unrolled VTXO min expiry margin
- Min participants must be at least 1
- Max participants should be reasonable (default 128)

### Database Validation
- PostgreSQL URL required if DB_TYPE=postgres
- Event PostgreSQL URL required if EVENT_DB_TYPE=postgres
- Redis URL required if LIVE_STORE_TYPE=redis

### Scheduler Selection
- The scheduler service is derived from the `vtxo_tree_expiry` locktime type: seconds → gocron time scheduler, blocks → block scheduler (Esplora-backed)
- `ARKD_SCHEDULER_TYPE` and `ARKD_ALLOW_CSV_BLOCK_TYPE` no longer exist

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
