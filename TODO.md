# Arkadian - TODO & Implementation Tasks

**Last Updated**: 2025-10-16
**Status**: Active Development
**Priority System**: 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

---

## 🎯 Current Sprint: Repository Management & Documentation State

### Phase 1: Foundation - Portable Path System ⏳ In Progress

#### 🔴 Critical Tasks

- [ ] **1.1 Define Environment Variables**
  - [ ] Create `env-setup-template.sh` with all required variables
  - [ ] Document required variables in README.md
  - [ ] Add example configurations for different machines
  - **Variables to define**:
    ```bash
    ARKADIAN_DOCS="/path/to/arkadian/docs"
    ARKD_REPO="/path/to/ark"
    GO_SDK_REPO="/path/to/go-sdk"
    WALLET_REPO="/path/to/wallet"
    ARK_FAUCET_REPO="/path/to/ark-faucet"
    ARK_SIMULATOR_REPO="/path/to/ark-simulator"
    ARK_TELEMETRY_REPO="/path/to/ark-telemetry"
    ARK_INFRA_REPO="/path/to/ark-infra"
    KMS_UNLOCKER_REPO="/path/to/kms-unlocker"
    FULMINE_REPO="/path/to/fulmine"
    ARK_DOCS_REPO="/path/to/docs"
    ARKADE_ESCROW_REPO="/path/to/arkade-escrow"
    ```
  - **Location**: `${ARKADIAN_DIR}/scripts/env-setup-template.sh`
  - **Estimate**: 1 hour

- [ ] **1.2 Update INDEX.md Files with Environment Variables**
  - [ ] Update main INDEX.md (`docs/INDEX.md`)
  - [ ] Update all 11 project INDEX.md files to reference `${PROJECT_REPO}`
  - [ ] Replace hardcoded paths with environment variable references
  - **Files to update**:
    - `docs/INDEX.md` (main registry)
    - `docs/projects/arkd/INDEX.md`
    - `docs/projects/go-sdk/INDEX.md`
    - `docs/projects/wallet/INDEX.md`
    - `docs/projects/ark-faucet/INDEX.md`
    - `docs/projects/ark-simulator/INDEX.md`
    - `docs/projects/ark-telemetry/INDEX.md`
    - `docs/projects/ark-infra/INDEX.md`
    - `docs/projects/kms-unlocker/INDEX.md`
    - `docs/projects/fulmine/INDEX.md`
    - `docs/projects/ark-docs/INDEX.md`
    - `docs/projects/arkade-escrow/INDEX.md`
  - **Estimate**: 2 hours

- [ ] **1.3 Create Repository Map Configuration**
  - [ ] Create `docs/REPO_MAP.json` with machine-specific configurations
  - [ ] Support multiple machine profiles (macbook, CI server, etc.)
  - [ ] Add validation logic for missing repositories
  - **Location**: `${ARKADIAN_DIR}/docs/REPO_MAP.json`
  - **Estimate**: 1.5 hours

#### 🟡 High Priority Tasks

- [ ] **1.4 Add Sync Metadata to All INDEX.md Files**
  - [ ] Add frontmatter fields: `last_sync_commit`, `last_sync_date`, `version`
  - [ ] Document sync metadata schema
  - [ ] Create validation script for metadata
  - **Metadata format**:
    ```yaml
    ---
    project_id: arkd
    version: 1.0.0
    last_sync_commit: 7dc82328
    last_sync_date: 2025-10-16T12:00:00Z
    repository_path: ${ARKD_REPO}
    documentation_path: ${ARKADIAN_DOCS}/projects/arkd
    auto_sync: false
    ---
    ```
  - **Estimate**: 2 hours

- [ ] **1.5 Create Initialization Validation Script**
  - [ ] Implement `scripts/init-arkadian.sh`
  - [ ] Validate all required environment variables are set
  - [ ] Check that all repository paths exist
  - [ ] Provide helpful error messages for missing configs
  - **Location**: `${ARKADIAN_DIR}/scripts/init-arkadian.sh`
  - **Estimate**: 1.5 hours

- [ ] **1.6 Create Change-Log Structure for All Projects**
  - [ ] Create `change-log/` directory in each project
  - [ ] Add `SYNC_HISTORY.md` template
  - [ ] Add `last-sync.txt` marker file
  - [ ] Document change-log format and usage
  - **Estimate**: 1 hour

---

### Phase 2: Automation - Freshness Detection ⏸️ Not Started

#### 🟡 High Priority Tasks

- [ ] **2.1 Implement Freshness Detection Script**
  - [ ] Create `scripts/arkadian-check-freshness.ts` (TypeScript/Bun)
  - [ ] Check git commit hash vs last_sync_commit in INDEX.md
  - [ ] Check for uncommitted changes (git status --porcelain)
  - [ ] Check commits behind remote (git rev-list HEAD..@{u})
  - [ ] Generate freshness report for all projects
  - **Features**:
    - Per-project status check
    - Bulk check for all projects
    - JSON output option for automation
    - Color-coded terminal output
  - **Location**: `${ARKADIAN_DIR}/scripts/arkadian-check-freshness.ts`
  - **Estimate**: 3 hours

- [ ] **2.2 Implement Documentation Sync Command**
  - [ ] Create `scripts/arkadian-sync-docs.ts`
  - [ ] Update last_sync_commit in INDEX.md
  - [ ] Generate change-log entry with recent commits
  - [ ] Support single project or bulk sync
  - [ ] Dry-run mode for testing
  - **Features**:
    - `arkadian-sync-docs` - sync all projects
    - `arkadian-sync-docs arkd` - sync specific project
    - `arkadian-sync-docs --dry-run` - preview changes
  - **Location**: `${ARKADIAN_DIR}/scripts/arkadian-sync-docs.ts`
  - **Estimate**: 3 hours

#### 🟢 Medium Priority Tasks

- [ ] **2.3 Create Context Loader Hook**
  - [ ] Implement `scripts/arkadian-context-loader-hook.ts`
  - [ ] Detect relevant projects from user prompt
  - [ ] Load appropriate INDEX.md files
  - [ ] Check freshness and warn if stale
  - [ ] Generate context summary for agent
  - **Integration**: Hooks into AI agent system to load context dynamically
  - **Location**: `${ARKADIAN_DIR}/scripts/arkadian-context-loader-hook.ts`
  - **Estimate**: 4 hours

- [ ] **2.4 Add Git Hooks to Source Repositories**
  - [ ] Create `post-commit` hook template
  - [ ] Mark documentation as stale on new commits
  - [ ] Optional: Trigger sync immediately vs lazy
  - [ ] Create installation script for all repos
  - **Locations**: Each repository `.git/hooks/post-commit`
  - **Estimate**: 2 hours

- [ ] **2.5 Create Stale Documentation Report**
  - [ ] Daily/weekly report of stale docs
  - [ ] Email/Slack notification option
  - [ ] Integration with project dashboard
  - **Estimate**: 2 hours

---

### Phase 3: CI/CD Integration ⏸️ Not Started

#### 🟢 Medium Priority Tasks

- [ ] **3.1 Create GitHub Actions Workflow for Auto-Sync**
  - [ ] Create `.github/workflows/sync-arkadian-docs.yml` in each repo
  - [ ] Trigger on push to main/master branch
  - [ ] Generate updated documentation
  - [ ] Commit changes back to arkadian repo
  - [ ] Setup GitHub Personal Access Token for cross-repo commits
  - **Requirements**:
    - GitHub PAT with repo write access
    - Webhook/API to trigger doc generation
  - **Estimate**: 4 hours

- [ ] **3.2 Create Documentation Generation Pipeline**
  - [ ] Automated doc generation from code analysis
  - [ ] Update project INDEX.md files
  - [ ] Update main INDEX.md with changes
  - [ ] Run tests to validate doc consistency
  - **Estimate**: 6 hours

#### 🔵 Low Priority Tasks

- [ ] **3.3 Create Documentation Preview System**
  - [ ] Web interface to view docs
  - [ ] Show freshness status
  - [ ] Trigger sync from web UI
  - **Estimate**: 8 hours

- [ ] **3.4 Implement Webhook Server for Doc Updates**
  - [ ] HTTP server to receive commit notifications
  - [ ] Queue sync jobs
  - [ ] Status dashboard
  - **Estimate**: 6 hours

---

## 🚀 Future Enhancements ⏸️ Not Started

### MCP (Model Context Protocol) Integration

- [ ] **4.1 Create Arkd MCP Server**
  - [ ] Query VTXOs, rounds, balances
  - [ ] Submit transactions
  - [ ] Monitor server health
  - **Estimate**: 8 hours

- [ ] **4.2 Create Bitcoin Node MCP Server**
  - [ ] Query blockchain state
  - [ ] Submit transactions
  - [ ] Monitor mempool
  - **Estimate**: 8 hours

- [ ] **4.3 Create Nigiri MCP Server**
  - [ ] Start/stop Nigiri
  - [ ] Faucet operations
  - [ ] Mining control
  - **Estimate**: 6 hours

### Agent Specialization

- [ ] **5.1 Create Specialized Agent Instructions**
  - [ ] QA Agent (focus on testing, troubleshooting)
  - [ ] Dev Agent (focus on architecture, code)
  - [ ] Debug Agent (focus on logs, errors)
  - [ ] Docs Agent (focus on documentation updates)
  - **Estimate**: 4 hours

- [ ] **5.2 Implement Agent Context Loading Rules**
  - [ ] Define priority and context limits per agent
  - [ ] Implement filtering logic
  - [ ] Add agent-specific prompts
  - **Estimate**: 3 hours

### Voice & Notification System

- [ ] **6.1 Voice Notifications for Long-Running Tasks**
  - [ ] Integration test completion
  - [ ] Simulation complete
  - [ ] Build failures
  - [ ] Deployment confirmations
  - **Estimate**: 4 hours

- [ ] **6.2 Slack/Discord Notifications**
  - [ ] Stale documentation alerts
  - [ ] Build failures
  - [ ] Deployment events
  - **Estimate**: 3 hours

### Command System

- [ ] **7.1 Create Unified Command Files**
  - [ ] `arkd-status.md` - Check arkd server status
  - [ ] `run-e2e-tests.md` - Execute E2E test suite
  - [ ] `deploy-testnet.md` - Deploy to testnet
  - [ ] `run-simulation.md` - Run load test simulation
  - **Format**: Executable .md files with embedded code
  - **Estimate**: 6 hours

---

## 📊 Current Progress Tracking

### Completed ✅

- ✅ **Documentation Generation** (All 11 projects)
  - arkd, go-sdk, wallet, ark-faucet, ark-simulator
  - ark-telemetry, ark-infra, kms-unlocker, fulmine
  - ark-docs, arkade-escrow
  - Total: 143 documentation files created

- ✅ **Main INDEX.md Registry**
  - Comprehensive project metadata
  - Dependency graph
  - Correlation matrix
  - Agent routing guidelines

- ✅ **PAI System Analysis**
  - Deep analysis of PAI architecture
  - Applicable concepts identified
  - Implementation roadmap created

### In Progress ⏳

- ⏳ **Phase 1: Foundation** (0% complete)
  - Environment variable system design
  - Metadata schema defined

### Blocked 🚫

- None currently

---

## 🎯 Sprint Goals

### Current Sprint (Week 1): Foundation
**Goal**: Complete portable path system and metadata tracking
**Duration**: Oct 16-22, 2025
**Success Criteria**:
- All environment variables defined and documented
- All INDEX.md files updated with env var references
- Metadata added to all project INDEX.md files
- Validation script working
- change-log structure created

**Estimated Effort**: 10 hours

### Next Sprint (Week 2): Automation
**Goal**: Implement freshness detection and sync automation
**Duration**: Oct 23-29, 2025
**Success Criteria**:
- Freshness checker working for all projects
- Sync command implemented and tested
- Context loader hook functional
- Git hooks template created

**Estimated Effort**: 14 hours

### Future Sprint (Week 3-4): CI/CD
**Goal**: Automated documentation pipeline
**Duration**: Oct 30 - Nov 12, 2025
**Success Criteria**:
- GitHub Actions workflows deployed
- Auto-sync on commit working
- Documentation always up-to-date

**Estimated Effort**: 16 hours

---

## 📝 Notes & Decisions

### Architecture Decisions

**Decision 1**: Use environment variables instead of config file
**Rationale**: Simpler, works with existing shell workflows, no parsing needed
**Date**: 2025-10-16

**Decision 2**: TypeScript/Bun for automation scripts
**Rationale**: Same stack as PAI, fast execution, good tooling
**Date**: 2025-10-16

**Decision 3**: Metadata in YAML frontmatter of INDEX.md
**Rationale**: Keep metadata with documentation, no separate files
**Date**: 2025-10-16

### Open Questions

- **Q1**: Should sync be automatic on every commit or manual?
  - **Options**:
    - A) Auto-sync via git hooks (aggressive, always fresh)
    - B) Lazy sync on agent query (efficient, may be stale)
    - C) Scheduled sync (daily/weekly via cron)
  - **Decision**: TBD - test with option B first

- **Q2**: Where should sync scripts run?
  - **Options**:
    - A) Developer machine (local automation)
    - B) CI/CD server (centralized)
    - C) Dedicated doc server
  - **Decision**: TBD - likely B for production, A for development

- **Q3**: How to handle multi-repo documentation dependencies?
  - **Example**: arkd docs reference go-sdk concepts
  - **Options**:
    - A) Copy relevant sections (duplication)
    - B) Cross-reference with links (DRY)
    - C) Generate combined docs
  - **Decision**: TBD - currently using option B

---

## 🔗 Related Documentation

- **PAI Analysis**: `/PAI_ANALYSIS.md` - Deep dive into PAI concepts
- **Main Index**: `/docs/INDEX.md` - Project registry and routing
- **Project Docs**: `/docs/projects/{project}/INDEX.md` - Individual project documentation

---

## 🤝 Contributing

When picking up tasks:
1. Update task status from `[ ]` to `[⏳]` (in progress)
2. Create branch: `feature/task-{number}-{description}`
3. Complete work and update task to `[✅]`
4. Document any decisions or blockers in Notes section
5. Create PR with link to this TODO item

---

## 📈 Metrics & Goals

### Q4 2025 Goals
- ✅ Complete documentation for all 11 projects
- 🎯 Implement foundation (Phase 1)
- 🎯 Implement automation (Phase 2)
- 🎯 Deploy CI/CD pipeline (Phase 3)

### Success Metrics
- **Documentation Coverage**: 100% (achieved ✅)
- **Documentation Freshness**: Target < 24 hours lag (pending)
- **Agent Context Load Time**: Target < 2 seconds (pending)
- **False Positive Rate**: Target < 5% for freshness detection (pending)

---

**Last Review**: 2025-10-16
**Next Review**: 2025-10-23
**Owner**: Arkadian Team
