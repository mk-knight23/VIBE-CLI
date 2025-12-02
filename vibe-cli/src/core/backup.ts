/**
 * Backup and rollback utility
 */

import fs from 'fs';
import path from 'path';

export class BackupManager {
  private backupRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.backupRoot = path.join(projectRoot, '.vibe', 'backups');
    if (!fs.existsSync(this.backupRoot)) {
      fs.mkdirSync(this.backupRoot, { recursive: true });
    }
  }

  createBackup(filePath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupRoot, timestamp);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(backupDir, relativePath.replace(/\//g, '_'));
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    return backupPath;
  }

  restore(backupPath: string, targetPath: string): void {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }
    
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(backupPath, targetPath);
  }

  listBackups(): string[] {
    if (!fs.existsSync(this.backupRoot)) return [];
    
    return fs.readdirSync(this.backupRoot)
      .filter(name => fs.statSync(path.join(this.backupRoot, name)).isDirectory())
      .sort()
      .reverse();
  }

  cleanup(daysToKeep: number = 14): void {
    const backups = this.listBackups();
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    for (const backup of backups) {
      const backupPath = path.join(this.backupRoot, backup);
      const stat = fs.statSync(backupPath);
      
      if (stat.mtimeMs < cutoff) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
    }
  }
}
