# Application Core

## Purpose

The application layer orchestrates Ark protocol use cases by coordinating domain logic, managing the round lifecycle, and integrating external services. It sits between the domain layer (business logic) and infrastructure layer (implementations).

## Main Service Structure

The core `service` struct orchestrates all Ark operations with injected dependencies:
- **Services:** Wallet, Signer, RepoManager, TxBuilder, Scanner, LiveStore, Scheduler
- **Configuration:** Network parameters, timelock settings, round limits, amount limits
- **Runtime State:** Event channels, transaction events, forfeit signature channels

## Service Lifecycle Methods

### `Start()`
Starts the application service and all background services:
- Initializes the sweeper service for expired VTXO cleanup
- Launches the main round execution goroutine
- Returns immediately after spawning background workers

### `Stop()`
Gracefully shuts down the service:
- Cancels context to stop all goroutines
- Waits for workers to complete
- Stops sweeper, scanner, wallet, database connections

## Payment & Round Participation

### `RegisterIntent(ctx, proof, message)`
Registers a user's intent to participate in the next round.

**Validation:**
- Proves ownership of all inputs (VTXOs or boarding UTXOs)
- Validates boarding inputs (tapscript structure, amounts)
- Validates VTXO inputs (existence, unspent, valid CSV delays)
- Validates receivers (amounts within min/max bounds)
- Validates musig2 cosigner keys for offchain receivers
- Verifies cryptographic proof

**Amount Rules:**
- VTXO amounts: vtxoMinSettlementAmount d amount d vtxoMaxAmount
- UTXO amounts: utxoMinAmount d amount d utxoMaxAmount

### `ConfirmRegistration(ctx, intentId)`
Confirms user participation after receiving unsigned commitment transaction. Marks intent as confirmed and triggers round progression when all intents are confirmed.

### `SubmitForfeitTxs(ctx, forfeitTxs)`
Receives signed forfeit transactions from users, stores them in cache, verifies signatures, and signals that forfeits have been received.

### `SignCommitmentTx(ctx, signedCommitmentTx)`
Receives signed commitment transaction with boarding input signatures, verifies all boarding inputs are properly signed.

## Offchain Transaction Methods

### `SubmitOffchainTx(ctx, checkpointTxs, signedArkTx)`
Submits an offchain (collaborative) transaction for processing.

**Process:**
1. Parses and validates checkpoint and ark transactions
2. Retrieves spent VTXOs from database
3. Validates VTXO inputs (not spent/unrolled/swept)
4. Validates tapscript structure of each VTXO
5. Verifies VTXO expirations and commitment txids
6. Validates new VTXO outputs (amounts, expiration times)
7. Signs checkpoint transactions with ASP's wallet
8. Signs ark transaction with musig2 (operator + cosigners)
9. Creates offchain tx domain object and persists it
10. Returns signed transactions to user

### `FinalizeOffchainTx(ctx, txid, finalCheckpoints)`
Finalizes an offchain transaction after receiving final checkpoint signatures. Updates VTXO states, persists finalization event, and publishes transaction event.

## Round Lifecycle Orchestration

### Round Stages

**1. Registration Stage (`startRound`)**
- Duration: 1/6 of round interval (minimum 1 second)
- Creates new round, resets forfeit cache, opens intent registration
- Users call `RegisterIntent()` to join

**2. Confirmation Stage (`startConfirmation`)**
- Duration: 50% of remaining time (minimum 1 second)
- Selects intents from queue (up to roundMaxParticipantsCount)
- Checks ASP liquidity is sufficient
- Sends BatchStarted event with intent hashes
- Waits for confirmations or timeout
- Aborts round if insufficient confirmations
- Re-queues unconfirmed intents

**3. Finalization Stage (`startFinalization`)**
- Duration: 33% of remaining time (split into 3 sub-stages)

Sub-stages:
- **Commitment Transaction Building:** Builds unsigned commitment tx with boarding inputs, VTXO inputs, and outputs
- **Tree Signing (Musig2):** Generates nonces, collects cosigner nonces, aggregates, signs tree, collects signatures, combines
- **Forfeit & Commitment Signing:** Waits for forfeit txs and boarding signatures, verifies, signs commitment tx, broadcasts

**4. Round Finalization (`finalizeRound`)**
- Waits for commitment tx confirmation
- Updates round state to "finalized"
- Marks input VTXOs as spent, creates new VTXO records
- Persists all events to database
- Publishes round metrics and transaction events
- Schedules sweep task for expired VTXOs
- Starts next round

## Background Services

### Sweeper Service (`sweeper.go`)
Automatically sweeps expired VTXO tree outputs back to the ASP.

**Process:**
1. Restores sweepable rounds from database
2. Schedules tasks at VTXO tree expiration time
3. At expiration: Inspects tree, finds sweepable outputs, builds sweep transaction
4. Broadcasts sweep tx, marks VTXOs as swept

**Algorithm:** Traverses VTXO tree depth-first, checks if transactions are confirmed onchain, calculates expiration based on parent confirmation + CSV delay.

### Fraud Detection Service (`fraud.go`)
Detects and reacts to fraudulent redemption attempts.

**Fraud Scenarios:**
- Offchain spend + onchain redemption
- Double redemption

**Detection:** Monitors all VTXOs via blockchain scanner, receives notifications when VTXO is seen onchain.

**Reaction Methods:**
- `broadcastCheckpointTx()` - For preconfirmed VTXOs (spent offchain)
- `broadcastForfeitTx()` - For settled VTXOs (in finalized round)
- `broadcastConnectorBranch()` - Broadcasts connector transactions leading to forfeit

### Indexer Service (`indexer.go`)
Provides read-only query APIs for wallets and explorers.

**Query Methods:**
- `GetCommitmentTxInfo()` - Commitment transaction details
- `GetVtxoTree()` - VTXO tree for a batch (paginated)
- `GetVtxoTreeLeaves()` - Only leaf VTXOs of a batch
- `GetForfeitTxs()` - All forfeit transactions for a round
- `GetConnectors()` - Connector tree for a round
- `GetVtxos()` - Query VTXOs by public key with filtering
- `GetVtxoChain()` - Trace VTXO history back to root
- `GetVirtualTxs()` - Virtual transaction details

**Subscription Methods (server-streaming):**
- `SubscribeForScripts()` / `UnsubscribeForScripts()` - Two-step flow: create/extend a subscription, then attach via `GetSubscription`. `UnsubscribeForScripts` with an empty scripts list only tears down the listener when no tx filters remain, so tx-only subscriptions are not silently dropped.
- `GetSubscription()` - Server-streaming RPC. If `subscription_id` is empty the server creates a subscription inline, applies the optional initial `SubscriptionFilter`, and emits a `SubscriptionStartedEvent` carrying the generated id as the first message; if `subscription_id` is set the stream attaches to the existing listener (legacy flow). Bound to both `/v1/indexer/script/subscription/{subscription_id}` (legacy) and `/v1/indexer/subscription` (single-connection).
- `UpdateSubscription()` - Atomic, in-place filter mutation on an existing subscription; requires `indexer:write` macaroon permission. All inputs are validated end-to-end before any topic mutation, so an `InvalidArgument` response guarantees the subscription is unchanged. Errors map to `NotFound` (unknown subscription) and `InvalidArgument` (CEL compile error, script parse error, or per-subscription expressions cap exceeded).

**Subscription Filters (`SubscriptionFilter`):**
A flattened filter carrying two independent, combinable fields (no longer mutually exclusive):
- `expressions` - A list of CEL (Common Expression Language) tx filter expressions, OR-combined. On `UpdateSubscription` the list is always overwritten as a whole (an empty list clears all expressions); duplicates are deduplicated and the total is bounded by a server-side per-subscription cap.
- `scripts` - A `ScriptFilter` with `add`/`remove` lists. Unset leaves scripts untouched; set with both lists empty clears all scripts; `add`/`remove` may be combined, with `remove` taking precedence on overlap. Operations are idempotent. (On initial `GetSubscription` creation, `remove` and the clear-all behavior are no-ops.)

At runtime, a tx event is dispatched to a subscription when **any** of its CEL expressions evaluates to `true` on the event's tx, **or** when the event carries a VTXO whose script is in the subscription's script set. CEL filters are implemented by the internal `txfilter` package (`internal/interface/grpc/handlers/txfilter/`), which lifts each tx into a `tx` envelope exposing `tx.extension` (a `map<int, string>` of ARK OP_RETURN packet types to hex payloads) and a `hasPacket(extension, packetType)` helper; CEL evaluation is cost-limited per call.

### Admin Service (`admin.go`)
Provides administrative operations for ASP operators.

**Methods:**
- `GetRoundDetails()` - Comprehensive round information
- `GetRounds()` - List of round IDs within time range
- `GetScheduledSweeps()` - All scheduled sweep tasks
- `GetWalletAddress/Status()` - Wallet operations
- `CreateNotes()` - Creates note VTXOs for onboarding
- `GetMarketHourConfig/UpdateMarketHourConfig()` - Market hours management
- `ListIntents/DeleteIntents()` - Intent queue management

## Service Coordination

### Injected Ports (Interfaces)

**WalletService** - Bitcoin wallet operations (signing, UTXO selection, broadcasting)

**SignerService** - ASP's signing public key provider

**RepoManager** - Access to all repository interfaces (Events, Rounds, Vtxos, OffchainTxs, MarketHourRepo)

**TxBuilder** - Complex Bitcoin transaction construction (commitment, forfeit, sweep)

**BlockchainScanner** - Monitors Bitcoin blockchain for specific scripts

**SchedulerService** - Schedules tasks at specific times or block heights

**LiveStore** - In-memory cache for current round state (Intents, ForfeitTxs, OffchainTxs, CurrentRound, ConfirmationSessions, TreeSigningSessions, BoardingInputs)

## Event-Driven Architecture

### Domain Events Published
- RoundStarted, BatchStarted, RoundSigningStarted
- TreeNoncesAggregated, TreeTxMessage, TreeSignatureMessage
- RoundFinalized, RoundFailed
- OffchainTxRequested, OffchainTxSigned, OffchainTxFinalized, OffchainTxFailed

### Transaction Events
Separate from domain events, published to consumers (wallet clients, indexer):
- Type: "commitment_tx" or "ark_tx"
- SpentVtxos, SpendableVtxos
- CheckpointTxs (for ark_tx)

### Event Handlers
Registered handlers for persisted domain events:
- Round Event Handler - Reconstructs round state, propagates events, starts watching VTXOs, schedules sweeps
- Offchain Transaction Event Handler - Decodes transactions, publishes events, starts watching VTXOs

## Cross-References

- [Integration Points](./integration_points.md) - Component communication
- [RepoManager](./repo_manager.md) - Repository patterns
- [Configuration](./configuration.md) - Service configuration
- [Architecture Overview](./architecture.md) - System architecture
