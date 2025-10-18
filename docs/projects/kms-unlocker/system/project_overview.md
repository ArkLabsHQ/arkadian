# KMS Unlocker - Project Overview

## What is KMS Unlocker?

KMS Unlocker is a specialized Go service designed to automatically manage ARK daemon (arkd) wallet operations. It continuously monitors arkd connections, automatically creates and unlocks wallets when needed, and securely backs up critical wallet data including seeds and macaroon authentication files.

The service eliminates the need for manual wallet unlock operations in production environments, ensuring that arkd wallets are always ready to process transactions without human intervention.

## Purpose

In production deployments, arkd requires wallet initialization and unlocking before it can process transactions. Manual intervention for these operations creates operational overhead and potential downtime. KMS Unlocker solves this by:

- **Automating wallet lifecycle management**: Creates wallets on first startup, unlocks on every restart
- **Ensuring high availability**: Monitors connections and automatically recovers from failures
- **Securing credentials**: Integrates with AWS KMS and Secrets Manager for secure password management
- **Protecting critical data**: Backs up wallet seeds and authentication files to prevent data loss

## Key Features

### Automatic Wallet Management
- **Wallet Creation**: Automatically creates arkd wallet on startup if it doesn't exist
- **Auto-Unlock**: Automatically unlocks arkd wallet on startup and after reconnections
- **Status Detection**: Intelligently detects wallet state and takes appropriate action

### Connection Resilience
- **Real-time Monitoring**: Tracks gRPC connection state changes continuously
- **Auto-Reconnect**: Implements exponential backoff retry mechanism
- **Health Checks**: Validates wallet status after connection establishment
- **Recovery Logic**: Re-checks and unlocks wallet after connection drops

### Secure Backup Systems
- **Seed Backup**: Automatically backs up wallet seed phrase immediately after creation
- **Macaroon Backup**: Backs up authentication files after wallet unlock
- **Dual Storage Options**: Supports local filesystem or AWS Secrets Manager
- **Individual Secret Storage**: Each macaroon file stored as separate AWS secret

### Security Integration
- **AWS KMS Integration**: Secure password encryption and decryption
- **AWS Secrets Manager**: Centralized secret storage for production
- **Environment-based Config**: Direct password configuration for development
- **Secure Permissions**: Proper file permissions for local backups (0600/0700)

## Use Cases

### Production Deployments
- Automated infrastructure where manual intervention is not feasible
- High-availability setups requiring automatic recovery from failures
- Cloud-native deployments leveraging AWS security services
- Disaster recovery scenarios requiring secure backup of wallet data

### Development and Testing
- Local development environments with simplified password management
- Integration testing with automated wallet setup
- CI/CD pipelines requiring automated arkd initialization
- Testing connection resilience and recovery scenarios

## Integration with arkd

KMS Unlocker acts as a companion service to arkd-wallet:

1. **Connection**: Establishes gRPC connection to arkd-wallet admin endpoint
2. **Initialization**: Calls wallet creation RPCs when wallet doesn't exist
3. **Unlocking**: Calls unlock RPC with password from configured provider
4. **Monitoring**: Continuously watches connection state for failures
5. **Recovery**: Re-establishes connection and re-unlocks wallet after disconnection

The service requires access to:
- arkd-wallet gRPC endpoint (typically port 6060)
- Macaroons directory (for backup after unlock)
- AWS credentials (when using AWS mode)

## Quick Feature Reference

| Feature | Description |
|---------|-------------|
| **Wallet Creation** | Generates seed, creates wallet automatically |
| **Wallet Unlock** | Unlocks wallet on startup and after reconnection |
| **Seed Backup** | Backs up seed after creation |
| **Macaroon Backup** | Backs up authentication files after unlock |
| **Connection Monitor** | Real-time gRPC state tracking |
| **Auto-Reconnect** | Exponential backoff retry logic |
| **Local Backup** | Filesystem-based backup for development |
| **AWS Backup** | Secrets Manager backup for production |
| **Env Password** | Direct password for development |
| **KMS Password** | Encrypted password for production |

## Architecture Philosophy

KMS Unlocker follows **hexagonal architecture** (ports and adapters pattern):

- **Core domain**: Pure business logic with no external dependencies
- **Ports**: Interface definitions for external services
- **Infrastructure adapters**: Concrete implementations (AWS, local, gRPC)
- **Configuration**: Dependency injection wires everything together

This design allows:
- Easy testing with mock implementations
- Swapping implementations without changing core logic
- Clear separation between business rules and infrastructure
- Support for multiple environments (dev, production)

## Getting Started

See related documentation:
- [architecture.md](./architecture.md) - Detailed architecture explanation
- [configuration.md](./configuration.md) - Environment variables and setup
- [aws-integration.md](./aws-integration.md) - AWS services setup
- [backup-systems.md](./backup-systems.md) - Backup mechanisms
- [connection-resilience.md](./connection-resilience.md) - Connection handling
