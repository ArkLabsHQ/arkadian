# Arkade Escrow - Development Setup Guide

This guide covers how to run the Arkade Escrow API in development mode, both locally and with Docker.

## Prerequisites

- **Node.js 24.x** (latest stable version)
- **Nigiri** for local Bitcoin regtest with Ark support
- **Docker** and **Docker Compose** (for containerized setup)
- **npm** package manager

## Local Setup

### 1. Install Node.js

Use [asdf](https://github.com/asdf-vm) for managing Node versions:

```bash
# Install asdf (if not already installed)
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.13.1

# Install Node.js plugin
asdf plugin add nodejs

# Install Node.js (project has .tool-versions file)
cd /path/to/arkade-escrow
asdf install
```

Verify installation:
```bash
node --version  # Should be v24.x.x
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Security
JWT_SECRET=dev_super_secret_change_me  # Change for production!

# Server
PORT=3002
NODE_ENV=development

# Database
SQLITE_DB_PATH=./data/ark-escrow.sqlite

# Arbitrator (for testing)
ARBITRATOR_PUB_KEY=61d8b7526b6d5a46a57a01fcab370acaad1bff309da342bf4acc9077db6b4ac2

# Ark connection (local)
ARK_SERVER_URL=http://localhost:7070
```

**Important Environment Variables:**

- `JWT_SECRET`: Secret for signing JWTs (must be kept secret)
- `PORT`: API server port (default 3002 to avoid conflict with Nigiri)
- `SQLITE_DB_PATH`: Path to SQLite database file
- `ARK_SERVER_URL`: URL of the arkd server
- `ARBITRATOR_PUB_KEY`: Public key of the arbitrator (x-only format)

### 4. Start Nigiri

Nigiri must be running with the `--ark` flag:

```bash
nigiri start --ark
```

This starts:
- Bitcoin Core (regtest)
- Electrs (block explorer)
- Esplora API
- **arkd** (Ark daemon on port 7070)

Verify arkd is running:
```bash
curl http://localhost:7070/v1/info
```

### 5. Start the Development Server

```bash
npm run api:dev
```

This starts the NestJS application with hot reload enabled. The API will be available at:

```
http://localhost:3002
```

Swagger UI documentation:
```
http://localhost:3002/api/v1/docs
```

### 6. Verify Server is Running

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "uptime": 5,
  "environment": "development"
}
```

---

## Docker Setup

### 1. Start Nigiri

Docker Compose requires Nigiri to be running first:

```bash
nigiri start --ark
```

### 2. Build and Start the API Container

```bash
docker compose --profile dev up api-dev
```

This will:
- Build the development Docker image
- Mount the project directory for hot reload
- Start the API on port 3002
- Connect to Nigiri's network

### 3. View Logs

```bash
docker compose logs -f api-dev
```

### 4. Stop the Container

```bash
docker compose down
```

### Docker Configuration Details

The development container:
- Uses `Dockerfile.dev` for the build
- Mounts the entire project directory to `/app` for live code changes
- Preserves `node_modules` in a Docker volume for performance
- Runs `npm run dev` with hot reload enabled
- Connects to both `default` and `nigiri` Docker networks
- Uses SQLite database at `/app/data/db.sqlite` (persisted in volume)

Environment variables for Docker:
```yaml
PORT=3002
NODE_ENV=development
SQLITE_DB_PATH=/app/data/db.sqlite
ARK_SERVER_URL=http://ark:7070  # Uses Docker network
JWT_SECRET=dev_super_secret_change_me
ARBITRATOR_PUB_KEY=61d8b7526b6d5a46a57a01fcab370acaad1bff309da342bf4acc9077db6b4ac2
```

---

## Database

### SQLite Database Location

**Local:**
```
./data/ark-escrow.sqlite
```

**Docker:**
```
/app/data/db.sqlite
```

### Database Migrations

Migrations run automatically on startup. To manually run migrations:

```bash
npm run migration:run
```

To create a new migration:

```bash
npm run migration:generate -- MigrationName
```

---

## Development Workflow

### Making Code Changes

**Local:**
Changes are automatically picked up by the NestJS watcher. Save your file and the server will reload.

**Docker:**
The project directory is mounted, so changes are reflected immediately with hot reload.

### Running Tests

**Unit tests:**
```bash
npm test
```

**E2E tests:**
```bash
npm run test:e2e
```

**Watch mode:**
```bash
npm run test:watch
```

**Coverage:**
```bash
npm run test:cov
```

### Code Quality

**Lint:**
```bash
npm run lint
```

**Format:**
```bash
npm run fmt
```

**Auto-fix formatting:**
```bash
npm run fmt:fix
```

**Auto-fix lint issues:**
```bash
npm run lint:fix
```

**Type checking:**
```bash
npm run typecheck
```

**CI check (all quality checks):**
```bash
npm run ci:check
```

---

## Accessing Services

### Swagger UI

Interactive API documentation:
```
http://localhost:3002/api/v1/docs
```

### Database Browser

For SQLite, use a tool like:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite VSCode Extension](https://marketplace.visualstudio.com/items?itemName=alexcvzz.vscode-sqlite)

### Nigiri Services

When Nigiri is running:
- Bitcoin Core RPC: `localhost:18443`
- Esplora API: `http://localhost:3000`
- arkd gRPC: `localhost:7070`
- arkd HTTP: `http://localhost:7070`

---

## Troubleshooting

### Port Already in Use

If port 3002 is already in use, change the `PORT` in `.env`:

```bash
PORT=3003
```

Then restart the server.

### Cannot Connect to arkd

Verify arkd is running:
```bash
curl http://localhost:7070/v1/info
```

If not running, start Nigiri with `--ark`:
```bash
nigiri stop
nigiri start --ark
```

### Database Locked (SQLite)

If you see "database is locked" errors:
1. Stop all instances of the API
2. Delete the database file
3. Restart (it will be recreated)

```bash
rm ./data/ark-escrow.sqlite
npm run api:dev
```

### Docker Container Won't Start

Check logs:
```bash
docker compose logs api-dev
```

Rebuild the container:
```bash
docker compose down
docker compose --profile dev build api-dev
docker compose --profile dev up api-dev
```

### Hot Reload Not Working

**Local:** Ensure you're using `npm run api:dev`, not `npm run api:start`.

**Docker:** Verify the volume mount in `docker-compose.yml`:
```yaml
volumes:
  - .:/app
  - /app/node_modules
```

---

## Production Build

To build for production:

```bash
npm run build
```

The compiled output will be in the `dist/` directory.

Start production server:

```bash
npm run api:start
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | **Required.** Secret for JWT signing |
| `PORT` | 3002 | API server port |
| `NODE_ENV` | development | Environment (development/production) |
| `SQLITE_DB_PATH` | ./data/ark-escrow.sqlite | SQLite database file path |
| `ARK_SERVER_URL` | http://localhost:7070 | Arkd server URL |
| `ARBITRATOR_PUB_KEY` | - | **Required.** Arbitrator public key (x-only) |

---

## Useful Commands

```bash
# Development
npm run api:dev              # Start dev server with hot reload
npm run web:dev              # Start web client (if available)

# Testing
npm test                     # Run unit tests
npm run test:e2e             # Run E2E tests
npm run test:watch           # Run tests in watch mode
npm run test:cov             # Generate coverage report

# Code Quality
npm run lint                 # Lint code
npm run fmt                  # Format code
npm run lint:fix             # Auto-fix lint issues
npm run fmt:fix              # Auto-fix formatting
npm run typecheck            # TypeScript type checking
npm run ci:check             # Run all checks

# Production
npm run build                # Build for production
npm run api:start            # Start production server
```
