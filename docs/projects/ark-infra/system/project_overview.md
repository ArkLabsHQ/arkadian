# Ark Infrastructure - Project Overview

## What is ark-infra?

ark-infra is the single source of truth for all Ark infrastructure deployments across multiple environments (regtest, staging, production) and container orchestration technologies. It provides Infrastructure as Code (IaC) using OpenTofu (Terraform fork) combined with Docker Compose for application orchestration.

## Purpose and Scope

### Primary Goals
- **Multi-environment deployment**: Support regtest, staging, and production with complete isolation
- **Infrastructure as Code**: All infrastructure defined in version-controlled OpenTofu configurations
- **Container orchestration**: Docker Compose for application service management
- **Security-first design**: No SSH access, all operations via AWS Systems Manager (SSM)
- **Automated operations**: Self-managing services like wallet unlock and blockchain indexing

### What It Manages
- AWS infrastructure (VPC, EC2, RDS, ElastiCache, ECR, IAM)
- Network configuration (VPC endpoints, NAT gateway, security groups)
- Container deployments (arkd, arkd-wallet, NBXplorer, Bitcoin Core)
- Monitoring stack (Prometheus, Grafana, Jaeger, Loki)
- Secrets management (AWS Secrets Manager, KMS encryption)

## Repository Structure

```
ark-infra/
├── README.md                          # Global entry point
├── flake.nix / .envrc                 # Nix devshell (nodejs_20, opentofu 1.9.1, python3) via direnv
├── aws/                               # Per-account IAM/SSO OpenTofu configs
│   ├── README.md                      # SSO setup + per-account deployment guide
│   ├── dev-438465126741/              # Dev account (ArkDev* roles + organizations.tf for developer sandbox sub-accounts)
│   └── prod-982590065524/             # Prod account (ArkProd* roles)
├── apps/                              # Per-app, per-env OpenTofu entry points
│   └── ark/staging/                   # Staging stack — composes `modules/ark` with ACM cert + SSM prefix
├── modules/                           # Reusable OpenTofu modules
│   ├── ark/                           # Ark app + telemetry: ALB, arkd routing, telemetry ASG, Cloud Map, Ansible provisioning
│   │   ├── alb.tf                     # Shared internet-facing ALB (HTTPS listener, ACM cert, 180s idle, access+conn logs)
│   │   ├── arkd.tf                    # arkd target groups (gRPC/REST/SSE) + listener rules (since 2026-05)
│   │   ├── s3.tf                      # ALB log bucket (ark-logs-${env}-${account_id}) + ark-tmp-${env} (7d expiry)
│   │   ├── locals.tf                  # account_id / region from data sources
│   │   ├── outputs.tf                 # alb_dns_name, alb_zone_id (consumed by Route53 aliases)
│   │   ├── telemetry.tf               # Telemetry EC2 ASG + IAM + SGs + Grafana target group (priority 100)
│   │   ├── service_discovery.tf       # Cloud Map private DNS for telemetry collector
│   │   ├── scripts/user-data.sh       # Bootstraps Ansible from SSM-stored GitHub token
│   │   ├── ansible/playbook.yml       # Telemetry instance provisioning (Docker, ark-telemetry clone, systemd)
│   │   └── agent/otel-agent-config.yaml # Local OTLP collector config used on app hosts
│   ├── ark-iam-roles/                 # SAML-federated IAM roles + guardrail policies
│   └── ark-gws-sync/                  # Lambda syncing GWS group → AWS role attribute
└── docker-compose/                    # Docker Compose + OpenTofu automation
    ├── README.md                      # Docker Compose documentation
    ├── Makefile                       # Automation commands
    ├── opentofu/                      # Infrastructure definitions
    │   ├── *.tf                       # OpenTofu resources
    │   ├── variables.tf               # Variable definitions
    │   └── backend-{env}.hcl          # S3 backend configs
    ├── environments/                  # Environment-specific configs
    │   ├── regtest.tfvars
    │   ├── staging.tfvars
    │   └── prod.tfvars
    ├── scripts/                       # Bootstrap and utility scripts
    │   ├── user-data-ec2-prod.sh
    │   ├── user-data-ec2-regtest.sh
    │   ├── setup_environment.sh
    │   └── image-pin.sh               # Collect pinned image digests
    ├── compose/                       # Docker Compose files
    │   ├── docker-compose.ark.prod.yaml
    │   └── docker-compose.ark.regtest.yaml
    └── docs/                          # Comprehensive documentation
        ├── 01-architecture.md
        ├── 02-getting-started.md
        └── ...
```

## Multi-Environment Design

### Environment Characteristics

| Environment | Purpose | Bitcoin Node | Resources | Backups | Cost/Month |
|-------------|---------|--------------|-----------|---------|------------|
| **Regtest** | Fast testing, feature development | External (nigiri) | Minimal | No | ~$150 |
| **Staging** | Pre-production validation | Full mainnet | Medium | Optional | ~$400 |
| **Production** | Live system | Full mainnet | Production-grade | Required | ~$800+ |

### Isolation Strategy
- **OpenTofu workspaces**: Each environment has its own workspace (prod, staging, regtest)
- **Separate tfvars**: Environment-specific configuration in `environments/*.tfvars`
- **Dedicated AWS resources**: No shared resources between environments
- **S3 backend per environment**: `ark-{env}-terraform-state` buckets
- **High Availability**: VPC spans 3 AZs (eu-central-1a/1b/1c); non-ephemeral envs use Multi-AZ RDS, Multi-AZ Redis with automatic failover, and NAT gateway per AZ (toggle via `vpc_nat_per_az`)

## Core Services

### Infrastructure Services

1. **EC2 Application Instance** (Private subnet)
   - Hosts all Docker containers
   - No public IP, SSH access
   - Access via SSM Session Manager only
   - Optional EBS volume for Bitcoin data

2. **RDS PostgreSQL** (3 instances)
   - `postgres-projection`: CQRS read model
   - `postgres-event`: Event sourcing store
   - `postgres-nbxplorer`: Blockchain indexer database

3. **ElastiCache Redis**
   - Session state management
   - Round processing queues
   - Distributed locks

4. **ECR Repositories**
   - `arkd-{env}`: Main Ark daemon
   - `arkd-wallet-{env}`: Wallet service
   - `kms-unlocker-{env}`: Wallet unlock automation
   - **Note**: `compose/docker-compose.ark.prod.yaml` now pulls arkd/arkd-wallet from GHCR
     (`ghcr.io/arkade-os/arkd:v0.9.5`, `ghcr.io/arkade-os/arkd-wallet:v0.9.5`). ECR remains used
     for SSM-driven `Ark-DeployService` deploys (full image URL parameter).

### Application Services

1. **arkd** (Main Service)
   - Core Ark protocol daemon
   - Handles rounds, VTXOs, payments
   - REST + gRPC API on port 7070
   - Admin API on localhost:7071

2. **arkd-wallet** (Auto-managed)
   - Bitcoin wallet operations
   - Automatically unlocked by kms-unlocker
   - Connects to NBXplorer for UTXO tracking

3. **kms-unlocker** (Automation)
   - Fetches encrypted wallet password from AWS Secrets Manager
   - Creates/unlocks wallet on startup
   - Backs up wallet seed to Secrets Manager
   - Zero manual intervention required

4. **nbxplorer** (Auto-managed)
   - Bitcoin blockchain indexer
   - Dedicated PostgreSQL database
   - Connects to bitcoind (prod) or external node (regtest)

5. **bitcoind** (Production only)
   - Full Bitcoin mainnet node
   - Fast sync via AssumeUTXO (~20 minutes)
   - P2P port 8333, RPC port 8332
   - Storage on EBS volume

### Ingress & Routing

1. **cloudflared** (Tunnel) — legacy ingress, still used on prod
   - Secure ingress via Cloudflare Tunnel
   - No public IP required
   - DDoS protection at edge
   - Encrypted tunnel connection

2. **traefik** (Reverse Proxy) — fronts cloudflared path
   - TLS termination (Let's Encrypt)
   - Request routing (REST vs gRPC)
   - Server-Sent Events (SSE) handling
   - Dashboard on localhost:8080

3. **Shared ALB → arkd** (new in 2026-05, staging-first)
   - Three target groups on port 7070: `arkdg-*` (gRPC), `arkds-*` (SSE), `arkdr-*` (REST)
   - Listener rules route by host header (`arkd_hosts`), `content-type: application/grpc*`, and SSE path patterns
   - HTTP/1.1 default (`arkd_http1_support = true`); idle timeout 180s (exceeds arkd 60s heartbeat + Cloudflare 120s edge)
   - Access + connection logs to `ark-logs-${env}-${account_id}` (lifecycle by `alb_log_retention_days`)
   - Staging endpoints: `staging.arkade.sh` (direct A record), `staging-cf.arkade.sh` (Cloudflare proxied, TLS Full Strict)

### Telemetry Stack

As of 2026-05, the telemetry stack is **split across two instances**:

- **Telemetry instance (separate EC2, ASG, fronted by shared ALB)** — provisioned by `modules/ark/telemetry.tf` and bootstrapped by `modules/ark/ansible/playbook.yml`. Hosts:
  - **Prometheus** (port 9090)
  - **Grafana** (port 3000, public via ALB on `telemetry_grafana_host`, Google SSO enabled)
  - **Loki**, **Jaeger** (16686), **Alertmanager** (9093), **Pyroscope** (4040)
  - **otel-collector** (OTLP gRPC 4317 / HTTP 4318)
- **App instance (bundled into Ark Compose stack)** — sidecar collectors that forward to the telemetry instance:
  - **otel-agent** (`otel/opentelemetry-collector-contrib:0.151.0`) — local OTLP receiver, host metrics, exports to central collector via `ARK_TELEMETRY_COLLECTOR_ENDPOINT`
  - **cadvisor** (`v0.56.2`) — container metrics

App ↔ telemetry resolution uses **AWS Cloud Map** private DNS; the telemetry instance registers/deregisters itself on boot via `servicediscovery:RegisterInstance`.

## Key Features

### No-SSH Design
- All EC2 access via AWS Systems Manager (SSM) Session Manager
- No SSH keys to manage or rotate
- Full audit trail in CloudWatch Logs
- IAM-based access control
- Session encryption via TLS

### Automated Operations
- **Wallet unlock**: Automatic via kms-unlocker (no manual intervention)
- **Blockchain indexing**: NBXplorer runs automatically
- **SSL certificates**: Traefik (v3.6.14) auto-renews via Let's Encrypt; access logs and JSON formatting enabled
- **Service discovery**: Docker Compose automatic DNS
- **Health checks**: Built-in container health monitoring
- **Image pinning**: Script to collect and pin running container image digests
- **Centralized logs**: All containers ship stdout/stderr to AWS CloudWatch (`/ark/${ARK_ENVIRONMENT}` log group, 14-day retention) via Docker `awslogs` driver — `docker logs` is no longer the source of truth, use the CloudWatch UI

### Security Architecture
- **Private networking**: All resources in private subnets
- **VPC endpoints**: Private AWS service access (no NAT charges for AWS traffic)
- **Security groups**: Least-privilege access rules
- **Secrets management**: AWS Secrets Manager + KMS encryption
- **Localhost-only services**: Admin APIs bound to 127.0.0.1
- **Federated human access**: Google Workspace SAML SSO with four account-prefixed roles (`ArkProd*` / `ArkDev*`: SuperAdministrator, Administrator, Developer, ReadOnly). A 15-minute Lambda (`secure-gws-aws-sync-{env}`) syncs GWS group membership to the `Amazon.Role` user attribute and clears it for users orphaned from all mapped groups. Guardrail policies restrict secrets, Terraform state, security-tooling tampering, sensitive log groups (`/*secure*`, `/aws/ssm/sessions/*`), and SSM shell sessions for non-SuperAdmins (port forwarding remains available for Admin/Developer)

### State Management
- **S3 backend**: State stored in versioned S3 buckets
- **Automatic versioning**: Every state change preserved
- **Point-in-time recovery**: Rollback to any previous version
- **DynamoDB locking**: Prevents concurrent modifications
- **Cross-region replication**: Optional for disaster recovery

## Design Principles

### Infrastructure as Code
- All resources defined in OpenTofu
- Version-controlled configuration
- Reproducible deployments
- Automated provisioning

### Security First
- No SSH access (SSM only)
- Private subnets for all compute
- Secrets in AWS Secrets Manager
- Network isolation via security groups
- Audit logging enabled

### Automation
- One-command environment setup (`make setup-env`)
- Automatic service management (kms-unlocker, nbxplorer)
- Self-healing via Docker health checks
- Auto-scaling capable (future)

### Observability
- Full telemetry stack (metrics, logs, traces)
- CloudWatch integration
- Grafana dashboards
- Alerting via Slack

## Getting Started

### Prerequisites
- Docker (for running OpenTofu via Makefile)
- AWS CLI with configured credentials
- AWS account with admin permissions
- GitHub Personal Access Token
- Cloudflare account (for tunnel and DNS)

### Quick Start (5 minutes)
```bash
# 1. Clone repository
git clone https://github.com/ArkLabsHQ/ark-infra.git
cd ark-infra/docker-compose

# 2. Setup complete environment
make setup-env
# This creates: KMS key, S3 bucket, DynamoDB table, Secrets Manager secret,
#               backend config, OpenTofu workspace, and initializes

# 3. Deploy
make tofu-apply VARS="-var-file=../environments/regtest.tfvars -var=..."
```

See `${ARK_INFRA_REPO}/docker-compose/docs/02-getting-started.md` for detailed steps.

## Future Extensibility

### Multi-Orchestrator Support
The repository structure supports future orchestrators:
- Current: `docker-compose/` (production-ready)
- Future: `ecs/`, `nomad/`, `k8s/` (as needed)

Each orchestrator has its own:
- README with specific instructions
- Deployment automation
- Configuration management
- Operational procedures

### Scaling Options
- Horizontal: Multiple EC2 instances with load balancer
- Vertical: Larger instance types and database sizes
- Multi-region: Cross-region replication for DR
- Kubernetes: Migration path for large-scale deployments

## Cost Overview

### Monthly Estimates

**Regtest** (~$150/month):
- EC2 t3.large: ~$60/mo
- RDS 3x t3.micro: ~$30/mo
- Redis t3.micro: ~$15/mo
- NAT + VPC endpoints: ~$80/mo
- No EBS volume

**Production** (~$800/month):
- EC2 t3.xlarge: ~$120/mo
- RDS 3x t3.small/medium: ~$80/mo
- Redis t3.small: ~$15/mo
- EBS 800GB gp3: ~$64/mo
- NAT + VPC endpoints: ~$80/mo
- Data transfer: ~$50/mo
- Backups: ~$20/mo

See sizing guide for detailed breakdown and optimization tips.

## Documentation

### Core Documentation
Located in `${ARK_INFRA_REPO}/docker-compose/docs/`:

1. **Architecture** - System design and components
2. **Getting Started** - 5-minute regtest deployment
3. **Deployment Guide** - Full deployment workflows
4. **Networking** - VPC, endpoints, security
5. **Operations** - Daily operations and service management
6. **Validation** - Post-deployment checklists
7. **Troubleshooting** - Common issues and solutions
8. **Sizing & Scaling** - Resource recommendations
9. **Security** - Access control and secrets management
10. **Disaster Recovery** - Backup and restore procedures
11. **Reference** - Variables, commands, ports

### Additional Resources
- **Bitcoin Fast Sync**: AssumeUTXO implementation
- **OpenTofu State**: S3 backend with versioning
- **IAM Roles**: Permissions and policies

## Support and Contributions

### Getting Help
- Review comprehensive docs in `docker-compose/docs/`
- Check troubleshooting guide for common issues
- Consult reference documentation for commands
- Review validation checklists after deployment

### Development Workflow
1. Test changes in regtest environment
2. Validate in staging with production-like setup
3. Deploy to production during maintenance window
4. Document any custom configurations

## Related Projects

- **Ark** (`${ARKD_REPO}): Main application
- **Ark Telemetry**: Monitoring stack
- **kms-unlocker**: Wallet unlock automation
- **arkd-wallet**: Bitcoin wallet service (NBXplorer-based)

## References

See the `system/` directory for detailed documentation:
- `architecture.md`: Infrastructure design
- `aws-infrastructure.md`: AWS resources
- `networking.md`: VPC and connectivity
- `security.md`: Security architecture
- `opentofu-reference.md`: IaC details
