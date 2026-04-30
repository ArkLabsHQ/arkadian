# Documentation Sync History - Boltz Backend

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
