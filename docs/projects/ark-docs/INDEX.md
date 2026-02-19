---
project_id: ark-docs
default_sections_by_intent:
  qna:        ["learn/faq/", "arkd/what-is-arkd.mdx"]
  qa:         ["wallets/", "arkd/"]
  dev:        ["arkd/", "contracts/"]
  monitoring: ["arkd/core-services/"]
aliases:
  overview: ["learn/faq/what-is-arkade.mdx", "arkd/what-is-arkd.mdx"]
  faq: ["learn/faq/"]
  security: ["learn/security/"]
  contracts: ["contracts/"]
  wallets: ["wallets/"]
  arkd: ["arkd/"]
  vtxos: ["learn/faq/what-are-vtxos.mdx"]
  pillars: ["learn/pillars/"]
scripts:
  dev: "mintlify dev"
---

# Ark Documentation — Project Index

**ark-docs** is the official documentation repository for the Ark protocol and ecosystem. It provides comprehensive documentation about Ark concepts, arkd server implementation, wallet development, smart contracts (Arkade), and security considerations.

This documentation is built with Mintlify and published at the official Ark documentation site.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ark-docs/arkd/` — Arkd Server Documentation
Documentation about the Ark server daemon (arkd):

- **what-is-arkd.mdx** — Introduction to arkd
- **components/** — Core components:
  - intent-system.mdx — Intent system architecture
  - intent-delegation.mdx — Intent delegation
  - ark-notes.mdx — Ark notes
  - arkade-psbt.mdx — Arkade-specific PSBT format
  - scheduled-session.mdx — Scheduled session mechanism
- **core-services/** — Service architecture (ark service, indexer service)
- **server-security/** — Security mechanisms (checkpoint txs, forfeit txs)
- **txs/** — Transaction types (boarding, offchain execution, onchain settlement, exiting)

### `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/` — Learning Resources
Educational content about Ark protocol:

- **faq/** — Frequently asked questions (16 entries)
  - What is Arkade, What are VTXOs, What problem does Arkade solve
  - Is Arkade a new blockchain, Is Arkade live
  - Are Arkade transactions real Bitcoin transactions
  - Who is the Arkade operator, What if operator disappears
  - Self-custody guarantees, Fees and economics
  - Application examples, Token requirements
  - Bitcoin changes needed, Batch output and settlement
  - What is Arkade Script, What is the virtual mempool
  - TEE and Arkade, How does Arkade relate to Ark protocol
  - Will Arkade work with existing Bitcoin infrastructure

- **pillars/** — Core concepts (VTXOs, batch outputs, connectors, arkade-tx, batch expiry, batch swaps, virtual mempool)

- **security/** — Security deep-dives (economic security, transaction finality, unilateral exit, liveness, advanced security, risks and limitations)

- **glossary.mdx** — Protocol terminology

### `${ARKADIAN_DIR}/docs/projects/ark-docs/contracts/` — Arkade Contracts (Stable)
Production-ready contract documentation:

- **overview.mdx** — Arkade contracts overview
- **background.mdx** — Background and motivation
- **smart-contracts-utxo.mdx** — Smart contracts on UTXO model
- **escrow.mdx** — Escrow contracts
- **lightning-swaps.mdx** — Lightning Network swaps
- **chain-swaps.mdx** — Cross-chain swaps
- **spilman-channels.mdx** — Spilman payment channels
- **oracle-dlc.mdx** — Oracle and DLC integration

### `${ARKADIAN_DIR}/docs/projects/ark-docs/experimental/` — Experimental Arkade Language
Arkade scripting language reference (experimental status):

- **overview.mdx** — Experimental Arkade overview
- **arkade-script.mdx** — Arkade scripting language
- **arkade-syntax.mdx** — Syntax reference
- **arkade-types.mdx** — Type system
- **arkade-functions.mdx** — Built-in functions
- **arkade-compiler.mdx** — Compiler documentation
- **automated-market-makers.mdx** — AMM implementations
- **non-interactive-swaps.mdx** — Non-interactive swap protocols
- **prediction-market.mdx** — Prediction markets
- **synthetic-assets.mdx** — Synthetic asset contracts

### `${ARKADIAN_DIR}/docs/projects/ark-docs/wallets/` — Wallet Development (v0.3)
Guide for building Ark wallets with TypeScript SDK v0.3:

- **v0.3/introduction.mdx** — Wallet overview
- **v0.3/setup.mdx** — Initial wallet setup
- **v0.3/ark-addresses.mdx** — Ark address format and generation
- **v0.3/balances.mdx** — Managing onchain and offchain balances
- **v0.3/receiving-payments.mdx** — Receiving Ark payments
- **v0.3/sending-payments.mdx** — Sending Ark payments
- **v0.3/settlement.mdx** — Settlement and round participation
- **v0.3/payment-history.mdx** — Transaction history management
- **v0.3/ramps.mdx** — On-ramps and off-ramps
- **v0.3/vtxo-management.mdx** — VTXO lifecycle management
- **v0.3/storage-adapters.mdx** — Storage adapter configuration
- **v0.3/service-worker.mdx** — Service worker wallet
- **v0.3/expo-react-native.mdx** — Expo/React Native support

---

## Key Concepts

### Ark Protocol
- **Off-chain scaling**: Fast, low-fee Bitcoin transactions
- **VTXOs**: Virtual Transaction Outputs (off-chain UTXOs)
- **No blockchain**: Ark is a second-layer protocol on Bitcoin, not a new chain
- **Self-custody**: Users maintain control of their funds
- **Covenantless**: No Bitcoin consensus changes required

### Arkd Server
- **Operator role**: Facilitates off-chain transactions
- **Round-based settlement**: Batch processing for efficiency
- **Intent system**: User payment intentions aggregated into rounds
- **Checkpoint transactions**: Security mechanism for liveness
- **Forfeit transactions**: Penalty mechanism for operator misbehavior

### VTXOs (Virtual Transaction Outputs)
- Off-chain representation of Bitcoin value
- Transferable without on-chain transactions
- Expire after configurable period (default: 7 days)
- Can be redeemed on-chain unilaterally
- Renewed through settlement rounds

### Security Model
- **Economic security**: Operator bonded via forfeit mechanism
- **Unilateral exit**: Users can exit without operator cooperation
- **Transaction finality**: Immediate for off-chain, standard for on-chain
- **Liveness**: Guaranteed via checkpoint transactions
- **Risks**: Operator availability, VTXO expiry management

### Arkade Contracts
- Smart contract language for Ark protocol
- UTXO-based execution model
- Support for complex contracts (escrow, swaps, AMMs, DLCs)
- Compiler to Bitcoin Script
- Future: Full programming capability on Bitcoin L2

---

## Documentation Categories

### For Users
- **Learn → FAQ**: Quick answers to common questions
- **Learn → Security**: Security guarantees and considerations
- **Wallets**: How to use Ark wallets

### For Developers
- **Arkd**: Running and operating an Ark server
- **Wallets**: Building Ark-compatible wallets
- **Contracts**: Writing Arkade smart contracts

### For Operators
- **Arkd → Server Security**: Security mechanisms and requirements
- **Arkd → Core Services**: Service architecture and APIs
- **Learn → Security**: Economic and technical security model

---

## File Organization

All documentation files use `.mdx` format (Markdown + JSX) for Mintlify rendering.

### Arkd Documentation Files
```
arkd/
├── what-is-arkd.mdx
├── components/
│   ├── intent-system.mdx
│   ├── intent-delegation.mdx
│   ├── ark-notes.mdx
│   ├── arkade-psbt.mdx
│   └── scheduled-session.mdx
├── core-services/
│   ├── overview.mdx
│   ├── ark-service.mdx
│   └── indexer-service.mdx
├── server-security/
│   ├── checkpoint-txs.mdx
│   └── forfeit-txs.mdx
└── txs/
    ├── boarding.mdx
    ├── offchain-execution.mdx
    ├── onchain-settlement.mdx
    └── exiting.mdx
```

### Learn Documentation Files
```
learn/
├── faq/  (16 entries)
│   ├── what-is-arkade.mdx
│   ├── what-are-vtxos.mdx
│   ├── what-problem-does-arkade-solve.mdx
│   ├── is-arkade-a-new-blockchain.mdx
│   ├── is-arkade-live.mdx
│   ├── are-arkade-transactions-real-bitcoin-transactions.mdx
│   ├── who-is-the-arkade-operator.mdx
│   ├── what-if-the-operator-disappears-or-acts-maliciously.mdx
│   ├── how-does-arkade-ensure-self-custody.mdx
│   ├── how-does-arkade-relate-to-ark-protocol.mdx
│   ├── what-about-the-fees.mdx
│   ├── what-kind-of-applications-can-be-built-on-arkade.mdx
│   ├── does-arkade-require-a-token.mdx
│   ├── does-arkade-require-changes-to-bitcoin.mdx
│   ├── what-is-batch-output-and-onchain-settlement.mdx
│   ├── what-is-arkade-script.mdx
│   ├── what-is-the-virtual-mempool.mdx
│   ├── whats-a-tee-and-how-does-arkade-use-it.mdx
│   └── will-arkade-work-with-existing-bitcoin-infrastructure.mdx
├── glossary.mdx
├── pillars/
│   ├── vtxos.mdx
│   ├── batch-outputs.mdx
│   ├── connectors.mdx
│   ├── arkade-tx.mdx
│   ├── batch-expiry.mdx
│   ├── batch-swaps.mdx
│   └── virtual-mempool.mdx
└── security/
    ├── economic-security.mdx
    ├── transaction-finality.mdx
    ├── unilateral-exit.mdx
    ├── liveness.mdx
    ├── advanced-security.mdx
    └── risks-limitations.mdx
```

### Contracts Documentation Files (Stable)
```
contracts/
├── overview.mdx
├── background.mdx
├── smart-contracts-utxo.mdx
├── escrow.mdx
├── lightning-swaps.mdx
├── chain-swaps.mdx
├── spilman-channels.mdx
└── oracle-dlc.mdx
```

### Experimental Arkade Language Files
```
experimental/
├── overview.mdx
├── arkade-script.mdx
├── arkade-syntax.mdx
├── arkade-types.mdx
├── arkade-functions.mdx
├── arkade-compiler.mdx
├── automated-market-makers.mdx
├── non-interactive-swaps.mdx
├── prediction-market.mdx
└── synthetic-assets.mdx
```

### Wallets Documentation Files (v0.3)
```
wallets/v0.3/
├── introduction.mdx
├── setup.mdx
├── ark-addresses.mdx
├── balances.mdx
├── receiving-payments.mdx
├── sending-payments.mdx
├── settlement.mdx
├── payment-history.mdx
├── ramps.mdx
├── vtxo-management.mdx
├── storage-adapters.mdx
├── service-worker.mdx
└── expo-react-native.mdx
```

---

## Usage with Ark Assistant

This documentation repository serves as the **knowledge base** for the Ark Q&A agent (Ark-Guru). When users ask questions about Ark protocol, the agent should:

1. **Search FAQ first**: Check `learn/faq/` for common questions
2. **Technical details**: Reference `arkd/` for server implementation details
3. **Security questions**: Use `learn/security/` for security model explanations
4. **Wallet development**: Reference `wallets/` for integration guidance
5. **Smart contracts**: Use `contracts/` for Arkade language reference
6. **Combine with code**: Cross-reference documentation with arkd codebase for accurate technical answers

### Example Agent Workflow

**User asks:** "How do VTXOs work?"

**Agent should:**
1. Read `learn/faq/what-are-vtxos.mdx` for high-level explanation
2. Read `arkd/components/ark-notes.mdx` for technical implementation
3. Read arkd code in `internal/core/domain/vtxo.go` for actual structure
4. Synthesize answer combining docs and code

**User asks:** "What happens if the operator goes offline?"

**Agent should:**
1. Read `learn/faq/what-if-the-operator-disappears-or-acts-maliciously.mdx`
2. Read `learn/security/liveness.mdx` for liveness guarantees
3. Read `arkd/server-security/checkpoint-txs.mdx` for checkpoint mechanism
4. Explain unilateral exit process

---

## Mintlify Development

To preview the documentation locally:

```bash
# Install Mintlify CLI
npm i -g mintlify

# Run development server
cd ${ARK_DOCS_REPO}
mintlify dev

# Access at http://localhost:3000
```

### Publishing

Documentation is auto-published via Mintlify GitHub App when changes are pushed to the default branch.

---

## Documentation Structure Notes

- **Conceptual docs**: `learn/` focuses on "what" and "why"
- **Implementation docs**: `arkd/` focuses on "how" (server-side)
- **Integration docs**: `wallets/` focuses on "how" (client-side)
- **Contract docs**: `contracts/` focuses on Arkade language and examples
- **Format**: All files are `.mdx` (Markdown with JSX components)
- **Audience**: Mixed (users, developers, operators)

---

## Cross-References

When answering questions, agents should cross-reference:

- **Docs ↔ Code**: Connect documentation concepts to actual implementation
- **FAQ ↔ Deep-dives**: Link simple answers to detailed security docs
- **Arkd docs ↔ Wallet docs**: Show both server and client perspectives
- **Contracts ↔ Examples**: Show language reference alongside practical examples

---

## Content Guidelines

- **Accuracy**: Documentation should reflect current implementation in arkd codebase
- **Clarity**: Explain complex concepts simply in FAQ, technically in arkd docs
- **Completeness**: Cover common questions, edge cases, and security considerations
- **Examples**: Provide code examples in contracts and wallet docs
- **Updates**: Keep synchronized with protocol and implementation changes
