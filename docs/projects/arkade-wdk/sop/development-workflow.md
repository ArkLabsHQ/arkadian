# Arkade WDK — Development Workflow

## Branching

- Default branch: `main`.
- Feature branches: `feat/<scope>-<short-description>`.
- Fix branches: `fix/<scope>-<short-description>`.
- Submodule changes are **not** included in adapter branches — they ship in their own PRs against their own repos. The adapter PR only updates the submodule pointer or the patch file.

## Daily Loop (Root Adapter Changes)

1. `git pull --rebase`
2. `npm install` if dependencies changed.
3. `npm run dev` to keep `tsc --watch` running while editing.
4. Make changes in `src/`.
5. `npm run lint` (or `npm run lint:fix`) and `npm run format` before committing.
6. (Once Jest is unblocked) `npm test`.
7. Commit with conventional-commit style: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`.
8. Push and open a PR.

For the current state of `npm test`, see `testing/how_to_test.md`.

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

If you cannot or should not push to the submodule's upstream (vendor repo, fork constraints), use the patch workflow instead.

## Patch Workflow

Use patches when local changes to a submodule must travel with the parent repo without committing into the submodule's own history.

```bash
# After editing inside a submodule:
node scripts/generate-patches.js                # regenerate against origin/main (default)
node scripts/generate-patches.js --base origin/v2  # or against a specific base ref

# Verify a patch applies cleanly:
node scripts/apply-patches.js --check

# Apply patches into a freshly synced submodule:
node scripts/apply-patches.js
```

Commit the refreshed patch file in the parent repo:

```bash
git add patches/wdk-react-native-provider.patch
git commit -m "chore(patch): update wdk-react-native-provider patch"
```

## Provider Build Step

After provider edits, regenerate bundles + types before pushing:

```bash
cd packages/wdk-react-native-provider
npm run prepare   # gen:secret-manager-bundle + gen:worker-bundle + bob build
```

This keeps the worklet bundle and TypeScript declarations in sync with HRPC schema changes from `pear-wrk-wdk`.

## Coding Standards

- TypeScript, ESM (`"type": "module"`), target ES2022.
- 2-space indent, single quotes, semicolons, print width 100.
- ESLint `@typescript-eslint` rules; unused vars allowed only when prefixed `_`.
- Preserve existing `.js` import suffixes in source where already used (Node ESM resolution).
- Keep changes minimal and reversible; avoid speculative API surface.

## Documentation Discipline

- Sync README/API docs with real implementation state. No aspirational APIs unless explicitly tagged TODO.
- When intentionally not implementing something, mark it clearly in code comments and docs with a concrete TODO scope.
- Update `INDEX.md` and project docs in `${ARKADIAN_DIR}/docs/projects/arkade-wdk/` when public surface changes.

## PR Hygiene

Before requesting review:

- [ ] `npm run build` passes at root.
- [ ] `npm run lint` passes at root.
- [ ] `npm run format` produced no further changes (or formatting changes are isolated in a separate commit).
- [ ] Known broken steps (e.g. `npm test`) called out explicitly in the PR description.
- [ ] `git status --short` clean at root and in all touched submodules.
- [ ] No accidental lockfile churn.
- [ ] Submodule pointer updates are separate, atomic commits.
- [ ] Patch files (if any) regenerated and committed.

## Release Cadence

`@arkade-os/wdk` is at `0.1.0`. There is no automated release pipeline documented; bumps are manual via `package.json` + `npm publish` from a maintainer machine. Coordinate version bumps with downstream consumers (notably `wdk-react-native-provider`).
