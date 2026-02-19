# Documentation Sync History - Fulmine

## 2026-02-19 - Documentation Update
**Commit**: `193e6178` (fulmine repository)
**Previous Sync**: `98632b68`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 25 commits

**Features Added**:
- Chain Swaps (#369): Ark ↔ BTC direct swaps with full lifecycle (create, list, refund, recovery)
- Delegator Service (#361, #372): Separate gRPC/REST service for VTXO refresh delegation on port 7002
- GetVtxos RPC (#364): Filter VTXOs by state (spendable, spent, recoverable)
- NextSettlement RPC (#363): Query next scheduled settlement time
- SettleVHTLC RPC: Settle VHTLCs via claim or delegate refund paths
- ListDelegates RPC: List delegator tasks by status with pagination
- OpenTelemetry support (#348): Full OTEL SDK (traces, metrics, logs) + Pyroscope profiling
- Renew VHTLC (#359): VHTLC renewal capability
- Swap restoration (#322): Recovery of swap state after restart
- E2E Tests (#334): End-to-end test framework
- .env files (#335): Environment file support (dev.env, dev.2.env, mutinynet.env)

**Breaking Changes**:
- ⚠️ Delegate RPCs moved from Service to separate DelegatorService (GetDelegatePublicKey, WatchAddressForRollover, UnwatchAddress, ListWatchedAddresses removed from service.proto)
- ⚠️ `TransactionInfo.settled` (bool) changed to `settled_by` (string) in types.proto

**Bug Fixes**:
- Fix check for scheduling next settlement (#366, #355)
- Handle recoverable VHTLCs in claim and refund APIs (#365)
- Fix GetAddress: return invoice only if amount is specified (#357)
- Fix submarine swap cooperative refund (#330)

**Go Version**:
- Updated from Go 1.25.3 to Go 1.25.7

**New Configuration Options**:
- `FULMINE_DELEGATOR_ENABLED` (default: false)
- `FULMINE_DELEGATOR_PORT` (default: 7002)
- `FULMINE_DELEGATOR_FEE` (default: 0)
- `FULMINE_OTEL_COLLECTOR_URL` (OTEL collector endpoint)
- `FULMINE_OTEL_PUSH_INTERVAL` (default: 10s)
- `FULMINE_PYROSCOPE_URL` (profiling endpoint)

**Files Updated**:
- docs/INDEX.md (capabilities, tags, triggers)
- docs/projects/fulmine/INDEX.md (version bump, sync commit, new concepts)
- docs/projects/fulmine/system/project_overview.md (chain swaps, delegator, telemetry)
- docs/projects/fulmine/system/architecture.md (delegator, telemetry, chain swap domain)
- docs/projects/fulmine/system/configuration.md (new env vars)
- docs/projects/fulmine/system/swap-system.md (chain swap section)
- docs/projects/fulmine/testing/api-reference.md (new endpoints)
- docs/projects/fulmine/change-log/last-sync.txt
- docs/projects/fulmine/change-log/SYNC_HISTORY.md

---

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `98632b68` (fulmine repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 27 commits (last 60 days)

**Features Added**:
- pprof profiling endpoint support (`FULMINE_ENABLE_PPROF`)
- Periodic database refresh option (`FULMINE_ENABLE_PERIODIC_REFRESH`)
- Resume scheduled unilateral refunds at wallet unlock

**Bug Fixes**:
- Fixed boarding UTXO expiry handling
- Fixed VTXO proto mapping
- Fixed SendOffchain endpoint (VTXO sorting)
- Fixed submarine swap flow
- Fixed compute next expiry & settlement
- Fixed swap storage and migration in SQLite
- Fixed reverse swap amount persistence
- Fixed sdk.Receive usage
- Fixed sentry enabled log
- Fixed lnurl config with predefined port
- Refactored vHTLC handling and database schema

**Dependency Updates**:
- Multiple go-sdk version bumps
- ark-lib updates in pkg/vhtlc
- gRPC package updates with proper health handler implementation

**Files Updated**:
- docs/projects/fulmine/INDEX.md (added sync metadata)
- docs/projects/fulmine/system/configuration.md (new env vars)
- docs/projects/fulmine/change-log/last-sync.txt
- docs/projects/fulmine/change-log/SYNC_HISTORY.md

---

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
- Use `arkadian-refresh-docs fulmine` to update after new commits
