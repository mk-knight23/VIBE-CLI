# Vibe CLI v7.0.1

**Next-Gen AI Development Platform - 60+ Commands, 42+ Tools, Multi-File Editing, Advanced Agents**

[![Version](https://img.shields.io/badge/version-7.0.1-blue.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![NPM](https://img.shields.io/npm/v/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)

> Production-ready AI development platform with autonomous agents, cloud deployment, DevOps automation, and multi-file editing capabilities.

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g vibe-ai-cli

# Or use without installing
npx vibe-ai-cli

# Start interactive mode
vibe

# Use specific commands
vibe agent          # Start autonomous agent
vibe deploy aws     # Deploy to AWS
vibe docker build   # Build Docker container
```

---

## ✨ What's New in v7.0.0

### 🤖 **Advanced Autonomous Agents**
- Self-directed task execution
- Multi-step workflow automation
- Context-aware decision making
- Error recovery and retry logic

### 📝 **Multi-File Editing**
- Edit multiple files simultaneously
- Batch operations across projects
- Smart conflict resolution
- Atomic transactions

### ☁️ **Cloud Deployment**
- **AWS:** Lambda, EC2, S3, CloudFormation
- **Vercel:** One-command deployment
- **Firebase:** Hosting, Functions, Firestore
- **Docker:** Build, push, deploy

### 🔧 **DevOps Suite**
- Docker & Kubernetes automation
- CI/CD pipeline generation
- Infrastructure as Code
- Monitoring & logging setup

### 🧪 **Enhanced Testing**
- Unit test generation
- Integration test scaffolding
- E2E test automation
- Performance benchmarking

---

## 🎯 Core Features

### 🤖 **Multi-Provider AI (4 Providers, 27+ Models)**
- **OpenRouter:** 40+ free models (GPT-4o-mini, Gemini 2.0 Flash, Claude)
- **MegaLLM:** Primary provider with Qwen3-Next-80B
- **AgentRouter:** Claude models with routing
- **Routeway:** Fallback provider
- **Free API Access:** Pre-configured keys included

### 📦 **60+ Commands**
```bash
# AI & Chat
vibe chat           # Interactive chat
vibe agent          # Autonomous agent mode
vibe ask            # Quick questions

# Code Generation
vibe generate       # Generate code
vibe refactor       # Refactor code
vibe test           # Generate tests
vibe debug          # Debug assistance

# Project Management
vibe init           # Initialize project
vibe scaffold       # Create from template
vibe analyze        # Analyze codebase

# Cloud & DevOps
vibe deploy         # Deploy to cloud
vibe docker         # Docker operations
vibe k8s            # Kubernetes management
vibe ci             # CI/CD setup

# Git Automation
vibe commit         # Smart commits
vibe pr             # Create pull requests
vibe review         # Code review

# Development Tools
vibe dev            # Dev server
vibe build          # Build project
vibe lint           # Lint code
vibe format         # Format code

# And 40+ more...
```

### 🛠️ **42+ Tools**
- **Filesystem:** Create, read, update, delete files
- **Shell:** Execute commands safely
- **Sandbox:** Isolated code execution
- **Web:** HTTP requests, scraping
- **Memory:** Context management
- **Git:** Version control automation
- **Package Manager:** npm, yarn, pnpm support
- **Database:** Query and migration tools
- **API:** REST and GraphQL clients

### 📁 **Smart File Operations**
- Automatic file extraction from AI responses
- Support for 20+ file types
- Intelligent folder organization
- Conflict detection and resolution
- Backup and rollback capabilities

### 🔐 **Security Features**
- Dangerous command blocking
- Sandbox execution environment
- API key encryption
- Audit logging
- Permission management

---

## 📖 Usage Examples

### Create a Full-Stack App
```bash
vibe
> create a todo app with React frontend and Node.js backend
```

### Deploy to AWS
```bash
vibe deploy aws --service lambda --region us-east-1
```

### Start Autonomous Agent
```bash
vibe agent
> Build a REST API with authentication, deploy to Vercel, and set up CI/CD
```

### Multi-File Refactoring
```bash
vibe refactor --pattern "*.ts" --task "Convert to async/await"
```

### Docker Workflow
```bash
vibe docker build --tag myapp:latest
vibe docker push
vibe docker deploy --platform kubernetes
```

---

## 🔧 Configuration

### Set API Keys (Optional - Free keys included)
```bash
vibe config set openrouter YOUR_KEY
vibe config set megallm YOUR_KEY
vibe config set agentrouter YOUR_KEY
vibe config set routeway YOUR_KEY
```

### Switch Providers
```bash
vibe config provider openrouter
vibe config model gpt-4o-mini
```

### Configure Defaults
```bash
vibe config set auto-approve false
vibe config set max-files 50
vibe config set sandbox-timeout 30000
```

---

## 🏗️ Architecture

```
vibe-cli/
├── src/
│   ├── ai/              # AI agents & routing
│   ├── commands/        # 60+ CLI commands
│   ├── tools/           # 42+ tools
│   ├── core/            # Engine & orchestration
│   ├── cloud/           # Cloud deployment
│   ├── ops/             # DevOps automation
│   ├── project/         # Templates & scaffolding
│   ├── analysis/        # Code analysis
│   ├── git/             # Git operations
│   ├── debug/           # Debugging tools
│   └── providers/       # AI provider integrations
├── dist/                # Compiled output
├── tests/               # Test suite
└── docs/                # Documentation
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance

# Run with coverage
npm run test:coverage
```

---

## 📚 Documentation

- **Complete Guide:** [docs/COMPLETE_DOCUMENTATION.md](./docs/COMPLETE_DOCUMENTATION.md)
- **Step-by-Step:** [docs/STEP_BY_STEP_GUIDE.md](./docs/STEP_BY_STEP_GUIDE.md)
- **GitHub:** https://github.com/mk-knight23/vibe
- **Issues:** https://github.com/mk-knight23/vibe/issues

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

```bash
# Clone repository
git clone https://github.com/mk-knight23/vibe.git
cd vibe/vibe-cli

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start development
npm run dev
```

---

## 📄 License

MIT © VIBE Team

---

## 🔗 Links

- **NPM:** https://www.npmjs.com/package/vibe-ai-cli
- **GitHub:** https://github.com/mk-knight23/vibe
- **Website:** https://vibe-ai.vercel.app
- **Issues:** https://github.com/mk-knight23/vibe/issues

---

## 🌟 Support

If you find Vibe CLI useful, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📖 Improve documentation
- 🤝 Contribute code

---

**Built with ❤️ by the VIBE Team**
