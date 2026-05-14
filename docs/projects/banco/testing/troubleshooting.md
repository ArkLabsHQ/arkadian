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

**Introspector not starting**
- Check `docker-compose.introspector.yml` is present
- Verify `.env.regtest` has correct image tags

**arkd wallet not initialized**
- `regtest:start` auto-runs `ark init --password secret`
- If it fails, run manually: `docker exec arkd ark init --password secret --server-url localhost:7070 --explorer http://chopsticks:3000`

## Debugging

- Use `vitest --reporter=verbose` for detailed test output
- Check arkd logs: `docker logs arkd`
- Check introspector logs: `docker logs introspector`
