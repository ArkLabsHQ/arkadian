# Arkade WDK — Usage

## Install

```bash
npm install @arkade-os/wdk @tetherto/wdk
```

`@arkade-os/sdk` is pulled transitively. Add it explicitly only if your app imports from it directly.

## Quick Start

```typescript
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

const quote = await account.quoteSendTransaction({
  to: arkAddress,
  value: 1000n,
})

const tx = await account.sendTransaction({
  to: arkAddress,
  value: 1000n,
})

console.log({ balance, quoteFee: quote.fee, txid: tx.hash })
```

## Account Indices

| Index | Mode | Returned by `getAddress()` |
|-------|------|----------------------------|
| 0 | boarding | On-chain BTC deposit address |
| 1 | offchain | Ark address (Taproot) |
| 2 | lightning | `''` (empty) — generate invoice via `createLightningInvoice` instead |

```typescript
const boarding = await wdk.getAccount('bitcoin', 0)
const offchain = await wdk.getAccount('bitcoin', 1)
const lightning = await wdk.getAccount('bitcoin', 2)
```

All three are backed by the **same** underlying SDK wallet — the index controls which surface is exposed.

## Lightning Invoices

Requires `swapProviderUrl` to be set on the manager.

```typescript
const lightning = await wdk.getAccount('bitcoin', 2)

const { invoice, paymentHash } = await lightning.createLightningInvoice(
  50_000,
  'Payment for coffee',
)

console.log(invoice) // BOLT11 string
```

## Pay a Lightning Address / LNURL

```typescript
import { fetchInvoice, isLightningAddress } from '@arkade-os/wdk'

if (isLightningAddress('user@wallet.com')) {
  const invoice = await fetchInvoice('user@wallet.com', 1000, 'tip')
  await account.sendTransaction({ to: invoice, value: 1000n })
}
```

`sendTransaction` auto-detects BOLT11 strings and routes them through Boltz internally.

## Read-Only Account

```typescript
const ro = await account.toReadOnlyAccount()
const balance = await ro.getBalance()
const history = await ro.getTransactionHistory()
// ro.sign(...) does not exist — read-only accounts cannot sign
```

## Direct SDK Access

For operations not covered by the WDK interface, use `account.wallet`:

```typescript
const detailedBalance = await account.wallet.getBalance()
// → { total, offchain, onchain }

const history = await account.getTransactionHistory()
// → ArkTransaction[] (mapped to Transaction by RN provider on the consumer side)
```

## Utility Imports (Standalone)

```typescript
import {
  // address
  isArkAddress, isBTCAddress, isLightningInvoice, decodeArkAddress,
  // BIP21
  isBip21, decodeBip21, encodeBip21,
  // BOLT11
  isValidInvoice, decodeInvoice,
  // LNURL
  isLightningAddress, isLnUrl, fetchInvoice, fetchArkAddress,
  // fees
  calculateOffchainFee, calculateOnchainFee, calculateLightningFee,
  // formatting
  fromSatoshis, toSatoshis, formatSats, formatSatsWithCommas, prettyNumber,
} from '@arkade-os/wdk'
```

## Static Helpers

Inherited from the WDK base `WalletManager`:

```typescript
import WalletManagerArkade from '@arkade-os/wdk'

const phrase = WalletManagerArkade.getRandomSeedPhrase(12) // or 24
const ok = WalletManagerArkade.isValidSeedPhrase(phrase)
```

## Configuration

```typescript
import type { ArkadeWalletConfig } from '@arkade-os/wdk'

const config: ArkadeWalletConfig = {
  arkServerUrl: 'https://arkade.computer',
  swapProviderUrl: 'https://api.ark.boltz.exchange',
}
```

`ArkadeWalletConfig` is the SDK wallet config (minus `identity`) plus `swapProviderUrl`. At minimum, set `arkServerUrl` (or `arkProvider`).

## Known Caveats

- `getFeeRates()` returns `{ normal: 0n, fast: 0n }` placeholders.
- `sendTransaction` does **not** accept BIP21 URIs directly — decode first with `decodeBip21`.
- `transfer()` and `quoteTransfer()` throw — WDK's transfer concept does not apply.
- Lightning lifecycle helpers (`waitForLightningPayment`, `getPendingLightningReceives`, etc.) are not implemented.
