import * as vscode from 'vscode';
import {
  LLMService,
  ChatMessage,
  buildSystemPrompt,
  FREE_MODELS,
  approximateTokens,
  getOpenRouterApiKey,
} from './llmService';
import { MemoryBank, buildMemoryPromptSegment } from './memory';

/**
 * A node in the orchestration task tree.
 */
export type OrchestratorNodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface OrchestratorNodeData {
  id: string;
  title: string;
  detail?: string;
  parentId?: string;
  attemptCount: number;
  maxAttempts: number;
  status: OrchestratorNodeStatus;
  children: string[];
  createdAt: number;
  updatedAt: number;
  error?: string;
  // Optional file targets referenced for hallucination grounding.
  referencedFiles?: string[];
}

export interface ExecutionOptions {
  abortSignal?: AbortSignal;
  maxParallel?: number;
}

/**
 * Internal tree model maintained by Orchestrator.
 */
export class OrchestratorModel {
  private nodes = new Map<string, OrchestratorNodeData>();
  private rootId: string | null = null;

  public clear() {
    this.nodes.clear();
    this.rootId = null;
  }

  public createRoot(title: string, detail?: string): OrchestratorNodeData {
    const id = this.genId();
    const root: OrchestratorNodeData = {
      id,
      title,
      detail,
      attemptCount: 0,
      maxAttempts: 1,
      status: 'pending',
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.nodes.set(id, root);
    this.rootId = id;
    return root;
  }

  public addChild(
    parentId: string,
    title: string,
    detail?: string,
    maxAttempts = 2
  ): OrchestratorNodeData {
    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent ${parentId} not found`);
    }
    const id = this.genId();
    const node: OrchestratorNodeData = {
      id,
      title,
      detail,
      parentId,
      attemptCount: 0,
      maxAttempts,
      status: 'pending',
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    parent.children.push(id);
    parent.updatedAt = Date.now();
    this.nodes.set(id, node);
    return node;
  }

  public getRoot(): OrchestratorNodeData | undefined {
    return this.rootId ? this.nodes.get(this.rootId) : undefined;
  }

  public getNode(id: string): OrchestratorNodeData | undefined {
    return this.nodes.get(id);
  }

  public listChildren(id: string): OrchestratorNodeData[] {
    const n = this.nodes.get(id);
    if (!n) return [];
    return n.children.map((cid) => this.nodes.get(cid)!).filter(Boolean);
  }

  public updateStatus(id: string, status: OrchestratorNodeStatus, error?: string) {
    const n = this.nodes.get(id);
    if (!n) return;
    n.status = status;
    n.error = error;
    n.updatedAt = Date.now();
  }

  public incrementAttempt(id: string) {
    const n = this.nodes.get(id);
    if (!n) return;
    n.attemptCount++;
    n.updatedAt = Date.now();
  }

  private genId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  public allNodes(): OrchestratorNodeData[] {
    return [...this.nodes.values()].sort((a, b) => a.createdAt - b.createdAt);
  }
}

/**
 * Tree item provider for Orchestrator view (used in webview panel).
 */
export class OrchestratorTreeDataProvider
  implements vscode.TreeDataProvider<OrchestratorNodeData>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    OrchestratorNodeData | undefined | void
  >();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private model: OrchestratorModel) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: OrchestratorNodeData): vscode.TreeItem {
    const item = new vscode.TreeItem(element.title);
    item.collapsibleState =
      element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None;
    const statusIcon = statusIconFor(element.status);
    item.description = statusIcon + (element.detail ? ` ${element.detail}` : '');
    if (element.status === 'failed' && element.error) {
      item.tooltip = new vscode.MarkdownString(
        `**Failed**\n\nError: ${element.error}`
      );
    } else if (element.referencedFiles?.length) {
      item.tooltip = new vscode.MarkdownString(
        'Files: ' + element.referencedFiles.join('\n')
      );
    }
    return item;
  }

  getChildren(element?: OrchestratorNodeData): Thenable<OrchestratorNodeData[]> {
    if (!element) {
      const root = this.model.getRoot();
      return Promise.resolve(root ? [root] : []);
    }
    return Promise.resolve(this.model.listChildren(element.id));
  }

  /**
   * Generate HTML representation of the tree for webview panel
   */
  generateHtml(): string {
    const root = this.model.getRoot();
    if (!root) {
      return '<div style="padding: 20px; text-align: center;">No plan generated yet.</div>';
    }

    const renderNode = (node: OrchestratorNodeData, level: number = 0): string => {
      const indent = level * 20;
      const statusIcon = statusIconFor(node.status);
      const children = this.model.listChildren(node.id);
      
      let html = `
        <div style="margin-left: ${indent}px; padding: 8px; border-left: 2px solid var(--vscode-panel-border); margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${statusIcon}</span>
            <strong>${escapeHtml(node.title)}</strong>
          </div>
          ${node.detail ? `<div style="margin-left: 24px; opacity: 0.8; font-size: 11px;">${escapeHtml(node.detail)}</div>` : ''}
          ${node.error ? `<div style="margin-left: 24px; color: var(--vscode-errorForeground); font-size: 11px;">Error: ${escapeHtml(node.error)}</div>` : ''}
          ${node.referencedFiles?.length ? `<div style="margin-left: 24px; opacity: 0.7; font-size: 10px;">Files: ${node.referencedFiles.map(f => escapeHtml(f)).join(', ')}</div>` : ''}
        </div>
      `;
      
      if (children.length > 0) {
        html += children.map(child => renderNode(child, level + 1)).join('');
      }
      
      return html;
    };

    return renderNode(root);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusIconFor(status: OrchestratorNodeStatus): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'running':
      return '🏃';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'skipped':
      return '⏭️';
    default:
      return '';
  }
}

/**
 * Orchestrator Panel - displays task tree in a webview panel
 */
export class OrchestratorPanel {
  private static currentPanel: OrchestratorPanel | undefined;
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private provider: OrchestratorTreeDataProvider,
    private context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.updateWebview();
    
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    
    // Listen for tree changes and update webview
    this.disposables.push(
      this.provider.onDidChangeTreeData(() => {
        this.updateWebview();
      })
    );
  }

  public static createOrShow(
    context: vscode.ExtensionContext,
    provider: OrchestratorTreeDataProvider
  ): OrchestratorPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (OrchestratorPanel.currentPanel) {
      OrchestratorPanel.currentPanel.panel.reveal(column);
      return OrchestratorPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'vibe.orchestrator',
      'Vibe Orchestrator',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri]
      }
    );

    OrchestratorPanel.currentPanel = new OrchestratorPanel(panel, provider, context);
    return OrchestratorPanel.currentPanel;
  }

  private updateWebview() {
    this.panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    const treeHtml = this.provider.generateHtml();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibe Orchestrator</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-size: 13px;
    }
    h2 {
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--vscode-foreground);
    }
    .tree-container {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
    }
  </style>
</head>
<body>
  <h2>Orchestrator Task Tree</h2>
  <div class="tree-container">
    ${treeHtml}
  </div>
</body>
</html>`;
  }

  public dispose() {
    OrchestratorPanel.currentPanel = undefined;
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.panel.dispose();
  }
}

/**
 * Orchestrator coordinates planning + execution + retries.
 */
export class Orchestrator {
  private model = new OrchestratorModel();
  private provider = new OrchestratorTreeDataProvider(this.model);
  private llm: LLMService;
  private memory: MemoryBank;
  private disposables: vscode.Disposable[] = [];
  private planAbortController: AbortController | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, llm: LLMService, memory: MemoryBank) {
    this.context = context;
    this.llm = llm;
    this.memory = memory;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }

  /**
   * Open the orchestrator panel
   */
  public openPanel(): void {
    OrchestratorPanel.createOrShow(this.context, this.provider);
  }

  /**
   * Generate plan nodes from user prompt.
   * Attempts model JSON output; fallback heuristic if parsing fails.
   */
  async planFromPrompt(userPrompt: string, mode: string, personaLabel: string, personaDesc: string): Promise<void> {
    this.model.clear();
    const root = this.model.createRoot('Task Plan', truncate(userPrompt, 90));
    this.provider.refresh();

    const cfg = vscode.workspace.getConfiguration('vibe');
    const model = cfg.get<string>('model', FREE_MODELS[0]);
    const autoApprove = false;
    const maxContextFiles = cfg.get<number>('maxContextFiles', 30);

    const memorySegment = buildMemoryPromptSegment(this.memory, userPrompt);

    const systemPrompt = buildSystemPrompt({
      baseMode: mode,
      personaLabel,
      personaDescription: personaDesc,
      customModePrompt: undefined,
      autoApprove,
      maxContextFiles,
    });

    const planningInstruction =
      'Break the user task into 3-7 atomic, sequential subtasks. ' +
      'Respond ONLY in minified JSON with shape: {"subtasks":[{"title":"...","detail":"..."}]}. ' +
      'Do NOT include code fences or commentary. Titles must be concise verbs.';

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + '\n\n' + memorySegment },
      { role: 'user', content: 'USER_PROMPT:\n' + userPrompt + '\n\n' + planningInstruction },
    ];

    let apiKey: string;
    try {
      apiKey = getOpenRouterApiKey();
    } catch {
      vscode.window.showErrorMessage(
        'Vibe Orchestrator: API key missing (set vibe.openRouter.apiKey or OPENROUTER_API_KEY).'
      );
      return;
    }
    // Strict Enforcement: Block any non-free model attempts
    if (!model || !FREE_MODELS.includes(model as any)) {
      const allowedModels = FREE_MODELS.join(', ');
      vscode.window.showErrorMessage(
        `Vibe Orchestrator: Only free tier models allowed. Current free models: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini. Requested model "${model}" is not allowed.`
      );
      return;
    }
    const { emitter, done } = this.llm.streamChatCompletion({
      apiKey,
      model,
      messages,
      temperature: 0.1,
    });

    let planText = '';
    this.planAbortController = new AbortController();

    emitter.on((chunk) => {
      if (chunk.delta) {
        planText += chunk.delta;
      }
    });

    try {
      await done;
    } catch (err: any) {
      vscode.window.showErrorMessage(
        'Vibe Orchestrator: planning failed — ' + (err.message || String(err))
      );
    }

    const json = tryParseJson(planText);
    if (json && Array.isArray(json.subtasks)) {
      for (const st of json.subtasks.slice(0, 12)) {
        this.model.addChild(root.id, st.title || 'Untitled Subtask', st.detail || '');
      }
    } else {
      // Fallback heuristic: split sentences
      const guessed = userPrompt
        .split(/[.;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8)
        .slice(0, 6);
      for (const g of guessed) {
        this.model.addChild(root.id, verbFirst(g), g);
      }
    }
    this.provider.refresh();

    // Inject top workspace memory entries (snapshot) as completed informational nodes.
    try {
      const memEntries = this.memory.list('workspace').slice(0, 5);
      for (const me of memEntries) {
        const memNode = this.model.addChild(
          root.id,
          'Memory: ' + truncate(me.text.replace(/\s+/g, ' ').trim(), 50),
          'Snapshot memory entry (informational)',
          0 // no retry attempts for memory nodes
        );
        this.model.updateStatus(memNode.id, 'completed');
      }
      this.provider.refresh();
    } catch (e:any) {
      // Non-fatal; memory may be disabled.
    }
  }

  /**
   * Sequential execution with retry; placeholder internal logic verifying referenced files.
   * Actual edit/test loops can be layered later.
   */
  async executeAll(options: ExecutionOptions = {}): Promise<void> {
    const root = this.model.getRoot();
    if (!root) {
      vscode.window.showWarningMessage('Vibe Orchestrator: no plan to execute.');
      return;
    }
    const tasks = this.model.listChildren(root.id);
    const cfg = vscode.workspace.getConfiguration('vibe');
    const model = cfg.get<string>('model', FREE_MODELS[0]);
    let apiKey: string;
    try {
      apiKey = getOpenRouterApiKey();
    } catch {
      vscode.window.showErrorMessage(
        'Vibe Orchestrator: API key missing, cannot execute plan.'
      );
      return;
    }
    // Strict Enforcement: Block any non-free model attempts
    if (!model || !FREE_MODELS.includes(model as any)) {
      const allowedModels = FREE_MODELS.join(', ');
      vscode.window.showErrorMessage(
        `Vibe Orchestrator: Only free tier models allowed. Current free models: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini. Requested model "${model}" is not allowed.`
      );
      return;
    }
    const maxContextFiles = cfg.get<number>('maxContextFiles', 30);
    const personaLabel = 'Orchestrator';
    const personaDescription = 'Coordinates multi-step workflows with retries.';
    const systemPrompt = buildSystemPrompt({
      baseMode: 'orchestrator',
      personaLabel,
      personaDescription,
      maxContextFiles,
      autoApprove: false,
    });

    for (const task of tasks) {
      if (options.abortSignal?.aborted) {
        this.model.updateStatus(task.id, 'skipped');
        continue;
      }
      if (task.status === 'completed') continue;

      this.model.updateStatus(task.id, 'running');
      this.provider.refresh();

      let success = false;
      while (!success && task.attemptCount < task.maxAttempts) {
        this.model.incrementAttempt(task.id);
        const attemptPrefix = `(Attempt ${task.attemptCount}/${task.maxAttempts})`;

        // Build prompt referencing memory & attempt context.
        const memorySegment = buildMemoryPromptSegment(this.memory, task.title + ' ' + (task.detail ?? ''));
        const promptBody =
          attemptPrefix +
          '\nSubtask Title: ' +
          task.title +
          '\nDetail: ' +
          (task.detail || '(none)') +
          '\n\nProvide a concise plan with steps and any files to inspect. Return JSON:\n' +
          '{"plan":["step1","step2",...],"files":["relative/path",...],"notes":"short"}';

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt + '\n\n' + memorySegment },
          { role: 'user', content: promptBody },
        ];

        let raw = '';
        const { emitter, done } = this.llm.streamChatCompletion({
          apiKey,
          model: model!,
          messages,
          temperature: 0.2,
        });
        emitter.on((c) => {
          raw += c.delta;
        });

        try {
          await done;
        } catch (err: any) {
          this.model.updateStatus(task.id, 'failed', err.message || String(err));
          break;
        }

        const parsed = tryParseJson(raw);
        if (!parsed) {
          if (task.attemptCount >= task.maxAttempts) {
            this.model.updateStatus(task.id, 'failed', 'Non-JSON response');
          }
          continue;
        }

        // Hallucination file grounding verification.
        const referencedFiles: string[] = Array.isArray(parsed.files)
          ? parsed.files.filter((f: any) => typeof f === 'string')
          : [];
        const existingFiles: string[] = [];
        for (const rel of referencedFiles.slice(0, maxContextFiles)) {
          try {
            const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0].uri || vscode.Uri.file('.'), rel);
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type !== vscode.FileType.Directory) {
              existingFiles.push(rel);
            }
          } catch {
            // file does not exist; mark as hallucinated
          }
        }

        const hallucinated = referencedFiles.filter((f) => !existingFiles.includes(f));
        if (hallucinated.length > 0) {
          // Provide warning but do not fail automatically; require another attempt if first time.
          if (task.attemptCount < task.maxAttempts) {
            continue;
          } else {
            this.model.updateStatus(
              task.id,
              'failed',
              `Files not found: ${hallucinated.join(', ')}`
            );
            break;
          }
        }

        task.referencedFiles = existingFiles;
        this.model.updateStatus(task.id, 'completed');
        success = true;
      }

      if (!success && task.status !== 'failed') {
        this.model.updateStatus(task.id, 'failed', 'Max attempts exceeded');
      }
      this.provider.refresh();
    }
  }

  public getTreeProvider(): OrchestratorTreeDataProvider {
    return this.provider;
  }

  public getModel(): OrchestratorModel {
    return this.model;
  }

  /**
   * Get current plan as array of task descriptions for display
   */
  public getCurrentPlan(): Array<{ description: string; status: string }> {
    const root = this.model.getRoot();
    if (!root) return [];
    
    const tasks = this.model.listChildren(root.id);
    return tasks.map(task => ({
      description: task.title + (task.detail ? ` - ${task.detail}` : ''),
      status: task.status
    }));
  }
}

/**
 * Utility to truncate string.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * Parse JSON safely.
 */
function tryParseJson(raw: string): any | undefined {
  const cleaned = raw
    .trim()
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/[\u0000-\u001F]+/g, ''); // remove control chars
  try {
    return JSON.parse(extractJsonCandidate(cleaned));
  } catch {
    return undefined;
  }
}

/**
 * Extract first balanced JSON object substring heuristically.
 */
function extractJsonCandidate(text: string): string {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return text;
  let depth = 0;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }
  return text;
}

/**
 * Convert sentence into verb-first subtask title (heuristic).
 */
function verbFirst(sentence: string): string {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Untitled';
  // If first word not verb-like, prepend "Review"
  const first = words[0].toLowerCase();
  const verbish = /^(add|fix|create|implement|refactor|update|remove|test|investigate|review|analyze)$/;
  if (!verbish.test(first)) {
    return 'Review ' + truncate(sentence, 40);
  }
  return truncate(sentence, 40);
}

/**
 * Approximate cost summary for a node (side utility).
 */
export function summarizeNodeCost(node: OrchestratorNodeData): string {
  const chars = (node.detail || '').length;
  const tokens = approximateTokens(node.detail || '');
  return `${chars} chars (~${tokens} tokens)`;
}