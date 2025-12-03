import fs from 'fs';
import path from 'path';
import os from 'os';

const BACKUP_DIR = path.join(os.homedir(), '.vibe', 'backups');

export function createBackup(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;

    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, timestamp.toString(), filePath);
    const backupDir = path.dirname(backupPath);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}

export function restoreBackup(backupPath: string, targetPath: string): boolean {
  try {
    if (!fs.existsSync(backupPath)) return false;
    
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(backupPath, targetPath);
    return true;
  } catch {
    return false;
  }
}
