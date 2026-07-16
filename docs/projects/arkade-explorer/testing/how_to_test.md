# Arkade Explorer -- Testing Guide

## Overview

Arkade Explorer uses unit tests, linting, type checking, and manual testing. The primary quality mechanisms are:

1. **Vitest Unit Tests** -- Pure-logic unit tests for `src/lib/` utility modules
2. **TypeScript Type Checking** -- Compile-time type safety (strict mode, `pnpm typecheck`)
3. **Prettier** -- Formatting check as the lint gate (`pnpm lint`); ESLint was removed in the ts-sdk toolchain alignment
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

### Formatting (lint gate)

```bash
pnpm lint      # prettier --check .
pnpm format    # prettier --write .
```

`pnpm lint` runs `prettier --check .` and fails CI if any file is unformatted.

### Type Checking

```bash
pnpm typecheck   # Standalone type check (tsc --noEmit)
pnpm build       # Also runs tsc before vite build
```

### Full Validation

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

---

## Formatting Configuration

Config files: `.prettierrc`, `.prettierignore`, `.editorconfig`

- Prettier 3.6.2 enforces formatting (4-space indentation) across the codebase
- `pnpm lint` = `prettier --check .` is the CI lint gate; `pnpm format` = `prettier --write .` auto-fixes
- TypeScript strictness (no implicit any, strict null checks, unused-var checks) is enforced separately via `pnpm typecheck` (`tsc --noEmit`)
- ESLint (`.eslintrc.cjs`, `@typescript-eslint`, react-hooks/react-refresh plugins) was removed in the ts-sdk toolchain alignment

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

## CI

The repo ships `.github/workflows/ci.yml`, which runs on `workflow_dispatch`,
pushes to `master`, and **all** pull requests (so stacked PRs onto feature
branches also get checks). It pins pnpm `10.29.2` and reads the Node version
from `.nvmrc` (`24.15.0`), then runs a single `check` job in order:

```yaml
name: CI
on:
  workflow_dispatch:
  push:
    branches: [master]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.29.2
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint        # prettier --check .
      - run: pnpm run typecheck    # tsc --noEmit
      - run: pnpm run build
      - run: pnpm run test
```

A separate `.github/workflows/docker.yml` publishes the multi-arch GHCR image.
