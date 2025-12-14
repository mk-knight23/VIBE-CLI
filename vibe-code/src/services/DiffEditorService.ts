import * as vscode from 'vscode';
import * as path from 'path';

export interface DiffContent {
  original: string;
  modified: string;
  filePath: string;
  description?: string;
}

export interface DiffResult {
  accepted: boolean;
  applied: boolean;
  error?: string;
}

export class DiffEditorService {
  private static instance: DiffEditorService;

  public static getInstance(): DiffEditorService {
    if (!DiffEditorService.instance) {
      DiffEditorService.instance = new DiffEditorService();
    }
    return DiffEditorService.instance;
  }

  /**
   * Show a diff preview before applying changes
   */
  async showDiffPreview(diffContent: DiffContent): Promise<DiffResult> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      // Create temporary files for the diff
      const originalUri = vscode.Uri.parse(`untitled:${diffContent.filePath}.original`);
      const modifiedUri = vscode.Uri.parse(`untitled:${diffContent.filePath}.modified`);

      // Create the diff editor
      const diffEditor = await vscode.commands.executeCommand(
        'vscode.diff',
        originalUri,
        modifiedUri,
        `Preview Changes: ${path.basename(diffContent.filePath)}`,
        {
          preview: true,
          preserveFocus: false
        }
      );

      // Show confirmation dialog
      const result = await this.showApplyConfirmation(diffContent);

      if (result.accepted) {
        // Apply the changes
        const applied = await this.applyDiff(diffContent);
        return {
          accepted: true,
          applied,
          error: applied ? undefined : 'Failed to apply changes'
        };
      }

      return { accepted: false, applied: false };
    } catch (error) {
      return {
        accepted: false,
        applied: false,
        error: `Diff preview failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Show inline diff for a specific range
   */
  async showInlineDiff(filePath: string, range: vscode.Range, originalText: string, newText: string): Promise<DiffResult> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);

      // Open the file
      const document = await vscode.workspace.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document);

      // Create a decoration to highlight the changed area
      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
        border: '1px solid',
        borderColor: new vscode.ThemeColor('diffEditor.insertedTextBorder')
      });

      editor.setDecorations(decorationType, [{
        range,
        hoverMessage: `Original: ${originalText}\nNew: ${newText}`
      }]);

      // Show confirmation
      const result = await vscode.window.showInformationMessage(
        `Apply change to ${path.basename(filePath)}?`,
        { modal: true },
        'Apply',
        'Cancel'
      );

      // Clean up decoration
      decorationType.dispose();

      if (result === 'Apply') {
        const applied = await this.applyInlineDiff(editor, range, newText);
        return {
          accepted: true,
          applied,
          error: applied ? undefined : 'Failed to apply inline changes'
        };
      }

      return { accepted: false, applied: false };
    } catch (error) {
      return {
        accepted: false,
        applied: false,
        error: `Inline diff failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Show diff between two file versions
   */
  async showFileComparison(leftFile: string, rightFile: string, title?: string): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const leftUri = vscode.Uri.joinPath(workspaceFolder.uri, leftFile);
      const rightUri = vscode.Uri.joinPath(workspaceFolder.uri, rightFile);

      await vscode.commands.executeCommand(
        'vscode.diff',
        leftUri,
        rightUri,
        title || `Compare: ${path.basename(leftFile)} ↔ ${path.basename(rightFile)}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`File comparison failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a diff from search and replace operations
   */
  createDiffFromSearchReplace(
    filePath: string,
    searchText: string,
    replaceText: string,
    startLine?: number
  ): DiffContent {
    return {
      filePath,
      original: searchText,
      modified: replaceText,
      description: `Replace "${searchText.substring(0, 50)}${searchText.length > 50 ? '...' : ''}" with "${replaceText.substring(0, 50)}${replaceText.length > 50 ? '...' : ''}"`
    };
  }

  /**
   * Create a diff from unified diff format
   */
  createDiffFromUnifiedFormat(filePath: string, unifiedDiff: string): DiffContent | null {
    try {
      // Parse unified diff format
      const lines = unifiedDiff.split('\n');
      let originalLines: string[] = [];
      let modifiedLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith(' ')) {
          // Context line
          originalLines.push(line.substring(1));
          modifiedLines.push(line.substring(1));
        } else if (line.startsWith('-')) {
          // Removed line
          originalLines.push(line.substring(1));
        } else if (line.startsWith('+')) {
          // Added line
          modifiedLines.push(line.substring(1));
        }
      }

      return {
        filePath,
        original: originalLines.join('\n'),
        modified: modifiedLines.join('\n'),
        description: `Apply unified diff to ${path.basename(filePath)}`
      };
    } catch (error) {
      console.error('Failed to parse unified diff:', error);
      return null;
    }
  }

  /**
   * Show confirmation dialog for applying changes
   */
  private async showApplyConfirmation(diffContent: DiffContent): Promise<{ accepted: boolean }> {
    const fileName = path.basename(diffContent.filePath);
    const message = `Apply changes to ${fileName}?`;

    const detail = diffContent.description ||
      `This will modify the file ${fileName} with the shown changes.`;

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true, detail },
      'Apply Changes',
      'Cancel'
    );

    return { accepted: result === 'Apply Changes' };
  }

  /**
   * Apply the diff changes to the actual file
   */
  private async applyDiff(diffContent: DiffContent): Promise<boolean> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, diffContent.filePath);

      // Read current file content
      let currentContent: string;
      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        currentContent = document.getText();
      } catch {
        // File doesn't exist, use empty content
        currentContent = '';
      }

      // Apply the diff
      const newContent = this.applyDiffToContent(currentContent, diffContent);

      // Write the new content
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf-8'));

      // Refresh the file explorer
      vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');

      return true;
    } catch (error) {
      console.error('Failed to apply diff:', error);
      return false;
    }
  }

  /**
   * Apply inline diff to editor
   */
  private async applyInlineDiff(editor: vscode.TextEditor, range: vscode.Range, newText: string): Promise<boolean> {
    try {
      await editor.edit(editBuilder => {
        editBuilder.replace(range, newText);
      });
      return true;
    } catch (error) {
      console.error('Failed to apply inline diff:', error);
      return false;
    }
  }

  /**
   * Apply diff content to existing file content
   */
  private applyDiffToContent(currentContent: string, diffContent: DiffContent): string {
    // Simple implementation - replace entire content
    // In a more sophisticated implementation, this would handle
    // partial replacements, line-based diffs, etc.
    return diffContent.modified;
  }

  /**
   * Show diff for multiple files
   */
  async showMultiFileDiff(diffs: DiffContent[]): Promise<{ accepted: boolean; applied: number }> {
    let applied = 0;
    let accepted = true;

    for (const diff of diffs) {
      const result = await this.showDiffPreview(diff);
      if (result.accepted && result.applied) {
        applied++;
      } else if (!result.accepted) {
        accepted = false;
        break; // User cancelled
      }
    }

    return { accepted, applied };
  }

  /**
   * Create diff from git diff output
   */
  createDiffFromGitDiff(filePath: string, gitDiff: string): DiffContent | null {
    try {
      // Parse git diff format
      const lines = gitDiff.split('\n');
      const hunks: string[] = [];
      let currentHunk = '';

      for (const line of lines) {
        if (line.startsWith('@@')) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          currentHunk = line + '\n';
        } else {
          currentHunk += line + '\n';
        }
      }

      if (currentHunk) {
        hunks.push(currentHunk);
      }

      // For simplicity, combine all hunks
      const diffContent = hunks.join('');

      return {
        filePath,
        original: '', // Would need more parsing to extract original
        modified: '', // Would need more parsing to extract modified
        description: `Git diff for ${path.basename(filePath)}`
      };
    } catch (error) {
      console.error('Failed to parse git diff:', error);
      return null;
    }
  }

  /**
   * Show diff with syntax highlighting
   */
  async showSyntaxHighlightedDiff(diffContent: DiffContent): Promise<DiffResult> {
    // Create a webview panel for syntax-highlighted diff
    const panel = vscode.window.createWebviewPanel(
      'vibeDiffPreview',
      `Diff Preview: ${path.basename(diffContent.filePath)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: []
      }
    );

    // Generate HTML with syntax highlighting
    const html = this.generateDiffHtml(diffContent);
    panel.webview.html = html;

    // Handle messages from the webview
    return new Promise((resolve) => {
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'apply') {
          const result = await this.applyDiff(diffContent);
          panel.dispose();
          resolve({
            accepted: true,
            applied: result,
            error: result ? undefined : 'Failed to apply changes'
          });
        } else if (message.type === 'cancel') {
          panel.dispose();
          resolve({ accepted: false, applied: false });
        }
      });
    });
  }

  /**
   * Generate HTML for syntax-highlighted diff
   */
  private generateDiffHtml(diffContent: DiffContent): string {
    // Simple diff HTML generation
    // In a real implementation, you'd use a library like diff2html
    const originalLines = diffContent.original.split('\n');
    const modifiedLines = diffContent.modified.split('\n');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diff Preview</title>
        <style>
          body { font-family: monospace; margin: 20px; }
          .diff-header { background: #f0f0f0; padding: 10px; margin-bottom: 10px; }
          .diff-content { border: 1px solid #ccc; }
          .line { padding: 2px 5px; white-space: pre; }
          .added { background: #e6ffed; color: #22863a; }
          .removed { background: #ffeef0; color: #cb2431; }
          .buttons { margin-top: 20px; }
          button { padding: 10px 20px; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="diff-header">
          <h3>${diffContent.filePath}</h3>
          <p>${diffContent.description || 'Preview of changes'}</p>
        </div>
        <div class="diff-content">
    `;

    // Simple line-by-line diff (very basic implementation)
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] || '';
      const mod = modifiedLines[i] || '';

      if (orig !== mod) {
        if (orig && !mod) {
          html += `<div class="line removed">-${orig}</div>`;
        } else if (!orig && mod) {
          html += `<div class="line added">+${mod}</div>`;
        } else {
          html += `<div class="line removed">-${orig}</div>`;
          html += `<div class="line added">+${mod}</div>`;
        }
      } else if (orig) {
        html += `<div class="line"> ${orig}</div>`;
      }
    }

    html += `
        </div>
        <div class="buttons">
          <button onclick="applyChanges()">Apply Changes</button>
          <button onclick="cancel()">Cancel</button>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          function applyChanges() {
            vscode.postMessage({ type: 'apply' });
          }
          function cancel() {
            vscode.postMessage({ type: 'cancel' });
          }
        </script>
      </body>
      </html>
    `;

    return html;
  }
}
