# Arkade Assets — Troubleshooting

## Build Issues

### TypeScript Compilation Errors

**Problem**: `tsc` fails with type errors

**Solution**:
```bash
# Check TypeScript version
npx tsc --version  # Should be 5.9.2+

# Run type checking
npx tsc --noEmit

# Reinstall dependencies
rm -rf node_modules/
npm install

# Rebuild
npm run build
```

### Missing Dependencies

**Problem**: `Cannot find module '@noble/hashes'`

**Solution**:
```bash
# Install dependencies
npm install

# Verify installations
npm list @noble/hashes
npm list @noble/secp256k1
npm list sodium-plus

# If still missing, install individually
npm install @noble/hashes @noble/secp256k1 sodium-plus
```

### Build Script Fails

**Problem**: `npm run build` exits with error

**Solution**:
```bash
# Clean build artifacts
rm -rf dist/

# Check tsconfig.json is valid
cat tsconfig.json

# Run build with verbose output
npm run build --verbose

# Check Node.js version
node --version  # Must be 18.0.0+
```

## Test Failures

### Codec Tests Fail

**Problem**: `npm test` shows failed assertions

**Solution**:
```bash
# Run tests with full output
npm test 2>&1 | tee test-output.txt

# Check specific test
node dist/arkade-assets-codec.test.js

# Enable debug logging
export DEBUG=arkade:*
npm test
```

**Common causes**:
- Endianness issues (little-endian vs big-endian)
- Varuint encoding errors
- TLV length calculation mistakes
- AssetId serialization bugs

### Example Transaction Tests Fail

**Problem**: Specific example (A-L) fails validation

**Solution**:
```bash
# Isolate failing example
# Edit tools/arkade-assets-codec.test.ts to run only that example

# Check encoded hex output
node -e "
const { encodePacket } = require('./dist/arkade-assets-codec');
const packet = { /* example definition */ };
const encoded = encodePacket(packet);
console.log(Buffer.from(encoded).toString('hex'));
"

# Compare with expected output from specification
```

### Round-Trip Encoding Fails

**Problem**: `encode(decode(data)) !== data`

**Solution**:
```bash
# Debug encoding step
console.log('Original:', JSON.stringify(packet, null, 2));
const encoded = encodePacket(packet);
console.log('Encoded hex:', Buffer.from(encoded).toString('hex'));

# Debug decoding step
const decoded = decodePacket(encoded);
console.log('Decoded:', JSON.stringify(decoded, null, 2));

# Compare differences
const diff = deepDiff(packet, decoded);
console.log('Differences:', diff);
```

## Runtime Errors

### Out of Memory

**Problem**: Node.js runs out of memory during encoding/decoding

**Solution**:
```bash
# Increase memory limit
node --max-old-space-size=4096 dist/cli.js <command>

# Or set environment variable
export NODE_OPTIONS="--max-old-space-size=4096"
npm run cli -- <command>
```

### Invalid Packet Format

**Problem**: `decodePacket` throws "Invalid TLV format"

**Solution**:
```typescript
// Validate magic bytes
const magicBytes = data.slice(0, 3);
if (!magicBytes.equals(Buffer.from([0x41, 0x52, 0x4b]))) {
  console.error('Invalid magic bytes:', magicBytes.toString('hex'));
  console.error('Expected: 41524b (ARK)');
}

// Check TLV Type
const tlvType = data[3];
if (tlvType !== 0x00) {
  console.error('Invalid TLV type:', tlvType);
  console.error('Expected: 0x00 (Assets)');
}

// Validate length
const tlvLength = readCompactSize(data, 4);
console.log('TLV length:', tlvLength);
```

### Teleport Commitment Mismatch

**Problem**: Indexer rejects teleport claim with "Commitment mismatch"

**Solution**:
```typescript
import crypto from 'crypto';

// Recompute commitment from inputs
const computedCommitment = crypto.createHash('sha256')
  .update(Buffer.concat([paymentScript, nonce]))
  .digest();

console.log('Computed commitment:', computedCommitment.toString('hex'));
console.log('Expected commitment:', expectedCommitment.toString('hex'));

// Check if they match
if (!computedCommitment.equals(expectedCommitment)) {
  console.error('Mismatch! Check paymentScript and nonce');
}
```

## Indexer Issues

### Indexer Init Fails

**Problem**: `npm run indexer:init` errors

**Solution**:
```bash
# Check storage directory permissions
ls -la indexer-state/

# Create directory if missing
mkdir -p indexer-state/

# Check disk space
df -h

# Reset indexer state
rm -rf indexer-state/
npm run indexer:init
```

### Block Application Fails

**Problem**: `npm run indexer:apply` rejects block

**Solution**:
```bash
# Check block format
# Ensure transactions have valid Arkade Asset packets

# Verify asset balance rules
# - Σoutputs ≤ Σinputs (unless reissuing with control asset)
# - Control asset present when Σoutputs > Σinputs

# Check teleport confirmation depth
# - Source transaction must have N confirmations before claim

# Enable debug logging
export DEBUG=indexer:*
npm run indexer:apply
```

### State Corruption

**Problem**: Indexer state is inconsistent

**Solution**:
```bash
# Backup current state
cp -r indexer-state/ indexer-state.backup/

# Reset and resync from genesis
rm -rf indexer-state/
npm run indexer:init

# Reapply blocks from beginning
for height in $(seq 0 <latest_height>); do
  npm run indexer:apply -- --height=$height
done
```

## CLI Tool Issues

### Command Not Found

**Problem**: `npm run cli -- <command>` says "Unknown command"

**Solution**:
```bash
# Check available commands
npm run cli -- --help

# Verify CLI is built
ls dist/cli.js

# Rebuild if missing
npm run build

# Run directly
node dist/cli.js <command>
```

### Transaction Generation Fails

**Problem**: `npm run make-tx -- --example=A` errors

**Solution**:
```bash
# Check example exists (A-L only)
npm run make-tx -- --help

# Verify example-txs.js is built
ls dist/example-txs.js

# Run with debug logging
DEBUG=make-tx:* npm run make-tx -- --example=A

# Check output format
npm run make-tx -- --example=A | jq .
```

## Integration Issues

### Bitcoin Transaction Invalid

**Problem**: Generated transaction rejected by Bitcoin node

**Solution**:
```bash
# Check OP_RETURN size
# - Maximum 80 bytes for OP_RETURN data
# - Arkade Asset packets can be larger (use multiple outputs)

# Verify magic bytes
# - Must be 0x41524b ("ARK")

# Check TLV encoding
# - Type: 0x00
# - Length: CompactSize
# - Value: Asset_Payload
```

### Ark Signer Rejects Transaction

**Problem**: Ark Signer refuses to cosign transaction with assets

**Solution**:
```bash
# Verify asset balance rules
# - Inputs must cover outputs
# - Control asset present for reissuance

# Check VTXO references
# - All input VTXOs must exist
# - All input VTXOs must be unspent

# Validate teleport claims
# - Source transaction confirmed
# - Commitment matches preimage
```

## Protocol Validation Errors

### Control Asset Violation

**Problem**: "Control asset required for reissuance"

**Solution**:
- Reissuance (Σout > Σin) requires control asset in same transaction
- Control asset must match the one specified in genesis transaction
- Control asset cannot be the asset itself (no self-reference)

```typescript
// Correct reissuance
{
  groups: [
    // Controlled asset (increasing supply)
    {
      assetId: { txid: '...', gidx: 0 },
      inputs: [{ type: 'LOCAL', index: 0, amount: 1000n }],
      outputs: [{ type: 'LOCAL', index: 1, amount: 2000n }] // +1000
    },
    // Control asset (must be present)
    {
      assetId: { txid: '...', gidx: 1 },
      inputs: [{ type: 'LOCAL', index: 2, amount: 1n }],
      outputs: [{ type: 'LOCAL', index: 2, amount: 1n }]
    }
  ]
}
```

### Metadata Update Rejected

**Problem**: "Unauthorized metadata update"

**Solution**:
- Metadata updates require control asset in transaction
- Control asset must match the one specified at genesis
- Metadata hash must be valid sha256 (32 bytes)

### Multi-Asset Conflict

**Problem**: "Multiple assets assigned to same output with conflicting amounts"

**Solution**:
```typescript
// Ensure each asset-output pair appears only once
// Incorrect:
outputs: [
  { type: 'LOCAL', index: 1, amount: 100n }, // Asset A
  { type: 'LOCAL', index: 1, amount: 200n }  // Asset A again!
]

// Correct:
outputs: [
  { type: 'LOCAL', index: 1, amount: 300n }  // Asset A total
]
```

## Performance Issues

### Slow Encoding

**Problem**: `encodePacket` takes too long

**Solution**:
- Reduce number of groups in packet
- Minimize TELEPORT inputs (use LOCAL when possible)
- Use BY_GROUP references instead of BY_TXID for control assets

### Slow Indexer Processing

**Problem**: `indexer:apply` is slow for large blocks

**Solution**:
- Batch multiple transactions
- Use efficient storage backend (LevelDB instead of in-memory)
- Index only relevant transactions (skip non-Arkade Asset txs)

## Getting Help

### Enable Debug Logging
```bash
export DEBUG=arkade:*,indexer:*,make-tx:*
npm run <command>
```

### Collect Diagnostic Info
```bash
# Node.js version
node --version

# npm version
npm --version

# Dependency versions
npm list

# Build output
npm run build 2>&1 | tee build.log

# Test output
npm test 2>&1 | tee test.log
```

### Check Specification
Refer to repository documentation:
- `arkade-assets.md` - Core protocol rules
- `arkade-script.md` - Smart contract opcodes
- `examples.md` - Working examples

### Report Issues
When reporting issues, include:
- Node.js and npm versions
- Full error message and stack trace
- Steps to reproduce
- Relevant code snippets
- Test output
