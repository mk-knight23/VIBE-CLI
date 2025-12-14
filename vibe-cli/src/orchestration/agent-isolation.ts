import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { Agent, AgentResult } from './multi-agent-executor';

export type IsolationStrategy = 'git-worktree' | 'temp-directory' | 'sandbox';

export interface SandboxContext {
  workDir: string;
  env: NodeJS.ProcessEnv;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  executeCommand(command: string, args?: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export interface ConflictReport {
  fileConflicts: string[];
  envConflicts: string[];
  resourceConflicts: string[];
}

export interface SandboxExecutionResult {
  output: string;
  artifacts: string[];
  exitCode: number;
  error?: string;
}

export class AgentSandbox {
  private strategy: IsolationStrategy;
  private baseDir: string;
  private sandboxPath?: string;
  private context?: SandboxContext;

  constructor(strategy: IsolationStrategy, baseDir: string) {
    this.strategy = strategy;
    this.baseDir = baseDir;
  }

  async create(agentId: string): Promise<string> {
    switch (this.strategy) {
      case 'temp-directory':
        return this.createTempDirectory(agentId);
      case 'git-worktree':
        return this.createGitWorktree(agentId);
      case 'sandbox':
        return this.createSandbox(agentId);
      default:
        throw new Error(`Unsupported isolation strategy: ${this.strategy}`);
    }
  }

  private async createTempDirectory(agentId: string): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `vibe-agent-${agentId}-`));
    this.sandboxPath = tempDir;

    // Copy essential files to temp directory
    await this.copyProjectFiles(this.baseDir, tempDir);

    // Create isolated environment
    this.context = await this.createSandboxContext(tempDir);

    return tempDir;
  }

  private async createGitWorktree(agentId: string): Promise<string> {
    const worktreePath = path.join(os.tmpdir(), `vibe-worktree-${agentId}`);
    
    try {
      // Create git worktree
      await this.executeCommand('git', ['worktree', 'add', worktreePath], { cwd: this.baseDir });
      this.sandboxPath = worktreePath;
      
      // Create isolated environment
      this.context = await this.createSandboxContext(worktreePath);
      
      return worktreePath;
    } catch (error) {
      // Fallback to temp directory if git worktree fails
      console.warn(`Git worktree creation failed, falling back to temp directory: ${error instanceof Error ? error.message : String(error)}`);
      return this.createTempDirectory(agentId);
    }
  }

  private async createSandbox(agentId: string): Promise<string> {
    // For now, sandbox is same as temp directory
    // In future, could use Docker containers or other isolation
    return this.createTempDirectory(agentId);
  }

  private async copyProjectFiles(source: string, dest: string): Promise<void> {
    try {
      const entries = await fs.readdir(source, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip certain directories and files
        if (this.shouldSkipFile(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await this.copyProjectFiles(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to copy project files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private shouldSkipFile(name: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.vibe',
      'dist',
      'build',
      'coverage',
      '.DS_Store',
      '*.log'
    ];

    return skipPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  private async createSandboxContext(workDir: string): Promise<SandboxContext> {
    // Create isolated environment variables
    const isolatedEnv = {
      ...process.env,
      PWD: workDir,
      VIBE_SANDBOX: 'true',
      VIBE_AGENT_MODE: 'true'
    };

    return {
      workDir,
      env: isolatedEnv,
      
      async readFile(filePath: string): Promise<string> {
        const fullPath = path.resolve(workDir, filePath);
        return fs.readFile(fullPath, 'utf-8');
      },

      async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = path.resolve(workDir, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
      },

      async executeCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
          const child = spawn(command, args, {
            cwd: workDir,
            env: isolatedEnv,
            stdio: 'pipe'
          });

          let stdout = '';
          let stderr = '';

          child.stdout?.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code || 0
            });
          });

          child.on('error', (error) => {
            reject(error);
          });

          // Timeout after 2 minutes
          setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error('Command timeout'));
          }, 120000);
        });
      }
    };
  }

  async executeInSandbox(agent: Agent): Promise<SandboxExecutionResult> {
    if (!this.context) {
      throw new Error('Sandbox context not initialized');
    }

    try {
      // Execute agent-specific task
      const result = await this.executeAgentTask(agent, this.context);
      
      // Collect artifacts
      const artifacts = await this.collectArtifacts();

      return {
        output: result.output,
        artifacts,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        output: '',
        artifacts: [],
        exitCode: 1,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeAgentTask(agent: Agent, context: SandboxContext): Promise<{ output: string; exitCode: number }> {
    // This is a simplified implementation
    // In a real implementation, this would interface with the AI provider
    // and execute the agent's specific role-based tasks

    const taskScript = this.generateTaskScript(agent);
    
    // Write task script to sandbox
    const scriptPath = path.join(context.workDir, 'agent-task.js');
    await context.writeFile('agent-task.js', taskScript);

    // Execute task
    const result = await context.executeCommand('node', ['agent-task.js']);
    
    return {
      output: result.stdout,
      exitCode: result.exitCode
    };
  }

  private generateTaskScript(agent: Agent): string {
    // Generate a simple task script based on agent role
    // This is a placeholder - real implementation would be more sophisticated
    
    const baseScript = `
const fs = require('fs');
const path = require('path');

console.log('Agent ${agent.role} executing task: ${agent.task}');

// Simulate work delay for timeout testing
if (process.env.VIBE_TEST_DELAY) {
  const delay = parseInt(process.env.VIBE_TEST_DELAY);
  const start = Date.now();
  while (Date.now() - start < delay) {
    // Busy wait to simulate work
  }
}

// Agent-specific logic would go here
// For now, just create a simple output

const result = {
  role: '${agent.role}',
  task: '${agent.task}',
  timestamp: new Date().toISOString(),
  output: 'Task completed successfully'
};

console.log(JSON.stringify(result, null, 2));
`;

    return baseScript;
  }

  private async collectArtifacts(): Promise<string[]> {
    if (!this.sandboxPath) return [];

    try {
      const artifacts: string[] = [];
      const entries = await fs.readdir(this.sandboxPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && this.isArtifact(entry.name)) {
          artifacts.push(path.join(this.sandboxPath, entry.name));
        }
      }

      return artifacts;
    } catch (error) {
      console.warn(`Failed to collect artifacts: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private isArtifact(filename: string): boolean {
    const artifactExtensions = ['.js', '.ts', '.json', '.md', '.txt', '.log'];
    const ext = path.extname(filename);
    return artifactExtensions.includes(ext) && !filename.startsWith('.');
  }

  async cleanup(): Promise<void> {
    if (!this.sandboxPath) return;

    try {
      if (this.strategy === 'git-worktree') {
        // Remove git worktree
        await this.executeCommand('git', ['worktree', 'remove', this.sandboxPath], { cwd: this.baseDir });
      } else {
        // Remove temp directory
        await fs.rm(this.sandboxPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Failed to cleanup sandbox: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeCommand(command: string, args: string[], options: { cwd: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

export class ConflictDetector {
  detectFileConflicts(agentA: Agent, agentB: Agent): ConflictReport {
    const fileConflicts: string[] = [];
    const envConflicts: string[] = [];
    const resourceConflicts: string[] = [];

    // Check for file conflicts
    if (agentA.context.files && agentB.context.files) {
      const filesA = new Set(agentA.context.files);
      const filesB = new Set(agentB.context.files);
      
      for (const file of filesA) {
        if (filesB.has(file)) {
          fileConflicts.push(file);
        }
      }
    }

    // Check for environment conflicts
    // This is simplified - real implementation would check for specific env vars
    if (agentA.role === agentB.role) {
      envConflicts.push('Same agent role may cause conflicts');
    }

    // Check for resource conflicts
    if (agentA.context.workingDir === agentB.context.workingDir) {
      resourceConflicts.push('Same working directory');
    }

    return {
      fileConflicts,
      envConflicts,
      resourceConflicts
    };
  }

  detectEnvConflicts(contexts: SandboxContext[]): string[] {
    const conflicts: string[] = [];
    
    // Check for port conflicts, file locks, etc.
    const workDirs = contexts.map(c => c.workDir);
    const uniqueDirs = new Set(workDirs);
    
    if (workDirs.length !== uniqueDirs.size) {
      conflicts.push('Multiple agents using same working directory');
    }

    return conflicts;
  }
}
