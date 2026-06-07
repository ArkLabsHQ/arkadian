# Documentation Sync History - Boltz Backend

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
