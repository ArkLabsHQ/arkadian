# Development Workflow

This SOP covers the day-to-day workflow for working **on the framework itself** (CLI / runtime / supervisor / clients), not for deploying an app inside an enclave (see `testing/usage.md` for that).

## Prerequisites

- Go 1.25+ (matches `go.mod`)
- Nix (for hash computation and reproducible builds)
- Docker (for `make test-docker` and reproducible EIF builds)
- `golangci-lint`
- Linux host with `vsock` + `vsock_loopback` kernel modules (for full integration tests)
- AWS CLI v2 (for live deploys, optional during local development)

## Build

```sh
make build         # produce ./enclave-cli with SDK hashes from cli/runtime-hashes.json baked via ldflags
make install       # install to $GOPATH/bin
```

Hashes are read from `cli/runtime-hashes.json` and injected via `-ldflags`:

```
-X github.com/ArkLabsHQ/introspector-enclave/cli.runtimeRev=...
-X github.com/ArkLabsHQ/introspector-enclave/cli.runtimeHash=...
-X github.com/ArkLabsHQ/introspector-enclave/cli.runtimeVendorHash=...
```

## Lint

```sh
make lint
```

Runs `golangci-lint run ./...` in **each** Go module:

- root (`cli/...`)
- `runtime/`
- `supervisor/`
- `client/`

The `lint-vet.yml` GitHub Actions workflow runs the same set on every push/PR.

## Unit Tests

```sh
go test ./...
cd runtime && go test ./...
cd supervisor && go test ./...
cd client && go test ./...
```

Existing test files (use as templates for new tests):

- `cli/build_test.go`, `cli/cli_test.go`, `cli/config_test.go`, `cli/setup_test.go`, `cli/template_test.go`
- `runtime/environment_test.go`, `runtime/log_test.go`, `runtime/metrics_test.go`, `runtime/migrate_test.go`, `runtime/policy_builder_test.go`, `runtime/signature_test.go`, `runtime/tracing_test.go`
- `supervisor/gvproxy_test.go`
- `client/verify_test.go`

## Integration Tests (full QEMU)

Required: Linux host with KVM + `vsock_loopback`.

```sh
make test          # test-build + test-run
make test-build    # builds v1/v2/v3 EIFs
make test-run      # docker compose --profile test run (no rebuild of test-runner image)
make test-rebuild  # rebuild test-runner image, then run integration tests
```

`make test-run` no longer rebuilds the test-runner image on every invocation; use `make test-rebuild` after changing `test/Dockerfile.runner` or its build-time inputs.

For macOS / ARM hosts, the build phase runs in a `linux/amd64` container; the run phase still requires Linux:

```sh
make test-build-docker     # works on macOS/ARM
make test-docker           # build-in-Docker + run; vsock_loopback Linux-only
```

CI workflow `.github/workflows/integration-test.yml` runs this on every push/PR to `master`.

## Working on Local Source vs Pinned

By default, `enclave build` fetches runtime + supervisor + your-app source from GitHub at the commits pinned in `enclave.yaml`. To build from the local working tree (useful when developing the framework itself):

```sh
RUNTIME_LOCAL_PATH=$(pwd) \
SUPERVISOR_LOCAL_PATH=$(pwd) \
APP_LOCAL_PATH=$(pwd)/test/app \
enclave-cli build
```

`make test-build` already wires this up for the test app.

## SDK Release (manual GitHub Actions)

The "Release SDK Version" workflow (`.github/workflows/sdk-hashes.yml`) is triggered manually with a version input (e.g. `v0.0.76`):

1. Validates version format (`vX.Y.Z`) and that the tag doesn't already exist.
2. Computes vendor hash via a trial Nix build of `runtime/`.
3. Computes source hash via `nix hash path` over the archived repo at HEAD.
4. Commits `cli/runtime-hashes.json`, tags, and pushes to `master`.
5. Verifies `runtime/` builds successfully with the computed hashes.

Local equivalents:

```sh
make sdk-hashes REV=v1.0.0
make vendor-hash
```

After release, downstream apps refresh by either upgrading the CLI (`go install ...@latest`) or rebuilding from source (`make build`) — the hashes are baked at build time.

### Test-rig image release (GHCR — manual)

`enclave test init` pulls two prebuilt images from GHCR, pinned to the SDK version. They are **not** built by `sdk-hashes.yml` — a maintainer must build and push them manually after each SDK release so they stay in lock-step with `cli/runtime-hashes.json::rev`. The canonical procedure lives in `test/RELEASE.md`; summary:

```sh
TAG=0.0.X   # strip the leading `v` from cli/runtime-hashes.json::rev

# awsmocks — kms-proxy + mock-imds (~20 MB). Self-contained.
docker buildx build --platform linux/amd64 \
  -f awsmocks/Dockerfile \
  -t ghcr.io/arklabshq/enclave-awsmocks:$TAG \
  -t ghcr.io/arklabshq/enclave-awsmocks:latest \
  --push awsmocks/

# test-runner — QEMU + vsock + supervisor + runner (~2 GB). Build context = repo root.
docker buildx build --platform linux/amd64 \
  -f runner/Dockerfile \
  -t ghcr.io/arklabshq/enclave-test-runner:$TAG \
  -t ghcr.io/arklabshq/enclave-test-runner:latest \
  --push .
```

Prerequisites: Docker with buildx, a GitHub PAT with `write:packages` scope (`docker login ghcr.io -u <user> -p <PAT>`). After the **first** push of each image, flip its visibility to Public in GHCR (Org → Packages → package → Settings → Change visibility) so users can pull anonymously.

## Pull Request Checklist

- [ ] `make lint` passes (all four modules).
- [ ] `go test ./...` passes in each module.
- [ ] If touching the runtime, supervisor, or test harness: `make test` passes on a Linux host with KVM + `vsock_loopback`.
- [ ] If you change the CLI's CI scaffold (`cli/framework_files.go` / `cli/template.go`), regenerate a sample template and confirm it still scaffolds correctly.
- [ ] If you change the runtime API or the management API, update `testing/api-reference.md` in this docs tree (and `README.md` in the enclave repo).
- [ ] If you change `enclave.yaml` schema, update `testing/usage.md`.

## Commit Message Convention

Follow conventional commits:

- `feat(cli): ...`
- `feat(runtime): ...`
- `fix(supervisor): ...`
- `docs: ...`
- `test: ...`
- `chore: ...`

## Useful Files

| File | Purpose |
|------|---------|
| `Makefile` | All build / lint / test targets |
| `Cargo.toml` | Rust workspace declaring `client-rs/` |
| `cli/runtime-hashes.json` | Cached SDK Nix hashes (committed) |
| `cli/version.go` | Hash variables set via `ldflags` |
| `cli/framework_files.go` | Framework files embedded as Go string constants for the template |
| `cli/tofu_files.go` | OpenTofu module files embedded as Go strings |
| `runtime/nitriding/` | Nitriding configuration |
| `runtime/viproxy/` | viproxy IMDS forwarder |
| `test/run.sh` | Top-level 7-step E2E test orchestration |
| `test/integration-test.sh` | The 15-test integration suite |
| `test/Dockerfile.runner` | QEMU 9.2.4 + vhost-device-vsock + gvproxy multi-stage builder |
| `Dockerfile` | Reproducible builder image (linux/amd64) for `make test-build-docker` |
