# Ark Simulator - AWS Deployment Guide

## Overview

AWS deployment enables large-scale load testing (50-200+ clients) by distributing client containers across AWS ECS Fargate. Each client runs in an isolated container with dedicated CPU resources, avoiding local resource contention and enabling realistic performance benchmarking.

## Architecture

**Components**:
- **ECS Fargate**: Runs containerized ark-clients (serverless containers)
- **ECR**: Hosts Docker images for client container
- **VPC**: Isolated network for ECS tasks
- **CloudWatch Logs**: Centralized logging for all clients
- **External Orchestrator**: Runs on Hetzner/DigitalOcean/VPS, manages ECS tasks

**Data Flow**:
1. Orchestrator web UI receives simulation config
2. Orchestrator spawns N ECS tasks (one per client)
3. Each client connects to Ark Server and orchestrator
4. Orchestrator coordinates client actions across rounds
5. Clients send logs to CloudWatch
6. Orchestrator collects results and displays in web UI

## Prerequisites

### AWS Account Requirements

- **AWS Account**: Active account with billing enabled
- **IAM Permissions**: Ability to create users, roles, policies
- **Service Quotas**: ECS Fargate CPU/RAM limits sufficient for client count
- **Region**: Choose region close to Ark Server (e.g., eu-central-1)

### External Orchestrator Host

- **VPS/Cloud Instance**: Hetzner, DigitalOcean, AWS EC2, or any Linux VM
- **Resources**: 2 CPU cores, 4 GB RAM minimum
- **Network**: Public IP with port 9000 accessible
- **Docker**: Docker Engine 20.10+ installed

### Local Development Machine

- **AWS CLI**: Installed and configured
- **Docker**: For building client images
- **Git**: For repository access

## AWS Infrastructure Setup

### 1. Deploy CloudFormation Stack

Navigate to CloudFormation template location:
```bash
cd ${ARK_SIMULATOR_REPO}/web/infra
```

Deploy via AWS Console:
1. Open AWS Console → CloudFormation → Create Stack
2. Upload template file: `cloudformation.yaml`
3. Stack name: `ark-simulator-infra`
4. Parameters: Use defaults or customize
5. Create stack and wait for completion (5-10 minutes)

Deploy via AWS CLI:
```bash
aws cloudformation create-stack \
  --stack-name ark-simulator-infra \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-central-1
```

### 2. Collect Stack Outputs

After stack creation completes, note these outputs (needed for .env):

```bash
aws cloudformation describe-stacks \
  --stack-name ark-simulator-infra \
  --region eu-central-1 \
  --query 'Stacks[0].Outputs'
```

Key outputs:
- **VPCId**: VPC identifier
- **SubnetIds**: Comma-separated subnet IDs (choose one for SUBNET_ID)
- **SecurityGroupId**: Security group for ECS tasks
- **ECRRepositoryUri**: ECR repository URI for client image
- **ECSClusterName**: ECS cluster name
- **ECSTaskExecutionRoleArn**: IAM role ARN for ECS task execution

## IAM User Configuration

### 1. GitHub Actions User (ECR Push)

Create IAM user for automated Docker image publishing:

```bash
aws iam create-user --user-name ark-simulator-github-ecr
```

Attach ECR push policy:
```bash
cat > ecr-push-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name ark-simulator-github-ecr \
  --policy-name ECRPushPolicy \
  --policy-document file://ecr-push-policy.json
```

Create access keys and save credentials:
```bash
aws iam create-access-key --user-name ark-simulator-github-ecr
```

Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub repo secrets.

### 2. Orchestrator User (ECS Management)

Create IAM user for orchestrator:

```bash
aws iam create-user --user-name ark-simulator-orchestrator
```

Attach ECS management policy:
```bash
cat > orchestrator-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:DescribeRepositories",
        "ecr:DescribeImages",
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:TagResource",
        "servicequotas:GetServiceQuota",
        "ec2:DescribeNetworkInterfaces"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/ark-simulator-ECSTaskExecutionRole-*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Replace ACCOUNT_ID with your AWS account ID
sed -i 's/ACCOUNT_ID/123456789012/g' orchestrator-policy.json

aws iam put-user-policy \
  --user-name ark-simulator-orchestrator \
  --policy-name OrchestratorPolicy \
  --policy-document file://orchestrator-policy.json
```

Create access keys:
```bash
aws iam create-access-key --user-name ark-simulator-orchestrator
```

Save these credentials for orchestrator `.env` file.

## Docker Image Publishing

### Option 1: GitHub Actions (Automated)

Push to main branch triggers automatic build and push to ECR:

```bash
git add web/client/
git commit -m "Update client implementation"
git push origin main
```

GitHub Actions workflow (`.github/workflows/publish-client-image.yml`) automatically builds and pushes to ECR when `web/client/**` changes.

### Option 2: Manual Push

Build and push client image manually:

```bash
cd ${ARK_SIMULATOR_REPO}

# Using Makefile
make push-to-ecr \
  AWS_ACCOUNT_ID=123456789012 \
  AWS_REGION=eu-central-1 \
  ECR_REPOSITORY_NAME=ark-client-repo
```

Or using script directly:
```bash
./script/build_and_push.sh \
  -a 123456789012 \
  -r eu-central-1 \
  -e ark-client-repo \
  -i arkclient \
  -d ./web/client \
  -c ../
```

Verify image in ECR:
```bash
aws ecr describe-images \
  --repository-name ark-client-repo \
  --region eu-central-1
```

## Orchestrator Configuration

### 1. Create Environment File

On orchestrator host, create `.env` file:

```bash
cd ${ARK_SIMULATOR_REPO}
cp .env.example .env
```

Edit `.env` with your values:

```bash
# AWS Credentials (from orchestrator IAM user)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1

# AWS Infrastructure (from CloudFormation outputs)
SUBNET_ID=subnet-0123456789abcdef0
SECURITY_GROUP_ID=sg-0123456789abcdef0

# Orchestrator Authentication
USERNAME=admin
PASSWORD=secure_random_password_here

# Orchestrator Public Endpoint
ORCHESTRATOR_URL=https://orchestrator.example.com:9000

# Optional: ECS Configuration
ECS_CLUSTER_NAME=ark-simulator-cluster
ECR_REPOSITORY_URI=123456789012.dkr.ecr.eu-central-1.amazonaws.com/ark-client-repo
```

**Security**: Ensure `.env` is not committed to git. File is in `.gitignore`.

### 2. Build and Run Orchestrator Container

Build orchestrator Docker image:
```bash
make build-web
```

Run orchestrator with environment file:
```bash
make run-web-docker
```

Verify orchestrator running:
```bash
curl http://localhost:9000/health
```

Expected response: `{"status": "ok"}`

### 3. Access Web UI

Open browser to orchestrator URL:
```
http://your-orchestrator-ip:9000
```

Login with credentials from `.env` (USERNAME/PASSWORD).

## Running AWS Simulations

### 1. Upload Configuration

In web UI:
1. Navigate to "Upload Simulation"
2. Select simulation file (e.g., `config/simulation_1_128.yaml`)
3. Review configuration summary
4. Click "Start Simulation"

### 2. Monitor Execution

Web UI displays:
- Current round number
- Active client count
- Per-client action status
- Real-time logs from CloudWatch

### 3. View Results

After completion:
- Summary statistics (round times, success/failure counts)
- Per-client balance verification
- Download detailed logs

### 4. Cleanup

Orchestrator automatically terminates ECS tasks after simulation completion. Verify cleanup:

```bash
aws ecs list-tasks \
  --cluster ark-simulator-cluster \
  --region eu-central-1
```

Should return empty list. If tasks remain, manually stop:

```bash
aws ecs stop-task \
  --cluster ark-simulator-cluster \
  --task TASK_ARN \
  --region eu-central-1
```

## Cost Optimization

### Resource Sizing

ECS Fargate pricing based on vCPU and memory:
- **Small client**: 0.25 vCPU, 512 MB RAM
- **Medium client**: 0.5 vCPU, 1 GB RAM

### Estimated Costs (eu-central-1)

**100 clients, 15-minute simulation**:
- ECS Fargate: ~$0.50
- ECR storage: ~$0.01/GB/month
- CloudWatch Logs: ~$0.50/GB ingested
- Data transfer: ~$0.09/GB (if applicable)

**Total**: $1-2 per simulation run

### Cost Reduction Tips

1. **Use spot capacity** (if ECS spot available in region)
2. **Minimize simulation duration**: Use efficient configurations
3. **Clean up ECR images**: Delete old images after testing
4. **Disable CloudWatch Logs** for non-critical runs
5. **Run during off-peak hours** (no pricing difference, but quota availability)

## Security Best Practices

1. **Rotate IAM credentials** every 90 days
2. **Use least-privilege policies**: Restrict Resource ARNs where possible
3. **Enable MFA** on AWS root account
4. **Secure orchestrator**: Use HTTPS, strong passwords, firewall rules
5. **Never commit .env**: Already in .gitignore, verify before push
6. **Monitor CloudTrail**: Review ECS/ECR API calls for anomalies

See `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/aws-deployment.md` for architecture details and `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/troubleshooting.md` for common AWS issues.
