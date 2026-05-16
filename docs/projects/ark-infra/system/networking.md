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
   add their own rules without causing plan drift

## VPC Endpoints
**Interface Endpoints** (~$50/mo, span all 3 private AZs):
- SSM (ssm, ssmmessages, ec2messages) - Session Manager access
- ECR (ecr.api, ecr.dkr) - Docker registry
- CloudWatch Logs - Session logging + container `awslogs` ingest

**Gateway Endpoint** (Free):
- S3 - ECR image layers

## Traffic Flow

**Ingress (cloudflared path, prod)**: Internet → Cloudflare → cloudflared → traefik → arkd

**Ingress (ALB path, staging+ since 2026-05)**: Internet (or Cloudflare proxy for `staging-cf.*`) → shared ALB → arkd target groups (`arkdg-*` gRPC, `arkds-*` SSE, `arkdr-*` REST) on port 7070. ALB idle timeout 180s (exceeds arkd 60s SSE heartbeat + Cloudflare 120s edge). ALB access + connection logs ship to `ark-logs-${env}-${account_id}` S3 bucket.

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
