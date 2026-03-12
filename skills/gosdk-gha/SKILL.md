---
name: gosdk-gha
description: Simulate go-sdk GitHub Actions CI pipeline locally. Runs lint, vet, build, unit tests, and integration tests (MANDATORY). Optionally proto lint — matching the real CI checks that run on PRs.
---

# go-sdk GHA CI Simulation

Run the same checks that go-sdk's GitHub Actions CI pipeline runs on pull requests. This catches CI failures locally before pushing.

**Source of truth:** `${GO_SDK_REPO}/.github/workflows/` — always check these files for the latest CI definition. This skill documents the known pipeline as a fallback.

## Pre-Check

Before running CI checks, verify you're in the right location:

```bash
# Must run from the worktree directory (inherited from implement phase)
# The worktree path is in artifacts/implement/changes.yaml
pwd
ls go.mod  # Must exist — confirms we're in a go-sdk repo root
```

## Step 1: Lint

```bash
make lint
```

Uses `golangci-lint` via Docker for consistent results across environments.

**On failure:**
1. Run `make lint` again — it auto-fixes some issues (gofmt, goimports)
2. If still failing, read the error output and fix manually
3. Re-run `make lint` to confirm

## Step 2: Vet

```bash
make vet
```

Static analysis across all packages.

## Step 3: Build

```bash
go build ./...
```

go-sdk is a **library**, not a binary — this verifies all packages compile. There is no `make build` target.

## Step 4: Unit Tests

```bash
make test
```

Runs all unit tests with race detection. Safe to use — no port conflict issues.

Run individual packages if the full suite is too slow:
```bash
go test -v -count=1 -race ./client/...
go test -v -count=1 -race ./store/...
go test -v -count=1 -race ./internal/...
```

## Step 5: Proto Lint (Conditional)

Only run if `.proto` files were modified:

```bash
# Check if proto files changed
git diff --name-only HEAD~1 | grep '\.proto$' && PROTO_CHANGED=true || PROTO_CHANGED=false

if [ "$PROTO_CHANGED" = "true" ]; then
    # Verify proto generation still works
    make proto
fi
```

Note: go-sdk uses `make proto` for generation (not `make proto-lint`). Running generation confirms protos are valid.

## Step 6: Integration Tests

Requires a running arkd server. Reuse infrastructure from the implement phase if available.

```bash
# Verify arkd is running
curl -s http://localhost:7070/v1/info > /dev/null && echo "arkd OK" || echo "arkd NOT RUNNING"
curl -s http://localhost:3000/api/blocks/tip/height > /dev/null && echo "Esplora OK" || echo "Esplora NOT RUNNING"
```

If infrastructure is running, run integration tests:

```bash
go test -v -count=1 -timeout 600s ./test/...
```

If infrastructure is NOT running, you MUST start it before proceeding:

```bash
# Start the test environment (go-sdk tests run against arkd)
cd ${ARKD_REPO}
make build-test-env && make setup-test-env
cd -  # Return to worktree
```

Wait for services to be ready (re-check health endpoints above). If infrastructure cannot be started after 3 attempts, report the CI phase as **FAILED** — do NOT skip integration tests. Integration tests are the most critical CI check.

## Step 7: Report

Write `ci-evidence.md` to `${ARTIFACTS_DIR}` with results of each check:

```markdown
# CI Evidence

## Environment
- **Project:** go-sdk
- **Branch:** <branch name>
- **Worktree:** <worktree path>

## Check Results

| Check | Status | Duration | Notes |
|-------|--------|----------|-------|
| Lint | PASS/FAIL | Xs | |
| Vet | PASS/FAIL | Xs | |
| Build | PASS/FAIL | Xs | go build ./... |
| Unit Tests | PASS/FAIL | Xs | N passed, M failed |
| Proto | PASS/SKIP | Xs | Skipped: no proto changes |
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

### Proto Generation
<raw output or "SKIPPED: no proto changes">

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
- Fix issues in the WORKTREE, not the main repo
- Capture ALL output for ci-evidence.md
- go-sdk is a library — use `go build ./...` not `make build`
