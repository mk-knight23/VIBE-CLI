// Test generation utilities (migrated)
// Updated imports: use consolidated core barrel and new codegen module
const { chatCompletion } = require('../core');
const { detectLanguage } = require('../code/codegen.cjs');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

// Detect test framework from project
function detectTestFramework(projectPath = process.cwd()) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return 'unknown';
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check dependencies
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };
    
    // Check for specific test frameworks
    if (deps.jest) return 'jest';
    if (deps.vitest) return 'vitest';
    if (deps.mocha) return 'mocha';
    if (deps.jasmine) return 'jasmine';
    if (deps.cypress) return 'cypress';
    if (deps.playwright) return 'playwright';
    if (deps.webdriverio) return 'webdriverio';
    if (deps.cucumber) return 'cucumber';
    
    // Check for test files
    const testDirs = ['test', 'tests', '__tests__', 'spec'];
    for (const testDir of testDirs) {
      const testDirPath = path.join(projectPath, testDir);
      if (fs.existsSync(testDirPath)) {
        const files = fs.readdirSync(testDirPath);
        if (files.some(f => f.includes('.test.') || f.includes('.spec.'))) {
          // Default to jest if no specific framework found
            return 'jest';
        }
      }
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// Analyze code for testable components
function analyzeCodeForTesting(filePath, content) {
  const language = detectLanguage(content, filePath);
  const functions = [];
  const classes = [];
  const methods = [];
  
  if (language === 'javascript' || language === 'typescript' || language === 'react' || language === 'react-typescript') {
    // Extract functions
    const functionMatches = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)|(\w+)\s*:\s*\([^)]*\)\s*=>)/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const nameMatch = match.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:)/);
        if (nameMatch) {
          const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
          if (name && !functions.includes(name)) {
            functions.push(name);
          }
        }
      });
    }
    
    // Extract classes
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const name = match.replace('class ', '');
        if (name && !classes.includes(name)) {
          classes.push(name);
        }
      });
    }
    
    // Extract methods (simplified)
    const methodMatches = content.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g);
    if (methodMatches) {
      methodMatches.forEach(match => {
        const nameMatch = match.match(/(?:async\s+)?(\w+)\s*\(/);
        if (nameMatch) {
          const name = nameMatch[1];
          if (name && !methods.includes(name) && !functions.includes(name)) {
            methods.push(name);
          }
        }
      });
    }
  } else if (language === 'python') {
    // Extract Python functions
    const functionMatches = content.match(/def\s+(\w+)\s*\(/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const name = match.replace('def ', '').split('(')[0];
        if (name && !functions.includes(name)) {
          functions.push(name);
        }
      });
    }
    
    // Extract Python classes
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const name = match.replace('class ', '');
        if (name && !classes.includes(name)) {
          classes.push(name);
        }
      });
    }
  }
  
  return {
    language,
    functions,
    classes,
    methods,
    filePath
  };
}

// Generate comprehensive test suite
async function generateTestSuite(filePath, options = {}) {
  const {
    framework = 'auto',
    model = null,
    coverage = 'comprehensive',
    includeMocks = true
  } = options;
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = analyzeCodeForTesting(filePath, content);
  
  // Detect framework
  const detectedFramework = framework === 'auto' ? detectTestFramework() : framework;
  
  // Build context for test generation
  let context = `File to test: ${filePath}\n`;
  context += `Language: ${analysis.language}\n`;
  context += `Test Framework: ${detectedFramework}\n`;
  context += `Coverage Level: ${coverage}\n\n`;
  
  context += `Code:\n\`\`\`${analysis.language}\n${content}\n\`\`\`\n\n`;
  
  if (analysis.functions.length > 0) {
    context += `Functions to test: ${analysis.functions.join(', ')}\n`;
  }
  
  if (analysis.classes.length > 0) {
    context += `Classes to test: ${analysis.classes.join(', ')}\n`;
  }
  
  if (analysis.methods.length > 0) {
    context += `Methods to test: ${analysis.methods.join(', ')}\n`;
  }
  
  const systemPrompt = `You are an expert test engineer specializing in ${detectedFramework} for ${analysis.language}. Generate a comprehensive test suite that includes:

1. Unit tests for all functions and methods
2. Integration tests for class interactions
3. Edge case testing
4. Error handling tests
5. Mock implementations where needed
6. Test data setup
7. Coverage assertions

Use ${detectedFramework} syntax and best practices. Make tests runnable and complete.`;
  
  const userPrompt = `Generate a ${coverage} test suite for this code:\n${context}`;
  
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
      testCode: response.message?.content || '',
      framework: detectedFramework,
      language: analysis.language,
      analysis,
      model: response.model
    };
  } catch (error) {
    throw new Error(`Failed to generate test suite: ${error.message}`);
  }
}

// Generate test file path
function generateTestFilePath(originalFilePath, framework) {
  const ext = path.extname(originalFilePath);
  const dir = path.dirname(originalFilePath);
  const name = path.basename(originalFilePath, ext);
  
  // Framework-specific naming conventions
  const testPatterns = {
    jest: [`${name}.test${ext}`, `${name}.spec${ext}`],
    vitest: [`${name}.test${ext}`, `${name}.spec${ext}`],
    mocha: [`${name}.test${ext}`, `test-${name}${ext}`],
    jasmine: [`${name}.spec${ext}`],
    cypress: [`${name}.spec${ext}`],
    playwright: [`${name}.spec${ext}`]
  };
  
  const patterns = testPatterns[framework] || testPatterns.jest;
  
  // Try common test directories
  const testDirs = ['test', 'tests', '__tests__', 'spec'];
  
  for (const testDir of testDirs) {
    const testDirPath = path.join(process.cwd(), testDir);
    if (fs.existsSync(testDirPath)) {
      for (const pattern of patterns) {
        const testPath = path.join(testDirPath, pattern);
        if (!fs.existsSync(testPath)) {
          return testPath;
        }
      }
    }
  }
  
  // Fallback to same directory
  return path.join(dir, patterns[0]);
}

// Save test file
function saveTestFile(testCode, testFilePath) {
  try {
    // Ensure directory exists
    const dir = path.dirname(testFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(testFilePath, testCode, 'utf8');
    return { success: true, path: testFilePath };
  } catch (error) {
    throw new Error(`Failed to save test file: ${error.message}`);
  }
}

// Interactive test generation
async function interactiveTestGeneration(filePath, options = {}) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  console.log(pc.cyan('\n=== Interactive Test Generation ===\n'));
  
  if (!fs.existsSync(filePath)) {
    console.error(pc.red(`File not found: ${filePath}`));
    return { success: false };
  }
  
  // Analyze the code
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = analyzeCodeForTesting(filePath, content);
  
  console.log(pc.green('Code Analysis:'));
  console.log(`  Language: ${analysis.language}`);
  console.log(`  Functions: ${analysis.functions.length > 0 ? analysis.functions.join(', ') : 'None'}`);
  console.log(`  Classes: ${analysis.classes.length > 0 ? analysis.classes.join(', ') : 'None'}`);
  console.log(`  Methods: ${analysis.methods.length > 0 ? analysis.methods.join(', ') : 'None'}`);
  
  // Detect framework
  const detectedFramework = detectTestFramework();
  console.log(`  Detected Framework: ${detectedFramework}`);
  
  // Get user preferences
  const { framework, coverage, includeMocks, saveFile } = await inquirerModule.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Test framework:',
      default: detectedFramework,
      choices: [
        { name: 'Auto-detect', value: 'auto' },
        { name: 'Jest', value: 'jest' },
        { name: 'Vitest', value: 'vitest' },
        { name: 'Mocha', value: 'mocha' },
        { name: 'Jasmine', value: 'jasmine' },
        { name: 'Cypress', value: 'cypress' },
        { name: 'Playwright', value: 'playwright' }
      ]
    },
    {
      type: 'list',
      name: 'coverage',
      message: 'Coverage level:',
      default: 'comprehensive',
      choices: [
        { name: 'Basic (happy path only)', value: 'basic' },
        { name: 'Standard (common cases)', value: 'standard' },
        { name: 'Comprehensive (all cases)', value: 'comprehensive' }
      ]
    },
    {
      type: 'confirm',
      name: 'includeMocks',
      message: 'Include mock implementations?',
      default: true
    },
    {
      type: 'confirm',
      name: 'saveFile',
      message: 'Save test to file?',
      default: true
    }
  ]);
  
  // Generate tests
  console.log(pc.cyan('\nGenerating test suite...'));
  
  const result = await generateTestSuite(filePath, {
    framework,
    coverage,
    includeMocks,
    ...options
  });
  
  console.log(pc.green('\n=== Generated Test Suite ==='));
  console.log(result.testCode);
  
  // Save to file if requested
  if (saveFile) {
    const testFilePath = generateTestFilePath(filePath, result.framework);
    await saveTestFile(result.testCode, testFilePath);
    console.log(pc.green(`\nTest saved to: ${testFilePath}`));
  }
  
  return {
    ...result,
    saved: saveFile
  };
}

// Quick test generation (non-interactive)
async function quickTestGeneration(filePath, options = {}) {
  console.log(pc.cyan(`Generating tests for: ${filePath}`));
  
  const result = await generateTestSuite(filePath, options);
  
  console.log(pc.green('\n=== Generated Test Suite ==='));
  console.log(result.testCode);
  
  return result;
}

// Generate tests for multiple files
async function generateTestsForPattern(pattern, options = {}) {
  const fg = require('fast-glob');
  
  try {
    const files = await fg(pattern, { onlyFiles: true });
    
    if (files.length === 0) {
      console.log(pc.yellow('No files found matching the pattern.'));
      return { success: false, message: 'No files found' };
    }
    
    console.log(pc.cyan(`Generating tests for ${files.length} file(s)...`));
    
    const results = [];
    
    for (const file of files) {
      try {
        console.log(pc.gray(`Processing: ${file}`));
        const result = await generateTestSuite(file, options);
        
        // Auto-save for batch processing
        const testFilePath = generateTestFilePath(file, result.framework);
        await saveTestFile(result.testCode, testFilePath);
        
        results.push({
          file,
          testFile: testFilePath,
          framework: result.framework,
          success: true
        });
        
        console.log(pc.green(`✓ Generated: ${testFilePath}`));
      } catch (error) {
        console.log(pc.red(`✗ Failed for ${file}: ${error.message}`));
        results.push({
          file,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(pc.cyan(`\n=== Batch Test Generation Complete ===`));
    console.log(pc.green(`Successfully generated: ${successful.length} test(s)`));
    
    if (failed.length > 0) {
      console.log(pc.red(`Failed: ${failed.length} file(s)`));
    }
    
    return {
      success: successful.length > 0,
      total: files.length,
      successful: successful.length,
      failed: failed.length,
      results
    };
    
  } catch (error) {
    throw new Error(`Batch test generation failed: ${error.message}`);
  }
}

module.exports = {
  detectTestFramework,
  analyzeCodeForTesting,
  generateTestSuite,
  generateTestFilePath,
  saveTestFile,
  interactiveTestGeneration,
  quickTestGeneration,
  generateTestsForPattern
};