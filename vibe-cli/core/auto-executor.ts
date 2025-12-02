/**
 * Auto-executor: Automatically creates files/folders from AI responses
 */

import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

interface FileOperation {
  type: 'create' | 'mkdir';
  path: string;
  content?: string;
}

export function extractFileOperations(aiResponse: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const seen = new Set<string>();
  
  // Pattern 1: File with code block - **filename**:\n```code```
  const pattern1 = /\*\*([^*]+\.[a-z]+)\*\*:?\s*```(?:\w+)?\n([\s\S]*?)```/gi;
  let match;
  while ((match = pattern1.exec(aiResponse)) !== null) {
    const filePath = match[1].trim();
    if (!seen.has(filePath)) {
      operations.push({ type: 'create', path: filePath, content: match[2].trim() });
      seen.add(filePath);
    }
  }
  
  // Pattern 2: `filename`:\n```code```
  const pattern2 = /`([^`]+\.[a-z]+)`:\s*```(?:\w+)?\n([\s\S]*?)```/gi;
  while ((match = pattern2.exec(aiResponse)) !== null) {
    const filePath = match[1].trim();
    if (!seen.has(filePath)) {
      operations.push({ type: 'create', path: filePath, content: match[2].trim() });
      seen.add(filePath);
    }
  }
  
  // Pattern 3: Create `filename` with:\n```code```
  const pattern3 = /(?:create|write|save)\s+`([^`]+\.[a-z]+)`[:\s]+(?:with|containing)?:?\s*```(?:\w+)?\n([\s\S]*?)```/gi;
  while ((match = pattern3.exec(aiResponse)) !== null) {
    const filePath = match[1].trim();
    if (!seen.has(filePath)) {
      operations.push({ type: 'create', path: filePath, content: match[2].trim() });
      seen.add(filePath);
    }
  }
  
  // Pattern 4: filename (without backticks):\n```code```
  const pattern4 = /^([a-zA-Z0-9_\-\/]+\.[a-z]+):\s*```(?:\w+)?\n([\s\S]*?)```/gim;
  while ((match = pattern4.exec(aiResponse)) !== null) {
    const filePath = match[1].trim();
    if (!seen.has(filePath) && !filePath.includes(' ')) {
      operations.push({ type: 'create', path: filePath, content: match[2].trim() });
      seen.add(filePath);
    }
  }
  
  // Pattern 5: Directory structure - folder/
  const dirPattern = /(?:create|mkdir)\s+(?:directory|folder)?\s*:?\s*`?([a-zA-Z0-9_\-\/]+)`?(?:\s|$)/gi;
  while ((match = dirPattern.exec(aiResponse)) !== null) {
    const dirPath = match[1].trim().replace(/^-p\s+/, '');
    // Only add if it's a valid directory name (more than 1 char, no spaces, no dots)
    if (dirPath && dirPath.length > 1 && !dirPath.includes(' ') && !dirPath.includes('.') && dirPath !== '-p') {
      if (!seen.has(dirPath)) {
        operations.push({ type: 'mkdir', path: dirPath });
        seen.add(dirPath);
      }
    }
  }
  
  return operations;
}

export async function executeOperations(operations: FileOperation[], cwd: string = process.cwd()): Promise<void> {
  if (operations.length === 0) return;
  
  console.log(pc.cyan(`\n🔧 Detected ${operations.length} file operation(s). Executing...\n`));
  
  for (const op of operations) {
    const fullPath = path.resolve(cwd, op.path);
    
    try {
      if (op.type === 'mkdir') {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          console.log(pc.green(`✓ Created directory: ${op.path}`));
        } else {
          console.log(pc.gray(`  Directory exists: ${op.path}`));
        }
      } else if (op.type === 'create') {
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, op.content || '', 'utf8');
        console.log(pc.green(`✓ Created file: ${op.path} (${op.content?.length || 0} bytes)`));
      }
    } catch (error: any) {
      console.error(pc.red(`✗ Failed to ${op.type} ${op.path}: ${error.message}`));
    }
  }
  
  console.log('');
}

export function shouldAutoExecute(userInput: string): boolean {
  const keywords = [
    'create', 'build', 'generate', 'make', 'setup',
    'app', 'project', 'component', 'file', 'folder'
  ];
  
  const lower = userInput.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}
