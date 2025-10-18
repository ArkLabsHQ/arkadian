# SOP: Making Changes Checklist

Quick reference checklists for common code changes in arkd.

## Quick Navigation

- [Add gRPC Endpoint](#add-grpc-endpoint)
- [Add Database Column](#add-database-column)
- [Add Database Table](#add-database-table)
- [Modify Database Schema](#modify-database-schema)
- [Add Repository Method](#add-repository-method)
- [Add Application Service Method](#add-application-service-method)
- [Add Domain Entity](#add-domain-entity)
- [Bug Fix](#bug-fix)

---

## Add gRPC Endpoint

### Checklist

- [ ] **Proto**: Update `api-spec/protobuf/ark/v1/<service>.proto`
  ```protobuf
  rpc NewMethod(Request) returns (Response);
  message Request { ... }
  message Response { ... }
  ```

- [ ] **Generate**: Run `make proto`

- [ ] **Domain**: Add business logic (if needed)
  ```go
  // internal/core/domain/
  func (e *Entity) CanDoAction() bool { ... }
  ```

- [ ] **Application**: Add service method
  ```go
  // internal/core/application/
  func (s *service) NewMethod(ctx, params) error { ... }
  ```

- [ ] **Handler**: Implement gRPC handler
  ```go
  // internal/interface/grpc/handlers/
  func (h *handler) NewMethod(ctx, req) (*Response, error) { ... }
  ```

- [ ] **Errors**: Map domain errors to gRPC codes
  ```go
  case errors.Is(err, domain.ErrSomething):
      return status.Error(codes.InvalidArgument, "message")
  ```

- [ ] **Permissions**: Configure (if needed)
  ```go
  // internal/interface/grpc/permissions/
  ```

- [ ] **Tests**: Add unit and integration tests

- [ ] **Build**: Verify `make build` succeeds

- [ ] **Test**: Verify `make test` passes

**See**: `adding-grpc-endpoint.md` for details

---

## Add Database Column

### Checklist

- [ ] **Migration**: Create migration
  ```bash
  make pgmigrate FILE=add_table_column
  ```

- [ ] **UP Migration**: Add column
  ```sql
  ALTER TABLE table ADD COLUMN col TYPE NOT NULL DEFAULT value;
  CREATE INDEX idx_table_col ON table(col);
  ```

- [ ] **DOWN Migration**: Remove column
  ```sql
  DROP INDEX IF EXISTS idx_table_col;
  ALTER TABLE table DROP COLUMN IF EXISTS col;
  ```

- [ ] **Test Migration**: Verify UP → DOWN → UP works
  ```bash
  make psql
  \i .../migration.up.sql
  \i .../migration.down.sql
  \i .../migration.up.sql
  ```

- [ ] **Query**: Add query (if needed)
  ```sql
  -- name: GetByColumn :many
  SELECT * FROM table WHERE col = @col;
  ```

- [ ] **Generate**: Run `make pgsqlc`

- [ ] **Domain**: Update domain entity
  ```go
  type Entity struct {
      // ... existing
      NewColumn string
  }
  ```

- [ ] **Repository**: Update type conversion
  ```go
  func toDomainEntity(row queries.Entity) *domain.Entity {
      return &domain.Entity{
          NewColumn: row.NewColumn,
      }
  }
  ```

- [ ] **Run**: Start arkd (migrations auto-apply)
  ```bash
  make run
  ```

- [ ] **Verify**: Check migration applied
  ```bash
  make psql
  \d table
  ```

**See**: `database-workflows.md` for details

---

## Add Database Table

### Checklist

- [ ] **Migration**: Create migration
  ```bash
  make pgmigrate FILE=create_table_name
  ```

- [ ] **UP Migration**: Create table
  ```sql
  CREATE TABLE IF NOT EXISTS table_name (
      id SERIAL PRIMARY KEY,
      field1 TYPE NOT NULL,
      field2 TYPE
  );
  CREATE INDEX idx_table_field1 ON table_name(field1);
  ```

- [ ] **DOWN Migration**: Drop table
  ```sql
  DROP TABLE IF EXISTS table_name CASCADE;
  ```

- [ ] **Test Migration**: Verify UP → DOWN → UP works

- [ ] **Queries**: Add CRUD queries
  ```sql
  -- name: InsertEntity :exec
  -- name: GetEntity :one
  -- name: ListEntities :many
  -- name: UpdateEntity :exec
  -- name: DeleteEntity :exec
  ```

- [ ] **Generate**: Run `make pgsqlc`

- [ ] **Domain Entity**: Create domain type
  ```go
  // internal/core/domain/entity.go
  type Entity struct { ... }
  ```

- [ ] **Repository Interface**: Define interface
  ```go
  // internal/core/domain/entity_repo.go
  type EntityRepository interface { ... }
  ```

- [ ] **Repository Implementation**: Implement postgres repo
  ```go
  // internal/infrastructure/db/postgres/entity_repo.go
  type postgresEntityRepo struct { ... }
  ```

- [ ] **RepoManager**: Register repository
  ```go
  // Update ports.RepoManager interface
  // Update postgres repo_manager.go
  ```

- [ ] **Tests**: Add repository tests

- [ ] **Run**: Start arkd
  ```bash
  make run
  ```

**See**: `database-workflows.md` for complete workflow

---

## Modify Database Schema

### For Changing Column Type

- [ ] **Migration**: Create migration
  ```bash
  make pgmigrate FILE=modify_table_column
  ```

- [ ] **UP Migration**: Alter column
  ```sql
  ALTER TABLE table ALTER COLUMN col TYPE NEWTYPE;
  ```

- [ ] **DOWN Migration**: Revert (document data loss)
  ```sql
  -- WARNING: May lose data
  ALTER TABLE table ALTER COLUMN col TYPE OLDTYPE;
  ```

- [ ] **Test Migration**: Verify with existing data

- [ ] **Generate**: Run `make pgsqlc` (if needed)

- [ ] **Domain**: Update domain type (if needed)
  ```go
  type Entity struct {
      Col int64  // Changed from int32
  }
  ```

- [ ] **Repository**: Update conversion (if needed)

- [ ] **Run**: Start arkd

### For Renaming Column

- [ ] **Migration**: Create migration
  ```bash
  make pgmigrate FILE=rename_table_column
  ```

- [ ] **UP Migration**: Rename
  ```sql
  ALTER TABLE table RENAME COLUMN old_name TO new_name;
  ```

- [ ] **DOWN Migration**: Rename back
  ```sql
  ALTER TABLE table RENAME COLUMN new_name TO old_name;
  ```

- [ ] **Queries**: Update all queries using column

- [ ] **Generate**: Run `make pgsqlc`

- [ ] **Repository**: Update all references

- [ ] **Run**: Start arkd

**See**: `database-workflows.md` for details

---

## Add Repository Method

### Checklist

- [ ] **Query**: Add SQL query
  ```sql
  -- name: GetEntityByField :one
  SELECT * FROM entity WHERE field = @field;
  ```

- [ ] **Generate**: Run `make pgsqlc`

- [ ] **Interface**: Add to repository interface
  ```go
  // internal/core/domain/entity_repo.go
  type EntityRepository interface {
      GetEntityByField(ctx context.Context, field string) (*Entity, error)
  }
  ```

- [ ] **Implementation**: Implement in postgres repo
  ```go
  // internal/infrastructure/db/postgres/entity_repo.go
  func (r *repo) GetEntityByField(ctx, field) (*domain.Entity, error) {
      row, err := r.Queries.GetEntityByField(ctx, field)
      if err != nil {
          if errors.Is(err, sql.ErrNoRows) {
              return nil, domain.ErrNotFound
          }
          return nil, err
      }
      return toDomainEntity(row), nil
  }
  ```

- [ ] **Tests**: Add repository test
  ```go
  func TestRepo_GetEntityByField(t *testing.T) { ... }
  ```

- [ ] **Verify**: Run `make test`

**See**: `database-workflows.md` for query patterns

---

## Add Application Service Method

### Checklist

- [ ] **Interface**: Add method to service interface
  ```go
  // internal/core/application/service.go
  type Service interface {
      NewMethod(ctx context.Context, params) error
  }
  ```

- [ ] **Implementation**: Implement method
  ```go
  func (s *service) NewMethod(ctx, params) error {
      // 1. Load entities
      // 2. Validate (domain logic)
      // 3. Execute business logic
      // 4. Persist changes
      // 5. Publish events
      return nil
  }
  ```

- [ ] **Tests**: Add unit test with mocks
  ```go
  func TestService_NewMethod(t *testing.T) { ... }
  ```

- [ ] **Usage**: Use in handler or other service

- [ ] **Verify**: Run `make test`

---

## Add Domain Entity

### Checklist

- [ ] **Entity**: Define domain entity
  ```go
  // internal/core/domain/entity.go
  type Entity struct {
      ID        string
      Field1    string
      Field2    int64
      CreatedAt time.Time
  }
  ```

- [ ] **Business Logic**: Add validation/methods
  ```go
  func (e *Entity) IsValid() bool { ... }
  func (e *Entity) CanPerformAction() bool { ... }
  ```

- [ ] **Events**: Add domain events (if needed)
  ```go
  type EntityCreatedEvent struct {
      EntityID  string
      Timestamp int64
  }
  ```

- [ ] **Errors**: Add domain errors
  ```go
  var (
      ErrEntityNotFound    = errors.New("entity not found")
      ErrInvalidEntity     = errors.New("invalid entity")
  )
  ```

- [ ] **Repository Interface**: Define repository
  ```go
  // internal/core/domain/entity_repo.go
  type EntityRepository interface {
      AddEntity(ctx context.Context, entity *Entity) error
      GetEntity(ctx context.Context, id string) (*Entity, error)
      // ... other methods
  }
  ```

- [ ] **Database Schema**: Add migration (if persisted)

- [ ] **Repository Implementation**: Implement postgres repo

- [ ] **Tests**: Add domain entity tests
  ```go
  func TestEntity_IsValid(t *testing.T) { ... }
  ```

---

## Bug Fix

### Checklist

- [ ] **Reproduce**: Write failing test first
  ```go
  func TestBugScenario(t *testing.T) {
      // Test that currently fails
  }
  ```

- [ ] **Identify**: Find root cause
  - Check logs
  - Add debug statements
  - Review related code

- [ ] **Fix**: Make minimal change to fix bug
  ```go
  // Fix implementation
  ```

- [ ] **Verify**: Test passes
  ```bash
  go test -v ./path/to/test
  ```

- [ ] **Regression**: Run all tests
  ```bash
  make test
  ```

- [ ] **Integration**: Run integration tests
  ```bash
  make integrationtest
  ```

- [ ] **Document**: Add comment explaining fix (if non-obvious)

- [ ] **Commit**: Commit with descriptive message
  ```bash
  git commit -m "Fix: description of bug and solution"
  ```

---

## General Pre-Commit Checklist

Before committing any changes:

- [ ] **Format**: Code is formatted (`make lint`)
- [ ] **Build**: Code compiles (`make build`)
- [ ] **Tests**: All tests pass (`make test`)
- [ ] **Architecture**: Follows hexagonal architecture
- [ ] **No Leakage**: Infrastructure doesn't leak into domain
- [ ] **Type Conversion**: Done at repository boundaries
- [ ] **Error Handling**: Proper error conversion
- [ ] **Documentation**: Comments/docs updated if needed

---

## Commands Quick Reference

```bash
# Proto
make proto                      # Generate from proto files

# Database
make pgmigrate FILE=<name>      # Create migration
make pgsqlc                     # Generate from queries
make psql                       # Connect to postgres

# Testing
make test                       # Run unit tests
make integrationtest            # Run E2E tests
make lint                       # Lint and format

# Building
make build                      # Build arkd
make run                        # Run arkd

# Docker
make docker-run                 # Start services
make docker-stop                # Stop services
```

---

## See Also

- `adding-grpc-endpoint.md` - Detailed gRPC endpoint guide
- `adding-database-backend.md` - Database backend implementation
- `database-workflows.md` - Database operations
- `development-workflow.md` - General development workflow
- `system/architecture/hexagonal-architecture.md` - Architecture principles
