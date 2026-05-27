# Architecture

Simple Enclave is a two-process system inside the enclave: a single in-enclave **Runtime** (owns the TLS edge, attestation routes, response-signing middleware, and the catch-all reverse proxy) plus your **app**. Outside the enclave, the host-side **supervisor** owns lifecycle, networking, and admin endpoints.

> **v0.0.76 collapse (issue #85 follow-up):** the standalone `nitriding.Enclave` struct was folded into `runtime.Runtime`. The legacy intermediate `:7073` runtime-proxy hop is gone — `external client → gvproxy → pubSrv :443 (TLS, ALPN h2) → revProxy (h2c) → user app :7074` is now a single hop inside the enclave. The same chi mux serves `/enclave/*` attestation routes and `/v1/*` admin routes; it is also mounted on `privSrv` (internal loopback `:IntPort`, default `:8080`) so the user app reaches the admin handlers via plain-HTTP loopback for its storage / secrets / spans / logs callbacks.

## Topology

```
                    Client (HTTPS :443, ALPN: h2 / http/1.1)
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
│  │  ├── runtime.Runtime                              ││
│  │  │   ├── pubSrv (TLS :443, ALPN h2 / http/1.1)    ││
│  │  │   │   ├── /enclave/* attestation handlers     ││
│  │  │   │   ├── /v1/* admin handlers                ││
│  │  │   │   └── catch-all revProxy (h2c → :7074)    ││
│  │  │   └── privSrv (127.0.0.1:8080 — plain HTTP)   ││
│  │  │       same chi mux for user-app callbacks     ││
│  │  └── your-app    (plain HTTP/2-or-1.1 :7074)     ││
│  └───────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────┘
```

## Networking

| Address | Role |
|---------|------|
| `192.168.127.1` | gvproxy gateway/DNS (TAP interface) |
| `192.168.127.2` | Enclave virtual IP |
| `vsock:1024` | gvproxy outbound TCP proxy (configurable via `ENCLAVE_NITRIDING_HOST_PROXY_PORT`) |
| `vsock:3:8002` | IMDS forwarder target (host) |
| `127.0.0.1:80` | IMDS endpoint inside enclave (via viproxy) |
| `:443` | Public TLS — Runtime's `pubSrv` (terminated by `runtime.Runtime`; ALPN advertises `h2`, `http/1.1`). Default via `ENCLAVE_NITRIDING_EXT_PORT`. |
| `127.0.0.1:8080` | Internal: Runtime's `privSrv` loopback admin/attestation mux for user-app callbacks. Default via `ENCLAVE_NITRIDING_INT_PORT` (was `:7073` pre-v0.0.76). The user app gets it injected as `ENCLAVE_PROXY_PORT`. |
| `:7074` | Internal: user app (`ENCLAVE_APP_PORT`) |
| `127.0.0.1:8443` | Host supervisor management API (loopback only) |

## HTTP/2 + gRPC End-to-End (issue #85)

The enclave terminates HTTP/2 alongside HTTP/1.1 and forwards both transports to the user app without buffering:

- `pubSrv`'s TLS configs (self-signed + ACME) advertise `h2` in ALPN with `MinVersion = TLS 1.2`. Existing HTTP/1.1 clients still negotiate `http/1.1`. When ACME is enabled, `acme-tls/1` is also added so the autocert manager can complete TLS-ALPN-01 challenges in-band on the same `:443` listener.
- The internal `revProxy` dials the user app with a transport chosen by `ENCLAVE_NITRIDING_UPSTREAM` (`auto` default → `protocolSwitchTransport`: HTTP/1.1 inbound dispatched to `http.Transport{}`, HTTP/2 inbound to `http2.Transport{AllowHTTP: true}`; `h2c` pins HTTP/2 cleartext for gRPC-only deployments; `h1` pins HTTP/1.1 for plain-HTTP apps). `FlushInterval = -1` in both cases, so gRPC trailers and long-lived server-streaming responses survive the loopback hop.
- `Runtime.Middleware` short-circuits to `next.ServeHTTP` when the request `Content-Type` is `application/grpc*` (native gRPC over HTTP/2) or `application/grpc-web*` (gRPC-Web over HTTP/1.1 or HTTP/2). Without this bypass, the Schnorr response-signing middleware would buffer streams (gRPC clients also lose trailers). Trust for native-gRPC clients is established at TLS handshake time via the attestation document's `tlsKeyHash` — see `client.GRPCConn(ctx)`.
- `/v1/*` admin handlers are wrapped in `corsWildcard` so a browser SPA can call them cross-origin (`Access-Control-Allow-{Origin,Methods,Headers,Expose-Headers}: *`, `Access-Control-Max-Age: 600`, `OPTIONS` short-circuits with `204`). The catch-all upstream proxy is **not** wrapped — the user app owns its own CORS policy on its own responses.
- `LoggingMiddleware`'s `statusWriter.Flush()` delegates to the underlying writer so streaming responses still flow through.

## Boot Sequence

1. **EC2 user_data** (`tofu/modules/enclave/templates/user_data.sh.tftpl`) installs `nitro-cli`, configures vsock loopback, downloads the supervisor + EIF, and starts `enclave-supervisor.service`.
2. **Supervisor** starts gvproxy + IMDS forwarder, then `nitro-cli run-enclave` launches the EIF.
3. **runtime.Runtime** (in-enclave; single process owning the TLS edge):
   - `Start` binds `pubSrv` on `:ExtPort` (default `:443`, TLS with ALPN `h2, http/1.1`) and `privSrv` on `127.0.0.1:IntPort` (default `:8080`).
   - `Init` loads encrypted secret ciphertexts from SSM (`/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`).
   - Calls `kms:Decrypt` with a fresh Nitro attestation document — KMS verifies `RecipientAttestation:PCR0` matches policy.
   - Sets decrypted secrets as env vars (plaintext only inside enclave memory).
   - Generates an ephemeral secp256k1 attestation key. The TLS cert's SHA-256 fingerprint (`tlsKeyHash`) and `SHA256(attestationPubkey)` (`appKeyHash`) are both embedded in the NSM attestation document's `UserData`.
   - Extends PCR16+ with `SHA256(compressed_secp256k1_pubkey)` for each configured secret.
   - Wires the catch-all `revProxy` (HTTP/2 h2c upstream, `FlushInterval=-1`) onto the same chi mux that serves `/enclave/*` and `/v1/*`. Response-signing middleware is bypassed for `application/grpc*` and `application/grpc-web*`.
4. **Your app** is launched as a child process on `:7074`, inheriting the secret env vars, `ENCLAVE_RUNTIME_TOKEN`, and `ENCLAVE_PROXY_PORT` (= `cfg.IntPort`, e.g. `8080`) so its callbacks reach the admin mux over plain loopback HTTP.
5. **Listener-error propagation:** `Runtime.ListenErr()` exposes the first bind/serve failure on either listener; `cmd/runtime/main.go` selects on it alongside the child-process wait so a broken TLS listener `os.Exit(1)`s instead of leaving an enclave with no external endpoint.

## Upstream-App Exit Resilience (issue #122)

When the user app process exits — crash or clean shutdown — the runtime **stays alive** so the admin surface (`/v1/start-migration`, `/health`, `/v1/enclave-info`, storage/secrets) remains reachable. Tearing the whole runtime down on app exit would void an in-flight locked-key migration.

- `cmd/runtime/main.go` no longer calls `stop()` when the child process exits. It records the exit via `enc.MarkUpstreamExited(err)` (pass `nil` for a clean exit, the error otherwise), logs `"upstream app exited — runtime stays alive"`, then waits for explicit shutdown (`ctx.Done()`) or a listener failure (`ListenErr()` → `os.Exit(1)`).
- `runtime.Runtime` carries `upstreamExited atomic.Bool` + `upstreamErr atomic.Value`. `MarkUpstreamExited(err)` latches them; `UpstreamExited() (bool, string)` reads them back (error is empty on clean exit or if not exited — check the bool first).
- `GET /v1/enclave-info` surfaces the latch as an `upstream_app: { exited, error }` object (`UpstreamAppInfo` in `runtime_handlers.go`). `error` is `omitempty`.
- The catch-all `revProxy` to the dead app returns **502** (the reverse-proxy `ErrorHandler`), while `/v1/*` and `/enclave/*` runtime routes keep returning normally.

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

## PCR0 Signing (Tofu-provisioned, runtime-served)

A second AWS-rooted attestation of PCR0 (independent of the NSM document) is provisioned at `tofu apply` time and surfaced by the runtime:

- **`aws_kms_key.pcr0_signing`** — `ECC_NIST_P384`, `SIGN_VERIFY`, no rotation, 30-day deletion window, `prevent_destroy = true`. Aliased `alias/<prefix>-pcr0-signing`. Distinct from the secret-encryption KMS key — losing it makes past signatures un-verifiable, hence the safety net.
- **`terraform_data.sign_pcr0`** — local-exec (bash + `openssl` + `aws kms ...`) that re-runs whenever `effective_pcr0` or the signing-key id changes:
  1. Writes the PCR0 hex as raw bytes to `${path.module}/.signing/pcr0.bin`.
  2. `aws kms get-public-key` → DER → PEM via `openssl ec -pubin -inform DER -outform PEM`.
  3. `aws kms sign` with `--message-type DIGEST --signing-algorithm ECDSA_SHA_384`.
  4. Stores PubkeyPEM / PCR0 / Signature in SSM under `/{dep}/{app}/Signing/{PubkeyPEM,PCR0,Signature}` (the EC2 role's IAM `ssm:GetParameter` policy is extended to cover these three names).
- **`runtime/signature.go`** — `Signature.Load` reads those three SSM parameters during `runtime.Runtime.Init` (non-fatal: a deployment without signing provisioned just logs a warning and proceeds). `Signature.Snapshot()` returns `*PCR0SignatureInfo{PubkeyPEM, PCR0Hex, SignatureB64}` (nil when not ready). `enclaveInfoHandler` embeds the snapshot as the `pcr0_signature` field on `GET /v1/enclave-info` with `omitempty`, so consumers see it only when provisioned. There is no dedicated endpoint and no `signing:` block in `enclave.yaml` — provisioning is entirely a Tofu-module property.
- **Verification recipe (external):** decode `pubkey_pem`, hex-decode `pcr0_hex`, base64-decode `signature_b64`, then `openssl pkeyutl -verify -pubin -inkey pubkey.pem -in pcr0.bin -sigfile sig.bin`. This is what the v0.0.77 integration test does as the new `[35/35]` check.
- **Tofu output:** `pcr0_signing_key_arn` is exposed so the identity running `tofu apply` can be granted `kms:Sign` + `kms:GetPublicKey` on the key explicitly.

## TLS Cert Source — Self-signed or ACME (deploy-time)

The enclave's public `:443` listener can serve either a self-signed cert (default — trust anchored at the attestation document's `tlsKeyHash`) or a CA-issued cert via ACME (Let's Encrypt or `letsencrypt-staging`). Provisioning is **deploy-time, not EIF-baked**, so changing the domain is a redeploy rather than a rebuild.

- **`enclave.yaml` schema** — top-level `tls: { fqdn, provider, email, route53_zone_id }` block. `fqdn` is required when `provider ≠ self-signed` (validated by `fqdnRegex` in `cli/config.go`); `provider` is one of `self-signed` (default) / `letsencrypt` / `letsencrypt-staging`; `email` is an optional ACME contact for expiry notices; `route53_zone_id` is an optional Route53 hosted-zone ID that opts in to automatic `A`-record management for `fqdn` (`tls.route53_zone_id` without `tls.fqdn` is a config-load error). `enclave init` scaffolds the block.
- **Optional Route53 A record** — when `tls.route53_zone_id` is non-empty (and not in local mode) `tofu/modules/enclave/main.tf`'s `aws_route53_record.enclave` creates an `A` record `{ name = var.tls.fqdn, ttl = 60, records = [aws_eip.instance[0].public_ip] }` in that zone. Operator-managed DNS (Cloudflare, registrar, etc.) keeps working by leaving `route53_zone_id` empty and pointing DNS at the `elastic_ip` output manually. `deploy-iam-policy.json` scopes `route53:ChangeResourceRecordSets` / `GetHostedZone` / `ListResourceRecordSets` to `arn:aws:route53:::hostedzone/*` and `route53:GetChange` to `arn:aws:route53:::change/*`.
- **CLI → Tofu → SSM flow** — `cli/tofu.go` mirrors the `tls:` block into `tofu/env_values.auto.tfvars.json` as `tofuTLSVars`; the Tofu module builds a `tls_params` map and publishes it as SSM parameters under `/{dep}/{app}/env/` named `ENCLAVE_NITRIDING_FQDN`, `ENCLAVE_NITRIDING_USE_ACME`, `ENCLAVE_NITRIDING_ACME_DIRECTORY`, `ENCLAVE_NITRIDING_ACME_EMAIL`, `ENCLAVE_NITRIDING_ACME_CA`. Self-signed deployments leave the ACME params absent.
- **Runtime resolution at boot** — `runtime/environment.go::loadDeployTLSConfig` reads those parameters during `Runtime.Init` (`ParameterNotFound` is non-fatal — keeps the `self-signed` / `localhost` defaults). Result is a `deployTLSConfig{FQDN, UseACME, Directory, Email, CA}`.
- **ACME path** — `configureACME` constructs a `golang.org/x/crypto/acme/autocert.Manager` for the configured FQDN with `acmeClientForDirectory` (supports a literal `https://…/directory` URL plus the `ACME_CA` PEM bundle for private/test directories like Pebble) and `acmeStorageCache` as `Cache`. The challenge runs over **TLS-ALPN-01** on the same `:443` listener (no separate `:80` HTTP-01 bind, which the supervisor's IAM doesn't allow). `pubSrv`'s `tls.Config` adds `acme-tls/1` to the ALPN list and routes those handshakes to the autocert manager.
- **`certForHello` shim** — for inbound ClientHellos with no SNI (typical of IP-based probes or some health-checks), `GetCertificate` falls back to the configured FQDN so autocert can still produce / reuse the right cert. Without this shim the connection would fail before any HTTP request was sent.
- **Custom RoundTripper for ACME `Location` rewriting** — the autocert HTTP client uses a wrapping `RoundTripper` that rewrites the `Location` header on ACME responses so subsequent `Account` / `Order` requests stay under the directory's announced host. Required by some private ACME servers (including Pebble) that publish responses through a load balancer with a different external hostname.
- **Cert persistence — `acmeStorageCache`** — implements `autocert.Cache` against the encrypted Storage subsystem. Cert material (the leaf cert + key and the ACME account key) is sealed with the storage DEK (AES-256-GCM) and written to S3 under the reserved `acme/` prefix, so reboots and locked-key migrations reuse the issued cert instead of re-issuing. This avoids the Let's Encrypt rate limit, which would otherwise be hit very quickly given how often Nitro Enclaves are rebooted during migrations. The `acme/` namespace is reserved from the user K/V API (`Storage.Store` / `Load` reject it for non-internal callers). When storage is not provisioned the cache degrades to a no-op (a cache miss) — autocert still keeps the cert in-memory for the process lifetime, so a fresh issuance still works, it just doesn't survive a reboot.
- **End-to-end test** — `test/acme-test.sh` boots the test EIF against a local **Pebble** ACME server (`test/pebble/pebble-config.json`, certs generated by `test/pebble/gen-certs.sh`) and verifies that (a) the enclave issues a cert via TLS-ALPN-01, (b) the cert is persisted in the encrypted storage subsystem, (c) the cert is reused across a reboot (no second issuance). Wired into CI via `.github/workflows/acme-test.yml`; locally driven by `make test-acme`.

## OTLP/HTTP Endpoint Alignment

POST routes for telemetry follow the OTLP/HTTP spec so that a standard OTEL SDK exporter works without per-deployment URL overrides:

| Method | Path | Role |
|--------|------|------|
| `POST` | `/v1/metrics` | OTLP-protobuf metric ingest from the user app |
| `POST` | `/v1/traces` | OTLP-protobuf trace ingest from the user app |
| `POST` | `/v1/logs` | OTLP-protobuf log ingest from the user app |
| `GET` | `/v1/enclave-metrics` | JSON metric snapshot (cumulative counters + heap/goroutine gauges) |
| `GET` | `/v1/enclave-traces` | JSON history of recently-seen spans |
| `GET` | `/v1/enclave-logs` | JSON history of recently-seen log lines |

The GETs keep the `enclave-` prefix to make introspection visually distinct from OTLP ingest. `RegisterRoutes` (`runtime/runtime.go`) wires the POSTs (`handleMetricPost`, `Tracing.handlePost`, `Logging.handlePost`) onto the bare OTLP paths; the gRPC + Schnorr middlewares apply to both ingest and snapshot flows uniformly.

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

## Deploy-time Env Overlay (SSM-scan)

`Environment.Override` is called during `Runtime.Init`. It scans `/<deployment>/<app>/env/` in SSM via `GetParametersByPath` (paginated, `WithDecryption: true`, `Recursive: false`) and overlays every key it finds onto the process env on top of any defaults baked into the EIF. The trust boundary is the IAM grant on that SSM prefix.

- The previous `ENCLAVE_APP_ENV_KEYS` mechanism (a JSON list of `app.env` keys baked into the EIF at build time, with the runtime calling `GetParameter` per key) has been **removed**. The `appEnvKeysJson` block in every `flake.nix` variant (Go / Node.js / .NET / Rust) and the `ENCLAVE_APP_ENV_KEYS` env line are gone. Operators no longer need to enumerate env keys at build time — adding a new deploy-time env var is now `enclave tofu env --key … --value …` + `tofu apply`, **no EIF rebuild**.
- Defensive: empty key names or nested paths (containing `/`) are skipped so a misconfigured SSM tree can't surface unexpected env var names.
- `runtime/aws_clients.go::SSMAPI` and the test-friendly `ssmGetter` interface in `runtime/environment.go` both add `GetParametersByPath`; `loadDeployTLSConfig` still uses single-key `GetParameter` calls for the known `ENCLAVE_NITRIDING_*` TLS params.
- `app.env` in `enclave.yaml` is now reserved for **build-time PCR0-attested values** (e.g., `BUILD_VARIANT=prod`); the scaffolded templates default to `env: {}` and steer operators toward `enclave tofu env` for the common deploy-time case.

## File Map (key Go packages)

| Package | Files | Role |
|---------|-------|------|
| `cli/` | `aws.go`, `build.go`, `config.go`, `init.go`, `setup.go`, `template.go`, `tofu.go`, `verify.go`, `lifecycle.go`, `migration_status.go`, `test_init.go`, `test_boot.go`, `test_compose.go` | CLI subcommands, OpenTofu scaffold, CDK stack, attestation verify. New `enclave test` subcommand suite (`build` / `init` / `start` / `down`) scaffolds and runs `enclave/test/docker-compose.yml` for upstream-app local QEMU testing. |
| `runtime/` | `runtime.go`, `runtime_handlers.go`, `config.go` (incl. `UpstreamProtocol`), `attestation.go`, `kms.go`, `static_secret.go`, `dynamic_secrets.go`, `storage.go`, `migrate.go`, `policy_builder.go`, `tracing.go`, `metrics.go`, `signature.go`, `environment.go` (v0.0.78 — ENV reads + `loadDeployTLSConfig` for the deploy-time `ENCLAVE_NITRIDING_*` TLS params), `acme_cache.go` (v0.0.78 — `acmeStorageCache` implementing `autocert.Cache` against the encrypted Storage subsystem under the reserved `acme/` namespace), `nitriding_config.go` (reads `ENCLAVE_NITRIDING_UPSTREAM` into `Config.UpstreamProtocol`, defaulting `auto`), `utils.go`, `viproxy_setup.go`, `imds.go` | In-enclave runtime. `runtime.go` owns the `Runtime` struct, lifecycle (`New`/`Start`/`Init`/`Stop`), routing, response-signing + logging + gRPC-bypass middleware, TLS cert management, NSM helpers, the new `protocolSwitchTransport` / `upstreamTransport` (revProxy upstream HTTP-version selector), the `corsWildcard` admin-mux wrapper (`configureHTTPServers` coordinates shared setup and dispatches to `configureExternalHttpServer` + `configureInternalHttpServer`), and the upstream-app exit latch (`MarkUpstreamExited` / `UpstreamExited`, issue #122 — keeps the runtime alive after the user app exits). `runtime/config.go` holds `Config` + `Validate` + `String`. `runtime/attestation.go` holds `AttestationHashes`. `runtime/runtime_handlers.go` (renamed from `server_handlers.go`) holds every `/enclave/*` and admin handler as a factory returning `http.HandlerFunc`; its `RuntimeInfo` now embeds `UpstreamAppInfo` (`upstream_app: {exited, error}`) on `GET /v1/enclave-info`. `runtime/kms.go` owns `EnsureKeyID`, `VerifyKeyAuthorization`, `CreateMigrationKey`. `runtime/migrate.go` runs `handleStartMigration` (atomic `KMSKeyID` flip) + `VerifyPredecessorCommitment`. `runtime/signature.go` holds the `Signature` type — `Load(ctx, ssmAPI)` pulls PubkeyPEM / PCR0 / Signature from SSM (`/{dep}/{app}/Signing/*`) and `Snapshot()` feeds the `pcr0_signature` field of `GET /v1/enclave-info`. POSTs for OTLP ingest live at the bare paths (`POST /v1/{metrics,traces,logs}`); JSON-snapshot GETs keep the `enclave-` prefix. SSM ciphertext paths are key-scoped: `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`. |
| `runtime/nitriding/` | `cache.go`, `bufferpool.go`, `proxy.go`, `attestation.go`, `system{,_linux}.go`, `constants.go`, `keysync_initiator.go`, `keysync_shared.go`, `package_init.go` | Leaf utilities shared with the upstream nitriding fork: `Cache`, `BufPool`, `SetFdLimit`, `ConfigureLoIface`, `RunNetworking`, `Attest`, `NewLimitReader`, `InEnclave`, and `/dev/nsm`-backed entropy seeding via `package_init`. The previous `Enclave` struct, its `/enclave/sync` keysync responder, and the `/enclave/nonce` handler were removed in v0.0.76 — `Runtime` owns the TLS edge and admin mux directly. `certcache.go` (the in-memory `CertCache`) was removed in v0.0.78 in favour of `runtime.acmeStorageCache`, which persists cert material in the encrypted S3 storage subsystem so reboots and migrations reuse the cert. |
| `supervisor/` | `supervisor.go`, `lifecycle.go`, `migrate.go`, `health.go`, `networking.go`, `observability.go`, `validate.go` | Host-side single-process supervisor (gvproxy, IMDS fwd, watchdog, mgmt API, 7-step migration orchestrator — no KMS calls; just cooldown / start-migration / EIF swap / health poll / rollback / cleanup). `observability.go` proxies enclave OTEL metrics to Prometheus text on `:8443/metrics`; the dead `http.Get("localhost:9090/metrics")` scrape and the corresponding `:9090` vsock forward were dropped along with the runtime's chi-middleware Prometheus exposition. |
| `client/` | `client.go`, `verify.go`, `grpc.go` | Verified Go HTTP client (NSM chain + PCR0 + Schnorr per-response). `grpc.go` exposes `GRPCConn(ctx, ...DialOption)` for native gRPC over HTTP/2: TLS handshake pins the leaf cert fingerprint to the attestation document's `tlsKeyHash` (no per-response Schnorr — middleware bypasses gRPC). |
| `client-rs/` (Cargo workspace member) | `Cargo.toml` | Verified Rust HTTP client |
| `awsmocks/` | `Dockerfile`, `main.go`, `go.mod` | Combined kms-proxy (`:4000`) + mock-imds (`:1338`) in one Go binary, published as `ghcr.io/arklabshq/enclave-awsmocks:<version>` per release. Replaces the prior `test/local-kms-proxy/` and `test/mock-imds/` directories. |
| `runner/` | `Dockerfile`, `main.go`, `heartbeat.go`, `go.mod` | Test-runner entrypoint baked into `ghcr.io/arklabshq/enclave-test-runner:<version>`: seeds SSM, starts vhost-device-vsock + heartbeat, then execs supervisor whose watchdog re-invokes the runner with `--boot-only <eif>` to launch QEMU. Replaces `test/heartbeat.py` (inlined as `runner/heartbeat.go`) and the per-release `test/Dockerfile.supervisor` build path for upstream-app testing. The framework's own integration-test suite still uses `test/run.sh`. |
