---
name: arkd-gha
description: Simulate arkd GitHub Actions CI pipeline locally. Runs lint, vet, build, unit tests, and integration tests (MANDATORY). Optionally proto lint — matching the real CI checks that run on PRs.
---

# arkd GHA CI Simulation

Run the same checks that arkd's GitHub Actions CI pipeline runs on pull requests. This catches CI failures locally before pushing.

**Source of truth:** `${ARKD_REPO}/.github/workflows/` — always check these files for the latest CI definition. This skill documents the known pipeline as a fallback.

## Pre-Check

Before running CI checks, verify you're in the right location:

```bash
# Must run from the worktree directory (inherited from implement phase)
# The worktree path is in artifacts/implement/changes.yaml
pwd
ls go.mod  # Must exist — confirms we're in an arkd repo root
```

## Step 1: Lint

```bash
make lint
```

Uses `golangci-lint` with `.golangci.yml` config. Checks: gofmt, goimports, govet, staticcheck, errcheck, gosec.

**On failure:**
1. Run `make lint` again — it auto-fixes some issues (gofmt, goimports)
2. If still failing, read the error output and fix manually
3. Re-run `make lint` to confirm

## Step 2: Vet

```bash
go vet ./...
```

Static analysis across all packages.

## Step 3: Build

```bash
make build
```

Compiles the arkd binary. Must succeed — if it fails, there are compilation errors.

## Step 4: Unit Tests

```bash
go test -count=1 -race -timeout 300s ./internal/...
```

**NEVER use `make test`** — it starts a PostgreSQL container on port 5432 which conflicts with `pgnbxplorer` from the test environment.

Run individual packages if the full suite is too slow:
```bash
go test -count=1 -race ./internal/core/application/...
go test -count=1 -race ./internal/core/domain/...
go test -count=1 -race ./internal/infrastructure/...
```

## Step 5: Proto Lint (Conditional)

Only run if `.proto` files were modified:

```bash
# Check if proto files changed
git diff --name-only HEAD~1 | grep '\.proto$' && PROTO_CHANGED=true || PROTO_CHANGED=false

if [ "$PROTO_CHANGED" = "true" ]; then
    make proto-lint
fi
```

## Step 6: Integration Tests

Reuse the infrastructure already running from the implement phase. Do NOT start new Docker containers.

```bash
# Verify infra is still running
curl -s http://localhost:7070/v1/info > /dev/null && echo "arkd OK" || echo "arkd NOT RUNNING"
curl -s http://localhost:3000/api/blocks/tip/height > /dev/null && echo "Esplora OK" || echo "Esplora NOT RUNNING"
```

If infrastructure is running, run a subset of integration tests as regression check:

```bash
# Run a few key tests (NOT the full suite — that's too slow for CI sim)
go test -v -count=1 -run "TestSettleInSameRound|TestSendOffChain|TestCollaborativeExit" \
    -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
```

If infrastructure is NOT running, you MUST start it before proceeding:

```bash
# Start the test environment
cd ${ARKD_REPO}  # Use the main repo, not the worktree
make build-test-env && make setup-test-env
cd -  # Return to worktree
```

Wait for services to be ready (re-check health endpoints above). If infrastructure cannot be started after 3 attempts, report the CI phase as **FAILED** — do NOT skip integration tests. Integration tests are the most critical CI check.

## Step 7: Report

Write `ci-evidence.md` to `${ARTIFACTS_DIR}` with results of each check:

```markdown
# CI Evidence

## Environment
- **Project:** arkd
- **Branch:** <branch name>
- **Worktree:** <worktree path>

## Check Results

| Check | Status | Duration | Notes |
|-------|--------|----------|-------|
| Lint | PASS/FAIL | Xs | |
| Vet | PASS/FAIL | Xs | |
| Build | PASS/FAIL | Xs | |
| Unit Tests | PASS/FAIL | Xs | N passed, M failed |
| Proto Lint | PASS/SKIP | Xs | Skipped: no proto changes |
| Integration | PASS/FAIL | Xs | MANDATORY — never skip |

## Detailed Output

### Lint
<raw output>

### Vet
<raw output>

### Build
<raw output>

### Unit Tests
<raw output or summary>

### Integration Tests
<raw output — MUST NOT be skipped>

## Auto-Fixes Applied
- <list of auto-fixes, or "None">

## Verdict
All checks: PASS / X of Y FAILED
```

## _result.json Schema

```json
{
  "agent_specific": {
    "lint_passed": true,
    "vet_passed": true,
    "build_passed": true,
    "unit_tests_passed": true,
    "proto_lint_passed": true,
    "proto_lint_skipped": false,
    "integration_tests_passed": true,
    "integration_tests_skipped": false,
    "checks_run": 6,
    "checks_passed": 6,
    "checks_failed": 0,
    "auto_fixes_applied": 0,
    "files_changed": []
  }
}
```

## Failure Handling

- **Lint failure**: Auto-fix (step 1), re-run, if still failing fix manually
- **Vet failure**: Fix the reported issues — usually unused vars, shadowed vars, or wrong types
- **Build failure**: Compilation error — read the error, fix the code
- **Unit test failure**: Read test output, fix the failing test or the code under test
- **Max attempts**: 5 per check. If still failing after 5, report as failed.

## Important Rules

- Do NOT start Docker containers — reuse existing infrastructure
- Do NOT run `make test` — port conflict with pgnbxplorer
- Do NOT run `make integrationtest` — too slow; run individual tests
- Fix issues in the WORKTREE, not the main repo
- Capture ALL output for ci-evidence.md
