# Fulmine API Reference

This document provides a complete reference for Fulmine's REST API and gRPC interfaces.

## Overview

Fulmine provides three main interfaces:

1. **Web UI**: Available at http://localhost:7001 by default
2. **REST API**: Available at http://localhost:7001/api
3. **gRPC Service**: Available at localhost:7000 (port 7000)

**Base URL**: `http://localhost:7001/api`

## Security Warning

**IMPORTANT**: The REST API and gRPC interfaces are currently **not protected** by authentication. This is a known limitation tracked in [issue #98](https://github.com/ArkLabsHQ/fulmine/issues/98).

**DO NOT** expose these interfaces over the public internet until authentication is implemented. The interfaces should only be accessed from trusted networks or localhost.

While the wallet seed is encrypted using AES-256 with a password, the API endpoints themselves are not protected.

## Wallet Service Endpoints

### Generate Seed

Generates a new random private key for creating a wallet.

**Endpoint**: `GET /v1/wallet/genseed`

**Request**: None

**Response**:
```json
{
  "hex": "1822f98b3a7366532d3a875fa94c97948fe8f6a71a0ca1e94587be5f4ce646d1",
  "nsec": "nsec1rq30nze6wdnn2tf6sa06jjyhj38734m2rgx2r62c2lj77n8xgmgsx4h6k0"
}
```

**Fields**:
- `hex`: 64-character hexadecimal private key
- `nsec`: Same private key in Nostr nsec (NIP-19) format

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/wallet/genseed
```

### Create Wallet

Creates a new HD wallet with the provided private key and password, then encrypts and persists the seed.

**Endpoint**: `POST /v1/wallet/create`

**Request Body**:
```json
{
  "private_key": "1822f98b3a7366532d3a875fa94c97948fe8f6a71a0ca1e94587be5f4ce646d1",
  "password": "MyStr0ng!Pass123",
  "server_url": "https://ark.server.example.com"
}
```

**Fields**:
- `private_key` (required): 64-character hex private key or Nostr nsec format
- `password` (required): Must be 8+ characters with at least one number and one special character
- `server_url` (optional): URL of the Ark server to connect to

**Response**: Empty on success

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d '{
    "private_key": "1822f98b3a7366532d3a875fa94c97948fe8f6a71a0ca1e94587be5f4ce646d1",
    "password": "MyStr0ng!Pass123",
    "server_url": "https://ark.example.com"
  }'
```

### Unlock Wallet

Unlocks the wallet using the password, making it available for operations.

**Endpoint**: `POST /v1/wallet/unlock`

**Request Body**:
```json
{
  "password": "MyStr0ng!Pass123"
}
```

**Response**: Empty on success

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password": "MyStr0ng!Pass123"}'
```

### Lock Wallet

Locks the wallet, requiring unlock before further operations.

**Endpoint**: `POST /v1/wallet/lock`

**Request Body**: Empty

**Response**: Empty on success

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/wallet/lock \
  -H "Content-Type: application/json"
```

### Get Wallet Status

Returns information about the wallet's current state.

**Endpoint**: `GET /v1/wallet/status`

**Request**: None

**Response**:
```json
{
  "initialized": true,
  "synced": true,
  "unlocked": true
}
```

**Fields**:
- `initialized`: Whether the wallet has been created with seeds
- `synced`: Whether the wallet is synchronized with the blockchain
- `unlocked`: Whether the wallet is currently unlocked

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/wallet/status
```

## Service Endpoints

### Get Address

Returns the wallet's offchain Ark address for receiving payments.

**Endpoint**: `GET /v1/address`

**Request**: None

**Response**:
```json
{
  "address": "ark1qwertyuiopasdfghjklzxcvbnm",
  "pubkey": "03a1b2c3d4e5f6..."
}
```

**Fields**:
- `address`: Ark address for receiving offchain payments
- `pubkey`: Public key associated with the address

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/address
```

### Get Balance

Returns the wallet's current balance in satoshis.

**Endpoint**: `GET /v1/balance`

**Request**: None

**Response**:
```json
{
  "amount": 100000
}
```

**Fields**:
- `amount`: Balance in satoshis

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/balance
```

### Get Onboard Address

Generates an onchain Bitcoin address for boarding funds into Ark.

**Endpoint**: `POST /v1/onboard`

**Request Body**:
```json
{
  "amount": 100000
}
```

**Fields**:
- `amount` (required): Amount in satoshis to onboard

**Response**:
```json
{
  "address": "bc1qonchainaddress..."
}
```

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/onboard \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'
```

### Send Offchain

Sends funds to another Ark address within the Ark network.

**Endpoint**: `POST /v1/send/offchain`

**Request Body**:
```json
{
  "address": "ark1receiveraddress",
  "amount": 50000
}
```

**Fields**:
- `address` (required): Destination Ark address
- `amount` (required): Amount in satoshis

**Response**:
```json
{
  "txid": "a1b2c3d4e5f6..."
}
```

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/send/offchain \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ark1receiveraddress",
    "amount": 50000
  }'
```

### Send Onchain

Sends funds to a Bitcoin onchain address.

**Endpoint**: `POST /v1/send/onchain`

**Request Body**:
```json
{
  "address": "bc1qbitcoinaddress",
  "amount": 25000
}
```

**Fields**:
- `address` (required): Destination Bitcoin address
- `amount` (required): Amount in satoshis

**Response**:
```json
{
  "txid": "a1b2c3d4e5f6..."
}
```

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/send/onchain \
  -H "Content-Type: application/json" \
  -d '{
    "address": "bc1qbitcoinaddress",
    "amount": 25000
  }'
```

### Settle

Settles pending transactions, renews VTXOs, or converts boarding UTXOs to VTXOs by participating in a round.

**Endpoint**: `GET /v1/settle`

**Request**: None

**Response**:
```json
{
  "txid": "a1b2c3d4e5f6..."
}
```

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/settle
```

### Get Transaction History

Returns the wallet's transaction history.

**Endpoint**: `GET /v1/transactions`

**Request**: None

**Response**:
```json
{
  "transactions": [
    {
      "txid": "a1b2c3d4...",
      "amount": "100000",
      "type": "boarding",
      "settled_by": "round_abc123",
      "timestamp": 1234567890
    }
  ]
}
```

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/transactions
```

## VTXO Endpoints

### Get VTXOs

Returns VTXOs filtered by state. If no filter is provided, returns all VTXOs.

**Endpoint**: `GET /v1/vtxos`

**Query Parameters** (mutually exclusive):
- `spendable_only` (bool): Filter for spendable VTXOs only
- `spent_only` (bool): Filter for spent VTXOs only
- `recoverable_only` (bool): Filter for recoverable VTXOs only

**Example**:
```bash
curl -X GET "http://localhost:7001/api/v1/vtxos?spendable_only=true"
```

### Next Settlement

Returns the next scheduled settlement time.

**Endpoint**: `GET /v1/settlement/next`

**Response**:
```json
{
  "next_settlement_at": 1234567890
}
```

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/settlement/next
```

## Chain Swap Endpoints

### Create Chain Swap

Initiates a chain swap between Ark and Bitcoin on-chain.

**Endpoint**: `POST /v1/chainswap`

**Request Body**:
```json
{
  "direction": "SWAP_DIRECTION_ARK_TO_BTC",
  "amount": 100000,
  "btc_address": "bc1q..."
}
```

**Fields**:
- `direction` (required): `SWAP_DIRECTION_ARK_TO_BTC` or `SWAP_DIRECTION_BTC_TO_ARK`
- `amount` (required): Amount in satoshis
- `btc_address` (optional): Bitcoin address for Ark→BTC swaps

**Response**:
```json
{
  "id": "swap_abc123",
  "status": "pending",
  "lockup_address": "bc1q...",
  "expected_amount": 100500,
  "timeout_block_height": 850000
}
```

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/chainswap \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "SWAP_DIRECTION_ARK_TO_BTC",
    "amount": 100000,
    "btc_address": "bc1qbitcoinaddress"
  }'
```

### List Chain Swaps

Retrieves all chain swaps.

**Endpoint**: `GET /v1/chainswaps`

**Example**:
```bash
curl -X GET http://localhost:7001/api/v1/chainswaps
```

### Refund Chain Swap

Initiates a cooperative refund for a chain swap.

**Endpoint**: `POST /v1/chainswap/{id}/refund`

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/chainswap/swap_abc123/refund
```

## Delegator Service Endpoints

The Delegator service runs on a separate port (default 7002) and must be enabled via `FULMINE_DELEGATOR_ENABLED=true`.

### Get Delegator Info

Returns info about the delegator contract including public key and fee.

**Endpoint**: `GET /v1/delegator/info` (on delegator port)

**Response**:
```json
{
  "pubkey": "03a1b2c3...",
  "fee": "100",
  "delegator_address": "ark1..."
}
```

### Delegate

Submit a delegation request to refresh VTXOs.

**Endpoint**: `POST /v1/delegate` (on delegator port)

**Request Body**:
```json
{
  "intent": {
    "message": "{...}",
    "proof": "base64_psbt..."
  },
  "forfeit_txs": ["hex_tx1", "hex_tx2"],
  "reject_replace": false
}
```

### List Delegates

Returns delegator tasks filtered by status (on wallet service port).

**Endpoint**: `GET /v1/delegates`

**Query Parameters**:
- `status` (optional): Filter by status (pending, completed, failed, cancelled)
- `limit` (optional): Max results
- `offset` (optional): Pagination offset

## VHTLC Endpoints

Virtual Hash Time-Locked Contracts (VHTLCs) enable conditional payments within Ark.

### Refund VHTLC Without Receiver

Refunds a VHTLC output without requiring the receiver's cooperation. Useful for reclaiming funds after timeout if the receiver is unavailable.

**Endpoint**: `POST /v1/vhtlc/refundWithoutReceiver`

**Request Body**:
```json
{
  "vhtlc_id": "preimage_hash_hex"
}
```

**Fields**:
- `vhtlc_id` (required): The VHTLC identifier (preimage hash in hex format)

**Response**:
```json
{
  "redeem_txid": "a1b2c3d4e5f6..."
}
```

**Example**:
```bash
curl -X POST http://localhost:7001/api/v1/vhtlc/refundWithoutReceiver \
  -H "Content-Type: application/json" \
  -d '{"vhtlc_id": "a1b2c3d4e5f6..."}'
```

### Create VHTLC

Creates a new VHTLC address with specified conditions.

**Endpoint**: `POST /v1/vhtlc`

**Request Body**:
```json
{
  "preimage_hash": "a1b2c3d4...",
  "sender_pubkey": "03...",
  "receiver_pubkey": "03...",
  "refund_locktime": 144,
  "unilateral_claim_delay": {
    "type": "LOCKTIME_TYPE_BLOCK",
    "value": 6
  }
}
```

**Response**: VHTLC details including address and taproot tree

### Claim VHTLC

Claims a VHTLC by providing the preimage.

**Endpoint**: `POST /v1/vhtlc/claim`

**Request Body**:
```json
{
  "vhtlc_id": "preimage_hash",
  "preimage": "preimage_hex"
}
```

**Response**:
```json
{
  "redeem_txid": "a1b2c3d4..."
}
```

### Settle VHTLC

Settles a VHTLC via claim (with preimage) or refund (with delegate parameters).

**Endpoint**: `POST /v1/vhtlc/settle`

**Request Body (Claim)**:
```json
{
  "vhtlc_id": "preimage_hash",
  "claim": {
    "preimage": "preimage_hex"
  }
}
```

**Request Body (Delegate Refund)**:
```json
{
  "vhtlc_id": "preimage_hash",
  "refund": {
    "delegate_params": {
      "signed_intent_proof": "base64...",
      "intent_message": "...",
      "partial_forfeit_tx": "hex..."
    }
  }
}
```

**Response**:
```json
{
  "txid": "a1b2c3d4..."
}
```

### List VHTLCs

Lists all VHTLCs or filters by VHTLC ID.

**Endpoint**: `GET /v1/vhtlc?vhtlc_id=<optional_id>`

**Response**: Array of VHTLC details

## Error Codes

Common HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Wallet locked or not initialized
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "descriptive error message"
}
```

## gRPC Reference

For detailed gRPC service definitions, refer to the protocol buffer files:

- **Wallet Service**: `api-spec/protobuf/fulmine/v1/wallet.proto`
- **Main Service**: `api-spec/protobuf/fulmine/v1/service.proto` (wallet operations, chain swaps, VTXOs, VHTLCs)
- **Delegator Service**: `api-spec/protobuf/fulmine/v1/delegator.proto` (delegation operations, runs on port 7002)
- **Types**: `api-spec/protobuf/fulmine/v1/types.proto`

The main gRPC service runs on port 7000 by default. The Delegator service runs on port 7002 (configurable) when enabled.

## Configuration

API endpoints can be configured via environment variables:

- `FULMINE_HTTP_PORT`: HTTP port for REST API and Web UI (default: 7001)
- `FULMINE_GRPC_PORT`: gRPC port for service communication (default: 7000)
- `FULMINE_DELEGATOR_PORT`: Delegator service port (default: 7002, requires `FULMINE_DELEGATOR_ENABLED=true`)

## Rate Limiting

Currently, there is no rate limiting on API endpoints. Implement your own rate limiting if exposing to multiple clients.
