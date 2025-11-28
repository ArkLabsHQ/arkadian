# Deployment Guide

This guide covers production deployment of Fulmine using Docker, binary releases, and systemd service configuration.

## Prerequisites

- **Docker** 20.10+ (for containerized deployment)
- **Docker Compose** v2.0+ (optional, for orchestration)
- **Linux server** (Ubuntu 22.04 LTS recommended for production)
- **Network access** to Ark server and Esplora API
- **Persistent storage** for wallet data

## Docker Deployment (Recommended)

### Basic Production Deployment

```bash
# Create data volume
docker volume create fulmine-data

# Run Fulmine
docker run -d \
  --name fulmine \
  --restart unless-stopped \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Production with All Options

```bash
docker run -d \
  --name fulmine \
  --restart unless-stopped \
  -p 7000:7000 \
  -p 7001:7001 \
  -e FULMINE_HTTP_PORT=7001 \
  -e FULMINE_GRPC_PORT=7000 \
  -e FULMINE_ARK_SERVER="https://ark.example.com" \
  -e FULMINE_ESPLORA_URL="https://mempool.space/api" \
  -e FULMINE_LOG_LEVEL=4 \
  -e FULMINE_DISABLE_TELEMETRY=false \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### With Auto-Unlock (File-Based)

For unattended operation, configure automatic wallet unlock:

```bash
# Create secure password file
echo "YourStr0ng!Pass" > /opt/fulmine/password.txt
chmod 600 /opt/fulmine/password.txt

# Run with auto-unlock
docker run -d \
  --name fulmine \
  --restart unless-stopped \
  -p 7000:7000 \
  -p 7001:7001 \
  -e FULMINE_UNLOCKER_TYPE=file \
  -e FULMINE_UNLOCKER_FILE_PATH=/app/password.txt \
  -v fulmine-data:/app/data \
  -v /opt/fulmine/password.txt:/app/password.txt:ro \
  ghcr.io/arklabshq/fulmine:latest
```

### Docker Compose Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  fulmine:
    image: ghcr.io/arklabshq/fulmine:latest
    container_name: fulmine
    restart: unless-stopped
    ports:
      - "7000:7000"  # gRPC
      - "7001:7001"  # HTTP/Web UI
    environment:
      - FULMINE_ARK_SERVER=https://ark.example.com
      - FULMINE_ESPLORA_URL=https://mempool.space/api
      - FULMINE_LOG_LEVEL=4
      - FULMINE_DISABLE_TELEMETRY=false
      # Auto-unlock (optional)
      # - FULMINE_UNLOCKER_TYPE=file
      # - FULMINE_UNLOCKER_FILE_PATH=/app/password.txt
    volumes:
      - fulmine-data:/app/data
      # - ./password.txt:/app/password.txt:ro  # For auto-unlock
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:7001/api/v1/wallet/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  fulmine-data:
```

Deploy with:
```bash
docker compose up -d
docker compose logs -f
```

## Binary Deployment

### Download Release

Download the appropriate binary from [GitHub Releases](https://github.com/ArkLabsHQ/fulmine/releases):

```bash
# Linux AMD64
VERSION="latest"  # Replace with specific version
wget https://github.com/ArkLabsHQ/fulmine/releases/download/v${VERSION}/fulmine-v${VERSION}-linux-amd64

# Linux ARM64
wget https://github.com/ArkLabsHQ/fulmine/releases/download/v${VERSION}/fulmine-v${VERSION}-linux-arm64

# Make executable
chmod +x fulmine-*
mv fulmine-* /usr/local/bin/fulmine
```

### Manual Run

```bash
export FULMINE_DATADIR=/var/lib/fulmine
export FULMINE_HTTP_PORT=7001
export FULMINE_GRPC_PORT=7000
export FULMINE_ARK_SERVER="https://ark.example.com"
export FULMINE_ESPLORA_URL="https://mempool.space/api"

/usr/local/bin/fulmine
```

### Systemd Service

Create `/etc/systemd/system/fulmine.service`:

```ini
[Unit]
Description=Fulmine Bitcoin Wallet Daemon
Documentation=https://github.com/ArkLabsHQ/fulmine
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=fulmine
Group=fulmine
WorkingDirectory=/opt/fulmine
ExecStart=/usr/local/bin/fulmine
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/fulmine

# Environment
Environment="FULMINE_DATADIR=/var/lib/fulmine"
Environment="FULMINE_HTTP_PORT=7001"
Environment="FULMINE_GRPC_PORT=7000"
Environment="FULMINE_ARK_SERVER=https://ark.example.com"
Environment="FULMINE_ESPLORA_URL=https://mempool.space/api"
Environment="FULMINE_LOG_LEVEL=4"

# Auto-unlock (optional - use one method)
# File-based unlock:
# Environment="FULMINE_UNLOCKER_TYPE=file"
# Environment="FULMINE_UNLOCKER_FILE_PATH=/opt/fulmine/password.txt"

# Environment-based unlock:
# Environment="FULMINE_UNLOCKER_TYPE=env"
# Environment="FULMINE_UNLOCKER_PASSWORD=YourStr0ng!Pass"

[Install]
WantedBy=multi-user.target
```

Setup the service:

```bash
# Create user and directories
sudo useradd -r -s /bin/false fulmine
sudo mkdir -p /var/lib/fulmine /opt/fulmine
sudo chown fulmine:fulmine /var/lib/fulmine /opt/fulmine

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable fulmine
sudo systemctl start fulmine

# Check status
sudo systemctl status fulmine
sudo journalctl -u fulmine -f
```

## Network Configuration

### Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 7000 | TCP | gRPC API |
| 7001 | TCP | HTTP REST API + Web UI |

### Firewall Rules

```bash
# UFW
sudo ufw allow 7001/tcp comment "Fulmine HTTP"
sudo ufw allow 7000/tcp comment "Fulmine gRPC"

# iptables
sudo iptables -A INPUT -p tcp --dport 7001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 7000 -j ACCEPT
```

### Reverse Proxy (nginx)

For TLS termination, use nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name fulmine.example.com;

    ssl_certificate /etc/letsencrypt/live/fulmine.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fulmine.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:7001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # gRPC (if needed externally)
    location /fulmine.v1 {
        grpc_pass grpc://127.0.0.1:7000;
    }
}
```

## Security Considerations

### API Security Warning

The REST API and gRPC interfaces are **NOT protected** by authentication. Do not expose these interfaces over the public internet without additional protection:

1. **Use reverse proxy** with authentication (nginx basic auth, OAuth2 proxy)
2. **Firewall rules** to restrict access to trusted IPs
3. **VPN** for remote access
4. **Private network** for internal services only

### Password Security

When using auto-unlock:

```bash
# Secure password file permissions
chmod 600 /opt/fulmine/password.txt
chown fulmine:fulmine /opt/fulmine/password.txt

# Verify permissions
ls -la /opt/fulmine/password.txt
# Should show: -rw------- fulmine fulmine
```

### Data Directory Security

```bash
# Secure data directory
chmod 700 /var/lib/fulmine
chown -R fulmine:fulmine /var/lib/fulmine
```

## Monitoring

### Health Check

```bash
# Check wallet status
curl http://localhost:7001/api/v1/wallet/status

# Check balance (requires unlocked wallet)
curl http://localhost:7001/api/v1/balance
```

### Logs

```bash
# Docker logs
docker logs -f fulmine

# Systemd logs
sudo journalctl -u fulmine -f

# With timestamps
sudo journalctl -u fulmine --since "1 hour ago"
```

### Metrics

Enable debug logging for detailed metrics:

```bash
export FULMINE_LOG_LEVEL=5
```

## Backup and Recovery

### Backup Data Directory

```bash
# Stop service first
sudo systemctl stop fulmine
# or: docker stop fulmine

# Backup data
sudo tar -czvf fulmine-backup-$(date +%Y%m%d).tar.gz /var/lib/fulmine/
# or for Docker: docker cp fulmine:/app/data ./fulmine-backup

# Start service
sudo systemctl start fulmine
# or: docker start fulmine
```

### Critical Files to Backup

- `wallet.db` - Encrypted wallet database
- `sqlite.db` - Transaction and swap state
- Environment configuration

### Restore from Backup

```bash
# Stop service
sudo systemctl stop fulmine

# Restore data
sudo tar -xzvf fulmine-backup-YYYYMMDD.tar.gz -C /

# Fix permissions
sudo chown -R fulmine:fulmine /var/lib/fulmine

# Start service
sudo systemctl start fulmine
```

## Updating

### Docker Update

```bash
# Pull latest image
docker pull ghcr.io/arklabshq/fulmine:latest

# Stop and remove old container
docker stop fulmine
docker rm fulmine

# Start new container (data persists in volume)
docker run -d \
  --name fulmine \
  --restart unless-stopped \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Binary Update

```bash
# Download new version
wget https://github.com/ArkLabsHQ/fulmine/releases/download/vNEW/fulmine-vNEW-linux-amd64
chmod +x fulmine-vNEW-linux-amd64

# Stop service
sudo systemctl stop fulmine

# Replace binary
sudo mv fulmine-vNEW-linux-amd64 /usr/local/bin/fulmine

# Start service
sudo systemctl start fulmine
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `FULMINE_DATADIR` | Data directory path | `/app/data` (Docker), `~/.fulmine` (binary) |
| `FULMINE_HTTP_PORT` | HTTP port for REST API and Web UI | `7001` |
| `FULMINE_GRPC_PORT` | gRPC service port | `7000` |
| `FULMINE_ARK_SERVER` | Ark server URL | Pre-filled default |
| `FULMINE_ESPLORA_URL` | Esplora API URL | Pre-filled default |
| `FULMINE_UNLOCKER_TYPE` | Auto-unlock type (`file` or `env`) | Not set |
| `FULMINE_UNLOCKER_FILE_PATH` | Password file path | Not set |
| `FULMINE_UNLOCKER_PASSWORD` | Password string | Not set |
| `FULMINE_BOLTZ_URL` | Boltz backend URL | Not set |
| `FULMINE_BOLTZ_WS_URL` | Boltz WebSocket URL | Not set |
| `FULMINE_DISABLE_TELEMETRY` | Disable telemetry | `false` |
| `FULMINE_LOG_LEVEL` | Log level (0-5, 5=debug) | `4` |

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u fulmine -n 100

# Verify binary
/usr/local/bin/fulmine --version

# Check permissions
ls -la /var/lib/fulmine
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :7001
sudo netstat -tuln | grep 7001

# Kill conflicting process or use different port
export FULMINE_HTTP_PORT=7002
```

### Cannot Connect to Ark Server

```bash
# Test connectivity
curl https://your-ark-server.com/info

# Check DNS resolution
nslookup your-ark-server.com

# Verify environment variable
echo $FULMINE_ARK_SERVER
```

See `testing/troubleshooting.md` for comprehensive troubleshooting guide.
