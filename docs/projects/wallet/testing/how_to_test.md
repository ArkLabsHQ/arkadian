# How to Test Arkade Wallet

## Testing Strategy

- **Unit Tests**: Component logic with mocked dependencies
- **Integration Tests**: SDK integration, data flow, IndexedDB operations
- **E2E Tests** (Future): Full user workflows with browser automation

## Running Tests

```bash
pnpm run test              # Run once
pnpm run test:ui           # Interactive UI mode
pnpm run test:coverage     # With coverage report
pnpm run test -- --watch   # Watch mode
```

View coverage: `open coverage/index.html`

## Test Structure

```
src/test/
├── components/      # Component tests
├── lib/             # Utility tests
├── screens/         # Screen tests
├── hooks/           # React hooks tests
└── setup.ts         # Test config
```

## Writing Tests

**Framework**: Vitest + Testing Library

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('SendScreen', () => {
  it('validates address', async () => {
    const user = userEvent.setup();
    render(<SendScreen />);

    await user.type(screen.getByLabelText('Address'), 'invalid');
    expect(screen.getByText('Invalid address')).toBeInTheDocument();
  });
});
```

**Mock Ark SDK:**
```typescript
vi.mock('@arkade-os/sdk', () => ({
  ArkClient: vi.fn().mockImplementation(() => ({
    getBalance: vi.fn().mockResolvedValue({ confirmed: 1000000 }),
    sendTransaction: vi.fn().mockResolvedValue({ txid: 'abc123' }),
  })),
}));
```

**Mock IndexedDB:**
```typescript
vi.mock('dexie', () => ({
  Dexie: class MockDexie {
    table() {
      return {
        toArray: vi.fn().mockResolvedValue([]),
        add: vi.fn().mockResolvedValue(1),
      };
    }
  },
}));
```

## Testing Patterns

**User interactions:**
```typescript
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: 'Send' }));
await user.type(screen.getByLabelText('Amount'), '0.001');
```

**Async assertions:**
```typescript
await screen.findByText('Transaction sent');
expect(screen.getByText('Success')).toBeInTheDocument();
expect(screen.queryByText('Error')).not.toBeInTheDocument();
```

## Coverage Goals

- **Core logic**: >80% (transactions, crypto, state)
- **Components**: >60% (UI, forms)
- **Overall**: >70% project coverage

## CI/CD Integration

**GitHub Actions:**
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm run test:coverage
      - run: pnpm run lint
```

**Pre-commit hooks** (`.husky/pre-commit`): `pnpm run test && pnpm run lint`
