# Development Workflow

Standard operating procedure for contributing to arkade-regtest and for consuming it as a submodule.

## Repository Layout

```
arkade-regtest/
├── start-env.sh                     # Main launcher
├── stop-env.sh                      # Stop services (preserve volumes)
├── clean-env.sh                     # Full teardown
├── lib/env.sh                       # Shared env-loading helper
├── docker/
│   ├── docker-compose.ark.yml       # Boltz + Fulmine + LND + Wallet + Nginx + LNURL
│   ├── docker-compose.arkd-override.yml  # Conditional arkd image override
│   └── cors.nginx.conf              # Nginx CORS config
├── helpers/
│   ├── create-invoice.sh
│   └── pay-invoice.sh
├── docs/superpowers/                # Project-internal docs (not arkadian)
├── .env.defaults                    # Baseline env (versions, ports, arkd config)
├── README.md
```

There is no compiled code. All changes are to scripts, compose files, or the env baseline.

## Branching & PRs

1. Branch from `master`: `feat/<short-name>` or `fix/<short-name>`.
2. Make changes locally and verify by running the full lifecycle:
   ```bash
   ./clean-env.sh
   ./start-env.sh
   # smoke checks (see testing/how_to_test.md)
   ./stop-env.sh
   ```
3. Open a PR against `master`.
4. Mention any version bumps in the PR description so consumers know to update their `.env.regtest` if needed.

## Common Change Types

### Bumping a pinned image version
Edit `.env.defaults`:
```bash
FULMINE_IMAGE=ghcr.io/arklabshq/fulmine:v0.3.22
```
Verify locally with `clean-env.sh && start-env.sh && smoke-checks`. Mention the bump in the PR description.

### Adding a new service to the compose stack
1. Add the service block to `docker/docker-compose.ark.yml`.
2. Add image / port / config variables to `.env.defaults` (default values).
3. Export the new variables in `start-env.sh` so compose interpolates them.
4. Document the new service in:
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/INDEX.md` (Bundled Services table)
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/usage.md` (Service Endpoints table)
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/configuration.md` (Ports table)

### Adding a new arkd configuration variable
1. Add to `.env.defaults` under the "Arkd configuration" block.
2. Export it in `start-env.sh` (the `export ARKD_*` lines).
3. Reference it in `docker/docker-compose.arkd-override.yml` as a container env var.
4. Document in `system/configuration.md`.

### Changing nigiri behavior
- Bump `NIGIRI_BRANCH` in `.env.defaults` to point at a different branch/tag.
- Run `./start-env.sh --clean` to force a fresh build.
- Verify the nigiri version actually changed (`_build/nigiri/build/...`).

## Submodule Workflow (Consumers)

### Adding arkade-regtest to a parent repo
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
git submodule update --init --recursive
```

### Pinning versions
Create `.env.regtest` at the parent repo root (auto-discovered by the launcher):
```bash
cat > .env.regtest <<'EOF'
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0
EOF
```

Commit `.env.regtest` to the parent repo so all contributors and CI use the same versions.

### Updating the submodule
```bash
cd regtest
git fetch
git checkout master
git pull
cd ..
git add regtest
git commit -m "chore: bump regtest submodule"
```

### CI Considerations
- Always check out submodules: `actions/checkout@v4` with `submodules: true`.
- Cache `regtest/_build` keyed on `regtest/.env.defaults` + `.env.regtest` to skip nigiri rebuilds.
- Always cleanup with `if: always()` to avoid leaking containers between runs.
- Set `NIGIRI_BRANCH=""` only if the runner has nigiri preinstalled — usually not the case.

## Testing Changes Locally

There is no unit test suite. The contract is "the stack starts and the smoke checks pass."

Minimum bar before merging:
1. `./clean-env.sh && ./start-env.sh` succeeds end-to-end.
2. All endpoints in `testing/usage.md` (Service Endpoints table) respond.
3. `./helpers/create-invoice.sh && ./helpers/pay-invoice.sh <inv>` works.
4. If you changed arkd-related variables: verify both modes (default and `ARKD_IMAGE` override).

## Release / Tagging

arkade-regtest doesn't ship binaries. Versioning is by git tag for consumers that want to pin to a specific commit:
```bash
git tag v0.x.y
git push origin v0.x.y
```
Consumers typically track `master` directly via submodule for the latest.

## Coordination With Upstream Versions

When upstream projects (arkd, fulmine, boltz-backend, etc.) cut a release that breaks compatibility:
1. Bump the corresponding `*_IMAGE` variable in `.env.defaults`.
2. If new env variables are required, add them with sensible defaults.
3. Update `system/configuration.md` and `INDEX.md` if the bundled service table changes.
4. Document any breaking changes in the PR description so submodule consumers know to update `.env.regtest`.
