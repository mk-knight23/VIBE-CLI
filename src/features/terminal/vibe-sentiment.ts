import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export class VibeSentiment {
    /**
     * Analyze project "vibe" based on various metrics
     */
    analyze(dir: string): string {
        const lines: string[] = [];
        lines.push(chalk.bold('\n🌡️  Project Vibe Report\n'));
        lines.push(chalk.gray('='.repeat(50)));
        lines.push('');

        const metrics = this.getMetrics(dir);

        lines.push(`${chalk.bold('Code Quality:')} ${this.getQualityLabel(metrics.quality)}`);
        lines.push(`${chalk.bold('Maintenance:')} ${this.getMaintenanceLabel(metrics.maintenance)}`);
        lines.push(`${chalk.bold('Activity:')} ${this.getActivityLabel(metrics.activity)}`);
        lines.push('');
        lines.push(`${chalk.bold('Overall Mood:')} ${this.getOverallMood(metrics)}`);
        lines.push('');

        return lines.join('\n');
    }

    private getMetrics(dir: string) {
        // Mock metrics based on some file checks
        const hasTests = fs.existsSync(path.join(dir, 'tests'));
        const hasDocs = fs.existsSync(path.join(dir, 'docs'));
        const hasReadme = fs.existsSync(path.join(dir, 'README.md'));
        
        return {
            quality: hasTests ? 0.8 : 0.4,
            maintenance: (hasDocs ? 0.3 : 0) + (hasReadme ? 0.3 : 0) + 0.2,
            activity: 0.7 // Mock
        };
    }

    private getQualityLabel(val: number): string {
        if (val > 0.7) return chalk.green('Excellent');
        if (val > 0.4) return chalk.yellow('Good');
        return chalk.red('Needs Work');
    }

    private getMaintenanceLabel(val: number): string {
        if (val > 0.7) return chalk.green('Well Maintained');
        if (val > 0.4) return chalk.yellow('Steady');
        return chalk.red('Outdated');
    }

    private getActivityLabel(val: number): string {
        if (val > 0.7) return chalk.green('Vibrant');
        if (val > 0.4) return chalk.yellow('Stable');
        return chalk.red('Quiet');
    }

    private getOverallMood(metrics: any): string {
        const avg = (metrics.quality + metrics.maintenance + metrics.activity) / 3;
        if (avg > 0.7) return 'Productive and chill 🌊';
        if (avg > 0.4) return 'Steady vibes ☕';
        return 'A bit stressful 🌪️';
    }
}

export const vibeSentiment = new VibeSentiment();
