# Ark Simulator - Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when running ark-simulator in local and AWS deployments.

## Local Deployment Issues

### Nigiri Connection Failures

**Symptom**:
```
[Orchestrator] ERROR: failed to connect to Bitcoin regtest
```

**Diagnosis**:
```bash
# Check if Nigiri is running
docker ps | grep nigiri

# Test Esplora API
curl http://localhost:3000/api/blocks/tip/height

# Test Bitcoin RPC
curl --user admin:admin --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockchaininfo","params":[]}' http://localhost:18443
```

**Solutions**:
1. Start Nigiri if not running:
   ```bash
   nigiri start
   ```

2. Reset Nigiri if corrupted:
   ```bash
   nigiri stop
   nigiri start --delete
   ```

3. Check port conflicts:
   ```bash
   lsof -i :3000   # Esplora
   lsof -i :18443  # Bitcoin RPC
   ```

### Ark Server Connection Failures

**Symptom**:
```
[client_0] ERROR: failed to connect to Ark Server: connection refused
```

**Diagnosis**:
```bash
# Check arkd running
ps aux | grep arkd

# Test gRPC endpoint
grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo

# Check arkd logs
tail -f /tmp/arkd.log
```

**Solutions**:
1. Verify arkd running:
   ```bash
   cd ${ARKD_REPO}
   make run-light
   ```

2. Check configuration:
   ```bash
   echo $ARKD_PORT
   echo $ARKD_ESPLORA_URL
   ```

3. Verify wallet connected:
   ```bash
   # Check wallet logs
   tail -f /tmp/arkd-wallet.log
   ```

### Balance Insufficient Errors

**Symptom**:
```
[client_5] SendAsync: ERROR insufficient balance (have: 0.0001, need: 0.0002)
```

**Diagnosis**:
Check client's previous actions and balance:
```yaml
# Review client's onboarding amount in config
clients:
  - id: "client_5"
    initial_funding: 0.0001  # Too low for subsequent sends
```

**Solutions**:
1. Increase `initial_funding` in configuration:
   ```yaml
   clients:
     - id: "client_5"
       initial_funding: 0.001  # 10x increase
   ```

2. Reduce send amounts:
   ```yaml
   rounds:
     - number: 2
       actions:
         client_5:
           - type: "SendAsync"
             amount: 0.00005  # Reduced from 0.0002
   ```

3. Add Balance action to verify state:
   ```yaml
   rounds:
     - number: 1
       actions:
         client_5:
           - type: "Onboard"
             amount: 0.001
           - type: "Balance"  # Check after onboard
   ```

### Round Timeout Errors

**Symptom**:
```
[Round 3] ERROR: timeout waiting for round finalization (waited 120s)
```

**Diagnosis**:
```bash
# Check arkd round settings
echo $ARKD_ROUND_INTERVAL

# Check arkd logs for errors
tail -50 /tmp/arkd.log | grep ERROR

# Check CPU usage
top -pid $(pgrep arkd)
```

**Solutions**:
1. Increase arkd round interval:
   ```bash
   export ARKD_ROUND_INTERVAL=60  # Increase from 30s
   ```

2. Reduce client count in simulation:
   ```bash
   # Use smaller config
   make run ARGS="--sim config/simulation_1_20.yaml"
   ```

3. Check for arkd errors in logs and resolve

### Schema Validation Errors

**Symptom**:
```
[Orchestrator] ERROR: configuration validation failed: field 'clients[5].id' does not match pattern
```

**Diagnosis**:
Review simulation YAML against schema requirements.

**Common Issues and Fixes**:

1. **Invalid client ID format**:
   ```yaml
   # Wrong
   clients:
     - id: "client-5"  # Hyphen not allowed

   # Correct
   clients:
     - id: "client_5"  # Underscore required
   ```

2. **Non-sequential round numbers**:
   ```yaml
   # Wrong
   rounds:
     - number: 1
     - number: 3  # Skipped 2

   # Correct
   rounds:
     - number: 1
     - number: 2
     - number: 3
   ```

3. **SendAsync to non-existent client**:
   ```yaml
   # Wrong
   rounds:
     - number: 2
       actions:
         client_0:
           - type: "SendAsync"
             to: "client_99"  # Not in clients array

   # Correct: Ensure recipient exists
   clients:
     - id: "client_99"
   ```

## AWS Deployment Issues

### ECR Authentication Failures

**Symptom**:
```
Error: Cannot perform an interactive login from a non TTY device
```

**Diagnosis**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check ECR permissions
aws ecr describe-repositories --region eu-central-1
```

**Solutions**:
1. Re-authenticate to ECR:
   ```bash
   aws ecr get-login-password --region eu-central-1 | \
     docker login --username AWS --password-stdin \
     123456789012.dkr.ecr.eu-central-1.amazonaws.com
   ```

2. Verify IAM user has ECR permissions:
   ```bash
   aws iam get-user-policy \
     --user-name ark-simulator-github-ecr \
     --policy-name ECRPushPolicy
   ```

### ECS Task Launch Failures

**Symptom**:
```
[Orchestrator] ERROR: failed to launch ECS task: InvalidParameterException
```

**Diagnosis**:
```bash
# Check ECS cluster exists
aws ecs describe-clusters \
  --clusters ark-simulator-cluster \
  --region eu-central-1

# Check task definition
aws ecs describe-task-definition \
  --task-definition ark-client \
  --region eu-central-1

# Check recent task failures
aws ecs describe-tasks \
  --cluster ark-simulator-cluster \
  --tasks TASK_ARN \
  --region eu-central-1
```

**Solutions**:
1. Verify subnet and security group IDs in `.env`:
   ```bash
   aws ec2 describe-subnets --subnet-ids subnet-xxxxx
   aws ec2 describe-security-groups --group-ids sg-xxxxx
   ```

2. Check ECS service quotas:
   ```bash
   aws service-quotas get-service-quota \
     --service-code ecs \
     --quota-code L-3032A538 \
     --region eu-central-1
   ```

3. Review IAM PassRole permission for task execution role

### Client Container Crashes

**Symptom**:
```
[client_5] Status: STOPPED (Exit code: 1)
```

**Diagnosis**:
```bash
# Get CloudWatch log stream
aws logs describe-log-streams \
  --log-group-name /ecs/ark-client \
  --region eu-central-1

# View container logs
aws logs get-log-events \
  --log-group-name /ecs/ark-client \
  --log-stream-name ecs/ark-client/TASK_ID \
  --region eu-central-1
```

**Solutions**:
1. Review CloudWatch logs for error messages
2. Verify client image is correct version:
   ```bash
   aws ecr describe-images \
     --repository-name ark-client-repo \
     --region eu-central-1
   ```
3. Test image locally before AWS deployment:
   ```bash
   docker pull 123456789012.dkr.ecr.eu-central-1.amazonaws.com/ark-client-repo:latest
   docker run --rm ark-client:latest --help
   ```

### Orchestrator Connection Issues

**Symptom**:
```
[client_10] ERROR: failed to connect to orchestrator
```

**Diagnosis**:
```bash
# Check orchestrator running
docker ps | grep ark-web

# Check orchestrator logs
docker logs $(docker ps -q -f name=ark-web)

# Test orchestrator endpoint
curl http://ORCHESTRATOR_IP:9000/health
```

**Solutions**:
1. Verify ORCHESTRATOR_URL in `.env` is publicly accessible:
   ```bash
   # From external machine
   curl http://your-orchestrator-ip:9000/health
   ```

2. Check firewall rules allow port 9000:
   ```bash
   # On orchestrator host
   sudo ufw status
   sudo ufw allow 9000/tcp
   ```

3. Ensure security group allows inbound on port 9000

## Performance Issues

### Simulation Running Slowly

**Symptom**:
Rounds taking significantly longer than expected (>2x baseline).

**Diagnosis**:
```bash
# Check CPU usage
top -pid $(pgrep -f "ark")

# Check memory usage
ps aux | grep ark

# Monitor arkd performance
curl http://localhost:7070/metrics  # If Prometheus enabled
```

**Solutions**:
1. **Reduce client count**:
   ```bash
   # Switch to smaller config
   make run ARGS="--sim config/simulation_1_20.yaml"
   ```

2. **Increase arkd round interval**:
   ```bash
   export ARKD_ROUND_INTERVAL=60  # More time per round
   ```

3. **Use AWS deployment** for large simulations (>50 clients)

4. **Optimize system resources**:
   ```bash
   # Close unnecessary applications
   # Allocate more CPU cores to Docker (if using Docker arkd)
   ```

### High Memory Usage

**Symptom**:
System memory exhausted during simulation.

**Diagnosis**:
```bash
# Check memory usage per process
ps aux --sort=-%mem | head -20

# Check system memory
free -h
```

**Solutions**:
1. Use lighter arkd configuration:
   ```bash
   export ARKD_DB_TYPE=sqlite
   export ARKD_LIVE_STORE_TYPE=inmemory
   ```

2. Reduce concurrent clients in config

3. Increase system swap space

## Debugging Tips

### Enable Verbose Logging

**Ark Server**:
```bash
export ARKD_LOG_LEVEL=debug
make run-light
```

**Simulator**:
```bash
make run ARGS="--sim config/simulation1.yaml --verbose"
```

### Capture Full Logs

```bash
# Redirect all output to file
make run ARGS="--sim config/simulation1.yaml" 2>&1 | tee simulation-debug.log
```

### Isolate Components

Test each component independently:

1. **Bitcoin regtest**:
   ```bash
   curl http://localhost:3000/api/blocks/tip/height
   ```

2. **Ark Server**:
   ```bash
   grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo
   ```

3. **Single client** (manual test):
   ```bash
   ./build/client --id client_0 --action Onboard --amount 0.001
   ```

### Check Version Compatibility

Ensure all components use compatible versions:

```bash
# Ark Server version
cd ${ARKD_REPO}
git log -1 --oneline

# Simulator version
cd ${ARK_SIMULATOR_REPO}
git log -1 --oneline

# go-sdk version
cd ${ARK_SIMULATOR_REPO}
go list -m github.com/arkade-os/go-sdk
```

Update go-sdk if needed:
```bash
cd ${ARK_SIMULATOR_REPO}
make update-go-sdk
```

## Getting Help

If issues persist after troubleshooting:

1. **Review system documentation**:
   - `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/project_overview.md`
   - `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/architecture.md`

2. **Check Ark Server documentation**:
   - `${ARKD_REPO}CLAUDE.md`
   - `.claude/` directory for detailed guides

3. **Collect diagnostic information**:
   - Simulation configuration file
   - Full log output from all components
   - System specs (CPU, RAM, OS version)
   - Version information (arkd, simulator, go-sdk)

4. **Contact maintainers** with diagnostic bundle
