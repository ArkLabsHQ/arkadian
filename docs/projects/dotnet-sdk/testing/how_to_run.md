# NArk -- How to Run

## Prerequisites

- .NET SDK 8.0+ (for library projects)
- .NET SDK 10.0 (for AppHost and E2E tests)
- Docker (for Aspire AppHost infrastructure)

## Build

```bash
cd /path/to/dotnet-sdk
dotnet restore
dotnet build
```

## Run E2E Infrastructure (Aspire AppHost)

The AppHost orchestrates a full local Ark environment with Docker containers:

```bash
dotnet run --project NArk.AppHost
```

This starts:
- Bitcoin Core (regtest) on port 18443
- Electrs + Esplora (block explorer)
- Chopsticks (faucet) on port 3000
- PostgreSQL on port 39372
- NBXplorer on port 32838
- arkd on port 7070
- ark-wallet on port 6060

With `--noswap` flag excluded (default), also starts:
- Boltz on port 9001
- Boltz-LND on ports 9736/10010
- LND on ports 9735/10009
- Boltz-Fulmine on ports 7002/7003
- Boltz-Proxy (nginx) on port 9069

### AppHost Options

```bash
# Default: full stack with swaps
dotnet run --project NArk.AppHost

# Without swap infrastructure
dotnet run --project NArk.AppHost -- --noswap

# Fast VTXO expiry (16 blocks instead of 1024)
dotnet run --project NArk.AppHost -- --fast-expire
```

### Automatic Setup

The AppHost automatically:
1. Creates and unlocks arkd wallet
2. Funds arkd via faucet (10 BTC)
3. Creates initial note (3M sats)
4. Funds Boltz-LND (4 BTC)
5. Creates LND channel (2.5M sats capacity)
6. Creates and funds Boltz-Fulmine wallet

## Pack NuGet Packages

```bash
dotnet pack -c Release -o dist/
```

This produces `.nupkg` files in the `dist/` directory for:
- NArk.Abstractions
- NArk.Core
- NArk.Swaps
- NArk.Storage.EfCore
- NArk
