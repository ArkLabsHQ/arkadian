# Architecture

Simple Enclave is a three-process system: a host-side **supervisor**, an in-enclave **runtime**, and your **app**. The runtime exposes management endpoints and reverse-proxies user traffic; the supervisor owns lifecycle, networking, and admin endpoints.

## Topology

```
                    Client (HTTPS :443)
                            │
                            ▼
┌───────────────────────────────────────────────────────┐
│                  EC2 Instance (Nitro)                 │
│                                                       │
│  enclave-supervisor.service (single host process)    │
│   ├── gvproxy        (vsock:1024, in-process)         │
│   ├── viproxy/IMDS   (vsock CID 3:8002, in-process)   │
│   ├── Watchdog       (nitro-cli run/terminate)        │
│   └── Mgmt API       (127.0.0.1:8443 — plain HTTP)    │
│                            │ vsock                    │
│  ┌─────────────────────────▼─────────────────────────┐│
│  │              AWS Nitro Enclave (EIF)              ││
│  │  ├── nitriding   (TLS :443 → :7073)               ││
│  │  ├── runtime     (:7073 reverse proxy → :7074)    ││
│  │  └── your-app    (plain HTTP :7074)               ││
│  └───────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────┘
```

## Networking

| Address | Role |
|---------|------|
| `192.168.127.1` | gvproxy gateway/DNS (TAP interface) |
| `192.168.127.2` | Enclave virtual IP |
| `vsock:1024` | gvproxy outbound TCP proxy |
| `vsock:3:8002` | IMDS forwarder target (host) |
| `127.0.0.1:80` | IMDS endpoint inside enclave (via viproxy) |
| `:443` | Public TLS (terminated by nitriding) |
| `:7073` | Internal: runtime reverse proxy + management API |
| `:7074` | Internal: user app |
| `127.0.0.1:8443` | Host supervisor management API (loopback only) |

## Boot Sequence

1. **EC2 user_data** (`tofu/modules/enclave/templates/user_data.sh.tftpl`) installs `nitro-cli`, configures vsock loopback, downloads the supervisor + EIF, and starts `enclave-supervisor.service`.
2. **Supervisor** starts gvproxy + IMDS forwarder, then `nitro-cli run-enclave` launches the EIF.
3. **nitriding** terminates TLS on `:443` and forwards to `:7073`.
4. **runtime** (in-enclave):
   - Loads encrypted secret ciphertexts from SSM (path `/{prefix}/{appName}/{secretName}/Ciphertext`).
   - Calls `kms:Decrypt` with a fresh Nitro attestation document — KMS verifies `RecipientAttestation:PCR0` matches policy.
   - Sets decrypted secrets as env vars (plaintext only inside enclave memory).
   - Generates an ephemeral secp256k1 attestation key.
   - Registers `SHA256(attestationPubkey)` with nitriding (embedded as `appKeyHash` in attestation `UserData`).
   - Extends PCR16+ with `SHA256(compressed_secp256k1_pubkey)` for each configured secret.
   - Starts the reverse proxy on `:7073` with Schnorr response-signing middleware.
5. **Your app** is launched as a child process on `:7074`, inheriting the secret env vars and `ENCLAVE_RUNTIME_TOKEN`.

## Build Flow (reproducible)

`enclave build` runs entirely inside a pinned NixOS Docker image using `monzo/aws-nitro-util` to produce a byte-identical EIF. Steps:

1. Compute SDK hashes (cached in `cli/runtime-hashes.json`, baked into CLI via `ldflags`).
2. Compute app source + vendor hashes (`enclave setup`).
3. Nix builds runtime + supervisor + your app from pinned commits.
4. `aws-nitro-util` packages into `image.eif`; `pcr.json` records PCR0/1/2 measurements.

Anyone who builds at the same git rev gets byte-identical artifacts and can therefore independently verify a deployed enclave's PCR0.

## KMS Policy Model

The enclave **creates and owns its own KMS keys** end-to-end. There is no shell-based provisioning step and no transitional policy phase — every key is PCR0-locked at `CreateKey` time.

### First-boot Primary-Key Bootstrap

- Tofu writes `/{dep}/{app}/KMSKeyID = "UNSET"` (a `aws_ssm_parameter` placeholder with `ignore_changes=[value]`).
- The runtime's `EnsureKeyID` (in `runtime/kms.go`) reads that parameter on `Init`. If it sees the `"UNSET"` placeholder, it calls `kms:CreateKey` with a PCR0-locked policy already in the `Policy` argument — no external principal ever holds authority over the key.
- Race-safe: after `CreateKey` the runtime does an SSM `PutParameter` of the new key ID, then re-reads to confirm; if a peer won the race it `ScheduleKeyDeletion`s the losing key.
- Any read error (`ParameterNotFound`, `AccessDenied`) is fatal — the placeholder **must** exist so a misconfigured deployment cannot silently mint a key under the wrong SSM namespace.
- `VerifyKeyAuthorization` (the slimmed-down successor to `SelfApplyPolicy`) calls `kms:GetKeyPolicy` and runs `policyAdmitsPCR0` to confirm the key's policy permits the live PCR0 — boot fails fast if not.

### Default (Recovery-Capable) Policy

- Admin statement grants `kms:PutKeyPolicy`, `kms:GetKeyPolicy`, `kms:DescribeKey` to the AWS root account.
- Admin statement explicitly **excludes** `kms:Decrypt` and `kms:CreateGrant`.
- Enclave statement allows `kms:Decrypt` only when `kms:RecipientAttestation:PCR0` matches the enclave measurement.

Recovery: rewrite the policy to authorise a new PCR0 → redeploy → new enclave attests → KMS decrypts. **Plaintext invariant holds during recovery.**

### Locked Policy (`is_kms_key_locked: true` + `enclave lock`)

- Applied with `--bypass-policy-lockout-safety-check` — irreversible.
- Removes all admin access (`PutKeyPolicy`, `ScheduleKeyDeletion`, etc.).
- Only the enclave with the exact PCR0 can call `kms:Decrypt`.
- Recovery requires the locked-key migration flow (creates a new key, doesn't unlock the old one).

> **The choice is permanent at first lock.**

## Locked-Key Migration (7 steps, atomic commit)

Triggered by host management API `POST /migrate` (NDJSON streaming). The new model **drops the two-phase `/Migration/*` staging namespace** in favour of an atomic `KMSKeyID` flip: re-encrypted secrets and the storage DEK are written to **key-scoped** SSM paths `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}` and `/{dep}/{app}/StorageDEK/Ciphertext/{kmsKeyId}`, then the single `PutParameter` on `/{dep}/{app}/KMSKeyID` is the commit point.

Supervisor steps (`supervisor/migrate.go`, plus step `0 = stepCooldown`):

1. **`stepReadCurrentKey`** — Read current KMS key ID from SSM.
2. **`stepStartMigration`** — `POST /v1/start-migration` on the running old enclave with body `{"new_pcr0": "<hex>"}`. The enclave inline-creates the migration key via `CreateMigrationKey` (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time — EC2 role never holds `kms:PutKeyPolicy`), `commitPCR31` runs first so a retry at a different target fails before any external write, then secrets + DEK are re-encrypted to the key-scoped ciphertext paths, `storePCR0WithAttestation` writes the chain proof to `MigrationPreviousPCR0[Attestation]`, and finally the atomic flip of `/{dep}/{app}/KMSKeyID` to the new key ID commits the migration. A deferred `ScheduleKeyDeletion` cleans up the new key if anything before the flip fails.
3. **`stepDownloadEIF`** — Back up the old EIF on disk, download the new EIF from S3.
4. **`stepSwapAndStart`** — Stop old enclave, replace `image.eif`, start new enclave.
5. **`stepWaitOutcome`** — Poll `/health` on the new enclave until healthy. On timeout the supervisor calls `rollbackMigration` (restores the EIF backup, restarts the old enclave). The new enclave self-admits to the migration key via `kms:PutKeyPolicy` after attestation, which is why a wrong-PCR0 target no longer trips rollback at this step — the v3 rollback integration test now uses a wrong `app name` (so `EnsureKeyID` fails on first SSM read instead).
6. **`stepHostCleanup`** — Schedule the old KMS key for 7-day deletion.
7. **`stepSupervisorUpdate`** — Update the supervisor binary (warning, not fatal, if this fails — old supervisor stays running).

PCR31 is **audit-only** — `verifyPCR31Commitment` was removed; boot no longer verifies the handoff. The supervisor no longer touches KMS at all (the old `acquireMigrationKey` / `applyTransitionalPolicy` / `buildTransitionalPolicy` helpers were deleted along with the transitional-policy phase). The new enclave additionally runs `Migrator.VerifyPredecessorCommitment` during `Init` to confirm the recorded predecessor PCR0 + attestation match its own commitment chain.

**Endpoint rename (prior release):** `/v1/export-key` was renamed to `/v1/start-migration` (verb-noun parity with `/v1/extend-pcr`, `/v1/lock-pcr`).

## Response Signing (Schnorr middleware)

Every response from the runtime reverse proxy includes:

- `X-Attestation-Signature`: BIP-340 Schnorr signature over `SHA256(response_body)`.
- `X-Attestation-Pubkey`: compressed ephemeral attestation pubkey.

Clients (`client/`, `client-rs/`):
1. Fetch `/enclave/attestation` (NSM document) and `/v1/enclave-info`.
2. Verify the NSM document chain against the AWS Nitro root certificate.
3. Confirm PCR0 matches the expected build measurement.
4. Confirm `appKeyHash` in `UserData` matches `SHA256(attestation_pubkey)`.
5. On every subsequent request, verify the response Schnorr signature against the bound pubkey.

## Encrypted Storage

`PUT/GET/DELETE/LIST /v1/storage/{key}` backed by S3:
- 256-bit DEK generated via KMS at first boot, stored encrypted in SSM (`StorageDEK/Ciphertext`).
- AES-256-GCM with random 12-byte nonce per write.
- Bucket name discovered from SSM (`StorageBucketName`).
- DEK is automatically re-encrypted during locked-key migration.

## Dynamic Secrets

`PUT/GET/DELETE/LIST /v1/secrets[/{name}]` — runtime-mutable, persisted encrypted in S3 (reuses storage DEK). Optional `env_var` binding injects on boot. Conflicts with static KMS secrets are rejected. Survives enclave restart and migration.

## PCR0 Attestation Chain

```
Genesis → PCR0_v1 (previous_pcr0 = "genesis")
       → PCR0_v2 (previous_pcr0 = PCR0_v1, previous_pcr0_attestation = NSM proof)
       → PCR0_v3 (previous_pcr0 = PCR0_v2, previous_pcr0_attestation = NSM proof)
```

`GET /v1/enclave-info` exposes `previous_pcr0` (`"genesis"` on first boot) + `previous_pcr0_attestation` (NSM COSE Sign1). `enclave verify` validates the chain against the AWS Nitro root.

The runtime no longer validates a baked-in `previous_pcr0` against the live chain — a single EIF can legitimately be deployed against any predecessor (skipped versions, manual recovery), so the build-time `ENCLAVE_PREVIOUS_PCR0` is unreliable as a runtime claim. The value is still measured into PCR0 for external auditors but is not consumed by the runtime, and the variable is no longer wired through the OpenTofu deployment templates.

## File Map (key Go packages)

| Package | Files | Role |
|---------|-------|------|
| `cli/` | `aws.go`, `build.go`, `config.go`, `init.go`, `setup.go`, `template.go`, `tofu.go`, `verify.go`, `lifecycle.go`, `migration_status.go` | CLI subcommands, OpenTofu scaffold, CDK stack, attestation verify |
| `runtime/` | `runtime.go`, `attestation.go`, `kms.go`, `static_secret.go`, `dynamic_secrets.go`, `storage.go`, `migrate.go`, `policy_builder.go`, `tracing.go`, `metrics.go`, `nitriding_config.go`, `viproxy_setup.go`, `imds.go` | In-enclave runtime, KMS, secrets, storage, observability. `runtime/kms.go` owns `EnsureKeyID`, `VerifyKeyAuthorization`, `CreateMigrationKey`. `runtime/migrate.go` runs `handleStartMigration` (atomic `KMSKeyID` flip) + `VerifyPredecessorCommitment`. SSM ciphertext paths are key-scoped: `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`. |
| `supervisor/` | `supervisor.go`, `lifecycle.go`, `migrate.go`, `health.go`, `networking.go`, `observability.go`, `validate.go` | Host-side single-process supervisor (gvproxy, IMDS fwd, watchdog, mgmt API, 7-step migration orchestrator — no KMS calls; just cooldown / start-migration / EIF swap / health poll / rollback / cleanup) |
| `client/` | `client.go`, `verify.go` | Verified Go HTTP client |
| `client-rs/` (Cargo workspace member) | `Cargo.toml` | Verified Rust HTTP client |
