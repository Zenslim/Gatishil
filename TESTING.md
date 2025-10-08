# Testing & Quality Gates

This project now provides a layered testing strategy:

1. **Static analysis**
   - `npm run typecheck` performs a TypeScript build with `--noEmit` to ensure type safety.
   - `npm run lint` runs ESLint with strict TypeScript, React, accessibility, and import-order rules.
2. **Unit tests**
   - `npm run test:unit` executes Vitest in watchless mode with coverage enabled by default. Coverage thresholds are enforced at **60%** for lines, statements, branches, and functions.
3. **End-to-end smoke tests**
   - `npm run test:e2e` launches Playwright against the running Next.js dev server and verifies the `/`, `/login`, and `/dashboard` routes load their key UI states.

## Raising coverage thresholds

The coverage threshold currently sits at 60% to make the first adoption step approachable. Once the suite is stable, you can increase it gradually:

1. Identify under-tested areas by inspecting the HTML report generated in `coverage/index.html` after running `npm run test:unit`.
2. Add focused unit or integration tests to raise coverage in the low scoring files.
3. Bump the numeric values in the `coverage` block of `vitest.config.ts` (lines, statements, branches, and functions) to the new target. For example, raising the floor to 70% would look like:
   ```ts
   coverage: {
     // ...
     lines: 70,
     statements: 70,
     branches: 70,
     functions: 70,
   }
   ```
4. Re-run `npm run test:unit` to confirm the suite meets the new requirement before committing.

When the team is comfortable with the testing discipline, repeat this process until the thresholds reflect your long-term quality goals.
