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
# Port forward
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3333"],"localPortNumber":["3333"]}'

# Access: http://localhost:3333
# Default: admin / admin (change on first login)
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
