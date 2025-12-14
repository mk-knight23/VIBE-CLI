import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';

export interface EmbeddedChatTurn {
  id: string;
  turn: number;
  message: string;
  role: 'user' | 'assistant';
  embedding: number[];  // 384-dim or 768-dim
  metadata: {
    timestamp: Date;
    tokens: number;
    task: string;
  };
}

export interface SearchResult {
  id: string;
  message: string;
  similarity: number;  // 0-1
  metadata: object;
}

export interface ChatTurn {
  id: string;
  turn: number;
  message: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokens: number;
  task: string;
}

export class EmbeddingGenerator {
  private apiUrl = 'http://localhost:11434/api/embeddings';

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Try Ollama first (local, free)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding;
      }
    } catch (error) {
      console.warn('Ollama not available, using fallback embedding');
    }

    // Fallback to simple hash-based embedding
    return this.generateFallbackEmbedding(text);
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }
    
    return embeddings;
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple hash-based embedding for fallback
    const embedding = new Array(384).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const index = char % 384;
      embedding[index] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }
}

export class VectorStore {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create tables
        this.db!.serialize(() => {
          this.db!.run(`
            CREATE TABLE IF NOT EXISTS embeddings (
              id TEXT PRIMARY KEY,
              turn_number INTEGER,
              message TEXT,
              role TEXT,
              embedding BLOB,
              timestamp TEXT,
              tokens INTEGER,
              task TEXT
            )
          `);

          this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_timestamp ON embeddings(timestamp);
          `);

          this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_task ON embeddings(task);
          `);
        });

        resolve();
      });
    });
  }

  async insert(record: EmbeddedChatTurn): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const embeddingBlob = Buffer.from(new Float32Array(record.embedding).buffer);
      
      this.db!.run(
        `INSERT INTO embeddings (id, turn_number, message, role, embedding, timestamp, tokens, task)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.turn,
          record.message,
          record.role,
          embeddingBlob,
          record.metadata.timestamp.toISOString(),
          record.metadata.tokens,
          record.metadata.task
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async search(query: string, k: number = 5): Promise<SearchResult[]> {
    // This is a simplified implementation
    // In production, would use proper vector similarity search
    return this.keywordSearch(query, k);
  }

  async semanticSearch(embedding: number[], k: number = 5): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        `SELECT id, message, embedding, timestamp, tokens, task FROM embeddings ORDER BY timestamp DESC LIMIT ?`,
        [k * 2], // Get more results to calculate similarity
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const results: SearchResult[] = [];
          
          for (const row of rows) {
            const storedEmbedding = new Float32Array(row.embedding);
            const similarity = this.cosineSimilarity(embedding, Array.from(storedEmbedding));
            
            results.push({
              id: row.id,
              message: row.message,
              similarity,
              metadata: {
                timestamp: row.timestamp,
                tokens: row.tokens,
                task: row.task
              }
            });
          }

          // Sort by similarity and return top k
          results.sort((a, b) => b.similarity - a.similarity);
          resolve(results.slice(0, k));
        }
      );
    });
  }

  private async keywordSearch(query: string, k: number): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      const likeConditions = searchTerms.map(() => 'LOWER(message) LIKE ?').join(' OR ');
      const params = searchTerms.map(term => `%${term}%`);
      
      this.db!.all(
        `SELECT id, message, timestamp, tokens, task FROM embeddings 
         WHERE ${likeConditions} 
         ORDER BY timestamp DESC LIMIT ?`,
        [...params, k],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const results = rows.map(row => ({
            id: row.id,
            message: row.message,
            similarity: 0.8, // Mock similarity for keyword search
            metadata: {
              timestamp: row.timestamp,
              tokens: row.tokens,
              task: row.task
            }
          }));

          resolve(results);
        }
      );
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve) => {
        this.db!.close(() => resolve());
      });
    }
  }
}

export class HybridSearch {
  private vectorStore: VectorStore;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(vectorStore: VectorStore, embeddingGenerator: EmbeddingGenerator) {
    this.vectorStore = vectorStore;
    this.embeddingGenerator = embeddingGenerator;
  }

  async search(
    query: string,
    options: { keywordWeight?: number; semanticWeight?: number; k?: number } = {}
  ): Promise<SearchResult[]> {
    const {
      keywordWeight = 0.4,
      semanticWeight = 0.6,
      k = 5
    } = options;

    // Get keyword results
    const keywordResults = await this.keywordSearch(query);
    
    // Get semantic results
    const semanticResults = await this.semanticSearch(query);
    
    // Combine and rerank
    return this.combineResults(keywordResults, semanticResults, keywordWeight, semanticWeight, k);
  }

  private async keywordSearch(query: string): Promise<SearchResult[]> {
    return this.vectorStore.search(query, 10);
  }

  private async semanticSearch(query: string): Promise<SearchResult[]> {
    const embedding = await this.embeddingGenerator.generateEmbedding(query);
    return this.vectorStore.semanticSearch(embedding, 10);
  }

  private combineResults(
    keyword: SearchResult[],
    semantic: SearchResult[],
    keywordWeight: number,
    semanticWeight: number,
    k: number
  ): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    // Add keyword results
    keyword.forEach(result => {
      combined.set(result.id, {
        ...result,
        similarity: result.similarity * keywordWeight
      });
    });

    // Add semantic results (combine scores if already exists)
    semantic.forEach(result => {
      const existing = combined.get(result.id);
      if (existing) {
        existing.similarity += result.similarity * semanticWeight;
      } else {
        combined.set(result.id, {
          ...result,
          similarity: result.similarity * semanticWeight
        });
      }
    });

    // Sort by combined score and return top k
    return Array.from(combined.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }
}

export class SemanticMemoryManager {
  private vectorStore: VectorStore;
  private embeddingGenerator: EmbeddingGenerator;
  private hybridSearch: HybridSearch;

  constructor(dbPath: string) {
    this.vectorStore = new VectorStore(dbPath);
    this.embeddingGenerator = new EmbeddingGenerator();
    this.hybridSearch = new HybridSearch(this.vectorStore, this.embeddingGenerator);
  }

  async init(): Promise<void> {
    await this.vectorStore.init();
  }

  async addChatTurn(turn: ChatTurn): Promise<void> {
    const embedding = await this.embeddingGenerator.generateEmbedding(turn.message);
    
    const embeddedTurn: EmbeddedChatTurn = {
      id: turn.id,
      turn: turn.turn,
      message: turn.message,
      role: turn.role,
      embedding,
      metadata: {
        timestamp: turn.timestamp,
        tokens: turn.tokens,
        task: turn.task
      }
    };

    await this.vectorStore.insert(embeddedTurn);
  }

  async searchMemory(query: string): Promise<ChatTurn[]> {
    const results = await this.hybridSearch.search(query);
    
    return results.map(result => ({
      id: result.id,
      turn: 0, // Would be stored in metadata
      message: result.message,
      role: 'assistant' as const, // Would be stored in metadata
      timestamp: new Date((result.metadata as any).timestamp || Date.now()),
      tokens: (result.metadata as any).tokens || 0,
      task: (result.metadata as any).task || 'unknown'
    }));
  }

  async getRelatedMemory(taskId: string): Promise<ChatTurn[]> {
    // Search for memories related to the same task
    return this.searchMemory(`task:${taskId}`);
  }

  async close(): Promise<void> {
    await this.vectorStore.close();
  }
}
