# Banco — Development Workflow

## Setup

1. Clone with submodules: `git clone --recurse-submodules`
2. Install: `pnpm install`
3. Build: `pnpm build`

## Development Cycle

```sh
pnpm test          # unit tests (watch mode: pnpm test:watch)
pnpm lint          # check formatting
pnpm format        # auto-format
pnpm build         # compile TypeScript (ESM + CJS)
```

## E2E Testing

```sh
pnpm regtest       # clean + start regtest stack
pnpm test:e2e      # run e2e tests
pnpm regtest:stop  # teardown
```

## CI Pipeline

GitHub Actions:
- `ci.yml` — Lint, build, unit tests, e2e tests with regtest
- `release.yml` — npm publish on release tags

## PR Workflow

1. Create feature branch
2. Make changes to `src/`
3. Run `pnpm lint && pnpm test`
4. Run `pnpm test:e2e` if touching maker/taker/offer logic
5. Push and create PR
