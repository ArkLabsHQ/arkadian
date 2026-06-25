# Arkade Explorer -- Testing Guide

## Overview

Arkade Explorer uses unit tests, linting, type checking, and manual testing. The primary quality mechanisms are:

1. **Vitest Unit Tests** -- Pure-logic unit tests for `src/lib/` utility modules
2. **TypeScript Type Checking** -- Compile-time type safety (strict mode)
3. **ESLint** -- Code quality and style enforcement
4. **Manual Testing** -- UI/UX verification against live or local indexer

---

## Running Checks

### Unit Tests (Vitest)

```bash
pnpm test          # Run all tests once (vitest run)
pnpm test:watch    # Watch mode (vitest)
```

Configured in `vitest.config.ts`: `node` environment, `@` aliased to `src/`, and `include: ['src/**/*.test.ts']`. Current suites cover the pure-logic utility modules:

- `src/lib/vtxo-aggregation.test.ts` -- active/total sums, per-asset balance aggregation, and the `hasMorePages` page-drain predicate
- `src/lib/cap-list.test.ts` -- list capping + hidden-count logic
- `src/lib/debounce.test.ts` -- trailing-edge debounce and `cancel()`

### Linting

```bash
pnpm lint
```

Runs ESLint with TypeScript-aware rules, React hooks rules, React Refresh rules, and zero warnings tolerance (`--max-warnings 0`).

### Type Checking

```bash
pnpm exec tsc --noEmit   # Standalone type check
pnpm build               # Also runs tsc before vite build
```

### Full Validation

```bash
pnpm lint && pnpm test && pnpm exec tsc --noEmit && pnpm build
```

---

## ESLint Configuration

Config file: `.eslintrc.cjs`

Key rules enforced:
- TypeScript strict mode (no implicit any, strict null checks)
- React hooks exhaustive deps and rules of hooks
- React refresh HMR-compatible exports
- No unused variables

---

## Manual Testing Checklist

### Homepage (`/`)
- Page loads without errors
- Search bar detects txid (64 hex), asset ID (65+ hex), and address
- Recent activity stream loads
- Feature cards and particle rain display
- Theme toggle works (light/dark)
- Money unit toggle works (sats/BTC)

### Transaction Search
- Valid 64-char txid routes to `/tx/` and auto-detects type
- Commitment transactions redirect to `/commitment-tx/`
- Invalid input shows appropriate feedback
- Header search works from any page

### Commitment Transaction Page (`/commitment-tx/:txid`)
- Transaction details load with timestamps, amounts, VTXO counts
- Batch list renders with expiration and swept status
- VTXO tree viewer displays
- Raw hex expands/collapses with copy button
- Loading spinner during fetch, error message on failure

### Address Page (`/address/:address`)
- Statistics load (balance, received, active/spent/swept counts)
- VTXO list renders with status badges
- Pagination works for addresses with many VTXOs
- Balance/received totals reflect ALL VTXOs (not just the first page)
- High-activity addresses (thousands of VTXOs/assets) load without crashing the browser; virtualized lists scroll smoothly
- Copy address button works
- Links to related transactions navigate correctly

### Asset Page (`/asset/:assetId`)
- Asset details load
- Asset amount display and badge render correctly
- Verified vs unverified asset icon handling works

### Cross-Browser
- Chrome, Firefox, Safari, Edge
- Mobile responsive layout

---

## Testing with Different Indexers

### Local Indexer

```bash
echo "VITE_INDEXER_URL=http://localhost:7070" > .env.local
pnpm dev
```

Test scenarios: valid transaction lookup, invalid transaction (404), address with multiple VTXOs, empty address, asset lookup.

### Network Error Simulation

1. Disconnect from network
2. Verify error states display correctly
3. Reconnect and verify recovery

### Slow Network Simulation

1. Browser DevTools -> Network -> "Slow 3G"
2. Verify loading spinners appear
3. Verify data eventually loads

---

## Adding Tests

Vitest is already configured (`node` environment). Co-locate new test files next to the code as `*.test.ts` under `src/` (matched by `include: ['src/**/*.test.ts']`). The current suites target pure logic in `src/lib/`; keep new tests dependency-light so they run without a DOM.

### Example Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { capList } from './cap-list';

describe('capList', () => {
  it('hides items beyond the cap unless expanded', () => {
    const { visible, hiddenCount } = capList([1, 2, 3, 4], 2, false);
    expect(visible).toEqual([1, 2]);
    expect(hiddenCount).toBe(2);
  });
});
```

> To test React components, add `jsdom` + Testing Library and switch the suite's environment to `jsdom`; the current `node` environment only supports non-DOM logic.

---

## CI Example

```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```
