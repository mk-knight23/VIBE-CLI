# VIBE CLI v0.0.1

<p align="center">
  <strong>The Agentic AI Coding Partner for Modern Engineering</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-core-commands">Commands</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-safety--control">Safety</a> •
  <a href="docs/USER-GUIDE.md">User Guide</a>
</p>

---

## What is VIBE?

VIBE CLI v0.0.1 is an **autonomous AI developer tool** that transforms how you build, test, and deploy software. It's a context-aware engine that executes complex engineering tasks with high precision, acting as a true teammate rather than just a chat interface.

**One command. One UI. Professional results.**

```bash
vibe> "scaffold a next.js app with auth and supabase"
vibe> "fix that flaky test in src/utils"
vibe> "refactor this module for better modularity"
vibe> "generate a github action for this project"
```

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/mk-knight23/VIBE-CLI.git
cd VIBE-CLI
npm install

# Build and link
npm run build
npm link
```

### Configuration
Launch VIBE and set up your providers:
```bash
$ vibe
vibe> /config set provider anthropic
vibe> /config set model claude-3-5-sonnet
```

## 🛠 Core Commands (TUI)

VIBE v0.0.1 features a powerful command-driven interface within the interactive shell:

| Command | Category | Description |
|---------|----------|-------------|
| `/scaffold` | **Web & UI** | AI-driven project scaffolding |
| `/test` | **Quality** | Intelligent unit test & mock generation |
| `/debug` | **Debug** | Deep AI error analysis & diagnosis |
| `/fix` | **Debug** | Autonomous bug fixing & remediation |
| `/refactor`| **Code** | Propose & apply high-level refactors |
| `/cicd` | **DevOps** | Generate tailored CI/CD workflows |
| `/iac` | **Cloud** | Generate Infrastructure-as-Code |
| `/viz` | **Analysis** | Interactive architecture visualization |
| `/mood` | **Insights** | Scan project health and developer "vibe" |

## 🎯 Features

VIBE implements a full suite of **120 professional features** across several categories:

### 1. Intelligence & Productivity
- **Asynchronous Command Generation**: Non-blocking command suggestions.
- **AI Fallback System**: Intelligent provider selection and fallback.
- **Vibe Doctor**: Self-healing environment diagnostics and automated fixes.
- **History-Aware Context**: Learns from your previous commands and decisions.

### 2. Web & UI Generation
- **Stack Scaffolder**: Template-based and AI-driven custom project creation.
- **Project Visualizer**: ASCII trees, dependency mapping, and architectural advice.
- **Live Preview Management**: Integrated dev server control.

### 3. Debugging & Testing
- **Deep Error Analysis**: AI-powered stack trace diagnosis (/debug).
- **Automated Remediation**: One-command bug fixing (/fix).
- **Pattern Refactoring**: Identification and application of modularity patterns.

### 4. Cloud & DevOps
- **AI CI/CD**: Custom GitHub Actions and GitLab CI generation.
- **AI IaC**: Terraform and CloudFormation generation.
- **Deployment Advisor**: Optimal target suggestions and best practices.

## 🏗 Architecture

VIBE is built on **8 hardened core primitives**:

- **COMPLETION**: Universal LLM interface with multi-provider routing.
- **PLANNING**: Deterministic task decomposition via the `PlannerAgent`.
- **MULTI-EDIT**: Atomic, safe changes across multiple files.
- **EXECUTION**: Secure shell & script execution with status tracking.
- **SEARCH**: Context-aware codebase & web searching.
- **MEMORY**: Persistence of session decisions and architectural patterns.
- **APPROVAL**: Risk-based human-in-the-loop safety gates.
- **DETERMINISM**: Instant checkpoints and rollbacks (/undo).

## 🛡 Safety & Control

VIBE is designed to be **safe-by-default**:
- **Approvals**: Dangerous operations (file deletion, system commands) always require confirmation.
- **Checkpoints**: Automatic state snapshots before major changes.
- **Sandbox**: Optional isolated execution for untrusted commands.
- **Audit Logs**: Full traceability of all agent actions via `/logs`.

## 🔧 Configuration

Configure VIBE via the `/config` command or `.vibe/config.json`. Supports OpenAI, Anthropic, Google, and Local (Ollama) providers.

---

<p align="center">
  Built with ❤️ for AI-native developers
</p>
