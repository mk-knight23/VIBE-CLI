// Code generation utilities (migrated)
// Updated import: reuse consolidated core barrel instead of local openrouter
const { chatCompletion, detectTaskType } = require('../core');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

// Detect programming language from context or file extension
function detectLanguage(context = '', filePath = null) {
  const text = context.toLowerCase();
  
  // Check file extension first
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const extensionMap = {
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
      '.sql': 'sql',
      '.sh': 'bash',
      '.md': 'markdown'
    };
    
    if (extensionMap[ext]) {
      return extensionMap[ext];
    }
  }
  
  // Detect from context keywords
  if (text.includes('function') || text.includes('const') || text.includes('let') || text.includes('var')) {
    return 'javascript';
  }
  if (text.includes('def ') || text.includes('import ') || text.includes('from ')) {
    return 'python';
  }
  if (text.includes('public class') || text.includes('import java')) {
    return 'java';
  }
  if (text.includes('using System') || text.includes('namespace ')) {
    return 'csharp';
  }
  if (text.includes('package ') || text.includes('import java')) {
    return 'java';
  }
  if (text.includes('package main') || text.includes('func main')) {
    return 'go';
  }
  if (text.includes('fn main') || text.includes('use std')) {
    return 'rust';
  }
  if (text.includes('class React') || text.includes('useState') || text.includes('useEffect')) {
    return 'react';
  }
  if (text.includes('<html') || text.includes('<div') || text.includes('<body')) {
    return 'html';
  }
  
  // Default to JavaScript
  return 'javascript';
}

// Generate code from prompt
async function generateCode(prompt, options = {}) {
  const {
    language = null,
    context = '',
    filePath = null,
    model = null,
    stream = false
  } = options;
  
  // Detect language if not provided
  const detectedLanguage = language || detectLanguage(context, filePath);
  
  // Build system prompt for code generation
  const systemPrompt = `You are an expert ${detectedLanguage} developer. Generate clean, efficient, and well-documented code. Follow best practices and include error handling where appropriate. Only output the code without explanations unless specifically asked.`;
  
  // Build user prompt with context
  let userPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
  
  if (context) {
    userPrompt += `\n\nContext:\n${context}`;
  }
  
  if (filePath) {
    userPrompt += `\n\nFile path: ${filePath}`;
  }
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'code-generation',
      prompt,
      model,
      messages,
      temperature: 0.2
    });
    
    return {
      code: response.message?.content || '',
      language: detectedLanguage,
      model: response.model
    };
  } catch (error) {
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

// Generate complete function or class
async function generateFunction(prompt, options = {}) {
  const {
    name = '',
    parameters = [],
    returnType = '',
    language = null,
    context = ''
  } = options;
  
  let functionPrompt = prompt;
  
  if (name) {
    functionPrompt = `Create a function named "${name}"`;
    if (parameters.length > 0) {
      functionPrompt += ` with parameters: ${parameters.join(', ')}`;
    }
    if (returnType) {
      functionPrompt += ` that returns: ${returnType}`;
    }
    functionPrompt += ` that ${prompt}`;
  }
  
  return await generateCode(functionPrompt, { language, context });
}

// Generate from template
async function generateFromTemplate(template, variables = {}, options = {}) {
  const { language = null } = options;
  
  let prompt = `Create a ${template} template`;
  
  if (Object.keys(variables).length > 0) {
    prompt += ` with the following variables:\n`;
    Object.entries(variables).forEach(([key, value]) => {
      prompt += `- ${key}: ${value}\n`;
    });
  }
  
  return await generateCode(prompt, { language });
}

// Save generated code to file
function saveCodeToFile(code, filePath) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, code, 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    throw new Error(`Failed to save code to ${filePath}: ${error.message}`);
  }
}

// Stream code generation with real-time output
async function streamCodeGeneration(prompt, options = {}) {
  const { onChunk, ...restOptions } = options;
  
  // For now, we'll use the regular generation and simulate streaming
  // In a real implementation, this would use streaming API
  const result = await generateCode(prompt, restOptions);
  
  if (onChunk) {
    // Simulate streaming by sending chunks
    const code = result.code;
    const chunkSize = 100;
    for (let i = 0; i < code.length; i += chunkSize) {
      const chunk = code.slice(i, i + chunkSize);
      onChunk(chunk, i === 0, i + chunkSize >= code.length);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return result;
}

// Read file context for code completion
function readFileContext(filePath, targetLine = null, contextLines = 100) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (targetLine === null) {
      // Return entire file if no specific line
      return {
        content,
        lines,
        language: detectLanguage(content, filePath)
      };
    }
    
    // Get context around target line
    const start = Math.max(0, targetLine - contextLines);
    const end = Math.min(lines.length, targetLine + contextLines);
    
    const contextLinesArray = lines.slice(start, end);
    const beforeCursor = contextLinesArray.slice(0, targetLine - start).join('\n');
    const afterCursor = contextLinesArray.slice(targetLine - start).join('\n');
    
    return {
      beforeCursor,
      afterCursor,
      content: contextLinesArray.join('\n'),
      lines: contextLinesArray,
      language: detectLanguage(content, filePath),
      targetLine,
      startLine: start + 1, // 1-based line numbers
      endLine: end
    };
  } catch (error) {
    throw new Error(`Failed to read file context: ${error.message}`);
  }
}

// Generate code completion suggestions
async function generateCompletion(filePath, options = {}) {
  const {
    line = null,
    contextLines = 100,
    maxSuggestions = 3,
    model = null
  } = options;
  
  const context = readFileContext(filePath, line, contextLines);
  
  // Build completion prompt
  let prompt = `Complete the code at the cursor position in this ${context.language} file.\n\n`;
  
  if (line !== null) {
    prompt += `Context (lines ${context.startLine}-${context.endLine}):\n`;
    prompt += context.beforeCursor;
    prompt += '\n[CURSOR POSITION]\n';
    prompt += context.afterCursor;
  } else {
    prompt += `File content:\n${context.content}`;
  }
  
  prompt += '\n\nProvide multiple completion suggestions that are syntactically correct and contextually appropriate.';
  
  const systemPrompt = `You are an expert ${context.language} developer specializing in code completion and autocompletion. Provide accurate, context-aware code completions. Format your response as a numbered list of suggestions, each containing only the code to be inserted without explanations.`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'completion',
      prompt: `Complete ${context.language} code`,
      model,
      messages,
      temperature: 0.1
    });
    
    const content = response.message?.content || '';
    
    // Parse numbered suggestions
    const suggestions = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && suggestions.length < maxSuggestions) {
        suggestions.push(match[1].trim());
      }
    }
    
    // If no numbered suggestions found, try to parse differently
    if (suggestions.length === 0) {
      const codeBlocks = content.split('```').filter((_, i) => i % 2 === 1);
      for (const block of codeBlocks.slice(0, maxSuggestions)) {
        suggestions.push(block.trim());
      }
    }
    
    // Fallback: use entire content as single suggestion
    if (suggestions.length === 0) {
      suggestions.push(content.trim());
    }
    
    return {
      suggestions: suggestions.slice(0, maxSuggestions),
      language: context.language,
      model: response.model,
      context: {
        filePath,
        line,
        beforeCursor: context.beforeCursor,
        afterCursor: context.afterCursor
      }
    };
  } catch (error) {
    throw new Error(`Code completion failed: ${error.message}`);
  }
}

// Apply completion to file
async function applyCompletion(filePath, suggestion, options = {}) {
  const { line = null } = options;
  
  try {
    const context = readFileContext(filePath, line);
    
    let newContent;
    if (line !== null) {
      // Insert suggestion at cursor position
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      lines.splice(line - 1, 0, suggestion);
      newContent = lines.join('\n');
    } else {
      // Append to end of file
      const content = fs.readFileSync(filePath, 'utf8');
      newContent = content + (content.endsWith('\n') ? '' : '\n') + suggestion;
    }
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      filePath,
      applied: suggestion
    };
  } catch (error) {
    throw new Error(`Failed to apply completion: ${error.message}`);
  }
}

// Interactive completion selection
async function interactiveCompletion(filePath, options = {}) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  const completions = await generateCompletion(filePath, options);
  
  if (completions.suggestions.length === 0) {
    console.log(pc.yellow('No completion suggestions found.'));
    return null;
  }
  
  console.log(pc.cyan(`Found ${completions.suggestions.length} completion suggestions:`));
  
  const { selected } = await inquirerModule.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select a completion to apply:',
      choices: [
        ...completions.suggestions.map((suggestion, index) => ({
          name: `Suggestion ${index + 1}`,
          value: index
        })),
        { name: 'Cancel', value: null }
      ]
    }
  ]);
  
  if (selected === null) {
    console.log(pc.gray('Cancelled.'));
    return null;
  }
  
  const suggestion = completions.suggestions[selected];
  
  const { confirm } = await inquirerModule.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Apply this completion?',
      default: true
    }
  ]);
  
  if (!confirm) {
    console.log(pc.gray('Cancelled.'));
    return null;
  }
  
  try {
    const result = await applyCompletion(filePath, suggestion, options);
    console.log(pc.green(`Completion applied to ${filePath}`));
    return result;
  } catch (error) {
    console.error(pc.red('Failed to apply completion:'), error.message);
    return null;
  }
}

module.exports = {
  detectLanguage,
  generateCode,
  generateFunction,
  generateFromTemplate,
  saveCodeToFile,
  streamCodeGeneration,
  readFileContext,
  generateCompletion,
  applyCompletion,
  interactiveCompletion
};