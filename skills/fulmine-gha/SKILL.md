---
name: fulmine-gha
description: Simulate fulmine GitHub Actions CI pipeline locally. Runs lint, vet, build, unit tests, and integration tests (MANDATORY). Optionally proto lint and DB vet — matching the real CI checks that run on PRs.
---

# fulmine GHA CI Simulation

Run the same checks that fulmine's GitHub Actions CI pipeline runs on pull requests. This catches CI failures locally before pushing.

**Source of truth:** `${FULMINE_REPO}/.github/workflows/` — always check these files for the latest CI definition. This skill documents the known pipeline as a fallback.

## Pre-Check

Before running CI checks, verify you're in the right location:

```bash
# Must run from the worktree directory (inherited from implement phase)
pwd
ls go.mod  # Must exist — confirms we're in a fulmine repo root
```

## Step 1: Lint

```bash
make lint
```

Uses `golangci-lint`. Auto-fixes formatting issues.

**On failure:**
1. Run `make lint` again — it auto-fixes some issues
2. If still failing, read the error output and fix manually
3. Re-run `make lint` to confirm

## Step 2: Vet

```bash
make vet
```

Static analysis across all packages.

## Step 3: Build Static Assets

```bash
make build-static-assets
```

Builds templates and web assets. Must succeed before binary build.

## Step 4: Build

```bash
make build
```

Compiles the fulmine binary. Must succeed.

## Step 5: Unit Tests

```bash
make test
```

Runs all unit tests with race detector, excluding `internal/test/e2e`. Safe to use for fulmine (no port conflict unlike arkd).

## Step 6: Proto Lint (Conditional)

Only run if `.proto` files were modified:

```bash
git diff --name-only HEAD~1 | grep '\.proto$' && PROTO_CHANGED=true || PROTO_CHANGED=false

if [ "$PROTO_CHANGED" = "true" ]; then
    make proto-lint
fi
```

## Step 7: DB Migration Vet (Conditional)

Only run if migration files were modified:

```bash
git diff --name-only HEAD~1 | grep 'migration' && MIG_CHANGED=true || MIG_CHANGED=false

if [ "$MIG_CHANGED" = "true" ]; then
    make vet_db
fi
```

## Step 8: Integration Tests

Reuse the infrastructure already running from the implement phase. Do NOT start new Docker containers.

```bash
# Verify infra is still running
curl -s http://localhost:7001/api/v1/info > /dev/null && echo "fulmine OK" || echo "fulmine NOT RUNNING"
curl -s http://localhost:7070/v1/info > /dev/null && echo "arkd OK" || echo "arkd NOT RUNNING"
curl -s http://localhost:3000/api/blocks/tip/height > /dev/null && echo "Esplora OK" || echo "Esplora NOT RUNNING"
```

If infrastructure is running, run a subset of integration tests as regression check:

```bash
# Uncomment TestMain if it was commented out during implement phase
# Then run a few key tests
go test -v -count=1 -run "TestVHTLC|TestDelegate" \
    -timeout 600s -race -p=1 ./internal/test/e2e/...
```

If infrastructure is NOT running, you MUST start it before proceeding:

```bash
# Start the test environment
cd ${FULMINE_REPO}  # Use the main repo, not the worktree
make build-test-env && make setup-test-env
cd -  # Return to worktree
```

Wait for services to be ready (re-check health endpoints above). If infrastructure cannot be started after 3 attempts, report the CI phase as **FAILED** — do NOT skip integration tests. Integration tests are the most critical CI check.

## Step 9: Report

Write `ci-evidence.md` to `${ARTIFACTS_DIR}` with results of each check:

```markdown
# CI Evidence

## Environment
- **Project:** fulmine
- **Branch:** <branch name>
- **Worktree:** <worktree path>

## Check Results

| Check | Status | Duration | Notes |
|-------|--------|----------|-------|
| Lint | PASS/FAIL | Xs | |
| Vet | PASS/FAIL | Xs | |
| Build Assets | PASS/FAIL | Xs | |
| Build | PASS/FAIL | Xs | |
| Unit Tests | PASS/FAIL | Xs | N passed, M failed |
| Proto Lint | PASS/SKIP | Xs | |
| DB Vet | PASS/SKIP | Xs | |
| Integration | PASS/FAIL | Xs | MANDATORY — never skip |

## Detailed Output

### Lint
<raw output>

### Vet
<raw output>

### Build Static Assets
<raw output>

### Build
<raw output>

### Unit Tests
<raw output or summary>

### Proto Lint
<raw output or "SKIPPED: no proto changes">

### DB Migration Vet
<raw output or "SKIPPED: no migration changes">

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
    "build_assets_passed": true,
    "build_passed": true,
    "unit_tests_passed": true,
    "proto_lint_passed": true,
    "proto_lint_skipped": false,
    "db_vet_passed": true,
    "db_vet_skipped": true,
    "integration_tests_passed": true,
    "integration_tests_skipped": false,
    "checks_run": 8,
    "checks_passed": 8,
    "checks_failed": 0,
    "auto_fixes_applied": 0,
    "files_changed": []
  }
}
```

## Failure Handling

- **Lint failure**: Auto-fix (step 1), re-run, if still failing fix manually
- **Vet failure**: Fix the reported issues
- **Build failure**: Compilation error — fix the code
- **Unit test failure**: Read output, fix the failing test or code
- **DB vet failure**: Fix migration SQL
- **Max attempts**: 5 per check. If still failing after 5, report as failed.

## Important Rules

- Do NOT start Docker containers — reuse existing infrastructure
- Fix issues in the WORKTREE, not the main repo
- Capture ALL output for ci-evidence.md
- If TestMain was commented out during implement phase, uncomment it before integration tests
