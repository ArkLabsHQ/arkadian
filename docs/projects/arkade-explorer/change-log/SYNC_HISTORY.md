# Arkade Explorer -- Sync History

## 2026-04-29 -- Incremental Documentation Sync
**Commit**: `12f198ca63a0c0ccd1ebeab066947279a0569f10`
**Previous Sync**: `67202183eb3b275df0dc4bff2d2883262cd19518`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits
- `12f198c` fix: support asset ID lookup in search bar (#20)
- `2dd23d8` ci: add multi-arch Docker build (amd64 + arm64) (#14)
- `fd56d66` feat: improve asset display across tx detail, VTXO list, and search

**Changes**:
- Smart search now validates asset IDs as exactly 68 hex chars via new `isValidAssetId()` in `src/lib/validation.ts` (previously docs said "65+ hex chars")
- Outpoint search (`txid:vout`) now strips the `:vout` suffix and navigates to `/tx/:txid`
- Search placeholders updated to "Search txid, address, asset, or outpoint..."
- Asset display unified across tx detail, VTXO list, and Packet section: `AssetAmountDisplay` (ticker + icon) replaces raw "X units · assetId"; `AssetBadge` used for per-output "Asset" badges and extension-type badges in the Packet card header; "Packet" rename from "Asset packet"; asset amounts shown inline in VTXO table/dense rows
- CI publishes multi-arch GHCR image (`linux/amd64` + `linux/arm64`) via `docker/setup-qemu-action` + `docker/setup-buildx-action`

**Files Updated**:
- docs/projects/arkade-explorer/INDEX.md
- docs/projects/arkade-explorer/system/project_overview.md
- docs/projects/arkade-explorer/system/architecture.md
- docs/projects/arkade-explorer/system/components.md
- docs/projects/arkade-explorer/testing/usage.md
- docs/projects/arkade-explorer/testing/how_to_run.md
- docs/projects/arkade-explorer/sop/development-workflow.md
- docs/projects/arkade-explorer/change-log/last-sync.txt
- docs/projects/arkade-explorer/change-log/SYNC_HISTORY.md
- docs/INDEX.md (arkade-explorer entry)

---

## 2026-03-13 -- Full Documentation Sync
**Commit**: `8cb34832ebd5b523f541fe6e362348be8c7ff86e`
**Previous Sync**: `16e0d184cbd74e6488977899974badb7f66ac20b`
**Synced By**: /add-project command
**Status**: Completed

**Changes**:
- Updated all documentation to reflect current project state
- Added Asset Explorer page and components (AssetPage, AssetDetails, AssetBadge, AssetAmountDisplay)
- Documented 5 React Context providers (Theme, MoneyDisplay, ServerInfo, ActivityStream, AssetIconApproval)
- Documented 3 custom hooks (useAssetDetails, useDebounce, useRecentSearches)
- Added integration-with-arkd.md documenting Indexer API integration
- Updated INDEX.md with version 1.1.0, new routes (/asset/:assetId), full directory structure
- Updated architecture.md with context provider hierarchy and data flow
- Updated components.md with all new UI components (ParticleRain, MoneyDisplay, MoneyUnitToggle, ImageLightbox, etc.)
- Updated tech-stack.md with @arkade-os/sdk ^0.4.0-next.7 and pnpm Docker builds
- Updated usage.md with VITE_VERIFIED_ASSETS_URL and Docker deployment
- Updated how_to_run.md with Docker pre-built image from GHCR
- Updated how_to_test.md with asset page testing checklist
- Updated troubleshooting.md with asset icon troubleshooting
- Updated development-workflow.md with Docker build workflow
- Created tasks/.gitkeep and pr-report/.gitkeep
- Updated master INDEX.md with corrected repository path and technology groupings

**Files Updated**:
- docs/projects/arkade-explorer/INDEX.md
- docs/projects/arkade-explorer/system/project_overview.md
- docs/projects/arkade-explorer/system/architecture.md
- docs/projects/arkade-explorer/system/tech-stack.md
- docs/projects/arkade-explorer/system/components.md
- docs/projects/arkade-explorer/system/integration-with-arkd.md (new)
- docs/projects/arkade-explorer/testing/usage.md
- docs/projects/arkade-explorer/testing/how_to_run.md
- docs/projects/arkade-explorer/testing/how_to_test.md
- docs/projects/arkade-explorer/testing/troubleshooting.md
- docs/projects/arkade-explorer/sop/development-workflow.md
- docs/projects/arkade-explorer/change-log/last-sync.txt
- docs/projects/arkade-explorer/change-log/SYNC_HISTORY.md
- docs/projects/arkade-explorer/tasks/.gitkeep (new)
- docs/projects/arkade-explorer/pr-report/.gitkeep (new)
- docs/INDEX.md (updated arkade-explorer entry)

---

## 2026-02-19 -- Initial Documentation Sync
**Commit**: `16e0d184cbd74e6488977899974badb7f66ac20b`
**Previous Sync**: `initial`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 14 commits (full project history)

**Changes**:
- Established initial sync baseline
- Updated project_overview.md with theme toggle, OP_RETURN handling, spent status features
- Updated architecture.md with ThemeToggle component and arkAddress utility
- Updated INDEX.md with arkAddress.ts in directory structure
- Created sop/development-workflow.md (was missing)
- Created change-log tracking files

**Files Updated**:
- docs/projects/arkade-explorer/system/project_overview.md
- docs/projects/arkade-explorer/system/architecture.md
- docs/projects/arkade-explorer/INDEX.md
- docs/projects/arkade-explorer/sop/development-workflow.md (new)
- docs/projects/arkade-explorer/change-log/last-sync.txt (new)
- docs/projects/arkade-explorer/change-log/SYNC_HISTORY.md (new)
