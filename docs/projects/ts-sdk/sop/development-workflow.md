# Ark TypeScript SDK — Development Workflow

## Prerequisites

1. **Node.js** 18+
2. **pnpm** 10.29.2+ — `npm install -g pnpm`
3. **Docker** (for integration tests)
4. **nigiri** — `curl https://getnigiri.vulpem.com | bash`

## Setup

```bash
cd /path/to/ts-sdk
pnpm install
```

## Building

```bash
# Full build (ESM + CJS + types)
pnpm build
```

## Running Tests

```bash
# Unit tests
pnpm test

# Unit tests only
pnpm test:unit

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Integration tests (requires nigiri)
nigiri start --ark
pnpm test:setup
pnpm test:integration
nigiri stop --delete
```

## Code Quality

```bash
# Format code
pnpm format

# Lint
pnpm lint
```

- Prettier for formatting
- Husky for pre-commit hooks

## Git Workflow

### Branch Naming

```
feat/short-description
fix/issue-description
refactor/area-description
```

### Commit Convention

- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `test:` — Test changes
- `docs:` — Documentation

### Pre-commit Checklist

```bash
pnpm build    # No build errors
pnpm test     # All tests pass
pnpm format   # Code formatted
pnpm lint     # No lint errors
```

### PR Flow

1. Create feature branch from `main`
2. Make changes, ensure build + tests pass
3. Push and create PR against `main`
4. CI validates build and tests
5. npm package published on merge to `main`

## Releasing

```bash
# Release new version (prompts for patch/minor/major)
pnpm release

# Dry run
pnpm release:dry-run

# Cleanup after release
pnpm release:cleanup
```

## Building Documentation

```bash
# Generate TypeDoc API docs
pnpm docs:build

# Open in browser
pnpm docs:open
```
