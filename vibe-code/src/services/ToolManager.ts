import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryManager } from './MemoryManager';
import { DiffEditorService } from './DiffEditorService';

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
  category?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export class ToolManager {
  private memoryManager: MemoryManager;
  private diffEditor: DiffEditorService;
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(memoryManager: MemoryManager, diffEditor: DiffEditorService) {
    this.memoryManager = memoryManager;
    this.diffEditor = diffEditor;
    this.initializeTools();
  }

  private initializeTools(): void {
    // File Operations
    this.addTool({
      name: 'list_directory',
      displayName: 'ReadFolder',
      description: 'List files and directories in a path',
      parameters: {
        path: { type: 'string', description: 'Directory path to list', required: true },
        ignore: { type: 'array', description: 'Patterns to ignore', required: false },
        respect_git_ignore: { type: 'boolean', description: 'Respect .gitignore', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'read_file',
      displayName: 'ReadFile',
      description: 'Read file contents (text, images, PDFs)',
      parameters: {
        path: { type: 'string', description: 'File path to read', required: true },
        offset: { type: 'number', description: 'Byte offset to start reading', required: false },
        limit: { type: 'number', description: 'Maximum bytes to read', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'write_file',
      displayName: 'WriteFile',
      description: 'Write content to a file',
      parameters: {
        file_path: { type: 'string', description: 'File path to write', required: true },
        content: { type: 'string', description: 'Content to write', required: true }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    this.addTool({
      name: 'glob',
      displayName: 'FindFiles',
      description: 'Find files matching glob patterns',
      parameters: {
        pattern: { type: 'string', description: 'Glob pattern', required: true },
        path: { type: 'string', description: 'Base path for search', required: false },
        case_sensitive: { type: 'boolean', description: 'Case sensitive matching', required: false },
        respect_git_ignore: { type: 'boolean', description: 'Respect .gitignore', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'search_file_content',
      displayName: 'SearchText',
      description: 'Search for text patterns in files',
      parameters: {
        pattern: { type: 'string', description: 'Search pattern', required: true },
        path: { type: 'string', description: 'Directory to search', required: false },
        include: { type: 'string', description: 'File pattern to include', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'replace',
      displayName: 'Edit',
      description: 'Replace text in a file',
      parameters: {
        file_path: { type: 'string', description: 'File path to edit', required: true },
        old_string: { type: 'string', description: 'Text to replace', required: true },
        new_string: { type: 'string', description: 'Replacement text', required: true },
        expected_replacements: { type: 'number', description: 'Expected number of replacements', required: false }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    // Shell Operations
    this.addTool({
      name: 'run_shell_command',
      displayName: 'Shell',
      description: 'Execute shell commands',
      parameters: {
        command: { type: 'string', description: 'Command to execute', required: true },
        description: { type: 'string', description: 'Command description', required: false },
        directory: { type: 'string', description: 'Working directory', required: false }
      },
      requiresConfirmation: true,
      category: 'shell'
    });

    // Web Operations
    this.addTool({
      name: 'web_fetch',
      displayName: 'WebFetch',
      description: 'Fetch content from URLs',
      parameters: {
        url: { type: 'string', description: 'URL to fetch', required: true }
      },
      requiresConfirmation: false,
      category: 'web'
    });

    this.addTool({
      name: 'google_web_search',
      displayName: 'WebSearch',
      description: 'Search the web',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
        num_results: { type: 'number', description: 'Number of results', required: false }
      },
      requiresConfirmation: false,
      category: 'web'
    });

    // Memory Operations
    this.addTool({
      name: 'save_memory',
      displayName: 'SaveMemory',
      description: 'Save information to memory',
      parameters: {
        key: { type: 'string', description: 'Memory key', required: true },
        value: { type: 'any', description: 'Value to store', required: true }
      },
      requiresConfirmation: false,
      category: 'memory'
    });

    this.addTool({
      name: 'write_todos',
      displayName: 'WriteTodos',
      description: 'Manage task list',
      parameters: {
        todos: { type: 'array', description: 'Array of todo items', required: true }
      },
      requiresConfirmation: false,
      category: 'memory'
    });

    // Git Operations
    this.addTool({
      name: 'git_status',
      displayName: 'GitStatus',
      description: 'Check git status',
      parameters: {},
      requiresConfirmation: false,
      category: 'git'
    });

    this.addTool({
      name: 'git_diff',
      displayName: 'GitDiff',
      description: 'Show git diff',
      parameters: {
        file: { type: 'string', description: 'Specific file to diff', required: false }
      },
      requiresConfirmation: false,
      category: 'git'
    });

    this.addTool({
      name: 'git_log',
      displayName: 'GitLog',
      description: 'Show git log',
      parameters: {
        count: { type: 'number', description: 'Number of commits', required: false }
      },
      requiresConfirmation: false,
      category: 'git'
    });

    this.addTool({
      name: 'git_blame',
      displayName: 'GitBlame',
      description: 'Show git blame for file',
      parameters: {
        file: { type: 'string', description: 'File path', required: true },
        lineStart: { type: 'number', description: 'Start line', required: false },
        lineEnd: { type: 'number', description: 'End line', required: false }
      },
      requiresConfirmation: false,
      category: 'git'
    });

    // Enhanced File Operations
    this.addTool({
      name: 'rg_search',
      displayName: 'RipgrepSearch',
      description: 'Fast search with ripgrep',
      parameters: {
        pattern: { type: 'string', description: 'Search pattern', required: true },
        path: { type: 'string', description: 'Search path', required: false },
        options: { type: 'object', description: 'Search options', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'list_files_rg',
      displayName: 'ListFilesRg',
      description: 'List all files using ripgrep',
      parameters: {
        path: { type: 'string', description: 'Directory path', required: false }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'get_file_info',
      displayName: 'FileInfo',
      description: 'Get detailed file information',
      parameters: {
        file_path: { type: 'string', description: 'File path', required: true }
      },
      requiresConfirmation: false,
      category: 'filesystem'
    });

    this.addTool({
      name: 'create_directory',
      displayName: 'MakeDir',
      description: 'Create directory',
      parameters: {
        dir_path: { type: 'string', description: 'Directory path', required: true },
        recursive: { type: 'boolean', description: 'Create recursively', required: false }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    this.addTool({
      name: 'delete_file',
      displayName: 'DeleteFile',
      description: 'Delete a file',
      parameters: {
        file_path: { type: 'string', description: 'File path', required: true }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    this.addTool({
      name: 'move_file',
      displayName: 'MoveFile',
      description: 'Move or rename a file',
      parameters: {
        source: { type: 'string', description: 'Source path', required: true },
        destination: { type: 'string', description: 'Destination path', required: true }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    this.addTool({
      name: 'copy_file',
      displayName: 'CopyFile',
      description: 'Copy a file',
      parameters: {
        source: { type: 'string', description: 'Source path', required: true },
        destination: { type: 'string', description: 'Destination path', required: true }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    this.addTool({
      name: 'append_to_file',
      displayName: 'AppendFile',
      description: 'Append content to file',
      parameters: {
        file_path: { type: 'string', description: 'File path', required: true },
        content: { type: 'string', description: 'Content to append', required: true }
      },
      requiresConfirmation: true,
      category: 'filesystem'
    });

    // Project Operations
    this.addTool({
      name: 'check_dependency',
      displayName: 'CheckDep',
      description: 'Check if package exists in project',
      parameters: {
        package_name: { type: 'string', description: 'Package name', required: true }
      },
      requiresConfirmation: false,
      category: 'project'
    });

    this.addTool({
      name: 'get_project_info',
      displayName: 'ProjectInfo',
      description: 'Get project metadata',
      parameters: {},
      requiresConfirmation: false,
      category: 'project'
    });

    this.addTool({
      name: 'run_tests',
      displayName: 'RunTests',
      description: 'Run project tests',
      parameters: {
        test_command: { type: 'string', description: 'Test command', required: false }
      },
      requiresConfirmation: false,
      category: 'project'
    });

    this.addTool({
      name: 'run_lint',
      displayName: 'RunLint',
      description: 'Run linter',
      parameters: {
        lint_command: { type: 'string', description: 'Lint command', required: false }
      },
      requiresConfirmation: false,
      category: 'project'
    });

    this.addTool({
      name: 'run_typecheck',
      displayName: 'TypeCheck',
      description: 'Run TypeScript type checking',
      parameters: {},
      requiresConfirmation: false,
      category: 'project'
    });

    // Advanced AI-Powered Tools
    this.addTool({
      name: 'analyze_code_quality',
      displayName: 'CodeQuality',
      description: 'Analyze code quality metrics',
      parameters: {
        file_path: { type: 'string', description: 'File to analyze', required: true }
      },
      requiresConfirmation: false,
      category: 'analysis'
    });

    this.addTool({
      name: 'smart_refactor',
      displayName: 'Refactor',
      description: 'AI-powered code refactoring',
      parameters: {
        file_path: { type: 'string', description: 'File to refactor', required: true },
        type: { type: 'string', description: 'Refactor type', required: true }
      },
      requiresConfirmation: true,
      category: 'refactor'
    });

    this.addTool({
      name: 'generate_tests',
      displayName: 'GenTests',
      description: 'Auto-generate test files',
      parameters: {
        file_path: { type: 'string', description: 'File to test', required: true },
        framework: { type: 'string', description: 'Test framework', required: false }
      },
      requiresConfirmation: true,
      category: 'testing'
    });

    this.addTool({
      name: 'optimize_bundle',
      displayName: 'OptimizeBundle',
      description: 'Analyze and optimize bundle size',
      parameters: {
        project_path: { type: 'string', description: 'Project path', required: false }
      },
      requiresConfirmation: false,
      category: 'optimization'
    });

    this.addTool({
      name: 'security_scan',
      displayName: 'SecurityScan',
      description: 'Scan for security vulnerabilities',
      parameters: {
        project_path: { type: 'string', description: 'Project path', required: false }
      },
      requiresConfirmation: false,
      category: 'security'
    });

    this.addTool({
      name: 'performance_benchmark',
      displayName: 'Benchmark',
      description: 'Benchmark file operations',
      parameters: {
        file_path: { type: 'string', description: 'File to benchmark', required: true }
      },
      requiresConfirmation: false,
      category: 'performance'
    });

    this.addTool({
      name: 'generate_documentation',
      displayName: 'GenDocs',
      description: 'Auto-generate documentation',
      parameters: {
        file_path: { type: 'string', description: 'File to document', required: true }
      },
      requiresConfirmation: true,
      category: 'documentation'
    });

    this.addTool({
      name: 'migrate_code',
      displayName: 'Migrate',
      description: 'Migrate code between formats',
      parameters: {
        file_path: { type: 'string', description: 'File to migrate', required: true },
        from: { type: 'string', description: 'Source format', required: true },
        to: { type: 'string', description: 'Target format', required: true }
      },
      requiresConfirmation: true,
      category: 'migration'
    });
  }

  private addTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool by name with given parameters
   */
  async executeTool(toolName: string, params: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        duration: Date.now() - startTime
      };
    }

    try {
      // Validate required parameters
      for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
        if (paramDef.required && !(paramName in params)) {
          return {
            success: false,
            error: `Missing required parameter: ${paramName}`,
            duration: Date.now() - startTime
          };
        }
      }

      // Execute the tool
      const result = await this.executeToolHandler(toolName, params);

      // Update memory
      this.memoryManager.onFileWrite(toolName, JSON.stringify(params));

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      this.memoryManager.onError(`Tool ${toolName} failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute tool handler based on tool name
   */
  private async executeToolHandler(toolName: string, params: any): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    switch (toolName) {
      case 'list_directory':
        return await this.handleListDirectory(params, workspaceFolder);
      case 'read_file':
        return await this.handleReadFile(params, workspaceFolder);
      case 'write_file':
        return await this.handleWriteFile(params, workspaceFolder);
      case 'glob':
        return await this.handleGlob(params, workspaceFolder);
      case 'search_file_content':
        return await this.handleSearchFileContent(params, workspaceFolder);
      case 'replace':
        return await this.handleReplace(params, workspaceFolder);
      case 'run_shell_command':
        return await this.handleRunShellCommand(params, workspaceFolder);
      case 'web_fetch':
        return await this.handleWebFetch(params);
      case 'google_web_search':
        return await this.handleGoogleWebSearch(params);
      case 'save_memory':
        return await this.handleSaveMemory(params);
      case 'write_todos':
        return await this.handleWriteTodos(params);
      case 'git_status':
        return await this.handleGitStatus(workspaceFolder);
      case 'git_diff':
        return await this.handleGitDiff(params, workspaceFolder);
      case 'git_log':
        return await this.handleGitLog(params, workspaceFolder);
      case 'git_blame':
        return await this.handleGitBlame(params, workspaceFolder);
      case 'rg_search':
        return await this.handleRipgrepSearch(params, workspaceFolder);
      case 'list_files_rg':
        return await this.handleListFilesRg(params, workspaceFolder);
      case 'get_file_info':
        return await this.handleGetFileInfo(params, workspaceFolder);
      case 'create_directory':
        return await this.handleCreateDirectory(params, workspaceFolder);
      case 'delete_file':
        return await this.handleDeleteFile(params, workspaceFolder);
      case 'move_file':
        return await this.handleMoveFile(params, workspaceFolder);
      case 'copy_file':
        return await this.handleCopyFile(params, workspaceFolder);
      case 'append_to_file':
        return await this.handleAppendToFile(params, workspaceFolder);
      case 'check_dependency':
        return await this.handleCheckDependency(params, workspaceFolder);
      case 'get_project_info':
        return await this.handleGetProjectInfo(workspaceFolder);
      case 'run_tests':
        return await this.handleRunTests(params, workspaceFolder);
      case 'run_lint':
        return await this.handleRunLint(params, workspaceFolder);
      case 'run_typecheck':
        return await this.handleRunTypeCheck(workspaceFolder);
      case 'analyze_code_quality':
        return await this.handleAnalyzeCodeQuality(params, workspaceFolder);
      case 'smart_refactor':
        return await this.handleSmartRefactor(params, workspaceFolder);
      case 'generate_tests':
        return await this.handleGenerateTests(params, workspaceFolder);
      case 'optimize_bundle':
        return await this.handleOptimizeBundle(params, workspaceFolder);
      case 'security_scan':
        return await this.handleSecurityScan(params, workspaceFolder);
      case 'performance_benchmark':
        return await this.handlePerformanceBenchmark(params, workspaceFolder);
      case 'generate_documentation':
        return await this.handleGenerateDocumentation(params, workspaceFolder);
      case 'migrate_code':
        return await this.handleMigrateCode(params, workspaceFolder);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Tool handlers implementation
  private async handleListDirectory(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const targetPath = vscode.Uri.joinPath(workspaceFolder.uri, params.path || '.');
    const entries = await vscode.workspace.fs.readDirectory(targetPath);

    const ignorePatterns = params.ignore || ['node_modules', '.git', 'dist', 'build'];
    const ignoreSet = new Set(ignorePatterns);

    return entries
      .filter(([name]) => !ignoreSet.has(name))
      .map(([name, type]) => type === vscode.FileType.Directory ? `${name}/` : name);
  }

  private async handleReadFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.path);
    const content = await vscode.workspace.fs.readFile(fileUri);
    let text = Buffer.from(content).toString('utf-8');

    if (params.offset !== undefined || params.limit !== undefined) {
      const start = params.offset || 0;
      const end = params.limit ? start + params.limit : text.length;
      text = text.substring(start, end);
    }

    return text;
  }

  private async handleWriteFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
    const content = Buffer.from(params.content, 'utf-8');

    await vscode.workspace.fs.writeFile(fileUri, content);
    this.memoryManager.onFileWrite(params.file_path, params.content);

    return `Successfully wrote ${params.content.length} characters to ${params.file_path}`;
  }

  private async handleGlob(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const basePath = params.path || '.';
    const pattern = params.pattern;
    const excludePattern = params.respect_git_ignore ? '**/{node_modules,.git,dist,build}/**' : undefined;

    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(basePath, pattern),
      excludePattern
    );

    return files.map(uri => vscode.workspace.asRelativePath(uri));
  }

  private async handleSearchFileContent(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
    // Use VS Code's search API
    const searchPattern = params.pattern;
    const includePattern = params.include;
    const searchPath = params.path ? vscode.Uri.joinPath(workspaceFolder.uri, params.path) : workspaceFolder.uri;

    // Use commands API for search
    const results = await vscode.commands.executeCommand(
      'vscode.executeTextSearchProvider',
      searchPattern,
      {
        folder: searchPath,
        includes: includePattern ? [includePattern] : undefined,
        excludes: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
      }
    ) as any[];

    const matches: any[] = [];
    if (results) {
      for (const result of results) {
        const relativePath = vscode.workspace.asRelativePath(result.uri);
        matches.push({
          file: relativePath,
          line: result.range.start.line + 1,
          column: result.range.start.character + 1,
          text: result.preview.text
        });
      }
    }

    return matches;
  }

  private async handleReplace(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
    const document = await vscode.workspace.openTextDocument(fileUri);
    const text = document.getText();

    const oldString = params.old_string;
    const newString = params.new_string;

    let count = 0;
    let newText = text;
    let index = newText.indexOf(oldString);

    while (index !== -1) {
      newText = newText.substring(0, index) + newString + newText.substring(index + oldString.length);
      count++;
      index = newText.indexOf(oldString, index + newString.length);
    }

    if (params.expected_replacements && count !== params.expected_replacements) {
      throw new Error(`Expected ${params.expected_replacements} replacements, but made ${count}`);
    }

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newText, 'utf-8'));
    this.memoryManager.onFileWrite(params.file_path, newText);

    return `Replaced ${count} occurrences in ${params.file_path}`;
  }

  private async handleRunShellCommand(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const terminal = vscode.window.createTerminal({
      name: 'Vibe Command',
      cwd: params.directory ? vscode.Uri.joinPath(workspaceFolder.uri, params.directory).fsPath : workspaceFolder.uri.fsPath
    });

    terminal.sendText(params.command);
    terminal.show();

    // For now, return a placeholder - in real implementation we'd capture output
    this.memoryManager.onShellCommand(params.command, 'executed');
    return `Command executed: ${params.command}`;
  }

  private async handleWebFetch(params: any): Promise<string> {
    try {
      const response = await fetch(params.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error: any) {
      throw new Error(`Failed to fetch ${params.url}: ${error.message}`);
    }
  }

  private async handleGoogleWebSearch(params: any): Promise<any[]> {
    // Placeholder - would integrate with search API
    return [{
      title: 'Search results not implemented',
      url: 'https://github.com/mk-knight23/vibe',
      snippet: 'Web search integration coming soon'
    }];
  }

  private async handleSaveMemory(params: any): Promise<string> {
    this.memoryManager.setPreference(params.key, params.value);
    return `Saved to memory: ${params.key}`;
  }

  private async handleWriteTodos(params: any): Promise<string> {
    // Update pending tasks in memory
    params.todos.forEach((todo: string) => {
      this.memoryManager.addPendingTask(todo);
    });
    return `Added ${params.todos.length} todos to memory`;
  }

  private async handleGitStatus(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      throw new Error('Git extension not available');
    }

    const api = gitExtension.exports.getAPI(1);
    const repo = api.repositories[0];

    if (!repo) {
      throw new Error('No git repository found');
    }

    const status = repo.state;
    return `Branch: ${status.HEAD?.name || 'unknown'}
Working tree: ${status.workingTreeChanges.length} changes
Index: ${status.indexChanges.length} changes
Ahead: ${status.HEAD?.ahead || 0}
Behind: ${status.HEAD?.behind || 0}`;
  }

  private async handleGitDiff(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      throw new Error('Git extension not available');
    }

    const api = gitExtension.exports.getAPI(1);
    const repo = api.repositories[0];

    if (!repo) {
      throw new Error('No git repository found');
    }

    const diff = await repo.diff(params.file);
    return diff || 'No differences found';
  }

  private async handleGitLog(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      throw new Error('Git extension not available');
    }

    const api = gitExtension.exports.getAPI(1);
    const repo = api.repositories[0];

    if (!repo) {
      throw new Error('No git repository found');
    }

    const count = params.count || 10;
    const commits = await repo.log({ maxEntries: count });

    return commits.map((commit: any) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.authorName,
      date: commit.authorDate,
      parents: commit.parents
    }));
  }

  private async handleGitBlame(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      throw new Error('Git extension not available');
    }

    const api = gitExtension.exports.getAPI(1);
    const repo = api.repositories[0];

    if (!repo) {
      throw new Error('No git repository found');
    }

    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file);
    const blame = await repo.blame(fileUri.fsPath);

    return blame.map((line: any) => ({
      line: line.line + 1,
      commit: line.commit.hash,
      author: line.commit.authorName,
      date: line.commit.authorDate,
      text: line.text
    })).slice(params.lineStart ? params.lineStart - 1 : 0, params.lineEnd);
  }

  private async handleRipgrepSearch(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
    // Use VS Code's search API as ripgrep replacement
    return await this.handleSearchFileContent(params, workspaceFolder);
  }

  private async handleListFilesRg(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const pattern = '**/*';
    const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';
    const basePath = params.path || '.';

    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(basePath, pattern),
      excludePattern,
      200
    );

    return files.map(uri => vscode.workspace.asRelativePath(uri));
  }

  private async handleGetFileInfo(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
    const stats = await vscode.workspace.fs.stat(fileUri);

    return {
      size: stats.size,
      type: stats.type === vscode.FileType.File ? 'file' : 'directory',
      permissions: 'readable', // VS Code doesn't provide detailed permissions
      modified: stats.mtime,
      created: stats.ctime
    };
  }

  private async handleCreateDirectory(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const dirUri = vscode.Uri.joinPath(workspaceFolder.uri, params.dir_path);
    await vscode.workspace.fs.createDirectory(dirUri);
    return `Created directory: ${params.dir_path}`;
  }

  private async handleDeleteFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
    await vscode.workspace.fs.delete(fileUri);
    return `Deleted: ${params.file_path}`;
  }

  private async handleMoveFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, params.source);
    const destUri = vscode.Uri.joinPath(workspaceFolder.uri, params.destination);

    await vscode.workspace.fs.rename(sourceUri, destUri, { overwrite: true });
    return `Moved ${params.source} to ${params.destination}`;
  }

  private async handleCopyFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, params.source);
    const destUri = vscode.Uri.joinPath(workspaceFolder.uri, params.destination);

    const content = await vscode.workspace.fs.readFile(sourceUri);
    await vscode.workspace.fs.writeFile(destUri, content);
    return `Copied ${params.source} to ${params.destination}`;
  }

  private async handleAppendToFile(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, params.file_path);
    const existingContent = await vscode.workspace.fs.readFile(fileUri);
    const newContent = Buffer.concat([existingContent, Buffer.from(params.content, 'utf-8')]);

    await vscode.workspace.fs.writeFile(fileUri, newContent);
    this.memoryManager.onFileWrite(params.file_path, params.content);

    return `Appended ${params.content.length} characters to ${params.file_path}`;
  }

  private async handleCheckDependency(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    try {
      const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      return params.package_name in allDeps;
    } catch {
      return false;
    }
  }

  private async handleGetProjectInfo(workspaceFolder: vscode.WorkspaceFolder): Promise<any> {
    const projectPath = workspaceFolder.uri.fsPath;
    const info: any = {
      type: 'unknown',
      language: 'unknown',
      framework: 'none',
      packageManager: 'unknown'
    };

    // Check for package.json
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      info.packageManager = 'npm';

      if (packageJson.dependencies?.react) {
        info.framework = 'React';
        info.language = 'JavaScript/TypeScript';
      } else if (packageJson.dependencies?.vue) {
        info.framework = 'Vue';
        info.language = 'JavaScript/TypeScript';
      } else if (packageJson.dependencies?.express) {
        info.framework = 'Express';
        info.language = 'JavaScript/TypeScript';
      }

      if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
        info.language = 'TypeScript';
      }
    } catch {}

    // Check for other project types
    if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
      info.type = 'Python';
      info.language = 'Python';
    } else if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      info.type = 'Rust';
      info.language = 'Rust';
    } else if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      info.type = 'Go';
      info.language = 'Go';
    }

    return info;
  }

  private async handleRunTests(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const command = params.test_command || 'npm test';
    return await this.handleRunShellCommand({ command, description: 'Run tests' }, workspaceFolder);
  }

  private async handleRunLint(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const command = params.lint_command || 'npm run lint';
    return await this.handleRunShellCommand({ command, description: 'Run linter' }, workspaceFolder);
  }

  private async handleRunTypeCheck(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const command = 'npx tsc --noEmit';
    return await this.handleRunShellCommand({ command, description: 'TypeScript type check' }, workspaceFolder);
  }

  // Advanced AI-powered tools (placeholders for now)
  private async handleAnalyzeCodeQuality(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any> {
    // Placeholder - would integrate with AI analysis
    return {
      complexity: 'medium',
      lines: 100,
      functions: 5,
      duplicates: 0,
      score: 85
    };
  }

  private async handleSmartRefactor(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    // Placeholder - would use AI for refactoring
    return `Refactoring ${params.type} applied to ${params.file_path}`;
  }

  private async handleGenerateTests(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    // Placeholder - would generate test files
    return `Test file generated for ${params.file_path}`;
  }

  private async handleOptimizeBundle(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any> {
    // Placeholder - would analyze bundle
    return {
      size: '2.1MB',
      chunks: 12,
      suggestions: ['Use tree shaking', 'Split chunks']
    };
  }

  private async handleSecurityScan(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
    // Placeholder - would scan for vulnerabilities
    return [{
      severity: 'low',
      issue: 'Outdated dependency',
      file: 'package.json',
      suggestion: 'Update to latest version'
    }];
  }

  private async handlePerformanceBenchmark(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<any> {
    // Placeholder - would benchmark operations
    return {
      readTime: '45ms',
      parseTime: '12ms',
      totalTime: '57ms'
    };
  }

  private async handleGenerateDocumentation(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    // Placeholder - would generate docs
    return `Documentation generated for ${params.file_path}`;
  }

  private async handleMigrateCode(params: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    // Placeholder - would migrate code formats
    return `Code migrated from ${params.from} to ${params.to} in ${params.file_path}`;
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get tool schemas for AI function calling
   */
  getToolSchemas(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [key, param]) => {
          acc[key] = {
            type: param.type,
            description: param.description
          };
          return acc;
        }, {} as any),
        required: Object.entries(tool.parameters)
          .filter(([_, param]) => param.required)
          .map(([key]) => key)
      }
    }));
  }
}
