# Ark TypeScript SDK — Testing Guide

## Test Framework

- **Vitest** — Test runner with v8 coverage
- **Configuration**: `vitest.config.ts`
- **Setup**: `test/polyfill.js` (crypto polyfills)
- **Globals**: Enabled (no imports needed for describe, it, expect)
- **Parallelism**: Disabled (`fileParallelism: false`)

All paths in this document are relative to the SDK package: `packages/ts-sdk/` in the monorepo (since 2026-05-22). Commands shown without `pnpm -C packages/ts-sdk` are root-level monorepo aggregates that fan out to both packages.

## Test Structure

```
packages/ts-sdk/test/
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
# Root — both packages
pnpm test:unit                        # = pnpm -r test:unit

# Scoped to @arkade-os/sdk only
pnpm -C packages/ts-sdk test          # vitest run (full suite)
pnpm -C packages/ts-sdk test:unit     # excludes test/e2e
pnpm -C packages/ts-sdk test:watch
pnpm -C packages/ts-sdk test:coverage
```

### Integration Tests (Nigiri + Ark, quick dev cycle)

```bash
# Start regtest
nigiri start --ark

# Setup test environment (scoped to ts-sdk)
pnpm -C packages/ts-sdk test:setup

# Run integration tests (scoped)
pnpm -C packages/ts-sdk test:integration

# Cleanup
nigiri stop --delete
```

### Integration Tests (Root-level monorepo regtest driver)

```bash
# Full cycle for ts-sdk (reset + up + setup + test)
pnpm test:integration:ts-sdk          # = bash scripts/regtest.sh ts-sdk cycle

# Both packages
pnpm test:integration                 # ts-sdk cycle + boltz-swap cycle
```

### Integration Tests (Per-package Docker Compose)

```bash
# In-package regtest scripts (packages/ts-sdk)
pnpm -C packages/ts-sdk regtest:start          # ./regtest/start-env.sh
pnpm -C packages/ts-sdk test:setup-docker
pnpm -C packages/ts-sdk test:integration-docker
pnpm -C packages/ts-sdk regtest:stop           # ./regtest/stop-env.sh
pnpm -C packages/ts-sdk regtest:clean
```

## Coverage

```bash
pnpm -C packages/ts-sdk test:coverage
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
| `e2e/` | Full integration with regtest arkd; includes `e2e/electrum.test.ts` (ElectrumOnchainProvider over nigiri's electrum-ws bridge on port 50003) and `e2e/onchain.test.ts` (Esplora) |

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
