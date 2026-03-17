# Arkade Explorer -- Development Workflow

## Prerequisites

- Node.js 18+
- npm (or pnpm for Docker builds)

## Setup

```bash
git clone git@github.com:ArkLabsHQ/arkade-explorer.git
cd arkade-explorer
npm install
cp .env.example .env  # Configure VITE_INDEXER_URL and VITE_VERIFIED_ASSETS_URL
```

## Development Loop

```bash
# Start dev server with hot reload
npm run dev
# Opens at http://localhost:5173

# Run linting
npm run lint

# Type check (via TypeScript compiler)
npx tsc --noEmit

# Full validation
npm run lint && npx tsc --noEmit && npm run build
```

## Build and Deploy

```bash
# Production build (runs tsc + vite build)
npm run build

# Preview production build locally
npm run preview

# Output: dist/ directory (static files ready for deployment)
```

## Docker Build

```bash
# Build image locally
docker build -t arkade-explorer .

# Run container
docker run -p 8080:80 arkade-explorer

# Or use pre-built image
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

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
4. Run `npm run lint` before committing

## PR Workflow

1. Create feature branch from `main`
2. Implement changes
3. Run `npm run lint` and `npx tsc --noEmit`
4. Test locally with `npm run dev` (check all affected routes)
5. Build check: `npm run build`
6. Open PR against `main`

## PR Checklist

- [ ] Lint passes (`npm run lint`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Tested manually in browser
- [ ] Tested responsive layout (mobile/desktop)
- [ ] No console errors or warnings
