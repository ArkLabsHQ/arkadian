# Fulmine Web Interface

Fulmine provides three complementary interfaces for interaction: a browser-based Web UI, a REST API, and a gRPC service. This document describes each interface and how to use them effectively.

## Web UI Overview

### Accessing the Dashboard

The Web UI is available at **http://localhost:7001** by default (configurable via `FULMINE_HTTP_PORT`).

The dashboard provides a user-friendly interface for all wallet operations without requiring command-line tools or API knowledge.

### Technology

- **Templating**: Templ (type-safe Go templates)
- **Interactivity**: HTMX for dynamic updates without full page reloads
- **Styling**: Tailwind CSS for responsive design
- **Real-time updates**: WebSocket connections for transaction and swap status

Templates are organized in `internal/interface/web/templates/`:
- **components/**: Reusable UI components (buttons, inputs, balance displays)
- **pages/**: Full page templates (dashboard, send, receive, settings)
- **modals/**: Dialog windows (QR scanner, seed display, Lightning connection)

### Key Features

#### Wallet Management
- **Create wallet**: Initialize new wallet with generated seed or import existing private key
- **Unlock wallet**: Decrypt wallet with password
- **Lock wallet**: Secure wallet when not in use
- **Backup seed**: View and backup mnemonic seed phrase
- **Import options**: Support for hex private keys and Nostr nsec format (NIP-19)

Password requirements:
- Minimum 8 characters
- At least one number
- At least one special character

#### Dashboard
- **Balance display**: Shows on-chain, off-chain (Ark VTXOs), and Lightning balances
- **Address book**: Quick access to receiving addresses
- **Recent transactions**: Timeline view of recent activity
- **Pending actions**: Alerts for transactions requiring settlement

#### Send Operations
- **Off-chain send**: Send funds to Ark addresses (instant, low-cost)
- **On-chain send**: Send to standard Bitcoin addresses
- **Lightning payments**: Pay Lightning invoices (requires Lightning connection)
- **Submarine swaps**: Send to Lightning via Boltz swaps
- **QR code scanner**: Scan addresses and invoices

#### Receive Operations
- **Off-chain address**: Ark address for receiving VTXOs
- **Boarding address**: On-chain address for boarding funds into Ark
- **Lightning invoice**: Generate invoices for Lightning payments
- **Reverse swaps**: Receive from Lightning to Ark via Boltz
- **QR code display**: Share addresses and invoices easily

#### Transaction History
- **Filterable list**: View all transactions by type (on-chain, off-chain, swap)
- **Transaction details**: View amounts, timestamps, status, and transaction IDs
- **Settlement actions**: Settle pending off-chain transactions
- **Export**: Download transaction history (future feature)

#### Swap Management
- **Active swaps**: Monitor submarine and reverse submarine swap status
- **Swap history**: View completed and failed swaps
- **Manual refunds**: Trigger VHTLC refunds if needed
- **Status indicators**: Real-time updates on swap progress

#### Settings
- **Server configuration**: Change Ark server URL
- **Lightning setup**: Connect to LND or CLN
- **Network selection**: Switch between mainnet, testnet, signet, regtest
- **Display preferences**: Configure units, themes, and language

## REST API

### Base URL

All REST endpoints are available at **http://localhost:7001/api/v1/**

### Authentication

**Security Warning**: Currently, the REST API has **no authentication** (tracked in issue #98). Only expose on trusted networks or localhost.

Future versions will support macaroon-based authentication similar to LND.

### Wallet Operations

#### Generate Seed
```bash
GET /api/v1/wallet/genseed
```
Returns: `{ "seed": "word1 word2 ... word12" }`

#### Create Wallet
```bash
POST /api/v1/wallet/create
Content-Type: application/json

{
  "private_key": "hex_private_key_or_nostr_nsec",
  "password": "strong_password_123!",
  "server_url": "https://ark.example.com"
}
```

#### Unlock Wallet
```bash
POST /api/v1/wallet/unlock
Content-Type: application/json

{ "password": "strong_password_123!" }
```

#### Lock Wallet
```bash
POST /api/v1/wallet/lock
Content-Type: application/json
```

#### Get Wallet Status
```bash
GET /api/v1/wallet/status
```
Returns: `{ "initialized": true, "locked": false, "syncing": false }`

### Service Operations

#### Get Receiving Address
```bash
GET /api/v1/address
```
Returns: `{ "offchain_address": "ark1...", "boarding_address": "bc1..." }`

#### Get Balance
```bash
GET /api/v1/balance
```
Returns:
```json
{
  "onchain_balance": 100000,
  "offchain_balance": 50000,
  "lightning_balance": 25000,
  "total_balance": 175000
}
```

#### Send Off-Chain
```bash
POST /api/v1/send/offchain
Content-Type: application/json

{
  "address": "ark1qx...",
  "amount": 10000
}
```

#### Send On-Chain
```bash
POST /api/v1/send/onchain
Content-Type: application/json

{
  "address": "bc1q...",
  "amount": 100000
}
```

#### Settle Transactions
```bash
GET /api/v1/settle
```
Settles pending off-chain transactions, renews expiring VTXOs, or swaps boarding UTXOs for VTXOs.

#### Get Transaction History
```bash
GET /api/v1/transactions
```
Returns array of transaction objects with details.

### VHTLC Operations

#### Refund VHTLC Without Receiver
```bash
POST /api/v1/vhtlc/refundWithoutReceiver
Content-Type: application/json

{ "preimage_hash": "abc123..." }
```

This endpoint allows unilateral refund of a VHTLC after timeout when the receiver is unavailable or uncooperative. See [vhtlc.md](./vhtlc.md) for details on refund mechanisms.

### Response Format

All endpoints return JSON with consistent structure:

**Success:**
```json
{ "data": { ... } }
```

**Error:**
```json
{ "error": "error message" }
```

## gRPC Service

### Connection Details

- **Host**: localhost
- **Port**: 7000 (configurable via `FULMINE_GRPC_PORT`)
- **TLS**: Optional (via `FULMINE_WITH_TLS`)

### Protocol Buffer Definitions

Proto files are located in `api-spec/protobuf/fulmine/v1/`:
- `wallet.proto`: Wallet service messages
- `service.proto`: Main service RPC definitions
- `notification.proto`: Streaming notification service

### Service Handlers

#### WalletService
Located in `internal/interface/grpc/handlers/wallet_handler.go`:
- `GenSeed`: Generate new mnemonic seed
- `CreateWallet`: Initialize wallet with seed/key
- `UnlockWallet`: Decrypt wallet with password
- `LockWallet`: Secure wallet
- `GetWalletStatus`: Query wallet state

#### ServiceRPC
Located in `internal/interface/grpc/handlers/service_handler.go`:
- `GetAddress`: Get receiving addresses
- `GetBalance`: Query wallet balances
- `SendOffChain`: Send Ark off-chain transaction
- `SendOnChain`: Send Bitcoin on-chain transaction
- `Settle`: Settle pending transactions
- `GetTransactions`: Query transaction history
- `PayInvoice`: Pay Lightning invoice
- `GetInvoice`: Generate Lightning invoice
- `RefundVHTLC`: Refund VHTLC output

#### NotificationService
Located in `internal/interface/grpc/handlers/notification_handler.go`:
- `SubscribeTransactions`: Stream transaction updates
- `SubscribeSwaps`: Stream swap status updates

### Using gRPC

#### With grpcurl
```bash
# List services
grpcurl -plaintext localhost:7000 list

# Get balance
grpcurl -plaintext localhost:7000 fulmine.v1.ServiceRPC/GetBalance

# Send off-chain
grpcurl -plaintext -d '{"address":"ark1...","amount":10000}' \
  localhost:7000 fulmine.v1.ServiceRPC/SendOffChain
```

#### With gRPC Client Libraries
Generate client code from proto files:
```bash
make proto
```

Example in Go:
```go
import (
    fulmineapi "github.com/ArkLabsHQ/fulmine/api-spec/protobuf/go/fulmine/v1"
    "google.golang.org/grpc"
)

conn, _ := grpc.Dial("localhost:7000", grpc.WithInsecure())
client := fulmineapi.NewServiceRPCClient(conn)

balance, _ := client.GetBalance(context.Background(), &fulmineapi.GetBalanceRequest{})
```

### Interceptors

gRPC requests pass through interceptors in `internal/interface/grpc/interceptors/`:
- **Logger**: Logs all gRPC requests and responses
- **Auth**: Validates macaroons (when enabled)
- **Error handler**: Converts errors to gRPC status codes

## Security Considerations

### Current Limitations

As noted in the repository README and issue #98:
- **No authentication** on REST API or gRPC
- **No authorization** - all operations allowed once wallet is unlocked
- **No rate limiting** - vulnerable to abuse
- **No TLS by default** - credentials sent in plaintext

### Best Practices Until Authentication Implemented

1. **Network isolation**: Only bind to localhost, use firewall rules
2. **SSH tunneling**: Access remote instances via SSH port forwarding
3. **VPN**: Run on private network or VPN
4. **Monitoring**: Log all API access
5. **Regular backups**: Backup wallet seed offline

### Wallet Encryption

The wallet seed is encrypted using AES-256 with a password-derived key. However, once unlocked, the seed remains in memory until the wallet is locked again.

## Integration Examples

### curl Example: Full Wallet Workflow
```bash
# Create wallet
curl -X POST http://localhost:7001/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"private_key":"nsec1...", "password":"MyP@ssw0rd", "server_url":"https://ark.dev"}'

# Unlock wallet
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"MyP@ssw0rd"}'

# Get balance
curl http://localhost:7001/api/v1/balance

# Send off-chain
curl -X POST http://localhost:7001/api/v1/send/offchain \
  -H "Content-Type: application/json" \
  -d '{"address":"ark1qx...", "amount":50000}'

# Lock wallet when done
curl -X POST http://localhost:7001/api/v1/wallet/lock
```

### Python Example
```python
import requests

BASE_URL = "http://localhost:7001/api/v1"

# Unlock wallet
requests.post(f"{BASE_URL}/wallet/unlock",
              json={"password": "MyP@ssw0rd"})

# Get balance
balance = requests.get(f"{BASE_URL}/balance").json()
print(f"Balance: {balance['data']['total_balance']} sats")

# Send payment
requests.post(f"{BASE_URL}/send/offchain",
              json={"address": "ark1qx...", "amount": 10000})
```

## Future Enhancements

Planned improvements for the interface layer:
- **Macaroon authentication** (issue #98)
- **WebSocket API** for real-time updates
- **GraphQL endpoint** for flexible queries
- **Mobile-responsive UI** improvements
- **Multi-language support** for Web UI
- **API versioning** for backward compatibility
