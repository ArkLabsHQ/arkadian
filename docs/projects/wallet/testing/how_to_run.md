# How to Run Arkade Wallet

## Prerequisites

- **Node.js**: Version 20+ (`node --version`)
- **pnpm**: Version 10.25.0+ (`pnpm --version`) - Install: `npm install -g pnpm`
- **Docker**: Required for E2E test environment (`docker --version`)

## Clone and Install

```bash
git clone https://github.com/arkade-os/wallet.git
cd wallet
pnpm install
```

## Development Mode

```bash
pnpm run start
```
Opens http://localhost:3002 with hot reload and auto-refresh

## Environment Variables

Create `.env` file:

```bash
VITE_ARK_SERVER=http://localhost:7070
VITE_BOLTZ_URL=https://api.testnet.boltz.exchange
VITE_SENTRY_DSN=your-sentry-dsn
GENERATE_SOURCEMAP=false
```

Variables with `VITE_` prefix are exposed to browser. Changes require restart.

## Build for Production

```bash
pnpm run build
```
Outputs to `dist/` folder with optimized, minified assets.

## Serve Production Build

**Using serve:**
```bash
npm install -g serve
serve -s dist -p 3002
```

**Using Python:**
```bash
cd dist && python -m http.server 3002
```

**Using nginx:**
```nginx
server {
    listen 80;
    root /path/to/dist;
    location / {
        try_files $uri /index.html;
    }
}
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t arkade-wallet .
docker run -d -p 80:80 arkade-wallet
```

## E2E Test Environment

The wallet now uses the shared `arkade-regtest` submodule for the regtest stack
plus a small `nak` Nostr relay docker compose. Initialize submodules once:

```bash
git submodule update --init --recursive
```

Then:

```bash
# Start arkade-regtest (nigiri + arkd + boltz + LND + fulmine) and nak relay
pnpm run regtest:start

# Seed test fixtures
pnpm run regtest:setup

# Run Playwright tests
pnpm exec playwright test

# Stop / clean
pnpm run regtest:stop      # stop containers
pnpm run regtest:clean     # stop + wipe volumes
```

Image versions and per-stack overrides live in `.env.regtest`.

## Common Commands

```bash
pnpm run lint           # Lint code
pnpm run format         # Format code
pnpm run format:check   # Check formatting
pnpm run build:worker   # Build web worker
```

## Troubleshooting

**Port in use:**
```bash
lsof -ti:3002 | xargs kill -9  # macOS/Linux
vite --port 3003               # Use different port
```

**Dependencies issues:**
```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Build failures:**
```bash
node --version              # Verify >= 20
rm -rf node_modules/.vite  # Clear cache
pnpm run build
```
