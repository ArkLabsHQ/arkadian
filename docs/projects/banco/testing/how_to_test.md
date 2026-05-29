# Banco — How to Test

## Unit Tests

```sh
pnpm test
# Runs vitest, excludes test/e2e
```

## E2E Tests

Require running regtest environment (nigiri + arkd + emulator).

```sh
pnpm regtest:start    # boot stack
pnpm test:e2e         # run test/e2e/*
pnpm regtest:stop     # teardown
```

Test files:
- `test/e2e/banco.test.ts` — Full swap lifecycle tests
- `test/e2e/utils.ts` — Test utilities

## Coverage

```sh
pnpm test:coverage    # vitest with @vitest/coverage-v8
```

## Linting

```sh
pnpm lint     # prettier --check
pnpm format   # prettier --write
```

## Build

```sh
pnpm build    # ESM + CJS + type declarations
```
