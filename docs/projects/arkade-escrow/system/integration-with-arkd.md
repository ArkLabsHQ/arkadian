# Integration with Arkd

## Overview

arkade-escrow integrates with arkd via the `@arkade-os/sdk` TypeScript library. The server connects to an arkd instance using two providers:
- **RestArkProvider** — For Ark server operations (info, tx submission, finalization)
- **RestIndexerProvider** — For querying VTXOs by script

## Connection Setup

The `ArkModule` creates provider instances from environment variables:

```typescript
// ARK_PROVIDER factory
{
  provide: ARK_PROVIDER,
  useFactory: (cfg: ConfigService) => {
    return new RestArkProvider(cfg.get("ARK_SERVER_URL") ?? "https://mutinynet.arkade.sh");
  },
}
```

On module init, `ArkService` calls `provider.getInfo()` to fetch the Ark server's public key, network, and unilateral exit delay.

## Virtual Escrow Contract (VEC)

The VEC (`server/src/ark/escrow.ts`) extends `VtxoScript` from `@arkade-os/sdk` and uses these SDK primitives:
- `MultisigTapscript` — For collaborative 3-of-3 spending paths
- `CSVMultisigTapscript` — For unilateral 2-of-2 paths with CSV timelock
- `ConditionMultisigTapscript` — For the ghost script (nonce-based uniqueness)

The contract creates a deterministic Ark address using `escrowScript.address(prefix, serverKey)`.

## Key Operations

### Address Derivation
`ArkService.createArkAddressForContract(contract)` — Restores VEC script from contract parties and derives the Taproot address.

### Funding Detection
`FundingWatcherService` periodically queries `RestIndexerProvider.getVtxos({ scripts: [pkScript] })` to check if the escrow address has been funded. On detection, emits a `contract-address.funded` event.

### Transaction Building
`ArkService.createEscrowTransaction()` — Selects the spending path based on action type, creates `ArkTxInput[]` from funded VTXOs, and calls `buildOffchainTx()` to produce a PSBT and checkpoint transactions.

### Transaction Execution
`ArkService.executeEscrowTransaction()` — Submits the fully-signed transaction via `provider.submitTx()`, merges checkpoint signatures, and finalizes via `provider.finalizeTx()`.

## SDK Dependencies

| SDK Type | Usage |
|----------|-------|
| `ArkAddress` | Address encoding/decoding |
| `ArkInfo` | Server info (network, signerPubkey, unilateralExitDelay) |
| `VtxoScript` | Base class for VEC |
| `VirtualCoin` | VTXO representation |
| `buildOffchainTx` | PSBT construction |
| `RestArkProvider` | Server communication |
| `RestIndexerProvider` | VTXO queries |

## Requirements

- arkd server running and accessible at `ARK_SERVER_URL`
- Ark indexer accessible (same server or separate)
- Server's signer public key is used in all VEC scripts
