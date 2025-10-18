# Ark Simulator - AWS Deployment

## Overview

AWS deployment enables large-scale, production-realistic load testing by distributing client execution across containerized ECS (Fargate) tasks with dedicated CPU and memory resources. This architecture overcomes the CPU bottleneck inherent in local deployments, particularly for signing-intensive operations that dominate as VTXO trees grow with participant counts. The deployment uses CloudFormation for infrastructure as code, ECR for Docker image storage, and an external orchestrator (running on any VPS or cloud provider) that manages ECS task lifecycle via AWS SDK.

## AWS Architecture Components

### Infrastructure Services

**VPC (Virtual Private Cloud)**:
- Isolated network environment with CIDR block 10.0.0.0/16
- Contains subnet, security groups, and internet gateway
- Provides network isolation for client tasks

**Subnet**:
- Public subnet with CIDR 10.0.1.0/24
- Availability zone configurable (default: eu-central-1a)
- Auto-assigns public IPs for outbound internet access
- Connected to internet gateway via route table

**Security Group**:
- Ingress rules: TCP ports 9000 (orchestrator UI), 22 (SSH)
- Egress rules: All traffic allowed (0.0.0.0/0) for client-server communication
- Applied to ECS tasks and orchestrator instance

**Internet Gateway**:
- Enables ECS tasks to communicate with external Ark Server
- Attached to VPC with route table directing 0.0.0.0/0 traffic

**ECS Cluster**:
- Fargate launch type for serverless container execution
- Named "OrchestratorCluster"
- No EC2 instance management required
- Scales automatically based on task count

**ECR Repository**:
- Named "ark-client-repo"
- Stores versioned Docker images for client containers
- Lifecycle policy recommended to limit image retention (e.g., keep last 10 images)
- URI format: `<account-id>.dkr.ecr.<region>.amazonaws.com/ark-client-repo`

**CloudWatch Logs**:
- Log group: `/ecs/ClientContainer`
- Retention: 7 days (configurable)
- Streams logs from all client tasks
- Queryable via CloudWatch Insights or AWS CLI

**ECS Task Definition**:
- Family: ClientTaskDefinition
- Launch type: Fargate
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB (2 GB)
- Network mode: awsvpc (required for Fargate)
- Execution role: ECSTaskExecutionRole with ECR and CloudWatch permissions

### IAM Roles and Policies

**ECSTaskExecutionRole**:
- Allows ECS service to pull images from ECR and write logs to CloudWatch
- Managed policy: `AmazonECSTaskExecutionRolePolicy`
- Custom policy for CloudWatch Logs write access

**Task Execution Role Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/ClientContainer:*"
    }
  ]
}
```

**Orchestrator IAM User/Role**:
The orchestrator requires an IAM user (or role if running on AWS EC2) with the following permissions:

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
        "ecr:DescribeRepositories",
        "ecr:DescribeImages"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:TagResource"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "servicequotas:GetServiceQuota",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/ark-simulator-ECSTaskExecutionRole-*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "iam:AWSServiceName": "ecs.amazonaws.com"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeNetworkInterfaces"
      ],
      "Resource": "*"
    }
  ]
}
```

Replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID. For production, restrict `Resource` fields to specific ARNs.

**GitHub Actions IAM User** (for ECR publishing):

```json
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
```

## CloudFormation Template

The complete infrastructure is defined in `${ARK_SIMULATOR_REPO}/web/infra/cloudformation.yaml`.

### Key CloudFormation Resources

**Parameters**:
- `VpcCIDR`: Default 10.0.0.0/16
- `SubnetCIDR`: Default 10.0.1.0/24
- `AvailabilityZone`: Default eu-central-1a

**Outputs**:
- `VPCID`: VPC identifier for reference
- `SubnetID`: Required for ECS task networking (set as `SUBNET_ID` env var)
- `SecurityGroupID`: Required for ECS task security (set as `SECURITY_GROUP_ID` env var)
- `ECRRepositoryURI`: Full ECR image URI for client Docker image

### Deployment Steps

1. **Deploy CloudFormation Stack**:
```bash
aws cloudformation create-stack \
  --stack-name ark-simulator-infra \
  --template-body file://web/infra/cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --region eu-central-1
```

2. **Wait for Stack Completion**:
```bash
aws cloudformation wait stack-create-complete \
  --stack-name ark-simulator-infra \
  --region eu-central-1
```

3. **Retrieve Stack Outputs**:
```bash
aws cloudformation describe-stacks \
  --stack-name ark-simulator-infra \
  --query 'Stacks[0].Outputs' \
  --region eu-central-1
```

Note the `SubnetID`, `SecurityGroupID`, and `ECRRepositoryURI` values for environment variable configuration.

## Docker Image Build and Publishing

### Automated GitHub Actions Publishing

The repository includes a GitHub Actions workflow (`.github/workflows/publish-client-image.yml`) that automatically builds and pushes the client Docker image to ECR on pushes to `main` affecting:
- `web/client/**` (client code changes)
- `.github/workflows/publish-client-image.yml` (workflow changes)

**Setup GitHub Actions**:

1. Create IAM user with ECR push policy (see IAM section above)
2. Generate access key and secret for the user
3. Add GitHub repository secrets:
   - Navigate to: Repository → Settings → Secrets and variables → Actions
   - Add secret: `AWS_ACCESS_KEY_ID` = IAM user access key
   - Add secret: `AWS_SECRET_ACCESS_KEY` = IAM user secret key
4. Update workflow file with correct AWS region (if not eu-central-1)
5. Push changes to main branch to trigger build

### Manual Docker Image Build

Alternatively, build and push the client image manually using the Makefile:

```bash
# Build and push to ECR (default repository: ark-client-repo)
make push-to-ecr \
  AWS_ACCOUNT_ID=123456789012 \
  AWS_REGION=eu-central-1

# Build locally without pushing (for testing)
make build-client \
  AWS_ACCOUNT_ID=123456789012 \
  AWS_REGION=eu-central-1

# Customize ECR repository and image name
make push-to-ecr \
  AWS_ACCOUNT_ID=123456789012 \
  AWS_REGION=eu-central-1 \
  ECR_REPOSITORY_NAME=my-custom-repo \
  IMAGE_NAME=my-arkclient
```

**Makefile Variables (with defaults from `${ARK_SIMULATOR_REPO}/Makefile`)**:
- `ECR_REPOSITORY_NAME` (default: `ark-client-repo`)
- `IMAGE_NAME` (default: `arkclient`)
- `DOCKERFILE_PATH` (default: `./web/client`)
- `BUILD_CONTEXT` (default: `../`)

The Makefile target invokes `${ARK_SIMULATOR_REPO}/script/build_and_push.sh` which:
1. Authenticates Docker with ECR using `aws ecr get-login-password`
2. Builds the Docker image from `web/client/Dockerfile` with parent directory context
3. Tags the image with `:latest` and `:$(git rev-parse --short HEAD)`
4. Pushes both tags to ECR

**Manual Script Invocation**:
```bash
./script/build_and_push.sh \
  -a 123456789012 \
  -r eu-central-1 \
  -e ark-client-repo \
  -i arkclient \
  -d ./web/client \
  -c ../ \
  [--no-push]  # Optional: build only, don't push
```

**Build Context Note**: The build context is set to parent directory (`../`) because the client Dockerfile needs access to the go-sdk dependencies and shared code from the project root.

## Orchestrator Setup

The orchestrator runs externally on any VPS or cloud provider (Hetzner, DigitalOcean, AWS EC2, etc.) and manages AWS ECS tasks remotely.

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# AWS Credentials (IAM user with orchestrator permissions)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1

# AWS Infrastructure IDs (from CloudFormation outputs)
SUBNET_ID=subnet-0abc123def456789
SECURITY_GROUP_ID=sg-0xyz789abc123456

# Orchestrator Authentication
USERNAME=admin
PASSWORD=change_this_password

# Orchestrator Public Endpoint (for client HTTP callbacks)
ORCHESTRATOR_URL=http://orchestrator.example.com:9000
```

**Important**:
- Replace with actual values from CloudFormation outputs
- Use a strong password for production deployments
- `ORCHESTRATOR_URL` must be publicly accessible from ECS tasks
- Never commit `.env` file to version control

### Running the Orchestrator

**Using Docker (Recommended)**:
```bash
# Build and run orchestrator container
make run-web-docker
```

This command:
1. Builds Docker image from `web/Dockerfile`
2. Runs container with port 9000 exposed
3. Loads environment variables from `.env` file
4. Starts web server with UI at `http://localhost:9000`

**Direct Go Execution** (for development):
```bash
# Set environment variables
export $(cat .env | xargs)

# Run orchestrator
go run web/main.go
```

### Orchestrator Web UI

Access the orchestrator at `http://<orchestrator-host>:9000`:

1. **Login**: Enter USERNAME and PASSWORD from environment variables
2. **Upload Configuration**: Select a simulation YAML file (e.g., `config/simulation.yaml`)
3. **Start Simulation**: Click "Start" to launch ECS tasks
4. **Monitor Progress**: View real-time client status and logs
5. **View Results**: Review summary statistics after completion

The UI provides:
- Client connection status (pending, running, completed, failed)
- Real-time action execution progress
- Aggregated success/failure counts
- CloudWatch log links for debugging

## ECS Task Execution Flow

1. **Orchestrator Initialization**:
   - Reads simulation YAML file
   - Validates configuration against schema
   - Determines number of clients needed

2. **Task Creation**:
   - For each client, orchestrator calls AWS ECS `RunTask` API
   - Specifies task definition, subnet, security group, and environment variables
   - ECS schedules tasks on Fargate infrastructure

3. **Container Startup**:
   - Fargate pulls client image from ECR (using task execution role)
   - Container starts with environment variables:
     - `CLIENT_ID`: Client identifier (e.g., "client_0")
     - `ORCHESTRATOR_URL`: Callback endpoint
     - `ARK_SERVER_URL`: Ark Server gRPC endpoint
   - Client registers with orchestrator via HTTP callback

4. **Action Execution**:
   - Orchestrator sends action lists to clients for each round
   - Clients execute actions and report results via HTTP callbacks
   - CloudWatch captures all stdout/stderr logs

5. **Task Termination**:
   - After simulation completes, orchestrator calls `StopTask` API
   - Containers gracefully shut down
   - Logs remain in CloudWatch for analysis

## Networking and Connectivity

### Security Group Rules

**Ingress**:
- Port 9000 TCP: Orchestrator web UI and client callbacks (source: 0.0.0.0/0)
- Port 22 TCP: SSH access for orchestrator instance debugging (source: restrict to your IP)

**Egress**:
- All protocols, all ports, all destinations (0.0.0.0/0) for:
  - Client-to-Ark Server gRPC communication
  - Client-to-orchestrator HTTP callbacks
  - ECR image pulls
  - CloudWatch log writes

### Public IP Requirements

- **ECS Tasks**: Assigned public IPs via subnet configuration (`MapPublicIpOnLaunch: true`)
- **Orchestrator**: Must have public IP or domain for ECS task callbacks
- **Ark Server**: Must have publicly accessible gRPC endpoint (can be external to AWS)

### DNS and Service Discovery

For production deployments, consider:
- Route 53 for orchestrator domain name (e.g., orchestrator.ark-simulator.com)
- TLS/SSL certificate for HTTPS orchestrator access
- VPC PrivateLink or VPN for secure Ark Server communication (if private)

## Monitoring and Logging

### CloudWatch Logs

All client container output is streamed to CloudWatch Logs:

**Log Group**: `/ecs/ClientContainer`
**Log Streams**: One per ECS task (named with task ID)

**Querying Logs**:
```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name /ecs/ClientContainer \
  --region eu-central-1

# Tail recent logs
aws logs tail /ecs/ClientContainer \
  --follow \
  --region eu-central-1

# Query logs with Insights
aws logs start-query \
  --log-group-name /ecs/ClientContainer \
  --start-time $(date -u +%s --date='-1 hour') \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc' \
  --region eu-central-1
```

### ECS Task Metrics

Monitor task health via CloudWatch metrics:
- `CPUUtilization`: Should remain under 80% for healthy tasks
- `MemoryUtilization`: Monitor for memory leaks
- `TaskCount`: Number of running tasks should match client count

### Cost Monitoring

Use AWS Cost Explorer to track:
- ECS Fargate compute costs (per vCPU-hour and GB-hour)
- ECR storage costs (per GB per month)
- CloudWatch Logs storage and ingestion costs
- Data transfer costs (egress from ECS tasks)

Estimated costs for 100-client, 1-hour simulation:
- ECS Fargate: ~$4.00 (100 tasks × 1 vCPU × 1 hour × $0.04048)
- ECR storage: ~$0.10/month (1 GB image)
- CloudWatch Logs: ~$0.50 (500 MB ingestion)
- Total: ~$5-10 per simulation

## Troubleshooting

### Common Issues

**Tasks fail to start**:
- Check IAM role permissions (ECSTaskExecutionRole)
- Verify ECR image exists with `:latest` tag
- Ensure subnet has route to internet gateway
- Review CloudWatch log group exists and is accessible

**Clients can't reach orchestrator**:
- Verify `ORCHESTRATOR_URL` is publicly accessible
- Check security group allows ingress on port 9000
- Ensure orchestrator is running and healthy
- Test with `curl http://<orchestrator-url>:9000/health`

**Clients can't reach Ark Server**:
- Verify Ark Server endpoint is correct and publicly accessible
- Check security group allows egress to Ark Server port (typically 7070)
- Test with `grpcurl` from a client task

**High costs**:
- Ensure tasks are stopped after simulation completes
- Check for orphaned tasks: `aws ecs list-tasks --cluster OrchestratorCluster`
- Stop manually: `aws ecs stop-task --cluster OrchestratorCluster --task <task-arn>`
- Reduce task CPU/memory if not fully utilized

**Image pull errors**:
- Verify ECR repository policy allows task execution role to pull images
- Check image exists: `aws ecr describe-images --repository-name ark-client-repo`
- Re-push image if missing or corrupted

### Debug Commands

**List running tasks**:
```bash
aws ecs list-tasks \
  --cluster OrchestratorCluster \
  --region eu-central-1
```

**Describe task details**:
```bash
aws ecs describe-tasks \
  --cluster OrchestratorCluster \
  --tasks <task-arn> \
  --region eu-central-1
```

**View task logs**:
```bash
aws logs get-log-events \
  --log-group-name /ecs/ClientContainer \
  --log-stream-name <stream-name> \
  --region eu-central-1
```

**Stop all tasks** (emergency):
```bash
aws ecs list-tasks --cluster OrchestratorCluster --region eu-central-1 --query 'taskArns[]' --output text | \
  xargs -n1 aws ecs stop-task --cluster OrchestratorCluster --region eu-central-1 --task
```

## Security Best Practices

1. **Least Privilege IAM**: Restrict IAM policies to specific resources (replace `*` with ARNs)
2. **Secrets Management**: Use AWS Secrets Manager for sensitive environment variables
3. **Network Isolation**: Use private subnets with NAT gateway for production (not public IPs)
4. **TLS Encryption**: Enable HTTPS for orchestrator with valid certificates
5. **Credential Rotation**: Rotate IAM access keys every 90 days
6. **Security Group Hardening**: Restrict port 22 to your IP, consider removing entirely
7. **VPC Flow Logs**: Enable for network traffic auditing
8. **CloudTrail**: Enable for API call logging and compliance

## Deployment Comparison

| Aspect | Local Deployment | AWS Deployment |
|--------|------------------|----------------|
| **Setup Complexity** | Low (single command) | High (CloudFormation, IAM, Docker) |
| **Client Scaling** | 5-20 clients | 50-200+ clients |
| **CPU Isolation** | Shared (bottleneck) | Dedicated per client |
| **Cost** | Free | $5-50 per simulation |
| **Startup Time** | <1 second | 30-60 seconds |
| **Debugging** | Easy (local logs) | Moderate (CloudWatch) |
| **Realistic Load** | Low | High |
| **Network Latency** | Minimal (<1ms) | Realistic (10-50ms) |
| **Production Readiness** | Development/testing | Pre-production validation |

Choose local for rapid iteration and functional testing, AWS for scale and production readiness validation.
