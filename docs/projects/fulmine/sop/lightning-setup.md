# Lightning Network Setup

## Overview
Optional Lightning integration for swaps and liquidity management.
**Note:** Fulmine works without Lightning as Ark wallet.

## LND Setup

**1. Install:**
```bash
docker pull lightninglabs/lnd:latest
```

**2. Start (Regtest):**
```bash
lnd --bitcoin.active --bitcoin.regtest --bitcoin.node=bitcoind \
    --bitcoind.rpchost=localhost:18443 --bitcoind.rpcuser=user \
    --bitcoind.rpcpass=password \
    --bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332 \
    --bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333
```

**3. Create Wallet:**
```bash
lncli create
```

**4. Generate lndconnect URL:**
```bash
docker exec -i lnd bash -c \
  'echo -n "lndconnect://lnd:10009?cert=$(grep -v CERTIFICATE /root/.lnd/tls.cert \
     | tr -d = | tr "/+" "_-")&macaroon=$(base64 /root/.lnd/data/chain/bitcoin/regtest/admin.macaroon \
     | tr -d = | tr "/+" "_-")"' | tr -d '\n'
```

**5. Configure Fulmine:**
```bash
export FULMINE_LND_URL="localhost:10009"
export FULMINE_LND_DATADIR="~/.lnd"
```

Or via Web UI: Settings → Lightning → Paste lndconnect URL → Connect

**6. Verify:**
```bash
curl http://localhost:7001/api/v1/lightning/status
```

## CLN Setup

**1. Install:**
```bash
docker pull elementsproject/lightningd:latest
```

**2. Start (Regtest):**
```bash
lightningd --network=regtest \
  --bitcoin-rpcconnect=localhost --bitcoin-rpcport=18443 \
  --bitcoin-rpcuser=user --bitcoin-rpcpassword=password
```

**3. Configure:**
```bash
export FULMINE_CLN_URL="unix:///root/.lightning/bitcoin/lightning-rpc"
export FULMINE_CLN_DATADIR="~/.lightning"
```

**Nigiri:**
```bash
export FULMINE_CLN_DATADIR="~/Library/Application Support/Nigiri/volumes/lightningd/regtest/"
```

**4. Verify:**
```bash
lightning-cli --network=regtest getinfo
curl http://localhost:7001/api/v1/lightning/status
```

## Testing
```bash
curl http://localhost:7001/api/v1/lightning/info
lncli addinvoice --amt 10000  # LND
lightning-cli invoice 10000000 "label" "desc"  # CLN
```

## Use Cases
- Channel balancing via swaps
- Liquidity optimization
- Payment routing

## Without vs With Lightning
**Without:** Ark wallet, on-chain, VTXO management
**With:** + Submarine/reverse swaps, Lightning payments

## Troubleshooting

**Connection refused:**
- Check node running: `lncli getinfo` / `lightning-cli getinfo`
- Verify URL, firewall, TLS cert

**Auth failed:**
- Check macaroon exists, readable
- Correct datadir, permissions
- Use admin macaroon

**Timeout:**
- Node synced to blockchain
- Network connectivity
- Sufficient resources

**Logs:**
```bash
docker logs fulmine
tail -f ~/.lnd/logs/bitcoin/regtest/lnd.log  # LND
tail -f ~/.lightning/bitcoin/regtest/log     # CLN
```

**Best Practices:** Test on regtest, keep synced, monitor liquidity, regular backups, use Docker volumes
