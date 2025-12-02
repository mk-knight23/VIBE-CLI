// Runtime Sandbox for Code Execution
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SandboxOptions {
  allowNetwork?: boolean;
  timeout?: number;
  memoryLimit?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export class RuntimeSandbox {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'vibe-sandbox');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async executeJS(code: string, options: SandboxOptions = {}): Promise<SandboxResult> {
    const tempFile = path.join(this.tempDir, `exec-${Date.now()}.js`);
    fs.writeFileSync(tempFile, code);

    const startTime = Date.now();
    const result = await this.runCommand('node', [tempFile], options);
    
    fs.unlinkSync(tempFile);
    
    return {
      ...result,
      executionTime: Date.now() - startTime
    };
  }

  async executePython(code: string, options: SandboxOptions = {}): Promise<SandboxResult> {
    const tempFile = path.join(this.tempDir, `exec-${Date.now()}.py`);
    fs.writeFileSync(tempFile, code);

    const startTime = Date.now();
    const result = await this.runCommand('python3', [tempFile], options);
    
    fs.unlinkSync(tempFile);
    
    return {
      ...result,
      executionTime: Date.now() - startTime
    };
  }

  async executeShell(command: string, options: SandboxOptions = {}): Promise<SandboxResult> {
    const startTime = Date.now();
    const result = await this.runCommand('sh', ['-c', command], options);
    
    return {
      ...result,
      executionTime: Date.now() - startTime
    };
  }

  private async runCommand(
    command: string,
    args: string[],
    options: SandboxOptions
  ): Promise<Omit<SandboxResult, 'executionTime'>> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000;
      const env = options.allowNetwork ? process.env : { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '' };

      const proc = spawn(command, args, {
        env,
        timeout,
        cwd: this.tempDir
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
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

      setTimeout(() => {
        proc.kill();
        reject(new Error('Execution timeout'));
      }, timeout);
    });
  }

  async *executeStream(code: string, language: 'js' | 'python'): AsyncGenerator<string> {
    const tempFile = path.join(this.tempDir, `exec-${Date.now()}.${language === 'js' ? 'js' : 'py'}`);
    fs.writeFileSync(tempFile, code);

    const command = language === 'js' ? 'node' : 'python3';
    const proc = spawn(command, [tempFile], { cwd: this.tempDir });

    for await (const chunk of proc.stdout) {
      yield chunk.toString();
    }

    for await (const chunk of proc.stderr) {
      yield `[ERROR] ${chunk.toString()}`;
    }

    fs.unlinkSync(tempFile);
  }
}
