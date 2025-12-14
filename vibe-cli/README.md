# VIBE CLI - Terminal AI Assistant

**Version 8.0.2** | **36 Tools** | **14 Categories** | **3-Layer Memory** | **8 Advanced AI Tools**

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-142%20passing-success)](https://github.com/mk-knight23/vibe)

## 🎯 CLI Purpose

VIBE CLI is a **terminal-based AI development assistant** that brings the power of AI directly to your command line. It provides intelligent coding assistance, project automation, and development tools with revolutionary memory capabilities.

**Key Capabilities:**
- 🤖 **AI-Powered Development**: Direct integration with 4 providers and 40+ models
- 🧠 **3-Layer Memory System**: Maintains context across sessions
- 🛠️ **36 Development Tools**: Comprehensive automation suite
- ⚡ **Production Ready**: 142/142 tests passing, zero vulnerabilities
- 🔒 **Secure**: Dangerous command blocking, sandbox isolation

---

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g vibe-ai-cli
```

### Local Installation
```bash
npm install vibe-ai-cli
npx vibe
```

### Upgrade
```bash
npm update -g vibe-ai-cli
```

---

## 🚀 Quick Start

```bash
# Start the CLI
vibe

# Begin chatting with AI
"Build a REST API with authentication"

# Use advanced tools
/analyze src/app.js
/test src/app.js vitest
/security
```

---

## 📖 Commands & Flags

### Core Commands
```bash
vibe                    # Start interactive mode
vibe --help            # Show help
vibe --version         # Show version
vibe --model <name>    # Set default model
vibe --provider <name> # Set default provider
```

### Interactive Commands
```bash
/help              # Show all commands
/model <name>      # Switch AI model
/provider <name>   # Switch AI provider
/memory            # View memory context
/clear             # Clear conversation
/quit              # Exit CLI
```

### Advanced AI Tools
```bash
/analyze <file>           # Code quality analysis
/refactor <file> <type>   # Smart refactoring
/test <file> [framework]  # Generate tests (vitest/jest/mocha)
/optimize                 # Bundle optimization
/security                 # Security scan
/benchmark <file>         # Performance benchmark
/docs <file>              # Generate documentation
/migrate <file> <from> <to> # Code migration
```

### Memory Commands
```bash
/memory                   # View all memory layers
/memory search <query>    # Search chat history
/memory clear             # Clear all memory
```

---

## 🛠️ Tools List

### 36 Tools Across 14 Categories

#### Filesystem (14 tools)
- `read_file`, `write_file`, `delete_file`, `copy_file`, `move_file`
- `create_directory`, `list_directory`, `search_files`
- `get_file_info`, `read_multiple_files`, `glob_search`
- `append_to_file`, `replace_in_file`, `batch_operations`

#### Shell (1 tool)
- `run_shell_command` - Execute safe shell commands

#### Web (2 tools)
- `web_fetch` - HTTP requests
- `web_search` - Web search queries

#### Memory (3 tools)
- `get_memory_context` - View current memory state
- `search_chat_history` - Semantic search past conversations
- `clear_memory` - Reset memory

#### Git (4 tools)
- `git_commit` - Smart commit with AI-generated messages
- `git_push`, `git_pull` - Repository sync
- `git_branch` - Branch management

#### Project (1 tool)
- `create_project` - Scaffold new projects

#### Analysis (1 tool)
- `analyze_code_quality` - Complexity, duplicates, metrics

#### Refactor (1 tool)
- `smart_refactor` - Extract, inline, improve structure

#### Testing (1 tool)
- `generate_tests` - Auto-generate test suites

#### Optimization (1 tool)
- `optimize_bundle` - Find large files, unused dependencies

#### Security (1 tool)
- `security_scan` - Detect secrets, vulnerabilities

#### Performance (1 tool)
- `performance_benchmark` - Measure execution times

#### Documentation (1 tool)
- `generate_documentation` - Create markdown docs from code

#### Migration (1 tool)
- `migrate_code` - CommonJS→ESM, JavaScript→TypeScript

---

## 🧠 Memory Behavior

### Story Memory
Tracks your development journey:
- **Project Goals**: What you're building
- **Milestones**: Key achievements
- **Challenges**: Problems encountered and solutions
- **Learnings**: Insights gained from experience
- **Timeline**: Chronological project events

### Chat History
- **100 Messages**: Recent conversation storage
- **Semantic Search**: Find past conversations by content
- **Token Tracking**: Optimize API usage
- **Context Preservation**: Maintain conversation flow

### Workspace Memory
- **50 Recent Changes**: File modification tracking
- **Dependency Monitoring**: Package.json changes
- **Git Awareness**: Branch, remote, status tracking
- **Project Structure**: Directory layout understanding

**Usage Example:**
```bash
# Session 1: Set context
"I want to build a microservices platform"
/create node api-gateway

# Session 2 (days later): Context maintained
/analyze src/  # Remembers your microservices goal
/test src/gateway.js
```

---

## 🤖 Providers & Models

### 4 AI Providers with 40+ Models

#### OpenRouter (27+ models)
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
- **Model Fallback**: Alternative models when unavailable
- **Key Fallback**: Multiple API keys per provider
- **Zero Downtime**: Always finds working configuration

---

## 💡 Usage Examples

### Code Quality Workflow
```bash
# Analyze codebase
/analyze src/app.js

# Smart refactoring
/refactor src/app.js extract

# Generate tests
/test src/app.js vitest

# Create documentation
/docs src/app.js

# Security scan
/security
```

### Migration Workflow
```bash
# Migrate CommonJS to ESM
/migrate old.js commonjs esm

# Convert JavaScript to TypeScript
/migrate old.js javascript typescript

# Test the migrated code
/test old.ts vitest

# Generate new documentation
/docs old.ts
```

### Long-term Project Development
```bash
# Session 1: Project initialization
"Build a full-stack e-commerce platform"
/create react frontend
/create node backend

# Session 2 (next day): Continued development
/analyze src/  # AI remembers e-commerce context
/test src/components/ProductCard.jsx
/security

# Session 3 (week later): Maintenance
/optimize  # Bundle optimization
/benchmark src/  # Performance check
```

---

## 🤖 Non-Interactive / CI Mode

### Environment Variables
```bash
# Set defaults for CI
VIBE_PROVIDER=openrouter
VIBE_MODEL=gpt-4o
VIBE_API_KEY=your_key_here
```

### Programmatic Usage
```bash
# Run analysis in CI
echo "/analyze src/" | vibe

# Generate tests
echo "/test src/main.js vitest" | vibe

# Security scan
echo "/security" | vibe
```

### Docker Usage
```dockerfile
FROM node:18-alpine
RUN npm install -g vibe-ai-cli
COPY . /app
WORKDIR /app
RUN echo "/security" | vibe
```

---

## 🔧 Troubleshooting

### Common Issues

**Memory Full Error**
```bash
/memory clear
# Or increase limits (not recommended for production)
```

**Slow Performance**
```bash
# Check system resources
/benchmark <file>

/# Optimize bundle
/optimize
```

**Security Warnings**
```bash
# Run security scan
/security

# Check for secrets
/security scan-secrets
```

**API Connection Issues**
```bash
# Switch provider
/provider megallm

# Try different model
/model llama-3.3-70b
```

**Command Not Found**
```bash
# Reinstall CLI
npm uninstall -g vibe-ai-cli
npm install -g vibe-ai-cli
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=vibe:* vibe

# Check version
vibe --version

# Validate installation
npm list -g vibe-ai-cli
```

---

## 📊 Performance & Limits

### Performance Metrics
- **File Operations**: <100ms
- **Batch Operations**: <500ms
- **Memory Usage**: <128MB per session
- **Tool Execution**: <1s average
- **API Response**: <2s average

### System Limits
- **Chat History**: 100 messages
- **Task History**: 20 tasks
- **Recent Changes**: 50 files
- **Memory Limit**: 128MB
- **Timeout**: 60s per operation
- **File Size**: No limit (streaming)

---

## 🔒 Security Features

### Built-in Protections
- **Dangerous Command Blocking**: Prevents `rm -rf /`, `chmod 777`, etc.
- **Sandbox Isolation**: Safe command execution
- **Secret Detection**: Identifies hardcoded API keys, passwords
- **Memory Limits**: Prevents resource exhaustion
- **Timeout Enforcement**: Prevents hanging operations

### Security Scanning
```bash
/security              # Full security audit
/security scan-secrets # Check for exposed secrets
/security scan-deps    # Check dependencies
```

---

## 🧪 Testing & Quality

### Test Suite (142/142 Passing)
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests (45)
npm run test:integration   # Integration tests (23)
npm run test:e2e           # E2E tests (14)
npm run test:security      # Security tests (15)
npm run test:performance   # Performance tests (6)
```

### Quality Metrics
- **Test Coverage**: 100% critical paths
- **Zero Vulnerabilities**: Security scanning clean
- **TypeScript Strict**: Full type safety
- **ESLint Clean**: Code quality standards

---

## 🛠️ Development

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/mk-knight23/vibe.git
cd vibe/vibe-cli

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Project Structure
```
vibe-cli/
├── src/
│   ├── cli/           # CLI interface
│   ├── commands/      # Command handlers
│   ├── core/          # Core functionality
│   │   └── memory.ts  # 3-layer memory system
│   ├── providers/     # AI providers
│   ├── tools/         # Tool implementations
│   └── utils/         # Utilities
├── tests/             # Test suites (142 tests)
└── docs/              # Documentation
```

---

## 📚 Documentation

- **Root README**: [../README.md](../README.md) - Ecosystem overview
- **Web Platform**: [../vibe-web/README.md](../vibe-web/README.md)
- **VS Code Extension**: [../vibe-code/README.md](../vibe-code/README.md)

---

## 🔄 Migration Guide

### From v7.0.7 to v8.0.0
v8.0.0 is **fully backward compatible** with no breaking changes.

**New Features to Adopt:**
1. Set project goals for enhanced context
2. Use `/memory search` to find past conversations
3. Try advanced AI tools (`/analyze`, `/security`, `/optimize`)
4. Leverage story memory for long-term projects

### Configuration Migration
```bash
# Old config (still works)
vibe --model gpt-4

# New config (recommended)
vibe --provider openrouter --model gpt-4o
```

---

## 📄 License

MIT © VIBE Team

---

## 🔗 Links

- **GitHub**: https://github.com/mk-knight23/vibe
- **NPM**: https://www.npmjs.com/package/vibe-ai-cli
- **Issues**: https://github.com/mk-knight23/vibe/issues
- **Ecosystem**: https://github.com/mk-knight23/vibe#readme

---

**Version:** 8.0.2 | **Status:** Production Ready | **Tests:** 142/142 Passing
