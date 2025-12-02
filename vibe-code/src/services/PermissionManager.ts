// Permission and Safety Manager
import * as vscode from 'vscode';

export interface PermissionRequest {
  type: 'file-write' | 'file-delete' | 'shell-command' | 'network-access';
  description: string;
  details: string;
}

export class PermissionManager {
  private autoApprove: boolean = false;

  constructor(autoApprove: boolean = false) {
    this.autoApprove = autoApprove;
  }

  async requestPermission(request: PermissionRequest): Promise<boolean> {
    if (this.autoApprove) {
      return true;
    }

    const icon = this.getIcon(request.type);
    const message = `${icon} ${request.description}`;
    
    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true, detail: request.details },
      'Allow',
      'Deny'
    );

    return choice === 'Allow';
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'file-write': return '⚠️ Write File';
      case 'file-delete': return '🗑️ Delete File';
      case 'shell-command': return '💻 Run Command';
      case 'network-access': return '🌐 Network Access';
      default: return '⚠️';
    }
  }

  setAutoApprove(value: boolean): void {
    this.autoApprove = value;
  }
}
