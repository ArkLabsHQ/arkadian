---
project_id: enclave
default_sections_by_intent:
  qna:        ["system/project_overview.md", "system/architecture.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md", "testing/api-reference.md"]
  debug:      ["testing/troubleshooting.md", "testing/api-reference.md"]
  monitoring: ["testing/troubleshooting.md", "system/architecture.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  api: ["testing/api-reference.md"]
  ops: ["testing/troubleshooting.md"]
scripts:
  build: "make build"
  install: "make install"
  lint: "make lint"
  test: "make test"
  test_build: "make test-build"
  test_run: "make test-run"
  test_docker: "make test-docker"
---

# Simple Enclave — Project Index

**enclave** (Go module: `github.com/ArkLabsHQ/introspector-enclave`) is a CLI framework + runtime SDK for deploying any plain HTTP server inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, reproducible Nix-based EIF builds, and a PCR0-locked KMS confidentiality root. It supports Go, Node.js, and .NET app templates with zero enclave-specific application code.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/enclave/system/` — System Architecture & Components
- **system/project_overview.md** — What Simple Enclave is, components, and use cases
- **system/architecture.md** — Components, boot flow, KMS lockdown, migration

### `${ARKADIAN_DIR}/docs/projects/enclave/testing/` — Usage & Operations
- **testing/usage.md** — Quick start, configuration, deploy, verify
- **testing/api-reference.md** — Supervisor + management API endpoints
- **testing/how_to_run.md** — Deploy, build, lifecycle commands
- **testing/how_to_test.md** — Local QEMU integration test harness
- **testing/troubleshooting.md** — Common errors, log locations, debug procedures

### `${ARKADIAN_DIR}/docs/projects/enclave/sop/` — Standard Operating Procedures
- **sop/development-workflow.md** — Build, test, lint, release workflow

### `${ARKADIAN_DIR}/docs/projects/enclave/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History
- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

| Item | Value |
|------|-------|
| Language | Go 1.25+ (CLI/SDK), Rust workspace (`client-rs`) |
| Module | `github.com/ArkLabsHQ/introspector-enclave` |
| Repository | `${ENCLAVE_REPO}` |
| GitHub | `ArkLabsHQ/enclave` |
| Latest Release | `v0.0.78` (see `cli/runtime-hashes.json`) |
| Components | `cli/`, `runtime/` (+ `runtime/nitriding/` leaf utils), `supervisor/`, `client/`, `client-rs/`, `awsmocks/`, `runner/` |
| Default Ports | `:443` (TLS edge, `runtime.Runtime` `pubSrv`, ALPN `h2`/`http/1.1`), `127.0.0.1:8080` (internal loopback admin/attestation mux, `privSrv` — was `:7073` pre-v0.0.76), `:7074` (user app, h2c-capable), `127.0.0.1:8443` (host supervisor management API; reached over SSM Session Manager port-forwarding by `log` / `trace` / `metrics`) |
| Upstream Protocol | `ENCLAVE_NITRIDING_UPSTREAM` selects the `revProxy → user app` HTTP version: `auto` (default — match inbound per request via `protocolSwitchTransport`), `h2c` (pin HTTP/2 cleartext, required for gRPC), or `h1` (pin HTTP/1.1). |
| Admin CORS | `/v1/*` admin handlers are wrapped in `corsWildcard` — wildcard `Access-Control-Allow-{Origin,Methods,Headers,Expose-Headers}` + `Max-Age: 600`, `OPTIONS` short-circuits with `204`. The catch-all upstream proxy is **not** wrapped; the user app sets its own CORS. |
| Test-rig Images | `ghcr.io/arklabshq/enclave-awsmocks:<rev>`, `ghcr.io/arklabshq/enclave-test-runner:<rev>` (`<rev>` = `cli/runtime-hashes.json::rev` without leading `v`) |
| Build System | Nix (reproducible, byte-identical EIF) inside pinned Docker container |
| Target Hardware | AWS Nitro Enclaves (m6i.xlarge, Amazon Linux 2023) |
| Networking | gvproxy (vsock:1024), viproxy (IMDS via vsock CID 3:8002) |
| Attestation | NSM COSE Sign1 + BIP-340 Schnorr response signing (gRPC clients pin TLS cert fingerprint to attestation `tlsKeyHash` instead) |
| Encryption | AWS KMS (PCR0-locked) + AES-256-GCM (S3 storage DEK) |
| PCR0 Signing | Dedicated `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY`); signature surfaced as `pcr0_signature` on `GET /v1/enclave-info` (omitempty when not provisioned) |
| Telemetry ingest | `POST /v1/{metrics,traces,logs}` (OTLP/HTTP); JSON snapshots at `GET /v1/enclave-{metrics,traces,logs}` |
| Transports | HTTP/1.1 + HTTP/2 + native gRPC + gRPC-Web (issue #85) |
| TLS Cert Source | **Deploy-time** — `enclave.yaml`'s `tls:` block (fqdn / provider / email) is published by Tofu to SSM as `/{dep}/{app}/env/ENCLAVE_NITRIDING_*`; runtime resolves it via `loadDeployTLSConfig` on `Init`. `self-signed` (default, trust via attestation `tlsKeyHash`) or ACME `letsencrypt` / `letsencrypt-staging` (TLS-ALPN-01, autocert) — cert persisted in the encrypted S3 storage subsystem under the reserved `acme/` namespace via `acmeStorageCache`, so reboots and migrations reuse it instead of re-issuing (avoids the Let's Encrypt rate limit). Changing the domain is a redeploy, **not an EIF rebuild**. |

## Configuration (enclave.yaml)

| Field | Description |
|-------|-------------|
| `name` | App name |
| `region` | AWS region |
| `account` | AWS account ID |
| `sdk.{rev,hash,vendor_hash}` | SDK Nix hashes (auto-baked via `make build`) |
| `app.language` | `go`, `nodejs`, or `dotnet` |
| `app.{nix_owner,nix_repo,nix_rev,nix_hash,nix_vendor_hash}` | Auto-populated by `enclave setup` |
| `app.binary_name` | Output binary name |
| `app.env` | Build-time env defaults (PCR0-attested schema) |
| `secrets[].{name,env_var}` | KMS-managed static secrets (env var injection) |
| `is_kms_key_locked` | Permanent KMS lockdown flag |
| `release_tag` | GitHub Release tag for `--remote` artifact pull |
| `tls.fqdn` | Domain the cert is issued for (required when `provider` ≠ `self-signed`; FQDN-validated) |
| `tls.provider` | `self-signed` (default) \| `letsencrypt` \| `letsencrypt-staging` |
| `tls.email` | Optional ACME contact for expiry notices (used when `provider` selects ACME) |
| `tls.route53_zone_id` | Optional Route53 hosted-zone ID; when set, `enclave tofu` creates an `A` record for `tls.fqdn` in that zone pointing at the EIP (60 s TTL). Skipped in local mode or when empty. Requires `tls.fqdn`. Deployer IAM needs `route53:ChangeResourceRecordSets` / `GetHostedZone` / `ListResourceRecordSets` on `arn:aws:route53:::hostedzone/*` and `route53:GetChange` on `arn:aws:route53:::change/*` (already covered by `deploy-iam-policy.json`). |

## Architecture Overview

```
Client (HTTPS :443 — ALPN h2 / http/1.1)
       │
       ▼
EC2 Instance (Amazon Linux 2023, Nitro)
 ├── enclave-supervisor.service (single host process)
 │   ├── gvproxy           (vsock:1024 — outbound TCP proxy)
 │   ├── viproxy / IMDS    (vsock CID 3:8002 — credential forwarder)
 │   ├── Watchdog          (nitro-cli run/terminate, bounded backoff)
 │   └── Management API    (127.0.0.1:8443 — health, /metrics, /migrate)
 │
 └── Nitro Enclave (EIF) — single runtime.Runtime process (nitriding.Enclave folded in @ v0.0.76)
     ├── pubSrv (TLS :443, ALPN h2 / http/1.1)
     │   ├── /enclave/* attestation handlers
     │   ├── /v1/enclave-info — incl. pcr0_signature (Tofu-provisioned, omitempty)
     │   ├── /v1/* admin handlers (storage, secrets, migration)
     │   ├── /v1/{metrics,traces,logs} OTLP-spec ingest (POST) + /v1/enclave-{metrics,traces,logs} JSON snapshots (GET)
     │   ├── Schnorr response signing (BIP-340) — bypassed for application/grpc* + application/grpc-web*
     │   └── catch-all revProxy (h2c, FlushInterval=-1) → user app :7074
     ├── privSrv (127.0.0.1:8080) — same chi mux for user-app loopback callbacks
     │   • KMS Decrypt with attestation (PCR0-bound)
     │   • PCR16+ extension with SHA256(secret_pubkey)
     │   • Encrypted storage (AES-256-GCM + S3 + KMS DEK)
     │   • Dynamic secrets API
     │   • Locked-key migration (POST /v1/start-migration — atomic KMSKeyID flip)
     └── Your App (plain HTTP/2-or-1.1 :7074 — Go / Node.js / .NET)
                  receives ENCLAVE_PROXY_PORT=8080 + ENCLAVE_RUNTIME_TOKEN
```

## CLI Commands (lifecycle)

| Command | Purpose |
|---------|---------|
| `enclave init` | Scaffold or validate `enclave/{enclave.yaml,flake.nix}` and CI workflows |
| `enclave generate template --{golang,nodejs,dotnet}` | Generate complete app template |
| `enclave setup [--language ...]` | Auto-populate `app.*` Nix hashes from git remote |
| `enclave update` | Fast update (rev + source hash only, no dep changes) |
| `enclave upgrade` | Sync the `runtime:` block in `enclave.yaml` (rev / hash / vendor_hash) to the runtime coordinates this CLI binary was built with — idempotent; run after `go install ...@latest`, then `enclave build` |
| `enclave tofu init [--remote]` | Scaffold the OpenTofu module tree under `./tofu/` (merge-only-new modules) + write `tfvars` and `backend.tf`. In a TTY, prompts to optionally bootstrap the S3 state bucket + DynamoDB lock table from the bundled `modules/backend` submodule; non-TTY skips the prompt. Flags: `--bootstrap-backend` / `--no-bootstrap` / `--backend-bucket` / `--backend-table` / `--backend-region`. |
| `enclave tofu update [--remote]` | Refresh `tofu/terraform.tfvars.json` from `enclave.yaml`. Module files and `backend.tf` are left untouched; run after editing `tls:`, `route53_zone_id`, runtime version, or the secrets list before `tofu apply`. |
| `enclave tofu env --key K --value V [--key … --value …]` | Set/merge entries in `tofu/env_values.auto.tfvars.json` without hand-editing JSON. Keys must match `^[A-Z_][A-Z0-9_]*$`; existing entries are preserved (merged + sorted on write). The next `tofu apply` pushes the map to SSM at `/<deployment>/<app>/env/<key>` — the runtime overlays it on the process env at boot via `GetParametersByPath`. |
| `enclave build` | Reproducible EIF build via Docker + Nix |
| `enclave deploy` | Deploy CDK stack (VPC, EC2, KMS, IAM, S3, secrets) |
| `enclave verify` | Verify attestation + PCR0 |
| `enclave status` | Show deployment status |
| `enclave destroy` | Tear down stack (irreversible) |
| `enclave lock` | Apply irreversible KMS policy lockdown |
| `enclave test build` / `init` / `start` / `down` | Local QEMU integration-test workflow for upstream apps (image-based — pulls `enclave-awsmocks` + `enclave-test-runner` from GHCR) |
| `enclave start` / `stop` | POST `/start` or `/stop` to the supervisor over SSM RunCommand. Flags: `--instance-id`, `--region`, optional `--profile` (defaults to `AWS_PROFILE` env / default credential chain). |
| `enclave log` / `trace` / `metrics` | Stream supervisor data over an SSM **Session Manager port-forward** to `:8443` (no 24 KB SSM RunCommand stdout cap). Flags: `--instance-id`, `--region`, optional `--profile`. Requires AWS CLI v2 + Session Manager Plugin on `PATH`. |
