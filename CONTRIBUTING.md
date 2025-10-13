# Contributing to GatishilNepal.org

Thank you for supporting the Gatishil Nepal community platform! This document outlines how we work together.

## Branching strategy

- Base all work on the `main` branch.
- Use short-lived feature branches named with the pattern `type/brief-description` (for example, `feat/member-directory` or `fix/webauthn-copy`).
- Keep branches focused on a single change set; open additional branches for unrelated work.

## Commit conventions

- Follow [Conventional Commits](https://www.conventionalcommits.org/) to enable automated versioning.
- Write clear, imperative messages (e.g., `feat: add member status checks`).
- Squash or rebase to keep the history tidy before merging.

## Pull request process

1. Ensure your branch is up to date with `main` and resolves merge conflicts locally.
2. Run the required checks locally:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. Provide context in the PR description, including screenshots for UI updates when possible.
4. Request a review from the code owners listed in [`CODEOWNERS`](CODEOWNERS).
5. A reviewer merges the PR once checks pass and feedback is addressed.

## Issue reporting

- Use the issue templates to file bugs or feature requests.
- Provide reproduction steps, expected vs. actual behavior, and relevant screenshots/logs.
- For security concerns, do **not** open a public issue—contact the maintainers privately.

We appreciate your contributions. 🙏
