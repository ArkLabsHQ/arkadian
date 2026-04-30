# Arkade WDK — Troubleshooting

## `npm test` fails with a Jest config error

**Symptom:** Jest exits before any test runs, complaining about a missing setup file.

**Cause:** `jest.config.js` references `src/__tests__/setup.ts`, which is not present in the current tree.

**Resolution:**
- Create `src/__tests__/setup.ts` (even if empty) **or**
- Remove the `setupFilesAfterEach`/`setupFiles` reference from `jest.config.js`.

This is a known issue tracked in `AGENTS.md`.

---

## `getFeeRates()` returns zeros

**Symptom:** `await manager.getFeeRates()` resolves to `{ normal: 0n, fast: 0n }`.

**Cause:** Not implemented — placeholder values, intentional.

**Resolution:** Use the SDK directly (`account.wallet`) for fee estimation until the adapter wires this up. Track the gap via the README TODO list.

---

## Lightning methods unavailable / `arkadeLightning` is `null`

**Symptom:** `account.createLightningInvoice(...)` throws or `arkadeLightning` is `null`.

**Cause:** `swapProviderUrl` was not provided in `ArkadeWalletConfig`.

**Resolution:** Construct the manager with a Boltz-compatible swap provider:

```ts
new WalletManagerArkade(seed, {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange',
})
```

---

## Balance is always zero on a real Android device

**Symptom:** Offchain or Lightning balance reads correctly on web/regtest, but stays at `0` on a physical Android device.

**Cause:** `@arkade-os/sdk`'s internal Esplora URL defaults to `http://localhost:3000` (regtest), which the device cannot reach.

**Resolution:** This is the known Esplora issue. The `wdk-react-native-provider` submodule contains a workaround that calls the Ark indexer + Esplora REST APIs directly from the RN side:
- Offchain/Lightning: `GET ${arkServerUrl}/v1/indexer/vtxos?scripts=${pkScript}&spendableOnly=true`
- Boarding: `GET ${esploraUrl}/address/${addr}/utxo`

Make sure the provider patch is applied (`node scripts/apply-patches.js`) and `arkServerUrl` / `esploraUrl` are correctly configured for your environment. Once the SDK exposes a configurable Esplora URL across the worklet path, this workaround can be removed.

---

## `sendTransaction` rejects a valid BIP21 URI

**Symptom:** Passing `bitcoin:bc1q...?amount=...` to `sendTransaction` errors.

**Cause:** `sendTransaction` / `quoteSendTransaction` accept direct destination values (Ark address, BTC address, BOLT11), not BIP21 URIs.

**Resolution:** Decode first:

```ts
import { isBip21, decodeBip21 } from '@arkade-os/wdk'

const dest = isBip21(input) ? decodeBip21(input).address : input
await account.sendTransaction({ to: dest, value })
```

---

## `transfer()` / `quoteTransfer()` throws

**Symptom:** Calling `account.transfer(...)` or `account.quoteTransfer(...)` throws.

**Cause:** WDK's `transfer` concept (token transfers between accounts in the same chain) does not apply to Bitcoin/Ark. The adapter intentionally throws.

**Resolution:** Use `sendTransaction` / `quoteSendTransaction` instead.

---

## Patches do not apply after a fresh clone

**Symptom:** `node scripts/apply-patches.js` fails with hunks that no longer match.

**Cause:** Submodule HEAD has moved past the base ref the patches were generated against.

**Resolution:**

```bash
# Option 1: regenerate against the current submodule HEAD
node scripts/generate-patches.js
# (review and commit the refreshed patches)

# Option 2: pin the submodule to the expected commit
git -C packages/wdk-react-native-provider checkout <known-good-sha>
```

Use `--check` first to verify cleanly:

```bash
node scripts/apply-patches.js --check
```

---

## `setup:dev` reports unfamiliar package names

**Symptom:** `npm run setup:dev` mentions `@wdk/bare` or other legacy names.

**Cause:** `scripts/setup-dev.js` still uses the old naming for some link commands while the actual submodule package is `@tetherto/pear-wrk-wdk`.

**Resolution:** Treat the script's output as best-effort. If something feels off, verify links manually with `ls node_modules/@tetherto/pear-wrk-wdk` (or the equivalent package) and re-run `npm link` against the correct package name as needed.

---

## Submodules are dirty after `setup:dev`

**Symptom:** `git -C packages/<sub> status --short` shows lockfile or build-artifact changes.

**Cause:** Running `npm install` / `npm run prepare` inside a submodule can refresh lockfiles or generated bundles.

**Resolution:** Expected during local development. Decide per-PR whether to commit or discard those changes. Do **not** roll up unrelated lockfile churn into adapter PRs.

---

## RN example doesn't seem to use `@arkade-os/wdk`

**Symptom:** Edits to `@arkade-os/wdk` do not affect the running RN example app.

**Cause:** `examples/wdk-starter-react-native` currently routes Bitcoin through `@wdk/wallet-btc`, not `@arkade-os/wdk`. This is documented in `AGENTS.md`.

**Resolution:** Validation requires explicit submodule wiring to register `WalletManagerArkade` for the `bitcoin` chain in the provider/example. Plan that as a separate integration step.
