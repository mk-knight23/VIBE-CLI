# VIBE v9.0 Ecosystem

**Multi-Agent AI Development Platform**

## 🎯 Current Versions

| Product | Version | Status | Features |
|---------|---------|--------|----------|
| **CLI** | v9.0.0 | ✅ Production | Multi-agent orchestration, Extended thinking |
| **Extension** | v5.0.0 | ✅ Production | 100% CLI parity in VS Code |
| **Web** | v2.0.0 | ✅ Production | Documentation hub, Migration guides |
| **Chat** | v1.0.0 | 🚧 Separate repo | AI website builder |

## 🚀 Quick Install

```bash
# CLI - Multi-agent orchestration
npm install -g vibe-ai-cli@9.0.0

# VS Code Extension - Full parity
# Install from marketplace: "Vibe VS Code v5.0"

# Documentation
# Visit: https://docs.vibe-ai.dev
```

## 📊 v9.0 Achievements

- **143 tests** passing (CLI)
- **24 files** created (4,950+ lines)
- **0 security** vulnerabilities
- **100% feature parity** (CLI ↔ Extension)

## 🔧 Development

```bash
# Health check all products
./scripts/health-check.sh

# Sync versions across ecosystem  
node scripts/sync-versions.js

# Full ecosystem release
./scripts/release-ecosystem.sh
```

## 🌟 Key Features

### Multi-Agent Orchestration
- 5 specialized agents (Architect, Developer, Validator, Debugger, Reviewer)
- Parallel execution with consensus scoring
- Isolated environments with race condition prevention

### Extended Thinking
- Auto-detection for complex tasks
- Budget management and cost tracking
- Support for o3-mini and DeepSeek R1 models

### Semantic Memory
- Embeddings-based search
- Conversation compression
- Team collaboration with audit trail

### Advanced Security
- CVE database integration
- Automated vulnerability fixes
- Secret scanning and detection

## 🔄 Migration from v8

```bash
# Automatic migration
vibe migrate --from=8.x --to=9.x

# Manual steps
# 1. Update memory format (store.json → store.db)
# 2. Configure web search (now optional)
# 3. Set up team features (if needed)
```

## 📚 Documentation

- **API Docs**: https://docs.vibe-ai.dev/api
- **Migration Guide**: https://docs.vibe-ai.dev/v9-migration
- **Feature Matrix**: https://docs.vibe-ai.dev/features
- **Team Setup**: https://docs.vibe-ai.dev/teams

## 🎯 Compatibility Matrix

| CLI | Extension | Web | Node.js | VS Code |
|-----|-----------|-----|---------|---------|
| 9.x | 5.x | 2.x | 18.0+ | 1.107+ |
| 8.x | 4.x | 1.x | 16.0+ | 1.100+ |

## 🚀 What's Next

- Performance optimizations
- Additional AI model integrations  
- Enhanced team collaboration features
- Mobile companion app (roadmap)

---

**Built with ❤️ by the VIBE Team**
