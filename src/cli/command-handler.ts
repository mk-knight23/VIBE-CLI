import chalk from 'chalk';
import { IPrimitive } from '../primitives/types';
import { stackScaffolder } from '../features/scaffolding/stack-scaffolder';
import { errorAnalyzer } from '../features/debugging/error-analyzer';
import { projectVisualizer } from '../features/visualization/project-visualizer';
import { checkpointManager } from '../core/checkpoint-system/checkpoint-manager';
import { vibeSentiment } from '../features/terminal/vibe-sentiment';
import { logger } from '../utils/structured-logger';

export class CommandHandler {
    private primitiveMap: Map<string, IPrimitive>;

    constructor(primitiveMap: Map<string, IPrimitive>) {
        this.primitiveMap = primitiveMap;
    }

    /**
     * Handle a slash command
     */
    async handle(input: string): Promise<boolean> {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) return false;

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case '/help':
                this.showHelp();
                return true;
            case '/scaffold':
                await this.handleScaffold(args);
                return true;
            case '/debug':
                await this.handleDebug(args);
                return true;
            case '/fix':
                await this.handleFix(args);
                return true;
            case '/test':
                await this.handleTest(args);
                return true;
            case '/docs':
                await this.handleDocs(args);
                return true;
            case '/viz':
                await this.handleViz(args);
                return true;
            case '/mood':
                await this.handleMood(args);
                return true;
            case '/undo':
                await this.handleUndo(args);
                return true;
            case '/config':
                this.handleConfig(args);
                return true;
            default:
                console.log(chalk.red(`Unknown command: ${command}. Type /help for a list of commands.`));
                return true;
        }
    }

    private showHelp() {
        console.log(chalk.bold('\nAvailable Commands:'));
        console.log(chalk.cyan('  /scaffold <desc> ') + '- AI-driven project scaffolding');
        console.log(chalk.cyan('  /debug <path>    ') + '- Deep AI error analysis & diagnosis');
        console.log(chalk.cyan('  /fix <error>     ') + '- Autonomous bug fixing & remediation');
        console.log(chalk.cyan('  /test <file>     ') + '- Intelligent unit test & mock generation');
        console.log(chalk.cyan('  /docs <file>     ') + '- Explain code and generate documentation');
        console.log(chalk.cyan('  /viz <dir>       ') + '- Interactive architecture visualization');
        console.log(chalk.cyan('  /mood            ') + '- Scan project health and developer "vibe"');
        console.log(chalk.cyan('  /undo            ') + '- Revert the last major operation');
        console.log(chalk.cyan('  /config          ') + '- Manage configuration');
        console.log(chalk.cyan('  /help            ') + '- Show this help message');
        console.log(chalk.cyan('  exit/quit        ') + '- Exit interactive mode\n');
    }

    private async handleScaffold(args: string[]) {
        if (args.length === 0) {
            console.log(chalk.yellow('Usage: /scaffold <description of the project>'));
            return;
        }
        const description = args.join(' ');
        console.log(chalk.blue(`🏗️  Scaffolding project: "${description}"...`));
        
        try {
            const completion = this.primitiveMap.get('completion');
            if (!completion) throw new Error('Completion primitive not found');
            
            // For now, use the generateCustom with a mock-like provider that uses our completion primitive
            const mockProvider = {
                chat: async (messages: any[]) => {
                    const prompt = messages.map(m => m.content).join('\n');
                    const result = await completion.execute({ prompt });
                    return { content: result.data.text };
                }
            };
            
            await stackScaffolder.generateCustom({
                projectName: 'new-vibe-project',
                projectType: 'fullstack',
                database: 'sqlite',
                auth: 'none',
                description
            }, mockProvider);
        } catch (error: any) {
            console.log(chalk.red(`Scaffolding failed: ${error.message}`));
        }
    }

    private async handleDebug(args: string[]) {
        const target = args.join(' ') || process.cwd();
        console.log(chalk.blue(`🔍 Analyzing: ${target}...`));
        
        try {
            const result = errorAnalyzer.analyzeSourceFile(target);
            if (result.length === 0) {
                console.log(chalk.green('✅ No obvious issues found in source analysis.'));
            } else {
                result.forEach(err => console.log(errorAnalyzer.formatError(err)));
            }
        } catch (error: any) {
            console.log(chalk.red(`Analysis failed: ${error.message}`));
        }
    }

    private async handleFix(args: string[]) {
        const issue = args.join(' ');
        if (!issue) {
            console.log(chalk.yellow('Usage: /fix <error message or description>'));
            return;
        }
        console.log(chalk.blue(`🛠️  Attempting to fix: "${issue}"...`));
        
        // Use planner to fix the issue
        const planner = this.primitiveMap.get('planning');
        if (planner) {
            const result = await planner.execute({ task: `Fix this issue: ${issue}` });
            if (result.success) {
                console.log(chalk.green('Plan generated for fix. Use natural language to proceed with execution.'));
                // Note: in a real implementation, we might want to auto-execute here or pass back to interactive
            }
        }
    }

    private async handleTest(args: string[]) {
        const file = args.join(' ');
        if (!file) {
            console.log(chalk.yellow('Usage: /test <file path>'));
            return;
        }
        console.log(chalk.blue(`🧪 Generating tests for: ${file}...`));
        // Logic to generate tests using LLM
        const completion = this.primitiveMap.get('completion');
        if (completion) {
            const result = await completion.execute({ 
                prompt: `Generate unit tests for this file: ${file}. Use Vitest.` 
            });
            if (result.success) {
                console.log(chalk.green('Tests generated.'));
            }
        }
    }

    private async handleDocs(args: string[]) {
        const file = args.join(' ');
        if (!file) {
            console.log(chalk.yellow('Usage: /docs <file path>'));
            return;
        }
        console.log(chalk.blue(`📚 Generating documentation for: ${file}...`));
        const completion = this.primitiveMap.get('completion');
        if (completion) {
            const result = await completion.execute({ 
                prompt: `Explain the code in ${file} and generate markdown documentation.` 
            });
            if (result.success) {
                console.log(chalk.white(result.data.text));
            }
        }
    }

    private async handleViz(args: string[]) {
        const dir = args.join(' ') || process.cwd();
        console.log(chalk.blue(`📊 Visualizing: ${dir}...`));
        const result = projectVisualizer.visualizeProject(dir, 'ascii');
        console.log(result.content);
    }

    private async handleMood(args: string[]) {
        console.log(vibeSentiment.analyze(process.cwd()));
    }

    private async handleUndo(args: string[]) {
        console.log(chalk.blue('🔙 Undoing last operation...'));
        const checkpoints = checkpointManager.listCheckpoints({ limit: 1 });
        if (checkpoints.length > 0) {
            const last = checkpoints[0];
            const result = await checkpointManager.rollback(last.id);
            if (result.success) {
                console.log(chalk.green(`✅ Successfully rolled back to checkpoint: ${last.name}`));
            } else {
                console.log(chalk.red(`❌ Rollback failed: ${result.error}`));
            }
        } else {
            console.log(chalk.yellow('No checkpoints found to undo.'));
        }
    }

    private handleConfig(args: string[]) {
        console.log(chalk.white('Current configuration options:'));
        console.log(chalk.gray('  - provider: anthropic, openai, minimax, google, ollama'));
        console.log(chalk.gray('  - theme: vibe, minimal, neon'));
        console.log(chalk.blue('\nUse "/config set <key> <value>" to change settings. (Coming soon)'));
    }
}
