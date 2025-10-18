# Security Architecture

## No-SSH Design
All EC2 access via AWS Systems Manager (SSM) Session Manager:
- No SSH keys to manage
- No port 22 exposure
- No bastion hosts
- Full audit trail in CloudWatch Logs
- IAM-based access control with MFA

## Network Security
**Defense in Depth**:
1. No public IPs on application instances
2. Security groups: least-privilege rules
3. Private subnets for all compute/data
4. VPC endpoints for AWS service access
5. NAT Gateway for controlled egress

## Access Control
**IAM Roles**:
- EC2 instance role: SSM, ECR, Secrets Manager, KMS
- User policies: SSM session access with MFA
- Restricted commands: Custom SSM documents for limited operations

**Audit Logging**:
- SSM sessions: CloudWatch Logs (30-day retention)
- API calls: CloudTrail (90-day default)
- Application logs: Docker logs + Loki

## Secrets Management
**AWS Secrets Manager + KMS**:
- Wallet password: Encrypted with KMS
- Wallet seed: Backed up automatically by kms-unlocker
- Environment secrets: Passed via `-var` flags (never committed)

**Secret Rotation**:
- Production: Every 90 days
- GitHub tokens: Every 90 days
- Database passwords: On-demand

## Application Security
**Localhost-Only Services**:
- arkd admin API (127.0.0.1:7071)
- traefik dashboard (127.0.0.1:8080)
- grafana (127.0.0.1:3333)

**TLS Configuration**:
- Automatic Let's Encrypt via Traefik
- DNS-01 challenge (Cloudflare API)
- TLS 1.2+ with modern ciphers
- Auto-renewal 30 days before expiry

## Data Security
- KMS encryption for secrets
- S3 encryption for state files
- RDS encryption at rest
- EBS encryption

Source: `${ARK_INFRA_REPO}/docker-compose/docs/09-security.md`
