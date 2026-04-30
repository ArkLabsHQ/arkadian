# Documentation Sync History - bluewallet

## 2026-04-30 - Initial Documentation Setup
**Commit**: `cce2f216` (BlueWallet repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /add-project skill
**Status**: Baseline established

**Initial Files Created**:
- `docs/projects/bluewallet/INDEX.md`
- `docs/projects/bluewallet/system/project_overview.md`
- `docs/projects/bluewallet/system/architecture.md`
- `docs/projects/bluewallet/system/integration-with-arkd.md`
- `docs/projects/bluewallet/testing/usage.md`
- `docs/projects/bluewallet/testing/how_to_run.md`
- `docs/projects/bluewallet/testing/how_to_test.md`
- `docs/projects/bluewallet/testing/troubleshooting.md`
- `docs/projects/bluewallet/sop/development-workflow.md`
- `docs/projects/bluewallet/change-log/last-sync.txt`
- `docs/projects/bluewallet/change-log/SYNC_HISTORY.md`

**Master INDEX Updates**:
- Added `bluewallet` entry after `rust-sdk` in the Project Registry
- Updated Dependency Graph to include bluewallet under "Downstream consumers of @arkade-os/sdk"
- Added entry to Technology Groupings (Mobile / React Native + Bitcoin Wallet Apps)

**Notes**:
- BlueWallet is a popular open-source Bitcoin & Lightning wallet for iOS, Android, and macOS (via Mac Catalyst)
- Built with React Native and Electrum; package version 8.0.0; Node >= 20
- **Significant Ark integration**: dedicated `LightningArkWallet` class extending `LightningCustodianWallet`
- Uses `@arkade-os/sdk` 0.4.16 (with Expo adapters) and `@arkade-os/boltz-swap` 0.3.17
- Realm-backed repositories for Ark wallet, contract, and swap state
- Background swap reconciliation via custom queue + foreground polling fallback
- Default endpoints: `arkade.computer` (arkd), `delegate.arkade.money` (delegator), `api.ark.boltz.exchange` (Boltz)
- Repository env var: `${BLUEWALLET_REPO}` — not yet defined; recommend adding to local `.env`
- GitHub: `BlueWallet/BlueWallet`; Website: `bluewallet.io`; License: MIT
