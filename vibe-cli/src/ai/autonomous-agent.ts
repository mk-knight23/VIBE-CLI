import { ApiClient } from '../core/api';
import { executeTool, tools } from '../tools';
import pc from 'picocolors';

interface AgentTask {
  goal: string;
  maxSteps: number;
  autoApprove: boolean;
}

interface AgentStep {
  thought: string;
  action: string;
  result: string;
}

export class AutonomousAgent {
  private client: ApiClient;
  private model: string;
  private steps: AgentStep[] = [];

  constructor(client: ApiClient, model: string) {
    this.client = client;
    this.model = model;
  }

  async execute(task: AgentTask): Promise<void> {
    console.log(pc.cyan('\n🤖 Agent Mode: Starting autonomous execution\n'));
    console.log(pc.bold(`Goal: ${task.goal}\n`));

    const systemPrompt = `You are an autonomous AI agent. Break down tasks into steps and execute them.

For each step:
1. Think about what needs to be done
2. Choose an action (use tools or generate code)
3. Execute and observe results
4. Decide next step or completion

Available tools: ${tools.map(t => t.name).join(', ')}

Respond in JSON:
{
  "thought": "what I'm thinking",
  "action": "tool_name or 'complete'",
  "params": {...}
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task.goal }
    ];

    for (let step = 1; step <= task.maxSteps; step++) {
      console.log(pc.cyan(`\n━━━ Step ${step}/${task.maxSteps} ━━━\n`));

      const response = await this.client.chat(messages, this.model, {
        temperature: 0.7,
        maxTokens: 2000
      });

      const content = response.choices?.[0]?.message?.content || '';
      
      try {
        const parsed = JSON.parse(content);
        
        console.log(pc.yellow(`💭 Thought: ${parsed.thought}`));
        console.log(pc.blue(`⚡ Action: ${parsed.action}`));

        if (parsed.action === 'complete') {
          console.log(pc.green('\n✅ Task completed!\n'));
          break;
        }

        const tool = tools.find(t => t.name === parsed.action);
        if (!tool) {
          console.log(pc.red(`❌ Unknown tool: ${parsed.action}`));
          continue;
        }

        if (!task.autoApprove && tool.requiresConfirmation) {
          console.log(pc.yellow(`⚠️  Requires approval: ${tool.displayName}`));
          continue;
        }

        const result = await executeTool(parsed.action, parsed.params);
        console.log(pc.green(`✓ Result: ${JSON.stringify(result).substring(0, 100)}...`));

        this.steps.push({
          thought: parsed.thought,
          action: parsed.action,
          result: JSON.stringify(result)
        });

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: `Result: ${JSON.stringify(result)}` });

      } catch (err: any) {
        console.log(pc.red(`❌ Error: ${err.message}`));
        break;
      }
    }

    console.log(pc.cyan(`\n━━━ Agent Summary ━━━\n`));
    console.log(`Steps executed: ${this.steps.length}`);
    console.log(`Goal: ${task.goal}`);
  }
}
