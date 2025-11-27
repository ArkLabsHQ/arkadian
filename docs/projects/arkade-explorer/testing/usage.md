# Arkade Explorer - Usage Guide

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to Arkade Indexer API (default: https://indexer.arkadeos.com)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd arkade-explorer

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
```

Or copy from the example:

```bash
cp .env.example .env
```

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` with hot reload enabled.

---

## Using the Explorer

### Searching

The explorer supports two types of searches:

**1. Transaction Search**
- Enter a 64-character hex transaction ID
- Auto-detected and routed to transaction view
- Example: `a1b2c3d4e5f6...` (64 chars)

**2. Address/Script Search**
- Enter an Arkade address or script
- Routes to address VTXO explorer
- Shows all VTXOs associated with the address

**Search Locations**:
- Homepage search bar (centered, large)
- Header search bar (compact, available on all pages)

### Transaction View

**URL**: `/commitment-tx/:txid`

**Information Displayed**:
- **Transaction ID** - With copy button
- **Timestamps** - Started and ended times
- **Amounts** - Total input and output
- **VTXO Counts** - Input and output VTXOs
- **Batches** - List of batch outputs with:
  - Batch index
  - Amount
  - VTXO count
  - Expiration time
  - Swept status
- **Raw Hex** - Expandable transaction hex

### Address View

**URL**: `/address/:address`

**Statistics Dashboard**:
| Metric | Description |
|--------|-------------|
| Total Balance | Sum of active (spendable) VTXOs |
| Total Received | All-time received amount |
| Total VTXOs | Count of all VTXOs ever received |
| Active | Currently spendable VTXOs |
| Spent | VTXOs that have been spent |
| Swept | VTXOs reclaimed by the Ark server |

**VTXO List**:
Each VTXO displays:
- Outpoint (txid:vout)
- Amount in satoshis
- Status badge (Active/Spent/Swept)
- Created timestamp
- Expiration time (if applicable)
- Links to related transactions

---

## Routes Reference

| Route | Description |
|-------|-------------|
| `/` | Home page with search and feature overview |
| `/tx/:txid` | Transaction view (auto-detects type and redirects) |
| `/commitment-tx/:txid` | Commitment transaction details |
| `/address/:address` | Address VTXO explorer |
| `/*` | 404 Not Found page |

---

## API Configuration

### Default Endpoint
```
https://indexer.arkadeos.com
```

### Custom Endpoint
To use a different indexer, update your `.env`:

```env
VITE_INDEXER_URL=https://your-indexer.example.com
```

### API Endpoints Used

**Get Commitment Transaction**:
```
GET /v1/indexer/commitmentTx/{txid}
```

**Get VTXOs by Scripts**:
```
POST /v1/indexer/vtxos
Body: { "scripts": ["<script>"] }
```

**Get VTXOs by Outpoints**:
```
POST /v1/indexer/vtxos
Body: { "outpoints": ["<txid>:<vout>"] }
```

---

## Building for Production

### Build Command

```bash
npm run build
```

Output is generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## Deployment

### Vercel

1. Push to GitHub
2. Connect repository in Vercel
3. Vercel auto-detects Vite configuration
4. Set environment variable:
   - `VITE_INDEXER_URL`: Your indexer URL

**vercel.json** handles SPA routing automatically.

### Netlify

1. Push to GitHub
2. Connect repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variable:
   - `VITE_INDEXER_URL`: Your indexer URL

**netlify.toml** handles SPA routing automatically.

### Self-Hosted

1. Build the project:
   ```bash
   npm run build
   ```

2. Serve the `dist/` directory with any static file server:
   ```bash
   # Using serve
   npx serve dist

   # Using nginx, apache, or any static server
   ```

3. Configure server for SPA fallback (route all 404s to index.html)

---

## Features Walkthrough

### 1. Search a Transaction

1. Go to homepage (`/`)
2. Enter a transaction ID in the search bar
3. Press Enter or click search
4. View transaction details

### 2. Explore an Address

1. Enter an address in the search bar
2. View balance summary
3. Browse individual VTXOs
4. Click on VTXOs for transaction details

### 3. Copy Information

- Click the copy icon next to any copyable field
- Visual feedback confirms copy success
- Works for: Transaction IDs, addresses, raw hex

### 4. View Raw Transaction

1. On a transaction page, scroll to bottom
2. Click "Show Raw Transaction"
3. View or copy the raw hex data
