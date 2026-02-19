# Development Workflow

## Environment Setup

### Prerequisites

1. **Node.js** >= 20 (24 recommended)
   ```bash
   # Using asdf or mise with project's .tool-versions
   cd /path/to/arkade-escrow
   asdf install  # or: mise install
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with required values (JWT_SECRET, ARBITRATOR keys, ARK_SERVER_URL)
   ```

4. **Start Nigiri** (for Ark protocol operations)
   ```bash
   nigiri start --ark
   curl http://localhost:7070/v1/info  # Verify arkd
   ```

## Running the Application

```bash
npm run dev              # All 3 apps: server + client + backoffice
npm run dev:api          # API server only (NestJS watch mode)
npm run dev:client       # Client Vite dev server (port 3001)
npm run dev:backoffice   # Backoffice Vite dev server (port 8080)
```

With Docker:
```bash
make up     # Start dev stack
make down   # Stop dev stack
```

## Code Quality

```bash
npm run lint         # Biome lint
npm run fmt          # Biome format check
npm run typecheck    # TypeScript type check
npm run ci:check     # All checks (used in CI)
npm run fmt:fix      # Auto-fix formatting
npm run lint:fix     # Auto-fix lint issues
```

## Testing

```bash
npm run test                # Unit tests
npm run test:api:acceptance # E2E tests (needs Nigiri + arkd)
```

## Git Workflow

### Branch Naming
```
feature/short-description
fix/issue-description
```

### Pre-commit Checklist
```bash
npm run ci:check     # Biome lint + format
npm run typecheck    # TypeScript errors
npm run test         # Unit tests pass
```

### Commit Convention
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Build/tooling

### PR Flow
1. Create feature branch from `master`
2. Make changes, run quality checks
3. Push and create PR against `master`
4. CI runs code quality check (+ unit tests on push to master)

## Database Management

Database: SQLite at `./data/db.sqlite` (auto-created, `synchronize: true` in dev).

```bash
# Reset database
rm ./data/db.sqlite
npm run dev:api  # Recreates on startup
```

## IDE Setup

**VS Code** — Install Biome extension, add to `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```

**WebStorm** — Set Node interpreter to asdf version, disable built-in ESLint/Prettier.
