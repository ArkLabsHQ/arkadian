---
project_id: arkade-explorer
version: 1.1.2
last_sync_commit: cbdeba228b741868438ca4ce22fd11246dd255a4
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "system/tech-stack.md", "system/components.md", "system/integration-with-arkd.md", "testing/how_to_run.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  dev: ["sop/development-workflow.md", "system/tech-stack.md"]
  components: ["system/components.md"]
  integration: ["system/integration-with-arkd.md"]
scripts:
  dev: "pnpm dev"
  build: "pnpm build"
  lint: "pnpm lint"
  preview: "pnpm preview"
  test: "pnpm test"
---

# Arkade Explorer -- Project Index

**arkade-explorer** is a modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of batch commitment transactions, Arkade transactions, asset details, and VTXO addresses using the Arkade Indexer API. Features include smart search, VTXO tree visualization, mempool.space cross-links on commitment transactions, light/dark theme toggle, money unit display preferences, real-time activity streaming, and asset icon verification. Default network is `bitcoin`.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/` -- System Architecture & Components
Core documentation about Arkade Explorer architecture and design:

- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/project_overview.md** -- What Arkade Explorer is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/architecture.md** -- Architecture overview, component hierarchy, data flow, context providers
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/tech-stack.md** -- Technology stack details (React, TypeScript, Vite, TailwindCSS)
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/components.md** -- Component documentation and hierarchy
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/integration-with-arkd.md** -- How the explorer connects to Ark ecosystem via Indexer API

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/` -- Usage & Operations
Practical guides for using and operating Arkade Explorer:

- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/usage.md** -- Quick start guide, installation, configuration
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/how_to_run.md** -- Running the development server and builds
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/how_to_test.md** -- Testing guide (linting, type checking, manual testing)
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/troubleshooting.md** -- Common issues and solutions

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/sop/` -- Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/sop/development-workflow.md** -- Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/tasks/` -- Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/pr-report/` -- Pull Request Summaries
Analysis and summaries of pull requests.

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/change-log/` -- Sync Tracking
Documentation sync history and tracking:

- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/change-log/last-sync.txt** -- Last synced commit hash
- **${ARKADIAN_DIR}/docs/projects/arkade-explorer/change-log/SYNC_HISTORY.md** -- Sync history log

---

## Quick Reference

### Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with search, recent activity stream, and feature overview |
| `/tx/:txid` | Transaction view (auto-redirects to commitment-tx if applicable) |
| `/commitment-tx/:txid` | Batch commitment transaction details with batch list, VTXO tree, mempool.space link, and cross-links to Arkade transactions |
| `/address/:address` | Address VTXO list and stats |
| `/asset/:assetId` | Asset details page |
| `/*` | 404 Not Found page |

### Key Features

1. **Transaction Explorer** -- View batch commitment transactions with batch details, VTXO tree viewer, metadata, timestamps; on-chain inputs/outputs link to mempool.space and outputs render Bitcoin (`bc1p`/`bc1q`) addresses
2. **Cross-links** -- Commitment-tx inputs cross-link to the originating settlement commitment tx (via VTXO `settledBy`); batch outputs link to the batch root Arkade transaction
3. **Address Explorer** -- View all VTXOs for an Arkade address/script with status badges and pagination; Recoverable badge is hidden on spent VTXOs. Balance/stats drain all VTXO pages so totals are complete; VTXO list, asset balances, and tx packet groups are window-virtualized (with per-group row caps) to stay responsive on high-activity addresses
4. **Asset Explorer** -- View asset details by asset ID
5. **Smart Search** -- Auto-detect transaction IDs (64 hex chars), asset IDs (exactly 68 hex chars), outpoints (txid:vout, navigates to /tx/txid), and addresses; mobile/desktop search palette opens unconditionally
6. **Real-time Activity** -- Live activity stream on homepage via ActivityStreamContext (events typed as `batch | vtxo | transaction`)
7. **Theme Toggle** -- Light/dark theme with persistent preference via ThemeContext
8. **Money Display** -- Toggle between sats and BTC display via MoneyDisplayContext
9. **Asset Verification** -- Verified asset icon approval system via AssetIconApprovalContext
10. **Retro UI** -- Space Invaders-inspired design with purple/orange/black theme and particle effects

### Configuration

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

### API Integration

- **Indexer Client**: REST-based client using @arkade-os/sdk (`src/lib/api/indexer.ts`)
- **Pagination Helper**: Generic `fetchAllPages()` utility for paginated SDK calls
- **Server Info**: Fetched once and cached via ServerInfoContext

---

## Architecture Overview

```
arkade-explorer/
├── src/
│   ├── components/
│   │   ├── Address/          # AddressStats, VtxoList
│   │   ├── Asset/            # AssetDetails
│   │   ├── Home/             # FeatureCard, RecentActivity, StatsCard
│   │   ├── Layout/           # Header, Footer, Layout, SearchHeader
│   │   ├── NotFound/         # NotFoundPage
│   │   ├── Transaction/      # TransactionDetails, BatchList, TransactionHex, TreeViewer, VtxoTreeViewer
│   │   └── UI/               # Card, Badge, CopyButton, LoadingSpinner, SearchBar, Pagination,
│   │                         # Tooltip, Tabs, ThemeToggle, ParticleRain, MoneyDisplay,
│   │                         # MoneyUnitToggle, AssetAmountDisplay, AssetBadge, ImageLightbox
│   ├── contexts/             # React Context providers
│   │   ├── ActivityStreamContext.tsx
│   │   ├── AssetIconApprovalContext.tsx
│   │   ├── MoneyDisplayContext.tsx
│   │   ├── ServerInfoContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAssetDetails.ts
│   │   ├── useDebounce.ts
│   │   └── useRecentSearches.ts
│   ├── lib/
│   │   ├── api/              # fetchAllPages.ts (pagination helper)
│   │   ├── arkAddress.ts     # Ark address construction (P2TR + OP_RETURN)
│   │   ├── assetIconApproval.ts  # Asset icon verification logic
│   │   ├── cap-list.ts       # capList(): limit list to N items + hidden count (tested)
│   │   ├── constants.ts      # App constants
│   │   ├── debounce.ts       # Trailing-edge debounce with cancel() (tested)
│   │   ├── decode.ts         # Bitcoin decoding utilities
│   │   ├── formatters.ts     # Additional formatters
│   │   ├── utils.ts          # Core utilities (cn, formatSats, truncateHash)
│   │   ├── validation.ts     # Input validation
│   │   └── vtxo-aggregation.ts  # VTXO active/total sums, per-asset balances, page-drain predicate (tested)
│   ├── pages/                # HomePage, TransactionPage, CommitmentTxPage, AddressPage, AssetPage
│   ├── types/                # TypeScript interfaces (Vtxo, Batch, CommitmentTx, PageResponse)
│   ├── App.tsx               # Main app with routing and context providers
│   ├── index.css             # Global styles and theme
│   └── main.tsx              # Entry point
├── public/                   # Static assets
├── functions/                # Serverless functions (Netlify)
├── .env.example              # Environment variable template
├── Dockerfile                # Multi-stage Docker build (Node 22 + nginx)
├── tailwind.config.js        # Tailwind configuration with custom colors
├── vite.config.ts            # Vite configuration with git commit hash injection
├── vitest.config.ts          # Vitest config (node env, runs src/**/*.test.ts)
├── nginx.conf                # nginx config for SPA routing
├── vercel.json               # Vercel deployment config
├── netlify.toml              # Netlify deployment config
└── package.json              # Dependencies and scripts
```

---

## Related Projects

| Project | Relationship |
|---------|-------------|
| `arkd` | Server providing indexed transaction data via Arkade Indexer API |
| `arkade-assets` | Asset protocol specification; explorer displays asset details |
| `ts-sdk` / `@arkade-os/sdk` | TypeScript SDK used for API client and type definitions |
| `wallet` | Sibling PWA frontend using same @arkade-os/sdk |
| `ark-docs` | Protocol documentation reference |

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:5173)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint

# Run unit tests (Vitest)
pnpm test

# Docker (pre-built image from GHCR)
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

---

## Performance

- **Bundle Size**: ~261 KB (gzipped: ~82 KB)
- **CSS Size**: ~16 KB (gzipped: ~4 KB)
- **Build Time**: ~5-6 seconds
- **Hot Reload**: < 1 second

---

## Documentation Size Guidelines

To keep context lean for AI agents:

- **usage/how-to**: <= 100-120 lines
- **architecture**: 400-700 words
- **tech reference**: 600-1000 words
- **SOP procedures**: <= 120 lines

Keep files focused and cross-reference when needed.
