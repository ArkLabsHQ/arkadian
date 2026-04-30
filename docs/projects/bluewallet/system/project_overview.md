# BlueWallet — Project Overview

## What is BlueWallet?

**BlueWallet** is a popular open-source Bitcoin & Lightning Network wallet built with React Native and Electrum. It is distributed natively on iOS, Android, and macOS (via Mac Catalyst) and provides a single mobile app where users can manage many wallet types side-by-side: Legacy/SegWit/Taproot/HD Bitcoin wallets, Lightning custodian wallets (LndHub), multisig, watch-only, and — as of recent releases — **Ark wallets** powered by `@arkade-os/sdk` and `@arkade-os/boltz-swap`.

It is licensed under MIT, distributed via the Apple App Store and Google Play, and developed in the open at `github.com/BlueWallet/BlueWallet`.

## Why It Matters to Arkade

BlueWallet is one of the **largest existing Bitcoin wallets** integrating the Ark protocol. The integration includes:

- A dedicated `LightningArkWallet` class (in `class/wallets/lightning-ark-wallet.ts`)
- Realm-backed repositories for Ark wallet, contract, and swap state
- Expo-flavoured providers for Ark and indexer (`ExpoArkProvider`, `ExpoIndexerProvider`)
- A full Boltz swap stack (submarine, reverse) via `ArkadeSwaps`
- Background task queues for offline-tolerant swap processing
- Foreground polling fallbacks when WebSockets are unavailable

This makes BlueWallet a primary downstream consumer of `ts-sdk` (`@arkade-os/sdk`) and `boltz-swap` (`@arkade-os/boltz-swap`).

## Key Features

### Bitcoin & Lightning (Pre-existing)
- Send/receive Bitcoin on multiple address types (Legacy, P2SH, Bech32, Taproot)
- HD wallets (BIP44, BIP49, BIP84, BIP86), Aezeed, SLIP-39, Electrum HD seeds
- Lightning Custodian (LndHub) wallets
- Multisig HD wallets
- Watch-only wallets, BIP47 PayCodes
- Replace-By-Fee (RBF) and Child-Pays-For-Parent (CPFP) support
- Encryption with plausible deniability (decoy wallets)
- macOS Catalyst, widgets, watch-connectivity (Apple Watch)
- Hardware wallet integration via QR (`@keystonehq/bc-ur-registry`)
- BIP38 encrypted private keys, WIF imports

### Ark Integration
- `LightningArkWallet` type (subtitle "Ark"): a first-class wallet alongside Bitcoin/LN options
- VTXO management via `@arkade-os/sdk` `Wallet` + `Ramps`
- Boarding (onchain → offchain) and unilateral exit
- **Lightning bridging** through Boltz swaps:
  - **Submarine swaps**: Pay a Lightning invoice from Ark
  - **Reverse swaps**: Receive Lightning into Ark
- Background swap queue with reconciliation, polling fallback, and final-status detection
- Realm-backed local persistence for wallet, contracts, swaps
- Per-wallet random task namespaces (privacy: avoids leaking wallet existence in plaintext)

### Mobile UX
- React Navigation 7 (native stack + drawer)
- Camera/QR scanning, NFC, push notifications
- Biometric unlock (Face ID / Touch ID / fingerprint)
- 55+ localizations via Transifex
- Detox E2E test suite
- Bugsnag error reporting, BrowserStack-tested builds

## Wallet Type Catalog

Found in `class/wallets/`:

| File | Purpose |
|------|---------|
| `abstract-wallet.ts` | Base class for all wallets |
| `abstract-hd-wallet.ts` | Base for HD wallets (mnemonic + derivation) |
| `abstract-hd-electrum-wallet.ts` | HD wallets that talk to Electrum servers |
| `legacy-wallet.ts` | P2PKH single-key wallet |
| `segwit-p2sh-wallet.ts` | P2SH-wrapped SegWit |
| `segwit-bech32-wallet.ts` | Native SegWit (P2WPKH) |
| `taproot-wallet.ts` | P2TR Taproot |
| `hd-segwit-bech32-wallet.ts` | BIP84 HD SegWit |
| `hd-segwit-p2sh-wallet.ts` | BIP49 HD SegWit-P2SH |
| `hd-legacy-p2pkh-wallet.ts` | BIP44 HD Legacy |
| `hd-taproot-wallet.ts` | BIP86 HD Taproot |
| `hd-aezeed-wallet.ts` | Aezeed-encrypted HD seed |
| `hd-legacy-electrum-seed-p2pkh-wallet.ts` | Electrum-style legacy seed |
| `hd-segwit-electrum-seed-p2wpkh-wallet.ts` | Electrum-style SegWit seed |
| `hd-legacy-breadwallet-wallet.ts` | Bread/Loaf-style legacy wallet |
| `slip39-wallets.ts` | SLIP-39 sharded backups |
| `multisig-hd-wallet.ts` | Multisig HD with PSBT |
| `lightning-custodian-wallet.ts` | LndHub-style custodial Lightning |
| **`lightning-ark-wallet.ts`** | **Ark + Boltz Lightning wrapper (this integration)** |
| `watch-only-wallet.ts` | Watch-only / xpub-based |

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| UI | React Native 0.83.x, React 19.x |
| Navigation | React Navigation 7 |
| State | React Context + custom hooks |
| Persistence | Realm 20.x, AsyncStorage, Keychain |
| Crypto | bitcoinjs-lib 7.x, @noble/secp256k1, bip32/39 |
| Electrum | `rn-electrum-client` (BlueWallet fork) |
| Ark | `@arkade-os/sdk` 0.4.16, `@arkade-os/boltz-swap` 0.3.17 |
| Test | Jest 29 (unit + integration), Detox 20 (E2E) |
| Lint | ESLint 8, Prettier 3, TypeScript 5.9, custom unused-loc check |
| CI | GitHub Actions, BrowserStack, Bugsnag |
| Build (iOS) | Xcode + CocoaPods (`pod-install`) |
| Build (Android) | Gradle (Android Studio + AVD) |
| Localization | Transifex (55+ languages) |

## Use Cases for Arkadian Agents

When agents are asked questions like:
- "How does BlueWallet implement Ark?" → consult `system/integration-with-arkd.md`
- "What's the difference between BlueWallet's Ark wallet and Arkade `wallet`?" → compare both projects' integration docs
- "Why does the BlueWallet Ark wallet use Realm?" → see `system/integration-with-arkd.md` (repository pattern)
- "How do I bump the Ark SDK version in BlueWallet?" → `sop/development-workflow.md`
- "How do I run BlueWallet's Detox E2E tests?" → `testing/how_to_test.md`
- "Where does BlueWallet talk to arkd?" → see `_arkServerUrl` defaults in `system/integration-with-arkd.md`
