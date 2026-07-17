---
project_id: boltz-backend
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/api-reference.md"]
  dev:        ["system/architecture.md", "testing/api-reference.md"]
  monitoring: ["system/architecture.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  swaps: ["system/project_overview.md", "testing/api-reference.md"]
  integration: ["system/integration-with-arkd.md"]
scripts:
  start: "npm run start"
  dev: "npm run dev"
  compile: "npm run compile"
  compile_release: "npm run compile:release"
  test_unit: "npm run test:unit"
  docker_regtest_start: "npm run regtest:start"
  docker_regtest_stop: "npm run regtest:stop"
---

# Boltz Backend — Project Index

**boltz-backend** is the official backend powering [Boltz Exchange](https://boltz.exchange/), enabling non-custodial atomic swaps between different Bitcoin layers. It provides trustless swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM chains using Hash Time-Locked Contracts (HTLCs) and Taproot.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/system/` — System Architecture & Components
Core documentation about boltz-backend architecture and design:

- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/project_overview.md** — What boltz-backend is, swap types, and use cases
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/architecture.md** — Hybrid TypeScript + Rust architecture, components
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/system/integration-with-arkd.md** — How boltz-backend integrates with Ark ecosystem via fulmine

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/` — Usage & Operations
Practical guides for using and operating boltz-backend:

- **${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/usage.md** — Quick start guide (Docker and local development)
- **${ARKADIAN_DIR}/docs/projects/boltz-backend/testing/api-reference.md** — REST API endpoints and swap operations

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/sop/` — Standard Operating Procedures
Step-by-step guides for operations.

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/boltz-backend/change-log/` — Recent Changes
Curated summaries of significant changes (`SYNC_HISTORY.md`, `last-sync.txt`).

---

## Key Concepts

### Swap Types
Boltz offers three types of atomic swaps:

1. **Submarine Swaps** (Chain → Lightning)
   - User sends Bitcoin on-chain
   - Receives Lightning payment
   - Use case: Add Lightning liquidity

2. **Reverse Submarine Swaps** (Lightning → Chain)
   - User pays Lightning invoice
   - Receives Bitcoin on-chain
   - Use case: Drain Lightning capacity, exit to on-chain

3. **Chain Swaps** (Chain → Chain)
   - User sends Bitcoin on one chain
   - Receives Bitcoin on another chain
   - Use case: Move between Bitcoin mainchain, Liquid, or EVM chains
   - EVM lockups support 0-amount commitments so renegotiation can populate the actual amount later
   - EVM lockups also accept **underpaid** commitments — the commitment is recorded, the swap is then marked `transaction.lockup.failed` through the normal nursery path, and renegotiation continues from there (Submarine Swaps still reject underpaid commitments)

### Atomic Swap Mechanism
- **HTLCs**: Hash Time-Locked Contracts ensure trustless execution
- **Preimage/Hash**: User generates preimage, server locks funds with hash
- **Claim/Refund**: User claims with preimage, or refunds after timeout
- **Taproot**: Key path spends for privacy and efficiency

### Supported Chains
- **Bitcoin Mainchain**: Native Bitcoin blockchain
- **Lightning Network**: Off-chain payment channels
- **Liquid**: Bitcoin sidechain with confidential transactions
- **EVM Chains**: Ethereum and EVM-compatible networks

---

## Quick Reference

### REST API
```bash
# Get supported swap pairs
curl https://api.boltz.exchange/getpairs

# Create submarine swap (Chain → Lightning)
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{"type":"submarine","pairId":"BTC/BTC","orderSide":"sell","invoice":"lnbc..."}'

# Create reverse submarine swap (Lightning → Chain)
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{"type":"reversesubmarine","pairId":"BTC/BTC","orderSide":"buy","preimageHash":"..."}'

# Get swap status
curl https://api.boltz.exchange/swapstatus?id=<swap_id>
```

### Docker Deployment
```bash
# Clone repository
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend

# Start regtest environment (Bitcoin + Lightning + Liquid)
npm run regtest:start

# Stop regtest environment
npm run regtest:stop
```

### Local Development
```bash
# Prerequisites: Node.js 20+, Rust toolchain
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend

# Install dependencies
npm install

# Compile TypeScript + Rust
npm run compile

# Run backend
npm run dev
```

---

## Configuration

### Database
- **PostgreSQL**: Primary database (production)
- **SQLite**: Development and testing
- **Sequelize ORM**: Database abstraction layer
- **Swap routing metadata** (`swap_metadata` table, PR #1423): optional client-supplied opaque blob (`BYTEA`, ≤ **1024 bytes**, primary key `swap_id`, `created_at` timestamp) attached at swap creation and surfaced on the rescue/restore endpoint. Sequelize migration `2026-05-27-000000-0000_swap_metadata` (also shipped as a Diesel migration under `boltzr/migrations/` so the Rust sidecar's `SwapMetadataHelper` can read it). TypeScript writer: `SwapMetadataRepository.set(swapId, Buffer)` from `SwapRouter` after each `create*Swap` succeeds; Rust reader: `SwapRescue::attach_metadata` populates `RestorableSwap.metadata` (HEX) during `/v2/swap/restore`. The write path is an **upsert** (`SwapMetadata.upsert`, renamed from `add` in PR #1455) so metadata can be re-set idempotently. **PR #1455** also adds `PATCH /v2/swap/{id}/metadata` to set or replace metadata after creation for any swap type — `SwapRouter.patchMetadata` resolves `id` across `SwapRepository` / `ReverseSwapRepository` / `ChainSwapRepository` (`404 SWAP_NOT_FOUND` if none match), rejects unknown body keys with `INVALID_PARAMETER`, validates the `metadata` HEX via the shared `MetadataHex` schema, and writes via `SwapMetadataRepository.set`. The swagger `metadata` fields were refactored to reference a shared `MetadataHex` component schema.
- **EVM-rescue claim-address indexes** (schema **v27**, PR #1434): the Sequelize migration (`case 26`) adds partial indexes `reverseSwaps_claimAddress` and `chainSwapData_claimAddress` (each `WHERE claimAddress IS NOT NULL`) so the new restore-by-EVM-address lookup can search reverse and chain swaps by their on-chain claim address efficiently. Mirrored in the `ReverseSwap` / `ChainSwapData` model index definitions. `Migration.latestSchemaVersion` bumped `26 → 27`.
- **Send-approval holds** (`send_approval_holds` table, PR #1446): tracks sends paused by the `SendApprovalHook`. Primary key `swapId` plus a `type` (`SwapType`) column and `created_at` / `updated_at` timestamps; backed by the `SendApprovalHold` model (`.sync()`-ed in `Database.ts`) and `SendApprovalHoldRepository`. A row exists while a send is held and is removed once the approver accepts or rejects.

### Lightning Integration
- **LND**: gRPC integration — pinned to **v0.21.1-beta** (Docker image, bumped from `v0.21.0-beta` in PR #1452 / `v0.20.1-beta` in PR #1432; the matching `VersionCheck` range moved to `minimal=0.19.0`, `maximal=0.21.1`). The vendored `proto/lnd/router.proto` was refreshed for 0.21.1, clarifying HTLC-interceptor semantics: `ForwardHtlcInterceptRequest` circuit keys must be handled idempotently (replayed after reconnect / when an htlc moves on-chain), and once an incoming channel force-closes only `Settle` has effect on the on-chain HTLC (`Resume`/`ResumeModified`/`Fail` return a stream-terminating error). The `boltzr` sidecar also queries LND's `describe_graph` (`lnd_rpc::ChannelGraphRequest`, PR #1424) so Lightning gossip — node and channel info — is sourced from **both LND and CLN** via the new `GraphLightningInfo` aggregator (replaces the CLN-only `ClnLightningInfo`).
- **CLN**: gRPC integration (boltzr sidecar) — pinned to **v26.06.2** (PR #1449, bumped from `v26.06.1` in PR #1432 / `v26.06` in PR #1426 / `v26.04.1` previously; `VersionCheck` `maximal` raised to `26.06.2`). The `disableMpp` config option and the 24.08 `experimental-offers` startup check were removed; `lib/lightning/cln/Router.ts` switched from the legacy `GetRoute` RPC to `GetRoutes`, which requires the local node id as a `source` argument.
- **Eclair**: pinned to **v0.14.0** (Docker image, bumped from v0.13.1)
- **BOLT12**: Support for offers and blinded paths (hardened)

### Bitcoin / Liquid Nodes
- **Bitcoin Core**: **v31.1** (bumped from `v31.0` in PR #1460; `docker/build.py` `BITCOIN_VERSION` and `VersionCheck` `maximal` `310000 → 310100`)
- **Elements (Liquid)**: **v23.3.3**
- **Lowball backup node removed**: the `[liquid.chain.lowball]` configuration section and the `ElementsWrapper` dual-node code path have been deleted; `liquid.chain` now configures a single Elements RPC endpoint (see PR #1417).
- **Liquid 0-conf observation API** (`[liquid.chain.zeroConfTool]` in `boltz.conf`, optional): when configured, lockup transactions are only considered 0-conf-safe once the bridge observation quorum is reached. Transport is selected by URL scheme — `http(s)://…` uses REST polling (`interval` ms, default `100`; `max_retries`, default `60`), `ws(s)://…` uses WebSocket with a per-tx `deadline_secs` wall-time (default `6`) and optional `rotation_interval_secs` (default `3300`, `0` disables) for **preemptive WebSocket reconnects** before the server-side TTL drops the connection. Falls back to the elementsd mempool check when not configured.

### EVM Chains
- **Arbitrum L1 block height** (`[arbitrum]` in `boltz.conf`, PR #1456): Arbitrum swap locktimes are measured in the **L1** block height, which each Arbitrum block exposes as `l1BlockNumber`. `ArbitrumProvider` reads `l1BlockNumber` (falling back to the block `number`) from its own latest block, so the previous `arbitrum.l1Providers` provider array is **removed** and replaced by a single boolean `regtest` flag (default `false`). If an RPC returns no `l1BlockNumber` and `regtest` is not set the provider throws (fail-loud) instead of falling back to the L2 block number; set `arbitrum.regtest = true` only for regtest/anvil forks, which legitimately omit `l1BlockNumber`. The provider also eagerly fetches the latest block during `init()` so a misconfigured Arbitrum RPC fails fast at startup.

### gRPC Authentication
- **JWT auth interceptor** on the `boltzrpc.Boltz` service (PR #1415). Every call is authenticated against tokens issued by the server itself; the interceptor is configured via the optional `[grpc.jwt]` section in `boltz.conf` (`disable`, `secretFile` — defaults to `<certificates>/jwt.key`, `adminTokenFile` — defaults to `<certificates>/admin.jwt`). On first start a bootstrap **admin token** is written to `<certificates>/admin.jwt` at mode `0600`. Tokens are stored in the new `jwt_tokens` table.
- **Per-token method allowlist**: each JWT carries `allowed_methods` (exact gRPC method paths such as `/boltzrpc.Boltz/GetInfo`, or wildcards `*` / `<service>/*`) and an optional `expires_in_seconds` TTL; expired or revoked tokens are rejected by the interceptor.
- **New RPCs** on `boltzrpc.Boltz`: `IssueJwt`, `RevokeJwt`, `ListJwts`, `ListMethods` (the latter surfaces the exact method paths and wildcard entries the allowlist accepts).
- **`boltzr-cli jwt …`** commands wrap the new RPCs end-to-end for operator workflows.

### Signer Control
- **gRPC signer-control surface** on `boltzrpc.Boltz`: `DisableSigners` / `EnableSigners` / `GetDisabledSigners` operate on a `Signer` enum covering submarine-refund, reverse-claim, chain-refund, chain-claim, deferred-claim, EVM-refund, EVM-commitment-refund, reverse-lockup, chain-lockup, and submarine-invoice-payment signers
- Disabled signers are persisted in the new `disabled_signers` table (Sequelize migration `2026-05-12-000000-0000_disabled_signers`) and enforced by an in-process `SignerControlRegistry` consulted from `ChainSwapSigner`, `DeferredClaimer`, `EipSigner`, `MusigSigner`, `PaymentHandler`, and `SwapNursery`
- `boltzr-cli signer {disable,enable,list-disabled} <SIGNER>…` wraps the new RPCs (and `boltzr` boots accept a CLI flag to enable/disable all signers at startup)
- **Replaces** the previous dev-only `DevDisableCooperative` RPC and `boltzr-cli dev toggle-cooperative` command, which have been removed

### Dev gRPC Surface
- **`DevRefreshBalanceCache(symbol?)`** (PR #1447): forces a refresh of the wallet balance cache used for liquidity checks — for a single `symbol` or, when omitted, every wallet. Exposed end-to-end as `boltzr-cli dev refresh-balance-cache [symbol]`. Backed by `Service.refreshBalanceCache` → `BalanceCheck.refresh`; an unknown symbol yields `CURRENCY_NOT_FOUND`. `BalanceCheck` was refactored to share a per-symbol `updateBalance(symbol, wallet)` between the periodic update loop and the on-demand refresh.
- Other dev RPCs on `boltzrpc.Boltz`: `DevHeapDump`, `DevClearSwapUpdateCache`.

### Fulmine Integration
- **Macaroon authentication** for Fulmine RPCs (also exposed by `boltzr-cli`)
- Uses Fulmine **`ListVHTLCs`** for VHTLC discovery
- Uses Fulmine **`GetVHTLCSpendingTx`** to fetch the fully signed claim Ark tx for spent vHTLCs (handles both finalized and pending spending txs)
- Optimized startup call sequence to Fulmine
- Configurable periodic vHTLC state rescan via `rescanInterval` (seconds, default `300`); manual rescan also reachable via the chain-rescan service path for Ark currencies
- **`boltzr-cli ark decode <transaction>`** (PR #1462): decodes an ARK virtual transaction (base64-encoded PSBT, or a path to a file containing it) into a pretty-printed JSON structure — txid/version/locktime plus per-input witness UTXO, tap leaf scripts (with a `looks_like` heuristic), tap script sigs, and the Ark VTXO script tree parsed from the proprietary `taptree` PSBT field (`boltzr-cli/src/ark/decode.rs`).

### Swap Settlement Robustness
- **Skip claiming already-settled swaps** (PR #1463): `SwapNursery.attemptSettleSwap` now re-fetches the swap (`SwapRepository` / `ChainSwapRepository`) via a new `fetchSwapForSettlement` helper before claiming, so a duplicate claim event (chain reorgs, rescan overlaps) that arrives with a stale swap object no longer double-claims — an already-settled swap (`transaction.claim.pending` or any `SuccessSwapUpdateEvents` status) is logged and skipped. The reverse-swap invoice-settlement path applies the same guard, re-fetching the `ReverseSwap` and skipping if its status is already `invoice.settled`.
- **Confirm vHTLC refunds via `RefundWatcher`** (PR #1462): the pending-refund watcher now transitions refund status to `Confirmed` through a new atomic compare-and-set `RefundTransactionRepository.setStatusConfirmedIfPending(swapId)` (`UPDATE … WHERE status = Pending`, returns whether a row changed), and only emits `refund.confirmed` when the CAS actually flipped the row — preventing duplicate confirmations when the watcher re-checks the same transaction. The per-transaction check was extracted into a public `RefundWatcher.checkTransaction(tx, swap)` so a refund can also be confirmed on demand rather than only on the periodic sweep.

### Swap Hooks
- **Generic hooks** (`CreationHook`, `TransactionHook`) act on the two-variant `boltzrpc.Action` enum (`ACCEPT`, `REJECT`). The `HOLD` variant was removed from the shared enum in PR #1429; the `TransactionHook` default action moved from `HOLD` → `ACCEPT`; UTXO / Ethereum nurseries and `CreationHook` no longer have any `HOLD` branch.
- **`InvoicePaymentHook`** now carries its own dedicated `boltzrpc.InvoicePaymentHookAction` enum (`CONTINUE = 0`, `HOLD = 1`) on `InvoicePaymentHookResponse.action` (PR #1429). When the hook returns `HOLD`, `NodeSwitch.invoicePaymentHook` propagates an `InvoicePaymentPreference { action: Hold }` and `PaymentHandler.payInvoice` short-circuits before reaching the pending-payment tracker — the swap stays in its current state and is not paid. `CONTINUE` keeps the prior `nodeId` / `timePreference` routing behaviour.
- **`FailureHook`** (PR #1464): new streaming RPC `FailureHook (stream FailureHookResponse) returns (stream FailureHookRequest)` on `boltzrpc.Boltz` that pushes swap-failure events to an external listener. It is fire-and-forget — `FailureHookResponse` only echoes the event `id`, and `FailureHook.parseGrpcAction` is a no-op (60s hook timeout). The first `failure` variant is `ClaimFailure { ClaimFailureType type; string symbol; oneof details { swap_id | batch_size } }`, where `ClaimFailureType` is `CLAIM_FAILURE_UNSPECIFIED = 0` / `CLAIM_FAILURE_IMMEDIATE = 1` / `CLAIM_FAILURE_BATCH = 2`. `Service` owns a `FailureHook` instance and wires it from two existing events: `EventHandler`'s `claim.failure` fires `FailureHook.claim({ type: Immediate, symbol, swapId })`, and `DeferredClaimer`'s `batch.claim.failure` (extended in this PR to also carry `batchSize` = the claim chunk length) fires `FailureHook.claim({ type: Batch, symbol, batchSize })`. Complements the `NotificationProvider` claim-failure alert (see **Observability → Claim-failure alerts**, PR #1445) with a machine-consumable stream.
- **`SendApprovalHook`** (PR #1446): new streaming RPC `SendApprovalHook (stream SendApprovalHookResponse) returns (stream SendApprovalHookRequest)` on `boltzrpc.Boltz` that gates outbound sends through an external approver. The request carries `id`, `pair`, `symbol` (asset being sent out), and `amount`; the response action is the three-state `boltzrpc.SendApprovalAction` enum (`SEND_APPROVAL_ACCEPT = 0`, `SEND_APPROVAL_REJECT = 1`, `SEND_APPROVAL_HOLD = 2`). The fallback for an unconnected approver or a 60s hook timeout is set by `[swap.sendApproval] defaultAction` in `boltz.conf` (`accept` default, `reject` to fail closed, `hold` to pause-and-retry). `SendApprovalGuard` persists a `HOLD` decision as a `send_approval_holds` row and returns "keep holding"; `ACCEPT` / `REJECT` remove the row and let the send proceed. Once held, any non-resolution (hook not connected, timed out, disconnected) keeps holding so only a real approver response releases the send.

### Invoice Memo Validation
- The `description` field on reverse-swap creation (`POST /v2/swap/reverse`) now accepts **any well-formed UTF-8 string up to 639 bytes** — the BOLT11 description-field limit — instead of the previous "visible ASCII + newlines + ₿, ≤ 500 chars" regex (PR #1433). `lib/swap/NodeFallback.checkMemo` now rejects three distinct cases with specific error reasons: not a well-formed UTF-8 string (`memo.isWellFormed()`), exceeds 639 bytes (`Buffer.byteLength`), or contains blocked characters — Unicode C0/C1 control characters except `\n`/`\r`, plus the bidirectional control characters (`؜`, `‎`, `‏`, `‪`–`‮`, `⁦`–`⁩`) that can spoof how the memo is displayed.
- `Errors.INVALID_INVOICE_MEMO(details?)` now accepts an optional `details` string and surfaces it in the error message (`invalid invoice memo: <details>`), so clients see *why* a memo was rejected. The swagger description on `/v2/swap/reverse` was updated to match.

### Observability
- **Prometheus**: Metrics collection. Node-side async-lock instrumentation added in PR #1427 — `lib/InstrumentedLock.ts` wraps `async-lock` with per-key holder, pending-task, and overflow-rejection tracking, exposing three new gauges on the swap registry: `lock_pending{name,key}` (waiters per key), `lock_hold_age_seconds{name,key,op}` (current holder age), and `lock_rejections{name,key}` (cumulative "Too many pending tasks" overflows). Overflow rejections are enriched with the stuck holder and queue depth so the failing waiter sees who is stuck. **PR #1428** rolled `InstrumentedLock` out to **every remaining `async-lock` site** in the Node-side codebase — `SwapNursery` (the central swap/lockup/expiry/payment lock), `SwapManager`, `UtxoNursery`, `ArkNursery`, `LightningNursery`, `RefundWatcher`, `DeferredClaimer`, `MusigSigner`, `LockupTransactionTracker`, `SelfPaymentClient`, `ConsolidatedEventHandler`, and `SequentialSigner` — and added an ESLint `no-restricted-imports` rule under `lib/**` that forbids importing `async-lock` directly (only `lib/InstrumentedLock.ts` may). Each `acquire(key, op, cb)` call now also opens an **OpenTelemetry** span named `lock <name> <op>` (`SpanKind.INTERNAL`, attributes `lock.name`, `lock.key`, `lock.op`, plus `lock.wait_ms` once acquired and `lock.held_ms` on release; errors set `SpanStatusCode.ERROR`); the callback runs inside the span context so downstream spans nest under the lock. The pending-counter map also self-cleans idle keys (decrement to `0` deletes the entry) so locks with dynamic keys no longer grow unbounded.
- **OpenTelemetry**: Distributed tracing — now includes per-lock spans for every instrumented `acquire` (see above).
- **Grafana**: Visualization (via Loki integration)
- **Claim-failure alerts** (PR #1445): `SwapNursery` emits a `claim.failure` event (`{ swap, symbol, error }`) when a swap claim fails; `EventHandler` re-emits it and `NotificationProvider` posts a 🚨 alert to the configured notification channel with per-symbol basic swap info and the error truncated to 200 chars.

### WebHook Delivery
- **SSRF-hardened webhook caller** (PR #1461, `boltzr/src/webhook/`): outbound swap webhooks are delivered by a reqwest client fitted with a custom `SsrfGuardResolver` DNS resolver and a `build_redirect_policy` redirect policy (new `resolver.rs`). `is_blocked_ip` rejects loopback, link-local, multicast, broadcast, private, unspecified, shared (`100.64/10`) and reserved (`240/4`) IPv4 addresses — plus IPv4-mapped IPv6 and IPv6 loopback/multicast/link-local/unique-local/unspecified — so a webhook URL, a redirect hop, or a hostname that resolves to an internal address cannot be used to reach internal services.
- The redirect policy additionally enforces a per-host `block_list` and caps redirects at `MAX_REDIRECTS = 10`. All checks are gated by the per-caller `allow_insecure` flag (bypassed for local/dev use); blocked destinations surface `UrlError::InvalidHost` (from the resolver) or `UrlError::Blocked` (from the redirect policy).

---

## Architecture Overview

### Hybrid TypeScript + Rust Stack

**TypeScript Components** (`lib/`):
- `api/`: REST API server (Express)
- `service/`: Swap orchestration and state management
- `swap/`: Swap logic (submarine, reverse, chain)
- `chain/`: Bitcoin/Liquid blockchain integration
- `lightning/`: Lightning Network integration (LND/CLN)
- `db/`: Database models and migrations (Sequelize)
- `wallet/`: Wallet management and UTXO selection
- `grpc/`: gRPC client for Lightning nodes

**Rust Components** (`boltzr/`, `boltz-core/`):
- `boltzr`: High-performance Lightning sidecar (CLN integration, swap logic)
- `boltz-core`: Core cryptographic operations (Taproot, HTLCs) — standalone **MIT-licensed** crate (reusable by third parties), distinct from the workspace's `AGPL-3.0-only`
- `boltzr-cli`: Command-line interface for boltzr

### Service Flow
```
┌─────────────────────────────────────────────────────────┐
│                   Boltz Backend                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  REST API (Express)  ←→  Swap Service                   │
│                           ↓                               │
│  ┌─────────────┬──────────────┬──────────────────────┐ │
│  │ Chain Layer │ Lightning    │ Wallet Manager       │ │
│  │ (Bitcoin,   │ Integration  │ (UTXO selection)     │ │
│  │  Liquid,    │ (LND, CLN)   │                      │ │
│  │  EVM)       │              │                      │ │
│  └─────────────┴──────────────┴──────────────────────┘ │
│           ↓             ↓                  ↓             │
│    Bitcoin Node   Lightning Node      PostgreSQL        │
│   (bitcoind/btcd)  (LND/CLN)          (Database)        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Fulmine Integration
- **Purpose**: Fulmine uses boltz-backend for Lightning Network swaps
- **Swap Types**: Submarine and reverse submarine swaps
- **Use Case**: Convert Ark VTXOs to/from Lightning liquidity
- **Implementation**: Fulmine acts as API client to boltz-backend

### Ark Ecosystem Integration
- **Via Fulmine**: Ark users access boltz swaps through fulmine wallet
- **Liquidity Management**: Move between Ark (VTXOs), Lightning, and on-chain
- **Use Cases**:
  - Add Lightning liquidity from Ark off-chain balance
  - Exit Ark to Lightning or on-chain Bitcoin
  - Route payments across Ark + Lightning networks

See `system/integration-with-arkd.md` for detailed integration patterns.

---

## API Documentation

Boltz provides comprehensive API documentation:
- **V1 API**: Legacy endpoints (deprecated)
- **V2 API**: Current recommended API
- **Swagger UI**: Interactive API explorer

See `testing/api-reference.md` for endpoint details.

---

## Documentation Size Guidelines

To keep context lean for AI agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
