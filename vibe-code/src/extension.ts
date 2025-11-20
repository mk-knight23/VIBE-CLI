
import * as vscode from "vscode";

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
  provider: 'openrouter' | 'megallm';
  defaultModel: string;
  autoApproveUnsafeOps: boolean;
  maxContextFiles: number;
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
  "z-ai/glm-4.5-air:free",
  "gpt-4o-mini",
  "claude-3.5-sonnet",
  "gemini-2.0-flash",
  "llama-3.3-70b-instruct",
  "openai-gpt-oss-20b",
  "llama3.3-70b-instruct",
  "deepseek-r1-distill-llama-70b",
  "alibaba-qwen3-32b",
  "openai-gpt-oss-120b",
  "llama3-8b-instruct",
  "moonshotai/kimi-k2-instruct-0905",
  "deepseek-ai/deepseek-v3.1-terminus",
  "qwen/qwen3-next-80b-a3b-instruct",
  "deepseek-ai/deepseek-v3.1",
  "mistralai/mistral-nemotron",
  "minimaxai/minimax-m2"
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

  public static register(context: vscode.ExtensionContext) {
    const provider = new VibeView(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("vibe.vibePanel", provider)
    );
    VibeView.currentView = provider;
  }

  constructor(private readonly context: vscode.ExtensionContext) {
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
        if (typeof msg.provider === "string" && (msg.provider === "openrouter" || msg.provider === "megallm")) {
          await this.setProvider(msg.provider);
        }
        break;
      case "clearChat":
        // Clear the message history in the extension
        this.messages = [];
        break;
      case "openExternal":
        if (typeof msg.url === "string") {
          void vscode.env.openExternal(vscode.Uri.parse(msg.url));
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

    const cfg = getExtensionConfig();
    const apiKey = cfg.provider === 'openrouter' ? cfg.openrouterApiKey : cfg.megallmApiKey;

    if (!apiKey) {
      void vscode.window.showWarningMessage(
        `Vibe: Please set your ${cfg.provider === 'openrouter' ? 'OpenRouter' : 'MegaLLM'} API key in settings (vibe.${cfg.provider}ApiKey).`
      );
      return;
    }

    const persona =
      PERSONAS.find((p) => p.id === this.currentPersonaId) ?? PERSONAS[0];

    const taskType = determineTaskType(this.currentMode, text);

    const systemPrompt = this.buildSystemPrompt(persona, msg.isAgent, cfg, taskType);

    const messages: ChatMessage[] = [];
    messages.push({ role: "system", content: systemPrompt });
    this.messages.forEach((m) => messages.push(m));
    messages.push({ role: "user", content: text });

    this.messages.push({ role: "user", content: text });

    const progress = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000
    );
    progress.text = "Vibe: Thinking...";
    progress.show();

    try {
      const resp = cfg.provider === 'openrouter'
        ? await callOpenRouter({
            apiKey: apiKey,
            model: this.currentModelId,
            messages,
            taskType,
          })
        : await callMegaLLM({
            apiKey: apiKey,
            model: this.currentModelId,
            messages,
            taskType,
          });

      this.messages.push({ role: "assistant", content: resp.content });
      if (this.view) {
        this.view.webview.postMessage({
          type: "assistantMessage",
          content: resp.content,
        });
      }
    } catch (err: any) {
      const msgText = (err && err.message) || `Unexpected error calling ${cfg.provider === 'openrouter' ? 'OpenRouter' : 'MegaLLM'} API.`;
      void vscode.window.showErrorMessage(`Vibe: ${msgText}`);
    } finally {
      progress.dispose();
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
      }
    } catch (error) {
      void vscode.window.showErrorMessage('Failed to save API key: ' + (error as Error).message);
    }
  }

  private async setProvider(provider: 'openrouter' | 'megallm') {
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
      "You are Vibe, a defensive, privacy-first AI coding assistant running inside VS Code. " +
      "You have access to project context and should propose safe, incremental changes. " +
      "Never execute destructive operations without explicit user confirmation.";

    const personaLine = `Persona: ${persona.label} - ${persona.description}`;
    const mode = MODES.find((m) => m.id === this.currentMode);
    const modeLine = mode
      ? `Current mode: ${mode.label} - ${mode.description}`
      : "";

    const agentLine = isAgent
      ? "You are in Agent mode. Plan your work as small, reversible steps. Propose checkpoints and a todo list for the user."
      : "You are in Chat mode. Answer directly and include concrete code examples when helpful.";

    const taskTypeLine = `Task type: ${taskType}.`;

    const autoApproveLine = cfg.autoApproveUnsafeOps
      ? "Auto-approve mode is ON. When the user asks you to apply file edits, run commands, or open URLs, you may treat that as explicit approval, but still describe what you plan to do."
      : "Auto-approve mode is OFF. Never assume destructive operations are approved; prefer plans and diff-style suggestions.";

    const contextLimitLine = `You can reference at most ${cfg.maxContextFiles} project files when reasoning about context. Prefer focusing on files the user or context has provided.`;

    return [
      base,
      personaLine,
      modeLine,
      agentLine,
      taskTypeLine,
      autoApproveLine,
      contextLimitLine,
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
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }
      .brand span.icon {
        font-size: 16px;
      }
      .modes {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      select, button.small {
        font-size: 11px;
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
      }
      .tab {
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .tab[data-tab="chat"] {
        color: #87CEEB; /* Sky blue */
      }
      .tab[data-tab="agent"] {
        color: #90EE90; /* Light green */
      }
      .tab[data-tab="chat"]:not(.active):hover {
        background: color-mix(in srgb, #87CEEB 20%, var(--vscode-toolbar-hoverBackground, var(--vscode-sideBarSectionHeader-border)) 80%);
        color: #87CEEB;
      }
      .tab[data-tab="agent"]:not(.active):hover {
        background: color-mix(in srgb, #90EE90 20%, var(--vscode-toolbar-hoverBackground, var(--vscode-sideBarSectionHeader-border)) 80%);
        color: #90EE90;
      }
      .tab.active[data-tab="chat"] {
        background: #87CEEB;
        color: #FFFFFF;
      }
      .tab.active[data-tab="agent"] {
        background: #90EE90;
        color: #FFFFFF;
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
      }
      .chat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .messages {
        flex: 1;
        padding: 8px;
        overflow-y: auto;
        font-size: 12px;
        min-height: 0;
        line-height: 1.4;
        scroll-behavior: smooth;
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
        border-radius: 4px;
        border-left: 3px solid transparent;
        cursor: pointer; /* Indicates message is clickable for copying */
      }
      .message:hover {
        opacity: 0.9;
      }
      .message.user {
        color: var(--vscode-debugTokenExpression-string);
        border-left-color: var(--vscode-debugTokenExpression-string);
        background-color: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-debugTokenExpression-string) 10%);
      }
      .message.assistant {
        color: var(--vscode-debugTokenExpression-number);
        border-left-color: var(--vscode-debugTokenExpression-number);
        background-color: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-debugTokenExpression-number) 5%);
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
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 4px;
        padding: 6px;
        box-sizing: border-box;
      }
      textarea:focus {
        outline: 1px solid var(--vscode-focusBorder);
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

      .input-buttons {
        display: flex;
        gap: 4px;
      }
      .sidebar-section {
        padding: 6px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
        min-height: 0;
        overflow-y: auto;
      }
      .sidebar-section h3 {
        margin: 0 0 4px;
        font-size: 11px;
        text-transform: uppercase;
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
      }
      .pill.active {
        background: var(--vscode-button-secondaryBackground);
      }
      .muted {
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <div class="root">
      <header>
        <div class="brand">
          <span class="icon">✨</span>
          <span>Vibe</span>
        </div>
        <div class="modes">
          <select id="modeSelect">
            ${modeOptions}
          </select>
        </div>
        <div class="toolbar-right">
          <select id="personaSelect">
            ${personaOptions}
          </select>
          <select id="modelSelect">
            ${modelOptions}
          </select>
          <button class="small" id="settingsBtn">Settings</button>
        </div>
      </header>
      <div class="main">
        <div class="tabs">
          <div class="tab active" data-tab="chat">Chat</div>
          <div class="tab" data-tab="agent">Agent</div>
        </div>
        <div class="content">
          <div class="chat-column">
            <div class="chat-content">
              <div class="messages" id="messages"></div>
            </div>
            <div class="input-row">
              <textarea id="input" placeholder="Ask Vibe…"></textarea>
              <div class="input-actions">
                <div class="input-controls">
                  <span class="muted">Enter to send, Shift+Enter for newline</span>
                  <div class="input-buttons">
                    <button class="small" id="clearChatBtn">Clear</button>
                    <button class="small" id="sendBtn">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="sidebar">
            <div class="sidebar-section">
              <h3>Mode</h3>
              <div id="modeSummary" class="muted"></div>
            </div>
            <div class="sidebar-section">
              <h3>Personas</h3>
              <div class="pill-row" id="personaPills"></div>
            </div>
            <div class="sidebar-section">
              <h3>Checkpoints</h3>
              <div id="checkpoints" class="muted">Use Agent mode to create checkpoints.</div>
            </div>
            <div class="sidebar-section">
              <h3>Provider</h3>
              <select id="providerSelect" style="width: 100%; padding: 4px; margin-top: 4px;">
                <option value="openrouter">OpenRouter</option>
                <option value="megallm">MegaLLM</option>
              </select>
            </div>
            <div class="sidebar-section">
              <h3>OpenRouter API Key</h3>
              <input type="password" id="openRouterApiKeyInput" placeholder="Enter OpenRouter API key" style="width: 100%; padding: 4px; margin-top: 4px;">
              <button id="saveOpenRouterKeyBtn" style="margin-top: 4px; width: 100%;">Save OpenRouter Key</button>
            </div>
            <div class="sidebar-section">
              <h3>MegaLLM API Key</h3>
              <input type="password" id="megaLlmApiKeyInput" placeholder="Enter MegaLLM API key" style="width: 100%; padding: 4px; margin-top: 4px;">
              <button id="saveMegaLlmKeyBtn" style="margin-top: 4px; width: 100%;">Save MegaLLM Key</button>
            </div>
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
          chatColumn.classList.add(currentTab);
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

              if (openRouterInput) {
                openRouterInput.value = msg.settings.openrouterApiKey;
              }
              if (megaLlmInput) {
                megaLlmInput.value = msg.settings.megallmApiKey;
              }
            }
            break;
          case "setMode":
            updateModeUI(msg.mode);
            if (msg.modeLabel && msg.modeDescription) {
              setModeSummary(msg.modeLabel + " — " + msg.modeDescription);
            }
            break;
          case "assistantMessage":
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

      document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          currentTab = tab.dataset.tab;
          isAgent = currentTab === "agent";

          // Apply different background classes based on current tab
          const chatColumn = document.querySelector(".chat-column");
          if (chatColumn) {
            chatColumn.className = chatColumn.className.replace(/(chat|agent)\s*/g, '');
            chatColumn.classList.add(currentTab);
          }
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

      document.getElementById("settingsBtn").addEventListener("click", () => {
        vscode.postMessage({ type: "openSettings" });
      });

      document.getElementById("personaSelect").addEventListener("change", (e) => {
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
    openrouterApiKey: cfg.get<string>("openrouterApiKey") || "",
    megallmApiKey: cfg.get<string>("megallmApiKey") || "",
    provider: cfg.get<'openrouter' | 'megallm'>("provider") || "openrouter",
    defaultModel: cfg.get<string>("defaultModel") || "z-ai/glm-4.5-air:free",
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
  // Validate API key before making the call
  if (!args.apiKey) {
    throw new Error("OpenRouter API key is required but not provided");
  }

  const body = {
    model: args.model || "z-ai/glm-4.5-air:free",
    messages: args.messages,
    temperature: 0.2,
  };

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  const content =
    data?.choices?.[0]?.message?.content ??
    "No content returned from OpenRouter.";
  return { content };
}

interface MegaLLMResponse {
  content: string;
}

async function callMegaLLM(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  taskType: string;
}): Promise<MegaLLMResponse> {
  // Validate API key before making the call
  if (!args.apiKey) {
    throw new Error("MegaLLM API key is required but not provided");
  }

  const body = {
    model: args.model || "gpt-4o-mini", // Default MegaLLM model
    messages: args.messages,
    temperature: 0.2,
  };

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  const content =
    data?.choices?.[0]?.message?.content ??
    "No content returned from MegaLLM.";
  return { content };
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

export function activate(context: vscode.ExtensionContext) {
  // Register the webview view provider first
  const provider = new VibeView(context);
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
    })
  );
}

export function deactivate() {
  // no-op for now
}
             