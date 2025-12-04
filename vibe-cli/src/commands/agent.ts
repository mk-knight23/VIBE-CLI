import { ApiClient } from '../core/api';
import { AutonomousAgent } from '../ai/autonomous-agent';
import inquirer from 'inquirer';

export async function agentCommand(client: ApiClient, model: string): Promise<void> {
  const { goal } = await inquirer.prompt<{ goal: string }>([{
    type: 'input',
    name: 'goal',
    message: 'What should the agent accomplish?'
  }]);

  const { maxSteps } = await inquirer.prompt<{ maxSteps: number }>([{
    type: 'number',
    name: 'maxSteps',
    message: 'Maximum steps:',
    default: 10
  }]);

  const { autoApprove } = await inquirer.prompt<{ autoApprove: boolean }>([{
    type: 'confirm',
    name: 'autoApprove',
    message: 'Auto-approve all actions?',
    default: false
  }]);

  const agent = new AutonomousAgent(client, model);
  await agent.execute({ goal, maxSteps, autoApprove });
}
