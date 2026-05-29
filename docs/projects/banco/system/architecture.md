# Banco — Architecture

## Overview

Banco is a client-side library with three core modules: Offer (TLV encoding/decoding + covenant script generation), Maker (offer creation + management), and Taker (offer discovery + fulfillment).

## Module Structure

```
@arkade-os/banco
├── Offer (offer.ts)
│   ├── TLV encode/decode (PacketType 0x03)
│   ├── Covenant script generation (fulfillScript, partialFillScript)
│   ├── VTXO taptree construction (vtxoScript)
│   └── Partial fill detection (isPartialFill)
├── Maker (maker.ts)
│   ├── createOffer() — build offer + extension packet
│   ├── getOffers() — query VTXOs at swap address
│   └── cancelOffer() — reclaim via CLTV cancel path
└── Taker (taker.ts)
    ├── fulfill() — from hex-encoded offer
    ├── fulfillByTxid() — from funding tx extension output
    └── fulfillOffer() — core fulfillment logic
```

## Dependencies

```
@arkade-os/banco
  └── @arkade-os/sdk (ArkAddress, providers, Transaction, buildOffchainTx, arkade, asset, Extension)
  └── @scure/base (hex, base64 encoding)
```

## Offer Lifecycle

```
┌─────────┐         ┌─────────────┐         ┌───────────┐
│  Maker  │         │  Ark Network │         │   Taker   │
├─────────┤         ├─────────────┤         ├───────────┤
│ 1. createOffer()  │             │         │           │
│   → offer hex     │             │         │           │
│   → extension pkt │             │         │           │
│   → swap pkScript │             │         │           │
│                   │             │         │           │
│ 2. Fund swap addr ──────────────►│         │           │
│    (with asset/BTC)│  VTXO created│        │           │
│                   │             │         │           │
│ 3. Goes offline   │             │         │           │
│                   │             │  4. Discover offer  │
│                   │             │◄──────── fulfillByTxid()
│                   │             │         │           │
│                   │  5. Fulfill │◄──────── fulfill()  │
│                   │   (atomic)  │         │           │
│                   │             │         │           │
│  Receives payment │◄────────────│         │ Receives  │
│  at makerPkScript │             │         │ swap VTXO │
└─────────┘         └─────────────┘         └───────────┘
```

## VTXO Taptree Structure

The swap VTXO has up to 3 tap leaves:

| Leaf | Script | Signers | Condition |
|------|--------|---------|-----------|
| Fulfill | Arkade covenant | emulator + server | Covenant satisfied |
| Cancel | CLTV multisig | maker + server | After cancelDelay |
| Exit | CSV multisig | maker + server | After exitTimelock |

The Arkade tap leaf is built via `arkade.ArkadeVtxoInput` with `emulators: [offer.emulatorPubkey]` (renamed from `introspectors` in the ts-sdk bump).

## Covenant Scripts

### Full Fill
Verifies: (1) output 0 pays >= wantAmount, (2) output 0 pays to makerPkScript.
For asset swaps, additionally verifies correct asset via `INSPECTOUTASSETLOOKUP`.

### Partial Fill
Three variants depending on swap direction:
- **BTC→Asset**: `btcForAssetScript` — ratio-based BTC consumption, change VTXO preservation
- **Asset→BTC**: `assetForBtcScript` — ratio-based asset consumption, BTC carrier preservation
- **Asset→Asset**: `assetForAssetScript` — ratio-based cross-asset, both carriers preserved

All partial fill scripts use `INSPECTINPUTVALUE`/`INSPECTINPUTSCRIPTPUBKEY` for change validation.
