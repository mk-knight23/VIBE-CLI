import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PermissionService } from './permission';

export class FileActionsService {
  constructor(private permissions: PermissionService) {}

  async createFile(filePath: string, content: string = ''): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      
      if (fs.existsSync(fullPath)) {
        const confirmed = await this.permissions.confirmOverwrite(filePath);
        if (!confirmed) return false;
      }

      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content);
      await this.openFile(fullPath);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create file: ${error}`);
      return false;
    }
  }

  async createFolder(folderPath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(folderPath);
      fs.mkdirSync(fullPath, { recursive: true });
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const confirmed = await this.permissions.confirmDelete(filePath);
      if (!confirmed) return false;

      const fullPath = this.getFullPath(filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete file: ${error}`);
      return false;
    }
  }

  async deleteFolder(folderPath: string): Promise<boolean> {
    try {
      const confirmed = await this.permissions.confirmDelete(folderPath);
      if (!confirmed) return false;

      const fullPath = this.getFullPath(folderPath);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete folder: ${error}`);
      return false;
    }
  }

  async moveFile(from: string, to: string): Promise<boolean> {
    try {
      const fromPath = this.getFullPath(from);
      const toPath = this.getFullPath(to);
      fs.renameSync(fromPath, toPath);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to move file: ${error}`);
      return false;
    }
  }

  async copyFile(from: string, to: string): Promise<boolean> {
    try {
      const fromPath = this.getFullPath(from);
      const toPath = this.getFullPath(to);
      fs.copyFileSync(fromPath, toPath);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to copy file: ${error}`);
      return false;
    }
  }

  async applyPatch(filePath: string, diff: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Simple patch application (you can enhance this)
      const lines = content.split('\n');
      const patchLines = diff.split('\n');
      
      // Apply patch logic here
      // For now, just show preview
      const preview = await vscode.window.showTextDocument(
        await vscode.workspace.openTextDocument({ content: diff, language: 'diff' })
      );
      
      const result = await vscode.window.showInformationMessage(
        'Apply this patch?',
        { modal: true },
        'Apply',
        'Cancel'
      );
      
      return result === 'Apply';
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply patch: ${error}`);
      return false;
    }
  }

  private getFullPath(relativePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }
    return path.join(workspaceFolder.uri.fsPath, relativePath);
  }

  private async openFile(fullPath: string) {
    const uri = vscode.Uri.file(fullPath);
    await vscode.window.showTextDocument(uri);
  }

  refreshExplorer() {
    vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
  }
}
