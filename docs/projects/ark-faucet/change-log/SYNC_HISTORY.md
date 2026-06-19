# Documentation Sync History - Ark Faucet

## 2026-06-19 - intent-fee auto-management + server-side logging
**Commit**: `b7494c2498c657c768ab2b118090cc1c95909106` (from `0b2382369b321b7a7e30a65ac609955928853b2d`)
**Synced By**: update-project skill
**Status**: Docs updated

**Commits analyzed** (2):
- `7770b93` fix: fund /refill against fee-charging arkd by auto-managing intent fees
- `8a97be8` feat: log every request and error server-side

**Changes made**:
- Refill paths now auto-manage arkd intent fees: read (`GET /v1/admin/intentFees`), zero (`"0.0"` literals), redeem, then restore — serialized via a mutex so concurrent refills can't strand fees at zero. Avoids `INTENT_INSUFFICIENT_FEE` / later "missing vtxos". Falls back to an unguarded redeem when the endpoint is unavailable. Admin-API calls share a new `adminDo` helper.
- Server-side logging added: a `loggingMiddleware` logs one line per request (method, path, status, latency); all error responses route through a `writeError` helper (5xx error level, 4xx warn).
- Updated: system/{architecture,api-design,project_overview}.md, testing/troubleshooting.md, project INDEX.md, master docs/INDEX.md. (`ARK_FAUCET_LOG_LEVEL`-based debug instructions corrected in troubleshooting.md.)

## 2026-06-18 - arkade-regtest + admin-URL refill sync
**Commit**: `0b2382369b321b7a7e30a65ac609955928853b2d` (from `634c403bc901b129b0de2bd34f22375f43cb7cca`)
**Synced By**: update-project skill
**Status**: Docs updated

**Commits analyzed** (9):
- `a758ab6` build: add arkade-regtest submodule and dev/e2e make targets
- `4208a4b` refactor: extract `NewHandler` so the HTTP API is importable + tested
- `3800783` fix: mint refill notes against arkd admin url; drop datadir gate; stop logging notes
- `c14b62d` test: add e2e exercising address/refill/faucet/balance against arkade-regtest
- `92805eb` ci: run e2e against arkade-regtest ark profile on PRs
- `1293572` ci: build and push multi-arch image to ghcr.io/arklabshq/ark-faucet
- `703f229` docs: document arkade-regtest workflow and ARK_FAUCET_SERVER_ADMIN_URL
- `53d944b` chore: keep superpowers plans/specs out of version control
- `2716bdd` fix: address review — TLS gates on admin URL, refill bounds, CORS, faucet validation

**Changes made**:
- New env var `ARK_FAUCET_SERVER_ADMIN_URL` (admin API URL for `/refill`; falls back to `SERVER_URL`); documented `ARK_FAUCET_LOG_LEVEL`.
- `/refill` now mints against the admin URL; `ARK_FAUCET_SERVER_DATADIR`/macaroon now optional (works against NO_MACAROONS arkd like arkade-regtest); removed the old "404 without datadir" claim.
- TLS gating now keyed on the admin URL scheme; `/refill` rejects amounts above uint32 max; `/faucet` rejects empty address/zero amount.
- HTTP API extracted to `pkg/handler.go` (`NewHandler`); added `/healthcheck` and CORS; all success responses are `{"txid": "..."}` (was `{"message": ...}`).
- Local dev/test now via vendored arkade-regtest submodule (`make regtest-up/down`, `make run`, `make e2e`); removed stale `make docker-build`/`make docker-run` targets; image published to `ghcr.io/arklabshq/ark-faucet`.
- Updated: system/{configuration,architecture,api-design,project_overview}.md, testing/{api-reference,usage,how_to_run}.md, sop/development-workflow.md, project INDEX.md, master docs/INDEX.md.

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: ``
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs ark-faucet` to update after new commits
