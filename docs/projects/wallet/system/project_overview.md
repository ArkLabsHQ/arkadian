# Arkade Wallet — Project Overview

**Arkade Wallet** is the entry-point to the Arkade ecosystem—a self-custodial Bitcoin wallet delivered as a lightweight Progressive Web App (PWA). Built around the open-source ARK protocol, it enables instant off-chain transactions with VTXOs while maintaining Bitcoin's security guarantees.

## What is Arkade Wallet?

Arkade Wallet is a React-based Progressive Web App that provides a user-friendly interface for interacting with the Ark protocol. It allows users to:

- Create and restore self-custodial Bitcoin wallets using BIP39 seed phrases
- Send and receive Bitcoin both on-chain and off-chain via VTXOs
- Interact with any arkd server instance
- Perform Lightning Network swaps via Boltz integration
- Install on mobile or desktop without app store gatekeepers

## Key Features

### Self-Custodial Architecture
- **Private keys never leave device**: All cryptographic operations happen client-side
- **BIP39 seed phrase backup**: Standard 12 or 24-word recovery mechanism
- **No intermediaries**: Direct connection to arkd server
- **Encrypted storage**: Keys stored in IndexedDB via Dexie with browser-level encryption

### ARK Protocol Integration
- **VTXOs (Virtual Transaction Outputs)**: Off-chain Bitcoin representation
- **Instant payments**: Pre-confirmed off-chain transactions
- **Batched settlement**: Fee-efficient on-chain settlement in rounds
- **Boarding addresses**: Onboard Bitcoin to Ark protocol
- **Redemption**: Exit Ark back to Bitcoin on-chain

### Progressive Web App
- **Installable**: Works like native app on iOS, Android, desktop
- **Offline capable**: Service worker for offline functionality
- **Fast loading**: Optimized bundle size (~500KB gzipped)
- **Auto-updates**: Seamless updates without user intervention
- **Cross-platform**: Single codebase for all platforms

### Lightning Network Swaps
- **Boltz integration**: Submarine and reverse submarine swaps via SwapManager
- **Mainnet endpoint**: Default mainnet Boltz URL switched to `https://api.boltz.exchange` (was `https://api.ark.boltz.exchange`); env-unset fallback now defers to SDK defaults instead of a hard-coded URL
- **Referral attribution**: `arkade-money` referralId is passed to both `BoltzSwapProvider` and the arkadeSwaps service-worker swaps so Boltz can track wallet-originated swaps
- **On-chain to Lightning**: Convert Bitcoin to Lightning capacity
- **Lightning to on-chain**: Drain Lightning channels to Bitcoin
- **Atomic swaps**: Trustless via HTLCs
- **Swap restoration**: Restore pending swaps from Boltz endpoint
- **LNURL receive**: Amountless Lightning receives via lnurl-server SSE session (`useLnurlSession` hook)
- **Bulk submarine recovery**: Apps → Boltz → Settings scans pending submarine swaps via `arkadeSwaps.scanRecoverableSubmarineSwaps()` and sweeps each via `recoverSubmarineFunds()`. Categorises results as `recoverable` (sweep now), `pre_cltv` (deferred until locktime), and `invalid_swap`.
- **Invoice limit validation**: Send form rejects Lightning invoices outside `[minSwapAllowed(), maxSwapAllowed()]` from `LimitsContext` (guarded against unloaded zero limits).

### Announcements & Support
- **In-app announcements**: Server-pushed notification banners
- **Chatwoot integration**: Live customer support chat
- **Support page**: Dedicated support screen in Settings

### Nostr Backup
- **Encrypted Nostr backups**: Backup wallet data to Nostr relays
- **Chunked storage**: Large backups split into relay-compatible chunks
- **Restore from Nostr**: Recover wallet data from relay backups

### Deep Linking & Accessibility
- **URL hash deep-links**: Link directly to wallet actions via URL
- **Keyboard navigation**: Full keyboard support with Focusable component
- **JS/JIT detection**: Informative error screens in restricted environments (some WebViews)

### Fees & Settlement
- **Fees provider**: Dedicated fee estimation and display
- **Collaborative exit with fees**: On-chain fee handling for exits

### UI/UX Refresh
- **Custom component library**: Ionic React removed — Button, Input, Modal, SheetModal, Toast, Refresher all built in-tree
- **Pill navbar overlay**: Visible only on root pages (Wallet, Apps, Settings) with Framer Motion spring animation
- **Receive v2**: Redesigned receive flow with styled QR, tap-to-copy QR, share button, safe-area padding
- **Send redesign**: Pill Paste/Scan QR buttons, Max-tap confirmation, animated Scanner/Keyboard overlays, prefers-reduced-motion support
- **Fiat symbol prefix**: Amounts render with Unicode symbols (`$100.00`, `€50.00`, `¥1,000`); CHF/CNY keep trailing-code form
- **Asset-aware tx history**: Top-aligned rows when assets present; max 2 coins shown on right side
- **PWA safe-area handling**: Top safe-area offset restored after the Ionic migration so installed iOS PWAs no longer render beneath the status bar; pill-navbar clearance and scroll-fade applied to the plain CSS scroll container; legacy `::part(scroll)` selectors removed
- **Scrollbar hidden**: Cross-browser scrollbar removal moved off the (legacy Ionic) `::part(scroll)` shadow part onto `.content` directly
- **Scanner button positioning**: `InputWithScanner` adopts a `.label.has-buttons` layout — buttons absolutely positioned right, input gets `padding-right: 36px`

### Design System & Styling (PRs #582, #589)
- **Design tokens**: `src/tokens.css` provides full color ramps (50–950) for purple, green, red, orange, yellow, and neutral, plus typography and shadow elevation tokens. The neutral ramp uses `color-mix(in oklab)` so it auto-adapts to light/dark with the `html.palette-dark` selector.
- **Tailwind CSS v4**: `src/app.css` declares the `@theme` block that maps tokens to Tailwind utilities; `@tailwindcss/vite` plugin wired in `vite.config.ts`. Legacy `--darkXX` opacity tokens were migrated to solid `--neutral-XXX` colors across 50+ component files.
- **`cn()` utility** in `src/lib/utils.ts` combines `clsx` and `tailwind-merge`; `class-variance-authority` is available for variant-driven components.
- **Toast migration to sonner**: Custom React Context toast replaced by `sonner@^2.0.7`. `Toast.tsx` shrank from ~97 to 35 lines; `useToast()` hook still returns `{ toast }` for call-site compatibility. Toaster is `top-center`, `richColors`, content-hugging width via scoped `Toast.css`. Backup screen no longer reads `VITE_DEV_NSEC` directly — private-key copy still goes through normal password verification.

### Asset Amount Precision
- **bigint-based amount math**: `unitsToCents` / `centsToUnits` operate on `bigint`; `AssetOption.balance` and tx-asset `amount` are now `bigint`. Asset metadata `supply` is `bigint` and serialised via a `JSON.stringify` replacer that converts bigint → string.
- **`prettyAssetAmount(amount, decimals, useGrouping?)`**: New formatter in `src/lib/assets.ts` that splits whole/fractional via BigInt arithmetic so values like `1.5 USDT` no longer truncate; takes `useGrouping` for numeric inputs. Companion helpers: `prettyAssetNumber`, `prettyAssetAmountHide`, `isValidDecimals` (allows 0–`MAX_DECIMALS=8`).
- **Non-negative integer clamp**: Burn / Mint / Reissue / Send / Receive QrCode / `InputAmount` all `Math.trunc` non-negative values before constructing BigInts so `BigInt(1.5)` no longer throws RangeError.
- **Mainnet explorer**: `explorers.bitcoin.api` removed — `getRestApiExplorerURL` now returns `string | undefined` and callers fall back to SDK defaults.

## Technology Stack

- **React 18** with TypeScript for type-safe UI development
- **Custom component library** (Ionic React removed) — buttons, inputs, modals, sheets built in-tree
- **react-spring-bottom-sheet** for bottom sheet modals
- **Vite** for fast builds and development server
- **Tailwind CSS v4** (`tailwindcss` ^4.2.2 + `@tailwindcss/vite`) with a token-driven `@theme` config
- **clsx + tailwind-merge** (via `cn()` in `src/lib/utils.ts`); **class-variance-authority** for variant-driven components
- **sonner** (^2.0.7) for toast notifications (replaces previous custom Context-based toast)
- **@arkade-os/sdk** (0.4.26) for Ark protocol operations
- **@arkade-os/boltz-swap** (0.3.30) for Lightning swap integration (incl. submarine recovery API; `arkade-money` referralId on swap provider + arkadeSwaps)
- **@tanstack/react-virtual** for virtualized swap list rendering
- **Dexie** for IndexedDB storage with React hooks
- **@noble/secp256k1**, **@scure/bip32**, **@scure/bip39** for Bitcoin cryptography
- **nostr-tools** for Nostr relay backup integration
- **Playwright** for E2E browser testing

## Use Cases

### Personal Bitcoin Wallet
- Store Bitcoin securely with self-custody
- Send and receive payments instantly via Ark off-chain
- Lower fees through batched settlement
- Recovery via seed phrase backup

### Lightning Network User
- Swap between on-chain Bitcoin and Lightning capacity
- No need to run Lightning node
- Trustless atomic swaps via Boltz
- Restore pending swaps from Boltz endpoint

### DeFi User
- **Lendaswap**: Swap integration via Lendaswap service
- **LendaSat**: Bitcoin lending/borrowing with on-chain and Arkade collateral

### Ark Protocol Developer
- Test Ark protocol functionality
- Integrate with custom arkd instances
- Example implementation for wallet developers
- Full E2E test suite with Playwright for integration testing

### Privacy-Conscious Users
- No KYC or registration required
- No app store tracking
- Direct peer-to-server connection
- Client-side key management

## Architecture Principles

### Client-Side First
All sensitive operations (key generation, signing, encryption) happen exclusively in the browser. The wallet never sends private keys or seed phrases to any server.

### Protocol Agnostic
The wallet can connect to any arkd server instance by configuring the server URL. It supports multiple Bitcoin networks (testnet, mainnet, signet, mutinynet).

### Progressive Enhancement
Core functionality works offline via service worker. Advanced features (sending/receiving) require network connection to arkd server.

### Mobile-First Design
Built with Ionic components optimized for mobile touch interfaces, but fully functional on desktop browsers.

## Security Model

### Key Management
- BIP32 hierarchical deterministic wallet
- BIP39 mnemonic seed phrase generation and recovery
- Client-side key derivation using @scure libraries
- No server-side key storage

### Network Security
- HTTPS required for production deployments
- Content Security Policy headers
- No dynamic code execution (no eval)
- CORS-compliant API calls to arkd

### Storage Security
- IndexedDB encrypted by browser security model
- Keys protected by browser's origin policy
- Optional wallet password (application-level)
- Service worker limited to same origin

## Deployment Options

### Hosted PWA
- Deploy to static hosting (Vercel, Netlify, GitHub Pages)
- Users access via HTTPS URL
- Install prompt for native-like experience

### Self-Hosted
- Host on personal infrastructure
- Full control over deployment
- Connect to private arkd instances

### Local Development
- Run on localhost:3002 for testing
- Hot reload for rapid development
- Connect to local or remote arkd

## Project Status

Arkade Wallet is under active development as part of the Arkade ecosystem. It serves as both a production wallet for end users and a reference implementation for wallet developers building on the Ark protocol.

**Version**: 0.1.0
**License**: MIT
**Repository**: Part of Arkade ecosystem
**Dependencies**: @arkade-os/sdk 0.4.26, @arkade-os/boltz-swap 0.3.30

## Getting Started

Developers can run the wallet locally:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run start

# Access at http://localhost:3002
```

Users can access the hosted version or install it as a PWA on their devices for a native app experience.

## Integration with Arkade Ecosystem

Arkade Wallet is one component in the larger Arkade ecosystem:

- **arkd**: Server daemon that facilitates Ark protocol operations
- **go-sdk**: Go library for building Ark wallets (server-side)
- **@arkade-os/sdk**: JavaScript/TypeScript SDK used by this wallet
- **@arkade-os/boltz-swap**: Lightning swap provider integration
- **ark-faucet**: Testnet faucet for distributing test coins

The wallet communicates with arkd servers via gRPC-web or REST APIs, using the @arkade-os/sdk as an abstraction layer.
