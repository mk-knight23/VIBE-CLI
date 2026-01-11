import { BasePrimitive, PrimitiveResult } from './types';
import { providerRouter } from '../adapters/router';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('PlanningPrimitive');

export class PlanningPrimitive extends BasePrimitive {
    public id = 'planning';
    public name = 'Planning Primitive';

    public async execute(input: { task: string; context?: string }, onChunk?: (chunk: string) => void): Promise<PrimitiveResult> {
        const systemPrompt = `You are the VIBE Planning Engine. 
Your goal is to decompose a complex coding task into a series of actionable steps.
Each step should map to one of the VIBE primitives: COMPLETION, MULTI-EDIT, EXECUTION, APPROVAL, MEMORY, SEARCH.

Output format: JSON array of objects:
[{ "step": 1, "task": "...", "primitive": "...", "rationale": "..." }]

IMPORTANT: Use only double quotes for JSON strings. Do not use single quotes.`;

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

            // Extract JSON array from response
            const jsonMatch = fullText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return {
                    success: false,
                    error: 'Failed to parse plan from LLM response',
                    data: fullText
                };
            }

            // Sanitize and parse JSON
            const plan = this.parseJsonSafely(jsonMatch[0]);
            if (!plan) {
                return {
                    success: false,
                    error: 'Failed to parse plan JSON - invalid format',
                    data: jsonMatch[0]
                };
            }

            return {
                success: true,
                data: plan,
            };
        } catch (error: any) {
            logger.error(`Planning failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Safely parse JSON with sanitization for common LLM output issues.
     */
    private parseJsonSafely(jsonStr: string): any[] | null {
        try {
            // First, try direct parsing
            return JSON.parse(jsonStr);
        } catch (e) {
            // Sanitization steps for common LLM JSON issues
            let sanitized = jsonStr;

            try {
                // Step 1: Replace single quotes with double quotes (but not inside strings)
                // This is a simple approach that works for most cases
                sanitized = sanitized.replace(/'/g, '"');

                // Step 2: Remove trailing commas before ] or }
                sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

                // Step 3: Fix unquoted property names
                sanitized = sanitized.replace(/(\{|\,)\s*(\w+)\s*:/g, '$1"$2":');

                // Step 4: Remove any control characters
                sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');

                // Step 5: Try parsing again
                return JSON.parse(sanitized);
            } catch (e2) {
                logger.error(`JSON sanitization failed: ${(e2 as Error).message}`);
                logger.error(`Original: ${jsonStr.substring(0, 200)}...`);
                return null;
            }
        }
    }
}

