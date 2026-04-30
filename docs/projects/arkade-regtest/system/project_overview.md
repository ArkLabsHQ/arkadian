# Arkade Regtest - Project Overview

## Introduction

**arkade-regtest** is a self-contained regtest environment for Ark protocol development. It orchestrates Nigiri (Bitcoin + Liquid regtest), `arkd` (Ark Server), `arkd-wallet`, Fulmine, Boltz Backend, an LND Lightning node, an LNURL server, an Nginx CORS proxy, and a browser-based Wallet PWA into a single reproducible Docker Compose stack.

The repository is intentionally lightweight — it ships shell scripts and Compose files only. Heavy lifting (image builds, regtest nodes) is delegated to upstream projects so arkade-regtest stays focused on **orchestration**: the right services, configured the right way, on the right ports.

## Purpose and Use Cases

Local Ark development needs more than a single binary. A realistic test loop exercises a Bitcoin regtest node, an Ark Server, a wallet/signer, a Lightning node, and a Boltz swap backend — all wired together. Setting that up by hand is error-prone and inconsistent across contributors. arkade-regtest collapses that into:

```bash
./start-env.sh
```

### Primary Use Cases

- **End-to-end Ark testing**: VTXOs, rounds, settlement, boarding, redemption — exercised against real running services.
- **Boltz / Lightning swap testing**: Full submarine and reverse swap flows with a real LND node and a Boltz backend.
- **Wallet integration testing**: Ark wallet PWA, fulmine wallet, and SDK clients all reachable on stable local ports.
- **CI integration**: Designed to be embedded as a git submodule in projects (arkd, fulmine, go-sdk, ts-sdk, etc.) and spun up in GitHub Actions.
- **arkd version compatibility testing**: Pin a specific `ARKD_IMAGE` to validate behavior of a release candidate against the rest of the stack.

## Key Features

### Self-Contained Stack
One command brings up Bitcoin + arkd + Fulmine + Boltz + LND + LNURL + Wallet + Nginx. No manual coordination, no port juggling.

### Submodule-First Design
Intended to be added as a git submodule (typically at `regtest/`) inside consumer repos. The launcher script auto-detects `../.env.regtest` in the parent directory so consumers can pin versions without modifying arkade-regtest.

### Layered Environment Loading
`.env.defaults` is the always-on baseline. Overrides layer on top from one of (in priority order): `--env <path>`, `../.env.regtest`, `.env`. Missing variables fall through to defaults — overrides only need to specify what changes.

### Reproducible Nigiri Build
By default, Nigiri is **built from source** on a pinned branch (`NIGIRI_BRANCH=master` in `.env.defaults`). This guarantees every consumer runs an identical version with Ark protocol support. A system-installed `nigiri` can still be opted into by setting `NIGIRI_BRANCH=""`.

### arkd Override Mode
The default uses nigiri's bundled `arkd`. Setting `ARKD_IMAGE` (and `ARKD_WALLET_IMAGE`) in an override file causes `start-env.sh` to stop nigiri's arkd and start the override image instead — useful for testing release candidates or feature branches with the rest of the stack intact.

### Stop / Clean Lifecycle
- `stop-env.sh` — stops services, preserves volumes (fast restart)
- `clean-env.sh` — full teardown including volumes and the `_build/` cache

### Lightning Helpers
`create-invoice.sh` and `pay-invoice.sh` offer one-line shortcuts for invoicing through the Boltz LND node, supporting both primary and secondary nodes.

## Technology Stack

- **Bash** — `start-env.sh`, `stop-env.sh`, `clean-env.sh`, `lib/env.sh`, helpers
- **Docker Compose** — `docker/docker-compose.ark.yml`, `docker/docker-compose.arkd-override.yml`
- **Nigiri** — Bitcoin/Liquid regtest framework (built from source by default)
- **arkd** — Ark protocol server (nigiri-bundled or override image)
- **Fulmine** — Ark wallet + Boltz integration daemon
- **Boltz Backend** — Submarine/reverse swap orchestrator
- **LND (btcpayserver build)** — Lightning node
- **Nginx** — CORS proxy for browser-side integration

## Repository Layout

| Path                                      | Purpose                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `start-env.sh`                            | Main launcher: env load, nigiri resolution, compose up |
| `stop-env.sh`                             | Stops services, preserves volumes                      |
| `clean-env.sh`                            | Full teardown                                          |
| `lib/env.sh`                              | Shared `load_env` helper used by scripts               |
| `docker/docker-compose.ark.yml`           | Boltz, Fulmine, LND, Wallet, Nginx, LNURL              |
| `docker/docker-compose.arkd-override.yml` | Optional arkd override compose                         |
| `docker/cors.nginx.conf`                  | Nginx CORS configuration                               |
| `helpers/create-invoice.sh`               | Create Lightning invoice on Boltz LND                  |
| `helpers/pay-invoice.sh`                  | Pay Lightning invoice from Boltz LND                   |
| `.env.defaults`                           | Baseline configuration (versions, ports, arkd config)  |
| `README.md`                               | Project documentation                                  |

## Relationship to Other Ark Projects

- **arkd** — the Ark Server under test; nigiri-bundled by default, overridable
- **fulmine** — exercised as a wallet + Boltz client
- **boltz-backend** — exercised as the swap orchestrator
- **wallet** — Ark Wallet PWA included for end-to-end browser testing
- **go-sdk / ts-sdk / rust-sdk / dotnet-sdk** — SDK consumers point their integration tests at this stack
- **boltz-swap** — Boltz swap web UI; can be brought up against this stack
- **arkade-explorer** — explorer UI; can be pointed at this stack for manual inspection

arkade-regtest is the standard local target every Ark project test suite is expected to run against.
