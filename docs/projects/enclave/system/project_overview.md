# Simple Enclave — Project Overview

## What

**Simple Enclave** (Go module `github.com/ArkLabsHQ/introspector-enclave`) is a CLI framework + runtime SDK for running plain HTTP applications inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, and reproducible Nix-based EIF builds.

Apps need **zero enclave-specific code** — the runtime supervisor handles attestation, KMS secret decryption, PCR extension, response signing, encrypted storage, and dynamic secrets. Your app is a plain HTTP server on port 7074.

## Why

Confidential computing on AWS Nitro requires a substantial amount of glue: TLS termination, vsock networking, KMS attestation, secret bootstrap, response signing, build reproducibility for verifiable PCR0 measurements, and key migration. Simple Enclave packages all of that into a single CLI + supervisor binary so application teams ship a normal web server and inherit the security model.

## Core Components

| Component | Role | Code |
|-----------|------|------|
| `cli/` | `enclave` CLI (init, setup, build, deploy, verify, lock, migrate, …) | Go |
| `runtime/` | In-enclave library + binary — secret loading, attestation, response signing, storage API, dynamic secrets, migration | Go |
| `supervisor/` | Host-side single-process supervisor — gvproxy, viproxy/IMDS, nitro-cli watchdog, management API | Go |
| `client/` | Verified Go HTTP client — verifies attestation document + Schnorr signatures on every response | Go |
| `client-rs/` | Verified Rust HTTP client (workspace `Cargo.toml` member) | Rust |
| `test/` | QEMU-based local integration test harness (`-M nitro-enclave`, mock KMS/SSM/S3/IMDS) | Bash + Go + Docker Compose |

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
- **Locked-key migration** — 9-step in-place re-encryption flow (`POST /migrate`) for rotating to a new PCR0 even when the KMS policy is irreversibly frozen. Old enclave writes ciphertexts + chain proof to **staging** SSM paths (`/Migration/...`); the new enclave's boot-time `PromoteToPrimary` (commit) or `AbortOrphaned` (abort) decides the outcome, which the supervisor reads from `/v1/enclave-info`'s `migration.{state,reason}` block.
- **PCR0 attestation chain** — each version records its predecessor's PCR0 + an NSM signed proof (`previous_pcr0` is `"genesis"` on first boot). `enclave verify` walks the chain. The runtime no longer validates a baked-in predecessor PCR0 — the value is still measured into PCR0 for external auditors but is not enforced at startup.
- **Build-time vs deploy-time env** — `app.env` baked into PCR0; `env_values` (TF_VAR / .auto.tfvars.json / -var) overlay at boot without rebuilding the EIF (schema attested, values not).
- **Two artifact-source modes** — Tofu uploads local artifacts (default) or curls them from a published GitHub Release at apply time (`enclave tofu --remote`).
- **CI scaffolding** — `enclave init`/`generate template` writes `deploy-enclave.yml`, `destroy-enclave.yml`, `verify-enclave.yml` with OIDC, GitHub artifact attestations, and an attestation status page on `gh-pages`.
- **Local QEMU test harness** — `test/run.sh` boots the EIF inside QEMU `-M nitro-enclave` (vhost-device-vsock), runs 15 integration tests, then exercises a full locked-key migration.

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
├── runtime/              # in-enclave library + standalone runtime binary (own go.mod)
├── supervisor/           # host-side supervisor binary
├── client/               # Verified Go HTTP client
├── client-rs/            # Verified Rust HTTP client (Cargo workspace)
├── test/                 # QEMU + Docker Compose integration harness
├── ARCHITECTURE.md       # 18-section detailed flow diagrams (build → boot → migration)
├── OPERATIONS.md         # Monitoring, scaling, recovery, migration runbook
├── TROUBLESHOOTING.md    # Common errors, log locations, debug procedures
├── README.md             # Top-level user guide (~740 lines)
├── framework.md          # Internal technical report
├── Makefile              # build / install / lint / test / test-docker
├── Dockerfile            # Reproducible builder image (linux/amd64)
└── .github/workflows/    # sdk-hashes.yml, integration-test.yml, lint-vet.yml
```
