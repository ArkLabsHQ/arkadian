# Arkade Explorer -- Project Overview

## What is Arkade Explorer?

Arkade Explorer is a modern blockchain explorer for the Arkade Protocol, providing a web-based interface to browse and search commitment transactions, Arkade transactions, asset details, and VTXO (Virtual Transaction Output) addresses. Built with React 18 and TypeScript, it features a distinctive retro Space Invaders-inspired visual theme with light/dark mode support.

The explorer connects to the Arkade Indexer API (default: `https://indexer.arkadeos.com`) to fetch real-time data about the Arkade protocol state.

## Core Features

### 1. Transaction Explorer
- **Batch Commitment Transaction View** (`/commitment-tx/:txid`)
  - Transaction metadata (started/ended timestamps)
  - Input/output amounts and VTXO counts
  - Batch outputs with details (amount, VTXO count, expiration, swept status)
  - VTXO tree visualization via TreeViewer and VtxoTreeViewer components
  - Copy transaction ID to clipboard
  - Raw transaction hex viewer (expandable)
  - **mempool.space link** in the header and on input arrows (commitment txs are on-chain)
  - **Outputs render as Bitcoin addresses** (`bc1p`/`bc1q`) instead of Arkade addresses, displayed as text (not clickable)
  - **Cross-links**: each input is annotated with its originating settlement commitment tx (via VTXO `settledBy`); batch outputs include a blue arrow linking to the batch root Arkade transaction

- **Arkade Transaction View** (`/tx/:txid`)
  - Auto-detect transaction type
  - Auto-redirect to commitment-tx if applicable
  - Display transaction details with timestamps (createdAt, expiry)
  - Spent status indicators and spending transaction links on outputs (route to `/commitment-tx/` when settled, never to self)
  - Subtype badges expanded to full names: "Forfeit transaction", "Checkpoint transaction", "Batch tree transaction", "Connector tree transaction"
  - **Output display addresses** via `deriveOutputDisplayAddress()` (`src/lib/arkAddress.ts`): only genuine on-chain outputs (commitment txs and connector-tree outputs) render as Bitcoin addresses (`bc1…`/`tb1…`); all other off-chain outputs — **including checkpoint outputs** — render as Arkade addresses (`ark1…`/`tark1…`)

### 2. Address Explorer (`/address/:address`)
- **Statistics Dashboard**: Total balance, total received, total VTXOs, active/spent/swept counts
- **Complete balance**: The address query drains **all** VTXO pages before aggregating, so balance/received totals are no longer skewed by pagination (previously only the first page was summed). Aggregation logic (`isVtxoActive`, `sumVtxoValue`, `sumActiveVtxoValue`, `aggregateAssetBalances`, `hasMorePages`) lives in the unit-tested `src/lib/vtxo-aggregation.ts`
- **Crash resistance on high-activity addresses**: The VTXO list, per-asset balance list, and transaction packet groups are **window-virtualized** (via `@tanstack/react-virtual`), and packet groups cap rows per group (`src/lib/cap-list.ts`), so addresses with thousands of VTXOs/assets render without crashing the browser
- **Debounced refetch**: Subscription-triggered refetches on the address page are debounced (`src/lib/debounce.ts`) to avoid refetch storms under live activity
- **VTXO List**: Status badges (Unspent, Spent, **Unfinalized Spend**, Swept), outpoints, amounts, timestamps, links to transactions, pagination support
- **Unfinalized Spend badge**: A spent VTXO whose offchain spend was submitted but not finalized renders an amber "Unfinalized Spend" badge. Detection (`src/hooks/use-pending-outpoints.ts`) queries the indexer with `pendingOnly: true` over the displayed VTXO **scripts** (the indexer only honors the filter for `scripts` queries, not `outpoints`); `deriveVtxoStatus()` returns `unfinalized` only when the VTXO is actually spent and its outpoint is in the pending set
- **Terminal expiry slot**: Once a VTXO is consumed its batch-expiry countdown is meaningless, so the expiry slot shows a terminal status word instead — `settledBy` set → "Settled", spent (no settle) → "Spent", otherwise the live countdown. Logic is the pure `deriveExpiryKind()` / `expiryKindLabel()` helper in `src/lib/vtxo-display.ts` (`settled` takes precedence over `spent`). Applies to all three address VTXO-list variants and the transaction-detail header; the dense-rows variant also gains an inline `settled:xxxx` commitment-tx link mirroring the existing `spent:xxxx` link
- The **Recoverable** badge is suppressed when a VTXO's status is `spent` (applies to BatchList, VtxoList, and OutputCard)

### 3. Asset Explorer (`/asset/:assetId`)
- View asset details by asset ID
- Asset amount display with custom formatting via `AssetAmountDisplay` (ticker + icon) — used in tx outputs, inputs, and packet section instead of raw "X units · assetId"
- Asset badges for visual identification, including extension-type badges ("Asset", "Extension #N") on the Packet card and per-output "Asset" badges; the Packet section also renders correctly for extension-only packets (e.g. HTLC/CLTV) that carry no type-0 asset packet
- Asset amounts shown inline in VTXO table/dense rows (not only when expanded)
- Verified asset icon system with user approval flow

### 4. Smart Search
- Auto-detect transaction IDs (64 hex characters)
- Auto-detect asset IDs (exactly 68 hex characters, validated by `isValidAssetId()`)
- Auto-detect outpoints (`txid:vout`); strips the `:vout` suffix and navigates to `/tx/:txid`
- Auto-detect Ark addresses (`tark1` / `ark1` prefix)
- Anything else routed to `/tx/:q` as a fallback
- Available from homepage and persistent header search; placeholder reads "Search txid, address, asset, or outpoint..."
- Mobile and desktop search palette buttons always open the palette (previously gated on having recent or pinned searches)
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
- Correctly constructs Arkade addresses from both P2TR and OP_RETURN scripts (using the operator pubkey from `serverInfo.signerPubkey`; default network `bitcoin`)

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
Build with `pnpm build` and serve the `dist/` directory with any static file server. SPA fallback routing is required.

## Security Considerations

- Input sanitization on all user inputs (validation.ts)
- XSS protection via React's built-in escaping
- No inline scripts
- Environment variables for API URL and verified assets URL configuration
- HTTPS recommended for production deployments
- Asset icon approval protects against icon spoofing for unverified assets
