# Arkade Escrow - How to Run

## Prerequisites

- Node.js >= 20 (24 recommended). Use `asdf install` or `mise install` with the `.tool-versions` file.
- npm >= 10
- Docker and Docker Compose (for containerized setup)
- Nigiri with `--ark` flag (for Ark protocol operations)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Key variables:
| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | **Required.** Secret for JWT signing |
| `PORT` | `3002` | API server port |
| `SQLITE_DB_PATH` | `./data/db.sqlite` | SQLite database path |
| `ARK_SERVER_URL` | `http://localhost:7070` | arkd server URL |
| `ARBITRATOR_PUB_KEY` | - | **Required.** Arbitrator's x-only public key (hex) |
| `ARBITRATOR_PRIV_KEY` | - | **Required.** Arbitrator's private key (hex) |

### 3. Start Nigiri (if needed for Ark operations)

```bash
nigiri start --ark
curl http://localhost:7070/v1/info  # Verify arkd
```

### 4. Run the Application

**All three apps (server + client + backoffice):**
```bash
npm run dev
```

This runs concurrently:
- NestJS API server (port 3002) with hot reload
- Client Vite build in watch mode → served at `/client`
- Backoffice Vite build in watch mode → served at `/backoffice`

**API server only:**
```bash
npm run dev:api
```

**Client dev server only (standalone on port 3001):**
```bash
npm run dev:client
```

**Backoffice dev server only (standalone on port 8080):**
```bash
npm run dev:backoffice
```

### 5. Verify

- API: `curl http://localhost:3002/health`
- Swagger: `http://localhost:3002/api/v1/docs`
- Client: `http://localhost:3002/client/`
- Backoffice: `http://localhost:3002/backoffice/`

## Docker Development

```bash
# Start Nigiri first (provides arkd)
nigiri start --ark

# Start development container
make up

# Stop
make down
```

The Docker setup uses `docker-compose.dev.yml` with the `dev` profile.

## Production Build

```bash
# Build NestJS server
npm run build

# Build client SPA
npm run build:client

# Build backoffice SPA
npm run build:backoffice

# Run production server
node dist/main.js
```

The Docker production build (`Dockerfile`) creates a multi-stage image that builds all three apps and serves them from a single Node.js process.

## Database

SQLite database auto-creates at `$SQLITE_DB_PATH` on first run. TypeORM runs with `synchronize: true` in development (auto-creates tables). Delete `data/db.sqlite` to reset.

## Accessing Services

| Service | URL |
|---------|-----|
| API Server | `http://localhost:3002` |
| Swagger UI | `http://localhost:3002/api/v1/docs` |
| Client App | `http://localhost:3002/client/` |
| Backoffice | `http://localhost:3002/backoffice/` |
| Health Check | `http://localhost:3002/health` |
