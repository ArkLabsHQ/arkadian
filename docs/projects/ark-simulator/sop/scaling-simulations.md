# Scaling Simulations - SOP

## Purpose
Scale from local (5-20) to AWS (50-200+ clients).

## Decision Matrix

| Factor | Local (≤50) | AWS (50-200) |
|--------|-------------|--------------|
| Setup | 5 min | 60 min |
| Cost | Free | $1-5/run |
| Runtime | 1-30 min | 5-25 min |

**Local**: Dev, functional tests
**AWS**: Load tests, benchmarking

## Procedure 1: Scale Locally (5 → 50)

### Progressive Path
```bash
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation_1_20.yaml"   # 2-3m
make run ARGS="--sim config/simulation_1_32.yaml"   # 4-6m
make run ARGS="--sim config/simulation_1_40.yaml"   # 6-10m
make run ARGS="--sim config/simulation_1_50.yaml"   # 10-15m
```

**Monitor**: CPU <90%, no timeouts, sub-linear scaling

### Optimize
```bash
export ARKD_ROUND_INTERVAL=60
export ARKD_DB_TYPE=sqlite
export ARKD_LIVE_STORE_TYPE=inmemory
```

**Ceiling symptoms**: Times >3x, CPU 100%, timeouts
**Action**: AWS for >50 clients

## Procedure 2: Migrate to AWS

### Pre-Migration
- [ ] Local 20-30 test passes
- [ ] CloudFormation deployed
- [ ] IAM users created
- [ ] Image in ECR
- [ ] `.env` configured

Reference: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/aws-setup.md`

### Deploy
```bash
cd ${ARK_SIMULATOR_REPO}/web/infra

aws cloudformation create-stack \
  --stack-name ark-simulator-infra \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-central-1

aws cloudformation describe-stacks \
  --stack-name ark-simulator-infra \
  --query 'Stacks[0].Outputs'
```

### Configure
```bash
cd ${ARK_SIMULATOR_REPO}
cp .env.example .env
# Edit: AWS_ACCESS_KEY_ID, SUBNET_ID, SECURITY_GROUP_ID

make build-web
make run-web-docker
curl http://localhost:9000/health
```

### Execute
1. Open `http://orchestrator-ip:9000`
2. Login
3. Upload `simulation_1_50.yaml`
4. Start

## Procedure 3: Scale Up (50 → 200)

### Path
| Clients | Time | Cost |
|---------|------|------|
| 50 | 5-8m | $0.50 |
| 100 | 10-15m | $1-2 |
| 128 | 12-18m | $2 |
| 200 | 20-30m | $3-5 |

**Validate**: Completed, <1.3x baseline, no failures
**Stop if**: >2x time, >5% failures, quota hit

## Best Practices

### Configuration
Use 3-4 essential rounds. Prefer distributed (10→10) over broadcast (1→199)

### Server
```bash
export ARKD_ROUND_INTERVAL=90
export ARKD_ROUND_MAX_PARTICIPANTS_COUNT=200
export ARKD_DB_TYPE=postgres
```

### Cost
**Estimate**: 100 clients × $0.045/hr × 0.25hr ≈ $1.50-2.50
**Reduce**: Minimize runtime, right-size ECS (0.25 vCPU), delete old images

## Troubleshooting

**ECS Quota**:
```bash
aws service-quotas get-service-quota --service-code ecs --quota-code L-3032A538
```

**Slow Rounds**: Check arkd logs, increase ARKD_ROUND_INTERVAL, reduce clients

Reference: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/troubleshooting.md`
