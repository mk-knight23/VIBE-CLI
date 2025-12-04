// Advanced Analysis Tools
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AdvancedAnalyzer {
  async dependencyGraph(path: string = '.'): Promise<any> {
    try {
      const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf-8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      return {
        production: Object.keys(deps).length,
        development: Object.keys(devDeps).length,
        total: Object.keys(deps).length + Object.keys(devDeps).length,
        dependencies: deps,
        devDependencies: devDeps
      };
    } catch {
      return { error: 'No package.json found' };
    }
  }

  async codeMetrics(path: string = '.'): Promise<any> {
    const files = await this.getAllFiles(path);
    let totalLines = 0;
    let totalFiles = files.length;
    const languages: Record<string, number> = {};

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n').length;
      totalLines += lines;

      const ext = file.split('.').pop() || 'unknown';
      languages[ext] = (languages[ext] || 0) + 1;
    }

    return {
      totalFiles,
      totalLines,
      avgLinesPerFile: Math.round(totalLines / totalFiles),
      languages
    };
  }

  async complexityAnalysis(file: string): Promise<any> {
    const code = await readFile(file, 'utf-8');
    
    const functions = (code.match(/function\s+\w+/g) || []).length;
    const classes = (code.match(/class\s+\w+/g) || []).length;
    const loops = (code.match(/for\s*\(|while\s*\(/g) || []).length;
    const conditionals = (code.match(/if\s*\(|switch\s*\(/g) || []).length;
    const lines = code.split('\n').length;

    const complexity = loops * 2 + conditionals + functions;

    return {
      functions,
      classes,
      loops,
      conditionals,
      lines,
      complexity,
      rating: complexity < 10 ? 'Low' : complexity < 20 ? 'Medium' : 'High'
    };
  }

  async securityScan(path: string = '.'): Promise<any> {
    const vulnerabilities: string[] = [];
    const files = await this.getAllFiles(path);

    for (const file of files) {
      const content = await readFile(file, 'utf-8');

      // Check for common security issues
      if (content.includes('eval(')) {
        vulnerabilities.push(`${file}: Use of eval() detected`);
      }
      if (content.match(/password\s*=\s*['"][^'"]+['"]/i)) {
        vulnerabilities.push(`${file}: Hardcoded password detected`);
      }
      if (content.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/i)) {
        vulnerabilities.push(`${file}: Hardcoded API key detected`);
      }
      if (content.includes('innerHTML')) {
        vulnerabilities.push(`${file}: innerHTML usage (XSS risk)`);
      }
    }

    // Run npm audit if available
    let npmAudit = null;
    try {
      const { stdout } = await execAsync('npm audit --json');
      npmAudit = JSON.parse(stdout);
    } catch {}

    return {
      codeVulnerabilities: vulnerabilities.length,
      issues: vulnerabilities,
      npmAudit
    };
  }

  async performanceAnalysis(path: string = '.'): Promise<any> {
    const files = await this.getAllFiles(path);
    const issues: string[] = [];

    for (const file of files) {
      const content = await readFile(file, 'utf-8');

      // Check for performance issues
      if (content.match(/for.*for/s)) {
        issues.push(`${file}: Nested loops (O(n²))`);
      }
      if (content.includes('document.querySelector') && content.split('document.querySelector').length > 5) {
        issues.push(`${file}: Excessive DOM queries`);
      }
      if (content.includes('JSON.parse') && content.includes('JSON.stringify')) {
        issues.push(`${file}: Frequent JSON operations`);
      }
    }

    return {
      totalIssues: issues.length,
      issues
    };
  }

  async architectureVisualization(path: string = '.'): Promise<any> {
    const structure: any = {};
    const files = await this.getAllFiles(path);

    for (const file of files) {
      const parts = file.split('/');
      let current = structure;

      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }

    return structure;
  }

  private async getAllFiles(dir: string, fileList: string[] = []): Promise<string[]> {
    try {
      const files = await readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const path = join(dir, file.name);

        if (file.name === 'node_modules' || file.name === '.git') continue;

        if (file.isDirectory()) {
          await this.getAllFiles(path, fileList);
        } else if (file.name.match(/\.(js|ts|jsx|tsx|py|go|rs)$/)) {
          fileList.push(path);
        }
      }
    } catch {}

    return fileList;
  }

  async duplicateDetection(path: string = '.'): Promise<any> {
    const files = await this.getAllFiles(path);
    const hashes: Record<string, string[]> = {};

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const hash = this.simpleHash(content);

      if (!hashes[hash]) {
        hashes[hash] = [];
      }
      hashes[hash].push(file);
    }

    const duplicates = Object.values(hashes).filter(files => files.length > 1);

    return {
      duplicateGroups: duplicates.length,
      duplicates
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}
