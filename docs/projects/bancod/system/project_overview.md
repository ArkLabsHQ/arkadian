# Bancod — Project Overview

## What is Bancod?

Bancod is a Go-based **solver bot** for the Arkade virtual mempool. It watches the arkd transaction stream for swap offers posted as VTXOs, matches them against configured trading pairs and price ranges, and fulfills them atomically using introspector-signed Arkade transactions.

## Key Features

- **Banco Swap Plugin**: Automated market-making bot that watches arkd tx stream, decodes TLV-encoded swap offers (PacketType 0x03), validates price within 1% of feed, and fulfills atomically
- **Preimage Claim Plugin**: Stateless preimage-gated VTXO claims using ECIES encryption (PacketType 0x04) — no per-claim persistence
- **Plugin Architecture**: Generic solver runtime (`pkg/solver`) with pluggable `Plugin` interface (`Filter` + `Match` + `Solve`). Each plugin subscribes to its own `solver.Source` stream with an optional per-plugin CEL filter (forward-compatible; arkd-side filtering not yet wired through)
- **Trading Pair Management**: Configurable pairs (base/quote, min/max amounts, price feed URL, invert flag) via gRPC/REST API
- **Price Feed Integration**: Pluggable price sources with TTL caching (default 5 min), CoinGecko implementation included
- **gRPC + REST API**: Full API with grpc-gateway (gRPC on port 7070, HTTP/REST on port 7071)
- **Web UI**: Embedded web interface for monitoring and management
- **CLI Client**: `banco` CLI for pair management, status, balance, and address queries
- **SQLite Storage**: Trade history and pair configuration persistence
- **Docker Ready**: Dockerfile and docker-compose for deployment

## Technology Stack

- **Language**: Go 1.26+
- **Database**: SQLite (via modernc.org/sqlite, pure Go)
- **API**: gRPC + grpc-gateway REST, Protobuf
- **Code Generation**: buf (proto), sqlc (SQL)
- **Dependencies**: arkd (client-lib, ark-lib), go-sdk, introspector, btcd
- **CI**: GitHub Actions (unit + integration tests, release)

## Binaries

| Binary | Purpose |
|--------|---------|
| `bancod` | Daemon: solver + wallet + API + web UI |
| `banco` | CLI client for the HTTP API |

## Use Cases

- Automated market-making on the Arkade virtual mempool
- Atomic swap fulfillment for banco swap offers
- Stateless preimage-gated VTXO claims
- Trading pair management and price monitoring
