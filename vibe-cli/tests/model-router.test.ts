import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter, TaskType, ModelDefinition } from '../src/ai/model-router';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  it('should select appropriate model for each task type', () => {
    const codeGenModel = router.selectModel(TaskType.CODE_GENERATION, 50000);
    const debugModel = router.selectModel(TaskType.DEBUG, 50000);
    const architectureModel = router.selectModel(TaskType.ARCHITECTURE, 50000);

    expect(codeGenModel).toBeDefined();
    expect(debugModel).toBeDefined();
    expect(architectureModel).toBeDefined();

    // Debug tasks should prefer thinking models
    expect(debugModel.supportsThinking || debugModel.strengths.includes('debug')).toBe(true);
    
    // Code generation should prefer code-focused models
    expect(codeGenModel.strengths.includes('code_generation') || 
           codeGenModel.strengths.includes('swe-bench')).toBe(true);
  });

  it('should respect context size requirements', () => {
    const largeContextModel = router.selectModel(TaskType.ANALYSIS, 500000);
    const smallContextModel = router.selectModel(TaskType.CODE_GENERATION, 10000);

    expect(largeContextModel.context).toBeGreaterThanOrEqual(500000);
    expect(smallContextModel.context).toBeGreaterThanOrEqual(10000);
  });

  it('should respect cost preferences', () => {
    const lowCostModel = router.selectModel(
      TaskType.CODE_GENERATION, 
      50000, 
      { preferredCostTier: 'low' }
    );

    const highCostModel = router.selectModel(
      TaskType.CODE_GENERATION, 
      50000, 
      { preferredCostTier: 'high' }
    );

    expect(lowCostModel.costTier).toBe('low');
    expect(['medium', 'high']).toContain(highCostModel.costTier);
  });

  it('should respect latency preferences', () => {
    const fastModel = router.selectModel(
      TaskType.CODE_GENERATION, 
      50000, 
      { maxLatency: 'fast' }
    );

    expect(fastModel.latency).toBe('fast');
  });

  it('should respect thinking requirements', () => {
    const thinkingModel = router.selectModel(
      TaskType.DEBUG, 
      50000, 
      { requiresThinking: true }
    );

    expect(thinkingModel.supportsThinking).toBe(true);
  });

  it('should score models correctly', () => {
    const models = router.getAllModels();
    const codeModel = models.find(m => m.strengths.includes('code_generation'));
    const thinkingModel = models.find(m => m.supportsThinking);

    if (codeModel) {
      const codeScore = router.scoreModel(codeModel, TaskType.CODE_GENERATION, 50000);
      const debugScore = router.scoreModel(codeModel, TaskType.DEBUG, 50000);
      
      expect(codeScore).toBeGreaterThan(debugScore);
    }

    if (thinkingModel) {
      const debugScore = router.scoreModel(thinkingModel, TaskType.DEBUG, 50000);
      const simpleScore = router.scoreModel(thinkingModel, TaskType.DOCUMENTATION, 50000);
      
      expect(debugScore).toBeGreaterThan(simpleScore);
    }
  });

  it('should build fallback chains correctly', () => {
    const models = router.getAllModels();
    const firstModel = models[0];
    
    const fallbackChain = router.buildFallbackChain(firstModel.id);
    
    expect(fallbackChain.length).toBeGreaterThanOrEqual(1);
    expect(fallbackChain.length).toBeLessThanOrEqual(4);
    expect(fallbackChain[0]).toEqual(firstModel);
    expect(fallbackChain.every(m => m.id !== undefined)).toBe(true);
  });

  it('should filter models by provider', () => {
    const openRouterModels = router.getModelsByProvider('OpenRouter');
    
    expect(openRouterModels.length).toBeGreaterThan(0);
    expect(openRouterModels.every(m => m.provider === 'OpenRouter')).toBe(true);
  });

  it('should filter models by strength', () => {
    const codeModels = router.getModelsByStrength('code_generation');
    
    expect(codeModels.length).toBeGreaterThan(0);
    expect(codeModels.every(m => m.strengths.includes('code_generation'))).toBe(true);
  });

  it('should filter models by cost tier', () => {
    const lowCostModels = router.getModelsByCostTier('low');
    const highCostModels = router.getModelsByCostTier('high');
    
    expect(lowCostModels.every(m => m.costTier === 'low')).toBe(true);
    expect(highCostModels.every(m => m.costTier === 'high')).toBe(true);
  });

  it('should recommend models for tasks', () => {
    const recommendations = router.getRecommendedModels(TaskType.DEBUG, 3);
    
    expect(recommendations).toHaveLength(3);
    expect(recommendations.every(m => m.id !== undefined)).toBe(true);
    
    // Should be sorted by relevance (score)
    const scores = recommendations.map(m => router.scoreModel(m, TaskType.DEBUG, 0));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('should add and remove models', () => {
    const initialCount = router.getAllModels().length;
    
    const customModel: ModelDefinition = {
      id: 'custom/test-model',
      provider: 'Custom',
      context: 100000,
      strengths: ['test'],
      costTier: 'medium',
      latency: 'fast'
    };

    router.addModel(customModel);
    expect(router.getAllModels()).toHaveLength(initialCount + 1);

    router.removeModel('custom/test-model');
    expect(router.getAllModels()).toHaveLength(initialCount);
  });

  it('should provide accurate statistics', () => {
    const stats = router.getModelStats();
    
    expect(stats.totalModels).toBeGreaterThan(0);
    expect(Object.keys(stats.byProvider)).toContain('OpenRouter');
    expect(Object.keys(stats.byCostTier)).toContain('low');
    expect(Object.keys(stats.byCostTier)).toContain('medium');
    expect(Object.keys(stats.byCostTier)).toContain('high');
    expect(Object.keys(stats.byLatency)).toContain('fast');
  });

  it('should handle edge cases gracefully', () => {
    // Very large context requirement
    const largeContextModel = router.selectModel(TaskType.ANALYSIS, 5000000);
    expect(largeContextModel).toBeDefined();

    // Impossible requirements should fallback gracefully
    const impossibleModel = router.selectModel(
      TaskType.CODE_GENERATION, 
      10000000, // Larger than any model
      { 
        preferredCostTier: 'low',
        maxLatency: 'fast',
        requiresThinking: true,
        requiresVision: true
      }
    );
    expect(impossibleModel).toBeDefined();
  });
});
