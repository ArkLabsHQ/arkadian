# Ark Simulator - Usage Guide

## Overview

This guide provides practical instructions for running ark-simulator simulations, understanding output, and selecting appropriate configurations for different testing scenarios.

## Quick Start

### Basic Local Simulation

Run a simple 70-client simulation in single-process mode:

```bash
cd ${ARK_SIMULATOR_REPO}
make run ARGS="--sim config/simulation1.yaml"
```

This executes a complete simulation with:
- Round 1: 69 clients onboard with 0.00002 BTC each
- Round 2: All 69 clients send 0.00002 BTC to client_69
- Round 3: client_69 claims all pending payments
- Round 4: client_69 queries stats

Expected runtime: 2-5 minutes depending on hardware.

## Selecting Simulation Configurations

Pre-configured scenarios are located in `${ARK_SIMULATOR_REPO}/config/`:

### Functional Testing (Local)

**simulation1.yaml** - 70 clients, 4 rounds (broadcast pattern):
- Use for: Basic functional validation
- Client count: 70
- Pattern: Many-to-one payment flow
- Runtime: ~2-5 minutes

```bash
make run ARGS="--sim config/simulation1.yaml"
```

**simulation2.yaml** - Alternative functional scenario:
- Use for: Different action sequences
- Varies by configuration

```bash
make run ARGS="--sim config/simulation2.yaml"
```

### Scalability Testing (Local/AWS)

**Small Scale (5-20 clients)**:
```bash
make run ARGS="--sim config/simulation_1_20.yaml"
```
- Use for: Rapid iteration, CI/CD pipelines
- Runtime: 1-3 minutes local

**Medium Scale (32-50 clients)**:
```bash
make run ARGS="--sim config/simulation_1_32.yaml"
make run ARGS="--sim config/simulation_1_40.yaml"
make run ARGS="--sim config/simulation_1_50.yaml"
```
- Use for: Performance regression testing
- Runtime: 3-8 minutes local

**Large Scale (100-200 clients)** - AWS recommended:
```bash
# Local possible but slow
make run ARGS="--sim config/simulation_1_128.yaml"
make run ARGS="--sim config/simulation_1_170.yaml"
make run ARGS="--sim config/simulation_1_200.yaml"
```
- Use for: Capacity planning, bottleneck identification
- Runtime: 10-30+ minutes local, 5-15 minutes AWS

### Endurance Testing

**simulation_20.yaml** - 20 rounds:
```bash
make run ARGS="--sim config/simulation_20.yaml"
```
- Use for: Stability over multiple rounds

**simulation_60.yaml** - 60 rounds:
```bash
make run ARGS="--sim config/simulation_60.yaml"
```
- Use for: Long-duration reliability testing

## Understanding Simulation Output

### Console Output Structure

Simulation output follows this pattern:

```
[Orchestrator] Loading simulation from config/simulation1.yaml
[Orchestrator] Validating configuration against schema
[Orchestrator] Starting simulation with 70 clients, 4 rounds

[Round 1] Starting round 1
[client_0] Onboard: amount=0.00002 BTC
[client_1] Onboard: amount=0.00002 BTC
...
[Round 1] Waiting for Ark Server round finalization
[Round 1] Round 1 completed in 35s

[Round 2] Starting round 2
[client_0] SendAsync: amount=0.00002 BTC to=client_69
...
[Round 2] Round 2 completed in 42s

[Round 3] Starting round 3
[client_69] Claim: claimed 69 pending payments
[client_69] Balance: 0.00138 BTC (69 VTXOs)
[Round 3] Round 3 completed in 28s

[Simulation] Completed successfully in 3m 45s
```

### Key Metrics to Monitor

**Per-Round Completion Time**:
- Indicates server processing speed
- Increases with client count and VTXO tree depth
- Baseline: ~20-40s for 20 clients, 60-120s for 100+ clients

**Action Execution Status**:
- Success: Action completed without errors
- Failed: Error message with details (balance insufficient, network timeout, etc.)

**Balance Validation**:
- Verify expected balances after onboard/send/claim
- Flag unexpected discrepancies

## Reading Results

### Success Indicators

1. **No errors in logs**: All actions complete successfully
2. **Expected balances**: Balance queries match expected amounts
3. **Round completion**: All rounds finish within reasonable time
4. **Stats accuracy**: Server stats reflect correct transaction counts

### Failure Patterns

**Balance Exhaustion**:
```
[client_5] SendAsync: ERROR insufficient balance
```
- Solution: Increase initial_funding in config or reduce send amounts

**Timeout Errors**:
```
[Round 3] ERROR: timeout waiting for round finalization
```
- Solution: Check Ark Server logs, increase round interval

**Claim Failures**:
```
[client_10] Claim: ERROR no pending payments found
```
- Solution: Verify SendAsync executed in prior round, check recipient address

## Common Usage Patterns

### Pattern 1: One-to-Many Distribution

```yaml
rounds:
  - number: 1
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.01
  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0001
          to: "client_1"
        - type: "SendAsync"
          amount: 0.0001
          to: "client_2"
```

### Pattern 2: Many-to-One Collection

```yaml
rounds:
  - number: 1
    actions:
      client_0: [{ type: "Onboard", amount: 0.001 }]
      client_1: [{ type: "Onboard", amount: 0.001 }]
  - number: 2
    actions:
      client_0: [{ type: "SendAsync", amount: 0.0005, to: "client_10" }]
      client_1: [{ type: "SendAsync", amount: 0.0005, to: "client_10" }]
  - number: 3
    actions:
      client_10: [{ type: "Claim" }]
```

### Pattern 3: Round-Robin Transfer

Multiple clients exchanging payments across rounds.

## Performance Expectations

### Local Deployment

- **5-20 clients**: 1-3 minutes total
- **20-50 clients**: 3-10 minutes total
- **50-100 clients**: 10-30 minutes total
- **100+ clients**: 20-60+ minutes (AWS recommended)

### AWS Deployment

- **50-100 clients**: 5-15 minutes total
- **100-200 clients**: 10-25 minutes total
- **200+ clients**: 25-40 minutes total

Factors affecting runtime:
- CPU resources (signing operations are expensive)
- Round interval setting on Ark Server
- VTXO tree depth (exponential with participants)
- Network latency (AWS only)

## Tips and Best Practices

1. **Start small**: Test with 5-10 clients before scaling up
2. **Validate incrementally**: Use Balance actions after state changes
3. **Monitor server logs**: Run `docker logs -f arkd` in separate terminal
4. **Allow settling time**: Wait 10-20s between stopping/starting simulations
5. **Check Bitcoin regtest**: Ensure Nigiri is running and responsive
6. **Pre-mine blocks**: Mine several blocks before simulation for buffer

See `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/configuration.md` for detailed configuration syntax and options.
