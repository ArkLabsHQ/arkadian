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

## 2026-05-01 - Tooling switch to pnpm + SEO/snippets cleanup
**Commit**: `ceef95bdca74b96e199dece2f90edd8390709e7d`
**Previous Sync**: `b65b10bc5cec4a59e4bd88c78bbb6c321dab13ee`
**Synced By**: /update-project ark-docs
**Status**: Completed

**Commits Analyzed**: 17 commits, all small/cosmetic — no new pages, no removed pages aside from two legacy v0.3 contract files.

**Tooling**:
- Switched the repo to **pnpm**: `package.json` now declares `"packageManager": "pnpm@10.33.2"`, `package-lock.json` removed (-13,992 lines), `pnpm-lock.yaml` added (+8,778 lines).
- Bumped `mintlify` ^4.2.489 → ^4.2.542.
- Bulk-replaced `npm install` / `npx ...` with `pnpm add` / `pnpm dlx ...` across all wallet pages (v0.3 setup, v0.3 expo-react-native, v0.4 create-your-wallet, v0.4 advanced/expo-react-native, v0.4 getting-started/ai-agents).

**Snippets / Reusable Components** (NEW directory `snippets/`):
- NEW: `snippets/agent-context.mdx` — `<AgentContext />` MDX snippet inside `<Visibility for="agents">`. Asserts that the docs site is the authoritative source and lists deprecated terms (ASP, Round, Ark address, Arkoor, etc.) that AI agents must NOT use. Imported across virtually every page (~70 pages updated to `import AgentContext from "/snippets/agent-context.mdx"; <AgentContext />`).
- NEW: `snippets/outdated-version.jsx` — `<OutdatedVersion title href />` JSX component (Mintlify `<Warning>` banner) that links readers from a legacy v0.3 page to its v0.4 equivalent. Imported on every `wallets/v0.3/*.mdx` page (13 pages).
- Earlier-in-PR iterations went through MDX snippet → JSX-component refactors (commits "Use JSX component (links don't work with snippets)", "Use arrow function for JSX snippet", "Move to snippets", "Don't include snippet header in TOC", "Fix unnecessary spacing", "Use `title` not `alt` for link"). Net result is the two files above.

**SEO**:
- `docs.json` `seo.indexing` changed `"all"` → `"navigable"` — only pages reachable from the navigation are indexed.
- Every `wallets/v0.3/*.mdx` page now sets `noindex: true` in frontmatter and renders `<OutdatedVersion>` (explicit opt-out for legacy SDK pages).

**LLM context menu**:
- `docs.json` `contextual.options` adds `"devin-mcp"` (full set: claude, chatgpt, grok, devin, cursor, vscode, devin-mcp).

**Deletions**:
- DELETED: `contracts/v0.3/chain-swaps.mdx`, `contracts/v0.3/lightning-swaps.mdx` (legacy versions, the v0.3 directory is now empty/gone). Current swap docs live at `contracts/chain-swaps.mdx` and `contracts/lightning-swaps.mdx`.

**Glossary** (`learn/glossary.mdx`):
- Removed the **"Ark Protocol"** entry (small wording cleanup; `ArkService` description switched "Ark protocol" → "Arkade protocol" for consistency).

**Other Small Fixes**:
- `wallets/v0.4/getting-started/create-your-wallet.mdx`: link `alt=` → `title=` (correct anchor attribute).
- A "Fix render issue" / "Fix API ref link" pair (small render and link fixes).

**Files Updated in Arkadian Registry**:
- docs/projects/ark-docs/INDEX.md
  - Frontmatter: added `package_manager: "pnpm@10.33.2"` and `seo.indexing: "navigable"` / `seo.v0_3_pages: "noindex"`.
  - Removed `contracts/v0.3/` from the directory listing and contracts file tree (directory deleted in repo).
  - Added a new "Shared Snippets" section describing `agent-context.mdx` and `outdated-version.jsx`.
  - Rewrote the "Mintlify Development" section to use pnpm (`pnpm install`, `pnpm dev`, `pnpm broken-links`) and added "SEO / Indexing" + "LLM Context Menu" subsections.
- docs/INDEX.md
  - ark-docs Key Capabilities: LLM context menu list extended with **Devin MCP**; added bullets for snippets, SEO/`navigable` indexing, and pnpm-based tooling/Mintlify version.
  - ark-docs Tags: added `pnpm`, `devin-mcp`, `snippets`, `seo-navigable`.
  - Footer Last Updated 2026-04-30 → 2026-05-01, Version 1.5.5 → 1.5.6.
- docs/projects/ark-docs/change-log/last-sync.txt → ceef95bdca74b96e199dece2f90edd8390709e7d
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md (this entry)

