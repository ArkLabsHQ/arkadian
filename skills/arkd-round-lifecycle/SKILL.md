---
name: arkd-round-lifecycle
description: Round lifecycle management in arkd - stages, events, state machine, intent registration, finalization
---

# Round Lifecycle for arkd

## When to Use

Use this skill when:
- Understanding how rounds progress through stages
- Working with intent registration and validation
- Implementing or debugging round finalization logic
- Handling round events and state transitions
- Understanding the relationship between rounds and VTXOs
- Working with batch sweeping and expiration

## Key Concepts

### 1. Round Lifecycle Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUND LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [UNDEFINED] ─────────────────────────────────────────────────► │
│        │                                                         │
│        ▼ StartRegistration()                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              REGISTRATION STAGE                          │    │
│  │  - Accept user intents (RegisterIntents)                 │    │
│  │  - Collect VTXOs to refresh/spend                        │    │
│  │  - Collect boarding inputs                               │    │
│  │  - Validate proofs of ownership                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│        │                                                         │
│        ▼ StartFinalization()                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              FINALIZATION STAGE                          │    │
│  │  - Build VTXO tree and commitment tx                     │    │
│  │  - MuSig2 tree signing with cosigners                    │    │
│  │  - Collect forfeit transactions                          │    │
│  │  - Sign and broadcast commitment tx                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│        │                                                         │
│        ▼ EndFinalization()                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ROUND ENDED                                 │    │
│  │  - Commitment tx broadcast                               │    │
│  │  - VTXOs created with expiration                         │    │
│  │  - Previous VTXOs marked spent                           │    │
│  │  - Batch output scheduled for sweeping                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [FAILED] ◄───────── Fail() called at any stage               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Round Stages

| Stage | Code | Description |
|-------|------|-------------|
| `RoundUndefinedStage` | 0 | Initial state, round not started |
| `RoundRegistrationStage` | 1 | Accepting user intents |
| `RoundFinalizationStage` | 2 | Building and signing trees |

### 3. Event Types

| Event | Description |
|-------|-------------|
| `RoundStarted` | Round begins registration stage |
| `IntentsRegistered` | Users' intents added to round |
| `RoundFinalizationStarted` | Tree built, signing begins |
| `RoundFinalized` | Round successfully completed |
| `RoundFailed` | Round aborted with error |
| `BatchSwept` | ASP reclaimed expired batch output |

## Code Patterns

### Pattern 1: Round Domain Model

```go
type Round struct {
    Id                 string              // UUID of the round
    StartingTimestamp  int64               // When registration started
    EndingTimestamp    int64               // When round ended
    Stage              Stage               // Current stage info
    Intents            map[string]Intent   // User intents by ID
    CommitmentTxid     string              // On-chain anchor txid
    CommitmentTx       string              // Commitment transaction
    ForfeitTxs         []ForfeitTx         // Collected forfeit txs
    VtxoTree           tree.FlatTxTree     // VTXO transaction tree
    Connectors         tree.FlatTxTree     // Connector tree
    ConnectorAddress   string              // Address for connectors
    VtxoTreeExpiration int64               // Seconds until VTXOs expire
    Swept              bool                // Has batch been swept
    SweepTxs           map[string]string   // Sweep transactions
    FailReason         string              // Why round failed
    Changes            []Event             // Domain events
}
```
**Source**: `arkd/internal/core/domain/round.go:41-59`

### Pattern 2: Stage Structure

```go
type Stage struct {
    Code   int    // RoundStage value
    Ended  bool   // Stage completed
    Failed bool   // Stage failed
}

type RoundStage int

const (
    RoundUndefinedStage RoundStage = iota
    RoundRegistrationStage
    RoundFinalizationStage
)

func (s RoundStage) String() string {
    switch s {
    case RoundRegistrationStage:
        return "REGISTRATION_STAGE"
    case RoundFinalizationStage:
        return "FINALIZATION_STAGE"
    default:
        return "UNDEFINED_STAGE"
    }
}
```
**Source**: `arkd/internal/core/domain/round.go:11-28`

### Pattern 3: Creating a New Round

```go
func NewRound() *Round {
    return &Round{
        Id:      uuid.New().String(),
        Intents: make(map[string]Intent),
        Changes: make([]Event, 0),
    }
}

// Reconstruct round from stored events
func NewRoundFromEvents(events []Event) *Round {
    r := &Round{}
    for _, event := range events {
        r.on(event, true)  // Apply events in order
    }
    r.Changes = append([]Event{}, events...)
    return r
}
```
**Source**: `arkd/internal/core/domain/round.go:61-79`

### Pattern 4: Starting Registration

```go
func (r *Round) StartRegistration() ([]Event, error) {
    empty := Stage{}
    if r.Stage != empty {
        return nil, fmt.Errorf("not in a valid stage to start intents registration")
    }

    event := RoundStarted{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeRoundStarted,
        },
        Timestamp: time.Now().Unix(),
    }
    r.raise(event)  // Apply event and add to Changes

    return []Event{event}, nil
}
```
**Source**: `arkd/internal/core/domain/round.go:85-101`

### Pattern 5: Registering Intents

```go
func (r *Round) RegisterIntents(intents []Intent) ([]Event, error) {
    if r.Stage.Code != int(RoundRegistrationStage) || r.IsFailed() {
        return nil, fmt.Errorf("not in a valid stage to register intents")
    }
    if len(intents) <= 0 {
        return nil, fmt.Errorf("missing intents to register")
    }

    // Validate each intent
    for _, intent := range intents {
        if err := intent.validate(false); err != nil {
            return nil, err
        }
    }

    event := IntentsRegistered{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeIntentsRegistered,
        },
        Intents: intents,
    }
    r.raise(event)

    return []Event{event}, nil
}
```
**Source**: `arkd/internal/core/domain/round.go:103-126`

### Pattern 6: Starting Finalization

```go
func (r *Round) StartFinalization(
    connectorAddress string, connectors tree.FlatTxTree, vtxoTree tree.FlatTxTree,
    commitmentTxid, commitmentTx string, vtxoTreeExpiration int64,
) ([]Event, error) {
    // Validate inputs
    if len(commitmentTx) <= 0 {
        return nil, fmt.Errorf("missing unsigned commitment tx")
    }
    if vtxoTreeExpiration <= 0 {
        return nil, fmt.Errorf("missing vtxo tree expiration")
    }
    if r.Stage.Code != int(RoundRegistrationStage) || r.IsFailed() {
        return nil, fmt.Errorf("not in a valid stage to start finalization")
    }
    if len(r.Intents) <= 0 {
        return nil, fmt.Errorf("no intents registered")
    }

    event := RoundFinalizationStarted{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeRoundFinalizationStarted,
        },
        VtxoTree:           vtxoTree,
        Connectors:         connectors,
        ConnectorAddress:   connectorAddress,
        CommitmentTxid:     commitmentTxid,
        CommitmentTx:       commitmentTx,
        VtxoTreeExpiration: vtxoTreeExpiration,
    }
    r.raise(event)

    return []Event{event}, nil
}
```
**Source**: `arkd/internal/core/domain/round.go:128-163`

### Pattern 7: Ending Finalization

```go
func (r *Round) EndFinalization(forfeitTxs []ForfeitTx, finalCommitmentTx string) ([]Event, error) {
    // Check if forfeit txs are required
    if len(forfeitTxs) <= 0 {
        for _, intent := range r.Intents {
            for _, in := range intent.Inputs {
                if in.RequiresForfeit() {
                    return nil, fmt.Errorf("missing list of signed forfeit txs")
                }
            }
        }
    }

    if r.Stage.Code != int(RoundFinalizationStage) || r.IsFailed() {
        return nil, fmt.Errorf("not in a valid stage to end finalization")
    }
    if r.Stage.Ended {
        return nil, fmt.Errorf("round already finalized")
    }

    if forfeitTxs == nil {
        forfeitTxs = make([]ForfeitTx, 0)
    }

    event := RoundFinalized{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeRoundFinalized,
        },
        ForfeitTxs:        forfeitTxs,
        FinalCommitmentTx: finalCommitmentTx,
        Timestamp:         time.Now().Unix(),
    }
    r.raise(event)

    return []Event{event}, nil
}
```
**Source**: `arkd/internal/core/domain/round.go:165-199`

### Pattern 8: Failing a Round

```go
func (r *Round) Fail(err error) []Event {
    if r.Stage.Failed {
        return nil  // Already failed
    }

    event := RoundFailed{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeRoundFailed,
        },
        Reason:    err.Error(),
        Timestamp: time.Now().Unix(),
    }
    r.raise(event)

    return []Event{event}
}
```
**Source**: `arkd/internal/core/domain/round.go:232-247`

### Pattern 9: State Queries

```go
func (r *Round) IsStarted() bool {
    empty := Stage{}
    return !r.IsFailed() && !r.IsEnded() && r.Stage != empty
}

func (r *Round) IsEnded() bool {
    return !r.IsFailed() && r.Stage.Code == int(RoundFinalizationStage) && r.Stage.Ended
}

func (r *Round) IsFailed() bool {
    return r.Stage.Failed
}

func (r *Round) ExpiryTimestamp() int64 {
    if r.IsEnded() {
        return time.Unix(r.EndingTimestamp, 0).Add(
            time.Second * time.Duration(r.VtxoTreeExpiration),
        ).Unix()
    }
    return -1  // Round not ended yet
}
```
**Source**: `arkd/internal/core/domain/round.go:249-269`

### Pattern 10: Batch Sweeping

```go
func (r *Round) Sweep(
    leafVtxos, preconfirmedVtxos []Outpoint, txid, tx string,
) ([]Event, error) {
    if !r.IsEnded() {
        return nil, fmt.Errorf("not in a valid stage to sweep")
    }
    if r.Swept {
        return nil, nil  // Already swept
    }

    // Calculate if fully swept
    sweptVtxosCount := countSweptLeafVtxos(r.Changes)
    leavesCount := len(tree.FlatTxTree(r.VtxoTree).Leaves())
    fullySwept := len(leafVtxos)+sweptVtxosCount == leavesCount

    event := BatchSwept{
        RoundEvent: RoundEvent{
            Id:   r.Id,
            Type: EventTypeBatchSwept,
        },
        LeafVtxos:         leafVtxos,
        PreconfirmedVtxos: preconfirmedVtxos,
        Txid:              txid,
        Tx:                tx,
        FullySwept:        fullySwept,
    }

    r.raise(event)

    return []Event{event}, nil
}
```
**Source**: `arkd/internal/core/domain/round.go:201-230`

### Pattern 11: Event Application (State Machine)

```go
func (r *Round) on(event Event, replayed bool) {
    switch e := event.(type) {
    case RoundStarted:
        r.Stage.Code = int(RoundRegistrationStage)
        r.Id = e.Id
        r.StartingTimestamp = e.Timestamp

    case RoundFinalizationStarted:
        r.Stage.Code = int(RoundFinalizationStage)
        r.VtxoTree = e.VtxoTree
        r.Connectors = e.Connectors
        r.ConnectorAddress = e.ConnectorAddress
        r.CommitmentTxid = e.CommitmentTxid
        r.CommitmentTx = e.CommitmentTx
        r.VtxoTreeExpiration = e.VtxoTreeExpiration

    case RoundFinalized:
        r.Stage.Ended = true
        r.ForfeitTxs = append([]ForfeitTx{}, e.ForfeitTxs...)
        r.EndingTimestamp = e.Timestamp
        r.CommitmentTx = e.FinalCommitmentTx

    case RoundFailed:
        r.Stage.Failed = true
        r.FailReason = e.Reason
        r.EndingTimestamp = e.Timestamp

    case IntentsRegistered:
        if r.Intents == nil {
            r.Intents = make(map[string]Intent)
        }
        for _, p := range e.Intents {
            r.Intents[p.Id] = p
        }

    case BatchSwept:
        if r.SweepTxs == nil {
            r.SweepTxs = make(map[string]string)
        }
        r.Swept = e.FullySwept
        r.SweepTxs[e.Txid] = e.Tx
    }

    if replayed {
        r.Version++
    }
}
```
**Source**: `arkd/internal/core/domain/round.go:271-314`

### Pattern 12: Intent Structure

```go
type Intent struct {
    Id        string     // UUID
    Inputs    []Vtxo     // VTXOs being spent
    Receivers []Receiver // Output destinations
    Proof     string     // Ownership proof (PSBT)
    Message   string     // Signed message
}

func NewIntent(proof, message string, inputs []Vtxo) (*Intent, error) {
    intent := &Intent{
        Id:      uuid.New().String(),
        Inputs:  inputs,
        Proof:   proof,
        Message: message,
    }
    if err := intent.validate(true); err != nil {
        return nil, err
    }
    return intent, nil
}

func (i Intent) TotalInputAmount() uint64 {
    tot := uint64(0)
    for _, in := range i.Inputs {
        tot += in.Amount
    }
    return tot
}

func (i Intent) TotalOutputAmount() uint64 {
    tot := uint64(0)
    for _, r := range i.Receivers {
        tot += r.Amount
    }
    return tot
}
```
**Source**: `arkd/internal/core/domain/intent.go:9-58`

### Pattern 13: Service Layer - Starting a Round

```go
func (s *service) startRound() {
    defer s.wg.Done()

    ctx := context.Background()

    // Cleanup previous round
    existingRound, _ := s.cache.CurrentRound().Get(ctx)
    if existingRound != nil {
        s.cache.ForfeitTxs().Reset(ctx)
        s.cache.Intents().DeleteVtxos(ctx)
        s.cache.ConfirmationSessions().Reset(ctx)
        // ... more cleanup
    }

    // Create new round
    round := domain.NewRound()
    round.StartRegistration()
    s.cache.CurrentRound().Upsert(ctx, func(_ *domain.Round) *domain.Round {
        return round
    })

    log.Debugf("started registration stage for new round: %s", round.Id)

    // Wait for registration duration
    roundTiming := newRoundTiming(s.sessionDuration)
    <-time.After(roundTiming.registrationDuration())

    // Move to confirmation
    s.wg.Add(1)
    go s.startConfirmation(round.Id, roundTiming, s.roundMinParticipantsCount, s.roundMaxParticipantsCount)
}
```
**Source**: `arkd/internal/core/application/service.go:2369-2466`

### Pattern 14: Service Layer - Finalization

```go
func (s *service) startFinalization(
    roundId string, roundTiming roundTiming, registeredIntents []ports.TimedIntent,
) {
    ctx := context.Background()
    round, _ := s.cache.CurrentRound().Get(ctx)

    // Build commitment transaction and VTXO tree
    commitmentTx, vtxoTree, connectorAddress, connectors, err := s.builder.BuildCommitmentTx(
        s.forfeitPubkey, intents, boardingInputs, cosignersPublicKeys,
    )

    // Create MuSig2 coordinator session for tree signing
    coordinator, _ := tree.NewTreeCoordinatorSession(
        root.CloneBytes(), batchOutputAmount, vtxoTree,
    )

    // Generate operator's nonces
    operatorSignerSession := tree.NewTreeSignerSession(s.operatorPrvkey)
    operatorSignerSession.Init(root.CloneBytes(), batchOutputAmount, vtxoTree)
    nonces, _ := operatorSignerSession.GetNonces()
    coordinator.AddNonce(s.operatorPubkey, nonces)

    // Wait for user nonces
    // ... broadcast tree signing started event
    // ... collect nonces from users

    // Aggregate nonces and send to users
    aggregatedNonces, _ := coordinator.AggregateNonces()
    // ... broadcast aggregated nonces

    // Wait for signatures
    // ... collect partial signatures
    signedTree, _ := coordinator.SignTree()

    // Start round finalization
    round.StartFinalization(
        connectorAddress, flatConnectors, flatVtxoTree,
        commitmentPtx.UnsignedTx.TxID(), commitmentTx, vtxoTreeExpiration,
    )
}
```
**Source**: `arkd/internal/core/application/service.go:2701-3062`

### Pattern 15: Forfeit Transaction Collection

```go
func (s *service) finalizeRound(roundId string, roundTiming roundTiming) {
    ctx := context.Background()
    round, _ := s.cache.CurrentRound().Get(ctx)

    // Wait for forfeit txs and boarding signatures
    remainingTime := roundTiming.remainingDuration()
    select {
    case <-s.forfeitsBoardingSigsChan:
        log.Debug("all forfeit txs and boarding inputs signatures have been sent")
    case <-time.After(remainingTime):
        log.Debug("timeout waiting for forfeit txs and boarding inputs signatures")
    }

    // Get collected forfeit txs
    forfeitTxList, _ := s.cache.ForfeitTxs().Pop(ctx)

    // Verify all required forfeits were received
    allForfeitTxsSigned, _ := s.cache.ForfeitTxs().AllSigned(ctx)
    if !allForfeitTxsSigned {
        round.Fail(errors.INTERNAL_ERROR.New("missing forfeit transactions"))
        return
    }

    // Verify signatures
    if convictions := s.verifyForfeitTxsSigs(roundId, forfeitTxList); len(convictions) > 0 {
        round.Fail(errors.INTERNAL_ERROR.New("invalid forfeit txs signature"))
        return
    }

    // Sign and broadcast commitment tx
    signedCommitmentTx, _ := s.wallet.SignCommitmentTx(ctx, round.CommitmentTx)
    s.wallet.BroadcastTransaction(ctx, signedCommitmentTx)

    // End finalization
    changes, _ := round.EndFinalization(forfeitTxs, signedCommitmentTx)
    s.saveEvents(ctx, roundId, changes)

    // Schedule batch sweep
    s.scheduleSweepBatchOutput(round)

    // Start next round
    go s.startRound()
}
```
**Source**: `arkd/internal/core/application/service.go:3064-3335`

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Round domain | `arkd/internal/core/domain/round.go` | `Round`, `RoundStage`, `Stage` |
| Round events | `arkd/internal/core/domain/round_event.go` | `RoundStarted`, `RoundFinalized`, etc. |
| Intent domain | `arkd/internal/core/domain/intent.go` | `Intent`, `Receiver` |
| Service layer | `arkd/internal/core/application/service.go` | `startRound`, `startFinalization`, `finalizeRound` |
| Event repo | `arkd/internal/core/domain/events_repo.go` | Event storage interfaces |
| Cache ports | `arkd/internal/core/ports/cache.go` | `CurrentRound`, `ForfeitTxs`, etc. |

## Common Operations

### Operation 1: Check if VTXO is from a completed round

```go
func isVtxoValid(vtxo Vtxo, round *Round) bool {
    return round.IsEnded() &&
           vtxo.SettledBy == round.CommitmentTxid &&
           vtxo.ExpiresAt > time.Now().Unix()
}
```

### Operation 2: Calculate round expiration

```go
func getRoundExpiration(round *Round) time.Time {
    if !round.IsEnded() {
        return time.Time{}  // Not yet expired
    }
    return time.Unix(round.ExpiryTimestamp(), 0)
}
```

### Operation 3: Get VTXOs created in a round

```go
func getCreatedVtxos(round *Round) []Vtxo {
    vtxos := make([]Vtxo, 0)
    for _, leaf := range round.VtxoTree.Leaves() {
        // Parse VTXO from leaf transaction
        vtxo := parseVtxoFromLeaf(leaf, round)
        vtxos = append(vtxos, vtxo)
    }
    return vtxos
}
```

### Operation 4: Find spent VTXOs in a round

```go
func getSpentVtxos(intents map[string]Intent) []Vtxo {
    spent := make([]Vtxo, 0)
    for _, intent := range intents {
        for _, vtxo := range intent.Inputs {
            if vtxo.RequiresForfeit() {
                spent = append(spent, vtxo)
            }
        }
    }
    return spent
}
```

## Gotchas & Edge Cases

1. **Stage Transitions**: Transitions are one-way. You cannot go back from Finalization to Registration.

2. **Event Sourcing**: The Round is event-sourced. All state changes MUST go through events. Never mutate fields directly.

3. **Failed Rounds**: A failed round cannot be recovered. A new round must be started.

4. **Forfeit Requirements**: VTXOs that are not notes AND not swept require forfeit transactions. Check `RequiresForfeit()`.

5. **Expiration Calculation**: VTXO expiration is `EndingTimestamp + VtxoTreeExpiration`. The expiration is only valid after the round ends.

6. **Concurrent Rounds**: Only ONE round can be active at a time. The service uses a cache to track the current round.

7. **Sweep Tracking**: A round can be swept incrementally. Track `Swept` flag and `SweepTxs` map for full sweep status.

8. **Intent Validation**: Intents are validated for proof validity, expiration timeranges, and non-duplicated inputs.

9. **Boarding Inputs**: Boarding inputs are treated differently - they don't require forfeit txs but need their own signatures.

10. **Round Timing**: The service uses a `roundTiming` helper to calculate registration, confirmation, and finalization durations.

---
**Skill Owner**: ark-developer
**Repos**: arkd
