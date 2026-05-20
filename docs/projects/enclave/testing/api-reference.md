# API Reference

Two API surfaces: the **enclave-facing API** (HTTPS `:443`, terminated by nitriding) and the **host-side management API** (`127.0.0.1:8443`, plain HTTP, loopback only — access via SSM Session Manager).

## Authentication

Endpoints marked **Token** require `Authorization: Bearer {token}` where `{token}` is the value of the `ENCLAVE_RUNTIME_TOKEN` env var auto-generated at boot and exposed to the user app and runtime endpoints. The token is rotated each boot.

## Response Signing

Every response from the enclave-facing API includes:

- `X-Attestation-Signature` — BIP-340 Schnorr signature over `SHA256(response_body)`.
- `X-Attestation-Pubkey` — compressed secp256k1 ephemeral attestation pubkey.

Clients verify the signature, then confirm `SHA256(pubkey)` matches the `appKeyHash` field in the attestation document's `UserData`.

### gRPC / gRPC-Web bypass

`Runtime.Middleware` short-circuits to `next.ServeHTTP` (no buffering, no signing headers) when the request `Content-Type` is `application/grpc*` (native gRPC over HTTP/2) or `application/grpc-web*` (gRPC-Web over HTTP/1.1 or HTTP/2). Without this bypass, the Schnorr signer would buffer streaming responses and native gRPC would lose its trailers. Trust for gRPC clients is anchored at the TLS handshake instead, via the attestation document's `tlsKeyHash` — see `client.GRPCConn(ctx)` in the Verified Clients section.

### HTTP/2 / ALPN

`pubSrv` advertises `h2, http/1.1` (and `acme-tls/1` when ACME is enabled) in ALPN with `MinVersion = TLS 1.2`. The internal `revProxy` dials the user app with `http2.Transport{AllowHTTP: true}` and `FlushInterval = -1`, so HTTP/2 streams and gRPC trailers survive the loopback hop unchanged.

---

## Enclave-Facing API (`:443`)

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Supervisor health (`ready` / `degraded`) |
| `GET` | `/v1/enclave-info` | Build + runtime metadata: `version`, `attestation_pubkey`, `previous_pcr0` (`"genesis"` on first boot — read from SSM via `readSSMParamOptional`, so a missing parameter is non-fatal), `previous_pcr0_attestation` (also optional), `metrics`, and — when the Tofu module's PCR0-signing block was applied — a `pcr0_signature: { pubkey_pem, pcr0_hex, signature_b64 }` sub-object (`omitempty`; absent on deployments where signing isn't provisioned). |
| `GET` | `/enclave/attestation` | NSM attestation document (served by nitriding, COSE Sign1) |
| `*` | `/*` | All other requests reverse-proxied to user app on `:7074` |

While Init is still running the runtime returns HTTP 503 with body `{version, previous_pcr0, initializing: true}` regardless of the underlying cause.

The `migration` outcome block has been **removed** — migration is now committed atomically by the `KMSKeyID` SSM flip, so there is no separate commit/abort state to surface. The supervisor instead polls `/health` until the new enclave is ready, and rolls back if it never becomes healthy within the timeout.

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
| `POST` | `/v1/start-migration` | Re-encrypt secrets and storage DEK for locked-key migration. Body: `{"new_pcr0": "<hex>"}`. Called by the host supervisor. Inline-creates the migration key via `CreateMigrationKey` (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time), runs `commitPCR31` first (audit-only) so a retry at a different target fails before any external write, re-encrypts each secret + storage DEK to key-scoped SSM paths `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}` and `/{dep}/{app}/StorageDEK/Ciphertext/{kmsKeyId}`, then `storePCR0WithAttestation` writes the chain proof to `MigrationPreviousPCR0[Attestation]`, and finally the atomic `PutParameter` on `/{dep}/{app}/KMSKeyID` commits the migration. A deferred `ScheduleKeyDeletion` cleans up the new key if anything before the flip fails. Renamed from `/v1/export-key` in a prior release. |

### Telemetry ingest vs introspection

POST routes follow the OTLP/HTTP spec so that a standard OTEL SDK exporter can target the enclave with no URL overrides. GET routes (introspection) keep the `enclave-` prefix to make them visually distinct from OTLP ingest.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/metrics` | OTLP-protobuf metric ingest from the user app (`Content-Type: application/x-protobuf`). Token-gated. |
| `POST` | `/v1/traces` | OTLP-protobuf trace-span ingest from the user app. Token-gated. |
| `POST` | `/v1/logs`   | OTLP-protobuf log-record ingest from the user app. Token-gated. |
| `GET`  | `/v1/enclave-metrics` | JSON snapshot of cumulative counters + heap/goroutine gauges (see "`metrics` field in `/v1/enclave-info`" below — same numbers also embedded there). |
| `GET`  | `/v1/enclave-traces`  | JSON history of recently-seen spans. |
| `GET`  | `/v1/enclave-logs`    | JSON history of recently-seen log lines. |

The supervisor's `:8443/metrics` Prometheus exposition is still the textfile that scrapers should consume from outside the enclave — it proxies the runtime's JSON snapshot.

### PCR0 Signing (Tofu-provisioned, served via `/v1/enclave-info`)

When `enclave tofu` is applied, the module mints a dedicated `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY`), runs a local-exec at apply time that signs the live PCR0 with `ECDSA_SHA_384` via `aws kms sign`, and writes three SSM parameters under `/{dep}/{app}/Signing/`:

| SSM Parameter | Content |
|---------------|---------|
| `/{dep}/{app}/Signing/PubkeyPEM` | ECC NIST P-384 public key in PEM form (`openssl ec -pubin -inform DER -outform PEM`) |
| `/{dep}/{app}/Signing/PCR0` | The signed PCR0 hex string |
| `/{dep}/{app}/Signing/Signature` | Base64-encoded raw signature bytes from `aws kms sign --signing-algorithm ECDSA_SHA_384` |

The runtime's `Signature.Load` reads those three parameters during `Init` (non-fatal — missing parameters just log a warning), and `Signature.Snapshot` surfaces them as the `pcr0_signature` sub-object on `GET /v1/enclave-info` (`omitempty` — entirely absent for deployments that didn't provision signing). There is **no dedicated endpoint** (an earlier draft mounted `GET /enclave/signature`, but it was folded into `/v1/enclave-info` so all attestation metadata travels in one round-trip).

Verification recipe (the integration test's `[35/35]` check):

```sh
# Pull the three fields
curl -sk https://<enclave>/v1/enclave-info | jq -r '.pcr0_signature.pubkey_pem' > pubkey.pem
curl -sk https://<enclave>/v1/enclave-info | jq -r '.pcr0_signature.pcr0_hex'    \
  | python3 -c "import sys,binascii; sys.stdout.buffer.write(binascii.unhexlify(sys.stdin.read().strip()))" > pcr0.bin
curl -sk https://<enclave>/v1/enclave-info | jq -r '.pcr0_signature.signature_b64' \
  | base64 -d > sig.bin

# Verify with OpenSSL
openssl pkeyutl -verify -pubin -inkey pubkey.pem -in pcr0.bin -sigfile sig.bin
# → Signature Verified Successfully
```

There is no `signing:` field in `enclave.yaml` — provisioning is entirely a property of the Tofu module. The Tofu output `pcr0_signing_key_arn` lets you grant `kms:Sign` + `kms:GetPublicKey` to the identity running `tofu apply`.

---

## Host Management API (`127.0.0.1:8443`)

Plain HTTP, **localhost only**. Reach it via [SSM Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Enclave status from `nitro-cli describe-enclaves` (running/stopped, CID, memory, CPU count) |
| `GET` | `/metrics` | Prometheus metrics (nitriding-proxied + host gauges) |
| `POST` | `/start` | Launch the enclave via the in-process watchdog (`nitro-cli run-enclave`) |
| `POST` | `/stop` | Terminate the enclave via the in-process watchdog (`nitro-cli terminate-enclave`) |
| `POST` | `/migrate` | Streaming NDJSON 7-step locked-key migration (plus step `0 = cooldown`) |
| `POST` | `/schedule-key-deletion` | Schedule KMS key for 7-day deletion (post-migration cleanup) |

### Migration NDJSON Stream

```
{"step":0,"total":7,"status":"cooldown","message":"Migration cooldown: 5m0s..."}
{"step":1,"total":7,"status":"progress","message":"Reading current KMS key ID..."}
{"step":2,"total":7,"status":"progress","message":"Calling start-migration on old enclave..."}
{"step":3,"total":7,"status":"progress","message":"Downloading new EIF from S3..."}
{"step":4,"total":7,"status":"progress","message":"Stopping old enclave..."}
{"step":5,"total":7,"status":"progress","message":"Polling new enclave until healthy..."}
{"step":6,"total":7,"status":"progress","message":"Scheduling old KMS key deletion..."}
{"step":7,"total":7,"status":"complete","message":"Migration complete. New KMS key: arn:aws:kms:..."}
```

The supervisor steps are: `0=stepCooldown`, `1=stepReadCurrentKey`, `2=stepStartMigration`, `3=stepDownloadEIF`, `4=stepSwapAndStart`, `5=stepWaitOutcome`, `6=stepHostCleanup`, `7=stepSupervisorUpdate`. Migration commits atomically when the runtime flips `/{dep}/{app}/KMSKeyID`; if the new enclave never becomes healthy by step 5, `rollbackMigration` emits under `stepWaitOutcome`, restores the EIF backup, and restarts the old enclave.

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

- **Go (HTTP)** — `client/` package (`client.New(...)` or `client.NewFromManifest(...)`). Verifies attestation chain on first call, then verifies Schnorr signatures on every response.
- **Go (gRPC)** — `client.GRPCConn(ctx, ...grpc.DialOption)` returns a `*grpc.ClientConn` whose TLS handshake pins the leaf-cert SHA-256 fingerprint to the attestation document's `tlsKeyHash` (decoded from `UserData` bytes `7:39`; `appKeyHash` is bytes `47:79`). The attestation chain (PCR0, optional secret PCRs, attestation-key binding) is verified before dialling and the result is cached for `CacheTTL`. Native gRPC bypasses response signing — trust is established at handshake, so a wrong PCR0 or a TLS cert that doesn't match `tlsKeyHash` makes the handshake fail.
- **Rust** — `client-rs/` Cargo workspace member.
