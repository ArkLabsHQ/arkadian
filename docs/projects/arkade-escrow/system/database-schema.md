# Database Schema: TypeORM Entities and Relationships

## Overview

arkade-escrow uses TypeORM for database abstraction, supporting both SQLite (for development/POC) and PostgreSQL (production-ready). The schema is designed around five core entities that model the escrow workflow from request creation through contract execution and arbitration.

TypeORM's `synchronize: true` mode automatically creates and updates tables based on entity definitions during development. For production, migrations should be used instead.

## Entity Overview

| Entity | Purpose | Key Relationships |
|--------|---------|-------------------|
| `User` | User accounts and authentication state | Referenced by all other entities via public key |
| `EscrowRequest` | Public/private requests seeking counterparties | None (independent) |
| `EscrowContract` | Active contracts with funding state | ManyToOne → EscrowRequest |
| `ContractExecution` | Execution attempts with signature collection | ManyToOne → EscrowContract |
| `ContractArbitration` | Dispute resolution records | ManyToOne → EscrowContract |

## User Entity

**Table:** `users`

**Purpose:** Stores user accounts identified by public keys, with authentication challenge state.

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  publicKey!: string;

  @Column({ type: "text", nullable: true })
  pendingChallenge?: string | null;

  @Column({ type: "text", nullable: true })
  challengeId?: string | null;

  @Column({ type: "datetime", nullable: true })
  challengeExpiresAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### Columns

- **id** (UUID): Primary key, auto-generated
- **publicKey** (text, unique, indexed): User's x-only Schnorr public key (64-char hex)
- **pendingChallenge** (text, nullable): JSON-encoded challenge awaiting signature verification
- **challengeId** (text, nullable): UUID identifying the current challenge
- **challengeExpiresAt** (datetime, nullable): Challenge expiration timestamp (5 minutes from issuance)
- **lastLoginAt** (datetime, nullable): Last successful authentication timestamp
- **createdAt** (datetime): Account creation timestamp (auto-managed)
- **updatedAt** (datetime): Last modification timestamp (auto-managed)

### Indexes

- Unique index on `publicKey` for fast lookups and duplicate prevention

### Design Notes

- **No passwords**: Authentication relies solely on cryptographic signatures
- **Challenge lifecycle**: `pendingChallenge` is set during challenge request, cleared after verification or expiration
- **Public key as identity**: The public key serves as both authentication credential and contract participant identifier

## EscrowRequest Entity

**Table:** `escrow_requests`

**Purpose:** Represents requests for escrow contracts, discoverable via orderbook if public.

```typescript
@Entity("escrow_requests")
@Unique("uq_escrow_requests_external_id", ["externalId"])
export class EscrowRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "text" })
  externalId!: string;

  @Index()
  @Column({ type: "text" })
  creatorPubkey!: string;

  @Column({ type: "text" })
  side!: RequestSide;

  @Column({ type: "integer" })
  amount!: number;

  @Column({ type: "text" })
  description!: string;

  @Index()
  @Column({ type: "boolean", default: true })
  public!: boolean;

  @Column({ type: "text", default: "open" })
  status!: RequestStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export type RequestSide = "receiver" | "sender";
export type RequestStatus = "open" | "cancelled";
```

### Columns

- **id** (integer): Auto-incrementing primary key
- **externalId** (text, unique, indexed): Public identifier (e.g., `q3f7p9n4z81k6c0b`) for URLs and API responses
- **creatorPubkey** (text, indexed): Public key of user who created the request
- **side** (text): Whether creator is "receiver" (seller) or "sender" (buyer)
- **amount** (integer): Amount in satoshis
- **description** (text): Human-readable description of escrow terms
- **public** (boolean, indexed): Whether request appears in public orderbook (default: true)
- **status** (text): Request lifecycle state ("open" or "cancelled")
- **createdAt** (datetime): Creation timestamp
- **updatedAt** (datetime): Last modification timestamp

### Indexes

- Unique index on `externalId` for fast lookups and duplicate prevention
- Index on `creatorPubkey` for "my requests" queries
- Index on `public` for orderbook filtering

### Design Notes

- **External ID**: Uses short alphanumeric IDs (via `nanoid`) for user-friendly URLs
- **Side semantics**: "receiver" means creator wants to receive funds (seller), "sender" means creator wants to send funds (buyer)
- **Status transitions**: `open` → `cancelled` (no reverse transition)
- **No cascade delete**: Requests are independent of contracts (one request can spawn multiple contracts)

## EscrowContract Entity

**Table:** `escrow_contracts`

**Purpose:** Represents active escrow contracts with funding state and participant information.

```typescript
@Entity("escrow_contracts")
export class EscrowContract {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "text" })
  externalId!: string;

  @Index()
  @ManyToOne(() => EscrowRequest, { eager: true })
  @JoinColumn({ name: "requestExternalId", referencedColumnName: "externalId" })
  request!: EscrowRequest;

  @Index()
  @Column({ type: "text" })
  senderPubkey!: string;

  @Index()
  @Column({ type: "text" })
  receiverPubkey!: string;

  @Column({ type: "integer" })
  amount!: number;

  @Index()
  @Column({ type: "text", nullable: true })
  arkAddress?: string;

  @Column({ type: "text", enum: CONTRACT_STATUS })
  status!: ContractStatus;

  @Column({ type: "text", nullable: true })
  cancelationReason?: string;

  @Column({ type: "simple-json", nullable: true })
  virtualCoins?: VirtualCoin[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  acceptedAt?: Date;

  @Column({ type: "datetime", nullable: true })
  canceledAt?: Date;
}

export type ContractStatus =
  | "draft"                      // Missing addresses
  | "created"                    // All addresses set, awaiting funding
  | "funded"                     // VTXO(s) detected
  | "pending-execution"          // Execution initiated
  | "completed"                  // Execution settled
  | "canceled-by-creator"
  | "rejected-by-counterparty"
  | "canceled-by-arbiter"
  | "under-arbitration";
```

### Columns

- **id** (integer): Auto-incrementing primary key
- **externalId** (text, unique, indexed): Public contract identifier
- **request** (relation): Reference to originating EscrowRequest (eager-loaded)
- **senderPubkey** (text, indexed): Buyer's public key
- **receiverPubkey** (text, indexed): Seller's public key
- **amount** (integer): Contract amount in satoshis
- **arkAddress** (text, indexed, nullable): Arkade address derived from VEC script
- **status** (text): Contract lifecycle state (see below)
- **cancelationReason** (text, nullable): Reason for cancellation
- **virtualCoins** (simple-json, nullable): Array of VTXOs funding the contract
- **createdAt** (datetime): Creation timestamp
- **updatedAt** (datetime): Last modification timestamp
- **acceptedAt** (datetime, nullable): When contract was accepted by counterparty
- **canceledAt** (datetime, nullable): When contract was canceled

### Relationships

**ManyToOne → EscrowRequest:**
```typescript
@ManyToOne(() => EscrowRequest, { eager: true })
@JoinColumn({ name: "requestExternalId", referencedColumnName: "externalId" })
request!: EscrowRequest;
```

Multiple contracts can be created from one request (eager loading includes request data automatically).

### Contract Status States

**Lifecycle progression:**

1. **draft**: Contract created but missing participant addresses
2. **created**: All addresses set, waiting for funding
3. **funded**: At least one VTXO detected at arkAddress
4. **pending-execution**: Execution transaction created, collecting signatures
5. **completed**: Execution settled on-chain

**Cancellation states:**
- **canceled-by-creator**: Creator canceled before counterparty accepted
- **rejected-by-counterparty**: Counterparty declined the contract
- **canceled-by-arbiter**: Arbitrator voided the contract

**Dispute state:**
- **under-arbitration**: Dispute raised, awaiting arbitrator verdict

### VirtualCoin Storage

VTXOs are stored as JSON arrays:

```typescript
@Column({ type: "simple-json", nullable: true })
virtualCoins?: VirtualCoin[];
```

Example:
```json
[
  {
    "txid": "abc123...",
    "vout": 0,
    "value": 10000,
    "spentBy": "",
    "expireAt": 1734567890
  }
]
```

### Indexes

- Unique index on `externalId`
- Index on `senderPubkey` for user's contracts queries
- Index on `receiverPubkey` for user's contracts queries
- Index on `arkAddress` for funding detection

### Design Notes

- **Arbitrator public key**: Not stored directly (retrieved from app config during VEC creation)
- **No direct User reference**: Uses public keys (strings) to avoid foreign key constraints and simplify cross-database portability
- **Virtual coins**: Tracked in contract entity for quick funding status checks (avoids repeated Ark indexer queries)

## ContractExecution Entity

**Table:** `contract_executions`

**Purpose:** Tracks execution attempts with transaction data and signature collection progress.

```typescript
@Entity("contract_executions")
export class ContractExecution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "text" })
  externalId!: string;

  @Index()
  @ManyToOne(() => EscrowContract, { eager: true })
  @JoinColumn({
    name: "contractExternalId",
    referencedColumnName: "externalId",
  })
  contract!: EscrowContract;

  @Index()
  @Column({ type: "text" })
  initiatedByPubKey!: string;

  @Column({ type: "text", enum: ACTION_TYPE })
  action!: ActionType;

  @Column({ type: "text" })
  status!: ExecutionStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason?: string;

  @Column({ type: "text", nullable: true })
  cancelationReason?: string;

  @Column({ type: "simple-json" })
  transaction!: ExecutionTransaction;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export type ActionType = "direct-settle" | "release-funds" | "return-funds";

export type ExecutionStatus =
  | "pending-initiator-signature"
  | "pending-counterparty-signature"
  | "pending-server-confirmation"
  | "executed"
  | "canceled-by-initiator"
  | "rejected-by-counterparty"
  | "canceled-by-arbitrator";

export type ExecutionTransaction = {
  vtxo: { txid: string; vout: number; value: number };
  arkTx: string;                          // PSBT base64
  checkpoints: string[];                   // PSBT base64 array
  requiredSigners: Signers[];              // ["sender", "receiver", "server"]
  approvedByPubKeys: PublicKey[];          // ["abc123...", "def456..."]
  rejectedByPubKeys: PublicKey[];          // ["ghi789..."]
};
```

### Columns

- **id** (integer): Auto-incrementing primary key
- **externalId** (text, unique, indexed): Public execution identifier
- **contract** (relation): Reference to EscrowContract (eager-loaded)
- **initiatedByPubKey** (text, indexed): Public key of user who started execution
- **action** (text): Spending path ("direct-settle", "release-funds", "return-funds")
- **status** (text): Execution lifecycle state (see below)
- **rejectionReason** (text, nullable): Why execution was rejected
- **cancelationReason** (text, nullable): Why execution was canceled
- **transaction** (simple-json): Transaction data with signature tracking (see below)
- **createdAt** (datetime): Initiation timestamp
- **updatedAt** (datetime): Last modification timestamp

### Relationships

**ManyToOne → EscrowContract:**
```typescript
@ManyToOne(() => EscrowContract, { eager: true })
@JoinColumn({
  name: "contractExternalId",
  referencedColumnName: "externalId",
})
contract!: EscrowContract;
```

One contract can have multiple execution attempts (e.g., if first execution is rejected).

### Execution Status States

**Progression:**

1. **pending-initiator-signature**: Waiting for initiator to sign
2. **pending-counterparty-signature**: Waiting for other party to sign
3. **pending-server-confirmation**: Waiting for server to process
4. **executed**: Successfully settled on Ark

**Termination:**
- **canceled-by-initiator**: Initiator canceled before completion
- **rejected-by-counterparty**: Required signer rejected
- **canceled-by-arbitrator**: Arbitrator intervened

### Transaction Data Structure

Stored as JSON in `transaction` column:

```typescript
{
  vtxo: {
    txid: "abc123...",
    vout: 0,
    value: 10000
  },
  arkTx: "cHNidP8BAF...",              // Partially-signed Ark transaction
  checkpoints: [                       // Checkpoint transactions
    "cHNidP8BAH...",
    "cHNidP8BAI..."
  ],
  requiredSigners: ["sender", "receiver", "server"],
  approvedByPubKeys: ["abc123...", "def456..."],
  rejectedByPubKeys: []
}
```

**Signature collection:**
- As each party approves, their public key is added to `approvedByPubKeys`
- If a party rejects, their public key is added to `rejectedByPubKeys`
- When all `requiredSigners` have approved, execution proceeds

### Indexes

- Unique index on `externalId`
- Index on `initiatedByPubKey` for user's execution queries
- Composite index on `contractExternalId` (implicit via foreign key)

### Design Notes

- **Multiple attempts**: If execution fails, a new ContractExecution can be created
- **Action types**: Map to VEC spending paths (collaborative paths only in current implementation)
- **PSBT storage**: Transactions stored as base64-encoded PSBTs, updated as signatures are added

## ContractArbitration Entity

**Table:** `contract_arbitrations`

**Purpose:** Records disputes and arbitration outcomes.

```typescript
@Entity("contract_arbitrations")
export class ContractArbitration {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "text" })
  externalId!: string;

  @Index()
  @ManyToOne(() => EscrowContract, { eager: true })
  @JoinColumn({
    name: "contractExternalId",
    referencedColumnName: "externalId",
  })
  contract!: EscrowContract;

  @Index()
  @Column({ type: "text" })
  claimantPubkey!: string;

  @Index()
  @Column({ type: "text" })
  defendantPubkey!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "text" })
  status!: ArbitrationStatus;

  @Column({ type: "text", nullable: true })
  verdict?: Verdict;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export type ArbitrationStatus = "pending" | "resolved" | "executed";
export type Verdict = "refund" | "release";
```

### Columns

- **id** (integer): Auto-incrementing primary key
- **externalId** (text, unique, indexed): Public arbitration identifier
- **contract** (relation): Reference to disputed EscrowContract (eager-loaded)
- **claimantPubkey** (text, indexed): Public key of party initiating dispute
- **defendantPubkey** (text, indexed): Public key of other party
- **reason** (text): Claimant's dispute reasoning
- **status** (text): Arbitration lifecycle state ("pending", "resolved", "executed")
- **verdict** (text, nullable): Arbitrator's decision ("refund" or "release")
- **createdAt** (datetime): Dispute creation timestamp
- **updatedAt** (datetime): Last modification timestamp

### Relationships

**ManyToOne → EscrowContract:**
```typescript
@ManyToOne(() => EscrowContract, { eager: true })
@JoinColumn({
  name: "contractExternalId",
  referencedColumnName: "externalId",
})
contract!: EscrowContract;
```

One contract can have multiple arbitration attempts (if first arbitration is appealed or voided).

### Arbitration Status States

1. **pending**: Dispute raised, awaiting arbitrator review
2. **resolved**: Arbitrator made verdict (refund or release)
3. **executed**: Verdict executed via ContractExecution

### Verdict Types

- **refund**: Arbitrator sides with sender (buyer gets money back)
- **release**: Arbitrator sides with receiver (seller gets paid)

### Design Notes

- **No evidence storage**: Current implementation doesn't store dispute evidence (future enhancement)
- **No appeal mechanism**: Verdicts are final (future enhancement could add appeal workflow)
- **Arbitrator identity**: Arbitrator public key is not stored (uses system-wide configured arbitrator)

## Relationships Diagram

```
User (publicKey)
  ↓ (referenced by string, no FK)
  ├── EscrowRequest (creatorPubkey)
  │     ↓ ManyToOne
  │   EscrowContract (request)
  │     ├── ContractExecution (contract) ← ManyToOne
  │     └── ContractArbitration (contract) ← ManyToOne
  │
  ├── EscrowContract (senderPubkey, receiverPubkey)
  ├── ContractExecution (initiatedByPubKey)
  └── ContractArbitration (claimantPubkey, defendantPubkey)
```

## SQLite vs PostgreSQL Considerations

### Column Type Mapping

TypeORM handles database-specific type conversions:

| TypeORM Type | SQLite | PostgreSQL |
|--------------|--------|------------|
| `text` | TEXT | TEXT |
| `integer` | INTEGER | INTEGER |
| `boolean` | INTEGER (0/1) | BOOLEAN |
| `datetime` | TEXT (ISO8601) | TIMESTAMP |
| `simple-json` | TEXT (JSON string) | JSONB |
| `uuid` | TEXT | UUID |

### SQLite Limitations

- **No native UUID type**: UUIDs stored as TEXT
- **No native datetime type**: Dates stored as ISO8601 strings
- **No enum type**: Enums stored as TEXT with application-level validation
- **Limited concurrency**: Single writer at a time (sufficient for POC)

### PostgreSQL Advantages (Production)

- **Native JSON type**: JSONB provides indexing and querying within JSON columns
- **Better concurrency**: Multi-writer support with MVCC
- **Advanced indexing**: GiST, GIN indexes for complex queries
- **Full-text search**: Built-in text search capabilities
- **Horizontal scaling**: Replication and sharding support

### Migration Strategy

Switching from SQLite to PostgreSQL requires:

1. Update TypeORM configuration:
   ```typescript
   type: "postgres",
   host: process.env.POSTGRES_HOST,
   port: parseInt(process.env.POSTGRES_PORT || "5432"),
   username: process.env.POSTGRES_USER,
   password: process.env.POSTGRES_PASSWORD,
   database: process.env.POSTGRES_DB,
   ```

2. Generate migrations:
   ```bash
   npm run typeorm migration:generate -- -n InitialSchema
   ```

3. Run migrations:
   ```bash
   npm run typeorm migration:run
   ```

## Indexes Strategy

### Current Indexes

- **Unique indexes**: All `externalId` columns, `User.publicKey`
- **Foreign key indexes**: Implicit on all `@ManyToOne` relationships
- **Query optimization indexes**: `creatorPubkey`, `senderPubkey`, `receiverPubkey`, `arkAddress`, `public`

### Index Usage Patterns

**User lookups (authentication):**
```sql
SELECT * FROM users WHERE publicKey = ?
```
Uses unique index on `publicKey`.

**Orderbook queries (pagination with cursor):**
```sql
SELECT * FROM escrow_requests
WHERE public = true AND status = 'open'
  AND (createdAt < ? OR (createdAt = ? AND id < ?))
ORDER BY createdAt DESC, id DESC
LIMIT 20
```
Uses index on `public` and natural index on `(createdAt, id)`.

**User's contracts:**
```sql
SELECT * FROM escrow_contracts
WHERE senderPubkey = ? OR receiverPubkey = ?
```
Uses indexes on `senderPubkey` and `receiverPubkey`.

**Contract funding detection:**
```sql
SELECT * FROM escrow_contracts
WHERE arkAddress = ? AND status = 'created'
```
Uses index on `arkAddress`.

## Future Schema Enhancements

1. **Add evidence table** for arbitration (file uploads, messages)
2. **Add notification preferences** to User entity
3. **Add contract templates** for common escrow types
4. **Add transaction fee tracking** in ContractExecution
5. **Add audit log table** for all state transitions
6. **Add multi-VTXO support** (separate VirtualCoin table)
7. **Add contract milestone tracking** (partial releases)
8. **Add reputation/rating system** for users
9. **Add escrow request expiration** timestamps
10. **Add webhook subscriptions** for contract events

## Performance Considerations

### Query Optimization

- **Eager loading**: Relationships marked `eager: true` reduce N+1 queries
- **Cursor pagination**: More efficient than offset pagination for large datasets
- **Selective indexing**: Indexes on frequently queried columns

### Scaling Strategies

1. **Read replicas**: Separate read/write database instances
2. **Connection pooling**: Reuse database connections
3. **Caching**: Redis for frequently accessed data (contract statuses, user lookups)
4. **Partitioning**: Partition large tables by date (contracts, executions)
5. **Archiving**: Move completed/old contracts to archive tables

## Data Integrity

### Constraints

- **Unique constraints**: Prevent duplicate external IDs and public keys
- **Not null constraints**: Ensure critical fields are always populated
- **Enum constraints**: Enforce valid status values (application-level in SQLite)

### Transactions

TypeORM provides transaction support:

```typescript
await this.entityManager.transaction(async (transactionalEntityManager) => {
  await transactionalEntityManager.save(contract);
  await transactionalEntityManager.save(execution);
});
```

Critical for atomic updates across multiple entities.

### Soft Deletes

Not currently implemented, but recommended pattern:

```typescript
@DeleteDateColumn()
deletedAt?: Date;
```

Allows "undo" functionality and audit trails without data loss.
