# BlueWallet — Usage

This is a **quick-start** reference. For end users; for development setup, see `how_to_run.md`.

## What You Get

BlueWallet is a Bitcoin & Lightning wallet for iOS, Android, and macOS (via Catalyst). You can run multiple wallets in the same app:

- Bitcoin (Legacy, SegWit, Taproot, HD variants)
- Lightning (custodial via LndHub, **Lightning Ark via Arkade SDK**)
- Multisig HD, Watch-only, BIP47 PayCodes

## Installation (End Users)

| Platform | Source |
|----------|--------|
| iOS | App Store: `BlueWallet - Bitcoin Wallet` |
| Android | Google Play, F-Droid (custom builds) |
| macOS | Catalyst build (released alongside iOS) |

GitHub releases also publish APKs and source builds.

## First-Time Setup (End Users)

1. Open the app
2. Tap **Add wallet**
3. Choose a wallet type:
   - **Bitcoin** → Legacy / SegWit / Taproot / HD
   - **Lightning** → Custodian or **Ark Lightning**
   - **Watch-only**, **Multisig HD**, **Vault**
4. For HD wallets: write down the BIP39 mnemonic (24 or 12 words)
5. For Ark: the wallet will provision a per-wallet Realm DB + Keychain entry under a random namespace (privacy-preserving)
6. Optionally enable encryption + plausible-deniability decoy

## Creating an Ark Wallet

1. Tap **Add wallet** → **Lightning** → **Ark**
2. The app generates:
   - A BIP39 mnemonic (saved in Keychain)
   - A random `_taskNamespace` (used as Realm DB filename + task IDs)
3. The wallet bootstraps:
   - Connects to default arkd at `https://arkade.computer`
   - Connects to delegator at `https://delegate.arkade.money`
   - Connects to Boltz at `https://api.ark.boltz.exchange`
4. Receive funds:
   - **Onchain boarding**: send BTC to your boarding address; the wallet creates VTXOs at the next round
   - **Lightning receive**: tap **Receive** → **Lightning** → enter amount; pays via reverse Boltz swap
5. Send funds:
   - **Ark address**: paste an `ark1...` address; bypasses Boltz
   - **Lightning invoice**: paste an LN invoice; converts via submarine Boltz swap

## Settings You May Want to Change

| Setting | Default | Notes |
|---------|---------|-------|
| Ark server | `https://arkade.computer` | Override per-wallet |
| Delegator | `https://delegate.arkade.money` | Override per-wallet |
| Boltz API | `https://api.ark.boltz.exchange` | Override per-wallet |
| Currency | USD | Wide list of fiat options |
| Language | Auto | 55+ Transifex locales |
| Biometrics | Off | Face ID / Touch ID / fingerprint unlock |
| Encryption | Off | Adds a master password + optional decoy |

## Building from Source (Quick Start for Devs)

For full prerequisites and toolchain setup, see `how_to_run.md`.

```bash
git clone https://github.com/BlueWallet/BlueWallet.git
cd BlueWallet
npm install
```

Run on Android:
```bash
npx react-native run-android
```

Run on iOS:
```bash
npx pod-install
npm start
# in another terminal:
npx react-native run-ios
```

Run tests:
```bash
npm test                # lint + unit + integration
npm run unit            # just unit
npm run integration     # just integration (needs env vars)
```

## Common Commands

```bash
# Development
npm start                    # Metro bundler
npm run ios                  # iOS dev build
npm run android              # Android dev build

# Testing
npm test                     # full suite
npm run lint                 # ESLint + tsc + unused loc
npm run lint:fix             # auto-fix
npm run unit                 # Jest unit
npm run integration          # Jest integration (env vars required)

# E2E (Detox, Android focus)
npm run e2e:debug            # Build + run debug e2e
npm run e2e:release-test     # Run release e2e

# Cleaning
npm run clean                # Full clean (gradle, cache, node_modules)
npm run clean:ios            # iOS-specific (Pods + node_modules)
npm run android:clean        # Android-specific
```

## Useful Files

| File | Why |
|------|-----|
| `class/wallets/lightning-ark-wallet.ts` | Ark integration logic |
| `blue_modules/arkade-adapters/realm/index.ts` | Realm repository re-exports |
| `blue_modules/arkade-adapters/background/` | Swap reconciliation tasks |
| `screen/wallets/` | Wallet list / details screens |
| `screen/send/` | Send flow (incl. Ark + Boltz) |
| `screen/receive/` | Receive flow (incl. Ark + Boltz) |
| `loc/en.json` | Source localizations |

## Where to Get Help

- **GitHub Issues**: https://github.com/BlueWallet/BlueWallet/issues
- **Email**: bluewallet@bluewallet.io (incl. responsible disclosure)
- **Telegram**: https://t.me/bluewallet (community); contributors group via email
