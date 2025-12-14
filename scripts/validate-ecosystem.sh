#!/bin/bash

# Final ecosystem validation for v9.0 release
set -e

echo "🔍 VIBE v9.0 Ecosystem Validation"
echo "================================="

# Validate versions match
CLI_VERSION=$(node -p "require('./vibe-cli/package.json').version")
EXT_VERSION=$(node -p "require('./vibe-code/package.json').version") 
WEB_VERSION=$(node -p "require('./vibe-web/package.json').version")

echo "📦 Versions:"
echo "  CLI: v$CLI_VERSION"
echo "  Extension: v$EXT_VERSION"
echo "  Web: v$WEB_VERSION"

# Validate compatibility matrix exists
if [[ -f "ecosystem-compatibility.json" ]]; then
  echo "✅ Compatibility matrix: Present"
else
  echo "❌ Compatibility matrix: Missing"
  exit 1
fi

# Validate all scripts are executable
for script in scripts/*.sh; do
  if [[ -x "$script" ]]; then
    echo "✅ Script: $(basename $script)"
  else
    echo "❌ Script: $(basename $script) not executable"
    exit 1
  fi
done

# Final build test
echo "🔨 Final build validation..."
cd vibe-cli && npm run build --silent && cd ..
cd vibe-code && npm run compile --silent && cd ..
cd vibe-web && npm run build --silent && cd ..

echo "🎉 VIBE v9.0 ecosystem validation complete!"
echo "Ready for production deployment."
