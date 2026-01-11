# VIBE CLI v0.0.1 User Guide

This guide covers everything you need to know to master the VIBE CLI.

## Interactive Mode

Launch the VIBE interactive shell by running `vibe` in your terminal.

```bash
$ vibe
```

## Core Workflows

### 1. Project Scaffolding
Use `/scaffold` to create new projects. You can choose from templates or describe a custom stack.
- **Description**: "A Next.js 14 app with Tailwind CSS and Clerk authentication."
- **Result**: VIBE generates the structure, installs dependencies, and configures the environment.

### 2. Intelligent Debugging
When you hit an error, VIBE can help.
- `/debug <path|error>`: Performs a deep analysis of a file or stack trace.
- `/fix <error>`: Launches an agent to autonomously find and repair the bug.

### 3. Testing & Documentation
Maintain high code quality with zero effort.
- `/test <file>`: Generates Vitest/Jest unit tests with high coverage.
- `/docs <file>`: Explains complex code and generates markdown documentation.

### 4. Architecture & Visualization
Understand your project at a glance.
- `/viz <dir>`: Generates an interactive ASCII tree and analyzes dependencies.
- `/mood`: Provides a qualitative report on code health and maintenance status.

### 5. DevOps & Cloud
Automate your path to production.
- `/cicd <description>`: Generates GitHub Actions or GitLab CI workflows.
- `/iac <description>`: Generates Terraform or CloudFormation scripts.
- `/cloud`: Suggests optimal deployment targets and best practices.

## Agent System

VIBE uses a sophisticated agentic system:
- **Planner Agent**: Breaks down tasks into executable steps.
- **Executor Agent**: Performs the actual file edits and commands.
- **Coder Agent**: Writes high-quality, type-safe code.
- **Debugger Agent**: Specializes in finding and fixing issues.

## Safety & Control

- **Checkpoints**: VIBE automatically creates a checkpoint before every major operation.
- **Undo**: Use `/undo` to revert the last set of changes.
- **Approval**: Dangerous operations (like deleting files or running system commands) always require a confirmation.

## Configuration

Configure your AI providers, models, and safety levels via the `/config` command.

```bash
vibe> /config set provider anthropic
vibe> /config set model claude-3-5-sonnet
```

---
Happy Coding!
