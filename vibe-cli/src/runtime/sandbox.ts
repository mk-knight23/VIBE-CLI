// Sandbox Execution Engine
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface SandboxConfig {
  timeout: number;
  memory: number; // MB
  network: boolean;
  filesystem: boolean;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

export class SandboxEngine {
  private defaultConfig: SandboxConfig = {
    timeout: 5000,
    memory: 128,
    network: false,
    filesystem: false
  };

  async execute(code: string, language: string, config?: Partial<SandboxConfig>): Promise<SandboxResult> {
    const cfg = { ...this.defaultConfig, ...config };
    const start = Date.now();

    try {
      const tempFile = await this.createTempFile(code, language);
      const command = this.buildCommand(tempFile, language, cfg);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: cfg.timeout,
        maxBuffer: cfg.memory * 1024 * 1024
      });

      await unlink(tempFile);

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        duration: Date.now() - start
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: error.code || 1,
        duration: Date.now() - start,
        error: error.message
      };
    }
  }

  private async createTempFile(code: string, language: string): Promise<string> {
    const ext = this.getExtension(language);
    const filename = `sandbox-${Date.now()}.${ext}`;
    const filepath = join('/tmp', filename);
    await writeFile(filepath, code, 'utf-8');
    return filepath;
  }

  private buildCommand(file: string, language: string, config: SandboxConfig): string {
    const commands: Record<string, string> = {
      javascript: `node ${file}`,
      typescript: `ts-node ${file}`,
      python: `python3 ${file}`,
      bash: `bash ${file}`,
      shell: `sh ${file}`
    };

    let cmd = commands[language] || `node ${file}`;

    // Add resource limits (Unix-like systems)
    if (process.platform !== 'win32') {
      cmd = `ulimit -t ${Math.ceil(config.timeout / 1000)} && ${cmd}`;
    }

    return cmd;
  }

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      bash: 'sh',
      shell: 'sh'
    };
    return extensions[language] || 'txt';
  }
}
