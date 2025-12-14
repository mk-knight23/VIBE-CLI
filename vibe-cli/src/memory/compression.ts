import * as fs from 'fs';
import * as path from 'path';
import { ChatTurn } from './semantic-search';

export interface CompressedMemoryBlock {
  startIndex: number;
  endIndex: number;
  dateRange: { start: Date; end: Date };
  summary: string;
  keyDecisions: string[];
  blockersResolved: BlockerResolution[];
  currentState: string;
  fullHistoryPath: string;  // Link to archived messages
}

export interface BlockerResolution {
  blocker: string;
  resolution: string;
  resolvedAtTurnIndex: number;
}

export class MemoryCompressor {
  private compressionThreshold = 50; // Compress every 50 messages
  private archiveDir: string;

  constructor(archiveDir: string = '.vibe/archives') {
    this.archiveDir = archiveDir;
    this.ensureArchiveDir();
  }

  async shouldCompress(memory: ChatTurn[]): Promise<boolean> {
    return memory.length >= this.compressionThreshold;
  }

  async compress(turns: ChatTurn[], count?: number): Promise<CompressedMemoryBlock> {
    const turnsToCompress = turns.slice(0, count || this.compressionThreshold);
    
    if (turnsToCompress.length === 0) {
      throw new Error('No turns to compress');
    }

    const summarizer = new MemorySummarizer();
    const archiveManager = new ArchiveManager(this.archiveDir);

    // Generate summary and extract key information
    const summary = await summarizer.summarizeTurns(turnsToCompress);
    const keyDecisions = await summarizer.extractKeyDecisions(turnsToCompress);
    const blockersResolved = await summarizer.extractBlockerResolutions(turnsToCompress);
    const currentState = this.extractCurrentState(turnsToCompress);

    // Archive the full history
    const blockId = this.generateBlockId();
    const fullHistoryPath = await archiveManager.archiveTurns(turnsToCompress, blockId);

    const dateRange = {
      start: turnsToCompress[0].timestamp,
      end: turnsToCompress[turnsToCompress.length - 1].timestamp
    };

    return {
      startIndex: 0,
      endIndex: turnsToCompress.length - 1,
      dateRange,
      summary,
      keyDecisions,
      blockersResolved,
      currentState,
      fullHistoryPath
    };
  }

  async decompress(block: CompressedMemoryBlock): Promise<ChatTurn[]> {
    const archiveManager = new ArchiveManager(this.archiveDir);
    return archiveManager.retrieveArchive(path.basename(block.fullHistoryPath, '.json'));
  }

  private extractCurrentState(turns: ChatTurn[]): string {
    // Extract the current state from the last few turns
    const recentTurns = turns.slice(-5);
    const states = recentTurns
      .filter(turn => turn.role === 'assistant')
      .map(turn => turn.message)
      .join(' ');

    // Simple state extraction (would be more sophisticated in production)
    if (states.includes('completed') || states.includes('finished')) {
      return 'Task completed successfully';
    } else if (states.includes('error') || states.includes('failed')) {
      return 'Task encountered errors';
    } else if (states.includes('working') || states.includes('processing')) {
      return 'Task in progress';
    } else {
      return 'Task status unclear';
    }
  }

  private generateBlockId(): string {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureArchiveDir(): void {
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }
}

export class MemorySummarizer {
  async summarizeTurns(turns: ChatTurn[]): Promise<string> {
    if (turns.length === 0) return 'No conversation to summarize';

    // Group turns by task
    const taskGroups = this.groupByTask(turns);
    const summaries: string[] = [];

    for (const [task, taskTurns] of taskGroups) {
      const taskSummary = this.summarizeTask(task, taskTurns);
      summaries.push(taskSummary);
    }

    return summaries.join('\n\n');
  }

  async extractKeyDecisions(turns: ChatTurn[]): Promise<string[]> {
    const decisions: string[] = [];
    
    for (const turn of turns) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        const message = turn.message.toLowerCase();
        
        // Look for decision indicators
        if (this.isDecision(message)) {
          decisions.push(this.extractDecisionText(turn.message));
        }
      }
    }

    return decisions.slice(0, 10); // Limit to top 10 decisions
  }

  async extractBlockerResolutions(turns: ChatTurn[]): Promise<BlockerResolution[]> {
    const resolutions: BlockerResolution[] = [];
    let currentBlocker: string | null = null;

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const message = turn.message.toLowerCase();

      // Detect blockers
      if (this.isBlocker(message)) {
        currentBlocker = this.extractBlockerText(turn.message);
      }

      // Detect resolutions
      if (currentBlocker && this.isResolution(message)) {
        resolutions.push({
          blocker: currentBlocker,
          resolution: this.extractResolutionText(turn.message),
          resolvedAtTurnIndex: i
        });
        currentBlocker = null;
      }
    }

    return resolutions;
  }

  private groupByTask(turns: ChatTurn[]): Map<string, ChatTurn[]> {
    const groups = new Map<string, ChatTurn[]>();

    for (const turn of turns) {
      const task = turn.task || 'general';
      if (!groups.has(task)) {
        groups.set(task, []);
      }
      groups.get(task)!.push(turn);
    }

    return groups;
  }

  private summarizeTask(task: string, turns: ChatTurn[]): string {
    const userMessages = turns.filter(t => t.role === 'user').length;
    const assistantMessages = turns.filter(t => t.role === 'assistant').length;
    const totalTokens = turns.reduce((sum, t) => sum + t.tokens, 0);

    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];

    return `**${task}**: ${userMessages} user messages, ${assistantMessages} assistant responses. ` +
           `Total tokens: ${totalTokens}. ` +
           `Duration: ${firstTurn.timestamp.toISOString()} to ${lastTurn.timestamp.toISOString()}.`;
  }

  private isDecision(message: string): boolean {
    const decisionKeywords = [
      'decided to', 'chose to', 'selected', 'going with', 'will use',
      'decided that', 'conclusion is', 'final decision', 'agreed to'
    ];
    return decisionKeywords.some(keyword => message.includes(keyword));
  }

  private extractDecisionText(message: string): string {
    // Extract the sentence containing the decision
    const sentences = message.split(/[.!?]+/);
    const decisionSentence = sentences.find(s => this.isDecision(s.toLowerCase()));
    return decisionSentence?.trim() || message.substring(0, 100);
  }

  private isBlocker(message: string): boolean {
    const blockerKeywords = [
      'blocked by', 'stuck on', 'cannot', 'unable to', 'problem with',
      'issue with', 'error', 'failing', 'not working'
    ];
    return blockerKeywords.some(keyword => message.includes(keyword));
  }

  private extractBlockerText(message: string): string {
    const sentences = message.split(/[.!?]+/);
    const blockerSentence = sentences.find(s => this.isBlocker(s.toLowerCase()));
    return blockerSentence?.trim() || message.substring(0, 100);
  }

  private isResolution(message: string): boolean {
    const resolutionKeywords = [
      'resolved', 'fixed', 'solved', 'working now', 'completed',
      'success', 'done', 'finished', 'implemented'
    ];
    return resolutionKeywords.some(keyword => message.includes(keyword));
  }

  private extractResolutionText(message: string): string {
    const sentences = message.split(/[.!?]+/);
    const resolutionSentence = sentences.find(s => this.isResolution(s.toLowerCase()));
    return resolutionSentence?.trim() || message.substring(0, 100);
  }
}

export class TokenBudgetTracker {
  private originalTokens = 0;
  private currentTokens = 0;

  estimateMemoryTokens(memory: ChatTurn[]): number {
    return memory.reduce((sum, turn) => sum + turn.tokens, 0);
  }

  calculateCompressionSavings(before: ChatTurn[], after: CompressedMemoryBlock): number {
    const beforeTokens = this.estimateMemoryTokens(before);
    const afterTokens = this.estimateBlockTokens(after);
    
    this.originalTokens = beforeTokens;
    this.currentTokens = afterTokens;
    
    return beforeTokens - afterTokens;
  }

  getMemoryCost(): { originalTokens: number; currentTokens: number; saved: number } {
    return {
      originalTokens: this.originalTokens,
      currentTokens: this.currentTokens,
      saved: this.originalTokens - this.currentTokens
    };
  }

  private estimateBlockTokens(block: CompressedMemoryBlock): number {
    // Estimate tokens in compressed block
    const summaryTokens = Math.ceil(block.summary.length / 4); // ~4 chars per token
    const decisionsTokens = block.keyDecisions.reduce((sum, d) => sum + Math.ceil(d.length / 4), 0);
    const blockersTokens = block.blockersResolved.reduce((sum, b) => 
      sum + Math.ceil((b.blocker.length + b.resolution.length) / 4), 0);
    
    return summaryTokens + decisionsTokens + blockersTokens;
  }
}

export class ArchiveManager {
  constructor(private archiveDir: string) {}

  async archiveTurns(turns: ChatTurn[], blockId: string): Promise<string> {
    const filename = `${blockId}.json`;
    const filepath = path.join(this.archiveDir, filename);
    
    const archiveData = {
      blockId,
      timestamp: new Date().toISOString(),
      turnCount: turns.length,
      turns: turns.map(turn => ({
        id: turn.id,
        turn: turn.turn,
        message: turn.message,
        role: turn.role,
        timestamp: turn.timestamp.toISOString(),
        tokens: turn.tokens,
        task: turn.task
      }))
    };

    await fs.promises.writeFile(filepath, JSON.stringify(archiveData, null, 2));
    return filepath;
  }

  async retrieveArchive(blockId: string): Promise<ChatTurn[]> {
    const filename = `${blockId}.json`;
    const filepath = path.join(this.archiveDir, filename);
    
    try {
      const data = await fs.promises.readFile(filepath, 'utf-8');
      const archiveData = JSON.parse(data);
      
      return archiveData.turns.map((turn: any) => ({
        id: turn.id,
        turn: turn.turn,
        message: turn.message,
        role: turn.role,
        timestamp: new Date(turn.timestamp),
        tokens: turn.tokens,
        task: turn.task
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve archive ${blockId}: ${error}`);
    }
  }

  async listArchives(): Promise<Array<{ blockId: string; timestamp: Date; turnCount: number }>> {
    try {
      const files = await fs.promises.readdir(this.archiveDir);
      const archives = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filepath = path.join(this.archiveDir, file);
            const data = await fs.promises.readFile(filepath, 'utf-8');
            const archiveData = JSON.parse(data);
            
            archives.push({
              blockId: archiveData.blockId,
              timestamp: new Date(archiveData.timestamp),
              turnCount: archiveData.turnCount
            });
          } catch (error) {
            console.warn(`Failed to read archive ${file}: ${error}`);
          }
        }
      }

      return archives.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      return [];
    }
  }
}
