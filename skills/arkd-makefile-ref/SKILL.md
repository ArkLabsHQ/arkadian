---
name: arkd-makefile-ref
description: Quick reference for arkd Makefile targets. Use before building, generating code, or running linters. Covers proto generation, build, sqlc, lint, and explains why make test must NEVER be used.
---

# arkd Makefile Quick Reference

Common Makefile targets for the arkd project at `${ARKD_REPO}`.

## Safe Targets

| Target | What it does | When to use |
|--------|-------------|-------------|
| `make proto` | Lint protos + generate Go code via `buf generate` | After changing `.proto` files |
| `make build` | Build arkd binary via `scripts/build-arkd` | Before testing locally |
| `make sqlc` | Generate Go code from SQL queries | After changing SQL in `queries/` |
| `make lint` | Run golangci-lint | Before finalizing changes |
| `make clean` | Remove build artifacts | When build state is stale |
| `make run-light` | Run arkd in light mode (sqlite, no PG/Redis) | Local dev iteration |
| `make run` | Run arkd in full mode (PG + Redis) | When testing PG-specific code |
| `make run-wallet` | Start arkd-wallet + Docker deps (pg, nbxplorer) | Before running arkd |

## NEVER Use These Targets

| Target | Why |
|--------|-----|
| `make test` | Starts `ark-pg-test` container on **port 5432** which conflicts with `pgnbxplorer` from `make run-wallet`. Use individual `go test` commands instead. |
| `make integrationtest` | Runs the FULL e2e suite which is slow (~15-20 min) and has the same port conflict. Only use for final verification if no other infrastructure is running. |

## Individual Test Commands (Use These Instead)

```bash
# Run a specific test
go test -v -count=1 -run TestFunctionName -timeout 800s github.com/arkade-os/arkd/internal/test/e2e

# Run a specific sub-test
go test -v -count=1 -run "TestParent/sub_test_name" -timeout 800s github.com/arkade-os/arkd/internal/test/e2e

# Run unit tests for a specific package (no infra needed)
go test -v ./internal/core/application/...

# Run unit tests for a specific file pattern
go test -v ./internal/core/domain/...
```

## Proto Generation Details

`make proto` runs:
1. `buf lint` — validates proto files
2. `buf generate` — generates Go code from protos (via Docker)

If proto generation fails, check:
- Docker is running
- `.proto` files have valid syntax
- `buf.gen.yaml` config is correct

Do NOT run Docker buf commands manually — always use `make proto`.

## Build Details

`make build` runs `scripts/build-arkd` which:
- Compiles the arkd binary with proper build flags
- Output: `build/arkd`

For quick iteration, you can also use `go build ./cmd/arkd` directly.
