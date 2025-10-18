# Fulmine Troubleshooting Guide

This guide helps diagnose and resolve common issues when running Fulmine.

## Common Issues

### Connection Refused on Port 7001

**Symptom**: Cannot access web UI or API at http://localhost:7001

**Causes and Solutions**:

1. **Fulmine not running**
   ```bash
   # Check if Fulmine is running
   docker ps | grep fulmine
   # Or for binary
   ps aux | grep fulmine
   ```

2. **Wrong port configuration**
   ```bash
   # Check environment variable
   echo $FULMINE_HTTP_PORT
   # Verify with correct port
   curl http://localhost:$FULMINE_HTTP_PORT/api/v1/wallet/status
   ```

3. **Port already in use**
   ```bash
   # Check what's using port 7001
   lsof -i :7001
   # Or on Linux
   netstat -tuln | grep 7001
   ```

   **Fix**: Stop the conflicting service or change Fulmine's port:
   ```bash
   export FULMINE_HTTP_PORT=7002
   ```

### Cannot Connect to Ark Server

**Symptom**: Errors like "connection refused" or "timeout" when trying to use Ark features

**Diagnosis**:
```bash
# Check configured Ark server
curl http://localhost:7001/api/v1/info

# Test Ark server directly
curl https://your-ark-server.com/info
```

**Solutions**:

1. **Verify FULMINE_ARK_SERVER is correct**
   ```bash
   export FULMINE_ARK_SERVER="https://correct-ark-server.com"
   ```

2. **Check network connectivity**
   ```bash
   ping your-ark-server.com
   curl -v https://your-ark-server.com
   ```

3. **For local testing, ensure arkd is running**
   ```bash
   docker logs arkd
   curl http://localhost:7070/info
   ```

### Esplora Timeout

**Symptom**: Operations fail with "esplora timeout" or blockchain data unavailable

**Diagnosis**:
```bash
# Check Esplora URL
echo $FULMINE_ESPLORA_URL

# Test Esplora API
curl $FULMINE_ESPLORA_URL/blocks/tip/height
```

**Solutions**:

1. **Verify Esplora URL is correct and accessible**
   ```bash
   # For mainnet
   export FULMINE_ESPLORA_URL="https://mempool.space/api"

   # For testnet
   export FULMINE_ESPLORA_URL="https://mempool.space/testnet/api"

   # For regtest (local)
   export FULMINE_ESPLORA_URL="http://localhost:3000"
   ```

2. **Check if Esplora service is running (local testing)**
   ```bash
   docker ps | grep chopsticks
   curl http://localhost:3000/blocks/tip/height
   ```

### Wallet Locked

**Symptom**: API returns "wallet locked" error

**Solution**: Unlock the wallet with your password:
```bash
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password": "YourStr0ng!Pass"}'
```

**For automatic unlock on startup**, use auto-unlock feature:
```bash
export FULMINE_UNLOCKER_TYPE=file
export FULMINE_UNLOCKER_FILE_PATH=/path/to/password.txt
```

### Invalid Password

**Symptom**: "invalid password" error when unlocking or creating wallet

**Causes**:

1. **Password doesn't meet requirements**
   - Minimum 8 characters
   - At least one number
   - At least one special character

   **Valid example**: `MyStr0ng!Pass`

2. **Incorrect password for existing wallet**
   - Verify you're using the correct password
   - Password is case-sensitive
   - Check for extra spaces or characters

3. **Wallet not initialized**
   ```bash
   # Check wallet status
   curl http://localhost:7001/api/v1/wallet/status
   ```

   If `initialized: false`, create a wallet first.

### Swap Failed

**Symptom**: Swap operations fail or timeout

**Diagnosis**:
```bash
# Check Boltz backend configuration
echo $FULMINE_BOLTZ_URL
echo $FULMINE_BOLTZ_WS_URL

# Test Boltz backend
curl $FULMINE_BOLTZ_URL/version
```

**Solutions**:

1. **Verify Boltz backend is running (for testing)**
   ```bash
   docker ps | grep boltz
   docker logs boltz
   ```

2. **Check Boltz configuration**
   ```bash
   export FULMINE_BOLTZ_URL="http://boltz-backend:9001"
   export FULMINE_BOLTZ_WS_URL="ws://boltz-backend:9004"
   ```

3. **Increase swap timeout**
   ```bash
   export FULMINE_SWAP_TIMEOUT=60  # seconds
   ```

4. **Check Lightning node connectivity** (if using own node)
   - Verify Lightning node is running
   - Check Lightning node has sufficient inbound/outbound capacity

## Docker Issues

### Volume Permissions

**Symptom**: Permission denied errors when reading/writing data

**Solution**:
```bash
# Check volume ownership
docker exec fulmine ls -la /app/data

# Fix permissions (if using bind mount)
sudo chown -R $(id -u):$(id -g) /path/to/data

# For named volumes, recreate with correct permissions
docker volume rm fulmine-data
docker volume create fulmine-data
```

### Port Conflicts

**Symptom**: Cannot start container due to port already in use

**Diagnosis**:
```bash
# Check what's using the port
docker ps | grep 7001
lsof -i :7001
```

**Solutions**:

1. **Stop conflicting container**
   ```bash
   docker stop <container_name>
   ```

2. **Use different ports**
   ```bash
   docker run -d \
     --name fulmine \
     -p 7002:7001 \  # Map host 7002 to container 7001
     -v fulmine-data:/app/data \
     ghcr.io/arklabshq/fulmine:latest
   ```

### Container Logs

**Access logs for debugging**:
```bash
# Real-time logs
docker logs -f fulmine

# Last 100 lines
docker logs --tail 100 fulmine

# Logs with timestamps
docker logs --timestamps fulmine

# Export logs to file
docker logs fulmine > fulmine.log 2>&1
```

## Binary Issues

### Data Directory Permissions

**Symptom**: Cannot read/write to data directory

**Solution**:
```bash
# Check current permissions
ls -la ~/.fulmine

# Fix permissions
chmod 700 ~/.fulmine
chmod 600 ~/.fulmine/wallet.db

# Or specify a different data directory
export FULMINE_DATADIR=/path/with/correct/permissions
```

### Missing Dependencies

**Symptom**: Binary fails to start with library errors

**Linux**:
```bash
# Install required libraries
sudo apt-get update
sudo apt-get install -y libc6 libstdc++6
```

**macOS**:
```bash
# Update Xcode command line tools
xcode-select --install
```

### Binary Not Executable

**Symptom**: Permission denied when running binary

**Solution**:
```bash
chmod +x fulmine
./fulmine
```

## Web UI Issues

### Clear Browser Cache

**Symptom**: UI not loading correctly or showing old version

**Solution**:
1. Hard refresh: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (macOS)
2. Clear browser cache for localhost:7001
3. Try incognito/private browsing mode

### Check Console for Errors

**Diagnosis**:
1. Open browser developer tools: `F12`
2. Check Console tab for JavaScript errors
3. Check Network tab for failed API requests

**Common fixes**:
- Verify API endpoint URLs are correct
- Check if CORS issues (should not occur for localhost)
- Ensure Fulmine backend is running

## Debugging

### Set Debug Log Level

Enable verbose debug logging:

```bash
export FULMINE_LOG_LEVEL=5
./fulmine
```

Log levels:
- `0`: Panic
- `1`: Fatal
- `2`: Error
- `3`: Warning
- `4`: Info (default)
- `5`: Debug

### Check Fulmine Logs

**Docker**:
```bash
docker logs fulmine
```

**Binary**:
Logs are written to stdout. Redirect to file:
```bash
./fulmine > fulmine.log 2>&1 &
tail -f fulmine.log
```

### Check Ark Server Logs

If using local Ark server for testing:
```bash
docker logs arkd
```

### Inspect Database

For advanced debugging, inspect the SQLite database:

```bash
# Find database location
ls $FULMINE_DATADIR/sqlite.db

# Open with sqlite3
sqlite3 $FULMINE_DATADIR/sqlite.db
.tables
.schema
SELECT * FROM vtxos;
.quit
```

## Swap Troubleshooting

### Check Boltz Status

```bash
# Check if Boltz backend is accessible
curl $FULMINE_BOLTZ_URL/version

# Check WebSocket connection
wscat -c $FULMINE_BOLTZ_WS_URL
```

### Verify Swap Address

```bash
# Get invoice
curl -X POST http://localhost:7001/api/v1/invoice \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'

# Check swap status via Boltz API
curl $FULMINE_BOLTZ_URL/swap/<swap_id>
```

### Check Timeout Settings

Increase timeout if swaps are failing due to timing:

```bash
export FULMINE_SWAP_TIMEOUT=60  # 60 seconds
```

## Network-Specific Issues

### Wrong Network

**Symptom**: Address format errors or cannot find transactions

**Solution**: Ensure all components use the same network:

```bash
# Check Fulmine network
curl http://localhost:7001/api/v1/info

# All should match: mainnet, testnet, or regtest
# FULMINE_ESPLORA_URL must match network
# FULMINE_ARK_SERVER must match network
```

### Regtest-Specific Issues

**For local testing**:
1. Ensure Nigiri or Bitcoin regtest is running
2. Generate blocks after transactions:
   ```bash
   nigiri rpc generatetoaddress 1 <address>
   ```
3. Check block height matches across services

## Getting Help

If issues persist after troubleshooting:

1. **Check existing issues**: Search [GitHub Issues](https://github.com/ArkLabsHQ/fulmine/issues)
2. **Gather information**:
   - Fulmine version: Check releases page
   - OS and architecture
   - Relevant log excerpts (with sensitive data redacted)
   - Steps to reproduce
3. **File a new issue** with gathered information
4. **Join community channels** for real-time help

### Information to Include

When reporting issues, provide:
- Fulmine version and platform
- Deployment method (Docker/binary)
- Configuration (environment variables, anonymized)
- Error messages and logs
- Steps to reproduce
- Expected vs actual behavior
