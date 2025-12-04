// Debugging Suite
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { ApiClient } from '../core/api';

const execAsync = promisify(exec);

export class Debugger {
  constructor(private client?: ApiClient, private model?: string) {}

  async analyzeStackTrace(trace: string): Promise<any> {
    const parsed = this.parseStackTrace(trace);
    
    if (this.client && this.model) {
      const suggestion = await this.getAISuggestion(trace);
      return { ...parsed, suggestion };
    }
    
    return parsed;
  }

  private parseStackTrace(trace: string): any {
    const lines = trace.split('\n');
    const error = lines[0];
    const stack = lines.slice(1).map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4])
        };
      }
      return null;
    }).filter(Boolean);

    return { error, stack };
  }

  private async getAISuggestion(trace: string): Promise<string> {
    if (!this.client || !this.model) return '';

    const prompt = `Analyze this error and suggest a fix:\n\n${trace}`;
    
    try {
      const response = await this.client.chat([
        { role: 'user', content: prompt }
      ], this.model, { maxTokens: 300 });

      return response.choices?.[0]?.message?.content?.trim() || '';
    } catch {
      return '';
    }
  }

  async autoFix(file: string, error: string): Promise<string> {
    if (!this.client || !this.model) {
      return 'AI client not configured';
    }

    const code = await readFile(file, 'utf-8');
    const prompt = `Fix this error in the code:\n\nError: ${error}\n\nCode:\n${code}`;

    try {
      const response = await this.client.chat([
        { role: 'user', content: prompt }
      ], this.model, { maxTokens: 1000 });

      return response.choices?.[0]?.message?.content?.trim() || '';
    } catch (err: any) {
      return `Failed to generate fix: ${err.message}`;
    }
  }

  async analyzeLogs(logFile: string): Promise<any> {
    const logs = await readFile(logFile, 'utf-8');
    const lines = logs.split('\n');

    const errors = lines.filter(l => l.includes('ERROR') || l.includes('error'));
    const warnings = lines.filter(l => l.includes('WARN') || l.includes('warning'));
    const info = lines.filter(l => l.includes('INFO') || l.includes('info'));

    return {
      total: lines.length,
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
      recentErrors: errors.slice(-10)
    };
  }

  async profile(command: string): Promise<any> {
    const start = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      const duration = Date.now() - start;

      return {
        success: true,
        duration,
        output: stdout,
        errors: stderr
      };
    } catch (err: any) {
      return {
        success: false,
        duration: Date.now() - start,
        error: err.message
      };
    }
  }

  async testDebug(testFile: string): Promise<any> {
    try {
      const { stdout, stderr } = await execAsync(`npm test ${testFile} -- --verbose`);
      
      const passed = (stdout.match(/PASS/g) || []).length;
      const failed = (stdout.match(/FAIL/g) || []).length;
      
      return {
        passed,
        failed,
        output: stdout,
        errors: stderr
      };
    } catch (err: any) {
      return {
        passed: 0,
        failed: 1,
        error: err.message
      };
    }
  }

  async findBottlenecks(file: string): Promise<string[]> {
    const code = await readFile(file, 'utf-8');
    const bottlenecks: string[] = [];

    // Simple heuristics
    if (code.includes('for') && code.includes('for')) {
      bottlenecks.push('Nested loops detected - O(n²) complexity');
    }
    if (code.match(/\.map\(.*\.filter\(/)) {
      bottlenecks.push('Chained map/filter - consider combining');
    }
    if (code.includes('JSON.parse') && code.includes('JSON.stringify')) {
      bottlenecks.push('Frequent JSON operations - consider caching');
    }

    return bottlenecks;
  }

  async memoryProfile(): Promise<any> {
    const usage = process.memoryUsage();
    return {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    };
  }
}
