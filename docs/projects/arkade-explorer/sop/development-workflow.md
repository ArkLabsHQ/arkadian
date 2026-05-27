# Arkade Explorer -- Development Workflow

## Prerequisites

- Node.js 18+
- pnpm

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

# Run linting
pnpm lint

# Type check (via TypeScript compiler)
pnpm exec tsc --noEmit

# Full validation
pnpm lint && pnpm exec tsc --noEmit && pnpm build
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

- TypeScript strict mode
- ESLint with React hooks and react-refresh plugins
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
4. Run `pnpm lint` before committing

## PR Workflow

1. Create feature branch from `main`
2. Implement changes
3. Run `pnpm lint` and `pnpm exec tsc --noEmit`
4. Test locally with `pnpm dev` (check all affected routes)
5. Build check: `pnpm build`
6. Open PR against `main`

## PR Checklist

- [ ] Lint passes (`pnpm lint`)
- [ ] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Tested manually in browser
- [ ] Tested responsive layout (mobile/desktop)
- [ ] No console errors or warnings
