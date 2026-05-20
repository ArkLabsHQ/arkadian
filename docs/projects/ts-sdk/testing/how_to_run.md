# Ark TypeScript SDK — How to Run

## Prerequisites

- **Node.js** 24 LTS (`.nvmrc` → `24.15.0`; `engines.node` allows `>=22.12.0 <25`)
- **pnpm** 10.29.2+
- **Docker** (for integration tests)
- **nigiri** (local Bitcoin regtest) — `curl https://getnigiri.vulpem.com | bash`

## Install Dependencies

```bash
cd /path/to/ts-sdk
pnpm install
```

## Build

```bash
# Full build (ESM + CJS + types)
pnpm build
```

This produces:
- `dist/esm/` — ES modules
- `dist/cjs/` — CommonJS modules
- `dist/types/` — TypeScript declarations

## Run Regtest Environment

### Option 1: Nigiri with Ark (Recommended)

```bash
# Start nigiri with built-in Ark support
nigiri start --ark

# Run setup script
pnpm test:setup

# When done:
nigiri stop --delete
```

### Option 2: Docker Compose (Custom Stack)

```bash
# Start nigiri first (provides bitcoin, electrs, chopsticks)
nigiri start

# Start Ark stack (arkd, arkd-wallet, nbxplorer, fulmine)
pnpm test:up-docker

# Run setup script
pnpm test:setup-docker

# When done:
pnpm test:down-docker
nigiri stop --delete
```

The docker-compose stack includes:
- **arkd** on port 7070 — Ark server (regtest, block scheduler, 10s rounds)
- **arkd-wallet** on port 6060 — Wallet service
- **nbxplorer** on port 32838 — Bitcoin block indexer
- **pgnbxplorer** on port 5432 — PostgreSQL for NBXplorer
- **fulmine** on ports 7000-7002 — Swap + delegator service

## Run Examples

```bash
# The examples/ directory contains standalone scripts:
ls examples/
# spilman.js  vhtlc.js

# Run an example (requires regtest running):
node examples/spilman.js
```

## Build Documentation

```bash
# Generate TypeDoc API docs
pnpm docs:build

# Open in browser
pnpm docs:open
```

## Environment

The SDK connects to these services:
- **arkd**: `http://localhost:7070` (regtest)
- **Esplora/Chopsticks**: `http://localhost:3000` (via nigiri)
- **Fulmine**: `http://localhost:7000` (delegator)

Public mutinynet endpoints:
- **arkd**: `https://mutinynet.arkade.sh`
- **Esplora**: `https://mutinynet.com/api`
