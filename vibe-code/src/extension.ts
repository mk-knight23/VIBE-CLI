import * as vscode from 'vscode';
import { join } from 'path';
import { ChatViewProvider } from './chatProvider';
import { QuickChatViewProvider } from './quickChatProvider';
import { LLMService, FREE_MODELS, buildSystemPrompt, ChatMessage, getOpenRouterApiKey } from './llmService';
import { MemoryBank } from './memory';
import { Orchestrator } from './orchestrator';
import { API as GitAPI, GitExtension } from './git.d';

/**
 * Activation wires:
 *  - LLMService (streaming + token usage)
 *  - MemoryBank (persistent memory)
 *  - Orchestrator (task tree + retries)
 *  - ChatViewProvider (webview sidebar)
 *
 * Also registers commands for:
 *  - Mode switching
 *  - Diff apply / rollback
 *  - Regeneration
 *  - Architect quick switch
 *  - Memory injection
 *  - Orchestrator planning/execution
 */

let chatProvider: ChatViewProvider | undefined;
let quickChatProvider: QuickChatViewProvider | undefined;
let llmService: LLMService | undefined;
let memoryBank: MemoryBank | undefined;
let orchestrator: Orchestrator | undefined;
let outputChannel: vscode.OutputChannel;

/**
 * Quick mode cycle order.
 */
const MODE_SEQUENCE = [
  'code',
  'architect',
  'ask',
  'debug',
  'orchestrator',
];

/**
 * Provide status bar token usage indicator.
 */
let tokenStatusItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  // 1. Create the central OutputChannel for debugging
  outputChannel = vscode.window.createOutputChannel('Vibe');
  log('Vibe AI extension activating...');

  try {
    // 2. Instantiate all core services (singletons)
    memoryBank = new MemoryBank(context);
    llmService = new LLMService(context, outputChannel);
    orchestrator = new Orchestrator(context, llmService, memoryBank);

    // 3. Register Chat WebviewView Provider
    chatProvider = new ChatViewProvider(context, llmService, memoryBank, orchestrator, outputChannel);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        ChatViewProvider.VIEW_ID,
        chatProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    );

    // 3b. Register Quick Chat (lightweight) WebviewView Provider
    quickChatProvider = new QuickChatViewProvider(context, llmService, memoryBank, outputChannel);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        QuickChatViewProvider.VIEW_ID,
        quickChatProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    );

    // 4. Register Orchestrator TreeView
    const orchestratorProvider = orchestrator.getTreeProvider();
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
        'vibe.orchestratorView',
        orchestratorProvider
      )
    );

    // Register command to focus on chat view
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.focusChat', () => {
        vscode.commands.executeCommand('vibe.chatView.focus');
      })
    );

    // Register Configuration Change Listener
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(event => {
        // Corrected model config key from 'vibe.openRouter.model' -> 'vibe.model'
        if (
          event.affectsConfiguration('vibe.openRouter.apiKey') ||
          event.affectsConfiguration('vibe.model')
        ) {
          log('Configuration changed (API key / model), reconfiguring LLM service...');
          // TODO: reinitialize or update llmService params if needed
        }
        if (
          event.affectsConfiguration('vibe.customModes') ||
          event.affectsConfiguration('vibe.modes')
        ) {
          log('Modes configuration changed.');
          chatProvider?.updateModes();
        }
      })
    );

  tokenStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  // Status bar session token usage with GLM-4.5-Air optimization.
  tokenStatusItem.text = 'Vibe Tokens: 0';
  tokenStatusItem.tooltip = 'GLM-4.5-Air usage tracking (free tier). Parse x-openrouter-usage-estimated-tokens header.';
  tokenStatusItem.show();
  context.subscriptions.push(tokenStatusItem);

  // Watch configuration changes to refresh memory limits/custom modes.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vibe.memory') || e.affectsConfiguration('vibe.customModes')) {
        memoryBank?.refreshConfig();
        // Soft refresh: push assistant notice
        chatProvider?.pushAssistant('Configuration updated (memory / custom modes).');
      }
    })
  );

  /**
   * Commands
   */
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe.switchNextMode', () => {
      cycleMode(1);
    }),


    vscode.commands.registerCommand('vibe.devDump', async () => {
      const oc = vscode.window.createOutputChannel('Vibe-Diagnostics');
      oc.show(true);
      oc.appendLine('--- Vibe Diagnostics Dump ---');
      oc.appendLine('Version: 0.1.2');
      oc.appendLine('Workspace folders: ' + (vscode.workspace.workspaceFolders?.map(f=>f.name).join(', ') || 'none'));
      oc.appendLine('Active Mode Context Key: ' + getContextMode());
      oc.appendLine('Has chatProvider: ' + !!chatProvider);
      oc.appendLine('Has orchestrator: ' + !!orchestrator);
      oc.appendLine('Token usage: ' + (llmService?.getSessionTokenUsage() ?? 0));
      try {
        const chat = (chatProvider as any)?.chat as {role:string;content:string}[]|undefined;
        oc.appendLine('Chat messages count: ' + (chat?.length ?? 0));
      } catch (e:any) {
        oc.appendLine('Chat access error: ' + e.message);
      }
      vscode.window.showInformationMessage('Vibe: Diagnostics dumped to Vibe-Diagnostics output channel.');
    }),

    vscode.commands.registerCommand('vibe.switchPrevMode', () => {
      cycleMode(-1);
    }),

    vscode.commands.registerCommand('vibe.regenResponse', async () => {
      chatProvider?.pushAssistant('Regenerating last response…');
      // ChatViewProvider has internal regenerate command via webview; send message
      sendWebviewMessage({ type: 'regenRequestFromCommand' });
    }),

    vscode.commands.registerCommand('vibe.switchToArchitect', () => {
      sendWebviewMessage({ type: 'setMode', mode: 'architect' });
      vscode.window.showInformationMessage('Vibe: Switched to Architect mode.');
    }),

    vscode.commands.registerCommand('vibe.applyDiff', async () => {
      const list = chatProvider?.listDiffSuggestions() || [];
      const unapplied = list.filter((d) => !d.applied);
      if (unapplied.length === 0) {
        vscode.window.showInformationMessage('Vibe: No unapplied diff suggestions.');
        return;
      }
      if (unapplied.length === 1) {
        sendWebviewMessage({ type: 'applyDiff', id: unapplied[0].id });
        return;
      }
      const pick = await vscode.window.showQuickPick(
        unapplied.map((d) => ({
          label: d.filePath,
          description: d.id,
        })),
        { placeHolder: 'Select diff suggestion to apply' }
      );
      if (!pick) return;
      const chosen = unapplied.find((d) => d.id === pick.description);
      if (chosen) {
        sendWebviewMessage({ type: 'applyDiff', id: chosen.id });
      }
    }),

    vscode.commands.registerCommand('vibe.rollbackLast', async () => {
      await chatProvider?.rollbackLast();
    }),

    vscode.commands.registerCommand('vibe.addMemory', async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Add memory text',
        placeHolder: 'E.g., Completed refactor of data layer; next step: optimize queries.',
      });
      if (!text) return;
      memoryBank?.addMemory(text, {
        tags: ['manual'],
        importance: 2,
        scope: 'workspace',
      });
      vscode.window.showInformationMessage('Vibe: Memory added.');
    }),

    vscode.commands.registerCommand('vibe.recallMemory', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Query memory bank',
        placeHolder: 'E.g., refactor plan',
      });
      if (!query) return;
      const segment = memoryBank
        ? memoryBank.buildSessionContextSummary()
        : 'Memory disabled.';
      chatProvider?.pushAssistant(
        '[Memory Recall]\n' + segment + '\nQuery: ' + query
      );
    }),

    vscode.commands.registerCommand('vibe.planOrchestrator', async () => {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Enter task to plan with Orchestrator',
        placeHolder: 'E.g., Debug failing authentication flow',
      });
      if (!prompt) return;
      await orchestrator?.planFromPrompt(
        prompt,
        'orchestrator',
        'Orchestrator',
        'Coordinates multi-step workflows'
      );
      chatProvider?.pushAssistant('Orchestrator plan generated.');
    }),

    vscode.commands.registerCommand('vibe.executePlan', async () => {
      await orchestrator?.executeAll();
      chatProvider?.pushAssistant('Orchestrator execution completed.');
    }),

    vscode.commands.registerCommand('vibe.hallucinationCheck', async () => {
      // Simple grounding: verify any file paths inside last assistant message exist.
      const lastAssistant = getLastAssistantMessage();
      if (!lastAssistant) {
        vscode.window.showInformationMessage(
          'Vibe: No assistant message found for hallucination check.'
        );
        return;
      }
      const paths = extractPotentialPaths(lastAssistant);
      const existing: string[] = [];
      const missing: string[] = [];
      for (const p of paths.slice(0, 40)) {
        try {
          const ws = vscode.workspace.workspaceFolders?.[0];
          if (!ws) break;
          const uri = vscode.Uri.joinPath(ws.uri, p);
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.type !== vscode.FileType.Directory) {
            existing.push(p);
          } else {
            missing.push(p);
          }
        } catch {
          missing.push(p);
        }
      }
      chatProvider?.pushAssistant(
        '[Grounding Report]\nExisting files:\n' +
          (existing.join('\n') || '(none)') +
          '\nMissing / suspect:\n' +
          (missing.join('\n') || '(none)') +
          '\nTotal checked: ' +
          paths.length
      );
    }),

    // New: force reload chat webview to recover from blank panel issues.
    vscode.commands.registerCommand('vibe.reloadChat', () => {
      chatProvider?.pushAssistant('Reloading chat view…');
      (chatProvider as any)?.forceReload?.();
    }),

    vscode.commands.registerCommand('vibe.testChat', async () => {
      chatProvider?.pushAssistant('Vibe: Test chat – sending "Hello".');
      await chatProvider?.debugSend('Hello from Vibe test.');
    }),

    vscode.commands.registerCommand('vibe.testOrchestrate', async () => {
      const prompt =
        'Debug this function: authenticateUser(token) throwing "Invalid signature" intermittently. Identify root cause and propose fix.';
      await orchestrator?.planFromPrompt(
        prompt,
        'debug',
        'Debug Orchestrator',
        'Coordinates debugging workflows'
      );
      await orchestrator?.executeAll();
      chatProvider?.pushAssistant('Vibe: Test orchestrator run completed.');
    }),
    vscode.commands.registerCommand('vibe.showApiKeyDebug', async () => {
      try {
        const cfg = vscode.workspace.getConfiguration('vibe');
        const envKey = (process.env.OPENROUTER_API_KEY || '').trim();
        const configKey = (cfg.get<string>('openRouter.apiKey', '') || '').trim();
        const resolved = envKey || configKey;
        if (resolved) {
          chatProvider?.pushAssistant(
            '[API Key Debug]\nSource: ' +
              (envKey ? 'Environment' : 'Settings') +
              '\nLength: ' +
              resolved.length +
              '\nFirst 4 chars: ' +
              resolved.slice(0, 4) +
              '\nStatus: OK'
          );
          vscode.window.showInformationMessage('Vibe: API key detected (' + (envKey ? 'env' : 'settings') + ').');
        } else {
          chatProvider?.pushAssistant(
            '[API Key Debug]\nNo key resolved.\nSet via Settings: vibe.openRouter.apiKey or export OPENROUTER_API_KEY.'
          );
          vscode.window.showWarningMessage('Vibe: No API key found.');
        }
      } catch (e: any) {
        chatProvider?.pushAssistant('[API Key Debug] Error: ' + (e.message || String(e)));
        vscode.window.showErrorMessage('Vibe: API key debug failed.');
      }
    })
  );

    // Initialize Git Hook
    initializeGitHook(context, chatProvider).catch(err => logError(`Failed to initialize Git hook: ${err}`));

    log('Vibe extension activated successfully');
  } catch (error) {
    logError(`Error during activation: ${error}`);
    vscode.window.showErrorMessage('Vibe AI failed to activate. See Output panel for details.');
  }

  // Set initial mode context key for keybindings
  void vscode.commands.executeCommand('setContext', 'vibe.activeMode', 'code');

  // Periodic token usage refresh with free tier limit display
  const interval = setInterval(() => {
    if (tokenStatusItem && llmService) {
      const usage = llmService.getSessionTokenUsage();
      tokenStatusItem.text = `Vibe Tokens: ${usage}`;
      tokenStatusItem.tooltip = `GLM-4.5-Air usage: ${usage} tokens (free tier limit: 128K context)`;
    }
  }, 4000);
  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

async function initializeGitHook(context: vscode.ExtensionContext, chatProvider: ChatViewProvider) {
  log('Attempting to initialize Git integration...');
  try {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!gitExtension) {
      logWarn('Git extension (vscode.git) not found.');
      return;
    }
    
    await gitExtension.activate();
    const gitApi = gitExtension.exports.getAPI(1);

    if (gitApi.repositories.length > 0) {
      const repo = gitApi.repositories[0];
      log('Git repository found. Attaching state.onDidChange listener.');
      
      context.subscriptions.push(
        repo.state.onDidChange(() => {
          log('Git state changed.');
          chatProvider.pushAssistant('Git repository state changed. Would you like me to review the changes?');
        })
      );
    } else {
      logWarn('No Git repositories found in workspace.');
    }
  } catch (err) {
    logError(`Error activating Git API: ${err}`);
  }
}

// Centralized logging functions
export function log(message: string) {
  outputChannel?.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`);
  console.log(message);
}

export function logWarn(message: string) {
  outputChannel?.appendLine(`[WARN] ${new Date().toISOString()}: ${message}`);
  console.warn(message);
}

export function logError(message: string, error?: any) {
  const errorMessage = error ? `${message}: ${error instanceof Error ? error.message : String(error)}` : message;
  outputChannel?.appendLine(`[ERROR] ${new Date().toISOString()}: ${errorMessage}`);
  if (error instanceof Error) {
    outputChannel?.appendLine(error.stack || '');
  }
  console.error(message, error);
}

export function deactivate() {
  log('Vibe AI extension deactivating...');
  chatProvider?.dispose();
  quickChatProvider?.dispose();
  orchestrator?.dispose();
  tokenStatusItem?.dispose();
  outputChannel?.dispose();
}

/**
 * Cycle mode in MODE_SEQUENCE order by delta (+1 / -1).
 */
function cycleMode(delta: number) {
  const cfg = vscode.workspace.getConfiguration('vibe');
  // Mode is managed inside webview; we only signal change.
  const active = getContextMode();
  const idx = MODE_SEQUENCE.indexOf(active);
  const nextIdx =
    idx === -1
      ? 0
      : (idx + delta + MODE_SEQUENCE.length) % MODE_SEQUENCE.length;
  const nextMode = MODE_SEQUENCE[nextIdx];
  sendWebviewMessage({ type: 'setMode', mode: nextMode });
  void vscode.commands.executeCommand('setContext', 'vibe.activeMode', nextMode);
  vscode.window.setStatusBarMessage(`Vibe Mode: ${nextMode}`, 2500);
  void cfg.update('lastMode', nextMode, vscode.ConfigurationTarget.Workspace);
}

/**
 * Retrieve last active mode from context (fallback 'code').
 */
function getContextMode(): string {
  return vscode.workspace
    .getConfiguration('vibe')
    .get<string>('lastMode', 'code');
}

/**
 * Send message to chat webview.
 */
function sendWebviewMessage(msg: unknown) {
  // Post message to the chat provider if it exists
  if (chatProvider) {
    (chatProvider as any).postMessage?.(msg);
  }
}

/**
 * Extract potential relative file paths from assistant message heuristically.
 */
function extractPotentialPaths(text: string): string[] {
  const regex = /(?:^|\s)([A-Za-z0-9._/-]+\.(?:ts|js|tsx|json|md|py|go|java|c|cpp|cs|rs|sh|yml|yaml))\b/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    out.push(m[1]);
  }
  return Array.from(new Set(out));
}

/**
 * Get last assistant message from chat provider.
 */
function getLastAssistantMessage(): string | undefined {
  const list = chatProvider?.listDiffSuggestions(); // not helpful; need chat history
  // Using internal property (not exported) via reflective access — stable while extension code controls structure.
  const chat = (chatProvider as any)?.chat as
    | { role: string; content: string }[]
    | undefined;
  if (!chat) return;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (chat[i].role === 'assistant') {
      return chat[i].content;
    }
  }
  return;
}

/**
 * Optional utility to request a one-off planning response outside orchestrator (not used yet).
 */
async function quickPlan(prompt: string): Promise<string> {
  if (!llmService) return 'LLM not ready.';
  const cfg = vscode.workspace.getConfiguration('vibe');
  let apiKey: string;
  try {
    apiKey = getOpenRouterApiKey();
  } catch {
    return 'OpenRouter API key missing. Set vibe.openRouter.apiKey in settings or export OPENROUTER_API_KEY.';
  }
  const model = cfg.get<string>('model', FREE_MODELS[0])!;
  const systemPrompt = buildSystemPrompt({
    baseMode: 'architect',
    personaLabel: 'Architect',
    personaDescription: 'High-level planning and trade-offs.',
    autoApprove: false,
    maxContextFiles: cfg.get<number>('maxContextFiles', 30),
  });
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Plan briefly:\n' + prompt },
  ];
  const { emitter, done } = llmService.streamChatCompletion({
    apiKey,
    model,
    messages,
    temperature: 0.2,
  });
  let acc = '';
  emitter.on((c) => {
    acc += c.delta;
  });
  try {
    await done;
  } catch {
    // ignore
  }
  return acc;
}