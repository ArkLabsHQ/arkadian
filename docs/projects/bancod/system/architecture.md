# Bancod — Architecture

## Overview

Bancod follows a hexagonal (ports & adapters) architecture similar to arkd and fulmine. The core domain logic is decoupled from infrastructure concerns via interfaces.

## Component Architecture

```
┌─────────────────────────────────────────────┐
│                   bancod                     │
├──────────┬──────────┬──────────┬────────────┤
│  gRPC    │  REST    │  Web UI  │  CLI       │
│  :7070   │  :7071   │  :7071   │  (banco)   │
├──────────┴──────────┴──────────┴────────────┤
│           Application Layer                  │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ SwapService  │  │ PreimageService     │  │
│  │ (pair CRUD,  │  │ (solver pubkey,     │  │
│  │  trade log)  │  │  claim tracking)    │  │
│  └──────┬───────┘  └──────────┬──────────┘  │
├─────────┼──────────────────────┼────────────┤
│         │    Solver Runtime    │             │
│  ┌──────▼───────┐  ┌──────────▼──────────┐  │
│  │ banco.Plugin │  │ preimage.Plugin     │  │
│  │ (Match+Solve)│  │ (Match+Solve)       │  │
│  └──────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────┤
│           Infrastructure Layer               │
│  ┌────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ SQLite │ │ CoinGecko │ │ arkd stream  │  │
│  │ (sqlc) │ │ PriceFeed │ │ (go-sdk)     │  │
│  └────────┘ └───────────┘ └──────────────┘  │
└─────────────────────────────────────────────┘
```

## Package Structure

### `cmd/`
- `cmd/bancod/main.go` — Daemon entry point: boots solver, wallet, API, web UI
- `cmd/banco/main.go` — CLI client (urfave/cli)

### `pkg/` (importable by external projects)
- `pkg/banco/` — Banco swap plugin, pair/offer types, price feed interface
- `pkg/banco/contract/` — Wire-protocol primitives: Offer TLV, maker/taker helpers, taproot tree construction
- `pkg/preimage/` — Preimage claim plugin, ECIES encryption, maker helpers
- `pkg/solver/` — Generic plugin runtime: Plugin interface, Solver, Run loop

### `internal/`
- `internal/config/` — Environment-based configuration (BANCOD_* vars)
- `internal/core/application/` — SwapService, PreimageService, TradeListener
- `internal/core/ports/` — Repository interfaces (PairRepository, TradeRepository)
- `internal/infrastructure/db/sqlite/` — SQLite repos, migrations, sqlc-generated code
- `internal/infrastructure/pricefeed/` — CoinGecko price feed implementation
- `internal/interface/grpc/` — gRPC handlers, server setup, e2e tests
- `internal/interface/web/` — Embedded web UI (static HTML/JS/CSS)

### `api-spec/`
- Protobuf definitions (`bancod/v1/service.proto`, `preimage.proto`)
- buf configuration and generated Go code

## Data Flow

1. `bancod` boots, initializes a single-key identity (file-backed store in `BANCOD_DATADIR`) and loads/creates the ark wallet with `WithIdentity(...)`
2. Each enabled plugin owns its own `Solver` and arkd subscription — there is no shared multiplexer
3. arkd streams PSBT packets over gRPC; `Solver.Run()` drains the channel and calls `Plugin.Match()` sequentially, then spawns a goroutine per matched `Solve()`
4. Panics in `Match` or `Solve` are recovered so one buggy plugin can't take the bot down; `Run` waits for in-flight solves to drain on shutdown
5. For banco: decodes TLV offer → checks pair config → validates price → calls `contract.FulfillOffer()`
6. For preimage: decodes TLV packet → ECIES decrypts → validates arkade-script → claims VTXO
7. Fulfillment events are emitted to listeners (trade persistence to SQLite)

## Key Interfaces

- `solver.Plugin` — `Match(ctx, *psbt.Packet) (intent, bool)` + `Solve(ctx, intent)`
- `banco.PairRepository` — Read-only pair config storage
- `banco.PriceFeed` — Pluggable price source
- `banco.FulfillmentListener` — Post-fulfillment event handler
