# Documentation Sync History - Ark Docs

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: ``
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `/update-project ark-docs` to update after new commits

## 2026-02-19 - Full Documentation Sync
**Commit**: `a46ca41bf5934dcb0f318dcf70cfa51f77824e79`
**Previous Sync**: (none - initial baseline had no commit)
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 146 total commits (full repo history)

**Structural Changes**:
- NEW: `experimental/` directory (Arkade language reference moved from contracts/)
- NEW: `arkd/components/arkade-psbt.mdx` (Arkade-specific PSBT format)
- NEW: `arkd/components/scheduled-session.mdx` (Scheduled session mechanism)
- NEW: `contracts/spilman-channels.mdx` (Spilman payment channels)
- NEW: `wallets/v0.3/` directory (versioned wallet docs for SDK v0.3)
- NEW: `wallets/v0.3/vtxo-management.mdx`, `storage-adapters.mdx`, `service-worker.mdx`, `expo-react-native.mdx`
- NEW: `primer.mdx`, `roadmap.mdx`, `index.mdx` (top-level docs)
- MOVED: 9 files from `contracts/` to `experimental/` (arkade-script, syntax, types, functions, compiler, AMMs, non-interactive-swaps, prediction-market, synthetic-assets)
- REMOVED: `contracts/channels.mdx` (replaced by spilman-channels.mdx)
- REMOVED: `learn/faq/how-do-i-get-started-with-arkade.mdx`
- REMOVED: `learn/unused-content/intents.mdx`
- REMOVED: Old unversioned `wallets/*.mdx` files (replaced by wallets/v0.3/)

**Files Updated**:
- docs/projects/ark-docs/INDEX.md (updated directory structure and file listings)
- docs/INDEX.md (updated ark-docs capabilities)
- docs/projects/ark-docs/change-log/last-sync.txt
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md
- 21 files removed, 29 files added, 57 files unchanged

## 2026-04-29 - Documentation IA Restructure (v0.4 wallets, learn/concepts, contracts deep-dive)
**Commit**: `b65b10bc5cec4a59e4bd88c78bbb6c321dab13ee`
**Previous Sync**: `00af65a1d20a3a1ae22fa60c92a8d5fce08d5485` (per repo fast-forward; tracker file showed `a46ca41` from prior sync)
**Synced By**: /update-project ark-docs
**Status**: Completed

**Commits Analyzed**: ~95 commits — large information-architecture rewrite plus link/redirect cleanup.

**Structural Changes**:
- NEW directory: `wallets/v0.4/` becomes the latest wallet version
  - `getting-started/` (introduction, developer-resources, create-your-wallet, arkade-addresses, ai-agents)
  - `operations/` (receiving-payments, checking-balances, sending-payments, payment-history)
  - `operations/assets/` (get-started, issue-assets, reissue-and-burn, send-assets, check-balance, verify-asset-metadata)
  - `advanced/` (ramps, settlement-process, vtxo-management, storage-adapters, service-worker, expo-react-native)
- NEW directory: `learn/concepts/` (vtxos, transactions, settlement, lifecycle, security) — replaces former `learn/pillars/` and most of `learn/security/`
- NEW directory: `learn/arkade-assets/` (overview, core-concepts)
- NEW directory: `contracts/v0.3/` (legacy chain-swaps, lightning-swaps)
- NEW files: `contracts/deep-dive.mdx`, `contracts/hashlock.mdx`, `contracts/lightning-channels.mdx`, `contracts/dryja-poon-channel.mdx`
- NEW file: `arkd/core-services/configuration.mdx`

**Renames**:
- `arkd/txs/` → `arkd/transactions/` (all four files renamed: boarding → boarding-arkade, exiting → exiting-arkade, etc.)
- `arkd/server-security/checkpoint-txs.mdx` → `checkpoint-transactions.mdx`
- `arkd/server-security/forfeit-txs.mdx` → `forfeit-transactions.mdx`
- `arkd/components/ark-notes.mdx` → `arkade-notes.mdx`
- `arkd/components/arkade-psbt.mdx` → `arkade-psbts.mdx`
- `contracts/spilman-channels.mdx` → `contracts/spilman-channel.mdx`

**Deletions / Redirects** (content folded into new concepts pages or deep-dive):
- DELETED: `learn/pillars/` entirely (vtxos, batch-outputs, batch-swaps, connector-outputs, virtual-mempool, arkade-transactions, batch-expiry)
- DELETED: `learn/security/economic-security`, `transaction-finality`, `unilateral-exit`, `liveness`, `risks-limitations` — only `advanced-security.mdx` remains
- DELETED: `learn/unused-content/` (delegation, ramps, roles)
- DELETED: 10 FAQ entries (what-is-arkade, is-arkade-a-new-blockchain, is-arkade-live, how-does-arkade-relate-to-ark-protocol, what-about-the-fees, what-kind-of-applications, does-arkade-require-a-token, does-arkade-require-changes-to-bitcoin, what-is-arkade-script, will-arkade-work-with-existing-bitcoin-infrastructure) — FAQ count goes 16 → 9
- DELETED: `arkd/components/scheduled-session.mdx`
- DELETED: `contracts/overview.mdx`, `contracts/background.mdx`, `contracts/smart-contracts-utxo.mdx` (replaced by deep-dive.mdx)
- DELETED: `experimental/overview.mdx`, `arkade-script.mdx`, `arkade-syntax.mdx`, `arkade-types.mdx`, `automated-market-makers.mdx`, `prediction-market.mdx`, `synthetic-assets.mdx` — only arkade-compiler, arkade-functions, non-interactive-swaps remain
- DELETED: `sdk-reference/rust/lightning.mdx`, `llms.txt` override
- DELETED: ~30 unused images (ark/, sequence-diagrams/, hero-*, checkpoint-txs/) and Geist/TT_Firs_Neue self-hosted fonts (now hosted externally)

**Other Changes**:
- `docs.json` LLM context menu: added options for Claude, ChatGPT, Grok, Devin, Cursor, VSCode
- Replaced favicons with brand-kit versions
- Added local preview scripts/packages (`package.json`, `package-lock.json`)
- Bulk link updates across pillars→concepts, arkade-syntax→arkade-compiler, removed mentions of "Arkade notes" from menu, "operators"→"the operator", code-snippet refreshes (lightning-swaps, hash160 from scure)

**Files Updated in Arkadian Registry**:
- docs/projects/ark-docs/INDEX.md (frontmatter aliases, directory structure, file trees, agent workflow examples)
- docs/INDEX.md (ark-docs Description, Key Capabilities, Tags; Last Updated/Version bump)
- docs/projects/ark-docs/change-log/last-sync.txt → b65b10bc5cec4a59e4bd88c78bbb6c321dab13ee
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md (this entry)
