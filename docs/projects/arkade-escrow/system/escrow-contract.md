# Escrow Contract: Virtual Escrow Contract (VEC) Implementation

## Overview

The Virtual Escrow Contract (VEC) is the cryptographic foundation of arkade-escrow, implemented as a sophisticated Bitcoin Taproot script that enables trustless three-party escrow on the Arkade protocol. The contract provides six distinct spending paths that cover both collaborative and unilateral scenarios, ensuring funds can always be recovered even in adversarial conditions.

The implementation is located in `/server/src/ark/escrow.ts` and builds on the `@arkade-os/sdk` library's VTXO script primitives.

## VEscrow.Script Class

The core implementation is the `VEscrow.Script` class, which extends `VtxoScript` from the Arkade SDK:

```typescript
export class Script extends VtxoScript {
  readonly releaseFundsScript: string;
  readonly returnFundsScript: string;
  readonly directScript: string;
  readonly receiverDisputeUnilateralScript: string;
  readonly senderDisputeUnilateralScript: string;
  readonly unilateralDirectScript: string;
  readonly ghostScript?: string;

  constructor(readonly options: Options) {
    // Validation and script construction
  }
}
```

### Constructor Parameters

The contract requires five essential parties and a timelock configuration:

```typescript
export type Options = {
  sender: Bytes;           // Buyer's x-only public key (32 bytes)
  receiver: Bytes;         // Seller's x-only public key (32 bytes)
  arbitrator: Bytes;       // Arbitrator's x-only public key (32 bytes)
  server: Bytes;           // Ark server's x-only public key (32 bytes)
  unilateralDelay: RelativeTimelock;  // CSV timelock for unilateral paths
  nonce?: Bytes;           // Optional nonce for address uniqueness (≥32 bytes)
};
```

**Validation rules:**
- All public keys must be exactly 32 bytes (x-only Schnorr keys)
- All four parties must have unique public keys
- Nonce (if provided) must be at least 32 bytes

### RelativeTimelock

The unilateral delay is specified using BIP68-compatible relative timelocks:

```typescript
type RelativeTimelock = {
  type: "blocks" | "seconds";
  value: number;
};
```

This delay protects against premature unilateral exits, typically set to match the Ark server's unilateral exit delay (from `ArkInfo.unilateralExitDelay`).

## Six Spending Paths

The VEC provides three collaborative paths (requiring server signature) and three unilateral paths (requiring timelock but no server):

### Collaborative Paths

These paths execute immediately when all required parties sign:

#### 1. Direct Settlement (Happy Path)

**Signers:** Sender + Receiver + Server

```typescript
const directScript = MultisigTapscript.encode({
  pubkeys: [sender, receiver, server],
}).script;
```

This is the **happy path** where both parties agree the transaction completed successfully. No arbitrator involvement needed.

**Use case:** Buyer receives goods, seller delivers as expected, both parties sign to complete.

#### 2. Release Funds (Receiver Wins Dispute)

**Signers:** Receiver + Arbitrator + Server

```typescript
const releaseScript = MultisigTapscript.encode({
  pubkeys: [receiver, arbitrator, server],
}).script;
```

The arbitrator determines the receiver (seller) should receive funds, typically because they provided proof of delivery or service completion.

**Use case:** Buyer claims non-delivery, but seller provides tracking info; arbitrator sides with seller.

#### 3. Return Funds (Sender Wins Dispute)

**Signers:** Sender + Arbitrator + Server

```typescript
const refundScript = MultisigTapscript.encode({
  pubkeys: [sender, arbitrator, server],
}).script;
```

The arbitrator determines the sender (buyer) should receive a refund, typically because the seller failed to deliver or delivered incorrectly.

**Use case:** Seller never ships item; arbitrator sides with buyer for refund.

### Unilateral Paths (With Timelock)

These paths activate after the CSV timelock expires, allowing recovery without server cooperation:

#### 4. Unilateral Direct Settlement

**Signers:** Sender + Receiver (after timelock)

```typescript
const unilateralDirectScript = CSVMultisigTapscript.encode({
  pubkeys: [sender, receiver],
  timelock: unilateralDelay,
}).script;
```

If the server becomes unresponsive and both parties agree on settlement, they can execute this path after the timelock.

**Use case:** Server goes offline, but buyer and seller agree transaction was successful.

#### 5. Unilateral Release (Receiver Recovery)

**Signers:** Receiver + Arbitrator (after timelock)

```typescript
const unilateralReleaseScript = CSVMultisigTapscript.encode({
  pubkeys: [receiver, arbitrator],
  timelock: unilateralDelay,
}).script;
```

Arbitrator and receiver can release funds without server after timelock expires.

**Use case:** Arbitration ruled in favor of seller, but server is offline; seller can still claim funds.

#### 6. Unilateral Refund (Sender Recovery)

**Signers:** Sender + Arbitrator (after timelock)

```typescript
const unilateralRefundScript = CSVMultisigTapscript.encode({
  pubkeys: [sender, arbitrator],
  timelock: unilateralDelay,
}).script;
```

Arbitrator and sender can refund without server after timelock expires.

**Use case:** Arbitration ruled in favor of buyer, but server is offline; buyer can still recover funds.

## Taproot Script Structure

The VEC uses Bitcoin's Taproot structure where all spending conditions are encoded as leaves in a Merkle tree:

```typescript
super([
  releaseScript,
  refundScript,
  directScript,
  unilateralReleaseScript,
  unilateralRefundScript,
  unilateralDirectScript,
  ...(ghostScript ? [ghostScript] : []),
]);
```

Each leaf is a valid spending path. When spending, the spender reveals only the path they're executing, keeping other conditions private.

### TapLeafScript Access

The class provides typed methods to retrieve each spending path:

```typescript
// Collaborative paths
releaseFunds(): TapLeafScript {
  return this.findLeaf(this.releaseFundsScript);
}

returnFunds(): TapLeafScript {
  return this.findLeaf(this.returnFundsScript);
}

direct(): TapLeafScript {
  return this.findLeaf(this.directScript);
}

// Unilateral paths
receiverDisputeUnilateral(): TapLeafScript {
  return this.findLeaf(this.receiverDisputeUnilateralScript);
}

senderDisputeUnilateral(): TapLeafScript {
  return this.findLeaf(this.senderDisputeUnilateralScript);
}

unilateralDirect(): TapLeafScript {
  return this.findLeaf(this.unilateralDirectScript);
}
```

These methods return `TapLeafScript` objects containing the script, control block, and leaf version needed for Bitcoin transaction signing.

## Multisig Configurations

All spending paths use 2-of-2 or 3-of-3 multisignature schemes:

### 3-of-3 Collaborative Paths

Encoded using `MultisigTapscript.encode()`:

```typescript
MultisigTapscript.encode({
  pubkeys: [key1, key2, key3],
}).script
```

This produces a Bitcoin script that requires Schnorr signatures from all three public keys (using MuSig2 aggregation).

### 2-of-2 Unilateral Paths

Encoded using `CSVMultisigTapscript.encode()`:

```typescript
CSVMultisigTapscript.encode({
  pubkeys: [key1, key2],
  timelock: unilateralDelay,
}).script
```

This produces a script with a `OP_CHECKSEQUENCEVERIFY` timelock followed by a 2-of-2 multisig check.

## CSV Timelocks

The CSV (Check Sequence Verify) timelock is encoded in the transaction's sequence field according to BIP68:

- **Blocks:** Values < 512 represent block height delays
- **Seconds:** Values ≥ 512 represent 512-second unit delays (with bit 22 set)

Example from `ark.service.ts`:

```typescript
static getUnilateralDelay(arkInfo: ArkInfo): RelativeTimelock {
  return {
    type: arkInfo.unilateralExitDelay < 512 ? "blocks" : "seconds",
    value: arkInfo.unilateralExitDelay,
  };
}
```

The unilateral delay is typically synchronized with the Ark server's configured `unilateralExitDelay` to maintain security properties.

## Nonce for Uniqueness

An optional nonce can be included to make each contract address unique:

```typescript
const ghostScript = nonce
  ? ConditionMultisigTapscript.encode({
      pubkeys: [sender, receiver, arbitrator, server],
      conditionScript: ScriptClass.encode([
        "HASH160",
        hash160(nonce),
        "EQUAL",
      ]),
    }).script
  : undefined;
```

The ghost script requires revealing the preimage of `HASH160(nonce)` plus signatures from all four parties. This path is intentionally unspendable (the nonce is not stored), but it alters the Taproot commitment, producing a unique address even with identical participants.

**Purpose:** Allows the same parties to create multiple distinct contracts without address reuse.

## Spending Path Selection Logic

The `ArkService` provides utility methods to select the correct spending path based on action type:

```typescript
static getSpendingPathForAction(
  escrowScript: VEscrow.Script,
  action: ActionType,
): TapLeafScript | null {
  switch (action) {
    case "release-funds":
      return escrowScript.releaseFunds();
    case "return-funds":
      return escrowScript.returnFunds();
    case "direct-settle":
      return escrowScript.direct();
    default:
      return null;
  }
}

static getRequiredSignersForAction(
  escrowScript: VEscrow.Script,
  action: ActionType,
): Signers[] | undefined {
  const spendingPaths = escrowScript.getSpendingPaths();
  switch (action) {
    case "direct-settle":
      return spendingPaths.find((_) => _.name === "direct")?.signers;
    case "release-funds":
      return spendingPaths.find((_) => _.name === "releaseFunds")?.signers;
    case "return-funds":
      return spendingPaths.find((_) => _.name === "returnFunds")?.signers;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
```

### ActionType Enumeration

```typescript
export type ActionType = "direct-settle" | "release-funds" | "return-funds";
export type Signers = "sender" | "receiver" | "server" | "arbitrator";
```

## Integration with @arkade-os/sdk

The VEC implementation builds on several SDK primitives:

### VtxoScript Base Class

Provides Taproot tree construction and address generation:

```typescript
export class Script extends VtxoScript {
  constructor(scripts: Uint8Array[]) {
    super(scripts);  // Builds Taproot merkle tree
  }
}
```

### MultisigTapscript

Creates standard MuSig2 multisig scripts:

```typescript
import { MultisigTapscript } from "@arkade-os/sdk";

MultisigTapscript.encode({ pubkeys: [key1, key2, key3] });
```

### CSVMultisigTapscript

Creates timelock-enforced multisig scripts:

```typescript
import { CSVMultisigTapscript } from "@arkade-os/sdk";

CSVMultisigTapscript.encode({
  pubkeys: [key1, key2],
  timelock: { type: "blocks", value: 144 },
});
```

### ConditionMultisigTapscript

Creates scripts with custom spending conditions:

```typescript
import { ConditionMultisigTapscript } from "@arkade-os/sdk";

ConditionMultisigTapscript.encode({
  pubkeys: [key1, key2, key3, key4],
  conditionScript: ScriptClass.encode(["HASH160", hash, "EQUAL"]),
});
```

### ArkAddress Generation

Convert the VEC script to an Arkade address:

```typescript
const escrowScript = new VEscrow.Script(options);
const addrPrefix = arkInfo.network === "mainnet" ? "ark" : "tark";
const serverKey = hex.decode(arkInfo.signerPubkey.slice(2));
const arkAddress = escrowScript.address(addrPrefix, serverKey);
```

The address encoding follows Bech32m with network-specific prefixes.

## Transaction Building

When spending from a VEC, the script and spending path are provided to `buildOffchainTx`:

```typescript
import { buildOffchainTx, ArkTxInput } from "@arkade-os/sdk";

const input: ArkTxInput = {
  txid: vtxo.txid,
  vout: vtxo.vout,
  value: vtxo.value,
  tapTree: escrowScript.encode(),         // Full merkle tree
  tapLeafScript: escrowScript.direct(),   // Selected spending path
};

const { arkTx, checkpoints } = buildOffchainTx(
  [input],
  outputs,
  serverUnrollScript,
);
```

The `buildOffchainTx` function:
1. Creates an unsigned Ark transaction spending the VTXO
2. Generates checkpoint transactions for server verification
3. Returns PSBTs ready for multi-party signing

## Signature Collection

Each required signer must provide:

1. **Ark transaction signature**: Signs the main VTXO spending transaction
2. **Checkpoint signatures**: Signs each checkpoint transaction (verifies correct execution)

Signatures are collected asynchronously as each party approves the execution:

```typescript
export type ExecutionTransaction = {
  vtxo: { txid: string; vout: number; value: number };
  arkTx: string;                          // PSBT base64
  checkpoints: string[];                   // PSBT base64 array
  requiredSigners: Signers[];              // Who must sign
  approvedByPubKeys: PublicKey[];          // Who has signed
  rejectedByPubKeys: PublicKey[];          // Who has rejected
};
```

## Security Properties

### No Single Point of Failure

- **Server offline**: Unilateral paths allow recovery after timelock
- **Party unresponsive**: Other collaborative paths may still work
- **Dispute**: Arbitrator provides tie-breaking signature

### Censorship Resistance

The unilateral paths ensure that even if the Ark server attempts to censor a settlement, parties can wait for the timelock and exit without server cooperation.

### Privacy

Taproot's privacy properties mean:
- Only the executed spending path is revealed on-chain
- Other spending conditions remain hidden in the merkle tree
- All paths look identical from outside until spent

### Funds Always Recoverable

The combination of six paths guarantees that as long as:
- Sender OR receiver remains honest, AND
- Arbitrator remains available

Then funds can be recovered in worst-case scenarios (after timelock expiration).

## Current Limitations

### Unilateral Paths Not Fully Implemented

The codebase includes TODO comments indicating unilateral paths are not yet fully tested:

```typescript
// TODO: support unilateral paths
{
  name: "receiverDisputeUnilateral",
  type: "unilateral",
  description: "Release funds after timelock",
  script: this.receiverDisputeUnilateralScript,
  signers: ["receiver", "arbitrator"],
}
```

### Single VTXO Limitation

Currently, contracts are funded with a single VTXO. For larger amounts, the system may need to support:
- Multiple VTXOs per contract
- VTXO consolidation
- Partial settlements

### No Fee Management

The current implementation doesn't handle transaction fee estimation or adjustment, which may cause issues with low-fee-rate transactions during high network congestion.

## Future Enhancements

1. **Unilateral path testing and activation**
2. **Multi-VTXO contract support**
3. **Dynamic fee management**
4. **Covenant optimizations** (if Bitcoin soft forks enable new opcodes)
5. **Penalty mechanisms** for malicious parties
6. **Partial settlement** support for installment payments
7. **Time-based auto-resolution** (e.g., auto-release after 30 days if no dispute)

## References

- Bitcoin BIP341 (Taproot): https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki
- Bitcoin BIP68 (Relative Timelocks): https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
- Arkade SDK Documentation: https://github.com/arkadexyz/arkade-os
- MuSig2 Specification: https://eprint.iacr.org/2020/1261
