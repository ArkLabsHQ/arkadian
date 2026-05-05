# Arkade Boltz Swap Library — Project Overview

## What is boltz-swap?

**boltz-swap** (`@arkade-os/boltz-swap`) is a production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. It provides bidirectional swaps between Lightning and Arkade with automated monitoring, comprehensive error handling, and automatic refund capabilities.

**Repository**: `git@github.com:arkade-os/boltz-swap.git`
**NPM Package**: `@arkade-os/boltz-swap@0.3.26`
**Language**: TypeScript
**Build System**: tsup (ESM + CJS bundles)
**Test Framework**: Vitest
**Package Manager**: pnpm@10.25.0

---

## Core Capabilities

### Lightning Integration
- **Receive Lightning Payments**: Create Lightning invoices that deposit funds into Arkade wallets
- **Send Lightning Payments**: Pay Lightning invoices from Arkade balance
- **Invoice Decoding**: Validate and decode BOLT11 Lightning invoices
- **Swap Limits**: Query and validate minimum/maximum swap amounts
- **Fee Calculation**: Calculate swap fees for both submarine and reverse swaps

### Swap Management
- **Automated Monitoring**: SwapManager with WebSocket + polling fallback
- **Automatic Claim/Refund**: Executes swap actions when conditions are met
- **Persistent Storage**: Stores swap state in wallet's contract repository
- **Swap History**: Query pending and completed swaps
- **Event-Driven Architecture**: Subscribe to swap lifecycle events

### VHTLC Support
- **Virtual HTLC Creation**: Creates Arkade-specific HTLCs for swap contracts
- **Batch Monitoring**: Tracks VHTLCs across Arkade batch rounds
- **Refund Handling**: Automatic timelock-based refunds for failed swaps
- **Recovery**: Restore and resume pending swaps after app restart
- **User-Initiated Submarine Recovery**: `inspectSubmarineRecovery`, `scanRecoverableSubmarineSwaps`, `recoverSubmarineFunds`, `recoverAllSubmarineFunds` — surface and sweep funds stranded at submarine VHTLC lockup addresses (failed swaps that never refunded, or successful swaps with extra deposits). Inspection is side-effect free and Boltz-amnesia-tolerant (queries only the local repo + Ark indexer). Post-CLTV recovery uses `refundWithoutReceiver` so funds remain reachable even if Boltz purges the swap.

### Error Handling
- **Structured Errors**: Type-safe error classes for all failure modes
- **Automatic Refunds**: SwapManager handles refunds for expired/failed swaps
- **Retry Logic**: Exponential backoff for network operations
- **Timeout Management**: Configurable timeouts for swap operations
- **Unknown-to-Provider Safety Net**: SwapManager stops polling and transitions a swap to terminal `swap.expired` after 10 consecutive Boltz HTTP 404 responses matching the "could not find swap" body. Avoids hammering Boltz with requests for swap IDs unknown to the configured endpoint (typically after a Boltz endpoint switch). Surfaces `SwapNotFoundError` via `onSwapFailed`, while `swapUpdateListeners` and per-swap subscribers see the terminal transition.

---

## Use Cases

### For End-User Wallets
- **Lightning Deposits**: Users pay Lightning invoices to fund their Arkade wallets
- **Lightning Withdrawals**: Users pay Lightning invoices from their Arkade balance
- **Unified Balance**: Seamlessly move between Lightning and Arkade without manual swap management
- **Background Processing**: Swaps complete automatically while app runs

### For Arkade Applications
- **Payment Integration**: Accept Lightning payments in Arkade-powered apps
- **Liquidity Management**: Move funds between Lightning and Arkade layers
- **Cross-Network Payments**: Route payments across Lightning and Arkade networks
- **Service Worker Support**: Integrate swaps in PWAs and offline-capable apps

### For Developers
- **Production-Ready**: Comprehensive error handling, retry logic, and failover
- **Type-Safe**: Full TypeScript support with strict types
- **Event-Driven**: Subscribe to swap events for UI updates
- **Testing Tools**: Docker-based regtest environment for integration testing

---

## Key Components

### ArkadeLightning
Main integration class that coordinates wallet operations and swap provider:
- Creates Lightning invoices (reverse swaps)
- Sends Lightning payments (submarine swaps)
- Manages VHTLCs (Virtual HTLCs)
- Interfaces with SwapManager
- Provides high-level API for applications

### BoltzSwapProvider
Client for Boltz API server:
- Swap creation (submarine and reverse)
- Status monitoring via REST and WebSocket
- Fee and limit queries
- Network-specific endpoints (regtest, mutinynet, mainnet)
- Referral ID support

### SwapManager
Background service for automated swap monitoring:
- Single WebSocket connection for all swaps
- Automatic polling after WebSocket connects
- Fallback polling with exponential backoff
- Auto-claim for completed swaps
- Auto-refund for expired/failed swaps
- Event subscription for UI updates
- Resume on app restart

### VHTLC Utilities
Arkade-specific HTLC implementation:
- Creates Virtual HTLCs for swap contracts
- Monitors VHTLC status across rounds
- Handles refunds via Arkade wallet contract repository
- Integrates with Arkade batch system

---

## Technology Stack

### Dependencies
- `@arkade-os/sdk@0.4.23` — Arkade Wallet SDK for VTXO operations
- `@noble/hashes` — Cryptographic hashing
- `@scure/base` — Base encoding/decoding
- `@scure/btc-signer` — Bitcoin transaction signing
- `bip68` — BIP68 relative timelocks
- `light-bolt11-decoder` — BOLT11 invoice decoding

### Build & Tooling
- **tsup** — TypeScript bundler (ESM + CJS)
- **vitest** — Unit and integration testing
- **prettier** — Code formatting
- **TypeScript 5.9+** — Type checking
- **pnpm 10.25.0** — Package management
- **Docker Compose** — Regtest environment

---

## Project Structure

```
boltz-swap/
├── src/
│   ├── arkade-lightning.ts      # Main ArkadeLightning class
│   ├── boltz-swap-provider.ts   # Boltz API client
│   ├── swap-manager.ts          # Background monitoring service
│   ├── batch.ts                 # VHTLC batch handling
│   ├── types.ts                 # Type definitions
│   ├── errors.ts                # Error hierarchy
│   ├── logger.ts                # Logging utilities
│   └── utils/
│       ├── decoding.ts          # Invoice decoding
│       ├── signatures.ts        # Cryptographic signatures
│       ├── swap-helpers.ts      # Swap utility functions
│       ├── polling.ts           # Polling utilities
│       ├── restoration.ts       # Swap restoration logic
│       └── identity.ts          # Identity utilities
├── test/
│   ├── arkade-lightning.test.ts # Unit tests for ArkadeLightning
│   ├── swap-manager.test.ts     # Unit tests for SwapManager
│   ├── boltz-swap-provider.test.ts # Unit tests for provider
│   └── e2e/
│       ├── arkade-lightning.test.ts # E2E tests
│       ├── integration.test.ts   # Integration tests
│       └── setup.mjs            # Regtest setup script
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── test.docker-compose.yml      # Regtest environment
```

---

## Swap Types

### Submarine Swaps (Lightning → Arkade)
**Flow**:
1. User generates Lightning invoice with `createLightningInvoice()`
2. Boltz locks funds on Lightning Network
3. User pays invoice via external Lightning wallet
4. boltz-swap detects payment via WebSocket/polling
5. Arkade wallet claims funds using preimage
6. Funds appear in Arkade wallet balance

**Use Case**: Deposit Lightning liquidity into Arkade wallet

### Reverse Submarine Swaps (Arkade → Lightning)
**Flow**:
1. User calls `sendLightningPayment()` with Lightning invoice
2. Boltz generates onchain/VHTLC lockup address
3. Arkade wallet creates VHTLC with hashlock
4. Boltz pays Lightning invoice, revealing preimage
5. Arkade wallet claims VHTLC using preimage
6. Swap completes

**Use Case**: Pay Lightning invoices from Arkade balance

---

## Integration with Arkade Ecosystem

### Wallet Integration
- Uses `@arkade-os/sdk` Wallet or ServiceWorkerWallet classes
- Stores swap state in wallet's contract repository (persistent storage)
- Creates VHTLCs via wallet's contract creation methods
- Queries VTXO status for swap monitoring

### PWA Support
- Compatible with ServiceWorkerWallet for Progressive Web Apps
- IndexedDB storage via SDK's storage adapters
- Background monitoring while app is active
- Resume pending swaps on app reopen

### Arkade Batch System
- VHTLCs participate in Arkade batch rounds
- Claims executed during settlement windows
- Refunds available after timelock expiry
- Batch monitoring via wallet contract repository

---

## Status & Production Readiness

**Current Status**: Active Development
**Production Readiness**: ✓ Beta
**Version**: 0.3.26
**Stability**: Stable API, active feature development

**Recent Improvements (0.3.24 → 0.3.26)**:
- **Unknown-to-Boltz safety net**: `SwapManager` now tracks consecutive `SwapNotFoundError`s per swap (`NOT_FOUND_THRESHOLD = 10`, ≈5-minute grace at the default 30s poll cadence). After the threshold, the swap is transitioned to terminal `swap.expired`, persisted, removed from monitoring, and reported via `onSwapFailed` with `SwapNotFoundError`. Bypasses `handleSwapStatusUpdate` so no claim/refund actions are fired against a Boltz instance that has no record of the swap. Counter is cleared on any successful poll/WS update.
- **Subscribers receive the terminal transition**: when the safety net trips, `swapUpdateListeners` and per-swap `swapSubscriptions` are now invoked with `(swap, oldStatus)` mirroring `handleSwapStatusUpdate`'s emission shape, so `waitForSwapCompletion` and UI subscribers see the `swap.expired` resolution before the subscription set is dropped.
- **New `SwapNotFoundError`** (extends `NetworkError`, statusCode 404, exported from `src/index.ts`): thrown by `BoltzSwapProvider.getSwapStatus` when Boltz returns a 404 with body matching `"could not find swap"`. Distinguishes a real "swap unknown to this Boltz instance" from a generic 404 (route change, proxy misconfig) so only the former drives the per-swap counter. Detection is defensive — matches either parsed `errorData.error` JSON field or the raw message text.
- **Production endpoint switch**: `BASE_URLS.bitcoin` changed from `https://api.ark.boltz.exchange` to `https://api.boltz.exchange` (canonical Boltz mainnet endpoint). Existing swap IDs from the previous endpoint will now naturally trip the safety net rather than hang in monitoring forever.
- `@arkade-os/sdk` bumped 0.4.22 → 0.4.23.

**Production Features**:
- Comprehensive error handling with typed errors
- Automatic retry logic with exponential backoff
- Persistent swap state with crash recovery
- WebSocket + polling fallback for reliability
- Unit, integration, and E2E test coverage
- Docker-based regtest environment for testing

**Known Limitations**:
- SwapManager requires app to be running (service worker support planned)
- Expired swaps refunded on next app launch (not instant)
- WebSocket reconnection may take up to 60 seconds

---

## Documentation References

- **Usage Guide**: `testing/usage.md` — Quick start and common workflows
- **Architecture**: `system/architecture.md` — Module structure and design patterns
- **Testing**: `testing/how_to_test.md` — Running unit and integration tests
- **Troubleshooting**: `testing/troubleshooting.md` — Common issues and debugging
- **Development Workflow**: `sop/development-workflow.md` — PR workflow and guidelines
