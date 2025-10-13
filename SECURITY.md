# Security Policy

## Reporting a Vulnerability

If you discover a vulnerability, please report it privately to the maintainers at security@gatishil.example (replace with the appropriate contact). Include any relevant details, reproduction steps, and potential impact. We aim to acknowledge reports within 48 hours and provide an initial assessment within five business days.

## Incident Response Process

1. **Triage** – Confirm the report, classify severity, and identify affected services, environments, and secrets.
2. **Containment** – Disable compromised credentials, revoke affected sessions, and limit further exposure (e.g., suspend deployments or APIs if necessary).
3. **Eradication** – Remove malicious code or configuration, patch vulnerabilities, and deploy fixes.
4. **Recovery** – Restore services, monitor for recurrence, and verify that rotated keys and patches are functioning correctly.
5. **Post-Incident Review** – Document the incident, timeline, root cause, corrective actions, and lessons learned. Share sanitized findings with stakeholders.

## Credential Rotation Checklist

When responding to an incident, rotate all potentially exposed credentials:

- **Vercel** – Regenerate project/environment tokens and redeploy with the updated values. Remove any unused or stale tokens from the dashboard.
- **Supabase** – Rotate both the `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Update the anon key anywhere it is used client-side, and limit exposure of the service role key to server-side contexts only.
- **OAuth Providers** – Regenerate client IDs/secrets in providers such as Google, GitHub, or Auth0. Update redirect URIs if the incident involved domain or configuration changes.

Document each rotation, verify new credentials in CI/CD, and purge cached configurations (e.g., Vercel build caches, local `.env` files).
