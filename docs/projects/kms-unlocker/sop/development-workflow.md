# Development Workflow

## Setting Up Development Environment

### Install Prerequisites

1. Install Go 1.21 or higher
2. Install Docker and Docker Compose
3. Install Nigiri Bitcoin regtest environment
4. For AWS mode: Configure AWS credentials

### Clone Repository

```bash
git clone <repository-url>
cd kms-unlocker
```

### Start Nigiri

Start Bitcoin regtest environment:

```bash
nigiri start
```

This provides the Bitcoin backend required for arkd to function.

## Development Modes

### Active Coding Mode

When actively developing and making code changes:

```bash
# Start all services except kms-unlocker
make dev-local    # For local file-based backup
# OR
make dev-aws      # For AWS/LocalStack backup

# In another terminal, run kms-unlocker locally
make run
```

This allows you to restart kms-unlocker quickly after code changes without restarting the entire stack.

### Full Docker Mode

For testing the complete dockerized environment:

**Local Mode (file-based backup):**
```bash
# Start all services
make run-local

# Stop all services
make stop-local
```

**AWS Mode (LocalStack simulation):**
```bash
# Start all services with LocalStack
make run-aws

# Stop all services
make stop-aws
```

## Making Changes

### Edit Code

Make your changes in the codebase. Key areas:
- `internal/core/application/` - Business logic
- `internal/infrastructure/` - Infrastructure adapters
- `internal/config/` - Configuration and dependency injection

### Run Unit Tests

```bash
make test
```

Unit tests exclude e2e tests and run quickly without Docker dependencies.

### Run Integration Tests

```bash
# All integration tests (local + AWS)
make integrationtest

# Only local environment tests
make integrationtest-local

# Only AWS tests (with LocalStack)
make integrationtest-aws
```

Integration tests require Docker to be running.

## Testing Changes

### Local Mode Testing

Test with file-based backup:

```bash
make run-local

# Check logs
docker logs kms-unlocker

# Test reconnection
make stop-local SERVICE=arkd
make run-local SERVICE=arkd

make stop-local
```

### AWS Mode Testing with LocalStack

Test with AWS Secrets Manager simulation:

```bash
make run-aws

# Check logs
docker logs kms-unlocker

# Verify secrets were created
make secrets

# Test reconnection
make stop-aws SERVICE=kms-unlocker
make run-aws SERVICE=kms-unlocker

make stop-aws
```

## Code Quality

### Linting

```bash
make lint
```

Runs golangci-lint to check code style and potential issues.

### Vet

```bash
make vet
```

Runs go vet to identify suspicious constructs.

### Coverage

```bash
make cov
```

Generates a coverage report and opens it in your browser.

## Protocol Buffer Changes

### Edit Proto Files

Make changes to `.proto` files in `api-spec/protobuf/`.

### Generate Code

```bash
make proto
```

This compiles protobuf files using Docker and generates Go code in `api-spec/protobuf/gen/`.

Note: Never edit generated files directly - always edit source `.proto` files.

## Building

### Build for All Platforms

```bash
make build
```

Builds binaries for:
- Linux AMD64
- Linux ARM64
- macOS AMD64
- macOS ARM64

Binaries are placed in `build/` directory.

## PR Preparation

Before submitting a pull request:

1. Run all tests:
```bash
make test
make integrationtest
```

2. Check code coverage:
```bash
make cov
```

3. Lint code:
```bash
make lint
make vet
```

4. Ensure builds succeed:
```bash
make build
```

5. Test in both modes:
```bash
make run-local
# Verify functionality
make stop-local

make run-aws
# Verify functionality
make stop-aws
```
