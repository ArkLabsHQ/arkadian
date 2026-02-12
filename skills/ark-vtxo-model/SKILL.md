---
name: ark-vtxo-model
description: VTXO lifecycle, domain model, states, expiration, and tree construction in Ark protocol
---

# VTXO Model for Ark

## When to Use

Use this skill when:
- Working with VTXO creation, storage, or retrieval
- Understanding VTXO state transitions (spent, swept, settled, unrolled)
- Handling VTXO expiration and refresh logic
- Building or interpreting VTXO trees
- Implementing VTXO spending paths (forfeit vs unilateral exit)
- Converting between server-side and client-side VTXO representations

## Key Concepts

### 1. What is a VTXO?

A VTXO (Virtual Transaction Output) is an off-chain output in Ark:
- Represents a balance owned by a user
- Backed by an on-chain commitment transaction
- Has an expiration time (must be refreshed or settled)
- Can be spent off-chain (fast) or on-chain (unilateral exit)

### 2. VTXO Script Structure

Standard VTXO: `Owner + ASP | Owner after Timeout`

```
Taproot Output
├── Key path: Unspendable (NUMS point)
└── Script tree:
    ├── Leaf 0 (Forfeit): Owner + ASP multisig
    └── Leaf 1 (Exit): Owner after CSV delay
```

- **Forfeit path**: Owner and ASP sign together (collaborative spending)
- **Exit path**: Owner alone after timeout (unilateral exit)

### 3. VTXO States

| State | Description |
|-------|-------------|
| Created | VTXO exists, not yet settled on-chain |
| Preconfirmed | Created in a round, commitment not yet mined |
| Settled | Commitment tx confirmed on-chain |
| Spent | Used as input to another Ark transaction |
| Swept | ASP reclaimed after expiration |
| Unrolled | User performed unilateral exit |

### 4. VTXO vs Note

- **VTXO**: Has commitment chain (tree path), requires forfeit tx when spent
- **Note**: Direct output, no commitment chain, simpler spending

## Code Patterns

### Pattern 1: Server-Side VTXO Domain Model (arkd)

```go
type Vtxo struct {
    Outpoint                      // Txid:VOut identifier
    Amount             uint64     // Satoshi value
    PubKey             string     // Owner's taproot key (hex)
    CommitmentTxids    []string   // Chain of commitment txids to root
    RootCommitmentTxid string     // First commitment in chain
    SettledBy          string     // Commitment txid that settled this
    SpentBy            string     // Forfeit/checkpoint txid that spent this
    ArkTxid            string     // Ark TX that consumed this VTXO
    Spent              bool       // Has been spent
    Unrolled           bool       // User performed unilateral exit
    Swept              bool       // ASP reclaimed after expiry
    Preconfirmed       bool       // Created but commitment not confirmed
    ExpiresAt          int64      // Unix timestamp when VTXO expires
    CreatedAt          int64      // Unix timestamp of creation
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:38-53`

### Pattern 2: Client-Side VTXO Model (go-sdk)

```go
type Vtxo struct {
    Outpoint                      // Txid:VOut identifier
    Script          string        // VTXO script (hex encoded)
    Amount          uint64        // Satoshi value
    CommitmentTxids []string      // Chain to root commitment
    ExpiresAt       time.Time     // When VTXO expires
    CreatedAt       time.Time     // When VTXO was created
    Preconfirmed    bool          // Commitment not yet confirmed
    Swept           bool          // ASP reclaimed
    Unrolled        bool          // User exited unilaterally
    Spent           bool          // Has been spent
    SpentBy         string        // Tx that spent this
    SettledBy       string        // Commitment that settled
    ArkTxid         string        // Ark TX ID
}
```
**Source**: `go-sdk/types/types.go:74-88`

### Pattern 3: Outpoint Identifier

```go
type Outpoint struct {
    Txid string
    VOut uint32
}

func (k *Outpoint) FromString(s string) error {
    parts := strings.Split(s, ":")
    if len(parts) != 2 {
        return fmt.Errorf("invalid outpoint string: %s", s)
    }
    k.Txid = parts[0]
    vout, _ := strconv.ParseUint(parts[1], 10, 32)
    k.VOut = uint32(vout)
    return nil
}

func (k Outpoint) String() string {
    return fmt.Sprintf("%s:%d", k.Txid, k.VOut)
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:15-36`

### Pattern 4: Checking if VTXO is a Note

```go
// Notes have no commitment chain - they're direct outputs
func (v Vtxo) IsNote() bool {
    return len(v.CommitmentTxids) <= 0 && v.RootCommitmentTxid == ""
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:61-63`

### Pattern 5: Checking if VTXO Requires Forfeit

```go
// VTXOs that aren't swept and aren't notes require forfeit tx when spent
func (v Vtxo) RequiresForfeit() bool {
    return !v.Swept && !v.IsNote()
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:65-67`

### Pattern 6: Getting VTXO Taproot Key

```go
func (v Vtxo) TapKey() (*btcec.PublicKey, error) {
    pubkeyBytes, err := hex.DecodeString(v.PubKey)
    if err != nil {
        return nil, err
    }
    return schnorr.ParsePubKey(pubkeyBytes)  // Returns x-only pubkey
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:73-79`

### Pattern 7: Getting VTXO Output Script

```go
func (v Vtxo) OutputScript() ([]byte, error) {
    pubkey, err := v.TapKey()
    if err != nil {
        return nil, err
    }
    return script.P2TRScript(pubkey)  // Returns P2TR scriptPubKey
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:81-87`

### Pattern 8: VTXO is Settled Check

```go
// A VTXO is settled when its commitment tx is confirmed
func (v Vtxo) IsSettled() bool {
    return v.SettledBy != ""
}
```
**Source**: `arkd/internal/core/domain/vtxo.go:69-71`

### Pattern 9: VTXO is Recoverable (Client)

```go
// Recoverable = swept by ASP but user can still claim via unilateral exit
func (v Vtxo) IsRecoverable() bool {
    return v.Swept && !v.Spent
}
```
**Source**: `go-sdk/types/types.go:96-98`

### Pattern 10: Getting Ark Address from VTXO

```go
func (v Vtxo) Address(server *btcec.PublicKey, net arklib.Network) (string, error) {
    buf, _ := hex.DecodeString(v.Script)
    pubkeyBytes := buf[2:]  // Skip OP_1 and push opcode

    pubkey, _ := schnorr.ParsePubKey(pubkeyBytes)

    a := &arklib.Address{
        HRP:        net.Addr,
        Signer:     server,
        VtxoTapKey: pubkey,
    }

    return a.EncodeV0()  // Returns bech32m Ark address
}
```
**Source**: `go-sdk/types/types.go:100-119`

### Pattern 11: Round and VTXO Relationship

```go
type Round struct {
    Id                 string
    Stage              Stage
    Intents            map[string]Intent      // User requests in this round
    CommitmentTxid     string                 // On-chain anchor
    CommitmentTx       string                 // Commitment transaction
    VtxoTree           tree.FlatTxTree        // Tree of VTXO transactions
    Connectors         tree.FlatTxTree        // Connector tree
    VtxoTreeExpiration int64                  // When VTXOs expire (seconds)
    // ...
}
```
**Source**: `arkd/internal/core/domain/round.go:41-59`

### Pattern 12: Round Stages

```go
const (
    RoundUndefinedStage RoundStage = iota
    RoundRegistrationStage   // Collecting user intents
    RoundFinalizationStage   // Building/signing tree
)

func (r *Round) IsStarted() bool {
    return !r.IsFailed() && !r.IsEnded() && r.Stage != empty
}

func (r *Round) IsEnded() bool {
    return !r.IsFailed() && r.Stage.Code == int(RoundFinalizationStage) && r.Stage.Ended
}

func (r *Round) IsFailed() bool {
    return r.Stage.Failed
}
```
**Source**: `arkd/internal/core/domain/round.go:11-16, 249-260`

### Pattern 13: VTXO Tree Expiration

```go
func (r *Round) ExpiryTimestamp() int64 {
    if r.IsEnded() {
        return time.Unix(r.EndingTimestamp, 0).Add(
            time.Second * time.Duration(r.VtxoTreeExpiration),
        ).Unix()
    }
    return -1  // Round not ended yet
}
```
**Source**: `arkd/internal/core/domain/round.go:262-269`

### Pattern 14: VTXO Event Types (Client)

```go
const (
    VtxosAdded VtxoEventType = iota
    VtxosSpent
    VtxosUpdated
)

type VtxoEvent struct {
    Type  VtxoEventType
    Vtxos []Vtxo
}
```
**Source**: `go-sdk/types/types.go:144-163`

### Pattern 15: Forfeit Transaction

```go
type ForfeitTx struct {
    Txid string  // Transaction ID
    Tx   string  // Signed transaction hex
}

// Forfeit txs are required when ending finalization for non-note VTXOs
func (r *Round) EndFinalization(forfeitTxs []ForfeitTx, finalCommitmentTx string) ([]Event, error) {
    if len(forfeitTxs) <= 0 {
        for _, intent := range r.Intents {
            for _, in := range intent.Inputs {
                if in.RequiresForfeit() {
                    return nil, fmt.Errorf("missing list of signed forfeit txs")
                }
            }
        }
    }
    // ...
}
```
**Source**: `arkd/internal/core/domain/round.go:36-39, 165-176`

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Server VTXO model | `arkd/internal/core/domain/vtxo.go` | `Vtxo`, `Outpoint`, `IsNote`, `RequiresForfeit` |
| Client VTXO model | `go-sdk/types/types.go` | `Vtxo`, `VtxoEvent`, `VtxoEventType` |
| Round domain | `arkd/internal/core/domain/round.go` | `Round`, `RoundStage`, `ForfeitTx` |
| VTXO script | `arkd/pkg/ark-lib/script/vtxo_script.go` | `VtxoScript`, `DefaultVtxoScript` |
| Tree structure | `arkd/pkg/ark-lib/tree/tx_tree.go` | `TxTree`, `FlatTxTree` |

## Common Operations

### Operation 1: Check if VTXO can be spent off-chain

```go
func canSpendOffchain(vtxo Vtxo) bool {
    return !vtxo.Spent &&
           !vtxo.Swept &&
           !vtxo.Unrolled &&
           vtxo.IsSettled()
}
```

### Operation 2: Calculate VTXO expiration

```go
// VTXOs expire based on the round's VtxoTreeExpiration
expiresAt := round.EndingTimestamp + round.VtxoTreeExpiration
```

### Operation 3: Determine spending path

```go
func getSpendingPath(vtxo Vtxo) string {
    if vtxo.IsNote() {
        return "direct"  // No forfeit needed
    }
    if vtxo.Swept {
        return "unilateral_exit"  // Must use exit path after delay
    }
    return "forfeit"  // Normal cooperative spend
}
```

### Operation 4: Create VTXO from round output

```go
func NewVtxoFromRound(round *Round, outpoint Outpoint, amount uint64, pubkey string) Vtxo {
    return Vtxo{
        Outpoint:           outpoint,
        Amount:             amount,
        PubKey:             pubkey,
        RootCommitmentTxid: round.CommitmentTxid,
        ExpiresAt:          round.ExpiryTimestamp(),
        CreatedAt:          round.EndingTimestamp,
        Preconfirmed:       true,  // Until commitment confirms
    }
}
```

## VTXO Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    VTXO LIFECYCLE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Intent ──► Round Registration ──► Tree Construction   │
│                                              │               │
│                                              ▼               │
│  ┌────────────────────────────────────────────────────┐     │
│  │                 PRECONFIRMED                        │     │
│  │  (commitment tx in mempool, not confirmed)          │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼ (commitment confirmed)            │
│  ┌────────────────────────────────────────────────────┐     │
│  │                   SETTLED                           │     │
│  │  (on-chain, spendable, has expiration)              │     │
│  └────────────────────────────────────────────────────┘     │
│         │              │              │                      │
│         ▼              ▼              ▼                      │
│    ┌────────┐    ┌─────────┐    ┌──────────┐                │
│    │ SPENT  │    │ UNROLLED│    │  SWEPT   │                │
│    │(forfeit│    │(unilat. │    │(ASP re-  │                │
│    │ path)  │    │ exit)   │    │ claimed) │                │
│    └────────┘    └─────────┘    └──────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Gotchas & Edge Cases

1. **Commitment Chain**: VTXOs have a chain of commitment txids back to root. All must be valid for the VTXO to be spendable.

2. **Preconfirmed State**: A VTXO is preconfirmed until its commitment tx is mined. Don't treat preconfirmed VTXOs as fully secure.

3. **Expiration Handling**: VTXOs expire! Always check `ExpiresAt` before attempting to spend. Expired VTXOs need refresh (new round participation).

4. **Swept vs Unrolled**:
   - Swept = ASP reclaimed after expiry
   - Unrolled = User performed unilateral exit
   Both remove the VTXO from off-chain circulation.

5. **Notes are Special**: Notes don't require forfeit transactions. Check `IsNote()` before requiring forfeit.

6. **PubKey Format**: Server stores pubkey as hex-encoded x-only (32 bytes). Client stores full script.

7. **Time Zones**: `ExpiresAt` is Unix timestamp (UTC). Always use time.Unix() for conversions.

8. **Concurrent Updates**: VTXOs can be updated from multiple sources (rounds, sweeps, settlements). Use version control or proper locking.

9. **Client vs Server Model**: Field names differ slightly. Client uses `time.Time`, server uses `int64` for timestamps.

10. **Recoverable VTXOs**: If swept but not spent, user can still recover via unilateral exit (but must wait for CSV delay).

---
**Skill Owner**: ark-developer
**Repos**: arkd, go-sdk
