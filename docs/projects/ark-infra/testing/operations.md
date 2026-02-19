# Daily Operations

## Service Management

### Check Status
```bash
# Connect to instance
INSTANCE_ID=$(make tofu-output ARGS="-raw ec2_instance_id")
aws ssm start-session --target $INSTANCE_ID

# Check services
cd /opt/ark-infra/docker-compose/compose
docker compose -f docker-compose.ark.prod.yaml ps
```

### View Logs
```bash
# Follow logs
docker compose -f docker-compose.ark.prod.yaml logs -f arkd

# Last 100 lines
docker compose -f docker-compose.ark.prod.yaml logs --tail=100 arkd

# All services
docker compose -f docker-compose.ark.prod.yaml logs --tail=50
```

### Restart Services
```bash
# Restart single service
docker compose -f docker-compose.ark.prod.yaml restart arkd

# Restart all services
docker compose -f docker-compose.ark.prod.yaml restart

# Recreate service
docker compose -f docker-compose.ark.prod.yaml up -d --force-recreate arkd
```

### Update Images
```bash
# Pull latest
docker compose -f docker-compose.ark.prod.yaml pull arkd

# Apply update
docker compose -f docker-compose.ark.prod.yaml up -d arkd

# Verify
docker compose -f docker-compose.ark.prod.yaml ps arkd
```

## Monitoring

### Check Bitcoin Sync
```bash
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo
# Check: blocks, headers, verificationprogress
```

### Check NBXplorer
```bash
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq
# Check: syncHeight, chainHeight
```

### Check Disk Space
```bash
df -h
# Watch: / (root) and /mnt/data (Bitcoin)
```

### Check Resource Usage
```bash
# Real-time
docker stats

# CPU/Memory
top

# Disk I/O
iostat -x 5
```

### Access Grafana
```bash
# Port forward (via admin dashboard or CLI)
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3333"],"localPortNumber":["3333"]}'

# Access: http://localhost:3333
# Default: admin / admin (change on first login)
```

### Port Forwarding (All Available Services)

**EC2-local services** (via admin dashboard):
| Service | Local Port | Remote Port |
|---------|-----------|-------------|
| grafana | 3333 | 3333 |
| traefik | 8080 | 8080 |
| arkd-admin | 7071 | 7071 |
| prometheus | 9090 | 9090 |
| alertmanager | 9093 | 9093 |
| loki | 3100 | 3100 |
| jaeger | 16686 | 16686 |
| pyroscope | 4040 | 4040 |

**Remote host services** (RDS, Redis — forwarded through EC2):
| Service | Local Port | Remote Port |
|---------|-----------|-------------|
| database | 5432 | 5432 |
| redis | 6379 | 6379 |

### Deploy Services via SSM

⚠️ **Breaking change**: Deployment now uses full image URLs instead of ECR tags. The SSM document was renamed from `Ark-PullAndRestartService` to `Ark-DeployService`.

```bash
# Deploy arkd with full image URL
aws ssm send-command --document-name Ark-DeployService-${ENV} \
  --instance-ids $INSTANCE_ID \
  --parameters '{"ServiceName":["arkd"],"ImageURL":["ghcr.io/arkade-os/arkd:v0.8.10"]}'

# Deploy arkd-wallet
aws ssm send-command --document-name Ark-DeployService-${ENV} \
  --instance-ids $INSTANCE_ID \
  --parameters '{"ServiceName":["arkd-wallet"],"ImageURL":["ghcr.io/arkade-os/arkd-wallet:v0.8.10"]}'

# Deploy kms-unlocker
aws ssm send-command --document-name Ark-DeployService-${ENV} \
  --instance-ids $INSTANCE_ID \
  --parameters '{"ServiceName":["kms-unlocker"],"ImageURL":["ghcr.io/arklabshq/kms-unlocker:v0.1.0"]}'

# Supported services: arkd, arkd-wallet, kms-unlocker
```

### Pin Running Container Images
```bash
# On EC2: collect digest-pinned image references for all running containers
/opt/ark-infra/docker-compose/scripts/image-pin.sh
```

## Backup Operations

### Manual RDS Snapshot
```bash
aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-projection-prod \
  --db-snapshot-identifier ark-projection-manual-$(date +%Y%m%d-%H%M%S)
```

### List Snapshots
```bash
make list-snapshots ENV=prod
```

### Verify Backups
```bash
make verify-backups ENV=prod
```

## Emergency Procedures

### Service Not Responding
```bash
# 1. Check status
docker compose -f docker-compose.ark.prod.yaml ps

# 2. Check logs
docker compose -f docker-compose.ark.prod.yaml logs --tail=100 arkd

# 3. Restart service
docker compose -f docker-compose.ark.prod.yaml restart arkd

# 4. If still failing, recreate
docker compose -f docker-compose.ark.prod.yaml up -d --force-recreate arkd
```

### Disk Space Low
```bash
# Check usage
df -h
du -sh /mnt/data/docker/* | sort -rh | head -20

# Clean Docker
docker system prune -a  # Removes unused images/containers
docker volume prune     # Removes unused volumes
```

### Database Issues
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier ark-postgres-projection-prod

# Create emergency snapshot
aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-projection-prod \
  --db-snapshot-identifier emergency-backup-$(date +%Y%m%d-%H%M%S)
```

## Routine Tasks

### Daily
- [ ] Check service status
- [ ] Review error logs
- [ ] Monitor disk space
- [ ] Check Bitcoin sync progress
- [ ] Verify backups exist

### Weekly
- [ ] Manual RDS snapshots
- [ ] Review CloudWatch metrics
- [ ] Check for Docker image updates
- [ ] Review security group rules
- [ ] Test SSM access

### Monthly
- [ ] Test disaster recovery
- [ ] Rotate secrets
- [ ] Review cost reports
- [ ] Update documentation

Source: `${ARK_INFRA_REPO}/docker-compose/docs/05-operations.md`
