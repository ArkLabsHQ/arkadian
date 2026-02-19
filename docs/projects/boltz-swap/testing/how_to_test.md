# boltz-swap -- Testing Guide

## Test Framework

- **vitest** with globals enabled
- **Environment**: Node.js
- **Setup**: `test/polyfill.js` (polyfills for test environment)
- **Config**: `vitest.config.ts`

## Running Tests

### All Tests (unit + e2e)

```bash
pnpm test
```

### Unit Tests Only

```bash
pnpm test:unit
```

Excludes `test/e2e/` directory. Runs tests in:
- `test/arkade-lightning.test.ts` -- Lightning swap logic
- `test/arkade-chainswap.test.ts` -- Chain swap logic
- `test/boltz-swap-provider.test.ts` -- Boltz API client
- `test/swap-manager.test.ts` -- SwapManager behavior

### Integration / E2E Tests

Requires regtest environment running:

```bash
# Start regtest first
pnpm regtest

# Run e2e tests
pnpm test:integration
```

E2E tests are in `test/e2e/`:
- `test/e2e/arkade-lightning.test.ts` -- End-to-end Lightning swaps
- `test/e2e/arkade-chainswap.test.ts` -- End-to-end chain swaps
- `test/e2e/swap-manager.test.ts` -- SwapManager with live services

### Regtest Setup

```bash
pnpm test:setup    # Run test/setupRegtestEnv.sh
```

## Test Structure

```
test/
  arkade-lightning.test.ts      # Unit: Lightning swap logic
  arkade-chainswap.test.ts      # Unit: Chain swap logic
  boltz-swap-provider.test.ts   # Unit: Boltz API client
  swap-manager.test.ts          # Unit: SwapManager
  polyfill.js                   # Test environment polyfills
  e2e/
    arkade-lightning.test.ts    # E2E: Lightning swaps on regtest
    arkade-chainswap.test.ts    # E2E: Chain swaps on regtest
    swap-manager.test.ts        # E2E: SwapManager on regtest
    setup.mjs                   # Regtest environment setup script
```

## Test Configuration

From `vitest.config.ts`:
- `globals: true` -- No need to import describe/it/expect
- `environment: "node"`
- `mockReset: true` -- Reset mocks between tests
- `restoreMocks: true` -- Restore original implementations after each test
- `setupFiles: ["./test/polyfill.js"]` -- Loaded before all tests
