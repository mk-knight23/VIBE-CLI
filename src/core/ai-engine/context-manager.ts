/**
 * VIBE-CLI v12 - Context Manager
 * Efficient context management with smart file selection and chunking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import fastGlob from 'fast-glob';

/**
 * Token estimation result
 */
export interface TokenEstimate {
  tokens: number;
  characters: number;
  lines: number;
  breakdown: TokenBreakdown;
}

/**
 * Token breakdown by category
 */
export interface TokenBreakdown {
  code: number;
  comments: number;
  strings: number;
  whitespace: number;
}

/**
 * File chunk for context splitting
 */
export interface FileChunk {
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  tokenCount: number;
  relevance: number;
}

/**
 * Semantic index entry
 */
export interface SemanticIndexEntry {
  filePath: string;
  symbols: string[];
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  keywords: string[];
  lastModified: Date;
  contentHash: string;
}

/**
 * Relevance score for file selection
 */
export interface FileRelevance {
  filePath: string;
  score: number;
  matchReasons: string[];
  tokenCount: number;
}

/**
 * Context selection options
 */
export interface ContextSelectionOptions {
  query: string;
  maxTokens: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  prioritizeRecent?: boolean;
  minRelevance?: number;
}

/**
 * Context selection result
 */
export interface ContextSelectionResult {
  files: FileRelevance[];
  totalTokens: number;
  truncated: boolean;
  chunkingRequired: boolean;
  skippedFiles: string[];
}

/**
 * Semantic search options
 */
export interface SemanticSearchOptions {
  query: string;
  files?: string[];
  maxResults?: number;
  minScore?: number;
}

/**
 * Context Manager
 */
export class ContextManager {
  private readonly cacheDir: string;
  private readonly semanticIndex: Map<string, SemanticIndexEntry> = new Map();
  private readonly fileCache: Map<string, { content: string; hash: string; timestamp: number }> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.vibe', 'cache');
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Estimate tokens in content
   */
  estimateTokens(content: string): TokenEstimate {
    const characters = content.length;
    const lines = content.split('\n').length;

    // Rough token estimation (avg 4 chars per token for English, varies for code)
    // Code tends to have higher token-to-character ratio
    const codeTokenMultiplier = 0.25; // ~4 chars per token
    const commentRegex = /\/\/.*$|\/\*[\s\S]*?\*\/|#.*$/gm;
    const stringRegex = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
    const whitespaceRegex = /\s+/g;

    // Count comments
    const comments = (content.match(commentRegex) || []).join('\n');
    const commentTokens = Math.ceil(comments.length * codeTokenMultiplier);

    // Count strings
    const strings = (content.match(stringRegex) || []).join('\n');
    const stringTokens = Math.ceil(strings.length * codeTokenMultiplier);

    // Count remaining code
    const codeWithoutComments = content.replace(commentRegex, '');
    const codeWithoutStrings = codeWithoutComments.replace(stringRegex, '');
    const codeTokens = Math.ceil(codeWithoutStrings.length * codeTokenMultiplier);

    // Whitespace tokens
    const whitespaceTokens = Math.ceil((content.match(whitespaceRegex)?.join('').length || 0) * codeTokenMultiplier);

    const totalTokens = commentTokens + stringTokens + codeTokens;

    return {
      tokens: totalTokens,
      characters,
      lines,
      breakdown: {
        code: codeTokens,
        comments: commentTokens,
        strings: stringTokens,
        whitespace: whitespaceTokens,
      },
    };
  }

  /**
   * Estimate tokens in a file
   */
  async estimateFileTokens(filePath: string): Promise<TokenEstimate> {
    const content = await this.readFileCached(filePath);
    return this.estimateTokens(content);
  }

  /**
   * Select relevant files for a query
   */
  async selectRelevantFiles(
    options: ContextSelectionOptions
  ): Promise<ContextSelectionResult> {
    const {
      query,
      maxTokens,
      includePatterns = ['**/*.{ts,js,tsx,jsx,py,java,go,rs,rb,php}'],
      excludePatterns = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      prioritizeRecent = true,
      minRelevance = 0.1,
    } = options;

    // Build semantic index if needed
    await this.buildSemanticIndex();

    // Find all matching files
    const files = await fastGlob(includePatterns, {
      ignore: excludePatterns,
      absolute: true,
    });

    // Score each file
    const fileRelevance: FileRelevance[] = [];

    for (const filePath of files) {
      const relativePath = path.relative(process.cwd(), filePath);
      const relevance = this.scoreFileRelevance(relativePath, query);

      if (relevance.score >= minRelevance) {
        const tokens = await this.estimateFileTokens(filePath);
        fileRelevance.push({
          filePath: relativePath,
          score: relevance.score,
          matchReasons: relevance.reasons,
          tokenCount: tokens.tokens,
        });
      }
    }

    // Sort by relevance
    fileRelevance.sort((a, b) => {
      // Combine relevance with recency if enabled
      let scoreA = a.score;
      let scoreB = b.score;

      if (prioritizeRecent) {
        const recencyBonus = this.getRecencyBonus(a.filePath);
        scoreA *= 1 + recencyBonus;
        scoreB *= 1 + this.getRecencyBonus(b.filePath);
      }

      return scoreB - scoreA;
    });

    // Select files within token budget
    let totalTokens = 0;
    const selectedFiles: FileRelevance[] = [];
    const skippedFiles: string[] = [];

    for (const file of fileRelevance) {
      if (totalTokens + file.tokenCount <= maxTokens) {
        selectedFiles.push(file);
        totalTokens += file.tokenCount;
      } else {
        skippedFiles.push(file.filePath);
      }
    }

    return {
      files: selectedFiles,
      totalTokens,
      truncated: selectedFiles.length < fileRelevance.length,
      chunkingRequired: totalTokens > maxTokens * 0.8,
      skippedFiles,
    };
  }

  /**
   * Score file relevance to a query
   */
  private scoreFileRelevance(
    filePath: string,
    query: string
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const lowerQuery = query.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    // Direct path match
    if (lowerPath.includes(lowerQuery)) {
      score += 0.3;
      reasons.push('Path contains query');
    }

    // Check semantic index
    const indexEntry = this.semanticIndex.get(filePath);
    if (indexEntry) {
      // Check function/class names
      for (const func of indexEntry.functions) {
        if (func.toLowerCase().includes(lowerQuery)) {
          score += 0.4;
          reasons.push(`Contains function: ${func}`);
          break;
        }
      }

      // Check imports
      for (const imp of indexEntry.imports) {
        if (imp.toLowerCase().includes(lowerQuery)) {
          score += 0.2;
          reasons.push(`Imports matching: ${imp}`);
        }
      }

      // Check keywords
      for (const keyword of indexEntry.keywords) {
        if (keyword.toLowerCase().includes(lowerQuery)) {
          score += 0.1;
          reasons.push(`Contains keyword: ${keyword}`);
        }
      }
    }

    // File extension relevance
    const relevantExtensions = ['.ts', '.js', '.py', '.java'];
    if (relevantExtensions.some((ext) => filePath.endsWith(ext))) {
      score += 0.05;
    }

    return { score: Math.min(score, 1), reasons };
  }

  /**
   * Get recency bonus for a file
   */
  private getRecencyBonus(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;
      const dayInMs = 24 * 60 * 60 * 1000;

      if (age < dayInMs) return 0.3; // Modified today
      if (age < 7 * dayInMs) return 0.2; // Modified this week
      if (age < 30 * dayInMs) return 0.1; // Modified this month
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Build semantic index for the codebase
   */
  async buildSemanticIndex(): Promise<void> {
    const indexPath = path.join(this.cacheDir, 'semantic-index.json');

    // Try to load from cache
    if (fs.existsSync(indexPath)) {
      try {
        const content = fs.readFileSync(indexPath, 'utf-8');
        const cached = JSON.parse(content);

        // Check if cache is fresh (less than 1 hour old)
        if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
          for (const [key, value] of Object.entries(cached.entries)) {
            this.semanticIndex.set(key, value as SemanticIndexEntry);
          }
          return;
        }
      } catch {
        // Rebuild index
      }
    }

    // Find all source files
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
    ];

    const files = await fastGlob(patterns, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    });

    // Index each file
    for (const filePath of files) {
      const entry = await this.indexFile(filePath);
      if (entry) {
        this.semanticIndex.set(entry.filePath, entry);
      }
    }

    // Save to cache
    const cacheData = {
      timestamp: Date.now(),
      entries: Object.fromEntries(this.semanticIndex),
    };

    fs.writeFileSync(indexPath, JSON.stringify(cacheData, null, 2));
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<SemanticIndexEntry | null> {
    try {
      const content = await this.readFileCached(filePath);
      const relativePath = path.relative(process.cwd(), filePath);

      // Extract symbols using regex
      const functions = this.extractFunctions(content);
      const classes = this.extractClasses(content);
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      const keywords = this.extractKeywords(content);

      // Calculate content hash
      const contentHash = this.hashContent(content);

      return {
        filePath: relativePath,
        symbols: [...functions, ...classes],
        imports,
        exports,
        functions,
        classes,
        keywords,
        lastModified: new Date(),
        contentHash,
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract function names from content
   */
  private extractFunctions(content: string): string[] {
    const patterns = [
      /(?:function|def|fun|func)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g,
    ];

    const functions = new Set<string>();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !this.isReservedWord(match[1])) {
          functions.add(match[1]);
        }
      }
    }

    return Array.from(functions);
  }

  /**
   * Extract class names from content
   */
  private extractClasses(content: string): string[] {
    const pattern = /(?:class|interface)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const classes = new Set<string>();
    let match;

    while ((match = pattern.exec(content)) !== null) {
      classes.add(match[1]);
    }

    return Array.from(classes);
  }

  /**
   * Extract imports from content
   */
  private extractImports(content: string): string[] {
    const patterns = [
      /import\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g,
      /import\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /from\s+['"]([^'"]+)['"]/g,
    ];

    const imports = new Set<string>();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          imports.add(match[1]);
        }
      }
    }

    return Array.from(imports);
  }

  /**
   * Extract exports from content
   */
  private extractExports(content: string): string[] {
    const patterns = [
      /export\s+(?:const|let|var|function|class|interface)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+\{\s*([^}]+)\s*\}/g,
    ];

    const exports = new Set<string>();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const names = match[1].split(',').map((n) => n.trim());
          for (const name of names) {
            if (name && !this.isReservedWord(name)) {
              exports.add(name);
            }
          }
        }
      }
    }

    return Array.from(exports);
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const keywordList = [
      'async', 'await', 'promise', 'callback', 'event', 'handler',
      'component', 'hook', 'state', 'props', 'context',
      'api', 'request', 'response', 'endpoint',
      'database', 'query', 'mutation',
      'auth', 'token', 'session',
    ];

    const lowerContent = content.toLowerCase();
    for (const keyword of keywordList) {
      if (lowerContent.includes(keyword)) {
        keywords.add(keyword);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Check if word is a reserved word
   */
  private isReservedWord(word: string): boolean {
    const reserved = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
      'class', 'function', 'var', 'let', 'const', 'import', 'export', 'default',
      'from', 'async', 'await', 'yield', 'true', 'false', 'null', 'undefined',
    ];
    return reserved.includes(word);
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Split large file into chunks
   */
  splitLargeFile(
    filePath: string,
    maxTokens: number
  ): Promise<FileChunk[]> {
    return new Promise(async (resolve) => {
      const content = await this.readFileCached(filePath);
      const lines = content.split('\n');
      const chunks: FileChunk[] = [];

      const tokensPerLine = this.estimateTokens('a'.repeat(80)).tokens / 80;
      const tokensPerChunk = maxTokens * 0.8; // Leave 20% buffer

      let currentChunkLines: string[] = [];
      let currentTokens = 0;
      let startLine = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTokens = Math.ceil(line.length * tokensPerLine) + 1; // +1 for newline

        if (currentTokens + lineTokens > tokensPerChunk && currentChunkLines.length > 0) {
          // Create chunk
          chunks.push({
            content: currentChunkLines.join('\n'),
            filePath,
            startLine,
            endLine: i,
            tokenCount: currentTokens,
            relevance: 0, // Will be set by caller
          });

          currentChunkLines = [];
          currentTokens = 0;
          startLine = i + 1;
        }

        currentChunkLines.push(line);
        currentTokens += lineTokens;
      }

      // Add final chunk
      if (currentChunkLines.length > 0) {
        chunks.push({
          content: currentChunkLines.join('\n'),
          filePath,
          startLine,
          endLine: lines.length,
          tokenCount: currentTokens,
          relevance: 0,
        });
      }

      resolve(chunks);
    });
  }

  /**
   * Read file with caching
   */
  private async readFileCached(filePath: string): Promise<string> {
    const now = Date.now();

    // Check cache
    const cached = this.fileCache.get(filePath);
    if (cached && now - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }

    // Read from disk
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const hash = this.hashContent(content);

    // Update cache
    this.fileCache.set(filePath, {
      content,
      hash,
      timestamp: now,
    });

    return content;
  }

  /**
   * Invalidate file cache
   */
  invalidateCache(filePath?: string): void {
    if (filePath) {
      this.fileCache.delete(filePath);
      this.semanticIndex.delete(filePath);
    } else {
      this.fileCache.clear();
      this.semanticIndex.clear();
    }
  }

  /**
   * Search semantically for code patterns
   */
  async semanticSearch(options: SemanticSearchOptions): Promise<{
    matches: { filePath: string; score: number; context: string }[];
  }> {
    const { query, files, maxResults = 10, minScore = 0.1 } = options;

    // Ensure index is built
    await this.buildSemanticIndex();

    let searchFiles = files;

    if (!searchFiles) {
      searchFiles = Array.from(this.semanticIndex.keys());
    }

    const results: { filePath: string; score: number; context: string }[] = [];

    for (const filePath of searchFiles) {
      const entry = this.semanticIndex.get(filePath);
      if (!entry) continue;

      // Score by symbol matches
      const queryLower = query.toLowerCase();
      let score = 0;
      let context = '';

      for (const func of entry.functions) {
        if (func.toLowerCase().includes(queryLower)) {
          score += 0.5;
          context = `Function: ${func}`;
        }
      }

      for (const cls of entry.classes) {
        if (cls.toLowerCase().includes(queryLower)) {
          score += 0.4;
          context = `Class: ${cls}`;
        }
      }

      for (const keyword of entry.keywords) {
        if (keyword === queryLower) {
          score += 0.2;
          context = `Keyword: ${keyword}`;
        }
      }

      if (score >= minScore) {
        results.push({
          filePath: entry.filePath,
          score: Math.min(score, 1),
          context,
        });
      }
    }

    // Sort and limit results
    results.sort((a, b) => b.score - a.score);

    return {
      matches: results.slice(0, maxResults),
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    filesCached: number;
    indexEntries: number;
    cacheSize: string;
  } {
    let cacheSize = 0;

    for (const [filePath, data] of this.fileCache) {
      try {
        cacheSize += fs.statSync(filePath)?.size || 0;
      } catch {
        // File may have been deleted
      }
    }

    return {
      filesCached: this.fileCache.size,
      indexEntries: this.semanticIndex.size,
      cacheSize: this.formatBytes(cacheSize),
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.fileCache.clear();
    this.semanticIndex.clear();

    // Delete cache files
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }
}

/**
 * Singleton instance
 */
export const contextManager = new ContextManager();
