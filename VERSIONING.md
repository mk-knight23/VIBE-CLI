# Versioning & Release Guide

This document formalizes the per-package semantic versioning and tagging scheme for the Vibe repository.

## Packages

- Vibe CLI (`vibe-cli`)
- Vibe Web (`vibe-web`)
- Vibe Code Extension (`vibe-code`)

Each is versioned independently in its own `package.json`.

## Tag Prefixes

| Package | Tag Prefix | Example Next Tag |
|---------|------------|------------------|
| CLI     | `vibe-cli-v`    | `vibe-cli-v1.0.7`     |
| Web     | `vibe-web-v`    | `vibe-web-v0.1.1`     |
| Code    | `vibe-code-v`   | `vibe-code-v0.3.1`    |

## Bump Procedure (Single Package)

1. Edit the target package `package.json` version.
2. Commit with scoped message: `vibe-cli: bump to 1.0.7`.
3. Create and push tag:
   ```bash
   git tag vibe-cli-v1.0.7
   git push origin vibe-cli-v1.0.7
   ```
4. Allow GitHub Actions workflow to run.
5. Validate artifacts (npm, VSIX, web build).

## Coordinated Multi-Package Release

If multiple packages are bumped together:

```bash
git tag vibe-cli-v1.0.7
git tag vibe-web-v0.1.1
git tag vibe-code-v0.3.1
git push origin vibe-cli-v1.0.7 vibe-web-v0.1.1 vibe-code-v0.3.1
```

## Workflows Mapping

| Tag Pattern | Workflow | Result |
|-------------|----------|--------|
| `vibe-cli-v*`    | `npm-publish.yml`, `publish.yml`, `release.yml` | npm publish + binary release artifacts |
| `vibe-web-v*`    | `web-build.yml` | Next.js build artifact + release summary |
| `vibe-code-v*`   | `extension-publish.yml` | VSIX packaging + marketplace publish (if PAT provided) |

## Safety / Retagging

If a tag was created with wrong version:

```bash
git push --delete origin vibe-cli-v1.0.7
git tag -d vibe-cli-v1.0.7
# Fix version, recommit if needed
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7
```

Avoid generic `vX.Y.Z` tags — not consumed by any workflow currently.

## Future Enhancements

- Per-package `CHANGELOG.md`.
- Optional meta tag `meta-vX.Y.Z` for synchronized umbrella releases.
- Automated bump script verifying no uncommitted changes before tagging.
- Conventional commit enforcement (future CI addition).
- Release notes auto-generation from commit messages.

## Quick Reference Commands

```bash
# CLI release
(cd vibe-cli && npm version patch)  # bumps package.json
git add vibe-cli/package.json
git commit -m "vibe-cli: bump to 1.0.7"
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7

# Web release
(cd vibe-web && npm version patch)
git add vibe-web/package.json
git commit -m "vibe-web: bump to 0.1.1"
git tag vibe-web-v0.1.1
git push origin vibe-web-v0.1.1

# Extension release
(cd vibe-code && npm version patch)
git add vibe-code/package.json
git commit -m "vibe-code: bump to 0.3.1"
git tag vibe-code-v0.3.1
git push origin vibe-code-v0.3.1
```

## Artifact Validation Paths

- CLI binary outputs: `dist/` after [`vibe-cli/package.json`](vibe-cli/package.json:1) script `build:bin`.
- Web build: `vibe-web/.next/` after [`vibe-web/package.json`](vibe-web/package.json:1) script `build`.
- Extension bundle: `vibe-code/*.vsix` after [`vibe-code/package.json`](vibe-code/package.json:1) script `package`.

## Cross-Package Considerations

- Shared docs references in [`README.md`](README.md:1) should reflect latest versions after bumps.
- Ensure no stale tag references in issue templates or PR templates.
- Avoid simultaneous large refactors across all packages in one PR; prefer separate scoped PRs.

## Verification Checklist (Post-Tag)

| Item | Command / Path | Status |
|------|----------------|--------|
| CLI npm publish succeeded | `npm info vibe-cli version` | (verify) |
| CLI binaries attached | GitHub Release assets | (verify) |
| Web artifact uploaded | Release summary / workflow logs | (verify) |
| Extension VSIX attached | Release assets & Marketplace listing | (verify) |
| README updated | [`README.md`](README.md:1) | (verify) |

Maintain clarity: each tag represents a deployable, tested state of its package only.