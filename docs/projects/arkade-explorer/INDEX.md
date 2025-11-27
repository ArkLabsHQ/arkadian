---
project_id: arkade-explorer
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "system/tech-stack.md", "system/components.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  dev: "npm run dev"
  build: "npm run build"
  lint: "npm run lint"
  preview: "npm run preview"
---

# Arkade Explorer - Project Index

**arkade-explorer** is a modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of commitment transactions, Arkade transactions, and VTXO addresses using the Arkade Indexer API.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/system/` - System Architecture & Components
Core documentation about Arkade Explorer architecture and design:

- **system/project_overview.md** - What Arkade Explorer is, features, and use cases
- **system/architecture.md** - Architecture overview, component hierarchy, data flow
- **system/tech-stack.md** - Technology stack details (React, TypeScript, Vite, TailwindCSS)
- **system/components.md** - Component documentation and hierarchy

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/testing/` - Usage & Operations
Practical guides for using and operating Arkade Explorer:

- **testing/usage.md** - Quick start guide, installation, configuration
- **testing/how_to_run.md** - Running the development server and builds
- **testing/how_to_test.md** - Testing guide (linting, type checking)
- **testing/troubleshooting.md** - Common issues and solutions

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/sop/` - Standard Operating Procedures
Step-by-step guides for operations.

### `${ARKADIAN_DIR}/docs/projects/arkade-explorer/tasks/` - Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` - Recent Changes
Curated summaries of significant changes.

### `pr-report/` - Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

### Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with search and features |
| `/tx/:txid` | Transaction view (auto-redirects to commitment-tx) |
| `/commitment-tx/:txid` | Commitment transaction details |
| `/address/:address` | Address VTXO list and stats |
| `/*` | 404 Not Found page |

### Key Features

1. **Transaction Explorer** - View commitment transactions with batch details, metadata, timestamps
2. **Address Explorer** - View all VTXOs for an address/script with status badges
3. **Smart Search** - Auto-detect transaction IDs vs addresses
4. **Real-time Data** - Powered by Arkade Indexer API
5. **Retro UI** - Space Invaders-inspired design with purple/orange/black theme

### Configuration

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
```

### API Integration

- **Indexer Client**: REST-based client using @arkade-os/sdk
- **Endpoints Used**:
  - `/v1/indexer/commitmentTx/{txid}` - Get commitment transaction details
  - `/v1/indexer/vtxos` - Get VTXOs by scripts or outpoints

---

## Architecture Overview

```
arkade-explorer/
├── src/
│   ├── components/
│   │   ├── Address/          # AddressStats, VtxoList
│   │   ├── Home/             # FeatureCard, StatsCard
│   │   ├── Layout/           # Header, Footer, Layout, SearchHeader
│   │   ├── NotFound/         # NotFoundPage
│   │   ├── Transaction/      # TransactionDetails, BatchList, TransactionHex
│   │   └── UI/               # Card, Badge, CopyButton, LoadingSpinner, etc.
│   ├── hooks/                # useDebounce
│   ├── lib/
│   │   ├── api/              # indexer.ts (API client)
│   │   ├── constants.ts      # App constants
│   │   ├── decode.ts         # Bitcoin decoding utilities
│   │   ├── formatters.ts     # Additional formatters
│   │   ├── utils.ts          # Core utilities
│   │   └── validation.ts     # Input validation
│   ├── pages/                # HomePage, TransactionPage, CommitmentTxPage, AddressPage
│   ├── types/                # TypeScript interfaces
│   ├── App.tsx               # Main app with routing
│   ├── index.css             # Global styles and theme
│   └── main.tsx              # Entry point
├── public/                   # Static assets
├── .env                      # Environment variables
├── tailwind.config.js        # Tailwind configuration
├── vite.config.ts            # Vite configuration
└── package.json              # Dependencies and scripts
```

---

## Related Projects

| Project | Relationship |
|---------|-------------|
| `arkd` | Server providing indexed transaction data |
| `wallet` | Sibling PWA using same @arkade-os/sdk |
| `ark-docs` | Protocol documentation reference |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

---

## Performance

- **Bundle Size**: ~261 KB (gzipped: ~82 KB)
- **CSS Size**: ~16 KB (gzipped: ~4 KB)
- **Build Time**: ~5-6 seconds
- **Hot Reload**: < 1 second
