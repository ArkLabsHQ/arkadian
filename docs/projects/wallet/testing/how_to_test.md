# How to Test Arkade Wallet

## Testing Strategy

- **Unit Tests** (Vitest): Component logic, utility functions, mocked dependencies
- **Screen Tests** (Vitest): Settings and wallet screen rendering with mock providers
- **E2E Tests** (Playwright): Full browser automation with Docker-based arkd backend

## Running Unit Tests

```bash
pnpm run test              # Run once
pnpm run test:ui           # Interactive UI mode
pnpm run test:coverage     # With coverage report
pnpm run test -- --watch   # Watch mode
```

View coverage: `open coverage/index.html`

## Running E2E Tests

The legacy nigiri `test.docker-compose.yml` walkthrough was removed in PR #689; E2E
now runs against the in-house `arkade-regtest` Node-CLI stack (provisions arkd + boltz
+ LND + fulmine automatically) plus the `nak` Nostr relay. The faucet is driven via the
Node CLI (`execFile` with an argument array), and the chain-swap tests assert the
split invariant (`Amount + Fees === Total`) instead of nigiri-Boltz-specific sat constants.

```bash
# Initialize submodules once
git submodule update --init --recursive

# Start the regtest stack + nak relay
pnpm run regtest:start     # node regtest/regtest.mjs start --env .env.regtest
pnpm run regtest:setup     # seed wallets/fixtures

# Run all E2E tests
pnpm exec playwright test

# Run specific E2E test
pnpm exec playwright test src/test/e2e/swap.test.ts

# Run with UI mode
pnpm exec playwright test --ui

# Stop / clean up (LIFO: docker-compose down, then the regtest stack)
pnpm run regtest:stop      # stop containers
pnpm run regtest:clean     # stop + wipe volumes
```

## Test Structure

```
src/test/
├── e2e/                 # Playwright E2E tests
│   ├── utils.ts         # Shared helpers (wallet setup, navigation)
│   ├── init.test.ts     # Wallet creation flow
│   ├── backup.test.ts   # Seed phrase backup
│   ├── restore.test.ts  # Wallet restoration
│   ├── send.test.ts     # Send Bitcoin flow
│   ├── receive.test.ts  # Receive flow
│   ├── swap.test.ts     # Lightning swap integration
│   ├── keyboard.test.ts # Keyboard navigation
│   ├── nostr.test.ts    # Nostr backup/restore
│   ├── pwa.test.ts      # PWA installation
│   └── serverdown.test.ts # Offline behavior
├── lib/                 # Utility unit tests
│   ├── address.test.ts
│   ├── fiat.test.ts
│   ├── utxo.test.ts
│   └── jsCapabilities.test.ts
├── screens/             # Screen component tests
│   ├── mocks.ts         # Shared mock providers
│   ├── settings/        # Settings screen tests
│   │   ├── about.test.tsx
│   │   ├── backup.test.tsx
│   │   ├── display.test.tsx
│   │   ├── fiat.test.tsx
│   │   ├── notifications.test.tsx
│   │   └── theme.test.tsx
│   └── wallet/
│       ├── send.test.tsx
│       └── transaction.test.tsx
├── fixtures.json        # Test fixture data
└── setup.mjs            # Test setup (mocks for SDK, IndexedDB, etc.)
```

## Writing Unit Tests

**Framework**: Vitest + Testing Library

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('SendScreen', () => {
  it('validates address', async () => {
    render(<SendScreen />);
    expect(screen.getByText('Invalid address')).toBeInTheDocument();
  });
});
```

## Writing E2E Tests

**Framework**: Playwright

```typescript
import { test, expect } from '@playwright/test';

test('can send bitcoin', async ({ page }) => {
  await page.goto('/');
  // ... wallet setup via utils.ts helpers
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByLabel('Address').fill('ark1...');
  await page.getByLabel('Amount').fill('1000');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Transaction sent')).toBeVisible();
});
```

## CI/CD Integration

**Unit Tests** (`.github/workflows/ci.yml`): Run on push/PR
**E2E Tests** (`.github/workflows/playwright.yml`): Run with Docker services

## Coverage Goals

- **Core logic**: >80% (transactions, crypto, state)
- **Components**: >60% (UI, forms)
- **E2E**: Cover all critical user flows (init, send, receive, swap, backup)
