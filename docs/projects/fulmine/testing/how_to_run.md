# How to Run Fulmine

This guide covers different ways to deploy and run Fulmine in various environments.

## Docker Deployment (Production)

### Basic Run

The simplest way to run Fulmine in production:

```bash
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

This command:
- Runs Fulmine in detached mode
- Exposes gRPC port 7000 and HTTP port 7001
- Persists data in a Docker volume named `fulmine-data`

### With Environment Variables

Configure Fulmine using environment variables:

```bash
docker run -d \
  --name fulmine \
  -p 7001:7001 \
  -p 7000:7000 \
  -e FULMINE_HTTP_PORT=7001 \
  -e FULMINE_GRPC_PORT=7000 \
  -e FULMINE_ARK_SERVER="https://ark.example.com" \
  -e FULMINE_ESPLORA_URL="https://mempool.space/api" \
  -e FULMINE_LOG_LEVEL=4 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Volume Mounting for Persistence

To persist data across container restarts, use either a named volume or bind mount:

**Named Volume** (recommended):
```bash
docker volume create fulmine-data
docker run -d \
  --name fulmine \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

**Bind Mount**:
```bash
docker run -d \
  --name fulmine \
  -p 7001:7001 \
  -v /path/on/host:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Accessing Logs

View container logs in real-time:

```bash
docker logs -f fulmine
```

View last 100 lines:

```bash
docker logs --tail 100 fulmine
```

### Updating Container

To update to the latest version:

```bash
# Pull latest image
docker pull ghcr.io/arklabshq/fulmine:latest

# Stop and remove old container
docker stop fulmine
docker rm fulmine

# Start new container with same volume
docker run -d \
  --name fulmine \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

## Binary Deployment

### Platform Selection

Download the appropriate binary for your platform from the [releases page](https://github.com/ArkLabsHQ/fulmine/releases):

- **Linux**: `fulmine-linux-amd64.tar.gz`
- **macOS**: `fulmine-darwin-amd64.tar.gz` or `fulmine-darwin-arm64.tar.gz`
- **Windows**: `fulmine-windows-amd64.zip`

### Download and Extract

**Linux/macOS**:
```bash
# Download (replace VERSION with actual version)
wget https://github.com/ArkLabsHQ/fulmine/releases/download/vVERSION/fulmine-linux-amd64.tar.gz

# Extract
tar -xzf fulmine-linux-amd64.tar.gz

# Make executable
chmod +x fulmine
```

**Windows**:
```powershell
# Download and extract using PowerShell
Invoke-WebRequest -Uri "https://github.com/ArkLabsHQ/fulmine/releases/download/vVERSION/fulmine-windows-amd64.zip" -OutFile "fulmine.zip"
Expand-Archive -Path fulmine.zip -DestinationPath .
```

### Configuration via Environment Variables

Set environment variables before running:

**Linux/macOS**:
```bash
export FULMINE_HTTP_PORT=7001
export FULMINE_GRPC_PORT=7000
export FULMINE_ARK_SERVER="https://ark.example.com"
export FULMINE_ESPLORA_URL="https://mempool.space/api"
export FULMINE_DATADIR="$HOME/.fulmine"

./fulmine
```

**Windows**:
```powershell
$env:FULMINE_HTTP_PORT=7001
$env:FULMINE_ARK_SERVER="https://ark.example.com"

.\fulmine.exe
```

### Running as Service

#### Linux (systemd)

Create a systemd service file at `/etc/systemd/system/fulmine.service`:

```ini
[Unit]
Description=Fulmine Wallet Daemon
After=network.target

[Service]
Type=simple
User=fulmine
WorkingDirectory=/opt/fulmine
ExecStart=/opt/fulmine/fulmine
Restart=always
RestartSec=10

# Environment variables
Environment="FULMINE_HTTP_PORT=7001"
Environment="FULMINE_GRPC_PORT=7000"
Environment="FULMINE_DATADIR=/var/lib/fulmine"
Environment="FULMINE_ARK_SERVER=https://ark.example.com"

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable fulmine
sudo systemctl start fulmine
sudo systemctl status fulmine
```

## Development Mode

### Prerequisites

- **Go**: 1.24.6 or higher
- **Node.js**: 18.17.1 or higher
- **Git**: For cloning the repository

### Clone Repository

```bash
git clone https://github.com/ArkLabsHQ/fulmine.git
cd fulmine
```

### Install Dependencies

```bash
go mod download
```

### Build Static Assets

Build the web UI assets:

```bash
make build-static-assets
```

This compiles templates and frontend assets.

### Run Development Server

```bash
make run
```

This will:
- Set `FULMINE_NO_MACAROONS=true`
- Set `FULMINE_LOG_LEVEL=5` (debug)
- Build static assets
- Run Fulmine with hot reload support

### Access the Application

Once running, access Fulmine at:
- Web UI: http://localhost:7001
- gRPC: localhost:7000

### Hot Reload with Air (Optional)

For automatic reloading during development, install [Air](https://github.com/cosmtrek/air):

```bash
go install github.com/cosmtrek/air@latest
air
```

## Configuration for Different Scenarios

### Custom Ark Server

Connect to a specific Ark server:

```bash
export FULMINE_ARK_SERVER="https://custom-ark.example.com"
./fulmine
```

### Custom Boltz Backend

Configure custom Boltz backend for swaps:

```bash
export FULMINE_BOLTZ_URL="http://boltz.example.com:9001"
export FULMINE_BOLTZ_WS_URL="ws://boltz.example.com:9004"
./fulmine
```

### Auto-Unlock Setup

#### File-Based Auto-Unlock

Store password in a file with restricted permissions:

```bash
# Create password file
echo "YourStr0ng!Pass" > /secure/path/password.txt
chmod 600 /secure/path/password.txt

# Run with file-based unlocker
export FULMINE_UNLOCKER_TYPE=file
export FULMINE_UNLOCKER_FILE_PATH=/secure/path/password.txt
./fulmine
```

#### Environment-Based Auto-Unlock

Use environment variable for password:

```bash
export FULMINE_UNLOCKER_TYPE=env
export FULMINE_UNLOCKER_PASSWORD="YourStr0ng!Pass"
./fulmine
```

**Security Warning**: When using auto-unlock, ensure passwords are stored securely. Use appropriate file permissions for file-based unlocking and be cautious about environment variable visibility.

### LND/CLN Integration

Fulmine can run with Core Lightning (CLN) support:

```bash
export FULMINE_GRPC_PORT=7008
export FULMINE_HTTP_PORT=7009
export FULMINE_DATADIR="./node-cln"
export FULMINE_CLN_DATADIR="$HOME/.lightning/regtest"

make run-cln
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

## Data Directory Locations

Default data directories by platform:

- **Linux**: `~/.fulmine/`
- **macOS**: `~/Library/Application Support/fulmine/`
- **Windows**: `%APPDATA%\fulmine\`
- **Docker**: `/app/data`

Override with `FULMINE_DATADIR` environment variable.
