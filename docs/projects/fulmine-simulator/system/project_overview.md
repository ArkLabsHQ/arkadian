# Fulmine Simulator - Project Overview

## What is Fulmine Simulator?

Fulmine Simulator is a testing and simulation tool designed to validate the **Fulmine/Boltz swap stack** and **Arkade wallet** integration. Its primary purpose is to stress-test the swap infrastructure by simulating multiple concurrent clients performing submarine and reverse submarine swaps. This enables performance testing, regression detection, swap flow validation, and ensures proper fund recovery across the entire stack.

## Core Features

### Multi-Network Support
- **Regtest**: Local development with Nigiri faucet integration
- **Mutinynet**: Testnet environment for pre-production testing
- **Mainnet**: Production environment with enhanced safety features

### YAML-Based Configuration
- Human-readable simulation definitions
- JSON Schema validation for configuration files
- Flexible round-based action definitions
- Client-specific action sequences

### Automated Fund Management
- Initial fund distribution from faucet (regtest) or manual funding (mainnet)
- Automatic fund collection after simulation
- 100% fund recovery tracking and verification
- Emergency recovery tools for failure scenarios

### Comprehensive Audit Logging
- JSON Lines format for easy parsing
- Crash-resistant logging (flush after each entry)
- Fund movement tracking (distribution, collection)
- Simulation state transitions

### Mainnet Safety Features
- Configurable per-client and total fund limits
- Explicit user confirmation ("I ACKNOWLEDGE MAINNET")
- Network validation (chain parameters verification)
- Mandatory 100% fund recovery requirement

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Go 1.21+ |
| Configuration | YAML with JSON Schema validation |
| Logging | JSON Lines format |
| Build | Make |
| Dependencies | jsonschema, yaml.v3, sync |

## Use Cases

### Load Testing
Simulate 50+ concurrent clients performing swaps to stress-test Fulmine/Boltz infrastructure.

### Regression Testing
Automated simulation runs in CI/CD to detect swap flow regressions.

### Swap Flow Validation
Validate submarine and reverse submarine swap execution paths.

### Fund Recovery Testing
Verify 100% fund recovery under various failure scenarios.

## Project Structure

```
fulmine-simulator/
├── orchestrator/       # Main orchestrator binary
├── lnd-client/         # LND client daemon
├── fulmine-client/     # Fulmine client wrapper
├── arkade-client/      # Arkade client wrapper
├── configs/            # Example YAML configurations
├── boltz-stack/        # Boltz infrastructure
└── scripts/            # Helper scripts
```

## Development Status

| Phase | Status | Description |
|-------|--------|-------------|
| Setup | Complete | Project structure, build system |
| Foundational | Complete | Config parsing, audit logging |
| Regtest MVP | Complete | Nigiri integration, fund management |
| Swap Execution | In Progress | Fulmine API, swap execution |
| Multi-Network | Planned | Mutinynet, mainnet support |
| Mainnet Safety | Planned | Safety features |
| Monitoring | Planned | Progress tracking, reports |

## Related Projects

- **fulmine**: Swap execution backend
- **boltz-backend**: Swap provider infrastructure
- **Nigiri**: Regtest Bitcoin/Lightning environment
- **LND**: Lightning Network daemon
