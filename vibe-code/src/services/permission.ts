import * as vscode from 'vscode';

export class PermissionService {
  async confirmDelete(path: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `⚠️ Are you sure you want to delete: ${path}?`,
      { modal: true },
      'Delete',
      'Cancel'
    );
    return result === 'Delete';
  }

  async confirmOverwrite(path: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `⚠️ File ${path} already exists. Overwrite?`,
      { modal: true },
      'Overwrite',
      'Cancel'
    );
    return result === 'Overwrite';
  }

  async confirmShellCommand(command: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `⚠️ Execute shell command: ${command}?`,
      { modal: true },
      'Execute',
      'Cancel'
    );
    return result === 'Execute';
  }

  async confirmNetworkAccess(): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `⚠️ Allow network access in runtime?`,
      { modal: true },
      'Allow',
      'Deny'
    );
    return result === 'Allow';
  }

  async confirmAgentStep(step: string): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
      `Agent wants to: ${step}`,
      { modal: true },
      'Approve',
      'Skip',
      'Cancel'
    );
    return result === 'Approve';
  }
}
