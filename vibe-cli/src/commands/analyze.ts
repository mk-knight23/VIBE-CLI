import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

export async function findSecurityIssues(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx,py}', '!**/node_modules/**'], { cwd: dir });
  const issues: string[] = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    if (content.includes('eval(')) issues.push(`${file}: Unsafe eval() usage`);
    if (content.match(/password\s*=\s*['"`][^'"`]+['"`]/i)) issues.push(`${file}: Hardcoded password`);
    if (content.match(/api[_-]?key\s*=\s*['"`][^'"`]+['"`]/i)) issues.push(`${file}: Hardcoded API key`);
    if (content.includes('innerHTML')) issues.push(`${file}: Potential XSS via innerHTML`);
  }
  
  return issues.length ? `Security Issues:\n${issues.join('\n')}` : 'No obvious security issues found';
}

export async function findPerformanceIssues(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx}', '!**/node_modules/**'], { cwd: dir });
  const issues: string[] = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    if (content.match(/for\s*\([^)]+\)\s*{[^}]*for\s*\(/)) issues.push(`${file}: Nested loops detected`);
    if (content.includes('console.log')) issues.push(`${file}: console.log statements found`);
  }
  
  return issues.length ? `Performance Issues:\n${issues.join('\n')}` : 'No obvious performance issues found';
}

export async function findTodos(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx,py,java,go,rs}', '!**/node_modules/**'], { cwd: dir });
  const todos: string[] = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.match(/\/\/\s*TODO|#\s*TODO/i)) {
        todos.push(`${file}:${i + 1} - ${line.trim()}`);
      }
    });
  }
  
  return todos.length ? `TODO Comments:\n${todos.join('\n')}` : 'No TODO comments found';
}

export async function analyzeCodeQuality(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx}', '!**/node_modules/**'], { cwd: dir });
  let totalLines = 0;
  let totalFunctions = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    totalLines += content.split('\n').length;
    totalFunctions += (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  }
  
  return `Code Quality:\nTotal Files: ${files.length}\nTotal Lines: ${totalLines}\nTotal Functions: ${totalFunctions}\nAvg Lines/File: ${Math.round(totalLines / files.length)}`;
}
