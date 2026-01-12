# Arkade Assets — Architecture

## System Design

Arkade Assets implements a **hybrid on-chain/off-chain asset protocol** for Bitcoin and Ark transactions using TLV (Type-Length-Value) encoding embedded in OP_RETURN outputs. The architecture balances three critical requirements:

1. **UTXO-Native Design**: Assets are intrinsic to Bitcoin UTXOs, not external state
2. **Unified State View**: Consistent asset identity across on-chain and off-chain environments
3. **Teleport Continuity**: Seamless asset transfers across Ark batch boundaries

## Core Architecture

### TLV Encoding Layer

The protocol uses nested TLV encoding for compact binary representation:

```
Bitcoin Transaction
└─ OP_RETURN Output
   └─ scriptPubKey = OP_RETURN <Magic: 0x41524b> <TLV_Stream>
      └─ TLV Record: Type=0x00 (Assets)
         └─ Asset_Payload (TLV-encoded)
            ├─ GroupCount: varuint
            └─ Groups[]:
                ├─ AssetId?: (txid32, gidx_u16)
                ├─ ControlAsset?: AssetRef
                ├─ Metadata?: hash32 | inline_data
                ├─ InputCount: varuint
                ├─ Inputs[]: LOCAL | TELEPORT
                ├─ OutputCount: varuint
                └─ Outputs[]: LOCAL | TELEPORT
```

**Magic Bytes**: `0x41524b` ("ARK") - identifies Arkade protocol data

**Multiple OP_RETURN Handling**: Only first Type=0x00 record (by output index order) is processed. Subsequent Asset records are ignored.

### Asset Groups

An **Asset Group** represents all inputs and outputs for a single asset within a transaction:

- **AssetId**: `(genesis_txid, group_index)` - unique asset identifier
  - Omit for fresh mints → AssetId becomes `(this_txid, group_index)`
  - Include for existing assets → references prior genesis

- **ControlAsset**: Optional authorization for reissuance/metadata updates
  - Can reference another group in same transaction (fresh simultaneous mint)
  - Required when Σoutputs > Σinputs (reissuance)
  - Non-transitive: Only direct control asset needed

- **Metadata**: Asset metadata with Merkle root verification
  - Genesis metadata: Defined at asset creation
  - Updates: Authorized by control asset
  - Efficient on-chain verification via hash32

- **Inputs**: Array of `LOCAL` or `TELEPORT` inputs
  - LOCAL: `(input_index_u16, amount_u64)`
  - TELEPORT: `(payment_script, nonce, amount_u64)` - full witness preimage

- **Outputs**: Array of `LOCAL` or `TELEPORT` outputs
  - LOCAL: `(output_index_u16, amount_u64)`
  - TELEPORT: `(commitment_32, amount_u64)` - commitment only (witness not revealed)

### Asset Identity System

**Fresh Mint**: Creating new assets
```
Group: {
  assetId: null,  // Omit AssetId
  controlAsset: { BY_GROUP: 1 },  // Optional: reference control in same tx
  inputs: [],
  outputs: [{ type: 'LOCAL', index: 1, amount: 1000000n }]
}
→ Resulting AssetId: (this_txid, 0)
```

**Existing Asset Transfer**: Moving existing assets
```
Group: {
  assetId: { txid: <genesis_txid>, gidx: 0 },
  inputs: [{ type: 'LOCAL', index: 0, amount: 500n }],
  outputs: [{ type: 'LOCAL', index: 1, amount: 500n }]
}
→ Balance preserved: 500 in = 500 out
```

**Reissuance**: Increasing supply
```
Group (controlled asset): {
  assetId: { txid: <genesis_txid>, gidx: 0 },
  inputs: [{ type: 'LOCAL', index: 0, amount: 1000n }],
  outputs: [{ type: 'LOCAL', index: 1, amount: 2000n }]  // +1000 new supply
}
Group (control asset): {
  assetId: { txid: <genesis_txid>, gidx: 1 },  // Must be present
  inputs: [{ type: 'LOCAL', index: 2, amount: 1n }],
  outputs: [{ type: 'LOCAL', index: 2, amount: 1n }]
}
→ Reissuance authorized by control asset presence
```

### Teleport System Architecture

The **teleport system** solves the circular dependency problem when transferring assets across Ark batch boundaries:

**Problem**: When Ark batches VTXOs into a new on-chain transaction, asset state must transfer from old VTXOs to new VTXOs. But the new transaction's txid is needed to create the asset packet, and the asset packet is needed to finalize the transaction.

**Solution**: Commitment-based two-stage transfer:

**Stage 1: Teleport Output (Commitment)**
```
Source Transaction (Round N)
└─ Asset Group:
   └─ TELEPORT Output:
      ├─ commitment: sha256(payment_script || nonce)
      └─ amount: 1000n
```
The commitment is created without knowing the target transaction. The `payment_script` typically encodes the spending conditions for the target VTXO.

**Stage 2: Teleport Input (Claim)**
```
Target Transaction (Round N+1)
└─ Asset Group:
   └─ TELEPORT Input:
      ├─ payment_script: <spending_conditions>
      ├─ nonce: <random_bytes>
      └─ amount: 1000n
→ Indexer validates: sha256(payment_script || nonce) == commitment
```
The target transaction provides the preimage, proving it's the intended recipient.

**Confirmation Protection**: Teleport inputs require source transaction to have N confirmations before claiming (prevents reorg attacks).

### Hybrid On-Chain/Off-Chain Operation

**On-Chain (Bitcoin)**:
```
Bitcoin UTXO
├─ scriptPubKey: P2TR/P2WSH/etc
├─ value: 10000 sats
└─ OP_RETURN: Arkade Asset Packet
   └─ Asset A: 500 tokens at output 1
```
- Indexer required to track asset state
- Public ledger of all asset movements
- Full validation of asset rules by indexer

**Off-Chain (Ark VTXO)**:
```
Ark VTXO Transaction
├─ inputs: [VTXO references]
├─ outputs: [new VTXOs]
└─ OP_RETURN: Arkade Asset Packet
   └─ Asset A: 500 tokens at output 2
```
- Ark Signer validates via TEE cosigning guard
- No indexer needed - transaction parsing suffices
- Signer maintains private indexer for user

**Teleport Bridge**:
```
VTXO (Round N) → Teleport Commitment → On-Chain Batch → Teleport Claim → VTXO (Round N+1)
```
Assets seamlessly move across layer boundaries while maintaining consistent identity and state.

## Component Architecture

### 1. Codec Layer (`arkade-assets-codec.ts`)

**Responsibilities**:
- Encode/decode TLV binary format
- Parse OP_RETURN outputs
- Validate packet structure
- Handle varuint, compact size, and nested TLV

**Key Functions**:
- `encodePacket(packet: Packet): Uint8Array` - Encode to binary
- `decodePacket(data: Uint8Array): Packet` - Decode from binary
- `encodeGroup(group: Group): Uint8Array` - Encode asset group
- `decodeGroup(buffer: Uint8Array, offset: number): Group` - Decode asset group

### 2. Transaction Builder (`make-opreturn.ts`)

**Responsibilities**:
- Build Bitcoin transactions with Arkade Asset packets
- Embed OP_RETURN outputs with correct magic bytes
- Generate example transactions for testing

**Workflow**:
1. Define asset groups (fresh mints, transfers, teleports)
2. Encode packet using codec
3. Build OP_RETURN output: `OP_RETURN 0x41524b <encoded_packet>`
4. Construct full Bitcoin transaction

### 3. Indexer (`indexer.ts`)

**Responsibilities**:
- Track asset state across blockchain
- Validate asset rules (balance, control assets, teleports)
- Handle blockchain reorganizations
- Maintain UTXO set with asset balances

**State Model**:
```
IndexerState {
  utxos: Map<OutPoint, AssetBalances>
  teleports: Map<Commitment, TeleportOutput>
  confirmations: Map<TxId, BlockHeight>
}
```

**Validation Rules**:
- Balance conservation: Σinputs == Σoutputs (unless reissuing)
- Control asset presence for reissuance (Σoutputs > Σinputs)
- Teleport commitment matching for claims
- Confirmation depth for teleport inputs

### 4. CLI Tool (`cli.ts`)

**Commands**:
- `indexer init` - Initialize indexer state
- `indexer apply` - Apply block transactions to state
- `make-tx --example=<A-L>` - Generate example transactions
- `prove-ownership` - Generate BIP322 ownership proofs

### 5. Storage Layer (`node-storage.ts`)

**Abstraction**: Pluggable storage backends
- In-memory storage (testing)
- LevelDB storage (production)
- PostgreSQL storage (enterprise)

## Arkade Script Integration

Arkade Script provides **introspection opcodes** for asset validation in smart contracts:

**Asset Group Inspection**:
- `OP_INSPECTNUMASSETGROUPS` - Get group count
- `OP_INSPECTASSETGROUPASSETID k` - Get AssetId of group k
- `OP_INSPECTASSETGROUPCTRL k` - Get control AssetId (or -1)
- `OP_FINDASSETGROUPBYASSETID txid gidx` - Find group by AssetId

**Input/Output Inspection**:
- `OP_INSPECTASSETGROUPNUM k source` - Count inputs/outputs
- `OP_INSPECTASSETGROUP k j source` - Get j-th input/output data
- `OP_INSPECTASSETGROUPSUM k source` - Sum of amounts

**Metadata**:
- `OP_INSPECTASSETGROUPMETADATAHASH k source` - Get Merkle root

**Teleports**:
- `OP_INSPECTGROUPTELEPORTOUTCOUNT k` - Count teleport outputs
- `OP_INSPECTGROUPTELEPORTOUT k j` - Get j-th teleport output
- `OP_INSPECTGROUPTELEPORTINCOUNT k` - Count teleport inputs
- `OP_INSPECTGROUPTELEPORTIN k j` - Get j-th teleport input witness

**Multi-Asset UTXO Lookups**:
- `OP_INSPECTOUTASSETCOUNT o` - Number of assets at output o
- `OP_INSPECTOUTASSETAT o t` - Get t-th asset at output o
- `OP_INSPECTOUTASSETLOOKUP o txid gidx` - Lookup specific asset at output o

## Data Flow

### Fresh Mint Flow
```
1. User defines asset parameters (amount, control, metadata)
2. Codec encodes Group with assetId=null
3. Transaction builder creates OP_RETURN output
4. Transaction broadcast to Bitcoin network
5. Indexer processes transaction:
   - Assigns AssetId = (this_txid, group_index)
   - Records genesis metadata
   - Updates UTXO set with new asset balances
```

### Transfer Flow
```
1. User selects input UTXOs with asset balances
2. Codec encodes Group with existing AssetId
3. Indexer validates:
   - Input UTXOs contain claimed asset amounts
   - Σoutputs ≤ Σinputs (conservation)
   - No unauthorized reissuance
4. Transaction broadcast
5. Indexer updates UTXO set:
   - Removes spent inputs
   - Adds new output balances
```

### Teleport Flow
```
[Round N: Create Commitment]
1. User creates TELEPORT output with commitment
2. Commitment = sha256(payment_script || nonce)
3. Indexer records teleport in pending state

[Wait for confirmations...]

[Round N+1: Claim Teleport]
4. User provides payment_script and nonce in TELEPORT input
5. Indexer validates:
   - sha256(payment_script || nonce) == commitment
   - Source transaction has N confirmations
   - Amount matches
6. Asset transferred to new VTXO/UTXO
```

## Security Considerations

### Control Asset Rules
1. **No Self-Reference**: Asset cannot control itself (infinite reissuance)
2. **Single-Level Control**: Control is not transitive (prevents complex dependency chains)
3. **Burn Finalization**: Burning control asset permanently locks supply

### Teleport Protection
1. **Confirmation Depth**: Prevents reorg attacks on teleport claims
2. **Commitment Binding**: Preimage must match commitment (prevents theft)
3. **One-Time Use**: Teleport commitment can only be claimed once

### Validation Enforcement
- **On-Chain**: Indexers reject invalid transactions (no consensus)
- **Off-Chain**: Ark Signer rejects invalid transactions (TEE cosigning guard)

## Performance Characteristics

- **Encoding**: O(n) where n = total inputs + outputs across all groups
- **Decoding**: O(n) where n = encoded packet size
- **Indexer Validation**: O(m) where m = number of groups in packet
- **Multi-Asset UTXO**: Multiple assets per output with O(1) lookup by AssetId

## Technology Stack

- **TypeScript**: Reference implementation language
- **@noble/hashes**: SHA-256, Merkle tree hashing
- **@noble/secp256k1**: Elliptic curve cryptography
- **sodium-plus**: Additional crypto primitives (VRF)
- **TLV Encoding**: Compact binary format (similar to Lightning BOLT spec)

## Future Extensions

- **Confidential Assets**: Blinded amounts using Pedersen commitments
- **Partial Burns**: Burn fractions of supply without control asset
- **Atomic Swaps**: Multi-asset atomic swap contracts
- **Layer 2 Scaling**: Additional teleport mechanisms for other L2 protocols
