# NArk -- How to Run

## Prerequisites

- .NET SDK 8.0+ (for library projects)
- .NET SDK 10.0 (for AppHost, E2E tests, and the WASM sample wallet)
- Docker (for Aspire AppHost / arkade-regtest infrastructure)

## Build

```bash
cd /path/to/dotnet-sdk
git submodule update --init --recursive   # pulls arkade-regtest into regtest/
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

## Run the Sample Wallet (Blazor WASM)

```bash
# Standalone client (talks to a running arkd directly)
dotnet run --project samples/NArk.Wallet/NArk.Wallet.Client

# Or the full sample with the gateway (proxies to arkd + Boltz)
dotnet run --project samples/NArk.Wallet/NArk.Wallet.Gateway
```

The published version of the wallet runs at `https://arkade-os.github.io/dotnet-sdk/wallet/` (built and deployed by `.github/workflows/docs.yml` on every push to `master`).

## Run E2E via the Shared Regtest Submodule

For E2E test runs without Aspire, bring up the shared `arkade-regtest` stack:

```bash
git submodule update --init --recursive
cd regtest && ./start-env.sh
```

CI uses this same submodule for the E2E job (`.github/workflows/build.yml`).

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
