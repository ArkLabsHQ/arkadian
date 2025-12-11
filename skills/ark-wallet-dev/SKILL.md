# Ark Wallet Development Skill

## SKILL TYPE: Hybrid Router + Reference

This skill helps with building Ark protocol wallets. It provides quick reference for common operations and routes to detailed documentation for complex topics.

## USE WHEN

User requests related to:
- Building Ark wallets (Go or TypeScript)
- Using go-sdk or @arkade-os/sdk
- VTXO operations (send, receive, settle, redeem)
- Wallet storage backends
- Server communication (gRPC, REST)
- Key management (BIP39, BIP32)
- Lightning swaps integration
- Understanding wallet architecture

## ROUTING LOGIC

```
User Request
│
├─ Go wallet development?
│  └─ Route to: go-sdk docs
│
├─ TypeScript/React wallet?
│  └─ Route to: wallet (PWA) docs
│
├─ Lightning/swap integration?
│  └─ Route to: fulmine docs
│
├─ Protocol concepts (VTXO, rounds)?
│  └─ Route to: ark-docs + arkd
│
└─ Quick operation lookup?
   └─ Handle directly with inline reference
```

---

## WALLET DEVELOPMENT OVERVIEW

### Two SDK Options

| SDK | Language | Use Case | Package |
|-----|----------|----------|---------|
| **go-sdk** | Go | Backend services, CLI tools, servers | `github.com/arkade-os/go-sdk` |
| **@arkade-os/sdk** | TypeScript | Web apps, PWAs, React Native | `@arkade-os/sdk` |

### Core Wallet Operations

Both SDKs provide these operations:
1. **Init/Load** - Initialize new wallet or load existing
2. **Unlock/Lock** - Manage wallet encryption
3. **Receive** - Get addresses (offchain + boarding)
4. **Balance** - Check onchain + offchain balances
5. **Send** - Send offchain or onchain payments
6. **Settle** - Participate in rounds, renew VTXOs
7. **Redeem** - Exit Ark to onchain (collaborative exit)

---

## GO-SDK QUICK REFERENCE

### Installation

```go
go get github.com/arkade-os/go-sdk
import arksdk "github.com/arkade-os/go-sdk"
```

### Initialize Wallet

```go
// Create storage (in-memory for testing)
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})
if err != nil {
    return err
}

// Create client
client, err := arksdk.NewArkClient(storeSvc)
if err != nil {
    return err
}

// Initialize new wallet
err = client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "your_password",
})
```

### Load Existing Wallet

```go
// Load wallet from storage
err = client.Load(ctx, arksdk.LoadArgs{
    ClientType: arksdk.GrpcClient,
    Password:   "your_password",
})
```

### Core Operations

```go
// Unlock wallet
err = client.Unlock(ctx, password)
defer client.Lock(ctx)

// Get receive addresses (offchain + boarding)
// Returns 4 values: (onchainAddr, offchainAddr, boardingAddr, err)
_, offchainAddr, boardingAddr, err := client.Receive(ctx)

// Check balance
balance, err := client.Balance(ctx)
// balance.OnchainBalance.SpendableAmount - onchain sats
// balance.OffchainBalance.Total - offchain sats (VTXOs)

// Send offchain payment
receivers := []types.Receiver{{To: recipientAddr, Amount: amount}}
txid, err := client.SendOffChain(ctx, false, receivers)

// Collaborative exit (redeem to onchain)
txid, err := client.CollaborativeExit(ctx, onchainAddr, amount, false)

// Settle VTXOs (participate in round)
txid, err := client.Settle(ctx)
```

### Storage Backends

```go
// In-Memory (testing only)
store.Config{
    ConfigStoreType:  types.InMemoryStore,
    AppDataStoreType: types.KVStore,
}

// File-based (persistent)
store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.KVStore,
    BaseDir:          "/path/to/wallet/data",
}

// SQL-based (SQLite)
// Requires sqlc-generated code
```

### Transaction Feed (Optional)

```go
// Enable during init
client.Init(ctx, arksdk.InitArgs{
    // ...
    WithTransactionFeed: true,
})

// Listen for events
txsChan := client.GetTransactionEventChannel(ctx)
go func() {
    for txEvent := range txsChan {
        for _, tx := range txEvent.Txs {
            log.Printf("tx %s type: %s, amount: %d",
                tx.TransactionKey.String(), tx.Type, tx.Amount)
        }
    }
}()
```

---

## TYPESCRIPT SDK QUICK REFERENCE

### Installation

```bash
npm install @arkade-os/sdk
# or
pnpm add @arkade-os/sdk
```

### Initialize Wallet

```typescript
import { ArkClient, InMemoryStore } from '@arkade-os/sdk';

// Create storage
const store = new InMemoryStore();

// Create client
const client = new ArkClient(store);

// Initialize new wallet
await client.init({
  serverUrl: 'https://ark.example.com',
  password: 'your_password',
});
```

### Core Operations

```typescript
// Unlock wallet
await client.unlock(password);

// Get receive addresses
const { offchainAddress, boardingAddress } = await client.receive();

// Check balance
const balance = await client.balance();
// balance.offchain, balance.onchain

// Send offchain
const txid = await client.sendOffchain({
  address: recipientAddr,
  amount: 10000, // sats
});

// Collaborative exit
const txid = await client.collaborativeExit({
  address: onchainAddr,
  amount: 10000,
});

// Settle VTXOs
await client.settle();
```

### React Integration (PWA Wallet)

```typescript
// WalletProvider pattern
import { WalletProvider, useWallet } from '@arkade-os/sdk/react';

function App() {
  return (
    <WalletProvider serverUrl="https://ark.example.com">
      <WalletScreen />
    </WalletProvider>
  );
}

function WalletScreen() {
  const { client, isUnlocked, balance } = useWallet();

  const handleSend = async () => {
    await client.sendOffchain({ address, amount });
  };

  return (
    <div>
      <p>Balance: {balance?.offchain} sats</p>
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### Storage Options

```typescript
// In-Memory (testing)
import { InMemoryStore } from '@arkade-os/sdk';
const store = new InMemoryStore();

// IndexedDB (PWA/browser)
import { IndexedDBStore } from '@arkade-os/sdk';
const store = new IndexedDBStore('arkade-wallet');

// File (Node.js)
import { FileStore } from '@arkade-os/sdk';
const store = new FileStore('/path/to/data');
```

---

## VTXO LIFECYCLE

Understanding VTXO lifecycle is essential for wallet development:

```
1. BOARDING (onchain → offchain)
   User sends BTC to boarding address
   → Transaction confirms
   → arkd creates VTXO in next round
   → User now has offchain balance

2. SENDING (offchain transfer)
   User creates payment to another Ark address
   → Payment is instant (pre-confirmed)
   → Settles in next round

3. RECEIVING
   User provides offchain address
   → Sender creates payment
   → Receiver sees pending balance
   → Confirms after round settlement

4. SETTLING (round participation)
   User participates in settlement round
   → Old VTXOs are consumed
   → New VTXOs are created
   → Expiry extended by round_lifetime

5. REDEMPTION (offchain → onchain)
   User requests collaborative exit
   → arkd creates onchain output
   → User receives onchain BTC
   → VTXOs are consumed
```

---

## SERVER COMMUNICATION

### gRPC (Recommended)

```go
// Go SDK - gRPC client is default
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
})
```

### REST Alternative

```go
// Go SDK - REST client
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.RestClient,
    ServerUrl:  "http://localhost:7070",
})
```

### Key Endpoints

| Operation | gRPC Service | REST Endpoint |
|-----------|--------------|---------------|
| Get info | `ArkService.GetInfo` | `GET /v1/info` |
| Register inputs | `ArkService.RegisterInputs` | `POST /v1/round/register` |
| Get round | `ArkService.GetRound` | `GET /v1/round/{id}` |
| Get VTXOs | `ExplorerService.GetVtxos` | `GET /v1/vtxos/{address}` |
| Submit tx | `ArkService.SubmitTx` | `POST /v1/tx` |

---

## KEY MANAGEMENT

### BIP39 Mnemonic

Both SDKs support BIP39 seed phrases:

```go
// Go SDK - generate mnemonic
mnemonic, err := bip39.NewMnemonic(entropy)

// Go SDK - restore from mnemonic
seed := bip39.NewSeed(mnemonic, "")
masterKey, err := hdkeychain.NewMaster(seed, &chaincfg.MainNetParams)
```

```typescript
// TypeScript SDK
import { generateMnemonic, mnemonicToSeed } from '@scure/bip39';

const mnemonic = generateMnemonic();
const seed = await mnemonicToSeed(mnemonic);
```

### Address Generation

Ark uses Taproot-based addresses:

```go
// Offchain address (Ark payments)
offchainAddr, boardingAddr, err := client.Receive(ctx)
// offchainAddr: ark1...

// Boarding address (onchain → offchain)
// boardingAddr: bcrt1p... (Taproot)
```

---

## COMMON PATTERNS

### Pattern 1: Simple Wallet CLI

```go
func main() {
    ctx := context.Background()
    storeSvc, _ := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
    })
    client, _ := arksdk.NewArkClient(storeSvc)

    // Check if wallet exists
    if client.IsLoaded() {
        client.Load(ctx, arksdk.LoadArgs{Password: password})
    } else {
        client.Init(ctx, arksdk.InitArgs{
            ServerUrl: "localhost:7070",
            Password:  password,
        })
    }

    client.Unlock(ctx, password)
    defer client.Lock(ctx)

    // Use wallet...
    balance, _ := client.Balance(ctx)
    fmt.Printf("Balance: %d sats\n", balance.OffchainBalance.Total)
}
```

### Pattern 2: Concurrent Client Connections

```go
// Multiple wallets/connections
clients := make([]arksdk.ArkClient, numClients)
for i := 0; i < numClients; i++ {
    storeSvc, _ := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
        BaseDir:          fmt.Sprintf("/data/wallet_%d", i),
    })
    clients[i], _ = arksdk.NewArkClient(storeSvc)
}
```

### Pattern 3: Transaction Monitoring

```go
// Watch for incoming payments
client.Init(ctx, arksdk.InitArgs{
    WithTransactionFeed: true,
    // ...
})

txsChan := client.GetTransactionEventChannel(ctx)
go func() {
    for txEvent := range txsChan {
        for _, tx := range txEvent.Txs {
            if tx.Type == "received" {
                notifyUser(tx.Amount)
            }
        }
    }
}()
```

---

## DOCUMENTATION REFERENCES

### Go Wallet Development

| Document | Location |
|----------|----------|
| Building Wallets SOP | `${ARKADIAN_DIR}/docs/projects/go-sdk/sop/building-wallets.md` |
| API Reference | `${ARKADIAN_DIR}/docs/projects/go-sdk/system/api-reference.md` |
| Storage Backends | `${ARKADIAN_DIR}/docs/projects/go-sdk/system/storage-backends.md` |
| Examples | `${ARKADIAN_DIR}/docs/projects/go-sdk/system/examples.md` |
| Architecture | `${ARKADIAN_DIR}/docs/projects/go-sdk/system/architecture.md` |

### TypeScript Wallet Development

| Document | Location |
|----------|----------|
| SDK Integration | `${ARKADIAN_DIR}/docs/projects/wallet/system/ark-sdk-integration.md` |
| Architecture | `${ARKADIAN_DIR}/docs/projects/wallet/system/architecture.md` |
| Development Workflow | `${ARKADIAN_DIR}/docs/projects/wallet/sop/development-workflow.md` |
| Components | `${ARKADIAN_DIR}/docs/projects/wallet/system/components.md` |

### Lightning/Swap Integration

| Document | Location |
|----------|----------|
| Fulmine Overview | `${ARKADIAN_DIR}/docs/projects/fulmine/system/project_overview.md` |
| Swap System | `${ARKADIAN_DIR}/docs/projects/fulmine/system/swap-system.md` |
| VHTLC | `${ARKADIAN_DIR}/docs/projects/fulmine/system/vhtlc.md` |
| Wallet Management | `${ARKADIAN_DIR}/docs/projects/fulmine/sop/wallet-management.md` |

### Protocol Documentation

| Document | Location |
|----------|----------|
| What are VTXOs | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/faq/what-are-vtxos.mdx` |
| VTXO Deep Dive | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/pillars/vtxos.mdx` |
| Batch Outputs (Rounds) | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/pillars/batch-outputs.mdx` |
| Batch Expiry | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/pillars/batch-expiry.mdx` |
| Arkade Transactions | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/pillars/arkade-tx.mdx` |
| Security - Economic | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/security/economic-security.mdx` |
| Security - Unilateral Exit | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/security/unilateral-exit.mdx` |
| Glossary | `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/glossary.mdx` |

---

## EXAMPLE PROJECTS

### alice_to_bob (Go)

Complete end-to-end demo showing two wallets exchanging funds:

```bash
cd ${GO_SDK_REPO}/example/alice_to_bob
go run alice_to_bob.go
```

**What it demonstrates:**
- Creating two wallet clients
- Onboarding funds via boarding address
- Sending offchain payment
- Balance verification

### Arkade Wallet (TypeScript/React)

Full PWA wallet implementation:

```bash
cd ${WALLET_REPO}
pnpm install
pnpm run start
# Access at http://localhost:3002
```

**What it demonstrates:**
- React integration with @arkade-os/sdk
- IndexedDB storage with Dexie
- PWA features (offline, installable)
- Lightning swaps via Boltz

### Fulmine (Go)

Bitcoin wallet daemon with Lightning:

```bash
cd ${FULMINE_REPO}
make run
# Access at http://localhost:7001
```

**What it demonstrates:**
- Wallet daemon architecture
- REST/gRPC API design
- Boltz swap integration
- Web UI implementation

---

## TROUBLESHOOTING

### Common Issues

**"Cannot connect to Ark server"**
```go
// Verify server is running
curl http://localhost:7070/v1/info

// Check ServerUrl format
ServerUrl: "localhost:7070"     // gRPC (no protocol)
ServerUrl: "http://localhost:7070" // REST (with protocol)
```

**"Wallet not initialized"**
```go
// Check if wallet exists before loading
if client.IsLoaded() {
    client.Load(ctx, args)
} else {
    client.Init(ctx, args)
}
```

**"VTXO expired"**
```go
// Settle regularly to renew VTXOs
client.Settle(ctx)
// VTXOs have ~30 day expiry by default
```

**"Insufficient balance"**
```go
// Check both offchain and onchain
balance, _ := client.Balance(ctx)
// balance.OffchainBalance.Total - Ark VTXOs
// balance.OnchainBalance.SpendableAmount - Pending boarding
```

---

## SKILL BEHAVIOR

When invoked:

1. **Identify language/SDK**:
   - Go → go-sdk documentation
   - TypeScript → @arkade-os/sdk + wallet docs

2. **Identify operation type**:
   - Core wallet ops → Provide inline code
   - Complex integration → Route to detailed docs
   - Protocol concepts → Route to ark-docs

3. **Provide immediate value**:
   - Quick code snippets
   - Common patterns
   - Documentation links

4. **Route for details**:
   - Building wallets → `go-sdk/sop/building-wallets.md`
   - Storage backends → `go-sdk/system/storage-backends.md`
   - Lightning swaps → `fulmine/system/swap-system.md`
