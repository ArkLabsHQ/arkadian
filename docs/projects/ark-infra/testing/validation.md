# Deployment Validation

## Quick Validation (5-10 minutes)

### Automated Script
```bash
make validate-deployment ENV=prod
```

Checks:
- SSM Agent online
- VPC Endpoints available (6+)
- Security groups (no SSH)
- CloudWatch log groups
- Docker services running
- Basic connectivity

## Essential Validation Checklist

### 1. SSM Agent
```bash
INSTANCE_ID=$(make tofu-output ARGS="-raw ec2_instance_id")
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --query 'InstanceInformationList[0].PingStatus'
# Expected: "Online"
```

### 2. VPC Endpoints
```bash
aws ec2 describe-vpc-endpoints \
  --filters "Name=tag:Environment,Values=$ENV" \
  --query 'length(VpcEndpoints[?State==`available`])'
# Expected: >= 6
```

### 3. Docker Services
```bash
aws ssm start-session --target $INSTANCE_ID
docker compose -f docker-compose.ark.prod.yaml ps
# Expected: All services "Up" or "Up (healthy)"
```

### 4. No SSH Access
```bash
SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
aws ec2 describe-security-groups --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissions[?ToPort==`22`]'
# Expected: [] (empty)
```

### 5. Arkd Responding
```bash
# Port forward
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["7071"],"localPortNumber":["7071"]}'

# Test (in another terminal)
curl http://localhost:7071/admin/info
# Expected: JSON response
```

### 6. NBXplorer Syncing
```bash
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq
# Check: syncHeight is increasing
```

### 7. Wallet Unlocked
```bash
docker logs kms-unlocker | grep -i unlock
# Expected: Success message
```

## Production-Specific Validation

### 8. EBS Volume (Production)
```bash
# Check volume attached and mounted
df -h | grep /mnt/data
# Expected: Volume mounted

# Verify Docker using it
docker info --format '{{.DockerRootDir}}'
# Expected: /mnt/data/docker
```

### 9. Bitcoin Sync
```bash
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo
# Check: blocks, verificationprogress
```

### 10. RDS Databases
```bash
aws rds describe-db-instances \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `prod`)][DBInstanceIdentifier,DBInstanceStatus]'
# Expected: All "available"
```

### 11. Redis
```bash
docker exec arkd redis-cli -h redis PING
# Expected: PONG
```

### 12. Telemetry Stack
```bash
# Check services
cd /opt/ark-telemetry
docker compose -f docker-compose.otel.yaml ps

# Test Prometheus
curl -s http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy
```

### 13. Cloudflared Tunnel
```bash
docker logs --tail=50 cloudflared
# Look for: "Connection established"

# Test public domain
curl -I https://<domain>
# Expected: HTTP 200
```

## Validation Checklist Summary

### Must Pass (Critical)
- [ ] SSM Agent online
- [ ] 6+ VPC endpoints available
- [ ] Private DNS enabled on endpoints
- [ ] No SSH (port 22 blocked)
- [ ] CloudWatch log group exists
- [ ] All Docker services running
- [ ] Bitcoin Core syncing (if prod)
- [ ] RDS databases accessible (3 instances)
- [ ] Redis accessible
- [ ] Admin ports bound to 127.0.0.1 only
- [ ] Public API accessible via domain

### Should Pass (Important)
- [ ] Port forwarding works
- [ ] Environment variables present
- [ ] NBXplorer connected to bitcoind
- [ ] Fast sync completed (if enabled)
- [ ] Telemetry stack running
- [ ] CloudWatch metrics flowing
- [ ] SSL certificates obtained

## Troubleshooting

**SSM Agent Not Online**:
- Wait 2-3 minutes
- Check VPC endpoints
- Verify IAM role

**Services Not Starting**:
- Check logs: `docker compose logs`
- Verify environment variables
- Check disk space

**NBXplorer Not Syncing**:
- Check bitcoind running
- Verify RPC credentials
- Check PostgreSQL connection

Source: `${ARK_INFRA_REPO}/docker-compose/docs/06-validation.md`
