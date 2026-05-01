# Arkade Explorer -- Architecture

## High-Level Architecture

```
+---------------------------------------------------------------+
|                        Browser (Client)                        |
+---------------------------------------------------------------+
|  +-------------+  +---------+  +---------------------------+  |
|  | React Router |  | React   |  |     TanStack Query        |  |
|  | (v7)         |  | 18      |  |    (Data Fetching)        |  |
|  +-------------+  +---------+  +---------------------------+  |
|  +-----------------------------------------------------------+ |
|  |                  Context Providers                         | |
|  | ThemeContext | MoneyDisplay | ServerInfo | ActivityStream  | |
|  | AssetIconApproval                                          | |
|  +-----------------------------------------------------------+ |
|  +-----------------------------------------------------------+ |
|  |                   Component Layer                          | |
|  | Layout | UI | Transaction | Address | Asset | Home         | |
|  +-----------------------------------------------------------+ |
|  +-----------------------------------------------------------+ |
|  |                     Library Layer                          | |
|  | API Client | Utils | Decode | Validation | arkAddress     | |
|  | formatters | constants | assetIconApproval                | |
|  +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
                              |
                              | HTTPS/REST
                              v
+---------------------------------------------------------------+
|                     Arkade Indexer API                          |
|                  (https://indexer.arkadeos.com)                 |
|  commitmentTx, vtxos, transactions, info, assets               |
+---------------------------------------------------------------+
```

## Component Hierarchy

```
App.tsx
├── QueryClientProvider (TanStack Query)
│   └── AssetIconApprovalProvider
│       └── ThemeProvider
│           └── MoneyDisplayProvider
│               └── ServerInfoProvider
│                   └── ActivityStreamProvider
│                       └── BrowserRouter
│                           └── Routes
│                               └── Layout
│                                   ├── Header (SearchHeader)
│                                   └── Footer
│                               ├── HomePage
│                               │   ├── SearchBar
│                               │   ├── RecentActivity
│                               │   ├── ParticleRain
│                               │   └── FeatureCard[]
│                               ├── TransactionPage (auto-detect/redirect)
│                               ├── CommitmentTxPage
│                               │   ├── TransactionDetails
│                               │   ├── BatchList
│                               │   ├── VtxoTreeViewer
│                               │   └── TransactionHex
│                               ├── AddressPage
│                               │   ├── AddressStats
│                               │   └── VtxoList
│                               ├── AssetPage
│                               │   └── AssetDetails
│                               └── NotFoundPage
```

## Layer Breakdown

### 1. Context Layer (`src/contexts/`)

Five React Context providers wrap the application and manage global state:

- **ThemeContext**: Light/dark theme with localStorage persistence
- **MoneyDisplayContext**: Toggle between sats and BTC display units
- **ServerInfoContext**: Fetches and caches Arkade server info via TanStack Query
- **ActivityStreamContext**: Real-time activity feed for the homepage
- **AssetIconApprovalContext**: Manages user approval of unverified asset icons

### 2. Routing Layer (`src/App.tsx`)

React Router v7 manages client-side navigation with nested routes under a shared Layout component. The TransactionPage auto-detects transaction type and redirects. Smart search routes 64-char hex to `/tx/`, exactly-68-char hex to `/asset/` (via `isValidAssetId()`), `txid:vout` outpoints to `/tx/:txid` (vout stripped), `tark1`/`ark1` prefixes to `/address/`, and falls back to `/tx/:q` otherwise.

### 3. Component Layer (`src/components/`)

Organized into domain-specific directories: Layout, UI, Transaction, Address, Asset, Home, NotFound. UI components are reusable primitives (Card, Badge, CopyButton, Pagination, Tabs, Tooltip, SearchBar, LoadingSpinner, ErrorMessage, InfoRow, MoneyDisplay, MoneyUnitToggle, AssetAmountDisplay, AssetBadge, ImageLightbox, ParticleRain, ThemeToggle).

### 4. Library Layer (`src/lib/`)

- **API Client** (`api/fetchAllPages.ts`): Generic pagination helper that fetches all pages from paginated SDK calls and merges results
- **arkAddress.ts**: Constructs Arkade addresses from script pubkeys (parameter renamed `aspPubkeyHex` → `operatorPubkeyHex`; default network `bitcoin`), handles both P2TR and OP_RETURN formats
- **assetIconApproval.ts**: Verified asset checking logic using remote asset registry
- **utils.ts**: Core utilities -- `cn()` for class merging, `formatSats()`, `formatTimestamp()`, `truncateHash()`, `copyToClipboard()`
- **formatters.ts**: Extended formatters (satsToBtc, compact numbers, duration, relative time, bytes)
- **validation.ts**: Input validation (txid, hex, outpoint, positive integer, sanitize)
- **decode.ts**: Bitcoin script and transaction decoding, base64/hex conversion
- **constants.ts**: App-wide constants including pagination defaults

### 5. Custom Hooks (`src/hooks/`)

- **useAssetDetails**: Fetches and caches asset details by ID
- **useDebounce**: Debounces rapidly changing values (used in search)
- **useRecentSearches**: Manages recent search history in localStorage

### 6. Data Layer (TanStack Query)

Manages all server state with automatic caching, background refetching, and loading/error states. Configured with `refetchOnWindowFocus: false` and `retry: 1` for the explorer use case.

## Data Flow

### Search Flow
```
User Input -> Search bar (type detection) -> React Router
  64 hex chars                  -> /tx/:txid               -> TransactionPage (auto-detect) -> CommitmentTxPage or redirect
  txid:vout (outpoint)          -> /tx/:txid               -> TransactionPage (vout stripped)
  tark1 / ark1 prefix           -> /address/:address       -> AddressPage -> AddressStats + VtxoList
  68 hex chars (isValidAssetId) -> /asset/:assetId         -> AssetPage -> AssetDetails
  fallback                      -> /tx/:q
```

### API Data Flow
```
Component -> useQuery(queryKey, queryFn) -> @arkade-os/sdk client -> Indexer REST API
                                         <- Response cached by TanStack Query
```

## Build Architecture

Vite bundles TypeScript/React source into optimized production assets. The build injects the current git commit hash via `vite.config.ts` using `execSync('git rev-parse --short HEAD')`. Docker builds use a multi-stage process: Node 22 Alpine for building, nginx Alpine for serving, with SPA routing configured via `nginx.conf`. CI publishes multi-arch images (`linux/amd64` and `linux/arm64`) to GHCR via `docker/setup-qemu-action` + `docker/setup-buildx-action`.

## State Management

- **Server state**: TanStack Query (all API data)
- **Global UI state**: React Context (theme, money display, server info, activity stream, asset approval)
- **Local UI state**: React useState (search input, pagination, expanded/collapsed toggles, tabs)
- **Persistent state**: localStorage (theme preference, recent searches, asset approvals)
