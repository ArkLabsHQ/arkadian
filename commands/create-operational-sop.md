---
description: Generate validated operational SOPs for projects in the Ark ecosystem by testing commands before documenting them.
---

## User Input

```text
$ARGUMENTS
```

Parse the arguments to determine:
- **project-id**: Required. The project to generate SOPs for (e.g., `arkd`, `fulmine`, `wallet`)
- **sop-type**: Optional. Specific SOP to generate. If omitted, audit and generate all missing SOPs.

Valid `sop-type` values:
- `development-workflow` - Setup, build, run, test, PR checklist
- `deployment-guide` - Production deployment steps
- `all` - Generate all missing SOPs (default)
- `audit` - Only audit, don't generate

Examples:
- `/create-operational-sop arkd` - Audit and generate all missing SOPs for arkd
- `/create-operational-sop wallet development-workflow` - Generate development workflow for wallet
- `/create-operational-sop fulmine audit` - Only audit fulmine's operational docs

## Outline

This command generates validated operational documentation by **actually testing commands** before documenting them. This ensures all documented procedures work correctly.

### 1. Validate Project

**Step 1.1: Load Registry**

Load `${ARKADIAN_DIR}/docs/INDEX.md` and find the project entry.

**Step 1.2: Resolve Paths**

For the given project-id, resolve:
- `docs_path`: `${ARKADIAN_DIR}/docs/projects/<project-id>/`
- `repo_path`: From registry (e.g., `${ARKD_REPO}`, `${WALLET_REPO}`)

If project not found:
- Error: "Project '<project-id>' not found in documentation registry"
- Show available projects from INDEX.md

**Step 1.3: Verify Repository Access**

```bash
ls -la $repo_path
```

If repository not accessible, show error with suggestion to check environment variable.

### 2. Detect Project Type

Read project files to determine type:

**Go Backend** (arkd, go-sdk, fulmine, ark-faucet, kms-unlocker, ark-simulator):
- Has `go.mod`
- Look for: `Makefile`, `cmd/`, `internal/`, `pkg/`
- Common commands: `make build`, `make test`, `go run`

**TypeScript Frontend** (wallet):
- Has `package.json` with React/Vite
- Look for: `src/`, `vite.config.ts`, `tsconfig.json`
- Common commands: `pnpm install`, `pnpm run start`, `pnpm run test`

**TypeScript Backend** (arkade-escrow, arkade-explorer):
- Has `package.json` with Node.js/Express/NestJS
- Look for: `src/`, `prisma/`, `docker-compose.yml`
- Common commands: `pnpm install`, `pnpm run dev`, `pnpm run test`

**Infrastructure** (ark-infra):
- Has `*.tf` files (Terraform/OpenTofu)
- Look for: `modules/`, `environments/`
- Common commands: `tofu init`, `tofu plan`

**Telemetry** (ark-telemetry):
- Has `docker-compose.yml` with Prometheus/Grafana/Loki
- Look for: `dashboards/`, `alerts/`, `config/`
- Common commands: `docker compose up`, `make run`

### 3. Audit Existing Documentation

**Step 3.1: Check Required Files**

Required for ALL projects:
```
sop/
├── development-workflow.md     # REQUIRED

testing/
├── usage.md                    # REQUIRED
├── how_to_run.md               # REQUIRED
├── how_to_test.md              # REQUIRED
├── troubleshooting.md          # REQUIRED
```

Optional based on project type:
```
sop/
├── deployment-guide.md         # Services with Docker/K8s deployment
├── making-changes.md           # Complex projects with many patterns

testing/
├── api-reference.md            # Services with REST/gRPC APIs
```

**Step 3.2: Report Audit Results**

```markdown
## Audit Results for <project-id>

### Required Files:
| File | Status | Notes |
|------|--------|-------|
| sop/development-workflow.md | EXISTS/MISSING | |
| testing/usage.md | EXISTS/MISSING | |
| testing/how_to_run.md | EXISTS/MISSING | |
| testing/how_to_test.md | EXISTS/MISSING | |
| testing/troubleshooting.md | EXISTS/MISSING | |

### Optional Files (recommended for this project type):
| File | Status | Recommended |
|------|--------|-------------|
| sop/deployment-guide.md | EXISTS/MISSING | YES (has Docker) |
| testing/api-reference.md | EXISTS/MISSING | YES (has API) |

### Summary:
- Required: X/5 present
- Optional: Y/Z present
- Action: Generate N missing files
```

If `audit` mode, stop here.

### 4. Generate Missing SOPs

For each missing file, follow the validation-first approach:

#### 4.1 Generate `sop/development-workflow.md`

**Discovery Phase** (read, don't execute):

```bash
# Check for build system
ls $repo_path/Makefile $repo_path/package.json $repo_path/Cargo.toml 2>/dev/null

# Read build configuration
cat $repo_path/Makefile | head -100  # Or package.json scripts
```

**Validation Phase** (test commands):

For each command category, test ONE command to validate:

```bash
# Prerequisites check
cd $repo_path && go version  # or node --version, etc.

# Build test (dry-run if possible)
cd $repo_path && make build --dry-run 2>/dev/null || make build

# Test command
cd $repo_path && make test 2>&1 | head -50
```

**Document only commands that succeed or fail gracefully.**

**Generate Content**:

```markdown
# Development Workflow

## Prerequisites
[Validated list: only include tools confirmed on this system]

## Setup
```bash
git clone <repo-url>
cd <project-id>
[validated install command]
```

## Building
[Only include build commands that were tested]

## Running
[Only include run commands that were tested]

## Testing
[Only include test commands that were tested]

## Quality Checks
[Lint, format commands if they exist]

## PR Checklist
[Based on actual project requirements]
```

#### 4.2 Generate `testing/how_to_run.md`

**Discovery Phase**:

```bash
# Check for Docker
ls $repo_path/Dockerfile $repo_path/docker-compose.yml 2>/dev/null

# Check for Makefile targets
grep -E '^[a-zA-Z_-]+:' $repo_path/Makefile 2>/dev/null | head -20

# Check for scripts
ls $repo_path/scripts/ 2>/dev/null
```

**Validation Phase**:

```bash
# Test Docker availability
docker compose config 2>/dev/null  # Validate compose file

# Test main run command
cd $repo_path && make run --dry-run 2>/dev/null || echo "[note: requires manual test]"
```

**Generate Content**:

```markdown
# How to Run <project-name>

## Prerequisites
[Validated prerequisites from discovery]

## Quick Start
[Fastest path to running, validated]

## Docker Deployment
[If Docker exists, include validated commands]

## Local Development
[Native run commands]

## Configuration
[Environment variables, config files discovered]

## Verification
[How to verify the service is running]
```

#### 4.3 Generate `testing/how_to_test.md`

**Discovery Phase**:

```bash
# Find test files
find $repo_path -name "*_test.go" -o -name "*.test.ts" -o -name "*.spec.ts" | head -10

# Check test configuration
ls $repo_path/vitest.config.* $repo_path/jest.config.* $repo_path/**/testdata/ 2>/dev/null
```

**Validation Phase**:

```bash
# Run a quick test to validate test infrastructure works
cd $repo_path && make test 2>&1 | tail -20  # Or npm test, cargo test
```

**Generate Content**:

```markdown
# How to Test <project-name>

## Unit Tests
[Validated unit test commands]

## Integration Tests
[If present, validated commands]

## Running Specific Tests
[Pattern for running individual tests]

## Test Coverage
[Coverage command if available]

## CI/CD
[Note about CI if .github/workflows exists]
```

#### 4.4 Generate `testing/troubleshooting.md`

**Discovery Phase**:

```bash
# Check for common issues in docs
grep -r "error" $repo_path/README.md $repo_path/docs/ 2>/dev/null | head -10

# Check for log locations
grep -r "log" $repo_path/*.go $repo_path/*.ts 2>/dev/null | head -5
```

**Generate Content** (template-based, less validation needed):

```markdown
# Troubleshooting

## Common Issues

### Build Failures
[Based on project type]

### Runtime Errors
[Based on project type]

### Test Failures
[Based on project type]

## Debugging

### Logs
[Log locations for this project]

### Docker Logs
```bash
docker logs <container-name>
```

### Environment
[How to verify environment is correct]
```

### 5. Standard Templates by Project Type

#### Go Backend Template (arkd, fulmine, ark-faucet, kms-unlocker)

**development-workflow.md sections**:
1. Prerequisites: Go version, make, Docker
2. Setup: clone, `go mod download`
3. Building: `make build`, `make build-all`
4. Running: `make run` or `go run cmd/*/main.go`
5. Testing: `make test`, `make integrationtest`
6. Quality: `make lint`, `make vet`
7. Database: `make mig_up`, `make mig_down` (if applicable)
8. PR Checklist: Standard Go checklist

**how_to_run.md sections**:
1. Prerequisites
2. Docker: `docker compose up` or `make docker-run`
3. Local: `make run`
4. Configuration: Environment variables
5. Verification: Health endpoints, CLI commands

#### TypeScript Frontend Template (wallet)

**development-workflow.md sections**:
1. Prerequisites: Node.js version, pnpm
2. Setup: clone, `pnpm install`
3. Running: `pnpm run start`
4. Testing: `pnpm run test`, `pnpm run test:ui`
5. Quality: `pnpm run lint`, `pnpm run format`
6. Building: `pnpm run build`
7. PR Checklist: Standard frontend checklist

**how_to_run.md sections**:
1. Prerequisites
2. Development server: `pnpm run start`
3. Production build: `pnpm run build && serve dist/`
4. Environment: `.env` variables

#### Infrastructure Template (ark-infra)

**development-workflow.md sections**:
1. Prerequisites: OpenTofu, AWS CLI
2. Setup: AWS credentials, state backend
3. Planning: `tofu plan`
4. Applying: `tofu apply` (with warnings)
5. Destroying: `tofu destroy` (with safety notes)
6. PR Checklist: Infrastructure-specific checklist

### 6. Validation Report

After generating, create validation summary:

```markdown
## Generation Report for <project-id>

### Files Generated:
| File | Status | Commands Tested |
|------|--------|-----------------|
| sop/development-workflow.md | CREATED | build (ok), test (ok), lint (ok) |
| testing/how_to_run.md | CREATED | docker compose (ok), make run (ok) |

### Commands Validated:
- `make build` - SUCCESS
- `make test` - SUCCESS (23 tests passed)
- `make lint` - SUCCESS
- `docker compose config` - SUCCESS

### Commands Not Validated (require manual verification):
- `make integrationtest` - Requires external dependencies
- Production deployment - Requires credentials

### Next Steps:
1. Review generated files in `docs/projects/<project-id>/`
2. Test any commands marked as "require manual verification"
3. Add project-specific content if needed
4. Commit changes
```

### 7. Error Handling

**Repository not found**:
```
Error: Repository path not accessible: ${REPO_PATH}
Check that the environment variable is set correctly.
Available projects: arkd, fulmine, wallet, ...
```

**Build tools missing**:
```
Warning: 'make' not found. Some commands could not be validated.
The SOP will include these commands but mark them as unverified.
```

**Tests fail**:
```
Note: Test command failed with exit code 1.
This is documented in the SOP with troubleshooting notes.
```

### 8. Safety Notes

- **Never run destructive commands** during validation (no `rm -rf`, no `DROP TABLE`)
- **Use dry-run flags** when available (`--dry-run`, `-n`)
- **Capture output, don't hide it** - Failed commands are still documented with their errors
- **Timebox validation** - Each command validation should timeout after 60 seconds
- **Don't auto-commit** - Let the user review generated content first

## File Structure Reference

### Required Files (ALL projects):

```
docs/projects/<project-id>/
├── sop/
│   └── development-workflow.md    # Setup, build, run, test, PR checklist
└── testing/
    ├── usage.md                   # CLI/API usage guide
    ├── how_to_run.md              # Prerequisites, setup, running
    ├── how_to_test.md             # Unit/integration tests
    └── troubleshooting.md         # Common issues, debugging
```

### Optional Files (by project type):

**Services (arkd, fulmine, ark-faucet, arkade-escrow)**:
- `sop/deployment-guide.md` - Production deployment
- `testing/api-reference.md` - REST/gRPC API docs

**Complex projects (arkd)**:
- `sop/making-changes.md` - Common modification patterns
- `sop/adding-grpc-endpoint.md` - Domain-specific SOPs
- `sop/database-workflows.md` - Database operations

**Infrastructure (ark-infra)**:
- `sop/scaling-guide.md`
- `sop/disaster-recovery.md`
- `sop/secrets-management.md`

**Telemetry (ark-telemetry)**:
- `sop/adding-dashboards.md`
- `sop/adding-alerts.md`
- `sop/monitoring-guide.md`

## Usage Examples

```bash
# Audit documentation coverage for arkd
/create-operational-sop arkd audit

# Generate all missing SOPs for wallet
/create-operational-sop wallet

# Generate only development workflow for fulmine
/create-operational-sop fulmine development-workflow

# Generate deployment guide for ark-faucet
/create-operational-sop ark-faucet deployment-guide
```

## Integration with Other Commands

- `/add-project` - Creates initial project structure, this command fills in operational SOPs
- `/update-project` - Updates existing docs, this command creates new SOPs
- `/remove-project` - Removes project and its SOPs
