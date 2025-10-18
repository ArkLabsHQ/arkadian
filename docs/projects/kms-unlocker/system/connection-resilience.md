# KMS Unlocker - Connection Resilience

## Overview

Connection resilience is a core feature of KMS Unlocker, ensuring that wallet operations remain automated even when the arkd service experiences restarts, network issues, or temporary failures. The service implements a sophisticated state monitoring and reconnection system that continuously adapts to connection state changes.

## Connection Monitoring

The service monitors gRPC connection state in real-time using a state channel subscription pattern implemented in `monitorArkdClient()`.

### gRPC Connection States

gRPC connections transition through several states:

- **connectivity.Idle**: No active RPCs, not trying to connect
- **connectivity.Connecting**: Actively trying to establish connection
- **connectivity.Ready**: Connection established, ready for RPCs
- **connectivity.TransientFailure**: Failed to connect, will retry
- **connectivity.Shutdown**: Connection closed

### State Monitoring Implementation

```go
1. Subscribe to connection state channel via GetConnState()
2. Wait for state changes in select loop
3. On state change:
   - Log new state
   - Take appropriate action based on state
4. On channel close:
   - Resubscribe (connection was replaced)
   - Continue monitoring
```

### Real-time State Tracking

The monitoring loop runs continuously in a goroutine, providing:

- **Immediate detection** of connection failures
- **Automatic response** to state transitions
- **No polling overhead** - uses event-driven notification
- **Handles connection replacement** - resubscribes when channel closes

### Context Cancellation

The monitoring loop respects context cancellation:

```go
select {
case <-ctx.Done():
    // Graceful shutdown
    log.Info("monitoring connection state stopped")
    return
case st := <-conStatCh:
    // Process state change
}
```

This ensures clean shutdown when the service stops.

## Auto-Reconnect Mechanism

When connection failures are detected, the service automatically attempts to reconnect with intelligent retry logic.

### Reconnection Triggers

Reconnection is triggered on these states:

1. **connectivity.TransientFailure**: Connection attempt failed
2. **connectivity.Idle**: Connection became idle after activity
3. **Failed operations**: When operations fail after Ready state

### Reconnect Implementation

```go
1. Detect failure state
2. Check if reconnect already in progress
3. If not, set reconnect flag
4. Launch reconnect in background goroutine:
   go func() {
       if err := arkdClient.Connect(ctx); err != nil {
           log.Warn("reconnect attempt failed")
       }
   }()
5. Continue monitoring
```

### Preventing Duplicate Reconnects

The `reconnectInFlight` flag prevents multiple concurrent reconnection attempts:

```go
if !reconnectInFlight {
    reconnectInFlight = true
    go reconnect()
}
```

This ensures:
- Only one reconnection attempt at a time
- No resource waste from duplicate attempts
- Clean state management

### Background Reconnection

Reconnection happens in background goroutines to avoid blocking the monitoring loop. This allows:

- Continued state monitoring during reconnection
- Multiple connection attempts if needed
- Responsiveness to new state changes

## Exponential Backoff

All operations that interact with arkd use exponential backoff retry logic via `executeWithRetry()`.

### Backoff Parameters

```go
const (
    baseBackoff = 1 second     // Initial wait time
    maxBackoff  = 60 seconds   // Maximum wait time
)

maxRetries = configurable (default 5)
```

### Backoff Algorithm

```go
backoff = 1s
for attempt = 1 to maxRetries:
    result = execute_operation()
    if success:
        return success

    log error and attempt number

    if attempt < maxRetries:
        wait for backoff duration
        backoff = min(backoff * 2, maxBackoff)

return last error
```

### Backoff Schedule Example

With default configuration:

| Attempt | Wait Before | Total Wait |
|---------|-------------|------------|
| 1 | 0s | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

Maximum total wait: 15 seconds for 5 attempts

### Operations Using Retry

- `unlock()` - Wallet unlock operation
- `initAndUnlock()` - Complete initialization flow
- All nested operations within (GenSeed, Create, Backup)

## Health Checks

After connection establishment, the service performs wallet status validation before taking action.

### Status Check Flow

```go
1. Connection state becomes Ready
2. Call GetWalletStatus()
3. Check response:
   - initialized: bool
   - unlocked: bool
4. Decide action based on status
```

### Status-Based Actions

| Initialized | Unlocked | Action |
|-------------|----------|--------|
| false | false | Initialize and unlock |
| true | false | Unlock only |
| true | true | No action (already ready) |

### Health Check Failures

If `GetWalletStatus()` fails after connection is Ready:

```go
1. Log error
2. Set reconnect flag
3. Trigger reconnection
4. Continue monitoring
```

This handles cases where:
- Connection established but RPC fails
- Service is partially ready
- Authentication issues occur

## Reconnection Workflow

Complete reconnection workflow from failure to recovery:

### Detection Phase

```go
1. Connection state changes to TransientFailure or Idle
   OR
   Operation fails with error
2. Monitor loop detects the change
```

### Reconnection Phase

```go
3. Check reconnectInFlight flag
4. If false:
   - Set reconnectInFlight = true
   - Launch background goroutine
   - Call arkdClient.Connect(ctx)
```

### Connection Attempt

```go
5. Connect() performs:
   - Close old connection (if any)
   - Create new gRPC connection
   - Wait for state change
   - Return success/error
```

### State Transition

```go
6. New connection triggers state change
7. State channel delivers Ready state
8. Monitor loop receives Ready notification
```

### Validation Phase

```go
9. Call GetWalletStatus() to check wallet state
10. If fails:
    - Trigger another reconnection
    - Return to step 3
11. If succeeds:
    - Clear reconnectInFlight flag
    - Proceed to unlock/init based on status
```

### Operation Phase

```go
12. Execute unlock() or initAndUnlock()
13. If operation fails:
    - Trigger reconnection
    - Return to step 3
14. If succeeds:
    - Service ready
    - Continue monitoring for next failure
```

## Failure Scenarios and Handling

### Scenario 1: arkd Restart

```
1. arkd restarts → connection drops
2. State: Ready → TransientFailure
3. Trigger reconnection
4. New connection established → Ready
5. Check wallet status → initialized: true, unlocked: false
6. Execute unlock()
7. Service ready
```

### Scenario 2: Network Interruption

```
1. Network drops → connection fails
2. State: Ready → TransientFailure
3. Trigger reconnection → fails (no network)
4. Exponential backoff retries
5. Network restored
6. Reconnection succeeds → Ready
7. Check and unlock wallet
8. Service ready
```

### Scenario 3: arkd Slow Start

```
1. Connection established → Ready
2. GetWalletStatus() fails (arkd not ready)
3. Trigger reconnection
4. Connection re-established → Ready
5. GetWalletStatus() succeeds
6. Unlock wallet
7. Service ready
```

### Scenario 4: Repeated Failures

```
1. Connection fails
2. Reconnect attempt 1 → fails (1s wait)
3. Reconnect attempt 2 → fails (2s wait)
4. Reconnect attempt 3 → fails (4s wait)
5. Reconnect attempt 4 → fails (8s wait)
6. Reconnect attempt 5 → succeeds
7. Proceed to unlock
```

### Scenario 5: Unlock Failures

```
1. Connection established → Ready
2. Wallet status: initialized, not unlocked
3. Unlock attempt 1 → fails (wrong password or timing issue)
4. Retry with backoff
5. Unlock attempt 2 → succeeds
6. Backup macaroons
7. Service ready
```

## Configuration for Resilience

### Max Retry Configuration

```bash
# Set maximum retry attempts (default: 5)
KMS_UNLOCKER_MAX_RETRY=10

# 0 means infinite retries (not recommended)
# Higher values increase total retry time
```

**Recommendations:**
- **Development**: 3-5 retries (fast feedback)
- **Production**: 10-15 retries (handle slow starts)
- **Critical systems**: 20+ retries (maximize availability)

### Connection Timeout

The gRPC client uses default timeouts. For custom timeouts, modify the arkd-client implementation to include:

```go
grpc.WithTimeout(30 * time.Second)
```

### Health Check Intervals

The service uses event-driven monitoring (no polling), but you can add periodic health checks if needed for additional reliability.

## Monitoring and Observability

### Log Levels

Different log levels provide different visibility:

```bash
# Error level - only failures
KMS_UNLOCKER_LOG_LEVEL=2

# Info level - key events (default)
KMS_UNLOCKER_LOG_LEVEL=4

# Debug level - detailed state changes
KMS_UNLOCKER_LOG_LEVEL=5
```

### Key Log Messages

Watch for these log messages to understand connection health:

- `"monitoring connection state..."` - Monitoring started
- `"connection state changed"` - State transition detected
- `"connection established"` - Ready for operations
- `"connection dropped, reconnecting..."` - Failure detected
- `"reconnect attempt failed"` - Reconnection unsuccessful
- `"arkd unlocked"` - Wallet ready

### Metrics to Track

Consider tracking these metrics in production:

- Time between connection drops
- Reconnection success rate
- Average reconnection time
- Unlock operation success rate
- Retry attempt distributions

## Best Practices

1. **Set appropriate max retries** based on environment
2. **Monitor logs** for repeated failures
3. **Use debug level** when troubleshooting connection issues
4. **Test reconnection** by stopping/starting arkd
5. **Verify network stability** if reconnections frequent
6. **Check arkd logs** for corresponding connection events
7. **Set resource limits** to prevent goroutine leaks on repeated failures

## See Also

- [architecture.md](./architecture.md) - Service lifecycle and state machine
- [configuration.md](./configuration.md) - Max retry and log level settings
- [project_overview.md](./project_overview.md) - High-level connection resilience features
