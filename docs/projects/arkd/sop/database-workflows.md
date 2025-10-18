# SOP: Database Workflows

Standard operating procedures for working with PostgreSQL databases in arkd.

## Overview

This SOP covers:
- Creating and applying migrations
- Adding and updating queries
- Complete workflow patterns

## Prerequisites

- PostgreSQL container running (`make pg`)
- Understanding of SQL and sqlc

## Workflow 1: Creating a Migration

### Procedure

#### 1. Generate Migration Files

```bash
cd ${ARKD_REPO}
make pgmigrate FILE=<descriptive_name>
```

Examples:
- `make pgmigrate FILE=add_round_version`
- `make pgmigrate FILE=create_market_price_table`
- `make pgmigrate FILE=modify_vtxo_amount_to_bigint`

Creates:
- `YYYYMMDDHHMMSS_<name>.up.sql` - Forward migration
- `YYYYMMDDHHMMSS_<name>.down.sql` - Rollback migration

#### 2. Write UP Migration

**File**: `internal/infrastructure/db/postgres/migration/YYYYMMDDHHMMSS_<name>.up.sql`

```sql
-- Add column with default for existing rows
ALTER TABLE round ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Create index
CREATE INDEX idx_round_version ON round(version);

-- Add comment
COMMENT ON COLUMN round.version IS 'Round protocol version';
```

**Best Practices:**
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Provide defaults for NOT NULL columns
- Create indexes for frequently queried columns
- Add comments for documentation

#### 3. Write DOWN Migration

**File**: `YYYYMMDDHHMMSS_<name>.down.sql`

```sql
-- Reverse order of UP migration
DROP INDEX IF EXISTS idx_round_version;
ALTER TABLE round DROP COLUMN IF EXISTS version;
```

**Best Practices:**
- Never leave empty - always write rollback logic
- Mirror UP migration in reverse order
- Document data loss if unavoidable

#### 4. Test Migration

```bash
# Connect to postgres
make psql

# Test UP migration
\i internal/infrastructure/db/postgres/migration/YYYYMMDDHHMMSS_<name>.up.sql
\d <table>  # Verify changes

# Test DOWN migration
\i internal/infrastructure/db/postgres/migration/YYYYMMDDHHMMSS_<name>.down.sql
\d <table>  # Verify reverted

# Test UP again (idempotency)
\i internal/infrastructure/db/postgres/migration/YYYYMMDDHHMMSS_<name>.up.sql
\d <table>  # Verify works again
```

#### 5. Apply Migration

Migrations run automatically when arkd starts:

```bash
make run
```

## Workflow 2: Adding/Updating Queries

### Procedure

#### 1. Write SQL Query

**File**: `internal/infrastructure/db/postgres/sqlc/query.sql`

```sql
-- name: GetRoundsByVersion :many
SELECT * FROM round
WHERE version = @version
ORDER BY starting_timestamp DESC
LIMIT @limit;
```

**Query Annotation Format:**
```sql
-- name: <FunctionName> :<returnType>
```

**Return Types:**
- `:one` - Single row (error if not found or multiple)
- `:many` - Slice of rows (empty if none)
- `:exec` - No return (INSERT/UPDATE/DELETE)
- `:execrows` - Returns rows affected

#### 2. Generate Go Code

```bash
make pgsqlc
```

Generates type-safe Go code in:
`internal/infrastructure/db/postgres/sqlc/queries/query.sql.go`

#### 3. Use in Repository

**File**: `internal/infrastructure/db/postgres/<entity>_repo.go`

```go
func (r *postgresRoundRepo) GetRoundsByVersion(
    ctx context.Context,
    version int,
    limit int,
) ([]*domain.Round, error) {
    // 1. Call generated query
    rows, err := r.Queries.GetRoundsByVersion(ctx, queries.GetRoundsByVersionParams{
        Version: int32(version),
        Limit:   int32(limit),
    })
    if err != nil {
        return nil, err
    }

    // 2. Convert DB types → Domain types
    rounds := make([]*domain.Round, len(rows))
    for i, row := range rows {
        rounds[i] = toDomainRound(row)
    }
    return rounds, nil
}
```

#### 4. Handle Errors Properly

```go
func (r *repo) GetRound(ctx context.Context, id string) (*domain.Round, error) {
    row, err := r.Queries.GetRound(ctx, id)
    if err != nil {
        // Convert infrastructure error → domain error
        if errors.Is(err, sql.ErrNoRows) {
            return nil, domain.ErrRoundNotFound
        }
        return nil, err
    }
    return toDomainRound(row), nil
}
```

## Workflow 3: Add Column and Query

Complete example: Add `version` column to `round` table and query it.

### Steps

1. **Create migration**
   ```bash
   make pgmigrate FILE=add_round_version
   ```

2. **Write UP migration**
   ```sql
   ALTER TABLE round ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
   CREATE INDEX idx_round_version ON round(version);
   ```

3. **Write DOWN migration**
   ```sql
   DROP INDEX IF EXISTS idx_round_version;
   ALTER TABLE round DROP COLUMN IF EXISTS version;
   ```

4. **Test migration**
   ```bash
   make psql
   \i .../add_round_version.up.sql
   \d round
   ```

5. **Add query**
   ```sql
   -- name: GetRoundsByVersion :many
   SELECT * FROM round WHERE version = @version LIMIT @limit;
   ```

6. **Generate code**
   ```bash
   make pgsqlc
   ```

7. **Update repository**
   ```go
   func (r *repo) GetRoundsByVersion(...) ([]*domain.Round, error) {
       rows, err := r.Queries.GetRoundsByVersion(...)
       // Convert and return
   }
   ```

8. **Run and verify**
   ```bash
   make run
   ```

## Common Query Patterns

### SELECT Single Row (`:one`)
```sql
-- name: GetRound :one
SELECT * FROM round WHERE id = $1;
```

### SELECT Multiple Rows (`:many`)
```sql
-- name: ListRounds :many
SELECT * FROM round ORDER BY starting_timestamp DESC LIMIT $1;
```

### INSERT (`:exec`)
```sql
-- name: InsertRound :exec
INSERT INTO round (id, starting_timestamp, ending_timestamp)
VALUES ($1, $2, $3);
```

### UPDATE (`:exec`)
```sql
-- name: MarkRoundEnded :exec
UPDATE round SET ended = true, ending_timestamp = $2 WHERE id = $1;
```

### DELETE (`:exec`)
```sql
-- name: DeleteIntent :exec
DELETE FROM intent WHERE id = $1;
```

### COUNT (`:one`)
```sql
-- name: CountVtxos :one
SELECT COUNT(*) FROM vtxo WHERE pubkey = $1 AND spent = false;
```

## Common Migration Patterns

### Add Column
```sql
-- UP
ALTER TABLE round ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- DOWN
ALTER TABLE round DROP COLUMN IF EXISTS version;
```

### Modify Column Type
```sql
-- UP
ALTER TABLE vtxo ALTER COLUMN amount TYPE BIGINT;

-- DOWN (may lose data)
ALTER TABLE vtxo ALTER COLUMN amount TYPE INTEGER;
```

### Create Table
```sql
-- UP
CREATE TABLE IF NOT EXISTS market_price (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    price_sats BIGINT NOT NULL,
    source TEXT NOT NULL
);

-- DOWN
DROP TABLE IF EXISTS market_price CASCADE;
```

### Add Foreign Key
```sql
-- UP
ALTER TABLE intent ADD CONSTRAINT fk_intent_round
    FOREIGN KEY (round_id) REFERENCES round(id) ON DELETE CASCADE;

-- DOWN
ALTER TABLE intent DROP CONSTRAINT IF EXISTS fk_intent_round;
```

## Validation Checklist

### Migration Checklist
- [ ] UP migration works on empty database
- [ ] UP migration works with existing data
- [ ] DOWN migration successfully reverts UP
- [ ] UP → DOWN → UP cycle works
- [ ] Indexes created for queried columns
- [ ] Comments added for complex changes
- [ ] Tested manually in `psql`

### Query Checklist
- [ ] SQL syntax valid (`make pgsqlc` succeeds)
- [ ] Generated code compiles
- [ ] Repository method converts to domain types
- [ ] Errors converted to domain errors
- [ ] Unit test added

## Common Commands

```bash
# Migrations
make pgmigrate FILE=<name>    # Create migration
make psql                      # Connect to postgres

# Queries
make pgsqlc                    # Generate code from SQL

# Testing
make pg                        # Start postgres
make droppg                    # Stop postgres
make test                      # Run tests

# Running
make run                       # Run arkd (auto-migrates)
```

## Common Pitfalls

### ❌ Forgetting to Regenerate
After changing `query.sql`, always run `make pgsqlc`

### ❌ NOT NULL Without Default
```sql
-- Fails if table has existing rows
ALTER TABLE round ADD COLUMN version INTEGER NOT NULL;

-- Correct: provide default
ALTER TABLE round ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

### ❌ Returning Infrastructure Types
```go
// Bad
func (r *repo) GetRound(...) (*queries.Round, error)

// Good
func (r *repo) GetRound(...) (*domain.Round, error) {
    row, err := r.Queries.GetRound(...)
    return toDomainRound(row), nil
}
```

### ❌ Not Converting Errors
```go
// Bad - leaks sql.ErrNoRows
return r.Queries.GetRound(...)

// Good - converts to domain error
row, err := r.Queries.GetRound(...)
if errors.Is(err, sql.ErrNoRows) {
    return nil, domain.ErrRoundNotFound
}
```

## See Also

- `adding-grpc-endpoint.md` - Adding endpoints that use database
- `development-workflow.md` - General development workflow
- `system/database-architecture.md` - Database design patterns
