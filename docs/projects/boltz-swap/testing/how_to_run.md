# Arkade Boltz Swap — How to Run

## Development Setup

### Prerequisites
- Node.js 22+
- pnpm 10.25.0
- Docker and Docker Compose (for regtest environment)

### Install Dependencies

```bash
# Clone with submodules (regtest harness lives in the arkade-regtest submodule)
git clone --recurse-submodules git@github.com:arkade-os/boltz-swap.git
cd boltz-swap
pnpm install

# If you already cloned without submodules:
git submodule update --init --recursive
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
# Start regtest environment first (uses arkade-regtest submodule)
pnpm regtest:start
pnpm test:setup-docker

# Run integration tests
pnpm test:integration

# Stop regtest environment
pnpm regtest:stop
```

### All Tests
```bash
# Run all tests (unit + integration)
pnpm test
```

---

## Regtest Environment

Integration testing uses the [`arkade-regtest`](https://github.com/ArkLabsHQ/arkade-regtest) git submodule (replaces the legacy bundled `test.docker-compose.yml`). Image versions and arkd flags are pinned via `.env.regtest`.

### Start Regtest
```bash
# Full one-shot: clean → start → setup wallets
pnpm regtest

# Or step by step:
pnpm regtest:clean   # Tear down + remove volumes
pnpm regtest:start   # ./regtest/start-env.sh
pnpm test:setup-docker  # Initialize wallets
```

### Services
- **Bitcoin (Nigiri)**: Port 18443 (RPC), 3000 (Esplora)
- **NBXplorer**: Port 32838
- **arkd-wallet**: Port 6060 (pinned to `v0.9.5` via `.env.regtest`)
- **arkd**: Port 7070 (pinned to `v0.9.5`, gocron scheduler with seconds-typed CSV delays)
- **Boltz Backend**: Port 9001 (`boltz/boltz:latest`)
- **fulmine** (optional): pinned to `v0.3.23`

### Stop Regtest
```bash
pnpm regtest:stop
```

### Configuration (`.env.regtest`)
The repo's `.env.regtest` overrides arkade-regtest defaults:
- Pins arkd / arkd-wallet to `v0.9.5`, fulmine to `v0.3.23`, Boltz to `boltz/boltz:latest`
- Uses `ARKD_SCHEDULER_TYPE=gocron` (matches the wallet's existing arkd config); the previous `block` scheduler + `ARKD_ALLOW_CSV_BLOCK_TYPE=true` override is gone. Under gocron, mixing block-typed and seconds-typed CSV delays is rejected, so the timelock-related vars below are **seconds-typed**.
- Sets `ARKD_VTXO_TREE_EXPIRY=5120` (seconds), `ARKD_BOARDING_EXIT_DELAY=7200` (seconds), `ARKD_SESSION_DURATION=10`, `ARKD_ROUND_INTERVAL=3`, `ARKD_LOG_LEVEL=6`
- `BITCOIN_LOW_FEE=true` (the regtest `start-env.sh` nbxplorer guard handles the missing container case gracefully)
- Zeroes Ark on/off-chain input/output fees — `faucetOffchain` uses `wallet.settle()` without a fee budget

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

# View logs (services live under regtest/ submodule compose stack)
docker compose -f regtest/docker-compose.yml logs arkd
docker compose -f regtest/docker-compose.yml logs boltz-backend

# Reset environment
pnpm regtest:clean
docker system prune -f
pnpm regtest
```

### Tests Failing
```bash
# Ensure regtest is running
pnpm regtest:start

# Verify services are healthy
curl http://localhost:7070/v1/info      # arkd
curl http://localhost:9001/v1/info      # Boltz
curl http://localhost:3000/api/blocks/tip/height  # Bitcoin

# Re-run setup
pnpm test:setup-docker
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
