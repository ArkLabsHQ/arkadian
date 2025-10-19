---
project_id: arkade-escrow
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  api: ["testing/api-reference.md"]
  escrow: ["system/escrow-contract.md"]
  auth: ["system/authentication.md"]
scripts:
  dev: "npm run api:dev"
  docker_dev: "docker compose --profile dev up api-dev"
  test: "npm run test"
  test_e2e: "npm run test:e2e"
  lint: "npm run lint"
  fmt: "npm run fmt"
---

# Arkade Escrow — Project Index

**arkade-escrow** is a generic escrow system built on top of the Arkade protocol. It provides a secure 3-party escrow mechanism (sender, receiver, arbitrator) using Virtual Transaction Outputs (VTXOs) with both collaborative and unilateral spending paths.

The system includes a NestJS API backend with JWT authentication, SQLite/PostgreSQL storage, and Swagger documentation. A companion web app is planned for future releases.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/` — System Architecture & Design
Core documentation about the escrow system:

- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/project_overview.md** — — What arkade-escrow is, features, use cases
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/architecture.md** — — NestJS backend architecture, modules, and components
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/escrow-contract.md** — — Virtual Escrow Contract (VEC) implementation and spending paths
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/authentication.md** — — Schnorr signature-based authentication system
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/api-design.md** — — REST API design and endpoints
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/system/database-schema.md** — — TypeORM entities and database structure

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/` — Usage & Development
Practical guides for using and testing:

- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/usage.md** — — Quick start guide and basic workflows
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/api-reference.md** — — Complete API documentation with examples
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/how_to_run.md** — — Local and Docker development setup
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/how_to_test.md** — — Running unit and e2e tests
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/development-workflow.md** — — Development setup and workflow
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/escrow-workflow.md** — — Escrow lifecycle from request to execution
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/arbitration-process.md** — — Dispute resolution and arbitration
- **${ARKADIAN_DIR}/docs/projects/arkade-escrow/sop/deployment-guide.md** — — Production deployment guide

### `${ARKADIAN_DIR}/docs/projects/arkade-escrow/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Recent Changes
Curated summaries of significant changes.

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### 3-Party Escrow System
- **Sender (Buyer)**: Initiates escrow and funds it
- **Receiver (Seller)**: Receives funds upon successful completion
- **Arbitrator**: Neutral third party for dispute resolution
- **Server**: Arkade server coordinating off-chain transactions

### Virtual Escrow Contract (VEC)
Custom Taproot script with 6 spending paths:

**Collaborative Paths** (with server):
1. **Release**: Receiver + Arbitrator + Server (goods delivered)
2. **Refund**: Sender + Arbitrator + Server (dispute resolved for sender)
3. **Direct**: Sender + Receiver + Server (mutual agreement)

**Unilateral Paths** (with timelock):
4. **Unilateral Release**: Receiver + Arbitrator (after timeout)
5. **Unilateral Refund**: Sender + Arbitrator (after timeout)
6. **Unilateral Direct**: Sender + Receiver (after timeout)

### Escrow Workflow
1. **Request Creation**: Receiver or Sender creates escrow request
2. **Contract Acceptance**: Counterparty accepts, creating contract
3. **Funding**: Sender sends VTXOs to escrow Ark address
4. **Execution**: Happy path (direct) or dispute (arbitration)
5. **Settlement**: Funds released via chosen spending path

### Contract States
- `draft`: Contract created, missing addresses
- `created`: All addresses set, waiting for funding
- `funded`: VTXOs received, ready for execution
- `pending-execution`: Execution transaction created
- `completed`: Funds settled
- `canceled-by-creator/counterparty/arbiter`: Cancellation states
- `under-arbitration`: Dispute in progress

### Authentication System
- **Challenge-Response**: Schnorr signature-based signup
- **JWT Tokens**: Stateless authentication with 7-day expiry
- **Public Key Identity**: User identified by secp256k1 public key
- **No Passwords**: Cryptographic signature replaces passwords

---

## Quick Reference

### Prerequisites
- Node.js >= 24
- npm (recommended for consistency with CI)
- Nigiri with `--ark` flag for local development
- arkd server running at `localhost:7070`

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run api:dev

# Access Swagger UI at http://localhost:3002/api/v1/docs
```

### Docker Development
```bash
# Requires Nigiri with --ark
nigiri start --ark

# Start dockerized API
docker compose --profile dev up api-dev

# Access at http://localhost:3002
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests (requires arkd running)
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### Code Quality
```bash
# Lint
npm run lint

# Format
npm run fmt

# Fix formatting
npm run fmt:fix

# Fix lint issues
npm run lint:fix

# CI check
npm run ci:check
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `3002` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `SQLITE_DB_PATH` | SQLite database file path | `./data/ark-escrow.sqlite` | ❌ |
| `ARK_SERVER_URL` | Arkd server URL | `http://localhost:7070` | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `ARBITRATOR_PUB_KEY` | Arbitrator's x-only public key | - | ✅ |

### Development Configuration
```bash
# .env file (see .env.example)
JWT_SECRET=dev_super_secret_change_me
PORT=3002
NODE_ENV=development
SQLITE_DB_PATH=./data/ark-escrow.sqlite
ARK_SERVER_URL=http://localhost:7070
ARBITRATOR_PUB_KEY=61d8b7526b6d5a46a57a01fcab370acaad1bff309da342bf4acc9077db6b4ac2
```

**Note**: The example arbitrator private key is included in `.env.example` for development only. NEVER use these keys in production.

### Docker Configuration
```yaml
environment:
  - PORT=3002
  - NODE_ENV=development
  - SQLITE_DB_PATH=/app/data/db.sqlite
  - ARK_SERVER_URL=http://ark:7070
  - JWT_SECRET=dev_super_secret_change_me
  - ARBITRATOR_PUB_KEY=61d8b7526b6d5a46a57a01fcab370acaad1bff309da342bf4acc9077db6b4ac2
```

---

## API Overview

### Swagger Documentation
Available at `http://localhost:3002/api/v1/docs`

**Features**:
- Interactive API testing
- JWT authentication support (Bearer token)
- Alphabetically sorted tags and operations
- Persistent authorization across page reloads

### Authentication Endpoints

**POST /api/v1/auth/signup/challenge**
- Request challenge for new user
- Input: `{ publicKey: "<x-only hex>" }`
- Output: `{ challengeId, hashToSignHex }`

**POST /api/v1/auth/signup/verify**
- Verify signature and get JWT
- Input: `{ publicKey, signature, challengeId }`
- Output: `{ accessToken, userId, publicKey }`

### Escrow Request Endpoints

**POST /api/v1/escrows/requests** (Protected)
- Create escrow request
- Input: `{ side: "sender"|"receiver", amount, description, public }`
- Output: Request details

**GET /api/v1/escrows/requests** (Protected)
- List escrow requests (orderbook)
- Query: `?cursor=<id>&limit=<n>&side=<sender|receiver>`

**POST /api/v1/escrows/requests/:id/accept** (Protected)
- Accept escrow request, creating contract
- Output: Contract details with Ark address

### Escrow Contract Endpoints

**GET /api/v1/escrows/contracts** (Protected)
- List user's contracts
- Query: `?cursor=<id>&limit=<n>`

**GET /api/v1/escrows/contracts/:id** (Protected)
- Get contract details

**POST /api/v1/escrows/contracts/:id/execute** (Protected)
- Create execution transaction (happy path)
- Input: `{ path: "direct"|"release"|"refund" }`

**POST /api/v1/escrows/contracts/:id/sign-execution** (Protected)
- Sign execution transaction
- Input: `{ executionId, signature }`

**POST /api/v1/escrows/contracts/:id/dispute** (Protected)
- Open dispute for arbitration

### Admin Endpoints

**GET /api/v1/admin/escrows/contracts** (Admin)
- List all contracts

**POST /api/v1/admin/escrows/contracts/:id/arbitrate** (Admin)
- Arbitrate dispute
- Input: `{ decision: "release"|"refund", reason }`

---

## Architecture Overview

### NestJS Modules

```
AppModule
├── AuthModule         # Authentication & JWT
├── UsersModule        # User management
├── EscrowsModule      # Escrow requests & contracts
│   ├── RequestsController
│   ├── ContractsController
│   └── ArbitrationController
├── AdminModule        # Admin operations
├── ArkModule          # Ark SDK integration
│   ├── ArkService
│   └── FundingWatcherService
└── HealthModule       # Health checks
```

### Technology Stack

**Backend Framework**:
- NestJS 11.1.6 (opinionated Node.js framework with DI)
- TypeScript 5.9.2
- Node.js 24 (latest stable)

**Arkade Integration**:
- @arkade-os/sdk 0.3.1-alpha.3 (Ark protocol SDK)
- @noble/secp256k1 3.0.0 (Schnorr signatures)
- @noble/hashes 2.0.0 (SHA-256, HASH160)

**Database & ORM**:
- SQLite 5.1.7 (development/POC)
- TypeORM 0.3.26 (NestJS integration)
- Planned: PostgreSQL for production

**Authentication**:
- @nestjs/jwt 11.0.0 (JWT tokens)
- Schnorr signatures for challenge-response

**API Documentation**:
- @nestjs/swagger 11.2.0 (OpenAPI/Swagger UI)

**Code Quality**:
- Biome.js 2.2.4 (linting + formatting, replacing ESLint/Prettier)
- Jest 30.0.5 (testing)
- TypeScript strict mode

**Utilities**:
- class-validator 0.14.2 (DTO validation)
- class-transformer 0.5.1 (DTO transformation)
- nanoid 5.1.5 (unique IDs)
- bip68 1.0.4 (relative timelocks)

---

## Security Considerations

### Cryptographic Security
- Schnorr signatures (BIP340) for authentication
- secp256k1 curve for all public keys
- SHA-256 for challenge hashing
- JWT tokens with configurable expiry (7 days default)

### Escrow Security
- Multi-signature spending paths (2-of-3, 3-of-3)
- Timelock protection for unilateral paths
- Arbitrator public key configured server-side
- VTXOs managed by Ark protocol (off-chain security)

### API Security
- JWT bearer token authentication
- Input validation via class-validator
- CORS enabled for web client integration
- No password storage (signature-based auth)

### Known Limitations
- JWT invalidation on logout not yet implemented
- Development uses fixed arbitrator key (must change for production)
- SQLite for POC (consider PostgreSQL for production)

---

## Use Cases

### E-Commerce Escrow
- Buyer sends funds to escrow
- Seller ships product
- Upon delivery confirmation, funds released to seller
- Disputes handled by arbitrator

### P2P Trading
- Two parties create escrow for asset swap
- Both parties fund escrow
- Direct settlement when both satisfied
- Arbitration if disagreement

### Freelance Payments
- Client creates escrow for project
- Freelancer completes work
- Client approves, funds released
- Arbitrator resolves disputes

### Security Deposits
- Tenant funds escrow for rental deposit
- Upon lease end, refund or partial release
- Landlord/tenant disputes arbitrated

---

## Development Status

**Current State**: POC/Alpha

**Working Features**:
- Schnorr signature authentication
- Escrow request creation and acceptance
- Contract funding detection
- Virtual Escrow Contract (VEC) script generation
- Swagger API documentation

**Known Issues**:
- PSBT execution failing: `INVALID_PSBT_INPUT: missing taptree on input 0`
- Unilateral spending paths not yet fully implemented
- Web app not yet built (client/ directory exists but incomplete)

**TODO**:
- Fix PSBT taptree issue in execution flow
- Implement JWT invalidation on logout
- Build companion web application
- Add PostgreSQL support for production
- Implement periodic funding checks
- Add webhook notifications

---

## Integration Points

### Arkd Server
- **Connection**: HTTP/gRPC to `ARK_SERVER_URL`
- **SDK**: @arkade-os/sdk for wallet operations
- **Operations**: Create VEC addresses, monitor funding, submit executions
- **Requirements**: arkd running with Ark protocol enabled

### Database
- **SQLite**: Default for development and POC
- **TypeORM**: ORM with entity definitions and migrations
- **Schema**: Users, EscrowRequests, EscrowContracts, ContractExecutions, ContractArbitrations

### External Dependencies
- **Nigiri**: Bitcoin regtest environment with Ark support
- **Noble libraries**: Cryptographic primitives (secp256k1, hashes)

---

## Testing Strategy

### Unit Tests
- Service logic tests (ArkService, AuthService, etc.)
- Guard tests (AuthGuard)
- Isolated component testing

### E2E Tests
- `auth.e2e-spec.ts`: Authentication flow (signup)
- `escrow-journey-to-execution.e2e-spec.ts`: Full escrow lifecycle

**E2E Test Environment**:
- Requires arkd running at `localhost:7070`
- Uses Nigiri for Bitcoin regtest
- Creates test wallets with @arkade-os/sdk
- Tests funding, execution, and arbitration flows

### Test Helpers
- `signupAndGetJwt()`: Authenticate test users
- `createTestArkWallet()`: Generate test Ark wallets
- `faucetOffchain()`: Fund test wallets via arkd

---

## Deployment Patterns

### Local Development
```bash
npm install
npm run api:dev
# Access at http://localhost:3002
```

### Docker Development
```yaml
docker compose --profile dev up api-dev
# Requires external Nigiri network
```

### Production (Planned)
```yaml
services:
  api:
    image: arkade-escrow:latest
    environment:
      - NODE_ENV=production
      - ARK_SERVER_URL=https://mainnet.arkade.sh
      - JWT_SECRET=<secure_secret>
      - ARBITRATOR_PUB_KEY=<production_arbitrator>
    volumes:
      - sqlite-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 30s
```

---

## Monitoring and Health

### Health Check Endpoint
**GET /health**
- Returns `{ status: "ok" }` if service healthy
- Used by Docker healthcheck

### Logging
- NestJS built-in logger
- Request logging middleware
- HTTP exception filter

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
