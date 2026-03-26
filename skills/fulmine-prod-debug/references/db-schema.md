# Fulmine Production DB Schema

Datadir path inside container: `/app/data`
Files: `fulmine.db`, `sqlite.db`, `state.json`

## fulmine.db (Application DB)

### settings
App configuration. Single row (id=1).
Columns: api_root, server_url, esplora_url, currency, event_server, full_node, ln_url, unit, ln_datadir, ln_type (0=none,1=lnd,2=cln)

### swap
Columns: id (PK), amount, timestamp (unix), to_currency, from_currency, status (0=pending,1=completed,2=failed), invoice, funding_tx_id, redeem_tx_id, vhtlc_id (FK→vhtlc), swap_type (0=submarine,1=reverse)

### vhtlc
Virtual HTLC records.
Columns: id (PK), preimage_hash, sender, receiver, server, refund_locktime, unilateral_claim_delay_type/value, unilateral_refund_delay_type/value, unilateral_refund_without_receiver_delay_type/value

### delegate_task
Scheduled delegation tasks.
Columns: id (PK), intent_txid, intent_message, intent_proof, fee, delegator_public_key, scheduled_at (unix), status (0=pending,1=processing,2=completed,3=failed), fail_reason, commitment_txid

### delegate_task_input
Columns: task_id (FK→delegate_task), outpoint, forfeit_tx

### vtxo_rollover
Columns: address (PK), taproot_tree, destination_address

### subscribed_script
Columns: script (PK)

## sqlite.db (Wallet/SDK DB)

### vtxo
Columns: txid+vout (PK), script, amount (sats), commitment_txids (JSON array), spent_by, spent (bool), expires_at (unix), created_at (unix), preconfirmed (bool), swept (bool), settled_by, unrolled (bool), ark_txid

### tx
Columns: txid (PK), txid_type, amount (sats), type (e.g. "boarding","send","receive","settle"), settled (bool), created_at (unix), hex, settled_by

### utxo
Columns: txid+vout (PK), script, amount (sats), spent_by, spent (bool), tapscripts, spendable_at (unix), created_at (unix), delay_value, delay_type, tx

## state.json
Client config: encrypted_private_key, pubkey, signer_pubkey, server_url, explorer_url, network, forfeit_address, forfeit_pubkey, session_duration, fees, exit delays, wallet_type, dust.

## boltz (PostgreSQL — Boltz Backend)

Connection: `docker exec postgres-prod psql -U postgres -d boltz` (via SSH to `178.156.153.118`)

**Schema discovery** (run these first if tables are unknown or have changed):
```sql
-- List all tables
\dt
-- Describe a table
\d+ swaps
\d+ "reverseSwaps"
```

Key tables (column names use camelCase — always quote them):
- `swaps` — submarine swaps (ARK→Lightning). Key columns: `id`, `status`, `orderSide`, `onchainAmount`, `invoice`, `lockupAddress`, `failureReason`, `createdAt`
- `"reverseSwaps"` — reverse swaps (Lightning→ARK). Key columns: `id`, `status`, `orderSide`, `onchainAmount`, `invoice`, `transactionId`, `failureReason`, `createdAt`
- `"channelCreations"` — channel creation records

**Note:** The exact schema may evolve. Always run `\dt` and `\d+ <table>` to confirm current structure before writing complex queries.

## Useful Queries

### Boltz PostgreSQL Queries

#### Recent swaps
```sql
SELECT id, status, "orderSide", "onchainAmount", "createdAt"
FROM swaps ORDER BY "createdAt" DESC LIMIT 20;
```

#### Failed swaps
```sql
SELECT id, status, "failureReason", "onchainAmount", "createdAt"
FROM swaps WHERE status LIKE '%fail%' ORDER BY "createdAt" DESC LIMIT 20;
```

#### Recent reverse swaps
```sql
SELECT id, status, "orderSide", "onchainAmount", "createdAt"
FROM "reverseSwaps" ORDER BY "createdAt" DESC LIMIT 20;
```

#### Cross-reference with fulmine swap ID
```sql
-- Find a swap in boltz by its ID (fulmine swap.id matches boltz swaps.id)
SELECT * FROM swaps WHERE id = '<swap_id>';
SELECT * FROM "reverseSwaps" WHERE id = '<swap_id>';
```

### Fulmine SQLite Queries

### Recent failed swaps
```sql
SELECT id, amount, datetime(timestamp, 'unixepoch') as ts, to_currency, from_currency, invoice, funding_tx_id
FROM swap WHERE status = 2 ORDER BY timestamp DESC LIMIT 20;
```

### Pending swaps (possibly stuck)
```sql
SELECT id, amount, datetime(timestamp, 'unixepoch') as ts, to_currency, from_currency, invoice
FROM swap WHERE status = 0 ORDER BY timestamp DESC;
```

### Failed delegate tasks
```sql
SELECT id, intent_txid, fee, datetime(scheduled_at, 'unixepoch') as scheduled, fail_reason, commitment_txid
FROM delegate_task WHERE status = 3 ORDER BY scheduled_at DESC LIMIT 20;
```

### Pending delegate tasks
```sql
SELECT id, intent_txid, fee, datetime(scheduled_at, 'unixepoch') as scheduled, status
FROM delegate_task WHERE status IN (0,1) ORDER BY scheduled_at DESC;
```

### Expired VTXOs (wallet DB)
```sql
SELECT txid, vout, amount, datetime(expires_at, 'unixepoch') as expires, spent, swept, unrolled
FROM vtxo WHERE expires_at < strftime('%s','now') AND spent = 0 AND swept = 0
ORDER BY expires_at DESC LIMIT 20;
```

### Unspent VTXOs summary
```sql
SELECT COUNT(*) as count, SUM(amount) as total_sats, MIN(datetime(expires_at, 'unixepoch')) as earliest_expiry
FROM vtxo WHERE spent = 0 AND swept = 0;
```

### Recent transactions
```sql
SELECT txid, type, amount, settled, datetime(created_at, 'unixepoch') as created, settled_by
FROM tx ORDER BY created_at DESC LIMIT 20;
```

### UTXOs (on-chain)
```sql
SELECT txid, vout, amount, spent, datetime(spendable_at, 'unixepoch') as spendable, delay_type, delay_value
FROM utxo WHERE spent = 0 ORDER BY amount DESC;
```
