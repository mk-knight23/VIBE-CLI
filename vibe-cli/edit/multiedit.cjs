// Multi-file editing utilities (migrated to cli/edit)
// Imports updated to use core barrel instead of legacy openrouter
const { chatCompletion, detectTaskType } = require('../core');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const fg = require('fast-glob');

// Scan files matching glob pattern
async function scanFiles(globPattern, options = {}) {
  const {
    maxFiles = 20,
    maxSize = 500000, // 500KB max per file
    excludePatterns = ['node_modules/**', '.git/**', 'dist/**', 'build/**']
  } = options;
  
  try {
    // Build exclude patterns
    const exclude = excludePatterns.map(pattern => `!${pattern}`);
    
    // Get matching files
    const files = await fg([globPattern, ...exclude], { 
      onlyFiles: true, 
      absolute: false,
      dot: false 
    });
    
    // Limit number of files
    const limitedFiles = files.slice(0, maxFiles);
    
    // Read file contents
    const fileData = [];
    for (const file of limitedFiles) {
      try {
        const stats = fs.statSync(file);
        if (stats.size > maxSize) {
          console.log(pc.yellow(`Skipping large file: ${file} (${stats.size} bytes)`));
          continue;
        }
        
        const content = fs.readFileSync(file, 'utf8');
        fileData.push({
          path: file,
          content,
          size: stats.size,
          lastModified: stats.mtime
        });
      } catch (error) {
        console.log(pc.yellow(`Could not read file: ${file} - ${error.message}`));
      }
    }
    
    return fileData;
  } catch (error) {
    throw new Error(`Failed to scan files: ${error.message}`);
  }
}

// Generate unified diffs for multiple files
async function generateDiffs(prompt, fileData, options = {}) {
  const { model = null } = options;
  
  // Build context from file data
  let context = 'Files to edit:\n\n';
  fileData.forEach((file, index) => {
    context += `File ${index + 1}: ${file.path}\n`;
    context += '```\n' + file.content + '\n```\n\n';
  });
  
  const systemPrompt = `You are an expert code editor. Analyze the provided files and generate unified diffs to implement the requested changes. Follow these rules:
1. Use standard unified diff format with --- and +++ lines
2. Include context lines (@@) for each change
3. Make minimal, focused changes
4. Preserve existing code style and formatting
5. Only output the diffs without explanations
6. Start each diff with "diff --git a/filepath b/filepath"`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${context}\n\nRequested changes: ${prompt}` }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'multi-edit',
      prompt,
      model,
      messages,
      temperature: 0.1
    });
    
    return {
      diffs: response.message?.content || '',
      model: response.model,
      fileCount: fileData.length
    };
  } catch (error) {
    throw new Error(`Failed to generate diffs: ${error.message}`);
  }
}

// Parse unified diffs
function parseDiffs(diffText) {
  const diffs = [];
  const lines = diffText.split('\n');
  let currentDiff = null;
  
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      // Start new diff
      if (currentDiff) {
        diffs.push(currentDiff);
      }
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      currentDiff = {
        oldFile: match ? match[1] : '',
        newFile: match ? match[2] : '',
        chunks: []
      };
    } else if (line.startsWith('@@')) {
      // Start new chunk
      if (currentDiff) {
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          currentDiff.chunks.push({
            oldStart: parseInt(match[1]),
            oldLines: parseInt(match[2] || '1'),
            newStart: parseInt(match[3]),
            newLines: parseInt(match[4] || '1'),
            context: [],
            removals: [],
            additions: []
          });
        }
      }
    } else if (currentDiff && currentDiff.chunks.length > 0) {
      const currentChunk = currentDiff.chunks[currentDiff.chunks.length - 1];
      
      if (line.startsWith(' ')) {
        // Context line
        currentChunk.context.push(line.slice(1));
      } else if (line.startsWith('-')) {
        // Removal line
        currentChunk.removals.push(line.slice(1));
      } else if (line.startsWith('+')) {
        // Addition line
        currentChunk.additions.push(line.slice(1));
      }
    }
  }
  
  if (currentDiff) {
    diffs.push(currentDiff);
  }
  
  return diffs;
}

// Apply diffs to files
async function applyDiffs(diffs, options = {}) {
  const { dryRun = false, backup = true } = options;
  const results = [];
  
  for (const diff of diffs) {
    const filePath = diff.newFile;
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(pc.yellow(`File not found: ${filePath} (will be created)`));
      }
      
      // Read original content
      let originalContent = '';
      try {
        originalContent = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        // File doesn't exist, will be created
      }
      
      // Create backup if requested
      if (backup && fs.existsSync(filePath)) {
        const backupPath = filePath + '.vibe-backup';
        fs.writeFileSync(backupPath, originalContent, 'utf8');
      }
      
      // Apply changes
      let newContent = originalContent;
      const originalLines = originalContent.split('\n');
      
      // Process chunks in reverse order to maintain line numbers
      for (const chunk of diff.chunks.reverse()) {
        const { oldStart, oldLines, context, removals, additions } = chunk;
        
        // Build new content for this chunk
        const chunkStart = oldStart - 1; // Convert to 0-based
        const chunkEnd = chunkStart + oldLines;
        
        const beforeChunk = originalLines.slice(0, chunkStart);
        const afterChunk = originalLines.slice(chunkEnd);
        
        // Reconstruct chunk with changes
        const newChunk = [...context, ...additions];
        
        // Update content
        newContent = [...beforeChunk, ...newChunk, ...afterChunk].join('\n');
      }
      
      // Write new content
      if (!dryRun) {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
      
      results.push({
        file: filePath,
        success: true,
        changes: diff.chunks.length,
        dryRun
      });
      
    } catch (error) {
      results.push({
        file: filePath,
        success: false,
        error: error.message,
        dryRun
      });
    }
  }
  
  return results;
}

// Preview changes in terminal
function previewChanges(diffs) {
  console.log(pc.cyan('\n=== Preview of Changes ===\n'));
  
  for (const diff of diffs) {
    console.log(pc.bold(`File: ${diff.newFile}`));
    
    for (const chunk of diff.chunks) {
      console.log(pc.gray(`@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@`));
      
      // Show context
      for (const line of chunk.context) {
        console.log(` ${line}`);
      }
      
      // Show removals
      for (const line of chunk.removals) {
        console.log(pc.red(`-${line}`));
      }
      
      // Show additions
      for (const line of chunk.additions) {
        console.log(pc.green(`+${line}`));
      }
      
      console.log(); // Empty line between chunks
    }
    
    console.log(); // Empty line between files
  }
}

// Interactive confirmation for changes
async function confirmChanges(diffs) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  previewChanges(diffs);
  
  const { confirm } = await inquirerModule.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Apply these changes to ${diffs.length} file(s)?`,
      default: false
    }
  ]);
  
  return confirm;
}

// Main multi-file editing function
async function editFiles(prompt, globPattern, options = {}) {
  const {
    interactive = true,
    dryRun = false,
    backup = true,
    maxFiles = 20
  } = options;
  
  console.log(pc.cyan(`Scanning files matching: ${globPattern}`));
  
  // Scan files
  const fileData = await scanFiles(globPattern, { maxFiles });
  
  if (fileData.length === 0) {
    console.log(pc.yellow('No files found matching the pattern.'));
    return { success: false, message: 'No files found' };
  }
  
  console.log(pc.green(`Found ${fileData.length} file(s) to analyze`));
  
  // Generate diffs
  console.log(pc.cyan('Generating changes...'));
  const diffResult = await generateDiffs(prompt, fileData);
  
  // Parse diffs
  const diffs = parseDiffs(diffResult.diffs);
  
  if (diffs.length === 0) {
    console.log(pc.yellow('No changes generated.'));
    return { success: false, message: 'No changes generated' };
  }
  
  console.log(pc.green(`Generated changes for ${diffs.length} file(s) using model: ${diffResult.model}`));
  
  // Interactive confirmation
  let shouldApply = true;
  if (interactive && !dryRun) {
    shouldApply = await confirmChanges(diffs);
  }
  
  if (!shouldApply && !dryRun) {
    console.log(pc.gray('Changes cancelled.'));
    return { success: false, message: 'Cancelled by user' };
  }
  
  // Apply changes
  if (dryRun) {
    console.log(pc.cyan('DRY RUN: Changes would be applied as shown above.'));
    return { success: true, message: 'Dry run completed', diffs };
  }
  
  console.log(pc.cyan('Applying changes...'));
  const results = await applyDiffs(diffs, { backup });
  
  // Report results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(pc.green(`Successfully updated ${successful.length} file(s):`));
    successful.forEach(r => {
      console.log(`  ✓ ${r.file} (${r.changes} change${r.changes !== 1 ? 's' : ''})`);
    });
  }
  
  if (failed.length > 0) {
    console.log(pc.red(`Failed to update ${failed.length} file(s):`));
    failed.forEach(r => {
      console.log(`  ✗ ${r.file}: ${r.error}`);
    });
  }
  
  return {
    success: successful.length > 0,
    successful: successful.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  scanFiles,
  generateDiffs,
  parseDiffs,
  applyDiffs,
  previewChanges,
  confirmChanges,
  editFiles
};