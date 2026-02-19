# Introspector — Troubleshooting

## Common Issues

### Service Won't Start

**Error**: `invalid config: invalid secret key`
- **Cause**: `INTROSPECTOR_SECRET_KEY` not set or not valid hex
- **Fix**: Set a valid hex-encoded secp256k1 private key (64 hex characters)

**Error**: `failed to create service`
- **Cause**: Invalid configuration (port in use, bad datadir path)
- **Fix**: Check all `INTROSPECTOR_*` environment variables

### TLS Issues

**Error**: TLS handshake failure from clients
- **Cause**: Client doesn't trust auto-generated TLS certificate
- **Fix**: Either disable TLS (`INTROSPECTOR_NO_TLS=true`) or add the cert to client trust store
- For Docker internal communication, TLS is typically disabled

### Arkade Script Execution Failures

**Error**: `failed to execute arkade script`
- **Cause**: Script execution returned an error (stack not clean, assertion failed, etc.)
- **Fix**: Check the Arkade Script program in the PSBT. Debug with `INTROSPECTOR_LOG_LEVEL=5` or higher

**Error**: `input does not specify any ArkadeScript`
- **Cause**: The PSBT input doesn't contain the custom Arkade Script PSBT field
- **Fix**: Ensure the PSBT is properly constructed with `ArkadeScriptField` set

**Error**: `tweaked arkade script public key not found in tapscript`
- **Cause**: The Arkade Script-tweaked public key doesn't match any key in the tapscript
- **Fix**: Verify the PSBT was constructed with the correct signer public key

### Signing Errors

**Error**: `not a taproot input, cannot sign`
- **Cause**: The input's witness UTXO is not a P2TR output
- **Fix**: Introspector only signs Taproot inputs

**Error**: `no taproot leaf script, cannot sign`
- **Cause**: Missing `TaprootLeafScript` in the PSBT input
- **Fix**: Ensure the PSBT includes the tapscript spending path

### Finalization Errors

**Error**: `no signed inputs found in intent proof`
- **Cause**: The intent proof doesn't contain this signer's signature
- **Fix**: Ensure `SubmitIntent` was called first and the same signer key is used

**Error**: `connector X is not part of the tree`
- **Cause**: A forfeit's connector input doesn't match any leaf in the provided connector tree
- **Fix**: Verify the connector tree structure matches the round's tree

**Error**: `malformed forfeit: expected 2 inputs`
- **Cause**: Forfeit transaction has incorrect number of inputs
- **Fix**: Forfeits must have exactly 2 inputs (VTXO input + connector input)

### Docker / Infrastructure

**Error**: `docker-compose` fails to start
- **Cause**: The `nigiri` Docker network doesn't exist
- **Fix**: Start Nigiri first: `nigiri start`

**Error**: Integration tests timeout
- **Cause**: Services not ready or port conflicts
- **Fix**: Wait for all services to be healthy, check port availability (7070, 7071, 7073, 6060)

## Debugging

### Enable Verbose Logging

```bash
export INTROSPECTOR_LOG_LEVEL=6  # Trace level
```

### Check Service Status

```bash
curl http://localhost:7073/v1/info
```

### Docker Logs

```bash
docker logs introspector -f
docker logs arkd -f
```

## Getting Help

- Check the Arkade Script opcode reference in the README
- Review test cases in `test/` for expected behavior
- Check arkd logs if the issue is in the round lifecycle
