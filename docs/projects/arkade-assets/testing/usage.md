# Arkade Assets — Usage Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/ArkLabsHQ/arkade-assets.git
cd arkade-assets

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Common Workflows

### 1. Build and Test Codec

```bash
# Compile TypeScript to JavaScript
npm run build

# Run codec tests
npm test
```

Expected output: All codec encode/decode tests pass with example transactions A-L.

### 2. Generate Example Transactions

```bash
# Generate Example A (fresh issuance with control)
npm run make-tx -- --example=A

# Generate Example B (simple transfer)
npm run make-tx -- --example=B

# Generate all examples (A through L)
for ex in A B C E F G H I J K L; do
  npm run make-tx -- --example=$ex
done
```

Example transaction types:
- **A**: Fresh issuance with control asset
- **B**: Simple transfer
- **C**: Conditional transfer
- **E**: Metadata update
- **F**: Simple transfer (variant)
- **G**: Burn transaction
- **H**: Reissuance with control asset
- **I**: Multi-asset per UTXO
- **J**: Teleport commit
- **K**: Teleport claim
- **L**: Multi-asset per transaction

### 3. Initialize and Run Indexer

```bash
# Initialize indexer state
npm run indexer:init

# Apply block transactions to indexer
npm run indexer:apply

# Check indexer state
# (State stored in ./indexer-state/ by default)
```

### 4. Build Concatenated Documentation

```bash
# Concatenate all markdown docs into single file
bash build-docs.sh

# Output: All specification documents merged for easy reading
```

### 5. Use CLI Tools

```bash
# Run CLI with help
npm run cli -- --help

# Initialize indexer via CLI
npm run cli -- indexer init

# Apply block via CLI
npm run cli -- indexer apply

# Create transaction via CLI
npm run cli -- make-tx --example=A

# Prove ownership (BIP322)
npm run prove-ownership
```

## Codec Usage (TypeScript)

### Encoding Asset Packets

```typescript
import { encodePacket, Packet } from './tools/arkade-assets-codec';

// Define packet with fresh mint
const packet: Packet = {
  groups: [
    {
      assetId: null, // Fresh mint
      controlAsset: null, // No control asset (fixed supply)
      metadata: null,
      inputs: [],
      outputs: [
        { type: 'LOCAL', index: 1, amount: 1000000n }
      ]
    }
  ]
};

// Encode to binary
const encoded = encodePacket(packet);

// Embed in OP_RETURN
const magicBytes = Buffer.from([0x41, 0x52, 0x4b]); // "ARK"
const opReturn = Buffer.concat([
  Buffer.from([0x6a]), // OP_RETURN
  Buffer.from([magicBytes.length]),
  magicBytes,
  encoded
]);
```

### Decoding Asset Packets

```typescript
import { decodePacket } from './tools/arkade-assets-codec';

// Extract from OP_RETURN output
const opReturnScript = transaction.outputs[0].scriptPubKey;

// Parse magic bytes and packet
const magicBytes = opReturnScript.slice(2, 5); // After OP_RETURN
if (!magicBytes.equals(Buffer.from([0x41, 0x52, 0x4b]))) {
  throw new Error('Invalid magic bytes');
}

// Decode packet
const packetData = opReturnScript.slice(5);
const packet = decodePacket(packetData);

// Access asset groups
packet.groups.forEach((group, index) => {
  console.log(`Group ${index}:`);
  console.log(`  AssetId: ${group.assetId ?
    `${group.assetId.txid}:${group.assetId.gidx}` :
    'FRESH MINT'}`);
  console.log(`  Inputs: ${group.inputs.length}`);
  console.log(`  Outputs: ${group.outputs.length}`);
});
```

### Creating Teleport Outputs

```typescript
import { createTeleportCommitment } from './tools/arkade-assets-codec';

// Define teleport target
const paymentScript = Buffer.from('...'); // Target spending script
const nonce = crypto.randomBytes(32);

// Create commitment
const commitment = createTeleportCommitment(paymentScript, nonce);

// Add to packet
const packet: Packet = {
  groups: [
    {
      assetId: { txid: '...', gidx: 0 },
      inputs: [{ type: 'LOCAL', index: 0, amount: 500n }],
      outputs: [
        { type: 'TELEPORT', commitment, amount: 500n }
      ]
    }
  ]
};
```

### Claiming Teleport Inputs

```typescript
// Provide preimage to claim teleport
const packet: Packet = {
  groups: [
    {
      assetId: { txid: '...', gidx: 0 },
      inputs: [
        {
          type: 'TELEPORT',
          paymentScript: Buffer.from('...'),
          nonce: Buffer.from('...'),
          amount: 500n
        }
      ],
      outputs: [{ type: 'LOCAL', index: 1, amount: 500n }]
    }
  ]
};

// Indexer validates: sha256(paymentScript || nonce) == commitment
```

## Indexer Integration

### Custom Storage Backend

```typescript
import { StorageInterface } from './tools/node-storage';

class MyStorage implements StorageInterface {
  async get(key: string): Promise<Buffer | null> {
    // Implement get
  }

  async put(key: string, value: Buffer): Promise<void> {
    // Implement put
  }

  async delete(key: string): Promise<void> {
    // Implement delete
  }
}

// Use custom storage
const indexer = new Indexer(new MyStorage());
```

### Processing Blocks

```typescript
import { Indexer } from './tools/indexer';

const indexer = new Indexer();

// Initialize
await indexer.init();

// Process block
const block = {
  height: 100,
  transactions: [/* ... */]
};

await indexer.applyBlock(block);

// Query asset state
const assetId = { txid: '...', gidx: 0 };
const balance = await indexer.getAssetBalance(assetId);
console.log(`Balance: ${balance}`);
```

## Smart Contract Examples (Arkade Script)

### Validate Asset Presence

```arkscript
// Check if output 1 has at least 1000 of asset
OP_INSPECTOUTASSETLOOKUP 1 <txid> <gidx>
1000 OP_GREATERTHANOREQUAL
OP_VERIFY
```

### Require Specific Control Asset

```arkscript
// Verify group 0 has specific control asset
OP_INSPECTASSETGROUPCTRL 0
<expected_control_txid> <expected_control_gidx>
OP_EQUALVERIFY OP_EQUALVERIFY
```

### Validate Metadata Hash

```arkscript
// Check metadata hash matches expected value
OP_INSPECTASSETGROUPMETADATAHASH 0 1  // group 0, output metadata
<expected_hash>
OP_EQUALVERIFY
```

## Troubleshooting

### Build Failures
```bash
# Clean build artifacts
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules/
npm install

# Rebuild
npm run build
```

### Test Failures
```bash
# Run tests with verbose output
npm test 2>&1 | tee test-output.txt

# Check specific test
node dist/arkade-assets-codec.test.js
```

### Indexer Issues
```bash
# Reset indexer state
rm -rf indexer-state/

# Reinitialize
npm run indexer:init
```

See `testing/troubleshooting.md` for detailed troubleshooting guide.

## Next Steps

- Read `system/architecture.md` for detailed protocol design
- Explore `testing/how_to_test.md` for comprehensive testing guide
- Review specification documents: `arkade-assets.md`, `arkade-script.md`, `examples.md`
- Study ArkadeKitties example: `ArkadeKitties.md`
