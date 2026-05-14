# Banco — Swap Protocol

## TLV Offer Encoding

Offers are serialized as TLV records inside Ark Extension packets (type 0x03).

| Type | Field | Size | Required |
|------|-------|------|----------|
| `0x01` | swapPkScript | variable | Yes |
| `0x02` | wantAmount | 8B BE uint64 | Yes |
| `0x03` | wantAsset | UTF-8 `txid:vout` | No |
| `0x04` | cancelDelay | 8B BE uint64 | No |
| `0x05` | makerPkScript | 34B | Yes |
| `0x07` | makerPublicKey | 32B x-only | No |
| `0x08` | introspectorPubkey | 32B x-only | Yes |
| `0x09` | ratioNum | 8B BE uint64 | No (partial fill) |
| `0x0a` | ratioDen | 8B BE uint64 | No (partial fill) |
| `0x0b` | offerAsset | AssetId bytes | No |
| `0x0c` | exitTimelock | 1B type + 8B BE uint64 | No |

## Supported Swap Types

| Maker offers | Maker wants | Description |
|-------------|-------------|-------------|
| Asset | BTC | Sell asset for sats |
| BTC | Asset | Buy asset with sats |
| Asset A | Asset B | Asset-to-asset swap |

## Partial Fills

When `ratioNum` and `ratioDen` are present, the offer supports partial fills:
- `consumed = fillAmount * ratioNum / ratioDen`
- Remaining value stays in a change VTXO at the same swap address
- The covenant script validates change outputs preserve the swap contract

GCD reduction is applied to ratioNum/ratioDen before encoding.

## Fulfillment Transaction Layout

### Full Fill
```
Inputs:  [0: swap VTXO, 1+: taker VTXOs]
Outputs: [0: maker payment, 1: taker (swap value), 2?: taker BTC change]
```

### Partial Fill (Asset→BTC)
```
Inputs:  [0: swap VTXO, 1+: taker VTXOs]
Outputs: [0: change VTXO (same swap addr), 1: maker, 2: taker]
  Full:  [0: maker (BTC carrier), 1: maker, 2?: taker]
```

## Introspector Role

The fulfillment transaction routes through the introspector because:
1. The fulfill leaf requires the introspector's signature (it's part of the multisig)
2. The introspector validates the arkade covenant script against the transaction
3. After validation, it forwards to arkd, merges signatures, and finalizes
