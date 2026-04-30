# Arkade WDK — API Reference

Reflects `@arkade-os/wdk` `0.1.0`. Some methods are implemented, some are stubs/placeholders, and some are tracked as TODO. The sections below mark each with its current status.

## `WalletManagerArkade`

```typescript
class WalletManagerArkade extends WalletManager {
  // Inherited from @tetherto/wdk-wallet WalletManager:
  static getRandomSeedPhrase(wordCount?: 12 | 24): string
  static isValidSeedPhrase(seedPhrase: string): boolean

  constructor(seed: string | Uint8Array, config?: ArkadeWalletConfig)

  getAccount(index?: number): Promise<WalletAccountArkade>
  getAccountByPath(path: string): Promise<WalletAccountArkade>
  getFeeRates(): Promise<{ normal: bigint; fast: bigint }>   // ⚠ placeholder (returns 0n/0n)
  dispose(): void
}
```

### `getAccount(index)`

| Index | Mode |
|-------|------|
| 0 | boarding (default) |
| 1 | offchain |
| 2 | lightning |

Returns the same account instance for the same index across calls (sharing the underlying SDK wallet).

### `getAccountByPath(path)`

Resolves a derivation path string to an account in one of the three modes. Path-to-index mapping follows the same convention used internally by `getAccount`.

### `getFeeRates()`

Currently returns `{ normal: 0n, fast: 0n }`. Tracked as a TODO in the README.

---

## `WalletAccountArkadeReadOnly`

```typescript
class WalletAccountArkadeReadOnly {
  readonly index: number
  readonly path: string
  readonly keyPair: { publicKey: Uint8Array }

  getAddress(): Promise<string>                       // '' for lightning (index 2)
  getBalance(): Promise<bigint>
  getTransactionHistory(): Promise<ArkTransaction[]>
  verify(message: string, signature: string): Promise<boolean>
  getTransactionReceipt(hash: string): Promise<unknown | null>
  getTokenBalance(tokenAddress: string): Promise<bigint>      // always 0n for Bitcoin
  quoteSendTransaction(tx: Transaction): Promise<{ fee: bigint }>
  quoteTransfer(options: TransferOptions): Promise<{ fee: bigint }>  // throws — N/A
}
```

### `getAddress()`

| Index | Returned |
|-------|----------|
| 0 | On-chain BTC boarding address |
| 1 | Ark address (Taproot) |
| 2 | `''` (empty string) — UI should switch to invoice flow |

### `getTokenBalance(...)`

Always returns `0n`. Bitcoin/Ark does not have a generic token model exposed through this WDK adapter (assets live in `@arkade-os/sdk`'s asset surface, not WDK token semantics).

### `quoteTransfer(...)`

Throws — WDK's account-to-account transfer concept does not apply.

---

## `WalletAccountArkade`

Extends `WalletAccountArkadeReadOnly` with signing capabilities and Lightning hooks.

```typescript
class WalletAccountArkade extends WalletAccountArkadeReadOnly {
  readonly keyPair: { publicKey: Uint8Array; privateKey: Uint8Array | null }
  readonly wallet: IWallet                            // underlying @arkade-os/sdk wallet
  readonly arkadeLightning: ArkadeLightning | null    // present iff swapProviderUrl is set

  sendTransaction(tx: Transaction): Promise<{ hash: string; fee: bigint }>
  quoteSendTransaction(tx: Transaction): Promise<{ fee: bigint }>
  transfer(options: TransferOptions): Promise<TransferResult>          // throws — N/A
  sign(message: string): Promise<string>
  toReadOnlyAccount(): Promise<WalletAccountArkadeReadOnly>
  dispose(): void

  // Lightning (only when arkadeLightning is non-null):
  createLightningInvoice(
    amount: number,
    description?: string,
  ): Promise<{ invoice: string; paymentHash: string }>
}
```

### `sendTransaction(tx)`

Routes on the destination string in `tx.to`:

| Detected | Implementation |
|----------|----------------|
| Ark address | SDK off-chain send |
| BTC address | SDK on-chain send |
| BOLT11 invoice | Boltz submarine swap (requires `arkadeLightning`) |
| BIP21 URI | **Not accepted** — caller must `decodeBip21` first |
| `EMAIL` (in `TransactionType` enum) | Not implemented |

Returns `{ hash, fee }`. `hash` is a stable identifier the consumer can pass to `getTransactionReceipt`.

### `createLightningInvoice(amount, description?)`

Available only when `swapProviderUrl` was configured at manager construction. Internally a Boltz reverse swap that returns a BOLT11 invoice the counterparty pays; we receive an Ark VTXO once the swap settles.

### `transfer(...)` / `quoteTransfer(...)`

Throw — not applicable to Bitcoin/Ark.

### `initialize()`

Currently a no-op (reserved for future eager setup).

---

## `WdkManager` Integration

`WdkManager` from `@tetherto/wdk` is the consumer-facing entry point. Register the Arkade wallet manager for the `bitcoin` chain:

```typescript
const wdk = new WdkManager(seedPhrase)
wdk.registerWallet('bitcoin', WalletManagerArkade, config)

const account = await wdk.getAccount('bitcoin', 0)
```

`@arkade-os/wdk` does not own the `WdkManager` itself — it only provides the wallet manager that gets registered.

---

## `ArkadeWalletConfig`

```typescript
type ArkadeWalletConfig = SdkWalletConfig & {
  swapProviderUrl?: string
}
```

Where `SdkWalletConfig` is `@arkade-os/sdk`'s wallet config minus `identity` (which is supplied by the seed). Minimum requirement: `arkServerUrl` (or `arkProvider`).

| Field | Required | Notes |
|-------|----------|-------|
| `arkServerUrl` | one of `arkServerUrl`/`arkProvider` | URL of the arkd REST/SSE endpoint |
| `arkProvider` | (alternative) | Pre-built `ArkProvider` instance |
| `swapProviderUrl` | optional | Enables Lightning via Boltz |
| _(other SDK config fields)_ | optional | See `@arkade-os/sdk` for the full set |

---

## Utility Exports

All re-exported from the package root.

### Address

| Export | Description |
|--------|-------------|
| `decodeArkAddress(addr)` | Decode an Ark address into its components |
| `isArkAddress(value)` | Type guard for Ark addresses |
| `isBTCAddress(value)` | Type guard for plain BTC addresses |
| `isLightningInvoice(value)` | Type guard for BOLT11 invoices |

### Transaction Routing

| Export | Description |
|--------|-------------|
| `detectTransactionType(to)` | Returns one of `TransactionType.{ARK, BTC, LIGHTNING, EMAIL}` |
| `quoteSend(...)` | Lower-level quote helper (used internally by `quoteSendTransaction`) |
| `send(...)` | Lower-level send helper (used internally by `sendTransaction`) |
| `TransactionType` | Enum of routable destination types (`EMAIL` is reserved, not implemented) |

### BIP21

| Export | Description |
|--------|-------------|
| `isBip21(value)` | Type guard for BIP21 URIs |
| `decodeBip21(uri)` | Parse a BIP21 URI into address + parameters |
| `encodeBip21(address, params?)` | Build a BIP21 URI |

### BOLT11

| Export | Description |
|--------|-------------|
| `decodeInvoice(invoice)` | Wrapper over `light-bolt11-decoder` |
| `isValidInvoice(value)` | Validity check for BOLT11 invoices |

### LNURL / Lightning Address

| Export | Description |
|--------|-------------|
| `isLnUrl(value)` | Type guard for LNURL strings |
| `isLightningAddress(value)` | Type guard for `user@host` Lightning addresses |
| `isValidLnUrl(value)` | Stronger validity check for LNURLs |
| `getCallbackUrl(lnurlOrAddress)` | Resolve the LNURL callback URL |
| `checkLnUrlConditions(lnurlData, amount)` | Validate amount against min/max bounds |
| `fetchInvoice(lnurlOrAddress, amount, comment?)` | Fetch a BOLT11 invoice from a LNURL/Lightning address |
| `fetchArkAddress(lnurlOrAddress)` | Fetch an Ark address from a Lightning-address-style endpoint |
| `getLnUrlLimits(lnurlData)` | Return min/max sendable bounds |
| `extractRecipientFromMetadata(metadata)` | Pull a human-readable recipient from LNURL metadata |

### Fees

| Export | Description |
|--------|-------------|
| `calculateOffchainFee(...)` | Off-chain (Ark) fee estimate |
| `calculateOnchainFee(...)` | On-chain (BTC) fee estimate |
| `calculateLightningFee(...)` | Lightning (Boltz swap) fee estimate |

### Formatting

| Export | Description |
|--------|-------------|
| `fromSatoshis(value)` | Convert sats → BTC string |
| `toSatoshis(value)` | Convert BTC string → sats `bigint` |
| `formatSats(value)` | Human-friendly sats formatter |
| `formatSatsWithCommas(value)` | Like `formatSats` with thousands separators |
| `prettyNumber(value)` | Generic pretty-print for amounts |

---

## Not Implemented (Tracked TODO)

The following are referenced in historical docs but **not** present in the current implementation:

- `waitForLightningPayment`
- `getPendingLightningReceives`
- `getPendingLightningSends`
- `getSwapHistory`
- `getLightningLimits`
- `getLightningFees`
- BIP21 URIs as direct input to `sendTransaction` / `quoteSendTransaction`
- `TransactionType.EMAIL` routing
