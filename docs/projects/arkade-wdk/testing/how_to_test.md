# Arkade WDK — How to Test

## Test Stack

| Tool | Role |
|------|------|
| Jest 29 | Test runner |
| ts-jest 29 | TypeScript transformer |
| `@jest/globals`, `@types/jest` | Type wiring |
| ESM mode | Enabled via `node --experimental-vm-modules node_modules/jest/bin/jest.js` |

## Commands

```bash
npm test               # one-shot
npm run test:watch     # watch mode
```

Both invoke Jest with `--experimental-vm-modules` to run ES modules.

## Current Known Issue

`jest.config.js` references a setup file (`src/__tests__/setup.ts`) that is not present in the repository. As a result, `npm test` currently fails during Jest's config validation step before any test can run.

To unblock testing locally:

1. Create the setup file, or
2. Remove the reference in `jest.config.js`.

This is a known footgun documented in `AGENTS.md`. Validate any fix is consistent with whatever upstream maintainers prefer before submitting a PR.

## Recommended Manual Verification (until the test config is fixed)

For root-only adapter changes, use this pragmatic loop:

1. `npm run build` — verify the package compiles.
2. `npm run lint` — verify no lint regressions.
3. **Optional:** write a short consumer harness that imports from `dist/` and calls a few account methods against a known Ark server (e.g. a regtest stack from `arkade-regtest`). The harness lives outside the repo and is not committed.

## Recommended Test Coverage Targets (once Jest is unblocked)

The adapter's surface that benefits most from automated tests:

- `src/lib/address.ts` — `isArkAddress`, `isBTCAddress`, `isLightningInvoice`, `decodeArkAddress` (deterministic, no network).
- `src/lib/bip21.ts` — `isBip21`, `decodeBip21`, `encodeBip21` (deterministic).
- `src/lib/bolt11.ts` — `isValidInvoice`, `decodeInvoice` (deterministic on canned invoices).
- `src/lib/lnurl.ts` — argument validation paths; mock `fetch` for `fetchInvoice` / `getCallbackUrl`.
- `src/lib/fees.ts` — fee math.
- `src/lib/format.ts` — sat formatting.
- `src/lib/send.ts` — `detectTransactionType` decision matrix.
- `src/wallet-manager-arkade.ts` — account resolution by index/path; placeholder `getFeeRates`.
- `src/wallet-account-arkade.ts` — destination routing inside `sendTransaction` (mock the SDK wallet).

E2E coverage of round/settlement behavior is the responsibility of `@arkade-os/sdk` and downstream RN integration tests; this adapter intentionally does not duplicate that.

## RN Integration Validation (Submodules)

For changes that touch RN integration, tests live (or should live) inside the submodules:

1. Build relevant package(s) under `packages/*`.
2. Re-link dependencies (`npm run setup:dev` at root, or manual `npm link`).
3. Run example app validation in `examples/wdk-starter-react-native`:
   - `npm run typecheck` (if available)
   - `npm run android` or `npm run ios` for manual verification.

If you are specifically validating `@arkade-os/wdk` (not `@wdk/wallet-btc`), make sure the provider's chain registration has been updated to use `WalletManagerArkade` for `bitcoin` — by default the example does not.

## CI

There is no CI configuration documented in the root README. PRs are expected to be validated locally via the build + lint + (eventually) Jest commands above.
