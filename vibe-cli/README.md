# Vibe CLI v5.0.0

**AI-Powered Development Assistant with Multi-Provider Support**

[![Version](https://img.shields.io/badge/version-5.0.0-blue.svg)](https://github.com/mk-knight23/vibe)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)

> Create complete projects, execute commands, and automate development tasks with AI - all from your terminal.

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g @mk-knight23/vibe-ai-cli

# Start interactive mode
vibe

# Create a project instantly
vibe
> create a todo app with HTML, CSS, and JavaScript
```

**That's it!** Vibe will create all files and execute setup commands automatically.

---

## ✨ Key Features

### 🤖 **Multi-Provider AI Support**
- **4 Providers:** OpenRouter, MegaLLM, AgentRouter, Routeway
- **31+ Models:** GPT, Claude, Gemini, DeepSeek, Llama, Qwen, and more
- **Free Tier:** Pre-configured API keys included
- **Easy Switching:** Change providers and models on the fly

### 📁 **Automatic File Creation**
- Extracts files from AI responses automatically
- Creates complete project structures
- Supports 10+ file types (HTML, CSS, JS, JSON, Python, etc.)
- Organizes files in proper folders

### 🔧 **Command Execution**
- Executes bash commands from AI responses
- Safe execution with dangerous command blocking
- Cross-platform support (macOS, Linux, Windows)
- Real-time output display

### 🎯 **Multiple Operations in One Go**
- Create files + run commands in single request
- Sequential execution (files → commands → tools)
- No manual intervention needed
- Complete automation

---

## 📦 Installation

### NPM (Recommended)
```bash
npm install -g @mk-knight23/vibe-ai-cli
```

### Verify Installation
```bash
vibe --version
# Output: 5.0.0
```

---

## 🎮 Usage

### Interactive Mode
```bash
vibe
```

Start chatting with AI to create projects, execute commands, and automate tasks.

### Example Commands

**Create a Website:**
```
You: create a calculator website
AI: [Creates index.html, style.css, script.js]
    [Executes: python -m http.server 8000]
✅ Created 3 file(s)
✅ Executed 1 command(s)
```

**Install Packages:**
```
You: install express and create a server
AI: [Creates server.js]
    [Executes: npm install express]
✅ Created 1 file(s)
✅ Executed 1 command(s)
```

**Multiple Operations:**
```
You: create a React app with routing
AI: [Creates package.json, App.jsx, Router.jsx, etc.]
    [Executes: npm install, npm install react-router-dom]
✅ Created 5 file(s)
✅ Executed 2 command(s)
```

---

## 🎛️ Commands

### Basic Commands
```bash
vibe                 # Start interactive mode
vibe --help          # Show help
vibe --version       # Show version
```

### Interactive Commands
```
/help       - Show available commands
/model      - Change AI model (dropdown)
/provider   - Switch AI provider
/clear      - Clear conversation history
/quit       - Exit CLI
```

---

## 🌐 Providers & Models

### OpenRouter (6 models)
- Grok 4.1 Fast (128k)
- GLM 4.5 Air (128k)
- DeepSeek Chat V3 (64k)
- Qwen3 Coder (32k)
- Gemini 2.0 Flash (1M)

### MegaLLM (12 models) - Default
- Llama 3.3 70B (128k)
- DeepSeek R1 Distill (64k)
- Kimi K2 (200k)
- Qwen3 Next 80B (32k)
- MiniMax M2 (200k)
- GPT OSS 120B (8k)

### AgentRouter (7 models)
- Claude Haiku 4.5 (200k)
- Claude Sonnet 4.5 (200k)
- DeepSeek R1 (64k)
- GLM 4.6 (128k)

### Routeway (6 models)
- Kimi K2 (200k)
- MiniMax M2 (200k)
- DeepSeek V3 (64k)
- Llama 3.2 3B (8k)

---

## 🔧 Configuration

### Optional: Custom API Keys

```bash
# Set via environment variables
export OPENROUTER_API_KEY="sk-or-..."
export MEGALLM_API_KEY="sk-mega-..."
export AGENTROUTER_API_KEY="sk-..."
export ROUTEWAY_API_KEY="sk-..."
```

**Note:** Pre-configured free API keys are included. Custom keys are optional.

---

## 📚 Examples

### 1. Simple Website
```
You: create a portfolio website

Result:
✅ portfolio-app/index.html
✅ portfolio-app/style.css
✅ portfolio-app/script.js
✅ portfolio-app/README.md
```

### 2. Node.js Server
```
You: create an Express API with user routes

Result:
✅ express-api/server.js
✅ express-api/routes/users.js
✅ express-api/package.json
✅ Executed: npm install express
```

### 3. Python Project
```
You: create a Flask app with database

Result:
✅ flask-app/app.py
✅ flask-app/models.py
✅ flask-app/requirements.txt
✅ Executed: pip install -r requirements.txt
```

### 4. React Application
```
You: create a React dashboard with charts

Result:
✅ dashboard-app/package.json
✅ dashboard-app/src/App.jsx
✅ dashboard-app/src/components/Chart.jsx
✅ dashboard-app/src/components/Dashboard.jsx
✅ Executed: npm install
✅ Executed: npm install recharts
```

---

## 🛡️ Safety Features

### Dangerous Command Blocking
Automatically blocks harmful commands:
- `rm -rf /` - System deletion
- `format` - Disk formatting
- `chmod 777` - Permission abuse
- `killall` - Process termination
- And more...

### Path Security
- Prevents path traversal (`../../../`)
- Blocks system file access
- Validates all file paths

---

## 🎯 Use Cases

### Development
- ✅ Create boilerplate projects
- ✅ Generate components and modules
- ✅ Set up development environments
- ✅ Install dependencies automatically

### Learning
- ✅ Explore new frameworks
- ✅ Generate example code
- ✅ Understand project structures
- ✅ Learn best practices

### Automation
- ✅ Automate repetitive tasks
- ✅ Batch file operations
- ✅ Script generation
- ✅ Workflow automation

---

## 📊 Performance

- **File Creation:** ~15ms per file
- **Command Execution:** Real-time
- **AI Response:** 2-5 seconds
- **Memory Usage:** ~70MB

---

## 🔄 How It Works

```
User Input
    ↓
AI Generates Response
    ↓
Parse Files → Create Files
    ↓
Parse Commands → Execute Commands
    ↓
Show Results
```

**Everything happens automatically!**

---

## 🐛 Troubleshooting

### CLI Not Found
```bash
npm install -g @mk-knight23/vibe-ai-cli
```

### Permission Denied
```bash
sudo npm install -g @mk-knight23/vibe-ai-cli
```

### API Errors
- Check internet connection
- Try switching provider: `/provider`
- Try different model: `/model`

---

## 📖 Documentation

Full documentation available in `docs/` folder:
- [Quick Start Guide](docs/QUICK_START.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [File Creation Guide](docs/FILE_CREATION_GUIDE.md)
- [Tool Usage](docs/TOOL_USAGE.md)
- [Cross-Platform Support](docs/CROSS_PLATFORM.md)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 🔗 Links

- **GitHub:** [https://github.com/mk-knight23/vibe](https://github.com/mk-knight23/vibe)
- **NPM:** [https://www.npmjs.com/package/vibe-ai-cli](https://www.npmjs.com/package/vibe-ai-cli)
- **Issues:** [https://github.com/mk-knight23/vibe/issues](https://github.com/mk-knight23/vibe/issues)
- **Website:** [https://vibe-ai.vercel.app](https://vibe-ai.vercel.app)

---

## 🌟 Features Roadmap

- [ ] Plugin system
- [ ] Custom templates
- [ ] Project scaffolding
- [ ] Git integration
- [ ] Cloud deployment
- [ ] Team collaboration

---

## 💡 Tips

1. **Be specific:** "Create a todo app with React and TypeScript"
2. **Multiple tasks:** "Create files and install dependencies"
3. **Use /model:** Try different models for better results
4. **Check output:** Review created files before running

---

## ⚡ Quick Reference

| Command | Description |
|---------|-------------|
| `vibe` | Start CLI |
| `/help` | Show help |
| `/model` | Change model |
| `/provider` | Switch provider |
| `/clear` | Clear history |
| `/quit` | Exit |

---

**Made with ❤️ by the VIBE Team**

*Empowering developers with AI automation*

**Version 5.0.0** | **Node ≥16.0.0** | **MIT License**
