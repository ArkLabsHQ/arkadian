---
project_id: introspector
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md", "testing/api-reference.md"]
  debug:      ["testing/troubleshooting.md", "testing/api-reference.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  api: ["testing/api-reference.md"]
scripts:
  build: "make build"
  run: "make run"
  test: "make integrationtest"
  docker_run: "make docker-run"
  docker_stop: "make docker-stop"
  proto: "make proto"
  lint: "make lint"
  format: "make format"
---

# Introspector — Project Index

**introspector** is an Arkade Script execution and signing service. It receives Ark transactions (PSBTs) containing Arkade Script programs, executes them in a custom script engine extending Bitcoin Script with introspection opcodes, and signs the transactions upon successful execution. It participates in the Ark round lifecycle by handling off-chain transaction signing, intent proof validation, and batch finalization.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/introspector/system/` — System Architecture & Components
Core documentation about Introspector architecture and design:

- **system/project_overview.md** — What Introspector is, features, and use cases
- **system/architecture.md** — Architecture overview, components, and Arkade Script engine
- **system/integration-with-arkd.md** — Integration with arkd and the Ark round lifecycle

### `${ARKADIAN_DIR}/docs/projects/introspector/testing/` — Usage & Operations
Practical guides for using and operating Introspector:

- **testing/usage.md** — Quick start guide and configuration
- **testing/api-reference.md** — gRPC/REST API documentation
- **testing/how_to_run.md** — Running the service
- **testing/how_to_test.md** — Testing guide
- **testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/introspector/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** — Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/introspector/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History
Documentation sync tracking and change history:

- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

| Item | Value |
|------|-------|
| Language | Go 1.25+ |
| Default Port | 7073 (gRPC + REST gateway) |
| Config Prefix | `INTROSPECTOR_` |
| Entry Point | `cmd/introspector.go` |
| Docker Image | Built from `Dockerfile` |
| Protobuf | `api-spec/protobuf/introspector/v1/service.proto` |
| Script Engine | `pkg/arkade/` (50+ custom opcodes) |
| Client Library | `pkg/client/` (Go gRPC client) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `INTROSPECTOR_SECRET_KEY` | Private key for signing (hex encoded) | Required |
| `INTROSPECTOR_DATADIR` | Data directory path | OS-specific app data dir |
| `INTROSPECTOR_PORT` | gRPC server port | 7073 |
| `INTROSPECTOR_NO_TLS` | Disable TLS encryption | false |
| `INTROSPECTOR_TLS_EXTRA_IPS` | Additional IPs for TLS cert | [] |
| `INTROSPECTOR_TLS_EXTRA_DOMAINS` | Additional domains for TLS cert | [] |
| `INTROSPECTOR_LOG_LEVEL` | Log level (0-6) | 4 (Debug) |

## Architecture Overview

```
Client (arkd / go-sdk)
       │
       ▼
┌─────────────────────────┐
│   gRPC + REST Gateway   │  Port 7073
│  (meshapi grpc-gateway) │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   Application Service   │
│  SubmitTx / SubmitIntent│
│  / SubmitFinalization   │
└─────┬──────────┬────────┘
      │          │
┌─────▼─────┐ ┌─▼──────────┐
│  Arkade   │ │   Signer   │
│  Script   │ │  (Schnorr/  │
│  Engine   │ │  Taproot)   │
└───────────┘ └─────────────┘
```
