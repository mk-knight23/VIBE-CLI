import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WebSearchEngine, 
  SearchRateLimiter, 
  KnowledgeFusion, 
  WebSearchTool 
} from '../src/tools/web-search-tool';

describe('WebSearchEngine', () => {
  let engine: WebSearchEngine;

  beforeEach(() => {
    engine = new WebSearchEngine(); // No API key for testing
  });

  it('should validate trusted domains correctly', () => {
    const validUrls = [
      'https://developer.mozilla.org/docs',
      'https://github.com/user/repo',
      'https://nodejs.org/api',
      'https://npmjs.com/package/test'
    ];

    const invalidUrls = [
      'https://malicious-site.com',
      'https://random-blog.net',
      'https://untrusted.org'
    ];

    validUrls.forEach(url => {
      expect(engine.validateDomain(url)).toBe(true);
    });

    invalidUrls.forEach(url => {
      expect(engine.validateDomain(url)).toBe(false);
    });
  });

  it('should score credibility correctly', () => {
    const officialDocsResult = {
      title: 'Node.js Documentation',
      url: 'https://nodejs.org/docs/api',
      snippet: 'Official Node.js API documentation',
      source: 'official-docs',
      credibilityScore: 0
    };

    const githubResult = {
      title: 'GitHub Repository',
      url: 'https://github.com/user/repo/blob/main/README.md',
      snippet: 'Repository documentation',
      source: 'github',
      credibilityScore: 0
    };

    const officialScore = engine.scoreCredibility(officialDocsResult);
    const githubScore = engine.scoreCredibility(githubResult);

    expect(officialScore).toBeGreaterThan(0.8);
    expect(githubScore).toBeGreaterThan(0.7);
    expect(officialScore).toBeGreaterThan(githubScore);
  });

  it('should return mock results when no API key', async () => {
    const request = {
      query: 'TypeScript documentation',
      sources: ['official-docs' as const],
      maxResults: 3
    };

    const results = await engine.search(request);

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('TypeScript documentation');
    expect(results[0].credibilityScore).toBeGreaterThan(0);
  });
});

describe('SearchRateLimiter', () => {
  let rateLimiter: SearchRateLimiter;

  beforeEach(() => {
    rateLimiter = new SearchRateLimiter();
  });

  it('should allow searches within limit', () => {
    const taskId = 'test-task-1';

    // Should allow first 5 searches
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.allowSearch(taskId)).toBe(true);
    }

    // Should deny 6th search
    expect(rateLimiter.allowSearch(taskId)).toBe(false);
  });

  it('should track search count correctly', () => {
    const taskId = 'test-task-2';

    expect(rateLimiter.getSearchCount(taskId)).toBe(0);

    rateLimiter.allowSearch(taskId);
    expect(rateLimiter.getSearchCount(taskId)).toBe(1);

    rateLimiter.allowSearch(taskId);
    expect(rateLimiter.getSearchCount(taskId)).toBe(2);
  });

  it('should reset search count', () => {
    const taskId = 'test-task-3';

    rateLimiter.allowSearch(taskId);
    rateLimiter.allowSearch(taskId);
    expect(rateLimiter.getSearchCount(taskId)).toBe(2);

    rateLimiter.resetCount(taskId);
    expect(rateLimiter.getSearchCount(taskId)).toBe(0);
  });

  it('should calculate remaining searches correctly', () => {
    const taskId = 'test-task-4';

    expect(rateLimiter.getRemainingSearches(taskId)).toBe(5);

    rateLimiter.allowSearch(taskId);
    expect(rateLimiter.getRemainingSearches(taskId)).toBe(4);

    rateLimiter.allowSearch(taskId);
    rateLimiter.allowSearch(taskId);
    expect(rateLimiter.getRemainingSearches(taskId)).toBe(2);
  });
});

describe('KnowledgeFusion', () => {
  let fusion: KnowledgeFusion;

  beforeEach(() => {
    fusion = new KnowledgeFusion();
  });

  it('should fuse existing content with search results', () => {
    const existing = 'Original content about TypeScript';
    const searchResults = [
      {
        title: 'TypeScript Handbook',
        url: 'https://typescriptlang.org/docs',
        snippet: 'TypeScript is a typed superset of JavaScript',
        source: 'official-docs',
        credibilityScore: 0.9
      },
      {
        title: 'TypeScript on GitHub',
        url: 'https://github.com/microsoft/TypeScript',
        snippet: 'Official TypeScript repository',
        source: 'github',
        credibilityScore: 0.8
      }
    ];

    const result = fusion.fuse(existing, searchResults);

    expect(result.fusedContent).toContain('Original content');
    expect(result.fusedContent).toContain('Additional Context');
    expect(result.sources).toHaveLength(2);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle empty search results', () => {
    const existing = 'Original content';
    const searchResults: any[] = [];

    const result = fusion.fuse(existing, searchResults);

    expect(result.fusedContent).toBe(existing);
    expect(result.sources).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('should inject knowledge into prompts', () => {
    const prompt = 'Help me with TypeScript';
    const knowledge = 'TypeScript is a typed superset of JavaScript';

    const injected = fusion.injectIntoPrompt(prompt, knowledge);

    expect(injected).toContain(prompt);
    expect(injected).toContain('Context from recent search');
    expect(injected).toContain(knowledge);
  });

  it('should not inject duplicate content', () => {
    const prompt = 'Help me with TypeScript';
    const sameKnowledge = 'Help me with TypeScript';

    const injected = fusion.injectIntoPrompt(prompt, sameKnowledge);

    expect(injected).toBe(prompt);
  });
});

describe('WebSearchTool', () => {
  let searchTool: WebSearchTool;

  beforeEach(() => {
    searchTool = new WebSearchTool(); // No API key for testing
  });

  it('should perform search with rate limiting', async () => {
    const taskId = 'integration-test-1';
    const query = 'React hooks documentation';

    const results = await searchTool.search(query, taskId);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(searchTool.getRemainingSearches(taskId)).toBe(4); // 5 - 1 = 4
  });

  it('should enforce rate limits', async () => {
    const taskId = 'integration-test-2';
    const query = 'Test query';

    // Use up all searches
    for (let i = 0; i < 5; i++) {
      await searchTool.search(query, taskId);
    }

    // Next search should fail
    await expect(searchTool.search(query, taskId)).rejects.toThrow('Rate limit exceeded');
  });

  it('should search and fuse knowledge', async () => {
    const taskId = 'integration-test-3';
    const query = 'JavaScript async/await';
    const existingContext = 'Working with asynchronous JavaScript';

    const result = await searchTool.searchAndFuse(query, existingContext, taskId);

    expect(result.fusedContent).toBeDefined();
    expect(result.sources).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should reset search count', async () => {
    const taskId = 'integration-test-4';
    const query = 'Test query';

    await searchTool.search(query, taskId);
    expect(searchTool.getRemainingSearches(taskId)).toBe(4);

    searchTool.resetSearchCount(taskId);
    expect(searchTool.getRemainingSearches(taskId)).toBe(5);
  });
});
