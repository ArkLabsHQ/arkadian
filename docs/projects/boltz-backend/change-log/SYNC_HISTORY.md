# Documentation Sync History - Boltz Backend

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
