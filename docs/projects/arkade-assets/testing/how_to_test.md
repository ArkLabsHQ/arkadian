# Arkade Assets — How to Test

## Running Tests

### Run All Tests
```bash
npm test
```

This executes:
1. `npm run build` - Compiles TypeScript
2. `node dist/arkade-assets-codec.test.js` - Runs codec tests

Expected output:
```
Testing Arkade Assets Codec...
✓ Encode/decode Group with LOCAL inputs/outputs
✓ Encode/decode Group with TELEPORT inputs/outputs
✓ Encode/decode Packet with multiple groups
✓ Example A: Fresh issuance with control asset
✓ Example B: Simple transfer
✓ Example C: Conditional transfer
✓ Example E: Metadata update
✓ Example F: Simple transfer variant
✓ Example G: Burn transaction
✓ Example H: Reissuance with control
✓ Example I: Multi-asset per UTXO
✓ Example J: Teleport commit
✓ Example K: Teleport claim
✓ Example L: Multi-asset per transaction

All tests passed! (14/14)
```

## Test Coverage

### Codec Tests (`arkade-assets-codec.test.ts`)

**1. Encoding/Decoding Tests**
- Variable-length integer (varuint) encoding
- Compact size encoding
- TLV record encoding/decoding
- Asset Group encoding/decoding
- Full Packet encoding/decoding

**2. Asset Group Tests**
- LOCAL inputs and outputs
- TELEPORT inputs and outputs
- AssetId encoding (present and absent for fresh mints)
- Control asset references (BY_TXID and BY_GROUP)
- Metadata encoding (hash32 and inline data)

**3. Example Transaction Tests (A-L)**

Each example validates a specific protocol feature:

**Example A: Fresh Issuance with Control**
- Tests fresh mint (assetId=null)
- Control asset reference (BY_GROUP)
- Multiple groups in single transaction
- Local inputs/outputs

**Example B: Simple Transfer**
- Tests existing asset transfer
- AssetId reference to genesis transaction
- Balance conservation (Σin = Σout)

**Example C: Conditional Transfer**
- Tests conditional spending logic
- Arkade Script integration points
- Asset validation in smart contracts

**Example E: Metadata Update**
- Tests metadata modification
- Control asset authorization
- Merkle root hash updates

**Example F: Simple Transfer (Variant)**
- Alternative transfer pattern
- Different input/output combinations

**Example G: Burn Transaction**
- Tests explicit asset burning
- Zero amount outputs
- Supply reduction

**Example H: Reissuance**
- Tests supply increase (Σout > Σin)
- Control asset requirement validation
- New token creation for existing asset

**Example I: Multi-Asset per UTXO**
- Tests multiple assets assigned to single output
- Asset co-location in UTXOs
- Cross-asset balance validation

**Example J: Teleport Commit**
- Tests TELEPORT output creation
- Commitment generation (sha256)
- Future claim setup

**Example K: Teleport Claim**
- Tests TELEPORT input processing
- Preimage validation (payment_script, nonce)
- Commitment matching

**Example L: Multi-Asset per Transaction**
- Tests multiple asset groups in single transaction
- Cross-group validation
- Complex asset operations

## Running Individual Tests

### Test Specific Example
```bash
# Build first
npm run build

# Run test file directly
node dist/arkade-assets-codec.test.js

# Or use Node.js debugger
node inspect dist/arkade-assets-codec.test.js
```

### Test Specific Functionality
Edit `tools/arkade-assets-codec.test.ts` to focus on specific tests:

```typescript
// Comment out tests you don't want to run
// testExample_A();
// testExample_B();
testExample_J(); // Only test teleport commit
testExample_K(); // Only test teleport claim
```

Then rebuild and run:
```bash
npm run build
node dist/arkade-assets-codec.test.js
```

## Manual Testing

### 1. Test Codec Encoding
```typescript
import { encodePacket, Packet } from './tools/arkade-assets-codec';

const packet: Packet = {
  groups: [
    {
      assetId: null, // Fresh mint
      controlAsset: null,
      metadata: null,
      inputs: [],
      outputs: [{ type: 'LOCAL', index: 1, amount: 1000n }]
    }
  ]
};

const encoded = encodePacket(packet);
console.log('Encoded packet:', encoded);
console.log('Hex:', Buffer.from(encoded).toString('hex'));
```

### 2. Test Codec Decoding
```typescript
import { decodePacket } from './tools/arkade-assets-codec';

const encoded = Buffer.from('...', 'hex');
const decoded = decodePacket(encoded);
console.log('Decoded packet:', JSON.stringify(decoded, null, 2));
```

### 3. Test Round-Trip Encoding
```typescript
import { encodePacket, decodePacket } from './tools/arkade-assets-codec';

const original = { /* packet definition */ };
const encoded = encodePacket(original);
const decoded = decodePacket(encoded);

// Verify equality
assert.deepEqual(original, decoded);
```

## Validation Testing

### Asset Balance Validation
Test that indexer enforces balance rules:

```typescript
// Valid transfer: Σin = Σout
const validTransfer = {
  groups: [{
    assetId: { txid: '...', gidx: 0 },
    inputs: [{ type: 'LOCAL', index: 0, amount: 500n }],
    outputs: [{ type: 'LOCAL', index: 1, amount: 500n }]
  }]
};
// Should pass validation

// Invalid transfer: Σout > Σin without control asset
const invalidTransfer = {
  groups: [{
    assetId: { txid: '...', gidx: 0 },
    inputs: [{ type: 'LOCAL', index: 0, amount: 500n }],
    outputs: [{ type: 'LOCAL', index: 1, amount: 1000n }] // Too much!
  }]
};
// Should fail validation
```

### Teleport Validation
Test teleport commitment matching:

```typescript
import crypto from 'crypto';

// Create commitment
const paymentScript = Buffer.from('...');
const nonce = crypto.randomBytes(32);
const commitment = crypto.createHash('sha256')
  .update(Buffer.concat([paymentScript, nonce]))
  .digest();

// Teleport output
const teleportOut = {
  type: 'TELEPORT',
  commitment,
  amount: 500n
};

// Teleport input (must match)
const teleportIn = {
  type: 'TELEPORT',
  paymentScript,
  nonce,
  amount: 500n
};

// Verify commitment matches
const recomputedCommitment = crypto.createHash('sha256')
  .update(Buffer.concat([teleportIn.paymentScript, teleportIn.nonce]))
  .digest();

assert(recomputedCommitment.equals(commitment));
```

## Performance Testing

### Benchmark Encoding
```typescript
import { performance } from 'perf_hooks';

const iterations = 10000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  encodePacket(testPacket);
}

const end = performance.now();
const avgTime = (end - start) / iterations;
console.log(`Average encoding time: ${avgTime.toFixed(3)}ms`);
```

### Benchmark Decoding
```typescript
const encodedPacket = encodePacket(testPacket);
const iterations = 10000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  decodePacket(encodedPacket);
}

const end = performance.now();
const avgTime = (end - start) / iterations;
console.log(`Average decoding time: ${avgTime.toFixed(3)}ms`);
```

## Integration Testing

### Test with Bitcoin Transactions
```bash
# Generate example transaction
npm run make-tx -- --example=A

# Output shows transaction structure with OP_RETURN
# Verify OP_RETURN contains magic bytes 0x41524b
```

### Test Indexer Integration
```bash
# Initialize indexer
npm run indexer:init

# Apply block with asset transactions
npm run indexer:apply

# Verify state was updated correctly
# (Check indexer-state/ directory)
```

## Debugging Failed Tests

### Enable Verbose Logging
```typescript
// In test file, add console logs
console.log('Encoding packet:', packet);
const encoded = encodePacket(packet);
console.log('Encoded bytes:', Buffer.from(encoded).toString('hex'));
const decoded = decodePacket(encoded);
console.log('Decoded packet:', decoded);
```

### Compare Hex Dumps
```typescript
// Compare encoded output with expected
const actual = Buffer.from(encodePacket(packet)).toString('hex');
const expected = '010203...'; // Known good encoding

console.log('Actual:  ', actual);
console.log('Expected:', expected);

// Find first difference
for (let i = 0; i < Math.min(actual.length, expected.length); i += 2) {
  if (actual.slice(i, i+2) !== expected.slice(i, i+2)) {
    console.log(`Mismatch at byte ${i/2}:`, actual.slice(i, i+2), 'vs', expected.slice(i, i+2));
    break;
  }
}
```

### Isolate Failing Component
```typescript
// Test individual encoding functions
const encodedVarint = encodeVarint(123);
console.log('Varint:', Buffer.from(encodedVarint).toString('hex'));

const encodedGroup = encodeGroup(testGroup);
console.log('Group:', Buffer.from(encodedGroup).toString('hex'));
```

## Continuous Integration

### Run Tests in CI
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Test Checklist

Before committing changes:
- [ ] All codec tests pass (`npm test`)
- [ ] Example transactions A-L encode/decode correctly
- [ ] Round-trip encoding preserves data
- [ ] Balance validation enforced
- [ ] Teleport commitment matching works
- [ ] No TypeScript compilation errors (`npx tsc --noEmit`)
- [ ] Code formatting is consistent
- [ ] New features have corresponding tests

## Next Steps

- Run full test suite: `npm test`
- Add new test cases in `tools/arkade-assets-codec.test.ts`
- Test integration with indexer: `npm run indexer:init && npm run indexer:apply`
- Review test results and fix failures
