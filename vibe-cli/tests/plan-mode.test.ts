import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PlanGenerator, 
  MermaidDiagramGenerator, 
  PlanFormatter,
  ProjectContext 
} from '../src/response-formats/plan-mode';

describe('PlanGenerator', () => {
  let generator: PlanGenerator;
  let context: ProjectContext;

  beforeEach(() => {
    generator = new PlanGenerator();
    context = {
      workingDir: '/test/project',
      language: 'typescript',
      framework: 'react',
      teamSize: 2
    };
  });

  it('should generate architecture plan for design tasks', async () => {
    const task = 'Design a microservices architecture for the e-commerce platform';
    const plan = await generator.generatePlan(task, context);

    expect(plan.title).toContain('Design');
    expect(plan.phases.length).toBeGreaterThan(0);
    expect(plan.phases.some(p => p.name.includes('Requirements'))).toBe(true);
    expect(plan.phases.some(p => p.name.includes('System Design'))).toBe(true);
    expect(plan.diagram).toContain('gantt');
    expect(plan.effort.totalHours).toBeGreaterThan(0);
  });

  it('should generate development plan for implementation tasks', async () => {
    const task = 'Implement user authentication with JWT tokens';
    const plan = await generator.generatePlan(task, context);

    expect(plan.title).toContain('Implement');
    expect(plan.phases.some(p => p.name.includes('Setup'))).toBe(true);
    expect(plan.phases.some(p => p.name.includes('Implementation'))).toBe(true);
    expect(plan.phases.some(p => p.name.includes('Testing'))).toBe(true);
    expect(plan.effort.totalHours).toBeGreaterThan(10);
  });

  it('should generate refactoring plan for improvement tasks', async () => {
    const task = 'Refactor the legacy payment processing module';
    const plan = await generator.generatePlan(task, context);

    expect(plan.title).toContain('Refactor');
    expect(plan.phases.some(p => p.name.includes('Analysis'))).toBe(true);
    expect(plan.phases.some(p => p.name.includes('Refactoring'))).toBe(true);
    expect(plan.phases.some(p => p.name.includes('Validation'))).toBe(true);
  });

  it('should calculate effort correctly', async () => {
    const task = 'Build a simple REST API';
    const plan = await generator.generatePlan(task, context);

    expect(plan.effort.totalHours).toBeGreaterThan(0);
    expect(plan.effort.confidence).toBeGreaterThan(0);
    expect(plan.effort.confidence).toBeLessThanOrEqual(1);
    
    // Breakdown should sum to total
    const breakdownSum = Object.values(plan.effort.breakdown).reduce((sum, hours) => sum + hours, 0);
    expect(breakdownSum).toBe(plan.effort.totalHours);
  });

  it('should identify risks appropriately', async () => {
    const complexContext = {
      ...context,
      framework: 'experimental-framework',
      teamSize: 1
    };
    
    const task = 'Build a complex distributed system with real-time features';
    const plan = await generator.generatePlan(task, complexContext);

    expect(plan.risks.length).toBeGreaterThan(0);
    expect(plan.risks.some(r => r.severity === 'high' || r.severity === 'medium')).toBe(true);
    expect(plan.risks.every(r => r.mitigation.length > 0)).toBe(true);
  });

  it('should identify parallelizable phases', async () => {
    const task = 'Implement a web application with testing and documentation';
    const plan = await generator.generatePlan(task, context);

    expect(plan.parallelizable).toBeDefined();
    expect(Array.isArray(plan.parallelizable)).toBe(true);
  });

  it('should handle different team sizes', async () => {
    const smallTeamContext = { ...context, teamSize: 1 };
    const largeTeamContext = { ...context, teamSize: 5 };
    
    const task = 'Build a medium-sized web application';
    
    const smallTeamPlan = await generator.generatePlan(task, smallTeamContext);
    const largeTeamPlan = await generator.generatePlan(task, largeTeamContext);

    // Small team should have more risks
    expect(smallTeamPlan.risks.length).toBeGreaterThanOrEqual(largeTeamPlan.risks.length);
  });
});

describe('MermaidDiagramGenerator', () => {
  let generator: MermaidDiagramGenerator;

  beforeEach(() => {
    generator = new MermaidDiagramGenerator();
  });

  it('should generate valid Gantt chart', () => {
    const phases = [
      {
        name: 'Phase 1',
        description: 'First phase',
        subtasks: [
          { description: 'Task 1', completed: false, estimatedHours: 4 },
          { description: 'Task 2', completed: true, estimatedHours: 2 }
        ],
        duration: '1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'Phase 2',
        description: 'Second phase',
        subtasks: [
          { description: 'Task 3', completed: false, estimatedHours: 6 }
        ],
        duration: '2 days',
        dependencies: ['Phase 1'],
        parallel: false
      }
    ];

    const gantt = generator.generateGantt(phases);

    expect(gantt).toContain('gantt');
    expect(gantt).toContain('title Project Timeline');
    expect(gantt).toContain('section Phase 1');
    expect(gantt).toContain('section Phase 2');
    expect(gantt).toContain('Task 1');
    expect(gantt).toContain('Task 2');
    expect(gantt).toContain('Task 3');
  });

  it('should generate valid flowchart', () => {
    const phases = [
      {
        name: 'Start',
        description: 'Starting phase',
        subtasks: [],
        duration: '1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'Middle',
        description: 'Middle phase',
        subtasks: [],
        duration: '1 day',
        dependencies: ['Start'],
        parallel: false
      }
    ];

    const flowchart = generator.generateFlowchart(phases);

    expect(flowchart).toContain('flowchart TD');
    expect(flowchart).toContain('P1[Start]');
    expect(flowchart).toContain('P2[Middle]');
    expect(flowchart).toContain('P1 --> P2');
  });

  it('should generate dependency graph', () => {
    const phases = [
      {
        name: 'Analysis',
        description: 'Analysis phase',
        subtasks: [],
        duration: '1 day',
        dependencies: [],
        parallel: false
      },
      {
        name: 'Implementation',
        description: 'Implementation phase',
        subtasks: [],
        duration: '2 days',
        dependencies: ['Analysis'],
        parallel: false
      }
    ];

    const graph = generator.generateGraphDependencies(phases);

    expect(graph).toContain('graph LR');
    expect(graph).toContain('P1["Analysis"]');
    expect(graph).toContain('P2["Implementation"]');
    expect(graph).toContain('P1 --> P2');
  });
});

describe('PlanFormatter', () => {
  let formatter: PlanFormatter;

  beforeEach(() => {
    formatter = new PlanFormatter();
  });

  it('should format complete plan correctly', () => {
    const plan = {
      title: 'Test Project Plan',
      phases: [
        {
          name: 'Setup',
          description: 'Initial setup',
          subtasks: [
            { description: 'Configure environment', completed: false, estimatedHours: 2 },
            { description: 'Install dependencies', completed: true, estimatedHours: 1 }
          ],
          duration: '0.5 day',
          dependencies: [],
          parallel: false
        }
      ],
      diagram: 'gantt\n    title Test\n',
      risks: [
        {
          description: 'Technology risk',
          severity: 'medium' as const,
          mitigation: 'Use proven alternatives'
        }
      ],
      effort: {
        totalHours: 3,
        breakdown: { 'Setup': 3 },
        confidence: 0.85
      },
      parallelizable: []
    };

    const formatted = formatter.format(plan);

    expect(formatted).toContain('# Test Project Plan');
    expect(formatted).toContain('## Overview');
    expect(formatted).toContain('**Total Effort:** 3 hours');
    expect(formatted).toContain('**Confidence:** 85%');
    expect(formatted).toContain('## Timeline');
    expect(formatted).toContain('```mermaid');
    expect(formatted).toContain('## Implementation Phases');
    expect(formatted).toContain('### 1. Setup');
    expect(formatted).toContain('## Risk Assessment');
    expect(formatted).toContain('🟡 **MEDIUM:** Technology risk');
    expect(formatted).toContain('## Effort Breakdown');
    expect(formatted).toContain('- **Setup:** 3h (100.0%)');
  });

  it('should handle plans without risks', () => {
    const plan = {
      title: 'Simple Plan',
      phases: [],
      diagram: '',
      risks: [],
      effort: { totalHours: 0, breakdown: {}, confidence: 1 },
      parallelizable: []
    };

    const formatted = formatter.format(plan);

    expect(formatted).not.toContain('## Risk Assessment');
    expect(formatted).toContain('# Simple Plan');
  });

  it('should show parallelizable phases', () => {
    const plan = {
      title: 'Parallel Plan',
      phases: [],
      diagram: '',
      risks: [],
      effort: { totalHours: 0, breakdown: {}, confidence: 1 },
      parallelizable: ['Testing', 'Documentation']
    };

    const formatted = formatter.format(plan);

    expect(formatted).toContain('**Parallelizable:** Testing, Documentation');
  });

  it('should render checkboxes correctly', () => {
    const plan = {
      title: 'Checkbox Plan',
      phases: [
        {
          name: 'Development',
          description: 'Dev phase',
          subtasks: [
            { description: 'Completed task', completed: true, estimatedHours: 1 },
            { description: 'Pending task', completed: false, estimatedHours: 2 }
          ],
          duration: '1 day',
          dependencies: [],
          parallel: false
        }
      ],
      diagram: '',
      risks: [],
      effort: { totalHours: 3, breakdown: { 'Development': 3 }, confidence: 1 },
      parallelizable: []
    };

    const formatted = formatter.renderWithCheckboxes(plan);

    expect(formatted).toContain('- [x] Completed task (1h)');
    expect(formatted).toContain('- [ ] Pending task (2h)');
  });
});
