#!/bin/bash

# Test deployment script - validates everything works before real deploy
set -e

echo "🧪 Testing VIBE deployment readiness..."

# Test CLI
echo "Testing CLI..."
cd vibe-cli
npm run build
npm test
echo "✅ CLI ready"
cd ..

# Test Web
echo "Testing Web..."
cd vibe-web
npm run build
echo "✅ Web ready"
cd ..

# Test Extension
echo "Testing Extension..."
cd vibe-code
npm run compile
npm run package
echo "✅ Extension ready"
cd ..

echo ""
echo "🎉 All components ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Set GitHub secrets (NPM_TOKEN, VSCE_PAT)"
echo "2. Run: ./deploy.sh all patch"
echo "3. Check GitHub Actions for deployment status"
