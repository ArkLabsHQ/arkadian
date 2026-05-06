# API Reference

Two API surfaces: the **enclave-facing API** (HTTPS `:443`, terminated by nitriding) and the **host-side management API** (`127.0.0.1:8443`, plain HTTP, loopback only — access via SSM Session Manager).

## Authentication

Endpoints marked **Token** require `Authorization: Bearer {token}` where `{token}` is the value of the `ENCLAVE_RUNTIME_TOKEN` env var auto-generated at boot and exposed to the user app and runtime endpoints. The token is rotated each boot.

## Response Signing

Every response from the enclave-facing API includes:

- `X-Attestation-Signature` — BIP-340 Schnorr signature over `SHA256(response_body)`.
- `X-Attestation-Pubkey` — compressed secp256k1 ephemeral attestation pubkey.

Clients verify the signature, then confirm `SHA256(pubkey)` matches the `appKeyHash` field in the attestation document's `UserData`.

---

## Enclave-Facing API (`:443`)

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Supervisor health (`ready` / `degraded`) |
| `GET` | `/v1/enclave-info` | Build + runtime metadata: `version`, `attestation_pubkey`, `previous_pcr0` (`"genesis"` on first boot), `previous_pcr0_attestation`, `metrics`, `migration: {state, reason}` |
| `GET` | `/enclave/attestation` | NSM attestation document (served by nitriding, COSE Sign1) |
| `*` | `/*` | All other requests reverse-proxied to user app on `:7074` |

While Init is still running the runtime returns HTTP 503 with body `{version, previous_pcr0, initializing: true}` regardless of the underlying cause.

The `migration` block carries the boot-time outcome of any locked-key migration: `state` ∈ `"none"` (no migration in progress) | `"committed"` (PromoteToPrimary succeeded) | `"aborted"` (orphan target detected, primary untouched). `reason` is set on `aborted`.

### Encrypted Storage (Token)

Backed by S3 + KMS-protected DEK + AES-256-GCM. Up to 10 MB per object.

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/v1/storage/{key}` | Encrypt + upload data |
| `GET` | `/v1/storage/{key}` | Download + decrypt |
| `DELETE` | `/v1/storage/{key}` | Delete object |
| `GET` | `/v1/storage?prefix={p}` | List keys matching prefix |

```sh
curl -X PUT https://your-enclave/v1/storage/my/key \
  -H "Authorization: Bearer $ENCLAVE_RUNTIME_TOKEN" \
  --data-binary @file.bin

curl https://your-enclave/v1/storage/my/key \
  -H "Authorization: Bearer $ENCLAVE_RUNTIME_TOKEN"

curl "https://your-enclave/v1/storage?prefix=my/" \
  -H "Authorization: Bearer $ENCLAVE_RUNTIME_TOKEN"

curl -X DELETE https://your-enclave/v1/storage/my/key \
  -H "Authorization: Bearer $ENCLAVE_RUNTIME_TOKEN"
```

### Dynamic Secrets (Token)

Runtime-mutable secrets persisted encrypted in S3 (reuses storage DEK). Optional `env_var` binding injects on boot. Conflicts with static KMS secrets are rejected. Max value size 64 KB.

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/v1/secrets/{name}` | Create/update a secret (body: `{"env_var":"X","value":"..."}`) |
| `GET` | `/v1/secrets/{name}` | Retrieve a secret value |
| `DELETE` | `/v1/secrets/{name}` | Delete a secret |
| `GET` | `/v1/secrets` | List secrets (metadata only — no values) |

```sh
curl -X PUT https://your-enclave/v1/secrets/api-token \
  -H "Authorization: Bearer $ENCLAVE_RUNTIME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"env_var": "API_TOKEN", "value": "sk-..."}'
```

### Internal (not exposed externally)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/start-migration` | Re-encrypt secrets for locked-key migration. Gated by `MigrationKMSKeyID` SSM parameter; called by the host supervisor. Writes new ciphertexts plus the chain proof (`/Migration/PreviousPCR0`, `/Migration/PreviousPCR0Attestation`) to staging SSM paths — `PromoteToPrimary` (commit) or `AbortOrphaned` (abort) on the new enclave's next boot decides the outcome. Renamed from `/v1/export-key` (verb-noun parity with `/v1/extend-pcr`, `/v1/lock-pcr`). |

---

## Host Management API (`127.0.0.1:8443`)

Plain HTTP, **localhost only**. Reach it via [SSM Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Enclave status from `nitro-cli describe-enclaves` (running/stopped, CID, memory, CPU count) |
| `GET` | `/metrics` | Prometheus metrics (nitriding-proxied + host gauges) |
| `POST` | `/start` | Launch the enclave via the in-process watchdog (`nitro-cli run-enclave`) |
| `POST` | `/stop` | Terminate the enclave via the in-process watchdog (`nitro-cli terminate-enclave`) |
| `POST` | `/migrate` | Streaming NDJSON 9-step locked-key migration |
| `POST` | `/schedule-key-deletion` | Schedule KMS key for 7-day deletion (post-migration cleanup) |

### Migration NDJSON Stream

```
{"step":1,"total":9,"status":"progress","message":"Reading current KMS key..."}
{"step":2,"total":9,"status":"progress","message":"Creating new KMS key..."}
...
{"step":9,"total":9,"status":"complete","message":"Migration complete. New KMS key: arn:aws:kms:..."}
```

`/migrate` is **idempotent** — re-running resumes from the last checkpoint (`MigrationKMSKeyID` in SSM).

---

## `migration` field in `/v1/enclave-info`

The supervisor's `POST /migrate` flow polls `/v1/enclave-info` after the swap step to learn whether the new enclave committed or aborted; SSM-based commit detection alone cannot distinguish the two outcomes (both clear `MigrationKMSKeyID` and leave `/health=200`).

```json
"migration": {
  "state": "none" | "committed" | "aborted",
  "reason": "<set on aborted>"
}
```

## `metrics` field in `/v1/enclave-info`

| Metric | Description |
|--------|-------------|
| `http_requests` | Total HTTP requests handled |
| `http_errors` | Requests returning 4xx/5xx |
| `kms_operations` | KMS Decrypt calls (DEK decryption) |
| `kms_errors` | Failed KMS Decrypt calls |
| `storage_reads` / `storage_writes` / `storage_deletes` / `storage_errors` | S3 storage operations |
| `secret_reads` / `secret_writes` / `secret_deletes` | Dynamic secret operations |

## Verified Clients

- **Go** — `client/` package (`client.New(...)` or `client.NewFromManifest(...)`). Verifies attestation chain on first call, then verifies Schnorr signatures on every response.
- **Rust** — `client-rs/` Cargo workspace member.
