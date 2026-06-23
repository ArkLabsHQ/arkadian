# Troubleshooting

Common issues encountered when running arkade-regtest, with remediation steps. The CLI is `regtest.mjs`; the compose project name is `arkade-regtest`.

## Startup Issues

### `node: command not found` / wrong Node version
**Cause**: Node.js < 18 or not installed.
**Fix**: Install Node ≥ 18 (`node --version`). No `npm install` is needed — `regtest.mjs` uses only the standard library.

### Empty submodule directory
```
ENOENT ... regtest.mjs
```
**Cause**: Submodule not checked out.
**Fix**:
```bash
git submodule update --init --recursive
```

### Port already in use
```
Bind for 0.0.0.0:9001 failed: port is already allocated
```
**Cause**: Another stack (or a local service) is using the same host port.
**Fixes**:
- Tear down the other stack: `docker compose -p arkade-regtest down`
- Or override the host port in `.env` (only the host side is remapped):
  ```bash
  BOLTZ_API_PORT=9101
  ```

### NBXplorer crash-loops against Bitcoin Core 31
**Cause**: An nbxplorer older than `2.6.1` can't parse Core 31's `getpeerinfo`.
**Fix**: Keep the pinned default `NBXPLORER_IMAGE=nicolasdorier/nbxplorer:2.6.7`; don't downgrade it.

## arkd Issues

### arkd container exits immediately
**Causes**:
- `ARKD_IMAGE` tag doesn't exist (typo or unreleased version)
- Block/seconds **type mismatch** across `ARKD_VTXO_TREE_EXPIRY` / exit delays (arkd refuses a mismatch)
- Block-denominated locktimes (`< 512`) used on a non-regtest network

**Fix**:
```bash
docker logs arkd 2>&1 | tail -50
docker pull "$ARKD_IMAGE"          # verify the image is reachable
```
Ensure all five tree-expiry / exit-delay values share the same type (all blocks OR all seconds).

### Signer rotation fails / wrong signer set
**Cause**: Using an arkd image without deprecated-signer support (pre-`v0.9.6`), or a stale `.signer-state.json`.
**Fix**: Use the rc images (`ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1` and the matching wallet image). `node regtest.mjs clean` resets the signer set; inspect with `node regtest.mjs signer-info`.

## Service Connectivity Issues

### Boltz LND `synced_to_chain: false`
**Cause**: nbxplorer cannot reach Bitcoin Core, or the chain hasn't advanced.
**Fix**: Mine a few blocks (`node regtest.mjs mine 6`) and check `docker compose -p arkade-regtest logs nbxplorer`. A `clean` + `start` usually resolves a stuck indexer.

### arkd / arkd-wallet crash-loop on a fresh full-stack `start` (`server misbehaving`)
Symptoms: on a first bring-up of the whole closure, arkd and arkd-wallet restart repeatedly; logs show DNS `server misbehaving` for `arkd` ↔ `arkd-wallet`, and arkd-wallet racing nbxplorer's first-boot migration.
**Cause**: bringing up all ~18 containers in one `composeUp` overwhelms Docker's embedded DNS and races arkd-wallet against nbxplorer's first-time DB migration.
**Fix**: pull the latest arkade-regtest base (PR #35). `start` now uses a **phased two-wave bring-up** — `base` settles first, then the app layer starts against a healthy base — which removes this race. arkd-wallet briefly restarting once during normal startup is expected and not gated, so the bring-up does not abort.

### Fulmine cannot reach arkd
Symptoms: Fulmine logs show repeated connection refused to `http://arkd:7070`.
**Cause**: arkd failed to start (see arkd section above) or the compose network isn't healthy.
**Fix**:
```bash
docker compose -p arkade-regtest ps          # confirm services are running
docker compose -p arkade-regtest logs arkd
```

### Fulmine delegation never enables
**Cause**: Older bundles passed `FULMINE_DELEGATOR_*` env, which Fulmine ignores — it reads `FULMINE_DELEGATE_ENABLED` / `FULMINE_DELEGATE_FEE`. Fixed upstream (PR #32); ensure you're on the current arkade-regtest base.
**Fix**: Pull the latest submodule. The `boltz-fulmine` and `fulmine-delegator` services now set the `FULMINE_DELEGATE_*` names.

### Boltz REST returns 502 via Nginx (port 9069)
**Cause**: Nginx started before Boltz was ready, or Boltz crashed.
**Fix**:
```bash
docker compose -p arkade-regtest restart nginx-boltz
docker compose -p arkade-regtest logs boltz | tail -50
```

## Faucet & Chain Issues

### Wallet has zero balance after startup
**Cause**: The faucet flow inside `start` failed (commonly Bitcoin Core not ready, or arkd not unlocked yet).
**Fix**: `node regtest.mjs clean && node regtest.mjs start` — the faucet logic is idempotent. If it persists, inspect `docker logs arkd 2>&1 | tail -50`.

### Sweeps / VTXO expiry fire mid-test
**Cause**: The auto-miner is advancing the tip while you're using block-denominated locktimes.
**Fix**: Set `AUTOMINE_INTERVAL=0` and mine explicitly with `node regtest.mjs mine <n>`.

### LND channel never opens / `num_active_channels: 0`
```bash
docker exec boltz-lnd lncli --network=regtest pendingchannels
node regtest.mjs mine 6
docker exec boltz-lnd lncli --network=regtest listchannels
```

## Helper Script Issues

### `pay-invoice`: "Cannot find route"
**Cause**: No path between the two LND nodes (channel not opened/active).
**Fix**:
```bash
docker exec boltz-lnd lncli --network=regtest listchannels
# if empty: faucet flow didn't complete — clean & restart
```

## Cleanup Issues

### Leftover containers / volumes after `clean`
```bash
docker ps -a --filter label=com.docker.compose.project=arkade-regtest
docker rm -f <leftover-ids>
docker network prune -f
docker volume prune -f
```

### Disk space exhaustion
```bash
docker system prune -a --volumes
```

## Getting More Information

```bash
docker compose -p arkade-regtest ps                  # all services
docker compose -p arkade-regtest logs -f <service>   # tail a service
docker exec <container> env | sort                   # env a container actually got
```

If a problem persists, capture full `start` output and the relevant service logs for upstream reporting.
