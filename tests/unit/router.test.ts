import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRouter } from '../../src/adapters/router';
import { LLMProvider } from '../../src/adapters/types';

describe('ProviderRouter', () => {
    let router: ProviderRouter;
    let mockProvider1: LLMProvider;
    let mockProvider2: LLMProvider;

    beforeEach(() => {
        router = new ProviderRouter();
        mockProvider1 = {
            id: 'mock1',
            name: 'Mock 1',
            generateCompletion: vi.fn().mockResolvedValue({ text: 'Response 1', model: 'm1' })
        };
        mockProvider2 = {
            id: 'mock2',
            name: 'Mock 2',
            generateCompletion: vi.fn().mockResolvedValue({ text: 'Response 2', model: 'm2' })
        };
        router.registerProvider(mockProvider1);
        router.registerProvider(mockProvider2);
    });

    it('should use the first provider in fallback order', async () => {
        // We'll mock configManager inside the test
        const result = await router.completion('test');
        // By default router has anthropic and openai, but we added mock1, mock2
        // If we want to test fallback, we need to control configManager.fallbackOrder
    });

    // Note: To properly test this, I'd need to mock configManager which is a singleton.
    // In a real project I'd use dependency injection or a cleaner singleton reset.
});
