---
description: Router skill for operational knowledge - points to existing project documentation indexes
---

# Operational Knowledge Router

This skill helps you find operational documentation across the Ark ecosystem. **It does NOT contain the content** - it tells you where to look.

## How to Use

1. **Load the master index first**: `${ARKADIAN_DIR}/docs/INDEX.md`
2. **Find the relevant project(s)** based on user request
3. **Load that project's INDEX.md**: `${ARKADIAN_DIR}/docs/projects/<project-id>/INDEX.md`
4. **Use `default_sections_by_intent`** from the project INDEX to load specific docs

## Index Structure

```
${ARKADIAN_DIR}/docs/
├── INDEX.md                           # Master registry (all projects)
└── projects/
    ├── arkd/INDEX.md                  # arkd-specific index
    ├── go-sdk/INDEX.md                # SDK index
    ├── wallet/INDEX.md                # Wallet index
    ├── fulmine/INDEX.md               # Fulmine index
    └── ...                            # Other projects
```

## Intent → Doc Mapping

Each project INDEX.md has a `default_sections_by_intent` YAML block:

```yaml
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/how_to_run.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
```

**Use these mappings** to load the right docs for the task:
- Setting up environment → `qa` sections
- Running tests → `qa` sections
- Development/coding → `dev` sections
- Troubleshooting → `debug` sections

## Quick Lookup: Need → Project

| Need | Load Project |
|------|--------------|
| Run arkd server | `arkd` |
| Build wallet app | `go-sdk` |
| Web wallet UI | `wallet` |
| Lightning swaps | `fulmine` |
| Monitoring/metrics | `ark-telemetry` |
| Load testing | `ark-simulator` |
| Infrastructure/deploy | `ark-infra` |
| Testnet coins | `ark-faucet` |
| Escrow service | `arkade-escrow` |
| Block explorer | `arkade-explorer` |

## Standard Doc Locations

Every project follows this structure:

```
docs/projects/<project-id>/
├── system/                    # Architecture, design
│   ├── project_overview.md
│   └── architecture.md
├── testing/                   # Operations, usage
│   ├── usage.md              # CLI/API usage
│   ├── how_to_run.md         # Setup and running
│   ├── how_to_test.md        # Testing guide
│   └── troubleshooting.md    # Common issues
└── sop/                       # Procedures
    └── development-workflow.md
```

## Usage Example

**Task**: "Set up arkd for local development"

1. Load: `${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md`
2. Check `default_sections_by_intent.qa` → `["testing/how_to_run.md", ...]`
3. Load: `${ARKADIAN_DIR}/docs/projects/arkd/testing/how_to_run.md`
4. Follow the procedures in that file

**Task**: "Run fulmine tests"

1. Load: `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md`
2. Check `default_sections_by_intent.qa` → sections for testing
3. Load those specific files
4. Follow the test commands

## DO NOT

- Duplicate content from the indexes
- Hardcode commands (they're in project docs)
- Skip loading the INDEX.md files
- Assume doc locations without checking the index
