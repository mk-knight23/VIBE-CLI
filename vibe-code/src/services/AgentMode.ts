// Autonomous Agent Mode
import { AIProvider, AIMessage } from '../providers/AIProvider';
import { FileSystemEngine } from './FileSystem';
import { ShellEngine } from './ShellEngine';
import { RuntimeSandbox } from './RuntimeSandbox';

export interface AgentStep {
  id: string;
  type: 'analyze' | 'plan' | 'execute' | 'verify';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  steps: AgentStep[];
  status: 'running' | 'completed' | 'failed' | 'paused';
}

export class AgentMode {
  private ai: AIProvider;
  private fs: FileSystemEngine;
  private shell: ShellEngine;
  private sandbox: RuntimeSandbox;
  private currentTask: AgentTask | null = null;
  private onStepUpdate?: (step: AgentStep) => void;

  constructor(
    ai: AIProvider,
    fs: FileSystemEngine,
    shell: ShellEngine,
    sandbox: RuntimeSandbox
  ) {
    this.ai = ai;
    this.fs = fs;
    this.shell = shell;
    this.sandbox = sandbox;
  }

  async execute(goal: string, onStepUpdate?: (step: AgentStep) => void): Promise<AgentTask> {
    this.onStepUpdate = onStepUpdate;
    
    this.currentTask = {
      id: Date.now().toString(),
      goal,
      steps: [],
      status: 'running'
    };

    try {
      await this.analyzeGoal(goal);
      await this.createPlan(goal);
      await this.executePlan();
      await this.verify();
      
      this.currentTask.status = 'completed';
    } catch (error) {
      this.currentTask.status = 'failed';
      throw error;
    }

    return this.currentTask;
  }

  private async analyzeGoal(goal: string): Promise<void> {
    const step: AgentStep = {
      id: `step-${Date.now()}`,
      type: 'analyze',
      description: 'Analyzing goal and workspace',
      status: 'running'
    };

    this.currentTask!.steps.push(step);
    this.notifyStep(step);

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are an autonomous coding agent. Analyze the goal and workspace.' },
      { role: 'user', content: `Goal: ${goal}\n\nAnalyze what needs to be done.` }
    ];

    const response = await this.ai.chat(messages);
    step.result = response.content;
    step.status = 'completed';
    this.notifyStep(step);
  }

  private async createPlan(goal: string): Promise<void> {
    const step: AgentStep = {
      id: `step-${Date.now()}`,
      type: 'plan',
      description: 'Creating execution plan',
      status: 'running'
    };

    this.currentTask!.steps.push(step);
    this.notifyStep(step);

    const messages: AIMessage[] = [
      { role: 'system', content: 'Create a step-by-step plan to achieve the goal. Return JSON array of steps.' },
      { role: 'user', content: `Goal: ${goal}` }
    ];

    const response = await this.ai.chat(messages);
    step.result = response.content;
    step.status = 'completed';
    this.notifyStep(step);
  }

  private async executePlan(): Promise<void> {
    const step: AgentStep = {
      id: `step-${Date.now()}`,
      type: 'execute',
      description: 'Executing plan',
      status: 'running'
    };

    this.currentTask!.steps.push(step);
    this.notifyStep(step);

    const messages: AIMessage[] = [
      { role: 'system', content: 'Execute the plan. Use tools: createFile, writeFile, runCommand, executeCode.' },
      { role: 'user', content: 'Execute the plan step by step.' }
    ];

    const response = await this.ai.chat(messages);
    
    // Parse and execute actions from AI response
    await this.parseAndExecuteActions(response.content);
    
    step.result = 'Plan executed';
    step.status = 'completed';
    this.notifyStep(step);
  }

  private async parseAndExecuteActions(content: string): Promise<void> {
    // Extract actions from AI response
    const actions = this.extractActions(content);
    
    for (const action of actions) {
      switch (action.type) {
        case 'createFile':
          await this.fs.createFile(action.path, action.content);
          break;
        case 'writeFile':
          await this.fs.writeFile(action.path, action.content);
          break;
        case 'runCommand':
          await this.shell.execute(action.command);
          break;
        case 'executeCode':
          await this.sandbox.executeJS(action.code);
          break;
      }
    }
  }

  private extractActions(content: string): any[] {
    // Simple action extraction - in production, use proper parsing
    const actions: any[] = [];
    
    const createFileRegex = /createFile\("([^"]+)",\s*"([^"]+)"\)/g;
    let match;
    while ((match = createFileRegex.exec(content)) !== null) {
      actions.push({ type: 'createFile', path: match[1], content: match[2] });
    }

    return actions;
  }

  private async verify(): Promise<void> {
    const step: AgentStep = {
      id: `step-${Date.now()}`,
      type: 'verify',
      description: 'Verifying results',
      status: 'running'
    };

    this.currentTask!.steps.push(step);
    this.notifyStep(step);

    step.result = 'Verification complete';
    step.status = 'completed';
    this.notifyStep(step);
  }

  private notifyStep(step: AgentStep): void {
    if (this.onStepUpdate) {
      this.onStepUpdate(step);
    }
  }

  stop(): void {
    if (this.currentTask) {
      this.currentTask.status = 'paused';
    }
  }

  getTask(): AgentTask | null {
    return this.currentTask;
  }
}
