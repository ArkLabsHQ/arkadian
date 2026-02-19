# boltz-swap -- Project Overview

## What is boltz-swap?

`@arkade-os/boltz-swap` is a production-ready TypeScript library that enables Arkade wallets to perform Lightning Network payments and BTC<->ARK chain swaps through the Boltz exchange. It abstracts the complexity of submarine swaps, reverse swaps, and chain swaps behind a clean API, handling VHTLC construction, script validation, preimage management, and swap lifecycle monitoring.

## Core Features

- **Lightning Payments (Send)**: Pay Lightning invoices from an Ark wallet using submarine swaps
- **Lightning Payments (Receive)**: Create Lightning invoices that deposit to an Ark wallet using reverse swaps
- **Chain Swaps (ARK->BTC)**: Convert ARK virtual coins to on-chain BTC
- **Chain Swaps (BTC->ARK)**: Convert on-chain BTC to ARK virtual coins
- **SwapManager**: Background monitoring of pending swaps via WebSocket with polling fallback
- **Auto-claim/refund**: Automatic claim and refund execution when swap states change
- **VHTLC Script Validation**: Verifies Boltz-provided scripts to prevent fraud
- **Swap Restoration**: Recover in-flight swaps from Boltz API using wallet public key
- **Event Subscription**: Observable pattern for UI integration (onSwapUpdate, onSwapCompleted, etc.)
- **Custom Logger**: Pluggable logging via `setLogger()`
- **Dual Module Format**: Ships as both ESM and CJS

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ES2022 target) |
| Runtime | Node.js >= 22, browser (via bundler) |
| Build | tsup (ESM + CJS + DTS) |
| Test | vitest |
| Crypto | @noble/hashes, @noble/curves, @scure/btc-signer |
| Ark SDK | @arkade-os/sdk (VHTLC, ArkProvider, Wallet) |
| Boltz | boltz-core (MuSig, TaprootUtils, claim construction) |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@arkade-os/sdk` | Ark wallet, providers, VHTLC script, off-chain TX |
| `boltz-core` | MuSig signing, Taproot utils, claim TX construction |
| `@noble/hashes` | SHA-256, RIPEMD-160 for preimage hashing |
| `@noble/curves` | secp256k1 for ephemeral key generation |
| `@scure/btc-signer` | Bitcoin transaction building and PSBT handling |
| `light-bolt11-decoder` | Lightning invoice decoding |

## Use Cases

1. **Arkade Wallet Lightning**: Primary consumer -- enables send/receive Lightning from the wallet PWA
2. **Payment Processors**: Any service accepting Lightning that holds funds in Ark
3. **Cross-chain Bridges**: Move BTC between on-chain and Ark layers
4. **Automated Swap Services**: Background swap processing with SwapManager

## Supported Networks

- `bitcoin` (mainnet)
- `mutinynet` (testnet -- Boltz API at `api.boltz.mutinynet.arkade.sh`)
- `regtest` (local development -- Boltz API at `localhost:9069`)

## Ecosystem Relationships

- **Depends on**: `@arkade-os/sdk` (TypeScript Ark SDK), Boltz exchange API, `arkd` (via SDK providers)
- **Used by**: `wallet` (Arkade PWA wallet)
- **Related to**: `boltz-backend` (the Boltz server that processes swaps)
