# Arkade Boltz Swap — Testing Guide

## Test Structure

```
test/
├── arkade-lightning.test.ts      # Unit tests for ArkadeLightning
├── swap-manager.test.ts          # Unit tests for SwapManager
├── boltz-swap-provider.test.ts   # Unit tests for BoltzSwapProvider
└── e2e/
    ├── arkade-lightning.test.ts  # E2E tests for full swap flows
    ├── integration.test.ts       # Integration tests with real services
    └── setup.mjs                 # Regtest setup script
```

---

## Unit Tests

### Run Unit Tests
```bash
# Run all unit tests (excludes E2E)
pnpm test:unit

# Watch mode for development
pnpm test --watch

# Run specific test file
pnpm test test/swap-manager.test.ts
```

### What Unit Tests Cover
- **ArkadeLightning**: Business logic, error handling, swap orchestration
- **SwapManager**: Monitoring logic, event emission, retry mechanisms
- **BoltzSwapProvider**: API client methods, request/response parsing
- **Utilities**: Invoice decoding, signature generation, VHTLC helpers

### Mocking Strategy
Unit tests mock external dependencies:
- `BoltzSwapProvider` → Mocked API responses
- `Wallet` → Mocked contract repository
- `WebSocket` → Simulated connection/messages
- Timers → Vitest fake timers for fast execution

---

## Integration Tests

### Prerequisites
Integration tests require the regtest environment:

```bash
# Start regtest environment
pnpm regtest:up
pnpm regtest:setup

# Verify services are running
curl http://localhost:7070/v1/info      # arkd
curl http://localhost:9001/v1/info      # Boltz
```

### Run Integration Tests
```bash
# Run integration tests only
pnpm test:integration

# Or run all tests
pnpm test
```

### What Integration Tests Cover
- Real HTTP requests to Boltz API
- Real Arkade wallet operations (VTXO creation, VHTLC management)
- WebSocket connections and status updates
- End-to-end swap flows with real Bitcoin transactions
- VHTLC recovery and refund scenarios

### Services Required
- **Bitcoin (Nigiri)**: Bitcoin regtest node + Esplora
- **NBXplorer**: Wallet indexer
- **arkd-wallet**: Arkade wallet service
- **arkd**: Arkade server
- **Boltz Backend**: Submarine swap service

---

## E2E Tests

E2E tests cover complete user workflows:

### Test Scenarios
1. **Create Lightning Invoice**: Generate invoice, monitor payment, claim funds
2. **Send Lightning Payment**: Pay invoice, monitor settlement, handle errors
3. **VHTLC Recovery**: Resume pending swaps after crash/restart
4. **Swap Expiry**: Handle expired swaps and automatic refunds
5. **Concurrent Swaps**: Multiple swaps running simultaneously
6. **WebSocket Reconnection**: Handle network interruptions

### Run E2E Tests
```bash
# E2E tests are included in integration tests
pnpm test:integration
```

---

## Test Commands Reference

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Watch mode
pnpm test --watch

# Specific test file
pnpm test test/swap-manager.test.ts

# With coverage
pnpm test --coverage
```

---

## Regtest Environment Management

### Full Setup
```bash
# Build, start, and initialize
pnpm regtest
```

### Manual Steps
```bash
# 1. Build Docker images
pnpm regtest:build

# 2. Start services
pnpm regtest:up

# 3. Wait for services to be ready (60s)
sleep 60

# 4. Initialize wallets and fund
pnpm regtest:setup
```

### Stop and Clean
```bash
# Stop and remove volumes
pnpm regtest:down

# Or via docker compose
docker compose -f test.docker-compose.yml down -v
```

---

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ArkadeLightning } from '../src/arkade-lightning';

describe('ArkadeLightning', () => {
  it('should create Lightning invoice', async () => {
    const mockWallet = { /* ... */ };
    const mockProvider = { createReverseSubmarineSwap: vi.fn() };

    const lightning = new ArkadeLightning({
      wallet: mockWallet,
      swapProvider: mockProvider,
    });

    const result = await lightning.createLightningInvoice({ amount: 50000 });

    expect(result.invoice).toBeDefined();
    expect(result.amount).toBe(50000);
  });
});
```

### Integration Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { Wallet, SingleKey } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '../src';

describe('ArkadeLightning Integration', () => {
  it('should complete submarine swap', async () => {
    const wallet = await Wallet.create({
      identity: SingleKey.fromRandomBytes(),
      arkServerUrl: 'http://localhost:7070',
    });

    const swapProvider = new BoltzSwapProvider({
      apiUrl: 'http://localhost:9001',
      network: 'regtest',
    });

    const lightning = new ArkadeLightning({ wallet, swapProvider });

    const result = await lightning.createLightningInvoice({ amount: 50000 });
    expect(result.invoice).toMatch(/^lnbc/);

    // Further test logic...
  });
});
```

---

## Debugging Tests

### View Service Logs
```bash
# arkd logs
docker compose -f test.docker-compose.yml logs -f arkd

# Boltz logs
docker compose -f test.docker-compose.yml logs -f boltz-backend

# All logs
docker compose -f test.docker-compose.yml logs -f
```

### Debug Specific Test
```typescript
import { describe, it } from 'vitest';

describe.only('Debug Test', () => {
  it('should debug swap creation', async () => {
    console.log('Debugging...');
    // Test logic with verbose logging
  });
});
```

### Enable Verbose Logging
```typescript
// Set environment variable before running tests
process.env.DEBUG = 'boltz-swap:*';
```

---

## Test Coverage

### Run with Coverage
```bash
pnpm test --coverage
```

### Coverage Targets
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## Common Issues

### Issue: Docker services not starting
**Solution**:
```bash
docker compose -f test.docker-compose.yml down -v
docker system prune -f
pnpm regtest
```

### Issue: Tests timeout
**Solution**:
- Increase timeout in vitest.config.ts
- Verify services are healthy
- Check network connectivity

### Issue: WebSocket tests fail
**Solution**:
- Ensure Boltz backend is running
- Check WebSocket endpoint (ws://localhost:9001)
- Verify no firewall blocking connections

### Issue: VHTLC creation fails
**Solution**:
- Check arkd wallet is unlocked
- Verify wallet has sufficient balance
- Ensure arkd-wallet service is synced
