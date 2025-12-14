import * as vscode from 'vscode';
import { MemoryManager, TaskMemory } from './MemoryManager';

export interface TaskHistoryItem {
  id: string;
  label: string;
  description: string;
  timestamp: number;
  duration: number;
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  errors: string[];
  suggestions: string[];
  collapsibleState: vscode.TreeItemCollapsibleState;
  command?: vscode.Command;
}

export class TaskHistoryProvider implements vscode.TreeDataProvider<TaskHistoryItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskHistoryItem | undefined | null | void> = new vscode.EventEmitter<TaskHistoryItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskHistoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private memoryManager: MemoryManager;
  private searchFilter: string = '';
  private statusFilter: 'all' | 'success' | 'error' = 'all';

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setSearchFilter(filter: string): void {
    this.searchFilter = filter.toLowerCase();
    this.refresh();
  }

  setStatusFilter(filter: 'all' | 'success' | 'error'): void {
    this.statusFilter = filter;
    this.refresh();
  }

  getTreeItem(element: TaskHistoryItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
    treeItem.description = element.description;
    treeItem.tooltip = this.buildTooltip(element);
    treeItem.iconPath = this.getIcon(element);
    treeItem.command = element.command;
    treeItem.contextValue = `taskHistory.${element.success ? 'success' : 'error'}`;
    return treeItem;
  }

  getChildren(element?: TaskHistoryItem): Thenable<TaskHistoryItem[]> {
    if (!element) {
      // Root level - return filtered task history
      const state = this.memoryManager.getState();
      const tasks = state.taskHistory.filter(task => this.matchesFilter(task));

      return Promise.resolve(tasks.map(task => this.createTaskItem(task)));
    } else {
      // Child level - return details for the task
      return Promise.resolve(this.createTaskDetails(element));
    }
  }

  private matchesFilter(task: TaskMemory): boolean {
    // Status filter
    if (this.statusFilter === 'success' && !task.success) return false;
    if (this.statusFilter === 'error' && task.success) return false;

    // Search filter
    if (this.searchFilter) {
      const searchText = `${task.description} ${task.filesCreated.join(' ')} ${task.filesModified.join(' ')}`.toLowerCase();
      return searchText.includes(this.searchFilter);
    }

    return true;
  }

  private createTaskItem(task: TaskMemory): TaskHistoryItem {
    const date = new Date(task.timestamp).toLocaleString();
    const duration = task.duration > 0 ? ` (${(task.duration / 1000).toFixed(1)}s)` : '';
    const status = task.success ? '✓' : '✗';

    return {
      id: `task-${task.timestamp}`,
      label: `${status} ${task.description}`,
      description: `${date}${duration}`,
      timestamp: task.timestamp,
      duration: task.duration,
      success: task.success,
      filesCreated: task.filesCreated,
      filesModified: task.filesModified,
      errors: task.errors,
      suggestions: task.suggestions,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      command: {
        command: 'vibe.taskHistory.showDetails',
        title: 'Show Task Details',
        arguments: [task]
      }
    };
  }

  private createTaskDetails(taskItem: TaskHistoryItem): TaskHistoryItem[] {
    const details: TaskHistoryItem[] = [];

    // Files created
    if (taskItem.filesCreated.length > 0) {
      details.push({
        id: `${taskItem.id}-created`,
        label: `📁 Created Files (${taskItem.filesCreated.length})`,
        description: '',
        timestamp: taskItem.timestamp,
        duration: taskItem.duration,
        success: taskItem.success,
        filesCreated: taskItem.filesCreated,
        filesModified: taskItem.filesModified,
        errors: taskItem.errors,
        suggestions: taskItem.suggestions,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      } as TaskHistoryItem);
    }

    // Files modified
    if (taskItem.filesModified.length > 0) {
      details.push({
        id: `${taskItem.id}-modified`,
        label: `📝 Modified Files (${taskItem.filesModified.length})`,
        description: '',
        timestamp: taskItem.timestamp,
        duration: taskItem.duration,
        success: taskItem.success,
        filesCreated: taskItem.filesCreated,
        filesModified: taskItem.filesModified,
        errors: taskItem.errors,
        suggestions: taskItem.suggestions,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      } as TaskHistoryItem);
    }

    // Errors
    if (taskItem.errors.length > 0) {
      details.push({
        id: `${taskItem.id}-errors`,
        label: `❌ Errors (${taskItem.errors.length})`,
        description: '',
        timestamp: taskItem.timestamp,
        duration: taskItem.duration,
        success: taskItem.success,
        filesCreated: taskItem.filesCreated,
        filesModified: taskItem.filesModified,
        errors: taskItem.errors,
        suggestions: taskItem.suggestions,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      } as TaskHistoryItem);
    }

    // Suggestions
    if (taskItem.suggestions.length > 0) {
      details.push({
        id: `${taskItem.id}-suggestions`,
        label: `💡 Suggestions (${taskItem.suggestions.length})`,
        description: '',
        timestamp: taskItem.timestamp,
        duration: taskItem.duration,
        success: taskItem.success,
        filesCreated: taskItem.filesCreated,
        filesModified: taskItem.filesModified,
        errors: taskItem.errors,
        suggestions: taskItem.suggestions,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      } as TaskHistoryItem);
    }

    return details;
  }

  private buildTooltip(item: TaskHistoryItem): string {
    let tooltip = `${item.label}\n${item.description}\n\n`;

    if (item.filesCreated.length > 0) {
      tooltip += `Created: ${item.filesCreated.join(', ')}\n`;
    }

    if (item.filesModified.length > 0) {
      tooltip += `Modified: ${item.filesModified.join(', ')}\n`;
    }

    if (item.errors.length > 0) {
      tooltip += `Errors: ${item.errors.length}\n`;
    }

    if (item.duration > 0) {
      tooltip += `Duration: ${(item.duration / 1000).toFixed(1)}s\n`;
    }

    return tooltip.trim();
  }

  private getIcon(item: TaskHistoryItem): vscode.ThemeIcon {
    if (item.success) {
      return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
    } else {
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
    }
  }

  /**
   * Get detailed information about a task
   */
  getTaskDetails(task: TaskMemory): string {
    let details = `# Task Details\n\n`;
    details += `**Description:** ${task.description}\n`;
    details += `**Timestamp:** ${new Date(task.timestamp).toLocaleString()}\n`;
    details += `**Duration:** ${(task.duration / 1000).toFixed(1)} seconds\n`;
    details += `**Status:** ${task.success ? '✅ Success' : '❌ Failed'}\n\n`;

    if (task.filesCreated.length > 0) {
      details += `## Files Created\n`;
      task.filesCreated.forEach(file => {
        details += `- ${file}\n`;
      });
      details += '\n';
    }

    if (task.filesModified.length > 0) {
      details += `## Files Modified\n`;
      task.filesModified.forEach(file => {
        details += `- ${file}\n`;
      });
      details += '\n';
    }

    if (task.errors.length > 0) {
      details += `## Errors\n`;
      task.errors.forEach(error => {
        details += `- ${error}\n`;
      });
      details += '\n';
    }

    if (task.suggestions.length > 0) {
      details += `## Suggestions\n`;
      task.suggestions.forEach(suggestion => {
        details += `- ${suggestion}\n`;
      });
      details += '\n';
    }

    return details;
  }

  /**
   * Search tasks by query
   */
  searchTasks(query: string): TaskMemory[] {
    const state = this.memoryManager.getState();
    const lowerQuery = query.toLowerCase();

    return state.taskHistory.filter(task => {
      const searchText = `${task.description} ${task.filesCreated.join(' ')} ${task.filesModified.join(' ')} ${task.errors.join(' ')}`.toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }

  /**
   * Get tasks by date range
   */
  getTasksByDateRange(startDate: Date, endDate: Date): TaskMemory[] {
    const state = this.memoryManager.getState();

    return state.taskHistory.filter(task => {
      const taskDate = new Date(task.timestamp);
      return taskDate >= startDate && taskDate <= endDate;
    });
  }

  /**
   * Get recent tasks (last N tasks)
   */
  getRecentTasks(limit: number = 10): TaskMemory[] {
    const state = this.memoryManager.getState();
    return state.taskHistory.slice(0, limit);
  }

  /**
   * Get failed tasks
   */
  getFailedTasks(): TaskMemory[] {
    const state = this.memoryManager.getState();
    return state.taskHistory.filter(task => !task.success);
  }

  /**
   * Get successful tasks
   */
  getSuccessfulTasks(): TaskMemory[] {
    const state = this.memoryManager.getState();
    return state.taskHistory.filter(task => task.success);
  }

  /**
   * Clear task history
   */
  clearHistory(): void {
    // This would need to be implemented in MemoryManager
    // For now, we'll just refresh the view
    this.refresh();
  }

  /**
   * Export task history to JSON
   */
  exportHistory(): string {
    const state = this.memoryManager.getState();
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      tasks: state.taskHistory
    }, null, 2);
  }

  /**
   * Import task history from JSON
   */
  importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.tasks && Array.isArray(data.tasks)) {
        // This would need to be implemented in MemoryManager
        // For now, just refresh
        this.refresh();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get statistics about task history
   */
  getStatistics(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageDuration: number;
    totalFilesCreated: number;
    totalFilesModified: number;
  } {
    const state = this.memoryManager.getState();
    const tasks = state.taskHistory;

    const successfulTasks = tasks.filter(t => t.success).length;
    const failedTasks = tasks.length - successfulTasks;
    const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
    const averageDuration = tasks.length > 0 ? totalDuration / tasks.length : 0;

    const totalFilesCreated = tasks.reduce((sum, t) => sum + t.filesCreated.length, 0);
    const totalFilesModified = tasks.reduce((sum, t) => sum + t.filesModified.length, 0);

    return {
      totalTasks: tasks.length,
      successfulTasks,
      failedTasks,
      averageDuration,
      totalFilesCreated,
      totalFilesModified
    };
  }
}

/**
 * Task History Tree View Manager
 */
export class TaskHistoryViewManager {
  private provider: TaskHistoryProvider;
  private treeView: vscode.TreeView<TaskHistoryItem>;
  private searchInput: vscode.StatusBarItem;
  private filterInput: vscode.StatusBarItem;

  constructor(memoryManager: MemoryManager, context: vscode.ExtensionContext) {
    this.provider = new TaskHistoryProvider(memoryManager);

    // Create tree view
    this.treeView = vscode.window.createTreeView('vibeTaskHistory', {
      treeDataProvider: this.provider,
      showCollapseAll: true,
      canSelectMany: false
    });

    context.subscriptions.push(this.treeView);

    // Create status bar items
    this.searchInput = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.searchInput.command = 'vibe.taskHistory.search';
    this.searchInput.tooltip = 'Search task history';
    this.searchInput.text = '$(search) Search Tasks';

    this.filterInput = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.filterInput.command = 'vibe.taskHistory.filter';
    this.filterInput.tooltip = 'Filter by status';
    this.filterInput.text = '$(filter) All';

    context.subscriptions.push(this.searchInput, this.filterInput);

    // Register commands
    this.registerCommands(context);
  }

  private registerCommands(context: vscode.ExtensionContext): void {
    // Show task details
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.showDetails', (task: TaskMemory) => {
        const details = this.provider.getTaskDetails(task);
        vscode.workspace.openTextDocument({
          content: details,
          language: 'markdown'
        }).then(doc => {
          vscode.window.showTextDocument(doc, { preview: false });
        });
      })
    );

    // Search command
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.search', async () => {
        const query = await vscode.window.showInputBox({
          prompt: 'Search task history',
          placeHolder: 'Enter search terms...'
        });

        if (query !== undefined) {
          this.provider.setSearchFilter(query);
          this.searchInput.text = query ? `$(search) "${query}"` : '$(search) Search Tasks';
        }
      })
    );

    // Filter command
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.filter', async () => {
        const filter = await vscode.window.showQuickPick(
          [
            { label: 'All Tasks', value: 'all' as const },
            { label: 'Successful Only', value: 'success' as const },
            { label: 'Failed Only', value: 'error' as const }
          ],
          { placeHolder: 'Filter tasks by status' }
        );

        if (filter) {
          this.provider.setStatusFilter(filter.value);
          this.filterInput.text = `$(filter) ${filter.label}`;
        }
      })
    );

    // Clear filters
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.clearFilters', () => {
        this.provider.setSearchFilter('');
        this.provider.setStatusFilter('all');
        this.searchInput.text = '$(search) Search Tasks';
        this.filterInput.text = '$(filter) All';
      })
    );

    // Refresh
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.refresh', () => {
        this.provider.refresh();
      })
    );

    // Show statistics
    context.subscriptions.push(
      vscode.commands.registerCommand('vibe.taskHistory.showStats', () => {
        const stats = this.provider.getStatistics();
        const message = `Task History Stats:
• Total Tasks: ${stats.totalTasks}
• Successful: ${stats.successfulTasks}
• Failed: ${stats.failedTasks}
• Average Duration: ${(stats.averageDuration / 1000).toFixed(1)}s
• Files Created: ${stats.totalFilesCreated}
• Files Modified: ${stats.totalFilesModified}`;

        vscode.window.showInformationMessage(message);
      })
    );
  }

  /**
   * Show the task history view
   */
  show(): void {
    // Focus the tree view without revealing a specific item
    vscode.commands.executeCommand('vibeTaskHistory.focus');
    this.searchInput.show();
    this.filterInput.show();
  }

  /**
   * Hide the task history view
   */
  hide(): void {
    this.searchInput.hide();
    this.filterInput.hide();
  }

  /**
   * Refresh the view
   */
  refresh(): void {
    this.provider.refresh();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.treeView.dispose();
    this.searchInput.dispose();
    this.filterInput.dispose();
  }
}
