/**
 * Context-Aware Editor Module
 *
 * Intelligent file editing with minimal diffs, structure preservation, and style consistency.
 * Reads files before editing, analyzes patterns, and applies surgical changes.
 *
 * @module core/context-aware-editor
 */

import { executeTool } from '../tools';
import { TerminalRenderer } from '../utils/terminal-renderer';
import { MemoryManager } from './memory';

export interface EditContext {
  filePath: string;
  content?: string;
  language?: string;
  framework?: string;
  patterns: {
    indentation: string;
    lineEnding: string;
    quotes: 'single' | 'double';
    semicolons: boolean;
    brackets: 'same-line' | 'new-line';
  };
  imports: string[];
  exports: string[];
  dependencies: string[];
}

export interface EditOperation {
  type: 'insert' | 'replace' | 'delete' | 'move';
  location: {
    startLine: number;
    endLine?: number;
    startCol?: number;
    endCol?: number;
  };
  content?: string;
  oldContent?: string;
  reasoning: string;
}

export interface EditResult {
  success: boolean;
  changes: number;
  diff: string;
  context: EditContext;
  operations: EditOperation[];
}

export class ContextAwareEditor {
  private renderer: TerminalRenderer;
  private memory: MemoryManager;

  constructor(renderer: TerminalRenderer, memory: MemoryManager) {
    this.renderer = renderer;
    this.memory = memory;
  }

  /**
   * Edit file with full context awareness
   */
  async editWithContext(
    filePath: string,
    editRequest: string,
    additionalContext?: any
  ): Promise<EditResult> {
    this.renderer.setState('thinking', 'Analyzing file and planning edits...');

    // Read and analyze file
    const context = await this.analyzeFile(filePath);

    // Generate edit operations based on request
    const operations = await this.planEdits(editRequest, context, additionalContext);

    if (operations.length === 0) {
      return {
        success: true,
        changes: 0,
        diff: '',
        context,
        operations: []
      };
    }

    // Apply edits with minimal diff
    const result = await this.applyEdits(filePath, operations, context);

    // Update memory
    this.memory.onFileWrite(filePath, result.diff);

    return result;
  }

  /**
   * Analyze file to understand context and patterns
   */
  private async analyzeFile(filePath: string): Promise<EditContext> {
    try {
      const content = await executeTool('read_file', { path: filePath });

      // Detect language
      const language = this.detectLanguage(filePath, content);

      // Analyze code patterns
      const patterns = this.analyzePatterns(content);

      // Extract imports and dependencies
      const imports = this.extractImports(content, language);
      const exports = this.extractExports(content, language);
      const dependencies = this.extractDependencies(content, language);

      // Detect framework
      const framework = this.detectFramework(content, imports, filePath);

      return {
        filePath,
        content,
        language,
        framework,
        patterns,
        imports,
        exports,
        dependencies
      };
    } catch (error) {
      // File doesn't exist, create context for new file
      const language = this.detectLanguage(filePath, '') || 'javascript';
      return {
        filePath,
        language,
        patterns: this.getDefaultPatterns(language),
        imports: [],
        exports: [],
        dependencies: []
      };
    }
  }

  /**
   * Plan edit operations based on request and context
   */
  private async planEdits(
    editRequest: string,
    context: EditContext,
    additionalContext?: any
  ): Promise<EditOperation[]> {
    const operations: EditOperation[] = [];
    const lowerRequest = editRequest.toLowerCase();

    // Function/Class additions
    if (lowerRequest.includes('add function') || lowerRequest.includes('create function')) {
      operations.push(...this.planFunctionAddition(editRequest, context));
    }

    // Import additions
    else if (lowerRequest.includes('import') || lowerRequest.includes('add import')) {
      operations.push(...this.planImportAddition(editRequest, context));
    }

    // Component additions (React/Vue)
    else if (lowerRequest.includes('add component') || lowerRequest.includes('create component')) {
      operations.push(...this.planComponentAddition(editRequest, context));
    }

    // State management additions
    else if (lowerRequest.includes('add state') || lowerRequest.includes('add hook')) {
      operations.push(...this.planStateAddition(editRequest, context));
    }

    // Dependency additions
    else if (lowerRequest.includes('add dependency') || lowerRequest.includes('install')) {
      operations.push(...this.planDependencyAddition(editRequest, context));
    }

    // Refactoring operations
    else if (lowerRequest.includes('extract') || lowerRequest.includes('rename')) {
      operations.push(...this.planRefactoring(editRequest, context));
    }

    // Generic replacements
    else {
      operations.push(...this.planGenericEdit(editRequest, context));
    }

    return operations;
  }

  /**
   * Apply edit operations with minimal diff
   */
  private async applyEdits(
    filePath: string,
    operations: EditOperation[],
    context: EditContext
  ): Promise<EditResult> {
    this.renderer.setState('executing', `Applying ${operations.length} edit${operations.length === 1 ? '' : 's'}...`);

    let currentContent = context.content || '';
    let totalChanges = 0;

    for (const op of operations) {
      try {
        const result = await this.applySingleOperation(currentContent, op, context);
        currentContent = result.content;
        totalChanges += result.changes;

        this.renderer.status(`Applied: ${op.reasoning}`, 'success');
      } catch (error: any) {
        this.renderer.status(`Failed: ${op.reasoning} - ${error.message}`, 'error');
        throw error;
      }
    }

    // Write the final content
    await executeTool('write_file', { file_path: filePath, content: currentContent });

    // Generate diff
    const diff = await this.generateDiff(context.content || '', currentContent, filePath);

    return {
      success: true,
      changes: totalChanges,
      diff,
      context,
      operations
    };
  }

  /**
   * Apply single edit operation
   */
  private async applySingleOperation(
    content: string,
    operation: EditOperation,
    context: EditContext
  ): Promise<{ content: string; changes: number }> {
    const lines = content.split('\n');

    switch (operation.type) {
      case 'insert':
        return this.applyInsert(lines, operation, context);

      case 'replace':
        return this.applyReplace(lines, operation, context);

      case 'delete':
        return this.applyDelete(lines, operation, context);

      case 'move':
        return this.applyMove(lines, operation, context);

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Apply insert operation
   */
  private applyInsert(
    lines: string[],
    operation: EditOperation,
    context: EditContext
  ): { content: string; changes: number } {
    const { startLine } = operation.location;
    const insertContent = operation.content || '';

    // Format content according to file patterns
    const formattedContent = this.formatContent(insertContent, context);

    lines.splice(startLine, 0, formattedContent);
    return {
      content: lines.join('\n'),
      changes: formattedContent.split('\n').length
    };
  }

  /**
   * Apply replace operation
   */
  private applyReplace(
    lines: string[],
    operation: EditOperation,
    context: EditContext
  ): { content: string; changes: number } {
    const { startLine, endLine = startLine, startCol, endCol } = operation.location;
    const replaceContent = operation.content || '';

    if (startLine === endLine) {
      // Single line replacement
      const line = lines[startLine];
      const before = startCol ? line.substring(0, startCol) : '';
      const after = endCol ? line.substring(endCol) : '';
      lines[startLine] = before + replaceContent + after;
    } else {
      // Multi-line replacement
      const before = startCol ? lines[startLine].substring(0, startCol) : '';
      const after = endCol ? lines[endLine].substring(endCol) : '';

      lines.splice(startLine, endLine - startLine + 1, before + replaceContent + after);
    }

    return {
      content: lines.join('\n'),
      changes: 1
    };
  }

  /**
   * Apply delete operation
   */
  private applyDelete(
    lines: string[],
    operation: EditOperation,
    context: EditContext
  ): { content: string; changes: number } {
    const { startLine, endLine } = operation.location;

    lines.splice(startLine, (endLine || startLine) - startLine + 1);
    return {
      content: lines.join('\n'),
      changes: 1
    };
  }

  /**
   * Apply move operation
   */
  private applyMove(
    lines: string[],
    operation: EditOperation,
    context: EditContext
  ): { content: string; changes: number } {
    const { startLine, endLine } = operation.location;
    const targetLine = operation.content ? parseInt(operation.content) : lines.length;

    const movedLines = lines.splice(startLine, (endLine || startLine) - startLine + 1);
    lines.splice(targetLine, 0, ...movedLines);

    return {
      content: lines.join('\n'),
      changes: movedLines.length
    };
  }

  /**
   * Plan function addition
   */
  private planFunctionAddition(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    // Extract function details from request
    const funcMatch = editRequest.match(/add function (\w+)/i);
    if (!funcMatch) return operations;

    const funcName = funcMatch[1];
    const funcCode = this.generateFunctionCode(funcName, context);

    // Find appropriate insertion point
    const insertLine = this.findFunctionInsertionPoint(context);

    operations.push({
      type: 'insert',
      location: { startLine: insertLine },
      content: funcCode,
      reasoning: `Adding function ${funcName} with proper formatting`
    });

    return operations;
  }

  /**
   * Plan import addition
   */
  private planImportAddition(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    // Extract import details
    const importMatch = editRequest.match(/import (.+?) from ['"](.+?)['"]/i);
    if (!importMatch) return operations;

    const importStatement = importMatch[0];

    // Check if import already exists
    if (context.imports.some(imp => imp.includes(importMatch[2]))) {
      return operations; // Already imported
    }

    // Find import insertion point
    const insertLine = this.findImportInsertionPoint(context);

    operations.push({
      type: 'insert',
      location: { startLine: insertLine },
      content: importStatement,
      reasoning: `Adding import statement for ${importMatch[2]}`
    });

    return operations;
  }

  /**
   * Plan component addition
   */
  private planComponentAddition(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    if (context.framework === 'react') {
      const componentCode = this.generateReactComponent(editRequest, context);
      const insertLine = this.findComponentInsertionPoint(context);

      operations.push({
        type: 'insert',
        location: { startLine: insertLine },
        content: componentCode,
        reasoning: 'Adding React component with proper JSX structure'
      });
    }

    return operations;
  }

  /**
   * Plan state addition
   */
  private planStateAddition(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    if (context.framework === 'react') {
      const stateCode = this.generateReactState(editRequest, context);
      const insertLine = this.findStateInsertionPoint(context);

      operations.push({
        type: 'insert',
        location: { startLine: insertLine },
        content: stateCode,
        reasoning: 'Adding React state with useState hook'
      });
    }

    return operations;
  }

  /**
   * Plan dependency addition
   */
  private planDependencyAddition(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    // This would typically involve updating package.json
    // For now, we'll focus on code-level changes

    return operations;
  }

  /**
   * Plan refactoring operations
   */
  private planRefactoring(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    // Extract refactoring details
    if (editRequest.includes('extract')) {
      operations.push(...this.planExtractRefactoring(editRequest, context));
    } else if (editRequest.includes('rename')) {
      operations.push(...this.planRenameRefactoring(editRequest, context));
    }

    return operations;
  }

  /**
   * Plan generic edit
   */
  private planGenericEdit(editRequest: string, context: EditContext): EditOperation[] {
    const operations: EditOperation[] = [];

    // Simple search and replace
    const replaceMatch = editRequest.match(/replace (.+?) with (.+)/i);
    if (replaceMatch && context.content) {
      const [, oldText, newText] = replaceMatch;
      const lines = context.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(oldText)) {
          operations.push({
            type: 'replace',
            location: {
              startLine: i,
              endLine: i,
              startCol: lines[i].indexOf(oldText),
              endCol: lines[i].indexOf(oldText) + oldText.length
            },
            content: newText,
            oldContent: oldText,
            reasoning: `Replacing "${oldText}" with "${newText}"`
          });
          break; // Only replace first occurrence
        }
      }
    }

    return operations;
  }

  /**
   * Helper methods for code generation and insertion points
   */
  private generateFunctionCode(funcName: string, context: EditContext): string {
    const indent = context.patterns.indentation;
    const semicolon = context.patterns.semicolons ? ';' : '';

    switch (context.language) {
      case 'typescript':
      case 'javascript':
        return `${indent}function ${funcName}() {\n${indent}${indent}// TODO: Implement ${funcName}\n${indent}}\n`;
      case 'python':
        return `def ${funcName}():\n${indent}"""TODO: Implement ${funcName}"""\n${indent}pass\n`;
      default:
        return `function ${funcName}() {\n${indent}// TODO: Implement ${funcName}\n}\n`;
    }
  }

  private generateReactComponent(editRequest: string, context: EditContext): string {
    const componentMatch = editRequest.match(/add component (\w+)/i);
    const componentName = componentMatch ? componentMatch[1] : 'NewComponent';

    const indent = context.patterns.indentation;
    const quotes = context.patterns.quotes === 'single' ? "'" : '"';

    return `const ${componentName} = () => {\n${indent}return (\n${indent}${indent}<div>\n${indent}${indent}${indent}<h1>${componentName}</h1>\n${indent}${indent}</div>\n${indent});\n};\n\nexport default ${componentName};\n`;
  }

  private generateReactState(editRequest: string, context: EditContext): string {
    const stateMatch = editRequest.match(/add state (\w+)/i);
    const stateName = stateMatch ? stateMatch[1] : 'count';

    return `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(0);\n`;
  }

  private findFunctionInsertionPoint(context: EditContext): number {
    if (!context.content) return 0;

    const lines = context.content.split('\n');
    let lastFunctionLine = 0;

    // Find the last function definition
    for (let i = 0; i < lines.length; i++) {
      if (this.isFunctionDefinition(lines[i], context.language)) {
        lastFunctionLine = i;
      }
    }

    // Insert after the last function, or at the end if no functions found
    return lastFunctionLine > 0 ? lastFunctionLine + this.getFunctionLength(lines, lastFunctionLine) + 1 : lines.length;
  }

  private findImportInsertionPoint(context: EditContext): number {
    if (!context.content) return 0;

    const lines = context.content.split('\n');

    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      if (this.isImportStatement(lines[i], context.language)) {
        // Continue to find the last import
      } else if (lines[i].trim() !== '') {
        // Found first non-import, non-empty line
        return i;
      }
    }

    return lines.length;
  }

  private findComponentInsertionPoint(context: EditContext): number {
    // Insert at the end of the file
    return context.content ? context.content.split('\n').length : 0;
  }

  private findStateInsertionPoint(context: EditContext): number {
    if (!context.content) return 0;

    const lines = context.content.split('\n');

    // Find the component function start
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const') && lines[i].includes('=') && lines[i].includes('=>')) {
        return i + 1; // Insert after component declaration
      }
    }

    return lines.length;
  }

  private isFunctionDefinition(line: string, language?: string): boolean {
    const lang = language || 'javascript';
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return /^\s*function\s+\w+/.test(line) || /^\s*const\s+\w+\s*=\s*\(/.test(line);
      case 'python':
        return /^\s*def\s+\w+/.test(line);
      default:
        return false;
    }
  }

  private isImportStatement(line: string, language?: string): boolean {
    const lang = language || 'javascript';
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return line.trim().startsWith('import') || line.trim().startsWith('require(');
      case 'python':
        return line.trim().startsWith('import') || line.trim().startsWith('from');
      default:
        return false;
    }
  }

  private getFunctionLength(lines: string[], startLine: number): number {
    let braceCount = 0;
    let length = 0;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      length++;
      if (braceCount === 0) break;
    }

    return length;
  }

  private planExtractRefactoring(editRequest: string, context: EditContext): EditOperation[] {
    // Implementation for extract refactoring
    return [];
  }

  private planRenameRefactoring(editRequest: string, context: EditContext): EditOperation[] {
    // Implementation for rename refactoring
    return [];
  }

  /**
   * Utility methods
   */
  private detectLanguage(filePath: string, content: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'jsx': return 'javascript';
      case 'tsx': return 'typescript';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'cpp': case 'cc': case 'cxx': return 'cpp';
      case 'c': return 'c';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'php': return 'php';
      default: return 'javascript';
    }
  }

  private analyzePatterns(content: string): EditContext['patterns'] {
    const lines = content.split('\n');

    // Detect indentation
    let indentation = '  '; // Default to 2 spaces
    for (const line of lines) {
      const match = line.match(/^(\s+)/);
      if (match) {
        const indent = match[1];
        if (indent.includes('\t')) {
          indentation = '\t';
          break;
        } else if (indent.length > indentation.length) {
          indentation = ' '.repeat(indent.length);
        }
      }
    }

    // Detect line endings
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

    // Detect quote style
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    const quotes = singleQuotes > doubleQuotes ? 'single' : 'double';

    // Detect semicolons
    const semicolons = content.includes(';');

    // Detect bracket style
    const sameLineBrackets = content.includes('() => {');
    const brackets = sameLineBrackets ? 'same-line' : 'new-line';

    return {
      indentation,
      lineEnding,
      quotes,
      semicolons,
      brackets
    };
  }

  private getDefaultPatterns(language: string): EditContext['patterns'] {
    return {
      indentation: language === 'python' ? '    ' : '  ',
      lineEnding: '\n',
      quotes: 'single',
      semicolons: language !== 'python',
      brackets: 'same-line'
    };
  }

  private detectFramework(content: string, imports: string[], filePath: string): string | undefined {
    if (imports.some((imp: string) => imp.includes('react'))) return 'react';
    if (imports.some((imp: string) => imp.includes('vue'))) return 'vue';
    if (imports.some((imp: string) => imp.includes('@angular'))) return 'angular';
    if (imports.some((imp: string) => imp.includes('express'))) return 'express';
    if (filePath.includes('web-framework') || content.includes('web-framework')) return 'web-framework';
    if (filePath.includes('api-framework') || content.includes('api-framework')) return 'api-framework';

    return undefined;
  }

  private extractImports(content: string, language: string): string[] {
    const lines = content.split('\n');
    const imports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (this.isImportStatement(trimmed, language)) {
        imports.push(trimmed);
      }
    }

    return imports;
  }

  private extractExports(content: string, language: string): string[] {
    const lines = content.split('\n');
    const exports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // ES6 exports
      if (trimmed.startsWith('export')) {
        exports.push(trimmed);
      }
      // CommonJS exports
      else if (trimmed.includes('module.exports') || trimmed.includes('exports.')) {
        exports.push(trimmed);
      }
    }

    return exports;
  }

  private extractDependencies(content: string, language: string): string[] {
    // This would analyze imports to determine dependencies
    // For now, return empty array
    return [];
  }

  private formatContent(content: string, context: EditContext): string {
    // Apply formatting based on detected patterns
    let formatted = content;

    // Apply indentation
    const lines = formatted.split('\n');
    formatted = lines.map(line => {
      // Basic indentation logic - this could be more sophisticated
      return line;
    }).join(context.patterns.lineEnding);

    return formatted;
  }

  private async generateDiff(oldContent: string, newContent: string, filePath: string): Promise<string> {
    try {
      const result = await executeTool('run_shell_command', {
        command: `diff -u <(echo "${oldContent.replace(/"/g, '\\"')}") <(echo "${newContent.replace(/"/g, '\\"')}")`,
        description: 'Generate unified diff'
      });
      return result;
    } catch (error) {
      // Diff command failed, return simple diff
      return `--- ${filePath}\n+++ ${filePath}\n@@ -1 +1 @@\n-${oldContent}\n+${newContent}`;
    }
  }
}

/**
 * Convenience function for context-aware editing
 */
export async function editFileWithContext(
  filePath: string,
  editRequest: string,
  renderer: TerminalRenderer,
  memory: MemoryManager,
  additionalContext?: any
): Promise<EditResult> {
  const editor = new ContextAwareEditor(renderer, memory);
  return editor.editWithContext(filePath, editRequest, additionalContext);
}
