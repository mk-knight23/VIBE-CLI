/**
 * VIBE CLI - Doctor / Diagnostics System
 * 
 * Performs environment health checks and suggests fixes.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import chalk from 'chalk';

export interface DiagnosticResult {
    id: string;
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    fix?: string;
}

export class VibeDoctor {
    /**
     * Run full diagnostics
     */
    async runDiagnostics(): Promise<DiagnosticResult[]> {
        const results: DiagnosticResult[] = [];

        // 1. Node.js Version Check
        results.push(this.checkNodeVersion());

        // 2. Git Environment Check
        results.push(this.checkGitRepo());

        // 3. Memory & Cache Check
        results.push(this.checkMemoryPersistence());

        // 4. Provider Configuration Check
        results.push(await this.checkProviderConfig());

        return results;
    }

    private checkNodeVersion(): DiagnosticResult {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0], 10);

        if (major < 18) {
            return {
                id: 'node_version',
                name: 'Node.js Version',
                status: 'error',
                message: `Node.js ${version} is too old. VIBE requires v18+.`,
                fix: 'Install Node.js v18 or newer from nodejs.org',
            };
        }

        return {
            id: 'node_version',
            name: 'Node.js Version',
            status: 'ok',
            message: `v${version} (Compatible)`,
        };
    }

    private checkGitRepo(): DiagnosticResult {
        try {
            child_process.execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
            return {
                id: 'git_repo',
                name: 'Git Repository',
                status: 'ok',
                message: 'Active git repository detected.',
            };
        } catch {
            return {
                id: 'git_repo',
                name: 'Git Repository',
                status: 'warning',
                message: 'Not inside a git repository. Some agents may have limited context.',
                fix: 'Run "git init" to enable full version control features.',
            };
        }
    }

    private checkMemoryPersistence(): DiagnosticResult {
        const memoryDir = path.join(process.cwd(), '.vibe');
        if (fs.existsSync(memoryDir)) {
            return {
                id: 'memory_persistence',
                name: 'Persistence Layer',
                status: 'ok',
                message: 'Local state directory (.vibe) exists.',
            };
        }
        return {
            id: 'memory_persistence',
            name: 'Persistence Layer',
            status: 'warning',
            message: 'Local .vibe directory not found.',
            fix: 'VIBE will create this automatically upon first execution.',
        };
    }

    private async checkProviderConfig(): Promise<DiagnosticResult> {
        const configPath = path.join(process.env.HOME || '', '.vibe', 'config.json');
        if (!fs.existsSync(configPath)) {
            return {
                id: 'provider_config',
                name: 'Provider Configuration',
                status: 'error',
                message: 'No global configuration found.',
                fix: 'Run "/config" to set up your AI provider.',
            };
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (!config.provider || !config.model) {
                return {
                    id: 'provider_config',
                    name: 'Provider Configuration',
                    status: 'warning',
                    message: 'Provider or model not fully set.',
                    fix: 'Run "/config" to complete setup.',
                };
            }
            return {
                id: 'provider_config',
                name: 'Provider Configuration',
                status: 'ok',
                message: `Using ${config.provider} with model ${config.model}.`,
            };
        } catch {
            return {
                id: 'provider_config',
                name: 'Provider Configuration',
                status: 'error',
                message: 'Configuration file is corrupted.',
                fix: 'Delete ~/.vibe/config.json and run "/config" again.',
            };
        }
    }

    /**
     * Display report in terminal
     */
    displayReport(results: DiagnosticResult[]): void {
        console.log(chalk.cyan('\n🩺 VIBE Doctor - Health Report\n'));

        for (const res of results) {
            const icon = res.status === 'ok' ? chalk.green('✓') : res.status === 'warning' ? chalk.yellow('⚠') : chalk.red('✗');
            console.log(`${icon} ${chalk.bold(res.name.padEnd(25))} ${res.message}`);
            if (res.fix) {
                console.log(chalk.gray(`  └─ Recommended fix: ${res.fix}`));
            }
        }

        const errors = results.filter(r => r.status === 'error').length;
        const warnings = results.filter(r => r.status === 'warning').length;

        if (errors === 0 && warnings === 0) {
            console.log(chalk.green('\n✨ Everything looks great! Happy coding!\n'));
        } else {
            console.log(`\nFound ${chalk.red(errors + ' errors')} and ${chalk.yellow(warnings + ' warnings')}.\n`);
        }
    }
}

export const vibeDoctor = new VibeDoctor();
