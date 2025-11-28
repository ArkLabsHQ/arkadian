# Fulmine Simulator — Troubleshooting

## Common Issues and Solutions

### 1. Orchestrator Cannot Connect to Nigiri Faucet

**Symptoms:**
```
[ERROR] Failed to distribute funds: connection refused to localhost:3000
```

**Causes:**
- Nigiri container not running
- Nigiri faucet API not accessible
- Firewall blocking port 3000

**Solutions:**
```bash
# Check if Nigiri is running
docker ps | grep nigiri

# Start Nigiri if not running
docker run -d --name nigiri -p 3000:3000 vulpemventures/nigiri

# Test faucet connectivity
curl http://localhost:3000/faucet

# Check Docker logs
docker logs nigiri
```

### 2. Clients Cannot Connect to Fulmine

**Symptoms:**
```
[ERROR] Client failed to connect to Fulmine: rpc error: code = Unavailable
```

**Causes:**
- Fulmine container not running
- gRPC port 7000 not exposed
- Fulmine not accepting connections

**Solutions:**
```bash
# Check if Fulmine is running
docker ps | grep fulmine

# Start Fulmine if not running
docker run -d --name fulmine -p 7000:7000 -p 7001:7001 ghcr.io/arklabshq/fulmine:latest

# Test gRPC connectivity
grpcurl -plaintext localhost:7000 list

# Check Fulmine logs
docker logs fulmine

# Test Web UI (HTTP)
curl http://localhost:7001
```

### 3. Fund Recovery Not 100%

**Symptoms:**
```
[ERROR] Fund recovery failed: recovered 450000/500000 sats (90.00%)
```

**Causes:**
- Client crashed before returning funds
- Transaction fees consumed funds
- Client sent funds to wrong address

**Solutions:**
```bash
# Check audit log for missing funds
cat audit_logs/simulation_*.jsonl | jq 'select(.event | contains("fund"))'

# Identify which clients didn't return funds
cat audit_logs/simulation_*.jsonl | jq 'select(.event == "fund_collected") | .client_id'

# Check if client processes are still running
ps aux | grep "bin/client"

# Manual recovery: Check client wallet balances
# (Requires direct access to Fulmine wallets)

# Adjust config to account for transaction fees
# Add buffer to initial_funding_sats
```

### 4. Configuration Validation Errors

**Symptoms:**
```
[ERROR] Configuration validation failed: invalid network value
```

**Causes:**
- Typo in network name
- Missing required fields
- Invalid YAML syntax

**Solutions:**
```bash
# Validate YAML syntax
yamllint configs/my-config.yaml

# Check for common issues:
# - Network must be: regtest, mutinynet, or mainnet
# - Client IDs must be unique
# - Round numbers must be sequential starting from 1

# Use dry-run to validate without executing
./bin/orchestrator --config configs/my-config.yaml --dry-run

# Example valid configuration:
cat > valid-config.yaml <<EOF
version: "1.0"
network: "regtest"
clients:
  - id: "client_0"
    initial_funding_sats: 100000
rounds:
  - number: 1
    description: "Test round"
    actions:
      client_0:
        - type: "wait"
          duration_seconds: 5
EOF
```

### 5. Docker Containers Conflict with Existing Processes

**Symptoms:**
```
[ERROR] Bind for 0.0.0.0:7000 failed: port is already allocated
```

**Causes:**
- Another container or process using the same port
- Previous simulation didn't clean up properly

**Solutions:**
```bash
# Check which process is using the port
lsof -i :7000
lsof -i :7001
lsof -i :3000

# Kill conflicting processes
make clean-processes

# Or manually:
pkill -f lnd-daemon
docker rm -f $(docker ps -aq --filter "name=lnd-client")
docker rm -f $(docker ps -aq --filter "name=fulmine")
docker rm -f $(docker ps -aq --filter "name=nigiri")

# Start with clean slate
docker system prune -f
```

### 6. Client Processes Hang or Timeout

**Symptoms:**
```
[WARN] Client client_0 not responding after 60s
```

**Causes:**
- Fulmine overloaded or unresponsive
- Network issues
- Client waiting for blockchain confirmations

**Solutions:**
```bash
# Check client logs (if available)
cat audit_logs/simulation_*.jsonl | jq 'select(.client_id == "client_0")'

# Check Fulmine resource usage
docker stats fulmine

# Reduce number of concurrent clients
# Edit config: fewer clients or staggered rounds

# Increase wait durations in config
# Give more time for blockchain confirmations

# Check Fulmine logs for errors
docker logs fulmine | tail -50
```

### 7. Mainnet Safety Prompt Not Appearing

**Symptoms:**
- Orchestrator proceeds without confirmation prompt on mainnet config

**Causes:**
- Configuration network field incorrect
- Orchestrator safety check bypassed (bug)

**Solutions:**
```bash
# Verify network in config
grep "network:" configs/my-mainnet-config.yaml

# Expected output: network: "mainnet"

# Always test mainnet configs with dry-run first
./bin/orchestrator --config configs/mainnet.yaml --dry-run

# Manually verify prompt appears:
./bin/orchestrator --config configs/mainnet.yaml
# Should see: "⚠️  WARNING: This simulation will use MAINNET"

# Never use mainnet without understanding risks
```

### 8. Build Errors

**Symptoms:**
```
go: module github.com/ark-network/fulmine-simulator: git ls-remote failed
```

**Causes:**
- Missing dependencies
- Network issues
- Outdated Go version

**Solutions:**
```bash
# Check Go version
go version
# Should be 1.24.6 or higher

# Update dependencies
go mod download
go mod tidy

# Clear module cache and rebuild
go clean -modcache
go mod download
make build

# If still failing, try manual build:
cd cmd/orchestrator
go build -o ../../bin/orchestrator
```

## Debugging Tips

### Enable Debug Logging
```bash
# Set log level to debug
export FULMINE_LOG_LEVEL=debug
./bin/orchestrator --config configs/regtest-5-clients.yaml

# Or pass via command line
./bin/orchestrator --config configs/regtest-5-clients.yaml --log-level debug
```

### View Real-Time Audit Log
```bash
# In separate terminal, watch audit log
tail -f audit_logs/simulation_*.jsonl | jq
```

### Check Process Status
```bash
# Check running client processes
ps aux | grep "bin/client"

# Check Docker containers
docker ps

# Check ports in use
netstat -an | grep LISTEN | grep -E "7000|7001|3000"
```

### Analyze Audit Log
```bash
# Count events by type
cat audit_logs/simulation_*.jsonl | jq -r '.event' | sort | uniq -c

# Find errors
cat audit_logs/simulation_*.jsonl | jq 'select(.level == "error")'

# Track specific client
cat audit_logs/simulation_*.jsonl | jq 'select(.client_id == "client_0")'

# Fund movement summary
cat audit_logs/simulation_*.jsonl | jq 'select(.event | contains("fund")) | {event, client_id, amount_sats}'
```

## Performance Issues

### Slow Simulation Execution

**Symptoms:**
- Simulation takes much longer than expected
- High CPU/memory usage

**Solutions:**
```bash
# Reduce number of clients
# Edit config: fewer clients

# Stagger client start times
# Add delays between client spawns

# Monitor system resources
htop
docker stats

# Increase orchestrator timeout values
# (Requires code change in orchestrator/config.go)
```

### Docker Resource Limits

**Symptoms:**
- Containers crashing
- Out-of-memory errors

**Solutions:**
```bash
# Check Docker resource limits
docker system info | grep -A10 "Memory"

# Increase Docker memory allocation (Docker Desktop)
# Settings → Resources → Memory → Increase

# Or run containers with explicit limits:
docker run -d \
  --name fulmine \
  --memory="2g" \
  --cpus="2" \
  -p 7000:7000 -p 7001:7001 \
  ghcr.io/arklabshq/fulmine:latest
```

## Getting Help

### Check Logs
```bash
# Orchestrator logs (stdout)
./bin/orchestrator --config configs/regtest-5-clients.yaml 2>&1 | tee orchestrator.log

# Client logs (via audit log)
cat audit_logs/simulation_*.jsonl | jq 'select(.level == "error")'

# Docker logs
docker logs fulmine
docker logs nigiri
```

### Gather Debug Information
```bash
# System info
uname -a
go version
docker version

# Process status
ps aux | grep -E "orchestrator|client|fulmine|nigiri"

# Network connectivity
curl http://localhost:3000/faucet
curl http://localhost:7001
grpcurl -plaintext localhost:7000 list

# Audit log summary
cat audit_logs/simulation_*.jsonl | jq -r '.event' | sort | uniq -c
```

### File an Issue
When reporting issues, include:
1. Orchestrator command used
2. Configuration file (sanitized)
3. Orchestrator logs
4. Audit log excerpt
5. System information (OS, Go version, Docker version)
6. Steps to reproduce

## Known Limitations

### Current Implementation Gaps
1. **Swap Execution**: Phase 4 (swap logic) in progress, not fully functional yet
2. **Mainnet Safety**: Phase 6 (safety features) not fully implemented
3. **Monitoring**: Phase 7 (real-time monitoring) not implemented
4. **Error Recovery**: Limited automatic recovery from partial failures

### Workarounds
- Use regtest for development until swap execution complete
- Manually test mainnet scenarios with small amounts
- Monitor via audit logs until real-time dashboard available
- Manual fund recovery if orchestrator crashes

### Planned Improvements
See README.md Development Status section for roadmap.
