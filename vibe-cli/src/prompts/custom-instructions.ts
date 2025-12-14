import * as fs from 'fs';
import * as path from 'path';

export interface CustomInstructions {
  projectLevel: ProjectInstructions;
  teamLevel: TeamInstructions;
  global: GlobalInstructions;
}

export interface ProjectInstructions {
  codeStyle: string[];
  securityRules: string[];
  performanceGoals: string[];
  customRules: string[];
  file: string;  // .vibe/instructions.md
}

export interface TeamInstructions {
  roles: { [role: string]: string[] };
  standards: string[];
  approvalProcess: string;
  file: string;  // .vibe/team-rules.md
}

export interface GlobalInstructions {
  defaultBehavior: string[];
  safetyRules: string[];
  outputFormat: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarkdownValidationResult {
  valid: boolean;
  sections: string[];
  missingRequired: string[];
}

export interface Conflict {
  type: 'rule_conflict' | 'style_conflict' | 'process_conflict';
  description: string;
  sources: string[];
  suggestion: string;
}

export class InstructionLoader {
  async loadProjectInstructions(projectRoot: string): Promise<ProjectInstructions> {
    const instructionsPath = path.join(projectRoot, '.vibe', 'instructions.md');
    
    const defaultInstructions: ProjectInstructions = {
      codeStyle: [],
      securityRules: [],
      performanceGoals: [],
      customRules: [],
      file: instructionsPath
    };

    if (!fs.existsSync(instructionsPath)) {
      return defaultInstructions;
    }

    try {
      const content = fs.readFileSync(instructionsPath, 'utf-8');
      return this.parseProjectInstructions(content, instructionsPath);
    } catch (error) {
      console.warn(`Failed to load project instructions: ${error}`);
      return defaultInstructions;
    }
  }

  async loadTeamInstructions(projectRoot: string): Promise<TeamInstructions> {
    const teamRulesPath = path.join(projectRoot, '.vibe', 'team-rules.md');
    
    const defaultInstructions: TeamInstructions = {
      roles: {},
      standards: [],
      approvalProcess: '',
      file: teamRulesPath
    };

    if (!fs.existsSync(teamRulesPath)) {
      return defaultInstructions;
    }

    try {
      const content = fs.readFileSync(teamRulesPath, 'utf-8');
      return this.parseTeamInstructions(content, teamRulesPath);
    } catch (error) {
      console.warn(`Failed to load team instructions: ${error}`);
      return defaultInstructions;
    }
  }

  loadGlobalInstructions(): GlobalInstructions {
    return {
      defaultBehavior: [
        'Always provide clear, actionable responses',
        'Explain your reasoning when making decisions',
        'Ask for clarification when requirements are ambiguous',
        'Prioritize security and best practices'
      ],
      safetyRules: [
        'Never execute potentially harmful commands without confirmation',
        'Always validate user input',
        'Respect privacy and confidentiality',
        'Follow ethical AI guidelines'
      ],
      outputFormat: [
        'Use markdown formatting for structured responses',
        'Include code examples when relevant',
        'Provide step-by-step instructions for complex tasks',
        'Use clear headings and bullet points'
      ]
    };
  }

  async mergeAll(projectRoot: string): Promise<CustomInstructions> {
    const [projectLevel, teamLevel, global] = await Promise.all([
      this.loadProjectInstructions(projectRoot),
      this.loadTeamInstructions(projectRoot),
      Promise.resolve(this.loadGlobalInstructions())
    ]);

    return {
      projectLevel,
      teamLevel,
      global
    };
  }

  private parseProjectInstructions(content: string, filePath: string): ProjectInstructions {
    const instructions: ProjectInstructions = {
      codeStyle: [],
      securityRules: [],
      performanceGoals: [],
      customRules: [],
      file: filePath
    };

    const sections = this.parseMarkdownSections(content);

    instructions.codeStyle = sections['Code Style'] || sections['code style'] || [];
    instructions.securityRules = sections['Security Rules'] || sections['security'] || [];
    instructions.performanceGoals = sections['Performance Goals'] || sections['performance'] || [];
    instructions.customRules = sections['Custom Rules'] || sections['rules'] || [];

    return instructions;
  }

  private parseTeamInstructions(content: string, filePath: string): TeamInstructions {
    const instructions: TeamInstructions = {
      roles: {},
      standards: [],
      approvalProcess: '',
      file: filePath
    };

    const sections = this.parseMarkdownSections(content);

    // Parse roles
    const rolesSection = sections['Roles'] || sections['roles'] || [];
    rolesSection.forEach(line => {
      const match = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.+)$/);
      if (match) {
        const [, role, description] = match;
        instructions.roles[role] = [description];
      }
    });

    instructions.standards = sections['Standards'] || sections['Code Review Standards'] || [];
    instructions.approvalProcess = (sections['Approval Process'] || sections['Deployment Procedure'] || []).join('\n');

    return instructions;
  }

  private parseMarkdownSections(content: string): { [section: string]: string[] } {
    const sections: { [section: string]: string[] } = {};
    const lines = content.split('\n');
    
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for section headers
      if (trimmed.startsWith('##')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.filter(l => l.trim());
        }
        
        // Start new section
        currentSection = trimmed.replace(/^#+\s*/, '');
        currentContent = [];
      } else if (currentSection && trimmed) {
        currentContent.push(trimmed);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.filter(l => l.trim());
    }

    return sections;
  }
}

export class InstructionValidator {
  validate(instructions: CustomInstructions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate project instructions
    if (instructions.projectLevel.codeStyle.length === 0) {
      warnings.push('No code style rules defined');
    }

    if (instructions.projectLevel.securityRules.length === 0) {
      warnings.push('No security rules defined');
    }

    // Validate team instructions
    if (Object.keys(instructions.teamLevel.roles).length === 0) {
      warnings.push('No team roles defined');
    }

    if (!instructions.teamLevel.approvalProcess) {
      warnings.push('No approval process defined');
    }

    // Check for conflicts
    const conflicts = this.detectConflicts(instructions);
    conflicts.forEach(conflict => {
      errors.push(`Conflict: ${conflict.description}`);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateMarkdown(content: string): MarkdownValidationResult {
    const sections = this.extractSections(content);
    const requiredSections = ['Code Style', 'Security Rules'];
    const missingRequired = requiredSections.filter(section => !sections.includes(section));

    return {
      valid: missingRequired.length === 0,
      sections,
      missingRequired
    };
  }

  detectConflicts(instructions: CustomInstructions): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for conflicting code style rules
    const allStyleRules = [
      ...instructions.projectLevel.codeStyle,
      ...instructions.global.defaultBehavior
    ];

    // Simple conflict detection (would be more sophisticated in production)
    if (allStyleRules.some(rule => rule.includes('tabs')) && 
        allStyleRules.some(rule => rule.includes('spaces'))) {
      conflicts.push({
        type: 'style_conflict',
        description: 'Conflicting indentation preferences (tabs vs spaces)',
        sources: ['project', 'global'],
        suggestion: 'Choose either tabs or spaces consistently'
      });
    }

    return conflicts;
  }

  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        sections.push(trimmed.replace(/^#+\s*/, ''));
      }
    }

    return sections;
  }
}

export class InstructionInjector {
  injectIntoSystemPrompt(systemPrompt: string, instructions: CustomInstructions): string {
    let enhancedPrompt = systemPrompt;

    // Add global instructions
    enhancedPrompt += '\n\n## Global Guidelines:\n';
    enhancedPrompt += instructions.global.defaultBehavior.map(rule => `- ${rule}`).join('\n');

    // Add project-specific instructions
    if (instructions.projectLevel.codeStyle.length > 0) {
      enhancedPrompt += '\n\n## Code Style Requirements:\n';
      enhancedPrompt += instructions.projectLevel.codeStyle.map(rule => `- ${rule}`).join('\n');
    }

    if (instructions.projectLevel.securityRules.length > 0) {
      enhancedPrompt += '\n\n## Security Requirements:\n';
      enhancedPrompt += instructions.projectLevel.securityRules.map(rule => `- ${rule}`).join('\n');
    }

    // Add team-specific instructions
    if (Object.keys(instructions.teamLevel.roles).length > 0) {
      enhancedPrompt += '\n\n## Team Roles and Responsibilities:\n';
      Object.entries(instructions.teamLevel.roles).forEach(([role, responsibilities]) => {
        enhancedPrompt += `- **${role}**: ${responsibilities.join(', ')}\n`;
      });
    }

    if (instructions.teamLevel.approvalProcess) {
      enhancedPrompt += '\n\n## Approval Process:\n';
      enhancedPrompt += instructions.teamLevel.approvalProcess;
    }

    return enhancedPrompt;
  }

  createCustomPrompt(instructions: CustomInstructions, context: string): string {
    let prompt = `You are an AI assistant working on a project with specific requirements.\n\n`;
    
    prompt += `**Context**: ${context}\n\n`;
    
    // Add relevant instructions based on context
    if (context.toLowerCase().includes('code') || context.toLowerCase().includes('development')) {
      prompt += '**Code Style Guidelines**:\n';
      prompt += instructions.projectLevel.codeStyle.map(rule => `- ${rule}`).join('\n');
      prompt += '\n\n';
    }

    if (context.toLowerCase().includes('security') || context.toLowerCase().includes('audit')) {
      prompt += '**Security Requirements**:\n';
      prompt += instructions.projectLevel.securityRules.map(rule => `- ${rule}`).join('\n');
      prompt += '\n\n';
    }

    prompt += '**General Guidelines**:\n';
    prompt += instructions.global.defaultBehavior.map(rule => `- ${rule}`).join('\n');

    return prompt;
  }
}

// Template generators
export const PROJECT_INSTRUCTIONS_TEMPLATE = `# Project Instructions

## Code Style
- Use TypeScript strict mode
- Max 100 characters per line
- Prefer const over let/var
- Use meaningful variable names
- Add JSDoc comments for public functions

## Security Rules
- Never log passwords or sensitive data
- Validate all user input
- Use prepared statements for database queries
- Implement proper authentication and authorization
- Keep dependencies up to date

## Performance Goals
- Keep bundle size under 200KB
- Page load time under 100ms
- API response time under 200ms
- Optimize images and assets
- Use lazy loading where appropriate

## Custom Rules
- Follow the existing project structure
- Write tests for new features
- Update documentation when adding features
- Use the project's error handling patterns
`;

export const TEAM_RULES_TEMPLATE = `# Team Rules

## Roles
- **Tech Lead**: Architecture decisions, code reviews, mentoring
- **Senior Developer**: Feature implementation, code reviews, technical guidance
- **Developer**: Feature implementation, bug fixes, testing
- **QA Engineer**: Test planning, manual testing, automation

## Code Review Standards
- Require 2 approvals for production code
- All tests must pass before merge
- Check for security vulnerabilities
- Verify performance impact
- Ensure documentation is updated

## Deployment Procedure
- Deploy to staging environment first
- Run full test suite
- Require team lead approval for production
- Monitor for 24 hours after deployment
- Have rollback plan ready

## Communication Guidelines
- Use Slack for daily communication
- Weekly team meetings on Mondays
- Document decisions in team wiki
- Escalate blockers immediately
`;

export function createInstructionFiles(projectRoot: string): void {
  const vibeDir = path.join(projectRoot, '.vibe');
  
  if (!fs.existsSync(vibeDir)) {
    fs.mkdirSync(vibeDir, { recursive: true });
  }

  const instructionsPath = path.join(vibeDir, 'instructions.md');
  const teamRulesPath = path.join(vibeDir, 'team-rules.md');

  if (!fs.existsSync(instructionsPath)) {
    fs.writeFileSync(instructionsPath, PROJECT_INSTRUCTIONS_TEMPLATE);
  }

  if (!fs.existsSync(teamRulesPath)) {
    fs.writeFileSync(teamRulesPath, TEAM_RULES_TEMPLATE);
  }
}
