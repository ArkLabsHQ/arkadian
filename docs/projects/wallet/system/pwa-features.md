# Arkade Wallet — Progressive Web App Features

This document describes the Progressive Web App (PWA) features of Arkade Wallet and how they enable a native-like experience without app store distribution.

## What is a Progressive Web App?

A Progressive Web App is a web application that uses modern browser capabilities to provide an app-like experience. PWAs combine the reach of the web with the functionality of native apps.

**Key Characteristics**:
- **Installable**: Users can add to home screen like native apps
- **Offline-capable**: Works without internet connection via service workers
- **Fast**: Instant loading through caching strategies
- **Responsive**: Adapts to any screen size or device
- **Secure**: Requires HTTPS for advanced features
- **Auto-updating**: Updates automatically without user intervention

## Installability

### Installation Prompts

**Desktop (Chrome/Edge)**:
1. Visit wallet URL via HTTPS
2. Browser shows install icon in address bar
3. Click icon → "Install Arkade Wallet"
4. App appears in applications menu

**Android (Chrome)**:
1. Visit wallet URL
2. Banner appears: "Add Arkade to Home screen"
3. Tap "Add" → Icon appears on home screen
4. Launches in standalone mode (no browser UI)

**iOS (Safari 16.4+)**:
1. Visit wallet URL
2. Tap Share button
3. Tap "Add to Home Screen"
4. Icon appears on home screen
5. Launches in standalone mode

### Installation Criteria

Browser checks these requirements before showing install prompt:

1. ✅ **HTTPS**: Site served over secure connection
2. ✅ **Web App Manifest**: `manifest.json` present with required fields
3. ✅ **Service Worker**: Registered and activated
4. ✅ **Engagement**: User has interacted with site (minimal threshold)

### Web App Manifest

**File**: `public/manifest.json`

```json
{
  "name": "Arkade Wallet",
  "short_name": "Arkade",
  "description": "Self-custodial Bitcoin wallet with Ark protocol support",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#5856d6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["finance", "utilities"],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

**Key Fields**:
- **name**: Full application name (shown in install dialog)
- **short_name**: Short name (shown under icon, max 12 chars)
- **start_url**: URL to open when app launches
- **display**: `standalone` removes browser UI, `fullscreen` for immersive mode
- **icons**: Multiple sizes for different devices (192x192, 512x512 recommended)
- **theme_color**: Browser UI color (address bar on Android)
- **background_color**: Splash screen background

### Standalone Mode

When installed, the wallet launches in **standalone mode**:

**Removed UI Elements**:
- Browser address bar
- Back/forward buttons
- Browser menu
- Share button (iOS)

**Retained Features**:
- System status bar (battery, time, network)
- System navigation (Android back button, iOS gestures)

**Detection in Code**:
```typescript
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

if (isStandalone) {
  console.log('Running as installed PWA');
} else {
  console.log('Running in browser');
}
```

## Offline Functionality

### Service Worker Architecture

**File**: `src/wallet-service-worker.ts`

**Lifecycle**:
1. **Install**: Download and cache app shell (HTML, CSS, JS)
2. **Activate**: Clean up old caches, take control of pages
3. **Fetch**: Intercept network requests, serve from cache or network

**Registration** (`src/index.tsx`):
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/wallet-service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}
```

### Caching Strategies

**1. Cache-First (App Shell)**

Static assets served from cache first, falling back to network:

```typescript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

**Use Case**: HTML, CSS, JS, fonts, icons

**2. Network-First (API Calls)**

Try network first, fall back to cache if offline:

```typescript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});
```

**Use Case**: arkd API calls, balance updates

**3. Stale-While-Revalidate (Images)**

Serve cached version immediately, update cache in background:

```typescript
event.respondWith(
  caches.open('images').then((cache) => {
    return cache.match(event.request).then((response) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      });
      return response || fetchPromise;
    });
  })
);
```

**Use Case**: QR code images, profile avatars

### Offline Capabilities

**What Works Offline**:
- View wallet balance (cached)
- View transaction history (cached)
- View VTXOs (cached)
- Generate receive addresses (deterministic from seed)
- View settings
- Copy addresses to clipboard

**What Requires Network**:
- Send payments (requires arkd connection)
- Refresh balance (requires blockchain data)
- Lightning swaps (requires Boltz connection)
- Sync new transactions (requires arkd polling)

**Offline Detection**:
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Show offline banner
{!isOnline && <OfflineBanner />}
```

### Background Sync

**API**: Background Sync allows deferred network operations

**Use Case**: Queue transactions when offline, send when reconnected

**Registration** (service worker):
```typescript
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-transaction') {
    event.waitUntil(sendQueuedTransactions());
  }
});
```

**Triggering Sync** (app):
```typescript
async function sendTransaction(tx) {
  if (!navigator.onLine) {
    // Queue transaction in IndexedDB
    await db.queuedTransactions.add(tx);

    // Register sync
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('send-transaction');

    return 'Queued for sending when online';
  } else {
    // Send immediately
    return await arkWallet.send(tx);
  }
}
```

**Current Status**: Background Sync implemented for future use (not yet in production)

## Performance Optimization

### Fast Loading

**First Load** (cold cache):
1. Download HTML (~5KB)
2. Download main JS bundle (~500KB gzipped)
3. Download CSS (~20KB gzipped)
4. Parse and execute JavaScript
5. Render UI

**Target Metrics**:
- First Contentful Paint: <1 second
- Time to Interactive: <2 seconds
- Largest Contentful Paint: <2.5 seconds

**Subsequent Loads** (warm cache):
1. Service worker intercepts request
2. Serve cached HTML, CSS, JS
3. Instant render

**Target Metrics**:
- First Contentful Paint: <0.3 seconds
- Time to Interactive: <0.5 seconds

### Code Splitting

**Route-Level Splitting**:
```typescript
import { lazy, Suspense } from 'react';

const SendScreen = lazy(() => import('./screens/Send'));
const ReceiveScreen = lazy(() => import('./screens/Receive'));

<Suspense fallback={<LoadingSpinner />}>
  <Route path="/send" component={SendScreen} />
  <Route path="/receive" component={ReceiveScreen} />
</Suspense>
```

**Benefits**:
- Smaller initial bundle
- Faster first load
- Only load code when needed

### Asset Optimization

**Images**:
- PNG icons optimized with pngquant
- SVG icons for scalability
- Lazy loading for non-critical images

**Fonts**:
- Subset fonts to include only used characters
- Preload critical fonts
- font-display: swap for faster rendering

## Push Notifications

**API**: Push API + Notifications API

**Use Case**: Notify user of received payments, round settlements

**Permission Request**:
```typescript
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
```

**Service Worker Handler**:
```typescript
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: `Received ${data.amount} sats`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: { txid: data.txid }
  };

  event.waitUntil(
    self.registration.showNotification('Payment Received', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(`/transaction/${event.notification.data.txid}`)
  );
});
```

**Current Status**: Push notifications planned for future release

## App Updates

### Update Strategy

**Automatic Updates**:
1. New version deployed to server
2. User visits wallet (service worker checks for updates)
3. New service worker downloads in background
4. Service worker enters "waiting" state
5. On next app close/reopen, new version activates

**Manual Update Check**:
```typescript
async function checkForUpdates() {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();

  if (registration.waiting) {
    // New version available
    showUpdatePrompt();
  }
}
```

**Update Prompt**:
```typescript
function showUpdatePrompt() {
  if (confirm('New version available. Update now?')) {
    const registration = await navigator.serviceWorker.ready;

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    window.location.reload();
  }
}
```

**Service Worker Handler**:
```typescript
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Versioning

**Build Metadata** (injected during build):
```typescript
const BUILD_INFO = {
  version: '0.1.0',
  commit: 'abc123def',
  timestamp: '2025-01-15T12:00:00Z'
};

// Display in Settings screen
console.log(`Arkade Wallet v${BUILD_INFO.version} (${BUILD_INFO.commit})`);
```

**Script**: `scripts/git-commit-info.js` generates build metadata

## Platform-Specific Features

### iOS Safari (16.4+)

**Features**:
- Add to Home Screen
- Standalone mode
- Service worker support
- Push notifications (17.0+)

**Limitations**:
- No install banner (must use Share → Add to Home Screen)
- Service worker limited to 50MB cache
- Push notifications require user gesture

**Optimizations**:
- Minimal splash screen delay
- Proper viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
- Status bar styling: `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`

### Android Chrome

**Features**:
- Install banner
- Standalone mode
- Full push notification support
- Background sync
- Periodic background sync (experimental)

**Install Banner**:
```typescript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show custom install button
  showInstallButton();
});

async function showInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install prompt: ${outcome}`);
    deferredPrompt = null;
  }
}
```

**Optimizations**:
- Theme color matches brand: `<meta name="theme-color" content="#5856d6">`
- Maskable icons for adaptive icons
- Splash screen generated from manifest

### Desktop (Chrome/Edge)

**Features**:
- Install via address bar icon
- App appears in applications menu
- Keyboard shortcuts
- Multiple windows

**Window Controls**:
```json
{
  "display_override": ["window-controls-overlay"],
  "scope": "/",
  "start_url": "/"
}
```

**Optimizations**:
- Responsive layout for desktop screens
- Keyboard navigation support
- Context menu integration

## Security Considerations

### HTTPS Requirement

**Production**: HTTPS required for:
- Service worker registration
- Push notifications
- Background sync
- Camera access (QR scanning)
- Geolocation (future features)

**Development**: `localhost` exempt from HTTPS requirement

### Content Security Policy

**Headers**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://arkd-server.com;
  frame-ancestors 'none';
```

### Service Worker Scope

**Scope**: Limited to origin (e.g., `https://wallet.arkade.example`)

**Isolation**: Cannot access resources from other origins without CORS

**Permissions**: Cannot access camera, location, etc. without user consent

## Debugging PWAs

### Chrome DevTools

**Application Tab**:
- Manifest validation
- Service worker status (active, waiting, installing)
- Cache storage inspection
- IndexedDB browser

**Lighthouse**:
- PWA audit checklist
- Performance metrics
- Accessibility checks

**Service Worker Debugging**:
```
chrome://inspect/#service-workers
chrome://serviceworker-internals
```

### Testing Offline Mode

**Chrome DevTools**:
1. Open Network tab
2. Select "Offline" from throttling dropdown
3. Reload page → Should work offline

**Service Worker**:
1. Application tab → Service Workers
2. Check "Offline" checkbox
3. Test functionality

## PWA Checklist

- ✅ HTTPS enabled in production
- ✅ Web App Manifest with name, icons, start_url, display
- ✅ Service worker registered and activated
- ✅ Offline fallback page
- ✅ Fast loading (< 2s Time to Interactive)
- ✅ Works on mobile and desktop
- ✅ Responsive design (adapts to all screen sizes)
- ✅ Content sized correctly for viewport
- ✅ Provides custom install experience
- ✅ Themed address bar (Android)
- ✅ Splash screen configured (icons + background color)
- 🔄 Push notifications (future)
- 🔄 Periodic background sync (future)

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
