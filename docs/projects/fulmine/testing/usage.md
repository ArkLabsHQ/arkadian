# Fulmine Usage Guide

This guide covers common operations for using Fulmine, a Bitcoin wallet daemon that enables swap providers and payment hubs to optimize Lightning Network channel liquidity.

## Quick Start with Docker

### Running Fulmine

```bash
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

### Access Web UI

Navigate to http://localhost:7001 in your browser.

### View Logs

```bash
docker logs -f fulmine
```

### Stop Container

```bash
docker stop fulmine
```

### Update to Latest Version

```bash
docker pull ghcr.io/arklabshq/fulmine:latest
docker stop fulmine && docker rm fulmine
docker run -d \
  --name fulmine \
  -p 7000:7000 \
  -p 7001:7001 \
  -v fulmine-data:/app/data \
  ghcr.io/arklabshq/fulmine:latest
```

## Quick Start with Binary

### Download and Run

1. Download the latest release from [GitHub releases](https://github.com/ArkLabsHQ/fulmine/releases)
2. Extract the binary:
   ```bash
   tar -xzf fulmine-*.tar.gz  # Linux/macOS
   ```
3. Make it executable (Linux/macOS):
   ```bash
   chmod +x fulmine
   ```
4. Run the binary:
   ```bash
   ./fulmine
   ```

## First-Time Setup

### 1. Generate Seed

Generate a new private key for your wallet:

```bash
curl -X GET http://localhost:7001/api/v1/wallet/genseed
```

Response:
```json
{
  "hex": "64_character_hex_key",
  "nsec": "nsec_format_key"
}
```

Save your private key securely. You'll need it to create the wallet.

### 2. Create Wallet with Password

Create a wallet using the generated seed:

```bash
curl -X POST http://localhost:7001/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d '{
    "private_key": "your_hex_or_nsec_key",
    "password": "YourStr0ng!Pass",
    "server_url": "https://ark.server.example.com"
  }'
```

Password requirements:
- Minimum 8 characters
- At least one number
- At least one special character

### 3. Configure Ark Server (Optional)

If not specified during wallet creation, you can configure a custom Ark server using environment variables. The default Ark server is pre-filled if not specified.

## Common Operations

### Unlock Wallet

After restarting Fulmine, unlock your wallet:

```bash
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password": "YourStr0ng!Pass"}'
```

### Lock Wallet

Secure your wallet by locking it:

```bash
curl -X POST http://localhost:7001/api/v1/wallet/lock \
  -H "Content-Type: application/json"
```

### Get Receive Address

#### Get Offchain Address

```bash
curl -X GET http://localhost:7001/api/v1/address
```

Response:
```json
{
  "address": "ark1...",
  "pubkey": "03..."
}
```

#### Get Boarding Address (Onchain)

Request an onchain address to onboard funds:

```bash
curl -X POST http://localhost:7001/api/v1/onboard \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'
```

### Check Balance

```bash
curl -X GET http://localhost:7001/api/v1/balance
```

Response:
```json
{
  "amount": 100000
}
```

Amount is in satoshis.

### Send Offchain Payment

Send funds within the Ark network:

```bash
curl -X POST http://localhost:7001/api/v1/send/offchain \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ark1receiver_address",
    "amount": 50000
  }'
```

### Send Onchain Payment

Send funds to a Bitcoin address:

```bash
curl -X POST http://localhost:7001/api/v1/send/onchain \
  -H "Content-Type: application/json" \
  -d '{
    "address": "bc1qbitcoin_address",
    "amount": 25000
  }'
```

### Settle/Renew VTXOs

Settle pending transactions or renew VTXOs by participating in a round:

```bash
curl -X GET http://localhost:7001/api/v1/settle
```

This operation:
- Settles pending transactions
- Renews expiring VTXOs
- Converts boarding UTXOs to VTXOs

## Web UI Navigation

The web interface at http://localhost:7001 provides:

1. **Dashboard**: View balance and recent transactions
2. **Receive**: Generate addresses for receiving funds
3. **Send**: Send offchain or onchain payments
4. **Transactions**: View transaction history
5. **Settings**: Wallet status, lock/unlock, and configuration

## Security Notes

The REST API and gRPC interfaces are currently **not protected** by authentication. Do not expose these interfaces over the public internet. Access should be restricted to trusted networks or localhost only.

While the wallet seed is encrypted using AES-256 with your password, the API endpoints themselves have no authentication layer.
