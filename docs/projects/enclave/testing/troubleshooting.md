# Troubleshooting

## Common Errors

### `enclave init error: apply KMS policy: KMS key is locked to a different PCR0`

**Cause:** the KMS key has a PCR0-restricted policy from a previous enclave build. The current EIF has a different PCR0 (any code or dependency change produces a new PCR0).

**Fix:** run `enclave migrate` to create a new KMS key locked to the new PCR0, or `enclave lock` to apply the new PCR0 to the existing key (only works if the key policy still allows `PutKeyPolicy`).

### `enclave init error: load secrets from KMS: KMS secret loading timed out after 5m0s`

**Cause:** `kms:Decrypt` is failing repeatedly. Common reasons:

- PCR0 mismatch (see above).
- IAM role doesn't have KMS permissions.
- IMDS proxy not reachable (enclave can't get AWS credentials).

**Fix:**

1. Check supervisor logs: `journalctl -u enclave-supervisor`
2. Verify the KMS key policy allows `Decrypt` for the EC2 role with the current PCR0.
3. Verify IMDS is accessible — the enclave uses viproxy → vsock CID 3:8002 → host IMDS.

### `enclave init error: generate attestation key: POST /enclave/hash status 403`

**Cause:** nitriding rejected the attestation key hash registration. Nitriding only accepts one hash registration per boot.

**Fix:** the supervisor restarted without the enclave restarting. Restart the full stack: `systemctl restart enclave-supervisor`.

### `migration already in progress` / `Migration cooldown`

**Cause:** a `MigrationRequestedAt` SSM parameter exists from an in-flight or recently issued migration; the supervisor is enforcing the cooldown window before proceeding.

**Fix:** wait for the cooldown to expire (the NDJSON stream emits `stepCooldown` progress events with the remaining time). To cancel, `POST /migrate/abort` during the cooldown window.

### Migration rollback fires at `stepWaitOutcome`

**Cause:** the supervisor swapped in the new EIF (step 4) and started polling `/health` (step 5), but the new enclave never became healthy within the timeout. With the new model the most common reasons are:

- `EnsureKeyID` cannot read `/{dep}/{app}/KMSKeyID` (wrong app name baked into the EIF, IAM scope mismatch). This is what the integration test's v3 ("wrong app name") scenario exercises.
- The migration key's `[ownPCR0, newPCR0]` policy doesn't admit the booting PCR0 (wrong `new_pcr0` supplied to `/v1/start-migration`).
- `VerifyKeyAuthorization` / `VerifyPredecessorCommitment` failed.

**Fix:** the supervisor automatically rolls back — restores the EIF backup, restarts the old enclave (`stepWaitOutcome` emits `rollback` / `rollback-complete` events). Confirm the old enclave returns to healthy, correct the EIF inputs (app name, target PCR0), and re-run `POST /migrate`. The atomic `KMSKeyID` flip means an unsuccessful migration leaves primary state untouched — no manual SSM cleanup. A deferred `ScheduleKeyDeletion` inside `handleStartMigration` cleans up the migration key on failure.

### `secret value too large (N bytes, max 65536)`

**Cause:** dynamic secret value exceeds the 64 KB limit.

**Fix:** for larger blobs use the storage API (`PUT /v1/storage/{key}`, supports up to 10 MB).

### `enclave verify` fails with PCR0 mismatch

**Cause:** the running EIF's PCR0 differs from the expected build PCR0.

**Fix:**

1. Confirm `enclave build` produced the EIF you expect (`artifacts/pcr.json`).
2. Confirm the deployed `image.eif` in S3 matches your local artifact.
3. Re-deploy with `enclave deploy` if the EIF on S3 is stale.
4. If using `--remote`, confirm the GitHub Release's `release_tag` matches.

### `Schnorr signature verification failed`

**Cause:** response body was modified, the wrong attestation key is being used, or the runtime restarted (new ephemeral key).

**Fix:** re-fetch `/v1/enclave-info` to refresh the bound `attestation_pubkey`, then retry. The verified client (`client/`) does this automatically.

### `vsock device not found` (test harness)

**Cause:** kernel modules `vsock` + `vsock_loopback` not loaded on the host.

**Fix:**

```sh
sudo modprobe vsock
sudo modprobe vsock_loopback
test -e /dev/vsock
```

`vsock_loopback` is **Linux-only** — `make test-docker` will fail on macOS hosts past the build phase.

### `kvm not accessible` (test harness)

**Fix:** `sudo chmod 666 /dev/kvm` (CI workflow does this automatically).

---

## Log Locations

| Component | Location | Command |
|-----------|----------|---------|
| Host supervisor (gvproxy, IMDS, lifecycle, mgmt API) | systemd journal | `journalctl -u enclave-supervisor -f` |
| In-enclave runtime (nitriding, app, runtime) | `GET /enclave-logs` via supervisor → CloudWatch | check supervisor's CloudWatch stream |
| CDK deploy | terminal output + `cdk-outputs.json` | — |

All logs are JSON-structured (Go `log/slog`). Filter with `jq`:

```sh
# Errors only
journalctl -u enclave-supervisor -o cat | jq 'select(.level == "ERROR")'

# KMS operations
journalctl -u enclave-supervisor -o cat | jq 'select(.msg | contains("KMS"))'

# Slow HTTP requests
journalctl -u enclave-supervisor -o cat | jq 'select(.duration_ms > 1000)'
```

## Debug Procedures

### Verify the enclave is running

```sh
# From the EC2 host:
nitro-cli describe-enclaves

# Via the management server:
curl http://127.0.0.1:8443/health
```

### Check enclave health and metrics

```sh
# Nitriding TLS endpoint (self-signed cert, from host)
curl -sk https://127.0.0.1:443/v1/enclave-info | jq .

# Just metrics
curl -sk https://127.0.0.1:443/v1/enclave-info | jq .metrics
```

### Verify KMS key policy

```sh
DEPLOYMENT=dev
APP_NAME=myapp
KEY_ID=$(aws ssm get-parameter --name "/$DEPLOYMENT/$APP_NAME/KMSKeyID" --query 'Parameter.Value' --output text)
aws kms get-key-policy --key-id "$KEY_ID" --policy-name default --query Policy --output text | jq .
```

### Verify attestation manually

```sh
curl -sk https://127.0.0.1:443/v1/enclave-info | jq -r .attestation_pubkey
RESPONSE=$(curl -sk -D- https://127.0.0.1:443/v1/enclave-info)
# Inspect X-Attestation-Signature and X-Attestation-Pubkey headers
```

### Inspect secret ciphertexts in SSM

```sh
DEPLOYMENT=dev
APP_NAME=myapp
aws ssm get-parameters-by-path --path "/$DEPLOYMENT/$APP_NAME/" --query 'Parameters[].Name'
aws ssm get-parameter --name "/$DEPLOYMENT/$APP_NAME/MySecret/Ciphertext" --query 'Parameter.Value' --output text
```

### Debug encrypted storage

```sh
DEPLOYMENT=dev
APP_NAME=myapp
BUCKET=$(aws ssm get-parameter --name "/$DEPLOYMENT/$APP_NAME/StorageBucketName" --query 'Parameter.Value' --output text)
aws s3 ls "s3://$BUCKET/data/"
aws ssm get-parameter --name "/$DEPLOYMENT/$APP_NAME/StorageDEK/Ciphertext" --query 'Parameter.Value' --output text | head -c 50
```

### Debug networking (vsock)

Inside the enclave all external traffic goes through vsock:

- **gvproxy** vsock port 1024 — outbound TCP proxy.
- **nitriding** — TLS-terminated inbound on vsock.
- **viproxy** — IMDS credential forwarder via vsock CID 3:8002.

```sh
ls -la /dev/vsock
lsmod | grep vsock
```

## Recovery Runbooks

### Instance failure

`enclave-supervisor.service` runs with `Restart=always`; the in-process watchdog auto-restarts the enclave with bounded backoff (1s → 30s) when `nitro-cli describe-enclaves` shows it stopped. If systemd brings the supervisor back, gvproxy + IMDS forwarder + watchdog all relaunch.

If the EC2 instance itself fails: the CDK stack creates a new instance from the same AMI, `user_data` starts the enclave, secrets decrypt from SSM via KMS attestation (same PCR0), S3 storage persists.

### KMS key compromise / replacement

`enclave migrate` orchestrates a 7-step locked-key migration:

1. Old enclave inline-creates a new KMS key with policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time, re-encrypts each secret + storage DEK to key-scoped SSM paths (`/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}`), writes the chain proof, then atomically flips `/{dep}/{app}/KMSKeyID` — that `PutParameter` is the commit.
2. Supervisor downloads + swaps the new EIF, polls `/health` until healthy (rolls back on timeout).
3. Old key is scheduled for 7-day deletion.

### Migration interruption / rollback

If the new enclave fails to come up healthy after the swap, the supervisor restores the EIF backup and restarts the old enclave automatically. Because the `KMSKeyID` flip is atomic — and a `defer ScheduleKeyDeletion` reaps the unused migration key — there is no orphaned state to clean up. Just fix the inputs (correct `new_pcr0`, correct EIF) and re-run `POST /migrate`.
