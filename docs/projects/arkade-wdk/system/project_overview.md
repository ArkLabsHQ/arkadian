# Arkade WDK — Project Overview

## What is arkade-wdk?

`@arkade-os/wdk` is a WDK-compatible Bitcoin wallet adapter that exposes the Ark protocol through Tether's Wallet Development Kit (`@tetherto/wdk`). It implements the WDK `WalletManager` and `WalletAccount` interfaces on top of `@arkade-os/sdk`, so any WDK-aware application — most notably React Native apps using `@tetherto/wdk-react-native-provider` — can treat an Ark wallet like any other Bitcoin wallet.

Optional Lightning support is wired through `@arkade-os/boltz-swap`: when a Boltz swap provider URL is configured, the adapter can create BOLT11 invoices (via reverse swaps) and pay BOLT11 invoices (via submarine swaps) without the consumer needing to know about Boltz.

## Package

- **npm**: `@arkade-os/wdk`
- **Version**: `0.1.0`
- **License**: MIT
- **Repository**: `ArkLabsHQ/arkade-wdk`

## Core Features

| Feature | Description |
|---------|-------------|
| WDK WalletManager | `getAccount`, `getAccountByPath`, `dispose` over a single shared SDK wallet |
| Three Account Types | Boarding (0), Offchain (1), Lightning (2) — same underlying wallet |
| Send/Sign/Verify/Quote | Standard WDK account methods, plus read-only conversion |
| Destination Auto-Detection | Ark address, BTC address, BOLT11 invoice routed automatically |
| LNURL / Lightning Address | `fetchInvoice`, limits, callback resolution helpers |
| BIP21 Helpers | Parse and encode BIP21 URIs |
| Lightning Receive | `createLightningInvoice()` via HRPC → Boltz reverse swap |
| Lightning Send | Auto-detect BOLT11 in `sendTransaction()` |
| Transaction History | `getTransactionHistory()` via HRPC → SDK |
| Direct Indexer/Esplora Balance | Workaround path for arkade balance on RN |
| Read-Only Account | `toReadOnlyAccount()` strips the private key |
| Utility Exports | Address detection, BIP21, fees, formatting from one entry point |

## Account Model

The wallet manager exposes three account indices, all sharing the same underlying `@arkade-os/sdk` wallet instance:

| Index | AddressType | Purpose |
|-------|-------------|---------|
| 0 | `boarding` | On-chain BTC deposit address (funds enter the Ark) |
| 1 | `offchain` | Ark protocol address (VTXO-to-VTXO transfers) |
| 2 | `lightning` | Lightning via Boltz swaps (no static address) |

`getAddress()` returns an empty string for Lightning (index 2). Consumer UIs should detect this and present an amount-input + invoice-generation flow instead of a static QR code.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Module System | ESM (`"type": "module"`) |
| Compile Target | ES2022 |
| Node | >= 18 |
| Test Framework | Jest 29 (ESM via `--experimental-vm-modules`) |
| Linter | ESLint 8 + `@typescript-eslint` |
| Formatter | Prettier (single quotes, semicolons, 2 spaces, width 100) |
| Build | `tsc` to `dist/` |
| Package Manager | npm at root; submodules vary |

## Key Runtime Dependencies

| Dependency | Role |
|------------|------|
| `@arkade-os/sdk` | Underlying Ark protocol wallet |
| `@arkade-os/boltz-swap` | Optional Lightning swap integration |
| `@tetherto/wdk-wallet` | WDK base `WalletManager` / `WalletAccount` classes |
| `@scure/bip32` | BIP32 HD key derivation |
| `@scure/base` | Bech32m / base encoding (used in pkScript helper) |
| `light-bolt11-decoder` | BOLT11 invoice parsing |
| `bare-node-runtime` | Node-runtime shims for the bare-kit worklet path |

## Submodules

| Path | Repo Role |
|------|-----------|
| `packages/pear-wrk-wdk` | Bare-kit worklet runtime (HRPC schema + handlers) |
| `packages/wdk-react-native-provider` | React Native provider (WDK service, contexts, UI wiring) |
| `examples/wdk-starter-react-native` | Expo example app exercising the full stack |

Each submodule is an independent git repository. Local modifications are kept as patches under `./patches/` and applied via `scripts/apply-patches.js`.

## Use Cases

1. **React Native Bitcoin wallet** — Plug Ark in as the Bitcoin backend of a WDK-based RN app.
2. **Multi-chain WDK app** — Register `WalletManagerArkade` next to other WDK chains under one `WdkManager`.
3. **Lightning-enabled Ark wallet** — Configure `swapProviderUrl` to send/receive BOLT11.
4. **Watch-only display wallet** — Use `toReadOnlyAccount()` for read-only UIs.
5. **Custom integration** — Use the utility helpers (`isArkAddress`, `decodeBip21`, `fetchInvoice`, fee calculators) standalone.

## Integration Points

- **`@arkade-os/sdk`**: Underlying wallet, transport to arkd, VTXO management.
- **arkd**: Reached transitively through the SDK; also queried directly for balance via `/v1/indexer/vtxos`.
- **Boltz backend**: Reached through `@arkade-os/boltz-swap` when `swapProviderUrl` is set.
- **Esplora**: Direct REST calls for boarding (on-chain) UTXO lookups.
- **`@tetherto/wdk-react-native-provider`**: Consumes this package via the worklet/HRPC bridge in submodules.

## Current Implementation Gaps

Tracked in `README.md`:

- `getFeeRates()` returns placeholder values (`normal: 0n`, `fast: 0n`).
- Lightning swap lifecycle helpers (`waitForLightningPayment`, `getPendingLightningReceives`, etc.) are not implemented.
- `TransactionType.EMAIL` is in the routing enum but not implemented.
- `sendTransaction` / `quoteSendTransaction` expect direct destinations, not BIP21 URIs.
- Jest setup file (`src/__tests__/setup.ts`) is referenced by config but missing — `npm test` fails on config validation until added.
- `WalletAccountArkade.initialize()` is a no-op.
