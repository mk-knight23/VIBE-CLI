import * as vscode from 'vscode';

export type ProviderType = 'openrouter' | 'megallm' | 'agentrouter' | 'routeway';

export interface ProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  priority: number; // Higher number = higher priority
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export class ProviderManager {
  private providers: Map<ProviderType, ProviderConfig> = new Map();
  private currentProvider: ProviderType;
  private fallbackEnabled: boolean = true;
  private rateLimitTracker: Map<string, { requests: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeProviders();
    this.currentProvider = this.getDefaultProvider();
  }

  private initializeProviders(): void {
    const config = vscode.workspace.getConfiguration('vibe');

    // OpenRouter
    this.providers.set('openrouter', {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('openrouterApiKey') || '',
      models: [
        'x-ai/grok-4.1-fast',
        'z-ai/glm-4.5-air:free',
        'deepseek/deepseek-chat-v3',
        'qwen/qwen3-coder-32b-instruct',
        'openai-gpt-oss-20b',
        'google/gemini-2.0-flash-exp:free',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o-mini'
      ],
      priority: 1,
      rateLimits: { requestsPerMinute: 60, requestsPerHour: 1000 }
    });

    // MegaLLM
    this.providers.set('megallm', {
      name: 'MegaLLM',
      baseURL: 'https://ai.megallm.io/v1',
      apiKey: config.get('megallmApiKey') || '',
      models: [
        'llama-3.3-70b-instruct',
        'deepseek-r1-distill-llama-70b',
        'moonshotai/kimi-k2-instruct-0905',
        'deepseek-ai/deepseek-v3.1-terminus',
        'minimaxai/minimax-m2',
        'qwen/qwen3-next-80b-a3b-instruct',
        'deepseek-ai/deepseek-v3.1',
        'mistralai/mistral-nemotron',
        'alibaba-qwen3-32b',
        'openai-gpt-oss-120b',
        'llama3-8b-instruct',
        'claude-3.5-sonnet'
      ],
      priority: 2,
      rateLimits: { requestsPerMinute: 100, requestsPerHour: 2000 }
    });

    // AgentRouter
    this.providers.set('agentrouter', {
      name: 'AgentRouter',
      baseURL: 'https://api.agentrouter.ai/v1',
      apiKey: config.get('agentrouterApiKey') || '',
      models: [
        'anthropic/claude-haiku-4.5',
        'anthropic/claude-sonnet-4.5',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-v3.1',
        'deepseek/deepseek-v3.2',
        'zhipu/glm-4.5',
        'zhipu/glm-4.6'
      ],
      priority: 3,
      rateLimits: { requestsPerMinute: 50, requestsPerHour: 1000 }
    });

    // Routeway
    this.providers.set('routeway', {
      name: 'Routeway',
      baseURL: 'https://api.routeway.ai/v1',
      apiKey: config.get('routewayApiKey') || '',
      models: [
        'moonshot/kimi-k2',
        'minimax/minimax-m2',
        'zhipu/glm-4.6-free',
        'deepseek/deepseek-v3-free',
        'meta/llama-3.2-3b-free',
        'gpt-4o-mini'
      ],
      priority: 4,
      rateLimits: { requestsPerMinute: 30, requestsPerHour: 500 }
    });
  }

  private getDefaultProvider(): ProviderType {
    const config = vscode.workspace.getConfiguration('vibe');
    const configured = config.get<ProviderType>('provider');
    return configured || 'megallm'; // Default to MegaLLM
  }

  /**
   * Set the current provider
   */
  setProvider(provider: ProviderType): void {
    if (this.providers.has(provider)) {
      this.currentProvider = provider;
      const config = vscode.workspace.getConfiguration('vibe');
      config.update('provider', provider, vscode.ConfigurationTarget.Global);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get the current provider
   */
  getCurrentProvider(): ProviderType {
    return this.currentProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): Map<ProviderType, ProviderConfig> {
    return this.providers;
  }

  /**
   * Update API key for a provider
   */
  updateApiKey(provider: ProviderType, apiKey: string): void {
    const providerConfig = this.providers.get(provider);
    if (providerConfig) {
      providerConfig.apiKey = apiKey;

      // Update VS Code settings
      const config = vscode.workspace.getConfiguration('vibe');
      const keyName = `${provider}ApiKey`;
      config.update(keyName, apiKey, vscode.ConfigurationTarget.Global);
    }
  }

  /**
   * Check if a provider is configured (has API key)
   */
  isProviderConfigured(provider: ProviderType): boolean {
    const config = this.providers.get(provider);
    return !!(config?.apiKey && config.apiKey.trim().length > 0);
  }

  /**
   * Get prioritized list of providers for fallback
   */
  private getProviderPriority(): ProviderType[] {
    return Array.from(this.providers.entries())
      .sort(([, a], [, b]) => b.priority - a.priority)
      .map(([type]) => type);
  }

  /**
   * Check rate limits for a provider
   */
  private checkRateLimit(provider: ProviderType): boolean {
    const config = this.providers.get(provider);
    if (!config?.rateLimits) return true;

    const key = `${provider}_requests`;
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(key);

    if (!tracker || now > tracker.resetTime) {
      // Reset or initialize tracker
      this.rateLimitTracker.set(key, {
        requests: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return true;
    }

    if (tracker.requests >= config.rateLimits.requestsPerMinute) {
      return false; // Rate limited
    }

    tracker.requests++;
    return true;
  }

  /**
   * Make a chat request with automatic fallback
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const providersToTry = this.fallbackEnabled
      ? this.getProviderPriority()
      : [this.currentProvider];

    let lastError: Error | null = null;

    for (const providerType of providersToTry) {
      // Skip if not configured
      if (!this.isProviderConfigured(providerType)) {
        continue;
      }

      // Check rate limits
      if (!this.checkRateLimit(providerType)) {
        console.warn(`Rate limited for provider: ${providerType}`);
        continue;
      }

      try {
        const response = await this.makeProviderRequest(providerType, request);

        // Success - update provider priority for future requests
        this.boostProviderPriority(providerType);

        return response;
      } catch (error: any) {
        console.warn(`Provider ${providerType} failed: ${error.message}`);
        lastError = error;

        // Penalize provider priority on failure
        this.penalizeProviderPriority(providerType);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Make request to specific provider
   */
  private async makeProviderRequest(providerType: ProviderType, request: ChatRequest): Promise<ChatResponse> {
    const config = this.providers.get(providerType);
    if (!config) throw new Error(`Provider not configured: ${providerType}`);

    // Ensure model is available for this provider
    if (!config.models.includes(request.model)) {
      // Try to find a similar model or use first available
      const fallbackModel = config.models.find(m => m.includes(request.model.split('/')[0])) || config.models[0];
      request.model = fallbackModel;
    }

    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4000,
      stream: request.stream || false,
      tools: request.tools
    };

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'Vibe VS Code Extension'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      model: data.model || request.model,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  /**
   * Fetch available models for a provider
   */
  async fetchModels(provider?: ProviderType): Promise<ModelInfo[]> {
    const targetProvider = provider || this.currentProvider;
    const config = this.providers.get(targetProvider);

    if (!config || !this.isProviderConfigured(targetProvider)) {
      return [];
    }

    try {
      const response = await fetch(`${config.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'User-Agent': 'Vibe VS Code Extension'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { data?: any[] };

      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length || 4096,
        pricing: model.pricing
      }));
    } catch (error) {
      console.warn(`Failed to fetch models for ${targetProvider}: ${error}`);
      // Return static model list as fallback
      return config.models.map(modelId => ({
        id: modelId,
        name: modelId,
        contextLength: 4096
      }));
    }
  }

  /**
   * Test provider connectivity
   */
  async testProvider(provider: ProviderType): Promise<{ success: boolean; error?: string; latency?: number }> {
    if (!this.isProviderConfigured(provider)) {
      return { success: false, error: 'Provider not configured' };
    }

    const startTime = Date.now();

    try {
      const models = await this.fetchModels(provider);
      const latency = Date.now() - startTime;

      return {
        success: models.length > 0,
        latency
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<Map<ProviderType, { configured: boolean; healthy: boolean; latency?: number; error?: string }>> {
    const health = new Map<ProviderType, { configured: boolean; healthy: boolean; latency?: number; error?: string }>();

    for (const [providerType] of this.providers) {
      const configured = this.isProviderConfigured(providerType);

      if (configured) {
        const testResult = await this.testProvider(providerType);
        health.set(providerType, {
          configured: true,
          healthy: testResult.success,
          latency: testResult.latency,
          error: testResult.error
        });
      } else {
        health.set(providerType, {
          configured: false,
          healthy: false
        });
      }
    }

    return health;
  }

  /**
   * Enable/disable automatic fallback
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
  }

  /**
   * Boost provider priority after successful request
   */
  private boostProviderPriority(provider: ProviderType): void {
    const config = this.providers.get(provider);
    if (config && config.priority < 10) {
      config.priority += 0.1; // Small boost
    }
  }

  /**
   * Penalize provider priority after failed request
   */
  private penalizeProviderPriority(provider: ProviderType): void {
    const config = this.providers.get(provider);
    if (config && config.priority > 1) {
      config.priority -= 0.5; // Larger penalty for failures
    }
  }

  /**
   * Get recommended model for a task type
   */
  getRecommendedModel(taskType: string, provider?: ProviderType): string {
    const targetProvider = provider || this.currentProvider;
    const config = this.providers.get(targetProvider);

    if (!config) return '';

    // Task-based model recommendations
    const recommendations: Record<string, string[]> = {
      'coding': ['qwen/qwen3-coder-32b-instruct', 'claude-3.5-sonnet', 'deepseek/deepseek-v3.1'],
      'debugging': ['qwen/qwen3-next-80b-a3b-instruct', 'anthropic/claude-sonnet-4.5', 'deepseek-r1-distill-llama-70b'],
      'architect': ['qwen/qwen3-next-80b-a3b-instruct', 'anthropic/claude-sonnet-4.5', 'llama-3.3-70b-instruct'],
      'analysis': ['qwen/qwen3-next-80b-a3b-instruct', 'deepseek/deepseek-chat-v3', 'mistralai/mistral-nemotron'],
      'general': ['x-ai/grok-4.1-fast', 'qwen/qwen3-next-80b-a3b-instruct', 'claude-3.5-sonnet']
    };

    const taskModels = recommendations[taskType] || recommendations['general'];

    // Find first available model
    return taskModels.find(model => config.models.includes(model)) || config.models[0];
  }

  /**
   * Rotate API keys for load balancing (if multiple keys available)
   */
  rotateApiKey(provider: ProviderType): void {
    // This would implement key rotation logic if multiple keys were supported
    // For now, it's a placeholder for future enhancement
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    providerUsage: Record<ProviderType, number>;
    totalRequests: number;
    successRate: number;
  } {
    // This would track actual usage - placeholder for now
    const providerUsage: Record<ProviderType, number> = {
      openrouter: 0,
      megallm: 0,
      agentrouter: 0,
      routeway: 0
    };

    const totalRequests = Object.values(providerUsage).reduce((sum, count) => sum + count, 0);

    return {
      providerUsage,
      totalRequests,
      successRate: totalRequests > 0 ? 0.95 : 0 // Placeholder success rate
    };
  }
}
