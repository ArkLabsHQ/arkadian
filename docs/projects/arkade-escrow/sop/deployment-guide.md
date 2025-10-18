# Deployment Guide

Production deployment procedures for arkade-escrow.

## Environment Configuration

### Production Environment Variables

Create production `.env` file with secure values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database (PostgreSQL recommended for production)
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/arkade_escrow

# JWT Authentication
JWT_SECRET=<generate-secure-secret-see-below>

# Ark Server Connection
ARK_SERVER_URL=https://mutinynet.arkade.sh
# OR for self-hosted:
# ARK_SERVER_URL=https://your-arkd-server.com:7070

# Arbitrator Keys
ARBITRATOR_PUB_KEY=<generate-new-key-see-below>

# Optional: CORS Configuration
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# Optional: Share Base URL
SHARE_BASE_URL=https://app.yourdomain.com/escrows/requests
```

### JWT Secret Generation

**Never use development secret in production**

Generate cryptographically secure secret:

```bash
# Method 1: OpenSSL (recommended)
openssl rand -base64 64

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Method 3: Python
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Set in environment**:
```bash
JWT_SECRET=<generated-64-char-base64-string>
```

**Security Notes**:
- Minimum 64 characters
- Rotate periodically (invalidates existing tokens)
- Store in secrets manager (AWS Secrets Manager, Vault, etc.)
- Never commit to version control

## Database Setup

### PostgreSQL Migration from SQLite

**Step 1: Install PostgreSQL**

```bash
# Ubuntu/Debian
apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Or use managed service (AWS RDS, GCP Cloud SQL, etc.)
```

**Step 2: Create Database**

```sql
CREATE DATABASE arkade_escrow;
CREATE USER arkade_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE arkade_escrow TO arkade_user;
```

**Step 3: Update Environment**

```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://arkade_user:secure_password@localhost:5432/arkade_escrow
```

**Step 4: Run Migrations**

TypeORM auto-runs migrations on startup when `synchronize: false`:

```bash
npm run build
node dist/main.js

# Logs should show:
# [TypeORM] Running migrations...
# [TypeORM] Migration EscrowContractsInit has been executed successfully
```

**Manual Migration** (if needed):

```bash
# Generate migration from entities
npm run typeorm migration:generate -- -n MigrationName

# Run pending migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

### Database Connection Pooling

For production, configure connection pool:

```typescript
// In TypeORM config (auto-loaded from .env)
{
  type: 'postgres',
  url: process.env.DATABASE_URL,
  poolSize: 20,  // Adjust based on load
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
}
```

### Backup Strategy

**Automated Backups**:

```bash
# Daily backup cron job (4 AM)
0 4 * * * pg_dump -U arkade_user arkade_escrow | gzip > /backups/arkade_escrow_$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 30 days
find /backups -name "arkade_escrow_*.sql.gz" -mtime +30 -delete
```

**Backup to Cloud Storage**:

```bash
# AWS S3
pg_dump -U arkade_user arkade_escrow | gzip | aws s3 cp - s3://your-bucket/backups/arkade_escrow_$(date +%Y%m%d).sql.gz

# Google Cloud Storage
pg_dump -U arkade_user arkade_escrow | gzip | gsutil cp - gs://your-bucket/backups/arkade_escrow_$(date +%Y%m%d).sql.gz
```

**Restore Procedure**:

```bash
# From local backup
gunzip -c /backups/arkade_escrow_20231015.sql.gz | psql -U arkade_user arkade_escrow

# From S3
aws s3 cp s3://your-bucket/backups/arkade_escrow_20231015.sql.gz - | gunzip | psql -U arkade_user arkade_escrow
```

## Arbitrator Key Setup

### Secure Key Generation

**CRITICAL**: Never use development keys in production

**Step 1: Generate Private Key**

```bash
# Use secure random source
openssl rand -hex 32 > /secure/path/arbitrator_privkey.hex

# Set restrictive permissions
chmod 600 /secure/path/arbitrator_privkey.hex
```

**Step 2: Derive x-only Public Key**

```javascript
// derive-pubkey.js
import { utils } from '@noble/secp256k1';
import { readFileSync } from 'fs';

const privKeyHex = readFileSync('/secure/path/arbitrator_privkey.hex', 'utf8').trim();
const privKeyBytes = utils.hexToBytes(privKeyHex);
const pubKeyBytes = utils.pointFromScalar(privKeyBytes, true);
const pubKeyHex = utils.bytesToHex(pubKeyBytes);
const xOnlyPubKey = pubKeyHex.slice(2); // Remove 02/03 prefix

console.log('Set this in production .env:');
console.log(`ARBITRATOR_PUB_KEY=${xOnlyPubKey}`);
```

```bash
node derive-pubkey.js
# Output: ARBITRATOR_PUB_KEY=a1b2c3d4e5f6...
```

**Step 3: Secure Storage**

**Private Key Storage Options**:

1. **Hardware Security Module (HSM)**
   - AWS CloudHSM
   - Google Cloud HSM
   - YubiHSM

2. **Key Management Service**
   - AWS KMS
   - GCP Cloud KMS
   - Azure Key Vault
   - HashiCorp Vault

3. **Encrypted File** (minimum security)
   ```bash
   # Encrypt private key
   openssl enc -aes-256-cbc -salt -in arbitrator_privkey.hex -out arbitrator_privkey.enc

   # Decrypt when needed
   openssl enc -d -aes-256-cbc -in arbitrator_privkey.enc -out arbitrator_privkey.hex
   ```

**Public Key**:
- Set in environment: `ARBITRATOR_PUB_KEY=<x-only-pubkey>`
- Can be public (embedded in contract Ark addresses)

### Key Access Control

**Who Needs Access**:
- API server: Only public key (read from env)
- Arbitrator operator: Private key (for signing arbitration decisions)

**Separation of Concerns**:
- API server never accesses private key
- Arbitrator signing happens offline or via secure signing service
- Consider implementing remote signer pattern (similar to arkd-wallet)

## Docker Production Build

### Multi-Stage Dockerfile

Production `Dockerfile` (already in repo):

```dockerfile
FROM node:24 AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Production runtime
FROM node:24 AS production
WORKDIR /app
RUN mkdir -p /app/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Build and Push

```bash
# Build production image
docker build -t arkade-escrow:latest -f Dockerfile .

# Tag for registry
docker tag arkade-escrow:latest registry.example.com/arkade-escrow:latest
docker tag arkade-escrow:latest registry.example.com/arkade-escrow:v1.0.0

# Push to registry
docker push registry.example.com/arkade-escrow:latest
docker push registry.example.com/arkade-escrow:v1.0.0
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: registry.example.com/arkade-escrow:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ARK_SERVER_URL=${ARK_SERVER_URL}
      - ARBITRATOR_PUB_KEY=${ARBITRATOR_PUB_KEY}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=arkade_escrow
      - POSTGRES_USER=arkade_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arkade_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

**Deploy**:

```bash
# Set secrets in .env
export DATABASE_URL=postgresql://...
export JWT_SECRET=...
export ARK_SERVER_URL=...
export ARBITRATOR_PUB_KEY=...

# Start services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Stop services
docker compose -f docker-compose.prod.yml down
```

## Health Checks

### API Health Endpoint

**Endpoint**: `GET /health`

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": 1697123456789
}
```

**Monitoring Script**:

```bash
#!/bin/bash
# healthcheck.sh

response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$response" != "200" ]; then
  echo "Health check failed: HTTP $response"
  exit 1
fi

echo "Health check passed"
exit 0
```

### Database Connection Check

Add to health endpoint:

```typescript
// In health controller
@Get('health')
async health() {
  try {
    await this.connection.query('SELECT 1');
    return {
      status: 'ok',
      database: 'connected',
      timestamp: Date.now()
    };
  } catch (error) {
    throw new ServiceUnavailableException('Database unavailable');
  }
}
```

### Ark Server Connectivity

```typescript
// Check Ark server reachability
async checkArkServer() {
  try {
    const info = await this.arkService.getServerInfo();
    return { ark_server: 'connected', network: info.network };
  } catch (error) {
    return { ark_server: 'disconnected', error: error.message };
  }
}
```

## Monitoring

### Application Logs

**Structured Logging**:

```typescript
// Use Winston or Pino for production logging
import { Logger } from '@nestjs/common';

logger.log('Contract created', { contractId, senderPubkey, receiverPubkey });
logger.error('Execution failed', { error: err.message, stack: err.stack });
logger.warn('Funding delay detected', { contractId, elapsedMs });
```

**Log Aggregation**:
- Ship logs to centralized service (Datadog, Grafana Loki, AWS CloudWatch)
- Use Docker logging driver or filebeat/fluentd
- Set log retention policy

**Example with Loki**:

```yaml
# docker-compose.prod.yml logging config
services:
  api:
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        labels: "service=arkade-escrow,environment=production"
```

### Metrics

**Recommended Metrics**:
- Request rate (requests/sec by endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active contracts by status
- Funding detection latency
- Execution completion rate

**Prometheus Integration**:

```typescript
// Install @willsoto/nestjs-prometheus
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register()
  ]
})
```

**Grafana Dashboards**:
- Create dashboards for contract lifecycle metrics
- Alert on error rate spikes
- Monitor funding watcher performance

## Arkd Server Connection

### Using Public Mutinynet Server

```bash
ARK_SERVER_URL=https://mutinynet.arkade.sh
```

**Advantages**:
- No infrastructure to manage
- Always available
- Testnet Bitcoin (free)

**Limitations**:
- Testnet only (not production Bitcoin)
- Shared resource (rate limits possible)
- No control over server configuration

### Self-Hosted Arkd

For production mainnet deployments:

```bash
ARK_SERVER_URL=https://your-arkd-server.com:7070
```

**Deployment Steps**:

1. **Deploy arkd server** (see arkd deployment guide)
2. **Configure network**: `mainnet`
3. **Secure with TLS**: Use Let's Encrypt or corporate CA
4. **Set admin port** (optional): Separate port for admin RPCs
5. **Configure wallet**: arkd-wallet with sufficient liquidity
6. **Set round parameters**: Adjust for production load

**Connection Validation**:

```bash
# Test connectivity
curl https://your-arkd-server.com:7070/v1/info

# Expected response
{
  "pubkey": "...",
  "round_lifetime": 30,
  "network": "mainnet",
  "boarding_addr": "...",
  "vtxo_tree_expiry": 604672,
  "unilateral_exit_delay": 86400
}
```

### Connection Resilience

**Retry Logic**:

```typescript
// In ArkService
async executeEscrowTransaction(tx) {
  const maxRetries = 3;
  const backoffMs = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.arkClient.submitTransaction(tx);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(backoffMs * (i + 1));
    }
  }
}
```

**Circuit Breaker**:
- Use `opossum` library
- Open circuit after N consecutive failures
- Half-open state for gradual recovery

## CORS Configuration

### Web Client Access

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

**Environment Variable**:

```bash
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

**Production Best Practice**:
- Never use `*` in production
- Whitelist specific domains
- Use HTTPS only

## Security Checklist

- [ ] JWT secret changed from default (64+ chars)
- [ ] Arbitrator keys generated securely (not dev keys)
- [ ] Private keys stored in KMS/Vault (never in code)
- [ ] Database credentials rotated
- [ ] CORS origins whitelisted (no `*`)
- [ ] HTTPS enforced (TLS 1.2+)
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protections (TypeORM parameterization)
- [ ] Secrets redacted from logs
- [ ] Security headers set (helmet middleware)
- [ ] Regular dependency updates (`npm audit`)

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] Health check endpoint responding
- [ ] Ark server connectivity verified
- [ ] Logs shipping to aggregator
- [ ] Monitoring dashboards created
- [ ] Alerting rules configured
- [ ] Backup automation tested
- [ ] Restore procedure validated
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Load testing completed
