# 🔒 SECURE DEPLOYMENT INSTRUCTIONS

## ⚠️ IMPORTANT: Token Security

1. **Revoke the tokens you shared** (they're now compromised)
2. **Generate new tokens** with minimal permissions
3. **Never share tokens in chat or commit them to code**

## 🔑 Generate New Tokens

### NPM Token
1. Go to https://www.npmjs.com/settings/tokens
2. Click "Generate New Token" → "Automation"
3. Copy the token (starts with `npm_`)

### VS Code Marketplace PAT
1. Go to https://dev.azure.com/
2. User settings → Personal access tokens
3. New token with "Marketplace (publish)" scope
4. Copy the token

### GitHub Token (if needed)
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with "repo" and "workflow" scopes

## 🚀 Set GitHub Secrets

1. Go to your GitHub repo: https://github.com/mk-knight23/vibe
2. Settings → Secrets and variables → Actions
3. Add these secrets:

```
NPM_TOKEN = [your new npm token]
VSCE_PAT = [your new vscode pat]
GITHUB_TOKEN = [automatically provided by GitHub]
```

## 🎯 Deploy Commands

Once secrets are set, deploy with:

```bash
# Test first (recommended)
git add .
git commit -m "feat: deployment automation ready"
git push origin main

# Then deploy
./deploy.sh cli patch    # Deploy CLI to NPM
./deploy.sh extension patch  # Deploy to VS Code Marketplace
./deploy.sh web patch    # Deploy web to Vercel/Netlify
```

## ✅ Verification

After deployment:
- CLI: `npm install -g vibe-ai-cli`
- Extension: Check VS Code Marketplace
- Web: Check deployed URLs

## 🔒 Security Best Practices

- ✅ Use GitHub Secrets (encrypted)
- ✅ Minimal token permissions
- ✅ Regular token rotation
- ❌ Never share tokens in chat
- ❌ Never commit tokens to code
