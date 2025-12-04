// Complete Agent System v7.0.0
import { AdvancedAgent, AgentConfig } from './advanced-agent-v7';
import { ApiClient } from '../core/api';
import { V7Engine } from '../core/v7-engine';

export class CompleteAgentSystem {
  private agents: Map<string, AdvancedAgent> = new Map();
  
  constructor(
    private client: ApiClient,
    private model: string,
    private engine: V7Engine
  ) {}

  async startAgent(config: AgentConfig): Promise<string> {
    const agentId = `agent-${Date.now()}`;
    const agent = new AdvancedAgent(this.client, this.model, this.engine);
    
    this.agents.set(agentId, agent);
    
    // Execute in background
    agent.execute(config).finally(() => {
      console.log(`Agent ${agentId} completed`);
    });

    return agentId;
  }

  async spawnAgent(parentId: string, config: AgentConfig): Promise<string> {
    const pool = this.engine.getAgentPool();
    
    if (!pool.canSpawn()) {
      throw new Error('Agent pool full. Max parallel agents reached.');
    }

    const agentId = `${parentId}-sub-${Date.now()}`;
    const agent = new AdvancedAgent(this.client, this.model, this.engine);
    
    this.agents.set(agentId, agent);
    pool.spawn(agentId);
    
    agent.execute(config).finally(() => {
      pool.release(agentId);
    });

    return agentId;
  }

  async parallelAgents(configs: AgentConfig[]): Promise<string[]> {
    const agentIds: string[] = [];
    
    for (const config of configs) {
      const id = await this.startAgent(config);
      agentIds.push(id);
    }

    return agentIds;
  }

  async workflowAgent(steps: Array<{goal: string, maxRuntime: number}>): Promise<void> {
    for (const step of steps) {
      const agent = new AdvancedAgent(this.client, this.model, this.engine);
      await agent.execute({
        goal: step.goal,
        maxRuntime: step.maxRuntime,
        parallelAgents: 0,
        selfTest: false,
        autoFix: false
      });
    }
  }

  getAgent(agentId: string): AdvancedAgent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  getActiveAgents(): string[] {
    return this.engine.getAgentPool().getActive();
  }
}
