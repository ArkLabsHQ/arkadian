# Arkade WDK — How to Test

## Test Stack

| Tool | Role |
|------|------|
| `node:test` | Node's built-in test runner (no Jest, no extra deps) |
| `node:assert/strict` | Assertions |
| `mock` from `node:test` | Mocking inside specs |

Tests live in `src/__tests__/*.test.js` and run under stock Node (>= 18).

## Commands

```bash
npm test               # node --test src/__tests__/*.test.js
npm run test:watch     # node --test --watch src/__tests__/*.test.js
```

No `--experimental-vm-modules` flag, no `ts-jest`, no Jest config validation step. The previous Jest-related footgun (a missing `src/__tests__/setup.ts`) is gone — it was removed when the repo was converted to JavaScript with JSDoc.

## Current Test Specs

- `src/__tests__/bech32m.test.js` — Cross-checks `arkAddressToPkScript` (and the helper functions in `lib/bech32m.js`) against `ArkAddress` from `@arkade-os/sdk`. Keeps the inline RN bech32m decoder in lockstep.
- `src/__tests__/phase-0.test.js` — Phase-0 wiring tests (manager / account contracts, derivation paths, in-memory storage default, `getFeeRates`, etc.).
- `src/__tests__/wdk.test.js` — Integration with `@tetherto/wdk` `WdkManager` (registration, chaining, accounts of the right type).

`stubArkProvider` is used liberally so tests never make real network calls (e.g. `getInfo` returns `{ network: 'testnet', fees: { txFeeRate: '1' } }`).

## Recommended Coverage Targets

The adapter's surface that benefits most from automated tests:

- `src/lib/address.js` — `isArkAddress`, `isBTCAddress`, `isLightningInvoice`, `decodeArkAddress` (deterministic, no network).
- `src/lib/bech32m.js` — `bech32mDecode`, `bech32mFromWords`, `arkAddressToPkScript` (already covered).
- `src/lib/bip21.js` — `isBip21`, `decodeBip21`, `encodeBip21`.
- `src/lib/bolt11.js` — `isValidInvoice`, `decodeInvoice`.
- `src/lib/lnurl.js` — argument validation paths; mock `fetch` for `fetchInvoice` / `getCallbackUrl`.
- `src/lib/fees.js` — `parseFeeRate` boundary cases, fee math.
- `src/lib/format.js` — sat formatting.
- `src/lib/send.js` — `resolveDestination` BIP21 resolution + `detectTransactionType` decision matrix.
- `src/wallet-manager-arkade.js` — account caching by path, in-memory storage default, retry-on-getInfo, dispose semantics.
- `src/wallet-account-arkade.js` — destination routing inside `sendTransaction`, `transfer` calls into `wallet.send`, `toReadOnlyAccount` projection.

E2E coverage of round/settlement behavior is the responsibility of `@arkade-os/sdk` and downstream RN integration tests; this adapter intentionally does not duplicate that.

## RN Integration Validation (Submodules)

For changes that touch RN integration, tests live (or should live) inside the submodules:

1. Make changes inside the relevant submodule.
2. Re-link via `npm run setup:dev` at root (idempotent).
3. Run example app validation in `examples/wdk-starter-react-native`:
   - `npm run android` or `npm run ios` for manual verification.

The example app now drives the Arkade chain end-to-end (send/receive across boarding/offchain/lightning, BIP21 inputs).

## CI

There is no CI configuration documented in the root README. PRs are expected to be validated locally via `npm run lint` + `npm test`.
