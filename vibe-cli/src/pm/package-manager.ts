// Package Manager Integration
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, existsSync } from 'fs';

const execAsync = promisify(exec);
const readFileAsync = promisify(readFile);

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo' | 'go';

export class PackageManagerService {
  async detectPackageManager(): Promise<PackageManager> {
    if (existsSync('package-lock.json')) return 'npm';
    if (existsSync('yarn.lock')) return 'yarn';
    if (existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (existsSync('requirements.txt')) return 'pip';
    if (existsSync('Cargo.toml')) return 'cargo';
    if (existsSync('go.mod')) return 'go';
    return 'npm';
  }

  async install(packages: string[], dev: boolean = false, global: boolean = false): Promise<string> {
    const pm = await this.detectPackageManager();
    const commands: Record<PackageManager, string> = {
      npm: `npm install ${global ? '-g' : ''} ${dev ? '--save-dev' : ''} ${packages.join(' ')}`,
      yarn: `yarn add ${global ? 'global' : ''} ${dev ? '--dev' : ''} ${packages.join(' ')}`,
      pnpm: `pnpm add ${global ? '-g' : ''} ${dev ? '-D' : ''} ${packages.join(' ')}`,
      pip: `pip install ${global ? '' : '--user'} ${packages.join(' ')}`,
      cargo: `cargo add ${packages.join(' ')}`,
      go: `go get ${packages.join(' ')}`
    };

    try {
      const { stdout, stderr } = await execAsync(commands[pm], { timeout: 120000 });
      return stdout + stderr;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async update(packages: string[] = []): Promise<string> {
    const pm = await this.detectPackageManager();
    const pkgs = packages.length ? packages.join(' ') : '';
    
    const commands: Record<PackageManager, string> = {
      npm: `npm update ${pkgs}`,
      yarn: `yarn upgrade ${pkgs}`,
      pnpm: `pnpm update ${pkgs}`,
      pip: `pip install --upgrade ${pkgs || 'pip'}`,
      cargo: `cargo update ${pkgs}`,
      go: `go get -u ${pkgs || './...'}`
    };

    try {
      const { stdout, stderr } = await execAsync(commands[pm], { timeout: 120000 });
      return stdout + stderr;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async remove(packages: string[]): Promise<string> {
    const pm = await this.detectPackageManager();
    
    const commands: Record<PackageManager, string> = {
      npm: `npm uninstall ${packages.join(' ')}`,
      yarn: `yarn remove ${packages.join(' ')}`,
      pnpm: `pnpm remove ${packages.join(' ')}`,
      pip: `pip uninstall -y ${packages.join(' ')}`,
      cargo: `cargo rm ${packages.join(' ')}`,
      go: `go mod edit -droprequire ${packages.join(' ')}`
    };

    try {
      const { stdout, stderr } = await execAsync(commands[pm]);
      return stdout + stderr;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async audit(fix: boolean = false): Promise<string> {
    const pm = await this.detectPackageManager();
    
    const commands: Record<PackageManager, string> = {
      npm: `npm audit ${fix ? 'fix' : ''}`,
      yarn: `yarn audit ${fix ? '--fix' : ''}`,
      pnpm: `pnpm audit ${fix ? '--fix' : ''}`,
      pip: `pip check`,
      cargo: `cargo audit`,
      go: `go list -m all`
    };

    try {
      const { stdout, stderr } = await execAsync(commands[pm]);
      return stdout + stderr;
    } catch (err: any) {
      return err.stdout || err.message;
    }
  }

  async outdated(): Promise<string> {
    const pm = await this.detectPackageManager();
    
    const commands: Record<PackageManager, string> = {
      npm: 'npm outdated',
      yarn: 'yarn outdated',
      pnpm: 'pnpm outdated',
      pip: 'pip list --outdated',
      cargo: 'cargo outdated',
      go: 'go list -u -m all'
    };

    try {
      const { stdout, stderr } = await execAsync(commands[pm]);
      return stdout + stderr;
    } catch (err: any) {
      return err.stdout || err.message;
    }
  }

  async listInstalled(): Promise<string[]> {
    const pm = await this.detectPackageManager();
    
    try {
      if (pm === 'npm' || pm === 'yarn' || pm === 'pnpm') {
        const pkg = JSON.parse(await readFileAsync('package.json', 'utf-8'));
        return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      }
      
      if (pm === 'pip') {
        const { stdout } = await execAsync('pip list --format=json');
        return JSON.parse(stdout).map((p: any) => p.name);
      }

      if (pm === 'cargo') {
        const { stdout } = await execAsync('cargo tree --depth 1');
        return stdout.split('\n').filter(l => l.trim());
      }

      return [];
    } catch {
      return [];
    }
  }
}
