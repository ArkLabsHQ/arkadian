# Deployment Guide

## Production Deployment Checklist

Before deploying to production:

- [ ] Choose deployment method (Docker recommended)
- [ ] Configure secure credentials
- [ ] Set up reverse proxy (nginx/caddy)
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Plan backup strategy
- [ ] Document recovery procedures

## Docker Production Deployment

### 1. Build Production Image

```bash
docker build -t arkfaucet:latest .
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  arkfaucet:
    image: arkfaucet:latest
    container_name: arkfaucet
    restart: unless-stopped
    ports:
      - "127.0.0.1:9999:9999"  # Bind to localhost only
    environment:
      - ARK_FAUCET_PASSWORD=${ARK_FAUCET_PASSWORD}
      - ARK_FAUCET_SERVER_URL=${ARK_FAUCET_SERVER_URL}
      - ARK_FAUCET_AUTH_USER=${ARK_FAUCET_AUTH_USER}
      - ARK_FAUCET_AUTH_PASS=${ARK_FAUCET_AUTH_PASS}
      - ARK_FAUCET_PORT=9999
    volumes:
      - wallet_data:/app/faucetdata
      - arkd_data:/root/.arkd:ro  # Read-only for security
    networks:
      - ark_network

volumes:
  wallet_data:
    driver: local
  arkd_data:
    external: true  # Mount existing arkd data

networks:
  ark_network:
    external: true
```

### 3. Configure Environment Variables

Create `.env` file:

```bash
# CRITICAL: Use strong credentials
ARK_FAUCET_PASSWORD=<strong-random-password>
ARK_FAUCET_AUTH_USER=<admin-username>
ARK_FAUCET_AUTH_PASS=<strong-admin-password>

# Production arkd server
ARK_FAUCET_SERVER_URL=https://ark.example.com:7070
```

Generate strong passwords:
```bash
openssl rand -base64 32
```

### 4. Mount Volumes

**Wallet data (persistent):**
- Must survive container restarts
- Backup regularly
- Contains wallet keys

**arkd data (read-only):**
- For accessing admin macaroons
- Read-only mount for security
- Required for /refill endpoint

### 5. Start Service

```bash
docker-compose up -d
```

### 6. Verify Deployment

```bash
# Check logs
docker-compose logs -f arkfaucet

# Test health
curl http://localhost:9999/address

# Verify balance endpoint (requires auth)
curl -u admin:strongpass http://localhost:9999/balance
```

## Reverse Proxy Setup (nginx)

### HTTPS Termination

Create `/etc/nginx/sites-available/arkfaucet`:

```nginx
upstream arkfaucet {
    server 127.0.0.1:9999;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=faucet_public:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=faucet_admin:10m rate=60r/m;

server {
    listen 443 ssl http2;
    server_name faucet.example.com;

    ssl_certificate /etc/letsencrypt/live/faucet.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/faucet.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Public faucet endpoint - strict rate limiting
    location /faucet {
        limit_req zone=faucet_public burst=2 nodelay;
        proxy_pass http://arkfaucet;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Public address endpoint
    location /address {
        limit_req zone=faucet_admin burst=5 nodelay;
        proxy_pass http://arkfaucet;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Admin endpoints - moderate rate limiting
    location ~ ^/(balance|refill|refill-with-notes)$ {
        limit_req zone=faucet_admin burst=10 nodelay;
        proxy_pass http://arkfaucet;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Block all other paths
    location / {
        return 404;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name faucet.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Enable and Reload

```bash
sudo ln -s /etc/nginx/sites-available/arkfaucet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Initial Balance Setup

### Option 1: Initialize with Notes

Set notes in environment before first start:

```bash
export ARK_FAUCET_NOTES="note1,note2,note3"
docker-compose up -d
```

Notes are redeemed automatically on startup.

### Option 2: Refill After Start

1. Start with empty balance:
   ```bash
   docker-compose up -d
   ```

2. Use refill endpoint:
   ```bash
   curl -u admin:strongpass -X POST \
     "https://faucet.example.com/refill?amount=100000"
   ```

Requires arkd admin access via mounted datadir.

## Upgrading to go-sdk v0.10

The v0.10 faucet migrates the wallet from single-key to HD (BIP-39 mnemonic). **A datadir created before v0.10 cannot be loaded or migrated** — plan the upgrade as a fresh-wallet deploy:

1. Deploy with a **new, empty** `ARK_FAUCET_DATADIR` (the old volume is not reusable).
2. The faucet generates a **new address** on first start — publish it / update downstream consumers.
3. Refund the new wallet via `ARK_FAUCET_NOTES` at startup or the `/refill` endpoint after start.

The faucet also refreshes its cached checkpoint tapscript from arkd's `GetInfo` on every start, so **redeploying/restarting recovers** from an operator signer/forfeit-key rotation (which would otherwise fail offchain `/faucet` sends with `CHECKPOINT_MISMATCH`).

## Security Hardening

### Change Default Credentials

Never use default `admin:admin` in production:

```bash
# Generate strong credentials
export ARK_FAUCET_AUTH_USER=faucet_admin_$(openssl rand -hex 4)
export ARK_FAUCET_AUTH_PASS=$(openssl rand -base64 32)
export ARK_FAUCET_PASSWORD=$(openssl rand -base64 32)
```

### Use Environment Secrets

Don't commit credentials to version control:

```bash
# Store in Docker secrets or vault
docker secret create faucet_password faucet_pass.txt
```

### Restrict arkd Data Directory Access

```bash
# Read-only mount in docker-compose.yml
volumes:
  - arkd_data:/root/.arkd:ro

# Filesystem permissions
chmod 600 /path/to/arkd/macaroons/admin.macaroon
```

### Enable HTTPS Only

- Use TLS certificates (Let's Encrypt)
- Redirect HTTP to HTTPS
- Use modern TLS protocols (1.2+)
- Strong cipher suites

### Monitor Logs

```bash
# Enable structured logging
docker-compose logs -f arkfaucet | grep -i error

# Set up log aggregation
# Forward to syslog, ELK stack, or cloud logging
```

## Backup and Recovery

### Backup Wallet Datadir

```bash
# Automated daily backup
0 2 * * * docker run --rm \
  -v arkfaucet_wallet_data:/data \
  -v /backup:/backup \
  alpine tar czf /backup/wallet-$(date +\%Y\%m\%d).tar.gz /data
```

### Document Credentials Securely

Store in password manager:
- ARK_FAUCET_PASSWORD
- ARK_FAUCET_AUTH_USER
- ARK_FAUCET_AUTH_PASS
- Recovery notes (if applicable)

### Recovery Procedure

1. Restore wallet volume from backup:
   ```bash
   docker volume create arkfaucet_wallet_data
   tar xzf wallet-backup.tar.gz -C /var/lib/docker/volumes/arkfaucet_wallet_data/_data
   ```

2. Use same password to unlock:
   ```bash
   export ARK_FAUCET_PASSWORD=<original-password>
   docker-compose up -d
   ```

3. Verify balance restored:
   ```bash
   curl -u admin:pass https://faucet.example.com/balance
   ```

## Monitoring

### Health Check Endpoint

```bash
# Monitor /address endpoint
*/5 * * * * curl -f https://faucet.example.com/address || alert
```

### Balance Monitoring

```bash
# Check balance every hour
0 * * * * curl -u admin:pass https://faucet.example.com/balance | \
  jq '.offchain_balance.total' | \
  awk '$1 < 10000 { system("send_alert low_balance") }'
```

### Alert on Low Balance

Set up alerting when balance drops below threshold:

```bash
# Alert if offchain balance < 10,000 sats
THRESHOLD=10000
BALANCE=$(curl -s -u admin:pass https://faucet.example.com/balance | jq '.offchain_balance.total')

if [ "$BALANCE" -lt "$THRESHOLD" ]; then
  # Send alert via email, Slack, PagerDuty, etc.
  echo "Low balance: $BALANCE sats" | mail -s "Faucet Alert" admin@example.com
fi
```

### Recommended Alerts

- Service down (health check fails)
- Balance below threshold
- High error rate in logs
- Unusual request patterns
- Failed refill attempts
