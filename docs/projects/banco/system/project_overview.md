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
- **Introspector integration**: Covenant validation and co-signing via introspector service
- **Dual module output**: ESM + CJS + TypeScript declarations
- **npm published**: `@arkade-os/banco` on npm

## Technology Stack

- **Language**: TypeScript (Node.js 22+)
- **Package Manager**: pnpm 10+
- **Build**: TypeScript compiler (ESM + CJS dual output)
- **Test Framework**: Vitest
- **Dependencies**: `@arkade-os/sdk`, `@scure/base`
- **CI**: GitHub Actions (CI + release)
- **Regtest**: arkade-regtest submodule + introspector docker-compose overlay

## Use Cases

- Building swap UIs for Ark-based wallets
- Automated market making on the Ark virtual mempool (via bancod solver bot)
- Asset trading on Ark networks
- Non-interactive OTC trades
