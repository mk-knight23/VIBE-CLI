import * as vscode from 'vscode';
import { MemoryManager } from './MemoryManager';

export interface ToolChain {
  tools: ToolExecution[];
  reasoning: string;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ToolExecution {
  tool: ToolDefinition;
  params: any;
  dependsOn?: string[]; // Tool names this depends on
  retryCount: number;
  timeout: number;
}

export interface OrchestrationResult {
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
  duration: number;
  toolChain: ToolChain;
  rollbackData?: Map<string, any>;
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  requiresConfirmation?: boolean;
  rollbackable?: boolean;
}

export interface MultiStepTask {
  id: string;
  name: string;
  description: string;
  steps: TaskStep[];
  dependencies: string[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
}

export interface TaskStep {
  id: string;
  name: string;
  description: string;
  toolChain: ToolChain;
  dependsOn: string[];
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  timeout: number;
  critical: boolean; // If true, failure stops entire task
}

export interface BatchOperation {
  id: string;
  operations: BatchFileOperation[];
  description: string;
  createdAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface BatchFileOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  path: string;
  content?: string;
  newPath?: string;
  backup?: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, TaskStep>;
  edges: Array<{ from: string; to: string }>;
}

export interface RollbackPlan {
  operations: Array<{
    toolName: string;
    params: any;
    originalState?: any;
  }>;
  timestamp: number;
}

export class ToolOrchestrator {
  private memory: MemoryManager;
  private tools: ToolDefinition[] = [];

  constructor(memory: MemoryManager) {
    this.memory = memory;
    this.initializeTools();
  }

  private initializeTools(): void {
    // Initialize all available tools
    this.tools = [
      {
        name: 'read_file',
        displayName: 'Read File',
        description: 'Read the contents of a file',
        parameters: {
          path: { type: 'string', description: 'File path to read', required: true },
          start_line: { type: 'number', description: 'Starting line number', required: false },
          end_line: { type: 'number', description: 'Ending line number', required: false }
        }
      },
      {
        name: 'search_files',
        displayName: 'Search Files',
        description: 'Search for text patterns in files',
        parameters: {
          path: { type: 'string', description: 'Directory path to search', required: true },
          regex: { type: 'string', description: 'Regular expression pattern', required: true },
          file_pattern: { type: 'string', description: 'File pattern filter', required: false }
        }
      },
      {
        name: 'list_files',
        displayName: 'List Files',
        description: 'List files in a directory',
        parameters: {
          path: { type: 'string', description: 'Directory path', required: true },
          recursive: { type: 'boolean', description: 'Include subdirectories', required: false }
        }
      },
      {
        name: 'list_code_definition_names',
        displayName: 'List Code Definitions',
        description: 'Extract code definitions from files',
        parameters: {
          path: { type: 'string', description: 'Directory path', required: true }
        }
      },
      {
        name: 'write_file',
        displayName: 'Write File',
        description: 'Create or update a file',
        parameters: {
          file_path: { type: 'string', description: 'File path to write', required: true },
          content: { type: 'string', description: 'Content to write', required: true }
        },
        requiresConfirmation: true
      },
      {
        name: 'create_folder',
        displayName: 'Create Folder',
        description: 'Create a new directory',
        parameters: {
          dir_path: { type: 'string', description: 'Directory path to create', required: true }
        }
      },
      {
        name: 'run_shell_command',
        displayName: 'Run Shell Command',
        description: 'Execute a shell command',
        parameters: {
          command: { type: 'string', description: 'Command to execute', required: true },
          description: { type: 'string', description: 'Command description', required: false }
        },
        requiresConfirmation: true
      }
    ];
  }

  /**
   * Analyze request and create optimal tool chain
   */
  async analyzeAndPlan(request: string, context?: any): Promise<ToolChain> {
    // Extract keywords and patterns from request
    const analysis = this.analyzeRequest(request);

    // Build tool chain based on analysis
    const toolChain = this.buildToolChain(analysis, context, request);

    return toolChain;
  }

  /**
   * Execute tool chain with intelligent error handling and recovery
   */
  async executeChain(toolChain: ToolChain): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();
    const executed = new Set<string>();

    // Execute tools in dependency order
    for (const execution of toolChain.tools) {
      // Check dependencies
      if (execution.dependsOn) {
        const missingDeps = execution.dependsOn.filter(dep => !executed.has(dep));
        if (missingDeps.length > 0) {
          const error = new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
          errors.set(execution.tool.name, error);
          continue;
        }
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(execution);
      executed.add(execution.tool.name);

      if (result.success) {
        results.set(execution.tool.name, result.data);

        // Update memory based on tool type
        this.updateMemoryFromTool(execution.tool.name, execution.params, result.data);
      } else {
        errors.set(execution.tool.name, result.error!);

        // Attempt recovery if possible
        if (this.canRecover(execution.tool.name, result.error!)) {
          const recoveryResult = await this.attemptRecovery(execution, result.error!);
          if (recoveryResult.success) {
            results.set(execution.tool.name, recoveryResult.data);
            errors.delete(execution.tool.name);
            continue;
          }
        }

        // If high-risk operation failed, stop chain
        if (toolChain.riskLevel === 'high') {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const success = errors.size === 0;

    return {
      success,
      results,
      errors,
      duration,
      toolChain
    };
  }

  /**
   * Execute single tool with retry logic
   */
  private async executeWithRetry(execution: ToolExecution): Promise<{ success: boolean; data?: any; error?: Error }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= execution.retryCount; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.executeToolWithTimeout(execution, execution.timeout);

        const duration = Date.now() - startTime;

        return { success: true, data: result };
      } catch (error: any) {
        lastError = error;

        if (attempt < execution.retryCount) {
          await this.sleep(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return { success: false, error: lastError! };
  }

  /**
   * Execute tool with timeout
   */
  private async executeToolWithTimeout(execution: ToolExecution, timeout: number): Promise<any> {
    return Promise.race([
      this.executeTool(execution.tool.name, execution.params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Execute a specific tool
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      case 'read_file':
        return await this.handleReadFile(params);
      case 'search_files':
        return await this.handleSearchFiles(params);
      case 'list_files':
        return await this.handleListFiles(params);
      case 'list_code_definition_names':
        return await this.handleListCodeDefinitionNames(params);
      case 'write_file':
        return await this.handleWriteFile(params);
      case 'create_folder':
        return await this.handleCreateFolder(params);
      case 'run_shell_command':
        return await this.handleRunShellCommand(params);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Analyze request to determine required tools
   */
  private analyzeRequest(request: string): {
    keywords: string[];
    operations: string[];
    complexity: 'simple' | 'medium' | 'complex';
    domains: string[];
  } {
    const lowerRequest = request.toLowerCase();

    // Extract keywords
    const keywords = [];
    if (lowerRequest.includes('create') || lowerRequest.includes('build') || lowerRequest.includes('generate')) keywords.push('create');
    if (lowerRequest.includes('read') || lowerRequest.includes('analyze') || lowerRequest.includes('check')) keywords.push('read');
    if (lowerRequest.includes('write') || lowerRequest.includes('edit') || lowerRequest.includes('modify')) keywords.push('write');
    if (lowerRequest.includes('run') || lowerRequest.includes('execute') || lowerRequest.includes('install')) keywords.push('execute');
    if (lowerRequest.includes('test') || lowerRequest.includes('lint') || lowerRequest.includes('check')) keywords.push('test');

    // Determine operations
    const operations = [];
    if (/\b(create|build|make|generate)\b/.test(lowerRequest)) operations.push('create');
    if (/\b(read|analyze|check|examine)\b/.test(lowerRequest)) operations.push('read');
    if (/\b(write|edit|modify|update)\b/.test(lowerRequest)) operations.push('write');
    if (/\b(run|execute|install|setup)\b/.test(lowerRequest)) operations.push('execute');
    if (/\b(test|lint|validate)\b/.test(lowerRequest)) operations.push('test');

    // Determine complexity
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (operations.length > 2 || lowerRequest.includes('project') || lowerRequest.includes('application')) {
      complexity = 'complex';
    } else if (operations.length > 1) {
      complexity = 'medium';
    }

    // Determine domains
    const domains = [];
    if (lowerRequest.includes('react') || lowerRequest.includes('vue') || lowerRequest.includes('angular')) domains.push('frontend');
    if (lowerRequest.includes('node') || lowerRequest.includes('express') || lowerRequest.includes('api')) domains.push('backend');
    if (lowerRequest.includes('test') || lowerRequest.includes('spec') || lowerRequest.includes('jest')) domains.push('testing');
    if (lowerRequest.includes('deploy') || lowerRequest.includes('docker') || lowerRequest.includes('kubernetes')) domains.push('devops');

    return { keywords, operations, complexity, domains };
  }

  /**
   * Build optimal tool chain based on analysis
   */
  private buildToolChain(
    analysis: ReturnType<typeof this.analyzeRequest>,
    context?: any,
    request?: string
  ): ToolChain {
    const toolExecutions: ToolExecution[] = [];
    let reasoning = '';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Simple operations
    if (analysis.complexity === 'simple') {
      if (analysis.operations.includes('read')) {
        toolExecutions.push(this.createToolExecution('read_file', { path: context?.filePath || '.' }));
        reasoning = 'Single file read operation';
      } else if (analysis.operations.includes('write')) {
        toolExecutions.push(this.createToolExecution('write_file', {
          file_path: context?.filePath,
          content: context?.content
        }));
        reasoning = 'Single file write operation';
        riskLevel = 'medium';
      }
    }

    // Complex operations (project creation, multi-step tasks)
    else if (analysis.complexity === 'complex') {
      // Research phase
      if (analysis.operations.includes('create') && analysis.domains.includes('frontend')) {
        toolExecutions.push(
          this.createToolExecution('list_files', { path: '.', recursive: true }, 30000, 2),
          this.createToolExecution('list_code_definition_names', { path: '.' }, 10000, 1)
        );
        reasoning = 'Research project requirements and dependencies before creation';
      }

      // Setup phase
      if (analysis.operations.includes('execute')) {
        toolExecutions.push(
          this.createToolExecution('run_shell_command', {
            command: 'npm install',
            description: 'Install project dependencies'
          }, 60000, 1)
        );
        reasoning += '. Install dependencies and setup project';
        riskLevel = 'high';
      }

      // Verification phase
      if (analysis.operations.includes('test')) {
        toolExecutions.push(
          this.createToolExecution('run_shell_command', {
            command: 'npm test',
            description: 'Run test suite'
          }, 30000, 2),
          this.createToolExecution('run_shell_command', {
            command: 'npm run lint',
            description: 'Run linting'
          }, 20000, 1)
        );
        reasoning += '. Verify project works correctly';
      }
    }

    // Medium operations
    else {
      // Read then write pattern
      if (analysis.operations.includes('read') && analysis.operations.includes('write')) {
        toolExecutions.push(
          this.createToolExecution('read_file', { path: context?.filePath }),
          this.createToolExecution('write_file', {
            file_path: context?.filePath,
            content: context?.newContent
          }, 10000, 1, ['read_file'])
        );
        reasoning = 'Read existing content then modify';
        riskLevel = 'medium';
      }
    }

    const estimatedDuration = toolExecutions.reduce((sum, exec) => sum + exec.timeout, 0);

    return {
      tools: toolExecutions,
      reasoning,
      estimatedDuration,
      riskLevel
    };
  }

  /**
   * Create tool execution configuration
   */
  private createToolExecution(
    toolName: string,
    params: any,
    timeout: number = 10000,
    retryCount: number = 1,
    dependsOn?: string[]
  ): ToolExecution {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);

    return {
      tool,
      params,
      dependsOn,
      retryCount,
      timeout
    };
  }

  /**
   * Check if error can be recovered from
   */
  private canRecover(toolName: string, error: Error): boolean {
    const recoverableErrors = [
      'timeout',
      'network',
      'temporary',
      'busy',
      'locked'
    ];

    const errorMessage = error.message.toLowerCase();
    return recoverableErrors.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Attempt to recover from tool failure
   */
  private async attemptRecovery(execution: ToolExecution, error: Error): Promise<{ success: boolean; data?: any }> {
    // Wait before retry
    await this.sleep(2000);

    // Retry with modified parameters if possible
    if (execution.tool.name === 'run_shell_command') {
      // For shell commands, try with different approach
      const altParams = { ...execution.params };
      if (altParams.command.includes('npm')) {
        altParams.command = altParams.command.replace('npm', 'yarn');
      }
      return this.executeWithRetry({ ...execution, params: altParams });
    }

    // Default: just retry
    return this.executeWithRetry(execution);
  }

  /**
   * Update memory based on tool execution
   */
  private updateMemoryFromTool(toolName: string, params: any, result: any): void {
    switch (toolName) {
      case 'write_file':
        this.memory.onFileWrite(params.file_path, params.content);
        break;
      case 'read_file':
        this.memory.onFileRead(params.path, result);
        break;
      case 'run_shell_command':
        this.memory.onShellCommand(params.command, result);
        break;
      case 'create_folder':
        this.memory.onFileWrite(params.dir_path, 'directory created');
        break;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Tool handlers
  private async handleReadFile(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const filePath = vscode.Uri.joinPath(workspaceFolder.uri, params.path);
      const content = await vscode.workspace.fs.readFile(filePath);
      const text = Buffer.from(content).toString('utf-8');

      if (params.start_line !== undefined || params.end_line !== undefined) {
        const lines = text.split('\n');
        const start = params.start_line ? params.start_line - 1 : 0;
        const end = params.end_line ? Math.min(params.end_line, lines.length) : lines.length;

        const validStart = Math.max(0, start);
        const validEnd = Math.min(lines.length, end);
        const selectedLines = lines.slice(validStart, validEnd);

        let result = '';
        for (let i = validStart; i < validEnd; i++) {
          result += `${i + 1} | ${lines[i]}\n`;
        }
        return result.trim();
      }

      return text;
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  private async handleSearchFiles(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const searchPath = vscode.Uri.joinPath(workspaceFolder.uri, params.path);
      const pattern = params.file_pattern || '**/*';
      const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';

      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(searchPath, pattern),
        excludePattern,
        50
      );

      let results = '';
      const regex = new RegExp(params.regex, 'g');

      for (const fileUri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const text = Buffer.from(content).toString('utf-8');
          const lines = text.split('\n');
          const relativePath = vscode.workspace.asRelativePath(fileUri);

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (regex.test(line)) {
              results += `# ${relativePath}\n`;
              results += `${String(i + 1).padStart(3)} | ${line}\n`;
              results += '----\n';
            }
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return results || `No matches found for pattern '${params.regex}'`;
    } catch (error) {
      throw new Error(`Failed to search files: ${(error as Error).message}`);
    }
  }

  private async handleListFiles(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const targetPath = vscode.Uri.joinPath(workspaceFolder.uri, params.path);

      let result = '';
      if (params.recursive) {
        const pattern = '**/*';
        const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';
        const files = await vscode.workspace.findFiles(
          new vscode.RelativePattern(targetPath, pattern),
          excludePattern,
          100
        );

        const dirs = new Set<string>();
        files.forEach(uri => {
          const relativePath = vscode.workspace.asRelativePath(uri);
          const parts = relativePath.split('/');
          for (let i = 1; i <= parts.length; i++) {
            dirs.add(parts.slice(0, i).join('/'));
          }
        });

        const sortedDirs = Array.from(dirs).sort();
        result = sortedDirs.map(dir => dir.endsWith('/') ? dir : dir + '/').join('\n');
      } else {
        // Non-recursive listing
        const entries = await vscode.workspace.fs.readDirectory(targetPath);
        result = entries.map(([name, type]) => {
          return type === vscode.FileType.Directory ? `${name}/` : name;
        }).join('\n');
      }

      return result || 'Directory is empty';
    } catch (error) {
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  private async handleListCodeDefinitionNames(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const targetPath = vscode.Uri.joinPath(workspaceFolder.uri, params.path);
      const pattern = '**/*.{js,jsx,ts,tsx,py,rs,go,cpp,hpp,c,h,cs,java,php,rb,swift,kt,kts}';
      const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';

      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(targetPath, pattern),
        excludePattern,
        20
      );

      let result = '';

      for (const fileUri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const text = Buffer.from(content).toString('utf-8');
          const relativePath = vscode.workspace.asRelativePath(fileUri);

          result += `${relativePath}:\n`;

          // Simple pattern matching for code definitions
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^(export\s+)?(function|class|interface|def|class|struct|fn|func)\s+\w+/)) {
              result += `${i + 1}--${i + 1} | ${line}\n`;
            }
          }
        } catch (error) {
          continue;
        }
      }

      return result || 'No code definitions found';
    } catch (error) {
      throw new Error(`Failed to list code definitions: ${(error as Error).message}`);
    }
  }

  private async handleWriteFile(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const filePath = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
      const content = Buffer.from(params.content, 'utf-8');

      await vscode.workspace.fs.writeFile(filePath, content);
      return `Successfully wrote ${params.content.length} characters to ${params.file_path}`;
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  private async handleCreateFolder(params: any): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, params.dir_path);
      await vscode.workspace.fs.createDirectory(dirPath);
      return `Successfully created directory ${params.dir_path}`;
    } catch (error) {
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  private async handleRunShellCommand(params: any): Promise<string> {
    try {
      // Use VS Code terminal API
      const terminal = vscode.window.createTerminal('Vibe Command');
      terminal.sendText(params.command);
      terminal.show();

      // For now, return a placeholder - in real implementation we'd need to capture output
      return `Command executed: ${params.command}`;
    } catch (error) {
      throw new Error(`Failed to run command: ${(error as Error).message}`);
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools(): ToolDefinition[] {
    return this.tools;
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.find(t => t.name === name);
  }

  // ===== ADVANCED TOOLING & ORCHESTRATION =====

  /**
   * Create and execute a multi-step task
   */
  async createMultiStepTask(
    name: string,
    description: string,
    steps: Omit<TaskStep, 'id'>[]
  ): Promise<MultiStepTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: MultiStepTask = {
      id: taskId,
      name,
      description,
      steps: steps.map((step, index) => ({
        ...step,
        id: `${taskId}_step_${index}`
      })) as TaskStep[],
      dependencies: [],
      estimatedDuration: steps.reduce((sum, step) => sum + step.timeout, 0),
      riskLevel: this.calculateTaskRisk(steps as TaskStep[]),
      createdAt: Date.now(),
      status: 'pending'
    };

    return task;
  }

  /**
   * Execute a multi-step task with dependency tracking
   */
  async executeMultiStepTask(task: MultiStepTask): Promise<{
    success: boolean;
    results: Map<string, any>;
    errors: Map<string, Error>;
    duration: number;
    executedSteps: string[];
    failedSteps: string[];
  }> {
    const startTime = Date.now();
    task.status = 'running';

    const results = new Map<string, any>();
    const errors = new Map<string, Error>();
    const executedSteps: string[] = [];
    const failedSteps: string[] = [];

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(task.steps);

    // Execute steps in topological order
    const executionOrder = this.topologicalSort(dependencyGraph);

    for (const stepId of executionOrder) {
      const step = dependencyGraph.nodes.get(stepId);
      if (!step) continue;

      try {
        // Check if dependencies are satisfied
        const dependenciesMet = step.dependsOn.every(depId =>
          executedSteps.includes(depId) && !failedSteps.includes(depId)
        );

        if (!dependenciesMet) {
          const error = new Error(`Dependencies not met for step ${step.name}`);
          errors.set(stepId, error);
          failedSteps.push(stepId);
          if (step.critical) {
            task.status = 'failed';
            break;
          }
          continue;
        }

        // Execute step with retry logic
        const stepResult = await this.executeStepWithRetry(step);
        results.set(stepId, stepResult);
        executedSteps.push(stepId);

        // Update memory
        this.memory.addWorkspaceChange({
          type: 'command_executed',
          description: `Executed step: ${step.name}`,
          impact: 'medium'
        });

      } catch (error: any) {
        errors.set(stepId, error);
        failedSteps.push(stepId);

        if (step.critical) {
          task.status = 'failed';
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const success = failedSteps.length === 0 || failedSteps.every(stepId => {
      const step = dependencyGraph.nodes.get(stepId);
      return step && !step.critical;
    });

    task.status = success ? 'completed' : 'failed';

    return {
      success,
      results,
      errors,
      duration,
      executedSteps,
      failedSteps
    };
  }

  /**
   * Execute batch file operations atomically
   */
  async executeBatchOperation(batch: BatchOperation): Promise<{
    success: boolean;
    results: Map<string, any>;
    errors: Map<string, Error>;
    rollbackData?: Map<string, any>;
  }> {
    const startTime = Date.now();
    batch.status = 'running';

    const results = new Map<string, any>();
    const errors = new Map<string, Error>();
    const rollbackData = new Map<string, any>();

    // Create backups for rollback
    for (const operation of batch.operations) {
      if (operation.backup && (operation.type === 'update' || operation.type === 'delete')) {
        try {
          const backup = await this.createBackup(operation.path);
          rollbackData.set(operation.path, backup);
        } catch (error) {
          console.warn(`Failed to create backup for ${operation.path}:`, error);
        }
      }
    }

    // Execute operations
    for (const operation of batch.operations) {
      try {
        const result = await this.executeFileOperation(operation);
        results.set(operation.path, result);
      } catch (error: any) {
        errors.set(operation.path, error);

        // Attempt rollback on failure
        if (rollbackData.size > 0) {
          await this.rollbackBatchOperations(rollbackData);
          batch.status = 'failed';
          return {
            success: false,
            results,
            errors,
            rollbackData
          };
        }
      }
    }

    batch.status = errors.size === 0 ? 'completed' : 'failed';

    return {
      success: errors.size === 0,
      results,
      errors,
      rollbackData: errors.size > 0 ? rollbackData : undefined
    };
  }

  /**
   * Rollback batch operations safely
   */
  async rollbackBatchOperations(rollbackData: Map<string, any>): Promise<void> {
    for (const [path, backup] of rollbackData) {
      try {
        if (backup.exists && backup.content) {
          // Restore file content
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (workspaceFolder) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, path);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(backup.content));
          }
        } else if (backup.exists === false) {
          // File was created, so delete it
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (workspaceFolder) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, path);
            await vscode.workspace.fs.delete(fileUri);
          }
        }
      } catch (error) {
        console.error(`Failed to rollback ${path}:`, error);
      }
    }
  }

  /**
   * Create deterministic execution plan
   */
  createDeterministicPlan(request: string, context?: any): {
    planId: string;
    steps: Array<{
      order: number;
      tool: string;
      params: any;
      estimatedTime: number;
      risk: 'low' | 'medium' | 'high';
    }>;
    totalEstimatedTime: number;
    riskAssessment: string;
  } {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analysis = this.analyzeRequest(request);
    const toolChain = this.buildToolChain(analysis, context, request);

    const steps = toolChain.tools.map((execution, index) => ({
      order: index + 1,
      tool: execution.tool.name,
      params: execution.params,
      estimatedTime: execution.timeout,
      risk: this.assessToolRisk(execution.tool.name, execution.params)
    }));

    const totalEstimatedTime = toolChain.estimatedDuration;
    const riskAssessment = this.generateRiskAssessment(toolChain, steps);

    return {
      planId,
      steps,
      totalEstimatedTime,
      riskAssessment
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private calculateTaskRisk(steps: TaskStep[]): 'low' | 'medium' | 'high' {
    const highRiskSteps = steps.filter(step =>
      step.toolChain.riskLevel === 'high' ||
      step.toolChain.tools.some(tool => tool.tool.requiresConfirmation)
    );

    if (highRiskSteps.length > steps.length / 2) return 'high';
    if (highRiskSteps.length > 0) return 'medium';
    return 'low';
  }

  private buildDependencyGraph(steps: TaskStep[]): DependencyGraph {
    const nodes = new Map<string, TaskStep>();
    const edges: Array<{ from: string; to: string }> = [];

    // Add all nodes
    steps.forEach(step => {
      nodes.set(step.id, step);
    });

    // Add edges based on dependsOn
    steps.forEach(step => {
      step.dependsOn.forEach(depId => {
        edges.push({ from: depId, to: step.id });
      });
    });

    return { nodes, edges };
  }

  private topologicalSort(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) throw new Error('Circular dependency detected');

      visiting.add(nodeId);

      // Visit dependencies first
      const node = graph.nodes.get(nodeId);
      if (node) {
        node.dependsOn.forEach(depId => visit(depId));
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    // Visit all nodes
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return order;
  }

  private async executeStepWithRetry(step: TaskStep): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= step.retryPolicy.maxRetries; attempt++) {
      try {
        const result = await this.executeChain(step.toolChain);
        if (result.success) {
          return result;
        } else {
          throw new Error(`Step execution failed: ${Array.from(result.errors.values()).map(e => e.message).join(', ')}`);
        }
      } catch (error: any) {
        lastError = error;

        if (attempt < step.retryPolicy.maxRetries) {
          await this.sleep(step.retryPolicy.backoffMs * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  private async createBackup(filePath: string): Promise<{ exists: boolean; content?: string }> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) throw new Error('No workspace folder');

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
      const content = await vscode.workspace.fs.readFile(fileUri);

      return {
        exists: true,
        content: Buffer.from(content).toString('utf-8')
      };
    } catch (error) {
      // File doesn't exist, that's okay for backup
      return { exists: false };
    }
  }

  private async executeFileOperation(operation: BatchFileOperation): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) throw new Error('No workspace folder');

    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, operation.path);

    switch (operation.type) {
      case 'create':
      case 'update':
        if (!operation.content) throw new Error('Content required for create/update operations');
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.content));
        return `Successfully ${operation.type}d ${operation.path}`;

      case 'delete':
        await vscode.workspace.fs.delete(fileUri);
        return `Successfully deleted ${operation.path}`;

      case 'move':
        if (!operation.newPath) throw new Error('New path required for move operations');
        const newUri = vscode.Uri.joinPath(workspaceFolder.uri, operation.newPath);
        await vscode.workspace.fs.rename(fileUri, newUri);
        return `Successfully moved ${operation.path} to ${operation.newPath}`;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private assessToolRisk(toolName: string, params: any): 'low' | 'medium' | 'high' {
    // High risk tools
    if (toolName === 'run_shell_command') {
      const command = params.command?.toLowerCase() || '';
      if (command.includes('rm') || command.includes('del') || command.includes('drop') ||
          command.includes('uninstall') || command.includes('delete')) {
        return 'high';
      }
      return 'medium';
    }

    if (toolName === 'write_file') {
      return 'medium'; // File modifications are medium risk
    }

    // Low risk tools
    if (['read_file', 'search_files', 'list_files', 'list_code_definition_names'].includes(toolName)) {
      return 'low';
    }

    return 'medium'; // Default
  }

  private generateRiskAssessment(toolChain: ToolChain, steps: any[]): string {
    const highRiskSteps = steps.filter(s => s.risk === 'high').length;
    const mediumRiskSteps = steps.filter(s => s.risk === 'medium').length;

    let assessment = `Risk Level: ${toolChain.riskLevel}. `;

    if (highRiskSteps > 0) {
      assessment += `${highRiskSteps} high-risk operations. `;
    }

    if (mediumRiskSteps > 0) {
      assessment += `${mediumRiskSteps} medium-risk operations. `;
    }

    if (toolChain.riskLevel === 'high') {
      assessment += 'Consider reviewing operations before execution.';
    } else if (toolChain.riskLevel === 'medium') {
      assessment += 'Moderate risk - monitor execution.';
    } else {
      assessment += 'Low risk - safe to execute.';
    }

    return assessment;
  }
}
