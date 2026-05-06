# BlueWallet — Integration with arkd & Ark Ecosystem

This document describes how BlueWallet integrates the Ark protocol via `@arkade-os/sdk` and `@arkade-os/boltz-swap`. The integration lives primarily in:

- `class/wallets/lightning-ark-wallet.ts` (~845 LOC) — the wallet class itself
- `blue_modules/arkade-adapters/` — Ark-specific adapters (background tasks, Realm re-exports)

## Dependencies

```json
{
  "@arkade-os/sdk": "0.4.23",
  "@arkade-os/boltz-swap": "0.3.26"
}
```

These are pinned exact versions — bumps require explicit dependency updates and full regression tests. Recent SDK upgrades (0.4.18 → 0.4.23, boltz-swap 0.3.19 → 0.3.26) were paired with a Realm migration and removal of the obsolete in-wallet `_contractsLoaded` background init: contract metadata is now part of the SDK's standard load path.

## The `LightningArkWallet` Class

Located at `class/wallets/lightning-ark-wallet.ts`, it extends `LightningCustodianWallet` to reuse the Lightning wallet API surface in BlueWallet (so users see one mental model: "a Lightning wallet").

```typescript
export class LightningArkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningArkWallet';
  static readonly typeReadable = 'Lightning Ark';
  static readonly subtitleReadable = 'Ark';

  private _wallet!: Wallet | undefined;            // @arkade-os/sdk Wallet
  private _arkadeSwaps!: ArkadeSwaps | undefined;  // @arkade-os/boltz-swap
  private _arkServerUrl: string = 'https://arkade.computer';
  private _delegatorUrl: string = 'https://delegate.arkade.money';
  private _arkServerPublicKey: string = '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba';
  private _boltzApiUrl: string = 'https://api.ark.boltz.exchange';
  private _taskNamespace: string = '';
  // ...
}
```

### Imports From `@arkade-os/sdk`

```typescript
import {
  SingleKey,
  MnemonicIdentity,
  Ramps,
  Wallet,
  ExtendedCoin,
  ArkTransaction,
  isSpendable,
  RestDelegatorProvider,
} from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
```

| Import | Role |
|--------|------|
| `Wallet` | Top-level Ark wallet class |
| `Ramps` | Boarding (onchain → offchain) and unilateral exit logic |
| `MnemonicIdentity` | Identity derived from the wallet's BIP39 mnemonic |
| `SingleKey` | Single-key identity (for non-mnemonic flows) |
| `ExtendedCoin` | Extended VTXO/UTXO type with metadata |
| `ArkTransaction` | Ark transaction type |
| `isSpendable` | Predicate to check VTXO spendability |
| `RestDelegatorProvider` | REST-based delegator (for delegated signing) |
| `ExpoArkProvider` | Expo-native Ark protocol provider (replaces fetch-based default) |
| `ExpoIndexerProvider` | Expo-native indexer provider |

### Imports From `@arkade-os/boltz-swap`

```typescript
import {
  ArkadeSwaps,
  BoltzSwapProvider,
  decodeInvoice,
  BoltzSwap,
  BoltzReverseSwap,
  isPendingReverseSwap,
  isPendingSubmarineSwap,
  isReverseFinalStatus,
  isSubmarineFinalStatus,
} from '@arkade-os/boltz-swap';
```

| Import | Role |
|--------|------|
| `ArkadeSwaps` | High-level Boltz swap orchestrator |
| `BoltzSwapProvider` | Low-level Boltz API client |
| `decodeInvoice` | BOLT11 decoder (avoid pulling another LN lib) |
| `BoltzSwap` / `BoltzReverseSwap` | Swap state types |
| `isPendingReverseSwap` / `isPendingSubmarineSwap` | State predicates for the swap queue |
| `isReverseFinalStatus` / `isSubmarineFinalStatus` | Terminal-state predicates |

## Realm Repositories

The wallet imports SDK-provided Realm repositories **directly** from the SDK packages (the previous `blue_modules/arkade-adapters/realm/index.ts` re-export shim was removed):

```typescript
import { RealmWalletRepository, RealmContractRepository } from '@arkade-os/sdk/repositories/realm';
import { RealmSwapRepository } from '@arkade-os/boltz-swap/repositories/realm';
import { getArkadeRealm, deleteArkadeRealm } from '../../blue_modules/arkade-adapters/realm/realmInstance';
```

These repositories provide:
- **`RealmWalletRepository`**: VTXOs, addresses, wallet metadata
- **`RealmContractRepository`**: Ark contract state (boarding, redemption commitments)
- **`RealmSwapRepository`**: Boltz swap state (submarine + reverse)

`blue_modules/arkade-adapters/realm/realmInstance.ts` exposes:
- **`getArkadeRealm(namespace)`** — opens the Realm with the per-wallet `_taskNamespace`, ensuring each Ark wallet has its own database file. The Realm file is now stored under `DocumentDirectoryPath` (rather than the cache directory) so it persists across OS-level cache eviction.
- **`deleteArkadeRealm(namespace)`** — closes and removes the Realm file; called from the wallet's new `static onBeforeDelete(wallet)` cleanup hook.

## Per-Wallet Task Namespace (Privacy)

The original implementation used `sha256(secret)` to derive a Realm filename and Keychain service ID. That leaked wallet existence in plaintext (an attacker who guessed your mnemonic could check whether the corresponding wallet exists on a device). The current implementation uses a **random per-wallet identifier** generated lazily on first `getNamespace()` call and persisted in `saveToDisk()`:

```typescript
private _taskNamespace: string = '';
// Per-wallet random identifier used as the key for the Realm file path,
// Keychain service, and swap-queue task IDs. Lazily generated on first
// getNamespace() call and persisted on the next saveToDisk(). Was once
// sha256(secret), but that leaked wallet existence in plaintext...
```

This protects **plausible deniability** — a core BlueWallet feature.

## Background Swap Processing

The `blue_modules/arkade-adapters/background/` directory contains the swap reconciliation system, critical for mobile reliability:

```
blue_modules/arkade-adapters/background/
  ├── swap-queue.ts          # AsyncStorage-backed task queue (TaskItem)
  ├── swap-processor.ts      # Processes queued swap reconciliation tasks
  ├── task-scheduler.ts      # Registers/unregisters native background tasks
  └── foreground-poller.ts   # Polling fallback when WebSockets fail / app is fg
```

### Why This Matters

Boltz swaps progress through several states (created → invoice paid → claim submitted → confirmed). On mobile, the app can be backgrounded or terminated at any point, so the swap state must be reconcilable from persistent storage. BlueWallet uses:

- **`enqueueSwapTask`**: Adds a swap reconciliation task to the persistent queue
- **`reconcileSwapTasks`**: Processes pending tasks (called on app foreground + periodically)
- **`registerArkadeBackgroundTask` / `unregisterArkadeBackgroundTask`**: Native background fetch
- **`startPolling` / `stopPolling`**: Foreground polling when WS unavailable
- **`clearNamespaceTasks`**: Cleanup when a wallet is deleted

This delegates **WebSocket reconnection + polling fallback** to `@arkade-os/boltz-swap` (per the inline comment around line 642 of the wallet file).

## Default Endpoints

| Endpoint | Default URL | Purpose |
|----------|-------------|---------|
| Ark server | `https://arkade.computer` | arkd instance for VTXO operations |
| Delegator | `https://delegate.arkade.money` | REST delegator provider for delegated signing |
| Ark server pubkey | `022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba` | Pinned Ark server public key |
| Boltz API | `https://api.ark.boltz.exchange` | Boltz API for Ark↔LN swaps |

These are private fields with hard-coded defaults but can be overridden per-wallet (the user can configure custom servers in settings).

## Wallet Lifecycle

```
1. Wallet creation
   ├── Generate BIP39 mnemonic (or import)
   ├── Generate random _taskNamespace (privacy)
   ├── Save mnemonic to Keychain (service = _taskNamespace)
   └── Persist namespace via saveToDisk()

2. Wallet load (each app start)
   ├── Read _taskNamespace from persisted state
   ├── getArkadeRealm(_taskNamespace) → open Realm DB
   ├── Construct MnemonicIdentity from mnemonic
   ├── Build Wallet with ExpoArkProvider + ExpoIndexerProvider
   ├── Build ArkadeSwaps with BoltzSwapProvider
   ├── reconcileSwapTasks(_taskNamespace) → resume any pending swaps
   └── registerArkadeBackgroundTask(_taskNamespace) → register OS background fetch

3. Send Lightning (LN→Ark via Boltz submarine swap)
   ├── decodeInvoice(invoice)
   ├── isLightningAmountEligible(amt) → check Boltz limits
   ├── ArkadeSwaps.createSubmarineSwap(invoice)
   ├── enqueueSwapTask({ kind: 'submarine', swap })
   └── Poll/reconnect until isSubmarineFinalStatus

4. Receive Lightning (Ark→LN via Boltz reverse swap)
   ├── ArkadeSwaps.createReverseSwap(amount)
   ├── Display invoice to payer
   ├── enqueueSwapTask({ kind: 'reverse', swap })
   └── Claim VTXO when invoice paid (isReverseFinalStatus)

5. Send Ark / Receive Ark (no swap)
   ├── Wallet.send(...) / Wallet.receive(...)
   └── Ramps for boarding/exit

6. Wallet deletion (LightningArkWallet.onBeforeDelete)
   ├── unregisterArkadeBackgroundTask(_taskNamespace)
   ├── stopPolling(_taskNamespace) (also exposed as static stopPolling())
   ├── clearNamespaceTasks(_taskNamespace)
   ├── Clear in-memory caches (staticWalletCache / staticSwapsCache / locks)
   ├── deleteArkadeRealm(_taskNamespace) — drops Realm DB file
   └── Remove Keychain entry
```

## Limits & Eligibility

```typescript
private _limitMin: number = 0;
private _limitMax: number = 0;
private _feePercentage: number = 0;

isLightningAmountEligible(amt: number): boolean {
  if (!this._limitMin || !this._limitMax) return false;
  return amt >= this._limitMin && amt <= this._limitMax;
}
```

These come from Boltz's API (per-pair limits and fee percentage). When unavailable, the wallet falls back to **Ark-only** operations (no LN bridging).

## Boarding & Exit (`Ramps`)

The `Ramps` import from `@arkade-os/sdk` provides:
- **Boarding**: send onchain BTC → board into Ark (creates VTXOs from a UTXO)
- **Unilateral exit**: post a checkpoint commitment + claim VTXO onchain (bypassing collaborative round)

```typescript
private _boardingUtxos: ExtendedCoin[] = [];
```

The wallet tracks pending boarding UTXOs explicitly because they have a different lifecycle than spendable VTXOs.

## Tests

- **Unit**: `tests/unit/lightning-ark-wallet.test.ts` — class-level tests with mocked SDK
- **Integration**: `tests/integration/lightning-ark-wallet.test.ts` — runs against real SDK + test endpoints (requires env vars)

Run with:
```bash
npm run unit                           # all unit tests
npm run unit -- lightning-ark-wallet   # just this wallet
npm run integration                    # all integration tests
```

## Cross-Project References

| Other Project | How BlueWallet Relates |
|---------------|------------------------|
| **`ts-sdk`** | Source of `@arkade-os/sdk` published to npm |
| **`boltz-swap`** | Source of `@arkade-os/boltz-swap` published to npm |
| **`boltz-backend`** | The backend that `api.ark.boltz.exchange` runs |
| **`arkd`** | The server `arkade.computer` runs |
| **`wallet`** (Arkade PWA) | Sister wallet using the same SDK in a PWA form factor |
| **`arkade-wdk`** | Alternative WDK-style adapter — different integration approach for RN apps |

## Common Tasks for Agents

| Task | Files to Read |
|------|--------------|
| Bump SDK version | `package.json`, run `npm install`, regenerate `package-lock.json` |
| Debug Ark wallet | `class/wallets/lightning-ark-wallet.ts`, `blue_modules/arkade-adapters/` |
| Inspect swap queue | `blue_modules/arkade-adapters/background/swap-queue.ts` |
| Add a new Ark feature | wallet class + relevant `screen/` |
| Trace a swap failure | check `swap-processor.ts`, then SDK source in `ts-sdk` |
