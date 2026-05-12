---
project_id: ark-docs
default_sections_by_intent:
  qna:        ["learn/faq/", "learn/core-concepts/", "arkd/what-is-arkd.mdx"]
  qa:         ["wallets/", "wallets/v0.3/", "arkd/"]
  dev:        ["arkd/", "contracts/", "wallets/"]
  monitoring: ["arkd/core-services/"]
aliases:
  overview: ["index.mdx", "primer.mdx", "arkd/what-is-arkd.mdx"]
  faq: ["learn/faq/"]
  concepts: ["learn/core-concepts/"]
  security: ["learn/core-concepts/security-and-trust-model.mdx"]
  contracts: ["contracts/"]
  wallets: ["wallets/", "wallets/v0.3/"]
  arkd: ["arkd/"]
  vtxos: ["learn/faq/what-are-vtxos.mdx", "learn/core-concepts/vtxos-and-ownership.mdx"]
  assets: ["learn/arkade-assets/", "wallets/operations/assets/"]
  glossary: ["glossary.mdx"]
scripts:
  dev: "mintlify dev"
package_manager: "pnpm@10.33.2"
seo:
  indexing: "navigable"
  v0_3_pages: "noindex"
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
  - arkade-notes.mdx — Arkade notes (renamed from ark-notes)
  - arkade-psbts.mdx — Arkade-specific PSBT format
- **core-services/** — Service architecture (ark service, indexer service, configuration)
- **server-security/** — Security mechanisms (checkpoint-transactions, forfeit-transactions)
- **transactions/** — Transaction types (boarding-arkade, offchain-execution, onchain-settlement, exiting-arkade)

### `${ARKADIAN_DIR}/docs/projects/ark-docs/learn/` — Learning Resources
Educational content about Ark protocol:

- **faq/** — Frequently asked questions (9 entries)
  - What are VTXOs, What problem does Arkade solve
  - Are Arkade transactions real Bitcoin transactions
  - Who is the Arkade operator, What if operator disappears or acts maliciously
  - How does Arkade ensure self-custody
  - What is batch output and onchain settlement
  - What is the virtual mempool
  - What's a TEE and how does Arkade use it

- **core-concepts/** — Core conceptual deep-dives (renamed from `concepts/`, page slugs match titles):
  - vtxos-and-ownership.mdx — VTXO model and ownership
  - transactions-and-execution.mdx — Arkade transaction types and the virtual mempool
  - settlement-and-finality.mdx — Batch settlement, batch outputs, batch swaps, and finality
  - vtxo-lifecycle-and-liveness.mdx — Batch/VTXO lifecycle and liveness requirements
  - security-and-trust-model.mdx — Trust model, unilateral exit, risks & limitations (replaces former `learn/security/`)

- **arkade-assets/** — Asset protocol overview:
  - overview.mdx — Arkade Assets overview
  - core-concepts.mdx — Asset core concepts

### `${ARKADIAN_DIR}/docs/projects/ark-docs/glossary.mdx` — Protocol Terminology
Top-level Glossary page (promoted from `learn/glossary.mdx` to its own top-level navigation tab).

### `${ARKADIAN_DIR}/docs/projects/ark-docs/contracts/` — Tapscript Contracts & Use Cases
Working with Tapscript and use-case contracts:

- **deep-dive.mdx** — Tapscript / contracts deep dive (replaces overview.mdx)
- **setup.mdx** — Setup
- **escrow.mdx** — Escrow contracts
- **hashlock.mdx** — Hashlock contracts
- **spilman-channel.mdx** — Spilman payment channel
- **dryja-poon-channel.mdx** — Dryja-Poon channel construction
- **lightning-swaps.mdx** — Lightning Network swaps
- **lightning-channels.mdx** — Lightning channels on Ark
- **chain-swaps.mdx** — Cross-chain swaps
- **oracle-dlc.mdx** — Oracle and DLC integration

### `${ARKADIAN_DIR}/docs/projects/ark-docs/experimental/` — Experimental Arkade Language
Arkade compiler and experimental contract patterns:

- **arkade-compiler.mdx** — Arkade compiler reference (consolidated from former arkade-script/syntax/types pages)
- **arkade-functions.mdx** — Built-in functions
- **non-interactive-swaps.mdx** — Non-interactive swap protocols

### `${ARKADIAN_DIR}/docs/projects/ark-docs/reference/` — SDK Reference (Hidden Tab)
Per-SDK overview pages exposed via a `hidden: true` **Reference** tab in `docs.json` — only reachable through a direct link, not from the main navigation. Each page lists the SDK's capabilities and links out to the upstream GitHub repo plus the canonical generated API reference:

- **typescript/index.mdx** — `@arkade-os/sdk` v0.4 (Latest). Cross-links the [arkade-os/ts-sdk](https://github.com/arkade-os/ts-sdk) repo, the generated TypeDoc at `arkade-os.github.io/ts-sdk/`, and related packages `@arkade-os/boltz-swap` and `@arkade-os/wdk`.
- **rust/index.mdx** — `ark-rs` v0.9 (Latest). Cross-links the [arkade-os/rust-sdk](https://github.com/arkade-os/rust-sdk) repo and `docs.rs/ark-rs`.
- **go/index.mdx** — `arksdk` v0.9 (Latest). Cross-links the [arkade-os/go-sdk](https://github.com/arkade-os/go-sdk) repo and `pkg.go.dev/github.com/arkade-os/go-sdk`. Also points at `fulmine` as a related wallet daemon.
- **dotnet/index.mdx** — `NArk` NArk/1.0 (Latest). Cross-links the [arkade-os/dotnet-sdk](https://github.com/arkade-os/dotnet-sdk) repo and `arkade-os.github.io/dotnet-sdk/`.

### `${ARKADIAN_DIR}/docs/projects/ark-docs/wallets/` — Wallet Development
Guide for building Ark wallets with the TypeScript SDK.

**Latest (top-level, formerly `wallets/v0.4/`)** — `wallets/`:
- **getting-started/** — introduction, developer-resources, create-your-wallet, arkade-addresses, ai-agents
- **operations/** — receiving-payments, checking-balances, sending-payments, payment-history
- **operations/assets/** — get-started, issue-assets, reissue-and-burn, send-assets, check-balance, verify-asset-metadata
- **advanced/** — ramps, settlement-process, vtxo-management, storage-adapters, service-worker, expo-react-native

The `v0.4/` prefix was dropped: the latest wallet docs now live directly under `wallets/`. Page slugs no longer carry a `v0.4` segment, and `docs.json` redirects all former `/wallets/v0.4/...` URLs to the new locations. The `version` selector in the Mintlify nav still distinguishes "v0.4 (Latest)" from "v0.3".

**v0.3 (Legacy)** — `wallets/v0.3/`:
- introduction, setup, ark-addresses, balances, receiving-payments, sending-payments, settlement, payment-history, ramps, vtxo-management, storage-adapters, service-worker, expo-react-native

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
│   ├── arkade-notes.mdx
│   └── arkade-psbts.mdx
├── core-services/
│   ├── ark-service.mdx
│   ├── indexer-service.mdx
│   └── configuration.mdx
├── server-security/
│   ├── checkpoint-transactions.mdx
│   └── forfeit-transactions.mdx
└── transactions/
    ├── boarding-arkade.mdx
    ├── offchain-execution.mdx
    ├── onchain-settlement.mdx
    └── exiting-arkade.mdx
```

### Learn Documentation Files
```
glossary.mdx              # promoted to top-level (was learn/glossary.mdx)
learn/
├── faq/  (9 entries)
│   ├── what-are-vtxos.mdx
│   ├── what-problem-does-arkade-solve.mdx
│   ├── are-arkade-transactions-real-bitcoin-transactions.mdx
│   ├── who-is-the-arkade-operator.mdx
│   ├── what-if-the-operator-disappears-or-acts-maliciously.mdx
│   ├── how-does-arkade-ensure-self-custody.mdx
│   ├── what-is-batch-output-and-onchain-settlement.mdx
│   ├── what-is-the-virtual-mempool.mdx
│   └── whats-a-tee-and-how-does-arkade-use-it.mdx
├── core-concepts/        # renamed from concepts/
│   ├── vtxos-and-ownership.mdx
│   ├── transactions-and-execution.mdx
│   ├── settlement-and-finality.mdx
│   ├── vtxo-lifecycle-and-liveness.mdx
│   └── security-and-trust-model.mdx
└── arkade-assets/
    ├── overview.mdx
    └── core-concepts.mdx
# learn/security/ has been deleted — advanced-security.mdx now redirects
# to learn/core-concepts/security-and-trust-model#security-stack.
```

### Contracts Documentation Files
```
contracts/
├── deep-dive.mdx
├── setup.mdx
├── escrow.mdx
├── hashlock.mdx
├── spilman-channel.mdx
├── dryja-poon-channel.mdx
├── lightning-swaps.mdx
├── lightning-channels.mdx
├── chain-swaps.mdx
└── oracle-dlc.mdx
```

### Experimental Arkade Language Files
```
experimental/
├── arkade-compiler.mdx
├── arkade-functions.mdx
└── non-interactive-swaps.mdx
```

### Reference Tab (Hidden) Files
```
reference/
├── typescript/index.mdx   # @arkade-os/sdk v0.4 (Latest)
├── rust/index.mdx         # ark-rs v0.9 (Latest)
├── go/index.mdx           # arksdk v0.9 (Latest)
└── dotnet/index.mdx       # NArk NArk/1.0 (Latest)
```
The Reference tab is declared `hidden: true` in `docs.json`. Each SDK is registered as a separate Mintlify "product" under the tab so the version selector is per-SDK; pages live inside a single **Setting Up** group for now.

### Shared Snippets (`snippets/`)
Reusable MDX/JSX snippets imported across pages:

- **agent-context.mdx** — `<AgentContext />` component embedded on most pages. Provides AI agents (and any LLM context-menu consumer) authoritative context about Arkade terminology and the deprecated terms list ("ASP", "Round", "Ark address" → must NOT be used).
- **outdated-version.jsx** — `<OutdatedVersion title href />` JSX component rendering a Mintlify `<Warning>` banner that links readers from a legacy page to its current version. Used on every `wallets/v0.3/*` page (which are also marked `noindex: true`).

### Wallets Documentation Files
```
wallets/
├── getting-started/        # Latest (was wallets/v0.4/getting-started/)
│   ├── introduction.mdx
│   ├── developer-resources.mdx
│   ├── create-your-wallet.mdx
│   ├── arkade-addresses.mdx
│   └── ai-agents.mdx
├── operations/             # Latest (was wallets/v0.4/operations/)
│   ├── receiving-payments.mdx
│   ├── checking-balances.mdx
│   ├── sending-payments.mdx
│   ├── payment-history.mdx
│   └── assets/
│       ├── get-started.mdx
│       ├── issue-assets.mdx
│       ├── reissue-and-burn.mdx
│       ├── send-assets.mdx
│       ├── check-balance.mdx
│       └── verify-asset-metadata.mdx
├── advanced/               # Latest (was wallets/v0.4/advanced/)
│   ├── ramps.mdx
│   ├── settlement-process.mdx
│   ├── vtxo-management.mdx
│   ├── storage-adapters.mdx
│   ├── service-worker.mdx
│   └── expo-react-native.mdx
└── v0.3/  (Legacy)
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
3. **Security questions**: Use `learn/core-concepts/security-and-trust-model.mdx` for security model explanations
4. **Wallet development**: Reference `wallets/` for integration guidance
5. **Smart contracts**: Use `contracts/` for Arkade language reference
6. **Combine with code**: Cross-reference documentation with arkd codebase for accurate technical answers

### Example Agent Workflow

**User asks:** "How do VTXOs work?"

**Agent should:**
1. Read `learn/faq/what-are-vtxos.mdx` for high-level explanation
2. Read `learn/core-concepts/vtxos-and-ownership.mdx` for the conceptual deep-dive
3. Read `arkd/components/arkade-notes.mdx` for technical implementation
4. Read arkd code in `internal/core/domain/vtxo.go` for actual structure
5. Synthesize answer combining docs and code

**User asks:** "What happens if the operator goes offline?"

**Agent should:**
1. Read `learn/faq/what-if-the-operator-disappears-or-acts-maliciously.mdx`
2. Read `learn/core-concepts/vtxo-lifecycle-and-liveness.mdx` for liveness requirements
3. Read `learn/core-concepts/security-and-trust-model.mdx` for unilateral exit and the trust model
4. Read `arkd/server-security/checkpoint-transactions.mdx` for checkpoint mechanism
5. Explain unilateral exit process

---

## Mintlify Development

The repo standardised on **pnpm** (`packageManager: "pnpm@10.33.2"` in `package.json`). The legacy `package-lock.json` has been removed in favour of `pnpm-lock.yaml`.

To preview the documentation locally:

```bash
# Install dependencies (including the local mintlify ^4.2.542)
cd ${ARK_DOCS_REPO}
pnpm install

# Run development server
pnpm dev          # equivalent to: pnpm exec mintlify dev

# Check broken links
pnpm broken-links # equivalent to: pnpm exec mintlify broken-links

# Access at http://localhost:3000
```

All wallet code samples in the docs use pnpm (`pnpm add @arkade-os/sdk`, `pnpm dlx expo install ...`, `pnpm dlx skills add ...`). Do not introduce `npm`/`npx` in new pages.

### SEO / Indexing

- `docs.json` sets `seo.indexing: "navigable"` (only pages reachable from the navigation are indexed — explicit opt-in model, replacing the old `"all"` setting).
- All `wallets/v0.3/*` pages declare `noindex: true` in their frontmatter and render the `<OutdatedVersion>` banner pointing to the corresponding `v0.4` page.

### LLM Context Menu

`docs.json` `contextual.options` exposes the documentation to the following destinations: `claude`, `chatgpt`, `grok`, `devin`, `cursor`, `vscode`, **`devin-mcp`** (newly added).

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
