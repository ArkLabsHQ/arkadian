# Wallet Management

## Wallet Initialization

### First Start

The wallet is created automatically on first run:

```bash
export ARK_FAUCET_PASSWORD=your-secure-password
make run
```

**What happens:**
1. Service checks for existing wallet in datadir
2. If not found, creates new ARK SDK wallet
3. Wallet encrypted with ARK_FAUCET_PASSWORD
4. Wallet stored in ARK_FAUCET_DATADIR (default: ~/.arkfaucet)

### Password Requirements

- Required for all operations
- Used to encrypt/decrypt wallet
- Cannot be recovered if lost
- Store securely in password manager

### Storage Location

Default locations:
- Linux: `~/.arkfaucet/`
- macOS: `~/Library/Application Support/arkfaucet/`
- Custom: Set `ARK_FAUCET_DATADIR` environment variable

## Initial Funding Options

### Method 1: Initialize with Notes

**When to use:** First deployment with pre-generated notes

```bash
# Set notes before first start
export ARK_FAUCET_NOTES="note1,note2,note3"
export ARK_FAUCET_PASSWORD=admin
make run
```

Notes are automatically redeemed on startup. Check logs:
```
INFO: redeemed notes: <txid>
```

### Method 2: Manual Refill via Admin API

**When to use:** Service already running, need to add funds

**Requirements:**
- Running arkd instance
- Access to arkd data directory
- Admin macaroon at `~/.arkd/macaroons/admin.macaroon`

**Steps:**

1. Ensure ARK_FAUCET_SERVER_DATADIR is set:
   ```bash
   export ARK_FAUCET_SERVER_DATADIR=/path/to/.arkd
   ```

2. Use refill endpoint:
   ```bash
   curl -u admin:admin -X POST \
     "http://localhost:9999/refill?amount=50000"
   ```

This automatically:
- Calls arkd admin API to mint notes
- Redeems notes to faucet wallet
- Returns transaction ID

### Method 3: Manual Note Redemption

**When to use:** Have notes from external source

```bash
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{
    "notes": ["note1", "note2", "note3"]
  }'
```

Response:
```json
{"txId": "transaction-id"}
```

## Balance Monitoring

### Check Current Balance

```bash
curl -u admin:admin http://localhost:9999/balance
```

Response:
```json
{
  "offchain_balance": {
    "total": 100000,
    "next_expiration": "2024-10-23T12:00:00Z",
    "details": [...]
  },
  "onchain_balance": {
    "spendable": 0,
    "locked": 0
  }
}
```

### Key Metrics

- **offchain_balance.total**: Main operational balance
- **next_expiration**: When VTXOs expire (automatic rollover)
- **onchain_balance**: Usually zero for offchain-only wallet

### Monitoring Script

```bash
#!/bin/bash
# check_balance.sh

BALANCE=$(curl -s -u admin:admin http://localhost:9999/balance | \
  jq '.offchain_balance.total')

echo "Current offchain balance: $BALANCE sats"

if [ "$BALANCE" -lt 10000 ]; then
  echo "WARNING: Balance below 10,000 sats"
  exit 1
fi
```

Run periodically:
```bash
*/30 * * * * /path/to/check_balance.sh
```

### Set Up Alerts

Configure alerts when balance drops below threshold:

- Email notification
- Slack webhook
- PagerDuty integration
- Custom monitoring system

## Refilling the Faucet

### Automatic Refill (Recommended)

Uses arkd admin API to mint and redeem notes automatically.

**Prerequisites:**
- arkd running with admin API enabled
- ARK_FAUCET_SERVER_DATADIR set to arkd datadir
- Admin macaroon accessible

**Example:**

```bash
# Refill with 100,000 sats
curl -u admin:admin -X POST \
  "http://localhost:9999/refill?amount=100000"
```

**Behind the scenes:**
1. Calls `POST /v1/admin/note` on arkd
2. Receives newly minted notes
3. Redeems notes via ARK SDK
4. Returns redemption transaction ID

### Manual Refill

**When to use:**
- arkd admin API not accessible
- Notes generated externally
- Additional security layer desired

**Steps:**

1. Generate notes via arkd admin API:
   ```bash
   curl -X POST https://arkd.example.com/v1/admin/note \
     -H "X-Macaroon: <admin-macaroon>" \
     -d '{"amount": 100000, "quantity": 1}'
   ```

2. Redeem notes in faucet:
   ```bash
   curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
     -H "Content-Type: application/json" \
     -d '{"notes": ["<note-from-step-1>"]}'
   ```

## Balance Management Strategies

### Set Minimum Threshold

Maintain operational buffer:

```bash
# Never let balance drop below 50,000 sats
MIN_THRESHOLD=50000
```

### Automate Refill When Low

```bash
#!/bin/bash
# auto_refill.sh

BALANCE=$(curl -s -u admin:admin http://localhost:9999/balance | \
  jq '.offchain_balance.total')
MIN_THRESHOLD=50000
REFILL_AMOUNT=200000

if [ "$BALANCE" -lt "$MIN_THRESHOLD" ]; then
  echo "Balance low ($BALANCE), refilling with $REFILL_AMOUNT sats"
  curl -u admin:admin -X POST \
    "http://localhost:9999/refill?amount=$REFILL_AMOUNT"
fi
```

Cron job:
```bash
0 */6 * * * /path/to/auto_refill.sh
```

### Keep Reserve for Operations

Budget for:
- Expected daily distribution
- VTXO rollover fees
- Emergency withdrawals
- Network fee variations

Example calculation:
```
Daily distribution: 10,000 sats
Rollover buffer: 5,000 sats
Emergency reserve: 10,000 sats
Minimum balance: 25,000 sats
```

## Wallet Backup

### Backup Wallet Directory

**Full backup:**
```bash
tar czf arkfaucet-wallet-$(date +%Y%m%d).tar.gz ~/.arkfaucet/
```

**Docker volume backup:**
```bash
docker run --rm \
  -v arkfaucet_wallet_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/wallet-$(date +%Y%m%d).tar.gz /data
```

### Backup Password

Store ARK_FAUCET_PASSWORD securely:
- Password manager (1Password, LastPass, Bitwarden)
- Hardware security module (HSM)
- Encrypted vault
- Never in plaintext files

### Backup Schedule

Recommended:
- Daily automated backups
- Retain 30 days of backups
- Store in multiple locations
- Test restore procedure monthly

### What to Backup

Critical data:
- Wallet datadir (entire directory)
- ARK_FAUCET_PASSWORD
- Admin credentials (AUTH_USER/AUTH_PASS)
- Configuration files

Optional:
- Initial funding notes (if unused)
- Deployment documentation

## Wallet Recovery

### Recovery Procedure

1. **Restore wallet directory:**
   ```bash
   # From backup
   tar xzf wallet-backup.tar.gz -C ~/.arkfaucet/
   ```

2. **Set original password:**
   ```bash
   export ARK_FAUCET_PASSWORD=<original-password>
   ```

3. **Start service:**
   ```bash
   make run
   ```

4. **Verify wallet unlocked:**
   ```bash
   curl http://localhost:9999/address
   ```

5. **Check balance:**
   ```bash
   curl -u admin:admin http://localhost:9999/balance
   ```

### Docker Recovery

```bash
# Restore volume
docker volume create arkfaucet_wallet_data
tar xzf wallet-backup.tar.gz \
  -C /var/lib/docker/volumes/arkfaucet_wallet_data/_data

# Start with original password
export ARK_FAUCET_PASSWORD=<original>
docker-compose up -d

# Verify
docker-compose logs -f arkfaucet
```

### Recovery Checklist

- [ ] Wallet directory restored
- [ ] Correct password used
- [ ] Service starts without errors
- [ ] Address endpoint returns addresses
- [ ] Balance shows expected amount
- [ ] Test small transaction

## Security Best Practices

### Rotate Password Periodically

```bash
# Create new wallet with new password
export ARK_FAUCET_PASSWORD=<new-strong-password>
export ARK_FAUCET_DATADIR=~/.arkfaucet-new

# Transfer funds to new wallet
# 1. Start new instance on different port
# 2. Send all funds from old to new
# 3. Replace old wallet with new
```

### Limit Admin Access

- Use strong admin credentials
- Enable 2FA on reverse proxy
- Restrict admin endpoints to trusted IPs
- Use VPN for admin access

### Monitor Unusual Activity

Watch for:
- Unexpected balance changes
- High-frequency requests
- Large withdrawals
- Failed authentication attempts

### Keep Notes Secure

- Never commit notes to git
- Delete notes after redemption
- Encrypt notes at rest
- Use secure channels for sharing

### Regular Security Audits

Monthly checklist:
- [ ] Review access logs
- [ ] Check balance history
- [ ] Verify backup integrity
- [ ] Test recovery procedure
- [ ] Update credentials if needed
- [ ] Review rate limiting effectiveness
