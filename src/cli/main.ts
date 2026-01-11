import { Command } from 'commander';
import { VIBE_VERSION } from '../index';
import { logger } from '../utils/structured-logger';
import { PlanningPrimitive } from '../primitives/planning';
import { CompletionPrimitive } from '../primitives/completion';
import { ExecutionPrimitive } from '../primitives/execution';
import { MultiEditPrimitive } from '../primitives/multi-edit';
import { ApprovalPrimitive } from '../primitives/approval';
import { MemoryPrimitive } from '../primitives/memory';
import { DeterminismPrimitive } from '../primitives/determinism';
import { SearchPrimitive } from '../primitives/search';
import { OrchestrationPrimitive } from '../primitives/orchestration';
import { IPrimitive } from '../primitives/types';
import chalk from 'chalk';
import { runInteractive } from './interactive';

export async function run() {
    const program = new Command();

    program
        .name('vibe')
        .description('VIBE CLI - Your AI Development Teammate')
        .version(VIBE_VERSION);

    // Initialize Primitives
    const primitiveMap = new Map<string, IPrimitive>();
    primitiveMap.set('completion', new CompletionPrimitive());
    primitiveMap.set('planning', new PlanningPrimitive());
    primitiveMap.set('execution', new ExecutionPrimitive());
    primitiveMap.set('multi-edit', new MultiEditPrimitive());
    primitiveMap.set('approval', new ApprovalPrimitive());
    primitiveMap.set('memory', new MemoryPrimitive());
    primitiveMap.set('determinism', new DeterminismPrimitive());
    primitiveMap.set('search', new SearchPrimitive());

    const orchestrator = new OrchestrationPrimitive(primitiveMap);
    primitiveMap.set('orchestration', orchestrator);

    // Default Action: Interactive AI Engineer
    program
        .argument('[task...]', 'Task to perform')
        .action(async (taskArgs) => {
            const task = taskArgs.join(' ');
            if (!task) {
                await runInteractive(primitiveMap);
                return;
            }

            logger.info(`Processing task: "${task}"`);

            // 1. Planning
            console.log(chalk.blue('🧠 Devising a plan...'));
            const planner = primitiveMap.get('planning') as PlanningPrimitive;
            const planResult = await planner.execute({ task });

            if (!planResult.success) {
                logger.error(`Planning failed: ${planResult.error}`);
                return;
            }

            const plan = planResult.data;
            console.log(chalk.green('\n📍 Execution Plan:'));
            plan.forEach((s: any) => console.log(`  [${s.step}] ${chalk.bold(s.primitive.toUpperCase())}: ${s.task}`));

            // 2. Approval
            const approver = primitiveMap.get('approval') as ApprovalPrimitive;
            const approval = await approver.execute({ message: 'Proceed with this plan?' });

            if (!approval.success) {
                logger.warn('Plan aborted by user.');
                return;
            }

            // 3. Orchestration
            console.log(chalk.blue('\n🚀 Executing plan...'));
            const orchResult = await orchestrator.execute({ plan });

            if (orchResult.success) {
                console.log(chalk.green('\n✅ Task completed successfully!'));
            } else {
                logger.error(`Task execution failed: ${orchResult.error}`);
            }
        });

    // Specific Subcommands for power users
    program
        .command('plan')
        .description('Generate an execution plan for a task')
        .argument('<task>', 'Task description')
        .action(async (task) => {
            const planner = primitiveMap.get('planning') as PlanningPrimitive;
            const result = await planner.execute({ task });
            console.log(JSON.stringify(result.data, null, 2));
        });

    program
        .command('config')
        .description('Manage configuration')
        .action(() => {
            console.log('Configuration UI coming soon...');
            process.exit(0);
        });

    program
        .command('doctor')
        .description('Check system health and environment')
        .action(async () => {
            console.log(chalk.bold('\n🔍 VIBE Doctor - System Health Check\n'));

            // Check Environment
            const envs = ['MINIMAX_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
            for (const env of envs) {
                const val = process.env[env];
                if (val) {
                    console.log(`${chalk.green('✅')} ${env}: Configured (${val.substring(0, 4)}***)`);
                } else {
                    console.log(`${chalk.yellow('⚠️')} ${env}: Not found`);
                }
            }

            // Check Git
            try {
                const { execSync } = require('child_process');
                const gitVersion = execSync('git --version').toString().trim();
                console.log(`${chalk.green('✅')} Git: ${gitVersion}`);
            } catch (e) {
                console.log(`${chalk.red('❌')} Git: Not found in PATH`);
            }

            // Check Node
            console.log(`${chalk.green('✅')} Node: ${process.version}`);

            // Check Workspace
            const vibeDir = require('path').join(process.cwd(), '.vibe');
            if (require('fs').existsSync(vibeDir)) {
                console.log(`${chalk.green('✅')} .vibe directory: Exists`);
            } else {
                console.log(`${chalk.blue('ℹ️')} .vibe directory: Will be created on first use`);
            }

            console.log('\n✨ Health check complete.\n');
            process.exit(0);
        });

    await program.parseAsync(process.argv);
}
