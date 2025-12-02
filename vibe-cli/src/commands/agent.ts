import { ProviderManager } from '../core/providerManager';
import { emitPlan, emitComplete } from '../utils/ndjson';

export async function handleAgentCommand(args: string[], opts: any): Promise<void> {
  const [op, ...params] = args;
  const manager = new ProviderManager();

  if (op === 'new') {
    const task = params.join(' ');
    const { result } = await manager.requestWithFallback(
      async (p) => p.completion(
        `Create a JSON plan for: ${task}\nReturn array: [{id:1,description:"...",tool:"fs",requiresApproval:true,estimatedTime:10}]`,
        {}
      )
    );

    const steps = JSON.parse(result.content);
    
    if (opts.json) emitPlan(steps);
    else steps.forEach((s: any) => console.log(`${s.id}. ${s.description}`));
  }
}
