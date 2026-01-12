# Arkade Assets — Development Workflow

## Purpose
This SOP defines the development workflow for contributing to the Arkade Assets specification and reference implementation.

## Prerequisites
- Node.js 18+ and npm
- Git
- TypeScript knowledge
- Understanding of Arkade Assets protocol (read `system/project_overview.md` first)

## Development Setup

### 1. Clone and Install
```bash
git clone https://github.com/ArkLabsHQ/arkade-assets.git
cd arkade-assets
npm install
```

### 2. Verify Build
```bash
npm run build
npm test
```

All tests should pass before making changes.

## Making Changes

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Code Changes
Edit files in `tools/` directory:
- `arkade-assets-codec.ts` - Codec implementation
- `cli.ts` - CLI commands
- `indexer.ts` - Indexer logic
- `make-opreturn.ts` - Transaction builder
- `example-txs.ts` - Example transactions
- `node-storage.ts` - Storage abstraction

### 3. Build and Test
```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run specific tests
node dist/arkade-assets-codec.test.js
```

### 4. Add Tests for New Features
Edit `tools/arkade-assets-codec.test.ts` to add test cases:

```typescript
function testNewFeature() {
  console.log('Testing new feature...');

  const packet = {
    // Define test packet
  };

  const encoded = encodePacket(packet);
  const decoded = decodePacket(encoded);

  // Validate
  assert.deepEqual(packet, decoded);

  console.log('✓ New feature test passed');
}

// Add to test suite
testNewFeature();
```

### 5. Update Documentation
If changes affect protocol or usage:

**Protocol Changes**:
- Update `arkade-assets.md` - Core specification
- Update `arkade-script.md` - Opcodes (if applicable)
- Update `examples.md` - Add/modify examples

**Code Changes**:
- Update `README.md` - High-level changes
- Update `tools/*.ts` - Inline code comments
- Update Arkadian docs - `testing/usage.md`, `testing/how_to_run.md`

### 6. Lint and Format
```bash
# Check TypeScript types
npx tsc --noEmit

# Format code (if prettier is configured)
npx prettier --write tools/*.ts
```

## Testing Workflow

### Run All Tests
```bash
npm test
```

### Test Specific Functionality
```bash
# Build first
npm run build

# Run specific test file
node dist/arkade-assets-codec.test.js

# Test CLI commands
npm run cli -- indexer init
npm run cli -- make-tx --example=A
```

### Manual Integration Testing
```bash
# Generate example transactions
for ex in A B C E F G H I J K L; do
  echo "Testing example $ex..."
  npm run make-tx -- --example=$ex
done

# Test indexer
npm run indexer:init
npm run indexer:apply
```

## Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <short summary>

<detailed description>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Test changes
- `refactor` - Code refactoring
- `chore` - Build/tooling changes

**Examples**:
```
feat(codec): add support for metadata inline encoding

Implement inline metadata encoding for small metadata payloads
to reduce transaction size. Automatically selects inline vs hash
based on size threshold.

Closes #123
```

```
fix(indexer): validate teleport confirmation depth

Add validation to ensure teleport inputs reference source
transactions with sufficient confirmations to prevent
reorg attacks.

Fixes #456
```

### Commit Best Practices
- One logical change per commit
- Write clear, descriptive commit messages
- Reference issue numbers in commit messages
- Keep commits small and focused

## Pull Request Process

### 1. Push Branch
```bash
git push origin feature/your-feature-name
```

### 2. Create Pull Request
- Navigate to GitHub repository
- Click "New Pull Request"
- Select your branch
- Fill out PR template:
  - Summary of changes
  - Testing performed
  - Related issues
  - Breaking changes (if any)

### 3. PR Checklist
- [ ] All tests pass (`npm test`)
- [ ] Code builds without errors (`npm run build`)
- [ ] New features have tests
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No merge conflicts
- [ ] Follows coding style

### 4. Address Review Comments
- Respond to reviewer feedback
- Make requested changes
- Push updates to same branch
- Re-request review when ready

### 5. Merge
Once approved:
- Ensure CI passes
- Squash commits if requested
- Merge to master branch

## Specification Updates

### Updating Protocol Specification
If changes affect the protocol:

**1. Update `arkade-assets.md`**:
- Modify relevant sections
- Add examples if needed
- Update version notes

**2. Update `examples.md`**:
- Add new example transactions
- Update existing examples
- Include diagrams if helpful

**3. Update `arkade-script.md`**:
- Add new opcodes (if applicable)
- Update opcode descriptions
- Add contract examples

**4. Rebuild Documentation**:
```bash
bash build-docs.sh
```

### Versioning
- Specification version in `arkade-assets.md` header
- Increment version for breaking changes
- Document changes in version notes

## Release Process

### 1. Version Bump
Update `package.json`:
```json
{
  "version": "1.1.0"
}
```

### 2. Update Changelog
Document changes in `CHANGELOG.md` (if exists) or in PR description.

### 3. Tag Release
```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### 4. Create GitHub Release
- Navigate to Releases on GitHub
- Create new release from tag
- Document changes and features
- Attach built artifacts if applicable

## Troubleshooting Development Issues

### Build Fails
```bash
rm -rf dist/ node_modules/
npm install
npm run build
```

### Tests Fail
```bash
# Run with verbose output
npm test 2>&1 | tee test.log

# Check specific test
node dist/arkade-assets-codec.test.js
```

### Type Errors
```bash
npx tsc --noEmit
```

### Git Conflicts
```bash
# Update from master
git fetch origin
git rebase origin/master

# Resolve conflicts
# ... edit files ...
git add <resolved-files>
git rebase --continue
```

## Code Style Guidelines

### TypeScript Style
- Use TypeScript types (avoid `any`)
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Document public APIs with JSDoc

**Example**:
```typescript
/**
 * Encodes an Arkade Asset packet to binary TLV format.
 *
 * @param packet - The packet to encode
 * @returns Binary encoded packet
 */
export function encodePacket(packet: Packet): Uint8Array {
  // Implementation
}
```

### File Organization
- One main export per file
- Group related functions
- Keep files focused and cohesive
- Use descriptive file names

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for types and interfaces
- `UPPER_CASE` for constants
- Descriptive names over abbreviations

## Best Practices

### Testing
- Test edge cases (zero amounts, empty arrays, null values)
- Test round-trip encoding/decoding
- Test validation rules (balance, control assets, teleports)
- Add regression tests for bugs

### Documentation
- Document complex algorithms
- Explain protocol rules in comments
- Keep README.md up to date
- Cross-reference specification documents

### Performance
- Avoid unnecessary allocations
- Use efficient data structures
- Profile performance-critical code
- Benchmark changes

### Security
- Validate all inputs
- Check buffer bounds
- Handle errors gracefully
- Avoid timing attacks in crypto code

## Getting Help

### Resources
- `arkade-assets.md` - Core protocol specification
- `examples.md` - Working examples
- `system/architecture.md` - Architecture guide
- `testing/troubleshooting.md` - Common issues

### Communication
- Open GitHub issue for bugs
- Discuss major changes in issue before implementing
- Ask questions in PR comments
- Reference related issues and PRs
