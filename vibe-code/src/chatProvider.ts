import * as vscode from 'vscode';
import { join } from 'path';
import { LLMService, FREE_MODELS, buildSystemPrompt, ChatMessage, getOpenRouterApiKey } from './llmService';
import { MemoryBank, buildMemoryPromptSegment } from './memory';
import { Orchestrator } from './orchestrator';

/**
 * Chat session state
 */
interface ChatEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

interface DiffSuggestion {
  id: string;
  filePath: string;
  original?: string;
  proposed: string;
  applied: boolean;
}

/**
 * Provides the Kilo-style Chat webview in the sidebar.
 * Handles:
 *  - Mode / model dropdown
 *  - Streaming messages
 *  - Diff suggestion detection & preview (supervised edits)
 *  - Memory injection / recall
 *  - Token usage display (approx)
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = 'vibe.chatView';

  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private chat: ChatEntry[] = [];
  private diffSuggestions: DiffSuggestion[] = [];
  private currentMode: string = 'code';
  private currentPersonaLabel = 'Balanced';
  private currentPersonaDescription =
    'General purpose assistant with safe defaults.';
  private customModesCache: Array<{ name: string; prompt: string }> = [];
  // Enhanced features
  private draggedFiles: string[] = [];
  private conversationHistory: ChatEntry[] = [];
  private searchQuery: string = '';
  private isStreaming: boolean = false;
  private currentStreamingMessage: ChatEntry | null = null;
  private codeBlockCounter: number = 0;
  private readonly MAX_CONVERSATION_HISTORY = 100;
  private readonly MAX_CODE_BLOCKS = 50;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly llm: LLMService,
    private readonly memory: MemoryBank,
    private readonly orchestrator: Orchestrator,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel.appendLine('[ChatProvider] Constructor initialized.');
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    this.outputChannel.appendLine('[ChatProvider] resolveWebviewView called.');

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.renderHtml(webviewView.webview);
    
    this.attachMessageListener();
    this.postInit();

    // Fallback probe: if webviewReady handshake not received within 4s, surface a recovery hint.
    this.outputChannel.appendLine('[ChatProvider] Scheduling webviewReady fallback probe.');
    const probe = setTimeout(() => {
      try {
        // If no assistant/system messages injected yet (chat length 0), likely handshake failed.
        if (this.chat.length === 0) {
          this.outputChannel.appendLine('[ChatProvider] webviewReady not confirmed within 4s - issuing fallback notice.');
          this.pushAssistant('Webview initialized but handshake not confirmed. If the Send button does nothing, run command: "Vibe: Reload Chat View".');
        }
      } catch (e: any) {
        this.outputChannel.appendLine('[ChatProvider] webviewReady fallback error: ' + (e.message || String(e)));
      }
    }, 4000);
    this.disposables.push({ dispose: () => clearTimeout(probe) });
    
    this.outputChannel.appendLine('[ChatProvider] Webview view initialized successfully.');
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }

  private postInit() {
    this.refreshCustomModes();
    const cfg = vscode.workspace.getConfiguration('vibe');
    let apiKey: string | undefined;
    try {
      apiKey = getOpenRouterApiKey();
    } catch {
      apiKey = undefined;
    }
    this.postMessage({
      type: 'init',
      modes: this.collectModes(),
      freeModels: FREE_MODELS,
      currentMode: this.currentMode,
      currentModel: cfg.get<string>('model', FREE_MODELS[0]), // defaults to GLM-4.5-Air (FREE)
      persona: {
        label: this.currentPersonaLabel,
        description: this.currentPersonaDescription,
      },
      tokenUsage: this.llm.getSessionTokenUsage(),
      apiKeyPresent: !!apiKey,
    });
    // Guidance if API key missing.
    if (!apiKey) {
      this.pushAssistant('Add your OpenRouter API key below or in Settings: "vibe.openRouter.apiKey" to begin.');
    }
  }

  private collectModes(): Array<{ id: string; label: string; prompt?: string }> {
    const base: Array<{ id: string; label: string; prompt?: string }> = [
          { id: 'code', label: 'Code' },
          { id: 'architect', label: 'Architect' },
          { id: 'ask', label: 'Ask' },
          { id: 'debug', label: 'Debug' },
          { id: 'orchestrator', label: 'Orchestrator' },
          { id: 'custom', label: 'Custom' },
        ];
    if (this.customModesCache.length > 0) {
      for (const cm of this.customModesCache) {
        base.push({ id: `custom:${cm.name}`, label: cm.name, prompt: cm.prompt });
      }
    }
    return base;
  }

  private refreshCustomModes() {
    const arr = vscode.workspace
      .getConfiguration('vibe')
      .get<Array<{ name: string; prompt: string }>>('customModes', []);
    if (Array.isArray(arr)) {
      this.customModesCache = arr.filter(
        (x) => typeof x?.name === 'string' && typeof x?.prompt === 'string'
      );
    }
  }

  /**
   * Public method to update modes configuration
   */
  public updateModes() {
    this.refreshCustomModes();
    this.postMessage({
      type: 'updateModes',
      modes: this.collectModes(),
    });
  }

  private attachMessageListener() {
    if (!this.view) {
      this.outputChannel.appendLine('[ChatProvider] attachMessageListener called but no view available');
      return;
    }
    this.outputChannel.appendLine('[ChatProvider] Attaching message listener');
    const sub = this.view.webview.onDidReceiveMessage(
      async (msg: any) => {
        this.outputChannel.appendLine('[ChatProvider] Received message: ' + JSON.stringify(msg));
        switch (msg.type) {
          case 'send':
            this.outputChannel.appendLine('[ChatProvider] Processing send message with text length: ' + (msg.text?.length || 0));
            await this.handleSend(msg.text?.toString() ?? '');
            break;
          case 'setMode':
            this.setMode(msg.mode);
            break;
          case 'setModel':
            this.setModel(msg.model);
            break;
          case 'regen':
          case 'regenRequestFromCommand':
            // Support both webview button and command palette regeneration triggers.
            await this.regenerateLastAssistant();
            break;
          case 'setApiKey':
            if (typeof msg.key === 'string') {
              const incoming = msg.key.trim();
              if (incoming === '********') {
                this.pushAssistant('⚠️ Mask value detected. Enter real API key (not asterisks).');
                this.outputChannel.appendLine('[ChatProvider] Ignored masked API key submission.');
                break;
              }
              const cfg = vscode.workspace.getConfiguration('vibe');
              await cfg.update('openRouter.apiKey', incoming, vscode.ConfigurationTarget.Workspace);
              this.pushAssistant('API key saved.');
              this.postMessage({ type: 'apiKeySaved' });
              this.outputChannel.appendLine('[ChatProvider] API key updated via webview.');
            }
            break;
          case 'applyDiff':
            if (typeof msg.id === 'string') {
              await this.applyDiff(msg.id);
            }
            break;
          case 'rejectDiff':
            if (typeof msg.id === 'string') {
              this.rejectDiff(msg.id);
            }
            break;
          case 'clearChat':
            this.clearChat();
            break;
          case 'planOrchestrator':
            await this.orchestrator.planFromPrompt(
              msg.prompt || '',
              'orchestrator',
              'Orchestrator',
              'Coordinates multi-step workflows'
            );
            break;
          case 'executePlan':
            await this.orchestrator.executeAll();
            break;
          case 'refreshMemory':
            this.refreshMemoryContext(msg.query || '');
            break;
          case 'webviewReady':
            this.outputChannel.appendLine('[ChatProvider] webviewReady handshake received.');
            this.postMessage({ type: 'tokenUsage', usage: this.llm.getSessionTokenUsage() });
            break;
          case 'debug':
            if (typeof (msg as any).msg === 'string') {
              this.outputChannel.appendLine('[Webview DEBUG] ' + (msg as any).msg);
            } else {
              this.outputChannel.appendLine('[Webview DEBUG] (no msg field)');
            }
            break;
          default:
            this.outputChannel.appendLine('[ChatProvider] Unhandled message type: ' + msg.type);
            break;
        }
      },
      undefined,
      this.disposables
    );
    this.disposables.push(sub);
  }

  private setMode(mode: string) {
    this.currentMode = mode;
    this.refreshCustomModes();
    this.updatePersonaForMode(mode);
    this.postMessage({
      type: 'modeChanged',
      mode,
    });
  }

  private updatePersonaForMode(mode: string) {
    switch (true) {
      case mode === 'architect':
        this.currentPersonaLabel = 'Architect';
        this.currentPersonaDescription =
          'Plans high-level architecture with clear subtasks.';
        break;
      case mode === 'debug':
        this.currentPersonaLabel = 'Debug Doctor';
        this.currentPersonaDescription =
          'Specializes in debugging, logging, and root-cause analysis.';
        break;
      case mode === 'ask':
        this.currentPersonaLabel = 'Explainer';
        this.currentPersonaDescription =
          'Explains concepts and answers questions clearly.';
        break;
      case mode === 'orchestrator':
        this.currentPersonaLabel = 'Orchestrator';
        this.currentPersonaDescription =
          'Coordinates multi-step workflows and agents.';
        break;
      default:
        this.currentPersonaLabel = 'Balanced';
        this.currentPersonaDescription =
          'General purpose assistant with safe defaults.';
        break;
    }
  }

  private setModel(model: string) {
    // Strict Enforcement: Block any non-free model attempts
    if (!FREE_MODELS.includes(model as any)) {
      const allowedModels = FREE_MODELS.join(', ');
      vscode.window.showErrorMessage(
        `Only free tier models allowed. Current free models: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini. Requested model "${model}" is not allowed.`
      );
      return;
    }
    const cfg = vscode.workspace.getConfiguration('vibe');
    void cfg.update('model', model, vscode.ConfigurationTarget.Workspace);
    this.postMessage({
      type: 'modelChanged',
      model,
    });
  }

  private async handleSend(raw: string) {
    const text = raw.trim();
    if (!text) {
      this.outputChannel.appendLine('[ChatProvider] handleSend ignored empty text.');
      this.pushAssistant('⚠️ Error: Please enter a message before sending.');
      return;
    }

    // Pre-flight diagnostics
    if (!this.view) {
      this.outputChannel.appendLine('[ChatProvider] handleSend aborted: webview view not available.');
      this.pushAssistant('⚠️ Internal error: chat view not ready. Run "Vibe: Reload Chat View" command.');
      return;
    }

    this.outputChannel.appendLine(`[ChatProvider] handleSend start. chars=${text.length} mode=${this.currentMode} persona=${this.currentPersonaLabel}`);

    // Add user message
    const userEntry: ChatEntry = {
      id: this.genId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    this.chat.push(userEntry);
    this.emitChat();

    // Check API key first
    let apiKey: string;
    try {
      apiKey = getOpenRouterApiKey();
      this.outputChannel.appendLine('[ChatProvider] API key retrieved successfully.');
    } catch (err: any) {
      const errorMsg =
        '⚠️ **API Key Not Configured**\n\nPlease set your OpenRouter API key in one of these ways:\n1. Enter it in the text field above and click "Save"\n2. Go to Settings (⌘,) → Extensions → Vibe → OpenRouter API Key\n3. Set environment variable: OPENROUTER_API_KEY\n\nGet your free API key at: https://openrouter.ai/keys';
      this.pushAssistant(errorMsg);
      vscode.window.showErrorMessage(
        'Vibe: OpenRouter API key missing. Set vibe.openRouter.apiKey or OPENROUTER_API_KEY.'
      );
      this.outputChannel.appendLine(
        '[ChatProvider] Error: API key not configured - ' + (err.message || String(err))
      );
      return;
    }

    // Build system prompt
    const cfg = vscode.workspace.getConfiguration('vibe');
    const model = cfg.get<string>('model', FREE_MODELS[0])!;
    const autoApprove = false;
    const maxContextFiles = cfg.get<number>('maxContextFiles', 30);
    const customModePrompt = this.currentMode.startsWith('custom:')
      ? this.customModesCache.find((m) => `custom:${m.name}` === this.currentMode)?.prompt
      : undefined;

    const memorySegment = buildMemoryPromptSegment(this.memory, text);

    const systemPrompt = buildSystemPrompt({
      baseMode: this.currentMode,
      personaLabel: this.currentPersonaLabel,
      personaDescription: this.currentPersonaDescription,
      customModePrompt,
      autoApprove,
      maxContextFiles,
    });

    this.outputChannel.appendLine(
      `[ChatProvider] System prompt built. memorySegmentLength=${memorySegment.length} totalChatMessages=${this.chat.length}`
    );

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + '\n' + memorySegment },
      ...this.chat.map((c) => ({ role: c.role, content: c.content })),
    ];

    this.outputChannel.appendLine(
      `[ChatProvider] Prepared messages for streaming. totalMessages=${messages.length}`
    );

    let acc = '';
    let assistantEntry: ChatEntry | null = null;
    const streamStartTs = Date.now();

    try {
      this.outputChannel.appendLine('[ChatProvider] Initiating LLM stream. model=' + model);
      const { emitter, done } = this.llm.streamChatCompletion({
        apiKey,
        model,
        messages,
        temperature: 0.15,
      });

      let firstDeltaTs: number | null = null;

      emitter.on((chunk) => {
        if (chunk.delta) {
          if (!firstDeltaTs) {
            firstDeltaTs = Date.now();
            this.outputChannel.appendLine(
              `[ChatProvider] First delta received after ${firstDeltaTs - streamStartTs}ms`
            );
          }
          acc += chunk.delta;
          if (!assistantEntry) {
            assistantEntry = {
              id: this.genId(),
              role: 'assistant',
              content: '',
              createdAt: Date.now(),
            };
            this.chat.push(assistantEntry);
          }
          assistantEntry.content = acc;
          this.emitChat();
          this.postMessage({
            type: 'tokenUsage',
            usage: this.llm.getSessionTokenUsage(),
          });
        }
        if (chunk.done) {
          this.scanForDiffSuggestions(assistantEntry?.content || '');
          this.outputChannel.appendLine(
            '[ChatProvider] Stream completed successfully. finalLength=' + acc.length
          );
        }
        if (chunk.error) {
          this.outputChannel.appendLine('[ChatProvider] Stream chunk error: ' + chunk.error);
        }
      });

      await done;
    } catch (err: any) {
      this.outputChannel.appendLine(
        '[ChatProvider] LLM Error during streaming: ' + (err.message || String(err))
      );

      // Detailed error analysis
      let errorMsg = '⚠️ **Error Communicating with AI**\n\n';
      const errStr = String(err.message || err).toLowerCase();

      if (errStr.includes('api key') || errStr.includes('unauthorized') || errStr.includes('401')) {
        errorMsg +=
          '**Issue: Invalid API Key**\n\nYour API key appears to be invalid or expired.\n\n**Solution:**\n1. Get a new API key from https://openrouter.ai/keys\n2. Enter it above and click "Save"\n3. Try sending your message again';
      } else if (errStr.includes('network') || errStr.includes('fetch') || errStr.includes('connect')) {
        errorMsg +=
          '**Issue: Network Connection Problem**\n\nCannot connect to OpenRouter API.\n\n**Possible causes:**\n1. No internet connection\n2. Firewall blocking the request\n3. OpenRouter service is down\n\n**Solution:**\n1. Check your internet connection\n2. Check firewall settings\n3. Try again in a few moments';
      } else if (errStr.includes('timeout')) {
        errorMsg +=
          '**Issue: Request Timeout**\n\nThe request took too long to complete.\n\n**Solution:**\n1. Try again with a shorter message\n2. Check your internet speed\n3. Wait a moment and retry';
      } else if (errStr.includes('rate limit') || errStr.includes('429')) {
        errorMsg +=
          '**Issue: Rate Limit Exceeded**\n\nToo many requests in a short time.\n\n**Solution:**\n1. Wait a few minutes before trying again\n2. Consider upgrading your OpenRouter plan';
      } else {
        errorMsg +=
          '**Issue: Unknown Error**\n\n```\n' +
          (err.message || String(err)) +
          '\n```\n\n**Solution:**\n1. Check the Output panel (View → Output → Vibe Extension) for details\n2. Try reloading VSCode (Developer: Reload Window)\n3. If the issue persists, report it on GitHub';
      }

      this.pushAssistant(errorMsg);
      vscode.window.showErrorMessage('Vibe: ' + (err.message || String(err)));
    }
  }

  private async regenerateLastAssistant() {
    const lastAssistant = [...this.chat]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAssistant) {
      vscode.window.showInformationMessage('Vibe: No assistant message to regenerate.');
      return;
    }
    // Remove it & resend last user
    const idx = this.chat.indexOf(lastAssistant);
    if (idx !== -1) this.chat.splice(idx, 1);
    const lastUser = [...this.chat].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      vscode.window.showWarningMessage(
        'Vibe: Regeneration requires a preceding user message.'
      );
      return;
    }
    await this.handleSend(lastUser.content);
  }

  private clearChat() {
    this.chat = [];
    this.diffSuggestions = [];
    this.emitChat();
    this.postMessage({ type: 'diffSuggestions', items: [] });
    this.llm.resetSessionTokenUsage();
    this.postMessage({ type: 'tokenUsage', usage: 0 });
  }

  private refreshMemoryContext(query: string) {
    const segment = buildMemoryPromptSegment(this.memory, query || '');
    this.postMessage({
      type: 'memorySegment',
      segment,
    });
  }

  private emitChat() {
    this.postMessage({
      type: 'chat',
      messages: this.chat.map((c) => ({
        id: c.id,
        role: c.role,
        content: c.content,
      })),
    });
  }

  private postMessage(msg: unknown) {
    if (!this.view) {
      this.outputChannel.appendLine('[ChatProvider] postMessage dropped (no view). type=' + (msg as any)?.type);
      return;
    }
    this.view.webview.postMessage(msg);
  }

  private genId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  /**
   * Detect diff suggestions in assistant response using fenced code with a marker.
   * Supported patterns:
   * ```diff path=relative/file.ts
   * @@ original ...
   * + proposed ...
   * ```
   * or
   * ```vibe-edit path=relative/file.ts
   * --- original
   * +++ proposed
   * (new content)
   * ```
   */
  private scanForDiffSuggestions(content: string) {
    const diffRegex =
      /```(diff|vibe-edit)[^\n]*path=([^\n]+)\n([\s\S]*?)```/gim;
    let match: RegExpExecArray | null;
    const suggestions: DiffSuggestion[] = [];
    while ((match = diffRegex.exec(content))) {
      const filePath = match[2].trim();
      const body = match[3];
      // For now treat entire body as proposed content (supervised replace). Original optional.
      suggestions.push({
        id: this.genId(),
        filePath,
        proposed: body.trim(),
        applied: false,
      });
    }
    if (suggestions.length > 0) {
      this.diffSuggestions.push(...suggestions);
      this.postMessage({
        type: 'diffSuggestions',
        items: this.diffSuggestions.map((d) => ({
          id: d.id,
          filePath: d.filePath,
          applied: d.applied,
          snippet: truncate(d.proposed, 400),
        })),
      });
      if (vscode.workspace.getConfiguration('vibe').get<boolean>('diff.autoReveal', true)) {
        vscode.window.showInformationMessage(
          `Vibe: ${suggestions.length} diff suggestion(s) ready for review.`
        );
      }
    }
  }

  private async applyDiff(id: string) {
    const diff = this.diffSuggestions.find((d) => d.id === id);
    if (!diff) return;
    try {
      const wsFolder = vscode.workspace.workspaceFolders?.[0];
      if (!wsFolder) {
        vscode.window.showErrorMessage('Vibe: No workspace folder open.');
        return;
      }
      const targetUri = vscode.Uri.joinPath(wsFolder.uri, diff.filePath);
      let originalContent = '';
      try {
        const bytes = await vscode.workspace.fs.readFile(targetUri);
        originalContent = Buffer.from(bytes).toString('utf8');
      } catch {
        // New file scenario
      }

      // Backup for rollback
      await this.createBackup(targetUri, originalContent);

      // Apply (replace full file for now — TODO: integrate diff patching)
      const enc = new TextEncoder();
      await vscode.workspace.fs.writeFile(targetUri, enc.encode(diff.proposed));
      diff.applied = true;
      this.postMessage({
        type: 'diffApplied',
        id: diff.id,
      });
      vscode.window.showInformationMessage(
        `Vibe: Applied diff to ${diff.filePath}`
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(
        'Vibe: Failed applying diff — ' + (err.message || String(err))
      );
    }
  }

  private rejectDiff(id: string) {
    const idx = this.diffSuggestions.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.diffSuggestions.splice(idx, 1);
    }
    this.postMessage({
      type: 'diffSuggestions',
      items: this.diffSuggestions.map((d) => ({
        id: d.id,
        filePath: d.filePath,
        applied: d.applied,
        snippet: truncate(d.proposed, 400),
      })),
    });
  }

  /**
   * Create backup in context storage for rollback stack.
   */
  private async createBackup(uri: vscode.Uri, content: string) {
    const backups =
      this.context.workspaceState.get<Array<{ path: string; content: string; ts: number }>>(
        'vibe.backups'
      ) || [];
    backups.push({ path: uri.fsPath, content, ts: Date.now() });
    // Keep last 30
    while (backups.length > 30) backups.shift();
    await this.context.workspaceState.update('vibe.backups', backups);
  }

  /**
   * Undo last applied diff by restoring backup.
   */
  public async rollbackLast(): Promise<void> {
    const backups =
      this.context.workspaceState.get<Array<{ path: string; content: string; ts: number }>>(
        'vibe.backups'
      ) || [];
    if (backups.length === 0) {
      vscode.window.showInformationMessage('Vibe: No backups to rollback.');
      return;
    }
    const last = backups.pop()!;
    await this.context.workspaceState.update('vibe.backups', backups);
    const uri = vscode.Uri.file(last.path);
    const enc = new TextEncoder();
    await vscode.workspace.fs.writeFile(uri, enc.encode(last.content));
    vscode.window.showInformationMessage(
      `Vibe: Rolled back changes to ${last.path}`
    );
  }

  /**
   * HTML / UI (Kilo-inspired)
   */
  private renderHtml(webview: vscode.Webview): string {
    const nonce = this.nonce();
    const csp = webview.cspSource;
    const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'icon.svg'));
    // Debug line to help diagnose blank panel issues.
    this.outputChannel.appendLine('[ChatProvider] renderHtml starting. icon=' + iconUri.toString());
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Vibe Chat</title>
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
  display:flex;
  gap:6px;
  align-items:center;
  padding:6px 8px;
  border-bottom:1px solid var(--vscode-panel-border);
  flex-wrap: wrap;
}

select, button {
  font-size:11px;
}

#messages {
  flex:1;
  overflow-y:auto;
  padding:8px;
  position: relative;
}

.msg {
  margin-bottom:12px;
  padding:8px 12px;
  border-radius:8px;
  line-height:1.5;
  position: relative;
  max-width: 100%;
  word-wrap: break-word;
}

.msg.user {
  background: var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);
  margin-left: 20px;
}

.msg.assistant {
  background: var(--vscode-editorWidget-background);
  border:1px solid var(--vscode-panel-border);
  margin-right: 20px;
}

.msg .timestamp {
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
}

.msg .actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.msg:hover .actions {
  opacity: 1;
}

.msg .action-btn {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 4px;
  margin-left: 4px;
  border-radius: 3px;
}

.msg .action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

#inputArea {
  border-top:1px solid var(--vscode-panel-border);
  padding:8px;
  background: var(--vscode-editor-background);
  position: relative;
}

#prompt {
  width:100%;
  min-height:60px;
  resize:vertical;
  font-size:12px;
  font-family: inherit;
  padding: 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
}

#prompt:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.drop-zone {
  border: 2px dashed var(--vscode-panel-border);
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  margin-bottom: 8px;
  background: var(--vscode-editorWidget-background);
  opacity: 0.7;
  transition: all 0.2s;
}

.drop-zone.drag-over {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-editor-selectionBackground);
  opacity: 1;
}

.drop-zone .drop-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.actions {
  display:flex;
  justify-content:space-between;
  align-items: center;
  margin-top:8px;
}

.left-actions, .right-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.token-usage {
  font-size:10px;
  opacity:0.8;
  padding: 4px 8px;
  background: var(--vscode-badge-background);
  border-radius: 4px;
}

.diff-box {
  border-top:1px solid var(--vscode-panel-border);
  max-height:160px;
  overflow:auto;
  padding:8px;
  background: var(--vscode-editorWidget-background);
}

.diff-item {
  border:1px solid var(--vscode-panel-border);
  padding:6px 8px;
  margin-bottom:8px;
  border-radius:6px;
  background: var(--vscode-editorHoverWidget-background);
  position: relative;
}

.diff-item.applied {
  opacity:0.6;
}

.diff-item .file-path {
  font-weight: bold;
  color: var(--vscode-foreground);
  margin-bottom: 4px;
}

.diff-item .snippet {
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
  background: var(--vscode-editor-background);
  padding: 4px;
  border-radius: 3px;
  margin: 4px 0;
  overflow-x: auto;
}

.diff-item .apply-btn, .diff-item .reject-btn {
  padding: 4px 8px;
  font-size: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 4px;
}

.diff-item .apply-btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.diff-item .apply-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.diff-item .reject-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.diff-item .reject-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

/* Enhanced code blocks */
.code-block {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  margin: 8px 0;
  overflow: hidden;
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--vscode-editorWidget-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 11px;
}

.code-block-content {
  padding: 12px;
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre;
}

.code-block .copy-btn {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.code-block .copy-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

/* Search and filter */
.search-container {
  padding: 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editorWidget-background);
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 11px;
}

.search-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

/* Streaming indicator */
.streaming-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  opacity: 0.7;
}

.streaming-dots {
  display: inline-flex;
  gap: 2px;
}

.streaming-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--vscode-foreground);
  animation: pulse 1.4s infinite ease-in-out;
}

.streaming-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.3;
  }
  40% {
    opacity: 1;
  }
}

/* Responsive design */
@media (max-width: 600px) {
  header {
    flex-direction: column;
    gap: 4px;
  }
  
  .msg.user, .msg.assistant {
    margin-left: 0;
    margin-right: 0;
  }
  
  .actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .left-actions, .right-actions {
    justify-content: center;
  }
}
</style>
</head>
<body>
<header>
  <img src="${iconUri}" alt="Vibe" style="height:16px;width:16px;vertical-align:middle;border-radius:4px;" />
  <strong style="font-size:12px;margin-left:4px;">Vibe AI</strong>
  <select id="modeSelect" title="Mode"></select>
  <select id="modelSelect" title="Model"></select>
  <input id="apiKeyInput" type="password" placeholder="OpenRouter API Key" style="flex:1;min-width:120px;font-size:11px;padding:2px 4px;" />
  <button id="saveKeyBtn" title="Save API Key">Save</button>
  <button id="searchBtn" title="Search conversation">🔍</button>
  <button id="exportBtn" title="Export conversation">📤</button>
  <button id="clearBtn" title="Clear chat history">Clear</button>
  <button id="regenBtn" title="Regenerate last reply">↻</button>
  <button id="planBtn" title="Plan orchestrator">📋</button>
  <button id="execBtn" title="Execute plan">▶</button>
</header>

<div class="search-container" id="searchContainer" style="display:none;">
  <input type="text" id="searchInput" class="search-input" placeholder="Search conversation..." />
  <button id="closeSearchBtn" style="float:right;">✕</button>
</div>

<div id="messages"></div>

<div class="diff-box" id="diffBox" style="display:none;"></div>

<div id="inputArea">
  <div class="drop-zone" id="dropZone" style="display:none;">
    <div class="drop-icon">📁</div>
    <div>Drop files here to include in context</div>
  </div>
  
  <textarea id="prompt" placeholder="Ask Vibe AI anything... (Drag files here or use @ to mention files)"></textarea>
  
  <div class="actions">
    <div class="left-actions">
      <span class="token-usage" id="tokenUsage">Tokens: 0</span>
      <span class="streaming-indicator" id="streamingIndicator" style="display:none;">
        <span>Thinking</span>
        <div class="streaming-dots">
          <div class="streaming-dot"></div>
          <div class="streaming-dot"></div>
          <div class="streaming-dot"></div>
        </div>
      </span>
    </div>
    <div class="right-actions">
      <button id="attachBtn" title="Attach files">📎</button>
      <button id="sendBtn">Send</button>
    </div>
  </div>
</div>
<script type="text/javascript" nonce="${nonce}">
(function() {
'use strict';
const vscode = acquireVsCodeApi();
let modes = [];
let freeModels = [];
let currentMode = 'code';

// Lightweight logging helper (visible in DevTools console for webview)
function log(...a){try{console.log('[Kazi AI]',...a);}catch(e){}}

// Global error hook to surface script failures
window.onerror = (msg, src, line, col, err) => {
  log('GlobalError', msg, src, line, col, err && err.stack);
  vscode.postMessage({ type: 'debug', msg: 'GlobalError: ' + msg });
  const container = document.getElementById('messages');
  if (container){
    const div = document.createElement('div');
    div.className='msg assistant';
    div.style.border='1px solid var(--vscode-errorForeground)';
    div.textContent='[Webview Error] ' + msg;
    container.appendChild(div);
  }
};

// Early debug probes (before DOMContentLoaded)
try {
  vscode.postMessage({ type: 'debug', msg: 'Script init start' });
} catch {}

function renderModes() {
  const sel = document.getElementById('modeSelect');
  sel.innerHTML = '';
  modes.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    sel.appendChild(opt);
  });
  sel.value = currentMode;
}

function renderModels() {
  const sel = document.getElementById('modelSelect');
  sel.innerHTML = '';
  freeModels.forEach(m => {
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

function renderChat(messages) {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  messages.forEach(m => appendMessage(m.role, m.content));
}

function renderDiffs(items) {
  const box = document.getElementById('diffBox');
  if (!items || items.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = '';
  items.forEach(it => {
    const d = document.createElement('div');
    d.className = 'diff-item' + (it.applied ? ' applied' : '');
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = it.filePath + '\\n' + it.snippet;
    d.appendChild(pre);
    if (!it.applied) {
      const applyBtn = document.createElement('button');
      applyBtn.textContent = 'Apply';
      applyBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'applyDiff', id: it.id });
      });
      d.appendChild(applyBtn);

      const rejectBtn = document.createElement('button');
      rejectBtn.textContent = 'Reject';
      rejectBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'rejectDiff', id: it.id });
      });
      d.appendChild(rejectBtn);
    }
    box.appendChild(d);
  });
}

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  log('Inbound message', msg && msg.type);
  switch (msg.type) {
    case 'init':
      modes = msg.modes || [];
      freeModels = msg.freeModels || [];
      currentMode = msg.currentMode || 'code';
      renderModes();
      renderModels();
      document.getElementById('modelSelect').value = msg.currentModel || freeModels[0];
      if (msg.apiKeyPresent) {
        const apiEl = document.getElementById('apiKeyInput');
        // Leave value blank to prevent accidental saving of placeholder mask.
        apiEl.placeholder = 'API key stored (enter new to replace)';
        apiEl.value = '';
      }
      document.getElementById('tokenUsage').textContent = 'Tokens: ' + (msg.tokenUsage || 0) + ' (free tier)';
      break;
    case 'chat':
      // If we optimistically appended last user, full re-render will duplicate; to avoid duplicates, re-render fresh.
      renderChat(msg.messages || []);
      break;
    case 'modeChanged':
      currentMode = msg.mode;
      document.getElementById('modeSelect').value = currentMode;
      break;
    case 'modelChanged':
      document.getElementById('modelSelect').value = msg.model;
      break;
    case 'diffSuggestions':
      renderDiffs(msg.items);
      break;
    case 'diffApplied':
      // request refresh maybe (diffSuggestions comes later)
      break;
    case 'tokenUsage':
      document.getElementById('tokenUsage').textContent = 'Tokens: ' + msg.usage + ' (free tier)';
      break;
    case 'memorySegment':
      // optionally surface memory retrieval as a transient assistant message
      appendMessage('assistant', '[Memory]\n' + msg.segment);
      break;
  }
});

// Initialize event listeners - works in VSCode webviews
function initializeEventListeners() {
  log('Initializing event listeners');
  
  const sendBtn = document.getElementById('sendBtn');
  if (!sendBtn) {
    log('ERROR: Send button not found in DOM');
    return;
  }
  
  sendBtn.addEventListener('click', () => {
    try {
      log('Send button clicked');
      const ta = document.getElementById('prompt');
      if (!ta) {
        log('ERROR: Prompt textarea not found');
        alert('Error: Chat input field not initialized. Please reload the extension.');
        return;
      }
      const txt = ta.value.trim();
      if (!txt) {
        log('Empty prompt ignored');
        appendMessage('assistant', '⚠️ Please enter a message before sending.');
        return;
      }
      // Optimistic local echo of user bubble so user sees immediate feedback
      appendMessage('user', txt);
      log('Posting message to extension, length:', txt.length);
      vscode.postMessage({ type: 'send', text: txt });
      ta.value = '';
      log('Sent prompt to extension successfully');
    } catch (e) {
      log('SendError', e);
      appendMessage('assistant', '⚠️ Error sending message: ' + (e.message || String(e)) + '\n\nPlease check the Output panel (View → Output → Vibe Extension) for details.');
      alert('Error: Failed to send message. Check console for details.');
    }
  });

  const promptField = document.getElementById('prompt');
  if (promptField) {
    promptField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const btn = document.getElementById('sendBtn');
        if (btn) btn.click();
      }
    });
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'clearChat' });
    });
  }

  const regenBtn = document.getElementById('regenBtn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      log('Regenerate requested');
      vscode.postMessage({ type: 'regen' });
    });
  }

  const modeSelect = document.getElementById('modeSelect');
  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      vscode.postMessage({ type: 'setMode', mode: e.target.value });
    });
  }

  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      vscode.postMessage({ type: 'setModel', model: e.target.value });
    });
  }

  const saveKeyBtn = document.getElementById('saveKeyBtn');
  if (saveKeyBtn) {
    saveKeyBtn.addEventListener('click', () => {
      const val = document.getElementById('apiKeyInput').value.trim();
      if (!val) {
        alert('Enter an API key first.');
        return;
      }
      vscode.postMessage({ type: 'setApiKey', key: val });
    });
  }

  const planBtn = document.getElementById('planBtn');
  if (planBtn) {
    planBtn.addEventListener('click', () => {
      const lastUser = [...document.querySelectorAll('.msg.user')].pop();
      const text = lastUser ? lastUser.textContent.replace(/^You:\s*/, '') : '';
      if (!text) return;
      vscode.postMessage({ type: 'planOrchestrator', prompt: text });
    });
  }

  const execBtn = document.getElementById('execBtn');
  if (execBtn) {
    execBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'executePlan' });
    });
  }

  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchContainer = document.getElementById('searchContainer');
      if (searchContainer) {
        searchContainer.style.display = searchContainer.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Export functionality placeholder
      log('Export requested');
    });
  }

  const attachBtn = document.getElementById('attachBtn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      // Attach functionality placeholder
      log('Attach requested');
    });
  }

  const closeSearchBtn = document.getElementById('closeSearchBtn');
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', () => {
      const searchContainer = document.getElementById('searchContainer');
      if (searchContainer) {
        searchContainer.style.display = 'none';
      }
    });
  }

  log('All event listeners attached successfully');
  log('Webview ready - posting handshake');
  vscode.postMessage({ type: 'webviewReady' });
}

// Initialize immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  // DOM already loaded, initialize immediately
  initializeEventListeners();
}
})();
</script>
</body>
</html>`;
  }

  /**
   * Public helper to inject memory entry from external command.
   */
  public addMemoryEntry(text: string, tags: string[] = [], importance = 0) {
    this.memory.addMemory(text, { tags, importance, scope: 'workspace' });
  }

  /**
   * Allow external modules to push an assistant message (e.g., orchestrator summary).
   */
  public pushAssistant(content: string) {
    const entry: ChatEntry = {
      id: this.genId(),
      role: 'assistant',
      content,
      createdAt: Date.now(),
    };
    this.chat.push(entry);
    this.emitChat();
  }

  /**
   * Expose diff suggestions list.
   */
  public listDiffSuggestions(): DiffSuggestion[] {
    return [...this.diffSuggestions];
  }

  /**
   * Simple helper for debug commands to send a prompt as if typed by user.
   */
  public async debugSend(text: string): Promise<void> {
    await this.handleSend(text);
  }

  /**
   * Force reload of the webview (defensive recovery if initial render failed).
   */
  public forceReload() {
    if (!this.view) {
      vscode.window.showWarningMessage('Vibe: Cannot reload — chat view not available yet.');
      return;
    }
    this.outputChannel.appendLine('[ChatProvider] forceReload invoked.');
    try {
      this.view.webview.html = this.renderHtml(this.view.webview);
      this.postInit();
      vscode.window.showInformationMessage('Vibe: Chat reloaded.');
    } catch (err: any) {
      this.outputChannel.appendLine('[ChatProvider] forceReload error: ' + (err.message || String(err)));
      vscode.window.showErrorMessage('Vibe: Reload failed — ' + (err.message || String(err)));
    }
  }

  private nonce(): string {
    let s = '';
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 16; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }
}

/**
 * Utility
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * HTML escape utility used in error fallback rendering.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}