# Documentation Sync History - Simple Enclave

## 2026-05-25 - Protocol switching + CORS + Session Manager port-forwarding + Route53 zone ID + AWS profile flag
**From**: `167dd4a9bf7fc17ef96304cfc374eac4a3f79935`
**To**: `d795bc7166551f7752e59428ebbefe2cbdc7dd2f`
**Synced By**: /update-project enclave
**Status**: Documentation updated — runtime revProxy upstream protocol selector + CORS wrapper on `/v1/*`; CLI read-only commands switched to SSM Session Manager port-forwarding; new optional `tls.route53_zone_id`; new `--profile` flag across cross-repo commands; IAM policy Route53 scoping fix.

**Commits Analyzed** (8):
- `b621ded` feat(runtime): protocol switching + CORS in reverse proxy — new `Config.UpstreamProtocol`; `nitriding_config.go` reads `ENCLAVE_NITRIDING_UPSTREAM` (default `auto`); new `protocolSwitchTransport` (HTTP/1.1 inbound → `http.Transport{}`, HTTP/2 inbound → `http2.Transport{AllowHTTP: true}` via `r.ProtoMajor`) and `upstreamTransport(mode)` selector (`auto` / `h2c` / `h1`) in `runtime/runtime.go`; new `corsWildcard` middleware wraps `/v1/*` (admin) — wildcard `Access-Control-Allow-{Origin,Methods,Headers,Expose-Headers}` + `Max-Age: 600`, `OPTIONS` short-circuits with `204`; catch-all upstream proxy intentionally unwrapped (user app owns its CORS). `cli/lifecycle.go` `start` / `stop` refactored to a shared `lifecycleCmd(action, …)` factory. Unit tests in `runtime/runtime_test.go`.
- `5707453` feat(session): SSM **Session Manager** port-forwarding transport for log/metrics/trace — new `sessionStarter` / `cmdSessionStarter` interface in `cli/aws.go`; `StartPortForward` spawns `aws ssm start-session --document-name AWS-StartPortForwardingSession` to `:8443` on the instance; allocates an ephemeral local port with one-shot `EADDRINUSE` retry; tees stderr (matches the canonical `"SessionManagerPlugin is not found"` sentinel; surfaces AWS-CLI exit errors with captured stderr instead of generic 15 s timeout); cleanup `SIGTERM`s the AWS-CLI process group with 2 s `SIGKILL` escalation. New `httpViaSession` + `fetchSupervisor` + `sessionClosingBody` HTTP plumbing; `cli/log.go` / `metrics_cmd.go` / `trace_cmd.go` route through it instead of `SSM RunCommand` so responses no longer get capped at 24 KB. New `cli/session_test.go`.
- `9965dd1` fix(cli): suppress errors on `body.Close()` in log / metrics / trace.
- `7175cd2` feat(cli): add optional `--profile` flag to lifecycle, log, metrics, trace commands — empty defaults to `AWS_PROFILE` env / default credential chain; signatures of `runLifecycle` / `runLog` / `runMetricsCmd` / `runTraceCmd` updated to take `profile`; usage strings note the fallback behaviour.
- `b505eeb` refactor(cli): streamline comments in `aws.go` / `log.go`.
- `992b57d` feat(cli): Route53 zone ID for automatic A-record management — new `TLSConfig.Route53ZoneID` (`yaml:"route53_zone_id"`) in `cli/config.go`; loader rejects `route53_zone_id` without `fqdn`. `cli/init.go` template comments updated to describe the manual-vs-tofu DNS choice and scaffolds the field. Tofu (`cli/tofu_files.go`): `variable "tls"` now `{ fqdn, provider, email, route53_zone_id }` with empty defaults; new `aws_route53_record.enclave` (`count = var.local || var.tls.route53_zone_id == "" ? 0 : 1`, 60 s TTL, points at `aws_eip.instance[0].public_ip`). `deploy-iam-policy.json` extended with `route53:GetChange` (still wildcard for now). End-to-end test (`test/acme-test.sh`) exercises the flow; `test/docker-compose.yml` bumped to runner v0.0.79.
- `6e54e4d` fix(aws): tighten Route53 IAM in `deploy-iam-policy.json` — split into two statements: `ChangeResourceRecordSets` / `GetHostedZone` / `ListResourceRecordSets` scoped to `arn:aws:route53:::hostedzone/*`, and `route53:GetChange` scoped to `arn:aws:route53:::change/*` (was previously wildcard); `cli/init.go` bumps the runner image tag.
- `e369676` add AWS profile support to session management and port-forwarding — `awsClients` gains a `profile` field stored at `newAWSClientsWithEnv`; `sessionStarter.StartPortForward` signature now takes `profile`; `cmdSessionStarter.startOnce` conditionally appends `--profile <name>` to the `aws ssm start-session` argv when non-empty; `httpViaSession` plumbs `ac.profile` through. Mirrors the `--profile` flag added in `7175cd2` into the Session Manager subprocess path.

**Documentation Updates**:
- `INDEX.md` (project) — new "Upstream Protocol" + "Admin CORS" rows in Quick Reference; added `tls.route53_zone_id` row to the Configuration table with the IAM scoping note; `Default Ports` row note added that `log`/`trace`/`metrics` now reach `:8443` over Session Manager port-forwarding; new `enclave start` / `stop` / `log` / `trace` / `metrics` rows in the CLI Commands lifecycle table covering the `--profile` flag and the Session Manager transport.
- `system/architecture.md` — extended the HTTP/2 + gRPC paragraph with the `ENCLAVE_NITRIDING_UPSTREAM` `auto` / `h2c` / `h1` selector + the `corsWildcard` admin-mux wrapper; TLS Cert Source section: schema row updated to `{ fqdn, provider, email, route53_zone_id }`, new bullet on the optional Route53 A-record (Tofu `aws_route53_record.enclave`, IAM scoping in `deploy-iam-policy.json`). File map row for `runtime/` updated to list `protocolSwitchTransport` / `upstreamTransport` / `corsWildcard` and to note `nitriding_config.go` reading `ENCLAVE_NITRIDING_UPSTREAM`.
- `system/project_overview.md` — extended the "Inbound HTTP/2 + gRPC end-to-end" capability with the upstream-protocol selector; new "Permissive CORS on admin endpoints" / "Session Manager port-forwarding for read-only CLI commands" / "`--profile` flag on cross-repo CLI commands" capability bullets; "Deploy-time TLS" capability updated to mention `route53_zone_id` + the Tofu A-record + IAM scoping.
- `testing/usage.md` — `enclave.yaml` example now scaffolds `route53_zone_id`; ACME section adds the `route53_zone_id` line to the example yaml and a paragraph on the manual-vs-tofu DNS choice + IAM coverage.
- `testing/how_to_run.md` — "Read-only CLI commands (cross-repo)" section extended to cover `start` / `stop`, the optional `--profile` flag, and the SSM Session Manager port-forwarding transport (Session Manager Plugin requirement, stderr surfacing, cleanup semantics).
- `testing/api-reference.md` — HTTP/2 / ALPN section extended with the `ENCLAVE_NITRIDING_UPSTREAM` selector; new CORS section documenting `corsWildcard` headers + `OPTIONS` short-circuit + scope (admin only, not the upstream proxy).
- `INDEX.md` (master) — enclave Key Capabilities: added "Optional Route53 A-record management", "Per-request upstream protocol switching", "Permissive CORS on `/v1/*` admin routes", "SSM Session Manager port-forwarding for `log` / `trace` / `metrics`", and "`--profile` flag on cross-repo CLI commands" bullets; "Deploy-time Let's Encrypt / ACME TLS" bullet's schema reference updated to `{ fqdn, provider, email, route53_zone_id }`. Tags extended with `route53`, `route53-zone-id`, `cors`, `protocol-switching`, `h2c`, `session-manager`, `port-forwarding`, `aws-profile`. Triggers extended with `route53 enclave`, `enclave cors`, `ENCLAVE_NITRIDING_UPSTREAM`, `session manager port forward`, `enclave log truncated`, `route53_zone_id`, `protocol switch transport`, `cors wildcard`, `upstreamTransport`, `aws profile flag`, `sessionStarter`, `httpViaSession`, `enclave start`, `enclave stop`, `enclave log --profile`, `enclave metrics --profile`.

## 2026-05-22 - Release v0.0.78 + deploy-time Let's Encrypt / ACME TLS support
**From**: `c8cea3504513cbe9a524020238bc27988b5c1512`
**To**: `167dd4a9bf7fc17ef96304cfc374eac4a3f79935`
**Synced By**: /update-project enclave
**Status**: Documentation updated — new deploy-time ACME TLS path (`tls:` block in `enclave.yaml`, CLI → tofu → SSM, runtime `loadDeployTLSConfig`, `acmeStorageCache` cert persistence, Pebble-backed end-to-end test), version bump to v0.0.78

**Commits Analyzed** (6):
- `f41cb8e` feat(tls): add deploy-time Let's Encrypt/ACME support — new top-level `tls: { fqdn, provider, email }` block in `enclave.yaml` (validated by `fqdnRegex` in `cli/config.go`; `provider ∈ {self-signed, letsencrypt, letsencrypt-staging}`, defaults to `self-signed`; scaffolded by `enclave init`). The block flows through `cli/tofu.go` → `cli/tofu_files.go` → SSM as `/{dep}/{app}/env/ENCLAVE_NITRIDING_{FQDN,USE_ACME,ACME_DIRECTORY,ACME_EMAIL,ACME_CA}` (Tofu builds a `tls_params` map that's merged into `env_values`). Runtime side: `runtime/environment.go`'s new `loadDeployTLSConfig` reads those parameters during `Runtime.Init` (defaults: `self-signed` / `localhost`; `ParameterNotFound` is non-fatal); `configureACME` builds an `autocert.Manager` with `acmeClientForDirectory` (supports literal `https://…/directory` URL + optional CA PEM bundle for private/test directories); `acmeStorageCache` implements `autocert.Cache` against the encrypted Storage subsystem, AES-GCM-sealing cert material under the storage DEK and writing it to S3 under the reserved `acme/` namespace (degrades to no-op when storage is not provisioned). New `runtime/acme_cache.go`, `runtime/acme_cache_test.go`, `runtime/acme_directory_test.go`, `runtime/environment.go`, `runtime/environment_test.go`. `pubSrv` adds `acme-tls/1` to ALPN so TLS-ALPN-01 challenges run in-band on `:443`. Old in-memory cert cache (`runtime/nitriding/certcache.go` + test) removed. Test plumbing: `Makefile` adds `test-acme` target; new `test/acme-test.sh` (345 LOC) + `test/pebble/{gen-certs.sh,pebble-config.json,.gitignore}` + a Pebble service in `test/docker-compose.yml` under the new `acme` profile; CI workflow `.github/workflows/acme-test.yml`.
- `866dd3a` fix(test): reduce memory allocation for ACME test and enhance boot diagnostics — `test/acme-test.sh` tweaks: smaller QEMU memory footprint to keep CI runners green, extra boot-time diagnostics so an ACME-issuance failure surfaces a usable trace.
- `6c3323d` feat(acme): implement custom RoundTripper to handle Location header for ACME responses — `runtime/runtime.go`'s autocert HTTP client now wraps `http.DefaultTransport` with a `RoundTripper` that rewrites the `Location` header on ACME responses so subsequent `Account` / `Order` requests stay under the directory's announced host. Required by Pebble and some private ACME servers behind a load balancer.
- `b0d5af9` feat(tls): add `certForHello` method to resolve nameless ClientHello to FQDN — for inbound ClientHellos with no SNI (IP-based probes / health-checks), `GetCertificate` falls back to the configured FQDN so autocert can still serve the right cert. Without the shim such handshakes would fail before any HTTP request was sent. Covered by new `runtime/tls_test.go`.
- `48be8c9` chore(test): keep generated tofu artifacts out of the PR diff — `run.sh` / `acme-test.sh` regenerate `test/app/tofu/main.tf`, `modules/enclave/main.tf` and `env_values.auto.tfvars.json` on every run; previous commits had swept test-run residue into the PR (incl. a throwaway Pebble CA cert). `env_values.auto.tfvars.json` is now untracked and gitignored; the others are reverted to the branch point.
- `167dd4a` release v0.0.78 — `cli/runtime-hashes.json` bumped `rev` `v0.0.77 → v0.0.78`, `hash` + `vendor_hash` refreshed.

**Documentation Updates**:
- `INDEX.md` (project) — Latest Release `v0.0.77 → v0.0.78`; new "TLS Cert Source" row in Quick Reference (self-signed default vs ACME, `ENCLAVE_NITRIDING_*` SSM publish path, `acmeStorageCache` persistence, redeploy ≠ rebuild); new `tls.fqdn` / `tls.provider` / `tls.email` rows in the Configuration table.
- `system/project_overview.md` — added "Deploy-time TLS — self-signed or Let's Encrypt / ACME" capability bullet (full schema → SSM → runtime flow, autocert via TLS-ALPN-01, `certForHello`, `RoundTripper` `Location` rewrite, `acmeStorageCache` under reserved `acme/` namespace, Pebble-backed end-to-end test). Updated `runtime/` row to list `runtime/environment.go` (incl. `loadDeployTLSConfig`) and `runtime/acme_cache.go`; updated `runtime/nitriding/` row to note `CertCache` removal in v0.0.78. Added `test/acme-test.sh` and `test/pebble/` to the repository layout tree; added `.github/workflows/acme-test.yml` to the workflows list.
- `system/architecture.md` — extended the ALPN paragraph to mention `acme-tls/1` for TLS-ALPN-01 challenges; new "TLS Cert Source — Self-signed or ACME (deploy-time)" section (yaml schema, CLI→Tofu→SSM env-key list, runtime resolution, ACME path with autocert + custom directory client, `certForHello` shim, `Location`-header `RoundTripper`, `acmeStorageCache` persistence under reserved `acme/` namespace, Pebble end-to-end test). File-map `runtime/` row updated with `environment.go` + `acme_cache.go`; `runtime/nitriding/` row updated to drop `certcache.go`.
- `testing/usage.md` — `enclave.yaml` example now includes the top-level `tls:` block with inline comments; new "Enable a CA-trusted Cert (Let's Encrypt / ACME)" section under deploy steps (yaml snippet, TLS-ALPN-01 requirement, DEK-sealed S3 persistence rationale, staging-first recommendation, domain-change as redeploy-not-rebuild).
- `testing/how_to_test.md` — added `make test-acme` to the Make-targets snippet with a paragraph describing the Pebble flow + the `.github/workflows/acme-test.yml` CI hook; extended the runtime unit-test list with `runtime/acme_cache_test.go`, `runtime/acme_directory_test.go`, `runtime/tls_test.go`.
- `sop/development-workflow.md` — runtime unit-test list extended with `runtime/acme_cache_test.go`, `runtime/acme_directory_test.go`, `runtime/tls_test.go`; integration-tests block adds `make test-acme`; CI paragraph extended to mention `acme-test.yml`.
- `INDEX.md` (master) — enclave Key Capabilities: added "Deploy-time Let's Encrypt / ACME TLS" bullet; tags extended with `tls`, `acme`, `letsencrypt`, `tls-alpn-01`, `autocert`, `pebble`; ask_question / develop / test_or_run triggers extended with TLS / ACME terms (`enclave tls`, `letsencrypt enclave`, `acme support`, `tls block`, `make test-acme`, etc.); Dependencies updated to mention `golang.org/x/crypto/acme/autocert` and Pebble.

## 2026-05-21 - Release v0.0.77 + `enclave upgrade` command + deployer IAM policy template
**From**: `c173a68f955b83aa3b01ed736dc64826bc468394`
**To**: `c8cea3504513cbe9a524020238bc27988b5c1512`
**Synced By**: /update-project enclave
**Status**: Documentation updated — new CLI command for syncing pinned runtime, repo-root least-privilege deployer IAM policy template, version bump to v0.0.77

**Commits Analyzed** (3):
- `ec6afcc` feat(upgrade): add upgrade command to sync CLI with runtime version — new `cli/upgrade.go` + `cli/upgrade_test.go`; `upgradeCmd()` registered in `cli/main.go` between `setupCmd()` and `tofuCmd()`. Rewrites the top-level `runtime:` block (`rev` / `hash` / `vendor_hash`) in `enclave.yaml` to the coordinates baked into the CLI binary (via `runtimeRev`/`runtimeHash`/`runtimeVendorHash` ldflags from `cli/runtime-hashes.json`). `replaceRuntimeBlockValue` walks indent levels to scope replacement strictly to the top-level `runtime:` mapping — `app.nix_rev`/`nix_hash`/`nix_vendor_hash` and nested keys are never touched. Errors clearly on missing block / missing key. Idempotent (`Already on runtime <rev> — nothing to do.`). `resolveUpgradeConfigPath` respects `ENCLAVE_CONFIG` and falls back to `findRepoRoot` → `resolveConfigPath`, so canonical `enclave/enclave.yaml` and bare-layout `<root>/enclave.yaml` both work
- `1031635` release v0.0.77 — `cli/runtime-hashes.json` bumped `rev` `v0.0.76 → v0.0.77`, `hash` + `vendor_hash` refreshed to new sha256 values
- `c8cea35` feat(iam): add IAM policy for enclave infrastructure and role management — new `deploy-iam-policy.json` at repo root (68 lines). Four-statement least-privilege policy for the deployer principal (the OIDC role that runs `enclave deploy` / `tofu apply`): `EnclaveInfraServices` (broad `ec2:*` / `s3:*` / `kms:*` / `ssm:*` / `dynamodb:*` / `sts:GetCallerIdentity` for stack lifecycle), `IamReadForRefresh` (read-only IAM for `terraform plan` drift detection), `IamManageEnclaveRolesOnly` (write-scoped to `*enclave*` role + instance-profile ARNs), and `PassEnclaveRoleToEc2` (`iam:PassRole` guarded by `iam:PassedToService == ec2.amazonaws.com` on `*enclave*` roles)

**Documentation Updates**:
- `INDEX.md` (project) — Latest Release `v0.0.76 → v0.0.77`; new `enclave upgrade` row in the CLI Commands lifecycle table (placed between `update` and `tofu` to match `cli/main.go` registration order)
- `system/project_overview.md` — added "CLI ↔ runtime version sync" capability bullet (describes the `enclave upgrade` flow, scope, idempotency, `ENCLAVE_CONFIG`/bare-layout support); extended the "CI scaffolding" bullet with a description of the new repo-root `deploy-iam-policy.json` template (four statements + `*enclave*` ARN scoping + `iam:PassRole` guard); added `deploy-iam-policy.json` to the Repository Layout tree
- `testing/usage.md` — new "CLI / runtime version bump" sub-section under Update Your App (covers `go install ...@latest` → `enclave upgrade` → `build && deploy`, idempotency note); new "Deployer IAM Policy" sub-section under Manual Verification linking the repo-root `deploy-iam-policy.json` template
- `testing/how_to_run.md` — new "CLI / runtime version bump" workflow snippet appended to Update App; explanatory paragraph on scoping (`runtime:`-only rewrite), idempotency, `ENCLAVE_CONFIG`, and bare-layout discovery
- `sop/development-workflow.md` — SDK Release section extended: after CLI refresh, downstream apps now run `enclave upgrade` in their app repo to atomically rewrite the `runtime:` block before `enclave build`, referencing `cli/upgrade.go` + `cli/upgrade_test.go`; unit-test list extended with `cli/upgrade_test.go`
- `INDEX.md` (master) — enclave Key Capabilities: added "Deployer IAM policy template" bullet (`deploy-iam-policy.json` four-statement policy) and "CLI ↔ runtime version sync (`enclave upgrade`)" bullet; tags extended with `iam-policy`, `cli-upgrade`; `develop` triggers extended with `enclave upgrade`, `deployer iam policy`

## 2026-05-20 - PCR0 signing + OTLP/HTTP ingest paths + supervisor KMS env-leak fix
**From**: `c6055bee5b2985d78a7ecd50698c39b184382f8b`
**To**: `c173a68f955b83aa3b01ed736dc64826bc468394`
**Synced By**: /update-project enclave
**Status**: Documentation updated — new PCR0-signing capability, telemetry POSTs renamed to OTLP/HTTP spec, supervisor KMS endpoint env inlined

**Commits Analyzed** (3):
- `8ed7847` feat(signing): implement PCR0 signing functionality and expose endpoint — new `runtime/signature.go` (`Signature.Load` + `Signature.Snapshot`), `runtime/signature_test.go`; `cli/tofu_files.go` mints `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY` / `prevent_destroy=true` / 30-day deletion window), aliases it, and runs a `terraform_data.sign_pcr0` local-exec (`bash` + `openssl` + `aws kms get-public-key` + `aws kms sign --signing-algorithm ECDSA_SHA_384`) on every `effective_pcr0` / key-id change, writing `/{dep}/{app}/Signing/{PubkeyPEM,PCR0,Signature}` to SSM; EC2-role `ssm:GetParameter` IAM policy extended; new tofu output `pcr0_signing_key_arn`. Integration test grew from 33 → 35 (PCR0 endpoint + `openssl pkeyutl -verify`). Originally a draft mounted `GET /enclave/signature`, kept here for chronological accuracy
- `4c104e2` refactor(runtime): update metric and trace endpoint paths to align with OTLP/HTTP spec — `POST /v1/enclave-metrics` → `POST /v1/metrics`, `POST /v1/enclave-traces` → `POST /v1/traces` (`POST /v1/logs` was already correctly aligned); GET introspection routes keep the `enclave-` prefix (`GET /v1/enclave-{metrics,traces,logs}`). PCR0 signing folded into `GET /v1/enclave-info` (`pcr0_signature` field, `omitempty`) and the standalone `GET /enclave/signature` endpoint + `pathSignature` const removed; `signatureHandler` replaced by `Signature.Snapshot()` returning `*PCR0SignatureInfo` directly into `RuntimeInfo`
- `49c748f` fix(signing): drop dead toggle, plug supervisor KMS env-leak — removed the unused `SigningConfig.Enabled` field + `signing:` block from all four `enclave.yaml` templates (provisioning is purely a Tofu-module property now); inlined `AWS_ENDPOINT_URL_KMS` on the supervisor relauncher in `test/run.sh` and added a `AWS_ENDPOINT_URL_KMS_SUPERVISOR` (default `http://aws-mocks:4000`) on `runner/main.go` so the test rig's second `tofu apply` no longer inherits the supervisor's KMS endpoint and miss-routes to local-kms with a LocalStack-owned key UUID

**Documentation Updates**:
- `system/project_overview.md` — added "Tofu-provisioned PCR0 signing" + "OTLP/HTTP-aligned telemetry ingest" capability bullets; updated local-QEMU test-harness bullet to 35 tests + the new signing + ECDSA verification cases; refreshed `runtime/` row to mention `runtime/signature.go` and the OTLP-aligned POST endpoints
- `system/architecture.md` — new "PCR0 Signing (Tofu-provisioned, runtime-served)" section (signing key, terraform_data.sign_pcr0, SSM paths, `Signature.Load`/`Snapshot`, verification recipe); new "OTLP/HTTP Endpoint Alignment" section (POST ingest vs GET introspection table); file map updated to list `runtime/signature.go` and note that the JSON-snapshot GETs keep the `enclave-` prefix while POSTs use the bare OTLP paths
- `testing/api-reference.md` — `/v1/enclave-info` row notes the `pcr0_signature` sub-object; new "Telemetry ingest vs introspection" table (OTLP POSTs vs JSON GETs); new "PCR0 Signing (Tofu-provisioned, served via `/v1/enclave-info`)" section (SSM parameter table + OpenSSL verification recipe)
- `testing/how_to_test.md` — integration-test count 33 → 35; added rows 34 (`pcr0_signature` presence on `/v1/enclave-info`) and 35 (`openssl pkeyutl -verify`); intro updated
- `sop/development-workflow.md` — added `runtime/signature_test.go` to the runtime unit-test list
- `INDEX.md` (project) — added PCR0-Signing + Telemetry-ingest rows to Quick Reference; architecture-overview diagram now annotates `/v1/enclave-info` with `pcr0_signature` and shows the OTLP-spec POSTs alongside the JSON-snapshot GETs
- `INDEX.md` (master) — enclave Key Capabilities: added "Tofu-provisioned PCR0 signing" bullet and "OTLP/HTTP-spec telemetry ingest" bullet; tags extended (`pcr0-signing`, `ecdsa-p384`, `otlp`, `otlp-ingest`); ask_question triggers extended (`pcr0 signing`, `ecdsa p384`, `pcr0_signature`, `otlp ingest`, `enclave telemetry`)

## 2026-05-16 - Atomic KMSKeyID migration + enclave-owned KMS keys
**From**: `a008c3fc89f27e9821e5c7bb4f49ee947b2c59dd`
**To**: `bfb8d9c535dd325455119616703725d2cf99799c`
**Synced By**: /update-project enclave
**Status**: Documentation updated — migration model rewritten (9 steps → 7), KMS ownership moved into the enclave, supervisor stripped of KMS calls

**Commits Analyzed** (5):
- `482ac89` refactor(migration): implement optional SSM parameter retrieval for previous PCR0 and attestation (`readSSMParamOptional` — missing chain params non-fatal)
- `8fdf883` refactor(migration): add predecessor commitment verification in runtime initialization (`Migrator.VerifyPredecessorCommitment` wired into `Init`)
- `0638132` refactor(integration-test): update rollback test with correct `previous_pcr0` and `app name` (v3 baked with `my-app-wrong` instead of wrong target PCR0)
- `20ad777` refactor(kms): enclave owns its KMS keys end-to-end (issue #107) — `EnsureKeyID` mints the primary key on first boot from an `"UNSET"` SSM placeholder; `CreateMigrationKey` mints the migration key with policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time; `SelfApplyPolicy` collapses to `VerifyKeyAuthorization` (`GetKeyPolicy` + `policyAdmitsPCR0`); supervisor loses `acquireMigrationKey` / `applyTransitionalPolicy` / `buildTransitionalPolicy` / `makeKeyRollback` / `getCallerRole`; Tofu drops `null_resource.kms_key` for `aws_ssm_parameter.kms_key_id` placeholder; EC2 role IAM loses `kms:PutKeyPolicy`; test/seed.yaml emptied; `ENCLAVE_KMS_KEY_ID` env var deleted; step constants renumber `9 → 7`
- `125f312` refactor(migration): atomic KMSKeyID flip; drop `/Migration/*` staging — ciphertexts written to key-scoped paths `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`; `PutParameter` on `/{dep}/{app}/KMSKeyID` is the atomic commit; removed `MigrationKMSKeyID`, `MigrationTargetPCR0`, `MigrationOldKMSKeyID`, `PromoteToPrimary`, `AbortOrphaned`, `CompleteMigration`, `GetMigrationKMSKeyID`, `IsTarget`, `MigrationState`, `pollMigrationCiphertexts`, `waitForMigrationOutcome`, `verifyPCR31Commitment` (PCR31 is now audit-only); `commitPCR31` runs first in `handleStartMigration`; `storePCR0WithAttestation` runs before the `KMSKeyID` flip; supervisor `rollbackMigration` emits under `stepWaitOutcome`; per-secret + DEK ciphertext params runtime-created at boot/migration with a destroy-time `aws ssm delete-parameters-by-path` reaper; IAM scoped via `.../{secret}/Ciphertext/*` and `.../StorageDEK/Ciphertext/*` wildcards

**Documentation Updates**:
- `system/architecture.md` — Locked-Key Migration section rewritten (9 → 7 steps with named supervisor step constants, atomic `KMSKeyID` commit, no `/Migration/*` staging, no `PromoteToPrimary` / `AbortOrphaned`); new "First-boot Primary-Key Bootstrap" subsection covering `EnsureKeyID` / `VerifyKeyAuthorization` / SSM placeholder; KMS Policy Model intro clarifies the enclave creates and owns its keys end-to-end (no transitional policy); File Map updated for `runtime/kms.go` ownership of `EnsureKeyID` / `VerifyKeyAuthorization` / `CreateMigrationKey`, key-scoped ciphertext paths, and supervisor no longer touching KMS
- `system/project_overview.md` — Locked-key migration capability rewritten for 7 steps / atomic flip / no staging; new "Enclave-owned KMS keys" capability bullet
- `testing/api-reference.md` — `/v1/start-migration` row rewritten (inline `CreateMigrationKey`, key-scoped paths, atomic `KMSKeyID` flip, deferred `ScheduleKeyDeletion`); `/v1/enclave-info` no longer lists `migration: {state,reason}` and the dedicated section was removed; `migration` body field on 503 retained; `/migrate` total updated to 7 with the supervisor step constants listed; NDJSON example refreshed with the new step labels; `previous_pcr0` / `previous_pcr0_attestation` noted as optional
- `testing/troubleshooting.md` — "migration already in progress" rewritten around cooldown; "migration.state == aborted" replaced with "rollback fires at `stepWaitOutcome`" (wrong app name / wrong `new_pcr0` / `VerifyKeyAuthorization` failure); "KMS key compromise / replacement" runbook trimmed from 9 to 7 steps and rewritten around atomic commit; "Migration interruption" rewritten (no resume from `MigrationKMSKeyID` — just retry after fixing inputs)
- `testing/how_to_test.md` — v3 EIF table updated: `app name = my-app-wrong` (rollback now triggered by `EnsureKeyID` failure on the out-of-IAM-scope SSM path, not by a wrong baked `previous_pcr0`)
- `INDEX.md` (project) — Architecture-diagram bullet annotated "atomic KMSKeyID flip"
- `INDEX.md` (master) — enclave Key Capabilities: locked-key migration bullet rewritten for 7 steps / key-scoped paths / atomic commit; new "Enclave-owned KMS keys" bullet

## 2026-05-06 - Release v0.0.75 + migration outcome + CLI hardening
**From**: `3ec84838b683c1ebb9da4bac942ba1736db1b8c6`
**To**: `a008c3fc89f27e9821e5c7bb4f49ee947b2c59dd`
**Synced By**: /update-project enclave
**Status**: Documentation updated — runtime API, migration model, CLI flags, build targets

**Commits Analyzed** (8):
- `a008c3f` release v0.0.75 (bumps `cli/runtime-hashes.json` to v0.0.75)
- `04b0816` refactor(docs): operations guide + README verification process; tofu staging migration-proof SSM params
- `393895a` refactor(migration): explicit commit/abort outcome via `/v1/enclave-info` (`migration.{state,reason}`); supervisor polls `/v1/enclave-info` instead of SSM; `handleMigrate` decomposed into focused step helpers; rollback test uses wrong target PCR0 instead of wrong baked previous_pcr0; 503 body drops `init_failed`
- `7ad959b` fix(runtime): improve `/v1/enclave-info` handling during initialization
- `a38e526` refactor(cli): tofu `eif_etag` triggers use `data.local_file.X.content_md5` (apply-time)
- `841a58d` refactor: drop `previous_pcr0` variable + wiring from enclave tofu module
- `08bf164` refactor(migration): stage chain proof in SSM (`/Migration/PreviousPCR0[Attestation]`); rename `/v1/export-key` → `/v1/start-migration`; runtime classifies role and runs `PromoteToPrimary`/`AbortOrphaned`; typed `ParamPrefix` replaces magic-string SSM prefixes; drop runtime baked-`previous_pcr0` validation
- `89b5c23` fix: harden CLI for cross-repo use (`verify`/`log`/`trace`/`metrics` take `--base-url`/`--instance-id`/`--region` directly, no `enclave.yaml` lookup); 79-byte UserData parser for nitriding v1.4.2; bare `<root>/enclave.yaml` layout; tofu hardening (`ignore_changes=[ami]`, content_md5 etags, expected_pcr0 from pcr.json)

**Documentation Updates**:
- `system/architecture.md` — locked-key migration steps rewritten to reflect staging chain proof, `PromoteToPrimary`/`AbortOrphaned`, supervisor polling `/v1/enclave-info` for terminal state; PCR0 chain section notes `"genesis"` default and runtime no longer enforcing baked previous_pcr0; file map note on typed `ParamPrefix`
- `system/project_overview.md` — locked-key migration capability rewritten; PCR0 chain capability updated for `"genesis"` and dropped runtime validation
- `testing/api-reference.md` — `/v1/enclave-info` now lists `migration: {state, reason}` and `previous_pcr0` `"genesis"` default; new section describing the `migration` field; 503 body documented; `/v1/export-key` row renamed to `/v1/start-migration` with staging-paths description
- `testing/usage.md` — bare `<root>/enclave.yaml` layout note
- `testing/how_to_run.md` — new "Read-only CLI commands (cross-repo)" section covering flag-driven `verify`/`log`/`trace`/`metrics`
- `testing/troubleshooting.md` — new entry for `migration.state == "aborted"` outcome
- `sop/development-workflow.md` — `make test-rebuild` target documented; clarified `make test-run` no longer rebuilds image
- `INDEX.md` (project) — Architecture diagram bullet updated to `/v1/start-migration`
- `INDEX.md` (master) — enclave entry's locked-key migration + PCR0 chain capabilities updated

## 2026-05-02 - Release v0.0.74
**From**: `efb54d63cdd906785e8956dfc5277ac76ae56510`
**To**: `3ec84838b683c1ebb9da4bac942ba1736db1b8c6`
**Synced By**: /update-project enclave
**Status**: Sync tracking updated; no documentation changes required

**Commits Analyzed** (1):
- `3ec8483` release v0.0.74

**Changes**:
- `cli/runtime-hashes.json`: bumped pinned SDK rev `v0.0.73` → `v0.0.74` and refreshed `hash` (vendor_hash unchanged)

**Documentation Updates**: none
- Release-only commit (no source, architecture, API, or build changes)
- No version pin tracked in docs to bump
- Master `docs/INDEX.md` enclave entry already current

## 2026-04-30 - Initial Documentation Setup
**Commit**: `efb54d63cdd906785e8956dfc5277ac76ae56510`
**Synced By**: /add-project enclave
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added testing/usage.md
- Added testing/api-reference.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline
- Added project entry to docs/INDEX.md (registry, dependency graph, correlation matrix, technology groupings)

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project enclave` to sync after new commits
- Repository: ArkLabsHQ/enclave (Go module path: github.com/ArkLabsHQ/introspector-enclave)
