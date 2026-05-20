# How to Test

Simple Enclave's local test harness boots a real EIF inside QEMU's `nitro-enclave` machine type with mocked AWS services (LocalStack + the combined `awsmocks` binary, which bundles kms-proxy and mock-imds in one container), then runs 35 integration tests followed by a full locked-key migration with post-migration verification. The HTTP/2 + gRPC tail (29 – 33, issue #85) covers end-to-end HTTP/2 (ALPN h2 negotiation, HTTP/1.1 backward compat) and gRPC (unary `Health/Check`, server-streaming `Health/Watch`, middleware bypass). Tests 34 – 35 (added with the PCR0-signing feature) confirm that `pcr0_signature` is exposed on `/v1/enclave-info` and that `openssl pkeyutl -verify` validates the signature against the embedded public key.

> **Upstream-app testing (image-based).** As of v0.0.76, upstream apps don't build the test rig from source. The CLI ships an `enclave test` subcommand suite (`build` / `init` / `start` / `down`) that scaffolds `enclave/test/docker-compose.yml`, pulls the prebuilt GHCR images (`ghcr.io/arklabshq/enclave-awsmocks:<rev>` and `ghcr.io/arklabshq/enclave-test-runner:<rev>` where `<rev>` matches `cli/runtime-hashes.json::rev` with the leading `v` stripped), and brings the stack up. See **Upstream-app workflow** below. The framework's own self-test (this page) still builds everything from source.

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

| Version | `previous_pcr0` | App name | Purpose |
|---------|-----------------|---------|---------|
| v1 (`0.0.1`) | (none — genesis) | `my-app` | Initial deployment |
| v2 (`0.0.2`) | PCR0 of v1 (auto-discovered) | `my-app` | Valid upgrade — chain extends |
| v3 (`0.0.3`) | PCR0 of v2 | `my-app-wrong` | Rollback test — `EnsureKeyID` fails because the wrong-name SSM path is not in the IAM scope, the enclave never reaches `/health=200`, the supervisor's `awaitEnclaveReady` times out, and `rollbackMigration` fires. Previously v3 was baked with a deliberately-wrong target PCR0; since the new enclave now self-admits to the migration key after attestation, the wrong-PCR0 vector no longer trips rollback. |

After the build, all three EIFs and PCR JSON files are copied into `test/app/.enclave/artifacts/` (`image-v1.eif`, `pcr-v1.json`, etc., plus `image.eif` = v1 default).

## What Gets Tested

35 integration tests run after enclave boot (`test/integration-test.sh`), grouped roughly as: core (1–17), telemetry (20–28), runtime metrics (29), final attestation stability (30), HTTP/2 + gRPC (29–33 — note: numbering restarts within the gRPC block per the script's own comments), and PCR0 signing (34–35):

| # | Test |
|---|------|
| 1 | `/health` returns HTTP 200 |
| 2 | `/v1/enclave-info` JSON is valid |
| 3 | Init completed without errors |
| 4 | BIP-340 Schnorr signature verification (end-to-end inside enclave) |
| 5 | Runtime version present |
| 6 | App endpoint responds through the nitriding-fronted catch-all proxy |
| 7 | KMS secrets loaded (SIGNING_KEY decrypted, correct length) |
| 8 | Encrypted storage round-trip (PUT/GET/DELETE via S3+KMS) |
| 9 | `previous_pcr0 == "genesis"` on first boot |
| 10 | Dynamic secrets round-trip (PUT/GET/LIST/DELETE) |
| 11 | PCR16 extended with SHA256(compressed secp256k1 pubkey) per configured secret |
| 12 | Full attestation document structure verification |
| 13 | Storage persistence write (for migration verification) |
| 14 | Dynamic secret persistence write (for migration verification) |
| 15 | Attestation persistence write (pubkey + PCR16 hash) |
| 16 | Pre-migration Schnorr signature baseline |
| 17 | Attestation binding (pubkey → `appKeyHash` in attestation doc UserData) |
| 20–23 | Log POST (app → supervisor) + GET, level filtering, auth-token requirement, CloudWatch history |
| 24–26 | Tracing: trigger app spans → query `/enclave-traces`; supervisor init spans; shared buffer |
| 27–29 | Metric snapshot via supervisor, supervisor counters, runtime metrics (goroutines, heap) |
| 30 | Final attestation works after the full suite (NSM stability) |
| 29 (HTTP/2) | HTTP/2 negotiated end-to-end via ALPN |
| 30 (HTTP/2) | HTTP/1.1 still works (backward compatibility) |
| 31 | gRPC unary — `grpc.health.v1.Health/Check` returns `SERVING` |
| 32 | gRPC server-streaming — `grpc.health.v1.Health/Watch` yields ≥ 1 message |
| 33 | gRPC bypasses response-signing middleware (no `X-Attestation-*` headers, trailers preserved) |
| 34 | `pcr0_signature` is present on `/v1/enclave-info` (Tofu provisioned the signing block) and carries non-empty `pubkey_pem` / `pcr0_hex` / `signature_b64` |
| 35 | ECDSA-P384 PCR0 signature verifies via `openssl pkeyutl -verify` against the embedded public key + raw PCR0 bytes |

**Migration verification** then runs a full locked-key migration and confirms:

- Secrets decrypted from the new KMS key
- Persistent storage survived
- Dynamic secrets preserved
- Attestation key (`SIGNING_KEY`) unchanged across migration
- PCR0 attestation chain intact

## Test Infrastructure

| Component | Port | Purpose |
|-----------|------|---------|
| Enclave (QEMU via gvproxy) | 8443 | TLS-terminated enclave (ALPN: `h2`, `http/1.1`) |
| Supervisor (host-side) | 8444 | Migration orchestration |
| LocalStack | 4566 | S3, SSM, STS mocks |
| `awsmocks` (single container) | 4000 + 1338 | Combined kms-proxy (`:4000`) + mock-imds (`:1338`); replaces the prior separate `local-kms-proxy` and `mock-imds` services |
| local-kms | 8080 | `nsmithuk/local-kms` upstream (proxied by awsmocks for attestation-based Decrypt) |

The test runner image (`test/Dockerfile.runner`) builds **QEMU 9.2.4** (first version with the `nitro-enclave` machine type), `vhost-device-vsock 0.3.0`, `gvproxy 0.8.6`, **grpcurl 1.9.1** (for the gRPC test cases added in v0.0.76), and the CLI/supervisor binaries in a multi-stage build. The `awsmocks` image (`awsmocks/Dockerfile`, ~20 MB) is built from `awsmocks/` at the repo root; for upstream-app testing it is pulled prebuilt from `ghcr.io/arklabshq/enclave-awsmocks`.

### Test-rig images for upstream apps

| Image | Source | Purpose |
|-------|--------|---------|
| `ghcr.io/arklabshq/enclave-awsmocks:<rev>` | `awsmocks/Dockerfile` | Combined kms-proxy + mock-imds (~20 MB). Self-contained. |
| `ghcr.io/arklabshq/enclave-test-runner:<rev>` | `runner/Dockerfile` (build context = repo root) | Bundles QEMU + vhost-device-vsock + supervisor + the `runner` binary (~2 GB). |

`<rev>` matches `cli/runtime-hashes.json::rev` with the leading `v` stripped (e.g. tag `v0.0.76` → image tag `0.0.76`). When a new framework version is cut, a maintainer **manually** builds and pushes both images so they stay in lock-step with the CLI — see `test/RELEASE.md` and `sop/development-workflow.md`.

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

## Upstream-app workflow (`enclave test`)

Apps consuming the framework run integration tests against their own EIF without depending on the framework's Nix flake or `test/run.sh`. The CLI provides a four-step workflow that maps onto Docker Compose:

```sh
enclave test build    # build the test EIF from enclave/enclave_test.yaml
                      #   (falls back to enclave/enclave.yaml; -c overrides)
enclave test init     # scaffold enclave/test/docker-compose.yml on first run.
                      # Hand-edit it to add app-specific mock services below the
                      # `# === user services below this line ===` marker.
enclave test start    # docker compose up -d --build the whole stack
                      # (under project name `enclave-test`) and poll
                      # https://127.0.0.1:8443/health until ready
                      # (or until 5 min elapses).
enclave test down     # docker compose down -v
```

The scaffolded `docker-compose.yml` pulls `ghcr.io/arklabshq/enclave-awsmocks` and `ghcr.io/arklabshq/enclave-test-runner` at the version pinned in `cli/runtime-hashes.json`. The `# === user services below this line ===` marker sits inside the `services:` map at 4-space indent so user-appended blocks nest correctly — don't add a second `services:` key. Wire boot ordering by appending the service name to `test-runner.depends_on`.

## SDK Release Verification

`.github/workflows/sdk-hashes.yml` (manual `workflow_dispatch` with version input):

1. Validates version format (`vX.Y.Z`) and that the tag doesn't already exist.
2. Computes vendor hash via trial Nix build of `runtime`.
3. Computes source hash via `nix hash path` over the archived repo at HEAD.
4. Commits `cli/runtime-hashes.json`, tags, pushes to `master`.
5. Verifies `runtime` builds successfully with the computed hashes.
