# Documentation Sync History - Arkd

## 2026-05-23 - Documentation Update
**Commit**: `299b7ad6` (arkd repository)
**Previous Sync**: `700026fe`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `299b7ad6` client-lib: Add `WithTxOutsTaprootTree` SendOption (#1068)
- `f2fa2963` Connection pooling for gateway stream connections (#1073)

**Features Added (client-lib SDK, `pkg/client-lib`)**:
- New `WithTxOutsTaprootTree(tapTrees map[string][]byte) SendOption` in `pkg/client-lib/send_opts.go`. Callers pass BIP-371-encoded tap tree bytes (produced via `txutils.TapTree(scripts).Encode()`) keyed by the hex-encoded `pkScript` of each ark-tx output. The option validates input up front: empty map / empty value returns `missing taproot trees` / `receiver tap tree must not be empty`, and each value is round-tripped through `txutils.DecodeTapTree` before being defensively copied into `sendOptions.outputsTapTree`. The new private helper `applyOutputTapTrees` in `send.go` writes each matching tree into `ptx.Outputs[i].TaprootTapTree` after the ark PSBT is built, and **returns an error if any pkScript key fails to match an output** — this is deliberate to avoid the silent footgun of a PSBT going out without the tap tree on the wire in a VTXO-spending path. Test coverage in `send_opts_test.go` expanded by ~243 lines (validation, copy-on-write isolation, decode failures, mismatch behavior).

**Features Added (gRPC gateway, server-side scalability)**:
- New connection pooling for gateway streaming RPCs in `internal/interface/grpc/service.go`. `service.streamConn *grpc.ClientConn` is replaced by `streamConns []*grpc.ClientConn`; `newServer` now allocates a pool of `StreamConnPoolSize` connections to the gateway address (cleaning up partials on failure) and `stop()` closes all of them. Each pooled connection carries an independent HTTP/2 `MAX_CONCURRENT_STREAMS` budget, so a pool of N multiplies the effective concurrent-stream capacity by N.
- `splitConn` (the meshapi gateway's `grpc.ClientConnInterface` adapter) now holds `streamPool []grpc.ClientConnInterface` and a `streamIndex atomic.Uint64`; `NewStream` atomically increments and wraps `streamIndex % len(streamPool)` to round-robin streams across the pool. `Invoke` continues to use the dedicated unary connection unchanged.
- Startup log line added: `stream connection pool size: N`.
- Test coverage in `internal/interface/grpc/service_test.go` expanded by ~131 lines covering the new pool init / shutdown / round-robin paths.

**Configuration Changes**:
- New env var `ARKD_STREAM_CONN_POOL_SIZE` (`internal/config/config.go`, `internal/interface/grpc/config.go`, `cmd/arkd/main.go`). Default `4`, hard-capped to `[1, 64]` at load time (`min(maxStreamConnPoolSize, max(1, viper.GetUint32(...)))`) to prevent misconfiguration. A value of `1` preserves the previous single-connection behavior.

**Files Updated**:
- docs/INDEX.md (added `WithTxOutsTaprootTree` SendOption and `ARKD_STREAM_CONN_POOL_SIZE` pooling capability to the arkd entry)
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/configuration.md (new "gRPC Gateway / Streaming" section documenting `ARKD_MAX_CONCURRENT_STREAMS` and `ARKD_STREAM_CONN_POOL_SIZE` with the multiplicative-capacity rationale)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Both changes are additive and non-breaking. The pool size defaults to `4`, so existing deployments will see a 4× lift in effective concurrent-stream capacity on the gateway after upgrade without any config change; set `ARKD_STREAM_CONN_POOL_SIZE=1` to restore prior behavior. `WithTxOutsTaprootTree` is purely opt-in on the client-lib call site. No tag / dependency / API-surface entries in master INDEX changed.

---

## 2026-05-22 - Documentation Update
**Commit**: `700026fe` (arkd repository)
**Previous Sync**: `2c9612a0`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits
- `700026fe` Non-breaking single-connection GetSubscription rpc (#951)
- `2336e19e` client-lib: Fix explorer polling fallback panic when poll interval is unset (#1076)
- `a6f1b71f` Upgrade `nbxplorer` to 2.6.7 (#1077)

**Features Added (Indexer gRPC API, additive & non-breaking)**:
- New single-connection `GetSubscription` flow in `internal/interface/grpc/handlers/indexer.go`: when `subscription_id` is empty the server creates the subscription inline (UUID), optionally applies an initial `SubscriptionFilter`, and emits a `SubscriptionStartedEvent` carrying the generated id as the first stream message. When `subscription_id` is set, the previous attach-to-existing-listener behavior is preserved (now returns `codes.NotFound` instead of silently allowing on missing listener).
- New `UpdateSubscription` RPC for atomic, in-place subscription mutation. Generic `SubscriptionFilter` is mutually exclusive between filter types (currently only `ScriptsFilter`, with future packet-type filters planned). `ScriptsFilter` supports two modes:
  - `Modify { add_scripts, remove_scripts }` — incremental add/remove
  - `Overwrite { scripts }` — full replacement
  Returns `ScriptsFilterResult { added, removed, all }`. All scripts are parsed/validated up-front so partial mutations are not possible on invalid input.
- New proto messages in `api-spec/protobuf/ark/v1/indexer.proto`: `SubscriptionStartedEvent`, `SubscriptionFilter`, `ScriptsFilter`, `ModifyScripts`, `OverwriteScripts`, `UpdateSubscriptionRequest`, `UpdateSubscriptionResponse`, `ScriptsFilterResult`; `GetSubscriptionRequest` gains an optional `SubscriptionFilter filter` field; `GetSubscriptionResponse` gains a `SubscriptionStartedEvent subscription_started` oneof variant.
- New REST bindings: `GET /v1/indexer/subscription` (single-connection server-sent stream, alongside the existing `/v1/indexer/script/subscription/{subscription_id}`) and `POST /v1/indexer/subscription/update`.
- New macaroon permission entry in `internal/interface/grpc/permissions/permissions.go`: `IndexerService/UpdateSubscription` requires `indexer:write`.
- Indexer handler test suite expanded by ~968 lines (`internal/interface/grpc/handlers/indexer_test.go`) covering single-connection start, filter validation, atomic modify/overwrite semantics, error mapping, and listener cleanup.

**Bug Fixes (client-lib SDK, `pkg/client-lib`)**:
- `mempool.NewExplorer` (`pkg/client-lib/explorer/mempool/explorer.go`): polling fallback path no longer panics when `pollInterval` is unset — constructor now seeds `defaultPollInterval = 10 * time.Second` and validates `pollInterval > 0`, returning an error instead.
- Default explorer URLs updated to Arkade-operated mempool mirrors:
  - Bitcoin: `https://mempool.space/api` → `https://mempool.arkade.sh/api`
  - Signet:  `https://mempool.space/signet/api` → `https://mempool.signet.arkade.sh/api`
  - MutinyNet: `https://mutinynet.com/api` → `https://mempool.mutinynet.arkade.sh/api`
  - Testnet and Regtest defaults unchanged.

**Dependency Bumps**:
- `docker-compose.regtest.yml`: `nicolasdorier/nbxplorer:2.5.30` → `2.6.7`.

**Files Updated**:
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/application_core.md (Indexer Service: documented `GetSubscription` single-connection flow, `UpdateSubscription` RPC, and existing `SubscribeForScripts`/`UnsubscribeForScripts` — previously this section listed only query methods)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Master `docs/INDEX.md` arkd entry already lists gRPC/REST API interfaces at a high level; the new RPC + flow is additive and non-breaking, no capability/tag/dependency change at master-INDEX granularity (consistent with how prior similarly-scoped syncs like 2026-05-20/2026-05-09 were handled). `tech_stack.md` mentions NBXplorer generically without a pinned version, so the 2.6.7 image bump needs no doc edit there.

---

## 2026-05-20 - Documentation Update
**Commit**: `2c9612a0` (arkd repository)
**Previous Sync**: `f8aefab4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `2c9612a0` Bump golang@1.26.3 (#1070)

**Go Version**:
- Updated from Go 1.26.2 to Go 1.26.3 (build toolchain only; patch-level update).
- Touched `go.mod` files across the repo: root, `api-spec`, `pkg/ark-cli`, `pkg/ark-lib`, `pkg/arkd-wallet`, `pkg/client-lib`, `pkg/errors`, `pkg/kvdb`, `pkg/macaroons`.
- CI workflows bumped to `go-version: 1.26.3`: `.github/workflows/{artifacts,integration,release,unit}.yaml`.
- Builder images bumped to `golang:1.26.3`: `Dockerfile`, `arkdwallet.Dockerfile`, `arkdwallet.btcwallet.Dockerfile`.

**Files Updated**:
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/tech_stack.md (Go version: 1.24.6+ → 1.26.3+, two references)
- docs/projects/arkd/system/project_overview.md (Go version: 1.25.7+ → 1.26.3+)
- docs/projects/arkd/sop/development-workflow.md (Go prerequisite: 1.24.6 → 1.26.3)
- docs/projects/arkd/testing/how_to_run.md (Go prerequisite: 1.24.6 → 1.26.3)
- docs/projects/arkd/testing/arkd-environment-and-testing-guide.md (Go prerequisite: 1.25.7 → 1.26.3)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Build-toolchain bump only — no API, capability, dependency, or configuration changes. Master `docs/INDEX.md` does not track Go version for arkd, so no update there. Also aligned previously-inconsistent Go version references across the docs to the new value.

---

## 2026-05-12 - Documentation Update
**Commit**: `f8aefab4` (arkd repository)
**Previous Sync**: `42f58837`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `f8aefab4` ci: Remove empty codeql workflow file (#1054)
- `89d93031` Client-lib: renaming of packages and components (#1064)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- Top-level Go package renamed from `arksdk` to `wallet` (all files in `pkg/client-lib/` now declare `package wallet`).
- `ArkClient` interface renamed to `Wallet`; the entrypoint file moved from `pkg/client-lib/ark_sdk.go` to `pkg/client-lib/wallet.go`. The `Wallet()` accessor on the old interface is now `Identity() identity.Identity`.
- Sub-package `pkg/client-lib/wallet/` renamed to `pkg/client-lib/identity/`:
  - `wallet.WalletService` interface → `identity.Identity`
  - Constant `wallet.SingleKeyWallet` → `identity.SingleKeyIdentity`
  - `pkg/client-lib/wallet/singlekey/wallet.go` → `pkg/client-lib/identity/singlekey/identity.go`
  - `pkg/client-lib/wallet/singlekey/store/{store.go,inmemory/store.go,file/store.go}` → `pkg/client-lib/identity/singlekey/store/...`
- `ServiceOption` rename: `WithWallet(wallet.WalletService)` → `WithIdentity(identity.Identity)` (in `pkg/client-lib/service_opts.go`).
- Internal `service` struct field `c.wallet` renamed to `c.identity`; all call sites in `service.go`, `funding.go`, `send.go`, `batch_session.go`, `unroll.go`, `init.go`, `utils.go`, `asset.go`, `batch_session_handler.go`, `funding_opts*.go`, `send_opts*.go`, `receiver_opts*.go`, `types.go`, `vtxos_opts.go` updated accordingly.
- E2E test suite (`internal/test/e2e/*.go`) and example apps (`pkg/client-lib/example/alice_to_bob`, `pkg/client-lib/example/multi_connection_demo`) and `pkg/ark-cli/main.go` updated to import `identity` and call `WithIdentity` / `Identity()`.

**CI**:
- Removed empty `.github/workflows/codeql.yml` workflow file (single-line cleanup, no behavioural change).

**Files Updated**:
- docs/INDEX.md (arkd entry: `WithWallet` → `WithIdentity`, clarified `Wallet`/`Identity` SDK shape)
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/folder_structure.md (client-lib section: package rename, `ArkClient` → `Wallet`, `wallet/` → `identity/`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Pure rename/refactor of the embedded client SDK. No new capabilities, no protocol/gRPC/REST/admin surface changes, no env-var / configuration / build-test workflow changes — `testing/`, `sop/`, and other `system/` docs need no updates. Internal arkd uses of `ports.WalletService` (in `internal/core/ports/`) are unrelated to this client-lib rename and remain untouched.

---

## 2026-05-09 - Documentation Update
**Commit**: `42f58837` (arkd repository)
**Previous Sync**: `2999d666`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `42f58837` Hotfix: prevent failure on SubmitTx to affect finalization of pending tx (#1063)

**Bug Fixes**:
- `service.SubmitOffchainTx` (`internal/core/application/service.go`): the `defer` that emits a `Fail` event and persists changes via `repoManager.Events().Save(...)` is now registered **after** the initial `OffchainTxRequested` event is appended to `changes`, instead of at function entry. Previously, an error during input validation / `offchain.NewTransaction(...)` could fire the deferred handler and persist a `Fail` event for an offchain-tx aggregate that had no preceding `Requested` event, corrupting the event stream and blocking finalization of subsequent pending txs sharing the same txid space.
- e2e test (`internal/test/e2e/e2e_test.go`) extended to cover the SubmitTx-failure-during-pending-finalization scenario.

**Files Updated**:
- docs/projects/arkd/INDEX.md (version 1.3.2 → 1.3.3, sync commit + date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Pure internal bug fix. No changes to capabilities, tags, triggers, dependencies, configuration, env vars, gRPC/REST API surface, build/test workflow, or architecture — `docs/INDEX.md` and the `system/`, `testing/`, `sop/` doc files require no updates.

---

## 2026-05-08 - Documentation Update
**Commit**: `2999d666` (arkd repository)
**Previous Sync**: `216951ee`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `2999d666` client-lib: Add WithReceiver option & Update explorer and wallet interfaces (#1058)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- `wallet.WalletService.NextIndex(ctx)` removed; replaced by two id-keyed methods:
  - `NextKeyId(ctx, id) (string, error)` — returns the next key id for a given account/wallet id
  - `GetKeyIndex(ctx, id) (uint32, error)` — returns the BIP32-style index for a stored key id
  - Single-key wallet returns `"m"` and `0` respectively, ignoring the id argument
- `explorer.Explorer.GetUtxos(addr string)` → `GetUtxos(addresses []string)` — accepts multiple addresses; mempool implementation throttles (1s sleep every 20 addresses) to avoid rate limiting
- Internal `service.getAddresses` now returns `onchainAddrs []types.Address` (with `KeyID` populated) instead of `[]string`; `service.bumpAnchorTx` no longer takes a `keys` parameter — it derives signing keys from the address `KeyID` itself

**Features Added**:
- New `ReceiverOption` interface (intersection of `SendOption`, `BatchSessionOption`, `UnrollOption`) defined once in `pkg/client-lib/receiver_opts.go`
- New `WithReceiver(addr)` option overrides the destination/change address that would otherwise be freshly derived via `wallet.NewKey`. Wired into `Settle`, `CollaborativeExit`, `RedeemNotes`, `SendOffChain` (change), `IssueAsset`, `ReissueAsset`, `BurnAsset`, `OnboardAgainAllExpiredBoardings`, and `Unroll`-family ops
- New address validators in `receiver_opts.go`: `validateOffchainAddress`, `validateOnchainAddress(network)`, `validateOffchainOrOnchainAddress(network)` — methods enforce which kind they accept (e.g. `OnboardAgainAllExpiredBoardings` requires onchain; `Settle`/`CollaborativeExit` accept either)
- Internal `service.getReceiver(ctx, optReceiver)` and `service.getBoardingReceiver(ctx, optReceiver)` helpers fall back to `wallet.NewKey`-derived addresses when the option is unset
- `signingRequired` flag threaded through `makeRegisterIntent`/`makeDeleteIntent`/`makeGetPendingTxIntent`/`makeIntent`: when no boarding utxos and no vtxos are present, the unsigned proof PSBT is returned without invoking `wallet.SignTransaction` (avoids a wallet round-trip for note-only flows)
- `service.FinalizePendingTxs` now accepts caller-supplied `vtxosWithTapscripts` via the existing `WithVtxos` option (previously always re-fetched + populated internally)

**Bug Fixes / Refactors (client-lib SDK)**:
- `service.Balance` rewritten: replaces `nbWorkers × len(offchainAddrs)` goroutine fan-out + channel coalescing with four discrete goroutines (offchain, onchain, boarding, redeem), aggregating into typed locals — clearer error propagation, correct boarding+redeem locked-balance accumulation, no double-count of offchain balance across addresses
- `service.CollaborativeExit` no longer fetches & sums `spendableVtxos` for an upfront balance check — the downstream `getFundsToSettle` call already enforces sufficient funds, eliminating duplicate explorer calls
- Mempool explorer `SubscribeForAddresses` now decodes the address script once at subscription time and stores it in `addressData.script` for reuse on every poll, instead of re-decoding inside `getUtxos` each cycle
- `getMatureUtxos` and `getClaimableBoardingUtxos` consolidated to single batched `GetUtxos([...])` calls (was per-address loop)
- Single-key wallet `GetKey` / `NewKey` no longer error on `"wallet is locked"` — locked-state sub-tests removed; key derivation is permitted while locked because no signing is required
- Removed dead `balanceRes` struct from `pkg/client-lib/types.go`

**Files Updated**:
- docs/INDEX.md (capability — add `WithReceiver` to embedded SDK summary)
- docs/projects/arkd/INDEX.md (version 1.3.1 → 1.3.2, sync commit + date)
- docs/projects/arkd/system/folder_structure.md (added `receiver_opts.go`; updated `WalletService` method list to `NextKeyId`/`GetKeyIndex`; noted batched `GetUtxos` in mempool explorer)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-05-06 - Documentation Update
**Commit**: `216951ee` (arkd repository)
**Previous Sync**: `9246f043`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 commits
- `216951ee` Add tests for unrolled vtxo rejoining batch (#1055)
- `1815bb99` fix (singlekey wallet `NextIndex` returns 1 once initialized)
- `fd062bb9` Upgrade to Postgres 17.8 (#1057)
- `0eb3ac4d` Fix: print repo-root-relative path after build-cli completes (#1059)
- `2444c613` client-lib: Fix single-key wallet empty KeyID (#1060)
- `701a100d` docs: add missing breaking changes documentation (#1007)

**Features Added**:
- `pkg/client-lib/types.Utxo.Assets` field — boarding UTXOs now carry Arkade Asset balances forward through batch sessions
- `batch_session.getFundsToSettle` aggregates asset balances from boarding UTXOs in addition to VTXOs
- `toIntentInputs` now records boarding-UTXO assets in the proof PSBT (`assetInputs[len(vtxos)+boardingIndex+1]`)
- New e2e tests covering unrolled VTXO rejoining a batch (success path and invalid case)
- New `api-spec/BREAKING_CHANGES.md` documenting the Protobuf/OpenAPI breaking-change policy and resolution framework (revert / add new field / reserve / document); verified via `./scripts/check-proto-breaking master`

**Bug Fixes (client-lib SDK, `pkg/client-lib`)**:
- Single-key wallet `NewKey` / `GetKey` now return a non-empty `KeyRef.Id` (`"m"`) — previously the `Id` field was empty, causing key lookups to fail
- Single-key wallet `NextIndex` returns `1` once `walletData` is initialized (was always returning `0`)

**Configuration Changes**:
- `ARKD_SESSION_DURATION` added to `envs/arkd.dev.env` (set to `10` for fast regtest cycles); env var was already supported in `internal/config/config.go` (default `30`)
- `docker-compose.regtest.yml` upgraded `postgres:16` → `postgres:17.8`

**Tooling**:
- `pkg/ark-cli/scripts/build` now prints the repo-root-relative output path after a successful build (uses `git rev-parse --show-toplevel`)

**Files Updated**:
- docs/projects/arkd/INDEX.md (version 1.3.0 → 1.3.1, sync commit + date)
- docs/projects/arkd/system/configuration.md (added `ARKD_SESSION_DURATION`)
- docs/projects/arkd/system/tech_stack.md (Postgres 17.8 in regtest compose)
- docs/projects/arkd/system/folder_structure.md (referenced `api-spec/BREAKING_CHANGES.md`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-05-01 - Documentation Update
**Commit**: `9246f043` (arkd repository)
**Previous Sync**: `8e005262`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit (`[client-lib] Update wallet interface (#1008)`)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- `wallet.WalletService` interface restructured: address-returning methods (`GetAddresses`, `NewAddress`, `NewAddresses`) replaced by key-returning methods (`NewKey`, `GetKey`, `ListKeys`, `NextIndex`); addresses now derived by `client-lib` from `KeyRef`
- `WalletService.Create` now takes a `chaincfg.Params` network argument
- `WalletService.SignTransaction` no longer takes an `Explorer`; takes `keys map[string]string` (key IDs by prevout script) instead
- `WalletService.NewVtxoTreeSigner` no longer takes a derivation path
- `ArkClient.InitWithWallet` removed; wallet is now injected via `WithWallet` ServiceOption on `NewArkClient`. `NewArkClient` falls back to a default single-key wallet if no `WithWallet` option is provided. `LoadArkClientWithWallet` removed.
- `Config.WalletType` removed from stored client config
- `ArkClient.GetAddresses` now returns `[]types.Address` (not `[]string`) for offchain/boarding/redemption sets, exposing `KeyID` and `Tapscripts`
- `ArkClient.SignTransaction`, `RegisterIntent`, `DeleteIntent`, `FinalizePendingTxs`, `CompleteUnroll`, `OnboardAgainAllExpiredBoardings`, `WithdrawFromAllExpiredBoardings` now accept variadic options for passing signing keys

**Features Added**:
- New `wallet.KeyRef` type (`Id`, `PubKey`) for referencing wallet keys
- New `types.Address.KeyID` field linking addresses back to their producing key
- New `SignOption` interface family with `WithKeys(map[string]string)` usable across `SendOption`, `BatchSessionOption`, and `UnrollOption`
- New `pkg/client-lib/sign_opts.go` and `pkg/client-lib/vtxos_opts.go`

**Files Updated**:
- docs/INDEX.md (capability + tags for arkd embedded client SDK)
- docs/projects/arkd/INDEX.md (version 1.2.0 → 1.3.0, sync commit)
- docs/projects/arkd/system/folder_structure.md (added `pkg/client-lib` package section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-02-19 - Documentation Update
**Commit**: `74a173c6` (ark repository)
**Previous Sync**: `a337c9ce`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 28 commits

**Features Added**:
- Arkade Assets: Full UTXO-native asset protocol implementation (encoding/decoding, teleport transfers, control assets, metadata, minting/burning, storage across all DB backends)
- CEL-based fee system: Programmable fee management with CEL formula engine, admin APIs for fee programs, client-facing EstimateIntentFee RPC
- Admin liquidity RPCs: GetExpiringLiquidity, GetRecoverableLiquidity, manual Sweep
- UpdateStreamTopics RPC: Client-managed event stream topic subscriptions
- GetIntentByTxid / GetIntent RPC: Intent lookup by transaction ID
- GetVtxos time range filter: Filter VTXOs by update timestamp (after/before)
- PostgreSQL auto-creation: Automatic database provisioning (`ARKD_PG_DB_AUTOCREATE`)
- GetAsset indexer RPC: Asset information and metadata retrieval
- EstimateIntentFee RPC: Client-facing fee estimation for intents

**Configuration Changes**:
- `ARKD_PG_DB_AUTOCREATE` (new) - Auto-create PostgreSQL databases
- `ARKD_ONCHAIN_OUTPUT_FEE` **[DEPRECATED]** - Replaced by dynamic CEL fee system
- New admin CLI flags: `--with-connectors`, `--commitment-txids`, `--onchain-input`, `--offchain-input`, `--onchain-output`, `--offchain-output`, `--clear`

**Bug Fixes**:
- Fixed auth service at restart (#874)
- Fixed stopping sweep operations at shutdown (#839)
- Fixed gosec G704 security issue (#910)
- Dropped IsAccepted check hotfix (#898)
- Sanity checks on offchain tx flow (#845)
- Ensured connector out is at index 1
- Wait for confirmation before scheduling sweep task (#838)
- Dropped connectors from commitment tx coin selection (#867)
- Optimized scheduleBatchSweepTask function (#850)
- Restored original fees after TestFee execution (#893)

**Go Version**:
- Updated from Go 1.24.6 to Go 1.25.7

**Database Migrations Added**:
- `20251215000000_add_intent_fees` (Postgres + SQLite)
- `20260106000000_add_vtxo_updated_at` (Postgres + SQLite)
- `20260114000000_add_intent_txid` (Postgres + SQLite)
- `20260130193058_add_asset` (Postgres + SQLite)

**Files Updated**:
- docs/INDEX.md (capabilities, tags, triggers)
- docs/projects/arkd/INDEX.md (version bump, sync commit)
- docs/projects/arkd/system/project_overview.md (assets, fees, liquidity sections)
- docs/projects/arkd/system/architecture.md (new domain entities, interface handlers)
- docs/projects/arkd/system/configuration.md (fee deprecation, PG autocreate)
- docs/projects/arkd/system/folder_structure.md (asset/fee packages, new files)
- docs/projects/arkd/testing/arkd-development-reference.md (Go version)
- docs/projects/arkd/testing/arkd-environment-and-testing-guide.md (Go version)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `a337c9ce` (ark repository)
**Previous Sync**: `e16538b5`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 58 commits

**Features Added**:
- Pyroscope continuous profiling support (CPU, memory, goroutines, mutex, block)
- AlertManager integration for batch lifecycle alerts
- pprof profiling endpoint on admin interface
- GetPendingTx RPC by intent
- Admin RPC to clear scheduled sessions
- Support for pending spent VTXOs filtering by pubkeys/outpoints
- `start` sub-command for CLI
- Proto breaking changes detection in CI

**Configuration Changes**:
- `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY` - Public unilateral exit delay
- `ARKD_VTXO_NO_CSV_VALIDATION_CUTOFF_DATE` - Skip CSV validation for old VTXOs
- `ARKD_SETTLEMENT_MIN_EXPIRY_GAP` - Minimum settlement expiry gap
- `ARKD_ONCHAIN_OUTPUT_FEE` - Collaborative exit fees
- `ARKD_PYROSCOPE_SERVER_URL` - Pyroscope profiling server
- `ARKD_ALERT_MANAGER_URL` - AlertManager URL
- `ARKD_ENABLE_PPROF` - Enable pprof endpoint

**Bug Fixes**:
- Fixed concurrent Redis channel usage
- Fixed batch sweeping logic
- Fixed sweeper scheduling after restart
- Fixed Redis current round implementation
- Fixed error handling in OffchainTx defer functions
- Fixed VTXO min amount in GetInfo
- Fixed sub-dust VTXO extraction from checkpoints

**Files Updated**:
- docs/projects/arkd/INDEX.md (version bump, sync commit)
- docs/projects/arkd/system/project_overview.md (observability section)
- docs/projects/arkd/system/configuration.md (new env vars)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: `e16538b` (ark repository)
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs arkd` to update after new commits
