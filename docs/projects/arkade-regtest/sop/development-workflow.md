# Development Workflow

Standard operating procedure for contributing to arkade-regtest and for consuming it as a submodule.

## Repository Layout

```
arkade-regtest/
├── regtest.mjs                      # Node CLI entry point (all commands)
├── package.json                     # npm aliases (start/stop/clean), bin
├── lib/
│   ├── env.mjs                      # env discovery + loading
│   ├── compose.mjs                  # profile → dependency closure → compose up
│   ├── chain.mjs                    # auto-miner, mine, reorg, faucet, rpc
│   ├── lnd.mjs / invoice.mjs        # Lightning helpers
│   ├── proc.mjs / wait.mjs / log.mjs# process spawning, readiness waits, logging
│   └── setup/
│       ├── arkd.mjs                 # wallet seed/create/unlock, client funding
│       ├── boltz.mjs / fulmine.mjs  # boltz + fulmine wiring
│       ├── signer.mjs               # signer-state seeding / rotation
│       └── solver.mjs               # solver setup
├── docker/
│   ├── compose.base.yml             # chain + indexers + explorer + counterparty LN
│   ├── compose.ark.yml              # arkd, boltz, fulmine, delegator, wallet, explorer, emulator, solver
│   └── compose.emulator.yml         # emulator overlay (profile-gated)
├── helpers/create-invoice.sh, pay-invoice.sh
├── .env.defaults                    # baseline env (images, ports, arkd config)
└── README.md
```

There is no compiled code. All changes are to `regtest.mjs` / `lib/*.mjs`, the compose files, or the env baseline.

## Branching & PRs

1. Branch from `master`: `feat/<short-name>` or `fix/<short-name>`.
2. Make changes and verify by running the full lifecycle:
   ```bash
   node regtest.mjs clean
   node regtest.mjs start
   # smoke checks (see testing/how_to_test.md)
   node regtest.mjs stop
   ```
3. Open a PR against `master`.
4. Mention any version bumps in the PR description so consumers know to update their `.env.regtest`.

## Common Change Types

### Bumping a pinned image version
Edit `.env.defaults`:
```bash
FULMINE_IMAGE=ghcr.io/arklabshq/fulmine:v0.3.25
```
Verify with `clean && start && smoke-checks`. Mention the bump in the PR.

### Adding a new service to the compose stack
1. Add the service block to the appropriate compose file (`docker/compose.base.yml` or `compose.ark.yml`) and assign it a profile.
2. Add image / port / config variables to `.env.defaults` (`${VAR:-default}` for host ports).
3. Wire any setup into `lib/setup/` and the profile dependency closure in `lib/compose.mjs`.
4. Document the new service in:
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/INDEX.md` (Bundled Services + Profiles tables)
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/usage.md` (Service Endpoints table)
   - `${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/configuration.md` (images + ports tables)

### Adding a new arkd configuration variable
1. Add it to `.env.defaults` under the arkd configuration block.
2. Reference it as a container env var in `docker/compose.ark.yml`.
3. Document it in `system/configuration.md`.

### Adding a CLI command
1. Add the subcommand handler in `regtest.mjs` (delegating to a `lib/*.mjs` module).
2. Update the README command list and `testing/usage.md`.

## Submodule Workflow (Consumers)

### Adding arkade-regtest to a parent repo
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
git submodule update --init --recursive
```

### Pinning versions / profiles
Create `.env.regtest` at the parent repo root (auto-discovered by the CLI):
```bash
cat > .env.regtest <<'EOF'
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1
REGTEST_PROFILES=ark,boltz
EOF
```
Commit `.env.regtest` so all contributors and CI use the same versions/profiles.

### Updating the submodule
```bash
cd regtest && git fetch && git checkout master && git pull && cd ..
git add regtest
git commit -m "chore: bump regtest submodule"
```

### CI Considerations
- Check out submodules: `actions/checkout@v4` with `submodules: true`.
- Use `actions/setup-node@v4` (Node ≥ 18). **No Go setup and no nigiri cache** are needed.
- Always cleanup with `if: always()` (`node regtest/regtest.mjs clean`) to avoid leaking containers.

## Testing Changes Locally

There is no unit test suite. The contract is "the stack starts and the smoke checks pass."

Minimum bar before merging:
1. `node regtest.mjs clean && node regtest.mjs start` succeeds end-to-end.
2. All endpoints in `testing/usage.md` (Service Endpoints table) respond.
3. `node regtest.mjs create-invoice && node regtest.mjs pay-invoice <inv>` works.
4. If you changed arkd config or signer rotation: verify with `node regtest.mjs signer-info` and a rotation round-trip.

## Release / Tagging

arkade-regtest doesn't ship binaries. Versioning is by git tag for consumers that want to pin a commit:
```bash
git tag v0.x.y && git push origin v0.x.y
```
Consumers typically track `master` directly via submodule.

## Coordination With Upstream Versions

When upstream projects (arkd, fulmine, boltz-backend, emulator, solver) cut a release that breaks compatibility:
1. Bump the corresponding `*_IMAGE` variable in `.env.defaults`.
2. Add any new env variables with sensible defaults.
3. Update `system/configuration.md` and `INDEX.md` if the bundled service / profile tables change.
4. Document breaking changes in the PR so submodule consumers know to update `.env.regtest`.
