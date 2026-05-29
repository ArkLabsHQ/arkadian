# Banco — Project Overview

## What is Banco?

Banco (`@arkade-os/banco`) is a TypeScript library implementing a **non-interactive atomic swap protocol** for the Ark network. It enables trustless swaps between BTC and assets (or asset-to-asset) where the maker can go offline after creating an offer — any taker can fulfill it later without the maker's participation.

## Key Features

- **Non-interactive swaps**: Maker creates offer and goes offline; taker fulfills asynchronously
- **Covenant-based enforcement**: Swap conditions enforced at protocol level via Arkade Script introspection opcodes
- **Three swap types**: Asset→BTC, BTC→Asset, Asset→Asset
- **Partial fills**: Ratio-based partial fulfillment with automatic change handling
- **Cancellation support**: CLTV-timelocked cancel path for maker fund recovery
- **Unilateral exit**: CSV-timelocked exit path for safety
- **TLV offer encoding**: Offers serialized as TLV records in Ark Extension packets (type 0x03)
- **Maker class**: Create offers, query status, cancel offers
- **Taker class**: Fulfill by hex offer or by funding txid
- **Emulator integration**: Covenant validation and co-signing via the Emulator service (`RestEmulatorProvider`, `EmulatorPacket`). The legacy `introspector` identifiers (`introspectorPubkey`, `introspectorUrl`, `RestIntrospectorProvider`, `IntrospectorPacket`) were removed in the May 2026 ts-sdk bump — `0x08` is now `emulatorPubkey` and constructors take `emulatorUrl`
- **Trust model**: Maker and Taker are trustless; Operator (arkd) and Emulator are liveness-only — they can refuse to cosign but cannot redirect or steal funds
- **bigint asset amounts**: ts-sdk asset amounts are `bigint`; banco mirrors this in `Maker.getOffers()` (converts vtxo asset amounts via `Number(a.amount)`) and `Taker.fulfillOffer()` collateral accumulation
- **Dual module output**: ESM + CJS + TypeScript declarations
- **npm published**: `@arkade-os/banco` on npm

## Technology Stack

- **Language**: TypeScript (Node.js 22+)
- **Package Manager**: pnpm 10+
- **Build**: TypeScript compiler (ESM + CJS dual output)
- **Test Framework**: Vitest
- **Dependencies**: `@arkade-os/sdk` (sourced from `github:louisinger/wallet-sdk#arkade-script-final&path:/packages/ts-sdk` — monorepo subpath), `@scure/base`
- **CI**: GitHub Actions (CI + release)
- **Regtest**: arkade-regtest submodule + emulator docker-compose overlay (`docker-compose.emulator.yml`, image `ghcr.io/arkade-os/emulator:v0.0.1`)

## Use Cases

- Building swap UIs for Ark-based wallets
- Automated market making on the Ark virtual mempool (via bancod solver bot)
- Asset trading on Ark networks
- Non-interactive OTC trades
