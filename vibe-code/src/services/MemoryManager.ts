import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface WorkspaceMemory {
  files: string[];
  structure: string;
  fileSummaries: Record<string, string>;
  lastUpdated: string;
  recentChanges: string[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  gitBranch: string;
  gitRemote: string;
}

export interface TaskMemory {
  description: string;
  filesCreated: string[];
  filesModified: string[];
  errors: string[];
  suggestions: string[];
  timestamp: number;
  duration: number;
  success: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens?: number;
}

interface StoryMemory {
  projectGoal: string;
  milestones: string[];
  challenges: string[];
  solutions: string[];
  learnings: string[];
  timeline: Array<{ date: string; event: string }>;
}

interface SessionState {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  activeTasks: string[];
  currentContext: string;
  sessionGoals: string[];
  completedInSession: string[];
}

interface ConversationState {
  keyPoints: string[];
  decisions: string[];
  currentArchitecture: Record<string, any>;
  projectType: string;
  pendingTasks: string[];
  workspaceMemory: WorkspaceMemory;
  taskHistory: TaskMemory[];
  chatHistory: ChatMessage[];
  storyMemory: StoryMemory;
  userPreferences: Record<string, any>;
  codePatterns: string[];
  frequentCommands: Record<string, number>;
  sessionState: SessionState;
}

export class MemoryManager {
  private state: ConversationState;
  private memoryFile: string;
  private maxTaskHistory = 20;
  private maxChanges = 50;
  private maxChatHistory = 100;

  constructor(workspaceFolder?: vscode.WorkspaceFolder) {
    const workspaceDir = workspaceFolder?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.memoryFile = path.join(workspaceDir, '.vibe', 'memory.json');
    this.state = this.loadState();
  }

  private loadState(): ConversationState {
    const defaultState: ConversationState = {
      keyPoints: [],
      decisions: [],
      currentArchitecture: {},
      projectType: 'unknown',
      pendingTasks: [],
      workspaceMemory: {
        files: [],
        structure: '',
        fileSummaries: {},
        lastUpdated: '',
        recentChanges: [],
        dependencies: {},
        scripts: {},
        gitBranch: '',
        gitRemote: ''
      },
      taskHistory: [],
      chatHistory: [],
      storyMemory: {
        projectGoal: '',
        milestones: [],
        challenges: [],
        solutions: [],
        learnings: [],
        timeline: []
      },
      userPreferences: {},
      codePatterns: [],
      frequentCommands: {},
      sessionState: {
        sessionId: this.generateSessionId(),
        startTime: Date.now(),
        lastActivity: Date.now(),
        activeTasks: [],
        currentContext: '',
        sessionGoals: [],
        completedInSession: []
      }
    };

    try {
      if (fs.existsSync(this.memoryFile)) {
        const loaded = JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
        // Merge with defaults to handle missing fields
        return {
          ...defaultState,
          ...loaded,
          storyMemory: {
            ...defaultState.storyMemory,
            ...(loaded.storyMemory || {})
          },
          workspaceMemory: {
            ...defaultState.workspaceMemory,
            ...(loaded.workspaceMemory || {})
          }
        };
      }
    } catch (error) {}

    return defaultState;
  }

  private saveState(): void {
    try {
      const dir = path.dirname(this.memoryFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.memoryFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  async updateWorkspaceMemory(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const cwd = workspaceFolder.uri.fsPath;

      this.state.workspaceMemory.files = await this.getFileList(cwd);
      this.state.workspaceMemory.structure = await this.getDirectoryTree(cwd);

      // Detect project type and dependencies
      const packageJsonPath = path.join(cwd, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        this.state.workspaceMemory.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        this.state.workspaceMemory.scripts = pkg.scripts || {};

        if (pkg.dependencies?.react) this.state.projectType = 'React';
        else if (pkg.dependencies?.next) this.state.projectType = 'Next.js';
        else if (pkg.dependencies?.vue) this.state.projectType = 'Vue';
        else if (pkg.dependencies?.express) this.state.projectType = 'Node.js/Express';
        else this.state.projectType = 'Node.js';
      } else if (fs.existsSync(path.join(cwd, 'requirements.txt'))) {
        this.state.projectType = 'Python';
      } else if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
        this.state.projectType = 'Rust';
      } else if (fs.existsSync(path.join(cwd, 'go.mod'))) {
        this.state.projectType = 'Go';
      }

      // Enhanced Git info - using VS Code git extension if available
      await this.updateGitInfo();

      // Update file summaries for recently modified files
      await this.updateFileSummaries();

      this.saveState();
    } catch (error) {}
  }

  private async updateGitInfo(): Promise<void> {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        const repo = api.repositories[0];
        if (repo) {
          this.state.workspaceMemory.gitBranch = repo.state.HEAD?.name || '';

          // Get remote URL
          const remotes = repo.state.remotes;
          if (remotes.length > 0) {
            this.state.workspaceMemory.gitRemote = remotes[0].fetchUrl || remotes[0].pushUrl || '';
          }

          // Get recent commits
          try {
            const commits = await repo.log({ maxEntries: 5 });
            this.state.workspaceMemory.recentChanges.unshift(
              ...commits.map((commit: any) => `Git: ${commit.message} (${commit.hash.substring(0, 7)})`)
            );
            this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);
          } catch {}

          // Get status
          const status = repo.state.workingTreeChanges.length + repo.state.indexChanges.length;
          if (status > 0) {
            this.state.workspaceMemory.recentChanges.unshift(`Git: ${status} uncommitted changes`);
            this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);
          }
        }
      }
    } catch {}
  }

  private async updateFileSummaries(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      // Get recently opened files
      const recentlyOpened = vscode.workspace.textDocuments
        .filter(doc => !doc.isUntitled && doc.uri.scheme === 'file')
        .slice(0, 10);

      for (const doc of recentlyOpened) {
        const relativePath = vscode.workspace.asRelativePath(doc.uri);
        if (!this.state.workspaceMemory.fileSummaries[relativePath]) {
          const content = doc.getText();
          const summary = content.substring(0, 200).replace(/\n/g, ' ');
          this.state.workspaceMemory.fileSummaries[relativePath] = summary;
        }
      }
    } catch {}
  }

  private async getFileList(dir: string): Promise<string[]> {
    try {
      // Use VS Code workspace findFiles for better performance
      const pattern = '**/*';
      const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';
      const uris = await vscode.workspace.findFiles(pattern, excludePattern, 100);
      return uris.map(uri => vscode.workspace.asRelativePath(uri)).slice(0, 100);
    } catch {
      return [];
    }
  }

  private async getDirectoryTree(dir: string): Promise<string> {
    try {
      // Simple tree representation using VS Code workspace
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return 'Unable to generate tree';

      const pattern = '**/*';
      const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';
      const uris = await vscode.workspace.findFiles(pattern, excludePattern, 50);
      const relativePaths = uris.map(uri => vscode.workspace.asRelativePath(uri));
      const dirs = new Set<string>();

      relativePaths.forEach(filePath => {
        const parts = filePath.split('/');
        for (let i = 1; i <= parts.length; i++) {
          dirs.add(parts.slice(0, i).join('/'));
        }
      });

      const sortedDirs = Array.from(dirs).sort();
      const result = sortedDirs.map(dir => dir.endsWith('/') ? dir : dir + '/').join('\n');
      return result.substring(0, 1000);
    } catch {
      return 'Unable to generate tree';
    }
  }

  onFileWrite(filePath: string, content: string): void {
    this.state.workspaceMemory.lastUpdated = filePath;
    this.state.workspaceMemory.recentChanges.unshift(`Created/Updated: ${filePath}`);
    this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);

    // Store summary
    const summary = content.substring(0, 200).replace(/\n/g, ' ');
    this.state.workspaceMemory.fileSummaries[filePath] = summary;

    this.updateWorkspaceMemory();
  }

  onFileRead(filePath: string, content: string): void {
    if (!this.state.workspaceMemory.fileSummaries[filePath]) {
      const summary = content.substring(0, 200).replace(/\n/g, ' ');
      this.state.workspaceMemory.fileSummaries[filePath] = summary;
      this.saveState();
    }
  }

  onShellCommand(command: string, result: string): void {
    this.state.workspaceMemory.recentChanges.unshift(`Shell: ${command}`);
    this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);
    this.saveState();
  }

  onError(error: string): void {
    const currentTask = this.state.taskHistory[0];
    if (currentTask) {
      currentTask.errors.push(error);
      this.saveState();
    }
  }

  startTask(description: string): void {
    const task: TaskMemory = {
      description,
      filesCreated: [],
      filesModified: [],
      errors: [],
      suggestions: [],
      timestamp: Date.now(),
      duration: 0,
      success: true
    };

    this.state.taskHistory.unshift(task);
    this.state.taskHistory = this.state.taskHistory.slice(0, this.maxTaskHistory);
    this.saveState();
  }

  completeTask(success: boolean, duration: number): void {
    if (this.state.taskHistory[0]) {
      this.state.taskHistory[0].success = success;
      this.state.taskHistory[0].duration = duration;
      this.saveState();
    }
  }

  addChatMessage(role: 'user' | 'assistant', content: string, tokens?: number): void {
    this.state.chatHistory.push({
      role,
      content: content.substring(0, 500),
      timestamp: Date.now(),
      tokens
    });
    this.state.chatHistory = this.state.chatHistory.slice(-this.maxChatHistory);
    this.saveState();
  }

  addMilestone(milestone: string): void {
    if (!this.state.storyMemory.milestones.includes(milestone)) {
      this.state.storyMemory.milestones.push(milestone);
      this.state.storyMemory.timeline.push({
        date: new Date().toISOString().split('T')[0],
        event: milestone
      });
      this.saveState();
    }
  }

  addChallenge(challenge: string, solution?: string): void {
    this.state.storyMemory.challenges.push(challenge);
    if (solution) this.state.storyMemory.solutions.push(solution);
    this.saveState();
  }

  addLearning(learning: string): void {
    if (!this.state.storyMemory.learnings.includes(learning)) {
      this.state.storyMemory.learnings.push(learning);
      this.saveState();
    }
  }

  setProjectGoal(goal: string): void {
    this.state.storyMemory.projectGoal = goal;
    this.saveState();
  }

  trackCommand(command: string): void {
    this.state.frequentCommands[command] = (this.state.frequentCommands[command] || 0) + 1;
    this.saveState();
  }

  addCodePattern(pattern: string): void {
    if (!this.state.codePatterns.includes(pattern)) {
      this.state.codePatterns.push(pattern);
      this.saveState();
    }
  }

  setPreference(key: string, value: any): void {
    this.state.userPreferences[key] = value;
    this.saveState();
  }

  searchChatHistory(query: string): ChatMessage[] {
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

    const scored = this.state.chatHistory.map(msg => {
      const content = msg.content.toLowerCase();
      let score = 0;

      // Exact phrase match (high score)
      if (content.includes(lowerQuery)) score += 100;

      // Term frequency scoring (only if at least one term matches)
      let termMatches = 0;
      queryTerms.forEach(term => {
        const matches = (content.match(new RegExp(term, 'g')) || []).length;
        if (matches > 0) {
          termMatches++;
          score += matches * 2;
        }
      });

      // Require at least one term match
      if (termMatches === 0) score = 0;

      // Recency bonus (only for matches)
      if (score > 0) {
        const age = Date.now() - msg.timestamp;
        const recencyBonus = Math.max(0, 5 - (age / (1000 * 60 * 60 * 24)));
        score += recencyBonus;
      }

      return { msg, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.msg);
  }

  addKeyPoint(point: string): void {
    if (!this.state.keyPoints.includes(point)) {
      this.state.keyPoints.push(point);
      this.saveState();
    }
  }

  addDecision(decision: string): void {
    this.state.decisions.push(decision);
    this.saveState();
  }

  addPendingTask(task: string): void {
    if (!this.state.pendingTasks.includes(task)) {
      this.state.pendingTasks.push(task);
      this.saveState();
    }
  }

  removePendingTask(task: string): void {
    this.state.pendingTasks = this.state.pendingTasks.filter(t => t !== task);
    this.saveState();
  }

  getMemoryContext(): string {
    const parts: string[] = [];

    parts.push(`# Project Context`);
    parts.push(`Type: ${this.state.projectType}`);
    parts.push(`Files: ${this.state.workspaceMemory.files.length} tracked`);
    if (this.state.workspaceMemory.gitBranch) parts.push(`Branch: ${this.state.workspaceMemory.gitBranch}`);
    if (this.state.workspaceMemory.lastUpdated) parts.push(`Last updated: ${this.state.workspaceMemory.lastUpdated}`);

    if (this.state.storyMemory.projectGoal) {
      parts.push(`\n# Project Goal`);
      parts.push(this.state.storyMemory.projectGoal);
    }

    if (this.state.storyMemory.milestones.length > 0) {
      parts.push(`\n# Milestones Achieved`);
      this.state.storyMemory.milestones.slice(-5).forEach(m => parts.push(`✓ ${m}`));
    }

    if (this.state.workspaceMemory.recentChanges.length > 0) {
      parts.push(`\n# Recent Changes`);
      this.state.workspaceMemory.recentChanges.slice(0, 5).forEach(c => parts.push(`- ${c}`));
    }

    if (this.state.keyPoints.length > 0) {
      parts.push(`\n# Key Points`);
      this.state.keyPoints.slice(-5).forEach(p => parts.push(`- ${p}`));
    }

    if (this.state.decisions.length > 0) {
      parts.push(`\n# Decisions Made`);
      this.state.decisions.slice(-3).forEach(d => parts.push(`- ${d}`));
    }

    if (this.state.pendingTasks.length > 0) {
      parts.push(`\n# Pending Tasks`);
      this.state.pendingTasks.forEach(t => parts.push(`- ${t}`));
    }

    if (this.state.storyMemory.challenges.length > 0) {
      parts.push(`\n# Recent Challenges & Solutions`);
      this.state.storyMemory.challenges.slice(-3).forEach((c, i) => {
        parts.push(`Challenge: ${c}`);
        if (this.state.storyMemory.solutions[i]) parts.push(`Solution: ${this.state.storyMemory.solutions[i]}`);
      });
    }

    if (this.state.storyMemory.learnings.length > 0) {
      parts.push(`\n# Key Learnings`);
      this.state.storyMemory.learnings.slice(-5).forEach(l => parts.push(`- ${l}`));
    }

    if (this.state.taskHistory.length > 0) {
      parts.push(`\n# Recent Tasks`);
      this.state.taskHistory.slice(0, 3).forEach(t => {
        const status = t.success ? '✓' : '✗';
        parts.push(`${status} ${t.description} (${(t.duration / 1000).toFixed(1)}s)`);
        if (t.filesCreated.length > 0) parts.push(`  Created: ${t.filesCreated.join(', ')}`);
        if (t.errors.length > 0) parts.push(`  Errors: ${t.errors.length}`);
      });
    }

    if (Object.keys(this.state.workspaceMemory.dependencies).length > 0) {
      parts.push(`\n# Key Dependencies`);
      Object.entries(this.state.workspaceMemory.dependencies).slice(0, 10).forEach(([k, v]) => {
        parts.push(`- ${k}: ${v}`);
      });
    }

    if (this.state.workspaceMemory.structure) {
      parts.push(`\n# Project Structure`);
      parts.push(this.state.workspaceMemory.structure.substring(0, 500));
    }

    return parts.join('\n');
  }

  summarizeOldMessages(messages: any[]): any[] {
    if (messages.length <= 10) return messages;

    const systemMsg = messages[0];
    const recentMsgs = messages.slice(-6);
    const oldMsgs = messages.slice(1, -6);

    // Create summary of old messages
    const summary = {
      role: 'system',
      content: `# Previous Conversation Summary\n${oldMsgs.length} messages summarized:\n- User made ${oldMsgs.filter((m: any) => m.role === 'user').length} requests\n- AI provided ${oldMsgs.filter((m: any) => m.role === 'assistant').length} responses\n- ${oldMsgs.filter((m: any) => m.role === 'tool').length} tool executions\n\nContinue from recent context below.`
    };

    return [systemMsg, summary, ...recentMsgs];
  }

  clear(): void {
    this.state = {
      keyPoints: [],
      decisions: [],
      currentArchitecture: {},
      projectType: 'unknown',
      pendingTasks: [],
      workspaceMemory: {
        files: [],
        structure: '',
        fileSummaries: {},
        lastUpdated: '',
        recentChanges: [],
        dependencies: {},
        scripts: {},
        gitBranch: '',
        gitRemote: ''
      },
      taskHistory: [],
      chatHistory: [],
      storyMemory: {
        projectGoal: '',
        milestones: [],
        challenges: [],
        solutions: [],
        learnings: [],
        timeline: []
      },
      userPreferences: {},
      codePatterns: [],
      frequentCommands: {},
      sessionState: {
        sessionId: this.generateSessionId(),
        startTime: Date.now(),
        lastActivity: Date.now(),
        activeTasks: [],
        currentContext: '',
        sessionGoals: [],
        completedInSession: []
      }
    };
    this.saveState();
  }

  getState(): ConversationState {
    return this.state;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Session continuity methods
  startSession(): void {
    this.state.sessionState = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      activeTasks: [],
      currentContext: '',
      sessionGoals: [],
      completedInSession: []
    };
    this.saveState();
  }

  updateSessionActivity(): void {
    this.state.sessionState.lastActivity = Date.now();
    this.saveState();
  }

  addSessionGoal(goal: string): void {
    if (!this.state.sessionState.sessionGoals.includes(goal)) {
      this.state.sessionState.sessionGoals.push(goal);
      this.saveState();
    }
  }

  completeSessionTask(task: string): void {
    if (!this.state.sessionState.completedInSession.includes(task)) {
      this.state.sessionState.completedInSession.push(task);
      this.saveState();
    }
  }

  getSessionSummary(): string {
    const session = this.state.sessionState;
    const duration = (Date.now() - session.startTime) / 1000 / 60; // minutes

    const parts: string[] = [];
    parts.push(`# Session Summary (${duration.toFixed(1)} minutes)`);
    parts.push(`Session ID: ${session.sessionId}`);

    if (session.sessionGoals.length > 0) {
      parts.push(`\nGoals: ${session.sessionGoals.join(', ')}`);
    }

    if (session.completedInSession.length > 0) {
      parts.push(`Completed: ${session.completedInSession.length} tasks`);
      session.completedInSession.forEach(task => parts.push(`✓ ${task}`));
    }

    if (session.activeTasks.length > 0) {
      parts.push(`Active: ${session.activeTasks.join(', ')}`);
    }

    return parts.join('\n');
  }

  // Multi-file reading capabilities
  async readMultipleFiles(filePaths: string[], maxLinesPerFile: number = 50): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) return results;

    for (const relativePath of filePaths.slice(0, 10)) { // Limit to 10 files
      try {
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const lines = document.getText().split('\n');

        // Get first maxLinesPerFile lines or the whole file if smaller
        const content = lines.slice(0, maxLinesPerFile).join('\n');
        const truncated = lines.length > maxLinesPerFile ? `\n[... ${lines.length - maxLinesPerFile} more lines ...]` : '';

        results[relativePath] = content + truncated;

        // Update memory with file read
        this.onFileRead(relativePath, content);
      } catch (error) {
        results[relativePath] = `Error reading file: ${(error as Error).message}`;
      }
    }

    return results;
  }

  // Folder-level context awareness
  async getFolderContext(folderPath: string, includeSubfolders: boolean = false): Promise<{
    files: string[];
    structure: string;
    summaries: Record<string, string>;
    dependencies: Record<string, string>;
  }> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return { files: [], structure: '', summaries: {}, dependencies: {} };
    }

    const fullFolderPath = vscode.Uri.joinPath(workspaceFolder.uri, folderPath);
    const folderUri = vscode.Uri.parse(fullFolderPath.toString());

    // Get files in folder
    let pattern = `${folderPath}/**/*`;
    if (!includeSubfolders) {
      pattern = `${folderPath}/*`;
    }

    const excludePattern = '**/{node_modules,.git,dist,build,.next,.vscode}/**';
    const fileUris = await vscode.workspace.findFiles(pattern, excludePattern, 50);

    const files = fileUris.map(uri => vscode.workspace.asRelativePath(uri));
    const summaries: Record<string, string> = {};

    // Generate summaries for files
    for (const file of files.slice(0, 20)) { // Limit to 20 files
      try {
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, file);
        const document = await vscode.workspace.openTextDocument(uri);
        const content = document.getText();
        summaries[file] = content.substring(0, 300).replace(/\n/g, ' ');
      } catch {
        // Skip files that can't be read
      }
    }

    // Get folder structure
    const structure = files.map(file => {
      const relativeToFolder = file.replace(`${folderPath}/`, '');
      return relativeToFolder;
    }).join('\n');

    // Get dependencies if package.json exists
    let dependencies: Record<string, string> = {};
    try {
      const packageJsonUri = vscode.Uri.joinPath(folderUri, 'package.json');
      const packageJsonDoc = await vscode.workspace.openTextDocument(packageJsonUri);
      const pkg = JSON.parse(packageJsonDoc.getText());
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      // No package.json or can't read it
    }

    return {
      files,
      structure,
      summaries,
      dependencies
    };
  }

  // Enhanced context injection for prompts
  getEnhancedContext(additionalFiles: string[] = []): string {
    let context = this.getMemoryContext();

    // Add context from additional files if requested
    if (additionalFiles.length > 0) {
      context += '\n\n# Additional File Context';
      for (const file of additionalFiles.slice(0, 5)) { // Limit to 5 additional files
        const summary = this.state.workspaceMemory.fileSummaries[file];
        if (summary) {
          context += `\n## ${file}\n${summary}`;
        }
      }
    }

    // Add current workspace state
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      context += `\n\n# Current Workspace State`;
      context += `\nRoot: ${workspaceFolder.name}`;
      context += `\nPath: ${workspaceFolder.uri.fsPath}`;

      // Add open editors context
      const openEditors = vscode.workspace.textDocuments
        .filter(doc => !doc.isUntitled)
        .slice(0, 5);

      if (openEditors.length > 0) {
        context += `\n\n# Open Editors`;
        openEditors.forEach(doc => {
          const relativePath = vscode.workspace.asRelativePath(doc.uri);
          context += `\n- ${relativePath}`;
        });
      }
    }

    return context;
  }

  // Git-aware context
  async getGitContext(): Promise<string> {
    const context: string[] = [];

    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      if (gitExtension) {
        const api = gitExtension.getAPI(1);
        const repo = api.repositories[0];

        if (repo) {
          context.push(`# Git Context`);
          context.push(`Branch: ${repo.state.HEAD?.name || 'unknown'}`);

          // Remote info
          const remotes = repo.state.remotes;
          if (remotes.length > 0) {
            context.push(`Remote: ${remotes[0].fetchUrl || remotes[0].pushUrl || 'none'}`);
          }

          // Status
          const workingTreeChanges = repo.state.workingTreeChanges.length;
          const indexChanges = repo.state.indexChanges.length;
          context.push(`Status: ${workingTreeChanges} working tree, ${indexChanges} staged changes`);

          // Recent commits
          try {
            const commits = await repo.log({ maxEntries: 3 });
            if (commits.length > 0) {
              context.push(`\nRecent Commits:`);
              commits.forEach((commit: any) => {
                context.push(`- ${commit.hash.substring(0, 7)}: ${commit.message}`);
              });
            }
          } catch {}

          // Current branch comparison
          try {
            const aheadBehind = await repo.getBranch('HEAD')?.aheadBehind;
            if (aheadBehind) {
              context.push(`Branch Status: ${aheadBehind.ahead} ahead, ${aheadBehind.behind} behind`);
            }
          } catch {}
        }
      }
    } catch (error) {
      context.push(`Git Context: Error retrieving git information`);
    }

    return context.join('\n');
  }

  // Advanced Memory System - Story Memory
  addStoryEvent(event: string, category: 'milestone' | 'challenge' | 'decision' | 'learning' | 'goal'): void {
    const storyEvent = {
      event,
      category,
      timestamp: Date.now(),
      context: this.getCurrentContextSnapshot()
    };

    // Add to appropriate story memory array
    switch (category) {
      case 'milestone':
        if (!this.state.storyMemory.milestones.includes(event)) {
          this.state.storyMemory.milestones.push(event);
        }
        break;
      case 'challenge':
        this.state.storyMemory.challenges.push(event);
        break;
      case 'decision':
        this.state.decisions.push(event);
        break;
      case 'learning':
        if (!this.state.storyMemory.learnings.includes(event)) {
          this.state.storyMemory.learnings.push(event);
        }
        break;
      case 'goal':
        this.setProjectGoal(event);
        break;
    }

    // Update timeline
    this.state.storyMemory.timeline.push({
      date: new Date().toISOString().split('T')[0],
      event: `${category}: ${event}`
    });

    // Keep timeline manageable
    if (this.state.storyMemory.timeline.length > 50) {
      this.state.storyMemory.timeline = this.state.storyMemory.timeline.slice(-50);
    }

    this.saveState();
  }

  // Get current context snapshot for story events
  private getCurrentContextSnapshot(): any {
    return {
      projectType: this.state.projectType,
      gitBranch: this.state.workspaceMemory.gitBranch,
      recentFiles: this.state.workspaceMemory.files.slice(-5),
      currentTasks: this.state.taskHistory.slice(-3),
      keyPoints: this.state.keyPoints.slice(-3)
    };
  }

  // Semantic search for chat history
  semanticSearchChat(query: string, limit: number = 5): Array<{message: ChatMessage, score: number, context: string[]}> {
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

    // Expand query with related terms
    const expandedTerms = this.expandQueryTerms(queryTerms);

    const scored = this.state.chatHistory.map((msg, index) => {
      const content = msg.content.toLowerCase();
      let score = 0;
      let matches: string[] = [];

      // Exact phrase match (highest score)
      if (content.includes(lowerQuery)) {
        score += 100;
        matches.push('exact_phrase');
      }

      // Term frequency scoring
      expandedTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const termMatches = content.match(regex);
        if (termMatches) {
          score += termMatches.length * 5;
          matches.push(`${term}:${termMatches.length}`);
        }
      });

      // Context bonus - messages near high-scoring messages get boosted
      const contextBonus = this.getContextBonus(index, this.state.chatHistory);
      score += contextBonus;

      // Recency bonus
      const age = Date.now() - msg.timestamp;
      const hoursOld = age / (1000 * 60 * 60);
      const recencyBonus = Math.max(0, 10 - hoursOld);
      score += recencyBonus;

      // Length penalty for very short messages
      if (msg.content.length < 10) {
        score *= 0.5;
      }

      // Get conversation context (previous and next messages)
      const context = this.getMessageContext(index);

      return {
        message: msg,
        score,
        matches,
        context
      };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({ message: s.message, score: s.score, context: s.context }));
  }

  // Expand query terms with synonyms and related concepts
  private expandQueryTerms(terms: string[]): string[] {
    const expansions: Record<string, string[]> = {
      'error': ['exception', 'fail', 'problem', 'issue', 'bug'],
      'function': ['method', 'def', 'func'],
      'class': ['component', 'module', 'object'],
      'test': ['spec', 'unit', 'integration', 'e2e'],
      'install': ['setup', 'npm', 'yarn', 'pip'],
      'create': ['build', 'generate', 'make', 'new'],
      'update': ['modify', 'change', 'edit', 'fix'],
      'delete': ['remove', 'rm', 'unlink'],
      'file': ['document', 'source', 'code'],
      'folder': ['directory', 'dir', 'path']
    };

    const expanded = new Set(terms);

    terms.forEach(term => {
      const related = expansions[term];
      if (related) {
        related.forEach(rel => expanded.add(rel));
      }
    });

    return Array.from(expanded);
  }

  // Get context bonus based on surrounding messages
  private getContextBonus(index: number, messages: ChatMessage[]): number {
    let bonus = 0;
    const contextRange = 2; // Look at 2 messages before and after

    for (let i = Math.max(0, index - contextRange); i <= Math.min(messages.length - 1, index + contextRange); i++) {
      if (i === index) continue; // Skip the message itself

      const msg = messages[i];
      const content = msg.content.toLowerCase();

      // Bonus for messages that reference similar topics
      if (content.includes('error') || content.includes('fix') || content.includes('issue')) {
        bonus += 2;
      }
      if (content.includes('create') || content.includes('build') || content.includes('generate')) {
        bonus += 1.5;
      }
      if (content.includes('test') || content.includes('run') || content.includes('execute')) {
        bonus += 1;
      }
    }

    return bonus;
  }

  // Get conversation context for a message
  private getMessageContext(index: number): string[] {
    const context: string[] = [];
    const range = 1; // Get 1 message before and after

    for (let i = Math.max(0, index - range); i <= Math.min(this.state.chatHistory.length - 1, index + range); i++) {
      if (i === index) continue;

      const msg = this.state.chatHistory[i];
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      context.push(`${prefix}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    }

    return context;
  }

  // Workspace memory - track recent changes with semantic meaning
  addWorkspaceChange(change: {
    type: 'file_created' | 'file_modified' | 'file_deleted' | 'command_executed' | 'git_commit';
    path?: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    category?: string;
  }): void {
    const workspaceChange = {
      ...change,
      timestamp: Date.now(),
      sessionId: this.state.sessionState.sessionId
    };

    // Add semantic categorization
    if (!workspaceChange.category) {
      workspaceChange.category = this.categorizeChange(change);
    }

    // Convert to string for storage
    const changeString = `${change.type}: ${change.description} (${change.impact} impact)`;
    this.state.workspaceMemory.recentChanges.unshift(changeString);
    this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);

    this.saveState();
  }

  // Categorize changes semantically
  private categorizeChange(change: any): string {
    const desc = change.description.toLowerCase();

    if (desc.includes('component') || desc.includes('ui') || desc.includes('interface')) {
      return 'frontend';
    }
    if (desc.includes('api') || desc.includes('server') || desc.includes('backend')) {
      return 'backend';
    }
    if (desc.includes('test') || desc.includes('spec') || desc.includes('assert')) {
      return 'testing';
    }
    if (desc.includes('config') || desc.includes('package.json') || desc.includes('dependencies')) {
      return 'configuration';
    }
    if (desc.includes('git') || desc.includes('commit') || desc.includes('merge')) {
      return 'version_control';
    }
    if (desc.includes('error') || desc.includes('fix') || desc.includes('bug')) {
      return 'bug_fix';
    }
    if (desc.includes('feature') || desc.includes('add') || desc.includes('implement')) {
      return 'feature';
    }

    return 'general';
  }

  // Get workspace changes by category
  getWorkspaceChangesByCategory(category: string, limit: number = 10): string[] {
    return this.state.workspaceMemory.recentChanges
      .filter(change => change.toLowerCase().includes(category.toLowerCase()))
      .slice(0, limit);
  }

  // Get recent high-impact changes
  getHighImpactChanges(limit: number = 5): string[] {
    return this.state.workspaceMemory.recentChanges
      .filter(change => change.includes('(high impact)'))
      .slice(0, limit);
  }

  // Advanced context building with semantic understanding
  buildSemanticContext(query: string): string {
    const parts: string[] = [];

    // Base context
    parts.push(this.getMemoryContext());

    // Add semantically relevant chat history
    const relevantChats = this.semanticSearchChat(query, 3);
    if (relevantChats.length > 0) {
      parts.push('\n# Relevant Previous Conversations');
      relevantChats.forEach(chat => {
        const role = chat.message.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${chat.message.content}`);
        if (chat.context.length > 0) {
          parts.push(`Context: ${chat.context.join(' | ')}`);
        }
      });
    }

    // Add relevant workspace changes
    const queryTerms = query.toLowerCase().split(/\s+/);
    const relevantCategories = this.inferRelevantCategories(queryTerms);

    if (relevantCategories.length > 0) {
      parts.push('\n# Relevant Recent Changes');
      relevantCategories.forEach(category => {
        const changes = this.getWorkspaceChangesByCategory(category, 3);
        if (changes.length > 0) {
          parts.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Changes`);
          changes.forEach(change => parts.push(`- ${change}`));
        }
      });
    }

    // Add high-impact changes if query suggests importance
    if (queryTerms.some(term => ['important', 'critical', 'major', 'significant'].includes(term))) {
      const highImpact = this.getHighImpactChanges(3);
      if (highImpact.length > 0) {
        parts.push('\n# High-Impact Changes');
        highImpact.forEach(change => parts.push(`- ${change}`));
      }
    }

    return parts.join('\n');
  }

  // Infer relevant categories from query terms
  private inferRelevantCategories(terms: string[]): string[] {
    const categoryKeywords: Record<string, string[]> = {
      'frontend': ['component', 'ui', 'interface', 'react', 'vue', 'angular', 'html', 'css', 'javascript'],
      'backend': ['api', 'server', 'database', 'sql', 'node', 'express', 'python', 'java'],
      'testing': ['test', 'spec', 'unit', 'integration', 'jest', 'mocha', 'pytest'],
      'configuration': ['config', 'package.json', 'dependencies', 'webpack', 'babel'],
      'version_control': ['git', 'commit', 'merge', 'branch', 'pull', 'push'],
      'bug_fix': ['error', 'fix', 'bug', 'issue', 'debug', 'problem'],
      'feature': ['feature', 'add', 'implement', 'new', 'create']
    };

    const relevantCategories = new Set<string>();

    terms.forEach(term => {
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.includes(term)) {
          relevantCategories.add(category);
        }
      });
    });

    return Array.from(relevantCategories);
  }

  // Get code patterns (for ExecutionModeManager compatibility)
  getCodePatterns(): string[] {
    return this.state.codePatterns;
  }

  // Memory consolidation - summarize old information
  consolidateMemory(): void {
    // Summarize old chat messages
    if (this.state.chatHistory.length > this.maxChatHistory) {
      const recentMessages = this.state.chatHistory.slice(-this.maxChatHistory / 2);
      const oldMessages = this.state.chatHistory.slice(0, -this.maxChatHistory / 2);

      // Create summary of old conversations
      const summary = this.summarizeOldMessages(oldMessages);
      this.state.chatHistory = [...summary, ...recentMessages];
    }

    // Consolidate old task history
    if (this.state.taskHistory.length > this.maxTaskHistory) {
      const recentTasks = this.state.taskHistory.slice(-this.maxTaskHistory / 2);
      const oldTasks = this.state.taskHistory.slice(0, -this.maxTaskHistory / 2);

      // Create consolidated task entries
      const consolidatedTasks = this.consolidateTasks(oldTasks);
      this.state.taskHistory = [...consolidatedTasks, ...recentTasks];
    }

    // Clean up old workspace changes
    if (this.state.workspaceMemory.recentChanges.length > this.maxChanges) {
      this.state.workspaceMemory.recentChanges = this.state.workspaceMemory.recentChanges.slice(0, this.maxChanges);
    }

    this.saveState();
  }

  // Consolidate old tasks into summary entries
  private consolidateTasks(oldTasks: TaskMemory[]): TaskMemory[] {
    const consolidated: TaskMemory[] = [];
    const batchSize = 5;

    for (let i = 0; i < oldTasks.length; i += batchSize) {
      const batch = oldTasks.slice(i, i + batchSize);
      const successCount = batch.filter(t => t.success).length;
      const totalDuration = batch.reduce((sum, t) => sum + t.duration, 0);

      consolidated.push({
        description: `Batch of ${batch.length} tasks (${successCount}/${batch.length} successful)`,
        filesCreated: batch.flatMap(t => t.filesCreated),
        filesModified: batch.flatMap(t => t.filesModified),
        errors: batch.flatMap(t => t.errors),
        suggestions: batch.flatMap(t => t.suggestions),
        timestamp: batch[0].timestamp,
        duration: totalDuration,
        success: successCount > batch.length / 2
      });
    }

    return consolidated;
  }
}
