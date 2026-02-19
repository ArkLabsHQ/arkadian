# Documentation Sync History - Ark TypeScript SDK (@arkade-os/sdk)

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
