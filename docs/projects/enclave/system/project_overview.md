# Simple Enclave — Project Overview

## What

**Simple Enclave** (Go module `github.com/ArkLabsHQ/introspector-enclave`) is a CLI framework + runtime SDK for running plain HTTP applications inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, and reproducible Nix-based EIF builds.

Apps need **zero enclave-specific code** — the runtime supervisor handles attestation, KMS secret decryption, PCR extension, response signing, encrypted storage, and dynamic secrets. Your app is a plain HTTP server on port 7074.

## Why

Confidential computing on AWS Nitro requires a substantial amount of glue: TLS termination, vsock networking, KMS attestation, secret bootstrap, response signing, build reproducibility for verifiable PCR0 measurements, and key migration. Simple Enclave packages all of that into a single CLI + supervisor binary so application teams ship a normal web server and inherit the security model.

## Core Components

| Component | Role | Code |
|-----------|------|------|
| `cli/` | `enclave` CLI (init, setup, build, deploy, verify, lock, migrate, **test**, …). The `enclave test` subcommand suite (`build` / `init` / `start` / `down`) scaffolds and runs `enclave/test/docker-compose.yml` for upstream-app local QEMU testing. | Go |
| `runtime/` | In-enclave binary — owns the TLS edge, attestation routes (`/enclave/*`), admin routes (`/v1/*`), response-signing + gRPC-bypass middleware, the catch-all HTTP/2 reverse proxy to the user app, KMS, storage, secrets, migration, PCR0-signature SSM loading (`runtime/signature.go`), and OTLP-ingest endpoints `POST /v1/{metrics,traces,logs}` alongside the JSON-snapshot GETs `/v1/enclave-{metrics,traces,logs}`. The standalone `nitriding.Enclave` struct was folded into `runtime.Runtime` in v0.0.76 — `cmd/runtime/main.go` constructs a single `*runtime.Runtime` via `New(cfg)`. | Go |
| `runtime/nitriding/` | Leaf utilities (`Cache`, `BufPool`, `CertCache`, `SetFdLimit`, `ConfigureLoIface`, `RunNetworking`, `Attest`, `NewLimitReader`, `InEnclave`, `/dev/nsm` entropy seeding via `package_init`). No longer owns the TLS edge or admin handlers. | Go |
| `supervisor/` | Host-side single-process supervisor — gvproxy, viproxy/IMDS, nitro-cli watchdog, management API. Proxies enclave OTEL metrics → Prometheus text on `:8443/metrics`. | Go |
| `client/` | Verified Go HTTP client — verifies attestation document + Schnorr signatures on every response. `GRPCConn(ctx)` returns a `*grpc.ClientConn` whose TLS handshake pins the leaf cert fingerprint to the attestation `tlsKeyHash` (gRPC bypasses response-signing). | Go |
| `client-rs/` | Verified Rust HTTP client (workspace `Cargo.toml` member) | Rust |
| `awsmocks/` | Combined kms-proxy (`:4000`) + mock-imds (`:1338`) in one Go binary, published as `ghcr.io/arklabshq/enclave-awsmocks:<version>` per release. Replaces the former `test/local-kms-proxy/` + `test/mock-imds/` directories. | Go + Docker |
| `runner/` | Test-runner entrypoint baked into `ghcr.io/arklabshq/enclave-test-runner:<version>`: seeds SSM, brings up vhost-device-vsock + heartbeat, then spawns the supervisor whose watchdog re-invokes the runner with `--boot-only <eif>` to fire QEMU. Replaces `test/heartbeat.py` (inlined as `runner/heartbeat.go`). Used by upstream apps via `enclave test start`. | Go + Docker |
| `test/` | QEMU-based local integration test harness for the framework itself (`-M nitro-enclave`, mock KMS/SSM/S3/IMDS via `awsmocks` + LocalStack). `test/run.sh` is the framework's own self-test orchestrator. | Bash + Go + Docker Compose |

## Supported Application Languages

| Language | Min Version | Nix Build System | Dep Mechanism |
|----------|-------------|------------------|---------------|
| **Go** | 1.25+ | `buildGoModule` | `vendorHash` from `go.sum` |
| **Node.js** | 22+ | `buildNpmPackage` | `npmDepsHash` from `package-lock.json` |
| **.NET** | 10.0+ | `buildDotnetModule` | `deps.json` via `fetch-deps` |

## Key Capabilities

- **Reproducible EIF builds** — pinned NixOS Docker container produces byte-identical EIF, so PCR0 is independently verifiable.
- **PCR0-locked KMS** — secret KMS key policy permits `kms:Decrypt` only when `RecipientAttestation:PCR0` matches the enclave measurement. Admins can rewrite the policy (default), or freeze it permanently with `is_kms_key_locked: true`.
- **BIP-340 Schnorr response signing** — every HTTP response carries `X-Attestation-Signature` and `X-Attestation-Pubkey`; the pubkey hash is bound to the attestation document's `UserData`.
- **PCR16+ extension** — at boot, supervisor extends PCR registers with `SHA256(compressed_secp256k1_pubkey)` per configured secret, binding cryptographic identity to PCR values.
- **Encrypted persistent storage** — `PUT/GET/DELETE/LIST /v1/storage/{key}` backed by S3 + AES-256-GCM with a KMS-protected Data Encryption Key (DEK).
- **Dynamic secrets** — runtime-mutable secrets stored encrypted in S3, optionally bound to env vars on boot.
- **Locked-key migration** — 7-step in-place re-encryption flow (`POST /migrate`) for rotating to a new PCR0 even when the KMS policy is irreversibly frozen. The old enclave inline-creates the migration key (PCR0 set immutable from birth: `[ownPCR0, newPCR0]`), re-encrypts each secret + storage DEK to key-scoped SSM paths `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`, and the atomic `PutParameter` on `/{dep}/{app}/KMSKeyID` is the commit point — no two-phase `/Migration/*` staging, no `PromoteToPrimary` / `AbortOrphaned`. The supervisor never touches KMS; it just orchestrates cooldown / start-migration / EIF swap / health poll / rollback / cleanup.
- **Enclave-owned KMS keys** — the runtime creates both the primary key (on first boot via `EnsureKeyID`, gated by an `"UNSET"` SSM placeholder written by Tofu) and the migration key (`CreateMigrationKey` during `/v1/start-migration`) with PCR0-locked policies sealed at `CreateKey` time. No external principal ever holds `kms:PutKeyPolicy` on either key; the EC2 role's IAM no longer carries `kms:PutKeyPolicy` at all.
- **PCR0 attestation chain** — each version records its predecessor's PCR0 + an NSM signed proof (`previous_pcr0` is `"genesis"` on first boot). `enclave verify` walks the chain. The runtime no longer validates a baked-in predecessor PCR0 — the value is still measured into PCR0 for external auditors but is not enforced at startup.
- **Build-time vs deploy-time env** — `app.env` baked into PCR0; `env_values` (TF_VAR / .auto.tfvars.json / -var) overlay at boot without rebuilding the EIF (schema attested, values not).
- **Two artifact-source modes** — Tofu uploads local artifacts (default) or curls them from a published GitHub Release at apply time (`enclave tofu --remote`).
- **CI scaffolding** — `enclave init`/`generate template` writes `deploy-enclave.yml`, `destroy-enclave.yml`, `verify-enclave.yml` with OIDC, GitHub artifact attestations, and an attestation status page on `gh-pages`.
- **Inbound HTTP/2 + gRPC end-to-end** (issue #85) — `pubSrv`'s TLS configs advertise `h2` in ALPN (MinVersion TLS 1.2); the internal `revProxy` uses `http2.Transport{AllowHTTP: true}` with `FlushInterval = -1` so gRPC trailers and server-streaming responses survive the loopback hop. `Runtime.Middleware` short-circuits for `application/grpc*` and `application/grpc-web*` so signing/buffering doesn't break streams. The Go client exposes `client.GRPCConn(ctx)` whose TLS handshake pins the leaf cert fingerprint to the attestation document's `tlsKeyHash` (no per-response Schnorr — trust at handshake).
- **Single-hop in-enclave request path** — the legacy intermediate `:7073` runtime-proxy hop is gone. `external client → gvproxy → pubSrv :443 → revProxy (h2c) → user app :7074` is one hop; admin `/v1/*` and attestation `/enclave/*` mount on the same chi mux and are also exposed on `privSrv :8080` (loopback) for user-app callbacks. The user app gets `ENCLAVE_PROXY_PORT = cfg.IntPort` injected.
- **Listener-error propagation** — `Runtime.ListenErr()` surfaces the first bind/serve failure on either listener; `cmd/runtime/main.go` exits non-zero rather than leaving an enclave with no working external endpoint.
- **Tofu-provisioned PCR0 signing** — `enclave tofu` mints a dedicated `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY`, `prevent_destroy = true`, 30-day deletion window) and a `terraform_data.sign_pcr0` provisioner that, at `tofu apply` time, signs the live PCR0 with `ECDSA_SHA_384` via `aws kms sign`, exports the public key in PEM, and writes the triple to SSM under `/{dep}/{app}/Signing/{PubkeyPEM,PCR0,Signature}`. The runtime's `Signature.Load` reads those parameters on `Init`; when present, `GET /v1/enclave-info` carries a `pcr0_signature: { pubkey_pem, pcr0_hex, signature_b64 }` block (`omitempty` — absent when signing isn't provisioned). External verifiers therefore have a stable AWS-rooted attestation of PCR0 independent of NSM. There is **no** `signing:` field in `enclave.yaml` — provisioning is purely a property of the Tofu module.
- **OTLP/HTTP-aligned telemetry ingest** — POST endpoints follow the OTLP/HTTP spec (`POST /v1/metrics`, `POST /v1/traces`, `POST /v1/logs`) so a standard OTEL SDK exporter works without URL overrides. The introspection GETs keep the `enclave-` prefix (`GET /v1/enclave-metrics`, `GET /v1/enclave-traces`, `GET /v1/enclave-logs`) to distinguish JSON snapshots from OTLP ingest.
- **Local QEMU test harness** — `test/run.sh` boots the EIF inside QEMU `-M nitro-enclave` (vhost-device-vsock), runs 35 integration tests (now incl. ALPN h2 negotiation, HTTP/1.1 compat, gRPC unary `Health/Check`, gRPC server-streaming `Health/Watch`, gRPC middleware-bypass, PCR0-signature presence in `/v1/enclave-info`, and ECDSA-P384 PCR0-signature verification via `openssl pkeyutl`), then exercises a full locked-key migration with post-migration verification.
- **Upstream-app test rig (image-based)** — `enclave test {init,build,start,down}` CLI subcommands scaffold and run `enclave/test/docker-compose.yml`. The compose file pulls two GHCR images per release: `ghcr.io/arklabshq/enclave-awsmocks` (combined KMS proxy + mock IMDS) and `ghcr.io/arklabshq/enclave-test-runner` (QEMU + vhost-device-vsock + supervisor + runner). Upstream apps append their own mock services below the `# === user services below this line ===` marker without editing framework-owned blocks.

## Use Cases

- Deploying a Bitcoin/Ark co-signer or key-custody service that must prove its code identity.
- Running a wallet or KMS-style microservice where private keys decrypt only inside an attested enclave.
- Operating an oracle / signing service whose responses are verifiable end-to-end via Schnorr signatures bound to PCR0.
- Hosting any HTTP service that needs hardware-attested secret bootstrap and audit-grade verifiability.

## Security Model (one-line summary)

> **Plaintext only ever exists inside an attested enclave.** Recovery means rewriting the KMS policy to authorise a new PCR0, never granting `kms:Decrypt` to a human; with `is_kms_key_locked: true`, even policy rewrite is impossible — only the exact attested PCR0 can decrypt, forever.

## Repository Layout

```
.
├── cli/                  # enclave CLI (Cobra) — entry: cli/cmd/enclave/main.go
├── runtime/              # in-enclave runtime binary (own go.mod) — owns TLS edge, /v1/*, /enclave/*, revProxy
│   └── nitriding/        # leaf utilities only (Cache, BufPool, CertCache, RunNetworking, Attest, …)
├── supervisor/           # host-side supervisor binary
├── client/               # Verified Go HTTP client (client.go, verify.go, grpc.go)
├── client-rs/            # Verified Rust HTTP client (Cargo workspace)
├── awsmocks/             # Combined kms-proxy + mock-imds binary, published as ghcr.io/arklabshq/enclave-awsmocks
├── runner/               # Test-runner entrypoint baked into ghcr.io/arklabshq/enclave-test-runner
├── test/                 # Framework's own QEMU + Docker Compose self-test (run.sh, integration-test.sh, app/)
│   ├── README.md         # Local QEMU testing guide
│   └── RELEASE.md        # GHCR image release flow for awsmocks + test-runner
├── ARCHITECTURE.md       # 18-section detailed flow diagrams (build → boot → migration)
├── OPERATIONS.md         # Monitoring, scaling, recovery, migration runbook
├── TROUBLESHOOTING.md    # Common errors, log locations, debug procedures
├── README.md             # Top-level user guide (~740 lines)
├── framework.md          # Internal technical report
├── Makefile              # build / install / lint / test / test-docker
├── Dockerfile            # Reproducible builder image (linux/amd64)
└── .github/workflows/    # sdk-hashes.yml, integration-test.yml, lint-vet.yml
```
