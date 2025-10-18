# Ark Simulator - Configuration

## Configuration System Overview

Ark Simulator uses a YAML-based configuration system that provides declarative, version-controlled simulation scenario definitions. All simulation configurations must conform to a JSON Schema specification defined in `config/schema.yaml`, ensuring consistency and preventing runtime errors from malformed configurations. The configuration system supports defining multiple clients, sequenced rounds of actions, and various Ark protocol operations including onboarding, transfers, claims, and redemptions.

## Schema Definition

The configuration schema is defined in `${ARK_SIMULATOR_REPO}/config/schema.yaml` using JSON Schema Draft 07 specification.

### Top-Level Structure

```yaml
$schema: "http://json-schema.org/draft-07/schema#"
type: object
required:
  - version
  - clients
  - rounds
properties:
  version:
    type: string
  description:
    type: string
  clients: [...]
  rounds: [...]
```

**Required Fields**:
- `version`: Identifies the configuration format version (e.g., "1.0")
- `clients`: Array of client definitions participating in the simulation
- `rounds`: Ordered sequence of simulation rounds with client actions

**Optional Fields**:
- `description`: Human-readable description of the simulation scenario

## Client Configuration

Clients represent simulation participants that will interact with the Ark Server. Each client definition specifies identity and optional initial funding.

### Client Schema

```yaml
clients:
  type: array
  items:
    type: object
    required:
      - id
    properties:
      id:
        type: string
      name:
        type: string
      initial_funding:
        type: number
        minimum: 0
```

### Client Properties

**id** (required, string):
- Unique identifier for the client
- Must follow pattern `client_\d+` (e.g., client_0, client_1, client_42)
- Used as key in round action mappings
- Cannot contain spaces or special characters

**name** (optional, string):
- Display name for the client
- Used in logs and UI for human-readable identification
- Can contain spaces and descriptive text
- Example: "Alice", "High Volume Sender", "Client0"

**initial_funding** (optional, number):
- Bitcoin amount to pre-fund the client's on-chain wallet
- Specified in BTC (e.g., 0.003 = 300,000 satoshis)
- Must be non-negative (minimum: 0)
- Used for onboarding operations
- If omitted, client must receive funds via SendAsync from another client

### Client Configuration Example

```yaml
clients:
  - id: "client_0"
    name: "Alice"
    initial_funding: 0.003

  - id: "client_1"
    name: "Bob"
    initial_funding: 0.001

  - id: "client_2"
    name: "Charlie"
    # No initial funding - will receive from others

  - id: "client_3"
    name: "Dave"
    initial_funding: 0.0005
```

## Round Configuration

Rounds represent discrete simulation phases where clients execute specified actions. Rounds execute sequentially, with each round typically corresponding to an Ark Server settlement cycle.

### Round Schema

```yaml
rounds:
  type: array
  items:
    type: object
    required:
      - number
      - actions
    properties:
      number:
        type: integer
        minimum: 1
      sync:
        type: boolean
      actions:
        type: object
        patternProperties:
          "^client_\\d+$":
            type: array
            items: [action schema]
```

### Round Properties

**number** (required, integer):
- Sequential round identifier starting from 1
- Must increment by 1 each round (no gaps or duplicates)
- Example: Round 1, Round 2, Round 3...

**sync** (optional, boolean):
- Controls whether orchestrator waits for all client actions to complete before starting the next round
- Default: `true` (synchronous execution)
- `true`: Orchestrator blocks until all clients finish their actions
- `false`: Allows rounds to overlap for chaos testing

**actions** (required, object):
- Maps client IDs to arrays of actions they should perform in this round
- Keys must match client IDs defined in the `clients` section
- Keys must follow pattern `^client_\d+$`
- Clients not listed in actions for a round remain idle during that round

### Round Configuration Example

```yaml
rounds:
  - number: 1
    sync: true
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.003
      client_1:
        - type: "Onboard"
          amount: 0.001

  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0001
          to: "client_2"
        - type: "Balance"
```

## Action Types and Parameters

Actions define the Ark protocol operations clients perform during rounds. Each action has a required `type` field and type-specific optional parameters.

### Action Schema

```yaml
type: object
required:
  - type
properties:
  type:
    type: string
    enum:
      - "Onboard"
      - "SendAsync"
      - "Claim"
      - "Redeem"
      - "Balance"
      - "Stats"
  amount:
    type: number
    minimum: 0
  to:
    type: string
```

### Action Type Specifications

#### Onboard

Joins the Ark by locking Bitcoin on-chain and receiving off-chain VTXOs.

**Required Parameters**:
- `type`: "Onboard"
- `amount`: Bitcoin amount to lock (in BTC)

**Example**:
```yaml
- type: "Onboard"
  amount: 0.003
```

**Behavior**:
- Client creates an on-chain Bitcoin transaction locking funds
- Ark Server creates VTXOs representing the locked amount
- Client receives spendable off-chain balance after round settlement

#### SendAsync

Initiates an asynchronous off-chain VTXO transfer to another client.

**Required Parameters**:
- `type`: "SendAsync"
- `amount`: Bitcoin amount to transfer (in BTC)
- `to`: Target client ID (must exist in clients array)

**Example**:
```yaml
- type: "SendAsync"
  amount: 0.00002
  to: "client_5"
```

**Behavior**:
- Client creates a payment intent sending VTXOs to target
- Target client must execute Claim action in a future round to accept
- Payment processes during the next Ark Server round
- Sender's balance decreases immediately upon round finalization

#### Claim

Accepts and processes pending incoming VTXO transfers from SendAsync operations.

**Required Parameters**:
- `type`: "Claim"

**Example**:
```yaml
- type: "Claim"
```

**Behavior**:
- Client queries pending payments from the server
- Accepts all pending VTXOs and updates local state
- Balance increases with received amounts
- Must be executed in a subsequent round after SendAsync

#### Redeem

Exits the Ark by claiming VTXOs back to on-chain Bitcoin.

**Required Parameters**:
- `type`: "Redeem"

**Optional Parameters**:
- `amount`: Specific amount to redeem (defaults to full balance)

**Example**:
```yaml
- type: "Redeem"
  amount: 0.0005
```

**Behavior**:
- Client initiates cooperative exit process
- VTXOs converted back to on-chain UTXOs
- On-chain transaction created and broadcast
- Balance decreases by redeemed amount plus fees

#### Balance

Queries current VTXO holdings and prints balance information.

**Required Parameters**:
- `type`: "Balance"

**Example**:
```yaml
- type: "Balance"
```

**Behavior**:
- Client queries current off-chain balance
- Logs balance information to console/logs
- No state changes, read-only operation
- Useful for debugging and validation

#### Stats

Retrieves and logs client and server statistics.

**Required Parameters**:
- `type`: "Stats"

**Example**:
```yaml
- type: "Stats"
```

**Behavior**:
- Client queries server for statistics
- Logs information about rounds, VTXOs, transaction counts
- Read-only operation for monitoring and debugging

## Complete Configuration Example

### Example 1: Multi-Client Payment Flow (5 clients, 4 rounds)

This example demonstrates a realistic simulation with onboarding, transfers, claims, and redemption:

```yaml
version: "1.0"

description: "Multi-client test: onboarding, transfers, claims, and redemption"

clients:
  - id: "client_0"
    name: "Alice"
    initial_funding: 0.01
  - id: "client_1"
    name: "Bob"
    initial_funding: 0.005
  - id: "client_2"
    name: "Charlie"
  - id: "client_3"
    name: "Dave"
  - id: "client_4"
    name: "Eve"

rounds:
  # Round 1: Initial onboarding
  - number: 1
    sync: true
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.005
      client_1:
        - type: "Onboard"
          amount: 0.003

  # Round 2: Alice distributes funds to multiple recipients
  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0001
          to: "client_2"
        - type: "SendAsync"
          amount: 0.0001
          to: "client_3"
        - type: "SendAsync"
          amount: 0.0001
          to: "client_4"
        - type: "Balance"
      client_1:
        - type: "SendAsync"
          amount: 0.0002
          to: "client_2"

  # Round 3: Recipients claim pending payments
  - number: 3
    actions:
      client_2:
        - type: "Claim"
        - type: "Balance"
      client_3:
        - type: "Claim"
      client_4:
        - type: "Claim"

  # Round 4: Exit and stats
  - number: 4
    actions:
      client_2:
        - type: "Redeem"
          amount: 0.0001
      client_3:
        - type: "Stats"
```

### Example 2: Large-Scale Broadcast Pattern (100 clients, 3 rounds)

This pattern mimics a high-load scenario where one sender distributes to many recipients (extracted from actual simulation.yaml):

```yaml
version: "1.0"

description: "Broadcast pattern: 1 sender to 99 recipients"

clients:
  - id: "client_0"
    name: "Broadcaster"
  - id: "client_1"
    name: "Client1"
  # ... (clients 2-98 omitted for brevity)
  - id: "client_99"
    name: "Client99"

rounds:
  # Round 1: Broadcaster onboards with sufficient funds
  - number: 1
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.003

  # Round 2: Broadcaster sends to all 99 recipients
  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.00002000
          to: "client_1"
        - type: "SendAsync"
          amount: 0.00002000
          to: "client_2"
        # ... (sends to clients 3-98)
        - type: "SendAsync"
          amount: 0.00002000
          to: "client_99"

  # Round 3: All recipients claim simultaneously
  - number: 3
    actions:
      client_1:
        - type: "Claim"
      client_2:
        - type: "Claim"
      # ... (claims from clients 3-98)
      client_99:
        - type: "Claim"
```

**Use Case**: This pattern tests:
- Server's ability to handle one client with many outgoing payments in a single round
- Concurrent claim processing from many clients
- VTXO tree construction with high branching factor
- Signing performance with large participant counts

## Configuration Best Practices

### Sequential Dependencies

When configuring actions, respect the natural flow of operations:
1. **Onboard before SendAsync**: Clients must have VTXOs before sending
2. **SendAsync before Claim**: Recipient must wait at least one round
3. **Claim before spending**: Recipients should claim before sending received funds
4. **Balance for validation**: Insert Balance actions after state-changing operations

### Round Spacing

For realistic simulations:
- Allow at least one round between SendAsync and corresponding Claim
- Avoid too many actions per client in a single round (limit to 5-10)
- Use sync: true for predictable testing, sync: false for stress testing

### Amount Management

- Ensure clients have sufficient balance before SendAsync operations
- Account for Ark Server fees (typically small but non-zero)
- Use initial_funding generously to avoid balance exhaustion
- Typical amounts: 0.001-0.01 BTC for onboarding, 0.00001-0.0001 BTC for sends

### Client Count Scaling

- Local deployments: 5-20 clients recommended
- AWS deployments: 50-200 clients feasible
- Very large simulations (>100 clients): Use simplified action patterns to reduce configuration size

## Pre-Configured Simulation Templates

The `${ARK_SIMULATOR_REPO}/config/` directory includes several pre-built simulation scenarios optimized for different testing objectives:

### Scalability Test Series (Variable Client Counts)
- **simulation_1_20.yaml**: 20 clients - baseline load test
- **simulation_1_32.yaml**: 32 clients - moderate scale
- **simulation_1_40.yaml**: 40 clients - high load
- **simulation_1_50.yaml**: 50 clients - stress test
- **simulation_1_59.yaml**: 59 clients - near-maximum
- **simulation_1_128.yaml**: 128 clients - maximum scale test
- **simulation_1_170.yaml**: 170 clients - extreme load (AWS recommended)
- **simulation_1_200.yaml**: 200 clients - capacity limit test

### Functional Test Scenarios
- **simulation.yaml**: 100-client broadcast pattern (1 sender → 99 recipients)
- **simulation1.yaml**: Small multi-client functional test
- **simulation2.yaml**: Alternative functional test scenario

### Endurance Testing
- **simulation_20.yaml**: 20-round endurance test
- **simulation_60.yaml**: 60-round long-duration test

### Usage Recommendations

**Local Development** (5-20 clients):
- Use `simulation1.yaml` or `simulation_1_20.yaml`
- Quick feedback cycle (<2 minutes)
- Sufficient for functional validation

**CI/CD Integration** (20-40 clients):
- Use `simulation_1_32.yaml` or `simulation_1_40.yaml`
- Moderate load, reasonable runtime (~5 minutes)
- Catches performance regressions

**AWS Load Testing** (50-200 clients):
- Use `simulation_1_128.yaml`, `simulation_1_170.yaml`, or `simulation_1_200.yaml`
- Requires distributed deployment
- Reveals true capacity limits and bottlenecks

These templates serve as starting points - copy and modify them for custom test scenarios.

## Configuration Validation

Before running a simulation, the orchestrator validates the YAML against the schema:

1. **Schema Compliance**: All required fields present, types correct
2. **Client ID Format**: IDs match `client_\d+` pattern
3. **Sequential Rounds**: Round numbers are consecutive starting from 1
4. **Action Target Validity**: SendAsync "to" parameters reference existing clients
5. **Enum Validation**: Action types match allowed values

Validation errors are reported with specific field locations and expected values.

## Environment Variables for Orchestrator

The orchestrator itself can be configured via environment variables (especially for web/AWS mode):

```bash
# AWS Credentials (for ECS task management)
AWS_ACCESS_KEY_ID=<IAM user access key>
AWS_SECRET_ACCESS_KEY=<IAM user secret>
AWS_REGION=eu-central-1

# AWS Infrastructure IDs (from CloudFormation outputs)
SUBNET_ID=subnet-abc123
SECURITY_GROUP_ID=sg-xyz789

# Orchestrator Authentication
USERNAME=admin
PASSWORD=secure_password_here

# Orchestrator Public Endpoint (for client callbacks)
ORCHESTRATOR_URL=https://orchestrator.example.com
```

These are typically defined in a `.env` file (based on `.env.example`) and loaded when starting the web orchestrator via `make run-web-docker`.

## Configuration Troubleshooting

**Common Issues**:

1. **"Client not found" errors**: Ensure SendAsync "to" values match existing client IDs exactly
2. **"Invalid round number" errors**: Verify rounds are numbered sequentially without gaps
3. **Schema validation failures**: Check all required fields (type, version, clients, rounds) are present
4. **Balance exhaustion**: Increase initial_funding or reduce SendAsync amounts
5. **"Client ID pattern mismatch"**: Use underscore format `client_0` not `client-0` or `client0`

**Debugging Tips**:
- Start with small simulation files (2-3 clients, 2-3 rounds)
- Use Balance actions liberally to verify state at each step
- Test locally before deploying to AWS
- Review orchestrator logs for detailed error messages with line numbers
