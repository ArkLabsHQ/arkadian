# Bancod — Sync History

## 2026-05-27 — solver `Source` abstraction + per-plugin CEL filter, wiki specs, dashboard
- **Range**: 138bbd5f8f082285726c54f58050ec74d4b05d62..5ce9637acc4898127fa2aebb1fb62f540998176f
- **Commits analyzed**: 3 (`c752a8b add filter to Plugin interface`, `24b3d73 spec wiki`, `5ce9637 fix dashboard`)
- **Source changes**:
  - `pkg/solver/solver.go`: `Plugin` gains `Filter() string` (server-side CEL expression; empty = full stream). New `Source` interface `Subscribe(ctx, filter) (<-chan *psbt.Packet, error)`. `Solver.Run` now takes a `Source` instead of a raw channel — it subscribes each plugin with its own filter, consumes each stream in its own goroutine (new `consume` helper), and skips (logs) a plugin whose `Subscribe` fails while the rest continue.
  - `pkg/solver/builder/builder.go`: added `WithFilter(cel)`; the built `plugin[T]` now implements `Filter()`.
  - `pkg/solver/arkdsource/arkdsource.go`: refactored from a `Subscribe(...)` function into a `Source` struct with `New(client.Client, log)` constructor and a `Subscribe(ctx, filter)` method (opens a fresh upstream stream per call). Now imports `arkd/pkg/client-lib/client` directly instead of `go-sdk` (`arksdk.Wallet`). The `filter` arg is accepted for forward compatibility — arkd's CEL filtering is not yet wired through, so subscriptions remain unfiltered.
  - `internal/core/application/{swap_service,preimage_service}.go`: updated to build a `Source` via `arkdsource.New(client.Client(), log)` and pass it to `Solver.Run`.
  - `pkg/preimage/README.md` (new): plugin internals walkthrough (Match → Decode → Solve).
  - `wiki/Banco-Swap-Protocol.md`, `wiki/Preimage-Claim-Protocol.md` (new): V1 working-draft protocol specs.
  - `internal/interface/web/static/{app.js,index.html,styles.css,favicon.svg}`: dashboard UI fix/refresh (cosmetic; no behavioral/API impact).
- **Doc updates**:
  - `docs/projects/bancod/INDEX.md`: bumped `last_sync_commit`/`last_sync_date`.
  - `docs/projects/bancod/system/architecture.md`: Data Flow rewritten for the `Source`-based per-plugin subscription model and `Subscribe`-error isolation; Key Interfaces add `Plugin.Filter()`, `solver.Source`/`arkdsource.Source`, and `Builder.WithFilter`; Package Structure lists `pkg/solver/builder` and `pkg/solver/arkdsource`.
  - `docs/projects/bancod/system/project_overview.md`: Plugin Architecture feature notes `Filter` + per-plugin `Source` stream and the forward-compatible CEL filter.
  - `docs/projects/bancod/system/swap-protocol.md`: taker step 1 updated to `arkdsource.Source.Subscribe`; added Reference to `wiki/Banco-Swap-Protocol.md`.
  - `docs/projects/bancod/system/preimage-protocol.md`: added Reference to `wiki/Preimage-Claim-Protocol.md` and `pkg/preimage/README.md`.
  - Master `docs/INDEX.md`: solver-runtime capability now reads `Filter+Match+Solve` with per-plugin `Source`/CEL note; added `cel` tag.

## 2026-05-09 — Initial sync
- **Commit**: c3088a46bf36cb23760a6b3eec99cb2485348563
- **Action**: Project added to Arkadian documentation registry
- **Files created**: INDEX.md, system/, testing/, sop/ documentation

## 2026-05-16 — go-sdk dependency bump
- **Range**: 4660a50eb01d8d9c4e4ddbac80af6cb0d23fb67d..2827a305a0b6561730abaef78ca40cd158d142f8
- **Commits analyzed**: 1 (`2827a30 update to latest go-sdk`)
- **Source changes**: go-sdk bumped to `v0.9.2-0.20260514163636-f28dda8725d5`; `arksdk.ArkClient` interface renamed to `arksdk.Wallet`; constructors renamed (`LoadArkClient`/`NewArkClient` → `LoadWallet`/`NewWallet`); taker fulfillment refactored from `Wallet().GetAddresses` matching to the new `ContractManager` API, signing via `Identity().SignTransaction` with an explicit script→keyId map. Transitive deps trimmed (badger, ristretto, otel, flatbuffers, factomproject); added gocron, robfig/cron/v3, tyler-smith/go-bip39 indirects.
- **Doc updates**: Master `docs/INDEX.md` — replaced `go-sdk (ArkClient)` references with `go-sdk (Wallet)` in bancod's Dependencies line and Correlation Matrix row.

## 2026-05-26 — README terminology refresh (Ark → Arkade)
- **Range**: c758b9bb8af48c9a3fb476426c894d077c510479..138bbd5f8f082285726c54f58050ec74d4b05d62
- **Commits analyzed**: 1 (`138bbd5 Update documentation to use "Arkade" terminology consistently (#1)`)
- **Source changes**: `README.md` only — renames protocol-name references from "Ark" to "Arkade" throughout (Ark network → Arkade, Ark transaction → Arkade transaction, Ark extension → Arkade extension, ark client → Arkade client, arkade script → arkade-script). No code, config, or dependency changes.
- **Doc updates**:
  - `docs/projects/bancod/INDEX.md`: bumped `last_sync_commit`/`last_sync_date`; updated description to use "Arkade" terminology ("VTXO on Arkade", "introspector-signed Arkade transaction").
  - `docs/projects/bancod/system/project_overview.md`: "introspector-signed Ark transactions" → "Arkade transactions"; "Ark virtual mempool" → "Arkade virtual mempool" in Use Cases.
  - `docs/projects/bancod/system/swap-protocol.md`: "Ark virtual mempool" → "Arkade virtual mempool"; "Ark transaction" → "Arkade transaction"; "Ark extension packets" → "Arkade extension packets"; "ark client" → "Arkade client"; "Ark tx" → "Arkade tx".
  - `docs/projects/bancod/system/preimage-protocol.md`: "Ark extension TLV packet" → "Arkade extension TLV packet".
  - Master `docs/INDEX.md`: bancod description aligned to "Arkade transactions" / "Arkade virtual mempool". No changes to dependencies, tags, or correlation matrix.

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
