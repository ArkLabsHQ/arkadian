# Development Workflow

## Setting Up Development Environment

### Prerequisites

1. **Install Go 1.21 or later**
   ```bash
   go version  # Verify installation
   ```

2. **Clone the repository (with submodules)**
   ```bash
   git clone --recurse-submodules https://github.com/ArkLabsHQ/ark-faucet.git
   cd ark-faucet
   # arkade-regtest is vendored at regtest/; if you skipped --recurse-submodules:
   git submodule update --init
   ```

3. **Install dependencies**
   ```bash
   make tidy
   ```

## Running Locally

### Basic Local Run

1. **Set required environment variable**
   ```bash
   export ARK_FAUCET_PASSWORD=admin
   ```

2. **Start the service**
   ```bash
   make run
   ```

3. **Verify service is running**
   ```bash
   curl http://localhost:9999/address
   ```

The service starts on port 9999 by default.

### Configuration Options

Set these environment variables before running:

```bash
export ARK_FAUCET_PASSWORD=admin                    # Required
export ARK_FAUCET_SERVER_URL=http://localhost:7070  # Optional
export ARK_FAUCET_PORT=9999                         # Optional
export ARK_FAUCET_DATADIR=~/.arkfaucet              # Optional
export ARK_FAUCET_AUTH_USER=admin                   # Optional
export ARK_FAUCET_AUTH_PASS=admin                   # Optional
```

## Making Changes

### Code Structure

- `cmd/main.go` - Entry point: config loading, wiring, server lifecycle
- `pkg/handler.go` - HTTP router (`NewHandler`), middleware (CORS, basic auth, recovery), request handlers
- `pkg/service.go` - Core service logic, ARK SDK integration, note minting/refill
- `pkg/handler_test.go`, `pkg/service_test.go` - Unit tests
- `e2e/faucet_e2e_test.go` - End-to-end tests (build tag `e2e`) against arkade-regtest
- `regtest/` - arkade-regtest git submodule (local Ark backend)

### Development Workflow

1. **Edit source files**
   ```bash
   # Edit service logic
   vim pkg/service.go

   # Edit HTTP handlers / routing
   vim pkg/handler.go
   ```

2. **Run static analysis**
   ```bash
   make vet
   ```

3. **Test manually with curl**
   ```bash
   # Test public endpoint
   curl -X POST http://localhost:9999/faucet \
     -H "Content-Type: application/json" \
     -d '{"address": "test-address", "amount": 1000}'

   # Test protected endpoint
   curl -u admin:admin http://localhost:9999/balance
   ```

## Building

### Build Binary

```bash
make build
```

Output: `bin/arkfaucet`

### Run Built Binary

```bash
export ARK_FAUCET_PASSWORD=admin
./bin/arkfaucet
```

## Docker Workflow

> The Makefile no longer ships `make docker-build` / `make docker-run`. A multi-arch image is built and pushed to `ghcr.io/arklabshq/ark-faucet` by CI (`.github/workflows/docker.yml`).

### Build Docker Image

```bash
docker build -t arkfaucet .
```

### Manual Docker Run

```bash
docker run -d \
  --name arkfaucet \
  -p 9999:9999 \
  -e ARK_FAUCET_PASSWORD=admin \
  -e ARK_FAUCET_SERVER_URL=http://localhost:7070 \
  -v ./data:/app/faucetdata \
  arkfaucet
```

### Verify Docker Container

```bash
# Check logs
docker logs arkfaucet

# Test endpoint
curl http://localhost:9999/address
```

## Testing Changes

### Unit Tests

```bash
go test ./pkg/...
```

### End-to-End Tests (arkade-regtest)

```bash
# Boots the ark stack, runs the e2e suite, then always cleans up
make e2e
```

`make e2e` brings up arkade-regtest (`make regtest-up`), runs `go test -tags e2e ./e2e/...`
(exercising address/refill/faucet/balance), then runs `make regtest-down` while
preserving the test exit code. This mirrors the PR CI job in `.github/workflows/ci.yml`.

### Setup Test Environment (manual)

1. **Start a local Ark backend**

   Option A: arkade-regtest (recommended, vendored as a submodule)
   ```bash
   make regtest-up   # arkd :7070, admin :7071
   ```

   Option B: Your own standalone arkd
   ```bash
   cd /path/to/arkd
   make run
   ```

2. **Configure faucet to connect**
   ```bash
   export ARK_FAUCET_SERVER_URL=http://localhost:7070
   export ARK_FAUCET_SERVER_ADMIN_URL=http://localhost:7071
   export ARK_FAUCET_PASSWORD=admin
   ```

### Test All Endpoints

```bash
# 1. Get service addresses
curl http://localhost:9999/address

# 2. Check balance
curl -u admin:admin http://localhost:9999/balance

# 3. Send to offchain address
curl -X POST http://localhost:9999/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "ark1...", "amount": 1000}'

# 4. Refill balance (requires arkd admin access)
curl -u admin:admin -X POST "http://localhost:9999/refill?amount=10000"

# 5. Redeem notes
curl -u admin:admin -X POST http://localhost:9999/refill-with-notes \
  -H "Content-Type: application/json" \
  -d '{"notes": ["note1", "note2"]}'
```

### Verify Balance Operations

1. Check initial balance
2. Send coins via /faucet
3. Verify balance decreased
4. Refill balance
5. Verify balance increased

## Code Quality

### Run Static Analysis

```bash
make vet
```

### Go Conventions

- Follow standard Go formatting (gofmt)
- Use meaningful variable names
- Add comments for exported functions
- Handle errors explicitly
- Use context for cancellation

### Pre-commit Checklist

- [ ] Code runs without errors
- [ ] `make vet` passes
- [ ] All endpoints tested manually
- [ ] No hardcoded credentials
- [ ] Error handling in place

## Release Process

1. **Update version** (if applicable)
2. **Build for all platforms** (if cross-compilation configured)
3. **Tag release**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
4. **Build Docker image with version tag**
   ```bash
   docker build -t arkfaucet:v1.0.0 .
   docker tag arkfaucet:v1.0.0 arkfaucet:latest
   ```
