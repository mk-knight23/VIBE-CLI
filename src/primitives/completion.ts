import { BasePrimitive, PrimitiveResult } from './types';
import { providerRouter } from '../adapters/router';
import { ProviderOptions } from '../adapters/types';

export class CompletionPrimitive extends BasePrimitive {
    public id = 'completion';
    public name = 'Completion Primitive';

    public async execute(input: { prompt: string; options?: ProviderOptions }): Promise<PrimitiveResult> {
        try {
            const response = await providerRouter.completion(input.prompt, input.options);
            return {
                success: true,
                data: response,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
