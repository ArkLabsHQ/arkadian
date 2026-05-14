# Bancod — Troubleshooting

## Common Issues

### Startup Failures

**"BANCOD_ARK_URL is required"**
- Ensure `BANCOD_ARK_URL` env var is set to the arkd gRPC endpoint

**"at least one plugin must be enabled"**
- Set `BANCOD_BANCO_ENABLED=true` and/or `BANCOD_PREIMAGE_ENABLED=true`

**"BANCOD_GRPC_PORT and BANCOD_HTTP_PORT must be different"**
- Ensure gRPC (default 7070) and HTTP (default 7071) ports are different

### Connection Issues

**Cannot connect to arkd**
- Verify arkd is running and accessible at the configured URL
- Check network/firewall settings
- Verify arkd wallet is created and unlocked

**Introspector unreachable**
- Verify introspector service is running at `BANCOD_INTROSPECTOR_URL`

### Swap Issues

**"price validation failed"**
- Check price feed URL is accessible
- Price must be within 1% of feed price
- Verify pair config with `banco pair list`

**Offer not matched**
- Check WantAmount is within pair min/max range
- Verify pair exists for the offer's asset pair
- Check solver is running: `banco status`

### Test Environment

**Integration tests fail**
- Ensure nigiri is running: `nigiri start`
- Verify arkd wallet is funded (3 faucet calls in setup)
- Check docker services: `docker compose -f test/docker-compose.yml ps`

## Debugging

### Logs
- Set `BANCOD_LOG_LEVEL=5` (Debug) for verbose output
- Default level is 4 (Info)

### Web UI
- Access at `http://localhost:7071` for real-time monitoring
