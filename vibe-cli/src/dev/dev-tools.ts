// Development Tools Suite
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export class DevTools {
  async lint(path: string = '.', fix: boolean = false): Promise<string> {
    const linters = [
      { cmd: 'eslint', args: fix ? '--fix' : '', files: ['*.js', '*.ts', '*.jsx', '*.tsx'] },
      { cmd: 'pylint', args: '', files: ['*.py'] },
      { cmd: 'rubocop', args: fix ? '-a' : '', files: ['*.rb'] }
    ];

    for (const linter of linters) {
      if (await this.hasCommand(linter.cmd)) {
        try {
          const { stdout } = await execAsync(`${linter.cmd} ${linter.args} ${path}`);
          return stdout;
        } catch (err: any) {
          return err.stdout || err.message;
        }
      }
    }

    return 'No linter found. Install ESLint, Pylint, or Rubocop.';
  }

  async format(path: string = '.', check: boolean = false): Promise<string> {
    const formatters = [
      { cmd: 'prettier', args: check ? '--check' : '--write', files: ['*.js', '*.ts', '*.json', '*.md'] },
      { cmd: 'black', args: check ? '--check' : '', files: ['*.py'] },
      { cmd: 'rustfmt', args: check ? '--check' : '', files: ['*.rs'] }
    ];

    for (const formatter of formatters) {
      if (await this.hasCommand(formatter.cmd)) {
        try {
          const { stdout } = await execAsync(`${formatter.cmd} ${formatter.args} ${path}`);
          return stdout || 'Formatting complete';
        } catch (err: any) {
          return err.stdout || err.message;
        }
      }
    }

    return 'No formatter found. Install Prettier, Black, or Rustfmt.';
  }

  async test(pattern: string = '', watch: boolean = false, coverage: boolean = false): Promise<string> {
    const testRunners = [
      { cmd: 'jest', args: `${watch ? '--watch' : ''} ${coverage ? '--coverage' : ''} ${pattern}` },
      { cmd: 'vitest', args: `${watch ? '--watch' : ''} ${coverage ? '--coverage' : ''} ${pattern}` },
      { cmd: 'pytest', args: `${coverage ? '--cov' : ''} ${pattern}` },
      { cmd: 'cargo', args: `test ${pattern}` }
    ];

    for (const runner of testRunners) {
      if (await this.hasCommand(runner.cmd)) {
        try {
          const { stdout, stderr } = await execAsync(`${runner.cmd} ${runner.args}`, {
            timeout: 60000
          });
          return stdout + stderr;
        } catch (err: any) {
          return err.stdout || err.message;
        }
      }
    }

    return 'No test runner found. Install Jest, Vitest, Pytest, or Cargo.';
  }

  async build(target: string = '', production: boolean = false): Promise<string> {
    const builders = [
      { cmd: 'npm', args: `run build ${production ? '-- --mode production' : ''}` },
      { cmd: 'yarn', args: `build ${production ? '--mode production' : ''}` },
      { cmd: 'pnpm', args: `build ${production ? '--mode production' : ''}` },
      { cmd: 'cargo', args: `build ${production ? '--release' : ''}` },
      { cmd: 'go', args: `build ${target}` }
    ];

    for (const builder of builders) {
      if (await this.hasCommand(builder.cmd)) {
        try {
          const { stdout, stderr } = await execAsync(`${builder.cmd} ${builder.args}`, {
            timeout: 300000 // 5 minutes
          });
          return stdout + stderr || 'Build complete';
        } catch (err: any) {
          return err.stdout || err.message;
        }
      }
    }

    return 'No build tool found.';
  }

  async serve(port: number = 3000, open: boolean = false): Promise<void> {
    const servers = [
      { cmd: 'npm', args: `run dev -- --port ${port} ${open ? '--open' : ''}` },
      { cmd: 'yarn', args: `dev --port ${port} ${open ? '--open' : ''}` },
      { cmd: 'python3', args: `-m http.server ${port}` }
    ];

    for (const server of servers) {
      if (await this.hasCommand(server.cmd)) {
        console.log(`Starting dev server on port ${port}...`);
        exec(`${server.cmd} ${server.args}`);
        return;
      }
    }

    console.log('No dev server found.');
  }

  private async hasCommand(cmd: string): Promise<boolean> {
    try {
      await execAsync(`which ${cmd}`);
      return true;
    } catch {
      return false;
    }
  }

  async detectProjectType(): Promise<string> {
    if (existsSync('package.json')) return 'node';
    if (existsSync('requirements.txt') || existsSync('setup.py')) return 'python';
    if (existsSync('Cargo.toml')) return 'rust';
    if (existsSync('go.mod')) return 'go';
    if (existsSync('Gemfile')) return 'ruby';
    return 'unknown';
  }
}
