# Vibe CLI - Interactive AI Coding Assistant

[![npm version](https://img.shields.io/npm/v/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License](https://img.shields.io/npm/l/vibe-ai-cli.svg)](LICENSE)
[![Downloads](https://img.shields.io/npm/dm/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![Homebrew](https://img.shields.io/badge/homebrew-2.1.7-orange)](https://github.com/mk-knight23/homebrew-tap)
[![Chocolatey](https://img.shields.io/badge/chocolatey-2.1.7-purple)](https://chocolatey.org/packages/vibe-ai-cli)
[![Scoop](https://img.shields.io/badge/scoop-2.1.7-blue)](https://github.com/mk-knight23/scoop-manifest)

🤖 **Free, privacy-first AI coding assistant for the terminal** with enhanced interactive features. Advanced chat, code generation, refactoring, debugging, test authoring, git automation, and autonomous agent workflows powered by OpenRouter's free models.

## ✨ What's New in v2.1.7

### 🚀 Multi-Platform Installation Support
- 🍺 **Homebrew Support**: Install on macOS/Linux with `brew install vibe-ai-cli`
- 🟪 **Chocolatey Support**: Install on Windows with `choco install vibe-ai-cli`
- 🌊 **Scoop Support**: Install on Windows with `scoop install vibe-ai-cli`
- 📦 **Direct Binary Downloads**: Pre-built binaries for Linux, macOS, and Windows available on GitHub
- 🏷️ **Enhanced Documentation**: Installation badges and comprehensive install guides

### 🌟 Interactive Enhancements
- 🔄 **Visual Feedback**: Spinner animations for all long-running operations (model fetching, code generation, file operations, AI responses)
- 📁 **Visual File Browser**: Interactive file tree display showing project structure with icons and hierarchy
- 📜 **Command History**: Track up to 50 recent commands with `/history` command to view them
- 🎯 **Enhanced Prompts**: Command suggestions, confirmations for destructive operations, and improved feedback
- 🛡️ **Safety Prompts**: Confirmation dialogs for file overwrite, move, and delete operations
- 🎨 **Better Visual Design**: Improved color coding, success/failure indicators, and context information
- 💬 **Interactive Session Management**: Better export functionality and context tracking

### 🔧 Core Improvements (v2.1.0+)
- 🚀 **Enhanced Agent Mode**: Autonomous multi-step task execution with checkpoints
- 🔧 **Improved Code Generation**: Multi-file project creation with better context awareness
- 🛡️ **Enhanced Security**: Advanced filtering and privacy protections
- ⚡ **Performance Boost**: Reduced memory usage and faster response times
- 🎯 **Smart Model Selection**: Task-aware model routing for optimal results
- 📊 **Better Error Handling**: Improved debugging and recovery mechanisms

### 🔧 Core Improvements (v2.1.0+)
- 🚀 **Enhanced Agent Mode**: Autonomous multi-step task execution with checkpoints
- 🔧 **Improved Code Generation**: Multi-file project creation with better context awareness
- 🛡️ **Enhanced Security**: Advanced filtering and privacy protections
- ⚡ **Performance Boost**: Reduced memory usage and faster response times
- 🎯 **Smart Model Selection**: Task-aware model routing for optimal results
- 📊 **Better Error Handling**: Improved debugging and recovery mechanisms

## 1. Installation

### Multiple Installation Methods

#### NPM (Cross-Platform)
```bash
# Global installation (recommended)
npm install -g vibe-ai-cli

# Local project installation
npm install --save-dev vibe-ai-cli
npx vibe --help
```

#### Homebrew (macOS/Linux)
```bash
# Add the tap and install
brew tap mk-knight23/tap
brew install vibe-ai-cli
```

#### Chocolatey (Windows)
```bash
# Install from Chocolatey
choco install vibe-ai-cli
```

#### Scoop (Windows)
```bash
# Add the bucket and install
scoop bucket add vibe https://github.com/mk-knight23/scoop-manifest
scoop install vibe-ai-cli
```

#### Direct Binary Download
Download the appropriate binary for your platform from [GitHub Releases](https://github.com/mk-knight23/vibe/releases):
- [Linux x64](https://github.com/mk-knight23/vibe/releases/download/v2.1.6/vibe-linux)
- [macOS x64](https://github.com/mk-knight23/vibe/releases/download/v2.1.6/vibe-macos)
- [Windows x64](https://github.com/mk-knight23/vibe/releases/download/v2.1.6/vibe-win.exe)

Check version:
```bash
vibe --version
```

## 2. Quick Start

Minimal chat:
```bash
vibe chat "Hello"
```

Generate code:
```bash
vibe generate "Build a Node HTTP server that serves /health JSON"
```

List free models and switch:
```bash
vibe model list
vibe model use z-ai/glm-4-5-air:free
```

Set API key (OpenRouter):
```bash
vibe config set openrouter.apiKey sk-or-...
export OPENROUTER_API_KEY="sk-or-..."
```

## 3. Commands Overview

| Command | Purpose |
|---------|---------|
| `vibe chat <prompt>` | One-off chat interaction |
| `vibe generate <prompt>` | Code generation (multi-file suggestions) |
| `vibe refactor <glob> --type <optimization|clean|security>` | Apply refactor suggestions |
| `vibe edit <glob>` | Multi-file diff preview & apply |
| `vibe debug <error|file>` | Analyze error output / file for issues |
| `vibe test <file> [--framework auto|jest|mocha|vitest]` | Generate test skeletons |
| `vibe git review|commit|pr` | Git diff review, commit message generation |
| `vibe agent "<task>" [--auto]` | Autonomous multi-step task execution |
| `vibe model list|use <id>` | Manage model selection |
| `vibe plan "<task>"` | Produce structured task plan (non-executing) |
| `vibe cost` | Estimate token usage cost (heuristic) |
| `vibe resume` | Resume last interrupted agent session |
| `vibe explain` | Explain piped input (e.g. `git status | vibe explain`) |
| `vibe tui` | Preview interactive terminal UI (experimental) |

## 4. Architecture

Entry points:
- CLI binary router: [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1)
- REPL / main orchestrator: [`vibe-cli/cli.cjs`](vibe-cli/cli.cjs:1)

Core domain folders:
- API key & model routing: [`vibe-cli/core/openrouter.ts`](vibe-cli/core/openrouter.ts:1), [`vibe-cli/core/apikey.ts`](vibe-cli/core/apikey.ts:1)
- Agent loop: [`vibe-cli/agent/agent.cjs`](vibe-cli/agent/agent.cjs:1)
- Codegen utilities: [`vibe-cli/code/codegen.cjs`](vibe-cli/code/codegen.cjs:1)
- Multi-edit engine: [`vibe-cli/edit/multiedit.cjs`](vibe-cli/edit/multiedit.cjs:1)
- Git helpers (diff, staging): [`vibe-cli/git/gittools.cjs`](vibe-cli/git/gittools.cjs:1)
- Refactor logic: [`vibe-cli/refactor/refactor.cjs`](vibe-cli/refactor/refactor.cjs:1)
- Debug tooling: [`vibe-cli/debug/debug.cjs`](vibe-cli/debug/debug.cjs:1)
- Test generation: [`vibe-cli/test/testgen.cjs`](vibe-cli/test/testgen.cjs:1)

### Data Flow

1. Command parsing (bin/vibe.cjs).
2. Task classification & model selection (`TASK_MODEL_MAPPING` in openrouter.ts).
3. Prompt assembly (context, safety filters).
4. OpenRouter API call (chatCompletion wrapper with retry/backoff).
5. Response parsing (diff blocks / actions).
6. Preview & confirmation (for mutating operations).
7. File application (atomic replace or patch).
8. Post-action logging + optional agent iteration.

### Safety Filter

Implemented inside REPL helper:
- `isDisallowedSecurityRequest` inside [`vibe-cli/cli.cjs`](vibe-cli/cli.cjs:1) rejects malicious or exploit-focused instructions (SQL injection crafting, zero-day generation, etc.).

## 5. Configuration & Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | Auth for free model usage |
| `VIBE_NO_BANNER` | Suppress ASCII banner |
| `EDITOR` | External editor for multi-line inputs |

Internal config path (optional persisted key):
`~/.vibe/config.json` (contains sanitized fields only).

## 6. Model Selection

Default: `z-ai/glm-4-5-air:free`.

Task-based rotation (`TASK_MODEL_MAPPING`) selects best free model for:
- Code generation
- Review
- Refactor
- Debug

See mapping logic: [`vibe-cli/core/openrouter.ts`](vibe-cli/core/openrouter.ts:1).

## 7. Diff & Multi-File Edit Flow

Refactor / edit / generate operations produce fenced diff blocks:

```diff path=src/example.ts
- old line
+ new line
```

Flow:
1. Build list of candidate diffs.
2. Display summary (file count, total changed lines).
3. Confirm or abort.
4. Apply sequentially with validation (original content hash match).

Implementation:
- Diff building: [`vibe-cli/edit/multiedit.cjs`](vibe-cli/edit/multiedit.cjs:1)
- Git integration for staging: [`vibe-cli/git/gittools.cjs`](vibe-cli/git/gittools.cjs:1)

## 8. Agent Mode

Autonomous task runner:
```bash
vibe agent "Improve logging system" --auto
```
Loop:
1. Plan generation.
2. Action selection (generate/refactor/debug).
3. Safety gating.
4. Diff preview & apply (user confirm unless `--auto`).
5. Iteration until success criteria or max steps.

Agent core: [`vibe-cli/agent/agent.cjs`](vibe-cli/agent/agent.cjs:1).

## 🚀 Versioning & Release Management

### Current Version
- **Version**: v2.1.7 (2025-11-19)
- **Tag Prefix**: `vibe-cli-vX.Y.Z`
- **Release Type**: Independent semantic versioning

### Release Process

```bash
# Bump version (patch/minor/major)
npm version patch

# Commit and tag
git add package.json
git commit -m "vibe-cli: bump to 2.1.1"
git tag vibe-cli-v2.1.1

# Push to trigger automated release
git push origin vibe-cli-v2.1.1
```

### Automated Workflows
- **`vibe-cli-v*`** triggers:
  - npm publish to registry
  - Binary build for multiple platforms
  - GitHub release with artifacts
  - Documentation updates

### Version History Highlights

#### v2.1.7 (Current)
- 🍺 **Homebrew Support**: Install on macOS/Linux with `brew install vibe-ai-cli`
- 🟪 **Chocolatey Support**: Install on Windows with `choco install vibe-ai-cli`
- 🌊 **Scoop Support**: Install on Windows with `scoop install vibe-ai-cli`
- 📦 **Direct Binary Downloads**: Pre-built binaries for all platforms
- 🏷️ **Enhanced Documentation**: Installation badges and comprehensive guides

#### v2.1.6 (Previous)
- 🌟 **Interactive Enhancements**: Visual feedback, file browser, command history
- 🔄 **Visual Feedback**: Spinner animations for all operations
- 📁 **Visual File Browser**: Tree structure display with icons
- 📜 **Command History**: Track and recall commands with `/history`
- 🎯 **Enhanced Prompts**: Safety confirmations and suggestions
- 🛡️ **Safety Improvements**: Confirmation dialogs for destructive operations

#### v2.1.5 (Previous)
- 🌟 **Interactive Enhancements**: Visual feedback, file browser, command history
- 🔄 **Visual Feedback**: Spinner animations for all operations
- 📁 **Visual File Browser**: Tree structure display with icons
- 📜 **Command History**: Track and recall commands with `/history`
- 🎯 **Enhanced Prompts**: Safety confirmations and suggestions
- 🛡️ **Safety Improvements**: Confirmation dialogs for destructive operations

#### v2.1.0 (Previous)
- 🎉 **Agent Mode**: Autonomous task execution with checkpoints
- 🔧 **Enhanced Codegen**: Multi-file project creation
- 🛡️ **Security**: Advanced filtering and privacy
- ⚡ **Performance**: Optimized memory usage
- 🎯 **Model Selection**: Task-aware routing

#### v1.0.7 (Previous)
- 📊 **Cost Estimation**: Token usage tracking
- 🔄 **Resume Feature**: Interrupted session recovery
- 📝 **Explain Command**: Pipe input analysis
- 🎨 **TUI Preview**: Experimental terminal UI

Reference: [`VERSIONING.md`](VERSIONING.md:1) and root [`README.md`](README.md:1).

## 10. Binary Build

Produces standalone executables (Linux, macOS, Windows):
```bash
npm run build:bin
```
Outputs:
- `dist/vibe-linux`
- `dist/vibe-macos`
- `dist/vibe-win.exe`

Workflow release packaging: `.github/workflows/release.yml`.

## 11. Contributing

1. Fork repository.
2. Branch name: `feat/cli-<topic>` or `fix/cli-<issue>`.
3. Scoped commits prefixed with `vibe-cli:` for clarity.
4. Keep dependencies minimal (stdlib > packages).
5. Provide diff before/after summary for large edits.

## 12. Security Principles

- No persistence of API key beyond user control.
- Reject generation of exploit payloads.
- Diff gating for all file mutations (never silent writes).
- Limited context reading (explicit file patterns only).

## 13. Roadmap

| Area | Planned Improvement |
|------|----------------------|
| Testing | Add snapshot verification for codegen outputs |
| Agent | Introduce parallel subtask scheduling |
| Diff | Granular hunk application selection |
| Docs | Add per-command detailed help (`vibe help <command>`) |
| Metrics | Optional anonymized usage counters (opt-in) |

## 14. Troubleshooting

| Symptom | Action |
|---------|--------|
| "API key missing" | Set env `OPENROUTER_API_KEY` or `vibe config set openrouter.apiKey` |
| Empty response | Try different free model (`vibe model use deepseek/deepseek-coder-v2-lite-instruct:free`) |
| Diff apply fails | Ensure file unmodified since preview & re-run command |
| Binary build error | Check Node version >= 18 and rebuild after `npm ci` |

Verbose logging (temporary):
```bash
NODE_DEBUG=vibe vibe generate "..."
```
(Uses future planned log channel hook.)

## 15. Uninstall

Global:
```bash
npm uninstall -g vibe-cli
```

Local:
```bash
npm uninstall vibe-cli
```

Remove optional config directory if desired:
```bash
rm -rf ~/.vibe
```

## 16. License

MIT — see root [`LICENSE`](LICENSE:1).

---

Maintain simplicity: each feature must justify its complexity vs. low dependency footprint. For extensions into new domains create a sibling folder and register in [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1).
