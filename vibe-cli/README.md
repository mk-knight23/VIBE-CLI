# Vibe CLI

Free, privacy-first AI coding assistant CLI (chat, codegen, refactor, debug, test, git, agent) with dual-provider support (OpenRouter & MegaLLM).

## Installation

```bash
npm install -g vibe-ai-cli@3.0.0
```

## Default Model

The default AI model for Vibe CLI has been updated to **Qwen Qwen3 Next 80B A3B Instruct** (`qwen/qwen3-next-80b-a3b-instruct`), a high-performance model from Alibaba with 262,144 context tokens. This model is now selected as the default for all AI operations including chat, code generation, debugging, and agent tasks.

This change improves reasoning capabilities, code generation quality, and long-context understanding across all Vibe CLI features.

## Usage

Simply run:

```bash
vibe
```

You'll see a welcoming screen with both AI providers:

```
+-------------------------------- Vibe-CLI v1.0 ---------------------------------+
|                                   | Tips for getting started                    |
|          Welcome back mkazi!      | - Type /help to see all commands            |
|                                   | - Use /models to select a free model       |
|   | |█████| |                          | - /save [name] to save a transcript        |
|  | |█████| | ← Initializing…         | ------------------------------------------- |
|    | | | |   ← Boot Sequence OK      | Recent activity                             |
|                                   | No recent activity                        |
|                                   |                                              |
|   Vibe AI · Free Model Access     |                                              |
|       /Users/mkazi/VIbe/vibe-cli                 |
+---------------------------------------------------------------------------------------------+
```

The first time you run `vibe`, you'll see a welcome screen:

```
=== Vibe CLI Welcome ===
Welcome to Vibe CLI - Your AI Coding Assistant!
We support two powerful AI providers:
  • OpenRouter - Access to 100+ free models
  • MegaLLM - High-performance models with 128K context

Please select your preferred AI provider:
1. OpenRouter (Recommended - Free Models)
2. MegaLLM (High-Performance)
```

After selection, the CLI will automatically use the hardcoded default API keys:
- OpenRouter: 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
- MegaLLM: sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820

You can then use all Vibe CLI commands:
- `/help` - Show all commands
- `/chat` - Start interactive chat
- `/generate` - Generate code
- `/debug` - Debug errors
- `/test` - Generate tests
- `/git` - Git operations with AI assistance

## Features

- **Dual Provider Support**: Choose between OpenRouter and MegaLLM
- **Hardcoded Default Keys**: No manual API key setup required
- **Interactive Welcome**: Friendly onboarding experience
- **Automatic Configuration**: Keys saved to config for future use
- **100+ Free Models**: Access to OpenRouter's extensive model catalog
- **High-Performance Models**: MegaLLM's 128K context window
- **Default Model**: Qwen Qwen3 Next 80B A3B Instruct (262K context) for superior reasoning and code generation
- **Full CLI Features**: Chat, code generation, debugging, testing, git integration

## Configuration

Your API key and provider selection are saved in `~/.vibe/config.json` for future sessions.

## Support

Report issues: https://github.com/user/vibe-cli/issues
