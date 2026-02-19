---
project_id: arkade-escrow
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/api-reference.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/api-reference.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md", "system/architecture.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  escrow: ["system/project_overview.md", "system/integration-with-arkd.md"]
  integration: ["system/integration-with-arkd.md"]
scripts:
  dev: "npm run dev"
  dev_api: "npm run dev:api"
  dev_client: "npm run dev:client"
  dev_backoffice: "npm run dev:backoffice"
  test: "npm run test"
  test_unit: "npm run test:api:unit"
  test_acceptance: "npm run test:api:acceptance"
  build: "npm run build"
  lint: "npm run lint"
  typecheck: "npm run typecheck"
  docker_up: "make up"
  docker_down: "make down"
---

# Arkade Escrow — Project Index

**arkade-escrow** is a lightweight, browser-native escrow platform for instant, trust-minimized Bitcoin deals on Ark. Deployable as a standalone web app or embedded inside any Ark-enabled wallet via iframe. Built around a 2-of-3 multisig design (Sender, Receiver, Arbitrator) and powered by the Ark protocol via @arkade-os/sdk.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/` — System Architecture & Components

- **system/project_overview.md** — What arkade-escrow is, features, escrow flows, and use cases
- **system/architecture.md** — Monorepo architecture, NestJS modules, React clients, escrow contract scripts
- **system/integration-with-arkd.md** — How arkade-escrow integrates with arkd via @arkade-os/sdk

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/` — Usage & Operations

- **testing/usage.md** — Quick start, configuration, and deployment guide
- **testing/api-reference.md** — REST API endpoints (contracts, requests, arbitration, auth)
- **testing/how_to_run.md** — Running the project (Docker and local development)
- **testing/how_to_test.md** — Unit tests, E2E tests, and acceptance tests
- **testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/` — Standard Operating Procedures

- **sop/development-workflow.md** — Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History

- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries

---

## Key Concepts

### Escrow Flow
1. **Request** — Party creates an escrow request (buy/sell offer on the orderbook)
2. **Contract** — Counterparty accepts, creating a contract with deterministic Ark address
3. **Funding** — Sender funds the contract address with Bitcoin (watched by FundingWatcherService)
4. **Execution** — Release (to receiver), refund (to sender), or direct settle (mutual agreement)
5. **Arbitration** — If disputed, arbitrator co-signs with the winning party

### Virtual Escrow Contract (VEC)
A Taproot-based VtxoScript with 6 spending paths:
- **Collaborative** (with server): release (recv+arb+srv), refund (send+arb+srv), direct (send+recv+srv)
- **Unilateral** (with timelock): same 3 pairs without server, after CSV delay

### Deployment Modes
- **Standalone** — Full web app with orderbook, wallet, escrow management
- **Hosted** — Embedded inside an Ark-enabled wallet (e.g., Arkade wallet) via iframe

---

## Quick Reference

### Environment Variables
```bash
# Server (root .env)
JWT_SECRET=<secret>           PORT=3002
NODE_ENV=development          SQLITE_DB_PATH=./data/db.sqlite
ARBITRATOR_PUB_KEY=<hex>      ARBITRATOR_PRIV_KEY=<hex>
ARK_SERVER_URL=http://localhost:7070

# Client (client/.env)
VITE_API_BASE_URL=http://localhost:3002/api/v1
VITE_APP_ROOT_URL=/client     VITE_ITEMS_PER_PAGE=20

# Backoffice (backoffice/.env)
VITE_API_BASE_URL=http://localhost:3002/api/v1
VITE_APP_ROOT_URL=/backoffice VITE_ITEMS_PER_PAGE=20
```

### Common Commands
```bash
npm install            # Install all dependencies
npm run dev            # Run server + client + backoffice concurrently
npm run dev:api        # Run API server only (NestJS watch mode)
npm run dev:client     # Run client Vite dev server (port 3001)
npm run dev:backoffice # Run backoffice Vite dev server (port 8080)
npm run test           # Run unit tests (Jest)
npm run build          # Build NestJS server
npm run ci:check       # Biome CI check (lint + format)
make up                # Docker Compose dev stack
make down              # Stop Docker Compose
```

### URLs (Development)
- API + Static: `http://localhost:3002`
- Swagger UI: `http://localhost:3002/api/v1/docs`
- Client App: `http://localhost:3002/client/`
- Backoffice: `http://localhost:3002/backoffice/`

---

## Architecture Overview

### Monorepo Structure
```
arkade-escrow/
├── server/src/            # NestJS API server
│   ├── ark/               # Ark protocol integration (VEscrow, ArkService, FundingWatcher)
│   ├── auth/              # JWT auth with Schnorr signature challenge-response
│   ├── escrows/           # Core escrow logic
│   │   ├── contracts/     # Contract lifecycle (create, fund, execute, sign)
│   │   ├── requests/      # Orderbook and escrow request management
│   │   └── arbitration/   # Dispute resolution
│   ├── admin/             # Backoffice admin API (basic auth protected)
│   ├── common/            # Shared types, SSE service, events, filters
│   └── users/             # User management
├── client/                # React SPA — escrow user interface (Vite + Tailwind)
└── backoffice/            # React SPA — admin/arbitrator panel (Vite + Tailwind)
```

### Technology Stack
- **Backend**: NestJS 11, TypeScript 5.9, TypeORM, SQLite (better-sqlite3)
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Redux Toolkit
- **Crypto**: @noble/secp256k1, @noble/hashes, @arkade-os/sdk
- **Auth**: JWT + Schnorr signature challenge-response (no passwords)
- **Testing**: Jest 30, Supertest (unit + E2E)
- **Quality**: Biome.js (lint + format), TypeScript strict

---

## Documentation Size Guidelines

- **usage/how-to**: <= 120 lines
- **architecture**: <= 700 words
- **API reference**: <= 200 lines per endpoint group
- **SOP procedures**: <= 120 lines
