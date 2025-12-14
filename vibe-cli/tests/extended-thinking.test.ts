import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ThinkingDetector, 
  ThinkingLogger, 
  ExtendedThinkingManager 
} from '../src/ai/extended-thinking';

describe('ThinkingDetector', () => {
  let detector: ThinkingDetector;

  beforeEach(() => {
    detector = new ThinkingDetector();
  });

  it('should auto-detect tasks needing extended thinking', () => {
    const debugTask = 'Debug the complex memory leak in the application';
    const architectureTask = 'Design a scalable microservices architecture';
    const simpleTask = 'Add a button to the UI';

    expect(detector.shouldEnableThinking(debugTask, '')).toBe(true);
    expect(detector.shouldEnableThinking(architectureTask, '')).toBe(true);
    expect(detector.shouldEnableThinking(simpleTask, '')).toBe(false);
  });

  it('should calculate appropriate thinking budget', () => {
    const architectureTask = 'Design system architecture';
    const debugTask = 'Debug application error';
    const generalTask = 'Write a function';

    expect(detector.getThinkingBudget(architectureTask)).toBeGreaterThan(5000);
    expect(detector.getThinkingBudget(debugTask)).toBeGreaterThan(5000);
    expect(detector.getThinkingBudget(generalTask)).toBe(5000);
  });

  it('should select appropriate thinking model', () => {
    const model = detector.selectThinkingModel();
    expect(model).toBeDefined();
    expect(typeof model).toBe('string');
  });

  it('should detect complexity indicators', () => {
    const complexTask = 'Analyze multiple complex systems and determine the best approach';
    const simpleTask = 'Update the README file';

    expect(detector.shouldEnableThinking(complexTask, '')).toBe(true);
    expect(detector.shouldEnableThinking(simpleTask, '')).toBe(false);
  });

  it('should detect problem-solving indicators', () => {
    const problemTask = 'Why is the application crashing and how can we fix it?';
    const informationalTask = 'List the project dependencies';

    expect(detector.shouldEnableThinking(problemTask, '')).toBe(true);
    expect(detector.shouldEnableThinking(informationalTask, '')).toBe(false);
  });
});

describe('ThinkingLogger', () => {
  let logger: ThinkingLogger;

  beforeEach(() => {
    logger = new ThinkingLogger();
  });

  it('should log thinking traces correctly', () => {
    const thinking = 'Let me think about this problem step by step...';
    const metadata = {
      task: 'Debug memory leak',
      tokenCount: 150,
      duration: 2500
    };

    logger.logThinking(thinking, metadata);

    const traces = logger.getAllTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0].thinking).toBe(thinking);
    expect(traces[0].tokenCount).toBe(150);
    expect(traces[0].duration).toBe(2500);
  });

  it('should retrieve thinking trace by task ID', () => {
    const thinking = 'Complex reasoning trace';
    const metadata = {
      task: 'Architecture design',
      tokenCount: 200,
      duration: 3000
    };

    logger.logThinking(thinking, metadata);
    const traces = logger.getAllTraces();
    const taskId = traces[0].taskId;

    const retrieved = logger.getThinkingTrace(taskId);
    expect(retrieved).toBe(thinking);
  });

  it('should limit trace storage', () => {
    // Add more traces than the limit
    for (let i = 0; i < 150; i++) {
      logger.logThinking(`Trace ${i}`, {
        task: `Task ${i}`,
        tokenCount: 100,
        duration: 1000
      });
    }

    const traces = logger.getAllTraces();
    expect(traces.length).toBeLessThanOrEqual(100);
  });

  it('should export traces in JSON format', () => {
    logger.logThinking('Test thinking', {
      task: 'Test task',
      tokenCount: 50,
      duration: 1000
    });

    const exported = logger.exportTraces('json');
    const parsed = JSON.parse(exported);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].thinking).toBe('Test thinking');
  });

  it('should export traces in CSV format', () => {
    logger.logThinking('Test thinking', {
      task: 'Test task',
      tokenCount: 50,
      duration: 1000
    });

    const exported = logger.exportTraces('csv');
    const lines = exported.split('\n');
    
    expect(lines[0]).toContain('TaskId,TokenCount,Duration');
    expect(lines[1]).toContain('50,1000');
  });
});

describe('ExtendedThinkingManager', () => {
  let manager: ExtendedThinkingManager;

  beforeEach(() => {
    manager = new ExtendedThinkingManager();
  });

  it('should process requests and enable thinking when appropriate', async () => {
    const task = 'Debug complex memory leak';
    const context = 'Application crashes randomly';
    const baseRequest = {
      prompt: 'Help me debug this issue',
      maxTokens: 1000
    };

    const result = await manager.processRequest(task, context, baseRequest);

    expect('thinking' in result).toBe(true);
    if ('thinking' in result) {
      expect(result.thinking.enabled).toBe(true);
      expect(result.thinking.budget).toBeGreaterThan(0);
    }
  });

  it('should not enable thinking for simple tasks', async () => {
    const task = 'Add a console.log statement';
    const context = '';
    const baseRequest = {
      prompt: 'Add logging',
      maxTokens: 100
    };

    const result = await manager.processRequest(task, context, baseRequest);

    expect('thinking' in result).toBe(false);
  });

  it('should log thinking results', () => {
    const task = 'Complex analysis';
    const thinking = 'Detailed reasoning process';
    const tokenCount = 300;
    const duration = 5000;

    manager.logThinkingResult(task, thinking, tokenCount, duration);

    const stats = manager.getStats();
    expect(stats.totalTraces).toBe(1);
    expect(stats.averageTokens).toBe(300);
    expect(stats.averageDuration).toBe(5000);
  });

  it('should provide accurate statistics', () => {
    // Log multiple thinking results
    manager.logThinkingResult('Task 1', 'Thinking 1', 100, 2000);
    manager.logThinkingResult('Task 2', 'Thinking 2', 200, 4000);
    manager.logThinkingResult('Task 3', 'Thinking 3', 300, 6000);

    const stats = manager.getStats();
    expect(stats.totalTraces).toBe(3);
    expect(stats.averageTokens).toBe(200); // (100+200+300)/3
    expect(stats.averageDuration).toBe(4000); // (2000+4000+6000)/3
    expect(stats.mostRecentTrace).toBeInstanceOf(Date);
  });
});
