# Vibe Code Extension - Installation Guide

## 📦 Package Information
- **Package**: `vibe-code-0.1.2.vsix`
- **Size**: 80.31KB (27 files)
- **Version**: 0.1.2
- **Publisher**: mk-knight23

## 🚀 Installation Methods

### Method 1: VS Code GUI Installation (Recommended)
1. **Open VS Code**
2. **Open Extensions View**: Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. **Install from VSIX**: Click the `...` menu in the top-right corner of the Extensions panel
4. **Select Package**: Choose `vibe-code-0.1.2.vsix` from the file picker
5. **Reload VS Code**: When prompted, reload the window to activate the extension

### Method 2: Command Palette Installation
1. **Open Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. **Run Command**: Type `Extensions: Install from VSIX...` and select it
3. **Select Package**: Navigate to and select `vibe-code-0.1.2.vsix`
4. **Reload**: Reload VS Code when prompted

### Method 3: Command Line Installation
```bash
# Navigate to the vibe-code directory
cd /path/to/your-repo/vibe-code

# Install using VS Code CLI
code --install-extension vibe-code-0.1.2.vsix

# Or using the full path
code --install-extension ./vibe-code-0.1.2.vsix
```

## 🔧 Configuration Setup

### 1. API Key Configuration (Required)
**🚨 NEVER COMMIT API KEYS. Use VS Code secrets or .env files.**

#### Option A: VS Code Settings (Recommended)
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "vibe"
3. Set `vibe.openRouter.apiKey` to your OpenRouter API key
4. Or edit `settings.json` directly:
```json
{
  "vibe.openRouter.apiKey": "sk-or-your-api-key-here"
}
```

#### Option B: Environment Variable
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export OPENROUTER_API_KEY="sk-or-your-api-key-here"
```

### 2. Model Selection (Optional)
The extension defaults to GLM-4.5-Air, but you can change it:
```json
{
  "vibe.model": "z-ai/glm-4-5-air:free" // Default - top performer for agents
}
```

Available free models:
- `z-ai/glm-4-5-air:free` (DEFAULT - top performer for agents)
- `deepseek/deepseek-coder-v2-lite-instruct:free`
- `qwen/qwen2.5-coder-7b-instruct:free`
- `microsoft/phi-3-mini-128k-instruct:free`
- `tng/deepseek-r1t2-chimera:free`

### 3. Additional Settings (Optional)
```json
{
  "vibe.maxContextFiles": 30,
  "vibe.memory.enabled": true,
  "vibe.memory.maxItems": 200,
  "vibe.diff.autoReveal": true,
  "vibe.orchestrator.maxParallelAgents": 3,
  "vibe.token.warnThreshold": 14000
}
```

## 🎯 Quick Start

### 1. Verify Installation
1. **Check Activity Bar**: Look for the Vibe icon in the VS Code Activity Bar
2. **Open Chat**: Click the Vibe icon or use `Vibe: Focus Chat Sidebar` command
3. **Test Connection**: Run `Vibe: Test Chat (Hello)` from Command Palette

### 2. First Use
1. **Set API Key**: Configure your OpenRouter API key as shown above
2. **Open Chat**: Click the Vibe icon in the Activity Bar
3. **Start Chatting**: Type your message and press Enter
4. **Check Usage**: Monitor token usage in the status bar and chat footer

## 🎮 Key Features Available

### Modes
- **Code**: General coding assistance
- **Architect**: High-level planning and design
- **Ask**: Q&A and explanations
- **Debug**: Diagnose and fix issues
- **Orchestrator**: Coordinate multi-step workflows

### Commands
- `Vibe: Focus Chat Sidebar` - Open the chat panel
- `Vibe: Test Chat (Hello)` - Test the connection
- `Vibe: Test Orchestrator` - Test orchestration features
- `Vibe: Switch Next Mode` - Cycle through modes (Ctrl+.)
- `Vibe: Switch Previous Mode` - Previous mode (Ctrl+Shift+.)
- `Vibe: Switch to Architect Mode` - Quick architect mode (Ctrl+Alt+A)

### Features
- **Streaming Responses**: Real-time AI responses
- **Diff Suggestions**: Code changes with apply/reject buttons
- **Memory Bank**: Persistent conversation context
- **Orchestrator**: Multi-step task planning and execution
- **Usage Tracking**: Real-time token usage display
- **Hallucination Checking**: File existence verification

## 🔒 Security Features

- **Free Models Only**: Strict enforcement prevents paid model usage
- **API Key Security**: Multiple secure configuration methods
- **No Hardcoded Keys**: Development fallback only with warnings
- **Usage Tracking**: Monitor free tier limits

## 🐛 Troubleshooting

### Extension Not Loading
1. **Check VS Code Version**: Requires VS Code 1.90.0+
2. **Reload Window**: Press `Ctrl+Shift+P` → `Developer: Reload Window`
3. **Check Output**: View → Output → Vibe (for error logs)

### API Key Issues
1. **Verify Key**: Ensure your OpenRouter API key is valid
2. **Check Settings**: Confirm `vibe.openRouter.apiKey` is set
3. **Environment Variable**: Try setting `OPENROUTER_API_KEY`

### Chat Not Responding
1. **Test Connection**: Run `Vibe: Test Chat (Hello)`
2. **Check Network**: Ensure internet connectivity
3. **View Logs**: Check Output panel for Vibe logs

### Webview Blank
1. **Reload Chat**: Run `Vibe: Reload Chat View`
2. **Check CSP**: Ensure no conflicting extensions
3. **Developer Tools**: Help → Toggle Developer Tools

## 📞 Support

For issues or questions:
1. Check the [README.md](README.md) for detailed documentation
2. Review the troubleshooting section above
3. Check VS Code Output panel for error logs
4. File an issue on the GitHub repository

## ✅ Verification

After installation, you should see:
- Vibe icon in Activity Bar
- Chat panel with GLM-4.5-Air as default model
- Token usage display in status bar
- All 5 free models available in dropdown
- Working test commands

Enjoy your upgraded Vibe VS Code extension with GLM-4.5-Air optimization! 🚀