import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { executeSandboxed, isSandboxEnabled } from './sandbox';
import { detectOS, isDestructiveCommand } from '../utils/os-detect';

const execAsync = promisify(exec);

interface ShellResult {
  command: string;
  directory: string;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode: number | null;
  signal?: string;
  backgroundPIDs?: number[];
  sandboxed?: boolean;
}

export async function runShellCommand(
  command: string,
  description?: string,
  directory?: string
): Promise<ShellResult> {
  // Safety check for destructive commands
  if (isDestructiveCommand(command)) {
    return {
      command,
      directory: directory || process.cwd(),
      stdout: '',
      stderr: 'Destructive command blocked for safety',
      error: 'This command is potentially destructive and requires manual confirmation',
      exitCode: 1
    };
  }
  
  const osType = detectOS();
  const cwd = directory ? path.resolve(process.cwd(), directory) : process.cwd();
  const sandboxed = isSandboxEnabled();
  
  const result: ShellResult = {
    command,
    directory: cwd,
    stdout: '',
    stderr: '',
    exitCode: null,
    backgroundPIDs: [],
    sandboxed
  };

  try {
    // Check for background process
    if (command.includes(' &')) {
      if (sandboxed) {
        result.error = 'Background processes not supported in sandbox mode';
        result.exitCode = 1;
        return result;
      }

      const cleanCmd = command.replace(/\s*&\s*$/, '');
      const child = spawn(cleanCmd, [], {
        cwd,
        shell: true,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, VIBE_CLI: '1' }
      });
      
      child.unref();
      result.backgroundPIDs = [child.pid || 0];
      result.stdout = `Background process started with PID: ${child.pid}`;
      result.exitCode = 0;
    } else {
      if (sandboxed) {
        const { stdout, stderr } = await executeSandboxed(command, cwd);
        result.stdout = stdout;
        result.stderr = stderr;
        result.exitCode = 0;
      } else {
        const { stdout, stderr } = await execAsync(command, {
          cwd,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, VIBE_CLI: '1' }
        });
        
        result.stdout = stdout;
        result.stderr = stderr;
        result.exitCode = 0;
      }
    }
  } catch (err: any) {
    result.error = err.message;
    result.exitCode = err.code || 1;
    result.stderr = err.stderr || '';
    result.stdout = err.stdout || '';
  }

  return result;
}

export function validateCommand(command: string, coreCommands: string[] = [], excludeCommands: string[] = []): boolean {
  const parts = command.split(/&&|\|\||;/).map(p => p.trim());
  
  for (const part of parts) {
    const cmd = part.split(' ')[0];
    
    // Check exclude list first
    if (excludeCommands.some(exc => cmd.startsWith(exc))) return false;
    
    // If core list exists and doesn't include wildcard, check it
    if (coreCommands.length > 0 && !coreCommands.includes('run_shell_command')) {
      if (!coreCommands.some(core => cmd.startsWith(core.replace('run_shell_command(', '').replace(')', '')))) {
        return false;
      }
    }
  }
  
  return true;
}
