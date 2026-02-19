# Usage — Arkade Compiler

## Quick Start

### Installation

```bash
# Clone the repository
git clone git@github.com:arkade-os/compiler.git
cd compiler

# Build and install
cargo install --path .

# Verify installation
arkadec --help
```

### Compile a Contract

```bash
# Compile .ark to JSON
arkadec contract.ark

# Specify output file
arkadec --output contract.json contract.ark

# Or use as a library
cargo add arkade_compiler
```

## CLI Usage

```bash
arkadec [OPTIONS] <FILE>

Arguments:
  <FILE>    Source file path (.ark)

Options:
  -o, --output <FILE>    Output file path (defaults to <source>.json)
  -h, --help             Print help
```

## Library Usage

```rust
use arkade_compiler::compile;

let source = r#"
options { server = server; exit = 144; }
contract Example(pubkey owner, pubkey server) {
    function spend(signature ownerSig) {
        require(checkSig(ownerSig, owner));
    }
}
"#;

let result = compile(source).unwrap();
let json = serde_json::to_string_pretty(&result).unwrap();
println!("{}", json);
```

## Language Syntax

### Contract Declaration

```solidity
options {
  server = serverKeyParam;  // Which param is the server key
  exit = 144;               // Exit timelock in blocks
  renew = 1008;             // Renewal timelock in blocks
}

contract Name(
  pubkey user,
  bytes32 hash,
  int amount
) {
  function spend(signature userSig) {
    require(checkSig(userSig, user));
  }
}
```

### Common Patterns

**Single Signature (Bare VTXO)**:
```solidity
require(checkSig(userSig, user));
```

**Multi-Signature**:
```solidity
require(checkMultisig([sender, receiver], [senderSig, receiverSig]));
```

**Hash Lock**:
```solidity
require(sha256(preimage) == hash);
```

**Timelock**:
```solidity
require(tx.time >= refundTime);
```

**Output Introspection**:
```solidity
require(tx.outputs[0].scriptPubKey == expectedScript);
require(tx.outputs[0].value == borrowAmount);
```

**Asset Lookup**:
```solidity
require(tx.outputs[0].assets.lookup(tokenId) >= tx.inputs[0].assets.lookup(tokenId));
```

**Internal Helper Functions**:
```solidity
function verifyBurning(pubkey key) internal {
  bytes script = new P2TR(key, commitHash);
  require(tx.outputs[0].scriptPubKey == script);
}
```

## Output Format

The compiler produces JSON with this structure:

```json
{
  "contractName": "MyContract",
  "constructorInputs": [
    { "name": "user", "type": "pubkey" }
  ],
  "functions": [
    {
      "name": "spend",
      "functionInputs": [{ "name": "userSig", "type": "signature" }],
      "serverVariant": true,
      "require": [{ "type": "signature" }, { "type": "serverSignature" }],
      "asm": ["<user>", "<userSig>", "OP_CHECKSIG", "<SERVER_KEY>", "<serverSig>", "OP_CHECKSIG"]
    },
    {
      "name": "spend",
      "functionInputs": [{ "name": "userSig", "type": "signature" }],
      "serverVariant": false,
      "require": [{ "type": "signature" }, { "type": "older", "message": "Exit timelock of 144 blocks" }],
      "asm": ["<user>", "<userSig>", "OP_CHECKSIG", "144", "OP_CHECKSEQUENCEVERIFY", "OP_DROP"]
    }
  ],
  "source": "...",
  "compiler": { "name": "arkade-compiler", "version": "0.1.0" }
}
```
