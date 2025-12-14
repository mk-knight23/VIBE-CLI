
import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';

// Command History Manager
class CommandHistory {
  private history: Array<{ command: string; timestamp: number; mode: string }> = [];
  private maxSize = 50;

  add(command: string, mode: string) {
    this.history.unshift({ command, timestamp: Date.now(), mode });
    if (this.history.length > this.maxSize) this.history.pop();
  }

  get(limit = 10) {
    return this.history.slice(0, limit);
  }

  clear() {
    this.history = [];
  }
}

const commandHistory = new CommandHistory();

type VibeModeId =
  | "architect"
  | "code"
  | "ask"
  | "debug"
  | "orchestrator"
  | "project-research";

interface VibeMode {
  id: VibeModeId;
  label: string;
  shortLabel: string;
  description: string;
}

interface Persona {
  id: string;
  label: string;
  description: string;
  mode: VibeModeId | "any";
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface VibeConfig {
  openrouterApiKey: string;
  megallmApiKey: string;
  agentrouterApiKey: string;
  routewayApiKey: string;
  provider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway';
  defaultModel: string;
  autoApproveUnsafeOps: boolean;
  maxContextFiles: number;
}

// HARDCODED API KEYS - Users can use immediately without setup
const DEFAULT_OPENROUTER_KEY = "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";
const DEFAULT_MEGALLM_KEY = "sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820";
const DEFAULT_AGENTROUTER_KEY = "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"; // Use OpenRouter as fallback
const DEFAULT_ROUTEWAY_KEY = "sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820"; // Use MegaLLM as fallback

// Kilo Code Tools interfaces
interface ReadFileParams {
  path: string;
  start_line?: number;
  end_line?: number;
  auto_truncate?: boolean;
}

interface SearchFilesParams {
  path: string;
  regex: string;
  file_pattern?: string;
}

interface ListFilesParams {
  path: string;
  recursive?: boolean;
}

interface ListCodeDefinitionNamesParams {
  path: string;
}

interface ApplyDiffParams {
  path: string;
  diff: string;
}

interface WriteToFileParams {
  path: string;
  content: string;
  line_count: number;
}

interface OpenRouterResponse {
  content: string;
}

const MODES: VibeMode[] = [
  {
    id: "architect",
    label: "Architect",
    shortLabel: "🏗️",
    description: "Plan and design before implementation",
  },
  {
    id: "code",
    label: "Code",
    shortLabel: "💻",
    description: "Write, modify, and refactor code",
  },
  {
    id: "ask",
    label: "Ask",
    shortLabel: "❓",
    description: "Get answers and explanations",
  },
  {
    id: "debug",
    label: "Debug",
    shortLabel: "🪲",
    description: "Diagnose and fix software issues",
  },
  {
    id: "orchestrator",
    label: "Orchestrator",
    shortLabel: "🪃",
    description: "Coordinate tasks across modes",
  },
  {
    id: "project-research",
    label: "Project Research",
    shortLabel: "🔍",
    description: "Investigate and analyze codebase",
  },
];

const PERSONAS: Persona[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "General purpose assistant with safe defaults.",
    mode: "any",
  },
  {
    id: "system-architect",
    label: "System Architect",
    description: "High-level design and trade-off analysis.",
    mode: "architect",
  },
  {
    id: "pair-programmer",
    label: "Pair Programmer",
    description: "Hands-on coding partner for implementation.",
    mode: "code",
  },
  {
    id: "debug-doctor",
    label: "Debug Doctor",
    description: "Root cause analysis and fixes.",
    mode: "debug",
  },
  {
    id: "research-analyst",
    label: "Research Analyst",
    description: "Deep codebase and dependency research.",
    mode: "project-research",
  },
];

const TOP_FREE_MODELS: string[] = [
  // OpenRouter (6 models)
  "x-ai/grok-4.1-fast",
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-chat-v3",
  "qwen/qwen3-coder-32b-instruct",
  "openai-gpt-oss-20b",
  "google/gemini-2.0-flash-exp:free",
  
  // MegaLLM (12 models)
  "llama-3.3-70b-instruct",
  "deepseek-r1-distill-llama-70b",
  "moonshotai/kimi-k2-instruct-0905",
  "deepseek-ai/deepseek-v3.1-terminus",
  "minimaxai/minimax-m2",
  "qwen/qwen3-next-80b-a3b-instruct",
  "deepseek-ai/deepseek-v3.1",
  "mistralai/mistral-nemotron",
  "alibaba-qwen3-32b",
  "openai-gpt-oss-120b",
  "llama3-8b-instruct",
  "claude-3.5-sonnet",
  
  // AgentRouter (7 models)
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-4.5",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-v3.1",
  "deepseek/deepseek-v3.2",
  "zhipu/glm-4.5",
  "zhipu/glm-4.6",
  
  // Routeway (6 models)
  "moonshot/kimi-k2",
  "minimax/minimax-m2",
  "zhipu/glm-4.6-free",
  "deepseek/deepseek-v3-free",
  "meta/llama-3.2-3b-free",
  "gpt-4o-mini"
];

 // Minimal declaration so TypeScript accepts global fetch in Node 18+ (no DOM lib dependency).
declare function fetch(input: unknown, init?: unknown): Promise<unknown>;

class VibeView implements vscode.WebviewViewProvider {
  public static currentView: VibeView | undefined;

  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private currentMode: VibeModeId = "code";
  private currentPersonaId = "balanced";
  private currentModelId: string;
  private messages: ChatMessage[] = [];

  public static register(
    context: vscode.ExtensionContext,
    fileActions: FileActionsService
  ) {
    const provider = new VibeView(context, fileActions);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("vibe.vibePanel", provider)
    );
    VibeView.currentView = provider;
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly fileActions: FileActionsService
  ) {
    const cfg = getExtensionConfig();
    this.currentModelId = cfg.defaultModel || TOP_FREE_MODELS[0];
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.onDidDispose(
      () => this.dispose(),
      null,
      this.disposables
    );

    webviewView.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      undefined,
      this.disposables
    );

    void this.postInitState();
  }

  public show() {
    if (this.view) {
      this.view.show(true);
    }
  }

  public setMode(mode: VibeModeId) {
    this.currentMode = mode;
    const meta = MODES.find((m) => m.id === mode);
    if (this.view) {
      this.view.webview.postMessage({
        type: "setMode",
        mode,
        modeLabel: meta?.label,
        modeDescription: meta?.description,
      });
    }
  }

  public switchMode(delta: 1 | -1) {
    const idx = MODES.findIndex((m) => m.id === this.currentMode);
    if (idx === -1) {
      this.setMode("code");
      return;
    }
    let next = idx + delta;
    if (next < 0) {
      next = MODES.length - 1;
    } else if (next >= MODES.length) {
      next = 0;
    }
    this.setMode(MODES[next].id);
  }

  public dispose() {
    VibeView.currentView = undefined;
    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }

  private async postInitState() {
    const cfg = getExtensionConfig();
    if (this.view) {
      this.view.webview.postMessage({
        type: "init",
        modes: MODES,
        personas: PERSONAS,
        currentMode: this.currentMode,
        currentPersonaId: this.currentPersonaId,
        currentModelId: this.currentModelId,
        topModels: TOP_FREE_MODELS,
        settings: cfg,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleMessage(msg: any) {
    switch (msg.type) {
      case "ready":
        await this.postInitState();
        break;
      case "setMode":
        if (MODES.some((m) => m.id === msg.mode)) {
          this.setMode(msg.mode);
        }
        break;
      case "setPersona":
        this.currentPersonaId = msg.personaId;
        break;
      case "setModel":
        if (typeof msg.modelId === "string") {
          this.currentModelId = msg.modelId;
        }
        break;
      case "sendMessage":
        await this.handleSendMessage(msg);
        break;
      case "openSettings":
        void vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:vibe-vscode"
        );
        break;
      case "setApiKey":
        if (typeof msg.apiKey === "string") {
          await this.saveApiKey(msg.apiKey);
        }
        break;
      case "setProvider":
        if (typeof msg.provider === "string" && 
            (msg.provider === "openrouter" || msg.provider === "megallm" || 
             msg.provider === "agentrouter" || msg.provider === "routeway")) {
          await this.setProvider(msg.provider);
        }
        break;
      case "clearChat":
        // Clear the message history in the extension
        this.messages = [];
        break;
      case "openSettings":
        void vscode.commands.executeCommand("workbench.action.openSettings", "vibe");
        break;
      case "openExternal":
        if (typeof msg.url === "string") {
          void vscode.env.openExternal(vscode.Uri.parse(msg.url));
        }
        break;
      case "setMaxContextFiles":
        if (typeof msg.maxContextFiles === "number") {
          const config = vscode.workspace.getConfiguration('vibe');
          await config.update('maxContextFiles', msg.maxContextFiles, vscode.ConfigurationTarget.Global);
          void vscode.window.showInformationMessage(`Max context files updated to ${msg.maxContextFiles}`);
        }
        break;
      case "setAutoApprove":
        if (typeof msg.autoApprove === "boolean") {
          const config = vscode.workspace.getConfiguration('vibe');
          await config.update('autoApproveUnsafeOps', msg.autoApprove, vscode.ConfigurationTarget.Global);
          void vscode.window.showInformationMessage(`Auto-approve unsafe operations ${msg.autoApprove ? 'enabled' : 'disabled'}`);
        }
        break;
      default:
        break;
    }
  }

  private async handleSendMessage(msg: {
    text: string;
    isAgent: boolean;
  }) {
    const text = (msg.text || "").trim();
    if (!text) {
      return;
    }

    // V5.0: Handle shell commands (!)
    if (text.startsWith('!')) {
      const command = text.substring(1).trim();
      if (shellEngine.isDestructive(command)) {
        const confirm = await vscode.window.showWarningMessage(
          '⚠️ Destructive command detected. Continue?',
          'Yes', 'No'
        );
        if (confirm !== 'Yes') return;
      }
      
      shellEngine.show();
      const result = await shellEngine.execute(command, true);
      
      if (this.view) {
        this.view.webview.postMessage({
          type: "addMessage",
          role: "assistant",
          content: `Command executed:\n\`\`\`\n${command}\n\`\`\`\n\nExit code: ${result.exitCode}\n\nOutput:\n\`\`\`\n${result.stdout}\n\`\`\`${result.stderr ? '\n\nErrors:\n```\n' + result.stderr + '\n```' : ''}`
        });
      }
      return;
    }

    // V5.0: Handle filesystem commands (/fs)
    if (text.startsWith('/fs ')) {
      const parts = text.substring(4).split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);
      
      try {
        let result = '';
        switch (cmd) {
          case 'mkdir':
            await fsEngine.createFolder(args[0]);
            result = `✅ Folder created: ${args[0]}`;
            break;
          case 'create':
            await fsEngine.createFile(args[0]);
            result = `✅ File created: ${args[0]}`;
            break;
          case 'rm':
            await fsEngine.deleteFile(args[0]);
            result = `✅ Deleted: ${args[0]}`;
            break;
          case 'search':
            const files = await fsEngine.search(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', args[0]);
            result = `Found ${files.length} files:\n${files.slice(0, 10).join('\n')}`;
            break;
          default:
            result = `Unknown command: ${cmd}. Available: mkdir, create, rm, search`;
        }
        
        if (this.view) {
          this.view.webview.postMessage({
            type: "addMessage",
            role: "assistant",
            content: result
          });
        }
        return;
      } catch (error) {
        vscode.window.showErrorMessage(`Filesystem error: ${error}`);
        return;
      }
    }

    const cfg = getExtensionConfig();

    const persona =
      PERSONAS.find((p) => p.id === this.currentPersonaId) ?? PERSONAS[0];

    const taskType = determineTaskType(this.currentMode, text);

    const systemPrompt = this.buildSystemPrompt(persona, msg.isAgent, cfg, taskType);

    const messages: ChatMessage[] = [];
    messages.push({ role: "system", content: systemPrompt });
    this.messages.forEach((m) => messages.push(m));
    messages.push({ role: "user", content: text });

    this.messages.push({ role: "user", content: text });

    // Show thinking message in chat UI only
    if (this.view) {
      this.view.webview.postMessage({
        type: "thinkingStart"
      });
    }

    try {
      // Try selected provider first, then fall back to other providers
      let resp: OpenRouterResponse | MegaLLMResponse | AgentRouterResponse | RoutewayResponse | null = null;
      let finalProvider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway' = cfg.provider;

      // First, try the currently selected provider with the selected model
      if (cfg.provider === 'openrouter') {
        resp = await callOpenRouterWithFallback({
          apiKey: cfg.openrouterApiKey,
          model: this.currentModelId,
          messages,
          taskType,
        });
        finalProvider = 'openrouter';
      } else if (cfg.provider === 'megallm') {
        resp = await callMegaLLMWithFallback({
          apiKey: cfg.megallmApiKey,
          model: this.currentModelId,
          messages,
          taskType,
        });
        finalProvider = 'megallm';
      } else if (cfg.provider === 'agentrouter') {
        resp = await callAgentRouterWithFallback({
          apiKey: cfg.agentrouterApiKey,
          model: this.currentModelId,
          messages,
          taskType,
        });
        finalProvider = 'agentrouter';
      } else if (cfg.provider === 'routeway') {
        resp = await callRoutewayWithFallback({
          apiKey: cfg.routewayApiKey,
          model: this.currentModelId,
          messages,
          taskType,
        });
        finalProvider = 'routeway';
      }

      // If the selected provider fails, try all other providers in sequence
      if (!resp || !resp.content || resp.content.includes("No content returned") || resp.content.includes("All available models failed")) {
        const providers: Array<'openrouter' | 'megallm' | 'agentrouter' | 'routeway'> = ['openrouter', 'megallm', 'agentrouter', 'routeway'];
        
        for (const provider of providers) {
          if (provider === cfg.provider) continue; // Skip already tried provider
          
          try {
            if (provider === 'openrouter') {
              resp = await callOpenRouterWithFallback({
                apiKey: cfg.openrouterApiKey,
                model: this.currentModelId,
                messages,
                taskType,
              });
              finalProvider = 'openrouter';
            } else if (provider === 'megallm') {
              resp = await callMegaLLMWithFallback({
                apiKey: cfg.megallmApiKey,
                model: this.currentModelId,
                messages,
                taskType,
              });
              finalProvider = 'megallm';
            } else if (provider === 'agentrouter') {
              resp = await callAgentRouterWithFallback({
                apiKey: cfg.agentrouterApiKey,
                model: this.currentModelId,
                messages,
                taskType,
              });
              finalProvider = 'agentrouter';
            } else if (provider === 'routeway') {
              resp = await callRoutewayWithFallback({
                apiKey: cfg.routewayApiKey,
                model: this.currentModelId,
                messages,
                taskType,
              });
              finalProvider = 'routeway';
            }
            
            if (resp && resp.content && !resp.content.includes("No content returned") && !resp.content.includes("All available models failed")) {
              break; // Success, exit loop
            }
          } catch (error) {
            console.warn(`Provider ${provider} failed: ${(error as Error).message}`);
            continue;
          }
        }
      }

      // Final check if we have a valid response
      if (!resp || !resp.content || resp.content.includes("No content returned") || resp.content.includes("All available models failed")) {
        void vscode.window.showWarningMessage(`Vibe: Unable to get response from any provider. Please verify your API keys.`);
        return;
      }

      // Check if the response contains tool calls
      if (this.containsToolCall(resp.content)) {
        // Process the tool calls
        const toolResults = await this.processToolCalls(resp.content);
        // Add the tool results to the messages and send them to the UI
        this.messages.push({ role: "assistant", content: resp.content });
        if (this.view) {
          this.view.webview.postMessage({
            type: "assistantMessage",
            content: resp.content,
          });
        }

        // Send tool results back to the AI for further processing
        const toolResultMessage: ChatMessage = {
          role: "user",
          content: `Tool results:\n${toolResults}`
        };
        this.messages.push(toolResultMessage);

        // Get the final response from the AI after tool results
        const finalMessages: ChatMessage[] = [];
        finalMessages.push({ role: "system", content: systemPrompt });
        this.messages.forEach((m) => finalMessages.push(m));

        // Show thinking in chat
        if (this.view) {
          this.view.webview.postMessage({
            type: "thinkingStart"
          });
        }

        // Use the provider that worked for the first response
        let finalResp: OpenRouterResponse | MegaLLMResponse | null = null;
        if (finalProvider === 'openrouter') {
          finalResp = await callOpenRouterWithFallback({
            apiKey: cfg.openrouterApiKey,
            model: this.currentModelId,
            messages: finalMessages,
            taskType,
          });
        } else {
          finalResp = await callMegaLLMWithFallback({
            apiKey: cfg.megallmApiKey,
            model: this.currentModelId,
            messages: finalMessages,
            taskType,
          });
        }

        // Apply the same fallback logic for the second response
        if (!finalResp || !finalResp.content || finalResp.content.includes("No content returned") || finalResp.content.includes("All available models failed")) {
          // Try the other provider
          if (finalProvider === 'openrouter') {
            finalResp = await callMegaLLMWithFallback({
              apiKey: cfg.megallmApiKey,
              model: this.currentModelId,
              messages: finalMessages,
              taskType,
            });
          } else {
            finalResp = await callOpenRouterWithFallback({
              apiKey: cfg.openrouterApiKey,
              model: this.currentModelId,
              messages: finalMessages,
              taskType,
            });
          }
        }

        if (finalResp && finalResp.content && !finalResp.content.includes("No content returned") && !finalResp.content.includes("All available models failed")) {
          this.messages.push({ role: "assistant", content: finalResp.content });
          if (this.view) {
            this.view.webview.postMessage({
              type: "assistantMessage",
              content: finalResp.content,
            });
          }
        } else {
          // If second response fails, at least send the first response
          void vscode.window.showWarningMessage(`Vibe: Tool processing response failed, but here's the initial response.`);
        }
      } else {
        // No tool calls, send response as usual
        this.messages.push({ role: "assistant", content: resp.content });
        if (this.view) {
          this.view.webview.postMessage({
            type: "assistantMessage",
            content: resp.content,
          });
        }
      }
    } catch (err: any) {
      const msgText = (err && err.message) || `Unexpected error occurred.`;
      void vscode.window.showErrorMessage(`Vibe: ${msgText}`);
    } finally {
      // Stop thinking indicator in chat
      if (this.view) {
        this.view.webview.postMessage({
          type: "thinkingStop"
        });
      }
    }
  }

  private containsToolCall(content: string): boolean {
    const toolPatterns = [
      /<read_file/,
      /<search_files/,
      /<list_files/,
      /<list_code_definition_names/,
      /<apply_diff/,
      /<write_to_file/,
      /<create_folder/,
      /<run_command/
    ];

    return toolPatterns.some(pattern => pattern.test(content));
  }

  private async processToolCalls(content: string): Promise<string> {
    let result = '';
    const toolCalls = this.extractToolCalls(content);
    const successMessages: string[] = [];

    for (const toolCall of toolCalls) {
      try {
        const toolResult = await this.executeTool(toolCall);
        result += `Tool: ${toolCall.type}\nParameters: ${JSON.stringify(toolCall.params)}\nResult: ${toolResult}\n\n`;
        
        // Collect success messages for chat display
        if (toolCall.type === 'write_to_file') {
          successMessages.push(`✅ Created: ${toolCall.params.path}`);
        } else if (toolCall.type === 'create_folder') {
          successMessages.push(`✅ Folder created: ${toolCall.params.path}`);
        }
      } catch (error) {
        result += `Tool: ${toolCall.type}\nParameters: ${JSON.stringify(toolCall.params)}\nError: ${(error as Error).message}\n\n`;
        vscode.window.showErrorMessage(`❌ Error: ${(error as Error).message}`);
      }
    }

    // Refresh file explorer
    if (toolCalls.length > 0) {
      vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
    }

    // Send success messages to chat window
    if (successMessages.length > 0 && this.view) {
      this.view.webview.postMessage({
        type: "toolSuccess",
        messages: successMessages
      });
    }

    return result;
  }

  private extractToolCalls(content: string) {
    const toolCalls = [];

    // Match tool call patterns
    const toolPatterns = [
      { type: 'read_file', pattern: /<read_file[^>]*\/>/g },
      { type: 'search_files', pattern: /<search_files[^>]*\/>/g },
      { type: 'list_files', pattern: /<list_files[^>]*\/>/g },
      { type: 'list_code_definition_names', pattern: /<list_code_definition_names[^>]*\/>/g },
      { type: 'apply_diff', pattern: /<apply_diff[^>]*\/>/g },
      { type: 'write_to_file', pattern: /<write_to_file[\s\S]*?\/>/g },
      { type: 'create_folder', pattern: /<create_folder[^>]*\/>/g },
      { type: 'run_command', pattern: /<run_command[^>]*\/>/g }
    ];

    for (const toolPattern of toolPatterns) {
      let match;
      while ((match = toolPattern.pattern.exec(content)) !== null) {
        const toolParams = this.parseToolParams(match[0]);
        toolCalls.push({
          type: toolPattern.type,
          params: toolParams
        });
      }
    }

    return toolCalls;
  }

  private parseToolParams(paramString: string): Record<string, any> {
    // Parse attributes from the parameter string
    const params: Record<string, any> = {};

    // Extract attributes - handle multi-line content with [\s\S] instead of .
    const attrPattern = /(\w+)=(["'])([\s\S]*?)(\2)/g;
    let attrMatch;

    while ((attrMatch = attrPattern.exec(paramString)) !== null) {
      const key = attrMatch[1];
      let value = attrMatch[3];
      
      // Decode HTML entities
      value = value.replace(/&quot;/g, '"')
                   .replace(/&apos;/g, "'")
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&');
      
      // Try to parse as a number if it looks like one
      if (/^\d+$/.test(value)) {
        params[key] = parseInt(value);
      } else if (value.toLowerCase() === 'true') {
        params[key] = true;
      } else if (value.toLowerCase() === 'false') {
        params[key] = false;
      } else {
        params[key] = value;
      }
    }

    return params;
  }

  private async executeTool(toolCall: { type: string; params: any }): Promise<string> {
    const workspaceFolder = getWorkspaceFolder();
    const workspaceRoot = workspaceFolder.uri.fsPath;
    
    switch(toolCall.type) {
      case 'read_file':
        return await handleReadFile(toolCall.params as ReadFileParams);
      case 'search_files':
        return await handleSearchFiles(toolCall.params as SearchFilesParams);
      case 'list_files':
        return await handleListFiles(toolCall.params as ListFilesParams);
      case 'list_code_definition_names':
        return await handleListCodeDefinitionNames(toolCall.params as ListCodeDefinitionNamesParams);
      case 'apply_diff':
        return await handleApplyDiff(toolCall.params as ApplyDiffParams);
      case 'write_to_file':
        return await handleWriteToFile(toolCall.params as WriteToFileParams);
      case 'create_folder':
        const folderPath = path.join(workspaceRoot, toolCall.params.path);
        await fsEngine.createFolder(folderPath);
        return `✅ Folder created: ${toolCall.params.path}`;
      case 'run_command':
        if (shellEngine.isDestructive(toolCall.params.command)) {
          return `⚠️ Destructive command blocked: ${toolCall.params.command}`;
        }
        const result = await shellEngine.execute(toolCall.params.command, false);
        return `Command: ${toolCall.params.command}\nExit code: ${result.exitCode}\nOutput:\n${result.stdout}${result.stderr ? '\nErrors:\n' + result.stderr : ''}`;
      default:
        throw new Error(`Unknown tool type: ${toolCall.type}`);
    }
  }

  private async saveApiKey(apiKey: string) {
    try {
      const config = vscode.workspace.getConfiguration('vibe');

      // Determine which API key setting to update based on current provider
      const currentConfig = getExtensionConfig();
      if (currentConfig.provider === 'openrouter') {
        await config.update('openrouterApiKey', apiKey, vscode.ConfigurationTarget.Global);
        void vscode.window.showInformationMessage('OpenRouter API key saved successfully!');
      } else if (currentConfig.provider === 'megallm') {
        await config.update('megallmApiKey', apiKey, vscode.ConfigurationTarget.Global);
        void vscode.window.showInformationMessage('MegaLLM API key saved successfully!');
      } else if (currentConfig.provider === 'agentrouter') {
        await config.update('agentrouterApiKey', apiKey, vscode.ConfigurationTarget.Global);
        void vscode.window.showInformationMessage('AgentRouter API key saved successfully!');
      } else if (currentConfig.provider === 'routeway') {
        await config.update('routewayApiKey', apiKey, vscode.ConfigurationTarget.Global);
        void vscode.window.showInformationMessage('Routeway API key saved successfully!');
      }
    } catch (error) {
      void vscode.window.showErrorMessage('Failed to save API key: ' + (error as Error).message);
    }
  }

  private async setProvider(provider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway') {
    try {
      const config = vscode.workspace.getConfiguration('vibe');
      await config.update('provider', provider, vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage(`Provider switched to ${provider} successfully!`);
    } catch (error) {
      void vscode.window.showErrorMessage('Failed to set provider: ' + (error as Error).message);
    }
  }


  private buildSystemPrompt(
    persona: Persona,
    isAgent: boolean,
    cfg: VibeConfig,
    taskType: string
  ): string {
    const base =
      "You are Vibe, an AI coding assistant that can EXECUTE actions directly. " +
      "When the user asks you to create files, folders, or make changes, you MUST use the tools to actually do it. " +
      "Don't just describe what to do - USE THE TOOLS to execute the actions immediately.";

    const personaLine = `Persona: ${persona.label} - ${persona.description}`;
    const mode = MODES.find((m) => m.id === this.currentMode);
    const modeLine = mode
      ? `Current mode: ${mode.label} - ${mode.description}`
      : "";

    const agentLine = isAgent
      ? "You are in Agent mode. Execute tasks step by step using tools."
      : "You are in Chat mode. When asked to create/modify files, use tools immediately.";

    const taskTypeLine = `Task type: ${taskType}.`;

    const autoApproveLine = cfg.autoApproveUnsafeOps
      ? "Auto-approve mode is ON. Execute file operations directly."
      : "Auto-approve mode is OFF. Still use tools but describe what you're doing.";

    const contextLimitLine = `You can reference at most ${cfg.maxContextFiles} project files.`;

    const toolsLine = `CRITICAL: You MUST use XML tools to execute actions. DO NOT just describe - EXECUTE!

TOOLS AVAILABLE:
1. <write_to_file path="file.js" content="code here" line_count="1" /> - CREATE/WRITE files (supports ALL file types: .html, .css, .js, .jsx, .ts, .tsx, .json, .md, .txt, .py, .java, .cpp, .go, .rs, .php, .rb, .swift, .kt, .xml, .yaml, .yml, .toml, .ini, .env, .sh, .bat, .sql, .graphql, .proto, etc.)
2. <create_folder path="folder_name" /> - CREATE folders
3. <read_file path="file.js" /> - READ files
4. <apply_diff path="file.js" diff="patch content" /> - MODIFY files
5. <search_files path="." regex="pattern" /> - SEARCH files
6. <list_files path="." recursive="true" /> - LIST files
7. <run_command command="npm install" /> - EXECUTE shell commands

FILE CREATION ORDER (MANDATORY):
When creating web projects, ALWAYS follow this order:
1. Create folder first
2. Create HTML files (.html, .htm)
3. Create CSS files (.css, .scss, .sass, .less)
4. Create JavaScript files (.js, .jsx, .ts, .tsx)
5. Create configuration files (.json, .yaml, .toml, package.json, tsconfig.json, etc.)
6. Create documentation files (.md, .txt, README.md)
7. Create any other files (.env, .gitignore, images, etc.)

SELF-HEALING PROTOCOL:
If you encounter ANY error or issue:
1. Use <read_file> to inspect the problematic file
2. Use <apply_diff> or <write_to_file> to fix the issue
3. Use <run_command> to verify the fix (e.g., npm run build, npm test)
4. Report what was wrong and how you fixed it

MANDATORY EXAMPLES:

User: "create a website"
YOU MUST RESPOND:
<create_folder path="website" />
<write_to_file path="website/index.html" content="<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
    <link rel=&quot;stylesheet&quot; href=&quot;styles.css&quot;>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is a simple website.</p>
    <script src=&quot;script.js&quot;></script>
</body>
</html>" line_count="12" />
<write_to_file path="website/styles.css" content="* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    padding: 20px;
    background: #f5f5f5;
}

h1 {
    color: #333;
    margin-bottom: 20px;
}" line_count="16" />
<write_to_file path="website/script.js" content="console.log('Website loaded successfully!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready');
});" line_count="5" />

User: "create a React Button component"
YOU MUST RESPOND:
<create_folder path="components" />
<write_to_file path="components/Button.jsx" content="import React from 'react';

export default function Button({ children, onClick, variant = 'primary' }) {
    return (
        <button 
            onClick={onClick}
            className={\`btn btn-\${variant}\`}
        >
            {children}
        </button>
    );
}" line_count="11" />

User: "create a todo app"
YOU MUST RESPOND:
<create_folder path="todo-app" />
<write_to_file path="todo-app/index.html" content="<!DOCTYPE html>
<html>
<head>
    <title>Todo App</title>
    <link rel=&quot;stylesheet&quot; href=&quot;style.css&quot;>
</head>
<body>
    <div class=&quot;container&quot;>
        <h1>My Todo List</h1>
        <input type=&quot;text&quot; id=&quot;todoInput&quot; placeholder=&quot;Add new todo...&quot;>
        <button id=&quot;addBtn&quot;>Add</button>
        <ul id=&quot;todoList&quot;></ul>
    </div>
    <script src=&quot;app.js&quot;></script>
</body>
</html>" line_count="15" />
<write_to_file path="todo-app/style.css" content="body {
    font-family: Arial, sans-serif;
    background: #f0f0f0;
    padding: 20px;
}

.container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    margin-bottom: 20px;
}

input {
    width: 70%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
}

button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-left: 10px;
}

button:hover {
    background: #0056b3;
}

ul {
    list-style: none;
    padding: 0;
    margin-top: 20px;
}

li {
    padding: 10px;
    background: #f9f9f9;
    margin: 5px 0;
    border-radius: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}" line_count="55" />
<write_to_file path="todo-app/app.js" content="const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

let todos = [];

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    
    const todo = {
        id: Date.now(),
        text: text,
        completed: false
    };
    
    todos.push(todo);
    todoInput.value = '';
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) todo.completed = !todo.completed;
    renderTodos();
}

function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.innerHTML = \`
            <span style=&quot;text-decoration: \${todo.completed ? 'line-through' : 'none'}&quot;>
                \${todo.text}
            </span>
            <div>
                <button onclick=&quot;toggleTodo(\${todo.id})&quot;>Toggle</button>
                <button onclick=&quot;deleteTodo(\${todo.id})&quot; style=&quot;background: #dc3545&quot;>Delete</button>
            </div>
        \`;
        todoList.appendChild(li);
    });
}

renderTodos();" line_count="54" />
<write_to_file path="todo-app/README.md" content="# Todo App

A simple todo list application built with vanilla JavaScript.

## Features
- Add todos
- Mark as complete
- Delete todos
- Persistent storage

## Usage
Open index.html in your browser." line_count="12" />

User: "create a React app with TypeScript"
YOU MUST RESPOND (FOLLOW ORDER: HTML → CSS → JS/TS → CONFIG → DOCS):
<create_folder path="react-app" />
<create_folder path="react-app/src" />
<create_folder path="react-app/public" />
<write_to_file path="react-app/public/index.html" content="<!DOCTYPE html>
<html lang=&quot;en&quot;>
<head>
    <meta charset=&quot;UTF-8&quot;>
    <meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;>
    <title>React App</title>
</head>
<body>
    <div id=&quot;root&quot;></div>
</body>
</html>" line_count="10" />
<write_to_file path="react-app/src/App.css" content=".App {
    text-align: center;
    padding: 20px;
}

.App-header {
    background-color: #282c34;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
}" line_count="13" />
<write_to_file path="react-app/src/App.tsx" content="import React from 'react';
import './App.css';

function App() {
    return (
        <div className=&quot;App&quot;>
            <header className=&quot;App-header&quot;>
                <h1>Welcome to React with TypeScript</h1>
                <p>Start building your app!</p>
            </header>
        </div>
    );
}

export default App;" line_count="15" />
<write_to_file path="react-app/src/index.tsx" content="import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);" line_count="13" />
<write_to_file path="react-app/package.json" content="{
  &quot;name&quot;: &quot;react-app&quot;,
  &quot;version&quot;: &quot;1.0.0&quot;,
  &quot;scripts&quot;: {
    &quot;start&quot;: &quot;react-scripts start&quot;,
    &quot;build&quot;: &quot;react-scripts build&quot;,
    &quot;test&quot;: &quot;react-scripts test&quot;
  },
  &quot;dependencies&quot;: {
    &quot;react&quot;: &quot;^18.2.0&quot;,
    &quot;react-dom&quot;: &quot;^18.2.0&quot;,
    &quot;typescript&quot;: &quot;^5.0.0&quot;
  }
}" line_count="14" />
<write_to_file path="react-app/tsconfig.json" content="{
  &quot;compilerOptions&quot;: {
    &quot;target&quot;: &quot;ES2020&quot;,
    &quot;lib&quot;: [&quot;ES2020&quot;, &quot;DOM&quot;],
    &quot;jsx&quot;: &quot;react-jsx&quot;,
    &quot;module&quot;: &quot;ESNext&quot;,
    &quot;moduleResolution&quot;: &quot;bundler&quot;,
    &quot;strict&quot;: true,
    &quot;esModuleInterop&quot;: true
  }
}" line_count="11" />
<write_to_file path="react-app/README.md" content="# React TypeScript App

## Installation
\`\`\`bash
npm install
\`\`\`

## Development
\`\`\`bash
npm start
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`" line_count="16" />

SELF-HEALING EXAMPLE:
If error occurs: &quot;Module not found&quot;
<read_file path=&quot;package.json&quot; />
<write_to_file path=&quot;package.json&quot; content=&quot;{...fixed dependencies...}&quot; line_count=&quot;20&quot; />
<run_command command=&quot;npm install&quot; />

REMEMBER: 
1. ALWAYS create files in order: HTML → CSS → JS → CONFIG → DOCS → OTHERS
2. Support ALL file types (.py, .java, .go, .rs, .php, .rb, .swift, .kt, .sql, .graphql, etc.)
3. If errors occur, use tools to read, fix, and verify
4. ALWAYS use XML tags - the system executes them!`;

    return [
      base,
      personaLine,
      modeLine,
      agentLine,
      taskTypeLine,
      autoApproveLine,
      contextLimitLine,
      toolsLine,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = webview.cspSource;

    const modeOptions = MODES.map(
      (m) =>
        `<option value="${m.id}">${m.shortLabel} ${m.label}</option>`
    ).join("");

    const personaOptions = PERSONAS.map(
      (p) =>
        `<option value="${p.id}">${p.label}</option>`
    ).join("");

    const modelOptions = TOP_FREE_MODELS.map(
      (id) => `<option value="${id}">${id}</option>`
    ).join("");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${csp} https: data:; style-src 'unsafe-inline' ${csp}; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibe</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        transition: all 0.3s ease;
      }
      .root {
        display: flex;
        flex-direction: column;
        height: 100vh;
        min-height: 0;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        transition: all 0.3s ease;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      .brand span.icon {
        font-size: 16px;
        transition: all 0.3s ease;
      }
      .modes {
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.3s ease;
      }
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      select, button.small {
        font-size: 11px;
        transition: all 0.3s ease;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
      }

      /* Glossy effect for select elements */
      select {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-dropdown-background, #3c3c3c) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-dropdown-background, #3c3c3c) 80%, white 20%) 100%);
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vscode-dropdown-foreground, #cccccc) 20%, white 80%);
      }
      select:hover {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-dropdown-background, #3c3c3c) 90%, white 10%) 0%,
          color-mix(in srgb, var(--vscode-dropdown-background, #3c3c3c) 70%, white 30%) 100%);
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vscode-dropdown-foreground, #cccccc) 30%, white 70%),
                    0 0 8px rgba(100, 150, 255, 0.3);
        transform: translateY(-1px);
      }
      .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        background: linear-gradient(to bottom,
          color-mix(in srgb, var(--vscode-editor-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-editor-background) 100%, black 5%) 100%);
      }
      .tab {
        padding: 6px;
        cursor: pointer;
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-background, #007acc) 30%, white 70%) 0%,
          color-mix(in srgb, var(--vscode-button-background, #007acc) 10%, white 90%) 100%);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }
      .tab::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 20%,
          rgba(255, 255, 255, 0.3) 30%,
          rgba(255, 255, 255, 0.1) 40%,
          transparent 50%);
        transform: rotate(25deg) translateX(-100%);
        transition: all 0.5s ease;
      }
      .tab:hover {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-toolbar-hoverBackground, #005a9e) 20%, white 80%) 0%,
          color-mix(in srgb, var(--vscode-toolbar-hoverBackground, #005a9e) 5%, white 95%) 100%);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4), 0 0 15px rgba(100, 150, 255, 0.5);
      }
      .tab:hover::before {
        transform: rotate(25deg) translateX(100%);
      }
      .tab.active {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-background, #007acc) 80%, white 20%) 0%,
          color-mix(in srgb, var(--vscode-button-background, #007acc) 50%, white 50%) 100%);
        color: var(--vscode-button-foreground);
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0, 122, 204, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }
      .tab.active:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 122, 204, 0.7), 0 0 15px rgba(100, 150, 255, 0.6);
      }
      .tab-icon {
        font-size: 16px;
        transition: all 0.3s ease;
      }
      .tab:hover .tab-icon {
        transform: scale(1.2) rotate(5deg);
      }
      .content {
        flex: 1;
        display: flex;
        min-height: 0;
        overflow: hidden;
      }
      .chat-column {
        flex: 2;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--vscode-panel-border);
        min-width: 0;
        position: relative;
        height: 100%;
        transition: all 0.4s ease;
      }
      .chat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        position: relative; /* Ensure positioning context for welcome message */
      }
      .section-content {
        display: none;
        height: 100%;
        transition: all 0.4s ease;
      }
      .section-content.active {
        display: flex;
        flex-direction: column;
        height: 100%;
        animation: fadeInSlide 0.3s ease-out forwards;
      }

      @keyframes fadeInSlide {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      .messages {
        flex: 1;
        padding: 8px;
        overflow-y: auto;
        font-size: 12px;
        min-height: 0;
        line-height: 1.4;
        scroll-behavior: smooth;
        transition: all 0.3s ease;
      }

      /* Custom scrollbar styling */
      .messages::-webkit-scrollbar {
        width: 8px;
      }

      .messages::-webkit-scrollbar-track {
        background: var(--vscode-scrollbar-shadow, #f0f0f0);
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background, #c0c0c0);
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground, #a0a0a0);
      }
      .chat-column.chat {
        background-color: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-tab-activeBackground) 5%);
      }
      .chat-column.agent {
        background-color: color-mix(in srgb, var(--vscode-sideBar-background) 95%, var(--vscode-tab-activeBackground) 5%);
      }
      .input-row {
        border-top: 1px solid var(--vscode-panel-border);
        padding: 8px;
        flex-shrink: 0;
        background-color: var(--vscode-input-background, var(--vscode-editor-background));
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sidebar {
        flex: 1;
        display: flex;
        flex-direction: column;
        font-size: 11px;
        min-width: 0;
        overflow: hidden;
      }
      .sidebar-section {
        padding: 6px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        min-height: 0;
        overflow-y: auto;
        max-height: 200px; /* Limit height and enable scrolling for long lists */
      }

      /* Custom scrollbar for sidebar sections */
      .sidebar-section::-webkit-scrollbar {
        width: 6px;
      }

      .sidebar-section::-webkit-scrollbar-track {
        background: var(--vscode-scrollbar-shadow, #f0f0f0);
        border-radius: 3px;
      }

      .sidebar-section::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background, #c0c0c0);
        border-radius: 3px;
      }

      .sidebar-section::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground, #a0a0a0);
      }

      .message {
        margin-bottom: 10px;
        padding: 6px 8px;
        border-radius: 6px;
        border-left: 3px solid transparent;
        cursor: pointer; /* Indicates message is clickable for copying */
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-sideBar-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-sideBar-background) 80%, white 20%) 100%);
      }
      .message::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 20%,
          rgba(255, 255, 255, 0.2) 30%,
          transparent 50%);
        transform: rotate(25deg) translateX(-100%);
        transition: all 0.5s ease;
      }
      .message:hover {
        transform: translateX(5px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      }
      .message:hover::before {
        transform: rotate(25deg) translateX(100%);
      }
      .message.user {
        color: var(--vscode-debugTokenExpression-string);
        border-left-color: var(--vscode-debugTokenExpression-string);
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-debugTokenExpression-string) 10%) 0%,
          color-mix(in srgb, var(--vscode-editor-background) 80%, var(--vscode-debugTokenExpression-string) 20%) 100%);
      }
      .message.assistant {
        color: var(--vscode-debugTokenExpression-number);
        border-left-color: var(--vscode-debugTokenExpression-number);
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-debugTokenExpression-number) 5%) 0%,
          color-mix(in srgb, var(--vscode-editor-background) 80%, var(--vscode-debugTokenExpression-number) 10%) 100%);
      }
      .message-content {
        margin: 0;
        padding: 0;
        line-height: 1.5;
      }
      textarea {
        width: 100%;
        resize: vertical;
        min-height: 48px;
        max-height: 150px;
        font-family: inherit;
        font-size: 12px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-input-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-input-background) 80%, white 20%) 100%);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
        padding: 6px;
        box-sizing: border-box;
        transition: all 0.3s ease;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      textarea:focus {
        outline: 1px solid var(--vscode-focusBorder);
        border-color: var(--vscode-focusBorder);
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 8px rgba(100, 150, 255, 0.4);
      }
      .input-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
        font-size: 11px;
      }

      .input-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .modes-personas-models {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .input-buttons {
        display: flex;
        gap: 4px;
      }
      .input-hint {
        margin-top: 4px;
      }
      .welcome-message {
        position: absolute;
        top: 40%; /* Moved up from 50% */
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--vscode-input-placeholderForeground, #767676);
        font-size: 18px; /* Increased size */
        font-weight: 500; /* Slightly bolder */
        pointer-events: none; /* Allow clicks to pass through to messages area */
        text-align: center;
        opacity: 0.7; /* Slightly more visible */
        z-index: 0;
        transition: all 0.5s ease;
        animation: glow 2s infinite alternate;
      }

      @keyframes glow {
        from { text-shadow: 0 0 5px rgba(100, 150, 255, 0.5); }
        to { text-shadow: 0 0 15px rgba(100, 150, 255, 0.8), 0 0 20px rgba(100, 150, 255, 0.6); }
      }
      .messages {
        z-index: 1; /* Ensure messages appear above the welcome message */
        padding: 8px;
        overflow-y: auto;
        /* Custom scrollbar styling */
        overflow-x: hidden; /* Hide horizontal scrollbar if not needed */
      }

      /* Custom scrollbar styling */
      .messages::-webkit-scrollbar {
        width: 8px;
      }

      .messages::-webkit-scrollbar-track {
        background: var(--vscode-scrollbar-shadow, #f0f0f0);
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background, #c0c0c0);
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground, #a0a0a0);
      }
      .sidebar-section {
        padding: 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
        min-height: 0;
        overflow-y: auto;
      }
      .settings-group {
        margin-bottom: 16px;
        padding: 8px;
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 6px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-input-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-input-background) 80%, white 20%) 100%);
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      .settings-group:hover {
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      }
      .settings-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      .settings-group label:hover {
        color: var(--vscode-button-foreground, #ffffff);
        text-shadow: 0 0 5px rgba(100, 150, 255, 0.7);
      }
      .settings-group input,
      .settings-group select {
        width: 100%;
        padding: 6px;
        margin-bottom: 6px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-input-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-input-background) 80%, white 20%) 100%);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 4px;
        box-sizing: border-box;
        transition: all 0.3s ease;
      }
      .settings-group input:hover,
      .settings-group select:hover {
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.3);
      }
      .settings-group input:focus,
      .settings-group select:focus {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.4);
      }
      .settings-group button {
        width: 100%;
        padding: 6px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 70%, white 30%) 0%,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 40%, white 60%) 100%);
        color: var(--vscode-button-foreground, white);
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }
      .settings-group button::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg,
          transparent 0%,
          rgba(255, 255, 255, 0.2) 20%,
          rgba(255, 255, 255, 0.4) 30%,
          rgba(255, 255, 255, 0.2) 40%,
          transparent 50%);
        transform: rotate(25deg) translateX(-100%);
        transition: all 0.5s ease;
      }
      .settings-group button:hover {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-hoverBackground, #0062A3) 60%, white 40%) 0%,
          color-mix(in srgb, var(--vscode-button-hoverBackground, #0062A3) 30%, white 70%) 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3), 0 0 12px rgba(100, 150, 255, 0.5);
      }
      .settings-group button:hover::before {
        transform: rotate(25deg) translateX(100%);
      }
      .settings-intro {
        text-align: center;
        margin-bottom: 16px;
        padding: 8px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-sideBarSectionHeader-background) 95%, white 5%) 0%,
          color-mix(in srgb, var(--vscode-sideBarSectionHeader-background) 80%, white 20%) 100%);
        border-radius: 6px;
        transition: all 0.3s ease;
      }
      .settings-intro:hover {
        box-shadow: 0 0 15px rgba(100, 150, 255, 0.4);
        transform: scale(1.02);
      }
      .sidebar-section h3 {
        margin: 0 0 4px;
        font-size: 11px;
        text-transform: uppercase;
        transition: all 0.3s ease;
        position: relative;
        display: inline-block;
      }
      .sidebar-section h3::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(to right, transparent, var(--vscode-button-background, #007ACC), transparent);
      }
      .sidebar-section h3:hover {
        color: var(--vscode-button-foreground, #ffffff);
        text-shadow: 0 0 5px rgba(100, 150, 255, 0.7);
        transform: translateX(3px);
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .pill {
        padding: 2px 6px;
        border-radius: 999px;
        border: 1px solid var(--vscode-panel-border);
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 20%, white 80%) 0%,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 5%, white 95%) 100%);
      }
      .pill::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 20%,
          rgba(255, 255, 255, 0.2) 30%,
          transparent 50%);
        transform: rotate(25deg) translateX(-100%);
        transition: all 0.5s ease;
      }
      .pill:hover {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-hoverBackground, #0062A3) 10%, white 90%) 0%,
          color-mix(in srgb, var(--vscode-button-hoverBackground, #0062A3) 0%, white 100%) 100%);
        transform: translateY(-1px) scale(1.05);
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.4);
      }
      .pill:hover::before {
        transform: rotate(25deg) translateX(100%);
      }
      .pill.active {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 80%, white 20%) 0%,
          color-mix(in srgb, var(--vscode-button-background, #007ACC) 50%, white 50%) 100%);
        box-shadow: 0 0 8px rgba(0, 122, 204, 0.4);
      }
      .muted {
        opacity: 0.8;
        transition: all 0.3s ease;
      }

      /* Enhanced button styles */
      button {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        border-radius: 4px;
      }

      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      button:active {
        transform: translateY(0) scale(0.98);
      }

      /* Pulsing animation for interactive elements */
      .pulse {
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(100, 150, 255, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(100, 150, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(100, 150, 255, 0); }
      }

      /* Enhanced input focus effects */
      input:focus, select:focus {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 1px;
      }

      /* Smooth scroll behavior */
      html {
        scroll-behavior: smooth;
      }

      /* Floating animation for icons */
      .floating-icon {
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0px); }
      }

      /* Vibe-specific hover effect */
      .vibe-hover {
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .vibe-hover:hover {
        filter: brightness(1.1) saturate(1.2);
        transform: scale(1.02);
      }

      .input-buttons {
        transition: all 0.3s ease;
      }

      .input-buttons:hover {
        transform: scale(1.05);
      }

      /* Theme-specific styles */
      .theme-neon {
        --vibe-primary: #ff00ff;
        --vibe-secondary: #00ffff;
        --vibe-glow: 0 0 15px rgba(255, 0, 255, 0.7), 0 0 30px rgba(0, 255, 255, 0.5);
      }

      .theme-sunset {
        --vibe-primary: #ff6b35;
        --vibe-secondary: #f7931e;
        --vibe-glow: 0 0 10px rgba(255, 107, 53, 0.6), 0 0 20px rgba(247, 147, 30, 0.4);
      }

      .theme-ocean {
        --vibe-primary: #00c8ff;
        --vibe-secondary: #0077ff;
        --vibe-glow: 0 0 10px rgba(0, 200, 255, 0.6), 0 0 20px rgba(0, 119, 255, 0.4);
      }

      .theme-matrix {
        --vibe-primary: #00ff41;
        --vibe-secondary: #00b800;
        --vibe-glow: 0 0 10px rgba(0, 255, 65, 0.7), 0 0 20px rgba(0, 184, 0, 0.5);
      }

      /* Apply theme glow effects */
      .theme-neon .tab:hover,
      .theme-neon .settings-group button:hover,
      .theme-neon .pill:hover,
      .theme-neon textarea:focus {
        box-shadow: var(--vibe-glow), 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .theme-sunset .tab:hover,
      .theme-sunset .settings-group button:hover,
      .theme-sunset .pill:hover,
      .theme-sunset textarea:focus {
        box-shadow: var(--vibe-glow), 0 4px 12px rgba(255, 107, 53, 0.3);
      }

      .theme-ocean .tab:hover,
      .theme-ocean .settings-group button:hover,
      .theme-ocean .pill:hover,
      .theme-ocean textarea:focus {
        box-shadow: var(--vibe-glow), 0 4px 12px rgba(0, 200, 255, 0.3);
      }

      .theme-matrix .tab:hover,
      .theme-matrix .settings-group button:hover,
      .theme-matrix .pill:hover,
      .theme-matrix textarea:focus {
        box-shadow: var(--vibe-glow), 0 4px 12px rgba(0, 255, 65, 0.3);
      }
    </style>
  </head>
  <body>
    <div class="root">
      <header>
        <div class="brand">
          <span class="icon floating-icon">✨</span>
          <span class="vibe-hover">Vibe</span>
        </div>
        <div class="toolbar-right">
          <select id="themeSelector" style="margin-right: 4px;">
            <option value="default">Default</option>
            <option value="neon">Neon</option>
            <option value="sunset">Sunset</option>
            <option value="ocean">Ocean</option>
            <option value="matrix">Matrix</option>
          </select>
        </div>
      </header>
      <div class="main">
        <div class="tabs">
          <div class="tab active" data-tab="chat" title="Chat">
            <span class="tab-icon">💬</span>
          </div>
          <div class="tab" data-tab="settings" title="Settings">
            <span class="tab-icon">⚙️</span>
          </div>
          <div class="tab" data-tab="history" title="History">
            <span class="tab-icon">🕒</span>
          </div>
          <div class="tab" data-tab="newchat" title="New Chat">
            <span class="tab-icon">➕</span>
          </div>
          <div class="tab" data-tab="profile" title="Profile">
            <span class="tab-icon">👤</span>
          </div>
        </div>
        <div class="content">
          <div class="chat-column">
            <!-- Chat content section -->
            <div id="chat-content" class="section-content active">
              <div class="chat-content">
                <div class="messages" id="messages"></div>
                <div id="welcome-message" class="welcome-message">
                  What can I do for you?
                </div>
              </div>
              <div class="input-row">
                <textarea id="input" placeholder="Type your task here…"></textarea>
                <div class="input-actions">
                  <div class="input-controls">
                    <div class="modes-personas-models">
                      <select id="modeSelect" style="margin-right: 4px;">
                        ${modeOptions}
                      </select>
                      <select id="personaSelect" style="margin-right: 4px;">
                        ${personaOptions}
                      </select>
                      <select id="modelSelect">
                        ${modelOptions}
                      </select>
                    </div>
                    <div class="input-buttons">
                      <button class="small" id="clearChatBtn">Clear</button>
                      <button class="small" id="sendBtn">Send</button>
                    </div>
                  </div>
                  <div class="input-hint">
                    <span class="muted">Enter to send, Shift+Enter for newline</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Settings content section -->
            <div id="settings-content" class="section-content">
              <div class="sidebar-section" style="flex: 1; overflow-y: auto;">
                <h3>Vibe Settings</h3>
                <div class="settings-intro">
                  <p>🚀 Vibe v4.0.0 - 4 Providers, 40+ Models</p>
                  <button id="vscodeSettingsBtn" style="margin-top: 8px; padding: 6px 12px; font-size: 11px;">Open Vibe Settings</button>
                </div>

                <div class="settings-group">
                  <label for="providerSelect">Provider (Auto-Fallback Enabled)</label>
                  <select id="providerSelect">
                    <option value="openrouter">OpenRouter (6 models)</option>
                    <option value="megallm">MegaLLM (12 models)</option>
                    <option value="agentrouter">AgentRouter (7 models)</option>
                    <option value="routeway">Routeway (6 models)</option>
                  </select>
                  <button id="saveProviderBtn">Save Provider</button>
                </div>

                <div class="settings-group">
                  <label for="openRouterApiKeyInput">OpenRouter API Key</label>
                  <input type="password" id="openRouterApiKeyInput" placeholder="Enter OpenRouter API key">
                  <button id="saveOpenRouterKeyBtn">Save OpenRouter Key</button>
                </div>

                <div class="settings-group">
                  <label for="megaLlmApiKeyInput">MegaLLM API Key</label>
                  <input type="password" id="megaLlmApiKeyInput" placeholder="Enter MegaLLM API key">
                  <button id="saveMegaLlmKeyBtn">Save MegaLLM Key</button>
                </div>

                <div class="settings-group">
                  <label for="agentRouterApiKeyInput">AgentRouter API Key (Claude Access)</label>
                  <input type="password" id="agentRouterApiKeyInput" placeholder="Enter AgentRouter API key">
                  <button id="saveAgentRouterKeyBtn">Save AgentRouter Key</button>
                </div>

                <div class="settings-group">
                  <label for="routewayApiKeyInput">Routeway API Key</label>
                  <input type="password" id="routewayApiKeyInput" placeholder="Enter Routeway API key">
                  <button id="saveRoutewayKeyBtn">Save Routeway Key</button>
                </div>

                <div class="settings-group">
                  <label for="modelSelect">Default Model</label>
                  <select id="modelSelect">
                    ${modelOptions}
                  </select>
                  <button id="saveModelBtn">Save Model</button>
                </div>

                <div class="settings-group">
                  <label for="maxContextFilesInput">Max Context Files</label>
                  <input type="number" id="maxContextFilesInput" placeholder="Max number of files">
                  <button id="saveMaxContextFilesBtn">Save Max Context Files</button>
                </div>

                <div class="settings-group">
                  <label for="autoApproveCheckbox">
                    <input type="checkbox" id="autoApproveCheckbox"> Auto-approve unsafe operations
                  </label>
                  <button id="saveAutoApproveBtn">Save Auto-approve Setting</button>
                </div>

                <div class="settings-group">
                  <h4>Kilo Code Tools</h4>
                  <p class="muted">Vibe has access to powerful tools for file operations:</p>
                  <div style="margin: 8px 0; max-height: 150px; overflow-y: auto;">
                    <ul style="font-size: 11px; margin: 0; padding-left: 20px;">
                      <li><strong>read_file</strong>: Read file contents with line numbers</li>
                      <li><strong>search_files</strong>: Search across multiple files with regex</li>
                      <li><strong>list_files</strong>: List directory contents</li>
                      <li><strong>list_code_definition_names</strong>: Extract code definitions from files</li>
                      <li><strong>apply_diff</strong>: Apply precise changes to files</li>
                      <li><strong>write_to_file</strong>: Create or overwrite file contents</li>
                    </ul>
                  </div>
                  <p class="muted">These tools can be used by the AI to help with coding tasks.</p>
                </div>

                <div class="settings-group">
                  <h4>How to Use</h4>
                  <p class="muted">The AI can automatically use these tools when needed. You can also specify tool usage by mentioning them in your requests.</p>
                  <div style="margin-top: 8px; padding: 8px; background-color: var(--vscode-textCodeBlock-background, #f0f0f0); border-radius: 4px; font-family: monospace; font-size: 10px;">
                    Examples:<br>
                    <code>&lt;read_file path="src/extension.ts"&gt;&lt;/read_file&gt;</code><br>
                    <code>&lt;search_files path="src" regex="function.*handle.*"&gt;&lt;/search_files&gt;</code><br>
                    <code>&lt;list_files path="."&gt;&lt;/list_files&gt;</code><br>
                    <code>&lt;write_to_file path="newFile.js" content="..." line_count="10"&gt;&lt;/write_to_file&gt;</code>
                  </div>
                </div>
              </div>
            </div>

            <!-- History content section -->
            <div id="history-content" class="section-content">
              <div class="sidebar-section" style="flex: 1; overflow-y: auto;">
                <h3>Chat History</h3>
                <div id="history-list" style="margin-top: 8px;">
                  <div class="muted" style="padding: 8px;">No chat history available yet.</div>
                </div>
              </div>
            </div>

            <!-- New Chat content section -->
            <div id="newchat-content" class="section-content">
              <div class="sidebar-section" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 48px; margin-bottom: 10px;">💬</div>
                  <h3 style="margin: 0 0 10px 0;">Start a New Chat</h3>
                  <p class="muted">Begin a new conversation with Vibe</p>
                </div>
                <button id="startNewChatBtn" style="padding: 10px 20px; font-size: 14px;">Start New Chat</button>
              </div>
            </div>

            <!-- Profile content section -->
            <div id="profile-content" class="section-content">
              <div class="sidebar-section" style="flex: 1; overflow-y: auto;">
                <h3>Profile</h3>
                <div style="padding: 8px 0;">
                  <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div style="font-size: 40px; margin-right: 15px;">👤</div>
                    <div>
                      <h4 style="margin: 0;">Vibe User</h4>
                      <div class="muted">Active since today</div>
                    </div>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <h5 style="margin: 0 0 8px 0;">Usage Stats</h5>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                      <div style="border: 1px solid var(--vscode-panel-border); padding: 8px; border-radius: 4px;">
                        <div class="muted">Chats</div>
                        <div style="font-weight: bold;">0</div>
                      </div>
                      <div style="border: 1px solid var(--vscode-panel-border); padding: 8px; border-radius: 4px;">
                        <div class="muted">Messages</div>
                        <div style="font-weight: bold;">0</div>
                      </div>
                      <div style="border: 1px solid var(--vscode-panel-border); padding: 8px; border-radius: 4px;">
                        <div class="muted">Tokens</div>
                        <div style="font-weight: bold;">0</div>
                      </div>
                      <div style="border: 1px solid var(--vscode-panel-border); padding: 8px; border-radius: 4px;">
                        <div class="muted">Models</div>
                        <div style="font-weight: bold;">0</div>
                      </div>
                    </div>
                  </div>
                  <div style="margin-top: 20px;">
                    <h5 style="margin: 0 0 8px 0;">Preferences</h5>
                    <div class="muted">Customize your Vibe experience</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="sidebar">
          </div>
        </div>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      let currentMode = "code";
      let currentTab = "chat";
      let isAgent = false;

      // Flags to prevent UI feedback loops
      let updatingModeSelect = false;
      let updatingPersonaSelect = false;
      let updatingModelSelect = false;
      let shouldAutoScroll = true;
      let thinkingElementId = null;
      let thinkingInterval = null;

      function selectMode(id) {
        if (updatingModeSelect) return; // Prevent recursive updates

        currentMode = id;
        const select = document.getElementById("modeSelect");
        if (select) {
          updatingModeSelect = true;
          select.value = id;
          // Use a timeout to reset the flag after the UI update is complete
          setTimeout(() => {
            updatingModeSelect = false;
          }, 0);
        }
        vscode.postMessage({ type: "setMode", mode: id });
      }

      function appendMessage(role, content, elementId = null) {
        const container = document.getElementById("messages");
        const div = document.createElement("div");
        div.className = "message " + role;

        // Create content with copy functionality
        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        contentDiv.textContent = (role === "user" ? "You: " : "Vibe: ") + content;

        // Add click handler to copy message content
        contentDiv.addEventListener("click", (e) => {
          // Only copy if clicking on the message content, not on other elements
          if (e.target === contentDiv) {
            navigator.clipboard.writeText(content).then(() => {
              // Optional: Show a temporary visual feedback
              const originalContent = contentDiv.textContent;
              contentDiv.textContent = "Copied!";
              setTimeout(() => {
                contentDiv.textContent = originalContent;
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy message: ', err);
            });
          }
        });

        div.appendChild(contentDiv);

        // If there's an element ID, set it for replacement later
        if (elementId) {
          div.id = elementId;
          contentDiv.style.fontStyle = "italic";
          contentDiv.style.opacity = "0.7";
        }

        container.appendChild(div);

        // Hide welcome message when messages exist
        const welcomeMessage = document.getElementById("welcome-message");
        if (welcomeMessage) {
          welcomeMessage.style.display = "none";
        }

        // Scroll to bottom if auto-scroll is enabled
        if (shouldAutoScroll) {
          scrollToBottom();
        }
      }

      function scrollToBottom() {
        const container = document.getElementById("messages");
        if (container) {
          // Use a timeout to ensure the scroll happens after DOM update
          setTimeout(() => {
            // Use smooth scrolling behavior if available, otherwise instant scroll
            if ('scrollBehavior' in document.documentElement.style) {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
              });
            } else {
              container.scrollTop = container.scrollHeight;
            }
          }, 10);
        }
      }

      function setModeSummary(text) {
        const el = document.getElementById("modeSummary");
        if (el) el.textContent = text;
      }

      function initializeTabState() {
        // Apply initial background class based on current tab
        const chatColumn = document.querySelector(".chat-column");
        if (chatColumn) {
          chatColumn.className = chatColumn.className.replace(/(chat|agent)\s*/g, '');
          if (currentTab === "chat") { // Only chat remains
            chatColumn.classList.add(currentTab);
          }
        }

        // Set initial active content section
        document.querySelectorAll(".section-content").forEach(section => {
          section.classList.remove("active");
        });
        const initialSection = document.getElementById(currentTab + "-content");
        if (initialSection) {
          initialSection.classList.add("active");
        }
      }

      function setPersonas(personas) {
        const pills = document.getElementById("personaPills");
        pills.innerHTML = "";
        personas.forEach(p => {
          const pill = document.createElement("div");
          pill.className = "pill";
          pill.textContent = p.label;
          pill.dataset.id = p.id;
          pill.addEventListener("click", () => {
            document.querySelectorAll(".pill").forEach(x => x.classList.remove("active"));
            pill.classList.add("active");
            vscode.postMessage({ type: "setPersona", personaId: p.id });
            const select = document.getElementById("personaSelect");
            if (select) {
              updatingPersonaSelect = true;
              select.value = p.id;
              // Use a timeout to reset the flag after the UI update is complete
              setTimeout(() => {
                updatingPersonaSelect = false;
              }, 0);
            }
          });
          pills.appendChild(pill);
        });
      }

      // Function to update UI without triggering events
      function updateModeUI(id) {
        currentMode = id;
        const select = document.getElementById("modeSelect");
        if (select) {
          updatingModeSelect = true;
          select.value = id;
          // Use a timeout to reset the flag after the UI update is complete
          setTimeout(() => {
            updatingModeSelect = false;
          }, 0);
        }
        setModeSummary(getModeLabel(id));
      }

      // Helper function to get mode label
      function getModeLabel(modeId) {
        const modes = [
          {id:"architect", label:"Architect", description:"Plan and design before implementation"},
          {id:"code", label:"Code", description:"Write, modify, and refactor code"},
          {id:"ask", label:"Ask", description:"Get answers and explanations"},
          {id:"debug", label:"Debug", description:"Diagnose and fix software issues"},
          {id:"orchestrator", label:"Orchestrator", description:"Coordinate tasks across modes"},
          {id:"project-research", label:"Project Research", description:"Investigate and analyze codebase"}
        ];
        const mode = modes.find(m => m.id === modeId);
        return mode ? mode.label + " — " + mode.description : "";
      }

      window.addEventListener("message", event => {
        const msg = event.data;
        switch (msg.type) {
          case "init":
            if (msg.modes) {
              const mode = msg.modes.find(m => m.id === msg.currentMode) || msg.modes[0];
              if (mode) {
                updateModeUI(mode.id);
                setModeSummary(mode.label + " — " + mode.description);
              }
            }
            if (msg.personas) {
              setPersonas(msg.personas);
              const select = document.getElementById("personaSelect");
              const agentSelect = document.getElementById("agentPersonaSelect");
              if (select && msg.currentPersonaId) {
                updatingPersonaSelect = true;
                select.value = msg.currentPersonaId;
                // Use a timeout to reset the flag after the UI update is complete
                setTimeout(() => {
                  updatingPersonaSelect = false;
                }, 0);
              }
            }
            if (msg.currentModelId) {
              const sel = document.getElementById("modelSelect");
              if (sel) {
                updatingModelSelect = true;
                sel.value = msg.currentModelId;
                // Use a timeout to reset the flag after the UI update is complete
                setTimeout(() => {
                  updatingModelSelect = false;
                }, 0);
              }
            }
            // Initialize the API key inputs with the current keys
            if (msg.settings) {
              // Set the provider selection
              const providerSelect = document.getElementById("providerSelect");
              if (providerSelect) {
                providerSelect.value = msg.settings.provider;
              }

              // Set the API key inputs based on provider
              const openRouterInput = document.getElementById("openRouterApiKeyInput");
              const megaLlmInput = document.getElementById("megaLlmApiKeyInput");
              const agentRouterInput = document.getElementById("agentRouterApiKeyInput");
              const routewayInput = document.getElementById("routewayApiKeyInput");
              const maxContextFilesInput = document.getElementById("maxContextFilesInput");
              const autoApproveCheckbox = document.getElementById("autoApproveCheckbox");

              if (openRouterInput) {
                openRouterInput.value = msg.settings.openrouterApiKey;
              }
              if (megaLlmInput) {
                megaLlmInput.value = msg.settings.megallmApiKey;
              }
              if (agentRouterInput) {
                agentRouterInput.value = msg.settings.agentrouterApiKey;
              }
              if (routewayInput) {
                routewayInput.value = msg.settings.routewayApiKey;
              }
              if (maxContextFilesInput) {
                maxContextFilesInput.value = msg.settings.maxContextFiles;
              }
              if (autoApproveCheckbox) {
                autoApproveCheckbox.checked = msg.settings.autoApproveUnsafeOps;
              }
            }
            break;
          case "setMode":
            updateModeUI(msg.mode);
            if (msg.modeLabel && msg.modeDescription) {
              setModeSummary(msg.modeLabel + " — " + msg.modeDescription);
            }
            break;
          case "thinkingStart":
            // Clear any existing thinking interval
            if (thinkingInterval) {
              clearInterval(thinkingInterval);
              thinkingInterval = null;
            }
            
            const messagesContainer = document.getElementById("messages");
            if (!messagesContainer) break;
            
            // Add a thinking message with rotating text
            thinkingElementId = "thinking-" + Date.now();
            const thinkingDiv = document.createElement("div");
            thinkingDiv.id = thinkingElementId;
            thinkingDiv.className = "message assistant";
            thinkingDiv.style.fontStyle = "italic";
            thinkingDiv.style.opacity = "0.7";
            
            // Rotating thinking messages
            const thinkingMessages = [
              "Vibe: Thinking... 🤔",
              "Vibe: Generating code... ✨",
              "Vibe: Please wait... ⏳",
              "Vibe: Processing... 🧠",
              "Vibe: Creating files... 📝",
              "Vibe: Almost there... 🚀",
              "Vibe: Working on it... ⚡"
            ];
            let msgIndex = 0;
            thinkingDiv.textContent = thinkingMessages[0];
            
            // Rotate messages every 2 seconds
            thinkingInterval = setInterval(() => {
              msgIndex = (msgIndex + 1) % thinkingMessages.length;
              const elem = document.getElementById(thinkingElementId);
              if (elem) {
                elem.textContent = thinkingMessages[msgIndex];
              } else {
                clearInterval(thinkingInterval);
                thinkingInterval = null;
              }
            }, 2000);
            
            messagesContainer.appendChild(thinkingDiv);
            scrollToBottom();
            break;
          case "assistantMessage":
            // Clear thinking interval
            if (thinkingInterval) {
              clearInterval(thinkingInterval);
              thinkingInterval = null;
            }
            
            if (thinkingElementId) {
              // Find the thinking element and replace its content with the actual response
              const thinkingElement = document.getElementById(thinkingElementId);
              if (thinkingElement) {
                thinkingElement.textContent = "Vibe: " + msg.content;
                thinkingElement.style.fontStyle = "normal";
                thinkingElement.style.opacity = "1";
                thinkingElementId = null; // Reset the ID
              }
            } else {
              // If no thinking element, just append the message normally
              appendMessage("assistant", msg.content);
            }
            scrollToBottom();
            break;
          case "thinkingStop":
            // Clear thinking interval and remove thinking element
            if (thinkingInterval) {
              clearInterval(thinkingInterval);
              thinkingInterval = null;
            }
            if (thinkingElementId) {
              const elem = document.getElementById(thinkingElementId);
              if (elem) {
                elem.remove();
              }
              thinkingElementId = null;
            }
            break;
          case "toolSuccess":
            // Display success messages in chat
            if (msg.messages && Array.isArray(msg.messages)) {
              msg.messages.forEach(successMsg => {
                appendMessage("assistant", successMsg);
              });
              scrollToBottom();
            }
            break;
          case "context":
            const area = document.getElementById("contextArea");
            if (area) {
              const parts = msg.snippets.map(s => s.uri + " [" + s.languageId + "]");
              area.textContent = parts.join("\\n");
            }
            break;
        }
      });

      document.getElementById("modeSelect").addEventListener("change", (e) => {
        if (updatingModeSelect) return; // Prevent recursive updates
        const id = e.target.value;
        selectMode(id);
      });


      function switchTab(tabName) {
        // Update tab selection
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        const activeTab = document.querySelector('.tab[data-tab="' + tabName + '"]');
        if (activeTab) {
          activeTab.classList.add("active");
        }

        // Update content section visibility
        document.querySelectorAll(".section-content").forEach(section => {
          section.classList.remove("active");
        });
        const activeSection = document.getElementById(tabName + "-content");
        if (activeSection) {
          activeSection.classList.add("active");
        }

        // Update current tab and agent mode
        currentTab = tabName;
        isAgent = tabName === "agent"; // Keep for compatibility but agent tab is removed

        // Apply different background classes based on current tab
        const chatColumn = document.querySelector(".chat-column");
        if (chatColumn) {
          chatColumn.className = chatColumn.className.replace(/(chat|agent)\s*/g, '');
          if (tabName === "chat") { // Only chat remains
            chatColumn.classList.add(tabName);
          }
        }
      }

      document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
          const tabName = tab.dataset.tab;
          switchTab(tabName);
        });
      });

      document.getElementById("sendBtn").addEventListener("click", () => {
        const input = document.getElementById("input");
        const text = input.value.trim();
        if (!text) return;
        appendMessage("user", text);

        // Add "Vibe is thinking" placeholder with the ID stored
        thinkingElementId = "thinking_" + Date.now();
        appendMessage("assistant", "Vibe is thinking...", thinkingElementId);

        vscode.postMessage({ type: "sendMessage", text, isAgent });
        input.value = "";
      });

      // Clear chat button functionality
      document.getElementById("clearChatBtn").addEventListener("click", () => {
        const messagesContainer = document.getElementById("messages");
        if (messagesContainer) {
          messagesContainer.innerHTML = "";
          // Reset the thinking element ID if it exists
          thinkingElementId = null;
          // Clear the message history in the extension
          vscode.postMessage({ type: "clearChat" });

          // Show welcome message after clearing
          const welcomeMessage = document.getElementById("welcome-message");
          if (welcomeMessage) {
            welcomeMessage.style.display = "block";
          }
        }
      });

      document.getElementById("input").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          document.getElementById("sendBtn").click();
        }
      });

      document.getElementById("input").addEventListener("focus", () => {
        // Scroll to bottom when input is focused to make sure it's visible
        setTimeout(() => {
          scrollToBottom();
          // Also ensure the input element itself is scrolled into view
          const inputElement = document.getElementById("input");
          if (inputElement) {
            inputElement.scrollIntoView({block: "nearest", behavior: "smooth"});
          }
        }, 100); // Slight delay to allow UI to update
      });

      // Agent persona select
      document.getElementById("personaSelect").addEventListener("change", (e) => {
        if (updatingPersonaSelect) return; // Prevent recursive updates
        const id = e.target.value;
        vscode.postMessage({ type: "setPersona", personaId: id });
      });

      // Agent persona select
      document.getElementById("agentPersonaSelect").addEventListener("change", (e) => {
        if (updatingPersonaSelect) return; // Prevent recursive updates
        const id = e.target.value;
        vscode.postMessage({ type: "setPersona", personaId: id });
      });

      document.getElementById("modelSelect").addEventListener("change", (e) => {
        if (updatingModelSelect) return; // Prevent recursive updates
        const id = e.target.value;
        vscode.postMessage({ type: "setModel", modelId: id });
      });


      // Provider selection handler
      document.getElementById("providerSelect").addEventListener("change", (e) => {
        const provider = e.target.value;
        if (provider === "openrouter" || provider === "megallm") {
          vscode.postMessage({ type: "setProvider", provider });
        }
      });

      // OpenRouter API key save handler
      document.getElementById("saveOpenRouterKeyBtn").addEventListener("click", () => {
        const apiKeyInput = document.getElementById("openRouterApiKeyInput");
        if (apiKeyInput) {
          const apiKey = apiKeyInput.value;
          // Temporarily set provider to openrouter to save the correct key
          const providerSelect = document.getElementById("providerSelect");
          const originalProvider = providerSelect.value;
          providerSelect.value = "openrouter";

          vscode.postMessage({ type: "setApiKey", apiKey });

          // Restore the original provider selection
          providerSelect.value = originalProvider;

          // Show a temporary confirmation
          const saveBtn = document.getElementById("saveOpenRouterKeyBtn");
          if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Saved!";
            setTimeout(() => {
              saveBtn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // MegaLLM API key save handler
      document.getElementById("saveMegaLlmKeyBtn").addEventListener("click", () => {
        const apiKeyInput = document.getElementById("megaLlmApiKeyInput");
        if (apiKeyInput) {
          const apiKey = apiKeyInput.value;
          // Temporarily set provider to megallm to save the correct key
          const providerSelect = document.getElementById("providerSelect");
          const originalProvider = providerSelect.value;
          providerSelect.value = "megallm";

          vscode.postMessage({ type: "setApiKey", apiKey });

          // Restore the original provider selection
          providerSelect.value = originalProvider;

          // Show a temporary confirmation
          const saveBtn = document.getElementById("saveMegaLlmKeyBtn");
          if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Saved!";
            setTimeout(() => {
              saveBtn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // AgentRouter API key save handler
      document.getElementById("saveAgentRouterKeyBtn").addEventListener("click", () => {
        const apiKeyInput = document.getElementById("agentRouterApiKeyInput");
        if (apiKeyInput) {
          const apiKey = apiKeyInput.value;
          const providerSelect = document.getElementById("providerSelect");
          const originalProvider = providerSelect.value;
          providerSelect.value = "agentrouter";

          vscode.postMessage({ type: "setApiKey", apiKey });

          providerSelect.value = originalProvider;

          const saveBtn = document.getElementById("saveAgentRouterKeyBtn");
          if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Saved!";
            setTimeout(() => {
              saveBtn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // Routeway API key save handler
      document.getElementById("saveRoutewayKeyBtn").addEventListener("click", () => {
        const apiKeyInput = document.getElementById("routewayApiKeyInput");
        if (apiKeyInput) {
          const apiKey = apiKeyInput.value;
          const providerSelect = document.getElementById("providerSelect");
          const originalProvider = providerSelect.value;
          providerSelect.value = "routeway";

          vscode.postMessage({ type: "setApiKey", apiKey });

          providerSelect.value = originalProvider;

          const saveBtn = document.getElementById("saveRoutewayKeyBtn");
          if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Saved!";
            setTimeout(() => {
              saveBtn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // Max context files input handler
      const maxContextFilesInput = document.getElementById("maxContextFilesInput");
      if (maxContextFilesInput) {
        maxContextFilesInput.addEventListener("change", (e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value > 0) {
            // This would need to be sent to the extension to update the setting
            // For now, we'll just show a message to indicate the functionality
            vscode.postMessage({
              type: "setMaxContextFiles",
              maxContextFiles: value
            });
          }
        });
      }

      // Auto approve checkbox handler
      const autoApproveCheckbox = document.getElementById("autoApproveCheckbox");
      if (autoApproveCheckbox) {
        autoApproveCheckbox.addEventListener("change", (e) => {
          vscode.postMessage({
            type: "setAutoApprove",
            autoApprove: e.target.checked
          });
        });
      }

      // Start new chat button handler
      const startNewChatBtn = document.getElementById("startNewChatBtn");
      if (startNewChatBtn) {
        startNewChatBtn.addEventListener("click", () => {
          // Clear current messages and start a new chat
          const messagesContainer = document.getElementById("messages");
          if (messagesContainer) {
            messagesContainer.innerHTML = "";
          }
          // Switch to chat tab
          switchTab("chat");
        });
      }

      // VS Code Settings button handler
      const vscodeSettingsBtn = document.getElementById("vscodeSettingsBtn");
      if (vscodeSettingsBtn) {
        vscodeSettingsBtn.addEventListener("click", () => {
          vscode.postMessage({ type: "openSettings" });
        });
      }

      // Provider save button handler
      const saveProviderBtn = document.getElementById("saveProviderBtn");
      if (saveProviderBtn) {
        saveProviderBtn.addEventListener("click", () => {
          const providerSelect = document.getElementById("providerSelect");
          if (providerSelect) {
            const provider = providerSelect.value;
            if (provider === "openrouter" || provider === "megallm") {
              vscode.postMessage({ type: "setProvider", provider });
            }
          }
        });
      }

      // Model save button handler
      const saveModelBtn = document.getElementById("saveModelBtn");
      if (saveModelBtn) {
        saveModelBtn.addEventListener("click", () => {
          const modelSelect = document.getElementById("modelSelect");
          if (modelSelect) {
            const modelId = modelSelect.value;
            if (modelId) {
              vscode.postMessage({ type: "setModel", modelId });
            }
          }
        });
      }

      // Max context files save button handler
      const saveMaxContextFilesBtn = document.getElementById("saveMaxContextFilesBtn");
      if (saveMaxContextFilesBtn) {
        saveMaxContextFilesBtn.addEventListener("click", () => {
          const maxContextFilesInput = document.getElementById("maxContextFilesInput");
          if (maxContextFilesInput) {
            const value = parseInt(maxContextFilesInput.value);
            if (!isNaN(value) && value > 0) {
              vscode.postMessage({
                type: "setMaxContextFiles",
                maxContextFiles: value
              });
            }
          }
        });
      }

      // Auto approve save button handler
      const saveAutoApproveBtn = document.getElementById("saveAutoApproveBtn");
      if (saveAutoApproveBtn) {
        saveAutoApproveBtn.addEventListener("click", () => {
          const autoApproveCheckbox = document.getElementById("autoApproveCheckbox");
          if (autoApproveCheckbox) {
            vscode.postMessage({
              type: "setAutoApprove",
              autoApprove: autoApproveCheckbox.checked
            });
          }
        });
      }

      // Add scroll event listener to detect manual scrolling
      const messagesContainer = document.getElementById("messages");
      if (messagesContainer) {
        // Debounce function to limit scroll event frequency
        let scrollTimeout;
        messagesContainer.addEventListener("scroll", () => {
          // Clear previous timeout
          clearTimeout(scrollTimeout);

          // Use timeout to debounce scroll events
          scrollTimeout = setTimeout(() => {
            // Check if user is scrolled near the bottom
            const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 20;
            shouldAutoScroll = isNearBottom;
          }, 100);
        });
      }

      // Theme switcher functionality
      function applyTheme(themeName) {
        // Remove existing theme classes
        document.body.classList.remove('theme-neon', 'theme-sunset', 'theme-ocean', 'theme-matrix');

        // Add the selected theme class if not default
        if (themeName !== 'default') {
          document.body.classList.add('theme-' + themeName);
        }

        // Store the selected theme in localStorage
        localStorage.setItem('vibe-theme', themeName);
      }

      // Load saved theme on initialization
      window.addEventListener('load', () => {
        const savedTheme = localStorage.getItem('vibe-theme') || 'default';
        document.getElementById('themeSelector').value = savedTheme;
        applyTheme(savedTheme);
      });

      // Theme selector event listener
      const themeSelector = document.getElementById('themeSelector');
      if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
          const selectedTheme = e.target.value;
          applyTheme(selectedTheme);
        });
      }

      vscode.postMessage({ type: "ready" });
      initializeTabState();
    </script>
  </body>
</html>`;
  }
}

function getExtensionConfig(): VibeConfig {
  const cfg = vscode.workspace.getConfiguration("vibe");
  return {
    openrouterApiKey: cfg.get<string>("openrouterApiKey") || DEFAULT_OPENROUTER_KEY,
    megallmApiKey: cfg.get<string>("megallmApiKey") || DEFAULT_MEGALLM_KEY,
    agentrouterApiKey: cfg.get<string>("agentrouterApiKey") || DEFAULT_AGENTROUTER_KEY,
    routewayApiKey: cfg.get<string>("routewayApiKey") || DEFAULT_ROUTEWAY_KEY,
    provider: cfg.get<'openrouter' | 'megallm' | 'agentrouter' | 'routeway'>("provider") || "openrouter",
    defaultModel: cfg.get<string>("defaultModel") || "x-ai/grok-4.1-fast",
    autoApproveUnsafeOps: cfg.get<boolean>("autoApproveUnsafeOps") || false,
    maxContextFiles: cfg.get<number>("maxContextFiles") || 20,
  };
}

function determineTaskType(mode: VibeModeId, text: string): string {
  const lower = text.toLowerCase();
  if (mode === "architect") return "architect";
  if (mode === "project-research") return "project-research";
  if (mode === "debug" || lower.includes("error") || lower.includes("stack")) {
    return "debug";
  }
  if (mode === "code") {
    if (
      lower.includes("refactor") ||
      lower.includes("clean up") ||
      lower.includes("optimize")
    ) {
      return "refactor";
    }
    return "code-generation";
  }
  if (mode === "orchestrator") return "orchestrator";
  return "chat";
}

async function callOpenRouter(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<OpenRouterResponse> {
  // Note: API key is now guaranteed to have a value due to default keys in config
  // Try the selected model first, then fall back to other models if needed
  const modelsToTry = [args.model, ...TOP_FREE_MODELS.filter(model => model !== args.model)];

  for (const model of modelsToTry) {
    const body = {
      model: model,
      messages: args.messages,
      temperature: 0.2,
    };

    try {
      const res = (await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${args.apiKey}`,
            "HTTP-Referer": "https://github.com/mk-knight23/vibe-cli",
            "X-Title": "Vibe VS Code",
          },
          body: JSON.stringify(body),
        }
      )) as {
        ok: boolean;
        status: number;
        text(): Promise<string>;
        json(): Promise<unknown>;
      };

      if (res.ok) {
        const data = (await res.json()) as any;
        const content =
          data?.choices?.[0]?.message?.content ??
          "No content returned from OpenRouter.";
        return { content };
      } else {
        const text = await res.text();
        console.warn(`Model ${model} failed with HTTP ${res.status}: ${text}`);
        // Continue to the next model
        continue;
      }
    } catch (error) {
      console.warn(`Model ${model} failed with error: ${(error as Error).message}`);
      // Continue to the next model
      continue;
    }
  }

  // If all models fail, throw an error
  throw new Error("All available models failed. Please check your API key and connection.");
}

// Enhanced fallback functions that try multiple approaches
async function callOpenRouterWithFallback(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<OpenRouterResponse | null> {
  try {
    // First try with the specific model
    const result = await callOpenRouter(args);
    if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
      return result;
    }
  } catch (error) {
    console.warn(`OpenRouter call failed for model ${args.model}: ${(error as Error).message}`);
  }

  // If that fails, try with the fallback models
  for (const model of TOP_FREE_MODELS) {
    try {
      const result = await callOpenRouter({
        ...args,
        model: model
      });
      if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
        return result;
      }
    } catch (error) {
      console.warn(`OpenRouter fallback to model ${model} failed: ${(error as Error).message}`);
      continue;
    }
  }

  return null;
}

interface MegaLLMResponse {
  content: string;
}

// Enhanced fallback functions that try multiple approaches
async function callMegaLLMWithFallback(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<MegaLLMResponse | null> {
  try {
    // First try with the specific model
    const result = await callMegaLLM(args);
    if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
      return result;
    }
  } catch (error) {
    console.warn(`MegaLLM call failed for model ${args.model}: ${(error as Error).message}`);
  }

  // If that fails, try with the fallback models
  for (const model of TOP_FREE_MODELS) {
    try {
      const result = await callMegaLLM({
        ...args,
        model: model
      });
      if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
        return result;
      }
    } catch (error) {
      console.warn(`MegaLLM fallback to model ${model} failed: ${(error as Error).message}`);
      continue;
    }
  }

  return null;
}

async function callAgentRouterWithFallback(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<AgentRouterResponse | null> {
  try {
    const result = await callAgentRouter(args);
    if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
      return result;
    }
  } catch (error) {
    console.warn(`AgentRouter call failed for model ${args.model}: ${(error as Error).message}`);
  }

  for (const model of TOP_FREE_MODELS) {
    try {
      const result = await callAgentRouter({
        ...args,
        model: model
      });
      if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
        return result;
      }
    } catch (error) {
      console.warn(`AgentRouter fallback to model ${model} failed: ${(error as Error).message}`);
      continue;
    }
  }

  return null;
}

async function callRoutewayWithFallback(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<RoutewayResponse | null> {
  try {
    const result = await callRouteway(args);
    if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
      return result;
    }
  } catch (error) {
    console.warn(`Routeway call failed for model ${args.model}: ${(error as Error).message}`);
  }

  for (const model of TOP_FREE_MODELS) {
    try {
      const result = await callRouteway({
        ...args,
        model: model
      });
      if (result && result.content && !result.content.includes("No content returned") && !result.content.includes("All available models failed")) {
        return result;
      }
    } catch (error) {
      console.warn(`Routeway fallback to model ${model} failed: ${(error as Error).message}`);
      continue;
    }
  }

  return null;
}

async function callMegaLLM(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<MegaLLMResponse> {
  // Note: API key is now guaranteed to have a value due to default keys in config
  // For MegaLLM, we'll try the selected model first, then fall back to other models if needed
  const modelsToTry = [args.model, ...TOP_FREE_MODELS.filter(model => model !== args.model)];

  for (const model of modelsToTry) {
    const body = {
      model: model,
      messages: args.messages,
      temperature: 0.2,
    };

    try {
      const res = (await fetch(
        "https://ai.megallm.io/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${args.apiKey}`,
            "User-Agent": "Vibe VS Code Extension",
          },
          body: JSON.stringify(body),
        }
      )) as {
        ok: boolean;
        status: number;
        text(): Promise<string>;
        json(): Promise<unknown>;
      };

      if (res.ok) {
        const data = (await res.json()) as any;
        const content =
          data?.choices?.[0]?.message?.content ??
          "No content returned from MegaLLM.";
        return { content };
      } else {
        const text = await res.text();
        console.warn(`Model ${model} failed with HTTP ${res.status}: ${text}`);
        // Continue to the next model
        continue;
      }
    } catch (error) {
      console.warn(`Model ${model} failed with error: ${(error as Error).message}`);
      // Continue to the next model
      continue;
    }
  }

  // If all models fail, throw an error
  throw new Error("All available models failed. Please check your API key and connection.");
}

interface AgentRouterResponse {
  content: string;
}

async function callAgentRouter(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<AgentRouterResponse> {
  const modelsToTry = [args.model, ...TOP_FREE_MODELS.filter(model => model !== args.model)];

  for (const model of modelsToTry) {
    const body = {
      model: model,
      messages: args.messages,
      temperature: 0.2,
    };

    try {
      const res = (await fetch(
        "https://api.agentrouter.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${args.apiKey}`,
            "User-Agent": "Vibe VS Code Extension v4.0",
          },
          body: JSON.stringify(body),
        }
      )) as {
        ok: boolean;
        status: number;
        text(): Promise<string>;
        json(): Promise<unknown>;
      };

      if (res.ok) {
        const data = (await res.json()) as any;
        const content =
          data?.choices?.[0]?.message?.content ??
          "No content returned from AgentRouter.";
        return { content };
      } else {
        const text = await res.text();
        console.warn(`Model ${model} failed with HTTP ${res.status}: ${text}`);
        continue;
      }
    } catch (error) {
      console.warn(`Model ${model} failed with error: ${(error as Error).message}`);
      continue;
    }
  }

  throw new Error("All available models failed. Please check your API key and connection.");
}

interface RoutewayResponse {
  content: string;
}

async function callRouteway(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<RoutewayResponse> {
  const modelsToTry = [args.model, ...TOP_FREE_MODELS.filter(model => model !== args.model)];

  for (const model of modelsToTry) {
    const body = {
      model: model,
      messages: args.messages,
      temperature: 0.2,
    };

    try {
      const res = (await fetch(
        "https://api.routeway.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${args.apiKey}`,
            "User-Agent": "Vibe VS Code Extension v4.0",
          },
          body: JSON.stringify(body),
        }
      )) as {
        ok: boolean;
        status: number;
        text(): Promise<string>;
        json(): Promise<unknown>;
      };

      if (res.ok) {
        const data = (await res.json()) as any;
        const content =
          data?.choices?.[0]?.message?.content ??
          "No content returned from Routeway.";
        return { content };
      } else {
        const text = await res.text();
        console.warn(`Model ${model} failed with HTTP ${res.status}: ${text}`);
        continue;
      }
    } catch (error) {
      console.warn(`Model ${model} failed with error: ${(error as Error).message}`);
      continue;
    }
  }

  throw new Error("All available models failed. Please check your API key and connection.");
}

// Kilo Code Tools Implementation

async function handleReadFile(params: ReadFileParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    const fullPath = path.join(workspaceFolder.uri.fsPath, params.path);

    // Check if file exists and is accessible
    if (!fs.existsSync(fullPath)) {
      return `Error: File not found at path '${params.path}'`;
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return `Error: Path '${params.path}' is not a file`;
    }

    // Read the file content
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Process based on parameters
    if (params.start_line !== undefined || params.end_line !== undefined) {
      const lines = content.split('\n');
      const start = params.start_line ? params.start_line - 1 : 0; // Convert to 0-based indexing
      const end = params.end_line ? Math.min(params.end_line, lines.length) : lines.length;

      // Ensure valid range
      const validStart = Math.max(0, start);
      const validEnd = Math.min(lines.length, end);

      const selectedLines = lines.slice(validStart, validEnd);
      let result = '';

      for (let i = validStart; i < validEnd; i++) {
        result += `${i + 1} | ${lines[i]}\n`;
      }

      return result.trim();
    } else if (params.auto_truncate && content.length > 10000) { // 10K characters as an example threshold
      // Truncate large files
      const lines = content.split('\n');
      const truncatedLines = lines.slice(0, 100); // First 100 lines as example
      let result = '';

      for (let i = 0; i < truncatedLines.length; i++) {
        result += `${i + 1} | ${truncatedLines[i]}\n`;
      }

      result += `\n[... truncated ${lines.length - truncatedLines.length} lines ...]`;
      return result;
    } else {
      // Return full content with line numbers
      const lines = content.split('\n');
      let result = '';

      for (let i = 0; i < lines.length; i++) {
        result += `${i + 1} | ${lines[i]}\n`;
      }

      return result.trim();
    }
  } catch (error) {
    return `Error reading file: ${(error as Error).message}`;
  }
}

async function handleSearchFiles(params: SearchFilesParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    const searchPath = path.join(workspaceFolder.uri.fsPath, params.path);

    if (!fs.existsSync(searchPath)) {
      return `Error: Directory not found at path '${params.path}'`;
    }

    const stats = fs.statSync(searchPath);
    if (!stats.isDirectory()) {
      return `Error: Path '${params.path}' is not a directory`;
    }

    // Get all files in the directory (non-recursive for now)
    const files = fs.readdirSync(searchPath);

    // Filter files based on pattern if provided
    const filteredFiles = params.file_pattern
      ? files.filter(file => minimatch(file, params.file_pattern!))
      : files;

    let results = '';
    let matchCount = 0;
    const maxResults = 300; // Limit to 300 results

    // Create the regex from the provided pattern
    const regex = new RegExp(params.regex, 'g');

    for (const file of filteredFiles) {
      if (matchCount >= maxResults) break;

      const filePath = path.join(searchPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && isTextFile(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          const fileRelativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

          for (let i = 0; i < lines.length; i++) {
            if (matchCount >= maxResults) break;

            const line = lines[i];
            if (regex.test(line)) {
              // We need to test again without the global flag to get actual matches
              const testRegex = new RegExp(params.regex);
              if (testRegex.test(line)) {
                results += `# ${fileRelativePath}\n`;

                // Add context: previous line if available
                if (i > 0) {
                  results += `${String(i).padStart(3)} | ${lines[i - 1]}\n`;
                }

                // Add the matching line
                results += `${String(i + 1).padStart(3)} | ${line}\n`;

                // Add context: next line if available
                if (i < lines.length - 1) {
                  results += `${String(i + 2).padStart(3)} | ${lines[i + 1]}\n`;
                }

                results += '----\n';
                matchCount++;
              }
            }
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }

    if (matchCount >= maxResults) {
      results += `# Showing first ${maxResults} of ${matchCount}+ results. Use a more specific search if necessary.\n`;
    }

    return results || `No matches found for pattern '${params.regex}' in path '${params.path}'`;
  } catch (error) {
    return `Error searching files: ${(error as Error).message}`;
  }
}

// Helper function to check if a file is a text file
function isTextFile(filePath: string): boolean {
  const textExtensions = ['.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.scss', '.sass', '.less', '.md', '.py', '.rb', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.sql', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.sh', '.bash', '.zsh', '.dart', '.swift', '.kt', '.kts', '.scala', '.ml', '.mli', '.hs', '.lhs', '.ex', '.exs', '.erl', '.hrl', '.vim', '.lua', '.pl', '.pm', '.t', '.r', '.jl', '.jl', '.f', '.f90', '.coffee', '.litcoffee', '.elm', '.purs', '.ls', '.hx', '.hxsl', '.clj', '.cljs', '.cljc', '.edn', '.fs', '.fsi', '.fsx', '.fsscript', '.s', '.asm', '.sage', '.sld', '.ss', '.scm', '.rkt', '.lisp', '.lsp', '.asd', '.jl', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.awk', '.sed', '.diff', '.patch', '.log', '.csv', '.tsv', '.rss', '.atom', '.svg', '.dot', '.dotfile', '.gitignore', '.dockerignore', '.npmignore', '.env', '.editorconfig', '.gitattributes'];
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.includes(ext);
}

// Type guard to check if workspaceFolder is defined
function hasWorkspaceFolder(): boolean {
  return vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0;
}

function getWorkspaceFolder(): vscode.WorkspaceFolder {
  if (!hasWorkspaceFolder()) {
    throw new Error('No workspace folder found');
  }
  return vscode.workspace.workspaceFolders![0];
}

function minimatch(path: string, pattern: string): boolean {
  // Simple glob pattern matching for our use case
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '.*')   // Convert * to .*
    .replace(/\?/g, '.');   // Convert ? to .

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

async function handleListFiles(params: ListFilesParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    const targetPath = path.join(workspaceFolder.uri.fsPath, params.path);

    if (!fs.existsSync(targetPath)) {
      return `Error: Path not found: '${params.path}'`;
    }

    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return `Error: Path '${params.path}' is not a directory`;
    }

    let result = '';

    if (params.recursive) {
      // Recursive listing with some common exclusions
      const excludedDirs = ['.git', 'node_modules', '.next', 'dist', 'build', '.vscode', '.github', 'target', '__pycache__', '.venv', 'venv', '.tox'];

      function walkDirectory(currentPath: string, depth: number = 0): string {
        if (depth > 5) return ''; // Prevent infinite recursion

        let directoryResult = '';
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          if (excludedDirs.includes(item)) continue; // Skip excluded directories

          const itemPath = path.join(currentPath, item);
          const itemStats = fs.statSync(itemPath);

          const relativePath = path.relative(workspaceFolder.uri.fsPath, itemPath);

          if (itemStats.isDirectory()) {
            directoryResult += `${relativePath}/\n`;
            directoryResult += walkDirectory(itemPath, depth + 1);
          } else {
            directoryResult += `${relativePath}\n`;
          }
        }

        return directoryResult;
      }

      result = walkDirectory(targetPath);
    } else {
      // Non-recursive listing
      const items = fs.readdirSync(targetPath);

      for (const item of items) {
        const itemPath = path.join(targetPath, item);
        const stats = fs.statSync(itemPath);

        const relativePath = path.relative(workspaceFolder.uri.fsPath, itemPath);

        if (stats.isDirectory()) {
          result += `${relativePath}/\n`;
        } else {
          result += `${relativePath}\n`;
        }
      }
    }

    return result.trim() || `Directory '${params.path}' is empty`;
  } catch (error) {
    return `Error listing files: ${(error as Error).message}`;
  }
}

async function handleListCodeDefinitionNames(params: ListCodeDefinitionNamesParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    const targetPath = path.join(workspaceFolder.uri.fsPath, params.path);

    if (!fs.existsSync(targetPath)) {
      return `Error: Path not found: '${params.path}'`;
    }

    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return `Error: Path '${params.path}' is not a directory`;
    }

    let result = '';
    const items = fs.readdirSync(targetPath);

    // Filter for source code files
    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rs', '.go', '.cpp', '.hpp', '.c', '.h', '.cs', '.rb', '.java', '.php', '.swift', '.kt', '.kts'];
    const sourceFiles = items.filter(item => {
      const ext = path.extname(item);
      return sourceExtensions.includes(ext);
    });

    for (const file of sourceFiles) {
      const filePath = path.join(targetPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

      result += `${relativePath}:\n`;

      // Simple pattern matching to extract code definitions
      const lines = content.split('\n');
      let lineIndex = 0;

      for (const line of lines) {
        // Look for function, class, interface, method definitions
        const functionMatch = line.match(/^\s*(export\s+)?(async\s+)?function\s+(\w+)/);
        const classMatch = line.match(/^\s*(export\s+)?class\s+(\w+)/);
        const interfaceMatch = line.match(/^\s*(export\s+)?interface\s+(\w+)/);
        const arrowFunctionMatch = line.match(/^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*\(/);
        const javaClassMatch = line.match(/^\s*(public|private|protected\s+)?(static\s+)?class\s+(\w+)/);
        const pythonDefMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
        const pythonClassMatch = line.match(/^\s*class\s+(\w+)\s*/);

        if (functionMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (classMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (interfaceMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (arrowFunctionMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (javaClassMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (pythonDefMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        } else if (pythonClassMatch) {
          result += `${lineIndex}--${lineIndex} | ${line.trim()}\n`;
        }

        lineIndex++;
      }
    }

    return result.trim() || `No code definitions found in directory '${params.path}'`;
  } catch (error) {
    return `Error listing code definitions: ${(error as Error).message}`;
  }
}

async function handleApplyDiff(params: ApplyDiffParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    const filePath = path.join(workspaceFolder.uri.fsPath, params.path);

    if (!fs.existsSync(filePath)) {
      return `Error: File not found at path '${params.path}'`;
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return `Error: Path '${params.path}' is not a file`;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    // Parse the diff content to find the start and end line numbers
    const diffLines = params.diff.split('\n');

    // Look for :start_line: and :end_line: markers in the diff
    const startLineMatch = params.diff.match(/:start_line:(\d+)/);
    const endLineMatch = params.diff.match(/:end_line:(\d+)/);

    if (!startLineMatch || !endLineMatch) {
      return `Error: Invalid diff format. Must include :start_line: and :end_line: markers.`;
    }

    const startLine = parseInt(startLineMatch[1]) - 1; // Convert to 0-based index
    const endLine = parseInt(endLineMatch[1]); // 1-based index, inclusive

    // Extract the search/replace content
    const searchStartIndex = params.diff.indexOf('-------\n') + 8;
    const searchEndIndex = params.diff.indexOf('=======\n');
    const replaceStartIndex = searchEndIndex + 8;
    const replaceEndIndex = params.diff.indexOf('\n>>>>>>> REPLACE');

    if (searchStartIndex === -1 || searchEndIndex === -1 || replaceStartIndex === -1 || replaceEndIndex === -1) {
      return `Error: Invalid diff format. Missing required section markers.`;
    }

    const searchContent = params.diff.substring(searchStartIndex, searchEndIndex);
    const replaceContent = params.diff.substring(replaceStartIndex, replaceEndIndex);

    // Verify the content matches what's expected in the file
    const expectedLines = searchContent.split('\n');
    const actualLines = lines.slice(startLine, endLine);

    if (expectedLines.join('\n') !== actualLines.join('\n')) {
      return `Error: Content does not match expected content at lines ${startLine + 1}-${endLine}.\n\nExpected:\n${searchContent}\n\nActual in file:\n${actualLines.join('\n')}`;
    }

    // Perform the replacement
    const newLines = [
      ...lines.slice(0, startLine),
      ...replaceContent.split('\n'),
      ...lines.slice(endLine)
    ];

    // Write the new content to the file
    fs.writeFileSync(filePath, newLines.join('\n'));

    return `Successfully applied diff to file '${params.path}' at lines ${startLine + 1}-${endLine}.`;
  } catch (error) {
    return `Error applying diff: ${(error as Error).message}`;
  }
}

async function handleWriteToFile(params: WriteToFileParams): Promise<string> {
  try {
    const workspaceFolder = getWorkspaceFolder();

    // Ensure parent directory exists
    const filePath = path.join(workspaceFolder.uri.fsPath, params.path);
    const parentDir = path.dirname(filePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Write the content to the file
    fs.writeFileSync(filePath, params.content, 'utf8');

    const actualLineCount = params.content.split('\n').length;
    
    return `✅ Successfully wrote ${actualLineCount} lines to '${params.path}'`;
  } catch (error) {
    return `❌ Error writing to file: ${(error as Error).message}`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

import { PermissionService } from './services/permission';
import { FileActionsService } from './services/fileActions';
import { AIProvider, AIProviderConfig } from './providers/AIProvider';
import { FileSystemEngine } from './services/FileSystem';
import { ShellEngine } from './services/ShellEngine';
import { ProjectGenerator } from './services/ProjectGenerator';
import { RuntimeSandbox } from './services/RuntimeSandbox';
import { AgentMode } from './services/AgentMode';

let aiProvider: AIProvider;
let fsEngine: FileSystemEngine;
let shellEngine: ShellEngine;
let projectGenerator: ProjectGenerator;
let sandbox: RuntimeSandbox;
let agentMode: AgentMode;

export function activate(context: vscode.ExtensionContext) {
  // Initialize v4 services
  const permissions = new PermissionService();
  const fileActions = new FileActionsService(permissions);

  // Initialize v5 services
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const config = vscode.workspace.getConfiguration('vibe');
  
  const providers: AIProviderConfig[] = [
    {
      name: 'MegaLLM',
      baseURL: 'https://ai.megallm.io/v1',
      apiKey: config.get('megallmApiKey') || DEFAULT_MEGALLM_KEY,
      models: ['qwen/qwen3-next-80b-a3b-instruct']
    },
    {
      name: 'AgentRouter',
      baseURL: 'https://agentrouter.org/v1',
      apiKey: config.get('agentrouterApiKey') || DEFAULT_AGENTROUTER_KEY,
      models: ['anthropic/claude-3.5-sonnet']
    },
    {
      name: 'Routeway',
      baseURL: 'https://api.routeway.ai/v1',
      apiKey: config.get('routewayApiKey') || DEFAULT_ROUTEWAY_KEY,
      models: ['qwen/qwen3-next-80b-a3b-instruct']
    },
    {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('openrouterApiKey') || DEFAULT_OPENROUTER_KEY,
      models: TOP_FREE_MODELS
    }
  ];

  aiProvider = new AIProvider(providers);
  fsEngine = new FileSystemEngine(workspaceRoot);
  shellEngine = new ShellEngine(workspaceRoot);
  projectGenerator = new ProjectGenerator(fsEngine);
  sandbox = new RuntimeSandbox();
  agentMode = new AgentMode(aiProvider, fsEngine, shellEngine, sandbox);

  // Register the webview view provider first
  const provider = new VibeView(context, fileActions);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("vibe.vibePanel", provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );
  VibeView.currentView = provider;

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vibe.openChat", () => {
      VibeView.currentView?.show();
      VibeView.currentView?.setMode("code");
    }),
    vscode.commands.registerCommand("vibe.openAgent", () => {
      VibeView.currentView?.show();
      VibeView.currentView?.setMode("architect");
    }),
    vscode.commands.registerCommand("vibe.openSettings", () => {
      void vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "vibe"
      );
    }),
    vscode.commands.registerCommand("vibe.switchNextMode", () => {
      VibeView.currentView?.switchMode(1);
    }),
    vscode.commands.registerCommand("vibe.switchPrevMode", () => {
      VibeView.currentView?.switchMode(-1);
    }),
    
    // File operation commands (direct, no CLI)
    vscode.commands.registerCommand("vibe.createFile", async (path?: string) => {
      const filePath = path || await vscode.window.showInputBox({ prompt: 'File path' });
      if (filePath) {
        await fileActions.createFile(filePath);
        fileActions.refreshExplorer();
      }
    }),
    
    vscode.commands.registerCommand("vibe.createFolder", async (path?: string) => {
      const folderPath = path || await vscode.window.showInputBox({ prompt: 'Folder path' });
      if (folderPath) {
        await fileActions.createFolder(folderPath);
        fileActions.refreshExplorer();
      }
    }),

    // V5.0 NEW COMMANDS
    vscode.commands.registerCommand("vibe.runShellCommand", async () => {
      const command = await vscode.window.showInputBox({ prompt: 'Enter shell command' });
      if (!command) return;
      
      if (shellEngine.isDestructive(command)) {
        const confirm = await vscode.window.showWarningMessage(
          '⚠️ This command may be destructive. Continue?',
          'Yes', 'No'
        );
        if (confirm !== 'Yes') return;
      }
      
      shellEngine.show();
      const result = await shellEngine.execute(command, true);
      vscode.window.showInformationMessage(`Exit code: ${result.exitCode}`);
    }),

    vscode.commands.registerCommand("vibe.generateProject", async () => {
      const templates = projectGenerator.getTemplates();
      const template = await vscode.window.showQuickPick(templates, { 
        placeHolder: 'Select project template' 
      });
      if (!template) return;

      const projectName = await vscode.window.showInputBox({ prompt: 'Enter project name' });
      if (!projectName) return;

      await projectGenerator.generate(template, workspaceRoot, projectName);
      vscode.window.showInformationMessage(`✅ Project ${projectName} created!`);
      fileActions.refreshExplorer();
    }),

    vscode.commands.registerCommand("vibe.executeSandbox", async () => {
      const language = await vscode.window.showQuickPick(['javascript', 'python'], { 
        placeHolder: 'Select language' 
      });
      if (!language) return;

      const code = await vscode.window.showInputBox({ 
        prompt: 'Enter code to execute',
        value: language === 'javascript' ? 'console.log("Hello World")' : 'print("Hello World")'
      });
      if (!code) return;

      const result = language === 'javascript'
        ? await sandbox.executeJS(code)
        : await sandbox.executePython(code);

      const output = `Execution time: ${result.executionTime}ms\n\nOutput:\n${result.stdout}${result.stderr ? '\n\nErrors:\n' + result.stderr : ''}`;
      vscode.window.showInformationMessage(output);
    }),

    vscode.commands.registerCommand("vibe.startAgent", async () => {
      const goal = await vscode.window.showInputBox({ prompt: 'Enter agent goal' });
      if (!goal) return;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Agent working...',
        cancellable: true
      }, async (progress) => {
        const task = await agentMode.execute(goal, (step) => {
          progress.report({ message: step.description });
        });
        vscode.window.showInformationMessage(`✅ Agent completed: ${task.status}`);
      });
    })
  );
}

export function deactivate() {
  // no-op for now
}
