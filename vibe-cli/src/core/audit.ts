/**
 * Audit logging for Vibe CLI
 */

import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  time: string;
  user: string;
  op: string;
  path?: string;
  provider?: string;
  model?: string;
  dryRun: boolean;
  result?: string;
  backup?: string;
}

export class AuditLogger {
  private logPath: string;

  constructor(projectRoot: string = process.cwd()) {
    const vibeDir = path.join(projectRoot, '.vibe');
    if (!fs.existsSync(vibeDir)) {
      fs.mkdirSync(vibeDir, { recursive: true });
    }
    this.logPath = path.join(vibeDir, 'audit.log');
  }

  log(entry: Partial<AuditEntry>): void {
    const fullEntry: AuditEntry = {
      time: new Date().toISOString(),
      user: process.env.USER || 'unknown',
      op: entry.op || 'unknown',
      path: entry.path,
      provider: entry.provider,
      model: entry.model,
      dryRun: entry.dryRun ?? false,
      result: entry.result,
      backup: entry.backup
    };

    fs.appendFileSync(this.logPath, JSON.stringify(fullEntry) + '\n');
  }

  getRecent(limit: number = 50): AuditEntry[] {
    if (!fs.existsSync(this.logPath)) return [];
    
    const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n');
    return lines.slice(-limit).map(line => JSON.parse(line));
  }

  cleanup(daysToKeep: number = 14): void {
    const entries = this.getRecent(1000);
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const kept = entries.filter(e => new Date(e.time).getTime() > cutoff);
    
    fs.writeFileSync(this.logPath, kept.map(e => JSON.stringify(e)).join('\n') + '\n');
  }
}
