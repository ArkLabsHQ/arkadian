# Arkade Explorer - Project Overview

## What is Arkade Explorer?

Arkade Explorer is a modern blockchain explorer for the Arkade Protocol, providing a web-based interface to browse and search commitment transactions, Arkade transactions, and VTXO (Virtual Transaction Output) addresses. Built with React 18 and TypeScript, it features a distinctive retro Space Invaders-inspired visual theme.

## Core Features

### 1. Transaction Explorer
- **Commitment Transaction View** (`/commitment-tx/:txid`)
  - Transaction metadata (started/ended timestamps)
  - Input/output amounts and VTXO counts
  - Batch outputs with details (amount, VTXO count, expiration, swept status)
  - Copy transaction ID to clipboard
  - Raw transaction hex viewer (expandable)

- **Arkade Transaction View** (`/tx/:txid`)
  - Auto-detect transaction type
  - Auto-redirect to commitment-tx if applicable
  - Display transaction details with timestamps (createdAt, expiry)
  - Spent status indicators and spending transaction links on outputs

### 2. Address Explorer (`/address/:address`)
- **Address Overview**
  - Display address/script with copy functionality
  - Comprehensive statistics

- **Statistics Dashboard**
  - Total balance (active VTXOs)
  - Total received amount
  - Total VTXO count
  - Active, spent, and swept VTXOs counts

- **VTXO List**
  - Display all VTXOs for an address
  - Status badges (Active, Spent, Swept)
  - VTXO details: outpoint, amount, timestamps
  - Links to commitment and spending transactions
  - Expiration information

### 3. Smart Search
- Auto-detect transaction IDs (64 hex characters)
- Auto-detect addresses/scripts
- Available from homepage and header
- Search history support

### 4. Retro UI Theme
- **Color Palette**:
  - Purple (#4318FF) - Primary brand color
  - Orange (#FF3D00) - Accent and highlights
  - Gray (#E0E0E0) - Text and secondary elements
  - Black (#1A1A1A) - Background

- **Design Elements**:
  - Light/dark theme toggle (persistent preference)
  - Retro borders and glow effects
  - Monospace font styling
  - Dual-ring animated loading spinners
  - Responsive design (mobile + desktop)

### 5. OP_RETURN Script Handling
- Sub-dust VTXO outputs use OP_RETURN scripts instead of P2TR
- Explorer automatically detects OP_RETURN format and extracts the taproot key
- Correctly constructs Ark addresses from both P2TR and OP_RETURN scripts

## Use Cases

### For Users
- Browse Arkade transaction history
- View VTXO balances and statuses
- Track commitment transaction batches
- Verify transaction confirmations

### For Developers
- Debug transaction issues by viewing raw hex
- Inspect VTXO lifecycle and expiration
- Monitor batch settlement details
- Verify address balances during testing

### For Operators
- Monitor commitment transaction throughput
- Track VTXO distributions
- Verify batch processing

## Integration with Ark Ecosystem

Arkade Explorer integrates with the Ark ecosystem through:

1. **Arkade Indexer API** - Real-time transaction and VTXO data
2. **@arkade-os/sdk** - TypeScript SDK for API communication
3. **@scure/btc-signer** - Bitcoin transaction decoding

The explorer connects to the Arkade Indexer (default: https://indexer.arkadeos.com) to fetch:
- Commitment transaction details
- VTXO data by scripts or outpoints
- Transaction metadata and batch information

## Deployment Options

### Vercel
Configured via `vercel.json` for automatic SPA routing.

### Netlify
Configured via `netlify.toml` for automatic SPA routing.

### Self-Hosted
Build with `npm run build` and serve the `dist/` directory with any static file server.

## Security Considerations

- Input sanitization on all user inputs
- XSS protection via React's built-in escaping
- No inline scripts
- Environment variable for API URL configuration
- HTTPS recommended for production deployments
