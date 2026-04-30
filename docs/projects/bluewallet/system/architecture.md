# BlueWallet — Architecture

## High-Level Architecture

BlueWallet is a **React Native** mobile app with a layered architecture: a React/RN view layer talks to a domain layer (wallet classes + business logic) which is persisted via a hybrid storage model (Realm for Ark, AsyncStorage + Keychain for the rest).

```
┌────────────────────────────────────────────────────────────────────────┐
│                         React Native UI Layer                          │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   screen/    │  │ components/│  │  navigation/ │  │   hooks/    │  │
│  │ (per-feature │  │ (shared    │  │  (RN Nav 7   │  │ (useStorage │  │
│  │  screens)    │  │  widgets)  │  │   stack/drwr)│  │  useSettings│  │
│  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘  └──────┬──────┘  │
│         └────────────────┴─────────────────┴─────────────────┘         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                  ┌────────────────▼─────────────────┐
                  │   Context Providers (App-wide)   │
                  │  StorageProvider, SettingsProv.  │
                  └────────────────┬─────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                         Domain Layer                                   │
│  ┌─────────────────────────┐   ┌────────────────────────────────────┐  │
│  │     class/wallets/      │   │        blue_modules/               │  │
│  │  AbstractWallet         │   │  BlueElectrum, currency, encryption│  │
│  │   ├ Legacy/SegWit/HD    │   │  fs, currencies, notifications     │  │
│  │   ├ Taproot/Multisig    │   │  ┌──────────────────────────────┐  │  │
│  │   ├ LightningCustodian  │   │  │ arkade-adapters/             │  │  │
│  │   └ LightningArk ◄──────┼───┼──┤  background/ (swap-queue,    │  │  │
│  │                         │   │  │   processor, scheduler,      │  │  │
│  │                         │   │  │   foreground-poller)         │  │  │
│  │                         │   │  │ realm/ (re-export SDK repos) │  │  │
│  │                         │   │  └──────────────────────────────┘  │  │
│  └─────────────────────────┘   └────────────────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                      Persistence Layer                                 │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │   Realm DB   │  │  AsyncStorage   │  │       Keychain           │   │
│  │ (Ark wallet, │  │ (settings, list │  │  (mnemonic secrets,      │   │
│  │  contracts,  │  │  of wallets)    │  │   encrypted private keys)│   │
│  │  swaps)      │  │                 │  │                          │   │
│  └──────────────┘  └─────────────────┘  └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   Network / External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Electrum srv │  │ arkd         │  │ Boltz API │  │ LndHub-style │   │
│  │ (rn-electrum-│  │ arkade.computer│  │ api.ark   │  │ Lightning    │   │
│  │  client)     │  │  + delegator │  │  .boltz.. │  │  custodian   │   │
│  └──────────────┘  └──────────────┘  └───────────┘  └──────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## Directory Layout

| Directory | Purpose |
|-----------|---------|
| `App.tsx` | Root component, providers, navigation host |
| `class/` | Core business logic |
| `class/wallets/` | All wallet implementations (abstract → concrete) |
| `class/wallets/lightning-ark-wallet.ts` | Ark wallet integration (~845 LOC) |
| `components/` | Shared React components (preferred over legacy `BlueComponents.tsx`) |
| `screen/` | Feature screens (wallets, send, receive, settings, lnd, …) |
| `navigation/` | React Navigation setup, typed param lists |
| `hooks/` | Custom React hooks (useStorage, useSettings, useBiometrics, …) |
| `blue_modules/` | Utility modules: BlueElectrum, currency, encryption, notifications |
| `blue_modules/arkade-adapters/` | Ark-specific adapters: background tasks + Realm re-exports |
| `loc/` | Localization files (`en.json` source + 55+ Transifex translations) |
| `models/` | Type definitions (units, fiat, block explorers) |
| `tests/unit/` | Jest unit tests |
| `tests/integration/` | Jest integration tests (need env vars: HD_MNEMONIC, …) |
| `tests/e2e/` | Detox E2E tests |
| `__mocks__/` | RN module mocks for Jest |
| `ios/` | iOS native project (Xcode workspace, Pods, Swift widgets) |
| `android/` | Android native project (Gradle, AVD-compatible) |
| `fastlane/` | App Store / Play Store metadata + screenshots |
| `patches/` | `patch-package` patches applied post-install |
| `scripts/` | Build helper scripts (release notes, branch info, find-unused-loc) |
| `helpers/`, `util/`, `typings/` | Misc helpers and ambient types |
| `codegen/` | RN codegen specs |

## Wallet Class Hierarchy

```
AbstractWallet
  ├── LegacyWallet
  │     └── SegwitP2SHWallet
  │     └── SegwitBech32Wallet
  │     └── TaprootWallet
  │     └── WatchOnlyWallet
  ├── AbstractHDWallet
  │     └── AbstractHDElectrumWallet
  │           ├── HDLegacyP2PKHWallet
  │           ├── HDSegwitP2SHWallet
  │           ├── HDSegwitBech32Wallet
  │           ├── HDTaprootWallet
  │           ├── HDLegacyElectrumSeedP2PKHWallet
  │           ├── HDSegwitElectrumSeedP2WPKHWallet
  │           ├── HDLegacyBreadwalletWallet
  │           ├── HDAezeedWallet
  │           ├── MultisigHDWallet
  │           └── SLIP39 wallets
  └── LightningCustodianWallet (LndHub-style)
        └── LightningArkWallet  ← Ark integration (extends LN custodian for API parity)
```

`LightningArkWallet` extends `LightningCustodianWallet` to inherit the Lightning-style API surface (paying invoices, receiving via invoices) while replacing the underlying transport with the Ark protocol + Boltz swaps.

## State Management

- **Context providers** (`components/Context/`): wrap the app and expose state via `useContext`
  - `SettingsProvider`: UI prefs, currency, language, biometrics
  - `StorageProvider`: list of wallets, transactions cache, encryption state
- **Hooks** (`hooks/`): custom hooks like `useStorage`, `useSettings`, `useBiometrics` provide a typed API over the context
- **No Redux**: BlueWallet deliberately avoids large state libraries

## Persistence

| Store | What it Holds | Notes |
|-------|---------------|-------|
| **Realm** | Ark wallet state, contracts, Boltz swap state | Per-wallet random namespace key for plausible deniability |
| **AsyncStorage** | Settings, list of wallets (encrypted) | Standard RN persistence |
| **Keychain** | Master secrets / encryption keys | OS-level secure enclave when available |

The Ark integration uses **per-wallet random task namespaces** (not `sha256(secret)`) as the Realm filename, Keychain service, and swap-queue task ID to avoid leaking wallet existence in plaintext storage paths.

## Network Stack

| Endpoint | Default | Used For |
|----------|---------|----------|
| Electrum servers | rotating list | Bitcoin/LN onchain queries |
| arkd | `https://arkade.computer` | Ark protocol server |
| Ark delegator | `https://delegate.arkade.money` | REST delegator provider |
| Boltz API | `https://api.ark.boltz.exchange` | Boltz submarine/reverse swaps for Ark↔LN |
| LndHub | configurable | Lightning custodial wallets |

All endpoints are configurable per wallet via settings.

## Native Layer

- **iOS** (`ios/`): Xcode workspace with multiple targets (BlueWallet, widgets, sticker pack, watch app, share extension)
  - Swift code in `ios/Shared/`, `ios/Widgets/`, `ios/Stickers/`
  - CocoaPods for dependencies
  - Catalyst-enabled for macOS distribution
- **Android** (`android/`): standard Gradle project, package `io.bluewallet.bluewallet`
- **Native modules**: BlueWallet maintains forks of several RN native modules under `BlueWallet/*` GitHub org (e.g., `react-native-blue-crypto`, `rn-electrum-client`, `react-native-context-menu-view`)

## Build & Codegen

- **Codegen**: RN codegen config in `package.json` (`codegenConfig`), generates Java/ObjC bindings from `codegen/`
- **Patch management**: `patch-package` runs in `postinstall`; patches under `patches/`
- **Branch metadata**: `scripts/current-branch.sh` and `scripts/release-notes.sh` produce `current-branch.json` / `release-notes.json` consumed at runtime

## Code Style & Quality Gates

- **ESLint** with React Native + Prettier configs (no inline styles, no unused styles)
- **Prettier**: single quotes, 140-char width, trailing commas
- **TypeScript** strict mode for all new files
- **Custom check**: `scripts/find-unused-loc.js` flags unused localization keys
- `npm test` runs `lint && unit && integration` — all three must pass

## Why this Matters for Ark

The BlueWallet Ark integration is unusual because:

1. It **does not replace** the existing Lightning UX — it adds Ark as an additional wallet type alongside LN custodian wallets
2. It uses **Boltz swaps** to bridge Ark ↔ Lightning, so users see "Lightning Ark" as a single concept
3. It runs **background tasks** to reconcile pending swaps — important for mobile reliability where the app may be backgrounded mid-swap
4. It uses **Realm** for the Ark layer (vs the rest of the app's AsyncStorage/Keychain) because the SDK provides Realm-backed repositories out of the box
