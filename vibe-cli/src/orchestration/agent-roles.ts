export enum AgentRole {
  ARCHITECT = 'architect',
  DEVELOPER = 'developer',
  VALIDATOR = 'validator',
  DEBUGGER = 'debugger',
  REVIEWER = 'reviewer'
}

export interface RoleDefinition {
  role: AgentRole;
  systemPrompt: string;
  allowedTools: string[];
  timeoutMs: number;
  priority: number;
  description: string;
}

export interface TaskAnalysis {
  primaryRole: AgentRole;
  supportingRoles: AgentRole[];
  confidence: number;
  reasoning: string;
}

// Role-specific system prompts
const ARCHITECT_PROMPT = `You are an expert software architect. Your role is to:
- Analyze requirements and design system architecture
- Break down complex tasks into manageable components
- Identify dependencies and potential issues
- Create high-level implementation plans
- Consider scalability, maintainability, and best practices

Focus on design decisions, not implementation details. Provide clear, structured plans.`;

const DEVELOPER_PROMPT = `You are an expert software developer. Your role is to:
- Write clean, efficient, and maintainable code
- Implement features according to specifications
- Follow coding standards and best practices
- Create necessary files and directory structures
- Handle edge cases and error conditions

Focus on implementation quality and functionality. Write production-ready code.`;

const VALIDATOR_PROMPT = `You are an expert code validator and tester. Your role is to:
- Review code for correctness and quality
- Write comprehensive test cases
- Verify functionality meets requirements
- Check for security vulnerabilities
- Ensure code follows best practices

Focus on quality assurance and testing. Be thorough and critical.`;

const DEBUGGER_PROMPT = `You are an expert debugger and problem solver. Your role is to:
- Analyze errors and identify root causes
- Trace through code execution paths
- Suggest fixes for bugs and issues
- Optimize performance bottlenecks
- Investigate unexpected behavior

Focus on problem diagnosis and resolution. Be systematic and methodical.`;

const REVIEWER_PROMPT = `You are an expert code reviewer. Your role is to:
- Conduct thorough code reviews
- Ensure adherence to coding standards
- Check for maintainability and readability
- Identify potential improvements
- Verify documentation quality

Focus on code quality and team standards. Provide constructive feedback.`;

// Tool access definitions per role
const ROLE_TOOLS = {
  [AgentRole.ARCHITECT]: [
    'read_file',
    'analyze_code',
    'search_files',
    'list_directory',
    'get_project_structure'
  ],
  [AgentRole.DEVELOPER]: [
    'read_file',
    'write_file',
    'create_file',
    'run_shell',
    'install_package',
    'git_operations'
  ],
  [AgentRole.VALIDATOR]: [
    'run_tests',
    'analyze_coverage',
    'generate_reports',
    'security_scan',
    'lint_code'
  ],
  [AgentRole.DEBUGGER]: [
    'read_file',
    'run_shell',
    'analyze_logs',
    'trace_execution',
    'performance_profile'
  ],
  [AgentRole.REVIEWER]: [
    'read_file',
    'analyze_code',
    'generate_reports',
    'check_standards',
    'documentation_review'
  ]
};

export class RoleFactory {
  private roleDefinitions: Map<AgentRole, RoleDefinition>;

  constructor() {
    this.roleDefinitions = new Map();
    this.initializeRoles();
  }

  private initializeRoles(): void {
    this.roleDefinitions.set(AgentRole.ARCHITECT, {
      role: AgentRole.ARCHITECT,
      systemPrompt: ARCHITECT_PROMPT,
      allowedTools: ROLE_TOOLS[AgentRole.ARCHITECT],
      timeoutMs: 180000, // 3 minutes
      priority: 1,
      description: 'Designs system architecture and creates implementation plans'
    });

    this.roleDefinitions.set(AgentRole.DEVELOPER, {
      role: AgentRole.DEVELOPER,
      systemPrompt: DEVELOPER_PROMPT,
      allowedTools: ROLE_TOOLS[AgentRole.DEVELOPER],
      timeoutMs: 300000, // 5 minutes
      priority: 2,
      description: 'Implements features and writes production code'
    });

    this.roleDefinitions.set(AgentRole.VALIDATOR, {
      role: AgentRole.VALIDATOR,
      systemPrompt: VALIDATOR_PROMPT,
      allowedTools: ROLE_TOOLS[AgentRole.VALIDATOR],
      timeoutMs: 240000, // 4 minutes
      priority: 3,
      description: 'Tests code and ensures quality standards'
    });

    this.roleDefinitions.set(AgentRole.DEBUGGER, {
      role: AgentRole.DEBUGGER,
      systemPrompt: DEBUGGER_PROMPT,
      allowedTools: ROLE_TOOLS[AgentRole.DEBUGGER],
      timeoutMs: 360000, // 6 minutes
      priority: 2,
      description: 'Diagnoses issues and provides solutions'
    });

    this.roleDefinitions.set(AgentRole.REVIEWER, {
      role: AgentRole.REVIEWER,
      systemPrompt: REVIEWER_PROMPT,
      allowedTools: ROLE_TOOLS[AgentRole.REVIEWER],
      timeoutMs: 180000, // 3 minutes
      priority: 3,
      description: 'Reviews code quality and adherence to standards'
    });
  }

  createRole(role: AgentRole): RoleDefinition {
    const definition = this.roleDefinitions.get(role);
    if (!definition) {
      throw new Error(`Unknown agent role: ${role}`);
    }
    return { ...definition }; // Return a copy
  }

  getOptimalRole(task: string): AgentRole {
    const analysis = this.analyzeTask(task);
    return analysis.primaryRole;
  }

  analyzeTask(task: string): TaskAnalysis {
    const taskLower = task.toLowerCase();
    
    // Architecture keywords (highest priority for design tasks)
    if (this.containsKeywords(taskLower, ['design', 'architecture', 'plan', 'structure', 'organize'])) {
      return {
        primaryRole: AgentRole.ARCHITECT,
        supportingRoles: [AgentRole.DEVELOPER],
        confidence: 0.9,
        reasoning: 'Task involves system design and planning'
      };
    }

    // Testing/Validation keywords (high priority for test-related tasks)
    if (this.containsKeywords(taskLower, ['test', 'validate', 'verify', 'check', 'quality', 'cases'])) {
      return {
        primaryRole: AgentRole.VALIDATOR,
        supportingRoles: [AgentRole.REVIEWER],
        confidence: 0.8,
        reasoning: 'Task involves testing and validation'
      };
    }

    // Debugging keywords (high priority for problem-solving)
    if (this.containsKeywords(taskLower, ['debug', 'fix', 'error', 'bug', 'issue', 'problem'])) {
      return {
        primaryRole: AgentRole.DEBUGGER,
        supportingRoles: [AgentRole.DEVELOPER],
        confidence: 0.9,
        reasoning: 'Task involves debugging and problem solving'
      };
    }

    // Review keywords (specific review tasks)
    if (this.containsKeywords(taskLower, ['review', 'analyze', 'improve', 'refactor', 'optimize'])) {
      return {
        primaryRole: AgentRole.REVIEWER,
        supportingRoles: [AgentRole.DEVELOPER],
        confidence: 0.75,
        reasoning: 'Task involves code review and improvement'
      };
    }

    // Development keywords (general implementation tasks)
    if (this.containsKeywords(taskLower, ['implement', 'create', 'build', 'code', 'develop', 'write'])) {
      return {
        primaryRole: AgentRole.DEVELOPER,
        supportingRoles: [AgentRole.VALIDATOR],
        confidence: 0.85,
        reasoning: 'Task involves code implementation'
      };
    }

    // Default to developer for general tasks
    return {
      primaryRole: AgentRole.DEVELOPER,
      supportingRoles: [AgentRole.VALIDATOR],
      confidence: 0.5,
      reasoning: 'General development task'
    };
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  getRecommendedAgents(task: string, maxAgents: number = 3): AgentRole[] {
    const analysis = this.analyzeTask(task);
    const agents = [analysis.primaryRole];
    
    // Add supporting roles based on available slots
    for (const role of analysis.supportingRoles) {
      if (agents.length < maxAgents && !agents.includes(role)) {
        agents.push(role);
      }
    }

    // Fill remaining slots with complementary roles
    if (agents.length < maxAgents) {
      const complementaryRoles = this.getComplementaryRoles(analysis.primaryRole);
      for (const role of complementaryRoles) {
        if (agents.length < maxAgents && !agents.includes(role)) {
          agents.push(role);
        }
      }
    }

    return agents;
  }

  private getComplementaryRoles(primaryRole: AgentRole): AgentRole[] {
    switch (primaryRole) {
      case AgentRole.ARCHITECT:
        return [AgentRole.DEVELOPER, AgentRole.REVIEWER];
      case AgentRole.DEVELOPER:
        return [AgentRole.VALIDATOR, AgentRole.REVIEWER];
      case AgentRole.VALIDATOR:
        return [AgentRole.DEVELOPER, AgentRole.DEBUGGER];
      case AgentRole.DEBUGGER:
        return [AgentRole.DEVELOPER, AgentRole.VALIDATOR];
      case AgentRole.REVIEWER:
        return [AgentRole.DEVELOPER, AgentRole.VALIDATOR];
      default:
        return [AgentRole.DEVELOPER, AgentRole.VALIDATOR];
    }
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  getRolesByPriority(): RoleDefinition[] {
    return this.getAllRoles().sort((a, b) => a.priority - b.priority);
  }

  validateRoleCombination(roles: AgentRole[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for duplicate roles
    const uniqueRoles = new Set(roles);
    if (uniqueRoles.size !== roles.length) {
      issues.push('Duplicate roles detected');
    }

    // Check for conflicting roles
    if (roles.includes(AgentRole.DEVELOPER) && roles.includes(AgentRole.REVIEWER)) {
      // This is actually good - developer + reviewer is a common pattern
    }

    // Validate role count
    if (roles.length > 5) {
      issues.push('Too many agents (maximum 5)');
    }

    if (roles.length === 0) {
      issues.push('At least one agent role is required');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
