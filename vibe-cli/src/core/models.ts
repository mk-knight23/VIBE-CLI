/**
 * Model registry with all providers and their models
 */

export interface ModelDescriptor {
  id: string;
  label: string;
  contextTokens: number;
  category: 'free' | 'premium';
  recommendedFor: string[];
}

export interface ProviderConfig {
  base: string;
  defaultKey: string;
  fallbackKeys: string[];
  models: ModelDescriptor[];
}

export const MODEL_REGISTRY: {
  providers: {
    openrouter: ProviderConfig;
    megallm: ProviderConfig;
    agentrouter: ProviderConfig;
    routeway: ProviderConfig;
  };
} = {
  providers: {
    openrouter: {
      base: 'https://openrouter.ai/api/v1',
      defaultKey: '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',
      fallbackKeys: [],
      models: [
        { id: 'x-ai/grok-4.1-fast:free', label: 'Grok 4.1 Fast', contextTokens: 128000, category: 'free', recommendedFor: ['chat', 'general'] },
        { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', contextTokens: 128000, category: 'free', recommendedFor: ['chat', 'general'] },
        { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek Chat V3', contextTokens: 64000, category: 'free', recommendedFor: ['chat', 'code'] },
        { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder', contextTokens: 32000, category: 'free', recommendedFor: ['code'] },
        { id: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B', contextTokens: 8000, category: 'free', recommendedFor: ['general'] },
        { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash', contextTokens: 1000000, category: 'free', recommendedFor: ['chat', 'long-context'] }
      ]
    },
    megallm: {
      base: 'https://ai.megallm.io/v1',
      defaultKey: 'sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820',
      fallbackKeys: [],
      models: [
        { id: 'openai-gpt-oss-20b', label: 'GPT OSS 20B', contextTokens: 8000, category: 'free', recommendedFor: ['general'] },
        { id: 'llama3.3-70b-instruct', label: 'Llama 3.3 70B', contextTokens: 128000, category: 'free', recommendedFor: ['instruct', 'code'] },
        { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill', contextTokens: 64000, category: 'free', recommendedFor: ['reasoning', 'code'] },
        { id: 'alibaba-qwen3-32b', label: 'Qwen3 32B', contextTokens: 32000, category: 'free', recommendedFor: ['general'] },
        { id: 'openai-gpt-oss-120b', label: 'GPT OSS 120B', contextTokens: 8000, category: 'free', recommendedFor: ['general'] },
        { id: 'llama3-8b-instruct', label: 'Llama 3 8B', contextTokens: 8000, category: 'free', recommendedFor: ['instruct'] },
        { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2', contextTokens: 200000, category: 'free', recommendedFor: ['long-context'] },
        { id: 'deepseek-ai/deepseek-v3.1-terminus', label: 'DeepSeek V3.1 Terminus', contextTokens: 64000, category: 'free', recommendedFor: ['code', 'reasoning'] },
        { id: 'qwen/qwen3-next-80b-a3b-instruct', label: 'Qwen3 Next 80B', contextTokens: 32000, category: 'free', recommendedFor: ['instruct'] },
        { id: 'deepseek-ai/deepseek-v3.1', label: 'DeepSeek V3.1', contextTokens: 64000, category: 'free', recommendedFor: ['code', 'reasoning'] },
        { id: 'mistralai/mistral-nemotron', label: 'Mistral Nemotron', contextTokens: 32000, category: 'free', recommendedFor: ['general'] },
        { id: 'minimaxai/minimax-m2', label: 'MiniMax M2', contextTokens: 200000, category: 'free', recommendedFor: ['long-context'] }
      ]
    },
    agentrouter: {
      base: 'https://agentrouter.org/v1',
      defaultKey: 'sk-WXLlCAeAaDCeEjMWCBo7sqXGPOF1HrYEDm0JFBDXP3tEiERw',
      fallbackKeys: [],
      models: [
        { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', contextTokens: 200000, category: 'free', recommendedFor: ['chat', 'fast'] },
        { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', contextTokens: 200000, category: 'free', recommendedFor: ['chat', 'code'] },
        { id: 'deepseek-r1-0528', label: 'DeepSeek R1', contextTokens: 64000, category: 'free', recommendedFor: ['reasoning'] },
        { id: 'deepseek-v3.1', label: 'DeepSeek V3.1', contextTokens: 64000, category: 'free', recommendedFor: ['code', 'reasoning'] },
        { id: 'deepseek-v3.2', label: 'DeepSeek V3.2', contextTokens: 64000, category: 'free', recommendedFor: ['code', 'reasoning'] },
        { id: 'glm-4.5', label: 'GLM 4.5', contextTokens: 128000, category: 'free', recommendedFor: ['general'] },
        { id: 'glm-4.6', label: 'GLM 4.6', contextTokens: 128000, category: 'free', recommendedFor: ['general'] }
      ]
    },
    routeway: {
      base: 'https://api.routeway.ai/v1',
      defaultKey: 'sk-LeRlb8aww5YXvdP57hnVw07xmIA2c3FvfeLvPhbmFU14osMn',
      fallbackKeys: [],
      models: [
        { id: 'kimi-k2-0905:free', label: 'Kimi K2', contextTokens: 200000, category: 'free', recommendedFor: ['long-context'] },
        { id: 'minimax-m2:free', label: 'MiniMax M2', contextTokens: 200000, category: 'free', recommendedFor: ['long-context'] },
        { id: 'glm-4.6:free', label: 'GLM 4.6', contextTokens: 128000, category: 'free', recommendedFor: ['general'] },
        { id: 'mai-ds-r1:free', label: 'MAI DS R1', contextTokens: 64000, category: 'free', recommendedFor: ['reasoning'] },
        { id: 'deepseek-v3-0324:free', label: 'DeepSeek V3', contextTokens: 64000, category: 'free', recommendedFor: ['code', 'reasoning'] },
        { id: 'llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B', contextTokens: 8000, category: 'free', recommendedFor: ['instruct'] }
      ]
    }
  }
};
