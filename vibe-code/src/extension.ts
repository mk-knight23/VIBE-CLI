
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

interface OpenRouterConfig {
  apiKey: string;
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
  "tng/deepseek-r1t2-chimera:free",
  "tng/deepseek-r1t-chimera:free",
  "kwaipilot/kat-coder-pro-v1:free",
  "deepseek/deepseek-v3-0324:free",
  "deepseek/r1-0528:free",
  "qwen/qwen3-coder-480b-a35b:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-3-27b:free",
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
      case "requestContext":
        await this.handleRequestContext();
        break;
      case "openSettings":
        void vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:vibe-vscode"
        );
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
    if (!cfg.apiKey) {
      void vscode.window.showWarningMessage(
        "Vibe: Please set your OpenRouter API key in settings (vibe.openrouterApiKey)."
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
      const resp = await callOpenRouter({
        apiKey: cfg.apiKey,
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
      const msgText =
        (err && err.message) || "Unexpected error calling OpenRouter API.";
      void vscode.window.showErrorMessage(`Vibe: ${msgText}`);
    } finally {
      progress.dispose();
    }
  }

  private async handleRequestContext() {
    const editors = vscode.window.visibleTextEditors;
    const snippets = editors.map((ed: vscode.TextEditor) => {
      const text = ed.document.getText();
      return {
        uri: ed.document.uri.toString(),
        languageId: ed.document.languageId,
        content: text.slice(0, 4000),
      };
    });

    if (this.view) {
      this.view.webview.postMessage({
        type: "context",
        snippets,
      });
    }
  }

  private buildSystemPrompt(
    persona: Persona,
    isAgent: boolean,
    cfg: OpenRouterConfig,
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

    const modeButtons = MODES.map(
      (m) =>
        `<button class="mode-btn" data-mode="${m.id}">
           <span class="icon">${m.shortLabel}</span>
           <span class="label">${m.label}</span>
         </button>`
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
        gap: 4px;
        overflow-x: auto;
      }
      .mode-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid transparent;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 11px;
      }
      .mode-btn.active {
        border-color: var(--vscode-button-border, var(--vscode-focusBorder));
        background: var(--vscode-button-secondaryBackground);
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
      }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      .tab {
        padding: 3px 8px;
        cursor: pointer;
        border-radius: 4px;
      }
      .tab.active {
        background: var(--vscode-tab-activeBackground);
      }
      .content {
        flex: 1;
        display: flex;
        min-height: 0;
      }
      .chat-column {
        flex: 2;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--vscode-panel-border);
      }
      .sidebar {
        flex: 1;
        display: flex;
        flex-direction: column;
        font-size: 11px;
      }
      .messages {
        flex: 1;
        padding: 8px;
        overflow-y: auto;
        font-size: 12px;
      }
      .message {
        margin-bottom: 8px;
      }
      .message.user {
        color: var(--vscode-debugTokenExpression-string);
      }
      .message.assistant {
        color: var(--vscode-debugTokenExpression-number);
      }
      .input-row {
        border-top: 1px solid var(--vscode-panel-border);
        padding: 4px 8px;
      }
      textarea {
        width: 100%;
        resize: none;
        min-height: 48px;
        font-family: inherit;
        font-size: 12px;
      }
      .input-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        font-size: 11px;
      }
      .sidebar-section {
        padding: 6px 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
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
        <div class="modes" id="modes">
          ${modeButtons}
        </div>
        <div class="toolbar-right">
          <select id="personaSelect">
            ${personaOptions}
          </select>
          <select id="modelSelect">
            ${modelOptions}
          </select>
          <button class="small" id="contextBtn">Context</button>
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
            <div class="messages" id="messages"></div>
            <div class="input-row">
              <textarea id="input" placeholder="Ask Vibe…"></textarea>
              <div class="input-actions">
                <span class="muted">Enter to send, Shift+Enter for newline</span>
                <button class="small" id="sendBtn">Send</button>
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
              <h3>Context</h3>
              <div id="contextArea" class="muted">Click Context to pull open editors as context.</div>
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

      function selectMode(id) {
        currentMode = id;
        document.querySelectorAll(".mode-btn").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.mode === id);
        });
        vscode.postMessage({ type: "setMode", mode: id });
      }

      function appendMessage(role, content) {
        const container = document.getElementById("messages");
        const div = document.createElement("div");
        div.className = "message " + role;
        div.textContent = (role === "user" ? "You: " : "Vibe: ") + content;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
      }

      function setModeSummary(text) {
        const el = document.getElementById("modeSummary");
        if (el) el.textContent = text;
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
            if (select) select.value = p.id;
          });
          pills.appendChild(pill);
        });
      }

      window.addEventListener("message", event => {
        const msg = event.data;
        switch (msg.type) {
          case "init":
            if (msg.modes) {
              const mode = msg.modes.find(m => m.id === msg.currentMode) || msg.modes[0];
              if (mode) {
                selectMode(mode.id);
                setModeSummary(mode.label + " — " + mode.description);
              }
            }
            if (msg.personas) {
              setPersonas(msg.personas);
              const select = document.getElementById("personaSelect");
              if (select && msg.currentPersonaId) {
                select.value = msg.currentPersonaId;
              }
            }
            if (msg.currentModelId) {
              const sel = document.getElementById("modelSelect");

            if (sel) sel.value = msg.currentModelId;
            }
            break;
          case "setMode":
            selectMode(msg.mode);
            if (msg.modeLabel && msg.modeDescription) {
              setModeSummary(msg.modeLabel + " — " + msg.modeDescription);
            }
            break;
          case "assistantMessage":
           

            appendMessage("assistant", msg.content);
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

      document.getElementById("modes").addEventListener("click", (e) => {
        const target = e.target.closest(".mode-btn");
        if (target) {
          const id = target.dataset.mode;
          selectMode(id);
        }
      });

      document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          currentTab = tab.dataset.tab;
          isAgent = currentTab === "agent";
        });
      });

      document.getElementById("sendBtn").addEventListener("click", () => {
        const input = document.getElementById("input");
        const text = input.value.trim();
        if (!text) return;
        appendMessage("user", text);
        vscode.postMessage({ type: "sendMessage", text, isAgent });
        input.value = "";
      });

      document.getElementById("input").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          document.getElementById("sendBtn").click();
        }
      });

      document.getElementById("contextBtn").addEventListener("click", () => {
        vscode.postMessage({ type: "requestContext" });
      });

      document.getElementById("settingsBtn").addEventListener("click", () => {
        vscode.postMessage({ type: "openSettings" });
      });

      document.getElementById("personaSelect").addEventListener("change", (e) => {
        const id = e.target.value;
        vscode.postMessage({ type: "setPersona", personaId: id });
      });

      document.getElementById("modelSelect").addEventListener("change", (e) => {
        const id = e.target.value;
       
        vscode.postMessage({ type: "setModel", modelId: id });
      });

      vscode.postMessage({ type: "ready" });
    </script>
  </body>
</html>`;
  }
}

function getExtensionConfig(): OpenRouterConfig {
  const cfg = vscode.workspace.getConfiguration("vibe");
  return {
    apiKey: cfg.get<string>("openrouterApiKey") || "",
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
        Authorization: `Bearer ${args.apiKey}`,
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
             