// Vibe Code v5.0 - Fully Autonomous AI Coding Environment
import * as vscode from 'vscode';
import { AIProvider, AIProviderConfig } from './providers/AIProvider';
import { FileSystemEngine } from './services/FileSystem';
import { ShellEngine } from './services/ShellEngine';
import { ProjectGenerator } from './services/ProjectGenerator';
import { RuntimeSandbox } from './services/RuntimeSandbox';
import { AgentMode } from './services/AgentMode';
import { PermissionManager } from './services/PermissionManager';

let aiProvider: AIProvider;
let fsEngine: FileSystemEngine;
let shellEngine: ShellEngine;
let projectGenerator: ProjectGenerator;
let sandbox: RuntimeSandbox;
let agentMode: AgentMode;
let permissionManager: PermissionManager;
let chatPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Vibe Code v5.0 activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  
  // Initialize all services
  initializeServices(workspaceRoot);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe.openChat', () => openChatPanel(context)),
    vscode.commands.registerCommand('vibe.openAgent', () => openAgentPanel(context)),
    vscode.commands.registerCommand('vibe.createFile', () => createFileCommand()),
    vscode.commands.registerCommand('vibe.createFolder', () => createFolderCommand()),
    vscode.commands.registerCommand('vibe.runShellCommand', () => runShellCommand()),
    vscode.commands.registerCommand('vibe.generateProject', () => generateProject()),
    vscode.commands.registerCommand('vibe.executeSandbox', () => executeSandbox()),
    vscode.commands.registerCommand('vibe.startAgent', () => startAgent())
  );

  vscode.window.showInformationMessage('Vibe Code v5.0: Autonomous AI Coding Environment Ready!');
}

function initializeServices(workspaceRoot: string) {
  const config = vscode.workspace.getConfiguration('vibe');
  
  // Initialize AI Provider with fallback chain
  const providers: AIProviderConfig[] = [
    {
      name: 'MegaLLM',
      baseURL: 'https://ai.megallm.io/v1',
      apiKey: config.get('megallmApiKey') || 'sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820',
      models: ['qwen/qwen3-next-80b-a3b-instruct']
    },
    {
      name: 'AgentRouter',
      baseURL: 'https://agentrouter.org/v1',
      apiKey: config.get('agentrouterApiKey') || '',
      models: ['anthropic/claude-3.5-sonnet']
    },
    {
      name: 'Routeway',
      baseURL: 'https://api.routeway.ai/v1',
      apiKey: config.get('routewayApiKey') || '',
      models: ['qwen/qwen3-next-80b-a3b-instruct']
    },
    {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('openrouterApiKey') || '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',
      models: [
        'x-ai/grok-4.1-fast:free',
        'z-ai/glm-4.5-air:free',
        'qwen/qwen3-coder:free',
        'google/gemini-2.0-flash-exp:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'openai/gpt-oss-20b:free'
      ]
    }
  ];

  aiProvider = new AIProvider(providers);
  fsEngine = new FileSystemEngine(workspaceRoot);
  shellEngine = new ShellEngine(workspaceRoot);
  projectGenerator = new ProjectGenerator(fsEngine);
  sandbox = new RuntimeSandbox();
  permissionManager = new PermissionManager(config.get('autoApproveUnsafeOps') || false);
  agentMode = new AgentMode(aiProvider, fsEngine, shellEngine, sandbox);
}

function openChatPanel(context: vscode.ExtensionContext) {
  if (chatPanel) {
    chatPanel.reveal();
    return;
  }

  chatPanel = vscode.window.createWebviewPanel(
    'vibeChat',
    'Vibe Chat',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  chatPanel.webview.html = getChatHTML();

  chatPanel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'sendMessage':
        await handleChatMessage(message.text, chatPanel!);
        break;
      case 'createFile':
        await handleCreateFile(message.path, message.content);
        break;
      case 'runCommand':
        await handleRunCommand(message.command);
        break;
      case 'executeCode':
        await handleExecuteCode(message.code, message.language);
        break;
    }
  });

  chatPanel.onDidDispose(() => {
    chatPanel = undefined;
  });
}

async function handleChatMessage(text: string, panel: vscode.WebviewPanel) {
  panel.webview.postMessage({ type: 'userMessage', content: text });

  try {
    const messages = [
      { role: 'system' as const, content: 'You are Vibe, an autonomous AI coding assistant. You can create files, run commands, and execute code.' },
      { role: 'user' as const, content: text }
    ];

    let fullResponse = '';
    for await (const chunk of aiProvider.chatStream(messages)) {
      fullResponse += chunk;
      panel.webview.postMessage({ type: 'streamChunk', content: chunk });
    }

    panel.webview.postMessage({ type: 'streamEnd' });
  } catch (error) {
    panel.webview.postMessage({ type: 'error', content: String(error) });
  }
}

async function handleCreateFile(filePath: string, content: string) {
  const allowed = await permissionManager.requestPermission({
    type: 'file-write',
    description: `Create file: ${filePath}`,
    details: `Content length: ${content.length} characters`
  });

  if (allowed) {
    await fsEngine.createFile(filePath, content);
    vscode.window.showInformationMessage(`File created: ${filePath}`);
  }
}

async function handleRunCommand(command: string) {
  const allowed = await permissionManager.requestPermission({
    type: 'shell-command',
    description: `Run command: ${command}`,
    details: 'This will execute in your workspace'
  });

  if (allowed) {
    shellEngine.show();
    const result = await shellEngine.execute(command, true);
    vscode.window.showInformationMessage(`Command completed with exit code: ${result.exitCode}`);
  }
}

async function handleExecuteCode(code: string, language: string) {
  const result = language === 'javascript' 
    ? await sandbox.executeJS(code)
    : await sandbox.executePython(code);

  vscode.window.showInformationMessage(`Execution time: ${result.executionTime}ms`);
  
  if (result.stdout) {
    vscode.window.showInformationMessage(`Output: ${result.stdout}`);
  }
  if (result.stderr) {
    vscode.window.showErrorMessage(`Error: ${result.stderr}`);
  }
}

async function createFileCommand() {
  const filePath = await vscode.window.showInputBox({ prompt: 'Enter file path' });
  if (!filePath) return;

  const content = await vscode.window.showInputBox({ prompt: 'Enter file content (optional)' });
  await fsEngine.createFile(filePath, content || '');
  vscode.window.showInformationMessage(`File created: ${filePath}`);
}

async function createFolderCommand() {
  const folderPath = await vscode.window.showInputBox({ prompt: 'Enter folder path' });
  if (!folderPath) return;

  await fsEngine.createFolder(folderPath);
  vscode.window.showInformationMessage(`Folder created: ${folderPath}`);
}

async function runShellCommand() {
  const command = await vscode.window.showInputBox({ prompt: 'Enter shell command' });
  if (!command) return;

  if (shellEngine.isDestructive(command)) {
    const confirm = await vscode.window.showWarningMessage(
      'This command may be destructive. Continue?',
      'Yes', 'No'
    );
    if (confirm !== 'Yes') return;
  }

  shellEngine.show();
  await shellEngine.execute(command, true);
}

async function generateProject() {
  const templates = projectGenerator.getTemplates();
  const template = await vscode.window.showQuickPick(templates, { placeHolder: 'Select project template' });
  if (!template) return;

  const projectName = await vscode.window.showInputBox({ prompt: 'Enter project name' });
  if (!projectName) return;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  await projectGenerator.generate(template, workspaceRoot, projectName);
  vscode.window.showInformationMessage(`Project ${projectName} created!`);
}

async function executeSandbox() {
  const language = await vscode.window.showQuickPick(['javascript', 'python'], { placeHolder: 'Select language' });
  if (!language) return;

  const code = await vscode.window.showInputBox({ prompt: 'Enter code to execute', multiline: true } as any);
  if (!code) return;

  const result = language === 'javascript'
    ? await sandbox.executeJS(code)
    : await sandbox.executePython(code);

  vscode.window.showInformationMessage(`Execution time: ${result.executionTime}ms\nOutput: ${result.stdout}`);
}

async function startAgent() {
  const goal = await vscode.window.showInputBox({ prompt: 'Enter agent goal' });
  if (!goal) return;

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Agent working...',
    cancellable: true
  }, async (progress, token) => {
    const task = await agentMode.execute(goal, (step) => {
      progress.report({ message: step.description });
    });

    vscode.window.showInformationMessage(`Agent completed: ${task.status}`);
  });
}

function openAgentPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'vibeAgent',
    'Vibe Agent',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = getAgentHTML();
}

function getChatHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    #messages { height: calc(100vh - 150px); overflow-y: auto; margin-bottom: 20px; }
    .message { margin: 10px 0; padding: 10px; border-radius: 8px; }
    .user { background: #264f78; }
    .assistant { background: #2d2d2d; }
    #input { width: calc(100% - 100px); padding: 10px; background: #3c3c3c; border: 1px solid #555; color: #d4d4d4; border-radius: 4px; }
    #send { padding: 10px 20px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; }
    #send:hover { background: #1177bb; }
    .actions { margin-top: 10px; }
    .action-btn { padding: 5px 10px; margin: 5px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div>
    <input type="text" id="input" placeholder="Ask Vibe anything..." />
    <button id="send">Send</button>
  </div>
  <div class="actions">
    <button class="action-btn" onclick="createFile()">Create File</button>
    <button class="action-btn" onclick="runCommand()">Run Command</button>
    <button class="action-btn" onclick="executeCode()">Execute Code</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');

    send.onclick = () => {
      const text = input.value.trim();
      if (!text) return;
      vscode.postMessage({ command: 'sendMessage', text });
      input.value = '';
    };

    input.onkeypress = (e) => {
      if (e.key === 'Enter') send.click();
    };

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'userMessage') {
        messages.innerHTML += \`<div class="message user">\${msg.content}</div>\`;
      } else if (msg.type === 'streamChunk') {
        let last = messages.lastElementChild;
        if (!last || !last.classList.contains('assistant')) {
          last = document.createElement('div');
          last.className = 'message assistant';
          messages.appendChild(last);
        }
        last.textContent += msg.content;
        messages.scrollTop = messages.scrollHeight;
      }
    });

    function createFile() {
      const path = prompt('File path:');
      const content = prompt('Content:');
      if (path) vscode.postMessage({ command: 'createFile', path, content });
    }

    function runCommand() {
      const command = prompt('Command:');
      if (command) vscode.postMessage({ command: 'runCommand', command });
    }

    function executeCode() {
      const language = prompt('Language (javascript/python):');
      const code = prompt('Code:');
      if (language && code) vscode.postMessage({ command: 'executeCode', code, language });
    }
  </script>
</body>
</html>`;
}

function getAgentHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    .step { margin: 10px 0; padding: 15px; background: #2d2d2d; border-radius: 8px; border-left: 4px solid #0e639c; }
    .step.running { border-left-color: #ffa500; }
    .step.completed { border-left-color: #4ec9b0; }
    .step.failed { border-left-color: #f48771; }
    h2 { color: #4ec9b0; }
  </style>
</head>
<body>
  <h2>Agent Mode</h2>
  <div id="steps"></div>
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'agentStep') {
        const steps = document.getElementById('steps');
        steps.innerHTML += \`<div class="step \${msg.status}">\${msg.description}</div>\`;
      }
    });
  </script>
</body>
</html>`;
}

export function deactivate() {}
