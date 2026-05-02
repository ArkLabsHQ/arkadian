# Arkade Explorer -- Usage Guide

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Access to Arkade Indexer API (default: https://indexer.arkadeos.com)

### Installation

```bash
git clone git@github.com:ArkLabsHQ/arkade-explorer.git
cd arkade-explorer
pnpm install
```

### Configuration

Create a `.env` file (or copy from `.env.example`):

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

### Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173` with hot reload enabled.

---

## Using the Explorer

### Searching

The homepage search bar auto-detects input type:

| Input | Detection | Destination |
|-------|-----------|-------------|
| 64-char hex string | Transaction ID | `/tx/:txid` |
| `txid:vout` outpoint | Outpoint | `/tx/:txid` (vout stripped) |
| `tark1` / `ark1` prefix | Ark address | `/address/:address` |
| 68-char hex string | Asset ID | `/asset/:assetId` |
| Anything else | Fallback | `/tx/:q` |

Search is also available from the persistent header bar on every page. Recent searches are saved locally.

### Batch Commitment Transaction View (`/commitment-tx/:txid`)

Displays batch commitment transaction details (on-chain):
- Transaction ID with copy button and a mempool.space external link
- Started/ended timestamps
- Total input/output amounts and VTXO counts
- Batch list (each batch: amount, VTXO count, expiration, swept status)
- VTXO tree visualization
- Raw transaction hex (expandable)
- Inputs link to mempool.space and show a "Commitment tx" cross-link to the originating settlement (when present)
- Outputs render Bitcoin (`bc1p`/`bc1q`) addresses; batch outputs include a blue arrow linking to the batch root Arkade transaction

### Arkade Transaction View (`/tx/:txid`)

Auto-detects transaction type. If it is a commitment transaction, redirects to the commitment-tx view. Otherwise displays transaction details with timestamps, outputs, spent status, and spending transaction links.

### Address View (`/address/:address`)

Statistics dashboard and VTXO list:
- Total balance (active VTXOs), total received, total VTXOs
- Active, spent, and swept VTXO counts
- Paginated VTXO list with status badges, amounts, outpoints, timestamps, and transaction links

### Asset View (`/asset/:assetId`)

Displays asset details including metadata and amount information. Verified assets display icons automatically; unverified assets require user approval.

---

## Theme and Display

- **Theme**: Toggle light/dark mode via the theme button in the header
- **Money Unit**: Toggle between sats and BTC display using the money unit control

---

## Deployment

### Docker (Pre-built)

```bash
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

### Docker (Local Build)

```bash
docker build -t arkade-explorer .
docker run -p 8080:80 arkade-explorer
```

### Vercel / Netlify

Push to GitHub and connect the repository. SPA routing is pre-configured via `vercel.json` / `netlify.toml`. Set `VITE_INDEXER_URL` in the platform environment variables.

### Self-Hosted

```bash
pnpm build
# Serve dist/ with any static server, configure SPA fallback routing
```

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_INDEXER_URL` | Arkade Indexer API URL | Yes | https://indexer.arkadeos.com |
| `VITE_VERIFIED_ASSETS_URL` | Verified asset IDs JSON URL | No | (none) |
