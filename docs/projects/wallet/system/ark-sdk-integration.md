# Arkade Wallet — Ark SDK Integration

This document describes how Arkade Wallet integrates with `@arkade-os/sdk` and `@arkade-os/boltz-swap` to provide Ark protocol functionality.

## SDK Overview

### @arkade-os/sdk (v0.3.1-alpha.4)

**Purpose**: JavaScript/TypeScript SDK for building Ark wallets

**Core Responsibilities**:
- Wallet initialization and key management
- VTXO tracking and lifecycle management
- Off-chain transaction construction and signing
- Communication with arkd server via gRPC-web
- Round participation and settlement handling
- Boarding address generation and monitoring

**Package Structure**:
```
@arkade-os/sdk
├── wallet         # Wallet class and methods
├── types          # TypeScript type definitions
├── grpc           # gRPC client for arkd
├── crypto         # Cryptographic utilities
└── utils          # Helper functions
```

### @arkade-os/boltz-swap (v0.2.1-alpha.4)

**Purpose**: Lightning Network swap integration via Boltz

**Core Responsibilities**:
- Submarine swap creation (on-chain → Lightning)
- Reverse submarine swap creation (Lightning → on-chain)
- Swap status monitoring
- HTLC (Hash Time-Locked Contract) handling
- Invoice generation and validation

## Wallet Initialization

### Creating a New Wallet

**Flow**:
1. Generate BIP39 mnemonic (12 or 24 words)
2. Derive master seed from mnemonic
3. Initialize ArkWallet with seed and configuration
4. Save encrypted seed to IndexedDB

**Code Example**:
```typescript
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ArkWallet } from '@arkade-os/sdk';

// Generate mnemonic
const mnemonic = generateMnemonic(wordlist, 128); // 12 words

// Convert to seed
const seed = mnemonicToSeedSync(mnemonic);

// Initialize wallet
const wallet = await ArkWallet.create({
  seed,
  network: 'testnet',
  arkdUrl: 'http://localhost:7070',
});

// Save encrypted mnemonic to IndexedDB
await db.wallets.add({
  id: wallet.id,
  network: 'testnet',
  encryptedSeed: await encryptSeed(mnemonic, userPassword),
});
```

### Restoring an Existing Wallet

**Flow**:
1. User inputs existing mnemonic
2. Validate mnemonic using BIP39
3. Derive seed and initialize wallet
4. Sync VTXOs and transaction history from arkd

**Code Example**:
```typescript
import { validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

// Validate user input
const mnemonic = userInput.trim().toLowerCase();
if (!validateMnemonic(mnemonic, wordlist)) {
  throw new Error('Invalid seed phrase');
}

// Restore wallet
const seed = mnemonicToSeedSync(mnemonic);
const wallet = await ArkWallet.create({
  seed,
  network: 'testnet',
  arkdUrl: 'http://localhost:7070',
});

// Sync from arkd
await wallet.sync();
```

## Wallet Provider Integration

### WalletProvider Context

**Purpose**: Manage wallet state globally using React Context

**Implementation**:
```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { ArkWallet } from '@arkade-os/sdk';

interface WalletContextType {
  wallet: ArkWallet | null;
  balance: { onchain: number; offchain: number };
  vtxos: VTXO[];
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;

  // Methods
  send: (params: SendParams) => Promise<string>;
  receive: (type: 'onchain' | 'offchain') => Promise<string>;
  sync: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<ArkWallet | null>(null);
  const [balance, setBalance] = useState({ onchain: 0, offchain: 0 });
  const [vtxos, setVtxos] = useState<VTXO[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize wallet from IndexedDB on mount
  useEffect(() => {
    const loadWallet = async () => {
      const walletData = await db.wallets.get(1);
      if (walletData) {
        const seed = await decryptSeed(walletData.encryptedSeed, userPassword);
        const w = await ArkWallet.create({
          seed: mnemonicToSeedSync(seed),
          network: walletData.network,
          arkdUrl: networkConfig.arkdUrl,
        });
        setWallet(w);
        await syncWallet(w);
      }
    };

    loadWallet();
  }, []);

  // Sync wallet data from arkd
  const sync = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      const balance = await wallet.getBalance();
      const vtxos = await wallet.getVTXOs();
      const txs = await wallet.getTransactions();

      setBalance(balance);
      setVtxos(vtxos);
      setTransactions(txs);

      // Update IndexedDB cache
      await db.vtxos.bulkPut(vtxos);
      await db.transactions.bulkPut(txs);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send payment
  const send = async (params: SendParams) => {
    if (!wallet) throw new Error('Wallet not initialized');

    const txid = await wallet.send(params);

    // Optimistically update UI
    await sync();

    return txid;
  };

  // Receive payment
  const receive = async (type: 'onchain' | 'offchain') => {
    if (!wallet) throw new Error('Wallet not initialized');

    if (type === 'onchain') {
      return await wallet.getBoardingAddress();
    } else {
      return await wallet.getArkAddress();
    }
  };

  const value = {
    wallet,
    balance,
    vtxos,
    transactions,
    loading,
    error: null,
    send,
    receive,
    sync,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
```

### Usage in Components

```typescript
import { useWallet } from '../providers/WalletProvider';

const SendScreen = () => {
  const { wallet, balance, send } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState(0);

  const handleSend = async () => {
    try {
      const txid = await send({
        to: recipient,
        amount,
        type: 'offchain', // or 'onchain'
      });

      alert(`Payment sent: ${txid}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <IonItem>
          <IonLabel position="stacked">Recipient</IonLabel>
          <IonInput
            value={recipient}
            onIonChange={(e) => setRecipient(e.detail.value!)}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Amount (sats)</IonLabel>
          <IonInput
            type="number"
            value={amount}
            onIonChange={(e) => setAmount(parseInt(e.detail.value!))}
          />
        </IonItem>
        <IonButton expand="block" onClick={handleSend}>
          Send
        </IonButton>
        <p>Available: {balance.offchain} sats</p>
      </IonContent>
    </IonPage>
  );
};
```

## Sending Payments

### Off-Chain Payment (Ark to Ark)

**Flow**:
1. User enters Ark address and amount
2. Wallet constructs off-chain transaction
3. Signs transaction with derived key
4. Submits intent to arkd
5. arkd includes in next round
6. Settlement confirmed, VTXOs updated

**SDK API**:
```typescript
const txid = await wallet.send({
  to: 'ark1qxyzabc123...',  // Ark address
  amount: 10000,             // sats
  type: 'offchain',
});
```

**Under the Hood**:
1. Validate recipient address format (Bech32 for Ark addresses)
2. Check sufficient offchain balance
3. Select VTXOs to spend (coin selection)
4. Construct off-chain transaction spending VTXOs
5. Sign transaction with wallet private key
6. Submit signed intent to arkd via gRPC: `SubmitIntent(intent)`
7. arkd returns intent ID
8. Wait for settlement (next round)
9. Poll arkd for new VTXOs: `GetVTXOs()`

### On-Chain Payment (Ark to Bitcoin)

**Flow**:
1. User enters Bitcoin address and amount
2. Wallet initiates redemption process
3. arkd creates redemption transaction
4. User signs redemption
5. Transaction broadcast to Bitcoin network

**SDK API**:
```typescript
const txid = await wallet.send({
  to: 'bc1qxyzabc123...',  // Bitcoin address
  amount: 100000,          // sats
  type: 'onchain',
});
```

**Under the Hood**:
1. Detect Bitcoin address (not Ark address)
2. Initiate collaborative redemption with arkd
3. arkd constructs redemption transaction
4. Wallet signs redemption
5. arkd broadcasts to Bitcoin network
6. Returns on-chain txid

## Receiving Payments

### Boarding (On-Chain to Ark)

**Flow**:
1. User requests boarding address
2. Wallet generates unique boarding address
3. Sender sends Bitcoin to boarding address
4. arkd detects on-chain payment
5. arkd includes in round, creates VTXOs for recipient

**SDK API**:
```typescript
const boardingAddress = await wallet.getBoardingAddress();

// Display to user as QR code or text
<QRCode value={boardingAddress} />
```

**Monitoring Boarding**:
```typescript
// Poll for new VTXOs
const pollForBoarding = setInterval(async () => {
  await wallet.sync();

  const newVTXOs = await wallet.getVTXOs();
  const boardingVTXO = newVTXOs.find((v) => v.boardingTxid === expectedTxid);

  if (boardingVTXO) {
    clearInterval(pollForBoarding);
    alert('Boarding complete!');
  }
}, 5000);
```

### Off-Chain Receive (Ark to Ark)

**Flow**:
1. User requests Ark address
2. Wallet derives Ark address from seed
3. Sender sends to Ark address
4. Wallet syncs and detects new VTXO

**SDK API**:
```typescript
const arkAddress = await wallet.getArkAddress();

// Display to user
<QRCode value={arkAddress} />
```

**Auto-Sync for Receives**:
```typescript
// Poll arkd every 10 seconds for new VTXOs
useEffect(() => {
  if (!wallet) return;

  const interval = setInterval(async () => {
    await wallet.sync();
  }, 10000);

  return () => clearInterval(interval);
}, [wallet]);
```

## VTXO Management

### Fetching VTXOs

```typescript
const vtxos = await wallet.getVTXOs();

// VTXO structure
interface VTXO {
  id: string;
  amount: number;          // sats
  expiry: number;          // Unix timestamp
  status: 'active' | 'expired' | 'spent';
  boardingTxid?: string;   // If from boarding
}
```

### Filtering VTXOs

```typescript
// Active VTXOs only
const activeVTXOs = vtxos.filter((v) => v.status === 'active');

// Expiring soon (within 24 hours)
const expiringSoon = vtxos.filter((v) => {
  return v.status === 'active' && v.expiry < Date.now() + 86400000;
});
```

### VTXO Renewal

VTXOs expire after a configured period (default 7 days). Before expiry, they must be renewed through a round.

**Automatic Renewal** (handled by SDK):
```typescript
// SDK automatically includes expiring VTXOs in next round
await wallet.sync();  // Triggers renewal if needed
```

**Manual Renewal**:
```typescript
const expiringVTXOs = await wallet.getExpiringVTXOs();

if (expiringVTXOs.length > 0) {
  await wallet.renewVTXOs(expiringVTXOs);
}
```

## Balance Calculation

### Offchain Balance

Sum of all active VTXOs:

```typescript
const offchainBalance = vtxos
  .filter((v) => v.status === 'active')
  .reduce((sum, v) => sum + v.amount, 0);
```

### Onchain Balance

Bitcoin balance not yet boarded to Ark:

```typescript
const onchainBalance = await wallet.getOnchainBalance();
```

**Note**: Onchain balance requires blockchain querying (via arkd or Esplora)

## Transaction History

### Fetching Transactions

```typescript
const transactions = await wallet.getTransactions();

// Transaction structure
interface Transaction {
  txid: string;
  type: 'send' | 'receive' | 'boarding' | 'redemption';
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  from?: string;
  to?: string;
}
```

### Caching Transactions

Store in IndexedDB for offline access:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

// Reactive query that auto-updates UI
const transactions = useLiveQuery(() =>
  db.transactions.orderBy('timestamp').reverse().toArray()
);
```

## Lightning Swaps (Boltz Integration)

### Submarine Swap (On-Chain → Lightning)

**Flow**:
1. User generates Lightning invoice
2. Wallet initiates submarine swap with Boltz
3. Boltz provides on-chain address
4. Wallet sends Bitcoin to address
5. Boltz pays Lightning invoice
6. Swap completes atomically via HTLC

**SDK API**:
```typescript
import { BoltzClient } from '@arkade-os/boltz-swap';

const boltz = new BoltzClient({
  url: 'https://boltz.exchange/api',
  network: 'testnet',
});

// Create submarine swap
const swap = await boltz.createSubmarineSwap({
  invoice: lightningInvoice,  // BOLT11 invoice
  refundPublicKey: wallet.getPublicKey(),
});

// Swap details
console.log('Send to:', swap.address);
console.log('Amount:', swap.expectedAmount);

// Send Bitcoin to swap address
const txid = await wallet.send({
  to: swap.address,
  amount: swap.expectedAmount,
  type: 'onchain',
});

// Monitor swap status
const status = await boltz.getSwapStatus(swap.id);
```

### Reverse Submarine Swap (Lightning → On-Chain)

**Flow**:
1. User requests reverse swap
2. Boltz generates Lightning invoice
3. User pays invoice
4. Boltz sends Bitcoin on-chain to user's address
5. Swap completes atomically

**SDK API**:
```typescript
// Create reverse swap
const swap = await boltz.createReverseSubmarineSwap({
  amount: 100000,  // sats to receive on-chain
  claimPublicKey: wallet.getPublicKey(),
  address: await wallet.getOnchainAddress(),
});

// Pay Lightning invoice
console.log('Pay invoice:', swap.invoice);

// Monitor for on-chain transaction
const status = await boltz.getSwapStatus(swap.id);
if (status === 'transaction.confirmed') {
  console.log('On-chain funds received!');
}
```

### Swap Status Monitoring

```typescript
const pollSwapStatus = async (swapId: string) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const status = await boltz.getSwapStatus(swapId);

      if (status === 'swap.completed') {
        clearInterval(interval);
        resolve(status);
      } else if (status === 'swap.failed') {
        clearInterval(interval);
        reject(new Error('Swap failed'));
      }
    }, 5000);
  });
};
```

## Error Handling

### SDK Error Types

```typescript
try {
  await wallet.send({ to: address, amount, type: 'offchain' });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    alert('Insufficient offchain balance');
  } else if (error.code === 'INVALID_ADDRESS') {
    alert('Invalid recipient address');
  } else if (error.code === 'ARKD_CONNECTION_ERROR') {
    alert('Cannot connect to arkd server');
  } else {
    alert(`Error: ${error.message}`);
  }
}
```

### Retry Logic

```typescript
const sendWithRetry = async (params: SendParams, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await wallet.send(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Performance Optimizations

### Batch Sync

Instead of syncing balance, VTXOs, and transactions separately:

```typescript
const syncAll = async () => {
  const [balance, vtxos, transactions] = await Promise.all([
    wallet.getBalance(),
    wallet.getVTXOs(),
    wallet.getTransactions(),
  ]);

  setBalance(balance);
  setVtxos(vtxos);
  setTransactions(transactions);
};
```

### Debounced Sync

Avoid excessive polling:

```typescript
import { debounce } from 'lodash';

const debouncedSync = debounce(async () => {
  await wallet.sync();
}, 5000);

// Call on user actions
useEffect(() => {
  debouncedSync();
}, [recipient, amount]);
```

### Optimistic UI Updates

Update UI immediately, confirm later:

```typescript
const optimisticSend = async (params: SendParams) => {
  // Optimistically update balance
  setBalance((prev) => ({
    ...prev,
    offchain: prev.offchain - params.amount,
  }));

  // Add pending transaction
  const pendingTx = {
    txid: 'pending',
    type: 'send',
    amount: params.amount,
    status: 'pending',
    timestamp: Date.now(),
  };
  setTransactions((prev) => [pendingTx, ...prev]);

  try {
    // Actual send
    const txid = await wallet.send(params);

    // Update with real txid
    setTransactions((prev) =>
      prev.map((tx) => (tx.txid === 'pending' ? { ...tx, txid } : tx))
    );
  } catch (error) {
    // Revert optimistic update
    await wallet.sync();
    throw error;
  }
};
```

## SDK Configuration

### Network Configuration

```typescript
const walletConfig = {
  seed: mnemonicToSeedSync(mnemonic),
  network: 'testnet',  // 'testnet' | 'mainnet' | 'signet' | 'mutinynet'
  arkdUrl: 'http://localhost:7070',
};

const wallet = await ArkWallet.create(walletConfig);
```

### Environment-Based Config

```typescript
const arkdUrl = import.meta.env.VITE_ARK_SERVER || 'http://localhost:7070';

const wallet = await ArkWallet.create({
  seed,
  network: 'testnet',
  arkdUrl,
});
```

## Testing SDK Integration

### Mocking ArkWallet

```typescript
import { vi } from 'vitest';

const mockWallet = {
  getBalance: vi.fn().mockResolvedValue({ onchain: 0, offchain: 100000 }),
  getVTXOs: vi.fn().mockResolvedValue([]),
  send: vi.fn().mockResolvedValue('mock_txid'),
  getBoardingAddress: vi.fn().mockResolvedValue('mock_boarding_address'),
  getArkAddress: vi.fn().mockResolvedValue('ark1mock...'),
};

// Use in tests
test('send payment', async () => {
  const { send } = mockWallet;

  const txid = await send({ to: 'ark1...', amount: 1000, type: 'offchain' });

  expect(txid).toBe('mock_txid');
  expect(send).toHaveBeenCalledWith({
    to: 'ark1...',
    amount: 1000,
    type: 'offchain',
  });
});
```

## SDK Version Compatibility

**Current SDK Version**: 0.3.1-alpha.4

**Breaking Changes**: SDK is in alpha, expect breaking changes between versions

**Update Strategy**:
- Pin SDK version in package.json
- Test thoroughly before upgrading
- Check release notes for migration guides

**Upgrade Example**:
```bash
pnpm update @arkade-os/sdk@latest
pnpm update @arkade-os/boltz-swap@latest

# Run tests
pnpm test

# Manual testing
pnpm start
```

## Future SDK Features

Planned features in upcoming SDK releases:

- Batch payment support (multiple recipients in one transaction)
- VTXO consolidation (merge small VTXOs)
- Advanced fee estimation
- Multi-signature wallet support
- Hardware wallet integration (via Web USB/HID)
- Improved error messages and diagnostics
