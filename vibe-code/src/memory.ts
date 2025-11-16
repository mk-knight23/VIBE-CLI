import * as vscode from 'vscode';

/**
 * Memory entry persisted in globalState/workspaceState.
 * We avoid large embeddings/vendors to keep extension lean (<5MB bundle).
 * Simple token / keyword heuristics for relevance scoring.
 */
export interface MemoryEntry {
  id: string;
  text: string;
  tags: string[];
  createdAt: number; // epoch ms
  lastAccessAt: number;
  accessCount: number;
  scope: 'global' | 'workspace';
  /**
   * Optional manual importance (0-5). Higher values resist pruning.
   */
  importance?: number;
}

/**
 * Query result with score + snippet highlight.
 */
export interface MemoryQueryResult {
  entry: MemoryEntry;
  score: number;
  highlighted: string;
}

export interface AddMemoryOptions {
  tags?: string[];
  importance?: number;
  scope?: 'global' | 'workspace';
}

export interface MemoryBankConfig {
  maxItems: number;
  enable: boolean;
}

const GLOBAL_KEY = 'vibe.memory.global';
const WORKSPACE_KEY = 'vibe.memory.workspace';

/**
 * MemoryBank manages two scopes:
 * - Global (persists across all workspaces)
 * - Workspace (specific to opened folder)
 *
 * Provides CRUD + query scoring + pruning.
 */
export class MemoryBank {
  private globalEntries: MemoryEntry[] = [];
  private workspaceEntries: MemoryEntry[] = [];
  private context: vscode.ExtensionContext;
  private maxItems: number;
  private enabled: boolean;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const cfg = vscode.workspace.getConfiguration('vibe');
    this.maxItems = cfg.get<number>('memory.maxItems', 200);
    this.enabled = cfg.get<boolean>('memory.enabled', true);
    this.load();
  }

  public refreshConfig() {
    const cfg = vscode.workspace.getConfiguration('vibe');
    this.maxItems = cfg.get<number>('memory.maxItems', 200);
    this.enabled = cfg.get<boolean>('memory.enabled', true);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private load() {
    this.globalEntries = this.safeParseArray(
      this.context.globalState.get<string>(GLOBAL_KEY) || '[]'
    );
    this.workspaceEntries = this.safeParseArray(
      this.context.workspaceState.get<string>(WORKSPACE_KEY) || '[]'
    );
  }

  private persist() {
    void this.context.globalState.update(GLOBAL_KEY, JSON.stringify(this.globalEntries));
    void this.context.workspaceState.update(
      WORKSPACE_KEY,
      JSON.stringify(this.workspaceEntries)
    );
  }

  private safeParseArray(raw: string): MemoryEntry[] {
    try {
      const val = JSON.parse(raw);
      if (Array.isArray(val)) {
        return val.filter(this.validateEntry);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private validateEntry(e: any): e is MemoryEntry {
    return (
      e &&
      typeof e.id === 'string' &&
      typeof e.text === 'string' &&
      Array.isArray(e.tags) &&
      typeof e.createdAt === 'number'
    );
  }

  /**
   * Add memory entry (auto-prune if limit exceeded).
   */
  public addMemory(text: string, opts: AddMemoryOptions = {}): MemoryEntry | undefined {
    if (!this.enabled) return;
    const scope = opts.scope ?? 'workspace';
    const id = this.generateId();
    const now = Date.now();
    const entry: MemoryEntry = {
      id,
      text: text.trim(),
      tags: (opts.tags ?? []).map((t) => t.toLowerCase()),
      createdAt: now,
      lastAccessAt: now,
      accessCount: 0,
      scope,
      importance: opts.importance,
    };

    const list = scope === 'global' ? this.globalEntries : this.workspaceEntries;
    list.push(entry);
    this.prune(list);
    this.persist();
    return entry;
  }

  /**
   * Update last access metadata.
   */
  private touch(entry: MemoryEntry) {
    entry.lastAccessAt = Date.now();
    entry.accessCount += 1;
  }

  /**
   * Simple prune strategy:
   * - Keep within maxItems
   * - Sort by (importance desc, accessCount desc, createdAt desc)
   * - Drop tail
   */
  private prune(list: MemoryEntry[]) {
    if (list.length <= this.maxItems) return;
    list.sort((a, b) => {
      const impA = a.importance ?? 0;
      const impB = b.importance ?? 0;
      if (impA !== impB) return impB - impA;
      if (a.accessCount !== b.accessCount) return b.accessCount - a.accessCount;
      return b.createdAt - a.createdAt;
    });
    while (list.length > this.maxItems) {
      list.pop();
    }
  }

  public list(scope: 'global' | 'workspace'): MemoryEntry[] {
    const list = scope === 'global' ? this.globalEntries : this.workspaceEntries;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }

  public getById(id: string): MemoryEntry | undefined {
    const all = [...this.globalEntries, ...this.workspaceEntries];
    return all.find((e) => e.id === id);
  }

  /**
   * Query memories using token overlap heuristic:
   * score = intersection / sqrt(lenA * lenB)  (cosine-like)
   * Tag matches provide small bonus.
   */
  public query(
    queryText: string,
    scope: 'global' | 'workspace' | 'all',
    limit = 10
  ): MemoryQueryResult[] {
    if (!this.enabled) return [];
    const normQuery = normalizeText(queryText);
    const qTokens = tokenize(normQuery);

    let candidates: MemoryEntry[] = [];
    if (scope === 'global' || scope === 'all') candidates.push(...this.globalEntries);
    if (scope === 'workspace' || scope === 'all')
      candidates.push(...this.workspaceEntries);

    const results: MemoryQueryResult[] = [];
    for (const e of candidates) {
      const eTokens = tokenize(normalizeText(e.text));
      const intersection = new Set([...qTokens.filter((t) => eTokens.includes(t))]);
      let score =
        intersection.size / Math.sqrt(Math.max(1, qTokens.length * eTokens.length));

      // Tag bonus
      for (const tag of e.tags) {
        if (normQuery.includes(tag)) {
          score += 0.05;
        }
      }
      if (e.importance) {
        score += e.importance * 0.02;
      }
      if (score > 0) {
        const highlighted = highlightTokens(e.text, intersection);
        results.push({ entry: e, score, highlighted });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const sliced = results.slice(0, limit);
    for (const r of sliced) this.touch(r.entry);
    this.persist();
    return sliced;
  }

  /**
   * Delete memory by id.
   */
  public delete(id: string): boolean {
    const idxGlobal = this.globalEntries.findIndex((e) => e.id === id);
    if (idxGlobal !== -1) {
      this.globalEntries.splice(idxGlobal, 1);
      this.persist();
      return true;
    }
    const idxWorkspace = this.workspaceEntries.findIndex((e) => e.id === id);
    if (idxWorkspace !== -1) {
      this.workspaceEntries.splice(idxWorkspace, 1);
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Build a session context summary capped at certain lines/length.
   */
  public buildSessionContextSummary(maxEntries = 8, maxChars = 1500): string {
    const combined = [...this.workspaceEntries, ...this.globalEntries];
    combined.sort((a, b) => b.lastAccessAt - a.lastAccessAt);
    const selected: string[] = [];
    let length = 0;
    for (const e of combined) {
      if (selected.length >= maxEntries) break;
      const snippet = truncate(e.text.replace(/\s+/g, ' ').trim(), 180);
      if (length + snippet.length > maxChars) break;
      length += snippet.length;
      selected.push(`• ${snippet}`);
    }
    if (selected.length === 0) {
      return 'No session memories yet.';
    }
    return selected.join('\n');
  }

  public clear(scope: 'global' | 'workspace'): void {
    if (scope === 'global') {
      this.globalEntries = [];
    } else {
      this.workspaceEntries = [];
    }
    this.persist();
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
}

/**
 * Helpers
 */
function normalizeText(text: string): string {
  return text.toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .split(/[^a-z0-9_]+/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

function highlightTokens(original: string, tokens: Set<string>): string {
  if (tokens.size === 0) return original;
  // naive highlight with **...**
  return original.replace(/\b([a-z0-9_]+)\b/gi, (m) => {
    if (tokens.has(m.toLowerCase())) {
      return `**${m}**`;
    }
    return m;
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * Utility for building a memory injection block for prompts.
 */
export function buildMemoryPromptSegment(bank: MemoryBank, query: string): string {
  const matches = bank.query(query, 'all', 5);
  if (matches.length === 0) return 'Memory Matches: (none)';
  const lines = matches.map(
    (m) =>
      `• (${m.entry.scope}) [${new Date(m.entry.createdAt).toLocaleDateString()}] ${truncate(
        m.highlighted,
        140
      )}`
  );
  return 'Memory Matches:\n' + lines.join('\n');
}