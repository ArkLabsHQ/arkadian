# boltz-swap -- Development Workflow

## Prerequisites

- Node.js >= 22
- pnpm 10.25.0 (`corepack enable && corepack prepare pnpm@10.25.0 --activate`)
- Docker + Docker Compose (for e2e tests)

## Setup

```bash
git clone git@github.com:arkade-os/boltz-swap.git
cd boltz-swap
pnpm install
```

## Build

```bash
pnpm run build
# Produces: dist/index.js (ESM), dist/index.cjs (CJS), dist/index.d.ts
```

## Test

```bash
# Unit tests (fast, no Docker needed)
pnpm test:unit

# Full regtest setup for e2e
pnpm regtest

# E2E tests (requires regtest running)
pnpm test:integration

# All tests
pnpm test

# Tear down regtest
pnpm regtest:down
```

## Code Quality

```bash
pnpm run format     # Auto-format with Prettier
pnpm run lint       # Check formatting (CI check)
```

## Release

```bash
pnpm run release           # Build + publish
pnpm run release:dry-run   # Dry run
pnpm run release:cleanup   # Clean up release artifacts
```

## PR Checklist

- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] Code formatted (`pnpm run lint`)
- [ ] Types build cleanly (`pnpm run build`)
- [ ] E2E tests pass if swap logic changed (`pnpm test:integration`)
- [ ] Breaking API changes documented
- [ ] Error types include `isRefundable`/`isClaimable` flags where appropriate
- [ ] Runtime type guards added for any new API response types
- [ ] SwapManager integration tested if adding new swap type
