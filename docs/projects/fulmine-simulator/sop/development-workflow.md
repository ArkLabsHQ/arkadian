# Fulmine Simulator - Development Workflow

## Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose
- Make
- Git

## Setup

### Clone Repository

```bash
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator
```

### Install Dependencies

```bash
make deps
```

### Verify Setup

```bash
# Build
make build

# Run tests
make test

# Check help
./bin/orchestrator --help
```

## Development Cycle

### 1. Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 2. Make Changes

Edit files in appropriate directories:

| Directory | Purpose |
|-----------|---------|
| `orchestrator/` | Orchestrator binary |
| `lnd-client/` | LND client daemon |
| `fulmine-client/` | Fulmine client wrapper |
| `configs/` | Configuration examples |

### 3. Build

```bash
make build
```

### 4. Test

```bash
# Unit tests
make test

# Integration tests (requires stack)
make integrationtest

# Manual test
make run CONFIG=configs/test.yaml
```

### 5. Lint

```bash
make lint
```

### 6. Commit

```bash
git add .
git commit -m "feat: add new feature description"
```

## Code Style

### Formatting

Code is auto-formatted on lint:

```bash
make lint  # Runs gofmt -s -w .
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Package | lowercase | `config` |
| Public func | CamelCase | `ParseConfig` |
| Private func | camelCase | `validateNetwork` |
| Constants | UPPER_SNAKE | `MAX_CLIENTS` |
| Variables | camelCase | `clientCount` |

### Error Handling

```go
// Return errors, don't panic
func DoSomething() error {
    if err := validate(); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }
    return nil
}
```

## Testing Guidelines

### Unit Tests

- Place in same package with `_test.go` suffix
- Use table-driven tests
- Mock external dependencies

### Integration Tests

- Use `//go:build integration` tag
- Place in `tests/integration/`
- Require running infrastructure

## PR Checklist

Before submitting a PR:

- [ ] Code builds: `make build`
- [ ] Tests pass: `make test`
- [ ] Linter passes: `make lint`
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventional format
- [ ] No secrets or credentials in code

## Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(config): add JSON schema validation
fix(orchestrator): handle client timeout correctly
docs(readme): update installation instructions
```

## Release Process

1. Update version in code
2. Update CHANGELOG.md
3. Create release tag
4. Build release binaries

```bash
# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Build release binaries
VERSION=1.0.0 make build
```

## Useful Commands

```bash
# Full rebuild
make clean && make build

# Run with verbose logging
./bin/orchestrator --config test.yaml --verbose

# Check code coverage
make coverage && open coverage.html

# Clean everything
make clean && make clean-processes
```
