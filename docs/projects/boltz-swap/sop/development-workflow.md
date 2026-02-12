# Arkade Boltz Swap — Development Workflow

## Purpose
This SOP defines the standard development workflow for contributing to the boltz-swap library.

---

## Prerequisites

- Node.js 22+
- pnpm 10.25.0
- Docker and Docker Compose
- Git
- GitHub account with repository access

---

## Development Setup

### 1. Clone and Install
```bash
git clone git@github.com:arkade-os/boltz-swap.git
cd boltz-swap
pnpm install
```

### 2. Verify Setup
```bash
# Build the library
pnpm build

# Run unit tests
pnpm test:unit

# Start regtest environment
pnpm regtest

# Run integration tests
pnpm test:integration
```

---

## Feature Development Workflow

### 1. Create Feature Branch
```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/your-feature-name
```

### 2. Make Changes
- Edit source code in `src/`
- Add/update tests in `test/`
- Update documentation if needed

### 3. Run Tests
```bash
# Run unit tests during development
pnpm test:unit --watch

# Run all tests before commit
pnpm test

# Check formatting
pnpm lint
```

### 4. Format Code
```bash
# Auto-fix formatting issues
pnpm format
```

### 5. Commit Changes
```bash
git add .
git commit -m "feat: add your feature description"
```

**Commit Message Format**:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `test:` — Test changes
- `refactor:` — Code refactoring
- `chore:` — Build/tooling changes

### 6. Push and Create PR
```bash
git push origin feat/your-feature-name
```

Create pull request on GitHub with:
- Clear description of changes
- Link to related issues
- Test results

---

## Pull Request Checklist

Before submitting PR:

- [ ] All tests pass (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] New features have tests
- [ ] Documentation updated if needed
- [ ] No TypeScript errors (`pnpm build`)
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

---

## Code Review Process

### Reviewer Checklist
- Code follows TypeScript best practices
- Tests cover new functionality
- Error handling is comprehensive
- Documentation is clear and accurate
- No breaking changes without justification
- Performance impact is acceptable

### Approval and Merge
- Require at least 1 approval
- CI checks must pass
- Squash and merge to main
- Delete branch after merge

---

## Testing Guidelines

### Unit Tests
- Test pure functions and business logic
- Mock external dependencies
- Use descriptive test names
- Cover edge cases and error paths

### Integration Tests
- Test real API interactions
- Verify end-to-end workflows
- Use regtest environment
- Clean up resources after tests

### Test Example
```typescript
describe('ArkadeLightning', () => {
  describe('createLightningInvoice', () => {
    it('should create valid Lightning invoice', async () => {
      // Arrange
      const lightning = new ArkadeLightning({ wallet, swapProvider });

      // Act
      const result = await lightning.createLightningInvoice({ amount: 50000 });

      // Assert
      expect(result.invoice).toMatch(/^lnbc/);
      expect(result.amount).toBe(50000);
      expect(result.pendingSwap).toBeDefined();
    });

    it('should throw on invalid amount', async () => {
      // Arrange
      const lightning = new ArkadeLightning({ wallet, swapProvider });

      // Act & Assert
      await expect(
        lightning.createLightningInvoice({ amount: -100 })
      ).rejects.toThrow('Invalid amount');
    });
  });
});
```

---

## Release Process

### 1. Version Bump
```bash
# Update version in package.json
# Commit version change
git commit -m "chore: bump version to 0.2.17"
```

### 2. Build and Test
```bash
pnpm build
pnpm test
```

### 3. Dry Run Release
```bash
pnpm release:dry-run
```

### 4. Publish Release
```bash
pnpm release
```

### 5. Create GitHub Release
- Tag: `v0.2.17`
- Title: `v0.2.17`
- Description: Changelog summary

---

## Code Style Guidelines

### TypeScript
- Use strict TypeScript settings
- Avoid `any` types
- Prefer interfaces over types for extensibility
- Use async/await over promises

### Naming Conventions
- Classes: `PascalCase` (e.g., `ArkadeLightning`)
- Functions: `camelCase` (e.g., `createLightningInvoice`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- Private fields: `_camelCase` (e.g., `_swapManager`)

### Error Handling
- Use custom error classes
- Provide descriptive error messages
- Include context in errors
- Handle all error paths

### Example
```typescript
if (!invoice) {
  throw new SwapError('Invoice is required', { isRefundable: false });
}

try {
  await swapProvider.createSwap(params);
} catch (error) {
  if (error instanceof NetworkError) {
    throw new SwapError('Failed to create swap due to network error', {
      isRefundable: true,
      pendingSwap,
    });
  }
  throw error;
}
```

---

## Documentation Updates

When changing functionality:

1. Update README.md if public API changes
2. Update JSDoc comments in source
3. Update relevant docs in `docs/projects/boltz-swap/`
4. Add examples for new features

---

## Common Tasks

### Add New Swap Type
1. Update `types.ts` with new swap type
2. Implement in `BoltzSwapProvider`
3. Add orchestration logic to `ArkadeLightning`
4. Update `SwapManager` if monitoring needed
5. Add tests
6. Update documentation

### Add New Error Type
1. Add error class to `errors.ts`
2. Extend from `SwapError` base
3. Use in appropriate locations
4. Add test coverage
5. Document in `troubleshooting.md`

### Update Dependencies
```bash
# Check for updates
pnpm outdated

# Update specific package
pnpm update @arkade-os/sdk

# Update all packages
pnpm update

# Test after updates
pnpm test
```

---

## Debugging

### Local Development
```bash
# Run tests with debug output
DEBUG=boltz-swap:* pnpm test

# Run specific test with verbose logging
pnpm test test/swap-manager.test.ts --reporter=verbose
```

### Regtest Debugging
```bash
# View service logs
docker compose -f test.docker-compose.yml logs -f arkd
docker compose -f test.docker-compose.yml logs -f boltz-backend

# Access services directly
curl http://localhost:7070/v1/info
curl http://localhost:9001/v1/info
```

---

## Notes

- Always run full test suite before PR
- Keep commits atomic and focused
- Update documentation alongside code
- Ask for review when unsure
- Tag maintainers for time-sensitive PRs
