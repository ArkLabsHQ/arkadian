# AWS Infrastructure - Detailed Reference

## VPC Configuration

### Network CIDR
- **VPC CIDR**: 10.10.0.0/16 (65,536 IPs)
- **Public Subnets**: 10.10.1.0/24, 10.10.2.0/24 (512 IPs)
- **Private Subnets**: 10.10.101.0/24, 10.10.102.0/24 (512 IPs)

### Availability Zones
- **Primary**: eu-central-1a
- **Secondary**: eu-central-1b
- Resources distributed across AZs for high availability

## Compute Resources

### EC2 Instance Configuration

**Default Sizing** (regtest):
- Instance type: t3.large (2 vCPU, 8GB RAM)
- Root EBS: 60GB gp3
- Additional EBS: None

**Production Sizing**:
- Instance type: t3.xlarge+ (4+ vCPU, 16GB+ RAM)
- Root EBS: 60GB gp3
- Additional EBS: 600-1000GB gp3/io2 (Bitcoin data)

**IAM Role Permissions**:
- `AmazonSSMManagedInstanceCore` - SSM Session Manager
- `CloudWatchAgentServerPolicy` - Metrics and logs
- Custom inline policy for ECR, Secrets Manager, KMS

**CloudWatch Agent**:
- Collects memory, disk, network metrics
- Metrics namespace: `CWAgent`
- Metrics: mem_used_percent, disk_used_percent, disk_inodes_free

## Database Configuration

### RDS PostgreSQL Instances

**Instance 1: Projection Database**
- Identifier: `ark-postgres-projection-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: CQRS read model (query-heavy)
- Max connections: 300 (prod)

**Instance 2: Event Database**
- Identifier: `ark-postgres-event-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: Event sourcing store (write-heavy)
- Max connections: 300 (prod)

**Instance 3: NBXplorer Database**
- Identifier: `ark-postgres-nbxplorer-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro (prod: db.t3.medium+)
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: Bitcoin blockchain indexer (highest load)
- Max connections: 400 (prod)

**Common RDS Configuration**:
- Subnet group: `ark-db-subnet-group-{env}` (spans both AZs)
- Security group: `rds_sg` (port 5432 from app_sg only)
- Backup retention: 7 days (prod), 1 day (regtest/staging)
- Backup window: 03:00-04:00 UTC
- Maintenance window: Sun:04:00-Sun:05:00 UTC
- Encryption: AWS-managed KMS key
- Performance Insights: Enabled (7-day retention)

### Parameter Groups

**Custom tuning per database**:
```
projection:
  max_connections: 300
  log_min_duration_statement: 500ms

event:
  max_connections: 300
  log_min_duration_statement: 500ms

nbxplorer:
  max_connections: 400
  log_min_duration_statement: 1000ms
```

## Cache Configuration

### ElastiCache Redis

**Configuration**:
- Cluster ID: `ark-redis-{env}`
- Engine: Redis 7.0
- Node type: cache.t3.micro (prod: cache.t3.small+)
- Nodes: 1 (single node)
- Subnet group: `ark-redis-subnet-{env}` (spans both AZs)
- Security group: `redis_sg` (port 6379 from app_sg only)

**Production Recommendations**:
- Node type: cache.r6g.large with Multi-AZ
- Automatic failover enabled
- Cluster mode for horizontal scaling

## Container Registry

### ECR Repositories

**Repository 1: arkd**
- Name: `arkd-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

**Repository 2: arkd-wallet**
- Name: `arkd-wallet-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

**Repository 3: kms-unlocker**
- Name: `kms-unlocker-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

## VPC Endpoints

### Interface Endpoints (PrivateLink)

**Cost**: ~$0.01/hour per endpoint (~$7/month each)

1. **SSM Core** (`com.amazonaws.{region}.ssm`)
   - Purpose: Systems Manager API
   - Security group: vpc_endpoints_sg
   - Private DNS: Enabled

2. **SSM Messages** (`com.amazonaws.{region}.ssmmessages`)
   - Purpose: Session Manager messaging
   - Required for SSM sessions

3. **EC2 Messages** (`com.amazonaws.{region}.ec2messages`)
   - Purpose: EC2 agent communication
   - Required for SSM agent

4. **ECR API** (`com.amazonaws.{region}.ecr.api`)
   - Purpose: ECR control plane (auth, image manifest)
   - Reduces NAT data transfer

5. **ECR DKR** (`com.amazonaws.{region}.ecr.dkr`)
   - Purpose: Docker registry operations
   - Image layer downloads via S3 gateway

6. **CloudWatch Logs** (`com.amazonaws.{region}.logs`)
   - Purpose: SSM session logging
   - Reduces NAT data transfer

### Gateway Endpoint (Free)

7. **S3 Gateway** (`com.amazonaws.{region}.s3`)
   - Purpose: ECR image layers
   - No hourly charge
   - No data processing charge
   - Automatic prefix list routes

## IAM Configuration

### EC2 Instance Role

**Role Name**: `ark-app-role-{env}`

**Attached Policies**:
1. `AmazonSSMManagedInstanceCore` (AWS managed)
2. `CloudWatchAgentServerPolicy` (AWS managed)
3. `ark-app-ecr-full` (Custom inline)

**Custom Policy (ark-app-ecr-full)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:{region}:{account}:repository/arkd-{env}",
        "arn:aws:ecr:{region}:{account}:repository/arkd-wallet-{env}",
        "arn:aws:ecr:{region}:{account}:repository/kms-unlocker-{env}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:{region}:{account}:secret:ark-pass*",
        "arn:aws:secretsmanager:{region}:{account}:secret:arkd-wallet-seed*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt"
      ],
      "Resource": "arn:aws:kms:{region}:{account}:key/*"
    }
  ]
}
```

## CloudWatch Configuration

### Log Groups

**SSM Session Logs**:
- Log group: `/aws/ssm/sessions/{env}`
- Retention: 30 days
- Encryption: CloudWatch Logs managed key
- Purpose: Audit trail for all SSM sessions

**CloudWatch Agent Logs**:
- Log group: `/aws/ec2/{instance-id}`
- Retention: 7 days
- Metrics: Custom namespace `CWAgent`

### Metrics

**EC2 Standard Metrics** (AWS/EC2):
- CPUUtilization
- NetworkIn/Out
- DiskReadOps/WriteOps
- StatusCheckFailed

**CloudWatch Agent Metrics** (CWAgent):
- mem_used_percent
- disk_used_percent
- disk_inodes_free
- netstat_tcp_established

**RDS Metrics** (AWS/RDS):
- CPUUtilization
- DatabaseConnections
- FreeableMemory
- ReadIOPS/WriteIOPS
- FreeStorageSpace

**ElastiCache Metrics** (AWS/ElastiCache):
- CPUUtilization
- FreeableMemory
- NetworkBytesIn/Out
- CurrConnections
- Evictions

## Cost Breakdown

### Monthly Fixed Costs
- NAT Gateway: ~$32/mo (730 hours × $0.045/hr)
- VPC Endpoints (7 Interface): ~$50/mo (7 × $0.01/hr × 730hr)
- S3 Gateway Endpoint: $0 (free)

### Variable Costs

**Compute**:
- t3.large: ~$60/mo
- t3.xlarge: ~$120/mo
- c6i.2xlarge: ~$250/mo
- c6i.4xlarge: ~$500/mo

**Database**:
- db.t3.micro (3x): ~$30/mo
- db.t3.small (3x): ~$60/mo
- db.r6g.large (3x): ~$350/mo

**Cache**:
- cache.t3.micro: ~$15/mo
- cache.t3.small: ~$25/mo
- cache.r6g.large: ~$180/mo

**Storage**:
- EBS gp3 (per GB): ~$0.08/GB/mo
- 800GB Bitcoin data: ~$64/mo
- RDS storage (per GB): ~$0.115/GB/mo

**Data Transfer**:
- First 100GB out: Free
- Next 10TB: $0.09/GB
- NAT data processing: $0.045/GB

### Environment Cost Estimates
- **Regtest**: ~$150/mo
- **Staging**: ~$400/mo
- **Production**: ~$800+/mo

## Disaster Recovery Resources

### RDS Automated Backups
- Retention: 7 days (prod), 1 day (dev)
- Point-in-time recovery: 5-minute granularity
- Cross-region copy: Optional
- Cost: Free up to 100% of provisioned storage

### EBS Snapshots
- Manual snapshots: User-triggered
- AWS Backup: Automated via backup plans
- Data Lifecycle Manager (DLM): Policy-based
- Cross-region copy: Supported
- Cost: $0.05/GB/month

### State Files
- S3 versioning: Enabled on state buckets
- Every change creates new version
- Point-in-time recovery: Any version
- Cross-region replication: Optional
- Cost: Minimal (state files are small)

## Resource Tagging Strategy

**Standard Tags** (applied to all resources):
- `Environment`: prod|staging|regtest
- `ManagedBy`: opentofu
- `Project`: ark-infra
- `Workspace`: {workspace-name}

**Additional Tags**:
- `Backup`: true (for backup automation)
- `CostCenter`: {team-name}
- `Application`: {service-name}

Source: `${ARK_INFRA_REPO}/docker-compose/opentofu/*.tf`
