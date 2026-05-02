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
**EC2 Service Role**: SSM, ECR, Secrets Manager, KMS, CloudWatch.

**Human Access — Google Workspace SSO** (`aws/{account}/`, modules `ark-iam-roles`, `ark-gws-sync`):
SAML federation is provisioned per AWS account (prod `982590065524`, dev `438465126741`) with role prefixes `ArkProd` / `ArkDev`. A scheduled Lambda (every 15 min) reads GWS group membership and writes `Amazon.Role` user attributes; users sign in at https://accounts.google.com/, click the AWS tile, and select a role from the role picker. Removing a user from all mapped groups clears the attribute and revokes access on the next sync.

**Role hierarchy** (each account):
| Role | Base policy | Guardrails |
|------|-------------|------------|
| `{Prefix}SuperAdministrator` | `AdministratorAccess` + Billing | none |
| `{Prefix}Administrator` | `PowerUserAccess` + IAM | `AdminRestrictions` |
| `{Prefix}Developer` | `PowerUserAccess` | `AdminRestrictions` + `DeveloperRestrictions` + `SSMPortForwarding` |
| `{Prefix}ReadOnly` | `ReadOnlyAccess` | `AdminRestrictions` + `DeveloperRestrictions` |

**Guardrails** (`modules/ark-iam-roles/policies.tf`):
- `AdminRestrictions` — denies Secrets Manager value ops, SSM `*secure*` parameters, account/billing, CloudTrail/GuardDuty/Config/SecurityHub disruption, KMS destructive ops, Route53 domain transfer, `*secure*` Lambda mutation, S3 public-access toggles, Terraform state bucket / lock table mutation, `sts:AssumeRole` on SuperAdministrator, and SSM **shell** sessions (`SSM-SessionManagerRunShell`). Port forwarding is unaffected.
- `DeveloperRestrictions` — adds: deny read/write on Terraform state bucket and lock table, deny `sts:AssumeRole` on Administrator, and deny sensitive log access (`/aws/ssm/sessions/*` and any `/*secure*` log group: `Get/FilterLogEvents`, `StartQuery`, `CreateExportTask`, etc.).
- `SSMPortForwarding` — allows `ssm:StartSession` only against `AWS-StartPortForwardingSession[ToRemoteHost]`, plus session terminate/resume scoped to `${aws:username}-*`.

**SSM access model**:
| Role | Shell session | Port forward | Run Command |
|------|---------------|--------------|-------------|
| SuperAdministrator | ✓ | ✓ | ✓ |
| Administrator | ✗ | ✓ | ✓ |
| Developer | ✗ | ✓ | ✗ |
| ReadOnly | ✗ | ✗ | ✗ |

**Tagging / ABAC**: SAML trust policy includes `sts:TagSession`, enabling principal-tag based access control from Google Workspace. Provider `default_tags` set `Environment`, `ManagedBy = "opentofu"`, `Repository = "ark-infra"`, `Owner`. Account ID is derived from `data.aws_caller_identity` (no hardcoded account variable).

**Audit Logging**:
- SSM sessions: CloudWatch Logs (30-day retention)
- GWS-AWS sync Lambda: `/aws/lambda/secure-gws-aws-sync-{env}`
- API calls: CloudTrail (90-day default)
- Application logs: CloudWatch Logs (`/ark/${ARK_ENVIRONMENT}`) via `awslogs` driver

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
