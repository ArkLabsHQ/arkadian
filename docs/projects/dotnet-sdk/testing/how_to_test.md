# NArk -- How to Test

## Test Projects

| Project | Type | Framework | Target |
|---------|------|-----------|--------|
| `NArk.Tests` | Unit tests | NUnit 4 + NSubstitute | net10.0 |
| `NArk.Tests.End2End` | Integration tests | NUnit 4 + Aspire | net10.0 |
| `NArk.Transport.GrpcClient.Tests` | Transport tests | NUnit 4 | net10.0 |

## Unit Tests

```bash
# Run all unit tests
dotnet test --filter "FullyQualifiedName~NArk.Tests" --no-build --verbosity normal

# Run specific test class
dotnet test --filter "FullyQualifiedName~ContractServiceTests"

# Run with coverage
dotnet test --filter "FullyQualifiedName~NArk.Tests" --collect:"XPlat Code Coverage"
```

### Unit Test Files

- `ArkAddressTests.cs` -- Ark address encoding/decoding
- `BoltzLimitsValidatorTests.cs` -- Swap limit validation
- `CachingClientTransportTests.cs` -- Transport caching behavior
- `CheckpointTapScriptTests.cs` -- Tapscript construction
- `ContractServiceTests.cs` -- Contract derivation and management
- `DefaultCoinSelectorTests.cs` -- Coin selection algorithm
- `IntentGenerationServiceTests.cs` -- Intent creation logic
- `IntentSynchronizationServiceTests.cs` -- Intent sync with server
- `SweeperServiceTests.cs` -- VTXO sweep/recovery
- `VHtlcContractTests.cs` -- VHTLC contract construction
- `VtxoPollingHandlerTests.cs` -- VTXO polling after events

## End-to-End Tests

E2E tests require Docker (uses .NET Aspire to start the full infrastructure):

```bash
# Run E2E tests (starts all Docker containers automatically)
dotnet test --filter "FullyQualifiedName~NArk.Tests.End2End"

# Run specific E2E test
dotnet test --filter "FullyQualifiedName~BatchSessionTests"
```

### E2E Test Files

- `BatchSessionTests.cs` -- Batch round participation
- `BuilderStyleTests.cs` -- Builder pattern integration
- `ChainSwapTests.cs` -- ARK<->BTC chain swaps via Boltz
- `IntentSchedulerTests.cs` -- Intent scheduling and submission
- `NoteTests.cs` -- Note contract operations
- `OnchainTests.cs` -- On-chain boarding and settlement
- `SwapManagementServiceTests.cs` -- Full swap lifecycle
- `VtxoSynchronizationTests.cs` -- VTXO sync with server

### E2E Test Infrastructure

- `SharedArkInfrastructure.cs` -- Aspire distributed application fixture
- `Common/FundedWalletHelper.cs` -- Helper for creating and funding test wallets
- `Wallets/SimpleSeedWallet.cs` -- Simple deterministic wallet for tests
- `TestPersistance/InMemory*.cs` -- In-memory storage implementations for testing

## CI Pipeline

GitHub Actions (`build.yml`):
1. `dotnet restore`
2. `dotnet build --no-restore`
3. `dotnet test --no-build --verbosity normal`
4. `dotnet pack -c Release -o dist/`
5. Push to NuGet (on master/tags only)
