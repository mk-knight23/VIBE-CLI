# VIBE v2.0 - Multi-Provider AI Development Platform

**Version: 2.0.0** | **Status: Production Ready** | **License: MIT**

A comprehensive AI-powered development ecosystem with **free API access** across 4 providers and 27+ models. No API keys needed - start coding with AI instantly!

## 🚀 Three Integrated Tools

### 1. **Vibe CLI v4.0** - Terminal AI Assistant
Advanced command-line tool with multi-provider support and autonomous capabilities.

**Key Features:**
- 🌐 **4 AI Providers**: OpenRouter, MegaLLM, AgentRouter, Routeway
- 🤖 **27+ Models**: From GPT-4o Mini to Gemini 2.0 Flash
- 💬 **Interactive Chat**: Natural language conversations
- 📁 **Auto File Creation**: AI generates and saves files automatically
- 🔧 **Code Generation**: Create entire projects from descriptions
- 🐛 **Smart Debugging**: Error analysis and fixes
- ✅ **Test Generation**: Automated test suite creation
- 🔄 **Git Automation**: Smart commits and code reviews
- 🎯 **Agent Mode**: Autonomous multi-step task execution

**Installation:**
```bash
# NPM (Recommended)
npm install -g vibe-ai-cli

# Homebrew (macOS/Linux)
brew tap mk-knight23/tap
brew install vibe-ai-cli

# Chocolatey (Windows)
choco install vibe-ai-cli

# Scoop (Windows)
scoop bucket add vibe https://github.com/mk-knight23/scoop-manifest
scoop install vibe-ai-cli
```

**Quick Start:**
```bash
# Start chatting (no API key needed!)
vibe chat "Hello! Help me build a REST API"

# Generate code
vibe generate "Create a React todo app with TypeScript"

# Debug code
vibe debug error.log

# Generate tests
vibe test generate src/utils.ts

# Git automation
vibe git commit
```

---

### 2. **Vibe Web v2.0** - Interactive Documentation Platform
Modern Next.js 16 web platform with live chat interface and comprehensive guides.

**Key Features:**
- 💬 **Live Chat Interface**: Test all 4 providers directly in browser
- 🎨 **Beautiful UI**: Responsive design with dark mode
- 📚 **Complete Documentation**: Installation, usage, and examples
- 🔄 **Real-time Model Switching**: Try different AI models instantly
- 🆓 **Free Access**: Pre-configured API keys included

**Tech Stack:**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
- Framer Motion

**Local Development:**
```bash
cd vibe-web
npm install
npm run dev
# Visit http://localhost:3000
```

**Live Demo:** [https://vibe-ai.vercel.app](https://vibe-ai.vercel.app)

---

### 3. **Vibe Code v4.0** - VS Code Extension
Feature-rich VS Code extension with multi-provider AI integration.

**Key Features:**
- 🤖 **6 AI Modes**: Code, Architect, Debug, Test, Review, Explain
- 🌐 **Multi-Provider**: OpenRouter + MegaLLM support
- 📁 **Direct File Operations**: Create/edit files from chat
- 💬 **In-Editor Chat**: AI assistance without leaving VS Code
- 🎨 **5 Visual Themes**: Customize your experience
- 📋 **Copy Messages**: Easy code snippet extraction
- 🗑️ **Clear Chat**: Fresh start anytime
- ⌨️ **Keyboard Shortcuts**: Quick mode switching

**Installation:**
1. Open VS Code
2. Search for "Vibe VS Code" in Extensions
3. Click Install
4. Start chatting with `Ctrl+Shift+P` → "Vibe: Open Chat"

**Keyboard Shortcuts:**
- `Cmd/Ctrl + .` - Next mode
- `Cmd/Ctrl + Shift + .` - Previous mode

---

## 🌐 Multi-Provider Architecture

### Supported Providers (All Free!)

| Provider | Models | Max Context | Specialty |
|----------|--------|-------------|-----------|
| **OpenRouter** | 6 | 1M tokens | General purpose, fast responses |
| **MegaLLM** | 12 | 200k tokens | Large model selection |
| **AgentRouter** | 7 | 200k tokens | Claude & DeepSeek models |
| **Routeway** | 6 | 200k tokens | Balanced performance |

### Featured Models

**OpenRouter:**
- Grok 4.1 Fast (128k)
- GLM 4.5 Air (128k)
- DeepSeek Chat V3 (64k)
- Qwen3 Coder (32k)
- Gemini 2.0 Flash (1M)

**MegaLLM:**
- Llama 3.3 70B Instruct (128k)
- DeepSeek R1 Distill (64k)
- Kimi K2 (200k)
- Claude Haiku 3.5 (200k)
- GPT-4o Mini (128k)
- Gemini Flash (1M)

**AgentRouter:**
- Claude Haiku 4.5 (200k)
- Claude Sonnet 4.5 (200k)
- DeepSeek R1 (64k)
- GLM 4.6 (128k)

**Routeway:**
- Kimi K2 (200k)
- MiniMax M2 (200k)
- DeepSeek V3 (64k)
- Llama 3.2 3B (8k)

---

## 📦 Repository Structure

```
vibe/
├── vibe-cli/          # Terminal assistant (v4.0)
│   ├── bin/           # CLI entry point
│   ├── core/          # API & model management
│   ├── agent/         # Autonomous agent system
│   ├── code/          # Code generation
│   ├── edit/          # Multi-file editing
│   ├── git/           # Git automation
│   ├── refactor/      # Code refactoring
│   ├── debug/         # Debugging tools
│   └── test/          # Test generation
│
├── vibe-web/          # Web platform (v2.0)
│   ├── src/
│   │   ├── app/       # Next.js App Router
│   │   │   ├── chat/  # Live chat interface
│   │   │   ├── api/   # API routes
│   │   │   ├── cli/   # CLI docs
│   │   │   └── vscode/# Extension docs
│   │   └── components/# React components
│   └── public/        # Static assets
│
└── vibe-code/         # VS Code extension (v4.0)
    ├── src/
    │   ├── extension.ts    # Main extension
    │   └── webview/        # Chat UI
    └── media/              # Assets
```

---

## 🎯 Quick Start Guide

### 1. Install CLI
```bash
npm install -g vibe-ai-cli
```

### 2. Start Chatting
```bash
vibe chat "Create a Node.js Express server"
```

### 3. Try Web Interface
Visit [https://vibe-ai.vercel.app/chat](https://vibe-ai.vercel.app/chat)

### 4. Install VS Code Extension
Search "Vibe VS Code" in VS Code Extensions

---

## 🔧 Configuration

### CLI Configuration
```bash
# Optional: Set custom API keys
vibe config set openrouter.apiKey sk-or-...
vibe config set megallm.apiKey sk-mega-...

# Or use environment variables
export OPENROUTER_API_KEY="sk-or-..."
export MEGALLM_API_KEY="sk-mega-..."
```

### VS Code Settings
```json
{
  "vibe.openrouterApiKey": "sk-or-...",
  "vibe.megallmApiKey": "sk-mega-...",
  "vibe.defaultModel": "z-ai/glm-4.5-air:free",
  "vibe.autoApproveUnsafeOps": false
}
```

---

## 📊 Version History

### v2.0.0 (Current) - December 2024
- ✨ Multi-provider architecture (4 providers, 27+ models)
- 🆓 Free API access included
- 💬 Live web chat interface
- 🎨 Enhanced VS Code extension with 6 modes
- 📱 Fully responsive design
- 🔄 Real-time model switching
- 🎯 Improved agent mode
- 📁 Auto file creation from AI responses

### v1.0.0 - November 2024
- Initial release
- Single provider support
- Basic CLI functionality
- Simple VS Code extension

---

## 🛠️ Development

### Build All Packages
```bash
# CLI
cd vibe-cli && npm run build

# Web
cd vibe-web && npm run build

# Extension
cd vibe-code && npm run compile
```

### Run Tests
```bash
# CLI
cd vibe-cli && npm test

# Web
cd vibe-web && npm run test

# Extension
cd vibe-code && npm test
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention
```
vibe-cli: description
vibe-web: description
vibe-code: description
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🔗 Links

- **GitHub**: [https://github.com/mk-knight23/vibe](https://github.com/mk-knight23/vibe)
- **Website**: [https://vibe-ai.vercel.app](https://vibe-ai.vercel.app)
- **NPM Package**: [https://www.npmjs.com/package/vibe-ai-cli](https://www.npmjs.com/package/vibe-ai-cli)
- **VS Code Extension**: Search "Vibe VS Code" in marketplace
- **Issues**: [https://github.com/mk-knight23/vibe/issues](https://github.com/mk-knight23/vibe/issues)

---

## 💡 Support

- 📧 Email: support@vibe-ai.dev
- 💬 Discord: [Join our community](https://discord.gg/vibe-ai)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/mk-knight23/vibe/issues)
- 📖 Documentation: [https://vibe-ai.vercel.app/docs](https://vibe-ai.vercel.app/docs)

---

## 🌟 Features Comparison

| Feature | CLI | Web | VS Code |
|---------|-----|-----|---------|
| Multi-Provider | ✅ | ✅ | ✅ |
| Free API Access | ✅ | ✅ | ✅ |
| Code Generation | ✅ | ❌ | ✅ |
| File Operations | ✅ | ❌ | ✅ |
| Git Integration | ✅ | ❌ | ❌ |
| Agent Mode | ✅ | ❌ | ❌ |
| Live Chat | ✅ | ✅ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ |
| Keyboard Shortcuts | ✅ | ❌ | ✅ |

---

**Made with ❤️ by the VIBE Team**

*Empowering developers with free AI assistance*
