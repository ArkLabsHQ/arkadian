# Arkade Explorer -- Component Documentation

## Component Organization

```
src/components/
├── Address/          # Address exploration components
├── Asset/            # Asset detail components
├── Home/             # Homepage feature components
├── Layout/           # Layout and navigation
├── NotFound/         # 404 page
├── Transaction/      # Transaction display components
└── UI/               # Reusable UI primitives
```

## UI Components (`UI/`)

### Card
Container component with optional glow effect.
- **Props**: `children`, `className?`, `glowing?: boolean`

### Badge
Status indicator with variants: `success` (green/Active), `warning` (orange/Pending), `danger` (red/Expired), `default` (gray).

### CopyButton
Clipboard copy with visual feedback. Shows checkmark for 2 seconds after copy.

### LoadingSpinner
Dual-ring animated loading indicator with retro styling.

### ErrorMessage
Error display component with icon and message.

### InfoRow
Label-value pair display with optional copy functionality.

### SearchBar
Smart search input with auto-detection of txids, asset IDs, and addresses.

### Pagination
Page navigation component for paginated VTXO lists.

### Tooltip
Hover information display with configurable position.

### Tabs
Tab navigation component for switching between content views.

### ThemeToggle
Light/dark theme switcher. Reads and writes to ThemeContext.

### ParticleRain
Visual particle rain effect triggered by activity events on the homepage.

### MoneyDisplay
Displays satoshi amounts formatted according to MoneyDisplayContext preference (sats or BTC).

### MoneyUnitToggle
Toggle switch for sats/BTC display unit preference.

### AssetAmountDisplay
Displays asset amounts with proper denomination and formatting.

### AssetBadge
Visual badge for asset identification with icon support.

### ImageLightbox
Lightbox overlay for viewing asset images in full size.

## Layout Components (`Layout/`)

### Header
Top navigation bar with logo/branding, navigation links, theme toggle, and search integration.

### Footer
Bottom section with copyright notice, external links, and commit hash version display.

### Layout
Main layout wrapper using React Router's Outlet for nested route content.

### SearchHeader
Persistent compact search bar in the header, available on all pages.

## Transaction Components (`Transaction/`)

### TransactionDetails
Displays transaction metadata: ID, timestamps, input/output amounts, VTXO counts, and status.

### BatchList
Lists batch outputs with amount, VTXO count, expiration, and swept status.

### TransactionHex
Expandable raw transaction hex viewer with copy-to-clipboard.

### TreeViewer
Generic tree visualization component for hierarchical data.

### VtxoTreeViewer
VTXO-specific tree visualization showing the VTXO tree structure within a batch.

## Address Components (`Address/`)

### AddressStats
Aggregated statistics: total balance, total received, total VTXOs, active/spent/swept counts.

### VtxoList
Paginated list of VTXOs for an address. Each item shows outpoint, amount, status badge, timestamps, expiration, and transaction links.

## Asset Components (`Asset/`)

### AssetDetails
Displays asset information fetched by asset ID. Shows asset metadata, amounts, and verification status.

## Home Components (`Home/`)

### FeatureCard
Feature highlight card with icon, title, and description.

### RecentActivity
Live activity feed showing recent transactions and events. Uses ActivityStreamContext.

### StatsCard
Statistics display card with label, value, and optional icon.

## Page Components (`pages/`)

### HomePage
Landing page with search bar, particle rain effect, recent activity stream, and feature cards.

### TransactionPage
Transaction type detection and routing. Fetches transaction data, detects if it is a commitment transaction, and either displays details or redirects.

### CommitmentTxPage
Commitment transaction details with transaction info, batch list, VTXO tree viewer, and raw hex.

### AddressPage
Address VTXO explorer with statistics dashboard and paginated VTXO list.

### AssetPage
Asset details page. Uses useAssetDetails hook to fetch asset data by ID.

## Context Providers (`contexts/`)

### ThemeContext
Manages light/dark theme. Persists preference to localStorage. Provides `theme` and `toggleTheme`.

### MoneyDisplayContext
Manages sats/BTC display preference. Provides `unit` and `toggleUnit`.

### ServerInfoContext
Fetches server info on mount via TanStack Query with `staleTime: Infinity`. Provides `serverInfo`, `isLoading`, `error`.

### ActivityStreamContext
Manages real-time activity feed for homepage. Provides activity items and subscription.

### AssetIconApprovalContext
Manages user approval for displaying icons of unverified assets. Checks asset IDs against the verified assets registry URL. Provides approval state and approve/reject methods.

## Custom Hooks (`hooks/`)

### useAssetDetails
Fetches asset details by asset ID. Returns data, loading, and error states.

### useDebounce
Debounces a rapidly changing value (e.g., search input) with a configurable delay.

### useRecentSearches
Manages recent search history in localStorage. Returns search list and add/clear methods.

## Component Patterns

### Loading States
```tsx
if (isLoading) return <LoadingSpinner size="lg" />;
```

### Error States
```tsx
if (error) return <ErrorMessage message={error.message} />;
```

### Empty States
```tsx
if (!data || data.length === 0) {
  return <Card><p className="text-center">No data found</p></Card>;
}
```
