import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function renameTestFiles(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.test.{ts,js,tsx,jsx}', '!**/node_modules/**'], { cwd: dir });
  let renamed = 0;
  
  for (const file of files) {
    const newName = file.replace(/\.test\./, '.spec.');
    if (newName !== file) {
      fs.renameSync(path.join(dir, file), path.join(dir, newName));
      renamed++;
    }
  }
  
  return `Renamed ${renamed} test files to .spec. pattern`;
}

export async function removeConsoleLogs(dir: string = process.cwd()): Promise<string> {
  const files = await fg(['**/*.{ts,js,tsx,jsx}', '!**/node_modules/**'], { cwd: dir });
  let removed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    content = content.replace(/console\.log\([^)]*\);?\n?/g, '');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      removed++;
    }
  }
  
  return `Removed console.log from ${removed} files`;
}

export async function convertImages(dir: string = process.cwd(), format: string = 'png'): Promise<string> {
  const images = await fg(['**/*.{jpg,jpeg,gif,bmp}', '!**/node_modules/**'], { cwd: dir });
  
  if (images.length === 0) return 'No images found to convert';
  
  return `Found ${images.length} images. Image conversion requires external tools (imagemagick). Use: convert input.jpg output.png`;
}

export async function analyzeGitCommits(days: number = 7): Promise<string> {
  try {
    const { stdout } = await execAsync(`git log --since="${days} days ago" --pretty=format:"%s" --no-merges`);
    const commits = stdout.split('\n').filter(Boolean);
    
    const grouped: Record<string, number> = {};
    commits.forEach(commit => {
      const type = commit.split(':')[0] || 'other';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    
    return `Git Commits (last ${days} days):\nTotal: ${commits.length}\n${Object.entries(grouped).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
  } catch {
    return 'Not a git repository or git not available';
  }
}

export async function generateChangelog(days: number = 30): Promise<string> {
  try {
    const { stdout } = await execAsync(`git log --since="${days} days ago" --pretty=format:"- %s (%an)" --no-merges`);
    return `# Changelog (last ${days} days)\n\n${stdout}`;
  } catch {
    return 'Not a git repository or git not available';
  }
}
