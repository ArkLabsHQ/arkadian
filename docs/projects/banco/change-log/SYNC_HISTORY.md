# Banco — Sync History

## 2026-05-29 — ts-sdk bump: introspector → emulator rename completed in API and wire format
- **Range**: 86d4c7c3d01c45f52a6b22e103cb525839fd7dda..428ae68dd9ed63be2c3bc4e93345151cc20aed00
- **Commits analyzed**:
  - `738468a` update to lastest ts-sdk
  - `b928526` bump sdk
  - `428ae68` bump sdk
- **Changes captured**:
  - **Breaking API rename** (`introspector` → `emulator`) across the public surface and wire format. The previous sync had noted upstream-README-only Emulator terminology with SDK/wire still using `introspector`; that gap is now closed.
  - Wire format: TLV field `0x08` renamed `introspectorPubkey` → `emulatorPubkey` (same offset/size/semantics). Decode error message updated. Strict-parsing rule unchanged.
  - SDK types: `RestIntrospectorProvider` → `RestEmulatorProvider`, `IntrospectorPacket` → `EmulatorPacket`, `arkade.ArkadeVtxoInput.introspectors` → `emulators`.
  - `Maker`/`Taker` constructor 3rd arg renamed `introspectorUrl` → `emulatorUrl`; private field `introspector` → `emulator`; doc-comment examples updated.
  - Regtest overlay file renamed `docker-compose.introspector.yml` → `docker-compose.emulator.yml`; image switched to `ghcr.io/arkade-os/emulator:v0.0.1`; container name `emulator`, port 7073, `EMULATOR_*` env vars; `package.json` `regtest:*` scripts updated to reference the new file.
  - `README.md` removed the legacy-name footnote, renamed TLV table and code samples, and updated the regtest paragraph.
  - **ts-sdk source path change**: dependency moved from `github:louisinger/wallet-sdk#arkade-script-final` to `github:louisinger/wallet-sdk#arkade-script-final&path:/packages/ts-sdk` (upstream wallet-sdk became a monorepo; ts-sdk now lives under `packages/ts-sdk`).
  - **bigint asset amounts**: ts-sdk asset amounts are now `bigint`. `Maker.getOffers()` projects `Number(a.amount)` for the spendability view; `Taker.fulfillOffer()` accumulates collateral via `Number(a.amount)`. E2E tests issue/send/compare amounts using `BigInt(...)` or `n`-suffixed literals.
  - **E2E EventSource polyfill**: `test/e2e/utils.ts` installs a no-op `EventSource` stub on `globalThis` for Node (ts-sdk's `ContractWatcher` opens SSE subscriptions in the background; swap path is direct RPC, so the stub is sufficient).
  - E2E test sleeps tightened with `waitForVtxo(...)` for maker funding deterministically; assertions compare bigint asset amounts.
- **Files updated**: `docs/projects/banco/INDEX.md`, `docs/projects/banco/system/project_overview.md`, `docs/projects/banco/system/architecture.md`, `docs/projects/banco/system/swap-protocol.md`, `docs/projects/banco/testing/usage.md`, `docs/projects/banco/testing/how_to_run.md`, `docs/projects/banco/testing/how_to_test.md`, `docs/projects/banco/testing/troubleshooting.md`, `docs/projects/banco/change-log/last-sync.txt`, `docs/projects/banco/change-log/SYNC_HISTORY.md`, `docs/INDEX.md`

## 2026-05-26 — README restructure: Operator/Emulator terminology, strict TLV parsing
- **Range**: aab5d0e5f3da17b4f7efecc3c00d3044b51bc360..86d4c7c3d01c45f52a6b22e103cb525839fd7dda
- **Commits analyzed**:
  - `25dce56` Restructure README with clearer protocol overview and examples (#2)
  - `86d4c7c` fix prettier formatting in e2e test (#3)
- **Changes captured**:
  - Introduced **Operator** (arkd) and **Emulator** (introspector) role names from upstream README; noted SDK/wire format keep legacy `introspector` identifiers
  - Recorded explicit liveness-only trust model for Operator and Emulator (cannot redirect or steal funds)
  - Tightened TLV table semantics: `wantAsset`/`offerAsset` are serialized `AssetId` (not `txid:vout`), `cancelDelay` is a unix timestamp, `makerPublicKey` is required when cancel or exit is set, `exitTimelock` is 1B type (`0`=blocks, `1`=seconds) + 8B BE uint64
  - Added strict-parsing rule: decoders MUST reject unknown TLV types
  - Package.json `test` script now uses `--passWithNoTests` (no doc impact; recorded here only)
  - e2e test diff is prettier-only; no behavior changes
- **Files updated**: `docs/projects/banco/system/swap-protocol.md`, `docs/projects/banco/system/project_overview.md`, `docs/projects/banco/INDEX.md`, `docs/projects/banco/change-log/last-sync.txt`, `docs/INDEX.md`

## 2026-05-09 — Initial sync
- **Commit**: aab5d0e5f3da17b4f7efecc3c00d3044b51bc360
- **Action**: Project added to Arkadian documentation registry
- **Files created**: INDEX.md, system/, testing/, sop/ documentation
