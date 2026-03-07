# Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for package versioning and changelog management.

## Typical workflow

1. Make a user-facing change
2. Run `npm run changeset`
3. Commit the generated changeset file
4. Merge to `main`
5. Let the release workflow open or update the release PR

When the release PR is merged, GitHub Actions updates the version, writes the changelog, tags the release, and publishes to npm when `NPM_TOKEN` is configured.
