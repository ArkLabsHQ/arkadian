# Ark TypeScript SDK — Testing Guide

## Test Framework

- **Vitest** — Test runner with v8 coverage
- **Configuration**: `vitest.config.ts`
- **Setup**: `test/polyfill.js` (crypto polyfills)
- **Globals**: Enabled (no imports needed for describe, it, expect)
- **Parallelism**: Disabled (`fileParallelism: false`)

## Test Structure

```
test/
├── polyfill.js             # Crypto polyfill setup
├── setup.mjs               # Integration test environment setup
├── fixtures/               # Test fixtures and data
├── e2e/                    # End-to-end integration tests
├── serviceWorker/          # Service worker tests
├── address.test.ts         # Address encoding/decoding
├── asset.test.ts           # Asset operations
├── esplora.test.ts         # Esplora provider
├── fee.test.ts             # Fee calculation
├── musig2.test.ts          # MuSig2 signing
├── note.test.ts            # ArkNote serialization
├── seedIdentity.test.ts    # HD identity derivation
├── singlekey.test.ts       # SingleKey identity
├── tapscript.test.ts       # Tapscript construction
├── transactionHistory.test.ts # Transaction history
├── verifySignatures.test.ts   # Signature verification
├── vhtlc.test.ts           # VHTLC contracts
├── vtxo-manager.test.ts    # VTXO renewal/recovery
└── wallet.test.ts          # Wallet operations
```

## Running Tests

### Unit Tests

```bash
# All unit tests
pnpm test

# Unit tests only (excludes integration)
pnpm test:unit

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Integration Tests (Nigiri + Ark)

```bash
# Start regtest
nigiri start --ark

# Setup test environment
pnpm test:setup

# Run integration tests
pnpm test:integration

# Cleanup
nigiri stop --delete
```

### Integration Tests (Docker Compose)

```bash
# Start nigiri (bitcoin layer)
nigiri start

# Start Ark stack
pnpm test:up-docker

# Setup
pnpm test:setup-docker

# Run tests
pnpm test:integration-docker

# Cleanup
pnpm test:down-docker
nigiri stop --delete
```

## Coverage

```bash
pnpm test:coverage
```

Coverage uses v8 provider and generates text + HTML reports. Excludes:
- `node_modules/`
- `dist/`
- `*.test.ts`, `*.spec.ts`
- `__tests__/` directories

## Key Test Areas

| Test File | What It Tests |
|-----------|---------------|
| `wallet.test.ts` | Wallet creation, balance, sending |
| `musig2.test.ts` | MuSig2 nonce generation, partial signing |
| `tapscript.test.ts` | Tapscript construction, CSV/CLTV variants |
| `address.test.ts` | Ark address encoding/decoding |
| `seedIdentity.test.ts` | BIP39 mnemonic, BIP86 derivation |
| `vtxo-manager.test.ts` | VTXO renewal, recovery, expiry detection |
| `asset.test.ts` | Asset issuance, reissuance, burn |
| `vhtlc.test.ts` | Virtual Hash Time-Locked Contracts |
| `e2e/` | Full integration with regtest arkd |

## Writing Tests

```typescript
// test/my-feature.test.ts
describe('MyFeature', () => {
  it('should do something', () => {
    // vitest globals are available (describe, it, expect)
    expect(result).toBe(expected)
  })
})
```

No need to import vitest functions — globals are enabled in config.
