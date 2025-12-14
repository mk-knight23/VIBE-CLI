# VIBE - AI Development Platform

**Revolutionary AI Development Platform** - 3 Independent Tools | Free API Access | 4 Providers | 40+ Models | 120+ Features

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue)](https://www.typescriptlang.org/)

## 🔥 What's New in v8.0.2

### Revolutionary 3-Layer Memory System
- **Story Memory** - Track project goals, milestones, challenges, and learnings across sessions
- **Chat History** - 100-message history with semantic search
- **Enhanced Workspace** - 50 recent changes, dependency tracking, git integration

### 8 Advanced AI-Powered Tools
1. **Code Quality Analyzer** - Complexity, duplicates, long functions
2. **Smart Refactoring** - Extract, inline refactoring
3. **Auto Test Generator** - Vitest, jest, mocha support
4. **Bundle Optimizer** - Large files, unused dependencies
5. **Security Scanner** - Secrets, vulnerabilities
6. **Performance Benchmark** - File ops, parse time
7. **Documentation Generator** - Markdown docs from code
8. **Code Migrator** - CommonJS→ESM, JS→TS

### Complete Ecosystem Upgrade
- **CLI v8.0.2**: 36 tools across 14 categories, 142/142 tests passing
- **Web v2.0.0**: Next.js 16 + React 19, comprehensive documentation platform
- **VS Code Extension v4.0.0**: Autonomous AI coding with 40+ models

---

## 🌟 What is VIBE

VIBE is a **revolutionary AI development platform** that provides three independent tools for AI-powered development:

- **🤖 AI-First**: Direct integration with 4 providers and 40+ models
- **🧠 Memory-Driven**: 3-layer memory system maintains context across sessions
- **🔧 Tool-Rich**: 36+ development tools across 14 categories
- **⚡ Production-Ready**: 142 tests passing, zero vulnerabilities, optimized builds
- **🎯 Feature Parity**: Identical behavior across CLI, VS Code, and Web platforms

---

## 🏗️ Ecosystem Overview

```
VIBE Ecosystem
├── vibe-cli/      # Terminal AI Assistant (36 tools, 14 categories)
├── vibe-web/      # Web Platform (documentation, chat, onboarding)
├── vibe-code/     # VS Code Extension (autonomous coding, file ops)
└── README.md      # This file (single source of truth)
```

Each tool is **completely independent** with its own dependencies, development cycle, and deployment process.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBE Ecosystem                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   vibe-cli      │  │   vibe-web      │  │ vibe-code   │  │
│  │  Terminal AI    │  │   Web Platform  │  │ VS Code Ext │  │
│  │   Assistant     │  │                 │  │             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AI Providers & Models                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  OpenRouter (27 models) │ MegaLLM (12 models)      │    │
│  │  AgentRouter (7 models) │ Routeway (6 models)      │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              3-Layer Memory System                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Story Memory │ Chat History │ Workspace Memory    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Matrix

### Basic Features (12/12) ✅
- ✅ CLI startup & interactive prompt
- ✅ Provider selection (OpenRouter, MegaLLM, AgentRouter, Routeway)
- ✅ Model selection per provider
- ✅ Streaming AI responses
- ✅ Simple chat (Q&A)
- ✅ Command parsing (/help, /quit, /model, /provider)
- ✅ File read/write operations
- ✅ Directory creation & listing
- ✅ Shell command execution (safe)
- ✅ Error handling with readable messages
- ✅ Config loading (env, config files)
- ✅ Graceful exit & cleanup

### Medium Features (18/18) ✅
- ✅ Context injection (current files, folders)
- ✅ Multi-file reading
- ✅ Tool execution feedback
- ✅ Memory persistence (chat history)
- ✅ Search past chats
- ✅ Task history tracking
- ✅ Git integration (status, commit, branch)
- ✅ Code analysis commands
- ✅ Refactor commands
- ✅ Test generation commands
- ✅ Documentation generation
- ✅ Performance benchmarking
- ✅ Security scanning
- ✅ Provider fallback
- ✅ Model fallback
- ✅ Timeout handling
- ✅ Rate-limit handling
- ✅ Comprehensive logging

### Advanced Features (10/10) ✅
- ✅ Story memory (long-term project context)
- ✅ Semantic memory search
- ✅ Workspace awareness (recent changes)
- ✅ Batch operations
- ✅ Tool orchestration (multi-step tasks)
- ✅ Dependency tracking
- ✅ Deterministic tool execution
- ✅ Safe rollback on failure
- ✅ Structured tool outputs
- ✅ CI-friendly non-interactive mode

**Total: 40/40 features per tool × 3 tools = 120/120 features (100%)**

---

## 🤖 AI Providers & Models

### 4 AI Providers with 40+ Models

#### OpenRouter (27 models)
- **GPT-4**: gpt-4-turbo, gpt-4o, gpt-4o-mini
- **Claude**: claude-3.5-sonnet, claude-3-haiku
- **Gemini**: gemini-2.0-flash, gemini-1.5-pro
- **DeepSeek**: deepseek-chat, deepseek-coder
- **Other**: GLM-4, Qwen, Mistral, Llama models

#### MegaLLM (12 models)
- **Llama 3.3**: 70B Instruct (128k context)
- **DeepSeek**: R1 Distill, V3.1, Kimi K2
- **MiniMax**: M2 (200k context)
- **GLM**: 4.5/4.6 variants

#### AgentRouter (7 models)
- **Claude**: Haiku 4.5, Sonnet 4.5 (200k context)
- **DeepSeek**: R1, V3.1/V3.2
- **GLM**: 4.5/4.6

#### Routeway (6 models)
- **Kimi K2**: 200k context
- **MiniMax M2**: 200k context
- **GLM 4.6**: 128k context
- **DeepSeek V3**: 64k context

### Intelligent Fallback System
- **Provider Fallback**: Automatic switching between providers
- **Model Fallback**: Alternative models when primary unavailable
- **Key Fallback**: Multiple API keys per provider
- **Zero Downtime**: Always finds working model

---

## 🧠 Memory System Explanation

### Story Memory
Tracks your development journey:
- **Project Goals**: What you're building
- **Milestones**: Key achievements
- **Challenges**: Problems encountered
- **Solutions**: How issues were resolved
- **Learnings**: Insights gained
- **Timeline**: Chronological event tracking

### Chat History
- **100 Messages**: Recent conversation storage
- **Semantic Search**: Find past conversations by content
- **Token Tracking**: Optimize for API costs
- **Context Preservation**: Maintain conversation flow

### Workspace Memory
- **50 Recent Changes**: File modification tracking
- **Dependency Tracking**: Package.json monitoring
- **Git Integration**: Branch, remote, status awareness
- **Project Structure**: Directory layout understanding

**Usage Example:**
```bash
# Session 1: Set goal
"I want to build a REST API"

/memory  # Shows current context

# Session 2 (days later): Context maintained
/analyze src/  # Remembers your API project
```

---

## 🔄 CI/CD & Release Flow

### Independent Release Cycles
Each tool releases independently with semantic versioning:

- **CLI**: `vibe-cli-vX.Y.Z` → NPM publish
- **Web**: `vibe-web-vX.Y.Z` → Vercel deploy
- **Extension**: `vibe-code-vX.Y.Z` → VS Code Marketplace

### Automated Workflows
- **Testing**: 142 tests across unit, integration, e2e, security, performance
- **Building**: TypeScript compilation, packaging, optimization
- **Publishing**: Automated releases to respective platforms
- **Security**: Vulnerability scanning, secret detection

### Quality Gates
- ✅ **All Tests Pass**: 142/142 required
- ✅ **Zero Vulnerabilities**: Security scanning
- ✅ **Build Success**: All platforms compile
- ✅ **Feature Parity**: Identical behavior across tools

---

## 📦 Installation Overview

### CLI Installation
```bash
# Global install
npm install -g vibe-ai-cli

# Local development
git clone https://github.com/mk-knight23/vibe.git
cd vibe/vibe-cli
npm install
npm start
```

### Web Platform
```bash
cd vibe-web
npm install
npm run dev
# Open http://localhost:3000
```

### VS Code Extension
1. Open VS Code
2. Extensions → Search "Vibe VS Code"
3. Click Install
4. Restart VS Code

---

## 📖 Documentation Links

- **CLI Documentation**: [vibe-cli/README.md](./vibe-cli/README.md)
- **Web Platform**: [vibe-web/README.md](./vibe-web/README.md)
- **VS Code Extension**: [vibe-code/README.md](./vibe-code/README.md)

---

## 🔢 Versioning & Upgrade Policy

### Semantic Versioning
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Upgrade Path
- **Automatic Updates**: CLI updates via npm
- **Manual Updates**: Web redeploys, Extension marketplace
- **Backward Compatibility**: All changes maintain compatibility
- **Migration Support**: Clear upgrade guides provided

### Current Versions
- **CLI**: v8.0.2 (36 tools, 142 tests passing)
- **Web**: v2.0.0 (Next.js 16, React 19)
- **Extension**: v4.0.0 (40+ models, autonomous coding)

---

## 🔒 Security & Safety Notes

### Built-in Security Features
- **Dangerous Command Blocking**: Prevents rm -rf /, chmod 777, etc.
- **Sandbox Isolation**: Safe execution environment
- **Secret Detection**: Identifies hardcoded API keys, passwords
- **Memory Limits**: 128MB limit per session
- **Timeout Enforcement**: 60s maximum execution time

### Privacy Protection
- **No Data Retention**: Conversations not stored permanently
- **Local Processing**: AI responses processed client-side where possible
- **API Key Security**: Keys stored securely in VS Code settings
- **No Telemetry**: No usage tracking or analytics

### Safe AI Usage
- **Content Filtering**: Appropriate content guidelines
- **Rate Limiting**: Prevents API abuse
- **Error Handling**: Graceful failure recovery
- **Audit Logging**: Command execution tracking

---

## 🎯 Quick Start

**Use CLI:**
```bash
npm install -g vibe-ai-cli
vibe
"Build a REST API with authentication"
```

**Run Web:**
```bash
cd vibe-web && npm install && npm run dev
# Open http://localhost:3000
```

**Install Extension:**
VS Code → Extensions → Search "Vibe VS Code" → Install

---

## 📈 Performance Metrics

- **Test Coverage**: 142/142 tests passing (100%)
- **Build Time**: <5s compilation across all tools
- **Memory Usage**: <128MB per session
- **API Response**: <1s average
- **Zero Vulnerabilities**: Security scanning clean

---

## 🔗 Links

- **🌐 Website**: https://vibe-ai.vercel.app
- **📦 NPM**: https://www.npmjs.com/package/vibe-ai-cli
- **🏪 VS Code Marketplace**: Search "Vibe VS Code"
- **🐙 GitHub**: https://github.com/mk-knight23/vibe
- **🐛 Issues**: https://github.com/mk-knight23/vibe/issues
- **💬 Discord**: Community support

---

## 📄 License

MIT © VIBE Team

---

**Version:** 8.0.2 | **Status:** Production Ready | **Tests:** 142/142 Passing | **Security:** 0 Vulnerabilities
