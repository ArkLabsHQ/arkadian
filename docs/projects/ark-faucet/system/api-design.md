# API Design: ARK Faucet

## API Structure

ARK Faucet provides a RESTful HTTP API with JSON request/response format. The API is designed for simplicity with a clear separation between public and protected endpoints.

### Design Principles

- **Simplicity**: Minimal request/response structures
- **Standard HTTP**: Uses conventional methods (GET, POST) and status codes
- **JSON Format**: All payloads use application/json content type
- **Selective Authentication**: Public endpoints for faucet, auth-required for admin
- **Stateless**: No session management, basic auth per request

## Endpoint Design

### POST /faucet

**Purpose**: Distribute coins to any valid address (public endpoint)

**Authentication**: None required

**Request Format**:
```json
{
  "address": "bc1q...",
  "amount": 1000
}
```

**Response Format**:
```json
{
  "txid": "abc123..."
}
```

**Behavior**:
- Rejects empty address or zero amount with 400
- Automatically detects onchain vs offchain address
- Routes to appropriate transaction type
- Returns transaction ID immediately (async settlement)
- No rate limiting (implement externally if needed)

**Error Responses**:
- 400 Bad Request: empty address, zero amount, or malformed JSON
- 500 Internal Server Error: SDK or server communication failure

### GET /healthcheck

**Purpose**: Public liveness probe

**Authentication**: None required

**Response**: `200 OK` with an empty JSON string (`""`)

### GET /address

**Purpose**: Retrieve service's receiving addresses (public endpoint)

**Authentication**: None required

**Request**: No body

**Response Format**:
```json
{
  "onchain": "bc1q...",
  "offchain": "ark1..."
}
```

**Behavior**:
- Calls SDK's `Receive()` method
- Returns both address types simultaneously
- Addresses may change between calls depending on SDK behavior

**Use Case**: Allow users to send funds to the faucet service

### GET /balance

**Purpose**: Check current service balance (protected endpoint)

**Authentication**: Basic authentication required

**Request**: No body

**Response Format**:
```json
{
  "onchain": 0,
  "offchain": 50000
}
```

**Behavior**:
- Queries SDK for current balance
- Onchain balance typically zero (offchain-only wallet)
- Offchain balance represents spendable VTXOs
- Protected to prevent information disclosure

**Authorization**:
- Requires `Authorization: Basic <base64(username:password)>` header
- Credentials configured via `ARK_FAUCET_AUTH_USER` and `ARK_FAUCET_AUTH_PASS`
- Returns 401 Unauthorized if credentials invalid

### POST /refill

**Purpose**: Automatically refill service balance using admin macaroon (protected endpoint)

**Authentication**: Basic authentication required

**Request**: Query parameter `amount`
```
POST /refill?amount=5000
```

**Response Format**:
```json
{
  "txid": "def456..."
}
```

**Behavior**:
1. Resolves the admin URL (`ARK_FAUCET_SERVER_ADMIN_URL`, falling back to `ARK_FAUCET_SERVER_URL`)
2. Reads `admin.macaroon` from the arkd datadir if one is configured; otherwise skips the macaroon header
3. Loads TLS certificate when the admin URL is HTTPS and a cert is present
4. Calls the admin API's `/v1/admin/note` endpoint to mint notes
5. Temporarily zeroes arkd's intent fees around the redeem (see Refill Mechanism Details), then redeems received notes
6. Returns redemption transaction ID

**Requirements**:
- `ARK_FAUCET_SERVER_DATADIR` is optional — only needed when arkd enforces macaroons/TLS
- Works against a NO_MACAROONS/no-TLS arkd (e.g. arkade-regtest) with no datadir

**Error Responses**:
- 401 Unauthorized: Missing or invalid credentials
- 400 Bad Request: Missing/invalid amount, or amount above `uint32` max
- 500 Internal Server Error: network error, mint or redemption failure

### POST /refill-with-notes

**Purpose**: Manually refill balance by redeeming provided notes (protected endpoint)

**Authentication**: Basic authentication required

**Request Format**:
```json
{
  "notes": [
    "note1_base64_encoded...",
    "note2_base64_encoded..."
  ]
}
```

**Response Format**:
```json
{
  "txid": "ghi789..."
}
```

**Behavior**:
- Validates notes array is not empty
- Temporarily zeroes arkd's intent fees around the redeem (see Refill Mechanism Details)
- Calls SDK's `RedeemNotes()` method
- Waits for redemption round to complete
- Returns transaction ID

**Use Case**: Redeem notes obtained from external sources or manual minting

**Error Responses**:
- 401 Unauthorized: Missing or invalid credentials
- 400 Bad Request: Empty notes array
- 500 Internal Server Error: Redemption failure

## Authentication

### Public Endpoints
- `/faucet`: No authentication required
- `/address`: No authentication required
- `/healthcheck`: No authentication required

All endpoints are served with permissive CORS headers (`Access-Control-Allow-Origin: *`) and handle `OPTIONS` preflight requests.

Design rationale: These endpoints need to be publicly accessible for the faucet to be useful. The faucet endpoint should be the primary entry point for users.

### Protected Endpoints
- `/balance`: Requires basic auth
- `/refill`: Requires basic auth
- `/refill-with-notes`: Requires basic auth

Design rationale: Admin operations should be restricted to prevent unauthorized balance queries and refill attempts.

### Basic Authentication Flow

1. Client sends request with `Authorization` header
2. Server extracts and decodes base64 credentials
3. Server compares with configured `ARK_FAUCET_AUTH_USER` and `ARK_FAUCET_AUTH_PASS`
4. If match: Process request
5. If mismatch: Return 401 Unauthorized

Example header:
```
Authorization: Basic YWRtaW46YWRtaW4=
```
(base64 encoding of "admin:admin")

### Security Considerations

**Default Credentials**: The service defaults to `admin:admin` which MUST be changed in production. These are intentionally weak defaults to simplify development.

**No Token System**: Basic auth was chosen for simplicity. For production use, consider:
- HTTPS to encrypt credentials in transit
- API keys or JWT tokens for better security
- Rate limiting to prevent brute force

**Credential Storage**: Credentials are passed via environment variables, never stored in files or code.

## Error Handling

### Standard HTTP Status Codes

- **200 OK**: Successful operation
- **400 Bad Request**: Invalid request parameters or malformed JSON
- **401 Unauthorized**: Missing or invalid authentication
- **500 Internal Server Error**: SDK failure, network error, or server communication failure

### Error Response Format

```json
{
  "error": "descriptive error message"
}
```

Errors include enough detail for debugging but avoid exposing sensitive information like file paths or internal state.

### Server-Side Logging

Every request is logged once (method, path, status, latency) by a logging middleware, and every error response is also logged server-side via a `writeError` helper — 5xx at error level, 4xx at warn. Previously, error bodies were only returned to the caller and failures (e.g. "missing vtxos") were invisible in the logs.

## Refill Mechanism Details

### Automatic Refill Architecture

The `/refill` endpoint implements a privileged operation flow:

1. **Macaroon Discovery**: Reads hex-encoded macaroon from filesystem (optional)
2. **TLS Configuration**: Loads certificate for secure HTTPS connections
3. **Note Minting**: Calls arkd's admin API to mint notes with specific amount
4. **Intent-Fee Zeroing**: Reads, zeroes, and later restores arkd's intent fees around the redeem
5. **Automatic Redemption**: Immediately redeems received notes into VTXOs

All admin-API requests share an `adminDo` helper that handles the macaroon header, TLS, and response read for any method/path.

### Intent-Fee Management

A note redeem registers a fee-free intent. When arkd has intent fees enabled it rejects this with `INTENT_INSUFFICIENT_FEE`, so the wallet can't be funded and `/faucet` later fails with "missing vtxos". Both refill paths therefore:

1. Serialize via a mutex so concurrent refills can't strand fees at zero
2. `GET /v1/admin/intentFees` to read current fees
3. `POST /v1/admin/intentFees` with all fields set to `"0.0"` (arkd evaluates fees as doubles, so `"0"` is rejected)
4. Run the redeem, then restore the saved fees (even on error)

If the endpoint is unavailable (older arkd or no admin access), the redeem runs unguarded so fee-free setups still work.

### Note Minting Request

**Endpoint**: `POST {admin URL}/v1/admin/note` — where the admin URL is `ARK_FAUCET_SERVER_ADMIN_URL` (falling back to `ARK_FAUCET_SERVER_URL`)

**Headers**:
- `Content-Type: application/json`
- `X-Macaroon: <hex_encoded_macaroon>`

**Body**:
```json
{
  "amount": 5000,
  "quantity": 1
}
```

**Response**:
```json
{
  "notes": ["note_base64..."]
}
```

This privileged endpoint requires the admin macaroon, which proves authorization to mint new notes from the arkd server.

### Why Separate Refill Endpoints?

- **Automatic (`/refill`)**: Convenience for operators with filesystem access
- **Manual (`/refill-with-notes`)**: Flexibility for notes obtained externally
- **Security Separation**: Automatic refill requires additional privileges (macaroon access)
