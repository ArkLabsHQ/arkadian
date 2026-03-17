# Arkade Explorer -- Testing Guide

## Overview

Arkade Explorer uses linting, type checking, and manual testing. No unit test framework is currently configured, though Vitest is the recommended addition. The primary quality mechanisms are:

1. **TypeScript Type Checking** -- Compile-time type safety (strict mode)
2. **ESLint** -- Code quality and style enforcement
3. **Manual Testing** -- UI/UX verification against live or local indexer

---

## Running Checks

### Linting

```bash
npm run lint
```

Runs ESLint with TypeScript-aware rules, React hooks rules, React Refresh rules, and zero warnings tolerance (`--max-warnings 0`).

### Type Checking

```bash
npx tsc --noEmit        # Standalone type check
npm run build            # Also runs tsc before vite build
```

### Full Validation

```bash
npm run lint && npx tsc --noEmit && npm run build
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
npm run dev
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

## Adding Tests (Recommended)

### Vitest Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

### Example Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders with success variant', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
```

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
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```
