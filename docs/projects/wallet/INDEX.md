---
project_id: wallet
version: 1.2.29
last_sync_commit: 37eff0a57ce25706aed5620a06e58ce5a910f3a6
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  dev: ["sop/development-workflow.md", "system/tech-stack.md"]
  pwa: ["system/pwa-features.md"]
  components: ["system/components.md"]
scripts:
  dev: "pnpm run start"
  build: "pnpm run build"
  test: "pnpm run test"
  lint: "pnpm run lint"
---

# Arkade Wallet — Project Index

**Arkade Wallet** is the entry-point to the Arkade ecosystem—a self-custodial Bitcoin wallet delivered as a lightweight Progressive Web App (PWA). Installable on mobile or desktop in seconds without app-store gatekeepers, it's built around the open-source ARK protocol and speaks natively to any arkd instance, enabling instant off-chain transactions with VTXOs and batched fee-efficient on-chain settlement.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/wallet/system/` — System Architecture & Design
Core documentation about the wallet application:

- **${ARKADIAN_DIR}/docs/projects/wallet/system/project_overview.md** — — What Arkade Wallet is, features, and capabilities
- **${ARKADIAN_DIR}/docs/projects/wallet/system/architecture.md** — — React PWA architecture, component structure, state management
- **${ARKADIAN_DIR}/docs/projects/wallet/system/tech-stack.md** — — Technology stack and dependencies
- **${ARKADIAN_DIR}/docs/projects/wallet/system/pwa-features.md** — — Progressive Web App features and installation
- **${ARKADIAN_DIR}/docs/projects/wallet/system/components.md** — — Component library and UI patterns
- **${ARKADIAN_DIR}/docs/projects/wallet/system/ark-sdk-integration.md** — — Integration with @arkade-os/sdk

### `${ARKADIAN_DIR}/docs/projects/wallet/testing/` — Usage & Development
Practical guides for using and developing:

- **${ARKADIAN_DIR}/docs/projects/wallet/testing/usage.md** — — Quick start guide for users
- **${ARKADIAN_DIR}/docs/projects/wallet/testing/how_to_run.md** — — Development setup and running locally
- **${ARKADIAN_DIR}/docs/projects/wallet/testing/how_to_test.md** — — Testing strategy and running tests
- **${ARKADIAN_DIR}/docs/projects/wallet/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/wallet/sop/` — Standard Operating Procedures
Step-by-step guides for development operations:

- **${ARKADIAN_DIR}/docs/projects/wallet/sop/development-workflow.md** — — Development setup and workflow
- **${ARKADIAN_DIR}/docs/projects/wallet/sop/building-deployment.md** — — Building and deploying the PWA
- **${ARKADIAN_DIR}/docs/projects/wallet/sop/adding-features.md** — — Adding new features to the wallet

### `${ARKADIAN_DIR}/docs/projects/wallet/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Progressive Web App (PWA)
- **Installable**: Works like a native app, no app store required
- **Offline capable**: Service worker for offline functionality
- **Fast loading**: Optimized bundle size and caching
- **Cross-platform**: Works on iOS, Android, desktop
- **Auto-updates**: Updates automatically without user intervention

### Self-Custodial Wallet
- **User controls keys**: Private keys never leave the device
- **No intermediaries**: Direct connection to arkd server
- **Encrypted storage**: Mnemonic / private key encrypted in `localStorage` via PBKDF2 (100k iters, SHA-256) + AES-GCM; transaction/VTXO state in IndexedDB via Dexie. The two storage keys (`encrypted_mnemonic` / `encrypted_private_key`) are centralized in `src/lib/storageKeys.ts` (`MNEMONIC_STORAGE_KEY` / `NSEC_STORAGE_KEY`); since PR #677 the two are mutually exclusive — `setMnemonic` removes any stored private key and `setPrivateKey` removes any stored mnemonic, so a wallet can never persist both at once
- **Recovery via seed**: New wallets use a 12-word BIP39 mnemonic with `MnemonicIdentity` (BIP86 Taproot derivation); legacy wallets continue to use `SingleKey` from a raw private key (PR #624)
- **Wallet mode (`static` / `hd`)**: `Config.walletMode` (`ServiceWorkerWalletMode`, default `'static'`) is persisted per wallet. Mnemonic wallets can opt into `'hd'` mode to rotate the receive address per incoming payment (better on-chain privacy, best paired with Nostr backup); `SingleKey` wallets are always `'static'`. `resolveWalletMode` (`src/lib/walletMode.ts`) resolves the effective mode, and on restore the wallet runs an HD address gap-scan (`svcWallet.restore()`) to recover rotated addresses (PR #682)

### ARK Protocol Integration
- **VTXOs**: Virtual Transaction Outputs for off-chain transactions
- **Instant payments**: Send and receive with pre-confirmation
- **Batched settlement**: Fee-efficient on-chain settlement
- **Boarding**: Onboard Bitcoin to Ark via boarding addresses
- **Redemption**: Exit Ark back to Bitcoin on-chain

### Lightning Network Swaps
- **Boltz integration**: Submarine swaps for Lightning ↔ Ark
- **On-chain to Lightning**: Convert Bitcoin to Lightning capacity
- **Lightning to on-chain**: Drain Lightning channels to Bitcoin
- **Atomic swaps**: Trustless via HTLCs
- **LNURL receive**: Amountless Lightning receives via lnurl-server SSE session. As of PR #559 the SSE connection is owned by an app-level `LnurlProvider` (`src/providers/lnurl.tsx`) so the session survives navigation away from the Receive screen. Credentials are derived deterministically via `HMAC-SHA256(privateKey, "lnurl-session")`; only the `token` is sent to lnurl-server (server computes `sessionId = SHA-256(token).slice(0, 32)`). The `useLnurlSession` hook is removed; the Receive screen reads `lnurl/active/error` from context.
- **Bulk submarine recovery**: Apps → Boltz → Settings scans recoverable submarine swaps and sweeps them via `arkadeSwaps.recoverSubmarineFunds()` (per-row, with `pre_cltv` deferred-locktime guidance)
- **Invoice limit validation**: Send form rejects Lightning invoices below `minSwapAllowed()` / above `maxSwapAllowed()` before submission
- **Non-blocking boarding settlement (PR #556)**: `WaitingForRound` component removed — boarding settlement (Transaction.tsx), VTXO rollover (Vtxos.tsx), and mainnet send (Send/Details.tsx) no longer show a full-screen blocking overlay. Boarding shows an inline purple Info banner ("Processing your boarding transaction..."), VTXO rollover shows an inline "Renewing" banner, and mainnet send falls back to `LoadingLogo` matching Lightning/Ark patterns. `LoadingIcon` `small` size reduced from 32px → 20px to match other inline icons.

---

## Quick Reference

### Prerequisites
- Node.js >= 24.15.0 (PR #690; `.nvmrc` pins `24.15.0`, `engines.node` is `>=24.15.0`)
- pnpm >= 8

### Development
```bash
# Install dependencies
pnpm install

# Run development server
pnpm run start

# Access at http://localhost:3002
```

### Building
```bash
# Build for production
pnpm run build

# Output in dist/ folder
```

### Testing
```bash
# Run unit tests
pnpm run test

# Run with UI
pnpm run test:ui

# Coverage report
pnpm run test:coverage

# Run E2E tests (uses arkade-regtest submodule + nak relay)
git submodule update --init --recursive
pnpm run regtest:start   # node regtest/regtest.mjs start --env .env.regtest + nak relay
pnpm run regtest:setup
pnpm exec playwright test
pnpm run regtest:stop     # docker compose down, then node regtest/regtest.mjs stop
```

> **Node-CLI regtest (PR #689)**: the regtest stack is now driven by the in-house
> `arkade-regtest` Node CLI (`node regtest/regtest.mjs start|stop|clean --env .env.regtest`),
> replacing the removed nigiri shell scripts (`start-env.sh`/`stop-env.sh`/`clean-env.sh`).
> `regtest:stop`/`regtest:clean` tear down `docker-compose.nak.yml` **before** the regtest
> stack (LIFO, matching CI). Stale `ARKD_IMAGE` v0.9.5 / `FULMINE_IMAGE` v0.3.23 pins were
> dropped from `.env.regtest` so the submodule defaults (incl. Fulmine v0.3.25 with its
> `FULMINE_DELEGATE_*` env contract) are used. The regtest explorer API base is
> `http://localhost:3000/api`.

### Code Quality
```bash
# Lint code
pnpm run lint

# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

---

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ARK_SERVER` | Arkd server URL (overrides default) | `http://localhost:7070` |
| `VITE_DEV_NSEC` | Dev-only: nsec to auto-init the wallet (bypasses onboarding/unlock; DEV builds only) | `nsec1...` |
| `VITE_DEV_MNEMONIC` | Dev-only: 12-word mnemonic to auto-init the wallet, preferred over `VITE_DEV_NSEC` when both set (DEV builds only) (PR #674) | `word1 word2 ... word12` |
| `VITE_BOLTZ_URL` | Boltz swap provider URL | `https://boltz.example.com` |
| `VITE_LNURL_SERVER_URL` | lnurl-server base URL (runtime-configurable since PR #685; unset → LNURL disabled) | `https://lnurl.example.com` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `VITE_LENDASAT_IFRAME_URL` | LendaSat integration iframe URL | `https://iframe.lendasat.com` |
| `VITE_MAX_PERCENTAGE` | Maximum fee percentage (default: 10) | `10` |
| `CI` | CI environment flag | `true` |
| `GENERATE_SOURCEMAP` | Generate source maps | `false` |
| `BASIC_AUTH_USERNAME` | Optional HTTP Basic Auth user (dev/preview + Cloudflare Pages). When unset, auth is a no-op. (PR #619) | `arkade` |
| `BASIC_AUTH_PASSWORD` | Optional HTTP Basic Auth password — paired with `BASIC_AUTH_USERNAME`. (PR #619) | `s3cret` |

### Runtime VITE_* substitution (PR #685)
Vite bakes `__VITE_FOO__` placeholders into the bundle at build time (one `ARG` per var in the `Dockerfile`); `docker-entrypoint.sh` substitutes them with real values at container startup, so one image serves multiple environments. The entrypoint now **loops over the actual `VITE_*` environment**, so a new runtime-configurable var only needs its `ARG` in the Dockerfile — no parallel list in the entrypoint to keep in sync. The `fromRuntimeEnv()` helper (`src/lib/constants.ts`) treats a leftover `__VITE_*__` placeholder (var not set at deploy time) as **unset** rather than a literal value; it now guards `VITE_LNURL_SERVER_URL` (`lnurlServerUrl`), `VITE_ARK_SERVER` (`defaultArkServer`), and `VITE_BOLTZ_URL` (boltz bitcoin slot). nginx also forces a JS MIME type for `.mjs` (`no-cache`) so the service worker (`wallet-service-worker.mjs`) registers instead of being served as `application/octet-stream`.

### Default Configuration
- **Dev server port**: 3002
- **Arkd server**: Configurable via UI or env var
- **Network**: Supports testnet, mainnet
- **Storage**: IndexedDB via Dexie

---

## Technology Stack

### Core Framework
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **Custom component library**: Hand-rolled components (Ionic React removed)
- **react-spring-bottom-sheet**: Bottom sheet primitive for SheetModal
- **Tailwind CSS v4** (`tailwindcss` ^4.2.2 + `@tailwindcss/vite` ^4.2.2): Utility-first styling, configured via `src/app.css` `@theme` block that maps design tokens to Tailwind utilities
- **Design token system**: `src/tokens.css` is the single source of truth for color ramps (50–950 for purple/green/red/orange/yellow/neutral), typography, and shadow elevation; neutrals use `color-mix(in oklab)` for automatic light/dark adaptation under the `html.palette-dark` selector
- **clsx + tailwind-merge** via `cn()` utility in `src/lib/utils.ts` (with `class-variance-authority` for variant-driven components)
- **sonner** (^2.0.7): Toast notifications (replaces previous custom React Context implementation; `useToast()` hook returns `{ toast }` for backward compatibility)
- **shadcn/ui primitives** (PR #590): 55 components under `src/components/ui/` (Accordion, AlertDialog, Button, Card, Combobox, Dialog, Drawer, DropdownMenu, Form/Field, InputOtp, Pagination, Popover, Select, Sheet, Sidebar, Table, Tabs, etc.) using `lucide` icon library and `base-nova` style. Available for future component migrations; existing in-tree components untouched. `@/*` path alias wired in `tsconfig.json` and `vite.config.ts`; `components.json` holds the shadcn CLI config (CLI in devDependencies).
- **shadcn migration of core components (PR #593)**: `Modal`, `Checkbox`, `Select`, and `Toggle` now sit on shadcn primitives. `Modal` uses Framer Motion `AnimatePresence` with new `open`/`onOpenChange`/`onExitComplete` controlled-modal props (Burn/Reissue use `onExitComplete` for async coordination; Backup/Announcement use controlled props). `Checkbox` wraps shadcn `Checkbox` with label-bound control path and same-state event guard. `Select` migrates to shadcn `RadioGroup` (preserves arrow-key navigation). `Toggle` uses shadcn `Switch` with a new `lg` size variant (iOS-like three-layer shadow, 44 px minimum tap target). `MAX_DECIMALS` raised to 8. New `vitest.config.ts` split out from `vite.config.ts`. Uses `cmdk-base` / `vaul-base` and `@base-ui/react`. `bun.lock` restored at repo root for Cloudflare Pages deploys.

### Arkade Integration
- **@arkade-os/sdk** (0.4.39): Ark protocol SDK (wallet operations, VTXOs) — bumped from 0.4.38 in PR #692. Earlier bumped from 0.4.37 in PR #691, from 0.4.36 in PR #684 (0.4.37 is a release-only patch carrying a `MissingSigningDescriptorError` message fix), from 0.4.35 in PR #676, and from 0.4.34 in PR #670 (consumes ts-sdk PR #554 arkd signer-rotation support: `signerSetFromInfo`, `classifyAgainstSignerSet`, `SignerSet`/`SignerStatus` types, typed `ArkError`/`BUILD_VERSION_TOO_OLD`). Also exports `buildVersion` / `sdkVersion` constants surfaced in the Support screen's Chatwoot attributes (PR #686).
- **@arkade-os/boltz-swap** (0.3.44): Lightning swap integration (incl. submarine recovery API; `arkade-money` referralId passed to `BoltzSwapProvider` + arkadeSwaps) — bumped from 0.3.43 in PR #692; 0.3.44 publishes the optimistic `waitForSwapFunded` API plus the `BoltzSwapStatus`/`hasSubmarineStatusReached`/`isSubmarineFailedStatus` helpers consumed by the live-settlement Lightning send in PR #668. (PR #668 also left a leftover vendored tarball `vendor/arkade-os-boltz-swap-0.3.39-pr556-10c3898.tgz` in the tree, but the lockfile resolves boltz-swap to the registry `0.3.44`.) Its `sdkVersion` is imported into the Support screen as the `boltz_swap_version` Chatwoot custom attribute (PR #691). Earlier bumped from 0.3.42 in PR #691, from 0.3.41 in PR #684, from 0.3.40 in PR #676 (0.3.41 adds optimistic `waitFor: 'funded'` Lightning resolution, `waitForSwapFunded`, and preimage backfill in `refreshSwapsStatus`), and from 0.3.39 in PR #670. PR #637 moved pnpm build-dependency settings (`onlyBuiltDependencies: ['@arkade-os/sdk']`, `ignoredBuiltDependencies: ['esbuild']`) out of `package.json` and into `pnpm-workspace.yaml`.
- **@branta-ops/branta** (3.1.3): payment-destination verification for pasted addresses/invoices in the Send form (upgraded in PR #673; uses `getPayments`, debounced 400 ms for typed input). PR #675 migrated the Send form to the v2 client (`@branta-ops/branta/v2` `BrantaService`) using plain string literals (`baseUrl: 'Production' | 'Staging'`, `privacy: 'strict'`) instead of the removed `BrantaServerBaseUrl` / `PrivacyMode` enums.
- **@tanstack/react-virtual** (^3.13.19): Virtualized list rendering (`SwapsList`, dev-mode Contracts list)

### Bitcoin/Cryptography
- **@noble/secp256k1**: Elliptic curve cryptography
- **@scure/bip32**: HD wallet (BIP32)
- **@scure/bip39**: Mnemonic seed phrases (BIP39)
- **@scure/btc-signer**: Bitcoin transaction signing
- **nostr-tools**: Nostr protocol integration

### State & Storage
- **Dexie**: IndexedDB wrapper with React hooks
- **React Context**: Global state management

### UI/UX
- **Custom components** + Framer Motion animations
- **QR Code**: Scanning and generation
- **Service Worker**: PWA offline support

### Development
- **Vitest**: Unit testing framework
- **Playwright**: E2E browser testing
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks

---

## Architecture Overview

### Application Structure
```
src/
├── App.tsx                    # Main app component
├── index.tsx                  # Entry point
├── components/                # Reusable UI components
├── screens/                   # Screen components
│   ├── Init/                  # Wallet initialization
│   ├── Wallet/                # Main wallet screens
│   ├── Settings/              # Settings screens
│   └── Apps/                  # Apps/integrations
├── lib/                       # Utility libraries
├── providers/                 # React context providers
├── icons/                     # SVG icons
└── wallet-service-worker.ts   # PWA service worker
```

### Component Hierarchy
```
App
├── Providers (Context)
│   ├── WalletProvider (Ark SDK)
│   ├── LightningProvider (SwapManager)
│   ├── FeesProvider
│   ├── FiatProvider
│   ├── ConfigProvider
│   ├── AnnouncementsProvider
│   ├── NavigationProvider
│   ├── FlowProvider
│   ├── LimitsProvider
│   └── OptionsProvider
└── Router (Ionic Router)
    ├── Init Screens (Connect, Restore, Success)
    ├── Wallet Screens (Home, Send, Receive, Unavailable)
    ├── Settings Screens (Backup, Display, Fiat, Logs, Support, Vtxos, ...)
    └── Apps Screens (Boltz swaps, Lendasat, Satora)
```

### Data Flow
```
User Action → Component → Provider (Context) → Ark SDK → arkd Server
                                    ↓
                             IndexedDB (Dexie)
```

---

## Features

### Core Wallet Features
- **Create wallet**: Generate new BIP39 seed phrase
- **Restore wallet**: Import existing seed phrase
- **Send**: Send Bitcoin on-chain or Ark off-chain
- **Receive**: Generate boarding addresses and Ark addresses
- **Balance**: View on-chain and off-chain balances
- **Transaction history**: View all transactions and VTXOs
- **Settings**: Configure network, server, theme

### Ark Protocol Features
- **VTXOs management**: View and manage virtual UTXOs
- **VTXO Manager**: Advanced VTXO lifecycle management
- **Off-chain payments**: Instant Ark-to-Ark transfers
- **Boarding**: Onboard Bitcoin to Ark
- **Settlement**: Settle/renew VTXOs in rounds
- **Soft settle**: Optimized settlement with database caching
- **Redemption**: Collaborative exit to on-chain

### DeFi Integration
- **LendaSat**: Bitcoin lending/borrowing with on-chain and Arkade collateral
- **Satora**: Swap service integration (renamed from Lendaswap in PR #612)
- **PSBT signing**: Sign and finalize PSBTs for DeFi interactions

### Developer / Diagnostics
- **Dev mode toggle** (PR #618): Triple-tapping the loading logo toggles a global dev mode persisted in `localStorage`. The tap logic lives in the new `DevModeProvider` (`src/providers/devMode.tsx`) so every `LoadingLogo` in the app shares the same state. **PR #682** adds a second hidden gesture on the onboarding "Welcome to Arkade" heading (`data-testid='onboarding-devmode-tap'`, via `handleTap`) so dev mode can be toggled before a wallet exists.
- **Dev-mode wallet-mode selectors** (PR #682): When dev mode is active, the Init and Restore screens expose HD-rotation controls. **Create wallet** opens a `SheetModal` with a "Rotate receive addresses" `Toggle` (`hd` vs `static`); non-dev users always create `static`. **Restore** shows an Inherit/Static/HD `SegmentedControl` (only for mnemonic input) mapped via `ROTATION_TO_MODE` — Inherit → `undefined`, letting `resolveWalletMode` fall back to `config.walletMode` (typically restored from the Nostr backup just before navigation). The chosen mode flows through `FlowContext.initInfo.walletMode` → `initWallet`.
- **Contracts screen** (PR #618 / PR #645 / PR #670, `src/screens/Settings/Contracts.tsx`): When dev mode is enabled, a "Contracts" entry appears in **Settings → Advanced**. PR #670 rebuilt the screen for many contracts: compact collapsible rows (type · address · deprecated-signer badge · state · age) that expand on tap to reveal address/script/parameters with copy actions; an Active/Inactive tab, type-filter chips, and a search box (matches type, address, script, params); and a virtualized list (`useVirtualizer` from `@tanstack/react-virtual`) with dynamic row heights and open-state kept in the parent so it survives rows scrolling out. Each contract is classified against the operator's advertised signer set (`signerSetFromInfo` + `classifyAgainstSignerSet` from `@arkade-os/sdk`, keyed on `contract.params.serverPubKey`): a **deprecated signer** badge appears for contracts minted under a deprecated signer, becoming **deprecated signer / past cutoff** once the cooperative-migration cutoff has passed. Boarding contracts show their on-chain Bitcoin Taproot address (`bc1p/tb1p/bcrt1p`), re-encoded via `bech32m` from the `5120<64-hex>` P2TR scriptPubKey, instead of the ark encoding. Each expanded address links out to a block explorer (Arkade explorer for ark addresses via `getWebExplorerURL`, mempool explorer for boarding Taproot via `getVmempoolURL`). React key is `contract.script` (the primary key — `address` can collide across boarding contracts). Pull-to-refresh is disabled. Background auto-migration (`SettlementConfig.deprecatedSignerMigration`, default on) is unchanged. (Earlier PR #645 introduced the Active/Inactive split, empty state, `Shadow border` card wrapper, `contract.label`/`prettyAgo(contract.createdAt)`, and the `encodeArkContract` parameters row.)
- **Outdated-client server state** (PR #670, `src/lib/asp.ts` / `src/providers/asp.tsx`): `getAspInfo` catches the SDK's typed `ArkError` named `BUILD_VERSION_TOO_OLD` (arkd's version guard rejects even `getInfo` when the client `X-Build-Version` is below the server minimum) and returns `{ unreachable: true, outdated: true, minBuildVersion }` (min version from `err.metadata.min_version`/`minVersion`, falling back to the `>= vX` substring in the message). `AspInfo` gains `outdated?` / `minBuildVersion?`. New `aspErrorText(info, fallback)` returns "Your wallet is outdated and needs to be updated…" when `outdated`, else the caller's existing wording — used across About/Server/Vtxos/Init/Wallet Index/Notes Form+Redeem/Send/Unavailable, which also react to `aspInfo.outdated` in their error effects. Server copy reworded to "Arkade server" (not "Ark server"); `Chip` gained keyboard a11y.
- **Receive mobile clear-amount** (PR #693, `src/components/Keyboard.tsx` / `src/screens/Wallet/Receive/QrCode.tsx`): the on-screen `Keyboard` (opened by tapping the amount on touch devices) previously offered only a disabled-on-empty "Save" button, so once an amount was set there was no way to remove it — the "Clear amount" action lived solely in the desktop sheet the mobile path never renders. `Keyboard` gains an opt-in `onClear` prop that renders a "Clear amount" button; the Receive screen wires it gated on an amount being set, and clearing now also dismisses the keyboard/sheet to match the confirm flow. The desktop "Clear amount" button switched to the same `hasAmount` check, so it also appears for asset receives. Covered by `src/test/screens/wallet/receive-clear-amount.test.tsx`.
- **Receive QR copy-selection & BIP21 case-insensitivity** (PR #672): the Receive BIP21-build effect no longer clobbers an explicit copy-sheet selection on async rebuilds (LNURL re-emit, invoice arrival, swap address) — `resolveQrValue()` keeps the chosen value until it is no longer offered, then falls back to the unified URI; tapping a copy-sheet row copies that address and switches the QR; LNURL is dropped from the QR and copy list once an amount is set; `encodeBip21` amounts use `useGrouping=false` (plain decimals, never `1,000`); `decodeBip21` matches query keys case-insensitively via a `getParam()` helper so mixed-case `Amount`/`Ark`/`Lightning`/`AssetId` keys parse (supersedes the PR #636 dual-case branches).
- **BIP21 unified copy** (PR #617): The Receive QR copy button copies the unified BIP21 URI (with Lightning fallback) immediately, no submenu.
- **BIP21 parser case-insensitive** (PR #636, commit 32c77736): `decodeBip21` (`src/lib/bip21.ts`) now accepts uppercase URI query parameters (`ARK`, `ASSETID`, `AMOUNT`, `LIGHTNING`) alongside their lowercase forms — matches BIP21 canonical-uppercase QR encodings emitted by other wallets. `Bip21Decoded` is now initialised with `assetId`/`assetAmount`/`arkAddress` explicitly `undefined`, and missing-address inputs (e.g. ARK-only payment URIs) no longer assign an empty `address` string. `isBTCAddress` (`src/lib/address.ts`) regexes (segwit + legacy) gained the `i` flag so uppercase BTC addresses are recognised. A new "should decode a valid bip21 URI with uppercase" test in `src/test/lib/bip21.test.ts` guards the regression. Dev: `@playwright/test` bumped to 1.60.0.
- **BIP21 parser polish** (PR #639): `Bip21Decoded.lnurl` field renamed to `lnUrl` (camelCase) — `decodeBip21` writes to `result.lnUrl` and the Send form consumes `sendInfo.lnUrl`. `src/lib/lnurl.ts` now exports `LnUrlResponse`, and `checkResponse` rejects when the JSON body contains `status === 'ERROR'` (using `data.reason` as the rejection value). The Send form's amount/fee branches are reorganised to keep millisatoshi vs satoshi units consistent. E2E `src/test/e2e/bip21.test.ts` and unit `src/test/lib/bip21.test.ts` updated accordingly.
- **Send "Max" in fiat mode** (PR #640): tapping Max while the amount input is in fiat mode now displays the fiat-converted balance using `fiatDecimalsFor(config.fiat)` decimals, instead of the raw satoshi string. Internal satoshi state is unchanged.
- **Toast deduplication** (PR #641): `ToastProvider` (`src/components/Toast.tsx`) sets sonner `<Toaster visibleToasts={1}>` so at most one notification renders at a time, preventing stacked toasts when several actions complete in quick succession.
- **Pull-to-refresh threshold** (PR #642): `Refresher` (`src/components/Refresher.tsx`) doubles the drag distance required to trigger a refresh, reducing accidental refreshes from short downward scrolls.
- **Hand-written LNURL fix** (PR #696, `src/screens/Wallet/Send/Form.tsx`): typing an LNURL by hand previously errored on every intermediate keystroke. The `parseRecipient` effect is now gated behind a debounced `readyToParse` flag (`RECIPIENT_DEBOUNCE_MS = 800`, with a `timeoutRef` cleared on unmount), so parsing only runs once typing settles. The per-branch `base` reset (which started every parsed target from empty) was removed in favour of spreading the live `sendInfo` and preserving the prior amount (`satoshis: satoshis ?? sendInfo.satoshis`), so partial input no longer wipes accumulated state; the now-unused `resetDerivedState` helper was deleted. A `404` from the LNURL conditions fetch now surfaces a dedicated "LNURL not found" error instead of the generic message. New coverage in `src/test/e2e/form.test.ts` and `src/test/screens/wallet/send.test.tsx`.
- **Boarded-funds TXID link → Arkade explorer** (PR #699, `src/screens/Wallet/Transaction.tsx`): the transaction-detail `isOffchainTx` flag now also evaluates true when only `tx.roundTxid` is present (`!tx.boardingTxid && (Boolean(tx.redeemTxid) || Boolean(tx.roundTxid))`). `Details.tsx` routes the TXID link off this flag — off-chain transactions open the Arkade explorer via `openOffchainTxInNewTab` / `getOffchainTxURL` (`arkade.space` on mainnet, the vmempool base for the network), while on-chain ones use the mempool explorer (`openInNewTab`). So round-settled offboarding "boarded funds" transactions — whose displayed TXID falls back to `roundTxid` since PR #648 — now link to arkade.space instead of being mis-routed to the on-chain mempool explorer. (`showTxidLink` still hides the link on networks without a configured vmempool/off-chain explorer URL.)
- **Skip LNURL checks when ARK address present** (PR #643): in `src/screens/Wallet/Send/Form.tsx`, the LNURL-conditions `useEffect` now early-returns when `sendInfo.arkAddress` is set, and `sendInfo.arkAddress` is added to the dependency array — pasting a unified BIP21 URI with both `ark=` and `lightning=lnurl…` no longer fires an unnecessary LNURL fetch. `encodeBip21` (`src/lib/bip21.ts`) refactored to build the query progressively, omitting empty `ark=` segments and trimming trailing `&`/`?` so e.g. `bitcoin:<addr>` with no ARK/LN/amount no longer leaves a dangling `?`. New `src/test/e2e/form.test.ts` E2E suite covers these Send-form interactions.

### Lightning Integration
- **Submarine swaps**: On-chain → Lightning via SwapManager
- **Reverse submarine swaps**: Lightning → On-chain
- **Boltz provider**: Configurable swap backend
- **Atomic swaps**: HTLC-based trustless execution
- **Swap restoration**: Restore pending swaps from Boltz endpoint
- **Optimistic Lightning send + live settlement tracking (PR #668)**: `payInvoice` (`src/providers/swaps.tsx`) now resolves as soon as the swap is **funded** (lockup tx observed, funds committed/refundable) via the SDK's `waitForSwapFunded` instead of blocking on `waitForSwapSettlement`; it returns only `{ txid }` (the preimage is no longer returned, so `Send/Details.tsx` drops the old `handlePreimage` path and calls `handleTxid` directly). The user lands on the success screen immediately, where `Send/Success.tsx` derives a live `processing → completed / failed / refunded` status (`deriveLnSendStatus`) from the persisted swap in `SwapsContext` using `hasSubmarineStatusReached('invoice.paid')` / `isSubmarineFailedStatus`. The SDK keeps monitoring in the background, so the swap-history row in `SwapsList` still transitions Pending → Successful/Refunded via the existing SwapManager subscription, and a post-funding failure surfaces as "Payment failed" before the auto-refund instead of an error on the sign screen.

### Announcements & Support
- **In-app announcements**: Server-pushed notification banners
- **Chatwoot**: Live customer support chat widget. The Support screen (`src/screens/Settings/Support.tsx`) attaches diagnostic Chatwoot custom attributes including `git_commit`, (PR #686) the `@arkade-os/sdk` `buildVersion` and `sdkVersion` constants as `build_version` / `sdk_version`, and (PR #691) the `@arkade-os/boltz-swap` `sdkVersion` as `boltz_swap_version`.
- **Support page**: Dedicated help and support screen

### Nostr Backup
- **Encrypted backup**: Backup wallet data to Nostr relays
- **Chunked storage**: Split large backups for relay compatibility
- **Nostr restore**: Recover wallet from relay backups

### Accessibility & Deep Linking
- **Keyboard navigation**: Full keyboard support via Focusable component
- **URL deep-links**: Link to wallet actions via URL hash
- **JS/JIT detection**: Informative errors in restricted environments

### PWA Features
- **Install prompt**: Add to home screen on mobile/desktop
- **Offline mode**: View wallet even without internet
- **Background sync**: Sync when connection restored
- **Fast loading**: Service worker caching

---

## User Workflows

### First-Time Setup
1. Open wallet PWA (web or installed)
2. Choose "Create New Wallet" or "Restore Wallet"
3. Save seed phrase (12 or 24 words)
4. Set wallet password (optional)
5. Configure Ark server (or use default)
6. Ready to use

### Sending Bitcoin
1. Navigate to Send screen
2. Enter recipient address (Bitcoin or Ark)
3. Enter amount
4. Choose fee rate (on-chain) or instant (off-chain)
5. Confirm transaction
6. Transaction broadcast

### Receiving Bitcoin
1. Navigate to Receive screen
2. Choose "On-chain" (boarding) or "Off-chain" (Ark)
3. Display QR code or copy address
4. Share with sender
5. Wait for funds to arrive

### Lightning Swap
1. Navigate to Apps → Lightning
2. Choose swap type (on-chain → LN or LN → on-chain)
3. Enter amount
4. Review swap details and fees
5. Confirm swap
6. Monitor swap progress
7. Funds arrive atomically

---

## Development Structure

### Component Organization
- **components/**: Reusable components (buttons, inputs, cards)
- **screens/**: Full-page components (home, send, receive)
- **providers/**: React Context providers for global state
- **lib/**: Utility functions and helpers
- **icons/**: SVG icon components

### State Management
- **React Context**: Global state (wallet, network, theme)
- **Dexie hooks**: IndexedDB reactive queries
- **Local state**: Component-level useState

### Routing
- **Ionic Router**: React Router-based navigation
- **Routes**: Defined in App.tsx
- **Guards**: Protected routes requiring wallet initialization

---

## Security Considerations

### Key Management
- **Client-side only**: Keys never sent to server
- **Encrypted storage**: IndexedDB encrypted by browser
- **Seed phrase backup**: User responsibility
- **No key recovery**: Lost seed = lost funds

### Network Security
- **HTTPS required**: For production deployments
- **Content Security Policy**: Restrict resource loading
- **No eval()**: No dynamic code execution

### PWA Security
- **Service worker scope**: Limited to app origin
- **CORS**: Proper CORS headers for arkd API
- **Secure contexts**: PWA features require HTTPS

---

## Deployment

### Production Build
```bash
# Build optimized bundle
pnpm run build

# Output: dist/ folder
# Deploy dist/ to static hosting
```

### Hosting Options
- **GitHub Pages**: Simple static hosting
- **Vercel/Netlify**: Automatic deployments
- **CDN**: CloudFront, Cloudflare Pages
- **Self-hosted**: Nginx, Apache

### PWA Deployment Checklist
- ✅ HTTPS enabled
- ✅ Service worker registered
- ✅ manifest.json configured
- ✅ Icons for all sizes
- ✅ Meta tags for PWA
- ✅ Offline fallback page

---

## Integration Points

### Arkd Server
- **Connection**: gRPC-web or REST to arkd
- **Operations**: All wallet operations via SDK
- **Server selection**: Configurable by user
- **Network support**: Testnet, mainnet

### Boltz Swap Provider
- **Connection**: HTTP/WebSocket to Boltz backend
- **Operations**: Initiate swaps, monitor status
- **Configurable**: Override default provider

### Browser APIs
- **IndexedDB**: Wallet storage via Dexie
- **Crypto API**: Random number generation
- **Service Worker**: PWA features
- **Clipboard**: Copy addresses
- **Camera**: QR code scanning

---

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ iOS Safari (14+)
- ✅ Android Chrome (90+)

### PWA Support
- ✅ Android: Full PWA support
- ✅ iOS (16.4+): Add to home screen, offline
- ✅ Desktop: Chrome, Edge (full support)
- ⚠️ Firefox: Limited PWA features

---

## Performance Considerations

### Bundle Size
- Main bundle: ~500KB gzipped
- Lazy loading: Routes code-split
- Tree shaking: Unused code removed
- Vite optimization: Fast builds

### Loading Performance
- First Contentful Paint: <1s
- Time to Interactive: <2s
- Service worker caching: Instant subsequent loads

---

## Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **tech reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
