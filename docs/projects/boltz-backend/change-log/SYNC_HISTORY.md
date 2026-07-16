# Documentation Sync History - Boltz Backend

## 2026-07-16 - Documentation Update
**Commit**: `b28a2a71` (boltz-backend repository)
**Previous Sync**: `d851b3c5`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Bug Fixes**:
- fix: reconnect mempool.space for stale fees (#1465) (`b28a2a71`) — the mempool.space fee WebSocket client (`boltzr/src/chain/mempool_client.rs`) now reconnects when fees go stale **or are never received at all**. Because the server's pong replies to the client's pings kept resetting the read timeout, a connection that stopped sending (or never sent) fees was never torn down. On each ping tick the client now evaluates staleness since the connection started via the new `stale_or_missing_fees_since(connection_started_at)` → `FeeStaleness::{Stale, Missing}` enum, and if fees are stale/missing it force-closes the socket and returns an error to trigger a reconnect. All WebSocket writes (ping, close) are now wrapped in a new `write_with_timeout` helper that logs (instead of panicking on `unwrap`) and bounds each write by `WEBSOCKET_TIMEOUT_SECONDS`. Refactor: `staleness` now takes an `Instant` rather than a `&CachedFees`; `has_stale_fees` delegates to a new `stale_fees()`. New unit tests `test_stale_fees` and `test_missing_fees_become_stale`.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (boltz-backend — extended the "Hardened mempool.space integration" Key Capability with the stale/missing-fee reconnect behavior), `system/architecture.md` (extended the `MempoolClient` bullet with the same reconnect note).

## 2026-07-14 - Documentation Update
**Commit**: `d851b3c5` (boltz-backend repository)
**Previous Sync**: `36729e33`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Bug Fixes**:
- fix: skip claiming already settled swaps (#1463) (`d851b3c5`) — `SwapNursery.attemptSettleSwap` now re-fetches the swap from `SwapRepository` / `ChainSwapRepository` (new `fetchSwapForSettlement` helper) before claiming, so a duplicate claim event (chain reorgs, rescan overlaps) that arrives with a stale swap object no longer double-claims. If the re-fetched swap is missing it warns and returns; if its status is `transaction.claim.pending` or any `SuccessSwapUpdateEvents` value it logs "already settled" and skips. The reverse-swap invoice-settlement path gains the same guard: it re-fetches the `ReverseSwap` and returns early if the status is already `invoice.settled`. Unit + integration tests added (`test/{unit,integration}/swap/SwapNursery.spec.ts`).
- fix: confirm vHTLC refunds via RefundWatcher (#1462) (`d0be9294`) — `RefundWatcher` now confirms pending refunds through a new atomic compare-and-set `RefundTransactionRepository.setStatusConfirmedIfPending(swapId)` (`UPDATE … SET status = Confirmed WHERE swapId = ? AND status = Pending`, returns whether a row changed) and only emits `refund.confirmed` when the CAS actually flipped a `Pending` row — preventing duplicate confirmations when the periodic sweep re-checks the same transaction. The per-transaction check was extracted into a public `RefundWatcher.checkTransaction(tx, swap)`. Ships alongside a new **`boltzr-cli ark decode <transaction>`** command (`boltzr-cli/src/ark/decode.rs`, wired via `boltzr-cli/src/ark/mod.rs` + `main.rs`) that decodes an ARK virtual transaction (base64 PSBT or path to a file) into pretty-printed JSON — inputs/outputs, witness UTXOs, tap leaf scripts (with a `looks_like` heuristic), tap script sigs, and the Ark VTXO script tree parsed from the proprietary `taptree` PSBT field. Minor touches: `mrh_watcher.rs`, `mattermost.rs`, `utxo_nursery.rs`, `Cargo.lock`, `boltzr-cli/Cargo.toml`.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (boltz-backend — new **Idempotent swap settlement** (#1463) and **Idempotent vHTLC/refund confirmation** (#1462, incl. `boltzr-cli ark decode`) Key Capabilities; new `idempotent-settlement`, `refund-confirmation`, `ark-tx-decode` tags), `INDEX.md` (new **Swap Settlement Robustness** subsection covering both fixes, plus a `boltzr-cli ark decode` bullet under Fulmine Integration).

## 2026-07-09 - Documentation Update
**Commit**: `36729e33` (boltz-backend repository)
**Previous Sync**: `c220f078`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Refactors / Hardening**:
- refactor: WebHook hardening (#1461) (`36729e33`) — the reqwest client that delivers swap webhooks (`boltzr/src/webhook/caller.rs`) is now fitted with an **SSRF guard**. A new `boltzr/src/webhook/resolver.rs` module adds `SsrfGuardResolver` (a custom reqwest DNS resolver) and `build_redirect_policy` (a custom redirect policy). `is_blocked_ip` rejects loopback, link-local, multicast, broadcast, private, unspecified, shared (`100.64/10`) and reserved (`240/4`) IPv4 addresses — plus IPv4-mapped IPv6 and IPv6 loopback/multicast/link-local/unique-local/unspecified — so a webhook URL, any redirect hop, or a hostname that resolves to an internal address can no longer be used to reach internal services. The redirect policy additionally enforces a per-host `block_list` and caps redirects at `MAX_REDIRECTS = 10` (matching reqwest's default). All checks are gated by the per-caller `allow_insecure` flag (bypassed for local/dev); blocked destinations surface `UrlError::InvalidHost` (resolver) or `UrlError::Blocked` (redirect). Extensive Rust tests cover redirect-to-private-IP, redirect-to-private-hostname, and IPv4-mapped-IPv6 handling. `boltzr/src/webhook/mod.rs` registers the new module.

**Dependency Bumps / Chores**:
- chore: bump Bitcoin Core to v31.1 (#1460) (`620f51e4`) — `docker/build.py` `BITCOIN_VERSION` `31.0 → 31.1` and `lib/VersionCheck.ts` `ChainClient` `maximal` `310000 → 310100`. No API, schema, config, or runtime-behaviour change beyond the accepted bitcoind version range.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (boltz-backend — new **SSRF-hardened webhook delivery** Key Capability, Bitcoin Core version updated to v31.1 in the LND/CLN/nodes bullet, new `webhook-ssrf-guard` tag), `INDEX.md` (new **WebHook Delivery** subsection documenting the SSRF guard, **Bitcoin / Liquid Nodes** version bumped to v31.1), `system/architecture.md` (boltzr **Hardened WebHook caller** bullet, Chain Integration Bitcoin Core version bumped to v31.1).

## 2026-07-07 - Documentation Update
**Commit**: `c220f078` (boltz-backend repository)
**Previous Sync**: `74de3691`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Tooling / Chores**:
- chore: use MIT license for boltz-core (#1459) (`c220f078`) — the `boltz-core` Rust crate is re-licensed from the workspace's shared `license.workspace = true` to a standalone **`license = "MIT"`** and gains a `description` ("Atomic swap primitives for Bitcoin and Liquid used by Boltz") plus `repository.workspace = true`, packaging it as a permissively-licensed, reusable crate distinct from the rest of the AGPL workspace. The workspace `license` string is normalized `AGPL-3` → `AGPL-3.0-only` (SPDX), and a `repository` URL + `boltz-core/LICENSE` (MIT text) + `boltz-core/README.md` are added. Remaining changes are cosmetic: `README.md` reflow + bullet-style normalization and a `.prettierignore`/`package.json` touch. No runtime, API, config, schema, or dependency change.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (boltz-backend **Description** — note that `boltz-core` is now MIT-licensed and reusable while the workspace stays `AGPL-3.0-only`), `INDEX.md` (Rust Components — `boltz-core` bullet flagged as a standalone MIT crate), `system/architecture.md` (**boltz-core** section — MIT-license/reuse note). No capability, tag, dependency, API, or config surface changed by this chore.

## 2026-07-04 - Documentation Update
**Commit**: `74de3691` (boltz-backend repository)
**Previous Sync**: `1e496c49`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Bug Fixes**:
- fix: Arbitrum provider in regtest (#1456) (`cae53b83`) — Arbitrum swap locktimes are denominated in the **L1** block height, exposed per-block as `l1BlockNumber`. `ArbitrumProvider` (`lib/wallet/ethereum/ArbitrumProvider.ts`) now reads `l1BlockNumber` (falling back to the block `number`) from its own `getLatestBlock` instead of maintaining a separate `l1Provider` (`InjectedProvider` against Ethereum mainnet), so the `arbitrum.l1Providers` config array is **removed** and replaced by a single boolean `arbitrum.regtest` flag (default `false`; `lib/Config.ts` `ArbitrumConfig` and `docs/boltz.conf` updated to match). When an RPC returns no `l1BlockNumber` and `regtest` is not set, the provider now **throws** with a descriptive error instead of silently falling back to the L2 block number; `regtest = true` permits the fallback for anvil/regtest forks (whose decimal `l1BlockNumber` is now parsed via `ethers.getNumber`). `init()` also eagerly calls `getLatestBlock()` so a misconfigured Arbitrum RPC fails fast at startup instead of being swallowed by the block poller. `InjectedProvider` incidentally exposes `logger` as `protected` and switches a `Promise.race` `.then` cleanup to `.finally`. Covered by updated unit + integration `ArbitrumProvider.spec.ts`.
- docs: align swagger spec with actual API behavior (#1454) (`cbb8dfd6`) — **docs/swagger-only** correction of `swagger-spec.json` + router `@openapi` doc comments to match how the REST API already behaves; no runtime behaviour change. Notable clarifications: a **Submarine Swap** can be created with **either** an `invoice` **or** a `preimageHash` (`SubmarineRequest.anyOf`; `invoice` takes precedence when both are set), so `SubmarineResponse` now requires only `id` and marks `bip21` / `acceptZeroConf` / `expectedAmount` as set **only when created with an invoice**, and adds a `claimAddress` field returned **only for swaps to EVM chains**. Also: `POST /v2/swap/submarine/{id}/invoice` gains an `extraFees` body field and a `404 SwapNotFound` response; `GET` submarine pairs documents an optional `referral` header; `GET /v1/chain/{currency}/contracts` description fixed (was mislabelled "Raw transaction") and a `501` (Ethereum integration disabled) added; `LightningRouter` factored BOLT12 request/response into shared `components` (`Bolt12Delete`, `BadRequest`, `InvalidSignature`, `Bolt12NotFound`, `InvalidSignatureHex`) and corrected `LightningChannel` / `LightningChannelInfo` required fields (new `LightningChannelSide` schema); `NodeStats.oldestChannel` made optional; `ReferralRouter` monthly fees retyped from `string` to `int64` integer.

**Dependency Bumps**:
- chore: bump cmov from 0.5.3 to 0.5.4 (#1457) (`74de3691`) — Rust dependency bump, `Cargo.lock` only. `cmov` is not pinned anywhere in `docs/projects/boltz-backend/`; no docs surface.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (two new Key Capabilities bullets — the Arbitrum L1-block-height fix and the swagger/actual-behavior alignment — plus a new `arbitrum` tag), `INDEX.md` (new **EVM Chains** subsection under **Configuration** documenting the `[arbitrum]` `regtest` flag and the removed `l1Providers`), `system/architecture.md` (**Wallet** section gained an `ArbitrumProvider` bullet), `testing/api-reference.md` (note on Submarine `invoice`-or-`preimageHash` creation and the conditional `bip21` / `acceptZeroConf` / `expectedAmount` / `claimAddress` response fields). The `cmov` bump has no docs surface.

## 2026-07-03 - Documentation Update
**Commit**: `1e496c49` (boltz-backend repository)
**Previous Sync**: `4e90aee5`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Features / API Changes**:
- feat: add PATCH endpoint for swap metadata (#1455) (`1e496c49`) — new `PATCH /v2/swap/{id}/metadata` route (`SwapRouter.patchMetadata`) sets or replaces the swap metadata stored via PR #1423 *after* creation, for **any** swap type. The handler resolves `id` across `SwapRepository` / `ReverseSwapRepository` / `ChainSwapRepository` (`findSwapForMetadata`, `Promise.all` then first non-null) and returns `404 SWAP_NOT_FOUND` if none match; it rejects any body key other than `metadata` with `INVALID_PARAMETER(<key>)`, validates the `metadata` HEX with the existing `parseMetadata` (shared `MetadataHex` constraints: regex `^(?:[0-9a-fA-F]{2})+$`, 2–2048 hex chars / 1–1024 bytes), and responds `200 {}` on success. The metadata write path changed from create-only to **upsert**: `SwapMetadataRepository.add` was renamed to `set` and now calls `SwapMetadata.upsert` instead of `.create`, so both the create-time `persistMetadata` and the new PATCH path overwrite any prior value idempotently. `swagger-spec.json` gained the new `/swap/{id}/metadata` PATCH operation and a shared `MetadataHex` / `MetadataRequest` component schema (the inline `metadata` fields on the create + restore schemas now `$ref` it; the "rescue endpoint" wording was corrected to "restore endpoint"). Covered by expanded `test/unit/api/v2/routers/SwapRouter.spec.ts` (+129) and `test/integration/db/repositories/SwapMetadataRepository.spec.ts` (+16, `set`/upsert semantics).

**Tooling / Chores (no docs surface)**:
- CI: `setup-build-environment` composite action now derives the actual `rustc --version` into a step output and includes it in the Cargo cache key (cache invalidation correctness).
- `regtest` submodule advanced `97d2c11b → 8d529456`.

**Database Migrations**: none (the `swap_metadata` table from PR #1423 is unchanged; only the writer switched `create` → `upsert`).

**Docs Touched**: `docs/INDEX.md` (swap-metadata Key Capability line — added the PATCH endpoint + upsert note), `INDEX.md` (Database → Swap routing metadata bullet — `add` → `set` upsert, new PATCH endpoint, shared `MetadataHex` schema), `testing/api-reference.md` (new `PATCH /v2/swap/{id}/metadata` section + upsert note on the create-time `metadata` field). No `system/` edits (no new component or architecture change — this is a REST-surface + repository-method refinement).

## 2026-07-02 - Documentation Update
**Commit**: `4e90aee5` (boltz-backend repository)
**Previous Sync**: `9589ce8a`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Bug Fixes**:
- fix: catch unhandled errors from static file routes (#1453) (`4e90aee5`) — `res.sendFile` (used for static files) rejects requests with a bogus `Range` header asynchronously, bypassing the route handlers' `try/catch`. Added a catch-all Express error middleware (`handleUnhandledError`, exported from `lib/api/Api.ts`, registered via `app.use` after all routes) so these errors return a proper JSON `errorResponse` (using `error.status`/`error.statusCode`, default `500`) instead of going unhandled; forwards to `next` when headers were already sent. Covered by `test/unit/api/Api.spec.ts`. No API surface, config, or dependency change.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (REST API capability line), `testing/api-reference.md` (Error Responses section). No `system/` or project `INDEX.md` change (internal robustness fix only).

## 2026-07-01 - Documentation Update
**Commit**: `9589ce8a` (boltz-backend repository)
**Previous Sync**: `7a1a22ef`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Dependency Bumps**:
- chore: bump LND to v0.21.1 (#1452) (`9589ce8a`) — `docker/build.py` `LND_VERSION 0.21.0-beta → 0.21.1-beta` and `VersionCheck` LND `maximal 0.21.0 → 0.21.1` (`minimal` unchanged at `0.19.0`). The vendored `proto/lnd/router.proto` was refreshed for 0.21.1: doc-only clarifications to the HTLC interceptor — `ForwardHtlcInterceptRequest` circuit keys must be handled idempotently (requests can be replayed after reconnect / when an htlc moves on-chain), and once the incoming channel force-closes only `Settle` affects the on-chain HTLC while `Resume` / `ResumeModified` / `Fail` return a stream-terminating error. No generated code, API, or config surface changed.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (LND capability line), `INDEX.md` (Lightning Integration LND entry), `system/architecture.md` (LndClient version). No `system/project_overview.md` change (internal dependency bump only).

## 2026-06-30 - Documentation Update
**Commit**: `7a1a22ef` (boltz-backend repository)
**Previous Sync**: `172f17a1`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 commits

**Features**:
- feat: send gRPC hook (#1446) (`df49f5c3`) — new streaming RPC `SendApprovalHook (stream SendApprovalHookResponse) returns (stream SendApprovalHookRequest)` on `boltzrpc.Boltz` that gates outbound sends through an external approver. Request carries `id`, `pair`, `symbol` (asset being sent out), `amount`; response action is the new three-state `boltzrpc.SendApprovalAction` enum (`SEND_APPROVAL_ACCEPT = 0`, `SEND_APPROVAL_REJECT = 1`, `SEND_APPROVAL_HOLD = 2`). `SendApprovalHook` (60s call timeout) wraps the generic `Hook`; the fallback action for an unconnected approver/timeout is parsed from `[swap.sendApproval] defaultAction` in `boltz.conf` (`accept` default, `reject` fail-closed, `hold` pause-and-retry — added to `lib/Config.ts` `SwapConfig` and `docs/boltz.conf`). `SendApprovalGuard` (`resolveSendApprovalDecision` / `persistSendApprovalDecision`) keeps holding on any non-resolution once a swap is held, persisting a `HOLD` as a `send_approval_holds` row and removing it on `ACCEPT` / `REJECT`. Wired through `SwapNursery`, `PaymentHandler`, `SwapManager`, `PendingPaymentTracker`, `GrpcServer`/`GrpcService`, and `boltzr-cli`.

**Fixes / Hardening**:
- fix: accept single id in swap status query (#1451) (`7a1a22ef`) — `getSwapStatusMultiple` (`GET /v2/swap/status`) now treats a bare `?ids=x` (parsed as a string by Express) as a one-element array instead of returning `400 ids must be an array`.
- chore: harden ARK timeout delta calculations (#1450) (`3af82667`) — `TimeoutDeltaProvider` now denominates the remaining-blocks-left calculation in the **lightning** currency's block time (the unit the CLTV limit uses) rather than the chain currency's, fixing the conversion for ARK pairs.
- fix: nonce races on Anvil (#1448) (`3ac6bbc7`) — internal EVM signing fix: `SequentialSigner` / `EthereumTransactionTracker` / `InjectedProvider` / `PendingEthereumTransactionRepository` reworked to avoid racing nonces when blocks are mined instantly after a send. No documented API/config surface changed.

**Dependency Bumps**:
- chore: bump CLN to v26.06.2 (#1449) (`1c826920`) — `docker/build.py` `C_LIGHTNING_VERSION 26.06.1 → 26.06.2` and `VersionCheck` CLN `maximal 26.06.1 → 26.06.2`.

**Database Migrations**: new `send_approval_holds` table (`SendApprovalHold` model, PK `swapId` + `type`, synced via `.sync()` in `Database.ts`). No schema-version bump.

**Docs Touched**: `docs/INDEX.md` (Key Capabilities + Tags + CLN version), `system/project_overview.md` (new Send-Approval Hook feature), `INDEX.md` (Swap Hooks `SendApprovalHook`, Database `send_approval_holds`, CLN version).

## 2026-06-27 - Documentation Update
**Commit**: `172f17a1` (boltz-backend repository)
**Previous Sync**: `1e11c444`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Features**:
- feat: alert on claim fails (#1445) (`172f17a1`) — adds a new `claim.failure` event end-to-end so operators are notified when a swap claim fails. `SwapNursery` (and `PaymentHandler`'s `SwapNurseryEvents`) now emit `claim.failure` with `{ swap: Swap | ChainSwapInfo, symbol, error }`; `EventHandler` re-emits it on its typed event bus; `NotificationProvider` subscribes and posts a 🚨 alert message (`**Claim failure for <symbol>**` + basic swap info via `getBasicSwapInfo` + the error truncated to 200 chars with `...`) to the configured notification channel via `this.client.sendMessage(message, true, true)`. Unit/integration coverage added in `SwapNursery.spec.ts` and `NotificationProvider.spec.ts`.
- feat: gRPC method to update balance cache (#1447) (`0da912a3`) — new dev gRPC method `DevRefreshBalanceCache` (proto `DevRefreshBalanceCacheRequest { optional string symbol = 1 }` / empty response) lets operators force-refresh the wallet balance cache used for liquidity checks, for a single `symbol` or — when omitted — every wallet. Wired through `proto/boltzrpc.proto`, `GrpcServer` (handler registration), `GrpcService.devRefreshBalanceCache`, `Service.refreshBalanceCache(symbol?)`, and a refactored `BalanceCheck`: a new public `refresh(symbol?)` plus a shared private `updateBalance(symbol, wallet)` used by both the periodic `updateBalances` loop (now `Promise.allSettled` over per-symbol updates) and the on-demand path (unknown symbol → `Errors.CURRENCY_NOT_FOUND`). Exposed in the Rust CLI as `boltzr-cli dev refresh-balance-cache [symbol]` (`boltzr-cli/src/main.rs` `DevCommands::RefreshBalanceCache`, `grpc/mod.rs` `dev_refresh_balance_cache`). Integration coverage in `BalanceCheck.spec.ts`.

**Database Migrations**: none.

**Docs Touched**: `docs/INDEX.md` (Key Capabilities + Tags), `system/project_overview.md` (new Claim-Failure Alerting and Balance-Cache Refresh features), `INDEX.md` (new Dev gRPC Surface section + Observability claim-failure note).

## 2026-06-23 - Documentation Update
**Commit**: `1e11c444` (boltz-backend repository)
**Previous Sync**: `46cfb267`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Features**:
- feat: rescue EVM swaps (#1434) (`1e11c444`) — `POST /v2/swap/restore` gains a new request variant that searches by a single **EVM claim address** with proof of ownership: `{ address, timestamp, signature }`, where `signature` is an EIP-191 `personal_sign` over `Boltz swap restore\naddress: <EIP-55 address>\ntimestamp: <unix-secs>` and `timestamp` must be within **60 seconds** of server time. Returned `RestorableSwap.claimDetails` is now a discriminated union on a `type` field: `utxo` → existing `RestoreClaimDetails` (now requires `timeoutBlockHeight`; Ark `timeoutBlockHeights` removed) or `evm` → new `RestoreEvmClaimDetails` (`contractAddress`, `claimAddress`, optional `EvmTransaction { id }`, `amount`, `timeoutBlockHeight`; full lockup reconstructible from the contract `Lockup` event by preimage hash). The lockup `Transaction` schema now returns `id` + `vout` instead of `id` + `hex`. TS (`SwapRouter`, `ChainSwapData`, `ReverseSwap`, `Migration`) + Rust (`boltzr` rescue service, `boltz-evm` signature verification) + `swagger-spec.json` touched.

**Database Migrations**:
- Sequelize schema bump **26 → 27** (`Migration.ts` `case 26`): adds partial indexes `reverseSwaps_claimAddress` and `chainSwapData_claimAddress` (both `WHERE claimAddress IS NOT NULL`) to back the restore-by-EVM-address lookup; mirrored in the `ReverseSwap` / `ChainSwapData` model index definitions.

**Dependency Bumps**:
- chore: bump dependencies (#1444) (`37841e21`) — broad routine refresh. Notable: Node-side **redis 5 → 6** (major) and **tower-http 0.6 → 0.7**, **opentelemetry family 0.31 → 0.32** (Rust), plus `ethers ^6.17.0`, `pg ^8.22.0`, `lightning`/`lightning-invoice`, `diesel 2.3.10`, `pyroscope`, etc. `boltz-core/src/elements/tx.rs` gained helpers (+ `Core.ts` tweak and a new `Core.spec.ts` unit test). No documented API/config surface changed.
- chore: bump pydantic-settings 2.13.1 → 2.14.2 in /tools (#1443) (`73f40de4`) — dependabot, `tools/uv.lock` only.

## 2026-06-20 - Documentation Update
**Commit**: `46cfb267` (boltz-backend repository)
**Previous Sync**: `818591e5`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 commits

**Internal Changes Only** — dependency-bump churn plus an upstream Boltz docs-site edit; no user-facing documentation updates required.

**Tooling / Chores**:
- chore: bump nodemailer from 8.0.7 to 9.0.1 (#1441) (`46cfb267`) — `optionalDependencies` major bump (`nodemailer ^8.0.7` → `^9.0.1`) used for the email-alert path; `package.json` / `package-lock.json` only. nodemailer is not pinned anywhere in `docs/projects/boltz-backend/`, so no docs surface.
- chore: bump tar from 7.5.11 to 7.5.16 (#1442) (`1a1f1d53`) — transitive/dev dependency bump, `package-lock.json` only.
- chore: bump ws and ethers (#1440) (`630eccfb`) — `ethers` (production dep) bumped within the 6.x range (`^6.16.0`, no API-surface change) and `ws` (dev/transitive) bumped; `package.json` / `package-lock.json` only.
- chore: bump @opentelemetry/core, exporter-trace-otlp-grpc, instrumentation-http and sdk-node (#1438) (`b561a53c`) — OpenTelemetry family bumped `^0.218.0` → `^0.219.0` (patch-level within the already-documented OTel pin set); `package.json` / `package-lock.json` only.
- chore: bump markdown-it from 14.1.1 to 14.2.0 (#1439) (`990110fd`) — docs-toolchain dev dependency bump, `package-lock.json` only.

**Upstream Docs Site (no `boltz-backend` source change)**:
- docs: steer integrations/agents towards SDKs (#1436) (`4156c2c8`) — edits to the upstream Boltz documentation site (`docs/index.md`, `docs/libraries.md`, `docs/api-v2.md`, `docs/.vitepress/config.mts`, `README.md`, `swagger.js`, `swagger-spec.json`): stronger "do not integrate the Boltz REST API directly — use an officially supported SDK" guidance, and the `boltz-core` TypeScript library's documented supported-currencies list extended with `WBTC` (`LN, BTC, LBTC, RBTC, TBTC, USDT, USDC` → `… TBTC, WBTC, USDT, USDC`). Same class as the 2026-05-19 USDC addition: this is a Boltz-side docs page; no `boltz-backend` REST API, swap-type, `boltz.conf` schema, env-var, DB-migration, build, or dependency-graph change.

**Documentation Impact**:
- None. No changes to project `INDEX.md`, `system/`, `testing/`, `sop/`, or master `docs/INDEX.md`. The supported-currency wording in `docs/projects/boltz-backend/` tracks `boltz-backend`'s own chain support (BTC mainchain, Lightning, Liquid, EVM) rather than the `boltz-core` library's token list, so the `WBTC` addition is not reflected there; the dependency bumps are version churn with no documented-surface impact (`ethers`/OTel pins are referenced generically, not by exact version).

---

## 2026-06-09 - Documentation Update
**Commit**: `818591e5` (boltz-backend repository)
**Previous Sync**: `91502ead`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Features Added / API Changes**:
- feat: relax invoice memo checks (#1433) (`818591e5`) — the `description` field on `POST /v2/swap/reverse` now accepts any well-formed UTF-8 string up to **639 bytes** (the BOLT11 description-field limit) instead of the previous ASCII-only 500-char regex (`^[\x20-\x7E\n\r₿]{0,500}$`). `lib/swap/NodeFallback.ts`: the old `invoiceMemoRegex` was replaced with `invoiceMemoMaxBytes = 639` and a new `invoiceMemoBlockedCharsRegex` covering Unicode C0/C1 control chars except `\n`/`\r` (` -	--`) plus the bidirectional control chars (`؜‎‏‪-‮⁦-⁩`) that can spoof memo display. `checkMemo` now branches into three distinct rejection cases — `not a well-formed string` (`memo.isWellFormed()`), `exceeds maximum length of 639 bytes` (`Buffer.byteLength`), and `contains blocked characters` — each surfaced via `Errors.INVALID_INVOICE_MEMO(details?)`, which gained an optional details arg that flows into the error message (`invalid invoice memo: <details>`). `lib/api/v2/routers/SwapRouter.ts` swagger description for the `description` field rewritten to match (`Any well-formed UTF-8 string of up to 639 bytes is allowed, except for control characters (other than newlines) and Unicode bidirectional control characters`). Tests: `test/unit/swap/NodeFallback.spec.ts` (+~70 lines) expanded to cover the new well-formed / length / blocked-char branches with parameterised cases per Unicode block; `swagger-spec.json` regenerated.
- feat: receive amount for pending EVM refunds (`5dba08dd`) — `EthereumManager.getClaimedAmount` was renamed to `getReceivedAmount` and now also decodes refund calldata, so the `amountReceived` field on `boltzrpc` transaction events is populated for pending EVM **refunds** (previously only claims). `lib/wallet/ethereum/contracts/Contracts.ts` (+138 lines) gained `decodeRefundData(isEtherSwap, data)` mirroring `decodeClaimData`, plus six per-shape private decoders: `decodeEtherRefund` (`refund(bytes32,uint256,address,uint256)`), `decodeEtherRefundForAddress` (`refund(bytes32,uint256,address,address,uint256)`), `decodeEtherRefundCooperative` (both `refundCooperative` overloads), and the corresponding `decodeErc20Refund` / `decodeErc20RefundForAddress` / `decodeErc20RefundCooperative` variants — each returning `{ preimageHash, amount, token? }`. `lib/wallet/ethereum/EthereumManager.ts`: `getReceivedAmount` first tries `decodeClaimData`, then falls back to `decodeRefundData` if the claim decode yielded nothing. `lib/grpc/GrpcService.ts`: the single call site swapped from `manager.getClaimedAmount(tx.hex)` to `manager.getReceivedAmount(tx.hex)`. Tests: `test/unit/wallet/ethereum/contracts/Contracts.spec.ts` (+198 lines, new file covering both claim and refund decoders end-to-end), `test/unit/wallet/ethereum/EthereumManager.spec.ts` (+34 lines, covers the claim → refund fallback), `test/integration/wallet/ethereum/EthereumManager.spec.ts` (+~60 lines, exercises both claim and refund flows on a real chain), `test/unit/grpc/GrpcService.spec.ts` updated for the renamed method. No `boltz.conf`, REST API, or DB-migration change; the only public surface change is the `boltzrpc` event payload now being populated on refunds.

**Bug Fixes**:
- fix: spammy lightning gossip logs (`e1e6c445`) — `boltzr/src/service/lightning_info/mod.rs`: `GraphLightningInfo::update_cache` signature changed from `Result<()>` to `Result<bool>` and now returns `Ok(false)` early when `build_sources(currency)` is empty (no Lightning clients configured for the currency), so the per-tick "Updated <symbol> lightning gossip in: …" debug log only fires when at least one source actually contributed. The cache-refresh loop matches on `Ok(true)` / `Ok(false)` and only logs on the former. No public API, gRPC, REST, or config change — pure log-noise reduction.

**Documentation Impact**:
- `INDEX.md` (project): new **Invoice Memo Validation** subsection added under **Configuration**, covering the relaxed 639-byte UTF-8 limit, the three new rejection branches with detailed error messages, the blocked-character set, and the matching swagger description on `/v2/swap/reverse`.
- `system/architecture.md`: **Wallet** subsection extended with the `EthereumManager.getReceivedAmount` rename and the new `Contracts.decodeRefundData` decoders, calling out that `boltzrpc` tx events now populate `amountReceived` for pending EVM refunds. **Rust Components → boltzr** bullet extended with the `update_cache` → `Result<bool>` log-noise fix.
- `system/project_overview.md`: no edit — overview-level capabilities unchanged (these are surface refinements to existing capabilities, not new capability bullets).
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** gained three new bullets — relaxed invoice-memo validation (PR #1433 with the BOLT11 639-byte limit and detailed rejection reasons), pending-EVM-refund amounts on `boltzrpc` events (`getClaimedAmount` → `getReceivedAmount` + new refund decoders), and the quieter `update_cache` gossip log. **Tags** extended with `invoice-memo-utf8` and `evm-refund-amount`.
- `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — `api-reference.md` does not currently document the optional `description` field on reverse-swap creation (it lives in the swagger spec, which was regenerated), the EVM-refund change is internal to the `boltzrpc` event surface, and the gossip-log fix is an observability cleanup with no public surface.

---

## 2026-06-07 - Documentation Update
**Commit**: `91502ead` (boltz-backend repository)
**Previous Sync**: `4fdd15c8`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Tooling / Chores**:
- chore: bump LND to v0.21.0-beta (#1432) (`91502ead`) — `docker/build.py` pinned-image bumps: `LND_VERSION` `0.20.1-beta` → `0.21.0-beta`, `C_LIGHTNING_VERSION` `26.06` → `26.06.1`, and `GOLANG_VERSION` `1.26.2-trixie` → `1.26.4-trixie`. `lib/VersionCheck.ts` ranges updated to match — `LndClient`: `maximal=0.20.1` → `0.21.0` (minimal stays `0.19.0`); `ClnClient`: `maximal=26.06` → `26.06.1` (minimal stays `26.04`). `regtest` submodule advanced to the matching v0.21.0-beta LND / v26.06.1 CLN image. Code cleanups that come with the LND 0.21 surface: `LightningClient.ts` drops the now-unused `LightningClient.serviceNameSendPayment` slot; `LndClient.ts` removes the `serviceNameSendPayment` field, an obsolete `getInfo` dance in `PendingPaymentTracker.checkPendingPaymentRecreated` (the `checkPaymentExists` path was deleted along with its `pendingPaymentExists` helper), and the related branches in `PaymentHandler.payInvoice` and `SwapNursery.handleInvoiceExpired`. `ClnClient.ts` drops a now-redundant `getNodeUri` re-declaration. `ChainSwapSigner.ts` removes a stale `chain.lockup.failed` short-circuit. `proto/lnd/router.proto` (-77 lines net) and `proto/lnd/rpc.proto` (-220 lines net) regenerated against LND 0.21 — most of the change is doc-comment churn from the upstream proto. Tests: `test/unit/service/TimeoutDeltaProvider.spec.ts` adjusts a single LND-version fixture; `test/unit/swap/PaymentHandler.spec.ts` (-50 lines) drops the deleted-helper cases, and `PendingPaymentTracker.spec.ts` / `ChainSwapSigner.spec.ts` are tidied for the removed branches. No `boltz.conf`, REST API, env-var, gRPC, or DB-migration change.

**Documentation Impact**:
- `INDEX.md` (project): **Lightning Integration** section — **LND** bullet now pins **v0.21.0-beta** (with the PR #1432 bump notes + `VersionCheck` `maximal=0.21.0`); **CLN** bullet bumped to **v26.06.1**.
- `system/architecture.md`: **Lightning Integration** subsection — `LndClient` now references **v0.21.0-beta** (with the same `VersionCheck` notes); `ClnClient` bumped to **v26.06.1**.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** — Lightning bullet updated to **LND v0.21.0-beta** + **CLN v26.06.1** with PR #1432 references.
- `system/project_overview.md`, `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — version pins live in the architecture/INDEX docs only; the `LightningClient.serviceNameSendPayment` / `PaymentHandler` cleanups are internal (no public REST/CLI surface, no `boltz.conf` schema change, no migration); the `GOLANG_VERSION` patch bump is build-only and not pinned anywhere in `docs/projects/boltz-backend/`.

---

## 2026-06-06 - Documentation Update
**Commit**: `4fdd15c8` (boltz-backend repository)
**Previous Sync**: `12efd926`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Features Added / Refactors**:
- feat: instrument all async locks (#1428) (`4fdd15c8`) — completes the rollout of `lib/InstrumentedLock.ts` (introduced in PR #1427) to every remaining Node-side `async-lock` user, and adds **OpenTelemetry tracing** to the lock primitive itself. `lib/InstrumentedLock.ts`: `acquire(key, op, cb)` now opens a `lock <name> <op>` span (`SpanKind.INTERNAL`, attributes `lock.name`, `lock.key`, `lock.op`), records `lock.wait_ms` on acquisition and `lock.held_ms` on release, runs the callback inside the span context (`context.with(ctx, cb)` so downstream spans nest under the lock), records errors via `SpanStatusCode.ERROR`, and tolerates sync (`Promise<T> | T`) callbacks. The pending-counter map now self-deletes idle keys (decrement to `0` deletes the entry) so locks with dynamic keys no longer grow unbounded. **Rollout sites** (each replaces `new AsyncLock(…)` with `new InstrumentedLock(name, …)` and passes an `op` label at every `acquire`): `lib/swap/SwapNursery.ts` (the central swap/lockup/expiry/payment lock — ~870 lines reflowed for the new `acquire(key, op, cb)` signature), `lib/swap/SwapManager.ts`, `lib/swap/UtxoNursery.ts`, `lib/swap/ArkNursery.ts`, `lib/swap/LightningNursery.ts`, `lib/swap/RefundWatcher.ts`, `lib/service/cooperative/DeferredClaimer.ts`, `lib/service/cooperative/MusigSigner.ts`, `lib/rates/LockupTransactionTracker.ts`, `lib/lightning/SelfPaymentClient.ts`, `lib/wallet/ethereum/ConsolidatedEventHandler.ts`, `lib/wallet/ethereum/SequentialSigner.ts`. `eslint.config.mjs` (+19 lines): new `no-restricted-imports` rule under `lib/**` forbids importing `async-lock` directly (with the message "Import InstrumentedLock instead of using async-lock directly."); `lib/InstrumentedLock.ts` itself is the only exempt path. Tests: `test/unit/InstrumentedLock.spec.ts` rewritten/extended to **185 lines** covering the new tracing/attributes/sync-callback behaviour; `test/unit/swap/SwapManager.spec.ts`, `test/unit/service/cooperative/MusigSigner.spec.ts`, and `test/integration/service/cooperative/MusigSigner.spec.ts` updated for the new `acquire(key, op, cb)` signature. No `boltz.conf`, REST API, env-var, public gRPC, or DB-migration change — Prometheus surface is unchanged from PR #1427 (same three gauges); the new observability surface is OpenTelemetry spans on the existing tracer.

**Documentation Impact**:
- `INDEX.md` (project): **Observability** section rewritten — extends the InstrumentedLock rollout list from the original signer set to every remaining `async-lock` user, adds the ESLint guard, describes the new OpenTelemetry span (name, attributes, error handling, idle-key cleanup), and notes that OTel now includes per-lock spans.
- `system/architecture.md`: **Monitoring** subsection rewritten with the same rollout/eslint/OTel notes.
- `system/project_overview.md`: **Observability** capability bullet updated to call out PR #1428 (rollout completion + ESLint rule + per-lock OTel spans).
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** — the async-lock instrumentation bullet expanded with the full PR #1428 rollout list, the ESLint guard, and the OpenTelemetry span surface; **Tags** extended with `lock-tracing`.
- `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — this is internal observability instrumentation with no public REST/CLI/config/schema change.

---

## 2026-06-05 - Documentation Update
**Commit**: `12efd926` (boltz-backend repository)
**Previous Sync**: `dc9c6f83`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Refactors**:
- refactor: hold in invoice payment hook (#1429) (`12efd926`) — `HOLD` was decoupled from the generic swap action and moved into a dedicated invoice-payment hook surface. `proto/boltzrpc.proto`: the shared `Action` enum dropped its `HOLD = 2` variant (now only `ACCEPT` / `REJECT`); a new `InvoicePaymentHookAction` enum (`CONTINUE = 0`, `HOLD = 1`) was added and surfaced as `InvoicePaymentHookResponse.action`. `lib/swap/hooks/InvoicePaymentHook.ts`: the result type became a discriminated union (`InvoicePaymentHookHold` | `InvoicePaymentHookContinue`), `parseGrpcAction` now branches on the new enum (with a `parseHookAction` helper warning on unknown actions and falling back to `Continue`), and `logHookResult` learned to log `returned hold`. `lib/swap/NodeSwitch.ts`: `invoicePaymentHook` now returns a new `InvoicePaymentPreference` (also exported) — either `{ action: Hold }` or `{ action: Continue, client?, timePreference? }`. `lib/swap/PaymentHandler.ts`: `getPreferredNode` returns the same shape, and `payInvoice` short-circuits with a debug `held by hook` log before the pending-payment-tracker step when the action is `Hold`. `lib/swap/hooks/TransactionHook.ts`: default action flipped from `Hold` → `Accept`. `lib/swap/hooks/CreationHook.ts`, `lib/swap/UtxoNursery.ts` (both swap and chain-swap paths, plus the now-unused `logHoldingTransaction` helper), and `lib/swap/EthereumNursery.ts` (both EtherSwap and ERC20Swap paths): all `Action.Hold` branches were deleted. Tests: `test/unit/swap/hooks/TransactionHook.spec.ts` (+151 lines, new file covering accept/reject behaviour with the new default), `test/unit/swap/hooks/InvoicePaymentHook.spec.ts` (+104 lines, covers the new enum / hold branch / parser fallbacks), `test/unit/swap/PaymentHandler.spec.ts` (+35 lines, exercises the hold short-circuit), `test/unit/swap/SwapNursery.spec.ts` (+51 lines), `test/unit/swap/NodeSwitch.spec.ts` updated for the new return type; the obsolete `EthereumNursery.spec.ts` / `UtxoNursery.spec.ts` / `CreationHook.spec.ts` `Action.Hold` cases were removed. No `boltz.conf`, REST API, env-var, or DB-migration change.

**Documentation Impact**:
- `INDEX.md` (project): new **Swap Hooks** subsection added under **Configuration**, describing the two hook enums (`boltzrpc.Action` now `ACCEPT` / `REJECT`; new `boltzrpc.InvoicePaymentHookAction` with `CONTINUE` / `HOLD`), the `TransactionHook` default flip, the removed nursery branches, and the `NodeSwitch` / `PaymentHandler` short-circuit behaviour when the invoice payment hook returns `HOLD`.
- `system/architecture.md`: **Swap Logic** section gained a **Hooks** bullet summarising the same change.
- `system/project_overview.md`: no edit — overview-level capabilities unchanged.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** gained an "Invoice-payment hold" bullet covering the proto enum split, the `TransactionHook` default flip, and the `payInvoice` short-circuit; **Tags** extended with `invoice-payment-hook`.
- `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — the change is internal to the gRPC hook surface (no public REST/CLI surface, no `boltz.conf` schema change, no migration).

---

## 2026-06-04 - Documentation Update
**Commit**: `dc9c6f83` (boltz-backend repository)
**Previous Sync**: `c0e5b66c`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Features Added**:
- feat: add metrics to Node async locks (#1427) (`4ed9ac87`) — new `lib/InstrumentedLock.ts` (135 LoC) wraps `async-lock` with per-key holder/pending/rejection tracking and exposes a `snapshot()` of live state. Three new Prometheus gauges on the swap registry: `lock_pending{name,key}` (queue depth), `lock_hold_age_seconds{name,key,op}` (current holder age), and `lock_rejections{name,key}` (cumulative "Too many pending tasks" overflows). Overflow errors are re-thrown to the waiter enriched with `lock <name>.<key> overflow (op=<op>); holder=<op> held for <ms>ms, <n> pending`. Rolled out in `lib/service/Renegotiator.ts`, `lib/service/cooperative/ChainSwapSigner.ts`, `lib/service/cooperative/EipSigner.ts`, and `lib/wallet/ethereum/contracts/Commitments.ts` (replaces the bare `AsyncLock` usage and passes the `op` label at each `acquire` site). Covered by new 128-line `test/unit/InstrumentedLock.spec.ts`.

**Refactors**:
- refactor: get lightning gossip also from LND (#1424) (`dc9c6f83`) — `boltzr/src/service/lightning_info.rs` (single file, CLN-only) was split into a module: `mod.rs` (the new transport-agnostic `GraphLightningInfo` aggregator + previous public types/helpers), `cln.rs` (CLN-side gossip from `listchannels`/`listnodes`), and `lnd.rs` (new LND-side gossip from `describe_graph`). `lnd::mod` adds a `describe_graph` helper around `lnd_rpc::ChannelGraphRequest` (`include_unannounced=false`, `include_auth_proof=false`); the `lnd_rpc` proto module is now `pub(crate)` so the `lightning_info::lnd` submodule can use its types. `boltzr/src/service/mod.rs` swaps `Box::new(ClnLightningInfo::new(...))` for `Box::new(GraphLightningInfo::new(...))` in both prod construction and the test fixture; gossip in `service::lightning_info` is now sourced from **both** LND and CLN. A new `boltzr/src/lightning/lnd/mod.rs` test helper `lnd_client(node, port)` is added for the LND-side integration tests; no public REST/gRPC API, env-var, `boltz.conf` schema, or DB-migration change.
- chore: bump CLN to v26.06 (#1426) (`9bcd02e1`) — `docker/build.py` `C_LIGHTNING_VERSION` bumped from `26.04.1` → `26.06`; `lib/VersionCheck.ts` CLN range updated to `minimal=26.04`, `maximal=26.06`. With v26.06 in the supported range, the legacy `disableMpp` config option was removed from `lib/lightning/cln/ClnClient.ts` and `lib/lightning/cln/Types.ts` (the `xpay` call now always uses an empty `layers: []` instead of `['auto.no_mpp_support']`), and the `# disableMpp = false` line was removed from `docs/boltz.conf`. `boltzr/src/lightning/cln/mod.rs` dropped the 24.08-specific `list_configs` / `experimental-offers` startup check, and with it the entire `boltzr/src/lightning/mod.rs::Error::NoBolt12Support` enum (the file is now just `pub mod cln; pub mod invoice; pub mod lnd;`). `lib/lightning/cln/Router.ts` migrated from the deprecated `GetRoute` RPC to `GetRoutes` (`GetroutesRequest`), which requires the local node id as a `source` argument — `ClnClient.queryRoutes` now passes `this.id` to both the direct and routing-hint `getRoute` calls. Regenerated `proto/cln/node.proto` (+1238 lines) and `proto/cln/primitives.proto` (+44 lines); `regtest` submodule advanced to the matching v26.06 image. Tests cleaned up: integration `Router.spec.ts` adapts to the new RPC signature, integration `ClnClient.spec.ts` drops the now-obsolete `disableMpp` cases, and `test/unit/VersionCheck.spec.ts` is updated for the new min/max boundary.

**Documentation Impact**:
- `INDEX.md` (project): **Lightning Integration** section reworded — LND bullet now mentions the `lnd_rpc::ChannelGraphRequest` / `describe_graph` gossip contribution and the new `GraphLightningInfo` aggregator (PR #1424); CLN bullet bumped to **v26.06** with notes on the `disableMpp` / experimental-offers / `GetRoute → GetRoutes` removals (PR #1426). **Observability** section gained a per-key async-lock metrics paragraph covering `InstrumentedLock` and the three new gauges (PR #1427).
- `system/architecture.md`: **Lightning Integration** subsection rewritten — `LndClient` now references the `describe_graph` gossip contribution, `ClnClient` updated to **v26.06** with the same removal notes plus the deletion of the `Error::NoBolt12Support` Rust enum. **Monitoring** subsection updated with the `InstrumentedLock` + lock-overflow enrichment.
- `system/project_overview.md`: **Observability** capability bullet expanded to mention the new lock metrics.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** — Lightning bullet updated to **CLN v26.06** with a note on the `disableMpp` / experimental-offers / `GetRoute → GetRoutes` removals; new bullets added for the LND-side gossip contribution (PR #1424) and the per-key async-lock instrumentation (PR #1427). Tags extended with `lightning-gossip`, `async-lock-metrics`.
- `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — the CLN bump only affects the pinned image / internal RPC plumbing (no public REST surface), the LND gossip refactor is internal to the `boltzr` service layer, and the lock-metrics rollout is observability-only (new gauges are exposed on the existing Prometheus `/metrics` endpoint).

---

## 2026-06-02 - Documentation Update
**Commit**: `c0e5b66c` (boltz-backend repository)
**Previous Sync**: `df549e03`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Features Added**:
- feat: store swap metadata (#1423) (`c0e5b66c`) — new opaque client-supplied **swap routing metadata** persisted alongside each swap. Sequelize migration `2026-05-27-000000-0000_swap_metadata` (and matching Diesel migration under `boltzr/migrations/`) creates a new `swap_metadata` table (`swap_id` VARCHAR(255) PK → `data` BYTEA NOT NULL, `created_at` TIMESTAMPTZ DEFAULT NOW()). New TypeScript `SwapMetadata` Sequelize model (`lib/db/models/SwapMetadata.ts`) registered in `lib/db/Database.ts` and `SwapMetadataRepository` (`add(swapId, Buffer)` / `get(swapId)`). New Rust `SwapMetadataHelper` (`boltzr/src/db/helpers/swap_metadata.rs`) with matching `schema.rs` entry, wired into `service/mod.rs`, `grpc/service.rs`, and `main.rs`. `SwapRouter` (`lib/api/v2/routers/SwapRouter.ts`, +71 lines) accepts an optional `metadata` HEX string on POST `/v2/swap/submarine`, `/v2/swap/reverse`, and `/v2/swap/chain`, validated via a new `parseMetadata` (regex `^(?:[0-9a-fA-F]{2})+$`, **2–2048 hex chars / 1–1024 bytes** — out-of-range or invalid hex throws `INVALID_PARAMETER('metadata')`) and persisted via a new `persistMetadata` after each successful `create*Swap` call. `boltzr/src/service/rescue.rs` adds an `Option<String> metadata` field to `RestorableSwap` and a `SwapRescue::attach_metadata` step that the `restore` flow runs to populate it (HEX-encoded) before sorting. `swagger-spec.json` documents the new request field on all three create endpoints and the response field on the restore schema. New unit tests: `test/unit/api/v2/routers/SwapRouter.spec.ts` (+170 lines) covering parser bounds + persistence, and `test/integration/db/repositories/SwapMetadataRepository.spec.ts` (+40 lines).

**Tooling / Chores**:
- chore: env var override for mempool.space in CI (#1425) (`3abe544d`) — `boltzr/src/chain/mempool_client.rs` test helper `mempool_api()` now reads the `MEMPOOL_API_URL` env var (trimmed, trailing-slash-stripped, empty → default `https://mempool.space/api`) so the network-dependent `MempoolSpace`/client test cases can be retargeted in CI; `.github/workflows/ci.yml` `build-rust` job adds `permissions: contents: read` and exposes `MEMPOOL_API_URL: ${{ vars.MEMPOOL_API_URL }}` to `cargo test`. Test-only / CI-only; no production behaviour, config schema, or API surface change.

**Documentation Impact**:
- `INDEX.md` (project): added a **Swap routing metadata** bullet under **Database / Configuration** describing the new `swap_metadata` table, the size cap (1024 bytes), Sequelize + Diesel migration, and the writer (`SwapMetadataRepository`) / reader (`SwapMetadataHelper` + `SwapRescue::attach_metadata`) call sites.
- `system/architecture.md`: added the **Swap metadata table** bullet to the **Database** subsection.
- `testing/api-reference.md`: documented the new optional `metadata` HEX field on the swap-create POST bodies (length/regex/error code) and noted that it is returned by `/v2/swap/restore`.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** gained a **swap routing metadata** bullet; tags extended with `swap-metadata`.
- The mempool.space CI env-var change is test/CI-only and has no docs surface.

---

## 2026-05-24 - Documentation Update
**Commit**: `df549e03` (boltz-backend repository)
**Previous Sync**: `1bbc85c1`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Internal Changes Only** — dependency-bump churn only, no user-facing documentation updates required.

**Tooling / Chores**:
- chore: bump qs from 6.14.2 to 6.15.2 (#1421) (`df549e03`) — transitive npm dependency bump touching only `package-lock.json` (+3/-166). No source files, config schema, REST/gRPC surface, DB migration, env var, or runtime behaviour change.

**Documentation Impact**:
- None. No changes to `INDEX.md`, `system/`, `testing/`, or `sop/` content.

---

## 2026-05-23 - Documentation Update
**Commit**: `1bbc85c1` (boltz-backend repository)
**Previous Sync**: `0c66e188`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Internal Changes Only** — no user-facing documentation updates required. All three commits are NPM/tooling churn: dependency bumps, an internal HTTP wrapper that replaces `axios`, and an in-tree TypeChain generation step for the `boltz-core` v5 bump. No new REST/gRPC surface, swap-type capability, `boltz.conf` schema, DB migration, env var, or runtime behaviour change.

**Tooling / Chores**:
- chore: bump NPM dependencies (`7d18ff98`) — drops `axios ^1.16.0` entirely and replaces all four exchange-rate adapters (`lib/rates/data/exchanges/{Binance,Bitfinex,CoinbasePro,Kraken}.ts`) and `docs/setup.js` with a new internal `lib/Http.ts` helper that wraps `fetch`/`AbortSignal.timeout` and exposes `getJson<T>` / `getText` plus an `HttpError` class. Bumps `@grpc/grpc-js` (`^1.14.3` → `^1.14.4`), the OpenTelemetry instrumentation/exporter/SDK family (`^0.217.0` → `^0.218.0` for `exporter-trace-otlp-grpc` / `instrumentation-grpc` / `instrumentation-http` / `sdk-node`; `^0.65.0` → `^0.66.0` for `instrumentation-express`; `^0.69.0` → `^0.70.0` for `instrumentation-pg`; `^0.61.0` → `^0.62.0` for `instrumentation-winston`), `pg` (`^8.20.0` → `^8.21.0`), `swagger-ui-dist` (`^5.32.5` → `^5.32.6`), `@swc-contrib/mut-cjs-exports` (`^14.9.0` → `^14.10.0`), and `typescript-eslint` (`^8.59.2` → `^8.59.4`).
- chore: bump `boltz-core` to v5 (`9af5faa3`) — `boltz-core ^4.0.5` → `^5.0.0`. v5 no longer ships compiled TypeChain bindings; the repo now generates them locally via a new `generateTypechain.js` (runs `typechain` against `boltz-core/out/{ERC20,ERC20Swap,EtherSwap}.sol/*.json` into `lib/wallet/ethereum/typechain/`) and a new `npm run generate:typechain` script wired into `postinstall` (`node parseGitCommit.js && npm run proto && npm run generate:typechain`). Adds devDeps `typechain ^8.3.2`, `@typechain/ethers-v6 ^0.5.1`. `lib/wallet/ethereum/contracts/{Commitments,ContractEventHandler,ContractHandler,ContractUtils,Contracts}.ts`, `lib/wallet/ethereum/EthereumManager.ts`, `lib/service/cooperative/EipSigner.ts`, `lib/consts/Types.ts`, and seven integration specs are updated to import from `../typechain/...` instead of `boltz-core/typechain/...`. Generated directory is added to `.gitignore`. `jest.config.js` extends the integration test glob to include the new contracts spec layout.
- fix: Docker builds (#1420) (`1bbc85c1`) — `generateTypechain.js` now gracefully skips when `typechain` is absent and `--omit=dev` is set (e.g. production Docker stages that install only runtime deps), throwing only when the dev deps were expected; otherwise the production `postinstall` step would fail with "Missing typechain generation dependency".

**Documentation Impact**:
- None. The `axios → lib/Http.ts` swap is purely internal (the exchange-rate adapter signatures and outputs are unchanged); the `boltz-core` v5 bump only relocates TypeChain bindings from upstream to local-generation with no API surface change; the Docker build fix is a `postinstall` resilience tweak. The existing `system/`, `testing/`, and `INDEX.md` documents already describe `boltz-core` and the Rust components without pinning a specific upstream version, so no rewrite is needed.

---

## 2026-05-22 - Documentation Update
**Commit**: `0c66e188` (boltz-backend repository)
**Previous Sync**: `246dcfbe`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 7 commits

**Features / Behaviour Changes**:
- feat: JWT authentication for gRPC server (#1415) (`f41000dd`) — every call on `boltzrpc.Boltz` is now authenticated by a new `AuthInterceptor` against tokens issued by the server itself. New `jwt_tokens` table (Sequelize model `JwtToken` + `JwtTokenRepository`) persists tokens; `JwtSigner` mints/validates them. New RPCs `IssueJwt`, `RevokeJwt`, `ListJwts`, `ListMethods` (latter returns the exact method paths and accepted wildcard entries — `*`, `<service>/*`). Each token carries `allowed_methods` (exact paths or wildcards) and optional `expires_in_seconds` TTL. On first start a bootstrap admin token is written to `<certificates>/admin.jwt` at mode `0600`. Configured via new optional `[grpc.jwt]` section in `boltz.conf` (`disable`, `secretFile` — default `<certificates>/jwt.key`, `adminTokenFile` — default `<certificates>/admin.jwt`); matching TypeScript `GrpcJwtConfig` added to `lib/Config.ts`. `boltzr-cli` gains `jwt …` subcommands wrapping all four RPCs (`boltzr-cli/src/main.rs`, `parsers.rs`, `grpc/mod.rs`). The pre-existing logging interceptor was extracted to `lib/grpc/interceptors/LoggingInterceptor.ts` alongside the new `AuthInterceptor.ts`; `MethodRegistry` enumerates the registered methods/wildcards used by both the registry RPC and the auth allowlist.
- feat: preemptively rotate 0-conf API WebSocket (#1414) (`779beaff`) — the Liquid 0-conf observation WebSocket transport now proactively reconnects before the server-side TTL drops the connection, controlled by a new `rotation_interval_secs` config knob (default `3300`s, `0` disables). The single-file `zero_conf_tool/ws.rs` was split into a module (`ws/{connection,mod,protocol,state,tests}.rs`); the new `connection.rs`/`protocol.rs`/`state.rs` separate transport, wire protocol, and observation state, and `tests.rs` exercises rotation + idle reconnect. `docs/boltz.conf` documents the new knob alongside `interval` / `max_retries` / `deadline_secs`. Transport selection (HTTP vs WS by URL scheme) now also emits a `debug!` log.

**Refactors**:
- refactor: remove Elements lowball node (#1417) (`b84dfca3`) — the legacy `[liquid.chain.lowball]` backup-node configuration and the `ElementsWrapper` dual-node failover are removed. `liquid.chain` now configures a single Elements RPC endpoint. Deletes `lib/chain/ElementsWrapper.ts` (-180 lines) and its integration spec `test/integration/chain/ElementsWrapper.spec.ts` (-234 lines); simplifies `ElementsClient.ts`, `boltzr/src/chain/elements_client.rs`, `lib/chain/ChainClient.ts`, `lib/Boltz.ts`, `lib/Config.ts` (drops `LiquidChainConfig` and `lowball` export), `lib/swap/SwapNursery.ts`, `lib/swap/UtxoNursery.ts`, `lib/service/Service.ts`, `lib/service/cooperative/{CoopSignerBase,DeferredClaimer}.ts`, and `boltzr/src/chain/mod.rs`. `docs/boltz.conf` drops the `[liquid.chain.lowball]` block.

**Bug Fixes**:
- fix: flaky mempool.space integration tests (`35e67e82`, `97b60b3f`) — `boltzr/src/chain/mempool_client.rs` test stabilisation only; no production behaviour change.

**Tooling / Chores**:
- chore: bump eclair to v0.14.0 (`02fdf501`) — `docker/build.py` bumps the pinned Eclair Docker image from `0.13.1` to `0.14.0`. No code path change.
- chore: bump vulnerable NPM dependencies (`106cfdf0`) — `package-lock.json` only (16 insertions / 17 deletions); no `package.json` change.

**Documentation Impact**:
- `INDEX.md` (project): added a new **gRPC Authentication** subsection (JWT interceptor, `[grpc.jwt]` config, new RPCs, `boltzr-cli jwt …`, `jwt_tokens` table); extended **Bitcoin / Liquid Nodes** to note the **Lowball backup node removed** (PR #1417) and the new `rotation_interval_secs` knob for the WebSocket 0-conf transport; added **Eclair v0.14.0** to **Lightning Integration**.
- `system/project_overview.md`: added a new **gRPC JWT Authentication** capability bullet (PR #1415); extended **Liquid 0-Conf Observation API** with the `rotation_interval_secs` WS rotation knob and a bullet calling out the `[liquid.chain.lowball]` / `ElementsWrapper` removal.
- `system/architecture.md`: added a new **gRPC Server (`lib/grpc/`)** subsection covering `GrpcServer`, `AuthInterceptor` + `JwtSigner`, `LoggingInterceptor`, `MethodRegistry`, and the JWT management RPCs; added `ElementsClient` (single-node) bullet under **Chain Integration** with a note that `ElementsWrapper` was removed; added `EclairClient` v0.14.0 under **Lightning Integration**; added the `jwt_tokens` table to the **Database** section.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** gained a **gRPC JWT authentication** bullet and the **lowball single-node** + **WebSocket `rotation_interval_secs`** updates; the LND/CLN bullet now also lists **Eclair pinned to v0.14.0**; added `grpc`, `jwt-auth`, `eclair` tags.
- `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — the JWT auth surface is on the **internal** `boltzrpc.Boltz` gRPC, not the public REST/WebSocket API; the Liquid 0-conf WS rotation and Eclair bump are config/Docker-pin changes with no public API or env-var surface; the lowball removal is a config-schema cleanup with no public-facing behaviour change.

---

## 2026-05-21 - Documentation Update
**Commit**: `246dcfbe` (boltz-backend repository)
**Previous Sync**: `e91269df`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Internal Changes Only** — no user-facing documentation updates required.

**Chore**:
- Log before sending on EVM (#1413) — `ContractHandler` now takes a `Logger` in its constructor and emits debug logs prior to each EVM lockup send (EtherSwap and ERC20Swap lockup + prepay-minerfee variants), including swap label, amount, contract address, and (for ERC20) token symbol. Internal observability only; no API, schema, config, or dependency changes.

## 2026-05-20 - Documentation Update
**Commit**: `e91269df` (boltz-backend repository)
**Previous Sync**: `00aa3d96`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 4 commits

**Features / Behaviour Changes**:
- fix: allow committing underpaid chain swaps (`ef82d25f`) — `Commitments.checkExpectedAmount` (in `lib/wallet/ethereum/contracts/Commitments.ts`) now short-circuits and accepts underpaid EVM commitments for `SwapType.Chain`. The commitment row is written so the lockup transaction can be recorded, then the swap is taken to `transaction.lockup.failed` via the normal nursery path and resumed through renegotiation. Submarine Swaps still throw `insufficient amount: …` when the locked amount is below the expected amount. `docs/commitment-swaps.md` step 4 was updated upstream to call out the per-swap-type distinction. This extends the previously-shipped "0-amount EVM commitments accepted for chain swaps" capability to the broader "0-or-underpaid" envelope.

**Refactors**:
- refactor: bump `boltz-core` to v4 (#1410) (`1b93bc79`) — dependency migration touching ~90 files. `boltz-core` bumped from `3.1.0` to `^4.0.5`. The legacy `bitcoinjs-lib` / `bip32` / `bip39` / `ecpair` / `slip77` / `tiny-secp256k1` and dev-only `@boltz/bitcoin-ops` packages were removed and replaced with `@scure/bip32 ^2.2.0`, `@scure/bip39 ^2.2.0`, `@noble/curves ^2.2.0`, and `@noble/hashes ^2.2.0`. Call-sites across `lib/Core.ts`, `lib/AddressUtils.ts` (new file), `lib/TxView.ts` (new file), `lib/Utils.ts`, `lib/wallet/Slip77.ts` (new local implementation), `lib/wallet/Wallet.ts`, `lib/wallet/WalletLiquid.ts`, `lib/wallet/WalletManager.ts`, `lib/wallet/ethereum/EthereumManager.ts`, `lib/wallet/ethereum/contracts/ContractHandler.ts`, `lib/wallet/providers/CoreWalletProvider.ts`, `lib/wallet/providers/WalletProviderInterface.ts`, `lib/chain/ArkClient.ts`, `lib/chain/ChainClient.ts`, `lib/db/Migration.ts`, `lib/db/models/ReverseRoutingHint.ts`, `lib/lightning/SelfPaymentClient.ts`, `lib/service/{EventHandler,Service,TransactionFetcher,cooperative/{CoopSignerBase,Utils}}.ts`, `lib/swap/{LightningNursery,PaymentHandler,RefundWatcher,ReverseRoutingHints,SwapManager,SwapNursery,UtxoNursery}.ts`, `lib/consts/BitcoinNetworks.ts`, `lib/ECPairHelper.ts`, and `lib/Boltz.ts` were updated to the new crypto APIs (Schnorr signatures, ECDSA, base58/bech32 codecs, BIP32/BIP39 derivation, SLIP-77 blinding). New `lib/AddressUtils.ts`, `lib/TxView.ts`, and `lib/wallet/Slip77.ts` provide the previously-external behaviour locally. Solidity-deploy script `regtest:solidity:deploy` now runs `./tools/install-boltz-core-solidity-libs.sh` (a new repo script) and passes `PERMIT2_ADDRESS=0x000000000022D473030F116dDEE9F6B43aC78BA3` explicitly. Test suite extensively rewritten — new `test/unit/{AddressUtils,TxView,wallet/{Bip32,Bip39,Slip77},consts/BitcoinNetworks}.spec.ts`; the snapshot-heavy `test/integration/__snapshots__/Core.spec.ts.snap` (1088 lines) and the `test/unit/chain/FakeChainClient.ts` shim (282 lines) were removed. No public REST API, swap-type capability, env-var, `boltz.conf` schema, DB migration, or service-component change — Bitcoin/Liquid/EVM/Lightning behaviour stays as documented.

**Bug Fixes**:
- fix: flaky gRPC server test (#1412) (`e91269df`) — `test/unit/grpc/GrpcServer.spec.ts` stabilisation only (`+55/-51`); no library, RPC, or behaviour change.

**Tooling / Chores**:
- chore: make missing backup dependencies clearer (`dd6fbb74`) — `boltz-backup/src/lib.rs` now wraps the `pg_dump` `Command::spawn()` call so an `ErrorKind::NotFound` returns `anyhow!("pg_dump binary not found in PATH; install PostgreSQL client tools or disable the backup section in the config")` instead of a generic IO error. Operational diagnostics improvement; no config schema, capability, env-var, dependency-graph, component, or migration change.

**Documentation Impact**:
- `INDEX.md` (project): extended the **Chain Swaps** Key Concept bullet to call out that underpaid EVM commitments are now accepted (alongside the existing 0-amount allowance) and routed through `transaction.lockup.failed` → renegotiation, with Submarine Swaps still rejecting underpaid commitments.
- `system/project_overview.md`: same extension to the **Three Swap Types → Chain Swaps** bullet.
- Master `docs/INDEX.md`: boltz-backend **Key Capabilities** chain-swap bullet updated for the 0-amount **and underpaid** EVM commitments behaviour.
- `system/architecture.md`, `system/integration-with-arkd.md`, `testing/usage.md`, `testing/api-reference.md`: no edits — the `boltz-core` v4 bump and `@scure`/`@noble` crypto migration are internal dependency swaps with no public-API, env-var, build-pipeline (still `npm run compile` / `npm run dev`), or DB-migration change; the `pg_dump` error-message improvement is internal to `boltz-backup`; the gRPC-server flake fix is test-only.

---

## 2026-05-19 - Documentation Update
**Commit**: `00aa3d96` (boltz-backend repository)
**Previous Sync**: `ee271552`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Tooling / Chores**:
- chore: add USDC to library section (#1409) (`00aa3d96`) — single-line edit to upstream `docs/libraries.md`: `boltz-core` TypeScript library's documented supported-currencies list extended from `LN, BTC, LBTC, RBTC, TBTC, USDT` to `… USDT, USDC`. This is a Boltz-side docs page; no `boltz-backend` source, schema, REST API, swap-type, env-var, DB-migration, build, or dependency change.

**Documentation Impact**: None — upstream documentation listing only. No public REST API, capability, dependency-graph, env-var, component, build, or migration changes in `boltz-backend` itself; supported-currency wording in `docs/projects/boltz-backend/` (e.g. `system/project_overview.md`, project `INDEX.md`, master `docs/INDEX.md`) is unaffected because it tracks `boltz-backend`'s own chain support (BTC mainchain, Lightning, Liquid, EVM) rather than the `boltz-core` library's stablecoin tokens.

---

## 2026-05-18 - Documentation Update
**Commit**: `ee271552` (boltz-backend repository)
**Previous Sync**: `84ccb074`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Bug Fixes**:
- fix: do not refund chain swaps with pending claims (#1407) (`ee271552`) — `ChainSwapRepository.refreshChainSwaps` now also excludes `SwapUpdateEvent.TransactionClaimPending` from the set of refundable chain swaps (added alongside `FinalChainSwapEvents` in the `Op.notIn` filter). `TransactionClaimPending` is set only after the preimage is received from the user's claim of our sending leg, so the receiving-leg refund path has nothing to do — those swaps are left to the deferred claimer instead of being prematurely refunded. Covered by an additional fixture entry in `test/unit/db/repositories/ChainSwapRepository.spec.ts`.
- fix: harden EVM broadcasts (#1408) (`07b6748c`) — `InjectedProvider.sendTransaction` now distinguishes nonce-conflict broadcast rejections (`NONCE_EXPIRED`, `REPLACEMENT_UNDERPRICED`, or messages containing "nonce too low" / "nonce has already been used" / "already known" / "replacement transaction underpriced") via a new `isNonceConflictError` helper in `EthereumUtils.ts`. When any fan-out rejection looks like a nonce conflict, the provider calls `lookupBroadcastedTransactionWithRetry` (a per-provider `getTransaction(hash)` race with 5 s timeouts, retried at `[250, 750, 1_500, 3_000, 5_000, 8_000, 11_500]` ms delays via `racePromise` / `sleep`) and returns the on-chain `TransactionResponse` as a successful broadcast if it lands — this avoids treating Arbitrum-sequencer races (and ethers' documented `NONCE_EXPIRED` semantics) as broadcast failures. Only when the lookup never sees the tx is the original rejection surfaced. New unit coverage: 52-line `test/unit/wallet/ethereum/EthereumUtils.spec.ts` for the matcher and 254-line `test/unit/wallet/ethereum/InjectedProvider.spec.ts` for the recovery path.

**Documentation Impact**: None — both changes are internal robustness fixes. (#1407) is confined to the chain-swap refund query in `ChainSwapRepository`; the public REST API, swap-update event vocabulary, env-var / `boltz.conf` schema, DB migrations, and component list in `system/architecture.md` are unchanged. (#1408) is internal to `InjectedProvider` / `EthereumUtils` and only affects how nonce-conflict broadcast errors are handled (silently recovered when the tx is on chain); no new env var, config knob, RPC, or component is introduced — the existing "Chain Layer (EVM)" wording in `system/architecture.md` and the operational notes in `INDEX.md` remain accurate. Project INDEX, system, testing docs and master `docs/INDEX.md` unchanged.

---

## 2026-05-16 - Documentation Update
**Commit**: `84ccb074` (boltz-backend repository)
**Previous Sync**: `4988987b`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 commits

**Features Added**:
- feat: disable signers gRPC (#1302) (`1bfbef98`) — new operational signer-control surface on `boltzrpc.Boltz`: `DisableSigners` / `EnableSigners` / `GetDisabledSigners` operating on a new `Signer` enum with 11 variants (`SUBMARINE_REFUND_COOPERATIVE`, `REVERSE_CLAIM_COOPERATIVE`, `CHAIN_REFUND_COOPERATIVE`, `CHAIN_CLAIM_COOPERATIVE`, `DEFERRED_CLAIM_COOPERATIVE`, `EVM_REFUND_COOPERATIVE`, `EVM_COMMITMENT_REFUND_COOPERATIVE`, `REVERSE_LOCKUP`, `CHAIN_LOCKUP`, `SUBMARINE_INVOICE_PAYMENT`). State is persisted via new `disabled_signers` table (Sequelize migration `2026-05-12-000000-0000_disabled_signers`, `DisabledSigner` model, `DisabledSignerRepository`) and enforced by a new in-process `SignerControlRegistry` (with `SignerControlUtils`) consulted from `ChainSwapSigner`, `DeferredClaimer`, `EipSigner`, `MusigSigner`, `PaymentHandler`, `SwapNursery`, and `SelfPaymentClient`. `boltzr-cli` gains `signer {disable,enable,list-disabled} <SIGNER>…` subcommands wrapping the new RPCs. **Removed**: dev-only `DevDisableCooperative` RPC and `boltzr-cli dev toggle-cooperative` command.
- feat: add CLI flag to enable/disable all signers (`1455ec95`) — `boltzr-cli` startup flag toggling all signers on/off at boot (Rust-side; `boltzr-cli/src/main.rs` only).
- feat: add 0-conf API WebSocket support (#1402) (`08bb9fb0`) — `boltzr` `zero_conf_tool` module split into transport-agnostic shared types (`shared.rs`), HTTP polling client (`http.rs`, ~52 LoC), and new WebSocket client (`ws.rs`, ~1034 LoC) with a WS connection timeout. Transport is chosen by URL scheme (`http(s)` → REST polling, `ws(s)` → WS push). New `[liquid.chain.zeroConfTool]` config block in `docs/boltz.conf` exposing `endpoint`, HTTP-only `interval` (default `100` ms) / `max_retries` (default `60`), and WS-only `deadline_secs` (default `6`). When configured, lockup transactions are only considered 0-conf-safe once the bridge observation quorum is reached on the API; otherwise the elementsd mempool check is used.

**Bug Fixes**:
- fix: chain swap confirmation race (#1406) (`84ccb074`) — `SwapNursery` race-condition fix on chain-swap confirmation handling (11-line library change in `lib/swap/SwapNursery.ts`, covered by new 32-line `SwapNursery.spec.ts` unit case).
- fix: do not crash on rescan failures (`b39e1f94`) — `lib/Boltz.ts` now tolerates rescan failures instead of crashing the daemon (6-line guard).

**Documentation Impact**:
- `INDEX.md` (project): added a new **Signer Control** subsection under Configuration (gRPC surface, `Signer` enum, `disabled_signers` table + migration, `SignerControlRegistry` enforcement points, `boltzr-cli signer …` and boot-time flag, removal of `DevDisableCooperative`); appended a **Liquid 0-conf observation API** bullet to **Bitcoin / Liquid Nodes** covering the `[liquid.chain.zeroConfTool]` config, scheme-selected HTTP/WS transport, and per-transport tunables.
- `system/project_overview.md`: added new **Operational Signer Control** and **Liquid 0-Conf Observation API** capability subsections.
- Master `docs/INDEX.md`: added two boltz-backend Key Capabilities bullets (operational signer control gRPC + 0-conf observation API) and extended tags with `signer-control`, `zero-conf`, `liquid-zero-conf-tool`.
- `system/architecture.md`, `testing/usage.md`, `testing/api-reference.md`, `system/integration-with-arkd.md`: no edits — the two confirmation-race / rescan-crash fixes are internal, and the new gRPC surface lives on `boltzrpc.Boltz` (boltzr internal RPC, already covered at a high level), not the public REST API documented in `testing/api-reference.md`.

---

## 2026-05-14 - Documentation Update
**Commit**: `4988987b` (boltz-backend repository)
**Previous Sync**: `7ae3002e`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 4 commits (plus merge `4988987b`)

**Refactors**:
- refactor: use BIP-69 in boltz-core (#1400) (`105d6d61`) — internal Rust change in `boltz-core/src/{bitcoin,elements}/tx.rs` adopting BIP-69 deterministic input/output ordering for constructed transactions, with matching call-site updates in `boltz-core/src/wrapper.rs`, `boltzr-cli/src/tx/utils.rs`, `boltzr/src/chain/bumper/handlers/refund.rs`, and `boltzr/src/swap/manager.rs`. Library-internal; no public-facing API or capability change.
- refactor: poll block height instead of subscription (`6bb5430e`) — EVM block notifications in `InjectedProvider` now come from a single internal `setInterval` poll (`blockPollIntervalMs = 2_500`) of `getBlockNumber()` shared across all listeners, instead of per-WebSocket-provider `block` subscriptions and the per-provider injected-listener fan-in. `EthereumManager` correspondingly drops the stale-block / gap-detection block-handler logic and instead wires `provider.onReconnect(...)` to call `scheduleMissedEventChecks()` whenever a WS provider reconnects. Side effects worth flagging: the `NEED_WEBSOCKET_PROVIDER` error and the `InjectedProvider.allowHttpOnly` flag are gone — EVM chains can now run with HTTP-only RPC providers (the WebSocket-reconnect hook just no-ops in that case). New ~760-line unit coverage in `test/unit/wallet/ethereum/{InjectedProvider,ArbitrumProvider,EthereumManagerReconnect}.spec.ts`; integration suites trimmed to drop the WS-only assertions.
- refactor: derive l1BlockNumber from latest L2 block (`35a1ef7d`) — `ArbitrumProvider.getLatestBlock` now issues a single `eth_getBlockByNumber("latest", false)` call and reads `l1BlockNumber` out of the L2 block payload (hex-decoded), eliminating the second RPC round-trip to the L1 provider. New 87-line integration spec and rewritten 106-line unit spec for the provider.

**Bug Fixes**:
- fix: unclean shutdowns (`a25adaaa`) — `Boltz.registerExitHandler` now sequences shutdown explicitly (EVM managers → gRPC → DB → Redis → Profiling → Tracing → logger) with per-step timing in debug logs. `Tracing.init` is rewritten to drive the OTLP trace exporter through an explicit `BatchSpanProcessor` with `exportTimeoutMillis: 1_000`, and `logRecordProcessors`/`metricReaders` are explicitly empty so the SDK no longer leaves background work behind on shutdown; OTLP exporter also gains a `timeoutMillis: 1_000`. `WebSocketProvider` shutdown path tightened to match the new manager-first teardown ordering.

**Documentation Impact**: None for user-facing docs — all four commits are internal refactors/fixes (Rust tx-construction ordering, EVM block-notification mechanism, Arbitrum L1 derivation, and TS shutdown sequencing). No change to: public REST API, swap-type capability, env-var / `boltz.conf` schema, dependency graph, components listed in `system/architecture.md`, build pipeline, or DB migrations. The "EVM providers can now be HTTP-only" relaxation is not currently surfaced as a documented constraint anywhere in `docs/projects/boltz-backend/` either, so no doc edit is needed; project INDEX, system, testing, and master `docs/INDEX.md` files unchanged.

---

## 2026-05-13 - Documentation Update
**Commit**: `7ae3002e` (boltz-backend repository)
**Previous Sync**: `e6397e9a`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Features Added**:
- chore: make Ark rescan interval configurable (`0c0ea2a0`) — new `rescanInterval` option (seconds, default `300`) on the Ark currency config, surfaced in `docs/boltz.conf` and threaded `ArkConfig.rescanInterval → ArkClient → ArkSubscription`. `ArkSubscription` now stores `rescanIntervalSeconds` (validated `>= 1`, falls back to new `defaultRescanIntervalSeconds = 300`) and switches the timer from a hard-coded 5-minute interval to `rescanIntervalSeconds * 1_000`. `Service.rescanChain` now also handles Ark currencies (`arkNode.subscription.rescan()` + `arkNode.getBlockHeight()`), enabling manual rescans through the existing chain-rescan service path.

**Refactors**:
- refactor: getting claim tx from Fulmine (`7c4beaa2`) — added Fulmine RPC `GetVHTLCSpendingTx(vhtlc_id) → tx` to `proto/ark/service.proto` (REST: `GET /v1/vhtlc/spendTx/{vhtlc_id}`; PSBT-encoded fully signed Ark transaction, returned whether the vHTLC is spent by a finalized or pending tx). `ArkClient.getVhtlcSpendingTx` wraps it (decodes base64 PSBT). `ArkNursery.checkVHtlcClaim` was restructured: instead of fetching the spending tx by `vHtlc.spentBy` and scanning every preimage against swap candidates, it now (1) finds the matching reverse/chain swap by the spent outpoint `(txid, vout)` via `ReverseSwapRepository.getReverseSwap({ transactionId, transactionVout, ... })` / `ChainSwapRepository.getChainSwapByData(...)`, (2) reconstructs the canonical `vhtlcId` via `ArkClient.createVhtlcId(preimageHash, arkNode.pubkey, receiverPubkey)`, and (3) calls `GetVHTLCSpendingTx` to extract the matching preimage. New helper `fetchClaimPreimage` and `handleClaim` clean up the per-side flow. The `regtest` submodule was advanced to ship the matching Fulmine build.

**Tests**:
- `test/unit/chain/ArkSubscription.spec.ts` — new coverage for default interval, custom interval, and `RangeError` on `rescanIntervalSeconds < 1`.
- `test/unit/swap/ArkNursery.spec.ts` — rewritten claim-detection cases against the new outpoint-lookup + `GetVHTLCSpendingTx` flow for both reverse and chain swaps, including the "no matching preimage" warn path.

**Documentation Impact**:
- `INDEX.md` (project): Fulmine Integration section now lists `GetVHTLCSpendingTx` and the configurable `rescanInterval`.
- `system/integration-with-arkd.md`: added a "Boltz Backend → Fulmine (Ark RPC client)" subsection covering `ListVHTLCs`, `GetVHTLCSpendingTx`, the outpoint-based swap lookup, and the rescan interval.
- Master `docs/INDEX.md`: updated boltz-backend Key Capabilities bullet for Fulmine integration to mention `GetVHTLCSpendingTx` and `rescanInterval`.
- `system/architecture.md`, `system/project_overview.md`, `testing/usage.md`, `testing/api-reference.md`: no edits — changes are confined to the Fulmine/Ark integration layer (no Boltz public REST API, swap-type capability, env-var, build, or DB-migration change).

---

## 2026-05-12 - Documentation Update
**Commit**: `e6397e9a` (boltz-backend repository)
**Previous Sync**: `bd697247`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Tooling / Chores**:
- chore: bump vulnerable dependencies (#1398) — `package.json` and `package-lock.json` only. OpenTelemetry suite bumped `0.216.0 → 0.217.0` (`sdk-node`, `exporter-trace-otlp-grpc`, `instrumentation-{grpc,http}`); `instrumentation-express` `0.64.0 → 0.65.0`; `instrumentation-pg` `0.68.0 → 0.69.0`; `instrumentation-winston` `0.60.0 → 0.61.0`. Dev deps: `eslint-plugin-n` `17.24.0 → 18.0.1`, `jest` `30.3.0 → 30.4.2`, `ts-proto` `2.11.7 → 2.11.8`.

**Documentation Impact**: None — pure transitive/dev dependency security bumps; no public API, capability, dependency-graph (no new direct deps), env-var, component, build, or migration changes. The generic "OpenTelemetry tracing" mention in `project_overview.md`/`architecture.md` is version-agnostic, so no edits needed. Project INDEX, system, and testing docs unchanged; master `docs/INDEX.md` unchanged.

---

## 2026-05-09 - Documentation Update
**Commit**: `bd697247` (boltz-backend repository)
**Previous Sync**: `40b0eba4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Release**:
- chore: bump version to v3.13.0 (#1396) — `Cargo.toml`, `package.json`, and `swagger-spec.json` bumped from `3.12.1` → `3.13.0`; `Cargo.lock` and `package-lock.json` refreshed accordingly. The accompanying `CHANGELOG.md` entry consolidates the v3.12.1..v3.13.0 history (Ark swaps, EVM chain-swap fixes, cooperative refund/claim hardening, claim-transaction persistence, mempool.space deduplication, dependency bumps, etc.) — all individual items were already captured in prior sync entries (`4bc60b4d`, `85fd54d4`, `4a9c282b`, `ce18517f`, `6ba692ac`, …).

**Documentation Impact**: Minor — refreshed the stale `/version` response example in `testing/api-reference.md` from `3.11.0` → `3.13.0` to match the new release. No public API, capability, dependency-graph, env-var, component, build, or migration changes (this is a release-tagging commit only); project INDEX, system, and remaining testing docs unchanged.

---

## 2026-05-08 - Documentation Update
**Commit**: `40b0eba4` (boltz-backend repository)
**Previous Sync**: `4bc60b4d`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 4 commits

**Features Added**:
- EVM 0-amount commitments for chain swaps (#1389): `Commitments` contract wrapper now accepts 0-amount commitment lookups and `EthereumNursery` runs the same amount checks for 0-amount chain-swap lockups, routing them into the existing renegotiation flow used by UTXO lockups. New 176-line `Commitments.spec.ts` integration suite and 95-line `EthereumNursery.spec.ts` unit suite cover the new path.

**Bug Fixes**:
- Skip commitment lookup for server lockups (#1394): chain-swap server-side EVM refunds (`refundEther` / `refundERC20`) previously failed with `INVALID_LOCKUP_TRANSACTION` whenever a `Commitment` row existed for the swap, because `getIdentifier` returned the user-side commitment's `lockupHash` on every query — a hash computed against the receiving chain's contract that could never match a `Lockup` event on the sending chain. `ContractUtils` now skips the commitment lookup for server lockups, with `DeferredClaimer`, `EipSigner`, and `SwapNursery` updated to pass the correct side, plus a 54-line `ContractUtils.spec.ts` integration test and 117-line `SwapNursery.spec.ts` unit test.

**Tooling / Chores**:
- chore: fix metrics in `boltzr` sidecar (#1395) — minor `boltzr-cli/src/ws.rs` adjustment plus `Cargo.lock` refresh.
- chore: bump `ip-address` (transitive) from 10.1.0 to 10.2.0 via dependabot (#1393).

**Documentation Impact**: Minor capability addition — added "0-amount EVM commitments for chain swaps" to the master `docs/INDEX.md` boltz-backend Key Capabilities and to project-level INDEX/`project_overview.md` Chain Swaps sections. The cooperative-refund fix and metrics/dependency chores are internal; no public REST API, env-var, component, build, or migration changes.

---

## 2026-05-07 - Documentation Update
**Commit**: `4bc60b4d` (boltz-backend repository)
**Previous Sync**: `85fd54d4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Tooling**:
- chore: `.gitignore` updated to exclude `.boltz-local` (#1392).

**Documentation Impact**: None — `.gitignore`-only change; no public API, capability, dependency, env-var, component, build, or migration changes. Project INDEX, system, and testing docs unchanged.

---

## 2026-05-06 - Documentation Update
**Commit**: `85fd54d4` (boltz-backend repository)
**Previous Sync**: `4a9c282b`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 commits

**Bug Fixes**:
- Sync linked swap and commitment on cooperative refund (#1385): `EipSigner` now atomically marks the linked swap as refund-signature-created and the matching `commitments` row as refunded for both refund paths. The commitment-only path additionally resolves any linked swap, runs `MusigSigner.refundNonEligibilityReason` against it, and rejects with `NOT_ELIGIBLE_FOR_COOPERATIVE_REFUND` when the linked swap isn't eligible. Adds `EipSigner.setRefundSignatureCreated` helper and 405-line `EipSigner.spec.ts` integration suite; `CommitmentRepository.markRefunded` no longer needs a transaction passed in.

**Dependency Bumps** (#1388):
- `axios` ^1.15.0 → ^1.16.0
- OpenTelemetry suite (sdk-node, exporter-trace-otlp-grpc, instrumentation-{express,grpc,http,pg,winston}) bumped to 0.216.0 / 0.64.0 / 0.68.0 / 0.60.0 lines
- `@bufbuild/protobuf` ^2.11.0 → ^2.12.0
- `@scure/base` ^2.0.0 → ^2.2.0; `@scure/btc-signer` ^2.0.1 → ^2.2.0
- `redis` ^5.11.0 → ^5.12.1; `swagger-ui-dist` ^5.32.2 → ^5.32.5
- `@swc-contrib/mut-cjs-exports` ^14.8.0 → ^14.9.0; `@swc/core` ^1.15.24 → ^1.15.33
- Plus matching Cargo.lock / Cargo.toml refresh across `boltz-backup`, `boltz-cache`, `boltzr`

**Tooling**:
- ESLint and Prettier now run with persistent caches under `node_modules/.cache/eslint/` and `node_modules/.cache/prettier/cache`.
- Regtest submodule bumped (`b616d748` → `0420b69a`).

**Upstream Documentation** (no impact on Arkadian docs):
- LLM-friendly publishing made discoverable from `docs/index.md`: `/llms.txt`, `/llms-full.txt`, and per-page `.md` Markdown sources (#1386).
- New Boltz Lightning node "Mini" listed alongside CLN/LND nodes (#1390).

**Documentation Impact**: None — cooperative-refund fix is internal to `EipSigner`/`CommitmentRepository`; no public API, capability, dependency-graph, env-var, component, build, or migration changes. Project INDEX, system, and testing docs unchanged.

---

## 2026-05-03 - Documentation Update
**Commit**: `4a9c282b` (boltz-backend repository)
**Previous Sync**: `ce18517f`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Bug Fixes**:
- Racy renegotiation (#1383): pass `{ allowLockupFailedUpdate: true }` from `Renegotiator` into lockup-tx setters across `ArkNursery`, `EthereumNursery`, and `UtxoNursery` so renegotiation-driven lockup updates can apply even when the swap previously transitioned to `lockup.failed`. `ChainSwapRepository.setUserLockupTransaction` / `setServerLockupTransaction` now accept and gate this allowance, with new repository-level integration tests and unit-test coverage for each nursery.

**Documentation Impact**: None — bug fix in internal swap-nursery / repository logic; no public API, capability, dependency, env-var, component, build, or migration changes. Project INDEX, system, and testing docs unchanged.

---

## 2026-05-01 - Documentation Update
**Commit**: `ce18517f` (boltz-backend repository)
**Previous Sync**: `6ba692ac`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Bug Fixes**:
- EVM address case normalization in `EthereumManager.contractsForAddress` and claim-data decoding (#1382): both contract-address comparisons and the `tx.to` comparison now run through `getAddress()` so checksummed/non-checksummed/lowercase variants match correctly.

**Refactors**:
- Persist Ark lockup transaction before amount/zero-conf checks in `ArkNursery` (#1381): `SwapRepository.setLockupTransaction` is now called immediately after the lockup vHTLC is detected, so the swap row records the lockup tx even when the subsequent expected-amount check fails and `swap.lockup.failed` is emitted.

**Documentation Impact**: None — no public API, capability, dependency, env-var, component, build, or migration changes. Project INDEX, system, and testing docs unchanged.

---

## 2026-04-29 - Documentation Update
**Commit**: `6ba692ac` (boltz-backend repository)
**Previous Sync**: `e92b7e3e`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 45 commits

**Features Added**:
- Persisted claim transaction tracking (#1371): new `claim_transactions` table, `ClaimTransaction` Sequelize model, and `ClaimTransactionRepository`. PostgreSQL trigger enforces `swap_id` FK against `reverseSwaps`/`chainSwaps`. Cooperative claims on UTXO chains are intentionally not stored (preimage already obtained from cooperative signing).
- Fulmine macaroon support (#1360) — extended into `boltzr-cli` for authenticated calls.
- CLI tool to rotate referral API keys (#1358).
- HTTP status code improvements for API errors (#1351).

**Improvements & Refactors**:
- Tolerate positive slippage on commitment swaps and chain-swap renegotiation (#1372) using a single shared `OverpaymentProtector`.
- Re-compute zero-conf decision when chain swaps are renegotiated.
- Exclude paid swaps from invoice expiry; expiry no longer overwrites paid swaps.
- Cap swap-restore pagination to bound recovery work.
- Harden mempool.space integration (deduplicate instances, round Bitcoin fee estimations to one decimal for stability).
- Harden BOLT12 offer handling.
- Sanitize referral IDs.
- Optimize fulmine calls on startup; switched to Fulmine `ListVHTLCs` (#1353).
- Macaroon support fixed in `boltzr-cli`.

**Dependency Bumps**:
- TypeScript upgraded to **v6.0.2** (build now uses `tsconfig.build.json`; watch mode mirrors it).
- Removed `@typescript-eslint/parser` and `pg-hstore`.
- Bitcoin Core bumped to **v31.0** (regtest images).
- Core Lightning bumped to **v26.04** then **v26.04.1** (#1377).
- Elements bumped to **v23.3.3**.
- protobufjs pinned via `overrides` to **^7.5.5**.
- AWS SDK S3 (boltz-backup) bumped to 1.129.0 with explicit feature set.
- Vulnerable Rust and npm dependencies refreshed; clippy fixed for Rust 1.95.0.
- Stable RPC adopted for Arbitrum tests.

**Documentation**:
- New page: cooperative claim/refund states (`docs/claiming-swaps.md`) (#1380).
- VitePress switched to `vitepress-plugin-llms`; `index.md` included in `llms.txt` (#1378).
- Currency abbreviations adopted across docs (#1369).

**Build/Tooling**:
- Docker build fixes.
- Separate CI job for `boltz-core` features.
- `boltz-core` exports cleaned up; removed `anyhow` from `boltz-core`.
- Docs publish action restored (#1361).

**Database Migrations**:
- `2026-04-23-151018-0000_claim_transactions_swap_id_trigger` — adds insert/update trigger validating `swap_id` against `reverseSwaps` ∪ `chainSwaps`.
