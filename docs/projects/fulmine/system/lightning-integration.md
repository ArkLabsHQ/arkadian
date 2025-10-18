# Fulmine Lightning Network Integration

Fulmine provides optional integration with Lightning Network nodes to enable Lightning payments and swaps. This document covers Lightning configuration, supported implementations, and usage patterns.

## Overview

Lightning Network support is **optional** in Fulmine. If no Lightning node is configured, Fulmine operates as an Ark-only wallet. When Lightning is configured, Fulmine can:

- Generate Lightning invoices
- Pay Lightning invoices
- Perform submarine swaps (Ark → Lightning)
- Perform reverse submarine swaps (Lightning → Ark)
- Query Lightning balance and channel status

## Supported Lightning Implementations

### LND (Lightning Network Daemon)

**LND** is the most widely used Lightning implementation, developed by Lightning Labs.

**Configuration options:**

1. **lndconnect URL** (recommended):
   ```bash
   FULMINE_LND_URL="lndconnect://lnd:10009?cert=<base64_cert>&macaroon=<base64_macaroon>"
   ```
   The lndconnect format bundles host, port, TLS certificate, and admin macaroon in one URL.

2. **Host + datadir**:
   ```bash
   FULMINE_LND_URL="localhost:10009"
   FULMINE_LND_DATADIR="/home/user/.lnd"
   ```
   Fulmine reads `tls.cert` and `admin.macaroon` from the datadir.

**LND adapter implementation:**
- Location: `internal/infrastructure/lnd/service.go`
- Protocol: gRPC
- Authentication: TLS certificate + macaroon
- Required macaroon: `admin.macaroon` (for full functionality)

**Generating lndconnect URL:**
```bash
# On the machine running LND
lncli --network=mainnet connect
# Or manually construct:
echo -n "lndconnect://$(hostname):10009?cert=$(grep -v CERTIFICATE ~/.lnd/tls.cert | tr -d = | tr '/+' '_-')&macaroon=$(base64 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d = | tr '/+' '_-')"
```

### CLN (Core Lightning)

**CLN** (formerly c-lightning) is the reference Lightning implementation from Blockstream.

**Configuration options:**

1. **clnconnect URL**:
   ```bash
   FULMINE_CLN_URL="clnconnect://cln:9835?cert=<base64_cert>&rune=<base64_rune>"
   ```

2. **Host + datadir**:
   ```bash
   FULMINE_CLN_URL="localhost:9835"
   FULMINE_CLN_DATADIR="/home/user/.lightning"
   ```
   Fulmine reads certificates and runes from the datadir.

**CLN adapter implementation:**
- Location: `internal/infrastructure/cln/service.go`
- Protocol: REST API or Unix socket
- Authentication: Runes (CLN's authorization tokens)

**Generating clnconnect URL:**
```bash
# On the machine running CLN
lightning-cli listconfigs | grep lightning-dir
# Construct URL with rune and cert from datadir
```

### Choosing Between LND and CLN

**Use LND if:**
- You need maximum ecosystem compatibility (mobile apps, watchtowers, etc.)
- You prefer gRPC APIs
- You want extensive tooling and documentation

**Use CLN if:**
- You prefer REST APIs or Unix sockets
- You want the reference implementation
- You prioritize minimalism and flexibility

**Cannot use both**: Fulmine supports only one Lightning implementation at a time. Setting both `FULMINE_LND_URL` and `FULMINE_CLN_URL` will result in an error.

## Configuration

### Environment Variables

```bash
# LND configuration
FULMINE_LND_URL="lndconnect://localhost:10009?cert=...&macaroon=..."
# OR
FULMINE_LND_URL="localhost:10009"
FULMINE_LND_DATADIR="/home/user/.lnd"

# CLN configuration
FULMINE_CLN_URL="clnconnect://localhost:9835?cert=...&rune=..."
# OR
FULMINE_CLN_URL="localhost:9835"
FULMINE_CLN_DATADIR="/home/user/.lightning"
```

### Web UI Configuration

1. Navigate to **Settings** → **Lightning**
2. Paste lndconnect or clnconnect URL
3. Click **Connect**
4. Verify connection status shows "Connected"

The UI automatically detects the URL format (LND vs CLN) and configures the appropriate adapter.

### Validation

On startup, Fulmine validates Lightning configuration:
- Cannot set both LND and CLN URLs simultaneously
- If URL is provided, datadir must also be provided (unless using connect URL format)
- Checks that certificates and credentials exist and are readable

## Lightning Client Interface

Fulmine defines an abstract `LnClient` interface in `internal/core/ports/ln.go`:

```go
type LnClient interface {
    // Generate invoice
    CreateInvoice(ctx context.Context, amount uint64, memo string) (invoice string, err error)

    // Pay invoice
    PayInvoice(ctx context.Context, invoice string) (preimage []byte, err error)

    // Decode invoice
    DecodeInvoice(ctx context.Context, invoice string) (amount uint64, hash []byte, err error)

    // Get balance
    GetBalance(ctx context.Context) (balance uint64, err error)

    // Get node info
    GetInfo(ctx context.Context) (alias string, pubkey string, err error)
}
```

Both LND and CLN adapters implement this interface, ensuring consistent behavior regardless of the underlying implementation.

## Operations

### Generating Lightning Invoices

**Via REST API:**
```bash
curl -X POST http://localhost:7001/api/v1/lightning/invoice \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "memo": "Payment for services"}'
```

**Via gRPC:**
```bash
grpcurl -plaintext -d '{"amount":50000,"memo":"Payment"}' \
  localhost:7000 fulmine.v1.ServiceRPC/GetInvoice
```

**Via Web UI:**
1. Go to **Receive** page
2. Select **Lightning** tab
3. Enter amount and optional memo
4. Click **Generate Invoice**
5. Share QR code or invoice string

### Paying Lightning Invoices

**Via REST API:**
```bash
curl -X POST http://localhost:7001/api/v1/lightning/pay \
  -H "Content-Type: application/json" \
  -d '{"invoice": "lnbc500n1..."}'
```

**Via Web UI:**
1. Go to **Send** page
2. Select **Lightning** tab
3. Paste or scan Lightning invoice
4. Click **Pay**

The payment uses Ark funds by default. If Ark balance is insufficient, Fulmine can route the payment through a submarine swap (see [swap-system.md](./swap-system.md)).

### Querying Lightning Balance

**Via REST API:**
```bash
curl http://localhost:7001/api/v1/balance
```

Response includes Lightning balance:
```json
{
  "onchain_balance": 100000,
  "offchain_balance": 50000,
  "lightning_balance": 75000,
  "total_balance": 225000
}
```

**Via Web UI:**
Lightning balance appears in the dashboard balance display.

### Channel Management

Fulmine does not directly expose channel management operations (open, close, rebalance). Use your Lightning node's native tools for these operations:

**LND:**
```bash
lncli listchannels
lncli openchannel --node_key=<pubkey> --local_amt=<sats>
lncli closechannel --funding_txid=<txid> --output_index=<vout>
```

**CLN:**
```bash
lightning-cli listfunds
lightning-cli fundchannel <node_id> <amount>
lightning-cli close <channel_id>
```

## Integration with Swaps

Lightning integration is **critical** for swap operations:

### Submarine Swaps (Ark → Lightning)

When paying a Lightning invoice using Ark funds:
1. User provides invoice
2. Fulmine creates VHTLC on Ark with invoice payment hash
3. Boltz pays invoice on Lightning Network
4. Boltz reveals preimage and claims VHTLC

**Lightning node requirement**: Boltz's Lightning node must have a route to pay the invoice. User's Lightning node is not directly involved.

### Reverse Submarine Swaps (Lightning → Ark)

When receiving funds from Lightning to Ark:
1. Fulmine generates preimage and creates reverse swap
2. Boltz provides Lightning invoice
3. User's Lightning node pays invoice
4. Fulmine claims VHTLC with preimage

**Lightning node requirement**: User's Lightning node must be able to pay the invoice provided by Boltz. This requires sufficient outbound liquidity.

See [swap-system.md](./swap-system.md) for detailed swap workflows.

## Use Cases

### Payment Hub Operations

Payment hubs can use Fulmine with Lightning to:
- **Accept Lightning payments**: Receive payments on Lightning, store as Ark VTXOs
- **Make Lightning payments**: Use Ark liquidity to send Lightning payments
- **Route payments**: Act as Lightning routing node while managing liquidity in Ark

### Channel Liquidity Optimization

Node operators can optimize channel liquidity:
- **Add inbound capacity**: Perform submarine swap (Ark → Lightning) to receive funds on Lightning
- **Drain channels**: Perform reverse submarine swap (Lightning → Ark) to free up channel capacity
- **Rebalance**: Move funds between channels using circular routing via Ark

### Lightning Liquidity Management

For Lightning service providers:
- **Backup liquidity**: Keep reserve funds in Ark VTXOs (off-chain, low cost)
- **Just-in-time liquidity**: Swap from Ark to Lightning when needed
- **Fee optimization**: Use Ark for settlement, Lightning for routing

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to Lightning node"

**Solutions:**
- Verify Lightning node is running and accessible
- Check firewall rules allow connection to gRPC/REST port
- Confirm certificates and macaroons are valid and readable
- Test connection manually with `lncli` or `lightning-cli`

### Certificate Errors

**Problem**: "TLS certificate verification failed"

**Solutions:**
- Ensure TLS certificate matches the hostname in the URL
- Regenerate certificates if expired
- Use IP address instead of hostname in lndconnect URL if DNS is misconfigured

### Insufficient Balance

**Problem**: "Insufficient outbound capacity"

**Solutions:**
- Open more channels or rebalance existing channels
- Use submarine swap to add outbound liquidity
- Wait for incoming payments to increase outbound capacity

### Payment Routing Failures

**Problem**: "Unable to find route for payment"

**Solutions:**
- Ensure Lightning node has sufficient channels with good connectivity
- Increase fee limits (`--fee_limit` in LND, `maxfeepercent` in CLN)
- Check invoice amount is within channel capacity

### Macaroon/Rune Permissions

**Problem**: "Permission denied"

**Solutions:**
- Use `admin.macaroon` for LND (not `readonly.macaroon`)
- Generate rune with appropriate permissions for CLN
- Verify macaroon/rune is not expired

## Performance Considerations

### Lightning Payment Speed

Lightning payments are typically instant (< 1 second), but can take longer for:
- Large payments requiring multiple routes
- Payments across many hops
- Network congestion or node downtime

### Swap vs Direct Payment

**Direct Lightning payment** (when Fulmine has Lightning balance):
- Instant
- Low fees (routing fees only)
- Requires existing Lightning liquidity

**Submarine swap** (when using Ark funds):
- 10-30 seconds
- Higher fees (swap fee + routing fees)
- No prior Lightning liquidity needed

Choose direct payment when possible for speed and cost.

## Security Considerations

### Credential Storage

- **lndconnect URLs**: Contain sensitive macaroons in URL. Store securely, do not commit to git.
- **Datadirs**: Ensure file permissions restrict access to TLS certs and macaroons (chmod 600).
- **Environment variables**: Be cautious with env vars in shared environments.

### Network Exposure

- **Local only**: If Lightning node is on localhost, bind Fulmine to localhost only.
- **Remote Lightning**: Use VPN or SSH tunneling for remote Lightning connections.
- **TLS required**: Always use TLS for remote connections.

### Backup

- **Lightning state**: Backup Lightning node state separately from Fulmine.
- **Channel backups**: Use LND's Static Channel Backups (SCB) or CLN's emergency recovery.
- **Fulmine wallet**: Backup Fulmine seed independently.

## Optional Feature Note

**Fulmine can operate without Lightning.** If no Lightning configuration is provided:
- Lightning payment operations return "Lightning not configured" error
- Submarine swaps using Boltz still work (Boltz provides Lightning routing)
- Ark and on-chain operations are unaffected

This makes Lightning optional for users who only need Ark functionality.

## Future Enhancements

Planned improvements for Lightning integration:
- Support for additional Lightning implementations (LDK, Eclair)
- Advanced channel management UI
- Automated liquidity management strategies
- BOLT12 offer support (modern invoice format)
- Lightning address support (@example.com format)
