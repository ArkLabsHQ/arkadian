# Documentation Sync History - Ark TypeScript SDK (@arkade-os/sdk)

## 2026-07-16 - Post-0.4.45 unreleased: arkd 0.9.14 alignment, ArkErrorName catalog, isSubdust widening, Dependabot bump
**From**: `8f45350d3345966cc5fe83e522e6728386bc6792`
**To**: `6c6e5338590f53bbfa762fc69950484e668792bf`
**Synced By**: update-project skill
**Status**: Four small changes on top of the published 0.4.45 cut — **no version bump** (`package.json` still `@arkade-os/sdk` 0.4.45 / `@arkade-os/boltz-swap` 0.3.50). (1) **arkd 0.9.14 indexer/provider alignment** — additive `renewableOnly` `GetVtxosOptions` filter, widened client-side mutual-exclusion guard, regtest `.env.regtest` arkd image `v0.9.11` → `v0.9.14`. (2) **`ArkErrorName` catalog + `isArkError` type guard** — new package-root exports centralizing the structured arkd error `name`s the SDK branches on; call sites replaced their `err.name === "..."` literal comparisons. (3) **`isSubdust` widened** to accept `{ value: number } | bigint`, unifying the wallet/delegate dust guards (which migrated `<= dust` → `< dust`). (4) **Dependabot** — 12 security alerts patched via workspace `overrides` + lockfile regeneration. All additive/refactor — default wallet behaviour is unchanged apart from the new `renewableOnly` filter and the subdust `<=`→`<` boundary.

**Commits analyzed** (5 non-merge commits):
- `7aa575a2` chore: unify isSubdust function
- `fb609250` feat: align indexer/provider layer with arkd 0.9.14 (adds `renewableOnly`, `ArkErrorName`/`isArkError` usage, `.env.regtest` v0.9.14 pin)
- `c59751a9` chore: use isSubdust for sendBitcoin dust check
- `2cf00046` refactor(sdk): type isArkError name as ArkErrorName (introduces `ArkErrorName` + `isArkError`)
- `126bea23` fix: patch 12 dependabot alerts (vitest, vite, js-yaml, uuid, and others)

**Docs updated**:
- `docs/INDEX.md` (master) — added four ts-sdk Key Capability bullets (arkd 0.9.14 alignment, `ArkErrorName`/`isArkError`, `isSubdust` widening, Dependabot bump) + new tags
- `docs/projects/ts-sdk/INDEX.md` — added four Key Concepts entries; appended a "Post-0.4.45 (unreleased)" clause to the Quick-Reference Version cell
- `docs/projects/ts-sdk/system/project_overview.md` — bumped the regtest arkd image reference `v0.9.11` → `v0.9.14`
- `docs/projects/ts-sdk/system/architecture.md` — extended the `errors.ts` module note with the `ArkErrorName` catalog + `isArkError` guard
- `change-log/last-sync.txt` → `6c6e5338`

**Notes**:
- No version bump — these land unreleased on top of the published 0.4.45. Module layout is unchanged (no source files moved/added).
- Files touched: `packages/ts-sdk/src/providers/{errors,indexer,ark}.ts`, `src/wallet/{index,wallet,delegate,vtxo-manager}.ts`, `src/index.ts`, `.env.regtest`; tests; `pnpm-workspace.yaml` / `pnpm-lock.yaml` / `package.json` (dependency bumps).

## 2026-07-12 - Release 0.4.44 + 0.4.45 (publish the three feature landings that were unreleased on 0.4.43)
**From**: `fbad6ca2cd343ac361d2514f601e9e24317275b6`
**To**: `8f45350d3345966cc5fe83e522e6728386bc6792`
**Synced By**: update-project skill
**Status**: Two release-only patch bumps (`@arkade-os/sdk` 0.4.43 → 0.4.44 → 0.4.45, `@arkade-os/boltz-swap` 0.3.48 → 0.3.49 → 0.3.50), each touching only the two `packages/*/package.json` version fields — **no `packages/*/src/` change between `fbad6ca2` and `8f45350d`**. Together they **publish** the three feature landings previously documented (2026-07-11 sync) as unreleased on top of the 0.4.43 cut: (1) pre-signed unilateral exit packages (`UnilateralExit`), (2) offline exit-data capture (`exitDataCapture` + active `virtualTxRepository`), (3) offline-first wallet (typed `ProviderUnavailableError` / cached `StoredArkInfoSnapshot` boot / sync diagnostics). No new source or public-API surface relative to `fbad6ca2`.

**Commits analyzed** (2 non-merge commits):
- `f56ce31b` chore: release @arkade-os/sdk@0.4.44, @arkade-os/boltz-swap@0.3.49 (Pietro Grandi, 2026-07-11)
- `8f45350d` chore: release @arkade-os/sdk@0.4.45, @arkade-os/boltz-swap@0.3.50 (Pietro Grandi, 2026-07-11)

**Docs updated**:
- `docs/INDEX.md` (master) — reworded the three ts-sdk Key Capability bullets from "unreleased on top of 0.4.43" to "released in the 0.4.44/0.4.45 cut"; added a "0.4.44 + 0.4.45 releases" bullet recording the current published version `@arkade-os/sdk@0.4.45` / `@arkade-os/boltz-swap@0.3.50`
- `docs/projects/ts-sdk/INDEX.md` — bumped the workspace package version table (0.4.43 → 0.4.45, 0.3.48 → 0.3.50) and reworked the Quick-Reference Version cell to note the two release bumps published the three feature landings
- `docs/projects/ts-sdk/system/project_overview.md` — bumped the workspace version table + `**Version**` field (0.4.43 → 0.4.45, 0.3.48 → 0.3.50); reworded the three "Unreleased on top of 0.4.43" Core Features rows to "Released in the 0.4.44/0.4.45 cut"
- `change-log/last-sync.txt` → `8f45350d`

**Notes**:
- Architecture, module layout, and public API are byte-identical to the 2026-07-11 (`fbad6ca2`) sync — only the published version numbers changed. `system/architecture.md` needed no update (no source moved/added).

## 2026-07-11 - Unreleased on top of 0.4.43: pre-signed unilateral exit packages, offline exit-data capture, offline-first wallet
**From**: `6f1a8e77afa738db2b5d0bc3ae6943d4403661c3`
**To**: `fbad6ca2cd343ac361d2514f601e9e24317275b6`
**Synced By**: update-project skill
**Status**: Three feature landings on top of the 0.4.43 cut — **no version bump** (`package.json` still `@arkade-os/sdk` 0.4.43 / `@arkade-os/boltz-swap` 0.3.48; these are unreleased changes on `master`). (1) **Pre-signed unilateral exit packages** — a new `src/wallet/exit/` subsystem that pre-signs the entire unroll + sweep of a VTXO into a versioned JSON `ExitPackage` executable keylessly against any Esplora endpoint. (2) **Offline exit-data capture** — a `virtualTxRepository` + `StorageConfig.exitDataCapture` (Lite/Full + provider `sources`) that captures each received VTXO's exit branch locally and resolves exit data local-first, activating the 0.4.43 experimental/inert `VirtualTxRepository`. (3) **Offline-first wallet** — typed `ProviderUnavailableError` retryable-vs-terminal classification, cached-server-info boot when the operator is unreachable, `ContractManager` degrade-to-repository, and `ServerInfoSource` / `ContractSyncState` / `ProviderConnectionState` diagnostics surfaced across the service-worker + Expo boundaries. All additive — default wallet behaviour (no `exitDataCapture` / no unreachable provider) is unchanged.

**Commits analyzed** (38 non-merge commits, `aeb5fa1c` → `fbad6ca2`):
- **Unilateral exit packages**: exit package types + versioned JSON codec (`aeb5fa1c`), shared `finalizeVirtualTx` (`e62df4f5`), pure `buildAnchorChild` / `bumpP2A` w/ dust guard (`46e8e181`), pre-signable CSV sweep builder (`02633d9b`), handler-driven exit path resolution + `completeUnroll` migration (`db96d78f`), exit DAG assembly + `estimate()` quote (`009e3f34`), `prepare()` pre-signed exit packages via splitter broadcast (`0bfe512e`), keyless idempotent executor (`639525bf`), export `UnilateralExit` namespace + docs (`2c2f7f0c`), executor sweep retry for non-BIP68-final rejections (`01c4bbde`), explicit-outpoint exits incl. VHTLC condition witness (`21c2dc6f`), estimate() counts deposit UTXO as splitter input (`36f4a6a7`), graph-mode packages / deferred funding / ephemeral fee wallet (`cc61d33c`), physical-input ordering for deep offchain chains (`6371361a`), sweep-to-`sweepAddress` doc clarification (`c71023e9`), paginate exit indexer fetches + BTC-only doc (`1bc4c830`), harden exit deserialization + splitter fee guard (`fd6a9633`), CI-flake test scoping (`453df5f7`, `fc99aaab`)
- **Exit-data capture**: ordered exit-data resolver seam (`f9741882`), indexer-backed source (`7408e48d`), repository-backed source (`046f124c`), resolve via resolver seam (`53c912f9`), capture-on-receive + prune-on-spend helpers (`b35bea7b`), capture branches on receive + prune on spend (`2cabf70b`), e2e for capture/offline-exit/prune (`1922b513`), configurable capture + provider source slot (`9605e18a`), default capture to Lite / Full opt-in (`3771ff51`), document offline exit-data availability (`28e8b5c2`)
- **Offline-first wallet**: cached server-info fallback for offline boot (`a447dfcb`), offline-first wallet — typed provider errors, best-effort sync, diagnostics (`53ec42a2`), surface sync/connection state across the service-worker boundary (`53d91b27`), expose provider-connection state from ExpoWallet foreground (`36899749`), close degraded-state gaps in offline diagnostics (`98d64b15`), don't misclassify structured 5xx as provider-unavailable (`7a7913b9`), poll post-migration deprecated-signer status (`5bb18bd5`), drop unused `kind` field from `ProviderUnavailableError` (`da20b732`), e2e for offline wallet create + cached reads (`010d6fb2`)

**Notable source changes**:
- **`src/wallet/exit/`** (new subsystem): `types.ts` (`ExitPackage` v1, `ExitStep` union `Broadcast`/`Package`/`Bump`/`Sweep`, `ExitMode` `funded`/`graph`, `ExitQuote`/`ExitTotals`/`ExitVtxoInfo`, `serialize`/`deserializeExitPackage`), `estimate.ts`, `prepare.ts`, `executor.ts` (idempotent async-iterable `Executor` + `ExecutorEvent` + `ExitFeeWallet`), `path.ts` (`resolveUnilateralPath` / `ExitPathError`), `chain.ts`, `sweep.ts`, `finalizeVirtualTx.ts`, `capture.ts` (`captureExitBranch`, `ExitCaptureMode`, `DEFAULT_MIN_EXIT_WORTH_SATS = 1000`), `resolver.ts` (`createExitChainResolver` / `ExitChainResolver` / `ExitDataSource`), `indexerSource.ts`, `repositorySource.ts`, `index.ts` (`UnilateralExit` namespace). BTC-value only; contract-aware; sweeps embed the condition witness.
- **`src/providers/errors.ts`**: `ProviderUnavailableError` (`retryable = true`, cause preserved), `ProviderKind = "arkade" | "indexer"` (not a structured field — postMessage), `throwIfHttpUnavailable` (429/5xx → typed, but a structured-arkd-error body stays terminal), `toProviderUnavailable`.
- **`src/providers/availability.ts`** (new): `isRetryableProviderError(err)`.
- **`src/wallet/arkInfoSnapshot.ts`** (new): `StoredArkInfoSnapshot` v1 (`ARK_INFO_SNAPSHOT_KEY`, bigints as strings, `serviceStatus` not cached), `serialize`/`deserialize`, `MalformedArkInfoSnapshotError`, `ServerInfoSource = "live" | "cache"`.
- **`src/wallet/wallet.ts`**: cached-snapshot boot (repos init before `getInfo`), `_serverInfoSource` / `_serverInfoLastOnlineAt`, `getProviderConnectionState(): ProviderConnectionState`, non-initializing `getContractSyncState()`.
- **`src/contracts/contractManager.ts`**: degrade-to-repository on retryable failure, `getSyncState(): ContractSyncState`, `ContractManagerConfig.intentRepository?`.
- **Service worker / Expo**: `GET_CONTRACT_SYNC_STATE` message + `GET_STATUS` carrying `ProviderConnectionState` (page-side proxy starts degraded/unknown, only preserves state after a successful probe); `ExpoWallet.getProviderConnectionState()` delegates to the wrapped `Wallet`.
- **`src/index.ts`**: root-exports `UnilateralExit` / `serializeExitPackage` / `deserializeExitPackage` / `createExitChainResolver`, `ProviderUnavailableError` / `isRetryableProviderError`, and the exit + offline-first types.

**Docs updated**:
- `docs/INDEX.md` (master) — three new ts-sdk Key Capability bullets (unilateral exit packages, offline exit-data capture, offline-first wallet) + ~28 new tags + ask_question / debug triggers
- `docs/projects/ts-sdk/INDEX.md` — Quick-Reference Version cell notes HEAD `fbad6ca2` carries three unreleased feature landings on top of 0.4.43; three new Key Concepts entries
- `docs/projects/ts-sdk/system/project_overview.md` — three new Core Features rows
- `docs/projects/ts-sdk/system/architecture.md` — new `wallet/exit/` subtree + `wallet/arkInfoSnapshot.ts`; `providers/errors.ts` + new `providers/availability.ts` annotated; `wallet.ts` / `contractManager.ts` / `unroll.ts` / `index.ts` offline-first + capture annotations
- `change-log/last-sync.txt` → `fbad6ca2`

**Notes**:
- **No version bump** — HEAD is unreleased work on top of the published 0.4.43 cut. When these land in a release, add the version note here.
- The unilateral exit is **BTC value only** (never represents a VTXO's assets); asset-bearing VTXOs must not be passed to `estimate` / `prepare`.
- Exit-data capture flips the `VirtualTxRepository` from the 0.4.43 experimental/inert state into an actively-captured store, but only when `StorageConfig.exitDataCapture` is configured; absent it, behaviour is unchanged.

## 2026-07-09 - Release 0.4.43: opt-in Intent + VirtualTx repository layer, typed FetchError
**From**: `e023e1db2f9dcb42badf9c24923f28b8c17bf761`
**To**: `6f1a8e77afa738db2b5d0bc3ae6943d4403661c3`
**Synced By**: update-project skill
**Status**: Substantial feature landing cut as `@arkade-os/sdk` 0.4.43 / `@arkade-os/boltz-swap` 0.3.48. Adds an **opt-in** Intent + VirtualTx repository layer (event-sourced settlement-intent persistence + crash-recovery reconciliation + intent-locked-balance exclusion), a typed transport-level `FetchError`, the `ChainedTxType` public export, and a best-effort virtual-tx cache for unilateral exit (`VirtualTxRepository`, **experimental/inert**). Off by default: absent the new `StorageConfig.intentRepository?` / `virtualTxRepository?` fields, wallet behaviour is byte-for-byte unchanged. This release also publishes the three previously-unreleased post-0.4.42 changes (cel-js 8 SES bump #602, regtest arkd v0.9.11 pin #604, DIGEST_MISMATCH e2e #605).

**Commits analyzed** (46 non-merge commits, `0e4888fa` → `6f1a8e77`):
- `6f1a8e77` chore: release @arkade-os/sdk@0.4.43, @arkade-os/boltz-swap@0.3.48
- Intent/VirtualTx repository domain types + interfaces (`0e4888fa`) and all four backends: in-memory (`fca16145`, `0693da81`), SQLite (`21cb427f`, `dddcebbc` + `transaction.ts` serialization `9540a551`), IndexedDB (`46ac59c7`, `f8e72bed`, `a0a15e05` — schema v4/v5, `73184652` unique intentId migration), Realm (`4a1b15f3`, `822805d8`, `3b25f93e` — schema v3); cross-backend conformance suites (`9966a381`)
- Wallet intent wiring: `IntentStateReducer` (`b09b30e2`), opt-in intent/virtualtx injection + locked-outpoint balance exclusion (`e8a9c336`), persist intents through `settle()` via event-sourced state (`18a5cf69`), crash-recovery reconciliation, offline balance safety (`09d4f2ef`)
- VirtualTxRepository features: chain→branch/virtualtx mapping + `virtualTxMode` config (`55791243`), repo-first unilateral-exit resolution (`1bed00bd`), automated prune-on-spend during sync (`6ccc5bb8`, `fad8093e`) — then the nark-persistence branch made **inert** (no auto-migration, `44132e30`) and `virtualTxRepository` marked experimental/inert (`c4ea735d`); sqlite/realm repos kept behind subpath exports (`57011e24`)
- `8b879cfa` typed `FetchError` wrapping transport-level fetch failures
- `99ea6856` export `ChainedTxType` from public entrypoints; `412a69ec` rename `VirtualTx.hex` → `psbt` (base64); `5b1b574b` don't downgrade a known VirtualTx type on upsert; `0b12f6e9` fold duplicate txids in IndexedDB `upsertVirtualTxs`
- `e13fbd36` refresh deprecated-signer cache on migration so custom renewal loops survive rotation
- Hardening: intentId uniqueness across backends (`5b249be8`), migration hardening + serialized intent clear (`e54ce02c`), locked-balance accounting + intent/repo write-path hardening (`58a9dd43`), batch_in_progress VTXO-locking divergence pin (`d3a6f164`), unused-intent-index drop + virtualtx N+1 collapse (`3605dadf`), stable intent ordering + public repo exports + drop root `wallet.ts` (`3c3fd620`)
- Doc/comment trims (`03cff961`, `d209c7d2`, `80910d95`, `3c45f07e`)

**Notable source changes**:
- **Intent repository** (`src/repositories/intentRepository.ts`): `IntentRepository` (`version: 1`) keyed by `intentTxId`; `ArkIntent` / `ArkIntentState` (`waiting_to_submit` / `waiting_for_batch` / `batch_in_progress` / `batch_failed` / `batch_succeeded` / `cancelled`) / `IntentFilter`; `INTENT_TERMINAL_STATES` / `isTerminalIntentState` / `ALL_INTENT_STATES`; backend-agnostic `assertIntentIdUnique` / `intentMatchesFilter` / `intentPageBounds`. `getLockedVtxoOutpoints()` returns non-terminal-intent outpoints (deliberate divergence from NArk — TS wallet is offline-first single-source-of-coin-locking, so it also holds `batch_in_progress`).
- **VirtualTx repository** (`src/repositories/virtualTxRepository.ts`): `VirtualTxRepository` (`version: 1`) with `VirtualTx` (`psbt: base64 | null`), `VtxoBranch`, `ChainedTxType` enum + `mergeChainedTxType`. `pruneForSpentVtxo` drops branch rows then deletes orphaned virtual-tx rows.
- **Event-sourced persistence**: `intentStateReducer.ts` (pure/monotonic — only the three batch-boundary events move state, terminal sticky), `intentPersistenceHandler.ts` (`wrapHandlerWithIntentPersistence` — terminal write from the awaited batch hooks, ordered before `Batch.join` returns), `intentReconciliation.ts` (`reconcileIntents` — conservative crash-recovery on the online sync path; freshness guard avoids overwriting a concurrent `settle()`). `Wallet.settle` writes `waiting_to_submit` → `waiting_for_batch` → terminal snapshots; a post-commit failure re-persists `batch_succeeded` (never deletes a committed intent), a pre-commit failure records `cancelled`.
- **Balance**: `WalletBalance.available` redefined as `settled + preconfirmed` over VTXOs not locked by a non-terminal intent; new `excludeLockedOutpoints` / `spendableVtxosExcludingLocked` (offline-first, fails open on store read error). `settled`/`preconfirmed`/`total` still count locked VTXOs.
- **FetchError** (`src/utils/fetch.ts`): `baseFetch` wraps transport-level rejections in `FetchError` (`{ url?, method? }`, `Error.cause` preserved); input widened to `RequestInfo | URL`; re-exported from the package root.
- **IndexedDB schema**: shared wallet DB pinned at `DB_VERSION = 3`; intent/virtualtx stores at `INTENT_DB_VERSION = 5` (v5 makes `intentId` unique) on a dedicated DB name reachable only via the opt-in repos — upgrading the SDK never migrates an existing user's DB. Realm schema v3; SQLite `transaction.ts` serializes writes per shared connection.

**Docs updated**:
- `docs/INDEX.md` (master) — six new ts-sdk capability entries (intent+virtualtx repo layer, event-sourced persistence + crash-recovery, intent-locked balance, repo-first unilateral exit, FetchError, 0.4.43 release) + ~23 new tags
- `docs/projects/ts-sdk/INDEX.md` — version table + Quick-Reference Version cell bumped to 0.4.43 / 0.3.48 with the 0.4.43 publish note; seven new Key Concepts entries
- `docs/projects/ts-sdk/system/architecture.md` — repository module tree extended with intent/virtualtx modules across all backends; wallet section gains `intentStateReducer` / `intentPersistenceHandler` / `intentReconciliation`; `fetch.ts` (FetchError) and `unroll.ts` (repo-first) annotated
- `docs/projects/ts-sdk/system/project_overview.md` — version bumped to 0.4.43 / 0.3.48; two new Core Features rows (Intent + VirtualTx repositories, Typed transport FetchError)
- `change-log/last-sync.txt` → `6f1a8e77`

**Notes**:
- The whole intent/virtualtx layer is **opt-in**. The `virtualTxRepository` is **experimental/inert** this release — only `Unroll.Session.create(..., virtualTxRepository?)` reads/writes it as a best-effort raw-tx cache; `ContractManager` is never given it and normal sync never populates/prunes it. The `virtualTxMode` config added mid-range (`55791243`) was made inert before the release cut and is not part of the public surface.
- No public-API break: default wallet behaviour (no repos configured) is byte-for-byte unchanged; all new surface is additive.

## 2026-07-08 - Post-0.4.42 unreleased: cel-js 8 Snap/SES bump, regtest arkd v0.9.11 pin, DIGEST_MISMATCH e2e
**From**: `848be6a0edd3c427f804bda3e073e920c463101f`
**To**: `e023e1db2f9dcb42badf9c24923f28b8c17bf761`
**Synced By**: update-project skill
**Status**: Three small post-release commits, **no version bump** (`@arkade-os/sdk` stays `0.4.42`, `@arkade-os/boltz-swap` stays `0.3.47`). One dependency bump (`@marcbachmann/cel-js` → 8.0.0 for MetaMask Snap / SES compatibility), one regtest-fixture pin (arkd image → v0.9.11), and one e2e test addition (DIGEST_MISMATCH signer-rotation round-trip). No SDK `src/` behaviour or public API change.

**Commits analyzed** (3 non-merge commits):
- `e023e1db` test(e2e): verify X-Digest/DIGEST_MISMATCH round-trip across a real signer rotation (#605)
- `618f055a` chore(regtest): pin submodule to arkade-regtest master (arkd v0.9.11) (#604)
- `6f98fe02` fix(sdk): bump @marcbachmann/cel-js to 8.0.0 for MetaMask Snap (SES) compatibility (#602)

**Files changed in repo**:
- `packages/ts-sdk/package.json` — `@marcbachmann/cel-js` `7.x` → `8.0.0`
- `pnpm-lock.yaml` — cel-js 8.0.0 resolution
- `packages/ts-sdk/test/fee.test.ts` — guard test asserting the resolved cel-js ships no bare `eval(` token
- `packages/ts-sdk/.env.regtest` — `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` `v0.9.9-rc.0` → `v0.9.11`
- `regtest` (submodule) — fast-forwarded to arkade-regtest `master` (arkd v0.9.11)
- `packages/ts-sdk/test/e2e/digestMismatch.test.ts` — new e2e (228 lines) exercising the digest-guard against a live server-signer rotation

**Notable source changes**:
- **cel-js 8.0.0 (`6f98fe02`, #602, closes #580)**: cel-js `< 8` shipped an interpreter method literally named `eval`, which the `arkfee` `Estimator` pulls into every consumer bundle; SES (run by `mm-snap build`) rejects any bare `eval(` token, so the SDK could not bundle inside a MetaMask Snap even after `Estimator.eval()` → `.evaluate()` (#581). 8.0.0 is the lowest cel-js release that renames its own method (7.6.1 still ships the bare token); the API surface the `Estimator` uses is unchanged so `estimator.ts` needs no edits, and 8.0.0's `node >=20.19.0` engine is already satisfied. A regression-guard test locks in the no-bare-`eval(` invariant.
- **regtest arkd v0.9.11 (`618f055a`, #604)**: submodule fast-forward + `.env.regtest` image pins; regtest/CI fixtures only, no SDK code.
- **DIGEST_MISMATCH e2e (`e023e1db`, #605)**: end-to-end coverage that the `X-Digest` / `DigestMismatchError` guard fires on a real arkd signer rotation and re-derives via `onServerInfoChanged` rather than silently retrying — strengthens the 0.4.35 (#554) server-signer-rotation feature. Test-only.

**Docs updated**:
- `docs/INDEX.md` — added three post-0.4.42 changelog bullets (cel-js 8 bump, arkd v0.9.11 pin, DIGEST_MISMATCH e2e) + new tags
- `docs/projects/ts-sdk/INDEX.md` — three capability entries appended, Version-table cell notes the unreleased post-`848be6a0` work
- `docs/projects/ts-sdk/system/project_overview.md` — cel-js dependency annotated `8.0.0` + SES rationale; arkade-regtest arkd version updated to the v0.9.11 `.env.regtest` pin

## 2026-07-07 - Release 0.4.42: stale-subscription error-format fix + boltz-swap invoice timestamp
**From**: `07991c26736ff27b070a7a22547301403d51ffa3`
**To**: `848be6a0edd3c427f804bda3e073e920c463101f`
**Synced By**: update-project skill
**Status**: Small patch release. `@arkade-os/sdk` 0.4.41 → **0.4.42**, `@arkade-os/boltz-swap` 0.3.46 → **0.3.47**. One ts-sdk correctness fix (`ContractWatcher` stale-subscription detection) and one sibling boltz-swap additive feature (invoice creation `timestamp` on decoded invoices). No architectural change, no breaking change.

**Commits analyzed** (4 non-merge commits + release):
- `848be6a0` chore: release @arkade-os/sdk@0.4.42, @arkade-os/boltz-swap@0.3.47
- `e0fac078` fix(sdk): match new arkd stale-subscription error format
- `ebc3c1d0` docs(boltz-swap): clarify timestamp's 0 fallback is unreachable per BOLT11
- `e9fd36ad` feat(boltz-swap): surface invoice creation timestamp on decoded invoices
- `a104fb33` docs(boltz-swap): fix expiry docstring, describe it as relative delta, not a Unix timestamp

**Files changed in repo**:
- `packages/ts-sdk/src/contracts/contractWatcher.ts` — stale-subscription regex broadened `/subscription\s+\S+\s+not\s+found/i` → `/subscription\b.*\bnot\s+found/i` to match both `"subscription <uuid> not found"` and `"subscription not found: <uuid>"`
- `packages/ts-sdk/test/contracts/watcher.test.ts` — reworked to cover both stale-error phrasings
- `packages/boltz-swap/src/utils/decoding.ts` — `decodeInvoice` surfaces the BOLT11 `timestamp` section on `DecodedInvoice.timestamp` (`0` fallback documented as unreachable for a valid invoice)
- `packages/boltz-swap/src/types.ts` — `DecodedInvoice` + `CreateLightningInvoiceResponse` gain `timestamp`; `expiry` docstring corrected to "seconds from creation until expiry" (relative delta, not a Unix timestamp)
- `packages/boltz-swap/src/arkade-swaps.ts` — forwards `decodedInvoice.timestamp` onto the `CreateLightningInvoiceResponse`
- `packages/boltz-swap/test/decoding.test.ts` — asserts the decoded `timestamp`
- `packages/ts-sdk/package.json`, `packages/boltz-swap/package.json` — version bumps

**Notable source changes**:
- **ts-sdk (`e0fac078`)**: arkd changed its stale-subscription error wording. `ContractWatcher` clears a stale subscription ID and re-subscribes only when it classifies the error as stale; the old anchored regex missed the new `"subscription not found: <uuid>"` phrasing, so the watcher rethrew instead of transparently re-subscribing. The looser `/subscription\b.*\bnot\s+found/i` matches both phrasings while still rethrowing unrelated errors. Correctness-only, no public API change.
- **boltz-swap (`e9fd36ad` / `a104fb33` / `ebc3c1d0`)**: `expiry` on decoded invoices is a **relative** delta (seconds from creation until the invoice expires), not an absolute Unix timestamp — the old docstring was wrong. The new `timestamp` field (BOLT11 creation time, Unix seconds) is surfaced so callers can compute the absolute expiry as `timestamp + expiry`. Additive; per BOLT11 a valid invoice always carries a timestamp, so the type-checker `0` fallback is documented as unreachable in practice.

**Docs updated**:
- `docs/INDEX.md` — added 0.4.42 changelog bullets (stale-subscription fix, invoice-timestamp feature, release entry) + new tags
- `docs/projects/ts-sdk/INDEX.md` — version table 0.4.41/0.3.46 → 0.4.42/0.3.47, Version field rewritten, two capability entries added
- `docs/projects/ts-sdk/system/project_overview.md` — version references bumped to 0.4.42 / 0.3.47

## 2026-07-03 - Sibling boltz-swap: exact claim-fee sizing for chain-swap arkToBtc (#595)
**From**: `8741a646cac68d3c2012ca6ff56a74f3085a7a9c`
**To**: `07991c26736ff27b070a7a22547301403d51ffa3`
**Synced By**: update-project skill
**Status**: Single-commit sync, **all in the sibling `packages/boltz-swap/` package** — no `packages/ts-sdk/src/` change, **no version bump** (`@arkade-os/sdk` stays `0.4.41`, `@arkade-os/boltz-swap` stays `0.3.46`; both **post-0.4.41 unreleased**). `07991c26` (PR #595) fixes chain-swap claim-fee sizing so `arkToBtc` delivers the exact amount. Substantive change belongs to `docs/projects/boltz-swap/`; recorded here for release/sync context.

**Commits analyzed** (1 non-merge commit):
- `07991c26` fix(boltz-swap): size claim fee from exact vsize (#595)

**Files changed in repo** (sibling boltz-swap package only):
- `packages/boltz-swap/src/utils/boltz-swap-tx.ts` — `targetFee` drops the `+ tx.inputsLength` pad; sizes the claim-tx fee from the exact `@scure/btc-signer` vsize (`ceil(probe.vsize * satPerVbyte)`)
- `packages/boltz-swap/src/arkade-swaps.ts` — docstring on `claimBtc` documenting the claim output as `swapOutput.amount − max(feeToDeliverExactAmount, targetFee)`
- `packages/boltz-swap/test/boltz-swap-tx.test.ts` — **new** unit test locking the exact `ceil(vsize * rate)` sizing (1-in/1-out P2TR key-path claim vsize 111; no `+1` per-input pad)
- `packages/boltz-swap/test/e2e/arkade-swaps.test.ts` — "exact amount to btc address" assertion rebounded to the Boltz reservation (`>= amountSats - 99`, was `> amountSats - 200`)

**Notable source change**:
- The prior `targetFee` returned `constructTx(ceil((tx.vsize + tx.inputsLength) * satPerVbyte))`, overpaying ~1 sat/input over the accurate `@scure` vsize. `claimBtc` subtracts the claim fee from the recipient (`max(feeToDeliverExactAmount, targetFee)`), so the pad made `arkToBtc` **under-deliver by ~1 sat/input**. Dropping the pad matches Boltz's grossed-up `minerFees.user.claim` and delivers the exact amount — where Boltz's reservation covers the real claim fee (mainnet/mutinynet). On regtest the Boltz image reserves a sub-min-relay ~23-sat fee, below the 99-sat min-relay floor of the 1-in P2TR / 1-out P2WPKH claim, so the receiver is short by the residual and the e2e assertion is bounded rather than exact (the exact sizing is locked by the new unit test).

**Documentation changes**:
- `INDEX.md` (project): new Key Concept entry ("Sibling boltz-swap — exact claim-fee sizing"); Version row's post-0.4.41 marker flipped from "none" to record this unreleased boltz-swap fix
- Master `docs/INDEX.md`: new ts-sdk Key Capabilities bullet + `exact-claim-fee` / `target-fee-vsize` tags
- `change-log/last-sync.txt`: `8741a646 → 07991c26`

**Tests added**: `packages/boltz-swap/test/boltz-swap-tx.test.ts` (new, 53 lines) + the e2e assertion rebound (both in the sibling package, covered under `docs/projects/boltz-swap/`)

**Notes**:
- No version bump — published `@arkade-os/sdk` remains `0.4.41`, `@arkade-os/boltz-swap` remains `0.3.46`
- This fix follows up the post-0.4.33 "exact amount to btc address" fee-aware assertion rework (recorded in the ts-sdk INDEX Esplora mempool-compat entry); the earlier change made the assertion fee-aware, this one corrects the actual claim-fee sizing

## 2026-07-02 - 0.4.41 release: wallet activity-history API + getNetwork fail-closed + chain-swap BTC HTLC verification
**From**: `eb618f1ddf9ba6159a48d5eb6473c5788cdb7592`
**To**: `8741a646cac68d3c2012ca6ff56a74f3085a7a9c`
**Synced By**: update-project skill
**Status**: 16-commit sync, cut as **`@arkade-os/sdk@0.4.41` + `@arkade-os/boltz-swap@0.3.46`** (`8741a646`). This release publishes everything accumulated since 0.4.40, including the previously-unreleased `clear()` wipe / IndexedDB `onversionchange` / unsignable-boarding fast-fail from the prior sync. Three new substantive threads this range: a new **wallet activity-history API** (`getActivityHistory()` + a pluggable `ActivityRegistry` / resolver engine), `getNetwork()` now **fails closed** on unknown networks (was silently falling through to mainnet params) and is re-exported from the package root, and the sibling boltz-swap package gained **chain-swap BTC HTLC verification** before funds are committed. No breaking public-API changes (activity surface is additive; delegate-info init tolerance is a behaviour relaxation).

**Commits analyzed** (16 non-merge commits):
- `0b5252f2` feat(wallet): activity types + pure buildActivities grouping engine
- `89f1a310` feat(wallet): ActivityRegistry + getActivityHistory() across wallet implementations
- `682af93e` feat(wallet): boarding built-in resolver + default registry (pre-registered on all wallets)
- `dbdc3293` docs(wallet): export the activity history API + README example
- `6c91cfcd` fix(boltz-swap): implement activity members on the background IWallet shim
- `aea4289e` test(wallet): stub fetch in getActivityHistory test (was hitting live :7070 in CI)
- `9db3f81c` fix(wallet): isolate resolver prepare() failures in buildActivities
- `83346115` refactor(wallet): name ActivityIntent + document resolver id/groupId/metadata conventions
- `fa0a5b0e` fix activity history accounting
- `ed3ca80c` fix activity grouping edge cases
- `3f2009da` refactor(wallet): tidy activity helpers
- `61dd60bc` docs: clarify activity history
- `86bc9774` fix activity grouping: drop malformed resolver memberships
- `7dd8bd5e` feat(boltz-swap): verify BTC HTLC in chain swaps (#591)
- `1a5da0e8` fix: don't fail on delegate errors
- `8741a646` chore: release @arkade-os/sdk@0.4.41, @arkade-os/boltz-swap@0.3.46

**Documentation Changes**:
- Bumped versions 0.4.40 → 0.4.41 (`@arkade-os/sdk`) and 0.3.45 → 0.3.46 (`@arkade-os/boltz-swap`) in `INDEX.md` (workspace table + Quick Reference version row) and master `docs/INDEX.md` (0.4.41 release entry)
- `INDEX.md` Key Concepts: added **Activity History API**, **`getNetwork()` fails closed + root export**, **Delegate-info init no longer fatal**, and **Chain-swap BTC HTLC verification** (sibling boltz-swap 0.3.46); flipped the `clear()` / `onversionchange` / unsignable-boarding markers from *post-0.4.40 unreleased* → *0.4.41*
- `system/project_overview.md` Core Features: added **Activity History**, **`getNetwork()` Fail-Closed**, and **Delegate-Info Init Non-Fatal** rows; flipped the `clear()` and unsignable-boarding rows to 0.4.41
- Master `docs/INDEX.md`: added the four new capability bullets + a **0.4.41 release** bullet, flipped the three unreleased markers + AGENTS.md guidance to 0.4.41, and added activity/getNetwork/chain-swap-verify tags

**Notable Source Changes**:
- New module `packages/ts-sdk/src/wallet/activity.ts` (232 lines): `buildActivities` grouping engine + `ActivityRegistry` + `boardingResolver` + `createDefaultActivityRegistry` + `Activity` / `ActivityIntent` / `GroupMembership` / `ActivityResolver` types. Wired into `IReadonlyWallet` (`readonly activity` + `getActivityHistory()`), `ReadonlyWallet`/`Wallet` (`wallet.ts`), `ServiceWorkerReadonlyWallet` (`serviceWorker/wallet.ts`), and `ExpoWallet` (`expo/wallet.ts`); exported from `src/index.ts` + `src/wallet/index.ts`; README "Activity history" section added
- `src/networks.ts`: `getNetwork` throws `Unsupported network` on an unknown key (fail-closed); `getNetwork` re-exported from `src/index.ts`
- `src/wallet/wallet.ts`: `ReadonlyWallet` init `.catch(() => undefined)` on delegate/delegator `getDelegateInfo()`
- boltz-swap: `arkade-swaps.ts` new `verifyBtcChainHtlc`, `utils/boltz-swap-tx.ts` new `assertChainHtlcLeaves` + exported `p2trScript`/`toXOnly` (removed `REGTEST_NETWORK`/`MUTINYNET_NETWORK` constants), `expo/background.ts` shim gains `activity`/`getActivityHistory` stubs + `getNetwork`-based HRP, `utils/scripts.ts` `getNetwork`-based HRP

**Tests Added**: `packages/ts-sdk/test/wallet/activity.test.ts` (247 lines, buildActivities grouping/accounting/isolation); boltz-swap `test/arkade-swaps.test.ts` extended (+208 lines) for chain-HTLC verification

**Notes**:
- Sibling boltz-swap 0.3.46 chain-swap HTLC verification is summarized here for the release context; the substantive change belongs to `docs/projects/boltz-swap/`
- The prior sync (2026-07-01) documented `clear()` / `onversionchange` / unsignable-boarding as *post-0.4.40 unreleased*; those commits precede this range but are now shipped by the 0.4.41 cut, so their release markers were updated

## 2026-07-01 - wallet clear() local-data wipe + IndexedDB deletion unblock + unsignable-boarding fast-fail
**From**: `d98f44c51c9f4df48f88378c25cd249e94f45921`
**To**: `eb618f1ddf9ba6159a48d5eb6473c5788cdb7592`
**Synced By**: update-project skill
**Status**: 12-commit sync, all **post-0.4.40 unreleased** (no version bump — `packages/ts-sdk` stays `0.4.40`, `packages/boltz-swap` stays `0.3.45`). Three substantive threads: a new public `IWallet`/`IReadonlyWallet.clear()` local-data-wipe API (consolidating the old page-side/service-worker split), an IndexedDB `onversionchange` change that unblocks external `deleteDatabase()`, and a settle-time fast-fail on unsignable boarding inputs. Plus repo-level AGENTS.md contributor guidance. No breaking public-API changes (`clear()` is additive on the interfaces).

**Commits analyzed** (12 non-merge commits):
- `e88ea0a9` feat(wallet): add clearLocalData() to reset a wallet's stored data
- `bd9e9005` add test
- `b8357c20` feat(wallet): unblock IndexedDb deletion (`db.onversionchange`)
- `aabc916f` fix: throw error if clearLocalData fails
- `8703a3dc` refactor(wallet): fold clearLocalData into clear()
- `29ec250d` fix(worker): clear both repositories in the worker, not page-side
- `57155984` fix(worker): reset wallet handler state only after a successful clear
- `ea265d0e` fix(expo): drain in-flight poll before wiping in ExpoWallet.clear()
- `7126e75e` fix(wallet): fail fast on unsignable boarding input during settle
- `326dc753` chore: trim verbose comments and docs in unsignable boarding input change
- `6199f94d` chore: update comment
- `aae42c88` Instruct agents to re-use functionalities from ts-sdk (#592)

**Files changed in repo**:
- `packages/ts-sdk/src/wallet/index.ts` — `IReadonlyWallet` gains `clear(): Promise<void>`
- `packages/ts-sdk/src/wallet/wallet.ts` — `ReadonlyWallet.clear()` (dispose-then-`Promise.all` wipe in a `finally`); `Wallet.settle` boarding-input `tapScriptSig` assertion + new private `unsignableBoardingInputError(input, script)`
- `packages/ts-sdk/src/wallet/expo/wallet.ts` — `ExpoWallet.clear()` with `cleared` guard + serialized `foregroundPollChain` drain + `removeContractPollTasks()`
- `packages/ts-sdk/src/wallet/serviceWorker/wallet.ts` — `ServiceWorkerReadonlyWallet.clear()` now only posts `CLEAR` (dropped page-side `deleteVtxos` parity)
- `packages/ts-sdk/src/wallet/serviceWorker/wallet-message-handler.ts` — `CLEAR` handler tears down subscriptions then delegates to `(wallet ?? readonlyWallet).clear()`, resets handler state only on success
- `packages/ts-sdk/src/repositories/indexedDB/manager.ts` — `openDatabase` sets `db.onversionchange` (close + evict from `dbCache`/`refCounts`)
- `packages/boltz-swap/src/expo/background.ts` — one-line change riding along
- `AGENTS.md` — new "Core Package, Plugins & Code Reuse" section (#592)
- `packages/ts-sdk/test/{db,wallet}.test.ts`, `test/wallet/unsignableBoardingInput.test.ts` — coverage for all three threads
- `regtest` submodule pointer bump

**Documentation changes**:
- `docs/projects/ts-sdk/INDEX.md`: Version row extended with the three post-0.4.40 unreleased commit ranges; three new Key Concepts entries (wallet `clear()`, IndexedDB `onversionchange` unblock, unsignable-boarding fast-fail)
- `docs/projects/ts-sdk/system/project_overview.md`: two new Core Feature rows (Local Data Wipe `clear()`; Unsignable Boarding Input Fast-Fail)
- `docs/projects/ts-sdk/system/architecture.md`: `wallet.ts`, `expo/wallet.ts`, `serviceWorker/wallet.ts`, `wallet-message-handler.ts`, and `walletRepository.ts`/IndexedDB module annotations extended
- Master `docs/INDEX.md`: four new Key Capabilities entries (clear(), IndexedDB unblock, boarding fast-fail, AGENTS.md guidance) + new tags
- `change-log/last-sync.txt` → `eb618f1ddf9ba6159a48d5eb6473c5788cdb7592`

**Notes**:
- All 12 commits are unreleased — published `@arkade-os/sdk` remains `0.4.40`, `@arkade-os/boltz-swap` remains `0.3.45`
- The `clearLocalData()` name appears in early commits but was folded into `clear()` before the range ends; docs describe only the final `clear()` surface
- The AGENTS.md change is contributor guidance (core/plugin reuse direction), not an SDK behaviour change

## 2026-06-30 - 0.4.40 / boltz-swap 0.3.45 release (publishes #571 / #576 / #578 / #581 / #587)
**From**: `506b649e40ad63e3f00e57b74b7cc15d61b84081`
**To**: `d98f44c51c9f4df48f88378c25cd249e94f45921`
**Synced By**: update-project skill
**Status**: One-commit sync — a **release-only version bump** (`@arkade-os/sdk` 0.4.39 → 0.4.40, `@arkade-os/boltz-swap` 0.3.44 → 0.3.45). No `src/` changes in the release commit; it publishes the five changes that the previous two syncs documented as "post-0.4.39 unreleased". No new code behaviour.

**Commits analyzed** (1 non-merge commit):
- `d98f44c5` chore: release @arkade-os/sdk@0.4.40, @arkade-os/boltz-swap@0.3.45

**Files changed in repo**:
- `packages/ts-sdk/package.json` — `version` 0.4.39 → 0.4.40
- `packages/boltz-swap/package.json` — `version` 0.3.44 → 0.3.45

**Documentation changes**:
- `docs/projects/ts-sdk/INDEX.md`: package-version table → 0.4.40 / 0.3.45; Quick-Reference Version row → 0.4.40 (now "release-only bump; ships the previously unreleased #571 / #576 / #581 / #578 / #587"); the five `post-0.4.39` Key Concept labels relabeled to `0.4.40`
- `docs/projects/ts-sdk/system/project_overview.md`: workspace-package version table → 0.4.40 / 0.3.45; **Version** field → 0.4.40; `Post-0.4.39 (#587)` labels → `0.4.40 (#587)`
- `docs/projects/ts-sdk/system/architecture.md`: `Post-0.4.39 (#…)` module annotations (#571 / #578 / #581 / #587) relabeled to `0.4.40 (#…)`
- Master `docs/INDEX.md`: the five `post-0.4.39 unreleased` ts-sdk release-log labels → `released in 0.4.40`; new **0.4.40 release** entry appended
- `change-log/last-sync.txt` → `d98f44c51c9f4df48f88378c25cd249e94f45921`

**Notes**:
- The wallet/banco/other consumers' pinned `@arkade-os/sdk` dependency versions in `docs/INDEX.md` were intentionally left unchanged — those record each consumer's own pin, not the ts-sdk repo's published version
- Historical SYNC_HISTORY entries below still say "post-0.4.39 unreleased"; that was accurate at the time of those syncs and is preserved as-is

## 2026-06-27 - BIP-322 intent-proof message field + boarding-sweep phantom-receive fix
**From**: `c9a7e7537ed15b3389729f4ec5c7c96613e04a69`
**To**: `506b649e40ad63e3f00e57b74b7cc15d61b84081`
**Synced By**: update-project skill
**Status**: Two-commit sync, both **post-0.4.39 unreleased** (no version bump — `packages/ts-sdk` stays `0.4.39`). One additive feature on the intent-proof PSBT (sets the BIP-322 `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` global field) and one transaction-history bug fix (phantom-receive double-count when Esplora `/outspends` omits the spender txid). No public-API breaks.

**Commits analyzed** (2 non-merge commits):
- `506b649e` feat(intent): set BIP-322 PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE (0x09) (#578)
- `839a43dd` fix(wallet): phantom receive inflation from boarding sweeps (Esplora outspends without txid) (#587)

**Files changed in repo**:
- `packages/ts-sdk/src/intent/index.ts` — `craftToSignTx` gains a `message` param and writes it to the `tx.global.unknown` entry `{ type: 0x09 }` (BIP-322 v2 generic signed message); JSDoc added
- `packages/ts-sdk/src/providers/onchain.ts` — `getTxOutspends` return type `txid` made optional; `ExplorerTransaction` gains optional `vin?: { txid; vout }[]`; `isExplorerTransaction` validates `vin` only when present
- `packages/ts-sdk/src/wallet/wallet.ts` — boarding scan builds a `commitmentByOutpoint` map from address-history `vin` and falls back to it for the spender/commitment txid (`||` over the electrum `txid: ""` sentinel)
- `packages/ts-sdk/test/intent.test.ts`, `test/transactionHistory.test.ts`, `test/walletBoardingTxs.test.ts` — coverage for both changes

**Documentation changes**:
- `docs/projects/ts-sdk/INDEX.md`: Version row extended with `#578` / `#587`; two new Key Concepts entries (BIP-322 intent-proof global field; phantom-receive boarding-sweep fix)
- `docs/projects/ts-sdk/system/project_overview.md`: Transaction History core-feature row + Esplora integration point extended with the `getTxOutspends` `txid?` / `ExplorerTransaction.vin?` / `commitmentByOutpoint` fix
- `docs/projects/ts-sdk/system/architecture.md`: `intent/index.ts` and `providers/onchain.ts` (EsploraProvider) module annotations extended
- Master `docs/INDEX.md`: two Key Capabilities entries, new Tags, new debug/triggers
- `change-log/last-sync.txt` → `506b649e40ad63e3f00e57b74b7cc15d61b84081`

**Notes**:
- Both commits are unreleased — the published `@arkade-os/sdk` remains `0.4.39` and the sibling `@arkade-os/boltz-swap` remains `0.3.44`
- `#578` is purely additive on the PSBT wire (an unknown global field that round-trips); `#587` is a correctness fix for transaction-history accuracy against non-electrs Esplora backends

## 2026-06-26 - arkfee eval→evaluate (BREAKING) + SW init guard + boltz-swap descriptionHash
**From**: `cb77d23fbea8a067b11643fa73929b1bc16e58ec`
**To**: `c9a7e7537ed15b3389729f4ec5c7c96613e04a69`
**Synced By**: update-project skill
**Status**: Three-commit sync, all **post-0.4.39 unreleased** (no version bump — `packages/ts-sdk` stays `0.4.39`, `packages/boltz-swap` stays `0.3.44`). One **breaking** public-API change (`Estimator.eval()` → `Estimator.evaluate()`), one service-worker robustness fix introducing a new public error export, and one feature in the vendored sibling boltz-swap package.

**Commits analyzed** (3 non-merge commits):
- `0b00d834` fix(arkfee)!: rename Estimator.eval() to evaluate() for SES/Snap compatibility (#581) — **BREAKING**
- `e96dbe63` feat(boltz-swap): support descriptionHash on reverse swaps (#576)
- `c9a7e753` fix(worker): guard service-worker init against stale identity binding (#571) — also fixes Electrum `get_merkle` error classification

**Notable source changes**:
- **`packages/ts-sdk/src/arkfee/estimator.ts`** (#581, BREAKING): aggregate method `eval(...)` → `evaluate(...)`. SES's static "direct eval" detector rejects any bare `eval(` token, so the old name broke the whole SDK bundle inside a MetaMask Snap (arkade-os/ts-sdk#580). Per-input helpers (`evalOffchainInput` etc.) untouched — only the exact `eval` identifier is flagged.
- **`packages/ts-sdk/src/worker/errors.ts` + `messageBus.ts` + `wallet/serviceWorker/wallet.ts` + `index.ts`** (#571): new `MessageBusInitializingError` / `MESSAGE_BUS_INITIALIZING` (superset of `MESSAGE_BUS_NOT_INITIALIZED`; both re-exported from the package root). `create()` / `reinitialize()` now assert the worker's reported x-only pubkey via `assertWorkerIdentityMatches()` (`GET_STATUS`) before returning. `INITIALIZE_MESSAGE_BUS` serialized on a FIFO chain; ordinary messages rejected during a pending init; callers wait on bounded backoff (~100ms→2s, `MAX_INIT_WAITS = 8`) instead of forcing a re-init; `sendMessageWithEvents` folded into `sendMessageWithRetry(request, withEvents?)`; `doInit()` cancels pending tick / skips `runTick()` during re-init.
- **`packages/ts-sdk/src/providers/electrum.ts`** (#571): new `normalizedErrorText(err)` lowercases + strips all whitespace before matching — `ws-electrumx-client` drops spaces inside server error messages, so the `get_merkle` classifiers (`isMissingHeightError` / `isTxNotInBlockError`) missed the mangled wording and `getTxStatus` threw on the index-lag race; needles now whitespace-free.
- **`packages/boltz-swap/src/{types,arkade-swaps,utils/decoding}.ts`** (#576): optional `descriptionHash` on `createLightningInvoice` / `createReverseSwap` (`CreateLightningInvoiceRequest.descriptionHash?: string`) to commit `SHA256(...)` into the reverse-swap BOLT11 invoice (NIP-57 zaps); BOLT11 carries description OR hash, never both, so the plaintext is dropped when set; gated on `!== undefined` + validated as 64-char hex. `DecodedInvoice.descriptionHash` (BOLT11 `h`, hex; `""` if none) surfaced by `decodeInvoice` via a locally-widened lookup. Substantive boltz-swap work → see `docs/projects/boltz-swap/`.

**Documentation changes**:
- `system/architecture.md`: added `arkfee/estimator.ts` (eval→evaluate BREAKING note); extended `providers/electrum.ts` (whitespace-tolerant `get_merkle` matching) and `wallet/serviceWorker/wallet.ts` (stale-identity init guard + `MessageBusInitializingError` + FIFO init serialization)
- `INDEX.md` (project): added four new Key Concept entries (Estimator rename, SW init guard, Electrum error matching, sibling boltz-swap descriptionHash); corrected stale Version fields `0.4.37 → 0.4.39` and `0.3.42 → 0.3.44`
- `docs/INDEX.md` (master): added four Key Capabilities entries, new tags, and new debug triggers
- Sync tracking: `change-log/last-sync.txt` → `c9a7e753...`

**Tests added**: extensive — `packages/ts-sdk/test/{fee,electrum,serviceWorker/wallet,worker/messageBus}.test.ts` (+544 lines) and `packages/boltz-swap/test/{arkade-swaps,boltz-swap-provider,decoding,e2e/arkade-swaps}.test.ts` (+150 lines)

---

## 2026-06-23 - Test-lint fix (no source/API/version change)
**From**: `6c64a055b650c42383038a2bb66d241896b4bf83`
**To**: `cb77d23fbea8a067b11643fa73929b1bc16e58ec`
**Synced By**: update-project skill
**Status**: Single-commit, **internal-only**. `cb77d23f` (PR #577, "fix lint errors on tests") touches **only** four boltz-swap test files — no `src/` change, no public-API change, no version bump, no release cut. Per Smart Update Detection (internal/test changes → summary only), no documentation content was updated.

**Commits analyzed** (1 non-merge commit):
- `cb77d23f` fix lint errors on tests (#577)

**Notable source changes** (test files only — `packages/boltz-swap/test/`):
- `arkade-swaps.test.ts` + `e2e/arkade-swaps.test.ts`: lint-clean test bodies (60 insertions / 44 deletions across the two main files)
- `realm-swap-repository.test.ts`: cast `createMockRealm()` to `realm as any` when constructing `RealmSwapRepository` (silences a type-mismatch lint error in the test mock)
- `swap-manager.test.ts`: add required `preimageHash` / `feeSatsPerByte` fields to a chain-swap request fixture; drop an unused `hex` field from a mocked `getReverseSwapTxId` response

**Documentation changes**:
- None (test-only lint fix). Sync tracking updated: `change-log/last-sync.txt` → `cb77d23f`; master `docs/INDEX.md` ts-sdk section gained a short post-0.4.39 note recording the test-lint sync.

**Tests added**: none (existing tests lint-cleaned only)

---

## 2026-06-20 - boltz-swap offchain refund past CLTV + version export + 0.4.38/0.4.39 releases
**From**: `89c8d4119274ce18f25d1237b889779da6020618`
**To**: `6c64a055b650c42383038a2bb66d241896b4bf83`
**Synced By**: update-project skill
**Status**: Seven-commit sync, all substantive work in the **vendored sibling boltz-swap package** — `packages/ts-sdk/src/` only saw a one-line docstring trim in `src/utils/fetch.ts` (no behaviour change). Two release cuts (`@arkade-os/sdk` `0.4.37 → 0.4.38 → 0.4.39`, `@arkade-os/boltz-swap` `0.3.42 → 0.3.43 → 0.3.44`). The boltz-swap changes: (1) `5f87cd8f` exposes a new root `sdkVersion` export from boltz-swap (`` `boltz-swap/${version}` ``) so a swap consumer can report the plugin build distinctly from the core SDK build; (2) `07051d04` fixes the VHTLC refund path to **refund live VTXOs offchain past CLTV instead of always joining a batch** — once the CLTV refund locktime elapses the `refundWithoutReceiver` leaf (sender + server, no Boltz) is spendable, so a live (non-recoverable) VTXO settles it with an offchain Ark tx while a swept (recoverable) VTXO still falls back to `joinBatch`; applied symmetrically in `refundVHTLC`/`refundArk` and their Boltz-rejection fallbacks, backed by a new `refundWithoutReceiverVHTLCwithOffchainTx` helper in `boltz-swap/src/utils/vhtlc.ts` (mirrors `claimVHTLCwithOffchainTx`, verifying the server co-signs the `refundWithoutReceiver` leaf and checkpoint txs); (3) three refactors (`3f95983d`/`ed1a9478`/`1f17e346`) unify the per-VTXO refund loop and collapse settle call sites. Detailed boltz-swap docs live in `docs/projects/boltz-swap/`.

**Commits analyzed** (7 non-merge commits):
- `6c64a055` chore: release @arkade-os/sdk@0.4.39, @arkade-os/boltz-swap@0.3.44 (version bumps only)
- `273dbe9f` chore: release @arkade-os/sdk@0.4.38, @arkade-os/boltz-swap@0.3.43 (version bumps only)
- `5f87cd8f` feat: expose boltz-swap version (`boltz-swap/src/index.ts` new `sdkVersion`; `ts-sdk/src/utils/fetch.ts` docstring trim)
- `3f95983d` refactor(boltz-swap): unify refundVHTLC/refundArk per-VTXO loop
- `ed1a9478` refactor(boltz-swap): bundle refund context to collapse settle call sites
- `1f17e346` refactor(boltz-swap): extract settleRefundWithoutReceiver helper
- `07051d04` fix(boltz-swap): refund live VTXOs offchain past CLTV instead of always joining a batch (adds `refundWithoutReceiverVHTLCwithOffchainTx` to `boltz-swap/src/utils/vhtlc.ts`)

**Documentation changes**:
- `system/project_overview.md`: bumped workspace-table + Package versions (`0.4.36 → 0.4.39` / `0.3.41 → 0.3.44`); extended the **X-Build-Version / X-SDK-VERSION HTTP Headers** row to note the ts-sdk docstring trim and the new boltz-swap `sdkVersion` export
- Master `docs/INDEX.md`: extended the X-Build-Version capability bullet with the boltz-swap `sdkVersion` export note; added `0.4.38 release` (with the boltz-swap offchain-refund-past-CLTV summary) and `0.4.39 release` bullets to the ts-sdk section
- `change-log/last-sync.txt`: `89c8d411 → 6c64a055`

**Tests added**: boltz-swap `test/arkade-swaps.test.ts` updated for the offchain-refund-past-CLTV path (in the sibling package, covered under `docs/projects/boltz-swap/`)

## 2026-06-19 - Improve MissingSigningDescriptorError message + 0.4.37 release
**From**: `29635dd0489e165636d7ff5024ac608812a1927a`
**To**: `89c8d4119274ce18f25d1237b889779da6020618`
**Synced By**: update-project skill
**Status**: Two-commit sync. `69abdf56` improves the `MissingSigningDescriptorError` thrown message so it enumerates **both** ways a descriptor-capable contract can fail routing — (a) the wallet was rotated on an earlier build that did not persist signing descriptors, or (b) the contract belongs to a different identity (storage reuse) — instead of only the rotation case; remediation guidance broadened to include deleting the contract. The `signingErrors.ts` docstring is reframed around "descriptor-capable contract that cannot be routed to any signer," and `inputSignerRouter.ts` comments are tightened (the `default`/`delegate`/`boarding` scope and the `params.pubKey` lowercase canonicalization for persisted data). `89c8d411` is the release cut — `@arkade-os/sdk` `0.4.36 → 0.4.37`, `@arkade-os/boltz-swap` `0.3.41 → 0.3.42`. No public signatures changed (message + comments only).

**Commits analyzed** (2 non-merge commits):
- `89c8d411` chore: release @arkade-os/sdk@0.4.37, @arkade-os/boltz-swap@0.3.42 (version bumps in both `package.json` files)
- `69abdf56` fix: Improve MissingSigningDescriptorError message to include other causes (`packages/ts-sdk/src/wallet/signingErrors.ts` + `inputSignerRouter.ts`)

**Documentation changes**:
- `INDEX.md`: bumped package versions `0.4.36 → 0.4.37` / `0.3.41 → 0.3.42` (workspace table + Quick Reference Version row); expanded the **Signing Router** entry's `MissingSigningDescriptorError` description to enumerate both causes and the broadened remediation
- `system/architecture.md`: rewrote the `MissingSigningDescriptorError` throw note (descriptor-capable `default`/`delegate`/`boarding` scope, dual causes, deletion remediation)
- Master `docs/INDEX.md`: added a `MissingSigningDescriptorError` message-improvement capability bullet + a `0.4.37 release` bullet to the ts-sdk section; added the `missing-signing-descriptor-error` tag
- `change-log/last-sync.txt`: `29635dd0 → 89c8d411`

**Tests added**: none (message/comment-only change; no test diff in this range)

## 2026-06-18 - Export buildVersion and sdkVersion from the package root (#569)
**From**: `89de6561460faecef58a3048ed9e12fdf2078d4d`
**To**: `29635dd0489e165636d7ff5024ac608812a1927a`
**Synced By**: update-project skill
**Status**: Single-commit sync. `#569` (`29635dd0`) adds `buildVersion` and `sdkVersion` to the package-root export list in `packages/ts-sdk/src/index.ts` (imported from `./utils/fetch`). The two version constants — `buildVersion = "0.9.9"` (the arkd/Arkana server build the SDK targets, sent as `X-Build-Version`) and `sdkVersion = \`ts-sdk/${version}\`` (this package's own version, sent as `X-SDK-VERSION`) — were previously module-level exports only; they are now part of the public `@arkade-os/sdk` API so consumers can read them programmatically rather than only sending them as request headers. No version bump (stays `0.4.36`); no behaviour change.

**Commits analyzed** (1 non-merge commit):
- `29635dd0` export buildVersion and sdkVersion (#569) — 3-line diff in `packages/ts-sdk/src/index.ts` (one import + two names added to the `export { ... }` block)

**Documentation changes**:
- `INDEX.md`: appended a package-root-export note to the **X-Build-Version** and **X-SDK-VERSION** capability bullets and extended the X-Build-Version lineage chain with `→ package-root export (29635dd0)`
- `system/project_overview.md`: appended a "Since #569" note to the **X-Build-Version / X-SDK-VERSION HTTP Headers** core feature row
- Master `docs/INDEX.md`: appended the package-root-export note to the ts-sdk **X-Build-Version / X-SDK-VERSION HTTP headers** capability bullet
- `change-log/last-sync.txt`: `89de6561 → 29635dd0`

**Tests added**: none (export-only change; no test diff in this commit)

## 2026-06-17 - Release-only bump (0.4.36 / 0.3.41) — substantive work in sibling boltz-swap
**From**: `28d003afaa41b0637c3bfc7f090d4c8ea4201aa6`
**To**: `89de6561460faecef58a3048ed9e12fdf2078d4d`
**Synced By**: update-project skill
**Status**: Release cut — `@arkade-os/sdk` `0.4.35 → 0.4.36`, `@arkade-os/boltz-swap` `0.3.40 → 0.3.41` (commit `89de6561`). **No `packages/ts-sdk/src/` changes** in this range — the only `packages/ts-sdk/` diff is the `package.json` version bump. Every substantive change lands in the sibling `packages/boltz-swap/` package (optimistic `waitFor: 'funded'` Lightning resolution and supporting fixes); those are documented under `docs/projects/boltz-swap/`, not here. This entry exists to keep the SDK's version fields and sync pointer current.

**Commits analyzed** (7 non-merge commits — only the release commit touches `packages/ts-sdk/`):
- `89de6561` chore: release @arkade-os/sdk@0.4.36, @arkade-os/boltz-swap@0.3.41 — the only commit touching `packages/ts-sdk/` (version bump in `packages/ts-sdk/package.json`)
- `d9c7775b` fix(boltz-swap): never leave the settlement wait pending on terminal errors *(boltz-swap)*
- `90d56e35` fix(boltz-swap): warn when funded sends lack the SwapManager safety net *(boltz-swap)*
- `10c3898f` feat(boltz-swap): backfill the preimage in refreshSwapsStatus *(boltz-swap)*
- `4d49a3af` refactor(boltz-swap): replace optimisticResolveAt with waitForSwapFunded *(boltz-swap)*
- `ae26c1b7` fix(boltz-swap): keep persisting swap status after optimistic resolution *(boltz-swap)*
- `827426d6` feat(boltz-swap): add optimisticResolveAt option to waitForSwapSettlement *(boltz-swap)*

**Documentation changes**:
- `system/project_overview.md`: bumped `@arkade-os/sdk` `0.4.35 → 0.4.36` (Monorepo Layout table + Package block) and `@arkade-os/boltz-swap` `0.3.40 → 0.3.41` (Monorepo Layout table)
- `INDEX.md`: bumped the same SDK/boltz-swap versions in the workspace table and the Quick Reference Version row
- Master `docs/INDEX.md`: refreshed the stale ts-sdk **X-Build-Version** capability bullet to the current **X-Build-Version / X-SDK-VERSION** state (`buildVersion "0.9.9"`, `sdkVersion`, arkd-only header scope since 0.4.35); added a **server-signer rotation / deprecated-signer migration** capability bullet (0.4.35, #554) that the master entry was missing; added a **0.4.36 release** bullet recording this release-only bump and pointing to `docs/projects/boltz-swap/` for the substantive boltz-swap work
- `change-log/last-sync.txt`: `28d003af → 89de6561`

**Tests added**: none in `packages/ts-sdk/` (no SDK source changes; boltz-swap test changes are in `packages/boltz-swap/test/arkade-swaps.test.ts`)

---

## 2026-06-16 - arkd signer-rotation support + X-SDK-VERSION header + ghost zero-amount sent fix (0.4.35 / 0.3.40)
**From**: `219ff3249950944f1811322c53b0442ba36df2d8`
**To**: `28d003afaa41b0637c3bfc7f090d4c8ea4201aa6`
**Synced By**: update-project skill
**Status**: Release cut — `@arkade-os/sdk` `0.4.34 → 0.4.35`, `@arkade-os/boltz-swap` `0.3.39 → 0.3.40` (commit `28d003af`). **Range note**: `last-sync.txt` recorded `219ff324` (the 2026-06-12 entry's `To`), but the task's stated fast-forward base was `f8dfc3d0` — 4 commits (incl. the headline signer-rotation feature `f8dfc3d0` #554) had landed and been fast-forwarded **without a doc sync**. This sync covers the full `219ff324..28d003af` range so nothing is lost. Three threads: (1) **arkd signer-rotation support** (`f8dfc3d0`, #554) — first-iteration client support for planned arkd server-signer rotation: deprecated-signer classification, mid-session `Wallet.rotateServerSigner`, `VtxoManager.migrateDeprecatedSignerVtxos` + `getDeprecatedSignerStatus` reporting, an opt-out poll pass, cooperative recovery of old-signer boarding UTXOs, recover-on-sweep for post-cutoff signers, service-worker parity, and Boltz VHTLC reconstruction across deprecated signers; (2) **`X-SDK-VERSION` header** (`a290f2f2`) — new `sdkVersion = ts-sdk/{version}` (sourced from package.json) sent alongside `X-Build-Version` on the arkd-only fetch path; (3) **ghost zero-amount sent fix** (`40bf82f5`) — `buildTransactionHistory` no longer records a `TxSent` row for a pure self-transfer (the all-VTXO signer migration spends to a single self output, net 0). Plus three gap-range bug fixes (contractWatcher reconnect, electrum getTxStatus de-flake, boltz invoice millisat precision).

**Commits analyzed** (7 non-merge commits):

*arkd signer-rotation support (the headline feature, #554):*
- `f8dfc3d0` feat: arkd signer-rotation support (deprecated-signer migration + Boltz VHTLC recovery) — +6054/-352 across 49 files. New module `src/wallet/signerRotation.ts` exporting the `SignerStatus` union (`CURRENT | MIGRATABLE | DUE_NOW | EXPIRED | UNKNOWN_SIGNER`), the `SignerClassification` / `SignerSet` interfaces, and the pure helpers `classifyContractSigner`, `classifyAgainstSignerSet`, `signerSetFromInfo`, `isCooperativelyMigratable`, `toXOnlySignerHex` (all re-exported from the package root). Staleness is **never persisted** — always derived at read time from a contract's `params.serverPubKey` plus a fresh `ArkInfo` snapshot. `ArkInfo` gains `deprecatedSigners: DeprecatedSigner[]` (each `{ pubkey: string; cutoffDate: bigint }`; `cutoffDate` is non-nullable per arkd, `0n` = "no cutoff advertised" → `DUE_NOW`) plus a `digest: string`. New `DigestMismatchError` (exported from the package root, `providers/ark.ts`): arkd's `X-Build-Version`/digest guard surfaces a mismatch and the SDK re-derives signer-dependent state via the new `ArkProvider.onServerInfoChanged(cb)` event stream, then THROWS — it never silently retries (mirrors dotnet-sdk #131 / NArk's `BuildVersionHandler`); `getInfo` itself never throws it. `Wallet.rotateServerSigner(newServerPubKey, checkpointTapscript)` applies a mid-session rotation, swapping `_arkServerPublicKey` and re-deriving the offchain + boarding + checkpoint-unroll tapscripts (serialized for static / non-HD wallets); the wallet auto-subscribes to `onServerInfoChanged` and folds itself onto the new signer. `VtxoManager.migrateDeprecatedSignerVtxos(options?: MigrateDeprecatedSignerOptions)` runs a **two-leg** migration — the VTXO leg migrates through the Ark send path (`Wallet.sendSelectedVtxosToSelf`, a single full-value self output), the boarding leg keeps a separate settle-backed migration (boarding coins are on-chain inputs with no send path); the legs are never combined into one intent and each owns its full sizing pipeline (oversized filtering, count + amount caps, its own dust floor) and reports independently. Migration is **fee-exempt** (mandatory, so every deprecated-signer input moves at full value — intent-fee pricing, per-input fee skips, and the output fee deduction were all dropped; only the protocol dust floor on the aggregate remains). `VtxoManager.getDeprecatedSignerStatus()` returns `DeprecatedSignerReport[]` (per deprecated signer: status, cutoff, `vtxoCount`/`totalValue`, `boardingCount`/`boardingValue`, plus the recover-on-sweep lifecycle counters `recoverableCount`/`recoverableValue`/`awaitingSweepCount`/`awaitingSweepValue`/`nextSweepEta`). New `Wallet.getBoardingUtxosForSigners(allowedSigners): Promise<BoardingUtxoGroup[]>` returns the address↔signer association `ExtendedCoin` cannot carry; `getBoardingUtxos()` becomes a current-signer-only flatten over it. `EXPIRED` is **recover-on-sweep, not unilateral-exit-required**: a post-cutoff VTXO keeps its own batch expiry, the server sweeps it at expiry, and the swept VTXO recovers into the active signer through the normal recovery settle (unilateral exit stays an opt-in escape hatch). Migration report types `DeprecatedSignerMigrationReport`, `DeprecatedSignerReport`, `MigrateDeprecatedSignerOptions`, `MigrationVtxoRef`, `MigrationLegReport`, `MigrationLegSkipReason`, `MigrationGlobalSkipReason`, plus `SignerStatus`/`SignerClassification`/`SignerSet` and the `BoardingUtxoGroup` type, are all exported from the package root. **Service-worker parity**: new `MIGRATE_DEPRECATED_SIGNER_VTXOS` / `GET_DEPRECATED_SIGNER_STATUS` (+ `DEPRECATED_SIGNER_STATUS` response) message types in `wallet-message-handler.ts` + `serviceWorker/wallet.ts`; duplicate `GET_DEPRECATED_SIGNER_STATUS` worker requests are deduped. **Boltz/boltz-swap**: swaps created before a rotation are locked to a now-deprecated signer — claim/refund/lookup paths match the stored lockup address against the current AND deprecated signers and thread the matched key downstream (no swap-schema change; creation-time `verifyChainSwap` stays on the current signer); a reverse swap is now rejected when the Boltz invoice's payment hash doesn't commit to our preimage. **Fetch-path split (part of this commit)**: `src/utils/fetch.ts` splits into `baseFetch` (guarded passthrough, no Arkade headers) and `fetch` (arkd-only, sets the custom headers); `indexer.ts`, `delegate.ts`, `onchain.ts` switch to `baseFetch` because non-ark origins (Esplora, indexer, delegate) reject unknown custom headers in CORS preflight, while `ark.ts` keeps `fetch`. `buildVersion` bumped to `"0.9.9"`. Unit + e2e tests for migration reporting, real server-signer rotation, old-signer boarding classification, and VHTLC reconstruction (cooperative-settle round-trips partially blocked on a rotation-capable regtest fixture / arkd#822).

*X-SDK-VERSION header:*
- `a290f2f2` feat(providers): send X-SDK-VERSION header to arkd — adds `export const sdkVersion = "ts-sdk/{version}"` to `src/utils/fetch.ts` (version imported from `package.json` so it tracks every release bump, unlike `buildVersion` which tracks arkd's compatibility guard). The arkd-only `fetch` wrapper now sets BOTH `X-Build-Version` and `X-SDK-VERSION`; `getExpoFetch` (`providers/expoUtils.ts`) mirrors both on the expo/fetch streaming path. Deliberately kept off non-ark origins (Esplora, indexer, delegate) via `baseFetch`, whose CORS preflight rejects unknown custom headers.

*Ghost zero-amount sent fix:*
- `40bf82f5` fix(transactionHistory): drop ghost zero-amount sent for signer-rotation migration — `buildTransactionHistory` skips the offchain `TxSent` row when `txAmount === 0` and no assets move. Migrating all VTXOs to a new signer spends them to a single self output of the full amount, so `spentAmount === changeAmount` and the net sent is 0; the old code emitted a confusing ghost zero-amount sent. Zero-amount sends that DO move assets (issuance/reissuance/burn) are kept (the `txAmount !== 0 || assets` guard). +44 test lines.

*Gap-range bug fixes (landed before the stated `f8dfc3d0` base; covered here because the doc baseline was `219ff324`):*
- `415f93c7` fix: preserve invoice millisat precision (#559) — `packages/boltz-swap/src/utils/decoding.ts`: BOLT11 invoice amount decoding no longer loses millisat precision. +22 test lines.
- `99908015` fix(electrum): de-flake getTxStatus by classifying RPCError-wrapped errors (#562) — `ElectrumOnchainProvider.getTxStatus` classifies `RPCError`-wrapped "not found" errors so a not-yet-broadcast/unknown tx returns a clean unconfirmed status instead of throwing intermittently. +16 test lines.
- `664033ab` fix(contractWatcher): recover promptly after subscription disruption (#564) — `ContractWatcher` recovers promptly after its SSE subscription is disrupted (reconnect path) rather than silently going quiet. +29 test lines in `contractWatcher-reconnect.test.ts`.

*Release:*
- `28d003af` chore: release `@arkade-os/sdk@0.4.35`, `@arkade-os/boltz-swap@0.3.40` — version bumps in the two package.json files only.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — version `0.4.34 → 0.4.35` / `0.3.39 → 0.3.40` in the monorepo table + Quick Reference. New Key Concepts: "arkd Server-Signer Rotation + Deprecated-Signer Migration", "X-SDK-VERSION HTTP Header". The "X-Build-Version HTTP Header" concept corrected for the `baseFetch`/`fetch` split (now arkd-only; `buildVersion` bumped to `0.9.9`). "Boarding History De-duplication" extended with the ghost zero-amount-sent self-transfer suppression.
- `docs/projects/ts-sdk/system/project_overview.md` — version bumps; new Core-Features rows "Server-Signer Rotation / Deprecated-Signer Migration" and "X-SDK-VERSION HTTP Header"; X-Build-Version row updated for the arkd-only split; Integration Points note the dual version headers.
- `docs/projects/ts-sdk/system/architecture.md` — version annotations `0.4.34 → 0.4.35` / `0.3.39 → 0.3.40`; new `wallet/signerRotation.ts` module-tree entry; `providers/ark.ts` annotation extended (`DigestMismatchError`, `onServerInfoChanged`, `ArkInfo.deprecatedSigners`/`digest`); `wallet/wallet.ts` (`rotateServerSigner`, `getBoardingUtxosForSigners`, `BoardingUtxoGroup`, `sendSelectedVtxosToSelf`); `wallet/vtxo-manager.ts` (`migrateDeprecatedSignerVtxos` / `getDeprecatedSignerStatus` + report types, fee-exempt two-leg migration, recover-on-sweep); `utils/fetch.ts` (`baseFetch`/`fetch` split, `sdkVersion`, `buildVersion = "0.9.9"`); `providers/indexer.ts`/`delegate.ts`/`onchain.ts` now import `baseFetch`; `providers/expoUtils.ts` mirrors both headers; `utils/transactionHistory.ts` ghost zero-amount-sent suppression; `contracts/contractWatcher.ts` reconnect recovery; `providers/electrum.ts` getTxStatus RPCError classification.
- `docs/projects/ts-sdk/system/integration-with-arkd.md` — new "Server-Signer Rotation" section (deprecated-signer classification, `onServerInfoChanged` event-driven trigger, `DigestMismatchError`, two-leg migration, recover-on-sweep) and "Request Headers" note (`X-Build-Version` + `X-SDK-VERSION`, arkd-only).
- `docs/INDEX.md` — ts-sdk version refs bumped; new Key Capability bullets (signer rotation/migration, X-SDK-VERSION); X-Build-Version bullet corrected for the arkd-only split; Tags extended (`signer-rotation`, `deprecated-signer-migration`, `rotate-server-signer`, `migrate-deprecated-signer-vtxos`, `digest-mismatch-error`, `on-server-info-changed`, `recover-on-sweep`, `x-sdk-version`, `sdk-version-header`, `base-fetch`); debug triggers extended (`digest mismatch`, `deprecated signer migration`, `signer rotation stranded vtxos`, `x-sdk-version header`, `vhtlc deprecated signer`).

**Notes**:
- **Doc baseline vs. task base**: the task named `f8dfc3d0` as the fast-forward base, but `last-sync.txt` held `219ff324`. The intervening 4 commits (`415f93c7`, `99908015`, `664033ab`, `f8dfc3d0`) were never doc-synced, so this entry documents the full `219ff324..28d003af` range. `last-sync.txt` advanced to `28d003af`.
- **First-iteration signer rotation**: client support is for *planned* arkd signer rotation. Cooperative-settle round-trips for the migration e2e are partly gated on a rotation-capable regtest fixture (arkd recreates arkd-wallet + restarts arkd) and arkd#822; classification/reporting and VHTLC reconstruction are fully exercised.
- **`buildVersion = "0.9.9"`** still tracks the arkd/Arkana server build, NOT the SDK package version; `sdkVersion` (`ts-sdk/0.4.35`) tracks the package. Both are hardcoded/sourced separately and sent only to arkd.
- **Header CORS scope**: only `arkd` requests carry `X-Build-Version` / `X-SDK-VERSION`. Indexer, delegate, and Esplora requests use `baseFetch` (no custom headers) because their CORS preflight rejects unknown headers — a correction to the prior cut's "all four REST providers set the header" shape.

## 2026-06-12 - vtxoMaxAmount settlement cap + settle rotation race fix + X-Build-Version header
**From**: `4148652626bb7db9429486f1eb703cab9be0e312`
**To**: `219ff3249950944f1811322c53b0442ba36df2d8`
**Synced By**: update-project skill
**Status**: Source-only cut — no release. `@arkade-os/sdk` stays at `0.4.34`, `@arkade-os/boltz-swap` at `0.3.39`. Three threads: (1) **settlement batches additionally capped by the server's per-output ceiling `ArkInfo.vtxoMaxAmount`** (`-1` = no-limit sentinel; the server rejects over-limit virtual outputs with `AMOUNT_TOO_HIGH`) via new exported `capSettlementBatch(sorted, maxAmount)` in `vtxo-manager.ts`, wired into recovery, renewal, periodic settle, and the no-params `Wallet.settle` path; (2) **settle rotation race fix** — `Wallet.settle` reads the receive address once and pins all downstream reads to it, closing a race with `WalletReceiveRotator.rotate` that produced spurious "no output matches" failures; (3) **`X-Build-Version` HTTP header** on every provider request via new `src/utils/fetch.ts` (`buildVersion = "0.9.7"`), including the Expo streaming fetch path — lets the server (Arkana) correlate requests with the client build. Plus two regtest submodule pointer bumps.

**Commits analyzed** (9 non-merge commits):

*Settlement batches capped by vtxoMaxAmount:*
- `4f7a838d` Cap settlement batches by vtxoMaxAmount — introduces the per-output amount cap alongside the existing `MAX_VTXOS_PER_SETTLEMENT` count cap. New exported helper `capSettlementBatch<T extends { value: number }>(sorted, maxAmount: bigint)`: count cap is a hard stop; an input that would breach the amount bound is **skipped, not a stopping point** (a break would strand a smaller input behind an oversized one and could leave the batch below dust); `> maxAmount` mirrors the server's strict check so a batch whose total equals the limit still fits; `maxAmount < 0` disables the bound (the server's `-1` sentinel). The helper bounds each input's **gross** `value` — intentionally conservative since it has no fee context (the real output is smaller post-fee, so a batch that fits on gross always fits post-fee); the fee-aware periodic-settle / manual-settle paths cap on **net** instead (deliberate, harmless asymmetry, documented in the helper's JSDoc with a "do not tighten" warning). Wired into `recoverVtxos` (value-descending; capped-batch-below-dust error message now names both the input-count and the sat limits) and `renewVtxos` (expiry-ascending). New private `VtxoManager.getInfoProvider()` narrow-casts the wallet to `{ arkProvider?: ArkProvider }` so recovery/renewal can read `vtxoMaxAmount` without requiring full boarding-sweep capability (`undefined` → no limit). +246 lines of tests in `test/vtxo-manager.test.ts`.
- `17e85766` Address PR review findings on settlement cap — renewal path hardening: warns when VTXOs **individually** exceed the ceiling (those can never be renewed by this path — the server would reject them — and drift toward unilateral exit as expiry nears; surfaced so operators can act, e.g. split them); throws `No VTXOs available to renew within the per-output limit ${vtxoMaxAmount}` when the capped batch is empty (only reachable if the server lowered the ceiling below an existing VTXO). `runPeriodicSettle` caps on the net (post-input-fee) contribution inline, skipping (not stopping at) VTXOs that would push the running output total past the ceiling; boarding inputs stay uncapped but are counted via the running total (if boarding alone exceeds the ceiling no VTXO fits — a multi-output split is out of scope). `Wallet.settle` (no-params) compares the **projected post-output-fee** amount against the ceiling so a VTXO whose output would fit once the output fee is deducted isn't dropped.

*Settle rotation race:*
- `0a02b650` Read receive address once in settle to avoid rotation race — `Wallet.settle` resolves `offchainAddress` / decoded `offchainPkScript` / hex `offchainOutputScript` once at the top and reuses them for the no-params self-settle output, the output-fee estimation script, and the asset-routing destination matched by `findDestinationOutputIndex`. `WalletReceiveRotator.rotate` mutates `this.offchainTapscript` without acquiring `_txLock`, so re-calling `getAddress()` later in the same settle could observe a rotated script — building the output from one address while matching the destination index against the other, failing with a spurious "no output matches". +98 lines in `test/wallet.test.ts`.

*X-Build-Version header (Arkana build correlation):*
- `02c4c5ca` add digest header to http request — initial shape: new `src/utils/fetch.ts` with a hardcoded `X-Server-Digest` hash header, applied only when `init` was passed.
- `98ffc6de` move from digest to version — header renamed to `X-Build-Version` with value `"0.9.7"` (tracks the arkd server build, not the SDK package version).
- `8224a35a` arkana fixes — final wrapper shape: `export const buildVersion = "0.9.7"`; `fetch(input, init?)` throws if `globalThis.fetch` is unavailable, then sets the header via `new Headers(init?.headers)` + `headers.set` so it applies on EVERY request (the prior `if (init)` guard skipped header-less calls) and composes with caller-supplied headers in any shape. The four REST providers (`ark.ts`, `indexer.ts`, `delegate.ts`, `onchain.ts`) import this `fetch` in place of the global.
- `159c7f7d` add header to expo fetch — `getExpoFetch` (`providers/expoUtils.ts`) wraps the dynamically imported `expo/fetch` with the same header; the non-Expo fallback path returns the header-setting `fetch` from `utils/fetch.ts`. Test stubs across `delegate-provider` / `esplora` / `indexer-provider` / `wallet*` suites updated to tolerate the injected header.

*Regtest submodule pointer bumps (no SDK source impact):*
- `2c0fd625` update regtest link — submodule `3ac33b66` → `cd473132`.
- `e00885eb` reverse regtest update — submodule `cd473132` → `3987ec6a`.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — "Capped Settlement / Renewal / Recovery VTXO Batches (0.4.34)" Key Concept extended with the post-0.4.34 `vtxoMaxAmount` cap (`capSettlementBatch` semantics, gross-vs-net asymmetry, skip-don't-stop rule, oversized-VTXO renewal warning, `getInfoProvider`). Two new Key Concepts: "Settle Rotation Race Fix — Receive Address Read Once" and "X-Build-Version HTTP Header".
- `docs/projects/ts-sdk/system/project_overview.md` — "Capped Settlement / Renewal / Recovery Batches" Core-Features row extended with the amount cap; two new rows "Settle Rotation Race Fix" and "X-Build-Version HTTP Header".
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/vtxo-manager.ts` annotation extended with `capSettlementBatch` + `getInfoProvider`; `wallet/wallet.ts` annotation extended with the read-once settle address pinning + the net/post-output-fee ceiling check; `providers/ark.ts` annotation notes the `utils/fetch` import (mirrored in indexer/delegate/onchain); `providers/expoUtils.ts` annotation extended with the expo-fetch header wrap; new `utils/fetch.ts` module-tree entry.
- `docs/INDEX.md` — ts-sdk capped-batches Key Capability extended with the `vtxoMaxAmount` cap; two new bullets (settle rotation race fix, X-Build-Version header). Tags extended with `vtxo-max-amount`, `cap-settlement-batch`, `amount-too-high`, `settle-rotation-race`, `x-build-version`, `build-version-header`, `arkana`. Debug triggers extended with `AMOUNT_TOO_HIGH`, `vtxoMaxAmount exceeded`, `vtxo exceeds per-output limit`, `no output matches settle`, `x-build-version header missing`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` stays at `0.4.34`, `packages/boltz-swap/package.json` at `0.3.39`. The next published release carries this batch.
- **`buildVersion = "0.9.7"` is not the SDK version** — it tracks the arkd/Arkana server build the SDK targets. It's a hardcoded constant in `src/utils/fetch.ts`, so bumping it is a manual step on future server upgrades.
- **No public API breakage**: `capSettlementBatch` and `buildVersion` / `fetch` (module-level, not re-exported from the package root as of this cut) are additions. The header is additive on the wire; servers that don't read `X-Build-Version` ignore it.
- **The digest→version lineage never shipped**: all four header commits land in this same unreleased cut, so only the final `X-Build-Version` Headers-based shape will ever be published.

## 2026-06-10 - btcd-compatible Taproot tree + capped settlement batches + restore signer-rotation/parallel/batched probes (0.4.34 / 0.3.39)
**From**: `f6b45d8627578ec35c881710f1583d4c4f74bf80`
**To**: `4148652626bb7db9429486f1eb703cab9be0e312`
**Synced By**: update-project skill
**Status**: Release cut — `@arkade-os/sdk` `0.4.33 → 0.4.34`, `@arkade-os/boltz-swap` `0.3.38 → 0.3.39` (commit `d8f0e1c2`). Three substantive threads land in this range. (1) **btcd-compatible Taproot script tree**: `VtxoScript` now uses `assembleBtcdTaprootTree` (Phase 1 left-to-right pairing with odd-trailing-leaf merge into the LAST branch; Phase 2 FIFO merge) in a new `src/script/taprootTree.ts`, replacing `@scure/btc-signer`'s `taprootListToTree` Huffman builder. The two agreed for power-of-2 leaf counts but diverged for every other count → different merkle roots → arkd rejected spends with `INVALID_PSBT_INPUT`. (2) **Capped settlement/renewal/recovery batches**: `MAX_VTXOS_PER_SETTLEMENT = 50` with purpose-specific sorting (`byValueDescending` for recovery, `byExpiryAscending` for renewal) applied before the cap so the deferred overflow doesn't starve viable VTXOs; differentiated recovery error reports cap + count + dust threshold when a funded wallet's sub-cap batch can't clear dust. (3) **Restore hardening**: deprecated-signer scan in `DiscoveryDeps.deprecatedSignerPubKeys` so signer rotation doesn't strand L2 VTXOs; parallel per-index probes; batched `detectUsedScripts` via new shared helper in `contracts/handlers/helpers.ts` paging at `DEFAULT_PAGE_SIZE = 500` from new leaf module `contracts/constants.ts`; gap-limit-windowed outer scan loop via new `ScanContractsOptions.batchSize?` (default `DEFAULT_SCAN_BATCH = 10`). Internal: `CONTRACTS.md` consolidated into `AGENTS.md`; build dep fix bumps typedoc and overrides `minimatch` via pnpm workspace to unblock `docs:build` under Node v24 ESM (no SDK-facing change).

**Commits analyzed** (17 non-merge commits):

*btcd-compatible Taproot script tree (closes the non-power-of-2 leaf-count divergence with arkd):*
- `8d432a13` fix(script): build Taproot script tree with btcd's algorithm — the headline fix. New `src/script/taprootTree.ts` exports `assembleBtcdTaprootTree(scripts: Bytes[]): TaprootTreeNode` plus `TaprootLeaf` and `TaprootTreeNode`, all re-exported from `src/index.ts`. Reproduces btcd's `txscript.AssembleTaprootScriptTree` in TS: **Phase 1** pairs leaves left-to-right `for i := 0; i < len(leaves); i += 2` — an odd trailing leaf merges with the LAST branch built so far (NOT a fresh leaf pair); **Phase 2** is a FIFO-queue merge — take front two branches, combine into a new branch, push to back, repeat until one branch remains. `VtxoScript` (in `src/script/base.ts`) is rewritten to call the new function, and the obsolete `scripts.reverse()` odd-count workaround is removed. The prior `taprootListToTree` Huffman builder agreed for power-of-2 leaf counts but diverged for everything else → different merkle root → different taproot output key → arkd rejected spends with `INVALID_PSBT_INPUT`. Verified against the arkd reference path `/pkg/ark-lib/script/vtxo_script.go:226-244` → btcd `txscript/taproot.go:623`. Existing 6- and 7-leaf vtxoscript fixture tests pass unchanged; new `test/taprootTree.test.ts` covers leaf counts 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 32 (all build valid trees + encode→decode round-trips preserve the tap key). Full unit suite: 1357/1357 pass.
- `63460868` test(script): assert taproot tree against btcd golden vectors — strengthens the test oracle. Adds btcd-derived taproot keys for divergent leaf counts (3, 5, 9, 10, 11, 13, 15, 17) to `test/fixtures/vtxoscript.json` so `tapscript.test.ts` checks the builder against an independent oracle rather than only proving determinism; slims the round-trip test to a serialization check.
- `570fd2ce` Get rid of unsafe `any` — review nit: replaces an `any` cast inside `taprootTree.ts` (the Huffman→btcd transition introduced it). Pure typing tightening (3 changed lines, 2 removed).

*Capped VTXO settlement batches (under arkd's intent tx-weight budget) — sorted before the cap so overflow doesn't starve viable VTXOs:*
- `930df075` Limit settlement VTXO batches to 50 — introduces `MAX_VTXOS_PER_SETTLEMENT = 50` in `src/wallet/vtxo-manager.ts`. Wired into `recoverVtxos`, `runPeriodicSettle`, and `renewVtxos` (boarding inputs added uncapped). Initially a fixed-VTXO-count constant doc'd against a non-existent go-sdk `maxVtxosPerBatch` — corrected by `f451b2a1` to "arkd enforces a tx-weight budget (TX_TOO_LARGE)". Adds tests covering the cap behaviour across the settle paths.
- `f451b2a1` Sort VTXOs before capping settlement batches — applies purpose-specific sorts before the cap so the deferred overflow doesn't starve viable VTXOs (missed renewal windows, recovery livelock — see PR #549 review). Adds `byValueDescending<T extends {value: number}>(vtxos)` (recovery / manual settle: max value, best chance the capped subset clears dust) and `byExpiryAscending(vtxos: ExtendedVirtualCoin[])` (renewal / periodic settle: most urgent renewals make the cut; already-recoverable/expired sort first; no-batch-expiry or block-height-looking expiry sort last). Both pure (`[...vtxos].sort(...)`). Corrects the `MAX_VTXOS_PER_SETTLEMENT` doc-comment: arkd enforces a tx-weight budget (`TX_TOO_LARGE`), not a fixed VTXO count.
- `50d36906` Differentiate recovery error when capped batch is below dust — `recoverVtxos` no longer throws the same `No recoverable VTXOs found` for a genuinely empty wallet vs. a funded wallet whose highest-value sub-cap batch can't clear dust (PR #549 review #3). The latter now reports the cap, the recoverable count, and the dust threshold so operators can tell stuck-but-funded from empty.
- `572be78f` Harden capped VTXO settlement selection — defensive cleanup around the cap paths (additional tests + small fixes uncovered while wiring the cap and sorts; +154/-9 across `vtxo-manager.ts` + tests).

*Restore: deprecated-signer scan + parallel per-index probes + batched candidate queries + windowed outer loop:*
- `c10672cd` restore: scan deprecated server signers for L2 vtxos — closes the signer-rotation blind spot in restore. Signer-key rotation anchors past L2 VTXOs to a different script (the script embeds the signer pubkey). Restore now scans the current `serverPubKey` PLUS each deprecated signer in a fresh `getInfo` snapshot, deduping candidates by `scriptHex`. The matched signer is threaded through the constructed script, the persisted contract `params.serverPubKey`, and the encoded `address` so signing/forfeit on a recovered VTXO resolves the right key. New `DiscoveryDeps.deprecatedSignerPubKeys?: Uint8Array[]` (optional; empty/absent when the server advertises none). Boarding discovery stays current-key only (boarding's source of truth is the on-chain UTXO set — a boarded boarding output becomes a VTXO so the indexer probe already keeps the gap window open for it). +297/-61 across `default.ts`, `delegate.ts`, `types.ts`, `wallet.ts`, and `restore.test.ts` (+178 tests).
- `699c9368` test: cover spent-boarding restore blind spot — adds a regression test asserting a fully-boarded index goes cold in both restore signals but the receive-destination index holds the gap window open; also asserts a cold boarding index between used indices doesn't close the window early. +119 in `test/restore.test.ts`.
- `2929ac2a` test(restore): fix pollution from `stubInfoWithDeprecated` — test hygiene: a helper added in `c10672cd` was bleeding stubbed `getInfo` state between cases. +9/-1.
- `a4e4df0b` restore: parallelize per-index probes and batch candidate queries — performance + structural refactor. Per-index `Discoverable.discoverAt` calls now run concurrently and persist hits in declared order to preserve the first-wins boarding/default tie-break. Collapses the per-variant `getVtxos` loop in `default`/`delegate` into ONE batched `detectUsedScripts(indexerProvider, scriptHexes)` indexer probe (new shared helper in `src/contracts/handlers/helpers.ts`) that pages `getVtxos({ scripts, pageIndex, pageSize })` until every candidate is seen (short-page heuristic ends pagination). Adds new leaf module `src/contracts/constants.ts` exporting `DEFAULT_PAGE_SIZE = 500` so the manager's bulk history sync and the handler-layer probe can't drift; lives in its own no-import module to avoid a `handlers → contractManager` import cycle. +299/-80 across `contracts/constants.ts` (new), `contractManager.ts`, `handlers/default.ts`, `handlers/delegate.ts`, `handlers/helpers.ts`, and `test/restore.test.ts`.
- `0464bea8` restore: probe HD indices in gap-limit-capped batches — windows the outer scan loop `batchSize` HD indices at a time on top of the per-index probe concurrency. New `ScanContractsOptions.batchSize?: number` (defaults to `DEFAULT_SCAN_BATCH = 10`). Each window is capped to `gapLimit - unused`, so every probed index is one a serial scan would reach (nothing over-scanned, discovered set byte-identical to the prior serial scan, only faster — an empty wallet closes its gap window in `ceil(gapLimit/batch)` rounds). Validates `batchSize` is a positive integer alongside `gapLimit`. +200/-39 across `contractManager.ts` + `test/restore.test.ts`.

*Internal docs consolidation + 0.4.34 release + build dep fix:*
- `e754e469` move contracts subsystem design into AGENTS.md, delete CONTRACTS.md — expands the one-liner contracts entry in repo-root `AGENTS.md` with the ownership invariants from `packages/ts-sdk/CONTRACTS.md` (event-only watcher, `ContractManager` as sole indexer fetcher and repo writer, offline-first wallet reads), then deletes `CONTRACTS.md`. Known implementation gaps tracked in repo issue #550. Internal contributor docs only — no SDK-facing change.
- `d8f0e1c2` chore: release `@arkade-os/sdk@0.4.34`, `@arkade-os/boltz-swap@0.3.39` — version bumps in the two package.json files only. Cuts the release that ships the three threads above.
- `da2398ba` fix: update typedoc and override minimatch to resolve Node.js v24 ESM crash — `pnpm docs:build` was crashing under Node v24. typedoc is ESM and imports minimatch via the `import` condition, loading `minimatch/dist/esm/index.js`, which does `import { expand } from 'brace-expansion'`, but `brace-expansion@2.x` is a plain CJS function with no named ESM exports — Node v24 stopped synthesising named exports from CJS function-exports. Bump typedoc `^0.28.16 → ^0.28.19` (which depends on `minimatch ^10.2.5`), and add `pnpm.overrides.minimatch '^10.2.5'` so the existing stale `9.0.7` lockfile entry is replaced. Build dep only — no SDK runtime change.
- `3899325a` fix: move minimatch override to pnpm-workspace.yaml, remove brace-expansion pin — follow-up to `da2398ba`. The `pnpm.overrides` belong in `pnpm-workspace.yaml`, not `package.json`, and the original `brace-expansion: ^2.0.3` pin was redundant once `minimatch` is `^10.2.5`. Cleans up the location and removes the stale pin. No functional change.
- `d3b10ebf` fix formatting — Prettier formatting in `package.json` after the override move.

## 2026-06-08 - Regtest migration off nigiri + Esplora mempool-compat fixes + BIP21 amount validation
**From**: `ae6ac6ff82c2a3f168b4a6e3d806219fcd2733c0`
**To**: `f6b45d8627578ec35c881710f1583d4c4f74bf80`
**Synced By**: update-project skill
**Status**: Source-only cut — no release. `@arkade-os/sdk` stays at `0.4.33`, `@arkade-os/boltz-swap` at `0.3.38`. Two distinct threads land in this range: (1) the regtest stack moves off `nigiri`/`chopsticks`/`esplora` to the in-house **arkade-regtest** Docker Compose stack driven by a zero-dependency Node CLI (`regtest/regtest.mjs`) — the SDK's Esplora regtest URL gains a `/api` suffix, every `.env.regtest` is reshaped, CI drops Go + nigiri install, and `EsploraProvider.getChainTip` + `getFeeRate` are hardened against the mempool-spec backend (`/blocks/tip` and `/fee-estimates` quirks); (2) `BIP21.create()` + `BIP21.parse()` amount validation is aligned across both directions — safe-integer check applied to both, parse regex tightened to the BIP21 ABNF so `".5"` and `"5."` are accepted (matching `NArk`).

**Commits analyzed** (14 non-merge commits):

*Regtest migration off nigiri (in-house Node CLI):*
- `7e34960a` Migrate regtest usage off nigiri (in-house Node CLI) — the headline commit. arkade-regtest replaced its nigiri / chopsticks / esplora stack with an in-house Docker Compose stack driven by `regtest/regtest.mjs` (zero deps). Drives the submodule from the new CLI everywhere: `scripts/regtest.sh` (start/stop/clean) and the root + per-package `regtest:start/stop/clean` npm scripts now invoke `node regtest/regtest.mjs ...`. Esplora regtest URL `http://localhost:3000` → `http://localhost:3000/api` (mempool-backed Esplora is mounted under `/api`) at every site that hardcoded it: `src/providers/onchain.ts` default map (`ESPLORA_URL.regtest`), `test/e2e/utils.ts`, `test/e2e/settlement.test.ts` + `ark.test.ts`, `test/setup.mjs`, the boltz-swap suites + their curl helpers, and the example scripts (`spilman.js`, `vhtlc.js`, `multiple-wallets.ts`, `contract-manager.ts`). In-network explorer `http://chopsticks:3000` → `http://mempool_web/api` (the in-network esplora is the mempool container, not chopsticks). Faucet helpers `nigiri faucet ...` → `node regtest/regtest.mjs faucet ... --confirm`; mining `nigiri rpc --generate N` → `node regtest/regtest.mjs mine N`. `BITCOIN_LOW_FEE` removed from every `.env.regtest` (baked into the compose base). Stale `ark` container name → `arkd` in `examples/contract-manager.ts` to match the new compose stack. CI drops the Go setup step + nigiri cache/PATH, checks out submodules with `recursive`, relies on `setup-node` + the Node CLI, and fixes log-capture container names. README/AGENTS updated to describe the Node CLI stack and the `/api` esplora endpoint. Electrum/Fulcrum regtest endpoints (50003) unchanged. The regtest submodule SHA is intentionally left untouched in this commit (bumped in follow-ups). Prettier formatting from the migration was lost in the diff and applied separately as `ec20dc42`.
- `ec20dc42` Fix Prettier formatting from regtest migration — pure formatting in `test/e2e/ark.test.ts` after the `7e34960a` migration (no functional changes, 18 insertions / 6 deletions).
- `0a876506` Bump regtest submodule to denigiri-regtest (regtest.mjs) — submodule pointer bump to `20c0851` of `ArkLabsHQ/arkade-regtest#27` (the in-house Node CLI branch), explicitly tagged as temporary in the commit message until #27 merges. Source SDK unaffected; needed so CI can find `regtest/regtest.mjs`.
- `1e355445` boltz-swap e2e: pass bitcoin RPC creds to bitcoin-cli — the new arkade-regtest base ships Bitcoin Core as the btcpay image, which authenticates via `rpcuser`/`rpcpassword` (not the cookie nigiri's bitcoind exposed). The credential-less `docker exec bitcoin bitcoin-cli -regtest ...` invocation in `arkade-swaps.test.ts` failed with `Could not locate RPC credentials`. Add `-rpcuser=admin1 -rpcpassword=123` (the compose values).
- `d4d5b6bd` Bump arkd to v0.9.6 (align with arkade-regtest base) — every `.env.regtest` (root, ts-sdk, boltz-swap) bumped the `ARKD_IMAGE` override `v0.9.4`/`v0.9.5` → `v0.9.6` because the earlier versions failed against the new Bitcoin Core 31 base; v0.9.6 is the version green in arkade-regtest's own CI.
- `beaf5fcb` Drop arkd image override; inherit arkade-regtest default — pinning a specific arkd version drifted from the regtest's blessed default. Drop the `ARKD_IMAGE` override entirely from all three `.env.regtest`s and inherit the submodule's current default (still `v0.9.6` + nbxplorer 2.6.7 at this point). Functional overrides (ports etc.) kept.
- `fd075a06` Bump regtest submodule to hardened base (startup + deep-flow) — submodule fast-forward picking up arkade-regtest's base hardening: nbxplorer healthcheck + arkd-wallet ordering, bitcoind whitelist/forcerelay, `round.min-participants=1`. Fixes the arkd startup race + relay path the e2e suite needs.
- `da0698fc` fix(ci): expose regtest submodule inside package dir for e2e path resolution — package e2e suites under `pnpm -C` `cwd` into `packages/<pkg>` and invoke `node regtest/regtest.mjs ...` relative to that, but the submodule lives at the repo root, so the path failed to resolve (`Cannot find module`). The regtest controller now symlinks `regtest/` into the package dir on each run; the link is git-ignored.
- `3b8f864f` address review nits — three small post-review fixes for the migration. (a) `ci.yml`: integration checkout uses `persist-credentials: false` (don't keep the GitHub token on the runner past the checkout step). (b) `examples/node/multiple-wallets.ts`: `execSync` (shell) → `execFileSync` (no shell) for the regtest CLI invocations — defensive, avoids any shell quoting surprises around addresses. (c) `arkade-swaps.test.ts`: corrects an outdated chain-swap fee-bound comment to match the code (no behaviour change).

*Esplora robustness against the mempool-spec regtest backend:*
- `abd86ec3` fix(onchain): use standard Esplora /blocks for chain tip; fee-aware swap assertion — `EsploraProvider.getChainTip()` was fetching `/blocks/tip`, which electrs aliases to `/blocks` but mempool (spec-correct) returns `[]` for, surfacing as `No chain tip found` and cascading into the unroll / settle / sweep / delegate / vhtlc e2e suites. Switch to the standard `/blocks` route, which returns the same newest-first array of recent blocks across every Esplora backend. Same commit also reworks the boltz-swap "exact amount to btc address" assertion to be **fee-aware**: `boltz/boltz:latest` doesn't gross the 1 sat/vB claim fee into the receiver lock-up the way nigiri's pinned Boltz did, so the test now asserts a fee-aware bound rather than an exact sat value.
- `5f9a6845` fix(onchain): degrade gracefully when /fee-estimates is unavailable — `EsploraProvider.getFeeRate()` was throwing on a non-OK `/fee-estimates` response, but mempool returns 404 for that route on regtest (it exposes fees via `/api/v1/fees/recommended` instead). The throw broke the unroll / unilateral vHTLC claim / boarding-sweep paths even though every `getFeeRate` caller already falls back to `MIN_FEE_RATE` on `undefined`. Return `undefined` on 404 so those fallbacks engage; 5xx failures still surface.

*BIP21 amount validation (cross-SDK alignment with NArk):*
- `6e794847` fix bip21 amount validation — initial round of fixes. `BIP21.parse()` validates the raw query-string `amount` value with `/^-?(\d+(\.\d*)?|\.\d+)$/` and adds a `Number.isSafeInteger(Math.trunc(amount))` check so amounts above `Number.MAX_SAFE_INTEGER` (which would silently lose precision through `Number(...)`) round-trip as "amount omitted" instead of as a truncated value. Test coverage (`test/bip21.test.ts`) added.
- `25789184` align bip21 amount validation across create and parse — applies the same safe-integer check in `BIP21.create()` (rejects `!isFinite(amount) || !Number.isSafeInteger(Math.trunc(amount))`); drops the unreachable negative check in `parse()` (the regex doesn't match a leading minus, so the post-check was dead code). `create()` retains its explicit negative check because callers can still pass a negative `number`.
- `13754e34` accept bip21 amounts with omitted digits around decimal — BIP21 ABNF (`amount = *digit [ "." *digit ]`) allows digits to be optional on either side of the decimal point: `".5"` and `"5."` are both legal. Tighten the parse regex to `/^(?:\d+\.?\d*|\.\d+)$/` (drops the optional leading `-` — the negative check was unreachable anyway). Matches the `NArk` reference parser. Two new test cases (`.5` → `0.5`, `5.` → `5`).

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Three new Key Concepts at the end of the list: "Regtest Migration off Nigiri" (Node CLI driver, `/api` Esplora suffix, `BITCOIN_LOW_FEE` removed, arkd image override dropped, btcpay-image bitcoin-cli credentials, CI dropped Go/nigiri, repo-root submodule symlinked into package dirs), "Esplora Mempool-Compat Fixes" (`/blocks/tip` → `/blocks` for chain tip; `getFeeRate` returns `undefined` on 404; boltz-swap assertion fee-aware), "BIP21 Amount Validation" (`create`/`parse` aligned on `Number.isSafeInteger(Math.trunc(...))`; ABNF-accurate parse regex accepts `.5`/`5.`; defensive `execFileSync` and `arkd` container-name fixes).
- `docs/projects/ts-sdk/system/project_overview.md` — Integration Points list rewritten: "Nigiri" entry replaced with "arkade-regtest (submodule at `regtest/`)" describing the in-house stack and the Node CLI subcommands; "Esplora" entry extended with the `regtest` URL change and the `getChainTip` / `getFeeRate` mempool-compat fixes. New Core-Features row "BIP21 Amount Validation" covering the symmetric safe-integer check and the ABNF parse regex.
- `docs/projects/ts-sdk/system/architecture.md` — `providers/onchain.ts` annotation extended with the `ESPLORA_URL.regtest` URL change, the `/blocks/tip` → `/blocks` switch (`abd86ec3`), and the `/fee-estimates` 404 fallback (`5f9a6845`). New `utils/bip21.ts` module-tree entry documenting the cross-direction amount validation and the new test coverage. Stale `package.json` version annotations in the repo-layout block updated `0.4.27` → `0.4.33` and `0.3.32` → `0.3.38`.
- `docs/projects/ts-sdk/testing/how_to_run.md` — Prereqs drop the nigiri install line; add Git submodules + Docker Compose v2. "Run Regtest Environment" rewritten around `scripts/regtest.sh` / `node regtest/regtest.mjs` with the per-package CI symlink note (`da0698fc`); compose stack section updated to list `bitcoind` (btcpay image, credentialed `bitcoin-cli` flags) and `mempool_web` (`http://localhost:3000/api`) instead of the prior `arkd-wallet`+`nbxplorer`+`pgnbxplorer`-only list; new "Faucet, mining, and ad-hoc ops" section showing the Node CLI subcommands. "Environment" addresses updated (`localhost:3000` → `localhost:3000/api`, `delegator` → `delegate`).
- `docs/projects/ts-sdk/testing/troubleshooting.md` — "Integration Test Issues" section reworked: "Nigiri Not Starting" → "Regtest Stack Not Starting" (`node regtest/regtest.mjs start` / `clean`); "Docker Compose Network Error" → "Cannot find module `regtest/regtest.mjs`" + manual symlink workaround for local runs; "Tests Timeout" mining/faucet examples switched to the Node CLI; two new entries "EsploraProvider.getFeeRate Throws on Regtest" and "EsploraProvider.getChainTip Returns 'No chain tip found'" documenting the mempool-compat fixes and the `/api` suffix; new "`bitcoin-cli` 'Could not locate RPC credentials'" entry pointing at the credential flags.
- `docs/projects/ts-sdk/sop/development-workflow.md` — Prereq 4 rewritten: drop the nigiri install line, add Git-submodules-`recursive` and the explicit migration reference (`7e34960a` on 2026-06-01) so contributors know why a fresh clone needs `--recurse-submodules`.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain three new bullets (Regtest migration, Esplora mempool-compat fixes, BIP21 amount validation). Tags extended with `regtest-node-cli`, `arkade-regtest`, `mempool-esplora`, `esplora-api-suffix`, `mempool-compat-blocks`, `mempool-compat-fee-estimates`, `bip21-validation`, `bip21-safe-integer`, `bip21-abnf-amount`. Triggers updated: `test_or_run` drops `nigiri` and adds `arkade-regtest`, `regtest.mjs`, `node regtest start`, `regtest faucet`, `regtest mine`; `debug` adds `no chain tip found`, `getFeeRate throws 404`, `regtest /api`, `bitcoin-cli could not locate rpc credentials`, `cannot find module regtest.mjs`, `chopsticks endpoint 404`, `bip21 amount unsafe`, `bip21 .5 parse`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` stays at `0.4.33`, `packages/boltz-swap/package.json` stays at `0.3.38`. The regtest tooling change does not affect the published `@arkade-os/sdk` package surface at all — it's a tests/CI/`.env.regtest`/examples cut. The `ESPLORA_URL.regtest` default value does change, but only consumers that explicitly target `regtest` are affected, and the change is to a `localhost`-only URL (no public-network impact).
- **Public TypeScript API impact is limited to BIP21 validation**: `BIP21.parse()` now silently omits the `amount` param for values that previously decoded but were unsafe (above `Number.MAX_SAFE_INTEGER`) — callers that relied on the truncated decoded value would see `undefined` instead. `BIP21.create()` now omits the `amount` query param for values that previously emitted as an out-of-range integer string. Both behaviours are corrections; treating them as breaking would require finding a real-world dependency on the prior (incorrect) decoded/encoded value, which is implausible for amounts above `MAX_SAFE_INTEGER`.
- **`EsploraProvider` changes are pure compat tightening**: `getChainTip` returns the same shape (newest-first array's first entry), just from a more widely supported route. `getFeeRate` was already documented to return `Promise<number | undefined>` and every caller already handled `undefined` — the prior throw on 404 was the bug, not the contract.
- **CI cache invalidation**: the prior CI cached `~/.cache/getnigiri`. Old branches/PRs whose first push lands after this merge will skip that cache restore (the step is gone) — no manual cleanup required.
- **Submodule pointer is at the unmerged `denigiri-regtest` branch by design**: `0a876506` explicitly pins the submodule at `ArkLabsHQ/arkade-regtest#27`'s commit `20c0851` so CI can find `regtest.mjs`; once #27 merges into arkade-regtest `master`, the submodule should be re-pointed to master in a follow-up. Tracked in the commit message.

---

## 2026-06-06 - Boarding HD rotation, discovery, and multi-address handling + first-wins script collision
**From**: `68b2019a13576b529722af001b3d4ba89e8d9794`
**To**: `ae6ac6ff82c2a3f168b4a6e3d806219fcd2733c0`
**Synced By**: update-project skill
**Status**: Source-only cut — no release. `@arkade-os/sdk` stays at `0.4.33`, `@arkade-os/boltz-swap` at `0.3.38`. Headline change is **boarding HD rotation, on-chain discovery, and multi-address handling**: the on-chain boarding side now interleaves with the wallet's single HD index stream (mirroring the dotnet `NArk` reference implementation's `GetNextContract(NextContractPurpose.Boarding)`), so a settle that consumes a boarding UTXO rotates to a fresh on-chain boarding address, restore rediscovers used boarding indices from the on-chain UTXO set, and fund-discovery / spending / sweep / history / notifications fan out over the full set of current + historical boarding addresses with descriptor-aware signing for rotated boarding UTXOs. The supporting same-script collision model is consolidated: the wallet-layer "default wins + promote" rule from the prior cut is replaced by a single **first-wins coalescence rule in `ContractManager.upsertContract`**, with the restore scan probing `boarding` before `default`/`delegate` so the iteration order is the tie-break.

**Commits analyzed** (10 non-merge commits):

*Boarding HD rotation, discovery, multi-address handling:*
- `cbb000b1` add boarding HD rotation, discovery, and multi-address handling — the bundle commit. (1) **Boarding `Discoverable.discoverAt`** (`src/contracts/handlers/boarding.ts`) probes the on-chain UTXO set at the per-index P2TR address via `OnchainProvider.getCoins` (boarding's source of truth is the on-chain coin set, not the Ark indexer — a boarded boarding output becomes an L2 VTXO so the indexer probe already keeps the gap window open for it; only an *unspent* boarding output needs the on-chain probe). No-ops when `deps.boardingTimelock` / `deps.onchainNetwork` is absent (scanner unit harness compatibility). Hits at index 0 emit untagged; hits at index > 0 emit tagged with `metadata.source = WALLET_RECEIVE_SOURCE` + `metadata.signingDescriptor` so descriptor-aware signing can recover the per-index key on a restored boarding UTXO. The persisted row's `address` is the *Ark* address (not the on-chain P2TR), matching the row registered at init so `ContractWatcher` keeps monitoring the same L2 script. (2) **Per-derivation boarding allocator** — new `Wallet.getNewBoardingAddress()` allocates the next index from the shared HD stream, builds the boarding tapscript at that index with the boarding-exit CSV, persists an `active` `boarding` contract tagged `WALLET_RECEIVE_SOURCE` (persist BEFORE swapping the visible tapscript so a registration failure never leaves an unwatched address), and swaps the wallet's current `boardingTapscript` via the new `Wallet.setBoardingTapscriptForRotation` sole-writer (analogue of `_offchainTapscript`'s `setOffchainTapscriptForRotation`). Static / `auto` wallets (no descriptor provider) no-op and return the existing `getBoardingAddress()` — a single fixed index-0 boarding address for their lifetime. (3) **Purpose-aware receive boot** (`src/wallet/walletReceiveRotator.ts`) — `ReceiveRotatorBootOpts.baselineReceivePubKey` added; `WalletReceiveRotator.defaultBoot`'s no-tagged-row fallback now derives the receive pubkey from the *baseline* index-0 key rather than from the raw HD watermark, because boarding shares the single HD index stream so a boarding-only allocation may have advanced the raw watermark past index 0 (would drift the L2 receive address onto a boarding index, plan §6-II.5). A wallet with no tagged receive row has never rotated L2, so its correct current receive *is* the baseline. New `resolveBoardingBootTapscript(contractRepository, serverPubKey, baseline)` helper in `src/wallet/wallet.ts` is the boarding analogue of the L2 boot resolver: scans `active` `boarding` contracts tagged `WALLET_RECEIVE_SOURCE`, picks the newest by `createdAt` (ties broken by parsed HD index from `metadata.signingDescriptor` via new `signingDescriptorIndex` parser), rebuilds the boarding tapscript at that pubkey reusing the baseline's CSV. (4) **Multi-address boarding spend/settle/sweep with descriptor-aware boarding signing** — `extendCoinWithTapscript(boardingTapscript, utxo)` extracted from `extendCoin` (`src/wallet/utils.ts`) so each boarding UTXO is annotated with the tapscript of *its* address (not the wallet's current `boardingTapscript`); under per-derivation rotation a wallet can hold unspent boarding UTXOs at several historical addresses at once. New `Wallet.getBoardingTapscripts()` returns the set: index-0 baseline (identity x-only key — always in scope, covers the degenerate equal-delay case where the index-0 boarding row is coalesced onto `default` and so isn't a `boarding`-typed contract) + current display + every persisted `boarding` row matching the wallet's `serverPubKey`, deduplicated by scriptPubKey. New `Wallet.getBoardingAddresses()` maps to on-chain addresses. `Wallet.getBoardingUtxos()` now fans out: per-tapscript `getCoins`, per-address `saveUtxos` keyed by the address the UTXOs actually sit on. `Wallet.updateDbAfterSettle`'s boarding-removal step now groups by the source address recovered from each input's `tapTree` (decoded via `VtxoScript.decode(input.tapTree).onchainAddress(...)`) so a settled UTXO that lived at a *rotated-away* boarding address is cleaned up in its own bucket — falls back to the current boarding address only if the tapTree can't be decoded (defensive). `InputSignerRouter.DESCRIPTOR_CAPABLE_CONTRACT_TYPES` extended `{default, delegate}` → `{default, delegate, boarding}` so a rotated boarding UTXO's input routes to `DescriptorProvider.signWithDescriptor` using its per-index `metadata.signingDescriptor` — the `pubKey === baseline` early-out keeps index-0 / static boarding on the identity path so the no-rotation case is byte-for-byte unchanged. `MissingSigningDescriptorError.contractType` widened to `"default" | "delegate" | "boarding"`. New `Wallet.signOnchainBoardingTx(tx)` routes each input by its `witnessUtxo.script` for on-chain boarding exit/sweep transactions. `VtxoManager.sweepExpiredBoardingUtxos` now resolves the exit (CSV) leaf and output script per-UTXO from the carried `tapTree` (representative leaf still used for fee estimation only — every boarding exit leaf shares the Alice+CSV template so size is identical regardless of index), and signs via `getSweepWallet().signOnchainBoardingTx(tx)` instead of `wallet.identity.sign(tx)`. `SweepCapableWallet` extends with `signOnchainBoardingTx` and `assertSweepCapable` checks for it. (5) **Multi-address boarding history + notifications** — `Wallet.getBoardingTxs()` loops `getBoardingTapscripts()` so historical addresses are surfaced (`scriptHex` is per-tapscript; plan §6-IV.1). `Wallet.notifyIncomingFunds` onchain watcher tracks the full boarding-address set and **automatically re-subscribes on boarding rotation** via the new `onBoardingRotation` listener mechanism: `setBoardingTapscriptForRotation` fires `notifyBoardingRotation`, which (re)runs a serialized `subscribeOnchain()` chain that re-reads `getBoardingAddresses()`, brings the NEW `watchAddresses` watcher up via subscribe-then-swap (`previousStop` retired only AFTER the new watcher is live — no blind window where neither is live, and a `watchAddresses` failure degrades to the stale set rather than to no watcher), and maps per-matching-vout (a single tx can pay multiple of our boarding addresses now that boarding fans out, so don't only report the first match per tx). `stopFunc` flags `stopped = true` first so any in-flight (re)subscribe tears its fresh watcher down instead of leaking it. (6) **DiscoveryDeps** (`src/contracts/types.ts`) extended with optional `onchainNetwork?: Network` (full Bitcoin network descriptor for the boarding P2TR rendering — the L2-only `{ hrp }` shape lacks the `bech32` data `VtxoScript.onchainAddress` needs) and optional `boardingTimelock?: RelativeTimelock` (boarding-exit CSV, distinct from the unilateral-exit `csvTimelocks` matrix; boarding scripts source their CSV from the server's boarding-exit delay). Both are absent in the scanner unit harness, in which case boarding `discoverAt` no-ops. `Wallet.getDiscoveryDeps` now passes both. (7) Service-worker `wallet-message-handler.ts`: `notifyIncomingFunds` utxo handler re-fetches via `readonlyWallet.getBoardingUtxos()` (the notified `coins` carry no address, so re-fetch + re-cache the full boarding-address set with the correct per-UTXO tapscript instead of assuming the current boarding address); `getTransactionHistory`'s boarding-cache cleanup is rewritten per-address, **fetch-first**: get the fresh set via `getBoardingUtxos()`, then for each cached address filter the cache against `freshKeys` and only `delete + re-save` when the cache differs — a transient onchain failure throws before touching the cache so the previous snapshot survives (offline-first); the previous shape unconditionally deleted then re-saved a single address bucket, racing the cache against a transient failure.

*First-wins same-script collision (consolidating the prior cut's wallet-layer rule):*
- `69b4cf4c` tolerate default/boarding script collision first-wins — moves the equal-delay same-script coalescence from the wallet layer into the persistence layer. New exported helper `areCoalescibleContractTypes(a, b)` in `src/contracts/contractManager.ts` (`true` only for the `default ↔ boarding` pairing — the only two types that share the `DefaultVtxo.Script` shape and can coincide under equal CSV; every other distinct pairing — e.g. `default ↔ vhtlc`, or a `delegate` script which carries an extra leaf — is rejected). A pure *type-pair* rule with no notion of HD index or "baseline": `upsertContract` sees only the two type strings, so a `default ↔ boarding` collision coalesces at ANY index — including rotated ones, exactly what equal-delay restore needs. `ContractManager.createContract` (the path also referred to as `upsertContract` for the new behaviour) resolves the clash FIRST-WINS — keeps the existing row exactly as-is (no overwrite, no type promotion, no throw) and reports `persisted: false`. Mirrors NArk's script-keyed dedup (one row per script) and is the single source of truth for the collision: covers both `createContract` (init) and `persistAndWatchContract` (the restore scan), so init and restore share a single rule. Because it never mutates the row, it also preserves the watcher invariant: the winning row was registered with the watcher when first persisted, so event callbacks always see the authoritative type — no promote-then-forget-the-watcher gap. `scanContracts` now probes `boarding` BEFORE `default`/`delegate` via a stable partition (`[...registered.filter(boarding), ...registered.filter(non-boarding)]`) — this iteration order is **load-bearing**, not cosmetic: a rotated index can carry BOTH an on-chain boarding UTXO and an L2 VTXO at the same byte-identical script in the equal-delay case, and probing boarding first resolves it to a `boarding` row (keeping the on-chain UTXO visible to the type-gated `getBoardingUtxos` while the VTXO stays visible via the type-agnostic `getVtxos`); resolving to `default` would hide the on-chain boarding UTXO (the original Finding #1 bug). A unit test pins the ordering. `BoardingContractHandler.discoverAt` **always** emits `type: "boarding"` — the collision is no longer pre-judged at discovery, only at persistence. Wallet-layer `ensureWalletContract` collapses from a "default wins + promote" implementation to a thin pass-through over `manager.createContract` (one line), and the old `areSameScriptBaselineTypesCompatible` helper from the prior cut is removed. `ReadonlyWallet.setupWalletConfig` baseline boarding registration is rebuilt **anchored to the identity's x-only pubkey (`baselinePubkey`) rather than to `this.boardingTapscript`** (which is a *current value* that rotation may have advanced to a higher index — the baseline boarding row must stay anchored at index 0, like the default/delegate matrix); the boarding-exit CSV is index-independent, so it's still sourced from the current `boardingTapscript.options`. Note: the prior commit's "requested `default` + existing `boarding` → promote to `default`" behaviour is intentionally NOT preserved — the default matrix is now always persisted *before* the boarding baseline in `setupWalletConfig`, so at index 0 the `default` row wins under the first-wins rule, achieving the same end state without a separate promote step.

*Boarding boot (restore the rotated boarding address on restart):*
- `58adeb89` rotate boarding address on board — new `Wallet.maybeRotateBoardingAfterBoard(inputs)` is invoked after a successful `settle` finalization that consumed any boarding input (the same `!("virtualStatus" in input)` discriminator `handleSettlementFinalizationEvent` uses, with a `typeof === "string"` guard to skip arknote string inputs). When boarding inputs were consumed, allocates a fresh boarding address via `getNewBoardingAddress()`. Best-effort and non-fatal: the settle has already committed and its txid must be returned, so a rotation failure is logged and swallowed. Funds at the retired boarding address remain discoverable — the old `boarding` contract stays active and `getBoardingUtxos` fans out over the full historical set. Static / `auto` wallets no-op (no descriptor provider). `Wallet.create` boot path now restores the rotated boarding address via `resolveBoardingBootTapscript` after the receive rotator boot when a `boot?.provider` resolved, and swaps the wallet's current boarding tapscript via `setBoardingTapscriptForRotation` if a tagged boarding row was found.

*Defensive filtering:*
- `12e6657b` filter boarding tapscripts by server pubkey — `Wallet.getBoardingTapscripts()` now skips persisted `boarding` rows whose `params.serverPubKey` doesn't match this wallet's server, mirroring the filter in `resolveBoardingBootTapscript`. Without it a row left by a previous ASP (e.g. a repo recovered against a different server) would emit a spurious onchain script and a wasted `getCoins` / `getTransactions` call on every boarding read. Malformed rows are warn-logged and skipped (`try` around `BoardingContractHandler.createScript`) rather than aborting fund discovery, so repo corruption is detectable. JSDoc on `notifyIncomingFunds` documents that the watcher captures the boarding-address set at call time.

*Test coverage (no source impact):*
- `96c8d50b` test boarding server-pubkey filter and malformed-row handling — regressions for `getBoardingTapscripts` (`test/walletBoardingRotation.test.ts`).
- `4375a1f7` add boarding rotation e2e: multi-address sweep and restore — regtest coverage for the chain-dependent paths (per-index-key sweep across current + rotated boarding addresses, and restore() rediscovery of boarding funds at a rotated index; `test/e2e/boardingRotation.test.ts`).

*Bug fixes:*
- `5e7d0f15` fix boarding sweep exit-leaf match (truthy Error) — `VtxoManager.sweepExpiredBoardingUtxos` now compares `CSVMultisigTapscript.isScriptValid(...) === true` (per-namespace helpers can return `true | Error`; the prior truthy check would route a non-CSV leaf into the sweep loop). Same pattern as the `VtxoScript.exitPaths` fix from earlier.
- `e542101` fetch boarding utxos before pruning stale buckets — `wallet-message-handler.ts` `getTransactionHistory` rewritten to fetch via `getBoardingUtxos()` first, then prune the cache per address against the fresh result; previously could prune the cache after a transient onchain failure, losing the previous snapshot.

*Tooling / docs:*
- `eff37ba4` Upgrade regtest submodule to latest master — submodule pointer bump (no SDK source impact).
- `62868fa0` Add NArk as reference implementation — `AGENTS.md` records that the .NET Ark SDK (`NArk`, ArkLabsHQ, conventionally checked out at `../dotnet-sdk`) is the reference implementation for this TypeScript SDK, for both feature parity and technical direction. Context: the SDK began as a fairly literal port of the Go SDK and carries Go idioms / structural choices that don't fit TypeScript well; those should be treated as legacy, with NArk's structure and naming preferred when in conflict. Pure documentation — no behaviour change.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — New Key Concept "Boarding HD Rotation, Discovery, and Multi-Address Handling (post-0.4.33)" covering the per-derivation allocator, `getNewBoardingAddress`, rotate-on-board trigger, `getBoardingTapscripts` / `getBoardingAddresses` set semantics, descriptor-aware boarding signing, per-UTXO sweep, multi-address history/notifications, subscribe-then-swap watcher widening, baseline-anchored boarding boot, server-pubkey filter, and the discovery extensions (`onchainNetwork`, `boardingTimelock`, `BoardingContractHandler.discoverAt`). Existing "Boarding Contract Type" entry's collision-model paragraph rewritten to reflect the first-wins move into `ContractManager.upsertContract` (`areCoalescibleContractTypes` replaces `areSameScriptBaselineTypesCompatible`; `ensureWalletContract` is now a thin pass-through; scan probes boarding first; "default wins" is now achieved structurally by registering the default matrix before the boarding baseline in `setupWalletConfig`).
- `docs/projects/ts-sdk/system/project_overview.md` — "Boarding Contract Handler" Core-Features row updated to document the new `Discoverable.discoverAt` (on-chain UTXO probe, no-op without `onchainNetwork`/`boardingTimelock`, always emits `type: "boarding"`, index-0 untagged / index>0 tagged with `WALLET_RECEIVE_SOURCE` + `signingDescriptor`) and the consolidated first-wins collision model. New "Boarding HD Rotation" Core-Features row covering the per-derivation allocator, rotate-on-board, multi-address fan-out, baseline-anchored boot, and descriptor-aware sweep signing. Per-Input Signing Router row notes `boarding` is now a descriptor-capable contract type.
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/wallet.ts` annotation extended with `_boardingTapscript` backing field + getter + sole-writer (`setBoardingTapscriptForRotation`), `onBoardingRotation` / `notifyBoardingRotation` listener mechanism, `getNewBoardingAddress`, `maybeRotateBoardingAfterBoard`, `signOnchainBoardingTx`, `getBoardingTapscripts` / `getBoardingAddresses`, multi-address `getBoardingTxs` / `getBoardingUtxos` / `updateDbAfterSettle`, `notifyIncomingFunds` subscribe-then-swap onchain watcher, `Wallet.create` boarding-boot resolve, `getDiscoveryDeps` now passes `onchainNetwork` + `boardingTimelock`, `setupWalletConfig` baseline boarding anchored to `baselinePubkey`, and `ensureWalletContract` is now a one-line thin pass-through (`areSameScriptBaselineTypesCompatible` removed). New `resolveBoardingBootTapscript` helper entry. `wallet/walletReceiveRotator.ts` annotation extended with `ReceiveRotatorBootOpts.baselineReceivePubKey` and the no-tagged-row fallback using the baseline pubkey instead of the raw watermark; new exported `signingDescriptorIndex(descriptor)` parser. `wallet/utils.ts` annotation extended with `extendCoinWithTapscript(boardingTapscript, utxo)` (per-UTXO boarding tapscript annotation; `extendCoin` is now a thin shim). `wallet/inputSignerRouter.ts` annotation extended with `boarding` in `DESCRIPTOR_CAPABLE_CONTRACT_TYPES`. `wallet/signingErrors.ts` annotation extended with `boarding` in `MissingSigningDescriptorError.contractType`. `wallet/vtxo-manager.ts` annotation extended with `SweepCapableWallet.signOnchainBoardingTx`, per-UTXO exit-leaf resolution in `sweepExpiredBoardingUtxos` (via `VtxoScript.decode(utxo.tapTree)`), CSV leaf truthy-Error fix (`=== true`), representative leaf only used for fee estimation, and descriptor-aware sweep signing routing. `contracts/handlers/boarding.ts` annotation extended with the now-implemented `Discoverable.discoverAt` (always emits `type: "boarding"`, on-chain `getCoins` probe, no-op when `onchainNetwork`/`boardingTimelock` absent, index-0 untagged / index>0 tagged) and `isDiscoverable(BoardingContractHandler) === true`. `contracts/contractManager.ts` annotation extended with `areCoalescibleContractTypes` export, first-wins `createContract` rule (degenerate equal-delay collision → keep existing row, no overwrite, no promote), and the load-bearing boarding-first iteration order in `scanContracts`. `contracts/types.ts` annotation extended with `DiscoveryDeps.onchainNetwork` and `DiscoveryDeps.boardingTimelock`. `wallet/serviceWorker/wallet-message-handler.ts` annotation extended with the rewritten `notifyIncomingFunds` utxo path (refetch via `getBoardingUtxos`) and the fetch-first per-address `getTransactionHistory` boarding-cache cleanup.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain three new bullets: "Boarding HD rotation, discovery, and multi-address handling" (full feature paragraph), "First-wins same-script collision in ContractManager" (consolidation of the prior `ensureWalletContract` rule into the persistence layer), and "NArk reference implementation" (AGENTS.md guidance). The existing Boarding contract type bullet is updated in place to drop the wallet-layer `areSameScriptBaselineTypesCompatible` reference (replaced by `areCoalescibleContractTypes`) and to note that `BoardingContractHandler` now implements `Discoverable.discoverAt` (previously deliberately did not). Tags extended with `boarding-hd-rotation`, `boarding-discoverable`, `boarding-multi-address`, `subscribe-then-swap`, `descriptor-aware-boarding-signing`, `rotate-on-board`, `coalescible-contract-types`, `first-wins-collision`, `nark-reference-impl`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` stays at `0.4.33`, `packages/boltz-swap/package.json` stays at `0.3.38`. The next published release will carry this batch.
- **No wallet API breakage for typical consumers**: `Wallet.create` / `ReadonlyWallet.create` / `ExpoWallet.setup` shapes are unchanged. `boardingTapscript` is now a *getter* over a protected backing field (was a `readonly` constructor-assigned field) — for the vast majority of consumers reading it as a property this is transparent; only consumers reflecting on the property descriptor would notice. `getBoardingAddress()` (single-valued, current display address) is unchanged.
- **New API additions**: `Wallet.getNewBoardingAddress()` (explicit boarding allocator), `Wallet.getBoardingAddresses()` (current + historical set), `Wallet.signOnchainBoardingTx(tx)`, and `Wallet.setBoardingTapscriptForRotation(tapscript)` (`@internal` — sole write path). `getBoardingTapscripts()` is `protected`. The new `DiscoveryDeps.onchainNetwork` and `DiscoveryDeps.boardingTimelock` are optional, so any external custom `Discoverable` handlers continue to work — they're consulted only by the boarding probe.
- **Same-script collision rule consolidation**: the prior cut's wallet-layer `areSameScriptBaselineTypesCompatible` + `ensureWalletContract` coalesce-and-promote rule is removed. The new behaviour is structurally equivalent for the index-0 baseline case (`default` is persisted before `boarding` in `setupWalletConfig`, so first-wins keeps it `default`) and *more* permissive for rotated indices, where the equal-delay collision can now arise from a `boarding`-typed discovery hit but is tolerated in place rather than throwing. **Removed `@internal` export** for callers who consumed `areSameScriptBaselineTypesCompatible` via internal-test-only imports (none on the public surface).
- **Subscribe-then-swap is load-bearing**: the prior single-address `notifyIncomingFunds` would have lost any deposit landing during the brief window between tearing down a watcher on the old set and bringing one up on the new set (the new watcher's initial reconciliation would have seeded those tx ids as "already known"). The new chain brings the wider watcher up FIRST, only retiring the previous one once the new one is live; failure leaves the previous watcher running on the stale set rather than leaving the wallet with no watcher.
- **First-wins ordering in `scanContracts` is load-bearing**: probing `boarding` before `default`/`delegate` is the tie-break for the equal-delay collision; a future reorder must not regress this. Pinned by a unit test.
- **Boarding boot anchors to the baseline pubkey via two mechanisms**: (a) `WalletReceiveRotator.defaultBoot`'s no-tagged-row fallback uses the explicit `baselineReceivePubKey` rather than re-derive from the shared HD watermark — protects the L2 receive from being dragged onto a boarding index; (b) `setupWalletConfig`'s baseline `boarding` contract row is anchored to `baselinePubkey` (was `this.boardingTapscript.options.pubKey`, which may have rotated). Both stay correct under the rotated case where the wallet's current `boardingTapscript` has advanced past index 0.
- **NArk as reference implementation**: AGENTS.md now records the architectural direction explicitly. When designing new features or resolving ambiguities, the .NET `NArk` SDK is the canonical source of design intent; the TypeScript SDK's port-from-Go origins should be treated as legacy patterns to be improved, not as precedent to extend.

---

## 2026-06-05 - Handler authoring helpers exported + 0.4.33 / 0.3.38 release
**From**: `4f5ce81a5ab53e455e10512b728f33c322388c24`
**To**: `68b2019a13576b529722af001b3d4ba89e8d9794`
**Synced By**: update-project skill
**Status**: Release cut. `@arkade-os/sdk` bumps `0.4.32 → 0.4.33` and `@arkade-os/boltz-swap` bumps `0.3.37 → 0.3.38`. The only source change in this range is the package-root export of two pre-existing helper functions from `src/contracts/handlers/helpers.ts` — `isCsvSpendable` and `isCltvSatisfied` — so authors of custom `ContractHandler` implementations can reuse the canonical BIP-68 / BIP-65 timelock-maturity logic that the built-in handlers (`DefaultContractHandler` / `DelegateContractHandler` / `VHTLCContractHandler`) already use to implement `selectPath` / `getSpendablePaths`. Pure additions — no function signatures change elsewhere; no breaking impact for existing consumers.

**Commits analyzed** (2 non-merge commits):

*Custom-handler authoring surface:*
- `44cdff0a` feat(contracts): export handler authoring helpers — `src/index.ts` adds a named import from `./contracts/handlers/helpers` for `isCsvSpendable` and `isCltvSatisfied` and re-exports both under a new comment block "Contract handler authoring helpers (spending-path selection)". The two functions already existed and were already used internally by the built-in contract handlers; this commit simply makes them part of the public package surface. `isCsvSpendable(context, sequence?)` returns `true` immediately when `sequence === undefined` (no CSV constraint encoded), otherwise compares against the BIP-68-encoded relative timelock; `isCltvSatisfied(context, locktime)` follows the BIP-65 convention — `locktime < 500_000_000n` interprets the value as a block height and compares against `context.blockHeight` (returns `false` if undefined), `>= 500_000_000n` interprets it as a Unix timestamp in seconds and compares against `Math.floor(context.currentTime / 1000)`. Rationale recorded in the commit body: exporting them "lets authors of custom ContractHandlers implement selectPath/getSpendablePaths consistently instead of reimplementing BIP-68/BIP-65 timelock-maturity logic".

*Release:*
- `68b2019a` chore: release @arkade-os/sdk@0.4.33, @arkade-os/boltz-swap@0.3.38 — Version bumps only. `packages/ts-sdk/package.json` `0.4.32 → 0.4.33`, `packages/boltz-swap/package.json` `0.3.37 → 0.3.38`. No source changes; the boltz-swap bump rides along under the monorepo's package-scoped release driver (mirrored patch when the SDK gets a patch). HEAD of `main` post-release.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Workspace-package table and Quick Reference version updated to `0.4.33` / `0.3.38`. New Key Concept "Contract Handler Authoring Helpers" (0.4.33) appended after the indexer spent-state classification entry — documents the two newly exported helpers, their semantics, and the rationale for the export.
- `docs/projects/ts-sdk/system/project_overview.md` — Monorepo layout table and Package section version updated to `0.4.33` / `0.3.38`. New "Custom ContractHandler Authoring Helpers" row in Core Features documenting `isCsvSpendable` / `isCltvSatisfied` with their BIP-68 / BIP-65 semantics and noting that signatures are unchanged elsewhere.
- `docs/projects/ts-sdk/system/architecture.md` — `src/index.ts` module-tree entry annotated with the 0.4.33 helper re-exports. New entry for `contracts/handlers/helpers.ts` documenting `resolveRole` (descriptor/pubkey-matched sender/receiver resolution, unchanged) alongside the now-public `isCsvSpendable` / `isCltvSatisfied` helpers and the built-in handlers that consume them.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain a new bullet "Custom ContractHandler authoring helpers exported" covering the export and its semantics, noted as released in `0.4.33` / `0.3.38`. Tags extended with `handler-authoring-helpers`, `is-csv-spendable`, `is-cltv-satisfied`.

**Notes**:
- **Public API addition, no removals**: this is the only kind of release that should require no consumer-side change. Existing callers that were already happy with the package-root exports remain happy; the new symbols are opt-in.
- **Why exporting helps**: every `ContractHandler` is expected to implement `selectPath(context, paths)` and `getSpendablePaths(context)` against the same `PathContext` shape (block height + Unix-ms current time, optional descriptor / pubKey, etc.). Before this release, custom-handler authors who wanted to honour CSV / CLTV maturity correctly had to either re-import these from a deep path (no longer a stable contract) or re-derive the BIP-68 / BIP-65 thresholds themselves — the latter is the bug-prone path (especially the `500_000_000n` height/timestamp split for CLTV).
- **boltz-swap version mirroring**: the `0.3.37 → 0.3.38` bump on `@arkade-os/boltz-swap` is a no-source-change side effect of the monorepo's package-scoped release CLI (`pnpm run release -- sdk patch` mirrors the SDK patch into boltz-swap to keep the two in lockstep). The release shipped at the documented HEAD and reflects the prior batch of post-0.4.32 work too — boarding contract type, required `csvTimelock`, and the indexer spent-state classification fix — which were all in source-only state under the prior sync.
- **Helper file unchanged**: `src/contracts/handlers/helpers.ts` itself was not edited in this range; only `src/index.ts` and the two `package.json` files changed (4 insertions / 2 modifications total).

---

## 2026-06-04 - Boarding contract type (registered handler) + required csvTimelock + indexer spent-state fix
**From**: `9682dbebdc41af127d6f067337461eeebde5befe`
**To**: `4f5ce81a5ab53e455e10512b728f33c322388c24`
**Synced By**: update-project skill
**Status**: Source-only cut — no release. `@arkade-os/sdk` stays at `0.4.32`, `@arkade-os/boltz-swap` at `0.3.37`. Three threads land in this range: (1) boarding becomes a first-class registered contract type with its own handler — wallet setup sources `boardingTapscript` from the handler and contract-manager init persists a matching `active` boarding row, with same-script collisions against `default` coalesced via a new `ensureWalletContract` helper ("default wins"); (2) `DefaultVtxo.Script.Options.csvTimelock` (and the `DelegateVtxo` equivalent) is now **required** at the script-construction site — the old silent `DEFAULT_TIMELOCK` fallback in the script constructor / wallet wiring is gone, callers must specify, with the deserializer fallback restored in `DefaultContractHandler` only for legacy persisted params; (3) `convertVtxo` in `RestIndexerProvider` adds `isSpent` as the first check in the `virtualStatus.state` ternary so spent VTXOs are correctly classified as `"spent"` instead of being misreported as `"settled"`.

**Commits analyzed** (11 non-merge commits — a `5e2fbfe7` / `af553007` add+revert pair nets to zero, two `b927d33a` boarding-handler commits are duplicates):

*Boarding contract type:*
- `b927d33a` add boarding contract type — Register a new `boarding` contract handler (`src/contracts/handlers/boarding.ts`) and derive the on-chain boarding address from it. `BoardingContractParams = DefaultContractParams` (reuses the exact `pubKey` / `serverPubKey` / `csvTimelock` shape — boarding semantics come from the contract type and from sourcing `csvTimelock` from the server's `ArkInfo.boardingExitDelay` rather than from renamed params); `BoardingContractHandler` delegates `createScript` / `serializeParams` / `deserializeParams` / `selectPath` / `getAllSpendingPaths` / `getSpendablePaths` entirely to `DefaultContractHandler` (same `DefaultVtxo.Script` shape). Deliberately does **not** implement `Discoverable.discoverAt` (branch/index selection for HD wallets is owned by the wallet/address-provider layer, which hands the handler an already-derived pubkey; `isDiscoverable(BoardingContractHandler)` is `false`). Wallet setup now sources `boardingTapscript` from `BoardingContractHandler.createScript(...)` instead of the prior inline `new DefaultVtxo.Script({ ..., csvTimelock: boardingTimelock })` construction (byte-identical script for equivalent params — the CSV timelock round-trips through the same BIP68 sequence encoding the script bytes already used, so `getBoardingAddress()` and `pkScript` are unchanged). Contract-manager initialization now persists a matching `active` boarding contract (create-if-missing): the boarding script is watched by `ContractWatcher` so any VTXOs that land on it are visible/spendable through the normal contract paths, even though the SDK does not promote the boarding Arkade address as an L2 receive address. `BoardingContractHandler` + `BoardingContractParams` exported from the package root (`src/index.ts`) and registered in `src/contracts/handlers/index.ts` alongside `default` / `delegate` / `vhtlc`.
- `712f0470` handle default/boarding script collisions symmetrically — Route default and boarding baseline registration through a new `ensureWalletContract(manager, params)` helper in `src/wallet/wallet.ts`. Identity & collision model: a contract's `script` (pkScript) is its unique identity — a script owns exactly one repository row. `boarding` keeps its own row when its script is distinct from the wallet's `default` baseline (the real-world case: a sound Ark server keeps `boardingExitDelay` strictly longer than `unilateralExitDelay` — equal delays would expose the provider to a double-spend). Should those delays ever coincide (misconfigured/malicious server), the boarding script is byte-identical to the default script and the wallet must stay usable: `areSameScriptBaselineTypesCompatible(existingType, requestedType)` recognizes `default ↔ boarding` as compatible while rejecting every other cross-type pairing (e.g. `delegate` carries an extra leaf and cannot collide under normal semantics). The default baseline registration goes through `ensureWalletContract({ type: 'default', ... })` instead of strict `createContract` so a same-script collision with an existing `boarding` row accepts it in either direction rather than throwing the descriptive script/type mismatch.
- `2ff2e88d` coalesce shared default/boarding script onto default — Tightens `ensureWalletContract` so a shared script is **promoted to `default`** ("default wins") rather than left as `boarding`. Resolution: no existing row → create; same type → idempotent no-op; requested `default` + existing `boarding` → `manager.updateContract(params.script, { type: 'default' })`; requested `boarding` + existing `default` → accept as-is (the shared script is already canonical); incompatible existing type → fall through to `createContract`, which throws. Rationale: the shared script is also the wallet's live offchain baseline, so typing it `default` keeps it visible to the type-gated consumers (`notifyIncomingFunds`, `getWalletScripts`, `getScriptMap`). `delegate` baseline creation stays strict (its script cannot collide with the others). Helpers `areSameScriptBaselineTypesCompatible` and `ensureWalletContract` exported `@internal` for unit tests; not part of the public API surface.
- `3a56bbd9` include boarding in smoke-dist expected handler types — `scripts/smoke-dist.mjs` `expectedTypes` updated `"default,delegate,vhtlc"` → `"boarding,default,delegate,vhtlc"` so the post-build singleton check matches the new registered handler. Header comment updated likewise.
- `91f2d191` fix boarding contract count in params-change e2e test — `test/e2e/contract-params-change.test.ts` updated to expect the additional boarding row introduced by the boarding handler registration.

*Required csvTimelock at script construction:*
- `1e8b0f0a` feat: require csvTimelock to be specified — `DefaultVtxo.Script.Options.csvTimelock` is no longer optional (`csvTimelock?: RelativeTimelock` → `csvTimelock: RelativeTimelock`), and the `Script.DEFAULT_TIMELOCK` fallback in the constructor's destructuring assignment is removed. Wallet/wiring sites that previously bottomed-out via `?? DefaultVtxo.Script.DEFAULT_TIMELOCK` (`ReadonlyWallet.walletContractTimelocks`, `ExpoWallet.setup` background-config persistence, `WalletReceiveRotator` baseline tagging) now read `options.csvTimelock` directly. Wallet setup gained an explicit `csvTimelock` arg in its handler-driven boarding-tapscript construction (`csvTimelock: timelockToSequence(boardingTimelock).toString()`). The Default JSDoc example now spells out the required `csvTimelock`. `DelegateVtxo.Script` shape changes identically. `DelegateContractHandler.deserializeParams` no longer keeps a `params.csvTimelock` fallback to `DEFAULT_TIMELOCK` (the param is always present in delegate persistence). Tests at `test/contracts/helpers.ts`, `test/contracts/manager.test.ts`, `test/wallet.test.ts` updated to pass explicit timelocks. **Breaking for direct script consumers** — wallet API surface unchanged, but anyone constructing `new DefaultVtxo.Script({...})` / `new DelegateVtxo.Script({...})` directly without a `csvTimelock` will now hit a TypeScript error.
- `6cb82c8d` + `4026a7f2` fix(contracts): restore DEFAULT_TIMELOCK fallback for params without csvTimelock — Duplicate commits with identical content. `DefaultContractHandler.deserializeParams` restores the `DEFAULT_TIMELOCK` fallback when `params.csvTimelock` is absent on the persisted row (legacy/minimal params, e.g. hex pubkeys with no timelock). Now uses an explicit `params.csvTimelock !== undefined && params.csvTimelock !== ""` test rather than the prior truthy short-circuit, since the script-side fallback is gone and feeding `Number(undefined)` to `sequenceToTimelock` silently decoded to a zero timelock. The restoration is intentionally one-sided: the script constructor stays strict (forcing callers to be explicit at construction time), while the deserializer remains permissive so legacy persisted rows still hydrate correctly.

*Indexer spent-state classification:*
- `4fb4e914` fix(indexer): include isSpent check in virtualStatus.state ternary — `convertVtxo` in `src/providers/indexer.ts` was missing the `isSpent` branch: spent VTXOs were falling through to the `isSwept ? "swept" : isPreconfirmed ? "preconfirmed" : "settled"` ternary and being classified as `"settled"` (the only other state the chain reaches). Now: `isSpent ? "spent" : isSwept ? "swept" : isPreconfirmed ? "preconfirmed" : "settled"`. Restores the `"spent"` state for VTXOs that have already been consumed.

*Add/revert pair (net-zero, included for changelog completeness):*
- `5e2fbfe7` fix(wallet): exclude spent VTXOs from pending-tx recovery filters — Added an `excludeSpentVtxos` filter on the pending-tx recovery path in `src/wallet/wallet.ts` + matching plumbing in `wallet/serviceWorker/wallet-message-handler.ts`; landed with ~147 lines of test coverage in `test/wallet.test.ts` and small updates in `test/wallet-message-handler.test.ts`. **Reverted in the next commit** (`af553007`) — investigation evidently surfaced a regression — so the net source change in this range is zero for the wallet recovery filters.
- `af553007` Revert "fix(wallet): exclude spent VTXOs from pending-tx recovery filters" — Reverts `5e2fbfe7` cleanly. Net delta in this range: `wallet.ts` / `wallet-message-handler.ts` / `test/wallet.test.ts` / `test/wallet-message-handler.test.ts` are unchanged versus the prior sync's HEAD.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Added three new Key Concepts: "Boarding Contract Type" (full handler + `BoardingContractParams` + `ensureWalletContract` + "default wins" coalescence + `Discoverable` opt-out semantics), "Required csvTimelock at Script Construction" (script-shape change + restored deserializer fallback rationale), and "Indexer Spent-State Classification" (`convertVtxo` ternary fix). Existing "Boarding" line cross-references the new contract-type entry.
- `docs/projects/ts-sdk/system/project_overview.md` — New "Boarding Contract Handler" row in Core Features covering the boarding-as-registered-type model, the `ensureWalletContract` "default wins" coalescence, and the `Discoverable` opt-out. Existing Boarding/Offboarding row cross-references it. VTXO Operations row gains a paragraph noting `csvTimelock` is required at script construction.
- `docs/projects/ts-sdk/system/architecture.md` — New `contracts/handlers/boarding.ts` entry documenting `BoardingContractHandler` + `BoardingContractParams` + the all-delegate-to-`DefaultContractHandler` shape + the deliberate `Discoverable` opt-out. `wallet/wallet.ts` annotation extended with the `ensureWalletContract` / `areSameScriptBaselineTypesCompatible` helpers, the handler-driven `boardingTapscript` construction, and the contract-manager init persisting a matching `active` boarding row. `script/default.ts` + `script/delegate.ts` entries note `csvTimelock` is now required at construction (DEFAULT_TIMELOCK fallback removed; default-handler deserializer keeps a one-sided fallback for legacy persisted params). `contracts/handlers/default.ts` annotation gains the deserializer-side fallback note. `providers/indexer.ts` annotation gains the `convertVtxo` `isSpent`-first ternary fix.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain three new bullets: "Boarding contract type" (handler + `ensureWalletContract` + collision semantics), "Required csvTimelock at script construction" (breaking for direct script users only — wallet API unchanged), and "Indexer spent-state classification fix". Tags extended with `boarding-handler`, `boarding-contract-type`, `ensure-wallet-contract`, `default-wins-coalescence`, `required-csv-timelock`, `indexer-spent-state`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` still reads `"0.4.32"`, `packages/boltz-swap/package.json` still `"0.3.37"`. The next published release will carry these changes.
- **No public API breakage at the wallet layer**: `Wallet.create` / `ReadonlyWallet.create` / `ExpoWallet.setup` argument shapes are unchanged. `getBoardingAddress()` / `boardingTapscript` return byte-identical results for equivalent params (the handler delegates straight through `DefaultContractHandler`). The newly persisted boarding contract row is created idempotently at every wallet boot (`ensureWalletContract`), so re-running initialization on an existing wallet doesn't double-persist; on a wallet built against the previous SDK that's now upgrading, the next setup() seeds the boarding row.
- **Direct `DefaultVtxo.Script` / `DelegateVtxo.Script` users break**: `csvTimelock` is now required at the constructor's destructuring assignment, so any direct caller still passing only `{ pubKey, serverPubKey }` (plus `delegatePubKey` for delegate) gets a TypeScript error. This is intentional — the silent `DEFAULT_TIMELOCK` fallback masked configuration drift. The wallet itself never relied on the script-side fallback after this change; all wiring sites pass an explicit timelock.
- **Indexer state fix is a correctness fix, not a state-shape change**: `"spent"` was already a valid `VirtualCoinStatus.state`; consumers reading the field already had to handle it. The fix just stops mis-classifying spent VTXOs as `"settled"`.
- **`ensureWalletContract` is a degenerate-case guard**: a sound Ark server keeps `boardingExitDelay` strictly longer than the offchain unilateral-exit delay (equal delays expose the provider to a double-spend), so the same-script collision the helper handles can only arise against a misconfigured/malicious server. The wallet still must stay usable in that case, hence the coalescence rather than a throw. The default-wins rule keeps the type-gated consumers (`notifyIncomingFunds`, `getWalletScripts`, `getScriptMap`) seeing the shared script as `default`.
- **The csvTimelock-and-revert pair adds context**: the spent-VTXO recovery-filter fix (`5e2fbfe7`) was reverted the same day. Whatever regression surfaced is not described in the revert message; the spent-state indexer fix (`4fb4e914`) is the only spent-aware change that survives this range.

---

## 2026-06-02 - Restore BatchSignableIdentity one-popup path (PR #535) + waitForIncomingFunds fix
**From**: `a511cba0c8e59c53ed0f628d811bce32561d43b9`
**To**: `9682dbebdc41af127d6f067337461eeebde5befe`
**Synced By**: update-project skill
**Status**: Source-only cut — no release. Restores the N+1 → 1 wallet-popup path that was silently lost when per-input routing moved into `InputSignerRouter`, plus hardens the supporting plumbing and unflakes a self-send e2e. No `package.json` version bumps in this range (`@arkade-os/sdk` stays at `0.4.32`, `@arkade-os/boltz-swap` at `0.3.37`).

**Commits analyzed** (5 non-merge commits):

*PR #535 — restore one-popup path + the two top review findings, then the perf-pass follow-up:*
- `02ef7fe9` fix(wallet): restore BatchSignableIdentity one-popup path lost in InputSignerRouter refactor — extracts `InputSignerRouter.classify(jobs)` as the single source of truth for routing (returns `InputRoutingPlan { identityIndexes; descriptorGroups }`); `sign()` now consumes it. New predicate `canBatch(jobs)` delegates to `classify` and returns `true` iff every signable input resolves to the baseline key. `Wallet.buildAndSubmitOffchainTx` and the pending-tx recovery loop in `finalizePendingTxs` gain a batch branch: when `isBatchSignable(identity)` AND every signable input across arkTx + N checkpoints resolves to the baseline key, call `identity.signMultiple(requests)` once. Send path stashes user-signed checkpoints, submits unsigned ones to arkd for its `tapScriptSig`, then merges via `combineTapscriptSigs`. Recovery path consumes the `signMultiple` returns directly (server sig already on the checkpoints when they were stashed). HD / mixed-owner sends keep the sequential `_signerRouter.sign` path unchanged. Adds `canBatch` unit tests on `InputSignerRouter` and integration tests asserting `signMultiple` is invoked exactly once with arkTx + N checkpoints when the identity is batch-capable.
- `02b18252` fix(wallet): harden batch checkpoint signing on the recovery/send paths — three guards from the PR #535 review. (1) `BatchSignableIdentity.signMultiple` JSDoc tightened from a single length-clause contract to two: implementations MUST return one signed `Transaction` per request in input order, AND MUST preserve any partial signatures already present on the input PSBTs (only ADD their own — never drop / replace / normalize away foreign sigs). Was a silent assumption; finalizePendingTxs hands `signMultiple` checkpoints already carrying the server's `tapScriptSig`, a provider that drops it strands the tx. (2) Symmetric length guard in `buildAndSubmitOffchainTx` rejects a server response whose `signedCheckpointTxs.length !== userSignedCheckpoints.length` before the per-index merge — a short response would silently drop the tail (incomplete `finalizeTx`), a long one would throw a cryptic undefined access mid-merge. (3) `combineTapscriptSigs` rejects an input-count mismatch and a missing `tapScriptSig` on either side with input-indexed errors (e.g. `combineTapscriptSigs: signedTx input 3 has no tapScriptSig`) instead of silently appending `undefined` and corrupting the witness when `signedTx` was unsigned. Adds tests for the riskiest, previously-untested steps (send-path `combineTapscriptSigs` merge survives both sigs; recovery batch path preserves server sig and adds user sig; checkpoint-count mismatch guard; combineTapscriptSigs invariants) — all proven via mutation testing.
- `d5c17f25` perf(wallet): classify batch eligibility in a single pass — the send and recovery paths were calling `canBatch` once per PSBT (1 + N), each triggering an independent `classify` round-trip + `xOnlyPublicKey` call. `InputSignerRouter.canBatch` is made **variadic** (`canBatch(...jobSets: InputSigningJob[][])`), flattens its arg, and classifies the union in a single pass. Eligibility is monotonic (the union routes entirely to the baseline key iff every set does), so the union yields the same answer with one `classify` instead of N+1. Backward compatible — existing single-array callers and tests are unchanged. `Wallet.buildAndSubmitOffchainTx` and `finalizePendingTxs` collapse the per-PSBT fan-out into one `canBatch(arkTxJobs, ...checkpointJobs)` / `canBatch(...checkpointJobs)` call. As a side effect, a mixed send whose arkTx is non-batchable and whose checkpoint is missing a descriptor now fails fast (before `setPendingTxFlag`) instead of mid-signing. Also rewords the recovery-batch comment — the old wording ("signMultiple writes directly onto the server-signed PSBTs") implied in-place mutation; the code consumes `signMultiple`'s returned transactions, which carry both sigs by the `BatchSignableIdentity` contract. New unit test covers the multi-set canBatch path (union classified in one repo pass; a rotated input in a later set still flips the bundle to false).
- `2148be98` Rollback CHANGELOG, it's generated — drops manual changes to the autogenerated `CHANGELOG.md`. No source / behaviour impact.

*Unrelated bug fix in the same range:*
- `bde0cc3c` fix: wait for actual incoming funds in `waitForIncomingFunds` — `notifyIncomingFunds` also fires for purely outgoing activity (a `vtxo_spent` event carries `newVtxos: []`; an onchain tx that only spends from the boarding address yields empty `coins`). The prior one-shot helper resolved on the first such notification, so a self-send could settle on its spent half before the matching `vtxo_received` arrived, returning an empty result. Helper now skips fund-less notifications (`funds.type === "utxo" ? funds.coins.length > 0 : funds.newVtxos.length > 0`) and keeps waiting. Also closes the subscription if the callback ran to completion before the `notifyIncomingFunds` promise resolved (`if (settled) stop()` after the `.then` returns), plugging a stop-handle leak. Fixes the flaky e2e "should finalize pending transactions".

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Signing Router bullet extended with `classify` / `canBatch` / `InputRoutingPlan`; two new bullets added: "BatchSignableIdentity one-popup path" (full send + recovery flow, `combineTapscriptSigs` invariants, length guard, clone-before-`signMultiple`, fail-fast on mixed sends) and "waitForIncomingFunds" (skip fund-less notifications + stop-handle leak fix).
- `docs/projects/ts-sdk/system/project_overview.md` — Per-Input Signing Router row extended with `classify` / `canBatch` (one-pass union classification); new "BatchSignableIdentity One-Popup Path" row covering both send + recovery paths, `combineTapscriptSigs` invariants, the symmetric length guard, and the request-clone hardening.
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/wallet.ts` annotation expanded with the restored batch branches in both `buildAndSubmitOffchainTx` and `finalizePendingTxs`, plus the `waitForIncomingFunds` skip-fund-less + stop-handle-leak fix; `wallet/inputSignerRouter.ts` annotation extended with `classify` / `InputRoutingPlan` / variadic `canBatch`; `utils/arkTransaction.ts` annotation gains the `combineTapscriptSigs` invariant note (input-count + per-input `tapScriptSig` guards with input-indexed errors); `identity/index.ts` annotation gains the `BatchSignableIdentity.signMultiple` two-clause contract (length + preserve-partial-sigs).
- `docs/INDEX.md` — ts-sdk Key Capabilities: Per-input signing bullet extended with `classify` / `canBatch`; two new bullets added: "BatchSignableIdentity one-popup path" and `waitForIncomingFunds` skip-fund-less fix. Tags list extended with `input-router-classify`, `input-router-can-batch`, `batch-signable-identity`, `sign-multiple`, `one-popup-signing`, `combine-tapscript-sigs`.

**Notes**:
- **No public API breakage**: `InputSignerRouter.canBatch` was new in #535 and is now variadic — no prior callers existed. `combineTapscriptSigs` now throws on previously silent-corruption cases; this is intentional (the prior behaviour was undefined-behaviour appending `undefined` to the witness). `BatchSignableIdentity.signMultiple` is unchanged at the type-system level — the new JSDoc clause makes an already-required behaviour explicit; implementations that already preserve partial signatures (the only correct shape) are unaffected.
- **No release**: only source changes — no `package.json` bumps, no CHANGELOG entry (that file is autogenerated and was rolled back in `2148be98`).
- **Tests added in this range**: 318-line `walletHdRotation.test.ts` (new file — covers HD send/recovery interplay with the batch path), `inputSignerRouter.test.ts` gains canBatch + classify cases (~144 lines added), `verifySignatures.test.ts` extended (~72 lines added) for the `combineTapscriptSigs` invariants and the recovery-batch server-sig-preservation case.

---

## 2026-05-30 - 0.4.32 / 0.3.37 release-only cut (no source changes)
**From**: `08644c637f76137dc8cc09fb683641dd8182d8f4`
**To**: `a511cba0c8e59c53ed0f628d811bce32561d43b9`
**Synced By**: update-project skill
**Status**: Release-only cut — `@arkade-os/sdk` bumps `0.4.31 → 0.4.32` and `@arkade-os/boltz-swap` `0.3.36 → 0.3.37` (`pnpm run release -- all patch`). No source changes in this range, only the two `package.json` version fields.

**Commits analyzed** (1 non-merge commit):
- `a511cba0` chore: release @arkade-os/sdk@0.4.32, @arkade-os/boltz-swap@0.3.37 — `packages/ts-sdk/package.json` `0.4.31 → 0.4.32`, `packages/boltz-swap/package.json` `0.3.36 → 0.3.37`.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — workspace table + Quick Reference Version bumped (`0.4.31 → 0.4.32`, `0.3.36 → 0.3.37`).
- `docs/projects/ts-sdk/system/project_overview.md` — Monorepo Layout workspace table + Package row Version bumped.
- `docs/INDEX.md` — Build (tsup) bullet "current published version" corrected `0.4.31 → 0.4.32`.

**Notes**:
- **No source changes**: only `packages/ts-sdk/package.json` and `packages/boltz-swap/package.json` differ between `08644c63` and `a511cba0`. Every Key Concept / Key Capability paragraph (including the `*(0.4.31)*`-tagged Per-Contract Tapscript Memoization and Boarding History De-duplication entries) remains exactly as it was at the previous sync — those tags mark the version in which each feature was *introduced* and stay anchored to 0.4.31.
- **No breaking changes**: trivially — there are no changes.

---

## 2026-05-29 - Per-contract tapscript memoization (#521) + boarding history dedup + 0.4.31 release
**From**: `7493534396de2f90db32ef4e03b700faac4f04a3`
**To**: `08644c637f76137dc8cc09fb683641dd8182d8f4`
**Synced By**: update-project skill
**Status**: Released cut — `@arkade-os/sdk` bumps `0.4.30 → 0.4.31` and `@arkade-os/boltz-swap` `0.3.35 → 0.3.36` (`pnpm run release -- all patch`). Two ts-sdk-side correctness/perf wins: **per-contract tapscript memoization** in the `extendVirtualCoinForContract` annotation path (`handler.createScript(contract.params)` was the dominant cost in `getVtxos()`/`getBalance()` on long spent/swept histories — Refs #521) with a follow-up clone-on-hit fix so PSBT-mutators can't poison the cache, and **boarding history de-duplication** in `buildTransactionHistory` so a settled boarding deposit that also produced a leaf VTXO no longer emits two `TxReceived` rows. Three boltz-swap-side completion-txid fixes for submarine + chain swaps are carried in the same range; they are tracked under `docs/projects/boltz-swap/`.

**Commits analyzed** (9 non-merge commits):

*ts-sdk — per-contract tapscript memoization (Refs #521):*
- `93549b44` perf(wallet/utils): memoize per-contract tapscripts in `annotateVtxos` — new public types `ContractTapscripts = Pick<ExtendedVirtualCoin, "forfeitTapLeafScript" | "intentTapLeafScript" | "tapTree">` and `ContractTapscriptCache = Map<string, ContractTapscripts>` in `src/wallet/utils.ts`. `extendVirtualCoinForContract(vtxo, contractOrMap?, cache?)` gains an optional cache; `deriveContractTapscripts(contract)` isolates the actual `handler.createScript(contract.params)` rebuild; `extendVtxoFromContract(vtxo, contract, cache?)` consults the cache by `contract.script` and falls back to derivation on miss. `ContractManager.getVtxosForContracts` (`src/contracts/contractManager.ts`) instantiates `const tapscriptCache: ContractTapscriptCache = new Map();` before the `vtxos.map(...)` so the taproot tree is built once per distinct contract in the batch — not once per VTXO.
- `9e54917a` fix(wallet/utils): clone cached contract tapscripts per vtxo — a regression follow-up. Hits now return deep-cloned `Uint8Array`s via new private helpers `cloneTapLeafScript([controlBlock, script])` (rebuilds `controlBlock.internalKey`, `merklePath[]`, and `script` as fresh `Uint8Array`s) and `cloneContractTapscripts` (wraps both leaves + `new Uint8Array(tapTree)`). The no-cache branch is short-circuited (`if (!cache) return { ...vtxo, ...deriveContractTapscripts(contract) }`) so unbatched callers keep their original allocation profile. Necessary because downstream PSBT-building callers mutate the returned `tapTree` / leaf-script buffers in place; without per-VTXO cloning, every subsequent VTXO sharing the same contract would receive the prior caller's mutated buffers.

*ts-sdk — boarding history de-duplication:*
- `042dc444` fix(transactionHistory): suppress duplicate history entries for swept boarding deposits — adds the missing `(!vtxo.settledBy || !commitmentsToIgnore.has(vtxo.settledBy))` clause to the ignored-commitment guard inside `buildTransactionHistory` so leaf VTXOs whose `settledBy` points at an ignored commitment now take the dedup branch (previously a swept boarding deposit emitted both a boarding `TxReceived` row and a separate batch-leaf `TxReceived` row). `ReadonlyWallet.getBoardingTxHistory` (`src/wallet/wallet.ts`) starts populating `key.commitmentTxid = utxo.virtualStatus.commitmentTxIds?.[0] ?? ""` on the boarding `ArkTransaction` rows it emits (was always `""`) so the new commitment-based dedup matcher has a non-empty key to compare against.
- `eda525b1` fix(transactionHistory): full boarding-refill dedup pass — top-level `unmatchedSettledBoardingTxs = allBoardingTxs.filter(isSettledBoardingReceive).sort((a, b) => a.createdAt - b.createdAt)` snapshot consumed via new private helper `consumeBoardingReceive(boardingTxs, predicate)` (returns bool, splices the matched entry). Helper `isSettledBoardingReceive(tx)` = `tx.type === TxType.TxReceived && tx.settled && tx.key.boardingTxid !== ""`. Two consume modes: (a) ignored-commitment leaves consume by `(commitmentTxid match OR settledBy match) AND createdAt ≤ vtxo.createdAt`; (b) not-ignored leaves with no refresher consume by exact `amount` match (and createdAt window) and on hit suppress the would-be batch-leaf row.

*ts-sdk — tooling / release:*
- `fb61a077` chore: ignore docs folder — `.gitignore` adds `docs/` (no source impact).
- `3f207725` chore: release @arkade-os/sdk@0.4.31, @arkade-os/boltz-swap@0.3.36 — `packages/ts-sdk/package.json` `0.4.30 → 0.4.31`, `packages/boltz-swap/package.json` `0.3.35 → 0.3.36`.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `dd9c5647` fix: return on-chain txid for submarine/chain swap completion.
- `73518b99` fix: source chain swap completion txid from the claim we broadcast — `claimBtc`/`claimArk`/`claimVHTLCwithOffchainTx` now return `{ txid }`; `waitAndClaimBtc`/`waitAndClaimArk` resolve from the claim via `resolveChainClaimTxid` (Boltz does not surface a chain-swap txid at the `transaction.claimed` step); propagated through `IArkadeSwaps`, the Expo wrapper, and the service-worker runtime/message handler.
- `a3ecdafb` fix: await in-flight chain claim when resolving completion txid — `SwapManager.resolveClaimedTxid` now awaits the stored claim **promise** (not the resolved txid) so a `transaction.claimed` notification firing while the autonomous claim is still in-flight no longer falls back to `getSwapStatus` and throws "Transaction ID not available"; `finalizeMonitoredSwap` clears the entry and a missing-txid case raises `SwapError` to match the manual path.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — workspace table + Quick Reference Version bumped (`0.4.30 → 0.4.31`, `0.3.35 → 0.3.36`). Two new Key Concepts added: "Per-Contract Tapscript Memoization" (full `ContractTapscripts` / `ContractTapscriptCache` types, `extendVirtualCoinForContract` cache arg, `ContractManager.getVtxosForContracts` per-call cache, clone-on-hit rationale, no-cache short-circuit) and "Boarding History De-duplication" (snapshot + consume flow, both matcher modes, the `settledBy` guard, `commitmentTxid` population on `ReadonlyWallet` boarding rows).
- `docs/projects/ts-sdk/system/project_overview.md` — workspace table + Version bumped. VTXO Operations row gained a paragraph documenting the 0.4.31 tapscript-cache path through `extendVirtualCoinForContract` / `getVtxosForContracts` with the clone-on-hit + no-cache short-circuit notes. New "Transaction History" row added covering the boarding dedup logic.
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/utils.ts` entry now documents the `ContractTapscripts` / `ContractTapscriptCache` types, `deriveContractTapscripts` isolation, the `extendVtxoFromContract` cache + no-cache short-circuit, and the `cloneTapLeafScript` / `cloneContractTapscripts` clone-on-hit helpers (load-bearing because PSBT callers mutate the returned buffers). `contracts/contractManager.ts` entry notes the per-call `ContractTapscriptCache = new Map()` in `getVtxosForContracts`. `wallet/wallet.ts` entry notes the `ReadonlyWallet.getBoardingTxHistory` change to populate `key.commitmentTxid`. New `utils/transactionHistory.ts` entry covering the `unmatchedSettledBoardingTxs` snapshot, both consume modes, the `settledBy` guard clause, and the `consumeBoardingReceive` / `isSettledBoardingReceive` helpers.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain two new bullets ("Per-contract tapscript memoization" and "Boarding history de-duplication" — full feature paragraphs mirroring the project INDEX). "Current published version" in the Build (tsup) bullet corrected `0.4.30 → 0.4.31`. Tags add `tapscript-memoization`, `transaction-history`, `boarding-dedup`.

**Notes**:
- **No breaking changes for typical consumers**: `ContractTapscripts` / `ContractTapscriptCache` and the new `cache?` arg on `extendVirtualCoinForContract` are purely additive — callers passing no cache hit the no-cache short-circuit (single allocation per call, same as before). `buildTransactionHistory`'s output shape is unchanged; only the row count is corrected in the formerly-duplicating boarding scenarios. `ReadonlyWallet.getBoardingTxHistory` populating `key.commitmentTxid` is a non-breaking addition (the field was always present; previously always `""`).
- The **clone-on-hit fix is load-bearing**, not paranoia: downstream PSBT-building paths mutate the returned `tapTree` / `forfeitTapLeafScript` / `intentTapLeafScript` `Uint8Array`s in place (e.g., when constructing the spending PSBT). Without per-VTXO cloning of cached entries, every later VTXO sharing the same contract would receive the prior caller's mutated buffers and PSBT construction would observe corrupted scripts. The two-commit sequence (initial memo → clone-on-hit) is the only correct shape for this perf path.
- The **no-cache short-circuit** matters for consumers that call `extendVirtualCoinForContract` directly on a single VTXO (e.g., reactive update paths). Without it, the cache-hit code path would still construct a `cloneContractTapscripts` call (allocating two fresh `Uint8Array`s for the leaves plus one for the tapTree) on every single-VTXO call. The short-circuit returns the original `deriveContractTapscripts(contract)` allocation directly, matching the pre-#521 hot path exactly.
- The **boarding dedup's two-mode design** is deliberate: the `commitmentsToIgnore` set is built upstream from leaf VTXOs that were already refreshed/swept (so their boarding origin should not appear separately), but the original guard didn't consume the corresponding boarding row from the output list — it just decided not to emit a duplicate batch row. The new `unmatchedSettledBoardingTxs` snapshot + consume flow correctly removes the boarding receipt from the output **even when its corresponding leaf was filtered out by the ignored-commitment branch**, so the user-visible row count finally matches the user's deposit count.
- The boltz-swap completion-txid fixes in this range are tracked under `docs/projects/boltz-swap/`; this sync touches only ts-sdk + master registry docs.

---

## 2026-05-28 - Per-call renewVtxos threshold (#388) + dependency hygiene + 0.4.30 release
**From**: `45d639c820ae0cfb81bf25d70bea0cbaa1221e00`
**To**: `7493534396de2f90db32ef4e03b700faac4f04a3`
**Synced By**: update-project skill
**Status**: Released cut — `@arkade-os/sdk` bumps `0.4.29 → 0.4.30` and `@arkade-os/boltz-swap` `0.3.34 → 0.3.35` (`pnpm run release -- all patch`). Headline ts-sdk change is the **per-call `thresholdSeconds` override on `renewVtxos`** (PR #388), mirrored through the ServiceWorker message bus and runtime-validated to reject malformed payloads. Two small additional ts-sdk changes: `RealmLike.create` mode widened to `boolean | string`, and a workspace-wide override bump clearing 19 Dependabot advisories. The boltz-swap chain-swap `lockupDetails.timeouts` restoration fix is carried in the same range and tracked under `docs/projects/boltz-swap/`.

**Commits analyzed** (8 non-merge commits):

*ts-sdk — per-call renewVtxos threshold (#388):*
- `0ddfb077` feat(vtxo-manager): per-call threshold on renewVtxos — adds optional `RenewVtxosOptions` payload to `IVtxoManager.renewVtxos(eventCallback?, options?)` whose `thresholdSeconds` overrides the renewal threshold for that call only. Resolution order: `options.thresholdSeconds` (×1000) → `settlementConfig.vtxoThreshold` (×1000) → `DEFAULT_RENEWAL_CONFIG.thresholdMs` (3 days); the manual API bypasses the `settlementConfig === false` gate so it always works. Mirrored across the ServiceWorker message bus — `RequestRenewVtxos` gains an optional `payload: RenewVtxosOptions` field, `ServiceWorkerWallet.renewVtxos(eventCallback?, options?)` attaches it, and the worker handler forwards `message.payload` as the second arg to the underlying manager call. `RenewVtxosOptions` re-exported from `src/index.ts`.
- `e0a50c6b` fix(vtxo-manager): validate thresholdSeconds on renewVtxos — rejects non-number, non-finite, and non-positive `thresholdSeconds` values with `TypeError` BEFORE mutating any state. Rationale: the payload can arrive over the worker `MessageBus` so `thresholdSeconds` is not guaranteed to be a number at runtime despite its type, and a `0` / `<=100ms` threshold would silently revert to the 3-day default via the `isVtxoExpiringSoon` guard (corrupting the expiry intent). Adds a message-handler test covering `thresholdSeconds` payload forwarding.

*ts-sdk — small typing widening:*
- `0b789a35` fix: widen RealmLike.create mode to boolean | string — `RealmLike.create(schemaName, values, mode?)` mode arg type widened from `string` to `boolean | string`, matching Realm's actual `UpdateMode` overload signature. Repository-internal type only; no public API impact.

*ts-sdk / repo-wide — dependency hygiene:*
- `4ba6da03` fix: bump deps to clear Dependabot advisories — `pnpm-workspace.yaml` overrides updated: `brace-expansion` `^2.0.2 → ^2.0.3`, `minimatch` `9.0.3 → 9.0.7`, `@xmldom/xmldom` `^0.8.13` (new), `node-forge` `^1.4.0` (new), `postcss` `>=8.5.10` (new), `vite` `^7.3.2` (new), `ws@8` `>=8.20.1` (new). Boltz-swap vite bumped to `7.3.3`. Clears 19 alerts including the runtime `ws` path via `ws-electrumx-client`.
- `c79e6543` fix: align boltz-swap vite specifier with workspace override — boltz-swap-only `package.json` vite specifier alignment.
- `a9da3a38` fix: cap postcss override at <9.0.0 — `postcss: ">=8.5.10"` → `^8.5.10` so a future postcss 9.x with breaking changes cannot be resolved. No change to the resolved version (8.5.15).

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `cd4d7b83` fix: set lockupDetails.timeouts for restored chain swaps — `restoreSwaps` previously omitted `timeouts` on restored chain swaps so `refundArk` threw "missing timeouts" and ARK→BTC refunds were impossible after restart. A shared `resolveVhtlcTimeouts` helper now sets them (server value or tree-derived) across all restore branches and guards incomplete trees.

*Release:*
- `74935343` chore: release @arkade-os/sdk@0.4.30, @arkade-os/boltz-swap@0.3.35 — `package.json` version bumps via `pnpm run release -- all patch`.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — workspace table + Quick Reference Version bumped (`0.4.29 → 0.4.30`, `0.3.34 → 0.3.35`); new "Per-Call Renewal Threshold" Key Concept covering the `RenewVtxosOptions` payload, resolution order, manual-API gate bypass, runtime validation rationale, and ServiceWorker message-bus forwarding.
- `docs/projects/ts-sdk/system/project_overview.md` — workspace table + Version bumped; VTXO Operations row gained the `renewVtxos(eventCallback?, options?)` paragraph (override resolution, runtime validation, ServiceWorker mirror, `RenewVtxosOptions` root export).
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/vtxo-manager.ts` entry now documents the `RenewVtxosOptions` payload, resolution order, and the pre-state-mutation type guard; `wallet/serviceWorker/wallet.ts` entry notes the new `options?` arg on `renewVtxos` and the `RequestRenewVtxos.payload` attachment; `wallet/serviceWorker/wallet-message-handler.ts` entry covers the optional `payload` field on `RequestRenewVtxos` and the handler's payload forwarding.
- `docs/INDEX.md` — ts-sdk Key Capabilities gain a new "Per-call renewal threshold" bullet (full feature paragraph mirroring the project INDEX). "current published version" in the Build (tsup) bullet corrected `0.4.29 → 0.4.30`. Tags add `renew-vtxos-threshold`.

**Notes**:
- **No breaking changes for typical consumers**: the new `options` arg on `renewVtxos` is optional and additive at every layer (manager interface, manager impl, ServiceWorker wallet, message envelope). Callers that don't pass it keep the prior behaviour (`settlementConfig.vtxoThreshold` or 3-day default). The runtime validation only fires when an invalid override is supplied — well-formed values flow through unchanged.
- **Validation is intentionally pre-state-mutation**: throwing `TypeError` before touching `renewalInProgress` keeps the invariant that a rejected call leaves the manager in the exact state it was in before the call. The validation guards against three concrete failure modes — `NaN` / `Infinity` (would compare unexpectedly inside `isVtxoExpiringSoon`), `<=0` (would silently widen the filter to "all VTXOs"), and non-`number` types (e.g. `"3600"` from a JSON-deserialized worker payload). Documented in the inline rationale comment.
- **No public API change for the dependency-override bumps** — they only alter what pnpm resolves transitively. The runtime `ws` path consumed via `ws-electrumx-client` for the `ElectrumOnchainProvider` WebSocket transport is now on `ws >= 8.20.1`, clearing the known CVE without changing the SDK's source.
- The `RealmLike.create` mode widening is a repository-backend type-only change; the Realm SDK's actual `UpdateMode` parameter accepts boolean (legacy) and `'never' | 'modified' | 'all'` strings — the prior `string`-only typing forced unnecessary casts at call sites. Public `WalletRepository` API is untouched.
- The boltz-swap chain-swap `lockupDetails.timeouts` restoration fix in this range is tracked under `docs/projects/boltz-swap/`; this sync touches only ts-sdk + master registry docs.

---

## 2026-05-27 - Delegator → Delegate rename (#519) + AssetManager export + 0.4.29 release
**From**: `d682eac52d1fc7e92662a859cd69db5bd8bff156`
**To**: `45d639c820ae0cfb81bf25d70bea0cbaa1221e00`
**Synced By**: update-project skill
**Status**: Released cut — `@arkade-os/sdk` bumps `0.4.28 → 0.4.29` and `@arkade-os/boltz-swap` `0.3.33 → 0.3.34` (`pnpm run release -- all patch`). Headline ts-sdk change is the **delegator → delegate public-surface rename** (PR #519), shipped non-breaking via `@deprecated` aliases. Two small additive exports also landed: `AssetManager` / `ReadonlyAssetManager` from the SDK root, and `InMemorySwapRepository` from the boltz-swap root (the latter tracked under `docs/projects/boltz-swap/`).

**Commits analyzed** (8 non-merge commits):

*ts-sdk — additive root exports:*
- `33e23b3e` feat: export AssetManager — `AssetManager` + `ReadonlyAssetManager` (and the `IAssetManager` / `IReadonlyAssetManager` types) now re-exported from `src/index.ts`.

*ts-sdk — delegator → delegate rename (#519):*
- `4538f7fe` chore: rename delegator -> delegate — renames the public delegation surface across providers, wallet, service worker, and message bus. Files `src/providers/delegator.ts` → `delegate.ts` and `src/wallet/delegator.ts` → `delegate.ts`. New canonical exports `DelegateProvider`, `RestDelegateProvider`, `DelegateManagerImpl`, `IDelegateManager`, `DelegateNotConfiguredError`; the prior `Delegator*` names kept as `@deprecated` aliases. `IWallet.getDelegateManager()` + `BaseWalletConfig.delegateProvider` are canonical (`getDelegatorManager()` / `delegatorProvider` deprecated aliases). README + tests renamed to match.
- `ec48a8da` fix: coderabbit feedback on PR #519.
- `d3e7bce1` chore: follow-up cleanups for delegator -> delegate rename — makes the deprecated `DelegateInfo.delegatorAddress` optional; normalizes `delegateAddress` at the single `getDelegateInfo()` boundary so `delegate()` reads `delegateInfo.delegateAddress` directly; documents why both `delegateUrl` and `delegatorUrl` are still posted to the worker (pre-#519 service-worker compat); renames `delegator*.test.ts` → `delegate*.test.ts`.
- `dd9b58e6` fix: make isDelegateInfo consistent with optional delegatorAddress — the guard accepts the payload when either `delegateAddress` or `delegatorAddress` is a non-empty string (each validated only when present), keeping current Fulmine (`delegatorAddress`-only) responses valid and forward-compatible with the server switching to `delegateAddress`.
- `1250ee12` fix: normalize delegateAddress by type, not truthiness — selects the returned `delegateAddress` by explicit string type check so it is always a string even when the preferred source field is a non-string value; adds `RestDelegateProvider.getDelegateInfo` unit tests for the non-string case + the guard rejection path.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `3a45d57a` feat: export InMemorySwapRepository — re-exports `InMemorySwapRepository` from `@arkade-os/boltz-swap`'s root.

*Release:*
- `45d639c8` chore: release @arkade-os/sdk@0.4.29, @arkade-os/boltz-swap@0.3.34 — package.json version bumps.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — workspace table + Quick Reference Version bumped (`0.4.28 → 0.4.29`, `0.3.33 → 0.3.34`); architecture diagram `DelegatorManager → DelegateManager` and `RestDelegatorProvider → RestDelegateProvider`; "Delegation" key concept rewritten and two new key concepts added ("Delegator → Delegate Rename" with the full canonical/alias mapping + `DelegateInfo` semantics; "AssetManager Export").
- `docs/projects/ts-sdk/system/project_overview.md` — workspace table + Version bumped; URL Config Deprecation row notes `delegatorProvider` is itself a deprecated alias; Asset Management row gained the root-export note; VTXO Delegation row rewritten with the rename + `DelegateInfo` details; Integration Points "Delegator" → "Delegate" (`RestDelegateProvider`).
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/delegator.ts` → `delegate.ts` (DelegateManager + alias note); `providers/delegator.ts` → `delegate.ts` (RestDelegateProvider + `DelegateInfo` normalization); `asset-manager.ts` entry notes the root export; provider list `DelegatorProvider` → `DelegateProvider`.
- `docs/projects/ts-sdk/system/integration-with-arkd.md` — wallet config example uses `delegateProvider: new RestDelegateProvider(url)`; "Built-in DelegatorManager" → "DelegateManager".
- `docs/INDEX.md` — ts-sdk Key Capabilities: asset bullet gained the root-export note; VTXO delegation bullet rewritten with the full rename + `DelegateInfo` semantics; stale "version still 0.4.27" note corrected to "current published version 0.4.29". Tags add `delegate-manager`, `delegator-delegate-rename`, `asset-manager-export`.

**Notes**:
- **No breaking changes for typical consumers**: the delegator → delegate rename ships entirely via `@deprecated` aliases — every old name (`DelegatorProvider`, `RestDelegatorProvider`, `DelegatorManagerImpl`, `IDelegatorManager`, `DelegatorNotConfiguredError`, `getDelegatorManager()`, `delegatorProvider`) still resolves at runtime. `AssetManager` / `ReadonlyAssetManager` exports are purely additive.
- `DelegateInfo.delegatorAddress` becoming optional is non-breaking for readers (it was already populated by Fulmine); writers/implementers gain the option to populate `delegateAddress` instead.
- The boltz-swap `InMemorySwapRepository` export in this range is tracked under `docs/projects/boltz-swap/`; this sync touches only ts-sdk + master registry docs.

---

## 2026-05-26 - Provider mainnet defaults + URL-config deprecation + DustChangeError + ServiceWorkerWallet.restore()
**From**: `0fa19be5f59d50435d19806ba182754b3689a80f`
**To**: `d682eac52d1fc7e92662a859cd69db5bd8bff156`
**Synced By**: update-project skill
**Status**: Post-release polish batch on top of the `0.4.28` cut — no version bump (`packages/ts-sdk/package.json` still `0.4.28`, `packages/boltz-swap/package.json` still `0.3.33`). Four user-visible ts-sdk changes: (1) every default provider constructor now defaults its URL to the Ark Labs mainnet endpoint, (2) URL-string fields on `BaseWalletConfig` / `ServiceWorkerWalletOptions` are JSDoc-deprecated in favour of provider instances, (3) `Ramps` partial-offboard throws a typed `DustChangeError` before forwarding the intent so wallet UIs can recover gracefully, (4) `ServiceWorkerWallet.restore()` mirrors `Wallet.restore` with a worker-side scan + explicit `AggregateError` round-trip across postMessage. Several boltz-swap commits are also in this range; they are tracked under `docs/projects/boltz-swap/`.

**Commits analyzed** (17 non-merge commits across both packages):

*ts-sdk — mainnet defaults extended to providers:*
- `c87bc3da` refactor: move mainnet default constants into networks — extracts `DEFAULT_ARKADE_SERVER_URL`, `DEFAULT_NETWORK`, `DEFAULT_NETWORK_NAME` to `src/networks.ts` so `script/base.ts` and the provider modules can import them without dragging in `wallet/index.ts` (breaks a future cycle once the providers start defaulting).
- `cdeb6bb8` feat: default address + onchainAddress network to mainnet — `VtxoScript.address(prefix?)` defaults `prefix` to `DEFAULT_NETWORK.hrp`; `VtxoScript.onchainAddress(network?)` defaults to `DEFAULT_NETWORK`.
- `5d7eded9` feat: default provider URLs to mainnet — `RestArkProvider.constructor(serverUrl = DEFAULT_ARKADE_SERVER_URL)`, `RestIndexerProvider.constructor(serverUrl = DEFAULT_ARKADE_SERVER_URL)`, `ExpoArkProvider`, `ExpoIndexerProvider` same shape. `EsploraProvider.constructor(baseUrl = ESPLORA_URL[DEFAULT_NETWORK_NAME])` defaults to the Ark Labs mempool deployment for bitcoin. `vtxo-manager.ts` example JSDocs rewritten to drop the now-redundant URL args; `DEFAULT_THRESHOLD_SECONDS` rewritten as numeric literal `259_200` (semantically identical).

*ts-sdk — URL string config deprecated:*
- `919d1fff` chore: deprecate string arguments when creating wallet — `BaseWalletConfig`'s JSDoc rewritten as `@deprecated`; the `ReadonlyWallet.create` / `Wallet.create` / `ExpoWallet.setup` `@example` blocks dropped the URL-based forms. `ReadonlyWallet.create` switched the provider resolution from `config.arkProvider ?? new RestArkProvider(arkadeServerUrl)` to `||` so an explicitly-passed `undefined` (e.g. via TypeScript narrowing) falls through to the default constructor.
- `779dbb4f` chore: deprecate URL string args in wallet config (refs #466) — adds `@deprecated` JSDoc to `BaseWalletConfig.arkServerUrl` / `indexerUrl` / `esploraUrl` and `ServiceWorkerWalletOptions.arkServerUrl` / `indexerUrl` / `esploraUrl` / `delegatorUrl`. Runtime behaviour unchanged.

*ts-sdk — DustChangeError on partial offboard:*
- `f6769128` fix(ramps): reject sub-dust change on partial offboard (closes #458) — partial collab exits leaving a change VTXO below the wallet's dust threshold were forwarded to arkd, which rejected the intent and surfaced a raw dust error. `Ramps` now pre-checks the change against the wallet's `dustAmount` (with `FALLBACK_DUST_AMOUNT = 330n` for wallets that don't expose it) and throws a typed `DustChangeError(change, dustAmount)` locally. `DustChangeError` exported from the package root.
- `c8d97ebb` Extract shared wallet dust amount helper — moves `getDustAmount(wallet): bigint` + `FALLBACK_WALLET_DUST_AMOUNT = 330n` to `src/wallet/utils.ts`; `ramps.ts` and `vtxo-manager.ts` share the helper (was duplicated inline).

*ts-sdk — ServiceWorkerWallet.restore():*
- `d19ed384` feat(sw): ServiceWorkerWallet.restore() with AggregateError round-trip — adds `ServiceWorkerWallet.restore({ gapLimit })` (signing-only — readonly rejects). New `RequestRestoreWallet` / `ResponseRestoreWallet` types + `RESTORE_WALLET` / `RESTORE_WALLET_SUCCESS` case; the message uses the streaming `sendMessageWithEvents` path and is added to `isLongRunningRequest()` alongside `SETTLE` / `RECOVER_VTXOS` / `RENEW_VTXOS` so the bus deadline never races a multi-minute indexer scan (liveness still covered by PING). `AggregateError` is not structured-clone-portable across browsers, so the worker explicitly serializes it (`SerializedAggregateError` wire envelope: `{ name: 'AggregateError', message, errors: { name; message }[] }`) and the page reconstructs via `deserializeAggregateError` so callers can inspect `.errors`. Helpers + `isSerializedAggregateError` guard live in `wallet-message-handler.ts`.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `4c92e4a8` Iterate all VTXOs in claimVHTLC and refundArk — `claimVHTLC` processes every unspent VTXO at the reverse-swap lockup script (recoverable→joinBatch, non-recoverable→offchain claim); `refundArk` processes every unspent VTXO at the chain-swap lockup, gates path by CLTV, returns `{ swept, skipped }`, propagated through `IArkadeSwaps`, `SwapManagerCallbacks`, Expo + service-worker wrappers. `SwapManager` keeps chain swaps monitored when `refundArk` reports partial outcomes or throws, schedules a 60s retry, finalizes once the local sweep completes. Fix Boltz throttle in `refundVHTLC` / `refundArk` to count attempts so the 2s gap also applies after a `BoltzRefundError`.
- `a53ad526` claimVHTLC: aggregate per-VTXO errors instead of short-circuit — wrap each VTXO claim attempt in try/catch so an early failure doesn't strand later VTXOs at the lockup; throw a single aggregate after the loop.
- `ad32ba6f` Address PR review on refundArk loop — re-check CLTV per-iteration; add `removeSwap()` test for refund-retry timer clearing.
- `a10a2766` swap-manager.test: isolate chain-refund retry suite with a global.fetch stub.
- `2bc185f9` Fix formatting (boltz-swap).
- `b9b4e0a3` Guard claimVHTLC retries and refund-retry swaps — `claimVHTLC` retries until an unspent VTXO appears instead of breaking on any result; exclude swaps with a pending refund retry from polling and the not-found path so a 404 can't clear `refundRetryTimers`.
- `5c36b5a5` test(boltz-swap): drive autopilot wrap via lockupFailed status.
- `0789d942` fix(boltz-swap): reject non-safe-integer quote amounts.
- `36937074` fix(boltz-swap): reject slippage that collapses quote floor to 0.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Mainnet Defaults key concept extended to cover provider constructor defaults + `VtxoScript.address`/`onchainAddress` defaults + the `DEFAULT_*` constants' move into `src/networks.ts`. Three new key concepts added: "Wallet Config URL Deprecation" (all URL fields `@deprecated`, provider-based config is the recommended path, refs #466); "Dust Change Guard / DustChangeError" (`Ramps` pre-check + typed error + shared `getDustAmount` helper, closes #458); "ServiceWorkerWallet.restore()" (worker-side scan + long-running message + explicit `AggregateError` round-trip).
- `docs/projects/ts-sdk/system/project_overview.md` — Mainnet Defaults row in Core Features amended with the provider/`VtxoScript` defaults paragraph. New "URL Config Deprecation" row added. Boarding/Offboarding row gained the DustChangeError + `getDustAmount` + `FALLBACK_WALLET_DUST_AMOUNT` paragraph. Service Worker row gained the `ServiceWorkerWallet.restore({ gapLimit })` paragraph (long-running message + `SerializedAggregateError` envelope + readonly rejection).
- `docs/projects/ts-sdk/system/architecture.md` — `networks.ts` entry now documents the `DEFAULT_ARKADE_SERVER_URL` / `DEFAULT_NETWORK` / `DEFAULT_NETWORK_NAME` declarations + rationale for the move. `script/base.ts` entry covers the `address(prefix?)` / `onchainAddress(network?)` defaults. `providers/{ark,indexer,onchain,expoArk,expoIndexer}.ts` entries each note the new default-URL constructor arg. `wallet/ramps.ts` entry covers the DustChangeError pre-check; `wallet/utils.ts` entry now hosts `getDustAmount` + `FALLBACK_WALLET_DUST_AMOUNT`. `wallet/serviceWorker/wallet.ts` + `wallet-message-handler.ts` entries document the `restore()` flow, `RESTORE_WALLET` message + long-running marking, and the `SerializedAggregateError` envelope + helpers.
- `docs/INDEX.md` — ts-sdk Key Capabilities: Mainnet defaults bullet amended with the provider/`VtxoScript` defaults; three new bullets added (URL config deprecation, DustChangeError, ServiceWorkerWallet.restore). Tags add `provider-default-urls`, `url-config-deprecated`, `dust-change-error`, `service-worker-restore`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` still reads `"0.4.28"`, `packages/boltz-swap/package.json` still `"0.3.33"`. The next published release will carry these changes.
- **No breaking changes for typical consumers**: provider-default URLs and `VtxoScript` argument defaults are *additive* (existing call sites passing explicit args keep working unchanged). URL-string deprecations are JSDoc-only — runtime still accepts them. `DustChangeError` is a new typed error class thrown from a previously-failing path (callers ignoring it get the same fail behaviour they had before, just with a structured error instead of arkd's raw dust message). `ServiceWorkerWallet.restore()` is a new method (additive).
- The `||` operator (not `??`) is now used in `ReadonlyWallet.create` to resolve `arkProvider` so an explicitly-`undefined` `arkProvider` field falls through to the constructor's mainnet default — a deliberate tightening over the prior nullish-coalescing form.
- The boltz-swap changes in this range (`claimVHTLC` aggregate-throw + per-VTXO retry, `refundArk` iterate-all + `{swept,skipped}` outcome + 60s SwapManager retry, quote-amount + slippage validations) substantially expand the public callback shape of `IArkadeSwaps` / `SwapManagerCallbacks` and the Expo / service-worker wrappers around them — full coverage lives under `docs/projects/boltz-swap/`.

---

## 2026-05-23 - Wallet.restore() gap-scan recovery + Discoverable handlers (0.4.28, #492)
**From**: `2fc8a3ff5adb14c87cf57586bddcf287ce4bfff6`
**To**: `0fa19be5f59d50435d19806ba182754b3689a80f`
**Synced By**: update-project skill
**Status**: First post-monorepo release cycle for both packages: `@arkade-os/sdk` cuts `0.4.28` and `@arkade-os/boltz-swap` cuts `0.3.33`. Headline ts-sdk change is **explicit gap-scan recovery** — a new `Wallet.restore({ gapLimit })` API plus the `Discoverable` capability + `ContractManager.scanContracts` plumbing that backs it (PR #492). The Boltz quoteSwap guard against adversarial renegotiations is tracked under the `boltz-swap` project. One transitive security override: `@ungap/structured-clone >=1.3.1` (CWE-502, pulled in via expo, closes #497).

**Commits analyzed** (26 non-merge commits across both packages):

*ts-sdk: Wallet.restore() gap-scan recovery (#492):*
- `6e08283c` feat(contracts): add Discoverable capability + DiscoveryDeps/DiscoveredContract — new contract-handler capability `discoverAt(descriptor, deps): Promise<DiscoveredContract[]>`; structural `isDiscoverable` guard; types in `src/contracts/types.ts`.
- `f52403e0` feat(contracts): DefaultContractHandler implements discoverAt — probes every csvTimelock in the baseline matrix at the given descriptor's leaf pubkey; index 0 produces an untagged hit, index > 0 tags with `metadata.source = WALLET_RECEIVE_SOURCE` + `metadata.signingDescriptor`.
- `ba99adfe` feat(contracts): DelegateContractHandler implements discoverAt — same shape for delegated `default + delegate` contracts; multi-timelock coverage with each entry's `params.csvTimelock` round-tripping its own `timelockToSequence`.
- `3d3e0e1f` refactor(contracts): extract WALLET_RECEIVE_SOURCE to break contracts→wallet cycle — source-of-truth declaration moved to dependency-free leaf `src/contracts/metadata.ts`; `wallet/walletReceiveRotator.ts` re-exports for backward compatibility.
- `a2f452e4` feat(wallet): public materializeDescriptorAt + monotonic advanceLastIndexUsed on HDDescriptorProvider — exposes descriptor materialization at arbitrary HD indexes (used by scanContracts) and a monotonic cursor-advance helper (used by restore to fast-forward past discovered hits).
- `7c2de20e` refactor: extract deriveDescriptorLeafPubKey into identity/descriptor — shared between WalletReceiveRotator and the contract-handler discoverAt paths.
- `b217fbb7` refactor: simplify deriveLeafPubkey wrapper message; add HD-descriptor test.
- `859ff01c` test(contracts): multi-timelock discoverAt coverage; drop redundant casts — exported `ContractHandler<...> & Discoverable` typing makes `as any` casts unnecessary at use sites.
- `95b4d1ba` feat(contracts): ContractManager.scanContracts gap-limit discovery loop — `scanContracts({ deps, hd, gapLimit }): Promise<ScanResult>` iterates each Discoverable handler probing successive indexes until `gapLimit` consecutive misses; `hd: false` short-circuits to a single static pass at index 0; returns `{ lastIndexUsed, handlerErrors }`.
- `49a4f187` refactor(contracts): scanContracts naming/typing polish; drop dead test import — local rename `lastUsedIdx → lastIndexUsed`; tightened `let found: DiscoveredContract[];` typing.
- `d257984c` fix(wallet): deterministic pickActiveReceive tiebreak on HD index — when multiple `metadata.source === 'wallet-receive'` contracts coexist (restore can create several), parse trailing `/N)` from each `metadata.signingDescriptor` and prefer the highest index.
- `ec78c094` feat(wallet): explicit Wallet.restore() gap-scan recovery — public `restore({ gapLimit })` entry point; HD branch drives `scanContracts({ hd: true })`, non-HD branch does a single static pass; trailing `refreshVtxos({ includeInactive: true })` bulk-loads VTXOs for all discovered scripts in one indexer call.
- `84155f75` fix(wallet): drain in-flight restore on dispose; lazy static descriptor — `dispose()` now awaits `_restoreInFlight?.catch(() => undefined)` before tearing down the contract/vtxo managers; staticDescriptor computed lazily (HD branch never touches `xOnlyPublicKey()`); JSDoc notes coalesce-on-concurrent behaviour.
- `27e90585` feat: export restore/discovery public types — `Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError` surfaced from the package root following the existing curated import/export pattern.
- `0900d3e6` test(e2e): restore recovers balance on a fresh repo from the same seed — end-to-end coverage of the full restore loop.
- `ab65a01c` test(e2e): make restore test HD-mode and load-bearing — restore e2e now exercises the actual HD path.
- `400829f8` fix: address CodeRabbit review (HD capability check, watermark guard, test robustness).
- `d0839d24` fix(restore): bound HD scan with SCAN_MAX_INDEX; use instanceof for HD check — HD scan capped at `SCAN_MAX_INDEX = 10_000` (was `POSITIVE_INFINITY`) so a buggy/malicious Discoverable handler can't hang the wallet, and silently truncating a fund-recovery scan can't mask the failure (hitting the cap **throws**); `_runRestore` detects HD via `instanceof HDDescriptorProvider` rather than duck-typing the new method names.
- `3d15d5e3` perf(scan): avoid N per-contract indexer pulls during scanContracts — factor `upsertContract` + new lighter `persistAndWatchContract` that omits the per-contract `fetchContractVxosFromIndexer` pull (trailing `refreshVtxos` covers the same scripts in one batched call); `createContract` keeps the fetch for standalone callers.
- `fb8cfabc` fix(restore): coalesce concurrent calls before validating gapLimit — `_restoreInFlight` check moved BEFORE `gapLimit` validation so a coalescing caller with an invalid `gapLimit` joins the running scan instead of throwing (matches the documented JSDoc).

*ts-sdk: Release:*
- `b32735b7` chore: release @arkade-os/sdk@0.4.28, @arkade-os/boltz-swap@0.3.33 — package.json version bumps via `pnpm run release -- all patch`.
- `057886d2` Update docs — AGENTS.md + README.md narrative tweaks for the restore feature.
- `2d823ef2` chore: override @ungap/structured-clone to >=1.3.1 — flags CWE-502 (deserialization of untrusted data); 1.3.0 was pulled in transitively via expo. Override added to root `pnpm-workspace.yaml` (closes #497). No `@arkade-os/sdk` source change.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `3df53118` Guard quoteSwap against adversarial Boltz quotes — typed `QuoteRejectedError` with reason codes, `getSwapQuote` / `acceptSwapQuote` inspection helpers, `minAcceptableAmount` + basis-point slippage support.
- `db39c2d8` Address review on quoteSwap guard — `claimDetails` guards for restored swaps; preserve native `QuoteRejectedError` across SW boundary; discriminated `QuoteRejectedOptions` union.
- `0dec8b37` Address PR review on quoteSwap guard — reject `minAcceptableAmount = 0`, rewrite slippage math as subtract-then-floor so it stays correct above `MAX_SAFE_INTEGER / 10000`; thread `cause` through autopilot wrap.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — `Version` row bumped `0.4.27 → 0.4.28`; Monorepo workspace table now lists `@arkade-os/sdk 0.4.28` + `@arkade-os/boltz-swap 0.3.33`; new "Wallet Restore / Discovery" entry in Key Concepts covering the full `Wallet.restore` flow (HD detection via `instanceof HDDescriptorProvider`, `scanContracts` gap-limit loop, `SCAN_MAX_INDEX = 10_000` cap, lighter `persistAndWatchContract` perf path, monotonic `advanceLastIndexUsed`, coalesce-before-validate semantics, `dispose()` draining `_restoreInFlight`, `pickActiveReceive` HD-index tiebreak), and the `WALLET_RECEIVE_SOURCE` extraction + new public exports (`Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError`).
- `docs/projects/ts-sdk/system/project_overview.md` — Package row Version `0.4.27 → 0.4.28`; Monorepo Layout table versions updated; Core Features table adds a "Wallet Restore / Discovery" row summarising the new public API.
- `docs/projects/ts-sdk/system/architecture.md` — Module Structure entries updated: `wallet.ts` (adds `restore()` flow + dispose drain + instanceof HD detection + lazy static descriptor); `walletReceiveRotator.ts` (`pickActiveReceive` HD-index tiebreak + `WALLET_RECEIVE_SOURCE` re-export note + `deriveDescriptorLeafPubKey` extraction); `hdDescriptorProvider.ts` (public `materializeDescriptorAt` + monotonic `advanceLastIndexUsed`); `identity/descriptor.ts` (now hosts `deriveDescriptorLeafPubKey`); `contracts/types.ts` (adds `Discoverable` + `DiscoveryDeps` + `DiscoveredContract` + `isDiscoverable`); new `contracts/metadata.ts` entry (dependency-free leaf for `WALLET_RECEIVE_SOURCE`); `contracts/contractManager.ts` (`scanContracts` gap-limit loop, `SCAN_MAX_INDEX` cap, `persistAndWatchContract` perf path); new `contracts/handlers/default.ts` + `contracts/handlers/delegate.ts` entries documenting `discoverAt` implementations.
- `docs/INDEX.md` — ts-sdk Key Capabilities adds the Wallet Restore / Discovery bullet (full feature paragraph); Tags add `wallet-restore`, `gap-limit-discovery`, `discoverable-handler`, `scan-contracts`.

**Notes**:
- **No public API breaking changes** for existing consumers — `Wallet.restore()` is a new, opt-in method; `DescriptorProvider` interface itself is unchanged (`materializeDescriptorAt` / `advanceLastIndexUsed` live on the concrete `HDDescriptorProvider` class, not the interface).
- Restore is **explicit, never automatic** — `Wallet.create()` does not call `restore()`; callers wanting gap-scan recovery must invoke it deliberately. This matches the dotnet-sdk's `Restore()` design.
- `SCAN_MAX_INDEX = 10_000` is intentionally a hard ceiling rather than a configurable parameter: it bounds a buggy/malicious Discoverable handler returning unconditional hits (would otherwise hang the wallet) and refuses to silently truncate a fund-recovery scan.
- `restore()` is **safe to call from multiple sites** — concurrent callers coalesce on `_restoreInFlight`; second caller's `gapLimit` is silently ignored (documented behaviour, validated by the in-flight-coalesce regression test).
- `@arkade-os/boltz-swap` cuts `0.3.33` in the same release because `pnpm run release -- all patch` was used. The boltz-swap quoteSwap guard is the boltz-swap-side highlight; ts-sdk consumers of boltz-swap (Lightning swap, chain swap) automatically get the new typed `QuoteRejectedError` + slippage controls once they bump.
- `@ungap/structured-clone >=1.3.1` override is a transitive-only fix (no SDK source change); the upstream advisory is CWE-502 on 1.3.0, pulled in via expo. Override is at the workspace-root `pnpm-workspace.yaml` `overrides` block so both packages pick it up uniformly.

---

## 2026-05-22 - Monorepo restructure: ts-sdk + boltz-swap unified under `packages/*`
**From**: `029a988d0cae1ba9e35a3a10d7f0b0cc37cce26b`
**To**: `2fc8a3ff5adb14c87cf57586bddcf287ce4bfff6`
**Synced By**: update-project skill
**Status**: The single-package `@arkade-os/sdk` repository has been re-shaped into a **pnpm workspace monorepo** that vendors `@arkade-os/boltz-swap` as a sibling package. The two packages keep independent `package.json` `version`s (`@arkade-os/sdk` `0.4.27`, `@arkade-os/boltz-swap` `0.3.32`) but share devDependencies, prettier config, tsup config, regtest harness, and a coordinated `scripts/release.sh` driver. **No public TypeScript API changes for `@arkade-os/sdk` consumers** — only repo-local tooling, file paths, and CI scripts moved. Downstream apps installing `@arkade-os/sdk` from npm are unaffected.

**Commits analyzed** (high signal — the full range carries ~280 non-merge commits because the boltz-swap history was grafted in; ~30 commits below are the load-bearing structural ones):

*Monorepo scaffolding & migration:*
- `90e5de32` Add monorepo scaffolding (workspace, root configs, CI) — `pnpm-workspace.yaml`, root `package.json` with `pnpm -r` aggregate scripts, root `prettier`/`tsconfig` bases.
- `d74cc004` Move `@arkade-os/sdk` under `packages/ts-sdk/` for monorepo layout — all `src/`, `test/`, `tsup.config.ts`, `vitest.config.ts`, `scripts/smoke-dist.mjs`, `package.json`, `tsconfig.json`, `CHANGELOG.md`, etc. relocated; npm-published path inside the tarball unchanged.
- `d1b4070a` Adapt boltz-swap for monorepo (hoist per-package files, workspace dep) — boltz-swap's git history rewritten in; `packages/boltz-swap/package.json` declares `@arkade-os/sdk: workspace:*`.

*Shared config + devDep hoisting:*
- `bf5a5137` refactor: dedupe boltz-swap against ts-sdk — boltz-swap reuses ts-sdk's tsup base, `tsconfig` base, and prettier config; eliminates duplicated build scaffolding.
- `1900c8b6` refactor(config): wire shared base configs — root `tsconfig.base.json` + `prettier` config + tsup shared base. Per-package configs extend the root.
- `e7835101` chore: hoist tsup; add boltz-swap typecheck — `tsup` moved to root devDeps; boltz-swap gets a `pnpm typecheck` step matching ts-sdk's, gated in CI.
- `42f5133a` chore: hoist shared devdeps and drop per-package leftovers — `vitest`, `@types/node`, `husky`, `prettier`, `typescript`, `tsup`, `fake-indexeddb`, `eventsource` all hoisted to root; per-package `node_modules` keep only package-unique deps.
- `26f1cb29` style: apply root prettier config across packages — single repo-wide format pass.
- `919d0d1d` chore: move pnpm settings to pnpm-workspace.yaml — `onlyBuiltDependencies` (`better-sqlite3`, `canvas`, `sqlite3`, `@arkade-os/sdk`), `ignoredBuiltDependencies`, and `overrides` (`esbuild >=0.25.0`, `brace-expansion`, `minimatch`) consolidated.
- `8c3283ef` refactor(types): single bip68 ambient declaration — `bip68.d.ts` hoisted to a single root-level declaration consumed by both packages (was duplicated per-package).
- `615d128d` chore: hygiene pass on repo root — removes orphaned files left over from the single-package layout.

*Release flow:*
- `843502e1` chore(release): unify versions and release both packages in lockstep — first attempt at coordinated releases; both packages get the same version bump.
- `cd29cda3` chore: package-scoped releases — supersedes lockstep with **package-scoped release CLI**: `pnpm run release -- sdk patch` (SDK + dependent boltz-swap patch), `pnpm run release -- boltz-swap patch` (Boltz-only bugfix), `pnpm run release -- sdk prepatch --preid beta` (mirrors prerelease into boltz-swap), `pnpm run release -- all patch` (bump both). Driver is `scripts/release.sh` → `scripts/release.mjs`.
- `15ee8c63` chore(release): run pnpm test:unit before publish — release script gates publish on `pnpm test:unit` (monorepo-wide).
- `7eb819d7` Address review comments 1,2,5 — release-flow polish.

*Node + CI:*
- `2ca08e3f` Bump Node to 24.15.0 LTS, add `.nvmrc` — root `engines.node` = `>=24.15.0 <25` (publishable `@arkade-os/sdk` still ships with the widened `>=22.12.0 <25` consumer range from #495).
- `7bf8d386` Update CI jobs to use new scripts — CI invokes root-level `pnpm build` / `pnpm test:unit` / `pnpm test:integration` (which fan out to both packages via `pnpm -r`).
- `3555a9a4` ci: smoke boltz-swap dist; restore next, engines, regtest cache key — boltz-swap now runs its own `pnpm smoke:dist` post-build (mirrors ts-sdk's #496 smoke step); cache key includes the regtest submodule pin.
- `fdf5c04e` ci: run boltz-swap typecheck after build — `pnpm typecheck` per package, gated before tests.
- `80c75eee` Fix e2e tests — alignment fixes for the new monorepo path layout.

*Boltz-swap upgrades carried in (no `@arkade-os/sdk` impact):*
- `e0837dbf` Upgrade ts-sdk 0.4.27 (inside boltz-swap), `57ac8916` release 0.3.32, `67683b13` release 0.3.31, `e019ba06` release 0.3.30, plus older 0.3.x releases grafted from boltz-swap's prior history.
- `4a680abd` fix(boltz-swap): poll swap status when WebSocket fails, `1e53b733` test(boltz-swap): isolate swap repo and extend slow timeouts, `2234ab30` Recover from half-initialized ArkadeSwaps handler after SW restart, `30394562` fix: isolate expo-task-manager/expo-background-task to `/expo/background`, `fd756129` chore: declare optional Expo peers and test removed-field guard.

*Documentation:*
- `a434417b` docs: clarify authoritative ai guidance, `c284c6fc` docs(sdk): add worker README index, `5fb76c0f` docs: align typedoc output with monorepo layout, `68b353e1` docs(boltz-swap): fix expo setup and swap migration guidance, `ae5be443` docs(sdk): update examples for bigint assets and current repositories, `100c257a` docs: replace stale package-local development instructions, `9785f9e7` docs: fix monorepo command and architecture guidance — `AGENTS.md` / `CLAUDE.md` / `FOUNDATION.md` rewritten as monorepo-aware guides (Commands section now monorepo-wide + per-package `pnpm -C packages/<pkg>`).

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference adds `Repo Layout` row (pnpm workspace monorepo, `packages/ts-sdk/` + `packages/boltz-swap/`); `Package Manager` row updated to `pnpm 10.25.0` (was `10.29.2`); `scripts` frontmatter rewritten to be monorepo-aware (root `pnpm build` / `pnpm test:unit` / `pnpm lint` fan out via `pnpm -r`; package-scoped commands documented via `pnpm -C packages/ts-sdk <script>`; `release` entry shows the new package-scoped CLI form); new "Monorepo Layout" section near the top.
- `docs/projects/ts-sdk/system/project_overview.md` — Adds **Monorepo Layout** section at the top noting the workspace shape and the boltz-swap sibling; Package row clarifies the npm-published artifact is `packages/ts-sdk/` (publish path unchanged); Technology Stack `Package Manager` row updated to `pnpm 10.25.0` workspace (was `10.29.2`); release section notes the package-scoped CLI.
- `docs/projects/ts-sdk/system/architecture.md` — Module Structure header prefixed with `packages/ts-sdk/` (was top-level `src/`); new **Repo Layout** section at the top showing `packages/ts-sdk/`, `packages/boltz-swap/`, root `scripts/regtest.sh`, hoisted devDeps, shared `tsconfig.base.json` / `prettier` / `tsup` base.
- `docs/projects/ts-sdk/sop/development-workflow.md` — Prerequisites bumps pnpm to `>=10.25.0 <11`; Setup section notes `pnpm install` at the repo root installs both packages; Building section adds per-package syntax (`pnpm -C packages/ts-sdk build`) alongside the root aggregate; Testing section adds `pnpm -C packages/ts-sdk test:unit` and the root `pnpm test:integration:ts-sdk` / `pnpm test:integration:boltz-swap`; Releasing section rewritten for the package-scoped CLI (`pnpm run release -- sdk patch` / `boltz-swap patch` / `all patch`, `--preid beta` for prereleases, gated on `pnpm test:unit`).
- `docs/projects/ts-sdk/testing/how_to_run.md` — Install notes `pnpm install` at the repo root; Build section adds per-package alternative (`pnpm -C packages/ts-sdk build`); Regtest section replaces the deprecated `pnpm test:up-docker` / `pnpm test:down-docker` script names with the root-level `pnpm regtest:up:ts-sdk` / `pnpm regtest:setup:ts-sdk` / `pnpm regtest:down:ts-sdk` (and `pnpm test:integration:ts-sdk` for the full `cycle`); package-local script names (`pnpm -C packages/ts-sdk regtest:start` / `regtest:stop` / `regtest:clean` / `regtest`) noted for in-package invocation.
- `docs/projects/ts-sdk/testing/how_to_test.md` — Running Tests section adds per-package syntax (`pnpm -C packages/ts-sdk test:unit`); Integration Tests rewrites `pnpm test:up-docker` → root `pnpm regtest:up:ts-sdk` (and per-package `pnpm -C packages/ts-sdk regtest:start`); notes the unified `scripts/regtest.sh <pkg> <action>` driver.
- `docs/INDEX.md` — ts-sdk Active Dev row prefixes the existing changelog narrative with the monorepo restructure (workspace shape, package-scoped release CLI, hoisted devDeps, shared configs); Tags add `monorepo`, `pnpm-workspace`, `boltz-swap-sibling`.

**Notes**:
- **No published `@arkade-os/sdk` source changes.** Every `src/` modification in `packages/ts-sdk/src/` already shipped in the 0.4.27 cut (or the post-0.4.27 unreleased changes documented in earlier sync entries: #487 Expo subpath split, #495 Node 24, #496 tsup migration, etc.). The structural changes in this sync are repo tooling only.
- The `package.json` `version` of `@arkade-os/sdk` remains `0.4.27`; no new release cut.
- The `package.json` `version` of `@arkade-os/boltz-swap` reads `0.3.32` — the most recent release at HEAD inside the monorepo.
- Root `engines.node` is intentionally narrower (`>=24.15.0 <25`) than the published `@arkade-os/sdk` `engines.node` (`>=22.12.0 <25`) so contributors develop on Node 24 while downstream consumers on Node 22.x remain supported.
- The `pnpm-workspace.yaml` `overrides` (`esbuild >=0.25.0`, `brace-expansion ^2.0.2`, `minimatch 9.0.3`) close known transitive vulnerability advisories without forcing direct devDep churn in either package.
- Pre-monorepo boltz-swap history (~150 commits, `0.1.x` through `0.3.31`) is grafted into the unified history; releases prior to `0.3.30` predate the monorepo and are documented under the `boltz-swap` project for context.

---

## 2026-05-21 - Build migration to tsup (#496)
**From**: `c0442fbf3aaafba226400981d15bbb14c658622e`
**To**: `029a988d0cae1ba9e35a3a10d7f0b0cc37cce26b`
**Synced By**: update-project skill
**Status**: One build-system PR landed on `main` after the post-0.4.27 batch. Replaces the multi-step `tsc + post-processors` build chain with a single `tsup` invocation. Output dist layout changed (flat `dist/*.js|*.cjs|*.d.ts|*.d.cts` instead of `dist/{esm,cjs,types}/` subdirectories); `package.json` `main` / `module` / `types` / `exports` updated accordingly. No `version` cut — `package.json` still reads `"0.4.27"`. No public TypeScript API changes; downstream consumers using documented `exports` paths are unaffected.

**Commits analyzed** (1 non-merge commit):
- `029a988` Migrate from tsc + post-processors to tsup (#496) — replaces 6 `tsc` invocations (`build:esm`, `build:cjs`, `build:types`, `build:expo:esm`, `build:expo:cjs`, `build:expo:types`) plus `scripts/add-extensions.js` + `scripts/generate-package-files.js` + `scripts/build-browser.js` with a single `pnpm build → tsup` step (dual ESM+CJS, per-entry `.d.ts` / `.d.cts`, source maps, `splitting: true`, `treeshake: true`, target `es2022`). Drops devDeps `esbuild`, `glob`, `rimraf` (tsup brings them); adds `tsup ^8.5.0`. New `pnpm typecheck` script (`tsc --noEmit`) wired into CI before build. New `scripts/smoke-dist.mjs` post-build verification asserts: every `package.json` `exports` target (and `main`/`module`/`types`) exists on disk, every relative import in `dist/**/*.d.{ts,cts}` resolves, CJS + ESM `contractHandlers` singleton identity holds across the root entry and the `contracts/handlers` entry with registered types exactly `{default, delegate, vhtlc}`, each Node-safe public subpath resolves via `@arkade-os/sdk`'s exports through a symlinked consumer, and `wallet/expo/background` stays structural-only (would eagerly require optional Expo peers at module init otherwise). Smoke step wired into CI as `pnpm run smoke:dist` after `pnpm build`, plus `npm pack --dry-run --ignore-scripts` to verify publish shape without re-running prepack. `tsconfig.json` bumped target `es2020 → es2022`, `moduleResolution: node → bundler`, set `noEmit: true` (now used only for typecheck) — `tsconfig.cjs.json` / `tsconfig.esm.json` / `tsconfig.expo.json` deleted, so the previous conditional Expo build (`build:expo:check`) is gone; build is unconditional. `src/index.ts` bypasses the `contracts/index.ts` and `repositories/index.ts` barrels (imports directly from the defining modules) to suppress Rollup chunk-circularity warnings in tsup's dts emit when `splitting: true` is on; adds a bare side-effect import `import "./contracts/handlers"` so handler registration survives tree-shaking. `sideEffects` array expanded to include both `src/` and the new flat `dist/` paths (`.js` + `.cjs`). `src/wallet/expo/expo-modules.d.ts` extended to cover `expo-sqlite` (boltz-swap's ambient `.d.ts` pattern, now covering all three soft-optional Expo peers); the prior tsconfig `exclude` of `src/repositories/indexedDB/websqlAdapter.ts` consequently dropped.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference `Build Output` row clarified to flat `dist/` layout (per-entry `.js` / `.cjs` + `.d.ts` / `.d.cts`); `scripts` frontmatter adds `typecheck: "pnpm typecheck"` and `smoke_dist: "pnpm smoke:dist"`; Key Concepts gain a "Build (tsup)" entry
- `docs/projects/ts-sdk/system/project_overview.md` — Technology Stack `Build` row rewritten (tsup single-step, dual ESM+CJS, per-entry typings, `es2022`); `Bundler` row added pointing at `tsup ^8.5.0` (devDep)
- `docs/projects/ts-sdk/system/architecture.md` — Build Configuration block updated: target `es2020 → es2022`; output layout flat `dist/` (was `dist/esm/`, `dist/cjs/`, `dist/types/`); `tsup` entry list documented; `splitting: true` + `treeshake: true` rationale noted; post-build `smoke-dist.mjs` verification step added; `expo-modules.d.ts` line gains `expo-sqlite` ambient declaration
- `docs/projects/ts-sdk/sop/development-workflow.md` — Building section: single `pnpm build` (tsup) replaces the multi-step chain; Pre-commit Checklist gains `pnpm typecheck` (now CI-gated before build); Releasing notes that CI runs `smoke:dist` + `npm pack --dry-run` to verify publish shape
- `docs/projects/ts-sdk/testing/how_to_run.md` — Build section output paths updated (flat `dist/`); typecheck + smoke:dist scripts added
- `docs/projects/ts-sdk/testing/troubleshooting.md` — Build Issues: `rm -rf dist/` → `pnpm build` (tsup handles `clean: true` automatically); add a note that smoke:dist failures indicate dist shape regression (run locally with `pnpm smoke:dist`)
- `docs/INDEX.md` — ts-sdk Active Dev row gains a `tsup`-migration paragraph (single-step build, per-entry `.d.cts`, post-build `smoke-dist.mjs` + `npm pack --dry-run` CI gates, dropped `esbuild`/`glob`/`rimraf` devDeps); Tags add `tsup`, `dist-smoke-test`

**Notes**:
- No new `version` cut — `package.json` still reads `"0.4.27"`. The next published version will carry the build-system migration.
- No public TypeScript API changes — downstream consumers using documented `exports` subpaths are unaffected. The dist layout change only matters to consumers reaching into `dist/` directly (which they shouldn't).
- `pnpm-lock.yaml` was touched (devDep churn): `tsup` + transitive deps in, `esbuild` / `glob` / `rimraf` out.
- The `splitting: true` + `treeshake: true` config is load-bearing: it keeps `contractHandlers` a single runtime instance across all entries — the smoke test asserts singleton identity across both formats.

---

## 2026-05-20 - Post-0.4.27: Expo background-task subpath split (#487) + Node 24 LTS (#495)
**From**: `07785478edf31f2d0683f5664c1b5aa002d9eb6e`
**To**: `c0442fbf3aaafba226400981d15bbb14c658622e`
**Synced By**: update-project skill
**Status**: Two PRs landed on `main` after the 0.4.27 release tag; `package.json` `version` still reads `0.4.27` (no new version cut yet). Both changes are user-visible — one is breaking for Expo callers, the other widens supported Node range.

**Commits analyzed** (2 non-merge commits):
- `97d64ef` chore: upgrade to Node 24 LTS (#495) — adds `.nvmrc` pinned to `24.15.0`; CI workflows (`.github/workflows/ci.yml`, `tsdoc.yml`) bumped to Node 24; `engines.node` widened from `>=22.12.0 <23` to `>=22.12.0 <25` so downstream consumers still on Node 22.x are not broken (the PR explicitly widened the range as a follow-up fix in the same merge).
- `c0442fb` fix(wallet/expo): isolate expo-task-manager/expo-background-task to /wallet/expo/background (#487) — fixes #486. Splits background-task helpers out of `/wallet/expo` into a new `@arkade-os/sdk/wallet/expo/background` subpath (new `package.json` `exports` entry). The previous shape lazy-`require()`-d `expo-task-manager` / `expo-background-task` from inside `/wallet/expo` so they were invisible to Metro's static dependency collector and never entered the bundle graph. The new subpath uses static imports (Metro sees them) and isolates the imports to the only module that needs them so react-native-web and Node consumers using `/wallet/expo` don't pull the two native peer deps. **Breaking for Expo callers**: `defineExpoBackgroundTask` / `registerExpoBackgroundTask` / `unregisterExpoBackgroundTask` and `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig` are no longer re-exported from `/wallet/expo`; `ExpoWallet.setup()` no longer registers the OS scheduler, and `dispose()` no longer unregisters it — consumer must call `registerExpoBackgroundTask(taskName, { minimumInterval })` after `setup()` and `unregisterExpoBackgroundTask(taskName)` before `dispose()`. `background` config dropped `taskName` + `minimumBackgroundInterval` (TS compile error on removed fields; JS callers must update manually — fields are silently ignored and the OS task never runs). New `src/wallet/expo/expo-modules.d.ts` carries ambient declarations for the subset of `expo-task-manager` / `expo-background-task` APIs `background.ts` actually uses, so `tsc` type-checks without pulling the optional peer deps into the build. `src/worker/expo/README.md` rewritten with the new usage shape and a Before/After table.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Key Concepts gain "Expo Subpath Split" and "Node Engines" entries; existing concepts untouched
- `docs/projects/ts-sdk/system/project_overview.md` — Core Features `Expo/React Native` row rewritten with the breaking-change details; Technology Stack adds a `Node` row (Node 24 LTS + widened `engines.node`); Export Paths table adds `/wallet/expo` and the new `/wallet/expo/background`
- `docs/projects/ts-sdk/system/architecture.md` — module tree gains `wallet/expo/{index,wallet,background,expo-modules.d.ts}.ts` subtree with annotation; Build Configuration adds bullets for the Expo subpath split and the Node engine bump
- `docs/projects/ts-sdk/sop/development-workflow.md` — Prerequisites Node version 18+ → Node 24 LTS (`.nvmrc` → `24.15.0`)
- `docs/projects/ts-sdk/testing/how_to_run.md` — Prerequisites Node version 18+ → Node 24 LTS
- `docs/INDEX.md` — ts-sdk Active Dev row prefixes the existing 0.4.27 release paragraph with the two post-release changes (Expo subpath split + Node 24); Tags add `expo-background-task`, `metro-bundler`, `node-24`

**Notes**:
- No new `version` cut — `package.json` still reads `"0.4.27"`. The next published version will carry both changes.
- `pnpm-lock.yaml` was not touched by either commit.
- Breaking change is **Expo callers only**; non-Expo consumers (Node, browser, RN-web, service worker) keep working unchanged on `/wallet/expo`.
- The `engines.node` widening (`<25`) is intentional — pinning to Node 24 only would break downstream apps that still run Node 22.x; the SDK itself develops on 24 (via `.nvmrc`) but ships compatible with both.

---

## 2026-05-18 - Release 0.4.27 (version bump only)
**From**: `d663d158bdf90354a15fd6878c482026f40ea2a0`
**To**: `07785478edf31f2d0683f5664c1b5aa002d9eb6e`
**Synced By**: update-project skill
**Status**: Documentation refreshed for 0.4.27 release — package.json-only bump, no source changes

**Commits analyzed** (1 non-merge commit):
- `0778547` chore: release 0.4.27 — `package.json` `version` 0.4.26 → 0.4.27 (single-line change, no other files touched)

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference `Version` row 0.4.26 → 0.4.27
- `docs/projects/ts-sdk/system/project_overview.md` — Package block `Version` 0.4.26 → 0.4.27
- `docs/INDEX.md` — ts-sdk status row leads with `v0.4.27` (was `v0.4.26`); reframed the previously "post-0.4.26" feature paragraph as the 0.4.27 release contents (package.json-only bump, no source changes since 0.4.26)

**Notes**:
- Pure release-tag commit: only `package.json` `"version"` changed (0.4.26 → 0.4.27), no source / scripts / docs / tests / lockfile touched
- All public surface descriptions in master `docs/INDEX.md` (the long ts-sdk status row covering `ExtendedContractVtxo`, `ContractWatcher` extend-path typing, `DelegatorManager.delegate` `isAnnotated` guard, `extractArkProviderUrl`, HD receive rotation via `WalletReceiveRotator`, `InputSignerRouter`, `WalletConfig.walletMode`, `ServiceWorkerWalletMode`, baseline multi-timelock anchoring, exponential rotate backoff, `NonRangeableDescriptorError`, signing-router typed errors, `Wallet.offchainTapscript` getter, `isHDCapableIdentity`, `prepareUnrollTransaction` fee-rate ceiling, ESM `.d.ts` import rewrites, `as const` defaults, Tier 2 ownership gating, asset bigint amounts, etc.) carry forward unchanged — those features are already in the SDK; this commit just stamps the published version that contains them
- No new tags, capabilities, dependencies, or correlation rows needed for the master index

---

## 2026-05-16 - HD Receive Rotation Re-Merged (#489) + Regtest Submodule Bump (#490)
**From**: `9e53c73a520e3e39ca826d6914fc2a80af8d8cc5`
**To**: `d663d158bdf90354a15fd6878c482026f40ea2a0`
**Synced By**: update-project skill
**Status**: HD receive rotation re-introduced after the #488 revert; signing pipeline reorganised around per-input dispatch

**Commits analyzed** (2 non-merge commits):
- `d663d15` feat(wallet): HD receive rotation via contract repository (reopen of #473) (#489) — bundle of ~25 commits squashed in. Adds `src/wallet/walletReceiveRotator.ts` (~772 lines) owning the `DescriptorProvider`, `vtxo_received` subscription, rotation chain mutex, boot pubkey lookup, contract registration on rotate, exponential backoff (1s → 60s cap) on rotate failures, pluggable `Logger`, and the `NonRangeableDescriptorError` typed fallback signal. `HDDescriptorProvider` now also implements `ReceiveRotatorFactory` (`createReceiveRotator` → `WalletReceiveRotator.defaultBoot`) and exposes `getCurrentSigningDescriptor()`. Adds `src/wallet/inputSignerRouter.ts` to dispatch PSBT inputs to `DescriptorProvider.signWithDescriptor` (rotated `default`/`delegate` contracts using `metadata.signingDescriptor`) or `Identity` (baseline / other / boarding); adds `src/wallet/signingErrors.ts` (`DescriptorSigningProviderMissingError`, `MissingSigningDescriptorError`) re-exported from the package root. `WalletConfig.walletMode: 'auto' \| 'static' \| 'hd' \| DescriptorProvider` (default `'auto'` currently behaves like `'static'` — `TODO(hd-maturation)`). `ServiceWorkerWalletMode = 'auto' \| 'static' \| 'hd'` forwarded through `MessageBus`. `isHDCapableIdentity()` structural type guard added (re-exported from identity barrel). The four descriptor-aware identity methods (`isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`) marked `@deprecated`. `Wallet.offchainTapscript` becomes a getter over a `protected` backing field; only sanctioned writer is `setOffchainTapscriptForRotation` (`@internal`, on `RotatableWallet`). Baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) on every boot regardless of rotation state. Snapshot `offchainTapscript` synchronously at `_txLock` entry in `_sendImpl` / `sendBitcoin` / `updateDbAfterOffchainTx` to close a rotation/transaction race. `prepareUnrollTransaction` `Math.ceil`s `feeRate` before `BigInt(...)` (fractional sat/vB from Esplora / bitcoind regtest no longer throws `RangeError`).
- `f20b671` Upgrade regtest to master (#490) — `regtest` submodule bumped.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Architecture Overview gains `WalletReceiveRotator` + `InputSignerRouter` rows; Key Concepts gain Descriptor Provider ReceiveRotatorFactory note + new HD Receive Rotation, WalletMode, Signing Router sections
- `docs/projects/ts-sdk/system/project_overview.md` — Core Features table refreshed: HD Identity adds the `isHDCapableIdentity` guard, Descriptor Providers adds the opt-in `ReceiveRotatorFactory`, HD Receive Rotation rewritten around the rotator, new Wallet Mode + Per-Input Signing Router rows; Unilateral Exit notes the `Math.ceil(feeRate)` fix
- `docs/projects/ts-sdk/system/architecture.md` — module tree adds `walletReceiveRotator.ts`, `inputSignerRouter.ts`, `signingErrors.ts`; `hdDescriptorProvider.ts`, `hdCapableIdentity.ts`, `wallet.ts`, `unroll.ts` notes updated; new "Receive Rotation Pattern" + "Per-Input Signing Dispatch" sections under Design Patterns
- `docs/INDEX.md` — ts-sdk Key Capabilities + Tags refreshed (`hd-receive-rotation`, `wallet-receive-rotator`, `input-signer-router`, `wallet-mode` added); Active Dev row updated — HD rotation no longer described as reverted, now describes the re-merge in #489 with full mechanism summary

---

## 2026-02-19 - Initial Documentation Setup
**Commit**: `539cc3490729ba2194672595fe0ef577dc730782`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md with features, platforms, export paths
- Added system/architecture.md with module structure, design patterns, crypto deps
- Added system/integration-with-arkd.md documenting REST/SSE transport and settlement flow
- Added testing/usage.md with wallet creation, operations, storage adapters, service worker
- Added testing/how_to_run.md with nigiri/docker-compose setup, examples
- Added testing/how_to_test.md with vitest configuration, test structure, coverage
- Added testing/troubleshooting.md with crypto polyfill, SSE, service worker, VTXO issues
- Added sop/development-workflow.md with build, test, release workflow
- Established sync tracking baseline

**Notes**:
- SDK version 0.3.13 with dual ESM/CJS output
- 5 storage adapters (InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage)
- Expo/React Native support with dedicated providers
- Service worker wallet for background operation
- Asset management (issue, reissue, burn, send)
- VTXO delegation to third-party delegator services
- Use `/update-project ts-sdk` to sync after new commits

---

## 2026-04-29 - Contract Watcher & SSE Refactor (v0.4.21)
**Previous Commit**: `e5e1bd996edb818116949f52fd70fcaedbe26bdf`
**Current Commit**: `273496c2870312ca57339a665c12577a227c99b2`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed to reflect 0.4.21 release

**Commits Analyzed**:
- `273496c` fix: ContractWatcher vtxo event + ContractVtxo type (#462)
- `a5dc8c4` fix: accept Expo SDK 55 unified versions in peer ranges (#463)
- `97cc402` chore: release 0.4.21
- `3661e7e` fix: share single SSE subscription between wallet and ContractWatcher (#457)
- `a86d2d0` Support hardcoded exit delay and arkd info when they differ (#456)
- `bb2bee8` fix(wallet): always init contract manager in script accessors (#459)

**Documentation Changes**:
- Bumped SDK version 0.3.13 → 0.4.21 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`
- Noted Expo SDK 55 unified-major peer support in `system/project_overview.md`

**Notable Source Changes (no architectural redesign)**:
- `ContractVtxo` redefined as `VirtualCoin & Partial<TapLeaves & EncodedVtxoScript>` with `extraWitness` and `contractScript` — no longer extends `ExtendedVirtualCoin`
- `ContractWatcher` now extends raw VTXOs into contract-aware shape via `extendVirtualCoinForContract` before emitting `vtxo_received` / `vtxo_spent`
- Cold-start kick added in `tryUpdateSubscription` so the SSE listener opens promptly when the first contract is added after a zero-script `startWatching`
- `wallet.notifyIncomingFunds` no longer opens its own indexer subscription — piggybacks on the shared `ContractManager` event bus
- `DelegatorManager.delegate` filters out vtxos that don't have a delegate-type tap leaf (cannot be co-signed by the delegator) silently
- `getWalletScripts` / `getScriptMap` always go through `getContractManager` (drops fragile init-state guards), exposing historical default/delegate VTXOs to subscriptions and pending-tx flows on fresh wallets
- Wallet supports hardcoded exit delay and tolerates arkd info divergence

**Notes**:
- No new public APIs; all changes are internal refinements and bug fixes
- Architecture documentation unchanged (module structure, provider/identity/storage patterns are stable)

---

## 2026-05-01 - Release 0.4.22 + regtest image bump
**Previous Commit**: `273496c2870312ca57339a665c12577a227c99b2`
**Current Commit**: `476421605df8bb8f2b4dbc7a61c37941e32947ac`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.22 release

**Commits Analyzed**:
- `4764216` update regtest image (#465)
- `2f8bcf8` chore: release 0.4.22

**Documentation Changes**:
- Bumped SDK version 0.4.21 → 0.4.22 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`

**Notable Source Changes (no architectural redesign)**:
- `package.json` version 0.4.21 → 0.4.22 (release commit only)
- `regtest` submodule pointer updated to `arkade-regtest` master (`3ac33b6`)
- `.env.regtest` overrides realigned for newer arkd 0.9.4 image:
  - `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` → `v0.9.4` (was `v0.9.1`)
  - Removed `ARKD_ALLOW_CSV_BLOCK_TYPE`, `ARKD_BOARDING_EXIT_DELAY=1024`, `ARKD_ROUND_INTERVAL=3`
  - Added `ARKD_BOARDING_EXIT_DELAY=40`, `ARKD_CHECKPOINT_EXIT_DELAY=20`, `ARKD_UNILATERAL_EXIT_DELAY=20`, `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY=20`, `ARKD_VTXO_MIN_AMOUNT=1`

**Notes**:
- No SDK source code changes — release-only commit plus regtest harness alignment
- No public API, architecture, or feature changes; storage/provider/identity layers untouched
- Existing usage, testing, and how-to-run docs remain accurate (regtest stack still launches via `nigiri start --ark` / docker-compose)

---

## 2026-05-02 - HD descriptor provider stack + Electrum onchain provider hardening
**Previous Commit**: `476421605df8bb8f2b4dbc7a61c37941e32947ac`
**Current Commit**: `a0fab06e39245e511dc0cccfeb3ea9c35bf024e8`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for HD descriptor provider work and Electrum provider hardening (no version bump — package.json still 0.4.22)

**Commits Analyzed**:
- `a0fab06` feat(wallet): HDDescriptorProvider (Phase C1) (#440)
- `f705353` test(e2e): integration tests for ElectrumOnchainProvider over regtest (#461)
- `37d03e0` feat(identity): HD wallet primitives on SeedIdentity (#439)

**Documentation Changes**:
- `system/architecture.md`: added `wallet/hdDescriptorProvider.ts` and the new `identity/` files (`hdCapableIdentity.ts`, `descriptor.ts`, `descriptorProvider.ts`, `staticDescriptorProvider.ts`, `serialize.ts`); added `providers/electrum.ts`; rewrote the Identity Abstraction section to explain wildcard-template inputs and added a new Descriptor Provider Pattern section; added `@bitcoinerlab/descriptors-scure` and `ws-electrumx-client` to the crypto/dep table
- `system/project_overview.md`: extended Core Features with descriptor providers and HD receive rotation; added Electrum integration point and noted default URL maps for Esplora and Electrum
- `INDEX.md`: added Descriptor Providers tier in the architecture diagram; added `ElectrumOnchainProvider` next to `EsploraProvider`; updated Key Concepts to mention template-based identities and the descriptor provider allocator
- `testing/usage.md`: added HD Receive Rotation example using `HDDescriptorProvider.create` and an Onchain Providers section showing `EsploraProvider` vs `ElectrumOnchainProvider` with default URL constants
- `testing/how_to_test.md`: noted the new `e2e/electrum.test.ts` alongside `e2e/onchain.test.ts`
- Master `docs/INDEX.md`: expanded ts-sdk capabilities (template-based HD identity, DescriptorProvider allocator with HD/static implementations, ElectrumOnchainProvider with broadcast_package/electrs notes, default endpoint maps); added tags `hd-wallet`, `descriptor-provider`, `electrum`, `esplora`

**Notable Source Changes**:
- `DescriptorProvider` (in `src/identity/descriptorProvider.ts`) is now a pure allocator: `getNextSigningDescriptor(): Promise<string>` plus `isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`. No "current" read accessor — that lives on the contract repository
- `StaticDescriptorProvider` wraps a legacy `Identity` for single-key flows; `HDDescriptorProvider` (in `src/wallet/hdDescriptorProvider.ts`) handles HD receive rotation. State is `{ descriptor, lastIndexUsed }` under `WalletState.settings.hd`; index allocation happens inside the per-repo `updateWalletState` mutex so two provider instances on the same repo never observe the same index. First allocation returns index 0; descriptor-mismatch guard refuses HD state written by a different seed
- New `HDCapableIdentity` / `ReadonlyHDCapableIdentity` capability markers (`src/identity/hdCapableIdentity.ts`); `SeedIdentity` `implements HDCapableIdentity` and no longer `implements DescriptorProvider`. `MnemonicIdentity` extends `SeedIdentity`; `ReadonlyDescriptorIdentity` `implements ReadonlyHDCapableIdentity`
- **Public surface change**: identities now consume a wildcard descriptor template (`tr(.../0/*)`); `identity.descriptor` returns the template (was the index-0 materialization). The wire format also stores the template, but `hydrateIdentity` chops back via `templateOf` so older envelopes carrying concrete `/N)` descriptors still deserialize. Constructors validate the template and reject non-wildcard inputs
- Shared descriptor helpers in `src/identity/descriptor.ts` (`isMainnetDescriptor`, `descriptorIsOurs`, `parseHDDescriptor`, etc.) — most thin wrappers were eventually inlined onto `expand()` / `canonicalExpression` / `isRanged` from `@bitcoinerlab/descriptors-scure`, which now does wildcard substitution, BIP86 template construction (`scriptExpressions.trBIP32`), and ranged/non-ranged classification natively
- `ElectrumOnchainProvider` (`src/providers/electrum.ts`) hardened for cross-server compatibility: dropped `verbose` `transaction.get` (electrs unsupported), uses raw-tx parsing for exact sat outputs, adopts `WsElectrumChainSource.safeBatchRequest` everywhere to avoid the orphan-rejection leak in `ws-electrumx-client.batchRequest`, and tolerates electrs's "missingheight" index-lag race in `historyToExplorerTxs`, `getTxStatus`, and `fetchTxMerkle` (block_time degrades to 0 in that window; confirmation status is still authoritative)
- New default URL maps exported from the SDK barrel: `ESPLORA_URL` (Ark Labs mempool: `mempool.arkade.sh`, `mempool.signet.arkade.sh`, `mempool.mutinynet.arkade.sh`), `ELECTRUM_WS_URL` (Ark Labs Fulcrum 2.1 with `broadcast_package` support for bitcoin/signet/mutinynet; testnet → Blockstream; regtest → `ws://localhost:50003`), `ELECTRUM_TCP_HOST` (informational, ports 50001/50002/50003)
- New `test/e2e/electrum.test.ts` covers every method on `OnchainProvider` against nigiri's electrum-ws bridge (port 50003); regtest submodule pin temporarily points at `arkade-regtest#12` (NIGIRI_BRANCH=electrum-ws-bridge) until that PR merges; unit suite up to 1024 passing with 49 electrum tests

**Notes**:
- No package version bump (still `0.4.22`); no public-facing rename of identity options — `DescriptorOptions` and `ReadonlyDescriptorIdentity.fromDescriptor` retained their pre-existing names
- The semantic shift (identities now hold a *template*, not a concrete descriptor) is a breaking constructor-input change but the field name stayed the same

---

## 2026-05-04 - Default to bitcoin mainnet + arkade.computer
**Previous Commit**: `a0fab06e39245e511dc0cccfeb3ea9c35bf024e8`
**Current Commit**: `0b45841414d8ef8c969af34523ca20365b77ee83`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for mainnet-default UX change (no version bump — still 0.4.22)

**Commits Analyzed**:
- `0b45841` feat: default to bitcoin mainnet + arkade.computer (#460)

**Documentation Changes**:
- `system/project_overview.md`: added a "Mainnet Defaults" row to the Core Features table covering `DEFAULT_ARKADE_SERVER_URL`, `DEFAULT_ARKADE_HRP`, `DEFAULT_NETWORK_NAME`, and the `getArkadeServerUrl` helper
- `INDEX.md`: added a Key Concepts entry describing the mainnet-default behavior across `Wallet.create`, `ReadonlyWallet.create`, `ServiceWorkerWallet.create`, `OnchainWallet.create`, `ArkAddress`, and `contractFromArkContractWithAddress`
- `testing/usage.md`: simplified the basic Quick Start, Watch-Only, and Service Worker examples to omit `arkServerUrl` (mainnet default); added an `OnchainWallet (Mainnet Default)` snippet showing the optional `networkName`; kept an explicit mutinynet override example
- Master `docs/INDEX.md`: added Mainnet Defaults capability bullet and `mainnet-default` tag for `ts-sdk`

**Notable Source Changes**:
- New constants exported from `src/wallet/index.ts`: `DEFAULT_ARKADE_SERVER_URL = "https://arkade.computer"`, `DEFAULT_ARKADE_HRP = "ark"`, `DEFAULT_NETWORK_NAME = "bitcoin"`
- New helper `getArkadeServerUrl({ arkServerUrl })` exported from `src/wallet/wallet.ts` — returns `arkServerUrl || DEFAULT_ARKADE_SERVER_URL`
- `Wallet.create` / `ReadonlyWallet.create`: dropped the `"Either arkProvider or arkServerUrl must be provided"` throw; `RestArkProvider` now constructs from `getArkadeServerUrl(config)` when no provider/url is supplied
- `ServiceWorkerWallet.create` / `ServiceWorkerReadonlyWallet.create`: `arkServerUrl` parameter is now optional; both `INIT_WALLET` and `INITIALIZE_MESSAGE_BUS` payloads are routed through `getArkadeServerUrl(options)`
- `OnchainWallet.create(identity, networkName?)`: `networkName` now defaults to `DEFAULT_NETWORK_NAME` (`"bitcoin"`)
- `ArkAddress` constructor: `hrp` parameter defaulted to `DEFAULT_ARKADE_HRP` (`"ark"`)
- `contractFromArkContractWithAddress(encoded, serverPubKey, addressPrefix?)`: `addressPrefix` defaulted to `DEFAULT_ARKADE_HRP`
- New tests assert mainnet defaults for `ArkAddress`, `contractFromArkContractWithAddress`, `ReadonlyWallet.create`, `OnchainWallet.create`, `ServiceWorkerWallet.create`, and `ServiceWorkerReadonlyWallet.create`

**Notes**:
- Backwards compatible: explicit `arkServerUrl` / `networkName` / `hrp` arguments still work as before
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are unchanged
- No package.json version bump; release-tagged 0.4.22 still applies

---

## 2026-05-05 - Release 0.4.23: bigint asset amounts (breaking) + anchor/sequence helper exports
**Previous Commit**: `0b45841414d8ef8c969af34523ca20365b77ee83`
**Current Commit**: `d0ee956e80acc68d61eb0e274e896da0845d0d51`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.23 release

**Commits Analyzed**:
- `d0ee956` chore: release 0.4.23
- `d25866e` feat: export anchor helpers (#468)
- `36fa1b5` fix!: represent asset amounts as bigint (alt to #469) (#472)

**Documentation Changes**:
- Bumped SDK version 0.4.22 → 0.4.23 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status table)
- `INDEX.md`: extended Assets Key Concept with the bigint type change + persistence note; added "Anchor / Sequence Helpers" Key Concept covering the new `TxWeightEstimator` / `VSize` / `timelockToSequence` / `sequenceToTimelock` exports
- `system/project_overview.md`: rewrote Asset Management Core Features row to call out the breaking bigint change and the new `serializeAssets` / `deserializeAssets` persistence path; added Anchor / Sequence Helpers Core Features row
- `system/architecture.md`: added `utils/txSizeEstimator.ts` and `repositories/serialization.ts` (with the new `SerializedAsset` / asset round-trip helpers) to the module layout
- `testing/usage.md`: rewrote the Asset Management snippet so all amounts are bigint literals (`1000n`, `100n`); added explanatory comment and reissue/burn examples for the new bigint API
- Master `docs/INDEX.md`: rewrote the Asset Management capability bullet for ts-sdk to flag the breaking change + persistence layer; added new "anchor / sequence helpers" capability bullet; added `bigint-assets` tag; expanded the project status row with the 0.4.23 highlights

**Notable Source Changes**:
- **Breaking** (`#472`): `Asset.amount` and `AssetDetails.supply` change from `number` to `bigint`; `IssuanceParams.amount`, `ReissuanceParams.amount`, and `BurnParams.amount` likewise switch to `bigint`. Reason: real-world asset supplies routinely exceed `Number.MAX_SAFE_INTEGER` (2^53 - 1) and silent truncation in arithmetic would corrupt balances. `Recipient.amount` (BTC sats) stays `number` — it's typed `number` everywhere
- Cascade across `providers/` (indexer, expoIndexer parse `BigInt(a.amount)` from JSON), `utils/transactionHistory.ts` (aggregation maps now `Map<string, bigint>` with `0n` neutral), `wallet/wallet.ts` (`getBalance`, `send` change-output accounting), `wallet/asset.ts` (greedy selection sort returns -1/0/1 from a bigint diff), `wallet/asset-manager.ts` (drops redundant `BigInt(...)` casts), `wallet/delegator.ts`, `wallet/validation.ts`, and `wallet/serviceWorker/wallet-message-handler.ts` (GET_BALANCE map switch)
- New `SerializedAsset = { assetId: string; amount: string }` type and `serializeAssets` / `deserializeAssets` helpers in `src/repositories/serialization.ts`. JSON.stringify cannot serialize bigint, so on-disk shape persists the amount as a decimal string. `deserializeAsset` accepts `string | number | bigint` so legacy on-disk data (number-shaped) round-trips without migration; an unsafe-integer guard rejects out-of-range legacy numbers with a re-sync hint
- Wired through SQLite (`src/repositories/sqlite/walletRepository.ts`), Realm (`src/repositories/realm/walletRepository.ts`), the legacy migration impl (`src/repositories/migrations/walletRepositoryImpl.ts`), and the `ArkTransaction` shape via new `serializeTransaction` / `deserializeTransaction` helpers — covers vtxos and transaction history alike
- New top-level exports from `src/index.ts` (`#468`): `TxWeightEstimator` and `VSize` type from `utils/txSizeEstimator.ts`; `timelockToSequence` and `sequenceToTimelock` from `contracts/handlers/helpers` (BIP68 sequence ↔ custom `RelativeTimelock` round-trip)
- Test fixture sweep: `test/e2e/ark.test.ts`, `test/transactionHistory.test.ts`, `test/sqlite-wallet-repository.test.ts`, `test/realm-wallet-repository.test.ts` — all asset-amount fixtures and assertions migrated to `Nn` literals; `IssuanceParams.amount` test-side variables (`issueAmount`, `reissueAmount`, `burnAmount`) likewise. e2e numeric literals in 12 specific call sites that flow into asset-amount params were fixed (test files are excluded from typecheck so the compiler couldn't catch them)
- Migration UX: TypeScript flags every existing `Asset.amount` / `AssetDetails.supply` / params arithmetic site at the call site, pointing callers at the change. Callers that genuinely need a `number` (e.g. for display) must call `Number(...)` explicitly when the value fits

**Notes**:
- Breaking change: any caller doing arithmetic on `asset.amount` / `assetDetails.supply` as a number will now get a TS error and must migrate to bigint (or coerce explicitly with `Number(...)` when safe). Persistence is forward + backward compatible — no data migration step needed
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- New helper exports are additive; no rename or removal in this release

---

## 2026-05-06 - BIP68 helper consolidation + repo agent guides + refreshVtxos cursor fix
**Previous Commit**: `d0ee956e80acc68d61eb0e274e896da0845d0d51`
**Current Commit**: `b9f3466871f5ba1bb31b7f1d8cc99349ebb63227`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for internal refactor + repo conventions (no version bump — still 0.4.23)

**Commits Analyzed**:
- `b9f3466` docs: add CLAUDE.md and AGENTS.md repo guides (#475) — split into `FOUNDATION.md` (canonical) + thin `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` pointers per Pietro's review; backfilled `CHANGELOG.md` for the 0.4.x line in the section-ordered, bolded-headline + root-cause style
- `bd748c3` fix(wallet): refreshVtxos() forwards an undefined window when no opts (#476)
- `0980a22` tests: enhance VHTLC test fixtures with comprehensive script information (#138)
- `7f59276` refactor(timelock): centralise BIP68 encode/decode helpers (#412)

**Documentation Changes**:
- `system/architecture.md`: added `utils/timelock.ts` to the module map (centralized BIP68 helpers — single `bip68` import site; consumers `script/base.ts`, `script/tapscript.ts`, `utils/unknownFields.ts`, `wallet/wallet.ts`, `wallet/unroll.ts`)
- `sop/development-workflow.md`: added "Repo Guide Files" section pointing to `FOUNDATION.md` (canonical) + `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` (thin pointers via the `@<file>` include directive); added "CHANGELOG Discipline" subsection under Releasing describing the section-ordered, root-cause entry style
- Master `docs/INDEX.md`: not changed — capabilities, tags, dependencies, and 0.4.23 status row remain accurate (this sync is internal refactor + docs only; no public surface change)

**Notable Source Changes**:
- **Refactor (`#412`)**: `timelockToSequence` and `sequenceToTimelock` moved from `src/contracts/handlers/helpers.ts` → `src/utils/timelock.ts` (now the single `bip68` import site in the SDK). Public surface unchanged: both helpers are still re-exported from the package root via `src/index.ts` (just imported from a different internal path). Inline `bip68.encode` / `bip68.decode` call sites in `src/script/base.ts` (`getSequence`), `src/script/tapscript.ts` (`CSVMultisigTapscript.encode` / `decode`), `src/utils/unknownFields.ts` (`VtxoTreeExpiry`), `src/wallet/wallet.ts`, and `src/wallet/unroll.ts` collapsed to use the centralized helpers. Removes the inline `RelativeTimelock` ↔ `bip68` adapter blocks that had been copy-pasted across these modules
- **Bug fix (`#476`)**: `ContractManager.refreshVtxos()` previously forwarded `window: { after: undefined, before: undefined }` even when the caller supplied no options. That truthy-but-empty object short-circuited two things in `syncContracts`: (a) the `options.window ?? computeSyncWindow(cursor)` fallback didn't fire, so the indexer query ran without an `after` filter (every refresh became an unbounded full re-scan); (b) `mustUpdateCursor` requires `options.window === undefined`, which was always false — so the cursor never advanced. Symptom in the wild: a 60-second loop where the auto-settle `pollIntervalMs` would fire, get a 400 `VTXO_ALREADY_SPENT`, fall back to `maybeRefreshAfterVtxoSpent` → `refreshVtxos()`, and download ~2 MB of VTXO history while leaving the cursor pinned. Fix: forward `window` only when at least one of `after` / `before` is supplied. Two regression tests in `test/contracts/manager.test.ts` cover both branches (no-opts must produce a cursor-derived delta query AND advance the cursor; caller-supplied window must NOT advance the cursor)
- **Test fixtures (`#138`)**: `test/fixtures/vhtlc.json` now carries complete `scripts` / `taproot` blocks per receiver-side combination, asserted live against the current `VHTLC.Script` output in `test/vhtlc.test.ts`. Useful as test vectors when another implementation (e.g. rust-sdk) verifies its scripts match. No standalone generator script is committed — the live assertion is the only thing keeping the fixture honest
- **Repo guides (`#475`)**: added `FOUNDATION.md` (canonical agent doc — recurring workflow, `pnpm release` conventions, CHANGELOG format, PR/commit conventions, directory map) and thin `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` pointer files. The Claude Code `@<file>` include directive is also surfaced as a plain reference by Codex / Gemini. `.gitignore` no longer ignores `CLAUDE.md` (the previously-blanket "AI" block was tightened); `TASKS.md` / `*.agents.md` / `REVIEW.md` remain ignored. `CHANGELOG.md` was backfilled for 0.4.0 → 0.4.23 in the new section-ordered, bolded-headline + root-cause style; pre-0.4 history is intentionally left in `git log`

**Notes**:
- No package version bump (still `0.4.23`); no public API additions, removals, or renames
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- The BIP68 refactor is a pure internal cleanup: external callers continue to import `timelockToSequence` / `sequenceToTimelock` from `@arkade-os/sdk` exactly as before

---

## 2026-05-07 - Release 0.4.24 + Unilateral Exit Bundle + VTXO Reconciliation + Ownership Gating
**Previous Commit**: `b9f3466871f5ba1bb31b7f1d8cc99349ebb63227`
**Current Commit**: `cf09b7277d04c5e68831100f7795d2d356c35ae9`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.24 release

**Commits Analyzed**:
- `cf09b72` fix(wallet): pre-flight VTXO outpoints before settle (proactive) (#478)
- `8d3e773` fix(wallet): reconcile VTXO_ALREADY_SPENT by outpoint, not full re-scan (#477)
- `cdc10fd` chore: release 0.4.24
- `32c4b73` fix(vtxo): gate persisted VTXOs by owning script (Tier 1 of #480) (#481)
- `6d0b53f` Unilateral exit bundle (#338 + #222 + #416) (#479)

**Documentation Changes**:
- Bumped SDK version 0.4.23 → 0.4.24 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`
- `INDEX.md`: extended VTXO concept to cover surgical `refreshOutpoints` reconciliation + `revalidateBeforeSettle` pre-flight; new "Ownership Gating" concept; unilateral exit concept now describes `prepareUnrollTransaction` / `completeUnroll` split, regtest network fix, and `isScriptValid === true` correctness
- `system/project_overview.md`: VTXO Operations row covers indexer-by-outpoint reconciliation, service-worker `REFRESH_OUTPOINTS` proxy, and pre-flight settle path; new "VTXO Ownership Gating" feature row; Unilateral Exit row covers split + regtest network arg + `isScriptValid` truthy bug
- `system/architecture.md`: added `contracts/` directory tree (`contractManager.ts`, `contractWatcher.ts`, `vtxoOwnership.ts`); annotated `wallet/wallet.ts`, `wallet/vtxo-manager.ts`, `wallet/unroll.ts`, `wallet/serviceWorker/wallet-message-handler.ts`, `script/base.ts`, `script/tapscript.ts` with the new behaviour

**Notable Source Changes**:
- **Unilateral exit bundle (`#479` = `#338` + `#222` + `#416`)**: per-namespace `isScriptValid` helpers returning `true | Error` (`script/tapscript.ts`); `getVerifyIndex` shared between condition tapscripts; `prepareUnrollTransaction` extracted from broadcast in `wallet/unroll.ts` so callers can build + sign without networking; new e2e coverage for `completeUnroll` after unilateral exit delay (`test/e2e/ark.test.ts`). Three latent bugs caught while wiring the e2e: (a) `VtxoScript.exitPaths` used a truthy check on `isScriptValid` but the helper now returns `true | Error` — `Error` objects are truthy, so non-CSV scripts (e.g. `ConditionCSVMultisig`) were routed to CSV's `decode()` and swallowed by the catch instead of falling through to the ConditionCSV branch; (b) `completeUnroll` called `tx.addOutputAddress(addr, value)` without a network arg — `@scure/btc-signer` defaults to mainnet base58 decoding, so regtest `bcrt1...` addresses threw `Unknown letter: "0"`; (c) the e2e's blocks-branch maturity wait used `nigiri rpc --generate` directly — esplora hadn't observed the mined tip yet, so `availableExitPath`'s chainTip read could still return the pre-mining tip (mirrored the seconds-branch `waitFor` chainTip loop)
- **VTXO ownership gating (`#481`, Tier 1 of `#480`)**: new `src/contracts/vtxoOwnership.ts` with helpers applied at every contract-scoped read/write site so legacy address buckets cannot leak wrong-script rows or win txid:vout dedup. Background sync writers warn-and-skip; user-initiated wallet write paths throw. `ContractWatcher.seedLastKnownVtxos` now reads through `getContractVtxos` (script-filtered) instead of the raw address bucket — prevents a phantom `vtxo_spent` event on the first poll when a legacy wrong-script row had been seeding the baseline. `wallet.notifyIncomingFunds` warns instead of silently dropping rows that arrive without `.script`. `updateDbAfterOffchainTx` and `updateDbAfterSettle` now group spent rows by owning script (using `annotateVtxos` script tags), validate per group, and route each bucket to its contract's address via `manager.getContracts()`; outer catches now rethrow rather than log-and-swallow (was masking failed saves). `getVtxosFromRepo` no longer silently sets `walletScript = undefined` on decode failure — fail-fast surfaces the structural bug instead of zeroing the user's visible balance
- **`VTXO_ALREADY_SPENT` reconciliation (`#477`)**: previous recovery was `refreshVtxos()` (cursor-derived `?after=created_at` filter) — couldn't surface a VTXO created before the cursor and spent recently. New `IContractManager.refreshOutpoints(outpoints)` queries the indexer by outpoint, annotates with the owning contract's tapscripts, and upserts at the contract's address; no cursor change, no full re-scan. New `maybeRefreshAfterVtxoSpent(spentOutpoint?)` parses the `metadata.vtxo_outpoint` field on the `ArkError` envelope and routes to `refreshOutpoints([outpoint])`; falls back to `refreshVtxos()` only when no outpoint metadata is available. Both `vtxo-manager` callsites (event-driven renewal + periodic settle) extract the outpoint before triggering recovery. Service-worker proxy: new `REFRESH_OUTPOINTS` message + handler so wallets running behind a worker get the same recovery
- **Pre-flight before settle (`#478`)**: closes the loop *before* the failed intent flies. `VtxoManager.revalidateBeforeSettle(candidates, threshold)` refreshes the candidate outpoints, re-pulls through `getExpiringVtxos`, then restricts to the original candidate set so a refresh side-effect cannot silently widen the input set. Wired into both settle entry points: `renewVtxos` (event-driven on `vtxo_received`) and `runPeriodicSettle` (boarding-poll auto-settle). Best-effort: a failed refresh falls back to the original candidates and lets `#477`'s reactive recovery handle whatever slipped through

**Tests Added**:
- `test/contracts/manager.test.ts`: three tests covering `refreshOutpoints` (happy path, silent skip for unowned scripts, no-op on empty input); ownership-gating tests for the wrong-script reject path; updated reconciliation tests acknowledge the extra pre-flight call before recovery
- `test/contracts/vtxoOwnership.test.ts`: dedicated coverage for `vtxoOwnership` helpers (90 lines)
- `test/contracts/helpers.ts`: shared script-aware test helpers
- `test/vtxo-manager.test.ts`: pre-flight ordering test ("pre-flight `refreshOutpoints` runs before settle on the periodic poll path"), pre-flight stale-drop test ("pre-flight drops candidates the indexer reports as spent and skips a fully-stale settle"), and `ArkError`-with-`vtxo_outpoint` routing tests; `flushMicrotasks` bumped from 2 awaits to 8 to drain the longer pre-flight chain
- `test/wallet.test.ts`: 411 lines of new coverage for per-script persistence in `updateDbAfterOffchainTx` / `updateDbAfterSettle` and the fail-fast `getVtxosFromRepo` decode path; existing tests that mocked `getAddress` with placeholder strings updated to use a real decodable test address
- `test/wallet-message-handler.test.ts` + `test/worker/expo/processors/contractPollProcessor.test.ts`: cover the `REFRESH_OUTPOINTS` message + the script-gated processor reads
- `test/e2e/ark.test.ts`: new "should complete unroll after unilateral exit delay" path

**Notes**:
- No new public exports beyond `IContractManager.refreshOutpoints` / `prepareUnrollTransaction`; module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- The ownership-gating change is data-correctness, not schema — no repository or storage migrations
- `wallet.network` is now mandatory at unroll time (regtest fix) but already present on every `Wallet` instance, so no caller-side change required
- Tier 1 of `#480` only — further tiers may follow

---

## 2026-05-08 - Release 0.4.25 + Tier 2 script-scoped repository methods
**Previous Commit**: `cf09b7277d04c5e68831100f7795d2d356c35ae9`
**Current Commit**: `2707b59d87df66f3ea5731150250895d6883e0ae`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.25 release

**Commits Analyzed**:
- `2707b59` chore: release 0.4.25
- `1727c7f` fix(vtxo): script-scoped repository methods across backends (Tier 2 of #480) (#482)

**Documentation Changes**:
- Bumped SDK version 0.4.24 → 0.4.25 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status row)
- `INDEX.md`: extended Ownership Gating Key Concept with the Tier 2 dispatch (optional script-scoped methods, native backend implementations, `VtxoRepositoryKey`, fallback semantics)
- `system/project_overview.md`: extended VTXO Ownership Gating row with Tier 2 dispatch (optional `getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`, native backend coverage, `VtxoRepositoryKey`)
- `system/architecture.md`: rewrote `repositories/walletRepository.ts` annotation to call out the Tier 2 optional methods, `VtxoRepositoryKey`, native backend implementations (IndexedDB script index + outpoint dedup, SQL `WHERE script = ?`, Realm `filtered`), and the re-thrown DB-error policy in `getVtxosForScript`; extended `contracts/vtxoOwnership.ts` annotation to describe the dispatch helpers (`getVtxosForContract` / `saveVtxosForContract`) and the call sites that adopt them (`wallet.ts`, `contractManager.ts`, `contractWatcher.ts`)
- Master `docs/INDEX.md`: extended ts-sdk VTXO ownership-gating capability bullet for Tier 2; rewrote the 0.4.25 status row to lead with Tier 2

**Notable Source Changes**:
- **Tier 2 ownership gating (`#482` = Tier 2 of `#480`)**: `WalletRepository` interface gains three optional methods — `getVtxosForScript(script)`, `saveVtxosForScript({ script, address? }, vtxos)`, `deleteVtxosForScript(script)` — plus a new `VtxoRepositoryKey` type (`{ script: string; address?: string }`, address still required by current backends). All SDK-shipped backends implement them natively:
  - `InMemoryWalletRepository`: scans every address bucket, applies `isVtxoForScript`, dedups by `${txid}:${vout}` (last-write-wins via `mergeByKey`)
  - `IndexedDBWalletRepository`: uses the `script` IDB index (`store.index("script").getAll(script)`) + a defensive script filter; outpoint dedup runs on the raw rows so the address tiebreaker (`shouldReplaceVtxo`) stays applicable; DB errors are now re-thrown rather than swallowed to `[]`
  - `SQLiteWalletRepository`: simple `WHERE script = ?` on the vtxos table for read/delete; save validates each VTXO with `isVtxoForScript` before delegating to `saveVtxos(address, vtxos)`
  - `RealmWalletRepository`: `realm.objects("ArkVtxo").filtered("script == $0", script)` for read/delete; same per-VTXO validation on save
- New dispatch helpers in `src/contracts/vtxoOwnership.ts`:
  - `getVtxosForContract(repo, contract)` calls `repo.getVtxosForScript?` if present, else falls back to `filterVtxosForScript(await repo.getVtxos(contract.address), contract.script)`
  - `saveVtxosForContract(repo, contract, vtxos)` calls `repo.saveVtxosForScript?` if present, else runs `validateVtxosForScript(...)` and delegates to `repo.saveVtxos(contract.address, vtxos)` (the validation is the bug fix from the "validate scripts in saveVtxosForContract fallback path" sub-commit — previously the fallback path could silently persist wrong-script rows)
- Adopted call sites:
  - `ContractManager.fetchContractVtxos` per-address upsert loop now finds the `Contract` and routes via `saveVtxosForContract`; previously could throw on `Map.get(...)!` for vtxos whose script wasn't in the contract set — the new loop `continue`s instead
  - `ContractManager.getContractVtxos` (read path uses `getVtxosForContract` instead of `getVtxos(address) + filterVtxosForScript` inline)
  - `ContractManager.reconcilePendingFrontier` and `fetchContractVxosFromIndexer` (both saves go through `saveVtxosForContract`)
  - `ContractWatcher.seedLastKnownVtxos` baseline (read goes through `getVtxosForContract`)
  - `Wallet.updateDbAfterOffchainTx` and `Wallet.updateDbAfterSettle` (per-script grouping now writes directly via `saveVtxosForContract` instead of building an intermediate `byAddress` map; change VTXOs route through the same helper)
  - `worker/expo/processors/contractPollProcessor.ts` (script-gated processor reads adopted)
- `.gitignore`: added `*.idb` (IndexedDB JSON dump artefacts from local development)

**Tests Added**:
- `test/repositories/walletRepository.test.ts`: +99 lines covering the new script-scoped methods at the interface level (the `each` matrix already runs every test against every backend)
- `test/sqlite-wallet-repository.test.ts`: +80 lines for the SQL-specific path
- `test/wallet.test.ts`: +53 lines / −23 lines covering the dispatch helper paths in `updateDbAfterOffchainTx` / `updateDbAfterSettle`

**Notes**:
- No breaking changes: the new repo methods are optional (`?:`), so external `WalletRepository` implementations that only support Tier 1 keep working through the address-bucket fallback (now with proactive script validation on save)
- No new public exports beyond the interface widening; module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- Tier 2 of `#480`; further tiers may follow

---

## 2026-05-13 - ContractWatcher follow-ups + `ExtendedContractVtxo` export + indexer URL deriving fix
**Previous Commit**: `0c7b4bb8fa2c792bee054a1f6114805e61122c58`
**Current Commit**: `9e53c73a520e3e39ca826d6914fc2a80af8d8cc5`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for ContractWatcher follow-ups + type-cleanup pass (no version bump — still 0.4.26)

**Commits Analyzed**:
- `9e53c73` Revert "feat(wallet): HD receive rotation via contract repository (alt to #441) (#473)" (#488)
- `4eec112` feat(wallet): HD receive rotation via contract repository (alt to #441) (#473)
- `ab0c67e` fix: ContractWatcher follow-ups from #462 (#464)

**Net delta**: `4eec112` and `9e53c73` cancel out (HD receive rotation feature added then reverted same day). Only `ab0c67e` produces source changes in this range. No HD rotation work shipped; `src/wallet/hdDescriptorProvider.ts` and the surrounding descriptor-provider stack are unchanged from #440.

**Documentation Changes**:
- `system/architecture.md`: added `contracts/types.ts` to the contracts directory map (`ContractVtxo` vs new `ExtendedContractVtxo` split, the latter is the post-`annotateVtxos` shape used at save/forfeit sites); annotated `contractManager.ts` with the internal `ExtendedContractVtxo[]` return-type tightening; extended `contractWatcher.ts` annotation with the typed `ContractVtxo[]` accumulator + greppable extend-failure log (`txid:vout` + caught error); extended `wallet.ts` annotation with the new `extractArkProviderUrl(provider)` helper that derives the indexer URL from a custom `arkProvider`; annotated `wallet/delegator.ts` with the `isAnnotated` type-guard replacing the unsafe `as ExtendedVirtualCoin` cast in the `.delegate` filter
- `change-log/last-sync.txt`: bumped to `9e53c73`
- Master `docs/INDEX.md`: extended the ts-sdk status row with the new `ExtendedContractVtxo` public export, the ContractWatcher / Delegator type-safety hardening, and the indexer URL deriving fix

**Notable Source Changes (no public-API removal, no behaviour change beyond the indexer URL fix)**:
- **New public type `ExtendedContractVtxo`** (`src/contracts/types.ts`) — `ExtendedVirtualCoin & { contractScript: string }`. Mirrors the `ExtendedVirtualCoin` / `VirtualCoin` split: `ContractVtxo` carries `Partial<TapLeaves & EncodedVtxoScript>` (raw from indexer) while `ExtendedContractVtxo` narrows those fields to required, guaranteeing `annotateVtxos` has run. Exported from the package root via `src/index.ts`. `ContractWithVtxos.vtxos` retyped from `ContractVtxo[]` → `ExtendedContractVtxo[]` so callers can rely on taproot data being present
- **`ContractWatcher.extendVtxos`** (the internal helper inside the watcher loop): accumulator now typed `ContractVtxo[]` rather than untyped `[]` (compile-time drift catch on the extended shape); the catch branch now logs `failed to extend vtxo ${txid}:${vout}` plus the caught error so production grep can find both the offending vtxo and the underlying cause
- **`ContractManager` internal returns**: `getVtxosForContracts`, `fetchContractVtxosBulk`, and `fetchContractVxosFromIndexer` now return `Map<string, ExtendedContractVtxo[]>` (was `ContractVtxo[]`). Drops the `as ContractVtxo` cast in `getVtxosForContracts` and the corresponding casts in the bulk-fetch paths — the types now match what `annotateVtxos` actually returns. Pure cleanup, no behaviour change
- **`DelegatorManagerImpl.delegate`** (`src/wallet/delegator.ts`): the `eligible` filter dropped `.map((v) => v as ExtendedVirtualCoin)` in favour of a real type guard, `isAnnotated(v: ContractVtxo): v is ContractVtxo & ExtendedVirtualCoin`, which checks `tapTree !== undefined && forfeitTapLeafScript !== undefined && intentTapLeafScript !== undefined`. The filter now both verifies a delegate tap leaf exists AND that the vtxo is annotated — wrong-shape rows are silently dropped instead of being cast through to `makeDelegateForfeitTx` where they would have crashed downstream
- **`Wallet.create` / `ReadonlyWallet.create` indexer URL derivation** (`src/wallet/wallet.ts`): new private helper `extractArkProviderUrl(provider: ArkProvider): string | undefined` does a structural read of `provider.serverUrl` (the built-in `RestArkProvider` / `ExpoArkProvider` expose it; custom implementations may not). When a custom `arkProvider` is supplied without `arkServerUrl`, the indexer is now built from that same URL instead of silently falling back to `getArkadeServerUrl(config)` → `arkade.computer`. Behavioural fix: a wallet built on a custom mainnet/testnet arkd is no longer paired with the public default indexer. The old `(arkProvider as RestArkProvider).serverUrl` unsafe cast + `"Could not determine arkServerUrl from provider"` throw are gone; the new path uses `??` against `extractArkProviderUrl(arkProvider) ?? arkadeServerUrl`, so a custom arkProvider without a discoverable `serverUrl` falls back to the mainnet default rather than throwing
- **`README.md`** cleanup: `arkServerUrl: 'https://arkade.computer'` removed from every `Wallet.create` / `ReadonlyWallet.create` / `ServiceWorkerWallet.setup` snippet (mainnet-default UX from #460); now reads `await Wallet.create({ identity })` everywhere with an explicit "To use a different network, pass `arkServerUrl` option" callout

**Tests Added**:
- `test/contracts/watcher.test.ts`: +144 lines covering `emitVtxoEvent` via the public `listenLoop` / subscription iterator — (1) a delegate-contract subscription update yields a vtxo whose `tapTree` equals `DelegateVtxo.Script.encode()` and differs from the default tapscript, proving the delegate handler enriched it; (2) a contract type with no registered handler emits the raw vtxo with `contractScript` set and surfaces a `console.warn` carrying `txid:vout`

**Notes**:
- The HD-rotation revert (`#488`) means the previously-merged `walletReceiveRotator.ts`, `metadata.source = 'wallet-receive'` tagging, `walletMode` config, and `refreshVtxos({ includeInactive })` escape hatch are NOT in the SDK at HEAD. Existing wallets continue to use the static descriptor path from the boot — `HDDescriptorProvider` is still exported from #440 but is not wired into `Wallet.create` automatically
- No package version bump (still `0.4.26`); the only additive public surface change is the new `ExtendedContractVtxo` type export
- The indexer URL deriving fix is a behavioural change for callers who passed a custom `arkProvider` without an explicit `arkServerUrl`: their indexer URL now matches the arkd they pointed at, rather than the public default. Callers who relied on the implicit mainnet pairing should pass `arkServerUrl: 'https://arkade.computer'` explicitly
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged

---

## 2026-05-09 - Release 0.4.26 (ESM-compatible declarations + typedoc polish)
**Previous Commit**: `2707b59d87df66f3ea5731150250895d6883e0ae`
**Current Commit**: `0c7b4bb8fa2c792bee054a1f6114805e61122c58`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.26 release

**Commits Analyzed**:
- `0c7b4bb` chore: release 0.4.26
- `b9a6d9b` chore: improve typedoc comments, use `as const` for default constants (#484)
- `bffa9be` fix(types): emit ESM-compatible declaration imports (#485)

**Documentation Changes**:
- Bumped SDK version 0.4.25 → 0.4.26 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status row)
- Master `docs/INDEX.md`: extended ts-sdk status row with the 0.4.26 ESM `.d.ts` import-rewrite fix and the typedoc / `as const` defaults polish

**Notable Source Changes (no architectural redesign, no public-API surface change)**:
- `scripts/add-extensions.js`: declaration-emit pass now rewrites import specifiers in generated `.d.ts` files alongside `.js` files, so consumers under `"moduleResolution": "node16" / "bundler"` no longer hit `Cannot find module './foo'` errors when they typecheck against the published types. Touched call-sites: `src/extension/index.ts`, `src/script/delegate.ts`, `src/utils/transaction.ts`, `src/wallet/delegator.ts`, `src/wallet/utils.ts` (these are the imports the build script now consistently rewrites; runtime behaviour unchanged)
- `src/wallet/index.ts`: `DEFAULT_ARKADE_HRP` and `DEFAULT_NETWORK_NAME` now declared `as const` (matching the existing treatment of `DEFAULT_ARKADE_SERVER_URL`); typedoc on `VirtualCoin` reordered and clarified — `script` and `isUnrolled` are now described as positive-knowledge fields ("locking scriptPubKey", "broadcasted onchain via an unroll"), `isSpent` annotated as a boolean helper for `spentBy` that explicitly excludes unrolled/swept states
- `src/script/address.ts`: typedoc-only refinements (no behaviour change)

**Tests Added**: none (changes are typedoc / build-script / type-level only)

**Notes**:
- `scripts/add-extensions.js` is the build helper invoked after `tsc` to add explicit `.js` extensions to import paths so the published bundle works in strict ESM resolvers; the 0.4.26 fix extends the same rewrite to `.d.ts` files so types resolve identically
- No public API was added or removed; runtime semantics are unchanged
- Consumers seeing `TS2307: Cannot find module …` against `@arkade-os/sdk` types under `node16` / `bundler` resolution should upgrade to 0.4.26

