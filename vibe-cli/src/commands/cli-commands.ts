import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ChatCheckpoint {
  tag: string;
  timestamp: number;
  messages: any[];
}

const checkpointDir = path.join(process.cwd(), '.vibe', 'checkpoints');

export function ensureCheckpointDir() {
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }
}

export function saveChat(tag: string, messages: any[]): string {
  ensureCheckpointDir();
  const checkpoint: ChatCheckpoint = { tag, timestamp: Date.now(), messages };
  const file = path.join(checkpointDir, `${tag}.json`);
  fs.writeFileSync(file, JSON.stringify(checkpoint, null, 2));
  return `Chat saved: ${tag}`;
}

export function resumeChat(tag: string): any[] {
  const file = path.join(checkpointDir, `${tag}.json`);
  if (!fs.existsSync(file)) throw new Error(`Chat not found: ${tag}`);
  const checkpoint: ChatCheckpoint = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return checkpoint.messages;
}

export function listChats(): string[] {
  ensureCheckpointDir();
  return fs.readdirSync(checkpointDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

export function deleteChat(tag: string): string {
  const file = path.join(checkpointDir, `${tag}.json`);
  if (!fs.existsSync(file)) throw new Error(`Chat not found: ${tag}`);
  fs.unlinkSync(file);
  return `Chat deleted: ${tag}`;
}

export function shareChat(messages: any[], filename?: string): string {
  const name = filename || `vibe-chat-${Date.now()}.md`;
  const ext = path.extname(name);
  
  let content: string;
  if (ext === '.json') {
    content = JSON.stringify(messages, null, 2);
  } else {
    content = messages.map(m => `**${m.role.toUpperCase()}:**\n\n${m.content}\n\n---\n`).join('\n');
  }
  
  fs.writeFileSync(name, content);
  return `Chat shared: ${name}`;
}

export function compressContext(messages: any[]): string {
  const summary = `[Context Summary: ${messages.length} messages compressed]`;
  return summary;
}

export async function copyToClipboard(text: string): Promise<string> {
  try {
    if (process.platform === 'darwin') {
      await execAsync(`echo "${text.replace(/"/g, '\\"')}" | pbcopy`);
    } else if (process.platform === 'win32') {
      await execAsync(`echo ${text} | clip`);
    } else {
      await execAsync(`echo "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`);
    }
    return 'Copied to clipboard';
  } catch {
    return 'Clipboard not available';
  }
}

export function getStats(messages: any[], startTime: number): string {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const tokens = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  
  return `Session Stats:
Messages: ${messages.length}
Approx Tokens: ${Math.ceil(tokens / 4)}
Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`;
}

export function getAbout(): string {
  const pkg = require('../../package.json');
  return `Vibe CLI v${pkg.version}
AI-Powered Development Assistant
Made with 🔥 by KAZI

GitHub: https://github.com/mk-knight23/vibe
Issues: https://github.com/mk-knight23/vibe/issues`;
}

export async function executeShellCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, { 
    env: { ...process.env, VIBE_CLI: '1' },
    maxBuffer: 10 * 1024 * 1024
  });
}

export function readFileContent(filePath: string): string {
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(absPath, 'utf-8');
}

export function readDirectoryContent(dirPath: string): string {
  const absPath = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(absPath)) throw new Error(`Directory not found: ${dirPath}`);
  
  const files: string[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else {
        files.push(path.relative(absPath, fullPath));
      }
    }
  };
  
  walk(absPath);
  return files.map(f => `${f}:\n${fs.readFileSync(path.join(absPath, f), 'utf-8')}\n---\n`).join('\n');
}
