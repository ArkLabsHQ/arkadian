# Bancod — Sync History

## 2026-05-09 — Initial sync
- **Commit**: c3088a46bf36cb23760a6b3eec99cb2485348563
- **Action**: Project added to Arkadian documentation registry
- **Files created**: INDEX.md, system/, testing/, sop/ documentation

## 2026-05-16 — go-sdk dependency bump
- **Range**: 4660a50eb01d8d9c4e4ddbac80af6cb0d23fb67d..2827a305a0b6561730abaef78ca40cd158d142f8
- **Commits analyzed**: 1 (`2827a30 update to latest go-sdk`)
- **Source changes**: go-sdk bumped to `v0.9.2-0.20260514163636-f28dda8725d5`; `arksdk.ArkClient` interface renamed to `arksdk.Wallet`; constructors renamed (`LoadArkClient`/`NewArkClient` → `LoadWallet`/`NewWallet`); taker fulfillment refactored from `Wallet().GetAddresses` matching to the new `ContractManager` API, signing via `Identity().SignTransaction` with an explicit script→keyId map. Transitive deps trimmed (badger, ristretto, otel, flatbuffers, factomproject); added gocron, robfig/cron/v3, tyler-smith/go-bip39 indirects.
- **Doc updates**: Master `docs/INDEX.md` — replaced `go-sdk (ArkClient)` references with `go-sdk (Wallet)` in bancod's Dependencies line and Correlation Matrix row.

## 2026-05-19 — explicit single-key identity, `make run`, README architecture
- **Range**: 2827a305a0b6561730abaef78ca40cd158d142f8..c758b9bb8af48c9a3fb476426c894d077c510479
- **Commits analyzed**: 3 (`fa1ecfd fix identity`, `512ac31 format`, `c758b9b update README.md`)
- **Source changes**:
  - `cmd/bancod/main.go`: wallet bootstrap now constructs a single-key file-backed identity store (`client-lib/identity/singlekey/store/file`) and applies it via `arksdk.WithIdentity(...)` to both `LoadWallet` and `NewWallet`. Fresh-datadir detection accepts either `arksdk.ErrNotInitialized` or `arkdclient.ErrNotInitialized` since either layer may surface first.
  - `Makefile`: added `run` target — builds and runs `bancod` against the fulmine test stack (arkd@7070, introspector@7273) with preimage plugin enabled, banco plugin disabled, and a temp `BANCOD_DATADIR` by default.
  - `Dockerfile`: removed the dedicated `go mod download` cache layer; deps are now fetched as part of the build copy.
  - `.gitignore`: ignore local `bancod` and `banco` build artifacts.
  - `pkg/preimage/plugin.go`: substantially more debug logging in `claim()` (matched-claim fields, ark tx + checkpoint b64/txids, submit context); behavior unchanged.
  - `go.mod`: `github.com/arkade-os/go-sdk` bumped to `v0.9.2-0.20260518112312-588477f9d618`.
  - `README.md`: added a top-level Architecture section documenting the plugin runtime (`Match`/`Solve`), per-plugin Solver+subscription model, panic recovery, and the banco + preimage plugins that ship today.
- **Doc updates**:
  - `docs/projects/bancod/INDEX.md`: bumped `last_sync_commit`/`last_sync_date`, added `run: make run` to scripts.
  - `docs/projects/bancod/sop/development-workflow.md`: documented `make run` alongside `make build`.
  - `docs/projects/bancod/system/architecture.md`: Data Flow now reflects single-key identity bootstrap, per-plugin Solver/arkd-subscription model, and panic-recovery / drain-on-shutdown semantics.
  - Master `docs/INDEX.md`: no change (no new capabilities, tags, or first-class dependencies; only a go-sdk pseudo-version bump).
