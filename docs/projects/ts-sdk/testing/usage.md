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

// arkServerUrl is optional — defaults to DEFAULT_ARKADE_SERVER_URL
// ('https://arkade.computer'). Override for non-mainnet deployments.
const wallet = await Wallet.create({ identity })

// Non-mainnet (e.g. mutinynet)
const mutinynetWallet = await Wallet.create({
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
// identity.descriptor is the wildcard template: tr([fp/86'/0'/0']xpub/0/*)

const wallet = await Wallet.create({
  identity,
  arkServerUrl: 'https://mutinynet.arkade.sh',
})
```

### HD Receive Rotation (HDDescriptorProvider)

```typescript
import { HDDescriptorProvider, MnemonicIdentity } from '@arkade-os/sdk'

const identity = MnemonicIdentity.fromMnemonic('twelve word mnemonic ...')
const provider = await HDDescriptorProvider.create(identity, walletRepository)

const d0 = await provider.getNextSigningDescriptor() // tr(.../0/0)
const d1 = await provider.getNextSigningDescriptor() // tr(.../0/1)
```

State persists under `WalletState.settings.hd` (no schema migration). Allocation is serialized across provider instances on the same repo via the shared `updateWalletState` mutex, so two callers never observe the same index.

### Watch-Only Wallet

```typescript
import { ReadonlyWallet } from '@arkade-os/sdk'

// arkServerUrl optional — defaults to https://arkade.computer (mainnet).
const readonlyWallet = await ReadonlyWallet.create({
  identity: await identity.toReadonly(),
})

const balance = await readonlyWallet.getBalance()
```

### OnchainWallet (Mainnet Default)

```typescript
import { OnchainWallet } from '@arkade-os/sdk'

// networkName is optional — defaults to DEFAULT_NETWORK_NAME ('bitcoin').
const onchain = await OnchainWallet.create(identity)

// Override for non-mainnet networks
const regtest = await OnchainWallet.create(identity, 'regtest')
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
// Asset amounts are bigint (since 0.4.23) — supplies routinely
// exceed Number.MAX_SAFE_INTEGER, so amounts must use bigint literals
// (1000n) or BigInt(...) on numbers known to fit.
const result = await wallet.assetManager.issue({
  amount: 1000n,
  metadata: { name: 'My Token', ticker: 'MTK', decimals: 8 },
})

await wallet.send({
  address: 'ark1qq4...',
  assets: [{ assetId: result.assetId, amount: 100n }],
})

// AssetManager also exposes reissue and burn — both take bigint amounts.
await wallet.assetManager.reissue({ assetId: result.assetId, amount: 500n })
await wallet.assetManager.burn({ assetId: result.assetId, amount: 50n })
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

## Onchain Providers (Esplora vs Electrum)

```typescript
import {
  EsploraProvider,
  ElectrumOnchainProvider,
  ESPLORA_URL,
  ELECTRUM_WS_URL,
  networks,
} from '@arkade-os/sdk'
import { ElectrumWS } from 'ws-electrumx-client'

// HTTP / Esplora — defaults to Ark Labs mempool deployments
const esplora = new EsploraProvider(ESPLORA_URL.bitcoin)

// WebSocket / Electrum — defaults to Ark Labs Fulcrum 2.1
const ws = new ElectrumWS(ELECTRUM_WS_URL.bitcoin)
const electrum = new ElectrumOnchainProvider(ws, networks.bitcoin)
```

`ElectrumOnchainProvider` supports atomic 1P1C TRUC relay via `broadcast_package` (Fulcrum-only) and stays compatible with electrs by avoiding `verbose` `transaction.get`. `ELECTRUM_TCP_HOST` exposes the bare hostnames for Node-side TCP transports (ports 50001/50002/50003).

## Service Worker

```typescript
// Main thread
import { ServiceWorkerWallet, SingleKey } from '@arkade-os/sdk'

// arkServerUrl optional — defaults to https://arkade.computer (mainnet).
const wallet = await ServiceWorkerWallet.setup({
  serviceWorkerPath: '/service-worker.js',
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
