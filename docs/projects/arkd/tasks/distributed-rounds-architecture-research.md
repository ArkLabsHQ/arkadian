# Fault-Tolerant Distributed Round Architecture for Arkd

**Research Report**
**Date:** 2025-10-24
**Status:** Research Complete
**Author:** Ark Research Team
**Arkd Version Analyzed:** v0.7.1 (commit e16538b)

---

## Executive Summary

This document presents a comprehensive architectural design for enabling multiple arkd nodes to coordinate Ark rounds reliably through distributed consensus. The research addresses scalability, fault tolerance, and operator key management while preserving Ark protocol security guarantees.

### Key Recommendations

1. **Adopt Raft Consensus** - Use Raft (not BFT) for crash-fault tolerance in single-operator deployments
2. **Leader-Based Execution** - Only Raft leader executes round state machine; followers passively replicate
3. **HSM Key Management** - Centralized operator keys via AWS CloudHSM with leader-only access
4. **Phased Implementation** - 4-phase roadmap over 7-10 months (active-passive → Raft → active-active → optional BFT)
5. **Sub-500ms Failover** - Automatic leader election with minimal downtime

### Performance Impact

- **Latency Overhead:** +100-200ms per round (from Raft consensus)
- **Network Bandwidth:** 1.5GB/day for 3-node cluster
- **Throughput:** No degradation (Bitcoin confirmation is bottleneck)
- **Cost:** 5x infrastructure cost ($1,550/month vs $300/month) for 99.99% availability

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Distributed Architecture Design](#2-distributed-architecture-design)
3. [Security Model: Operator Key Distribution](#3-security-model-operator-key-distribution)
4. [Failure Recovery Procedures](#4-failure-recovery-procedures)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Code Modification Points](#6-code-modification-points)
7. [Performance Analysis](#7-performance-analysis)
8. [Alternative Approaches Considered](#8-alternative-approaches-considered)
9. [Final Recommendations](#9-final-recommendations)
10. [Sources](#10-sources)
11. [Next Steps](#11-next-steps)

---

## 1. Current Architecture Analysis

### 1.1 Single-Node Architecture Overview

The arkd service implements a **sequential state machine** for round management:

```
1. Registration Stage (1/6 of round interval, min 1s)
   └─> Users call RegisterIntent() → Intent queue fills

2. Confirmation Stage (50% of remaining time)
   └─> Pop intents → Send BatchStarted event → Wait confirmations
   └─> Check liquidity → Abort if insufficient

3. Finalization Stage (33% of remaining time, 3 sub-stages)
   ├─> Build commitment tx
   ├─> MuSig2 tree signing (nonce collection → aggregation → signatures)
   └─> Forfeit + boarding sig collection → Broadcast commitment tx

4. Round Finalization
   └─> Wait for confirmation → Mark VTXOs spent/created → Start next round
```

**Source:** `/Users/dusansekulic/code/go/ark/internal/core/application/service.go:1805-2432`

### 1.2 Critical State Requiring Replication

#### Ephemeral State (LiveStore)

- **Intents Queue** (`IntentStore`) — User registration requests with boarding inputs
- **Current Round** (`CurrentRoundStore`) — Active round state, commitment tx, VTXO tree
- **Forfeit Transactions** (`ForfeitTxsStore`) — Signed forfeit txs from participants
- **Confirmation Sessions** (`ConfirmationSessionsStore`) — Intent confirmation tracking
- **Tree Signing Sessions** (`TreeSigningSessionsStore`) — MuSig2 nonces and partial signatures
- **Offchain Transactions** (`OffChainTxStore`) — Pending collaborative txs
- **Boarding Inputs** (`BoardingInputsStore`) — Number of boarding inputs per round

**Source:** `/Users/dusansekulic/code/go/ark/internal/core/ports/live_store.go:12-84`

#### Persistent State (RepoManager)

- **Events Repository** — Event sourced domain events (RoundStarted, RoundFinalized, etc.)
- **Rounds Repository** — Finalized round data (commitment tx, VTXO tree, expiry)
- **VTXOs Repository** — VTXO lifecycle states (unconfirmed, confirmed, spent, swept)
- **Offchain Transactions Repository** — Finalized offchain txs
- **Scheduled Sessions Repository** — Market hour configurations

### 1.3 Single-Node Failure Modes

#### Failure Point 1: Registration Phase
- Node crashes → All queued intents lost (unless LiveStore persisted to Redis)
- No other node can take over → Round aborted

#### Failure Point 2: Confirmation Stage
- Node crashes after sending BatchStarted event → Participants wait indefinitely
- Partial confirmation state lost → Cannot resume

#### Failure Point 3: MuSig2 Signing
- Node crashes during nonce collection → Incomplete aggregation
- Nonces are ephemeral → Cannot resume, must restart round
- Participants' nonces wasted → Security risk if reused

#### Failure Point 4: Post-Broadcast
- Node crashes after broadcasting commitment tx but before event persistence
- VTXO state inconsistent → Participants cannot track their VTXOs
- Recovery requires blockchain scanning

#### Operational Impact

- **Downtime:** Any node failure aborts current round (30s-60s typical interval)
- **Participant Experience:** Wasted time, forfeits, gas costs from failed boarding
- **Liquidity Lock:** Operator liquidity tied up in unfinalized rounds

### 1.4 Critical Sections Requiring Coordination

#### Atomic Sections (MUST NOT be distributed)

1. **Commitment TX Construction** — Single node builds PSBT to ensure deterministic txid
2. **VTXO Tree Generation** — Tree structure must be identical across nodes
3. **MuSig2 Aggregation** — Nonce/signature aggregation is stateful and sequential

#### Coordination Points (CAN be distributed with consensus)

1. **Intent Selection** — Deterministic popping from queue (requires lock)
2. **Liquidity Check** — Read-only wallet balance query
3. **Round Timing** — Leader election determines round start
4. **Event Persistence** — Append-only, can use Raft log replication

---

## 2. Distributed Architecture Design

### 2.1 Recommended Architecture: Leader-Based Raft Consensus

**Rationale:**

After analyzing arkd's requirements against consensus algorithms (Raft, Paxos, BFT), **Raft** is the optimal choice:

**Why Raft over BFT:**
- **Trust Model:** Arkd operators are **not Byzantine adversaries**. Operators have economic incentives to behave honestly (reputation, liquidity at stake). BFT's 33% fault tolerance is overkill.
- **Performance:** BFT requires 3f+1 nodes with quadratic message complexity (O(n²)). Raft requires only 2f+1 nodes with linear complexity.
- **Complexity:** BFT implementations are significantly more complex. Raft has production-ready libraries (etcd, Consul).

**Why Raft over Paxos:**
- **Understandability:** Raft explicitly decomposes consensus into leader election, log replication, and safety. Paxos is notoriously difficult to implement correctly.
- **Production Maturity:** Raft powers Kubernetes (etcd), CockroachDB, Consul. Well-tested at scale.

### 2.2 System Topology

```
┌─────────────────────────────────────────────────┐
│               Client Layer                       │
│         (Users, Wallets via gRPC)                │
└────────────────┬────────────────────────────────┘
                 │ Load Balanced Requests
        ┌────────┼────────┐
        │        │        │
     ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
     │Node1│  │Node2│  │Node3│  (Raft Cluster, 3-5 nodes)
     │Leader│ │Follow│  │Follow│
     └──┬──┘  └──┬──┘  └──┬──┘
        │        │        │
        └────────┼────────┘
                 │ Raft Consensus (Log Replication)
        ┌────────▼────────┐
        │  Shared State    │
        │  - Event Store   │
        │  - Round Data    │
        │  - VTXO Registry │
        └─────────────────┘
                 │
        ┌────────▼────────┐
        │ Operator Wallet  │  (Single instance, connected to leader)
        │ (NBXplorer)      │
        └─────────────────┘
```

**Key Design Decisions:**

1. **3-Node Minimum:** Tolerates 1 failure (2f+1 = 3, f=1)
2. **5-Node Recommended:** Tolerates 2 failures (production setting)
3. **Leader Handles Rounds:** Only Raft leader executes round state machine
4. **Followers Replicate State:** Passive replication via Raft log
5. **Client Routing:** Smart load balancer redirects writes to leader

### 2.3 State Machine Replication Strategy

#### Raft Log Entries (Replicated State)

Each critical operation becomes a Raft log entry:

```go
type RaftLogEntry struct {
    Index     uint64
    Term      uint64
    Type      LogEntryType
    Timestamp int64
    Data      []byte // Serialized domain event or command
}

type LogEntryType int
const (
    LogEntryIntentRegistered LogEntryType = iota
    LogEntryRoundStarted
    LogEntryBatchStarted
    LogEntryIntentConfirmed
    LogEntryMuSig2NoncesCollected
    LogEntryMuSig2SignaturesCollected
    LogEntryRoundFinalized
    LogEntryRoundFailed
)
```

#### Replication Flow

```
1. Leader receives RegisterIntent(intent)
   ↓
2. Leader appends LogEntryIntentRegistered to Raft log
   ↓
3. Raft replicates to followers (majority write)
   ↓
4. Leader applies intent to LiveStore
   ↓
5. Leader returns success to client
```

**Consistency Guarantee:** **Linearizable** — All nodes see the same sequence of state transitions.

### 2.4 Leader Election Mechanism

**Raft Leader Election (Standard Algorithm):**

1. **Initial State:** All nodes start as followers
2. **Election Timeout:** Random 150-300ms (prevents split votes)
3. **Candidate Phase:**
   - Follower timeout → Increment term → Request votes
   - Vote for self, send RequestVote RPCs to all peers
4. **Majority Vote:** Candidate receiving majority becomes leader
5. **Heartbeats:** Leader sends AppendEntries heartbeats every 50ms

**Round Leadership:** Only the Raft leader executes the round state machine.

**Leadership Transition:**
```
Old Leader Crashes
   ↓
Election timeout triggers (150-300ms)
   ↓
New leader elected (within 500ms typical)
   ↓
New leader reads last committed Raft log entry
   ↓
Reconstructs current round state from log
   ↓
Resumes round execution OR aborts and starts new round
```

---

## 3. Security Model: Operator Key Distribution

### 3.1 Critical Key Material in Arkd

**1. Forfeit Key (forfeitPubkey):**
- **Purpose:** Co-signs VTXO exit paths to prevent theft during CSV delay
- **Usage:** Signs checkpoint transactions, forfeit transactions
- **Requirement:** **MUST be available** to sign forfeit txs during confirmation stage

**2. Signer Key (signerPubkey):**
- **Purpose:** ASP's signing public key for covenant enforcement
- **Usage:** Participant in MuSig2 tree signing
- **Requirement:** **MUST participate** in every MuSig2 signing session

**3. Operator MuSig2 Key (operatorPrvkey):**
- **Purpose:** Ephemeral key for MuSig2 coordination with participants
- **Usage:** Generates nonces, signs VTXO tree transactions
- **Requirement:** **MUST be consistent** across leader transitions to avoid nonce reuse

**4. Wallet Private Keys:**
- **Purpose:** Sign commitment transaction inputs (liquidity provision)
- **Usage:** Broadcast commitment tx, fund batches
- **Requirement:** **MUST NOT be shared** across nodes (security risk)

### 3.2 Recommended Key Management Strategy

#### Option A: Active-Passive with HSM (Recommended for Production)

```
┌─────────────────────────────────────────┐
│        Hardware Security Module         │
│  (AWS CloudHSM / Ledger Enterprise)     │
│                                          │
│  - Forfeit Private Key                   │
│  - Signer Private Key                    │
│  - Deterministic MuSig2 Key Derivation   │
└────────────┬────────────────────────────┘
             │ API Calls (Authenticated)
    ┌────────┼────────┐
    │        │        │
 ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
 │Node1│  │Node2│  │Node3│  (Only leader calls HSM)
 │Leader│ │Follow│  │Follow│
 └──┬──┘  └─────┘  └─────┘
    │
    │ Controls
 ┌──▼────────────┐
 │ Operator Wallet│ (NBXplorer, single instance)
 └───────────────┘
```

**Advantages:**
- ✅ **Single Source of Truth:** HSM stores keys, all nodes query via API
- ✅ **Leader-Only Access:** Only Raft leader has permission to call HSM
- ✅ **No Key Distribution:** Keys never leave HSM
- ✅ **Audit Trail:** All signing operations logged
- ✅ **Failover:** New leader inherits HSM access automatically

**Implementation:**
- AWS CloudHSM with `pkcs11` interface
- Operator wallet (NBXplorer) runs on leader node only
- Forfeit/signer keys accessed via PKCS#11 API
- MuSig2 nonces generated deterministically from HSM-derived seed

**Disadvantages:**
- ❌ HSM is single point of failure (mitigate with HSM clustering)
- ❌ Latency overhead for remote HSM calls (~10-50ms per signature)

#### Option B: Threshold Signatures (FROST) — Future Enhancement

```
┌──────┐  ┌──────┐  ┌──────┐
│Node1 │  │Node2 │  │Node3 │
│ key1 │  │ key2 │  │ key3 │  (2-of-3 threshold)
└──┬───┘  └──┬───┘  └──┬───┘
   │         │         │
   └─────────┼─────────┘
        MPC Signing
        (FROST Protocol)
             │
          Combined
         Signature
```

**Advantages:**
- ✅ **No Single Point of Failure:** Threshold 2-of-3 means any 2 nodes can sign
- ✅ **Byzantine Tolerance:** Can tolerate 1 malicious node (if threshold=n-1)
- ✅ **Key Distribution:** Keys generated via DKG (Distributed Key Generation)

**Disadvantages:**
- ❌ **High Complexity:** FROST DKG is significantly more complex than MuSig2
- ❌ **Not Production-Ready:** FROST for Bitcoin still under development (BIP draft stage as of 2025)
- ❌ **Latency:** Multi-round MPC protocol adds 100-500ms per signature
- ❌ **Coordinator Dependency:** FROST requires a coordinator (ROAST protocol mitigates)

**Recommendation:** **Start with Option A (HSM)**, migrate to **Option B (FROST)** once mature (2026+).

### 3.3 Forfeit Transaction Handling Across Nodes

**Challenge:** Forfeit transactions must be signed **during confirmation stage** (time-critical).

**Solution: Leader-Only Signing with HSM**

```
Confirmation Stage:
1. Leader receives SubmitForfeitTxs() from participants
   ↓
2. Leader validates forfeit tx structure
   ↓
3. Leader calls HSM to co-sign with forfeit key
   ↓
4. Leader replicates signed forfeits to Raft log
   ↓
5. Followers apply to ForfeitTxsStore (passive replication)
```

**Failover Scenario:**
```
Leader crashes mid-forfeit-signing
   ↓
New leader elected (500ms)
   ↓
Reads last committed Raft log entry
   ↓
If forfeits incomplete:
   - Reconstruct forfeit state from log
   - Resume HSM signing
Else:
   - Abort round (participants re-register next round)
```

**Security Guarantee:** Forfeit transactions replicated to majority before round proceeds.

### 3.4 Byzantine Tolerance Requirements

**Trust Assumptions:**

1. **Honest Majority of Nodes:** Raft assumes at least (n/2)+1 nodes are crash-fault-tolerant but **not malicious**.
2. **Operator Economic Incentives:** Operators have skin in the game (liquidity at risk, reputation).
3. **No Sybil Attacks:** Nodes are permissioned (not open P2P network).

**Do We Need Byzantine Fault Tolerance (BFT)?**

**Answer: NO, for Phase 1-3.** Rationale:

- **Internal Deployment:** Arkd nodes operated by **single entity** (ASP operator)
- **No External Attackers:** Nodes communicate over private network (VPN, VPC)
- **Economic Alignment:** All nodes controlled by same economic actor

**Future Consideration (Phase 4):** If Ark moves to **federated model** (multiple independent operators), then BFT becomes necessary:
- Use **PBFT** (Practical Byzantine Fault Tolerance) or **HotStuff** consensus
- Threshold signatures (FROST) for operator keys
- Slash malicious operators via Bitcoin covenant escrow

### 3.5 Attack Vectors and Mitigations

**Attack 1: Leader Equivocation**
- **Scenario:** Malicious leader sends conflicting BatchStarted events to different participants
- **Mitigation:** Raft log replication ensures linearizability. Conflicting log entries rejected by followers.
- **Detection:** Participants verify commitment tx matches BatchStarted event hash.

**Attack 2: Split-Brain (Network Partition)**
- **Scenario:** Network partition causes 2 leaders (old leader isolated)
- **Mitigation:** Raft's term mechanism. Old leader's writes rejected when partition heals.
- **Impact:** Isolated leader's round aborted. Participants re-register.

**Attack 3: Compromised HSM**
- **Scenario:** Attacker gains HSM access, signs fraudulent forfeits
- **Mitigation:** HSM access control (mTLS, IP whitelist, audit logs). Threshold signatures (FROST) in future.
- **Detection:** Fraud detection service monitors blockchain for unauthorized forfeit broadcasts.

**Attack 4: Malicious Node Joins Raft Cluster**
- **Scenario:** Attacker adds rogue node to cluster
- **Mitigation:** Raft membership changes require majority approval. Use static cluster configuration.
- **Prevention:** Mutual TLS authentication for Raft RPC.

---

## 4. Failure Recovery Procedures

### 4.1 Failure During Registration Phase

**Scenario:** Leader crashes while intents are being registered.

**State Before Crash:**
- Intents queue has N entries (replicated to Raft log)
- Current round in "registration" stage

**Recovery Steps:**
```
1. Election timeout triggers (150-300ms)
   ↓
2. New leader elected (within 500ms)
   ↓
3. New leader reads Raft log:
   - Last entry: LogEntryRoundStarted
   - Intent entries: LogEntryIntentRegistered × N
   ↓
4. New leader reconstructs:
   - CurrentRound from RoundStarted event
   - Intents queue from IntentRegistered events
   ↓
5. New leader checks elapsed time since round start:
   If < registration duration:
      → Resume registration (accept more intents)
   Else:
      → Proceed to confirmation stage
```

**Participant Impact:** **Minimal.** Intents preserved in Raft log. ~500ms delay.

### 4.2 Failure During MuSig2 Nonce Collection

**Scenario:** Leader crashes after sending TreeNoncesRequest but before nonce aggregation.

**State Before Crash:**
- MuSig2 session created (replicated to Raft log: LogEntryTreeSigningSessionCreated)
- Partial nonces received from some participants (in TreeSigningSessionsStore)

**Challenge:** **Nonces are ephemeral**. If leader crashes, participants' nonces are **wasted**. Reusing nonces is a **critical security vulnerability** (nonce reuse attack).

**Recovery Steps:**
```
1. New leader elected
   ↓
2. New leader reads Raft log:
   - TreeSigningSession created but not completed
   ↓
3. Decision:
   ABORT round and start new round
   Reason: Cannot resume MuSig2 session without risking nonce reuse
   ↓
4. New leader:
   - Emits RoundFailed event
   - Re-queues unconfirmed intents
   - Starts new round
```

**Participant Impact:** **Moderate.** Round aborted. Participants must re-submit intents. Nonces wasted but security preserved.

**Optimization (Future):** Use **ROAST protocol** (Robust Asynchronous Schnorr Threshold Signatures) to make MuSig2 resilient to failures.

### 4.3 Failure After Broadcasting Commitment TX

**Scenario:** Leader crashes immediately after broadcasting commitment tx but before replicating RoundFinalized event.

**State Before Crash:**
- Commitment tx broadcasted (txid known, in mempool/confirmed)
- RoundFinalized event NOT persisted to Raft log

**Recovery Steps:**
```
1. New leader elected
   ↓
2. New leader reads Raft log:
   - Last entry: LogEntryRoundFinalizationStarted (commitment tx built)
   - No RoundFinalized event
   ↓
3. New leader queries blockchain scanner:
   - Check if commitment tx confirmed
   ↓
4. If confirmed:
      → Reconstruct RoundFinalized event from blockchain
      → Persist to Raft log
      → Mark VTXOs spent/created
      → Emit transaction events
   Else (in mempool or not broadcast):
      → Abort round
      → Re-queue intents
```

**Participant Impact:** **Low if tx confirmed**. Recovery via blockchain scan. If tx not confirmed, round aborted.

**Mitigation:** Replicate `LogEntryCommitmentTxBroadcasted` to Raft log **before** broadcasting. This ensures majority knows about broadcast.

### 4.4 Network Partition Handling

**Scenario:** Network partition splits cluster into 2 groups (minority and majority).

**Raft Behavior:**
```
Cluster: Node1 (Leader), Node2, Node3
Network partition: {Node1} | {Node2, Node3}

Minority partition (Node1):
   - Loses quorum (1 < 2)
   - Cannot commit log entries
   - Steps down from leadership after heartbeat failures

Majority partition (Node2, Node3):
   - Maintains quorum (2 >= 2)
   - Elects new leader (Node2 or Node3)
   - Continues processing rounds
```

**When Partition Heals:**
```
1. Node1 reconnects
   ↓
2. Node1's term < current term
   ↓
3. New leader's log replicated to Node1
   ↓
4. Node1 becomes follower
   ↓
5. Any uncommitted entries on Node1 discarded
```

**Split-Brain Prevention:** Raft's term mechanism guarantees **at most one leader per term**.

### 4.5 Participant Connection Failover

**Challenge:** Participant connected to Node1 (leader). Node1 crashes. Participant's gRPC connection broken.

**Solution: Client-Side Leader Discovery**

```go
// Smart gRPC client
type ArkClient struct {
    nodes   []string // ["node1:7070", "node2:7070", "node3:7070"]
    current int
}

func (c *ArkClient) RegisterIntent(intent *Intent) error {
    for attempt := 0; attempt < len(c.nodes); attempt++ {
        conn := c.connectTo(c.nodes[c.current])
        err := conn.RegisterIntent(intent)
        if err == nil {
            return nil
        }
        if isNotLeaderError(err) {
            // Server returned: "Not leader, try node2:7070"
            c.current = parseLeaderHint(err)
            continue
        }
        if isNetworkError(err) {
            c.current = (c.current + 1) % len(c.nodes)
            continue
        }
        return err
    }
    return errors.New("all nodes unreachable")
}
```

**Protocol:**
1. Client tries Node1
2. Node1 down or not leader → Returns error with leader hint
3. Client retries with leader node
4. Operation succeeds

**Latency Impact:** Additional RTT (~50-100ms) on failover. Amortized over round interval (30s), negligible.

**Alternative:** Use **gRPC load balancer with health checks** (requires DNS-based service discovery).

---

## 5. Implementation Roadmap

### Phase 1: Basic Redundancy (Active-Passive) — 2-3 months

**Goal:** Achieve basic fault tolerance without changing round logic.

**Architecture:**
```
┌──────┐         ┌──────┐
│Active│ <-----> │Passive│  (Heartbeat + State Sync)
│Leader│         │Standby│
└───┬──┘         └───┬───┘
    │                │
    └────────┬───────┘
         ┌───▼───┐
         │  HSM  │
         └───────┘
```

**Components:**

1. **State Replication:**
   - Active leader writes to PostgreSQL + Redis
   - Passive follower replicates via PostgreSQL streaming replication + Redis replication
   - **No Raft yet** (simpler first step)

2. **Heartbeat Monitoring:**
   - Active sends heartbeats every 5s
   - Passive promotes to active if no heartbeat for 15s

3. **HSM Integration:**
   - Both nodes connect to HSM
   - Only active node has signing permission
   - Failover updates HSM ACL

4. **Operator Wallet:**
   - Single NBXplorer instance
   - Controlled by active node
   - Passive node can start backup NBXplorer instance

**Deliverables:**
- ✅ PostgreSQL + Redis replication configured
- ✅ Heartbeat service (`internal/infrastructure/heartbeat/`)
- ✅ HSM integration (`internal/infrastructure/signer/hsm/`)
- ✅ Failover script (promotes passive → active)
- ✅ Integration tests (simulate active crash)

**Limitations:**
- ❌ No automatic failover (requires manual intervention or external orchestrator)
- ❌ Split-brain possible if network partition
- ❌ ~10-30s failover time

### Phase 2: Leader Election and Auto-Failover — 3-4 months

**Goal:** Automated leader election with sub-second failover.

**Architecture:**
```
┌──────┐  Raft  ┌──────┐  Raft  ┌──────┐
│Node1 │ <----> │Node2 │ <----> │Node3 │
│Leader│        │Follow│        │Follow│
└──────┘        └──────┘        └──────┘
   ↓ Raft Log Replication
PostgreSQL (Event Store)
```

**Components:**

1. **Raft Integration:**
   - Use `hashicorp/raft` library (production-grade, used by Consul)
   - Create `internal/infrastructure/consensus/raft/`
   - Implement `FSM` (Finite State Machine) for arkd state

```go
// Example Raft FSM
type ArkStateMachine struct {
    liveStore ports.LiveStore
}

func (fsm *ArkStateMachine) Apply(log *raft.Log) interface{} {
    var entry RaftLogEntry
    json.Unmarshal(log.Data, &entry)

    switch entry.Type {
    case LogEntryIntentRegistered:
        intent := decodeIntent(entry.Data)
        fsm.liveStore.Intents().Push(intent, ...)
    case LogEntryRoundStarted:
        round := decodeRound(entry.Data)
        fsm.liveStore.CurrentRound().Upsert(round)
    // ... other log types
    }
    return nil
}
```

2. **State Transition Guards:**
   - Modify `service.go` to check leadership before mutating state:

```go
func (s *service) RegisterIntent(ctx, intent) error {
    if !s.raft.IsLeader() {
        return errors.New("not leader, try %s", s.raft.Leader())
    }

    // Append to Raft log (blocks until majority write)
    err := s.raft.Apply(LogEntryIntentRegistered, intent)
    if err != nil {
        return err
    }

    // State already applied by FSM.Apply()
    return nil
}
```

3. **Leader-Only Round Execution:**
   - Only leader runs `start()` goroutine
   - Followers replicate state passively
   - On leadership change, new leader resumes round

4. **Client Redirection:**
   - Non-leader nodes return `NotLeaderError` with leader hint
   - gRPC interceptor adds leader address to error metadata

**Deliverables:**
- ✅ Raft cluster setup (3-node minimum)
- ✅ `ArkStateMachine` FSM implementation
- ✅ Leadership-aware service methods
- ✅ Client library with auto-retry
- ✅ Raft membership management (add/remove nodes)
- ✅ Monitoring (leader elections, log lag, quorum health)

**Benefits:**
- ✅ Sub-500ms failover
- ✅ Automatic leader election
- ✅ Split-brain prevention
- ✅ Linearizable consistency

### Phase 3: Active-Active with Load Balancing — 2-3 months

**Goal:** Distribute read queries across all nodes. Writes still go to leader.

**Architecture:**
```
        ┌─────────────┐
        │Load Balancer│
        └─────┬───────┘
              │ Read Queries (Round-Robin)
     ┌────────┼────────┐
     │        │        │
  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
  │Node1│  │Node2│  │Node3│
  │Leader│ │Follow│  │Follow│
  └─────┘  └─────┘  └─────┘
```

**Components:**

1. **Read-Only Methods:**
   - `GetRoundDetails()` ← Read from any node
   - `GetVtxos()` ← Read from any node
   - `GetVtxoTree()` ← Read from any node
   - Followers serve stale-read queries (eventual consistency acceptable)

2. **Write Methods:**
   - `RegisterIntent()` ← Forward to leader
   - `ConfirmRegistration()` ← Forward to leader
   - `SubmitForfeitTxs()` ← Forward to leader

3. **Load Balancer Configuration:**
   - Traefik or Nginx with health checks
   - Route reads to all nodes (least-connections)
   - Route writes to leader only (detect via gRPC metadata)

**Deliverables:**
- ✅ gRPC service split into read/write endpoints
- ✅ Load balancer with leader-aware routing
- ✅ Follower read path implementation
- ✅ Benchmark (read throughput improvement)

**Benefits:**
- ✅ 3x read throughput (3-node cluster)
- ✅ Lower leader CPU utilization
- ✅ Better resource utilization

### Phase 4: Byzantine Fault Tolerance (Optional, 2026+) — 6-12 months

**Goal:** Tolerate malicious nodes in federated Ark scenario.

**When Needed:** If Ark moves to **multi-operator federation** (e.g., 5 independent ASPs run shared arkd cluster).

**Architecture:**
```
Operator A     Operator B     Operator C
  ┌────┐         ┌────┐         ┌────┐
  │Node│ <--BFT->│Node│ <--BFT->│Node│
  └────┘         └────┘         └────┘
     ↓              ↓              ↓
   FROST         FROST          FROST
  (2-of-3 Threshold Signing)
```

**Components:**

1. **Replace Raft with HotStuff/Tendermint:**
   - BFT consensus algorithm
   - 3f+1 nodes to tolerate f Byzantine faults

2. **FROST Threshold Signatures:**
   - Distributed key generation (DKG)
   - 2-of-3 or 3-of-5 threshold for forfeit/signer keys
   - Each operator holds key share

3. **Slashing Mechanism:**
   - Detect equivocation via Bitcoin covenant
   - Slash operator's Bitcoin collateral

**Deliverables:**
- ✅ HotStuff/Tendermint integration
- ✅ FROST DKG implementation
- ✅ BFT-aware round state machine
- ✅ Slashing contract (Bitcoin covenant)

**Benefits:**
- ✅ Trustless federation
- ✅ Censorship resistance
- ✅ No single operator control

**Challenges:**
- ❌ High complexity (6-12 months effort)
- ❌ Performance overhead (3-5x slower than Raft)
- ❌ FROST still maturing (BIP draft stage)

---

## 6. Code Modification Points

### 6.1 Core Application Layer

**File:** `/Users/dusansekulic/code/go/ark/internal/core/application/service.go`

**Changes:**

1. **Add Raft Interface Dependency:**
```go
type service struct {
    // Existing fields...
    wallet         ports.WalletService
    signer         ports.SignerService
    repoManager    ports.RepoManager

    // NEW: Raft consensus
    raft           ports.ConsensusService

    // Existing fields...
}
```

2. **Wrap State Mutations with Raft Log Appends:**

**Before:**
```go
func (s *service) RegisterIntent(ctx, intent) error {
    // Directly mutate LiveStore
    s.cache.Intents().Push(intent, ...)
    return nil
}
```

**After:**
```go
func (s *service) RegisterIntent(ctx, intent) error {
    // Check leadership
    if !s.raft.IsLeader() {
        return errors.NotLeader(s.raft.Leader())
    }

    // Append to Raft log (replicates to majority)
    entry := RaftLogEntry{
        Type: LogEntryIntentRegistered,
        Data: intent.Marshal(),
    }
    if err := s.raft.Apply(entry); err != nil {
        return err
    }

    // State already applied by Raft FSM
    return nil
}
```

3. **Conditional Round Execution:**

**Before:**
```go
func (s *service) Start() {
    go s.startRound()  // Always run
}
```

**After:**
```go
func (s *service) Start() {
    // Only leader executes rounds
    s.raft.OnLeadershipChange(func(isLeader bool) {
        if isLeader {
            go s.startRound()
        } else {
            s.stopRound()  // Stop if lost leadership
        }
    })
}
```

### 6.2 New Infrastructure Components

#### 1. Consensus Port Interface

**File:** `internal/core/ports/consensus.go` (NEW)

```go
package ports

type ConsensusService interface {
    // Leadership
    IsLeader() bool
    Leader() string // Returns leader address
    OnLeadershipChange(cb func(isLeader bool))

    // Log Replication
    Apply(entry RaftLogEntry) error

    // Membership
    AddNode(id, address string) error
    RemoveNode(id string) error

    // State
    GetState() ConsensusState
}

type ConsensusState struct {
    Term        uint64
    CommitIndex uint64
    LastApplied uint64
    Peers       []string
}
```

#### 2. Raft Implementation

**File:** `internal/infrastructure/consensus/raft/raft.go` (NEW)

```go
package raft

import (
    "github.com/hashicorp/raft"
    "github.com/arkade-os/arkd/internal/core/ports"
)

type raftConsensus struct {
    raft      *raft.Raft
    fsm       *ArkStateMachine
    transport *raft.NetworkTransport
}

func NewRaftConsensus(
    nodeID string,
    bindAddr string,
    peers []string,
    liveStore ports.LiveStore,
) (ports.ConsensusService, error) {
    // Configure Raft
    config := raft.DefaultConfig()
    config.LocalID = raft.ServerID(nodeID)

    // Create FSM
    fsm := &ArkStateMachine{liveStore: liveStore}

    // Create transport
    transport, err := raft.NewTCPTransport(bindAddr, nil, 3, 10*time.Second, os.Stderr)
    if err != nil {
        return nil, err
    }

    // Create Raft node
    r, err := raft.NewRaft(config, fsm, logStore, stableStore, snapStore, transport)
    if err != nil {
        return nil, err
    }

    // Bootstrap cluster
    configuration := raft.Configuration{
        Servers: []raft.Server{
            {ID: raft.ServerID(nodeID), Address: raft.ServerAddress(bindAddr)},
            // ... add peers
        },
    }
    r.BootstrapCluster(configuration)

    return &raftConsensus{raft: r, fsm: fsm, transport: transport}, nil
}

func (rc *raftConsensus) IsLeader() bool {
    return rc.raft.State() == raft.Leader
}

func (rc *raftConsensus) Apply(entry ports.RaftLogEntry) error {
    data, _ := json.Marshal(entry)
    future := rc.raft.Apply(data, 10*time.Second)
    return future.Error()
}
```

#### 3. Finite State Machine

**File:** `internal/infrastructure/consensus/raft/fsm.go` (NEW)

```go
package raft

type ArkStateMachine struct {
    liveStore ports.LiveStore
}

func (fsm *ArkStateMachine) Apply(log *raft.Log) interface{} {
    var entry ports.RaftLogEntry
    json.Unmarshal(log.Data, &entry)

    switch entry.Type {
    case ports.LogEntryIntentRegistered:
        intent := domain.Intent{}
        json.Unmarshal(entry.Data, &intent)
        fsm.liveStore.Intents().Push(intent, ...)

    case ports.LogEntryRoundStarted:
        round := domain.Round{}
        json.Unmarshal(entry.Data, &round)
        fsm.liveStore.CurrentRound().Upsert(func(_*domain.Round) *domain.Round {
            return &round
        })

    // ... handle other log types
    }

    return nil
}

func (fsm *ArkStateMachine) Snapshot() (raft.FSMSnapshot, error) {
    // Return snapshot of LiveStore
    return &arkSnapshot{state: fsm.liveStore}, nil
}

func (fsm *ArkStateMachine) Restore(snapshot io.ReadCloser) error {
    // Restore LiveStore from snapshot
    var state ports.LiveStore
    json.NewDecoder(snapshot).Decode(&state)
    fsm.liveStore = state
    return nil
}
```

### 6.3 Database and Cache Replication

#### PostgreSQL Replication (Phase 1)

**Configuration:** `docker-compose.ark.prod.yaml`

```yaml
services:
  postgres-primary:
    image: postgres:16
    environment:
      POSTGRES_DB: arkd
      POSTGRES_USER: arkd
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    command: |
      postgres
      -c wal_level=replica
      -c max_wal_senders=3
      -c max_replication_slots=3

  postgres-replica:
    image: postgres:16
    environment:
      PGUSER: replicator
      PGPASSWORD: ${REPLICATOR_PASSWORD}
    command: |
      pg_basebackup -h postgres-primary -D /var/lib/postgresql/data -U replicator -X stream -P
      postgres -c hot_standby=on
```

#### Redis Replication (Phase 1)

```yaml
  redis-primary:
    image: redis:7
    command: redis-server --appendonly yes

  redis-replica:
    image: redis:7
    command: redis-server --replicaof redis-primary 6379
```

#### Raft-Based Replication (Phase 2)

- PostgreSQL becomes **append-only event store** (via Raft log)
- Redis/in-memory cache rebuilt from Raft log on failover
- No need for PostgreSQL streaming replication (Raft handles it)

---

## 7. Performance Analysis

### 7.1 Latency Impact from Consensus

**Baseline (Single Node):**
- Intent registration: **~10ms** (validate + cache write)
- Round finalization: **~500ms** (commitment tx build + signing)

**Phase 1 (Active-Passive):**
- Intent registration: **~20ms** (+10ms for PostgreSQL replication)
- Round finalization: **~550ms** (+50ms for state sync)
- **Overhead: 50-100ms per round**

**Phase 2 (Raft Consensus):**
- Intent registration: **~30ms** (+20ms for Raft quorum write)
  - Raft Apply: 1 RTT to majority (2 nodes) ≈ 10-20ms
  - FSM state mutation: 5-10ms
- Round finalization: **~600ms** (+100ms for log replication)
- **Overhead: 100-200ms per round**

**Phase 3 (Active-Active Reads):**
- Read queries: **~5ms** (no Raft, local read from follower)
- Write queries: Same as Phase 2
- **Read throughput: 3x improvement**

### 7.2 Throughput Implications

**Baseline (Single Node):**
- Rounds per hour: 120 (30s interval)
- Max intents per round: 128 (configurable)
- **Max throughput: 15,360 intents/hour**

**Phase 2 (Raft Consensus):**
- Rounds per hour: 120 (same, Raft overhead < 1s per round)
- Max intents per round: 128
- **Max throughput: 15,360 intents/hour** (no change)

**Bottleneck:** Bitcoin block confirmation time (10 min average), not consensus latency.

### 7.3 Network Bandwidth

**Raft Replication Bandwidth:**

Per round:
- Intent registrations: 128 intents × 2KB avg = **256KB**
- Round events: ~10KB
- MuSig2 nonces/sigs: 128 participants × 64 bytes = **8KB**
- **Total per round: ~274KB**

Replicated to 2 followers (3-node cluster):
- **548KB per round**
- **120 rounds/hour = 65MB/hour**
- **1.5GB/day**

**Negligible** for modern networks (1Gbps+).

### 7.4 Trade-offs and Recommendations

#### Consistency vs. Availability (CAP Theorem)

Raft chooses **Consistency + Partition Tolerance** over Availability:
- ✅ **Strong consistency:** All nodes see same state
- ❌ **Reduced availability:** Cluster unavailable if majority down

**Recommendation:** Deploy **5-node cluster** for production:
- Tolerates 2 simultaneous failures (quorum = 3)
- 99.99% availability (assuming 0.1% node failure rate)

#### Latency vs. Fault Tolerance

More nodes = higher quorum write latency:
- 3 nodes: Raft quorum = 2 nodes (1 RTT)
- 5 nodes: Raft quorum = 3 nodes (2 RTTs in worst case)
- **Overhead: ~10-20ms per additional node**

**Recommendation:** **3 nodes for testnet**, **5 nodes for mainnet**.

---

## 8. Alternative Approaches Considered

### Approach 1: Shared Database with Optimistic Locking

**Architecture:**
```
┌──────┐  ┌──────┐  ┌──────┐
│Node1 │  │Node2 │  │Node3 │  (All active, no leader)
└───┬──┘  └───┬──┘  └───┬──┘
    └────────┼────────┘
        ┌────▼────┐
        │PostgreSQL│ (Single source of truth)
        │+ Redis   │
        └─────────┘
```

**Mechanism:**
- All nodes read/write to shared PostgreSQL
- Use `SELECT ... FOR UPDATE` row-level locks
- Optimistic locking with version field

**Pros:**
- ✅ Simpler than Raft (no consensus algorithm)
- ✅ All nodes can serve writes (no leader bottleneck)

**Cons:**
- ❌ **Database is single point of failure**
- ❌ **Lock contention** under high load (serialization bottleneck)
- ❌ **No split-brain protection** (if DB replicates, conflicts possible)
- ❌ **Operator wallet** still needs single owner (cannot distribute)

**Verdict:** ❌ **Rejected.** Database SPOF defeats the purpose of distributed architecture.

---

### Approach 2: Event Sourcing with Kafka

**Architecture:**
```
┌──────┐  ┌──────┐  ┌──────┐
│Node1 │  │Node2 │  │Node3 │  (Consume events from Kafka)
└───┬──┘  └───┬──┘  └───┬──┘
    └────────┼────────┘
        ┌────▼────┐
        │  Kafka  │ (Replicated log, Raft-based internally)
        │Cluster  │
        └─────────┘
```

**Mechanism:**
- Kafka topic = append-only event log
- Each node is a Kafka consumer
- Events replicated via Kafka's Raft-based replication
- Leader produces events to Kafka; followers consume

**Pros:**
- ✅ Event sourcing natural fit for arkd (already event-driven)
- ✅ Kafka handles replication (don't reimplement Raft)
- ✅ Replay events for recovery

**Cons:**
- ❌ **Additional infrastructure dependency** (Kafka cluster = 3+ nodes + Zookeeper)
- ❌ **Complexity:** Kafka operational overhead
- ❌ **Latency:** Kafka write latency (~10-50ms) + network RTT
- ❌ **Still need leader election** for round execution (Kafka doesn't solve this)

**Verdict:** ❌ **Rejected.** Overkill for arkd's requirements. Kafka adds complexity without solving leader election.

---

### Approach 3: Blockchain-Based Consensus (PoS/PoW)

**Architecture:**
```
┌──────┐  ┌──────┐  ┌──────┐
│Node1 │  │Node2 │  │Node3 │  (Validators, stake-based)
└───┬──┘  └───┬──┘  └───┬──┘
    └────────┼────────┘
      Tendermint/HotStuff
      (BFT Consensus)
```

**Mechanism:**
- Each node is a validator
- Blocks = batches of round events
- Consensus via Tendermint/HotStuff

**Pros:**
- ✅ Byzantine fault tolerance (malicious node resistance)
- ✅ Censorship resistance
- ✅ Matches blockchain mental model

**Cons:**
- ❌ **Massive overkill** for single-operator deployment
- ❌ **Performance:** Block times (1-6s), finality delays
- ❌ **Complexity:** Full blockchain stack
- ❌ **Premature:** BFT only needed if multi-operator federation

**Verdict:** ❌ **Rejected for Phase 1-3.** Consider for **Phase 4** (federated model).

---

## 9. Final Recommendations

### 9.1 Phased Approach (Recommended)

| Phase | Goal | Timeline | Complexity | Benefits |
|-------|------|----------|------------|----------|
| **Phase 1** | Basic redundancy (active-passive) | 2-3 months | Low | Fault tolerance, minimal code changes |
| **Phase 2** | Raft consensus + auto-failover | 3-4 months | Medium | Sub-500ms failover, strong consistency |
| **Phase 3** | Active-active reads | 2-3 months | Low | 3x read throughput, better utilization |
| **Phase 4** | BFT + FROST (optional) | 6-12 months | High | Federated operation, trustless |

**Total Phase 1-3: 7-10 months engineering effort**

### 9.2 Technology Stack

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| **Consensus** | Hashicorp Raft | Production-grade, used by Consul/etcd |
| **Key Management** | AWS CloudHSM + PKCS#11 | Secure, auditable, leader-only access |
| **Threshold Sigs** | FROST (Phase 4 only) | Bitcoin-compatible, maturing in 2025 |
| **Load Balancer** | Traefik with gRPC | Already used in arkd, supports leader routing |
| **Monitoring** | Prometheus + Grafana | Raft metrics (leader elections, log lag, quorum) |

### 9.3 Security Posture

**Phase 1-3 (Single Operator):**
- **Threat Model:** Crash faults, network failures, hardware issues
- **Consensus:** Raft (crash-fault-tolerant)
- **Keys:** HSM (single source of truth, leader-controlled)
- **Trust:** All nodes operated by same entity

**Phase 4 (Federated Operators):**
- **Threat Model:** Byzantine faults, malicious operators
- **Consensus:** HotStuff/Tendermint (BFT)
- **Keys:** FROST threshold signatures (no single key holder)
- **Trust:** Honest majority (2-of-3 or 3-of-5)

### 9.4 Operational Considerations

**Minimum Production Setup (Phase 2):**
- **5 arkd nodes** (tolerate 2 failures)
- **1 AWS CloudHSM cluster** (multi-AZ for redundancy)
- **1 Traefik load balancer** (or 2 for LB redundancy)
- **1 PostgreSQL instance** (Raft handles replication, DB can be single instance)
- **Monitoring:** Prometheus + Grafana + Alertmanager

**Cost Estimate:**
- EC2 instances (5× t3.large): **$300/month**
- CloudHSM: **$1,200/month**
- Load balancer: **$50/month**
- **Total: ~$1,550/month** (vs $300/month single-node)

**Justification:** 5x cost for 99.99% availability (vs 99% single-node).

---

## 10. Sources

### Internal Sources

1. `/Users/dusansekulic/code/go/ark/internal/core/domain/round.go` — Round domain entity and state machine
2. `/Users/dusansekulic/code/go/ark/internal/core/application/service.go:1805-2432` — Round lifecycle orchestration
3. `/Users/dusansekulic/code/go/ark/internal/core/ports/live_store.go:12-84` — LiveStore interfaces for ephemeral state
4. `/Users/dusansekulic/code/go/arkadian/docs/projects/arkd/system/application_core.md` — Application layer documentation
5. `/Users/dusansekulic/code/go/arkadian/docs/projects/arkd/system/architecture.md` — Hexagonal architecture pattern
6. `/Users/dusansekulic/code/ark-docs/docs/ark/deep-dive/commitment-txs.md` — Ark commitment transaction protocol
7. `/Users/dusansekulic/code/ark-docs/docs/ark/deep-dive/vtxos.md` — VTXO lifecycle and security model
8. `/Users/dusansekulic/code/ark-docs/docs/ark/deep-dive/batch-swaps.md` — Forfeit transaction mechanism

### External Sources

9. **Raft Consensus Algorithm**
   - Raft official documentation: https://raft.github.io/
   - Raft paper: "In Search of an Understandable Consensus Algorithm"
   - Production implementations: etcd (Kubernetes), Consul, CockroachDB

10. **BFT Comparison**
    - BFT vs CFT trade-offs: 33% vs 49% fault tolerance
    - Performance analysis: PBFT O(n²) message complexity
    - Recent research: Decentralized Sequencer (March 2025, arXiv:2503.05451)

11. **Threshold Signatures**
    - FROST specification: IETF draft-komlo-frost
    - MuSig2 vs FROST comparison: Bitcoin Stack Exchange
    - ROAST protocol: Blockstream blog (robust async Schnorr thresholds)

12. **L2 Sequencers**
    - Shared sequencing patterns (Espresso Systems)
    - Based rollups (Ethereum validator network)
    - Decentralized arrangers (arXiv paper, March 2025)

13. **Lightning Watchtowers**
    - TEE Guard architecture (mutual monitoring)
    - lnd watchtower implementation
    - Economic sustainability challenges

---

## 11. Next Steps

### Immediate Actions (Week 1-2)

1. **Stakeholder Alignment:**
   - Present this research report to arkd core team
   - Confirm Phase 1-3 roadmap approval
   - Allocate engineering resources (2-3 engineers, 7-10 months)

2. **Proof of Concept (Phase 1 Lite):**
   - Deploy 2-node active-passive setup on testnet
   - Implement heartbeat monitoring
   - Test manual failover procedure
   - Measure failover time (target: <30s)

3. **HSM Procurement:**
   - Evaluate AWS CloudHSM vs alternatives (Ledger Enterprise, Thales Luna)
   - Set up sandbox HSM environment
   - Implement PKCS#11 signer integration

### Design Phase (Month 1-2)

4. **Detailed Design Documents:**
   - Raft integration architecture
   - State machine design (FSM transitions)
   - Failure recovery playbooks (runbooks for each failure mode)
   - Monitoring and alerting strategy

5. **Prototype Raft FSM:**
   - Implement `ArkStateMachine` for intent registration only
   - Test with 3-node local cluster (Docker Compose)
   - Benchmark Raft Apply() latency

### Implementation Phase (Month 3-10)

6. **Phase 1:** Active-passive redundancy
7. **Phase 2:** Raft consensus + auto-failover
8. **Phase 3:** Active-active reads + load balancing

### Future Considerations (2026+)

9. **Phase 4 Feasibility Study:**
   - Monitor FROST BIP standardization progress
   - Evaluate HotStuff/Tendermint maturity
   - Assess federated operator demand

10. **Ark Protocol Evolution:**
    - Covenant-based forfeits (if Bitcoin soft fork enables)
    - Cross-chain Ark (Liquid, RGB)
    - Interoperability with Lightning Network

---

## Appendix A: Glossary

- **Raft:** Consensus algorithm for managing replicated logs across distributed systems
- **BFT:** Byzantine Fault Tolerance - consensus that tolerates malicious nodes
- **HSM:** Hardware Security Module - secure key storage and signing device
- **FROST:** Flexible Round-Optimized Schnorr Threshold signatures - threshold sig scheme
- **FSM:** Finite State Machine - deterministic state transition model
- **ROAST:** Robust Asynchronous Schnorr Threshold signatures - fault-tolerant FROST variant
- **Quorum:** Minimum number of nodes required for consensus (majority)
- **Split-Brain:** Network partition causing multiple leaders (prevented by Raft's term mechanism)

## Appendix B: Key Metrics to Monitor

**Raft Health:**
- Leader election frequency (should be rare, <1/day in stable cluster)
- Log lag (followers behind leader, should be <100 entries)
- Quorum latency (time to replicate to majority, target <50ms)
- Snapshot creation frequency (depends on log size)

**Round Performance:**
- Round completion rate (target: >95%)
- Average round duration (baseline: 30-60s)
- MuSig2 phase latencies (nonce collection, signature collection)
- Participant timeout rate (target: <5%)

**Infrastructure:**
- Node CPU/memory utilization
- Network bandwidth (intra-cluster communication)
- Database query latencies
- HSM signing latencies

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Next Review:** After Phase 1 completion
