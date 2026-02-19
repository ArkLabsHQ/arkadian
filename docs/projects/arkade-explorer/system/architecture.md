# Arkade Explorer - Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │   React     │  │     TanStack Query      │ │
│  │   Router    │  │    18       │  │    (Data Fetching)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Component Layer                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││
│  │  │  Layout  │ │   UI     │ │Transaction│ │ Address  │       ││
│  │  │Components│ │Components│ │Components │ │Components│       ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Library Layer                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││
│  │  │  API     │ │ Utils    │ │ Decode   │ │Validation│       ││
│  │  │ Client   │ │          │ │          │ │          │       ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Arkade Indexer API                          │
│                  (https://indexer.arkadeos.com)                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  /v1/indexer/commitmentTx/{txid}                            ││
│  │  /v1/indexer/vtxos                                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
├── QueryClientProvider (TanStack Query)
│   └── BrowserRouter
│       └── Routes
│           ├── Layout
│           │   ├── Header
│           │   │   └── SearchHeader
│           │   └── Footer
│           ├── HomePage
│           │   ├── SearchBar
│           │   ├── FeatureCard[]
│           │   └── StatsCard[]
│           ├── TransactionPage
│           │   └── → Redirect or CommitmentTxPage
│           ├── CommitmentTxPage
│           │   ├── TransactionDetails
│           │   ├── BatchList
│           │   └── TransactionHex
│           ├── AddressPage
│           │   ├── AddressStats
│           │   └── VtxoList
│           │       └── VtxoTreeViewer
│           └── NotFoundPage
```

## Layer Breakdown

### 1. Routing Layer (`src/App.tsx`)

Manages client-side navigation using React Router:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `HomePage` | Search and feature overview |
| `/tx/:txid` | `TransactionPage` | Auto-detect and redirect |
| `/commitment-tx/:txid` | `CommitmentTxPage` | Commitment tx details |
| `/address/:address` | `AddressPage` | Address VTXO explorer |
| `/*` | `NotFoundPage` | 404 handler |

### 2. Component Layer (`src/components/`)

**Layout Components** (`Layout/`)
- `Header` - Navigation bar with branding
- `Footer` - Copyright and links
- `Layout` - Main layout wrapper
- `SearchHeader` - Persistent search in header

**UI Components** (`UI/`)
- `Card` - Container with optional glow effect
- `Badge` - Status indicators (success, warning, danger, default)
- `CopyButton` - Clipboard functionality with feedback
- `ErrorMessage` - Error display component
- `InfoRow` - Label-value pair display
- `LoadingSpinner` - Dual-ring animated spinner
- `SearchBar` - Smart search input
- `Pagination` - Page navigation
- `Tooltip` - Hover information
- `Tabs` - Tab navigation
- `ThemeToggle` - Light/dark theme switcher

**Feature Components**
- `Transaction/TransactionDetails` - Transaction metadata display
- `Transaction/BatchList` - Batch outputs listing
- `Transaction/TransactionHex` - Raw hex viewer
- `Transaction/VtxoTreeViewer` - VTXO tree visualization
- `Address/AddressStats` - Balance and statistics
- `Address/VtxoList` - VTXO listing with status

### 3. Library Layer (`src/lib/`)

**API Client** (`api/indexer.ts`)
- REST-based Arkade Indexer client
- Pagination support
- Error handling

**Utilities** (`utils.ts`, `formatters.ts`)
- `formatSatoshis()` - Format with thousands separator
- `formatTimestamp()` - Locale date/time
- `truncateHash()` - Shorten hashes for display
- `formatSatsToBtc()` - Convert to BTC
- `formatCompactNumber()` - K, M, B notation
- `formatDuration()` - Human-readable duration
- `formatRelativeTime()` - Relative timestamps

**Validation** (`validation.ts`)
- `isValidTxId()` - Transaction ID validation
- `isValidHex()` - Hex string validation
- `isValidOutpoint()` - VTXO outpoint validation
- `isPositiveInteger()` - Number validation
- `sanitizeInput()` - XSS prevention

**Decoding** (`decode.ts`)
- Bitcoin script decoding
- Transaction hex parsing
- Outpoint parsing
- Base64/hex conversion

**Ark Address** (`arkAddress.ts`)
- Construct Ark addresses from script pubkeys
- Handle both P2TR (SegWit v1) and OP_RETURN sub-dust scripts
- Decode Ark address strings to components

### 4. Data Layer (TanStack Query)

Manages server state with:
- Automatic caching and invalidation
- Background refetching
- Error/loading states
- Optimistic updates

## Data Flow

### Transaction Lookup Flow

```
User Input (txid)
       │
       ▼
┌──────────────────┐
│   SearchBar      │
│  (validation)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   React Router   │
│  /tx/:txid       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ TransactionPage  │
│  (type detect)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌───────────────────┐
│ TanStack Query   │────▶│  Arkade Indexer   │
│  useQuery()      │◀────│  REST API         │
└────────┬─────────┘     └───────────────────┘
         │
         ▼
┌──────────────────┐
│CommitmentTxPage  │
│ (render details) │
└──────────────────┘
```

### Address Lookup Flow

```
User Input (address)
       │
       ▼
┌──────────────────┐
│   SearchBar      │
│  (detection)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌───────────────────┐
│  AddressPage     │────▶│  Arkade Indexer   │
│  useQuery()      │◀────│  /vtxos endpoint  │
└────────┬─────────┘     └───────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│  AddressStats    │ │    VtxoList      │
│  (aggregated)    │ │  (individual)    │
└──────────────────┘ └──────────────────┘
```

## State Management

### Query State (TanStack Query)

```typescript
// Transaction data
const { data, isLoading, error } = useQuery({
  queryKey: ['commitmentTx', txid],
  queryFn: () => indexer.getCommitmentTx(txid),
});

// VTXOs by address
const { data, isLoading, error } = useQuery({
  queryKey: ['vtxos', address],
  queryFn: () => indexer.getVtxosByScripts([address]),
});
```

### Local State (React useState)

- Search input value
- UI toggle states (expanded/collapsed)
- Pagination state
- Tab selection

### Context State (React Context)

- Theme configuration (if applicable)
- Global settings

## Build Architecture

```
Source Files                      Build Output
─────────────                     ────────────
src/
├── *.tsx, *.ts    ─┐
├── index.css      ─┼──▶  Vite  ──▶  dist/
└── assets/        ─┘              ├── index.html
                                   ├── assets/
                                   │   ├── *.js (chunks)
                                   │   └── *.css
                                   └── favicon.svg
```

### Bundle Optimization

- **Code Splitting**: React Router lazy loading
- **Tree Shaking**: Unused code elimination
- **Minification**: Terser for JS, cssnano for CSS
- **Asset Hashing**: Cache-busting filenames
