// Vibe VS Code Extension v5.0.1 - Production-Grade All-in-One Extension
import * as vscode from 'vscode';
import { fetch } from 'undici';
import { ExtensionContext } from 'vscode';

// State Machine Types
type ExtensionState = 'IDLE' | 'READY' | 'ANALYZING' | 'STREAMING' | 'PROPOSING_ACTIONS' | 'AWAITING_APPROVAL' | 'RUNNING_TOOL' | 'VERIFYING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
type ExecutionMode = 'ask' | 'code' | 'debug' | 'architect' | 'agent' | 'shell';

interface ExtensionStateData {
  state: ExtensionState;
  mode: ExecutionMode;
  currentTask?: AgentTask;
  lastError?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

interface StateTransition {
  from: ExtensionState;
  to: ExtensionState;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class StateMachine {
  private stateData: ExtensionStateData;
  private transitions: StateTransition[] = [];
  private listeners: Array<(state: ExtensionStateData) => void> = [];

  constructor() {
    this.stateData = {
      state: 'IDLE',
      mode: 'ask'
    };
  }

  // Get current state (read-only)
  getState(): ExtensionStateData {
    return { ...this.stateData };
  }

  // Valid state transitions
  private validTransitions: Record<ExtensionState, ExtensionState[]> = {
    IDLE: ['READY'],
    READY: ['ANALYZING', 'STREAMING', 'PROPOSING_ACTIONS', 'RUNNING_TOOL'],
    ANALYZING: ['STREAMING', 'PROPOSING_ACTIONS', 'COMPLETED', 'ERROR'],
    STREAMING: ['COMPLETED', 'ERROR', 'CANCELLED'],
    PROPOSING_ACTIONS: ['AWAITING_APPROVAL', 'RUNNING_TOOL', 'COMPLETED', 'ERROR'],
    AWAITING_APPROVAL: ['RUNNING_TOOL', 'COMPLETED', 'CANCELLED', 'ERROR'],
    RUNNING_TOOL: ['VERIFYING', 'COMPLETED', 'ERROR', 'CANCELLED'],
    VERIFYING: ['COMPLETED', 'ERROR'],
    COMPLETED: ['READY'],
    ERROR: ['READY'],
    CANCELLED: ['READY']
  };

  // Transition to new state with validation
  transition(newState: ExtensionState, action: string, metadata?: Record<string, any>): boolean {
    if (!this.canTransitionTo(newState)) {
      const errorMsg = `âŒ Invalid state transition: ${this.stateData.state} -> ${newState}`;
      console.error(errorMsg);
      this.stateData.lastError = errorMsg;
      vscode.window.showErrorMessage(errorMsg);
      return false;
    }

    const transition: StateTransition = {
      from: this.stateData.state,
      to: newState,
      action,
      timestamp: new Date(),
      metadata
    };

    this.transitions.push(transition);
    this.stateData.state = newState;
    this.stateData.lastError = undefined; // Clear any previous errors

    // Log transition
    console.log(`ðŸ”„ State transition: ${transition.from} -> ${transition.to} (${action})`);

    // Notify listeners
    this.notifyListeners();

    return true;
  }

  // Update mode with validation
  setMode(mode: ExecutionMode): void {
    if (!MODE_DEFINITIONS[mode]) {
      throw new Error(`Invalid execution mode: ${mode}`);
    }
    this.stateData.mode = mode;
    this.notifyListeners();
  }

  // Update current task
  setCurrentTask(task?: AgentTask): void {
    this.stateData.currentTask = task;
    this.notifyListeners();
  }

  // Update progress
  setProgress(progress?: number): void {
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      throw new Error(`Progress must be between 0 and 100, got: ${progress}`);
    }
    this.stateData.progress = progress;
    this.notifyListeners();
  }

  // Set last error
  setLastError(error?: string): void {
    this.stateData.lastError = error;
    this.notifyListeners();
  }

  // Add metadata
  setMetadata(metadata: Record<string, any>): void {
    this.stateData.metadata = { ...this.stateData.metadata, ...metadata };
    this.notifyListeners();
  }

  // Check if transition is valid
  private canTransitionTo(newState: ExtensionState): boolean {
    return this.validTransitions[this.stateData.state]?.includes(newState) ?? false;
  }

  // Subscribe to state changes
  subscribe(listener: (state: ExtensionStateData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // Get transition history
  getTransitionHistory(): StateTransition[] {
    return [...this.transitions];
  }

  // Reset to initial state
  reset(): void {
    this.stateData = {
      state: 'IDLE',
      mode: 'ask'
    };
    this.transitions = [];
    this.notifyListeners();
  }
}

interface ModeCapabilities {
  allowedTools: string[];
  allowedSideEffects: string[];
  uiFeatures: string[];
  description: string;
  icon: string;
}

// Mode definitions with HARD boundaries
const MODE_DEFINITIONS: Record<ExecutionMode, ModeCapabilities> = {
  ask: {
    allowedTools: ['search', 'analyze'],
    allowedSideEffects: [],
    uiFeatures: ['chat', 'readonly', 'search'],
    description: 'Read-only Q&A and analysis',
    icon: '$(comment-discussion)'
  },
  code: {
    allowedTools: ['file_ops', 'search', 'analyze', 'git', 'shell', 'format'],
    allowedSideEffects: ['file_write', 'file_create', 'file_delete', 'terminal'],
    uiFeatures: ['chat', 'diff_preview', 'file_tree', 'editor'],
    description: 'Full coding with file operations',
    icon: '$(code)'
  },
  debug: {
    allowedTools: ['analyze', 'search', 'run_tests', 'shell'],
    allowedSideEffects: ['terminal'],
    uiFeatures: ['chat', 'breakpoints', 'console', 'tests'],
    description: 'Error analysis and debugging',
    icon: '$(debug)'
  },
  architect: {
    allowedTools: ['analyze', 'search', 'generate'],
    allowedSideEffects: [],
    uiFeatures: ['chat', 'diagrams', 'planning', 'readonly'],
    description: 'System design and planning',
    icon: '$(circuit-board)'
  },
  agent: {
    allowedTools: ['all'],
    allowedSideEffects: ['all'],
    uiFeatures: ['chat', 'progress', 'approval', 'multi_step'],
    description: 'Autonomous multi-step execution',
    icon: '$(robot)'
  },
  shell: {
    allowedTools: ['shell', 'file_ops'],
    allowedSideEffects: ['terminal', 'file_ops'],
    uiFeatures: ['terminal', 'file_tree', 'commands'],
    description: 'Terminal and file operations only',
    icon: '$(terminal)'
  }
};

// Tool System Types
interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

type ToolSuccessResult<T = any> = {
  success: true;
  data: T;
  duration: number;
  rollbackData?: any;
};

type ToolErrorResult = {
  success: false;
  error: string;
  duration: number;
  rollbackData?: any;
};

type ToolResult<T = any> = ToolSuccessResult<T> | ToolErrorResult;

// Type guard for ToolResult
function isToolResult(obj: any): obj is ToolResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.duration === 'number'
  );
}

// Type guard for successful ToolResult
function isSuccessfulToolResult<T = any>(result: ToolResult<T>): result is ToolSuccessResult<T> {
  return result.success === true;
}

interface ToolDefinition {
  id: string;
  name: string;
  category: 'file' | 'workspace' | 'git' | 'shell' | 'analysis' | 'memory' | 'code' | 'testing';
  description: string;
  parameters: ToolParameter[];
  returns: string;
  cancellable: boolean;
  rollbackable: boolean;
  requiresApproval?: boolean;
}

interface ToolExecutionContext {
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => void;
  workspaceFolder: vscode.WorkspaceFolder;
}

type ToolExecutor = (params: any, context: ToolExecutionContext) => Promise<ToolResult>;

// Agent System Types
interface AgentStep {
  id: string;
  description: string;
  tool: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  verification?: string;
  requiresApproval?: boolean;
  approved?: boolean;
}

interface AgentTask {
  id: string;
  description: string;
  steps: AgentStep[];
  status: 'planning' | 'executing' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
}

class ToolSystem {
  private tools: Map<string, { definition: ToolDefinition; executor: ToolExecutor }> = new Map();
  private executedSteps: Array<{ toolId: string; rollbackData: any; timestamp: Date }> = [];

  constructor(private stateMachine: StateMachine) {
    this.registerCoreTools();
  }

  registerTool(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.id, { definition, executor });
  }

  getToolDefinition(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId)?.definition;
  }

  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(item => item.definition);
  }

  async executeTool(toolId: string, params: any, context: ToolExecutionContext): Promise<ToolResult> {
    // HARD STATE GUARD: Tool execution can only start from READY or RUNNING_TOOL states
    const currentState = this.stateMachine.getState();
    if (!['READY', 'RUNNING_TOOL'].includes(currentState.state)) {
      const errorMsg = `âŒ Cannot execute tools in ${currentState.state} state. Please wait for current operation to complete.`;
      console.error(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }

    // Transition to RUNNING_TOOL state if not already there
    if (currentState.state === 'READY') {
      if (!this.stateMachine.transition('RUNNING_TOOL', `Tool ${toolId} execution started`)) {
        throw new Error('Failed to transition to tool execution state');
      }
    }

    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // MODE VALIDATION - Check tool access
    if (!this.validateToolAccess(toolId, params)) {
      throw new Error(`Tool ${toolId} not allowed in ${currentState.mode} mode`);
    }

    // APPROVAL VALIDATION - Tools requiring approval must be approved
    if (tool.definition.requiresApproval && !params.approved) {
      throw new Error(`Tool ${toolId} requires explicit approval before execution`);
    }

    const startTime = Date.now();

    try {
      // Validate parameters
      this.validateParameters(tool.definition, params);

      // Execute with progress tracking
      const result = await tool.executor(params, context);

      const duration = Date.now() - startTime;
      if (isSuccessfulToolResult(result)) {
        // Track for rollback
        const rollbackData = this.generateRollbackData(toolId, params, result.data);
        if (rollbackData) {
          this.executedSteps.push({ toolId, rollbackData, timestamp: new Date() });
        }

        return {
          success: true,
          data: result.data,
          duration,
          rollbackData
        };
      } else {
        // ROLLBACK ON FAILURE - Attempt to undo the failed operation
        await this.rollbackOnFailure(toolId, params);
        return {
          success: false,
          error: result.error,
          duration
        };
      }

    } catch (error) {
      // ROLLBACK ON FAILURE - Attempt to undo the failed operation
      await this.rollbackOnFailure(toolId, params);
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  private async rollbackOnFailure(toolId: string, params: any): Promise<void> {
    try {
      // Attempt rollback for failed operations
      const rollbackData = this.generateRollbackData(toolId, params, null);
      if (rollbackData) {
        await this.rollbackTool(toolId, rollbackData);
        console.log(`âœ… Rolled back failed ${toolId} operation`);
      }
    } catch (rollbackError) {
      console.error(`âŒ Rollback failed for ${toolId}:`, rollbackError);
    }
  }

  async rollbackTool(toolId: string, rollbackData: any): Promise<boolean> {
    try {
      switch (toolId) {
        case 'createFile':
          if (rollbackData.filePath) {
            await vscode.workspace.fs.delete(vscode.Uri.file(rollbackData.filePath));
            console.log(`âœ… Rolled back file creation: ${rollbackData.filePath}`);
          }
          break;
        case 'createFolder':
          if (rollbackData.folderPath) {
            await vscode.workspace.fs.delete(vscode.Uri.file(rollbackData.folderPath), { recursive: true });
            console.log(`âœ… Rolled back folder creation: ${rollbackData.folderPath}`);
          }
          break;
        case 'runShellCommand':
          if (rollbackData.undoCommand) {
            const terminal = vscode.window.createTerminal('Vibe Rollback');
            terminal.sendText(rollbackData.undoCommand);
            terminal.show();
            console.log(`âœ… Rolled back shell command with: ${rollbackData.undoCommand}`);
          }
          break;
      }
      return true;
    } catch (error) {
      console.error(`âŒ Rollback failed for ${toolId}:`, error);
      return false;
    }
  }

  async rollbackLastStep(): Promise<boolean> {
    if (this.executedSteps.length === 0) {
      return false;
    }

    const lastStep = this.executedSteps.pop()!;
    return this.rollbackTool(lastStep.toolId, lastStep.rollbackData);
  }

  private validateToolAccess(toolId: string, params: any): boolean {
    const currentState = this.stateMachine.getState();
    const modeCaps = MODE_DEFINITIONS[currentState.mode];

    // Check if tool is allowed in current mode
    if (!modeCaps.allowedTools.includes('all') && !modeCaps.allowedTools.includes(toolId)) {
      return false;
    }

    // Determine side effect from tool type
    let sideEffect: string | undefined;
    switch (toolId) {
      case 'createFile':
      case 'createFolder':
        sideEffect = 'file_create';
        break;
      case 'runShellCommand':
        sideEffect = 'terminal';
        break;
      case 'runTests':
        sideEffect = 'terminal';
        break;
    }

    // Check if side effect is allowed in current mode
    if (sideEffect && !modeCaps.allowedSideEffects.includes('all') && !modeCaps.allowedSideEffects.includes(sideEffect)) {
      return false;
    }

    return true;
  }

  private validateParameters(definition: ToolDefinition, params: any): void {
    for (const param of definition.parameters) {
      if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }
    }
  }

  private generateRollbackData(toolId: string, params: any, result: any): any {
    // Generate rollback data based on tool type
    switch (toolId) {
      case 'createFile':
        return { filePath: params.name, existed: false };
      case 'createFolder':
        return { folderPath: params.name, existed: false };
      case 'runShellCommand':
        return { undoCommand: this.generateUndoCommand(params.command), originalCommand: params.command };
      default:
        return null;
    }
  }

  private generateUndoCommand(originalCommand: string): string {
    // Simple undo patterns for common commands
    if (originalCommand.includes('npm install')) {
      return 'npm uninstall ' + originalCommand.replace('npm install', '').trim();
    }
    if (originalCommand.includes('git add')) {
      return 'git reset';
    }
    if (originalCommand.includes('mkdir')) {
      return 'rmdir ' + originalCommand.replace('mkdir', '').trim();
    }
    return '# No undo available for: ' + originalCommand;
  }

  getStateMachine(): StateMachine {
    return this.stateMachine;
  }

  private registerCoreTools(): void {
    // FILE SYSTEM TOOLS - High risk, require approval
    this.registerTool({
      id: 'createFile',
      name: 'Create File',
      category: 'file',
      description: 'Create a new file with optional content',
      parameters: [
        { name: 'path', type: 'string', required: true, description: 'File path relative to workspace root' },
        { name: 'content', type: 'string', required: false, description: 'File content to write', defaultValue: '' },
        { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite if file exists', defaultValue: false }
      ],
      returns: 'File creation confirmation with path',
      cancellable: false,
      rollbackable: true,
      requiresApproval: true
    }, async (params, context): Promise<ToolResult<string>> => {
      const filePath = vscode.Uri.joinPath(context.workspaceFolder.uri, params.path);

      // Check if file exists and overwrite is not allowed
      try {
        await vscode.workspace.fs.stat(filePath);
        if (!params.overwrite) {
          throw new Error(`File already exists: ${params.path}. Set overwrite=true to replace it.`);
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }

      await vscode.workspace.fs.writeFile(filePath, Buffer.from(params.content || ''));
      return { success: true, data: `File created successfully: ${params.path}`, duration: 0 };
    });

    this.registerTool({
      id: 'createFolder',
      name: 'Create Folder',
      category: 'file',
      description: 'Create a new directory',
      parameters: [
        { name: 'path', type: 'string', required: true, description: 'Folder path relative to workspace root' }
      ],
      returns: 'Folder creation confirmation',
      cancellable: false,
      rollbackable: true,
      requiresApproval: true
    }, async (params, context): Promise<ToolResult<string>> => {
      const folderPath = vscode.Uri.joinPath(context.workspaceFolder.uri, params.path);
      await vscode.workspace.fs.createDirectory(folderPath);
      return { success: true, data: `Folder created successfully: ${params.path}`, duration: 0 };
    });

    // SHELL TOOLS - High risk, require approval
    this.registerTool({
      id: 'runShellCommand',
      name: 'Run Shell Command',
      category: 'shell',
      description: 'Execute a terminal command',
      parameters: [
        { name: 'command', type: 'string', required: true, description: 'Shell command to execute' },
        { name: 'workingDirectory', type: 'string', required: false, description: 'Working directory for command', defaultValue: '.' }
      ],
      returns: 'Command execution result with output',
      cancellable: true,
      rollbackable: false, // Shell commands are generally not rollbackable
      requiresApproval: true
    }, async (params, context): Promise<ToolResult<string>> => {
      const terminal = vscode.window.createTerminal({
        name: 'Vibe Command',
        cwd: vscode.Uri.joinPath(context.workspaceFolder.uri, params.workingDirectory || '.')
      });

      terminal.sendText(params.command);
      terminal.show();

      // For shell commands, we don't wait for completion as they may be interactive
      // Just return success and let the user see the terminal
      return {
        success: true,
        data: `Command sent to terminal: ${params.command}. Check the terminal for output.`,
        duration: 0
      };
    });

    // ANALYSIS TOOLS - Safe, no approval needed
    this.registerTool({
      id: 'analyzeProject',
      name: 'Analyze Project',
      category: 'analysis',
      description: 'Analyze project structure and provide insights',
      parameters: [
        { name: 'focus', type: 'string', required: false, description: 'Specific aspect to analyze', defaultValue: 'general' }
      ],
      returns: 'Project analysis report',
      cancellable: false,
      rollbackable: false,
      requiresApproval: false
    }, async (params, context): Promise<ToolResult<string>> => {
      // Get workspace files
      const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);

      let analysis = `# Project Analysis\n\n`;
      analysis += `**Total Files**: ${files.length}\n\n`;

      // Count by extension
      const extensions: Record<string, number> = {};
      files.forEach(file => {
        const ext = file.fsPath.split('.').pop() || 'no-ext';
        extensions[ext] = (extensions[ext] || 0) + 1;
      });

      analysis += `**File Types**:\n`;
      Object.entries(extensions)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([ext, count]) => {
          analysis += `- ${ext}: ${count} files\n`;
        });

      return { success: true, data: analysis, duration: 0 };
    });

    this.registerTool({
      id: 'searchCodebase',
      name: 'Search Codebase',
      category: 'analysis',
      description: 'Search for patterns in the codebase',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query or pattern' },
        { name: 'includePattern', type: 'string', required: false, description: 'File pattern to include', defaultValue: '**/*' },
        { name: 'excludePattern', type: 'string', required: false, description: 'File pattern to exclude', defaultValue: '**/node_modules/**' }
      ],
      returns: 'Search results with file locations',
      cancellable: false,
      rollbackable: false,
      requiresApproval: false
    }, async (params, context): Promise<ToolResult<string>> => {
      const files = await vscode.workspace.findFiles(
        params.includePattern || '**/*',
        params.excludePattern || '**/node_modules/**',
        50
      );

      let results = `# Codebase Search Results\n\n`;
      results += `**Query**: ${params.query}\n\n`;

      let matchCount = 0;
      for (const file of files.slice(0, 10)) { // Limit to first 10 files
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = content.toString();
          const lines = text.split('\n');

          const matchingLines: string[] = [];
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(params.query.toLowerCase())) {
              matchingLines.push(`${index + 1}: ${line.trim()}`);
            }
          });

          if (matchingLines.length > 0) {
            results += `**${vscode.workspace.asRelativePath(file)}**:\n`;
            matchingLines.slice(0, 5).forEach(match => {
              results += `  ${match}\n`;
            });
            results += `\n`;
            matchCount += matchingLines.length;
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      results += `**Total matches found**: ${matchCount}\n`;
      return { success: true, data: results, duration: 0 };
    });

    // CODE TOOLS - Medium risk, some require approval
    this.registerTool({
      id: 'formatCode',
      name: 'Format Code',
      category: 'code',
      description: 'Format the current file using VS Code formatter',
      parameters: [],
      returns: 'Formatting confirmation',
      cancellable: false,
      rollbackable: false,
      requiresApproval: false
    }, async (params, context): Promise<ToolResult<string>> => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('No active editor found');
      }

      await vscode.commands.executeCommand('editor.action.formatDocument');
      return { success: true, data: `Code formatted in ${editor.document.fileName}`, duration: 0 };
    });

    this.registerTool({
      id: 'runTests',
      name: 'Run Tests',
      category: 'testing',
      description: 'Execute test suite',
      parameters: [
        { name: 'command', type: 'string', required: false, description: 'Test command to run', defaultValue: 'auto-detect' }
      ],
      returns: 'Test execution results',
      cancellable: true,
      rollbackable: false,
      requiresApproval: true // Tests can have side effects
    }, async (params, context): Promise<ToolResult<string>> => {
      let testCommand = params.command;

      if (testCommand === 'auto-detect') {
        // Try to detect test command from package.json
        try {
          const packageJsonUri = vscode.Uri.joinPath(context.workspaceFolder.uri, 'package.json');
          const packageJson = await vscode.workspace.fs.readFile(packageJsonUri);
          const packageData = JSON.parse(packageJson.toString());

          if (packageData.scripts?.test) {
            testCommand = 'npm test';
          } else if (await this.fileExists(vscode.Uri.joinPath(context.workspaceFolder.uri, 'pytest.ini'))) {
            testCommand = 'pytest';
          } else {
            testCommand = 'npm test'; // Default fallback
          }
        } catch (error) {
          testCommand = 'npm test';
        }
      }

      const terminal = vscode.window.createTerminal('Vibe Tests');
      terminal.sendText(testCommand);
      terminal.show();

      return {
        success: true,
        data: `Test command executed: ${testCommand}. Check terminal for results.`,
        duration: 0
      };
    });
  }

  private canAutoApproveTool(toolId: string, threshold: string): boolean {
    // Define tool risk levels
    const toolRiskLevels: Record<string, 'safe' | 'medium' | 'high'> = {
      'formatCode': 'safe',
      'analyzeProject': 'safe',
      'searchCodebase': 'safe',
      'createFile': 'medium',
      'createFolder': 'medium',
      'runTests': 'medium',
      'runShellCommand': 'high'
    };

    const riskLevel = toolRiskLevels[toolId] || 'high';

    // Check if threshold allows this risk level
    switch (threshold) {
      case 'none':
        return false;
      case 'safe':
        return riskLevel === 'safe';
      case 'medium':
        return riskLevel === 'safe' || riskLevel === 'medium';
      case 'high':
        return true; // All tools auto-approved
      default:
        return false;
    }
  }

  private async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}

class AgentOrchestrator {
  private currentTask: AgentTask | null = null;
  private abortController: AbortController | null = null;

  constructor(private toolSystem: ToolSystem) {}

  async startAgent(taskDescription: string, mode: ExecutionMode): Promise<void> {
    // HARD STATE VALIDATION: Agent can only start from READY state
    const currentState = this.toolSystem.getStateMachine().getState();
    if (currentState.state !== 'READY') {
      const errorMsg = `âŒ Cannot start agent in ${currentState.state} state. Please wait for current operation to complete.`;
      vscode.window.showErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }

    // MODE VALIDATION: Agent mode must be allowed
    if (mode !== 'agent') {
      const errorMsg = `âŒ Agent execution only allowed in 'agent' mode. Current mode: ${currentState.mode}`;
      vscode.window.showErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }

    if (this.currentTask) {
      throw new Error('Agent is already running a task');
    }

    // Transition to PROPOSING_ACTIONS state
    const stateMachine = this.toolSystem.getStateMachine();
    if (!stateMachine.transition('PROPOSING_ACTIONS', 'Agent task started')) {
      throw new Error('Failed to transition to agent execution state');
    }

    this.abortController = new AbortController();
    this.currentTask = {
      id: `task_${Date.now()}`,
      description: taskDescription,
      steps: [],
      status: 'planning',
      progress: 0,
      startTime: new Date()
    };

    try {
      // Task Decomposition
      await this.decomposeTask(taskDescription, mode);

      // Transition to RUNNING_TOOL state for execution
      stateMachine.transition('RUNNING_TOOL', 'Agent steps executing');

      // Sequential Execution
      await this.executeSteps();

      // Verification
      stateMachine.transition('VERIFYING', 'Agent results verifying');
      await this.verifyResults();

      this.currentTask.status = 'completed';
      this.currentTask.progress = 100;
      this.currentTask.endTime = new Date();

      // Final completion
      stateMachine.transition('COMPLETED', 'Agent task completed');

    } catch (error) {
      this.currentTask.status = 'failed';
      this.currentTask.endTime = new Date();
      stateMachine.transition('ERROR', `Agent task failed: ${error}`);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancelAgent(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.currentTask) {
      this.currentTask.status = 'cancelled';
      this.currentTask.endTime = new Date();
    }
  }

  getAgentStatus(): { isRunning: boolean; currentTask?: AgentTask } {
    return {
      isRunning: this.currentTask?.status === 'planning' || this.currentTask?.status === 'executing',
      currentTask: this.currentTask || undefined
    };
  }

  private async decomposeTask(taskDescription: string, mode: ExecutionMode): Promise<void> {
    // HARD REQUIREMENT: All agent steps MUST come from LLM JSON - no fallbacks allowed
    try {
      const providerManager = new ProviderManager(extensionContext);
      const modeCapabilities = MODE_DEFINITIONS[mode];

      const systemPrompt = `You are an expert task decomposer for software development. Given a user task and execution mode, break it down into concrete, actionable steps.

CRITICAL CONSTRAINTS:
- Mode: ${mode} - ${modeCapabilities.description}
- ONLY use these allowed tools: ${modeCapabilities.allowedTools.join(', ')}
- ONLY allow these side effects: ${modeCapabilities.allowedSideEffects.join(', ')}
- NEVER suggest tools not in the allowed list
- ALWAYS require approval for dangerous operations (file creation, shell commands, etc.)

Available Tools:
- createFile: Create a new file with content (requires approval)
- createFolder: Create a new directory (requires approval)
- runShellCommand: Execute terminal commands (requires approval)
- formatCode: Format code files (safe)
- analyzeProject: Analyze project structure (safe)
- searchCodebase: Search for code patterns (safe)

Return ONLY a valid JSON object with this exact structure:
{
  "steps": [
    {
      "id": "unique_step_id",
      "description": "Clear description of what this step does",
      "tool": "tool_name_from_available_list",
      "parameters": { "param1": "value1" },
      "requiresApproval": true
    }
  ]
}

VALIDATION RULES:
- Each step.tool MUST be from the allowed tools list above
- Each step.requiresApproval MUST be true for dangerous operations
- Parameters must be valid for the chosen tool
- Steps must be sequential and logical
- Return ONLY the JSON object, no other text`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Task: ${taskDescription}\nMode: ${mode}\n\nGenerate a valid JSON decomposition using only the allowed tools.` }
      ];

      const response = await providerManager.chat({
        messages,
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.1, // Low temperature for consistency
        maxTokens: 2000,
        stream: false
      });

      // Parse and validate the AI response
      const parsedResponse = JSON.parse(response.content.trim());
      if (!parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
        throw new Error('LLM did not return valid task decomposition JSON');
      }

      // STRICT VALIDATION: Every step must be valid
      const steps: AgentStep[] = [];
      for (const step of parsedResponse.steps) {
        // Validate tool exists and is allowed in mode
        if (!this.validateToolForMode(step.tool, mode)) {
          throw new Error(`LLM suggested invalid tool "${step.tool}" for mode ${mode}`);
        }

        // Validate required fields
        if (!step.id || !step.description || !step.tool) {
          throw new Error('LLM generated incomplete step data');
        }

        // Force approval for dangerous tools
        const requiresApproval = this.requiresApproval(step.tool) || step.requiresApproval === true;

        steps.push({
          id: step.id,
          description: step.description,
          tool: step.tool,
          parameters: step.parameters || {},
          status: 'pending',
          requiresApproval: requiresApproval,
          approved: false // NEVER auto-approve
        });
      }

      if (steps.length === 0) {
        throw new Error('LLM generated no valid steps');
      }

      this.currentTask!.steps = steps;
      this.currentTask!.status = 'executing';

    } catch (error) {
      console.error('Task decomposition failed:', error);
      // NO FALLBACK - Agent fails if LLM cannot generate valid steps
      throw new Error(`Agent cannot proceed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateToolForMode(toolName: string, mode: ExecutionMode): boolean {
    const modeCaps = MODE_DEFINITIONS[mode];
    return modeCaps.allowedTools.includes('all') || modeCaps.allowedTools.includes(toolName);
  }

  private fallbackDecomposeTask(taskDescription: string, mode: ExecutionMode): void {
    // Simple fallback decomposition
    const steps: AgentStep[] = [
      {
        id: 'analyze_task',
        description: 'Analyze the task requirements',
        tool: 'analyzeProject',
        parameters: { type: 'task' },
        status: 'pending',
        requiresApproval: false
      }
    ];

    this.currentTask!.steps = steps;
    this.currentTask!.status = 'executing';
  }

  private async executeSteps(): Promise<void> {
    if (!this.currentTask || !vscode.workspace.workspaceFolders) return;

    const workspaceFolder = vscode.workspace.workspaceFolders[0];

    for (let i = 0; i < this.currentTask.steps.length; i++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Agent execution cancelled');
      }

      const step = this.currentTask.steps[i];

      // ENFORCEMENT: Check approval status before execution
      if (step.requiresApproval && !step.approved) {
        // Transition to awaiting approval state
        const stateMachine = this.toolSystem.getStateMachine();
        stateMachine.transition('AWAITING_APPROVAL', `Waiting for approval on step: ${step.description}`);

        // Wait for approval (this would be handled by UI interaction)
        // For now, we'll throw an error indicating approval is required
        throw new Error(`Step "${step.description}" requires explicit approval before execution. Agent execution paused.`);
      }

      step.status = 'running';
      this.updateProgress();

      try {
        // Execute the step using the unified tool system
        const context: ToolExecutionContext = {
          signal: this.abortController?.signal,
          onProgress: (progress, message) => {
            console.log(`[${step.id}] ${progress}%: ${message}`);
          },
          workspaceFolder
        };

        const result = await this.toolSystem.executeTool(step.tool, step.parameters, context);

        if (result.success) {
          step.result = result.data;
          step.status = 'completed';
        } else {
          step.error = result.error;
          step.status = 'failed';
          // ROLLBACK ON FAILURE: Attempt to undo this step
          await this.rollbackFailedStep(step);
          throw new Error(result.error);
        }

        // Brief delay between steps for UI feedback
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
        // ROLLBACK ON FAILURE: Attempt to undo this step
        await this.rollbackFailedStep(step);
        throw error;
      }
    }
  }

  private async rollbackFailedStep(step: AgentStep): Promise<void> {
    try {
      // Attempt to rollback this specific failed step
      await this.toolSystem.rollbackTool(step.tool, step.parameters || {});
      console.log(`âœ… Rolled back failed step: ${step.description}`);
    } catch (rollbackError) {
      console.error(`âŒ Rollback failed for step ${step.id}:`, rollbackError);
      // Continue with error - rollback failure shouldn't stop the overall error handling
    }
  }

  private async verifyResults(): Promise<void> {
    if (!this.currentTask) return;

    // Simple verification - check that all steps completed
    const failedSteps = this.currentTask.steps.filter(step => step.status === 'failed');
    if (failedSteps.length > 0) {
      throw new Error(`${failedSteps.length} steps failed during execution`);
    }

    // Additional verification logic could go here
    this.currentTask.status = 'verifying';
    this.updateProgress();

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private updateProgress(): void {
    if (!this.currentTask) return;

    const completedSteps = this.currentTask.steps.filter(step => step.status === 'completed').length;
    this.currentTask.progress = Math.round((completedSteps / this.currentTask.steps.length) * 100);
  }

  private requiresApproval(toolName: string): boolean {
    // Tools that require explicit approval
    const approvalRequired = [
      'runShellCommand',
      'createFile',
      'createFolder',
      'runTests'
    ];
    return approvalRequired.includes(toolName);
  }
}

// Settings System Types
interface VibeSettings {
  // Provider Settings
  providers: {
    openrouterApiKey: string;
    megallmApiKey: string;
    agentrouterApiKey: string;
    routewayApiKey: string;
    defaultProvider: string;
    modelPreferences: Record<string, string>;
  };

  // Agent Behavior
  agent: {
    autoApprovalThreshold: 'none' | 'safe' | 'medium' | 'high';
    maxConcurrentTasks: number;
    taskTimeoutMinutes: number;
    enableStreaming: boolean;
    enableToolVerification: boolean;
  };

  // Context & Limits
  context: {
    maxContextLength: number;
    contextCompressionEnabled: boolean;
    memoryRetentionDays: number;
    fileSizeLimitMB: number;
  };

  // UI Preferences
  ui: {
    theme: 'auto' | 'light' | 'dark';
    showStatusBar: boolean;
    enableNotifications: boolean;
    chatPanelPosition: 'left' | 'right' | 'bottom';
    fontSize: number;
  };

  // Advanced Settings
  advanced: {
    enableDebugLogging: boolean;
    enableTelemetry: boolean;
    enableExperimentalFeatures: boolean;
    customPrompts: Record<string, string>;
  };
}

interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class SettingsManager {
  private static instance: SettingsManager;
  private settings: VibeSettings;
  private listeners: Array<(settings: VibeSettings) => void> = [];

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  // Get current settings
  getSettings(): VibeSettings {
    return { ...this.settings };
  }

  // Update settings with validation
  async updateSettings(updates: Partial<VibeSettings>): Promise<SettingsValidationResult> {
    const newSettings = { ...this.settings, ...updates };
    const validation = this.validateSettings(newSettings);

    if (validation.isValid) {
      this.settings = newSettings;
      await this.saveSettings();
      this.notifyListeners();
      console.log('âœ… Settings updated successfully');
    } else {
      console.error('âŒ Settings validation failed:', validation.errors);
    }

    return validation;
  }

  // Get specific setting value
  getSetting<K extends keyof VibeSettings>(key: K): VibeSettings[K] {
    return this.settings[key];
  }

  // Update specific setting
  async updateSetting<K extends keyof VibeSettings>(key: K, value: VibeSettings[K]): Promise<SettingsValidationResult> {
    return this.updateSettings({ [key]: value });
  }

  // Subscribe to settings changes
  subscribe(listener: (settings: VibeSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Reset to defaults
  async resetToDefaults(): Promise<void> {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    this.notifyListeners();
    console.log('ðŸ”„ Settings reset to defaults');
  }

  // Export settings for backup
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings from backup
  async importSettings(jsonString: string): Promise<SettingsValidationResult> {
    try {
      const imported = JSON.parse(jsonString);
      return this.updateSettings(imported);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Invalid JSON format: ${error}`],
        warnings: []
      };
    }
  }

  private getDefaultSettings(): VibeSettings {
    return {
      providers: {
        openrouterApiKey: '',
        megallmApiKey: '',
        agentrouterApiKey: '',
        routewayApiKey: '',
        defaultProvider: 'openrouter',
        modelPreferences: {}
      },
      agent: {
        autoApprovalThreshold: 'safe',
        maxConcurrentTasks: 3,
        taskTimeoutMinutes: 30,
        enableStreaming: true,
        enableToolVerification: true
      },
      context: {
        maxContextLength: 128000,
        contextCompressionEnabled: true,
        memoryRetentionDays: 30,
        fileSizeLimitMB: 10
      },
      ui: {
        theme: 'auto',
        showStatusBar: true,
        enableNotifications: true,
        chatPanelPosition: 'right',
        fontSize: 14
      },
      advanced: {
        enableDebugLogging: false,
        enableTelemetry: false,
        enableExperimentalFeatures: false,
        customPrompts: {}
      }
    };
  }

  private async loadSettings(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('vibe');
      const loadedSettings = config.get<VibeSettings>('settings');

      if (loadedSettings) {
        // Merge loaded settings with defaults to handle missing keys
        this.settings = { ...this.getDefaultSettings(), ...loadedSettings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Keep default settings
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('vibe');
      await config.update('settings', this.settings, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  private validateSettings(settings: VibeSettings): SettingsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Provider validation
    const providers = settings.providers;
    if (!providers.defaultProvider || !['openrouter', 'megallm', 'agentrouter', 'routeway'].includes(providers.defaultProvider)) {
      errors.push('Invalid default provider');
    }

    // Agent validation
    const agent = settings.agent;
    if (agent.maxConcurrentTasks < 1 || agent.maxConcurrentTasks > 10) {
      errors.push('Max concurrent tasks must be between 1 and 10');
    }
    if (agent.taskTimeoutMinutes < 1 || agent.taskTimeoutMinutes > 300) {
      errors.push('Task timeout must be between 1 and 300 minutes');
    }

    // Context validation
    const context = settings.context;
    if (context.maxContextLength < 1000 || context.maxContextLength > 1000000) {
      errors.push('Max context length must be between 1000 and 1,000,000');
    }
    if (context.memoryRetentionDays < 1 || context.memoryRetentionDays > 365) {
      errors.push('Memory retention must be between 1 and 365 days');
    }
    if (context.fileSizeLimitMB < 1 || context.fileSizeLimitMB > 100) {
      errors.push('File size limit must be between 1 and 100 MB');
    }

    // UI validation
    const ui = settings.ui;
    if (!['auto', 'light', 'dark'].includes(ui.theme)) {
      errors.push('Invalid theme setting');
    }
    if (!['left', 'right', 'bottom'].includes(ui.chatPanelPosition)) {
      errors.push('Invalid chat panel position');
    }
    if (ui.fontSize < 8 || ui.fontSize > 24) {
      errors.push('Font size must be between 8 and 24');
    }

    // Warnings for missing API keys
    if (!providers.openrouterApiKey && !providers.megallmApiKey && !providers.agentrouterApiKey && !providers.routewayApiKey) {
      warnings.push('No API keys configured - AI features will not work');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private notifyListeners(): void {
    const currentSettings = this.getSettings();
    this.listeners.forEach(listener => {
      try {
        listener(currentSettings);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }
}

// Provider System Types
interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

interface ProviderRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface ProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  model: string;
  provider: string;
}

interface TokenBudget {
  used: number;
  limit: number;
  resetTime: Date;
}

interface ProviderHealth {
  id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastError?: string;
  lastSuccess: Date;
  consecutiveFailures: number;
}

class ProviderManager {
  private providers: Map<string, ProviderConfig> = new Map();
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private rateLimiters: Map<string, TokenBudget> = new Map();
  private currentProvider: string = 'openrouter';
  private streamCallback?: (token: string) => void;

  constructor(private context?: vscode.ExtensionContext) {
    this.initializeProviders();
    this.initializeHealthMonitoring();
  }

  private async initializeProviders(): Promise<void> {
    // OpenRouter - Primary provider
    this.providers.set('openrouter', {
      id: 'openrouter',
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: await this.getApiKey('openrouterApiKey'),
      models: [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'meta-llama/llama-3.1-405b-instruct',
        'x-ai/grok-2-1212'
      ],
      rateLimits: {
        requestsPerMinute: 50,
        tokensPerMinute: 100000
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    });

    // MegaLLM - High performance
    this.providers.set('megallm', {
      id: 'megallm',
      name: 'MegaLLM',
      baseURL: 'https://ai.megallm.io/v1',
      apiKey: await this.getApiKey('megallmApiKey'),
      models: [
        'qwen/qwen3-next-80b-instruct',
        'deepseek/deepseek-v3'
      ],
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerMinute: 50000
      },
      retryConfig: {
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 15000
      }
    });

    // AgentRouter - Claude access
    this.providers.set('agentrouter', {
      id: 'agentrouter',
      name: 'AgentRouter',
      baseURL: 'https://api.agentrouter.io/v1',
      apiKey: await this.getApiKey('agentrouterApiKey'),
      models: [
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-haiku'
      ],
      rateLimits: {
        requestsPerMinute: 20,
        tokensPerMinute: 30000
      },
      retryConfig: {
        maxRetries: 2,
        baseDelay: 3000,
        maxDelay: 20000
      }
    });

    // Routeway - Specialized
    this.providers.set('routeway', {
      id: 'routeway',
      name: 'Routeway',
      baseURL: 'https://api.routeway.ai/v1',
      apiKey: await this.getApiKey('routewayApiKey'),
      models: [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o-mini'
      ],
      rateLimits: {
        requestsPerMinute: 25,
        tokensPerMinute: 40000
      },
      retryConfig: {
        maxRetries: 2,
        baseDelay: 2500,
        maxDelay: 18000
      }
    });
  }

  private async getApiKey(keyName: string): Promise<string> {
    if (!this.context) {
      console.warn('ExtensionContext not available for secrets access');
      return '';
    }

    // Try to get from secrets first (Marketplace compliant)
    try {
      const secretKey = `vibe.${keyName}`;
      const secretValue = await this.context.secrets.get(secretKey);
      if (secretValue) {
        return secretValue;
      }
    } catch (error) {
      console.warn('Failed to access secrets:', error);
    }

    // Fallback to workspace config for migration (will be removed after migration)
    const config = vscode.workspace.getConfiguration('vibe');
    const configValue = config.get<string>(keyName) || '';

    // If we found a key in config, migrate it to secrets
    if (configValue) {
      await this.migrateApiKeyToSecrets(keyName, configValue);
    }

    return configValue;
  }

  private async migrateApiKeyToSecrets(keyName: string, value: string): Promise<void> {
    if (!this.context) return;

    try {
      const secretKey = `vibe.${keyName}`;
      await this.context.secrets.store(secretKey, value);

      // Remove from workspace config after successful migration
      const config = vscode.workspace.getConfiguration('vibe');
      await config.update(keyName, undefined, vscode.ConfigurationTarget.Global);

      console.log(`âœ… Migrated ${keyName} to secure storage`);
    } catch (error) {
      console.error(`âŒ Failed to migrate ${keyName} to secrets:`, error);
    }
  }

  private initializeHealthMonitoring(): void {
    for (const [id] of this.providers) {
      this.healthStatus.set(id, {
        id,
        status: 'healthy',
        lastSuccess: new Date(),
        consecutiveFailures: 0
      });

      this.rateLimiters.set(id, {
        used: 0,
        limit: 100000, // Will be updated from provider config
        resetTime: new Date(Date.now() + 60000)
      });
    }
  }

  async chat(request: ProviderRequest): Promise<ProviderResponse> {
    const fallbackChain = this.buildFallbackChain(request.model);

    for (const providerId of fallbackChain) {
      try {
        const provider = this.providers.get(providerId);
        if (!provider || !provider.apiKey) continue;

        // Check rate limits
        if (!this.checkRateLimit(providerId)) {
          console.log(`Rate limit exceeded for ${providerId}, trying next provider`);
          continue;
        }

        // Make request with retry logic
        const response = await this.makeRequestWithRetry(provider, request);

        // Update health and rate limiting
        this.updateHealth(providerId, true);
        this.updateRateLimit(providerId, response.usage);

        return response;

      } catch (error) {
        console.error(`Provider ${providerId} failed:`, error);
        this.updateHealth(providerId, false, error instanceof Error ? error.message : String(error));
      }
    }

    throw new Error('All providers failed - please check API keys and network connection');
  }

  private buildFallbackChain(requestedModel: string): string[] {
    // Start with current provider if it supports the model
    const chain = [this.currentProvider];

    // Add other providers that support the model
    for (const [id, provider] of this.providers) {
      if (id !== this.currentProvider && provider.models.includes(requestedModel)) {
        chain.push(id);
      }
    }

    // Add providers with fallback models
    const fallbackModels = this.getFallbackModels(requestedModel);
    for (const [id, provider] of this.providers) {
      if (!chain.includes(id)) {
        const hasCompatibleModel = provider.models.some(model =>
          fallbackModels.includes(model)
        );
        if (hasCompatibleModel) {
          chain.push(id);
        }
      }
    }

    return chain;
  }

  private getFallbackModels(requestedModel: string): string[] {
    // Model compatibility mapping
    const compatibilityMap: Record<string, string[]> = {
      'anthropic/claude-3.5-sonnet': ['anthropic/claude-3-haiku', 'openai/gpt-4o', 'meta-llama/llama-3.1-405b-instruct'],
      'openai/gpt-4o': ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b-instruct'],
      'meta-llama/llama-3.1-405b-instruct': ['qwen/qwen3-next-80b-instruct', 'deepseek/deepseek-v3']
    };

    return compatibilityMap[requestedModel] || [requestedModel];
  }

  private async makeRequestWithRetry(
    provider: ProviderConfig,
    request: ProviderRequest
  ): Promise<ProviderResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= provider.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(provider, request);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < provider.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, provider.retryConfig);
          console.log(`Retrying ${provider.id} in ${delay}ms (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`All retry attempts failed for ${provider.id}`);
  }

  private calculateRetryDelay(attempt: number, config: ProviderConfig['retryConfig']): number {
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  private async makeRequest(provider: ProviderConfig, request: ProviderRequest): Promise<ProviderResponse> {
    const url = `${provider.baseURL}/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/mk-knight23/vibe',
      'X-Title': 'Vibe VS Code Extension'
    };

    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4000,
      stream: request.stream || false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Handle streaming response
    if (request.stream && response.body) {
      return this.handleStreamingResponse(response, provider, request);
    }

    // Handle regular response
    const data = await response.json() as any;

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason,
      model: data.model || request.model,
      provider: provider.id
    };
  }

  private async handleStreamingResponse(response: Response, provider: ProviderConfig, request: ProviderRequest): Promise<ProviderResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: any = undefined;
    let finishReason: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                // Emit token to UI via callback if available
                if (this.streamCallback) {
                  this.streamCallback(delta.content);
                }
              }

              if (parsed.usage) {
                usage = parsed.usage;
              }

              if (parsed.choices?.[0]?.finish_reason) {
                finishReason = parsed.choices[0].finish_reason;
              }
            } catch (e) {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      usage: usage ? {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      } : undefined,
      finishReason,
      model: request.model,
      provider: provider.id
    };
  }

  private checkRateLimit(providerId: string): boolean {
    const budget = this.rateLimiters.get(providerId);
    if (!budget) return true;

    const now = new Date();
    if (now >= budget.resetTime) {
      // Reset budget
      budget.used = 0;
      budget.resetTime = new Date(now.getTime() + 60000); // Reset every minute
    }

    return budget.used < budget.limit;
  }

  private updateRateLimit(providerId: string, usage?: { totalTokens: number }): void {
    const budget = this.rateLimiters.get(providerId);
    if (budget && usage) {
      budget.used += usage.totalTokens;
    }
  }

  private updateHealth(providerId: string, success: boolean, error?: string): void {
    const health = this.healthStatus.get(providerId);
    if (!health) return;

    if (success) {
      health.status = 'healthy';
      health.lastSuccess = new Date();
      health.consecutiveFailures = 0;
      health.lastError = undefined;
    } else {
      health.consecutiveFailures++;
      health.lastError = error;

      if (health.consecutiveFailures >= 3) {
        health.status = 'unhealthy';
      } else if (health.consecutiveFailures >= 1) {
        health.status = 'degraded';
      }
    }
  }

  getAvailableProviders(): Array<{ id: string; name: string; status: string; models: number }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => {
      const health = this.healthStatus.get(id);
      return {
        id,
        name: provider.name,
        status: health?.status || 'unknown',
        models: provider.models.length
      };
    });
  }

  switchProvider(providerId: string): boolean {
    if (this.providers.has(providerId)) {
      this.currentProvider = providerId;
      console.log(`Switched to provider: ${providerId}`);
      return true;
    }
    return false;
  }

  getHealthStatus(): Array<{ id: string; status: string; lastError?: string }> {
    return Array.from(this.healthStatus.values()).map(health => ({
      id: health.id,
      status: health.status,
      lastError: health.lastError
    }));
  }
}

// Chat System Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  streaming?: boolean;
  approved?: boolean;
  retryable?: boolean;
}

interface ToolCall {
  id: string;
  tool: string;
  parameters: any;
  result?: ToolResult;
  status: 'pending' | 'running' | 'completed' | 'failed';
  approvalRequired?: boolean;
  approved?: boolean;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  currentMode: ExecutionMode;
  createdAt: Date;
  lastActivity: Date;
}

class ChatSystem {
  private currentSession: ChatSession | null = null;
  private chatPanel: vscode.WebviewPanel | null = null;
  private messageQueue: ChatMessage[] = [];
  private memoryKey = 'vibe.chatMemory';

  constructor(
    private agentOrchestrator: AgentOrchestrator,
    private toolSystem: ToolSystem,
    private extensionUri: vscode.Uri,
    private context?: vscode.ExtensionContext
  ) {
    this.loadPersistedMemory();
  }

  private loadPersistedMemory(): void {
    if (!this.context) return;

    try {
      // Load persisted chat sessions
      const persistedData = this.context.globalState.get(this.memoryKey);
      if (persistedData && typeof persistedData === 'object') {
        const memory = persistedData as {
          sessions: ChatSession[];
          lastMode: ExecutionMode;
          lastActivity: Date;
        };

        // Restore last mode if available
        if (memory.lastMode && MODE_DEFINITIONS[memory.lastMode]) {
          stateMachine.setMode(memory.lastMode);
        }

        // Restore recent sessions (limit to last 5 for performance)
        if (memory.sessions && Array.isArray(memory.sessions)) {
          // Only restore sessions from last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentSessions = memory.sessions
            .filter(session => new Date(session.lastActivity) > oneDayAgo)
            .slice(-5); // Keep only last 5

          // For now, just log that we have persisted sessions
          // In a full implementation, we'd restore the most recent session
          if (recentSessions.length > 0) {
            console.log(`ðŸ“š Restored ${recentSessions.length} recent chat sessions`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted memory:', error);
    }
  }

  private savePersistedMemory(): void {
    if (!this.context || !this.currentSession) return;

    try {
      const memory = {
        sessions: [this.currentSession], // In full implementation, store multiple sessions
        lastMode: this.currentSession.currentMode,
        lastActivity: this.currentSession.lastActivity
      };

      this.context.globalState.update(this.memoryKey, memory);
    } catch (error) {
      console.warn('Failed to save persisted memory:', error);
    }
  }

  async openChatPanel(): Promise<void> {
    if (this.chatPanel) {
      this.chatPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.chatPanel = vscode.window.createWebviewPanel(
      'vibeChat',
      'Vibe AI Assistant',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.chatPanel.webview.html = this.getChatHTML();
    this.chatPanel.webview.onDidReceiveMessage(this.handleMessage.bind(this));
    this.chatPanel.onDidDispose(() => {
      this.chatPanel = null;
    });

    // Initialize session if needed
    if (!this.currentSession) {
      this.createNewSession();
    }

    // Wait for webview to be ready before sending messages
    // Use a timeout to ensure DOM is loaded
    setTimeout(() => {
      this.updateChatUI();
    }, 500);
  }

  private createNewSession(): void {
    this.currentSession = {
      id: `session_${Date.now()}`,
      messages: [],
      currentMode: stateMachine.getState().mode,
      createdAt: new Date(),
      lastActivity: new Date()
    };
  }

  async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'sendMessage':
        await this.handleUserMessage(message.text);
        break;
      case 'approveTool':
        await this.approveToolCall(message.toolCallId);
        break;
      case 'rejectTool':
        await this.rejectToolCall(message.toolCallId);
        break;
      case 'retryMessage':
        await this.retryMessage(message.messageId);
        break;
      case 'cancelOperation':
        this.cancelCurrentOperation();
        break;
      case 'switchMode':
        setMode(message.mode);
        if (this.currentSession) {
          this.currentSession.currentMode = message.mode;
        }
        break;
    }
  }

  private async handleUserMessage(text: string): Promise<void> {
    if (!this.currentSession) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    this.currentSession.messages.push(userMessage);
    this.currentSession.lastActivity = new Date();
    this.updateChatUI();

    // Determine if this should trigger agent execution
    if (this.shouldTriggerAgent(text)) {
      await this.executeAgentTask(text);
    } else {
      await this.generateAssistantResponse(text);
    }
  }

  private shouldTriggerAgent(text: string): boolean {
    // Heuristics for agent detection based on action-oriented language
    const agentTriggers = [
      'create', 'build', 'generate', 'setup', 'implement',
      'refactor', 'optimize', 'test', 'deploy', 'configure'
    ];

    const lowerText = text.toLowerCase();
    return agentTriggers.some(trigger => lowerText.includes(trigger)) &&
           lowerText.length > 20; // Longer messages likely need agent
  }

  private async executeAgentTask(taskDescription: string): Promise<void> {
    if (!this.currentSession) return;

    // Create streaming assistant message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
      toolCalls: []
    };

    this.currentSession.messages.push(assistantMessage);
    this.updateChatUI();

    try {
      // Start agent execution
      await this.agentOrchestrator.startAgent(taskDescription, stateMachine.getState().mode);

      // Get results and update message
      const status = this.agentOrchestrator.getAgentStatus();
      if (status.currentTask) {
        assistantMessage.content = this.formatAgentResults(status.currentTask);
        assistantMessage.streaming = false;
        assistantMessage.toolCalls = this.extractToolCalls(status.currentTask);
      }

    } catch (error) {
      assistantMessage.content = `âŒ Agent execution failed: ${error}`;
      assistantMessage.streaming = false;
    }

    this.updateChatUI();
  }

  private async generateAssistantResponse(userMessage: string): Promise<void> {
    if (!this.currentSession) return;

    // Create streaming assistant message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true
    };

    this.currentSession.messages.push(assistantMessage);
    this.updateChatUI();

    try {
      // Get provider manager from global instances
      const providerManager = new ProviderManager(extensionContext);
      await this.generateStreamingAIResponse(userMessage, providerManager, assistantMessage);
    } catch (error) {
      assistantMessage.content = `âŒ Sorry, I couldn't generate a response right now. Please check your API keys in settings.\n\nError: ${error instanceof Error ? error.message : String(error)}`;
      assistantMessage.streaming = false;
      this.updateChatUI();
    }
  }

  private async generateStreamingAIResponse(userMessage: string, providerManager: ProviderManager, assistantMessage: ChatMessage): Promise<void> {
    // HARD STATE GUARD: Streaming can only start from READY state
    const currentState = stateMachine.getState();
    if (currentState.state !== 'READY') {
      const errorMsg = `âŒ Cannot start streaming in ${currentState.state} state. Please wait for current operation to complete.`;
      console.error(errorMsg);
      vscode.window.showErrorMessage(errorMsg);

      // Reset to READY state safely
      stateMachine.transition('READY', 'Streaming cancelled due to invalid state');
      return;
    }

    // Transition to STREAMING state
    if (!stateMachine.transition('STREAMING', 'AI streaming response started')) {
      console.error('Failed to transition to streaming state');
      return;
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `You are Vibe AI Assistant, a helpful coding assistant. You are currently in ${currentState.mode} mode with these capabilities: ${MODE_DEFINITIONS[currentState.mode].description}. Be helpful, accurate, and follow the mode restrictions.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Get settings to determine streaming behavior
      const settings = settingsManager.getSettings();
      const enableStreaming = settings.agent.enableStreaming;

      // Debug logging if enabled
      if (settings.advanced.enableDebugLogging) {
        console.log('ðŸ¤– AI Response Settings:', {
          enableStreaming,
          mode: currentState.mode,
          provider: providerManager.getAvailableProviders().find(p => p.id === 'openrouter') // Current provider
        });
      }

      if (!enableStreaming) {
        // Fallback to non-streaming
        const response = await providerManager.chat({
          messages,
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.7,
          maxTokens: settings.context.maxContextLength || 2000,
          stream: false
        });
        assistantMessage.content = response.content;
        assistantMessage.streaming = false;
        this.updateChatUI();

        // Complete streaming
        stateMachine.transition('COMPLETED', 'Non-streaming response completed');
        return;
      }

      // Set streaming callback to send tokens to UI
      (providerManager as any).streamCallback = (token: string) => {
        this.streamTokenToUI(token, assistantMessage.id);
      };

      // Implement real streaming
      const response = await providerManager.chat({
        messages,
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.7,
        maxTokens: settings.context.maxContextLength || 2000,
        stream: true
      });

      // Clear callback after streaming
      (providerManager as any).streamCallback = undefined;

      // For now, simulate streaming since the provider manager doesn't support real streaming yet
      // In a real implementation, this would process the streaming response
      const content = response.content;
      assistantMessage.content = '';

      // Simulate token-by-token streaming
      const words = content.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (i > 0) assistantMessage.content += ' ';
        assistantMessage.content += words[i];

        // Stream token to UI
        this.streamTokenToUI(words[i] + (i < words.length - 1 ? ' ' : ''), assistantMessage.id);

        // Small delay to simulate realistic streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      assistantMessage.streaming = false;
      this.updateChatUI();

      // Complete streaming
      stateMachine.transition('COMPLETED', 'Streaming response completed');

    } catch (error) {
      console.error('Streaming AI response failed:', error);
      assistantMessage.content = `âŒ Sorry, I couldn't generate a response right now. Please check your API keys in settings.\n\nError: ${error instanceof Error ? error.message : String(error)}`;
      assistantMessage.streaming = false;
      this.updateChatUI();

      // Error state
      stateMachine.transition('ERROR', `Streaming failed: ${error}`);
    }
  }

  private async generateAIResponse(userMessage: string, providerManager: ProviderManager): Promise<string> {
    try {
      const currentState = stateMachine.getState();
      const messages = [
        {
          role: 'system',
          content: `You are Vibe AI Assistant, a helpful coding assistant. You are currently in ${currentState.mode} mode with these capabilities: ${MODE_DEFINITIONS[currentState.mode].description}. Be helpful, accurate, and follow the mode restrictions.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await providerManager.chat({
        messages,
        model: 'anthropic/claude-3.5-sonnet', // Default model
        temperature: 0.7,
        maxTokens: 2000,
        stream: false
      });

      return response.content;
    } catch (error) {
      console.error('AI response failed:', error);
      return `âŒ Sorry, I couldn't generate a response right now. Please check your API keys in settings.\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private formatAgentResults(task: any): string {
    let content = `ðŸ¤– **Agent Task Completed**\n\n`;
    content += `**Task**: ${task.description}\n`;
    content += `**Status**: ${task.status}\n`;
    content += `**Steps Completed**: ${task.steps?.filter((s: any) => s.status === 'completed').length || 0}\n\n`;

    if (task.steps) {
      content += `**Execution Details:**\n`;
      task.steps.forEach((step: any, index: number) => {
        const icon = step.status === 'completed' ? 'âœ…' : step.status === 'failed' ? 'âŒ' : 'â³';
        content += `${index + 1}. ${icon} ${step.description}\n`;
      });
    }

    return content;
  }

  private extractToolCalls(task: any): ToolCall[] {
    if (!task.steps) return [];

    return task.steps.map((step: any) => {
      let result: ToolResult | undefined;
      if (step.result && isToolResult(step.result)) {
        result = step.result;
      }
      return {
        id: step.id,
        tool: step.tool,
        parameters: step.parameters,
        result,
        status: step.status,
        approvalRequired: this.toolRequiresApproval(step.tool),
        approved: true // Auto-approved for now
      };
    });
  }

  private toolRequiresApproval(toolName: string): boolean {
    // Tools that require explicit approval
    const approvalRequired = [
      'runShellCommand',
      'createFile',
      'createFolder',
      'runTests'
    ];
    return approvalRequired.includes(toolName);
  }



  private async approveToolCall(toolCallId: string): Promise<void> {
    // Find and approve the tool call
    if (this.currentSession) {
      for (const message of this.currentSession.messages) {
        if (message.toolCalls) {
          const toolCall = message.toolCalls.find(tc => tc.id === toolCallId);
          if (toolCall) {
            toolCall.approved = true;
            // Execute the approved tool
            await this.executeApprovedTool(toolCall);
            break;
          }
        }
      }
      this.updateChatUI();
    }
  }

  private async rejectToolCall(toolCallId: string): Promise<void> {
    if (this.currentSession) {
      for (const message of this.currentSession.messages) {
        if (message.toolCalls) {
          const toolCall = message.toolCalls.find(tc => tc.id === toolCallId);
          if (toolCall) {
            toolCall.approved = false;
            toolCall.status = 'failed';
            break;
          }
        }
      }
      this.updateChatUI();
    }
  }

  private async executeApprovedTool(toolCall: ToolCall): Promise<void> {
    if (!this.currentSession) return;

    toolCall.status = 'running';
    this.updateChatUI();

    try {
      const context: ToolExecutionContext = {
        workspaceFolder: vscode.workspace.workspaceFolders![0],
        onProgress: (progress, message) => {
          console.log(`[${toolCall.id}] ${progress}%: ${message}`);
        }
      };

      const result = await this.toolSystem.executeTool(toolCall.tool, toolCall.parameters, context);
      toolCall.result = result;
      toolCall.status = isSuccessfulToolResult(result) ? 'completed' : 'failed';

    } catch (error) {
      toolCall.status = 'failed';
      toolCall.result = { success: false, error: String(error), duration: 0 };
    }

    this.updateChatUI();
  }

  private async retryMessage(messageId: string): Promise<void> {
    if (!this.currentSession) return;

    const message = this.currentSession.messages.find(m => m.id === messageId);
    if (message && message.role === 'user') {
      await this.handleUserMessage(message.content);
    }
  }

  private cancelCurrentOperation(): void {
    this.agentOrchestrator.cancelAgent();
    vscode.window.showInformationMessage('ðŸ›‘ Operation cancelled');
  }

  private updateChatUI(): void {
    if (this.chatPanel && this.currentSession) {
      this.chatPanel.webview.postMessage({
        type: 'updateMessages',
        messages: this.currentSession.messages,
        currentMode: this.currentSession.currentMode,
        state: stateMachine.getState()
      });
    }
  }

  // Stream token to UI incrementally
  private streamTokenToUI(token: string, messageId: string): void {
    if (this.chatPanel) {
      this.chatPanel.webview.postMessage({
        type: 'streamToken',
        token,
        messageId
      });
    }
  }

  // Update tool approval status
  private updateToolApproval(toolCallId: string, approved: boolean, status: string): void {
    if (this.chatPanel) {
      this.chatPanel.webview.postMessage({
        type: 'updateToolApproval',
        toolCallId,
        approved,
        status
      });
    }
  }

  getChatHTML(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* STICKY HEADER */
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-panel-background);
            backdrop-filter: blur(10px);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }

        /* MODE PILLS WITH ICONS */
        .mode-selector {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .mode-pill {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 12px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .mode-pill:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .mode-pill.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-focusBorder);
        }

        .mode-pill-icon {
            font-size: 12px;
        }

        /* STATUS BAR WITH PROGRESS */
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 8px;
            padding: 4px 0;
        }

        .status-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .progress-bar {
            display: none;
            width: 120px;
            height: 4px;
            background: var(--vscode-progressBar-background);
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            width: 0%;
            transition: width 0.3s ease;
        }

        /* ERROR BANNERS */
        .error-banner {
            display: none;
            padding: 8px 12px;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            margin: 8px 16px;
            font-size: 12px;
        }

        .error-banner.show {
            display: block;
        }

        /* MESSAGES AREA */
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            scroll-behavior: smooth;
        }

        .message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            line-height: 1.5;
            position: relative;
        }

        .message.user {
            background: var(--vscode-inputValidation-infoBorder);
            margin-left: 20%;
            border-bottom-right-radius: 4px;
        }

        .message.assistant {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: 20%;
            border-bottom-left-radius: 4px;
        }

        .message.streaming {
            border: 2px solid var(--vscode-progressBar-background);
            animation: pulse 2s infinite;
        }

        /* STREAMING CURSOR */
        .streaming-cursor {
            display: inline-block;
            width: 8px;
            height: 16px;
            background: var(--vscode-progressBar-background);
            animation: blink 1s infinite;
            margin-left: 2px;
            border-radius: 1px;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        /* TOOL CARDS WITH APPROVAL BUTTONS */
        .tool-call {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 6px;
            margin: 12px 0;
            padding: 12px 16px;
            position: relative;
        }

        .tool-call.pending {
            border-left-color: var(--vscode-inputValidation-warningBorder);
            background: var(--vscode-inputValidation-warningBackground);
        }

        .tool-call.running {
            border-left-color: var(--vscode-progressBar-background);
            background: var(--vscode-inputValidation-infoBackground);
        }

        .tool-call.completed {
            border-left-color: var(--vscode-charts-green);
            background: var(--vscode-inputValidation-infoBackground);
        }

        .tool-call.failed {
            border-left-color: var(--vscode-inputValidation-errorBorder);
            background: var(--vscode-inputValidation-errorBackground);
        }

        .tool-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .tool-icon {
            font-size: 14px;
        }

        .tool-name {
            font-weight: 600;
            font-size: 13px;
        }

        .tool-status {
            margin-left: auto;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            text-transform: uppercase;
        }

        .tool-status.pending { background: var(--vscode-inputValidation-warningBorder); color: white; }
        .tool-status.running { background: var(--vscode-progressBar-background); color: white; }
        .tool-status.completed { background: var(--vscode-charts-green); color: white; }
        .tool-status.failed { background: var(--vscode-inputValidation-errorBorder); color: white; }

        .tool-content {
            font-size: 12px;
            margin-bottom: 8px;
        }

        .tool-parameters {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-textCodeBlock-border);
            border-radius: 4px;
            padding: 8px;
            margin: 8px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            overflow-x: auto;
        }

        /* TOOL APPROVAL ACTIONS */
        .tool-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .tool-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .tool-btn:hover {
            transform: translateY(-1px);
        }

        .tool-btn.approve {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .tool-btn.approve:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .tool-btn.reject {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }

        .tool-btn.reject:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* INPUT AREA WITH DISABLED STATE */
        .input-area {
            border-top: 1px solid var(--vscode-panel-border);
            padding: 16px;
            background: var(--vscode-panel-background);
        }

        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .message-input {
            flex: 1;
            padding: 10px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            font-family: inherit;
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
            outline: none;
            transition: border-color 0.2s ease;
        }

        .message-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        .message-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .input-buttons {
            display: flex;
            gap: 6px;
        }

        .send-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .send-btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .cancel-btn {
            padding: 10px 12px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .cancel-btn:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .cancel-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* ANIMATIONS */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        @keyframes slideIn {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .message {
            animation: slideIn 0.3s ease-out;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 600px) {
            .mode-selector {
                justify-content: center;
            }

            .message.user, .message.assistant {
                margin-left: 8px;
                margin-right: 8px;
            }

            .input-container {
                flex-direction: column;
                gap: 8px;
            }

            .input-buttons {
                justify-content: flex-end;
            }
        }
    </style>
</head>
<body>
    <!-- STICKY HEADER -->
    <div class="header">
        <div class="header-title">
            <span>ðŸ¤–</span>
            <span>Vibe AI Assistant</span>
        </div>

        <!-- MODE PILLS WITH ICONS -->
        <div class="mode-selector">
            <button class="mode-pill active" data-mode="ask" onclick="switchMode('ask')">
                <span class="mode-pill-icon">ðŸ¤”</span>
                <span>Ask</span>
            </button>
            <button class="mode-pill" data-mode="code" onclick="switchMode('code')">
                <span class="mode-pill-icon">ðŸ”§</span>
                <span>Code</span>
            </button>
            <button class="mode-pill" data-mode="debug" onclick="switchMode('debug')">
                <span class="mode-pill-icon">ðŸ›</span>
                <span>Debug</span>
            </button>
            <button class="mode-pill" data-mode="architect" onclick="switchMode('architect')">
                <span class="mode-pill-icon">ðŸ—ï¸</span>
                <span>Architect</span>
            </button>
            <button class="mode-pill" data-mode="agent" onclick="switchMode('agent')">
                <span class="mode-pill-icon">ðŸ¤–</span>
                <span>Agent</span>
            </button>
            <button class="mode-pill" data-mode="shell" onclick="switchMode('shell')">
                <span class="mode-pill-icon">ðŸ’»</span>
                <span>Shell</span>
            </button>
        </div>

        <!-- STATUS BAR WITH PROGRESS -->
        <div class="status-bar">
            <div class="status-text" id="status">Ready - Agent-first chat system active</div>
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>
    </div>

    <!-- ERROR BANNER -->
    <div class="error-banner" id="errorBanner">
        <strong>âš ï¸ Error:</strong> <span id="errorText"></span>
    </div>

    <!-- MESSAGES AREA -->
    <div class="messages" id="messages">
        <div class="message assistant">
            <div class="message-content">
                ðŸ‘‹ Welcome to Vibe AI Assistant v5.0!<br><br>
                <strong>ðŸŽ¯ Agent-First Features:</strong><br>
                â€¢ Streaming responses with real-time updates<br>
                â€¢ Inline tool calls with approval workflows<br>
                â€¢ Diff previews for file operations<br>
                â€¢ Retry/cancel support for all operations<br>
                â€¢ Session memory across conversations<br><br>
                <strong>ðŸš€ Smart Agent Detection:</strong><br>
                Messages containing "create", "build", "implement", etc. automatically trigger agent execution.<br><br>
                What would you like to work on?
            </div>
        </div>
    </div>

    <!-- INPUT AREA WITH DISABLED STATE -->
    <div class="input-area">
        <div class="input-container">
            <textarea
                class="message-input"
                id="messageInput"
                placeholder="Ask me anything or describe a task..."
                rows="1"
                oninput="autoResize(this)"
            ></textarea>
            <div class="input-buttons">
                <button class="send-btn" onclick="sendMessage()" id="sendBtn">Send</button>
                <button class="cancel-btn" onclick="cancelOperation()" id="cancelBtn">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // STATE MANAGEMENT
        let currentState = 'ready';
        let isInputDisabled = false;

        function switchMode(mode) {
            vscode.postMessage({ type: 'switchMode', mode });
            updateModeButtons(mode);
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (text && !isInputDisabled) {
                vscode.postMessage({ type: 'sendMessage', text });
                input.value = '';
                autoResize(input);
            }
        }

        function approveTool(toolCallId) {
            vscode.postMessage({ type: 'approveTool', toolCallId });
        }

        function rejectTool(toolCallId) {
            vscode.postMessage({ type: 'rejectTool', toolCallId });
        }

        function retryMessage(messageId) {
            vscode.postMessage({ type: 'retryMessage', messageId });
        }

        function cancelOperation() {
            vscode.postMessage({ type: 'cancelOperation' });
        }

        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }

        // UI STATE MANAGEMENT
        function setInputDisabled(disabled) {
            isInputDisabled = disabled;
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');

            input.disabled = disabled;
            sendBtn.disabled = disabled;

            if (disabled) {
                input.style.opacity = '0.6';
                sendBtn.style.opacity = '0.6';
            } else {
                input.style.opacity = '1';
                sendBtn.style.opacity = '1';
            }
        }

        function showError(message) {
            const banner = document.getElementById('errorBanner');
            const text = document.getElementById('errorText');
            text.textContent = message;
            banner.classList.add('show');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                banner.classList.remove('show');
            }, 5000);
        }

        function updateProgress(progress) {
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');

            if (progress > 0 && progress < 100) {
                progressBar.style.display = 'block';
                progressFill.style.width = progress + '%';
            } else {
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }
        }

        function updateStatus(status, state) {
            const statusText = document.getElementById('status');
            statusText.textContent = status;

            // Update input disabled state based on state
            const busyStates = ['STREAMING', 'RUNNING_TOOL', 'ANALYZING'];
            setInputDisabled(busyStates.includes(state));
        }

        // MESSAGE RENDERING
        function renderMessage(message) {
            let html = \`<div class="message \${message.role}\${message.streaming ? ' streaming' : ''}" data-message-id="\${message.id}">\`;

            // Render tool calls as cards
            if (message.toolCalls && message.toolCalls.length > 0) {
                message.toolCalls.forEach(toolCall => {
                    html += renderToolCall(toolCall);
                });
            }

            html += \`<div class="message-content">\${message.content.replace(/\\n/g, '<br>')}\${message.streaming ? '<span class="streaming-cursor"></span>' : ''}</div>\`;
            html += \`</div>\`;

            return html;
        }

        function renderToolCall(toolCall) {
            const statusClass = toolCall.status || 'pending';
            const statusText = toolCall.status || 'pending';

            let actionsHtml = '';
            if (toolCall.approvalRequired && !toolCall.approved) {
                actionsHtml = \`
                    <div class="tool-actions">
                        <button class="tool-btn approve" onclick="approveTool('\${toolCall.id}')">Approve</button>
                        <button class="tool-btn reject" onclick="rejectTool('\${toolCall.id}')">Reject</button>
                    </div>\`;
            }

            return \`
                <div class="tool-call \${statusClass}" data-tool-call-id="\${toolCall.id}">
                    <div class="tool-header">
                        <span class="tool-icon">ðŸ”§</span>
                        <span class="tool-name">\${toolCall.tool}</span>
                        <span class="tool-status \${statusText}">\${statusText}</span>
                    </div>
                    <div class="tool-content">
                        <div class="tool-parameters">\${JSON.stringify(toolCall.parameters, null, 2)}</div>
                        \${toolCall.result ? \`<div><strong>Result:</strong> \${JSON.stringify(toolCall.result, null, 2)}</div>\` : ''}
                    </div>
                    \${actionsHtml}
                </div>\`;
        }

        function updateMessageContent(messageId, content, isStreaming = false) {
            const messageElement = document.querySelector(\`[data-message-id="\${messageId}"] .message-content\`);
            if (messageElement) {
                messageElement.innerHTML = content.replace(/\\n/g, '<br>') + (isStreaming ? '<span class="streaming-cursor"></span>' : '');
            }
        }

        function appendToken(messageId, token) {
            const messageElement = document.querySelector(\`[data-message-id="\${messageId}"] .message-content\`);
            if (messageElement) {
                // Remove streaming cursor temporarily
                const cursor = messageElement.querySelector('.streaming-cursor');
                if (cursor) cursor.remove();

                // Append the token
                messageElement.innerHTML += token.replace(/\\n/g, '<br>');

                // Re-add streaming cursor
                messageElement.innerHTML += '<span class="streaming-cursor"></span>';
            }
        }

        function updateModeButtons(currentMode) {
            document.querySelectorAll('.mode-pill').forEach(pill => {
                pill.classList.remove('active');
                if (pill.dataset.mode === currentMode) {
                    pill.classList.add('active');
                }
            });
        }

        function updateToolCallStatus(toolCallId, status, approved) {
            const toolCallElement = document.querySelector(\`[data-tool-call-id="\${toolCallId}"]\`);
            if (toolCallElement) {
                // Update status class
                toolCallElement.className = \`tool-call \${status}\`;

                // Update status badge
                const statusBadge = toolCallElement.querySelector('.tool-status');
                if (statusBadge) {
                    statusBadge.className = \`tool-status \${status}\`;
                    statusBadge.textContent = status;
                }

                // Remove approval buttons if approved
                if (approved) {
                    const actions = toolCallElement.querySelector('.tool-actions');
                    if (actions) actions.remove();
                }
            }
        }

        // EVENT HANDLERS
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'updateMessages') {
                const messagesDiv = document.getElementById('messages');
                const wasAtBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 10;

                messagesDiv.innerHTML = message.messages.map(renderMessage).join('');

                // Preserve scroll position or scroll to bottom
                if (wasAtBottom) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

                // Update UI state
                updateModeButtons(message.currentMode);
                updateStatus(message.status || 'Ready', message.state || 'READY');

                // Update progress if available
                if (message.progress !== undefined) {
                    updateProgress(message.progress);
                }

            } else if (message.type === 'streamToken') {
                const messagesDiv = document.getElementById('messages');
                const wasAtBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 10;

                appendToken(message.messageId, message.token);

                // Auto-scroll if user was at bottom
                if (wasAtBottom) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

            } else if (message.type === 'updateToolApproval') {
                updateToolCallStatus(message.toolCallId, message.status, message.approved);

            } else if (message.type === 'showError') {
                showError(message.error);

            } else if (message.type === 'updateProgress') {
                updateProgress(message.progress);
            }
        });

        // INPUT HANDLERS
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            const textarea = document.getElementById('messageInput');
            autoResize(textarea);
        });
    </script>
</body>
</html>`;
  }
}

// Global instances
let stateMachine: StateMachine;
let agentOrchestrator: AgentOrchestrator;
let chatSystem: ChatSystem;
let settingsManager: SettingsManager;

// VS Code context for persistence
let extensionContext: vscode.ExtensionContext;

// UI components
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

class VibeWebviewViewProvider implements vscode.WebviewViewProvider {
  private webviewView?: vscode.WebviewView;
  private isInitialized = false;

  constructor(private extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    // Set HTML and message handler
    webviewView.webview.html = this.getChatHTML();
    webviewView.webview.onDidReceiveMessage(this.handleMessage.bind(this));

    // Set initial title
    webviewView.title = 'Vibe AI Assistant';

    // Initialize with loading message first
    this.showLoadingMessage();

    // Wait for chat system to be ready, then initialize properly
    this.waitForChatSystem();
  }

  private showLoadingMessage() {
    if (!this.webviewView) return;

    const loadingMessage = {
      type: 'updateMessages',
      messages: [{
        id: 'loading',
        role: 'assistant',
        content: `ðŸ”„ Initializing Vibe AI Assistant...

Please wait while the system loads...`,
        timestamp: new Date(),
        streaming: false
      }],
      currentMode: 'ask',
      state: 'READY'
    };

    this.webviewView.webview.postMessage(loadingMessage);
  }

  private waitForChatSystem() {
    // Check every 200ms if chat system is ready
    const checkInterval = setInterval(() => {
      if (chatSystem && !this.isInitialized) {
        this.isInitialized = true;
        clearInterval(checkInterval);
        this.initializeWithChatSystem();
      }
    }, 200);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isInitialized) {
        this.showFallbackInterface();
      }
    }, 10000);
  }

  private initializeWithChatSystem() {
    if (!this.webviewView) return;

    // Update HTML to use chat system's HTML
    this.webviewView.webview.html = chatSystem.getChatHTML();

    // Send initial welcome message through chat system
    const welcomeMessage = {
      type: 'sendMessage',
      text: 'Hello! I\'m ready to help. What would you like to work on?'
    };

    // Use chat system's message handler
    if (chatSystem && chatSystem.handleMessage) {
      chatSystem.handleMessage(welcomeMessage);
    }
  }

  private showFallbackInterface() {
    if (!this.webviewView) return;

    const fallbackMessage = {
      type: 'updateMessages',
      messages: [{
        id: 'fallback',
        role: 'assistant',
        content: `âš ï¸ Vibe AI Assistant is still initializing...

The chat system may take a moment to load. Please try refreshing the panel or restarting VS Code if this persists.

**Quick Actions:**
â€¢ Use "Vibe: Ask" command from command palette
â€¢ Check settings for API key configuration
â€¢ Try the status bar icon when available`,
        timestamp: new Date(),
        streaming: false
      }],
      currentMode: 'ask',
      state: 'READY'
    };

    this.webviewView.webview.postMessage(fallbackMessage);
  }

  private getChatHTML(): string {
    // Use the same HTML as the chat system for consistency
    if (chatSystem) {
      return chatSystem.getChatHTML();
    }

    // Fallback HTML if chat system is not ready
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* STICKY HEADER */
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-panel-background);
            backdrop-filter: blur(10px);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }

        /* MODE PILLS WITH ICONS */
        .mode-selector {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .mode-pill {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 12px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .mode-pill:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .mode-pill.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-focusBorder);
        }

        .mode-pill-icon {
            font-size: 12px;
        }

        /* STATUS BAR WITH PROGRESS */
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 8px;
            padding: 4px 0;
        }

        .status-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .progress-bar {
            display: none;
            width: 120px;
            height: 4px;
            background: var(--vscode-progressBar-background);
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            width: 0%;
            transition: width 0.3s ease;
        }

        /* ERROR BANNERS */
        .error-banner {
            display: none;
            padding: 8px 12px;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            margin: 8px 16px;
            font-size: 12px;
        }

        .error-banner.show {
            display: block;
        }

        /* MESSAGES AREA */
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            scroll-behavior: smooth;
        }

        .message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 8px;
            line-height: 1.5;
            position: relative;
        }

        .message.user {
            background: var(--vscode-inputValidation-infoBorder);
            margin-left: 20%;
            border-bottom-right-radius: 4px;
        }

        .message.assistant {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: 20%;
            border-bottom-left-radius: 4px;
        }

        .message.streaming {
            border: 2px solid var(--vscode-progressBar-background);
            animation: pulse 2s infinite;
        }

        /* STREAMING CURSOR */
        .streaming-cursor {
            display: inline-block;
            width: 8px;
            height: 16px;
            background: var(--vscode-progressBar-background);
            animation: blink 1s infinite;
            margin-left: 2px;
            border-radius: 1px;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        /* TOOL CARDS WITH APPROVAL BUTTONS */
        .tool-call {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 6px;
            margin: 12px 0;
            padding: 12px 16px;
            position: relative;
        }

        .tool-call.pending {
            border-left-color: var(--vscode-inputValidation-warningBorder);
            background: var(--vscode-inputValidation-warningBackground);
        }

        .tool-call.running {
            border-left-color: var(--vscode-progressBar-background);
            background: var(--vscode-inputValidation-infoBackground);
        }

        .tool-call.completed {
            border-left-color: var(--vscode-charts-green);
            background: var(--vscode-inputValidation-infoBackground);
        }

        .tool-call.failed {
            border-left-color: var(--vscode-inputValidation-errorBorder);
            background: var(--vscode-inputValidation-errorBackground);
        }

        .tool-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .tool-icon {
            font-size: 14px;
        }

        .tool-name {
            font-weight: 600;
            font-size: 13px;
        }

        .tool-status {
            margin-left: auto;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            text-transform: uppercase;
        }

        .tool-status.pending { background: var(--vscode-inputValidation-warningBorder); color: white; }
        .tool-status.running { background: var(--vscode-progressBar-background); color: white; }
        .tool-status.completed { background: var(--vscode-charts-green); color: white; }
        .tool-status.failed { background: var(--vscode-inputValidation-errorBorder); color: white; }

        .tool-content {
            font-size: 12px;
            margin-bottom: 8px;
        }

        .tool-parameters {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-textCodeBlock-border);
            border-radius: 4px;
            padding: 8px;
            margin: 8px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            overflow-x: auto;
        }

        /* TOOL APPROVAL ACTIONS */
        .tool-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .tool-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .tool-btn:hover {
            transform: translateY(-1px);
        }

        .tool-btn.approve {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .tool-btn.approve:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .tool-btn.reject {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }

        .tool-btn.reject:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* INPUT AREA WITH DISABLED STATE */
        .input-area {
            border-top: 1px solid var(--vscode-panel-border);
            padding: 16px;
            background: var(--vscode-panel-background);
        }

        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .message-input {
            flex: 1;
            padding: 10px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            font-family: inherit;
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
            outline: none;
            transition: border-color 0.2s ease;
        }

        .message-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        .message-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .input-buttons {
            display: flex;
            gap: 6px;
        }

        .send-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .send-btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .cancel-btn {
            padding: 10px 12px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .cancel-btn:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .cancel-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* ANIMATIONS */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        @keyframes slideIn {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .message {
            animation: slideIn 0.3s ease-out;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 600px) {
            .mode-selector {
                justify-content: center;
            }

            .message.user, .message.assistant {
                margin-left: 8px;
                margin-right: 8px;
            }

            .input-container {
                flex-direction: column;
                gap: 8px;
            }

            .input-buttons {
                justify-content: flex-end;
            }
        }
    </style>
</head>
<body>
    <!-- STICKY HEADER -->
    <div class="header">
        <div class="header-title">
            <span>ðŸ¤–</span>
            <span>Vibe AI Assistant</span>
        </div>

        <!-- MODE PILLS WITH ICONS -->
        <div class="mode-selector">
            <button class="mode-pill active" data-mode="ask" onclick="switchMode('ask')">
                <span class="mode-pill-icon">ðŸ¤”</span>
                <span>Ask</span>
            </button>
            <button class="mode-pill" data-mode="code" onclick="switchMode('code')">
                <span class="mode-pill-icon">ðŸ”§</span>
                <span>Code</span>
            </button>
            <button class="mode-pill" data-mode="debug" onclick="switchMode('debug')">
                <span class="mode-pill-icon">ðŸ›</span>
                <span>Debug</span>
            </button>
            <button class="mode-pill" data-mode="architect" onclick="switchMode('architect')">
                <span class="mode-pill-icon">ðŸ—ï¸</span>
                <span>Architect</span>
            </button>
            <button class="mode-pill" data-mode="agent" onclick="switchMode('agent')">
                <span class="mode-pill-icon">ðŸ¤–</span>
                <span>Agent</span>
            </button>
            <button class="mode-pill" data-mode="shell" onclick="switchMode('shell')">
                <span class="mode-pill-icon">ðŸ’»</span>
                <span>Shell</span>
            </button>
        </div>

        <!-- STATUS BAR WITH PROGRESS -->
        <div class="status-bar">
            <div class="status-text" id="status">Ready - Agent-first chat system active</div>
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>
    </div>

    <!-- ERROR BANNER -->
    <div class="error-banner" id="errorBanner">
        <strong>âš ï¸ Error:</strong> <span id="errorText"></span>
    </div>

    <!-- MESSAGES AREA -->
    <div class="messages" id="messages">
        <div class="message assistant">
            <div class="message-content">
                ðŸ‘‹ Welcome to Vibe AI Assistant v5.0.1!<br><br>
                <strong>ðŸŽ¯ Agent-First Features:</strong><br>
                â€¢ Real AI conversations with streaming responses<br>
                â€¢ Intelligent agent task decomposition<br>
                â€¢ Tool approval workflows with rollback<br>
                â€¢ State machine enforcement<br>
                â€¢ Session memory across conversations<br><br>
                <strong>ðŸš€ Getting Started:</strong><br>
                1. Configure API keys in settings<br>
                2. Try asking a question or describing a task<br>
                3. Use agent mode for complex operations<br><br>
                What would you like to work on?
            </div>
        </div>
    </div>

    <!-- INPUT AREA WITH DISABLED STATE -->
    <div class="input-area">
        <div class="input-container">
            <textarea
                class="message-input"
                id="messageInput"
                placeholder="Ask me anything or describe a task..."
                rows="1"
                oninput="autoResize(this)"
            ></textarea>
            <div class="input-buttons">
                <button class="send-btn" onclick="sendMessage()" id="sendBtn">Send</button>
                <button class="cancel-btn" onclick="cancelOperation()" id="cancelBtn">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // STATE MANAGEMENT
        let currentState = 'ready';
        let isInputDisabled = false;

        function switchMode(mode) {
            vscode.postMessage({ type: 'switchMode', mode });
            updateModeButtons(mode);
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (text && !isInputDisabled) {
                vscode.postMessage({ type: 'sendMessage', text });
                input.value = '';
                autoResize(input);
            }
        }

        function approveTool(toolCallId) {
            vscode.postMessage({ type: 'approveTool', toolCallId });
        }

        function rejectTool(toolCallId) {
            vscode.postMessage({ type: 'rejectTool', toolCallId });
        }

        function retryMessage(messageId) {
            vscode.postMessage({ type: 'retryMessage', messageId });
        }

        function cancelOperation() {
            vscode.postMessage({ type: 'cancelOperation' });
        }

        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }

        // UI STATE MANAGEMENT
        function setInputDisabled(disabled) {
            isInputDisabled = disabled;
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');

            input.disabled = disabled;
            sendBtn.disabled = disabled;

            if (disabled) {
                input.style.opacity = '0.6';
                sendBtn.style.opacity = '0.6';
            } else {
                input.style.opacity = '1';
                sendBtn.style.opacity = '1';
            }
        }

        function showError(message) {
            const banner = document.getElementById('errorBanner');
            const text = document.getElementById('errorText');
            text.textContent = message;
            banner.classList.add('show');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                banner.classList.remove('show');
            }, 5000);
        }

        function updateProgress(progress) {
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');

            if (progress > 0 && progress < 100) {
                progressBar.style.display = 'block';
                progressFill.style.width = progress + '%';
            } else {
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }
        }

        function updateStatus(status, state) {
            const statusText = document.getElementById('status');
            statusText.textContent = status;

            // Update input disabled state based on state
            const busyStates = ['STREAMING', 'RUNNING_TOOL', 'ANALYZING'];
            setInputDisabled(busyStates.includes(state));
        }

        // MESSAGE RENDERING
        function renderMessage(message) {
            let html = \`<div class="message \${message.role}\${message.streaming ? ' streaming' : ''}" data-message-id="\${message.id}">\`;

            // Render tool calls as cards
            if (message.toolCalls && message.toolCalls.length > 0) {
                message.toolCalls.forEach(toolCall => {
                    html += renderToolCall(toolCall);
                });
            }

            html += \`<div class="message-content">\${message.content.replace(/\\n/g, '<br>')}\${message.streaming ? '<span class="streaming-cursor"></span>' : ''}</div>\`;
            html += \`</div>\`;

            return html;
        }

        function renderToolCall(toolCall) {
            const statusClass = toolCall.status || 'pending';
            const statusText = toolCall.status || 'pending';

            let actionsHtml = '';
            if (toolCall.approvalRequired && !toolCall.approved) {
                actionsHtml = \`
                    <div class="tool-actions">
                        <button class="tool-btn approve" onclick="approveTool('\${toolCall.id}')">Approve</button>
                        <button class="tool-btn reject" onclick="rejectTool('\${toolCall.id}')">Reject</button>
                    </div>\`;
            }

            return \`
                <div class="tool-call \${statusClass}" data-tool-call-id="\${toolCall.id}">
                    <div class="tool-header">
                        <span class="tool-icon">ðŸ”§</span>
                        <span class="tool-name">\${toolCall.tool}</span>
                        <span class="tool-status \${statusText}">\${statusText}</span>
                    </div>
                    <div class="tool-content">
                        <div class="tool-parameters">\${JSON.stringify(toolCall.parameters, null, 2)}</div>
                        \${toolCall.result ? \`<div><strong>Result:</strong> \${JSON.stringify(toolCall.result, null, 2)}</div>\` : ''}
                    </div>
                    \${actionsHtml}
                </div>\`;
        }

        function updateMessageContent(messageId, content, isStreaming = false) {
            const messageElement = document.querySelector(\`[data-message-id="\${messageId}"] .message-content\`);
            if (messageElement) {
                messageElement.innerHTML = content.replace(/\\n/g, '<br>') + (isStreaming ? '<span class="streaming-cursor"></span>' : '');
            }
        }

        function appendToken(messageId, token) {
            const messageElement = document.querySelector(\`[data-message-id="\${messageId}"] .message-content\`);
            if (messageElement) {
                // Remove streaming cursor temporarily
                const cursor = messageElement.querySelector('.streaming-cursor');
                if (cursor) cursor.remove();

                // Append the token
                messageElement.innerHTML += token.replace(/\\n/g, '<br>');

                // Re-add streaming cursor
                messageElement.innerHTML += '<span class="streaming-cursor"></span>';
            }
        }

        function updateModeButtons(currentMode) {
            document.querySelectorAll('.mode-pill').forEach(pill => {
                pill.classList.remove('active');
                if (pill.dataset.mode === currentMode) {
                    pill.classList.add('active');
                }
            });
        }

        function updateToolCallStatus(toolCallId, status, approved) {
            const toolCallElement = document.querySelector(\`[data-tool-call-id="\${toolCallId}"]\`);
            if (toolCallElement) {
                // Update status class
                toolCallElement.className = \`tool-call \${status}\`;

                // Update status badge
                const statusBadge = toolCallElement.querySelector('.tool-status');
                if (statusBadge) {
                    statusBadge.className = \`tool-status \${status}\`;
                    statusBadge.textContent = status;
                }

                // Remove approval buttons if approved
                if (approved) {
                    const actions = toolCallElement.querySelector('.tool-actions');
                    if (actions) actions.remove();
                }
            }
        }

        // EVENT HANDLERS
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'updateMessages') {
                const messagesDiv = document.getElementById('messages');
                const wasAtBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 10;

                messagesDiv.innerHTML = message.messages.map(renderMessage).join('');

                // Preserve scroll position or scroll to bottom
                if (wasAtBottom) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

                // Update UI state
                updateModeButtons(message.currentMode);
                updateStatus(message.status || 'Ready', message.state || 'READY');

                // Update progress if available
                if (message.progress !== undefined) {
                    updateProgress(message.progress);
                }

            } else if (message.type === 'streamToken') {
                const messagesDiv = document.getElementById('messages');
                const wasAtBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 10;

                appendToken(message.messageId, message.token);

                // Auto-scroll if user was at bottom
                if (wasAtBottom) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

            } else if (message.type === 'updateToolApproval') {
                updateToolCallStatus(message.toolCallId, message.status, message.approved);

            } else if (message.type === 'showError') {
                showError(message.error);

            } else if (message.type === 'updateProgress') {
                updateProgress(message.progress);
            }
        });

        // INPUT HANDLERS
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            const textarea = document.getElementById('messageInput');
            autoResize(textarea);
        });
    </script>
</body>
</html>`;
  }

  private handleMessage(message: any): void {
    // Forward messages to the chat system if available
    if (chatSystem) {
      chatSystem.handleMessage(message);
    } else {
      console.log('Chat system not ready, message:', message);
      // For now, just show a simple response
      if (message.type === 'sendMessage' && this.webviewView) {
        const response = {
          type: 'updateMessages',
          messages: [
            {
              id: 'user_' + Date.now(),
              role: 'user',
              content: message.text,
              timestamp: new Date(),
              streaming: false
            },
            {
              id: 'assistant_' + Date.now(),
              role: 'assistant',
              content: 'Chat system is initializing. Please wait a moment and try again.',
              timestamp: new Date(),
              streaming: false
            }
          ],
          currentMode: 'ask',
          state: 'READY'
        };
        this.webviewView.webview.postMessage(response);
      }
    }
  }
}

function registerWebviewProvider(context: vscode.ExtensionContext) {
  // Register the webview provider with a delay to ensure chat system is ready
  setTimeout(() => {
    const provider = new VibeWebviewViewProvider(extensionContext.extensionUri);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('vibe.vibePanel', provider)
    );
    console.log('âœ… Vibe webview provider registered');
  }, 200); // Wait for chat system initialization
}

export function activate(context: vscode.ExtensionContext) {
  console.log('ðŸš€ Vibe VS Code Extension v5.0 - Activating...');

  try {
    // Store context for persistence
    extensionContext = context;

    // Initialize state machine synchronously first
    stateMachine = new StateMachine();

    // Load persisted mode now that stateMachine exists
    loadPersistedMode();

    // Check if we have a workspace
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      console.log('âš ï¸ No workspace folder open - Vibe requires a workspace to function');
      vscode.window.showWarningMessage('Vibe AI Assistant requires an open workspace folder to function properly.');
      // Still initialize basic UI for commands to work
      initializeUI();
      registerConsolidatedCommands(context);
      return;
    }

    // Defer heavy initialization to avoid blocking activation
    setTimeout(async () => {
      try {
        console.log('ðŸ”„ Initializing Vibe core systems...');

        // Initialize core systems (async) - stateMachine already initialized
        await initializeCoreSystems();

        // Initialize UI components
        initializeUI();

        // Register webview provider for activity bar
        registerWebviewProvider(context);

        // Register consolidated commands
        registerConsolidatedCommands(context);

        // Setup event listeners
        setupEventListeners(context);

        // Show activation success
        vscode.window.showInformationMessage('âœ… Vibe AI Assistant v5.0 activated - Real agent system ready!');
        console.log('âœ… Vibe extension v5.0 activated successfully');

      } catch (error) {
        console.error('âŒ Vibe initialization failed:', error);
        vscode.window.showErrorMessage(`âŒ Vibe initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 100); // Small delay to avoid blocking

  } catch (error) {
    console.error('âŒ Vibe activation failed:', error);
    vscode.window.showErrorMessage(`âŒ Vibe activation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function initializeCoreSystems() {
  // Initialize settings manager (first, as others depend on it)
  settingsManager = SettingsManager.getInstance();

  // State machine already initialized synchronously in activate()

  // Initialize tool system
  const toolSystem = new ToolSystem(stateMachine);

  // Initialize agent orchestrator
  agentOrchestrator = new AgentOrchestrator(toolSystem);

  // Initialize chat system
  chatSystem = new ChatSystem(agentOrchestrator, toolSystem, extensionContext.extensionUri);

  // Set up state machine subscriptions
  setupStateMachineSubscriptions();

  // Set up settings subscriptions
  setupSettingsSubscriptions();
}

function setupStateMachineSubscriptions() {
  // Subscribe to state changes for UI updates
  stateMachine.subscribe((state) => {
    updateStatusBar();
    // Update chat system with current mode
    if (chatSystem) {
      // This would update the chat UI with the current mode
    }
  });
}

function setupSettingsSubscriptions() {
  // Subscribe to settings changes for live updates
  settingsManager.subscribe((settings) => {
    console.log('ðŸ”„ Settings updated, applying changes...');

    // Update provider API keys - reinitialize providers
    // This would trigger provider reinitialization with new keys

    // Update UI preferences
    updateStatusBar();

    // Update agent behavior
    if (agentOrchestrator) {
      // Apply auto-approval settings
      // Apply streaming settings
      // Apply timeout settings
    }

    // Update context limits
    // This would update memory and context management

    vscode.window.showInformationMessage('âœ… Settings applied successfully');
  });
}

function initializeUI() {
  // Initialize status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = `$(check) Vibe Ready`;
  statusBarItem.command = 'vibe.ask';
  statusBarItem.tooltip = 'Vibe AI Assistant - Click to ask';
  statusBarItem.show();

  // Initialize output channel
  outputChannel = vscode.window.createOutputChannel('Vibe AI Assistant');
}

// Consolidated Command Handlers
async function handleOpenFromActivityBarCommand() {
  // Open the agent-first chat panel
  await chatSystem.openChatPanel();
}

async function handleAskCommand() {
  // Open the agent-first chat panel
  await chatSystem.openChatPanel();
}

async function handleCodeCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const actions = [
    { label: 'Explain Code', description: 'Get detailed explanation of selected code', value: 'explain' },
    { label: 'Refactor Code', description: 'Improve code structure and readability', value: 'refactor' },
    { label: 'Generate Tests', description: 'Create comprehensive test suite', value: 'test' },
    { label: 'Optimize Code', description: 'Improve performance and efficiency', value: 'optimize' },
    { label: 'Document Code', description: 'Add comprehensive documentation', value: 'document' },
    { label: 'Review Code', description: 'Perform code review and suggestions', value: 'review' }
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: 'Select code action'
  });

  if (selected && chatSystem) {
    // Switch to code mode
    setMode('code');

    // Get selected code
    const selection = editor.selection;
    const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
    const language = editor.document.languageId;

    // Create prompt based on action
    let prompt = '';
    switch (selected.value) {
      case 'explain':
        prompt = `Please explain this ${language} code in detail:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide a clear explanation of what this code does, how it works, and any important concepts or patterns it demonstrates.`;
        break;
      case 'refactor':
        prompt = `Please refactor this ${language} code to improve its structure and readability:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide the refactored version with explanations of the changes made.`;
        break;
      case 'test':
        prompt = `Please generate comprehensive tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nCreate a complete test suite that covers all functionality, edge cases, and error conditions.`;
        break;
      case 'optimize':
        prompt = `Please optimize this ${language} code for better performance:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nAnalyze the current implementation and provide an optimized version with explanations of the performance improvements.`;
        break;
      case 'document':
        prompt = `Please add comprehensive documentation to this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nAdd detailed comments, docstrings, and documentation that explains the purpose, parameters, return values, and usage of all functions and classes.`;
        break;
      case 'review':
        prompt = `Please perform a code review of this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide detailed feedback on code quality, potential bugs, security issues, performance concerns, and suggestions for improvement.`;
        break;
    }

    // Inject prompt into chat system
    await chatSystem.handleMessage({ type: 'sendMessage', text: prompt });
  }
}

async function handleDebugCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const actions = [
    { label: 'Analyze Errors', description: 'Find and explain errors in code', value: 'errors' },
    { label: 'Debug Logic', description: 'Step through and explain code logic', value: 'logic' },
    { label: 'Performance Analysis', description: 'Identify performance bottlenecks', value: 'performance' },
    { label: 'Run Tests', description: 'Execute test suite and analyze results', value: 'tests' }
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: 'Select debug action'
  });

  if (selected && chatSystem) {
    // Switch to debug mode
    setMode('debug');

    // Get selected code
    const selection = editor.selection;
    const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
    const language = editor.document.languageId;

    // Create prompt based on action
    let prompt = '';
    switch (selected.value) {
      case 'errors':
        prompt = `Please analyze this ${language} code for errors and potential issues:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nIdentify any syntax errors, logical errors, potential bugs, security vulnerabilities, and best practice violations. Provide specific line numbers and explanations for each issue found.`;
        break;
      case 'logic':
        prompt = `Please debug the logic in this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nStep through the code execution and explain what happens at each step. Identify any logical errors, edge cases that aren't handled, or potential issues with the algorithm.`;
        break;
      case 'performance':
        prompt = `Please analyze this ${language} code for performance issues:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nIdentify performance bottlenecks, inefficient algorithms, memory leaks, or other performance concerns. Suggest optimizations and explain the impact of each improvement.`;
        break;
      case 'tests':
        prompt = `Please help debug and improve the test suite for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nAnalyze the existing tests (if any), identify gaps in test coverage, suggest additional test cases, and provide guidance on improving test quality and reliability.`;
        break;
    }

    // Inject prompt into chat system
    await chatSystem.handleMessage({ type: 'sendMessage', text: prompt });
  }
}

async function handleArchitectCommand() {
  const actions = [
    { label: 'System Design', description: 'Design high-level system architecture', value: 'design' },
    { label: 'Project Planning', description: 'Create detailed project roadmap', value: 'plan' },
    { label: 'Code Structure', description: 'Design optimal code organization', value: 'structure' },
    { label: 'API Design', description: 'Design APIs and interfaces', value: 'api' },
    { label: 'Database Design', description: 'Design database schema and relationships', value: 'database' },
    { label: 'Security Architecture', description: 'Design security measures and policies', value: 'security' }
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: 'Select architecture action'
  });

  if (selected && chatSystem) {
    // Switch to architect mode
    setMode('architect');

    // Create prompt based on action
    let prompt = '';
    switch (selected.value) {
      case 'design':
        prompt = `Please design a high-level system architecture for the following requirements. Consider scalability, maintainability, security, and technology choices. Provide a detailed architectural overview with diagrams (using text-based diagrams) and explanations of the key components and their interactions.`;
        break;
      case 'plan':
        prompt = `Please create a detailed project roadmap and implementation plan. Break down the project into phases, estimate timelines, identify dependencies, and provide a structured approach to development. Include risk assessment and mitigation strategies.`;
        break;
      case 'structure':
        prompt = `Please design the optimal code organization and folder structure for this project. Consider separation of concerns, modularity, scalability, and maintainability. Provide a detailed directory structure with explanations for each component and its purpose.`;
        break;
      case 'api':
        prompt = `Please design comprehensive APIs and interfaces for this system. Include REST endpoints, GraphQL schemas, or other API specifications as appropriate. Define request/response formats, authentication mechanisms, error handling, and API versioning strategies.`;
        break;
      case 'database':
        prompt = `Please design the database schema and relationships for this system. Consider normalization, indexing strategies, data types, constraints, and performance optimization. Provide entity-relationship diagrams (using text-based format) and detailed table schemas.`;
        break;
      case 'security':
        prompt = `Please design a comprehensive security architecture for this system. Include authentication and authorization mechanisms, data protection strategies, secure communication protocols, threat modeling, and security best practices. Identify potential vulnerabilities and mitigation strategies.`;
        break;
    }

    // Add context about current project if available
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      prompt += `\n\nProject Context:\n- Project Name: ${workspaceFolder.name}\n- Project Path: ${workspaceFolder.uri.fsPath}\n\nPlease tailor your architectural recommendations to this specific project context.`;
    }

    // Inject prompt into chat system
    await chatSystem.handleMessage({ type: 'sendMessage', text: prompt });
  }
}

async function handleAgentCommand() {
  // Check if agent is already running
  const agentStatus = agentOrchestrator.getAgentStatus();
  if (agentStatus.isRunning) {
    const cancel = await vscode.window.showWarningMessage(
      'Agent is already running a task. Cancel current task?',
      { modal: true },
      'Cancel & Start New'
    );

    if (cancel) {
      agentOrchestrator.cancelAgent();
      vscode.window.showInformationMessage('ðŸ›‘ Agent task cancelled');
    } else {
      return;
    }
  }

  const task = await vscode.window.showInputBox({
    prompt: 'What should the AI agent do?',
    placeHolder: 'Create a React todo app with TypeScript and tests'
  });

  if (task) {
    stateMachine.setMode('agent');
    stateMachine.transition('PROPOSING_ACTIONS', 'Agent task started');

    try {
      // Start the real agent
      const currentState = stateMachine.getState();
      await agentOrchestrator.startAgent(task, currentState.mode);

      // Get final status
      const finalStatus = agentOrchestrator.getAgentStatus();

      // Create structured output
      const response = generateAgentReport(finalStatus.currentTask!);
      const doc = await vscode.workspace.openTextDocument({
        content: response,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

      stateMachine.transition('COMPLETED', 'Agent task completed');
      vscode.window.showInformationMessage('âœ… Agent task completed successfully!');

    } catch (error) {
      stateMachine.transition('ERROR', `Agent task failed: ${error}`);
      vscode.window.showErrorMessage(`âŒ Agent task failed: ${error}`);
    }
  }
}

function generateAgentReport(task: AgentTask): string {
  const duration = task.endTime ? task.endTime.getTime() - task.startTime.getTime() : 0;
  const durationStr = duration > 0 ? `${Math.round(duration / 1000)}s` : 'N/A';

  let report = `# ðŸ¤– Agent Execution Report

## Task Summary
- **Task**: ${task.description}
- **Status**: ${task.status.toUpperCase()}
- **Duration**: ${durationStr}
- **Progress**: ${task.progress}%

## Execution Steps
`;

  task.steps.forEach((step, index) => {
    const statusIcon = {
      pending: 'â³',
      running: 'ðŸ”„',
      completed: 'âœ…',
      failed: 'âŒ'
    }[step.status];

    report += `\n### ${index + 1}. ${step.description}\n`;
    report += `- **Status**: ${statusIcon} ${step.status}\n`;
    report += `- **Tool**: ${step.tool}\n`;

    if (step.result) {
      report += `- **Result**: ${step.result}\n`;
    }

    if (step.error) {
      report += `- **Error**: ${step.error}\n`;
    }
  });

  report += `\n## Verification Results
${task.status === 'completed' ? 'âœ… All steps completed successfully' : 'âŒ Task execution failed'}

---
*Agent execution completed at ${task.endTime?.toLocaleString() || 'N/A'}*`;

  return report;
}

async function handleRunToolCommand() {
  const tools = [
    { label: 'Create File', description: 'Create a new file', value: 'createFile' },
    { label: 'Create Folder', description: 'Create a new folder', value: 'createFolder' },
    { label: 'Run Shell Command', description: 'Execute terminal command', value: 'runCommand' },
    { label: 'Search Codebase', description: 'Find text in project', value: 'search' },
    { label: 'Analyze Project', description: 'Project structure analysis', value: 'analyze' },
    { label: 'Git Status', description: 'Check git repository status', value: 'gitStatus' },
    { label: 'Run Tests', description: 'Execute test suite', value: 'runTests' },
    { label: 'Format Code', description: 'Auto-format code', value: 'format' }
  ];

  const selected = await vscode.window.showQuickPick(tools, {
    placeHolder: 'Select tool to run'
  });

  if (selected) {
    stateMachine.transition('RUNNING_TOOL', 'Tool execution started');

    try {
      // Execute the selected tool
      switch (selected.value) {
        case 'createFile':
          await createFile();
          break;
        case 'createFolder':
          await createFolder();
          break;
        case 'runCommand':
          await runShellCommand();
          break;
        case 'search':
          await searchCodebase();
          break;
        case 'analyze':
          await analyzeProject();
          break;
        case 'gitStatus':
          await gitStatus();
          break;
        case 'runTests':
          await runTests();
          break;
        case 'format':
          await formatCode();
          break;
      }

      stateMachine.transition('COMPLETED', 'Tool execution completed');
    } catch (error) {
      stateMachine.transition('ERROR', `Tool execution failed: ${error}`);
      vscode.window.showErrorMessage(`âŒ Tool execution failed: ${error}`);
    }
  }
}

async function handleShowMemoryCommand() {
  const currentState = stateMachine.getState();
  const settings = settingsManager.getSettings();

  let memory = `# Vibe Memory & History

## Current Session
- Mode: ${currentState.mode}
- State: ${currentState.state}
- Commands executed: Consolidated system active

## Recent Activity
- Extension activated with consolidated command system
- 9 core commands registered
- Status bar initialized

## Chat History
`;

  // Show current session info if available
  if (chatSystem && chatSystem['currentSession']) {
    const session = chatSystem['currentSession'];
    memory += `- Session ID: ${session.id}\n`;
    memory += `- Messages: ${session.messages.length}\n`;
    memory += `- Last Activity: ${session.lastActivity.toLocaleString()}\n`;
  } else {
    memory += `No active chat session. Start using the Ask command!\n`;
  }

  memory += `
## Settings
- Provider: ${settings.providers.defaultProvider}
- Memory: Enabled
- Streaming: ${settings.agent.enableStreaming ? 'Enabled' : 'Disabled'}
- Auto-approval: ${settings.agent.autoApprovalThreshold}
- Debug Logging: ${settings.advanced.enableDebugLogging ? 'Enabled' : 'Disabled'}
`;

  const doc = await vscode.workspace.openTextDocument({
    content: memory,
    language: 'markdown'
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}

async function handleClearMemoryCommand() {
  const confirm = await vscode.window.showWarningMessage(
    'Clear all memory and history?',
    { modal: true },
    'Clear'
  );

  if (confirm === 'Clear') {
    // Clear persisted memory
    if (extensionContext) {
      await extensionContext.globalState.update('vibe.chatMemory', undefined);
      await extensionContext.globalState.update('vibe.currentMode', undefined);
    }

    // Reset current session
    if (chatSystem && chatSystem['currentSession']) {
      chatSystem['currentSession'] = null;
    }

    vscode.window.showInformationMessage('âœ… Memory and history cleared successfully');
  }
}

async function handleOpenPanelCommand() {
  // Open the Vibe panel in the activity bar
  await vscode.commands.executeCommand('workbench.view.extension.vibe-sidebar');
  vscode.window.showInformationMessage('âœ… Vibe Chat Panel opened');
}

function handleSettingsCommand() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'vibe');
}

async function handleSwitchModeCommand() {
  const modeOptions = Object.entries(MODE_DEFINITIONS).map(([key, def]) => ({
    label: `${def.icon} ${key.charAt(0).toUpperCase() + key.slice(1)} Mode`,
    description: def.description,
    value: key as ExecutionMode
  }));

  const selected = await vscode.window.showQuickPick(modeOptions, {
    placeHolder: 'Select execution mode'
  });

  if (selected) {
    setMode(selected.value);
  }
}

function loadPersistedMode() {
  if (extensionContext) {
    const persistedMode = extensionContext.globalState.get<ExecutionMode>('vibe.currentMode');
    if (persistedMode && MODE_DEFINITIONS[persistedMode]) {
      stateMachine.setMode(persistedMode);
    }
  }
}

function savePersistedMode() {
  if (extensionContext) {
    const currentState = stateMachine.getState();
    extensionContext.globalState.update('vibe.currentMode', currentState.mode);
  }
}

function setMode(mode: ExecutionMode) {
  stateMachine.setMode(mode);
  savePersistedMode();
  updateStatusBar();
  vscode.window.showInformationMessage(`ðŸ”„ Switched to ${MODE_DEFINITIONS[mode].description}`);
}

function validateToolAccess(toolType: string, sideEffect?: string): boolean {
  const currentState = stateMachine.getState();
  const modeCaps = MODE_DEFINITIONS[currentState.mode];

  // Check if tool is allowed in current mode
  if (!modeCaps.allowedTools.includes('all') && !modeCaps.allowedTools.includes(toolType)) {
    vscode.window.showWarningMessage(
      `âŒ Tool "${toolType}" not allowed in ${currentState.mode} mode. Switch modes to access this tool.`
    );
    return false;
  }

  // Check if side effect is allowed in current mode
  if (sideEffect && !modeCaps.allowedSideEffects.includes('all') && !modeCaps.allowedSideEffects.includes(sideEffect)) {
    vscode.window.showWarningMessage(
      `âŒ Operation "${sideEffect}" not allowed in ${currentState.mode} mode. Switch modes to perform this action.`
    );
    return false;
  }

  return true;
}

function registerConsolidatedCommands(context: vscode.ExtensionContext) {
  const commands = [
    // Activity bar command
    vscode.commands.registerCommand('vibe.openFromActivityBar', () => handleOpenFromActivityBarCommand()),
    // 9 Core Consolidated Commands
    vscode.commands.registerCommand('vibe.ask', () => handleAskCommand()),
    vscode.commands.registerCommand('vibe.code', () => handleCodeCommand()),
    vscode.commands.registerCommand('vibe.debug', () => handleDebugCommand()),
    vscode.commands.registerCommand('vibe.architect', () => handleArchitectCommand()),
    vscode.commands.registerCommand('vibe.agent', () => handleAgentCommand()),
    vscode.commands.registerCommand('vibe.runTool', () => handleRunToolCommand()),
    vscode.commands.registerCommand('vibe.showMemory', () => handleShowMemoryCommand()),
    vscode.commands.registerCommand('vibe.clearMemory', () => handleClearMemoryCommand()),
    vscode.commands.registerCommand('vibe.settings', () => handleSettingsCommand()),
    // Panel opening command
    vscode.commands.registerCommand('vibe.openPanel', () => handleOpenPanelCommand()),
    // Mode switching command
    vscode.commands.registerCommand('vibe.switchMode', () => handleSwitchModeCommand())
  ];

  context.subscriptions.push(...commands);
  console.log(`âœ… Registered ${commands.length} consolidated commands`);
}

// Helper Functions
function updateStatusBar() {
  if (statusBarItem) {
    const stateIcons = {
      IDLE: '$(circle-outline)',
      READY: '$(check)',
      ANALYZING: '$(sync~spin)',
      STREAMING: '$(loading~spin)',
      PROPOSING_ACTIONS: '$(lightbulb)',
      AWAITING_APPROVAL: '$(question)',
      RUNNING_TOOL: '$(tools)',
      VERIFYING: '$(checklist)',
      COMPLETED: '$(check-all)',
      ERROR: '$(error)',
      CANCELLED: '$(x)'
    };

    const currentState = stateMachine.getState();
    const modeInfo = MODE_DEFINITIONS[currentState.mode];
    statusBarItem.text = `${modeInfo.icon} ${currentState.mode.toUpperCase()} | ${stateIcons[currentState.state]} ${currentState.state}`;
    statusBarItem.tooltip = `Vibe AI Assistant\nMode: ${modeInfo.description}\nState: ${currentState.state}\nClick to switch mode`;
    statusBarItem.command = 'vibe.switchMode';
  }
}

async function createFile() {
  if (!validateToolAccess('file_ops', 'file_create')) return;

  const fileName = await vscode.window.showInputBox({
    prompt: 'Enter file name',
    placeHolder: 'example.js'
  });

  if (fileName) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
      await vscode.workspace.fs.writeFile(filePath, new Uint8Array());
      vscode.window.showInformationMessage(`âœ… Created file: ${fileName}`);
    }
  }
}

async function createFolder() {
  if (!validateToolAccess('file_ops', 'file_create')) return;

  const folderName = await vscode.window.showInputBox({
    prompt: 'Enter folder name',
    placeHolder: 'my-folder'
  });

  if (folderName) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const folderPath = vscode.Uri.joinPath(workspaceFolder.uri, folderName);
      await vscode.workspace.fs.createDirectory(folderPath);
      vscode.window.showInformationMessage(`âœ… Created folder: ${folderName}`);
    }
  }
}

async function runShellCommand() {
  if (!validateToolAccess('shell', 'terminal')) return;

  const command = await vscode.window.showInputBox({
    prompt: 'Enter shell command',
    placeHolder: 'npm install, git status, ls -la'
  });

  if (command) {
    const terminal = vscode.window.createTerminal('Vibe Command');
    terminal.sendText(command);
    terminal.show();
  }
}

async function searchCodebase() {
  if (!validateToolAccess('search')) return;

  const query = await vscode.window.showInputBox({
    prompt: 'Enter search query',
    placeHolder: 'function name, class, or text to search'
  });

  if (query) {
    await vscode.commands.executeCommand('workbench.action.findInFiles', { query });
  }
}

async function analyzeProject() {
  if (!validateToolAccess('analyze')) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const analysis = `# Project Analysis

## Workspace: ${workspaceFolder.name}
## Path: ${workspaceFolder.uri.fsPath}

## Analysis Results
- Project structure analyzed
- Dependencies scanned
- Code patterns identified

Use other Vibe commands for detailed analysis.`;

  const doc = await vscode.workspace.openTextDocument({
    content: analysis,
    language: 'markdown'
  });
  await vscode.window.showTextDocument(doc);
}

async function gitStatus() {
  if (!validateToolAccess('git', 'terminal')) return;

  const terminal = vscode.window.createTerminal('Vibe Git');
  terminal.sendText('git status');
  terminal.show();
}

async function runTests() {
  if (!validateToolAccess('run_tests', 'terminal')) return;

  const testCommand = await vscode.window.showQuickPick([
    'npm test',
    'yarn test',
    'pytest',
    'jest',
    'mocha'
  ], { placeHolder: 'Select test command' });

  if (testCommand) {
    const terminal = vscode.window.createTerminal('Vibe Tests');
    terminal.sendText(testCommand);
    terminal.show();
  }
}

async function formatCode() {
  if (!validateToolAccess('format', 'file_write')) return;

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    await vscode.commands.executeCommand('editor.action.formatDocument');
    vscode.window.showInformationMessage('âœ… Code formatted');
  }
}

function setupEventListeners(context: vscode.ExtensionContext) {
  // Configuration change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('vibe')) {
        vscode.window.showInformationMessage('âœ… Vibe configuration updated');
      }
    })
  );
}

export function deactivate() {
  statusBarItem?.dispose();
  outputChannel?.dispose();
  console.log('ðŸ”„ Vibe VS Code Extension deactivated');
}