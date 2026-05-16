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
