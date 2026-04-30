# BlueWallet — How to Test

BlueWallet uses a layered test strategy: **lint → unit → integration → E2E**.

## Test Stack

| Layer | Framework | Location |
|-------|-----------|----------|
| Lint | ESLint + Prettier + tsc + custom unused-loc check | `*.{js,ts,tsx}` |
| Unit | Jest 29 | `tests/unit/` |
| Integration | Jest 29 | `tests/integration/` |
| E2E | Detox 20 | `tests/e2e/` (Android focus) |

## The "test" Script

```json
"test": "npm run lint && npm run unit && npm run integration"
```

`npm test` is the **CI gate**: lint + unit + integration must all pass. E2E is run separately on dedicated devices/emulators.

## 1. Lint

```bash
npm run lint           # full lint
npm run lint:fix       # auto-fix where possible
npm run lint:quickfix  # only files in `git status`
```

What it runs:
1. `tsc` (TypeScript type-check)
2. `node scripts/find-unused-loc.js` (flag unused localization keys)
3. `eslint --ext .js,.ts,.tsx '*.@(js|ts|tsx)' screen 'blue_modules/*.@(js|ts|tsx)' class models loc tests components navigation typings`

Key rules (`.eslintrc`):
- `react-native/no-inline-styles`: error
- `react-native/no-unused-styles`: error
- Prettier: single quotes, 140 char width, trailing commas
- ESLint configs: `standard`, `standard-jsx`, `standard-react`, plus `prettier`, `import`, `jest`, `n`, `promise`, `react`, `react-native`, `@typescript-eslint`

## 2. Unit Tests

```bash
npm run unit                                 # all unit tests
npm run unit -- lightning-ark-wallet         # specific test file
npm run unit -- --testNamePattern="Ark"      # by test name
```

Setup:
- Jest config in `package.json` / `jest.config.*`
- `__mocks__/` provides RN module mocks (Clipboard, Push Notifications, Keychain, AsyncStorage, etc.)
- `jest-environment-node` (default test env)
- `@jest/reporters` for output formatting

Notable unit tests:
- `tests/unit/lightning-ark-wallet.test.ts` — Ark wallet class (mocked SDK)
- Wallet derivation tests for each `class/wallets/*-wallet.ts`
- Currency, encryption, and helper module tests

Tests use the legacy `assert` module rather than Jest's `expect()` in many places (BlueWallet pre-dates `expect` adoption). New tests should still use `expect` per RN Testing Library conventions.

## 3. Integration Tests

```bash
npm run integration                          # all integration tests
npm run integration -- lightning-ark-wallet  # specific
```

These require **real environment variables**:
- `HD_MNEMONIC`
- `HD_MNEMONIC_BIP84`
- `HD_MNEMONIC_BIP47`
- (others — search `process.env.HD_` in `tests/integration/`)

Integration tests:
- Hit real Electrum servers (testnet/regtest)
- Hit real Boltz / arkd endpoints when applicable
- Are SLOWER than unit (network-dependent)
- Should use **dedicated test mnemonics** — never your real funds

> ⚠️ **Do not commit env vars.** Use `.envrc` (direnv) or set them per-shell.

## 4. E2E Tests (Detox)

Detox runs the actual built app on a real device/emulator and drives the UI. **Android-focused** at present.

### Build a Debug APK

```bash
npm run e2e:debug-build      # detox build -c android.debug
```

### Run Tests Against It

```bash
npm run e2e:debug-test       # detox test -c android.debug --reuse
npm run e2e:debug-test-device  # against a connected device
```

Combined (build if missing, then test):
```bash
npm run e2e:debug
```

### Release Build E2E

```bash
npm run e2e:release-build           # detox build -c android.release
npm run e2e:release-test            # detox test -c android.release
npm run e2e:release-build-device    # ARM-only build for physical device
npm run e2e:release-test-device     # records videos
```

### iOS E2E

Less commonly run, but supported:
```bash
npm run e2e:build:ios-release
npm run e2e:test:ios-release
```

### Detox Config

See `.detoxrc.json` (root). It defines configurations like `android.debug`, `android.release`, `android.debug.device`, `android.release.device`, etc.

## Specific to the Ark Wallet

The Ark integration has both unit and integration tests at:
- `tests/unit/lightning-ark-wallet.test.ts`
- `tests/integration/lightning-ark-wallet.test.ts`

When changing `class/wallets/lightning-ark-wallet.ts` or `blue_modules/arkade-adapters/`, run **both**:
```bash
npm run unit -- lightning-ark-wallet
npm run integration -- lightning-ark-wallet
```

Integration tests against the Ark wallet need:
- Network access to `https://arkade.computer` (or override)
- Network access to `https://api.ark.boltz.exchange`
- A funded test wallet (boarding requires onchain BTC)

## Test Fixtures & Mocks

- `__mocks__/` — RN module mocks (top level)
- `tests/mocks.ts` (or similar) — shared test fixtures
- `loc/en.json` — used by tests when checking strings; if you change keys, run lint to ensure no unused entries

## Coverage

The CI pipeline tracks coverage informally — there is no enforced threshold. To run with coverage locally:
```bash
npx jest tests/unit/* --coverage
```

## CI

GitHub Actions (`.github/workflows/`) run:
- Lint
- Unit
- Integration (some matrix)
- Detox builds for nightly / release

BrowserStack runs cross-device E2E suites for major releases.

## Debugging Test Failures

| Symptom | Likely Cause |
|---------|--------------|
| `Cannot find module 'react-native-X'` in unit | Missing mock in `__mocks__/` |
| `Network error` in integration | Backing service unreachable / change in API |
| `keychain` errors in unit | RN Keychain not mocked |
| Detox `Cannot connect to debug bridge` | Emulator not running, or `adb reverse` not set |
| `Realm` errors in unit | Realm not mocked — Ark tests may need a Realm shim |

For Ark wallet specifically:
- If unit tests fail with SDK import errors → check whether mocks for `@arkade-os/sdk` and `@arkade-os/boltz-swap` exist and are up-to-date with the imported symbols
- If integration tests fail → check the SDK version is reachable and `arkade.computer` / `delegate.arkade.money` / `api.ark.boltz.exchange` are responding

## Best Practices for New Tests

- **TypeScript only** for new tests
- Co-locate near similar tests (`tests/unit/`, `tests/integration/`, `tests/e2e/`)
- Mock only what you must — prefer running real code paths
- For Ark: test happy paths in unit, real network in integration
- Keep E2E focused on user-visible flows (Send/Receive/Backup)
