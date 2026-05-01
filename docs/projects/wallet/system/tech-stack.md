# Arkade Wallet — Technology Stack

This document provides a comprehensive reference of all technologies, libraries, and tools used in the Arkade Wallet project.

## Core Framework

### React 18.3.1
**Purpose**: UI library for building component-based user interfaces

**Key Features Used**:
- Functional components with hooks
- Context API for global state management
- Concurrent rendering features
- Suspense for code splitting

**Usage**:
```typescript
import React, { useState, useEffect, useContext } from 'react';

const WalletComponent = () => {
  const [balance, setBalance] = useState(0);
  // Component logic
};
```

### TypeScript 5.8.3
**Purpose**: Type-safe JavaScript development

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "node"
  }
}
```

**Benefits**:
- Compile-time type checking
- Enhanced IDE autocomplete
- Safer refactoring
- Self-documenting code

### Vite 7.1.3
**Purpose**: Build tool and development server

**Features**:
- Lightning-fast HMR (Hot Module Replacement)
- Optimized production builds with Rollup
- Native ES modules during development
- Plugin ecosystem

**Dev Server**: Runs on port 3002 with instant reload

**Production Build**:
- Tree-shaking for minimal bundle size
- Code splitting by route
- Asset optimization
- Source maps (optional)

## UI Framework

### Custom Component Library
**Purpose**: In-tree React components, replacing the previous Ionic React dependency

**Status**: Ionic React (`@ionic/react`) was removed in PR #534. The wallet now ships with hand-rolled components living under `src/components/`.

**Key Components**:
- `Button`, `ButtonsOnBottom`: Buttons and footer button containers
- `Input`, `InputAmount`, `InputContainer`, `InputPassword`, `InputWithScanner`: Form fields
- `Modal`, `SheetModal`: Modal dialogs (SheetModal uses `react-spring-bottom-sheet`)
- `Toast`: Toast notifications (replaces previous `lib/toast.ts`)
- `Refresher`: Pull-to-refresh component (replaces `ion-refresher`)
- `Header`, `Content`, `Padded`, `Grid`: Layout primitives
- `Keyboard`: Custom numeric keyboard with prefers-reduced-motion support
- `QrCode`: Styled QR with tap-to-copy
- `PillNavbarOverlay`: Bottom pill nav, visible only on root pages, Framer Motion animated

**Theming**: CSS custom properties (`src/index.css`, `src/ionic.css` legacy resets)

### react-spring-bottom-sheet 3.4.1
**Purpose**: Bottom sheet modal primitive used by `SheetModal`

### @tanstack/react-virtual 3.13.19
**Purpose**: Virtualized list rendering — used by `SwapsList` (`useVirtualizer`) for performant scrolling of long swap histories.

## Arkade Integration

### @arkade-os/sdk 0.4.22
**Purpose**: Ark protocol SDK for wallet operations

**Core Capabilities**:
- Wallet initialization and key management
- VTXO tracking and management
- Off-chain transaction building and signing
- arkd server communication (gRPC-web)
- Round participation and settlement
- Boarding address generation
- Redemption operations

**API Surface**:
```typescript
interface ArkWallet {
  create(config: WalletConfig): Promise<ArkWallet>;
  getBalance(): Promise<{ onchain: number; offchain: number }>;
  getVTXOs(): Promise<VTXO[]>;
  sendOffchain(params: SendParams): Promise<string>;
  getBoardingAddress(): Promise<string>;
  getArkAddress(): Promise<string>;
  // ... more methods
}
```

### @arkade-os/boltz-swap 0.3.24
**Purpose**: Lightning Network swap integration via Boltz

**Features**:
- Submarine swaps (on-chain → Lightning)
- Reverse submarine swaps (Lightning → on-chain)
- Swap status monitoring
- Invoice generation and payment
- HTLC-based atomic execution
- Submarine recovery API: `scanRecoverableSubmarineSwaps()` returns `SubmarineRecoveryInfo[]` with status `recoverable | pre_cltv | invalid_swap | already_spent | none`; `recoverSubmarineFunds(BoltzSubmarineSwap)` sweeps a single swap (used by Apps → Boltz → Settings bulk recovery)

**API Usage**:
```typescript
import { BoltzClient } from '@arkade-os/boltz-swap';

const boltz = new BoltzClient({
  url: 'https://boltz.exchange/api',
  network: 'testnet'
});

// Create submarine swap
const swap = await boltz.createSwap({
  type: 'submarine',
  amount: 100000, // sats
  invoice: lightningInvoice
});
```

## Bitcoin & Cryptography

### @noble/secp256k1 3.0.0
**Purpose**: Elliptic curve cryptography for Bitcoin signatures

**Features**:
- ECDSA signing and verification
- Schnorr signatures (BIP340)
- Public key derivation
- Pure JavaScript implementation (no native dependencies)

**Security**: Audited, constant-time operations

### @scure/bip32 2.0.0
**Purpose**: Hierarchical Deterministic (HD) wallet key derivation

**BIP32 Support**:
- Master key generation from seed
- Child key derivation (hardened and non-hardened)
- Path notation (e.g., `m/44'/0'/0'/0/0`)

**Usage**:
```typescript
import { HDKey } from '@scure/bip32';

const masterKey = HDKey.fromMasterSeed(seed);
const childKey = masterKey.derive("m/84'/0'/0'/0/0");
const privateKey = childKey.privateKey;
const publicKey = childKey.publicKey;
```

### @scure/bip39 2.0.0
**Purpose**: Mnemonic seed phrase generation (BIP39)

**Features**:
- Generate 12 or 24-word seed phrases
- Validate existing mnemonics
- Convert mnemonic to seed
- Multiple language wordlists (English default)

**Usage**:
```typescript
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const mnemonic = generateMnemonic(wordlist, 128); // 12 words
const seed = mnemonicToSeedSync(mnemonic, 'optional passphrase');
```

### @scure/btc-signer 2.0.1
**Purpose**: Bitcoin transaction signing

**Features**:
- Construct Bitcoin transactions
- Sign inputs with private keys
- Support for SegWit, Taproot
- PSBT (Partially Signed Bitcoin Transactions)

**Usage**:
```typescript
import { Transaction } from '@scure/btc-signer';

const tx = new Transaction();
tx.addInput({ ... });
tx.addOutput({ ... });
tx.sign(privateKey);
const signedTx = tx.hex;
```

### @scure/base 2.0.0
**Purpose**: Base encoding/decoding utilities

**Formats Supported**:
- Base58 (Bitcoin addresses)
- Base64
- Bech32 (SegWit addresses)
- Hex

## State Management & Storage

### Dexie 4.0.11
**Purpose**: IndexedDB wrapper for client-side storage

**Features**:
- Promise-based API
- Typed schema definitions
- Query support (where, filter, orderBy)
- Transactions
- Versioning and migrations

**Schema Example**:
```typescript
import Dexie, { Table } from 'dexie';

class WalletDB extends Dexie {
  wallets!: Table<Wallet>;

  constructor() {
    super('ArkadeWallet');
    this.version(1).stores({
      wallets: 'id, network, encryptedSeed'
    });
  }
}

const db = new WalletDB();
```

### dexie-react-hooks 1.1.7
**Purpose**: React hooks for Dexie (reactive queries)

**Hooks**:
- `useLiveQuery()`: Auto-updating queries that trigger re-renders
- Observes IndexedDB changes and updates UI automatically

**Usage**:
```typescript
import { useLiveQuery } from 'dexie-react-hooks';

const transactions = useLiveQuery(
  () => db.transactions.orderBy('timestamp').reverse().toArray()
);
```

## Utilities

### decimal.js 10.5.0
**Purpose**: Arbitrary-precision decimal arithmetic

**Use Case**: Accurate Bitcoin amount calculations (avoiding floating-point errors)

**Usage**:
```typescript
import Decimal from 'decimal.js';

const sats = new Decimal('100000000'); // 1 BTC
const btc = sats.dividedBy('100000000');
```

### dompurify 3.2.6
**Purpose**: XSS sanitization for user-generated content

**Usage**:
```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
```

### light-bolt11-decoder 3.2.0
**Purpose**: Decode Lightning Network invoices (BOLT11 format)

**Usage**:
```typescript
import * as bolt11 from 'light-bolt11-decoder';

const decoded = bolt11.decode(invoice);
console.log(decoded.sections); // payment_hash, amount, description, etc.
```

### nostr-tools 2.12.0
**Purpose**: Nostr protocol integration

**Features**:
- Event signing and verification
- NIP-05 identifier resolution
- Relay connection handling

**Potential Use Cases**: Nostr-based identity, messaging, or social features

### qr 0.4.2
**Purpose**: QR code generation

**Usage**:
```typescript
import qr from 'qr';

const matrix = qr(address);
// Render QR code to canvas or SVG
```

### react-qr-reader 3.0.0-beta-1
**Purpose**: QR code scanning via device camera

**Component**:
```typescript
import { QrReader } from 'react-qr-reader';

<QrReader
  onResult={(result) => {
    if (result) {
      setAddress(result.text);
    }
  }}
  constraints={{ facingMode: 'environment' }}
/>
```

## Developer Tools

### ESLint 8.57.1
**Purpose**: JavaScript/TypeScript linting

**Plugins**:
- `@typescript-eslint/eslint-plugin` 8.41.0: TypeScript-specific rules
- `eslint-plugin-react` 7.37.5: React best practices
- `eslint-plugin-react-hooks` 5.2.0: Hooks rules
- `eslint-plugin-import` 2.32.0: Import/export validation
- `eslint-plugin-jsx-a11y` 6.10.2: Accessibility rules
- `eslint-plugin-prettier` 5.5.4: Prettier integration

**Configuration**:
```json
{
  "extends": ["react-app"],
  "rules": {
    "no-console": "warn",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### Prettier 3.6.2
**Purpose**: Code formatting

**Config** (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### Husky 8.0.3
**Purpose**: Git hooks for pre-commit checks

**Setup**:
```bash
# Install husky
pnpm prepare

# Add pre-commit hook
npx husky add .husky/pre-commit "pnpm run lint"
```

## Testing

### Vitest 3.2.4
**Purpose**: Unit testing framework (Vite-native)

**Features**:
- Vite-compatible (no config duplication)
- Fast parallel test execution
- Jest-compatible API
- UI mode for debugging

**Config**:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### @testing-library/react 16.3.0
**Purpose**: React component testing utilities

**Philosophy**: Test components as users interact with them

**Usage**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

test('sends payment', () => {
  render(<SendScreen />);
  fireEvent.change(screen.getByLabelText('Address'), {
    target: { value: 'ark1...' }
  });
  fireEvent.click(screen.getByText('Send'));
  expect(screen.getByText('Payment sent')).toBeInTheDocument();
});
```

### @testing-library/jest-dom 6.8.0
**Purpose**: Custom matchers for DOM assertions

**Matchers**: `toBeInTheDocument()`, `toHaveTextContent()`, `toBeDisabled()`, etc.

### @testing-library/user-event 14.6.1
**Purpose**: Simulate user interactions more realistically

**Usage**:
```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.type(screen.getByLabelText('Amount'), '1000');
await user.click(screen.getByText('Send'));
```

### vitest-fetch-mock 0.4.5
**Purpose**: Mock fetch API in tests

**Setup**:
```typescript
import createFetchMock from 'vitest-fetch-mock';

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

fetchMock.mockResponseOnce(JSON.stringify({ balance: 100000 }));
```

### jsdom 26.1.0
**Purpose**: DOM implementation for Node.js (test environment)

**Used by Vitest** to provide browser-like environment for component tests

## Error Tracking

### @sentry/react 9.15.0
**Purpose**: Error tracking and monitoring in production

**Configuration**:
```typescript
import * as Sentry from '@sentry/react';

if (process.env.VITE_SENTRY_DSN && !window.location.hostname.includes('localhost')) {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1
  });
}
```

**Features**:
- Automatic error capture
- React component error boundaries
- Breadcrumbs for debugging
- Performance monitoring

## Build & Deployment

### Vite Plugins

**@vitejs/plugin-react 5.0.2**: React Fast Refresh and JSX transform

**vite-plugin-eslint 1.8.1**: ESLint integration during development

### Package Manager

**pnpm 10.13.1**: Fast, disk-efficient package manager

**Lock File**: `pnpm-lock.yaml` (committed to repository)

**Workspace**: Single-package repository (no monorepo setup)

### Node.js

**Minimum Version**: 20.x

**Engine Enforcement** (`package.json`):
```json
{
  "engines": {
    "node": ">=20",
    "pnpm": ">=8"
  }
}
```

## Environment Variables

Configured via `.env` files, accessed in code via `import.meta.env.VITE_*`:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_ARK_SERVER` | Default arkd server URL | `http://localhost:7070` |
| `VITE_BOLTZ_URL` | Boltz swap provider URL | `https://boltz.exchange/api` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `CI` | CI environment flag | `true` |
| `GENERATE_SOURCEMAP` | Enable source maps in build | `false` |

## Progressive Web App (PWA)

### Service Worker
**File**: `src/wallet-service-worker.ts`

**Features**:
- Offline caching strategy
- Background sync API
- Push notifications API (future)

**Registration**:
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/wallet-service-worker.js');
}
```

### Web App Manifest
**File**: `public/manifest.json`

**Configuration**:
```json
{
  "name": "Arkade Wallet",
  "short_name": "Arkade",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#5856d6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Browser APIs Used

- **IndexedDB**: Persistent storage (via Dexie)
- **Web Crypto API**: Random number generation for seed entropy
- **Service Worker API**: Offline functionality
- **Camera API**: QR code scanning (via react-qr-reader)
- **Clipboard API**: Copy addresses to clipboard
- **LocalStorage**: Optional for non-sensitive settings
- **Fetch API**: HTTP requests to arkd and Boltz

## Bundle Analysis

**Main Bundle** (~500KB gzipped):
- React + React DOM: ~150KB
- Ionic React: ~100KB
- @arkade-os/sdk: ~80KB
- Crypto libraries (@noble, @scure): ~100KB
- Dexie + utilities: ~50KB
- Application code: ~20KB

**Code Splitting**:
- Route-level chunks for lazy loading
- Vendor chunks separated from app code
- Manual chunks for large libraries

## Browser Compatibility

**Supported Browsers**:
- Chrome/Edge 90+ (full PWA support)
- Firefox 88+ (limited PWA features)
- Safari 14+ (iOS 16.4+ for full PWA)
- Android Chrome 90+

**Polyfills**: Minimal (targeting modern browsers)

**Feature Detection**: Graceful degradation for missing APIs (e.g., camera for QR scanning)

## Version Management

**Semantic Versioning**: `0.1.0` (alpha)

**Dependencies**: Locked via `pnpm-lock.yaml`

**Overrides** (security/compatibility):
```json
{
  "pnpm": {
    "overrides": {
      "rollup": "4.44.2"
    }
  }
}
```

## Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `pnpm git-info; pnpm build:worker; vite` | Dev server |
| `build` | `pnpm git-info; pnpm build:worker; vite build` | Production build |
| `build:worker` | `vite build -c vite.worker.config.ts` | Build service worker |
| `test` | `vitest run` | Run unit tests |
| `test:ui` | `vitest run --ui` | Run tests with UI |
| `test:coverage` | `vitest run --coverage` | Generate coverage report |
| `lint` | `eslint --ext .ts,.tsx src` | Lint code |
| `format` | `prettier --write src` | Format code |
| `format:check` | `prettier --check src` | Check formatting |
| `git-info` | `node scripts/git-commit-info.js` | Generate build metadata |
| `regtest:start` | `./regtest/start-env.sh && docker compose -f docker-compose.nak.yml up -d` | Start arkade-regtest stack + nak relay |
| `regtest:stop` | `./regtest/stop-env.sh && docker compose -f docker-compose.nak.yml down` | Stop regtest environment |
| `regtest:clean` | `./regtest/clean-env.sh && docker compose -f docker-compose.nak.yml down -v` | Tear down and wipe volumes |
| `regtest:setup` | `node src/test/setup.mjs` | Seed wallet/test fixtures |

## Security Dependencies

- **@noble/secp256k1**: Audited cryptography library
- **@scure/***:scure family of Bitcoin libraries (audited)
- **dompurify**: XSS prevention
- **React**: Auto-escapes JSX content

## Future Additions

Potential libraries for future features:
- **@capacitor/core**: Native mobile features (if moving beyond PWA)
- **workbox-webpack-plugin**: Advanced service worker tooling
- **i18next**: Internationalization
- **recharts**: Charts for transaction history visualization
