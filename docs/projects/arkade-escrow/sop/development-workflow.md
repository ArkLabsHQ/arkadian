# Development Workflow

## Environment Setup

### Prerequisites

1. **Install Node.js using asdf**
   ```bash
   # Install asdf (if not already installed)
   git clone https://github.com/asdf-vm/asdf.git ~/.asdf

   # Add to shell profile and restart shell
   echo '. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc

   # Install Node.js plugin and use project version
   cd /path/to/arkade-escrow
   asdf plugin add nodejs
   asdf install  # Reads from .tool-versions file (Node 24)
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with required values:
   - `JWT_SECRET`: Change from default `dev_super_secret_change_me`
   - `PORT`: API server port (default: 3002)
   - `NODE_ENV`: `development` for local work
   - `SQLITE_DB_PATH`: Path to SQLite database file
   - `ARBITRATOR_PUB_KEY`: Arbitrator's x-only public key (61d8b7...)
   - `ARK_SERVER_URL`: Arkd server endpoint (see below)

### Nigiri Setup

Arkade-escrow requires Nigiri running with Ark support:

```bash
# Start Nigiri with Ark server
nigiri start --ark

# Verify Ark server is running at localhost:7070
curl http://localhost:7070/v1/admin/info

# The Ark service must be accessible for contract operations
```

**Important**: Docker setup expects Ark server at `ark:7070` (via Docker network).

## Running the API Server

### Option 1: Local Development (Recommended)

```bash
# Start API with hot reload
npm run api:dev

# Server runs at http://localhost:3002
# Swagger UI available at http://localhost:3002/api/v1/docs
```

**Advantages**:
- Fast hot reload on code changes
- Direct debugging in IDE
- Easier log inspection

### Option 2: Docker Development

```bash
# Start development container
docker compose --profile dev up api-dev

# View logs
docker compose logs -f api-dev

# Stop
docker compose down
```

**Configuration**:
- Port: 3002 (avoiding Nigiri conflict on 3000)
- Database: SQLite mounted at `/app/data/db.sqlite`
- Hot reload: Enabled via volume mount
- Network: Connected to `nigiri` external network

## Code Quality

### Formatting with Biome.js

Biome.js replaces Prettier and ESLint:

```bash
# Check formatting
npm run fmt

# Auto-fix formatting
npm run fmt:fix

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

**CI Check** (runs all checks):
```bash
npm run ci:check
```

This runs format + lint checks in CI mode (fails on issues).

### Type Checking

```bash
npm run typecheck
```

Runs TypeScript compiler without emitting files.

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# Coverage report
npm run test:cov
```

### E2E Tests

End-to-end tests simulate full escrow lifecycle:

```bash
# Prerequisites: Nigiri must be running with --ark
nigiri start --ark

# Run e2e tests
npm run test:e2e
```

**Test Coverage**:
- `/server/test/auth.e2e-spec.ts`: Authentication flow
- `/server/test/escrow-journey-to-execution.e2e-spec.ts`: Full escrow lifecycle

**E2E Test Flow**:
1. Creates test wallets (Alice, Bob)
2. Signs up users, gets JWT tokens
3. Receiver creates escrow request
4. Sender creates draft contract
5. Receiver accepts (contract becomes "created")
6. Funds contract via Ark offchain
7. Executes contract with PSBT signing

## Git Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, run checks
npm run ci:check
npm run typecheck
npm test

# Commit with descriptive message
git add .
git commit -m "feat: add dispute resolution endpoint"

# Push to remote
git push origin feature/your-feature-name
```

### Commit Message Convention

Use conventional commits format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build/tooling changes

## WebStorm/IDE Setup

### WebStorm Configuration

1. **Node.js Interpreter**
   - Settings → Languages & Frameworks → Node.js
   - Set interpreter to asdf Node.js version

2. **Code Style**
   - Biome.js handles formatting automatically
   - Disable built-in ESLint/Prettier if enabled
   - Run `npm run fmt:fix` before commits

3. **Run Configurations**
   - Create "npm" run config for `api:dev`
   - Create "Jest" run config for tests
   - Set working directory to project root

4. **Debugging**
   - Use "JavaScript Debug" configuration
   - URL: `http://localhost:3002`
   - Attach to Node process running `api:dev`

### VS Code Setup

Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

**Note**: Do not commit IDE configuration files (`.idea/`, `.vscode/`) to version control.

## Database Management

### SQLite (Development)

Database location: `./data/ark-escrow.sqlite`

```bash
# Inspect database
sqlite3 ./data/ark-escrow.sqlite

# View tables
.tables

# View schema
.schema escrow_contracts

# Reset database (caution!)
rm ./data/ark-escrow.sqlite
# Database recreates on next API start
```

### Migrations

TypeORM handles migrations automatically in development.

## User Authentication

### Creating Test Users

Use the signup script:

```bash
node scripts/signup.js
```

**Output**:
```
✅ SUCCESS! {
  accessToken: 'eyJhbGc...',
  userId: '8402072f-3160-44a8-aba6-32dc7540c1cf',
  publicKey: '9a99c66a064f18f93377ff5c194506d43925da02...'
}
```

Copy `accessToken` and use in Swagger UI:
1. Open http://localhost:3002/api/v1/docs
2. Click "Authorize" button
3. Enter: `Bearer <accessToken>`
4. Click "Authorize"

## Common Issues

### Port Conflicts

If port 3002 is in use:
```bash
# Change PORT in .env
PORT=3003

# Or kill process on port
lsof -ti:3002 | xargs kill -9
```

### Nigiri Connection Issues

Ensure Nigiri is running with Ark:
```bash
nigiri stop
nigiri start --ark

# Verify
curl http://localhost:7070/v1/admin/info
```

### Docker Network Issues

```bash
# Recreate Nigiri network
docker network ls | grep nigiri
docker network inspect nigiri

# If missing, restart Nigiri with --ark
```
