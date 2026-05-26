# Arkade Boltz Swap Library — Project Overview

> ⚠️ **REPOSITORY DEPRECATED (2026-05-25, README PR [#153](https://github.com/arkade-os/boltz-swap/pull/153))**
> The standalone `arkade-os/boltz-swap` repository is no longer under active development. Development has moved to the [`@arkade-os/ts-sdk`](https://github.com/arkade-os/ts-sdk) **pnpm workspace monorepo**, which now vendors the `@arkade-os/boltz-swap` package at `packages/boltz-swap/` (still published to npm under the same name and version line). **Open all new issues and pull requests against `arkade-os/ts-sdk`.** The npm package remains the published surface — downstream consumers installing `@arkade-os/boltz-swap` are unaffected.

## What is boltz-swap?

**boltz-swap** (`@arkade-os/boltz-swap`) is a production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. It provides bidirectional swaps between Lightning and Arkade with automated monitoring, comprehensive error handling, and automatic refund capabilities.

**Repository**: `git@github.com:arkade-os/boltz-swap.git`
**NPM Package**: `@arkade-os/boltz-swap@0.3.32`
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
- Referral ID support (defaults to `"arkade-ts-sdk"` when caller does not supply one)

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
- `@arkade-os/sdk@0.4.27` — Arkade Wallet SDK for VTXO operations
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

**Current Status**: ⚠️ Repository deprecated — development moved to `arkade-os/ts-sdk` monorepo (`packages/boltz-swap/`). Standalone repo no longer accepts issues/PRs.
**Production Readiness**: ✓ Beta (package itself still published to npm as `@arkade-os/boltz-swap`)
**Version**: 0.3.32
**Stability**: Stable API; future development happens in the ts-sdk monorepo

**Recent Changes (2026-05-25, repo-level)**:
- **README deprecation notice** (PR [#153](https://github.com/arkade-os/boltz-swap/pull/153), commit `18bb9ee`). The repository README now opens with a `[!WARNING]` callout directing all new issues and pull requests to [`@arkade-os/ts-sdk`](https://github.com/arkade-os/ts-sdk). README-only change — no `src/`, test, or `package.json` changes. The npm package `@arkade-os/boltz-swap@0.3.32` is unchanged on the registry; the migrated copy in `arkade-os/ts-sdk` (`packages/boltz-swap/`) is byte-for-byte the same release.

**Recent Improvements (post-0.3.32: quoteSwap guard, unreleased)**:
- **Guard chain-swap quote acceptance against adversarial Boltz quotes** (commits `3df5311`, `db39c2d`, `0dec8b3`). `ArkadeSwaps.quoteSwap` previously blind-accepted whatever amount Boltz returned via `getChainQuote` — a Boltz instance (or a MITM in front of it) could return a tiny amount that the wallet would then sign off on. The renegotiation path on `transaction.lockupFailed` (both Arkade → BTC and BTC → Arkade autopilot loops) is now floored against the original `response.claimDetails.amount`, with `non_positive` quotes also rejected outright.
- **New `QuoteRejectedError`** (exported from `src/index.ts`, extends `SwapError`) with discriminated `reason` codes `"below_floor"` / `"non_positive"` / `"no_baseline"`. The `QuoteRejectedOptions` type is a discriminated union so each reason statically requires its own metadata (`below_floor` ↔ `{ quotedAmount, floor }`; `non_positive` ↔ `{ quotedAmount }`; `no_baseline` carries neither). Serialized across the ServiceWorker `postMessage` boundary via a `QUOTE_REJECTED::` prefix in `Error.message` (structured clone strips custom `.name` and own properties on Error subclasses, but preserves `.message`), then reconstructed in the runtime so SW callers can `instanceof`-check exactly like in-process callers. In-process `QuoteRejectedError`s skip the encode/decode round trip.
- **New public API** alongside `quoteSwap` (also wired through `IArkadeSwaps`, `ExpoArkadeSwaps`, and the SW message handler/runtime):
  - `getSwapQuote(swapId)` — fetch a Boltz quote without committing.
  - `acceptSwapQuote(swapId, amount, options?)` — validate-then-post a specific amount.
  - `quoteSwap(swapId, options?)` — new `QuoteSwapOptions` parameter (`minAcceptableAmount?: number`, `maxSlippageBps?: number` default 0); options validated as positive integers (`minAcceptableAmount=0` is rejected — it would silently restore the old blind-accept behaviour).
- **Floor-resolution rules** (in order): `options.minAcceptableAmount` if provided; otherwise the stored `BoltzChainSwap.response.claimDetails.amount` (looked up via the swap repository); otherwise throws `QuoteRejectedError({ reason: "no_baseline" })`. Slippage uses subtract-then-floor (`Math.floor(floor - (floor * slippageBps) / 10000)`) instead of multiply-then-divide so the math stays correct for floors above `MAX_SAFE_INTEGER / 10000` (~9e11 sats).
- **Autopilot `claimDetails` guard** — both renegotiation call sites (`transaction.lockupFailed` branches in the Arkade → BTC and BTC → Arkade waiters) build the options via a `quoteOptionsForSwap` helper that tolerates restored swaps from older persisted formats with a missing `claimDetails.amount` (falls through to the repository lookup, which then routes to `no_baseline` and aborts the renegotiation cleanly instead of crashing). Renegotiation failures wrap the inner error via the new `ErrorOptions.cause` (threaded through `SwapError`) so callers can `instanceof`-check the wrapped `QuoteRejectedError`.
- **Test coverage**: ~180 added lines in `test/arkade-swaps.test.ts` covering option validation (including the `minAcceptableAmount=0` rejection), behavioural rejection of quotes below floor / non-positive / no-baseline, and the autopilot `cause` thread-through; ~140 added lines in `test/serviceWorker/arkade-swaps-runtime.test.ts` covering the transport-error encode/decode round trip and `instanceof QuoteRejectedError` recovery in SW callers.
- No version bump (still `@arkade-os/boltz-swap@0.3.32`, `@arkade-os/sdk@0.4.27`).

**Recent Improvements (0.3.31 → 0.3.32)**:
- **`@arkade-os/sdk` bumped 0.4.26 → 0.4.27** (commit `e0837db`). 0.3.32 cuts the SDK upgrade — no boltz-swap `src/` changes.
- **Regtest harness upgraded to arkd / arkd-wallet v0.9.5 + fulmine v0.3.23** (commits `499c4a0`, `983cf62`, `ad4d175`). `.env.regtest` overrides realigned to the wallet's existing arkd config:
  - **Scheduler switched from `block` → `gocron`** and the `ARKD_ALLOW_CSV_BLOCK_TYPE=true` flag was dropped. Under gocron, settlement rounds tick on a timer — mixing block-typed and seconds-typed CSV delays is rejected without the flag, so `ARKD_VTXO_TREE_EXPIRY` and `ARKD_BOARDING_EXIT_DELAY` are restored to **seconds-typed** values (5120 / 7200, up from the previous block-typed 200 / 1024) to match the wallet's defaults.
  - New keys: `ARKD_SESSION_DURATION=10`, `ARKD_LOG_LEVEL=6`, `BOLTZ_IMAGE=boltz/boltz:latest`. `BITCOIN_LOW_FEE` flipped `false → true` (the regtest `start-env.sh` nbxplorer guard handles the missing container case gracefully now).
  - `regtest` submodule pointer bumped (`3ac33b6` → `dc23da2`).
- **VtxoManager-enabled receive test stabilised for gocron** (commit `983cf62`, `test/e2e/arkade-swaps.test.ts`). With gocron, a just-claimed VTXO can be re-registered into the next settlement round between the claim and an immediate `getBalance()` snapshot. The test now polls via `waitForBalance(() => defaultWallet.getBalance(), 1, 10_000)` — the same pattern used elsewhere in the suite — instead of asserting on a single snapshot.

**Recent Improvements (0.3.30 → 0.3.31)**:
- **Expo background-task subpath isolation** (commit `3039456`, fix for [#136](https://github.com/arkade-os/boltz-swap/issues/136)) — **breaking for Expo callers**. The OS-task helpers (`defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `unregisterExpoSwapBackgroundTask`) moved from `@arkade-os/boltz-swap/expo` to a new dedicated subpath `@arkade-os/boltz-swap/expo/background`. Reason: lazy `require()` inside `/expo` was invisible to Metro's static dependency collector, so `expo-task-manager` / `expo-background-task` never entered the bundle graph and resolution failed at runtime. The new subpath uses static imports, and is the **only** module that pulls in those native packages — keeping it isolated lets react-native-web and Node consumers use `/expo` without them. `ExpoArkadeSwaps.setup()` no longer registers the OS task itself; callers must explicitly invoke `await registerExpoSwapBackgroundTask(taskName, { minimumInterval })` and `await unregisterExpoSwapBackgroundTask(taskName)` on teardown. The `background` config dropped `taskName` and `minimumBackgroundInterval` — TS callers get a compile error, JS callers get a runtime warning via `warnOnRemovedBackgroundFields` (silently ignored otherwise, so the OS task would never run if not migrated).
- **Optional Expo peerDependencies** (commit `fd75612`) — `expo-task-manager` (`>=3.0.0`) and `expo-background-task` (`>=0.1.0`) are now declared as **optional** `peerDependencies` with `peerDependenciesMeta`, so package managers warn consumers when missing and `tsup` externalises them via the standard route (drops the explicit `--external` flags from the build script). New unit tests cover `warnOnRemovedBackgroundFields` for both removed fields, the combined case, and null / non-object inputs.
- **ServiceWorker half-initialized handler recovery** (carried over from the post-0.3.30 work, now shipping in 0.3.31): after a SW restart the message bus can be re-initialized (via the wallet's restart-recovery path) before the page-side `ArkadeSwaps` init payload is re-sent, leaving `handler.handler` undefined. The handler throws a typed `HandlerNotInitializedError` (`HANDLER_NOT_INITIALIZED` = `"ArkadeSwaps handler not initialized"`) for non-`INIT` requests in that window, and the runtime's reinit-retry path treats it as recoverable alongside `MESSAGE_BUS_NOT_INITIALIZED` — re-sends the cached `INIT_ARKADE_SWAPS` payload and retries the original request transparently to callers.
- Version bump 0.3.30 → 0.3.31; `@arkade-os/sdk` unchanged at 0.4.26; `pnpm-lock.yaml` regenerated.

**Recent Improvements (0.3.29 → 0.3.30)**:
- `BoltzSwapProvider` now defaults `referralId` to `"arkade-ts-sdk"` when the caller does not supply one — every submarine, reverse, and chain swap request is automatically tagged unless explicitly overridden.
- `@arkade-os/sdk` bumped 0.4.25 → 0.4.26.

**Recent Improvements (0.3.28 → 0.3.29)**:
- `@arkade-os/sdk` bumped 0.4.24 → 0.4.25 (no boltz-swap source changes — release 0.3.29 is the SDK upgrade cut).

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
