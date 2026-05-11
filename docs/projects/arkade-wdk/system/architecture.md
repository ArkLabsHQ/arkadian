# Arkade WDK — Architecture

## Overview

`@arkade-os/wdk` is a thin adapter layer. Its job is to translate Tether's WDK `WalletManager`/`WalletAccount` contracts into calls against `@arkade-os/sdk`, plus optional Boltz-based Lightning operations. The package itself is small (one manager, one signing account, one read-only account, a handful of internal `lib/*` helpers); most of the heavy lifting happens in upstream dependencies.

The repository is JavaScript with JSDoc types — runtime files ship as-is from `src/`, and `tsc -p tsconfig.json` emits `.d.ts` declarations into `types/` for consumers.

## Repository Layout

```text
arkade-wdk/
├── src/
│   ├── lib/                                # internal helpers (not re-exported)
│   │   ├── address.js / bech32m.js / bip21.js / bolt11.js
│   │   ├── lnurl.js / send.js / fees.js / format.js
│   ├── wallet-manager-arkade.js            # WDK WalletManager implementation
│   ├── wallet-account-arkade.js            # signing account (extends ReadOnly)
│   ├── wallet-account-read-only-arkade.js  # read-only account (extends WDK base)
│   ├── types.js                            # ArkadeWalletConfig JSDoc typedef
│   ├── types/sodium-universal.d.ts         # ambient declaration for the addon
│   ├── __tests__/                          # node:test specs (.js)
│   └── index.js                            # public package exports
├── packages/                               # submodules
│   ├── pear-wrk-wdk/
│   └── wdk-react-native-provider/
├── examples/
│   └── wdk-starter-react-native/
├── patches/                                # patches applied to submodules
├── scripts/
│   ├── setup-dev.js                        # installs + applies patches + symlinks
│   └── generate-patches.js                 # regenerates ./patches from submodule diffs
├── jsconfig.json                           # JSDoc type-check (used by `npm run typecheck`)
└── tsconfig.json                           # declaration-only emit to types/
```

## Adapter Classes

### `WalletManagerArkade`

Extends `WalletManager` from `@tetherto/wdk-wallet`. Constructed with a seed plus an optional `ArkadeWalletConfig`:

```js
new WalletManagerArkade(seed, {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.boltz.exchange', // optional, enables Lightning
})
```

Responsibilities:

- Build an `ArkProvider` (`RestArkProvider` from `arkServerUrl`, or a caller-supplied `arkProvider`).
- Cache `arkProvider.getInfo()` once at construction with one automatic retry; both `getAccount` and `getFeeRates` await this cached `arkInfo` promise.
- Memoise per-derivation-path SDK wallets (`_walletPromises[path]`). Each path gets its own `Wallet`, key pair, and (if `swapProviderUrl` is set) `ArkadeSwaps`.
- Default `storage` to `InMemoryWalletRepository` + `InMemoryContractRepository` when the consumer does not supply one (RN/Bare lack IndexedDB).
- Race `Wallet.create` against a 30s timeout that surfaces a clear "Ark server unreachable" error.
- `getFeeRates()` returns the parsed `info.fees.txFeeRate` for both `normal` and `fast` (Ark has a single negotiated rate, not mempool tiers).
- `dispose()` zeroes the seed via `sodium_memzero`, disposes each per-path wallet, and forwards to the WDK base `dispose()`.

The master `HDKey` is wiped immediately after `derive(path)` (in a `try/finally`), and the per-account private key is wiped on account `dispose()`.

### `WalletAccountReadOnlyArkade`

Extends `WalletAccountReadOnly` from `@tetherto/wdk-wallet`. Backed by an `IReadonlyWallet` and the manager's `arkInfo` promise.

Selected methods:

- `getBoardingAddress()` — explicit on-chain BTC deposit address (separate from `getAddress()`).
- `getBalance()` — total balance (sum of offchain + onchain) as `bigint`.
- `getTransactionHistory()` — `ArkTransaction[]` from the SDK.
- `verify(message, sig)` — BIP322 verify against the account address.
- `getTransactionReceipt(hash)` — `indexerProvider.getVirtualTxs([hash])`, returns the first match or `null`.
- `getTokenBalance(assetId)` — sums matching entries in `wallet.getBalance().assets`.
- `quoteSendTransaction(tx)` / `quoteTransfer(options)` — fee estimates (offchain fee from arkInfo for transfers).

### `WalletAccountArkade`

Signing account. Extends `WalletAccountReadOnlyArkade` and adds:

- `path` and `index` (parsed from the path's last segment).
- `keyPair: { publicKey, privateKey }` — `privateKey` is wiped via `sodium_memzero` on `dispose()`.
- `arkadeSwaps: ArkadeSwaps | null` — present only when the manager was constructed with `swapProviderUrl` (note: renamed from `arkadeLightning`).
- `sendTransaction(tx)` / `quoteSendTransaction(tx)` — call `lib/send.js#send` / `quoteSend` which:
  - Resolve BIP21 URIs (extract inner address/invoice/LNURL + optional `?amount=`).
  - Detect Ark / BTC / BOLT11 / Lightning-address / LNURL destinations.
  - Dispatch through the SDK or `ArkadeSwaps` (LNURL tries Ark fast path before falling back to BOLT11).
- `transfer(options)` — issues an asset-only send via the SDK (`wallet.send({ address, assets: [...] })`) and returns the SDK txid plus an offchain-fee estimate.
- `sign(message)` — BIP322 sign with `wallet.identity`.
- `subscribeToIncomingFunds(callback)` — thin pass-through to `wallet.notifyIncomingFunds(callback)` so consumers can react to new VTXOs without reaching into the (now-private) SDK wallet.
- `toReadOnlyAccount()` — builds an `IReadonlyWallet` projection of the SDK wallet (using `ReadonlySingleKey.fromPublicKey(...)` and a narrowed `assetManager` exposing only `getAssetDetails`) and wraps it in `WalletAccountReadOnlyArkade`.
- `dispose()` — wipes the private key, disposes `arkadeSwaps`, and forwards to the base if it ever gains a `dispose()`.

#### Lightning surface (only when `arkadeSwaps != null`)

| Method | Action |
|--------|--------|
| `createLightningInvoice(amount, description?)` | Boltz reverse swap → returns `{ invoice, paymentHash }` |
| `waitForLightningPayment(invoice)` | Resolves the matching pending reverse swap and calls `swaps.waitAndClaim(swap)` |
| `getPendingLightningReceives()` | `swaps.getPendingReverseSwaps()` |
| `getPendingLightningSends()` | `swaps.getPendingSubmarineSwaps()` |
| `getSwapHistory()` | `swaps.getSwapHistory()` |
| `getLightningLimits()` | `swaps.getLimits()` |
| `getLightningFees()` | `swaps.getFees()` |

All Lightning methods route through `_requireSwaps()`, which throws `Lightning support not configured. Provide swapProviderUrl in wallet config.` when not configured.

## Send Routing (`src/lib/send.js`)

`sendTransaction()` and `quoteSendTransaction()` go through `resolveDestination` first, then `detectTransactionType`:

| Detected Type | Path |
|---------------|------|
| BIP21 URI (`bitcoin:` / with `?ark=` / `?lightning=` / `?lnurl=` / `?amount=`) | Resolved to inner destination (priority: lightning > ark > lnurl > bitcoin) and re-routed |
| Ark address (`TransactionType.ARK_OFFCHAIN`) | `wallet.sendOffChain` via SDK |
| BTC address (`TransactionType.BITCOIN_ONCHAIN`) | On-chain spend via SDK |
| BOLT11 invoice (`TransactionType.LIGHTNING`) | Submarine swap via `ArkadeSwaps` |
| Lightning address / LNURL (`TransactionType.EMAIL`) | `fetchArkAddress(...)` fast path → SDK offchain send if a valid Ark address comes back; else `fetchInvoice(...)` → BOLT11 → submarine swap. Requires `arkadeSwaps` and a positive amount. |

`TransactionType` enum values: `ARK_OFFCHAIN`, `BITCOIN_ONCHAIN`, `LIGHTNING`, `EMAIL`, `UNKNOWN`.

## Lightning Layer

When `swapProviderUrl` is set, the manager builds a `BoltzSwapProvider({ apiUrl, network, referralId: 'arkade-wdk-sdk' })` (network resolved from cached `arkInfo`) and constructs `ArkadeSwaps.create({ wallet, swapProvider, swapManager: { autoStart: true, pollInterval: 5_000 } })`. A consumer-supplied `swapRepository` (e.g. SQLite) is forwarded if present in config. The `referralId` is hard-coded so Boltz can attribute swaps to the WDK adapter.

This unlocks the Lightning surface listed above: invoice creation, payment waiting/claim, pending-swap queries, swap history, limits/fees.

## Internal Utility Layer (`src/lib/`)

The `lib/*` modules are **internal** — they are not re-exported from `src/index.js`. Consumers should rely on the WDK contract for routing.

| File | Notable Exports |
|------|-----------------|
| `address.js` | `decodeArkAddress`, `isArkAddress`, `isBTCAddress`, `isLightningInvoice` |
| `bech32m.js` | `bech32mDecode`, `bech32mFromWords`, `arkAddressToPkScript` |
| `bip21.js` | `isBip21`, `decodeBip21`, `encodeBip21` |
| `bolt11.js` | `decodeInvoice`, `isValidInvoice` |
| `lnurl.js` | `isLnUrl`, `isLightningAddress`, `isValidLnUrl`, `getCallbackUrl`, `checkLnUrlConditions`, `fetchInvoice`, `fetchArkAddress`, `getLnUrlLimits`, `extractRecipientFromMetadata` |
| `send.js` | `detectTransactionType`, `resolveDestination`, `quoteSend`, `send`, `TransactionType` |
| `fees.js` | `parseFeeRate`, `calculateOffchainFee`, `calculateOnchainFee`, `calculateLightningFee` |
| `format.js` | `fromSatoshis`, `toSatoshis`, `formatSats`, `formatSatsWithCommas`, `prettyNumber` |

The `bech32m.js` module is tested cross-checked against `ArkAddress` from the SDK so the inline decoder shipped in the `wdk-react-native-provider` patch (which can't pull in `@arkade-os/sdk` on the RN JS thread) stays in sync.

## Public Exports (`src/index.js`)

```js
export { default } from './wallet-manager-arkade.js';        // WalletManagerArkade
export { WalletAccountArkade } from './wallet-account-arkade.js';
export { WalletAccountReadOnlyArkade } from './wallet-account-read-only-arkade.js';
```

Anything else (helpers, types, internal bech32m) is intentionally not part of the package surface.

## Runtime Dependency Flow (RN Path)

```
examples/wdk-starter-react-native (Expo app)
        │
        ▼ uses
@tetherto/wdk-react-native-provider  (packages/wdk-react-native-provider, patched)
        │
        ▼ talks HRPC to
pear-wrk-wdk                         (packages/pear-wrk-wdk, patched)
        │
        ▼ runs Arkade wallet on RN side (post-3640315 refactor)
@arkade-os/wdk + @arkade-os/sdk
```

The RN provider was refactored (`refactor(provider): run Arkade wallet on RN side, not Bare worklet`) so the Arkade `WalletManagerArkade` is constructed on the RN JS thread — only the bare-kit worklet handles other (non-Arkade) chains.

## RN Balance Path

For arkade networks, the RN provider runs the Arkade wallet on the RN JS thread and reads the offchain/Lightning balance from it directly:

- **Offchain/Lightning balance**: `await arkadeAccount.getBalance()` (which delegates to the SDK `wallet.getBalance().total` under the hood).
- **Boarding balance**: `GET ${esploraUrl}/address/${addr}/utxo` against the boarding address resolved from `WalletAccountArkade.getBoardingAddress()`.

The previous direct `/v1/indexer/vtxos` REST workaround (with the inline bech32m `arkAddressToPkScript` decoder) has been retired from the provider for offchain balances now that the wallet runs on the RN side. The cross-checked `arkAddressToPkScript` still lives in `src/lib/bech32m.js` for any consumer that still needs it.

The provider auto-refreshes balances on incoming Arkade funds by subscribing via `arkadeAccount.subscribeToIncomingFunds()` (replacing the previous direct call to the SDK wallet's `notifyIncomingFunds` through the now-private `wallet` field).

## Submodule + Patch Model

The `packages/` and `examples/` directories are git submodules. Local modifications stay out of fork-required commits by being tracked as patch files in `./patches/`. The flow:

1. Edit files inside the submodule working tree.
2. From the parent repo, run `node scripts/generate-patches.js` to refresh patch files (defaults the base ref to the parent's pinned submodule SHA).
3. Commit the updated patch file in the parent repo.
4. After fresh clones, `npm run setup:dev` initialises submodules, applies all patches idempotently, and symlinks packages into one another's `node_modules` (bypassing `npm link` to avoid the `prepare` lifecycle re-running).

## Build & Output

- No bundler / no `tsc` for runtime code — `package.json` exports `./src/index.js` directly.
- `tsc -p tsconfig.json` emits `.d.ts` files into `./types/`. This is wired into `prepublishOnly`.
- `lint` runs `eslint src --ext .js && npm run typecheck`, where `typecheck` is `tsc -p jsconfig.json --noEmit` (JSDoc-driven type-checking with `checkJs: true`).

## Testing Posture

- `npm test` runs `node --test src/__tests__/*.test.js` — Node's built-in test runner. No Jest, no `--experimental-vm-modules`.
- Test files: `bech32m.test.js`, `phase-0.test.js`, `wdk.test.js`. Tests use `node:test` + `node:assert/strict`.
- The previous Jest setup (and the missing-`setup.ts` footgun) is gone.
