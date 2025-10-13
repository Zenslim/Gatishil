# Secret Scans: What to do if it still fails

- **If a finding points to real creds** (JWTs, service_role, personal access tokens): rotate immediately and replace with env vars.
- **If a finding points to public values** (Supabase URL, Google API key), these are now allowlisted. If another harmless string is flagged, add a precise pattern/path to:
  - `.secretlintrc.json` -> `allowSecrets` or `ignores`
  - `.gitleaks.toml` -> `regexes` or `paths`
  - `.trufflehogignore` -> line-based ignore
- Avoid broad ignores under `src/` or `app/`. Be surgical.
