# Wallet Management

## Creation

**1. Generate Seed:**
```bash
curl http://localhost:7001/api/v1/wallet/genseed
```
Returns hex (64 chars) or Nostr nsec. **Store offline, encrypted.**

**2. Create Wallet:**
```bash
curl -X POST http://localhost:7001/api/v1/wallet/create -d '{
  "private_key": "0123...abcdef",
  "password": "YourStrongPassword123!",
  "server_url": "https://ark.example.com"
}'
```

**Web UI:** http://localhost:7001 → Create Wallet → Enter seed, password, server

**Password:** Min 8 chars, 1 number, 1 special char (e.g., `MyWallet2024!`)
**Formats:** Hex (64 chars) or Nostr nsec

## Backup

**Seed (Critical):**
1. Write down complete seed
2. Verify by typing back
3. Store: home safe, bank box, encrypted digital (secondary)

**Password:** Store separately (password manager or different location)
**Database (Optional):** `$FULMINE_DATADIR/sqlite.db` (wallet recovers from seed alone)

## Recovery

Use same seed, password, Ark server:
```bash
curl -X POST http://localhost:7001/api/v1/wallet/create -d '{
  "private_key": "ORIGINAL_SEED",
  "password": "ORIGINAL_PASSWORD",
  "server_url": "https://ark.example.com"
}'
```

Auto-syncs: VTXOs, on-chain txs, balances (few minutes)

**Critical:** Same password required (no reset). Lost password = irrecoverable.

## Auto-Unlock

**File-based:**
```bash
echo "YourPassword123!" > ~/.fulmine-password
chmod 600 ~/.fulmine-password
export FULMINE_UNLOCKER_TYPE=file
export FULMINE_UNLOCKER_FILE_PATH=~/.fulmine-password
```

**Environment-based:**
```bash
export FULMINE_UNLOCKER_TYPE=env
export FULMINE_UNLOCKER_PASSWORD="YourPassword123!"
```

**Docker:**
```bash
docker run -d --name fulmine -p 7001:7001 \
  -e FULMINE_UNLOCKER_TYPE=file \
  -e FULMINE_UNLOCKER_FILE_PATH=/app/password.txt \
  -v fulmine-data:/app/data \
  -v /path/to/password.txt:/app/password.txt:ro \
  ghcr.io/arklabshq/fulmine:latest
```

**Security:** File-based for prod (not in process list), env for dev only.

## Password Change

No direct change. Process:
1. Export seed (unlocked): `curl http://localhost:7001/api/v1/wallet/seed`
2. Delete: `curl -X POST http://localhost:7001/api/v1/wallet/delete`
3. Re-create with new password

**Warning:** Verify seed before deleting.

## Multiple Wallets
```bash
docker run -d --name fulmine1 -p 7001:7001 -v wallet1:/app/data ghcr.io/arklabshq/fulmine:latest
docker run -d --name fulmine2 -p 7002:7002 -e FULMINE_HTTP_PORT=7002 -v wallet2:/app/data ghcr.io/arklabshq/fulmine:latest
```

## Security Best Practices

**Seed:**
- ✅ Paper, offline, multiple backups, encrypted digital, test recovery
- ❌ Plain text, email, screenshots, untrusted devices

**Password:**
- ✅ Strong, unique, password manager, separate from seed
- ❌ No reuse, don't share

**Operations:**
- ✅ Trusted hardware, updates, HTTPS, backups, chmod 600
- ❌ No public exposure, no root

**API:** Not authenticated (issue #98). Mitigate: localhost only, reverse proxy, firewall, logs.

## Lock/Unlock

**Lock:** `curl -X POST http://localhost:7001/api/v1/wallet/lock` (can't send, can receive)
**Unlock:** `curl -X POST http://localhost:7001/api/v1/wallet/unlock -d '{"password": "..."}'`
**Status:** `curl http://localhost:7001/api/v1/wallet/status`
