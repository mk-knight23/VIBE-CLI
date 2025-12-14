import { EventEmitter } from 'events';

export interface StreamEvent {
  type: 'phase' | 'token' | 'thinking' | 'tool' | 'complete' | 'error';
  data: {
    phase?: 'analyzing' | 'planning' | 'generating' | 'verifying' | 'finalizing';
    progress?: number;
    tokens?: number;
    cost?: number;
    thinkingTime?: number;
    tool?: string;
    status?: 'running' | 'success' | 'error';
    message?: string;
    error?: string;
  };
  timestamp: Date;
}

export interface UIState {
  currentPhase: string;
  progress: number;
  totalTokens: number;
  estimatedCost: number;
  thinkingTime: number;
  activeTools: string[];
  isComplete: boolean;
  hasError: boolean;
}

export class StreamingRenderer extends EventEmitter {
  private state: UIState;
  private startTime: number;
  private isRendering: boolean = false;

  constructor() {
    super();
    this.state = {
      currentPhase: 'initializing',
      progress: 0,
      totalTokens: 0,
      estimatedCost: 0,
      thinkingTime: 0,
      activeTools: [],
      isComplete: false,
      hasError: false
    };
    this.startTime = Date.now();
  }

  async render(events: AsyncIterable<StreamEvent>): Promise<void> {
    this.isRendering = true;
    this.clearScreen();
    this.renderHeader();

    try {
      for await (const event of events) {
        this.processEvent(event);
        this.updateDisplay();
        await this.sleep(50); // Smooth animation
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : String(error));
    } finally {
      this.isRendering = false;
      this.renderComplete();
    }
  }

  private processEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'phase':
        this.updatePhase(event.data.phase!, event.data.progress || 0);
        break;
      case 'token':
        this.updateTokens(event.data.tokens || 0, event.data.cost || 0);
        break;
      case 'thinking':
        this.updateThinking(event.data.thinkingTime || 0);
        break;
      case 'tool':
        this.updateTool(event.data.tool!, event.data.status!);
        break;
      case 'complete':
        this.state.isComplete = true;
        break;
      case 'error':
        this.handleError(event.data.error || 'Unknown error');
        break;
    }
  }

  updatePhase(phase: string, progress: number): void {
    this.state.currentPhase = phase;
    this.state.progress = Math.min(100, Math.max(0, progress));
    this.emit('phase-updated', { phase, progress });
  }

  updateTokens(count: number, cost: number): void {
    this.state.totalTokens = count;
    this.state.estimatedCost = cost;
    this.emit('tokens-updated', { count, cost });
  }

  showThinking(duration: number): void {
    this.state.thinkingTime = duration;
    this.emit('thinking-updated', { duration });
  }

  updateThinking(duration: number): void {
    this.state.thinkingTime = duration;
  }

  showTool(name: string, status: 'running' | 'success' | 'error'): void {
    if (status === 'running') {
      if (!this.state.activeTools.includes(name)) {
        this.state.activeTools.push(name);
      }
    } else {
      this.state.activeTools = this.state.activeTools.filter(t => t !== name);
    }
    this.emit('tool-updated', { name, status });
  }

  updateTool(name: string, status: 'running' | 'success' | 'error'): void {
    this.showTool(name, status);
  }

  private updateDisplay(): void {
    if (!this.isRendering) return;

    // Move cursor to top and redraw
    process.stdout.write('\x1b[H');
    this.renderHeader();
    this.renderPhases();
    this.renderStats();
    this.renderTools();
    this.renderFooter();
  }

  private renderHeader(): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🤖 VIBE v9.0 Multi-Agent Execution • Elapsed: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════════════');
  }

  private renderPhases(): void {
    const phases = [
      { name: 'analyzing', icon: '📊', label: 'Analyzing' },
      { name: 'planning', icon: '💭', label: 'Planning' },
      { name: 'generating', icon: '✍️', label: 'Generating' },
      { name: 'verifying', icon: '✓', label: 'Verifying' },
      { name: 'finalizing', icon: '⚙️', label: 'Finalizing' }
    ];

    phases.forEach(phase => {
      const isActive = this.state.currentPhase === phase.name;
      const isComplete = this.getPhaseProgress(phase.name) === 100;
      
      let progressBar = '';
      if (isActive) {
        progressBar = this.createProgressBar(this.state.progress);
      } else if (isComplete) {
        progressBar = this.createProgressBar(100);
      } else {
        progressBar = this.createProgressBar(0);
      }

      const status = isComplete ? '✅' : isActive ? '🔄' : '⏳';
      console.log(`${status} ${phase.icon} ${phase.label.padEnd(12)} ${progressBar}`);
    });
  }

  private renderStats(): void {
    console.log('');
    console.log(`📝 Tokens: ${this.state.totalTokens.toLocaleString()} | 💰 Cost: $${this.state.estimatedCost.toFixed(4)}`);
    
    if (this.state.thinkingTime > 0) {
      console.log(`💭 Extended thinking: ${(this.state.thinkingTime / 1000).toFixed(1)}s`);
    }
  }

  private renderTools(): void {
    if (this.state.activeTools.length > 0) {
      console.log('');
      console.log('🔧 Active Tools:');
      this.state.activeTools.forEach(tool => {
        console.log(`   • ${tool} 🔄`);
      });
    }
  }

  private renderFooter(): void {
    console.log('');
    if (this.state.hasError) {
      console.log('❌ Error occurred during execution');
    } else if (this.state.isComplete) {
      console.log('✅ Execution completed successfully');
    } else {
      console.log('⏳ Processing...');
    }
    console.log('═══════════════════════════════════════════════════════════');
  }

  private createProgressBar(progress: number, width: number = 20): string {
    const filled = Math.floor((progress / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${progress.toFixed(0).padStart(3)}%`;
  }

  private getPhaseProgress(phaseName: string): number {
    // Simple phase completion logic
    const phaseOrder = ['analyzing', 'planning', 'generating', 'verifying', 'finalizing'];
    const currentIndex = phaseOrder.indexOf(this.state.currentPhase);
    const phaseIndex = phaseOrder.indexOf(phaseName);
    
    if (phaseIndex < currentIndex) return 100;
    if (phaseIndex === currentIndex) return this.state.progress;
    return 0;
  }

  private clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  private handleError(error: string): void {
    this.state.hasError = true;
    this.emit('error', { error });
  }

  private renderComplete(): void {
    console.log('\n🎉 Multi-agent execution completed!');
    console.log(`📊 Final Stats:`);
    console.log(`   • Total tokens: ${this.state.totalTokens.toLocaleString()}`);
    console.log(`   • Total cost: $${this.state.estimatedCost.toFixed(4)}`);
    console.log(`   • Execution time: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
    if (this.state.thinkingTime > 0) {
      console.log(`   • Thinking time: ${(this.state.thinkingTime / 1000).toFixed(1)}s`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for external use
  getCurrentState(): UIState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      currentPhase: 'initializing',
      progress: 0,
      totalTokens: 0,
      estimatedCost: 0,
      thinkingTime: 0,
      activeTools: [],
      isComplete: false,
      hasError: false
    };
    this.startTime = Date.now();
  }
}

export class ErrorRenderer {
  static renderError(error: Error, context: string): void {
    console.log('\n❌ Error occurred:');
    console.log(`   Context: ${context}`);
    console.log(`   Message: ${error.message}`);
    if (process.env.VIBE_DEBUG === 'true') {
      console.log(`   Stack: ${error.stack}`);
    }
  }

  static renderWarning(message: string): void {
    console.log(`⚠️  Warning: ${message}`);
  }

  static renderSuccess(message: string): void {
    console.log(`✅ ${message}`);
  }
}

// Cost estimation utilities
export class CostEstimator {
  private static readonly MODEL_COSTS = {
    'openai/o3-mini': { input: 0.003, output: 0.012 },
    'anthropic/claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'google/gemini-2-0-flash': { input: 0.0001, output: 0.0004 },
    'deepseek/deepseek-r1': { input: 0.0002, output: 0.0008 },
    'meta-llama/llama-3.3-70b-instruct': { input: 0.0005, output: 0.002 }
  };

  static estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = this.MODEL_COSTS[model as keyof typeof this.MODEL_COSTS];
    if (!costs) return 0;

    return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
  }

  static formatCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }
}
