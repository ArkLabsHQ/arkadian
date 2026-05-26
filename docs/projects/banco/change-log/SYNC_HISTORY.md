# Banco — Sync History

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
