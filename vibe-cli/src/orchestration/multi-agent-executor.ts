import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentSandbox } from './agent-isolation';
import { RoleFactory, AgentRole } from './agent-roles';

export interface Agent {
  role: 'architect' | 'developer' | 'validator' | 'debugger' | 'reviewer';
  task: string;
  context: ProjectContext;
  sandbox: string;
  timeout: number;
  id?: string;
}

export interface ProjectContext {
  files?: string[];
  workingDir: string;
  dependencies?: string[];
  framework?: string;
  language?: string;
}

export interface AgentResult {
  agentId: string;
  role: string;
  success: boolean;
  output: string;
  executionTime: number;
  error?: string;
  artifacts?: string[];
}

export interface ScoredResult extends AgentResult {
  score: number;
  confidence: number;
  reasoning: string;
}

export interface ExecutionOptions {
  maxParallel?: number;
  timeout?: number;
  requireConsensus?: boolean;
  minScore?: number;
}

export class MultiAgentExecutor extends EventEmitter {
  private roleFactory: RoleFactory;
  private activeSandboxes: Map<string, AgentSandbox>;

  constructor() {
    super();
    this.roleFactory = new RoleFactory();
    this.activeSandboxes = new Map();
  }

  async spawnParallelAgents(
    mainTask: string,
    agents: Agent[],
    options: ExecutionOptions = {}
  ): Promise<AgentResult[]> {
    const {
      maxParallel = 5,
      timeout = 300000, // 5 minutes
      requireConsensus = false
    } = options;

    // Validate agents
    if (agents.length === 0) {
      throw new Error('At least one agent is required');
    }

    if (agents.length > maxParallel) {
      throw new Error(`Cannot spawn more than ${maxParallel} agents`);
    }

    // Assign IDs and prepare sandboxes
    const preparedAgents = await this.prepareAgents(agents, mainTask);
    
    this.emit('execution-started', { 
      agentCount: preparedAgents.length, 
      task: mainTask 
    });

    try {
      // Execute agents in parallel
      const results = await this.executeInParallel(preparedAgents, timeout);
      
      // Score results if consensus required
      const scoredResults = requireConsensus 
        ? this.scoreResults(results, mainTask)
        : results.map(r => ({ ...r, score: 1, confidence: 1, reasoning: 'No consensus required' }));

      this.emit('execution-completed', { results: scoredResults });
      
      return scoredResults;
    } finally {
      // Cleanup sandboxes
      await this.cleanup();
    }
  }

  private async prepareAgents(agents: Agent[], mainTask: string): Promise<Agent[]> {
    const prepared: Agent[] = [];

    for (const agent of agents) {
      const agentId = uuidv4();
      const sandbox = new AgentSandbox('temp-directory', agent.context.workingDir);
      const sandboxPath = await sandbox.create(agentId);

      this.activeSandboxes.set(agentId, sandbox);

      prepared.push({
        ...agent,
        id: agentId,
        sandbox: sandboxPath,
        timeout: agent.timeout || 120000 // 2 minutes default
      });
    }

    return prepared;
  }

  private async executeInParallel(agents: Agent[], globalTimeout: number): Promise<AgentResult[]> {
    const promises = agents.map(agent => this.executeAgent(agent));
    
    try {
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        const agent = agents[index];
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            agentId: agent.id!,
            role: agent.role,
            success: false,
            output: '',
            executionTime: 0,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          };
        }
      });
    } catch (error) {
      throw new Error(`Parallel execution failed: ${error}`);
    }
  }

  private async executeAgent(agent: Agent): Promise<AgentResult> {
    const startTime = Date.now();
    
    this.emit('agent-started', { agentId: agent.id, role: agent.role });

    try {
      const sandbox = this.activeSandboxes.get(agent.id!);
      if (!sandbox) {
        throw new Error(`Sandbox not found for agent ${agent.id}`);
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Agent ${agent.id} timed out after ${agent.timeout}ms`));
        }, agent.timeout);
      });

      // Race between execution and timeout
      const result = await Promise.race([
        sandbox.executeInSandbox(agent),
        timeoutPromise
      ]);
      
      const executionTime = Date.now() - startTime;
      
      this.emit('agent-completed', { 
        agentId: agent.id, 
        role: agent.role, 
        success: true,
        executionTime 
      });

      return {
        agentId: agent.id!,
        role: agent.role,
        success: true,
        output: result.output,
        executionTime,
        artifacts: result.artifacts
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.emit('agent-failed', { 
        agentId: agent.id, 
        role: agent.role, 
        error: error instanceof Error ? error.message : String(error),
        executionTime 
      });

      return {
        agentId: agent.id!,
        role: agent.role,
        success: false,
        output: '',
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private scoreResults(results: AgentResult[], task: string): ScoredResult[] {
    return results.map(result => {
      const score = this.calculateScore(result, task);
      const confidence = this.calculateConfidence(result, results);
      const reasoning = this.generateReasoning(result, score, confidence);

      return {
        ...result,
        score,
        confidence,
        reasoning
      };
    });
  }

  private calculateScore(result: AgentResult, task: string): number {
    if (!result.success) return 0;

    let score = 0.5; // Base score for successful execution

    // Score based on output quality
    if (result.output && result.output.length > 0) {
      score += 0.2;
    }

    // Score based on execution time (faster is better, but not too fast)
    const timeScore = Math.max(0, Math.min(0.2, (60000 - result.executionTime) / 60000 * 0.2));
    score += timeScore;

    // Score based on artifacts produced
    if (result.artifacts && result.artifacts.length > 0) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private calculateConfidence(result: AgentResult, allResults: AgentResult[]): number {
    if (!result.success) return 0;

    const successfulResults = allResults.filter(r => r.success);
    if (successfulResults.length === 1) return 1;

    // Calculate confidence based on similarity to other results
    // This is a simplified implementation
    const avgExecutionTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length;
    const timeDiff = Math.abs(result.executionTime - avgExecutionTime);
    const timeConfidence = Math.max(0, 1 - (timeDiff / avgExecutionTime));

    return timeConfidence;
  }

  private generateReasoning(result: AgentResult, score: number, confidence: number): string {
    if (!result.success) {
      return `Agent failed: ${result.error}`;
    }

    const reasons = [];
    
    if (score > 0.8) reasons.push('High quality output');
    else if (score > 0.6) reasons.push('Good output quality');
    else reasons.push('Basic output quality');

    if (confidence > 0.8) reasons.push('high confidence');
    else if (confidence > 0.6) reasons.push('medium confidence');
    else reasons.push('low confidence');

    if (result.executionTime < 30000) reasons.push('fast execution');
    else if (result.executionTime < 60000) reasons.push('reasonable execution time');
    else reasons.push('slow execution');

    return reasons.join(', ');
  }

  async compareAgentResults(results: AgentResult[]): Promise<ScoredResult[]> {
    return this.scoreResults(results, 'comparison');
  }

  private async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.activeSandboxes.values()).map(
      sandbox => sandbox.cleanup()
    );

    await Promise.allSettled(cleanupPromises);
    this.activeSandboxes.clear();
  }

  // Prevent race conditions by queuing agent executions
  private executionQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  private async queueExecution<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.executionQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.executionQueue.length > 0) {
      const fn = this.executionQueue.shift()!;
      await fn();
    }

    this.isProcessingQueue = false;
  }
}
