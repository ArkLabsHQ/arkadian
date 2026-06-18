# ARK Faucet API Reference

## Overview

The ARK Faucet provides a simple HTTP API for distributing offchain coins. The service supports both public endpoints for requesting coins and protected admin endpoints for managing the faucet.

**Base URL:** `http://localhost:9999`

**Authentication:** Basic authentication is required for protected endpoints. Default credentials are `admin/admin` but can be configured via environment variables (`ARK_FAUCET_AUTH_USER` and `ARK_FAUCET_AUTH_PASS`).

## Public Endpoints

### GET /healthcheck

Liveness probe.

**Authentication:** None required

**Response (200 OK):** empty JSON string (`""`)

---

### POST /faucet

Sends coins to a specified address (onchain or offchain).

**Authentication:** None required

**Validation:** `address` must be non-empty and `amount` must be greater than zero, otherwise `400 Bad Request`.

**Request Body:**
```json
{
  "address": "string",  // Recipient address (onchain or offchain)
  "amount": number      // Amount in satoshis
}
```

**Response (200 OK):**
```json
{
  "txid": "string"  // Transaction ID of the transfer
}
```

**Example:**
```bash
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ark1qp2wnd2d5ky7344d9h0w6f2le7dxr8gkfvl",
    "amount": 1000
  }'
```

**Response:**
```json
{
  "txid": "abc123def456..."
}
```

**Use Cases:**
- Users requesting test coins
- Automated testing scripts
- Development environment initialization

---

### GET /address

Returns the faucet's onchain and offchain addresses.

**Authentication:** None required

**Response (200 OK):**
```json
{
  "onchain": "string",   // Bitcoin onchain address
  "offchain": "string"   // ARK offchain address
}
```

**Example:**
```bash
curl http://localhost:9999/address
```

**Response:**
```json
{
  "onchain": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "offchain": "ark1qp2wnd2d5ky7344d9h0w6f2le7dxr8gkfvl"
}
```

**Use Cases:**
- Checking where to send funds to the faucet
- Verifying faucet configuration
- Documentation and user guidance

---

## Protected Endpoints

All protected endpoints require HTTP Basic Authentication.

### GET /balance

Returns the current balance of the faucet in both onchain and offchain funds.

**Authentication:** Required (Basic Auth)

**Response (200 OK):**
```json
{
  "onchain": number,    // Balance in satoshis (onchain)
  "offchain": number    // Balance in satoshis (offchain)
}
```

**Example:**
```bash
curl -u admin:admin http://localhost:9999/balance
```

**Response:**
```json
{
  "onchain": 0,
  "offchain": 50000
}
```

**Use Cases:**
- Monitoring faucet balance
- Determining when to refill
- Alerting when balance is low
- Dashboard displays

---

### POST /refill

Automatically mints and redeems new notes to refill the faucet balance.

**Authentication:** Required (Basic Auth)

**Requirements:**
- Notes are minted against the arkd admin API at `ARK_FAUCET_SERVER_ADMIN_URL` (falls back to `ARK_FAUCET_SERVER_URL`)
- `ARK_FAUCET_SERVER_DATADIR` is optional — only needed when arkd enforces macaroons/TLS. When set, the admin macaroon is read from `<datadir>/macaroons/admin.macaroon` and (for HTTPS admin URLs) the TLS cert from `<datadir>/tls/cert.pem`
- Works without a datadir against a NO_MACAROONS/no-TLS arkd (e.g. arkade-regtest)

**Query Parameters:**
- `amount` (required): Amount in satoshis to refill. Amounts above `uint32` max are rejected with `400`.

**Response (200 OK):**
```json
{
  "txid": "string"
}
```

**Example:**
```bash
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=5000"
```

**Response:**
```json
{
  "txid": "abc123def456..."
}
```

**Use Cases:**
- Quick balance top-up
- Automated refill scripts
- Emergency balance restoration
- Scheduled maintenance tasks

**Notes:**
- This endpoint mints new notes via the arkd admin API and redeems them into the faucet wallet
- Minted note values are not logged

---

### POST /refill-with-notes

Redeems existing notes to add balance to the faucet.

**Authentication:** Required (Basic Auth)

**Request Body:**
```json
{
  "notes": ["string"]  // Array of note strings to redeem
}
```

**Response (200 OK):**
```json
{
  "txid": "string"
}
```

**Example:**
```bash
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{
    "notes": [
      "ark1note1abc123...",
      "ark1note2def456..."
    ]
  }'
```

**Response:**
```json
{
  "txid": "abc123def456..."
}
```

**Use Cases:**
- Initial faucet setup with pre-generated notes
- Refilling from external note sources
- Manual balance management
- Air-gapped refill operations

**Notes:**
- Notes can be provided during startup via `ARK_FAUCET_NOTES` environment variable
- This endpoint allows adding more notes after startup
- Notes must be valid and unredeemed
- Invalid notes will cause the operation to fail

---

## Error Responses

### 400 Bad Request
Invalid input parameters or malformed request.

```json
{
  "error": "Invalid request: missing address field"
}
```

**Common Causes:**
- Missing required fields
- Invalid amount (negative or zero)
- Malformed JSON

---

### 401 Unauthorized
Missing or invalid authentication credentials.

```json
{
  "error": "Unauthorized"
}
```

**Common Causes:**
- Missing Authorization header
- Wrong username or password
- Attempting to access protected endpoint without credentials

---

### 404 Not Found
Endpoint not available or not found.

```json
{
  "error": "Endpoint not found"
}
```

**Common Causes:**
- Incorrect URL path

---

### 500 Internal Server Error
Server-side error during request processing.

```json
{
  "error": "Failed to send transaction: insufficient balance"
}
```

**Common Causes:**
- Insufficient faucet balance
- ARK server connection failure
- Wallet operation errors
- Invalid note redemption

---

## Rate Limiting

The ARK Faucet does not implement built-in rate limiting. For production deployments, implement rate limiting at the reverse proxy level (e.g., nginx, Caddy).

**Recommended Configuration:**
- Limit `/faucet` endpoint to 10 requests per IP per hour
- Protect admin endpoints with IP whitelisting
- Implement exponential backoff for repeated failures

**Example nginx configuration:**
```nginx
limit_req_zone $binary_remote_addr zone=faucet:10m rate=10r/h;

location /faucet {
    limit_req zone=faucet burst=5;
    proxy_pass http://localhost:9999;
}
```

---

## Content Types

**Request Content-Type:** `application/json` for POST requests with body

**Response Content-Type:** `application/json`

---

## CORS

CORS is enabled for all endpoints. The service sends `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type, Authorization`, and answers `OPTIONS` preflight requests with `200 OK`.

---

## Best Practices

1. **Use HTTPS in production:** Always deploy behind a reverse proxy with TLS
2. **Secure credentials:** Change default admin credentials via environment variables
3. **Monitor balance:** Set up automated alerts when balance drops below threshold
4. **Implement rate limiting:** Prevent abuse via proxy-level rate limits
5. **Log requests:** Monitor faucet usage and detect suspicious patterns
6. **Backup wallet data:** Regularly backup `ARK_FAUCET_DATADIR` contents
7. **Validate amounts:** Implement reasonable min/max limits at application level
