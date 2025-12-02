# Fulmine Simulator - Troubleshooting

## Common Issues

### Build Errors

#### "go: command not found"

**Problem**: Go is not installed or not in PATH.

**Solution**:
```bash
# Install Go (macOS)
brew install go

# Or download from https://go.dev/dl/

# Verify installation
go version
```

#### "package not found"

**Problem**: Dependencies not downloaded.

**Solution**:
```bash
make deps
# or
go mod download
go mod tidy
```

### Runtime Errors

#### "connection refused" to Fulmine

**Problem**: Fulmine is not running or wrong port.

**Solution**:
```bash
# Check if Fulmine is running
curl http://localhost:7001/health

# Start Fulmine
cd /path/to/fulmine && make run-regtest

# Verify port in config matches
grep fulmine_url config.yaml
```

#### "faucet request failed"

**Problem**: Nigiri faucet not available.

**Solution**:
```bash
# Check Nigiri status
nigiri status

# Restart Nigiri
nigiri stop && nigiri start

# Verify faucet
curl http://localhost:3000/faucet
```

#### "insufficient funds"

**Problem**: Client doesn't have enough funds.

**Solution**:
1. Increase `initial_funding_sats` in config
2. Ensure faucet has funds (regtest)
3. For mainnet, pre-fund the orchestrator wallet

### Client Issues

#### "client process exited unexpectedly"

**Problem**: Client crashed or was killed.

**Solution**:
```bash
# Check client logs
cat orchestrator-run.log

# Clean up stale processes
make clean-processes

# Check Docker containers
docker ps -a | grep lnd-client
```

#### "LND container failed to start"

**Problem**: Docker issues with LND containers.

**Solution**:
```bash
# Remove stale containers
docker ps -a | grep lnd-client | awk '{print $1}' | xargs docker rm -f

# Check Docker status
docker info

# Restart Docker daemon if needed
```

### Configuration Errors

#### "invalid config: schema validation failed"

**Problem**: YAML doesn't match expected schema.

**Solution**:
1. Check YAML syntax
2. Verify required fields exist
3. Check field types (string vs number)

```yaml
# Correct
version: "1.0"     # String, not number
network: "regtest" # Valid: regtest, mutinynet, mainnet
clients:
  - id: "client_0"           # Required
    initial_funding_sats: 100000  # Number, not string
```

#### "unknown action type"

**Problem**: Action type not recognized.

**Solution**: Use valid action types:
- `wait`
- `swap`
- `reverse_swap`
- `assert_balance`

### Fund Recovery Issues

#### "fund recovery failed: expected X, got Y"

**Problem**: Not all funds were recovered.

**Causes**:
- Swap fees deducted
- Transaction stuck
- Client crashed during swap

**Solution**:
1. Check audit logs for fund movements
2. Verify swap status in Fulmine
3. Use emergency recovery tools

```bash
# Check audit log
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "fund_collected")'

# Manual recovery (if needed)
./bin/orchestrator --config config.yaml --recover-only
```

### Network Issues

#### "network mismatch"

**Problem**: Config network doesn't match connected services.

**Solution**:
```bash
# Verify Nigiri network
nigiri status

# Check Fulmine network
curl http://localhost:7001/info | jq .network

# Ensure config matches
grep network config.yaml
```

## Debugging

### Enable Verbose Logging

```bash
./bin/orchestrator --config config.yaml --verbose
```

### Check Audit Logs

```bash
# All events
cat audit_logs/simulation_*.jsonl | jq

# Fund movements only
cat audit_logs/*.jsonl | jq 'select(.event | startswith("fund_"))'

# Errors only
cat audit_logs/*.jsonl | jq 'select(.level == "error")'
```

### Docker Logs

```bash
# LND client logs
docker logs lnd-client-0

# All simulator containers
docker logs $(docker ps -q --filter "name=lnd-client")
```

## Getting Help

1. Check the [README](https://github.com/ark-network/fulmine-simulator)
2. Review [specification](specs/001-fulmine-simulator/spec.md)
3. Open an issue on GitHub

## Emergency Recovery

If simulation fails with funds locked:

```bash
# 1. Stop all processes
make clean-processes

# 2. Check fund locations
cat audit_logs/latest.jsonl | jq 'select(.event == "fund_distributed")'

# 3. Manual recovery
./bin/orchestrator --config config.yaml --emergency-recover
```
