# Bancod — Preimage Claim Protocol

## Overview

The preimage claim plugin enables stateless VTXO claims gated by preimage knowledge. The bot holds an ECIES keypair; makers encrypt claim credentials to the bot's public key and attach the ciphertext as a TLV extension packet (PacketType 0x04) on the funding transaction.

## Design: Fully Stateless

- **No registration**: Maker fetches bot's pubkey via `GetSolverPubKey` RPC
- **No database**: No per-claim persistence; the bot decrypts on the fly
- **No coordination**: Maker builds the address + packet from local primitives

## Protocol Flow

### Maker Side
1. Call `GetSolverPubKey` RPC to get the bot's hex-encoded compressed secp256k1 pubkey (33 bytes / 66 hex chars)
2. ECIES-encrypt `(preimage || arkade_script)` to the bot's pubkey
3. Attach ciphertext + plaintext taptree as Arkade extension TLV packet (type 0x04)
4. Fund the resulting address

### Bot Side
1. Watches arkd tx stream via solver runtime
2. `preimage.Plugin.Match()` parses TLV extension from PSBT packet
3. ECIES-decrypts the payload using bot's private key
4. Validates the arkade-script shape (v1: `enforcePayTo` only — single-output, full-amount-to-receiver)
5. Claims the VTXO using the decrypted preimage

## Supported Arkade Scripts

Currently v1 only supports the `enforcePayTo` shape:
- Single output
- Full amount sent to receiver
- No partial amounts or multi-output scripts

## Maker Helper

`preimage.CreateClaim` builds the address + TLV packet from local primitives:
- Takes preimage, receiver address, solver pubkey
- Returns funding address and extension packet
