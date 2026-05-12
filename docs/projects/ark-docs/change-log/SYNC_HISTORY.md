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

## 2026-05-02 - Concepts→Core Concepts rename, Glossary as top-level tab, Wallets v0.4 prefix removed
**Commit**: `1ff89b89d4647757f6f6a460af87e62ffecb65a5`
**Previous Sync**: `ceef95bdca74b96e199dece2f90edd8390709e7d`
**Synced By**: /update-project ark-docs
**Status**: Completed

**Commits Analyzed**: 9 commits — IA tweak that renames slugs to match page titles, promotes Glossary to a top-level tab, drops the `v0.4` prefix from the latest wallet docs, and adds the corresponding `docs.json` redirects. No new pages, one deleted page.

**Renames (slugs match titles)**:
- `learn/concepts/` → `learn/core-concepts/`, with each file renamed:
  - `vtxos.mdx` → `vtxos-and-ownership.mdx`
  - `transactions.mdx` → `transactions-and-execution.mdx`
  - `settlement.mdx` → `settlement-and-finality.mdx`
  - `lifecycle.mdx` → `vtxo-lifecycle-and-liveness.mdx`
  - `security.mdx` → `security-and-trust-model.mdx`
- `learn/glossary.mdx` → `glossary.mdx` (top-level), now exposed as a dedicated **Glossary** navigation tab.
- `wallets/v0.4/*` → `wallets/*` — every page under `wallets/v0.4/{getting-started,operations,operations/assets,advanced}/` moved up one level. Page slugs no longer carry a `v0.4` segment. The Mintlify navigation still labels this version "v0.4 (Latest)" via the `version` selector.

**Deletions**:
- `learn/security/advanced-security.mdx` — last remaining file in `learn/security/`; redirected to `/learn/core-concepts/security-and-trust-model#security-stack`.

**`docs.json` redirects added (all 200-style)**:
- `/learn/glossary` → `/glossary`
- `/learn/concepts/{vtxos,transactions,settlement,lifecycle,security}` → `/learn/core-concepts/{vtxos-and-ownership,transactions-and-execution,settlement-and-finality,vtxo-lifecycle-and-liveness,security-and-trust-model}`
- All `/wallets/v0.4/...` URLs → unprefixed `/wallets/...` (verified for getting-started, operations, operations/assets, advanced).
- `/learn/pillars/*` and `/learn/security/*` redirects retargeted from old `/learn/concepts/*` to the new `/learn/core-concepts/*` slugs.
- `/learn/faq/what-about-the-fees` → `/learn/core-concepts/settlement-and-finality`.
- Minor: `/arkd/components/scheduled-session` destination prefixed with leading slash.

**Other Small Fixes**:
- Bulk typo fix: "livecycle" → "lifecycle" across 13 files (arkd components, server-security, transactions, contracts, glossary, learn/core-concepts, learn/faq, primer, wallets advanced) plus `docs.json`.
- Cross-link cleanup so all internal references hit the new slugs (35-file batches in commits 60177a1 "Match Core Concepts slug and group" and 9370b80 "Match concepts slugs and titles").
- `glossary.mdx` link sweep so the new top-level location is referenced consistently.

**Files Updated in Arkadian Registry**:
- docs/projects/ark-docs/INDEX.md
  - Frontmatter aliases: `concepts` now points to `learn/core-concepts/`; `security` points to `learn/core-concepts/security-and-trust-model.mdx`; `vtxos` updated to `learn/core-concepts/vtxos-and-ownership.mdx`; `wallets`/`assets` paths updated to drop `v0.4`; new `glossary` alias.
  - Default sections by intent updated (`learn/concepts/` → `learn/core-concepts/`, `wallets/v0.4/` → `wallets/`).
  - Directory descriptions and file trees rewritten for the renamed `core-concepts/` directory, the new top-level `glossary.mdx`, the unprefixed `wallets/` layout, and the deletion of `learn/security/`.
  - Agent workflow examples updated to point at `learn/core-concepts/vtxos-and-ownership.mdx`, `vtxo-lifecycle-and-liveness.mdx`, and `security-and-trust-model.mdx`.
- docs/INDEX.md
  - ark-docs Description rewritten for "core concepts" vocabulary and unprefixed wallet docs.
  - Key Capabilities updated: `learn/core-concepts/` listing, top-level Glossary capability added, wallets entry rephrased as "Latest, top-level `wallets/`".
  - Tags: `wallets-v0.4` → `wallets-latest`; added `core-concepts`, `glossary`.
  - Footer Last Updated 2026-05-01 → 2026-05-02, Version 1.5.6 → 1.5.7.
- docs/projects/ark-docs/change-log/last-sync.txt → 1ff89b89d4647757f6f6a460af87e62ffecb65a5
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md (this entry)

## 2026-05-12 - Hidden Reference tab with per-SDK overview pages
**Commit**: `e315c82be25d3ec8063e5ecf7d286848fa2da100`
**Previous Sync**: `1ff89b89d4647757f6f6a460af87e62ffecb65a5`
**Synced By**: /update-project ark-docs
**Status**: Completed

**Commits Analyzed**: 1 commit — `e315c82 Create hidden \`reference\` tab` (single PR).

**Structural Changes**:
- NEW directory: `reference/` with four per-SDK overview pages:
  - `reference/typescript/index.mdx` — `@arkade-os/sdk` v0.4 (Latest). Capabilities list (wallets, instant offchain payments, Arkade assets, settlement/boarding/recovery/delegation/collaborative-exit, Tapscript contracts) plus CardGroup linking to [arkade-os/ts-sdk](https://github.com/arkade-os/ts-sdk) and the generated TypeDoc at `arkade-os.github.io/ts-sdk/`. "Related Packages" section mentions `@arkade-os/boltz-swap` and `@arkade-os/wdk`.
  - `reference/rust/index.mdx` — `ark-rs` v0.9 (Latest). Capabilities include Boltz Lightning/chain-swap integration; links [arkade-os/rust-sdk](https://github.com/arkade-os/rust-sdk) and `docs.rs/ark-rs`.
  - `reference/go/index.mdx` — `arksdk` v0.9 (Latest). Links [arkade-os/go-sdk](https://github.com/arkade-os/go-sdk), `pkg.go.dev/github.com/arkade-os/go-sdk`, and `fulmine` as a related wallet daemon with built-in delegation API.
  - `reference/dotnet/index.mdx` — `NArk` NArk/1.0 (Latest). Links [arkade-os/dotnet-sdk](https://github.com/arkade-os/dotnet-sdk) and `arkade-os.github.io/dotnet-sdk/`.

**`docs.json` Changes**:
- Added a new top-level navigation entry: `{ "tab": "Reference", "hidden": true, "products": [...] }` — `hidden: true` means the tab is not surfaced in the main navigation chrome and is only reachable through a direct URL.
- Each SDK is registered as its own Mintlify **product** under the tab, with its own `versions[]` array (so the version selector is per-SDK) and a single `Setting Up` group containing the new `reference/<sdk>/index` page.
- Versions/tags declared in `docs.json`: TypeScript SDK `v0.4` (Latest, default), Rust SDK `v0.9` (Latest, default), Go SDK `v0.9` (Latest, default), .NET SDK `NArk/1.0` (Latest, default).

**Other**: No content moves, deletions, or redirects. No tooling/SEO changes.

**Files Updated in Arkadian Registry**:
- docs/projects/ark-docs/INDEX.md
  - Added "Reference Tab (Hidden)" directory section under the Directory Structure listing.
  - Added "Reference Tab (Hidden) Files" tree under the File Organization section with the per-SDK version/tag metadata.
- docs/INDEX.md
  - ark-docs Key Capabilities: added bullet for the hidden Reference tab covering TypeScript v0.4, Rust v0.9, Go v0.9, .NET NArk 1.0 with the per-product version-selector note.
  - ark-docs Tags: added `sdk-reference`, `ts-sdk`, `rust-sdk`, `go-sdk`, `dotnet-sdk`.
  - Footer Last Updated 2026-05-07 → 2026-05-12, Version 1.5.8 → 1.5.9.
- docs/projects/ark-docs/change-log/last-sync.txt → e315c82be25d3ec8063e5ecf7d286848fa2da100
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md (this entry)

