---
name: noa-cli
description: >
  CLI reference for noa and Ark Indexer REST API — tools for decoding and inspecting
  Bitcoin/Ark primitives. Use when working with Ark addresses, Bitcoin scripts, taproot
  trees, PSBTs, note closures, VTXOs, commitment txs, forfeit txs, or connector trees.
  Covers all noa subcommands (address, script, note, taptree, psbt) and Indexer endpoints
  (GetCommitmentTx, GetVtxos, GetVtxoTree, GetVtxoChain, GetVirtualTxs, etc.).
  Includes a step-by-step recipe for investigating any VTXO from an outpoint.
---

# noa CLI

Ark companion CLI for decoding and inspecting Bitcoin/Ark primitives.
Source: `~/code/go/noa` | Module: `github.com/louisinger/noa`
Depends on: `github.com/arkade-os/arkd/pkg/ark-lib`

## Install

```bash
go install github.com/louisinger/noa@latest
# or from source
make -C ~/code/go/noa install
```

## Commands

### address — Decode an Ark address

```bash
noa address <ark_address>
```

Output: version, HRP, signer pubkey, VTXO tapkey, pkScript (hex + asm).
Uses `arklib.DecodeAddressV0`.

### script — Decode a Bitcoin script to ASM + Ark closure

```bash
noa script <script_hex>
```

Output: ASM disassembly, then closure type and fields.
Recognized closure types:
- `MultisigClosure` — pubkeys list
- `CLTVMultisigClosure` — pubkeys + absolute locktime (blocks or seconds)
- `CSVMultisigClosure` — pubkeys + relative locktime (blocks or seconds)
- `ConditionMultisigClosure` — pubkeys + condition script
- `ConditionCSVMultisigClosure` — pubkeys + relative locktime + condition script

### note fromTxid — Generate a note closure from a txid

```bash
noa note fromTxid <txid_hex>
```

Takes a 32-byte txid as preimage hash, creates a `NoteClosure`, derives the taproot tapkey and pkScript.
Output: tapkey (hex), script (hex + asm).

### taptree decode — Decode a hex-encoded taptree

```bash
noa taptree decode <taptree_hex>
```

Decodes via `txutils.DecodeTapTree`. Output: all leaf scripts (hex + asm), then the derived pkScript (hex + asm).

### taptree encode — Encode scripts into a taptree

```bash
noa taptree encode <script1_hex> [script2_hex] ...
```

Takes one or more hex-encoded scripts, encodes into a taptree via `txutils.TapTree.Encode()`.
Output: encoded taptree (hex).

### psbt decode — Decode a PSBT with Ark extensions

```bash
noa psbt decode <psbt_base64_or_hex>
```

Auto-detects base64 vs hex input. Output:
- **Global**: version, locktime, txid
- **Inputs**: outpoint, sequence, redeem/witness scripts, BIP32 derivations, witness UTXO (value + pkScript)
- **Ark PSBT fields** (per input, when present):
  - `ConditionWitness` — witness stack items
  - `CosignerPublicKey` — index + schnorr pubkey
  - `VtxoTaprootTree` — list of script hex strings
  - `VtxoTreeExpiry` — relative locktime type + value
- **Outputs**: value, pkScript (hex + asm), redeem/witness scripts, BIP32 derivations

## Input Formats

All hex inputs are raw hex strings (no `0x` prefix). PSBT accepts both base64 and hex.
`noa script` expects raw tapscript leaf scripts (closure scripts), NOT P2TR pkScripts.

## Ark Indexer REST API

Base URL: `http://localhost:7070` (default, adjust per environment).
All GET endpoints. Responses are JSON. Pagination via `?page.size=N&page.index=I`.

### Endpoints

**Commitment TX**
- `GET /v1/indexer/commitmentTx/{txid}` — round info: batches, input/output counts, amounts, timestamps
- `GET /v1/indexer/commitmentTx/{txid}/forfeitTxs` — forfeit txids for a commitment
- `GET /v1/indexer/commitmentTx/{txid}/connectors` — connector tree nodes (`txid` + `children` map)

**Batch / VTXO Tree**
- `GET /v1/indexer/batch/{txid}/{vout}/tree` — full VTXO tree structure (nodes with children)
- `GET /v1/indexer/batch/{txid}/{vout}/tree/leaves` — leaf outpoints only
- `GET /v1/indexer/batch/{txid}/{vout}/sweepTxs` — on-chain txids that swept this batch

**VTXOs**
- `GET /v1/indexer/vtxos?outpoints={txid}:{vout}` — lookup by outpoint
- `GET /v1/indexer/vtxos?scripts={script_hex}` — lookup by pkScript
- Filters: `spendable_only`, `spent_only`, `recoverable_only`, `pending_only`, `after`, `before`

**VTXO Chain**
- `GET /v1/indexer/vtxo/{txid}/{vout}/chain` — chain of ark txs from tree leaf to this VTXO
- Each entry has: `txid`, `expiresAt`, `type` (COMMITMENT/ARK/TREE/CHECKPOINT), `spends`

**Virtual Transactions**
- `GET /v1/indexer/virtualTx/{txid}` — returns PSBT in base64 (feed directly to `noa psbt decode`)

**Assets**
- `GET /v1/indexer/asset/{asset_id}` — asset info (supply, metadata, control_asset)

### Key Response Types

`IndexerVtxo`: outpoint, createdAt, expiresAt, amount, script (pkScript hex), isPreconfirmed, isSwept, isUnrolled, isSpent, spentBy, commitmentTxids, settledBy, arkTxid, assets

`IndexerChain`: txid, expiresAt, type (COMMITMENT|ARK|TREE|CHECKPOINT), spends (parent txids)

## Recipe: Investigate a VTXO from Outpoint

Given a `{txid}:{vout}`:

### Step 1 — Get VTXO metadata
```bash
curl -s "http://localhost:7070/v1/indexer/vtxos?outpoints={txid}:{vout}" | jq
```
Note: `amount`, `script`, status flags (`isSpent`, `isSwept`, `isUnrolled`), `commitmentTxids`.

### Step 2 — Get VTXO chain (ancestry)
```bash
curl -s "http://localhost:7070/v1/indexer/vtxo/{txid}/{vout}/chain" | jq
```
Shows the chain from commitment → tree → ark txs. Identify the commitment txid (type=COMMITMENT).

### Step 3 — Inspect commitment round
```bash
curl -s "http://localhost:7070/v1/indexer/commitmentTx/{commitment_txid}" | jq
```
Shows batches, total input/output amounts and VTXO counts, timestamps, swept status.

### Step 4 — Decode the VTXO tree tx with noa
```bash
VTXO_PSBT=$(curl -s "http://localhost:7070/v1/indexer/virtualTx/{txid}" | jq -r '.txs[0]')
noa psbt decode "$VTXO_PSBT"
```
Look for: cosigner pubkeys, VTXO tree expiry, output values and pkScripts.

### Step 5 — Get and decode related txs

**Connectors:**
```bash
curl -s "http://localhost:7070/v1/indexer/commitmentTx/{commitment_txid}/connectors" | jq
CONN_PSBT=$(curl -s "http://localhost:7070/v1/indexer/virtualTx/{connector_txid}" | jq -r '.txs[0]')
noa psbt decode "$CONN_PSBT"
```

**Forfeits:**
```bash
curl -s "http://localhost:7070/v1/indexer/commitmentTx/{commitment_txid}/forfeitTxs" | jq
FORFEIT_PSBT=$(curl -s "http://localhost:7070/v1/indexer/virtualTx/{forfeit_txid}" | jq -r '.txs[0]')
noa psbt decode "$FORFEIT_PSBT"
```
Forfeit tx structure: input[0] = VTXO, input[1] = connector dust → single ASP sweep output.

**Sweep (if swept):**
```bash
curl -s "http://localhost:7070/v1/indexer/batch/{commitment_txid}/{batch_vout}/sweepTxs" | jq
```

### Step 6 — Decode scripts from PSBT outputs
Extract pkScript hex from `noa psbt decode` output, then if it's a tapscript leaf (not P2TR):
```bash
noa script <closure_script_hex>
```
Note: `noa script` decodes Ark closure scripts (MultisigClosure, CSV, CLTV, Condition variants). It does NOT decode P2TR output scripts — those are just `OP_1 <tapkey>`.

## Other Debugging Workflows

1. **Inspect a VTXO address**: `noa address <ark_addr>` → get tapkey and pkScript
2. **Decode an unknown closure**: `noa script <hex>` → identify closure type and keys
3. **Verify a note**: `noa note fromTxid <txid>` → compare derived tapkey against on-chain output
4. **Inspect taptree**: `noa taptree decode <hex>` → see all leaf scripts and derived pkScript
5. **Debug a round PSBT**: `noa psbt decode <base64>` → inspect Ark PSBT fields (cosigner keys, VTXO trees, expiries)
