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

### `migration already in progress`

**Cause:** a previous migration is still running or was interrupted without cleanup.

**Fix:** the migration is **idempotent** — wait for it to complete, or re-run `enclave migrate` / `POST /migrate`. It resumes from the last checkpoint (`MigrationKMSKeyID` in SSM).

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

`enclave migrate` orchestrates a 9-step locked-key migration:

1. New KMS key is created locked to the new PCR0.
2. Secrets are exported from the old enclave, re-encrypted under the new key.
3. EIF is replaced and the new enclave starts.
4. Old key is scheduled for 7-day deletion.

### Migration interruption

Migration is idempotent. Re-run `enclave migrate` (CLI) or `POST /migrate` (host management API). It resumes from `MigrationKMSKeyID` in SSM. If you need to abandon a migration, manually delete `Migration*` SSM parameters and the orphaned new KMS key (`enclave/.../schedule-key-deletion`).
