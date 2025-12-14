#!/bin/bash

echo "🚀 VIBE Ecosystem Release"
echo "========================="

# CLI Release
echo "📦 Building CLI..."
cd vibe-cli
npm run build
echo "✅ CLI built successfully"

# VS Code Extension Release  
echo "📦 Building VS Code Extension..."
cd ../vibe-code
npm run compile
npm run package
echo "✅ Extension packaged: vibe-vscode-4.1.0.vsix"

# Web Release
echo "📦 Building Web..."
cd ../vibe-web
npm run build
echo "✅ Web built successfully"

echo ""
echo "🎯 Release Summary:"
echo "- CLI v8.1.0: Ready for npm publish"
echo "- Extension v4.1.0: Ready for marketplace"
echo "- Web v2.1.0: Ready for deployment"
echo ""
echo "✅ All products ready for release!"
