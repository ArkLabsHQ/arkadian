---
project_id: arkade-regtest
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_run.md"]
  dev:        ["sop/development-workflow.md", "system/configuration.md"]
  debug:      ["testing/troubleshooting.md", "testing/how_to_run.md"]
  monitoring: ["testing/usage.md", "testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  config: ["system/configuration.md"]
  submodule: ["sop/development-workflow.md", "system/project_overview.md"]
scripts:
  start_env: "./start-env.sh"
  start_clean: "./start-env.sh --clean"
  start_with_env: "./start-env.sh --env <path>"
  stop_env: "./stop-env.sh"
  clean_env: "./clean-env.sh"
  create_invoice: "./helpers/create-invoice.sh"
  pay_invoice: "./helpers/pay-invoice.sh <invoice>"
---

# Arkade Regtest — Project Index

**arkade-regtest** is a self-contained regtest environment for Ark protocol development. It orchestrates Nigiri (Bitcoin + Liquid regtest), arkd, Fulmine, Boltz, an LND node, and the arkade-script emulator into a single reproducible Docker Compose stack. Designed to be embedded as a git submodule in projects that need a local Ark test network.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/` — System Architecture & Design
Core technical documentation about the regtest environment:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/project_overview.md** — What arkade-regtest is, services it bundles, use cases
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/architecture.md** — Service composition, networking, env-loading strategy
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/configuration.md** — `.env.defaults`, override layering, image/version pinning

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/` — Usage & Operations
Practical guides for running the regtest stack:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/usage.md** — Quick start, typical workflows, helper scripts
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/how_to_run.md** — Prerequisites, launch flags, CI integration
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/how_to_test.md** — Smoke checks, port verification, integration patterns
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/troubleshooting.md** — Common issues, port conflicts, nigiri build failures

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/sop/` — Standard Operating Procedures
Step-by-step guides:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/sop/development-workflow.md** — Submodule integration, version bumps, contributing changes

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Self-Contained Stack
arkade-regtest bundles every service needed for end-to-end Ark testing into one Docker Compose project (`name: nigiri`). Consumers get the same versions and configuration across machines and CI.

### Submodule-First Design
The repo is intended to live inside other projects as a git submodule (typically at `regtest/`). The `start-env.sh` script auto-discovers `../.env.regtest` from the parent repo so consumers can pin versions without editing arkade-regtest itself.

### Layered Environment Loading
Environment loading follows strict priority:
1. `--env <path>` CLI flag (explicit, highest priority)
2. `../.env.regtest` (parent repo override — typical submodule case)
3. `.env` (local override inside arkade-regtest)
4. `.env.defaults` (baseline, always loaded first)

Override files only need to specify variables that differ from defaults; missing variables fall through to `.env.defaults`.

### Nigiri-Backed Bitcoin Regtest
Bitcoin/Liquid regtest infrastructure is provided by [Nigiri](https://github.com/vulpemventures/nigiri). By default, Nigiri is built from source (branch `master` per `.env.defaults`) so all consumers run an identical version with Ark support. To use a system-installed nigiri instead, set `NIGIRI_BRANCH=""` in your override.

### Custom arkd / Fulmine / Boltz Versions
Default images run nigiri's bundled arkd plus pinned versions of Fulmine, Boltz, and Boltz LND. To exercise a specific arkd build:

```bash
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0
```

When `ARKD_IMAGE` is set, `start-env.sh` stops nigiri's arkd container and starts the override images — applying all `ARKD_*` configuration variables from `.env.defaults`.

---

## Bundled Services

| Service          | Image (default)                                     | Default Port(s)        | Purpose                                          |
| ---------------- | --------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| Bitcoin Core     | nigiri-bundled                                      | 18443/18444            | Bitcoin regtest node                             |
| arkd             | nigiri-bundled (overridable)                        | 7070                   | Ark protocol server                              |
| arkd-wallet      | nigiri-bundled (overridable)                        | —                      | Signer/wallet for arkd                           |
| Fulmine          | `ghcr.io/arklabshq/fulmine:v0.3.23`                 | 7002 / 7003 / 7004     | Ark wallet + Boltz integration                   |
| Boltz Backend    | `boltz/boltz:latest`                                | 9000 / 9001 / 9004     | Submarine / reverse swap orchestrator            |
| Boltz LND        | `btcpayserver/lnd:v0.19.3-beta`                     | 9736 / 10010           | Lightning node used by Boltz                     |
| LNURL Server     | `ghcr.io/arklabshq/lnurl-server:0.1.0`              | 9090                   | LNURL endpoints for testing                      |
| Wallet (PWA)     | `ghcr.io/arkade-os/wallet:latest`                   | 3003                   | Browser wallet                                   |
| Nginx            | `nginx:alpine`                                      | 9069                   | CORS proxy / static fronting                     |
| Delegator        | (configurable)                                      | 7010 / 7011 / 7012     | Optional delegated-signing service               |
| Emulator         | `ghcr.io/arkade-os/emulator:v0.0.1`                 | 7073                   | arkade-script signing service (default-on; opt-out via `EMULATOR_IMAGE=`) |

All ports are configurable via `.env.defaults` overrides.

---

## Quick Reference

### Start / Stop / Clean
```bash
./start-env.sh                  # Start the full stack
./start-env.sh --clean          # Force-rebuild nigiri from source
./start-env.sh --env path/.env  # Use explicit override file
./stop-env.sh                   # Stop services (preserves data volumes)
./clean-env.sh                  # Stop + remove containers, volumes, _build/
```

### Lightning Helpers
```bash
./helpers/create-invoice.sh                # Create LN invoice on Boltz LND
./helpers/create-invoice.sh --secondary    # Create on the secondary lnd node
./helpers/pay-invoice.sh <bolt11>          # Pay an invoice from Boltz LND
```

### Submodule Usage (parent repo)
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
echo 'ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0' >> .env.regtest
./regtest/start-env.sh
```

---

## Documentation Size Guidelines

- **usage / how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **configuration**: 400-800 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference instead of duplicating.
