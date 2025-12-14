# VIBE Ecosystem Deployment Guide

## 🚀 Quick Deploy

Deploy everything with one command:

```bash
./deploy.sh all patch
```

Deploy individual components:

```bash
./deploy.sh cli patch
./deploy.sh web patch  
./deploy.sh extension patch
```

## 📋 Prerequisites

### GitHub Secrets Required

Set these in GitHub Settings → Secrets and variables → Actions:

```
NPM_TOKEN          # NPM publishing token
VSCE_PAT           # VS Code Marketplace Personal Access Token
OVSX_PAT           # Open VSX Registry token (optional)
VERCEL_TOKEN       # Vercel deployment token
NETLIFY_AUTH_TOKEN # Netlify authentication token
NETLIFY_SITE_ID    # Netlify site ID
```

### Local Setup

```bash
# Clone and setup
git clone https://github.com/mk-knight23/vibe.git
cd vibe

# Install all dependencies
cd vibe-cli && npm install && cd ..
cd vibe-web && npm install && cd ..
cd vibe-code && npm install && cd ..
```

## 🎯 Deployment Targets

### CLI → NPM + GitHub Releases
- **Trigger**: `git tag vibe-cli-v*`
- **Publishes to**: NPM Registry
- **Install**: `npm install -g vibe-ai-cli`
- **Command**: `vibe`

### VS Code Extension → Marketplace + Open VSX
- **Trigger**: `git tag vibe-code-v*`
- **Publishes to**: VS Code Marketplace, Open VSX Registry
- **Install**: VS Code Extensions → Search "Vibe"

### Web → Vercel + Netlify + GitHub Pages
- **Trigger**: `git tag vibe-web-v*` or push to `main`
- **Deploys to**: 
  - Vercel (primary)
  - Netlify (secondary)
  - GitHub Pages (fallback)

## 🔄 Automated Workflows

### CI (Pull Requests)
- Tests all components
- Builds all components
- Validates packaging

### Release Workflows
- **CLI Release**: NPM publish + GitHub release
- **Extension Release**: Marketplace publish + GitHub release
- **Web Deploy**: Multi-platform deployment

## 📦 Manual Publishing (Backup)

### CLI
```bash
cd vibe-cli
npm run build
npm test
npm publish
```

### VS Code Extension
```bash
cd vibe-code
npm run compile
npm run package
npx @vscode/vsce publish
```

### Web
```bash
cd vibe-web
npm run build
# Deploy to your preferred platform
```

## 🎯 Version Strategy

- **Independent versioning** for each component
- **Semantic versioning**: MAJOR.MINOR.PATCH
- **Tag format**: `vibe-{component}-v{version}`

Examples:
- `vibe-cli-v8.0.3`
- `vibe-web-v2.0.1`
- `vibe-code-v4.0.1`

## ✅ Post-Deploy Validation

After deployment, verify:

```bash
# CLI
npm install -g vibe-ai-cli
vibe --version

# Extension
# Install from VS Code Marketplace

# Web
# Visit deployed URLs:
# - https://vibe-ai.vercel.app
# - https://vibe-ai.netlify.app
# - https://mk-knight23.github.io/vibe
```

## 🔧 Troubleshooting

### Failed NPM Publish
- Check NPM_TOKEN is valid
- Verify version hasn't been published
- Check package.json files field

### Failed Extension Publish
- Check VSCE_PAT permissions
- Verify publisher name
- Check extension manifest

### Failed Web Deploy
- Check build process
- Verify deployment tokens
- Check Next.js configuration

## 🎉 Success Criteria

✅ CLI installable via `npm i -g vibe-ai-cli`
✅ VS Code extension in Marketplace
✅ Web live on all platforms
✅ GitHub releases auto-generated
✅ Future deploys work with single command
