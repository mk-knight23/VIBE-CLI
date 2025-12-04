# VIBE-CLI v7.0.0 - Complete Documentation

**Version:** 7.0.0  
**Date:** 2025-12-04  
**Status:** Production Ready  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Commands Reference](#commands-reference)
5. [Agent Mode](#agent-mode)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Quick Start](#quick-start)
9. [API Reference](#api-reference)
10. [Examples](#examples)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)
13. [Best Practices](#best-practices)
14. [Support](#support)
15. [Changelog](#changelog)

---

## Overview

Vibe-CLI v7.0.0 is a next-generation AI development platform with 60+ commands, 42+ tools, multi-file editing, advanced agents, cloud deployment, and DevOps suite.

### Key Features
- **60+ Commands** across 8 categories
- **42+ Tools** for development automation
- **Multi-File Atomic Editing** with rollback
- **Advanced Agent System** with 200+ minute runtime
- **One-Command Cloud Deploy** to 5 providers
- **AI-Powered Debugging** with auto-fix
- **Smart Shell** with auto-correction
- **Team Collaboration** features

### Supported Providers
- OpenRouter (6 models)
- MegaLLM (12 models)
- AgentRouter (7 models)
- Routeway (6 models)

---

## Architecture

### Core Components

#### V7Engine
- Event-driven architecture
- Context management
- Safety engine
- Agent pool management

#### MultiFileEditor
- Atomic transactions
- Automatic rollback
- Backup system
- Conflict detection

#### AdvancedAgent
- 200+ minute runtime
- Sub-agent spawning
- Self-testing loops
- Parallel execution

#### Tool System
- 42+ integrated tools
- File system operations
- Shell execution
- Git automation
- Cloud deployment
- DevOps operations

### Technology Stack
- TypeScript (strict mode)
- Node.js 16+
- Vitest for testing
- Cross-platform support

---

## Core Features

### 1. Multi-File Editing
Atomic editing of multiple files with automatic rollback on failure.

**Features:**
- Transaction-based editing
- Automatic backups
- Rollback on error
- Conflict detection

### 2. Advanced Agent System
Autonomous agents that can execute complex multi-step tasks.

**Capabilities:**
- 200+ minute runtime
- Sub-agent spawning
- Self-testing
- Parallel execution (3 agents)
- Workflow support

### 3. Cloud Deployment
One-command deployment to multiple cloud providers.

**Supported Platforms:**
- Vercel
- AWS
- Firebase
- Supabase
- Netlify

### 4. DevOps Suite
Complete DevOps toolkit integrated into CLI.

**Features:**
- Docker (build, run, compose)
- Kubernetes (apply, scale)
- CI/CD generation
- Monitoring setup

### 5. AI-Powered Debugging
Intelligent debugging with automatic fixes.

**Capabilities:**
- Stack trace analysis
- Auto-fix suggestions
- Log analysis
- Performance profiling

### 6. Smart Shell
Shell execution with AI-powered auto-correction.

**Features:**
- Command validation
- Auto-correction
- Safety checks
- Cross-platform support

---

## Commands Reference

### Core Commands (8)
- `/help` - Display help information
- `/quit` - Exit CLI
- `/model` - Switch AI model
- `/provider` - Switch provider
- `/clear` - Clear conversation
- `/save` - Save session
- `/load` - Load session
- `/config` - Configuration management

### Development Commands (12)
- `/create` - Generate projects
- `/api` - API generation
- `/init` - Initialize project
- `/dev` - Start dev server
- `/pm` - Package manager operations
- `/test` - Test generation
- `/lint` - Code linting
- `/format` - Code formatting
- `/build` - Build project
- `/watch` - Watch mode
- `/serve` - Serve build

### Analysis Commands (8)
- `/analyze` - Code analysis
- `/architecture` - Architecture view
- `/dependencies` - Dependency graph
- `/endpoints` - API endpoints
- `/security` - Security scan
- `/performance` - Performance analysis
- `/complexity` - Complexity metrics
- `/coverage` - Test coverage

### Git Commands (6)
- `/gitops` - Git operations
- `/commit` - Smart commit with AI message
- `/pr` - Generate PR description
- `/review` - Code review
- `/git-stats` - Git statistics
- `/changelog` - Generate changelog

### Cloud & DevOps (10)
- `/cloud` - Cloud deployment
- `/deploy` - Deploy to cloud
- `/ops` - DevOps operations
- `/docker` - Docker operations
- `/k8s` - Kubernetes operations
- `/ci` - CI/CD generation
- `/monitor` - Monitoring setup
- `/logs` - Log analysis
- `/scale` - Scaling operations
- `/rollback` - Rollback deployment

### Debugging (5)
- `/debug` - Debug code
- `/trace` - Stack trace analysis
- `/fix` - Auto-fix errors
- `/profile` - Performance profiling
- `/inspect` - Code inspection

### Workflow & Automation (6)
- `/agent` - Agent mode
- `/workflow` - Workflow execution
- `/batch` - Batch operations
- `/schedule` - Schedule tasks
- `/pipeline` - Pipeline creation
- `/automate` - Automation setup

### Team & Collaboration (5)
- `/team` - Team management
- `/share` - Share workflow
- `/sync` - Sync settings
- `/rules` - Team rules
- `/collab` - Collaboration mode

---

## Agent Mode

### Overview
Agent mode enables autonomous execution of complex multi-step tasks.

### Features
- **200+ minute runtime** - Extended execution time
- **Sub-agent spawning** - Create child agents for parallel work
- **Self-testing** - Automatic validation of results
- **Workflow support** - Execute predefined workflows
- **Parallel execution** - Run up to 3 agents simultaneously

### Usage
```bash
vibe
> /agent "Create a React app with TypeScript and tests"
```

### Agent Capabilities
1. **Code Generation** - Generate complete applications
2. **Testing** - Create and run tests
3. **Deployment** - Deploy to cloud platforms
4. **Debugging** - Find and fix errors
5. **Refactoring** - Improve code quality

### Best Practices
- Provide clear, specific instructions
- Break complex tasks into steps
- Review agent output before applying
- Use workflows for repeated tasks

---

## Testing

### Test Suite Overview
- **295+ Test Cases** across 5 categories
- **100% Pass Rate** in production
- **Automated Testing** with Vitest
- **CI/CD Integration** ready

### Test Categories

#### Unit Tests (200+)
Test individual functions and modules.

**Run:** `npm run test:unit`

#### Integration Tests (50+)
Test component interactions.

**Run:** `npm run test:integration`

#### E2E Tests (20+)
Test complete workflows.

**Run:** `npm run test:e2e`

#### Security Tests (15+)
Test security features and command blocking.

**Run:** `npm run test:security`

#### Performance Tests (10+)
Test performance benchmarks.

**Run:** `npm run test:performance`

### Running Tests

```bash
# All tests
npm run test:all

# Specific suite
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance
npm run test:e2e

# Acceptance tests
npm run test:acceptance

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Performance Benchmarks

| Operation | Threshold | Target |
|-----------|-----------|--------|
| File Create | <100ms | 50ms |
| File Read | <50ms | 20ms |
| File Update | <100ms | 50ms |
| File Delete | <50ms | 20ms |
| Shell Exec | <200ms | 100ms |
| Agent Task | <30s | 15s |

### Security Testing

**Dangerous Commands Blocked:**
- `rm -rf /`
- `chmod 777 /`
- `killall`
- `dd if=/dev/zero`
- `mkfs.ext4`
- Fork bombs

**Sandbox Features:**
- File access limited to project
- Memory limits (128MB)
- Timeout enforcement (60s)
- Network disabled by default

---

## Deployment

### Installation

```bash
# NPM
npm install -g vibe-ai-cli

# Homebrew
brew tap mk-knight23/tap
brew install vibe-ai-cli

# Chocolatey (Windows)
choco install vibe-ai-cli

# Scoop (Windows)
scoop bucket add vibe https://github.com/mk-knight23/scoop-manifest
scoop install vibe-ai-cli
```

### Verify Installation

```bash
# Check version
vibe --version

# Test CLI
vibe --help

# Start interactive mode
vibe
```

### Configuration

```bash
# Set API keys (optional - free keys included)
vibe config set openrouter.apiKey sk-or-...
vibe config set megallm.apiKey sk-mega-...

# Or use environment variables
export OPENROUTER_API_KEY="sk-or-..."
export MEGALLM_API_KEY="sk-mega-..."
```

### Cloud Deployment

#### Vercel
```bash
vibe
> /cloud vercel
```

#### AWS
```bash
vibe
> /cloud aws
```

#### Firebase
```bash
vibe
> /cloud firebase
```

### CI/CD Integration

#### GitHub Actions
```yaml
name: Vibe-CLI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:all
```

### Deployment Checklist
- ✅ All tests passing
- ✅ Security validated
- ✅ Performance benchmarks met
- ✅ Documentation complete
- ✅ API keys configured
- ✅ Cloud provider selected

---

## Quick Start

### 1. Install
```bash
npm install -g vibe-ai-cli
```

### 2. Start CLI
```bash
vibe
```

### 3. Basic Commands
```bash
# Get help
> /help

# Switch model
> /model

# Create project
> /create "React app with TypeScript"

# Analyze code
> /analyze

# Deploy to cloud
> /cloud vercel

# Run agent
> /agent "Build and test the app"
```

### 4. Development Workflow
```bash
# Initialize project
> /init

# Start dev server
> /dev

# Run tests
> /test

# Commit changes
> /commit

# Deploy
> /deploy
```

### 5. Advanced Features
```bash
# Multi-file editing
> Edit these 3 files atomically...

# Agent with sub-tasks
> /agent "Create API, tests, and deploy"

# Workflow execution
> /workflow deploy-production

# Team collaboration
> /team share workflow
```

---

## API Reference

### Tool System

#### File System Tools
- `fs.read` - Read files
- `fs.write` - Write files
- `fs.delete` - Delete files
- `fs.list` - List directory
- `fs.search` - Search files
- `fs.copy` - Copy files
- `fs.move` - Move files
- `fs.watch` - Watch files

#### Shell Tools
- `shell.exec` - Execute command
- `shell.pipe` - Pipe commands
- `shell.env` - Environment variables
- `shell.path` - Path operations
- `shell.process` - Process management

#### Git Tools
- `git.status` - Git status
- `git.commit` - Git commit
- `git.push` - Git push
- `git.pull` - Git pull
- `git.branch` - Branch operations
- `git.merge` - Merge operations

#### Cloud Tools
- `cloud.deploy` - Deploy application
- `cloud.status` - Deployment status
- `cloud.logs` - Cloud logs
- `cloud.env` - Environment config
- `cloud.rollback` - Rollback deployment

---

## Examples

### Example 1: Create React App
```bash
vibe
> /create "React app with TypeScript, Tailwind, and Vitest"
> /test
> /dev
```

### Example 2: API Development
```bash
vibe
> /api "REST API for user management with auth"
> /test generate
> /docker build
```

### Example 3: Code Analysis
```bash
vibe
> /analyze
> /security
> /performance
> /dependencies
```

### Example 4: Git Workflow
```bash
vibe
> /commit
> /pr
> /review
```

### Example 5: Cloud Deployment
```bash
vibe
> /build
> /test:all
> /cloud vercel
```

### Example 6: Agent Automation
```bash
vibe
> /agent "Create a full-stack app with React frontend, Node.js backend, tests, and deploy to Vercel"
```

---

## Troubleshooting

### Common Issues

#### CLI Won't Start
```bash
# Check Node.js version
node --version  # Should be 16+

# Reinstall
npm uninstall -g vibe-ai-cli
npm install -g vibe-ai-cli
```

#### API Key Issues
```bash
# Verify configuration
vibe config list

# Reset configuration
vibe config reset
```

#### Performance Issues
```bash
# Clear cache
vibe config clear-cache

# Check system resources
# Close other applications
```

#### Test Failures
```bash
# Run specific test
npm run test:unit

# Check logs
cat test-reports/latest.md
```

---

## FAQ

### General

**Q: Is Vibe-CLI free?**  
A: Yes, Vibe-CLI is free and open-source. Free API keys are included for all providers.

**Q: What Node.js version is required?**  
A: Node.js 16 or higher is required.

**Q: Does it work offline?**  
A: No, internet connection is required for AI model access.

**Q: Which operating systems are supported?**  
A: macOS, Windows, and Linux are all supported.

### Features

**Q: How many AI models are available?**  
A: 31+ models across 4 providers (OpenRouter, MegaLLM, AgentRouter, Routeway).

**Q: Can I use my own API keys?**  
A: Yes, you can configure custom API keys via `vibe config set`.

**Q: What's the agent runtime limit?**  
A: Agents can run for 200+ minutes with automatic checkpointing.

**Q: Can agents spawn sub-agents?**  
A: Yes, agents can spawn up to 3 parallel sub-agents.

### Development

**Q: Does it support TypeScript?**  
A: Yes, full TypeScript support with strict mode.

**Q: Can I deploy to multiple clouds?**  
A: Yes, supports Vercel, AWS, Firebase, Supabase, and Netlify.

**Q: Are there pre-built templates?**  
A: Yes, templates for React, Node.js, and full-stack apps.

**Q: Does it integrate with Git?**  
A: Yes, full Git integration with AI-generated commit messages.

### Testing

**Q: What testing framework is used?**  
A: Vitest for unit, integration, and E2E tests.

**Q: How many test cases are included?**  
A: 295+ test cases with 100% pass rate.

**Q: Can I run tests in CI/CD?**  
A: Yes, GitHub Actions integration is included.

---

## Best Practices

### 1. Command Usage
- Use `/help` to discover commands
- Provide clear, specific instructions
- Review AI suggestions before applying
- Use workflows for repeated tasks

### 2. Agent Mode
- Break complex tasks into steps
- Monitor agent progress
- Review output before deployment
- Use sub-agents for parallel work

### 3. Security
- Never disable safety checks
- Review dangerous commands
- Use sandbox for untrusted code
- Keep API keys secure

### 4. Performance
- Use batch operations for multiple files
- Enable caching for repeated tasks
- Monitor resource usage
- Optimize workflows
- Use parallel agent execution
- Minimize context switching
- Cache AI responses when possible

### 5. Testing
- Run tests before deployment
- Maintain high coverage (>80%)
- Use acceptance tests for validation
- Automate testing in CI/CD

---

## Support

### Resources
- **GitHub:** https://github.com/mk-knight23/vibe
- **Website:** https://vibe-ai.vercel.app
- **NPM:** https://www.npmjs.com/package/vibe-ai-cli
- **Issues:** https://github.com/mk-knight23/vibe/issues

### Community
- **Discord:** https://discord.gg/vibe-ai
- **Email:** support@vibe-ai.dev

### Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Changelog

### v7.0.0 (2025-12-04)
- ✨ 60+ commands (from 15)
- ✨ 42+ tools (from 12)
- ✨ Multi-file atomic editing
- ✨ Advanced agent system (200+ min runtime)
- ✨ One-command cloud deployment
- ✨ AI-powered debugging with auto-fix
- ✨ Smart shell with auto-correction
- ✨ Team collaboration features
- ✨ Complete DevOps suite
- ✨ 295+ test cases
- ✨ Production-ready build

### v6.0.0 (2024-11)
- Initial v6 release
- 15 commands
- 12 tools
- Basic agent mode

### v5.1.0 (2024-10)
- Multi-provider support
- 27+ AI models
- Auto file creation
- Git automation

---

**Made with ❤️ by the VIBE Team**

*Empowering developers with AI assistance*
