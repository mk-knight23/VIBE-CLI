import * as vscode from 'vscode';
import { MemoryManager } from './MemoryManager';
import { ToolOrchestrator } from './ToolOrchestrator';

export type ExecutionMode = 'ask' | 'code' | 'debug' | 'architect' | 'orchestrator';

export interface ModeContext {
  mode: ExecutionMode;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface ExecutionRequest {
  prompt: string;
  context?: any;
  mode?: ExecutionMode;
  streaming?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  response: string;
  toolResults?: Map<string, any>;
  duration: number;
  mode: ExecutionMode;
  tokensUsed?: number;
}

export class ExecutionModeManager {
  private memory: MemoryManager;
  private toolOrchestrator: ToolOrchestrator;
  private currentMode: ExecutionMode = 'code';

  private readonly modes: Record<ExecutionMode, ModeContext> = {
    ask: {
      mode: 'ask',
      description: 'Q&A and information retrieval with context awareness',
      capabilities: ['answer questions', 'explain concepts', 'search knowledge', 'provide examples'],
      systemPrompt: `You are an expert assistant focused on answering questions and providing information.
Use the provided context and memory to give accurate, helpful responses.
If you need to look up information or analyze code, use the available tools.
Be concise but thorough in your explanations.`,
      temperature: 0.3,
      maxTokens: 2000
    },

    code: {
      mode: 'code',
      description: 'Code writing, editing, and development tasks',
      capabilities: ['write code', 'edit files', 'create projects', 'debug code', 'refactor', 'optimize'],
      systemPrompt: `You are a senior software engineer specializing in code development.
You have access to powerful tools for reading, writing, and modifying code.
Always use the tools to actually perform file operations - don't just describe what to do.
Follow best practices and write clean, maintainable code.
Use the memory context to maintain consistency across the project.`,
      temperature: 0.2,
      maxTokens: 4000
    },

    debug: {
      mode: 'debug',
      description: 'Debugging, troubleshooting, and fixing issues',
      capabilities: ['analyze errors', 'trace bugs', 'fix issues', 'diagnose problems', 'test fixes'],
      systemPrompt: `You are a debugging expert specializing in identifying and fixing software issues.
Use systematic approaches to diagnose problems:
1. Gather information about the error/symptoms
2. Analyze the code and context
3. Identify root causes
4. Propose and implement fixes
5. Test and verify solutions

Use tools to examine code, run tests, and make fixes. Be thorough and methodical.`,
      temperature: 0.1,
      maxTokens: 3000
    },

    architect: {
      mode: 'architect',
      description: 'System design, planning, and architectural decisions',
      capabilities: ['design systems', 'plan projects', 'make architectural decisions', 'evaluate trade-offs', 'create roadmaps'],
      systemPrompt: `You are a senior software architect specializing in system design and planning.
Focus on:
- High-level design and architecture
- Technology stack decisions
- Project structure and organization
- Scalability and maintainability considerations
- Risk assessment and mitigation strategies

Provide clear, well-reasoned recommendations with pros/cons analysis.
Use memory to maintain architectural consistency across the project.`,
      temperature: 0.4,
      maxTokens: 3000
    },

    orchestrator: {
      mode: 'orchestrator',
      description: 'Coordinating complex multi-step tasks and workflows',
      capabilities: ['plan complex tasks', 'coordinate multiple operations', 'manage dependencies', 'track progress', 'handle failures'],
      systemPrompt: `You are a project orchestrator specializing in managing complex, multi-step tasks.
Your role is to:
1. Break down complex requests into manageable steps
2. Plan execution order and dependencies
3. Coordinate tool usage across multiple operations
4. Handle errors and recovery scenarios
5. Track progress and provide status updates
6. Ensure all requirements are met

Use the tool orchestrator to plan and execute complex workflows efficiently.`,
      temperature: 0.2,
      maxTokens: 4000
    }
  };

  constructor(memory: MemoryManager, toolOrchestrator: ToolOrchestrator) {
    this.memory = memory;
    this.toolOrchestrator = toolOrchestrator;
  }

  /**
   * Set the current execution mode
   */
  setMode(mode: ExecutionMode): void {
    if (this.modes[mode]) {
      this.currentMode = mode;
      this.memory.setPreference('lastExecutionMode', mode);
    } else {
      throw new Error(`Unknown execution mode: ${mode}`);
    }
  }

  /**
   * Get the current execution mode
   */
  getCurrentMode(): ExecutionMode {
    return this.currentMode;
  }

  /**
   * Get mode context for a specific mode
   */
  getModeContext(mode?: ExecutionMode): ModeContext {
    const targetMode = mode || this.currentMode;
    return this.modes[targetMode];
  }

  /**
   * Get all available modes
   */
  getAvailableModes(): Record<ExecutionMode, ModeContext> {
    return this.modes;
  }

  /**
   * Auto-detect the best mode for a given request
   */
  detectBestMode(request: string): ExecutionMode {
    const lowerRequest = request.toLowerCase();

    // Debug indicators
    if (lowerRequest.includes('error') || lowerRequest.includes('bug') ||
        lowerRequest.includes('fix') || lowerRequest.includes('debug') ||
        lowerRequest.includes('issue') || lowerRequest.includes('problem') ||
        lowerRequest.includes('broken') || lowerRequest.includes('crash')) {
      return 'debug';
    }

    // Architect indicators
    if (lowerRequest.includes('design') || lowerRequest.includes('architecture') ||
        lowerRequest.includes('structure') || lowerRequest.includes('plan') ||
        lowerRequest.includes('system') || lowerRequest.includes('infrastructure') ||
        lowerRequest.includes('scalability') || lowerRequest.includes('roadmap')) {
      return 'architect';
    }

    // Orchestrator indicators (complex multi-step tasks)
    if (lowerRequest.includes('project') || lowerRequest.includes('application') ||
        lowerRequest.includes('build') || lowerRequest.includes('create') ||
        lowerRequest.includes('setup') || lowerRequest.includes('implement') ||
        (lowerRequest.includes('multiple') && lowerRequest.includes('files'))) {
      return 'orchestrator';
    }

    // Code indicators
    if (lowerRequest.includes('code') || lowerRequest.includes('function') ||
        lowerRequest.includes('class') || lowerRequest.includes('implement') ||
        lowerRequest.includes('write') || lowerRequest.includes('edit') ||
        lowerRequest.includes('refactor') || lowerRequest.includes('optimize')) {
      return 'code';
    }

    // Question indicators
    if (lowerRequest.includes('what') || lowerRequest.includes('how') ||
        lowerRequest.includes('why') || lowerRequest.includes('explain') ||
        lowerRequest.includes('difference') || lowerRequest.includes('best')) {
      return 'ask';
    }

    // Default to code mode
    return 'code';
  }

  /**
   * Execute a request in the specified or current mode
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const mode = request.mode || this.detectBestMode(request.prompt);
    const modeContext = this.modes[mode];

    // Update current mode if different
    if (mode !== this.currentMode) {
      this.setMode(mode);
    }

    try {
      // Start task tracking
      this.memory.startTask(`${modeContext.description}: ${request.prompt.substring(0, 100)}`);

      // Build enhanced system prompt with memory context
      const memoryContext = this.memory.getMemoryContext();
      const enhancedPrompt = `${modeContext.systemPrompt}

MEMORY CONTEXT:
${memoryContext}

CURRENT MODE: ${modeContext.description}
CAPABILITIES: ${modeContext.capabilities.join(', ')}

INSTRUCTIONS:
- Use the memory context to maintain consistency
- Leverage project history and patterns
- Apply appropriate tools for the task
- Be thorough but efficient
- Track progress and decisions`;

      // For orchestrator mode, use tool orchestration
      if (mode === 'orchestrator') {
        const toolChain = await this.toolOrchestrator.analyzeAndPlan(request.prompt, request.context);
        const orchestrationResult = await this.toolOrchestrator.executeChain(toolChain);

        const response = this.buildOrchestratorResponse(orchestrationResult, toolChain);

        // Complete task
        const duration = Date.now() - startTime;
        this.memory.completeTask(orchestrationResult.success, duration);

        return {
          success: orchestrationResult.success,
          response,
          toolResults: orchestrationResult.results,
          duration,
          mode,
          tokensUsed: 0 // TODO: Implement token counting
        };
      }

      // For other modes, use direct AI interaction
      // This would integrate with the AI provider system
      const response = await this.executeAIMode(request, modeContext, enhancedPrompt);

      // Complete task
      const duration = Date.now() - startTime;
      this.memory.completeTask(true, duration);

      return {
        success: true,
        response,
        duration,
        mode,
        tokensUsed: 0 // TODO: Implement token counting
      };

    } catch (error: any) {
      // Complete task with failure
      const duration = Date.now() - startTime;
      this.memory.completeTask(false, duration);
      this.memory.onError(error.message);

      return {
        success: false,
        response: `Error in ${mode} mode: ${error.message}`,
        duration,
        mode
      };
    }
  }

  /**
   * Execute AI-powered mode (ask, code, debug, architect)
   */
  private async executeAIMode(
    request: ExecutionRequest,
    modeContext: ModeContext,
    systemPrompt: string
  ): Promise<string> {
    // Enhanced mode-specific processing
    let enhancedPrompt = systemPrompt;
    let toolChain: any = null;

    switch (modeContext.mode) {
      case 'ask':
        enhancedPrompt += this.buildAskModePrompt(request);
        break;

      case 'code':
        enhancedPrompt += await this.buildCodeModePrompt(request);
        toolChain = await this.toolOrchestrator.analyzeAndPlan(request.prompt, request.context);
        break;

      case 'debug':
        enhancedPrompt += this.buildDebugModePrompt(request);
        toolChain = await this.toolOrchestrator.analyzeAndPlan(request.prompt, request.context);
        break;

      case 'architect':
        enhancedPrompt += this.buildArchitectModePrompt(request);
        break;
    }

    // Execute with AI provider (placeholder - would integrate with AIProvider)
    const response = await this.executeWithAIProvider(enhancedPrompt, request, modeContext, toolChain);

    // Add to chat history
    this.memory.addChatMessage('user', request.prompt);
    this.memory.addChatMessage('assistant', response);

    // Add story events for significant actions
    if (this.isSignificantAction(request.prompt, modeContext.mode)) {
      this.memory.addStoryEvent(
        `${modeContext.mode}: ${request.prompt.substring(0, 100)}`,
        this.mapModeToStoryCategory(modeContext.mode)
      );
    }

    return response;
  }

  /**
   * Build enhanced prompt for Ask mode
   */
  private buildAskModePrompt(request: ExecutionRequest): string {
    const semanticContext = this.memory.buildSemanticContext(request.prompt);

    return `

ASK MODE ENHANCEMENTS:
- Use semantic search to find relevant previous conversations
- Reference project documentation and code patterns
- Provide clear, actionable answers
- Include code examples when relevant
- Suggest related topics or follow-up questions

SEMANTIC CONTEXT:
${semanticContext}

QUESTION: ${request.prompt}`;
  }

  /**
   * Build enhanced prompt for Code mode
   */
  private async buildCodeModePrompt(request: ExecutionRequest): Promise<string> {
    const gitContext = await this.memory.getGitContext();
    const folderContext = request.context?.folderPath ?
      await this.memory.getFolderContext(request.context.folderPath) : null;

    let prompt = `

CODE MODE ENHANCEMENTS:
- Analyze existing code patterns and follow them
- Consider project structure and dependencies
- Use appropriate tools for file operations
- Follow language-specific best practices
- Maintain code consistency with existing codebase

CURRENT PROJECT CONTEXT:
${this.memory.getEnhancedContext()}

GIT STATUS:
${gitContext}`;

    if (folderContext) {
      prompt += `

FOLDER CONTEXT (${request.context.folderPath}):
Files: ${folderContext.files.join(', ')}
Dependencies: ${Object.entries(folderContext.dependencies).map(([k,v]) => `${k}@${v}`).join(', ')}
Summaries: ${folderContext.summaries ? Object.values(folderContext.summaries).join(' | ') : 'None'}`;
    }

    return prompt;
  }

  /**
   * Build enhanced prompt for Debug mode
   */
  private buildDebugModePrompt(request: ExecutionRequest): string {
    const recentErrors = this.memory.getWorkspaceChangesByCategory('bug_fix', 5);
    const debugPatterns = this.memory.getCodePatterns().filter(p =>
      p.toLowerCase().includes('error') || p.toLowerCase().includes('debug')
    );

    return `

DEBUG MODE ENHANCEMENTS:
- Systematically analyze error symptoms and root causes
- Check recent changes and potential conflicts
- Examine related code and dependencies
- Test hypotheses with targeted fixes
- Verify solutions with appropriate tests

RECENT BUG FIXES:
${recentErrors.map(change => `- ${change}`).join('\n')}

DEBUG PATTERNS LEARNED:
${debugPatterns.map(pattern => `- ${pattern}`).join('\n')}

DEBUG REQUEST: ${request.prompt}`;
  }

  /**
   * Build enhanced prompt for Architect mode
   */
  private buildArchitectModePrompt(request: ExecutionRequest): string {
    const projectGoals = this.memory.getState().storyMemory.projectGoal;
    const architectureDecisions = this.memory.getState().decisions.filter(d =>
      d.toLowerCase().includes('architecture') ||
      d.toLowerCase().includes('design') ||
      d.toLowerCase().includes('structure')
    );

    return `

ARCHITECT MODE ENHANCEMENTS:
- Consider long-term maintainability and scalability
- Evaluate technology choices and trade-offs
- Design for future requirements and changes
- Document architectural decisions and rationale
- Plan incremental implementation strategies

PROJECT GOALS:
${projectGoals || 'Not specified - focus on general best practices'}

ARCHITECTURAL DECISIONS MADE:
${architectureDecisions.map(decision => `- ${decision}`).join('\n')}

ARCHITECTURAL REQUEST: ${request.prompt}`;
  }

  /**
   * Execute with AI provider (enhanced integration)
   */
  private async executeWithAIProvider(
    systemPrompt: string,
    request: ExecutionRequest,
    modeContext: ModeContext,
    toolChain?: any
  ): Promise<string> {
    // This would integrate with the AIProvider system
    // For now, simulate enhanced responses based on mode

    let response = `[${modeContext.mode.toUpperCase()} MODE] ${modeContext.description}

Processing: ${request.prompt}

CAPABILITIES: ${modeContext.capabilities.join(', ')}

`;

    // Add mode-specific processing
    switch (modeContext.mode) {
      case 'ask':
        response += this.generateAskResponse(request.prompt);
        break;

      case 'code':
        response += this.generateCodeResponse(request.prompt, toolChain);
        break;

      case 'debug':
        response += this.generateDebugResponse(request.prompt);
        break;

      case 'architect':
        response += this.generateArchitectResponse(request.prompt);
        break;
    }

    // Add tool execution if applicable
    if (toolChain && toolChain.tools.length > 0) {
      response += `

TOOL EXECUTION PLAN:
Risk Level: ${toolChain.riskLevel}
Estimated Duration: ${toolChain.estimatedDuration}ms
Reasoning: ${toolChain.reasoning}

Tools to execute:
${toolChain.tools.map((t: any) => `- ${t.tool.displayName}: ${t.tool.description}`).join('\n')}`;
    }

    return response;
  }

  /**
   * Generate enhanced Ask mode response
   */
  private generateAskResponse(prompt: string): string {
    const relevantHistory = this.memory.semanticSearchChat(prompt, 2);

    return `ANALYSIS COMPLETE

Based on project context and conversation history:

${relevantHistory.length > 0 ?
  `RELEVANT HISTORY:\n${relevantHistory.map(h => `- ${h.message.content.substring(0, 100)}...`).join('\n')}`
  : 'No directly relevant previous conversations found.'}

ANSWER: [AI-generated response would go here with comprehensive analysis]`;
  }

  /**
   * Generate enhanced Code mode response
   */
  private generateCodeResponse(prompt: string, toolChain?: any): string {
    const patterns = this.memory.getCodePatterns();

    return `CODE ANALYSIS COMPLETE

DETECTED PATTERNS:
${patterns.slice(0, 3).map(p => `- ${p}`).join('\n')}

${toolChain ? `EXECUTION PLAN:
${toolChain.tools.map((t: any, i: number) => `${i + 1}. ${t.tool.displayName}`).join('\n')}

READY TO EXECUTE CODE CHANGES` : 'DIRECT CODE GENERATION MODE'}`;
  }

  /**
   * Generate enhanced Debug mode response
   */
  private generateDebugResponse(prompt: string): string {
    const recentChanges = this.memory.getWorkspaceChangesByCategory('bug_fix', 3);

    return `DEBUG ANALYSIS COMPLETE

RECENT FIXES:
${recentChanges.map(c => `- ${c}`).join('\n')}

DEBUGGING STEPS:
1. Error Analysis: [AI would analyze error patterns]
2. Root Cause: [AI would identify likely causes]
3. Solution: [AI would propose fixes]
4. Testing: [AI would suggest verification steps]

READY TO DIAGNOSE AND FIX`;
  }

  /**
   * Generate enhanced Architect mode response
   */
  private generateArchitectResponse(prompt: string): string {
    const decisions = this.memory.getState().decisions.slice(-3);

    return `ARCHITECTURAL ANALYSIS COMPLETE

EXISTING DECISIONS:
${decisions.map(d => `- ${d}`).join('\n')}

DESIGN CONSIDERATIONS:
- Scalability: [AI would analyze scaling requirements]
- Maintainability: [AI would assess code organization]
- Technology Fit: [AI would evaluate tech stack choices]
- Risk Assessment: [AI would identify potential issues]

READY TO DESIGN SOLUTION`;
  }

  /**
   * Check if action is significant enough to track in story memory
   */
  private isSignificantAction(prompt: string, mode: ExecutionMode): boolean {
    const lowerPrompt = prompt.toLowerCase();

    // Significant actions by mode
    switch (mode) {
      case 'architect':
        return lowerPrompt.includes('design') || lowerPrompt.includes('architecture') ||
               lowerPrompt.includes('structure') || lowerPrompt.includes('system');

      case 'code':
        return lowerPrompt.includes('create') || lowerPrompt.includes('build') ||
               lowerPrompt.includes('implement') || lowerPrompt.includes('refactor');

      case 'debug':
        return lowerPrompt.includes('fix') || lowerPrompt.includes('resolve') ||
               lowerPrompt.includes('bug') || lowerPrompt.includes('error');

      case 'orchestrator':
        return lowerPrompt.includes('project') || lowerPrompt.includes('setup') ||
               lowerPrompt.includes('configure') || lowerPrompt.includes('deploy');

      default:
        return false;
    }
  }

  /**
   * Map execution mode to story memory category
   */
  private mapModeToStoryCategory(mode: ExecutionMode): 'milestone' | 'challenge' | 'decision' | 'learning' | 'goal' {
    switch (mode) {
      case 'architect':
        return 'decision';
      case 'code':
        return 'milestone';
      case 'debug':
        return 'challenge';
      case 'orchestrator':
        return 'milestone';
      case 'ask':
        return 'learning';
      default:
        return 'milestone';
    }
  }

  /**
   * Build response for orchestrator mode
   */
  private buildOrchestratorResponse(
    result: any,
    toolChain: any
  ): string {
    let response = `## Orchestrator Execution Complete

**Plan:** ${toolChain.reasoning}
**Risk Level:** ${toolChain.riskLevel}
**Duration:** ${result.duration}ms

### Results:
`;

    if (result.success) {
      response += `✅ **Success** - All tools executed successfully\n\n`;

      // Show tool results
      result.results.forEach((toolResult: any, toolName: string) => {
        response += `**${toolName}:**\n${toolResult}\n\n`;
      });
    } else {
      response += `❌ **Partial Success** - ${result.errors.size} tool(s) failed\n\n`;

      // Show successful results
      if (result.results.size > 0) {
        response += `**Successful Tools:**\n`;
        result.results.forEach((toolResult: any, toolName: string) => {
          response += `✅ ${toolName}: ${toolResult}\n`;
        });
        response += `\n`;
      }

      // Show errors
      if (result.errors.size > 0) {
        response += `**Failed Tools:**\n`;
        result.errors.forEach((error: Error, toolName: string) => {
          response += `❌ ${toolName}: ${error.message}\n`;
        });
      }
    }

    return response;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    currentMode: ExecutionMode;
    modeDescription: string;
    recentTasks: any[];
    sessionSummary: string;
  } {
    const modeContext = this.modes[this.currentMode];
    const state = this.memory.getState();

    return {
      currentMode: this.currentMode,
      modeDescription: modeContext.description,
      recentTasks: state.taskHistory.slice(0, 5),
      sessionSummary: this.memory.getSessionSummary()
    };
  }

  /**
   * Switch mode with validation
   */
  switchMode(newMode: ExecutionMode): boolean {
    if (this.modes[newMode]) {
      this.setMode(newMode);

      // Show mode switch notification
      vscode.window.showInformationMessage(
        `Switched to ${this.modes[newMode].description} mode`
      );

      return true;
    }
    return false;
  }

  /**
   * Get mode recommendations for a request
   */
  getModeRecommendations(request: string): Array<{ mode: ExecutionMode; confidence: number; reason: string }> {
    const recommendations: Array<{ mode: ExecutionMode; confidence: number; reason: string }> = [];

    // Analyze request and provide recommendations
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes('error') || lowerRequest.includes('bug') || lowerRequest.includes('fix')) {
      recommendations.push({
        mode: 'debug' as ExecutionMode,
        confidence: 0.9,
        reason: 'Request involves debugging or fixing issues'
      });
    }

    if (lowerRequest.includes('design') || lowerRequest.includes('architecture') || lowerRequest.includes('plan')) {
      recommendations.push({
        mode: 'architect' as ExecutionMode,
        confidence: 0.8,
        reason: 'Request involves system design or planning'
      });
    }

    if (lowerRequest.includes('project') || lowerRequest.includes('build') || lowerRequest.includes('create')) {
      recommendations.push({
        mode: 'orchestrator' as ExecutionMode,
        confidence: 0.7,
        reason: 'Request involves complex project tasks'
      });
    }

    if (lowerRequest.includes('code') || lowerRequest.includes('implement') || lowerRequest.includes('write')) {
      recommendations.push({
        mode: 'code' as ExecutionMode,
        confidence: 0.6,
        reason: 'Request involves code writing or editing'
      });
    }

    // Sort by confidence
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}
