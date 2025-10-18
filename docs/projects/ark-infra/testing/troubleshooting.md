# Troubleshooting Guide

## Common Issues

### SSM Session Manager

**Cannot Connect**:
```bash
# Check SSM agent
aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCE_ID"

# Solutions:
# 1. Wait 2-3 minutes after deployment
# 2. Check VPC endpoints available
# 3. Verify IAM role has AmazonSSMManagedInstanceCore
```

**Session Disconnects**:
```bash
# Keep alive with periodic commands
watch -n 300 date  # Every 5 minutes
```

### Cloudflared Tunnel

**Tunnel Not Connecting**:
```bash
docker logs cloudflared

# Common errors:
# 1. "Unable to reach origin" → traefik not running
# 2. "Invalid token" → regenerate tunnel token
# 3. "Too many failed heartbeats" → check NAT Gateway
```

**Domain Not Accessible**:
```bash
# Check tunnel status
docker ps | grep cloudflared
docker logs --tail=50 cloudflared

# Verify traefik
docker ps | grep traefik
ss -tlnp | grep :443
```

### Bitcoin Sync Issues

**Sync Very Slow**:
```bash
# Check progress
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo

# Solutions:
# 1. Enable fast sync: -var=btc_fast_sync_enabled=true
# 2. Use larger instance (c6i.2xlarge)
# 3. Increase EBS IOPS
# 4. Check peer connections
```

**Fast Sync Failed**:
```bash
# Check logs
sudo grep -i "fast sync" /var/log/cloud-init-output.log

# Retry:
# Delete partial download and redeploy
```

### NBXplorer Issues

**Not Syncing**:
```bash
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq

# Check:
# 1. bitcoind running: docker ps | grep bitcoind
# 2. RPC credentials correct
# 3. PostgreSQL accessible
# 4. Restart: docker compose restart nbxplorer
```

### Wallet Issues

**Not Unlocking**:
```bash
docker logs kms-unlocker

# Common errors:
# 1. "Secret not found" → create in Secrets Manager
# 2. "Access denied" → check IAM permissions
# 3. "Already unlocked" → normal, wallet was unlocked
```

### Database Connection

**Cannot Connect to RDS**:
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier ark-postgres-projection-prod

# Test connection
docker run --rm --network ark postgres:15 \
  psql "$DB_URL" -c "SELECT 1;"

# Solutions:
# 1. Check security group allows port 5432
# 2. Verify password in .env.ark
# 3. Check RDS endpoint DNS resolves
```

### Redis Connection

**Cannot Connect**:
```bash
docker exec arkd redis-cli -h redis PING

# Solutions:
# 1. Check security group allows port 6379
# 2. Verify Redis endpoint in .env.ark
```

## Debugging Tools

### Check All Services
```bash
#!/bin/bash
echo "=== SSM Agent ==="
aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCE_ID"

echo "=== Docker Services ==="
docker compose -f docker-compose.ark.prod.yaml ps

echo "=== Bitcoin Sync ==="
docker exec bitcoind bitcoin-cli -datadir=/data getblockcount

echo "=== NBXplorer ==="
curl -s http://localhost:32838/v1/health

echo "=== Disk Usage ==="
df -h
```

### Network Diagnostics
```bash
# DNS resolution
nslookup ssm.$AWS_REGION.amazonaws.com

# Port bindings
ss -tlnp | grep -E ':(7070|7071|8080|3333|8333)'

# External connectivity
ping -c 3 1.1.1.1
```

## Emergency Procedures

**Service Down**:
1. Check logs
2. Restart service
3. If fails, recreate container
4. Last resort: restart all services

**Disk Full**:
1. Check usage: `df -h`
2. Clean Docker: `docker system prune -a`
3. Truncate logs: `sudo truncate -s 0 /var/log/syslog`

**Instance Unresponsive**:
1. Check EC2 status checks
2. Reboot: `aws ec2 reboot-instances --instance-ids $INSTANCE_ID`
3. If fails, create EBS snapshot and investigate

Source: `${ARK_INFRA_REPO}/docker-compose/docs/07-troubleshooting.md`
