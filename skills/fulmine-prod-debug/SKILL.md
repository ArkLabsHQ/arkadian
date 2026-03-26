---
name: fulmine-prod-debug
description: >
  Debug and investigate fulmine production issues. Downloads logs and SQLite datadir from
  remote Docker containers, and queries the Boltz PostgreSQL database remotely. Analyzes
  errors and queries databases for root cause analysis. Use when: (1) investigating fulmine production errors or failures,
  (2) checking swap/vHTLC/delegate task status in prod, (3) analyzing fulmine logs for recent
  issues, (4) debugging VTXO or transaction problems on mainnet, (5) inspecting Boltz swap
  state in PostgreSQL. Triggers on: "fulmine prod", "production logs", "prod errors",
  "check prod fulmine", "debug fulmine", "fulmine mainnet issue", "boltz db", "boltz prod".
---

# Fulmine Production Debugger

## Production Environment
- Ark Server: `https://arkade.computer`
- Esplora: `https://mempool.space/api`
- Network: bitcoin (mainnet)
- Remote host: `178.156.153.118` (root)
- Fulmine container: `fulmine-prod` — datadir `/app/data` → `fulmine.db`, `sqlite.db`, `state.json`
- Boltz PostgreSQL container: `postgres-prod` (postgres:15.4) — DB: `boltz`, user: `postgres`, password: `postgres`, port 5432 (internal, dokploy-network)

## Scripts Location
- `~/code/scripts/fulmine/fulmine_logs.sh` — interactive log downloader (SSH → docker logs)
- `~/code/scripts/fulmine/download_fulmine_datadir.sh` — interactive datadir downloader (SSH → docker cp)
- `~/.claude/skills/fulmine-prod-debug/scripts/analyze_logs.sh` — log error analysis

## Workflow

### Step 1: Download Logs
Download **both** fulmine and boltz logs:

**Fulmine logs** — run the interactive log downloader (select the fulmine container):
```bash
~/code/scripts/fulmine/fulmine_logs.sh
```
Output: `<container_name>_<timestamp>.log` in CWD (Docker JSON format: `{"log":"...","stream":"...","time":"..."}`).

**Boltz PostgreSQL logs** — grab directly via SSH:
```bash
ssh root@178.156.153.118 "docker logs postgres-prod --tail 5000 2>&1" > postgres-prod_$(date +%Y%m%d_%H%M%S).log
```

### Step 2: Analyze Logs
Run the analysis script on the downloaded log file:
```bash
bash ~/.claude/skills/fulmine-prod-debug/scripts/analyze_logs.sh <logfile> [hours_back]
```
Default: last 24 hours. Outputs: timestamped errors, grouped error summary (deduplicated), warning count.

For manual investigation, use jq directly on the log file:
```bash
# Errors in last N hours
jq -r 'select(.log | test("error|ERR|panic|fatal"; "i")) | "\(.time) \(.log)"' <logfile>
# Specific pattern
jq -r 'select(.log | test("swap|htlc"; "i")) | "\(.time) \(.log)"' <logfile>
```

### Step 3: Download Datadir (if DB investigation needed)
Run the datadir downloader interactively:
```bash
~/code/scripts/fulmine/download_fulmine_datadir.sh
```
Output: `<container_name>_datadir_<timestamp>/` containing `fulmine.db`, `sqlite.db`, `state.json`.

### Step 4: Query SQLite DBs
See [references/db-schema.md](references/db-schema.md) for full schema and useful queries.

Key tables:
- `fulmine.db` → `swap` (status: 0=pending,1=completed,2=failed), `vhtlc`, `delegate_task` (status: 0=pending,1=processing,2=completed,3=failed), `settings`
- `sqlite.db` → `vtxo` (wallet VTXOs), `tx` (transaction history), `utxo` (on-chain UTXOs)

Common investigation queries:
```bash
# Failed swaps
sqlite3 <datadir>/fulmine.db "SELECT id, amount, datetime(timestamp,'unixepoch'), status, invoice FROM swap WHERE status=2 ORDER BY timestamp DESC LIMIT 10;"
# Failed delegate tasks
sqlite3 <datadir>/fulmine.db "SELECT id, intent_txid, fail_reason, datetime(scheduled_at,'unixepoch') FROM delegate_task WHERE status=3 ORDER BY scheduled_at DESC LIMIT 10;"
# Wallet balance (unspent VTXOs)
sqlite3 <datadir>/sqlite.db "SELECT COUNT(*), SUM(amount) FROM vtxo WHERE spent=0 AND swept=0;"
# Recent txs
sqlite3 <datadir>/sqlite.db "SELECT txid, type, amount, settled, datetime(created_at,'unixepoch') FROM tx ORDER BY created_at DESC LIMIT 10;"
```

### Step 5: Query Boltz PostgreSQL
Query the Boltz database remotely via SSH + docker exec. See [references/db-schema.md](references/db-schema.md) for full schema details.

**Run any query:**
```bash
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c \"<SQL>\""
```

**Discover schema (first time or when unsure of tables):**
```bash
# List all tables
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c '\dt'"
# Describe a specific table
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c '\d+ <tablename>'"
```

**Common investigation queries:**
```bash
# Recent swaps (last 50)
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c \"SELECT id, status, \\\"orderSide\\\", \\\"onchainAmount\\\", \\\"createdAt\\\" FROM swaps ORDER BY \\\"createdAt\\\" DESC LIMIT 50;\""
# Failed/errored swaps
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c \"SELECT id, status, \\\"failureReason\\\", \\\"createdAt\\\" FROM swaps WHERE status IN ('swap.failed', 'transaction.failed') ORDER BY \\\"createdAt\\\" DESC LIMIT 20;\""
# Recent reverse swaps
ssh root@178.156.153.118 "docker exec postgres-prod psql -U postgres -d boltz -c \"SELECT id, status, \\\"orderSide\\\", \\\"onchainAmount\\\", \\\"createdAt\\\" FROM \\\"reverseSwaps\\\" ORDER BY \\\"createdAt\\\" DESC LIMIT 50;\""
```

**Tip:** For complex queries, use a heredoc to avoid escaping issues:
```bash
ssh root@178.156.153.118 "docker exec -i postgres-prod psql -U postgres -d boltz" <<'SQL'
SELECT id, status, "onchainAmount", "createdAt"
FROM swaps
WHERE status NOT IN ('swap.successful')
ORDER BY "createdAt" DESC
LIMIT 20;
SQL
```

### Step 6: Deep Investigation with noa
When log errors reference specific outpoints, txids, or Ark addresses, use the `noa-cli` skill for deeper protocol-level inspection:

- **VTXO outpoint from logs** → `noa-cli` recipe "Investigate a VTXO from Outpoint" using Ark Indexer at `https://arkade.computer` (base indexer URL: check arkd API docs for actual indexer endpoint)
- **Decode Ark address** → `noa address <ark_addr>`
- **Decode PSBT from error** → `noa psbt decode <base64>`
- **Check on-chain tx** → `curl -s "https://mempool.space/api/tx/<txid>" | jq`

### Correlation Checklist
When investigating an error:
1. Find the error timestamp in logs (check both fulmine AND boltz/postgres logs)
2. Check if it relates to a swap, delegate task, or VTXO operation
3. Query the relevant DB table filtered by time or ID from the log
4. **For swap issues**: cross-reference fulmine `swap.id` with Boltz `swaps.id` or `reverseSwaps.id` — check if Boltz sees a different status than fulmine
5. If outpoint/txid mentioned, use noa + Ark Indexer to inspect the protocol state
6. Check mempool.space for on-chain confirmation status
7. Cross-reference delegate_task.fail_reason with log errors for delegate failures
8. **For stuck swaps**: compare fulmine swap timestamp with Boltz swap `createdAt` and check Boltz `failureReason`
