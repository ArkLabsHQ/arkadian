# Architecture

Simple Enclave is a two-process system inside the enclave: a single in-enclave **Runtime** (owns the TLS edge, attestation routes, response-signing middleware, and the catch-all reverse proxy) plus your **app**. Outside the enclave, the host-side **supervisor** owns lifecycle, networking, and admin endpoints.

> **v0.0.76 collapse (issue #85 follow-up):** the standalone `nitriding.Enclave` struct was folded into `runtime.Runtime`. The legacy intermediate `:7073` runtime-proxy hop is gone — `external client → gvproxy → pubSrv :443 (TLS, ALPN h2) → revProxy (h2c) → user app :7074` is now a single hop inside the enclave. The same chi mux serves `/enclave/*` attestation routes and `/v1/*` admin routes; it is also mounted on `privSrv` (internal loopback `:IntPort`, default `:8080`) so the user app reaches the admin handlers via plain-HTTP loopback for its spans / logs / migration callbacks (persistent data now goes to the confidential K/V RESP listener instead).

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
| `127.0.0.1:6379` | Internal: confidential K/V RESP listener (TLS, loopback; `ENCLAVE_KV_RESP_PORT`). Injected to the user app as `ENCLAVE_KV_RESP_PORT`; `AUTH` = runtime token |
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
   - Runs **state-origin `Establish()`** (classify → ensureKey → verify → load → write): recomputes the `state_root` over runtime-owned SSM artifacts and requires a valid NSM receipt **before** decrypting anything (issue #131 — see below).
   - `Init` loads encrypted secret ciphertexts from SSM (`/{dep}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}`).
   - Calls `kms:Decrypt` with a fresh Nitro attestation document — KMS verifies `RecipientAttestation:PCR0` matches policy.
   - Sets decrypted static secrets as env vars (plaintext only inside enclave memory).
   - Generates an ephemeral secp256k1 attestation key. The TLS cert's SHA-256 fingerprint (`tlsKeyHash`) and `SHA256(attestationPubkey)` (`signingKeyHash`, renamed from `appKeyHash` in #129) are both embedded in the NSM attestation document's `UserData`.
   - Extends PCR16+ with `SHA256(compressed_secp256k1_pubkey)` for each configured secret.
   - Wires the catch-all `revProxy` (HTTP/2 h2c upstream, `FlushInterval=-1`) onto the same chi mux that serves `/enclave/*` and `/v1/*`. Response-signing middleware is bypassed for `application/grpc*` and `application/grpc-web*`.
4. **Your app** is launched as a child process on `:7074`, inheriting the secret env vars, `ENCLAVE_RUNTIME_TOKEN`, `ENCLAVE_PROXY_PORT` (= `cfg.IntPort`, e.g. `8080`) so its callbacks reach the admin mux over plain loopback HTTP, and `ENCLAVE_KV_RESP_PORT` (default `6379`) for the confidential K/V store (`AUTH` with the runtime token).
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

**Both `kms:Decrypt` and `kms:GenerateDataKey` are PCR0-attestation-gated** — the policy `EnclaveAttestedOperations` statement (formerly `EnclaveDecryptWithAttestation`) grants `["kms:Decrypt", "kms:GenerateDataKey"]` only when `kms:RecipientAttestation:PCR0` matches. `kms:Encrypt` (used by migration re-wrap) and `kms:GetKeyPolicy` stay ungated in the `EnclaveOperations` statement. So only an attested enclave can *mint* a new data key, not just read one. To honour the gate, `KMS.generateDataKey` (`runtime/kms.go`) always calls `GenerateDataKey` with a fresh NSM attestation as `Recipient` and recovers the plaintext from `CiphertextForRecipient` (CMS-enveloped to the enclave's ephemeral key), mirroring the decrypt path — the data key never crosses the host in the clear. It is used for both static-secret and storage-DEK genesis.

### First-boot Primary-Key Bootstrap

- Tofu writes `/{dep}/{app}/{locked|unlocked}/KMSKeyID = "UNSET"` (a `aws_ssm_parameter` placeholder with `ignore_changes=[value]`); the lock segment comes from `is_kms_key_locked`, so a locked deployment starts in its own `UNSET` namespace.
- The runtime's `EnsureKeyID` (in `runtime/kms.go`) reads that parameter on `Init`. If it sees the `"UNSET"` placeholder, it calls `kms:CreateKey` with a PCR0-locked policy already in the `Policy` argument — no external principal ever holds authority over the key.
- Race-safe: after `CreateKey` the runtime does an SSM `PutParameter` of the new key ID, then re-reads to confirm; if a peer won the race it `ScheduleKeyDeletion`s the losing key.
- Any read error (`ParameterNotFound`, `AccessDenied`) is fatal — the placeholder **must** exist so a misconfigured deployment cannot silently mint a key under the wrong SSM namespace.
- `VerifyKeyAuthorization` (the slimmed-down successor to `SelfApplyPolicy`) calls `kms:GetKeyPolicy` and runs `policyAdmitsPCR0` to confirm the key's policy permits the live PCR0 — boot fails fast if not.

### Default (Recovery-Capable) Policy

- Admin statement grants `kms:PutKeyPolicy`, `kms:GetKeyPolicy`, `kms:DescribeKey` to the AWS root account.
- Admin statement explicitly **excludes** `kms:Decrypt` and `kms:CreateGrant`.
- Enclave statement (`EnclaveAttestedOperations`) allows `kms:Decrypt` **and** `kms:GenerateDataKey` only when `kms:RecipientAttestation:PCR0` matches the enclave measurement.

### Lock-State SSM Namespacing

The KMS lock posture (`is_kms_key_locked` → `ENCLAVE_KMS_KEY_LOCKED`, plumbed through CLI tfvars → the Tofu module → `user_data` → the supervisor env) is bound into the SSM namespace: a `locked`|`unlocked` segment (from `lockSegment()`) is inserted after `/{deployment}/{app}/` in **every KMS-subtree path** — the `KMSKeyID` param, each secret's `Ciphertext`, and the `StorageDEK`:

```
/{deployment}/{app}/{locked|unlocked}/KMSKeyID
/{deployment}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}
/{deployment}/{app}/{locked|unlocked}/StorageDEK/Ciphertext/{kmsKeyId}
```

A locked deployment therefore lands in a **fresh namespace** whose `KMSKeyID` starts `UNSET`, forcing a brand-new locked key and regenerated secrets; the old unlocked key and ciphertexts are orphaned (manual cleanup). This makes the lock posture an IAM-enforceable boundary — a locked deployment can never read or write the unlocked namespace's material, and vice versa. **Migration-state params are *not* lock-namespaced** — `MigrationPreviousPCR0[Attestation]` stay on the shared `/{deployment}/{app}/<name>` path (supervisor `ssmParamPath`), while KMS-subtree params use `kmsSubtreeParamPath` (supervisor) / `kmsKeyIDParam` / `secretCiphertextParam` / `storageDEKCiphertextParam` (runtime).

> **BREAKING (already-deployed stacks):** existing deployments move to `/{dep}/{app}/unlocked/...`, so on the next deploy the enclave mints a new key and regenerates static secrets; the old non-namespaced key and ciphertexts are orphaned.

Recovery: rewrite the policy to authorise a new PCR0 → redeploy → new enclave attests → KMS decrypts. **Plaintext invariant holds during recovery.**

### Locked Policy (`is_kms_key_locked: true` + `enclave lock`)

- Applied with `--bypass-policy-lockout-safety-check` — irreversible.
- Removes all admin access (`PutKeyPolicy`, `ScheduleKeyDeletion`, etc.).
- Only the enclave with the exact PCR0 can call `kms:Decrypt`.
- Recovery requires the locked-key migration flow (creates a new key, doesn't unlock the old one).

> **The choice is permanent at first lock.**

## Locked-Key Migration (7 steps, atomic commit)

Triggered by host management API `POST /migrate` (NDJSON streaming). The new model **drops the two-phase `/Migration/*` staging namespace** in favour of an atomic `KMSKeyID` flip: re-encrypted secrets and the storage DEK are written to **lock-scoped, key-scoped** SSM paths `/{dep}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}` and `/{dep}/{app}/{locked|unlocked}/StorageDEK/Ciphertext/{kmsKeyId}`, then the single `PutParameter` on `/{dep}/{app}/{locked|unlocked}/KMSKeyID` is the commit point.

Supervisor steps (`supervisor/migrate.go`, plus step `0 = stepCooldown`):

1. **`stepReadCurrentKey`** — Read current KMS key ID from SSM.
2. **`stepStartMigration`** — `POST /v1/start-migration` on the running old enclave with body `{"new_pcr0": "<hex>"}`. The enclave inline-creates the migration key via `CreateMigrationKey` (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time — EC2 role never holds `kms:PutKeyPolicy`), `commitPCR31` runs first so a retry at a different target fails before any external write, then secrets + DEK are re-encrypted to the lock/key-scoped ciphertext paths, `storePCR0WithAttestation` writes the chain proof to `MigrationPreviousPCR0[Attestation]` (**attestation written first, PCR0 second** — since `VerifyPredecessorCommitment` treats a recorded PCR0 as proof its attestation exists, a partial write can never leave a predecessor PCR0 without its attestation), and finally the atomic flip of `/{dep}/{app}/{locked|unlocked}/KMSKeyID` to the new key ID commits the migration. A deferred `ScheduleKeyDeletion` cleans up the new key if anything before the flip fails.
3. **`stepDownloadEIF`** — Back up the old EIF on disk, download the new EIF from S3.
4. **`stepSwapAndStart`** — Stop old enclave, replace `image.eif`, start new enclave.
5. **`stepWaitOutcome`** — Poll `/health` on the new enclave until healthy. On timeout the supervisor calls `rollbackMigration` (restores the EIF backup, restarts the old enclave). The new enclave self-admits to the migration key via `kms:PutKeyPolicy` after attestation, which is why a wrong-PCR0 target no longer trips rollback at this step — the v3 rollback integration test now uses a wrong `app name` (so `EnsureKeyID` fails on first SSM read instead).
6. **`stepHostCleanup`** — Schedule the old KMS key for 7-day deletion.
7. **`stepSupervisorUpdate`** — Update the supervisor binary (warning, not fatal, if this fails — old supervisor stays running).

The supervisor no longer touches KMS at all (the old `acquireMigrationKey` / `applyTransitionalPolicy` / `buildTransitionalPolicy` helpers were deleted along with the transitional-policy phase).

### Predecessor Attestation Verification (boot-time)

The new enclave runs `Migrator.VerifyPredecessorCommitment` during `Init`. It is now a **real cryptographic check**, not audit-only:

- **Fail closed on a missing attestation** — if a predecessor PCR0 is recorded but its `MigrationPreviousPCR0Attestation` is blank/`UNSET`, `Init` fails (`"predecessor PCR0 … recorded but its attestation is missing"`). Because the migration writes the attestation before the PCR0, a recorded PCR0 always has one — a blank is a tampered or corrupt handoff.
- **Verify the predecessor's COSE document** — `verifyPCR31Commitment` → `verifyPCR31CommitmentWithRoots(…, nil)` calls `verifyAttestationDoc`, which runs `nitrite.Verify` (COSE Sign1 signature + AWS Nitro cert chain). A forged attestation document sitting in SSM can no longer satisfy the handoff. Production resolves the `nil` roots to nitrite's embedded AWS Nitro root; tests inject a synthetic CA (the trust anchor is now threaded explicitly — the old package-level `attestationRoots` global was removed).
- **Verify against the document's own timestamp** — the chain is validated with `CurrentTime = time.UnixMilli(doc.Timestamp)`, not `now()`, so a short-lived Nitro leaf cert that expired between migration time and the later boot doesn't reject an otherwise-valid attestation. The timestamp lives inside the signed payload, so a forged value fails the signature check.
- **Bind the attestation to the claimed predecessor** — the document's PCR0 must equal the stored `MigrationPreviousPCR0`, so a different (but still validly-signed) enclave's document can't be substituted. Only then is the committed **PCR31** trusted.
- **`dev` deployment skips COSE** — `skipCOSEVerification()` (true only when the build-time, PCR0-measured `deployment` is `dev`, which uses the QEMU mock NSM) falls back to `parseCOSEPayloadInsecure`. Any other deployment verifies. The `dev` value is baked into the EIF and cannot be flipped at deploy time (see non-overridable env below).

**Endpoint rename (prior release):** `/v1/export-key` was renamed to `/v1/start-migration` (verb-noun parity with `/v1/extend-pcr`, `/v1/lock-pcr`).

## State-Origin Verification (issue #131)

The runtime proved current code identity (PCR0) but not the **origin** of the persisted state it booted on, so a host with AWS-account access could pre-seed or swap the SSM artifacts the runtime owns (`KMSKeyID`, secret ciphertexts, storage DEK) and the genuine enclave would decrypt and run on attacker-known state.

- **State-origin receipts** — at genesis/migration the enclave emits an NSM-signed attestation whose `user_data` commits to a `state_root` computed (deterministic CBOR) over every runtime-owned SSM artifact. The commitment covers **ciphertext hashes**, not just `KMSKeyID`, so swapping a ciphertext under the accepted key (the EC2 role holds un-gated `Encrypt`/`GenerateDataKey`) changes the `state_root` and is rejected.
- **Every boot verifies before decrypt** — recompute the `state_root`, then require a valid receipt (AWS-root signature, PCR0 == self, `user_data` covers the recomputed root) before decrypting; otherwise fail closed. An attacker can't forge a receipt for the genuine PCR0 — only the genuine EIF emits them, and only over state it generated itself.
- **`state_origin.go`** — `Establish()` runs classify → ensureKey → verify → load → write in one place, so "verify before decrypt, commit after load" is structural, not a convention `Init` must remember.
- **Migration** — the predecessor writes a transition receipt over the successor's `state_root` (PCR31 → successor) before flipping `KMSKeyID`; the successor verifies and adopts it, then writes its own receipt. Rollback-onto-self (predecessor == us) skips the PCR31 check, matching `VerifyPredecessorCommitment`.
- **`VerifyKeyAuthorization` hardened** — rejects an un-gated `kms:Decrypt` and a `kms:PutKeyPolicy` granted to anyone when locked / to a non-root principal when unlocked.
- `GET /v1/enclave-info` now exposes `kms_key_locked`.

> **Removed this release:** the Tofu-provisioned runtime-served PCR0 signature (`runtime/signature.go`, `PCR0SignatureInfo`, the `/{dep}/{app}/Signing/*` SSM reads, and the `pcr0_signature` block on `/v1/enclave-info`). AWS-rooted PCR0 assurance is now carried by state-origin receipts and the NSM attestation chain. (The `aws_kms_key.pcr0_signing` Tofu resource may still exist in the module templates but is no longer consumed by the runtime.)

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
1. Fetch `/enclave/attestation` (NSM document) over an **unpinned bootstrap client**.
2. Verify the NSM document chain against the AWS Nitro root certificate.
3. **Pin the live TLS leaf cert** to the attested `tlsKeyHash` and run the remaining checks over the pinned client (issue #129 — the HTTP path, `enclave verify`, and `enclave curl` now enforce this, closing a MITM gap where a host could terminate TLS with its own cert while relaying the genuine attestation; gRPC already pinned).
4. Confirm PCR0 matches the expected build measurement.
5. Confirm `signingKeyHash` (renamed from `appKeyHash`) in `UserData` matches `SHA256(attestation_pubkey)`.
6. On every subsequent request, verify the response Schnorr signature against the bound pubkey.

`verifyLeafCertPin` is shared by the HTTP and gRPC transports and rejects empty/all-zero hashes; `Options.StrictTLS` adds PKI validation, `Options.SkipKeyBinding` keeps PCR0 + pin only.

## Confidential K/V Store (Redis / RESP over DynamoDB)

Replaces the old S3 `PUT/GET/DELETE/LIST /v1/storage/{key}` HTTP API **and** the dynamic-secrets API (both removed this release). `runtime/kvstore.go` is a DynamoDB-backed engine; `runtime/resp.go` is a `redcon`-based Redis-protocol front-end (`respServer`).

- **Transport** — a TLS listener bound to loopback **inside** the enclave (default `:6379`, `ENCLAVE_KV_RESP_PORT`); not network-exposed. Auth is the runtime token via RESP `AUTH`, over the attestation-bound TLS channel.
- **Confidential** — each value is AES-256-GCM sealed under the in-enclave KMS DEK before it reaches DynamoDB (whose server-side encryption is operator-readable); AAD binds `{deployment, app, key, version, chunk}`. Collections (hash/list/set/zset/stream) are one sealed CBOR blob, so ops are O(collection).
- **Rollback-resistant (issue #134, `anchor.go`)** — every committed write is anchored to a compliance-locked, DEK-sealed **S3 Object-Lock** object. A boot gate fails closed if the live store is already rolled back; a lazy per-read version-floor check sets a halt flag (`/health` → 503, RESP refused) on regression. `ENCLAVE_ANCHOR_WINDOW` (retain-until, ~10y default) is in `nonOverridableEnv` so an operator can't shorten it to wait out the Object Lock.
- **Storage AAD binding (Tier 0)** — the underlying seal/open is `sealStorage`/`openStorage`/`storageAAD` with a versioned envelope (`0x01 || nonce || ct+tag`) and AAD bound to `"deployment/app/data/<key>"`, rejecting relabel / cross-deployment / cross-app / legacy-unversioned blobs on `Load`.
- **Command coverage** — strings/keys, hashes, lists, sets, sorted sets, streams; `SCAN` (cursor + MATCH/COUNT/TYPE), `INFO`, `CONFIG GET/SET`; `MULTI/EXEC/DISCARD/WATCH/UNWATCH` (sequential, optimistic CAS — no cross-key isolation); `SUBSCRIBE/PSUBSCRIBE/PUBLISH`, `HELLO`(+`AUTH`). Out of scope: Lua, blocking ops, multi-DB, non-core module families. See `KV.md` / `ROLLBACK.md`.

The S3 storage subsystem (`storage.go`) is demoted to backing only the ACME cert cache (`acmeStorageCache`) under the reserved `acme/` namespace; the DEK is still generated via KMS at first boot and re-encrypted during locked-key migration.

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
- **Non-overridable framework-identity vars** — the overlay refuses to set any key in `nonOverridableEnv`: `ENCLAVE_DEPLOYMENT`, `ENCLAVE_APP_NAME`, `ENCLAVE_KMS_KEY_LOCKED`, `ENCLAVE_MIGRATION_COOLDOWN`, `ENCLAVE_SECRETS_CONFIG` (each is logged and skipped). These are baked into the EIF and measured into PCR0 — they name the SSM/KMS namespace, define the KMS lock posture and the set of managed secrets, and gate security-critical timing / the `dev` COSE-skip. Letting an SSM writer change them would redirect the namespace or flip a security check, so they are PCR0-measured identity, not deploy-time config.
- `runtime/aws_clients.go::SSMAPI` and the test-friendly `ssmGetter` interface in `runtime/environment.go` both add `GetParametersByPath`; `loadDeployTLSConfig` still uses single-key `GetParameter` calls for the known `ENCLAVE_NITRIDING_*` TLS params.
- `app.env` in `enclave.yaml` is now reserved for **build-time PCR0-attested values** (e.g., `BUILD_VARIANT=prod`); the scaffolded templates default to `env: {}` and steer operators toward `enclave tofu env` for the common deploy-time case.

## File Map (key Go packages)

| Package | Files | Role |
|---------|-------|------|
| `cli/` | `aws.go`, `build.go`, `config.go`, `init.go`, `setup.go`, `template.go`, `tofu.go`, `verify.go`, `lifecycle.go`, `migration_status.go`, `test_init.go`, `test_boot.go`, `test_compose.go` | CLI subcommands, OpenTofu scaffold + `tofu apply`, attestation verify (the legacy CDK path is gone — the `enclave.yaml` field is `deployment` (renamed from `prefix`), and dead `CDK_PREFIX` / `VERSION` / `AWS_REGION` build env vars were removed). New `enclave test` subcommand suite (`build` / `init` / `start` / `down`) scaffolds and runs `enclave/test/docker-compose.yml` for upstream-app local QEMU testing. |
| `runtime/` | `runtime.go`, `servers.go` (server setup, split out this release), `runtime_handlers.go`, `config.go` (incl. `UpstreamProtocol`; `UseProfiling` + `UseVsockForExtPort` removed), `attestation.go`, `kms.go`, `static_secret.go`, `kvstore.go` (DynamoDB K/V engine), `resp.go` (`redcon` RESP front-end), `anchor.go` (S3 Object-Lock rollback anchor), `state_origin.go` (state-origin receipts), `storage.go` (now only backs the ACME cert cache), `migrate.go`, `policy_builder.go`, `tracing.go`, `metrics.go`, `environment.go` (ENV reads + `loadDeployTLSConfig` for deploy-time `ENCLAVE_NITRIDING_*` TLS params + `respPort`/`anchorWindow`), `acme_cache.go` (`acmeStorageCache` implementing `autocert.Cache` against the encrypted Storage subsystem under the reserved `acme/` namespace), `nitriding_config.go` (reads `ENCLAVE_NITRIDING_UPSTREAM` into `Config.UpstreamProtocol`, defaulting `auto`), `utils.go`, `imds.go` — **removed:** `dynamic_secrets.go`, `signature.go` | In-enclave runtime. `runtime.go` owns the `Runtime` struct, lifecycle (`New`/`Start`/`Init`/`Stop`), routing, response-signing + logging + gRPC-bypass middleware, TLS cert management, NSM helpers, the new `protocolSwitchTransport` / `upstreamTransport` (revProxy upstream HTTP-version selector), the `corsWildcard` admin-mux wrapper (`configureHTTPServers` coordinates shared setup and dispatches to `configureExternalHttpServer` + `configureInternalHttpServer`), and the upstream-app exit latch (`MarkUpstreamExited` / `UpstreamExited`, issue #122 — keeps the runtime alive after the user app exits). `runtime/config.go` holds `Config` + `Validate` + `String`. `runtime/attestation.go` holds `AttestationHashes`. `runtime/runtime_handlers.go` (renamed from `server_handlers.go`) holds every `/enclave/*` and admin handler as a factory returning `http.HandlerFunc`; its `RuntimeInfo` now embeds `UpstreamAppInfo` (`upstream_app: {exited, error}`) on `GET /v1/enclave-info`. `runtime/kms.go` owns `EnsureKeyID`, `VerifyKeyAuthorization`, `CreateMigrationKey`, and `generateDataKey` (attestation-`Recipient` data-key minting for static-secret + storage-DEK genesis, satisfying the now-gated `kms:GenerateDataKey`). `runtime/policy_builder.go` builds the `EnclaveAttestedOperations` statement gating both `Decrypt` + `GenerateDataKey`. `runtime/environment.go` adds `lockSegment()` (`locked`|`unlocked`), the lock-scoped path helpers (`kmsKeyIDParam`, `secretCiphertextParam`, `storageDEKCiphertextParam`), the `nonOverridableEnv` allowlist enforced by the SSM env overlay, and `skipCOSEVerification()`. `runtime/attestation.go` adds `verifyAttestationDoc` (COSE + Nitro-chain verification at the doc's own timestamp) + `parseCOSEPayloadInsecure`. `runtime/migrate.go` runs `handleStartMigration` (atomic `KMSKeyID` flip) + `VerifyPredecessorCommitment` (now cryptographically verifies the predecessor's attestation and binds its PCR0 before trusting PCR31; fails closed on a missing attestation). `runtime/state_origin.go` owns the `StateOrigin` subsystem — `state_root` over runtime-owned SSM artifacts (deterministic CBOR), receipt write/verify, and `Establish()` (verify-before-decrypt); `RuntimeInfo` now also carries `kms_key_locked`. `runtime/kvstore.go` + `runtime/resp.go` + `runtime/anchor.go` implement the confidential K/V store and its S3 Object-Lock rollback anchor (the `pcr0_signature` / `runtime/signature.go` PCR0-signing path was removed). POSTs for OTLP ingest live at the bare paths (`POST /v1/{metrics,traces,logs}`); JSON-snapshot GETs keep the `enclave-` prefix. SSM ciphertext paths are lock-scoped and key-scoped: `/{dep}/{app}/{locked|unlocked}/{secret}/Ciphertext/{kmsKeyId}`. |
| `runtime/nitriding/` | `cache.go`, `bufferpool.go`, `proxy.go`, `attestation.go`, `system{,_linux}.go`, `constants.go`, `keysync_initiator.go`, `keysync_shared.go`, `package_init.go` | Leaf utilities shared with the upstream nitriding fork: `Cache`, `BufPool`, `SetFdLimit`, `ConfigureLoIface`, `RunNetworking`, `Attest`, `NewLimitReader`, `InEnclave`, and `/dev/nsm`-backed entropy seeding via `package_init`. The previous `Enclave` struct, its `/enclave/sync` keysync responder, and the `/enclave/nonce` handler were removed in v0.0.76 — `Runtime` owns the TLS edge and admin mux directly. `certcache.go` (the in-memory `CertCache`) was removed in v0.0.78 in favour of `runtime.acmeStorageCache`, which persists cert material in the encrypted S3 storage subsystem so reboots and migrations reuse the cert. |
| `supervisor/` | `supervisor.go`, `lifecycle.go`, `migrate.go`, `health.go`, `networking.go`, `observability.go`, `validate.go`, `environment.go` | Host-side single-process supervisor (gvproxy, IMDS fwd, watchdog, mgmt API, 7-step migration orchestrator — no KMS calls; just cooldown / start-migration / EIF swap / health poll / rollback / cleanup). `environment.go` mirrors the runtime's lock posture (`kmsKeyLocked` / `lockSegment` from `ENCLAVE_KMS_KEY_LOCKED`, plumbed via `user_data`): `kmsSubtreeParamPath` builds lock-scoped KMS-subtree paths (`KMSKeyID`), while migration-state params stay on the un-namespaced `ssmParamPath`. `observability.go` proxies enclave OTEL metrics to Prometheus text on `:8443/metrics`; the dead `http.Get("localhost:9090/metrics")` scrape and the corresponding `:9090` vsock forward were dropped along with the runtime's chi-middleware Prometheus exposition. |
| `client/` | `client.go`, `verify.go`, `grpc.go` | Verified Go HTTP client (NSM chain + PCR0 + Schnorr per-response). `grpc.go` exposes `GRPCConn(ctx, ...DialOption)` for native gRPC over HTTP/2: TLS handshake pins the leaf cert fingerprint to the attestation document's `tlsKeyHash` (no per-response Schnorr — middleware bypasses gRPC). |
| `client-rs/` (Cargo workspace member) | `Cargo.toml` | Verified Rust HTTP client |
| `awsmocks/` | `Dockerfile`, `main.go`, `go.mod` | Combined kms-proxy (`:4000`) + mock-imds (`:1338`) in one Go binary, published as `ghcr.io/arklabshq/enclave-awsmocks:<version>` per release. Replaces the prior `test/local-kms-proxy/` and `test/mock-imds/` directories. |
| `runner/` | `Dockerfile`, `main.go`, `heartbeat.go`, `go.mod` | Test-runner entrypoint baked into `ghcr.io/arklabshq/enclave-test-runner:<version>`: seeds SSM, starts vhost-device-vsock + heartbeat, then execs supervisor whose watchdog re-invokes the runner with `--boot-only <eif>` to launch QEMU. Replaces `test/heartbeat.py` (inlined as `runner/heartbeat.go`) and the per-release `test/Dockerfile.supervisor` build path for upstream-app testing. The framework's own integration-test suite still uses `test/run.sh`. |
