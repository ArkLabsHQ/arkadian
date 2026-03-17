---
name: fulmine-prod-debug
description: >
  Debug and investigate fulmine production issues. Downloads logs and SQLite datadir from
  remote Docker containers, analyzes errors, and queries the database for root cause analysis.
  Use when: (1) investigating fulmine production errors or failures, (2) checking swap/vHTLC/delegate
  task status in prod, (3) analyzing fulmine logs for recent issues, (4) debugging VTXO or
  transaction problems on mainnet. Triggers on: "fulmine prod", "production logs", "prod errors",
  "check prod fulmine", "debug fulmine", "fulmine mainnet issue".
---

# Fulmine Production Debugger

## Production Environment
- Ark Server: `https://arkade.computer`
- Esplora: `https://mempool.space/api`
- Network: bitcoin (mainnet)
- Remote host: `178.156.153.118` (root)
- Container datadir: `/app/data` → `fulmine.db`, `sqlite.db`, `state.json`

## Scripts Location
- `~/code/scripts/fulmine/fulmine_logs.sh` — interactive log downloader (SSH → docker logs)
- `~/code/scripts/fulmine/download_fulmine_datadir.sh` — interactive datadir downloader (SSH → docker cp)
- `~/.claude/skills/fulmine-prod-debug/scripts/analyze_logs.sh` — log error analysis

## Workflow

### Step 1: Download Logs
Run the log downloader interactively — it requires user to select a container:
```bash
~/code/scripts/fulmine/fulmine_logs.sh
```
Output: `<container_name>_<timestamp>.log` in CWD (Docker JSON format: `{"log":"...","stream":"...","time":"..."}`).

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

### Step 5: Deep Investigation with noa
When log errors reference specific outpoints, txids, or Ark addresses, use the `noa-cli` skill for deeper protocol-level inspection:

- **VTXO outpoint from logs** → `noa-cli` recipe "Investigate a VTXO from Outpoint" using Ark Indexer at `https://arkade.computer` (base indexer URL: check arkd API docs for actual indexer endpoint)
- **Decode Ark address** → `noa address <ark_addr>`
- **Decode PSBT from error** → `noa psbt decode <base64>`
- **Check on-chain tx** → `curl -s "https://mempool.space/api/tx/<txid>" | jq`

### Correlation Checklist
When investigating an error:
1. Find the error timestamp in logs
2. Check if it relates to a swap, delegate task, or VTXO operation
3. Query the relevant DB table filtered by time or ID from the log
4. If outpoint/txid mentioned, use noa + Ark Indexer to inspect the protocol state
5. Check mempool.space for on-chain confirmation status
6. Cross-reference delegate_task.fail_reason with log errors for delegate failures
