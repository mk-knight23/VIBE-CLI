import axios from 'axios';

export interface WebSearchRequest {
  query: string;
  sources: ('npm' | 'mdn' | 'github' | 'official-docs')[];
  maxResults: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  credibilityScore: number;  // 0-1
  timestamp?: Date;
}

export interface KnowledgeFusionResult {
  fusedContent: string;
  sources: SearchResult[];
  confidence: number;
}

// Whitelisted domains for safe searching
const TRUSTED_DOMAINS = {
  npm: ['npmjs.com', 'npm.runkit.com'],
  mdn: ['developer.mozilla.org'],
  github: ['github.com', 'raw.githubusercontent.com', 'docs.github.com'],
  'official-docs': [
    'nodejs.org', 'expressjs.com', 'reactjs.org', 'typescriptlang.org',
    'nextjs.org', 'vitejs.dev', 'webpack.js.org', 'docs.microsoft.com',
    'cloud.google.com', 'aws.amazon.com', 'vercel.com'
  ]
};

export class WebSearchEngine {
  private apiKey?: string;
  private baseUrl = 'https://api.search.brave.com/res/v1/web/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY;
  }

  async search(req: WebSearchRequest): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn('No search API key configured, returning mock results');
      return this.getMockResults(req.query);
    }

    try {
      const domainFilter = this.buildDomainFilter(req.sources);
      const searchQuery = `${req.query} ${domainFilter}`;

      const response = await axios.get(this.baseUrl, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: searchQuery,
          count: Math.min(req.maxResults, 10),
          search_lang: 'en',
          country: 'US',
          safesearch: 'strict'
        },
        timeout: 10000
      });

      const results = this.parseSearchResults(response.data, req.sources);
      return this.scoreAndFilterResults(results);
    } catch (error) {
      console.warn(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.getMockResults(req.query);
    }
  }

  private buildDomainFilter(sources: string[]): string {
    const domains: string[] = [];
    
    sources.forEach(source => {
      if (TRUSTED_DOMAINS[source as keyof typeof TRUSTED_DOMAINS]) {
        domains.push(...TRUSTED_DOMAINS[source as keyof typeof TRUSTED_DOMAINS]);
      }
    });

    return domains.map(domain => `site:${domain}`).join(' OR ');
  }

  private parseSearchResults(data: any, sources: string[]): SearchResult[] {
    if (!data.web?.results) return [];

    return data.web.results.map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      snippet: result.description || '',
      source: this.identifySource(result.url, sources),
      credibilityScore: 0, // Will be calculated later
      timestamp: new Date()
    }));
  }

  private identifySource(url: string, requestedSources: string[]): string {
    for (const [sourceType, domains] of Object.entries(TRUSTED_DOMAINS)) {
      if (requestedSources.includes(sourceType) && 
          domains.some(domain => url.includes(domain))) {
        return sourceType;
      }
    }
    return 'unknown';
  }

  validateDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      return Object.values(TRUSTED_DOMAINS)
        .flat()
        .some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }

  scoreCredibility(result: SearchResult): number {
    let score = 0.5; // Base score

    // Source credibility
    const sourceScores = {
      'official-docs': 0.9,
      'mdn': 0.85,
      'github': 0.8,
      'npm': 0.75
    };

    score = sourceScores[result.source as keyof typeof sourceScores] || 0.5;

    // URL indicators
    if (result.url.includes('/docs/') || result.url.includes('/documentation/')) {
      score += 0.1;
    }

    if (result.url.includes('github.com') && result.url.includes('/blob/')) {
      score += 0.05; // Source code reference
    }

    // Title quality
    if (result.title.length > 10 && result.title.length < 100) {
      score += 0.05;
    }

    // Snippet quality
    if (result.snippet.length > 50) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  private scoreAndFilterResults(results: SearchResult[]): SearchResult[] {
    return results
      .map(result => ({
        ...result,
        credibilityScore: this.scoreCredibility(result)
      }))
      .filter(result => this.validateDomain(result.url))
      .sort((a, b) => b.credibilityScore - a.credibilityScore);
  }

  private getMockResults(query: string): SearchResult[] {
    // Mock results for testing/fallback
    return [
      {
        title: `Documentation for ${query}`,
        url: 'https://docs.example.com/mock',
        snippet: `Mock search result for query: ${query}`,
        source: 'official-docs',
        credibilityScore: 0.8,
        timestamp: new Date()
      }
    ];
  }
}

export class SearchRateLimiter {
  private searchCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxSearches = 5;
  private windowMs = 300000; // 5 minutes

  allowSearch(taskId: string): boolean {
    const now = Date.now();
    const record = this.searchCounts.get(taskId);

    if (!record || now > record.resetTime) {
      this.searchCounts.set(taskId, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxSearches) {
      return false;
    }

    record.count++;
    return true;
  }

  getSearchCount(taskId: string): number {
    const record = this.searchCounts.get(taskId);
    return record ? record.count : 0;
  }

  resetCount(taskId: string): void {
    this.searchCounts.delete(taskId);
  }

  getRemainingSearches(taskId: string): number {
    const count = this.getSearchCount(taskId);
    return Math.max(0, this.maxSearches - count);
  }
}

export class KnowledgeFusion {
  fuse(existing: string, searchResults: SearchResult[]): KnowledgeFusionResult {
    if (searchResults.length === 0) {
      return {
        fusedContent: existing,
        sources: [],
        confidence: 0
      };
    }

    // Extract key information from search results
    const keyInfo = searchResults.map(result => ({
      content: result.snippet,
      source: result.source,
      credibility: result.credibilityScore,
      url: result.url
    }));

    // Create fused content
    const fusedContent = this.createFusedContent(existing, keyInfo);
    
    // Calculate confidence based on source credibility
    const avgCredibility = keyInfo.reduce((sum, info) => sum + info.credibility, 0) / keyInfo.length;
    const confidence = Math.min(1, avgCredibility * (searchResults.length / 3)); // More sources = higher confidence

    return {
      fusedContent,
      sources: searchResults,
      confidence
    };
  }

  private createFusedContent(existing: string, keyInfo: Array<{content: string, source: string, credibility: number, url: string}>): string {
    let fusedContent = existing;

    // Add relevant information from high-credibility sources
    const highCredibilitySources = keyInfo.filter(info => info.credibility > 0.7);
    
    if (highCredibilitySources.length > 0) {
      fusedContent += '\n\n**Additional Context:**\n';
      
      highCredibilitySources.forEach(info => {
        fusedContent += `- ${info.content} (Source: ${info.source})\n`;
      });
    }

    return fusedContent;
  }

  injectIntoPrompt(prompt: string, knowledge: string): string {
    if (!knowledge || knowledge.trim() === prompt.trim()) {
      return prompt;
    }

    return `${prompt}\n\n**Context from recent search:**\n${knowledge}`;
  }
}

export class WebSearchTool {
  private engine: WebSearchEngine;
  private rateLimiter: SearchRateLimiter;
  private knowledgeFusion: KnowledgeFusion;

  constructor(apiKey?: string) {
    this.engine = new WebSearchEngine(apiKey);
    this.rateLimiter = new SearchRateLimiter();
    this.knowledgeFusion = new KnowledgeFusion();
  }

  async search(
    query: string, 
    taskId: string,
    sources: ('npm' | 'mdn' | 'github' | 'official-docs')[] = ['official-docs', 'mdn'],
    maxResults = 3
  ): Promise<SearchResult[]> {
    
    if (!this.rateLimiter.allowSearch(taskId)) {
      throw new Error(`Rate limit exceeded. ${this.rateLimiter.getRemainingSearches(taskId)} searches remaining.`);
    }

    const request: WebSearchRequest = {
      query,
      sources,
      maxResults
    };

    return this.engine.search(request);
  }

  async searchAndFuse(
    query: string,
    existingContext: string,
    taskId: string,
    sources?: ('npm' | 'mdn' | 'github' | 'official-docs')[]
  ): Promise<KnowledgeFusionResult> {
    
    const results = await this.search(query, taskId, sources);
    return this.knowledgeFusion.fuse(existingContext, results);
  }

  getRemainingSearches(taskId: string): number {
    return this.rateLimiter.getRemainingSearches(taskId);
  }

  resetSearchCount(taskId: string): void {
    this.rateLimiter.resetCount(taskId);
  }
}
