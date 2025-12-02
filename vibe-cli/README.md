# Vibe CLI v4.0 🚀

**AI-Powered Development Assistant with Multi-Provider Support**

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🔥 **Made by KAZI** 🔥

## ✨ What's New in v4.0

- 🌐 **Multi-Provider Support**: 4 AI providers with automatic fallback
- 🤖 **40+ Free Models**: Access to OpenRouter, MegaLLM, AgentRouter, and Routeway
- 🎯 **Smart Fallback**: Automatic provider/model switching on failures
- 📁 **Auto File Creation**: AI responses automatically create files and folders
- 🎨 **Beautiful UI**: Enhanced startup experience with provider selection
- ⚡ **Zero Configuration**: Hardcoded API keys for instant use

## 🚀 Quick Start

### Installation

```bash
npm install -g vibe-ai-cli
```

### Usage

```bash
vibe
```

That's it! Select your provider and model, then start chatting.

## 🎯 Features

### Multi-Provider Architecture

**4 AI Providers with 40+ Models:**

1. **OpenRouter** (6 free models)
   - Grok 4.1 Fast (128k context)
   - GLM 4.5 Air (128k context)
   - DeepSeek Chat V3 (64k context)
   - Qwen3 Coder (32k context)
   - GPT OSS 20B (8k context)
   - Gemini 2.0 Flash (1M context)

2. **MegaLLM** (12 models)
   - Llama 3.3 70B Instruct (128k context)
   - DeepSeek R1 Distill (64k context)
   - Kimi K2 (200k context)
   - DeepSeek V3.1 (64k context)
   - MiniMax M2 (200k context)
   - And 7 more...

3. **AgentRouter** (7 models)
   - Claude Haiku 4.5 (200k context)
   - Claude Sonnet 4.5 (200k context)
   - DeepSeek R1 (64k context)
   - DeepSeek V3.1/V3.2 (64k context)
   - GLM 4.5/4.6 (128k context)

4. **Routeway** (6 free models)
   - Kimi K2 (200k context)
   - MiniMax M2 (200k context)
   - GLM 4.6 (128k context)
   - DeepSeek V3 (64k context)
   - Llama 3.2 3B (8k context)

### Intelligent Fallback System

- **Key Fallback**: Tries multiple API keys per provider
- **Model Fallback**: Switches to alternative models if one fails
- **Provider Fallback**: Automatically tries other providers
- **Zero Downtime**: Always finds a working model

### Auto File Creation

AI responses automatically create files and folders:

```
You: Create a simple HTML page

AI creates:
- index.html
- style.css
- script.js
```

### Interactive Commands

- `/help` - Show available commands
- `/models` - List all models
- `/context` - Show conversation context
- `/history` - View command history
- `/exit` - Quit the application

## 📦 Installation Methods

### NPM (Recommended)
```bash
npm install -g vibe-ai-cli
```

### From Source
```bash
git clone https://github.com/mk-knight23/vibe.git
cd vibe/vibe-cli
npm install
npm run build
npm link
```

## 🎨 Usage Examples

### Basic Chat
```bash
vibe
# Select provider → Select model → Start chatting
```

### Code Generation
```
You: Create a REST API with Express.js

AI: [Creates complete project structure]
- server.js
- routes/
- controllers/
- package.json
```

### Project Setup
```
You: Build a React app with TypeScript

AI: [Creates full React project]
- src/
- public/
- tsconfig.json
- package.json
```

## 🔧 Configuration

### Default Behavior
- No configuration needed
- Hardcoded API keys included
- Automatic provider selection

### Custom API Keys (Optional)
Set environment variables:
```bash
export OPENROUTER_API_KEY="your-key"
export MEGALLM_API_KEY="your-key"
export AGENTROUTER_API_KEY="your-key"
export ROUTEWAY_API_KEY="your-key"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Vibe CLI v4.0 Interface         │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │ Provider Manager│
       └───────┬─────────┘
               │
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
┌───▼───┐  ┌──▼───┐  ┌───▼──┐  ┌───▼────┐
│OpenRtr│  │MegaLM│  │AgntRt│  │Routeway│
└───┬───┘  └──┬───┘  └───┬──┘  └───┬────┘
    │         │          │         │
    └─────────┴──────────┴─────────┘
              │
         [AI Models]
```

## 🛠️ Development

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Local Development
```bash
npm link
vibe
```

## 📊 Model Selection Guide

**For Code Generation:**
- Qwen3 Coder (OpenRouter)
- DeepSeek V3.1 (MegaLLM/AgentRouter)
- Llama 3.3 70B (MegaLLM)

**For Long Context:**
- Gemini 2.0 Flash (1M tokens - OpenRouter)
- Kimi K2 (200k tokens - MegaLLM/Routeway)
- MiniMax M2 (200k tokens - MegaLLM/Routeway)

**For Fast Responses:**
- Grok 4.1 Fast (OpenRouter)
- Claude Haiku 4.5 (AgentRouter)
- GLM 4.5 Air (OpenRouter)

**For Reasoning:**
- DeepSeek R1 (AgentRouter)
- DeepSeek R1 Distill (MegaLLM)

## 🔒 Privacy & Security

- No data retention
- Local-first processing
- API keys stored securely
- No telemetry or tracking

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- OpenRouter for free model access
- MegaLLM for high-quality models
- AgentRouter for Claude access
- Routeway for diverse model selection

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/mk-knight23/vibe/issues)
- Documentation: [Full docs](https://github.com/mk-knight23/vibe)
- Email: support@vibe-cli.ai

## 🗺️ Roadmap

- [ ] Plugin system
- [ ] Custom model integration
- [ ] Team collaboration features
- [ ] Cloud sync
- [ ] VS Code extension integration

---

**Made with 🔥 by KAZI**

*Vibe CLI v4.0 - Your AI-powered development companion*
