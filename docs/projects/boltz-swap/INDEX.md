---
project_id: boltz-swap
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md", "system/architecture.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  lightning: ["system/project_overview.md", "testing/usage.md"]
  swaps: ["system/project_overview.md", "testing/usage.md"]
scripts:
  build: "pnpm build"
  test: "pnpm test"
  test_unit: "pnpm test:unit"
  test_integration: "pnpm test:integration"
  regtest_up: "pnpm regtest:up"
  regtest_down: "pnpm regtest:down"
  regtest_setup: "pnpm regtest:setup"
---

# Arkade Boltz Swap Library — Project Index

**boltz-swap** is a production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. It provides bidirectional swaps (Lightning ↔ Arkade) with automated swap monitoring, comprehensive error handling, and automatic refund capabilities.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/system/` — System Architecture & Components
Core documentation about boltz-swap architecture and design:

- **${ARKADIAN_DIR}/docs/projects/boltz-swap/system/project_overview.md** — What boltz-swap is, capabilities, and use cases
- **${ARKADIAN_DIR}/docs/projects/boltz-swap/system/architecture.md** — Module structure, class hierarchy, and integration patterns

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/` — Usage & Operations
Practical guides for using and testing boltz-swap:

- **${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/usage.md** — Quick start guide and common workflows
- **${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/how_to_run.md** — Running the library and examples
- **${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/how_to_test.md** — Testing guide (unit, integration, E2E)
- **${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/sop/` — Standard Operating Procedures
Step-by-step guides for development operations:

- **${ARKADIAN_DIR}/docs/projects/boltz-swap/sop/development-workflow.md** — Development workflow and PR checklist

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Swap Types

1. **Submarine Swaps** (Lightning → Arkade)
   - User pays Lightning invoice
   - Receives funds in Arkade wallet
   - Use case: Deposit Lightning funds into Arkade

2. **Reverse Submarine Swaps** (Arkade → Lightning)
   - User sends from Arkade wallet
   - Pays Lightning invoice
   - Use case: Pay Lightning invoices from Arkade balance

### Core Components

- **ArkadeLightning**: Main integration class coordinating wallet and swap operations
- **BoltzSwapProvider**: Client for Boltz API (swap creation, status monitoring)
- **SwapManager**: Background service for automated swap monitoring and claiming
- **VHTLC (Virtual HTLC)**: Arkade-specific HTLC implementation for swap contracts

### SwapManager Features

- **Automated Monitoring**: Single WebSocket connection for all swaps
- **Automatic Claim/Refund**: Executes swap actions when conditions are met
- **Fallback Polling**: Exponential backoff when WebSocket unavailable
- **Persistent State**: Resumes on app reopen, handles expired swaps
- **Event-Driven**: Subscribe to swap lifecycle events for UI updates

---

## Quick Reference

### Installation
```bash
npm install @arkade-os/sdk @arkade-os/boltz-swap
```

### Basic Usage
```typescript
import { Wallet, SingleKey } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';

const wallet = await Wallet.create({
  identity: SingleKey.fromHex('your_key'),
  arkServerUrl: 'https://mutinynet.arkade.sh',
});

const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
});

const arkadeLightning = new ArkadeLightning({
  wallet,
  swapProvider,
  swapManager: true, // Enable automatic monitoring
});

// Receive Lightning payment
const result = await arkadeLightning.createLightningInvoice({ amount: 50000 });
console.log('Invoice:', result.invoice);

// Send Lightning payment
await arkadeLightning.sendLightningPayment({
  invoice: 'lnbc500u1pj...',
});
```

---

## Integration Points

### Arkade Wallet Integration
- Uses `@arkade-os/sdk` Wallet class for VTXO management
- Stores swap data in wallet's contract repository
- Creates VHTLCs for atomic swap execution

### Boltz API Integration
- REST API for swap creation and status queries
- WebSocket for real-time swap updates
- Supports submarine and reverse submarine swaps

### Service Worker Support
- Compatible with ServiceWorkerWallet (PWA environments)
- IndexedDB storage for persistent swap state
- Background processing for offline-capable apps

---

## Documentation Size Guidelines

To keep context lean for AI agents:

- **usage/how-to**: ≤ 120 lines
- **architecture**: 400-700 words
- **troubleshooting**: ≤ 100 lines
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
