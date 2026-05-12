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
  swapProviderUrl: 'https://api.boltz.exchange', // optional: enables Lightning
})

const account = await wdk.getAccount('bitcoin', 0) // boarding account

const arkAddress = await account.getAddress()
const balance = await account.getBalance()

const quote = await account.quoteSendTransaction({ to: arkAddress, value: 1000n })
const tx = await account.sendTransaction({ to: arkAddress, value: 1000n })

console.log({ balance, quoteFee: quote.fee, txid: tx.hash })
```

## Accounts and Receive Surfaces

`getAccount(index)` resolves `m/86'/<coin>/0'/0/<index>` (`coin = 0` for bitcoin mainnet, `1` otherwise). The index is a BIP-86 key-derivation leaf — **not** a role. The manager memoises one underlying SDK wallet per path; every resulting account exposes the same three receive surfaces:

| Surface | API | Used when |
|---------|-----|-----------|
| Ark address | `account.getAddress()` | Receiving VTXO transfers (always returns the Ark address) |
| Boarding address | `account.getBoardingAddress()` | Funding the wallet via on-chain BTC deposit |
| Lightning invoice | `account.createLightningInvoice(amount, description?)` | Receiving Lightning payments via Boltz reverse swap (requires `swapProviderUrl`) |

```js
const a0 = await wdk.getAccount('bitcoin', 0)
const a1 = await wdk.getAccount('bitcoin', 1) // distinct BIP-86 path, distinct SDK wallet

const arkAddr      = await a0.getAddress()           // Ark address
const onchainAddr  = await a0.getBoardingAddress()   // on-chain BTC deposit
const { invoice }  = await a0.createLightningInvoice(50_000) // requires swapProviderUrl
```

## Lightning Invoices

Requires `swapProviderUrl` to be set on the manager. Available on every signing account — there is no dedicated "lightning" index.

```js
const account = await wdk.getAccount('bitcoin', 0)

const { invoice, paymentHash } = await account.createLightningInvoice(
  50_000,
  'Payment for coffee',
)

// Block until Boltz settles and the VTXO is claimed:
const { txid } = await account.waitForLightningPayment(invoice)
```

## Pay BOLT11 / BIP21 / Lightning Address / LNURL

`sendTransaction` accepts:

- Ark addresses, BTC addresses, BOLT11 invoices (auto-detected).
- BIP21 URIs — the inner address/invoice/LNURL and any `?amount=` carried in the URI are extracted automatically (priority: lightning > ark > lnurl > bitcoin).
- Lightning addresses (`user@wallet.com`) and LNURLs — auto-detected and routed through LNURL: an Ark address is tried first via `fetchArkAddress` (offchain fast path), then BOLT11 via `fetchInvoice` + Boltz submarine swap. Requires `swapProviderUrl` and a positive `value`.

```js
await account.sendTransaction({ to: 'bitcoin:bc1q...?amount=0.001', value: 100_000n })
await account.sendTransaction({ to: '<BOLT11 invoice>', value: 50_000n })
await account.sendTransaction({ to: 'user@wallet.com', value: 1000n })
await account.sendTransaction({ to: 'lnurl1...', value: 1000n })
```

## Lightning Lifecycle

Available on signing accounts when `swapProviderUrl` was configured:

```js
await account.getPendingLightningReceives() // PendingReverseSwap[]
await account.getPendingLightningSends()    // PendingSubmarineSwap[]
await account.getSwapHistory()              // reverse + submarine + chain swaps, newest first
await account.getLightningLimits()          // min/max bounds
await account.getLightningFees()            // fee schedule
```

All Lightning methods throw `Lightning support not configured. Provide swapProviderUrl in wallet config.` when `arkadeSwaps` is `null`.

## Watch Incoming Funds

```js
const unsubscribe = await account.subscribeToIncomingFunds(() => {
  console.log('new VTXOs arrived')
})
// later:
unsubscribe()
```

Pass-through to the SDK wallet's `notifyIncomingFunds(callback)`. The RN provider uses this to auto-refresh balances on incoming Arkade funds. The underlying SDK wallet is no longer exposed on `WalletAccountArkade`, so use this method instead of reaching for `account.wallet.notifyIncomingFunds(...)`.

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
  swapProviderUrl: 'https://api.boltz.exchange',
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
- `TransactionType.EMAIL` (Lightning address / LNURL) requires `swapProviderUrl` and a positive `value` — the LNURL Ark-address fast path needs the receiver's LNURL endpoint to advertise an Ark address, otherwise it falls back to BOLT11.
- `getTokenBalance(...)` returns `0n` unless the asset is present in `wallet.getBalance().assets`.
