export interface ExtendedThinkingConfig {
  enabled: boolean;
  thinkingBudget: number;  // tokens
  models: string[];  // o3-mini, DeepSeek R1, etc.
  tasksToAutoEnable: string[];  // debug, architecture, security_audit
  maxThinkingTime: number;  // milliseconds
}

export interface ThinkingRequest extends ProviderRequest {
  thinking: {
    enabled: true;
    budget: number;
  };
}

export interface ThinkingTrace {
  taskId: string;
  thinking: string;
  tokenCount: number;
  duration: number;
  timestamp: Date;
}

export interface ProviderRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ThinkingDetector {
  private config: ExtendedThinkingConfig;

  constructor(config?: Partial<ExtendedThinkingConfig>) {
    this.config = {
      enabled: true,
      thinkingBudget: 5000,
      models: ['openai/o3-mini', 'deepseek/deepseek-r1', 'anthropic/claude-3-opus'],
      tasksToAutoEnable: ['debug', 'architecture', 'security_audit', 'complex_analysis', 'design'],
      maxThinkingTime: 30000, // 30 seconds
      ...config
    };
  }

  shouldEnableThinking(task: string, context: string): boolean {
    if (!this.config.enabled) return false;

    const taskLower = task.toLowerCase();
    const contextLower = context.toLowerCase();

    // Check for auto-enable keywords
    const hasAutoKeyword = this.config.tasksToAutoEnable.some(keyword => 
      taskLower.includes(keyword) || contextLower.includes(keyword)
    );

    if (hasAutoKeyword) return true;

    // Check for complexity indicators
    const complexityIndicators = [
      'complex', 'difficult', 'challenging', 'analyze', 'investigate',
      'multiple', 'various', 'several', 'comprehensive', 'thorough'
    ];

    const hasComplexity = complexityIndicators.some(indicator =>
      taskLower.includes(indicator) || contextLower.includes(indicator)
    );

    // Check for problem-solving indicators
    const problemSolvingIndicators = [
      'why', 'how', 'what if', 'compare', 'evaluate', 'assess',
      'determine', 'figure out', 'solve', 'resolve'
    ];

    const hasProblemSolving = problemSolvingIndicators.some(indicator =>
      taskLower.includes(indicator) || contextLower.includes(indicator)
    );

    return hasComplexity || hasProblemSolving;
  }

  getThinkingBudget(task: string): number {
    const taskLower = task.toLowerCase();

    // High complexity tasks get more budget
    if (taskLower.includes('architecture') || taskLower.includes('design')) {
      return Math.min(this.config.thinkingBudget * 1.5, 8000);
    }

    if (taskLower.includes('debug') || taskLower.includes('security')) {
      return Math.min(this.config.thinkingBudget * 1.2, 6000);
    }

    return this.config.thinkingBudget;
  }

  selectThinkingModel(): string {
    // Prefer o3-mini for complex reasoning
    if (this.config.models.includes('openai/o3-mini')) {
      return 'openai/o3-mini';
    }

    // Fallback to DeepSeek R1
    if (this.config.models.includes('deepseek/deepseek-r1')) {
      return 'deepseek/deepseek-r1';
    }

    // Default to first available model
    return this.config.models[0] || 'openai/gpt-4';
  }

  updateConfig(newConfig: Partial<ExtendedThinkingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export class ThinkingLogger {
  private traces: Map<string, ThinkingTrace> = new Map();
  private maxTraces = 100; // Keep last 100 traces

  logThinking(thinking: string, metadata: {
    task: string;
    tokenCount: number;
    duration: number;
  }): void {
    const taskId = this.generateTaskId(metadata.task);
    
    const trace: ThinkingTrace = {
      taskId,
      thinking,
      tokenCount: metadata.tokenCount,
      duration: metadata.duration,
      timestamp: new Date()
    };

    this.traces.set(taskId, trace);

    // Cleanup old traces
    if (this.traces.size > this.maxTraces) {
      const oldestKey = this.traces.keys().next().value;
      if (oldestKey) {
        this.traces.delete(oldestKey);
      }
    }

    // Log to console in debug mode
    if (process.env.VIBE_DEBUG === 'true') {
      console.log(`[THINKING] ${taskId}: ${metadata.tokenCount} tokens, ${metadata.duration}ms`);
    }
  }

  getThinkingTrace(taskId: string): string | null {
    const trace = this.traces.get(taskId);
    return trace ? trace.thinking : null;
  }

  getAllTraces(): ThinkingTrace[] {
    return Array.from(this.traces.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  getTracesByTimeRange(start: Date, end: Date): ThinkingTrace[] {
    return this.getAllTraces().filter(trace =>
      trace.timestamp >= start && trace.timestamp <= end
    );
  }

  exportTraces(format: 'json' | 'csv' = 'json'): string {
    const traces = this.getAllTraces();
    
    if (format === 'csv') {
      const headers = 'TaskId,TokenCount,Duration,Timestamp,ThinkingPreview';
      const rows = traces.map(trace => 
        `${trace.taskId},${trace.tokenCount},${trace.duration},${trace.timestamp.toISOString()},"${trace.thinking.substring(0, 100).replace(/"/g, '""')}"`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(traces, null, 2);
  }

  clearTraces(): void {
    this.traces.clear();
  }

  private generateTaskId(task: string): string {
    const timestamp = Date.now().toString(36);
    const taskHash = this.simpleHash(task).toString(36);
    return `${timestamp}-${taskHash}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export class ExtendedThinkingManager {
  private detector: ThinkingDetector;
  private logger: ThinkingLogger;

  constructor(config?: Partial<ExtendedThinkingConfig>) {
    this.detector = new ThinkingDetector(config);
    this.logger = new ThinkingLogger();
  }

  async processRequest(
    task: string, 
    context: string = '',
    baseRequest: ProviderRequest
  ): Promise<ThinkingRequest | ProviderRequest> {
    
    if (!this.detector.shouldEnableThinking(task, context)) {
      return baseRequest;
    }

    const budget = this.detector.getThinkingBudget(task);
    const model = this.detector.selectThinkingModel();

    return {
      ...baseRequest,
      model,
      thinking: {
        enabled: true,
        budget
      }
    };
  }

  logThinkingResult(
    task: string,
    thinking: string,
    tokenCount: number,
    duration: number
  ): void {
    this.logger.logThinking(thinking, {
      task,
      tokenCount,
      duration
    });
  }

  getThinkingTrace(taskId: string): string | null {
    return this.logger.getThinkingTrace(taskId);
  }

  exportThinkingLogs(format: 'json' | 'csv' = 'json'): string {
    return this.logger.exportTraces(format);
  }

  updateConfig(config: Partial<ExtendedThinkingConfig>): void {
    this.detector.updateConfig(config);
  }

  getStats(): {
    totalTraces: number;
    averageTokens: number;
    averageDuration: number;
    mostRecentTrace: Date | null;
  } {
    const traces = this.logger.getAllTraces();
    
    if (traces.length === 0) {
      return {
        totalTraces: 0,
        averageTokens: 0,
        averageDuration: 0,
        mostRecentTrace: null
      };
    }

    const totalTokens = traces.reduce((sum, trace) => sum + trace.tokenCount, 0);
    const totalDuration = traces.reduce((sum, trace) => sum + trace.duration, 0);

    return {
      totalTraces: traces.length,
      averageTokens: Math.round(totalTokens / traces.length),
      averageDuration: Math.round(totalDuration / traces.length),
      mostRecentTrace: traces[0].timestamp
    };
  }
}
