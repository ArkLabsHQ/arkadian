# Boltz Backend — Usage Guide

## Quick Start

### Using Public API

The easiest way to use Boltz is via the public API at `https://api.boltz.exchange`:

```bash
# Check supported pairs
curl https://api.boltz.exchange/getpairs

# Create submarine swap (Chain → Lightning)
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{"type":"submarine","pairId":"BTC/BTC","orderSide":"sell","invoice":"lnbc..."}'
```

No installation required, but you're using Boltz's hosted service.

### Self-Hosted Deployment

For privacy, control, or integration testing, run your own instance.

## Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **Rust**: Latest stable toolchain
- **Bitcoin Node**: bitcoind or btcd
- **Lightning Node**: LND or Core Lightning
- **Database**: PostgreSQL 13+ (production) or SQLite (development)
- **Redis**: Optional, for caching and distributed locks

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Rust dependencies are handled by Cargo
```

### 3. Compile

```bash
# Compile TypeScript + Rust
npm run compile

# For production (optimized build)
npm run compile:release
```

## Configuration

Create `boltz.conf` in the project root:

```toml
[loglevel]
level = "info"

[database]
backend = "postgres"
host = "localhost"
port = 5432
database = "boltz"
username = "boltz"
password = "your_password"

[chain]
[chain.BTC]
host = "127.0.0.1"
port = 8332
rpcuser = "bitcoin"
rpcpass = "bitcoin"
zmqpubrawtx = "tcp://127.0.0.1:28332"
zmqpubrawblock = "tcp://127.0.0.1:28333"

[lightning]
[lightning.LND]
host = "127.0.0.1"
port = 10009
macaroon = "/path/to/admin.macaroon"
certificate = "/path/to/tls.cert"

[api]
host = "0.0.0.0"
port = 9001
```

## Running

### Development Mode

```bash
# Start with auto-reload
npm run dev
```

### Production Mode

```bash
# Compile with optimizations
npm run compile:release

# Start server
npm run start
```

### Docker Deployment

```bash
# Build image
docker build -t boltz-backend .

# Run container
docker run -d \
  --name boltz-backend \
  -p 9001:9001 \
  -v ./boltz.conf:/app/boltz.conf \
  -v boltz-data:/app/data \
  boltz-backend
```

## Testing

### Regtest Environment

Boltz provides a complete regtest environment with Bitcoin, Lightning, and Liquid:

```bash
# Start regtest stack (Docker Compose)
npm run regtest:start

# Setup database
npm run regtest:db:setup

# Stop regtest
npm run regtest:stop
```

This starts:
- Bitcoin regtest node
- 2x LND nodes (Alice, Bob)
- Liquid regtest node
- PostgreSQL database

### Unit Tests

```bash
npm run test:unit
```

## API Access

Once running, access the API:

```bash
# Base URL (local)
http://localhost:9001

# Health check
curl http://localhost:9001/version

# Get supported pairs
curl http://localhost:9001/getpairs

# Swagger UI (if enabled)
http://localhost:9001/swagger
```

## Integration with Fulmine

To use your self-hosted Boltz instance with Fulmine:

```bash
# In Fulmine configuration
export FULMINE_BOLTZ_URL="http://localhost:9001"
export FULMINE_BOLTZ_WS_URL="ws://localhost:9001/ws"

# Start Fulmine
make run
```

## Monitoring

### Prometheus Metrics

Metrics are exposed at `http://localhost:9001/metrics`:

```bash
curl http://localhost:9001/metrics
```

Key metrics:
- `boltz_swaps_total`: Total swaps created
- `boltz_swaps_successful`: Successful swaps
- `boltz_swaps_failed`: Failed swaps
- `boltz_swap_duration_seconds`: Swap completion time

### Logs

Logs are written to stdout in JSON format:

```bash
# Follow logs
docker logs -f boltz-backend

# Filter for errors
docker logs boltz-backend 2>&1 | grep '"level":"error"'
```

## Common Operations

### Create Submarine Swap

```bash
curl -X POST http://localhost:9001/createswap \
  -H "Content-Type: application/json" \
  -d '{
    "type": "submarine",
    "pairId": "BTC/BTC",
    "orderSide": "sell",
    "invoice": "lnbc1m1pj...",
    "refundPublicKey": "02abc123..."
  }'
```

### Check Swap Status

```bash
curl http://localhost:9001/swapstatus?id=<swap_id>
```

### Get Fee Estimation

```bash
curl http://localhost:9001/getpairs | jq '.pairs.BTC_BTC.fees'
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Bitcoin/Lightning node

**Solution**:
- Verify node is running: `bitcoin-cli getblockchaininfo`
- Check RPC credentials in `boltz.conf`
- Ensure ZMQ endpoints are enabled in `bitcoin.conf`

### Database Errors

**Problem**: Database connection failed

**Solution**:
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `boltz.conf`
- Ensure database exists: `psql -U boltz -l`

### Swap Failures

**Problem**: Swaps stuck in pending state

**Solution**:
- Check Lightning node connectivity
- Verify Lightning node has sufficient liquidity
- Check logs for payment errors
- Ensure HTLC timeout is sufficient

## Configuration Examples

### Minimal (Development)

```toml
[database]
backend = "sqlite"
file = "boltz.db"

[chain.BTC]
host = "127.0.0.1"
port = 18443  # regtest
rpcuser = "bitcoin"
rpcpass = "bitcoin"

[lightning.LND]
host = "127.0.0.1"
port = 10009
```

### Production (PostgreSQL + LND)

```toml
[database]
backend = "postgres"
host = "db.example.com"
port = 5432
database = "boltz_prod"
username = "boltz"
password = "${DB_PASSWORD}"
ssl = true

[chain.BTC]
host = "bitcoin-node.internal"
port = 8332
rpcuser = "${BTC_RPC_USER}"
rpcpass = "${BTC_RPC_PASS}"
zmqpubrawtx = "tcp://bitcoin-node.internal:28332"
zmqpubrawblock = "tcp://bitcoin-node.internal:28333"

[lightning.LND]
host = "lnd-node.internal"
port = 10009
macaroon = "/secrets/admin.macaroon"
certificate = "/secrets/tls.cert"

[api]
host = "0.0.0.0"
port = 9001
```

## Further Reading

- **API Reference**: `testing/api-reference.md`
- **Architecture**: `system/architecture.md`
- **Integration with Ark**: `system/integration-with-arkd.md`
- **Official Docs**: https://docs.boltz.exchange/
