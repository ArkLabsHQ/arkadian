# Arkade Escrow - Troubleshooting Guide

Common issues and their solutions when working with Arkade Escrow.

## Connection Issues

### Cannot Connect to arkd

**Symptoms:**
- API returns connection errors
- Health check fails
- Contracts cannot be created

**Solutions:**

1. Verify arkd is running:
```bash
curl http://localhost:7070/v1/info
```

2. Check Nigiri is running with `--ark` flag:
```bash
nigiri ps
# Should show ark service running
```

3. Restart Nigiri with correct flags:
```bash
nigiri stop
nigiri start --ark
```

4. Check arkd logs:
```bash
nigiri logs ark
```

5. Verify network connectivity (Docker):
```bash
docker network ls | grep nigiri
docker network inspect nigiri
```

### Port Conflicts

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::3002`

**Solutions:**

1. Change the port in `.env`:
```bash
PORT=3003
```

2. Find and kill the process using port 3002:
```bash
# macOS/Linux
lsof -ti:3002 | xargs kill -9

# Or use a different port
```

3. For Docker, change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3003:3002"  # host:container
```

---

## PSBT Execution Errors

### "missing taptree on input 0"

**Symptoms:**
- Error when executing contract: `INVALID_PSBT_INPUT (5): missing taptree on input 0`
- Contract execution fails after both parties sign

**Known Issue:**
This is a known issue in the current version (as of 2025-10-14). The PSBT is missing required taptree information.

**Workaround:**
Currently under investigation. This error occurs when the SDK tries to broadcast the signed PSBT.

**Debugging steps:**

1. Verify PSBT structure:
```bash
# Decode PSBT to inspect inputs
bitcoin-cli -regtest decodepsbt "BASE64_PSBT"
```

2. Check arkd logs for more details:
```bash
nigiri logs ark
```

3. Ensure you're using compatible SDK version:
```json
"@arkade-os/sdk": "0.3.1-alpha.3"
```

### Signature Verification Failures

**Symptoms:**
- `400 Bad Request` when signing execution
- "Invalid signature" errors

**Solutions:**

1. Verify you're signing the correct transaction:
```javascript
const tx = Transaction.fromPSBT(base64.decode(base64Tx), {
  allowUnknown: true  // Important!
});
```

2. Ensure proper signature format:
```javascript
const signed = await wallet.identity.sign(tx);
const signedPsbt = base64.encode(signed.toPSBT());
```

3. Sign all checkpoints:
```javascript
const checkpoints = await Promise.all(
  checkpointsPsbts.map(async (cp) => {
    const signed = await wallet.identity.sign(
      Transaction.fromPSBT(base64.decode(cp), { allowUnknown: true }),
      [0]  // Sign input 0
    );
    return base64.encode(signed.toPSBT());
  })
);
```

---

## Authentication Issues

### JWT Token Expired

**Symptoms:**
- `401 Unauthorized` on authenticated endpoints
- "Token expired" error

**Solutions:**

1. Sign up again to get a new token:
```bash
node server/scripts/signup.js --local
```

2. Check token expiration in the JWT:
```javascript
// Decode JWT (without verification)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires at:', new Date(payload.exp * 1000));
```

3. Increase token lifetime (for development only):
Edit the auth service to extend expiration time.

### Signature Verification Failed

**Symptoms:**
- `400 Bad Request` on `/auth/signup/verify`
- "Signature verification failed"

**Solutions:**

1. Ensure consistent public key format:
```javascript
// Use compressed format for both challenge and verify
const pubCompressed = Buffer.from(getPublicKey(priv, true)).toString("hex");
```

2. Verify manual signature before API call:
```javascript
const isValid = schnorr.verify(
  hexToBytes(signature),
  hexToBytes(hashToSignHex),
  hexToBytes(pubXOnly)
);
console.log('Manual verification:', isValid);
```

3. Check Origin header matches:
```bash
curl -H "Origin: http://localhost:test" ...
```

4. Ensure hashes are set correctly:
```javascript
import { hashes } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2";

hashes.sha256 = sha256;  // CRITICAL!
```

### Challenge Expired

**Symptoms:**
- `400 Bad Request` when verifying
- "Challenge expired" error

**Solutions:**

Challenges expire after 10 minutes. Request a new challenge:
```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/challenge \
  -H "Content-Type: application/json" \
  -d '{"publicKey": "YOUR_PUBLIC_KEY"}'
```

---

## Database Issues

### Database Locked (SQLite)

**Symptoms:**
- `SQLITE_BUSY: database is locked`
- API hangs on database operations

**Solutions:**

1. Stop all API instances:
```bash
pkill -f "npm run api:dev"
docker compose down
```

2. Remove database and restart:
```bash
rm ./data/ark-escrow.sqlite
npm run api:dev
```

3. For production, consider using PostgreSQL instead of SQLite.

### Migration Failures

**Symptoms:**
- Errors on startup about missing tables/columns
- `QueryFailedError` in logs

**Solutions:**

1. Check migration status:
```bash
npm run migration:show
```

2. Revert last migration:
```bash
npm run migration:revert
```

3. Drop database and re-migrate:
```bash
rm ./data/ark-escrow.sqlite
npm run api:dev  # Migrations run automatically
```

4. Create a new migration if schema changed:
```bash
npm run migration:generate -- FixSchema
```

---

## Testing Issues

### E2E Tests Failing

**Symptoms:**
- Tests timeout
- "Cannot connect to arkd" errors
- Faucet failures

**Solutions:**

1. Ensure Nigiri is running:
```bash
nigiri start --ark
```

2. Fund the test wallet before tests:
```bash
nigiri ark send --to ADDRESS --amount 100000 --password secret
```

3. Check arkd balance:
```bash
nigiri ark balance
```

4. Increase test timeout in jest config:
```javascript
// jest.config.js
testTimeout: 20000  // 20 seconds
```

5. Run specific test:
```bash
npm run test:e2e -- --testNamePattern="should create an escrow"
```

### Funding Not Detected

**Symptoms:**
- Contract status doesn't change to "funded" after sending VTXOs
- Balance shows zero

**Solutions:**

1. Wait 5-10 seconds for arkd to sync:
```javascript
await new Promise(resolve => setTimeout(resolve, 5000));
```

2. Verify the transaction was sent:
```bash
nigiri ark balance
nigiri ark vtxos
```

3. Check contract address:
```bash
curl http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID \
  -H "Authorization: Bearer TOKEN"
```

4. Verify arkd received the transaction:
```bash
curl http://localhost:7070/v1/balance?address=ARK_ADDRESS
```

---

## CORS Issues

**Symptoms:**
- Browser console shows CORS errors
- `Access-Control-Allow-Origin` errors

**Solutions:**

1. Set Origin header in requests:
```bash
curl -H "Origin: http://localhost:3000" ...
```

2. For browser requests, configure CORS in `main.ts`:
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
});
```

3. Use Swagger UI which handles CORS automatically:
```
http://localhost:3002/api/v1/docs
```

---

## Docker Issues

### Container Won't Start

**Symptoms:**
- Docker container exits immediately
- `docker compose up` fails

**Solutions:**

1. Check logs:
```bash
docker compose logs api-dev
```

2. Verify Nigiri network exists:
```bash
docker network ls | grep nigiri
```

3. Rebuild container:
```bash
docker compose down
docker compose --profile dev build --no-cache api-dev
docker compose --profile dev up api-dev
```

4. Check environment variables:
```bash
docker compose config
```

### Volume Permission Issues

**Symptoms:**
- Permission denied errors
- Cannot write to database

**Solutions:**

1. Check volume permissions:
```bash
ls -la ./data/
```

2. Fix permissions:
```bash
chmod -R 755 ./data/
```

3. For macOS/Linux, ensure Docker has file sharing enabled for the project directory.

---

## Nigiri Network Issues

### arkd Not Accessible from Docker

**Symptoms:**
- API in Docker cannot connect to arkd
- `ECONNREFUSED` errors

**Solutions:**

1. Verify Docker networks:
```bash
docker network ls
docker network inspect nigiri
```

2. Check docker-compose.yml has nigiri network:
```yaml
networks:
  - default
  - nigiri
```

3. Use correct arkd URL in Docker:
```yaml
ARK_SERVER_URL=http://ark:7070  # Not localhost!
```

4. Test connectivity from container:
```bash
docker exec -it arkade-escrow-api-dev-1 curl http://ark:7070/v1/info
```

### Nigiri Stack Unhealthy

**Symptoms:**
- Services not responding
- Blockchain not syncing

**Solutions:**

1. Restart Nigiri:
```bash
nigiri stop
nigiri start --ark
```

2. Check service health:
```bash
nigiri ps
docker ps
```

3. View logs:
```bash
nigiri logs
nigiri logs ark
```

4. Clean restart:
```bash
nigiri delete
nigiri start --ark
```

---

## General Debugging Tips

### Enable Debug Logging

Set `NODE_ENV=development` and add debug logs:
```typescript
console.log('Debug info:', variable);
```

### Inspect API Responses

Use verbose curl:
```bash
curl -v http://localhost:3002/api/v1/escrows/requests
```

### Check API Health

```bash
curl http://localhost:3002/health
```

### Monitor Logs

**Local:**
```bash
npm run api:dev  # Shows logs in console
```

**Docker:**
```bash
docker compose logs -f api-dev
```

### Reset Everything

When all else fails:
```bash
# Stop everything
docker compose down
nigiri stop

# Clean up
rm -rf ./data/*.sqlite
rm -rf ./node_modules

# Fresh start
npm install
nigiri start --ark
npm run api:dev
```

---

## Getting Help

If you continue experiencing issues:

1. Check the README: `/path/to/arkade-escrow/README.md`
2. Review test examples: `/server/test/*.e2e-spec.ts`
3. Inspect Swagger UI: `http://localhost:3002/api/v1/docs`
4. Check arkd logs: `nigiri logs ark`
5. Verify versions:
   - Node.js: `node --version` (should be v24.x)
   - npm: `npm --version`
   - Nigiri: `nigiri --version`

### Collect Debug Information

When reporting issues, include:
- Error messages (full stack trace)
- Environment (.env variables, excluding secrets)
- Node.js version
- npm version
- Docker version (if using containers)
- Operating system
- Steps to reproduce
- API logs
- arkd logs
