# Arkade Explorer - Technology Stack

## Core Framework

### React 18
- **Version**: 18.2.0
- **Purpose**: UI component framework
- **Features Used**:
  - Functional components with hooks
  - Concurrent rendering
  - Automatic batching
  - Suspense (for loading states)

### TypeScript
- **Version**: 5.2.2
- **Purpose**: Type safety and developer experience
- **Configuration**: Strict mode enabled
- **Key Features**:
  - Interface definitions for all data types
  - Generic type utilities
  - Type guards for runtime validation

## Build Tools

### Vite
- **Version**: 5.1.0
- **Purpose**: Development server and bundler
- **Features**:
  - Hot Module Replacement (HMR)
  - ES modules native support
  - Optimized production builds
  - Environment variable handling

**Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  // SPA fallback for production
});
```

## Routing

### React Router
- **Version**: 7.9.6
- **Purpose**: Client-side routing
- **Pattern**: Browser router with nested routes
- **Routes**:
  - `/` - Home
  - `/tx/:txid` - Transaction (auto-detect)
  - `/commitment-tx/:txid` - Commitment transaction
  - `/address/:address` - Address explorer

## Data Fetching

### TanStack Query (React Query)
- **Version**: 5.90.10
- **Purpose**: Server state management
- **Features Used**:
  - Query caching
  - Background refetching
  - Loading/error states
  - Query invalidation

**Example Usage**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['commitmentTx', txid],
  queryFn: () => fetchCommitmentTx(txid),
});
```

## Styling

### TailwindCSS
- **Version**: 4.1.17
- **Purpose**: Utility-first CSS framework
- **Configuration**: Custom theme with Arkade colors

**Theme Colors**:
```javascript
// tailwind.config.js
colors: {
  purple: '#4318FF',   // Primary
  orange: '#FF3D00',   // Accent
  gray: '#E0E0E0',     // Text
  black: '#1A1A1A',    // Background
}
```

### PostCSS
- **Version**: 8.5.6
- **Plugins**:
  - Autoprefixer (vendor prefixes)
  - TailwindCSS integration

## UI Libraries

### Lucide React
- **Version**: 0.554.0
- **Purpose**: Icon library
- **Usage**: Consistent iconography throughout the app

### clsx + tailwind-merge
- **Versions**: clsx 2.1.1, tailwind-merge 3.4.0
- **Purpose**: Conditional class name composition
- **Pattern**: `cn()` utility function

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

## Bitcoin/Crypto Libraries

### @arkade-os/sdk
- **Version**: 0.3.7
- **Purpose**: Arkade protocol SDK
- **Features**:
  - Indexer API client
  - Type definitions for Ark data structures

### @scure/btc-signer
- **Version**: 2.0.1
- **Purpose**: Bitcoin transaction parsing
- **Features**:
  - Transaction decoding
  - Script interpretation
  - PSBT support

### @scure/base
- **Version**: 2.0.0
- **Purpose**: Base encoding/decoding
- **Features**:
  - Base64 encoding
  - Hex encoding
  - Bech32 support

## Development Tools

### ESLint
- **Version**: 8.56.0
- **Purpose**: Code linting
- **Configuration**: TypeScript-aware rules
- **Plugins**:
  - @typescript-eslint/eslint-plugin
  - eslint-plugin-react-hooks
  - eslint-plugin-react-refresh

### TypeScript ESLint
- **Versions**:
  - @typescript-eslint/eslint-plugin: 6.21.0
  - @typescript-eslint/parser: 6.21.0
- **Purpose**: TypeScript-specific linting rules

## Type Definitions

### React Type Definitions
- **@types/react**: 18.2.55
- **@types/react-dom**: 18.2.19

## Deployment

### Vercel
- **Configuration**: `vercel.json`
- **Features**: SPA routing, automatic HTTPS

### Netlify
- **Configuration**: `netlify.toml`
- **Features**: SPA routing, automatic builds

## Package Manager

### npm
- **Lock File**: `package-lock.json`
- **Node.js Requirement**: 18+

## Dependency Summary

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Framework | react | 18.2.0 | UI framework |
| Framework | react-dom | 18.2.0 | DOM rendering |
| Routing | react-router-dom | 7.9.6 | Client routing |
| Data | @tanstack/react-query | 5.90.10 | Server state |
| Styling | tailwindcss | 4.1.17 | CSS framework |
| Icons | lucide-react | 0.554.0 | Icons |
| Ark SDK | @arkade-os/sdk | 0.3.7 | Ark protocol |
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
