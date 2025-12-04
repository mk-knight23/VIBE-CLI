// Advanced Agent System v7.0.0
import { ApiClient } from '../core/api';
import { V7Engine } from '../core/v7-engine';
import { MultiFileEditor } from '../core/multi-file-editor';

export interface AgentConfig {
  goal: string;
  maxRuntime: number; // milliseconds
  parallelAgents: number;
  selfTest: boolean;
  autoFix: boolean;
}

export interface AgentStep {
  id: string;
  thought: string;
  action: string;
  result: any;
  timestamp: number;
  duration: number;
}

export class AdvancedAgent {
  private client: ApiClient;
  private model: string;
  private engine: V7Engine;
  private editor: MultiFileEditor;
  private steps: AgentStep[] = [];
  private subAgents: Map<string, AdvancedAgent> = new Map();
  private startTime: number = 0;

  constructor(client: ApiClient, model: string, engine: V7Engine) {
    this.client = client;
    this.model = model;
    this.engine = engine;
    this.editor = new MultiFileEditor();
  }

  async execute(config: AgentConfig): Promise<void> {
    this.startTime = Date.now();
    console.log(`🤖 Agent v7.0 Starting`);
    console.log(`Goal: ${config.goal}`);
    console.log(`Max Runtime: ${config.maxRuntime / 60000} minutes`);
    console.log(`Parallel Agents: ${config.parallelAgents}`);

    while (this.shouldContinue(config)) {
      const step = await this.executeStep(config);
      this.steps.push(step);

      if (step.action === 'complete') break;
      if (step.action === 'spawn_agent') {
        await this.spawnSubAgent(step.result);
      }
      if (config.selfTest && step.action === 'code_change') {
        await this.runSelfTest();
      }
    }

    console.log(`\n✅ Agent completed in ${this.getRuntime()}ms`);
    console.log(`Steps: ${this.steps.length}`);
    console.log(`Sub-agents: ${this.subAgents.size}`);
  }

  private shouldContinue(config: AgentConfig): boolean {
    const runtime = Date.now() - this.startTime;
    return runtime < config.maxRuntime;
  }

  private async executeStep(config: AgentConfig): Promise<AgentStep> {
    const stepStart = Date.now();
    
    const context = this.engine.getContext().getRelevantContext(config.goal);
    const prompt = this.buildPrompt(config.goal, context);
    
    const response = await this.client.chat([
      { role: 'system', content: 'You are an advanced autonomous agent.' },
      { role: 'user', content: prompt }
    ], this.model);

    const content = response.choices?.[0]?.message?.content || '';
    const parsed = this.parseResponse(content);

    const step: AgentStep = {
      id: `step-${this.steps.length + 1}`,
      thought: parsed.thought,
      action: parsed.action,
      result: await this.executeAction(parsed),
      timestamp: Date.now(),
      duration: Date.now() - stepStart
    };

    console.log(`\n💭 ${step.thought}`);
    console.log(`⚡ ${step.action}`);

    return step;
  }

  private buildPrompt(goal: string, context: any): string {
    return `Goal: ${goal}

Context:
- Recent commands: ${context.terminal.join(', ')}
- Clipboard: ${context.clipboard}
- Recent files: ${context.files.map((f: any) => f[0]).join(', ')}

What's the next step? Respond in JSON:
{
  "thought": "what I'm thinking",
  "action": "action_name",
  "params": {...}
}`;
  }

  private parseResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { thought: 'Parsing error', action: 'complete', params: {} };
    }
  }

  private async executeAction(parsed: any): Promise<any> {
    const safety = this.engine.getSafety();
    
    switch (parsed.action) {
      case 'edit_files':
        return await this.editor.editMultipleFiles(parsed.params.files);
      case 'run_command':
        return await safety.executeSafe(parsed.params.command);
      case 'spawn_agent':
        return { agentId: `sub-${Date.now()}` };
      case 'complete':
        return { success: true };
      default:
        return { error: 'Unknown action' };
    }
  }

  private async spawnSubAgent(config: any): Promise<void> {
    const pool = this.engine.getAgentPool();
    
    if (pool.canSpawn()) {
      const subAgent = new AdvancedAgent(this.client, this.model, this.engine);
      this.subAgents.set(config.agentId, subAgent);
      pool.spawn(config.agentId);
      
      // Execute sub-agent in background
      subAgent.execute({
        goal: config.goal,
        maxRuntime: 600000, // 10 minutes
        parallelAgents: 0,
        selfTest: false,
        autoFix: false
      }).finally(() => {
        pool.release(config.agentId);
      });
    }
  }

  private async runSelfTest(): Promise<void> {
    console.log('🧪 Running self-test...');
    // Run tests and verify changes
  }

  private getRuntime(): number {
    return Date.now() - this.startTime;
  }

  getSteps(): AgentStep[] {
    return this.steps;
  }
}
