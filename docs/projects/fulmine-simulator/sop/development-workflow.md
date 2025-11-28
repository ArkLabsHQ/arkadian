# Fulmine Simulator — Development Workflow

## Prerequisites

### Required Tools
- **Go**: 1.24.6 or higher
- **Git**: For version control
- **Docker**: For running test environments
- **Make**: For build automation
- **Code Editor**: VS Code, GoLand, or similar

### Recommended Tools
- **yamllint**: For validating YAML configs
- **jq**: For analyzing audit logs
- **grpcurl**: For testing gRPC connections

### Environment Setup
```bash
# Install Go (if not already installed)
# macOS
brew install go

# Linux
wget https://go.dev/dl/go1.24.6.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.6.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Verify installation
go version

# Install yamllint
pip install yamllint

# Install jq
brew install jq  # macOS
sudo apt install jq  # Linux

# Install grpcurl
brew install grpcurl  # macOS
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest  # any OS
```

## Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/ark-network/fulmine-simulator
cd fulmine-simulator
```

### 2. Install Dependencies
```bash
go mod download
go mod tidy
```

### 3. Build Binaries
```bash
# Build all binaries
make build

# Or build locally for faster iteration
make build-local
```

### 4. Start Development Environment
```bash
# Start Nigiri (Bitcoin regtest + faucet)
docker run -d --name nigiri -p 3000:3000 vulpemventures/nigiri

# Start Fulmine (wallet daemon)
docker run -d --name fulmine -p 7000:7000 -p 7001:7001 ghcr.io/arklabshq/fulmine:latest
```

## Making Changes

### Code Organization
```
fulmine-simulator/
├── cmd/
│   ├── orchestrator/    # Main entry point for orchestrator
│   └── client/          # Main entry point for client
├── orchestrator/        # Orchestrator core logic
│   ├── config/          # Configuration parsing
│   ├── fund/            # Fund management
│   ├── process/         # Process spawning
│   ├── audit/           # Audit logging
│   └── network/         # Network-specific logic
├── fulmine-client/      # Fulmine gRPC client wrapper
├── lnd-client/          # LND Docker wrapper
├── arkade-client/       # Arkade client wrapper
└── configs/             # Example configurations
```

### Coding Standards

#### Go Style Guide
- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Use `go vet` for static analysis
- Use meaningful variable names
- Add comments for exported functions

#### Example
```go
// DistributeFunds distributes initial funding to all clients from the faucet.
// Returns an error if any distribution fails.
func DistributeFunds(clients []Client, faucetURL string) error {
    for _, client := range clients {
        if err := sendToClient(client, faucetURL); err != nil {
            return fmt.Errorf("failed to fund %s: %w", client.ID, err)
        }
    }
    return nil
}
```

### Running Linters
```bash
# Format code
make lint

# Or manually
go fmt ./...
go vet ./...
```

## Testing Your Changes

### Run Unit Tests
```bash
# Run all tests
make test

# Run specific package tests
go test -v ./orchestrator/config/...

# Run with coverage
make coverage
```

### Run Integration Tests
```bash
# Ensure Nigiri and Fulmine are running
docker ps | grep -E "nigiri|fulmine"

# Run integration tests
make integrationtest
```

### Manual Testing
```bash
# Build locally
make build-local

# Run with test config
make run ARGS="--config configs/regtest-2-clients.yaml"

# Or run directly
./bin/orchestrator --config configs/regtest-2-clients.yaml

# Watch audit log in real-time
tail -f audit_logs/simulation_*.jsonl | jq
```

## Git Workflow

### Branch Naming
- Feature: `feat/description` (e.g., `feat/swap-execution`)
- Bugfix: `fix/description` (e.g., `fix/fund-recovery`)
- Documentation: `docs/description` (e.g., `docs/update-readme`)
- Refactor: `refactor/description` (e.g., `refactor/config-parser`)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(orchestrator): add mainnet safety confirmation"
git commit -m "fix(fund): handle partial recovery correctly"
git commit -m "docs: update installation instructions"
git commit -m "test(integration): add multi-client test"
git commit -m "refactor(config): simplify YAML parsing"
```

### Creating a Feature Branch
```bash
# Create and switch to feature branch
git checkout -b feat/my-feature

# Make changes
# ... edit files ...

# Stage changes
git add .

# Commit with conventional message
git commit -m "feat(component): add new feature"

# Push to remote
git push origin feat/my-feature
```

## Pull Request Process

### Before Submitting PR

#### 1. Run Quality Checks
```bash
# Format code
make lint

# Run tests
make test

# Check coverage
make coverage

# Run integration tests (if applicable)
make integrationtest
```

#### 2. Update Documentation
- Update README.md if user-facing changes
- Update relevant docs in `docs/` directory
- Add/update examples in `configs/` if needed
- Update this workflow if development process changed

#### 3. Clean Up Commits
```bash
# Squash commits if necessary
git rebase -i HEAD~N  # where N is number of commits

# Force push (if needed)
git push origin feat/my-feature --force
```

### PR Checklist
- [ ] Code follows Go style guidelines
- [ ] Tests added for new functionality
- [ ] All tests passing locally
- [ ] Documentation updated
- [ ] Commit messages follow Conventional Commits
- [ ] Branch rebased on latest main/master
- [ ] No merge conflicts
- [ ] Audit log format preserved (if changes affect logging)

### PR Title Format
```
<type>(<scope>): <subject>

Examples:
feat(orchestrator): add Mutinynet support
fix(fund): improve recovery verification
docs: add troubleshooting guide
```

### PR Description Template
```markdown
## Description
Brief description of changes.

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Conventional commits followed
```

## Review Process

### As Author
1. Respond to review comments promptly
2. Push fixes to same branch
3. Resolve conversations when addressed
4. Request re-review when ready

### As Reviewer
1. Check code quality and style
2. Verify tests cover changes
3. Test locally if possible
4. Approve or request changes

## Release Process

### Version Numbering
Follow [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes (e.g., `2.0.0`)
- **Minor**: New features, backward compatible (e.g., `1.1.0`)
- **Patch**: Bug fixes, backward compatible (e.g., `1.0.1`)

### Creating a Release
```bash
# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"

# Push tag
git push origin v1.0.0

# GitHub Actions will build and publish release artifacts
```

## Common Development Tasks

### Adding a New Configuration Field
1. Update `orchestrator/config/config.go` struct
2. Update YAML parsing logic
3. Update validation logic
4. Add test cases in `orchestrator/config/config_test.go`
5. Update example configs in `configs/`
6. Update documentation

### Adding a New Action Type
1. Add action type to `orchestrator/types.go`
2. Implement action handler in `client/actions.go`
3. Update config parser to accept new action
4. Add test cases
5. Add example in `configs/`
6. Document in README and usage guide

### Adding a New Network
1. Add network constant in `orchestrator/network/network.go`
2. Implement network-specific configuration
3. Add validation logic
4. Update config parser
5. Add test cases
6. Update documentation

## Cleanup

### After Development Session
```bash
# Stop Docker containers
docker stop nigiri fulmine

# Clean up processes
make clean-processes

# Remove build artifacts (optional)
make clean

# Remove Docker containers (optional)
docker rm nigiri fulmine
```

### Before Committing
```bash
# Remove debug/temporary files
rm -rf audit_logs/
rm -rf reports/
rm -f *.log

# Ensure .gitignore covers generated files
cat .gitignore
```

## Getting Help

### Documentation
- README.md for user-facing documentation
- `docs/` directory for developer documentation
- Code comments for implementation details

### Communication
- GitHub Issues for bugs and feature requests
- GitHub Discussions for questions
- Pull Requests for code review

### Debugging
```bash
# Enable debug logging
export FULMINE_LOG_LEVEL=debug

# Use delve debugger
dlv debug ./cmd/orchestrator -- --config configs/regtest-2-clients.yaml

# Add temporary logging
import "log"
log.Printf("Debug: %+v", variable)
```
