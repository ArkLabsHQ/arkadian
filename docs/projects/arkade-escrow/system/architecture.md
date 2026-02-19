# Architecture: arkade-escrow

## Overview

arkade-escrow is a TypeScript monorepo with three applications sharing the root `package.json` for the server and independent `package.json` files for each frontend app.

```
arkade-escrow/
├── server/src/            # NestJS API server (port 3002)
│   ├── app.module.ts      # Root module — wires everything together
│   ├── main.ts            # Bootstrap, Swagger setup, asset rewriting
│   ├── ark/               # Ark protocol integration
│   ├── auth/              # JWT + Schnorr signature auth
│   ├── escrows/           # Core escrow domain
│   │   ├── contracts/     # Contract CRUD, execution, signing
│   │   ├── requests/      # Orderbook and request lifecycle
│   │   └── arbitration/   # Dispute resolution
│   ├── admin/             # Backoffice admin API (basic auth)
│   ├── common/            # Shared types, SSE, events, filters, pipes
│   ├── users/             # User entity and management
│   ├── crypto/            # Crypto utilities
│   └── health.controller  # Health check endpoint
├── client/                # React SPA — user-facing escrow interface
│   └── src/pages/         # Orderbook, Contracts, Requests, Identity, etc.
├── backoffice/            # React SPA — admin/arbitrator panel
│   └── src/components/    # ContractTimeline, StatusBadge, DemoModeBanner
└── data/db.sqlite         # SQLite database (auto-created)
```

## NestJS Module Graph

```
AppModule
├── ServeStaticModule      # Serves client/ and backoffice/ as static files
├── EventEmitterModule     # Decoupled event-driven communication
├── ConfigModule           # Global env var access
├── TypeOrmModule          # SQLite with auto-load entities
├── AuthModule             # JWT + Schnorr challenge-response
├── EscrowsModule          # Core escrow logic
│   ├── ContractsController + Service
│   ├── RequestsController + Service
│   └── ArbitrationController + Service
├── UsersModule            # User CRUD
├── AdminModule            # Backoffice-only admin API
├── ArkModule              # Ark SDK integration
│   ├── ArkService         # VEC scripts, tx building, execution
│   └── FundingWatcherService  # Polls for funded VTXOs
└── HealthModule           # GET /health
```

## Key Architectural Decisions

**Static Serving**: The NestJS server serves both client and backoffice SPAs via `@nestjs/serve-static`, so all three apps run behind a single port (3002). Asset URL rewriting in `main.ts` routes `/assets/*` to the correct app based on the Referer header.

**Authentication**: Users authenticate by signing a random challenge with their Bitcoin private key (Schnorr/BIP340). The server verifies the signature against the claimed public key and issues a JWT. No passwords are stored.

**Ark Integration**: `ArkService` uses `@arkade-os/sdk` to build Virtual Escrow Contract (VEC) scripts, construct off-chain transactions (PSBTs), and submit them to arkd. `FundingWatcherService` polls the Ark indexer for funded VTXOs and emits events.

**Event-Driven**: `@nestjs/event-emitter` decouples funding detection from contract updates. `ServerSentEventsService` pushes real-time updates to connected clients.

**Backoffice Protection**: The backoffice routes are protected by `BasicAuthMiddleware` with configurable username/password via env vars.

## Data Model (TypeORM Entities)

| Entity | Key Fields |
|--------|-----------|
| User | id, publicKey, challengeId, challengeHash |
| EscrowRequest | id, creatorId, side (sender/receiver), amount, description, status |
| EscrowContract | id, requestId, senderId, receiverId, senderPubKey, receiverPubKey, contractNonce, status |
| ContractExecution | id, contractId, action, arkTx, checkpoints, signatures, txid |
| ContractArbitration | id, contractId, decision, reason, executionId |

## Request Flow Example: Direct Settlement

1. Client calls `POST /api/v1/escrows/contracts/:id/execute` with `action: "direct-settle"`
2. `EscrowsContractsService` loads contract, calls `ArkService.createEscrowTransaction()`
3. `ArkService` restores VEC script, selects spending path, builds PSBT via `buildOffchainTx()`
4. Returns unsigned PSBT to client — both sender and receiver sign in browser
5. Each party calls `POST /api/v1/escrows/contracts/:id/sign-execution` with their signature
6. When all required signatures collected, server co-signs and calls `ArkService.executeEscrowTransaction()`
7. Transaction submitted to arkd via `provider.submitTx()` + `provider.finalizeTx()`
