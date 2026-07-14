# API Reference

Three API surfaces: the **enclave-facing HTTP API** (HTTPS `:443`, terminated by `runtime.Runtime`), the **confidential K/V store** (Redis/RESP over a loopback TLS listener inside the enclave, default `:6379` — see below), and the **host-side management API** (`127.0.0.1:8443`, plain HTTP, loopback only — access via SSM Session Manager).

> **Removed in this release:** the S3-backed `PUT/GET/DELETE/LIST /v1/storage/{key}` HTTP API and the `PUT/GET/DELETE/LIST /v1/secrets` dynamic-secrets API are **gone** — both are replaced by the Redis-compatible K/V store. The `POST /enclave/hash` handler and the runtime-served `pcr0_signature` block on `/v1/enclave-info` (with `runtime/signature.go`) were also removed.

## Authentication

Endpoints marked **Token** require `Authorization: Bearer {token}` where `{token}` is the value of the `ENCLAVE_RUNTIME_TOKEN` env var auto-generated at boot and exposed to the user app and runtime endpoints. The token is rotated each boot.

## Response Signing

Every response from the enclave-facing API includes:

- `X-Attestation-Signature` — BIP-340 Schnorr signature over `SHA256(response_body)`.
- `X-Attestation-Pubkey` — compressed secp256k1 ephemeral attestation pubkey.

Clients verify the signature, then confirm `SHA256(pubkey)` matches the `signingKeyHash` field in the attestation document's `UserData` (renamed from `appKeyHash` in #129).

### gRPC / gRPC-Web bypass

`Runtime.Middleware` short-circuits to `next.ServeHTTP` (no buffering, no signing headers) when the request `Content-Type` is `application/grpc*` (native gRPC over HTTP/2) or `application/grpc-web*` (gRPC-Web over HTTP/1.1 or HTTP/2). Without this bypass, the Schnorr signer would buffer streaming responses and native gRPC would lose its trailers. Trust for gRPC clients is anchored at the TLS handshake instead, via the attestation document's `tlsKeyHash` — see `client.GRPCConn(ctx)` in the Verified Clients section.

### HTTP/2 / ALPN

`pubSrv` advertises `h2, http/1.1` (and `acme-tls/1` when ACME is enabled) in ALPN with `MinVersion = TLS 1.2`. The internal `revProxy`'s upstream transport is chosen by `ENCLAVE_NITRIDING_UPSTREAM`: `auto` (default, `protocolSwitchTransport` — HTTP/1.1 inbound → `http.Transport{}`, HTTP/2 inbound → `http2.Transport{AllowHTTP: true}`), `h2c` (pin HTTP/2 cleartext — required for gRPC-only apps), or `h1` (pin HTTP/1.1 — plain HTTP apps). `FlushInterval = -1` in all cases, so HTTP/2 streams and gRPC trailers survive the loopback hop unchanged.

### CORS

`/v1/*` admin handlers on `pubSrv` are wrapped in `corsWildcard` — every response carries `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: *`, `Access-Control-Allow-Headers: *`, `Access-Control-Expose-Headers: *`, and `Access-Control-Max-Age: 600`; `OPTIONS` preflights short-circuit with `204 No Content`. The catch-all upstream reverse proxy to the user app is **not** wrapped — apps own their own CORS policy on their own responses.

---

## Enclave-Facing API (`:443`)

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Supervisor health (`ready` / `degraded`) |
| `GET` | `/v1/enclave-info` | Build + runtime metadata: `version`, `attestation_pubkey`, `previous_pcr0` (`"genesis"` on first boot — read from SSM via `readSSMParamOptional`, so a missing parameter is non-fatal), `previous_pcr0_attestation` (also optional), `kms_key_locked` (bool — the deployment's KMS lock posture, from `kmsKeyLocked()`), `metrics`, and an `upstream_app: { exited, error }` object reporting whether the user app process has exited (see below). The former `pcr0_signature` sub-object was removed. |
| `GET` | `/enclave/attestation` | NSM attestation document (served by nitriding, COSE Sign1) |
| `*` | `/*` | All other requests reverse-proxied to user app on `:7074`. After the user app has exited, these return **502** via the reverse proxy's `ErrorHandler` while `/v1/*` and `/enclave/*` runtime routes keep responding. |

#### `upstream_app` — user-app exit state (issue #122)

`upstream_app` always present. The runtime stays alive when the user app process exits (so admin endpoints like `/v1/start-migration` remain reachable through a migration); this object reports the app's state.

| Field | Type | Meaning |
|-------|------|---------|
| `exited` | bool | `true` once the user app process has exited (crash or clean shutdown), `false` while it is running |
| `error` | string | exit error message (`omitempty`; empty on a clean exit or while still running — check `exited` first) |

While Init is still running the runtime returns HTTP 503 with body `{version, previous_pcr0, initializing: true}` regardless of the underlying cause.

The `migration` outcome block has been **removed** — migration is now committed atomically by the `KMSKeyID` SSM flip, so there is no separate commit/abort state to surface. The supervisor instead polls `/health` until the new enclave is ready, and rolls back if it never becomes healthy within the timeout.

### Internal (not exposed externally)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/start-migration` | Re-encrypt secrets and storage DEK for locked-key migration. Body: `{"new_pcr0": "<hex>"}`. Called by the host supervisor. Inline-creates the migration key via `CreateMigrationKey` (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time), runs `commitPCR31` first so a retry at a different target fails before any external write, re-encrypts each secret + storage DEK to lock/key-scoped SSM paths `/{dep}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}` and `/{dep}/{app}/{locked|unlocked}/StorageDEK/Ciphertext/{kmsKeyId}` (`GenerateDataKey` is attestation-gated, so `generateDataKey` mints with an NSM `Recipient`), then `storePCR0WithAttestation` writes the chain proof to `MigrationPreviousPCR0[Attestation]` (attestation first, PCR0 second), and finally the atomic `PutParameter` on `/{dep}/{app}/{locked|unlocked}/KMSKeyID` commits the migration. On the successor's next boot `VerifyPredecessorCommitment` cryptographically verifies that recorded attestation (COSE + Nitro chain) and binds its PCR0 before trusting PCR31. A deferred `ScheduleKeyDeletion` cleans up the new key if anything before the flip fails. Renamed from `/v1/export-key` in a prior release. |

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

---

## Confidential K/V Store (Redis / RESP, enclave-internal)

Replaces the old S3-backed `/v1/storage` HTTP API and dynamic-secrets API. A **rollback-resistant, confidential key/value store** that speaks the **Redis (RESP) protocol**, backed by DynamoDB.

- **Transport** — a TLS listener bound to loopback **inside** the enclave (default `:6379`, override `ENCLAVE_KV_RESP_PORT`). It is *not* exposed to the network; the trust anchor is the attestation-bound TLS channel and clients `AUTH` with the runtime token (`ENCLAVE_RUNTIME_TOKEN`).
- **Confidential** — every value is AES-256-GCM sealed under the in-enclave KMS-issued DEK *before* it reaches DynamoDB; AAD binds `{deployment, app, key, version, chunk}`. Collections (hash/list/set/zset/stream) are stored as one sealed CBOR blob.
- **Rollback-resistant (issue #134)** — every committed write is anchored to a compliance-locked, DEK-sealed **S3 Object-Lock** object (`anchor.go`). A boot gate fails closed if the live store is already rolled back; a lazy per-read version-floor check sets a halt flag (`/health` → **503**, RESP refused) on regression. `ENCLAVE_ANCHOR_WINDOW` (retain-until, ~10y default) is non-overridable so the operator can't wait out the Object Lock.

Connect from the user app (Go, `github.com/redis/go-redis/v9`):

```go
rdb := redis.NewClient(&redis.Options{
    Addr:      "127.0.0.1:" + os.Getenv("ENCLAVE_KV_RESP_PORT"), // default 6379
    Password:  os.Getenv("ENCLAVE_RUNTIME_TOKEN"),               // AUTH token
    TLSConfig: &tls.Config{InsecureSkipVerify: true},            // loopback, self-cert
})
rdb.Set(ctx, "k", "v", 0)
```

**Supported command groups:** strings/keys, hashes, lists, sets, sorted sets, streams; `SCAN` (cursor + MATCH/COUNT/TYPE), `INFO`, `CONFIG GET/SET`; `MULTI/EXEC/DISCARD/WATCH/UNWATCH` (sequential, optimistic CAS — not Redis-grade isolation); `SUBSCRIBE/PSUBSCRIBE/PUBLISH`, `HELLO`(+`AUTH`). **Out of scope:** Lua scripting (`EVAL`), blocking ops (`BLPOP`/`WAIT` — DynamoDB has no wait-for-change), multi-DB (`SELECT`/`FLUSHDB`), and non-core module families (RedisJSON, bitmaps, HyperLogLog, Geo). See `KV.md` / `ROLLBACK.md` in the repo for the full matrix. `ENCLAVE_KV_MAX_VALUE_BYTES` caps a single value. Reserved `acme/` namespace still backs the ACME cert cache (see below), the only remaining user of the S3 storage subsystem.

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

The supervisor steps are: `0=stepCooldown`, `1=stepReadCurrentKey`, `2=stepStartMigration`, `3=stepDownloadEIF`, `4=stepSwapAndStart`, `5=stepWaitOutcome`, `6=stepHostCleanup`, `7=stepSupervisorUpdate`. Migration commits atomically when the runtime flips `/{dep}/{app}/{locked|unlocked}/KMSKeyID`; if the new enclave never becomes healthy by step 5, `rollbackMigration` emits under `stepWaitOutcome`, restores the EIF backup, and restarts the old enclave.

## `metrics` field in `/v1/enclave-info`

| Metric | Description |
|--------|-------------|
| `http_requests` | Total HTTP requests handled |
| `http_errors` | Requests returning 4xx/5xx |
| `kms_operations` | KMS Decrypt calls (DEK decryption) |
| `kms_errors` | Failed KMS Decrypt calls |

The former per-op `storage_*` / `secret_*` counters were dropped when the S3 storage HTTP API and dynamic secrets were replaced by the K/V store.

## Verified Clients

- **Go (HTTP)** — `client/` package (`client.New(...)` or `client.NewFromManifest(...)`). **Attested-TLS binding now enforced (#129):** `verify()` fetches the attestation over an unpinned bootstrap client (only `GET /enclave/attestation`), then pins the live TLS leaf cert to the attested `tlsKeyHash` and runs PCR0 + key-binding checks over the **pinned** client, so a cert mismatch fails before any app request — closing a MITM gap where the HTTP path previously skipped TLS verification. `Options.StrictTLS` adds public-CA/hostname validation on top of the pin; `Options.SkipKeyBinding` keeps PCR0 + pin but skips the signing-key check; `PinnedHTTPClient(tlsKeyHashHex, strict)` is exported. Then verifies Schnorr signatures on every response.
- **Go (gRPC)** — `client.GRPCConn(ctx, ...grpc.DialOption)` returns a `*grpc.ClientConn` whose TLS handshake pins the leaf-cert SHA-256 fingerprint to the attestation document's `tlsKeyHash` (decoded from `UserData` bytes `7:39`; `signingKeyHash` — renamed from `appKeyHash` — is bytes `47:79`). Both transports share `verifyLeafCertPin`, which rejects empty/all-zero hashes (fail closed). Native gRPC bypasses response signing — trust is established at handshake, so a wrong PCR0 or a TLS cert that doesn't match `tlsKeyHash` makes the handshake fail.
- **CLI** — `enclave curl <path>` calls an endpoint on the deployed enclave attestation-verified by default (`--expected-pcr0`), routing over the pinned connection; `--insecure` opts out (warns on stderr), `--strict-tls` adds PKI validation (mutually exclusive with `--insecure`). `enclave verify` pins the live cert to the attested fingerprint after the unpinned bootstrap.
- **Rust** — `client-rs/` Cargo workspace member.
