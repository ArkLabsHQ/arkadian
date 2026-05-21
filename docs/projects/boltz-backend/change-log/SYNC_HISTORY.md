# Documentation Sync History - Boltz Backend

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
