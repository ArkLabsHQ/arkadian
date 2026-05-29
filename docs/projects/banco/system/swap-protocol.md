# Banco — Swap Protocol

## TLV Offer Encoding

Offers are serialized as TLV records (`type:1B | length:2B BE | value`) wrapped in an Arkade Extension packet of type `0x03`.

**Strict parsing**: decoders MUST reject unknown TLV types. The wire format is not forward-compatible — new types defined in future revisions require decoders to be updated before they can process offers containing them.

| Type | Field | Size | Required |
|------|-------|------|----------|
| `0x01` | swapPkScript | variable | Yes |
| `0x02` | wantAmount | 8B BE uint64 (sats or asset units) | Yes |
| `0x03` | wantAsset | serialized `AssetId` | For asset wants |
| `0x04` | cancelDelay | 8B BE uint64 (unix timestamp) | No |
| `0x05` | makerPkScript | 34B (raw scriptPubKey) | Yes |
| `0x07` | makerPublicKey | 32B x-only | When cancel or exit set |
| `0x08` | emulatorPubkey | 32B x-only | Yes |
| `0x09` | ratioNum | 8B BE uint64 | No (partial fill) |
| `0x0a` | ratioDen | 8B BE uint64 | No (partial fill) |
| `0x0b` | offerAsset | serialized `AssetId` | For asset offers |
| `0x0c` | exitTimelock | 1B type (`0`=blocks, `1`=seconds) + 8B BE uint64 | No |

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

## Emulator Role

> As of the May 2026 ts-sdk bump (commits `738468a`, `b928526`, `428ae68`), banco uses the **Emulator** name throughout its public API and wire format. The legacy `introspector` identifiers were removed: `0x08` is `emulatorPubkey`, the providers are `RestEmulatorProvider`, the extension packet is `EmulatorPacket`, constructors accept `emulatorUrl`, and the arkade leaf input field is `emulators: [...]` (was `introspectors`).

The fulfillment transaction routes through the emulator because:
1. The fulfill leaf requires the emulator's signature (it's the last non-arkd signer in the swap fulfill closure)
2. The emulator validates the arkade covenant script against the transaction
3. After validation, the emulator takes the finalizer role: it forwards to arkd (the **Operator**), merges arkd's checkpoint signatures, calls `FinalizeTx`, and returns the final ark tx

For partial fills, `Taker` sets `PrevArkTxField` on the ark tx input to the swap VTXO's funding tx, so the emulator can resolve `INSPECTINPUTSCRIPTPUBKEY` / `INSPECTINPUTVALUE` against the prev out.

The Operator and Emulator are liveness-only roles: either can deny service by refusing to cosign, but neither can redirect or steal funds — the covenant binds the spending transaction to pay the maker a specific amount of a specific asset to a specific scriptPubKey.
