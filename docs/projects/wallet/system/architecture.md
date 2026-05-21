# Arkade Wallet — Architecture

This document describes the technical architecture of Arkade Wallet, a React-based Progressive Web App for interacting with the Ark protocol.

## High-Level Architecture

Arkade Wallet follows a **client-side first architecture** where all sensitive operations (key management, signing, encryption) happen exclusively in the browser. The wallet communicates with an arkd server for protocol operations but maintains complete control over private keys.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User Device)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Arkade Wallet (React PWA)               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  React Components (Ionic UI)                │  │  │
│  │  │  - Init Screens (Create/Restore)            │  │  │
│  │  │  - Wallet Screens (Home/Send/Receive)       │  │  │
│  │  │  - Settings & Apps (Lightning swaps)        │  │  │
│  │  └────────────────┬────────────────────────────┘  │  │
│  │                   ↓                                │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  React Context Providers (State)            │  │  │
│  │  │  - WalletProvider (@arkade-os/sdk)          │  │  │
│  │  │  - NetworkProvider                          │  │  │
│  │  │  - ThemeProvider                            │  │  │
│  │  └────────────┬──────────────┬─────────────────┘  │  │
│  │               ↓              ↓                     │  │
│  │  ┌────────────────┐  ┌──────────────────────────┐ │  │
│  │  │  @arkade-os/sdk│  │  IndexedDB (Dexie)       │ │  │
│  │  │  - Wallet ops  │  │  - Encrypted keys        │ │  │
│  │  │  - VTXOs       │  │  - Transaction history   │ │  │
│  │  │  - Signing     │  │  - Settings              │ │  │
│  │  └────────┬───────┘  └──────────────────────────┘ │  │
│  │           ↓                                        │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │  Service Worker (PWA)                        │ │  │
│  │  │  - Offline caching                           │ │  │
│  │  │  - Background sync                           │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       ↓ gRPC-web / REST
         ┌─────────────────────────────┐
         │      arkd Server            │
         │  - Round management         │
         │  - VTXO operations          │
         │  - Settlement               │
         └─────────────┬───────────────┘
                       ↓
              ┌────────────────┐
              │  Bitcoin Network│
              └────────────────┘
```

## Component Layers

### 1. Presentation Layer (React Components)

**Location**: `src/screens/`, `src/components/`

**Responsibility**: User interface and interaction handling

**Key Components**:
- **Init Screens** (`src/screens/Init/`): Wallet creation and restoration
  - `CreateWallet.tsx`: Generate new BIP39 seed
  - `RestoreWallet.tsx`: Import existing seed
  - `SeedPhrase.tsx`: Display and confirm seed words

- **Wallet Screens** (`src/screens/Wallet/`): Main wallet functionality
  - `Home.tsx`: Balance display, transaction history
  - `Send.tsx`: Send Bitcoin on-chain or Ark off-chain
  - `Receive.tsx`: Generate boarding and Ark addresses
  - `VTXOs.tsx`: View and manage virtual UTXOs

- **Settings Screens** (`src/screens/Settings/`): Configuration
  - `Network.tsx`: Select Bitcoin network (testnet/mainnet)
  - `Server.tsx`: Configure arkd server URL
  - `Security.tsx`: Wallet password, backup
  - `Advanced.tsx`: Advanced settings list — surfaces the `Contracts` entry when dev mode is on
  - `Contracts.tsx` (PR #618, dev mode only): Renders all `ContractManager` contracts (active-first) with type/state/shortened+copyable address & script; pull-to-refresh disabled

- **Apps Screens** (`src/screens/Apps/`): Advanced features
  - `Lightning.tsx`: Boltz submarine swaps
  - `SwapStatus.tsx`: Monitor swap progress

**Routing**: Ionic Router (React Router wrapper)
```typescript
<IonReactRouter>
  <Route path="/init" component={InitScreens} />
  <Route path="/wallet" component={WalletScreens} />
  <Route path="/settings" component={SettingsScreens} />
  <Route path="/apps" component={AppsScreens} />
</IonReactRouter>
```

### 2. State Management Layer (React Context)

**Location**: `src/providers/`

**Responsibility**: Global application state and business logic coordination

**Key Providers** (`src/providers/`):

- **WalletProvider** (`wallet.tsx`): Core wallet state — balance, VTXOs, send/receive, settlement. As of PR #613 ("Fix dead service worker"), service-worker wallet initialization uses an **AbortController-per-session** model rather than a generation counter: each `initSvcWorkerWallet` call mints a new `AbortSignal` (`startInitSession`) and aborts the previous with reason `'init'` ("abandon, don't clear"); lock/reset aborts the current signal with reason `'lock-reset'` so stale paths can decide whether to call `svcWallet.clear()` (`clearIfLockReset`). `runInitAttempt` is extracted so retries inherit the same signal. As of PR #624, `initSvcWorkerWallet` accepts a typed `Identity` (`SingleKey` for legacy wallets, `MnemonicIdentity` for new mnemonic-backed wallets); the legacy `privateKey?: string` parameter is gone. `initWallet` is now `initWallet(credentials: { mnemonic?: string; privateKey?: Uint8Array })` — the mnemonic path constructs `MnemonicIdentity.fromMnemonic(..., { isMainnet })`, derives the LNURL session secret via `deriveNostrKeyFromMnemonic` (BIP86 `m/86'/coinType'/0'/0/0`), and pushes the mnemonic into `FlowContext.setLnurlInfo`; the privateKey path uses `SingleKey.fromPrivateKey`. `ServiceWorkerWallet.setup` is now called with `walletMode: 'static'` for all wallets so addresses never rotate. `unlockWallet` reads `hasMnemonic()` to decide between `getMnemonic(password)` and `getPrivateKey(password)`, and translates `DOMException` from `crypto.subtle.decrypt` (wrong password) into `Error('Invalid password')`. `restartWallet` no longer pulls `.toHex()` off the identity — it reuses `svcWallet.identity` directly.
- **LightningProvider** (`lightning.tsx`): SwapManager-based Lightning swap orchestration (submarine, reverse, chain swaps)
- **FeesProvider** (`fees.tsx`): Fee estimation and display for on-chain/collaborative exit
- **FiatProvider** (`fiat.tsx`): Fiat currency conversion (USD, EUR, CHF, etc.)
- **ConfigProvider** (`config.tsx`): App configuration, announcements tracking
- **AnnouncementsProvider** (`announcements.tsx`): In-app announcement banners
- **NavigationProvider** (`navigation.tsx`): Browser back button handling, flow state
- **FlowProvider** (`flow.tsx`): Multi-step flow state management
- **LimitsProvider** (`limits.tsx`): Swap limits from Boltz
- **OptionsProvider** (`options.tsx`): User preferences and display options
- **LnurlProvider** (`lnurl.tsx`, PR #559): App-level owner of the LNURL SSE session. Self-manages start/stop based on wallet identity + Boltz swaps readiness, so the LNURL stays active even when the user leaves the Receive screen. Derives credentials deterministically via `HMAC-SHA256(privateKey, "lnurl-session")` and sends only the `token` to lnurl-server (server computes `sessionId = SHA-256(token).slice(0, 32)`). Handles invoice requests in-provider: create reverse swap, return invoice, claim in background, notify on completion. Exposes `lnurl/active/error` to consumers; the legacy `useLnurlSession` hook is removed.
- **DevModeProvider** (`devMode.tsx`, PR #618): Global dev mode toggle persisted in `localStorage`; triple-tap on any `LoadingLogo` flips it. Gates dev-only UI such as the Contracts screen under **Settings → Advanced**.

### 3. Business Logic Layer (@arkade-os/sdk)

**Location**: `node_modules/@arkade-os/sdk` (external dependency)

**Responsibility**: Ark protocol operations, cryptography, signing

**Key Capabilities**:
- **Wallet initialization**: BIP39 seed generation, BIP32 key derivation
- **VTXO management**: Track virtual UTXOs, expiry, renewal
- **Transaction building**: Construct Ark off-chain and Bitcoin on-chain transactions
- **Signing**: Sign transactions with derived keys
- **arkd communication**: gRPC-web client for arkd API
- **Round participation**: Submit intents, receive settlements

**Usage Example**:
```typescript
import { ArkWallet } from '@arkade-os/sdk';

const wallet = await ArkWallet.create({
  network: 'testnet',
  arkdUrl: 'http://localhost:7070',
  mnemonic: seedPhrase,
});

// Send off-chain payment
const txid = await wallet.sendOffchain({
  to: arkAddress,
  amount: 10000, // sats
});
```

### 4. Data Persistence Layer (Dexie + IndexedDB)

**Location**: `src/lib/db.ts` (Dexie schema)

**Responsibility**: Client-side encrypted storage

**Schema**:
```typescript
class WalletDB extends Dexie {
  wallets: Table<Wallet>;
  transactions: Table<Transaction>;
  vtxos: Table<VTXO>;
  settings: Table<Setting>;

  constructor() {
    super('ArkadeWallet');
    this.version(1).stores({
      wallets: 'id, network, encryptedSeed',
      transactions: 'txid, timestamp, type, status',
      vtxos: 'id, amount, expiry, status',
      settings: 'key, value'
    });
  }
}
```

**Storage Strategy**:
- **Private keys**: Encrypted with user password (optional), stored in `wallets.encryptedSeed`
- **Transaction history**: Cached for offline viewing
- **VTXOs**: Synced from arkd, stored for quick access
- **Settings**: Network config, theme, arkd URL

**IndexedDB Advantages**:
- Large storage quota (several GB available)
- Asynchronous API (non-blocking)
- Browser origin isolation (secure by default)
- Works offline

### 5. Service Worker Layer (PWA)

**Location**: `src/wallet-service-worker.ts`

**Responsibility**: Offline functionality, caching, background sync

**Caching Strategy**:
- **App shell**: HTML, CSS, JS bundled and cached on install
- **API responses**: Cache arkd responses with short TTL
- **Static assets**: Icons, fonts cached indefinitely
- **Network-first with fallback**: Try network, fall back to cache if offline

**Capabilities**:
- **Offline wallet viewing**: Display cached balance and transaction history
- **Background sync**: Queue transactions when offline, send when reconnected
- **Push notifications**: (Future) Notify on received payments

**Service Worker Lifecycle**:
```typescript
// Install: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('arkade-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/static/js/bundle.js',
        '/static/css/main.css'
      ]);
    })
  );
});

// Fetch: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
```

## Data Flow Patterns

### Sending a Payment (Off-chain)

1. **User action**: User enters address and amount in `Send.tsx`
2. **Validation**: Component validates input (valid Ark address, sufficient balance)
3. **Context call**: Component calls `wallet.send(address, amount)` from `WalletProvider`
4. **SDK execution**:
   - `@arkade-os/sdk` constructs off-chain transaction
   - Signs with derived private key
   - Submits intent to arkd via gRPC
5. **arkd processing**: arkd includes intent in next round
6. **Settlement**: arkd broadcasts round settlement on-chain
7. **State update**:
   - SDK receives settlement notification
   - Updates VTXO set (old VTXOs spent, new VTXOs received)
   - WalletProvider updates balance and vtxos state
8. **UI refresh**: React re-renders with new balance
9. **Persistence**: Dexie saves transaction to IndexedDB

### Receiving a Payment (Boarding)

1. **User action**: User opens `Receive.tsx`, selects "On-chain boarding"
2. **Address generation**:
   - `WalletProvider` calls `wallet.getBoardingAddress()`
   - SDK derives boarding address from BIP32 key
3. **Display**: Component displays QR code and address string
4. **External send**: Sender sends Bitcoin to boarding address
5. **arkd detection**: arkd monitors blockchain, detects payment
6. **Round inclusion**: arkd includes boarding UTXO in next round
7. **VTXO creation**: arkd creates VTXO for recipient
8. **SDK sync**:
   - SDK polls arkd for new VTXOs
   - Detects new VTXO matching boarding address
9. **State update**: WalletProvider updates balance and vtxos
10. **UI notification**: Home screen shows new balance
11. **Persistence**: Dexie saves VTXO and transaction record

## Security Architecture

### Key Management

**Two identity paths (PR #624)**:
- **New wallets — `MnemonicIdentity`** (`@arkade-os/sdk`): 12-word BIP39 mnemonic → BIP86 Taproot derivation at `m/86'/coinType'/0'/0/0` (coinType `0` mainnet, `1` testnet). Signing happens inside the service worker against the worker-constructed `MnemonicIdentity`.
- **Legacy wallets — `SingleKey`**: raw 32-byte private key, stored encrypted; supported indefinitely for unlock + restore.

**Mnemonic storage** (`src/lib/mnemonic.ts`):
```typescript
// encryptMnemonic — PBKDF2 (100k iters, SHA-256) → AES-GCM (256)
// Random 16-byte salt + 12-byte IV per record; combined blob base64'd
// into localStorage['encrypted_mnemonic'].

export const deriveNostrKeyFromMnemonic = (mnemonic, isMainnet) => {
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error('Invalid mnemonic phrase')
  const seed = mnemonicToSeedSync(mnemonic)
  const master = HDKey.fromMasterSeed(seed)
  const coinType = isMainnet ? 0 : 1
  const derived = master.derive(`m/86'/${coinType}'/0'`).deriveChild(0).deriveChild(0)
  if (!derived.privateKey) throw new Error('BIP32 derivation yielded no private key')
  return derived.privateKey // 32 bytes, used as the LNURL session secret
}
```

The Nostr-backup key is intentionally the same key as the Ark signing key (matches legacy raw-private-key behavior where one key served both purposes).

**Legacy seed generation** (still applicable to non-mnemonic wallets and tests):
```typescript
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
const mnemonic = generateMnemonic(wordlist, 128); // 12 words
```

**Storage**:
- Mnemonic (new) or raw private key (legacy) AES-GCM-encrypted in `localStorage` (`encrypted_mnemonic` / `encrypted_private_key`); user password is the KDF input — empty string means passwordless
- Derived keys / identities kept in memory inside the service-worker session; the wallet provider holds the mnemonic in a ref for `restartWallet` and clears it on lock
- Password change (`Settings → Password.saveNewPassword`) re-encrypts the mnemonic for mnemonic wallets, or the private key for legacy wallets

### Network Security

- **HTTPS required**: Production deployments must use HTTPS
- **Content Security Policy**: Restrict resource loading to trusted origins
- **No eval()**: No dynamic code execution vulnerabilities
- **CORS**: arkd server must have proper CORS headers for browser access

### Threat Model

**Protected Against**:
- Server compromise (keys never sent to server)
- Network eavesdropping (HTTPS)
- XSS attacks (CSP, React escaping)
- Malicious arkd server (can't steal keys, only deny service)

**Not Protected Against**:
- Device compromise (malware, keylogger)
- Physical access to unlocked device
- User sharing seed phrase
- Browser vulnerabilities

## Performance Optimizations

### Bundle Optimization

- **Code splitting**: Routes lazy-loaded
- **Tree shaking**: Unused code removed by Vite
- **Minification**: Production builds compressed
- **Target bundle size**: ~500KB gzipped

### Rendering Optimization

- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Memoize expensive computations
- **Virtualized lists**: For long transaction history (future)

### Network Optimization

- **Debounced API calls**: Prevent excessive polling
- **Optimistic UI updates**: Show pending state before confirmation
- **Service worker caching**: Instant loads for cached resources

## Build System

**Tool**: Vite 7.1.3

**Key Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.GENERATE_SOURCEMAP !== 'false',
    rollupOptions: {
      output: {
        manualChunks: {
          'ionic': ['@ionic/react'],
          'sdk': ['@arkade-os/sdk'],
          'crypto': ['@noble/secp256k1', '@scure/bip32', '@scure/bip39']
        }
      }
    }
  }
});
```

**Build Process**:
1. TypeScript compilation
2. Service worker build (`vite.worker.config.ts`)
3. Main app build
4. Asset optimization
5. Generate `manifest.json` for PWA

## Deployment Architecture

**Static Hosting**:
```
CDN / Static Host (Vercel, Netlify, GitHub Pages)
  ├── index.html
  ├── assets/
  │   ├── js/
  │   ├── css/
  │   └── icons/
  ├── wallet-service-worker.js
  └── manifest.json
```

**Requirements**:
- HTTPS enabled
- Proper MIME types for JS/CSS
- Service worker scope configured
- manifest.json served with correct content-type

**PWA Installation Flow**:
1. User visits HTTPS URL
2. Browser detects manifest.json + service worker
3. Browser shows "Install app" prompt (iOS 16.4+, Android, desktop Chrome/Edge)
4. User installs → app appears on home screen
5. Subsequent launches open in standalone mode (no browser UI)

## Testing Architecture

**Unit Tests** (Vitest):
- Component rendering tests (`src/test/screens/`)
- Utility function tests (`src/test/lib/`)
- Mock infrastructure (`src/test/screens/mocks.ts`, `src/test/setup.mjs`)

**E2E Tests** (Playwright):
- Full browser automation with Chromium
- Tests in `src/test/e2e/`: init, backup, restore, send, receive, swap, keyboard, nostr, pwa, serverdown
- Shared utilities in `src/test/e2e/utils.ts`
- Docker-based test environment (`test.docker-compose.yml`) with arkd + nak (Nostr relay)
- CI via `.github/workflows/playwright.yml`

**Test Configuration**:
- Unit: Vitest with jsdom environment (`src/test/setup.mjs`)
- E2E: Playwright (`playwright.config.ts`) running against local dev server

## Browser Compatibility

**Minimum Requirements**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+ (PWA support in 16.4+)
- Android Chrome 90+

**Polyfills**: Minimal, targeting modern browsers only

**Feature Detection**:
- IndexedDB availability check
- Service Worker support check
- Camera API for QR scanning (optional feature)
