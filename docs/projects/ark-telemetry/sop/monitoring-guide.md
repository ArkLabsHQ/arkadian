# Monitoring Best Practices - SOP

## Overview

This guide provides operational best practices for monitoring Ark services using the ark-telemetry stack. It covers daily monitoring workflows, incident response, and optimization strategies.

**Reference Documentation:**
- Alert Rules: `/docs/projects/ark-telemetry/system/alert-rules.md`
- Dashboards: `/docs/projects/ark-telemetry/system/dashboards.md`
- Components: `/docs/projects/ark-telemetry/system/components.md`

## Daily Monitoring Workflow

### Morning Health Check (5 minutes)

**Check dashboard overview:**

1. Navigate to Host Metrics dashboard: http://localhost:3333
2. Verify auto-refresh is enabled (30s recommended)
3. Review key indicators:

**System Health Indicators:**

- [ ] **CPU Usage**: <70% sustained (red threshold: 80%)
- [ ] **Memory Usage**: <80% (red threshold: 85%)
- [ ] **Disk Usage**: <85% (red threshold: 90%)
- [ ] **Network I/O**: Normal pattern, no anomalies
- [ ] **Disk I/O**: Consistent read/write rates

**Application Health Indicators:**

- [ ] **Goroutine Count**: Stable or slowly increasing (alert if >10,000)
- [ ] **Heap Memory**: Stable or sawtooth pattern (GC working properly)
- [ ] **GC Cycles**: Regular intervals, no excessive frequency
- [ ] **RPC Latency**: p95 <500ms for typical operations

**Container Health Indicators:**

- [ ] **All containers running**: Check cadvisor dashboard
- [ ] **No restart loops**: Restart count should be stable
- [ ] **Resource limits not hit**: Memory/CPU within allocated limits

### Review Alerts (2 minutes)

**Check Prometheus Alerts:**

```bash
open http://localhost:9090/alerts
```

**Alert States:**

- **Green (Inactive)**: Normal - no action needed
- **Yellow (Pending)**: Monitoring - condition met but waiting for duration
- **Red (Firing)**: Action required - follow incident response procedure

**Check Slack notifications:**

- Review #ark-alerts channel for overnight alerts
- Verify critical alerts were addressed
- Check for resolution notifications

### Trend Analysis (3 minutes)

**Compare current metrics to baseline:**

1. Set time range to "Last 24 hours"
2. Look for:
   - Unusual spikes or drops
   - New patterns or anomalies
   - Gradual upward trends (potential leaks)
   - Correlation between metrics (CPU + latency)

**Common Patterns:**

- **Sawtooth Memory**: Normal (GC allocating and freeing)
- **Gradual Memory Increase**: Potential leak (investigate)
- **CPU Spikes During Rounds**: Expected (watch for excessive duration)
- **Latency Spikes at Night**: Possible backup jobs (verify schedule)

## Incident Response Procedure

### Step 1: Alert Received

**When Slack alert arrives:**

1. **Acknowledge**: React with emoji (👀 = investigating)
2. **Assess Severity**: Critical vs Warning
3. **Check Alert Details**:
   - Summary: What triggered?
   - Description: Why did it trigger?
   - Timestamp: When did it start?

### Step 2: Investigate

**Navigate to relevant dashboard:**

- **HighMachineCPUUsage**: Host Metrics dashboard
- **ServiceMissing**: Ark Go Metrics + Host Metrics
- **SlowRPCLatency**: RPC Latency dashboard
- **HighMemoryUsage**: Host Metrics + Ark Go Metrics

**Collect evidence:**

1. **Screenshot dashboard** showing issue
2. **Check logs**:
   ```bash
   docker logs arkd --tail 100 --timestamps
   docker logs otel-collector --tail 50
   ```
3. **Query Prometheus** for specific timeframe:
   ```promql
   # Example: CPU during incident
   rate(system_cpu_time_seconds_total[5m])
   ```
4. **Check container status**:
   ```bash
   docker ps -a
   docker stats --no-stream
   ```

### Step 3: Determine Root Cause

**Common Issues and Causes:**

**High CPU:**
- Round execution with many participants
- Inefficient query processing
- External process consuming resources
- Database maintenance operations

**High Memory:**
- Memory leak in application
- Large round transactions
- Unbounded cache growth
- Too many goroutines

**Service Down:**
- Application crash
- Out of memory (OOM kill)
- Network connectivity issue
- Configuration error

**Slow RPC:**
- Database query performance
- Network latency
- Resource contention
- Lock contention

### Step 4: Remediate

**Immediate Actions (Critical Alerts):**

```bash
# Restart service
docker restart arkd

# Check if service recovered
docker logs arkd --tail 20
curl http://localhost:7070/health

# Verify metrics returning
curl http://localhost:9090/api/v1/query?query=ark_service_up
```

**Temporary Mitigations:**

- Increase resource limits temporarily
- Reduce round participant limits
- Disable non-critical features
- Scale horizontally if possible

### Step 5: Document

**Update incident log:**

```markdown
## Incident: [Date] - [Alert Name]

**Triggered**: 2025-10-15 14:23 UTC
**Resolved**: 2025-10-15 14:45 UTC
**Duration**: 22 minutes

**Root Cause**: High CPU due to large round (128 participants)

**Impact**: RPC latency increased from 100ms to 2s p95

**Resolution**: Adjusted ROUND_MAX_PARTICIPANTS_COUNT from 128 to 64

**Follow-up**:
- [ ] Monitor CPU during rounds with new limit
- [ ] Investigate CPU optimization for round execution
- [ ] Consider horizontal scaling strategy
```

**Update runbook** if new pattern discovered.

## Monitoring Optimization

### Adjust Alert Thresholds

**When to adjust:**

- **Too many false positives**: Increase threshold or duration
- **Missed real issues**: Decrease threshold or duration
- **Different environments**: Separate thresholds for dev/prod

**Example adjustment:**

```yaml
# Before: Too sensitive
expr: system_cpu_usage > 50
for: 1m

# After: More appropriate
expr: system_cpu_usage > 70
for: 5m
```

### Optimize Dashboard Performance

**If dashboards load slowly:**

1. **Reduce time range**: "Last 6h" instead of "Last 7d"
2. **Decrease auto-refresh**: "1m" instead of "10s"
3. **Simplify queries**: Use recording rules for complex queries
4. **Limit panel count**: Max 12 panels per dashboard

**Create recording rules** for expensive queries:

```yaml
# prometheus-config.yaml
groups:
  - name: recording_rules
    interval: 10s
    rules:
      - record: ark:rpc_latency:p95
        expr: histogram_quantile(0.95,
               rate(rpc_server_duration_milliseconds_bucket[5m]))
```

### Data Retention Management

**Current retention:**
- **Prometheus**: 15 days
- **Loki**: 15 days (360h)
- **Jaeger**: 2 days

**Adjust if needed:**

```bash
# Increase Prometheus retention to 30 days
# Edit docker-compose.otel.yaml:
--storage.tsdb.retention.time=30d

# Increase Loki retention to 30 days
# Edit loki-config.yaml:
retention_period: 720h
```

**Monitor storage usage:**

```bash
docker exec prometheus df -h /prometheus
docker exec loki df -h /loki
```

## Monitoring Checklist by Time Interval

### Hourly (Automated via Alerts)

- [ ] Service health (ark_service_up)
- [ ] Critical resource thresholds (CPU, memory, disk)
- [ ] RPC latency within SLA

### Daily (Manual - 10 minutes)

- [ ] Review overnight alerts and resolutions
- [ ] Check dashboard trends for anomalies
- [ ] Verify all dashboards loading correctly
- [ ] Review Prometheus targets (all UP)
- [ ] Check container restart counts
- [ ] Validate backup script runs (if scheduled)

### Weekly (Manual - 30 minutes)

- [ ] Analyze week-over-week trends
- [ ] Review and update alert thresholds
- [ ] Archive old alerts and incidents
- [ ] Test alert notifications (simulate failure)
- [ ] Review and update dashboards
- [ ] Check data retention and storage usage
- [ ] Update runbooks with lessons learned

### Monthly (Manual - 1 hour)

- [ ] Comprehensive performance review
- [ ] Capacity planning based on growth trends
- [ ] Review and optimize queries and recording rules
- [ ] Update alert documentation
- [ ] Test disaster recovery procedures
- [ ] Review and rotate API keys
- [ ] Update monitoring SOP based on changes

## Metrics Interpretation Guide

### CPU Metrics

**Normal:**
```
System CPU: 20-50% average, spikes to 80% during rounds
GC CPU: <5% of total CPU time
User CPU: 15-45% (application work)
```

**Concerning:**
```
System CPU: Sustained >70% for >10 minutes
GC CPU: >10% (excessive garbage collection)
User CPU: >80% (potential infinite loop or inefficiency)
```

### Memory Metrics

**Normal:**
```
Heap Memory: Sawtooth pattern (allocate → GC → free)
Total Memory: Stable or slowly increasing
GC Frequency: Every 1-5 minutes
```

**Concerning:**
```
Heap Memory: Continuously increasing (no GC)
Total Memory: Rapid growth or never decreasing
GC Frequency: More than once per minute
```

### RPC Metrics

**Normal:**
```
p50 latency: <100ms
p95 latency: <500ms
p99 latency: <1s
Error rate: <0.1%
```

**Concerning:**
```
p50 latency: >200ms
p95 latency: >1s
p99 latency: >5s
Error rate: >1%
```

### Goroutine Metrics

**Normal:**
```
Goroutine count: 50-1,000 (varies by load)
Stable or slight increase during activity
Decreases when idle
```

**Concerning:**
```
Goroutine count: >10,000
Continuously increasing
Never decreasing (goroutine leak)
```

## Correlation Analysis

**When investigating issues, correlate metrics:**

### CPU + Latency
- High CPU → Usually correlates with higher latency
- If latency high but CPU low → Network or external dependency issue

### Memory + GC
- High memory → More frequent GC cycles
- Frequent GC → Higher CPU usage + potential latency spikes

### Goroutines + Memory
- Increasing goroutines → Increasing memory (each goroutine has overhead)
- Goroutine leak → Memory leak (goroutines retain references)

### RPC Rate + Resource Usage
- High RPC rate → Higher CPU, memory, network I/O
- If resources high but RPC rate low → Inefficiency or background work

## Tools and Commands Reference

### Quick Diagnostic Commands

```bash
# Check all containers
docker ps -a

# View real-time container stats
docker stats

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'

# Query current metric value
curl 'http://localhost:9090/api/v1/query?query=ark_service_up' | jq

# Check Grafana health
curl http://localhost:3333/api/health

# View recent Ark logs
docker logs arkd --tail 50 --follow

# Check OpenTelemetry Collector status
docker logs otel-collector --tail 20
```

### Useful Grafana Explore Queries

```promql
# CPU usage breakdown
sum by (state) (rate(system_cpu_time_seconds_total[5m])) * 100

# Memory usage by state
sum by (state) (system_memory_usage_bytes) / 1024^3

# RPC request rate by method
sum by (rpc_method) (rate(rpc_server_duration_milliseconds_count[5m]))

# Top CPU-consuming containers
topk(5, rate(container_cpu_usage_seconds_total[5m]) * 100)

# Goroutine trend
delta(ark_sched_goroutines_goroutines[1h])
```

## Troubleshooting Common Issues

**Dashboard shows "No Data":**
1. Check time range includes recent data
2. Verify Prometheus is scraping: http://localhost:9090/targets
3. Check OTel Collector is running: `docker ps | grep otel`
4. Verify metric exists: http://localhost:9090/graph

**Alerts not firing:**
1. Check alert expression in Prometheus UI
2. Verify alert state (Inactive/Pending/Firing)
3. Check Alertmanager is running: `docker ps | grep alertmanager`
4. Verify webhook URL in alertmanager.yml

**Grafana not loading:**
1. Check Grafana container: `docker logs grafana`
2. Verify port 3333 is accessible: `netstat -an | grep 3333`
3. Check browser console for errors
4. Try incognito mode (clear cookies/cache)

**High resource usage by monitoring stack:**
1. Reduce scrape intervals (10s → 30s)
2. Decrease retention periods (15d → 7d)
3. Optimize expensive queries
4. Add resource limits in docker-compose
