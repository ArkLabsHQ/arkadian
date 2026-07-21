# Ark TypeScript SDK — Development Workflow

## Prerequisites

1. **Node.js** 24 LTS (pinned via `.nvmrc` → `24.15.0`; root `engines.node` = `>=24.15.0 <25` for contributors; published `@arkade-os/sdk` `engines.node` widened to `>=22.12.0 <25` so downstream consumers on Node 22.x are not broken)
2. **pnpm** `>=10.25.0 <11` — `npm install -g pnpm@10.25.0`; root `packageManager` pins `pnpm@10.25.0`
3. **Docker** + Docker Compose v2 (for integration tests)
4. **Git submodules** — clone with `--recurse-submodules`; the `regtest/` submodule is the in-house arkade-regtest stack driven by `node regtest/regtest.mjs ...` (replaced the prior `nigiri`/`chopsticks`/`esplora` setup on 2026-06-01, commit `7e34960a`). CI runs `actions/checkout` with `submodules: recursive` and no longer installs Go / nigiri

## Setup

```bash
cd /path/to/ts-sdk        # repo root (monorepo)
pnpm install              # installs both packages/ts-sdk and packages/boltz-swap
```

The repo is a pnpm workspace monorepo (since 2026-05-22). Most commands below can be run from the repo root (fans out to both packages via `pnpm -r`) or scoped to a single package via `pnpm -C packages/ts-sdk <script>`.

## Building

```bash
# Root (both packages — boltz-swap depends on ts-sdk so ts-sdk builds first)
pnpm build                # = pnpm -r build

# Scoped to @arkade-os/sdk only
pnpm -C packages/ts-sdk build           # single-step tsup: dual ESM+CJS, per-entry .d.{ts,cts}
pnpm -C packages/ts-sdk typecheck       # tsc --noEmit (CI-gated before build)
pnpm -C packages/ts-sdk smoke:dist      # post-build dist-shape + singleton-identity smoke
```

Output is flat under `packages/ts-sdk/dist/` (e.g. `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`). Under the prior `tsc` build it was layered into `dist/esm/`, `dist/cjs/`, `dist/types/` (#496).

## Running Tests

```bash
# Root — both packages
pnpm test                 # unit + integration, both packages
pnpm test:unit            # = pnpm -r test:unit
pnpm test:integration     # ts-sdk cycle + boltz-swap cycle via scripts/regtest.sh

# Scoped to @arkade-os/sdk only
pnpm -C packages/ts-sdk test:unit
pnpm -C packages/ts-sdk test:watch
pnpm -C packages/ts-sdk test:coverage

# Integration (full cycle: reset + up + setup + test for ts-sdk only)
pnpm test:integration:ts-sdk            # root convenience for `scripts/regtest.sh ts-sdk cycle`

# Or run the cycle manually
pnpm regtest:up:ts-sdk
pnpm regtest:setup:ts-sdk
pnpm regtest:test:ts-sdk
pnpm regtest:down:ts-sdk

# Or invoke the per-package regtest scripts inside packages/ts-sdk
pnpm -C packages/ts-sdk regtest:start
pnpm -C packages/ts-sdk test:setup-docker
pnpm -C packages/ts-sdk test:integration-docker
pnpm -C packages/ts-sdk regtest:stop
```

## Code Quality

```bash
# Format (per-package; uses the root prettier config)
pnpm -C packages/ts-sdk format

# Lint — root fans out to both packages
pnpm lint                 # = pnpm -r lint
```

- Single root prettier config applied across both packages (the per-package configs were dropped in the monorepo dedupe)
- Husky for pre-commit hooks (root-installed via `pnpm install`)

## Git Workflow

### Branch Naming

```
feat/short-description
fix/issue-description
refactor/area-description
```

### Commit Convention

- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `test:` — Test changes
- `docs:` — Documentation

### Pre-commit Checklist

From the repo root (covers both packages):

```bash
pnpm -C packages/ts-sdk typecheck   # No TS errors (CI-gated per-package before build)
pnpm build                          # pnpm -r build — tsup builds both packages cleanly
pnpm -C packages/ts-sdk smoke:dist  # SDK dist shape + singleton invariants
pnpm -C packages/boltz-swap smoke:dist # boltz-swap dist smoke (added in 2026-05-22 monorepo CI)
pnpm test:unit                      # All unit tests pass (both packages)
pnpm -C packages/ts-sdk format
pnpm lint                           # No lint errors (both packages)
```

### PR Flow

1. Create feature branch from `main`
2. Make changes, ensure typecheck + build + tests pass
3. Push and create PR against `main`
4. CI runs `pnpm typecheck` → `pnpm build` → `pnpm smoke:dist` → `npm pack --dry-run --ignore-scripts` (publish-shape verification without re-running `prepack`) → **integration**. The integration job is a sharded matrix (split in `38674886`, buckets rebalanced in `ae505277`): the ts-sdk e2e suite runs across four parallel groups — **ark-core**, **arkade-assets** (asset / arkcash / liquidation), **settlement-delegation**, and **exit-providers-rotation** — each passing its `test_files` list to `pnpm run regtest:test:ts-sdk`; `boltz-swap` runs as a single group. `.github/workflows/ci.yml` pins `actions/checkout` / `actions/setup-node` / `pnpm/action-setup` at **v6** and reads the Node version from `.nvmrc` (Node 24).
5. npm package published on merge to `main`

## Releasing

Releases are **package-scoped** (since `cd29cda3` on 2026-05-22). The driver is `scripts/release.sh` → `scripts/release.mjs`. The release script runs `pnpm test:unit` (monorepo-wide) before publishing (`15ee8c63`).

```bash
# Boltz-only bugfix
pnpm run release -- boltz-swap patch

# SDK bump (also patches the dependent boltz-swap version)
pnpm run release -- sdk patch

# SDK prerelease (mirrors the prerelease tag into boltz-swap)
pnpm run release -- sdk prepatch --preid beta

# Bump both packages in the same cut
pnpm run release -- all patch

# Dry run / cleanup
pnpm release:dry-run
pnpm release:cleanup
```

The lockstep-only release flow (`843502e1`) that briefly preceded `cd29cda3` is gone — package-scoped is now the only supported form.

### CHANGELOG Discipline

Each release adds a section to the **per-package** `CHANGELOG.md` (`packages/ts-sdk/CHANGELOG.md` for `@arkade-os/sdk`; `packages/boltz-swap/CHANGELOG.md` for `@arkade-os/boltz-swap`) using the section-ordered, bolded-headline + root-cause style defined in `FOUNDATION.md` (see "Repo Guide Files" below). Sections are grouped — typically `### Fixes`, `### Features`, `### Refactors`, etc. — and each entry names the symptom or capability and explains the underlying cause, referencing affected files/classes by name where it adds context. Pre-0.4 history (0.3.x and earlier) lives in `git log` only and is not backfilled.

## Repo Guide Files

This repo follows a multi-AI agent guide pattern (mirroring `pietro909/trixie-wallet`):

- **`FOUNDATION.md`** — canonical agent guide (recurring workflow, version-bump conventions via `pnpm release`, CHANGELOG format, PR/commit conventions, directory map). Edit this file when conventions change.
- **`CLAUDE.md`** — thin pointer for Claude Code; imports `FOUNDATION.md` via the `@<file>` include directive.
- **`AGENTS.md`** — thin pointer for non-Claude agents (e.g. Codex).
- **`GEMINI.md`** — thin pointer for Gemini.

Agent scratch files remain gitignored: `TASKS.md`, `*.agents.md`, `REVIEW.md`.

## Building Documentation

TypeDoc output now lives under the monorepo `docs/` (aligned in `5fb76c0f`), generated from `packages/ts-sdk/`:

```bash
pnpm -C packages/ts-sdk docs:build   # typecheck + typedoc
pnpm -C packages/ts-sdk docs:open    # opens ../../docs/index.html (monorepo-level docs/)
```
