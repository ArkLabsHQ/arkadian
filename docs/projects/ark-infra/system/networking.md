# Networking Architecture

## Overview
Ark infrastructure uses a multi-layered networking approach:
1. AWS VPC with public/private subnets
2. VPC endpoints for private AWS service access
3. Cloudflared tunnel for secure ingress
4. Traefik reverse proxy for TLS and routing
5. Docker bridge network for inter-container communication

## VPC Design
- **CIDR**: 10.10.0.0/16
- **Public subnets**: 10.10.{1,2,3}.0/24 — host NAT Gateways and VPC endpoints
- **Private subnets**: 10.10.{101,102,103}.0/24 — EC2, RDS, Redis
- **Multi-AZ**: Resources span 3 availability zones (eu-central-1a/1b/1c)
- **NAT topology**: `vpc_nat_per_az` feature flag — `true` (default): one NAT per AZ for HA;
  `false`: single shared NAT in AZ-a (saves ~$64/mo for dev/staging)

## Security Groups
1. **app_sg**: EC2 instance (self-referential + VPC endpoints)
2. **rds_sg**: PostgreSQL (port 5432 from app_sg only)
3. **redis_sg**: ElastiCache (port 6379 from app_sg only)
4. **vpc_endpoints_sg**: Private endpoints (port 443 from app_sg) — rules defined as
   standalone `aws_security_group_rule` resources (since #73) so that other stacks can
   add their own rules without causing plan drift. In the new shared `modules/vpc`
   the SG is **egress-only**; callers add their own ingress rules referencing
   `module.vpc.vpc_endpoints_sg_id`.

## Shared VPC Module (migration in progress, since #86 / 2026-06)

`modules/vpc/` is a reusable VPC module intended to move VPC ownership out of
`docker-compose/opentofu` and into per-account stacks (`aws/dev-438465126741/`,
`aws/prod-982590065524/`) — invoked as `module.vpc_staging` / `module.vpc_prod`.

- Inputs: `env`, `region` (default `eu-central-1`), `vpc_cidr` (default `10.10.0.0/16`),
  `public_subnet_cidrs`/`private_subnet_cidrs` (maps keyed by AZ suffix), `nat_per_az`
  (default `true`)
- Creates: VPC, 3 public + 3 private subnets (tagged `Tier`), IGW, EIP/NAT/private RT
  per NAT AZ, route table associations, egress-only `vpc_endpoints_sg`, six interface
  endpoints (`ssm`, `ssmmessages`, `ec2messages`, `ecr.api`, `ecr.dkr`, `logs`), S3
  gateway endpoint
- Outputs: `vpc_id`, `vpc_cidr_block`, public/private subnet IDs (list + map by AZ),
  IGW ID, NAT gateway IDs + EIPs by AZ, route table IDs, `vpc_endpoints_sg_id`
- Migration: `scripts/migrate-vpc-state.sh [--dry-run] <staging|prod>` backs up both
  states, imports the live resources into `module.vpc_{env}.*`, then prints (does not
  run) the `tofu state rm` commands for the source stack. The old
  `aws_security_group_rule.vpc_endpoints_ingress_app` is **removed but not re-imported**
  — callers must add their own ingress rules
- Expected first-apply drift after import: subnet `Tier` tag additions + endpoint SG
  description change (intentional)
- Not yet active: the `module "vpc" { source = "./modules/vpc" }` block in
  `docker-compose/opentofu/main.tf` is commented out, and no `apps/ark/*` stack
  consumes it yet

## VPC Endpoints
**Interface Endpoints** (~$50/mo, span all 3 private AZs):
- SSM (ssm, ssmmessages, ec2messages) - Session Manager access
- ECR (ecr.api, ecr.dkr) - Docker registry
- CloudWatch Logs - Session logging + container `awslogs` ingest

**Gateway Endpoint** (Free):
- S3 - ECR image layers

## Traffic Flow

**Ingress (cloudflared path, prod)**: Internet → Cloudflare → cloudflared → traefik → arkd

**Ingress (ALB path, staging + prod since 2026-05)**: Internet (or Cloudflare proxy for `staging-cf.*` / `prod-cf.*`) → shared ALB → arkd target groups (`arkdg-*` gRPC, `arkds-*` SSE, `arkdr-*` REST) on port 7070. Direct A-record hosts `staging.arkade.sh` / `prod.arkade.sh` alias to the ALB (Route53 zones in `aws/dev-438465126741/route53.tf` and `aws/prod-982590065524/route53.tf`). ALB idle timeout 180s (exceeds arkd 60s SSE heartbeat + Cloudflare 120s edge). ALB access + connection logs ship to `ark-logs-${env}-${account_id}` S3 bucket.

**Egress**: 
- AWS services → VPC endpoints (private, no NAT)
- Internet → NAT Gateway (public IPs, $0.045/GB)

**Internal**: Docker bridge network with DNS resolution

## Localhost Services (SSM Access Only)
- arkd admin (7071)
- traefik dashboard (8080)
- grafana (3333)

Access via: `aws ssm start-session --target $INSTANCE_ID --document-name AWS-StartPortForwardingSession`

Source: `${ARK_INFRA_REPO}/docker-compose/docs/04-networking.md`
