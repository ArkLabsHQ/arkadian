# BlueWallet — Development Workflow

Standard operating procedure for contributing to BlueWallet.

## 1. Branching

BlueWallet uses **trunk-based development** with feature branches.

| Branch | Purpose |
|--------|---------|
| `master` | Trunk — always green, used for releases |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `refactor/*` | Refactors with no behavior change |
| `release/*` | Release prep / hotfixes |
| `add/*` | Additions (new dependency, new flow) |

Open PRs against `master`.

## 2. Commit Message Prefixes

Commits **must** start with one of:

| Prefix | Meaning |
|--------|---------|
| `REL` | Release (version bump, changelog) |
| `FIX` | Bug fix |
| `ADD` | New feature / capability |
| `REF` | Refactor (no behavior change) |
| `TST` | Tests only |
| `OPS` | Build, CI, infra, tooling |
| `DOC` | Documentation only |

Examples:
```
ADD: support BIP86 Taproot HD wallets
FIX: handle empty Boltz limits gracefully
REF: extract swap-processor into its own module
TST: cover lightning-ark-wallet bootstrap path
DOC: update README with macOS Catalyst instructions
OPS: bump RN to 0.83.1
REL: 8.0.0
```

## 3. Code Standards

### TypeScript Required

- **All new files must be `.ts` / `.tsx`** (no new `.js`)
- TypeScript strict mode enabled
- Use proper types — avoid `any` unless interfacing with untyped libraries

### Component Location

- New components → `components/` (NOT legacy `BlueComponents.js/.tsx`)
- Feature screens → `screen/<feature>/`
- Shared hooks → `hooks/`

### Lint Rules (Hard Failures)

- `react-native/no-inline-styles: error` → always use `StyleSheet.create`
- `react-native/no-unused-styles: error` → remove dead styles
- Prettier: single quotes, **140 char width**, trailing commas

### Dependencies

> Do not add new dependencies without strong justification. Bonus for removing dependencies.

- Prefer existing libs (`bitcoinjs-lib`, `@noble/*`, etc.)
- For native modules: prefer BlueWallet's own forks under `BlueWallet/*`
- Patch over fork when the upstream maintainer is responsive

### Localization

- New user-facing strings go in `loc/en.json`
- Run `node scripts/find-unused-loc.js` before committing — unused keys fail lint
- Translations come from Transifex; never edit non-`en.json` locale files manually

## 4. Pre-Commit Gate

```bash
npm run lint            # tsc + unused loc + eslint
npm run unit            # Jest unit
```

Optional but recommended for risky changes:
```bash
npm run integration     # needs env vars
npm run e2e:debug       # Detox (Android)
```

## 5. PR Conventions

- Title uses commit prefix: `ADD: feature description`
- Body explains:
  - **What** changed
  - **Why** (link to issue if applicable)
  - **Test plan** (how to verify)
  - **Screenshots** for UI changes (especially if i18n-sensitive)
- Keep PRs **focused** — split unrelated changes
- Update `loc/en.json` when adding strings
- Update `CLAUDE.md` if you change a convention

## 6. Reviewers & Merge

- At least 1 reviewer approval
- All CI checks green:
  - Lint
  - Unit
  - Integration (where applicable)
- BrowserStack / Detox builds green for release-bound changes
- Squash-merge by default (reviewer's choice)

## 7. Working on the Ark Integration

### Before You Start

- Read `system/integration-with-arkd.md`
- Skim `class/wallets/lightning-ark-wallet.ts` (~845 LOC) for layout
- Skim `blue_modules/arkade-adapters/background/` (swap reconciliation)

### Bumping `@arkade-os/sdk` or `@arkade-os/boltz-swap`

1. Update `package.json`:
   ```json
   "@arkade-os/sdk": "X.Y.Z",
   "@arkade-os/boltz-swap": "A.B.C"
   ```
2. Run `npm install` (regenerates `package-lock.json`)
3. Run `npm test` — fix any breakage
4. Run integration tests against `arkade.computer`:
   ```bash
   npm run integration -- lightning-ark-wallet
   ```
5. Manual smoke test:
   - Create new Ark wallet
   - Receive via Lightning (reverse swap)
   - Send via Lightning (submarine swap)
   - Send/receive Ark address
   - Restart app — verify swap reconciliation
6. Open PR titled `OPS: bump @arkade-os/sdk to X.Y.Z` (or `ADD:` if it adds capability)

### Adding a New Ark Flow

- Wallet logic → `class/wallets/lightning-ark-wallet.ts` (extend, don't duplicate)
- Background reconciliation → `blue_modules/arkade-adapters/background/`
- UI → `screen/send/` or `screen/receive/`
- Strings → `loc/en.json`
- Tests → both `tests/unit/lightning-ark-wallet.test.ts` and `tests/integration/lightning-ark-wallet.test.ts`

### Debugging the Ark Wallet

- Logs prefixed with `[ARK]`:
  ```bash
  adb logcat | grep "\[ARK\]"
  ```
- Realm DB inspection: extract `realm-<namespace>` files via `adb pull /data/data/io.bluewallet.bluewallet/...` and open in Realm Studio
- Boltz state: query `https://api.ark.boltz.exchange/<swap-id>` (also inspect via the SDK)

## 8. Native Code Changes

For changes in `ios/` or `android/`:
- Coordinate with maintainers (BlueWallet has a small core native team)
- Test both debug and release builds
- For iOS: ensure widget targets, sticker pack, watch app, and share extension still build
- For Android: test on AVD + at least one physical device

## 9. Releases

Maintainer-only:
- Bump `package.json` version → `REL: x.y.z`
- Tag release in git
- Trigger fastlane lanes for App Store / Play Store / GitHub APK
- Update `release-notes.txt` (auto-generated by `scripts/release-notes.sh`)

## 10. Useful Scripts

```bash
# Generate fresh release-notes.json + current-branch.json
npm run releasenotes2json
npm run branch2json

# Re-apply patches manually
npm run patches

# Quick-fix lint issues in changed files only
npm run lint:quickfix

# Restart Android app without rebuild
npm run android:restart

# Force-stop + relaunch Android app
npm run android:relaunch

# Uninstall Android app
npm run android:uninstall

# adb reverse for physical device + Metro
npm run adb
```

## 11. Reporting & Discussion

- Public bugs/features: GitHub Issues
- Security: `bluewallet@bluewallet.io`
- Contributor chat: Telegram (request access by email)
- Code reviews: PR comments

For Ark-related questions that span SDK + wallet, copy the relevant Arkadian project maintainers (`ts-sdk`, `boltz-swap`).
