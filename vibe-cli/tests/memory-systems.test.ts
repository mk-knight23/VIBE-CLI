import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MemoryCompressor, 
  MemorySummarizer, 
  TokenBudgetTracker,
  ArchiveManager 
} from '../src/memory/compression';
import { 
  TeamMemoryManager, 
  TeamPermissionManager, 
  AuditLogger 
} from '../src/memory/team-memory';
import { 
  InstructionLoader, 
  InstructionValidator, 
  InstructionInjector 
} from '../src/prompts/custom-instructions';
import { ChatTurn } from '../src/memory/semantic-search';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
vi.mock('fs');

describe('MemoryCompressor', () => {
  let compressor: MemoryCompressor;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `compress-test-${Date.now()}`);
    compressor = new MemoryCompressor(tempDir);
    vi.clearAllMocks();
  });

  it('should determine when compression is needed', async () => {
    const shortMemory: ChatTurn[] = Array(10).fill(null).map((_, i) => ({
      id: `turn-${i}`,
      turn: i,
      message: `Message ${i}`,
      role: 'user' as const,
      timestamp: new Date(),
      tokens: 10,
      task: 'test'
    }));

    const longMemory: ChatTurn[] = Array(60).fill(null).map((_, i) => ({
      id: `turn-${i}`,
      turn: i,
      message: `Message ${i}`,
      role: 'user' as const,
      timestamp: new Date(),
      tokens: 10,
      task: 'test'
    }));

    expect(await compressor.shouldCompress(shortMemory)).toBe(false);
    expect(await compressor.shouldCompress(longMemory)).toBe(true);
  });

  it('should compress memory and create archive', async () => {
    const turns: ChatTurn[] = Array(50).fill(null).map((_, i) => ({
      id: `turn-${i}`,
      turn: i,
      message: `Message ${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      timestamp: new Date(Date.now() + i * 1000),
      tokens: 10,
      task: 'compression-test'
    }));

    // Mock file system operations
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

    const compressed = await compressor.compress(turns);

    expect(compressed.summary).toBeDefined();
    expect(compressed.dateRange.start).toBeInstanceOf(Date);
    expect(compressed.dateRange.end).toBeInstanceOf(Date);
    expect(compressed.fullHistoryPath).toBeDefined();
    expect(compressed.startIndex).toBe(0);
    expect(compressed.endIndex).toBe(49);
  });

  it('should handle empty turns gracefully', async () => {
    await expect(compressor.compress([])).rejects.toThrow('No turns to compress');
  });
});

describe('MemorySummarizer', () => {
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
    expect(decisions[0]).toContain('React');
    expect(decisions[1]).toContain('PostgreSQL');
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

  it('should handle empty conversation', async () => {
    const summary = await summarizer.summarizeTurns([]);
    expect(summary).toBe('No conversation to summarize');
  });
});

describe('TokenBudgetTracker', () => {
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

describe('TeamMemoryManager', () => {
  let manager: TeamMemoryManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `team-test-${Date.now()}`);
    manager = new TeamMemoryManager(tempDir, 'test-user');
    vi.clearAllMocks();
  });

  it('should create default memory when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

    const memory = await manager.loadTeamMemory();

    expect(memory.version).toBe('1.0.0');
    expect(memory.sharedGoals).toEqual([]);
    expect(memory.decisions).toEqual([]);
    expect(memory.permissions['test-user']).toBe('admin');
  });

  it('should load existing team memory', async () => {
    const mockMemory = {
      version: '1.2.3',
      lastUpdated: '2023-01-01T00:00:00.000Z',
      sharedGoals: ['Goal 1'],
      decisions: [],
      blockers: [],
      auditLog: [],
      permissions: { 'test-user': 'admin' }
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockMemory));

    const memory = await manager.loadTeamMemory();

    expect(memory.version).toBe('1.2.3');
    expect(memory.sharedGoals).toEqual(['Goal 1']);
  });

  it('should add decisions with proper permissions', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    await manager.addDecision({
      description: 'Use TypeScript for the project',
      rationale: 'Better type safety',
      impact: 'Improved code quality',
      tags: ['tech-stack']
    });

    // Should not throw (user has admin permissions)
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
  });

  it('should add and update blockers', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    await manager.addBlocker({
      description: 'API endpoint not responding',
      severity: 'high',
      status: 'open'
    });

    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
  });
});

describe('InstructionLoader', () => {
  let loader: InstructionLoader;

  beforeEach(() => {
    loader = new InstructionLoader();
    vi.clearAllMocks();
  });

  it('should load project instructions from markdown', async () => {
    const mockInstructions = `
# Project Instructions

## Code Style
- Use TypeScript strict mode
- Max 100 characters per line

## Security Rules
- Never log passwords
- Validate all input
`;

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockInstructions);

    const instructions = await loader.loadProjectInstructions('/test/project');

    expect(instructions.codeStyle).toContain('Use TypeScript strict mode');
    expect(instructions.codeStyle).toContain('Max 100 characters per line');
    expect(instructions.securityRules).toContain('Never log passwords');
    expect(instructions.securityRules).toContain('Validate all input');
  });

  it('should return defaults when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const instructions = await loader.loadProjectInstructions('/test/project');

    expect(instructions.codeStyle).toEqual([]);
    expect(instructions.securityRules).toEqual([]);
    expect(instructions.performanceGoals).toEqual([]);
    expect(instructions.customRules).toEqual([]);
  });

  it('should load team instructions', async () => {
    const mockTeamRules = `
# Team Rules

## Roles
- **Tech Lead**: Architecture decisions, code reviews
- **Developer**: Feature implementation, bug fixes

## Standards
- Require 2 approvals for production code
- All tests must pass before merge
`;

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockTeamRules);

    const instructions = await loader.loadTeamInstructions('/test/project');

    expect(instructions.roles['Tech Lead']).toContain('Architecture decisions, code reviews');
    expect(instructions.standards).toContain('Require 2 approvals for production code');
  });

  it('should merge all instruction levels', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const merged = await loader.mergeAll('/test/project');

    expect(merged.projectLevel).toBeDefined();
    expect(merged.teamLevel).toBeDefined();
    expect(merged.global).toBeDefined();
    expect(merged.global.defaultBehavior.length).toBeGreaterThan(0);
  });
});

describe('InstructionValidator', () => {
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

describe('InstructionInjector', () => {
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
