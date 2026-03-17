# Arkade Explorer -- Project Overview

## What is Arkade Explorer?

Arkade Explorer is a modern blockchain explorer for the Arkade Protocol, providing a web-based interface to browse and search commitment transactions, Arkade transactions, asset details, and VTXO (Virtual Transaction Output) addresses. Built with React 18 and TypeScript, it features a distinctive retro Space Invaders-inspired visual theme with light/dark mode support.

The explorer connects to the Arkade Indexer API (default: `https://indexer.arkadeos.com`) to fetch real-time data about the Ark protocol state.

## Core Features

### 1. Transaction Explorer
- **Commitment Transaction View** (`/commitment-tx/:txid`)
  - Transaction metadata (started/ended timestamps)
  - Input/output amounts and VTXO counts
  - Batch outputs with details (amount, VTXO count, expiration, swept status)
  - VTXO tree visualization via TreeViewer and VtxoTreeViewer components
  - Copy transaction ID to clipboard
  - Raw transaction hex viewer (expandable)

- **Arkade Transaction View** (`/tx/:txid`)
  - Auto-detect transaction type
  - Auto-redirect to commitment-tx if applicable
  - Display transaction details with timestamps (createdAt, expiry)
  - Spent status indicators and spending transaction links on outputs

### 2. Address Explorer (`/address/:address`)
- **Statistics Dashboard**: Total balance, total received, total VTXOs, active/spent/swept counts
- **VTXO List**: Status badges (Active, Spent, Swept), outpoints, amounts, timestamps, links to transactions, pagination support

### 3. Asset Explorer (`/asset/:assetId`)
- View asset details by asset ID
- Asset amount display with custom formatting
- Asset badges for visual identification
- Verified asset icon system with user approval flow

### 4. Smart Search
- Auto-detect transaction IDs (64 hex characters)
- Auto-detect asset IDs (65+ hex characters)
- Auto-detect addresses/scripts (anything else)
- Available from homepage and persistent header search
- Recent search history via useRecentSearches hook

### 5. Real-time Activity Stream
- Live activity feed on homepage via ActivityStreamContext
- Particle rain visual effect triggered by new activity
- Server info fetched and cached via ServerInfoContext

### 6. Theme and Display Preferences
- Light/dark theme toggle with persistent localStorage preference
- Money unit display toggle (sats vs BTC) via MoneyDisplayContext
- Asset icon approval system for verified assets via AssetIconApprovalContext

### 7. OP_RETURN Script Handling
- Sub-dust VTXO outputs use OP_RETURN scripts instead of P2TR
- Explorer automatically detects OP_RETURN format and extracts the taproot key
- Correctly constructs Ark addresses from both P2TR and OP_RETURN scripts

## Use Cases

### For Users
- Browse Arkade transaction history
- View VTXO balances and statuses
- Track commitment transaction batches
- Explore asset details and ownership
- Verify transaction confirmations

### For Developers
- Debug transaction issues by viewing raw hex
- Inspect VTXO lifecycle and expiration
- Monitor batch settlement details
- Verify address balances during testing
- Explore VTXO tree structure

### For Operators
- Monitor commitment transaction throughput
- Track VTXO distributions
- Verify batch processing
- Monitor asset issuance

## Deployment Options

### Docker (Recommended)
Pre-built image available at `ghcr.io/arklabshq/arkade-explorer:latest`. Serves the app via nginx on port 80.

### Vercel
Configured via `vercel.json` for automatic SPA routing.

### Netlify
Configured via `netlify.toml` for automatic SPA routing. Includes serverless functions directory.

### Self-Hosted
Build with `npm run build` and serve the `dist/` directory with any static file server. SPA fallback routing is required.

## Security Considerations

- Input sanitization on all user inputs (validation.ts)
- XSS protection via React's built-in escaping
- No inline scripts
- Environment variables for API URL and verified assets URL configuration
- HTTPS recommended for production deployments
- Asset icon approval protects against icon spoofing for unverified assets
