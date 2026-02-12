# Arkade Boltz Swap — How to Run

## Development Setup

### Prerequisites
- Node.js 22+
- pnpm 10.25.0
- Docker and Docker Compose (for regtest environment)

### Install Dependencies

```bash
git clone git@github.com:arkade-os/boltz-swap.git
cd boltz-swap
pnpm install
```

---

## Build Library

```bash
# Build ESM and CJS bundles
pnpm build

# Output: dist/index.js (ESM), dist/index.cjs (CJS), dist/index.d.ts (types)
```

---

## Run Tests

### Unit Tests
```bash
# Run all unit tests (excludes E2E)
pnpm test:unit

# Watch mode for development
pnpm test --watch
```

### Integration Tests
```bash
# Start regtest environment first
pnpm regtest:up
pnpm regtest:setup

# Run integration tests
pnpm test:integration

# Stop regtest environment
pnpm regtest:down
```

### All Tests
```bash
# Run all tests (unit + integration)
pnpm test
```

---

## Regtest Environment

The library includes a Docker Compose stack for integration testing:

### Start Regtest
```bash
# Full setup (build + up + setup)
pnpm regtest

# Or step by step:
pnpm regtest:build   # Build Docker images
pnpm regtest:up      # Start services
pnpm regtest:setup   # Initialize wallets
```

### Services
- **Bitcoin (Nigiri)**: Port 18443 (RPC), 3000 (Esplora)
- **NBXplorer**: Port 32838
- **arkd-wallet**: Port 6060
- **arkd**: Port 7070
- **Boltz Backend**: Port 9001

### Stop Regtest
```bash
pnpm regtest:down
```

---

## Using in Applications

### Install from npm
```bash
npm install @arkade-os/boltz-swap
```

### Import and Use
```typescript
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';

const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
});

// See usage.md for complete examples
```

---

## Development Commands

### Formatting
```bash
# Check code formatting
pnpm lint

# Auto-fix formatting
pnpm format
```

### Release
```bash
# Dry run release (no publish)
pnpm release:dry-run

# Publish release
pnpm release

# Cleanup release artifacts
pnpm release:cleanup
```

---

## Environment Variables

Optional environment variables for testing:

```bash
# Arkade server URL
export ARKD_URL=http://localhost:7070

# Boltz API URL
export BOLTZ_API_URL=http://localhost:9001

# Network (regtest, mutinynet, mainnet)
export NETWORK=regtest
```

---

## Network Endpoints

### Regtest (Local Testing)
```typescript
const swapProvider = new BoltzSwapProvider({
  apiUrl: 'http://localhost:9001',
  network: 'regtest',
});
```

### Mutinynet (Testnet)
```typescript
const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
});
```

### Mainnet (Production)
```typescript
const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.exchange',
  network: 'mainnet',
});
```

---

## Troubleshooting

### Docker Services Not Starting
```bash
# Check Docker status
docker ps

# View logs
docker compose -f test.docker-compose.yml logs arkd
docker compose -f test.docker-compose.yml logs boltz-backend

# Reset environment
pnpm regtest:down
docker system prune -f
pnpm regtest
```

### Tests Failing
```bash
# Ensure regtest is running
pnpm regtest:up

# Verify services are healthy
curl http://localhost:7070/v1/info      # arkd
curl http://localhost:9001/v1/info      # Boltz
curl http://localhost:3000/api/blocks/tip/height  # Bitcoin

# Re-run setup
pnpm regtest:setup
```

### Port Conflicts
```bash
# Check ports in use
lsof -i :7070    # arkd
lsof -i :9001    # Boltz
lsof -i :18443   # Bitcoin

# Kill conflicting processes
kill -9 <PID>
```
