# Arkade WDK — Usage

## Install

```bash
npm install @arkade-os/wdk @tetherto/wdk
```

`@arkade-os/sdk` is pulled transitively. Add it explicitly only if your app imports from it directly.

## Quick Start

```js
import WdkManager from '@tetherto/wdk'
import WalletManagerArkade from '@arkade-os/wdk'

const seedPhrase = 'your twelve word seed phrase here'
const wdk = new WdkManager(seedPhrase)

wdk.registerWallet('bitcoin', WalletManagerArkade, {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange', // optional: enables Lightning
})

const account = await wdk.getAccount('bitcoin', 0) // boarding account

const arkAddress = await account.getAddress()
const balance = await account.getBalance()

const quote = await account.quoteSendTransaction({ to: arkAddress, value: 1000n })
const tx = await account.sendTransaction({ to: arkAddress, value: 1000n })

console.log({ balance, quoteFee: quote.fee, txid: tx.hash })
```

## Account Indices

| Index | Mode | Returned by `getAddress()` |
|-------|------|----------------------------|
| 0 | boarding | On-chain BTC deposit address |
| 1 | offchain | Ark address (Taproot) |
| 2 | lightning | `''` (empty) — generate invoice via `createLightningInvoice` |

```js
const boarding = await wdk.getAccount('bitcoin', 0)
const offchain = await wdk.getAccount('bitcoin', 1)
const lightning = await wdk.getAccount('bitcoin', 2)
```

Each index is a distinct BIP-86 derivation path (`m/86'/<network>/0'/0/<index>`). The manager memoises one underlying SDK wallet per path. To get the on-chain deposit address from any account, call `account.getBoardingAddress()`.

## Lightning Invoices

Requires `swapProviderUrl` to be set on the manager.

```js
const lightning = await wdk.getAccount('bitcoin', 2)

const { invoice, paymentHash } = await lightning.createLightningInvoice(
  50_000,
  'Payment for coffee',
)

// Block until Boltz settles and the VTXO is claimed:
const { txid } = await lightning.waitForLightningPayment(invoice)
```

## Pay BOLT11 / BIP21

`sendTransaction` accepts:

- Ark addresses, BTC addresses, BOLT11 invoices (auto-detected).
- BIP21 URIs — the inner address/invoice and any `?amount=` carried in the URI are extracted automatically.

```js
await account.sendTransaction({ to: 'bitcoin:bc1q...?amount=0.001', value: 100_000n })
await account.sendTransaction({ to: '<BOLT11 invoice>', value: 50_000n })
```

## Lightning Lifecycle

Available on signing accounts when `swapProviderUrl` was configured:

```js
await lightning.getPendingLightningReceives() // PendingReverseSwap[]
await lightning.getPendingLightningSends()    // PendingSubmarineSwap[]
await lightning.getSwapHistory()              // reverse + submarine + chain swaps, newest first
await lightning.getLightningLimits()          // min/max bounds
await lightning.getLightningFees()            // fee schedule
```

All Lightning methods throw `Lightning support not configured. Provide swapProviderUrl in wallet config.` when `arkadeSwaps` is `null`.

## Read-Only Account

```js
import { WalletAccountReadOnlyArkade } from '@arkade-os/wdk'

const ro = await account.toReadOnlyAccount()
const balance = await ro.getBalance()
const history = await ro.getTransactionHistory()
const boardingAddr = await ro.getBoardingAddress()
// ro.sign(...) does not exist — read-only accounts cannot sign
```

`toReadOnlyAccount` builds an `IReadonlyWallet` projection (using `ReadonlySingleKey.fromPublicKey(...)` and a narrowed `assetManager` exposing only `getAssetDetails`) and wraps it in `WalletAccountReadOnlyArkade`.

## Asset Transfer

```js
const result = await account.transfer({
  token: '<assetId>',
  recipient: '<ark address>',
  amount: 1000,
})
console.log(result.hash, result.fee)
```

`transfer` issues an SDK asset send (`wallet.send({ address, assets: [{ assetId, amount }] })`) and returns the SDK txid plus an offchain fee estimate.

## Static Helpers

Inherited from the WDK base `WalletManager`:

```js
import WalletManagerArkade from '@arkade-os/wdk'

const phrase = WalletManagerArkade.getRandomSeedPhrase(12) // or 24
const ok = WalletManagerArkade.isValidSeedPhrase(phrase)
```

## Configuration

```js
/** @type {import('@arkade-os/wdk').ArkadeWalletConfig} */
const config = {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange',
  // storage: { walletRepository, contractRepository },
  // swapRepository: <SQLite-backed repo>,
}
```

`ArkadeWalletConfig` is the SDK wallet config (minus `identity`) plus `swapProviderUrl` and the optional `swapRepository`. At minimum, set `arkServerUrl` (or `arkProvider`). When `storage` is omitted, the manager defaults to in-memory wallet/contract repos (RN/Bare have no IndexedDB).

## Public Exports

The package surface is intentionally narrow:

```js
import WalletManagerArkade, {
  WalletAccountArkade,
  WalletAccountReadOnlyArkade,
} from '@arkade-os/wdk'
```

The `lib/*` helpers (address detection, BIP21, fees, formatting, LNURL) are **internal** — do not import them from `@arkade-os/wdk/src/lib/*`. Use the WDK contract for routing instead, or pull equivalent helpers from `@arkade-os/sdk` / `light-bolt11-decoder` directly.

## Known Caveats

- `transfer()` only handles asset sends; for plain Bitcoin/Ark sends use `sendTransaction`.
- `TransactionType.EMAIL` is reserved in the routing enum but not implemented.
- `getTokenBalance(...)` returns `0n` unless the asset is present in `wallet.getBalance().assets`.
