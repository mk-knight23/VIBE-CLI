import { BasePrimitive, PrimitiveResult } from './types';
import { providerRouter } from '../adapters/router';

export class PlanningPrimitive extends BasePrimitive {
    public id = 'planning';
    public name = 'Planning Primitive';

    public async execute(input: { task: string; context?: string }, onChunk?: (chunk: string) => void): Promise<PrimitiveResult> {
        const systemPrompt = `You are the VIBE Planning Engine. 
Your goal is to decompose a complex coding task into a series of actionable steps.
Each step should map to one of the VIBE primitives: COMPLETION, MULTI-EDIT, EXECUTION, APPROVAL, MEMORY, SEARCH.

Output format: JSON array of objects:
[{ "step": 1, "task": "...", "primitive": "...", "rationale": "..." }]`;

        const userPrompt = `Task: ${input.task}\nContext: ${input.context || 'None'}`;

        try {
            let fullText = '';
            const stream = providerRouter.stream(userPrompt, {
                systemPrompt,
            });

            for await (const chunk of stream) {
                fullText += chunk;
                if (onChunk) onChunk(chunk);
            }

            // Simple JSON extraction
            const jsonMatch = fullText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return {
                    success: false,
                    error: 'Failed to parse plan from LLM response',
                    data: fullText
                };
            }

            const plan = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                data: plan,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
