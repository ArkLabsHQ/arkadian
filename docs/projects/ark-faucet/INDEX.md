---
project_id: ark-faucet
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/api-reference.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  api: ["testing/api-reference.md"]
  config: ["system/configuration.md"]
scripts:
  run: "make run"
  build: "make build"
  docker_build: "make docker-build"
  docker_run: "make docker-run"
---

# Ark Faucet — Project Index

**ark-faucet** is an offchain-only wallet service that provides HTTP APIs for distributing Ark coins to both onchain and offchain addresses. It supports both covenant (Liquid) and covenantless (Bitcoin) modes, using the Ark SDK for wallet management and Ark server interactions.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ark-faucet/system/` — System Architecture & Components
Core documentation about ark-faucet:

- **${ARKADIAN_DIR}/docs/projects/ark-faucet/system/project_overview.md** — — What ark-faucet is, features, use cases
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/system/architecture.md** — — Service architecture and components
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/system/api-design.md** — — HTTP API design and endpoints
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/system/configuration.md** — — Environment variables and configuration

### `${ARKADIAN_DIR}/docs/projects/ark-faucet/testing/` — Usage & Operations
Practical guides for using and deploying:

- **${ARKADIAN_DIR}/docs/projects/ark-faucet/testing/usage.md** — — Quick start guide
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/testing/api-reference.md** — — Complete API documentation with examples
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/testing/how_to_run.md** — — Local and Docker deployment
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/ark-faucet/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/ark-faucet/sop/development-workflow.md** — — Development setup and workflow
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/sop/deployment-guide.md** — — Production deployment guide
- **${ARKADIAN_DIR}/docs/projects/ark-faucet/sop/wallet-management.md** — — Managing faucet wallet and balance

### `${ARKADIAN_DIR}/docs/projects/ark-faucet/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Recent Changes
Curated summaries of significant changes.

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Offchain-Only Wallet
- Uses Ark SDK for wallet operations
- Maintains offchain balance (VTXOs)
- Can send to both onchain and offchain addresses
- No direct blockchain interaction required

### Distribution Service
- **Public endpoint**: `/faucet` - Anyone can request coins
- **Protected endpoints**: `/balance`, `/refill` - Admin only
- Basic authentication for admin operations
- Rate limiting and amount controls

### Dual Network Support
- **Covenantless mode** (default): Bitcoin network
- **Covenant mode**: Liquid network
- Configurable via `ARK_FAUCET_IS_COVENANT` flag

### Note System
- Initialize wallet with Ark notes
- Redeem notes for balance
- Refill endpoint for automatic top-up
- Requires admin macaroon access

---

## Quick Reference

### Local Development
```bash
# Build and run
make run

# Access at http://localhost:9999
```

### Docker Deployment
```bash
# Build and run with Docker
make docker-run

# Manual Docker run
docker run -d \
  --name arkfaucet \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=admin \
  -e ARK_FAUCET_SERVER_URL=http://localhost:7070 \
  -v arkfaucet-data:/app/faucetdata \
  arkfaucet
```

### Basic Usage
```bash
# Request coins (public)
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "ark_address", "amount": 1000}'

# Check balance (admin)
curl -u admin:admin http://localhost:9999/balance

# Check addresses
curl http://localhost:9999/address

# Refill (admin)
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=5000"
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ARK_FAUCET_DATADIR` | Data directory for wallet | `~/.arkfaucet` | ❌ |
| `ARK_FAUCET_PORT` | HTTP server port | `9999` | ❌ |
| `ARK_FAUCET_SERVER_URL` | Ark server URL | `http://localhost:7070` | ❌ |
| `ARK_FAUCET_PASSWORD` | Wallet password | - | ✅ |
| `ARK_FAUCET_IS_COVENANT` | Covenant mode (Liquid) | `false` | ❌ |
| `ARK_FAUCET_AUTH_USER` | Admin username | `admin` | ❌ |
| `ARK_FAUCET_AUTH_PASS` | Admin password | `admin` | ❌ |
| `ARK_FAUCET_NOTES` | Initial notes (comma-separated) | - | ❌ |
| `ARK_FAUCET_SERVER_DATADIR` | Arkd data directory | `~/.arkd` | ❌* |
| `ARK_FAUCET_EXPLORER_URL` | Esplora URL | - | ❌ |

*Required only for `/refill` endpoint functionality.

### Configuration Examples

**Development (Local)**
```bash
export ARK_FAUCET_PASSWORD=admin
export ARK_FAUCET_SERVER_URL=http://localhost:7070
export ARK_FAUCET_NOTES="note1,note2,note3"
```

**Production (Docker)**
```bash
docker run -d \
  --name arkfaucet \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=secure_password \
  -e ARK_FAUCET_SERVER_URL=https://ark.example.com \
  -e ARK_FAUCET_AUTH_USER=admin \
  -e ARK_FAUCET_AUTH_PASS=secure_admin_password \
  -e ARK_FAUCET_NOTES="${NOTES}" \
  -e ARK_FAUCET_SERVER_DATADIR=/app/arkd-data \
  -v arkfaucet-data:/app/faucetdata \
  -v arkd-data:/app/arkd-data:ro \
  arkfaucet
```

**Liquid Network (Covenant Mode)**
```bash
export ARK_FAUCET_PASSWORD=admin
export ARK_FAUCET_IS_COVENANT=true
export ARK_FAUCET_SERVER_URL=http://localhost:7070
```

---

## API Overview

### Public Endpoints

**POST /faucet** - Request coins
- No authentication required
- Request: `{"address": "<ark_or_bitcoin_address>", "amount": <satoshis>}`
- Response: Transaction ID on success

**GET /address** - Get faucet addresses
- No authentication required
- Returns: `{"onchain": "<address>", "offchain": "<address>"}`

### Protected Endpoints (Basic Auth)

**GET /balance** - Check faucet balance
- Requires: `admin:admin` (default) or configured credentials
- Returns: `{"onchain": <sats>, "offchain": <sats>}`

**POST /refill?amount=<sats>** - Refill faucet balance
- Requires: Admin authentication + arkd data directory access
- Mints notes and redeems them automatically
- Returns: Success message

**POST /refill-with-notes** - Redeem notes manually
- Requires: Admin authentication
- Request: `{"notes": ["note1", "note2"]}`
- Returns: Success message

---

## Architecture Overview

### Service Components
```
┌─────────────────────────────────────────┐
│         Ark Faucet Service              │
├─────────────────────────────────────────┤
│                                          │
│  HTTP Server (port 9999)                │
│         ↓                                │
│  ┌──────────────────────────────┐       │
│  │  Public: /faucet, /address   │       │
│  │  Protected: /balance, /refill│       │
│  └──────────────┬───────────────┘       │
│                 ↓                        │
│  ┌──────────────────────────────┐       │
│  │     Ark SDK Wallet           │       │
│  │  - Offchain balance (VTXOs)  │       │
│  │  - Send/receive operations   │       │
│  │  - Note redemption           │       │
│  └──────────────┬───────────────┘       │
│                 ↓                        │
│         Ark Server (arkd)                │
│                                          │
└─────────────────────────────────────────┘
```

### Data Flow

**Faucet Request Flow:**
1. User sends POST to `/faucet` with address and amount
2. Faucet validates request
3. Sends payment via Ark SDK
4. Returns transaction ID

**Refill Flow:**
1. Admin calls `/refill` with amount
2. Service reads admin macaroon from arkd data directory
3. Mints notes via arkd admin API
4. Redeems notes to faucet wallet
5. Balance increased

---

## Security Considerations

### Authentication
- Public endpoint: `/faucet` - No auth (intended for distribution)
- Protected endpoints: Basic auth required
- Default credentials: `admin:admin` (MUST change in production)

### Access Control
- Configure strong admin credentials via env vars
- Use HTTPS in production
- Rate limit `/faucet` endpoint (application level)
- Monitor usage and balance

### Wallet Security
- Wallet encrypted with `ARK_FAUCET_PASSWORD`
- Password required on startup
- Data stored in `ARK_FAUCET_DATADIR`
- Backup wallet data directory

### Arkd Data Directory Access
- Required for `/refill` endpoint
- Reads admin macaroon for privileged operations
- Mount as read-only in Docker: `-v arkd-data:/app/arkd-data:ro`
- Ensure proper file permissions

---

## Integration Points

### Ark Server (arkd)
- **Connection**: HTTP/gRPC to `ARK_FAUCET_SERVER_URL`
- **Operations**: Send payments, redeem notes, check balance
- **Admin API**: Mint notes (requires macaroon)

### Ark SDK
- **Usage**: Wallet management and operations
- **Mode**: Offchain-only (no onchain wallet)
- **Storage**: Persistent wallet data in datadir

### Esplora (Optional)
- **Connection**: HTTP to `ARK_FAUCET_EXPLORER_URL`
- **Usage**: Blockchain queries (if needed)

---

## Use Cases

### Development/Testing
- Provide test coins for Ark developers
- Allow wallet testing without real funds
- Simulate user onboarding

### Testnet Faucet
- Public faucet for testnet networks
- Help developers get started
- Populate test wallets

### Internal Distribution
- Distribute coins to team members
- Demo and presentation accounts
- Internal testing environments

---

## Deployment Patterns

### Standalone Service
```bash
# Simple deployment with local arkd
export ARK_FAUCET_PASSWORD=admin
export ARK_FAUCET_SERVER_URL=http://localhost:7070
make run
```

### Docker Compose Stack
```yaml
services:
  ark:
    image: ghcr.io/ark-network/arkd:latest
    # ... arkd configuration

  arkfaucet:
    image: arkfaucet:latest
    environment:
      - ARK_FAUCET_PASSWORD=admin
      - ARK_FAUCET_SERVER_URL=http://ark:7070
      - ARK_FAUCET_AUTH_USER=admin
      - ARK_FAUCET_AUTH_PASS=secure_password
    volumes:
      - arkfaucet-data:/app/faucetdata
      - arkd-data:/app/arkd-data:ro
    ports:
      - "9999:9999"
    depends_on:
      - ark
```

### Public Faucet (with reverse proxy)
```
Internet → Nginx (HTTPS) → Ark Faucet → Arkd
                  ↓
           Rate limiting
           DDoS protection
```

---

## Monitoring and Maintenance

### Health Check
```bash
# Check if service is running
curl http://localhost:9999/address

# Check balance (admin)
curl -u admin:admin http://localhost:9999/balance
```

### Balance Monitoring
- Monitor offchain balance regularly
- Alert when balance drops below threshold
- Automated refill via `/refill` endpoint

### Logs
```bash
# Docker logs
docker logs -f arkfaucet

# Check for errors
docker logs arkfaucet 2>&1 | grep -i error
```

---

## Development Commands

### Building
```bash
# Build binary
make build

# Build Docker image
make docker-build
```

### Running
```bash
# Run locally
make run

# Run with Docker
make docker-run
```

### Code Quality
```bash
# Static analysis
make vet

# Tidy dependencies
make tidy
```

---

## Limitations

- **Offchain only**: Cannot send directly to onchain addresses without settlement
- **No rate limiting**: Application-level rate limiting not implemented
- **Basic auth only**: No advanced authentication mechanisms
- **Single instance**: No horizontal scaling support
- **No transaction history**: Does not track distribution history
- **Manual refill**: Requires admin intervention when balance low

---

## Future Enhancements

- Rate limiting per IP/address
- Transaction history and analytics
- Multiple admin accounts with roles
- Automated balance refill triggers
- Captcha for `/faucet` endpoint
- Usage statistics dashboard
- Webhook notifications

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
