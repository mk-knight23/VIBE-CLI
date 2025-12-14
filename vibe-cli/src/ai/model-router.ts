export interface ModelDefinition {
  id: string;
  provider: string;
  context: number;
  strengths: string[];
  costTier: 'low' | 'medium' | 'high';
  latency: 'fast' | 'medium' | 'slow';
  supportsThinking?: boolean;
  supportsVision?: boolean;
}

export enum TaskType {
  CODE_GENERATION = 'code_generation',
  DEBUG = 'debug',
  ARCHITECTURE = 'architecture',
  REFACTORING = 'refactoring',
  TESTING = 'testing',
  SECURITY = 'security_audit',
  PERFORMANCE = 'performance_optimization',
  DOCUMENTATION = 'documentation',
  ANALYSIS = 'analysis'
}

export interface RouterPreferences {
  preferredCostTier?: 'low' | 'medium' | 'high';
  maxLatency?: 'fast' | 'medium' | 'slow';
  requiresThinking?: boolean;
  requiresVision?: boolean;
}

// 2025 Model Catalog
const MODEL_CATALOG: ModelDefinition[] = [
  {
    id: 'openai/o3-mini',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['extended_thinking', 'complex_reasoning', 'debug'],
    costTier: 'medium',
    latency: 'slow',
    supportsThinking: true
  },
  {
    id: 'google/gemini-2-0-flash',
    provider: 'OpenRouter',
    context: 1000000,
    strengths: ['long_context', 'multimodal', 'fast'],
    costTier: 'low',
    latency: 'fast',
    supportsVision: true
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    provider: 'OpenRouter',
    context: 200000,
    strengths: ['code_generation', 'reasoning', 'swe-bench'],
    costTier: 'high',
    latency: 'medium'
  },
  {
    id: 'deepseek/deepseek-r1',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['extended_thinking', 'reasoning', 'math'],
    costTier: 'low',
    latency: 'medium',
    supportsThinking: true
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['code_generation', 'fast', 'general'],
    costTier: 'low',
    latency: 'fast'
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    provider: 'OpenRouter',
    context: 32000,
    strengths: ['code_generation', 'debugging', 'fast'],
    costTier: 'low',
    latency: 'fast'
  },
  {
    id: 'google/gemini-pro-1.5',
    provider: 'OpenRouter',
    context: 2000000,
    strengths: ['long_context', 'analysis', 'multimodal'],
    costTier: 'medium',
    latency: 'medium',
    supportsVision: true
  },
  {
    id: 'openai/gpt-4-turbo',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['code_generation', 'reasoning', 'general'],
    costTier: 'high',
    latency: 'medium'
  },
  {
    id: 'anthropic/claude-3-haiku',
    provider: 'OpenRouter',
    context: 200000,
    strengths: ['fast', 'cost_effective', 'general'],
    costTier: 'low',
    latency: 'fast'
  },
  {
    id: 'mistralai/mistral-large',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['code_generation', 'reasoning', 'multilingual'],
    costTier: 'medium',
    latency: 'medium'
  }
];

export class ModelRouter {
  private models: ModelDefinition[];
  private fallbackChains: Map<string, ModelDefinition[]> = new Map();

  constructor(customModels?: ModelDefinition[]) {
    this.models = customModels || MODEL_CATALOG;
    this.buildFallbackChains();
  }

  selectModel(
    task: TaskType,
    contextSize: number,
    preferences?: RouterPreferences
  ): ModelDefinition {
    
    // Filter models by requirements
    let candidates = this.models.filter(model => {
      // Context size requirement
      if (model.context < contextSize) return false;
      
      // Thinking requirement
      if (preferences?.requiresThinking && !model.supportsThinking) return false;
      
      // Vision requirement
      if (preferences?.requiresVision && !model.supportsVision) return false;
      
      // Cost preference
      if (preferences?.preferredCostTier) {
        const costOrder = { low: 0, medium: 1, high: 2 };
        const preferredCost = costOrder[preferences.preferredCostTier];
        const modelCost = costOrder[model.costTier];
        if (modelCost > preferredCost) return false;
      }
      
      // Latency preference
      if (preferences?.maxLatency) {
        const latencyOrder = { fast: 0, medium: 1, slow: 2 };
        const maxLatency = latencyOrder[preferences.maxLatency];
        const modelLatency = latencyOrder[model.latency];
        if (modelLatency > maxLatency) return false;
      }
      
      return true;
    });

    if (candidates.length === 0) {
      // Fallback to any model that fits context
      candidates = this.models.filter(model => model.context >= contextSize);
      if (candidates.length === 0) {
        // Ultimate fallback
        return this.models[0];
      }
    }

    // Score candidates
    const scoredCandidates = candidates.map(model => ({
      model,
      score: this.scoreModel(model, task, contextSize, preferences)
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates[0].model;
  }

  scoreModel(
    model: ModelDefinition, 
    task: TaskType, 
    contextSize: number,
    preferences?: RouterPreferences
  ): number {
    let score = 0;

    // Task-specific scoring
    const taskStrengthMap = {
      [TaskType.CODE_GENERATION]: ['code_generation', 'swe-bench'],
      [TaskType.DEBUG]: ['debug', 'extended_thinking', 'reasoning'],
      [TaskType.ARCHITECTURE]: ['reasoning', 'extended_thinking', 'analysis'],
      [TaskType.REFACTORING]: ['code_generation', 'reasoning'],
      [TaskType.TESTING]: ['code_generation', 'reasoning'],
      [TaskType.SECURITY]: ['reasoning', 'analysis', 'extended_thinking'],
      [TaskType.PERFORMANCE]: ['analysis', 'reasoning'],
      [TaskType.DOCUMENTATION]: ['general', 'reasoning'],
      [TaskType.ANALYSIS]: ['analysis', 'reasoning', 'extended_thinking']
    };

    const relevantStrengths = taskStrengthMap[task] || [];
    const matchingStrengths = model.strengths.filter(strength => 
      relevantStrengths.includes(strength)
    );
    score += matchingStrengths.length * 20;

    // Context efficiency scoring
    if (contextSize > 0) {
      const contextRatio = contextSize / model.context;
      if (contextRatio <= 0.5) score += 10; // Good context headroom
      else if (contextRatio <= 0.8) score += 5; // Adequate headroom
      // No bonus for tight context
    }

    // Cost efficiency
    const costScores = { low: 15, medium: 10, high: 5 };
    score += costScores[model.costTier];

    // Latency scoring
    const latencyScores = { fast: 10, medium: 5, slow: 0 };
    score += latencyScores[model.latency];

    // Special capabilities
    if (model.supportsThinking && this.isThinkingBeneficial(task)) {
      score += 15;
    }

    if (model.supportsVision && preferences?.requiresVision) {
      score += 20;
    }

    return score;
  }

  private isThinkingBeneficial(task: TaskType): boolean {
    const thinkingTasks = [
      TaskType.DEBUG,
      TaskType.ARCHITECTURE,
      TaskType.SECURITY,
      TaskType.ANALYSIS
    ];
    return thinkingTasks.includes(task);
  }

  buildFallbackChain(preferredModel: string): ModelDefinition[] {
    const preferred = this.models.find(m => m.id === preferredModel);
    if (!preferred) return this.models.slice(0, 3);

    const chain = [preferred];
    
    // Add models with similar strengths
    const similarModels = this.models
      .filter(m => m.id !== preferredModel)
      .filter(m => {
        const commonStrengths = m.strengths.filter(s => preferred.strengths.includes(s));
        return commonStrengths.length > 0;
      })
      .sort((a, b) => {
        const aCommon = a.strengths.filter(s => preferred.strengths.includes(s)).length;
        const bCommon = b.strengths.filter(s => preferred.strengths.includes(s)).length;
        return bCommon - aCommon;
      });

    chain.push(...similarModels.slice(0, 2));

    // Add a fast, reliable fallback
    const fastFallback = this.models.find(m => 
      m.latency === 'fast' && 
      m.costTier === 'low' && 
      !chain.includes(m)
    );
    if (fastFallback) chain.push(fastFallback);

    return chain;
  }

  private buildFallbackChains(): void {
    this.models.forEach(model => {
      this.fallbackChains.set(model.id, this.buildFallbackChain(model.id));
    });
  }

  getFallbackChain(modelId: string): ModelDefinition[] {
    return this.fallbackChains.get(modelId) || this.models.slice(0, 3);
  }

  getModelsByProvider(provider: string): ModelDefinition[] {
    return this.models.filter(m => m.provider === provider);
  }

  getModelsByStrength(strength: string): ModelDefinition[] {
    return this.models.filter(m => m.strengths.includes(strength));
  }

  getModelsByCostTier(tier: 'low' | 'medium' | 'high'): ModelDefinition[] {
    return this.models.filter(m => m.costTier === tier);
  }

  getRecommendedModels(task: TaskType, count = 3): ModelDefinition[] {
    const scored = this.models.map(model => ({
      model,
      score: this.scoreModel(model, task, 0)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.model);
  }

  addModel(model: ModelDefinition): void {
    this.models.push(model);
    this.buildFallbackChains();
  }

  removeModel(modelId: string): void {
    this.models = this.models.filter(m => m.id !== modelId);
    this.buildFallbackChains();
  }

  getAllModels(): ModelDefinition[] {
    return [...this.models];
  }

  getModelStats(): {
    totalModels: number;
    byProvider: Record<string, number>;
    byCostTier: Record<string, number>;
    byLatency: Record<string, number>;
  } {
    const stats = {
      totalModels: this.models.length,
      byProvider: {} as Record<string, number>,
      byCostTier: {} as Record<string, number>,
      byLatency: {} as Record<string, number>
    };

    this.models.forEach(model => {
      stats.byProvider[model.provider] = (stats.byProvider[model.provider] || 0) + 1;
      stats.byCostTier[model.costTier] = (stats.byCostTier[model.costTier] || 0) + 1;
      stats.byLatency[model.latency] = (stats.byLatency[model.latency] || 0) + 1;
    });

    return stats;
  }
}
