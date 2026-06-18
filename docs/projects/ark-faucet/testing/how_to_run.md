# How to Run ARK Faucet

## Prerequisites

### Local Development
- Go 1.21 or later
- A local Ark backend — either a running arkd instance, or the vendored [arkade-regtest](https://github.com/ArkLabsHQ/arkade-regtest) stack (git submodule at `regtest/`, requires Docker + Node)
- Git (for cloning the repository, with submodules)

### Docker Deployment
- Docker installed and running
- Running arkd instance
- Docker network configured (e.g., `nigiri` for local development)

## Local Development Setup

### 1. Clone Repository
```bash
git clone --recurse-submodules https://github.com/ArkLabsHQ/ark-faucet.git
cd ark-faucet
# if you forgot --recurse-submodules:
git submodule update --init
```

### 2. Configure Environment Variables
Set required environment variables:

```bash
# Required
export ARK_FAUCET_PASSWORD=your-secure-password

# Optional (with defaults)
export ARK_FAUCET_DATADIR=~/.arkfaucet
export ARK_FAUCET_PORT=9999
export ARK_FAUCET_SERVER_URL=http://localhost:7070
export ARK_FAUCET_SERVER_ADMIN_URL=http://localhost:7071  # arkd admin API (for /refill)
export ARK_FAUCET_AUTH_USER=admin
export ARK_FAUCET_AUTH_PASS=admin

# For refill endpoint (optional)
export ARK_FAUCET_SERVER_DATADIR=~/.arkd

# For initial balance (optional)
export ARK_FAUCET_NOTES="note1,note2,note3"
```

### 3. Build and Run
```bash
# Boot the local arkade-regtest stack first (Docker required)
make regtest-up

# Build binary
make build

# Or run directly against the regtest stack
make run

# When done, tear the stack down
make regtest-down
```

The service will start on `http://localhost:9999`. Use `make e2e` to boot the stack, run the e2e suite (`e2e/faucet_e2e_test.go`), and clean up automatically.

### 4. Test Endpoints
```bash
# Check service is running
curl http://localhost:9999/address

# Test faucet endpoint
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "test-address", "amount": 1000}'

# Verify admin access
curl -u admin:admin http://localhost:9999/balance
```

## Docker Deployment

> **Note:** The Makefile no longer provides `make docker-build` / `make docker-run` targets. CI (`.github/workflows/docker.yml`) builds and pushes a multi-arch image to `ghcr.io/arklabshq/ark-faucet`. Build locally with `docker build` or pull the published image.

### Option 1: Manual Docker Build and Run

#### Build Image
```bash
docker build -t arkfaucet .
```

#### Run Container
```bash
docker run -d \
  --name arkfaucet \
  --network nigiri \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=admin \
  -e ARK_FAUCET_SERVER_URL=http://ark:7070 \
  -e ARK_FAUCET_EXPLORER_URL=http://chopsticks:3000 \
  -v $(pwd)/data:/app/faucetdata \
  --volumes-from ark \
  arkfaucet
```

### Option 3: Custom Configuration
Run with custom environment variables:

```bash
docker run -d \
  --name arkfaucet \
  --network your-network \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=secure-password \
  -e ARK_FAUCET_SERVER_URL=http://your-arkd:7070 \
  -e ARK_FAUCET_AUTH_USER=myadmin \
  -e ARK_FAUCET_AUTH_PASS=mypassword \
  -e ARK_FAUCET_DATADIR=/app/faucetdata \
  -e ARK_FAUCET_SERVER_DATADIR=/root/.arkd \
  -v $(pwd)/faucet-data:/app/faucetdata \
  -v $(pwd)/arkd-data:/root/.arkd:ro \
  arkfaucet
```

**Volume Mounts Explained:**
- `/app/faucetdata`: Faucet wallet data (must be writable)
- `/root/.arkd`: arkd data directory (read-only, for refill endpoint)

## Production Deployment

### 1. Prepare Environment
```bash
# Create data directories
mkdir -p /var/lib/arkfaucet/data
mkdir -p /var/lib/arkfaucet/config

# Set permissions
chown -R 1000:1000 /var/lib/arkfaucet
```

### 2. Create Configuration File
Create `/var/lib/arkfaucet/config/.env`:

```bash
ARK_FAUCET_PASSWORD=your-very-secure-password
ARK_FAUCET_SERVER_URL=https://your-arkd.example.com:7070
ARK_FAUCET_AUTH_USER=faucet-admin
ARK_FAUCET_AUTH_PASS=admin-secure-password
ARK_FAUCET_DATADIR=/app/faucetdata
ARK_FAUCET_SERVER_DATADIR=/root/.arkd
```

### 3. Use Docker Compose
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  arkfaucet:
    image: arkfaucet:latest
    container_name: arkfaucet
    restart: unless-stopped
    networks:
      - ark-network
    ports:
      - "127.0.0.1:9999:9999"  # Bind to localhost only
    env_file:
      - /var/lib/arkfaucet/config/.env
    volumes:
      - /var/lib/arkfaucet/data:/app/faucetdata
      - /var/lib/arkd-data:/root/.arkd:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9999/address"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  ark-network:
    external: true
```

### 4. Configure Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name faucet.example.com;

    ssl_certificate /etc/letsencrypt/live/faucet.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/faucet.example.com/privkey.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=faucet_limit:10m rate=10r/h;

    location / {
        limit_req zone=faucet_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:9999;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin endpoints - IP whitelist
    location ~ ^/(balance|refill) {
        allow 192.168.1.0/24;  # Your admin network
        deny all;
        proxy_pass http://127.0.0.1:9999;
    }
}
```

### 5. Start Service
```bash
docker-compose up -d
docker-compose logs -f arkfaucet
```

### 6. Verify Deployment
```bash
# From local machine
curl https://faucet.example.com/address

# Test rate limiting
for i in {1..15}; do curl -X POST https://faucet.example.com/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "test", "amount": 100}'; done

# Test admin endpoint (from whitelisted IP)
curl -u faucet-admin:admin-secure-password https://faucet.example.com/balance
```

## Verification Steps

### 1. Check Service Health
```bash
# Should return addresses
curl http://localhost:9999/address
```

Expected output:
```json
{
  "onchain": "bc1q...",
  "offchain": "ark1..."
}
```

### 2. Test Faucet Functionality
```bash
# Request coins
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ark1qtest123...",
    "amount": 500
  }'
```

Expected output:
```json
{
  "txid": "transaction-hash"
}
```

### 3. Verify Admin Access
```bash
# Check balance
curl -u admin:admin http://localhost:9999/balance
```

Expected output:
```json
{
  "onchain": 0,
  "offchain": 50000
}
```

### 4. Test Refill Endpoint (if configured)
```bash
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=1000"
```

Expected output:
```json
{
  "txid": "transaction-hash"
}
```

## Monitoring and Maintenance

### View Logs
```bash
# Docker logs
docker logs -f arkfaucet

# Local development
# Logs printed to stdout
```

### Backup Wallet Data
```bash
# Docker deployment
docker exec arkfaucet tar czf /tmp/backup.tar.gz /app/faucetdata
docker cp arkfaucet:/tmp/backup.tar.gz ./faucet-backup-$(date +%Y%m%d).tar.gz

# Local deployment
tar czf faucet-backup-$(date +%Y%m%d).tar.gz ~/.arkfaucet/
```

### Update Service
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker build -t arkfaucet .
docker-compose down
docker-compose up -d
```
