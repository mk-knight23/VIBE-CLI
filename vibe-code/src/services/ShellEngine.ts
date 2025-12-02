// Shell Command Execution Engine
import { spawn } from 'child_process';
import * as vscode from 'vscode';

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ShellEngine {
  private cwd: string;
  private outputChannel: vscode.OutputChannel;

  constructor(workspaceRoot: string) {
    this.cwd = workspaceRoot;
    this.outputChannel = vscode.window.createOutputChannel('Vibe Shell');
  }

  async execute(command: string, streaming: boolean = false): Promise<ShellResult> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        cwd: this.cwd,
        shell: true,
        env: { ...process.env, PATH: process.env.PATH }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (streaming) {
          this.outputChannel.append(text);
        }
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (streaming) {
          this.outputChannel.append(text);
        }
      });

      proc.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  async *executeStream(command: string): AsyncGenerator<string> {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, {
      cwd: this.cwd,
      shell: true
    });

    for await (const chunk of proc.stdout) {
      yield chunk.toString();
    }

    for await (const chunk of proc.stderr) {
      yield `[ERROR] ${chunk.toString()}`;
    }
  }

  isDestructive(command: string): boolean {
    const destructivePatterns = [
      /rm\s+-rf/,
      /rm\s+.*\*/,
      /del\s+\/s/,
      /format/,
      /mkfs/,
      /dd\s+if=/
    ];

    return destructivePatterns.some(pattern => pattern.test(command));
  }

  show() {
    this.outputChannel.show();
  }
}
