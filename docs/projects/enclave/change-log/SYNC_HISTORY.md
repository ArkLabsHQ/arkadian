# Documentation Sync History - Simple Enclave

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
