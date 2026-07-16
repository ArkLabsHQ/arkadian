# Arkade Explorer -- Development Workflow

## Prerequisites

- Node.js `>=24.15.0 <25` (pinned via `.nvmrc`; run `nvm use`)
- pnpm `10.29.2` (pinned via `packageManager` field; enable with `corepack enable`)

## Setup

```bash
git clone git@github.com:ArkLabsHQ/arkade-explorer.git
cd arkade-explorer
pnpm install
cp .env.example .env  # Configure VITE_INDEXER_URL and VITE_VERIFIED_ASSETS_URL
```

## Development Loop

```bash
# Start dev server with hot reload
pnpm dev
# Opens at http://localhost:5173

# Check formatting (Prettier — this is the lint gate)
pnpm lint

# Auto-fix formatting
pnpm format

# Type check (dedicated script)
pnpm typecheck

# Full validation (matches CI order)
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Build and Deploy

```bash
# Production build (runs tsc + vite build)
pnpm build

# Preview production build locally
pnpm preview

# Output: dist/ directory (static files ready for deployment)
```

## Docker Build

```bash
# Build image locally
docker build -t arkade-explorer .

# Run container
docker run -p 8080:80 arkade-explorer

# Or use pre-built image (multi-arch: linux/amd64 + linux/arm64)
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

CI (`.github/workflows/docker.yml`) publishes the GHCR image for both
`linux/amd64` and `linux/arm64` using `docker/setup-qemu-action` and
`docker/setup-buildx-action`.

The Dockerfile pins pnpm to `10.29.2` (matching `pnpm-lock.yaml`) instead of
`pnpm@latest`; pnpm 11.x treats unbuilt dependency scripts as a hard install
error. `esbuild` is also added to `onlyBuiltDependencies` in
`pnpm-workspace.yaml` so its postinstall (platform binary setup) runs under
pnpm 10.x. Bump these together if the lockfile's pnpm version changes.

Note: `netlify.toml` is intentionally left using npm in case pnpm is not
supported by the Netlify build environment.

## Code Style

- TypeScript strict mode (typechecked via `pnpm typecheck` = `tsc --noEmit`)
- Prettier for formatting (4-space indent, `.prettierrc`); `pnpm lint` = `prettier --check .`, `pnpm format` = `prettier --write .`. ESLint was removed in the ts-sdk toolchain alignment.
- TailwindCSS v4 for styling
- Component-per-file in `src/components/`
- Context providers in `src/contexts/`
- Custom hooks in `src/hooks/`
- Shared utilities in `src/lib/`
- Page components in `src/pages/`
- Type definitions in `src/types/`

## Making Changes

1. Edit source files in `src/`
2. Browser auto-refreshes via HMR
3. TypeScript errors shown in terminal
4. Run `pnpm format` (or `pnpm lint`) before committing

## Continuous Integration

`.github/workflows/ci.yml` runs on every push to `master` and on all pull
requests (including stacked PRs onto feature branches). It installs pnpm
`10.29.2`, uses the `.nvmrc` Node version, and runs, in order: **Lint (prettier)
→ Type-check → Build → Unit tests**. `.github/workflows/docker.yml` separately
publishes the multi-arch GHCR image.

## PR Workflow

1. Create feature branch from `main`
2. Implement changes
3. Run `pnpm lint` (prettier), `pnpm typecheck`, and `pnpm test`
4. Test locally with `pnpm dev` (check all affected routes)
5. Build check: `pnpm build`
6. Open PR against `main`

## PR Checklist

- [ ] Formatting passes (`pnpm lint` / `pnpm format`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] Tested manually in browser
- [ ] Tested responsive layout (mobile/desktop)
- [ ] No console errors or warnings
