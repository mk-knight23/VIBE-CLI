export interface PlanResponse {
  title: string;
  phases: Phase[];
  diagram: string;  // Mermaid
  risks: Risk[];
  effort: EffortEstimate;
  parallelizable: string[];
}

export interface Phase {
  name: string;
  description: string;
  subtasks: SubTask[];
  duration: string;  // "1-2 days"
  dependencies: string[];  // phase names
  parallel: boolean;
}

export interface SubTask {
  description: string;
  completed: boolean;
  estimatedHours: number;
}

export interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface EffortEstimate {
  totalHours: number;
  breakdown: { [phase: string]: number };
  confidence: number;  // 0-1
}

export interface ProjectContext {
  workingDir: string;
  files?: string[];
  dependencies?: string[];
  framework?: string;
  language?: string;
  teamSize?: number;
}

export class PlanGenerator {
  async generatePlan(
    task: string,
    context: ProjectContext
  ): Promise<PlanResponse> {
    
    const phases = this.analyzeTaskPhases(task, context);
    const diagram = this.generateMermaid(phases);
    const effort = this.calculateEffort(phases);
    const risks = this.identifyRisks(phases, context);
    const parallelizable = this.findParallelizablePhases(phases);

    return {
      title: this.generateTitle(task),
      phases,
      diagram,
      risks,
      effort,
      parallelizable
    };
  }

  private analyzeTaskPhases(task: string, context: ProjectContext): Phase[] {
    const taskLower = task.toLowerCase();
    
    // Architecture/Design tasks
    if (taskLower.includes('design') || taskLower.includes('architecture')) {
      return this.createArchitecturePhases(task, context);
    }
    
    // Development tasks
    if (taskLower.includes('implement') || taskLower.includes('build') || taskLower.includes('create')) {
      return this.createDevelopmentPhases(task, context);
    }
    
    // Refactoring tasks
    if (taskLower.includes('refactor') || taskLower.includes('improve') || taskLower.includes('optimize')) {
      return this.createRefactoringPhases(task, context);
    }
    
    // Default development phases
    return this.createDevelopmentPhases(task, context);
  }

  private createArchitecturePhases(task: string, context: ProjectContext): Phase[] {
    return [
      {
        name: 'Requirements Analysis',
        description: 'Analyze requirements and constraints',
        subtasks: [
          { description: 'Gather functional requirements', completed: false, estimatedHours: 4 },
          { description: 'Identify non-functional requirements', completed: false, estimatedHours: 2 },
          { description: 'Document constraints', completed: false, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'System Design',
        description: 'Create high-level system architecture',
        subtasks: [
          { description: 'Design system components', completed: false, estimatedHours: 6 },
          { description: 'Define interfaces', completed: false, estimatedHours: 4 },
          { description: 'Create architecture diagrams', completed: false, estimatedHours: 2 }
        ],
        duration: '1-2 days',
        dependencies: ['Requirements Analysis'],
        parallel: false
      },
      {
        name: 'Technology Selection',
        description: 'Choose appropriate technologies and frameworks',
        subtasks: [
          { description: 'Evaluate technology options', completed: false, estimatedHours: 4 },
          { description: 'Create proof of concepts', completed: false, estimatedHours: 8 },
          { description: 'Document technology decisions', completed: false, estimatedHours: 2 }
        ],
        duration: '2 days',
        dependencies: ['System Design'],
        parallel: true
      },
      {
        name: 'Implementation Planning',
        description: 'Plan implementation approach',
        subtasks: [
          { description: 'Break down into development phases', completed: false, estimatedHours: 3 },
          { description: 'Estimate effort and timeline', completed: false, estimatedHours: 2 },
          { description: 'Identify risks and mitigation', completed: false, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: ['Technology Selection'],
        parallel: false
      }
    ];
  }

  private createDevelopmentPhases(task: string, context: ProjectContext): Phase[] {
    return [
      {
        name: 'Setup & Planning',
        description: 'Initialize project structure and plan implementation',
        subtasks: [
          { description: 'Set up project structure', completed: false, estimatedHours: 2 },
          { description: 'Configure development environment', completed: false, estimatedHours: 3 },
          { description: 'Plan implementation approach', completed: false, estimatedHours: 2 }
        ],
        duration: '0.5-1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'Core Implementation',
        description: 'Implement main functionality',
        subtasks: [
          { description: 'Implement core features', completed: false, estimatedHours: 12 },
          { description: 'Add error handling', completed: false, estimatedHours: 4 },
          { description: 'Write unit tests', completed: false, estimatedHours: 6 }
        ],
        duration: '2-3 days',
        dependencies: ['Setup & Planning'],
        parallel: false
      },
      {
        name: 'Integration & Testing',
        description: 'Integrate components and test thoroughly',
        subtasks: [
          { description: 'Integration testing', completed: false, estimatedHours: 4 },
          { description: 'End-to-end testing', completed: false, estimatedHours: 3 },
          { description: 'Performance testing', completed: false, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: ['Core Implementation'],
        parallel: true
      },
      {
        name: 'Documentation & Deployment',
        description: 'Document and deploy the solution',
        subtasks: [
          { description: 'Write documentation', completed: false, estimatedHours: 3 },
          { description: 'Prepare deployment', completed: false, estimatedHours: 2 },
          { description: 'Deploy and verify', completed: false, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: ['Integration & Testing'],
        parallel: true
      }
    ];
  }

  private createRefactoringPhases(task: string, context: ProjectContext): Phase[] {
    return [
      {
        name: 'Analysis',
        description: 'Analyze current code and identify improvements',
        subtasks: [
          { description: 'Code quality analysis', completed: false, estimatedHours: 4 },
          { description: 'Identify refactoring opportunities', completed: false, estimatedHours: 3 },
          { description: 'Plan refactoring strategy', completed: false, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'Refactoring',
        description: 'Implement code improvements',
        subtasks: [
          { description: 'Refactor core components', completed: false, estimatedHours: 8 },
          { description: 'Update tests', completed: false, estimatedHours: 4 },
          { description: 'Verify functionality', completed: false, estimatedHours: 2 }
        ],
        duration: '1-2 days',
        dependencies: ['Analysis'],
        parallel: false
      },
      {
        name: 'Validation',
        description: 'Validate improvements and performance',
        subtasks: [
          { description: 'Performance benchmarking', completed: false, estimatedHours: 2 },
          { description: 'Code quality verification', completed: false, estimatedHours: 2 },
          { description: 'Update documentation', completed: false, estimatedHours: 2 }
        ],
        duration: '0.5 day',
        dependencies: ['Refactoring'],
        parallel: false
      }
    ];
  }

  generateMermaid(phases: Phase[]): string {
    const mermaidGenerator = new MermaidDiagramGenerator();
    return mermaidGenerator.generateGantt(phases);
  }

  calculateEffort(phases: Phase[]): EffortEstimate {
    const breakdown: { [phase: string]: number } = {};
    let totalHours = 0;

    phases.forEach(phase => {
      const phaseHours = phase.subtasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      breakdown[phase.name] = phaseHours;
      totalHours += phaseHours;
    });

    // Confidence based on task complexity and dependencies
    const complexity = phases.length;
    const dependencies = phases.reduce((sum, p) => sum + p.dependencies.length, 0);
    const confidence = Math.max(0.6, 1 - (complexity * 0.05) - (dependencies * 0.02));

    return {
      totalHours,
      breakdown,
      confidence: Math.min(0.95, confidence)
    };
  }

  identifyRisks(phases: Phase[], context: ProjectContext): Risk[] {
    const risks: Risk[] = [];

    // Dependency risks
    const complexDependencies = phases.filter(p => p.dependencies.length > 2);
    if (complexDependencies.length > 0) {
      risks.push({
        description: 'Complex dependency chain may cause delays',
        severity: 'medium',
        mitigation: 'Plan parallel execution where possible and maintain clear communication'
      });
    }

    // Technology risks
    if (context.framework && ['new', 'experimental', 'beta'].some(word => 
        context.framework!.toLowerCase().includes(word))) {
      risks.push({
        description: 'Using experimental technology may introduce instability',
        severity: 'high',
        mitigation: 'Create proof of concept early and have fallback options'
      });
    }

    // Scope risks
    const totalHours = phases.reduce((sum, p) => 
      sum + p.subtasks.reduce((s, t) => s + t.estimatedHours, 0), 0);
    
    if (totalHours > 40) {
      risks.push({
        description: 'Large scope may lead to timeline overruns',
        severity: 'medium',
        mitigation: 'Break into smaller milestones and review progress regularly'
      });
    }

    // Team size risks
    if (context.teamSize && context.teamSize === 1 && totalHours > 20) {
      risks.push({
        description: 'Single developer may become bottleneck',
        severity: 'medium',
        mitigation: 'Consider pair programming or code reviews for critical components'
      });
    }

    return risks;
  }

  private findParallelizablePhases(phases: Phase[]): string[] {
    return phases.filter(phase => phase.parallel).map(phase => phase.name);
  }

  private generateTitle(task: string): string {
    const words = task.split(' ').slice(0, 6);
    return words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}

export class MermaidDiagramGenerator {
  generateGantt(phases: Phase[]): string {
    let mermaid = 'gantt\n';
    mermaid += '    title Project Timeline\n';
    mermaid += '    dateFormat  YYYY-MM-DD\n';
    mermaid += '    axisFormat  %m/%d\n\n';

    const startDate = new Date();
    let currentDate = new Date(startDate);

    phases.forEach((phase, index) => {
      const duration = this.parseDuration(phase.duration);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + duration);

      const section = phase.name.replace(/\s+/g, '');
      mermaid += `    section ${phase.name}\n`;
      
      phase.subtasks.forEach(subtask => {
        const taskName = subtask.description.substring(0, 30);
        const status = subtask.completed ? 'done' : 'active';
        mermaid += `    ${taskName} :${status}, ${this.formatDate(currentDate)}, ${duration}d\n`;
      });

      currentDate = new Date(endDate);
      mermaid += '\n';
    });

    return mermaid;
  }

  generateFlowchart(phases: Phase[]): string {
    let mermaid = 'flowchart TD\n';
    
    phases.forEach((phase, index) => {
      const nodeId = `P${index + 1}`;
      mermaid += `    ${nodeId}[${phase.name}]\n`;
      
      phase.dependencies.forEach(dep => {
        const depIndex = phases.findIndex(p => p.name === dep);
        if (depIndex !== -1) {
          mermaid += `    P${depIndex + 1} --> ${nodeId}\n`;
        }
      });
    });

    return mermaid;
  }

  generateGraphDependencies(phases: Phase[]): string {
    let mermaid = 'graph LR\n';
    
    phases.forEach((phase, index) => {
      const nodeId = `P${index + 1}`;
      const label = phase.name.substring(0, 15);
      mermaid += `    ${nodeId}["${label}"]\n`;
    });

    phases.forEach((phase, index) => {
      const nodeId = `P${index + 1}`;
      phase.dependencies.forEach(dep => {
        const depIndex = phases.findIndex(p => p.name === dep);
        if (depIndex !== -1) {
          mermaid += `    P${depIndex + 1} --> ${nodeId}\n`;
        }
      });
    });

    return mermaid;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export class PlanFormatter {
  format(plan: PlanResponse): string {
    let output = `# ${plan.title}\n\n`;
    
    // Overview
    output += `## Overview\n`;
    output += `- **Total Effort:** ${plan.effort.totalHours} hours\n`;
    output += `- **Confidence:** ${(plan.effort.confidence * 100).toFixed(0)}%\n`;
    output += `- **Phases:** ${plan.phases.length}\n`;
    if (plan.parallelizable.length > 0) {
      output += `- **Parallelizable:** ${plan.parallelizable.join(', ')}\n`;
    }
    output += '\n';

    // Timeline diagram
    output += `## Timeline\n\n`;
    output += '```mermaid\n';
    output += plan.diagram;
    output += '\n```\n\n';

    // Phases
    output += `## Implementation Phases\n\n`;
    plan.phases.forEach((phase, index) => {
      output += `### ${index + 1}. ${phase.name}\n`;
      output += `${phase.description}\n\n`;
      output += `**Duration:** ${phase.duration}\n`;
      if (phase.dependencies.length > 0) {
        output += `**Dependencies:** ${phase.dependencies.join(', ')}\n`;
      }
      output += `**Estimated Hours:** ${phase.subtasks.reduce((sum, t) => sum + t.estimatedHours, 0)}\n\n`;
      
      output += `**Tasks:**\n`;
      phase.subtasks.forEach(task => {
        const checkbox = task.completed ? '[x]' : '[ ]';
        output += `- ${checkbox} ${task.description} (${task.estimatedHours}h)\n`;
      });
      output += '\n';
    });

    // Risks
    if (plan.risks.length > 0) {
      output += `## Risk Assessment\n\n`;
      plan.risks.forEach(risk => {
        const emoji = risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟡' : '🟢';
        output += `${emoji} **${risk.severity.toUpperCase()}:** ${risk.description}\n`;
        output += `   *Mitigation:* ${risk.mitigation}\n\n`;
      });
    }

    // Effort breakdown
    output += `## Effort Breakdown\n\n`;
    Object.entries(plan.effort.breakdown).forEach(([phase, hours]) => {
      const percentage = ((hours / plan.effort.totalHours) * 100).toFixed(1);
      output += `- **${phase}:** ${hours}h (${percentage}%)\n`;
    });

    return output;
  }

  renderWithCheckboxes(plan: PlanResponse): string {
    return this.format(plan);
  }
}
