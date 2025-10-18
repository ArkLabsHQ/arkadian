# Development Workflow

## Setting Up Development Environment

### Prerequisites

1. **Install Go 1.21 or later**
   ```bash
   go version  # Verify installation
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/ArkLabsHQ/ark-faucet.git
   cd ark-faucet
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

- `cmd/main.go` - HTTP server, routing, handlers
- `pkg/service.go` - Core service logic, ARK SDK integration

### Development Workflow

1. **Edit source files**
   ```bash
   # Edit service logic
   vim pkg/service.go

   # Edit HTTP handlers
   vim cmd/main.go
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

### Build Docker Image

```bash
make docker-build
```

### Run in Docker

```bash
make docker-run
```

This starts the service:
- Connected to Nigiri network
- Port 9999 exposed
- Volume-mounted data directory
- Shares volumes with arkd container

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

### Setup Test Environment

1. **Start local arkd server**

   Option A: Using Nigiri (recommended)
   ```bash
   nigiri start
   cd /path/to/arkd
   make run
   ```

   Option B: Standalone arkd
   ```bash
   cd /path/to/arkd
   make run-light
   ```

2. **Configure faucet to connect**
   ```bash
   export ARK_FAUCET_SERVER_URL=http://localhost:7070
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
