# How to Test

Simple Enclave's local test harness boots a real EIF inside QEMU's `nitro-enclave` machine type with mocked AWS services (LocalStack + KMS proxy + mock IMDS), then runs 15 integration tests followed by a full locked-key migration with post-migration verification.

## Quick Start

### Docker Compose (CI path)

```sh
# 1. Build the test EIF (requires Nix on host)
go build -o /tmp/enclave-cli ./cli/cmd/enclave
cd test/app && /tmp/enclave-cli build

# 2. Run all tests
cd test && docker compose --profile test run --build test-runner
```

### Native with Nix

```sh
cd test && nix develop . --command ./run.sh
```

### Make Targets

```sh
make test                # test-build + test-run
make test-build          # build v1 / v2 / v3 EIFs (rollback test scenario)
make test-run            # docker compose --profile test run --build test-runner
make test-build-docker   # run test-build inside linux/amd64 container (macOS/ARM hosts)
make test-docker         # test-build-docker + test-run (vsock_loopback required — Linux only)
```

## What Gets Built

`make test-build` builds three EIF versions to exercise the upgrade chain:

| Version | `previous_pcr0` | Purpose |
|---------|-----------------|---------|
| v1 (`0.0.1`) | (none — genesis) | Initial deployment |
| v2 (`0.0.2`) | PCR0 of v1 (auto-discovered) | Valid upgrade — chain extends |
| v3 (`0.0.3`) | `0x...ff` (deliberately wrong) | Rollback test — chain rejected |

After the build, all three EIFs and PCR JSON files are copied into `test/app/.enclave/artifacts/` (`image-v1.eif`, `pcr-v1.json`, etc., plus `image.eif` = v1 default).

## What Gets Tested

15 integration tests run after enclave boot (`test/integration-test.sh`):

| # | Test |
|---|------|
| 1 | `/health` returns HTTP 200 |
| 2 | `/v1/enclave-info` JSON is valid |
| 3 | Init completed without errors |
| 4 | BIP-340 Schnorr signature verification |
| 5 | SDK version field present |
| 6 | App proxy works (request reaches user app via nitriding) |
| 7 | KMS secrets loaded (SIGNING_KEY decrypted, correct length) |
| 8 | Encrypted storage round-trip (PUT/GET/DELETE) |
| 9 | `previous_pcr0` field present |
| 10 | Dynamic secrets round-trip (PUT/GET/LIST/DELETE) |
| 11 | PCR16 extended with SHA256(compressed secp256k1 pubkey) |
| 12 | Storage persistence write (for migration verification) |
| 13 | Dynamic secret persistence write (for migration verification) |
| 14 | Attestation persistence write (pubkey + PCR16 hash) |
| 15 | Pre-migration Schnorr signature baseline |

**Migration verification** then runs a full locked-key migration and confirms:

- Secrets decrypted from the new KMS key
- Persistent storage survived
- Dynamic secrets preserved
- Attestation key (`SIGNING_KEY`) unchanged across migration
- PCR0 attestation chain intact

## Test Infrastructure

| Component | Port | Purpose |
|-----------|------|---------|
| Enclave (QEMU via gvproxy) | 8443 | TLS-terminated enclave |
| Supervisor (host-side) | 8444 | Migration orchestration |
| LocalStack | 4566 | S3, SSM, STS mocks |
| KMS proxy | 4000 | Custom KMS mock |
| Mock IMDS | 1338 | EC2 instance metadata mock |

The test runner image (`test/Dockerfile.runner`) builds **QEMU 9.2.4** (first version with the `nitro-enclave` machine type), `vhost-device-vsock 0.3.0`, `gvproxy 0.8.6`, and the CLI/supervisor binaries in a multi-stage build.

## Test Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BOOT_TIMEOUT` | `90` (CI: `120`) | Seconds to wait for QEMU boot |
| `INIT_TIMEOUT` | `120` (CI: `300`) | Seconds to wait for enclave Init |
| `HOST_TLS_PORT` | `8443` | Enclave TLS port on host |
| `RUNTIME_LOCAL_PATH` | (unset) | Build runtime from local source instead of fetching from GitHub |
| `SUPERVISOR_LOCAL_PATH` | (unset) | Build supervisor from local source |
| `APP_LOCAL_PATH` | (unset) | Build user app from local source |

## CI

`.github/workflows/integration-test.yml` runs on every push/PR to `master`:

1. Sets up KVM (`chmod 666 /dev/kvm`).
2. Loads `vsock` and `vsock_loopback` kernel modules.
3. Installs Nix (channel `nixos-25.11`, flakes + magic Nix cache).
4. Sets up Go from `go.mod`.
5. Builds `enclave-cli`, vendors runtime + test/app deps, and runs the v1/v2/v3 build sequence (mirrors `make test-build`).
6. `cd test && docker compose --profile test run --build test-runner` with `BOOT_TIMEOUT=120 INIT_TIMEOUT=300`.

## Lint & Vet

```sh
make lint
```

Runs `golangci-lint run ./...` in each Go module:

- root (`cli/...`)
- `runtime/`
- `supervisor/`
- `client/`

The `lint-vet.yml` GitHub Actions workflow runs the same.

## Other Test Files

- `cli/build_test.go`, `cli/cli_test.go`, `cli/config_test.go`, `cli/setup_test.go`, `cli/template_test.go` — CLI-level Go unit tests.
- `runtime/environment_test.go`, `runtime/log_test.go`, `runtime/metrics_test.go`, `runtime/migrate_test.go`, `runtime/policy_builder_test.go`, `runtime/tracing_test.go` — runtime unit tests.
- `supervisor/gvproxy_test.go` — supervisor unit tests.
- `client/verify_test.go` — client attestation verification tests.

Run all Go unit tests:

```sh
go test ./...
cd runtime && go test ./...
cd supervisor && go test ./...
cd client && go test ./...
```

## SDK Release Verification

`.github/workflows/sdk-hashes.yml` (manual `workflow_dispatch` with version input):

1. Validates version format (`vX.Y.Z`) and that the tag doesn't already exist.
2. Computes vendor hash via trial Nix build of `runtime`.
3. Computes source hash via `nix hash path` over the archived repo at HEAD.
4. Commits `cli/runtime-hashes.json`, tags, pushes to `master`.
5. Verifies `runtime` builds successfully with the computed hashes.
