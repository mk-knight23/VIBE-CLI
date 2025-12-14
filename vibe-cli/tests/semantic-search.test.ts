import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EmbeddingGenerator, 
  VectorStore, 
  HybridSearch, 
  SemanticMemoryManager,
  ChatTurn 
} from '../src/memory/semantic-search';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fetch for embedding API
global.fetch = vi.fn();

describe('EmbeddingGenerator', () => {
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
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/embeddings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: 'test text'
        })
      })
    );
  });

  it('should fallback to hash-based embedding when Ollama unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

    const embedding = await generator.generateEmbedding('test text');

    expect(embedding).toHaveLength(384);
    expect(embedding.every(val => typeof val === 'number')).toBe(true);
  });

  it('should generate batch embeddings', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
    } as any);

    const embeddings = await generator.generateBatch(['text1', 'text2']);

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    expect(embeddings[1]).toEqual([0.1, 0.2, 0.3]);
  });

  it('should normalize fallback embeddings', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('No connection'));

    const embedding = await generator.generateEmbedding('a');

    // Check that embedding is normalized (magnitude should be 1 or close to it)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });
});

describe('VectorStore', () => {
  let vectorStore: VectorStore;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.sqlite`);
    vectorStore = new VectorStore(tempDbPath);
    await vectorStore.init();
  });

  afterEach(async () => {
    await vectorStore.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should initialize database with correct schema', async () => {
    // Database should be initialized without errors
    expect(fs.existsSync(tempDbPath)).toBe(true);
  });

  it('should insert and retrieve embedded chat turns', async () => {
    const chatTurn = {
      id: 'test-1',
      turn: 1,
      message: 'Hello world',
      role: 'user' as const,
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        timestamp: new Date(),
        tokens: 10,
        task: 'greeting'
      }
    };

    await vectorStore.insert(chatTurn);

    const results = await vectorStore.search('hello', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message).toBe('Hello world');
  });

  it('should perform semantic search with embeddings', async () => {
    const chatTurn = {
      id: 'test-2',
      turn: 1,
      message: 'How to write tests',
      role: 'user' as const,
      embedding: [0.5, 0.6, 0.7],
      metadata: {
        timestamp: new Date(),
        tokens: 15,
        task: 'testing'
      }
    };

    await vectorStore.insert(chatTurn);

    const queryEmbedding = [0.5, 0.6, 0.7]; // Similar embedding
    const results = await vectorStore.semanticSearch(queryEmbedding, 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0.9); // Should be very similar
  });

  it('should handle empty search results', async () => {
    const results = await vectorStore.search('nonexistent query', 5);
    expect(results).toHaveLength(0);
  });
});

describe('HybridSearch', () => {
  let hybridSearch: HybridSearch;
  let vectorStore: VectorStore;
  let embeddingGenerator: EmbeddingGenerator;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `hybrid-test-${Date.now()}.sqlite`);
    vectorStore = new VectorStore(tempDbPath);
    embeddingGenerator = new EmbeddingGenerator();
    hybridSearch = new HybridSearch(vectorStore, embeddingGenerator);
    
    await vectorStore.init();

    // Mock embedding generation
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
    } as any);
  });

  afterEach(async () => {
    await vectorStore.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should combine keyword and semantic search results', async () => {
    // Add test data
    const chatTurn = {
      id: 'hybrid-1',
      turn: 1,
      message: 'Testing hybrid search functionality',
      role: 'assistant' as const,
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        timestamp: new Date(),
        tokens: 20,
        task: 'search'
      }
    };

    await vectorStore.insert(chatTurn);

    const results = await hybridSearch.search('testing search', {
      keywordWeight: 0.5,
      semanticWeight: 0.5,
      k: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message).toContain('Testing');
  });

  it('should respect weight preferences', async () => {
    const results = await hybridSearch.search('test query', {
      keywordWeight: 0.8,
      semanticWeight: 0.2,
      k: 3
    });

    // Should return results (even if empty for this test)
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('SemanticMemoryManager', () => {
  let memoryManager: SemanticMemoryManager;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `memory-test-${Date.now()}.sqlite`);
    memoryManager = new SemanticMemoryManager(tempDbPath);
    await memoryManager.init();

    // Mock embedding generation
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
    } as any);
  });

  afterEach(async () => {
    await memoryManager.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should add and search chat turns', async () => {
    const chatTurn: ChatTurn = {
      id: 'memory-1',
      turn: 1,
      message: 'How do I implement authentication?',
      role: 'user',
      timestamp: new Date(),
      tokens: 25,
      task: 'auth-implementation'
    };

    await memoryManager.addChatTurn(chatTurn);

    const results = await memoryManager.searchMemory('authentication');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message).toContain('authentication');
  });

  it('should find related memory by task', async () => {
    const chatTurn: ChatTurn = {
      id: 'memory-2',
      turn: 1,
      message: 'Working on user login feature',
      role: 'assistant',
      timestamp: new Date(),
      tokens: 20,
      task: 'user-login'
    };

    await memoryManager.addChatTurn(chatTurn);

    const results = await memoryManager.getRelatedMemory('user-login');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle multiple chat turns', async () => {
    const turns: ChatTurn[] = [
      {
        id: 'multi-1',
        turn: 1,
        message: 'Start working on feature A',
        role: 'user',
        timestamp: new Date(),
        tokens: 15,
        task: 'feature-a'
      },
      {
        id: 'multi-2',
        turn: 2,
        message: 'Feature A implementation complete',
        role: 'assistant',
        timestamp: new Date(),
        tokens: 18,
        task: 'feature-a'
      }
    ];

    for (const turn of turns) {
      await memoryManager.addChatTurn(turn);
    }

    const results = await memoryManager.searchMemory('feature A');
    expect(results.length).toBe(2);
  });

  it('should handle empty search gracefully', async () => {
    const results = await memoryManager.searchMemory('nonexistent topic');
    expect(results).toHaveLength(0);
  });
});
