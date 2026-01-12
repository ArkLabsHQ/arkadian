---
project_id: arkade-assets
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["system/architecture.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  protocol: ["system/project_overview.md", "system/architecture.md"]
  codec: ["system/architecture.md", "testing/how_to_test.md"]
  teleport: ["system/architecture.md", "testing/usage.md"]
scripts:
  build: "npm run build"
  test: "npm test"
  cli: "npm run cli"
  make_tx: "npm run make-tx"
  indexer_init: "npm run indexer:init"
  indexer_apply: "npm run indexer:apply"
  build_docs: "bash build-docs.sh"
---

# Arkade Assets — Project Index

**arkade-assets** is a UTXO-native asset protocol specification and reference implementation for Bitcoin and Ark transactions. It enables creation, transfer, and management of digital assets (fungible and non-fungible) with seamless hybrid on-chain/off-chain operation, teleport transfers for asset continuity across Ark batch swaps, and Arkade Script introspection for smart contract capabilities.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/system/` — System Architecture & Components
Core documentation about arkade-assets protocol and design:

- **${ARKADIAN_DIR}/docs/projects/arkade-assets/system/project_overview.md** — Protocol purpose, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/arkade-assets/system/architecture.md** — TLV encoding, asset groups, teleport system, and codec architecture

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/testing/` — Usage & Operations
Practical guides for using arkade-assets tools:

- **${ARKADIAN_DIR}/docs/projects/arkade-assets/testing/usage.md** — Quick start guide and common workflows
- **${ARKADIAN_DIR}/docs/projects/arkade-assets/testing/how_to_run.md** — Build instructions and CLI usage
- **${ARKADIAN_DIR}/docs/projects/arkade-assets/testing/how_to_test.md** — Running codec tests
- **${ARKADIAN_DIR}/docs/projects/arkade-assets/testing/troubleshooting.md** — Common issues and solutions

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/sop/` — Standard Operating Procedures
Step-by-step guides for development:

- **${ARKADIAN_DIR}/docs/projects/arkade-assets/sop/development-workflow.md** — Development process and contribution guidelines

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkade-assets/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Asset Identity
Every asset is uniquely identified by `AssetId: (genesis_txid, group_index)`:
- **genesis_txid**: Transaction hash where asset was first minted
- **group_index**: Index of asset group in genesis transaction

### Asset Creation Types

1. **Fresh Mint** (Asset Group omits AssetId)
   - Creates new asset in current transaction
   - AssetId becomes `(this_txid, group_index)`
   - Optionally specifies control asset for reissuance

2. **Existing Asset** (Asset Group includes AssetId)
   - References previously minted asset
   - Must satisfy balance rules (Σout ≤ Σin unless reissuing with control asset)

### Control Assets and Reissuance
- **Control Asset**: Special asset authorizing reissuance and metadata updates
- **Reissuance Rule**: If Σout > Σin, control asset MUST be present in transaction
- **Finalization**: Burning control asset permanently locks supply
- **Non-transitive**: Only direct control asset is required (not control-of-control)

### Teleport System
Commitment-based mechanism for transferring assets to external transactions:
- **Teleport Output**: Creates commitment to future spending script
- **Teleport Input**: Claims teleport with witness preimage
- **Use Case**: Asset continuity across Ark batch swaps (VTXO → VTXO)
- **Protection**: Requires confirmation depth to prevent reorg attacks

### Metadata Management
- **Genesis Metadata**: Defined at asset creation
- **Metadata Updates**: Authorized by control asset
- **Merkle Root**: Efficient on-chain verification via hash
- **Immutability**: Optional - assets can have fixed metadata

### Arkade Script
Smart contract capabilities via introspection opcodes:
- Asset group inspection and validation
- Teleport verification
- Metadata hash checking
- Cross-input/output asset lookups

---

## Quick Reference

### Build and Test
```bash
# Clone repository
git clone https://github.com/ArkLabsHQ/arkade-assets.git
cd arkade-assets

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### CLI Tools
```bash
# Initialize indexer
npm run indexer:init

# Apply block to indexer
npm run indexer:apply

# Create example transaction
npm run make-tx -- --example=A

# Build concatenated documentation
bash build-docs.sh
```

### Codec Usage (TypeScript)
```typescript
import { encodePacket, decodePacket } from './arkade-assets-codec';

// Encode asset packet
const packet = {
  groups: [
    {
      assetId: null, // Fresh mint
      controlAsset: null,
      inputs: [],
      outputs: [{ type: 'LOCAL', index: 1, amount: 1000n }]
    }
  ]
};
const encoded = encodePacket(packet);

// Decode from binary
const decoded = decodePacket(encoded);
```

---

## Architecture Overview

### Hybrid On-Chain/Off-Chain System

```
┌─────────────────────────────────────────────────────────┐
│                Arkade Asset Protocol                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Bitcoin On-Chain        ←→        Ark Off-Chain        │
│  (OP_RETURN packets)               (VTXO transfers)      │
│         ↓                                  ↓              │
│    On-Chain Indexer      ←→        Ark Signer          │
│    (Public ledger)               (Private indexer)       │
│                                                           │
│              ↕ Teleport System ↕                         │
│     (Asset continuity across boundaries)                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### TLV Encoding Structure
```
OP_RETURN <Magic: 0x41524b> <TLV_Stream>
  ├─ Type: 0x00 (Assets)
  ├─ Length: CompactSize
  └─ Value: Asset_Payload
      ├─ GroupCount: varuint
      └─ Groups[]:
          ├─ AssetId?: (txid32, gidx_u16)
          ├─ ControlAsset?: (AssetRef | null)
          ├─ Metadata?: (hash32 | inline_data)
          ├─ Inputs[]: (LOCAL | TELEPORT)
          └─ Outputs[]: (LOCAL | TELEPORT)
```

---

## Integration Points

### Ark Ecosystem
- **arkd**: Implements Arkade Assets for off-chain Ark VTXO transactions
- **wallet**: Manages user tokens and NFTs with asset protocol
- **arkade-explorer**: Visualizes and indexes assets in block explorer

### Bitcoin Layer
- **On-Chain**: Assets embedded in Bitcoin transactions via OP_RETURN
- **Indexers**: Required to track asset state across blockchain
- **Teleports**: Enable seamless on-chain ↔ off-chain asset movement

### Smart Contracts
- **Arkade Script**: Introspection opcodes for asset validation
- **Use Cases**: Conditional transfers, NFT traits, game mechanics
- **Example**: ArkadeKitties NFT breeding with genome metadata

---

## Specification Documents

The repository contains comprehensive protocol documentation:

- **arkade-assets.md**: Core specification (OP_RETURN structure, packet format, asset rules)
- **arkade-script.md**: Introspection opcodes for smart contracts
- **examples.md**: Transaction examples with diagrams
- **ArkadeKitties.md**: NFT game example with breeding mechanics

See `${ARKADE_ASSETS_REPO}/README.md` for navigation.

---

## Use Cases

1. **Stablecoins on Ark**: USDT/USDC within VTXOs with instant settlement
2. **NFT Collectibles**: ArkadeKitties with metadata-driven traits
3. **Gaming Assets**: In-game items, currencies, achievements
4. **Loyalty Points**: Redeemable tokens with controlled supply
5. **Batch Swap Continuity**: Teleport assets across VTXO batches

---

## Tools and CLI

### Codec Implementation
- **arkade-assets-codec.ts**: Encode/decode TLV packets
- **arkade-assets-codec.test.ts**: Unit tests for codec

### Transaction Tools
- **cli.ts**: Command-line interface for all operations
- **make-opreturn.ts**: Build OP_RETURN transactions
- **example-txs.ts**: Pre-built example transaction payloads

### Indexer
- **indexer.ts**: Asset state tracker for blockchain
- **node-storage.ts**: Storage abstraction layer

### Examples
- **vrf-oracle-example.ts**: VRF oracle integration for randomness

---

## Documentation Size Guidelines

To keep context lean for AI agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **testing guides**: ≤ 120 lines
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.

---

## Status

- **Maturity**: Specification and reference implementation
- **Version**: V1 (working draft)
- **Stability**: Working draft - subject to changes
- **Production**: Not production-ready - for specification and testing only
