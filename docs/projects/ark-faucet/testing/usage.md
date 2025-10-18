# ARK Faucet Usage Guide

## Quick Start (Local)

### Prerequisites
- Running arkd instance
- Go 1.21 or later installed

### Setup
1. Set the wallet password:
```bash
export ARK_FAUCET_PASSWORD=admin
```

2. Run the service:
```bash
make run
```

3. Access the faucet at `http://localhost:9999`

## Quick Start (Docker)

### Using Make
```bash
make docker-run
```

### Manual Docker Run
```bash
docker run -d \
  --name arkfaucet \
  --network nigiri \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=admin \
  -e ARK_FAUCET_SERVER_URL=http://ark:7070 \
  -v ./data:/app/faucetdata \
  arkfaucet
```

## Basic Operations

### Request Coins (Public)
```bash
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "recipient-address",
    "amount": 1000
  }'
```

Response:
```json
{
  "txid": "transaction-id"
}
```

### Check Service Addresses (Public)
```bash
curl http://localhost:9999/address
```

Response:
```json
{
  "onchain": "bc1q...",
  "offchain": "ark1..."
}
```

### Check Balance (Admin)
```bash
curl -u admin:admin http://localhost:9999/balance
```

Response:
```json
{
  "onchain": 0,
  "offchain": 50000
}
```

### Refill Balance (Admin)
```bash
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=5000"
```

Response:
```json
{
  "message": "Successfully refilled with 5000 sats"
}
```

## Common Workflows

### 1. Initialize Faucet with Notes
When starting fresh, initialize the faucet with redeemable notes:

```bash
# Set notes during startup
export ARK_FAUCET_NOTES="note1,note2,note3"
make run
```

Or redeem notes after startup:
```bash
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{
    "notes": ["note1", "note2"]
  }'
```

### 2. Distribute Coins
Users request coins from the public endpoint:

```bash
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ark1qp...",
    "amount": 1000
  }'
```

### 3. Monitor Balance
Regularly check the faucet balance:

```bash
curl -u admin:admin http://localhost:9999/balance
```

### 4. Refill When Low
When the balance is low, refill the faucet:

```bash
# Option 1: Auto-mint new notes (requires arkd datadir access)
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=10000"

# Option 2: Redeem existing notes
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["new-note-1", "new-note-2"]}'
```

## Testing with Curl

### Test Public Endpoints
```bash
# Get faucet addresses
curl http://localhost:9999/address

# Request coins
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "test-address", "amount": 500}'
```

### Test Protected Endpoints
```bash
# Check balance
curl -u admin:admin http://localhost:9999/balance

# Refill
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=5000"
```

### Test Authentication
```bash
# Should fail without credentials
curl http://localhost:9999/balance

# Should fail with wrong credentials
curl -u wrong:credentials http://localhost:9999/balance

# Should succeed with correct credentials
curl -u admin:admin http://localhost:9999/balance
```
