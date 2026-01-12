# Arkade Assets — Project Overview

## What is Arkade Assets?

Arkade Assets is a **UTXO-native asset protocol** for Bitcoin transactions, inspired by Runes and Liquid Assets. It enables creation, transfer, and management of digital assets (both fungible tokens and NFTs) with seamless operation across Bitcoin on-chain and Ark off-chain environments.

The protocol is designed as a **specification with reference implementation**, providing complete documentation and TypeScript tooling for:
- Asset creation (fresh mints and reissuance)
- Asset transfers (local and teleport-based)
- Metadata management with Merkle verification
- Smart contract capabilities via Arkade Script introspection opcodes

## Core Purpose

Arkade Assets solves the **hybrid asset management problem** for Bitcoin and Ark:

1. **Unified Asset View**: Assets can exist both on-chain (Bitcoin UTXOs) and off-chain (Ark VTXOs) with consistent identity and state
2. **Teleport Transfers**: Commitment-based mechanism enables asset continuity across Ark batch swaps without circular dependencies
3. **UTXO-Native Design**: No off-chain indexers required within Ark - transaction parsing is sufficient for validation
4. **Smart Contract Support**: Introspection opcodes enable conditional logic and asset validation in Arkade Script

## Key Features

### Asset Management
- **Fresh Mints**: Create new assets with genesis transactions
- **Transfers**: Move assets between UTXOs/VTXOs with balance validation
- **Burns**: Explicit or implicit (missing OP_RETURN) asset destruction
- **Reissuance**: Increase supply via control asset authorization
- **Multi-Asset UTXOs**: Multiple assets per output supported

### Control Assets
- Special assets that authorize reissuance and metadata updates
- Can be issued simultaneously with controlled asset (both fresh)
- Non-transitive: Only direct control asset required
- Burning control asset finalizes supply permanently

### Teleport System
- **Teleport Outputs**: Commitment to external transaction spending script
- **Teleport Inputs**: Claim teleports with witness preimage validation
- **Use Case**: Asset continuity across Ark VTXO batch swaps
- **Protection**: Confirmation depth requirements prevent reorg attacks

### Metadata Management
- Key-value metadata maps for assets
- Genesis metadata defined at creation
- Updates authorized via control asset
- Merkle root hashing for efficient on-chain verification
- Optional immutability

### Arkade Script Integration
- Introspection opcodes for asset inspection
- Asset group validation in smart contracts
- Teleport verification capabilities
- Metadata hash checking
- Cross-input/output asset lookups

## Architecture

Arkade Assets uses **TLV (Type-Length-Value) encoding** embedded in Bitcoin OP_RETURN outputs:

```
OP_RETURN <Magic: 0x41524b> <TLV_Stream>
  └─ Type: 0x00 (Assets) → Asset_Payload
      ├─ GroupCount: varuint
      └─ Groups[]:
          ├─ AssetId?: (genesis_txid, group_index)
          ├─ ControlAsset?: AssetRef
          ├─ Metadata?: hash32 | inline_data
          ├─ Inputs[]: LOCAL | TELEPORT
          └─ Outputs[]: LOCAL | TELEPORT
```

### Hybrid Operation Model

**On-Chain (Bitcoin)**:
- Assets embedded via OP_RETURN
- Indexers track asset state across blockchain
- Public ledger of all asset movements

**Off-Chain (Ark VTXOs)**:
- Asset transfers in Ark transactions
- Ark Signer validates via TEE cosigning guard
- No indexers needed - transaction parsing suffices

**Teleport Bridge**:
- Enables seamless asset movement between layers
- Commitment-based to avoid circular dependencies
- Critical for Ark batch swap continuity

## Use Cases

### 1. Stablecoins on Ark
Issue and transfer USDT/USDC within Ark VTXOs with instant settlement and minimal fees.

### 2. NFT Collectibles
Create unique digital collectibles with rich metadata. Example: **ArkadeKitties** - breeding game with genome-driven traits.

### 3. Gaming Assets
In-game currencies, items, and achievements as transferable assets with smart contract logic.

### 4. Loyalty Points
Redeemable tokens with controlled supply and metadata updates.

### 5. Ark Batch Swaps
Maintain asset continuity when VTXOs are batched and swapped - teleport assets across batches seamlessly.

## Components

### Specification Documents
- **arkade-assets.md**: Core protocol (150+ pages with examples)
- **arkade-script.md**: Introspection opcodes for smart contracts
- **examples.md**: Transaction examples with diagrams
- **ArkadeKitties.md**: NFT game specification

### Codec Implementation (TypeScript)
- **arkade-assets-codec.ts**: Encode/decode TLV packets
- **arkade-assets-codec.test.ts**: Comprehensive unit tests

### Tools
- **cli.ts**: Command-line interface for all operations
- **make-opreturn.ts**: Transaction builder for OP_RETURN outputs
- **example-txs.ts**: Pre-built example transaction payloads
- **indexer.ts**: Asset state tracker for blockchain
- **node-storage.ts**: Storage abstraction layer

### Examples
- **vrf-oracle-example.ts**: VRF oracle integration for provable randomness

## Asset Identity Rules

Assets are identified by `AssetId: (genesis_txid, group_index)`:

- **Fresh Mint**: Asset Group omits AssetId → becomes `(this_txid, group_index)`
- **Existing Asset**: Asset Group includes AssetId → references previously minted asset

### Balance Validation
- **Normal Transfer**: Σoutputs ≤ Σinputs (conservation of supply)
- **Reissuance**: Σoutputs > Σinputs requires control asset in same transaction
- **Burn**: Missing OP_RETURN or explicit zero amounts destroy assets

## Integration Points

### Ark Ecosystem
- **arkd**: Implements protocol for off-chain VTXO transactions
- **wallet**: Manages user tokens and NFTs
- **arkade-explorer**: Visualizes and indexes assets

### Bitcoin Layer
- **On-Chain Transactions**: OP_RETURN embedding
- **Indexers**: Required for on-chain asset tracking
- **Lightning/Swaps**: Potential integration via teleports

### Smart Contracts
- **Arkade Script**: Validate asset conditions in contracts
- **Conditional Transfers**: Asset-dependent spending logic
- **NFT Traits**: Metadata-driven smart contract behavior

## Technology Stack

- **Language**: TypeScript (reference implementation)
- **Encoding**: TLV (Type-Length-Value) binary format
- **Hashing**: @noble/hashes (SHA-256, Merkle trees)
- **Cryptography**: @noble/secp256k1, sodium-plus
- **Storage**: Abstract interface (pluggable backends)

## Status

- **Version**: V1 (working draft)
- **Maturity**: Specification and reference implementation
- **Stability**: Subject to changes
- **Production**: Not production-ready - for specification and testing

## Related Specifications

- **Runes**: Inspiration for UTXO-native asset design
- **Liquid Assets**: Inspiration for protocol architecture
- **BIP322**: Generic signed message format (proof of authenticity)

## Next Steps

1. Read `system/architecture.md` for detailed technical design
2. See `testing/usage.md` for quick start guide
3. Explore `testing/how_to_test.md` for running tests
4. Review repository specs: `arkade-assets.md`, `arkade-script.md`, `examples.md`
