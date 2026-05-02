# Arkade WDK — Project Overview

## What is arkade-wdk?

`@arkade-os/wdk` is a WDK-compatible Bitcoin wallet adapter that exposes the Ark protocol through Tether's Wallet Development Kit (`@tetherto/wdk`). It implements the WDK `WalletManager` and `WalletAccount` contracts on top of `@arkade-os/sdk`, so any WDK-aware application — most notably React Native apps using `@tetherto/wdk-react-native-provider` — can treat an Ark wallet like any other Bitcoin wallet.

Optional Lightning support is wired through `@arkade-os/boltz-swap`: when a Boltz swap provider URL is configured, the adapter can create BOLT11 invoices (via reverse swaps) and pay BOLT11 invoices (via submarine swaps) without the consumer needing to know about Boltz.

## Package

- **npm**: `@arkade-os/wdk`
- **Version**: `0.1.0`
- **License**: MIT
- **Repository**: `ArkLabsHQ/arkade-wdk`
- **Source**: ships `src/*.js` directly (JavaScript with JSDoc); declaration files emitted into `types/` via `tsc -p tsconfig.json`.

## Core Features

| Feature | Description |
|---------|-------------|
| WDK WalletManager | `getAccount`, `getAccountByPath`, `getFeeRates`, `dispose` over per-path SDK wallets |
| Three Account Indices | Boarding (0), Offchain (1), Lightning (2) — via BIP-86 paths |
| Send/Sign/Verify/Quote | Standard WDK account methods, plus read-only conversion |
| Destination Auto-Detection | Ark address, BTC address, BOLT11 invoice, **and BIP21 URIs** routed automatically |
| LNURL / Lightning Address | `fetchInvoice`, limits, callback resolution helpers (internal) |
| BIP21 Helpers | Parse/encode BIP21 URIs (internal `lib/bip21.js`) |
| Lightning Receive | `createLightningInvoice()` → Boltz reverse swap |
| Lightning Send | Auto-detect BOLT11 in `sendTransaction()` → Boltz submarine swap |
| Lightning Lifecycle | `waitForLightningPayment`, `getPendingLightningReceives`, `getPendingLightningSends`, `getSwapHistory`, `getLightningLimits`, `getLightningFees` |
| Real Fee Rates | `getFeeRates()` returns `info.fees.txFeeRate` from arkInfo (no longer a placeholder) |
| Transaction History | `getTransactionHistory()` via SDK |
| Boarding Address | Dedicated `getBoardingAddress()` on read-only base |
| Asset Transfer | `transfer()` is now wired to the SDK's asset send (instead of throwing) |
| Read-Only Account | `toReadOnlyAccount()` returns a `WalletAccountReadOnlyArkade` backed by `ReadonlySingleKey` |
| Secure Key Erasure | `sodium_memzero` wipes private key material on `dispose()` |
| In-Memory Storage Fallback | Manager defaults to in-memory wallet/contract repos when the consumer doesn't supply storage (RN/Bare have no IndexedDB) |

## Account Model

The wallet manager exposes account indices over the BIP-86 path `m/86'/<network>/0'/0/<index>` (`network` is `0` for mainnet, `1` otherwise). A separate underlying `@arkade-os/sdk` wallet is created per derivation path:

| Index | AddressType | Purpose |
|-------|-------------|---------|
| 0 | `boarding` | On-chain BTC deposit address (funds enter the Ark) |
| 1 | `offchain` | Ark protocol address (VTXO-to-VTXO transfers) |
| 2 | `lightning` | Lightning via Boltz swaps (no static address) |

`getAddress()` returns an empty string for Lightning (index 2). Consumer UIs should detect this and present an amount-input + invoice-generation flow instead of a static QR code. Use `getBoardingAddress()` from the read-only surface to obtain the on-chain deposit address.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | JavaScript (Node ESM) with JSDoc types |
| Module System | ESM (`"type": "module"`) |
| Compile Target | ES2022 |
| Node | >= 18 |
| Test Framework | `node --test` (Node built-in test runner) |
| Linter | ESLint 8 (`eslint:recommended`) + `tsc --noEmit` (JSDoc type-check via `jsconfig.json`) |
| Formatter | Prettier (single quotes, semicolons, 2 spaces) |
| Type Output | `tsc -p tsconfig.json` emits declarations into `types/` |
| Package Manager | npm at root; submodules vary |

## Key Runtime Dependencies

| Dependency | Pinned | Role |
|------------|--------|------|
| `@arkade-os/sdk` | `0.4.21` | Underlying Ark protocol wallet |
| `@arkade-os/boltz-swap` | `0.3.22` | Optional Lightning swap integration |
| `@tetherto/wdk-wallet` | `^1.0.0-beta.5` | WDK base `WalletManager` / `WalletAccountReadOnly` classes |
| `@scure/bip32` | `^2.0.1` | BIP32 HD key derivation |
| `@scure/base` | `^2.0.0` | Bech32 / base encoding |
| `light-bolt11-decoder` | `^3.2.0` | BOLT11 invoice parsing |
| `sodium-universal` | `^5.0.1` | `sodium_memzero` for secure key erasure |

## Submodules

| Path | Repo Role |
|------|-----------|
| `packages/pear-wrk-wdk` | Bare-kit worklet runtime (HRPC schema + handlers) |
| `packages/wdk-react-native-provider` | React Native provider (WDK service, contexts, UI wiring) |
| `examples/wdk-starter-react-native` | Expo example app exercising the full stack |

Each submodule is an independent git repository. Local modifications are kept as patches under `./patches/` and applied via `scripts/setup-dev.js`.

## Use Cases

1. **React Native Bitcoin wallet** — Plug Ark in as the Bitcoin backend of a WDK-based RN app.
2. **Multi-chain WDK app** — Register `WalletManagerArkade` next to other WDK chains under one `WdkManager`.
3. **Lightning-enabled Ark wallet** — Configure `swapProviderUrl` to send/receive BOLT11.
4. **Watch-only display wallet** — Use `toReadOnlyAccount()` for read-only UIs.

## Integration Points

- **`@arkade-os/sdk`**: Underlying wallet, transport to arkd, VTXO management.
- **arkd**: Reached transitively through the SDK; the RN provider also queries `/v1/indexer/vtxos` directly for balance.
- **Boltz backend**: Reached through `@arkade-os/boltz-swap` when `swapProviderUrl` is set.
- **Esplora**: Direct REST calls (configurable via `indexerUrl`) for boarding (on-chain) UTXO lookups.
- **`@tetherto/wdk-react-native-provider`**: Consumes this package via the worklet/HRPC bridge in submodules.

## Current Implementation Notes

- `transfer()` is implemented for asset sends; only the read-only `quoteTransfer` returns a fee estimate.
- BIP21 URIs are accepted directly by `sendTransaction` / `quoteSendTransaction` — `resolveDestination` in `lib/send.js` extracts the inner address/invoice and any `?amount=` carried in the URI.
- The package public surface is intentionally narrow: `index.js` only exports the manager (default) plus `WalletAccountArkade` and `WalletAccountReadOnlyArkade`. The `lib/*` helpers are internal.
- Lightning-only methods on `WalletAccountArkade` throw `Lightning support not configured` when `swapProviderUrl` was not supplied — the `arkadeSwaps` field (renamed from `arkadeLightning`) is `null` in that case.
