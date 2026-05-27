# Bancod — Banco Swap Protocol

## Overview

The banco swap protocol enables atomic token/BTC swaps on the Arkade virtual mempool. A maker posts a swap offer as a VTXO with a TLV-encoded extension packet; a taker (solver bot) detects the offer and fulfills it atomically via an introspector-signed Arkade transaction.

## Offer Structure (PacketType 0x03)

Offers are encoded as TLV payloads inside Arkade extension packets:

```
Offer {
  MakerPubkey     []byte   // maker's public key
  WantAsset       string   // asset the maker wants (e.g., BTC hash)
  WantAmount      uint64   // amount the maker wants
  FulfillScript   []byte   // taproot script for fulfillment
  VtxoScript      []byte   // taproot tree from maker + introspector + signer keys
}
```

## Maker Flow

1. `contract.CreateOffer()` queries introspector for signer key
2. Derives maker address from Arkade client
3. Assembles Offer, serializes to TLV
4. Returns hex-encoded offer + extension packet + swap address
5. Maker funds the swap address with deposit asset/amount

## Taker (Solver) Flow

1. The solver runtime subscribes the banco plugin to the arkd tx stream via `arkdsource.Source.Subscribe(ctx, plugin.Filter())` — one upstream stream per plugin; the plugin's CEL filter is plumbed for forward-compatible server-side filtering (not yet active)
2. For each PSBT packet, `banco.Plugin.Match()`:
   - Decodes offer from TLV extension
   - Looks up matching pair in PairRepository
   - Range-checks WantAmount against pair min/max
   - Validates price within 1% of price feed
3. On match, `banco.Plugin.Solve()` calls `contract.FulfillOffer()`:
   - Builds Arkade tx spending swap VTXO to maker's pkScript
   - Pays WantAmount/WantAsset to maker
   - Returns change to taker
   - Signs with introspector
   - Submits to arkd

## Trading Pairs

Pairs are configured via the gRPC/REST API:
- `base/quote` format (e.g., `BTC/USDT`)
- Min/max amount bounds
- Price feed URL (CoinGecko format)
- Invert flag for inverse price calculation
- Stored in SQLite via PairRepository

## Reference

- In-repo working-draft spec: `wiki/Banco-Swap-Protocol.md` (Banco Swap Protocol V1)
