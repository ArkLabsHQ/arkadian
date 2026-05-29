# Banco — Usage Guide

## Installation

```sh
pnpm add @arkade-os/banco
```

## Creating an Offer (Maker)

```ts
import { Maker } from "@arkade-os/banco";

const maker = new Maker(wallet, arkServerUrl, emulatorUrl);

const { offer, swapPkScript, packet } = await maker.createOffer({
  wantAmount: 10_000n,    // 10k sats
  cancelDelay: 86400,     // cancellable after 24h
});

// Fund the swap address with the asset to sell
await wallet.send({ address: swapAddress, amount: 50_000 });
```

## Fulfilling an Offer (Taker)

```ts
import { Taker } from "@arkade-os/banco";

const taker = new Taker(wallet, arkServerUrl, emulatorUrl);

// From hex-encoded offer
const { txid } = await taker.fulfill(offerHex);

// Or from funding transaction ID
const { txid } = await taker.fulfillByTxid(fundingTxid);

// Partial fill
const { txid } = await taker.fulfill(offerHex, { fillAmount: 5_000n });
```

## Cancelling an Offer

```ts
const arkTxid = await maker.cancelOffer(offerHex);
```

## Querying Offer Status

```ts
const offers = await maker.getOffers(swapPkScript);
// [{ txid, vout, value, assets, spendable }]
```

## Partial Fills

To create a partial-fill offer, include ratio parameters:

```ts
const { offer } = await maker.createOffer({
  wantAmount: 100_000n,
  ratioNum: 1n,     // 1 sat per
  ratioDen: 100n,   // 100 asset units
});
```
