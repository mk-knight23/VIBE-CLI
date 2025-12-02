// Complete Filesystem Engine
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileSystemEngine {
  private backupDir: string;

  constructor(workspaceRoot: string) {
    this.backupDir = path.join(workspaceRoot, '.vibe', 'backups');
    this.ensureDir(this.backupDir);
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    this.ensureDir(folderPath);
  }

  async createFile(filePath: string, content: string = ''): Promise<void> {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await this.backup(filePath);
    fs.writeFileSync(filePath, content, 'utf8');
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf8');
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.backup(filePath);
    fs.unlinkSync(filePath);
  }

  async deleteFolder(folderPath: string): Promise<void> {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  async moveFile(from: string, to: string): Promise<void> {
    await this.backup(from);
    this.ensureDir(path.dirname(to));
    fs.renameSync(from, to);
  }

  async copyFile(from: string, to: string): Promise<void> {
    this.ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
  }

  async search(dir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const regex = new RegExp(pattern, 'i');

    const walk = (currentPath: string) => {
      const files = fs.readdirSync(currentPath);
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else if (regex.test(file)) {
          results.push(filePath);
        }
      }
    };

    walk(dir);
    return results;
  }

  async applyPatch(filePath: string, diff: string): Promise<void> {
    await this.backup(filePath);
    const content = await this.readFile(filePath);
    const lines = content.split('\n');
    const diffLines = diff.split('\n');
    
    let lineNum = 0;
    for (const diffLine of diffLines) {
      if (diffLine.startsWith('@@')) {
        const match = diffLine.match(/@@ -(\d+)/);
        if (match) lineNum = parseInt(match[1]) - 1;
      } else if (diffLine.startsWith('+')) {
        lines.splice(lineNum, 0, diffLine.substring(1));
        lineNum++;
      } else if (diffLine.startsWith('-')) {
        lines.splice(lineNum, 1);
      } else {
        lineNum++;
      }
    }

    await this.writeFile(filePath, lines.join('\n'));
  }

  private async backup(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;
    
    const timestamp = Date.now();
    const backupPath = path.join(
      this.backupDir,
      `${path.basename(filePath)}.${timestamp}.bak`
    );
    fs.copyFileSync(filePath, backupPath);
  }

  async listFiles(dir: string, recursive: boolean = false): Promise<string[]> {
    const results: string[] = [];

    const walk = (currentPath: string) => {
      const files = fs.readdirSync(currentPath);
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (recursive) walk(filePath);
        } else {
          results.push(filePath);
        }
      }
    };

    walk(dir);
    return results;
  }
}
