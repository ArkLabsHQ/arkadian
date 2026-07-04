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
contract Example(pubkey owner, int exit) {
    function spend(signature ownerSig) {
        require(checkSig(ownerSig, owner));
    }
    function unilateral(signature ownerSig) tapscript {
        require(older(exit));
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

The `options {}` block has been **removed**. A contract is zero or more `import`s followed by a `contract` declaration. Unmodified `function`s are arkade covenants; `tapscript` functions are L1 tapleaves; exit timelocks are ordinary `int` constructor params referenced by `older(...)`.

```solidity
contract Name(
  pubkey user,
  bytes32 hash,
  int amount,
  int exit                  // exit timelock (blocks), referenced by older(exit)
) {
  // Arkade covenant (cooperative signing = synthesized default leaf).
  function spend(signature userSig) {
    require(checkSig(userSig, user));
  }

  // Unilateral L1 CSV exit leaf.
  function unilateral(signature userSig) tapscript {
    require(older(exit));
    require(checkSig(userSig, user));
  }
}
```

**Custom tapleaves** must assemble to an arkd closure (`condition? · timelock? · multisig`), and may use reserved roles `server` / `emulator`:

```solidity
// Hashlocked forfeit leaf: condition + N-of-N multisig with server co-sign.
function claim(bytes preimage, signature serverSig, signature emulatorSig) tapscript {
  require(hash160(preimage) == preimageHash);
  require(checkMultisig([server, emulator], [serverSig, emulatorSig], 2));
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

**Asset Lookup** (canonical Asset ID is an explicit `(txid, gidx)` pair):
```solidity
// lookup(txid, gidx) asserts the asset is present and returns its amount
require(tx.outputs[0].assets.lookup(tokenTxid, tokenGidx) >= tx.inputs[0].assets.lookup(tokenTxid, tokenGidx));
// has(txid, gidx) is a Bool presence predicate (true=present, false=absent)
require(tx.outputs[0].assets.has(tokenTxid, tokenGidx));
// gidx may be an int identifier or a 0..65535 literal
require(tx.inputs[0].assets.has(tokenTxid, 0));
```

**Asset Groups & Control**:
```solidity
// find(txid, gidx) → group position (asserts existence); has(txid, gidx) → Bool
require(tx.assetGroups.has(tokenTxid, tokenGidx));
let k = tx.assetGroups.find(tokenTxid, tokenGidx);
// control is tested with predicates, not struct access:
//   group.hasControl            → Bool (presence only)
//   group.controlIs(txid, gidx) → Bool (full canonical control Asset ID equality)
require(tx.assetGroups[k].hasControl);
require(group.controlIs(ctrlTxid, ctrlGidx));
```

**Internal Helper Functions**:
```solidity
function verifyBurning(pubkey key) internal {
  bytes script = new P2TR(key, commitHash);
  require(tx.outputs[0].scriptPubKey == script);
}
```

## Output Format

The compiler produces JSON with the unified `functions[]` spend-group ABI — each group has an optional `arkade` covenant and one or more L1 `leaves`. Signatures live in each leaf's `witness` (`injected: true` for infra-supplied fields), never in leaf `asm`:

```json
{
  "contractName": "MyContract",
  "constructorInputs": [
    { "name": "user", "type": "pubkey" }
  ],
  "functions": [
    {
      "name": "spend",
      "arkade": {
        "inputs": [{ "name": "userSig", "type": "signature" }],
        "asm": ["<user>", "<userSig>", "OP_CHECKSIG"]
      },
      "leaves": [
        {
          "name": "spend",
          "witness": [
            { "name": "serverSig", "type": "signature", "encoding": "schnorr-64", "injected": true },
            { "name": "emulatorSig", "type": "signature", "encoding": "schnorr-64", "injected": true }
          ],
          "asm": ["<SERVER_KEY>", "OP_CHECKSIGVERIFY", "<EMULATOR_KEY:spend>", "OP_CHECKSIG"]
        }
      ]
    }
  ],
  "source": "...",
  "compiler": { "name": "arkade-compiler", "version": "0.1.0" }
}
```

> The legacy `serverVariant` / `functionInputs` / `require` / `witnessSchema` fields no longer exist.
