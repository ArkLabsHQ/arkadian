# Arkade Assets — How to Run

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (included with Node.js)
- **Git**: For cloning repository

Check versions:
```bash
node --version  # Should be 18.0.0+
npm --version   # Should be 8.0.0+
```

## Installation

### Clone Repository
```bash
git clone https://github.com/ArkLabsHQ/arkade-assets.git
cd arkade-assets
```

### Install Dependencies
```bash
npm install
```

Installs:
- `@noble/hashes@^1.4.0` - Cryptographic hashing
- `@noble/secp256k1@^3.0.0` - Elliptic curve cryptography
- `sodium-plus@^0.9.0` - Additional crypto primitives
- `typescript@^5.9.2` - TypeScript compiler
- `@types/node@^24.3.0` - Node.js type definitions

## Build

### Compile TypeScript
```bash
npm run build
```

Output:
- Compiles `tools/*.ts` to `dist/*.js`
- Type checks all TypeScript files
- Generates JavaScript for execution

Verify build:
```bash
ls dist/
# Should show: arkade-assets-codec.js, cli.js, indexer.js, etc.
```

## Run Tests

### Run All Tests
```bash
npm test
```

This command:
1. Builds TypeScript (`npm run build`)
2. Runs codec tests (`node dist/arkade-assets-codec.test.js`)

Expected output:
```
✓ Encode/decode Group
✓ Encode/decode Packet
✓ Example A: Fresh issuance with control
✓ Example B: Simple transfer
... (all examples A-L)
All tests passed!
```

## CLI Tools

### General CLI Usage
```bash
npm run cli -- <command> [options]
```

### Initialize Indexer
```bash
npm run indexer:init
```

Creates indexer state directory and initializes storage.

### Apply Block to Indexer
```bash
npm run indexer:apply
```

Processes block transactions and updates indexer state.

### Generate Example Transaction
```bash
# Generate specific example (A-L)
npm run make-tx -- --example=A

# Available examples:
# A - Fresh issuance with control
# B - Simple transfer
# C - Conditional transfer
# E - Metadata update
# F - Simple transfer (variant)
# G - Burn transaction
# H - Reissuance with control
# I - Multi-asset per UTXO
# J - Teleport commit
# K - Teleport claim
# L - Multi-asset per transaction
```

### Prove Ownership (BIP322)
```bash
npm run prove-ownership
```

Generates signed message proving asset ownership using BIP322 format.

## Build Documentation

### Concatenate Specification Documents
```bash
bash build-docs.sh
```

Combines all markdown documentation into a single file for easy reading:
- arkade-assets.md
- arkade-script.md
- examples.md
- ArkadeKitties.md

Output: Console display of concatenated content.

## Development Workflow

### 1. Make Code Changes
Edit files in `tools/` directory:
- `arkade-assets-codec.ts` - Codec implementation
- `cli.ts` - CLI commands
- `indexer.ts` - Indexer logic
- etc.

### 2. Rebuild
```bash
npm run build
```

### 3. Test Changes
```bash
npm test
```

### 4. Run Specific Tool
```bash
# Run CLI with changes
npm run cli -- <command>

# Run indexer
npm run indexer:init

# Generate transaction
npm run make-tx -- --example=A
```

## Environment Variables

### Storage Configuration
```bash
# Set custom storage directory (default: ./indexer-state)
export INDEXER_STORAGE_DIR=/path/to/storage

npm run indexer:init
```

### Debug Logging
```bash
# Enable verbose logging
export DEBUG=arkade:*

npm run cli -- <command>
```

## File Structure After Build

```
arkade-assets/
├── dist/                        # Compiled JavaScript
│   ├── arkade-assets-codec.js
│   ├── arkade-assets-codec.test.js
│   ├── cli.js
│   ├── indexer.js
│   ├── make-opreturn.js
│   ├── example-txs.js
│   └── node-storage.js
├── tools/                       # TypeScript source
│   ├── arkade-assets-codec.ts
│   ├── cli.ts
│   ├── indexer.ts
│   └── ...
├── indexer-state/              # Indexer data (created on init)
├── node_modules/               # Dependencies
├── package.json
├── tsconfig.json
├── build-docs.sh
├── README.md
├── arkade-assets.md            # Core specification
├── arkade-script.md            # Smart contract opcodes
├── examples.md                 # Transaction examples
└── ArkadeKitties.md            # NFT game example
```

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | Run all tests |
| `npm run cli -- <cmd>` | Run CLI tool |
| `npm run make-tx -- --example=<X>` | Generate example transaction |
| `npm run indexer:init` | Initialize indexer state |
| `npm run indexer:apply` | Apply block to indexer |
| `npm run prove-ownership` | Generate BIP322 ownership proof |
| `bash build-docs.sh` | Concatenate documentation |

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Test Failures
```bash
# Run with verbose output
npm test 2>&1 | tee test-log.txt

# Check TypeScript compilation
npx tsc --noEmit
```

### Module Not Found
```bash
# Ensure dependencies are installed
npm install

# Check Node.js version
node --version  # Must be 18+
```

### Permission Errors
```bash
# Fix permissions for build scripts
chmod +x build-docs.sh

# Run with proper permissions
npm run build
```

See `testing/troubleshooting.md` for detailed troubleshooting guide.

## Next Steps

- Run tests: `npm test`
- Generate examples: `npm run make-tx -- --example=A`
- Read specification: `cat arkade-assets.md`
- Explore CLI: `npm run cli -- --help`
