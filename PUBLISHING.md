# Vibe Publishing Guide

Detailed end-to-end steps to publish all three packages (CLI, Web, VS Code Extension) starting from GitHub. Covers manual + automated (workflow) approaches, environment variables, secrets, and release validation.

---

## 1. Overview of Artifacts

| Package | Location | Output | Distribution |
|---------|----------|--------|--------------|
| Vibe CLI (`vibe-cli`) | [`vibe-cli/package.json`](vibe-cli/package.json:1) | npm package + optional standalone binaries | npm registry / GitHub Release |
| Vibe Web (`vibe-web`) | [`vibe-web/package.json`](vibe-web/package.json:1) | Next.js production build (`.next/`) | Vercel deployment |
| Vibe Code Extension (`vibe-code`) | [`vibe-code/package.json`](vibe-code/package.json:1) | `.vsix` bundle | VS Code Marketplace + GitHub Release |

Tag prefixes driving workflows (see [`VERSIONING.md`](VERSIONING.md:15)):
```
vibe-cli-vX.Y.Z
vibe-web-vX.Y.Z
vibe-code-vX.Y.Z
```

---

## 2. Prerequisites

### Accounts
- GitHub account (repository: `mk-knight23/vibe`)
- npm account (for `vibe-cli`)
- Vercel account (for `vibe-web`)
- VS Code Marketplace publisher (`mk-knight23`) for `vibe-code`

### Local Tooling
```bash
npm install -g vercel vsce
# Node >= 18 required (check)
node -v
```

### Secrets (GitHub Repository Settings → Secrets and variables → Actions)
| Secret Name | Purpose | Used By Workflow |
|-------------|---------|------------------|
| `NPM_TOKEN` | Auth token for npm publish (automation) | npm-publish.yml / publish.yml |
| `VSCODE_PUBLISH_TOKEN` | PAT for Marketplace publish | extension-publish.yml |
| (Optional) `OPENROUTER_API_KEY` | Could be used in future server-side tasks | future workflows |

---

## 3. Version Bump & Tag Pattern

Each package version lives in its own `package.json`. DO NOT tag without bumping the version first.

Example (CLI patch bump):
```bash
(cd vibe-cli && npm version patch)
git add vibe-cli/package.json
git commit -m "vibe-cli: bump to 1.0.7"
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7
```

Workflows listening for tags (see tables in [`README.md`](README.md:189) and [`VERSIONING.md`](VERSIONING.md:46)) will run automatically.

---

## 4. Publishing the CLI (Two Methods)

### 4.1 Automated via Tag (Recommended)
1. Ensure `NPM_TOKEN` secret exists.
2. Bump version inside [`vibe-cli/package.json`](vibe-cli/package.json:3).
3. Tag & push:
   ```bash
   git tag vibe-cli-v1.0.7
   git push origin vibe-cli-v1.0.7
   ```
4. Workflow runs:
   - Build TypeScript (`npm-publish.yml`)
   - Publish to npm
   - (Optional) Binary artifacts created by `release.yml` if configured.

### 4.2 Manual Local Publish
If no token yet:
```bash
cd vibe-cli
npm login
npm publish --access public
```
(If you see ENEEDAUTH again, confirm login and retry.)

### 4.3 Verification
```bash
npm info vibe-cli version
```
Confirm it matches bumped version.

---

## 5. Publishing the Web (Next.js on Vercel)

### 5.1 One-Time Project Setup
Inside repo root:
```bash
cd vibe-web
vercel login            # Interactive
vercel link             # Link to existing or create new project (suggest name: vibe-web)
```

### 5.2 Environment Variables
Set these in Vercel dashboard (Project → Settings → Environment Variables):
| Name | Value (example) | Type |
|------|-----------------|------|
| `OPENROUTER_API_KEY` | `sk-or-********************************` | Production |
| `NEXT_PUBLIC_VIBE_ANALYTICS` | `disabled` | Production |
| `NEXT_PUBLIC_VIBE_DOCS_MODE` | `enabled` | Production |

### 5.3 Manual Deployment
```bash
cd vibe-web
npm install
npm run build
vercel deploy --prod --yes
```
If you used `vercel build`:
```bash
vercel build    # Creates .vercel/output
vercel deploy --prebuilt --prod --yes
```

### 5.4 Tag-Triggered Build (Optional)
Tag and push:
```bash
git tag vibe-web-v0.1.1
git push origin vibe-web-v0.1.1
```
Then use workflow artifact (see [`web-build.yml`](.github/workflows/web-build.yml:1)) or still rely on Vercel’s Git integration (connect repo in Vercel dashboard, enable automatic deploy on tags or pushes).

### 5.5 Verification
Visit `https://<your-project>.vercel.app` and confirm routes:
- `/`
- `/commands`
- `/installation`
- `/quick-start`

---

## 6. Publishing the VS Code Extension

### 6.1 Automated via Tag (Recommended)
1. Create Marketplace PAT.
2. Add `VSCODE_PUBLISH_TOKEN` as GitHub Actions secret.
3. Bump version in [`vibe-code/package.json`](vibe-code/package.json:5).
4. Tag:
   ```bash
   git tag vibe-code-v0.3.1
   git push origin vibe-code-v0.3.1
   ```

Workflow [`extension-publish.yml`](.github/workflows/extension-publish.yml:1) will:
- Run `npm run compile`
- Package `.vsix`
- Publish if token present
- Attach artifact to GitHub Release

### 6.2 Manual Local Packaging (Optional)
```bash
cd vibe-code
npm install
npm run compile
vsce package          # Produces vibe-code-0.3.1.vsix
vsce publish          # Requires login or PAT
```

### 6.3 Manual Publish with PAT
```bash
export VSCE_PAT="your-pat-here"
vsce publish
```

### 6.4 Verification
- Marketplace listing shows updated version.
- Local install test:
  - VS Code → Command Palette → "Extensions: Install from VSIX..." → select file.

---

## 7. Environment Variable Strategy Matrix

| Variable | CLI | Web | Extension | Mode |
|----------|-----|-----|-----------|------|
| `OPENROUTER_API_KEY` | Required for model calls | (Future SSR features) | Required for chat | Secret |
| `NEXT_PUBLIC_VIBE_ANALYTICS` | N/A | Client toggle | N/A | Public |
| `NEXT_PUBLIC_VIBE_DOCS_MODE` | N/A | Enables docs section | N/A | Public |

Set “public” vars with `NEXT_PUBLIC_*` prefix if needed by browser code.

---

## 8. Release Checklist (Unified)

Before tagging any package:
1. Version bumped in correct `package.json`.
2. Smoke test passes:
   ```bash
   # CLI
   (cd vibe-cli && npm run smoke)
   # Web
   (cd vibe-web && npm run smoke)
   # Extension
   (cd vibe-code && npm run smoke)
   ```
3. README & docs updated if feature changes.
4. Secrets present (`NPM_TOKEN`, `VSCODE_PUBLISH_TOKEN`) if using automation.
5. No uncommitted changes (`git status` clean aside from version bump).
6. Tag created using proper prefix.

After workflow completes:
- Check GitHub Actions run status.
- Validate artifacts & published versions.

---

## 9. Retag / Rollback Procedure

If a mistake:
```bash
# Example rollback CLI tag
git push --delete origin vibe-cli-v1.0.7
git tag -d vibe-cli-v1.0.7
# Fix (edit package.json or commit)
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7
```

Extension rollback: bump again or republish new version (Marketplace disallows overwriting same version number).

---

## 10. Common Failure Modes & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ENEEDAUTH` on npm publish | Not logged in / missing token | `npm login` or set `NPM_TOKEN` secret |
| Vercel token invalid | Not logged in locally | `vercel login` then `vercel link` |
| VS Code publish fails (401) | Missing PAT | Set `VSCE_PAT` env or `VSCODE_PUBLISH_TOKEN` secret |
| Workflow didn’t trigger | Wrong tag prefix | Verify tag matches `vibe-*-vX.Y.Z` |
| Web 404 on routes | Build failed or not deployed | Re-run `npm run build` & redeploy |
| Extension commands missing | Activation failed | Check Output → “Vibe” logs, verify API key setting |

---

## 11. Automation Roadmap (Future Enhancements)

- Add unified script: `scripts/release.sh` performing bump + tag + push.
- Generate release notes from commit messages (Conventional Commits).
- Add CHANGELOG per package.
- Introduce meta tag `meta-vX.Y.Z` for coordinated multiple package deployments.

---

## 12. Example Full Multi-Package Release (Coordinated)

```bash
# Bump versions (choose patch/minor/major)
(cd vibe-cli && npm version minor)
(cd vibe-web && npm version patch)
(cd vibe-code && npm version patch)

git add vibe-cli/package.json vibe-web/package.json vibe-code/package.json
git commit -m "release: bump CLI/Web/Extension versions"

# Tag each
git tag vibe-cli-v1.1.0
git tag vibe-web-v0.1.1
git tag vibe-code-v0.3.1

# Push all
git push origin vibe-cli-v1.1.0 vibe-web-v0.1.1 vibe-code-v0.3.1
```

Monitor three parallel workflow runs.

---

## 13. Minimal Quick Reference

```bash
# CLI publish (automated)
(cd vibe-cli && npm version patch && git add package.json && git commit -m "vibe-cli: bump" && git tag vibe-cli-v$(jq -r '.version' vibe-cli/package.json) && git push origin --tags)

# Web deploy (manual)
cd vibe-web
vercel login
vercel link
vercel deploy --prod --yes

# Extension publish (automated)
(cd vibe-code && npm version patch && git add package.json && git commit -m "vibe-code: bump" && git tag vibe-code-v$(jq -r '.version' vibe-code/package.json) && git push origin --tags)
```

---

## 14. Validation Commands Summary

| Artifact | Command |
|----------|---------|
| CLI version on npm | `npm info vibe-cli version` |
| Web deploy status | Visit Vercel URL / `vercel ls` |
| Extension Marketplace | Search `Vibe Code` in VS Code |
| Tags list | `git tag --list 'vibe-*'` |
| Workflow status | GitHub Actions → “Runs” filtered by tag |

---

## 15. Security Notes

- Keep secrets out of commit history.
- Prefer GitHub Actions secrets for automation rather than storing tokens locally.
- Validate tag content before pushing (avoid including sensitive data in commit message).
- Future: integrate secret scanning workflow (e.g. `gitleaks`).

---

## 16. When to Choose Manual vs Automated

| Scenario | Manual | Automated |
|----------|--------|-----------|
| First-time publish without CI secrets | ✔️ | ❌ |
| Frequent patch releases | ❌ | ✔️ |
| Debugging build failures | ✔️ (local) | Then automated |
| Coordinated multi-package release | Possible but error-prone | ✔️ (multiple tags) |

---

## 17. Troubleshooting Checklist

Before asking for help:
1. Run package smoke test.
2. Check tag correctness.
3. Inspect workflow logs.
4. Confirm secret presence.
5. Validate login status (`npm whoami`, `vercel whoami`).
6. Confirm no extraneous untracked files altering build.

---

## 18. Final Advice

Start with manual steps for the Web and Extension once to validate environment, then rely on tag-driven workflows for repeatable releases. Always bump versions explicitly; never reuse a version for a second publish attempt.

Maintain clarity:
- One tag = one deployable artifact.
- Do not push tags for packages that did not change.

---

If you need an additional consolidated script later, create `scripts/release-all.cjs` referencing these steps. For now this document is the authoritative guide.
