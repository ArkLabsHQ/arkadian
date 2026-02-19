# Arkade Escrow - Quick Start Guide

## Prerequisites

- **Node.js >= 20** (24 recommended, see `.tool-versions`)
- **npm >= 10**
- **Nigiri** running with `--ark` flag (for E2E/acceptance tests)

## Quick Setup

```bash
npm install
cp .env.example .env  # Edit with your configuration
npm run dev            # Starts server + client + backoffice concurrently
```

Access points:
- Swagger UI: `http://localhost:3002/api/v1/docs`
- Client App: `http://localhost:3002/client/`
- Backoffice: `http://localhost:3002/backoffice/`

## User Signup (Schnorr Challenge-Response)

### Step 1: Request a challenge

```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/challenge \
  -H "Content-Type: application/json" \
  -d '{"publicKey": "YOUR_X_ONLY_PUBLIC_KEY_HEX"}'
```

Returns `{ challengeId, hashToSignHex }`.

### Step 2: Sign the challenge with your private key (Schnorr/BIP340)

### Step 3: Verify and get JWT

```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/verify \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "YOUR_PUBLIC_KEY",
    "signature": "SCHNORR_SIGNATURE_HEX",
    "challengeId": "CHALLENGE_ID"
  }'
```

Returns `{ accessToken, userId, publicKey }`. Save the `accessToken`.

## Swagger UI Authentication

1. Open `http://localhost:3002/api/v1/docs`
2. Click "Authorize" button
3. Enter: `Bearer YOUR_ACCESS_TOKEN`
4. Click "Authorize"

## Basic Escrow Workflow

### 1. Create an Escrow Request

```bash
curl -X POST http://localhost:3002/api/v1/escrows/requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"side": "receiver", "amount": 12345, "description": "Payment for services", "public": true}'
```

### 2. Accept the Request (Counterparty)

The counterparty accepts, creating a contract with a deterministic Ark address:

```bash
curl -X POST http://localhost:3002/api/v1/escrows/requests/EXTERNAL_ID/accept \
  -H "Authorization: Bearer COUNTERPARTY_TOKEN"
```

### 3. Fund the Contract

Send Bitcoin VTXOs to the contract's `arkAddress`.

### 4. Execute (Direct Settlement)

```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID/execute \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"arkAddress": "DESTINATION_ARK_ADDRESS"}'
```

### 5. Sign the Execution (Both Parties)

Each party signs the PSBT and submits their signature via `PATCH /executions/:id`.

## Health Check

```bash
curl http://localhost:3002/health
```
