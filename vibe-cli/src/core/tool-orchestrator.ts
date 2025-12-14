/**
 * Tool Orchestrator Module
 *
 * Intelligent tool orchestration with automatic chaining, recovery, and optimization.
 * Analyzes requests, selects optimal tool sequences, and executes with full transparency.
 *
 * @module core/tool-orchestrator
 */

import { tools, executeTool, ToolDefinition } from '../tools';
import { TerminalRenderer } from '../utils/terminal-renderer';
import { MemoryManager } from './memory';

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
}

export class ToolOrchestrator {
  private renderer: TerminalRenderer;
  private memory: MemoryManager;

  constructor(renderer: TerminalRenderer, memory: MemoryManager) {
    this.renderer = renderer;
    this.memory = memory;
  }

  /**
   * Analyze request and create optimal tool chain
   */
  async analyzeAndPlan(request: string, context?: any): Promise<ToolChain> {
    this.renderer.setState('thinking', 'Analyzing request and planning tools...');

    // Extract keywords and patterns from request
    const analysis = this.analyzeRequest(request);

    // Build tool chain based on analysis
    const toolChain = this.buildToolChain(analysis, context, request);

    this.renderer.status(`Planned ${toolChain.tools.length} tool${toolChain.tools.length === 1 ? '' : 's'} (${toolChain.riskLevel} risk)`, 'info');

    return toolChain;
  }

  /**
   * Execute tool chain with intelligent error handling and recovery
   */
  async executeChain(toolChain: ToolChain): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();

    this.renderer.setState('executing', 'Executing tool chain...');

    // Execute tools in dependency order
    const executed = new Set<string>();

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
          this.renderer.status(`Attempting recovery for ${execution.tool.displayName}`, 'warning');
          const recoveryResult = await this.attemptRecovery(execution, result.error!);
          if (recoveryResult.success) {
            results.set(execution.tool.name, recoveryResult.data);
            errors.delete(execution.tool.name);
            continue;
          }
        }

        // If high-risk operation failed, stop chain
        if (toolChain.riskLevel === 'high') {
          this.renderer.status('High-risk operation failed, stopping chain', 'error');
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
        this.renderer.showToolExecution(execution.tool.displayName, execution.params, true, duration);

        return { success: true, data: result };
      } catch (error: any) {
        lastError = error;
        this.renderer.showToolExecution(execution.tool.displayName, execution.params, false);

        if (attempt < execution.retryCount) {
          this.renderer.status(`Retrying ${execution.tool.displayName} (attempt ${attempt + 2}/${execution.retryCount + 1})`, 'warning');
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
      executeTool(execution.tool.name, execution.params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout)
      )
    ]);
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
        toolExecutions.push(this.createToolExecution('write_file', { file_path: context?.filePath, content: context?.content }));
        reasoning = 'Single file write operation';
        riskLevel = 'medium';
      }
      // REMOVED: Template-based HTML creation - AI-ONLY generation required
    }

    // Complex operations (project creation, multi-step tasks)
    else if (analysis.complexity === 'complex') {
      // Research phase
      if (analysis.operations.includes('create') && analysis.domains.includes('frontend')) {
        toolExecutions.push(
          this.createToolExecution('get_project_info', {}, 30000, 2),
          this.createToolExecution('check_dependency', { package_name: 'react' }, 10000, 1)
        );
        reasoning = 'Research project requirements and dependencies before creation';
      }

      // REMOVED: Automatic project creation - AI-ONLY structured generation required

      // Setup phase
      if (analysis.operations.includes('execute')) {
        toolExecutions.push(
          this.createToolExecution('run_shell_command', {
            command: 'npm install',
            directory: context?.projectName
          }, 60000, 1)
        );
        reasoning += '. Install dependencies and setup project';
        riskLevel = 'high';
      }

      // Verification phase
      if (analysis.operations.includes('test')) {
        toolExecutions.push(
          this.createToolExecution('run_tests', {}, 30000, 2),
          this.createToolExecution('run_lint', {}, 20000, 1)
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
    const tool = tools.find(t => t.name === toolName);
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
      case 'create_directory':
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
}

/**
 * Convenience function to orchestrate tools for a request
 */
export async function orchestrateTools(
  request: string,
  renderer: TerminalRenderer,
  memory: MemoryManager,
  context?: any
): Promise<OrchestrationResult> {
  const orchestrator = new ToolOrchestrator(renderer, memory);

  const toolChain = await orchestrator.analyzeAndPlan(request, context);
  const result = await orchestrator.executeChain(toolChain);

  return result;
}
