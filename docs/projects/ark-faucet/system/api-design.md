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
- Validates address format and amount
- Automatically detects onchain vs offchain address
- Routes to appropriate transaction type
- Returns transaction ID immediately (async settlement)
- No rate limiting (implement externally if needed)

**Error Responses**:
- 400 Bad Request: Invalid address or amount
- 500 Internal Server Error: SDK or server communication failure

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
1. Reads admin.macaroon from arkd datadir
2. Loads TLS certificate if HTTPS connection
3. Calls arkd's `/v1/admin/note` endpoint to mint notes
4. Automatically redeems received notes
5. Returns redemption transaction ID

**Requirements**:
- `ARK_FAUCET_SERVER_DATADIR` must be configured
- Admin macaroon must exist at `<datadir>/macaroons/admin.macaroon`
- Service must have filesystem access to arkd datadir
- TLS cert required at `<datadir>/tls/cert.pem` for HTTPS

**Error Responses**:
- 401 Unauthorized: Missing or invalid credentials
- 400 Bad Request: Missing amount parameter
- 500 Internal Server Error: Macaroon not found, network error, redemption failure

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

## Refill Mechanism Details

### Automatic Refill Architecture

The `/refill` endpoint implements a privileged operation flow:

1. **Macaroon Discovery**: Reads hex-encoded macaroon from filesystem
2. **TLS Configuration**: Loads certificate for secure HTTPS connections
3. **Note Minting**: Calls arkd's admin API to mint notes with specific amount
4. **Automatic Redemption**: Immediately redeems received notes into VTXOs

### Note Minting Request

**Endpoint**: `POST {ARK_FAUCET_SERVER_URL}/v1/admin/note`

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
