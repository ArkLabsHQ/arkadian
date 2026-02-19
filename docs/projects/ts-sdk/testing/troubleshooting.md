# Ark TypeScript SDK — Troubleshooting

## Build Issues

### TypeScript Compilation Errors

**Problem**: Type errors during `pnpm build`

**Fix**:
```bash
pnpm install          # Ensure deps are installed
rm -rf dist/          # Clean build output
pnpm build            # Rebuild
```

### Module Resolution Errors

**Problem**: Cannot find module `@arkade-os/sdk/adapters/...`

**Fix**: The adapter paths are separate entry points. Ensure your bundler supports the `exports` field in `package.json`. For older bundlers, you may need to configure path aliases.

## Crypto Polyfill Issues

### `crypto.getRandomValues is not defined`

**Problem**: Running in React Native/Expo without crypto polyfill

**Fix**: Add polyfill as the FIRST import in your app entry:
```typescript
import * as Crypto from 'expo-crypto'
if (!global.crypto) global.crypto = {} as any
global.crypto.getRandomValues = Crypto.getRandomValues
```

Install: `npx expo install expo-crypto`

### `Buffer is not defined`

**Problem**: Running in browser environment without Buffer polyfill

**Fix**: The SDK should not require Buffer directly. If you see this, ensure you're using the latest version. For bundlers, you may need:
```bash
npm install buffer
```

## SSE / Streaming Issues

### Settlement Events Not Received

**Problem**: `Wallet.sendBitcoin()` hangs or times out

**Possible causes**:
1. arkd server not reachable — check `arkServerUrl`
2. CORS blocking SSE — ensure server allows EventSource connections
3. React Native — use `ExpoArkProvider` instead of default `RestArkProvider`

### Expo/React Native Streaming Fails

**Problem**: Standard `fetch` streaming doesn't work in React Native

**Fix**: Use the Expo-compatible providers:
```typescript
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo'

const wallet = await Wallet.create({
  identity,
  arkProvider: new ExpoArkProvider(arkServerUrl),
  indexerProvider: new ExpoIndexerProvider(arkServerUrl),
})
```

## Service Worker Issues

### Service Worker Registration Fails

**Problem**: `ServiceWorkerWallet.setup()` throws registration error

**Fix**:
1. Ensure `service-worker.js` is served from the same origin
2. HTTPS required (except localhost)
3. Service worker file must import and start `Worker`:
   ```typescript
   import { Worker } from '@arkade-os/sdk'
   new Worker().start()
   ```

### Service Worker Not Receiving Messages

**Problem**: Wallet methods hang after service worker registration

**Fix**: Check browser DevTools → Application → Service Workers for errors. The service worker may have failed to initialize the Wallet internally.

## Integration Test Issues

### Nigiri Not Starting

**Problem**: `nigiri start --ark` fails

**Fix**:
```bash
# Ensure Docker is running
docker info

# Clean previous state
nigiri stop --delete
nigiri start --ark
```

### Docker Compose Network Error

**Problem**: `docker-compose up` fails with network error

**Fix**: The SDK's docker-compose expects the `nigiri` Docker network:
```bash
nigiri start          # Creates the nigiri network
pnpm test:up-docker   # Joins the nigiri network
```

### Tests Timeout

**Problem**: Integration tests timeout waiting for settlement

**Fix**:
1. Check arkd is running: `curl http://localhost:7070/v1/info`
2. Check round interval (default 10s in regtest)
3. Mine blocks if using block scheduler: `nigiri faucet --liquid false <address>`

## Wallet Issues

### Balance Shows Zero

**Problem**: `getBalance()` returns all zeros after sending funds

**Possible causes**:
1. Funds sent to wrong address (check `getAddress()` vs `getBoardingAddress()`)
2. Transaction not yet confirmed — wait for a round to complete
3. Using wrong network — check wallet is configured for regtest/mutinynet

### `sendBitcoin` Fails with "Insufficient Funds"

**Problem**: Balance shows funds but send fails

**Fix**: Check balance breakdown:
```typescript
const balance = await wallet.getBalance()
console.log('Available:', balance.available)     // Can be spent now
console.log('Preconfirmed:', balance.preconfirmed) // Waiting for round
console.log('Settled:', balance.settled)          // Fully settled
```

Only `available` balance can be spent immediately.

### Boarding Transaction Expired

**Problem**: On-chain deposit not credited after expiry

**Fix**: Boarding transactions have an expiry. Check with:
```typescript
import { hasBoardingTxExpired } from '@arkade-os/sdk'
const expired = hasBoardingTxExpired(tx, expiryBlocks)
```

If expired, the funds return to the sender automatically.

## VTXO Management Issues

### VTXOs Expiring

**Problem**: VTXOs approaching expiration

**Fix**: Use VtxoManager for automatic monitoring:
```typescript
const manager = new VtxoManager(wallet, {
  enabled: true,
  thresholdMs: 24 * 60 * 60 * 1000 // 24h warning
})
const expiring = await manager.getExpiringVtxos()
await manager.renewVtxos()
```

### Recovery Fails

**Problem**: `recoverVtxos()` fails or returns empty

**Fix**: Check recoverable balance first:
```typescript
const balance = await manager.getRecoverableBalance()
console.log('Recoverable:', balance)
```

Recovery only works for swept or expired VTXOs.
