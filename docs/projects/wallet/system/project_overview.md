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
- **On-chain to Lightning**: Convert Bitcoin to Lightning capacity
- **Lightning to on-chain**: Drain Lightning channels to Bitcoin
- **Atomic swaps**: Trustless via HTLCs
- **Swap restoration**: Restore pending swaps from Boltz endpoint

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

## Technology Stack

- **React 18** with TypeScript for type-safe UI development
- **Ionic React** for cross-platform mobile-first components
- **Vite** for fast builds and development server
- **@arkade-os/sdk** (0.3.12) for Ark protocol operations
- **@arkade-os/boltz-swap** (0.2.19) for Lightning swap integration
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
**Dependencies**: @arkade-os/sdk 0.3.12, @arkade-os/boltz-swap 0.2.19

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
