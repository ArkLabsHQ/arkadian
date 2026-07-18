# ARK Faucet Troubleshooting Guide

## Common Issues

### Connection Refused
**Symptom:** Cannot connect to faucet service at `http://localhost:9999`

**Possible Causes:**
1. Service not running
2. Port 9999 already in use
3. Firewall blocking connections

**Solutions:**
```bash
# Check if service is running
ps aux | grep arkfaucet
docker ps | grep arkfaucet

# Check if port is in use
lsof -i :9999
netstat -an | grep 9999

# Try different port
export ARK_FAUCET_PORT=9998
make run

# Check firewall (macOS)
sudo pfctl -sr | grep 9999

# Check firewall (Linux)
sudo iptables -L -n | grep 9999
```

---

### Failed to Connect to ARK Server
**Symptom:** Error message: `Failed to connect to ark server`

**Possible Causes:**
1. arkd server not running
2. Incorrect `ARK_FAUCET_SERVER_URL`
3. Network connectivity issues

**Solutions:**
```bash
# Verify arkd is running
curl http://localhost:7070/v1/info

# Check configured URL
echo $ARK_FAUCET_SERVER_URL

# Test connectivity
ping ark-hostname
telnet localhost 7070

# For Docker, check network
docker network inspect nigiri
docker exec arkfaucet ping ark

# Update server URL
export ARK_FAUCET_SERVER_URL=http://localhost:7070
```

---

### Invalid Password
**Symptom:** Service fails to start with password error

**Possible Causes:**
1. `ARK_FAUCET_PASSWORD` not set
2. Empty password value
3. Special characters in password

**Solutions:**
```bash
# Check if password is set
echo $ARK_FAUCET_PASSWORD

# Set password
export ARK_FAUCET_PASSWORD=admin

# For special characters, use quotes
export ARK_FAUCET_PASSWORD='p@ssw0rd!'

# For Docker
docker run -e ARK_FAUCET_PASSWORD='p@ssw0rd!' ...
```

---

### Unauthorized on Admin Endpoints
**Symptom:** 401 Unauthorized when accessing `/balance`, `/refill`

**Possible Causes:**
1. Wrong username or password
2. Missing Authorization header
3. Incorrect credential format

**Solutions:**
```bash
# Check configured credentials
echo $ARK_FAUCET_AUTH_USER
echo $ARK_FAUCET_AUTH_PASS

# Use correct format
curl -u admin:admin http://localhost:9999/balance

# Verify with verbose output
curl -v -u admin:admin http://localhost:9999/balance

# Update credentials
export ARK_FAUCET_AUTH_USER=myadmin
export ARK_FAUCET_AUTH_PASS=mypassword
```

---

### Insufficient Balance
**Symptom:** Error: `insufficient balance` when requesting coins

**Possible Causes:**
1. Faucet has no offchain balance
2. Requested amount exceeds available balance
3. Wallet not initialized

**Solutions:**
```bash
# Check current balance
curl -u admin:admin http://localhost:9999/balance

# Refill with notes (if available)
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["note1", "note2"]}'

# Auto-refill (if datadir configured)
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=10000"

# Initialize with notes on startup
export ARK_FAUCET_NOTES="note1,note2,note3"
make run
```

---

### Refill Fails / "missing vtxos" on /faucet
**Symptom:** `/refill` or `/refill-with-notes` fails, or a later `/faucet` request errors with `missing vtxos`. Logs may show `INTENT_INSUFFICIENT_FEE` from arkd.

**Possible Causes:**
1. arkd has intent fees enabled; a note redeem registers a fee-free intent that arkd rejects, so the wallet never gets funded
2. The faucet can't read/set arkd's intent fees (older arkd without `/v1/admin/intentFees`, or no admin access), so it can't zero them around the redeem

**Solutions:**
```bash
# The faucet auto-zeroes arkd's intent fees around the redeem and restores them
# after. If it can't reach the endpoint it logs a warning and redeems unguarded.
docker logs arkfaucet 2>&1 | grep -i "intent fees"

# Confirm the admin URL points at an arkd that exposes /v1/admin/intentFees
echo $ARK_FAUCET_SERVER_ADMIN_URL

# Verify the admin macaroon is reachable when arkd enforces it (see below)
ls -la $ARK_FAUCET_SERVER_DATADIR/macaroons/admin.macaroon
```

---

### Offchain /faucet Fails with CHECKPOINT_MISMATCH
**Symptom:** Offchain `/faucet` sends fail; arkd/logs report `CHECKPOINT_MISMATCH`.

**Possible Cause:** The operator rotated its signer/forfeit key, so arkd's checkpoint tapscript changed, but the faucet was still building checkpoint txs from the tapscript cached in its wallet at init.

**Solution:**
```bash
# On every Start the faucet re-fetches the operator's checkpoint tapscript from
# GetInfo and refreshes its cached config, so a redeploy/restart recovers.
docker restart arkfaucet
docker logs arkfaucet 2>&1 | grep -i "checkpoint tapscript"

# If arkd was unreachable at startup the refresh is skipped with a warning;
# confirm ARK_FAUCET_SERVER_URL points at a reachable arkd, then restart again.
```

---

### Wallet Fails to Load / "invalid mnemonic" After Upgrade
**Symptom:** After upgrading to the go-sdk v0.10 faucet, the service fails to load the existing wallet or reports `invalid mnemonic`.

**Possible Cause:** The wallet format changed from single-key (hex seed) to HD (BIP-39 mnemonic). A datadir created before v0.10 is not loadable by the new SDK.

**Solution:**
```bash
# Deploy with a FRESH datadir (the pre-v0.10 wallet cannot be migrated).
# The faucet generates a new address; refund it via /refill or ARK_FAUCET_NOTES.
export ARK_FAUCET_DATADIR=/data/faucet-v0.10   # new, empty directory
make run
```

---

### Refill Endpoint Not Available
**Symptom:** 404 error on `/refill` endpoint

**Possible Causes:**
1. `ARK_FAUCET_SERVER_DATADIR` not set
2. Macaroon file not accessible
3. Incorrect datadir path

**Solutions:**
```bash
# Check if datadir is set
echo $ARK_FAUCET_SERVER_DATADIR

# Set datadir path
export ARK_FAUCET_SERVER_DATADIR=~/.arkd

# Verify macaroon exists
ls -la ~/.arkd/macaroons/admin.macaroon

# For Docker, mount arkd datadir
docker run \
  -v /path/to/arkd-data:/root/.arkd:ro \
  -e ARK_FAUCET_SERVER_DATADIR=/root/.arkd \
  arkfaucet

# Use alternative: refill-with-notes endpoint
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["note1"]}'
```

---

### Failed to Read Macaroon
**Symptom:** Error: `failed to read macaroon file`

**Possible Causes:**
1. Macaroon file missing
2. Incorrect file permissions
3. Wrong datadir path

**Solutions:**
```bash
# Check macaroon location
ls -la $ARK_FAUCET_SERVER_DATADIR/macaroons/

# Verify file permissions
ls -la ~/.arkd/macaroons/admin.macaroon

# Fix permissions
chmod 644 ~/.arkd/macaroons/admin.macaroon

# For Docker, check mount
docker exec arkfaucet ls -la /root/.arkd/macaroons/

# Verify datadir path
export ARK_FAUCET_SERVER_DATADIR=/correct/path/to/arkd
```

---

## Debugging

### Enable Debug Logging
```bash
# Set logrus level (numeric; 4=info default, 5=debug)
export ARK_FAUCET_LOG_LEVEL=5
make run

# Docker logs
docker logs -f arkfaucet
docker logs --tail 100 arkfaucet
```

The service logs one line per request (method, path, status, latency) and every
error response server-side (5xx at error level, 4xx at warn), so failures are
visible in the logs even at the default info level.

### Verify Environment Variables
```bash
# Check all faucet environment variables
env | grep ARK_FAUCET

# For Docker
docker exec arkfaucet env | grep ARK_FAUCET
```

### Test ARK Server Connectivity
```bash
# Test arkd connection
curl http://localhost:7070/v1/info

# Check network latency
ping -c 5 localhost

# For Docker
docker exec arkfaucet curl http://ark:7070/v1/info
docker exec arkfaucet ping -c 5 ark
```

### Inspect Wallet Data Directory
```bash
# List wallet files
ls -la ~/.arkfaucet/

# Check disk space
df -h ~/.arkfaucet/

# For Docker
docker exec arkfaucet ls -la /app/faucetdata/
docker exec arkfaucet df -h
```

---

## Balance Issues

### Check Current Balance
```bash
curl -u admin:admin http://localhost:9999/balance
```

### Initialize with Notes
```bash
# On startup
export ARK_FAUCET_NOTES="note1,note2,note3"
make run

# After startup
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["note1", "note2"]}'
```

### Top Up Balance
```bash
# Auto-mint and redeem (requires datadir)
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=5000"

# Manual notes redemption
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["external-note-1", "external-note-2"]}'
```

### Verify Notes are Valid
```bash
# Notes should be unredeemed and properly formatted
# Format: ark1note...

# Check note validity via arkd
# (if you have access to arkd CLI tools)
```

---

## Docker Issues

### Container Not Starting
```bash
# Check logs
docker logs arkfaucet

# Inspect container
docker inspect arkfaucet

# Check for port conflicts
docker ps -a | grep 9999

# Remove and recreate
docker rm -f arkfaucet
make docker-run
```

### Volume Permission Issues
```bash
# Check volume permissions
ls -la ./data

# Fix permissions
sudo chown -R $(id -u):$(id -g) ./data

# For Docker, run with user
docker run --user $(id -u):$(id -g) ...
```

### Network Issues
```bash
# Check network exists
docker network ls | grep nigiri

# Create network if missing
docker network create nigiri

# Verify container is on network
docker network inspect nigiri

# Test connectivity between containers
docker exec arkfaucet ping ark
docker exec arkfaucet curl http://ark:7070/v1/info
```

---

## Authentication Issues

### Wrong Credentials
```bash
# Verify environment variables
echo $ARK_FAUCET_AUTH_USER
echo $ARK_FAUCET_AUTH_PASS

# Test with different credentials
curl -u newuser:newpass http://localhost:9999/balance

# Reset to defaults
unset ARK_FAUCET_AUTH_USER
unset ARK_FAUCET_AUTH_PASS
# Defaults: admin/admin
```

### Macaroon Not Found
```bash
# Check macaroon location
ls ~/.arkd/macaroons/admin.macaroon

# For Docker with volume mount
docker exec arkfaucet ls /root/.arkd/macaroons/admin.macaroon

# Verify mount is correct
docker inspect arkfaucet | grep -A 10 Mounts
```

### TLS Certificate Issues (HTTPS only)
```bash
# Check certificate location
ls ~/.arkd/tls/cert.pem

# Verify certificate validity
openssl x509 -in ~/.arkd/tls/cert.pem -text -noout

# For HTTP connections, certificate is not required
export ARK_FAUCET_SERVER_URL=http://localhost:7070
```

---

## Getting Help

### Before Requesting Support
Collect the following information:

1. **Version Information:**
```bash
git describe --tags
go version
docker --version
```

2. **Service Logs:**
```bash
# Last 100 lines
docker logs --tail 100 arkfaucet

# Or for local
# Capture stdout/stderr from make run
```

3. **Environment:**
```bash
env | grep ARK_FAUCET
uname -a
```

4. **Configuration:**
- Sanitized environment variables (redact passwords)
- arkd version and configuration
- Network setup (Docker, host, etc.)

### Report Issues
- **GitHub Issues:** https://github.com/ark-network/ark-faucet/issues
- Include logs and environment details (redact sensitive data)
- Provide steps to reproduce
- Mention expected vs actual behavior
