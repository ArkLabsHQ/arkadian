# Banco — Troubleshooting

## Common Issues

### "No spendable VTXO found at swap address"
- The offer hasn't been funded yet, or the VTXO has already been spent
- Check with `maker.getOffers(swapPkScript)` — look for `spendable: true`

### "Offer inconsistency: swapPkScript does not match"
- The reconstructed contract doesn't match the offer's embedded swapPkScript
- This indicates a corrupted or tampered offer hex

### "Insufficient BTC"
- Taker wallet doesn't have enough BTC to cover the swap
- For asset swaps, taker needs at least 450 sats (dust) as carrier

### "Taker wallet has no VTXOs"
- Taker needs funded VTXOs before fulfilling
- Board BTC or receive VTXOs first

### "Offer does not have a cancel path"
- Can only cancel offers created with `cancelDelay` parameter

### Regtest Issues

**"nigiri not found"**
- Install nigiri: `curl https://getnigiri.vulpemventures.com | bash`

**Emulator not starting**
- Check `docker-compose.emulator.yml` is present (file was renamed from `docker-compose.introspector.yml` in the May 2026 ts-sdk bump)
- Verify `.env.regtest` has correct image tags; image is `ghcr.io/arkade-os/emulator:v0.0.1`, exposed on port 7073

**arkd wallet not initialized**
- `regtest:start` auto-runs `ark init --password secret`
- If it fails, run manually: `docker exec arkd ark init --password secret --server-url localhost:7070 --explorer http://chopsticks:3000`

## Debugging

- Use `vitest --reporter=verbose` for detailed test output
- Check arkd logs: `docker logs arkd`
- Check emulator logs: `docker logs emulator`

### "EventSource is not defined" in E2E tests

- The ts-sdk opens SSE subscriptions in the background (`ContractWatcher`); Node lacks a global `EventSource`. `test/e2e/utils.ts` installs a no-op stub if missing — keep that polyfill if you add new test files.

### Asset amount type errors (`Type 'number' is not assignable to type 'bigint'`)

- After the May 2026 ts-sdk bump, asset amounts are `bigint`. Wrap numeric literals with `BigInt(...)` (or use `n` suffix) when calling `assetManager.issue({ amount })`, `wallet.send({ assets: [...] })`, or comparing returned `asset.amount` values.
