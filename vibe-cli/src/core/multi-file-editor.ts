// Multi-File Atomic Editing Engine
import { readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';

export interface FilePatch {
  path: string;
  oldContent: string;
  newContent: string;
  operation: 'edit' | 'create' | 'delete';
}

export interface EditTransaction {
  id: string;
  patches: FilePatch[];
  timestamp: number;
  status: 'pending' | 'applied' | 'rolled-back';
}

export class MultiFileEditor {
  private transactions: Map<string, EditTransaction> = new Map();
  private backupDir: string = '.vibe-backups';

  async createTransaction(patches: FilePatch[]): Promise<string> {
    const id = `tx-${Date.now()}`;
    const transaction: EditTransaction = {
      id,
      patches,
      timestamp: Date.now(),
      status: 'pending'
    };
    this.transactions.set(id, transaction);
    return id;
  }

  async applyTransaction(txId: string): Promise<boolean> {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error('Transaction not found');

    try {
      // Backup all files
      await this.backupFiles(tx.patches);

      // Apply all patches
      for (const patch of tx.patches) {
        await this.applyPatch(patch);
      }

      tx.status = 'applied';
      return true;
    } catch (error) {
      // Rollback on any failure
      await this.rollbackTransaction(txId);
      throw error;
    }
  }

  async rollbackTransaction(txId: string): Promise<void> {
    const tx = this.transactions.get(txId);
    if (!tx) return;

    for (const patch of tx.patches) {
      const backupPath = join(this.backupDir, `${txId}-${patch.path}`);
      try {
        await copyFile(backupPath, patch.path);
      } catch (err) {
        // Backup might not exist for new files
      }
    }

    tx.status = 'rolled-back';
  }

  private async backupFiles(patches: FilePatch[]): Promise<void> {
    for (const patch of patches) {
      if (patch.operation !== 'create') {
        const backupPath = join(this.backupDir, `${Date.now()}-${patch.path}`);
        try {
          await copyFile(patch.path, backupPath);
        } catch (err) {
          // File might not exist
        }
      }
    }
  }

  private async applyPatch(patch: FilePatch): Promise<void> {
    switch (patch.operation) {
      case 'edit':
      case 'create':
        await writeFile(patch.path, patch.newContent, 'utf-8');
        break;
      case 'delete':
        // Delete handled separately
        break;
    }
  }

  async editMultipleFiles(files: Array<{path: string, changes: string}>): Promise<string> {
    const patches: FilePatch[] = [];

    for (const file of files) {
      let oldContent = '';
      try {
        oldContent = await readFile(file.path, 'utf-8');
      } catch (err) {
        // New file
      }

      patches.push({
        path: file.path,
        oldContent,
        newContent: file.changes,
        operation: oldContent ? 'edit' : 'create'
      });
    }

    const txId = await this.createTransaction(patches);
    await this.applyTransaction(txId);
    return txId;
  }
}
