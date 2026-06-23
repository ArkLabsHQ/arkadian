# Documentation Sync History - Wallet

## 2026-06-23 - Documentation Sync
**Commit**: `907b3e72cd5f3ba64455a1f66a0ecac0b3c38045`
**Previous Sync**: `4d3ac3de8610235fcbd436332425c07bac80d848`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 non-merge commits
- `907b3e72` update regtest link (#695)
- `3f82209c` Add live settlement tracking for Lightning sends (#668)
- `ade82381` Upgrade ts-sdk 0.4.39 - boltz-swap 0.3.44 (#692)

**Features Added / Modified**:
- **Optimistic Lightning send + live settlement tracking** (PR #668): `payInvoice` (`src/providers/swaps.tsx`) now resolves as soon as the swap is **funded** (lockup tx observed, funds committed/refundable) via the SDK's `waitForSwapFunded`, instead of blocking on `waitForSwapSettlement`. It returns only `{ txid }` — the preimage is no longer returned, so `Send/Details.tsx` drops the old `handlePreimage` helper and calls `handleTxid(txid)` directly. The user lands on the success screen immediately, where `Send/Success.tsx` derives a live `processing → completed / failed / refunded` status (`deriveLnSendStatus`) from the persisted swap in `SwapsContext` using `hasSubmarineStatusReached('invoice.paid')` / `isSubmarineFailedStatus` (new spinner UI via `CenterScreen` + `Spinner` icon). Background SDK monitoring still drives the `SwapsList` history-row Pending → Successful/Refunded transition; a post-funding failure surfaces as "Payment failed" before the auto-refund (e2e `src/test/e2e/swap.test.ts` adapted from the old blocking flow).
- **regtest link** (PR #695): `regtest` submodule pointer bump only — no documentation impact.

**Configuration Changes**:
- Dependency bumps (PR #692): `@arkade-os/sdk` 0.4.38 → 0.4.39, `@arkade-os/boltz-swap` 0.3.43 → 0.3.44. The published 0.3.44 carries the optimistic `waitForSwapFunded` API + `BoltzSwapStatus` / `hasSubmarineStatusReached` / `isSubmarineFailedStatus` helpers consumed by PR #668. PR #668 also added a leftover vendored tarball `vendor/arkade-os-boltz-swap-0.3.39-pr556-10c3898.tgz`, but the lockfile resolves boltz-swap to the registry `0.3.44`.

**Breaking Changes**: None for app users. Internal API: `SwapsContextProps.payInvoice` now returns `Promise<{ txid: string }>` (preimage removed).

**Files Touched in Repo**: `package.json`, `pnpm-lock.yaml`, `regtest` (submodule), `src/providers/swaps.tsx`, `src/screens/Wallet/Send/Details.tsx`, `src/screens/Wallet/Send/Success.tsx`, `src/test/e2e/swap.test.ts`, `vendor/arkade-os-boltz-swap-0.3.39-pr556-10c3898.tgz`.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.26 → 1.2.27 + `last_sync_commit`; SDK/boltz-swap versions 0.4.39 / 0.3.44 (PR #692) with `waitForSwapFunded` + vendored-tarball notes; new "Optimistic Lightning send + live settlement tracking (PR #668)" bullet under Lightning Integration.
- `docs/projects/wallet/system/tech-stack.md` — SDK 0.4.39 / boltz-swap 0.3.44 headings; new boltz-swap optimistic-send API feature bullet (`waitForSwapFunded`, status helpers).
- `docs/projects/wallet/system/project_overview.md` — Technology Stack SDK/boltz-swap versions (PR #692) + optimistic-send note; Dependencies line bumped.
- `docs/projects/wallet/system/lightning-payment-flow.md` — added "Wallet UX — optimistic send + live settlement tracking (PR #668)" note explaining the wallet's earlier resolution point vs the blocking sequence.
- `docs/INDEX.md` — wallet Key Capabilities: new optimistic Lightning send bullet; SDK/boltz-swap bump line (0.4.39 / 0.3.44, PR #692); Dependencies line bumped.
- `docs/projects/wallet/change-log/last-sync.txt` → `907b3e72cd5f3ba64455a1f66a0ecac0b3c38045`.

## 2026-06-20 - Documentation Sync
**Commit**: `4d3ac3de8610235fcbd436332425c07bac80d848`
**Previous Sync**: `7a028c2f570bbd69cad0c980a49677eeaf1e180a`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 non-merge commits
- `4d3ac3de` chore: bump regtest submodule to master + finish Node-CLI migration (#689)
- `b1265bea` feat: Add boltz swap version to chatwoot (#691)
- `7ae88316` chore: use Node 24.x (#690)
- `f85ff5c1` fix branta errors (#675)
- `1dccb969` fix: serve .mjs as JS so the service worker registers (+ runtime-configurable LNURL URL) (#685)

**Features Added / Modified**:
- **Node 24.x** (PR #690): `engines.node` bumped to `>=24.15.0` (was `>=20.19.0 || >=22.12.0`); new `.nvmrc` pins `24.15.0`; Docker builder image `node:22-alpine` → `node:24.15.0-alpine`.
- **Node-CLI regtest migration** (PR #689): `regtest:start|stop|clean` now call `node regtest/regtest.mjs <cmd> --env .env.regtest`, replacing the removed nigiri `start-env.sh`/`stop-env.sh`/`clean-env.sh`. Stop/clean tear down `docker-compose.nak.yml` before the regtest stack (LIFO). Stale `ARKD_IMAGE` v0.9.5 / `FULMINE_IMAGE` v0.3.23 pins dropped from `.env.regtest` (submodule default Fulmine v0.3.25 + `FULMINE_DELEGATE_*` contract). Regtest explorer API base → `http://localhost:3000/api`. Chain-swap E2E asserts `Amount + Fees === Total` instead of nigiri sat constants; faucet via `execFile` arg array. `docs/swaps.regtest.md` rewritten for the Node-CLI flow; README/swaps Node prereq bumped.
- **Runtime-configurable VITE_* + LNURL URL** (PR #685): new `fromRuntimeEnv()` helper (`src/lib/constants.ts`) treats a leftover `__VITE_*__` placeholder as unset — applied to new `VITE_LNURL_SERVER_URL` (`lnurlServerUrl`), `VITE_ARK_SERVER`, and `VITE_BOLTZ_URL`. `docker-entrypoint.sh` rewritten to loop over the live `VITE_*` environment (a new runtime var only needs its Dockerfile `ARG`). `nginx.conf` forces a JS MIME type (`no-cache`) for `.mjs` so `wallet-service-worker.mjs` registers. New `VITE_LNURL_SERVER_URL` declared in `src/vite-env.d.ts`.
- **Chatwoot boltz_swap_version** (PR #691): Support screen imports `@arkade-os/boltz-swap`'s `sdkVersion` and adds it as the `boltz_swap_version` Chatwoot custom attribute.
- **Branta v2 client** (PR #675): Send form `BrantaService` uses string-literal config (`baseUrl: 'Production' | 'Staging'`, `privacy: 'strict'`) instead of the removed `BrantaServerBaseUrl` / `PrivacyMode` enums.

**Configuration Changes**:
- Dependency bumps: `@arkade-os/sdk` 0.4.37 → 0.4.38, `@arkade-os/boltz-swap` 0.3.42 → 0.3.43 (PR #691).
- Node engine `>=24.15.0`; new `.nvmrc`; new `VITE_LNURL_SERVER_URL` env var; `.env.regtest` image pins dropped.

**Breaking Changes**: None for app users. Dev/CI: Node 24.15.0+ now required; regtest commands changed (nigiri scripts removed).

**Files Touched in Repo** (21 files): `.env.regtest`, `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`, `.nvmrc`, `Dockerfile`, `README.md`, `docker-compose.nak.yml`, `docker-entrypoint.sh`, `docs/swaps.regtest.md`, `nginx.conf`, `package.json`, `pnpm-lock.yaml`, `regtest` (submodule), `src/lib/constants.ts`, `src/lib/explorers.ts`, `src/providers/swaps.tsx`, `src/screens/Settings/Support.tsx`, `src/screens/Wallet/Send/Form.tsx`, `src/test/e2e/receive.test.ts`, `src/test/e2e/swap.test.ts`, `src/vite-env.d.ts`.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.25 → 1.2.26 + `last_sync_commit`; Prerequisites Node >= 24.15.0; E2E commands + Node-CLI regtest note; new `VITE_LNURL_SERVER_URL` env row; new "Runtime VITE_* substitution" subsection; SDK/boltz-swap versions 0.4.38 / 0.3.43 with PR #691 + Branta v2 notes; Chatwoot bullet extended with `boltz_swap_version`.
- `docs/projects/wallet/system/project_overview.md` — Technology Stack SDK/boltz-swap/Branta versions + notes; Project Status dependencies + Node.js >= 24.15.0.
- `docs/projects/wallet/system/tech-stack.md` — SDK 0.4.38 / boltz-swap 0.3.43 headings; Node.js section (>=24.15.0, `.nvmrc`, Docker image); env table + runtime-substitution note + new `VITE_LNURL_SERVER_URL`; regtest scripts reference table (Node CLI).
- `docs/projects/wallet/testing/how_to_run.md` — Node prereq, Dockerfile base image, E2E regtest note, build-troubleshooting Node check.
- `docs/projects/wallet/testing/how_to_test.md` — E2E section rewritten from removed `test.docker-compose.yml` to the Node-CLI regtest flow.
- `docs/projects/wallet/sop/development-workflow.md` — Node prereq; regtest stack note (Node CLI, nigiri scripts removed).
- `docs/projects/wallet/sop/building-deployment.md` — Environment Configuration: new `VITE_LNURL_SERVER_URL`, "Runtime Substitution in the Docker Image" subsection (entrypoint loop, `fromRuntimeEnv`, `.mjs` MIME).
- `docs/INDEX.md` — wallet Key Capabilities: SDK/boltz-swap bump line + 5 new capability bullets (Node 24, Node-CLI regtest, runtime VITE_*/LNURL, Chatwoot boltz_swap_version, Branta v2); Dependencies line bumped (0.4.38 / 0.3.43) + Node requirement; Tags `node24` / `runtime-config`.
- `docs/projects/wallet/change-log/last-sync.txt` → `4d3ac3de8610235fcbd436332425c07bac80d848`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

## 2026-06-19 - Documentation Sync
**Commit**: `7a028c2f570bbd69cad0c980a49677eeaf1e180a`
**Previous Sync**: `331f6fc91ba063b21ccf04cd7563d64160c51403`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits
- `7a028c2f` add build and sdk versions to chatwoot custom attributes (#686)
- `248d3b51` Upgrade ts-sdk 0.4.37 - boltz-swap 0.3.42 (#684)

**Features Added / Modified**:
- **Chatwoot build/SDK version attributes** (PR #686): `src/screens/Settings/Support.tsx` now imports `buildVersion` and `sdkVersion` from `@arkade-os/sdk` and adds them as `build_version` / `sdk_version` Chatwoot custom attributes (alongside the existing `git_commit`), so support sessions surface the wallet's build and SDK versions.
- **Dependency bump** (PR #684): `@arkade-os/sdk` 0.4.36 → 0.4.37 and `@arkade-os/boltz-swap` 0.3.41 → 0.3.42. The 0.4.37 ts-sdk release is a release-only patch carrying a `MissingSigningDescriptorError` message fix; no application source beyond the Support screen changed.

**Configuration Changes**: Dependency bumps only: `@arkade-os/sdk` 0.4.37, `@arkade-os/boltz-swap` 0.3.42.
**Breaking Changes**: None.

**Files Touched in Repo** (3 files): `package.json`, `pnpm-lock.yaml`, `src/screens/Settings/Support.tsx`.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.24 → 1.2.25 + `last_sync_commit`; SDK/boltz-swap versions in Arkade Integration with PR #684 note + `buildVersion`/`sdkVersion` export note; Chatwoot bullet extended with `build_version` / `sdk_version` attributes (PR #686).
- `docs/projects/wallet/system/project_overview.md` — Technology Stack + Project Status dependency versions (SDK 0.4.37 / boltz-swap 0.3.42); Chatwoot integration bullet extended with `build_version` / `sdk_version` attributes.
- `docs/INDEX.md` — wallet Key Capabilities: Chatwoot bullet extended, new PR #686 capability bullet, SDK/boltz-swap bump line; Dependencies line bumped to 0.4.37 / 0.3.42.
- `docs/projects/wallet/change-log/last-sync.txt` → `7a028c2f570bbd69cad0c980a49677eeaf1e180a`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `system/tech-stack.md` — its `@arkade-os/sdk` / `@arkade-os/boltz-swap` headings had already drifted across multiple prior syncs (kept stable to avoid scope creep, consistent with recent convention); no new env var, build/test command, or architectural component.
- `system/architecture.md`, `system/components.md`, `system/ark-sdk-integration.md`, `system/lightning-payment-flow.md`, `system/pwa-features.md`, `sop/`, `testing/` — no architecture, API, env-var, or build/test change.

## 2026-06-18 - Documentation Sync
**Commit**: `331f6fc91ba063b21ccf04cd7563d64160c51403`
**Previous Sync**: `8da7062179a4ba29211db20d7b6b9463ab9e1247`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `331f6fc9` prevent double keys in local storage (#677)

**Features Added / Modified**:
- **Prevent double keys in `localStorage`** (PR #677): A new module `src/lib/storageKeys.ts` centralizes the two credential storage keys (`MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic'`, `NSEC_STORAGE_KEY = 'encrypted_private_key'`), which `mnemonic.ts` and `privateKey.ts` now import instead of holding their own local `STORAGE_KEY` constants — this also breaks a circular import between the two modules. The two keys are now mutually exclusive: `setMnemonic` calls `localStorage.removeItem(NSEC_STORAGE_KEY)` and `setPrivateKey` calls `localStorage.removeItem(MNEMONIC_STORAGE_KEY)`, so a wallet can never persist both an encrypted mnemonic and an encrypted private key at the same time (the prior double-key state could confuse the mnemonic-first unlock detection in `isValidPassword`). New/expanded tests in `src/test/lib/mnemonic.test.ts` and `src/test/lib/privatekey.test.ts`.

**Configuration Changes**: None.
**Breaking Changes**: None (internal refactor + bug fix; no external API or env-var changes).

**Files Touched in Repo** (5 files): `src/lib/storageKeys.ts` (new), `src/lib/mnemonic.ts`, `src/lib/privateKey.ts`, `src/test/lib/mnemonic.test.ts`, `src/test/lib/privatekey.test.ts`.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `last_sync_commit`; Self-Custodial Wallet "Encrypted storage" note on centralized + mutually-exclusive storage keys (PR #677).
- `docs/projects/wallet/system/project_overview.md` — "Legacy identity (`SingleKey`)" bullet extended with the `storageKeys.ts` centralization and mutual-exclusivity behavior (PR #677).
- `docs/INDEX.md` — wallet Key Capabilities bullet for PR #677.

## 2026-06-17 - Documentation Sync
**Commit**: `8da7062179a4ba29211db20d7b6b9463ab9e1247`
**Previous Sync**: `a4dede1289cb91f54ab51d245de30e267d5e4601`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `8da70621` Upgrade ts-sdk 0.4.36 - boltz-swap 0.3.41 (#676)

**Features Added / Modified**:
- **Dependency bump** (PR #676): `@arkade-os/sdk` 0.4.35 → 0.4.36 and `@arkade-os/boltz-swap` 0.3.40 → 0.3.41. The 0.4.36 ts-sdk release is a release-only patch (no `packages/ts-sdk/src/` changes); the substantive work is in boltz-swap 0.3.41 — optimistic `waitFor: 'funded'` Lightning resolution, `waitForSwapFunded`, and preimage backfill in `refreshSwapsStatus`. No application source changed in the wallet.

**Configuration Changes**: Dependency bumps only: `@arkade-os/sdk` 0.4.36, `@arkade-os/boltz-swap` 0.3.41.
**Breaking Changes**: None (dependency-only change).

**Files Touched in Repo** (2 files): `package.json`, `pnpm-lock.yaml`.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.23 → 1.2.24 + `last_sync_commit`; SDK/boltz-swap versions in Arkade Integration with PR #676 note.
- `docs/projects/wallet/system/project_overview.md` — tech-stack + Project Status dependency versions (SDK 0.4.36 / boltz-swap 0.3.41).
- `docs/INDEX.md` — wallet Key Capabilities SDK/boltz-swap bump line + Dependencies versions.

## 2026-06-16 - Documentation Sync
**Commit**: `a4dede1289cb91f54ab51d245de30e267d5e4601`
**Previous Sync**: `13f2652270ad89e054f85d2d47dc8fbd8c7655ab`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 4 non-merge commits
- `a4dede12` feat(dev): support VITE_DEV_MNEMONIC for dev auto-init (#674)
- `995f7620` fix(receive/send): correct clipboard, amountless LNURL, and BIP21 case handling (#672)
- `036bfc11` feat: consume ts-sdk PR #554 (arkd signer rotation) + flag deprecated-signer contracts (#670)
- `89e75ac7` Upgrade branta sdk to v3.1.3 (#673)

**Features Added / Modified**:
- **Signer rotation & deprecated-signer contracts** (PR #670): consumes ts-sdk PR #554 by bumping `@arkade-os/sdk` 0.4.34 → 0.4.35 and `@arkade-os/boltz-swap` 0.3.39 → 0.3.40. The dev-only Contracts screen (`src/screens/Settings/Contracts.tsx`) was rebuilt: compact collapsible rows, Active/Inactive tab, type-filter chips, search box, and a virtualized list (`@tanstack/react-virtual`). Contracts are classified against the operator's advertised signer set (`signerSetFromInfo` + `classifyAgainstSignerSet`), showing a **deprecated signer** / **deprecated signer / past cutoff** badge. Boarding contracts show their on-chain Bitcoin Taproot address (`bech32m` re-encode of the P2TR scriptPubKey) and link out to a block explorer (Arkade for ark, mempool for boarding).
- **Outdated-client detection** (PR #670): `getAspInfo` (`src/lib/asp.ts`) maps the SDK's typed `ArkError` named `BUILD_VERSION_TOO_OLD` to `{ unreachable: true, outdated: true, minBuildVersion }`; `AspInfo` gains `outdated?`/`minBuildVersion?`; new `aspErrorText(info, fallback)` shows "Your wallet is outdated…" across About/Server/Vtxos/Init/Wallet Index/Notes/Send/Unavailable screens, which now react to `aspInfo.outdated`. Copy reworded to "Arkade server"; `Chip` keyboard a11y added.
- **VITE_DEV_MNEMONIC dev auto-init** (PR #674): dev auto-init also accepts a 12-word mnemonic (preferred over `VITE_DEV_NSEC`); `WalletProvider` builds `MnemonicIdentity`/`SingleKey`; declared in `ImportMetaEnv` (`src/vite-env.d.ts`).
- **Receive/Send copy & BIP21 fixes** (PR #672): `resolveQrValue()` keeps an explicit copy-sheet selection across async QR rebuilds; tapping a copy row switches the QR; LNURL gated on the amountless condition; `encodeBip21` uses `useGrouping=false`; `decodeBip21` matches query keys case-insensitively via a `getParam()` helper.
- **Branta SDK v3.1.3** (PR #673): `@branta-ops/branta` upgraded; Send form uses `getPayments` for pasted-address/invoice verification, debounces typed-recipient lookups 400 ms, and only wraps the Branta badge in `<a>` when a verify URL exists.

**Configuration Changes**: New dev-only env var `VITE_DEV_MNEMONIC` (PR #674). Dependency bumps: `@arkade-os/sdk` 0.4.35, `@arkade-os/boltz-swap` 0.3.40, `@branta-ops/branta` 3.1.3.
**Breaking Changes**: None (dev/UX/dependency changes only).

**Files Touched in Repo** (23 files): `package.json`, `pnpm-lock.yaml`, `src/App.tsx`, `src/lib/asp.ts`, `src/lib/bip21.ts`, `src/providers/asp.tsx`, `src/providers/wallet.tsx`, `src/screens/Init/Init.tsx`, `src/screens/Settings/{About,Contracts,Server,Vtxos}.tsx`, `src/screens/Wallet/Index.tsx`, `src/screens/Wallet/Notes/{Form,Redeem}.tsx`, `src/screens/Wallet/Receive/QrCode.tsx`, `src/screens/Wallet/Send/Form.tsx`, `src/screens/Wallet/Unavailable.tsx`, `src/vite-env.d.ts`, plus tests.

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.22 → 1.2.23 + `last_sync_commit`; SDK/boltz-swap versions, added `@branta-ops/branta`; added `VITE_DEV_NSEC`/`VITE_DEV_MNEMONIC` env vars; rebuilt Contracts screen description; added outdated-client and Receive/BIP21 diagnostics bullets.
- `docs/projects/wallet/system/project_overview.md` — tech-stack + Project Status dependency versions; Developer/Diagnostics section (dev auto-init, Contracts rebuild, outdated-client prompt, BIP21 copy).
- `docs/INDEX.md` — wallet Key Capabilities (Contracts rebuild, SDK bump, outdated-client, VITE_DEV_MNEMONIC, Receive/BIP21, Branta), Tags, Dependencies.
- `docs/projects/wallet/change-log/last-sync.txt` → `a4dede1289cb91f54ab51d245de30e267d5e4601`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `system/architecture.md`, `system/tech-stack.md`, `system/components.md`, `system/ark-sdk-integration.md`, `system/lightning-payment-flow.md`, `system/pwa-features.md`, `sop/`, `testing/` — no change to architecture, component inventory, build/test commands, or user-facing usage beyond what's captured above.

---

## 2026-06-12 - Documentation Sync
**Commit**: `13f2652270ad89e054f85d2d47dc8fbd8c7655ab`
**Previous Sync**: `1637f4d02f3887b7605bc47c9df5a485c26be9c7`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `13f26522` fix(assets): handle scientific notation in prettyAssetNumber (#665)

**Bug Fix** (PR #665, commit `13f26522`): `prettyAssetNumber` in `src/lib/assets.ts` now converts scientific-notation inputs to fixed-point via `new Decimal(num).toFixed()` before splitting on `.`. Previously, `Number()`-coerced tiny fractions like `-8e-8` had the `e` stripped by the digit-filtering regex, producing `-8-8`, which `BigInt` rejects. New unit tests cover `prettyAssetNumber('-8e-8')` and tiny negative fractional amounts via `prettyAssetAmount(BigInt(-8), 8, true)`.

**Features Added / Modified / Removed**: None — display-formatting bug fix only.
**Configuration Changes**: None — no new env vars, dependencies, or build/test commands.
**Breaking Changes**: None.

**Files Touched in Repo** (2 files):
- `src/lib/assets.ts`
- `src/test/lib/asset.test.ts`

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.21 → 1.2.22 + `last_sync_commit`.
- `docs/projects/wallet/system/project_overview.md` — Asset Amount Precision section: noted the PR #665 scientific-notation fix on the `prettyAssetNumber` companion-helpers bullet.
- `docs/INDEX.md` — wallet Key Capabilities: extended the `prettyAssetNumber` hardening bullet with the PR #665 scientific-notation fix.
- `docs/projects/wallet/change-log/last-sync.txt` → `13f2652270ad89e054f85d2d47dc8fbd8c7655ab`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `system/architecture.md`, `system/tech-stack.md`, `system/ark-sdk-integration.md`, `sop/`, `testing/` — no API surface, dependency, env var, or build/test change; nothing to resync.

---

## 2026-06-11 - Documentation Sync
**Commit**: `1637f4d02f3887b7605bc47c9df5a485c26be9c7`
**Previous Sync**: `77b81f7f4ff021f0eeb012192236b40032775f6d`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `1637f4d0` Upgrade ts-sdk 0.4.34 - boltz-swap 0.3.39 (#655)

**Dependency Bump** (PR #655, commit `1637f4d0`): bumps the two Arkade JS libraries in `package.json` and refreshes `pnpm-lock.yaml`. Pure version bump — no code changes anywhere else in the wallet tree.
- `@arkade-os/sdk`: 0.4.33 → 0.4.34
- `@arkade-os/boltz-swap`: 0.3.38 → 0.3.39

**Features Added / Modified / Removed**: None — pure dependency bump.
**Configuration Changes**: None — no new env vars, no new build/test commands, no `pnpm-workspace.yaml` changes.
**Breaking Changes**: None expected for the wallet (patch-level bump of both packages).

**Files Touched in Repo** (2 files):
- `package.json`
- `pnpm-lock.yaml`

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.20 → 1.2.21 + `last_sync_commit`; `@arkade-os/sdk` 0.4.33 → 0.4.34 and `@arkade-os/boltz-swap` 0.3.38 → 0.3.39 in the Arkade Integration section (PR ref updated to #655, prior-PR pnpm-workspace context retained).
- `docs/projects/wallet/system/tech-stack.md` — `@arkade-os/sdk` heading 0.4.33 → 0.4.34 and `@arkade-os/boltz-swap` heading 0.3.38 → 0.3.39.
- `docs/projects/wallet/change-log/last-sync.txt` → `1637f4d02f3887b7605bc47c9df5a485c26be9c7`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)
- `docs/INDEX.md` — wallet **Key Capabilities** SDK-versions bullet bumped to 0.4.34 / 0.3.39 (PR #655, with PR #637 pnpm-workspace baseline retained); **Dependencies** line bumped to `@arkade-os/sdk` 0.4.34 + `@arkade-os/boltz-swap` 0.3.39.

**Files Not Updated** (intentional):
- `system/project_overview.md` — its `@arkade-os/sdk` / `@arkade-os/boltz-swap` version mentions had already drifted across multiple syncs without being touched; kept stable here to avoid scope creep, consistent with prior sync conventions.
- `system/architecture.md`, `system/ark-sdk-integration.md`, `sop/development-workflow.md`, `testing/how_to_run.md`, `testing/how_to_test.md` — no API surface, build script, or env var changed; nothing to resync.

---

## 2026-06-10 - Documentation Sync
**Commit**: `77b81f7f4ff021f0eeb012192236b40032775f6d`
**Previous Sync**: `6073145afa5b0c9d80185183608036ca0a4c886e`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `77b81f7f` Upgrade ts-sdk 0.4.33 - boltz-swap 0.3.38 (#650)

**Dependency Bump** (PR #650, commit `77b81f7f`): bumps the two Arkade JS libraries in `package.json` and refreshes `pnpm-lock.yaml`. Pure version bump — no code changes anywhere else in the wallet tree.
- `@arkade-os/sdk`: 0.4.32 → 0.4.33
- `@arkade-os/boltz-swap`: 0.3.37 → 0.3.38

**Features Added / Modified / Removed**: None — pure dependency bump.
**Configuration Changes**: None — no new env vars, no new build/test commands, no `pnpm-workspace.yaml` changes.
**Breaking Changes**: None expected for the wallet (patch-level bump of both packages).

**Files Touched in Repo** (2 files):
- `package.json`
- `pnpm-lock.yaml`

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.19 → 1.2.20 + `last_sync_commit`; `@arkade-os/sdk` 0.4.32 → 0.4.33 and `@arkade-os/boltz-swap` 0.3.37 → 0.3.38 in the Arkade Integration section (PR ref updated to #650, prior-PR pnpm-workspace context retained).
- `docs/projects/wallet/system/tech-stack.md` — `@arkade-os/sdk` heading 0.4.28 → 0.4.33 and `@arkade-os/boltz-swap` heading 0.3.33 → 0.3.38 (resyncs headings that had drifted across recent bumps).
- `docs/projects/wallet/change-log/last-sync.txt` → `77b81f7f4ff021f0eeb012192236b40032775f6d`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)
- `docs/INDEX.md` — wallet **Key Capabilities** SDK-versions bullet bumped to 0.4.33 / 0.3.38 (PR #650, with PR #637 pnpm-workspace baseline retained); **Dependencies** line bumped to `@arkade-os/sdk` 0.4.33 + `@arkade-os/boltz-swap` 0.3.38.

**Files Not Updated** (intentional):
- `system/project_overview.md` — its `@arkade-os/sdk` / `@arkade-os/boltz-swap` version mentions had already drifted (0.4.28 / 0.3.33) across multiple syncs without being touched; kept stable here to avoid scope creep, consistent with prior sync conventions.
- `system/architecture.md`, `system/ark-sdk-integration.md`, `sop/development-workflow.md`, `testing/how_to_run.md`, `testing/how_to_test.md` — no API surface, build script, or env var changed; nothing to resync.

---

## 2026-06-09 - Documentation Sync
**Commit**: `6073145afa5b0c9d80185183608036ca0a4c886e`
**Previous Sync**: `3d2c95d34f52c133a7c2b5e7c2065828d2f0f7fc`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `6073145a` update regtest link (#654)

**Infrastructure / Test-Env Only** (PR #654, commit `6073145a`): updates the `regtest` git submodule pointer used by the wallet's local E2E stack.
- `.gitmodules`: the `regtest` submodule's tracked `branch` switched from `bordalix` to `master`, so future `git submodule update --remote` calls follow the canonical upstream branch of `https://github.com/ArkLabsHQ/arkade-regtest.git` rather than a contributor branch.
- `regtest` (submodule pointer): bumped `dc23da2c` → `cd473132` (advances to the matching tip on `master`).

**Features Added / Modified / Removed**: None — purely a submodule pointer + tracking-branch update for the dev/regtest infrastructure.
**Configuration Changes**: None — no new env vars, no new build/test commands, no `.env.regtest` change.
**Dependencies**: No `package.json` or `pnpm-lock.yaml` changes.
**Breaking Changes**: None for application code; developers who had a local checkout of the `bordalix` regtest branch should `git submodule update --init --recursive` to pick up the new pointer.

**Files Touched in Repo** (2 files):
- `.gitmodules`
- `regtest` (submodule pointer)

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.18 → 1.2.19 + `last_sync_commit`.
- `docs/projects/wallet/change-log/last-sync.txt` → `6073145afa5b0c9d80185183608036ca0a4c886e`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/INDEX.md` — no tracked field affected. The wallet entry's E2E capability bullet ("E2E testing with Playwright using shared `arkade-regtest` submodule + `nak` Nostr relay") does not pin a branch and remains accurate.
- `system/project_overview.md`, `system/architecture.md`, `system/tech-stack.md` — no code, API, env-var, or build-script change.
- `sop/development-workflow.md`, `testing/how_to_run.md` — the `git submodule update --init --recursive` instruction is unchanged; users on a fresh clone get the new `master`-tracked submodule automatically.

---

## 2026-06-06 - Documentation Sync
**Commit**: `3d2c95d34f52c133a7c2b5e7c2065828d2f0f7fc`
**Previous Sync**: `917404814b786154b8a5d42d44ac6462cbf6aca2`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `3d2c95d3` fix(Transaction): show roundTxid for offboarding batch transactions (#648)

**Bug Fixes** (PR #648, commit `3d2c95d3`): the transaction-detail view's TXID fallback chain was missing `roundTxid`, so offboarding transactions that settle in a batch displayed no TXID. `src/screens/Wallet/Transaction.tsx` line 127 now reads `tx.boardingTxid || tx.redeemTxid || tx.roundTxid || ''` (third fallback added), so the batch's commitment TXID is shown when a transaction has neither a boarding TXID nor a redeem TXID. One-line change; the commit's PR description also mentions a folded-in "fix send all fiat" but no other files are touched in the diff between the two sync hashes, so any fiat-send adjustment landed via the same `Transaction.tsx` edit or in an earlier commit.

**Features Added / Modified / Removed**: None — single bug fix to TXID display fallback for the transaction-detail screen.
**Configuration Changes**: None — no new env vars, no new build/test commands.
**Dependencies**: No `package.json` or `pnpm-lock.yaml` changes.
**Breaking Changes**: None.

**Files Touched in Repo** (1 file):
- `src/screens/Wallet/Transaction.tsx`

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.17 → 1.2.18 + `last_sync_commit`.
- `docs/projects/wallet/change-log/last-sync.txt` → `3d2c95d34f52c133a7c2b5e7c2065828d2f0f7fc`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)
- `docs/INDEX.md` — added wallet Key Capability bullet for PR #648.

**Files Not Updated** (intentional): `system/project_overview.md`, `system/architecture.md`, `testing/usage.md`, and the SOPs — the change is a one-line TXID fallback fix in the transaction-detail view with no architectural or workflow implications.

---

## 2026-06-05 - Documentation Sync
**Commit**: `917404814b786154b8a5d42d44ac6462cbf6aca2`
**Previous Sync**: `760cbc0840a06e121fa40762148778a4290e776a`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `91740481` fix typescript build errors (tsc -b) (#646)

**Bug Fixes / Type Hygiene** (PR #646, commit 91740481): TypeScript-build (`tsc -b`) cleanup pass — fixes a few real type errors so the project builds clean and standardises a Framer Motion typing detail. Folded into this PR:
- **`functions/_middleware.ts`** — collapses the timing-safe-equal `if` onto a single line and adds `// @ts-expect-error Cloudflare runtime extension is not part of SubtleCrypto typings.` above the call, because `crypto.subtle.timingSafeEqual` is a Cloudflare-runtime-only extension that doesn't exist on the standard `SubtleCrypto` interface. No behavioural change to the Basic-Auth path.
- **`src/lib/animations.ts`** — all `transition.ease` values switch from the `EASE_OUT_QUINT` named-string ease to `EASE_OUT_QUINT_TUPLE` (the existing tuple form), required by Framer Motion's typed `Transition` schema (cubic-bezier tuple, not named easings). Affects `pageTransitionVariants.animate/exit`, `overlaySlideUp.animate/exit`, `walletLoadInChild.animate`, and `onboardStaggerChild.animate`. Same easing curve at runtime — type-only fix.
- **`src/providers/notifications.tsx`** — the Nostr-notifications effect now reads `config.nostrBackup` instead of the non-existent `config.nostr` (both in the `if (!config.nostrBackup)` guard and in the dependency array). This fixes a build error and means the relay connection in `NotificationsProvider` now opens/closes when the user toggles **Nostr backup** in settings (rather than tracking a property that didn't exist on the config type).
- **`src/screens/Apps/Boltz/Settings.tsx`** — the `RecoveryRow` else-branch that set `blocksAway = Math.max(0, info.refundLocktime - info.currentBlockHeight)` is removed (it referenced `info.currentBlockHeight`, a field not on the type). Only the seconds-based `secondsAway` path remains for pre-CLTV recovery locktime guidance.
- **`src/vite-plugin-eslint.d.ts`** (new, 12 lines) — ambient module declaration for `vite-plugin-eslint` (no upstream types). Declares `VitePluginESLintOptions` (include/exclude/cache plus a string-indexed bag) and a default-exported `eslint(options?): PluginOption` so `vite.config.ts` type-checks without `any`.
- **`.gitignore`** — adds `tsconfig.tsbuildinfo` (the `tsc -b` incremental-build cache emitted by this PR's build mode).
- **`pnpm-lock.yaml`** — `@testing-library/dom@10.4.1` transitive deps `@babel/code-frame`, `@babel/runtime`, and `@babel/helper-validator-identifier` bumped from `7.29.0`/`7.29.2` to `7.29.7`. **No `package.json` changes** — dev-only transitive churn.

**Tests Updated** (same PR, type-shape fixes):
- `src/test/lib/format.test.ts` — assertions broadened to satisfy the stricter inferred types from `format.ts` helpers.
- `src/test/screens/mocks.ts` — mock shapes widened so screen tests compile against the latest provider/context types.
- `src/test/screens/settings/contracts.test.tsx`, `src/test/screens/wallet/receive-qrcode.test.tsx`, `src/test/screens/wallet/transaction.test.tsx` — minor mock/assertion adjustments.

**Features Added / Modified / Removed**: None — `tsc -b` build-error cleanup with two small folded-in functional fixes (notifications now react to `nostrBackup`; Boltz `RecoveryRow` no longer attempts the block-height fallback for pre-CLTV locktimes).
**Configuration Changes**: None — no new env vars, no new build/test commands. `tsconfig.tsbuildinfo` added to `.gitignore`.
**Dependencies**: No `package.json` changes (only dev-time transitive Babel bumps inside `pnpm-lock.yaml`).
**Breaking Changes**: None.

**Files Touched in Repo** (12 files):
- `.gitignore`
- `functions/_middleware.ts`
- `pnpm-lock.yaml`
- `src/lib/animations.ts`
- `src/providers/notifications.tsx`
- `src/screens/Apps/Boltz/Settings.tsx`
- `src/test/lib/format.test.ts`
- `src/test/screens/mocks.ts`
- `src/test/screens/settings/contracts.test.tsx`
- `src/test/screens/wallet/receive-qrcode.test.tsx`
- `src/test/screens/wallet/transaction.test.tsx`
- `src/vite-plugin-eslint.d.ts` (new)

**Files Updated**:
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.16 → 1.2.17 + `last_sync_commit`.
- `docs/projects/wallet/change-log/last-sync.txt` → `917404814b786154b8a5d42d44ac6462cbf6aca2`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/INDEX.md` — no tracked field affected (Key Capabilities, Tags, Dependencies, Triggers, dep versions are all unchanged by this build-fix PR; the notifications-effect dependency change is too localised to surface in the master registry).
- `docs/projects/wallet/system/*` and `testing/*` — no architectural component, env var, API endpoint, or build/test command added; the only functional fixes are a one-line dep-array swap in `NotificationsProvider` and a dead-branch removal in `RecoveryRow`, neither of which alters documented surfaces.

---

## 2026-06-04 - Documentation Sync
**Commit**: `760cbc0840a06e121fa40762148778a4290e776a`
**Previous Sync**: `00983717ffd73c674d1663734ac98435050ff924`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `760cbc08` contracts view: copy encoded params, empty state, active/inactive sections (#645)

**Features Modified** (PR #645, commit 760cbc08): Contracts dev-mode screen overhaul (`src/screens/Settings/Contracts.tsx`, ~75 line rewrite).
- **Encoded parameters row**: imports `encodeArkContract` from `@arkade-os/sdk` and wraps it in a `useMemo` + `try/catch` — on success a third `CopyRow label='parameters'` is rendered with the encoded string; on failure the row is omitted (guards against malformed `contract.params` white-screening the Contracts screen).
- **Empty state**: when `contracts.length === 0`, the screen renders `<TextSecondary>No contracts found.</TextSecondary>` instead of an empty `FlexCol`.
- **Active / Inactive sections**: contracts are split into `active = contracts.filter(c => c.state === 'active')` and `inactive = contracts.filter(c => c.state !== 'active')` and rendered via a new local `Section({ title, contracts })` component (returns `null` if the group is empty). Outer `FlexCol gap='2rem'` between sections; section title uses `<Text capitalize color='neutral-500' smaller>`.
- **Card layout**: inline `cardStyle` constant replaced by the existing `Shadow border` wrapper component. Each card now shows the `contract.label` (if present, top-left), `contract.type` (small/neutral-500, below label), `contract.state` (top-right, green for active else neutral-500), and `contract.createdAt` formatted via `prettyAgo` (top-right, below state) — with `'Unknown'` fallback when `createdAt` is absent.
- **React key**: `ContractCard` keys switched from `contract.script` to `contract.address` (uniqueness improvement; addresses are guaranteed unique per contract).
- **New import**: `prettyAgo` from `../../lib/format` (alongside existing `prettyLongText`).

**Tests Updated** (`src/test/screens/settings/contracts.test.tsx`):
- `mockContracts` entries gained `params: {}` and `createdAt: 1717000000000` fields to match the updated `Contract` shape consumed by `encodeArkContract` / `prettyAgo`.
- New test case `'renders empty state when there are no contracts'` — mocks `getContracts: () => Promise.resolve([])` and asserts `'No contracts found.'` is rendered.

**Bug Fixes**: review-pass hardening folded into the same PR — `encodeArkContract` wrapped in `try/catch` (no white-screen on missing/malformed `params`), `createdAt` falls back to `'Unknown'` rather than rendering an empty string, and the card React key uses the unique `contract.address` instead of `script`.
**Configuration Changes**: None.
**Dependencies**: None — `encodeArkContract` is already exported from the in-use `@arkade-os/sdk` 0.4.32.
**Breaking Changes**: None — Contracts screen is gated behind dev-mode (Settings → Advanced).

**Files Touched in Repo** (2 files):
- `src/screens/Settings/Contracts.tsx`
- `src/test/screens/settings/contracts.test.tsx`

**Files Updated**:
- `docs/INDEX.md` — wallet **Key Capabilities** Contracts-screen bullet expanded to describe the active/inactive sections, encoded-parameters copy row, `prettyAgo` createdAt display, empty state, and the `Shadow border` card layout (PR #645).
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.15 → 1.2.16 + `last_sync_commit`; **Contracts screen** Developer/Diagnostics bullet rewritten to reflect PR #645 (label/type, state + `prettyAgo` createdAt, copyable address/script/encoded parameters, active/inactive sections, empty state, `useMemo` + `try/catch` guard).
- `docs/projects/wallet/change-log/last-sync.txt` → `760cbc0840a06e121fa40762148778a4290e776a`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/projects/wallet/system/*` and `testing/*` — no new env var, no new build/test command, no new architectural component; the change is a localised UI overhaul of a single dev-mode screen.

---

## 2026-06-02 - Documentation Sync
**Commit**: `00983717ffd73c674d1663734ac98435050ff924`
**Previous Sync**: `32c7773670551bdf1373e7e6354b7b51344ff23d`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 non-merge commits
- `00983717` don't check lnUrl conditions if ark address is present (#643)
- `7f26a4f6` double the distance needed to trigger pull-to-refresh (#642)
- `38863d68` fix multiple notification toasts (#641)
- `683db88a` fix send all fiat (#640)
- `1f590c32` fix bip21 parser (#639)
- `891531b8` Upgrade ts sdk 0.4.32 boltz swap 0.3.37 (#637)

**Dependency Bump** (PR #637, commit 891531b8):
- `@arkade-os/sdk` 0.4.28 → 0.4.32 and `@arkade-os/boltz-swap` 0.3.33 → 0.3.37 in `package.json` (and `pnpm-lock.yaml`).
- pnpm build-dependency configuration (`onlyBuiltDependencies: ['@arkade-os/sdk']` + `ignoredBuiltDependencies: ['esbuild']`) relocated from `package.json` `pnpm` block into `pnpm-workspace.yaml`.

**Bug Fixes**:
- **PR #639 (`1f590c32`) — BIP21 parser polish.** Renamed `Bip21Decoded.lnurl` → `lnUrl` (camelCase) in `src/lib/bip21.ts`; `decodeBip21` writes `result.lnUrl`. `src/lib/lnurl.ts` now exports the `LnUrlResponse` type, and `checkResponse` `await`s the JSON body and rejects with `data.reason || 'LNURL error'` when the body sets `status === 'ERROR'`. Send-form (`src/screens/Wallet/Send/Form.tsx`) reorganised so millisatoshi vs satoshi units stay consistent across LNURL/Lightning amount paths. E2E `src/test/e2e/bip21.test.ts` and unit `src/test/lib/bip21.test.ts` updated to match.
- **PR #640 (`683db88a`) — Send "Max" in fiat mode.** In `src/screens/Wallet/Send/Form.tsx`, the Max-tap handler now sets `amountTextValue` to `toFiat(liquidBalance).toFixed(fiatDecimalsFor(config.fiat))` when `useFiat` is true (still the raw `liquidBalance.toString()` in sats mode). New import: `fiatDecimalsFor` from `@/lib/fiat`. Internal `satoshis` state unchanged.
- **PR #641 (`38863d68`) — Toast deduplication.** `src/components/Toast.tsx` `ToastProvider` adds `visibleToasts={1}` to `<Toaster>` so at most one sonner notification renders at a time; eliminates stacked notifications during rapid sequential actions.
- **PR #642 (`7f26a4f6`) — Pull-to-refresh threshold.** `src/components/Refresher.tsx` doubles the trigger distance — fewer accidental refreshes from short scroll gestures.
- **PR #643 (`00983717`) — Skip LNURL checks when ARK address present.** `src/screens/Wallet/Send/Form.tsx` LNURL-conditions `useEffect` early-returns when `sendInfo.arkAddress` is set; `sendInfo.arkAddress` added to the dep array. `encodeBip21` (`src/lib/bip21.ts`) rewritten to build the query progressively — empty `ark=` is omitted, and trailing `&`/`?` are trimmed so e.g. `bitcoin:<addr>` with no extras no longer leaves a dangling `?`. `src/components/Error.tsx` reformatted (one-line tweak). New E2E suite `src/test/e2e/form.test.ts` exercises Send-form interactions; shared E2E helpers (`utils.ts`) extended; `nostr.test.ts`/`restore.test.ts`/`swap.test.ts` updated to consume the new helpers.

**Features Added / Modified / Removed**: None — all six commits are dependency bumps or bug-fix/polish.
**Configuration Changes**: pnpm build-dependency lists relocated from `package.json` to `pnpm-workspace.yaml` (no behavioural change).
**Breaking Changes**: `Bip21Decoded.lnurl` → `lnUrl` is a rename in the in-tree return type — internal to the wallet (no public API contract changes for downstream consumers).

**Files Touched in Repo** (16 files):
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `src/components/Error.tsx`, `src/components/Refresher.tsx`, `src/components/Toast.tsx`
- `src/lib/bip21.ts`, `src/lib/lnurl.ts`
- `src/screens/Wallet/Send/Form.tsx`
- `src/test/e2e/bip21.test.ts`, `src/test/e2e/form.test.ts` (new), `src/test/e2e/nostr.test.ts`, `src/test/e2e/restore.test.ts`, `src/test/e2e/swap.test.ts`, `src/test/e2e/utils.ts`
- `src/test/lib/bip21.test.ts`

**Files Updated**:
- `docs/INDEX.md` — wallet **Key Capabilities** SDK-versions bullet updated (0.4.32 / 0.3.37 + pnpm relocation note); new bullet summarising PRs #639–#643; **Dependencies** line bumped to `@arkade-os/sdk` 0.4.32 + `@arkade-os/boltz-swap` 0.3.37.
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.14 → 1.2.15 + `last_sync_commit`; **Arkade Integration** SDK + boltz-swap version lines bumped with a note about the `pnpm-workspace.yaml` relocation; five new Developer / Diagnostics bullets covering PRs #639–#643.
- `docs/projects/wallet/change-log/last-sync.txt` → `00983717ffd73c674d1663734ac98435050ff924`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/projects/wallet/system/*` and `testing/*` — no architectural change, no new env var, no new build/test command, no new end-user surface; all five fixes are localised tweaks to existing components/utilities and the SDK bump is a patch-version dependency upgrade.

---

## 2026-05-30 - Documentation Sync
**Commit**: `32c7773670551bdf1373e7e6354b7b51344ff23d`
**Previous Sync**: `712c3189c5a258cb4d8b69df28d9b48af4b46f59`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `32c77736` fix bip21 parser (#636)

**Bug Fixes** (PR #636, commit 32c77736):
- `src/lib/bip21.ts` — `decodeBip21` now accepts uppercase URI query parameters (`ARK`/`ASSETID`/`AMOUNT`/`LIGHTNING`) alongside the lowercase forms, matching BIP21 QR encoders that uppercase-encode the URI for denser QR codes. `Bip21Decoded` is now initialised with `assetId`/`assetAmount`/`arkAddress` explicitly `undefined` so destructuring yields stable shapes. Empty addresses (e.g. ARK-only payment URIs like `bitcoin:?ark=...`) no longer write an empty `address` string into the result. The lightning branch reads the lightning param once into a local before lowercase-prefix checks.
- `src/lib/address.ts` — `isBTCAddress` segwit + legacy regexes gained the `i` flag so uppercase BTC addresses (also valid in BIP21 uppercase URIs) pass validation.
- `src/test/lib/bip21.test.ts` — new "should decode a valid bip21 URI with uppercase" test exercising `BITCOIN:?ARK=...&LIGHTNING=LNURL...` end-to-end.

**Dev Dependency**:
- `@playwright/test` 1.55.x → 1.60.0 (E2E test runner; `package.json` + `pnpm-lock.yaml`).

**Features Added / Modified / Removed**: None — robustness bugfix to existing BIP21 parser.
**Configuration Changes**: None
**Breaking Changes**: None — change is permissive (accepts more inputs); behaviour for previously-accepted lowercase URIs is unchanged.

**Files Touched in Repo** (5 files):
- `package.json`
- `pnpm-lock.yaml`
- `src/lib/address.ts`
- `src/lib/bip21.ts`
- `src/test/lib/bip21.test.ts`

**Files Updated**:
- `docs/INDEX.md` — wallet **Key Capabilities** BIP21 bullet now notes PR #636 (uppercase query params + `isBTCAddress` `i` flag).
- `docs/projects/wallet/INDEX.md` — frontmatter `version` 1.2.13 → 1.2.14 + `last_sync_commit`; new "BIP21 parser case-insensitive" capability bullet under Developer / Diagnostics.
- `docs/projects/wallet/change-log/last-sync.txt` → `32c7773670551bdf1373e7e6354b7b51344ff23d`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/projects/wallet/system/*` and `testing/*` — no architectural, env-var, API, build/test-command, or end-user feature surface change; the fix only loosens input acceptance inside two existing `lib/` utilities, and the Playwright bump is a dev-only patch already covered by the generic Playwright reference in `system/tech-stack.md`.

---

## 2026-05-28 - Documentation Sync
**Commit**: `712c3189c5a258cb4d8b69df28d9b48af4b46f59`
**Previous Sync**: `81a29b0b87ae4e94d123164a0981d5f6435f1747`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `712c3189` Fix swap info page (#633)

**Bug Fixes** (PR #633, commit 712c3189):
- `src/screens/Apps/Boltz/Swap.tsx` — Chain Swap info page now shows the correct destination BTC address for ARK→BTC swaps. Was incorrectly reading `swapInfo.response.lockupDetails?.lockupAddress` (the user's funded ARK side) instead of the on-chain claim destination; now uses `swapInfo.toAddress` (the BTC address the user is sending to). The BTC→ARK branch (`swapInfo.response.claimDetails?.lockupAddress`) is unchanged.
- `src/test/e2e/swap.test.ts` — "send funds to Bitcoin" e2e now asserts the displayed `BTC Address` cell equals `prettyLongText(someOnchainAddress)`, guarding against this regression.

**Features Added / Modified / Removed**: None — UI-display bugfix to the Chain Swap info screen.
**Configuration Changes**: None
**Dependencies**: None
**Breaking Changes**: None

**Files Touched in Repo** (2 files):
- `src/screens/Apps/Boltz/Swap.tsx`
- `src/test/e2e/swap.test.ts`

**Files Updated**:
- `docs/projects/wallet/INDEX.md` (frontmatter `version` 1.2.12 → 1.2.13 + `last_sync_commit`)
- `docs/projects/wallet/change-log/last-sync.txt` → `712c3189c5a258cb4d8b69df28d9b48af4b46f59`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

**Files Not Updated** (intentional):
- `docs/INDEX.md` — no tracked field affected (Key Capabilities, Tags, Dependencies, Triggers, dep versions all unchanged by this bugfix).
- `docs/projects/wallet/system/*` and `testing/*` — no architectural, API, env-var, or feature surface change; the fix swaps one field reference inside an existing info table.

---

## 2026-05-26 - Documentation Sync
**Commit**: `81a29b0b87ae4e94d123164a0981d5f6435f1747`
**Previous Sync**: `9848c02c3ea72d8a004c703ea9d7577bbd946bf4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit
- `81a29b0b` Upgrade ts-sdk 0.4.28 - boltz-swap 0.3.33 (#631)

**Dependency Updates** (PR #631, commit 81a29b0b):
- `@arkade-os/sdk`: 0.4.27 → 0.4.28
- `@arkade-os/boltz-swap`: 0.3.32 → 0.3.33
- `pnpm-lock.yaml` regenerated.

**Features Added / Modified / Removed**: None — package.json dependency-version bumps only.
**Configuration Changes**: None
**Breaking Changes**: None

**Files Touched in Repo** (2 files):
- `package.json`
- `pnpm-lock.yaml`

**Files Updated**:
- `docs/INDEX.md` (wallet Key Capabilities + Dependencies: sdk 0.4.27 → 0.4.28, boltz-swap 0.3.32 → 0.3.33)
- `docs/projects/wallet/INDEX.md` (frontmatter `version` 1.2.11 → 1.2.12 + `last_sync_commit`; Arkade Integration sdk/boltz-swap versions)
- `docs/projects/wallet/system/project_overview.md` (sdk/boltz-swap versions in Technology Stack + Dependencies footer)
- `docs/projects/wallet/system/tech-stack.md` (`@arkade-os/sdk` heading 0.4.27 → 0.4.28; `@arkade-os/boltz-swap` heading 0.3.32 → 0.3.33)
- `docs/projects/wallet/change-log/last-sync.txt` → `81a29b0b87ae4e94d123164a0981d5f6435f1747`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

---

## 2026-05-21 - Documentation Sync
**Commit**: `9848c02c3ea72d8a004c703ea9d7577bbd946bf4`
**Previous Sync**: `447f01866732aca287f791caad60791cc8244739`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits
- `9848c02c` fix prettyAssetNumber (#626)
- `dfb1e9d3` feat(wallet): mnemonic identity for new wallets (#624)

**Features Added / Modified**:
- **Mnemonic identity for new wallets (PR #624, commit dfb1e9d3)** — biggest change in this sync. New `src/lib/mnemonic.ts` adds encrypted-at-rest storage (`localStorage['encrypted_mnemonic']`, PBKDF2 100k SHA-256 → AES-GCM 256 with per-record 16-byte salt + 12-byte IV) and a `deriveNostrKeyFromMnemonic(mnemonic, isMainnet)` helper that derives the 32-byte BIP86 Taproot key at `m/86'/coinType'/0'/0/0` (`validateMnemonic` guard + null-privateKey defensive check). New wallets now generate a 12-word BIP39 mnemonic and run on `MnemonicIdentity` (from `@arkade-os/sdk`); existing wallets keep using `SingleKey`. `src/providers/wallet.tsx` is reworked:
  - `initWallet` signature changed from `initWallet(seed: Uint8Array)` to `initWallet(credentials: { mnemonic?: string; privateKey?: Uint8Array })`; mnemonic path builds `MnemonicIdentity.fromMnemonic(..., { isMainnet })`, calls `deriveNostrKeyFromMnemonic` and pushes it through `FlowContext.setLnurlInfo`; privateKey path uses `SingleKey.fromPrivateKey` and sets the LNURL secret to the raw private key.
  - `InitSvcWorkerWalletParams.privateKey?: string` removed; the new `identity: Identity` (`SingleKey` or `MnemonicIdentity`) is required. `runInitAttempt(signal, params.identity, params)` flows through `ServiceWorkerWallet.setup({ ..., walletMode: 'static' })` — `walletMode` is now pinned to `static` for **all** wallets to prevent address rotation (a mid-PR fix-up commit had accidentally swapped it back to `'hd'`).
  - `unlockWallet` now branches on `hasMnemonic()` — `getMnemonic(password)` or `getPrivateKey(password)` — and translates `DOMException` from `crypto.subtle.decrypt` to `Error('Invalid password')` (the raw crypto error used to leak on wrong password).
  - `restartWallet` no longer pulls `.toHex()` off the identity (which `MnemonicIdentity` doesn't implement) — it reuses `svcWallet.identity` directly; `reinitSvcWalletRef` now stores `(identity: Identity) => Promise<void>`.
  - `detectPasswordState()` checks `encrypted_mnemonic` first (with a `getMnemonic(defaultPassword)` probe for passwordless detection) before falling back to `noUserDefinedPassword()` for legacy wallets.
- **Service worker custom `buildServices` (PR #624)** — `src/wallet-service-worker.ts` now ships its own `buildServices` that branches on the wallet-config payload (`mnemonic`, `privateKey`, or `publicKey`) and constructs `MnemonicIdentity` internally; `initSvcWorkerWallet` for mnemonic wallets manually drives `INITIALIZE_MESSAGE_BUS` with `{ mnemonic, isMainnet }` instead of deriving a `SingleKey` (which would lose the mnemonic identity). The mnemonic is held in a ref for `restartWallet` and cleared on lock.
- **Restore screen mnemonic-aware (PR #624)** — `src/screens/Init/Restore.tsx` auto-detects 12-word mnemonics vs `nsec1...` / raw-hex input, mentions raw hex in the help text, clears parsed state when the input is emptied, and routes parsed credentials into `initWallet(...)` with the right shape.
- **Backup screen recovery-phrase support (PR #624)** — `src/screens/Settings/Backup.tsx` shows the recovery phrase for mnemonic wallets and the `nsec` for legacy wallets; keeps the backup dialog open on invalid password; copy casing normalised to sentence case ("private key"). Backup tests + the shared `getSecret` e2e helper now know both wallet shapes.
- **Password change re-encrypts mnemonic (PR #624)** — `src/screens/Settings/Password.tsx` `saveNewPassword` re-encrypts the mnemonic (not just the private key) when the wallet is mnemonic-backed; `isValidPassword` / `noUserDefinedPassword` updated to check `encrypted_mnemonic` first, fixing the "password change never authenticates on mnemonic wallets" bug.
- **InitConnect fast-fails on missing credentials (PR #624)** — `src/screens/Init/Connect.tsx` now bails with a clear error instead of silently constructing a broken wallet when neither mnemonic nor privateKey is present.
- **LNURL provider keyed off `setLnurlInfo` secret (PR #624)** — `src/providers/lnurl.tsx` and `flow.tsx` now thread the per-identity secret (BIP86 key for mnemonic wallets, raw private key for legacy wallets) into the LNURL session so the same `HMAC-SHA256(secret, "lnurl-session")` derivation works for both wallet types. `xonlypubkey` for lnurl credentials was tried and reverted; the working path is the secret-based `HMAC-SHA256`.
- **`prettyAssetNumber` hardening (PR #626, commit 9848c02c)** — `src/lib/assets.ts` `prettyAssetNumber` now defaults `maximumFractionDigits` to `MAX_DECIMALS` (8) and strips non-digit / non-`-` characters from the integer part (`integer.replace(/[^0-9-]+/g, '')`) before computing `negative`. New asset-formatter test cases in `src/test/lib/asset.test.ts`.
- **`cross-env` for E2E scripts (PR #624)** — `package.json` `test:e2e` / `test:e2e:ui` now use `cross-env VITE_NOSTR_RELAY_URL=http://localhost:10547 playwright test` so the env var works on Windows shells.

**Dependency Updates**: `cross-env` added to devDependencies (via `package.json` script changes).

**Files Touched in Repo** (17 files):
- `package.json`
- `src/lib/assets.ts`, `src/lib/mnemonic.ts` (new), `src/lib/privateKey.ts`
- `src/providers/flow.tsx`, `src/providers/lnurl.tsx`, `src/providers/wallet.tsx`
- `src/screens/Init/Connect.tsx`, `src/screens/Init/Init.tsx`, `src/screens/Init/Restore.tsx`
- `src/screens/Settings/Backup.tsx`, `src/screens/Settings/Password.tsx`
- `src/test/e2e/backup.test.ts`, `src/test/e2e/utils.ts`
- `src/test/lib/asset.test.ts`, `src/test/lib/mnemonic.test.ts` (new), `src/test/screens/settings/backup.test.tsx`

**Configuration Changes**: None (no new env vars; storage layout adds `encrypted_mnemonic` key alongside the legacy `encrypted_private_key` key).
**Breaking Changes**: `WalletContext.initWallet` signature changed from `(seed: Uint8Array)` to `({ mnemonic?: string; privateKey?: Uint8Array })`. `InitSvcWorkerWalletParams` no longer accepts a `privateKey?: string` — callers must pass `identity: Identity` instead. These are internal APIs (wallet boot path) and not consumed outside the wallet repo.

**Files Updated**:
- `docs/INDEX.md` (wallet Key Capabilities: BIP39 line rewritten to describe mnemonic vs SingleKey paths, BIP86 derivation, encrypted-at-rest storage, Restore auto-detect, Backup recovery-phrase rendering, Password re-encryption, `walletMode: 'static'` invariant, LNURL secret derivation; `prettyAssetNumber` hardening note appended to the BIP21/asset capability; `cross-env` line added; Tags extended with `bip39`, `bip86`, `mnemonic`, `taproot`, `pbkdf2`, `aes-gcm`)
- `docs/projects/wallet/INDEX.md` (frontmatter `version` 1.2.10 → 1.2.11 + `last_sync_commit`; Self-Custodial Wallet concept updated to describe MnemonicIdentity + PBKDF2/AES-GCM + legacy SingleKey path)
- `docs/projects/wallet/system/project_overview.md` (Self-Custodial Architecture section rewritten with Mnemonic identity, Legacy identity, Service-worker identity bridge sub-sections + updated encrypted-storage description)
- `docs/projects/wallet/system/architecture.md` (WalletProvider description extended with PR #624 changes — `Identity` typing, `initWallet` credentials shape, `walletMode: 'static'`, DOMException translation, `restartWallet` reuses identity; Key Management section rewritten with two-identity-paths overview, `src/lib/mnemonic.ts` storage details + `deriveNostrKeyFromMnemonic` excerpt)
- `docs/projects/wallet/change-log/last-sync.txt` → `9848c02c3ea72d8a004c703ea9d7577bbd946bf4`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

## 2026-05-20 - Documentation Sync
**Commit**: `447f01866732aca287f791caad60791cc8244739`
**Previous Sync**: `98f2ef09c9b232d85a9d894c22c80a94484adae4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 non-merge commits
- `447f0186` Minor fixes (#621)
- `fb57f127` accept lightning: prefix in paste address button (#625)
- `5e86af42` Upgrade ts-sdk 0.4.27 - boltz-swap 0.3.32 (#623)

**Features Added / Modified**:
- **`lightning:` URI prefix recognised by paste/scan (PR #625, commit fb57f127)** — `src/components/InputAddress.tsx` factors out a single `lowerData = data.toLowerCase()` and adds a new branch `lowerData.startsWith('lightning:') && isLightningInvoice(lowerData.slice(10))` to `isAddress`. Strings prefixed with `lightning:` (e.g. wallet-app copies of BOLT11 invoices) now activate the paste button alongside raw addresses, invoices, BIP21 URIs, email, LNURLs and Ark notes. Strip-and-validate is done in-component only — `isLightningInvoice` itself is unchanged.
- **Minor UX fixes (PR #621, commit 447f0186)**:
  - `src/screens/Init/Restore.tsx` — `<Input name='private-key' label='Private key' onChange={setSomeKey} />` no longer passes the `value` prop, making it an uncontrolled input. Fixes a React error during the restore-with-private-key flow.
  - `src/screens/Apps/Boltz/Settings.tsx` — Recover section heading switched from `<TextLabel>` to `<Text thin>` to match the rest of the Settings typography; helper text color migrated from legacy `dark50` to the design-token-aligned `neutral-500`. `TextLabel` import removed.

**Dependency Updates** (PR #623, commit 5e86af42):
- `@arkade-os/sdk`: 0.4.26 → 0.4.27
- `@arkade-os/boltz-swap`: 0.3.31 → 0.3.32
- `pnpm-lock.yaml` regenerated.

**Files Touched in Repo** (5 files):
- `package.json`, `pnpm-lock.yaml`
- `src/components/InputAddress.tsx`
- `src/screens/Apps/Boltz/Settings.tsx`
- `src/screens/Init/Restore.tsx`

**Configuration Changes**: None
**Breaking Changes**: None

**Files Updated**:
- `docs/INDEX.md` (wallet Key Capabilities: `lightning:` prefix added to InputAddress recognition note; sdk 0.4.26 → 0.4.27, boltz-swap 0.3.31 → 0.3.32 in Key Capabilities + Dependencies)
- `docs/projects/wallet/INDEX.md` (frontmatter version 1.2.9 → 1.2.10 + `last_sync_commit`; Arkade Integration sdk/boltz-swap versions; shadcn core-component migration entry boltz-swap reference)
- `docs/projects/wallet/system/project_overview.md` (Address Input Recognition: `lightning:` prefix added; Technology Stack sdk/boltz-swap versions; Dependencies summary versions)
- `docs/projects/wallet/system/tech-stack.md` (`@arkade-os/sdk` heading 0.4.26 → 0.4.27; `@arkade-os/boltz-swap` heading 0.3.30 → 0.3.32)
- `docs/projects/wallet/change-log/last-sync.txt` → `447f01866732aca287f791caad60791cc8244739`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

---

## 2026-05-19 - Documentation Sync
**Commit**: `98f2ef09c9b232d85a9d894c22c80a94484adae4`
**Previous Sync**: `1cfdb1661f57e1852c828038303d0ee5234457d3`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 non-merge commits
- `b9068d57` make lnurl trigger paste button in input address (#620)
- `edfaf66a` Optional HTTP Basic Authorization configuration (#619)
- `98f2ef09` feat(ui): migrate core components to shadcn primitives (3/3) (#593)

**Features Added / Modified**:
- **Core components migrated to shadcn (PR #593, commit 98f2ef09)** — `Modal`, `Checkbox`, `Select`, `Toggle` now sit on shadcn primitives.
  - `src/components/Modal.tsx` (+34/-64): Framer Motion `AnimatePresence` with `EASE_OUT_QUINT_TUPLE` enter/exit (fade + scale); new controlled props `open`/`onOpenChange`/`onExitComplete`.
  - `src/components/Checkbox.tsx` (+34/-25): wraps shadcn `Checkbox`; label-bound activation; same-state event guard; haptic feedback preserved. New `src/test/components/Checkbox.test.tsx`.
  - `src/components/Select.tsx` (+25/-27): migrated to shadcn `RadioGroup`; arrow-key navigation preserved; legacy `FlexRow` wrapper dropped.
  - `src/components/Toggle.tsx`: shadcn `Switch` with new `lg` size variant.
  - `src/components/ui/switch.tsx` (+27/-11): adds `lg` size with iOS-like three-layer shadow and 44 px minimum tap target.
  - Usage sites updated: `Burn.tsx` (+33/-15), `Reissue.tsx` (+27/-19), `Mint.tsx` (+8/-2), `Backup.tsx`, `Announcement.tsx` (Try restores direct close so parent state clears even if navigation unmounts the modal).
  - `MAX_DECIMALS` raised to 8 and used everywhere (Burn/Mint/Reissue, `src/lib/assets.ts`, `Receive/QrCode.tsx`).
  - `vitest.config.ts` (new) split from `vite.config.ts`; `tsconfig.json` cleaned; `bun.lock` restored at repo root for Cloudflare Pages deploys; `cmdk-base`/`vaul-base` replace `cmdk`/`vaul`; `@base-ui/react` added.
- **Optional HTTP Basic Authorization (PR #619, commit edfaf66a)** — new middleware layer activated by `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` env vars (both must be set).
  - `functions/_middleware.ts` (new, 43 lines): Cloudflare Pages edge middleware with inlined `EventContext` interface (avoids a new Cloudflare dependency); `crypto.subtle.timingSafeEqual` comparison on equally-sized encoded buffers; `WWW-Authenticate: Basic realm="Restricted"` 401 on mismatch.
  - `plugins/vite-plugin-basic-auth.ts` (new, 51 lines): dev/preview equivalent using Node `crypto.timingSafeEqual` via `configureServer`/`configurePreviewServer`.
  - `vite.config.ts`: `basicAuth()` registered first in the `plugins` array so it short-circuits unauthenticated requests.
- **LNURL paste detection (PR #620, commit b9068d57)** — `src/components/InputAddress.tsx` now imports `isValidLnUrl` from `src/lib/lnurl` and adds it to the `isValidData` predicate so LNURLs trigger the paste button alongside addresses, invoices, BIP21 URIs, email and Ark notes. `src/lib/address.ts` `isEmailAddress` regex made case-insensitive (`/i`). New LNURL unit tests in `src/test/lib/address.test.ts` (+30 lines); `src/test/e2e/bip21.test.ts` imports adjusted.

**Configuration Changes**:
- New env vars: `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD` (both optional; both required to enable HTTP basic auth on dev/preview/Cloudflare Pages).

**Dependency Updates**:
- `package.json`/`pnpm-lock.yaml`/`bun.lock`: minor stack churn from the shadcn migration (`cmdk-base`/`vaul-base` replace `cmdk`/`vaul`; `@base-ui/react` added). No protocol-SDK version changes.

**Files Touched in Repo** (31 files, +4077 / −3132):
- `bun.lock` (restored, +2047), `package.json`, `pnpm-lock.yaml`
- `functions/_middleware.ts` (new), `plugins/vite-plugin-basic-auth.ts` (new)
- `src/components/{Announcement,Button,Checkbox,Input,InputAddress,Modal,Select,SheetModal,Toggle}.tsx`
- `src/components/ui/{command,drawer,switch}.tsx`
- `src/index.css`, `src/lib/{address,assets}.ts`
- `src/screens/Apps/Assets/{Burn,Mint,Reissue}.tsx`
- `src/screens/Settings/Backup.tsx`, `src/screens/Wallet/Receive/QrCode.tsx`
- `src/test/components/Checkbox.test.tsx` (new), `src/test/e2e/bip21.test.ts`, `src/test/lib/address.test.ts`
- `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` (new)

**Files Updated**:
- `docs/INDEX.md` (wallet Key Capabilities: shadcn core-component migration, HTTP Basic Auth, LNURL paste recognition)
- `docs/projects/wallet/INDEX.md` (frontmatter version 1.2.8 → 1.2.9 + `last_sync_commit`; Technology Stack: new shadcn-core-migration entry; Configuration: `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` env vars)
- `docs/projects/wallet/system/project_overview.md` (Design System & Styling: added "Core components migrated to shadcn"; new "Hosting & Access Control" subsection; new "Address Input Recognition" subsection)
- `docs/projects/wallet/change-log/last-sync.txt` → `98f2ef09c9b232d85a9d894c22c80a94484adae4`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

---

## 2026-05-16 - Documentation Sync
**Commit**: `1cfdb1661f57e1852c828038303d0ee5234457d3`
**Previous Sync**: `f2cfa798d49522bf9e843357bade7d1ec711f011`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 non-merge commits
- `0d98677c` Upgrade boltz-swap 0.3.31 (#615)
- `e84af680` Fix qrcode copy button (#617) — copy button copies the unified BIP21 URI immediately
- `9a3a0b08` Add contracts view (#618) — `DevModeProvider`, dev-mode gated `Contracts` screen under Settings → Advanced
- `787bf2e2` fix: extract LNURL session into app-level provider with reusable sessions (#559) — new `LnurlProvider`, HMAC-SHA256 credential derivation, `useLnurlSession` hook removed
- `1cfdb166` Fix assets values (#611) — BIP21 asset-amount validation, bigint hardening, asset-decimals fixes

**Features Added / Modified**:
- **LNURL provider lifecycle (PR #559)** — `src/providers/lnurl.tsx` (new, ~242 lines) owns the SSE session at the app level so the LNURL remains active across navigation. Credentials are derived deterministically via `HMAC-SHA256(privateKey, "lnurl-session")`; only `token` is sent to lnurl-server, which computes `sessionId = SHA-256(token).slice(0, 32)`. Provider self-manages start/stop based on identity + Boltz swaps readiness and handles invoice flows internally (create reverse swap → return invoice → claim in background → notify). Receive screen (`QrCode.tsx`) now reads `lnurl/active/error` from context. `src/hooks/useLnurlSession.ts` deleted (190 lines removed).
- **Dev mode + Contracts view (PR #618)** — new `src/providers/devMode.tsx` exposes a global dev-mode flag persisted in `localStorage`; triple-tapping `LoadingLogo` toggles it. New `src/screens/Settings/Contracts.tsx` renders `ContractManager` contracts (active-first) with type/state/shortened address+script and copy. `Advanced.tsx` shows the Contracts row only when dev mode is on. Tap logic lifted out of `LoadingLogo` into `DevModeProvider` so all loading logos share state. Test coverage added for `DevModeProvider`, `Advanced`, and `Contracts`.
- **QR code copy button (PR #617)** — `src/screens/Wallet/Receive/QrCode.tsx` copy button now immediately copies the unified BIP21 URI (no submenu); new component test.
- **Asset values + BIP21 hardening (PR #611)** — `src/lib/assets.ts`, `src/lib/bip21.ts`, `src/lib/format.ts`, `src/providers/limits.tsx`, `src/providers/fiat.tsx`, Asset Burn/Mint/Reissue, Receive QrCode/Success, Send Details/Form, and shared inputs (`InputAmount`, `Keyboard`, `Input`, `Balance`, `TransactionsList`) updated. Fixes: stale closure in fiat provider, BIP21 asset-amount validation, missing asset decimals on `encodeBip21Asset`, `unitsToCents` crash on empty string, missing radix on `parseInt`, guard against fractional millisatoshis, default decimals = 0, `-0` rendering in `prettyAssetNumber`. Type cleanup in `src/lib/types.ts`. Extensive new/expanded e2e tests (`asset.test.ts`, new `bip21.test.ts`, `keyboard.test.ts`, `receive.test.ts`, `send.test.ts`, `utils.ts`) and unit tests (`asset.test.ts`).
- **Dependency bump (PR #615)** — `@arkade-os/boltz-swap` 0.3.30 → 0.3.31; large `pnpm-lock.yaml` churn (PR #611).

**Files Touched in Repo** (49 files, +3369 / −2077):
- `package.json`, `pnpm-lock.yaml`, `regtest`
- `src/components/{Balance,Content,Input,InputAmount,Keyboard,LoadingLogo,TransactionsList}.tsx`
- `src/hooks/useLnurlSession.ts` (deleted)
- `src/index.tsx`
- `src/lib/{asp,assets,bip21,format,lnurl,types}.ts`
- `src/providers/{devMode,fees,fiat,flow,limits,lnurl,options,swaps}.tsx`
- `src/screens/Apps/Assets/{Burn,Mint,Reissue}.tsx`
- `src/screens/Apps/Boltz/Swap.tsx`
- `src/screens/Settings/{Advanced,Contracts,Delegates,Index}.tsx`
- `src/screens/Wallet/Receive/{QrCode,Success}.tsx`
- `src/screens/Wallet/Send/{Details,Form}.tsx`
- `src/test/e2e/{asset,bip21 (new),keyboard,receive,send,utils}.test.ts`
- `src/test/lib/asset.test.ts`
- `src/test/providers/devMode.test.tsx`, `src/test/screens/settings/{advanced,contracts}.test.tsx`
- `src/test/screens/wallet/receive-qrcode.test.tsx`
- `src/test/screens/mocks.ts`

**Dependency Updates**:
- `@arkade-os/boltz-swap`: 0.3.30 → 0.3.31

**Files Updated**:
- `docs/INDEX.md` (wallet — LNURL session capability rewritten; new dev-mode + Contracts capability; BIP21 unified copy + asset-amount validation note; `@arkade-os/boltz-swap` 0.3.30 → 0.3.31 in Key Capabilities + Dependencies)
- `docs/projects/wallet/INDEX.md` (frontmatter version 1.2.7 → 1.2.8 + `last_sync_commit`; LNURL section rewritten with `LnurlProvider` + HMAC-SHA256 derivation details; new "Developer / Diagnostics" Features subsection; `@arkade-os/boltz-swap` 0.3.30 → 0.3.31)
- `docs/projects/wallet/system/project_overview.md` (LNURL receive entry rewritten with `LnurlProvider` lifecycle; new "Developer / Diagnostics" subsection; BIP21 asset-amount validation entry under Asset Amount Precision; boltz-swap version bumped in Tech Stack + Dependencies footer)
- `docs/projects/wallet/system/architecture.md` (added `LnurlProvider` and `DevModeProvider` entries under State Management Layer; added `Advanced.tsx` + `Contracts.tsx` under Settings Screens)
- `docs/projects/wallet/change-log/last-sync.txt` → `1cfdb1661f57e1852c828038303d0ee5234457d3`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

---

## 2026-05-14 - Documentation Sync
**Commit**: `f2cfa798d49522bf9e843357bade7d1ec711f011`
**Previous Sync**: `e96024dfdf5e90323a6e0673c9a92106f9f9574d`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits
- `f2cfa798` fix support (#616) — minor fixes in `src/screens/Settings/Support.tsx`
- `29b140b3` fix(transaction): non-blocking boarding settlement UX (#556)

**Features Modified**:
- **Non-blocking boarding settlement UX (PR #556, commit 29b140b3)** — removes the full-screen `WaitingForRound` overlay (1+ minute interaction block) and replaces it with inline non-blocking UI across three call sites:
  - `src/screens/Wallet/Transaction.tsx`: inline purple `Info` banner with `LoadingIcon` ("Processing your boarding transaction…") while settlement runs; guards added to prevent simultaneous settled + pending banners; stale `setTxInfo` callback removed.
  - `src/screens/Settings/Vtxos.tsx` (Coin Control): inline "Renewing" `Info` banner during rollover instead of full-screen overlay.
  - `src/screens/Wallet/Send/Details.tsx`: `LoadingLogo` used for mainnet payments, matching Lightning/Ark payment patterns.
  - `src/icons/Loading.tsx`: `LoadingIcon` `small` size reduced 32px → 20px to align with other inline icons.
  - Settling text contrast improved.
- **Support fixes (PR #616, commit f2cfa798)** — `src/screens/Settings/Support.tsx` minor UX fixes (+16/-5).

**Files Removed**:
- `src/components/WaitingForRound.tsx` — component deleted after all three usages were migrated to inline banners.

**Configuration / Tooling Updates**:
- `.env.regtest`: image versions bumped — `arkd` v0.9.4 → v0.9.5, `arkd-wallet` v0.9.4 → v0.9.5, `fulmine` v0.3.21 → v0.3.23; added `BOLTZ_IMAGE=boltz/boltz:latest`.
- `regtest` submodule: bumped `3ac33b66` → `6333e4b8` (regtest link/image refresh).

**Files Touched in Repo**:
- `.env.regtest`
- `regtest` (submodule pointer)
- `src/components/WaitingForRound.tsx` (deleted)
- `src/icons/Loading.tsx`
- `src/screens/Settings/Support.tsx`
- `src/screens/Settings/Vtxos.tsx`
- `src/screens/Wallet/Send/Details.tsx`
- `src/screens/Wallet/Transaction.tsx`

**Dependency Updates**: None (package.json/pnpm-lock.yaml unchanged).

**Files Updated**:
- docs/INDEX.md (wallet Key Capabilities: non-blocking boarding settlement entry)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.7 + last_sync_commit; Lightning Network Swaps section: non-blocking boarding settlement entry)
- docs/projects/wallet/system/project_overview.md (UI/UX Refresh: non-blocking boarding settlement entry detailing Transaction/Vtxos/Send/Details changes and LoadingIcon resize)
- docs/projects/wallet/change-log/last-sync.txt → `f2cfa798d49522bf9e843357bade7d1ec711f011`
- docs/projects/wallet/change-log/SYNC_HISTORY.md (this entry)

---

## 2026-05-13 - Documentation Sync
**Commit**: `e96024dfdf5e90323a6e0673c9a92106f9f9574d`
**Previous Sync**: `982c8bc3e82d9cb7f6af3efc9921964363963040`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits

**Features Added**:
- **shadcn/ui primitives (PR #590, commit 30bdae17)** — 55 shadcn/ui components under `src/components/ui/` using `base-nova` style + `lucide` icons; supporting setup:
  - `components.json` shadcn CLI config (CLI moved to devDependencies)
  - `@/*` path alias in `tsconfig.json` and `vite.config.ts` `resolve.alias`
  - shadcn theme tokens appended to `src/app.css`
  - `src/hooks/use-mobile.ts` responsive helper
  - `src/components/ui/sonner.tsx` patched to read theme from `ConfigContext` (replaces `next-themes`)
  - Dark mode selector remains `html.palette-dark`
  - **No existing code modified** — primitives available for future component migrations
- New deps: implicitly via shadcn — `lucide-react`, `recharts ^3.8.0`, plus the existing tailwind/clsx/cva/tailwind-merge stack already added in PRs #582/#589

**Internal Refactors (non-breaking)**:
- **Service worker init AbortController refactor (PR #613, commit e96024df)** — `src/providers/wallet.tsx`:
  - Replaces the previous generation-counter with `initAbortRef: AbortController` per init session
  - `startInitSession()` aborts the prior session with reason `'init'` ("abandon, don't clear"); `abortInitSession()` aborts the current with `'lock-reset'`; `clearIfLockReset(svcWallet, signal)` decides whether to tear down the SW
  - `runInitAttempt` extracted so retries inherit the same signal
  - `initSvcWorkerWallet` signature now accepts `InitSvcWorkerWalletParams` with `identity?: SingleKey` (preferred) and legacy `privateKey?: string`; returns `Promise<boolean>`; adds `skipMigration?: boolean` (used by `restartWallet`)
  - `reinitSvcWalletRef` assignment moved out of render body into a `useEffect`

**Files Touched in Repo (PR #590 + PR #613)**:
- `components.json` (new)
- `package.json`, `pnpm-lock.yaml`
- `src/app.css` (+ shadcn theme tokens)
- `src/components/ui/*.tsx` (55 new files: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input-group, input-otp, input, item, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip)
- `src/hooks/use-mobile.ts` (new)
- `src/lib/utils.ts` (minor update)
- `src/providers/wallet.tsx` (+162 / -53 — AbortController refactor)
- `tsconfig.json`, `vite.config.ts` (`@/*` path alias)

**Features Added/Modified/Removed**: 55 shadcn/ui primitives added; service-worker init refactored. No public/UI behavior changes.
**Configuration Changes**: `@/*` path alias added in `tsconfig.json` and `vite.config.ts`.
**Dependency Updates**: shadcn/ui CLI moved to devDependencies; `lucide-react` and `recharts ^3.8.0` added; `next-themes` not added (avoided in favor of `ConfigContext`).

**Files Updated**:
- docs/INDEX.md (wallet Key Capabilities + Tags)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.6 + last_sync_commit; Technology Stack: shadcn entry)
- docs/projects/wallet/system/project_overview.md (Design System & Styling: PR #590)
- docs/projects/wallet/system/components.md (directory tree adds `src/components/ui/`, `use-mobile.ts`; shadcn section appended)
- docs/projects/wallet/system/architecture.md (WalletProvider AbortController init session model)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-12 - Documentation Sync
**Commit**: `982c8bc3e82d9cb7f6af3efc9921964363963040`
**Previous Sync**: `582320bdd54fcac021125146556b090484237bb6`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit

**Features Renamed**:
- Lendaswap → Satora app (PR #612, commit 982c8bc3)
  - `src/screens/Apps/Lendaswap/` → `src/screens/Apps/Satora/`
  - `LendaswapIcon.tsx` → `SatoraIcon.tsx` (replaced with new icon)
  - Env var: `VITE_LENDASWAP_IFRAME_URL` → `VITE_SATORA_IFRAME_URL`
  - Updated references in providers (announcements, navigation, wallet), Apps Index, Announcement component, Support screen, Dockerfile, docker-entrypoint.sh, README.md

**Files Touched in Repo**:
- Dockerfile, docker-entrypoint.sh, README.md
- src/components/Announcement.tsx
- src/providers/{announcements,navigation,wallet}.tsx
- src/screens/Apps/Index.tsx
- src/screens/Apps/Lendaswap/LendaswapIcon.tsx (removed)
- src/screens/Apps/Satora/{Index.tsx,SatoraIcon.tsx} (added/moved)
- src/screens/Settings/Support.tsx

**Features Added/Modified/Removed**: Rename only — no new functionality, no removals
**Configuration Changes**: `VITE_LENDASWAP_IFRAME_URL` env var renamed to `VITE_SATORA_IFRAME_URL`
**Dependency Updates**: None

**Files Updated**:
- docs/INDEX.md — checked; no wallet section changes needed (no Lendaswap references in master registry)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.5 + last_sync_commit; Apps screens list; DeFi integration entry)
- docs/projects/wallet/system/project_overview.md (DeFi User use case)
- docs/projects/wallet/system/components.md (directory tree + Apps Screens section)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-09 - Documentation Sync
**Commit**: `582320bdd54fcac021125146556b090484237bb6`
**Previous Sync**: `7066839d412a1a06df6880ab225ea72d03a3f1db`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit

**Dependency Updates**:
- @arkade-os/sdk: 0.4.25 → 0.4.26 (PR #610)
- @arkade-os/boltz-swap: 0.3.29 → 0.3.30 (PR #610)

**Features Added/Modified/Removed**: None
**Configuration Changes**: None — `package.json` dependency-version bumps only; `pnpm-lock.yaml` regenerated.

**Files Updated**:
- docs/INDEX.md (wallet dependency versions: sdk 0.4.26, boltz-swap 0.3.30)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.4 + last_sync_commit; Arkade Integration sdk/boltz-swap versions)
- docs/projects/wallet/system/project_overview.md (sdk/boltz-swap versions in Technology Stack and Dependencies summary)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap section headings updated to new versions)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-08 - Documentation Sync
**Commit**: `7066839d412a1a06df6880ab225ea72d03a3f1db`
**Previous Sync**: `0b51d64fd09c052e6983c5d0f675adae24f80e81`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 non-merge commits

**Features Added**:
- Design token system + Tailwind CSS v4 integration (PR #582)
  - New `src/tokens.css` — single source of truth for color ramps (50–950 across `purple`/`green`/`red`/`orange`/`yellow`/`neutral`), typography, and shadow elevation. Neutral ramp uses `color-mix(in oklab)` for automatic light/dark adaptation under `html.palette-dark`.
  - New `src/app.css` — Tailwind v4 `@theme` block mapping tokens to utilities; `@tailwindcss/vite` plugin wired in `vite.config.ts`.
  - New `src/lib/utils.ts` `cn()` helper combining `clsx` + `tailwind-merge`.
  - All `--darkXX` opacity tokens migrated to solid `--neutral-XXX` colors across 50+ component files; semantic aliases now reference ramps; legacy aliases (`--background-color`, `--heading-font`) preserved.

**Features Modified**:
- Toast migration to sonner (PR #589)
  - `src/components/Toast.tsx` shrank from ~97 to 35 lines; wraps `<Toaster>` with project defaults (`top-center`, `richColors`, content-hugging styling).
  - `useToast()` hook still returns `{ toast }` for backward compatibility; `toast` re-exported directly.
  - New scoped `src/components/Toast.css` centers Sonner toasts so short copy confirmations hug their content (instead of the default fixed-width left-aligned layout).
  - `src/providers/config.tsx` now keeps the configured Arkade server even when stale localhost localStorage is present, as long as `VITE_DEV_NSEC` and `VITE_ARK_SERVER` env are set (for funded local dev wallets).
  - `src/screens/Settings/Backup.tsx` no longer reads `VITE_DEV_NSEC` directly — private-key display continues to require the normal password verification path (security regression fix during PR #589 review).

**Dependency Updates**:
- @arkade-os/sdk: 0.4.24 → 0.4.25 (PR #4720cfdc)
- @arkade-os/boltz-swap: 0.3.28 → 0.3.29 (PR #4720cfdc)
- Added `tailwindcss@^4.2.2`, `@tailwindcss/vite@^4.2.2`
- Added `clsx@^2.1.1`, `tailwind-merge@^3.5.0`, `class-variance-authority@^0.7.1`
- Added `sonner@^2.0.7`

**Configuration Changes**:
- `vite.config.ts`: registered `@tailwindcss/vite` plugin
- `src/index.tsx`: imports new design system entry points

**Files Updated**:
- docs/INDEX.md (wallet capabilities, tags, dependencies — sdk/boltz-swap versions, tailwind/sonner/design-tokens)
- docs/projects/wallet/INDEX.md (version 1.2.3, last_sync_commit, Core Framework section: Tailwind v4, design tokens, sonner; sdk/boltz-swap versions)
- docs/projects/wallet/system/project_overview.md (UI/UX section adds Design System & Styling subsection; Technology Stack list updated; sdk/boltz-swap versions)
- docs/projects/wallet/system/tech-stack.md (new sections for Tailwind v4, clsx + tailwind-merge, class-variance-authority, sonner; sdk/boltz-swap versions)
- docs/projects/wallet/system/components.md (Toast component now sonner-backed; `tokens.css`, `app.css`, `lib/utils.ts` added to directory listing)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-07 - Documentation Sync
**Commit**: `0b51d64fd09c052e6983c5d0f675adae24f80e81`
**Previous Sync**: `7192bdf948d7922dc244abaf928d5496743fd367`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 non-merge commits

**Features Added**:
- Boltz `referralId: 'arkade-money'` propagated to `BoltzSwapProvider` and service-worker arkadeSwaps for swap attribution (PR #606)
- Mainnet Boltz endpoint defaults to `https://api.boltz.exchange`; env-unset fallback now defers to SDK defaults instead of a hard-coded `api.ark.boltz.exchange` URL (PRs #599, #606); README docker examples updated

**Features Modified**:
- Asset amount math migrated to `bigint`: `unitsToCents`/`centsToUnits` operate on `bigint`, `AssetOption.balance` and tx-asset `amount` are `bigint`, asset metadata `supply` is `bigint` (serialised via `JSON.stringify` replacer in `lib/storage.ts`) (PR #599)
- New `prettyAssetAmount(amount, decimals, useGrouping?)` formatter in `src/lib/assets.ts` splits whole/fractional via BigInt arithmetic to fix truncation of fractional units (e.g. `1.5 USDT`); companion helpers `prettyAssetNumber`, `prettyAssetAmountHide`, `isValidDecimals` (allows `0..MAX_DECIMALS=8`) (PR #599)
- Non-negative integer clamp on Burn / Mint / Reissue / Send / Receive QrCode / `InputAmount` so `BigInt(1.5)` no longer throws RangeError (PR #599)
- Mainnet `explorers.bitcoin.api` removed — `getRestApiExplorerURL` returns `string | undefined`; callers fall back to SDK defaults (PR #599)
- `formatAssetAmount` now takes `bigint` and routes through `prettyAssetNumber` (PR #599)

**Bug Fixes**:
- PWA safe-area handling restored — page top safe-area offset (`top: env(safe-area-inset-top)`) re-added so installed iOS PWAs no longer render beneath the status bar; pill-navbar clearance and scroll-fade applied to plain `.content` instead of legacy `::part(scroll)`; `--pill-navbar-spacer` CSS var removed (PR #600)
- Scrollbar hidden cross-browser on `.content` directly, off the legacy Ionic `::part(scroll)` shadow part (PR #608)
- Scanner button positioning fixed via new `.label.has-buttons` layout in `src/index.css` and applied to `InputWithScanner` (PR #603)

**Dependency Updates**:
- @arkade-os/sdk: 0.4.22 → 0.4.24 (PRs #599, #605)
- @arkade-os/boltz-swap: 0.3.24 → 0.3.28 (PRs #599, #605, #606) — adds `referralId` constructor option

**Configuration Changes**:
- `package.json` `start:mainnet` script: `VITE_BOLTZ_URL=https://api.ark.boltz.exchange` → `https://api.boltz.exchange`
- `swaps.tsx` `BASE_URLS.bitcoin`: hard-coded `api.ark.boltz.exchange` fallback → `null` (defer to SDK defaults)

**Files Updated**:
- docs/INDEX.md (wallet capabilities, dependency versions)
- docs/projects/wallet/INDEX.md (version 1.2.2, last_sync_commit, sdk/boltz-swap versions, referralId note)
- docs/projects/wallet/system/project_overview.md (sdk/boltz-swap versions, referralId, mainnet endpoint, asset bigint refactor, PWA safe-area, scanner)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap versions, referralId option)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-06 - Documentation Sync
**Commit**: `7192bdf948d7922dc244abaf928d5496743fd367`
**Previous Sync**: `047419382c723629a1eb89c674d5b7349fd55d81`
**Synced By**: /update-project skill
**Status**: Completed (tracking-only — no doc content changes)

**Commits Analyzed**: 2 non-merge commits

**Bug Fixes**:
- Fix layout issues (PR #601) — `src/index.css` only (3 lines)
- Fix fiat amount precision (PR #602) — `prettyFiatAmount` in `src/lib/format.ts` now pads to each currency's `fiatDecimalsFor()` minor units, so USD/EUR show two decimals while JPY remains zero-decimal; `src/test/lib/format.test.ts` extended with whole-and-fractional regression coverage for every supported fiat

**Features Added/Modified/Removed**: None
**Dependency Updates**: None
**Configuration Changes**: None

**Rationale for no doc updates**: Both commits are user-visible bug fixes that do not change any documented capability, tag, dependency, env var, API surface, build/test workflow, or architecture. The master `docs/INDEX.md` "Fiat currency symbol-prefix display" capability line and the project-level `system/` docs all remain accurate.

**Files Updated**:
- docs/projects/wallet/INDEX.md (frontmatter `last_sync_commit` only)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-01 - Documentation Sync
**Commit**: `047419382c723629a1eb89c674d5b7349fd55d81`
**Previous Sync**: `c0c70aafdcd1cfa04d5d515773862fe9bef26378`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 13 non-merge commits

**Features Added**:
- Boltz bulk recovery — new "Recover funds" section in `Apps → Boltz → Settings` (PR #581) using `arkadeSwaps.scanRecoverableSubmarineSwaps()` and `recoverSubmarineFunds()`; categorises swaps as `recoverable` / `pre_cltv` / `invalid_swap`, shows per-row buttons with deferred-locktime guidance, and refreshes the scan after a successful sweep
- Lightning invoice limit validation in Send form (PR #567) — invoice amount checked against `minSwapAllowed()` / `maxSwapAllowed()` from `LimitsContext`; rejects below-min / above-max with explicit sats error; guards against unloaded zero limits
- Virtualized swaps list — `SwapsList` uses `@tanstack/react-virtual` `useVirtualizer` for performant scrolling (PR #585)

**Features Modified**:
- Crash fix on swap detail for restored chain swaps (PR #575) — added regression test `boltz-swap.test.tsx`
- UI polish: header height, transaction list resize, fancy button (PR #586); transactions list "history" label removed; lighter dividers (dark10), no border on first row, leading asset icon, regular weight asset text, "haptic feedback" typo fix
- E2E swap test fix (PR #576) and added invoice-validation test (PR #567)

**Features Removed**:
- `bun.lock` removed (PR #583) — pnpm-only

**Dependency Updates**:
- @arkade-os/sdk: 0.4.21 → 0.4.22
- @arkade-os/boltz-swap: 0.3.22 → 0.3.24 (adds `scanRecoverableSubmarineSwaps`, `recoverSubmarineFunds`, `BoltzSubmarineSwap`, `SubmarineRecoveryInfo` types)

**Regtest / Infra**:
- `.env.regtest` bumped to `arkd:v0.9.4` and `fulmine:v0.3.21` (PR #572)
- `regtest` submodule pointer updated (PRs #583, #587)

**Files Updated**:
- docs/INDEX.md (wallet capabilities, dependency versions)
- docs/projects/wallet/INDEX.md (version, last_sync_commit, sdk/boltz-swap versions, capabilities)
- docs/projects/wallet/system/project_overview.md (bulk recovery, invoice validation, sdk/boltz-swap versions)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap versions, @tanstack/react-virtual)
- docs/projects/wallet/system/components.md (bulk recovery section in Boltz Settings, SwapsList virtualization)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-04-29 - Documentation Sync
**Commit**: `c0c70aafdcd1cfa04d5d515773862fe9bef26378`
**Previous Sync**: `7e24d4d244264675545eba31d70bcf345b224351`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 46 non-merge commits

**Features Added**:
- LNURL receive support — amountless Lightning receives via `useLnurlSession` hook + lnurl-server SSE bridge (PR #482)
- Receive v2 — redesigned receive flow with styled QR, tap-to-copy QR, share button, safe-area padding (PRs #512, #533, #528, #552)
- Send form redesign — pill Paste/Scan QR buttons, Max-tap confirmation modal, animated Scanner/Keyboard overlays, prefers-reduced-motion support (PR #485)
- Pill navbar overlay restricted to root pages (Wallet/Apps/Settings) with Framer Motion spring animation (PR #474)
- Fiat amount currency-symbol prefix — `$100.00`, `€50.00`, `¥1,000`; CHF/CNY keep trailing-code form (PR #535)
- Bootstrap status easter egg (PR #500)
- Multi-arch Docker build for amd64 + arm64 in `docker-publish.yml` (PR #516)
- arkade-regtest submodule replaces custom test infrastructure (PR #492); new `regtest:start/stop/clean` scripts and `nak.Dockerfile`/`docker-compose.nak.yml` for the Nostr relay
- Git commit added to Chatwoot custom attributes (PR #563)
- New e2e tests: `lnurl.test.ts`, expanded asset/delegate/receive/send/swap tests (PRs #564, #548)
- New Toast component (`components/Toast.tsx`) replacing previous `lib/toast.ts`
- ErrorBoundary component refactor

**Features Modified**:
- Receive QR code reliability fix — hardcoded dark-on-white colors for scanner reliability (PR #527)
- Receive amount fiat value fix (PR #508)
- VTXO double-funding check now queries indexer directly (PR #524)
- VTXO lookback window aligned with SW timeout for swaps (PR #523)
- 60s timeout for SETTLE/SEND messages (PR #522)
- Asset burn max fix; error update on asset change; reload page uses app components (PRs #507, #506, #503)
- Tx history rows top-aligned when assets are present; max 2 coins on right side (PRs #537, #550)
- Logs CSV export now reverse-ordered (PR #546)
- Prevent swap-after-receival flow (PR #547)
- Delegate card now shows address, pubkey, and fee (PR #515)
- Sentry errors affecting clients fixed (PR #496)

**Features Removed**:
- `@ionic/react` and `@ionic/normalize` dependencies removed; replaced by in-tree custom components (PR #534)
- `ion-button`, `ion-refresher` removed
- `src/lib/toast.ts` removed (logic moved into `components/Toast.tsx`)
- `src/components/Clipboard.tsx` reduced

**Dependency Updates**:
- @arkade-os/sdk: 0.4.14 → 0.4.21
- @arkade-os/boltz-swap: 0.3.13 → 0.3.22
- Added: react-spring-bottom-sheet ^3.4.1
- Removed: @ionic/react

**Files Updated**:
- docs/INDEX.md (description, capabilities, tags, triggers)
- docs/projects/wallet/INDEX.md (version 1.2.0, last_sync_commit, tech stack, testing)
- docs/projects/wallet/system/project_overview.md (UI/UX refresh, LNURL, dependencies)
- docs/projects/wallet/system/tech-stack.md (SDK/boltz versions, Ionic removal, react-spring-bottom-sheet, regtest scripts)
- docs/projects/wallet/system/components.md (custom component library, hooks/, removed Ionic section)
- docs/projects/wallet/sop/development-workflow.md (arkade-regtest workflow)
- docs/projects/wallet/testing/how_to_run.md (arkade-regtest workflow)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-02-19 - Full Documentation Sync
**Commit**: `556735acb0fbdff1a4b382089850cb8a096e3005`
**Previous Sync**: `a1c45ff0ac7230ca1f39cc365edd82fc9e44c7c7`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 95 commits

**Features Added**:
- Announcements system — in-app notification banners with AnnouncementsProvider
- Lendaswap integration — new app screen for Lendaswap service
- Chatwoot integration — live customer support chat widget + Support settings page
- Nostr backups — encrypted chunked wallet backup to Nostr relays
- E2E testing with Playwright — full test suite (init, backup, restore, send, receive, swap, keyboard, nostr, pwa)
- URL hash deep-linking for wallet actions
- JS/JIT capability detection with informative error screens for restricted environments
- Keyboard navigation via Focusable component
- Fees provider for on-chain and collaborative exit fee estimation
- Currency toggle (CHF added) with fiat/sats toggle on amount inputs
- Modal component for reusable modal dialogs
- Swap restoration from Boltz endpoint
- Blurred modal backgrounds
- Improved onboard images (simplified SVGs)
- Log management with configurable size limits
- Indexer API client (src/lib/indexer.ts)
- MIT License added
- Nak Dockerfile for Nostr relay (E2E testing)
- Component tests for settings screens and wallet send
- Unit tests for utxo, jsCapabilities, fiat

**Features Modified**:
- SwapManager refactoring — major swap system rewrite using SwapManager pattern
- Fees system — collaborative exit with fees, dedicated FeesProvider
- Lightning provider — major refactoring of providers/lightning.tsx
- Keyboard component — currency toggle, decimal validation
- Backup system — refactored from nsec to chunked Nostr backup
- VTXO management — expiry threshold fixes, coin control improvements
- Scanner component — significant rewrite
- Navigation provider — browser back button handling
- Wallet provider — settlement and fee handling changes
- Send form — major rewrite with fiat/sats toggle
- Receive amount — fiat toggle support

**Features Removed**:
- src/lib/alerts.ts (removed)
- src/lib/lightning.ts (moved to providers/lightning.tsx)
- src/screens/Settings/Nostr.tsx (replaced by Backup.tsx)
- scripts/setupRegtestEnv.sh (removed)
- Some apps removed (PR #206)

**Dependency Updates**:
- @arkade-os/sdk: 0.3.1-alpha.4 → 0.3.12
- @arkade-os/boltz-swap: 0.2.1-alpha.4 → 0.2.19
- pnpm: → 10.25.0
- Playwright: added (new dependency)
- vitest: 3.2.4

**Files Updated**:
- docs/INDEX.md (wallet capabilities, tags, triggers, dependencies)
- docs/projects/wallet/INDEX.md (version, providers, features, testing)
- docs/projects/wallet/system/project_overview.md (new features, dependencies, use cases)
- docs/projects/wallet/system/architecture.md (providers list, testing architecture)
- docs/projects/wallet/system/components.md (directory structure, screens, providers, libs)
- docs/projects/wallet/testing/how_to_test.md (E2E tests, Playwright, test structure)
- docs/projects/wallet/testing/how_to_run.md (pnpm version, E2E environment)
- docs/projects/wallet/testing/usage.md (Nostr backup, settings updates)
- docs/projects/wallet/sop/development-workflow.md (E2E test workflow)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `a1c45ff0` (wallet repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 41 commits (last 60 days)

**Features Added**:
- LendaSat integration - Bitcoin lending/borrowing with on-chain and Arkade collateral
- Soft settle - optimized settlement with database caching
- VTXO Manager - advanced VTXO lifecycle management
- New QR scanner implementation
- Subdust coin display
- Server key mismatch error display
- Alerts system restoration

**Bug Fixes**:
- Fixed send details display
- Fixed flickering UI (div/p nesting)
- Fixed icon colors to reflect theme
- Fixed wallet balance in fiat
- Fixed wallet restore balance
- Fixed navigation between tabs
- Fixed Boltz URL configuration
- Fixed VTXO reload after settle in coin control
- Fixed Mutinynet API URL
- Fixed objects in logs

**Security Improvements**:
- Added `sendDefaultPii: false` to Sentry configuration
- Conditional Sentry initialization (production only)

**Dependency Updates**:
- SDK bumped to 0.3.0
- Multiple dependency updates

**Files Updated**:
- docs/projects/wallet/INDEX.md (added sync metadata, new features, new env vars)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: ``
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs wallet` to update after new commits
