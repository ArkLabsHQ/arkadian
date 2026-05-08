# Arkade WDK — API Reference

Reflects `@arkade-os/wdk` `0.1.0` (post-WDK-conformance refactor). The package is JavaScript with JSDoc; the type signatures below mirror the JSDoc / emitted `.d.ts` shapes.

## Public Exports (`src/index.js`)

```js
export { default } from './wallet-manager-arkade.js';        // WalletManagerArkade
export { WalletAccountArkade } from './wallet-account-arkade.js';
export { WalletAccountReadOnlyArkade } from './wallet-account-read-only-arkade.js';
```

Nothing else is part of the public surface — the `lib/*` helpers are internal.

---

## `WalletManagerArkade`

```ts
class WalletManagerArkade extends WalletManager {
  // Inherited from @tetherto/wdk-wallet WalletManager:
  static getRandomSeedPhrase(wordCount?: 12 | 24): string
  static isValidSeedPhrase(seedPhrase: string): boolean

  constructor(seed: string | Uint8Array, config?: ArkadeWalletConfig)

  getAccount(index?: number): Promise<WalletAccountArkade>
  getAccountByPath(path: string): Promise<WalletAccountArkade>
  getFeeRates(): Promise<{ normal: bigint; fast: bigint }>   // real rate from arkInfo
  dispose(): Promise<void>                                   // wipes seed via sodium_memzero
}
```

### `getAccount(index)`

| Index | Mode |
|-------|------|
| 0 | boarding (default) |
| 1 | offchain |
| 2 | lightning |

Resolves `m/86'/<network>/0'/0/<index>` (network = `0` for mainnet, `1` otherwise) and forwards to `getAccountByPath`.

### `getAccountByPath(path)`

Cached per-path: subsequent calls with the same path return the same `WalletAccountArkade`. The underlying SDK `Wallet` is also memoised per-path; failed creations are evicted so the next call retries.

### `getFeeRates()`

Returns `{ normal, fast }` where both equal `BigInt(Math.ceil(parseFeeRate(info.fees.txFeeRate)))`. Ark has no mempool fee tiers — the split is preserved to match the WDK `FeeRates` shape.

### `dispose()`

Async. Marks the manager disposed (so further `getAccount` calls throw), disposes every cached wallet, then zeroes the seed buffer via `sodium_memzero(this.seed)`.

---

## `WalletAccountReadOnlyArkade`

Extends `WalletAccountReadOnly` from `@tetherto/wdk-wallet`. Backed by an `IReadonlyWallet`, an `IndexerProvider`, and the manager's cached `arkInfo` promise.

```ts
class WalletAccountReadOnlyArkade extends WalletAccountReadOnly {
  // address handling inherited from WalletAccountReadOnly
  getAddress(): Promise<string>                       // '' for lightning (index 2)

  getBoardingAddress(): Promise<string>
  getBalance(): Promise<bigint>                       // total = offchain + onchain
  verify(message: string, signature: string): Promise<boolean>
  getTransactionReceipt(hash: string): Promise<unknown | null>
  getTransactionHistory(): Promise<ArkTransaction[]>
  getTokenBalance(tokenAddress: string): Promise<bigint>
  quoteSendTransaction(tx: Transaction): Promise<{ fee: bigint }>
  quoteTransfer(options: { token: string; recipient: string; amount: number | bigint }):
    Promise<{ fee: bigint }>
}
```

### `getAddress()`

| Index | Returned |
|-------|----------|
| 0 | On-chain BTC boarding address |
| 1 | Ark address (Taproot) |
| 2 | `''` (empty string) — UI should switch to invoice flow |

### `getTokenBalance(assetId)`

Searches `wallet.getBalance().assets` for a matching `assetId` and returns its amount as `bigint`. Returns `0n` when no match (Bitcoin/Ark itself does not have a generic token model — assets are an SDK-level concept).

### `quoteTransfer(options)`

Returns the offchain fee estimate from `calculateOffchainFee(arkInfo)` (no longer throws — read-only quote is supported).

---

## `WalletAccountArkade`

Extends `WalletAccountReadOnlyArkade` with signing, sending, asset transfer, and Lightning hooks.

```ts
class WalletAccountArkade extends WalletAccountReadOnlyArkade {
  readonly path: string
  readonly index: number                              // parsed from path's last segment
  readonly keyPair: KeyPair                           // { publicKey; privateKey }
  readonly arkadeSwaps: ArkadeSwaps | null            // present iff swapProviderUrl is set

  sendTransaction(tx: Transaction): Promise<{ hash: string; fee: bigint }>
  quoteSendTransaction(tx: Transaction): Promise<{ fee: bigint }>
  transfer(options: { token: string; recipient: string; amount: number | bigint }):
    Promise<{ hash: string; fee: bigint }>
  sign(message: string): Promise<string>              // BIP322 sign
  subscribeToIncomingFunds(
    callback: (coins: import('@arkade-os/sdk').IncomingFunds) => void,
  ): Promise<() => void>                              // returns unsubscribe handle
  toReadOnlyAccount(): Promise<WalletAccountReadOnlyArkade>
  dispose(): void                                     // wipes private key, disposes swaps

  // Lightning (only when arkadeSwaps is non-null):
  createLightningInvoice(
    amount: number,
    description?: string,
  ): Promise<{ invoice: string; paymentHash: string }>
  waitForLightningPayment(invoice: string): Promise<{ txid: string }>
  getPendingLightningReceives(): Promise<PendingReverseSwap[]>
  getPendingLightningSends(): Promise<PendingSubmarineSwap[]>
  getSwapHistory(): Promise<(PendingReverseSwap | PendingSubmarineSwap | PendingChainSwap)[]>
  getLightningLimits(): Promise<LimitsResponse>
  getLightningFees(): Promise<FeesResponse>
}
```

### `sendTransaction(tx)` / `quoteSendTransaction(tx)`

Routes through `lib/send.js#send` / `quoteSend`, which:

1. **Resolve BIP21**: if `tx.to` starts with `bitcoin:` or carries `?ark=` / `?lightning=` / `?amount=`, the inner address/invoice is extracted (priority: lightning > ark > bitcoin).
2. **Detect type**: Ark / BTC / BOLT11 destinations are dispatched separately.

| Detected | Implementation |
|----------|----------------|
| `ARK_OFFCHAIN` (Ark address) | SDK off-chain send |
| `BITCOIN_ONCHAIN` (BTC address) | SDK on-chain send |
| `LIGHTNING` (BOLT11 invoice) | Boltz submarine swap (requires `arkadeSwaps`) |
| BIP21 URI wrapping any of the above | Resolved + re-routed |
| `EMAIL` (in `TransactionType` enum) | Not implemented |

Returns `{ hash, fee }`.

### `transfer(options)` / `quoteTransfer(...)` (signing)

`transfer({ token, recipient, amount })` issues `wallet.send({ address: recipient, assets: [{ assetId: token, amount: Number(amount) }] })` and returns `{ hash: txid, fee: <offchain estimate> }`.

`quoteTransfer` is inherited from the read-only base and returns the offchain fee estimate.

### `sign(message)`

BIP322 sign using `wallet.identity` from the SDK.

### `subscribeToIncomingFunds(callback)`

Pass-through to the SDK wallet's `notifyIncomingFunds(callback)`. Resolves to an unsubscribe function. The RN provider uses this to fire balance-listener callbacks when new VTXOs arrive. Replaces direct access to `account.wallet.notifyIncomingFunds(...)`, which is no longer available because the underlying SDK wallet is now private.

### `toReadOnlyAccount()`

Constructs an `IReadonlyWallet` projection of the underlying SDK wallet:

- `identity` is `ReadonlySingleKey.fromPublicKey(await wallet.identity.compressedPublicKey())`.
- `assetManager` is narrowed to `{ getAssetDetails }` so the read-only facade cannot sign asset transactions (the full `IAssetManager` exposes issue / reissue / burn).

Returns a `WalletAccountReadOnlyArkade` wrapping that projection.

### `dispose()`

Wipes `keyPair.privateKey` via `sodium_memzero`, asynchronously disposes `arkadeSwaps` (if present), and forwards to the read-only base's `dispose()` if it exists (forward-compat).

### Lightning Methods

All Lightning methods route through an internal `_requireSwaps()` that throws `Lightning support not configured. Provide swapProviderUrl in wallet config.` when `arkadeSwaps` is `null`. Otherwise:

- `createLightningInvoice(amount, description?)` → `swaps.createLightningInvoice({ amount, description })`.
- `waitForLightningPayment(invoice)` → finds the matching pending reverse swap (by `swap.response.invoice`) and calls `swaps.waitAndClaim(swap)`. Throws if no match (the invoice must have been created on this account).
- `getPendingLightningReceives` / `getPendingLightningSends` / `getSwapHistory` / `getLightningLimits` / `getLightningFees` are thin pass-throughs to the corresponding `ArkadeSwaps` methods.

---

## `WdkManager` Integration

```js
const wdk = new WdkManager(seedPhrase)
wdk.registerWallet('bitcoin', WalletManagerArkade, config)

const account = await wdk.getAccount('bitcoin', 0)
```

`@arkade-os/wdk` does not own `WdkManager` — it only provides the wallet manager that gets registered.

---

## `ArkadeWalletConfig`

Defined as a JSDoc typedef in `src/types.js`:

```ts
type ArkadeWalletConfig =
  WalletConfig &                              // from @tetherto/wdk-wallet
  Omit<SdkWalletConfig, 'identity'> & {       // from @arkade-os/sdk
    swapProviderUrl?: string
  }
```

| Field | Required | Notes |
|-------|----------|-------|
| `arkServerUrl` | one of `arkServerUrl` / `arkProvider` | URL of the arkd REST/SSE endpoint |
| `arkProvider` | (alternative) | Pre-built `ArkProvider` instance |
| `swapProviderUrl` | optional | Enables Lightning via Boltz |
| `swapRepository` | optional | Forwarded into `ArkadeSwaps.create` (e.g. SQLite-backed) |
| `storage` | optional | Defaults to `{ walletRepository: InMemoryWalletRepository, contractRepository: InMemoryContractRepository }` when omitted |
| _(other SDK config fields)_ | optional | See `@arkade-os/sdk` for the full set |

---

## Internal Helpers (Not Exported)

The following live under `src/lib/` and are **not** exported from the package:

- `address.js`: `decodeArkAddress`, `isArkAddress`, `isBTCAddress`, `isLightningInvoice`
- `bech32m.js`: `bech32mDecode`, `bech32mFromWords`, `arkAddressToPkScript` (cross-checked against `ArkAddress` from the SDK)
- `bip21.js`: `isBip21`, `decodeBip21`, `encodeBip21`
- `bolt11.js`: `decodeInvoice`, `isValidInvoice`
- `lnurl.js`: `isLnUrl`, `isLightningAddress`, `isValidLnUrl`, `getCallbackUrl`, `checkLnUrlConditions`, `fetchInvoice`, `fetchArkAddress`, `getLnUrlLimits`, `extractRecipientFromMetadata`
- `send.js`: `detectTransactionType`, `resolveDestination`, `quoteSend`, `send`, `TransactionType`
- `fees.js`: `parseFeeRate`, `calculateOffchainFee`, `calculateOnchainFee`, `calculateLightningFee`
- `format.js`: `fromSatoshis`, `toSatoshis`, `formatSats`, `formatSatsWithCommas`, `prettyNumber`

Consumers should rely on the WDK contract (`sendTransaction` / `quoteSendTransaction` / `transfer` / etc.) rather than reaching into these.

---

## Not Implemented

- `TransactionType.EMAIL` routing (the enum value exists but no implementation).
- WDK `initialize()` is not overridden on the read-only base; signing-only setup happens lazily during `getAccountByPath`.

## Removed / No Longer Public

- `WalletAccountArkade.wallet` (`IWallet`) — the underlying `@arkade-os/sdk` wallet is no longer exposed on the account. Consumers that previously read `account.wallet.getBalance()`, `account.wallet.notifyIncomingFunds(...)`, etc. should switch to `account.getBalance()`, `account.subscribeToIncomingFunds(...)`, and `account.getTransactionHistory()`.
