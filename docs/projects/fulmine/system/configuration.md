# Fulmine Configuration

Fulmine is configured entirely through environment variables, making it easy to deploy in various environments (Docker, Kubernetes, systemd, etc.). This document provides a complete reference of all configuration options.

## Environment Variables Reference

### Core Configuration

#### FULMINE_DATADIR
- **Description**: Directory for storing wallet data, database, and configuration files
- **Default**:
  - **Linux**: `~/.fulmine`
  - **macOS**: `~/Library/Application Support/Fulmine`
  - **Windows**: `%APPDATA%\Fulmine`
  - **Docker**: `/app/data`
- **Example**: `FULMINE_DATADIR=/var/lib/fulmine`

#### FULMINE_DB_TYPE
- **Description**: Database backend to use
- **Options**: `sqlite` (default), `badger`
- **Default**: `sqlite`
- **Example**: `FULMINE_DB_TYPE=sqlite`

#### FULMINE_LOG_LEVEL
- **Description**: Logging verbosity level
- **Options**: `0` (panic), `1` (fatal), `2` (error), `3` (warn), `4` (info), `5` (debug), `6` (trace)
- **Default**: `4` (info)
- **Example**: `FULMINE_LOG_LEVEL=5`

### Network Ports

#### FULMINE_HTTP_PORT
- **Description**: HTTP port for Web UI and REST API
- **Default**: `7001`
- **Example**: `FULMINE_HTTP_PORT=8080`

#### FULMINE_GRPC_PORT
- **Description**: gRPC port for service communication
- **Default**: `7000`
- **Example**: `FULMINE_GRPC_PORT=9000`

#### FULMINE_WITH_TLS
- **Description**: Enable TLS for gRPC connections
- **Default**: `false`
- **Example**: `FULMINE_WITH_TLS=true`

### Ark Integration

#### FULMINE_ARK_SERVER
- **Description**: URL of the Ark server to connect to
- **Default**: Pre-filled based on network (empty means use default)
- **Example**: `FULMINE_ARK_SERVER=https://ark.example.com`
- **Note**: Must be a valid Arkade (arkd) server instance

#### FULMINE_ESPLORA_URL
- **Description**: URL of the Esplora blockchain indexer
- **Default**: Pre-filled based on network
- **Example**: `FULMINE_ESPLORA_URL=https://mempool.space/api`
- **Note**: Used for monitoring on-chain transactions and boarding

### Boltz Integration (Swaps)

#### FULMINE_BOLTZ_URL
- **Description**: URL of the Boltz backend for submarine swaps
- **Default**: Not set (uses Boltz's default instance for network)
- **Example**: `FULMINE_BOLTZ_URL=https://boltz.example.com`

#### FULMINE_BOLTZ_WS_URL
- **Description**: WebSocket URL for Boltz swap event notifications
- **Default**: Not set (uses Boltz's default WebSocket for network)
- **Example**: `FULMINE_BOLTZ_WS_URL=wss://boltz.example.com/ws`

#### FULMINE_SWAP_TIMEOUT
- **Description**: Timeout for swap operations in seconds
- **Default**: `120` (2 minutes)
- **Example**: `FULMINE_SWAP_TIMEOUT=180`
- **Note**: Controls how long to monitor WebSocket for swap completion

### Auto-Unlock Configuration

#### FULMINE_UNLOCKER_TYPE
- **Description**: Type of auto-unlock mechanism
- **Options**: `file`, `env`, or empty (no auto-unlock)
- **Default**: Not set (manual unlock required)
- **Example**: `FULMINE_UNLOCKER_TYPE=file`

#### FULMINE_UNLOCKER_FILE_PATH
- **Description**: Path to file containing wallet password (when using `file` unlocker)
- **Default**: Not set
- **Example**: `FULMINE_UNLOCKER_FILE_PATH=/run/secrets/fulmine_password`
- **Security**: Ensure file has restricted permissions (chmod 600)

#### FULMINE_UNLOCKER_PASSWORD
- **Description**: Wallet password as environment variable (when using `env` unlocker)
- **Default**: Not set
- **Example**: `FULMINE_UNLOCKER_PASSWORD=MySecurePassword123!`
- **Security**: Be cautious - environment variables can be visible in process listings

### Lightning Network Configuration

#### FULMINE_LND_URL
- **Description**: LND connection URL or lndconnect string
- **Format**: `host:port` or `lndconnect://host:port?cert=<base64>&macaroon=<base64>`
- **Default**: Not set (Lightning integration disabled)
- **Example**: `FULMINE_LND_URL=lndconnect://localhost:10009?cert=...&macaroon=...`

#### FULMINE_LND_DATADIR
- **Description**: LND data directory (required if using host:port format)
- **Default**: Not set
- **Example**: `FULMINE_LND_DATADIR=/home/user/.lnd`
- **Note**: Used to read `tls.cert` and `admin.macaroon`

#### FULMINE_CLN_URL
- **Description**: CLN connection URL or clnconnect string
- **Format**: `host:port` or `clnconnect://host:port?cert=<base64>&rune=<base64>`
- **Default**: Not set (Lightning integration disabled)
- **Example**: `FULMINE_CLN_URL=clnconnect://localhost:9835?rune=...`

#### FULMINE_CLN_DATADIR
- **Description**: CLN data directory (required if using host:port format)
- **Default**: Not set
- **Example**: `FULMINE_CLN_DATADIR=/home/user/.lightning`

### Telemetry and Monitoring

#### FULMINE_DISABLE_TELEMETRY
- **Description**: Opt out of anonymous telemetry logging
- **Default**: `false`
- **Example**: `FULMINE_DISABLE_TELEMETRY=true`

#### FULMINE_NO_MACAROONS
- **Description**: Disable macaroon authentication (for development only)
- **Default**: `false`
- **Example**: `FULMINE_NO_MACAROONS=true`
- **Security**: Only use in trusted development environments

## Configuration Modes

### Docker Configuration (Recommended)

Docker deployment with persistent data and auto-unlock:

```bash
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -e FULMINE_DATADIR=/app/data \
  -e FULMINE_ARK_SERVER=https://ark.example.com \
  -e FULMINE_ESPLORA_URL=https://mempool.space/api \
  -e FULMINE_UNLOCKER_TYPE=file \
  -e FULMINE_UNLOCKER_FILE_PATH=/run/secrets/password \
  -e FULMINE_LOG_LEVEL=5 \
  -v fulmine-data:/app/data \
  -v /path/to/password.txt:/run/secrets/password:ro \
  ghcr.io/arklabshq/fulmine:latest
```

### Binary Configuration (Standalone)

Configuration via environment variables when running binary directly:

```bash
# Create environment file
cat > fulmine.env <<EOF
FULMINE_DATADIR=/var/lib/fulmine
FULMINE_HTTP_PORT=7001
FULMINE_GRPC_PORT=7000
FULMINE_ARK_SERVER=https://ark.example.com
FULMINE_ESPLORA_URL=https://mempool.space/api
FULMINE_LOG_LEVEL=4
EOF

# Load environment and run
export $(cat fulmine.env | xargs)
./fulmine
```

### Development Configuration

Minimal configuration for local development:

```bash
# Use defaults for most settings
export FULMINE_DATADIR=/tmp/fulmine-dev
export FULMINE_LOG_LEVEL=5
export FULMINE_ARK_SERVER=http://localhost:7070
export FULMINE_ESPLORA_URL=http://localhost:3000

# Run with hot reload
make run
```

## Auto-Unlock Configuration

### File-Based Auto-Unlock

Store password in a file with restricted permissions:

```bash
# Create password file
echo "MySecurePassword123!" > /etc/fulmine/password.txt
chmod 600 /etc/fulmine/password.txt
chown fulmine:fulmine /etc/fulmine/password.txt

# Configure Fulmine
export FULMINE_UNLOCKER_TYPE=file
export FULMINE_UNLOCKER_FILE_PATH=/etc/fulmine/password.txt
```

**Docker example:**
```bash
docker run -d \
  --name fulmine \
  -e FULMINE_UNLOCKER_TYPE=file \
  -e FULMINE_UNLOCKER_FILE_PATH=/app/password.txt \
  -v /secure/location/password.txt:/app/password.txt:ro \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Environment-Based Auto-Unlock

Store password directly in environment variable:

```bash
export FULMINE_UNLOCKER_TYPE=env
export FULMINE_UNLOCKER_PASSWORD="MySecurePassword123!"
```

**Docker example with secret:**
```bash
# Create Docker secret
echo "MySecurePassword123!" | docker secret create fulmine_password -

# Run with secret
docker service create \
  --name fulmine \
  --secret fulmine_password \
  -e FULMINE_UNLOCKER_TYPE=file \
  -e FULMINE_UNLOCKER_FILE_PATH=/run/secrets/fulmine_password \
  ghcr.io/arklabshq/fulmine:latest
```

### Security Warnings for Auto-Unlock

**File-based:**
- Use proper file permissions (chmod 600)
- Store on encrypted filesystem
- Avoid network-mounted filesystems
- Audit file access regularly

**Environment-based:**
- Environment variables can leak in logs
- Visible in process listings (`ps aux | grep FULMINE`)
- Consider using Docker secrets or Kubernetes secrets instead
- Rotate passwords regularly

**Production recommendations:**
- Use secrets management (Vault, AWS Secrets Manager, etc.)
- Implement secret rotation
- Monitor access to secrets
- Use hardware security modules (HSM) for critical deployments

## Network-Specific Configuration

### Mainnet

```bash
FULMINE_ARK_SERVER=https://ark.arkade.os  # Example mainnet server
FULMINE_ESPLORA_URL=https://mempool.space/api
```

### Testnet

```bash
FULMINE_ARK_SERVER=https://testnet.ark.arkade.os
FULMINE_ESPLORA_URL=https://mempool.space/testnet/api
```

### Signet

```bash
FULMINE_ARK_SERVER=https://signet.ark.arkade.os
FULMINE_ESPLORA_URL=https://mempool.space/signet/api
```

### Regtest (Development)

```bash
FULMINE_ARK_SERVER=http://localhost:7070
FULMINE_ESPLORA_URL=http://localhost:3000
FULMINE_BOLTZ_URL=http://localhost:9001
FULMINE_BOLTZ_WS_URL=ws://localhost:9001/ws
```

## Data Directory Locations

Fulmine stores data in platform-specific directories:

### Linux
```
~/.fulmine/
├── wallet.db          # SQLite wallet database (if using sqlite)
├── badger/            # Badger database files (if using badger)
├── macaroons/         # Authentication macaroons
├── tls.cert           # TLS certificate (if WITH_TLS=true)
├── tls.key            # TLS private key
└── logs/              # Application logs
```

### macOS
```
~/Library/Application Support/Fulmine/
├── wallet.db
├── badger/
├── macaroons/
└── logs/
```

### Windows
```
%APPDATA%\Fulmine\
├── wallet.db
├── badger\
├── macaroons\
└── logs\
```

### Docker
```
/app/data/
├── wallet.db
├── badger/
├── macaroons/
└── logs/
```

## Configuration Validation

Fulmine validates configuration on startup:

**Port conflicts:**
- HTTP and gRPC ports must be different
- Ports must be in range 1-65535
- Ports must not be in use by other processes

**URL validation:**
- Ark server URL must be valid HTTP/HTTPS URL
- Esplora URL must be valid HTTP/HTTPS URL
- Lightning URLs must match expected format

**Lightning configuration:**
- Cannot set both LND and CLN URLs
- If URL provided without `connect://` format, datadir is required
- Datadir must exist and be readable

**Auto-unlock:**
- If type is `file`, path must be provided and file must exist
- If type is `env`, password must be provided
- Password must meet wallet requirements (8+ chars, number, special char)

## Default Values Summary

| Variable | Default Value |
|----------|---------------|
| FULMINE_DATADIR | Platform-specific (see above) |
| FULMINE_DB_TYPE | `sqlite` |
| FULMINE_HTTP_PORT | `7001` |
| FULMINE_GRPC_PORT | `7000` |
| FULMINE_WITH_TLS | `false` |
| FULMINE_LOG_LEVEL | `4` (info) |
| FULMINE_ARK_SERVER | Network-specific default |
| FULMINE_ESPLORA_URL | Network-specific default |
| FULMINE_BOLTZ_URL | Not set |
| FULMINE_BOLTZ_WS_URL | Not set |
| FULMINE_UNLOCKER_TYPE | Not set (manual unlock) |
| FULMINE_DISABLE_TELEMETRY | `false` |
| FULMINE_SWAP_TIMEOUT | `120` seconds |
| FULMINE_NO_MACAROONS | `false` |

## Troubleshooting Configuration

### Port Already in Use

**Error**: `bind: address already in use`

**Solution**: Change port or stop conflicting service
```bash
# Find process using port
lsof -i :7001
# Kill process or change FULMINE_HTTP_PORT
export FULMINE_HTTP_PORT=8001
```

### Permission Denied on Datadir

**Error**: `permission denied: /var/lib/fulmine`

**Solution**: Create directory with proper permissions
```bash
sudo mkdir -p /var/lib/fulmine
sudo chown $(whoami):$(whoami) /var/lib/fulmine
chmod 700 /var/lib/fulmine
```

### Auto-Unlock Fails

**Error**: `failed to unlock wallet: invalid password`

**Solution**: Verify password file contents and permissions
```bash
# Check file exists and is readable
cat /etc/fulmine/password.txt
# Check permissions
ls -l /etc/fulmine/password.txt  # Should be -rw------- (600)
```

### Lightning Connection Fails

**Error**: `failed to connect to Lightning node`

**Solution**: Verify Lightning node is running and accessible
```bash
# Test LND connection
lncli --network=mainnet getinfo
# Test CLN connection
lightning-cli getinfo
```

For additional configuration examples, see the `envs/` directory in the Fulmine repository.
