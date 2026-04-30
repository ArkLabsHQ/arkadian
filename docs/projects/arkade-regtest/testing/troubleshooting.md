# Troubleshooting

Common issues encountered when running arkade-regtest, with remediation steps.

## Startup Issues

### "$.env.defaults not found"
```
ERROR: <path>/.env.defaults not found.
If this is a git submodule, run: git submodule update --init
```
**Cause**: Empty submodule directory.
**Fix**:
```bash
git submodule update --init --recursive
```

### Port already in use
```
Bind for 0.0.0.0:9001 failed: port is already allocated
```
**Cause**: Another stack (or another local service) is using the same port.
**Fixes**:
- Bring down the other stack: `docker compose -p nigiri down`
- Or override the port in `.env`:
  ```bash
  BOLTZ_API_PORT=9101
  ```

### Nigiri build fails
```
go: errors running command ... (exit status 1)
```
**Causes**:
- Go version too old (< 1.23)
- Network issue cloning `NIGIRI_REPO_URL`
- Stale state in `_build/nigiri/`

**Fixes**:
- Verify Go version: `go version`
- Force clean rebuild: `./start-env.sh --clean`
- Or fall back to system nigiri: `NIGIRI_BRANCH="" ./start-env.sh` (requires `nigiri` on `$PATH`)

## arkd Override Issues

### Override image not used
After setting `ARKD_IMAGE`, nigiri's bundled arkd is still running.

**Verify the override file was loaded**: the first log line of `start-env.sh` shows the override path it sourced. If you set `ARKD_IMAGE` in `.env` but the launcher loaded `../.env.regtest`, the value is shadowed.

**Fix**: Use `--env <path>` to be explicit, or ensure `.env.regtest` actually contains the override.

### arkd container exits immediately in override mode
**Causes**:
- Image tag doesn't exist (typo or unreleased version)
- `ARKD_*` config variable mismatch with the override image

**Fix**:
```bash
docker logs arkd 2>&1 | tail -50
docker pull "$ARKD_IMAGE"   # verify the image is reachable
```

## Service Connectivity Issues

### Boltz LND `synced_to_chain: false`
**Cause**: nbxplorer cannot reach Bitcoin Core (often correlated with `BITCOIN_LOW_FEE=true`).

**Fix**: Set `BITCOIN_LOW_FEE=false` in your override:
```bash
BITCOIN_LOW_FEE=false
```
Then `./clean-env.sh && ./start-env.sh`.

### Fulmine cannot reach arkd
Symptoms: Fulmine logs show repeated connection refused to `http://ark:7070`.

**Cause**: arkd container failed to start (see arkd override section above) or the compose network isn't healthy.

**Fix**:
```bash
docker compose -p nigiri ps          # confirm all services are running
docker compose -p nigiri logs ark    # inspect arkd logs
```

### Boltz REST returns 502 / connection refused via Nginx (port 9069)
**Cause**: Nginx started before Boltz was ready, or Boltz crashed.

**Fix**:
```bash
docker compose -p nigiri restart boltz-nginx
docker compose -p nigiri logs boltz | tail -50
```

## Faucet Issues

### "no funded channels" / wallet has zero balance after startup
**Cause**: The faucet flow inside `start-env.sh` failed (commonly because Bitcoin Core wasn't ready, or arkd hadn't unlocked yet).

**Fix**:
```bash
./clean-env.sh
./start-env.sh
```
A clean restart almost always resolves this since the faucet logic is idempotent.

### LND channel never opens / `num_active_channels: 0`
Even after faucet flow, the channel may not be confirmed yet.
```bash
docker exec boltz-lnd lncli --network=regtest pendingchannels
docker exec bitcoin bitcoin-cli -regtest -rpcuser=admin1 -rpcpassword=123 generate 6
docker exec boltz-lnd lncli --network=regtest listchannels
```

## Helper Script Issues

### `pay-invoice.sh`: "Cannot find route"
**Cause**: No path between the two LND nodes (channel not opened or not active).

**Fix**:
```bash
docker exec boltz-lnd lncli --network=regtest listchannels
# if empty: faucet flow didn't complete — clean & restart
```

### `create-invoice.sh --secondary`: "Error: container lnd is not running"
**Cause**: Secondary LND node is part of nigiri but not started in this stack configuration.

**Fix**: Verify nigiri started LND:
```bash
docker ps --filter name=lnd
```
If absent, this scenario isn't supported by your nigiri build — use the primary boltz-lnd only.

## Cleanup Issues

### `clean-env.sh` leaves leftover containers
```bash
docker ps -a --filter label=com.docker.compose.project=nigiri
docker rm -f <leftover-ids>
docker network prune -f
docker volume prune -f
```

### Disk space exhaustion
Typical culprits: `_build/nigiri/`, Docker volumes, image cache.
```bash
rm -rf _build/
docker system prune -a --volumes
```

## Getting More Information

```bash
# All compose services for the nigiri project
docker compose -p nigiri ps

# Tail logs from a specific service
docker compose -p nigiri logs -f <service>

# Inspect environment a container actually got
docker exec <container> env | sort

# Check the resolved env that start-env.sh used
# (the launcher prints the override path it loaded as the first log line)
```

If a problem persists after these steps, re-run with `--clean` and capture the full launcher output for upstream reporting.
