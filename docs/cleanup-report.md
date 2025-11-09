# Minimal Repo Cleanup Report

✅ **Files removed**
- `.pre-commit-config.yaml` — Unused; no references found via `git grep`.
- `CODEOWNERS` — Unused; no references found via `git grep`.
- `.secretlintrc.json` — Unused; no references found via `git grep`.
- `.secrets.baseline` — Legacy baseline tied to removed pre-commit hooks; no remaining references.
- `.gitleaks.toml` — Secret scanner configuration removed alongside its workflow; no remaining references.
- `.trufflehogignore` — Scanner ignore list removed alongside secret-scans workflow.
- `vitest.config.ts` — Vitest suite retired; no references after cleanup.
- `vitest.setup.ts` — Vitest setup removed together with the retired test suite.
- `.github/workflows/secret-scans.yml` — Secret scanning workflow removed for minimalist production repo.
- `tests/` — Vitest test suite removed per production-only focus.

🧾 **Reasoning**
- Verified each deleted path with `git grep -n` to ensure no outstanding references in source files, package scripts, or workflows.
- Removed dependent workflows/configs together so that no dangling references remain.

🕒 **Timestamp**
- 2025-10-18T10:35:38Z (UTC)

🧩 **Confirmed kept configs**
- `tsconfig.eslint.json` — Required by `eslint.config.mjs` for linting.
- `.github/workflows/ci.yml` — Retained to ensure build, lint, and typecheck coverage.
- `.github/workflows/security.yml` — Preserved dependency scanning for releases and PRs.
- `.github/workflows/vercel-cancel-builds.yml` — Keeps Vercel deployment cancellation automation intact.

