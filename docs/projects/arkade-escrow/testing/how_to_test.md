# Arkade Escrow - Testing Guide

## Test Commands

```bash
npm run test              # Run unit tests (alias for test:api:unit)
npm run test:api:unit     # Jest unit tests for server/src/**/*.spec.ts
npm run test:api:acceptance  # Jest E2E tests for server/test/*.e2e-spec.ts
```

## Unit Tests

Unit tests use Jest and are co-located with source files as `*.spec.ts`.

**Existing unit test files:**
- `server/src/ark/ark.service.spec.ts` — ArkService logic (VEC script, spending paths)
- `server/src/auth/auth.guard.spec.ts` — AuthGuard JWT validation
- `server/src/escrows/contracts/escrows-contracts.service.spec.ts` — Contract service logic

**Run specific test:**
```bash
npx jest server/src/ark/ark.service.spec.ts
```

**Test environment:**
- Uses in-memory SQLite (`:memory:`) when `NODE_ENV=test`
- No arkd connection needed for unit tests

## E2E / Acceptance Tests

Located in `server/test/`, these test full request-response cycles using Supertest.

**Test files:**
- `auth.e2e-spec.ts` — Authentication signup flow
- `escrow-contract-all-statuses.e2e-spec.ts` — Contract status transitions
- `escrow-journey-to-arbitration.e2e-spec.ts` — Full escrow lifecycle ending in arbitration
- `escrow-journey-to-execution.e2e-spec.ts` — Full escrow lifecycle ending in execution
- `escrow-requests.e2e-spec.ts` — Escrow request CRUD

**Prerequisites:**
- Nigiri running with `--ark` flag (`nigiri start --ark`)
- Environment variables set (see `server/test/jest.setup.js`)

**Required env vars for E2E:**
```bash
JWT_SECRET=<any string>
ARBITRATOR_PUB_KEY=86f5d11162ab25c88f4af9cc4224161a40a6e029a45beb8459f0f5f5a95f66d8
ARBITRATOR_PRIV_KEY=62325754772ad366d149517311d5fe5cbccb4746ef0285c393ff67f0ad62dd87
ARK_SERVER_URL=https://mutinynet.arkade.sh  # or http://localhost:7070 for local
```

**Test helpers (`server/test/utils.ts`):**
- Creates test NestJS app with in-memory database
- Provides `signupAndGetJwt()` for authenticating test users
- Provides wallet creation and funding utilities

**Run E2E tests:**
```bash
npm run test:api:acceptance
```

**Run specific E2E test:**
```bash
npx jest server/test/escrow-journey-to-execution.e2e-spec.ts
```

## CI Pipeline

The GitHub Actions CI (`.github/workflows/ci.yml`) runs:

1. **Code Quality Check** — `npm run ci:check` (Biome lint + format)
2. **Unit Tests** — `npm run test` (on push to master only)

Note: Acceptance tests are currently disabled in CI due to timeout issues.

## Code Quality

```bash
npm run lint          # Biome lint check
npm run typecheck     # TypeScript type checking (tsc --noEmit)
npm run fmt           # Biome format check
npm run ci:check      # All checks combined (used in CI)
npm run fmt:fix       # Auto-fix formatting
npm run lint:fix      # Auto-fix lint issues
```
