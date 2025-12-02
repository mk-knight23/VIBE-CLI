# Changelog

All notable changes to Vibe CLI will be documented in this file.

## [4.0.0] - 2025-12-02

### 🎉 Major Release - Multi-Provider Support

#### Added
- **Multi-Provider Architecture**: Support for 4 AI providers
  - OpenRouter (6 free models)
  - MegaLLM (12 models)
  - AgentRouter (7 models)
  - Routeway (6 free models)
- **40+ Free Models**: Access to diverse AI models with varying capabilities
- **Intelligent Fallback System**:
  - Automatic API key fallback
  - Model fallback within same provider
  - Provider fallback across all providers
  - Zero downtime guarantee
- **Auto File Creation**: AI responses automatically create files and folders
- **Enhanced Startup UI**:
  - Beautiful welcome box
  - Interactive provider selection
  - Model selection with context size display
  - Confirmation screen
- **Zero Configuration**: Hardcoded API keys for instant use
- **Provider Manager**: Centralized provider management with fallback logic
- **Model Registry**: Comprehensive model catalog with metadata

#### Changed
- Complete rewrite of provider architecture
- Improved error handling and recovery
- Enhanced user interface with picocolors
- Streamlined startup flow
- Better TypeScript type safety

#### Removed
- Old single-provider limitation
- Manual API key requirement (now optional)
- Unnecessary dependencies
- Test files and demo scripts
- Duplicate code files

#### Technical Details
- TypeScript 5.7.2
- Node.js >= 16.0.0
- Modular provider system
- Async/await streaming support
- Type-safe interfaces

### Package Information
- **npm**: `vibe-ai-cli@4.0.0`
- **GitHub**: `vibe-cli-v4.0.0`
- **Size**: 64.2 kB (packed), 332.7 kB (unpacked)
- **Files**: 62 files

### Migration Guide from v3.x

No breaking changes for end users. Simply update:

```bash
npm update -g vibe-ai-cli
```

### Credits
🔥 Made by KAZI 🔥

---

## [3.x] - Previous Versions

See git history for previous releases.
