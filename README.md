# Vibe Repository — Multi-Package Layout (Vibe CLI / Vibe Web / Vibe Code)

This repository now consists of three independent packages:

1. Vibe CLI (Primary): `./vibe-cli` — interactive terminal assistant (chat, codegen, refactor, debug, test, git, agent).
2. Vibe Web (Marketing & Docs Surface): `./vibe-web` — Next.js site for onboarding, feature overview, future MDX docs.
3. Vibe Code (VS Code Extension): `./vibe-code` — in-editor chat, agent orchestration, diff workflow.

Each package ships with its own `package.json` and release lifecycle. The root repo acts only as a meta container (no workspaces).

---

## 1. Top-Level Directory Structure

```
.
├─ package.json            # Meta repo manifest (no dependencies)
├─ LICENSE
├─ README.md               # This file (multi-package overview)
├─ vibe-cli/               # Vibe CLI package
│  ├─ package.json
│  ├─ cli.cjs              # Interactive chat REPL entry
│  ├─ bin/
│  │  └─ vibe.cjs          # Command router (vibe <command>)
│  ├─ install.sh           # Optional installer bootstrap
│  ├─ tools.cjs            # Web search & docs helpers
│  ├─ tsconfig.cli.json
│  ├─ core/
│  │  ├─ apikey.ts
│  │  ├─ apikey.cjs
│  │  ├─ openrouter.ts
│  │  ├─ openrouter.cjs
│  │  ├─ index.cjs
│  ├─ agent/
│  ├─ code/
│  ├─ edit/
│  ├─ git/
│  ├─ refactor/
│  ├─ debug/
│  ├─ test/
├─ vibe-web/               # Next.js marketing/docs site
│  ├─ package.json
│  ├─ next.config.mjs
│  ├─ tailwind.config.cjs
│  ├─ postcss.config.cjs
│  ├─ next-env.d.ts
│  ├─ src/
│     ├─ app/
│     ├─ components/
│     ├─ hooks/
│     ├─ lib/              # Shared utilities (utils.ts, placeholder-images.*)
├─ vibe-code/              # Vibe Code (VS Code extension) package
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ src/
│  ├─ media/
│  ├─ README.md
```

---

## 2. Package Roles

| Package | Purpose | Publish Target | Primary Entry |
|---------|---------|----------------|---------------|
| Vibe CLI (`vibe-cli`) | Developer terminal assistant | npm (`vibe-cli`) | [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1) |
| Vibe Web (`vibe-web`) | Documentation & marketing | Vercel / static host | [`vibe-web/src/app/page.tsx`](vibe-web/src/app/page.tsx:1) |
| Vibe Code (`vibe-code`) | IDE integration | VS Code Marketplace | [`vibe-code/src/extension.ts`](vibe-code/src/extension.ts:1) |

---

## 3. Installation & Usage

### 3.1 CLI (Primary)

Global install (npm):
```bash
npm install -g vibe-cli
vibe help
```

Direct chat:
```bash
vibe chat "Hello"
vibe model list
```

Key configuration:
```bash
vibe config set openrouter.apiKey sk-or-...
export OPENROUTER_API_KEY="sk-or-..."
```

Core commands:
```bash
vibe generate "Build a Node HTTP server"
vibe refactor src/**/*.js --type optimization
vibe debug error.log
vibe test generate src/utils.ts
vibe git commit
vibe agent "Improve logging system" --auto
```

### 3.2 Web

Local development:
```bash
cd vibe-web
npm install
npm run dev
```

Build & start:
```bash
npm run build
npm start
```

Environment:
- Set `OPENROUTER_API_KEY` in deployment for any server-side model interactions (future docs pages).

### 3.3 VS Code Extension

Install from source:
```bash
cd vibe-code
npm install
npm run compile
npx @vscode/vsce package
# Produces vibe-code-*.vsix
```

Then in VS Code:
- Command Palette → “Extensions: Install from VSIX...”
- Configure settings: `vibe.openRouter.apiKey`, `vibe.model`.

---
 
### 3.4 Quick Start Summary
 
| Target | One-Liner |
|--------|-----------|
| CLI | `npm install -g vibe-cli && vibe chat "Hello"` |
| Web | `cd vibe-web && npm install && npm run dev` |
| VS Code Extension | `cd vibe-code && npm install && npm run compile && npx @vscode/vsce package` |
 
Smoke commands (after initial setup):
```bash
# CLI
vibe model list
# Web
cd vibe-web && npm run smoke
# Extension
cd vibe-code && npm run smoke
```
 
## 4. Independent Versioning

Each package maintains its own semantic version:

| Package | File | Version Source |
|---------|------|----------------|
| Vibe CLI | [`vibe-cli/package.json`](vibe-cli/package.json:1) | `"version": "1.0.6"` |
| Vibe Web | [`vibe-web/package.json`](vibe-web/package.json:1) | `"version": "0.1.0"` |
| Vibe Code | [`vibe-code/package.json`](vibe-code/package.json:1) | `"version": "0.3.0"` |

Root meta file [`package.json`](package.json:1) is private and does not declare dependencies.

### 4.1 Tag Naming Strategy

Tags are per-package (no unified multi-package tag) using the pattern:

```
vibe-cli-vX.Y.Z      # Vibe CLI release
vibe-web-vX.Y.Z      # Vibe Web release
vibe-code-vX.Y.Z     # Vibe Code extension release
```

Examples:
```
git tag vibe-cli-v1.0.7
git tag vibe-web-v0.1.1
git tag vibe-code-v0.3.1
git push origin vibe-cli-v1.0.7 vibe-web-v0.1.1 vibe-code-v0.3.1
```

### 4.2 Workflow Coupling

| Tag Pattern | Triggered Workflow | Artifact / Action |
|-------------|--------------------|-------------------|
| `vibe-cli-v*`    | npm-publish.yml / publish.yml / release.yml | npm publish + binary release |
| `vibe-web-v*`    | web-build.yml      | Build artifact + GitHub Release (static assets summary) |
| `vibe-code-v*`   | extension-publish.yml | VSIX packaging + marketplace publish |

### 4.3 Version Bump Checklist

1. Update target package `package.json` version.
2. Commit with prefix: `vibe-cli: bump to 1.0.7` (example).
3. Create tag using correct prefix (e.g. `vibe-cli-v1.0.7`).
4. Push tag to trigger workflow.
5. Verify workflow output (npm artifact, VSIX, build artifact).
6. Update CHANGELOG (future enhancement — per-package) if present.

### 4.4 Avoiding Conflicts

- Do NOT create generic `vX.Y.Z` tags; workflows are scoped by prefix.
- Ensure only one tag per package per version.
- Re-tag corrections: delete remote tag (`git push --delete origin vibe-cli-v1.0.7`), delete local tag (`git tag -d vibe-cli-v1.0.7`), reapply and push.

For a future unified meta release, a separate `meta-vX.Y.Z` tag could be added referencing coordinated package bumps (not implemented yet).

---

## 5. Development Workflow

| Task | Location | Command |
|------|----------|---------|
| Build CLI TypeScript core | `vibe-cli` | `npm run build` |
| Bundle CLI binary | `vibe-cli` | `npm run build:bin` |
| Run Web dev server | `vibe-web` | `npm run dev` |
| Compile Extension | `vibe-code` | `npm run compile` |
| Package Extension | `vibe-code` | `npx @vscode/vsce package` |

---

## 6. OpenRouter Integration

Central routing & model logic lives in:
- [`vibe-cli/core/openrouter.ts`](vibe-cli/core/openrouter.ts:1)
- Fallback shim: [`vibe-cli/core/openrouter.cjs`](vibe-cli/core/openrouter.cjs:1)

API key management:
- [`vibe-cli/core/apikey.ts`](vibe-cli/core/apikey.ts:1)
- Shim: [`vibe-cli/core/apikey.cjs`](vibe-cli/core/apikey.cjs:1)

Model rotation: `TASK_MODEL_MAPPING` resides in TypeScript source for task-aware selection (code-gen, review, refactor, etc.)

---

## 7. Security & Safety Model (CLI)

1. Explicit confirmation for multi-file edits.
2. Defensive-only assistance (reject malicious prompts) implemented in REPL:
   - Security filtering logic: see `/vibe-cli/cli.cjs` function `isDisallowedSecurityRequest`.
3. API key never exfiltrated; stored optionally in `~/.vibe/config.json`.

---

## 8. File Mutation Flow

High-level steps in CLI operations:
1. Collect candidate diff(s).
2. Present preview to user.
3. Confirm or abort.
4. Apply atomically; abort on mismatch.

Diff and review helpers: [`vibe-cli/git/gittools.cjs`](vibe-cli/git/gittools.cjs:1), multi-edit engine: [`vibe-cli/edit/multiedit.cjs`](vibe-cli/edit/multiedit.cjs:1).

---

## 9. Extensibility

Add new CLI domain:
1. Create folder (e.g. `vibe-cli/metrics/`).
2. Export functionality via an invocation path in [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1).
3. Document usage in future `vibe-cli/README.md` (to be added).

Add new Web section:
1. Create route under `vibe-web/src/app/<section>/page.tsx`.
2. Add marketing component under `vibe-web/src/components/marketing/`.

Add new Extension view:
1. Update contributes -> views in [`vibe-code/package.json`](vibe-code/package.json:1).
2. Implement corresponding provider in `src/`.

---

## 10. Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| OPENROUTER_API_KEY | API access | CLI / Web SSR / Extension |
| VIBE_NO_BANNER | Disable CLI ASCII banner | CLI |
| EDITOR | External editor for multiline prompts | CLI |

---

## 11. Contributing

1. Fork
2. Branch: `feat/<topic>`
3. Separate commits per package (prefix path): `vibe-cli:`, `vibe-web:`, `vibe-code:`
4. PR including rationale and before/after diff summary
5. Avoid unnecessary dependencies; prefer native APIs

---

## 12. Release Guidelines

| Package | Tag Prefix | Smoke Check | Publish Command | Notes |
|---------|------------|-------------|-----------------|-------|
| Vibe CLI (`vibe-cli`) | `vibe-cli-v*` | `npm run smoke` (lists models) | `npm publish` | Ensure version bumped in [`vibe-cli/package.json`](vibe-cli/package.json:1) before tagging. |
| Vibe Web (`vibe-web`) | `vibe-web-v*` | `npm run smoke` (build + .next check) | Deploy via Vercel (auto on tag or manual) | Tag triggers [`web-build.yml`](.github/workflows/web-build.yml:1) artifact. |
| Vibe Code (`vibe-code`) | `vibe-code-v*` | `npm run smoke` (compile dist) | `npx vsce publish --pat $VSCODE_PUBLISH_TOKEN` | Tag triggers VSIX build in [`extension-publish.yml`](.github/workflows/extension-publish.yml:1). |

Release sequence example (CLI patch):
```bash
# Bump version in vibe-cli/package.json (e.g. 1.0.6 -> 1.0.7)
git add vibe-cli/package.json
git commit -m "vibe-cli: bump to 1.0.7"
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7
# Workflow publishes to npm
```

Extension publish example:
```bash
# Bump version in vibe-code/package.json (0.3.0 -> 0.3.1)
git add vibe-code/package.json
git commit -m "vibe-code: bump to 0.3.1"
git tag vibe-code-v0.3.1
git push origin vibe-code-v0.3.1
# Marketplace
npx vsce publish --pat $VSCODE_PUBLISH_TOKEN
```

Web deploy (manual alternative if not auto):
```bash
cd vibe-web
npm run build
# Upload .next/static or use `vercel` CLI
vercel deploy --prod
```

Rollback procedure (any package):
```bash
git push --delete origin vibe-cli-v1.0.7
git tag -d vibe-cli-v1.0.7
# Fix version or commit, retag
git tag vibe-cli-v1.0.7
git push origin vibe-cli-v1.0.7
```

Keep changelog entries inside each package’s README or future `CHANGELOG.md`. Root stays minimal.

---

## 13. Success Criteria After Restructure

- Independent installs function (CLI / Web / Extension).
- No broken relative require paths (updated imports inside [`vibe-cli/cli.cjs`](vibe-cli/cli.cjs:1) & [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1)).
- Root has no runtime dependencies.
- Clear separation of concerns; onboarding simplified.

---

## 14. Future Enhancements

- Add `vibe-cli/README.md` with deep usage and advanced workflow examples.
- Introduce automated release scripts per package.
- MDX documentation integration in `vibe-web`.
- Extension diff visualization enhancements.

---

## 15. License

MIT — see [`LICENSE`](LICENSE:1)

---

## 16. Support & Links

- Issues: https://github.com/mk-knight23/vibe/issues
- Vibe CLI Package: npm search `vibe-cli`
- Vibe Code Extension: Marketplace (planned)
- Vibe Web Deploy: Coming soon

---

This README reflects the finalized multi-package restructure. All previous consolidated single-package documentation migrated into individual package scopes.
