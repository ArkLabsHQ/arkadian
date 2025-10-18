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
- **Public subnets**: NAT Gateway only (no compute)
- **Private subnets**: EC2, RDS, Redis (all application resources)
- **Multi-AZ**: Resources span 2 availability zones

## Security Groups
1. **app_sg**: EC2 instance (self-referential + VPC endpoints)
2. **rds_sg**: PostgreSQL (port 5432 from app_sg only)
3. **redis_sg**: ElastiCache (port 6379 from app_sg only)
4. **vpc_endpoints_sg**: Private endpoints (port 443 from app_sg)

## VPC Endpoints
**Interface Endpoints** (~$50/mo):
- SSM (ssm, ssmmessages, ec2messages) - Session Manager access
- ECR (ecr.api, ecr.dkr) - Docker registry
- CloudWatch Logs - Session logging

**Gateway Endpoint** (Free):
- S3 - ECR image layers

## Traffic Flow

**Ingress**: Internet → Cloudflare → cloudflared → traefik → arkd

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
