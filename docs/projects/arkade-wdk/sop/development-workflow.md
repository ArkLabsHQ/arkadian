# Arkade WDK — Development Workflow

## Branching

- Default branch: `main`.
- Feature branches: `feat/<scope>-<short-description>`.
- Fix branches: `fix/<scope>-<short-description>`.
- Submodule changes are **not** included in adapter branches — they ship in their own PRs against their own repos. The adapter PR only updates the submodule pointer or the patch file.

## Daily Loop (Root Adapter Changes)

1. `git pull --rebase`.
2. `npm install` if dependencies changed.
3. Make changes in `src/`.
4. `npm run lint` (covers ESLint **and** the JSDoc type-check via `tsc -p jsconfig.json --noEmit`).
5. `npm run format` if needed.
6. `npm test` — runs `node --test src/__tests__/*.test.js` (no Jest, no `--experimental-vm-modules`).
7. Commit with conventional-commit style: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`.
8. Push and open a PR.

There is no compile step for runtime code — `package.json` exports `./src/index.js` directly. Type declarations are emitted into `types/` only at publish time (`prepublishOnly` runs `npm run build:types`).

## Daily Loop (Submodule Changes)

Submodules are independent repos. Treat each touched submodule as its own deliverable.

1. Edit inside the submodule:
   ```bash
   cd packages/wdk-react-native-provider
   # ... edit ...
   git add -A && git commit -m "fix(provider): …"
   git push
   ```
2. Back in the parent repo, bump the submodule pointer:
   ```bash
   cd ../..
   git add packages/wdk-react-native-provider
   git commit -m "chore(submodule): bump wdk-react-native-provider"
   ```
3. Repeat for other touched submodules.

If you cannot push to the submodule's upstream (vendor repo), use the patch workflow instead.

## Patch Workflow

Use patches when local changes to a submodule must travel with the parent repo without committing into the submodule's own history.

```bash
# After editing inside a submodule:
node scripts/generate-patches.js                 # default base = parent's pinned submodule SHA
node scripts/generate-patches.js --base origin/v2  # or against a specific base ref

# Apply patches into a freshly synced submodule (idempotent):
npm run setup:dev
```

`scripts/setup-dev.js` uses `git apply --reverse --check` per patch, so reruns are safe — already-applied patches are skipped.

Commit the refreshed patch file in the parent repo:

```bash
git add patches/wdk-react-native-provider.patch
git commit -m "chore(patch): update wdk-react-native-provider patch"
```

## Coding Standards

- **JavaScript with JSDoc** — runtime code lives in `src/*.js`. Use JSDoc to express types; the `lint` step runs `tsc -p jsconfig.json --noEmit` with `checkJs: true`, so type errors fail CI/lint.
- ESM (`"type": "module"`), target ES2022.
- 2-space indent, single quotes, semicolons, print width 100.
- ESLint base: `eslint:recommended`. `no-unused-vars` allows `^_`-prefixed vars. `no-console` warns except `warn`/`error`.
- Use `.js` import suffixes on relative imports (Node ESM resolution).
- Reach for `sodium_memzero` whenever you handle private key material — wipe on `dispose`, wipe master HDKey after derivation.
- Keep changes minimal and reversible; avoid speculative API surface (`feat: trim public API surface to WDK convention` is the current reference for what to keep public).

## Documentation Discipline

- Sync README/API docs with real implementation state. No aspirational APIs.
- When intentionally not implementing something, mark it clearly in code comments and docs with a concrete TODO scope.
- Update `INDEX.md` and project docs in `${ARKADIAN_DIR}/docs/projects/arkade-wdk/` when public surface changes.

## PR Hygiene

Before requesting review:

- [ ] `npm run lint` passes (ESLint + JSDoc type-check).
- [ ] `npm test` passes.
- [ ] `npm run format` produced no further changes (or formatting changes are isolated in a separate commit).
- [ ] `git status --short` clean at root and in all touched submodules.
- [ ] No accidental lockfile churn (`pnpm-lock.yaml` is gone — only `package-lock.json` is committed; `npm` is enforced).
- [ ] Submodule pointer updates are separate, atomic commits.
- [ ] Patch files (if any) regenerated and committed.

## Release Cadence

`@arkade-os/wdk` is at `0.1.0`. Releases are manual: bump `package.json#version`, then `npm publish` (which triggers `prepublishOnly` → `npm run build:types`) from a maintainer machine. Coordinate version bumps with downstream consumers (notably `wdk-react-native-provider`).
