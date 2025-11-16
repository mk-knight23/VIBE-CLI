// Migrated debugging utilities (from lib/debug.cjs) to cli/debug/debug.cjs
// Updated imports to use consolidated core barrel instead of legacy openrouter.
// Debugging utilities
const { chatCompletion, detectTaskType } = require('../core');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

// Parse error messages and stack traces
function parseError(errorInput) {
  const input = String(errorInput).trim();
  
  // Check if it's a file path
  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    return {
      type: 'file',
      path: input,
      content: fs.readFileSync(input, 'utf8')
    };
  }
  
  // Check if it looks like a stack trace
  const stackTracePatterns = [
    /Error:\s*.+/,
    /at\s+.+\(.+:\d+:\d+\)/,
    /.+\.js:\d+:\d+/,
    /TypeError:\s*.+/,
    /ReferenceError:\s*.+/,
    /SyntaxError:\s*.+/,
    /Uncaught\s+.+/,
    /Exception:\s*.+/
  ];
  
  const isStackTrace = stackTracePatterns.some(pattern => pattern.test(input));
  
  if (isStackTrace) {
    return {
      type: 'error',
      raw: input,
      lines: input.split('\n')
    };
  }
  
  // Treat as general error message
  return {
    type: 'message',
    raw: input
  };
}

// Extract code context from stack trace
function extractCodeContext(stackTrace, options = {}) {
  const { contextLines = 5 } = options;
  const fileReferences = [];
  
  // Extract file references from stack trace
  const filePattern = /at\s+.+\((.+):(\d+):(\d+)\)/g;
  let match;
  
  while ((match = filePattern.exec(stackTrace.raw)) !== null) {
    const [, filePath, lineStr, columnStr] = match;
    const line = parseInt(lineStr);
    const column = parseInt(columnStr);
    
    fileReferences.push({
      path: filePath,
      line,
      column,
      absolute: path.isAbsolute(filePath)
    });
  }
  
  // Also look for simple file:line references
  const simplePattern = /(.+\.js):(\d+):(\d+)/g;
  while ((match = simplePattern.exec(stackTrace.raw)) !== null) {
    const [, filePath, lineStr, columnStr] = match;
    const line = parseInt(lineStr);
    const column = parseInt(columnStr);
    
    // Avoid duplicates
    if (!fileReferences.some(ref => ref.path === filePath && ref.line === line)) {
      fileReferences.push({
        path: filePath,
        line,
        column,
        absolute: path.isAbsolute(filePath)
      });
    }
  }
  
  // Read context for each file reference
  const contexts = [];
  
  for (const ref of fileReferences) {
    let filePath = ref.path;
    
    // Handle relative paths
    if (!ref.absolute) {
      filePath = path.join(process.cwd(), filePath);
    }
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const start = Math.max(0, ref.line - contextLines - 1);
        const end = Math.min(lines.length, ref.line + contextLines);
        
        const contextLinesArr = lines.slice(start, end);
        const errorLineIndex = ref.line - start - 1;
        
        contexts.push({
          path: filePath,
          line: ref.line,
          column: ref.column,
          context: contextLinesArr,
          errorLineIndex,
          startLine: start + 1,
          endLine: end
        });
      } catch (error) {
        console.log(pc.yellow(`Could not read file: ${filePath} - ${error.message}`));
      }
    }
  }
  
  return contexts;
}

// Analyze error and suggest fixes
async function analyzeError(errorInput, options = {}) {
  const { model = null, includeContext = true } = options;
  
  const parsed = parseError(errorInput);
  
  let context = '';
  let codeContexts = [];
  
  if (parsed.type === 'error' && includeContext) {
    codeContexts = extractCodeContext(parsed);
    
    if (codeContexts.length > 0) {
      context = '\nCode context:\n';
      codeContexts.forEach((ctx, index) => {
        context += `\nFile ${index + 1}: ${ctx.path} (line ${ctx.line})\n`;
        context += '```\n';
        
        ctx.context.forEach((line, i) => {
          const marker = i === ctx.errorLineIndex ? '>>> ' : '    ';
          context += marker + line + '\n';
        });
        
        context += '```\n';
      });
    }
  } else if (parsed.type === 'file') {
    context = `\nFile content:\n${parsed.path}\n\`\`\`\n${parsed.content}\n\`\`\`\n`;
  }
  
  const systemPrompt = `You are an expert debugging specialist. Analyze the error or issue and provide:
1. Root cause analysis
2. Specific fix recommendations
3. Code examples where applicable
4. Prevention strategies
5. Related debugging steps

Be thorough but focus on actionable solutions. Format your response clearly with sections.`;
  
  let userPrompt;
  if (parsed.type === 'error') {
    userPrompt = `Debug this error:\n\n${parsed.raw}${context}`;
  } else if (parsed.type === 'file') {
    userPrompt = `Debug issues in this file:\n\n${parsed.content}`;
  } else {
    userPrompt = `Debug this issue:\n\n${parsed.raw}`;
  }
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'debug',
      prompt: userPrompt,
      model,
      messages,
      temperature: 0.2
    });
    
    return {
      analysis: response.message?.content || '',
      model: response.model,
      parsed,
      codeContexts,
      type: parsed.type
    };
  } catch (error) {
    throw new Error(`Failed to analyze error: ${error.message}`);
  }
}

// Generate test cases for the error
async function generateTestCases(errorInput, options = {}) {
  const { model = null, framework = 'auto' } = options;
  
  const parsed = parseError(errorInput);
  
  let context = '';
  if (parsed.type === 'file') {
    context = `\nFile content:\n${parsed.content}`;
  } else if (parsed.type === 'error') {
    context = `\nError details:\n${parsed.raw}`;
  }
  
  const systemPrompt = `You are a test engineering expert. Generate comprehensive test cases to reproduce and validate fixes for the given error. Include:
1. Unit tests that reproduce the issue
2. Edge case tests
3. Regression tests
4. Integration tests if applicable
5. Test data setup

Use the ${framework} testing framework. Provide complete, runnable test code.`;
  
  const userPrompt = `Generate test cases for this error/issue:\n${context}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'test-generation',
      prompt: userPrompt,
      model,
      messages,
      temperature: 0.1
    });
    
    return {
      testCases: response.message?.content || '',
      model: response.model,
      framework,
      type: parsed.type
    };
  } catch (error) {
    throw new Error(`Failed to generate test cases: ${error.message}`);
  }
}

// Interactive debugging session
async function interactiveDebug(errorInput, options = {}) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  console.log(pc.cyan('\n=== Interactive Debugging Session ===\n'));
  
  // Analyze the error
  console.log(pc.cyan('Analyzing error...'));
  const analysis = await analyzeError(errorInput, options);
  
  console.log(pc.green('\n=== Error Analysis ==='));
  console.log(analysis.analysis);
  
  // Show code context if available
  if (analysis.codeContexts && analysis.codeContexts.length > 0) {
    console.log(pc.cyan('\n=== Code Context ==='));
    analysis.codeContexts.forEach((ctx, index) => {
      console.log(pc.bold(`\nFile ${index + 1}: ${ctx.path} (line ${ctx.line})`));
      
      ctx.context.forEach((line, i) => {
        const isErrorLine = i === ctx.errorLineIndex;
        const lineNumber = ctx.startLine + i;
        const prefix = isErrorLine ? pc.red('>>>') : pc.gray('   ');
        console.log(`${prefix} ${lineNumber}: ${line}`);
      });
    });
  }
  
  // Ask what to do next
  const { action } = await inquirerModule.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do next?',
      choices: [
        { name: 'Generate test cases', value: 'test' },
        { name: 'Get more detailed analysis', value: 'deep' },
        { name: 'Suggest code fixes', value: 'fix' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);
  
  switch (action) {
    case 'test':
      console.log(pc.cyan('\nGenerating test cases...'));
      const testCases = await generateTestCases(errorInput, options);
      console.log(pc.green('\n=== Generated Test Cases ==='));
      console.log(testCases.testCases);
      break;
      
    case 'deep':
      console.log(pc.cyan('\nPerforming deep analysis...'));
      const deepAnalysis = await analyzeError(errorInput, { 
        ...options, 
        includeContext: true 
      });
      console.log(pc.green('\n=== Deep Analysis ==='));
      console.log(deepAnalysis.analysis);
      break;
      
    case 'fix':
      console.log(pc.cyan('\nGenerating fix suggestions...'));
      const fixAnalysis = await analyzeError(errorInput, {
        ...options,
        includeContext: true
      });
      console.log(pc.green('\n=== Fix Suggestions ==='));
      console.log(fixAnalysis.analysis);
      break;
      
    case 'exit':
      console.log(pc.gray('Exiting debugging session.'));
      break;
  }
  
  return {
    analysis,
    action,
    success: true
  };
}

// Quick debug (non-interactive)
async function quickDebug(errorInput, options = {}) {
  console.log(pc.cyan('Analyzing error...'));
  
  const analysis = await analyzeError(errorInput, options);
  
  console.log(pc.green('\n=== Error Analysis ==='));
  console.log(analysis.analysis);
  
  return analysis;
}

// Debug from stdin
async function debugFromStdin(options = {}) {
  return new Promise((resolve, reject) => {
    const { stdin } = process;
    let data = '';
    
    if (stdin.isTTY) {
      reject(new Error('No input provided via stdin'));
      return;
    }
    
    stdin.setEncoding('utf8');
    stdin.on('data', chunk => data += chunk);
    stdin.on('end', async () => {
      try {
        const result = await quickDebug(data.trim(), options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    stdin.on('error', reject);
  });
}

module.exports = {
  parseError,
  extractCodeContext,
  analyzeError,
  generateTestCases,
  interactiveDebug,
  quickDebug,
  debugFromStdin
};