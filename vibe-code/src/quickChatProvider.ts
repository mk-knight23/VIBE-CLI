import * as vscode from 'vscode';
import { LLMService, FREE_MODELS, ChatMessage, getOpenRouterApiKey, buildSystemPrompt } from './llmService';
import { MemoryBank, buildMemoryPromptSegment } from './memory';

/**
 * Minimal secondary chat view.
 * Provides a lightweight "Quick Chat" section separate from the full-featured ChatViewProvider.
 * Features:
 *  - Text input + send
 *  - Streaming assistant response
 *  - Model selector (restricted to FREE_MODELS)
 *  - Token usage display (approx)
 *  - Clear conversation
 *
 * No diff suggestion parsing, no orchestrator integration, simplified UI.
 */
export class QuickChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = 'vibe.quickChatView';

  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private messages: { id: string; role: 'user' | 'assistant' | 'system'; content: string; ts: number }[] = [];
  private isStreaming = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llm: LLMService | undefined,
    private readonly memory: MemoryBank | undefined,
    private readonly output: vscode.OutputChannel
  ) {
    this.output.appendLine('[QuickChat] Initialized.');
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    this.attachListener();
    this.postInit();
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  private postInit() {
    let apiKey: string | undefined;
    try {
      apiKey = getOpenRouterApiKey();
    } catch {
      apiKey = undefined;
    }
    this.postMessage({
      type: 'init',
      models: FREE_MODELS,
      currentModel: vscode.workspace.getConfiguration('vibe').get<string>('model', FREE_MODELS[0]),
      tokenUsage: this.llm?.getSessionTokenUsage() ?? 0,
      apiKeyPresent: !!apiKey
    });
    if (!apiKey) {
      this.pushAssistant('Add your OpenRouter API key (Settings: vibe.openRouter.apiKey) to start.');
    }
  }

  private attachListener() {
    if (!this.view) return;
    const sub = this.view.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'send':
          await this.handleSend(String(msg.text || ''));
          break;
        case 'setModel':
          this.setModel(String(msg.model || ''));
          break;
        case 'clear':
          this.clear();
          break;
        case 'setApiKey':
          if (typeof msg.key === 'string' && msg.key.trim()) {
            await vscode.workspace.getConfiguration('vibe')
              .update('openRouter.apiKey', msg.key.trim(), vscode.ConfigurationTarget.Workspace);
            this.pushAssistant('API key saved.');
            this.postMessage({ type: 'apiKeySaved' });
          }
          break;
      }
    });
    this.disposables.push(sub);
  }

  private genId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  private setModel(model: string) {
    if (!FREE_MODELS.includes(model as any)) {
      vscode.window.showErrorMessage(`Quick Chat: Model "${model}" not allowed. Use free models only.`);
      return;
    }
    void vscode.workspace.getConfiguration('vibe')
      .update('model', model, vscode.ConfigurationTarget.Workspace);
    this.postMessage({ type: 'modelChanged', model });
  }

  private clear() {
    this.messages = [];
    this.emitChat();
    this.llm?.resetSessionTokenUsage();
    this.postMessage({ type: 'tokenUsage', usage: 0 });
  }

  private pushAssistant(content: string) {
    const entry = { id: this.genId(), role: 'assistant' as const, content, ts: Date.now() };
    this.messages.push(entry);
    this.emitChat();
  }

  private emitChat() {
    this.postMessage({
      type: 'chat',
      messages: this.messages.map(m => ({ role: m.role, content: m.content }))
    });
  }

  private postMessage(msg: unknown) {
    if (!this.view) return;
    this.view.webview.postMessage(msg);
  }

  private async handleSend(raw: string) {
    const text = raw.trim();
    if (!text) {
      this.pushAssistant('⚠️ Enter a message first.');
      return;
    }
    const userEntry = { id: this.genId(), role: 'user' as const, content: text, ts: Date.now() };
    this.messages.push(userEntry);
    this.emitChat();

    let apiKey: string;
    try {
      apiKey = getOpenRouterApiKey();
    } catch (err: any) {
      this.pushAssistant('⚠️ API key missing. Set vibe.openRouter.apiKey.');
      return;
    }

    const cfg = vscode.workspace.getConfiguration('vibe');
    const model = cfg.get<string>('model', FREE_MODELS[0])!;
    const memorySegment = buildMemoryPromptSegment(this.memory!, text);
    const systemPrompt = buildSystemPrompt({
      baseMode: 'code',
      personaLabel: 'Quick',
      personaDescription: 'Fast lightweight assistant.',
      autoApprove: false,
      maxContextFiles: cfg.get<number>('maxContextFiles', 30),
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + '\n' + memorySegment },
      ...this.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    if (!this.llm) {
      this.pushAssistant('⚠️ LLM service unavailable.');
      return;
    }

    let acc = '';
    let assistantEntry: { id: string; role: 'assistant'; content: string; ts: number } | undefined;
    this.isStreaming = true;
    this.postMessage({ type: 'streaming', value: true });

    try {
      const { emitter, done } = this.llm.streamChatCompletion({
        apiKey,
        model,
        messages,
        temperature: 0.15,
      });
      emitter.on(chunk => {
        if (chunk.delta) {
          acc += chunk.delta;
          if (!assistantEntry) {
            assistantEntry = { id: this.genId(), role: 'assistant', content: '', ts: Date.now() };
            this.messages.push(assistantEntry);
          }
          assistantEntry.content = acc;
          this.emitChat();
          this.postMessage({ type: 'tokenUsage', usage: this.llm?.getSessionTokenUsage() ?? 0 });
        }
        if (chunk.done) {
          this.isStreaming = false;
          this.postMessage({ type: 'streaming', value: false });
        }
      });
      await done;
    } catch (err: any) {
      this.isStreaming = false;
      this.postMessage({ type: 'streaming', value: false });
      this.pushAssistant('⚠️ Error: ' + (err.message || String(err)));
    }
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = this.nonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Quick Chat</title>
<style>
body {
  margin:0;
  padding:0;
  font-family: var(--vscode-font-family);
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  display:flex;
  flex-direction:column;
  height:100vh;
  font-size:12px;
}
header {
  padding:6px 8px;
  border-bottom:1px solid var(--vscode-panel-border);
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
}
#messages {
  flex:1;
  overflow-y:auto;
  padding:8px;
}
.msg {
  margin:0 0 10px 0;
  padding:6px 8px;
  border-radius:6px;
  line-height:1.4;
  word-wrap:break-word;
  border:1px solid var(--vscode-panel-border);
}
.msg.user { background: var(--vscode-sideBar-background); }
.msg.assistant { background: var(--vscode-editorWidget-background); }
#inputArea {
  border-top:1px solid var(--vscode-panel-border);
  padding:8px;
}
#prompt {
  width:100%;
  min-height:50px;
  resize:vertical;
  font-size:12px;
  border:1px solid var(--vscode-panel-border);
  border-radius:4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  padding:6px;
}
.actions {
  margin-top:6px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.streaming {
  font-size:10px;
  opacity:0.7;
}
</style>
</head>
<body>
<header>
  <strong style="font-size:12px;">Quick Chat</strong>
  <select id="modelSelect" title="Model"></select>
  <input id="apiKeyInput" type="password" placeholder="API Key" style="flex:1;min-width:120px;font-size:11px;" />
  <button id="saveKeyBtn">Save</button>
  <span id="tokenUsage" style="font-size:10px;opacity:0.8;">Tokens: 0</span>
  <button id="clearBtn">Clear</button>
</header>
<div id="messages"></div>
<div id="inputArea">
  <textarea id="prompt" placeholder="Type and Enter / Send..."></textarea>
  <div class="actions">
    <span id="streamingIndicator" class="streaming" style="display:none;">Streaming...</span>
    <div>
      <button id="sendBtn">Send</button>
    </div>
  </div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let models = [];
let streaming = false;

function renderModels() {
  const sel = document.getElementById('modelSelect');
  sel.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

function appendMessage(role, content) {
  const container = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = (role === 'user' ? 'You: ' : 'Vibe: ') + content;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function renderChat(list) {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  list.forEach(m => appendMessage(m.role, m.content));
}

window.addEventListener('message', ev => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init':
      models = msg.models || [];
      renderModels();
      document.getElementById('modelSelect').value = msg.currentModel || models[0];
      document.getElementById('tokenUsage').textContent = 'Tokens: ' + (msg.tokenUsage || 0);
      if (msg.apiKeyPresent) {
        const apiEl = document.getElementById('apiKeyInput');
        apiEl.placeholder = 'API key stored';
      }
      break;
    case 'chat':
      renderChat(msg.messages || []);
      break;
    case 'modelChanged':
      document.getElementById('modelSelect').value = msg.model;
      break;
    case 'tokenUsage':
      document.getElementById('tokenUsage').textContent = 'Tokens: ' + msg.usage;
      break;
    case 'streaming':
      streaming = !!msg.value;
      document.getElementById('streamingIndicator').style.display = streaming ? 'inline' : 'none';
      break;
    case 'apiKeySaved':
      // no-op visual cue already assistant message
      break;
  }
});

document.getElementById('sendBtn').addEventListener('click', () => {
  const ta = document.getElementById('prompt');
  const txt = ta.value.trim();
  if (!txt) {
    appendMessage('assistant','⚠️ Enter a message first.');
    return;
  }
  appendMessage('user', txt);
  vscode.postMessage({ type:'send', text: txt });
  ta.value = '';
});

document.getElementById('prompt').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('sendBtn').click();
  }
});

document.getElementById('modelSelect').addEventListener('change', e => {
  vscode.postMessage({ type:'setModel', model: e.target.value });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  vscode.postMessage({ type:'clear' });
});

document.getElementById('saveKeyBtn').addEventListener('click', () => {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) { alert('Enter API key first.'); return; }
  vscode.postMessage({ type:'setApiKey', key: val });
});

</script>
</body>
</html>`;
  }

  private nonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
}