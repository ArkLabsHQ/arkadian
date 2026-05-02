# Arkade WDK — Integration with arkd & Boltz

## Summary

`arkade-wdk` does not talk to `arkd` directly through gRPC or REST. It delegates almost everything to `@arkade-os/sdk`, which is the protocol client. The one exception is a workaround in the React Native provider that hits the arkd indexer (and an Esplora endpoint) directly to compute balances without going through the bare-kit worklet.

```
                                  ┌────────────────────────────┐
WDK consumer (RN/Node app)        │            arkd            │
        │                         │  REST + SSE + Indexer API  │
        ▼                         └──────────▲─────────────────┘
@tetherto/wdk WalletManager                  │
        │                                    │ (full protocol traffic)
        ▼                                    │
@arkade-os/wdk WalletManagerArkade           │
        │                                    │
        ▼                                    │
@arkade-os/sdk Wallet ────────────────────────┘
        │
        │ Boltz operations (when enabled)
        ▼
@arkade-os/boltz-swap → boltz-backend
```

## Communication Paths

### 1. Protocol traffic (default path)

Everything that touches the Ark protocol — boarding, offchain sends, settlement, transaction history, signing — flows:

`WalletAccountArkade` → `wallet` (`@arkade-os/sdk`) → arkd (REST + SSE).

This includes:

- `getAddress()` for Ark addresses and on-chain boarding addresses
- `quoteSendTransaction()` and `sendTransaction()` for Ark and BTC destinations
- `sign()` / `verify()`
- `getTransactionHistory()`

### 2. Direct indexer / Esplora (RN balance + watcher)

In `wdk-react-native-provider`, balance computation and incoming-funds watching for arkade networks go through direct REST calls (not the worklet):

| Account Mode | REST Call |
|--------------|-----------|
| Offchain / Lightning | `GET ${arkServerUrl}/v1/indexer/vtxos?scripts=${pkScript}&spendableOnly=true` |
| Boarding | `GET ${esploraUrl}/address/${addr}/utxo` |

`pkScript` is extracted from the Ark address by an inline bech32m decoder (`arkAddressToPkScript`); the cross-checked counterpart in `src/lib/bech32m.js` is unit-tested against the SDK's `ArkAddress`. The Arkade chain config now accepts an explicit `indexerUrl` (the virtual mempool / indexer endpoint) so the RN side can target the right indexer without relying on the SDK's defaults. The provider also auto-refreshes balances when incoming Arkade funds are detected.

### 3. Lightning (optional)

When the manager is constructed with `swapProviderUrl`, an `ArkadeSwaps` instance from `@arkade-os/boltz-swap` is attached to each account (the field is `arkadeSwaps`, not `arkadeLightning`):

| Operation | Path |
|-----------|------|
| `createLightningInvoice(amount, description?)` | Boltz reverse swap (Boltz pays the BOLT11 invoice they hand back; we receive Ark via VTXO) |
| `sendTransaction({ to: BOLT11, value })` | Boltz submarine swap (we send Ark; Boltz pays the BOLT11 invoice) |
| `waitForLightningPayment(invoice)` | Looks up the matching pending reverse swap and calls `swaps.waitAndClaim(swap)` |
| `getPendingLightning{Receives,Sends}` / `getSwapHistory` | Pending and historical swaps from `ArkadeSwaps` |
| `getLightningLimits` / `getLightningFees` | Min/max bounds and fee schedule from the swap provider |

The swap manager runs with `autoStart: true` and a 5-second poll interval. A consumer-supplied `swapRepository` (e.g. SQLite-backed) is forwarded into `ArkadeSwaps.create` if present in `ArkadeWalletConfig`.

## Configuration

```js
/** @type {import('@arkade-os/wdk').ArkadeWalletConfig} */
const config = {
  arkServerUrl: 'https://arkade.computer',          // arkd endpoint
  swapProviderUrl: 'https://api.ark.boltz.exchange', // optional: enables Lightning
  // storage: { walletRepository, contractRepository }, // optional; defaults to in-memory
  // swapRepository: <SQLite-backed repo>,              // optional; forwarded into ArkadeSwaps
}
```

`ArkadeWalletConfig` (defined as a JSDoc typedef in `src/types.js`) is a superset of the `@arkade-os/sdk` wallet config (excluding `identity`, which is provided by the seed) plus `swapProviderUrl`. At minimum, `arkServerUrl` (or `arkProvider`) is required.

## Failure Modes & Operational Notes

- **arkd unreachable** — `arkProvider.getInfo()` is retried once at construction; if both attempts fail, every `getAccount` / `getFeeRates` await rejects with the original SDK error. `Wallet.create` is also wrapped in a 30s timeout that surfaces a clear "Ark wallet creation timed out — is the Ark server reachable?" error.
- **Indexer / Esplora unreachable** (RN) — Balance reads fail; Lightning/offchain balance returns null on the RN side.
- **Malformed `txFeeRate` from ASP** — Validated by `parseFeeRate`; throws `Invalid Ark fee rate from server: <raw>` instead of producing `NaN` further down.
- **Boltz unreachable / `swapProviderUrl` not set** — `arkadeSwaps` is `null` and `createLightningInvoice` (and every other Lightning method) throws `Lightning support not configured`. BOLT11 sends through `sendTransaction` fail at the routing layer.
- **Worklet path** (RN) — Non-Arkade chains still route through the bare-kit worklet (`pear-wrk-wdk`); for Arkade the wallet runs on the RN JS thread directly.

## Versioning Coupling

| Component | Pinned Version (current) |
|-----------|--------------------------|
| `@arkade-os/sdk` | `0.4.21` |
| `@arkade-os/boltz-swap` | `0.3.22` |
| `@tetherto/wdk-wallet` | `^1.0.0-beta.5` |
| `@tetherto/wdk` (devDep, runtime via consumer) | `^1.0.0-beta.4` |
| `sodium-universal` | `^5.0.1` |
| `bare-*` worklet addons | Pinned to versions `react-native-bare-kit` ships (multiple shims for `bare-abort`, `bare-stdio`, `bare-performance`, `bare-type`, `bare-crypto`) |

Bumping `@arkade-os/sdk` typically requires regenerating patches under `packages/wdk-react-native-provider` if any worklet or HRPC types changed.
