# Arkade WDK — Troubleshooting

## `npm test` fails on Jest config (legacy issue — resolved)

**Old symptom:** Jest exited before any test ran, complaining about a missing `src/__tests__/setup.ts`.

**Current state:** Resolved. The repo was converted from TypeScript + Jest to JavaScript + JSDoc + `node:test`. There is no Jest, no setup file, and no config-validation step. If you see this error you are on a stale checkout — `git pull` and `npm install`.

---

## `getFeeRates()` returns zeros (legacy issue — resolved)

**Old symptom:** `await manager.getFeeRates()` returned `{ normal: 0n, fast: 0n }`.

**Current state:** Resolved. `getFeeRates()` returns the actual `info.fees.txFeeRate` from the Ark info response (parsed and validated by `parseFeeRate`). Both `normal` and `fast` are equal — Ark has no mempool fee tiers.

If you see zeros now, your ASP is reporting `txFeeRate: 0` (or 0.0) — that's a server-side configuration. Investigate the Ark server, not the adapter.

---

## Lightning methods unavailable / `arkadeSwaps` is `null`

**Symptom:** `account.createLightningInvoice(...)` (or `waitForLightningPayment` / `getPendingLightning*` / `getSwapHistory` / `getLightningLimits` / `getLightningFees`) throws `Lightning support not configured. Provide swapProviderUrl in wallet config.`

**Cause:** `swapProviderUrl` was not provided in `ArkadeWalletConfig`, so the manager left `arkadeSwaps` as `null`.

> Note: the field name was renamed from `arkadeLightning` to `arkadeSwaps`.

**Resolution:** Construct the manager with a Boltz-compatible swap provider:

```js
new WalletManagerArkade(seed, {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange',
})
```

---

## Balance is always zero on a real Android device

**Symptom:** Offchain or Lightning balance reads correctly on web/regtest, but stays at `0` on a physical Android device.

**Cause:** The default `@arkade-os/sdk` Esplora URL (`http://localhost:3000`) is unreachable from a physical device.

**Resolution:** The RN provider hits the Ark indexer + Esplora REST APIs directly from the RN side. Set `indexerUrl` (virtual mempool) and a reachable `esploraUrl` on the Arkade chain config. Confirm `setup:dev` applied the provider patch and that incoming-funds auto-refresh is wired (see `feat(provider): auto-refresh balance on incoming Arkade funds`).

---

## `Wallet creation timed out`

**Symptom:** `getAccount` rejects with `Ark wallet creation timed out after 30000ms — is the Ark server at <url> reachable?`.

**Cause:** `Wallet.create` did not resolve within 30 seconds. The most common reason is `arkServerUrl` being unreachable from where the manager is running.

**Resolution:** Verify the Ark server is reachable from the runtime (browser, RN device, Bare worklet). On RN, also check `indexerUrl` / `esploraUrl` if balance reads are involved.

---

## `Invalid Ark fee rate from server: <raw>`

**Symptom:** `getFeeRates()` (or `quoteSendTransaction`) throws this.

**Cause:** The ASP returned a non-finite or negative `txFeeRate`. `parseFeeRate` rejects it explicitly so it doesn't propagate as `NaN`.

**Resolution:** Check the Ark server's reported fees. If the server is correct and the rate is genuinely zero, that is a different problem — `parseFeeRate` accepts `0`.

---

## `WalletManagerArkade has been disposed`

**Symptom:** Any call after `dispose()` throws this.

**Cause:** Expected — `dispose()` is one-shot. Calling `getAccount`, `getAccountByPath`, or `getFeeRates` afterwards rejects.

**Resolution:** Construct a fresh `WalletManagerArkade`. Do not reuse a disposed instance.

---

## `transfer()` throws (legacy expectation — changed)

**Old behaviour:** `transfer()` and `quoteTransfer()` threw because WDK's transfer concept did not apply.

**Current state:** `transfer({ token, recipient, amount })` is implemented as an SDK asset send (`wallet.send({ address, assets: [...] })`). `quoteTransfer` is also implemented and returns the offchain fee estimate.

For plain Bitcoin/Ark sends (no asset), use `sendTransaction` / `quoteSendTransaction`.

---

## `sendTransaction` rejected a BIP21 URI (legacy issue — resolved)

**Old symptom:** Passing `bitcoin:bc1q...?amount=...` threw.

**Current state:** Resolved. `sendTransaction` and `quoteSendTransaction` now accept BIP21 URIs directly — `resolveDestination` extracts the inner address/invoice and any `?amount=` carried in the URI (priority: lightning > ark > bitcoin).

---

## Patches do not apply after a fresh clone

**Symptom:** `npm run setup:dev` reports patch hunks that no longer match.

**Cause:** Submodule HEAD has moved past the base ref the patches were generated against.

**Resolution:**

```bash
# Option 1: regenerate against the current submodule HEAD
node scripts/generate-patches.js
# (review and commit the refreshed patches)

# Option 2: pin the submodule to the expected commit
git -C packages/wdk-react-native-provider checkout <known-good-sha>
```

`scripts/setup-dev.js` uses `git apply --reverse --check` to skip already-applied patches, so reruns are idempotent.

---

## `setup:dev` complains about `@wdk/bare` (legacy — fixed)

**Old symptom:** `npm run setup:dev` mentioned `@wdk/bare` and other legacy package names.

**Current state:** Fixed (`fix: link example-app packages via direct symlinks, bypass npm link`). The script now reads `package.json#name` from each linked source and creates direct symlinks under the target's `node_modules` — no `npm link`, no `prepare` re-runs, no stale snapshots.

---

## Submodules dirty after `setup:dev`

**Symptom:** `git -C packages/<sub> status --short` shows lockfile or build-artifact changes.

**Cause:** Running `npm install` / `npm run prepare` inside a submodule can refresh lockfiles or generated bundles.

**Resolution:** Expected during local development. Decide per-PR whether to commit or discard those changes. Do **not** roll up unrelated lockfile churn into adapter PRs.

---

## RN example does not seem to use `@arkade-os/wdk` (legacy concern — addressed)

**Old symptom:** Edits to `@arkade-os/wdk` had no effect on the running RN example.

**Current state:** Addressed. The provider was refactored to run the Arkade `WalletManagerArkade` on the RN JS thread (`refactor(provider): run Arkade wallet on RN side, not Bare worklet`), and the example app now exposes the Arkade chain in its send/receive flows. If the example still reaches `@wdk/wallet-btc`, you are on a stale submodule pointer or stale patch — re-run `npm run setup:dev`.

---

## `bare-*` addon mismatch / SIGABRT in worklet

**Symptom:** Worklet crashes with abort or addon-mismatch errors on RN.

**Cause:** Bare addons in the dev environment did not match the versions `react-native-bare-kit` ships.

**Resolution:** Multiple recent fixes pin and shim the addons. After pulling, run `npm run setup:dev` to refresh — the patches now pin `bare-crypto`, `bare-type`, `bare-pack@1`, and shim `bare-abort`, `bare-stdio`, `bare-performance`, `bare-type` with pure-JS replacements for the worklet. Also ensure `wdk-react-native-provider` does not re-export `WdkManager` from `pear-wrk-wdk index.js` (regression fixed in `be25ba7`).
