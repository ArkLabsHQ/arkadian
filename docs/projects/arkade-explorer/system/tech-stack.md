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

## Ark/Bitcoin Libraries

### @arkade-os/sdk
- **Version**: ^0.4.0-next.7
- **Purpose**: Arkade protocol SDK for API client, type definitions, and indexer access

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
| Icons | lucide-react | 0.554.0 | Icons |
| Ark SDK | @arkade-os/sdk | ^0.4.0-next.7 | Ark protocol |
| Bitcoin | @scure/btc-signer | 2.0.1 | TX parsing |
| Bitcoin | @scure/base | 2.0.0 | Encoding |
| Build | vite | 5.1.0 | Bundler |
| Types | typescript | 5.2.2 | Type system |

## Performance Characteristics

- **Bundle Size**: ~261 KB (gzipped: ~82 KB)
- **CSS Size**: ~16 KB (gzipped: ~4 KB)
- **Build Time**: ~5-6 seconds
- **HMR**: < 1 second
- **First Contentful Paint**: < 1.5s (typical)
