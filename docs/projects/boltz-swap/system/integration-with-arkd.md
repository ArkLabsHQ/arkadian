# boltz-swap -- Integration with Ark Ecosystem

## How boltz-swap Integrates with Ark

boltz-swap does not communicate with arkd directly. Instead, it uses `@arkade-os/sdk` abstractions:

```
boltz-swap -> @arkade-os/sdk -> arkd (gRPC)
                              -> indexer (REST)
```

### SDK Providers Used

| Provider | SDK Type | Purpose |
|----------|----------|---------|
| ArkProvider | `ArkProvider` | Get server info, submit/finalize off-chain transactions |
| IndexerProvider | `IndexerProvider` | Query VTXOs by script for claim/refund |
| Wallet | `Wallet` / `ServiceWorkerWallet` | Sign transactions, get addresses, send BTC |
| Identity | `Identity` | Cryptographic signing, public key access |

### Key arkd Interactions (via SDK)

1. **arkProvider.getInfo()**: Get network, signer pubkey, checkpoint tapscript
2. **arkProvider.submitTx()**: Submit signed off-chain Ark transactions
3. **arkProvider.finalizeTx()**: Finalize transactions with signed checkpoints
4. **indexerProvider.getVtxos()**: Find VTXOs at VHTLC addresses for claim/refund
5. **wallet.sendBitcoin()**: Send ARK funds to swap lockup addresses
6. **wallet.getAddress()**: Get user's Ark receive address
7. **wallet.contractRepository**: Persist swap state (reverseSwaps, submarineSwaps, chainSwaps)

### VHTLC (Virtual HTLC)

boltz-swap uses the SDK's `VHTLC.Script` to construct Taproot scripts with multiple spending paths:

- **Claim leaf**: Receiver + preimage reveal (cooperative with server)
- **Refund leaf**: Sender refund after timeout
- **Unilateral claim**: Receiver-only claim after delay
- **Unilateral refund**: Sender-only refund after delay
- **Refund without receiver**: Sender refund without receiver cooperation

### Configuration Example

```typescript
import { ArkadeLightning } from "@arkade-os/boltz-swap";
import { BoltzSwapProvider } from "@arkade-os/boltz-swap";

const swapProvider = new BoltzSwapProvider({
  network: "mutinynet",  // or "bitcoin", "regtest"
  // apiUrl: "https://custom-boltz-url"  // optional override
});

const lightning = new ArkadeLightning({
  wallet,           // @arkade-os/sdk Wallet instance
  swapProvider,     // BoltzSwapProvider
  swapManager: true // Enable background monitoring (optional)
});
```

### Batch Joining

When claiming a recoverable VHTLC, boltz-swap joins an arkd batch round rather than submitting a standalone off-chain TX. This is more efficient as the claim is processed in the next round alongside other transactions.

### Contract Repository

Swap state is persisted via `wallet.contractRepository`:
- `reverseSwaps` collection: Pending Lightning receive swaps
- `submarineSwaps` collection: Pending Lightning send swaps
- `chainSwaps` collection: Pending BTC<->ARK chain swaps
