# Arkadian   Project Index & Registry

This is the **master index** for all projects in the Arkade ecosystem. It provides a machine-readable registry with project metadata, dependencies, and routing hints for AI agents.

---

## Project Registry

### arkd
**ID**: `arkd`
**Name**: Arkd Server
**Type**: Core Infrastructure
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md`
**Repository**: `${ARKD_REPO}`
**GitHub**: `${ARKD_GITHUB}`

**Description**:
Bitcoin Ark protocol server implementation that enables fast, low-cost off-chain transactions while maintaining Bitcoin's security guarantees. The server acts as an Arkade Operator, creating and managing Batch Outputs (VTXOs), facilitating off-chain transactions through rounds, and providing liquidity for commitment transactions. Uses hexagonal architecture with strict layering (domain, application, infrastructure).

**Key Capabilities**:
- VTXO (Virtual Transaction Output) management and lifecycle
- Round-based batch settlement (every 10-30 seconds)
- Covenantless Bitcoin architecture (no consensus changes required)
- Onchain boarding and offchain payment processing
- Collaborative and unilateral exit mechanisms
- Arkade Assets: UTXO-native fungible/non-fungible token protocol with teleport transfers (boarding UTXOs are asset-aware in batch sessions)
- CEL-based programmable fee system with admin management APIs
- Liquidity analysis and manual sweep admin tools
- gRPC and REST API interfaces (Protobuf/OpenAPI breaking-change policy in `api-spec/BREAKING_CHANGES.md`)
- Multiple database backends (PostgreSQL 17.8 in regtest, with auto-creation, plus SQLite, Badger)
- Multiple cache backends (Redis, in-memory)
- Embedded client SDK (`pkg/client-lib`, Go package `wallet`) with `Wallet` interface and pluggable `Identity` (key-based), `WithIdentity` ServiceOption, `WithKeys` signing option, `WithReceiver` destination/change-address override, and `WithTxOutsTaprootTree` SendOption that attaches BIP-371 `TaprootTapTree` bytes (via `txutils.TapTree(...).Encode()`) to ark-tx PSBT outputs keyed by hex-encoded `pkScript` — `SendOffChain` errors on unmatched keys to surface the silent VTXO-spending footgun
- Pooled gateway connections for streaming RPCs (`ARKD_STREAM_CONN_POOL_SIZE`, default 4, max 64): each pooled `grpc.ClientConn` carries its own HTTP/2 `MAX_CONCURRENT_STREAMS` budget and `splitConn` round-robins `NewStream` calls across the pool, multiplying effective concurrent-stream capacity
- CEL-based indexer subscription filters: `GetSubscription`/`UpdateSubscription` accept a flattened `SubscriptionFilter` combining OR-evaluated CEL `expressions` (matched against each tx's ARK OP_RETURN extension via the internal `txfilter` package) with `add`/`remove` script filters; updates are atomic and tx-only subscriptions survive script clearing

**Tags**: `ark`, `protocol`, `server`, `vtxo`, `rounds`, `bitcoin`, `layer2`, `grpc`, `rest-api`, `postgresql`, `sqlite`, `redis`, `assets`, `teleport`, `fees`, `cel`, `client-lib`, `sdk`, `indexer`, `subscription`

**Synonyms**: `ark-server`, `arkd-server`, `ark-daemon`, `operator`

**Triggers**:
- **ask_question**: `vtxo`, `rounds`, `settlement`, `boarding`, `offchain`, `ark protocol`, `how does ark work`, `arkade assets`, `fees`, `teleport`
- **develop**: `add endpoint`, `new database`, `migration`, `grpc service`, `round logic`, `asset`, `fee program`
- **test_or_run**: `start arkd`, `run rounds`, `integration test`, `e2e test`, `simulation`
- **debug**: `vtxo not found`, `round failed`, `settlement error`, `database issue`
- **monitor_or_alert**: `arkd metrics`, `round latency`, `vtxo expiry`

**Dependencies**: `arkd-wallet`, `go-sdk` (protocol implementation)
**Depended On By**: `go-sdk`, `wallet`, `ark-faucet`, `ark-simulator`, `ark-telemetry`

---

### go-sdk
**ID**: `go-sdk`
**Name**: Ark Go SDK
**Type**: Client Library
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md`
**Repository**: `${GO_SDK_REPO}`
**GitHub**: `${GO_SDK_GITHUB}`

**Description**:
Go client library for building Ark wallets and applications. Provides high-level abstractions for wallet operations, VTXO management, transaction building, and arkd server communication. Implements the Ark protocol client-side logic with support for multiple storage backends (SQLite, PostgreSQL, Badger).

**Key Capabilities**:
- Wallet initialization and key management (BIP39, BIP32)
- Send and receive Ark payments (onchain and offchain)
- VTXO lifecycle management (creation, renewal, expiry)
- Ark address generation (Taproot-based)
- Round participation and settlement handling
- Boarding (onchain to offchain) and redemption (offchain to onchain)
- Intent fee estimation and automatic fee handling in coin selection
- Auto-finalization of pending transactions
- Expiry threshold configuration for Settle and CollaborativeExit
- Event stream topic management (UpdateStreamTopics)
- Multiple storage backends with unified interface
- gRPC-only client for arkd communication (REST removed)

**Tags**: `sdk`, `wallet`, `client`, `library`, `vtxo`, `ark`, `go`, `grpc-client`, `bip39`, `taproot`, `fees`, `auto-finalize`

**Synonyms**: `ark-sdk`, `go-client`, `wallet-sdk`

**Triggers**:
- **ask_question**: `how to build wallet`, `sdk usage`, `client library`, `integrate ark`
- **develop**: `add feature to sdk`, `new storage backend`, `wallet operation`
- **test_or_run**: `sdk example`, `test wallet`, `alice to bob example`

**Dependencies**: `arkd` (server communication)
**Depended On By**: `ark-faucet`, `ark-simulator`, `kms-unlocker` (indirectly via arkd)

---

### wallet
**ID**: `wallet`
**Name**: Arkade Wallet (PWA)
**Type**: End-User Application
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/wallet/INDEX.md`
**Repository**: `${WALLET_REPO}`
**GitHub**: `${WALLET_GITHUB}`

**Description**:
Self-custodial Bitcoin wallet delivered as a Progressive Web App (PWA). Built with React 18, TypeScript, and Vite, using a custom in-tree component library (Ionic React was removed in PR #534). Provides a user-friendly interface for Ark protocol operations including VTXOs, off-chain payments, Lightning swaps via Boltz, LNURL receives, and on-chain boarding. Installable on mobile (iOS, Android) and desktop without app store gatekeepers.

**Key Capabilities**:
- Create and restore wallets (BIP39 seed phrases) — new wallets use `MnemonicIdentity` (BIP86 Taproot) backed by a 12-word mnemonic encrypted in `localStorage` via PBKDF2 + AES-GCM; legacy wallets keep using `SingleKey` from a raw private key. `Restore` auto-detects 12-word mnemonic vs nsec/hex; `Backup` shows the recovery phrase for mnemonic wallets and the nsec for legacy wallets; password change in `Settings → Password` re-encrypts the mnemonic for mnemonic wallets. Service-worker boot path sends the raw mnemonic + `isMainnet` to `wallet-service-worker.ts` so the worker builds `MnemonicIdentity` internally for signing. All wallets use `walletMode: 'static'` (no address rotation). LNURL session secret for mnemonic wallets is the BIP86-derived 32-byte key (Nostr backup key == wallet signing key). (PR #624)
- Send and receive Bitcoin (onchain and offchain via Ark)
- Redesigned Send (pill Paste/Scan, Max-tap confirmation, animated overlays) and Receive v2 (styled QR, tap-to-copy)
- VTXO management, coin control, and expiry threshold handling
- Lightning Network swaps via SwapManager (submarine, reverse submarine, chain swaps via Boltz)
- LNURL receive via lnurl-server SSE session (amountless Lightning receives); session owned by app-level `LnurlProvider` so it survives navigation away from Receive (PR #559); credentials derived deterministically via `HMAC-SHA256(privateKey, "lnurl-session")` — only `token` sent to lnurl-server, server computes `sessionId = SHA-256(token).slice(0, 32)`
- Swap restoration from Boltz endpoint
- Bulk submarine recovery in Apps → Boltz → Settings (scan + per-row sweep via `@arkade-os/boltz-swap` recovery API)
- Lightning invoice limit validation in Send form (rejects below-min / above-max from `LimitsContext`)
- Nostr-based encrypted wallet backups (chunked for relay compatibility)
- In-app announcements and Chatwoot customer support (with git-commit custom attribute)
- Keyboard navigation, URL hash deep-linking, prefers-reduced-motion support
- JS/JIT capability detection for restricted environments
- Fees provider for on-chain and collaborative exit fee estimation
- Fiat currency symbol-prefix display (`$100.00`, `€50.00`, `¥1,000`); CHF/CNY keep trailing-code form
- Pill navbar overlay shown only on root pages (Wallet/Apps/Settings)
- PWA safe-area handling restored — installed iOS PWAs no longer render beneath the status bar; `::part(scroll)` legacy selectors removed
- bigint-based asset amounts (`AssetOption.balance`, asset metadata `supply`, tx amounts) with new `prettyAssetAmount` formatter; non-negative integer clamps on Burn/Mint/Reissue/Send/Receive inputs
- Boltz swaps tagged with `arkade-money` referralId (provider + service-worker arkadeSwaps); mainnet endpoint switched to `https://api.boltz.exchange`
- Design token system (`src/tokens.css`) with full color ramps (50–950) and `color-mix(in oklab)` neutrals for automatic light/dark adaptation under `html.palette-dark`
- Tailwind CSS v4 (`tailwindcss` ^4.2.2 + `@tailwindcss/vite`) with token-driven `@theme` block in `src/app.css`; `cn()` helper combining `clsx` + `tailwind-merge`; `class-variance-authority` available for variant-driven components
- Toast notifications migrated to `sonner` (^2.0.7) — `useToast()` hook still returns `{ toast }` for call-site compatibility; centered top placement with rich colors and project-scoped CSS
- 55 shadcn/ui primitives available under `src/components/ui/` (PR #590) using `base-nova` style + `lucide` icons; `@/*` path alias in `tsconfig.json` + `vite.config.ts`; existing screens unchanged — primitives available for future migrations
- Core components migrated to shadcn primitives (PR #593) — `Modal` now uses Framer Motion `AnimatePresence` with controlled `open`/`onOpenChange`/`onExitComplete` props; `Checkbox` wraps shadcn `Checkbox` (label-bound, same-state guard); `Select` migrated to shadcn `RadioGroup`; `Toggle` uses shadcn `Switch` with new `lg` size variant (iOS-like three-layer shadow, 44 px tap target). `MAX_DECIMALS` raised to 8. Split `vitest.config.ts` from `vite.config.ts`. Uses `cmdk-base`/`vaul-base` and `@base-ui/react`. `bun.lock` restored for Cloudflare Pages.
- Optional HTTP Basic Authorization (PR #619) — gated on `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` env vars. New `functions/_middleware.ts` Cloudflare Pages edge middleware uses `crypto.subtle.timingSafeEqual` for production; new `plugins/vite-plugin-basic-auth.ts` (timing-safe Node `crypto.timingSafeEqual`) registered first in `vite.config.ts` for dev/preview servers. Both are no-ops when either env var is unset.
- LNURL recognised by paste/scan input — `InputAddress` adds `isValidLnUrl` to the recognised-data set so LNURL strings activate the paste button (PR #620); new LNURL unit tests in `src/test/lib/address.test.ts`.
- `lightning:` URI prefix recognised by paste/scan input — `InputAddress.isAddress` strips the `lightning:` prefix and validates the remainder via `isLightningInvoice` so prefixed BOLT11 invoices activate the paste button (PR #625); the predicate also factors out `lowerData = data.toLowerCase()` so each check runs against the same lowercased string.
- Service worker init refactored to AbortController-per-session (PR #613) — replaces the prior generation-counter; lock/reset aborts the current signal with reason `'lock-reset'`, a new init aborts the previous with `'init'`; `initSvcWorkerWallet` now accepts `identity?: SingleKey` (or legacy `privateKey`), returns `Promise<boolean>`, and supports `skipMigration: true` (used by `restartWallet`)
- Non-blocking boarding settlement UX (PR #556) — `WaitingForRound` full-screen blocking overlay deleted; boarding (Transaction.tsx) shows an inline purple Info banner with `LoadingIcon`, VTXO rollover (Vtxos.tsx) shows inline "Renewing" banner, mainnet send (Send/Details.tsx) uses `LoadingLogo`; `LoadingIcon` `small` size 32→20px
- E2E testing with Playwright using shared `arkade-regtest` submodule + `nak` Nostr relay
- Multi-arch Docker build (amd64 + arm64) via GHCR
- Progressive Web App features (installable, offline-capable)
- Dev mode toggle (triple-tap loading logo, `DevModeProvider` + `localStorage`) + Contracts screen under Settings → Advanced (lists `ContractManager` contracts with type/state/shortened address+script; PR #618)
- BIP21 unified copy: Receive QR copy button copies the unified BIP21 URI immediately (PR #617); BIP21 asset-amount validation + integer-clamp on Burn/Mint/Reissue/Send/Receive asset inputs and new `prettyAssetAmount(amount, decimals, useGrouping?)` formatter from PR #611 (bigint whole/fractional split fixes `1.5 USDT` truncation). `prettyAssetNumber` hardened (PR #626) to strip non-digit/non-`-` characters from the integer part and default `maximumFractionDigits` to `MAX_DECIMALS` (8).
- @arkade-os/sdk 0.4.28 and @arkade-os/boltz-swap 0.3.33
- E2E scripts use `cross-env` so `VITE_NOSTR_RELAY_URL=...` works on Windows shells too (PR #624)

**Tags**: `wallet`, `pwa`, `react`, `typescript`, `tailwindcss`, `design-tokens`, `sonner`, `shadcn`, `lucide`, `mobile`, `desktop`, `vtxo`, `lightning`, `boltz`, `lnurl`, `self-custodial`, `offline`, `indexeddb`, `nostr`, `playwright`, `chatwoot`, `announcements`, `arkade-regtest`, `service-worker`, `abortcontroller`, `bip39`, `bip86`, `mnemonic`, `taproot`, `pbkdf2`, `aes-gcm`

**Synonyms**: `arkade-wallet`, `web-wallet`, `pwa-wallet`, `client-app`

**Triggers**:
- **ask_question**: `how to use wallet`, `pwa features`, `lightning swap`, `lnurl receive`, `install wallet`, `nostr backup`, `announcements`
- **develop**: `add wallet feature`, `fix ui bug`, `update sdk version`, `playwright test`, `swap manager`, `lnurl session`, `pill navbar`
- **test_or_run**: `start wallet dev server`, `build pwa`, `test components`, `playwright`, `e2e test`, `arkade-regtest`, `regtest:start`

**Dependencies**: `@arkade-os/sdk` (0.4.28, JavaScript SDK), `@arkade-os/boltz-swap` (0.3.33), `@tanstack/react-virtual` (^3.13.19), `tailwindcss` (^4.2.2, with `@tailwindcss/vite`), `clsx` (^2.1.1), `tailwind-merge` (^3.5.0), `class-variance-authority` (^0.7.1), `sonner` (^2.0.7), `arkd` (server connection), `nostr-tools`
**Depended On By**: None (end-user application)

---

### ark-faucet
**ID**: `ark-faucet`
**Name**: Ark Faucet
**Type**: Service/Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-faucet/INDEX.md`
**Repository**: `${ARK_FAUCET_REPO}`
**GitHub**: `${ARK_FAUCET_GITHUB}`

**Description**:
Offchain-only wallet service that provides HTTP APIs for distributing Ark coins to both onchain and offchain addresses. Supports covenant (Liquid) and covenantless (Bitcoin) modes. Used for testnet distributions, developer testing, and onboarding new users to the Ark ecosystem.

**Key Capabilities**:
- Public faucet endpoint (no auth required)
- Protected admin endpoints (balance, refill)
- Basic authentication for admin operations
- Note-based refill system (mints notes via arkd admin API)
- Offchain-only wallet (no direct blockchain interaction)
- Dual network support (Bitcoin/Liquid)
- Docker deployment ready

**Tags**: `faucet`, `testnet`, `distribution`, `http-api`, `offchain`, `wallet-service`, `notes`

**Synonyms**: `testnet-faucet`, `coin-dispenser`

**Triggers**:
- **ask_question**: `how to get testnet coins`, `faucet usage`, `refill faucet`
- **develop**: `add faucet feature`, `rate limiting`
- **test_or_run**: `start faucet`, `test distribution`

**Dependencies**: `arkd` (server connection), `go-sdk` (wallet operations)
**Depended On By**: Developers and testers needing testnet coins

---

### ark-simulator
**ID**: `ark-simulator`
**Name**: Ark Simulator
**Type**: Testing/Simulation Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-simulator/INDEX.md`
**Repository**: `${ARK_SIMULATOR_REPO}`
**GitHub**: `${ARK_SIMULATOR_GITHUB}`

**Description**:
Simulation tool for testing Ark protocol under various load conditions. Creates multiple concurrent wallet clients that perform send/receive operations to stress-test arkd server performance, round settlement, VTXO management, and network throughput. Used for performance testing, capacity planning, and regression detection.

**Key Capabilities**:
- Concurrent client simulation (5-128+ clients)
- Automated send/receive cycles
- Round participation testing
- Performance metrics collection
- Configurable test scenarios (client count, transaction amounts, duration)
- Integration with arkd test environment
- Docker-based test orchestration

**Tags**: `simulation`, `testing`, `load-test`, `performance`, `stress-test`, `e2e`, `concurrent-clients`

**Synonyms**: `load-tester`, `performance-test`, `stress-test`

**Triggers**:
- **test_or_run**: `run simulation`, `load test`, `stress test arkd`, `performance test`
- **develop**: `add simulation scenario`, `modify test parameters`
- **monitor_or_alert**: `simulation metrics`, `throughput measurement`

**Dependencies**: `arkd` (server under test), `go-sdk` (client wallets)
**Depended On By**: CI/CD pipelines, performance monitoring

---

### ark-telemetry
**ID**: `ark-telemetry`
**Name**: Ark Telemetry
**Type**: Observability/Monitoring
**Language**: Go (instrumentation) + YAML (config)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-telemetry/INDEX.md`
**Repository**: `${ARK_TELEMETRY_REPO}`
**GitHub**: `${ARK_TELEMETRY_GITHUB}`

**Description**:
OpenTelemetry-based observability stack for Ark protocol monitoring. Provides metrics, traces, logs and continuous profiles collection from arkd and related services. Includes Prometheus for metrics storage, Grafana for visualization, Loki for log aggregation, Jaeger for distributed tracing, and Pyroscope for continuous profiling. As of PR #9 (May 2026) the stack is deployed on a **standalone EC2 instance**, separate from the application host, with metrics segmented by `host_role` (`app` vs `telemetry`).

**Key Capabilities**:
- OpenTelemetry instrumentation for arkd
- Prometheus metrics collection and alerting (alerts split per `host_role`: `*_App` vs `*_Telemetry`)
- Grafana dashboards (host metrics & cAdvisor segmented by `host_role`, rounds, VTXOs, transactions, performance)
- Loki log aggregation and querying
- Jaeger distributed tracing
- Pyroscope continuous profiling (ingest port 4040)
- Pre-built dashboards for common monitoring scenarios
- Alert rules for critical conditions, routed by `host_role` label
- Docker Compose stack for easy deployment on a dedicated EC2 telemetry host
- Grafana Google SSO/OAuth (`GF_AUTH_GOOGLE_*`); ALB-fronted on port 3000
- Centralized configuration via `.env.ark-telemetry` env file

**Tags**: `observability`, `monitoring`, `metrics`, `logs`, `traces`, `profiling`, `opentelemetry`, `prometheus`, `grafana`, `loki`, `jaeger`, `pyroscope`, `ec2`, `google-sso`

**Synonyms**: `monitoring`, `observability-stack`, `telemetry`

**Triggers**:
- **monitor_or_alert**: `arkd metrics`, `view dashboards`, `check alerts`, `query logs`, `trace requests`
- **test_or_run**: `start telemetry stack`, `grafana setup`
- **debug**: `check logs`, `view traces`, `investigate errors`

**Dependencies**: `arkd` (instrumented service)
**Depended On By**: Operations, SRE, debugging workflows

---

### arkana-knowledge
**ID**: `arkana-knowledge`
**Name**: Arkana Knowledge Base
**Type**: AI Assistant Configuration / Knowledge Base
**Language**: Markdown + TypeScript + Bash
**Index**: `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/INDEX.md`
**Repository**: `${ARKANA_KNOWLEDGE_REPO}`
**GitHub**: `ArkLabsHQ/arkana-knowledge`

**Description**:
Configuration, knowledge base, and audit trail for **Arkana**, Ark Labs' always-on AI assistant deployed on a private Hetzner VPS. Contains 16 active agent system prompts, the deep `arkwiki` knowledge base, the MCP server (TypeScript), the Slack bot (TypeScript), GitHub webhook relay (Node.js), shared agent memory, security policies, and infrastructure configs. Arkana monitors repos across ArkLabsHQ and arkade-os, reviews PRs, triages issues, surfaces security findings, and runs scheduled engineering health agents — orchestrated by Paperclip on the Claude Agent SDK.

**Key Capabilities**:
- 16 specialized AI agents (daily-briefing, pr-lifecycle, security-triage, sdk-parity, repo-sync, issue-triage, release-coordinator, research-monitor, onboarding-buddy, team-pulse-weekly, self-improver, docs-auditor, linear-sync, slack-monitor, repo-detector, executive-digest)
- Paperclip orchestration of cron-scheduled and webhook-triggered agent runs
- MCP server (`https://arkana.arkade.sh/mcp`, port 3458) for external AI tool integration
- Slack bot identity `@arkanaai` with channel allowlist enforcement
- GitHub App `arkanaai[bot]` (App ID 2923031) with dual-org auth (ArkLabsHQ + arkade-os)
- Webhook relay (port 3456) for real-time GitHub event processing
- Semantic knowledge base (676MB SQLite, Gemini embeddings, 59+ repos, 6,422+ AST chunks)
- Shared agent memory with executive-digest-queue for non-noisy Slack posting
- Information classification policy (PUBLIC / INTERNAL / CONFIDENTIAL) preventing leakage to public surfaces
- Branch+PR enforcement with `agent/{name}/{date}-{slug}` naming convention
- Protocol-critical code boundary requiring human sign-off on VTXO/signing/forfeit/round/connector/exit changes
- systemd-managed services (paperclip, arkana-mcp, arkana-slack, arkana-webhook-relay)
- Nginx reverse proxy with Let's Encrypt SSL auto-renewal

**Tags**: `ai-assistant`, `knowledge-base`, `claude-agent-sdk`, `mcp-server`, `slack-bot`, `github-integration`, `paperclip`, `agent-configs`, `semantic-search`, `vps`, `automation`, `arkana`, `arklabs`, `monitoring`, `webhook-relay`, `systemd`, `nginx`

**Synonyms**: `arkana`, `arkana-config`, `arkana-brain`, `arkanaai`, `ark-labs-ai`, `arkana-bot`

**Triggers**:
- **ask_question**: `arkana`, `ai assistant`, `agent configs`, `paperclip`, `mcp server`, `arkana brain`, `what does arkana do`, `ark labs ai`, `executive digest`, `arkwiki`
- **develop**: `add agent`, `modify agent prompt`, `mcp server feature`, `slack bot`, `webhook relay`, `arkana config`, `agent config`, `paperclip schedule`
- **test_or_run**: `deploy arkana`, `restart arkana`, `arkana service`, `start mcp`, `start slack bot`, `paperclip run`
- **debug**: `agent failed`, `arkana down`, `mcp error`, `slack bot down`, `webhook missed`, `daily briefing missing`, `paperclip not firing`, `gh-token expired`

**Dependencies**: External services only — Slack API, GitHub API (two Apps), Linear API, Anthropic Claude API / OpenRouter (GLM-5), Gemini API (embeddings)
**Depended On By**: Internal Ark Labs operations (PR review automation, security triage, executive briefings) — not consumed by other Ark protocol projects

---

### arkade-regtest
**ID**: `arkade-regtest`
**Name**: Arkade Regtest
**Type**: Testing Infrastructure / Local Stack Orchestration
**Language**: Bash + Docker Compose
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-regtest/INDEX.md`
**Repository**: `${ARKADE_REGTEST_REPO}`
**GitHub**: `arkade-os/arkade-regtest`

**Description**:
Self-contained regtest environment for Ark protocol development. Orchestrates Nigiri (Bitcoin + Liquid regtest), arkd, arkd-wallet, Fulmine, Boltz Backend, an LND Lightning node, an LNURL server, an Nginx CORS proxy, and the Ark Wallet PWA into a single reproducible Docker Compose stack. Designed to be embedded as a git submodule in projects that need a local Ark test network. Ships shell scripts and Compose files only — no compiled code.

**Key Capabilities**:
- One-command bring-up of the full Ark stack (`./start-env.sh`)
- Nigiri built from source on a pinned branch (deterministic Bitcoin regtest)
- Pluggable arkd via `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` for testing release candidates
- Layered environment loading (`--env <path>` → `../.env.regtest` → `.env` → `.env.defaults`)
- Submodule-first design: auto-discovers parent-repo `.env.regtest`
- Configurable image versions for Fulmine, Boltz, LND, LNURL, Wallet, Nginx
- Fully configurable arkd parameters (round interval, session duration, exit delays, fees, etc.) when in override mode
- Unified wallet setup across both built-in and `ARKD_IMAGE` paths (admin API: seed → create → unlock, with up to 60-attempt sync wait)
- Centralized `ARK_CONTAINER` env (auto-derived: `arkd` in override mode, `ark` for built-in) — overridable for SDK tests that expect a specific container name
- Lightning helper scripts for invoice creation/payment via Boltz LND
- Stop / clean lifecycle scripts (preserve volumes vs full teardown)
- Ready-made GitHub Actions integration pattern with `_build/` cache

**Tags**: `regtest`, `docker-compose`, `nigiri`, `bitcoin`, `ark`, `arkd`, `fulmine`, `boltz`, `lightning`, `lnd`, `submodule`, `e2e`, `integration-test`, `local-stack`, `ci`

**Synonyms**: `regtest-stack`, `ark-regtest`, `regtest-env`, `local-stack`, `arkade-regtest-stack`

**Triggers**:
- **ask_question**: `regtest`, `local stack`, `nigiri`, `start ark locally`, `how to run ark stack`, `submodule regtest`, `ark dev environment`
- **develop**: `bump regtest image`, `add service to regtest`, `modify .env.defaults`, `arkd override mode`, `compose stack`
- **test_or_run**: `start regtest`, `start-env.sh`, `stop-env.sh`, `clean-env.sh`, `run e2e`, `bring up ark stack`, `local boltz`, `ci regtest`
- **debug**: `regtest stuck`, `port in use`, `nigiri build fails`, `arkd override not working`, `boltz lnd not synced`, `clean regtest`

**Dependencies**: `arkd` (server image), `arkd-wallet` (signer image), `fulmine` (image), `boltz-backend` (image), `wallet` (PWA image), Nigiri (upstream)
**Depended On By**: `arkd`, `fulmine`, `go-sdk`, `ts-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet`, `boltz-swap`, `boltz-backend`, CI pipelines (consumed as a submodule)

---

### arkade-wdk
**ID**: `arkade-wdk`
**Name**: Arkade WDK
**Type**: Client Library / Wallet Adapter
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-wdk/INDEX.md`
**Repository**: `${ARKADE_WDK_REPO}`
**GitHub**: `ArkLabsHQ/arkade-wdk`

**Description**:
WDK (Wallet Development Kit) compatible Bitcoin wallet adapter built on top of `@arkade-os/sdk` (currently `0.1.3`), with optional Lightning support via `@arkade-os/boltz-swap`. Implements Tether's WDK `WalletManager` and `WalletAccount` contracts (`@tetherto/wdk-wallet`) so any WDK-based application — most notably React Native apps using `@tetherto/wdk-react-native-provider` — can plug in Ark as its Bitcoin backend. `getAccount(index)` resolves a distinct BIP-86 path (`m/86'/<coin>/0'/0/<index>`, `coin = 0` for bitcoin mainnet, `1` otherwise) and memoises a per-path SDK wallet; the index is a key-derivation leaf, not a role — every account exposes Ark address, boarding address, and Lightning invoice creation from the same underlying wallet. Ships submodules for the bare-kit worklet (`pear-wrk-wdk`), the React Native provider, and an Expo demo app, with local modifications tracked as patches under `./patches/`.

**Key Capabilities**:
- WDK `WalletManagerArkade` (`getAccount`, `getAccountByPath`, `getFeeRates`, `dispose`)
- Per-index BIP-86 wallets: `getAccount(index)` resolves `m/86'/<coin>/0'/0/<index>` and memoises a distinct SDK wallet per path; every account exposes `getAddress()` (Ark address — always), `getBoardingAddress()` (on-chain BTC deposit), and `createLightningInvoice()` (gated on `swapProviderUrl`)
- WDK `WalletAccountArkade` with send/sign/verify/quote and read-only conversion
- Destination auto-detection for Ark address, BTC address, BOLT11 invoices, Lightning addresses, and LNURL
- Lightning receive via `createLightningInvoice()` (HRPC → Boltz reverse swap)
- Lightning send via auto-detected BOLT11 in `sendTransaction()` (Boltz submarine swap)
- LNURL / Lightning-address routing in `sendTransaction()` (`EMAIL` → LNURL ark-address fast path → BOLT11 fallback)
- Utility exports: address detection, BIP21 encode/decode, fees, sat formatting
- RN-side Arkade balance via `WalletAccountArkade.getBalance()` (Esplora REST still used for boarding)
- Incoming-funds subscription via `WalletAccountArkade.subscribeToIncomingFunds(callback)` for RN auto-refresh
- Boltz `referralId: 'arkade-wdk-sdk'` forwarded to `BoltzSwapProvider` (default Boltz API: `https://api.boltz.exchange`)
- RN provider `BitcoinArkadeChainConfig.swapProviderUrl?` and starter app `EXPO_PUBLIC_BOLTZ_SWAP_URL` env var wire Lightning into the React Native chain config
- `npm run release` script (`scripts/release.js`) — tag → `npm publish` → push tag, with tag cleanup on publish failure
- Transaction history via HRPC → SDK
- Patch-based submodule overlay (`scripts/setup-dev.js`, `scripts/generate-patches.js`)

**Tags**: `typescript`, `wallet`, `wdk`, `tetherto`, `react-native`, `expo`, `bitcoin`, `ark`, `vtxo`, `lightning`, `boltz`, `bolt11`, `lnurl`, `bip21`, `submodules`, `npm`

**Synonyms**: `@arkade-os/wdk`, `arkade-wdk-adapter`, `wdk-arkade`, `tether-wdk-arkade`

**Triggers**:
- **ask_question**: `wdk`, `wallet development kit`, `tetherto wdk`, `react native ark wallet`, `arkade wdk`, `boarding offchain lightning account`, `lightning address routing`, `lnurl payment`
- **develop**: `wdk adapter`, `add wdk method`, `walletmanagerarkade`, `walletaccountarkade`, `lnurl helper`, `bip21 helper`, `lightning invoice`, `lnurl routing`, `submodule patch`
- **test_or_run**: `npm test`, `setup:dev`, `generate-patches`, `npm run release`, `release script`, `expo example`, `wdk-starter-react-native`, `EXPO_PUBLIC_BOLTZ_SWAP_URL`
- **debug**: `getfeerates zero`, `balance always zero android`, `bip21 not accepted`, `patch does not apply`, `arkadeSwaps null`, `lnurl payment fails`, `amount mismatch lnurl`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk` 0.4.25), `boltz-swap` (`@arkade-os/boltz-swap` 0.3.29, optional for Lightning), `@tetherto/wdk-wallet`, `@tetherto/wdk` (consumer-side)
**Depended On By**: External WDK-based React Native / Node apps via `@tetherto/wdk-react-native-provider`

---

### arkade-assets
**ID**: `arkade-assets`
**Name**: Arkade Assets
**Type**: Protocol Specification
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-assets/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/arkade-assets`
**GitHub**: `https://github.com/ArkLabsHQ/arkade-assets`

**Description**:
UTXO-native asset system for Bitcoin transactions designed to operate seamlessly within the Ark protocol. Provides complete specification and reference implementation for creating, transferring, and managing digital assets (fungible and non-fungible) both on-chain (Bitcoin) and off-chain (Ark VTXOs). Features teleport transfers for asset continuity across Ark batch swaps, control assets for reissuance, metadata management with Merkle-based verification, and introspection opcodes for smart contract capabilities via Arkade Script.

**Key Capabilities**:
- UTXO-native asset protocol inspired by Runes and Liquid Assets
- Hybrid on-chain/off-chain operation with unified state view
- Teleport transfers for seamless asset movement across Ark batches
- Control assets for token reissuance and metadata updates
- Flexible metadata system with Merkle root verification
- Arkade Script introspection opcodes for smart contracts
- Reference codec implementation in TypeScript
- Indexer for tracking asset state across blockchain
- CLI tools for transaction creation and testing
- Complete examples including NFT game (ArkadeKitties)

**Tags**: `arkade`, `assets`, `protocol`, `specification`, `bitcoin`, `utxo`, `nft`, `tokens`, `teleport`, `metadata`, `smart-contracts`, `arkade-script`, `codec`, `indexer`

**Synonyms**: `arkass`, `arkade-asset-protocol`, `arkade-assets-v1`, `asset-protocol`, `arkade-nft`, `arkade-tokens`, `vtxo-assets`, `teleport-transfers`

**Triggers**:
- **ask_question**: `arkade assets`, `asset protocol`, `teleport`, `control asset`, `metadata`, `arkade script`, `asset id`, `reissuance`, `op_return`, `tlv`, `packet format`, `asset group`, `arkadekitties`
- **develop**: `implement asset`, `create asset`, `add teleport`, `metadata update`, `encode packet`, `decode packet`, `arkade script contract`
- **test_or_run**: `test codec`, `run indexer`, `build docs`, `example transaction`, `cli`
- **debug**: `invalid packet`, `asset not found`, `teleport failed`, `indexer error`, `metadata mismatch`

**Dependencies**: `arkd` (protocol implementation), `wallet` (asset UI)
**Depended On By**: `wallet`, `arkade-explorer` (asset features)

---

### ark-infra
**ID**: `ark-infra`
**Name**: Ark Infrastructure
**Type**: Infrastructure-as-Code
**Language**: HCL (OpenTofu/Terraform) + YAML (Docker Compose)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-infra/INDEX.md`
**Repository**: `${ARK_INFRA_REPO}`
**GitHub**: `${ARK_INFRA_GITHUB}`

**Description**:
Infrastructure-as-Code (IaC) for deploying and managing Ark protocol infrastructure across local, staging, and production environments. Uses OpenTofu (Terraform alternative) for AWS resources and Docker Compose for local development stacks. Includes production-ready configurations for arkd, databases, monitoring, and networking.

**Key Capabilities**:
- OpenTofu modules for AWS infrastructure (EC2, RDS, S3, VPC, ALB)
- Docker Compose stacks for local development
- Multi-environment support (local, dev, staging, prod)
- Database provisioning (PostgreSQL, Redis)
- Multi-AZ HA: 3-AZ VPC (eu-central-1a/1b/1c), Multi-AZ RDS, Multi-AZ Redis with automatic failover
- NAT-per-AZ feature flag (`vpc_nat_per_az`) for HA vs cost-optimized topologies
- RDS Performance Insights and configurable automatic backups (prod: 30 days)
- Network configuration (VPC, security groups, load balancers)
- Monitoring stack deployment (Prometheus, Grafana)
- Centralized container logging to AWS CloudWatch via Docker `awslogs` driver (`/ark/${env}` log group)
- Secret management (AWS Secrets Manager)
- Automated backups and disaster recovery
- Admin dashboard with URL-based deployment via SSM (`Ark-DeployService`)
- Port forwarding to EC2 services and remote hosts (RDS, Redis)
- Image pinning script for running container digest collection
- Deploys arkd / arkd-wallet `v0.9.5` from GHCR (`ghcr.io/arkade-os/arkd*`); Traefik upgraded to `v3.6.14`
- **Telemetry split (2026-05)**: telemetry stack (Grafana, Prometheus, Loki, Jaeger, Alertmanager, Pyroscope, OTLP collector) now runs on a **dedicated EC2 instance in an Auto Scaling Group** provisioned by `modules/ark/telemetry.tf` (Ansible-based bootstrap via `modules/ark/ansible/playbook.yml`); app hosts run only `otel-agent` (`otel/opentelemetry-collector-contrib:0.151.0`) and `cadvisor` (`v0.56.2`) bundled in the Ark Compose stack
- **Shared internet-facing ALB** (`modules/ark/alb.tf`) with HTTPS listener (ACM cert, `ELBSecurityPolicy-TLS13-1-2-2021-06`) routes to Grafana target group (`/api/health` health check); Grafana publicly accessible via `telemetry_grafana_host` with **Google SSO**
- **AWS Cloud Map** service discovery (`modules/ark/service_discovery.tf`) for app → telemetry routing; app `.env.ark` requires `ARK_TELEMETRY_COLLECTOR_ENDPOINT` (e.g. `telemetry.ark-staging.internal:4317`)
- IMDSv2-only, least-privilege IAM (`ark-telemetry-role-${env}`) with scoped `ssm:GetParameter` on `${ssm_prefix}/*` and `servicediscovery:Register/Deregister/ListInstances`; CloudWatch log streams for `otel-agent` and `cadvisor`
- SSM parameter convention migrated to **`secure`-at-end naming** (e.g. `/grafana/google/secure/client-secret`); unified `ssm_prefix` shared by app and telemetry modules
- New `apps/ark/staging/` OpenTofu entry point composes `modules/ark` for the staging stack (S3 backend `ark-dev-terraform-state`, DynamoDB `terraform-state-lock`, VPC/subnet lookups by `Name` tag)
- Developer sandbox sub-accounts now include `aruokhai` alongside `se7enz` (`aws/dev-438465126741/organizations.tf`), each with scoped `sts:AssumeRole` IAM user policies and an `aws.aruokhai` provider alias bootstrapping an IAM admin user
- **arkd on shared ALB (2026-05)**: `modules/ark/arkd.tf` adds three target groups (gRPC `arkdg-*` with `/grpc.health.v1.Health/Check`, SSE streaming `arkds-*`, REST `arkdr-*`) on port 7070; routed by host header (`arkd_hosts`), `content-type: application/grpc*`, and SSE path patterns (`arkd_sse_streaming_endpoint_paths` default `/v1/batch/events`, `/v1/txs`, `/v1/indexer/script/subscription/*`). HTTP/1.1 default (`arkd_http1_support`) to keep ALB negotiation simple; Grafana rule deprioritized to 100. ALB `idle_timeout = 180s` (exceeds arkd 60s SSE heartbeats and Cloudflare's 120s edge timeout); ALB access + connection logs ship to `ark-logs-${env}-${account_id}` S3 bucket (lifecycle by `alb_log_retention_days`, default 30, staging 7)
- Staging now reachable at `staging.arkade.sh` (Route53 zone in `aws/dev-438465126741/route53.tf`, A-record aliases to ALB) and `staging-cf.arkade.sh` (Cloudflare-proxied, TLS Full Strict via new ACM cert with SANs `*.staging.arkade.sh`, `staging-cf.arkade.sh`); Grafana moved to `telemetry.staging.arkade.sh`; `scripts/alb-spot-check.sh` probes gRPC/REST/SSE over HTTP/1.1 and HTTP/2
- **Prod stack live (2026-05-26)**: new `apps/ark/prod/` OpenTofu entry point composes `modules/ark` (env=prod) — S3 backend `ark-prod-terraform-state` + DynamoDB `terraform-state-lock`, VPC/subnet lookup by `Name` tag (`ark-vpc-prod`, `ark-private-*`, `ark-public-*`), app instance `i-0f3d436aad5dbf55e`, `ark_infra_branch`/`ark_telemetry_branch = master`. Reachable at `prod.arkade.sh` (direct A-record alias) and `prod-cf.arkade.sh` (Cloudflare-proxied); Grafana at `telemetry.prod.arkade.sh`; ACM cert SANs `*.prod.arkade.sh`, `prod-cf.arkade.sh`; `alb_log_retention_days = 30`. Prod-account Route53 hosted zone `prod.arkade.sh` added in `aws/prod-982590065524/route53.tf`
- **SSM DB-dump utility** (`Ark-DumpDatabase-${env}`): `aws ssm send-command` runs `pg_dump` on the app instance for `projection|event|nbxplorer`, uploads to `s3://ark-tmp-${env}/db-dumps/` (7-day expiry, AES256, public-access blocked); scoped IAM (`s3:PutObject` on dump prefix, `ssm:GetParameter` on `/ark/${env}/db/*`); dump path `/mnt` to use the data volume. New module S3 bucket `ark-tmp-${env}` lives in `modules/ark/s3.tf`; VPC-endpoint SG refactored to standalone `aws_security_group_rule`s to avoid cross-stack plan drift
- **Google Workspace SAML SSO** per AWS account (prod `982590065524`, dev `438465126741`) with reusable modules `ark-iam-roles` and `ark-gws-sync`
- Four-tier role model with prefix per account (`ArkProd*` / `ArkDev*`): SuperAdministrator, Administrator, Developer, ReadOnly
- Layered guardrail policies (`AdminRestrictions`, `DeveloperRestrictions`, `SSMPortForwarding`): deny secrets, Terraform state mutation, security-tooling tampering, sensitive log groups (`/*secure*`, `/aws/ssm/sessions/*`), and SSM shell sessions for non-SuperAdmins
- Lambda (`secure-gws-aws-sync-{env}`) reconciles GWS group membership to the `Amazon.Role` attribute every 15 min; multi-account aware (preserves sibling-account attributes) and revokes orphaned users
- ABAC enabled via `sts:TagSession`; account ID derived from `data.aws_caller_identity` (no hardcoded account variable); provider `default_tags` standardized (`ManagedBy = "opentofu"`, `Repository`, `Owner`)
- Nix devshell (`flake.nix` + `.envrc`) pinning OpenTofu 1.9.1, Node.js 20, and Python 3 for reproducible local tooling
- Per-developer AWS Organizations sandbox sub-accounts under the dev account (`aws/dev-438465126741/organizations.tf`) with scoped `sts:AssumeRole` IAM user policies for `OrganizationAccountAccessRole`

**Tags**: `infrastructure`, `iac`, `terraform`, `opentofu`, `aws`, `docker-compose`, `deployment`, `devops`, `postgres`, `redis`, `vpc`, `multi-az`, `nat-per-az`, `ssm`, `port-forwarding`, `admin-dashboard`, `cloudwatch-logs`, `awslogs`, `performance-insights`, `traefik`, `ghcr`, `iam`, `sso`, `saml`, `google-workspace`, `federation`, `abac`, `guardrails`, `nix`, `direnv`, `aws-organizations`, `sandbox-accounts`, `alb`, `asg`, `cloud-map`, `service-discovery`, `ansible`, `imdsv2`, `grafana-sso`, `otel-agent`, `cadvisor`, `pyroscope`, `alb-arkd`, `target-groups`, `grpc-alb`, `sse`, `route53`, `cloudflare-proxy`, `acm`, `alb-access-logs`, `s3-logs`, `pg-dump`, `db-backup`

**Synonyms**: `infrastructure-as-code`, `deployment`, `iac`, `terraform-stack`

**Triggers**:
- **develop**: `add infrastructure`, `modify aws resources`, `update compose stack`
- **test_or_run**: `deploy stack`, `provision infrastructure`, `terraform apply`
- **monitor_or_alert**: `infrastructure monitoring`, `resource usage`

**Dependencies**: `arkd`, `ark-telemetry` (deployed services)
**Depended On By**: Production deployments, staging environments

---

### kms-unlocker
**ID**: `kms-unlocker`
**Name**: KMS Unlocker
**Type**: Service/Security Tool
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/kms-unlocker/INDEX.md`
**Repository**: `${KMS_UNLOCKER_REPO}`
**GitHub**: `${KMS_UNLOCKER_GITHUB}`

**Description**:
Automated wallet unlock service with AWS KMS integration. Monitors arkd-wallet for lock state and automatically unlocks using credentials stored in AWS Secrets Manager. Provides production-grade secret management, connection resilience, backup systems (SSM fallback), and graceful degradation.

**Key Capabilities**:
- Automatic wallet unlock on startup and lock detection
- AWS KMS integration for secure credential storage
- AWS Secrets Manager for password retrieval
- SSM Parameter Store fallback (backup system)
- Connection resilience (exponential backoff, circuit breaker)
- Health check endpoint
- LocalStack support for local testing
- Graceful shutdown and cleanup

**Tags**: `security`, `automation`, `wallet`, `kms`, `secrets-manager`, `aws`, `unlock`, `credentials`, `resilience`

**Synonyms**: `wallet-unlocker`, `kms-service`, `secret-management`

**Triggers**:
- **ask_question**: `how to unlock wallet`, `kms integration`, `secret management`
- **develop**: `add unlock logic`, `improve resilience`, `backup system`
- **test_or_run**: `test with localstack`, `integration test`
- **debug**: `unlock failed`, `connection issues`, `kms errors`

**Dependencies**: `arkd-wallet` (wallet service to unlock)
**Depended On By**: Production arkd deployments requiring automated unlocking

---

### fulmine
**ID**: `fulmine`
**Name**: Fulmine
**Type**: Service/Bitcoin Wallet
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md`
**Repository**: `${FULMINE_REPO}`
**GitHub**: `${FULMINE_GITHUB}`

**Description**:
Bitcoin wallet daemon with Lightning Network swap integration via Boltz. Provides both CLI and web interface for wallet management, submarine swaps (onchain → Lightning), and VHTLC (Virtual Hash Time-Locked Contract) support for Ark integration. Built with btcd wallet backend.

**Key Capabilities**:
- Bitcoin wallet operations (send, receive, balance)
- Lightning Network submarine swaps (onchain → Lightning)
- Reverse submarine swaps (Lightning → onchain)
- Chain swaps (Ark ↔ Bitcoin on-chain, no Lightning required)
- Boltz provider integration with swap restoration on restart
- VHTLC support for Ark-Lightning bridge (with renewal and settle APIs)
- Delegator service for VTXO refresh delegation (separate gRPC/REST on port 7002)
- OpenTelemetry observability (traces, metrics, logs) and Pyroscope profiling
- GetVtxos and NextSettlement query APIs
- Web interface for swap management and delegation
- CLI for wallet operations
- SQLite/Badger storage for wallet and swap state
- Docker deployment ready

**Tags**: `wallet`, `lightning`, `swap`, `submarine-swap`, `chain-swap`, `boltz`, `bitcoin`, `vhtlc`, `delegator`, `opentelemetry`, `cli`, `web-interface`, `sqlite`

**Synonyms**: `lightning-wallet`, `swap-service`, `fulmine-wallet`

**Triggers**:
- **ask_question**: `lightning swap`, `submarine swap`, `chain swap`, `how to swap`, `vhtlc`, `delegator`, `delegation`
- **develop**: `add swap feature`, `improve swap logic`, `web ui`, `chain swap`, `delegator`
- **test_or_run**: `start fulmine`, `test swap`, `run web interface`, `e2e test`
- **debug**: `swap failed`, `htlc issues`, `boltz errors`, `chain swap stuck`, `delegation failed`

**Dependencies**: `boltz-backend` (external swap provider), Bitcoin node (btcd/bitcoind)
**Depended On By**: `wallet` (for Lightning swap functionality), users needing Lightning liquidity

---

### boltz-backend
**ID**: `boltz-backend`
**Name**: Boltz Backend
**Type**: External Service/Swap Infrastructure
**Language**: TypeScript/Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-backend/INDEX.md`
**Repository**: `/Users/dusansekulic/code/go/boltz-backend`
**GitHub**: `${BOLTZ_BACKEND_GITHUB}`

**Description**:
Backend infrastructure for Boltz Exchange enabling non-custodial atomic swaps between Bitcoin layers. Provides trustless swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM chains using HTLCs and Taproot. RESTful API for swap creation and monitoring. Hybrid TypeScript + Rust architecture for performance and reliability.

**Key Capabilities**:
- Submarine swaps (Chain → Lightning)
- Reverse submarine swaps (Lightning → Chain)
- Chain swaps (Chain → Chain) across Bitcoin/Liquid/EVM (incl. 0-amount **and underpaid** EVM commitments for chain swaps, which are recorded and routed through `transaction.lockup.failed` → renegotiation; Submarine Swaps still reject underpaid commitments)
- Atomic HTLC-based swaps (non-custodial)
- Taproot cooperative claims/refunds for privacy (with documented `transaction.claim.pending` / `transaction.refund.pending` states)
- 0-confirmation support for small amounts; recomputed on chain-swap renegotiation
- BOLT12 offers and blinded paths (hardened)
- Persisted claim transaction tracking for reverse/chain swaps with FK-enforcing Postgres trigger
- Positive-slippage tolerance via shared `OverpaymentProtector`
- Hardened mempool.space integration (deduplicated, one-decimal-rounded BTC fee estimations)
- Fulmine integration via macaroon auth, `ListVHTLCs`, and `GetVHTLCSpendingTx` (claim Ark tx retrieval for finalized or pending spending txs); configurable periodic vHTLC rescan (`rescanInterval`, default 300s) and manual chain-rescan service path for Ark currencies
- Operational signer control (`DisableSigners` / `EnableSigners` / `GetDisabledSigners` gRPC + `boltzr-cli signer …`) persisted in `disabled_signers` table for granular runtime disable of cooperative and lockup signer paths (replaces `DevDisableCooperative`)
- **gRPC JWT authentication** on the `boltzrpc.Boltz` service via `AuthInterceptor` (PR #1415): tokens persisted in the new `jwt_tokens` table with per-token `allowed_methods` (exact path or `*` / `<service>/*` wildcard) and optional TTL; new RPCs `IssueJwt` / `RevokeJwt` / `ListJwts` / `ListMethods` exposed end-to-end by `boltzr-cli jwt …`; bootstrap admin token written to `<certificates>/admin.jwt` on first start; configured via `[grpc.jwt]` in `boltz.conf` (`disable`, `secretFile`, `adminTokenFile`)
- Optional Liquid 0-conf observation API (`[liquid.chain.zeroConfTool]`) with scheme-selected HTTP polling or WebSocket transport for bridge-quorum-gated lockup acceptance; WebSocket transport supports preemptive reconnects via `rotation_interval_secs` (default `3300`s, `0` disables) to refresh the connection before the server-side TTL drops it
- Single-node Elements RPC integration — the legacy `[liquid.chain.lowball]` backup-node config and `ElementsWrapper` dual-node failover were removed (PR #1417)
- CLI tool to rotate referral API keys
- RESTful HTTP API (v1 and v2) with improved HTTP status codes
- WebSocket real-time swap updates
- PostgreSQL/SQLite storage
- LND and CLN (v26.04.1) integration; Eclair pinned to v0.14.0; Bitcoin Core v31.0; Elements v23.3.3
- Hybrid TypeScript v6 + Rust stack

**Tags**: `swap`, `lightning`, `submarine-swap`, `atomic-swap`, `htlc`, `taproot`, `cooperative-claim`, `bitcoin`, `liquid`, `evm`, `rest-api`, `grpc`, `jwt-auth`, `typescript`, `rust`, `postgres`, `bolt12`, `fulmine-integration`, `mempool-space`, `claim-tracking`, `signer-control`, `zero-conf`, `liquid-zero-conf-tool`, `eclair`

**Synonyms**: `boltz`, `swap-backend`, `swap-provider`, `boltz-exchange`

**Triggers**:
- **ask_question**: `atomic swap`, `submarine swap`, `how to swap chains`, `lightning swap`, `boltz api`
- **develop**: `add swap type`, `improve swap logic`, `api endpoint`, `htlc implementation`
- **test_or_run**: `start boltz backend`, `regtest environment`, `integration test`
- **debug**: `swap stuck`, `htlc timeout`, `lightning payment failed`, `chain lockup failed`

**Dependencies**: Bitcoin node (bitcoind/btcd), Lightning node (LND/CLN), Liquid node (elementsd - optional), PostgreSQL/SQLite
**Depended On By**: `fulmine` (uses Boltz for Lightning swaps), `boltz-swap` (client library), Ark users via fulmine integration

---

### boltz-swap
**ID**: `boltz-swap`
**Name**: Arkade Boltz Swap Library
**Type**: Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/boltz-swap/INDEX.md`
**Repository**: `/Users/dusansekulic/code/fe/boltz-swap`
**GitHub**: `git@github.com:arkade-os/boltz-swap.git`

**Description**:
A production-ready TypeScript library that integrates Boltz submarine swaps into Arkade wallets, enabling seamless Lightning Network payments. Provides bidirectional swaps (Lightning ↔ Arkade) with automated swap monitoring via SwapManager, support for both submarine and reverse swaps, and comprehensive error handling with automatic refund capabilities.

> ⚠️ **Repository deprecated 2026-05-25** — the standalone `arkade-os/boltz-swap` repo no longer accepts issues or PRs. Development moved to the [`arkade-os/ts-sdk`](https://github.com/arkade-os/ts-sdk) pnpm workspace monorepo, which now vendors this package at `packages/boltz-swap/`. The published npm package `@arkade-os/boltz-swap@0.3.32` is unchanged.

**Key Capabilities**:
- Create Lightning invoices that deposit funds into Arkade wallets (reverse swaps)
- Send Lightning payments from Arkade wallets (submarine swaps)
- ARK ↔ BTC chain swaps (on-chain bidirectional)
- Automated background swap monitoring via SwapManager with WebSocket and polling fallback
- Automatic claim/refund execution for swaps with configurable retry and timeout policies
- Invoice decoding and validation with swap limit checking
- Swap fee calculation for both submarine and reverse swaps
- VHTLC (Virtual HTLC) creation, monitoring, and refund handling
- **User-initiated submarine VHTLC recovery** (`inspectSubmarineRecovery`, `scanRecoverableSubmarineSwaps`, `recoverSubmarineFunds`, `recoverAllSubmarineFunds`) — Boltz-amnesia-tolerant inspection and post-CLTV `refundWithoutReceiver` sweep
- **Chain-swap quote acceptance guard** — `quoteSwap` / `getSwapQuote` / `acceptSwapQuote` floor every Boltz `getChainQuote` against the original `response.claimDetails.amount` (or an explicit `minAcceptableAmount` with optional `maxSlippageBps`); non-positive or below-floor quotes throw the new typed `QuoteRejectedError` (reasons `below_floor` / `non_positive` / `no_baseline`) instead of being blind-accepted. Autopilot `transaction.lockupFailed` renegotiation paths use the same floor and wrap rejection via `SwapError.cause`. `QuoteRejectedError` survives SW `postMessage` via a `QUOTE_REJECTED::`-prefixed JSON payload in `Error.message`
- **Unknown-to-Boltz safety net** — SwapManager transitions a swap to terminal `swap.expired` after 10 consecutive Boltz 404s (new `SwapNotFoundError`), notifies subscribers + listeners, and stops polling. Avoids hammering Boltz with requests for swap IDs unknown to the configured endpoint (e.g. after a Boltz endpoint switch)
- **ServiceWorker half-initialized handler recovery** — runtime detects `HandlerNotInitializedError` from the SW message handler (handler reset after SW restart but bus already re-initialized) and transparently re-sends the cached `INIT_ARKADE_SWAPS` payload before retrying the original request
- **Expo background-task subpath** — OS-task helpers live under `@arkade-os/boltz-swap/expo/background` (static imports so Metro's static dependency collector picks them up, #136); `expo-task-manager` and `expo-background-task` are declared as **optional** `peerDependencies` so non-Expo consumers (`/expo` for react-native-web / Node) don't need them
- Persistent swap storage using wallet contract repository
- Event-driven architecture with flexible subscription patterns for swap lifecycle events
- Support for both standard Wallet, ServiceWorkerWallet, and Expo (React Native) implementations

**Tags**: `lightning-network`, `submarine-swaps`, `chain-swaps`, `boltz`, `arkade`, `typescript`, `swap-manager`, `vhtlc`, `submarine-recovery`, `swap-not-found`, `bitcoin`, `payment-integration`, `event-driven`, `websocket`, `invoice-decoding`, `service-worker`, `sw-recovery`, `expo`, `react-native`, `background-task`, `quote-guard`, `quote-rejected`

**Synonyms**: `lightning-swaps`, `arkade-lightning`, `boltz-integration`, `swap-library`

**Triggers**:
- **ask_question**: `lightning swap`, `boltz swap`, `submarine swap`, `reverse swap`, `chain swap`, `arkade lightning`, `vhtlc`, `swap manager`, `lightning invoice`, `lightning payment`, `swap monitoring`, `swap refund`, `swap claim`, `invoice decoding`, `swap fees`, `swap limits`, `submarine recovery`, `recover stranded funds`, `SwapNotFoundError`, `swap unknown to Boltz`, `expo background task`, `defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `quoteSwap`, `getSwapQuote`, `acceptSwapQuote`, `QuoteRejectedError`, `chain swap quote guard`, `minAcceptableAmount`, `maxSlippageBps`
- **develop**: `add lightning`, `integrate boltz`, `implement swap`, `create invoice`, `send lightning`, `monitor swap`, `handle refund`, `swap provider`, `arkade lightning`, `submarine recovery`, `recoverAllSubmarineFunds`, `expo background swap`, `react native swap`, `quote guard`, `quoteSwap options`
- **test_or_run**: `test swap`, `test lightning`, `run swap test`, `integration test`, `e2e swap`, `regtest swap`
- **debug**: `swap failing`, `invoice expired`, `swap timeout`, `refund failed`, `claim failed`, `vhtlc issue`, `swap stuck`, `websocket disconnect`, `stranded funds`, `pre_cltv`, `swap unknown to provider`, `boltz 404`, `swap.expired after endpoint change`, `handler not initialized`, `service worker restart`, `INIT_ARKADE_SWAPS lost`, `expo background task not running`, `metro static dependency`, `expo-task-manager missing`, `#136`, `quote below floor`, `quote rejected`, `adversarial Boltz quote`, `renegotiate quote failed`, `no_baseline`

**Dependencies**: `@arkade-os/sdk` (Arkade Wallet SDK, 0.4.27), Boltz API server, Bitcoin/Lightning infrastructure
**Depended On By**: Arkade PWA wallet, Arkade-powered applications requiring Lightning integration

---

### bancod
**ID**: `bancod`
**Name**: Bancod (Banco Solver Bot)
**Type**: Service/Trading Bot
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/bancod/INDEX.md`
**Repository**: `${BANCOD_REPO}`
**GitHub**: `arkade-os/bancod`

**Description**:
Go implementation of a banco solver bot for the Arkade virtual mempool. Watches the arkd transaction stream for swap offers posted as VTXOs, matches them against configured trading pairs and price ranges, and fulfills them atomically via introspector-signed Arkade transactions. Also supports a stateless preimage-claim plugin using ECIES encryption. Features a plugin-based solver architecture, gRPC+REST API, embedded web UI, CLI client, and SQLite storage.

**Key Capabilities**:
- Banco swap plugin: automated market-making on Arkade virtual mempool
- Preimage claim plugin: stateless ECIES-encrypted VTXO claims (PacketType 0x04)
- Plugin-based solver runtime (pkg/solver) with Filter+Match+Solve interface; per-plugin `solver.Source` subscriptions with optional CEL filter (forward-compatible, arkd-side filtering not yet wired)
- TLV-encoded swap offers (PacketType 0x03) with atomic fulfillment
- Trading pair management (base/quote, min/max amounts, price feed, invert)
- Pluggable price feed with TTL caching (CoinGecko implementation)
- gRPC + REST API (grpc-gateway) on ports 7070/7071
- Embedded web UI for monitoring
- CLI client (banco) for pair management, status, balance
- SQLite trade history and pair configuration persistence
- Docker deployment ready with docker-compose test environment
- Integration tests with nigiri + arkd + introspector stack

**Tags**: `solver`, `swap`, `banco`, `trading`, `market-maker`, `preimage`, `ecies`, `vtxo`, `tlv`, `cel`, `arkade`, `introspector`, `grpc`, `rest`, `web-ui`, `sqlite`, `docker`

**Synonyms**: `banco-solver`, `banco-bot`, `swap-solver`, `banco-daemon`

**Triggers**:
- **ask_question**: `banco swap`, `solver bot`, `swap offer`, `preimage claim`, `trading pair`, `price feed`, `banco protocol`, `PacketType 0x03`, `PacketType 0x04`
- **develop**: `add solver plugin`, `swap logic`, `pair management`, `price feed`, `fulfillment`, `preimage`, `taker`, `maker`
- **test_or_run**: `start bancod`, `test swap`, `integration test`, `setup-test-env`, `run solver`
- **debug**: `swap failed`, `price validation`, `offer not matched`, `introspector error`, `fulfillment failed`, `plugin error`

**Dependencies**: `arkd` (tx stream, wallet), `go-sdk` (Wallet), `introspector` (signing)
**Depended On By**: None (standalone service)

---

### banco
**ID**: `banco`
**Name**: Banco (TypeScript Swap Library)
**Type**: Client Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/banco/INDEX.md`
**Repository**: `${BANCO_REPO}`
**GitHub**: `arkade-os/banco`

**Description**:
TypeScript library (`@arkade-os/banco`) implementing the non-interactive banco swap protocol for Ark. Enables trustless atomic swaps between BTC and assets (or asset-to-asset) on the Ark network without requiring both parties to be online. Uses covenant-based VTXO scripts with Arkade Script introspection opcodes to enforce swap conditions at the protocol level. Supports full fills, partial fills with ratio-based pricing, cancellation via CLTV, and unilateral exit via CSV.

**Key Capabilities**:
- Non-interactive maker/taker swap protocol (maker goes offline after funding)
- Covenant-based VTXO scripts using Arkade Script introspection opcodes
- Three swap types: Asset→BTC, BTC→Asset, Asset→Asset
- Partial fills with ratio-based pricing (ratioNum/ratioDen with GCD reduction)
- TLV offer encoding as Ark Extension packets (PacketType 0x03)
- Maker class: createOffer, getOffers, cancelOffer
- Taker class: fulfill (from hex), fulfillByTxid (from funding tx)
- CLTV cancel path for maker fund recovery
- CSV exit path for unilateral exit safety
- Introspector integration for covenant validation and co-signing (called **Emulator** in the upstream protocol README; SDK and wire format keep the legacy `introspector` name)
- Liveness-only trust model for Operator (arkd) and Emulator (introspector) — covenant binds the spending tx so cosigners cannot redirect funds
- Strict TLV parsing — decoders MUST reject unknown TLV types; wire format is not forward-compatible
- Dual module output (ESM + CJS) with TypeScript declarations
- Published as `@arkade-os/banco` on npm

**Tags**: `swap`, `banco`, `typescript`, `npm`, `covenant`, `arkade-script`, `introspection`, `emulator`, `operator`, `maker`, `taker`, `tlv`, `vtxo`, `atomic-swap`, `partial-fill`, `asset`

**Synonyms**: `@arkade-os/banco`, `banco-sdk`, `banco-lib`, `banco-swap-lib`

**Triggers**:
- **ask_question**: `banco swap`, `non-interactive swap`, `maker taker`, `swap offer`, `covenant script`, `partial fill`, `TLV offer`, `PacketType 0x03`, `emulator`, `operator role`
- **develop**: `swap library`, `maker class`, `taker class`, `offer encoding`, `covenant`, `partial fill`, `ratio`, `fulfill offer`
- **test_or_run**: `pnpm test`, `test:e2e`, `regtest:start`, `vitest`, `build banco`
- **debug**: `offer not found`, `insufficient BTC`, `swapPkScript mismatch`, `cancel failed`, `introspector error`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk`), `introspector` (covenant validation), `arkd` (Ark server)
**Depended On By**: `bancod` (Go solver bot uses equivalent protocol), wallet applications building swap UIs

---

### compiler
**ID**: `compiler`
**Name**: Arkade Compiler
**Type**: Tool/Compiler
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/compiler/INDEX.md`
**Repository**: `${COMPILER_REPO}`
**GitHub**: `${COMPILER_GITHUB}`

**Description**:
Rust-based compiler for the Arkade Script language that transforms `.ark` smart contract source files into JSON artifacts containing Bitcoin Taproot script assembly (ASM). Uses a four-stage pipeline: PEG parsing (pest) → typed AST + semantic validation → code generation (with a bytes-aware `+` rewrite pass) → output validation. Produces dual-variant output (cooperative server path + unilateral exit path) and supports transaction and asset introspection, 64-bit arithmetic, compile-time loop unrolling, identifier-valued timelocks (e.g. `exit = exit`), and a type-dispatched `+` operator that lowers to `OP_CAT` for byte-string concatenation (enabling oracle-signed witness patterns like `sha256(ticker + price + time)`).

**Key Capabilities**:
- Compiles `.ark` source files to JSON with Bitcoin Taproot ASM
- Four-stage pipeline: PEG parser (pest) → AST + `validate_ast` → compiler (with bytes-aware `+` rewrite) → `validate_output`
- Dual-variant compilation: cooperative (server signature) + exit (timelock or N-of-N)
- Exit-leaf pubkey filtering: AST walker (`collect_pubkey_usage_in_{expr,req,stmts}` → `collect_data_only_pubkeys`) classifies each `pubkey` identifier as tx-signing (`checkSig`/`checkMultisig`) vs data-signing (`checkSigFromStack`/`checkSigFromStackVerify`) and excludes data-only pubkeys (oracles) from the N-of-N exit signature chain, so oracle-using contracts remain unilaterally exitable
- 8 data types: pubkey, signature, bytes, bytes20, bytes32, int, bool, asset
- Cryptographic primitives: checkSig, checkMultisig, checkSigFromStack, one-shot `sha256` (OP_SHA256), streaming SHA256
- Type-dispatched `+`: `OP_CAT` for bytes-like operands (with `OP_SCRIPTNUMTOLE64` int coercion), `OP_ADD64` for pure int+int; enables one-shot `sha256(a + b + c)` and oracle-signed message reconstruction on-stack
- Transaction introspection: tx.version, tx.locktime, tx.inputs, tx.outputs, dual clocks `tx.time` (Bitcoin block height) and `tx.offchainTime` (TEE wallclock unix seconds), plus direct-emission `this.activeInputIndex` → `OP_PUSHCURRENTINPUTINDEX` for on-chain self-vs-sibling input identification
- Asset introspection: assetLookup, assetCount, assetAt, group operations
- Compile-time loop unrolling and array flattening
- 64-bit arithmetic with OP_*64 opcodes
- Semantic validation: duplicate-name detection, required-`options.exit` check, CashScript-style require-guard warning, BSST-style ASM structure analysis, placeholder consistency check
- Identifier-valued timelocks (`exit = exit`, `renew = renew`) bound to constructor `int` parameters
- Options primitives library (`examples/options/`): Rysk-faithful single-locked physical CoveredCall and CashSecuredPut. Seller-only collateral lockup, no oracle dependency, buyer's voluntary `exercise()` is the settlement signal; 4 functions × cooperative+exit = 8 tapleaves per contract; pre-expiry transfer guard via `require(tx.time < expiryHeight)`
- CLI tool (`arkadec`) and Rust library (`arkade_compiler`)

**Tags**: `compiler`, `arkade-script`, `rust`, `pest`, `peg`, `bitcoin`, `taproot`, `asm`, `smart-contract`, `introspection`, `opcodes`, `json`, `validator`, `typechecker`, `op-cat`, `byte-concat`, `oracle-witness`, `offchain-time`, `active-input-index`, `funding-rate`, `options`, `covered-call`, `cash-secured-put`, `rysk`, `physical-settlement`, `exit-leaf-filter`, `tx-signing-pubkey`

**Synonyms**: `arkadec`, `arkade-compiler`, `ark-compiler`, `script-compiler`

**Triggers**:
- **ask_question**: `arkade script`, `compiler`, `ark language`, `.ark files`, `contract syntax`, `opcode`, `introspection`, `asset group`, `stability vault`, `op_cat`, `byte concatenation`, `oracle signed`, `oracle witness`, `tx.offchainTime`, `offchain time`, `activeInputIndex`, `merge vault`, `funding rate`, `take fee`, `seeker exit fee`, `basis points`, `covered call`, `cash secured put`, `options contract`, `rysk`, `physical settlement`, `exercise window`, `reclaim`, `exit leaf pubkey`, `oracle pubkey exit`, `n-of-n exit`
- **develop**: `add opcode`, `new language feature`, `update grammar`, `compiler bug`, `expression type`, `validator rule`, `concat`, `op_cat`, `exit leaf filter`, `pubkey classification`
- **test_or_run**: `compile contract`, `cargo test`, `test compilation`, `example contract`
- **debug**: `parse error`, `compilation error`, `unexpected rule`, `asm output wrong`, `validation error`, `validation warning`

**Dependencies**: None (standalone tool)
**Depended On By**: `introspector` (executes compiled Arkade Script), `arkd` (uses compiled contract artifacts)

---

### ark-docs
**ID**: `ark-docs`
**Name**: Ark Documentation
**Type**: Documentation
**Language**: MDX (Markdown + JSX)
**Index**: `${ARKADIAN_DIR}/docs/projects/ark-docs/INDEX.md`
**Repository**: `${ARK_DOCS_REPO}`
**GitHub**: `${ARK_DOCS_GITHUB}`

**Description**:
Official documentation repository for the Ark protocol and ecosystem. Built with Mintlify and published as interactive documentation site. Includes comprehensive guides on Ark core concepts, arkd server, wallet development (v0.3 legacy and the unprefixed latest set), smart contracts (Tapscript and Arkade language), Arkade Assets, and security model. Used as knowledge base for Q&A agents.

**Key Capabilities**:
- Ark protocol core concepts (`learn/core-concepts/`: vtxos-and-ownership, transactions-and-execution, settlement-and-finality, vtxo-lifecycle-and-liveness, security-and-trust-model — slugs match titles; renamed from `learn/concepts/`)
- Arkd server documentation (components, transactions, server-security, core-services with configuration)
- Wallet development (Latest, top-level `wallets/`): getting-started, operations, assets workflows, advanced (settlement-process, ramps, vtxo-management, storage adapters, service worker, Expo/React Native, AI agents) — `v0.4/` prefix removed and old URLs redirected
- Wallet development v0.3 (Legacy): retained for compatibility under `wallets/v0.3/`
- Arkade contracts: deep-dive, Tapscript primitives (escrow, hashlock, Spilman channel, Dryja-Poon channel) and use cases (lightning-swaps, lightning-channels, chain-swaps, oracle-dlc)
- Arkade Assets overview and core concepts (`learn/arkade-assets/`)
- Experimental Arkade language (compiler, functions, non-interactive-swaps)
- FAQ (9 curated questions)
- Top-level **Glossary** tab (`glossary.mdx` promoted from `learn/glossary.mdx`)
- Hidden **Reference** tab (`docs.json` `hidden: true`) with per-SDK overview pages: TypeScript (`@arkade-os/sdk` v0.4), Rust (`ark-rs` v0.9), Go (`arksdk` v0.9), .NET (`NArk` 1.0) — each registered as its own Mintlify product with its own version selector and linking out to GitHub + canonical API docs
- LLM context menu integration (Claude, ChatGPT, Grok, Google AI Studio, generic MCP, Add-MCP one-click install, Cursor, VSCode, Devin, Devin MCP)
- Reusable MDX/JSX snippets (`snippets/agent-context.mdx` enforces Arkade terminology for AI agents; `snippets/outdated-version.jsx` renders the v0.3 → latest redirect banner)
- SEO model: `seo.indexing: "navigable"` with explicit `noindex` on all v0.3 wallet pages
- Tooling: pnpm-based workflow (`packageManager: pnpm@10.33.2`, `pnpm-lock.yaml`), Mintlify ^4.2.542
- Mintlify-powered interactive documentation, auto-published via GitHub

**Tags**: `documentation`, `docs`, `mintlify`, `pnpm`, `ark-protocol`, `arkd`, `wallet-guide`, `wallets-latest`, `core-concepts`, `glossary`, `sdk-reference`, `ts-sdk`, `rust-sdk`, `go-sdk`, `dotnet-sdk`, `tapscript`, `smart-contracts`, `arkade-language`, `arkade-assets`, `faq`, `security`, `llm-context`, `devin-mcp`, `aistudio`, `mcp`, `snippets`, `seo-navigable`

**Synonyms**: `docs`, `documentation-site`, `knowledge-base`, `ark-manual`

**Triggers**:
- **ask_question**: Any Ark protocol question (VTXOs, rounds, security, how it works)
- **develop**: `update docs`, `add documentation`

**Dependencies**: None (standalone documentation)
**Depended On By**: All projects (reference documentation), Q&A agents (knowledge base)

---

### arkade-explorer
**ID**: `arkade-explorer`
**Name**: Arkade Explorer
**Type**: End-User Application/Web App
**Language**: TypeScript/React
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-explorer/INDEX.md`
**Repository**: `${ARKADE_EXPLORER_REPO}`
**GitHub**: `${ARKADE_EXPLORER_GITHUB}`

**Description**:
Modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme. Built with React 18, TypeScript, and Vite, it provides real-time exploration of batch commitment transactions, Arkade transactions, asset details, and VTXO addresses using the Arkade Indexer API. Features smart search (auto-detects txids, outpoints, Arkade addresses, and 68-hex asset IDs), VTXO tree visualization, mempool.space cross-links on commitment transactions, light/dark theme, money unit toggle, real-time activity stream, and asset icon verification. Default network is `bitcoin`.

**Key Capabilities**:
- Batch commitment transaction explorer with batch details, VTXO tree viewer, raw hex, and mempool.space external links (header + input arrows)
- Cross-links on commitment-tx pages: inputs → originating settlement commitment tx (via VTXO `settledBy`); batch outputs → batch root Arkade transaction
- Bitcoin (`bc1p`/`bc1q`) output addresses on commitment txs (rendered as plain text since on-chain)
- Address VTXO explorer with balance statistics, status badges, and pagination; Recoverable badge suppressed on spent VTXOs
- Asset explorer with verified asset icon system; ticker+icon (`AssetAmountDisplay`) and extension-type badges (`AssetBadge`) across tx outputs/inputs and the Packet section
- Smart search (auto-detects 64-hex txids, `txid:vout` outpoints, `tark1`/`ark1` addresses, and exactly-68-hex asset IDs); palette opens unconditionally on mobile and desktop
- Real-time activity stream on homepage (event types: `batch | vtxo | transaction`)
- Light/dark theme toggle with persistent preference
- Money display unit toggle (sats/BTC)
- 5 React Context providers (Theme, MoneyDisplay, ServerInfo, ActivityStream, AssetIconApproval)
- TanStack Query for data fetching and caching
- Multi-arch Docker deployment via GHCR (`linux/amd64` + `linux/arm64`)
- Responsive design (mobile + desktop)

**Tags**: `explorer`, `blockchain`, `vtxo`, `transactions`, `assets`, `react`, `typescript`, `vite`, `tailwindcss`, `indexer`, `web-app`, `frontend`, `theme`, `docker`, `pnpm`

**Synonyms**: `ark-explorer`, `block-explorer`, `tx-explorer`, `vtxo-explorer`

**Triggers**:
- **ask_question**: `view transaction`, `check vtxo`, `explore address`, `explore asset`, `transaction details`, `block explorer`
- **develop**: `add explorer feature`, `fix ui bug`, `update sdk version`, `new transaction view`, `asset page`
- **test_or_run**: `start explorer`, `build explorer`, `dev server`, `preview build`, `docker explorer`
- **debug**: `transaction not found`, `vtxo status wrong`, `api error`, `loading issue`, `asset icon not showing`

**Dependencies**: `@arkade-os/sdk` (^0.4.0-next.7, TypeScript SDK), Arkade Indexer API (external service), `arkade-assets` (asset protocol data)
**Depended On By**: None (end-user application)

---

### arkade-escrow
**ID**: `arkade-escrow`
**Name**: Arkade Escrow
**Type**: Service/Application
**Language**: TypeScript (NestJS + React)
**Index**: `${ARKADIAN_DIR}/docs/projects/arkade-escrow/INDEX.md`
**Repository**: `/Users/dusansekulic/code/typescript/arkade-escrow`
**GitHub**: `ArkLabsHQ/arkade-escrow`

**Description**:
Lightweight, browser-native escrow platform for instant, trust-minimized Bitcoin deals on Ark. Monorepo with NestJS API server, React client SPA, and React backoffice admin panel. Uses 2-of-3 multisig Virtual Escrow Contracts (VEC) with 6 Taproot spending paths (collaborative and unilateral). Deployable standalone or embedded inside Ark-enabled wallets via iframe.

**Key Capabilities**:
- Virtual Escrow Contract (VEC) with 6 Taproot spending paths
- Escrow request orderbook (public/private listings)
- Full contract lifecycle: request → accept → fund → execute/dispute → settle
- Automated VTXO funding detection (FundingWatcherService)
- Schnorr signature-based authentication (no passwords, JWT tokens)
- React client SPA for escrow users (orderbook, contracts, identity)
- React backoffice SPA for admin/arbitrator (contract management, dispute resolution)
- NestJS REST API with Swagger UI documentation
- Server-Sent Events for real-time contract updates
- SQLite storage with TypeORM (better-sqlite3)

**Tags**: `escrow`, `typescript`, `nestjs`, `react`, `taproot`, `multisig`, `schnorr`, `jwt`, `rest-api`, `swagger`, `sqlite`, `arbitration`, `vec`, `vtxo`, `vite`, `tailwind`

**Synonyms**: `escrow-service`, `3-party-escrow`, `vec-escrow`, `arkade-escrow-api`

**Triggers**:
- **ask_question**: `escrow`, `vec`, `taproot escrow`, `arbitration`, `3-party multisig`, `escrow contract`
- **develop**: `add escrow feature`, `escrow ui`, `contract lifecycle`, `arbitration`, `escrow api`
- **test_or_run**: `start escrow`, `test escrow`, `escrow e2e`, `run escrow`
- **debug**: `psbt error`, `funding not detected`, `execution failed`, `escrow contract error`

**Dependencies**: `arkd` (server connection), `@arkade-os/sdk` (TypeScript SDK for Ark protocol)
**Depended On By**: Arkade wallet (iframe embedding), P2P marketplaces requiring escrow

---

### introspector
**ID**: `introspector`
**Name**: Introspector
**Type**: Service/Co-Signer
**Language**: Go
**Index**: `${ARKADIAN_DIR}/docs/projects/introspector/INDEX.md`
**Repository**: `${INTROSPECTOR_REPO}`
**GitHub**: `${INTROSPECTOR_GITHUB}`

**Description**:
Arkade Script execution and signing microservice for the Ark protocol. Receives Ark transactions (PSBTs) carrying an **Introspector Packet** (a TLV inside an ARK extension OP_RETURN) that lists per-input Arkade Script bytecode + witness, executes those scripts in a custom VM extending Bitcoin Script with 50+ introspection opcodes (incl. unified BigNum arithmetic and packet introspection), and signs transactions upon successful execution. Participates in the Ark round lifecycle (off-chain tx, intent proofs, batch finalization) and also signs onchain Bitcoin PSBTs for unrolled VTXOs (`SubmitOnchainTx`). When this introspector is the last required non-`arkd` signer, it forwards the set to `arkd`, merges its signatures and finalizes.

**Key Capabilities**:
- Arkade Script engine with 50+ custom opcodes (introspection, packet introspection `OP_INSPECTPACKET`/`OP_INSPECTINPUTPACKET`, BigNum arithmetic with `NUM2BIN`/`BIN2NUM`, EC operations, SHA256 streaming, asset introspection)
- Introspector Packet (TLV inside ARK extension OP_RETURN) — per-input script + witness payload (max 1000 entries, script ≤10KB, witness ≤1MB)
- Off-chain Ark transaction validation and Schnorr/Taproot signing; auto-finalization with `arkd` when last non-`arkd` signer
- Onchain VTXO signing via `SubmitOnchainTx` (rejects inputs whose tapscript closure also contains the `arkd` signer pubkey)
- Intent proof validation and signing before round registration
- Batch finalization signing (forfeits and commitment transactions)
- Connector tree validation for forfeit transactions
- gRPC + REST API via meshapi gateway (port 7073)
- Go client library (`pkg/client`) for programmatic access
- Per-script key derivation (tweaked signing keys; `tagged_hash("ArkScriptHash", script)`)
- TLS with auto-generated certificates
- Tapscript signature verification delegated to `ark-lib`
- Fuzz-tested tokenizer, opcodes, and engine

**Tags**: `arkade-script`, `introspection`, `signing`, `co-signer`, `psbt`, `schnorr`, `taproot`, `grpc`, `opcodes`, `bitcoin-script`, `covenant`, `smart-contract`, `bignum`, `introspector-packet`, `onchain-signing`, `fuzz-tested`

**Synonyms**: `arkade-script-engine`, `script-validator`, `co-signer`, `introspector-service`

**Triggers**:
- **ask_question**: `arkade script`, `introspection opcodes`, `script engine`, `co-signing`, `transaction introspection`, `covenant`, `OP_INSPECT`, `OP_INSPECTPACKET`, `bignum arithmetic`, `introspector packet`, `ARK extension`
- **develop**: `add opcode`, `script engine`, `introspector api`, `signing logic`, `finalization`, `onchain signing`, `submitonchain`
- **test_or_run**: `run introspector`, `integration test`, `test arkade script`, `e2e test`, `fuzz arkade`, `htlc test`, `delegate test`
- **debug**: `script execution failed`, `signing error`, `connector not in tree`, `intent not signed`, `arkd url missing`, `last non-arkd signer`

**Dependencies**: `arkd` (ark-lib packages for intent, tree, script, txutils, tapscript signature verification; runtime gRPC connection via `INTROSPECTOR_ARKD_URL` to fetch arkd's signer pubkey and to forward last-signer finalization sets), `go-sdk` (gRPC transport client)
**Depended On By**: `arkd` (uses introspector for Arkade Script validation and signing)

---

### enclave
**ID**: `enclave`
**Name**: Simple Enclave (introspector-enclave)
**Type**: Infrastructure Framework / Security Tool
**Language**: Go (CLI/SDK), Rust (verified client)
**Index**: `${ARKADIAN_DIR}/docs/projects/enclave/INDEX.md`
**Repository**: `${ENCLAVE_REPO}`
**GitHub**: `ArkLabsHQ/enclave`

**Description**:
CLI framework + runtime SDK for deploying any plain HTTP server inside **AWS Nitro Enclaves** with hardware-backed secret management, BIP-340 Schnorr response signing, reproducible Nix-based EIF builds, and a PCR0-locked KMS confidentiality root. Apps need zero enclave-specific code — the runtime supervisor handles attestation, KMS secret decryption, PCR extension, response signing, encrypted storage, and dynamic secrets. As of v0.0.76, the standalone `nitriding.Enclave` struct was folded into `runtime.Runtime`, collapsing the legacy intermediate `:7073` runtime-proxy hop into a single chi mux on `pubSrv :443`; the same mux is also mounted on `privSrv :8080` (was `:7073`) for user-app loopback callbacks. Inbound HTTP/2 + gRPC are supported end-to-end (issue #85): ALPN advertises `h2`/`http/1.1`, the internal `revProxy` uses `http2.Transport` with `FlushInterval = -1`, and response-signing middleware short-circuits for `application/grpc*` and `application/grpc-web*` so streaming RPCs and gRPC trailers survive. The host-side `enclave-supervisor.service` runs as a single binary owning gvproxy (vsock outbound), viproxy (IMDS forwarding), the nitro-cli watchdog, and a localhost management API. Supports Go (1.25+), Node.js (22+), and .NET (10.0+) app templates.

**Key Capabilities**:
- Reproducible EIF builds via pinned NixOS Docker image + `monzo/aws-nitro-util` (byte-identical PCR0 across builders)
- PCR0-locked KMS policy — `kms:Decrypt` only when `RecipientAttestation:PCR0` matches; optional irreversible lockdown (`is_kms_key_locked: true` / `enclave lock`) where even AWS root cannot rewrite the policy
- BIP-340 Schnorr response-signing middleware — every HTTP response carries `X-Attestation-Signature` + `X-Attestation-Pubkey` bound to the attestation document's `UserData` via `appKeyHash`
- PCR16+ extension on boot with `SHA256(compressed_secp256k1_pubkey)` per configured secret
- Locked-key migration — 7-step in-place re-encryption flow (`POST /migrate`, NDJSON streaming) for rotating PCR0 even when the KMS policy is permanently frozen; old enclave inline-creates a migration key (policy locked to `[ownPCR0, newPCR0]` at `CreateKey` time), re-encrypts each secret + storage DEK to **key-scoped** SSM paths `/{dep}/{app}/{secret}/Ciphertext/{kmsKeyId}` via `POST /v1/start-migration`, and the atomic `PutParameter` on `/{dep}/{app}/KMSKeyID` is the commit point. No two-phase `/Migration/*` staging, no `PromoteToPrimary` / `AbortOrphaned`. Supervisor rolls back via EIF backup if the new enclave never reaches `/health=200`.
- Enclave-owned KMS keys — both the primary key (first-boot via `EnsureKeyID`, gated by an `"UNSET"` SSM placeholder written by Tofu) and the migration key (via `CreateMigrationKey`) are minted by the enclave with PCR0-locked policies sealed at `CreateKey` time. The EC2 role no longer holds `kms:PutKeyPolicy`; the supervisor makes no KMS calls.
- Tofu-provisioned PCR0 signing — an `aws_kms_key.pcr0_signing` (`ECC_NIST_P384` / `SIGN_VERIFY`, `prevent_destroy = true`) and a `terraform_data.sign_pcr0` local-exec sign the live PCR0 with `ECDSA_SHA_384` at `tofu apply` time and write Pubkey PEM / PCR0 / Signature to SSM under `/{dep}/{app}/Signing/*`. The runtime's `Signature.Load` reads them on `Init`, and `GET /v1/enclave-info` carries a `pcr0_signature: { pubkey_pem, pcr0_hex, signature_b64 }` block (`omitempty` — absent on deployments where signing isn't provisioned). Independent AWS-rooted PCR0 attestation distinct from NSM; no `signing:` field exists in `enclave.yaml` — provisioning is purely a Tofu-module property.
- OTLP/HTTP-spec telemetry ingest — POST endpoints follow the OTLP spec (`POST /v1/metrics`, `POST /v1/traces`, `POST /v1/logs`) so a stock OTEL SDK exporter works without URL overrides; introspection GETs keep the `enclave-` prefix (`GET /v1/enclave-{metrics,traces,logs}`).
- PCR0 attestation chain — each version records its predecessor's PCR0 + an NSM signed proof (`previous_pcr0` is `"genesis"` on first boot); `enclave verify` walks the chain against the AWS Nitro root. Runtime no longer enforces a baked-in predecessor PCR0 — that value is still measured into PCR0 for external auditors but is not validated at startup
- Encrypted persistent storage — `PUT/GET/DELETE/LIST /v1/storage/{key}` backed by S3 + AES-256-GCM with a KMS-protected DEK (up to 10 MB per object)
- Dynamic secrets API — runtime-mutable secrets persisted encrypted in S3 (reuses storage DEK), optional `env_var` boot binding, max 64 KB per secret
- Build-time vs deploy-time env split (SSM-scan model) — `app.env` is now opt-in for **PCR0-attested build-time values only** (default `env: {}` in the scaffolded templates). Deploy-time env vars are managed via `enclave tofu env --key K --value V` (writes/merges `tofu/env_values.auto.tfvars.json`); the next `tofu apply` publishes each pair to SSM at `/<deployment>/<app>/env/<key>`. The runtime's `Environment.Override` scans that prefix via `GetParametersByPath` on `Init` and overlays every key it finds onto the process env. The legacy `ENCLAVE_APP_ENV_KEYS` baked-in key list (and the `flake.nix` `appEnvKeysJson` line) has been removed — adding a deploy-time env var no longer requires an EIF rebuild.
- `enclave tofu` subcommand group — split into `tofu init` (initial scaffold + `backend.tf`, with optional TTY-driven S3/DynamoDB backend bootstrap via the bundled `modules/backend` submodule; flags `--bootstrap-backend` / `--no-bootstrap` / `--backend-{bucket,table,region}`), `tofu update` (refresh `terraform.tfvars.json` from `enclave.yaml` — modules and `backend.tf` left untouched), and `tofu env` (set/merge entries in `tofu/env_values.auto.tfvars.json` without hand-editing JSON). Replaces the previous single-shot `enclave tofu`.
- Two artifact-source modes — local upload (default, fast iteration) or remote curl from a published GitHub Release at apply time (`enclave tofu init --remote`)
- Verified clients in Go (`client/`) and Rust (`client-rs/` Cargo workspace member) — verify NSM attestation chain + Schnorr signatures on every response
- Local QEMU integration test harness (`-M nitro-enclave` via QEMU 9.2 + vhost-device-vsock) — 15 integration tests + full locked-key migration + post-migration verification
- CI scaffolding — `enclave init` and `enclave generate template` write `deploy-enclave.yml`, `destroy-enclave.yml`, `verify-enclave.yml` with OIDC, GitHub artifact attestations, and a `gh-pages` attestation status page
- OpenTofu deployment scaffold (`./tofu/`) — merge-only-new module tree with inline `enclave-supervisor.service` systemd unit in `user_data.sh.tftpl`
- Deployer IAM policy template (`deploy-iam-policy.json` at repo root) — least-privilege policy for the OIDC role that runs `enclave deploy` / `tofu apply`: broad `ec2`/`s3`/`kms`/`ssm`/`dynamodb` for stack lifecycle, IAM read for plan-time drift, IAM write scoped to `*enclave*` role + instance-profile ARNs, and `iam:PassRole` guarded to `ec2.amazonaws.com`
- CLI ↔ runtime version sync (`enclave upgrade`) — atomically rewrites the top-level `runtime: {rev,hash,vendor_hash}` block in `enclave.yaml` to the coordinates baked into the CLI binary (via `-ldflags` from `cli/runtime-hashes.json`). Idempotent, scoped strictly to the `runtime:` mapping (never touches `app.nix_*`), respects `ENCLAVE_CONFIG` + bare-layout discovery. Run after `go install ...@latest` instead of hand-editing `enclave.yaml`.
- **Deploy-time Let's Encrypt / ACME TLS** (v0.0.78) — the public `:443` listener can serve either a self-signed cert (default, trust via attestation `tlsKeyHash`) or a CA-issued cert via ACME (`letsencrypt` / `letsencrypt-staging`). `enclave.yaml`'s `tls: { fqdn, provider, email, route53_zone_id }` block flows CLI → Tofu → SSM (`/{dep}/{app}/env/ENCLAVE_NITRIDING_{FQDN,USE_ACME,ACME_DIRECTORY,ACME_EMAIL,ACME_CA}`); the runtime's `loadDeployTLSConfig` reads it on `Init`. Challenge is **TLS-ALPN-01** on `:443` (`acme-tls/1` added to ALPN); a `certForHello` shim resolves nameless ClientHellos to the configured FQDN; a custom `RoundTripper` rewrites the ACME `Location` header for private/test directories. Issued cert material is AES-GCM-sealed under the storage DEK and persisted in S3 via `acmeStorageCache` under the reserved `acme/` namespace, so reboots and locked-key migrations reuse the cert (avoids the Let's Encrypt rate limit). Changing the domain is a **redeploy, not an EIF rebuild**. End-to-end test (`make test-acme`, `test/acme-test.sh`, `test/pebble/` with a local Pebble ACME server) is wired into CI via `.github/workflows/acme-test.yml`.
- **Optional Route53 A-record management** — when `tls.route53_zone_id` is set, `aws_route53_record.enclave` in the Tofu module additionally creates an `A` record for `tls.fqdn` (60 s TTL) pointing at the EIP in that zone (skipped in local mode or when empty; operator-managed DNS keeps working by leaving it empty). `tls.route53_zone_id` without `tls.fqdn` is a config-load error. `deploy-iam-policy.json` scopes `route53:ChangeResourceRecordSets` / `GetHostedZone` / `ListResourceRecordSets` to `arn:aws:route53:::hostedzone/*` and `route53:GetChange` to `arn:aws:route53:::change/*`.
- **Per-request upstream protocol switching** — the `revProxy → user app` HTTP version is selected by `ENCLAVE_NITRIDING_UPSTREAM`: `auto` (default — `protocolSwitchTransport` matches the inbound protocol per request via `r.ProtoMajor`, dispatching HTTP/1.1 to `http.Transport{}` and HTTP/2 to `http2.Transport{AllowHTTP: true}`), `h2c` (pin HTTP/2 cleartext for gRPC-only apps), or `h1` (pin HTTP/1.1 for plain-HTTP apps). `FlushInterval = -1` in every variant.
- **Permissive CORS on `/v1/*` admin routes** — `corsWildcard` middleware wraps the admin mux so a browser SPA can call attestation / storage / secrets / telemetry endpoints cross-origin (wildcard `Access-Control-Allow-{Origin,Methods,Headers,Expose-Headers}`, `Access-Control-Max-Age: 600`, `OPTIONS` short-circuits with `204`). The catch-all upstream proxy is not wrapped — the user app owns its own CORS policy.
- **SSM Session Manager port-forwarding for `log` / `trace` / `metrics`** — these read-only CLI commands now open an `AWS-StartPortForwardingSession` to the supervisor's `:8443` mgmt API and HTTP-stream the response directly, removing the 24 KB SSM RunCommand stdout truncation cap. Local-port race retried once on `EADDRINUSE`; subprocess stderr teed so AccessDenied / expired creds / missing-Session-Manager-Plugin failures surface verbatim. Requires AWS CLI v2 + Session Manager Plugin on `PATH`. `start` / `stop` continue to use RunCommand (small payload).
- **`--profile` flag on cross-repo CLI commands** — `enclave start` / `stop` / `log` / `trace` / `metrics` take an optional `--profile` flag (alongside `--instance-id` / `--region`) that flows into both the AWS SDK config loader and the `aws ssm start-session --profile …` subprocess. Empty falls back to `AWS_PROFILE` env / default credential chain.
- **Upstream-app exit resilience** (v0.0.79, issue #122) — when the user app process exits (crash or clean shutdown), the runtime **stays alive** instead of tearing itself down, so admin endpoints (`/v1/start-migration`, `/health`, `/v1/enclave-info`) stay reachable and an in-flight locked-key migration isn't voided. `cmd/runtime/main.go` records the exit via `Runtime.MarkUpstreamExited(err)` (replacing the old `stop()`) and then waits for explicit shutdown or a listener failure; `UpstreamExited()` reads the latch. `GET /v1/enclave-info` exposes it as `upstream_app: { exited, error }`, and the catch-all reverse proxy returns `502` for routes to the dead app. Covered by `runtime/runtime_test.go` and a `test/run.sh` `[5.5/9]` resilience step driving `/test/crash` on the test app.

**Tags**: `aws-nitro`, `enclave`, `confidential-computing`, `kms`, `attestation`, `pcr0`, `pcr0-signing`, `ecdsa-p384`, `schnorr`, `bip-340`, `reproducible-build`, `nix`, `vsock`, `gvproxy`, `nitriding`, `viproxy`, `cdk`, `opentofu`, `tofu-init`, `tofu-update`, `tofu-env`, `backend-bootstrap`, `dynamodb-lock-table`, `iam`, `iam-policy`, `s3`, `aes-256-gcm`, `secrets`, `ssm-env-overlay`, `getparametersbypath`, `otlp`, `otlp-ingest`, `tls`, `acme`, `letsencrypt`, `tls-alpn-01`, `autocert`, `pebble`, `route53`, `route53-zone-id`, `cors`, `protocol-switching`, `h2c`, `session-manager`, `port-forwarding`, `aws-profile`, `upstream-app-exit`, `resilience`, `framework`, `cli`, `cli-upgrade`, `go`, `nodejs`, `dotnet`, `rust-client`

**Synonyms**: `simple-enclave`, `introspector-enclave`, `nitro-enclave-framework`, `enclave-cli`, `enclave-supervisor`

**Triggers**:
- **ask_question**: `nitro enclave`, `attestation`, `pcr0`, `kms locked`, `schnorr signature`, `confidential computing`, `enclave migration`, `pcr extension`, `appKeyHash`, `nitriding`, `gvproxy`, `viproxy`, `pcr0 signing`, `ecdsa p384`, `pcr0_signature`, `otlp ingest`, `enclave telemetry`, `enclave tls`, `letsencrypt enclave`, `acme enclave`, `tls-alpn-01`, `pebble`, `acmeStorageCache`, `route53 enclave`, `enclave cors`, `ENCLAVE_NITRIDING_UPSTREAM`, `session manager port forward`, `enclave log truncated`, `enclave tofu env`, `tofu env_values`, `deploy-time env`, `ENCLAVE_APP_ENV_KEYS removed`, `GetParametersByPath`, `enclave tofu subcommands`, `upstream app crash`, `runtime stays alive`, `upstream_app exited`
- **develop**: `add cli command`, `runtime feature`, `supervisor change`, `kms policy`, `migration step`, `dynamic secret`, `storage api`, `tofu module`, `cdk stack`, `attestation chain`, `enclave upgrade`, `deployer iam policy`, `tls block`, `acme support`, `autocert`, `ENCLAVE_NITRIDING_FQDN`, `route53_zone_id`, `protocol switch transport`, `cors wildcard`, `upstreamTransport`, `aws profile flag`, `sessionStarter`, `httpViaSession`, `backend bootstrap`, `tofu_bootstrap`, `tofu_env`, `bootstrapBackend`, `defaultBackendValues`, `writeBackendConfig`, `Environment.Override`, `app.env`, `MarkUpstreamExited`, `UpstreamExited`, `UpstreamAppInfo`
- **test_or_run**: `enclave build`, `enclave deploy`, `enclave verify`, `enclave migrate`, `enclave start`, `enclave stop`, `enclave log --profile`, `enclave metrics --profile`, `qemu nitro-enclave`, `integration test eif`, `make test`, `make test-docker`, `make test-acme`, `vsock loopback`, `enclave tofu init`, `enclave tofu update`, `enclave tofu env`
- **debug**: `pcr0 mismatch`, `kms decrypt failed`, `attestation hash 403`, `migration already in progress`, `secret too large`, `vsock device not found`, `imds proxy unreachable`, `signature verification failed`, `app crashed enclave`, `502 dead app`, `runtime died after app exit`

**Dependencies**: AWS services (KMS, SSM, S3, EC2, IAM), Nix + Docker (build), `nitriding` (leaf utilities only post-v0.0.76), `gvproxy` (vsock outbound), `vhost-device-vsock` (local test harness), `monzo/aws-nitro-util` (EIF packaging), `golang.org/x/crypto/acme/autocert` (deploy-time ACME / Let's Encrypt support, v0.0.78+), Pebble ACME server (local end-to-end test only)
**Depended On By**: Any ArkLabs / Arkade Bitcoin / Ark protocol service that needs attested confidential execution (e.g., `introspector` co-signer deployment, future signing services, custodial wallet services)

---

### dotnet-sdk
**ID**: `dotnet-sdk`
**Name**: NArk (.NET Ark SDK)
**Type**: Client Library
**Language**: C# / .NET 8+
**Index**: `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/INDEX.md`
**Repository**: `${DOTNET_SDK_REPO}`
**GitHub**: `arkade-os/dotnet-sdk`

**Description**:
.NET SDK for building Ark protocol wallets and applications. Provides a complete client-side implementation including VTXO management, batch session participation (MuSig2 tree signing), intent-based transaction construction, coin selection, sweeping, on-chain operations, pending-tx recovery (reconciles Arkade txs stranded between Submit and Finalize), payment tracking (assets + explicit Cancelled status), BIP21 / payment-string parsing, a multi-provider swap architecture with Boltz as the shipped provider (submarine / reverse / chain swaps with renegotiation + cooperative refund in both directions + recovery-state diagnostics), and a full unilateral-exit pipeline (stateful with EF Core or in-memory storage; or stateless one-shot `ExitPlan` API) with v3 CPFP 1p1c relay via the new `IFeeWallet` abstraction. Unified `IBitcoinBlockchain` interface collapses the prior split `IChainTimeProvider` / `IBoardingUtxoProvider` / `IOnchainBroadcaster` trio (NBXplorer / Esplora / RPC impls + matching `Add{NBXplorer,Esplora,Rpc}Blockchain` DI helpers). Published as NuGet packages with a fluent builder pattern for DI configuration. Ships a Blazor WASM sample wallet and DocFX-generated docs site, both deployed to GitHub Pages.

**Key Capabilities**:
- VTXO lifecycle management with resilient sync: one long-lived arkd `GetSubscription` stream whose script set is mutated **in place** via `SubscribeForScriptsAsync` / `UnsubscribeForScriptsAsync` deltas (PR #103 — supervisor loop reconnects on the same subscription id, recreates if arkd GC'd the listener, tears down when the active set is empty). 5 s safety-net poll **re-derives the active script set fresh from `IActiveScriptsProvider`s every tick** and reconciles the stream to it (PR #102), so a stale or missed `ActiveScriptsChanged` event can never hide a script from detection. Each stream push still enqueues a single immediate poll (PR #99 dropped the prior 750 ms / 3 s / 8 s retry fan-out). Persistent per-wallet `vtxo.lastFullPollAt` cursor (stored via `ArkWalletEntity.Metadata`) bounds cold-start catch-up across process restarts, gated so a failed catch-up + successful routine poll can't advance past the gap
- Unconfirmed boarding UTXOs excluded from spendable coins (PR #101): `ArkVtxo.IsUnconfirmedOnchain()` reads a shared `ConfirmedMetadataKey = "Confirmed"` flag (populated by `BoardingUtxoSyncService` from the explorer); `SpendingService.GetAvailableCoins` filters these out so apps don't offer in-mempool boarding inputs that arkd's `validateBoardingInput` will reject at settle time. Confirmation-centric — generalises to arkd-reported unrolled VTXOs as soon as they carry the flag. Surfaced as a **PENDING** pill in the Blazor sample wallet
- Generic per-wallet metadata store on `ArkWalletEntity` (JSON-serialized `Dictionary<string,string>?`, provider-agnostic `jsonb` / `TEXT` / `nvarchar(max)`) accessed via `IWalletStorage.SetMetadataValue` (sparse-key, concurrent-writer-safe)
- Batch round participation with MuSig2 tree signing
- Intent-based off-chain transactions (create, register, sync, schedule)
- Automatic coin selection with dust / sub-dust handling and server-driven `MaxOpReturnOutputs` / `MaxTxWeight`
- Server-enforced VTXO/UTXO amount bounds and `BoardingAllowed` gate
- Taproot contracts (payment, note, hash-locked, VHTLC)
- On-chain boarding, settlement, and collaborative exit
- Sweeping expired/swept VTXOs on-chain
- Multi-provider swap architecture (`ISwapProvider` abstraction): `SwapsManagementService` is now a provider-agnostic router over `IEnumerable<ISwapProvider>`, with `BoltzSwapProvider` as the shipped Boltz implementation. Capability discovery via `SwapRoute` / `SwapAsset` / `SwapNetwork` / `SwapQuote` / `SwapLimits`; `SwapStatusChanged` event raised on every persisted status transition. Backward-compatible: existing Initiate* / PayExisting* / Restore* APIs delegate to the resolved `BoltzSwapProvider`. DI helper renamed `AddArkSwaps()` → `AddArkSwapServices()` (calls `AddBoltzProvider()` internally)
- Boltz submarine (Ark→Lightning), reverse (Lightning→Ark), and chain (ARK<->BTC) swaps with MuSig2 cross-signatures; single long-lived Boltz websocket (subscribe / unsubscribe ops keyed by swap id, 5 s reconnect backoff) replaces per-swap-set-change reconnects
- Chain-swap unhappy-path recovery: renegotiation on `transaction.lockupFailed` (`GET → POST /v2/swap/chain/{id}/quote`, guarded by `BoltzLimitsValidator` + race-tolerant status probe); cooperative BTC-side refund (`CoopRefundBtcToArkChainSwap`) and ARK-side refund (`CoopRefundArkToBtcChainSwap`) in both directions; `swap.expired` with no funds locked → `Failed`; persisted refund destination on first attempt so retries don't leak orphan contract rows
- Swap recovery inspection: `SwapsManagementService.InspectSwapRecoveryAsync` / `ScanRecoverableSwapsAsync` return `SwapRecoveryInfo` snapshots (`Recoverable` / `NoFunds` / `AlreadyRefunded` / `AlreadySettled` / `StillPending` / `SwapNotFound` / `InspectionError`) across all four swap types — side-effect-free; recovery itself runs inside `BoltzSwapProvider.PollSwapState`
- Pending Arkade transaction recovery: `PendingArkTransactionRecoveryService` reconciles off-chain txs stranded between `SubmitTx` and `FinalizeTx` (server locked inputs in-flight, finalize never fired). Runs on host startup via `ArkHostedLifecycle` (after `VtxoSync`) across every wallet; also exposes `FinalizePendingArkTransactionsAsync(walletId)` for on-demand recovery. Builds BIP-322 ownership proofs (uses spent VTXOs as proof material), calls the new `IClientTransport.GetPendingTxAsync` endpoint, signs returned checkpoint PSBTs, finalizes. Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) without blocking the loop
- BIP21 / payment-string parser: `ArkBip21.Parse` / `ParseStrict` handle BIP21 URIs, Ark addresses, BOLT11 invoices, LNURL, and Bitcoin addresses into a unified `Bip21PaymentInfo` with `PreferredMethod` routing (`ArkSend` / `SubmarineSwap` / `ChainSwap`); decimal-BTC `Amount` with `AmountSats` derivation; fluent `ArkBip21Builder` (`WithAssetId` / `WithCustomParameter`) for URI construction
- Configurable Boltz `referralId` for attribution — `BoltzClientOptions.ReferralId` defaults to `"arkade-dotnet-sdk"` (`BoltzClientOptions.DefaultReferralId`); consumer apps override via `services.Configure<BoltzClientOptions>` (BTCPay's `"btcpay-arkade"`, wallet's `"arkade-money"`); `null` opts out
- Resilient `RPCChainTimeProvider` — caches last successful `(Timestamp, Height)` and falls back on transient Bitcoin Core RPC failures so a single 500 from `getblockchaininfo` no longer takes controller-bound consumers (e.g. BTCPay plugin manager) down
- Per-wallet `BeginScope(("WalletId", id))` log scopes across Swaps, Batch, Onchain, Intent, Spending, Asset, Recovery, Delegation, and Sweeper services so downstream sinks can route every transitively-emitted log line to the right wallet
- Payment tracking (`PaymentTrackingService` now `IHostedService`): asset tracking via `ArkPayment.Assets` and `ArkPaymentRequest.ExpectedAsset` / `ReceivedAssets` (JSONB-persisted, accumulated via `MergeAssets`); explicit `Cancelled` terminal status distinct from `Failed`; `SemaphoreSlim` serialises `OnVtxoChanged` against same-request races. Opt-in via `AddArkPaymentTracking()`
- Vendored NBitcoin.Scripting (`OutputDescriptor`, parsers, `SigningRepository`) in `NArk.Abstractions`
- HD wallet support with descriptor recycling, plus gap-limit recovery (`HdWalletRecoveryService`) for re-imported mnemonics via pluggable `IContractDiscoveryProvider`s (indexer-VTXO, boarding-UTXO, Boltz-swap, plus custom)
- Unilateral exit pipeline (`UnilateralExitService`) with state machine `Broadcasting` → `AwaitingCsvDelay` → `Claimable` → `Claiming` → `Completed`. Three operating shapes: stateful with EF Core persistence (opt-in `ConfigureArkExitEntities()`), stateful with in-memory storage (`AddInMemoryExitStorage()`), or stateless one-shot API (`BroadcastExitChainAsync` returns an `ExitPlan` the caller persists; `ClaimMaturedExitAsync(plan)` claims once the CSV timelock matures). `VirtualTxService` backs the storage layer (Lite default — txids + expiry, hex fetched on demand at `StartExitAsync`; Full mode stores raw hex at every VTXO arrival; whole-chain incl. `Commitment` root tagged with `ChainedTxType`); `ExitWatchtowerService` auto-starts exits on partial-tree-broadcast detection; opt-in `VtxoChainAutoFetchService` (`AddVirtualTxAutoFetch()`) pre-stores chains for every new VTXO above the worth-threshold. `P2ACpfpBuilder` builds v3 1p1c CPFP children via the new `IFeeWallet` abstraction (`SignFeeUtxoAsync` sighash-callback signing — never holds raw keys; `SelectFeeUtxoAsync` returns `ICoin?`); gracefully falls back to direct broadcast when no fee wallet is registered. `ParseVirtualTx` branches on `ChainedTxType` (Tree → lift `PSBT_IN_TAP_KEY_SIG`, Ark/Checkpoint → `Finalize+ExtractTransaction` with `FinalScriptWitness` fallback, Commitment filtered out)
- Unified `IBitcoinBlockchain` interface (6 members: `GetChainTime`, `GetUtxosAsync`, `BroadcastAsync`, `BroadcastPackageAsync`, `GetTxStatusAsync`, `EstimateFeeRateAsync`) replaces the prior split `IBoardingUtxoProvider` / `IChainTimeProvider` / `IOnchainBroadcaster` trio. Three concrete impls under `NArk.Core/Blockchain/`: `NBXplorerBlockchain` (preserves cached-fallback chain-time + `submitpackage`/sequential broadcast fallback), `EsploraBlockchain`, `RpcBlockchain` (`GetUtxosAsync` throws `NotSupportedException` — no native address index). DI helpers `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` register every supported member of a backend in one call; `ArkApplicationBuilder.WithBlockchain<T>()` replaces the prior `WithTimeProvider<T>()`
- Per-network Esplora + Electrum (WS / TCP) endpoint defaults on `ArkNetworkConfig` mirror the canonical Arkade ts-sdk presets so apps can wire `IBitcoinBlockchain` straight off the preset (`services.AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!))`) without their own NBXplorer / bitcoind. Nullable fields: `EsploraUri`, `ElectrumWsUri`, `ElectrumTcpUri` (`tcp://host:port`). Electrum TCP ports verified at the `server.version` protocol level against the public Fulcrum hosts — only `:50001` plain-TCP is exposed on Mainnet / Mutinynet (TLS goes via the WSS endpoint at `:443`); Regtest uses nigiri's electrs binary port `:50000`. Additive nullable defaults — existing named-args callers untouched
- Deterministic Arkade asset packets: `AssetPacketBuilder.Build` orders `AssetGroup` entries by `AssetId` (ordinal hex over the 34-byte `txid ‖ groupIndex_LE` serialization — same `(txid, groupIndex)` ordering as rust-sdk) regardless of input order, so the same logical transfer always serializes to identical OP_RETURN bytes across runs. Cross-SDK conformance enforced by ts-sdk-sourced fixtures (`asset_ref` / `asset_input` / `asset_output` / `metadata` incl. `MetadataList` Merkle-hash vectors) under `NArk.Tests/Assets/Fixtures/`
- EF Core storage package (pluggable DB provider, opt-in payment entities, opt-in unilateral-exit entities, opt-in `StoreDateTimeOffsetAsTicks` for SQLite `ORDER BY` support — scoped to Ark-owned entity types so it can't bleed into consumer columns)
- gRPC + REST/SSE transports with camelCase, string-encoded int64, and custom-signet (mutinynet) handling
- Shared regtest E2E environment via the `arkade-os/arkade-regtest` git submodule + .NET Aspire AppHost
- Blazor WASM sample wallet (`samples/NArk.Wallet/`) deployed to GitHub Pages alongside DocFX docs

**Tags**: `sdk`, `dotnet`, `csharp`, `nuget`, `client`, `library`, `vtxo`, `musig2`, `batch`, `intent`, `boltz`, `swap`, `multi-provider-swaps`, `swap-provider`, `swap-router`, `chain-swap-renegotiation`, `cooperative-refund`, `swap-recovery-inspection`, `pending-tx-recovery`, `bip21-parser`, `referral-id`, `efcore`, `aspire`, `regtest-submodule`, `grpc-client`, `rest-client`, `sse`, `taproot`, `output-descriptor`, `payment-tracking`, `payment-assets`, `payment-cancelled`, `hd-recovery`, `gap-limit`, `discovery-provider`, `wallet-metadata`, `sync-cursor`, `chain-time-cache`, `wallet-scoped-logs`, `lnurl`, `blazor`, `wasm`, `docfx`, `unilateral-exit`, `exit-watchtower`, `virtual-tx`, `chained-tx-type`, `p2a-cpfp`, `truc-relay`, `fee-wallet`, `exit-plan`, `in-memory-exit-storage`, `ibitcoinblockchain`, `nbxplorer-blockchain`, `esplora-blockchain`, `rpc-blockchain`, `sqlite-orderby`, `datetimeoffset-ticks`, `asset-packet`, `deterministic-asset-ordering`, `cross-sdk-fixtures`, `network-defaults`, `esplora-uri`, `electrum-uri`, `electrum-ws`, `electrum-tcp`, `in-place-subscription`, `subscription-id`, `fresh-derive-poll`, `unconfirmed-boarding-utxo`, `confirmed-metadata`

**Synonyms**: `nark`, `nark-sdk`, `dotnet-client`, `csharp-sdk`, `.net-sdk`

**Triggers**:
- **ask_question**: `dotnet sdk`, `csharp ark`, `.net wallet`, `nark`, `nuget ark`, `nark wasm wallet`, `nark sample wallet`, `hd recovery`, `gap limit scan`, `wallet metadata`, `sync cursor`, `boltz referral id`, `swap provider`, `multi-provider swap`, `ark bip21`, `pending tx recovery`, `inspect swap recovery`, `unilateral exit dotnet`, `nark exit pipeline`, `exit plan`, `virtual tx storage`, `p2a cpfp builder`, `ifeewallet`, `ibitcoinblockchain`, `nbxplorer blockchain`, `esplora blockchain`, `rpc blockchain`, `asset packet builder`, `deterministic asset ordering`, `cross sdk asset fixtures`, `arknetworkconfig esplora default`, `arknetworkconfig electrum default`, `electrum ws uri`, `electrum tcp uri`, `vtxo subscription in place`, `subscribeforscriptsasync`, `unsubscribeforscriptsasync`, `getvtxosubscriptionstreamasync`, `vtxo poll fresh derive`, `unconfirmed boarding utxo`, `isunconfirmedonchain`, `confirmed metadata key`, `pending boarding pill`
- **develop**: `dotnet feature`, `csharp wallet`, `.net integration`, `efcore storage`, `payment tracking`, `payment assets`, `output descriptor`, `blazor wasm wallet`, `contract discovery provider`, `restore from mnemonic`, `walletid log scope`, `wallet metadata column`, `boltz referral id`, `add swap provider`, `iswap provider`, `chain swap renegotiation`, `cooperative refund`, `bip21 builder`, `pending ark tx`, `add unilateral exit`, `add virtual tx auto fetch`, `add in memory exit storage`, `configure ark exit entities`, `with blockchain builder`, `add nbxplorer blockchain`, `add esplora blockchain`, `add rpc blockchain`, `implement ifeewallet`, `store datetime offset as ticks`
- **test_or_run**: `dotnet test`, `aspire apphost`, `nark e2e`, `arkade-regtest submodule`, `docfx serve`, `unilateral exit tests`, `test fee wallet`, `p2a cpfp tests`, `efcore sqlite orderby test`
- **debug**: `grpc connection`, `rest sse 501`, `batch session error`, `musig2 mismatch`, `swap failed`, `swap stuck pending`, `chain swap wrong amount`, `mutinynet network`, `bit besql sqlite`, `vtxo 11k cap`, `recovery scan stuck`, `single key recovery throws`, `chain time rpc 500`, `plugin disabled by host`, `cold start refetches all vtxos`, `boltz websocket reconnect storm`, `failure details json exception`, `submit finalize stranded`, `addarkswaps not found`, `withtimeprovider not found`, `exit session failed invalid hex`, `truc violation`, `mempool script verify flag failed`, `parse virtual tx`, `psbt no witness utxo`, `tree tx witness empty`, `addunilateralexit missing tables`, `order by datetimeoffset sqlite`

**Dependencies**: `arkd` (server communication via gRPC + REST/SSE), `fulmine` (Boltz-side wallet in E2E), `boltz-backend` (swap provider), `arkade-regtest` (shared regtest env, git submodule)
**Depended On By**: .NET applications building on Ark protocol

---

### ts-sdk
**ID**: `ts-sdk`
**Name**: Ark TypeScript SDK
**Type**: Client Library
**Language**: TypeScript
**Index**: `${ARKADIAN_DIR}/docs/projects/ts-sdk/INDEX.md`
**Repository**: `${TS_SDK_REPO}`
**GitHub**: `arkade-os/ts-sdk`

**Description**:
Official TypeScript SDK (`@arkade-os/sdk`) for the Ark protocol. Provides a complete client library for building Bitcoin wallets with Taproot and Ark VTXO support. Features wallet management (full + watch-only), HD identity (BIP39/BIP86), VTXO operations, batch settlement with MuSig2, asset management, VTXO delegation, unilateral exit, and service worker support. Runs in browsers, Node.js, React Native/Expo with pluggable storage adapters.

**Key Capabilities**:
- Wallet creation and management (Wallet, ReadonlyWallet, ServiceWorkerWallet, OnchainWallet)
- Mainnet defaults: `arkServerUrl` defaults to `DEFAULT_ARKADE_SERVER_URL` (`https://arkade.computer`); `OnchainWallet.create` defaults to `DEFAULT_NETWORK_NAME` (`bitcoin`); `ArkAddress` and `contractFromArkContractWithAddress` default HRP to `DEFAULT_ARKADE_HRP` (`ark`); `getArkadeServerUrl({ arkServerUrl })` helper resolves the URL. **Since 0.4.28** (after d682eac): every default provider constructor also defaults its URL — `new RestArkProvider()` / `new RestIndexerProvider()` / `new ExpoArkProvider()` / `new ExpoIndexerProvider()` resolve to `DEFAULT_ARKADE_SERVER_URL`; `new EsploraProvider()` resolves to `ESPLORA_URL[DEFAULT_NETWORK_NAME]`. `VtxoScript.address(prefix?)` defaults `prefix` to `DEFAULT_NETWORK.hrp`; `VtxoScript.onchainAddress(network?)` defaults to `DEFAULT_NETWORK`. The `DEFAULT_ARKADE_SERVER_URL` / `DEFAULT_NETWORK` / `DEFAULT_NETWORK_NAME` constants moved to `src/networks.ts` (out of `src/wallet/index.ts`) to keep the import chain `script → networks → provider` cycle-free
- **URL string config deprecation** *(0.4.28, refs #466)*: `BaseWalletConfig.arkServerUrl` / `indexerUrl` / `esploraUrl` and `ServiceWorkerWalletOptions.arkServerUrl` / `indexerUrl` / `esploraUrl` / `delegatorUrl` all `@deprecated` (JSDoc only; runtime behaviour unchanged). Provider-based config is the recommended path (`arkProvider`, `indexerProvider`, `onchainProvider`, `delegatorProvider` instances). Wallet/ExpoWallet `create` example JSDocs rewritten to drop the URL-based form. Will be removed in a future major version
- **Dust change guard / DustChangeError** *(0.4.28, closes #458)*: `Ramps` partial collaborative-exit / offboard now pre-checks the residual change VTXO against the wallet's dust threshold and throws a typed `DustChangeError` (`change: bigint`, `dustAmount: bigint`) before forwarding the intent to arkd — wallet UIs catch it and can offer to exit the full balance instead of surfacing the raw server-side dust rejection. Dust lookup centralized in `src/wallet/utils.ts` (`getDustAmount(wallet)` reads `wallet.dustAmount` when present, else falls back to `FALLBACK_WALLET_DUST_AMOUNT = 330n`); used by both `ramps.ts` and `vtxo-manager.ts`. `DustChangeError` re-exported from the package root
- **ServiceWorkerWallet.restore()** *(0.4.28)*: `ServiceWorkerWallet.restore({ gapLimit })` mirror of `Wallet.restore` drives the gap scan inside the worker (the `scanContracts` materialize callback cannot cross postMessage so the whole scan runs worker-side; only `gapLimit` and the success/error envelope cross the wire). `RESTORE_WALLET` uses the streaming `sendMessageWithEvents` path and is marked **long-running** in `isLongRunningRequest()` alongside `SETTLE` / `RECOVER_VTXOS` / `RENEW_VTXOS` so the bus deadline never races a multi-minute indexer scan (PING still covers liveness). `AggregateError` isn't structured-clone-portable, so the worker explicitly serializes it (`SerializedAggregateError` wire envelope) and the page reconstructs via `deserializeAggregateError` so callers can inspect `.errors` (helpers + `isSerializedAggregateError` guard in `wallet-message-handler.ts`). Signing-only — `ServiceWorkerReadonlyWallet` does not expose `restore`
- HD identity with BIP39 mnemonic and BIP86 Taproot derivation; identities consume wildcard descriptor templates and expose them via `identity.descriptor`; `isHDCapableIdentity()` structural type guard for capability-based branching without coupling to a concrete identity class. The four descriptor-aware identity methods (`isOurs`, `signWithDescriptor`, `signMessageWithDescriptor`) are now `@deprecated` on the interface and on `SeedIdentity` / `ReadonlyDescriptorIdentity` — kept only as backing for descriptor providers
- DescriptorProvider allocator interface with `StaticDescriptorProvider` (single-key) and `HDDescriptorProvider` (HD receive rotation, persisted under `settings.hd`, cross-instance serialized via shared `updateWalletState` mutex; also implements opt-in `ReceiveRotatorFactory`; new `getCurrentSigningDescriptor()` re-derives at last-used index without advancing for stable boot replay)
- HD receive rotation via the contract repository (re-merged in #489 after the #488 revert): `WalletReceiveRotator` (`src/wallet/walletReceiveRotator.ts`) owns the `vtxo_received` subscription, rotation chain mutex, boot pubkey lookup, and contract registration on rotate. Tags the active display contract `metadata.source = 'wallet-receive'`; marks the prior display `inactive` on rotation so the watcher keeps it while `lastKnownVtxos.size > 0`. Baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) every boot — never re-registered at the rotated pubkey. Failed rotations gate retries behind exponential backoff (1s → 60s cap). Typed `NonRangeableDescriptorError` for the silent-fallback path; pluggable `Logger` interface (defaults to `console`)
- `WalletMode = 'auto' | 'static' | 'hd' | DescriptorProvider` on `WalletConfig` — `'auto'` (default) is **explicitly short-term identical to `'static'`** until HD soak time builds (`TODO(hd-maturation)` flip-back criteria recorded in `resolveDescriptorProvider`); `'hd'` requires an HD-capable identity with a rangeable descriptor (no silent fallback); object form forwards rotation through a custom provider. `ServiceWorkerWalletMode = 'auto' | 'static' | 'hd'` (string-only because the provider object can't cross postMessage)
- Per-input signing via `InputSignerRouter` (`src/wallet/inputSignerRouter.ts`) — `InputSigningJob[]` derived from each source VTXO's script; rotated `default`/`delegate` contracts with non-baseline owners route to `DescriptorProvider.signWithDescriptor` using `metadata.signingDescriptor` persisted at rotation time; everything else routes to `Identity`. Typed errors `DescriptorSigningProviderMissingError` / `MissingSigningDescriptorError` exported from the package root. `Wallet.offchainTapscript` now a getter over a `protected` backing field; the only sanctioned writer is `setOffchainTapscriptForRotation` (@internal, on the `RotatableWallet` surface)
- `prepareUnrollTransaction` `Math.ceil`s the fee rate before `BigInt(...)` so fractional sat/vB from Esplora / bitcoind regtest no longer throws `RangeError`
- VTXO operations (send, receive, settle, renew, recover) — surgical cache reconciliation via `IContractManager.refreshOutpoints(outpoints)` (indexer-by-outpoint upserts at the contract's address, no cursor change, no full re-scan); `VtxoManager.revalidateBeforeSettle` pre-flights candidates before `renewVtxos` / `runPeriodicSettle`; reactive `maybeRefreshAfterVtxoSpent` parses `metadata.vtxo_outpoint` from the `ArkError` envelope; service-worker `REFRESH_OUTPOINTS` proxy
- **Wallet Restore / Discovery** *(0.4.28, #492)*: explicit `Wallet.restore({ gapLimit })` gap-scan recovery rebuilds an HD wallet's contract set + VTXO cache from indexer history alone. HD wallets (`instanceof HDDescriptorProvider`) drive `ContractManager.scanContracts({ deps, hd: true, gapLimit })` which walks each `Discoverable` handler (`DefaultContractHandler` + `DelegateContractHandler`) probing descriptors via `HDDescriptorProvider.materializeDescriptorAt(i)` until `gapLimit` consecutive misses, capped at `SCAN_MAX_INDEX = 10_000` (hits the cap → throws). Each hit goes through a lighter `persistAndWatchContract` (skips per-contract indexer pulls — trailing `refreshVtxos({ includeInactive: true })` covers all scripts in one batched call). `HDDescriptorProvider.advanceLastIndexUsed(maxHitIndex)` monotonically fast-forwards the receive cursor. Concurrent `restore()` calls coalesce (later caller's `gapLimit` ignored — `_restoreInFlight` checked BEFORE validation so coalescer with invalid gapLimit doesn't throw); `dispose()` drains `_restoreInFlight` so torn-down managers can't be called. `WalletReceiveRotator.pickActiveReceive` deterministically tiebreaks on highest HD index when multiple `wallet-receive` rows exist post-scan. `WALLET_RECEIVE_SOURCE` declaration moved to dependency-free leaf `src/contracts/metadata.ts` to break the `contracts → wallet` cycle; `deriveDescriptorLeafPubKey` extracted to `identity/descriptor` for shared use. New public exports: `Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError`
- VTXO ownership gating (`src/contracts/vtxoOwnership.ts`) at every contract-scoped read/write site — background sync writers warn-and-skip on unowned scripts, user-initiated wallet write paths throw; `updateDbAfterOffchainTx` / `updateDbAfterSettle` group spent rows by owning script and route each bucket to its contract's address; `getVtxosFromRepo` fails fast on undecodable wallet addresses. **Tier 2 (0.4.25)**: `WalletRepository` exposes optional script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`, `VtxoRepositoryKey = { script; address? }`) implemented natively by all SDK backends (InMemory, IndexedDB, Realm, SQLite); `getVtxosForContract` / `saveVtxosForContract` dispatch helpers route there when present and fall back to Tier 1 address-bucket + filter for custom backends
- Batch settlement with MuSig2 tree signing
- Asset management (issue, reissue, burn, transfer) — `Asset.amount`, `AssetDetails.supply`, and `IssuanceParams` / `ReissuanceParams` / `BurnParams` `amount` are `bigint` since 0.4.23 (breaking, supplies exceed `Number.MAX_SAFE_INTEGER`); persistence layer round-trips bigint amounts as decimal strings via `serializeAssets` / `deserializeAssets` while accepting legacy `number` reads. **Since 0.4.29**: `AssetManager` / `ReadonlyAssetManager` (plus the `IAssetManager` / `IReadonlyAssetManager` types) are exported from the package root — directly constructable/typeable, not only via `Wallet.assetManager`
- Anchor / sequence helpers re-exported from package root: `TxWeightEstimator`, `VSize`, `timelockToSequence`, `sequenceToTimelock` (added 0.4.23)
- VTXO delegation to third-party delegate services. **Delegator → Delegate rename** *(0.4.29, #519)*: the public delegation surface was renamed `delegator` → `delegate` with the old names kept as `@deprecated` aliases (no runtime break). Canonical exports from the package root: `DelegateProvider`, `RestDelegateProvider`, `DelegateManagerImpl`, `IDelegateManager`, `DelegateNotConfiguredError` (prior `Delegator*` names remain as aliases). `IWallet.getDelegateManager()` and `BaseWalletConfig.delegateProvider` replace `getDelegatorManager()` / `delegatorProvider` (both deprecated aliases). Source files `src/providers/delegator.ts` → `delegate.ts` and `src/wallet/delegator.ts` → `delegate.ts`. The service worker still sends both `delegateUrl` and `delegatorUrl` for pre-#519 worker compat. `DelegateInfo.delegatorAddress` is now optional alongside the new canonical `delegateAddress`; the `isDelegateInfo` guard accepts a payload when either field is a non-empty string (validating each only when present — keeps Fulmine's `delegatorAddress`-only responses valid, forward-compatible with the server switching to `delegateAddress`), and `RestDelegateProvider.getDelegateInfo` normalizes `delegateAddress` by explicit string type check (not truthiness)
- Onboarding/offboarding (on-chain to off-chain conversion)
- Unilateral exit (unroll + timelock) — `prepareUnrollTransaction` (build + sign) split from `completeUnroll` (broadcast); `completeUnroll` passes `wallet.network` to `tx.addOutputAddress` so regtest `bcrt1...` outputs no longer fail base58 decode; per-namespace `isScriptValid` helpers returning `true | Error`; `VtxoScript.exitPaths` correctly compares `=== true`
- Service worker wallet for background operation
- 5 storage adapters (InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage)
- Onchain providers: `EsploraProvider` (HTTP) and `ElectrumOnchainProvider` (WebSocket Electrum, supports atomic 1P1C TRUC relay via `broadcast_package` on Fulcrum, electrs-compatible fallbacks)
- Default onchain endpoint maps: `ESPLORA_URL`, `ELECTRUM_WS_URL`, `ELECTRUM_TCP_HOST` (Ark Labs–operated mempool/Fulcrum 2.1 deployments for bitcoin/signet/mutinynet)
- Expo/React Native support with SSE-compatible providers
- ArkNote serializable payment format
- **Build (tsup)** *(post-0.4.27, #496)*: Single-step `pnpm build` via `tsup` ^8.5.0 replaces the prior `tsc + post-processors` chain (6 `tsc` invocations + `add-extensions` / `generate-package-files` / `build-browser` scripts; `tsconfig.{cjs,esm,expo}.json` deleted). Dual ESM + CJS, per-entry `.d.ts` (ESM types) + `.d.cts` (CJS types) + source maps; `splitting: true` + `treeshake: true` keep `contractHandlers` a single runtime instance across entries. Dist layout flattened (`dist/<entry>.{js,cjs,d.ts,d.cts}` — was `dist/{esm,cjs,types}/`); `package.json` `main` / `module` / `types` / `exports` updated, each `exports` subpath gets separate `import` / `require` conditions with matching `.d.ts` / `.d.cts`. Target bumped `es2020 → es2022`. New `pnpm typecheck` (`tsc --noEmit`, `moduleResolution: bundler`) gates CI before build. New `scripts/smoke-dist.mjs` (also runs in CI after build, plus `npm pack --dry-run --ignore-scripts`) asserts every `exports` target exists, every relative import in `dist/**/*.d.{ts,cts}` resolves, ESM + CJS `contractHandlers` singleton identity holds with registered types `{default, delegate, vhtlc}`, each Node-safe public subpath resolves through a symlinked consumer, and `wallet/expo/background` stays structural-only. `src/index.ts` bypasses the `contracts/` and `repositories/` barrels to suppress Rollup chunk-circularity warnings in tsup's dts emit; bare side-effect `import "./contracts/handlers"` survives tree-shaking via expanded `sideEffects` (src + dist, ESM + CJS). `src/wallet/expo/expo-modules.d.ts` extended to cover `expo-sqlite` alongside `expo-task-manager` / `expo-background-task` (boltz-swap ambient-`.d.ts` pattern) so build is unconditional (no more `build:expo:check`); the prior `tsconfig` exclude of `src/repositories/indexedDB/websqlAdapter.ts` is consequently dropped. Dropped devDeps: `esbuild`, `glob`, `rimraf` (tsup brings them); added devDep `tsup`. **No public TypeScript API changes** — only consumers reaching into the old `dist/{esm,cjs,types}/` paths directly (bypassing `exports`) need to update. This shipped in the `0.4.28` release; current published version is `0.4.29`

**Tags**: `typescript`, `sdk`, `wallet`, `vtxo`, `bitcoin`, `taproot`, `musig2`, `bip39`, `bip86`, `hd-wallet`, `hd-receive-rotation`, `wallet-receive-rotator`, `input-signer-router`, `descriptor-provider`, `wallet-mode`, `electrum`, `esplora`, `service-worker`, `service-worker-restore`, `react-native`, `expo`, `expo-background-task`, `metro-bundler`, `node-24`, `tsup`, `dist-smoke-test`, `storage-adapters`, `npm`, `mainnet-default`, `provider-default-urls`, `url-config-deprecated`, `dust-change-error`, `bigint-assets`, `vtxo-ownership-gating`, `unilateral-exit`, `refresh-outpoints`, `monorepo`, `pnpm-workspace`, `boltz-swap-sibling`, `package-scoped-releases`, `wallet-restore`, `gap-limit-discovery`, `discoverable-handler`, `scan-contracts`, `delegate-manager`, `delegator-delegate-rename`, `asset-manager-export`

**Synonyms**: `@arkade-os/sdk`, `ark-ts-sdk`, `typescript-sdk`, `js-sdk`

**Triggers**:
- **ask_question**: `typescript sdk`, `wallet api`, `vtxo management`, `storage adapter`, `service worker wallet`, `ark address`, `boarding address`
- **develop**: `add wallet feature`, `new provider`, `storage adapter`, `asset management`, `delegation`, `expo support`
- **test_or_run**: `run sdk tests`, `vitest`, `nigiri`, `integration test`, `regtest`
- **debug**: `sse not working`, `crypto polyfill`, `service worker error`, `vtxo expired`, `settlement timeout`

**Dependencies**: `arkd` (REST API + SSE), `fulmine` (delegator service, optional)
**Depended On By**: `wallet`, `arkade-escrow`

---

### rust-sdk
**ID**: `rust-sdk`
**Name**: Arkade Rust SDK (ark-rs)
**Type**: Library/SDK
**Language**: Rust
**Index**: `${ARKADIAN_DIR}/docs/projects/rust-sdk/INDEX.md`
**Repository**: `${RUST_SDK_REPO}`
**GitHub**: `${RUST_SDK_GITHUB}`

**Description**:
Collection of Rust crates for building Bitcoin wallets with Ark protocol support. Workspace includes ark-core (protocol types, MuSig2, coin selection, Arkade Asset V1, introspector packet builder), ark-client (high-level API with VTXO watcher and chain swaps), ark-grpc/ark-rest (transport), ark-bdk-wallet (BDK integration), ark-delegator (REST client for delegator services), ark-fees (fee estimation), ark-script (Arkade scripting extension — standalone), and ark-introspector-client (HTTP client for the Go introspector co-signer). Supports WASM compilation for browser use. All publishable crates aligned at **v0.9.0** with crates.io metadata (keywords/categories) and per-crate READMEs ready for publish.

**Key Capabilities**:
- Core Ark protocol types (ArkAddress, VTXO, BoardingOutput, ArkNote, vHTLC)
- High-level client API (send VTXOs, settle rounds, check balances, transaction history)
- Generic offchain transaction builder (shared by VTXO and asset sends)
- gRPC transport (tonic) and REST transport (reqwest, WASM-compatible) — arkd 0.9.2
- MuSig2 cooperative signing for round participation — batch event waits in `ark-client` now honour the configured client timeout (no more indefinite hangs on stalled round streams)
- BDK wallet integration for on-chain operations
- Boltz submarine, reverse submarine, **and chain swaps** (ARK ↔ on-chain BTC); reverse-swap rows now persist BOLT11 invoice + expiry (**breaking** for direct `ReverseSwapData` constructors); swap creation requests carry a `referralId` (default `arkade-rs-SDK`, configurable via `OfflineClient::with_boltz_referral_id`); reverse-swap creation accepts an optional BOLT11 `description` (max 639 bytes) via a new trailing `description: Option<String>` arg on `get_ln_invoice` / `get_ln_invoice_with_preimage_hash` (**breaking**)
- **SDK build-version handshake** — `ark-grpc` (via a `tonic` interceptor on the shared channel) and `ark-rest` (via `reqwest` default headers) send `x-build-version` = `CARGO_PKG_VERSION` on every request; servers can reject too-old SDKs and callers detect it via `Error::is_version_mismatch()`. `ark_rest::Client::new(url)` now returns `Result<Self, Error>` (**breaking**)
- **Unilateral exit** finalization rewritten: `build_unilateral_exit_tree_txids` returns a topologically sorted ancestor sub-DAG (no exponential root-to-leaf enumeration); new public `finalize_virtual_tx_input` / `finalize_taproot_script_spend_witness` helpers materialize key- or script-spend witnesses from PSBT data, decoding condition-witness elements (VHTLC preimages, etc.) from the `VTXO_CONDITION_KEY` unknown field with strict length-prefix validation; `sign_unilateral_exit_tree` kept as a `#[deprecated]` alias for `finalize_unilateral_exit_tree`
- **Arkade Asset V1**: issue, transfer, burn, reissue with asset-preserving settlement
- **Arkade Script** (introspector flow): `ark-script` extension opcodes / ASM / tapscript / vtxo-script encoders; `ark-core::introspector::packet` strict-validating packet builder; `ark-introspector-client` HTTP co-signer client
- **VTXO delegation**: 3-of-3 delegated VTXOs, REST delegator client (`ark-delegator`), background `VtxoWatcher` for auto-renewal
- **Split forfeit / unilateral-exit keys** on `Vtxo`
- DLC (Discreet Log Contracts) support — time-based timelocks (block-based dropped to match production Arkade)
- Key discovery (probes delegate addresses too)
- Coin selection algorithms and fee estimation
- WASM build support (ark-core, ark-rest)
- Comprehensive E2E test suite against live arkd (incl. `e2e_assets`, `e2e_arkade_script`, `fulmine_delegator_smoke`)

**Tags**: `rust`, `sdk`, `ark`, `vtxo`, `musig2`, `grpc`, `rest`, `wasm`, `bdk`, `boltz`, `bitcoin`, `wallet-library`, `delegator`, `vtxo-watcher`, `arkade-asset`, `chain-swap`, `arkade-script`, `introspector-client`

**Synonyms**: `ark-rs`, `rust-ark-sdk`, `ark-rust`

**Triggers**:
- **ask_question**: `rust sdk`, `ark-rs`, `ark-core`, `ark-client`, `ark-delegator`, `ark-script`, `ark-introspector-client`, `rust wallet`, `wasm ark`, `bdk integration`, `vtxo watcher`, `arkade asset rust`, `rust chain swap`, `arkade script rust`
- **develop**: `add rust feature`, `new crate`, `ark-core type`, `musig2 signing`, `wasm support`, `e2e test`, `delegator client`, `asset issuance rust`, `chain swap rust`, `arkade tapscript`, `introspector packet`, `forfeit unilateral exit key`
- **test_or_run**: `cargo test`, `just test`, `e2e-tests`, `nigiri`, `wasm-pack test`, `just e2e-full`, `e2e_assets`, `e2e_arkade_script`, `fulmine_delegator_smoke`, `dockerized introspector`
- **debug**: `tonic error`, `grpc connection`, `round signing failed`, `wasm build error`, `musig nonce`, `delegator error`, `vtxo watcher error`, `chain swap refund`, `introspector timeout`, `arkade opcode parse error`

**Dependencies**: `arkd` (gRPC/REST server, 0.9.2), `boltz-backend` (swap provider, optional — used for chain swaps), `fulmine` (delegator service, optional), `introspector` (Go co-signer service, dockerized for arkade-script e2e), `Nigiri` (testing)
**Depended On By**: None (library — consumed by external wallet applications)

---

### bluewallet
**ID**: `bluewallet`
**Name**: BlueWallet
**Type**: End-User Application (Mobile)
**Language**: TypeScript / React Native
**Index**: `${ARKADIAN_DIR}/docs/projects/bluewallet/INDEX.md`
**Repository**: `${BLUEWALLET_REPO}`
**GitHub**: `BlueWallet/BlueWallet`

**Description**:
Popular open-source Bitcoin & Lightning Network wallet for iOS, Android, and macOS (via Mac Catalyst). Built with React Native 0.85 (New Architecture / Fabric) and Electrum, distributed natively on the App Store / Google Play. Ships 15+ wallet types (Legacy/SegWit/Taproot/HD, Multisig, Watch-only, Lightning Custodian) and integrates the Ark protocol as a first-class wallet via `@arkade-os/sdk` (0.4.23) and `@arkade-os/boltz-swap` (0.3.26). Includes Realm-backed Ark repositories (imported directly from the SDK), Expo-flavoured providers, and a custom background swap reconciliation queue. Android 15 16kb-page-size compatible.

**Key Capabilities**:
- Multi-wallet mobile UX: Bitcoin (Legacy/SegWit/Taproot/HD/Aezeed/Electrum/SLIP-39/BreadWallet), Multisig HD, Watch-only, BIP47 PayCodes
- Lightning support: Custodian (LndHub) and **Lightning Ark via `LightningArkWallet`**
- Ark integration: `@arkade-os/sdk` `Wallet` + `Ramps` + `MnemonicIdentity` + Expo providers
- Boltz swaps: submarine (LN→Ark) and reverse (Ark→LN) via `ArkadeSwaps`
- Background swap reconciliation: persistent queue + WebSocket reconnection + foreground polling fallback
- Realm-backed Ark wallet/contract/swap repositories with per-wallet random namespaces (privacy)
- Encryption with plausible deniability (decoy wallets), biometric unlock
- Cross-platform: iOS, Android, macOS Catalyst (single React Native codebase + native widgets/watch app)
- 55+ Transifex localizations, BugSnag error reporting, BrowserStack-tested
- Detox E2E tests (Android-focused), Jest unit + integration tests
- Hardware wallet support via QR (Keystone, BC-UR registry)
- BIP38 / WIF imports, RBF, CPFP

**Tags**: `wallet`, `mobile`, `react-native`, `new-architecture`, `fabric`, `ios`, `android`, `macos`, `bitcoin`, `lightning`, `ark`, `vtxo`, `boltz`, `submarine-swap`, `reverse-swap`, `realm`, `electrum`, `ark-sdk-consumer`, `arkade-os-sdk`, `multi-wallet`, `self-custodial`, `taproot`, `multisig`

**Synonyms**: `blue-wallet`, `bluewallet-rn`, `bw`, `BlueWallet`

**Triggers**:
- **ask_question**: `bluewallet`, `blue wallet`, `mobile ark wallet`, `react native ark`, `bluewallet ark integration`, `LightningArkWallet`, `lightning ark wallet`, `ark on mobile`, `ark ios`, `ark android`
- **develop**: `bump arkade-os/sdk`, `bump arkade-os/boltz-swap`, `add bluewallet feature`, `fix bluewallet bug`, `bluewallet detox`, `bluewallet jest`, `arkade-adapters`, `swap-queue`, `realm migration`
- **test_or_run**: `bluewallet test`, `npm test bluewallet`, `bluewallet detox`, `run bluewallet ios`, `run bluewallet android`, `bluewallet metro`
- **debug**: `bluewallet build error`, `bluewallet crash`, `bluewallet ark balance`, `bluewallet swap stuck`, `bluewallet realm error`, `bluewallet keychain`, `metro cache`, `pod install`

**Dependencies**: `ts-sdk` (`@arkade-os/sdk` 0.4.23), `boltz-swap` (`@arkade-os/boltz-swap` 0.3.26), `arkd` (default `arkade.computer`), `boltz-backend` (default `api.ark.boltz.exchange`)
**Depended On By**: None (end-user application)

---

## Project Relationships & Dependencies

### Dependency Graph

```
arkd (core)
   go-sdk (client library)
      ark-faucet (uses go-sdk)
      ark-simulator (uses go-sdk)
   dotnet-sdk (.NET client library, gRPC to arkd)
   rust-sdk (Rust client library - ark-rs, gRPC/REST to arkd)
   ts-sdk (TypeScript client library - @arkade-os/sdk)
      wallet (uses ts-sdk)
      arkade-escrow (uses ts-sdk)
   ark-faucet (uses arkd APIs)
   kms-unlocker (unlocks arkd-wallet)
   fulmine (independent, but can integrate)
   ark-telemetry (monitors arkd)
   introspector (Arkade Script co-signer)
   bancod (Go solver bot, uses arkd tx stream + go-sdk + introspector)
   banco (TS swap library, uses @arkade-os/sdk + introspector)
   compiler (Arkade Script compiler, produces contract artifacts)
   ark-infra (deploys arkd + dependencies)
   ark-docs (documents arkd)

boltz-backend (external swap provider)
   fulmine (uses Boltz for Lightning swaps)
   boltz-swap (client library for Boltz API)

wallet / @arkade-os/sdk
   boltz-swap (Lightning integration for Arkade wallets)
   arkade-escrow (uses @arkade-os/sdk for VEC escrow)
   arkade-wdk (WDK adapter — wraps @arkade-os/sdk for Tether WDK consumers)
   bluewallet (RN mobile wallet — wraps @arkade-os/sdk + @arkade-os/boltz-swap as LightningArkWallet)

arkana-knowledge (Ark Labs AI assistant — operational, not protocol)
   monitors all ArkLabsHQ + arkade-os repos via GitHub App
   produces digests, PR reviews, issue triage; not consumed by protocol projects

enclave (AWS Nitro Enclave framework — confidential execution for any HTTP app)
   independent infrastructure framework
   potential deployment target for: introspector (co-signer), future signing services
   external deps: AWS KMS/SSM/S3/EC2/IAM, Nix, Docker, nitriding, gvproxy

arkade-regtest (local Ark stack — Bash + Docker Compose orchestration)
   consumed as a git submodule by:
      arkd, fulmine, go-sdk, ts-sdk, rust-sdk, dotnet-sdk
      wallet, boltz-swap, boltz-backend (integration tests)
   bundles upstream services: nigiri, arkd, arkd-wallet, fulmine, boltz, lnd, lnurl, wallet PWA, nginx
```

### Correlation Matrix

| Project | Related To | Relationship Type |
|---------|-----------|-------------------|
| arkd | go-sdk | Server-Client |
| arkd | dotnet-sdk | Server-Client (via gRPC) |
| arkd | wallet | Server-Client (via @arkade-os/sdk) |
| arkd | ark-faucet | Server-Client |
| arkd | ark-simulator | Server-Under-Test |
| arkd | ark-telemetry | Instrumented-Service |
| arkd | kms-unlocker | Unlocks arkd-wallet |
| go-sdk | ark-simulator | Library-Consumer |
| go-sdk | ark-faucet | Library-Consumer |
| wallet | fulmine | Integrates Lightning swaps |
| fulmine | boltz-backend | Client-Server (Swap API) |
| boltz-backend | fulmine | Swap-Provider |
| ark-infra | arkd | Deployment-Target |
| ark-infra | ark-telemetry | Deployment-Target |
| ark-docs | All | Documentation-Reference |
| arkade-assets | arkd | Protocol-Implementation |
| arkade-assets | wallet | Asset-UI-Provider |
| arkade-assets | arkade-explorer | Asset-Visualization-Provider |
| arkade-explorer | arkd | Client-Server (via Indexer API) |
| arkade-explorer | wallet | Sibling Frontend (same @arkade-os/sdk) |
| arkade-explorer | arkade-assets | Asset-Consumer |
| wallet | arkade-assets | Asset-Consumer |
| wallet | boltz-swap | Library-Consumer (Lightning integration) |
| boltz-swap | boltz-backend | Client-Server (Boltz API) |
| boltz-swap | @arkade-os/sdk | Library-Consumer (Wallet SDK) |
| arkade-escrow | arkd | Server-Client (via @arkade-os/sdk) |
| arkade-escrow | @arkade-os/sdk | Library-Consumer |
| introspector | arkd | Co-Signer (Arkade Script validation) |
| dotnet-sdk | arkd | Client-Server (via gRPC and REST/SSE) |
| dotnet-sdk | fulmine | E2E-Test-Dependency |
| dotnet-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| dotnet-sdk | arkade-regtest | Shared E2E regtest environment (git submodule) |
| arkade-regtest | arkd | Bundles arkd image (nigiri-built or override) |
| arkade-regtest | fulmine | Bundles fulmine image |
| arkade-regtest | boltz-backend | Bundles Boltz backend image |
| arkade-regtest | wallet | Bundles wallet PWA image |
| arkade-regtest | go-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | ts-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | rust-sdk | Provides regtest target for SDK integration tests |
| arkade-regtest | boltz-swap | Provides regtest target for Lightning swap UI tests |
| ts-sdk | arkd | Client-Server (REST/SSE) |
| ts-sdk | wallet | Library-Consumer |
| ts-sdk | arkade-escrow | Library-Consumer |
| ts-sdk | arkade-wdk | Library-Consumer (WDK adapter wraps @arkade-os/sdk) |
| ts-sdk | fulmine | Delegator-Integration |
| arkade-wdk | ts-sdk | Adapter-Wrapper (`@arkade-os/sdk`) |
| arkade-wdk | boltz-swap | Library-Consumer (optional Lightning via Boltz) |
| arkade-wdk | @tetherto/wdk-wallet | Implements WDK base contracts |
| bluewallet | ts-sdk | Library-Consumer (`@arkade-os/sdk` 0.4.23, Expo adapters) |
| bluewallet | boltz-swap | Library-Consumer (`@arkade-os/boltz-swap` 0.3.26 — submarine + reverse swaps) |
| bluewallet | arkd | Client-Server (default `arkade.computer`, custom override per-wallet) |
| bluewallet | boltz-backend | Client-Server (default `api.ark.boltz.exchange`) |
| bluewallet | wallet | Sibling Frontend (RN mobile equivalent of Arkade PWA) |
| bluewallet | arkade-wdk | Sibling Adapter (different RN-on-Ark integration approach) |
| rust-sdk | arkd | Client-Server (via gRPC/REST, 0.9.2) |
| rust-sdk | go-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | ts-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | dotnet-sdk | Sibling SDK (same protocol, different language) |
| rust-sdk | boltz-backend | Swap-Integration (submarine, reverse, chain) |
| rust-sdk | fulmine | Delegator-Integration (VTXO auto-renewal) |
| rust-sdk | introspector | Co-Signer-Client (arkade-script flows via `ark-introspector-client`; dockerized for e2e) |
| bancod | arkd | Client-Server (tx stream subscription, wallet) |
| bancod | go-sdk | Library-Consumer (Wallet) |
| bancod | introspector | Client-Server (signing for fulfillment) |
| banco | ts-sdk | Library-Consumer (@arkade-os/sdk) |
| banco | introspector | Client-Server (covenant validation + co-signing) |
| banco | arkd | Client-Server (Ark provider, indexer) |
| banco | bancod | Protocol-Sibling (TS library vs Go solver bot, same swap protocol) |
| compiler | introspector | Compiler-Runtime (compiler produces, introspector executes) |
| compiler | arkd | Compiler-Consumer (arkd uses compiled contract artifacts) |
| compiler | arkade-assets | Language-Specification (compiler implements Arkade Script) |
| arkana-knowledge | All ArkLabsHQ + arkade-os repos | Observer/Reviewer (PR reviews, issue triage, digests) |
| arkana-knowledge | None (downstream) | Operations meta-project — not consumed by protocol projects |
| enclave | AWS Nitro | Confidential-Execution-Framework (PCR0-locked KMS, attested boot) |
| enclave | introspector | Potential-Deployment-Target (co-signer in attested enclave) |

### Technology Groupings

**Go Projects**: arkd, go-sdk, ark-faucet, ark-simulator, kms-unlocker, fulmine, bancod, introspector, enclave (CLI + runtime + supervisor)
**Rust Projects**: rust-sdk, compiler, enclave (`client-rs/` Cargo workspace member)
**C#/.NET Projects**: dotnet-sdk
**TypeScript/JavaScript Projects**: ts-sdk, wallet, arkade-assets, arkade-explorer, arkade-escrow, arkade-wdk, bluewallet (React Native), boltz-swap, banco, boltz-backend (TypeScript + Rust hybrid)
**Mobile / React Native**: bluewallet (iOS, Android, macOS Catalyst), arkade-wdk (RN-compatible adapter)
**Bitcoin Wallet Apps**: wallet (PWA), bluewallet (React Native mobile)
**Infrastructure/Config**: ark-infra, ark-telemetry, arkade-regtest (Bash + Docker Compose orchestration), enclave (Nix + Docker + AWS CDK + OpenTofu)
**Confidential Computing / Security**: enclave (AWS Nitro Enclaves), kms-unlocker (KMS + Secrets Manager)
**Documentation**: ark-docs
**External Services**: boltz-backend
**Frontend Applications**: wallet (PWA), arkade-explorer (Web App)
**Protocol Specifications**: arkade-assets
**AI Assistant / Operations**: arkana-knowledge (configuration + knowledge base for Arkana, the Ark Labs AI assistant)

---

## Agent Routing Guidelines

### Intent-Based Project Selection

**Q&A / Conceptual Questions**:
- Ark protocol concepts → `ark-docs`, `arkd`
- VTXOs, rounds, settlement → `arkd`, `ark-docs`
- Wallet usage → `wallet`, `bluewallet`, `ts-sdk`, `go-sdk`, `rust-sdk`, `ark-docs`
- WDK / Tether wallet integration, React Native Ark wallet → `arkade-wdk`, `bluewallet`, `ts-sdk`
- Mobile wallet (iOS/Android/macOS) with Ark → `bluewallet`
- Lightning swaps → `wallet`, `bluewallet`, `boltz-swap`, `fulmine`, `ark-docs`
- Security model → `ark-docs`, `arkd`
- Asset protocol, NFTs, tokens → `arkade-assets`, `ark-docs`
- Escrow system → `arkade-escrow`
- Arkade Script, covenants → `compiler`, `introspector`, `arkd`

**Development Tasks**:
- Add arkd feature → `arkd`
- Build wallet → `go-sdk`, `rust-sdk`, `dotnet-sdk`, `wallet` (depending on language)
- Build a WDK / Tether-based RN wallet on Ark → `arkade-wdk`, `ts-sdk`
- Modify the BlueWallet mobile app / its Ark integration → `bluewallet`, `ts-sdk`, `boltz-swap`
- Escrow development → `arkade-escrow`
- Lightning integration → `fulmine`, `boltz-swap`, `wallet`
- Infrastructure changes → `ark-infra`
- Asset implementation → `arkade-assets`, `arkd`
- Arkade Script/opcode development → `compiler`, `introspector`

**Testing & QA**:
- Integration testing → `arkd`, `ark-simulator`, `arkade-regtest`
- Load testing → `ark-simulator`
- E2E testing → `arkd`, `go-sdk`, `arkade-regtest`
- Local dev stack → `arkade-regtest` (regtest), `ark-infra` (cloud)
- Bring up Ark + Boltz + LND locally → `arkade-regtest`

**Monitoring & Debugging**:
- Metrics, dashboards → `ark-telemetry`
- Logs, traces → `ark-telemetry`
- Debug arkd issues → `arkd`, `ark-telemetry`
- Production monitoring → `ark-infra`, `ark-telemetry`

**Operations & Deployment**:
- Deploy to AWS → `ark-infra`
- Local dev environment → `arkade-regtest` (preferred for protocol dev), `ark-infra` (cloud)
- Wallet unlock automation → `kms-unlocker`
- Testnet faucet → `ark-faucet`

---

## Usage Notes for Agents

### Multi-Project Queries

When a user asks about topics spanning multiple projects, load context from all relevant projects:

**Example**: "How do I test arkd with multiple wallets?"
- Load: `arkd` (server setup), `ark-simulator` (multi-client testing), `go-sdk` (wallet client)

**Example**: "Set up monitoring for production arkd deployment"
- Load: `arkd` (instrumentation), `ark-telemetry` (monitoring stack), `ark-infra` (deployment)

### Dependency Loading

When working on a project, consider loading dependent projects:

- Working on `ark-simulator` → Also load `arkd`, `go-sdk`
- Working on `wallet` → Also load `ts-sdk`, `arkd` (for SDK and server API reference)
- Working on `bluewallet` → Also load `ts-sdk`, `boltz-swap`, `arkd` (SDK + Boltz lib + server reference)
- Working on `ts-sdk` → Also load `arkd` (for server API reference)
- Working on `ark-infra` → Also load `arkd`, `ark-telemetry` (deployment targets)

### Documentation Priority

For conceptual questions, prioritize documentation loading order:
1. `ark-docs` (official protocol documentation)
2. Project-specific INDEX.md (project overview)
3. Project-specific system/ docs (architecture, design)
4. Project code (implementation details)

---

## Project Status Summary

| Project | Status | Production Ready | Notes |
|---------|--------|------------------|-------|
| arkd | Stable | →  Alpha | Core protocol, active development |
| go-sdk | Stable | →  Alpha | Client library, API may change |
| wallet | Active Dev | L Alpha | PWA wallet, under development |
| ark-faucet | Stable |   (Testnet) | Production-ready for testnet |
| ark-simulator | Stable |   | Testing tool, production-ready |
| ark-telemetry | Stable |   | Monitoring stack, production-ready |
| ark-infra | Active Dev | →  Beta | IaC, production configurations available |
| kms-unlocker | Stable |   | Production-ready with AWS |
| fulmine | Active Dev | →  Alpha | Lightning wallet, under development |
| bancod | Active Dev | Alpha | Banco solver bot, swap + preimage plugins |
| banco | Active Dev | Alpha | TS swap library, @arkade-os/banco on npm |
| ark-docs | Active |   | Documentation site, continuously updated |
| arkade-assets | Specification | N/A | Protocol spec + reference implementation |
| arkade-escrow | POC | L Alpha | Escrow platform, proof-of-concept |
| arkade-explorer | Active Dev | ✓ Beta | Block explorer, production-ready |
| introspector | Active Dev | → Alpha | Arkade Script co-signer |
| dotnet-sdk | Active Dev | Beta | .NET SDK, 1.0-beta, NuGet packages, DocFX site + Blazor WASM sample wallet on GitHub Pages, HD wallet gap-limit recovery via modular discovery providers, per-wallet `vtxo.lastFullPollAt` cold-start cursor on new `ArkWalletEntity.Metadata` JSON column, persistent Boltz websocket with subscribe/unsubscribe, Boltz `referralId` (default `"arkade-dotnet-sdk"`), `RPCChainTimeProvider` cache + transient-RPC fallback, mainnet Boltz URL switched to `api.boltz.exchange`; `ArkNetworkConfig` now ships per-network Esplora + Electrum (WS / TCP) endpoint defaults (PR #96) — apps can wire `IBitcoinBlockchain` (Esplora flavor) straight off the preset (`AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!))`) without running their own NBXplorer / bitcoind; Electrum TCP ports verified at protocol level against public Fulcrum hosts (only `:50001` plain-TCP open on Mainnet / Mutinynet, Regtest uses nigiri electrs `:50000`); routine `VtxoSynchronizationService.StartQueryLogic` polls now log at Debug — Info reserved for productive ticks (a VTXO landed) + cold-start catch-up (PR #95) |
| boltz-swap | ⚠️ Repo Deprecated (2026-05-25, PR [#153](https://github.com/arkade-os/boltz-swap/pull/153)) — development moved to `arkade-os/ts-sdk` monorepo (`packages/boltz-swap/`); npm package `@arkade-os/boltz-swap@0.3.32` unchanged | ✓ Beta | TypeScript Boltz swap library, v0.3.32, @arkade-os/sdk 0.4.27. **Post-0.3.32 (unreleased)**: chain-swap `quoteSwap` guard against adversarial Boltz quotes — `quoteSwap(swapId, options?)` now floors the Boltz-returned amount against `response.claimDetails.amount` (or explicit `minAcceptableAmount` + optional `maxSlippageBps`) and throws the new typed `QuoteRejectedError` (`below_floor` / `non_positive` / `no_baseline`) instead of blind-accepting; new sibling APIs `getSwapQuote` (fetch without committing) and `acceptSwapQuote(swapId, amount, options?)` (validate-then-post); options validated as positive integers — `minAcceptableAmount=0` rejected (would silently restore blind-accept); slippage math uses subtract-then-floor for precision above `MAX_SAFE_INTEGER / 10000`; autopilot `transaction.lockupFailed` renegotiation (both Arkade↔BTC directions) uses the same floor via a `quoteOptionsForSwap` helper tolerant of legacy persisted swaps with missing `claimDetails.amount` (routes to `no_baseline` instead of crashing); rejection wraps via new `SwapError`/`ErrorOptions.cause` for programmatic recovery; `QuoteRejectedError` survives SW `postMessage` via a `QUOTE_REJECTED::`-prefixed JSON payload in `Error.message` (structured clone strips custom `.name`/own properties, but preserves `.message`), reconstructed by the runtime so SW callers can still `instanceof`-check; full wiring through `IArkadeSwaps`, `ExpoArkadeSwaps`, SW message handler, SW runtime. (release 0.3.32 is the SDK 0.4.27 upgrade cut — no `src/` changes); regtest harness realigned to wallet's arkd config — pins arkd / arkd-wallet to `v0.9.5`, fulmine to `v0.3.23`, Boltz to `boltz/boltz:latest`; `ARKD_SCHEDULER_TYPE` switched `block` → `gocron` and the `ARKD_ALLOW_CSV_BLOCK_TYPE=true` override is gone (`ARKD_VTXO_TREE_EXPIRY` / `ARKD_BOARDING_EXIT_DELAY` restored to seconds-typed 5120 / 7200; new `ARKD_SESSION_DURATION=10`, `ARKD_LOG_LEVEL=6`, `BITCOIN_LOW_FEE=true`); VtxoManager-enabled receive E2E test now polls via `waitForBalance(...)` instead of asserting on a single `getBalance()` snapshot (gocron can re-register a just-claimed VTXO into the next round between claim and snapshot); regtest submodule bumped (`3ac33b6` → `dc23da2`). 0.3.31 carry-forward: **breaking for Expo callers** — OS-task helpers (`defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `unregisterExpoSwapBackgroundTask`) moved from `@arkade-os/boltz-swap/expo` to a new `@arkade-os/boltz-swap/expo/background` subpath (static imports fix Metro static-dependency-collector miss, #136); `ExpoArkadeSwaps.setup()` no longer registers the OS task itself, callers must call `register*`/`unregister*` explicitly; `background` config dropped `taskName` + `minimumBackgroundInterval` (TS compile error, JS runtime warn via `warnOnRemovedBackgroundFields`); `expo-task-manager` (`>=3.0.0`) + `expo-background-task` (`>=0.1.0`) now declared as optional `peerDependencies`; `BoltzSwapProvider` `referralId` defaults to `"arkade-ts-sdk"` (auto-tags every submarine/reverse/chain swap); ServiceWorker runtime recovers from a half-initialized `ArkadeSwaps` handler (typed `HandlerNotInitializedError`) by re-sending the cached `INIT_ARKADE_SWAPS` payload and retrying |
| compiler | Active Dev | Alpha | Arkade Script compiler, Rust CLI + library |
| ts-sdk | Active Dev | ✓ Beta | v0.4.27, npm published, multi-platform; **2026-05-22 monorepo restructure**: `arkade-os/ts-sdk` is now a **pnpm workspace monorepo** vendoring two published packages — `@arkade-os/sdk` (`packages/ts-sdk/`, v0.4.27, **unchanged on npm**) and `@arkade-os/boltz-swap` (`packages/boltz-swap/`, v0.3.32, depends on `@arkade-os/sdk` via `workspace:*`). devDeps (`tsup`, `vitest`, `typescript`, `prettier`, `husky`, `@types/node`, `fake-indexeddb`, `eventsource`) hoisted to root; shared `tsconfig.base.json` + root prettier + `tsup` base config; single root-level `bip68` ambient declaration; `pnpm-workspace.yaml` consolidates `onlyBuiltDependencies` (`better-sqlite3`, `canvas`, `sqlite3`, `@arkade-os/sdk`) and `overrides` (`esbuild >=0.25.0`, `brace-expansion ^2.0.2`, `minimatch 9.0.3`); unified `scripts/regtest.sh <pkg> <action>` driver for the regtest stack (each package supplies its own `.env.regtest`); **package-scoped release CLI** (`cd29cda3` superseding the brief lockstep flow `843502e1`) — `pnpm run release -- sdk patch` (SDK + dependent boltz-swap patch), `pnpm run release -- boltz-swap patch` (Boltz-only bugfix), `pnpm run release -- sdk prepatch --preid beta` (mirrors prerelease into boltz-swap), `pnpm run release -- all patch` (bump both); release driver is `scripts/release.sh` → `scripts/release.mjs`, gated on `pnpm test:unit` (monorepo-wide, `15ee8c63`); root `engines.node` narrowed to `>=24.15.0 <25` (`2ca08e3f` Node 24 LTS) while published `@arkade-os/sdk` `engines.node` stays at the widened `>=22.12.0 <25` from #495; CI invokes root-level `pnpm build` / `pnpm test:unit` / `pnpm test:integration` (fans out via `pnpm -r`), per-package `pnpm typecheck` + `pnpm smoke:dist` gated for both ts-sdk and boltz-swap (boltz-swap dist smoke restored in `3555a9a4`); root `packageManager` = `pnpm@10.25.0` (root `engines.pnpm` `>=10.25.0 <11`). **No `@arkade-os/sdk` source changes** — every `src/` modification in `packages/ts-sdk/src/` had already shipped in the 0.4.27 cut or the post-0.4.27 unreleased work documented below (#487 Expo subpath split, #495 Node 24, #496 tsup migration, HD receive rotation re-merge #489, Tier 2 ownership gating 0.4.25, etc.). Downstream apps installing `@arkade-os/sdk` from npm are unaffected by the workspace shape. **post-0.4.27 changes** (carried forward from prior syncs): (a) **#487 fix(wallet/expo)** — background-task helpers split out to `@arkade-os/sdk/wallet/expo/background` subpath (new package.json export); previous lazy `require()` of `expo-task-manager` / `expo-background-task` was invisible to Metro's static dependency collector so the modules never entered the bundle graph. Static imports on the new subpath fix Metro; isolating them on a separate entry keeps react-native-web and Node consumers using `/wallet/expo` from pulling the two native peer deps. **Breaking for Expo callers**: `defineExpoBackgroundTask` / `registerExpoBackgroundTask` / `unregisterExpoBackgroundTask` + `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig` no longer exported from `/wallet/expo`; `ExpoWallet.setup()` no longer registers the OS scheduler and `dispose()` no longer unregisters it (consumer must call `registerExpoBackgroundTask(taskName, { minimumInterval })` / `unregisterExpoBackgroundTask(taskName)` explicitly); `background` config dropped `taskName` and `minimumBackgroundInterval` (TS compile error on removed fields; JS callers must update manually — fields are silently ignored and the OS task never runs); ambient declarations for the subset of `expo-task-manager` / `expo-background-task` APIs live in `src/wallet/expo/expo-modules.d.ts`. (b) **#495 chore: upgrade to Node 24 LTS** — `.nvmrc` pins `24.15.0`, CI workflows run on Node 24, `engines.node` widened to `>=22.12.0 <25` (was `>=22.12.0 <23`) so downstream consumers still on Node 22.x are not broken. **0.4.27 release** (package.json-only bump, no source changes since 0.4.26) (package.json-only bump, no source changes since 0.4.26): new public type `ExtendedContractVtxo` (`ExtendedVirtualCoin & { contractScript }`) exported from the package root — narrows `ContractVtxo`'s `Partial<TapLeaves & EncodedVtxoScript>` to required, used at save/forfeit construction sites and as the `ContractWithVtxos.vtxos` element type; `ContractWatcher` extend path now compile-time-typed and logs `txid:vout` + caught error on extend failure; `DelegatorManager.delegate` filter replaced its unsafe `as ExtendedVirtualCoin` cast with an `isAnnotated` type guard; `Wallet.create` / `ReadonlyWallet.create` now derive the indexer URL from a custom `arkProvider` via the new `extractArkProviderUrl` helper (no more silent pairing with the public `arkade.computer` default when a different arkd is injected); **HD receive rotation via contract repository re-merged in #489** (reopen of #473 after the #488 revert) — `WalletReceiveRotator` owns the `vtxo_received` subscription, rotation chain mutex, contract-repo-backed boot pubkey lookup (tagged `metadata.source = 'wallet-receive'`), and contract registration on rotate; baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) every boot regardless of rotation state; exponential backoff (1s → 60s cap) on consecutive `rotate()` failures; typed `NonRangeableDescriptorError` for silent-fallback path; `WalletConfig.walletMode = 'auto' \| 'static' \| 'hd' \| DescriptorProvider` makes the wiring explicit (**`'auto'` currently behaves like `'static'`** until HD has more soak time — `TODO(hd-maturation)` flip-back criteria recorded in `resolveDescriptorProvider`); `ServiceWorkerWalletMode` is `'auto' \| 'static' \| 'hd'` (no object form, can't cross postMessage); `InputSignerRouter` dispatches each PSBT input to `DescriptorProvider.signWithDescriptor` (rotated default/delegate contracts using `metadata.signingDescriptor`) or `Identity` (everything else), with typed errors `DescriptorSigningProviderMissingError` + `MissingSigningDescriptorError` exported from the package root; `Wallet.offchainTapscript` becomes a getter over a `protected` backing field (only sanctioned writer is `setOffchainTapscriptForRotation`, `@internal`); `isHDCapableIdentity()` structural type guard replaces the old `looksLikeVanillaHDDescriptor` + `instanceof SeedIdentity` check; the four descriptor-aware identity methods (`isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`) are now `@deprecated` — kept only as backing for `DescriptorProvider`; `prepareUnrollTransaction` `Math.ceil`s the fee rate before `BigInt(...)` so fractional sat/vB no longer throws `RangeError`. 0.4.26 ships ESM-compatible declaration imports (build script `scripts/add-extensions.js` now rewrites `.d.ts` import specifiers, fixing typed consumption under `"moduleResolution": "node16" / "bundler"`) plus typedoc polish and `as const` on `DEFAULT_ARKADE_HRP` / `DEFAULT_NETWORK_NAME`; **Tier 2 ownership gating (0.4.25)**: optional `WalletRepository` script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript` + `VtxoRepositoryKey`) implemented natively by all SDK backends (InMemory, IndexedDB, Realm, SQLite), with `getVtxosForContract` / `saveVtxosForContract` dispatch helpers and Tier 1 fallback for custom backends; surgical `IContractManager.refreshOutpoints` reconciliation + `VtxoManager.revalidateBeforeSettle` pre-flight (closes 60-second `VTXO_ALREADY_SPENT` retry loop); ownership-gated VTXO persistence via `vtxoOwnership.ts` (legacy address buckets can't leak wrong-script rows; multi-contract spends route per-script); unilateral exit bundle — `prepareUnrollTransaction` / `completeUnroll` split, regtest network arg fix, `isScriptValid === true` correctness; **breaking (0.4.23)**: asset amounts now `bigint`; new exports `TxWeightEstimator` / `VSize` / `timelockToSequence` / `sequenceToTimelock` |
| arkana-knowledge | Active | ✓ Production | AI assistant config + KB for Arkana on Hetzner CPX32 VPS, 17 active agents (new `issue-staleness` weekly sweep) |
| bluewallet | Active | ✓ Production | v8.0.0 on RN 0.85 (New Architecture); integrates @arkade-os/sdk 0.4.23 + @arkade-os/boltz-swap 0.3.26; Android 16kb-page-size ready |

---

## Versioning & Updates

This index should be updated when:
- New projects are added to the ecosystem
- Project relationships change
- Major architectural changes occur
- New capabilities are added to existing projects
- Project status changes (alpha → beta → stable)

**Last Updated**: 2026-05-26
**Version**: 1.6.5
**Maintained By**: Arkadian Documentation Team
