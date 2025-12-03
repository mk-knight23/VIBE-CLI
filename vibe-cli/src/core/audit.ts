import fs from 'fs';
import path from 'path';
import os from 'os';

const AUDIT_DIR = path.join(os.homedir(), '.vibe');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.log');

export interface AuditEntry {
  timestamp: string;
  action: string;
  tool: string;
  args: any;
  result?: any;
  error?: any;
  user?: string;
}

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  try {
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    fs.appendFileSync(AUDIT_FILE, JSON.stringify(fullEntry) + '\n');
  } catch (error) {
    // Silent fail - don't break execution
  }
}

export function getAuditLog(limit = 100): AuditEntry[] {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n').slice(-limit);
    
    return lines.map(line => JSON.parse(line));
  } catch {
    return [];
  }
}
