# NArk -- Development Workflow

## Prerequisites

1. **.NET SDK** 8.0+ (for library projects) and 10.0 (for AppHost/E2E)
   ```bash
   dotnet --list-sdks
   ```

2. **Docker** (for Aspire AppHost and E2E tests)

## Building

```bash
cd /path/to/dotnet-sdk
dotnet restore
dotnet build
```

## Running Tests

```bash
# Unit tests only
dotnet test --filter "FullyQualifiedName~NArk.Tests" --no-build --verbosity normal

# Transport tests
dotnet test --filter "FullyQualifiedName~NArk.Transport.GrpcClient.Tests"

# E2E tests (starts Docker infrastructure via Aspire)
dotnet test --filter "FullyQualifiedName~NArk.Tests.End2End"

# All tests
dotnet test --no-build --verbosity normal
```

## Running AppHost (Development)

```bash
# Full stack with swaps
dotnet run --project NArk.AppHost

# Without swap infrastructure
dotnet run --project NArk.AppHost -- --noswap

# Fast VTXO expiry for testing
dotnet run --project NArk.AppHost -- --fast-expire
```

## Packaging

```bash
dotnet pack -c Release -o dist/
```

## Code Quality

- Nullable reference types enabled (`<Nullable>enable</Nullable>`)
- Nullable warnings as errors (`<WarningsAsErrors>nullable</WarningsAsErrors>`)
- Implicit usings enabled

## Git Workflow

### Branch Naming
```
feat/short-description
fix/issue-description
refactor/area-description
```

### Commit Convention
- `feat:` -- New feature
- `fix:` -- Bug fix
- `refactor:` -- Code restructuring
- `test:` -- Test changes
- `docs:` -- Documentation
- `debug:` -- Diagnostic logging (temporary)

### Pre-commit Checklist
```bash
dotnet build            # No build errors
dotnet test             # All tests pass
```

### Documentation Rules (`CLAUDE.md` / `.github/agents.md`)

PRs that touch public API surface must keep the following in sync (also enforced for direct-to-`master` commits):

- XML doc comments on the changed public APIs.
- `README.md` usage examples for any new feature.
- `docs/articles/` (DocFX conceptual articles) — published to GitHub Pages from `master`.
- The Blazor WASM sample wallet at `samples/NArk.Wallet/NArk.Wallet.Client/`, when the change affects something the sample exercises (receive/send/swap/contracts/etc.).

User-facing prose uses **Arkade** (not "Ark"). Code identifiers (`NArk`, `ArkCoin`, `AddArk`, …) remain unchanged.

### PR Flow
1. Create feature branch from `master`
2. Make changes, ensure build + tests pass
3. Push and create PR against `master`
4. CI builds, tests, and packs on every push — scoped to the `NArk.CI.slnf` solution filter (PR #156), which excludes the browser-only Blazor wallet sample from library CI (`dotnet restore/build/test/pack NArk.CI.slnf`). Build the full `NArk.sln` locally to also compile the sample wallet.
5. NuGet packages published on merge to `master`

## Versioning

Uses **Nerdbank.GitVersioning** with `version.json`:
- Base version: `1.0-beta`
- Public release refs: `master`, `v*` branches
- Build numbers auto-generated from git height
