# Arkadian   Project Index & Registry

This is the **master index** for all projects in the Arkade ecosystem. It provides a machine-readable registry with project metadata, dependencies, and routing hints for AI agents.

---

## Project Registry

### arkd
**ID**: `arkd`
**Name**: Arkd Server
**Type**: Core Infrastructure
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md`
**Repository**: `${ARKD_REPO}`
**GitHub**: `${ARKD_GITHUB}`

**Description**:
Bitcoin Ark protocol server implementation that enables fast, low-cost off-chain transactions while maintaining Bitcoin's security guarantees. The server acts as an Arkade Operator, creating and managing Batch Outputs (VTXOs), facilitating off-chain transactions through rounds, and providing liquidity for commitment transactions. Uses hexagonal architecture with strict layering (domain, application, infrastructure).

**Key Capabilities**:
- VTXO (Virtual Transaction Output) management and lifecycle
- Round-based batch settlement (every 10-30 seconds)
- Covenantless Bitcoin architecture (no consensus changes required)
- Onchain boarding and offchain payment processing
- Collaborative and unilateral exit mechanisms
- Arkade Assets: UTXO-native fungible/non-fungible token protocol with teleport transfers (boarding UTXOs are asset-aware in batch sessions)
- CEL-based programmable fee system with admin management APIs
- Liquidity analysis and manual sweep admin tools
- gRPC and REST API interfaces (Protobuf/OpenAPI breaking-change policy in `api-spec/BREAKING_CHANGES.md`)
- Multiple database backends (PostgreSQL 17.8 in regtest, with auto-creation, plus SQLite, Badger)
- Multiple cache backends (Redis, in-memory)
- Embedded client SDK (`pkg/client-lib`, Go package `wallet`) with `Wallet` interface and pluggable `Identity` (key-based), `WithIdentity` ServiceOption, `WithKeys` signing option, `WithReceiver` destination/change-address override, and `WithTxOutsTaprootTree` SendOption that attaches BIP-371 `TaprootTapTree` bytes (via `txutils.TapTree(...).Encode()`) to ark-tx PSBT outputs keyed by hex-encoded `pkScript` — `SendOffChain` errors on unmatched keys to surface the silent VTXO-spending footgun
- Pooled gateway connections for streaming RPCs (`ARKD_STREAM_CONN_POOL_SIZE`, default 4, max 64): each pooled `grpc.ClientConn` carries its own HTTP/2 `MAX_CONCURRENT_STREAMS` budget and `splitConn` round-robins `NewStream` calls across the pool, multiplying effective concurrent-stream capacity
- CEL-based indexer subscription filters: `GetSubscription`/`UpdateSubscription` accept a flattened `SubscriptionFilter` combining OR-evaluated CEL `expressions` (matched against each tx's ARK OP_RETURN extension via the internal `txfilter` package) with `add`/`remove` script filters; updates are atomic and tx-only subscriptions survive script clearing
- O(1)-DB-call startup sweeper restore: `VtxoRepository.GetVtxoPubKeysByCommitmentTxids` bulk-loads VTXO pubkeys for every sweepable round in a single query (sqlite uses `sqlc.slice` with internal param-limit batching, postgres uses `ANY($1::text[])`, badger iterates); replaces the previous per-round N+1 loop in `restoreWatchingVtxos` / `Stop()` that took ~46s at 1000 sweepable rounds on sqlite and timed out at 10000. New migration `20260527150000_vtxo_commitment_txid_index` adds a btree index on `vtxo_commitment_txid(commitment_txid)`. Cross-process `arkd-wallet` `WatchScripts`/`UnwatchScripts` gRPC calls are now chunked in `walletclient` at `defaultWatchScriptsChunkSize=2000` (~150 KiB per call) so boot/restart with 100k+ scripts no longer hits the default 4 MiB gRPC max-message size
- Persisted per-round collected fees + admin aggregate-fee endpoint: `Round.CollectedFees` (= boarding + intent inputs − intent outputs, floored at 0) is computed in `finalizeRound`, raised as `RoundFinalized.Fees`, and stored via the new migration `20260603111520_add_collected_fees` (postgres) / `20260603111517_add_collected_fees` (sqlite) plus a badger field. `AdminService.GetCollectedFees(after, before)` exposes the sum over completed (non-failed) rounds at `GET /v1/admin/fees/collected` (macaroon `manager:read`); for legacy rounds with no persisted fee the value is recomputed on the fly by recovering boarding-input amounts from the finalized commitment tx (boarding inputs detected via the taproot script-path control block, prevout amounts looked up via `walletSvc.GetTransaction`), and complete recomputations are background-patched into storage via `RoundRepository.PatchCollectedFees` under a `30s` `context.WithoutCancel` timeout. The same `calculateCollectedFees` helper now drives the AlertManager batch-stats pipeline (`getBatchStats`), fixing a prior per-intent double-count of `BoardingInputAmount`. `Round.EndFinalization` now takes `collectedFees` as a third argument — external domain consumers must update their call site.
- ark-lib closure decoding rejects BIP-342 OP_SUCCESS opcodes: `pkg/ark-lib/script.DecodeClosure` calls `txscript.ScriptHasOpSuccess` and returns `"script contains forbidden OP_SUCCESS opcode"` before attempting any closure-type match, preventing a tapscript-leaf footgun where an OP_SUCCESS opcode (e.g., `OP_CAT`) would make the script succeed unconditionally and let anyone spend the VTXO. Covered by a new `TestDecodeClosureRejectsOpSuccess` that enumerates every BIP-342 OP_SUCCESS byte against `ConditionMultisigClosure` scripts; `ExecuteBoolScript` likewise errors on a standalone OP_SUCCESS script.
- Go toolchain pinned to **1.26.4** across all modules (`go.mod`, `api-spec/go.mod`, `pkg/ark-cli/go.mod`, `pkg/ark-lib/go.mod`, `pkg/arkd-wallet/go.mod`, `pkg/client-lib/go.mod`, `pkg/errors/go.mod`, `pkg/kvdb/go.mod`, `pkg/macaroons/go.mod`), CI workflows (`.github/workflows/{unit,integration,artifacts,release}.yaml`), and Docker images (`Dockerfile`, `arkdwallet.Dockerfile`, `arkdwallet.btcwallet.Dockerfile`).
- Admin visibility into expired-but-not-swept batches: new `AdminService.GetExpiredRounds(ctx) ([]domain.ExpiredRound, error)` (PR #1095) surfaces sweepable rounds (those with a vtxo tree, `swept=false`, `ended=true`, `failed=false`) whose `ending_timestamp + vtxo_tree_expiration < now()` — i.e., rounds whose batch outputs should have been swept but weren't (typically because the sweep was uneconomical at the prevailing fee rate). Backed by a new `RoundRepository.GetExpiredRounds(ctx, expiredBefore int64)` method on the domain interface with sqlc-generated `SelectExpiredRounds` queries on both postgres and sqlite (filtering by the same predicate) and a badger implementation. Exposed at `GET /v1/admin/rounds/expired` returning `{round_id, commitment_txid, expired_at}` triples, gated by `manager:read` macaroon, and surfaced through a new `arkd expired-rounds` CLI subcommand.
- Admin visibility into the wallet's main-account UTXO set: new `AdminService.GetMainAccountUtxos(ctx) ([]ports.WalletUtxo, error)` (PR #1094) returns the **whole** UTXO set of the main account — including unconfirmed and locked UTXOs, each flagged — by delegating to a new `WalletService.GetMainAccountUtxos` port method. Each `WalletUtxo` carries `{txid, vout, value, script, address, confirmations, locked}`. Implemented end-to-end: new `arkd-wallet` gRPC `WalletService.GetMainAccountUtxos` at `GET /v1/wallet/main-account-utxos`, new arkd-side admin RPC at `GET /v1/admin/wallet/utxos` gated by `manager:read`, and a new `arkd wallet-utxos` CLI subcommand. The `locked` flag comes from the existing in-memory `outpointLocker`.
- Withdraw RPC effective-value coin selection (PR #1094): `arkd-wallet`'s `Withdraw` now uses a new `selectCoinsForWithdraw(amount, feeRate, destPkScript)` that wraps each candidate UTXO as an `effectiveValueCoin` with `Value() = realValue − perInputFee` (where `perInputFee = fee(2 inputs) − fee(1 input)` from the weight estimator) and runs `MinNumberCoinSelector{MaxInputs: 50, MinChangeAmount: 0}` against a target of `amount + baseFee` (where `baseFee = fee(1 input) − perInputFee`). The chosen UTXOs are guaranteed to cover `amount` plus the fee for their **actual** input count, eliminating the prior re-selection loop that estimated for "typical 2-input" withdraws and could under-/over-fund. UTXOs whose value is `<= perInputFee` (cost more to spend than they're worth) are filtered out. A new `lockUtxos`/`unlockUtxos` pair plus a new `outpointLocker.unlock(ctx, outpoints...)` method releases per-withdraw locks via a `defer` if signing or broadcasting fails, instead of waiting for the lock expiry. The general-purpose `SelectUtxos` path is refactored onto a shared `selectCoins(amount, confirmedOnly, minChangeAmount)` helper; `defaultMinChangeAmount` is lowered from **800** to **330** (P2TR/P2WSH dust limit).
- Signer-key deprecation / rotation (PR #1097): the operator can rotate the server signing key while keeping VTXOs signed by older keys spendable. `arkd-wallet` reads a new comma-separated `DEPRECATED_SIGNER_KEYS` env var of `<hexkey>[:<unix-cutoff>]` entries (32-byte hex priv key, optional cutoff timestamp after which the key is no longer accepted, `0`/unset = never); boot fails if a deprecated key equals the current `SIGNER_KEY`. The signer service exposes them via a new `repeated DeprecatedSigner deprecated_signers` field (`{pubkey, cutoff_date}`) on `GetPubkeyResponse`, surfaced through `signer.GetDeprecatedPubkeys` and `ports.DeprecatedSignerPubkey`. The indexer (`NewIndexerService` now takes `deprecatedSignerPubkeys`) and application service accept signatures from any of `allSignerPubkeys()` (current + deprecated) when verifying intents and stripping signer signatures from virtual txs.
- Optional `x-sdk-version` client version header (PR #1113): `pkg/client-lib` can stamp every unary/stream RPC with an `x-sdk-version` gRPC metadata header via the new `WithClientVersion(version)` ServiceOption (threaded through `service.clientVersion` → `grpcclient.NewClient`). The header is only attached when a non-empty version is set. **Breaking:** `grpcclient.NewClient` now takes `(serverUrl, clientVersion string)`. The server-side `x-build-version` `VersionGuard` interceptor was also tightened — a present-and-parseable client version is now always held to the server's minimum even when the header is not required; only missing/empty/unparseable headers are let through in non-required mode (PR #1114).
- Client-side deprecated-signer verification (PR #1117): the embedded `pkg/client-lib` SDK now verifies server signatures on ark/checkpoint txs against the **set** of valid signer keys (current + deprecated), the client-side counterpart to the server-side signer-key rotation (PR #1097). `types.Config` gains `DeprecatedSigners []DeprecatedSigner` (each `{PubKey *btcec.PublicKey, CutoffDate time.Time}`) plus a new `Config.AllSigners() map[string]*btcec.PublicKey` keyed by x-only hex pubkey (current signer + all deprecated). The verification helpers `verifySignedArk`/`verifySignedCheckpoints`/`verifyOffchainPsbt` (`utils.go`) now take `signers map[string]*btcec.PublicKey` instead of a single `*btcec.PublicKey`, matching each signed input's `TaprootScriptSpendSig.XOnlyPubKey` against any signer in the set and verifying with the matched key; callers `SendOffChain` (`send.go`) and `IssueAsset`/`ReissueAsset`/`BurnAsset` (`asset.go`) now fetch `GetConfigData(ctx)` and pass `cfgData.AllSigners()`. The file store persists deprecated signers as a `deprecated_signers` JSON array of `{pubkey, cutoff_date}` (compressed-hex pubkey, RFC3339 cutoff) in `storeData`, round-tripped in `config_store.go`/`store/file/types.go` and surfaced in `asMap()`.
- Guard-interceptor errors surfaced as proper gRPC status (PR #1108): the server's `errorConverter` interceptor was moved to the **front** of the unary chain (and a new `streamErrorConverter` added to the stream chain) in `internal/interface/grpc/interceptors/interceptor.go`, so structured `arkerrors.Error` values returned by the version-guard, digest, macaroon-auth, and readiness interceptors are now wrapped as `gRPCError` (carrying `arkv1.ErrorDetails`) before reaching the client — previously only handler-level errors were converted, so guard errors leaked as raw/unstructured errors. Correspondingly, `pkg/client-lib`'s `isDigestMismatch` now decodes the structured `arkv1.ErrorDetails` from the gRPC status details (matching `errors.DIGEST_MISMATCH.Name`) instead of string-matching the error message, completing the end-to-end DIGEST_MISMATCH detect-and-refresh path.
- arkd-wallet retries nbxplorer connection at startup (PR #1083): the nbxplorer adapter constructor (`pkg/arkd-wallet/core/infrastructure/nbxplorer/service.go`) now retries its initial `GetBitcoinStatus` probe up to `nbxplorerMaxRetries=30` times at `nbxplorerRetryInterval=5s` (≈2.5 min total), logging each attempt, before failing — so `arkd-wallet` no longer crashes when nbxplorer isn't yet ready to serve RPCs at boot; the orchestrator only restarts it once the retry budget is exhausted.
- `SelectOffchainTx` returns only accepted/finalized txs (PR #1123): the offchain-tx repository query backing `indexer.GetVirtualTx` and `service.GetPendingTx` now filters `WHERE txid = @txid AND (stage_code = 2 OR stage_code = 3)` (Accepted or Finalized stages) on both postgres and sqlite, replacing the prior `COALESCE(fail_reason, '') = ''` predicate that also returned still-`requested` (stage 1) txs. Fixes a concurrency hazard from in-flight concurrent `SubmitTx` calls where a tx not yet accepted (and with no `fail_reason`) could be surfaced by `GetVirtualTx`/`GetPendingTx`.
- gRPC interceptor order fix + digest panic guard (PR #1125): the readiness interceptor was moved **ahead** of the version-guard, digest, and macaroon-auth interceptors in `internal/interface/grpc/interceptors/interceptor.go` (both unary and stream chains), so an un-ready server short-circuits with a readiness error before those guards run — in particular before the digest guard computes the settings digest. `Settings.Digest()` (`internal/core/ports/live_store.go`) now returns a `"settings not initialized"` error instead of panicking when `SignerPubkey`/`ForfeitPubkey` are not yet populated, and the unary/stream digest handlers (`digest.go`) warn-log the underlying error before returning the `INTERNAL_ERROR` "failed to verify digest header, retry later". Internal-only: no proto / gRPC method / env-var / config / migration surface changed.
- Optional gRPC channelz introspection on the admin port (PR #1127): a new `ARKD_ENABLE_CHANNELZ` env var (default `false`, threaded through `internal/config` `EnableChannelz` and the grpc-interface `Config`) registers the gRPC channelz service on the admin server so operators can inspect live channel/connection/socket state via `grpc_cli` against the admin port. Off by default; no proto / gRPC method / migration surface changed (`envs/arkd.dev.env` enables it for dev).
- Channelz RPCs whitelisted in the macaroon permission map (PR #1133): the seven channelz methods (`GetTopChannels`, `GetServers`, `GetServer`, `GetServerSockets`, `GetChannel`, `GetSubchannel`, `GetSocket`) are added to `permissions.Whitelist()` (`internal/interface/grpc/permissions/permissions.go`) under a new `EntityChannelz = "channelz"` entity, so the auth interceptor lets them through without a macaroon — they are already restricted to the admin port. Internal-only; no proto / gRPC method / env-var / migration surface changed.
- golang/crypto & golang/net dependency bump + stdlib HTTP/2 server (PR #1126): `golang.org/x/crypto` 0.49.0 → 0.52.0 and `golang.org/x/net` 0.52.0 → 0.55.0 (plus transitive `x/sys` 0.42.0 → 0.45.0, `x/text` 0.35.0 → 0.37.0, `x/term`, `x/mod`, `x/tools`) bumped across all modules. The gRPC public/admin HTTP server setup (`internal/interface/grpc/service.go`) was migrated off `golang.org/x/net/http2` + `golang.org/x/net/http2/h2c` onto the Go stdlib `http.Protocols` / `http.HTTP2Config` API: HTTP/1 is always enabled, unencrypted HTTP/2 (h2c) is enabled in insecure mode and TLS HTTP/2 otherwise, and the `ARKD_MAX_CONCURRENT_STREAMS` budget now flows through `http.HTTP2Config.MaxConcurrentStreams` instead of a manually-configured `http2.Server`. Behavior is preserved — no config / proto / gRPC / env-var surface change.
- DB-persisted Settings domain with admin CRUD API (PR #939): all operational settings (session duration, exit delays, vtxo tree expiry, round participants, vtxo/utxo amount limits, ban threshold/duration, settlement expiry gap, max tx weight, max OP_RETURN outputs, asset tx weight ratio, note URI prefix, batch fees, scheduled session) now live in a **single DB row** (`domain.Settings`, new `SettingsRepository` with sqlite/postgres/badger impls and `add_settings` migrations). The matching `ARKD_*` env vars are read **only on first boot** to seed the row (legacy `intent_fees`/`scheduled_session` rows are carried over); afterwards they are ignored and settings are managed via new `AdminService.GetSettings` (`GET /v1/admin/settings`, `manager:read`) and `AdminService.UpdateSettings` (`POST /v1/admin/settings`, `manager:write`) — partial updates with tightened server-side validation (locktime rules, amount min/max consistency, uint32 overflow guards) returning a `change_log`. Admin read-modify-write flows are mutex-serialized with synchronous refresh of the new live-store `SettingsStore` cache (inmemory + redis), which holds `ports.Settings` (domain settings + network/dust/pubkeys/forfeit address/checkpoint tapscript) and provides the GetInfo `Digest()`. `RepoManager` drops `Fees()`/`ScheduledSession()` in favor of `Settings()`. **Removed env vars:** `ARKD_SCHEDULER_TYPE` (scheduler now derived from `vtxo_tree_expiry` locktime type), `ARKD_ALLOW_CSV_BLOCK_TYPE`, `ARKD_ROUND_INTERVAL`. ark-lib gains `MinAllowedSequence = 512` and `ParseRelativeLocktime(value uint32)`. New repo doc: `docs/settings.md`.
- arkd-wallet scanner reconnects to nbxplorer with exponential backoff (PR #1130): the blockchain `scanner` (`pkg/arkd-wallet/core/application/scanner/service.go`) now survives runtime nbxplorer WebSocket drops — on a closed notification channel it warn-logs `nbxplorer disconnected`, waits with exponential backoff (`defaultInitialBackoff=1s`, doubling to `defaultMaxBackoff=30s`), and re-calls `GetAddressNotifications`, resetting the backoff and resuming on success. The nbxplorer adapter's `GetAddressNotifications` (`.../infrastructure/nbxplorer/service.go`) now opens the WebSocket **synchronously** and returns an error on failure instead of dialing inside the goroutine, and a read error closes the channel (for the scanner to reconnect) rather than re-dialing in place. The runtime counterpart to the startup retry of PR #1083; internal-only, no env-var/proto/migration surface change.
- Logger interceptor caps metadata-of-interest value size (PR #1131): `sanitizeMetadata` (`internal/interface/grpc/interceptors/logger.go`) now bounds each logged metadata value to `maxMetadataValueSizeBytes=100`, warn-logging (`metadata of interest value too large` with `{key, len}`) and substituting the sentinel `invalidMetadataValue="arklabs/invalid"` for oversized values, preventing client-supplied metadata from bloating logs. Internal-only logging hygiene; no surface change.
- Cursor-based pagination for the indexer `GetVtxoChain` RPC (PR #1092): `GetVtxoChainRequest` gains an opaque `page_token` (proto field 5) and `GetVtxoChainResponse` gains a `next_page_token` — when `page_token` is set the response resumes from where the prior page ended, and an empty `next_page_token` signals no more pages. The cursor path is decoupled from the legacy `IndexerPageResponse page` struct (it uses a fixed max page size and ignores the page struct); an invalid/undecodable `page_token` maps to gRPC `InvalidArgument`, and combining `intent` + `page_token` is rejected. The auth-token TTL remains a hard ceiling (no pagination keepalive). Also hardens the indexer signer-key handling: `NewIndexerService` now fails fast when a withheld/private exposure mode is configured without a privkey (auth-token paths require it) instead of panicking later, and `allSignerPubkeys` skips nil pubkeys so `stripSignerSignatures` never calls `schnorr.SerializePubKey` on nil.
- Checkpoint-script watching on new offchain txs (PR #1129): the application service now registers each checkpoint tx's first output pkscript with the chain `scanner` (`scanner.WatchScripts`) when a new offchain tx is handled, so an onchain broadcast of a finalized checkpoint is detected. A new domain method `VtxoRepository.GetCheckpointTxsByVtxoPubKeys(ctx, pubkeys) ([]Tx, error)` (with postgres, sqlite via sqlc, and badger implementations) backs restart recovery: `restoreWatchingVtxos` fetches finalized checkpoint txs for the sweepable rounds' vtxo pubkeys and re-watches their output scripts, while `stopWatchingVtxos` unwatches them symmetrically. Fetch/parse failures soft-fail (a DB error or a corrupted PSBT is logged/skipped) so a single bad row cannot abort startup or shutdown. **Note:** adds a method to the `VtxoRepository` domain interface — external implementers must add it.
- Client-lib replay-channel panic fix + mempool fee-rate endpoint update (PR #1134): `JoinBatchSession` (`pkg/client-lib/batch_session_handler.go`) now forwards notify events to the caller's `replayEventsCh` with an **inline** non-blocking `select` instead of a detached goroutine — the caller owns and closes that channel once `JoinBatchSession` returns, so a goroutine outliving the return raced the close and panicked (`send on closed channel`); the inline send guarantees every send happens-before the return while a slow/unread consumer simply drops the event. Separately, the mempool explorer's `GetFeeRate` (`pkg/client-lib/explorer/mempool/explorer.go`) now queries `v1/fees/recommended` and returns its `fastestFee`, falling back to the legacy (deprecated) `fee-estimates` endpoint only on HTTP 404 for backward compatibility with older mempool backends (e.g. `mempool.mutinynet.arkade.sh` no longer serves `fee-estimates`). Both paths route through a new shared `explorerSvc.get(path, target)` helper that reads the body and checks the HTTP status **before** JSON-decoding, so a non-JSON error body surfaces the real status instead of a misleading parse error.
- ark-lib CSV small-int sequence decoding fix (PR #1135): `CSVMultisigClosure.Decode` (`pkg/ark-lib/script/closure.go`) now decodes a small-int (OP_1..OP_16) locktime sequence back to its numeric value (`opcode − (OP_1 − 1)`) instead of storing the raw opcode byte, matching Bitcoin's minimal scriptnum encoding (`OP_0` still decodes to an empty byte slice; values > 16 remain pushdata byte slices). The paired change removes the now-redundant OP_1..OP_16 → number remapping from `BIP68DecodeSequenceFromBytes` (`pkg/ark-lib/locktime.go`), which previously compensated for the raw-opcode storage — leaving it in place would have double-shifted the corrected value. Prevents mis-decoding of CSV relative-locktimes in the 1–16 range. Covered by new `closure`/`locktime` unit tests.
- CEL-based batch_trigger gate for round start (PR #1046): an optional `ARKD_BATCH_TRIGGER` CEL formula gates whether the server starts a new batch round; unset (default) preserves the legacy "start every session" behaviour. Stored as a new `batch_trigger` field in the unified `domain.Settings` row (proto `Settings` field 26, new `add_batch_trigger` sqlite+postgres migrations) and seeded from the env var on first boot only — thereafter admin-updatable at runtime via `UpdateSettings` (`POST /v1/admin/settings`) and the `--batch-trigger` CLI flag, with the compiled program cached and recompiled only when the text changes. Evaluated at the top of `startRound()` against `intents_count`, `current_feerate` (sat/kvbyte), `time_since_last_batch`, `boarding_inputs_count`, `total_boarding_amount`, `total_intent_fees` (all `double`) plus a `now()` helper; the program must return `bool`. Backed by a new `internal/core/domain/batchtrigger` package (mirrors `arkfee`'s compile-once/reuse design). Validated at startup and on every `UpdateSettings`; round-time evaluation **fails open** (a broken program allows the round and logs a warning) so a buggy formula can never wedge the scheduler. If it returns `false`, the server waits one sixth of `ARKD_SESSION_DURATION` and re-checks.
- BIP-322 intent-proof PSBT now sets `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` (PR #1132): `intent.New` (`pkg/ark-lib/intent/proof.go`) appends the BIP-322 `0x09` global Unknown (key `0x09`, value = UTF-8 message bytes) to the toSign PSBT, so a co-signer can recompute the `to_spend` commitment from PSBT-internal data alone and distinguish a genuine ownership proof from an ordinary fund-moving spend before contributing a partial signature. Proof fixtures updated to the new wire format with a `BIP-322_global_0x09_field` sub-test asserting the field is present and equal to the message across all valid fixtures.
- arkd-wallet fee estimation falls back to `minRelayTxFee` (PR #1089): the nbxplorer adapter's `EstimateFeeRate` (`pkg/arkd-wallet/core/infrastructure/nbxplorer/service.go`) now appends a `fallbackFeeRate` query parameter (set to `minRelayTxFee / 1000`) to the `/v1/cryptos/{cryptoCode}/fees/{blockCount}` request, so nbxplorer returns the min-relay fee rate instead of erroring when it cannot produce a fee estimate. Internal-only; no proto / gRPC method / env-var / migration surface change.

**Tags**: `ark`, `protocol`, `server`, `vtxo`, `rounds`, `bitcoin`, `layer2`, `grpc`, `rest-api`, `postgresql`, `sqlite`, `redis`, `assets`, `teleport`, `fees`, `cel`, `client-lib`, `sdk`, `indexer`, `subscription`, `sweeper`, `startup-performance`, `admin-api`, `op-success-rejection`, `go-1.26.4`, `expired-rounds`, `wallet-utxos`, `effective-value-selection`, `settings`, `first-boot-seed`, `signer-key-rotation`, `key-deprecation`, `sdk-version-header`, `client-deprecated-signer-verification`, `error-converter`, `grpc-status`, `nbxplorer-retry`, `startup-resilience`, `nbxplorer-reconnect`, `scanner-backoff`, `runtime-resilience`, `metadata-capping`, `offchain-tx-query`, `dependency-bump`, `http2`, `interceptor-order`, `readiness`, `digest-guard`, `channelz`, `grpc-introspection`, `permissions-whitelist`, `cursor-pagination`, `getvtxochain`, `page-token`, `checkpoint-watching`, `script-watching`, `replay-channel`, `batch-session`, `fee-rate`, `mempool-explorer`, `csv-closure`, `script-decoding`, `bip68`, `batch-trigger`, `round-gate`, `bip322`, `intent-proof`, `fee-estimation`, `min-relay-fee`, `nbxplorer-fallback`

**Synonyms**: `ark-server`, `arkd-server`, `ark-daemon`, `operator`

**Triggers**:
- **ask_question**: `vtxo`, `rounds`, `settlement`, `boarding`, `offchain`, `ark protocol`, `how does ark work`, `arkade assets`, `fees`, `teleport`, `expired rounds`, `wallet utxos`, `settings`, `env vars ignored`, `first boot seed`, `signer key rotation`, `deprecated signer keys`, `sdk version header`, `digest mismatch`, `nbxplorer not ready`, `batch trigger`, `when does a round start`, `round gate`, `bip322 proof`
- **develop**: `add endpoint`, `new database`, `migration`, `grpc service`, `round logic`, `asset`, `fee program`, `collected fees`, `admin fee report`, `expired rounds endpoint`, `wallet utxos endpoint`, `withdraw coin selection`, `settings endpoint`, `update settings`, `signer key rotation`, `deprecated signer keys`, `client version header`, `client signature verification`, `AllSigners`, `interceptor error conversion`, `gRPC status details`, `getvtxochain pagination`, `page_token`, `next_page_token`, `cursor pagination`, `watch checkpoint scripts`, `GetCheckpointTxsByVtxoPubKeys`, `batch_trigger`, `ARKD_BATCH_TRIGGER`, `batch trigger formula`, `CEL round gate`, `batchtrigger package`, `bip322 0x09 field`, `intent proof psbt`
- **test_or_run**: `start arkd`, `run rounds`, `integration test`, `e2e test`, `simulation`
- **debug**: `vtxo not found`, `round failed`, `settlement error`, `database issue`, `nbxplorer crash on startup`, `guard error not converted`, `unstructured grpc error`, `pending tx not returned`, `concurrent submittx`, `getvirtualtx empty`, `digest interceptor panic`, `settings not initialized`, `failed to verify digest header`, `nbxplorer disconnected`, `scanner stopped receiving notifications`, `nbxplorer websocket dropped`, `metadata of interest value too large`, `invalid page_token`, `getvtxochain invalidargument`, `intent and page_token`, `checkpoint not watched`, `send on closed channel`, `replay channel panic`, `fee-estimates 404`, `wrong fee rate`, `csv locktime decoding`, `nbxplorer fee estimation error`, `fallbackFeeRate`, `fee estimate unavailable`
- **monitor_or_alert**: `arkd metrics`, `round latency`, `vtxo expiry`, `channelz`, `grpc connection introspection`, `grpc_cli`

**Dependencies**: `arkd-wallet`, `go-sdk` (protocol implementation)
**Depended On By**: `go-sdk`, `wallet`, `ark-faucet`, `ark-simulator`, `ark-telemetry`

---

### go-sdk
**ID**: `go-sdk`
**Name**: Ark Go SDK
**Type**: Client Library
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md`
**Repository**: `${GO_SDK_REPO}`
**GitHub**: `${GO_SDK_GITHUB}`

**Description**:
Go client library for building Ark wallets and applications. Provides high-level abstractions for wallet operations, VTXO management, transaction building, and arkd server communication. Implements the Ark protocol client-side logic with support for multiple storage backends (SQLite, PostgreSQL, Badger).

**Key Capabilities**:
- Wallet initialization and key management (BIP39, BIP32)
- Send and receive Ark payments (onchain and offchain)
- VTXO lifecycle management (creation, renewal, expiry)
- Ark address generation (Taproot-based)
- Round participation and settlement handling
- Boarding (onchain to offchain) and redemption (offchain to onchain)
- Intent fee estimation and automatic fee handling in coin selection
- Auto-finalization of pending transactions
- Expiry threshold configuration for Settle and CollaborativeExit
- Event stream topic management (UpdateStreamTopics)
- Multiple storage backends with unified interface
- gRPC-only client for arkd communication (REST removed)

**Tags**: `sdk`, `wallet`, `client`, `library`, `vtxo`, `ark`, `go`, `grpc-client`, `bip39`, `taproot`, `fees`, `auto-finalize`

**Synonyms**: `ark-sdk`, `go-client`, `wallet-sdk`

**Triggers**:
- **ask_question**: `how to build wallet`, `sdk usage`, `client library`, `integrate ark`
- **develop**: `add feature to sdk`, `new storage backend`, `wallet operation`
- **test_or_run**: `sdk example`, `test wallet`, `alice to bob example`

**Dependencies**: `arkd` (server communication)
**Depended On By**: `ark-faucet`, `ark-simulator`, `kms-unlocker` (indirectly via arkd)

---

### wallet
**ID**: `wallet`
**Name**: Arkade Wallet (PWA)
**Type**: End-User Application
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/wallet/INDEX.md`
**Repository**: `${WALLET_REPO}`
**GitHub**: `${WALLET_GITHUB}`

**Description**:
Self-custodial Bitcoin wallet delivered as a Progressive Web App (PWA). Built with React 18, TypeScript, and Vite, using a custom in-tree component library (Ionic React was removed in PR #534). Provides a user-friendly interface for Ark protocol operations including VTXOs, off-chain payments, Lightning swaps via Boltz, LNURL receives, and on-chain boarding. Installable on mobile (iOS, Android) and desktop without app store gatekeepers.

**Key Capabilities**:
- Create and restore wallets (BIP39 seed phrases) — new wallets use `MnemonicIdentity` (BIP86 Taproot) backed by a 12-word mnemonic encrypted in `localStorage` via PBKDF2 + AES-GCM; legacy wallets keep using `SingleKey` from a raw private key. `Restore` auto-detects 12-word mnemonic vs nsec/hex; `Backup` shows the recovery phrase for mnemonic wallets and the nsec for legacy wallets; password change in `Settings → Password` re-encrypts the mnemonic for mnemonic wallets. Service-worker boot path sends the raw mnemonic + `isMainnet` to `wallet-service-worker.ts` so the worker builds `MnemonicIdentity` internally for signing. Wallet mode is now a persisted config field (`walletMode: 'static' | 'hd'`, default `'static'`) — mnemonic (HD-capable) wallets can opt into `'hd'` address rotation, legacy `SingleKey` wallets are always `'static'` (see the HD address rotation capability from PR #682). LNURL session secret for mnemonic wallets is the BIP86-derived 32-byte key (Nostr backup key == wallet signing key). (PR #624)
- HD address rotation + restore recovery (PR #682): `walletMode` becomes a persisted `Config` field (`ServiceWorkerWalletMode`, default `'static'`) — mnemonic wallets can rotate to a fresh receive address per incoming payment (`'hd'`), improving on-chain privacy; `SingleKey` wallets stay `'static'` (not HD-capable). New `resolveWalletMode({ hasMnemonic, requested, persisted })` helper (`src/lib/walletMode.ts`) picks the mode: forces `'static'` without a mnemonic, else honors the requested mode (creation) or the persisted one (unlock). `initWallet`/`initSvcWorkerWallet` take `walletMode` + `restoring` params; on restore the service-worker wallet runs `svcWallet.restore()` (an HD address gap-scan, "Recovering addresses…", errors non-fatal) to recover rotated addresses. Dev-mode selectors gate the UI: triple-tapping the onboarding "Welcome to Arkade" heading toggles `devMode`; when on, **Create wallet** shows a "Rotate receive addresses" toggle (`hd` vs `static`) and **Restore** shows an Inherit/Static/HD `SegmentedControl` (Inherit → `undefined`, falls back to the config mode restored from Nostr backup). Covered by new `walletMode.test.ts`, `Init.test.tsx`, `Restore.test.tsx`.
- Send and receive Bitcoin (onchain and offchain via Ark)
- Redesigned Send (pill Paste/Scan, Max-tap confirmation, animated overlays) and Receive v2 (styled QR, tap-to-copy)
- VTXO management, coin control, and expiry threshold handling
- Lightning Network swaps via SwapManager (submarine, reverse submarine, chain swaps via Boltz)
- Optimistic Lightning send + live settlement tracking (PR #668): `payInvoice` resolves once the swap is funded (lockup tx observed) via the SDK's `waitForSwapFunded` instead of blocking on `waitForSwapSettlement`, returning only `{ txid }`; the success screen shows a live `processing → completed / failed / refunded` status (`deriveLnSendStatus` over the persisted swap), with background SDK monitoring still driving the `SwapsList` history row
- LNURL receive via lnurl-server SSE session (amountless Lightning receives); session owned by app-level `LnurlProvider` so it survives navigation away from Receive (PR #559); credentials derived deterministically via `HMAC-SHA256(privateKey, "lnurl-session")` — only `token` sent to lnurl-server, server computes `sessionId = SHA-256(token).slice(0, 32)`
- Swap restoration from Boltz endpoint
- Bulk submarine recovery in Apps → Boltz → Settings (scan + per-row sweep via `@arkade-os/boltz-swap` recovery API)
- Lightning invoice limit validation in Send form (rejects below-min / above-max from `LimitsContext`)
- Nostr-based encrypted wallet backups (chunked for relay compatibility)
- In-app announcements and Chatwoot customer support (Support screen attaches diagnostic custom attributes — `git_commit` plus the SDK's `build_version` / `sdk_version` from PR #686)
- Keyboard navigation, URL hash deep-linking, prefers-reduced-motion support
- JS/JIT capability detection for restricted environments
- Fees provider for on-chain and collaborative exit fee estimation
- Fiat currency symbol-prefix display (`$100.00`, `€50.00`, `¥1,000`); CHF/CNY keep trailing-code form
- Pill navbar overlay shown only on root pages (Wallet/Apps/Settings)
- PWA safe-area handling restored — installed iOS PWAs no longer render beneath the status bar; `::part(scroll)` legacy selectors removed
- bigint-based asset amounts (`AssetOption.balance`, asset metadata `supply`, tx amounts) with new `prettyAssetAmount` formatter; non-negative integer clamps on Burn/Mint/Reissue/Send/Receive inputs
- Boltz swaps tagged with `arkade-money` referralId (provider + service-worker arkadeSwaps); mainnet endpoint switched to `https://api.boltz.exchange`
- Design token system (`src/tokens.css`) with full color ramps (50–950) and `color-mix(in oklab)` neutrals for automatic light/dark adaptation under `html.palette-dark`
- Tailwind CSS v4 (`tailwindcss` ^4.2.2 + `@tailwindcss/vite`) with token-driven `@theme` block in `src/app.css`; `cn()` helper combining `clsx` + `tailwind-merge`; `class-variance-authority` available for variant-driven components
- Toast notifications migrated to `sonner` (^2.0.7) — `useToast()` hook still returns `{ toast }` for call-site compatibility; centered top placement with rich colors and project-scoped CSS
- 55 shadcn/ui primitives available under `src/components/ui/` (PR #590) using `base-nova` style + `lucide` icons; `@/*` path alias in `tsconfig.json` + `vite.config.ts`; existing screens unchanged — primitives available for future migrations
- Core components migrated to shadcn primitives (PR #593) — `Modal` now uses Framer Motion `AnimatePresence` with controlled `open`/`onOpenChange`/`onExitComplete` props; `Checkbox` wraps shadcn `Checkbox` (label-bound, same-state guard); `Select` migrated to shadcn `RadioGroup`; `Toggle` uses shadcn `Switch` with new `lg` size variant (iOS-like three-layer shadow, 44 px tap target). `MAX_DECIMALS` raised to 8. Split `vitest.config.ts` from `vite.config.ts`. Uses `cmdk-base`/`vaul-base` and `@base-ui/react`. `bun.lock` restored for Cloudflare Pages.
- Optional HTTP Basic Authorization (PR #619) — gated on `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` env vars. New `functions/_middleware.ts` Cloudflare Pages edge middleware uses `crypto.subtle.timingSafeEqual` for production; new `plugins/vite-plugin-basic-auth.ts` (timing-safe Node `crypto.timingSafeEqual`) registered first in `vite.config.ts` for dev/preview servers. Both are no-ops when either env var is unset.
- LNURL recognised by paste/scan input — `InputAddress` adds `isValidLnUrl` to the recognised-data set so LNURL strings activate the paste button (PR #620); new LNURL unit tests in `src/test/lib/address.test.ts`.
- `lightning:` URI prefix recognised by paste/scan input — `InputAddress.isAddress` strips the `lightning:` prefix and validates the remainder via `isLightningInvoice` so prefixed BOLT11 invoices activate the paste button (PR #625); the predicate also factors out `lowerData = data.toLowerCase()` so each check runs against the same lowercased string.
- Service worker init refactored to AbortController-per-session (PR #613) — replaces the prior generation-counter; lock/reset aborts the current signal with reason `'lock-reset'`, a new init aborts the previous with `'init'`; `initSvcWorkerWallet` now accepts `identity?: SingleKey` (or legacy `privateKey`), returns `Promise<boolean>`, and supports `skipMigration: true` (used by `restartWallet`)
- Non-blocking boarding settlement UX (PR #556) — `WaitingForRound` full-screen blocking overlay deleted; boarding (Transaction.tsx) shows an inline purple Info banner with `LoadingIcon`, VTXO rollover (Vtxos.tsx) shows inline "Renewing" banner, mainnet send (Send/Details.tsx) uses `LoadingLogo`; `LoadingIcon` `small` size 32→20px
- E2E testing with Playwright using shared `arkade-regtest` submodule + `nak` Nostr relay
- Multi-arch Docker build (amd64 + arm64) via GHCR
- Progressive Web App features (installable, offline-capable)
- Dev mode toggle (triple-tap loading logo, `DevModeProvider` + `localStorage`) + Contracts screen under Settings → Advanced (lists `ContractManager` contracts; PR #618 introduced the screen, PR #645 reworked it into **Active**/**Inactive** sections with an empty state, switched cards to the shared `Shadow border` wrapper, surfaced `contract.label` + `prettyAgo(contract.createdAt)` (falling back to `'Unknown'`), and added a copyable `parameters` row that renders the result of `encodeArkContract` from `@arkade-os/sdk` — wrapped in `useMemo` + `try/catch` so malformed `params` no longer white-screen the route; React key switched from `script` → `address`). **PR #670** rebuilt the screen for scale: compact collapsible rows (tap to reveal address/script/parameters with copy actions), an Active/Inactive tab, type-filter chips and a search box, and a virtualized list (`@tanstack/react-virtual`) with dynamic row heights. Each contract is classified against the operator's advertised signer set via `signerSetFromInfo` + `classifyAgainstSignerSet` (`@arkade-os/sdk`, ts-sdk PR #554): contracts minted under a deprecated signer show a **deprecated signer** badge (and **deprecated signer / past cutoff** once the cooperative-migration cutoff passes). Boarding contracts now display their derived on-chain Bitcoin Taproot address (`bc1p/tb1p/bcrt1p`, re-encoded from the P2TR scriptPubKey via `bech32m`) instead of the ark encoding. Each address links out to a block explorer (Arkade explorer for ark addresses, mempool explorer for boarding Taproot). React key switched back to `contract.script` (the primary key, which `address` can collide on across boarding contracts). Background auto-migration (`SettlementConfig.deprecatedSignerMigration`, default true) is unchanged.
- BIP21 unified copy: Receive QR copy button copies the unified BIP21 URI immediately (PR #617); BIP21 asset-amount validation + integer-clamp on Burn/Mint/Reissue/Send/Receive asset inputs and new `prettyAssetAmount(amount, decimals, useGrouping?)` formatter from PR #611 (bigint whole/fractional split fixes `1.5 USDT` truncation). `prettyAssetNumber` hardened (PR #626) to strip non-digit/non-`-` characters from the integer part and default `maximumFractionDigits` to `MAX_DECIMALS` (8), and (PR #665) to convert scientific-notation inputs (e.g. `-8e-8` from `Number()` coercion) to fixed-point via `Decimal.toFixed()` before splitting, so the regex no longer strips the `e` into a BigInt-invalid string. `decodeBip21` (PR #636) now accepts uppercase URI query params (`ARK`/`ASSETID`/`AMOUNT`/`LIGHTNING`) for QR encoders that uppercase-encode BIP21; `isBTCAddress` regexes gained the `i` flag so uppercase BTC addresses are recognised.
- @arkade-os/sdk 0.4.41 and @arkade-os/boltz-swap 0.3.46 (PR #709 bump from 0.4.39 / 0.3.44 — the sdk 0.4.41 adds the `DelegateInfo` type consumed by the delegation flow in PR #708; PR #692 had bumped from 0.4.38 / 0.3.43 — 0.3.44 publishes the optimistic `waitForSwapFunded` API consumed by the live-settlement Lightning send in PR #668; PR #691 had bumped from 0.4.37 / 0.3.42; PR #684 had bumped from 0.4.36 / 0.3.41 — 0.4.37 is a release-only ts-sdk patch carrying a `MissingSigningDescriptorError` message fix; PR #676 had bumped from 0.4.35 / 0.3.40 — 0.4.36 is a release-only ts-sdk patch, 0.3.41 adds optimistic `waitFor: 'funded'` Lightning resolution + `waitForSwapFunded` + preimage backfill; PR #670 had bumped from 0.4.34 / 0.3.39 consuming ts-sdk PR #554 arkd signer-rotation support; PR #655 had bumped from 0.4.33 / 0.3.38; baseline established in PR #637 which moved pnpm `onlyBuiltDependencies` + `ignoredBuiltDependencies` from `package.json` into `pnpm-workspace.yaml`)
- Delegation accepts deprecated signer keys (PR #708): `testConnection` in `src/screens/Settings/Delegates.tsx` now validates the delegate server's advertised key against the current `aspInfo.signerPubkey` **plus** every `aspInfo.deprecatedSigners` entry still within its `cutoffDate` (each normalised to x-only), accepting the delegate when the decoded `serverPubKey` matches any of them — so a delegate keyed on a not-yet-expired deprecated signer stays valid across a cooperative key rotation. `delegateVtxos` (`src/lib/asp.ts`) wraps `dm.getDelegateInfo()` (SDK `DelegateInfo` type) in try/catch, and delegate/connection errors are logged via `consoleError` instead of throwing or `console.warn`.
- Node 24.x (PR #690): minimum Node bumped to `>=24.15.0` (`engines.node`), `.nvmrc` pins `24.15.0`, and the Docker builder image is `node:24.15.0-alpine` (was `node:22-alpine` / `>=20.19.0 || >=22.12.0`)
- Node-CLI regtest migration (PR #689): the E2E regtest stack is now driven by the in-house `arkade-regtest` Node CLI (`node regtest/regtest.mjs start|stop|clean --env .env.regtest`), replacing the removed nigiri shell scripts; `regtest:stop`/`regtest:clean` tear down `docker-compose.nak.yml` before the regtest stack (LIFO, matching CI). Stale `ARKD_IMAGE` v0.9.5 / `FULMINE_IMAGE` v0.3.23 pins dropped from `.env.regtest` so submodule defaults (incl. Fulmine v0.3.25 with its `FULMINE_DELEGATE_*` env contract) are used; regtest explorer API base is `http://localhost:3000/api`; chain-swap E2E asserts the `Amount + Fees === Total` split invariant instead of nigiri-Boltz sat constants; `docs/swaps.regtest.md` rewritten for the Node-CLI flow
- Runtime-configurable `VITE_*` + LNURL URL (PR #685): the Docker image bakes `__VITE_NAME__` placeholders and `docker-entrypoint.sh` substitutes them at startup by looping over the live `VITE_*` environment (a new runtime var only needs its Dockerfile `ARG`). New `fromRuntimeEnv()` helper (`src/lib/constants.ts`) treats a leftover `__VITE_*__` placeholder as unset — applied to the new `VITE_LNURL_SERVER_URL` (`lnurlServerUrl`), `VITE_ARK_SERVER` (`defaultArkServer`), and `VITE_BOLTZ_URL` (boltz bitcoin slot). `nginx.conf` forces a JS MIME type (`no-cache`) for `.mjs` so `wallet-service-worker.mjs` registers instead of being served as `application/octet-stream`
- Chatwoot `boltz_swap_version` attribute (PR #691): the Support screen imports `@arkade-os/boltz-swap`'s `sdkVersion` and adds it as a `boltz_swap_version` Chatwoot custom attribute (alongside `git_commit` / `build_version` / `sdk_version`)
- Branta v2 client migration (PR #675): the Send form's `BrantaService` now uses plain string-literal config (`baseUrl: 'Production' | 'Staging'`, `privacy: 'strict'`) instead of the removed `BrantaServerBaseUrl` / `PrivacyMode` enums from `@branta-ops/branta`
- Outdated-client detection on unreachable server (PR #670): `getAspInfo` (`src/lib/asp.ts`) catches the SDK's typed `ArkError` with name `BUILD_VERSION_TOO_OLD` (arkd's version guard rejects even `getInfo` when the client's `X-Build-Version` is below the server minimum) and returns `{ unreachable: true, outdated: true, minBuildVersion }` (min version read from `err.metadata.min_version`/`minVersion`, falling back to the `>= vX` substring in the message since arkd's guard error arrives with empty metadata). `AspInfo` gains `outdated?`/`minBuildVersion?`. New `aspErrorText(info, fallback)` helper shows "Your wallet is outdated and needs to be updated…" when `outdated`, else each caller's existing wording — wired across About/Server/Vtxos/Init/Wallet Index/Notes/Send/Unavailable screens, which now also react to `aspInfo.outdated` in their error effects. Copy reworded to "Arkade server" consistently (not "Ark server"); Chip gains keyboard a11y.
- VITE_DEV_MNEMONIC dev auto-init (PR #674): the dev-only auto-init (previously `VITE_DEV_NSEC` only) also accepts a 12-word mnemonic via `VITE_DEV_MNEMONIC`, preferring the mnemonic when both are set — `WalletProvider` initialises from `MnemonicIdentity` (mnemonic) or nsec; `App` keeps the wallet on the loading screen and skips the boot animation while either dev var initialises. Declared in `ImportMetaEnv` (`src/vite-env.d.ts`).
- Receive/Send copy & BIP21 fixes (PR #672): the Receive BIP21-build effect no longer clobbers an explicit copy-sheet selection on async rebuilds (LNURL re-emit, invoice arrival, swap address) — selection persists via `resolveQrValue()` until the chosen value is no longer offered, then falls back to the unified URI; tapping a copy-sheet row copies that address and switches the QR; LNURL is gated on the amountless condition (dropped from QR + copy list once an amount is set); `encodeBip21` amounts now use `useGrouping=false` so large values are plain decimals (no `1,000`); `decodeBip21` matches query keys case-insensitively via a `getParam()` helper so mixed-case keys (`Amount`, `Ark`, `Lightning`, `AssetId`) from QR codes parse correctly.
- Receive mobile clear-amount (PR #693): the on-screen `Keyboard` (`src/components/Keyboard.tsx`) gains an opt-in `onClear` prop that renders a "Clear amount" button; the Receive screen (`Receive/QrCode.tsx`) wires it (gated on `hasAmount`) so touch users can remove a set amount — previously the "Clear amount" action lived only in the desktop sheet the mobile path never rendered. Clearing now also dismisses the keyboard/sheet (matching the confirm flow), and the desktop "Clear amount" button shares the same `hasAmount` check so it also appears for asset receives. New test `src/test/screens/wallet/receive-clear-amount.test.tsx`.
- Hand-written LNURL fix in Send form (PR #696): `Send/Form.tsx`'s `parseRecipient` effect is now gated behind a debounced `readyToParse` flag (`RECIPIENT_DEBOUNCE_MS = 800`, `timeoutRef` cleared on unmount) so a manually typed LNURL is only parsed once typing settles instead of erroring on each intermediate keystroke; the per-branch `base` reset was dropped in favour of spreading the live `sendInfo` (`satoshis: satoshis ?? sendInfo.satoshis`) so partial input no longer wipes prior state, and a `404` from the LNURL conditions fetch now surfaces a dedicated "LNURL not found" error. Added coverage in `src/test/e2e/form.test.ts` and `src/test/screens/wallet/send.test.tsx`.
- Branta SDK upgraded to v3.1.3 (PR #673): uses `getPayments` for Branta verification of pasted addresses/invoices; typed-recipient Branta lookups debounced 400 ms (QR scans still verify immediately) so requests no longer fire per keystroke; the Branta badge is only wrapped in an `<a>` when a verify URL exists (no href-less placeholder link).
- BIP21 polish & Send-form bugfixes (PRs #639–#643): `Bip21Decoded` field renamed `lnurl` → `lnUrl`; `src/lib/lnurl.ts` exports `LnUrlResponse` and `checkResponse` rejects on `status === 'ERROR'`; `encodeBip21` builds the query progressively (no empty `ark=`, trims trailing `&`/`?`); Send "Max" in fiat mode now formats the balance to `fiatDecimalsFor(config.fiat)` decimals; sonner `<Toaster visibleToasts={1}>` deduplicates stacked toasts; `Refresher` doubles the pull-to-refresh threshold; LNURL-conditions `useEffect` skipped when `sendInfo.arkAddress` is set (and `arkAddress` added to its dep array); new E2E suite `src/test/e2e/form.test.ts`.
- E2E scripts use `cross-env` so `VITE_NOSTR_RELAY_URL=...` works on Windows shells too (PR #624)
- Transaction-detail TXID for offboarding batch settles (PR #648): `src/screens/Wallet/Transaction.tsx` adds `tx.roundTxid` as a third fallback after `boardingTxid`/`redeemTxid`, so offboarding transactions that settle in a batch now display a TXID instead of an empty string.
- Boarded-funds TXID link points to Arkade explorer (PR #699): `src/screens/Wallet/Transaction.tsx`'s `isOffchainTx` flag now also returns true when only `tx.roundTxid` is set (`!tx.boardingTxid && (Boolean(tx.redeemTxid) || Boolean(tx.roundTxid))`). The transaction-detail TXID link is routed by this flag in `Details.tsx` (off-chain → `openOffchainTxInNewTab`/`getOffchainTxURL`, the Arkade explorer `arkade.space` on mainnet; otherwise the on-chain mempool explorer), so round-settled offboarding "boarded funds" transactions — which display `roundTxid` after PR #648 — now link to arkade.space instead of the on-chain mempool explorer.
- Chatwoot build/SDK version attributes (PR #686): `src/screens/Settings/Support.tsx` imports `buildVersion` / `sdkVersion` from `@arkade-os/sdk` and adds them as `build_version` / `sdk_version` Chatwoot custom attributes (alongside the existing `git_commit`), so support sessions surface the wallet's build and SDK versions.
- Prevent double keys in `localStorage` (PR #677): the two storage keys are centralized in new `src/lib/storageKeys.ts` (`MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic'`, `NSEC_STORAGE_KEY = 'encrypted_private_key'`), which also breaks a circular import between `mnemonic.ts` and `privateKey.ts`. `setMnemonic` now `removeItem`s the nsec key and `setPrivateKey` `removeItem`s the mnemonic key, so a wallet can never persist both an encrypted mnemonic and an encrypted private key simultaneously (the prior double-key state that could confuse the mnemonic-first unlock detection in `isValidPassword`).
- Always show Paste button (PR #700): `Paste` (`src/components/Paste.tsx`) is now unconditionally rendered instead of pre-reading the clipboard on mount (via `useEffect`) and validating it to decide visibility. The `validator` prop was removed; on click it queries `clipboard-read` permission and pastes if the state is `prompt`/`granted`. `queryPastePermission` (`src/lib/clipboard.ts`) now returns `'prompt'` (was `'denied'`) when `navigator.permissions.query` doesn't support `clipboard-read` (Safari/Firefox), so the paste button is usable there. Simplifies `InputAddress`/`InputAssetId`/`InputNote`/`InputNpub`/`InputUrl`/`InputWithScanner`, which no longer pass a validator.

**Tags**: `wallet`, `pwa`, `react`, `typescript`, `tailwindcss`, `design-tokens`, `sonner`, `shadcn`, `lucide`, `mobile`, `desktop`, `vtxo`, `lightning`, `boltz`, `lnurl`, `self-custodial`, `offline`, `indexeddb`, `nostr`, `playwright`, `chatwoot`, `announcements`, `arkade-regtest`, `service-worker`, `abortcontroller`, `bip39`, `bip86`, `mnemonic`, `taproot`, `pbkdf2`, `aes-gcm`, `signer-rotation`, `deprecated-signer`, `delegation`, `branta`, `build-version`, `node24`, `runtime-config`, `clipboard`, `hd-wallet`, `address-rotation`, `dev-mode`

**Synonyms**: `arkade-wallet`, `web-wallet`, `pwa-wallet`, `client-app`

**Triggers**:
- **ask_question**: `how to use wallet`, `pwa features`, `lightning swap`, `lnurl receive`, `install wallet`, `nostr backup`, `announcements`
- **develop**: `add wallet feature`, `fix ui bug`, `update sdk version`, `playwright test`, `swap manager`, `lnurl session`, `pill navbar`
- **test_or_run**: `start wallet dev server`, `build pwa`, `test components`, `playwright`, `e2e test`, `arkade-regtest`, `regtest:start`

**Dependencies**: `@arkade-os/sdk` (0.4.41, JavaScript SDK), `@arkade-os/boltz-swap` (0.3.46), `@branta-ops/branta` (3.1.3), `@tanstack/react-virtual` (^3.13.19), `tailwindcss` (^4.2.2, with `@tailwindcss/vite`), `clsx` (^2.1.1), `tailwind-merge` (^3.5.0), `class-variance-authority` (^0.7.1), `sonner` (^2.0.7), `arkd` (server connection), `nostr-tools`. Requires **Node.js >= 24.15.0**.
**Depended On By**: None (end-user application)

---

### ark-faucet
**ID**: `ark-faucet`
**Name**: Ark Faucet
**Type**: Service/Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-faucet/INDEX.md`
**Repository**: `${ARK_FAUCET_REPO}`
**GitHub**: `${ARK_FAUCET_GITHUB}`

**Description**:
Offchain-only wallet service that provides HTTP APIs for distributing Ark coins to both onchain and offchain addresses. Supports covenant (Liquid) and covenantless (Bitcoin) modes. Used for testnet distributions, developer testing, and onboarding new users to the Ark ecosystem.

**Key Capabilities**:
- Public faucet endpoint (no auth required), with `/healthcheck` and CORS support
- Protected admin endpoints (balance, refill, refill-with-notes)
- Basic authentication for admin operations
- Note-based refill: mints notes via the arkd admin API (`ARK_FAUCET_SERVER_ADMIN_URL`); admin macaroon optional (works against NO_MACAROONS arkd); auto-zeroes arkd intent fees around the redeem so refill works whether or not fees are enabled
- Importable HTTP API (`pkg/handler.go`) with unit + e2e tests
- Server-side request/error logging (one line per request; errors logged 5xx/4xx)
- Offchain-only wallet (no direct blockchain interaction)
- Dual network support (Bitcoin/Liquid)
- Local dev via vendored arkade-regtest submodule; multi-arch image published to ghcr.io/arklabshq/ark-faucet

**Tags**: `faucet`, `testnet`, `distribution`, `http-api`, `offchain`, `wallet-service`, `notes`, `regtest`, `e2e`, `logging`

**Synonyms**: `testnet-faucet`, `coin-dispenser`

**Triggers**:
- **ask_question**: `how to get testnet coins`, `faucet usage`, `refill faucet`
- **develop**: `add faucet feature`, `rate limiting`
- **test_or_run**: `start faucet`, `test distribution`

**Dependencies**: `arkd` (server connection), `go-sdk` (wallet operations)
**Depended On By**: Developers and testers needing testnet coins

---

### ark-simulator
**ID**: `ark-simulator`
**Name**: Ark Simulator
**Type**: Testing/Simulation Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-simulator/INDEX.md`
**Repository**: `${ARK_SIMULATOR_REPO}`
**GitHub**: `${ARK_SIMULATOR_GITHUB}`

**Description**:
Simulation tool for testing Ark protocol under various load conditions. Creates multiple concurrent wallet clients that perform send/receive operations to stress-test arkd server performance, round settlement, VTXO management, and network throughput. Used for performance testing, capacity planning, and regression detection.

**Key Capabilities**:
- Concurrent client simulation (5-128+ clients)
- Automated send/receive cycles
- Round participation testing
- Performance metrics collection
- Configurable test scenarios (client count, transaction amounts, duration)
- Integration with arkd test environment
- Docker-based test orchestration

**Tags**: `simulation`, `testing`, `load-test`, `performance`, `stress-test`, `e2e`, `concurrent-clients`

**Synonyms**: `load-tester`, `performance-test`, `stress-test`

**Triggers**:
- **test_or_run**: `run simulation`, `load test`, `stress test arkd`, `performance test`
- **develop**: `add simulation scenario`, `modify test parameters`
- **monitor_or_alert**: `simulation metrics`, `throughput measurement`

**Dependencies**: `arkd` (server under test), `go-sdk` (client wallets)
**Depended On By**: CI/CD pipelines, performance monitoring

---

### ark-telemetry
**ID**: `ark-telemetry`
**Name**: Ark Telemetry
**Type**: Observability/Monitoring
**Language**: Go (instrumentation) + YAML (config)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/INDEX.md`
**Repository**: `${ARK_TELEMETRY_REPO}`
**GitHub**: `${ARK_TELEMETRY_GITHUB}`

**Description**:
OpenTelemetry-based observability stack for Ark protocol monitoring. Provides metrics, traces, logs and continuous profiles collection from arkd and related services. Includes Prometheus for metrics storage, Grafana for visualization, Loki for log aggregation, Jaeger for distributed tracing, and Pyroscope for continuous profiling. As of PR #9 (May 2026) the stack is deployed on a **standalone EC2 instance**, separate from the application host, with metrics segmented by `host_role` (`app` vs `telemetry`).

**Key Capabilities**:
- OpenTelemetry instrumentation for arkd
- Prometheus metrics collection and alerting (alerts split per `host_role`: `*_App` vs `*_Telemetry`)
- Grafana dashboards (host metrics & cAdvisor segmented by `host_role`, rounds, VTXOs, transactions, performance) — includes a Prometheus-backed "Signer Key VTXO Usage" panel (`ark_signer_key_matched`, stacked bars by `pubkey`) tracking active VTXOs per signer key / key-rotation progress (PR #23)
- Loki log aggregation and querying
- Jaeger distributed tracing — Jaeger v2 (`jaegertracing/jaeger:2.18.0`, PR #13), config-driven, with BadgerDB filesystem storage (volume `jaeger_data` → `/badger`, 48h span TTL, persisted across restarts); OTLP receivers on `:4317`/`:4318`; legacy `:14250` collector port removed; pre-started by a `jaeger-init` sidecar that chowns `/badger/{key,data}` to UID 10001
- Pyroscope continuous profiling (ingest port 4040)
- Pre-built dashboards for common monitoring scenarios
- Alert rules for critical conditions, routed by `host_role` label — includes per-host `DataDiskHighUsage_App` and `DataDiskHighUsage_Telemetry` (PR #12; the previous single `DataDiskHighUsage` was app-only)
- Client compatibility/integrity alerts (PR #17): Loki log-based `ArkdDigestMismatch` (invalid/missing digest headers), routed to a dedicated `slack-notifications-info` receiver hourly (the companion `ArkdMissingClientVersion` alert for requests without `x-build-version` was disabled/commented out in June 2026 — build-version adoption is tracked via the dashboard panel instead); paired with Grafana panels tracking digest mismatches, request volume by `x-build-version` (the former "Requests Missing Client Version" panel, re-segmented per build version with a `missing` series in PR #21), and request volume by `x-sdk-version` (including a `missing` series for requests with no SDK header, PR #19); panel aggregation window is selectable via a `$window` template variable (1m/5m/15m/1h, PR #20); the `DIGEST_MISMATCH` Loki queries (alert + dashboard panel) now match on the structured-metadata `error` label (`| error =~ "DIGEST_MISMATCH.*"`) rather than a raw line filter (PR #22)
- Docker Compose stack for easy deployment on a dedicated EC2 telemetry host
- Per-host-class memory-limit overrides (`docker-compose.resources.small.yaml` for t3.small/2GB, `docker-compose.resources.large.yaml` for t3.large/8GB) layered on top of the base compose file
- Grafana Google SSO/OAuth (`GF_AUTH_GOOGLE_*`); ALB-fronted on port 3000
- Centralized configuration via `.env.ark-telemetry` env file

**Tags**: `observability`, `monitoring`, `metrics`, `logs`, `traces`, `profiling`, `opentelemetry`, `prometheus`, `grafana`, `loki`, `jaeger`, `pyroscope`, `ec2`, `google-sso`

**Synonyms**: `monitoring`, `observability-stack`, `telemetry`

**Triggers**:
- **monitor_or_alert**: `arkd metrics`, `view dashboards`, `check alerts`, `query logs`, `trace requests`
- **test_or_run**: `start telemetry stack`, `grafana setup`
- **debug**: `check logs`, `view traces`, `investigate errors`

**Dependencies**: `arkd` (instrumented service)
**Depended On By**: Operations, SRE, debugging workflows

---

### arkana-knowledge
**ID**: `arkana-knowledge`
**Name**: Arkana Knowledge Base
**Type**: AI Assistant Configuration / Knowledge Base
**Language**: Markdown + TypeScript + Bash
**Index**: `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/INDEX.md`
**Repository**: `${ARKANA_KNOWLEDGE_REPO}`
**GitHub**: `ArkLabsHQ/arkana-knowledge`

**Description**:
Configuration, knowledge base, and audit trail for **Arkana**, Ark Labs' always-on AI assistant deployed on a private Hetzner VPS. Contains 17 active agent system prompts, the deep `arkwiki` knowledge base, the MCP server (TypeScript), the Slack bot (TypeScript), GitHub webhook relay (Node.js), shared agent memory, security policies, and infrastructure configs. Arkana monitors repos across ArkLabsHQ and arkade-os, reviews PRs, triages issues, surfaces security findings, and runs scheduled engineering health agents — orchestrated by Paperclip on the Claude Agent SDK.

**Key Capabilities**:
- 17 specialized AI agents (daily-briefing, pr-lifecycle, security-triage, sdk-parity, repo-sync, issue-triage, issue-staleness, release-coordinator, research-monitor, onboarding-buddy, team-pulse-weekly, self-improver, docs-auditor, linear-sync, slack-monitor, repo-detector, executive-digest)
- Paperclip orchestration of cron-scheduled and webhook-triggered agent runs
- MCP server (`https://arkana.arkade.sh/mcp`, port 3458) for external AI tool integration
- Slack bot identity `@arkanaai` with channel allowlist enforcement
- GitHub App `arkanaai[bot]` (App ID 2923031) with dual-org auth (ArkLabsHQ + arkade-os)
- Webhook relay (port 3456) for real-time GitHub event processing
- Semantic knowledge base (676MB SQLite, Gemini embeddings, 59+ repos, 6,422+ AST chunks)
- Shared agent memory with executive-digest-queue for non-noisy Slack posting
- Information classification policy (PUBLIC / INTERNAL / CONFIDENTIAL) preventing leakage to public surfaces
- Branch+PR enforcement with `agent/{name}/{date}-{slug}` naming convention
- Protocol-critical code boundary requiring human sign-off on VTXO/signing/forfeit/round/connector/exit changes
- systemd-managed services (paperclip, arkana-mcp, arkana-slack, arkana-webhook-relay)
- Nginx reverse proxy with Let's Encrypt SSL auto-renewal

**Tags**: `ai-assistant`, `knowledge-base`, `claude-agent-sdk`, `mcp-server`, `slack-bot`, `github-integration`, `paperclip`, `agent-configs`, `semantic-search`, `vps`, `automation`, `arkana`, `arklabs`, `monitoring`, `webhook-relay`, `systemd`, `nginx`

**Synonyms**: `arkana`, `arkana-config`, `arkana-brain`, `arkanaai`, `ark-labs-ai`, `arkana-bot`

**Triggers**:
- **ask_question**: `arkana`, `ai assistant`, `agent configs`, `paperclip`, `mcp server`, `arkana brain`, `what does arkana do`, `ark labs ai`, `executive digest`, `arkwiki`
- **develop**: `add agent`, `modify agent prompt`, `mcp server feature`, `slack bot`, `webhook relay`, `arkana config`, `agent config`, `paperclip schedule`
- **test_or_run**: `deploy arkana`, `restart arkana`, `arkana service`, `start mcp`, `start slack bot`, `paperclip run`
- **debug**: `agent failed`, `arkana down`, `mcp error`, `slack bot down`, `webhook missed`, `daily briefing missing`, `paperclip not firing`, `gh-token expired`

**Dependencies**: External services only — Slack API, GitHub API (two Apps), Linear API, Anthropic Claude API / OpenRouter (GLM-5), Gemini API (embeddings)
**Depended On By**: Internal Ark Labs operations (PR review automation, security triage, executive briefings) — not consumed by other Ark protocol projects

---

### arkade-regtest
**ID**: `arkade-regtest`
**Name**: Arkade Regtest
**Type**: Testing Infrastructure / Local Stack Orchestration
**Language**: Node.js (zero-dependency CLI) + Docker Compose
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-regtest/INDEX.md`
**Repository**: `${ARKADE_REGTEST_REPO}`
**GitHub**: `arkade-os/arkade-regtest`

**Description**:
Self-contained, **cross-platform** regtest environment for Ark protocol development. Orchestrates Bitcoin Core, Fulcrum, mempool (block explorer + Esplora REST `/api`), NBXplorer, arkd + arkd-wallet, Fulmine (+ delegated-signing Fulmine), Boltz Backend, two LND nodes, an LNURL server, an Nginx CORS proxy, the Arkade Wallet PWA, the Arkade Explorer, the arkade-script Emulator, and the arkade Solver into a single reproducible Docker Compose stack — driven by a **zero-dependency Node CLI** (`regtest.mjs`, Node ≥ 18). **No dependency on nigiri and no compiled binary**; runs the same on Linux, macOS, and Windows (no WSL). Designed to be embedded as a git submodule in projects that need a local Ark test network.

**Key Capabilities**:
- One-command bring-up of the full Ark stack (`node regtest.mjs start`); `npm start`/`stop`/`run clean` aliases. Phased two-wave startup for multi-profile closures — base settles first, then the app layer starts against a healthy base (avoids Docker DNS/nbxplorer-migration crash-loops; PR #35)
- Zero-dependency Node CLI (`regtest.mjs`, stdlib only) — no nigiri, no helper binary, no `npm install`; cross-platform (Linux/macOS/Windows, no WSL)
- In-house chain/indexer/explorer tier (Bitcoin Core 31 + Fulcrum + mempool + NBXplorer) replacing nigiri's electrs/esplora/chopsticks; Esplora REST API now served by mempool under `/api` (`http://localhost:3000/api`)
- Compose profiles (`base`, `ark`, `delegate`, `boltz`, `emulator`, `solver`) with automatic dependency-closure resolution; select via `--profile` or `REGTEST_PROFILES`
- Pluggable arkd via `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` (always used — no built-in fallback; default `v0.9.9-rc.1`)
- Operator signer rotation (`rotate-signer` / `set-signers` / `signer-info`) — advertise deprecated signers (DUE_NOW / MIGRATABLE / EXPIRED) to drive client migration/recovery flows (needs rc images)
- Fast VTXO expiry via block-denominated locktimes (`< 512` → regtest block scheduler; fire expiry/sweeps by mining, with `AUTOMINE_INTERVAL=0`)
- Built-in auto-miner (`AUTOMINE_INTERVAL`, default 600s) + chain tools (`mine`, `reorg`, `faucet`, `rpc` bitcoin-cli passthrough)
- `ark` / `arkd` CLI passthroughs (run inside the arkd container); CLI client wallet auto-funded 100M sats offchain on `start`
- Layered environment loading (`--env <path>` > `../.env.regtest` > `.env` > `.env.defaults`; shell env wins over files)
- Default-on arkade-script Emulator (port `7073`, opt out via `EMULATOR_IMAGE=`) and arkade Solver (`solver` profile)
- Fulmine delegation wired via `FULMINE_DELEGATE_ENABLED` / `FULMINE_DELEGATE_FEE` (fixed in PR #32)
- Lightning helpers (`create-invoice` / `pay-invoice`) via Boltz LND
- Stop / clean lifecycle (preserve volumes vs full teardown + signer-set reset)
- Ready-made GitHub Actions integration (Docker images only — no Go setup, no nigiri cache)

**Tags**: `regtest`, `docker-compose`, `node-cli`, `regtest.mjs`, `cross-platform`, `bitcoin`, `bitcoin-core-31`, `mempool`, `fulcrum`, `nbxplorer`, `esplora-api`, `ark`, `arkd`, `fulmine`, `boltz`, `lightning`, `lnd`, `submodule`, `e2e`, `integration-test`, `local-stack`, `ci`, `profiles`, `emulator`, `arkade-script`, `solver`, `signer-rotation`, `deprecated-signer`, `block-locktimes`, `fast-expiry`

**Synonyms**: `regtest-stack`, `ark-regtest`, `regtest-env`, `local-stack`, `arkade-regtest-stack`, `regtest-node-cli`

**Triggers**:
- **ask_question**: `regtest`, `local stack`, `regtest.mjs`, `node regtest`, `start ark locally`, `how to run ark stack`, `submodule regtest`, `ark dev environment`, `compose profiles`, `emulator`, `arkade-script signer`, `solver`, `signer rotation`
- **develop**: `bump regtest image`, `add service to regtest`, `modify .env.defaults`, `add compose profile`, `compose stack`, `enable emulator`, `disable emulator`, `enable solver`, `signer rotation`, `block locktimes`
- **test_or_run**: `start regtest`, `node regtest.mjs start`, `regtest stop`, `regtest clean`, `regtest faucet`, `regtest mine`, `rotate-signer`, `run e2e`, `bring up ark stack`, `local boltz`, `ci regtest`
- **debug**: `regtest stuck`, `port in use`, `arkd exits immediately`, `boltz lnd not synced`, `clean regtest`, `emulator /v1/info timeout`, `sweeps fire mid-test`, `fulmine delegation not enabled`, `nbxplorer crash loop`

**Dependencies**: `arkd` (server image), `arkd-wallet` (signer image), `fulmine` (image, incl. delegator), `boltz-backend` (image), `wallet` (PWA image), `arkade-explorer` (image), `arkade-os/emulator` (image, default-on), `arkade-os/solver` (image, `solver` profile). Upstream Docker images: Bitcoin Core, Fulcrum, mempool, NBXplorer, LND (BTCPay builds)
**Depended On By**: `arkd`, `fulmine`, `go-sdk`, `ts-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet`, `boltz-swap`, `boltz-backend`, CI pipelines (consumed as a submodule)

---

### arkade-wdk
**ID**: `arkade-wdk`
**Name**: Arkade WDK
**Type**: Client Library / Wallet Adapter
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-wdk/INDEX.md`
**Repository**: `${ARKADE_WDK_REPO}`
**GitHub**: `ArkLabsHQ/arkade-wdk`

**Description**:
WDK (Wallet Development Kit) compatible Bitcoin wallet adapter built on top of `@arkade-os/sdk` (currently `0.1.3`), with optional Lightning support via `@arkade-os/boltz-swap`. Implements Tether's WDK `WalletManager` and `WalletAccount` contracts (`@tetherto/wdk-wallet`) so any WDK-based application — most notably React Native apps using `@tetherto/wdk-react-native-provider` — can plug in Ark as its Bitcoin backend. `getAccount(index)` resolves a distinct BIP-86 path (`m/86'/<coin>/0'/0/<index>`, `coin = 0` for bitcoin mainnet, `1` otherwise) and memoises a per-path SDK wallet; the index is a key-derivation leaf, not a role — every account exposes Ark address, boarding address, and Lightning invoice creation from the same underlying wallet. Ships submodules for the bare-kit worklet (`pear-wrk-wdk`), the React Native provider, and an Expo demo app, with local modifications tracked as patches under `./patches/`.

**Key Capabilities**:
- WDK `WalletManagerArkade` (`getAccount`, `getAccountByPath`, `getFeeRates`, `dispose`)
- Per-index BIP-86 wallets: `getAccount(index)` resolves `m/86'/<coin>/0'/0/<index>` and memoises a distinct SDK wallet per path; every account exposes `getAddress()` (Ark address — always), `getBoardingAddress()` (on-chain BTC deposit), and `createLightningInvoice()` (gated on `swapProviderUrl`)
- WDK `WalletAccountArkade` with send/sign/verify/quote and read-only conversion
- Destination auto-detection for Ark address, BTC address, BOLT11 invoices, Lightning addresses, and LNURL
- Lightning receive via `createLightningInvoice()` (HRPC → Boltz reverse swap)
- Lightning send via auto-detected BOLT11 in `sendTransaction()` (Boltz submarine swap)
- LNURL / Lightning-address routing in `sendTransaction()` (`EMAIL` → LNURL ark-address fast path → BOLT11 fallback)
- Utility exports: address detection, BIP21 encode/decode, fees, sat formatting
- RN-side Arkade balance via `WalletAccountArkade.getBalance()` (Esplora REST still used for boarding)
- Incoming-funds subscription via `WalletAccountArkade.subscribeToIncomingFunds(callback)` for RN auto-refresh
- Boltz `referralId: 'arkade-wdk-sdk'` forwarded to `BoltzSwapProvider` (default Boltz API: `https://api.boltz.exchange`)
- Build-version guard: detects arkd's structured `BUILD_VERSION_TOO_OLD` ArkError on `getInfo()` and surfaces an actionable "update `@arkade-os/sdk`" error (with operator `min_version`) instead of retrying
- RN provider `BitcoinArkadeChainConfig.swapProviderUrl?` and starter app `EXPO_PUBLIC_BOLTZ_SWAP_URL` env var wire Lightning into the React Native chain config
- `npm run release` script (`scripts/release.js`) — tag → `npm publish` → push tag, with tag cleanup on publish failure
- Transaction history via HRPC → SDK
- Patch-based submodule overlay (`scripts/setup-dev.js`, `scripts/generate-patches.js`)

**Tags**: `typescript`, `wallet`, `wdk`, `tetherto`, `react-native`, `expo`, `bitcoin`, `ark`, `vtxo`, `lightning`, `boltz`, `bolt11`, `lnurl`, `bip21`, `submodules`, `npm`

**Synonyms**: `@arkade-os/wdk`, `arkade-wdk-adapter`, `wdk-arkade`, `tether-wdk-arkade`

**Triggers**:
- **ask_question**: `wdk`, `wallet development kit`, `tetherto wdk`, `react native ark wallet`, `arkade wdk`, `boarding offchain lightning account`, `lightning address routing`, `lnurl payment`
- **develop**: `wdk adapter`, `add wdk method`, `walletmanagerarkade`, `walletaccountarkade`, `lnurl helper`, `bip21 helper`, `lightning invoice`, `lnurl routing`, `submodule patch`
- **test_or_run**: `npm test`, `setup:dev`, `generate-patches`, `npm run release`, `release script`, `expo example`, `wdk-starter-react-native`, `EXPO_PUBLIC_BOLTZ_SWAP_URL`
- **debug**: `getfeerates zero`, `balance always zero android`, `bip21 not accepted`, `patch does not apply`, `arkadeSwaps null`, `lnurl payment fails`, `amount mismatch lnurl`, `build version too old`, `update sdk error`, `getinfo rejected`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk` 0.4.35), `boltz-swap` (`@arkade-os/boltz-swap` 0.3.40, optional for Lightning), `@tetherto/wdk-wallet`, `@tetherto/wdk` (consumer-side)
**Depended On By**: External WDK-based React Native / Node apps via `@tetherto/wdk-react-native-provider`

---

### arkade-assets
**ID**: `arkade-assets`
**Name**: Arkade Assets
**Type**: Protocol Specification
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-assets/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/arkade-assets`
**GitHub**: `https://github.com/ArkLabsHQ/arkade-assets`

**Description**:
UTXO-native asset system for Bitcoin transactions designed to operate seamlessly within the Ark protocol. Provides complete specification and reference implementation for creating, transferring, and managing digital assets (fungible and non-fungible) both on-chain (Bitcoin) and off-chain (Ark VTXOs). Features teleport transfers for asset continuity across Ark batch swaps, control assets for reissuance, metadata management with Merkle-based verification, and introspection opcodes for smart contract capabilities via Arkade Script.

**Key Capabilities**:
- UTXO-native asset protocol inspired by Runes and Liquid Assets
- Hybrid on-chain/off-chain operation with unified state view
- Teleport transfers for seamless asset movement across Ark batches
- Control assets for token reissuance and metadata updates
- Flexible metadata system with Merkle root verification
- Arkade Script introspection opcodes for smart contracts
- Reference codec implementation in TypeScript
- Indexer for tracking asset state across blockchain
- CLI tools for transaction creation and testing
- Complete examples including NFT game (ArkadeKitties)

**Tags**: `arkade`, `assets`, `protocol`, `specification`, `bitcoin`, `utxo`, `nft`, `tokens`, `teleport`, `metadata`, `smart-contracts`, `arkade-script`, `codec`, `indexer`

**Synonyms**: `arkass`, `arkade-asset-protocol`, `arkade-assets-v1`, `asset-protocol`, `arkade-nft`, `arkade-tokens`, `vtxo-assets`, `teleport-transfers`

**Triggers**:
- **ask_question**: `arkade assets`, `asset protocol`, `teleport`, `control asset`, `metadata`, `arkade script`, `asset id`, `reissuance`, `op_return`, `tlv`, `packet format`, `asset group`, `arkadekitties`
- **develop**: `implement asset`, `create asset`, `add teleport`, `metadata update`, `encode packet`, `decode packet`, `arkade script contract`
- **test_or_run**: `test codec`, `run indexer`, `build docs`, `example transaction`, `cli`
- **debug**: `invalid packet`, `asset not found`, `teleport failed`, `indexer error`, `metadata mismatch`

**Dependencies**: `arkd` (protocol implementation), `wallet` (asset UI)
**Depended On By**: `wallet`, `arkade-explorer` (asset features)

---

### ark-infra
**ID**: `ark-infra`
**Name**: Ark Infrastructure
**Type**: Infrastructure-as-Code
**Language**: HCL (OpenTofu/Terraform) + YAML (Docker Compose)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-infra/INDEX.md`
**Repository**: `${ARK_INFRA_REPO}`
**GitHub**: `${ARK_INFRA_GITHUB}`

**Description**:
Infrastructure-as-Code (IaC) for deploying and managing Ark protocol infrastructure across local, staging, and production environments. Uses OpenTofu (Terraform alternative) for AWS resources and Docker Compose for local development stacks. Includes production-ready configurations for arkd, databases, monitoring, and networking.

**Key Capabilities**:
- OpenTofu modules for AWS infrastructure (EC2, RDS, S3, VPC, ALB)
- Docker Compose stacks for local development
- Multi-environment support (local, dev, staging, prod)
- Database provisioning (PostgreSQL, Redis)
- Multi-AZ HA: 3-AZ VPC (eu-central-1a/1b/1c), Multi-AZ RDS, Multi-AZ Redis with automatic failover
- NAT-per-AZ feature flag (`vpc_nat_per_az`) for HA vs cost-optimized topologies
- RDS Performance Insights and configurable automatic backups (prod: 30 days)
- Network configuration (VPC, security groups, load balancers)
- Monitoring stack deployment (Prometheus, Grafana)
- Centralized container logging to AWS CloudWatch via Docker `awslogs` driver (`/ark/${env}` log group)
- Secret management (AWS Secrets Manager)
- Automated backups and disaster recovery
- Admin dashboard with URL-based deployment via SSM (`Ark-DeployService`)
- Port forwarding to EC2 services and remote hosts (RDS, Redis)
- Image pinning script for running container digest collection
- Deploys arkd / arkd-wallet `v0.9.10` from GHCR (`ghcr.io/arkade-os/arkd*`, bumped in #96); Traefik upgraded to `v3.6.14`
- **NBXplorer** — **prod (since #97)** runs the stock `nicolasdorier/nbxplorer:2.6.8` image directly; the local `compose/Dockerfile.nbxplorer` curl-override hack was removed and the file deleted. **Regtest** still builds `ark-infra/nbxplorer:2.6.7-curl` from `Dockerfile.nbxplorer` (adds `curl` on top of `nicolasdorier/nbxplorer:2.6.7`). Health check is a JSON-RPC `POST /v1/cryptos/BTC/rpc` (`getblockchaininfo`) probing for `"result"` (60 retries × 5s). `arkd-wallet` declares `depends_on: { nbxplorer: { condition: service_healthy } }` in both prod and regtest compose stacks
- **ark-metrics** (`ghcr.io/arklabshq/ark-metrics:v0.1.0`, prod only, since #98) — collects Ark protocol metrics and exports them to the telemetry stack over OTLP to `otel-agent` (`ARK_METRICS_OTLP_ENDPOINT=http://otel-agent:4318`, insecure); `depends_on: [arkd, otel-agent]`, reads the arkd projection DB (`${ARKD_PG_DB_URL}`) and Ark info API (`https://${ARKD_DOMAIN}`); `traefik.enable=false`; CloudWatch stream `ark-metrics`
- **Telemetry split (2026-05)**: telemetry stack (Grafana, Prometheus, Loki, Jaeger, Alertmanager, Pyroscope, OTLP collector) now runs on a **dedicated EC2 instance in an Auto Scaling Group** provisioned by `modules/ark/telemetry.tf` (Ansible-based bootstrap via `modules/ark/ansible/telemetry-playbook.yml`); app hosts run only `otel-agent` (`otel/opentelemetry-collector-contrib:0.151.0`) and `cadvisor` (`v0.56.2`) bundled in the Ark Compose stack
- **Persistent telemetry state (2026-06, #80)**: telemetry ASG is now **pinned to a single subnet/AZ** (`telemetry_subnet_id`, required) and mounts a **re-attachable encrypted `gp3` EBS data volume** (`aws_ebs_volume.telemetry_data`, tag `ark-telemetry-data-${env}`) at `/dev/xvdb` → `/mnt/data`, with Docker's `data-root` relocated to `/mnt/data/docker` so Prometheus / Loki / Grafana state survives instance recycles (trades multi-AZ HA for stateful telemetry). Sized via `telemetry_data_volume_size` (default 20 GB; prod 30 GB), with `telemetry_root_volume_size` (default 20) replacing the hardcoded 60 GB root. Staging downgraded to `t3.small` (`subnet-0929002f609855e83`); prod initialized at `t3.large` + 30 GB data (`subnet-0aa4bfb28c983f5be`, both `eu-central-1b`). Instance role gains `ec2:Describe{Volumes,VolumeStatus,VolumeAttribute,Instances,Tags}` plus `ec2:AttachVolume`/`DetachVolume` scoped by `ec2:ResourceTag/Environment`. Bootstrap renamed (`scripts/user-data.sh` → `user-data-telemetry.sh`, `ansible/playbook.yml` → `telemetry-playbook.yml`); Ansible requirements bumped to `amazon.aws >= 10.3.1` plus `community.general`, `ansible.posix`; playbook cleans stale `/mnt/data/docker/containers` from prior boots and uses retried `ec2_vol` attach with IMDSv2 facts
- **Shared internet-facing ALB** (`modules/ark/alb.tf`) with HTTPS listener (ACM cert, `ELBSecurityPolicy-TLS13-1-2-2021-06`) routes to Grafana target group (`/api/health` health check); Grafana publicly accessible via `telemetry_grafana_host` with **Google SSO**
- **AWS Cloud Map** service discovery (`modules/ark/service_discovery.tf`) for app → telemetry routing; app `.env.ark` requires `ARK_TELEMETRY_COLLECTOR_ENDPOINT` (e.g. `telemetry.ark-staging.internal:4317`)
- IMDSv2-only, least-privilege IAM (`ark-telemetry-role-${env}`) with scoped `ssm:GetParameter` on `${ssm_prefix}/*` and `servicediscovery:Register/Deregister/ListInstances`; CloudWatch log streams for `otel-agent` and `cadvisor`
- SSM parameter convention migrated to **`secure`-at-end naming** (e.g. `/grafana/google/secure/client-secret`); unified `ssm_prefix` shared by app and telemetry modules
- New `apps/ark/staging/` OpenTofu entry point composes `modules/ark` for the staging stack (S3 backend `ark-dev-terraform-state`, DynamoDB `terraform-state-lock`, VPC/subnet lookups by `Name` tag)
- Developer sandbox sub-accounts now include `aruokhai` alongside `se7enz` (`aws/dev-438465126741/organizations.tf`), each with scoped `sts:AssumeRole` IAM user policies and an `aws.aruokhai` provider alias bootstrapping an IAM admin user (the `aruokhai` IAM user carries `lifecycle { ignore_changes = [tags] }` so out-of-band tag edits aren't reverted by OpenTofu)
- **arkd on shared ALB (2026-05)**: `modules/ark/arkd.tf` adds three target groups (gRPC `arkdg-*` with `/grpc.health.v1.Health/Check`, SSE streaming `arkds-*`, REST `arkdr-*`) on port 7070; routed by host header (`arkd_hosts`), `content-type: application/grpc*`, and SSE path patterns (`arkd_sse_streaming_endpoint_paths` default `/v1/batch/events`, `/v1/txs`, `/v1/indexer/script/subscription/*`). HTTP/1.1 default (`arkd_http1_support`) to keep ALB negotiation simple; Grafana rule deprioritized to 100. ALB `idle_timeout = 180s` (exceeds arkd 60s SSE heartbeats and Cloudflare's 120s edge timeout); ALB access + connection logs ship to `ark-logs-${env}-${account_id}` S3 bucket (lifecycle by `alb_log_retention_days`, default 30, staging 7)
- Staging now reachable at `staging.arkade.sh` (Route53 zone in `aws/dev-438465126741/route53.tf`, A-record aliases to ALB) and `staging-cf.arkade.sh` (Cloudflare-proxied, TLS Full Strict via new ACM cert with SANs `*.staging.arkade.sh`, `staging-cf.arkade.sh`); Grafana moved to `telemetry.staging.arkade.sh`; `scripts/alb-spot-check.sh` probes gRPC/REST/SSE over HTTP/1.1 and HTTP/2
- **Prod stack live (2026-05-26)**: new `apps/ark/prod/` OpenTofu entry point composes `modules/ark` (env=prod) — S3 backend `ark-prod-terraform-state` + DynamoDB `terraform-state-lock`, VPC/subnet lookup by `Name` tag (`ark-vpc-prod`, `ark-private-*`, `ark-public-*`), app instance `i-0f3d436aad5dbf55e`, `ark_infra_branch`/`ark_telemetry_branch = master`. Reachable at `prod.arkade.sh` (direct A-record alias) and `prod-cf.arkade.sh` (Cloudflare-proxied); Grafana at `telemetry.prod.arkade.sh`; ACM cert SANs `*.prod.arkade.sh`, `prod-cf.arkade.sh`; `alb_log_retention_days = 30`. Prod-account Route53 hosted zone `prod.arkade.sh` added in `aws/prod-982590065524/route53.tf`
- **SSM DB-dump utility** (`Ark-DumpDatabase-${env}`): `aws ssm send-command` runs `pg_dump` on the app instance for `projection|event|nbxplorer`, uploads to `s3://ark-tmp-${env}/db-dumps/` (7-day expiry, AES256, public-access blocked); scoped IAM (`s3:PutObject` on dump prefix, `ssm:GetParameter` on `/ark/${env}/db/*`); dump path `/mnt` to use the data volume. New module S3 bucket `ark-tmp-${env}` lives in `modules/ark/s3.tf`; VPC-endpoint SG refactored to standalone `aws_security_group_rule`s to avoid cross-stack plan drift
- **Google Workspace SAML SSO** per AWS account (prod `982590065524`, dev `438465126741`) with reusable modules `ark-iam-roles` and `ark-gws-sync`
- Four-tier role model with prefix per account (`ArkProd*` / `ArkDev*`): SuperAdministrator, Administrator, Developer, ReadOnly
- Layered guardrail policies (`AdminRestrictions`, `DeveloperRestrictions`, `SSMPortForwarding`): deny secrets, Terraform state mutation, security-tooling tampering, sensitive log groups (`/*secure*`, `/aws/ssm/sessions/*`), and SSM shell sessions for non-SuperAdmins
- Lambda (`secure-gws-aws-sync-{env}`) reconciles GWS group membership to the `Amazon.Role` attribute every 15 min; multi-account aware (preserves sibling-account attributes) and revokes orphaned users
- ABAC enabled via `sts:TagSession`; account ID derived from `data.aws_caller_identity` (no hardcoded account variable); provider `default_tags` standardized (`ManagedBy = "opentofu"`, `Repository`, `Owner`)
- Nix devshell (`flake.nix` + `.envrc`) pinning OpenTofu 1.9.1, Node.js 20, and Python 3 for reproducible local tooling
- Per-developer AWS Organizations sandbox sub-accounts under the dev account (`aws/dev-438465126741/organizations.tf`) with scoped `sts:AssumeRole` IAM user policies for `OrganizationAccountAccessRole`
- **Shared VPC module (2026-06, #86)**: new reusable `modules/vpc/` defining VPC, 3-AZ public/private subnets (tagged `Tier = public|private`), IGW, NAT topology (`nat_per_az` bool, default `true` HA / `false` single shared NAT in first AZ), egress-only `vpc_endpoints_sg` (callers add their own ingress rules), six interface VPC endpoints (`ssm`, `ssmmessages`, `ec2messages`, `ecr.api`, `ecr.dkr`, `logs`) and S3 gateway endpoint. Required provider `hashicorp/aws ~> 5.0`. Intended to migrate VPC ownership out of `docker-compose/opentofu` and into per-account stacks (`module.vpc_{staging,prod}` in `aws/{dev-438465126741,prod-982590065524}/`); not yet wired into `apps/ark/*`. Companion `scripts/migrate-vpc-state.sh [--dry-run] <staging|prod>` backs up source + target states, imports live VPC/IGW/subnets/route tables/NAT/endpoints into the target stack, and prints (does not run) `tofu state rm` commands for the source — old `vpc_endpoints_ingress_app` rule is removed but not re-imported. Expected first-apply drift after import: subnet `Tier` tag additions + endpoint SG description change (both intentional)
- **Telemetry resource profiles (2026-06, #88)**: new validated `telemetry_resource_profile` variable (`small` | `large`, default `large`) layers a `docker-compose.resources.{profile}.yaml` override on the `ark-telemetry.service` systemd unit (both `ExecStart` and `ExecStop`) so container memory/CPU limits track instance size. Staging set to `small`, prod set to `large`. The telemetry instance also installs the **Amazon CloudWatch Agent** (latest .deb; AWS does not publish versioned URLs) with `cpu` / `mem` / `disk` (scoped to `/` and `/mnt/data`, `tmpfs/devtmpfs/overlay/squashfs` ignored) collection dimensioned by `InstanceId`; IAM gains `CloudWatchAgentServerPolicy` on `ec2_telemetry_role`. Grafana now explicitly enables brute-force login protection (`GF_AUTH_DISABLE_BRUTE_FORCE_LOGIN_PROTECTION=false`, `…_BY_IP=false`)
- **App-side CloudWatch alarms fixed (2026-06, #83)**: the single `HighDisk-${env}` alarm split into `HighDisk-Root-${env}` (path `/`, `nvme0n1p1`/ext4) and `HighDisk-Data-${env}` (path `/mnt/data`, `nvme1n1`/ext4); CloudWatch Agent config on both prod and regtest user-data appends `InstanceId` dimension, scopes disk metrics to `/` + `/mnt/data` (drops noisy tmpfs/overlay), and regtest now also publishes CPU metrics matching prod
- **otel-agent OTLP keepalive (2026-06, #81)**: `modules/ark/agent/otel-agent-config.yaml` exporter now sets `keepalive.time=30s`, `keepalive.timeout=5s`, `keepalive.permit_without_stream=true` to keep the app-side agent → central collector gRPC channel alive across idle periods
- Deploys arkd / arkd-wallet `v0.9.9` from GHCR (`ghcr.io/arkade-os/arkd*`, bumped in #94 from `v0.9.7`)
- **Telemetry image pre-pull hotfix (2026-06)**: `modules/ark/ansible/telemetry-playbook.yml` now runs `docker compose -f docker-compose.otel.yaml -f docker-compose.resources.{{ resource_profile }}.yaml pull` immediately before installing/starting the `ark-telemetry` systemd unit, so images are fetched ahead of service start (avoids slow/failed first-boot starts)
- **Threat-monitor deployed to prod (2026-06, #92)**: new `threat-monitor` service (`ghcr.io/arklabshq/threat-monitor:v0.2.5`) added to `compose/docker-compose.ark.prod.yaml` (prod only). Watches on-chain + mempool for threats via the `nbxplorer` on-chain provider (`THREAT_MONITOR_NBXPLORER_URL=http://nbxplorer:32838`), the Ark indexer (`https://${ARKD_DOMAIN}`), the Ark explorer (`https://arkade.space`), and a mempool.space explorer; mempool scan every `300s`, block reconcile disabled (`0s`), scanning from `START_HEIGHT=952900`. Alerts go to a Slack webhook (new required env var `THREAT_MONITOR_SLACK_WEBHOOK_URL`). State persists in a named `threat-monitor` volume (`/data/threat-monitor.badger`); `traefik.enable=false`; ships logs to CloudWatch stream `threat-monitor`. `depends_on: nbxplorer` is intentionally commented out to reduce the risk of NBX restarts
- **Foundation module (2026-07, #99)**: new reusable `modules/foundation/` for **long-lived** resources that survive app-stack destroy/recreate. Provisions the **master KMS key** (`alias/ark-master-{env}`, multi-region symmetric, rotation on, root-only policy, **not** shared cross-account — for secrets encryption), the **data KMS key** (`alias/ark-data-{env}`, multi-region symmetric, rotation on, optionally shared cross-account via `data_key_cross_account_ids` for e.g. EBS snapshot sharing), and the **arkd wallet signer-key secret** (`ark/${env}/arkd-wallet-signer-key`, Secrets Manager, encrypted with the master key). The module creates **containers only** — secret/SSM values are set outside Terraform to keep them out of state. Vars: `env` (prod|staging|regtest), `kms_key_deletion_window_in_days` (default 30, validated 7–30), `data_key_cross_account_ids` (default `[]`). Outputs both key ARNs/IDs plus the secret ARN/name. Wired into `aws/dev-438465126741/main.tf` (env=`staging`, deletion window 7, data key shared with prod account `982590065524`)
- **Base AMI via Packer + Ansible (2026-07, #102)**: new top-level `packer/` + `ansible/` build a reusable **base image** — `ark-base-ubuntu-26.04-arm64-<timestamp>` on Ubuntu 26.04 LTS, **arm64 / Graviton only**, `eu-central-1`, built with `amazon-ebs` + `ansible-local` (manifest post-processor). Deliberately minimal (no Docker, no `ufw`/`fail2ban`; SSM-only, no SSH ingress). The connection-agnostic `ansible/site.yml` (`hosts: all`) runs the same roles at Packer build time and idempotently on a **live host** via `/opt/ark/ansible`: `baseline`, `awscli` (installs the AWS CLI, verifying the installer against a committed PGP key `roles/awscli/files/aws-cli.gpg`), `ssm_agent`, `cloudwatch_agent` (ships a minimal `00-baseline.json` host-metrics config, merged; overridable by file drop or `cloudwatch_agent_fetch_from_ssm`), `ansible_runtime`, and build-only `deprovision` (gated on `packer_build_name`). Packer vars: `region`, `instance_type` (`t4g.small`), `root_volume_size` (20), `kms_key_id`, `git_sha`; `ansible/requirements.yml` pulls `community.general >= 8.0.0`. Follow-up (not yet done): wire Terraform to consume the AMI via `data "aws_ami"` (replacing hardcoded AMI ids)

**Tags**: `infrastructure`, `iac`, `terraform`, `opentofu`, `aws`, `docker-compose`, `deployment`, `devops`, `postgres`, `redis`, `vpc`, `multi-az`, `nat-per-az`, `ssm`, `port-forwarding`, `admin-dashboard`, `cloudwatch-logs`, `awslogs`, `cloudwatch-agent`, `cloudwatch-alarms`, `performance-insights`, `traefik`, `ghcr`, `iam`, `sso`, `saml`, `google-workspace`, `federation`, `abac`, `guardrails`, `nix`, `direnv`, `aws-organizations`, `sandbox-accounts`, `alb`, `asg`, `cloud-map`, `service-discovery`, `ansible`, `imdsv2`, `grafana-sso`, `grafana-brute-force`, `otel-agent`, `otlp-keepalive`, `cadvisor`, `pyroscope`, `alb-arkd`, `target-groups`, `grpc-alb`, `sse`, `route53`, `cloudflare-proxy`, `acm`, `alb-access-logs`, `s3-logs`, `pg-dump`, `db-backup`, `nbxplorer`, `healthcheck`, `dockerfile-override`, `ebs`, `persistent-volume`, `telemetry-state`, `telemetry-resource-profile`, `single-az`, `vpc-module`, `state-migration`, `subnet-tags`, `threat-monitor`, `security-monitoring`, `slack-alerts`, `foundation-module`, `kms`, `multi-region-key`, `key-rotation`, `secrets-manager`, `signer-key`, `packer`, `base-ami`, `graviton`, `arm64`, `ubuntu`

**Synonyms**: `infrastructure-as-code`, `deployment`, `iac`, `terraform-stack`

**Triggers**:
- **develop**: `add infrastructure`, `modify aws resources`, `update compose stack`
- **test_or_run**: `deploy stack`, `provision infrastructure`, `terraform apply`
- **monitor_or_alert**: `infrastructure monitoring`, `resource usage`

**Dependencies**: `arkd`, `ark-telemetry` (deployed services)
**Depended On By**: Production deployments, staging environments

---

### kms-unlocker
**ID**: `kms-unlocker`
**Name**: KMS Unlocker
**Type**: Service/Security Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/kms-unlocker/INDEX.md`
**Repository**: `${KMS_UNLOCKER_REPO}`
**GitHub**: `${KMS_UNLOCKER_GITHUB}`

**Description**:
Automated wallet unlock service with AWS KMS integration. Monitors arkd-wallet for lock state and automatically unlocks using credentials stored in AWS Secrets Manager. Provides production-grade secret management, connection resilience, backup systems (SSM fallback), and graceful degradation.

**Key Capabilities**:
- Automatic wallet unlock on startup and lock detection
- AWS KMS integration for secure credential storage
- AWS Secrets Manager for password retrieval
- SSM Parameter Store fallback (backup system)
- Connection resilience (exponential backoff, circuit breaker)
- Health check endpoint
- LocalStack support for local testing
- Graceful shutdown and cleanup

**Tags**: `security`, `automation`, `wallet`, `kms`, `secrets-manager`, `aws`, `unlock`, `credentials`, `resilience`

**Synonyms**: `wallet-unlocker`, `kms-service`, `secret-management`

**Triggers**:
- **ask_question**: `how to unlock wallet`, `kms integration`, `secret management`
- **develop**: `add unlock logic`, `improve resilience`, `backup system`
- **test_or_run**: `test with localstack`, `integration test`
- **debug**: `unlock failed`, `connection issues`, `kms errors`

**Dependencies**: `arkd-wallet` (wallet service to unlock)
**Depended On By**: Production arkd deployments requiring automated unlocking

---

### fulmine
**ID**: `fulmine`
**Name**: Fulmine
**Type**: Service/Bitcoin Wallet
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md`
**Repository**: `${FULMINE_REPO}`
**GitHub**: `${FULMINE_GITHUB}`

**Description**:
Bitcoin wallet daemon with Lightning Network swap integration via Boltz. Provides both CLI and web interface for wallet management, submarine swaps (onchain → Lightning), and VHTLC (Virtual Hash Time-Locked Contract) support for Ark integration. Built with btcd wallet backend.

**Key Capabilities**:
- Bitcoin wallet operations (send, receive, balance)
- Lightning Network submarine swaps (onchain → Lightning)
- Reverse submarine swaps (Lightning → onchain)
- Chain swaps (Ark ↔ Bitcoin on-chain, no Lightning required)
- Boltz provider integration with swap restoration on restart
- VHTLC support for Ark-Lightning bridge (with renewal and settle APIs)
- Delegator service for VTXO refresh delegation (separate gRPC/REST on port 7002)
- OpenTelemetry observability (traces, metrics, logs) and Pyroscope profiling
- GetVtxos and NextSettlement query APIs
- Web interface for swap management and delegation
- CLI for wallet operations
- SQLite/Badger storage for wallet and swap state
- Docker deployment ready

**Tags**: `wallet`, `lightning`, `swap`, `submarine-swap`, `chain-swap`, `boltz`, `bitcoin`, `vhtlc`, `delegator`, `opentelemetry`, `cli`, `web-interface`, `sqlite`

**Synonyms**: `lightning-wallet`, `swap-service`, `fulmine-wallet`

**Triggers**:
- **ask_question**: `lightning swap`, `submarine swap`, `chain swap`, `how to swap`, `vhtlc`, `delegator`, `delegation`
- **develop**: `add swap feature`, `improve swap logic`, `web ui`, `chain swap`, `delegator`
- **test_or_run**: `start fulmine`, `test swap`, `run web interface`, `e2e test`
- **debug**: `swap failed`, `htlc issues`, `boltz errors`, `chain swap stuck`, `delegation failed`

**Dependencies**: `boltz-backend` (external swap provider), Bitcoin node (btcd/bitcoind)
**Depended On By**: `wallet` (for Lightning swap functionality), users needing Lightning liquidity

---

### boltz-backend
**ID**: `boltz-backend`
**Name**: Boltz Backend
**Type**: External Service/Swap Infrastructure
**Language**: TypeScript/Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-backend/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/boltz-backend`
**GitHub**: `${BOLTZ_BACKEND_GITHUB}`

**Description**:
Backend infrastructure for Boltz Exchange enabling non-custodial atomic swaps between Bitcoin layers. Provides trustless swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM chains using HTLCs and Taproot. RESTful API for swap creation and monitoring. Hybrid TypeScript + Rust architecture for performance and reliability.

**Key Capabilities**:
- Submarine swaps (Chain → Lightning)
- Reverse submarine swaps (Lightning → Chain)
- Chain swaps (Chain → Chain) across Bitcoin/Liquid/EVM (incl. 0-amount **and underpaid** EVM commitments for chain swaps, which are recorded and routed through `transaction.lockup.failed` → renegotiation; Submarine Swaps still reject underpaid commitments)
- Atomic HTLC-based swaps (non-custodial)
- Taproot cooperative claims/refunds for privacy (with documented `transaction.claim.pending` / `transaction.refund.pending` states)
- 0-confirmation support for small amounts; recomputed on chain-swap renegotiation
- BOLT12 offers and blinded paths (hardened)
- Persisted claim transaction tracking for reverse/chain swaps with FK-enforcing Postgres trigger
- Client-supplied **swap routing metadata** (`swap_metadata` table, PR #1423): optional HEX-encoded blob (≤ **1024 bytes** / 2048 hex chars) accepted on `/v2/swap/{submarine,reverse,chain}` creation and returned on `/v2/swap/restore`; also settable/replaceable post-creation via `PATCH /v2/swap/{id}/metadata` for any swap type (PR #1455, backed by an upsert `SwapMetadataRepository.set`; `404` if the swap id is unknown)
- **Rescue/restore of EVM swaps** (PR #1434): `POST /v2/swap/restore` accepts a new variant — a single EVM `claimAddress` plus `timestamp` + EIP-191 `signature` proving ownership (signed message `Boltz swap restore\naddress: <EIP-55 address>\ntimestamp: <unix-secs>`, `timestamp` must be within **60s** of server time to bound replay). Returns `RestorableSwap`s whose `claimDetails` are discriminated by a `type` field (`utxo` → `RestoreClaimDetails` with swap tree + MuSig key, or `evm` → new `RestoreEvmClaimDetails` with `contractAddress` / `claimAddress` / `EvmTransaction`; full lockup values reconstructible from the contract `Lockup` event filtered by preimage hash). Backed by new partial indexes on `claimAddress` for `reverseSwaps` and `chainSwapData` (Sequelize schema **v27**). The `Transaction` schema in restore responses now returns `id` + `vout` instead of `id` + `hex`, and the Ark `timeoutBlockHeights` field was dropped in favor of a single required `timeoutBlockHeight`
- Positive-slippage tolerance via shared `OverpaymentProtector`
- Hardened mempool.space integration (deduplicated, one-decimal-rounded BTC fee estimations)
- Fulmine integration via macaroon auth, `ListVHTLCs`, and `GetVHTLCSpendingTx` (claim Ark tx retrieval for finalized or pending spending txs); configurable periodic vHTLC rescan (`rescanInterval`, default 300s) and manual chain-rescan service path for Ark currencies
- Operational signer control (`DisableSigners` / `EnableSigners` / `GetDisabledSigners` gRPC + `boltzr-cli signer …`) persisted in `disabled_signers` table for granular runtime disable of cooperative and lockup signer paths (replaces `DevDisableCooperative`)
- **Claim-failure alerting** (PR #1445): `SwapNursery` emits a new `claim.failure` event (`{ swap, symbol, error }`) on a failed swap claim, relayed via `EventHandler` and surfaced by `NotificationProvider` as a 🚨 per-symbol alert (basic swap info + error truncated to 200 chars) on the configured notification channel
- **Send-approval hook** (PR #1446): new streaming gRPC hook `SendApprovalHook` on `boltzrpc.Boltz` gating outbound sends through an external approver — request carries `id` / `pair` / `symbol` / `amount`, response is the three-state `SendApprovalAction` (`ACCEPT` / `REJECT` / `HOLD`). Fallback on unconnected approver or 60s timeout set by `[swap.sendApproval] defaultAction` (`accept` default / `reject` fail-closed / `hold` pause-and-retry); held sends persist in the new `send_approval_holds` table (`SendApprovalHold` / `SendApprovalHoldRepository`) via `SendApprovalGuard` and only a real approver response releases a hold
- **Balance-cache refresh dev RPC** (PR #1447): new `DevRefreshBalanceCache(symbol?)` gRPC method + `boltzr-cli dev refresh-balance-cache [symbol]` force-refresh the wallet balance cache used for liquidity checks (single symbol or all wallets); backed by `Service.refreshBalanceCache` → `BalanceCheck.refresh` (unknown symbol → `CURRENCY_NOT_FOUND`), with `BalanceCheck` refactored to share a per-symbol `updateBalance(symbol, wallet)` between the periodic loop and on-demand refresh
- **gRPC JWT authentication** on the `boltzrpc.Boltz` service via `AuthInterceptor` (PR #1415): tokens persisted in the new `jwt_tokens` table with per-token `allowed_methods` (exact path or `*` / `<service>/*` wildcard) and optional TTL; new RPCs `IssueJwt` / `RevokeJwt` / `ListJwts` / `ListMethods` exposed end-to-end by `boltzr-cli jwt …`; bootstrap admin token written to `<certificates>/admin.jwt` on first start; configured via `[grpc.jwt]` in `boltz.conf` (`disable`, `secretFile`, `adminTokenFile`)
- Optional Liquid 0-conf observation API (`[liquid.chain.zeroConfTool]`) with scheme-selected HTTP polling or WebSocket transport for bridge-quorum-gated lockup acceptance; WebSocket transport supports preemptive reconnects via `rotation_interval_secs` (default `3300`s, `0` disables) to refresh the connection before the server-side TTL drops it
- Single-node Elements RPC integration — the legacy `[liquid.chain.lowball]` backup-node config and `ElementsWrapper` dual-node failover were removed (PR #1417)
- CLI tool to rotate referral API keys
- RESTful HTTP API (v1 and v2) with improved HTTP status codes; a catch-all Express error middleware (`handleUnhandledError`, PR #1453) guarantees a JSON error response even for errors that escape a route handler's `try/catch` (e.g. `res.sendFile` on static file routes rejecting a bogus `Range` header asynchronously)
- WebSocket real-time swap updates
- PostgreSQL/SQLite storage
- LND (v0.21.1-beta, bumped from v0.21.0-beta in PR #1452 / v0.20.1-beta in PR #1432; `VersionCheck` `maximal` raised to 0.21.1; vendored `router.proto` refreshed with clarified HTLC-interceptor idempotency / on-chain resolution semantics) and CLN (v26.06.2, bumped from v26.06.1 in PR #1449 / v26.06 in PR #1432 / v26.04.1 in PR #1426 — `disableMpp` knob and the 24.08 BOLT12 experimental-offers startup check removed; CLN router migrated from `GetRoute` to `GetRoutes`) integration; Eclair pinned to v0.14.0; Bitcoin Core v31.0; Elements v23.3.3
- **Single-id swap-status query** (PR #1451): the multiple-status endpoint (`GET /v2/swap/status`) now accepts a bare `?ids=x` (parsed as a string by Express) by treating it as a one-element array, so callers no longer need to special-case a single id
- Lightning gossip (node + channel info) sourced from **both LND and CLN** in the `boltzr` sidecar via the new `GraphLightningInfo` aggregator (PR #1424); LND contribution comes from `lnd_rpc::describe_graph`/`ChannelGraphRequest`
- Per-key **async-lock instrumentation** rolled out to **every Node-side `async-lock` user** (PRs #1427 + #1428): `InstrumentedLock` wraps `async-lock` with holder/pending/overflow tracking, exposes three Prometheus gauges (`lock_pending`, `lock_hold_age_seconds`, `lock_rejections`), and enriches "Too many pending tasks" rejections with the stuck holder + queue depth. PR #1428 extended the rollout from the original signer set (`ChainSwapSigner`, `EipSigner`, `Renegotiator`, `Commitments`) to the swap path itself (`SwapNursery`, `SwapManager`, `UtxoNursery`, `ArkNursery`, `LightningNursery`, `RefundWatcher`, `DeferredClaimer`, `MusigSigner`, `LockupTransactionTracker`, `SelfPaymentClient`, `ConsolidatedEventHandler`, `SequentialSigner`), added an ESLint `no-restricted-imports` rule forbidding direct `async-lock` imports under `lib/**` (only `InstrumentedLock.ts` is exempt), and made every `acquire(key, op, cb)` open an OpenTelemetry span (`lock <name> <op>`, `SpanKind.INTERNAL`, attributes `lock.name`, `lock.key`, `lock.op`, `lock.wait_ms`, `lock.held_ms`) with the callback running inside the span context. The pending-counter map also self-deletes idle keys so locks with dynamic keys no longer grow unbounded
- **Invoice-payment hold** moved to a dedicated hook surface (PR #1429): the `HOLD` variant was removed from the shared `boltzrpc.Action` enum (now only `ACCEPT` / `REJECT`) and from every UTXO/Ethereum nursery + `CreationHook` switch; the `TransactionHook` default flipped from `HOLD` → `ACCEPT`. A new `boltzrpc.InvoicePaymentHookAction` enum (`CONTINUE = 0`, `HOLD = 1`) is carried on `InvoicePaymentHookResponse.action`. When the hook returns `HOLD`, `NodeSwitch.invoicePaymentHook` surfaces an `InvoicePaymentPreference { action: Hold }` and `PaymentHandler.payInvoice` short-circuits before reaching the pending-payment tracker, leaving the swap unpaid until the hook later allows it
- **Relaxed invoice-memo validation** (PR #1433): the `description` field on `POST /v2/swap/reverse` now accepts any well-formed UTF-8 string up to **639 bytes** (the BOLT11 description-field limit) instead of the previous ASCII-only 500-char regex. `NodeFallback.checkMemo` rejects three distinct cases with specific reasons (`not a well-formed string`, `exceeds maximum length of 639 bytes`, `contains blocked characters` — Unicode C0/C1 controls except `\n`/`\r`, plus bidirectional control characters that can spoof display), and `Errors.INVALID_INVOICE_MEMO(details?)` surfaces the reason in the error message so clients see *why* a memo was rejected
- **Pending-EVM-refund amount on gRPC tx events**: `EthereumManager.getClaimedAmount` was renamed to `getReceivedAmount` and now falls back to a new `Contracts.decodeRefundData` (per-shape decoders for `refund`, `refundForAddress`, and the two `refundCooperative` overloads on both `EtherSwap` and `ERC20Swap`) when claim decoding yields nothing. `GrpcService` uses the renamed method, so the `amountReceived` field on the `boltzrpc` transaction event is now populated for pending EVM **refunds**, not just claims
- **Quieter lightning-gossip logs**: `GraphLightningInfo::update_cache` in the Rust sidecar now returns `Result<bool>` and silently returns `Ok(false)` for currencies with no Lightning clients configured (instead of logging an "Updated …" line every tick); the "Updated <symbol> lightning gossip in: …" log fires only when at least one source actually contributed (fix `e1e6c445`)
- **Arbitrum L1 block height** (PR #1456): `ArbitrumProvider` reads the L1 block height (`l1BlockNumber`, falling back to the block `number`) directly from its own latest block instead of a separate L1 provider — the `arbitrum.l1Providers` config array is replaced by a single boolean `arbitrum.regtest` flag. A missing `l1BlockNumber` now throws (fail-loud) unless `arbitrum.regtest = true` (regtest/anvil forks legitimately omit it, and their decimal value is parsed via `ethers.getNumber`), and `init()` eagerly fetches a block so a misconfigured Arbitrum RPC fails fast at startup
- **REST swagger aligned to actual behavior** (PR #1454, docs-only): a Submarine Swap can be created with **either** an `invoice` **or** a `preimageHash` (`anyOf`; `invoice` wins if both are sent), so `SubmarineResponse` fields `bip21` / `acceptZeroConf` / `expectedAmount` are set only when created with an invoice and a new `claimAddress` is returned only for swaps to EVM chains; `GET /v1/chain/{currency}/contracts` gains a `501` when the Ethereum integration is disabled; assorted schema fixes (submarine-pairs `referral` header, `LightningChannel*` / `NodeStats` required-field corrections, referral fees typed as `int64`, shared BOLT12 request/response components, `SwapNotFound` 404 on `/setinvoice`)
- Hybrid TypeScript v6 + Rust stack

**Tags**: `swap`, `lightning`, `submarine-swap`, `atomic-swap`, `htlc`, `taproot`, `cooperative-claim`, `bitcoin`, `liquid`, `evm`, `arbitrum`, `rest-api`, `grpc`, `jwt-auth`, `typescript`, `rust`, `postgres`, `bolt12`, `fulmine-integration`, `mempool-space`, `claim-tracking`, `signer-control`, `zero-conf`, `liquid-zero-conf-tool`, `eclair`, `swap-metadata`, `lightning-gossip`, `async-lock-metrics`, `lock-tracing`, `invoice-payment-hook`, `send-approval-hook`, `invoice-memo-utf8`, `evm-refund-amount`, `claim-failure-alert`, `balance-cache`

**Synonyms**: `boltz`, `swap-backend`, `swap-provider`, `boltz-exchange`

**Triggers**:
- **ask_question**: `atomic swap`, `submarine swap`, `how to swap chains`, `lightning swap`, `boltz api`
- **develop**: `add swap type`, `improve swap logic`, `api endpoint`, `htlc implementation`
- **test_or_run**: `start boltz backend`, `regtest environment`, `integration test`
- **debug**: `swap stuck`, `htlc timeout`, `lightning payment failed`, `chain lockup failed`

**Dependencies**: Bitcoin node (bitcoind/btcd), Lightning node (LND/CLN), Liquid node (elementsd - optional), PostgreSQL/SQLite
**Depended On By**: `fulmine` (uses Boltz for Lightning swaps), `boltz-swap` (client library), Ark users via fulmine integration

---

### boltz-swap
**ID**: `boltz-swap`
**Name**: Arkade Boltz Swap Library
**Type**: Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-swap/INDEX.md`
**Repository**: `/Users/dusansekulic/code/fe/boltz-swap`
**GitHub**: `git@github.com:arkade-os/boltz-swap.git`

**Description**:
A production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. Provides bidirectional swaps (Lightning ↔ Arkade) with automated swap monitoring via SwapManager, support for both submarine and reverse swaps, and comprehensive error handling with automatic refund capabilities.

> ⚠️ **Repository deprecated 2026-05-25** — the standalone `arkade-os/boltz-swap` repo no longer accepts issues or PRs. Development moved to the [`arkade-os/ts-sdk`](https://github.com/arkade-os/ts-sdk) pnpm workspace monorepo, which now vendors this package at `packages/boltz-swap/`. The published npm package `@arkade-os/boltz-swap@0.3.32` is unchanged.

**Key Capabilities**:
- Create Lightning invoices that deposit funds into Arkade wallets (reverse swaps)
- Send Lightning payments from Arkade wallets (submarine swaps)
- ARK ↔ BTC chain swaps (on-chain bidirectional)
- Automated background swap monitoring via SwapManager with WebSocket and polling fallback
- Automatic claim/refund execution for swaps with configurable retry and timeout policies
- Invoice decoding and validation with swap limit checking
- Swap fee calculation for both submarine and reverse swaps
- VHTLC (Virtual HTLC) creation, monitoring, and refund handling
- **User-initiated submarine VHTLC recovery** (`inspectSubmarineRecovery`, `scanRecoverableSubmarineSwaps`, `recoverSubmarineFunds`, `recoverAllSubmarineFunds`) — Boltz-amnesia-tolerant inspection and post-CLTV `refundWithoutReceiver` sweep
- **Chain-swap quote acceptance guard** — `quoteSwap` / `getSwapQuote` / `acceptSwapQuote` floor every Boltz `getChainQuote` against the original `response.claimDetails.amount` (or an explicit `minAcceptableAmount` with optional `maxSlippageBps`); non-positive or below-floor quotes throw the new typed `QuoteRejectedError` (reasons `below_floor` / `non_positive` / `no_baseline`) instead of being blind-accepted. Autopilot `transaction.lockupFailed` renegotiation paths use the same floor and wrap rejection via `SwapError.cause`. `QuoteRejectedError` survives SW `postMessage` via a `QUOTE_REJECTED::`-prefixed JSON payload in `Error.message`
- **Unknown-to-Boltz safety net** — SwapManager transitions a swap to terminal `swap.expired` after 10 consecutive Boltz 404s (new `SwapNotFoundError`), notifies subscribers + listeners, and stops polling. Avoids hammering Boltz with requests for swap IDs unknown to the configured endpoint (e.g. after a Boltz endpoint switch)
- **ServiceWorker half-initialized handler recovery** — runtime detects `HandlerNotInitializedError` from the SW message handler (handler reset after SW restart but bus already re-initialized) and transparently re-sends the cached `INIT_ARKADE_SWAPS` payload before retrying the original request
- **Expo background-task subpath** — OS-task helpers live under `@arkade-os/boltz-swap/expo/background` (static imports so Metro's static dependency collector picks them up, #136); `expo-task-manager` and `expo-background-task` are declared as **optional** `peerDependencies` so non-Expo consumers (`/expo` for react-native-web / Node) don't need them
- Persistent swap storage using wallet contract repository
- Event-driven architecture with flexible subscription patterns for swap lifecycle events
- Support for both standard Wallet, ServiceWorkerWallet, and Expo (React Native) implementations

**Tags**: `lightning-network`, `submarine-swaps`, `chain-swaps`, `boltz`, `arkade`, `typescript`, `swap-manager`, `vhtlc`, `submarine-recovery`, `swap-not-found`, `bitcoin`, `payment-integration`, `event-driven`, `websocket`, `invoice-decoding`, `service-worker`, `sw-recovery`, `expo`, `react-native`, `background-task`, `quote-guard`, `quote-rejected`

**Synonyms**: `lightning-swaps`, `arkade-lightning`, `boltz-integration`, `swap-library`

**Triggers**:
- **ask_question**: `lightning swap`, `boltz swap`, `submarine swap`, `reverse swap`, `chain swap`, `arkade lightning`, `vhtlc`, `swap manager`, `lightning invoice`, `lightning payment`, `swap monitoring`, `swap refund`, `swap claim`, `invoice decoding`, `swap fees`, `swap limits`, `submarine recovery`, `recover stranded funds`, `SwapNotFoundError`, `swap unknown to Boltz`, `expo background task`, `defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `quoteSwap`, `getSwapQuote`, `acceptSwapQuote`, `QuoteRejectedError`, `chain swap quote guard`, `minAcceptableAmount`, `maxSlippageBps`
- **develop**: `add lightning`, `integrate boltz`, `implement swap`, `create invoice`, `send lightning`, `monitor swap`, `handle refund`, `swap provider`, `arkade lightning`, `submarine recovery`, `recoverAllSubmarineFunds`, `expo background swap`, `react native swap`, `quote guard`, `quoteSwap options`
- **test_or_run**: `test swap`, `test lightning`, `run swap test`, `integration test`, `e2e swap`, `regtest swap`
- **debug**: `swap failing`, `invoice expired`, `swap timeout`, `refund failed`, `claim failed`, `vhtlc issue`, `swap stuck`, `websocket disconnect`, `stranded funds`, `pre_cltv`, `swap unknown to provider`, `boltz 404`, `swap.expired after endpoint change`, `handler not initialized`, `service worker restart`, `INIT_ARKADE_SWAPS lost`, `expo background task not running`, `metro static dependency`, `expo-task-manager missing`, `#136`, `quote below floor`, `quote rejected`, `adversarial Boltz quote`, `renegotiate quote failed`, `no_baseline`

**Dependencies**: `@arkade-os/sdk` (Arkade Wallet SDK, 0.4.27), Boltz API server, Bitcoin/Lightning infrastructure
**Depended On By**: Arkade PWA wallet, Arkade-powered applications requiring Lightning integration

---

### bancod
**ID**: `bancod`
**Name**: Bancod (Banco Solver Bot)
**Type**: Service/Trading Bot
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/bancod/INDEX.md`
**Repository**: `${BANCOD_REPO}`
**GitHub**: `arkade-os/bancod`

**Description**:
Go implementation of a banco solver bot for the Arkade virtual mempool. Watches the arkd transaction stream for swap offers posted as VTXOs, matches them against configured trading pairs and price ranges, and fulfills them atomically via introspector-signed Arkade transactions. Also supports a stateless preimage-claim plugin using ECIES encryption. Features a plugin-based solver architecture, gRPC+REST API, embedded web UI, CLI client, and SQLite storage.

**Key Capabilities**:
- Banco swap plugin: automated market-making on Arkade virtual mempool
- Preimage claim plugin: stateless ECIES-encrypted VTXO claims (PacketType 0x04)
- Plugin-based solver runtime (pkg/solver) with Filter+Match+Solve interface; per-plugin `solver.Source` subscriptions with optional CEL filter (forward-compatible, arkd-side filtering not yet wired)
- TLV-encoded swap offers (PacketType 0x03) with atomic fulfillment
- Trading pair management (base/quote, min/max amounts, price feed, invert)
- Pluggable price feed with TTL caching (CoinGecko implementation)
- gRPC + REST API (grpc-gateway) on ports 7070/7071
- Embedded web UI for monitoring
- CLI client (banco) for pair management, status, balance
- SQLite trade history and pair configuration persistence
- Docker deployment ready with docker-compose test environment
- Integration tests with nigiri + arkd + introspector stack

**Tags**: `solver`, `swap`, `banco`, `trading`, `market-maker`, `preimage`, `ecies`, `vtxo`, `tlv`, `cel`, `arkade`, `introspector`, `grpc`, `rest`, `web-ui`, `sqlite`, `docker`

**Synonyms**: `banco-solver`, `banco-bot`, `swap-solver`, `banco-daemon`

**Triggers**:
- **ask_question**: `banco swap`, `solver bot`, `swap offer`, `preimage claim`, `trading pair`, `price feed`, `banco protocol`, `PacketType 0x03`, `PacketType 0x04`
- **develop**: `add solver plugin`, `swap logic`, `pair management`, `price feed`, `fulfillment`, `preimage`, `taker`, `maker`
- **test_or_run**: `start bancod`, `test swap`, `integration test`, `setup-test-env`, `run solver`
- **debug**: `swap failed`, `price validation`, `offer not matched`, `introspector error`, `fulfillment failed`, `plugin error`

**Dependencies**: `arkd` (tx stream, wallet), `go-sdk` (Wallet), `introspector` (signing)
**Depended On By**: None (standalone service)

---

### banco
**ID**: `banco`
**Name**: Banco (TypeScript Swap Library)
**Type**: Client Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/banco/INDEX.md`
**Repository**: `${BANCO_REPO}`
**GitHub**: `arkade-os/banco`

**Description**:
TypeScript library (`@arkade-os/banco`) implementing the non-interactive banco swap protocol for Ark. Enables trustless atomic swaps between BTC and assets (or asset-to-asset) on the Ark network without requiring both parties to be online. Uses covenant-based VTXO scripts with Arkade Script introspection opcodes to enforce swap conditions at the protocol level. Supports full fills, partial fills with ratio-based pricing, cancellation via CLTV, and unilateral exit via CSV.

**Key Capabilities**:
- Non-interactive maker/taker swap protocol (maker goes offline after funding)
- Covenant-based VTXO scripts using Arkade Script introspection opcodes
- Three swap types: Asset→BTC, BTC→Asset, Asset→Asset
- Partial fills with ratio-based pricing (ratioNum/ratioDen with GCD reduction)
- TLV offer encoding as Ark Extension packets (PacketType 0x03)
- Maker class: createOffer, getOffers, cancelOffer
- Taker class: fulfill (from hex), fulfillByTxid (from funding tx)
- CLTV cancel path for maker fund recovery
- CSV exit path for unilateral exit safety
- Emulator integration for covenant validation and co-signing — public API and wire format now use **Emulator** terminology end-to-end (`emulatorPubkey` TLV `0x08`, `emulatorUrl` constructor arg, `RestEmulatorProvider`, `EmulatorPacket`, `arkade.ArkadeVtxoInput.emulators`); legacy `introspector` identifiers were removed in the May 2026 ts-sdk bump
- Liveness-only trust model for Operator (arkd) and Emulator — covenant binds the spending tx so cosigners cannot redirect funds
- Strict TLV parsing — decoders MUST reject unknown TLV types; wire format is not forward-compatible
- Dual module output (ESM + CJS) with TypeScript declarations
- Published as `@arkade-os/banco` on npm
- bigint-typed asset amounts (mirrors ts-sdk): `Maker.getOffers()` converts vtxo `asset.amount` (bigint) via `Number(...)`, `Taker` accumulates collateral with `Number(a.amount)`, E2E tests issue/send/compare asset amounts as `BigInt(...)`
- Regtest emulator overlay: `docker-compose.emulator.yml` (renamed from `docker-compose.introspector.yml`), image `ghcr.io/arkade-os/emulator:v0.0.1`, container `emulator` on port 7073
- ts-sdk dependency sourced from monorepo subpath: `github:louisinger/wallet-sdk#arkade-script-final&path:/packages/ts-sdk`

**Tags**: `swap`, `banco`, `typescript`, `npm`, `covenant`, `arkade-script`, `introspection`, `emulator`, `operator`, `maker`, `taker`, `tlv`, `vtxo`, `atomic-swap`, `partial-fill`, `asset`, `bigint`, `ts-sdk-monorepo`

**Synonyms**: `@arkade-os/banco`, `banco-sdk`, `banco-lib`, `banco-swap-lib`

**Triggers**:
- **ask_question**: `banco swap`, `non-interactive swap`, `maker taker`, `swap offer`, `covenant script`, `partial fill`, `TLV offer`, `PacketType 0x03`, `emulator`, `operator role`, `emulatorPubkey`, `RestEmulatorProvider`
- **develop**: `swap library`, `maker class`, `taker class`, `offer encoding`, `covenant`, `partial fill`, `ratio`, `fulfill offer`, `emulator integration`, `bigint asset amount`
- **test_or_run**: `pnpm test`, `test:e2e`, `regtest:start`, `vitest`, `build banco`, `docker-compose.emulator.yml`
- **debug**: `offer not found`, `insufficient BTC`, `swapPkScript mismatch`, `cancel failed`, `emulator error`, `EventSource not defined`, `bigint asset amount`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk`, sourced from `github:louisinger/wallet-sdk#arkade-script-final&path:/packages/ts-sdk`), `introspector` (covenant validation co-signer; image now published as `ghcr.io/arkade-os/emulator:v0.0.1` and addressed as the **Emulator** in banco's API), `arkd` (Ark server)
**Depended On By**: `bancod` (Go solver bot uses equivalent protocol), wallet applications building swap UIs

---

### compiler
**ID**: `compiler`
**Name**: Arkade Compiler
**Type**: Tool/Compiler
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/compiler/INDEX.md`
**Repository**: `${COMPILER_REPO}`
**GitHub**: `${COMPILER_GITHUB}`

**Description**:
Rust-based compiler for the Arkade Script language that transforms `.ark` smart contract source files into JSON artifacts containing Bitcoin Taproot script assembly (ASM). Uses a four-stage pipeline: PEG parsing (pest) → typed AST + semantic validation → code generation (with a bytes-aware `+` rewrite pass) → output validation. Produces a unified `functions[]` spend-group ABI — each group carries an optional emulator-run `arkade` covenant plus one or more L1 `tapscript` tapleaves (the legacy `options {}` block and two-variant `serverVariant` shape have been removed). Supports transaction and asset introspection, 64-bit arithmetic, compile-time loop unrolling, `int`-param timelocks referenced by `older(...)`/`after(...)`, and a type-dispatched `+` operator that lowers to `OP_CAT` for byte-string concatenation (enabling oracle-signed witness patterns like `sha256(ticker + price + time)`).

**Key Capabilities**:
- Compiles `.ark` source files to JSON with Bitcoin Taproot ASM
- Four-stage pipeline: PEG parser (pest) → AST + `validate_ast` → compiler (with bytes-aware `+` rewrite) → `validate_output`
- Unified `functions[]` ABI: each spend group is `{ name, arkade?: { inputs, asm }, leaves: [{ name, witness, asm }] }`; the covenant carries contract pubkeys only, and signatures live in each leaf's witness (`injected: true` for infra sigs), never in leaf ASM
- Tapscript L1 leaves (`function … tapscript {}`) compiled in `src/compiler/tapscript.rs`: must assemble to one of arkd's 5 closures (Multisig, CsvMultisig, CltvMultisig, ConditionMultisig, ConditionCsvMultisig) with source order `condition? · timelock? · multisig`; reserved key roles `server` → `<SERVER_KEY>` and `emulator`/`tweak(emulator, fn)` → `<EMULATOR_KEY:fn>`
- Default collaborative-leaf synthesis: a covenant function with no matching tapscript gets `checkMultisig([server, tweak(emulator, fn)], [serverSig, emulatorSig], 2)`; unilateral exit is an explicit standalone CSV tapscript over an `int` param
- 8 data types: pubkey, signature, bytes, bytes20, bytes32, int, bool, asset
- Cryptographic primitives: checkSig, checkMultisig (2-arg N-of-N or 3-arg `checkMultisig(keys, sigs, threshold)`), checkSigFromStack, one-shot `sha256` (OP_SHA256), streaming SHA256, and tapscript hashlocks `hash160`/`hash256`/`ripemd160` (OP_HASH160/OP_HASH256/OP_RIPEMD160)
- Type-dispatched `+`: `OP_CAT` for bytes-like operands (with `OP_SCRIPTNUMTOLE64` int coercion), `OP_ADD64` for pure int+int; enables one-shot `sha256(a + b + c)` and oracle-signed message reconstruction on-stack
- Transaction introspection: tx.version, tx.locktime, tx.inputs, tx.outputs, dual clocks `tx.time` (Bitcoin block height) and `tx.offchainTime` (TEE wallclock unix seconds), plus direct-emission `this.activeInputIndex` → `OP_PUSHCURRENTINPUTINDEX` for on-chain self-vs-sibling input identification
- Asset introspection: explicit canonical Asset ID `(txid, gidx)` operands across `assets.lookup`/`assets.has`/`assetGroups.find`/`assetGroups.has`/`group.controlIs`; `lookup` asserts presence and returns amount while `has` is a Bool predicate; group control via `hasControl` (Bool) + `controlIs(txid, gidx)` (Bool, replacing the old `.control ==`); plus assetCount, assetAt, group sums/delta/metadataHash/isFresh. Compile-time `check_asset_id_operands` validation rejects malformed `txid`/`gidx` operands (wrong type, or `gidx` literal outside `0..=65535`) before the emulator's runtime check
- Compile-time loop unrolling and array flattening
- 64-bit arithmetic with OP_*64 opcodes
- Semantic validation (`validate_ast`): empty-name / at-least-one-function-or-tapscript, duplicate function/tapscript/param name detection, reserved-role (`server`/`emulator`) misuse rejection, CashScript-style require-guard warning; plus tapscript closure-shape enforcement in `compiler::tapscript::validate_arkd_rules`
- Output validation (`validate_output`): non-empty `functions`, every group has ≥1 leaf, every present `arkade` covenant and every leaf has non-empty `asm`, and leaf `asm` is signature-free (signatures must be witness-only)
- Binding-hygiene `validate_ast` checks: rejects assignment to immutable constructor parameters; scope-shadowing detection (function params shadowing constructor params, `let`/loop bindings shadowing an enclosing scope, `for (x, x)` identical loop variables); emitted-namespace collision detection that simulates the emitter's array flattening + asset-ID decomposition to catch collisions distinct source names can hide (e.g. `int[] xs` vs `int xs_0`)
- `int`-param timelocks referenced via `older(...)` (CSV) / `after(...)` or `tx.time >= ...` (CLTV); identifier operands emit a `<name>` placeholder resolved at deploy time
- Financial options primitives library (`examples/options/`): Rysk-faithful single-locked physical CoveredCall and CashSecuredPut. Seller-only collateral lockup, no oracle dependency, buyer's voluntary `exercise()` is the settlement signal; 4 covenant functions + tapleaves per contract; pre-expiry transfer guard via `require(tx.time < expiryHeight)`
- Fixed-maturity bond market (`examples/bonds/`): per-maturity `RepaymentPool` singleton (7 functions: `issue`, `acceptRepayment`, `rollOut`, `rollIn`, `liquidate`, `acceptAuction`, `redeem`) paired with a per-issuance `BondMint` vault (4 functions: `repay`, `liquidate`, `auction`, `roll`). 1:1 credit + debit token model with oracle-priced settlement and `auctionDiscountBps` spread; phased-lifecycle time gates (`REPAY` → `AUCTION` → `REDEEM`); strict-equality debit-burn invariants prevent multi-vault batching; deployment-invariant guards on `issue`/`rollIn` (`initRatioBps > liqThresholdBps`, `liqThresholdBps > 0`, `auctionWindow > 0`, `auctionDiscountBps ∈ [0, 10000)`); ceiling-division origination floor `required = (amount × initRatioBps + 9999) / 10000` blocks dust-mint at the unit boundary; single-tx loan roll via three witness-output-indexed functions that compose with a `non_interactive_swap` fill
- CLI tool (`arkadec`) and Rust library (`arkade_compiler`)

**Tags**: `compiler`, `arkade-script`, `rust`, `pest`, `peg`, `bitcoin`, `taproot`, `asm`, `smart-contract`, `tapscript`, `tapleaf`, `covenant`, `closure`, `server-key`, `emulator-key`, `tweak`, `unilateral-exit`, `hash160`, `hash256`, `ripemd160`, `introspection`, `opcodes`, `json`, `validator`, `typechecker`, `op-cat`, `byte-concat`, `oracle-witness`, `offchain-time`, `active-input-index`, `funding-rate`, `covered-call`, `cash-secured-put`, `rysk`, `physical-settlement`, `bonds`, `repayment-pool`, `bond-mint`, `fixed-maturity`, `margin-call`, `auction`, `credit-debit`, `loan-roll`, `strict-burn`, `ceiling-division`, `deployment-invariant`, `shadowing`, `immutable-params`, `namespace-collision`, `binding-hygiene`, `asset-id`, `canonical-asset-id`, `txid-gidx`, `control-is`, `has-control`, `asset-has`

**Synonyms**: `arkadec`, `arkade-compiler`, `ark-compiler`, `script-compiler`

**Triggers**:
- **ask_question**: `arkade script`, `compiler`, `ark language`, `.ark files`, `contract syntax`, `opcode`, `tapscript`, `tapleaf`, `tapscript leaf`, `covenant`, `arkade covenant`, `spend group`, `default leaf`, `collaborative leaf`, `server key`, `emulator key`, `tweak`, `SERVER_KEY`, `EMULATOR_KEY`, `unilateral exit`, `older`, `closure`, `hash160`, `hash256`, `ripemd160`, `introspection`, `asset group`, `stability vault`, `op_cat`, `byte concatenation`, `oracle signed`, `oracle witness`, `tx.offchainTime`, `offchain time`, `activeInputIndex`, `merge vault`, `funding rate`, `take fee`, `seeker exit fee`, `basis points`, `covered call`, `cash secured put`, `options contract`, `rysk`, `physical settlement`, `exercise window`, `reclaim`, `bonds`, `bond market`, `repayment pool`, `bond mint`, `credit token`, `debit token`, `fixed maturity`, `margin call`, `liquidate`, `auction window`, `redeem`, `loan roll`, `rollOut`, `rollIn`, `auctionDiscountBps`, `auctionWindow`, `initRatioBps`, `liqThresholdBps`, `strict burn`, `ceiling division`, `dust mint`, `deployment invariant`, `variable shadowing`, `immutable parameter`, `constructor parameter`, `namespace collision`, `asset id`, `canonical asset id`, `txid gidx`, `controlIs`, `hasControl`, `assets.has`, `assetGroups.has`, `asset lookup`
- **develop**: `add opcode`, `new language feature`, `update grammar`, `compiler bug`, `expression type`, `validator rule`, `tapscript`, `tapscript leaf`, `add tapleaf`, `closure shape`, `default leaf`, `concat`, `op_cat`, `bond contract`, `bond mint`, `repayment pool`, `loan roll`, `shadowing check`, `namespace collision`, `immutable param`, `asset id validation`, `controlIs`, `hasControl`, `asset id operands`
- **test_or_run**: `compile contract`, `cargo test`, `test compilation`, `example contract`
- **debug**: `parse error`, `compilation error`, `unexpected rule`, `asm output wrong`, `validation error`, `validation warning`

**Dependencies**: None (standalone tool)
**Depended On By**: `introspector` (executes compiled Arkade Script), `arkd` (uses compiled contract artifacts)

---

### ark-docs
**ID**: `ark-docs`
**Name**: Ark Documentation
**Type**: Documentation
**Language**: MDX (Markdown + JSX)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-docs/INDEX.md`
**Repository**: `${ARK_DOCS_REPO}`
**GitHub**: `${ARK_DOCS_GITHUB}`

**Description**:
Official documentation repository for the Ark protocol and ecosystem. Built with Mintlify and published as interactive documentation site. Includes comprehensive guides on Ark core concepts, arkd server, wallet development (v0.3 legacy and the unprefixed latest set), smart contracts (Tapscript and Arkade language), Arkade Assets, and security model. Used as knowledge base for Q&A agents.

**Key Capabilities**:
- Ark protocol core concepts (`learn/core-concepts/`: vtxos-and-ownership, transactions-and-execution, settlement-and-finality, vtxo-lifecycle-and-liveness, security-and-trust-model — slugs match titles; renamed from `learn/concepts/`)
- Arkd server documentation (components, transactions, server-security, core-services with configuration)
- Wallet development (Latest, top-level `wallets/`): getting-started, operations, assets workflows, advanced (settlement-process, ramps, vtxo-management, **delegate-server** — run Fulmine headless as a delegate to renew VTXOs for users via the Delegate API, no wallet required, storage adapters, service worker, Expo/React Native, AI agents) — `v0.4/` prefix removed and old URLs redirected
- Wallet development v0.3 (Legacy): retained for compatibility under `wallets/v0.3/`
- Arkade contracts: deep-dive, Tapscript primitives (escrow, hashlock, Spilman channel, Dryja-Poon channel) and use cases (lightning-swaps, lightning-channels, chain-swaps, oracle-dlc)
- Arkade Assets overview and core concepts (`learn/arkade-assets/`)
- Experimental Arkade language (compiler, functions, non-interactive-swaps)
- FAQ (9 curated questions)
- Top-level **Glossary** tab (`glossary.mdx` promoted from `learn/glossary.mdx`)
- Hidden **Reference** tab (`docs.json` `hidden: true`) with per-product overview pages: TypeScript (`@arkade-os/sdk` v0.4), Rust (`ark-rs` v0.9), Go (`arksdk` v0.9), .NET (`NArk` 1.0), and **Fulmine (Daemon) v0.3** — each registered as its own Mintlify product with its own version selector and linking out to GitHub + canonical API docs. SDK directories renamed from `reference/<lang>/` to `reference/<lang>-sdk/` (legacy `/reference/<lang>/*` and `/sdk-reference/rust/*` URLs now redirect via `docs.json`)
- LLM context menu integration (Claude, ChatGPT, Grok, Google AI Studio, generic MCP, Add-MCP one-click install, Cursor, VSCode, Devin, Devin MCP)
- Reusable MDX/JSX snippets — `snippets/agent-context.mdx` enforces Arkade terminology for AI agents: source boundaries (ignore ark-protocol.org / Bitcoin Optech / clArk / Delving Bitcoin / generic L2 explainers), expanded deprecated-term list (ASP / Ark server → "the operator" + "Arkade Service"; delegator/delegate pubkey/delegate address → delegate / delegate pubkey / delegated address; refreshing → renewal), 5-level source precedence with explicit conflict resolution, and answering rules that require claims to be labelled "Confirmed in docs" / "Supported by official source" / "Not specified in Arkade sources". `snippets/outdated-version.jsx` renders the v0.3 → latest redirect banner
- SEO model: `seo.indexing: "navigable"` with explicit `noindex` on all v0.3 wallet pages
- Tooling: pnpm-based workflow (`packageManager: pnpm@10.33.2`, `pnpm-lock.yaml`), Mintlify ^4.2.542
- Mintlify-powered interactive documentation, auto-published via GitHub

**Tags**: `documentation`, `docs`, `mintlify`, `pnpm`, `ark-protocol`, `arkd`, `wallet-guide`, `wallets-latest`, `delegate-server`, `delegate-api`, `core-concepts`, `glossary`, `sdk-reference`, `ts-sdk`, `rust-sdk`, `go-sdk`, `dotnet-sdk`, `fulmine`, `tapscript`, `smart-contracts`, `arkade-language`, `arkade-assets`, `faq`, `security`, `agent-context`, `claim-labelling`, `llm-context`, `devin-mcp`, `aistudio`, `mcp`, `snippets`, `seo-navigable`

**Synonyms**: `docs`, `documentation-site`, `knowledge-base`, `ark-manual`

**Triggers**:
- **ask_question**: Any Ark protocol question (VTXOs, rounds, security, how it works)
- **develop**: `update docs`, `add documentation`

**Dependencies**: None (standalone documentation)
**Depended On By**: All projects (reference documentation), Q&A agents (knowledge base)

---

### arkade-explorer
**ID**: `arkade-explorer`
**Name**: Arkade Explorer
**Type**: End-User Application/Web App
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/INDEX.md`
**Repository**: `${ARKADE_EXPLORER_REPO}`
**GitHub**: `${ARKADE_EXPLORER_GITHUB}`

**Description**:
Modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of batch commitment transactions, Arkade transactions, asset details, and VTXO addresses using the Arkade Indexer API. Features smart search (auto-detects txids, outpoints, Arkade addresses, and 68-hex asset IDs), VTXO tree visualization, mempool.space cross-links on commitment transactions, light/dark theme, money unit toggle, real-time activity stream, and asset icon verification. Default network is `bitcoin`.

**Key Capabilities**:
- Batch commitment transaction explorer with batch details, VTXO tree viewer, raw hex, and mempool.space external links (header + input arrows)
- Cross-links on commitment-tx pages: inputs → originating settlement commitment tx (via VTXO `settledBy`); batch outputs → batch root Arkade transaction
- Output display addresses via `deriveOutputDisplayAddress()`: only genuine on-chain outputs (commitment txs, connector-tree) render as Bitcoin addresses (`bc1…`/`tb1…`); off-chain outputs incl. **checkpoint** outputs render as Arkade addresses (`ark1…`/`tark1…`)
- Address VTXO explorer with balance statistics, status badges (Unspent, Spent, **Unfinalized Spend**, Swept), and pagination; consumed VTXOs show a terminal "Settled"/"Spent" word in place of the expiry countdown (`deriveExpiryKind()`) with an inline `settled:xxxx` commitment-tx link in dense rows; Recoverable badge suppressed on spent VTXOs; balance/stats drain all VTXO pages for complete totals, and VTXO list / asset balances / tx packet groups are window-virtualized (`@tanstack/react-virtual`) with per-group row caps to stay responsive on high-activity addresses
- Unfinalized-spend detection (`usePendingOutpoints`): indexer `pendingOnly` query over displayed VTXO **scripts** (the filter is only honored for `scripts`, not `outpoints`), gated on a spent VTXO being present
- Asset explorer with verified asset icon system; ticker+icon (`AssetAmountDisplay`) and extension-type badges (`AssetBadge`) across tx outputs/inputs and the Packet section
- Smart search (auto-detects 64-hex txids, `txid:vout` outpoints, `tark1`/`ark1` addresses, and exactly-68-hex asset IDs); palette opens unconditionally on mobile and desktop
- Real-time activity stream on homepage (event types: `batch | vtxo | transaction`)
- Light/dark theme toggle with persistent preference
- Money display unit toggle (sats/BTC)
- 5 React Context providers (Theme, MoneyDisplay, ServerInfo, ActivityStream, AssetIconApproval)
- TanStack Query for data fetching and caching
- Multi-arch Docker deployment via GHCR (`linux/amd64` + `linux/arm64`)
- Responsive design (mobile + desktop)
- Vitest unit tests over `src/lib/` utilities (`pnpm test`); list virtualization via `@tanstack/react-virtual`

**Tags**: `explorer`, `blockchain`, `vtxo`, `transactions`, `assets`, `react`, `typescript`, `vite`, `vitest`, `tailwindcss`, `indexer`, `web-app`, `frontend`, `theme`, `docker`, `pnpm`, `virtualization`

**Synonyms**: `ark-explorer`, `block-explorer`, `tx-explorer`, `vtxo-explorer`

**Triggers**:
- **ask_question**: `view transaction`, `check vtxo`, `explore address`, `explore asset`, `transaction details`, `block explorer`
- **develop**: `add explorer feature`, `fix ui bug`, `update sdk version`, `new transaction view`, `asset page`
- **test_or_run**: `start explorer`, `build explorer`, `dev server`, `preview build`, `docker explorer`
- **debug**: `transaction not found`, `vtxo status wrong`, `api error`, `loading issue`, `asset icon not showing`

**Dependencies**: `@arkade-os/sdk` (0.4.13, TypeScript SDK), Arkade Indexer API (external service), `arkade-assets` (asset protocol data), `@tanstack/react-virtual` (^3.14.3, list virtualization)
**Depended On By**: None (end-user application)

---

### arkade-escrow
**ID**: `arkade-escrow`
**Name**: Arkade Escrow
**Type**: Service/Application
**Language**: TypeScript (NestJS + React)
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-escrow/INDEX.md`
**Repository**: `/Users/dusansekulic/code/typescript/arkade-escrow`
**GitHub**: `ArkLabsHQ/arkade-escrow`

**Description**:
Lightweight, browser-native escrow platform for instant, trust-minimized Bitcoin deals on Ark. Monorepo with NestJS API server, React client SPA, and React backoffice admin panel. Uses 2-of-3 multisig Virtual Escrow Contracts (VEC) with 6 Taproot spending paths (collaborative and unilateral). Deployable standalone or embedded inside Ark-enabled wallets via iframe.

**Key Capabilities**:
- Virtual Escrow Contract (VEC) with 6 Taproot spending paths
- Escrow request orderbook (public/private listings)
- Full contract lifecycle: request → accept → fund → execute/dispute → settle
- Automated VTXO funding detection (FundingWatcherService)
- Schnorr signature-based authentication (no passwords, JWT tokens)
- React client SPA for escrow users (orderbook, contracts, identity)
- React backoffice SPA for admin/arbitrator (contract management, dispute resolution)
- NestJS REST API with Swagger UI documentation
- Server-Sent Events for real-time contract updates
- SQLite storage with TypeORM (better-sqlite3)

**Tags**: `escrow`, `typescript`, `nestjs`, `react`, `taproot`, `multisig`, `schnorr`, `jwt`, `rest-api`, `swagger`, `sqlite`, `arbitration`, `vec`, `vtxo`, `vite`, `tailwind`

**Synonyms**: `escrow-service`, `3-party-escrow`, `vec-escrow`, `arkade-escrow-api`

**Triggers**:
- **ask_question**: `escrow`, `vec`, `taproot escrow`, `arbitration`, `3-party multisig`, `escrow contract`
- **develop**: `add escrow feature`, `escrow ui`, `contract lifecycle`, `arbitration`, `escrow api`
- **test_or_run**: `start escrow`, `test escrow`, `escrow e2e`, `run escrow`
- **debug**: `psbt error`, `funding not detected`, `execution failed`, `escrow contract error`

**Dependencies**: `arkd` (server connection), `@arkade-os/sdk` (TypeScript SDK for Ark protocol)
**Depended On By**: Arkade wallet (iframe embedding), P2P marketplaces requiring escrow

---

### introspector
**ID**: `introspector`
**Name**: Introspector
**Type**: Service/Co-Signer
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/introspector/INDEX.md`
**Repository**: `${INTROSPECTOR_REPO}`
**GitHub**: `${INTROSPECTOR_GITHUB}`

**Description**:
Arkade Script execution and signing microservice for the Ark protocol. Receives Ark transactions (PSBTs) carrying an **Introspector Packet** (a TLV inside an ARK extension OP_RETURN) that lists per-input Arkade Script bytecode + witness, executes those scripts in a custom VM extending Bitcoin Script with 50+ introspection opcodes (incl. unified BigNum arithmetic and packet introspection), and signs transactions upon successful execution. Participates in the Ark round lifecycle (off-chain tx, intent proofs, batch finalization) and also signs onchain Bitcoin PSBTs for unrolled VTXOs (`SubmitOnchainTx`). When this introspector is the last required non-`arkd` signer, it forwards the set to `arkd`, merges its signatures and finalizes.

**Key Capabilities**:
- Arkade Script engine with 50+ custom opcodes (introspection, packet introspection `OP_INSPECTPACKET`/`OP_INSPECTINPUTPACKET`, BigNum arithmetic with `NUM2BIN`/`BIN2NUM`, EC operations, SHA256 streaming, asset introspection)
- Introspector Packet (TLV inside ARK extension OP_RETURN) — per-input script + witness payload (max 1000 entries, script ≤10KB, witness ≤1MB)
- Off-chain Ark transaction validation and Schnorr/Taproot signing; auto-finalization with `arkd` when last non-`arkd` signer
- Onchain VTXO signing via `SubmitOnchainTx` (rejects inputs whose tapscript closure also contains the `arkd` signer pubkey)
- Intent proof validation and signing before round registration
- Batch finalization signing (forfeits and commitment transactions)
- Connector tree validation for forfeit transactions
- gRPC + REST API via meshapi gateway (port 7073)
- Go client library (`pkg/client`) for programmatic access
- Per-script key derivation (tweaked signing keys; `tagged_hash("ArkScriptHash", script)`)
- TLS with auto-generated certificates
- Tapscript signature verification delegated to `ark-lib`
- Fuzz-tested tokenizer, opcodes, and engine

**Tags**: `arkade-script`, `introspection`, `signing`, `co-signer`, `psbt`, `schnorr`, `taproot`, `grpc`, `opcodes`, `bitcoin-script`, `covenant`, `smart-contract`, `bignum`, `introspector-packet`, `onchain-signing`, `fuzz-tested`

**Synonyms**: `arkade-script-engine`, `script-validator`, `co-signer`, `introspector-service`

**Triggers**:
- **ask_question**: `arkade script`, `introspection opcodes`, `script engine`, `co-signing`, `transaction introspection`, `covenant`, `OP_INSPECT`, `OP_INSPECTPACKET`, `bignum arithmetic`, `introspector packet`, `ARK extension`
- **develop**: `add opcode`, `script engine`, `introspector api`, `signing logic`, `finalization`, `onchain signing`, `submitonchain`
- **test_or_run**: `run introspector`, `integration test`, `test arkade script`, `e2e test`, `fuzz arkade`, `htlc test`, `delegate test`
- **debug**: `script execution failed`, `signing error`, `connector not in tree`, `intent not signed`, `arkd url missing`, `last non-arkd signer`

**Dependencies**: `arkd` (ark-lib packages for intent, tree, script, txutils, tapscript signature verification; runtime gRPC connection via `INTROSPECTOR_ARKD_URL` to fetch arkd's signer pubkey and to forward last-signer finalization sets), `go-sdk` (gRPC transport client)
**Depended On By**: `arkd` (uses introspector for Arkade Script validation and signing)

---

### enclave
**ID**: `enclave`
**Name**: Simple Enclave (introspector-enclave)
**Type**: Infrastructure Framework / Security Tool
**Language**: Go (CLI/SDK), Rust (verified client)
**Index**: `${ARKADIAN_DIR}/docs/projects/enclave/INDEX.md`
**Repository**: `${ENCLAVE_REPO}`
**GitHub**: `ArkLabsHQ/enclave`

**Description**:
CLI framework + runtime SDK for deploying any plain HTTP server inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, reproducible Nix-based EIF builds, and a PCR0-locked KMS confidentiality root. Apps need zero enclave-specific code — the runtime supervisor handles attestation, KMS secret decryption, PCR extension, response signing, encrypted storage, and dynamic secrets. As of v0.0.76, the standalone `nitriding.Enclave` struct was folded into `runtime.Runtime`, collapsing the legacy intermediate `:7073` runtime-proxy hop into a single chi mux on `pubSrv :443`; the same mux is also mounted on `privSrv :8080` (was `:7073`) for user-app loopback callbacks. Inbound HTTP/2 + gRPC are supported end-to-end (issue #85): ALPN advertises `h2`/`http/1.1`, the internal `revProxy` uses `http2.Transport` with `FlushInterval = -1`, and response-signing middleware short-circuits for `application/grpc*` and `application/grpc-web*` so streaming RPCs and gRPC trailers survive. The host-side `enclave-supervisor.service` runs as a single binary owning gvproxy (vsock outbound), viproxy (IMDS forwarding), the nitro-cli watchdog, and a localhost management API. Supports Go (1.25+), Node.js (22+), and .NET (10.0+) app templates.

**Key Capabilities**:
- Reproducible EIF builds via pinned NixOS Docker image + `monzo/aws-nitro-util` (byte-identical PCR0 across builders)
- PCR0-locked KMS policy — the `EnclaveAttestedOperations` statement gates **both `kms:Decrypt` and `kms:GenerateDataKey`** on `RecipientAttestation:PCR0` (`kms:Encrypt` for migration re-wrap stays ungated), so only an attested enclave can mint a data key, not just read one; `generateDataKey` mints with an NSM `Recipient` and recovers plaintext from `CiphertextForRecipient` so material never crosses the host. Optional irreversible lockdown (`is_kms_key_locked: true` / `enclave lock`) where even AWS root cannot rewrite the policy
- Lock-state SSM namespacing — the KMS lock posture (`is_kms_key_locked` → `ENCLAVE_KMS_KEY_LOCKED`) inserts a `locked`|`unlocked` segment after `/{deployment}/{app}/` in every KMS-subtree SSM path (`KMSKeyID`, each secret's `Ciphertext`, `StorageDEK`), making the lock posture an IAM-enforceable boundary; migration-state params stay un-namespaced. **BREAKING:** deployed stacks move to `/{dep}/{app}/unlocked/…`, so the next deploy mints a new key and regenerates secrets (old key/ciphertexts orphaned)
- BIP-340 Schnorr response-signing middleware — every HTTP response carries `X-Attestation-Signature` + `X-Attestation-Pubkey` bound to the attestation document's `UserData` via `appKeyHash`
- PCR16+ extension on boot with `SHA256(compressed_secp256k1_pubkey)` per configured secret
- Locked-key migration — 7-step in-place re-encryption flow (`POST /migrate`, NDJSON streaming) for rotating PCR0 even when the KMS policy is permanently frozen; old enclave inline-creates a migration key (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time), re-encrypts each secret + storage DEK to **lock/key-scoped** SSM paths `/{dep}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}` via `POST /v1/start-migration`, and the atomic `PutParameter` on `/{dep}/{app}/{locked|unlocked}/KMSKeyID` is the commit point. No two-phase `/Migration/*` staging, no `PromoteToPrimary` / `AbortOrphaned`. The new enclave's `VerifyPredecessorCommitment` cryptographically verifies the predecessor's COSE attestation (Nitro cert chain, at the doc's own timestamp) and binds its PCR0 before trusting PCR31 — failing closed if a recorded predecessor PCR0 has no attestation (a forged SSM document can't satisfy the handoff; the trust anchor is threaded explicitly, no package global). Supervisor rolls back via EIF backup if the new enclave never reaches `/health=200`.
- Enclave-owned KMS keys — both the primary key (first-boot via `EnsureKeyID`, gated by an `"UNSET"` SSM placeholder written by Tofu) and the migration key (via `CreateMigrationKey`) are minted by the enclave with PCR0-locked policies sealed at `CreateKey` time. The EC2 role no longer holds `kms:PutKeyPolicy`; the supervisor makes no KMS calls.
- Tofu-provisioned PCR0 signing — an `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY`, `prevent_destroy = true`) and a `terraform_data.sign_pcr0` local-exec sign the live PCR0 with `ECDSA_SHA_384` at `tofu apply` time and write Pubkey PEM / PCR0 / Signature to SSM under `/{dep}/{app}/Signing/*`. The runtime's `Signature.Load` reads them on `Init`, and `GET /v1/enclave-info` carries a `pcr0_signature: { pubkey_pem, pcr0_hex, signature_b64 }` block (`omitempty` — absent on deployments where signing isn't provisioned). Independent AWS-rooted PCR0 attestation distinct from NSM; no `signing:` field exists in `enclave.yaml` — provisioning is purely a Tofu-module property.
- OTLP/HTTP-spec telemetry ingest — POST endpoints follow the OTLP spec (`POST /v1/metrics`, `POST /v1/traces`, `POST /v1/logs`) so a stock OTEL SDK exporter works without URL overrides; introspection GETs keep the `enclave-` prefix (`GET /v1/enclave-{metrics,traces,logs}`).
- PCR0 attestation chain — each version records its predecessor's PCR0 + an NSM signed proof (`previous_pcr0` is `"genesis"` on first boot); `enclave verify` walks the chain against the AWS Nitro root. Runtime no longer enforces a *baked-in* predecessor PCR0 (still measured into PCR0 for auditors), but the **migration handoff** predecessor recorded in SSM *is* verified at boot by `VerifyPredecessorCommitment` (see locked-key migration). The `dev` deployment skips COSE verification (unsigned QEMU mock NSM); the gate keys off the build-time, PCR0-measured `deployment` and can't be flipped at runtime
- Encrypted persistent storage — `PUT/GET/DELETE/LIST /v1/storage/{key}` backed by S3 + AES-256-GCM with a KMS-protected DEK (up to 10 MB per object)
- Dynamic secrets API — runtime-mutable secrets persisted encrypted in S3 (reuses storage DEK), optional `env_var` boot binding, max 64 KB per secret
- Build-time vs deploy-time env split (SSM-scan model) — `app.env` is now opt-in for **PCR0-attested build-time values only** (default `env: {}` in the scaffolded templates). Deploy-time env vars are managed via `enclave tofu env --key K --value V` (writes/merges `tofu/env_values.auto.tfvars.json`); the next `tofu apply` publishes each pair to SSM at `/<deployment>/<app>/env/<key>`. The runtime's `Environment.Override` scans that prefix via `GetParametersByPath` on `Init` and overlays every key it finds onto the process env. The legacy `ENCLAVE_APP_ENV_KEYS` baked-in key list (and the `flake.nix` `appEnvKeysJson` line) has been removed — adding a deploy-time env var no longer requires an EIF rebuild. Framework-identity vars are **non-overridable** (`nonOverridableEnv`): the overlay refuses `ENCLAVE_DEPLOYMENT`, `ENCLAVE_APP_NAME`, `ENCLAVE_KMS_KEY_LOCKED`, `ENCLAVE_MIGRATION_COOLDOWN`, `ENCLAVE_SECRETS_CONFIG` — PCR0-measured identity that names the SSM/KMS namespace and lock posture, not deploy-time config.
- `enclave tofu` subcommand group — split into `tofu init` (initial scaffold + `backend.tf`, with optional TTY-driven S3/DynamoDB backend bootstrap via the bundled `modules/backend` submodule; flags `--bootstrap-backend` / `--no-bootstrap` / `--backend-{bucket,table,region}`), `tofu update` (refresh `terraform.tfvars.json` from `enclave.yaml` — modules and `backend.tf` left untouched), and `tofu env` (set/merge entries in `tofu/env_values.auto.tfvars.json` without hand-editing JSON). Replaces the previous single-shot `enclave tofu`.
- Two artifact-source modes — local upload (default, fast iteration) or remote curl from a published GitHub Release at apply time (`enclave tofu init --remote`)
- Verified clients in Go (`client/`) and Rust (`client-rs/` Cargo workspace member) — verify NSM attestation chain + Schnorr signatures on every response
- Local QEMU integration test harness (`-M nitro-enclave` via QEMU 9.2 + vhost-device-vsock) — 15 integration tests + full locked-key migration + post-migration verification
- CI scaffolding — `enclave init` and `enclave generate template` write `deploy-enclave.yml`, `destroy-enclave.yml`, `verify-enclave.yml` with OIDC, GitHub artifact attestations, and a `gh-pages` attestation status page
- OpenTofu deployment scaffold (`./tofu/`) — merge-only-new module tree with inline `enclave-supervisor.service` systemd unit in `user_data.sh.tftpl`
- Deployer IAM policy template (`deploy-iam-policy.json` at repo root) — least-privilege policy for the OIDC role that runs `tofu apply`: broad `ec2`/`s3`/`kms`/`ssm`/`dynamodb` for stack lifecycle, IAM read for plan-time drift, IAM write scoped to `*enclave*` role + instance-profile ARNs, and `iam:PassRole` guarded to `ec2.amazonaws.com`
- CLI ↔ runtime version sync (`enclave upgrade`) — atomically rewrites the top-level `runtime: {rev,hash,vendor_hash}` block in `enclave.yaml` to the coordinates baked into the CLI binary (via `-ldflags` from `cli/runtime-hashes.json`). Idempotent, scoped strictly to the `runtime:` mapping (never touches `app.nix_*`), respects `ENCLAVE_CONFIG` + bare-layout discovery. Run after `go install ...@latest` instead of hand-editing `enclave.yaml`.
- **Deploy-time Let's Encrypt / ACME TLS** (v0.0.78) — the public `:443` listener can serve either a self-signed cert (default, trust via attestation `tlsKeyHash`) or a CA-issued cert via ACME (`letsencrypt` / `letsencrypt-staging`). `enclave.yaml`'s `tls: { fqdn, provider, email, route53_zone_id }` block flows CLI → Tofu → SSM (`/{dep}/{app}/env/ENCLAVE_NITRIDING_{FQDN,USE_ACME,ACME_DIRECTORY,ACME_EMAIL,ACME_CA}`); the runtime's `loadDeployTLSConfig` reads it on `Init`. Challenge is **TLS-ALPN-01** on `:443` (`acme-tls/1` added to ALPN); a `certForHello` shim resolves nameless ClientHellos to the configured FQDN; a custom `RoundTripper` rewrites the ACME `Location` header for private/test directories. Issued cert material is AES-GCM-sealed under the storage DEK and persisted in S3 via `acmeStorageCache` under the reserved `acme/` namespace, so reboots and locked-key migrations reuse the cert (avoids the Let's Encrypt rate limit). Changing the domain is a **redeploy, not an EIF rebuild**. End-to-end test (`make test-acme`, `test/acme-test.sh`, `test/pebble/` with a local Pebble ACME server) is wired into CI via `.github/workflows/acme-test.yml`.
- **Optional Route53 A-record management** — when `tls.route53_zone_id` is set, `aws_route53_record.enclave` in the Tofu module additionally creates an `A` record for `tls.fqdn` (60 s TTL) pointing at the EIP in that zone (skipped in local mode or when empty; operator-managed DNS keeps working by leaving it empty). `tls.route53_zone_id` without `tls.fqdn` is a config-load error. `deploy-iam-policy.json` scopes `route53:ChangeResourceRecordSets` / `GetHostedZone` / `ListResourceRecordSets` to `arn:aws:route53:::hostedzone/*` and `route53:GetChange` to `arn:aws:route53:::change/*`.
- **Per-request upstream protocol switching** — the `revProxy → user app` HTTP version is selected by `ENCLAVE_NITRIDING_UPSTREAM`: `auto` (default — `protocolSwitchTransport` matches the inbound protocol per request via `r.ProtoMajor`, dispatching HTTP/1.1 to `http.Transport{}` and HTTP/2 to `http2.Transport{AllowHTTP: true}`), `h2c` (pin HTTP/2 cleartext for gRPC-only apps), or `h1` (pin HTTP/1.1 for plain-HTTP apps). `FlushInterval = -1` in every variant.
- **Permissive CORS on `/v1/*` admin routes** — `corsWildcard` middleware wraps the admin mux so a browser SPA can call attestation / storage / secrets / telemetry endpoints cross-origin (wildcard `Access-Control-Allow-{Origin,Methods,Headers,Expose-Headers}`, `Access-Control-Max-Age: 600`, `OPTIONS` short-circuits with `204`). The catch-all upstream proxy is not wrapped — the user app owns its own CORS policy.
- **SSM Session Manager port-forwarding for `log` / `trace` / `metrics`** — these read-only CLI commands now open an `AWS-StartPortForwardingSession` to the supervisor's `:8443` mgmt API and HTTP-stream the response directly, removing the 24 KB SSM RunCommand stdout truncation cap. Local-port race retried once on `EADDRINUSE`; subprocess stderr teed so AccessDenied / expired creds / missing-Session-Manager-Plugin failures surface verbatim. Requires AWS CLI v2 + Session Manager Plugin on `PATH`. `start` / `stop` continue to use RunCommand (small payload).
- **`--profile` flag on cross-repo CLI commands** — `enclave start` / `stop` / `log` / `trace` / `metrics` take an optional `--profile` flag (alongside `--instance-id` / `--region`) that flows into both the AWS SDK config loader and the `aws ssm start-session --profile …` subprocess. Empty falls back to `AWS_PROFILE` env / default credential chain.
- **Upstream-app exit resilience** (v0.0.79, issue #122) — when the user app process exits (crash or clean shutdown), the runtime **stays alive** instead of tearing itself down, so admin endpoints (`/v1/start-migration`, `/health`, `/v1/enclave-info`) stay reachable and an in-flight locked-key migration isn't voided. `cmd/runtime/main.go` records the exit via `Runtime.MarkUpstreamExited(err)` (replacing the old `stop()`) and then waits for explicit shutdown or a listener failure; `UpstreamExited()` reads the latch. `GET /v1/enclave-info` exposes it as `upstream_app: { exited, error }`, and the catch-all reverse proxy returns `502` for routes to the dead app. Covered by `runtime/runtime_test.go` and a `test/run.sh` `[5.5/9]` resilience step driving `/test/crash` on the test app.
- **Layered reproducibility — pinned inputs + Cachix substituters + vendor mode** — new top-level `nix:` block in `enclave.yaml` configures optional Cachix substituters (`substituters` + `trusted_public_keys`, only Cachix URLs accepted, both validated at config-load) and the pinned `nixpkgs` flake input (`nixpkgs_rev` 40-char hex SHA + `nixpkgs_hash` SRI-formatted hash, must be set together). `enclave build --push-cache` pushes the closure to the first substituter after a successful build (`CACHIX_AUTH_TOKEN` + `cachix` CLI required; the scaffolded CI workflow uses `cachix/cachix-action@v15` when `vars.CACHIX_CACHE_NAME` + `secrets.CACHIX_AUTH_TOKEN` are set). New `enclave nixpkgs pin` writes both `nix.nixpkgs_{rev,hash}` and `flake.nix`'s `nixpkgs.url` atomically (tracks `nixos-25.11`); `enclave nixpkgs pin --check` validates the existing pin with no network access. New `enclave vendor --path <dir>` shells out to `cargo vendor` (Rust) or `go mod vendor` (Go) in the upstream source tree; setting `app.vendor: true` (mutually exclusive with `app.nix_vendor_hash`) flips Nix into vendor mode so the app's source closure survives upstream-dep disappearance even on a first build with an empty cache. `enclave setup` skips vendor-hash discovery when `vendor: true` (which would otherwise re-fetch the yanked dep). Node.js + .NET reject `vendor: true` at config-load — `npmDepsHash` / `nugetDeps` already manifest-pin every package. Full reproducibility model documented in `BINARY-CACHE.md`.
- **NAT-less VPC topology** — the Tofu module drops `aws_nat_gateway.main` + `aws_eip.nat`; private subnets are now only used for VPC endpoint ENIs (KMS + SSM interface endpoints; S3 via the gateway endpoint route), and the private route table has no default route. The EC2 instance lives in the public subnet and uses the IGW for outbound traffic — no enclave-internal flow used the NAT egress, so the change is functionally invisible but removes the ~$32/mo NAT-gateway charge.

**Tags**: `aws-nitro`, `enclave`, `confidential-computing`, `kms`, `attestation`, `pcr0`, `pcr0-signing`, `ecdsa-p384`, `schnorr`, `bip-340`, `reproducible-build`, `nix`, `nixpkgs-pin`, `cachix`, `binary-cache`, `vendor-mode`, `cargo-vendor`, `go-mod-vendor`, `vsock`, `gvproxy`, `nitriding`, `viproxy`, `opentofu`, `tofu-init`, `tofu-update`, `tofu-env`, `backend-bootstrap`, `dynamodb-lock-table`, `nat-gateway-removed`, `vpc-endpoints`, `iam`, `iam-policy`, `s3`, `aes-256-gcm`, `secrets`, `lock-namespacing`, `generate-data-key`, `attested-data-key`, `predecessor-attestation`, `non-overridable-env`, `deployment-rename`, `ssm-env-overlay`, `getparametersbypath`, `otlp`, `otlp-ingest`, `tls`, `acme`, `letsencrypt`, `tls-alpn-01`, `autocert`, `pebble`, `route53`, `route53-zone-id`, `cors`, `protocol-switching`, `h2c`, `session-manager`, `port-forwarding`, `aws-profile`, `upstream-app-exit`, `resilience`, `framework`, `cli`, `cli-upgrade`, `go`, `nodejs`, `dotnet`, `rust-client`

**Synonyms**: `simple-enclave`, `introspector-enclave`, `nitro-enclave-framework`, `enclave-cli`, `enclave-supervisor`

**Triggers**:
- **ask_question**: `nitro enclave`, `attestation`, `pcr0`, `kms locked`, `schnorr signature`, `confidential computing`, `enclave migration`, `pcr extension`, `appKeyHash`, `nitriding`, `gvproxy`, `viproxy`, `pcr0 signing`, `ecdsa p384`, `pcr0_signature`, `otlp ingest`, `enclave telemetry`, `enclave tls`, `letsencrypt enclave`, `acme enclave`, `tls-alpn-01`, `pebble`, `acmeStorageCache`, `route53 enclave`, `enclave cors`, `ENCLAVE_NITRIDING_UPSTREAM`, `session manager port forward`, `enclave log truncated`, `enclave tofu env`, `tofu env_values`, `deploy-time env`, `ENCLAVE_APP_ENV_KEYS removed`, `GetParametersByPath`, `enclave tofu subcommands`, `upstream app crash`, `runtime stays alive`, `upstream_app exited`, `enclave lock namespace`, `locked unlocked ssm`, `generate data key attestation`, `predecessor attestation`, `verifyPredecessorCommitment`, `non-overridable env`, `prefix renamed deployment`, `enclave reproducibility`, `cachix enclave`, `binary cache enclave`, `enclave vendor mode`, `nixpkgs pin`, `BINARY-CACHE.md`, `nat gateway removed`, `enclave vpc endpoints`
- **develop**: `add cli command`, `runtime feature`, `supervisor change`, `kms policy`, `migration step`, `dynamic secret`, `storage api`, `tofu module`, `lockSegment`, `kmsKeyIDParam`, `kmsSubtreeParamPath`, `nonOverridableEnv`, `skipCOSEVerification`, `generateDataKey`, `EnclaveAttestedOperations`, `verifyAttestationDoc`, `verifyPCR31CommitmentWithRoots`, `VerifyPredecessorCommitment`, `attestation chain`, `enclave upgrade`, `deployer iam policy`, `tls block`, `acme support`, `autocert`, `ENCLAVE_NITRIDING_FQDN`, `route53_zone_id`, `protocol switch transport`, `cors wildcard`, `upstreamTransport`, `aws profile flag`, `sessionStarter`, `httpViaSession`, `backend bootstrap`, `tofu_bootstrap`, `tofu_env`, `bootstrapBackend`, `defaultBackendValues`, `writeBackendConfig`, `Environment.Override`, `app.env`, `MarkUpstreamExited`, `UpstreamExited`, `UpstreamAppInfo`, `NixConfig`, `nix.substituters`, `nix.nixpkgs_rev`, `nix.nixpkgs_hash`, `app.vendor`, `vendorCommandFor`, `runPinLatest`, `runPinCheck`, `nixpkgsBranch`, `validateNixConfig`, `sriSha256Regex`, `aws_route53_record.enclave`
- **test_or_run**: `enclave build`, `enclave build --push-cache`, `enclave tofu apply`, `enclave verify`, `enclave migrate`, `enclave start`, `enclave stop`, `enclave log --profile`, `enclave metrics --profile`, `enclave nixpkgs pin`, `enclave nixpkgs pin --check`, `enclave vendor`, `qemu nitro-enclave`, `integration test eif`, `make test`, `make test-docker`, `make test-acme`, `vsock loopback`, `enclave tofu init`, `enclave tofu update`, `enclave tofu env`
- **debug**: `pcr0 mismatch`, `kms decrypt failed`, `attestation hash 403`, `migration already in progress`, `secret too large`, `vsock device not found`, `imds proxy unreachable`, `signature verification failed`, `app crashed enclave`, `502 dead app`, `runtime died after app exit`, `predecessor attestation missing`, `attested PCR0 does not match`, `generate data key denied`, `secrets regenerated after lock`

**Dependencies**: AWS services (KMS, SSM, S3, EC2, IAM), Nix + Docker (build), `nitriding` (leaf utilities only post-v0.0.76), `gvproxy` (vsock outbound), `vhost-device-vsock` (local test harness), `monzo/aws-nitro-util` (EIF packaging), `golang.org/x/crypto/acme/autocert` (deploy-time ACME / Let's Encrypt support, v0.0.78+), Pebble ACME server (local end-to-end test only)
**Depended On By**: Any ArkLabs / Arkade Bitcoin / Ark protocol service that needs attested confidential execution (e.g., `introspector` co-signer deployment, future signing services, custodial wallet services)

---

### dotnet-sdk
**ID**: `dotnet-sdk`
**Name**: NArk (.NET Ark SDK)
**Type**: Client Library
**Language**: C# / .NET 8+
**Index**: `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/INDEX.md`
**Repository**: `${DOTNET_SDK_REPO}`
**GitHub**: `arkade-os/dotnet-sdk`

**Description**:
.NET SDK for building Ark protocol wallets and applications. Provides a complete client-side implementation including VTXO management, batch session participation (MuSig2 tree signing), intent-based transaction construction, weight-budgeted coin selection (per-input `ArkTxWeightEstimator` replacing the fixed VTXO cap; opt-in expiry-aware `EARSCoinSelector`), sweeping, on-chain operations, pending-tx recovery (reconciles Arkade txs stranded between Submit and Finalize), payment tracking (assets + explicit Cancelled status), BIP21 / payment-string parsing, a multi-provider swap architecture with Boltz as the shipped provider (submarine / reverse / chain swaps with renegotiation + cooperative refund in both directions + unilateral CLTV / `refundWithoutReceiver`-batch fallbacks when Boltz refuses the co-sign (PR #141) + recovery-state diagnostics), and a full unilateral-exit pipeline (stateful with EF Core or in-memory storage; or stateless one-shot `ExitPlan` API) with v3 CPFP 1p1c relay via the new `IFeeWallet` abstraction. Two-axis wallet model (PR #107): `WalletType { HD, SingleKey }` controls key derivation; signing capability (local, watch-only, remote-signed) is answered at `IWalletProvider.GetSignerAsync` time via composition over `IDescriptorSigningSource`s (PR #114) wrapped in a `CompositeArkadeWalletSigner`. MuSig2 secret nonce stays inside the signer (PR #113 — `GenerateNonces` returns `MusigPubNonce` only, `SignMusig` looks the secret up by caller-supplied `sessionId`). Unified wallet-type-agnostic `IWalletRecoveryService` (PR #104) rebuilds contracts (including legacy script variants under deprecated server signers + mainnet's historical 7-day exit delay), the HD derivation index, funds, boltz swaps, and stranded in-flight Arkade txs in one call. Unified `IBitcoinBlockchain` interface collapses the prior split `IChainTimeProvider` / `IBoardingUtxoProvider` / `IOnchainBroadcaster` trio (NBXplorer / Esplora / RPC impls + matching `Add{NBXplorer,Esplora,Rpc}Blockchain` DI helpers). Deterministic Boltz preimages (PR #116): reverse and chain-swap preimages are derived via `SHA-256( BIP-340-Sign( key, SHA-256("Arkade-Boltz-Preimage-v1" || xonly_pubkey || u32_le(index)) ) )` so a restored wallet rediscovering an outstanding swap via Boltz `/v2/swap/restore` can re-derive and claim the VHTLC; the tag is protocol+provider scoped (not SDK-scoped) so any sibling Arkade SDK produces the same preimage from the same wallet material. Published as NuGet packages with a fluent builder pattern for DI configuration. Ships a Blazor WASM sample wallet and DocFX-generated docs site, both deployed to GitHub Pages.

**Key Capabilities**:
- VTXO lifecycle management with resilient sync: one long-lived arkd `GetSubscription` stream whose script set is mutated **in place** via `UpdateSubscriptionScriptsAsync(add, remove)` deltas (PR #103, retargeted to arkd's unified subscription API in PR #148 — stream opened via `OpenSubscriptionStreamAsync` yielding a `VtxoSubscriptionStarted` id then `VtxoScriptsChanged` pushes; supervisor loop reconnects on the same subscription id, reopens fresh if arkd GC'd the listener, disconnects when the active set is empty). 5 s safety-net poll **re-derives the active script set fresh from `IActiveScriptsProvider`s every tick** and reconciles the stream to it (PR #102), so a stale or missed `ActiveScriptsChanged` event can never hide a script from detection. Each stream push still enqueues a single immediate poll (PR #99 dropped the prior 750 ms / 3 s / 8 s retry fan-out). Persistent per-wallet `vtxo.lastFullPollAt` cursor (stored via `ArkWalletEntity.Metadata`) bounds cold-start catch-up across process restarts, gated so a failed catch-up + successful routine poll can't advance past the gap
- Unconfirmed boarding UTXOs excluded from spendable coins (PR #101): `ArkVtxo.IsUnconfirmedOnchain()` reads a shared `ConfirmedMetadataKey = "Confirmed"` flag (populated by `BoardingUtxoSyncService` from the explorer); `SpendingService.GetAvailableCoins` filters these out so apps don't offer in-mempool boarding inputs that arkd's `validateBoardingInput` will reject at settle time. Confirmation-centric — generalises to arkd-reported unrolled VTXOs as soon as they carry the flag. Surfaced as a **PENDING** pill in the Blazor sample wallet
- Generic per-wallet metadata store on `ArkWalletEntity` (JSON-serialized `Dictionary<string,string>?`, provider-agnostic `jsonb` / `TEXT` / `nvarchar(max)`) accessed via `IWalletStorage.SetMetadataValue` (sparse-key, concurrent-writer-safe)
- Batch round participation with MuSig2 tree signing
- Intent-based off-chain transactions (create, register, sync, schedule)
- Automatic coin selection with dust / sub-dust handling and server-driven `MaxOpReturnOutputs` / `MaxTxWeight`, bounded by a **per-input weight budget** rather than a fixed VTXO count (PR #145/#146 — deleted `ArkTransactionLimits`). `ArkTxWeightEstimator` computes Bitcoin WU for VTXO inputs/outputs (server's `baseSize×3 + totalSize` formula; signature count from `OP_CHECKSIG`/`OP_CHECKSIGVERIFY` opcodes; hand-rolled because PSBT sizing underestimates script-path-in-`Unknown`-fields inputs). `SpendingService` derives `maxInputWeightWu = max_tx_weight − base tx − reserved outputs` (reserving the P2A anchor + asset-packet OP_RETURN) and threads it through `ICoinSelector.SelectCoins` (final param changed `int? maxInputs` → `long? maxInputWeightWu`); `DefaultCoinSelector` (DI default) and the alternative expiry-aware `EARSCoinSelector` both honour it, throwing `TooManyInputsException` (now carrying `MaxInputWeightWu`) when funds are too fragmented. `SimpleIntentScheduler.ChunkByProofTxWeight` packs consolidation intents by proof-tx weight; `DefaultFeeEstimator` feeds each input's `weight` into the server's CEL fee program
- Expiry-aware coin selection (PR #124) — `EARSCoinSelector` (`NArk.Core/CoinSelector/EARS/`), an opt-in alternative `ICoinSelector` (default stays `DefaultCoinSelector`). Groups candidate VTXOs into expiry buckets (`CoinSelectionPolicy.ExpiryWindowBlocks` ≈ 24h windows, no-expiry coins last) and runs four strategies via `CoinSelectionEngine` (`ExpiryFirst` / `RGLI` / `SRD` / `BnB`), picking the lowest-`Waste` result (`change + inputCount × CostPerInputSats`); asset-bearing coins reserved first, then BTC filled and merged. Pinned by `EarsCoinSelectorTests`
- Server-enforced VTXO/UTXO amount bounds and `BoardingAllowed` gate
- Taproot contracts (payment, note, hash-locked, VHTLC). `VHTLCContract.Create(...)` (PR #149) is a validating factory that checks raw parameters **before** encoding them into NBitcoin types that round away the value: 20-byte preimage hash, refund `LockTime` > 0, and CSV delays supplied as `VHtlcDelay.Blocks(uint)` / `VHtlcDelay.Seconds(uint)` (seconds must be ≥ 512 and a multiple of 512). Validation + accepted Ark-address vectors pinned against `arkade-os/rust-sdk`'s `vhtlc.json` fixtures (`NArk.Tests/VHtlcContractTests.cs`)
- Per-type contract scope as a first-class property (PR #121) — the abstract `ArkContract.DefaultScope` (a `[Flags] ContractScope { Onchain = 1, Offchain = 2 }`) forces every contract type to declare its funding layer at compile time (`Boarding => Onchain`; `Payment` / `HashLockPayment` / `Delegate` / `VHTLC` / `Note` / `Unknown` / `Generic => Offchain`), replacing the scattered `Type == "Boarding"` checks that implicitly decided whether funds live on-chain (boarding UTXOs) or off-chain (VTXOs). The resolved scope is persisted on `ArkContractEntity.Scope` / `ArkWalletContractEntity` (indexed) and filterable via the new `IContractStorage.GetContracts(scope:)` parameter, which translates to the SQL bitwise include `(Scope & s) == s` (so a dual-scope `Onchain | Offchain` contract matches both an `Onchain` and an `Offchain` query) — **never** `HasFlag`, which EF Core can't translate. Consumers migrated off the boarding-type check: `BoardingUtxoPollService` / `BoardingUtxoSyncService` / `OnchainSweepService` → `scope: Onchain`, `WalletRecoveryService` → off-chain filter. `ToEntity(scopeOverride:)` is the per-instance override (defaults to `DefaultScope`; nothing sets it yet). Schema note: `NArk.Storage.EfCore` is migrations-history-free so the `Scope` column ships via entity configuration — consumers running their own EF migrations must add a migration creating the column (default `Offchain`) and backfilling existing boarding rows to `Onchain`. Pinned by `NArk.Tests/{ContractScopeTests,EfCoreContractScopeStorageTests}.cs` (the storage test runs on real SQLite, not InMemory, so the non-translatable-query guard can't be hidden by client-side evaluation)
- On-chain boarding, settlement, and collaborative exit
- Sweeping expired/swept VTXOs on-chain — `OnchainSweepService.SweepExpiredUtxosAsync` builds, signs, and broadcasts the CSV unilateral-exit sweep tx (PR #147 completed the prior `NotImplementedException` stub): parses the `ArkBoardingContract`, spends the expired VTXO via its `UnilateralPath()` tapscript at the contract's CSV `Timeout`, sends to a freshly-derived boarding address, signs the taproot script-path, broadcasts via `IBitcoinBlockchain`. CSV-spend tx construction centralized in `TransactionHelpers.BuildCsvSpendTransaction` (shared with `UnilateralExitService`)
- Multi-provider swap architecture (`ISwapProvider` abstraction): `SwapsManagementService` is now a provider-agnostic router over `IEnumerable<ISwapProvider>`, with `BoltzSwapProvider` as the shipped Boltz implementation. Capability discovery via `SwapRoute` / `SwapAsset` / `SwapNetwork` / `SwapQuote` / `SwapLimits`; `SwapStatusChanged` event raised on every persisted status transition. Backward-compatible: existing Initiate* / PayExisting* / Restore* APIs delegate to the resolved `BoltzSwapProvider`. DI helper renamed `AddArkSwaps()` → `AddArkSwapServices()` (calls `AddBoltzProvider()` internally)
- Boltz submarine (Ark→Lightning), reverse (Lightning→Ark), and chain (ARK<->BTC) swaps with MuSig2 cross-signatures; single long-lived Boltz websocket (subscribe / unsubscribe ops keyed by swap id, 5 s reconnect backoff) replaces per-swap-set-change reconnects
- LUD-06-compliant reverse-swap invoice amounts with a configurable fee payer (PR #138) — `InitiateReverseSwap` gains an optional `ReverseSwapFeePayer { Recipient, Sender }` arg (default `Recipient`). `Recipient` pins Boltz's `invoiceAmount = requested` so the BOLT11 invoice equals the requested amount (receiver nets `requested − fee`), the only LNURL-pay / LUD-06-safe mode; `Sender` pins `onchainAmount = requested` so the receiver nets exactly the requested amount at the cost of an inflated invoice. Fixes the prior always-`OnchainAmount` behaviour that inflated the invoice by the swap fee, so lightning-address (LUD-06) payments rejected the mismatch and reverse swaps stuck at `swap.created → invoice.expired`. `BuildReverseAmounts` / `ValidateReverseAmounts` / `ResolveExpectedOnchainAmount` implement the mapping; the delivered on-chain amount is stored as `ArkSwap.ExpectedAmount`, `ReverseResponse` gains a nullable `OnchainAmount`, and reverse fees now run through `BoltzLimitsValidator.ValidateFeesAsync`. Pinned by `ReverseSwapAmountTests` (unit + E2E)
- Chain-swap unhappy-path recovery: renegotiation on `transaction.lockupFailed` (`GET → POST /v2/swap/chain/{id}/quote`, guarded by `BoltzLimitsValidator` + race-tolerant status probe); cooperative BTC-side refund (`CoopRefundBtcToArkChainSwap`) and ARK-side refund (`CoopRefundArkToBtcChainSwap`) in both directions; `swap.expired` with no funds locked → `Failed`; persisted refund destination on first attempt so retries don't leak orphan contract rows (cached under `SwapMetadata.RefundDestination` by the new `SwapExtensions.GetOrDeriveRefundDestinationAsync` helper — extended to submarine refunds in PR #123)
- Unilateral refund fallbacks when Boltz permanently refuses the cooperative co-sign (PR #141): BTC→ARK chain swaps fall through `TryRefundBtcToArk` → `UnilateralRefundBtcToArkChainSwap` (script-path CLTV spend of the BTC HTLC once `lockupDetails.TimeoutBlockHeight` is reached — Boltz supplies the timeout as a plain int, no script parsing); submarine + ARK→BTC swaps fall through to `TryRefundWithoutReceiverAsync`, which submits the VHTLC `refundWithoutReceiver` spend (server + sender, absolute CLTV) as an Arkade **batch intent** via the new optional `IIntentGenerationService` once `VHTLCContract.RefundLocktime` elapses — funds return inside Arkade without an on-chain exit (the block-height CLTV closure is rejected by arkd's `SubmitTx` checkpoint endpoint and only the batch/`JoinRound` path enforces it via the forfeit tx's `nLockTime`). `CheckRefundWithoutReceiverIntentAsync` reconciles the in-flight intent (tracked under `SwapMetadata.RefundIntentTxId` + an `IIntentStorage.IntentChanged` subscription) so a settled refund batch marks the swap `Refunded` instead of being clobbered `Failed` when the now-spent lockup VTXO disappears. `VHTLCContractTransformer` now handles block-height (not just time-lock) refund locktimes. Cooperative-refund/claim fees moved from a flat 250 sats to mempool-driven `EstimateClaimRefundFeeAsync`. Forfeit-tx input sequences pinned to match arkd's `tree.BuildForfeitTx` (CLTV closure → `0xFFFFFFFE`, else `0xFFFFFFFF`; connector always `0xFFFFFFFF`) to avoid `INVALID_FORFEIT_TXS`. Mock-Boltz E2E matrix (`MockBoltzServer` with real MuSig2 + PSBT) + CI E2E split into `e2e-core`/`e2e-swaps`/`e2e-recovery`/`e2e-rotation` workflows
- Boltz swap-provider refactor (PR #123) — `BoltzSwapProvider` split into four partials (`.cs` / `.Lifecycle.cs` / `.Claims.cs` / `.Refunds.cs`); routing delegated to `BoltzRouteHelper`; recovery-action selection delegated to `BoltzOperationClassifier.Classify(swap, boltzStatus) → BoltzSwapAction?` (`PollSwapState` switches on the enum — flat dispatch replaces nested-if recovery branches); every Boltz lifecycle status string lifted into `BoltzSwapStatus` constants + `ToArkSwapStatus(string)` that maps **only** the genuinely-terminal statuses (returns `null` for operational ones so the caller can't accidentally collapse them). Failed-state semantics cleaned up — `Failed` is now strictly terminal failure; anything between terminal states is `Pending`. `ArkSwapStatus.Unknown` added alongside `Pending` / `Settled` / `Failed` / `Refunded` (treated as active by the new `IsActive` extension). `ArkSwap` / `ArkSwapType` / `ArkSwapStatus` / `ArkSwapWithContract` split into their own files; new `SwapExtensions` exposes `IsActive` / `IsTerminalState` / `IsSuccess` / `Get` (metadata accessor) / `GetOrDeriveRefundDestinationAsync` (refund-destination caching shared by submarine + ARK→BTC chain refunds)
- ARK→BTC chain-swap creation fixed (PR #123) — two stacked bugs made every ARK→BTC cooperative refund silently no-op: (1) `ContractScript` was stored as the Ark address string instead of the hex `ScriptPubKey` so `GetVtxoByScriptsAsSnapshot` in `CoopRefundArkToBtcChainSwap` always returned empty; (2) the VHTLC contract was never imported into `IContractStorage` on swap creation so even with the right script the contract lookup failed. Fixed by moving VHTLC construction into `BoltzSwapsService.CreateArkToBtcSwapAsync` (now takes an `OutputDescriptor` instead of raw pubkey hex), calling `IContractService.ImportContract` in the new `SwapsManagementService.RegisterArkToBtcChainSwapAsync` **before** any funds are committed, and saving the swap row with `contract.GetArkAddress().ScriptPubKey.ToHex()`. `RegisterArkToBtcChainSwapAsync` is `internal` so E2E tests can register a swap and mine past the timeout before funding, exercising the natural `swap.expired` path
- Swap recovery inspection: `SwapsManagementService.InspectSwapRecoveryAsync` / `ScanRecoverableSwapsAsync` return `SwapRecoveryInfo` snapshots (`Recoverable` / `NoFunds` / `AlreadyRefunded` / `AlreadySettled` / `StillPending` / `SwapNotFound` / `InspectionError`) across all four swap types — side-effect-free; recovery itself runs inside `BoltzSwapProvider.PollSwapState`
- Deterministic Boltz preimages for restorable claims (PR #116) — reverse and chain-swap preimages are derived from the wallet's signing material: `preimage = SHA-256( BIP-340-Sign( key, SHA-256("Arkade-Boltz-Preimage-v1" || xonly_pubkey(32) || u32_le(index)), aux_rand=null ) )`. Same `(wallet, pubkey, index)` → same signature → same preimage, so a restored wallet rediscovering an outstanding swap via Boltz `/v2/swap/restore` re-derives and attaches the preimage in `SwapsManagementService.RestoreSwaps` (gated by `SHA-256(candidate) == restored.PreimageHash`; mismatch leaves the manual `EnrichReverseSwapPreimage` path as fallback). Anchored on the canonical x-only pubkey **not** the descriptor's string form — an HD signing descriptor and the bare receiver descriptor a restore reconstructs both hash to the same message. Tag is protocol+provider scoped (`Arkade`+`Boltz`) not SDK-scoped so any sibling Arkade SDK reproduces the same preimage from the same wallet material; versioned (`-v1`) for future scheme bumps. `SwapsManagementService.{InitiateReverseSwap, InitiateBtcToArkChainSwap, InitiateArkToBtcChainSwap}` call `DerivePreimageAsync(walletId, descriptor, index: 0, ct)` and pass the bytes through new optional `byte[]? preimage = null` parameters on `BoltzSwapsService.{CreateReverseSwap, CreateBtcToArkSwapAsync, CreateArkToBtcSwapAsync}`. Watch-only wallets fall back to `RandomUtils.GetBytes(32)` — no recovery story but swaps execute. Submarine swaps excluded (Boltz controls that preimage). `IRemoteSignerTransport.SignAsync` `<remarks>` requires implementations **SHOULD** sign with `aux_rand=null`; transports that randomise it (e.g. hardware-signer side-channel hardening) still execute swaps fine but lose the post-restore claim story for remote-signed wallets. Pinned cross-SDK by `NArk.Tests/PreimageDerivationTests.cs`
- Pending Arkade transaction recovery: `PendingArkTransactionRecoveryService` reconciles off-chain txs stranded between `SubmitTx` and `FinalizeTx` (server locked inputs in-flight, finalize never fired). Runs on host startup via `ArkHostedLifecycle` (after `VtxoSync`) across every wallet; also exposes `FinalizePendingArkTransactionsAsync(walletId)` for on-demand recovery. Builds BIP-322 ownership proofs (uses spent VTXOs as proof material), calls the new `IClientTransport.GetPendingTxAsync` endpoint, signs returned checkpoint PSBTs, finalizes. Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) without blocking the loop
- BIP21 / payment-string parser: `ArkBip21.Parse` / `ParseStrict` handle BIP21 URIs, Ark addresses, BOLT11 invoices, LNURL, and Bitcoin addresses into a unified `Bip21PaymentInfo` with `PreferredMethod` routing (`ArkSend` / `SubmarineSwap` / `ChainSwap`); decimal-BTC `Amount` with `AmountSats` derivation; fluent `ArkBip21Builder` (`WithAssetId` / `WithCustomParameter`) for URI construction. `Build()` requires at least one destination from `{arkAddress, onchainAddress, lightning}` and emits the empty-address form (`bitcoin:?lightning=…` / `bitcoin:?asset=…`) when only the query side is populated (PR #109) — receive screens that toggle Ark / on-chain chips off while keeping Lightning keep the same `bitcoin:` QR scheme across toggle states; `assetId` is a what-to-send constraint, not a destination
- LNURL-pay helper as a first-class SDK type: `NArk.Core.Payments.LnurlHelper` (PR #106 — lifted out of the WASM sample). Decodes `lnurl1…` bech32, resolves Lightning Addresses (`user@domain`) into `LnurlPayParams` (LUD-06 / LUD-16), and fetches BOLT11 invoices from the callback URL. Public API: `IsLnurl`, `DecodeLnurl`, `ResolveAsync(input, ct)`, `FetchInvoiceAsync(callback, amountSats, ct)`. `CancellationToken` parameters throughout. No new dependencies — uses NBitcoin's bech32 + `System.Net.Http.Json`. Lets downstream wallet hosts (WalletWasabi, BTCPay, etc.) drop their copy-paste forks and consume the SDK type via `using NArk.Core.Payments;`
- Two-axis wallet model — `WalletType { HD, SingleKey }` controls key derivation; signing capability is answered at `IWalletProvider.GetSignerAsync` time, not by a flag on `ArkWalletInfo` (PR #107). `ArkWalletInfo.Secret` is nullable: `null` → watch-only (if no transport claims it) or remote-signed (if an `IRemoteSignerTransport` claims it via `KnowsWalletAsync(walletId)`); non-null → local. `WalletFactory.CreateWatchOnlyWallet(descriptor, …)` infers `WalletType` from the descriptor's wildcard at creation time. EF Core: `ArkWalletEntity.Wallet` column is nullable; unique index gets `.HasFilter("\"Wallet\" IS NOT NULL")` so SQL Server allows multiple null-Wallet rows (harmless on Postgres / SQLite). Watch-only paths surface a descriptive `InvalidOperationException` hoisted above per-VTXO loops in `TreeSignerSession` + `TransactionHelpers` (forfeit-sign message specifically calls out that watch-only wallets can't participate in batches demanding a forfeit)
- Composed signer (`IDescriptorSigningSource`) — `IArkadeWalletSigner` is now always a `CompositeArkadeWalletSigner` built from one or more `IDescriptorSigningSource`s (PR #114). Each source answers `CanProvideAsync(descriptor)` and exposes operation-level signing methods — **never** returning `ECPrivKey`, which is what lets a remote source implement the contract honestly without round-tripping secret material. Three sources ship: `Bip39SigningSource` (master fingerprint match — replaces `HierarchicalDeterministicWalletSigner`), `NsecSigningSource` (x-only pubkey match — `NsecSigningSource.FromNsec` mirrors the old `NSecWalletSigner.FromNsec`), `RemoteTransportSigningSource` (delegates to `IRemoteSignerTransport.KnowsWalletAsync`). The three previous concrete signer classes were deleted; existing call sites compile because the public interface didn't move. `DefaultWalletProvider.GetSignerAsync` cache key collapsed to `wallet.Id` alone; cache check moved above source construction so the hot batch path avoids per-VTXO master-fingerprint derivation + remote-transport round-trips
- MuSig2 secret nonce stays inside the signer (PR #113) — `IArkadeWalletSigner.GenerateNonces(descriptor, context, sessionId)` now returns `MusigPubNonce` only; the signing source stashes the secret in a per-instance `ConcurrentDictionary<string, MusigPrivNonce>` keyed by `sessionId`. `SignMusig(descriptor, context, sessionId)` drops the `MusigPrivNonce` parameter and `TryRemove`s the secret on consume so the store self-evicts on the happy path. Throws if a nonce is already stored for the same `sessionId` (double-call without intervening `SignMusig` would orphan secret material — almost certainly a caller bug). `sessionId` is caller-supplied because `MusigContext.AggregatePubKey` isn't unique per signing operation — sibling tree-tx nodes can share cosigner set + tweak; `TreeSignerSession` passes each tree-node txid. Closes a class of bugs where a remote-signer transport had to round-trip secret nonces over the wire (defeating remote signing) and where in-process callers could accidentally reuse a MuSig2 nonce by holding it in their own data structures (catastrophic — leaks the private key). `IRemoteSignerTransport` documents the eviction-policy requirement for long-lived transports
- Configurable Boltz `referralId` for attribution — `BoltzClientOptions.ReferralId` defaults to `"arkade-dotnet-sdk"` (`BoltzClientOptions.DefaultReferralId`); consumer apps override via `services.Configure<BoltzClientOptions>` (BTCPay's `"btcpay-arkade"`, wallet's `"arkade-money"`); `null` opts out
- Resilient `RPCChainTimeProvider` — caches last successful `(Timestamp, Height)` and falls back on transient Bitcoin Core RPC failures so a single 500 from `getblockchaininfo` no longer takes controller-bound consumers (e.g. BTCPay plugin manager) down
- Per-wallet `BeginScope(("WalletId", id))` log scopes across Swaps, Batch, Onchain, Intent, Spending, Asset, Recovery, Delegation, and Sweeper services so downstream sinks can route every transitively-emitted log line to the right wallet
- Payment tracking (`PaymentTrackingService` now `IHostedService`): asset tracking via `ArkPayment.Assets` and `ArkPaymentRequest.ExpectedAsset` / `ReceivedAssets` (JSONB-persisted, accumulated via `MergeAssets`); explicit `Cancelled` terminal status distinct from `Failed`; `SemaphoreSlim` serialises `OnVtxoChanged` against same-request races. Opt-in via `AddArkPaymentTracking()`
- Vendored NBitcoin.Scripting (`OutputDescriptor`, parsers, `SigningRepository`) in `NArk.Abstractions`
- HD wallet support with descriptor recycling, plus gap-limit recovery (`HdWalletRecoveryService`) for re-imported mnemonics via pluggable `IContractDiscoveryProvider`s (indexer-VTXO, boarding-UTXO, Boltz-swap, plus custom)
- Unified wallet-type-agnostic recovery (`IWalletRecoveryService.RecoverAsync(walletId, options?, ct)`, PR #104) — rebuilds local state from on-chain / indexer / boltz sources for a wallet imported into empty storage. Dispatches by `WalletType`: HD → gap-limit index scan (boltz swaps restored in-line); SingleKey → re-derive the deterministic default contract + restore swaps for its descriptor directly. Both then finalize stranded pending Arkade txs (`PendingArkTransactionRecoveryService.FinalizePendingArkTransactionsAsync`), poll the indexer for every recovered offchain (non-boarding) script (`VtxoSynchronizationService.PollScriptsForVtxos`), and produce a swap-audit snapshot (`SwapsManagementService.ScanRecoverableSwapsAsync`). Returns `WalletRecoveryReport(WalletType, HdScan?, ContractsRecovered, RestoredSwaps, SwapAudit, FinalizedPendingTxIds, FundsScriptsSynced)` where `ContractsRecovered` is the **delta** newly persisted by this run. `IndexerVtxoDiscoveryProvider` simultaneously upgraded to probe the cross-product `{ current signer ∪ DeprecatedSigners } × { current exit delay ∪ mainnet-legacy 7-day delay (605184s, mainnet-only) }` × `{ default ArkPaymentContract ∪ ArkDelegateContract per `RecoveryDelegateConfig.Delegates` entry }` in a single indexer query — so funds locked under a rotated/legacy server key, the historical mainnet exit delay, or a delegate descriptor are recovered alongside the current-signer default. New `KeyExtensions.ToOutputDescriptor(ECXOnlyPubKey, Network)` rebuilds `tr(<32-byte x-only>)` descriptors for arkd's x-only deprecated signers. Server-info caching reshaped to a result-cache + `SemaphoreSlim` first-fetch lock (replaces a `Lazy<Task>` that would have permanently published a faulted task on a transient first-probe failure). Registered as a singleton by `AddArkSwapServices`; lives in `NArk.Swaps.Recovery` because it composes both Core recovery services and the swap services
- Batch stream-topic subscription race closed (PR #118) — `BatchManagementService` now reconciles topic subscriptions on `StreamStartedEvent` by re-subscribing every active intent's topics. Closes a stall where an intent that reached `WaitingForBatch` during the gRPC stream-connect window (before `_streamId` was set) had its topic subscription silently skipped by the null-stream guard with no retry, never received `BatchStartedEvent`, and got re-proposed every batch round forever. `UpdateStreamTopics` add is idempotent (server-side set union), so the reconcile is a no-op for already-subscribed intents
- Unilateral exit pipeline (`UnilateralExitService`) with state machine `Broadcasting` → `AwaitingCsvDelay` → `Claimable` → `Claiming` → `Completed`. Three operating shapes: stateful with EF Core persistence (opt-in `ConfigureArkExitEntities()`), stateful with in-memory storage (`AddInMemoryExitStorage()`), or stateless one-shot API (`BroadcastExitChainAsync` returns an `ExitPlan` the caller persists; `ClaimMaturedExitAsync(plan)` claims once the CSV timelock matures). `VirtualTxService` backs the storage layer (Lite default — txids + expiry, hex fetched on demand at `StartExitAsync`; Full mode stores raw hex at every VTXO arrival; whole-chain incl. `Commitment` root tagged with `ChainedTxType`); `ExitWatchtowerService` auto-starts exits on partial-tree-broadcast detection; opt-in `VtxoChainAutoFetchService` (`AddVirtualTxAutoFetch()`) pre-stores chains for every new VTXO above the worth-threshold. `P2ACpfpBuilder` builds v3 1p1c CPFP children via the new `IFeeWallet` abstraction (`SignFeeUtxoAsync` sighash-callback signing — never holds raw keys; `SelectFeeUtxoAsync` returns `ICoin?`); gracefully falls back to direct broadcast when no fee wallet is registered. `ParseVirtualTx` branches on `ChainedTxType` (Tree → lift `PSBT_IN_TAP_KEY_SIG`, Ark/Checkpoint → `Finalize+ExtractTransaction` with `FinalScriptWitness` fallback, Commitment filtered out)
- Unified `IBitcoinBlockchain` interface (6 members: `GetChainTime`, `GetUtxosAsync`, `BroadcastAsync`, `BroadcastPackageAsync`, `GetTxStatusAsync`, `EstimateFeeRateAsync`) replaces the prior split `IBoardingUtxoProvider` / `IChainTimeProvider` / `IOnchainBroadcaster` trio. Three concrete impls under `NArk.Core/Blockchain/`: `NBXplorerBlockchain` (preserves cached-fallback chain-time + `submitpackage`/sequential broadcast fallback), `EsploraBlockchain`, `RpcBlockchain` (`GetUtxosAsync` throws `NotSupportedException` — no native address index). DI helpers `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` register every supported member of a backend in one call; `ArkApplicationBuilder.WithBlockchain<T>()` replaces the prior `WithTimeProvider<T>()`
- Per-network Esplora + Electrum (WS / TCP) endpoint defaults on `ArkNetworkConfig` mirror the canonical Arkade ts-sdk presets so apps can wire `IBitcoinBlockchain` straight off the preset (`services.AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!))`) without their own NBXplorer / bitcoind. Nullable fields: `EsploraUri`, `ElectrumWsUri`, `ElectrumTcpUri` (`tcp://host:port`). Electrum TCP ports verified at the `server.version` protocol level against the public Fulcrum hosts — only `:50001` plain-TCP is exposed on Mainnet / Mutinynet (TLS goes via the WSS endpoint at `:443`); Regtest uses nigiri's electrs binary port `:50000`. Additive nullable defaults — existing named-args callers untouched
- Deterministic Arkade asset packets: `AssetPacketBuilder.Build` orders `AssetGroup` entries by `AssetId` (ordinal hex over the 34-byte `txid ‖ groupIndex_LE` serialization — same `(txid, groupIndex)` ordering as rust-sdk) regardless of input order, so the same logical transfer always serializes to identical OP_RETURN bytes across runs. Cross-SDK conformance enforced by ts-sdk-sourced fixtures (`asset_ref` / `asset_input` / `asset_output` / `metadata` incl. `MetadataList` Merkle-hash vectors) under `NArk.Tests/Assets/Fixtures/`
- EF Core storage package (pluggable DB provider, opt-in payment entities, opt-in unilateral-exit entities, opt-in `StoreDateTimeOffsetAsTicks` for SQLite `ORDER BY` support — scoped to Ark-owned entity types so it can't bleed into consumer columns)
- gRPC + REST/SSE transports with camelCase, string-encoded int64, and custom-signet (mutinynet) handling
- Transport version headers on every gRPC + REST request (`ArkdVersion.InjectHeader`): `X-Build-Version` (the arkd build the SDK targets, `ArkdVersion.TargetBuild`; a `BUILD_VERSION_TOO_OLD` rejection raises `IncompatibleSdkVersionException`) and **`X-SDK-VERSION`** (PR #139) — the SDK's own version as a `dotnet-sdk/{version}` product token so arkd can distinguish the .NET SDK from sibling SDKs on the wire. Value is `Nerdbank.GitVersioning`'s `ThisAssembly.AssemblyInformationalVersion` with the `+commit` build-metadata suffix stripped (e.g. `dotnet-sdk/1.0.327-beta`); pinned by `NArk.Tests/BuildVersionHeaderTests.cs`
- Shared regtest E2E environment via the `arkade-os/arkade-regtest` git submodule + .NET Aspire AppHost
- Blazor WASM sample wallet (`samples/NArk.Wallet/`) deployed to GitHub Pages alongside DocFX docs

**Tags**: `sdk`, `dotnet`, `csharp`, `nuget`, `client`, `library`, `vtxo`, `musig2`, `batch`, `intent`, `boltz`, `swap`, `multi-provider-swaps`, `swap-provider`, `swap-router`, `chain-swap-renegotiation`, `cooperative-refund`, `swap-recovery-inspection`, `pending-tx-recovery`, `bip21-parser`, `bip21-lightning-only`, `bip21-asset-only`, `lnurl-helper`, `lnurl-pay`, `lightning-address`, `referral-id`, `efcore`, `aspire`, `regtest-submodule`, `grpc-client`, `rest-client`, `sse`, `taproot`, `output-descriptor`, `payment-tracking`, `payment-assets`, `payment-cancelled`, `hd-recovery`, `gap-limit`, `discovery-provider`, `wallet-metadata`, `sync-cursor`, `chain-time-cache`, `wallet-scoped-logs`, `lnurl`, `blazor`, `wasm`, `docfx`, `unilateral-exit`, `exit-watchtower`, `virtual-tx`, `chained-tx-type`, `p2a-cpfp`, `truc-relay`, `fee-wallet`, `exit-plan`, `in-memory-exit-storage`, `ibitcoinblockchain`, `nbxplorer-blockchain`, `esplora-blockchain`, `rpc-blockchain`, `sqlite-orderby`, `datetimeoffset-ticks`, `asset-packet`, `deterministic-asset-ordering`, `cross-sdk-fixtures`, `network-defaults`, `esplora-uri`, `electrum-uri`, `electrum-ws`, `electrum-tcp`, `in-place-subscription`, `subscription-id`, `fresh-derive-poll`, `unconfirmed-boarding-utxo`, `confirmed-metadata`, `docker-helper`, `fulmine-faucet`, `watch-only-wallet`, `remote-signer`, `remote-signer-transport`, `descriptor-signing-source`, `composite-signer`, `bip39-signing-source`, `nsec-signing-source`, `remote-transport-signing-source`, `musig2-secret-nonce`, `nonce-session-id`, `nullable-wallet-secret`, `wallet-recovery-service`, `unified-wallet-recovery`, `legacy-signer-recovery`, `deprecated-signer`, `mainnet-legacy-exit-delay`, `recovery-delegate-config`, `ark-delegate-contract`, `tooutputdescriptor`, `batch-topic-reconcile`, `denigiri-regtest`, `mempool-esplora`, `boltz-operation-classifier`, `boltz-route-helper`, `boltz-swap-action`, `boltz-swap-status-constants`, `arkswapstatus-unknown`, `swap-metadata-refund-destination`, `ark-to-btc-chain-swap-fix`, `register-ark-to-btc-chain-swap`, `swap-extensions`, `deterministic-preimage`, `bip340-sign-and-hash`, `swap-preimage-recovery`, `preimage-tag-v1`, `cross-sdk-preimage`, `aux-rand-null`, `x-sdk-version-header`, `x-build-version-header`, `sdk-version-token`, `ark-tx-weight-estimator`, `per-input-weight`, `max-tx-weight-budget`, `weight-budget-coin-selection`, `ears-coin-selector`, `expiry-aware-selection`, `coin-selection-policy`, `chunk-by-proof-tx-weight`, `too-many-inputs-exception`, `ark-transaction-limits-removed`, `unilateral-cltv-refund`, `refund-without-receiver`, `refund-intent-txid`, `block-height-refund-locktime`, `forfeit-tx-sequence`, `mock-boltz-server`, `e2e-workflow-split`, `vhtlc-create-factory`, `vhtlc-delay`, `vhtlc-test-vectors`, `rust-sdk-vhtlc-fixtures`, `contract-scope`, `contract-default-scope`, `onchain-offchain-scope`, `scope-bitwise-filter`, `getcontracts-scope`, `contract-scope-migration`, `ci-solution-filter`, `narkci-slnf`, `getvtxochain-pagination`, `vtxo-chain-page-token`, `address-provider-cleanup`, `reverse-swap-fee-payer`, `reverse-swap-invoice-amount`, `lud-06`, `lud-06-invoice-match`, `lnurl-pay-invoice`, `boltz-invoice-amount`, `build-reverse-amounts`

**Synonyms**: `nark`, `nark-sdk`, `dotnet-client`, `csharp-sdk`, `.net-sdk`

**Triggers**:
- **ask_question**: `dotnet sdk`, `csharp ark`, `.net wallet`, `nark`, `nuget ark`, `nark wasm wallet`, `nark sample wallet`, `hd recovery`, `gap limit scan`, `wallet metadata`, `sync cursor`, `boltz referral id`, `swap provider`, `multi-provider swap`, `ark bip21`, `arkbip21 lightning only`, `arkbip21 asset only`, `bitcoin lightning only uri`, `lnurl helper`, `lnurlhelper`, `lnurl pay decode`, `lightning address resolve`, `fetch invoice from callback`, `pending tx recovery`, `inspect swap recovery`, `unilateral exit dotnet`, `nark exit pipeline`, `exit plan`, `virtual tx storage`, `p2a cpfp builder`, `ifeewallet`, `ibitcoinblockchain`, `nbxplorer blockchain`, `esplora blockchain`, `rpc blockchain`, `asset packet builder`, `deterministic asset ordering`, `cross sdk asset fixtures`, `arknetworkconfig esplora default`, `arknetworkconfig electrum default`, `electrum ws uri`, `electrum tcp uri`, `vtxo subscription in place`, `opensubscriptionstreamasync`, `updatesubscriptionscriptsasync`, `vtxosubscriptionstarted`, `vtxoscriptschanged`, `vtxosubscriptionevent`, `arkd unified getsubscription`, `updatesubscription rpc`, `proto sync check`, `proto drift ci`, `swept_vtxos txnotification`, `vtxo poll fresh derive`, `unconfirmed boarding utxo`, `isunconfirmedonchain`, `confirmed metadata key`, `pending boarding pill`, `watch-only wallet dotnet`, `remote signer dotnet`, `iremotesignertransport`, `knowswalletasync`, `createwatchonlywallet`, `compositearkadewalletsigner`, `idescriptorsigningsource`, `bip39 signing source`, `nsec signing source`, `remote transport signing source`, `musig2 secret nonce inside signer`, `nark musig2 nonce session id`, `arkwalletinfo secret nullable`, `arkwalletentity wallet nullable`, `iwalletrecoveryservice`, `walletrecoveryservice`, `walletrecoveryreport`, `unified wallet recovery dotnet`, `recover wallet dotnet`, `recoveryasync dotnet`, `deprecated signer recovery`, `legacy server signer`, `legacy script variants`, `mainnet legacy exit delay`, `recoverydelegateconfig`, `arkdelegatecontract recovery`, `keyextensions tooutputdescriptor`, `indexervtxodiscoveryprovider deprecated signers`, `denigiri regtest`, `mempool esplora`, `batch stream topic race`, `intent stuck waitingforbatch`, `boltzoperationclassifier`, `boltzroutehelper`, `boltzswapaction`, `boltzswapstatus constants`, `boltzswapstatus toarkswapstatus`, `arkswapstatus unknown`, `swapmetadata refund destination`, `swap extensions isactive`, `getorderiverefunddestinationasync`, `registerArkToBtcChainSwap`, `ark to btc chain swap refund silently no-op`, `coop refund ark to btc returns false`, `vhtlc not imported on swap creation`, `contract script stored as ark address`, `boltzswapsservice createarktobtcswapasync outputdescriptor`, `boltz swap provider partial classes`, `deterministic preimage`, `bip-340 sign and hash preimage`, `swap preimage recovery`, `recover reverse swap after restore`, `restore wallet claim outstanding vhtlc`, `arkade-boltz-preimage-v1`, `buildpreimagemessage`, `derivepreimageasync`, `aux_rand null swap recovery`, `cross-sdk preimage reproducibility`, `x-sdk-version header`, `x-build-version header`, `arkdversion injectheader`, `sdk version header dotnet`, `arktxweightestimator`, `per-input weight estimation`, `max_tx_weight budget`, `maxinputweightwu`, `ears coin selector`, `expiry aware coin selection`, `coinselectionpolicy`, `coinselectionengine`, `branch and bound coin selector`, `chunkbyprooftxweight`, `arktransactionlimits removed`, `unilateral btc refund chain swap`, `refund without receiver`, `refundwithoutreceiver batch intent`, `swapmetadata refundintenttxid`, `block height refund locktime`, `mockboltzserver`, `vhtlccontract create`, `vhtlcdelay blocks seconds`, `vhtlc preimage hash 20 bytes`, `vhtlc seconds timelock multiple of 512`, `rust-sdk vhtlc test vectors`, `contract scope`, `contractscope onchain offchain`, `arkcontract defaultscope`, `getcontracts scope filter`, `contract scope bitwise query`, `scope column migration`, `narkci slnf`, `ci solution filter`, `blazor wallet excluded from ci`, `getvtxochain pagination`, `vtxo chain page token`, `getvtxochain next_page_token`, `reverse swap fee payer`, `reverseswapfeepayer recipient sender`, `reverse swap invoice amount`, `lud-06 invoice mismatch`, `lnurl pay invoice amount`, `who pays reverse swap fee`, `buildreverseamounts`
- **develop**: `dotnet feature`, `csharp wallet`, `.net integration`, `efcore storage`, `payment tracking`, `payment assets`, `output descriptor`, `blazor wasm wallet`, `contract discovery provider`, `restore from mnemonic`, `walletid log scope`, `wallet metadata column`, `boltz referral id`, `add swap provider`, `iswap provider`, `chain swap renegotiation`, `cooperative refund`, `bip21 builder`, `arkbip21 build lightning only`, `lnurl resolve`, `lightning address`, `lnurlhelper fetchinvoice`, `pending ark tx`, `add unilateral exit`, `add virtual tx auto fetch`, `add in memory exit storage`, `configure ark exit entities`, `with blockchain builder`, `add nbxplorer blockchain`, `add esplora blockchain`, `add rpc blockchain`, `implement ifeewallet`, `store datetime offset as ticks`, `implement iremotesignertransport`, `implement idescriptorsigningsource`, `register remote signer transport`, `walletfactory createwatchonlywallet`, `wallet null secret`, `call iwalletrecoveryservice`, `register recoverydelegateconfig`, `recover from mnemonic dotnet`, `recover single key wallet dotnet`, `implement deterministic preimage`, `iremotesignertransport aux_rand`, `preimage from wallet key`, `custom coin selector`, `swap to ears coin selector`, `implement icoinselector weight budget`, `tune coinselectionpolicy`, `estimate ark tx weight`, `unilateral refund chain swap`, `refundwithoutreceiver intent`, `set reverse swap fee payer`, `reverse swap recipient pays fee`, `filter contracts by scope`, `add contract scope`, `set contract default scope`, `migrate contract scope column`, `paginate getvtxochain`, `add project to narkci slnf`
- **test_or_run**: `dotnet test`, `aspire apphost`, `nark e2e`, `arkade-regtest submodule`, `docfx serve`, `unilateral exit tests`, `test fee wallet`, `p2a cpfp tests`, `efcore sqlite orderby test`, `ears coin selector tests`, `ark tx weight estimator tests`, `mock boltz refund tests`, `e2e-swaps workflow`
- **debug**: `grpc connection`, `rest sse 501`, `batch session error`, `musig2 mismatch`, `swap failed`, `swap stuck pending`, `chain swap wrong amount`, `reverse swap invoice inflated by fee`, `reverse swap stuck invoice expired`, `lud-06 wallet rejects invoice`, `lightning address payment never settles`, `mutinynet network`, `bit besql sqlite`, `vtxo 11k cap`, `recovery scan stuck`, `single key recovery throws`, `chain time rpc 500`, `plugin disabled by host`, `cold start refetches all vtxos`, `boltz websocket reconnect storm`, `failure details json exception`, `submit finalize stranded`, `addarkswaps not found`, `withtimeprovider not found`, `exit session failed invalid hex`, `truc violation`, `mempool script verify flag failed`, `parse virtual tx`, `psbt no witness utxo`, `tree tx witness empty`, `addunilateralexit missing tables`, `order by datetimeoffset sqlite`, `watch-only wallet throws on batch`, `forfeit tx signer missing`, `signmusig no nonce for session`, `nonce already generated for sessionid`, `hierarchicaldeterministicwalletsigner not found`, `nsecwalletsigner not found`, `remotearkadewalletsigner not found`, `sql server null wallet unique index`, `recovery skips legacy signer`, `singlekey wallet recover throws`, `recovery silent zero result`, `mainnet vtxo not recovered after delay shortened`, `intent stuck waitingforbatch never signs`, `batch round re-proposes same intent forever`, `bitcoin-cli connection refused regtest`, `dockerhelper ark container not found`, `chopsticks endpoint 404`, `ark to btc chain swap refund silent no-op`, `getvtxos empty for vhtlc contract script`, `contract not found in icontractstorage on refund`, `BoltzSwapsService.CreateArkToBtcSwapAsync signature change`, `BoltzSwapProvider partial class not found`, `vhtlc claim fails after wallet restore`, `restored wallet preimage mismatch`, `aux_rand randomisation breaks swap recovery`, `boltz swap preimage hash mismatch`, `tx_too_large rejected by arkd`, `spend fails too many inputs`, `vtxos too fragmented to spend`, `coin selection weight budget exceeded`, `invalid_forfeit_txs sequence mismatch`, `chain swap stuck no refund`, `vhtlc refund not triggering block height`, `boltz refused cooperative refund`, `refund without receiver intent stuck`, `hasflag not translated ef core`, `scope column missing migration`, `getcontracts scope returns nothing`, `boarding rows scope offchain`

**Dependencies**: `arkd` (server communication via gRPC + REST/SSE), `fulmine` (Boltz-side wallet in E2E), `boltz-backend` (swap provider), `arkade-regtest` (shared regtest env, git submodule)
**Depended On By**: .NET applications building on Ark protocol

---

### ts-sdk
**ID**: `ts-sdk`
**Name**: Ark TypeScript SDK
**Type**: Client Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/ts-sdk/INDEX.md`
**Repository**: `${TS_SDK_REPO}`
**GitHub**: `arkade-os/ts-sdk`

**Description**:
Official TypeScript SDK (`@arkade-os/sdk`) for the Ark protocol. Provides a complete client library for building Bitcoin wallets with Taproot and Ark VTXO support. Features wallet management (full + watch-only), HD identity (BIP39/BIP86), VTXO operations, batch settlement with MuSig2, asset management, VTXO delegation, unilateral exit, and service worker support. Runs in browsers, Node.js, React Native/Expo with pluggable storage adapters.

**Key Capabilities**:
- Wallet creation and management (Wallet, ReadonlyWallet, ServiceWorkerWallet, OnchainWallet)
- Mainnet defaults: `arkServerUrl` defaults to `DEFAULT_ARKADE_SERVER_URL` (`https://arkade.computer`); `OnchainWallet.create` defaults to `DEFAULT_NETWORK_NAME` (`bitcoin`); `ArkAddress` and `contractFromArkContractWithAddress` default HRP to `DEFAULT_ARKADE_HRP` (`ark`); `getArkadeServerUrl({ arkServerUrl })` helper resolves the URL. **Since 0.4.28** (after d682eac): every default provider constructor also defaults its URL — `new RestArkProvider()` / `new RestIndexerProvider()` / `new ExpoArkProvider()` / `new ExpoIndexerProvider()` resolve to `DEFAULT_ARKADE_SERVER_URL`; `new EsploraProvider()` resolves to `ESPLORA_URL[DEFAULT_NETWORK_NAME]`. `VtxoScript.address(prefix?)` defaults `prefix` to `DEFAULT_NETWORK.hrp`; `VtxoScript.onchainAddress(network?)` defaults to `DEFAULT_NETWORK`. The `DEFAULT_ARKADE_SERVER_URL` / `DEFAULT_NETWORK` / `DEFAULT_NETWORK_NAME` constants moved to `src/networks.ts` (out of `src/wallet/index.ts`) to keep the import chain `script → networks → provider` cycle-free
- **URL string config deprecation** *(0.4.28, refs #466)*: `BaseWalletConfig.arkServerUrl` / `indexerUrl` / `esploraUrl` and `ServiceWorkerWalletOptions.arkServerUrl` / `indexerUrl` / `esploraUrl` / `delegatorUrl` all `@deprecated` (JSDoc only; runtime behaviour unchanged). Provider-based config is the recommended path (`arkProvider`, `indexerProvider`, `onchainProvider`, `delegatorProvider` instances). Wallet/ExpoWallet `create` example JSDocs rewritten to drop the URL-based form. Will be removed in a future major version
- **Dust change guard / DustChangeError** *(0.4.28, closes #458)*: `Ramps` partial collaborative-exit / offboard now pre-checks the residual change VTXO against the wallet's dust threshold and throws a typed `DustChangeError` (`change: bigint`, `dustAmount: bigint`) before forwarding the intent to arkd — wallet UIs catch it and can offer to exit the full balance instead of surfacing the raw server-side dust rejection. Dust lookup centralized in `src/wallet/utils.ts` (`getDustAmount(wallet)` reads `wallet.dustAmount` when present, else falls back to `FALLBACK_WALLET_DUST_AMOUNT = 330n`); used by both `ramps.ts` and `vtxo-manager.ts`. `DustChangeError` re-exported from the package root
- **ServiceWorkerWallet.restore()** *(0.4.28)*: `ServiceWorkerWallet.restore({ gapLimit })` mirror of `Wallet.restore` drives the gap scan inside the worker (the `scanContracts` materialize callback cannot cross postMessage so the whole scan runs worker-side; only `gapLimit` and the success/error envelope cross the wire). `RESTORE_WALLET` uses the streaming `sendMessageWithEvents` path and is marked **long-running** in `isLongRunningRequest()` alongside `SETTLE` / `RECOVER_VTXOS` / `RENEW_VTXOS` so the bus deadline never races a multi-minute indexer scan (PING still covers liveness). `AggregateError` isn't structured-clone-portable, so the worker explicitly serializes it (`SerializedAggregateError` wire envelope) and the page reconstructs via `deserializeAggregateError` so callers can inspect `.errors` (helpers + `isSerializedAggregateError` guard in `wallet-message-handler.ts`). Signing-only — `ServiceWorkerReadonlyWallet` does not expose `restore`
- HD identity with BIP39 mnemonic and BIP86 Taproot derivation; identities consume wildcard descriptor templates and expose them via `identity.descriptor`; `isHDCapableIdentity()` structural type guard for capability-based branching without coupling to a concrete identity class. The four descriptor-aware identity methods (`isOurs`, `signWithDescriptor`, `signMessageWithDescriptor`) are now `@deprecated` on the interface and on `SeedIdentity` / `ReadonlyDescriptorIdentity` — kept only as backing for descriptor providers
- DescriptorProvider allocator interface with `StaticDescriptorProvider` (single-key) and `HDDescriptorProvider` (HD receive rotation, persisted under `settings.hd`, cross-instance serialized via shared `updateWalletState` mutex; also implements opt-in `ReceiveRotatorFactory`; new `getCurrentSigningDescriptor()` re-derives at last-used index without advancing for stable boot replay)
- HD receive rotation via the contract repository (re-merged in #489 after the #488 revert): `WalletReceiveRotator` (`src/wallet/walletReceiveRotator.ts`) owns the `vtxo_received` subscription, rotation chain mutex, boot pubkey lookup, and contract registration on rotate. Tags the active display contract `metadata.source = 'wallet-receive'`; marks the prior display `inactive` on rotation so the watcher keeps it while `lastKnownVtxos.size > 0`. Baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) every boot — never re-registered at the rotated pubkey. Failed rotations gate retries behind exponential backoff (1s → 60s cap). Typed `NonRangeableDescriptorError` for the silent-fallback path; pluggable `Logger` interface (defaults to `console`)
- `WalletMode = 'auto' | 'static' | 'hd' | DescriptorProvider` on `WalletConfig` — `'auto'` (default) is **explicitly short-term identical to `'static'`** until HD soak time builds (`TODO(hd-maturation)` flip-back criteria recorded in `resolveDescriptorProvider`); `'hd'` requires an HD-capable identity with a rangeable descriptor (no silent fallback); object form forwards rotation through a custom provider. `ServiceWorkerWalletMode = 'auto' | 'static' | 'hd'` (string-only because the provider object can't cross postMessage)
- Per-input signing via `InputSignerRouter` (`src/wallet/inputSignerRouter.ts`) — `InputSigningJob[]` derived from each source VTXO's script; rotated `default`/`delegate` contracts with non-baseline owners route to `DescriptorProvider.signWithDescriptor` using `metadata.signingDescriptor` persisted at rotation time; everything else routes to `Identity`. Typed errors `DescriptorSigningProviderMissingError` / `MissingSigningDescriptorError` exported from the package root. `Wallet.offchainTapscript` now a getter over a `protected` backing field; the only sanctioned writer is `setOffchainTapscriptForRotation` (@internal, on the `RotatableWallet` surface). **Since #535**: `InputSignerRouter.classify(jobs)` extracted as the single source of truth for routing decisions (returns `InputRoutingPlan { identityIndexes; descriptorGroups }`); `sign()` consumes it. New variadic predicate `canBatch(...jobSets: InputSigningJob[][])` flattens its argument and classifies the union in **one pass** — returns `true` iff every signable input across all sets resolves to the baseline key (one repo round-trip + one `xOnlyPublicKey` call instead of N+1). Eligibility is monotonic — the union routes entirely to baseline iff every set does
- **BatchSignableIdentity one-popup path** *(restored in #535, originally #395)*: When `isBatchSignable(identity)` AND `InputSignerRouter.canBatch(arkTxJobs, ...checkpointJobs)` is `true`, `Wallet.buildAndSubmitOffchainTx` collapses the N+1 wallet popups (one arkTx + N checkpoints) into a single `identity.signMultiple(requests)` call. The optimization was silently lost when per-input routing moved into `InputSignerRouter` — `_signerRouter.sign` was called once per PSBT, never folding work across arkTx + checkpoints, so `signMultiple` was unreachable. **Send path**: user-signed arkTx + checkpoints are stashed; unsigned checkpoints submitted to arkd for its `tapScriptSig`; server + user sigs merged via `combineTapscriptSigs` on each checkpoint (now with explicit input-count and per-input `tapScriptSig` invariants — rejects mismatches with input-indexed errors instead of silently appending `undefined` and corrupting the witness). A symmetric length guard rejects a server response carrying the wrong checkpoint count, mirroring the `signMultiple` return-length check. **Recovery path** (`finalizePendingTxs` batch fallback): hands `signMultiple` checkpoints that already carry the server's `tapScriptSig` and consumes the returned transactions directly — the `BatchSignableIdentity` interface contract is tightened to require implementations to **preserve** any pre-existing partial signatures and only ADD their own (a provider that drops the server sig would strand the tx in pending), so no merge is needed there. Mixed sends (arkTx non-batchable or a checkpoint missing a descriptor) fail fast at the unified `canBatch` call before `setPendingTxFlag` rather than mid-signing. Requests are deep-cloned (`tx.clone()`) before handing them to `signMultiple` so a misbehaving provider cannot mutate the originals before `submitTx`. HD / mixed-owner sends keep the sequential `_signerRouter.sign` path
- **`waitForIncomingFunds`** one-shot helper now skips notifications carrying no incoming funds (`notifyIncomingFunds` also fires for purely outgoing activity — a `vtxo_spent` event carries `newVtxos: []` and an onchain tx that only spends from boarding yields empty `coins`; the prior code could resolve on the spent half of a self-send before the matching `vtxo_received` arrived, returning an empty result — fixes a flaky e2e). Also closes the subscription if the callback ran before the `notifyIncomingFunds` promise resolved, plugging a stop-handle leak
- `prepareUnrollTransaction` `Math.ceil`s the fee rate before `BigInt(...)` so fractional sat/vB from Esplora / bitcoind regtest no longer throws `RangeError`
- VTXO operations (send, receive, settle, renew, recover) — surgical cache reconciliation via `IContractManager.refreshOutpoints(outpoints)` (indexer-by-outpoint upserts at the contract's address, no cursor change, no full re-scan); `VtxoManager.revalidateBeforeSettle` pre-flights candidates before `renewVtxos` / `runPeriodicSettle`; reactive `maybeRefreshAfterVtxoSpent` parses `metadata.vtxo_outpoint` from the `ArkError` envelope; service-worker `REFRESH_OUTPOINTS` proxy
- **Per-call renewal threshold** *(0.4.30, closes #388)*: `IVtxoManager.renewVtxos(eventCallback?, options?)` accepts a `RenewVtxosOptions` payload whose `thresholdSeconds` overrides the renewal threshold for that call only (resolution `options.thresholdSeconds` → `SettlementConfig.vtxoThreshold` → 3-day default; bypasses the `settlementConfig === false` gate). Pre-validation rejects non-number / non-finite / non-positive overrides with `TypeError` before mutating state (the payload crosses the worker `MessageBus` so the type guard runs at runtime; a `0`/`<=100ms` threshold would silently revert to the 3-day default via `isVtxoExpiringSoon`). `ServiceWorkerWallet.renewVtxos` mirrors the new arg as `RequestRenewVtxos.payload`; `RenewVtxosOptions` exported from the package root
- **Per-contract tapscript memoization** *(0.4.31, refs #521)*: `extendVirtualCoinForContract(vtxo, contractOrMap?, cache?)` accepts an optional `ContractTapscriptCache = Map<string, ContractTapscripts>` so the taproot tree (`forfeitTapLeafScript` / `intentTapLeafScript` / `tapTree`, all derived from `contract.params`) is built **once per distinct contract per annotation batch** instead of once per VTXO — `handler.createScript(contract.params)` was the dominant cost in `getVtxos()` / `getBalance()` on long spent/swept histories. `ContractManager.getVtxosForContracts` instantiates a per-call cache before the annotation map. Cache hits return deep-cloned `Uint8Array`s (`cloneTapLeafScript` / `cloneContractTapscripts` rebuild `controlBlock.internalKey`, `merklePath[]`, leaf `script`, and `tapTree`) so PSBT-builders mutating one VTXO's scripts can't poison the cache; the no-cache branch short-circuits to the original allocation path. `ContractTapscripts` + `ContractTapscriptCache` are exposed from `src/wallet/utils.ts`
- **Boarding history de-duplication** *(0.4.31)*: `buildTransactionHistory` (`src/utils/transactionHistory.ts`) no longer emits two rows when a settled boarding deposit also produced a leaf VTXO. Settled boarding receives are snapshotted into `unmatchedSettledBoardingTxs` (sorted by `createdAt`) at the top of the build and consumed via `consumeBoardingReceive(predicate)` as matching leaves are processed: (a) when the leaf's commitment **is** in `commitmentsToIgnore` (or its `settledBy` is — gated by the new `(!vtxo.settledBy || !commitmentsToIgnore.has(vtxo.settledBy))` clause so swept boarding deposits take the dedup branch), consumes by `(commitmentTxid match OR settledBy match) AND createdAt ≤ vtxo.createdAt`; (b) when the leaf is **not** ignored and has no refresher, consumes by exact `amount` match (and createdAt window) and on hit suppresses the would-be batch-leaf row. `ReadonlyWallet.getBoardingTxHistory` now populates `key.commitmentTxid = utxo.virtualStatus.commitmentTxIds?.[0] ?? ""` (was always empty) so the (a) branch's commitment match has a non-empty key to compare against
- **Wallet Restore / Discovery** *(0.4.28, #492)*: explicit `Wallet.restore({ gapLimit })` gap-scan recovery rebuilds an HD wallet's contract set + VTXO cache from indexer history alone. HD wallets (`instanceof HDDescriptorProvider`) drive `ContractManager.scanContracts({ deps, hd: true, gapLimit })` which walks each `Discoverable` handler (`DefaultContractHandler` + `DelegateContractHandler`) probing descriptors via `HDDescriptorProvider.materializeDescriptorAt(i)` until `gapLimit` consecutive misses, capped at `SCAN_MAX_INDEX = 10_000` (hits the cap → throws). Each hit goes through a lighter `persistAndWatchContract` (skips per-contract indexer pulls — trailing `refreshVtxos({ includeInactive: true })` covers all scripts in one batched call). `HDDescriptorProvider.advanceLastIndexUsed(maxHitIndex)` monotonically fast-forwards the receive cursor. Concurrent `restore()` calls coalesce (later caller's `gapLimit` ignored — `_restoreInFlight` checked BEFORE validation so coalescer with invalid gapLimit doesn't throw); `dispose()` drains `_restoreInFlight` so torn-down managers can't be called. `WalletReceiveRotator.pickActiveReceive` deterministically tiebreaks on highest HD index when multiple `wallet-receive` rows exist post-scan. `WALLET_RECEIVE_SOURCE` declaration moved to dependency-free leaf `src/contracts/metadata.ts` to break the `contracts → wallet` cycle; `deriveDescriptorLeafPubKey` extracted to `identity/descriptor` for shared use. New public exports: `Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError`
- VTXO ownership gating (`src/contracts/vtxoOwnership.ts`) at every contract-scoped read/write site — background sync writers warn-and-skip on unowned scripts, user-initiated wallet write paths throw; `updateDbAfterOffchainTx` / `updateDbAfterSettle` group spent rows by owning script and route each bucket to its contract's address; `getVtxosFromRepo` fails fast on undecodable wallet addresses. **Tier 2 (0.4.25)**: `WalletRepository` exposes optional script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`, `VtxoRepositoryKey = { script; address? }`) implemented natively by all SDK backends (InMemory, IndexedDB, Realm, SQLite); `getVtxosForContract` / `saveVtxosForContract` dispatch helpers route there when present and fall back to Tier 1 address-bucket + filter for custom backends
- Batch settlement with MuSig2 tree signing
- Asset management (issue, reissue, burn, transfer) — `Asset.amount`, `AssetDetails.supply`, and `IssuanceParams` / `ReissuanceParams` / `BurnParams` `amount` are `bigint` since 0.4.23 (breaking, supplies exceed `Number.MAX_SAFE_INTEGER`); persistence layer round-trips bigint amounts as decimal strings via `serializeAssets` / `deserializeAssets` while accepting legacy `number` reads. **Since 0.4.29**: `AssetManager` / `ReadonlyAssetManager` (plus the `IAssetManager` / `IReadonlyAssetManager` types) are exported from the package root — directly constructable/typeable, not only via `Wallet.assetManager`
- Anchor / sequence helpers re-exported from package root: `TxWeightEstimator`, `VSize`, `timelockToSequence`, `sequenceToTimelock` (added 0.4.23)
- VTXO delegation to third-party delegate services. **Delegator → Delegate rename** *(0.4.29, #519)*: the public delegation surface was renamed `delegator` → `delegate` with the old names kept as `@deprecated` aliases (no runtime break). Canonical exports from the package root: `DelegateProvider`, `RestDelegateProvider`, `DelegateManagerImpl`, `IDelegateManager`, `DelegateNotConfiguredError` (prior `Delegator*` names remain as aliases). `IWallet.getDelegateManager()` and `BaseWalletConfig.delegateProvider` replace `getDelegatorManager()` / `delegatorProvider` (both deprecated aliases). Source files `src/providers/delegator.ts` → `delegate.ts` and `src/wallet/delegator.ts` → `delegate.ts`. The service worker still sends both `delegateUrl` and `delegatorUrl` for pre-#519 worker compat. `DelegateInfo.delegatorAddress` is now optional alongside the new canonical `delegateAddress`; the `isDelegateInfo` guard accepts a payload when either field is a non-empty string (validating each only when present — keeps Fulmine's `delegatorAddress`-only responses valid, forward-compatible with the server switching to `delegateAddress`), and `RestDelegateProvider.getDelegateInfo` normalizes `delegateAddress` by explicit string type check (not truthiness)
- Onboarding/offboarding (on-chain to off-chain conversion)
- Unilateral exit (unroll + timelock) — `prepareUnrollTransaction` (build + sign) split from `completeUnroll` (broadcast); `completeUnroll` passes `wallet.network` to `tx.addOutputAddress` so regtest `bcrt1...` outputs no longer fail base58 decode; per-namespace `isScriptValid` helpers returning `true | Error`; `VtxoScript.exitPaths` correctly compares `=== true`
- Service worker wallet for background operation
- 5 storage adapters (InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage)
- Onchain providers: `EsploraProvider` (HTTP) and `ElectrumOnchainProvider` (WebSocket Electrum, supports atomic 1P1C TRUC relay via `broadcast_package` on Fulcrum, electrs-compatible fallbacks)
- Default onchain endpoint maps: `ESPLORA_URL`, `ELECTRUM_WS_URL`, `ELECTRUM_TCP_HOST` (Ark Labs–operated mempool/Fulcrum 2.1 deployments for bitcoin/signet/mutinynet)
- Expo/React Native support with SSE-compatible providers
- ArkNote serializable payment format
- **Build (tsup)** *(post-0.4.27, #496)*: Single-step `pnpm build` via `tsup` ^8.5.0 replaces the prior `tsc + post-processors` chain (6 `tsc` invocations + `add-extensions` / `generate-package-files` / `build-browser` scripts; `tsconfig.{cjs,esm,expo}.json` deleted). Dual ESM + CJS, per-entry `.d.ts` (ESM types) + `.d.cts` (CJS types) + source maps; `splitting: true` + `treeshake: true` keep `contractHandlers` a single runtime instance across entries. Dist layout flattened (`dist/<entry>.{js,cjs,d.ts,d.cts}` — was `dist/{esm,cjs,types}/`); `package.json` `main` / `module` / `types` / `exports` updated, each `exports` subpath gets separate `import` / `require` conditions with matching `.d.ts` / `.d.cts`. Target bumped `es2020 → es2022`. New `pnpm typecheck` (`tsc --noEmit`, `moduleResolution: bundler`) gates CI before build. New `scripts/smoke-dist.mjs` (also runs in CI after build, plus `npm pack --dry-run --ignore-scripts`) asserts every `exports` target exists, every relative import in `dist/**/*.d.{ts,cts}` resolves, ESM + CJS `contractHandlers` singleton identity holds with registered types `{boarding, default, delegate, vhtlc}` (post-0.4.32 — boarding added; smoke-dist `expectedTypes` updated accordingly), each Node-safe public subpath resolves through a symlinked consumer, and `wallet/expo/background` stays structural-only. `src/index.ts` bypasses the `contracts/` and `repositories/` barrels to suppress Rollup chunk-circularity warnings in tsup's dts emit; bare side-effect `import "./contracts/handlers"` survives tree-shaking via expanded `sideEffects` (src + dist, ESM + CJS). `src/wallet/expo/expo-modules.d.ts` extended to cover `expo-sqlite` alongside `expo-task-manager` / `expo-background-task` (boltz-swap ambient-`.d.ts` pattern) so build is unconditional (no more `build:expo:check`); the prior `tsconfig` exclude of `src/repositories/indexedDB/websqlAdapter.ts` is consequently dropped. Dropped devDeps: `esbuild`, `glob`, `rimraf` (tsup brings them); added devDep `tsup`. **No public TypeScript API changes** — only consumers reaching into the old `dist/{esm,cjs,types}/` paths directly (bypassing `exports`) need to update. This shipped in the `0.4.28` release; current published version is `0.4.32`
- **Boarding contract type** *(post-0.4.32)*: `boarding` is now a first-class registered contract type with its own handler (`src/contracts/handlers/boarding.ts`, `BoardingContractHandler` + `BoardingContractParams = DefaultContractParams` exported from the package root, registered alongside `default`/`delegate`/`vhtlc`). The handler delegates all operations to `DefaultContractHandler` (same `DefaultVtxo.Script` shape); boarding semantics come from the type and from sourcing `csvTimelock` from the server's `ArkInfo.boardingExitDelay` (the offchain `default` contract uses `ArkInfo.unilateralExitDelay`). Deliberately does NOT implement `Discoverable.discoverAt` (`isDiscoverable(BoardingContractHandler) === false`) — HD branch/index selection is owned by the wallet/address-provider layer. Wallet setup sources `boardingTapscript` from `BoardingContractHandler.createScript(...)` (byte-identical script for equivalent params; `getBoardingAddress()` / `pkScript` unchanged) and contract-manager initialization persists a matching `active` boarding row via the new `ensureWalletContract` helper so `ContractWatcher` monitors the boarding script. **Collision model — "default wins"**: a contract's `script` is its unique identity, so `boarding` keeps its own row when distinct from `default` (the real-world case — sound servers keep `boardingExitDelay` strictly longer than `unilateralExitDelay`). When the delays coincide (misconfigured/malicious server) the boarding script is byte-identical to the default script and the wallet coalesces onto `default` via `ensureWalletContract(manager, params)` — `areSameScriptBaselineTypesCompatible` recognizes `default ↔ boarding` as compatible (every other cross-type pairing throws); requested `default` + existing `boarding` → promote to `default`, requested `boarding` + existing `default` → accept as-is. The default-wins rule keeps the shared script visible to type-gated consumers (`notifyIncomingFunds`, `getWalletScripts`, `getScriptMap`). Consumers MUST NOT rely on `contract.type === "boarding"` to identify the boarding purpose — resolve via `wallet.getBoardingAddress()` / `wallet.boardingTapscript` and match by script. `ensureWalletContract` + `areSameScriptBaselineTypesCompatible` are `@internal` exports for tests only
- **Required csvTimelock at script construction** *(post-0.4.32)*: `DefaultVtxo.Script.Options.csvTimelock` is now required (no longer `?`) and the constructor's `?? Script.DEFAULT_TIMELOCK` fallback is removed; `DelegateVtxo.Script` changes identically. **Breaking only for direct `new DefaultVtxo.Script({...})` / `new DelegateVtxo.Script({...})` callers** — the wallet API surface (`Wallet.create` / `ReadonlyWallet.create` / `ExpoWallet.setup`) is unchanged. Wallet wiring sites that previously fell back via `?? DefaultVtxo.Script.DEFAULT_TIMELOCK` now read `options.csvTimelock` directly (`ReadonlyWallet.walletContractTimelocks`, `ExpoWallet.setup` background-config persistence, `WalletReceiveRotator` baseline tagging). `DelegateContractHandler.deserializeParams` drops its `DEFAULT_TIMELOCK` fallback (delegate persistence always carries the param). `DefaultContractHandler.deserializeParams` **restores** a one-sided `DEFAULT_TIMELOCK` fallback for legacy/minimal persisted params (hex pubkeys with no `csvTimelock` field) via an explicit `params.csvTimelock !== undefined && params.csvTimelock !== ""` test — with the script-side fallback gone, feeding `Number(undefined)` to `sequenceToTimelock` would silently decode to a zero timelock. Rationale: forcing callers to be explicit at construction catches configuration drift, while the deserializer stays permissive so legacy persisted rows still hydrate
- **Indexer spent-state classification fix** *(post-0.4.32)*: `convertVtxo` in `RestIndexerProvider` (`src/providers/indexer.ts`) now checks `isSpent` first in the `virtualStatus.state` ternary — `isSpent ? "spent" : isSwept ? "swept" : isPreconfirmed ? "preconfirmed" : "settled"`. The prior shape never returned `"spent"`, so spent VTXOs were misreported as `"settled"`. Correctness fix only — `"spent"` was already a valid `VirtualCoinStatus.state` value and consumers already had to handle it
- **Custom ContractHandler authoring helpers exported** *(0.4.33)*: `isCsvSpendable(context, sequence?)` and `isCltvSatisfied(context, locktime)` — the BIP-68 / BIP-65 timelock-maturity primitives the built-in handlers (`DefaultContractHandler` / `DelegateContractHandler` / `VHTLCContractHandler`) already use to implement `selectPath` / `getSpendablePaths` — are now exported from the package root (sourced from `src/contracts/handlers/helpers.ts`). Authors of custom `ContractHandler` implementations can reuse the canonical maturity logic instead of reimplementing it. `isCsvSpendable` returns `true` for an `undefined` sequence; `isCltvSatisfied` follows the BIP-65 convention (`locktime < 500_000_000n` → compares `context.blockHeight`; `>= 500_000_000n` → compares `Math.floor(context.currentTime / 1000)`; `false` when the relevant context field is missing). Pure additions — no signatures changed elsewhere. Released as `@arkade-os/sdk@0.4.33` + `@arkade-os/boltz-swap@0.3.38`
- **Regtest migration off nigiri** *(post-0.4.33, no version bump)*: SDK regtest stack moved off `nigiri`/`chopsticks`/`esplora` to the in-house **arkade-regtest** Docker Compose stack driven by the zero-dependency Node CLI `regtest/regtest.mjs` (`start` / `stop` / `clean` / `faucet <addr> [sats] --confirm` / `mine <n>`). `scripts/regtest.sh <pkg> <action>` and per-package npm scripts now wrap `node regtest/regtest.mjs ...`. Esplora regtest URL gained the `/api` suffix (`http://localhost:3000` → `http://localhost:3000/api`); in-network explorer moved `http://chopsticks:3000` → `http://mempool_web/api`; `BITCOIN_LOW_FEE` removed from every `.env.regtest` (baked into compose base); per-package `ARKD_IMAGE` override was first bumped to `v0.9.6` then dropped entirely so each package inherits the arkade-regtest blessed default (`v0.9.4`/`v0.9.5` were red against Bitcoin Core 31). bitcoin-cli helpers now pass `-rpcuser=admin1 -rpcpassword=123` (btcpay-image Bitcoin Core uses RPC credentials, not the cookie nigiri used). The regtest controller symlinks the repo-root `regtest/` submodule into each package dir on each run (git-ignored) so per-package e2e suites resolve `regtest/regtest.mjs` from their cwd. CI drops Go setup + nigiri cache/PATH, checks out submodules with `recursive`, integration checkout uses `persist-credentials: false`. The submodule is fast-forwarded to the new arkade-regtest base (nbxplorer healthcheck + arkd-wallet ordering, bitcoind whitelist/forcerelay, `round.min-participants=1`). README/AGENTS describe the Node CLI stack and the `/api` esplora endpoint
- **Esplora mempool-compat fixes** *(post-0.4.33, rides along with the regtest migration)*: `EsploraProvider.getChainTip()` uses the standard `/blocks` route instead of `/blocks/tip` — mempool returns `[]` for `/blocks/tip` (not in the Esplora spec; electrs aliased it), which surfaced as `No chain tip found` and cascaded into unroll / settle / sweep / delegate / vhtlc e2e suites. `EsploraProvider.getFeeRate()` returns `undefined` on a 404 from `/fee-estimates` rather than throwing — mempool returns 404 for that route on regtest (exposes fees via `/api/v1/fees/recommended` instead); every caller already falls back to `MIN_FEE_RATE` on undefined, so the prior throw broke the unroll / unilateral vHTLC claim / boarding-sweep paths even though those fallbacks were already wired. 5xx failures still surface. Boltz-swap's `arkade-swaps` e2e "exact amount to btc address" assertion is reworked to be fee-aware (`boltz/boltz:latest` doesn't gross the 1 sat/vB claim fee into the receiver lock-up the way nigiri's pinned Boltz did)
- **BIP21 amount validation** *(post-0.4.33)*: `BIP21.parse()` and `BIP21.create()` apply a consistent amount-validation rule aligned with `NArk`'s parser. `create()` rejects amounts that fail `Number.isSafeInteger(Math.trunc(value))` (silently omits the `amount` param rather than emitting an out-of-range integer). `parse()` validates the raw query-string value against the BIP21 ABNF (`*digit [ "." *digit ]`) via `/^(?:\d+\.?\d*|\.\d+)$/`, so `".5"` decodes to `0.5` and `"5."` decodes to `5`; the unreachable negative check is dropped (the regex excludes the sign). Pure validation tightening — no public signature changes. `examples/node/multiple-wallets.ts` switched `execSync` → `execFileSync` (no shell, defensive review nit); `examples/contract-manager.ts` updated its stale container name from `docker exec -t ark` to `docker exec -t arkd` to match the new compose stack
- **btcd-compatible Taproot script tree** *(0.4.34, ships in `@arkade-os/sdk@0.4.34` + `@arkade-os/boltz-swap@0.3.39`)*: `VtxoScript` assembles its tapscript tree with btcd's `txscript.AssembleTaprootScriptTree` algorithm — Phase 1 pairs leaves left-to-right with an odd trailing leaf merged into the LAST branch (NOT a fresh leaf pair); Phase 2 FIFO-merges branches until one remains — rather than `@scure/btc-signer`'s `taprootListToTree` Huffman builder. The two algorithms agreed only for power-of-2 leaf counts; for every other count they produced different merkle roots → different taproot output keys → arkd rejected spends with `INVALID_PSBT_INPUT`. New module `src/script/taprootTree.ts` exports `assembleBtcdTaprootTree(scripts)` + `TaprootLeaf` + `TaprootTreeNode` (all re-exported from the package root so consumers building taptrees by hand match arkd). The prior odd-count `scripts.reverse()` workaround in `VtxoScript` is removed. Tested against btcd-derived golden taproot keys for leaf counts 3, 5, 9, 10, 11, 13, 15, 17 in `test/fixtures/vtxoscript.json`
- **Capped settlement / renewal / recovery batches** *(0.4.34)*: `MAX_VTXOS_PER_SETTLEMENT = 50` (exported from `src/wallet/vtxo-manager.ts`) caps the VTXO-count payload of a single settlement to fit under arkd's intent tx-weight budget (`TX_TOO_LARGE`); boarding inputs are added uncapped. Sorting runs **before** the cap so the deferred overflow does not starve viable VTXOs: **recovery / manual settle** sorts by value descending (`byValueDescending`) — capped subset has the best chance of clearing dust; **renewal / periodic settle** sorts by expiry ascending (`byExpiryAscending`) — soonest-expiring VTXOs always make the cut so none miss their renewal window. Already-recoverable/expired VTXOs sort first under the expiry order; VTXOs with no batch expiry or a block-height-looking expiry value sort last. `runPeriodicSettle` short-circuits once the filtered set reaches the cap. **Differentiated recovery error**: `recoverVtxos` distinguishes a genuinely empty wallet from a funded wallet whose highest-value sub-cap batch can't clear dust — the latter reports the cap, the recoverable count, and the dust threshold so operators can tell stuck-but-funded from empty (PR #549 review). **Post-0.4.34**: batches are additionally capped by the server's per-output ceiling `ArkInfo.vtxoMaxAmount` (`-1` = no limit; server rejects over-limit outputs with `AMOUNT_TOO_HIGH`) — new exported `capSettlementBatch(sorted, maxAmount)` applies count + amount caps to a pre-sorted list (amount-breaching inputs are skipped, not stopping points; bounds gross value — conservative, fee-blind), the fee-aware periodic/manual settle paths cap on net contribution, `renewVtxos` warns on individually-oversized VTXOs (unrenewable — risk unilateral exit) and throws a distinct error when no batch fits, and `Wallet.settle` counts boarding inputs against the ceiling via the running total comparing the projected post-output-fee amount. New private `VtxoManager.getInfoProvider()` reads the optional `arkProvider` for the lookup without requiring sweep capability
- **Restore: deprecated-signer scan + parallel/batched probes** *(0.4.34)*: gap-limit discovery is harder and faster. **Deprecated-signer scanning**: `DiscoveryDeps.deprecatedSignerPubKeys?: Uint8Array[]` carries the server's deprecated signer keys (from a fresh `getInfo` snapshot at restore time); `DefaultContractHandler.discoverAt` / `DelegateContractHandler.discoverAt` probe the current `serverPubKey` first then each deprecated signer, deduping candidates by script. The matched signer is threaded through the script, the persisted contract params, and the encoded address so signing/forfeit on a recovered VTXO resolves the right key. Boarding discovery stays current-key only. **Parallel per-index probes**: discoverable handlers run concurrently per index and persist hits in declared order to keep the first-wins boarding/default tie-break. **Batched candidate queries**: `default`/`delegate` collapsed their per-variant `getVtxos` loop into one batched `detectUsedScripts` probe in `src/contracts/handlers/helpers.ts` paging until every candidate is seen. **Gap-limit-capped batch windows**: `scanContracts({ ..., batchSize? })` accepts an outer-loop window (`DEFAULT_SCAN_BATCH = 10`), probing `batchSize` HD indices at a time on top of the per-index concurrency; each window is capped to `gapLimit - unused` so every probed index is one a serial scan would reach (discovered set byte-identical to the prior scan, only faster — an empty wallet closes its gap window in `ceil(gapLimit/batch)` rounds). New leaf module `src/contracts/constants.ts` hosts `DEFAULT_PAGE_SIZE = 500`, shared by `ContractManager`'s bulk history sync and the handler-layer `detectUsedScripts` so the two can't drift (its own no-import module to avoid a `handlers → contractManager` cycle)
- **Settle rotation race fix** *(post-0.4.34)*: `Wallet.settle` resolves the receive address **once** (`offchainAddress` / `offchainPkScript` / `offchainOutputScript`) and reuses it for the no-params output, output-fee estimation, and the asset-routing destination matched by `findDestinationOutputIndex` — `WalletReceiveRotator.rotate` mutates `offchainTapscript` without acquiring `_txLock`, so re-calling `getAddress()` mid-settle could observe a rotated script and fail with a spurious "no output matches"
- **X-Build-Version / X-SDK-VERSION HTTP headers** *(post-0.4.34; arkd-only scope since 0.4.35)*: `src/utils/fetch.ts` exports `buildVersion` (`"0.9.9"`) plus — since 0.4.35 — `sdkVersion` (`` `ts-sdk/${version}` ``, sourced from `package.json`). Two wrappers: `baseFetch` is a guarded passthrough with NO Arkade headers, and `fetch` is the **arkd-only** wrapper setting both `X-Build-Version` and `X-SDK-VERSION`. Only `RestArkProvider` + `getExpoFetch` use the header-setting `fetch`; `RestIndexerProvider` / `RestDelegateProvider` / `EsploraProvider` switched to `baseFetch` (Esplora/indexer/delegate origins reject unknown custom headers in CORS preflight). Lets the operator (Arkana) correlate requests with the client build and distinguish client versions. **Since #569 (`29635dd0`)** both `buildVersion` and `sdkVersion` are re-exported from the package root for programmatic access
- **Server-signer rotation / deprecated-signer migration** *(0.4.35, #554)*: first-iteration client support for *planned* arkd server-signer rotation. New `src/wallet/signerRotation.ts` exports `SignerStatus` (`CURRENT | MIGRATABLE | DUE_NOW | EXPIRED | UNKNOWN_SIGNER`), `SignerClassification` / `SignerSet`, and pure helpers `classifyContractSigner` / `classifyAgainstSignerSet` / `signerSetFromInfo` / `isCooperativelyMigratable` / `toXOnlySignerHex` (all re-exported from the package root). `ArkInfo` gains `deprecatedSigners: DeprecatedSigner[]` + `digest`; `ArkProvider.onServerInfoChanged(cb)` event stream + new `DigestMismatchError` drive an event-driven rotation trigger. `Wallet.rotateServerSigner(newServerPubKey, checkpointTapscript)` swaps the active signer mid-session; `VtxoManager.migrateDeprecatedSignerVtxos(options?)` runs a fee-exempt two-leg migration; `getDeprecatedSignerStatus()` returns per-signer reports. `EXPIRED` is recover-on-sweep, not unilateral-exit-required. Service-worker parity + Boltz VHTLC reconstruction across deprecated signers; many report/option types exported from the package root
- **0.4.36 release** *(`89de6561`)*: release-only patch bump (`@arkade-os/sdk` 0.4.35 → 0.4.36) cut alongside `@arkade-os/boltz-swap` 0.3.40 → 0.3.41 — **no `packages/ts-sdk/src/` changes**. The substantive work in this cut is in the sibling boltz-swap package (optimistic `waitFor: 'funded'` Lightning resolution, `waitForSwapFunded`, preimage backfill in `refreshSwapsStatus`); see `docs/projects/boltz-swap/`
- **`MissingSigningDescriptorError` message improvement** *(`69abdf56`, ships in 0.4.37)*: the thrown message now enumerates **both** causes of a non-routable descriptor-capable contract — the wallet was rotated on an earlier build that did not persist signing descriptors, *or* the contract belongs to a different identity (storage reuse) — instead of only the rotation case. Remediation guidance broadened: manually set `metadata.signingDescriptor`, restore a pre-rotation snapshot, **or delete the contract**. The `signingErrors.ts` docstring is reframed around "descriptor-capable contract that cannot be routed to any signer" and `inputSignerRouter.ts` comments clarify the `default`/`delegate`/`boarding` scope and the persisted-`params.pubKey` canonicalization. No public signatures changed — message/comment only
- **0.4.37 release** *(`89c8d411`)*: patch bump (`@arkade-os/sdk` 0.4.36 → 0.4.37, `@arkade-os/boltz-swap` 0.3.41 → 0.3.42) cutting the `MissingSigningDescriptorError` message fix above; no other `packages/ts-sdk/src/` changes
- **0.4.38 release** *(`273dbe9f`)*: patch bump (`@arkade-os/sdk` 0.4.37 → 0.4.38, `@arkade-os/boltz-swap` 0.3.42 → 0.3.43). **No substantive `packages/ts-sdk/src/` change** — only `src/utils/fetch.ts` had its `sdkVersion` docstring trimmed to a one-liner (no behaviour change). The substantive work in this cut is all in the sibling boltz-swap package: a new root `sdkVersion` export (`` `boltz-swap/${version}` ``) so swap consumers report the plugin build distinctly (`5f87cd8f`), and a refactor of the VHTLC refund path to **refund live VTXOs offchain past CLTV instead of always joining a batch** (`07051d04`) — once a VHTLC's CLTV refund locktime elapses, the `refundWithoutReceiver` leaf (sender + server, no Boltz) is spendable, so a live (non-recoverable) VTXO settles it via an offchain Ark tx while a swept (recoverable) VTXO still falls back to `joinBatch`; applied symmetrically in `refundVHTLC`/`refundArk` and their Boltz-rejection fallbacks, backed by a new `refundWithoutReceiverVHTLCwithOffchainTx` helper in `boltz-swap/src/utils/vhtlc.ts` (mirrors `claimVHTLCwithOffchainTx`). See `docs/projects/boltz-swap/`
- **0.4.39 release** *(`6c64a055`)*: release-only patch bump (`@arkade-os/sdk` 0.4.38 → 0.4.39, `@arkade-os/boltz-swap` 0.3.43 → 0.3.44) — no `packages/ts-sdk/src/` changes
- **Test-lint fix** *(`cb77d23f`, PR #577)*: internal-only — lint-cleans four boltz-swap test files (`packages/boltz-swap/test/`: `arkade-swaps.test.ts`, `e2e/arkade-swaps.test.ts`, `realm-swap-repository.test.ts`, `swap-manager.test.ts`). No `src/` change, no public-API change, no version bump
- **`Estimator.eval()` → `Estimator.evaluate()`** *(`0b00d834`, PR #581, BREAKING, released in 0.4.40)*: the `arkfee` `Estimator` aggregate method is renamed `eval` → `evaluate`. MetaMask Snaps bundle the SDK through SES, whose static "direct eval" detector rejects any bare `eval(` token, so the old name made the whole bundle unusable inside a snap (arkade-os/ts-sdk#580). The per-input helpers (`evalOffchainInput` / `evalOnchainInput` / `evalOffchainOutput` / `evalOnchainOutput`) are unaffected — SES flags only the exact `eval` identifier. **BREAKING CHANGE**: callers of `Estimator.eval()` must switch to `Estimator.evaluate()`
- **Service-worker stale-identity init guard** *(`c9a7e753`, PR #571, released in 0.4.40)*: hardens `ServiceWorkerWallet` against a queued/concurrent init rebinding the message bus to the wrong identity. `create()` / `reinitialize()` run a new `assertWorkerIdentityMatches()` (`GET_STATUS` round-trip asserting the worker reports the expected x-only pubkey) before returning a usable wallet. New `MessageBusInitializingError` / `MESSAGE_BUS_INITIALIZING` (both re-exported from the package root) signal an in-flight init — a superset of `MESSAGE_BUS_NOT_INITIALIZED` so existing consumers still classify it as "not initialized"; callers WAIT on a bounded backoff (~100ms→2s cap, `MAX_INIT_WAITS = 8`) instead of forcing a redundant re-init (`sendMessageWithEvents` folded into `sendMessageWithRetry(request, withEvents?)`). Worker-side (`src/worker/messageBus.ts`): `INITIALIZE_MESSAGE_BUS` serialized on a FIFO chain so concurrent inits can't interleave; ordinary wallet messages rejected while an init is pending; `doInit()` cancels any pending tick / skips `runTick()` during re-init so a stale timer can't tick stopped or mid-rebuild handlers. Same PR also fixes Electrum `get_merkle` classification: new `normalizedErrorText(err)` strips whitespace before matching (`ws-electrumx-client`'s frame parser drops spaces inside server error messages, so `isMissingHeightError` / `isTxNotInBlockError` missed the mangled wording and `getTxStatus` threw on the index-lag race; needles are now whitespace-free `notyetinablock` / `notinablock` / `notinblock` / `noconfirmedtransaction`)
- **BIP-322 `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` on intent proofs** *(PR #578, released in 0.4.40)*: `Intent.craft` (`src/intent/index.ts`) threads the canonical proof `message` into `craftToSignTx(toSpend, inputs, outputs, message)` and writes it into the BIP-322 v2 global PSBT field `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` (`0x09`) on the to_sign tx, so a co-signer/verifier can recompute the `toSpend` commitment from PSBT-internal data alone. `@scure/btc-signer` exposes no public global-field setter, so the entry is appended directly to `tx.global.unknown` (`{ type: 0x09, key: <empty> }` → UTF-8 message bytes); `0x09` is unused in the global keymap so it round-trips as an unknown field preserved by `toPSBT()`/`fromPSBT()`. Additive — proof tx body otherwise unchanged
- **Phantom-receive fix for boarding sweeps lacking an `/outspends` spender txid** *(PR #587, released in 0.4.40)*: some Esplora deployments (e.g. `mempool.arkade.sh`) return `/tx/:txid/outspends` as `{ spent: true }` **without** the spender `txid`, so `ReadonlyWallet.getBoardingTxHistory` couldn't correlate a swept boarding output with its commitment tx and double-counted the resulting VTXO as a phantom receive. Fix spans `src/providers/onchain.ts` + `src/wallet/wallet.ts`: `OnchainProvider.getTxOutspends` return type relaxed to `{ spent; txid? }[]`, `ExplorerTransaction` gains an optional `vin?: { txid; vout }[]` (validated only when present — the electrum provider omits it), and the boarding scan builds a `commitmentByOutpoint` map from the address history's `vin` and resolves each output's commitment as `spentStatus?.txid || commitmentByOutpoint.get(\`${tx.txid}:${i}\`)` (`||` not `??` so the electrum `txid: ""` unspent sentinel falls through), so the boarding-dedup branch (`commitmentsToIgnore`) fires even when `/outspends` omits the spender
- **Sibling boltz-swap: `descriptionHash` on reverse swaps** *(`e96dbe63`, PR #576, released in 0.4.40)*: the vendored `packages/boltz-swap/` package adds optional `descriptionHash` to `createLightningInvoice` / `createReverseSwap` (`CreateLightningInvoiceRequest.descriptionHash?: string`) so callers can commit `SHA256(...)` into the reverse-swap BOLT11 invoice instead of a plaintext description — needed for NIP-57 zaps (the invoice must commit to `SHA256(zap request)` so the 9735 receipt verifies). BOLT11 carries a description OR a hash, never both, so the plaintext description (incl. the default) is dropped when `descriptionHash` is set; gated on `!== undefined` (not truthiness) and validated as 64-char hex so a present-but-invalid hash is forwarded + rejected rather than silently falling back. `DecodedInvoice` gains `descriptionHash` (BOLT11 `h`, hex; `""` if none), surfaced by `decodeInvoice` via a locally-widened lookup. No change to preimage/HTLC/claim/settlement. Substantive change is in the sibling package — see `docs/projects/boltz-swap/`
- **0.4.40 release** *(`d98f44c5`)*: release-only patch bump (`@arkade-os/sdk` 0.4.39 → 0.4.40, `@arkade-os/boltz-swap` 0.3.44 → 0.3.45) — no `packages/ts-sdk/src/` changes in the release commit itself. This cut **publishes the five previously-unreleased changes above**: the `Estimator.eval()` → `evaluate()` BREAKING rename (#581), the service-worker stale-identity init guard + Electrum `get_merkle` whitespace fix (#571), the BIP-322 `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` intent-proof field (#578), the phantom-receive boarding-sweep fix (#587), and the sibling boltz-swap `descriptionHash`-on-reverse-swaps feature (#576, in 0.3.45)
- **Activity history API** *(0.4.41, `8741a646` and precursors)*: new `IReadonlyWallet.getActivityHistory(): Promise<Activity[]>` groups the flat transaction history into labelled logical activities via a pluggable resolver registry. Pure engine `buildActivities(txs, resolvers)` (`src/wallet/activity.ts`) runs each resolver's optional async `prepare()` (isolated — a rejecting `prepare()` or throwing `resolve()` contributes no memberships), buckets txs by `groupId` (untagged rows fall back to the natural tx key `arkTxid → commitmentTxid → boardingTxid` so send/change pairs stay together; a tx can join multiple groups for Ark batching; same-group memberships across resolvers merge with `label`/`kind` first-writer-wins and `metadata` shallow-merged), and computes a signed net `amount` (positive received, negative sent) with same-key change rows excluded; empty-`groupId` or non-finite-`amount` memberships are dropped. Package-root exports: `ActivityRegistry` (`use`/`remove`/`list`/`all`, keyed by namespaced resolver `id`), `boardingResolver` (built-in — labels boarding deposits `boarding:<txid>` → "Deposit"), `createDefaultActivityRegistry` (pre-registers the boarding built-in), and types `Activity` / `ActivityIntent` / `GroupMembership` / `ActivityResolver`. Every wallet exposes a pre-registered `readonly activity: ActivityRegistry` (`ReadonlyWallet`/`Wallet`, `ServiceWorkerReadonlyWallet`, `ExpoWallet`); the Expo swap background shim stubs `activity` + `getActivityHistory` as `notImplemented`. README gained an "Activity history" section
- **`getNetwork()` fails closed + root export** *(0.4.41)*: `getNetwork(name)` (`src/networks.ts`) throws `Unsupported network: <name>` on an unknown key instead of returning `undefined` — an `undefined` network silently fell through to mainnet params (e.g. via `Address()`'s default) during address validation, a scam vector. Now re-exported from the package root; the sibling boltz-swap package replaced its hardcoded `REGTEST_NETWORK` / `MUTINYNET_NETWORK` constants and `network === "bitcoin" ? …` HRP branches with `getNetwork(info.network as NetworkName)` throughout (`arkade-swaps.ts`, `expo/background.ts`, `utils/scripts.ts`)
- **Delegate-info init no longer fatal** *(0.4.41)*: `ReadonlyWallet` init now `.catch(() => undefined)` on both the `delegateProvider` and `delegatorProvider` `getDelegateInfo()` calls, so a delegate/delegator server that is unreachable or errors at wallet-create time no longer aborts wallet construction — the wallet builds without a delegate pubkey
- **Sibling boltz-swap: chain-swap BTC HTLC verification** *(boltz-swap 0.3.46, #591)*: `ArkadeSwaps` now verifies the BTC-side Taproot HTLC of a chain swap before committing funds (`verifyBtcChainHtlc`). The BTC lockup address must bind to `MuSig2(boltz, user)` (boltz first, unsorted — matches `claimBtc` / NArk `ComputeAggregateKey`) tweaked over Boltz's swap tree, and the leaves must match the canonical Boltz shape (new `assertChainHtlcLeaves` in `utils/boltz-swap-tx.ts`): tapscript-v1 only, claim `OP_SIZE 32 OP_EQUALVERIFY OP_HASH160 <ripemd160(preimageHash)> OP_EQUALVERIFY <claimKey> OP_CHECKSIG`, refund `<refundKey> OP_CHECKSIGVERIFY <timeout> OP_CHECKLOCKTIMEVERIFY` with a minimally-encoded ≤5-byte CLTV ScriptNum matching the agreed refund height. Any deviation throws a `SwapError`. `p2trScript` / `toXOnly` now exported from `boltz-swap-tx.ts`. See `docs/projects/boltz-swap/`
- **Wallet local-data wipe (`clear()`)** *(0.4.41; earlier tracked as post-0.4.40 unreleased; `e88ea0a9`…`ea265d0e`)*: new `IReadonlyWallet.clear(): Promise<void>` wipes all locally persisted wallet data (VTXOs, UTXOs, history, sync cursor, contracts) so a wallet's storage resets without recreating the app database (build a fresh instance afterward). `ReadonlyWallet.clear()` `dispose()`s first — stopping the `ContractWatcher` + polling intervals so the poller can't hit a closing IndexedDB connection — then `Promise.all([walletRepository.clear(), contractRepository.clear()])` in a `finally` (dispose failure still wipes). The prior page-side/service-worker split is removed: `ServiceWorkerReadonlyWallet.clear()` only posts `CLEAR` and lets the worker wipe both repositories; `WalletMessageHandler`'s `CLEAR` handler tears down its subscriptions then delegates to `(wallet ?? readonlyWallet).clear()`, resetting handler state only on success; `ExpoWallet.clear()` drains the in-flight foreground poll via `foregroundPollChain` + a `cleared` guard, wipes, and removes queued `CONTRACT_POLL_TASK_TYPE` tasks (OS background task + persisted queue config left intact). Landed as `clearLocalData()` then folded into `clear()` before merge (`8703a3dc`)
- **IndexedDB deletion unblock (`onversionchange`)** *(0.4.41; `b8357c20`)*: `repositories/indexedDB/manager.ts` `openDatabase` registers `db.onversionchange` on each connection to `close()` it and evict it from `dbCache` / `refCounts`, so an external `indexedDB.deleteDatabase()` (or a version upgrade in another tab) isn't blocked by a still-open SDK connection — the enabler for the `clear()` teardown path
- **Unsignable boarding input fast-fail** *(0.4.41; `7126e75e`)*: `Wallet.settle` asserts each boarding input carries a `tapScriptSig` after signing and throws `unsignableBoardingInputError(input, script)` when the `InputSignerRouter` silently skipped it (e.g. a rotated boarding address with a missing contract row), rather than forwarding a silently-unsigned input that arkd rejects as "not a wallet script". The guarded diagnostic names the outpoint, unresolved script hex + decoded address, and the recognized boarding addresses
- **Repo AGENTS.md: core/plugin reuse guidance** *(0.4.41; `aae42c88`, #592)*: added a "Core Package, Plugins & Code Reuse" section instructing contributors to treat `@arkade-os/sdk` as the core and `@arkade-os/boltz-swap` as a plugin — prefer reusing/promoting SDK utilities over duplicating logic outward, and keep the dependency direction one-way (`ts-sdk` never imports plugin packages). Contributor guidance only, no code/API change
- **0.4.41 release** *(`8741a646`)*: release-only patch bump (`@arkade-os/sdk` 0.4.40 → 0.4.41, `@arkade-os/boltz-swap` 0.3.45 → 0.3.46). Publishes everything accumulated since 0.4.40: the wallet activity-history API, `getNetwork()` fail-closed + root export, delegate-info init non-fatal, and the previously-unreleased `clear()` wipe / IndexedDB `onversionchange` unblock / unsignable-boarding fast-fail. The sibling 0.3.46 adds chain-swap BTC HTLC verification (#591)
- **Sibling boltz-swap: exact claim-fee sizing (chain-swap `arkToBtc`)** *(post-0.4.41 unreleased, `07991c26`, #595 — no version bump)*: `targetFee` (`packages/boltz-swap/src/utils/boltz-swap-tx.ts`) sizes the claim-tx fee from the exact `@scure/btc-signer` vsize (`ceil(probe.vsize * satPerVbyte)`), dropping the prior `+ tx.inputsLength` pad that overpaid ~1 sat/input. `claimBtc` subtracts the claim fee from the recipient (`swapOutput.amount − max(feeToDeliverExactAmount, targetFee)`), so the pad made chain-swap `arkToBtc` under-deliver by ~1 sat/input; without it the claim matches Boltz's grossed-up `minerFees.user.claim` and delivers the exact amount where Boltz's reservation covers the real claim fee (mainnet/mutinynet). On regtest the Boltz image reserves a sub-min-relay ~23-sat fee (below the 99-sat min-relay floor of the 1-in P2TR / 1-out P2WPKH claim), so the e2e assertion is bounded (`>= amountSats - 99`) not exact. New unit test `packages/boltz-swap/test/boltz-swap-tx.test.ts` locks the exact `ceil(vsize * rate)` sizing (vsize 111, no `+1` pad). Substantive change is in the sibling package — see `docs/projects/boltz-swap/`

**Tags**: `typescript`, `sdk`, `wallet`, `vtxo`, `bitcoin`, `taproot`, `musig2`, `bip39`, `bip86`, `hd-wallet`, `hd-receive-rotation`, `wallet-receive-rotator`, `input-signer-router`, `input-router-classify`, `input-router-can-batch`, `batch-signable-identity`, `sign-multiple`, `one-popup-signing`, `combine-tapscript-sigs`, `descriptor-provider`, `wallet-mode`, `electrum`, `esplora`, `service-worker`, `service-worker-restore`, `react-native`, `expo`, `expo-background-task`, `metro-bundler`, `node-24`, `tsup`, `dist-smoke-test`, `storage-adapters`, `npm`, `mainnet-default`, `provider-default-urls`, `url-config-deprecated`, `dust-change-error`, `bigint-assets`, `vtxo-ownership-gating`, `unilateral-exit`, `refresh-outpoints`, `monorepo`, `pnpm-workspace`, `boltz-swap-sibling`, `package-scoped-releases`, `wallet-restore`, `gap-limit-discovery`, `discoverable-handler`, `scan-contracts`, `delegate-manager`, `delegator-delegate-rename`, `asset-manager-export`, `renew-vtxos-threshold`, `tapscript-memoization`, `transaction-history`, `boarding-dedup`, `boarding-handler`, `boarding-contract-type`, `ensure-wallet-contract`, `default-wins-coalescence`, `required-csv-timelock`, `indexer-spent-state`, `handler-authoring-helpers`, `is-csv-spendable`, `is-cltv-satisfied`, `regtest-node-cli`, `arkade-regtest`, `mempool-esplora`, `esplora-api-suffix`, `mempool-compat-blocks`, `mempool-compat-fee-estimates`, `bip21-validation`, `bip21-safe-integer`, `bip21-abnf-amount`, `btcd-taproot-tree`, `assemble-btcd-taproot-tree`, `max-vtxos-per-settlement`, `by-value-descending`, `by-expiry-ascending`, `recovery-cap-error`, `deprecated-signers`, `detect-used-scripts`, `scan-batch-size`, `default-page-size`, `vtxo-max-amount`, `cap-settlement-batch`, `amount-too-high`, `settle-rotation-race`, `x-build-version`, `build-version-header`, `missing-signing-descriptor-error`, `arkana`, `estimator-evaluate`, `ses-snap-compat`, `eval-rename`, `service-worker-init-guard`, `message-bus-initializing`, `worker-identity-assertion`, `electrum-get-merkle`, `normalized-error-text`, `description-hash`, `nip57-zap`, `bolt11-description-hash`, `bip322-intent-proof`, `psbt-global-signed-message`, `intent-proof-message`, `phantom-receive-fix`, `outspends-no-spender-txid`, `explorer-tx-vin`, `commitment-by-outpoint`, `wallet-clear`, `clear-local-data`, `indexeddb-onversionchange`, `indexeddb-delete-unblock`, `unsignable-boarding-input`, `boarding-signing-fast-fail`, `core-plugin-reuse`, `activity-history`, `build-activities`, `activity-registry`, `activity-resolver`, `boarding-resolver`, `get-activity-history`, `get-network-fail-closed`, `get-network-export`, `delegate-info-non-fatal`, `chain-swap-htlc-verification`, `assert-chain-htlc-leaves`, `verify-btc-chain-htlc`, `exact-claim-fee`, `target-fee-vsize`

**Synonyms**: `@arkade-os/sdk`, `ark-ts-sdk`, `typescript-sdk`, `js-sdk`

**Triggers**:
- **ask_question**: `typescript sdk`, `wallet api`, `vtxo management`, `storage adapter`, `service worker wallet`, `ark address`, `boarding address`
- **develop**: `add wallet feature`, `new provider`, `storage adapter`, `asset management`, `delegation`, `expo support`
- **test_or_run**: `run sdk tests`, `vitest`, `integration test`, `regtest`, `arkade-regtest`, `regtest.mjs`, `node regtest start`, `regtest faucet`, `regtest mine`
- **debug**: `sse not working`, `crypto polyfill`, `service worker error`, `vtxo expired`, `settlement timeout`, `no chain tip found`, `getFeeRate throws 404`, `regtest /api`, `bitcoin-cli could not locate rpc credentials`, `cannot find module regtest.mjs`, `chopsticks endpoint 404`, `bip21 amount unsafe`, `bip21 .5 parse`, `INVALID_PSBT_INPUT`, `taproot output key mismatch`, `merkle root mismatch arkd`, `settle stuck below dust`, `recovery cap below dust`, `vtxos starved past cap`, `signer rotation stranded vtxos`, `deprecated signer restore`, `scanContracts too slow`, `AMOUNT_TOO_HIGH`, `vtxoMaxAmount exceeded`, `vtxo exceeds per-output limit`, `no output matches settle`, `x-build-version header missing`, `Estimator.eval is not a function`, `eval is not a function`, `SES direct eval`, `snap bundle rejected`, `service worker wrong identity`, `MessageBus initializing`, `wallet bound to different identity`, `getTxStatus throws not in block`, `get_merkle error`, `descriptionHash invalid hex`, `bolt11 description hash`, `phantom receive boarding`, `boarding sweep double counted`, `outspends missing txid`, `mempool.arkade.sh outspends`, `intent proof bip322`, `psbt global signed message`

**Dependencies**: `arkd` (REST API + SSE), `fulmine` (delegator service, optional)
**Depended On By**: `wallet`, `arkade-escrow`

---

### rust-sdk
**ID**: `rust-sdk`
**Name**: Arkade Rust SDK (ark-rs)
**Type**: Library/SDK
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/rust-sdk/INDEX.md`
**Repository**: `${RUST_SDK_REPO}`
**GitHub**: `${RUST_SDK_GITHUB}`

**Description**:
Collection of Rust crates for building Bitcoin wallets with Ark protocol support. Workspace includes ark-core (protocol types, MuSig2, coin selection, Arkade Asset V1, introspector packet builder), ark-client (high-level API with VTXO watcher and chain swaps), ark-grpc/ark-rest (transport), ark-bdk-wallet (BDK integration), ark-delegator (REST client for delegator services), ark-fees (fee estimation), ark-script (Arkade scripting extension — standalone), and ark-introspector-client (HTTP client for the Go introspector co-signer). Supports WASM compilation for browser use. All publishable crates aligned at **v0.9.3** with crates.io metadata (keywords/categories) and per-crate READMEs ready for publish; release pipeline runs via GitHub Actions (`draft_release_crates.yml` + `create_release_crates.yml`, idempotent for already-published crates / existing tag).

**Key Capabilities**:
- Core Ark protocol types (ArkAddress, VTXO, BoardingOutput, ArkNote, vHTLC)
- High-level client API (send VTXOs, settle rounds, check balances, transaction history)
- **`OfflineClientConfig` builder + TTL server-info refresh** (**breaking**) — clients are built from an `OfflineClientConfig` struct (`#[derive(Default)]`, mainnet defaults; fields `ark_server_url`, `boltz_url`, `timeout`, `server_info_ttl`, `boltz_referral_id`, `delegator_pk`, `historical_delegator_pks`) passed to `OfflineClient::with_keypair` / `with_bip32` / `with_key_provider`, replacing the old positional `new` / `new_with_keypair` / `new_with_bip32` constructors. The `K` key-provider generic and `name` field were dropped (`OfflineClient<B,W,S>` / `Client<B,W,S>`, key provider stored as `Arc<dyn KeyProvider>`); Boltz referral is now a `BoltzReferralId` enum (`Default`/`Disabled`/`Custom`) instead of `Option<String>` + `with_boltz_referral_id`. New public constants `ARKADE_MAINNET_URL`, `ARKADE_MUTINYNET_URL`, `BOLTZ_MAINNET_URL`, `BOLTZ_MUTINYNET_URL`, `DEFAULT_TIMEOUT`, `DEFAULT_SERVER_INFO_TTL`. `Client::server_info()` is now async and transparently refreshes the cached `/info` once `server_info_ttl` (default 15 min; `Duration::ZERO` = always) expires, single-flight behind an async mutex
- Generic offchain transaction builder (shared by VTXO and asset sends)
- gRPC transport (tonic) and REST transport (reqwest, WASM-compatible) — arkd 0.9.2; `ark-grpc::Client::connect` now attaches `ClientTlsConfig` (webpki / native roots, per feature) to the manually built `Endpoint`, so TLS-enabled `arkd` URLs connect cleanly under tonic 0.14 (no longer relying on URL-scheme TLS inference)
- **Guarded RPC + digest-mismatch refresh** — both transports route every non-`GetInfo` RPC through a guard that, on a stale `/info` digest, refetches `/info`, runs a refresh hook to update higher-level client state, commits the new digest, and returns `Error::server_info_changed` (no auto-retry). `ark-grpc` uses private `guarded::Ark` / `guarded::Indexer` wrappers so new RPCs can't skip the guard (design doc in repo); `ark-rest` mirrors the parity. Requests carry `x-digest` + `x-sdk-version` (`rust-sdk/<version>`) + `x-build-version`; `ark-core::server` defines `TARGET_ARKD_VERSION = "0.9.9"` / `SDK_VERSION`; new public `Error::is_server_info_changed()` on both transport errors
- **Smart settlement** — `Client::settle()` renews only expired/recoverable VTXOs plus confirmed boarding outputs (healthy VTXOs left untouched, cheap periodic renewal); full-renewal path renamed to `Client::settle_all()`. Isolated sub-dust recoverable VTXOs require `settle_all()` (need a healthy carrier VTXO to clear the server dust threshold)
- MuSig2 cooperative signing for round participation — batch event waits in `ark-client` now honour the configured client timeout (no more indefinite hangs on stalled round streams)
- BDK wallet integration for on-chain operations
- Boltz submarine, reverse submarine, **and chain swaps** (ARK ↔ on-chain BTC); reverse-swap rows now persist BOLT11 invoice + expiry (**breaking** for direct `ReverseSwapData` constructors) plus an optional `claim_address` so a reverse swap can credit another Arkade user's address (new `Client::get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)`; recipient is validated to share the same arkd signer via new `ArkAddress::server()` accessor); swap creation requests carry a `referralId` (default `arkade-rs-SDK`, configured via the `BoltzReferralId` enum on `OfflineClientConfig`); reverse-swap creation accepts an optional BOLT11 `description` (max 639 bytes) via a new trailing `description: Option<String>` arg on `get_ln_invoice` / `get_ln_invoice_with_preimage_hash` (**breaking**)
- Granular offchain-tx control: `Client::submit_offchain_tx` is no longer behind a feature flag, `finalize_offchain_tx` is `pub`, and `finalize_pending_offchain_tx(ark_txid)` finalizes a specific pending tx by `Txid` (useful when an external DB tracks individual pending funding attempts)
- **SDK build-version handshake** — `ark-grpc` (via a `tonic` interceptor on the shared channel) and `ark-rest` (via `reqwest` default headers) send `x-build-version` = `CARGO_PKG_VERSION` on every request; servers can reject too-old SDKs and callers detect it via `Error::is_version_mismatch()`. `ark_rest::Client::new(url)` now returns `Result<Self, Error>` (**breaking**)
- **Unilateral exit** finalization rewritten: `build_unilateral_exit_tree_txids` returns a topologically sorted ancestor sub-DAG (no exponential root-to-leaf enumeration); new public `finalize_virtual_tx_input` / `finalize_taproot_script_spend_witness` helpers materialize key- or script-spend witnesses from PSBT data, decoding condition-witness elements (VHTLC preimages, etc.) from the `VTXO_CONDITION_KEY` unknown field with strict length-prefix validation; `sign_unilateral_exit_tree` kept as a `#[deprecated]` alias for `finalize_unilateral_exit_tree`
- **Arkade Asset V1**: issue, transfer, burn, reissue with asset-preserving settlement
- **Arkade Script** (introspector flow): `ark-script` extension opcodes / ASM / tapscript / vtxo-script encoders; `ark-core::introspector::packet` strict-validating packet builder; `ark-introspector-client` HTTP co-signer client
- **Server signer key rotation** (0.9.3) — migrate VTXOs/boarding outputs off a deprecated arkd signer before its cooperative-sign cutoff. `ark-core::server` adds `DeprecatedSignerStatus` (`Migratable` / `DueNow` / `Expired`) and `ServerSignerStatus` (`Current` / `Deprecated(..)` / `Unknown`) plus `Info` accessors (`all_server_keys`, `signer_status_at`, `deprecated_signer_status_at`, `signer_requires_recovery_at`, `is_signer_past_cutoff_at`); new `ark-client::migration` module + `Client` APIs `migrate_deprecated_signer_vtxos()` (two independent VTXO/boarding legs, each oversized/deferred/dust-sized, bounded by `MAX_VTXOS_PER_SETTLEMENT = 50`, backing off on per-leg failure → `DeprecatedSignerMigrationReport`), `deprecated_signer_status()` (per-signer `DeprecatedSignerReport`), `pending_recovery()`, `refresh_server_info()`. Ordinary `settle()` now enforces the signer cutoff; Unix-time retrieval is fallible and tolerates negative timestamps; new `e2e_signer_rotation` test
- **VTXO delegation**: 3-of-3 delegated VTXOs, REST delegator client (`ark-delegator`), background `VtxoWatcher` for auto-renewal
- **Split forfeit / unilateral-exit keys** on `Vtxo`
- DLC (Discreet Log Contracts) support — time-based timelocks (block-based dropped to match production Arkade)
- Key discovery (probes delegate addresses too)
- Coin selection algorithms and fee estimation
- WASM build support (ark-core, ark-rest)
- Comprehensive E2E test suite against live arkd (incl. `e2e_assets`, `e2e_arkade_script`, `fulmine_delegator_smoke`)

**Tags**: `rust`, `sdk`, `ark`, `vtxo`, `musig2`, `grpc`, `rest`, `wasm`, `bdk`, `boltz`, `bitcoin`, `wallet-library`, `delegator`, `vtxo-watcher`, `arkade-asset`, `chain-swap`, `arkade-script`, `introspector-client`, `signer-rotation`

**Synonyms**: `ark-rs`, `rust-ark-sdk`, `ark-rust`

**Triggers**:
- **ask_question**: `rust sdk`, `ark-rs`, `ark-core`, `ark-client`, `ark-delegator`, `ark-script`, `ark-introspector-client`, `rust wallet`, `wasm ark`, `bdk integration`, `vtxo watcher`, `arkade asset rust`, `rust chain swap`, `arkade script rust`
- **develop**: `add rust feature`, `new crate`, `ark-core type`, `musig2 signing`, `wasm support`, `e2e test`, `delegator client`, `asset issuance rust`, `chain swap rust`, `arkade tapscript`, `introspector packet`, `forfeit unilateral exit key`, `signer rotation`, `migrate deprecated signer`, `deprecated signer status`
- **test_or_run**: `cargo test`, `just test`, `e2e-tests`, `arkade-regtest`, `regtest.mjs`, `just regtest-start`, `wasm-pack test`, `just e2e-full`, `e2e_assets`, `e2e_arkade_script`, `fulmine_delegator_smoke`, `emulator profile introspector`
- **debug**: `tonic error`, `grpc connection`, `round signing failed`, `wasm build error`, `musig nonce`, `delegator error`, `vtxo watcher error`, `chain swap refund`, `introspector timeout`, `arkade opcode parse error`, `digest mismatch`, `server_info_changed`, `regtest submodule`, `settle sub-dust`, `deprecated signer`, `signer cutoff`, `migration leg failed`

**Dependencies**: `arkd` (gRPC/REST server, 0.9.2), `boltz-backend` (swap provider, optional — used for chain swaps), `fulmine` (delegator service, optional), `introspector` (Go co-signer service, provided as the emulator profile of the regtest stack for arkade-script e2e), `arkade-regtest` (e2e Docker stack, git submodule at `regtest/`)
**Depended On By**: None (library — consumed by external wallet applications)

---

### bluewallet
**ID**: `bluewallet`
**Name**: BlueWallet
**Type**: End-User Application (Mobile)
**Language**: TypeScript / React Native
**Index**: `${ARKADIAN_DIR}/docs/projects/bluewallet/INDEX.md`
**Repository**: `${BLUEWALLET_REPO}`
**GitHub**: `BlueWallet/BlueWallet`

**Description**:
Popular open-source Bitcoin & Lightning Network wallet for iOS, Android, and macOS (via Mac Catalyst). Built with React Native 0.85 (New Architecture / Fabric) and Electrum, distributed natively on the App Store / Google Play. Ships 15+ wallet types (Legacy/SegWit/Taproot/HD, Multisig, Watch-only, Lightning Custodian) and integrates the Ark protocol as a first-class wallet via `@arkade-os/sdk` (0.4.23) and `@arkade-os/boltz-swap` (0.3.26). Includes Realm-backed Ark repositories (imported directly from the SDK), Expo-flavoured providers, and a custom background swap reconciliation queue. Android 15 16kb-page-size compatible.

**Key Capabilities**:
- Multi-wallet mobile UX: Bitcoin (Legacy/SegWit/Taproot/HD/Aezeed/Electrum/SLIP-39/BreadWallet), Multisig HD, Watch-only, BIP47 PayCodes
- Lightning support: Custodian (LndHub) and **Lightning Ark via `LightningArkWallet`**
- Ark integration: `@arkade-os/sdk` `Wallet` + `Ramps` + `MnemonicIdentity` + Expo providers
- Boltz swaps: submarine (LN→Ark) and reverse (Ark→LN) via `ArkadeSwaps`
- Background swap reconciliation: persistent queue + WebSocket reconnection + foreground polling fallback
- Realm-backed Ark wallet/contract/swap repositories with per-wallet random namespaces (privacy)
- Encryption with plausible deniability (decoy wallets), biometric unlock
- Cross-platform: iOS, Android, macOS Catalyst (single React Native codebase + native widgets/watch app)
- 55+ Transifex localizations, BugSnag error reporting, BrowserStack-tested
- Detox E2E tests (Android-focused), Jest unit + integration tests
- Hardware wallet support via QR (Keystone, BC-UR registry)
- BIP38 / WIF imports, RBF, CPFP

**Tags**: `wallet`, `mobile`, `react-native`, `new-architecture`, `fabric`, `ios`, `android`, `macos`, `bitcoin`, `lightning`, `ark`, `vtxo`, `boltz`, `submarine-swap`, `reverse-swap`, `realm`, `electrum`, `ark-sdk-consumer`, `arkade-os-sdk`, `multi-wallet`, `self-custodial`, `taproot`, `multisig`

**Synonyms**: `blue-wallet`, `bluewallet-rn`, `bw`, `BlueWallet`

**Triggers**:
- **ask_question**: `bluewallet`, `blue wallet`, `mobile ark wallet`, `react native ark`, `bluewallet ark integration`, `LightningArkWallet`, `lightning ark wallet`, `ark on mobile`, `ark ios`, `ark android`
- **develop**: `bump arkade-os/sdk`, `bump arkade-os/boltz-swap`, `add bluewallet feature`, `fix bluewallet bug`, `bluewallet detox`, `bluewallet jest`, `arkade-adapters`, `swap-queue`, `realm migration`
- **test_or_run**: `bluewallet test`, `npm test bluewallet`, `bluewallet detox`, `run bluewallet ios`, `run bluewallet android`, `bluewallet metro`
- **debug**: `bluewallet build error`, `bluewallet crash`, `bluewallet ark balance`, `bluewallet swap stuck`, `bluewallet realm error`, `bluewallet keychain`, `metro cache`, `pod install`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk` 0.4.23), `boltz-swap` (`@arkade-os/boltz-swap` 0.3.26), `arkd` (default `arkade.computer`), `boltz-backend` (default `api.ark.boltz.exchange`)
**Depended On By**: None (end-user application)

---

## Project Relationships & Dependencies

### Dependency Graph

```
arkd (core)
   go-sdk (client library)
      ark-faucet (uses go-sdk)
      ark-simulator (uses go-sdk)
   dotnet-sdk (.NET client library, gRPC to arkd)
   rust-sdk (Rust client library - ark-rs, gRPC/REST to arkd)
   ts-sdk (TypeScript client library - @arkade-os/sdk)
      wallet (uses ts-sdk)
      arkade-escrow (uses ts-sdk)
   ark-faucet (uses arkd APIs)
   kms-unlocker (unlocks arkd-wallet)
   fulmine (independent, but can integrate)
   ark-telemetry (monitors arkd)
   introspector (Arkade Script co-signer)
   bancod (Go solver bot, uses arkd tx stream + go-sdk + introspector)
   banco (TS swap library, uses @arkade-os/sdk + emulator [introspector co-signer service, addressed as Emulator since the May 2026 ts-sdk bump])
   compiler (Arkade Script compiler, produces contract artifacts)
   ark-infra (deploys arkd + dependencies)
   ark-docs (documents arkd)

boltz-backend (external swap provider)
   fulmine (uses Boltz for Lightning swaps)
   boltz-swap (client library for Boltz API)

wallet / @arkade-os/sdk
   boltz-swap (Lightning integration for Arkade wallets)
   arkade-escrow (uses @arkade-os/sdk for VEC escrow)
   arkade-wdk (WDK adapter — wraps @arkade-os/sdk for Tether WDK consumers)
   bluewallet (RN mobile wallet — wraps @arkade-os/sdk + @arkade-os/boltz-swap as LightningArkWallet)

arkana-knowledge (Ark Labs AI assistant — operational, not protocol)
   monitors all ArkLabsHQ + arkade-os repos via GitHub App
   produces digests, PR reviews, issue triage; not consumed by protocol projects

enclave (AWS Nitro Enclave framework — confidential execution for any HTTP app)
   independent infrastructure framework
   potential deployment target for: introspector (co-signer), future signing services
   external deps: AWS KMS/SSM/S3/EC2/IAM, Nix, Docker, nitriding, gvproxy

arkade-regtest (local Ark stack — zero-dependency Node CLI + Docker Compose; no nigiri)
   consumed as a git submodule by:
      arkd, fulmine, go-sdk, ts-sdk, rust-sdk, dotnet-sdk
      wallet, boltz-swap, boltz-backend (integration tests)
   bundles upstream services: bitcoin-core, fulcrum, mempool, nbxplorer, arkd, arkd-wallet,
      fulmine (+ delegator), boltz, lnd (x2), lnurl, wallet PWA, arkade-explorer, nginx, emulator, solver
```

### Correlation Matrix

| Project | Related To | Relationship Type |
|---------|-----------|-------------------|
| arkd | go-sdk | Server-Client |
| arkd | dotnet-sdk | Server-Client (via gRPC) |
| arkd | wallet | Server-Client (via @arkade-os/sdk) |
| arkd | ark-faucet | Server-Client |
| arkd | ark-simulator | Server-Under-Test |
| arkd | ark-telemetry | Instrumented-Service |
| arkd | kms-unlocker | Unlocks arkd-wallet |
| go-sdk | ark-simulator | Library-Consumer |
| go-sdk | ark-faucet | Library-Consumer |
| wallet | fulmine | Integrates Lightning swaps |
| fulmine | boltz-backend | Client-Server (Swap API) |
| boltz-backend | fulmine | Swap-Provider |
| ark-infra | arkd | Deployment-Target |
| ark-infra | ark-telemetry | Deployment-Target |
| ark-docs | All | Documentation-Reference |
| arkade-assets | arkd | Protocol-Implementation |
| arkade-assets | wallet | Asset-UI-Provider |
| arkade-assets | arkade-explorer | Asset-Visualization-Provider |
| arkade-explorer | arkd | Client-Server (via Indexer API) |
| arkade-explorer | wallet | Sibling Frontend (same @arkade-os/sdk) |
| arkade-explorer | arkade-assets | Asset-Consumer |
| wallet | arkade-assets | Asset-Consumer |
| wallet | boltz-swap | Library-Consumer (Lightning integration) |
| boltz-swap | boltz-backend | Client-Server (Boltz API) |
| boltz-swap | @arkade-os/sdk | Library-Consumer (Wallet SDK) |
| arkade-escrow | arkd | Server-Client (via @arkade-os/sdk) |
| arkade-escrow | @arkade-os/sdk | Library-Consumer |
| introspector | arkd | Co-Signer (Arkade Script validation) |
| dotnet-sdk | arkd | Client-Server (via gRPC and REST/SSE) |
| dotnet-sdk | fulmine | E2E-Test-Dependency |
| dotnet-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| dotnet-sdk | arkade-regtest | Shared E2E regtest environment (git submodule) |
| arkade-regtest | arkd | Bundles arkd image (`ARKD_IMAGE`, default `v0.9.9-rc.1`) |
| arkade-regtest | fulmine | Bundles fulmine image |
| arkade-regtest | boltz-backend | Bundles Boltz backend image |
| arkade-regtest | wallet | Bundles wallet PWA image |
| arkade-regtest | go-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | ts-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | rust-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | boltz-swap | Provides regtest target for Lightning swap UI tests |
| ts-sdk | arkd | Client-Server (REST/SSE) |
| ts-sdk | wallet | Library-Consumer |
| ts-sdk | arkade-escrow | Library-Consumer |
| ts-sdk | arkade-wdk | Library-Consumer (WDK adapter wraps @arkade-os/sdk) |
| ts-sdk | fulmine | Delegator-Integration |
| arkade-wdk | ts-sdk | Adapter-Wrapper (`@arkade-os/sdk`) |
| arkade-wdk | boltz-swap | Library-Consumer (optional Lightning via Boltz) |
| arkade-wdk | @tetherto/wdk-wallet | Implements WDK base contracts |
| bluewallet | ts-sdk | Library-Consumer (`@arkade-os/sdk` 0.4.23, Expo adapters) |
| bluewallet | boltz-swap | Library-Consumer (`@arkade-os/boltz-swap` 0.3.26 — submarine + reverse swaps) |
| bluewallet | arkd | Client-Server (default `arkade.computer`, custom override per-wallet) |
| bluewallet | boltz-backend | Client-Server (default `api.ark.boltz.exchange`) |
| bluewallet | wallet | Sibling Frontend (RN mobile equivalent of Arkade PWA) |
| bluewallet | arkade-wdk | Sibling Adapter (different RN-on-Ark integration approach) |
| rust-sdk | arkd | Client-Server (via gRPC/REST, SDK 0.9.3) |
| rust-sdk | go-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | ts-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | dotnet-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| rust-sdk | fulmine | Delegator-Integration (VTXO auto-renewal) |
| rust-sdk | introspector | Co-Signer-Client (arkade-script flows via `ark-introspector-client`; dockerized for e2e) |
| bancod | arkd | Client-Server (tx stream subscription, wallet) |
| bancod | go-sdk | Library-Consumer (Wallet) |
| bancod | introspector | Client-Server (signing for fulfillment) |
| banco | ts-sdk | Library-Consumer (@arkade-os/sdk) |
| banco | introspector | Client-Server (covenant validation + co-signing; addressed as **Emulator** in banco's API/wire format since `738468a`/`b928526`/`428ae68`, May 2026) |
| banco | arkd | Client-Server (Ark provider, indexer) |
| banco | bancod | Protocol-Sibling (TS library vs Go solver bot, same swap protocol) |
| compiler | introspector | Compiler-Runtime (compiler produces, introspector executes) |
| compiler | arkd | Compiler-Consumer (arkd uses compiled contract artifacts) |
| compiler | arkade-assets | Language-Specification (compiler implements Arkade Script) |
| arkana-knowledge | All ArkLabsHQ + arkade-os repos | Observer/Reviewer (PR reviews, issue triage, digests) |
| arkana-knowledge | None (downstream) | Operations meta-project — not consumed by protocol projects |
| enclave | AWS Nitro | Confidential-Execution-Framework (PCR0-locked KMS, attested boot) |
| enclave | introspector | Potential-Deployment-Target (co-signer in attested enclave) |

### Technology Groupings

**Go Projects**: arkd, go-sdk, ark-faucet, ark-simulator, kms-unlocker, fulmine, bancod, introspector, enclave (CLI + runtime + supervisor)
**Rust Projects**: rust-sdk, compiler, enclave (`client-rs/` Cargo workspace member)
**C#/.NET Projects**: dotnet-sdk
**TypeScript/JavaScript Projects**: ts-sdk, wallet, arkade-assets, arkade-explorer, arkade-escrow, arkade-wdk, bluewallet (React Native), boltz-swap, banco, boltz-backend (TypeScript + Rust hybrid)
**Mobile / React Native**: bluewallet (iOS, Android, macOS Catalyst), arkade-wdk (RN-compatible adapter)
**Bitcoin Wallet Apps**: wallet (PWA), bluewallet (React Native mobile)
**Infrastructure/Config**: ark-infra, ark-telemetry, arkade-regtest (Node CLI + Docker Compose orchestration), enclave (Nix + Docker + AWS CDK + OpenTofu)
**Confidential Computing / Security**: enclave (AWS Nitro Enclaves), kms-unlocker (KMS + Secrets Manager)
**Documentation**: ark-docs
**External Services**: boltz-backend
**Frontend Applications**: wallet (PWA), arkade-explorer (Web App)
**Protocol Specifications**: arkade-assets
**AI Assistant / Operations**: arkana-knowledge (configuration + knowledge base for Arkana, the Ark Labs AI assistant)

---

## Agent Routing Guidelines

### Intent-Based Project Selection

**Q&A / Conceptual Questions**:
- Ark protocol concepts → `ark-docs`, `arkd`
- VTXOs, rounds, settlement → `arkd`, `ark-docs`
- Wallet usage → `wallet`, `bluewallet`, `ts-sdk`, `go-sdk`, `rust-sdk`, `ark-docs`
- WDK / Tether wallet integration, React Native Ark wallet → `arkade-wdk`, `bluewallet`, `ts-sdk`
- Mobile wallet (iOS/Android/macOS) with Ark → `bluewallet`
- Lightning swaps → `wallet`, `bluewallet`, `boltz-swap`, `fulmine`, `ark-docs`
- Security model → `ark-docs`, `arkd`
- Asset protocol, NFTs, tokens → `arkade-assets`, `ark-docs`
- Escrow system → `arkade-escrow`
- Arkade Script, covenants → `compiler`, `introspector`, `arkd`

**Development Tasks**:
- Add arkd feature → `arkd`
- Build wallet → `go-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet` (depending on language)
- Build a WDK / Tether-based RN wallet on Ark → `arkade-wdk`, `ts-sdk`
- Modify the BlueWallet mobile app / its Ark integration → `bluewallet`, `ts-sdk`, `boltz-swap`
- Escrow development → `arkade-escrow`
- Lightning integration → `fulmine`, `boltz-swap`, `wallet`
- Infrastructure changes → `ark-infra`
- Asset implementation → `arkade-assets`, `arkd`
- Arkade Script/opcode development → `compiler`, `introspector`

**Testing & QA**:
- Integration testing → `arkd`, `ark-simulator`, `arkade-regtest`
- Load testing → `ark-simulator`
- E2E testing → `arkd`, `go-sdk`, `arkade-regtest`
- Local dev stack → `arkade-regtest` (regtest), `ark-infra` (cloud)
- Bring up Ark + Boltz + LND locally → `arkade-regtest`

**Monitoring & Debugging**:
- Metrics, dashboards → `ark-telemetry`
- Logs, traces → `ark-telemetry`
- Debug arkd issues → `arkd`, `ark-telemetry`
- Production monitoring → `ark-infra`, `ark-telemetry`

**Operations & Deployment**:
- Deploy to AWS → `ark-infra`
- Local dev environment → `arkade-regtest` (preferred for protocol dev), `ark-infra` (cloud)
- Wallet unlock automation → `kms-unlocker`
- Testnet faucet → `ark-faucet`

---

## Usage Notes for Agents

### Multi-Project Queries

When a user asks about topics spanning multiple projects, load context from all relevant projects:

**Example**: "How do I test arkd with multiple wallets?"
- Load: `arkd` (server setup), `ark-simulator` (multi-client testing), `go-sdk` (wallet client)

**Example**: "Set up monitoring for production arkd deployment"
- Load: `arkd` (instrumentation), `ark-telemetry` (monitoring stack), `ark-infra` (deployment)

### Dependency Loading

When working on a project, consider loading dependent projects:

- Working on `ark-simulator` → Also load `arkd`, `go-sdk`
- Working on `wallet` → Also load `ts-sdk`, `arkd` (for SDK and server API reference)
- Working on `bluewallet` → Also load `ts-sdk`, `boltz-swap`, `arkd` (SDK + Boltz lib + server reference)
- Working on `ts-sdk` → Also load `arkd` (for server API reference)
- Working on `ark-infra` → Also load `arkd`, `ark-telemetry` (deployment targets)

### Documentation Priority

For conceptual questions, prioritize documentation loading order:
1. `ark-docs` (official protocol documentation)
2. Project-specific INDEX.md (project overview)
3. Project-specific system/ docs (architecture, design)
4. Project code (implementation details)

---

## Project Status Summary

| Project | Status | Production Ready | Notes |
|---------|--------|------------------|-------|
| arkd | Stable | →  Alpha | Core protocol, active development |
| go-sdk | Stable | →  Alpha | Client library, API may change |
| wallet | Active Dev | L Alpha | PWA wallet, under development |
| ark-faucet | Stable |   (Testnet) | Production-ready for testnet |
| ark-simulator | Stable |   | Testing tool, production-ready |
| ark-telemetry | Stable |   | Monitoring stack, production-ready |
| ark-infra | Active Dev | →  Beta | IaC, production configurations available |
| kms-unlocker | Stable |   | Production-ready with AWS |
| fulmine | Active Dev | →  Alpha | Lightning wallet, under development |
| bancod | Active Dev | Alpha | Banco solver bot, swap + preimage plugins |
| banco | Active Dev | Alpha | TS swap library, @arkade-os/banco on npm |
| ark-docs | Active |   | Documentation site, continuously updated |
| arkade-assets | Specification | N/A | Protocol spec + reference implementation |
| arkade-escrow | POC | L Alpha | Escrow platform, proof-of-concept |
| arkade-explorer | Active Dev | ✓ Beta | Block explorer, production-ready |
| introspector | Active Dev | → Alpha | Arkade Script co-signer |
| dotnet-sdk | Active Dev | Beta | .NET SDK, 1.0-beta, NuGet packages, DocFX site + Blazor WASM sample wallet on GitHub Pages, HD wallet gap-limit recovery via modular discovery providers, per-wallet `vtxo.lastFullPollAt` cold-start cursor on new `ArkWalletEntity.Metadata` JSON column, persistent Boltz websocket with subscribe/unsubscribe, Boltz `referralId` (default `"arkade-dotnet-sdk"`), `RPCChainTimeProvider` cache + transient-RPC fallback, mainnet Boltz URL switched to `api.boltz.exchange`; `ArkNetworkConfig` now ships per-network Esplora + Electrum (WS / TCP) endpoint defaults (PR #96) — apps can wire `IBitcoinBlockchain` (Esplora flavor) straight off the preset (`AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!))`) without running their own NBXplorer / bitcoind; Electrum TCP ports verified at protocol level against public Fulcrum hosts (only `:50001` plain-TCP open on Mainnet / Mutinynet, Regtest uses nigiri electrs `:50000`); routine `VtxoSynchronizationService.StartQueryLogic` polls now log at Debug — Info reserved for productive ticks (a VTXO landed) + cold-start catch-up (PR #95); per-input weight-budget coin selection via `ArkTxWeightEstimator` (PR #145/#146, replaces the fixed VTXO cap) + opt-in expiry-aware `EARSCoinSelector` (PR #124); Boltz unilateral CLTV / `refundWithoutReceiver`-batch refund fallbacks when the cooperative co-sign is refused (PR #141), with a `MockBoltzServer` E2E matrix + CI E2E split into four parallel workflows; `OnchainSweepService` now fully builds/signs/broadcasts the CSV unilateral-exit sweep tx (PR #147, completing the prior stub) via the shared `TransactionHelpers.BuildCsvSpendTransaction`; broad XML-doc-comment pass across `NArk.Abstractions` / `NArk.Core` / `NArk.Swaps` (PR #144); new `VHTLCContract.Create(...)` validating factory + `VHtlcDelay` value type (PR #149), pinned against `arkade-os/rust-sdk`'s `vhtlc.json` test vectors; REST/SSE transport now sends `Accept: text/event-stream` on subscribe and treats an HTTP `501 Not Implemented` subscription open as a permanent fallback-to-polling (`IsNonRetryableSubscriptionError`) instead of reconnect-looping, plus a shared `JsonExtensions.TryGetPropInvariantCase` helper for snake_case/camelCase proto3 JSON (PR #152); preimage-derivation test vectors + `SimpleSeedWallet` deterministic transport-less signing (PR #151) |
| boltz-swap | ⚠️ Repo Deprecated (2026-05-25, PR [#153](https://github.com/arkade-os/boltz-swap/pull/153)) — development moved to `arkade-os/ts-sdk` monorepo (`packages/boltz-swap/`); npm package `@arkade-os/boltz-swap@0.3.32` unchanged | ✓ Beta | TypeScript Boltz swap library, v0.3.32, @arkade-os/sdk 0.4.27. **Post-0.3.32 (unreleased)**: chain-swap `quoteSwap` guard against adversarial Boltz quotes — `quoteSwap(swapId, options?)` now floors the Boltz-returned amount against `response.claimDetails.amount` (or explicit `minAcceptableAmount` + optional `maxSlippageBps`) and throws the new typed `QuoteRejectedError` (`below_floor` / `non_positive` / `no_baseline`) instead of blind-accepting; new sibling APIs `getSwapQuote` (fetch without committing) and `acceptSwapQuote(swapId, amount, options?)` (validate-then-post); options validated as positive integers — `minAcceptableAmount=0` rejected (would silently restore blind-accept); slippage math uses subtract-then-floor for precision above `MAX_SAFE_INTEGER / 10000`; autopilot `transaction.lockupFailed` renegotiation (both Arkade↔BTC directions) uses the same floor via a `quoteOptionsForSwap` helper tolerant of legacy persisted swaps with missing `claimDetails.amount` (routes to `no_baseline` instead of crashing); rejection wraps via new `SwapError`/`ErrorOptions.cause` for programmatic recovery; `QuoteRejectedError` survives SW `postMessage` via a `QUOTE_REJECTED::`-prefixed JSON payload in `Error.message` (structured clone strips custom `.name`/own properties, but preserves `.message`), reconstructed by the runtime so SW callers can still `instanceof`-check; full wiring through `IArkadeSwaps`, `ExpoArkadeSwaps`, SW message handler, SW runtime. (release 0.3.32 is the SDK 0.4.27 upgrade cut — no `src/` changes); regtest harness realigned to wallet's arkd config — pins arkd / arkd-wallet to `v0.9.5`, fulmine to `v0.3.23`, Boltz to `boltz/boltz:latest`; `ARKD_SCHEDULER_TYPE` switched `block` → `gocron` and the `ARKD_ALLOW_CSV_BLOCK_TYPE=true` override is gone (`ARKD_VTXO_TREE_EXPIRY` / `ARKD_BOARDING_EXIT_DELAY` restored to seconds-typed 5120 / 7200; new `ARKD_SESSION_DURATION=10`, `ARKD_LOG_LEVEL=6`, `BITCOIN_LOW_FEE=true`); VtxoManager-enabled receive E2E test now polls via `waitForBalance(...)` instead of asserting on a single `getBalance()` snapshot (gocron can re-register a just-claimed VTXO into the next round between claim and snapshot); regtest submodule bumped (`3ac33b6` → `dc23da2`). 0.3.31 carry-forward: **breaking for Expo callers** — OS-task helpers (`defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `unregisterExpoSwapBackgroundTask`) moved from `@arkade-os/boltz-swap/expo` to a new `@arkade-os/boltz-swap/expo/background` subpath (static imports fix Metro static-dependency-collector miss, #136); `ExpoArkadeSwaps.setup()` no longer registers the OS task itself, callers must call `register*`/`unregister*` explicitly; `background` config dropped `taskName` + `minimumBackgroundInterval` (TS compile error, JS runtime warn via `warnOnRemovedBackgroundFields`); `expo-task-manager` (`>=3.0.0`) + `expo-background-task` (`>=0.1.0`) now declared as optional `peerDependencies`; `BoltzSwapProvider` `referralId` defaults to `"arkade-ts-sdk"` (auto-tags every submarine/reverse/chain swap); ServiceWorker runtime recovers from a half-initialized `ArkadeSwaps` handler (typed `HandlerNotInitializedError`) by re-sending the cached `INIT_ARKADE_SWAPS` payload and retrying |
| compiler | Active Dev | Alpha | Arkade Script compiler, Rust CLI + library |
| ts-sdk | Active Dev | ✓ Beta | v0.4.27, npm published, multi-platform; **2026-05-22 monorepo restructure**: `arkade-os/ts-sdk` is now a **pnpm workspace monorepo** vendoring two published packages — `@arkade-os/sdk` (`packages/ts-sdk/`, v0.4.27, **unchanged on npm**) and `@arkade-os/boltz-swap` (`packages/boltz-swap/`, v0.3.32, depends on `@arkade-os/sdk` via `workspace:*`). devDeps (`tsup`, `vitest`, `typescript`, `prettier`, `husky`, `@types/node`, `fake-indexeddb`, `eventsource`) hoisted to root; shared `tsconfig.base.json` + root prettier + `tsup` base config; single root-level `bip68` ambient declaration; `pnpm-workspace.yaml` consolidates `onlyBuiltDependencies` (`better-sqlite3`, `canvas`, `sqlite3`, `@arkade-os/sdk`) and `overrides` (`esbuild >=0.25.0`, `brace-expansion ^2.0.2`, `minimatch 9.0.3`); unified `scripts/regtest.sh <pkg> <action>` driver for the regtest stack (each package supplies its own `.env.regtest`); **package-scoped release CLI** (`cd29cda3` superseding the brief lockstep flow `843502e1`) — `pnpm run release -- sdk patch` (SDK + dependent boltz-swap patch), `pnpm run release -- boltz-swap patch` (Boltz-only bugfix), `pnpm run release -- sdk prepatch --preid beta` (mirrors prerelease into boltz-swap), `pnpm run release -- all patch` (bump both); release driver is `scripts/release.sh` → `scripts/release.mjs`, gated on `pnpm test:unit` (monorepo-wide, `15ee8c63`); root `engines.node` narrowed to `>=24.15.0 <25` (`2ca08e3f` Node 24 LTS) while published `@arkade-os/sdk` `engines.node` stays at the widened `>=22.12.0 <25` from #495; CI invokes root-level `pnpm build` / `pnpm test:unit` / `pnpm test:integration` (fans out via `pnpm -r`), per-package `pnpm typecheck` + `pnpm smoke:dist` gated for both ts-sdk and boltz-swap (boltz-swap dist smoke restored in `3555a9a4`); root `packageManager` = `pnpm@10.25.0` (root `engines.pnpm` `>=10.25.0 <11`). **No `@arkade-os/sdk` source changes** — every `src/` modification in `packages/ts-sdk/src/` had already shipped in the 0.4.27 cut or the post-0.4.27 unreleased work documented below (#487 Expo subpath split, #495 Node 24, #496 tsup migration, HD receive rotation re-merge #489, Tier 2 ownership gating 0.4.25, etc.). Downstream apps installing `@arkade-os/sdk` from npm are unaffected by the workspace shape. **post-0.4.27 changes** (carried forward from prior syncs): (a) **#487 fix(wallet/expo)** — background-task helpers split out to `@arkade-os/sdk/wallet/expo/background` subpath (new package.json export); previous lazy `require()` of `expo-task-manager` / `expo-background-task` was invisible to Metro's static dependency collector so the modules never entered the bundle graph. Static imports on the new subpath fix Metro; isolating them on a separate entry keeps react-native-web and Node consumers using `/wallet/expo` from pulling the two native peer deps. **Breaking for Expo callers**: `defineExpoBackgroundTask` / `registerExpoBackgroundTask` / `unregisterExpoBackgroundTask` + `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig` no longer exported from `/wallet/expo`; `ExpoWallet.setup()` no longer registers the OS scheduler and `dispose()` no longer unregisters it (consumer must call `registerExpoBackgroundTask(taskName, { minimumInterval })` / `unregisterExpoBackgroundTask(taskName)` explicitly); `background` config dropped `taskName` and `minimumBackgroundInterval` (TS compile error on removed fields; JS callers must update manually — fields are silently ignored and the OS task never runs); ambient declarations for the subset of `expo-task-manager` / `expo-background-task` APIs live in `src/wallet/expo/expo-modules.d.ts`. (b) **#495 chore: upgrade to Node 24 LTS** — `.nvmrc` pins `24.15.0`, CI workflows run on Node 24, `engines.node` widened to `>=22.12.0 <25` (was `>=22.12.0 <23`) so downstream consumers still on Node 22.x are not broken. **0.4.27 release** (package.json-only bump, no source changes since 0.4.26) (package.json-only bump, no source changes since 0.4.26): new public type `ExtendedContractVtxo` (`ExtendedVirtualCoin & { contractScript }`) exported from the package root — narrows `ContractVtxo`'s `Partial<TapLeaves & EncodedVtxoScript>` to required, used at save/forfeit construction sites and as the `ContractWithVtxos.vtxos` element type; `ContractWatcher` extend path now compile-time-typed and logs `txid:vout` + caught error on extend failure; `DelegatorManager.delegate` filter replaced its unsafe `as ExtendedVirtualCoin` cast with an `isAnnotated` type guard; `Wallet.create` / `ReadonlyWallet.create` now derive the indexer URL from a custom `arkProvider` via the new `extractArkProviderUrl` helper (no more silent pairing with the public `arkade.computer` default when a different arkd is injected); **HD receive rotation via contract repository re-merged in #489** (reopen of #473 after the #488 revert) — `WalletReceiveRotator` owns the `vtxo_received` subscription, rotation chain mutex, contract-repo-backed boot pubkey lookup (tagged `metadata.source = 'wallet-receive'`), and contract registration on rotate; baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) every boot regardless of rotation state; exponential backoff (1s → 60s cap) on consecutive `rotate()` failures; typed `NonRangeableDescriptorError` for silent-fallback path; `WalletConfig.walletMode = 'auto' \| 'static' \| 'hd' \| DescriptorProvider` makes the wiring explicit (**`'auto'` currently behaves like `'static'`** until HD has more soak time — `TODO(hd-maturation)` flip-back criteria recorded in `resolveDescriptorProvider`); `ServiceWorkerWalletMode` is `'auto' \| 'static' \| 'hd'` (no object form, can't cross postMessage); `InputSignerRouter` dispatches each PSBT input to `DescriptorProvider.signWithDescriptor` (rotated default/delegate contracts using `metadata.signingDescriptor`) or `Identity` (everything else), with typed errors `DescriptorSigningProviderMissingError` + `MissingSigningDescriptorError` exported from the package root; `Wallet.offchainTapscript` becomes a getter over a `protected` backing field (only sanctioned writer is `setOffchainTapscriptForRotation`, `@internal`); `isHDCapableIdentity()` structural type guard replaces the old `looksLikeVanillaHDDescriptor` + `instanceof SeedIdentity` check; the four descriptor-aware identity methods (`isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`) are now `@deprecated` — kept only as backing for `DescriptorProvider`; `prepareUnrollTransaction` `Math.ceil`s the fee rate before `BigInt(...)` so fractional sat/vB no longer throws `RangeError`. 0.4.26 ships ESM-compatible declaration imports (build script `scripts/add-extensions.js` now rewrites `.d.ts` import specifiers, fixing typed consumption under `"moduleResolution": "node16" / "bundler"`) plus typedoc polish and `as const` on `DEFAULT_ARKADE_HRP` / `DEFAULT_NETWORK_NAME`; **Tier 2 ownership gating (0.4.25)**: optional `WalletRepository` script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript` + `VtxoRepositoryKey`) implemented natively by all SDK backends (InMemory, IndexedDB, Realm, SQLite), with `getVtxosForContract` / `saveVtxosForContract` dispatch helpers and Tier 1 fallback for custom backends; surgical `IContractManager.refreshOutpoints` reconciliation + `VtxoManager.revalidateBeforeSettle` pre-flight (closes 60-second `VTXO_ALREADY_SPENT` retry loop); ownership-gated VTXO persistence via `vtxoOwnership.ts` (legacy address buckets can't leak wrong-script rows; multi-contract spends route per-script); unilateral exit bundle — `prepareUnrollTransaction` / `completeUnroll` split, regtest network arg fix, `isScriptValid === true` correctness; **breaking (0.4.23)**: asset amounts now `bigint`; new exports `TxWeightEstimator` / `VSize` / `timelockToSequence` / `sequenceToTimelock` |
| arkana-knowledge | Active | ✓ Production | AI assistant config + KB for Arkana on Hetzner CPX32 VPS, 17 active agents (new `issue-staleness` weekly sweep) |
| bluewallet | Active | ✓ Production | v8.0.0 on RN 0.85 (New Architecture); integrates @arkade-os/sdk 0.4.23 + @arkade-os/boltz-swap 0.3.26; Android 16kb-page-size ready |

---

## Versioning & Updates

This index should be updated when:
- New projects are added to the ecosystem
- Project relationships change
- Major architectural changes occur
- New capabilities are added to existing projects
- Project status changes (alpha → beta → stable)

**Last Updated**: 2026-06-30
**Version**: 1.6.7
**Maintained By**: Arkadian Documentation Team
