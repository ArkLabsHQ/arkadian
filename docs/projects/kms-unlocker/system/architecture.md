# KMS Unlocker - Architecture

## Hexagonal Architecture Overview

KMS Unlocker implements hexagonal architecture (also known as ports and adapters pattern), providing clear separation between business logic and infrastructure concerns. This pattern allows the core domain to remain independent of external services, databases, and frameworks.

The architecture consists of three main layers:

```
internal/
├── core/                    # Core Domain Layer
│   ├── application/        # Business logic and orchestration
│   │   └── service.go     # Main service with state machine
│   └── ports/             # Interface definitions
│       ├── arkd_client.go
│       ├── password_provider.go
│       └── backup_service.go
│
├── infrastructure/         # Infrastructure Adapters
│   ├── arkd-client/       # gRPC implementation
│   ├── password-provider/ # Password retrieval
│   │   ├── env/          # Environment variable provider
│   │   └── aws/          # AWS KMS provider
│   └── backup/           # Backup implementations
│       ├── local/        # Filesystem backup
│       └── aws/          # Secrets Manager backup
│
└── config/                # Dependency Injection
    └── config.go         # Wires implementations together
```

## Core Domain Layer

The core domain contains pure business logic with no external dependencies. It defines what the system does, not how it does it.

### Application Service

Located in `internal/core/application/service.go`, the application service implements the main workflow:

**Key responsibilities:**
- Monitor arkd connection state changes
- Decide when to create vs unlock wallet
- Orchestrate backup operations
- Handle reconnection logic
- Implement retry mechanism with exponential backoff

**State machine logic:**
```
Connection Ready → Check Wallet Status
                     ↓                ↓
              Not Initialized    Initialized
                     ↓                ↓
              Init Path         Unlock Path
                     ↓                ↓
         GenSeed → Create → Backup Seed
                     ↓
              Unlock Wallet
                     ↓
            Backup Macaroons
```

### Ports (Interfaces)

Ports define the contracts that infrastructure must implement. They represent abstract capabilities needed by the core domain.

**ArkdClient** (`arkd_client.go`):
- `Connect()` - Establish gRPC connection
- `GetConnState()` - Subscribe to connection state changes
- `GetWalletStatus()` - Query wallet initialization/unlock status
- `GenSeed()` - Generate new wallet seed
- `Create()` - Create wallet with seed and password
- `Unlock()` - Unlock wallet with password

**PasswordProvider** (`password_provider.go`):
- `Get(ctx)` - Retrieve wallet password from configured source

**BackupSvc** (`backup_service.go`):
- `BackupSeed(ctx, seed)` - Backup wallet seed phrase
- `BackupMacaroons(ctx)` - Backup macaroon authentication files

## Infrastructure Adapters

Infrastructure adapters implement the port interfaces using concrete technologies. Multiple implementations can exist for the same port.

### arkd-client (gRPC Adapter)

Implements `ArkdClient` port using gRPC to communicate with arkd-wallet:
- Manages gRPC connection lifecycle
- Translates port methods to gRPC calls
- Monitors connection state via `WaitForStateChange()`
- Handles connection failures and reconnection

### password-provider (Dual Implementations)

**Environment Provider** (`env/service.go`):
- Simplest implementation for development
- Returns password directly from environment variable
- No external dependencies
- Suitable for local testing

**AWS KMS Provider** (`aws/kms_client.go`):
- Production-grade security implementation
- Retrieves encrypted password from AWS Secrets Manager
- Decrypts using AWS KMS
- Handles both SecretString and SecretBinary formats

### backup (Dual Implementations)

**Local Backup** (`local/service.go`):
- Filesystem-based backup for development
- Creates directory structure: `<datadir>/backup/`
- Seed backup: `arkd-seed.txt`
- Macaroon backup: `macaroons/` subdirectory
- File permissions: 0700 for directories, 0600 for files

**AWS Backup** (`aws/service.go`):
- Cloud-based backup for production
- Uses AWS Secrets Manager for storage
- Seed backup: Single secret with configured name
- Macaroon backup: Individual secret per macaroon file
- Secret naming: filename without `.macaroon` extension

## Configuration and Dependency Injection

Located in `internal/config/config.go`, the configuration layer is responsible for:

1. **Loading environment variables** using Viper
2. **Validating configuration** based on selected providers
3. **Creating concrete implementations** of each port
4. **Wiring dependencies** together

### Service Creation Flow

```go
config.LoadConfig()
  ├── Validate configuration
  ├── Create PasswordProvider (env or aws)
  ├── Create ArkdClient (gRPC)
  ├── Create BackupSvc (local or aws)
  └── Create ApplicationService with all dependencies
```

Configuration uses factory pattern to instantiate the correct implementations based on environment variables.

## Service Lifecycle

The complete lifecycle from startup to operation:

### 1. Initialization Phase
```
main() → LoadConfig()
         ↓
    Create all services
         ↓
    Start monitoring
```

### 2. Monitoring Phase
```
monitorArkdClient()
    ↓
Subscribe to connection state channel
    ↓
Wait for state changes
```

### 3. Connection Ready Phase
```
State: connectivity.Ready
    ↓
GetWalletStatus()
    ↓
Check initialized flag
```

### 4a. Init Path (Not Initialized)
```
initAndUnlock()
    ├── Get password from provider
    ├── GenSeed()
    ├── Create(seed, password)
    ├── BackupSeed(seed)
    ├── Unlock(password)
    └── BackupMacaroons()
```

### 4b. Unlock Path (Initialized)
```
unlock()
    ├── Get password from provider
    └── Unlock(password)
```

### 5. Reconnection Phase
```
State: TransientFailure/Idle
    ↓
Trigger reconnect in background
    ↓
Return to Monitoring Phase
```

## State Machine Implementation

The state machine is implemented in `monitorArkdClient()`:

**States tracked:**
- `connectivity.Ready` - Connection established, wallet operations possible
- `connectivity.Idle` - No active RPCs, ready to connect
- `connectivity.TransientFailure` - Connection lost, will retry
- `connectivity.Shutdown` - Connection closed

**State transitions:**
- Ready → Check status → Init or Unlock
- TransientFailure → Trigger reconnect → (eventually) Ready
- Idle → Trigger reconnect → (eventually) Ready
- Shutdown → Resubscribe to new connection

## Error Handling and Retry Logic

The `executeWithRetry()` function implements exponential backoff:

**Parameters:**
- Base backoff: 1 second
- Max backoff: 60 seconds
- Max retries: Configurable (default 5)

**Algorithm:**
1. Execute operation
2. If success, return immediately
3. If failure and retries remaining:
   - Log error with attempt number
   - Wait for backoff duration
   - Double backoff (up to max)
   - Retry operation
4. If all retries exhausted, return last error

**Retry applies to:**
- Wallet unlock operations
- Wallet creation operations
- All operations within init and unlock flows

## Critical Flow Explanation

The most critical flow is the connection monitoring loop:

1. **Subscribe to connection state**: Get channel from current gRPC connection
2. **Wait for state change**: Block until connection state changes
3. **Handle Ready state**: Connection established
   - Validate wallet status
   - Take init or unlock action
   - Trigger reconnect on failure
4. **Handle failure states**: Connection dropped
   - Set reconnect flag (prevent duplicate reconnects)
   - Trigger reconnect in background goroutine
5. **Resubscribe on channel close**: Old connection replaced
   - Break to outer loop
   - Get new state channel
   - Continue monitoring

This design ensures the service continuously adapts to connection state changes and takes appropriate action without manual intervention.

## Design Benefits

The hexagonal architecture provides several advantages:

- **Testability**: Core logic can be tested with mock implementations
- **Flexibility**: Easy to swap implementations (local vs AWS)
- **Maintainability**: Clear boundaries between layers
- **Independence**: Core domain has no infrastructure dependencies
- **Extensibility**: New providers can be added without changing core logic

## See Also

- [connection-resilience.md](./connection-resilience.md) - Detailed connection handling
- [backup-systems.md](./backup-systems.md) - Backup implementation details
- [configuration.md](./configuration.md) - Configuration and dependency injection
