# Arkade Explorer -- How to Run

## Development Server

### Quick Start

```bash
pnpm install      # First time only
pnpm dev          # Start dev server
```

The development server starts at `http://localhost:5173` with HMR, fast refresh, and source maps.

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 5173) |
| `pnpm build` | TypeScript check + Vite production build |
| `pnpm preview` | Preview production build (port 4173) |
| `pnpm lint` | Run ESLint |

---

## Production Build

```bash
pnpm build       # Runs tsc && vite build
ls dist/         # index.html, assets/, favicon
```

The build process: (1) runs TypeScript compiler for type checking, (2) runs Vite bundler for optimized output, (3) injects git commit hash into the bundle.

### Preview Production Build

```bash
pnpm preview
```

Opens at `http://localhost:4173` with production-optimized code.

---

## Environment Configuration

Create `.env` in project root:

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

Vite loads environment files in order: `.env` -> `.env.local` -> `.env.development` / `.env.production`. Only `VITE_` prefixed variables are exposed to the client. Restart dev server after changing `.env`.

### Running with Different Indexers

```bash
# Local indexer (regtest)
echo "VITE_INDEXER_URL=http://localhost:7070" > .env.local
pnpm dev

# Staging indexer
echo "VITE_INDEXER_URL=https://staging-indexer.arkadeos.com" > .env.local
pnpm dev

# Production (default .env)
pnpm dev
```

---

## Docker

### Pre-built Image

```bash
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

App available at `http://localhost:8080`.

### Local Docker Build

```bash
docker build -t arkade-explorer .
docker run -p 8080:80 arkade-explorer
```

The Dockerfile uses a multi-stage build: Node 22 Alpine with pnpm for building, nginx Alpine for serving. The nginx config handles SPA routing (all paths fallback to index.html).

The published GHCR image (`ghcr.io/arklabshq/arkade-explorer:latest`) is multi-arch (`linux/amd64` and `linux/arm64`); `docker run` will pull the variant matching your host automatically.

---

## IDE Setup

### VS Code Extensions
- ESLint
- Tailwind CSS IntelliSense
- TypeScript (built-in)

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## Troubleshooting

### Port Already in Use
```bash
lsof -i :5173                    # Find process
kill -9 <PID>                    # Kill it
pnpm dev -- --port 3000          # Or use different port
```

### Dependencies Not Found
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Fails
```bash
pnpm exec tsc --noEmit    # Check TypeScript errors
pnpm lint                 # Check lint errors
```

### Build Stats

| Metric | Value |
|--------|-------|
| Build Time | ~5-6 seconds |
| JS Bundle | ~261 KB (gzip: ~82 KB) |
| CSS Bundle | ~16 KB (gzip: ~4 KB) |
| HMR Speed | < 1 second |
