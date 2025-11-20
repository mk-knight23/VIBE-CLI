# Publishing Guide for Vibe VS Code Extension

This document provides step-by-step instructions for publishing the Vibe VS Code extension to the Visual Studio Marketplace.

## Prerequisites

1. **Microsoft Partner Center Account**: You need a Microsoft Partner Center account to publish VS Code extensions
2. **Publisher ID**: Ensure you have the correct publisher ID (currently `mktech` as set in package.json)
3. **Personal Access Token (PAT)**: Generate a PAT from Azure DevOps with Marketplace permissions
4. **vsce CLI Tool**: Install the vsce tool globally: `npm install -g vsce`

## Pre-Publish Checklist

- [ ] All features have been tested
- [ ] README.md is up-to-date with latest features
- [ ] Version number is updated in package.json
- [ ] Dependencies are up-to-date
- [ ] Package compiles without errors: `npm run compile`
- [ ] Package can be built: `npm run package`
- [ ] Extension functions properly in VS Code

## Versioning

The extension follows semantic versioning (SemVer):
- **Major** (X.0.0): Breaking changes, major feature additions
- **Minor** (X.Y.0): New features, backward-compatible additions
- **Patch** (X.Y.Z): Bug fixes, security updates

Current version: 2.0.0 (represents major update with MegaLLM support and enhanced UI)

## Publishing Process

### 1. Update Version in package.json
```bash
# Update version manually or use npm version command
npm version major|minor|patch
```

### 2. Update Documentation
- Update version numbers in relevant README files
- Update feature list to reflect new capabilities
- Ensure all documentation is accurate

### 3. Build and Test
```bash
# Clean and build
npm run compile

# Package to test
npm run package
```

### 4. Publish to Marketplace
```bash
# Using PAT (recommended for CI/CD)
vsce publish --pat <your-personal-access-token>

# Or interactive login
vsce publish
```

### 5. Create Git Tag
After publishing, create a git tag following the convention:
```bash
git tag vibe-code-v2.0.0
git push origin vibe-code-v2.0.0
```

## Features in v2.0.0

- **Multi-Provider Support**: OpenRouter and MegaLLM
- **Enhanced UI**: Copyable messages, clear chat button, improved scrolling
- **70+ AI Models**: Access to extensive model catalog
- **Better UX**: Improved layout and user experience
- **Latest Dependencies**: Updated VS Code engine support

## GitHub Releases

For GitHub releases, attach:
- The generated `.vsix` file
- Release notes highlighting key changes
- Any relevant migration guides

## Post-Publish Verification

1. Check that extension appears in VS Code marketplace
2. Verify version number is correct
3. Test installation from marketplace
4. Confirm all functionality works as expected
5. Verify documentation is accessible and correct

## Rollback Process

If issues are discovered after publishing:

1. Immediately unpublish if possible:
   ```bash
   vsce unpublish <extension-id>
   ```

2. Fix issues in code
3. Bump patch version
4. Rebuild and republish

## Troubleshooting

### Common Publishing Issues

**Invalid PAT Error**: Ensure PAT has Marketplace permissions and hasn't expired
**Build Errors**: Run `npm run compile` to identify issues before publishing
**Validation Errors**: Check package.json format and required fields

### Extension Validation

VS Code Marketplace validates:
- All required fields in package.json
- Extension functionality
- Security compliance
- File size limits

### PAT Permissions Required

- Marketplace (Publish): Access to publish extensions
- Marketplace (Manage): Access to manage extensions

## Release Notes Template

When creating release notes:

```
## What's New in v2.0.0

⭐ **Major Update:** Added MegaLLM provider support alongside OpenRouter
✨ **Enhanced UI:** Improved scrolling, copyable messages, and clear chat functionality
🔧 **Better UX:** Message copying by clicking, clear chat button, improved layout
🚀 **Updated Dependencies:** Latest VS Code engine support and type definitions
📊 **Expanded Models:** Support for 70+ AI models from multiple providers

## Breaking Changes
(None in this release)

## Bug Fixes
- Fixed authentication issues with MegaLLM API
- Improved error handling and user feedback
```