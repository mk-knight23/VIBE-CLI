import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  EmbeddingGenerator,
  HybridSearch
} from '../src/memory/semantic-search';
import { 
  MemorySummarizer, 
  TokenBudgetTracker 
} from '../src/memory/compression';
import { 
  InstructionValidator, 
  InstructionInjector 
} from '../src/prompts/custom-instructions';
import { ChatTurn } from '../src/memory/semantic-search';

// Mock fetch for embedding API
global.fetch = vi.fn();

describe('EmbeddingGenerator Core', () => {
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    generator = new EmbeddingGenerator();
    vi.clearAllMocks();
  });

  it('should generate embeddings using Ollama when available', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
    };
    
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const embedding = await generator.generateEmbedding('test text');

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it('should fallback to hash-based embedding when Ollama unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

    const embedding = await generator.generateEmbedding('test text');

    expect(embedding).toHaveLength(384);
    expect(embedding.every(val => typeof val === 'number')).toBe(true);
  });

  it('should normalize fallback embeddings', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('No connection'));

    const embedding = await generator.generateEmbedding('a');

    // Check that embedding is normalized
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });
});

describe('MemorySummarizer Core', () => {
  let summarizer: MemorySummarizer;

  beforeEach(() => {
    summarizer = new MemorySummarizer();
  });

  it('should summarize conversation turns', async () => {
    const turns: ChatTurn[] = [
      {
        id: 'sum-1',
        turn: 1,
        message: 'How do I implement authentication?',
        role: 'user',
        timestamp: new Date(),
        tokens: 25,
        task: 'auth'
      },
      {
        id: 'sum-2',
        turn: 2,
        message: 'You can use JWT tokens for authentication',
        role: 'assistant',
        timestamp: new Date(),
        tokens: 30,
        task: 'auth'
      }
    ];

    const summary = await summarizer.summarizeTurns(turns);

    expect(summary).toContain('auth');
    expect(summary).toContain('1 user messages');
    expect(summary).toContain('1 assistant responses');
    expect(summary).toContain('Total tokens: 55');
  });

  it('should extract key decisions', async () => {
    const turns: ChatTurn[] = [
      {
        id: 'dec-1',
        turn: 1,
        message: 'We decided to use React for the frontend',
        role: 'user',
        timestamp: new Date(),
        tokens: 20,
        task: 'tech-stack'
      },
      {
        id: 'dec-2',
        turn: 2,
        message: 'The final decision is to go with PostgreSQL',
        role: 'assistant',
        timestamp: new Date(),
        tokens: 25,
        task: 'database'
      }
    ];

    const decisions = await summarizer.extractKeyDecisions(turns);

    expect(decisions).toHaveLength(2);
    expect(decisions.some(d => d.includes('React'))).toBe(true);
    expect(decisions.some(d => d.includes('PostgreSQL'))).toBe(true);
  });

  it('should extract blocker resolutions', async () => {
    const turns: ChatTurn[] = [
      {
        id: 'block-1',
        turn: 1,
        message: 'We are blocked by the API not working',
        role: 'user',
        timestamp: new Date(),
        tokens: 20,
        task: 'api-issue'
      },
      {
        id: 'block-2',
        turn: 2,
        message: 'The API issue has been resolved by updating the endpoint',
        role: 'assistant',
        timestamp: new Date(),
        tokens: 25,
        task: 'api-issue'
      }
    ];

    const resolutions = await summarizer.extractBlockerResolutions(turns);

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].blocker).toContain('API not working');
    expect(resolutions[0].resolution).toContain('resolved by updating');
    expect(resolutions[0].resolvedAtTurnIndex).toBe(1);
  });
});

describe('TokenBudgetTracker Core', () => {
  let tracker: TokenBudgetTracker;

  beforeEach(() => {
    tracker = new TokenBudgetTracker();
  });

  it('should estimate memory tokens correctly', () => {
    const turns: ChatTurn[] = [
      {
        id: 'token-1',
        turn: 1,
        message: 'Test message',
        role: 'user',
        timestamp: new Date(),
        tokens: 100,
        task: 'test'
      },
      {
        id: 'token-2',
        turn: 2,
        message: 'Another message',
        role: 'assistant',
        timestamp: new Date(),
        tokens: 150,
        task: 'test'
      }
    ];

    const totalTokens = tracker.estimateMemoryTokens(turns);
    expect(totalTokens).toBe(250);
  });

  it('should calculate compression savings', () => {
    const beforeTurns: ChatTurn[] = Array(10).fill(null).map((_, i) => ({
      id: `before-${i}`,
      turn: i,
      message: 'Long message that takes many tokens',
      role: 'user' as const,
      timestamp: new Date(),
      tokens: 50,
      task: 'test'
    }));

    const afterBlock = {
      startIndex: 0,
      endIndex: 9,
      dateRange: { start: new Date(), end: new Date() },
      summary: 'Short summary',
      keyDecisions: ['Decision 1'],
      blockersResolved: [],
      currentState: 'Complete',
      fullHistoryPath: '/path/to/archive'
    };

    const savings = tracker.calculateCompressionSavings(beforeTurns, afterBlock);
    expect(savings).toBeGreaterThan(0);

    const cost = tracker.getMemoryCost();
    expect(cost.originalTokens).toBe(500);
    expect(cost.currentTokens).toBeGreaterThan(0);
    expect(cost.saved).toBe(savings);
  });
});

describe('InstructionValidator Core', () => {
  let validator: InstructionValidator;

  beforeEach(() => {
    validator = new InstructionValidator();
  });

  it('should validate complete instructions', () => {
    const instructions = {
      projectLevel: {
        codeStyle: ['Use TypeScript'],
        securityRules: ['Validate input'],
        performanceGoals: ['Fast loading'],
        customRules: ['Follow patterns'],
        file: '/test/instructions.md'
      },
      teamLevel: {
        roles: { 'Developer': ['Code'] },
        standards: ['Review code'],
        approvalProcess: 'Two approvals required',
        file: '/test/team-rules.md'
      },
      global: {
        defaultBehavior: ['Be helpful'],
        safetyRules: ['Be safe'],
        outputFormat: ['Use markdown']
      }
    };

    const result = validator.validate(instructions);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn about missing sections', () => {
    const instructions = {
      projectLevel: {
        codeStyle: [],
        securityRules: [],
        performanceGoals: [],
        customRules: [],
        file: '/test/instructions.md'
      },
      teamLevel: {
        roles: {},
        standards: [],
        approvalProcess: '',
        file: '/test/team-rules.md'
      },
      global: {
        defaultBehavior: [],
        safetyRules: [],
        outputFormat: []
      }
    };

    const result = validator.validate(instructions);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings).toContain('No code style rules defined');
    expect(result.warnings).toContain('No security rules defined');
  });

  it('should validate markdown structure', () => {
    const validMarkdown = `
## Code Style
- Rule 1
- Rule 2

## Security Rules
- Security rule 1
`;

    const result = validator.validateMarkdown(validMarkdown);

    expect(result.valid).toBe(true);
    expect(result.sections).toContain('Code Style');
    expect(result.sections).toContain('Security Rules');
    expect(result.missingRequired).toHaveLength(0);
  });
});

describe('InstructionInjector Core', () => {
  let injector: InstructionInjector;

  beforeEach(() => {
    injector = new InstructionInjector();
  });

  it('should inject instructions into system prompt', () => {
    const basePrompt = 'You are a helpful assistant.';
    const instructions = {
      projectLevel: {
        codeStyle: ['Use TypeScript'],
        securityRules: ['Validate input'],
        performanceGoals: [],
        customRules: [],
        file: ''
      },
      teamLevel: {
        roles: { 'Developer': ['Write code'] },
        standards: [],
        approvalProcess: '',
        file: ''
      },
      global: {
        defaultBehavior: ['Be helpful'],
        safetyRules: [],
        outputFormat: []
      }
    };

    const enhanced = injector.injectIntoSystemPrompt(basePrompt, instructions);

    expect(enhanced).toContain('You are a helpful assistant.');
    expect(enhanced).toContain('Global Guidelines');
    expect(enhanced).toContain('Be helpful');
    expect(enhanced).toContain('Code Style Requirements');
    expect(enhanced).toContain('Use TypeScript');
    expect(enhanced).toContain('Team Roles and Responsibilities');
    expect(enhanced).toContain('Developer');
  });

  it('should create context-specific prompts', () => {
    const instructions = {
      projectLevel: {
        codeStyle: ['Use strict mode'],
        securityRules: ['Sanitize input'],
        performanceGoals: [],
        customRules: [],
        file: ''
      },
      teamLevel: { roles: {}, standards: [], approvalProcess: '', file: '' },
      global: { defaultBehavior: ['Be accurate'], safetyRules: [], outputFormat: [] }
    };

    const codePrompt = injector.createCustomPrompt(instructions, 'code review task');
    const securityPrompt = injector.createCustomPrompt(instructions, 'security audit');

    expect(codePrompt).toContain('Code Style Guidelines');
    expect(codePrompt).toContain('Use strict mode');
    expect(securityPrompt).toContain('Security Requirements');
    expect(securityPrompt).toContain('Sanitize input');
  });
});
