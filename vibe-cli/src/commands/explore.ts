import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

export async function analyzeArchitecture(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx,py,java,go,rs}', '!**/node_modules/**', '!**/dist/**'], { cwd: dir });
  const structure: Record<string, string[]> = {};
  
  files.forEach(f => {
    const parts = f.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';
    if (!structure[folder]) structure[folder] = [];
    structure[folder].push(f);
  });

  return `Architecture Overview:\n${Object.entries(structure).map(([k, v]) => `${k}: ${v.length} files`).join('\n')}`;
}

export async function findDependencies(dir: string = process.cwd()): Promise<string> {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'No package.json found';
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  return `Dependencies:\n${Object.entries(deps).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
}

export async function findApiEndpoints(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx}', '!**/node_modules/**'], { cwd: dir });
  const endpoints: string[] = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const matches = content.match(/(app|router)\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g);
    if (matches) endpoints.push(...matches.map(m => `${file}: ${m}`));
  }
  
  return endpoints.length ? `API Endpoints:\n${endpoints.join('\n')}` : 'No API endpoints found';
}
