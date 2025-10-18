# Development Workflow

## Prerequisites
- Go 1.24.6+, Node.js 18.17.1+, Docker
- golangci-lint, migrate, sqlc

## Setup
```bash
git clone https://github.com/ArkLabsHQ/fulmine.git
cd fulmine
go mod download
```

## Building

**Static Assets:**
```bash
make build-static-assets  # Builds templates + web assets
make build-templates      # Templates only
```

**Binary:**
```bash
make build       # Current platform
make build-all   # All platforms
```

## Running
```bash
make run  # Dev mode, http://localhost:7001
```

## Changes

**Go:** Edit `internal/`, `pkg/`, `cmd/` → `make run`
**Templates:** Edit `.templ` → `make build-templates` → restart
**Assets:** Edit `internal/interface/web/src/` → `make build-static-assets` → restart

## Quality
```bash
make lint  # Auto-fix linting
make vet   # Static analysis
make cov   # Coverage
```

## Testing

**Unit:**
```bash
make test         # All tests
make test-vhtlc   # VHTLC only
```

**Integration:**
```bash
make build-test-env && make up-test-env
make setup-test-env
make integrationtest
make down-test-env
```

## Protocol Buffers
```bash
# Edit api-spec/protobuf/fulmine/v1/*.proto
make proto       # Generate + lint
make proto-lint  # Lint only
```

## Database

**Create Migration:**
```bash
make mig_file FILE=add_table
# Edit: internal/infrastructure/db/sqlite/migration/<timestamp>_add_table.up/down.sql
```

**Apply/Rollback:**
```bash
make mig_up        # Apply
make mig_down      # Rollback
make vet_db        # Test migrations
```

**Generate SQL Code:**
```bash
# Edit internal/infrastructure/db/sqlite/queries.sql
make sqlc
```

## PR Checklist
- [ ] `make test` passes
- [ ] `make integrationtest` passes (if applicable)
- [ ] `make lint` clean
- [ ] `make vet` clean
- [ ] `make vet_db` passes (if migrations)
- [ ] `make proto-lint` passes (if proto changes)
- [ ] `make build` succeeds
- [ ] Manual testing done
- [ ] Docs updated
- [ ] Clear commits

## Clean
```bash
make clean
```
