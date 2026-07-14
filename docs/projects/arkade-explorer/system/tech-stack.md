# Arkade Explorer -- Technology Stack

## Core Framework

### React 18
- **Version**: 18.2.0
- **Purpose**: UI component framework
- **Features Used**: Functional components with hooks, concurrent rendering, automatic batching

### TypeScript
- **Version**: 5.2.2
- **Purpose**: Type safety and developer experience
- **Configuration**: Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)

## Build Tools

### Vite
- **Version**: 5.1.0
- **Purpose**: Development server and bundler
- **Features**: HMR, ES modules, optimized production builds, environment variable handling
- **Custom**: Injects git commit hash at build time via `execSync('git rev-parse --short HEAD')`

## Routing

### React Router
- **Version**: 7.9.6 (react-router-dom)
- **Purpose**: Client-side routing
- **Pattern**: BrowserRouter with nested routes under Layout

## Data Fetching

### TanStack Query (React Query)
- **Version**: 5.90.10
- **Purpose**: Server state management
- **Configuration**: `refetchOnWindowFocus: false`, `retry: 1`
- **Features Used**: Query caching, background refetching, loading/error states

## Styling

### TailwindCSS
- **Version**: 4.1.17
- **Purpose**: Utility-first CSS framework
- **Custom Theme Colors**: Purple (#4318FF), Orange (#FF3D00), Gray (#E0E0E0), Black (#1A1A1A)

### PostCSS
- **Version**: 8.5.6
- **Plugins**: @tailwindcss/postcss, autoprefixer

## UI Libraries

### Lucide React
- **Version**: 0.554.0
- **Purpose**: Icon library (Search, Blocks, Wallet, Zap, etc.)

### clsx + tailwind-merge
- **Versions**: clsx 2.1.1, tailwind-merge 3.4.0
- **Purpose**: Conditional class name composition via `cn()` utility

### @tanstack/react-virtual
- **Version**: ^3.14.3
- **Purpose**: Window virtualization for long lists (address VTXO list, asset balances, tx packet groups) to keep high-activity addresses responsive

## Ark/Bitcoin Libraries

### @arkade-os/sdk
- **Version**: 0.4.45
- **Purpose**: Arkade protocol SDK for API client, type definitions, indexer access, and the unilateral-exit primitives
- **Note**: As of 0.4.43 the SDK models asset amounts/supply as `bigint` (previously `number`). The explorer adapts at the boundary — display helpers (`formatAssetAmount`, `AssetAmountDisplay`) accept `number | bigint`, while aggregation (`aggregateAssetBalances`) and cached asset supply are normalised to `number` via `Number(...)` (sessionStorage JSON cannot serialise bigint)
- **Unilateral exit**: the `/unilateral-exit` executor uses the SDK's `UnilateralExit`, `deserializeExitPackage`, `EsploraProvider`, `OnchainWallet`, `SingleKey`, `ESPLORA_URL`, and the `ExitPackage`/`ExecutorEvent`/`ExitStep` types (`src/lib/exit/`, `src/components/exit/`). `pnpm-workspace.yaml` pins the SDK build via `onlyBuiltDependencies` and excludes `0.4.45` from the minimum-release-age gate

### @scure/btc-signer
- **Version**: 2.0.1
- **Purpose**: Bitcoin transaction parsing, script interpretation

### @scure/base
- **Version**: 2.0.0
- **Purpose**: Base encoding/decoding (base64, hex, bech32)

## Development Tools

### ESLint
- **Version**: 8.56.0
- **Plugins**: @typescript-eslint (6.21.0), react-hooks, react-refresh
- **Configuration**: Zero warnings tolerance (`--max-warnings 0`)

### Vite React Plugin
- **Version**: @vitejs/plugin-react 4.2.1
- **Purpose**: React Fast Refresh and JSX transform

### Vitest
- **Version**: ^4.1.9
- **Purpose**: Unit test runner (configured in `vitest.config.ts`, node environment, runs `src/**/*.test.ts`). Scripts: `pnpm test` (run once) and `pnpm test:watch`. Covers the `src/lib/` utility modules (`vtxo-aggregation`, `cap-list`, `debounce`) and the exit executor (`lib/exit/package` decoder — raw/base64url/gzip, version reject, URL-param precedence; `components/exit/step-meta` phase mapping)

## Deployment

### Docker
- **Base**: Node 22 Alpine (build) + nginx Alpine (serve)
- **Package Manager**: pnpm
- **Pre-built Image**: `ghcr.io/arklabshq/arkade-explorer:latest`

### Vercel
- **Configuration**: `vercel.json` with SPA rewrite rules

### Netlify
- **Configuration**: `netlify.toml` with SPA redirect rules
- **Functions**: `functions/` directory for serverless functions

## Dependency Summary

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Framework | react | 18.2.0 | UI framework |
| Framework | react-dom | 18.2.0 | DOM rendering |
| Routing | react-router-dom | 7.9.6 | Client routing |
| Data | @tanstack/react-query | 5.90.10 | Server state |
| Styling | tailwindcss | 4.1.17 | CSS framework |
| Virtualization | @tanstack/react-virtual | ^3.14.3 | Windowed long-list rendering |
| Icons | lucide-react | 0.554.0 | Icons |
| Ark SDK | @arkade-os/sdk | 0.4.45 | Ark protocol + unilateral exit |
| Bitcoin | @scure/btc-signer | 2.0.1 | TX parsing |
| Bitcoin | @scure/base | 2.0.0 | Encoding |
| Build | vite | 5.1.0 | Bundler |
| Testing | vitest | ^4.1.9 | Unit test runner |
| Types | typescript | 5.2.2 | Type system |

## Performance Characteristics

- **Bundle Size**: ~261 KB (gzipped: ~82 KB)
- **CSS Size**: ~16 KB (gzipped: ~4 KB)
- **Build Time**: ~5-6 seconds
- **HMR**: < 1 second
- **First Contentful Paint**: < 1.5s (typical)
