# Arkade WDK — Project Overview

## What is arkade-wdk?

`@arkade-os/wdk` is a WDK-compatible Bitcoin wallet adapter that exposes the Ark protocol through Tether's Wallet Development Kit (`@tetherto/wdk`). It implements the WDK `WalletManager` and `WalletAccount` contracts on top of `@arkade-os/sdk`, so any WDK-aware application — most notably React Native apps using `@tetherto/wdk-react-native-provider` — can treat an Ark wallet like any other Bitcoin wallet.

Optional Lightning support is wired through `@arkade-os/boltz-swap`: when a Boltz swap provider URL is configured, the adapter can create BOLT11 invoices (via reverse swaps) and pay BOLT11 invoices (via submarine swaps) without the consumer needing to know about Boltz.

## Package

- **npm**: `@arkade-os/wdk`
- **Version**: `0.1.3`
- **License**: MIT
- **Repository**: `ArkLabsHQ/arkade-wdk`
- **Source**: ships `src/*.js` directly (JavaScript with JSDoc); declaration files emitted into `types/` via `tsc -p tsconfig.json`.

## Core Features

| Feature | Description |
|---------|-------------|
| WDK WalletManager | `getAccount`, `getAccountByPath`, `getFeeRates`, `dispose` over per-path SDK wallets |
| Per-Index BIP-86 Wallets | `getAccount(index)` resolves `m/86'/<coin>/0'/0/<index>` and memoises a distinct SDK wallet per path. The index is a key-derivation leaf, not a role. |
| Send/Sign/Verify/Quote | Standard WDK account methods, plus read-only conversion |
| Destination Auto-Detection | Ark address, BTC address, BOLT11 invoice, Lightning address, LNURL, **and BIP21 URIs** routed automatically |
| LNURL / Lightning Address | Native routing via `sendTransaction()` (`EMAIL` → LNURL ark-address fast path or BOLT11 fallback); helpers also exported as `lib/lnurl.js` (internal) |
| BIP21 Helpers | Parse/encode BIP21 URIs (internal `lib/bip21.js`) |
| Lightning Receive | `createLightningInvoice()` → Boltz reverse swap |
| Lightning Send | Auto-detect BOLT11 in `sendTransaction()` → Boltz submarine swap |
| Lightning Lifecycle | `waitForLightningPayment`, `getPendingLightningReceives`, `getPendingLightningSends`, `getSwapHistory`, `getLightningLimits`, `getLightningFees` |
| Real Fee Rates | `getFeeRates()` returns `info.fees.txFeeRate` from arkInfo (no longer a placeholder) |
| Transaction History | `getTransactionHistory()` via SDK |
| Boarding Address | Dedicated `getBoardingAddress()` on read-only base |
| Asset Transfer | `transfer()` is now wired to the SDK's asset send (instead of throwing) |
| Incoming Funds Subscription | `WalletAccountArkade.subscribeToIncomingFunds(callback)` exposes the SDK's incoming-VTXO notification (used by the RN provider for auto-refresh) |
| Read-Only Account | `toReadOnlyAccount()` returns a `WalletAccountReadOnlyArkade` backed by `ReadonlySingleKey` |
| Secure Key Erasure | `sodium_memzero` wipes private key material on `dispose()` |
| In-Memory Storage Fallback | Manager defaults to in-memory wallet/contract repos when the consumer doesn't supply storage (RN/Bare have no IndexedDB) |
| Build-Version Guard | Manager detects arkd's structured `BUILD_VERSION_TOO_OLD` ArkError on `getInfo()` and surfaces an actionable "update `@arkade-os/sdk`" error (with the operator's `min_version` when provided) instead of retrying into an opaque network failure |

## Account Model

Each call to `getAccount(index)` resolves the BIP-86 path `m/86'/<coin>/0'/0/<index>` (`coin = 0` for bitcoin mainnet, `1` for any other network) and memoises a distinct `@arkade-os/sdk` wallet per path. The index is a key-derivation leaf — there is no per-index role.

Every account exposes the same three receive surfaces from its underlying wallet:

| Surface | API | Used when |
|---------|-----|-----------|
| Ark address (offchain) | `getAddress()` | Receiving VTXO transfers from other Ark users |
| Boarding address (on-chain) | `getBoardingAddress()` | Funding the wallet by depositing on-chain BTC |
| Lightning invoice | `createLightningInvoice(amount, description?)` | Receiving Lightning payments via Boltz reverse swap |

`getAddress()` **always** returns the account's Ark address — never the boarding address, never a Lightning surface. Use `getBoardingAddress()` for the on-chain deposit address and `createLightningInvoice()` for the Lightning receive surface (the latter throws `Lightning support not configured` when `swapProviderUrl` is not set, since `arkadeSwaps` is `null`).

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
| `@arkade-os/sdk` | `0.4.35` | Underlying Ark protocol wallet |
| `@arkade-os/boltz-swap` | `0.3.40` | Optional Lightning swap integration |
| `@tetherto/wdk-wallet` | `^1.0.0-beta.5` | WDK base `WalletManager` / `WalletAccountReadOnly` classes |
| `@scure/bip32` | `^2.0.1` | BIP32 HD key derivation |
| `@scure/base` | `^2.0.0` | Bech32 / base encoding |
| `light-bolt11-decoder` | `^3.2.0` | BOLT11 invoice parsing |
| `sodium-universal` | `^5.0.1` | `sodium_memzero` for secure key erasure |

## Submodules

| Path | Repo Role |
|------|-----------|
| `packages/pear-wrk-wdk` | Bare-kit worklet runtime (HRPC schema + handlers) — sourced from `ArkLabsHQ/pear-wrk-wdk` (own fork; previously pointed at `tetherto/pear-wrk-wdk`) |
| `packages/wdk-react-native-provider` | React Native provider (WDK service, contexts, UI wiring) |
| `examples/wdk-starter-react-native` | Expo example app exercising the full stack |

Each submodule is an independent git repository. Local modifications are kept as patches under `./patches/` and applied via `scripts/setup-dev.js`. The `pear-wrk-wdk` fork allows direct submodule-pointer bumps without a patch overlay (the corresponding `patches/pear-wrk-wdk.patch` was already removed in `7eb1607`). As of `b71316d` (#25), the `packages/pear-wrk-wdk` pointer is bumped directly on the fork to a "shim commit" (`ef7a951` → `b3a8f55`) — the first such direct pointer bump, baking the pure-JS `bare-*` worklet shims (`bare-abort`, `bare-stdio`, `bare-performance`, `bare-type`) into the submodule rather than relying solely on the patch overlay.

## Use Cases

1. **React Native Bitcoin wallet** — Plug Ark in as the Bitcoin backend of a WDK-based RN app.
2. **Multi-chain WDK app** — Register `WalletManagerArkade` next to other WDK chains under one `WdkManager`.
3. **Lightning-enabled Ark wallet** — Configure `swapProviderUrl` to send/receive BOLT11.
4. **Watch-only display wallet** — Use `toReadOnlyAccount()` for read-only UIs.

## Integration Points

- **`@arkade-os/sdk`**: Underlying wallet, transport to arkd, VTXO management.
- **arkd**: Reached transitively through the SDK (offchain VTXO state, fees, history).
- **Boltz backend**: Reached through `@arkade-os/boltz-swap` when `swapProviderUrl` is set. The manager forwards `referralId: 'arkade-wdk-sdk'` to the `BoltzSwapProvider`.
- **Esplora**: Direct REST calls for boarding (on-chain) UTXO lookups; offchain/Lightning balance is no longer fetched via direct REST — the RN provider now uses `WalletAccountArkade.getBalance()` instead.
- **`@tetherto/wdk-react-native-provider`**: Consumes this package via the worklet/HRPC bridge in submodules.

## Current Implementation Notes

- `transfer()` is implemented for asset sends; only the read-only `quoteTransfer` returns a fee estimate.
- BIP21 URIs are accepted directly by `sendTransaction` / `quoteSendTransaction` — `resolveDestination` in `lib/send.js` extracts the inner address/invoice and any `?amount=` carried in the URI. Resolution priority is `lightning > ark > lnurl > bitcoin`, so explicit Ark parameters take priority over an LNURL fallback.
- LNURL and Lightning addresses (e.g. `user@wallet.com`) routed through `sendTransaction` / `quoteSendTransaction` map to `TransactionType.EMAIL`. The send path first tries `fetchArkAddress()` to take an offchain Ark fast path; on failure it falls back to `fetchInvoice()` and pays via `arkadeSwaps.sendLightningPayment` (Boltz submarine swap). A non-zero `amount` is required.
- The package public surface is intentionally narrow: `index.js` only exports the manager (default) plus `WalletAccountArkade` and `WalletAccountReadOnlyArkade`. The `lib/*` helpers are internal.
- Lightning-only methods on `WalletAccountArkade` throw `Lightning support not configured` when `swapProviderUrl` was not supplied — the `arkadeSwaps` field (renamed from `arkadeLightning`) is `null` in that case.
- The underlying SDK wallet is **not** publicly exposed on `WalletAccountArkade` (the previous `account.wallet` field is now private). Use `account.getBalance()`, `account.getTransactionHistory()`, and `account.subscribeToIncomingFunds(cb)` instead.
- As of the `@arkade-os/sdk` `0.4.35` / `@arkade-os/boltz-swap` `0.3.40` upgrade (consuming ts-sdk signer-rotation support), the manager intercepts arkd's structured `BUILD_VERSION_TOO_OLD` ArkError (raised even on `getInfo()` when the client's `X-Build-Version` is below the operator's minimum) and rethrows a clear "update the SDK" message rather than retrying. Fee quoting (`quoteSend` / `lib/send.js`) now accepts a read-only wallet (`QuoteOptions`), since quoting never signs.
