---
project_id: wallet
version: 1.0.0
last_sync_commit: a1c45ff0ac7230ca1f39cc365edd82fc9e44c7c7
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
- **Encrypted storage**: Keys encrypted in IndexedDB via Dexie
- **Recovery via seed**: BIP39 mnemonic for backup

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

---

## Quick Reference

### Prerequisites
- Node.js >= 20
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
```

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
| `VITE_BOLTZ_URL` | Boltz swap provider URL | `https://boltz.example.com` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `VITE_LENDASAT_IFRAME_URL` | LendaSat integration iframe URL | `https://iframe.lendasat.com` |
| `VITE_MAX_PERCENTAGE` | Maximum fee percentage (default: 10) | `10` |
| `CI` | CI environment flag | `true` |
| `GENERATE_SOURCEMAP` | Generate source maps | `false` |

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
- **Ionic React**: Cross-platform UI components

### Arkade Integration
- **@arkade-os/sdk**: Ark protocol SDK (wallet operations, VTXOs)
- **@arkade-os/boltz-swap**: Lightning swap integration

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
- **Ionic Components**: Mobile-first UI
- **QR Code**: Scanning and generation
- **Service Worker**: PWA offline support

### Development
- **Vitest**: Unit testing framework
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
│   ├── ThemeProvider
│   └── NetworkProvider
└── Router (Ionic Router)
    ├── Init Screens (New wallet, Restore)
    ├── Wallet Screens (Home, Send, Receive)
    ├── Settings Screens
    └── Apps Screens (Lightning swaps)
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
- **PSBT signing**: Sign and finalize PSBTs for DeFi interactions

### Lightning Integration
- **Submarine swaps**: On-chain → Lightning
- **Reverse submarine swaps**: Lightning → On-chain
- **Boltz provider**: Configurable swap backend
- **Atomic swaps**: HTLC-based trustless execution

### PWA Features
- **Install prompt**: Add to home screen on mobile/desktop
- **Offline mode**: View wallet even without internet
- **Push notifications**: Transaction notifications (future)
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
