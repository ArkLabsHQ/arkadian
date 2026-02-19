# boltz-swap -- How to Run

## Prerequisites

- Node.js >= 22
- pnpm 10.25.0
- Docker + Docker Compose (for regtest environment)

## Install Dependencies

```bash
cd /path/to/boltz-swap
pnpm install
```

## Build

```bash
pnpm run build
# Outputs: dist/index.js (ESM), dist/index.cjs (CJS), dist/index.d.ts (types)
```

Build tool is tsup, configured to produce ESM + CJS dual format with TypeScript declarations.

## Development

This is a library, not a standalone service. For development:

1. **Build the library**: `pnpm run build`
2. **Run unit tests**: `pnpm test:unit`
3. **Run regtest environment** for integration tests:

```bash
# Full regtest setup (builds Docker, starts services, configures)
pnpm regtest

# Or step by step:
pnpm regtest:build     # Build Docker images
pnpm regtest:up        # Start arkd, arkd-wallet, nbxplorer, postgres
pnpm regtest:setup     # Configure the environment (node test/e2e/setup.mjs)
```

## Regtest Environment

The `test.docker-compose.yml` spins up:
- `arkd` -- Ark server
- `arkd-wallet` -- Wallet service
- `nbxplorer` -- Bitcoin block explorer
- `pgnbxplorer` -- PostgreSQL for nbxplorer
- Additional services as needed

### Start Regtest

```bash
pnpm regtest:up
```

### Stop Regtest

```bash
pnpm regtest:down   # Stops and removes volumes
```

## Environment Variables

The library itself doesn't use env vars directly. Configuration is passed via constructor arguments:

- **Network**: `"bitcoin"` | `"mutinynet"` | `"regtest"`
- **API URL**: Auto-resolved by network, or set `apiUrl` in BoltzSwapProvider config
  - mutinynet: `https://api.boltz.mutinynet.arkade.sh`
  - regtest: `http://localhost:9069`

## Code Quality

```bash
pnpm run format    # Format with Prettier
pnpm run lint      # Check formatting
```
