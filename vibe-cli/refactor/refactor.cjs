// Migrated code refactoring utilities (from lib/refactor.cjs) to cli/refactor/refactor.cjs
// Updated imports to use core barrel and new multiedit location.
// Code refactoring utilities
const { chatCompletion, detectTaskType } = require('../core');
const { editFiles } = require('../edit/multiedit.cjs');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const fg = require('fast-glob');

// Refactoring types
const REFACTOR_TYPES = {
  'optimization': 'Performance optimization, algorithm improvements, memory usage optimization',
  'clean': 'Code cleanup, formatting, removing dead code, improving readability',
  'security': 'Security improvements, vulnerability fixes, input validation',
  'maintainability': 'Improving code structure, reducing complexity, better error handling',
  'modernization': 'Updating to modern syntax, deprecated API replacement, framework updates'
};

// Analyze code patterns and issues
async function analyzeCode(fileData, refactorType = 'clean') {
  const typeDescription = REFACTOR_TYPES[refactorType] || REFACTOR_TYPES['clean'];
  
  // Build context from file data
  let context = 'Code to analyze:\n\n';
  fileData.forEach((file, index) => {
    context += `File ${index + 1}: ${file.path}\n`;
    context += '```\n' + file.content + '\n```\n\n';
  });
  
  const systemPrompt = `You are an expert code analyst specializing in ${refactorType} refactoring. Analyze the provided code and identify:
1. Issues that need to be addressed
2. Patterns that should be improved
3. Specific recommendations for refactoring
4. Priority of each issue (high/medium/low)

Format your response as a structured analysis with clear, actionable recommendations.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${context}\n\nAnalyze this code for ${refactorType} improvements: ${typeDescription}` }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'refactor',
      prompt: `Analyze code for ${refactorType} refactoring`,
      messages,
      temperature: 0.2
    });
    
    return {
      analysis: response.message?.content || '',
      model: response.model,
      refactorType,
      fileCount: fileData.length
    };
  } catch (error) {
    throw new Error(`Failed to analyze code: ${error.message}`);
  }
}

// Generate refactoring suggestions
async function generateRefactoringPlan(fileData, refactorType = 'clean', customPrompt = '') {
  const typeDescription = REFACTOR_TYPES[refactorType] || REFACTOR_TYPES['clean'];
  
  // Build context from file data
  let context = 'Code to refactor:\n\n';
  fileData.forEach((file, index) => {
    context += `File ${index + 1}: ${file.path}\n`;
    context += '```\n' + file.content + '\n```\n\n';
  });
  
  const systemPrompt = `You are an expert code refactoring specialist. Create a detailed refactoring plan for the provided code. Focus on ${refactorType} improvements: ${typeDescription}

Your plan should include:
1. Specific changes to make
2. Reasoning for each change
3. Expected benefits
4. Implementation order
5. Risk assessment

Be thorough but practical. Focus on high-impact improvements.`;
  
  const userPrompt = customPrompt || 
    `Create a refactoring plan for ${refactorType} improvements. ${typeDescription}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${context}\n\n${userPrompt}` }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'refactor',
      prompt: `Generate refactoring plan for ${refactorType}`,
      messages,
      temperature: 0.3
    });
    
    return {
      plan: response.message?.content || '',
      model: response.model,
      refactorType,
      fileCount: fileData.length
    };
  } catch (error) {
    throw new Error(`Failed to generate refactoring plan: ${error.message}`);
  }
}

// Execute refactoring changes
async function executeRefactoring(fileData, refactorType = 'clean', customPrompt = '') {
  const typeDescription = REFACTOR_TYPES[refactorType] || REFACTOR_TYPES['clean'];
  
  // Create a prompt for the refactoring
  const refactoringPrompt = customPrompt || 
    `Refactor this code for ${refactorType} improvements. Focus on: ${typeDescription}`;
  
  // Use the multi-file editing functionality
  const filePaths = fileData.map(f => f.path);
  const globPattern = `{${filePaths.join(',')}}`;
  
  try {
    const result = await editFiles(refactoringPrompt, globPattern, {
      interactive: true,
      dryRun: false,
      backup: true
    });
    
    return {
      ...result,
      refactorType,
      typeDescription
    };
  } catch (error) {
    throw new Error(`Failed to execute refactoring: ${error.message}`);
  }
}

// Scan files for refactoring
async function scanFilesForRefactoring(pattern, options = {}) {
  const {
    maxFiles = 10,
    excludePatterns = ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.js']
  } = options;
  
  try {
    // Build exclude patterns
    const exclude = excludePatterns.map(p => `!${p}`);
    
    // Get matching files
    const files = await fg([pattern, ...exclude], { 
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
        const content = fs.readFileSync(file, 'utf8');
        const stats = fs.statSync(file);
        
        fileData.push({
          path: file,
          content,
          size: stats.size,
          lastModified: stats.mtime,
          language: detectFileLanguage(file)
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

// Detect file language from extension
function detectFileLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'react',
    '.tsx': 'react-typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sql': 'sql'
  };
  
  return languageMap[ext] || 'text';
}

// Interactive refactoring workflow
async function interactiveRefactor(pattern, refactorType = 'clean', options = {}) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  const { analyze = true, plan = true, execute = true } = options;
  
  console.log(pc.cyan(`\n=== Refactoring Workflow ===`));
  console.log(pc.gray(`Pattern: ${pattern}`));
  console.log(pc.gray(`Type: ${refactorType}`));
  console.log(pc.gray(`Description: ${REFACTOR_TYPES[refactorType]}\n`));
  
  // Scan files
  console.log(pc.cyan('Scanning files...'));
  const fileData = await scanFilesForRefactoring(pattern);
  
  if (fileData.length === 0) {
    console.log(pc.yellow('No files found matching the pattern.'));
    return { success: false, message: 'No files found' };
  }
  
  console.log(pc.green(`Found ${fileData.length} file(s) to refactor:`));
  fileData.forEach(file => {
    console.log(`  • ${file.path} (${file.language}, ${(file.size / 1024).toFixed(1)}KB)`);
  });
  
  let analysis = null;
  let refactoringPlan = null;
  
  // Analysis step
  if (analyze) {
    const { doAnalyze } = await inquirerModule.prompt([
      {
        type: 'confirm',
        name: 'doAnalyze',
        message: 'Analyze code for issues first?',
        default: true
      }
    ]);
    
    if (doAnalyze) {
      console.log(pc.cyan('\nAnalyzing code...'));
      analysis = await analyzeCode(fileData, refactorType);
      console.log(pc.green('\n=== Code Analysis ==='));
      console.log(analysis.analysis);
    }
  }
  
  // Planning step
  if (plan) {
    const { doPlan } = await inquirerModule.prompt([
      {
        type: 'confirm',
        name: 'doPlan',
        message: 'Create a detailed refactoring plan?',
        default: true
      }
    ]);
    
    if (doPlan) {
      console.log(pc.cyan('\nGenerating refactoring plan...'));
      refactoringPlan = await generateRefactoringPlan(fileData, refactorType);
      console.log(pc.green('\n=== Refactoring Plan ==='));
      console.log(refactoringPlan.plan);
    }
  }
  
  // Execution step
  if (execute) {
    const { doExecute } = await inquirerModule.prompt([
      {
        type: 'confirm',
        name: 'doExecute',
        message: 'Execute the refactoring?',
        default: false
      }
    ]);
    
    if (doExecute) {
      console.log(pc.cyan('\nExecuting refactoring...'));
      const result = await executeRefactoring(fileData, refactorType);
      
      if (result.success) {
        console.log(pc.green('\n=== Refactoring Complete ==='));
        console.log(`Successfully refactored ${result.successful} file(s)`);
      } else {
        console.log(pc.yellow('\nRefactoring completed with issues'));
        console.log(result.message);
      }
      
      return result;
    }
  }
  
  return {
    success: true,
    message: 'Refactoring workflow completed',
    fileCount: fileData.length,
    analysis,
    plan: refactoringPlan
  };
}

// Quick refactor (non-interactive)
async function quickRefactor(pattern, refactorType = 'clean', customPrompt = '') {
  console.log(pc.cyan(`Quick refactoring: ${pattern} (${refactorType})`));
  
  const fileData = await scanFilesForRefactoring(pattern);
  
  if (fileData.length === 0) {
    console.log(pc.yellow('No files found matching the pattern.'));
    return { success: false, message: 'No files found' };
  }
  
  const result = await executeRefactoring(fileData, refactorType, customPrompt);
  
  if (result.success) {
    console.log(pc.green(`Quick refactoring completed: ${result.successful} file(s) updated`));
  }
  
  return result;
}

module.exports = {
  REFACTOR_TYPES,
  analyzeCode,
  generateRefactoringPlan,
  executeRefactoring,
  scanFilesForRefactoring,
  detectFileLanguage,
  interactiveRefactor,
  quickRefactor
};