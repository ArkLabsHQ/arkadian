# Creating Simulation Scenarios - SOP

## Purpose
Step-by-step guide for creating YAML simulation configurations.

Reference: `${ARKADIAN_DIR}/docs/projects/ark-simulator/system/configuration.md`

## Procedure: Create Scenario

### 1. Choose Template
```bash
cd ${ARK_SIMULATOR_REPO}/config
cp simulation1.yaml my-scenario.yaml  # Small (5-20 clients)
```

### 2. Define Clients
```yaml
version: "1.0"
description: "Test scenario description"

clients:
  - id: "client_0"             # Pattern: client_N
    name: "Alice"
    initial_funding: 0.01      # 0.001-0.01 BTC
  - id: "client_1"
    name: "Bob"
    initial_funding: 0.005
```

### 3. Build Rounds
```yaml
rounds:
  - number: 1                  # Sequential from 1
    sync: true                 # Wait for completion
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.005
        - type: "Balance"      # Verify state

  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0001
          to: "client_1"       # Must exist in clients

  - number: 3
    actions:
      client_1:
        - type: "Claim"        # Accept payment
        - type: "Balance"
```

### 4. Validate
```bash
# Check syntax
yq eval '.' my-scenario.yaml

# Validate schema
make run ARGS="--sim config/my-scenario.yaml --validate-only"
```

**Checklist**:
- [ ] IDs: `client_N` pattern (underscore)
- [ ] Rounds: Sequential (1, 2, 3...)
- [ ] References: All `to` fields valid
- [ ] Balances: Sufficient for operations

### 5. Test
```bash
# Start small (2-3 clients)
make run ARGS="--sim config/my-scenario.yaml"

# Scale gradually: 5 → 10 → 20
```

## Action Types

| Type | Required Params | Description |
|------|----------------|-------------|
| Onboard | amount | Join Ark with on-chain funds |
| SendAsync | amount, to | Off-chain transfer |
| Claim | - | Accept pending payments |
| Redeem | - | Exit to on-chain |
| Balance | - | Query current VTXOs |
| Stats | - | Server statistics |

## Common Pattern: Broadcast (1 → N)
```yaml
version: "1.0"
clients: [{ id: "client_0" }, { id: "client_1" }, { id: "client_2" }]
rounds:
  - number: 1
    actions:
      client_0: [{ type: "Onboard", amount: 0.01 }]
  - number: 2
    actions:
      client_0:
        - { type: "SendAsync", amount: 0.0001, to: "client_1" }
        - { type: "SendAsync", amount: 0.0001, to: "client_2" }
  - number: 3
    actions:
      client_1: [{ type: "Claim" }]
      client_2: [{ type: "Claim" }]
```

## Best Practices
- Allow 1+ rounds between SendAsync → Claim
- Conservative amounts: 0.01 BTC onboard, 0.00001 BTC sends
- Use `sync: true` for predictable execution

Next: `${ARKADIAN_DIR}/docs/projects/ark-simulator/sop/analyzing-results.md`
