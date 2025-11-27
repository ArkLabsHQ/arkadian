# Arkade Explorer - Component Documentation

## Component Organization

```
src/components/
├── Address/          # Address exploration components
├── Home/             # Homepage feature components
├── Layout/           # Layout and navigation
├── NotFound/         # 404 page
├── Transaction/      # Transaction display components
└── UI/               # Reusable UI primitives
```

## UI Components (`UI/`)

### Card
Container component with optional visual effects.

**Props**:
- `children: ReactNode` - Content
- `className?: string` - Additional classes
- `glow?: boolean` - Enable glow effect

**Usage**:
```tsx
<Card glow>
  <h2>Transaction Details</h2>
  <p>Content here...</p>
</Card>
```

### Badge
Status indicator component with variants.

**Props**:
- `variant: 'success' | 'warning' | 'danger' | 'default'`
- `children: ReactNode`

**Usage**:
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Expired</Badge>
```

**Variants**:
| Variant | Color | Use Case |
|---------|-------|----------|
| success | Green | Active VTXOs |
| warning | Orange | Pending/expiring |
| danger | Red | Expired/swept |
| default | Gray | Neutral status |

### CopyButton
Clipboard copy with visual feedback.

**Props**:
- `text: string` - Text to copy
- `className?: string`

**Behavior**:
1. Click triggers copy
2. Visual feedback (checkmark)
3. Resets after 2 seconds

### LoadingSpinner
Animated loading indicator.

**Props**:
- `size?: 'sm' | 'md' | 'lg'`
- `className?: string`

**Animation**: Dual-ring rotation effect (retro theme).

### ErrorMessage
Error display with icon.

**Props**:
- `message: string`
- `className?: string`

### InfoRow
Label-value pair display.

**Props**:
- `label: string`
- `value: string | ReactNode`
- `copyable?: boolean`

**Usage**:
```tsx
<InfoRow
  label="Transaction ID"
  value={truncateHash(txid)}
  copyable
/>
```

### SearchBar
Smart search input with auto-detection.

**Props**:
- `onSearch: (query: string) => void`
- `placeholder?: string`
- `initialValue?: string`

**Features**:
- Detects 64-char hex (transaction ID)
- Detects addresses/scripts
- Debounced input
- Clear button

### Pagination
Page navigation component.

**Props**:
- `currentPage: number`
- `totalPages: number`
- `onPageChange: (page: number) => void`

### Tooltip
Hover information display.

**Props**:
- `content: string | ReactNode`
- `children: ReactNode`
- `position?: 'top' | 'bottom' | 'left' | 'right'`

### Tabs
Tab navigation component.

**Props**:
- `tabs: { id: string; label: string; content: ReactNode }[]`
- `defaultTab?: string`

## Layout Components (`Layout/`)

### Header
Top navigation bar.

**Features**:
- Logo/branding
- Navigation links
- Search integration

### Footer
Bottom section.

**Features**:
- Copyright notice
- External links
- Version info (optional)

### Layout
Main wrapper component.

**Structure**:
```tsx
<div className="min-h-screen flex flex-col">
  <Header />
  <main className="flex-1">
    {children}
  </main>
  <Footer />
</div>
```

### SearchHeader
Persistent search in header.

**Features**:
- Compact search bar
- Mobile responsive
- Navigation integration

## Transaction Components (`Transaction/`)

### TransactionDetails
Display transaction metadata.

**Data Displayed**:
- Transaction ID
- Started/ended timestamps
- Input/output amounts
- VTXO counts
- Status

### BatchList
List of batch outputs.

**Props**:
- `batches: Batch[]`
- `expanded?: boolean`

**Batch Item**:
- Batch index
- Amount
- VTXO count
- Expiration
- Swept status

### TransactionHex
Raw transaction hex viewer.

**Props**:
- `hex: string`
- `defaultExpanded?: boolean`

**Features**:
- Expandable/collapsible
- Copy to clipboard
- Monospace font
- Line wrapping

### VtxoTreeViewer
VTXO tree visualization.

**Props**:
- `vtxos: Vtxo[]`
- `rootTxid: string`

**Features**:
- Hierarchical display
- Expand/collapse nodes
- Status indicators

## Address Components (`Address/`)

### AddressStats
Aggregated address statistics.

**Data Displayed**:
| Stat | Description |
|------|-------------|
| Total Balance | Sum of active VTXO amounts |
| Total Received | All-time received |
| Total VTXOs | Count of all VTXOs |
| Active | Count of spendable |
| Spent | Count of spent |
| Swept | Count of swept |

### VtxoList
List of VTXOs for an address.

**Props**:
- `vtxos: Vtxo[]`
- `loading?: boolean`

**VTXO Item**:
- Outpoint (txid:vout)
- Amount
- Status badge
- Created timestamp
- Expiration
- Links to related transactions

## Home Components (`Home/`)

### FeatureCard
Feature highlight card.

**Props**:
- `icon: ReactNode`
- `title: string`
- `description: string`

### StatsCard
Statistics display card.

**Props**:
- `label: string`
- `value: string | number`
- `icon?: ReactNode`

## Page Components (`pages/`)

### HomePage
Landing page with search.

**Sections**:
1. Hero with search bar
2. Feature cards
3. Statistics (if available)

### TransactionPage
Transaction type detection and routing.

**Logic**:
1. Fetch transaction data
2. Detect type (commitment vs regular)
3. Redirect or display

### CommitmentTxPage
Commitment transaction details.

**Sections**:
1. Transaction details
2. Batch list
3. Raw hex viewer

### AddressPage
Address VTXO explorer.

**Sections**:
1. Address display with copy
2. Statistics dashboard
3. VTXO list with filtering

### NotFoundPage
404 error page.

**Features**:
- Retro-themed error message
- Navigation to home
- Search bar

## Component Patterns

### Loading States
```tsx
if (isLoading) {
  return (
    <div className="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  );
}
```

### Error States
```tsx
if (error) {
  return <ErrorMessage message={error.message} />;
}
```

### Empty States
```tsx
if (!data || data.length === 0) {
  return (
    <Card>
      <p className="text-center text-gray">No data found</p>
    </Card>
  );
}
```

### Conditional Rendering
```tsx
{data.swept && <Badge variant="danger">Swept</Badge>}
{data.active && <Badge variant="success">Active</Badge>}
```
