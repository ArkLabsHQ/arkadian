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
- **BIP39 seed phrase backup**: 12-word mnemonic for new wallets; legacy wallets keep their raw private key (nsec / hex) — `Backup` shows whichever the wallet stores
- **Mnemonic identity (PR #624)**: New wallets create a `MnemonicIdentity` (BIP86 Taproot derivation at `m/86'/coinType'/0'/0/0`, coinType `0` mainnet / `1` testnet) from a 12-word mnemonic; the mnemonic is encrypted at rest in `localStorage` via PBKDF2 (100k iters, SHA-256) + AES-GCM with a per-record salt + IV. `Restore` auto-detects 12-word mnemonics vs `nsec1...` / raw hex input. `Settings → Backup` shows the recovery phrase for mnemonic wallets and the `nsec` for legacy wallets. `Settings → Password` re-encrypts the mnemonic (not just the legacy private key) on password change. All wallets use `walletMode: 'static'` (no address rotation) — both mnemonic and legacy paths share the static-address invariant. The Nostr backup key for mnemonic wallets is the BIP86-derived signing key (deliberate — same key serves both Nostr backup and Ark signing, matching legacy raw-privkey behaviour).
- **Legacy identity (`SingleKey`)**: Existing wallets created before PR #624 continue to use the raw-private-key path (`SingleKey.fromPrivateKey`). Unlock detects whether `encrypted_mnemonic` or `encrypted_private_key` is present in `localStorage` and routes to the right decryption path; `isValidPassword` / `noUserDefinedPassword` were updated to check `encrypted_mnemonic` first so password change on mnemonic wallets actually authenticates. PR #677 centralizes both key names into `src/lib/storageKeys.ts` (`MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic'` / `NSEC_STORAGE_KEY = 'encrypted_private_key'`, which also breaks a circular import between `mnemonic.ts` and `privateKey.ts`) and makes the two mutually exclusive: `setMnemonic` calls `removeItem(NSEC_STORAGE_KEY)` and `setPrivateKey` calls `removeItem(MNEMONIC_STORAGE_KEY)`, so a wallet can never persist both an encrypted mnemonic and an encrypted private key at once (the prior double-key state that could confuse mnemonic-first unlock detection).
- **Service-worker identity bridge**: `initSvcWorkerWallet` was tightened to accept a typed `Identity` (`SingleKey` or `MnemonicIdentity`) directly — the legacy `privateKey` string parameter is gone. For mnemonic wallets the boot path posts `INITIALIZE_MESSAGE_BUS` with the raw mnemonic + `isMainnet`, and `wallet-service-worker.ts`'s custom `buildServices` constructs `MnemonicIdentity` inside the worker for signing. Mnemonic is held in a ref (for `restartWallet`) and cleared on lock. Wrong-password unlocks now raise `DOMException` from `crypto.subtle.decrypt` and are translated to `"Invalid password"` (raw crypto errors no longer leak).
- **No intermediaries**: Direct connection to arkd server
- **Encrypted storage**: Wallet credential (mnemonic or legacy private key) AES-GCM-encrypted in `localStorage`; transaction history and VTXOs in IndexedDB via Dexie

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
- **LNURL receive**: Amountless Lightning receives via lnurl-server SSE session. PR #559 moved the SSE lifecycle out of the receive-screen-scoped `useLnurlSession` hook (removed) into an app-level `LnurlProvider` (`src/providers/lnurl.tsx`), so the LNURL remains active and can keep serving invoice requests even when the user navigates away from the Receive screen. Credentials are derived deterministically from the wallet identity via `HMAC-SHA256(privateKey, "lnurl-session")` (the resulting `token` is a true secret — knowing the public address is not enough to compute it), and the wallet only sends `token` to lnurl-server, which computes `sessionId = SHA-256(token).slice(0, 32)`. The provider self-manages start/stop based on identity + Boltz swaps readiness and exposes `lnurl/active/error`; invoice requests are handled in the provider (create reverse swap, return invoice, claim in background, notify on completion).
- **Bulk submarine recovery**: Apps → Boltz → Settings scans pending submarine swaps via `arkadeSwaps.scanRecoverableSubmarineSwaps()` and sweeps each via `recoverSubmarineFunds()`. Categorises results as `recoverable` (sweep now), `pre_cltv` (deferred until locktime), and `invalid_swap`.
- **Invoice limit validation**: Send form rejects Lightning invoices outside `[minSwapAllowed(), maxSwapAllowed()]` from `LimitsContext` (guarded against unloaded zero limits).

### Announcements & Support
- **In-app announcements**: Server-pushed notification banners
- **Chatwoot integration**: Live customer support chat. The Support screen sends diagnostic Chatwoot custom attributes — including `git_commit` and, from PR #686, the SDK's `buildVersion` / `sdkVersion` as `build_version` / `sdk_version`.
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
- **Non-blocking boarding settlement (PR #556)**: The full-screen `WaitingForRound` overlay (which blocked all interaction for 1+ minute during boarding settlement) has been removed. Replaced by inline non-blocking UX across three call sites:
  - **Transaction.tsx** (boarding): inline purple `Info` banner with `LoadingIcon` showing "Processing your boarding transaction..." while settlement runs in the background; guards prevent simultaneous settled + pending banners; stale `setTxInfo` callback removed to avoid corrupting navigation state.
  - **Vtxos.tsx** (Coin Control): inline "Renewing" `Info` banner during rollover instead of blocking overlay.
  - **Send/Details.tsx**: `LoadingLogo` for mainnet payments (matches Lightning/Ark payment patterns).
  - `LoadingIcon` `small` variant resized 32px → 20px to align with other inline icons; settling text contrast improved.

### Design System & Styling (PRs #582, #589, #590)
- **Design tokens**: `src/tokens.css` provides full color ramps (50–950) for purple, green, red, orange, yellow, and neutral, plus typography and shadow elevation tokens. The neutral ramp uses `color-mix(in oklab)` so it auto-adapts to light/dark with the `html.palette-dark` selector.
- **Tailwind CSS v4**: `src/app.css` declares the `@theme` block that maps tokens to Tailwind utilities; `@tailwindcss/vite` plugin wired in `vite.config.ts`. Legacy `--darkXX` opacity tokens were migrated to solid `--neutral-XXX` colors across 50+ component files.
- **`cn()` utility** in `src/lib/utils.ts` combines `clsx` and `tailwind-merge`; `class-variance-authority` is available for variant-driven components.
- **Toast migration to sonner**: Custom React Context toast replaced by `sonner@^2.0.7`. `Toast.tsx` shrank from ~97 to 35 lines; `useToast()` hook still returns `{ toast }` for call-site compatibility. Toaster is `top-center`, `richColors`, content-hugging width via scoped `Toast.css`. Backup screen no longer reads `VITE_DEV_NSEC` directly — private-key copy still goes through normal password verification.
- **shadcn/ui primitives (PR #590)**: 55 shadcn/ui components added under `src/components/ui/` (Accordion, AlertDialog, Button, Card, Combobox, Dialog, Drawer, DropdownMenu, Field, InputOtp, Pagination, Popover, Select, Sheet, Sidebar, Table, Tabs, Toggle, Tooltip, …) using `base-nova` style and `lucide` icon library. Setup files: `components.json` (shadcn CLI config — CLI moved to devDependencies), `@/*` path alias in `tsconfig.json` and `vite.config.ts` `resolve.alias`, plus shadcn theme tokens appended to `src/app.css`. Dark mode selector is `html.palette-dark` (consistent with existing app). `sonner.tsx` was patched to read theme from `ConfigContext` (replaces `next-themes`). `use-mobile` hook added under `src/hooks/`. **No existing code modified** — primitives are available for future component migrations.
- **Core components migrated to shadcn (PR #593)**: `Modal`, `Checkbox`, `Select`, `Toggle` now sit on shadcn primitives.
  - `Modal.tsx` — Framer Motion `AnimatePresence` overlay with `EASE_OUT_QUINT_TUPLE` enter/exit (fade + scale); new controlled-modal props `open` / `onOpenChange` / `onExitComplete`. Burn/Reissue use `onExitComplete` to coordinate async work; Backup and Announcement use the controlled props (Announcement also restores direct-close on Try so parent state clears if navigation unmounts the modal before exit completes).
  - `Checkbox.tsx` — wraps shadcn `Checkbox` with label-bound activation, same-state event guard (deduplicates pointer + assistive paths), preserves haptic feedback. New unit test in `src/test/components/Checkbox.test.tsx`.
  - `Select.tsx` — migrated to shadcn `RadioGroup`; arrow-key navigation preserved; legacy `FlexRow` wrapper dropped.
  - `Toggle.tsx` — uses shadcn `Switch` with new `lg` size variant (iOS-like three-layer shadow on `src/components/ui/switch.tsx`, 44 px minimum tap target).
  - Other changes: `MAX_DECIMALS` raised to 8 (and used everywhere); `vitest.config.ts` split out of `vite.config.ts`; `tsconfig.json` cleaned; `@base-ui/react` added; `cmdk-base` / `vaul-base` replace `cmdk` / `vaul`; `bun.lock` restored at the repo root (was removed in PR #583) so Cloudflare Pages deploys keep working alongside `pnpm-lock.yaml`.

### Hosting & Access Control (PR #619)
- **Optional HTTP Basic Authorization**: a thin middleware layer protects unfinished/preview deployments behind HTTP Basic auth, but only when explicitly enabled.
  - `functions/_middleware.ts` (new) — Cloudflare Pages edge middleware that runs before every request when deployed to Pages. Uses an inlined `EventContext` interface (avoids a new Cloudflare dependency) and compares the Authorization header with `crypto.subtle.timingSafeEqual` on equally-sized buffers; returns `401 Unauthorized` + `WWW-Authenticate: Basic realm="Restricted"` on mismatch.
  - `plugins/vite-plugin-basic-auth.ts` (new) — dev/preview equivalent using Node `crypto.timingSafeEqual`; configures the Vite dev server and preview server via `configureServer`/`configurePreviewServer`. Registered first in the `plugins` array of `vite.config.ts` so it short-circuits any unauthenticated request.
  - Activation: set `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` env vars (locally for dev/preview, in the Cloudflare Pages dashboard for prod). If either is unset, both middlewares are no-ops.

### Address Input Recognition (PR #620, PR #625)
- **LNURL paste/scan support** (PR #620): `InputAddress` (`src/components/InputAddress.tsx`) recognises LNURLs via `isValidLnUrl` (`src/lib/lnurl.ts`) alongside Bitcoin/Ark addresses, Lightning invoices, BIP21 URIs, email addresses and Ark notes — so an LNURL pasted into the address field triggers the same paste-button affordance as any other supported payload. `isEmailAddress` regex made case-insensitive. New LNURL unit tests in `src/test/lib/address.test.ts`.
- **`lightning:` URI prefix** (PR #625): `InputAddress` now also recognises strings prefixed with `lightning:` (e.g. wallet-app copies of BOLT11 invoices) — `isAddress` strips the 10-character prefix and runs `isLightningInvoice` on the remainder, so prefixed invoices activate the paste button. `lowerData = data.toLowerCase()` is factored out so each predicate runs against the same lowercased string.

### Asset Amount Precision
- **bigint-based amount math**: `unitsToCents` / `centsToUnits` operate on `bigint`; `AssetOption.balance` and tx-asset `amount` are now `bigint`. Asset metadata `supply` is `bigint` and serialised via a `JSON.stringify` replacer that converts bigint → string.
- **`prettyAssetAmount(amount, decimals, useGrouping?)`**: New formatter in `src/lib/assets.ts` that splits whole/fractional via BigInt arithmetic so values like `1.5 USDT` no longer truncate; takes `useGrouping` for numeric inputs. Companion helpers: `prettyAssetNumber`, `prettyAssetAmountHide`, `isValidDecimals` (allows 0–`MAX_DECIMALS=8`). `prettyAssetNumber` (PR #665) converts scientific-notation inputs (e.g. `-8e-8` from `Number()` coercion of tiny fractions) to fixed-point via `Decimal.toFixed()` before splitting, so the digit-stripping regex no longer mangles them into BigInt-invalid strings.
- **Non-negative integer clamp**: Burn / Mint / Reissue / Send / Receive QrCode / `InputAmount` all `Math.trunc` non-negative values before constructing BigInts so `BigInt(1.5)` no longer throws RangeError.
- **BIP21 asset amount validation** (PR #611): `src/lib/bip21.ts` now validates asset amounts against their declared decimals; `encodeBip21Asset` is passed asset decimals so the URI uses the right precision. `unitsToCents` is hardened against empty strings, `parseInt` calls always pass an explicit radix, fractional millisatoshis are guarded against, and `prettyAssetNumber` no longer renders `-0`. New `src/test/e2e/bip21.test.ts` exercises the round-trip.
- **Mainnet explorer**: `explorers.bitcoin.api` removed — `getRestApiExplorerURL` now returns `string | undefined` and callers fall back to SDK defaults.

### Developer / Diagnostics (PR #618, PR #617, PR #670, PR #674)
- **Dev mode**: Triple-tapping the loading logo toggles a global dev mode persisted in `localStorage`. The tap logic was lifted out of `LoadingLogo` into a new `DevModeProvider` (`src/providers/devMode.tsx`), so every loading logo in the app shares the same state.
- **Dev auto-init** (PR #674): In DEV builds the wallet auto-initialises (bypassing onboarding/unlock) from `VITE_DEV_NSEC` or, preferred when both are set, a 12-word `VITE_DEV_MNEMONIC` — `WalletProvider` builds a `MnemonicIdentity` from the mnemonic or a `SingleKey` from the nsec; `App` holds the loading screen and skips the boot animation while either var initialises. Declared in `ImportMetaEnv`.
- **Contracts screen** (PR #670, `src/screens/Settings/Contracts.tsx`): A "Contracts" entry appears in **Settings → Advanced** only when dev mode is active. Rebuilt for scale into compact collapsible rows (type · address · deprecated-signer badge · state · age) with an Active/Inactive tab, type-filter chips, a search box, and a virtualized list (`@tanstack/react-virtual`). Each contract is classified against the operator's advertised signer set (`signerSetFromInfo` + `classifyAgainstSignerSet`); contracts under a deprecated signer show a **deprecated signer** badge (→ **deprecated signer / past cutoff** after the migration cutoff). Boarding contracts show their derived on-chain Bitcoin Taproot address (`bc1p/tb1p/bcrt1p`) and each address links out to a block explorer (Arkade for ark, mempool for boarding). Pull-to-refresh is disabled. Background auto-migration (`SettlementConfig.deprecatedSignerMigration`, default on) is unchanged.
- **Outdated-client prompt** (PR #670): when the server rejects the client with `BUILD_VERSION_TOO_OLD`, the wallet shows "Your wallet is outdated…" (via `aspErrorText`) instead of a generic "Arkade server unreachable" across all screens. See `aspInfo.outdated` / `minBuildVersion` in `src/lib/asp.ts`.
- **BIP21 unified copy** (PR #617): The Receive QR copy button copies the unified BIP21 URI immediately (no submenu). PR #672 keeps an explicit copy-sheet selection across async QR rebuilds (`resolveQrValue`), drops LNURL once an amount is set, and encodes amounts with `useGrouping=false`; `decodeBip21` parses mixed-case query keys case-insensitively.

## Technology Stack

- **React 18** with TypeScript for type-safe UI development
- **Custom component library** (Ionic React removed) — buttons, inputs, modals, sheets built in-tree
- **react-spring-bottom-sheet** for bottom sheet modals
- **Vite** for fast builds and development server
- **Tailwind CSS v4** (`tailwindcss` ^4.2.2 + `@tailwindcss/vite`) with a token-driven `@theme` config
- **clsx + tailwind-merge** (via `cn()` in `src/lib/utils.ts`); **class-variance-authority** for variant-driven components
- **sonner** (^2.0.7) for toast notifications (replaces previous custom Context-based toast)
- **@arkade-os/sdk** (0.4.39, PR #692) for Ark protocol operations (incl. ts-sdk PR #554 signer-rotation classification: `signerSetFromInfo`, `classifyAgainstSignerSet`; also exports `buildVersion` / `sdkVersion` surfaced in the Support screen's Chatwoot attributes)
- **@arkade-os/boltz-swap** (0.3.44, PR #692) for Lightning swap integration (incl. submarine recovery API; `arkade-money` referralId on swap provider + arkadeSwaps; optimistic `waitForSwapFunded` consumed by the live-settlement Lightning send in PR #668, plus `waitFor: 'funded'` + preimage backfill from 0.3.41); its `sdkVersion` is surfaced as the `boltz_swap_version` Chatwoot attribute (PR #691)
- **@branta-ops/branta** (3.1.3) for Send-form payment-destination verification (debounced typed-input lookups via `getPayments`); Send form uses the v2 `BrantaService` client with string-literal `baseUrl`/`privacy` config (PR #675)
- **@tanstack/react-virtual** for virtualized swap list and dev-mode contracts list rendering
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
- **Satora**: Swap integration via Satora service (renamed from Lendaswap in PR #612; uses `VITE_SATORA_IFRAME_URL` env var)
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
**Dependencies**: @arkade-os/sdk 0.4.39, @arkade-os/boltz-swap 0.3.44, @branta-ops/branta 3.1.3
**Node.js**: >= 24.15.0 (PR #690)

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
