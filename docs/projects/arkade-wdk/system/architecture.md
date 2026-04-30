# Arkade WDK — Architecture

## Overview

`@arkade-os/wdk` is a thin adapter layer. Its job is to translate Tether's WDK `WalletManager`/`WalletAccount` contract into calls against `@arkade-os/sdk`, plus optional Boltz-based Lightning operations. The package itself is small (one manager, one signing account, one read-only account, a handful of `lib/*` helpers); most of the heavy lifting happens in upstream dependencies.

## Repository Layout

```text
arkade-wdk/
├── src/
│   ├── lib/                      # address, bip21, bolt11, lnurl, fees, format, send routing
│   ├── wallet-manager-arkade.ts  # WDK WalletManager implementation
│   ├── wallet-account-arkade.ts  # WDK signing + read-only accounts
│   ├── types.ts                  # ArkadeWalletConfig, Transaction, TransferOptions
│   ├── __tests__/                # Jest tests (setup.ts is currently missing)
│   └── index.ts                  # Public package exports
├── packages/
│   ├── pear-wrk-wdk/              # submodule: bare-kit worklet runtime
│   └── wdk-react-native-provider/ # submodule: React Native provider
├── examples/
│   └── wdk-starter-react-native/  # submodule: Expo demo app
├── patches/                       # patches applied to submodules
│   ├── pear-wrk-wdk.patch
│   ├── wdk-react-native-provider.patch
│   └── wdk-starter-react-native.patch
├── scripts/
│   ├── setup-dev.js               # local dev setup helper
│   ├── apply-patches.js           # apply ./patches into each submodule
│   └── generate-patches.js        # regenerate ./patches from submodule diffs
├── bare.js                        # bare-runtime entry hint
├── jest.config.js                 # Jest ESM config
└── tsconfig.json                  # ES2022, ESM, strict
```

## Adapter Classes

### `WalletManagerArkade`

Extends `@tetherto/wdk-wallet`'s `WalletManager`. Constructed with a seed (string or `Uint8Array`) plus an optional `ArkadeWalletConfig`:

```ts
new WalletManagerArkade(seed, {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange', // optional, enables Lightning
})
```

Responsibilities:

- Hold a single underlying `@arkade-os/sdk` wallet instance shared across accounts.
- Map `getAccount(index)` to one of three modes via `WalletAccountArkade`.
- Resolve `getAccountByPath(path)` to the same account set.
- Expose `getFeeRates()` (currently returns placeholders).
- `dispose()` to release wallet resources.

Static helpers inherited from WDK: `getRandomSeedPhrase`, `isValidSeedPhrase`.

### `WalletAccountArkade`

Signing account implementation. Backed by the underlying SDK wallet and (optionally) an `ArkadeLightning` instance for Boltz operations.

Properties:

- `index: number` — 0/1/2 (boarding/offchain/lightning).
- `path: string` — BIP-style derivation path string.
- `keyPair: { publicKey, privateKey }` — exposed for WDK consumers.
- `wallet: IWallet` — underlying SDK wallet (escape hatch for SDK-native operations).
- `arkadeLightning: ArkadeLightning | null` — present only when `swapProviderUrl` was configured.

Methods (selected):

- `getAddress()` — Ark address, BTC boarding address, or `''` for Lightning.
- `getBalance()` — total balance for the active account mode.
- `getTransactionHistory()` — Ark transactions via the underlying SDK.
- `quoteSendTransaction(tx)` — estimate fee for a send.
- `sendTransaction(tx)` — auto-detect destination type and dispatch.
- `sign(message)` / `verify(message, sig)` — message signing using the account key.
- `createLightningInvoice(amount, description?)` — only when `arkadeLightning` is present.
- `toReadOnlyAccount()` — strip private key, return `WalletAccountArkadeReadOnly`.
- `dispose()` — release per-account resources.
- `initialize()` — currently a no-op; reserved for future eager setup.

`transfer(...)` and `quoteTransfer(...)` throw — the WDK transfer concept does not apply to Bitcoin/Ark.

### `WalletAccountArkadeReadOnly`

Watch-only counterpart with the same shape minus the private key. Useful for WDK consumers that want to display balances and history without holding signing material.

## Send Routing (`src/lib/send.ts`)

`sendTransaction()` and `quoteSendTransaction()` route on the destination string:

| Detected Type | Path |
|---------------|------|
| Ark address (`detectTransactionType` → `ARK`) | `wallet.sendOffChain` via SDK |
| BTC address | On-chain spend via SDK |
| BOLT11 invoice | Submarine swap via `ArkadeLightning` |
| `EMAIL` | Routing enum exists; not implemented |
| BIP21 URI | Not currently accepted directly — caller must decode first |

Exported helpers: `detectTransactionType`, `quoteSend`, `send`, `TransactionType`.

## Lightning Layer

When `swapProviderUrl` is set, the manager constructs an `ArkadeLightning` instance from `@arkade-os/boltz-swap` and attaches it to each `WalletAccountArkade`. This unlocks:

- `createLightningInvoice(amount, description?)` — internally a Boltz reverse swap that returns a BOLT11 invoice the counterparty pays.
- BOLT11 sends through `sendTransaction({ to: invoice, value })` — internally a Boltz submarine swap.

Lightning lifecycle helpers (waiting for payments, listing pending swaps, swap history) are flagged as TODO and not implemented in this version.

## Utility Layer (`src/lib/`)

| File | Exports |
|------|---------|
| `address.ts` | `decodeArkAddress`, `isArkAddress`, `isBTCAddress`, `isLightningInvoice` |
| `bip21.ts` | `isBip21`, `decodeBip21`, `encodeBip21` |
| `bolt11.ts` | `decodeInvoice`, `isValidInvoice` |
| `lnurl.ts` | `isLnUrl`, `isLightningAddress`, `isValidLnUrl`, `getCallbackUrl`, `checkLnUrlConditions`, `fetchInvoice`, `fetchArkAddress`, `getLnUrlLimits`, `extractRecipientFromMetadata` |
| `send.ts` | `detectTransactionType`, `quoteSend`, `send`, `TransactionType` |
| `fees.ts` | `calculateOffchainFee`, `calculateOnchainFee`, `calculateLightningFee` |
| `format.ts` | `fromSatoshis`, `toSatoshis`, `formatSats`, `formatSatsWithCommas`, `prettyNumber` |

These are re-exported from `src/index.ts` so consumers can import them without poking at internals.

## Runtime Dependency Flow (RN Path)

```
examples/wdk-starter-react-native (Expo app)
        │
        ▼ uses
@tetherto/wdk-react-native-provider  (packages/wdk-react-native-provider, patched)
        │
        ▼ talks HRPC to
@tetherto/pear-wrk-wdk               (packages/pear-wrk-wdk, patched)
        │
        ▼ resolves Bitcoin via
@wdk/wallet-btc                      (default WDK BTC wallet)
```

> **Important:** As of the current code, the Expo example does **not** route Bitcoin through `@arkade-os/wdk` by default — it still goes through `@wdk/wallet-btc`. To validate `@arkade-os/wdk` end-to-end inside the example app, additional submodule wiring is required. See `AGENTS.md` for context.

## Esplora Workaround (Direct REST from RN)

For arkade networks, `@arkade-os/sdk`'s built-in Esplora URL defaults to `http://localhost:3000`, which is unreachable from a physical Android device. Until the SDK exposes a configurable Esplora URL for the worklet path, `wdk-react-native-provider` calls the relevant REST APIs directly from the RN side:

- **Offchain/Lightning balance**: `GET ${arkServerUrl}/v1/indexer/vtxos?scripts=${pkScript}&spendableOnly=true`
- **Boarding balance**: `GET ${esploraUrl}/address/${addr}/utxo`

A small inline bech32m decoder (`arkAddressToPkScript`) extracts the pkScript from the Ark address without adding a dependency.

Transaction history is **not** part of this workaround — it goes through the full HRPC path (`getTransactionHistory` → worklet → SDK).

## Submodule + Patch Model

The `packages/` and `examples/` directories are git submodules. Local modifications stay out of fork-required commits by being tracked as patch files in `./patches/`. The flow:

1. Edit files inside the submodule working tree.
2. From the parent repo, run `node scripts/generate-patches.js` to refresh patch files.
3. Commit the updated patch file in the parent repo.
4. After fresh clones or submodule updates, run `node scripts/apply-patches.js` to re-apply.

`--check` on `apply-patches.js` validates that patches still apply cleanly without modifying the working tree.

## Build & Output

- `tsc` compiles `src/` to `dist/`.
- `package.json` `exports` map:
  - `.` (default) → `dist/index.js`
  - `bare` runtime → `bare.js`
  - Types → `dist/index.d.ts`
- `dist/` is generated and ignored by git.

## Testing Posture

- `npm test` runs Jest in ESM mode (`--experimental-vm-modules`).
- The current `jest.config.js` references `src/__tests__/setup.ts`, which is not in the repo — `npm test` therefore fails on config validation until that file is added or the reference is removed.
- For root-only adapter changes the practical verification today is: `npm run build` + `npm run lint` + a small consumer harness.
