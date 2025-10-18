# Scaling Guide

## Production Sizing Options

### Light Production (~$350-400/month)
**For**: <100 active users, moderate volume

| Resource | Size | Notes |
|----------|------|-------|
| EC2 | t3.xlarge | 4 vCPU, 16GB RAM |
| RDS Projection | db.t3.small | 2 vCPU, 2GB RAM |
| RDS Event | db.t3.small | 2 vCPU, 2GB RAM |
| RDS NBXplorer | db.t3.medium | 2 vCPU, 4GB RAM |
| Redis | cache.t3.small | 1.37GB memory |
| EBS | 600GB gp3 | Bitcoin data |

**Configuration**:
```hcl
instance_type = "t3.xlarge"
additional_volume_size = 600
db_instance_class_projection = "db.t3.small"
db_instance_class_event = "db.t3.small"
db_instance_class_nbxplorer = "db.t3.medium"
```

### Medium Production (~$650-800/month)
**For**: 100-1000 users, high volume

| Resource | Size | Notes |
|----------|------|-------|
| EC2 | c6i.2xlarge | 8 vCPU, 16GB RAM (compute-optimized) |
| RDS Projection | db.r6g.large | 2 vCPU, 16GB RAM (memory-optimized) |
| RDS Event | db.r6g.large | 2 vCPU, 16GB RAM |
| RDS NBXplorer | db.r6g.xlarge | 4 vCPU, 32GB RAM |
| Redis | cache.r6g.large | 13.07GB, Multi-AZ |
| EBS | 800GB gp3 | 16K IOPS |

**Configuration**:
```hcl
instance_type = "c6i.2xlarge"
additional_volume_size = 800
db_instance_class_projection = "db.r6g.large"
db_instance_class_event = "db.r6g.large"
db_instance_class_nbxplorer = "db.r6g.xlarge"
```

### High-Scale Production (~$1500+/month)
**For**: >1000 users, HA requirements

| Resource | Size | Notes |
|----------|------|-------|
| EC2 | c6i.4xlarge | 16 vCPU, 32GB RAM |
| RDS Projection | db.r6g.2xlarge | 8 vCPU, 64GB RAM, Multi-AZ |
| RDS Event | db.r6g.2xlarge | 8 vCPU, 64GB RAM, Multi-AZ |
| RDS NBXplorer | db.r6g.4xlarge | 16 vCPU, 128GB RAM, Multi-AZ |
| Redis | cache.r6g.xlarge | 26.32GB, Multi-AZ cluster |
| EBS | 1TB io2 | 20K IOPS |

**Configuration**:
```hcl
instance_type = "c6i.4xlarge"
additional_volume_size = 1000
additional_volume_type = "io2"
db_instance_class_projection = "db.r6g.2xlarge"
db_instance_class_event = "db.r6g.2xlarge"
db_instance_class_nbxplorer = "db.r6g.4xlarge"
```

## Scaling Operations

### Vertical Scaling (Resize Instances)

**EC2 Instance**:
```bash
# 1. Update tfvars
# instance_type = "c6i.2xlarge"

# 2. Apply changes
make tofu-apply VARS="..."

# 3. OpenTofu will stop, resize, and restart instance
# Downtime: ~5 minutes
```

**RDS Instance**:
```bash
# Option A: Via OpenTofu (recommended)
# Update tfvars:
# db_instance_class_nbxplorer = "db.r6g.large"
make tofu-apply VARS="..."

# Option B: Via AWS CLI (immediate)
aws rds modify-db-instance \
  --db-instance-identifier ark-postgres-nbxplorer-prod \
  --db-instance-class db.r6g.large \
  --apply-immediately
```

**Redis**:
```bash
# Update redis.tf (currently hardcoded)
# node_type = "cache.t3.small"

# Apply
make tofu-apply VARS="..."
```

### Horizontal Scaling (Not Yet Implemented)

**Future Architecture**:
- Multiple EC2 instances
- Application Load Balancer
- RDS read replicas (projection DB)
- Redis cluster mode

**Current Limitations**:
- Single EC2 instance
- Single Redis node
- No built-in load balancing

## Monitoring for Scaling Decisions

### Scale Up When:

**EC2 CPU**:
```bash
# Check average CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average

# Threshold: Average > 70%
```

**RDS Connections**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=ark-postgres-nbxplorer-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum

# Threshold: > 80% of max_connections
```

**Redis Memory**:
```bash
# Threshold: > 80% or evictions occurring
docker exec arkd redis-cli INFO memory | grep used_memory_human
```

## Cost Optimization

### Reserved Instances (30-60% savings)
```bash
# Purchase 1-year Reserved Instance
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 1
```

### Savings Plans (20-40% savings)
- Compute Savings Plans: Flexible across EC2, Lambda, Fargate
- EC2 Instance Savings Plans: Same family (e.g., c6i.*)

### Right-Sizing
Review CloudWatch metrics monthly:
- CPU consistently <30%: Consider smaller instance
- Memory consistently <50%: Consider smaller instance
- Disk I/O wait high: Consider io2 volume or IOPS increase

Source: `${ARK_INFRA_REPO}/docker-compose/docs/08-sizing-and-scaling.md`
