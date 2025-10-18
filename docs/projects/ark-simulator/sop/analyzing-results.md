# Analyzing Simulation Results - SOP

## Purpose
Read, interpret, and extract insights from simulation results.

Reference: `${ARKADIAN_DIR}/docs/projects/ark-simulator/testing/usage.md`

## Procedure: Analyze Results

### 1. Verify Completion
```bash
tail -50 simulation.log
# Look for: [Simulation] Completed successfully in 3m 45s
```

**Checklist**:
- [ ] "Completed successfully" present
- [ ] No ERROR messages
- [ ] Reasonable runtime

### 2. Extract Round Timings
```
[Round 1] Round 1 completed in 35s
[Round 2] Round 2 completed in 42s
[Round 3] Round 3 completed in 28s
```

**Build table**:
| Round | Actions | Time | Status |
|-------|---------|------|--------|
| 1 | 69 Onboards | 35s | OK |
| 2 | 99 SendAsync | 42s | OK |
| 3 | 99 Claims | 28s | OK |

**Expected**: Onboard 20-60s, Transfer 30-90s, Claim 20-50s (20-100 clients)
**Red flags**: >2x baseline, exponential slowdown

### 3. Validate Actions
```bash
grep "Onboard" simulation.log | wc -l
grep "ERROR" simulation.log | wc -l
```

**Acceptance**: ≥99% success rate

### 4. Verify Balances
```
[client_0] Balance: 0.00260 BTC (5 VTXOs)
```

Calculate expected:
```
client_0:
  Onboard:   +0.00300
  SendAsync: -0.00200
  Fees:      ~0.00005
  Expected:  ~0.00095
```

**Checklist**:
- [ ] Within ±0.0001 BTC
- [ ] No negative balances

### 5. Compare Baselines
| Config | Clients | Total | R1 | R2 | R3 |
|--------|---------|-------|----|----|-----|
| simulation_1_20 | 20 | 2m15s | 25s | 35s | 20s |
| simulation_1_50 | 50 | 6m30s | 55s | 80s | 45s |
| simulation_1_100 | 100 | 18m45s | 120s | 180s | 95s |

**Performance ratio**: Current / Baseline
- <1.1x: Excellent
- 1.1-1.3x: Acceptable
- >1.3x: Investigate

### 6. Identify Bottlenecks

**CPU-bound**: CPU >80%, exponential scaling, signing dominates
**Memory-bound**: Memory grows, swap usage, unresponsive
**Network-bound**: Connection errors, latency, timeouts

### 7. Generate Report
```markdown
# Test Report

**Date**: 2025-10-15
**Config**: simulation_1_50.yaml
**Environment**: Local

## Summary
- Status: ✅ PASS
- Time: 6m 42s
- Clients: 50
- Success: 99.8%

## Performance
| Round | Time | Status |
|-------|------|--------|
| 1 | 58s | OK |
| 2 | 82s | OK |
| 3 | 47s | OK |

## Issues
- 1 balance error

## Recommendations
- Increase initial_funding
- Baseline acceptable
```

Next: `${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/scaling-simulations.md`
