# Documentation Sync History - Arkade Compiler

## 2026-04-29 - PR Preview Workflow & Deployment Pipeline Simplification
**Commit Range**: `cdd36252` → `c6ab1589`
**Synced By**: /update-project compiler
**Status**: CI/CD workflow update

**Commits Analyzed** (1):
- `c6ab158` Add PR preview workflow and simplify deployment pipeline (#27)

**Changes**:
- `.github/workflows/deploy-playground.yml` — switched master deploy from the GitHub Pages API to `JamesIves/github-pages-deploy-action@v4` targeting the `gh-pages` branch root, with `clean-exclude: pr-previews/` to preserve open PR previews. Added a step to delete `playground/.gitignore` before deploy so generated `pkg/` and `contracts.js` are included (fixes 404s caused by `git add --all` silently skipping ignored files).
- `.github/workflows/pr-preview.yml` (new) — builds the playground on each PR push (`opened`, `synchronize`, `reopened`) and deploys to `pr-previews/pr-{number}/` on `gh-pages`. Posts/updates a bot comment with the preview URL `https://arkade-os.github.io/compiler/pr-previews/pr-{number}/`. On PR close, removes the preview subdirectory from `gh-pages`.

**Documentation Updates**:
- `sop/development-workflow.md` — documented PR preview behaviour and the master deploy pipeline under the Git workflow section.

**Notes**:
- No source, grammar, compiler, or test changes — CI/CD only.
- No impact on language semantics, ABI, or `arkadec` CLI behaviour.
- Master `docs/INDEX.md` compiler entry unchanged (no capability changes).

---

## 2026-02-19 - Initial Documentation Setup
**Commit**: `3afdd1bf296f0e253900fa9dd2df5575007b0701`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added testing/usage.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project compiler` to sync after new commits
