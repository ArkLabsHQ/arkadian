# Arkade Explorer -- Integration with Ark Ecosystem

## Overview

Arkade Explorer integrates with the Ark protocol ecosystem through the **Arkade Indexer API**, a REST service that provides indexed access to commitment transactions, VTXOs, and asset data managed by arkd. The explorer does not connect to arkd directly; it consumes pre-indexed data from the indexer.

## Integration Architecture

```
+-------------------+
|  Arkade Explorer  |
|  (React SPA)      |
+--------+----------+
         |
         | REST (HTTPS)
         v
+-------------------+         +-------------------+
|  Arkade Indexer   | <------ |  arkd Server      |
|  API              |  index  |  (Ark Protocol)   |
+-------------------+         +-------------------+
```

## Data Sources

### Arkade Indexer API

The primary data source, configured via `VITE_INDEXER_URL` environment variable.

**Default endpoint**: `https://indexer.arkadeos.com`

**SDK Client**: The explorer uses `@arkade-os/sdk` to instantiate an indexer client (`arkClient`), which provides typed methods for all API calls. See `src/lib/api/indexer.ts`.

**Pagination**: The `fetchAllPages()` helper in `src/lib/api/fetchAllPages.ts` handles paginated responses by repeatedly calling the SDK method until all pages are fetched.

### Verified Assets Registry

Secondary data source for asset icon verification, configured via `VITE_VERIFIED_ASSETS_URL`.

**Default endpoint**: `https://arklabshq.github.io/asset-registry/mutinynet.json`

Returns a JSON array of verified asset ID strings. Only verified or user-approved assets display icons in the explorer.

## API Endpoints Used

### Server Info
Fetched once on app load via `ServerInfoContext`, provides network information (e.g., network type, server pubkey). Cached with `staleTime: Infinity`.

### Commitment Transactions
Retrieves commitment transaction details including batches, input/output amounts, VTXO counts, and timestamps.

### VTXOs
Retrieves VTXOs filtered by scripts (addresses) or outpoints. Used by the AddressPage to display all VTXOs for a given address (paginated), and by `TransactionDetail` on commitment-tx pages to fetch VTXOs for each input outpoint and surface the originating settlement commitment tx (`settledBy`) as a cross-link.

### Transactions
Retrieves Arkade transaction details (off-chain transactions). Used by TransactionPage to detect transaction type and display details.

### Assets
Retrieves asset details by asset ID. Used by AssetPage via the `useAssetDetails` hook.

## Integration with Arkade Assets

The explorer displays Arkade Assets (fungible/non-fungible tokens on the Ark protocol):

1. **Asset Page** (`/asset/:assetId`): Displays asset details fetched from the indexer
2. **AssetAmountDisplay**: Formats asset amounts with proper denomination
3. **AssetBadge**: Visual badge for asset identification
4. **Asset Verification**: The `AssetIconApprovalContext` checks asset IDs against the verified assets registry. Only verified assets show icons automatically; users can manually approve icons for unverified assets.

## Related Projects

| Project | Integration Type | Description |
|---------|-----------------|-------------|
| `arkd` | Indirect (via Indexer) | Source of all protocol data |
| `arkade-assets` | Data Consumer | Displays asset details and metadata |
| `@arkade-os/sdk` | Library Dependency | TypeScript SDK for API client and types |
| `wallet` | Sibling Frontend | Both use same SDK; users may cross-reference data |

## Configuration

```env
# Required: Arkade Indexer API URL
VITE_INDEXER_URL=https://indexer.arkadeos.com

# Optional: Verified assets registry URL
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

To use a local indexer (e.g., for development against a regtest arkd):

```bash
echo "VITE_INDEXER_URL=http://localhost:7070" > .env.local
pnpm dev
```

## Error Handling

- API connection failures display user-friendly error messages via the ErrorMessage component
- TanStack Query provides automatic retry (1 retry configured) and loading states
- Network disconnection is handled gracefully with error state rendering
- Invalid transaction IDs, addresses, or asset IDs show appropriate "not found" messages
