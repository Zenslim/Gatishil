# Risk Notes

- Network restrictions in the build environment prevented fetching packages from the npm registry, so the lockfile's dependency tree still reflects the previously cached versions where available. The direct dependency versions are now pinned, but maintainers should run `npm install --package-lock-only` in a connected environment to fully refresh transitive resolution and integrity hashes.
- The new OSV scanner workflow fails the pull request job when high-severity vulnerabilities are detected. This may block merges until the findings are triaged or suppressed with appropriate fixes or allowlists.
