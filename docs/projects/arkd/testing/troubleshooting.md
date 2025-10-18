# Troubleshooting Guide

Common issues and solutions for arkd development and testing.

## Setup Issues

### NBXplorer Connection Failed

**Symptoms**:
- arkd-wallet fails to start
- Error: "connection refused" or "cannot connect to NBXplorer"

**Solutions**:
```bash
# Check NBXplorer is running
docker ps | grep nbxplorer

# View NBXplorer logs
docker logs nbxplorer

# Verify NBXplorer URL
curl http://localhost:32838/v1/health

# Restart NBXplorer
docker restart nbxplorer
docker restart pgnbxplorer
```

### Bitcoin Node Not Responding

**Symptoms**:
- Esplora/Chopsticks errors
- Cannot generate blocks
- Transactions not confirming

**Solutions**:
```bash
# Check Nigiri status
nigiri status

# Restart Nigiri
nigiri stop
nigiri start

# Check Bitcoin RPC
nigiri rpc getblockchaininfo

# Verify Esplora
curl http://localhost:3000/api/blocks/tip/height
```

### Port Already in Use

**Symptoms**:
- Error: "bind: address already in use"
- Ports 6060, 7070, 5432, or 6379 conflicts

**Solutions**:
```bash
# Find process using port
lsof -i :7070
lsof -i :6060

# Kill process
kill -9 <PID>

# Or use different ports
export ARKD_PORT=7071
export ARKD_WALLET_PORT=6061
```

### Database Connection Errors

**PostgreSQL issues**:
```bash
# Check if running
docker ps | grep ark-pg

# Restart
make droppg
make pg

# Reset for tests
make droppgtest
make pgtest
```

**Redis issues**:
```bash
# Check Redis
docker ps | grep ark-redis

# Restart Redis
docker stop ark-redis
docker rm ark-redis
docker run --name ark-redis -d -p 6379:6379 redis:7-alpine
```

## Test Failures

### Tests Hang or Timeout

**Symptoms**:
- Tests never complete
- Timeout after 600s or 1200s

**Solutions**:
```bash
# Check Docker containers are running
docker ps

# Verify Nigiri is up
nigiri status

# Increase timeout
go test -timeout 1200s ...

# Check for deadlocks in logs
docker logs arkd --tail 100
```

### Connection Refused Errors

**Symptoms**:
- Tests fail with "connection refused"
- Cannot connect to arkd or arkd-wallet

**Solutions**:
```bash
# Ensure services are running
docker ps

# Check arkd is on port 7070
curl http://localhost:7070/v1/info

# Check arkd-wallet is on port 6060
curl http://localhost:6060/v1/wallet/status

# Wait longer after docker-run
make docker-run
sleep 30  # Give services time to initialize
```

### Insufficient Funds

**Symptoms**:
- Tests fail with "insufficient balance"
- Cannot create transactions

**Solutions**:
```bash
# Fund server wallet manually
ADDR=$(docker exec arkd ark wallet address)
nigiri faucet $ADDR 1.0

# Generate blocks to confirm
nigiri rpc --generate 6

# Check balance
docker exec arkd ark wallet balance
```

### State Inconsistencies

**Symptoms**:
- Tests pass individually but fail in sequence
- Stale VTXOs or rounds

**Solutions**:
```bash
# Complete environment reset
make docker-stop
docker volume prune -f
nigiri stop
nigiri start

# Restart fresh
make docker-run
sleep 30
make integrationtest
```

## Runtime Issues

### Wallet Locked

**Symptoms**:
- Operations fail with "wallet is locked"

**Solutions**:
```bash
# Unlock wallet
arkd wallet unlock --password <password>

# Or via API
curl -X POST http://localhost:7070/v1/admin/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"<password>"}'
```

### Round Not Starting

**Symptoms**:
- Transactions pending indefinitely
- No round execution

**Solutions**:
```bash
# Check round configuration
# In docker-compose.regtest.yml:
ARKD_ROUND_INTERVAL=10  # Shorter interval
ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1

# View arkd logs for round events
docker logs arkd -f | grep -i round

# Generate blocks to trigger block-based scheduler
nigiri rpc --generate 1
```

### Signer Not Loaded

**Symptoms**:
- Error: "signer not configured"
- arkd fails to start after unlock

**Solutions**:
```bash
# Option 1: Load via environment (before starting)
export ARKD_WALLET_SIGNER_KEY=<private-key>
make run-wallet

# Option 2: Load via API (after starting)
arkd signer load --signer-prvkey <private-key>

# Option 3: Use wallet as signer
arkd signer load --signer-url localhost:6060
```

### Memory Issues

**Symptoms**:
- Container OOM killed
- High memory usage during simulations

**Solutions**:
```bash
# Reduce simulation size
make run-simulation CLIENTS=5  # Instead of 50

# Increase Docker memory
# Docker Desktop ’ Settings ’ Resources ’ Memory

# Monitor memory during tests
docker stats
```

## Development Issues

### sqlc Generation Fails

**Symptoms**:
- `make pgsqlc` or `make sqlc` errors

**Solutions**:
```bash
# For PostgreSQL
docker run --rm -v ./internal/infrastructure/db/postgres:/src \
  -w /src sqlc/sqlc generate

# For SQLite
docker run --rm -v ./internal/infrastructure/db/sqlite:/src \
  -w /src sqlc/sqlc generate

# Check SQL syntax in query.sql files
```

### Protocol Buffer Compilation Fails

**Symptoms**:
- `make proto` fails
- Generated files out of date

**Solutions**:
```bash
# Rebuild buf Docker image
docker build -f buf.Dockerfile -t buf .

# Run proto generation
make proto

# Check proto syntax
make proto-lint
```

### Migration Failures

**Symptoms**:
- Cannot apply migrations
- Database schema mismatch

**Solutions**:
```bash
# For PostgreSQL
make droppg
make pg
# Restart arkd to auto-migrate

# For SQLite
rm -rf ~/.arkd/  # Or ARKD_DATADIR location
# Restart arkd

# Create new migration
make pgmigrate FILE=fix_schema
```

## Docker Issues

### Container Won't Start

**Symptoms**:
- `docker-compose up` fails
- Container exits immediately

**Solutions**:
```bash
# View detailed logs
docker logs arkd
docker logs arkd-wallet

# Rebuild containers
docker-compose -f docker-compose.regtest.yml build --no-cache
docker-compose -f docker-compose.regtest.yml up -d

# Check Nigiri network exists
docker network ls | grep nigiri
# If missing: nigiri start
```

### Volume Permission Issues

**Symptoms**:
- Permission denied in containers
- Cannot write to data directory

**Solutions**:
```bash
# Use tmpfs volumes (already configured in docker-compose.regtest.yml)
# Or fix permissions
sudo chmod -R 777 /var/lib/docker/volumes/

# Check Docker volume
docker volume inspect <volume-name>
```

## Logging and Debugging

### Enable Verbose Logging

```bash
# Maximum arkd logging
export ARKD_LOG_LEVEL=6  # 0=panic, 6=trace

# In docker-compose.regtest.yml
ARKD_LOG_LEVEL: 6

# For tests
ARKD_LOG_LEVEL=6 go test -v -run TestName
```

### Capture Logs for Analysis

```bash
# Save arkd logs
docker logs arkd > arkd.log 2>&1

# Save arkd-wallet logs
docker logs arkd-wallet > wallet.log 2>&1

# Follow logs in real-time
docker logs arkd -f | tee arkd.log
```

### Check Service Health

```bash
# arkd health
curl http://localhost:7070/v1/info

# arkd-wallet health
curl http://localhost:6060/v1/wallet/status

# NBXplorer health
curl http://localhost:32838/v1/health

# Bitcoin node (via Nigiri)
nigiri rpc getnetworkinfo
```

## Performance Issues

### Slow Test Execution

**Cause**: Docker overhead, slow I/O

**Solutions**:
- Use tmpfs volumes (already in docker-compose.regtest.yml)
- Run smaller simulation tests
- Use `-short` flag: `go test -short`

### High CPU Usage

**Cause**: Round processing, tree generation

**Solutions**:
- Reduce `ARKD_ROUND_MAX_PARTICIPANTS_COUNT`
- Increase `ARKD_ROUND_INTERVAL`
- Monitor with: `docker stats`

## Getting Help

If issues persist:

1. **Check documentation**: See `CLAUDE.md` and `README.md`
2. **Search issues**: [GitHub Issues](https://github.com/arkade-os/arkd/issues)
3. **View E2E test docs**: `test/e2e/E2E_TESTING_OVERVIEW.md`
4. **File new issue**: Include logs, environment, and reproduction steps

## See Also

- [Usage Guide](./usage.md) - Common operations
- [How to Run](./how_to_run.md) - Setup instructions
- [How to Test](./how_to_test.md) - Testing procedures
