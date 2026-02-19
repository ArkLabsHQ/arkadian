# Ark TypeScript SDK — Usage Guide

## Installation

```bash
# npm
npm install @arkade-os/sdk

# pnpm
pnpm add @arkade-os/sdk

# yarn
yarn add @arkade-os/sdk
```

## Quick Start

### Create a Wallet

```typescript
import { Wallet, SingleKey } from '@arkade-os/sdk'

const identity = SingleKey.fromHex('your_private_key_hex')
// Or generate: SingleKey.fromRandomBytes()

const wallet = await Wallet.create({
  identity,
  arkServerUrl: 'https://mutinynet.arkade.sh',
})
```

### HD Wallet (Mnemonic)

```typescript
import { Wallet, MnemonicIdentity } from '@arkade-os/sdk'

const identity = MnemonicIdentity.fromMnemonic(
  'your twelve word mnemonic phrase here ...'
)

const wallet = await Wallet.create({
  identity,
  arkServerUrl: 'https://mutinynet.arkade.sh',
})
```

### Watch-Only Wallet

```typescript
import { ReadonlyWallet } from '@arkade-os/sdk'

const readonlyWallet = await ReadonlyWallet.create({
  identity: await identity.toReadonly(),
  arkServerUrl: 'https://mutinynet.arkade.sh',
})

const balance = await readonlyWallet.getBalance()
```

## Core Operations

### Get Addresses

```typescript
const arkAddress = await wallet.getAddress()       // off-chain Ark address
const boardingAddress = await wallet.getBoardingAddress() // on-chain boarding
```

### Check Balance

```typescript
const balance = await wallet.getBalance()
// balance.total, balance.available, balance.settled,
// balance.preconfirmed, balance.boarding.total, balance.recoverable
```

### Send Bitcoin

```typescript
const txid = await wallet.sendBitcoin({
  address: 'ark1qq4...',
  amount: 50000, // satoshis
})
```

### Onboard (BTC to VTXO)

```typescript
import { Ramps } from '@arkade-os/sdk'
const txid = await new Ramps(wallet).onboard()
```

### Offboard (VTXO to BTC)

```typescript
import { Ramps } from '@arkade-os/sdk'
const info = await wallet.arkProvider.getInfo()
const txid = await new Ramps(wallet).offboard(onchainAddress, info.fees)
```

### VTXO Renewal

```typescript
import { VtxoManager } from '@arkade-os/sdk'
const manager = new VtxoManager(wallet, { enabled: true })
const txid = await manager.renewVtxos()
```

### Asset Management

```typescript
const result = await wallet.assetManager.issue({
  amount: 1000,
  metadata: { name: 'My Token', ticker: 'MTK', decimals: 8 },
})

await wallet.send({
  address: 'ark1qq4...',
  assets: [{ assetId: result.assetId, amount: 100 }],
})
```

## Storage Adapters

```typescript
// Browser
import { LocalStorageAdapter } from '@arkade-os/sdk/adapters/localStorage'
const storage = new LocalStorageAdapter()

// Browser / Service Worker (advanced)
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
const storage = new IndexedDBStorageAdapter('my-app', 1)

// Node.js
import { FileSystemStorageAdapter } from '@arkade-os/sdk/adapters/fileSystem'
const storage = new FileSystemStorageAdapter('./wallet-data')

// React Native
import { AsyncStorageAdapter } from '@arkade-os/sdk/adapters/asyncStorage'
const storage = new AsyncStorageAdapter()

// Pass to wallet
const wallet = await Wallet.create({ identity, arkServerUrl, storage })
```

## Service Worker

```typescript
// Main thread
import { ServiceWorkerWallet, SingleKey } from '@arkade-os/sdk'

const wallet = await ServiceWorkerWallet.setup({
  serviceWorkerPath: '/service-worker.js',
  arkServerUrl: 'https://mutinynet.arkade.sh',
  identity: SingleKey.fromHex('private_key_hex'),
})

// service-worker.js
import { Worker } from '@arkade-os/sdk'
new Worker().start()
```

## Expo / React Native

```typescript
import { Wallet, SingleKey } from '@arkade-os/sdk'
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo'

// Polyfill crypto (must be first import in app entry)
import * as Crypto from 'expo-crypto'
if (!global.crypto) global.crypto = {} as any
global.crypto.getRandomValues = Crypto.getRandomValues

const wallet = await Wallet.create({
  identity: SingleKey.fromHex(key),
  esploraUrl: 'https://mutinynet.com/api',
  arkProvider: new ExpoArkProvider('https://mutinynet.arkade.sh'),
  indexerProvider: new ExpoIndexerProvider('https://mutinynet.arkade.sh'),
})
```
