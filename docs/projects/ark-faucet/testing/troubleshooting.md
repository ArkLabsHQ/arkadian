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
# Add debug output (if supported)
export LOG_LEVEL=debug
make run

# Docker logs
docker logs -f arkfaucet
docker logs --tail 100 arkfaucet
```

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
