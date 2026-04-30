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

### 2. Direct indexer/Esplora workaround (RN balance)

In `wdk-react-native-provider`, balance computation for arkade networks bypasses the worklet:

| Account Mode | REST Call |
|--------------|-----------|
| Offchain / Lightning | `GET ${arkServerUrl}/v1/indexer/vtxos?scripts=${pkScript}&spendableOnly=true` |
| Boarding | `GET ${esploraUrl}/address/${addr}/utxo` |

`pkScript` is extracted from the Ark address by an inline bech32m decoder (`arkAddressToPkScript`) so the workaround does not pull in additional dependencies. The reason for this workaround is documented in `system/architecture.md` and `README.md`: the SDK's Esplora URL defaults to `http://localhost:3000` (regtest), which is unreachable from a physical device. Once the SDK exposes a configurable Esplora URL through the worklet path, this workaround is expected to be removed.

### 3. Lightning (optional)

When the manager is constructed with `swapProviderUrl`, an `ArkadeLightning` instance from `@arkade-os/boltz-swap` is attached to each account:

| Operation | Path |
|-----------|------|
| `createLightningInvoice(amount, description?)` | Boltz reverse swap (Boltz pays the BOLT11 invoice they hand back; we receive Ark via VTXO) |
| `sendTransaction({ to: BOLT11, value })` | Boltz submarine swap (we send Ark; Boltz pays the BOLT11 invoice) |

The Lightning swap lifecycle (status polling, refunds, swap history) is not yet exposed through this adapter — those helpers are flagged TODO in the README.

## Configuration

```ts
import type { ArkadeWalletConfig } from '@arkade-os/wdk'

const config: ArkadeWalletConfig = {
  arkServerUrl: 'https://arkade.computer',     // arkd endpoint
  swapProviderUrl: 'https://api.ark.boltz.exchange', // optional: enables Lightning
}
```

`ArkadeWalletConfig` is a superset of the `@arkade-os/sdk` wallet config (excluding `identity`, which is provided by the seed) plus `swapProviderUrl`. At minimum, `arkServerUrl` (or `arkProvider`) is required.

## Failure Modes & Operational Notes

- **arkd unreachable** — Surfaces as errors from the SDK on any account method. The adapter does not retry; consumer apps decide.
- **Indexer endpoint unreachable** (RN balance workaround) — Balance reads fail; fallback would be to route through the standard SDK path on platforms where Esplora is reachable.
- **Boltz unreachable / `swapProviderUrl` not set** — `arkadeLightning` is `null` and `createLightningInvoice` is unavailable; BOLT11 sends through `sendTransaction` will fail at the routing layer.
- **Worklet path failures** (RN) — `getTransactionHistory` and other HRPC-bridged calls require the bare-kit worklet (`pear-wrk-wdk`) to be running and patched; build issues in `packages/pear-wrk-wdk` propagate to runtime.

## Versioning Coupling

| Component | Pinned Version (current) |
|-----------|--------------------------|
| `@arkade-os/sdk` | `^0.4.8` |
| `@arkade-os/boltz-swap` | `^0.3.6` |
| `@tetherto/wdk-wallet` | `^1.0.0-beta.5` |
| `@tetherto/wdk` (devDep, runtime via consumer) | `^1.0.0-beta.4` |

Bumping `@arkade-os/sdk` may require regenerating patches under `packages/wdk-react-native-provider` if any worklet or HRPC types changed.
