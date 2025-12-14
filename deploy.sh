#!/bin/bash

# VIBE Ecosystem Deployment Script
# Usage: ./deploy.sh [cli|web|extension|all] [version]

set -e

COMPONENT=$1
VERSION=$2

if [ -z "$COMPONENT" ]; then
    echo "Usage: ./deploy.sh [cli|web|extension|all] [version]"
    exit 1
fi

if [ -z "$VERSION" ]; then
    echo "Version is required"
    exit 1
fi

deploy_cli() {
    echo "🚀 Deploying CLI v$VERSION"
    cd vibe-cli
    
    # Update version
    npm version $VERSION --no-git-tag-version
    
    # Build and test
    npm run build
    npm test
    
    # Create tag and push
    git add package.json package-lock.json
    git commit -m "chore: bump CLI to v$VERSION"
    git tag "vibe-cli-v$VERSION"
    git push origin main
    git push origin "vibe-cli-v$VERSION"
    
    cd ..
    echo "✅ CLI deployment initiated"
}

deploy_web() {
    echo "🌐 Deploying Web v$VERSION"
    cd vibe-web
    
    # Update version
    npm version $VERSION --no-git-tag-version
    
    # Build and test
    npm run build
    
    # Create tag and push
    git add package.json package-lock.json
    git commit -m "chore: bump Web to v$VERSION"
    git tag "vibe-web-v$VERSION"
    git push origin main
    git push origin "vibe-web-v$VERSION"
    
    cd ..
    echo "✅ Web deployment initiated"
}

deploy_extension() {
    echo "🧩 Deploying Extension v$VERSION"
    cd vibe-code
    
    # Update version
    npm version $VERSION --no-git-tag-version
    
    # Build and test
    npm run compile
    npm run package
    
    # Create tag and push
    git add package.json package-lock.json
    git commit -m "chore: bump Extension to v$VERSION"
    git tag "vibe-code-v$VERSION"
    git push origin main
    git push origin "vibe-code-v$VERSION"
    
    cd ..
    echo "✅ Extension deployment initiated"
}

case $COMPONENT in
    cli)
        deploy_cli
        ;;
    web)
        deploy_web
        ;;
    extension)
        deploy_extension
        ;;
    all)
        deploy_cli
        deploy_web
        deploy_extension
        ;;
    *)
        echo "Invalid component. Use: cli, web, extension, or all"
        exit 1
        ;;
esac

echo "🎉 Deployment complete! Check GitHub Actions for progress."
