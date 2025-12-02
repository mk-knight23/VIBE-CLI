# Vibe VS Code v4.0 🚀

**AI-Powered Development Assistant - Works Independently**

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=mktech.vibe-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🔥 **Made by KAZI** 🔥

## ✨ What's New in v4.0

- 🌐 **4 AI Providers**: OpenRouter, MegaLLM, AgentRouter, Routeway
- 🤖 **40+ Free Models**: Direct API access to diverse AI models
- 🎯 **Smart Fallback**: Automatic provider/model switching
- 📁 **File Operations**: Create, edit, delete files directly
- 🎨 **Enhanced UI**: Beautiful themes and smooth animations
- ⚡ **Zero Config**: Hardcoded API keys for instant use
- 🔒 **Independent**: Works standalone, no CLI required

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Vibe VS Code"
4. Click Install

### Usage

1. Click the Vibe icon in the Activity Bar
2. Select your provider and model
3. Start chatting!

**No additional setup required - works out of the box!**

## 🎯 Features

### Multi-Provider Architecture

**4 AI Providers with 40+ Models:**

#### OpenRouter (6 models)
- Grok 4.1 Fast (128k context)
- GLM 4.5 Air (128k context)
- DeepSeek Chat V3 (64k context)
- Qwen3 Coder (32k context)
- GPT OSS 20B (8k context)
- Gemini 2.0 Flash (1M context)

#### MegaLLM (12 models)
- Llama 3.3 70B Instruct (128k context)
- DeepSeek R1 Distill (64k context)
- Kimi K2 (200k context)
- DeepSeek V3.1 (64k context)
- MiniMax M2 (200k context)
- And 7 more...

#### AgentRouter (7 models)
- Claude Haiku 4.5 (200k context)
- Claude Sonnet 4.5 (200k context)
- DeepSeek R1 (64k context)
- DeepSeek V3.1/V3.2 (64k context)
- GLM 4.5/4.6 (128k context)

#### Routeway (6 models)
- Kimi K2 (200k context)
- MiniMax M2 (200k context)
- GLM 4.6 (128k context)
- DeepSeek V3 (64k context)
- Llama 3.2 3B (8k context)

### Intelligent Fallback System

- **Key Fallback**: Tries multiple API keys per provider
- **Model Fallback**: Switches to alternative models
- **Provider Fallback**: Automatically tries other providers
- **Zero Downtime**: Always finds a working model

### File Operations

Direct file operations:
- Create files and folders
- Delete with confirmation
- Move and copy files
- Apply code patches
- Real-time explorer refresh

### AI Modes

- **Architect**: Planning and design
- **Code**: Writing and refactoring
- **Ask**: Q&A and explanations
- **Debug**: Issue diagnosis
- **Orchestrator**: Task coordination
- **Project Research**: Codebase analysis

### Visual Themes

- Default
- Neon (purple/cyan glow)
- Sunset (orange/yellow)
- Ocean (blue tones)
- Matrix (green terminal style)

## 🎨 Usage Examples

### Code Generation
```
You: Create a REST API with Express.js

AI: [Creates complete project structure]
- server.js
- routes/
- controllers/
- package.json
```

### Code Explanation
```
You: Explain this function

AI: [Provides detailed explanation with examples]
```

### Debugging
```
You: Why is this code throwing an error?

AI: [Analyzes and suggests fixes]
```

## 🔧 Configuration

### Settings

Access via: `File > Preferences > Settings > Vibe`

- **Provider**: Choose from 4 providers
- **Default Model**: Select your preferred model
- **API Keys**: Optional custom keys
- **Auto-Approve**: Enable/disable auto-approval
- **Max Context Files**: Limit context size

### Keyboard Shortcuts

- `Cmd/Ctrl + .`: Next mode
- `Cmd/Ctrl + Shift + .`: Previous mode

### Context Menu

Right-click on selected code:
- Explain Selected Code
- Refactor Selected Code
- Generate Tests for Selection

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Vibe VS Code v4.0               │
│     (Independent Extension)         │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │ Direct API Calls│
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
- API keys stored securely in VS Code settings
- No telemetry or tracking

## 🤝 Contributing

Contributions welcome!

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

## 🗺️ Roadmap

- [ ] Auto file creation from AI responses
- [ ] Plugin system
- [ ] Custom model integration
- [ ] Team collaboration features
- [ ] Cloud sync

---

**Made with 🔥 by KAZI**

*Vibe VS Code v4.0 - Your AI-powered development companion*
