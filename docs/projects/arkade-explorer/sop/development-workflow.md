# Arkade Explorer - Development Workflow

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd arkade-explorer
npm install
cp .env.example .env  # Configure VITE_INDEXER_URL
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
```

## Build & Deploy

```bash
# Production build
npm run build

# Preview production build locally
npm run preview

# Output: dist/ directory (static files)
```

## Code Style

- TypeScript strict mode
- ESLint with React hooks plugin
- TailwindCSS v4 for styling
- Component-per-file in `src/components/`
- Shared utilities in `src/lib/`

## PR Workflow

1. Create feature branch from `main`
2. Implement changes
3. Run `npm run lint` and `npx tsc --noEmit`
4. Test locally with `npm run dev`
5. Build check: `npm run build`
6. Open PR against `main`
