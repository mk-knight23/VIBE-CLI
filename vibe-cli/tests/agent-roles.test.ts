import { describe, it, expect, beforeEach } from 'vitest';
import { RoleFactory, AgentRole } from '../src/orchestration/agent-roles';

describe('RoleFactory', () => {
  let roleFactory: RoleFactory;

  beforeEach(() => {
    roleFactory = new RoleFactory();
  });

  it('should initialize all roles correctly', () => {
    const allRoles = roleFactory.getAllRoles();
    
    expect(allRoles).toHaveLength(5);
    
    const roleNames = allRoles.map(r => r.role);
    expect(roleNames).toContain(AgentRole.ARCHITECT);
    expect(roleNames).toContain(AgentRole.DEVELOPER);
    expect(roleNames).toContain(AgentRole.VALIDATOR);
    expect(roleNames).toContain(AgentRole.DEBUGGER);
    expect(roleNames).toContain(AgentRole.REVIEWER);
  });

  it('should validate tool access for each role', () => {
    const architectRole = roleFactory.createRole(AgentRole.ARCHITECT);
    const developerRole = roleFactory.createRole(AgentRole.DEVELOPER);
    const validatorRole = roleFactory.createRole(AgentRole.VALIDATOR);

    expect(architectRole.allowedTools).toContain('read_file');
    expect(architectRole.allowedTools).toContain('analyze_code');
    expect(architectRole.allowedTools).not.toContain('write_file');

    expect(developerRole.allowedTools).toContain('write_file');
    expect(developerRole.allowedTools).toContain('run_shell');

    expect(validatorRole.allowedTools).toContain('run_tests');
    expect(validatorRole.allowedTools).toContain('analyze_coverage');
  });

  it('should select optimal role for different task types', () => {
    const architectTask = 'Design a microservices architecture for the application';
    const developmentTask = 'Implement user authentication with JWT tokens';
    const debugTask = 'Fix the memory leak in the data processing module';
    const testTask = 'Write comprehensive test cases for the API endpoints';

    expect(roleFactory.getOptimalRole(architectTask)).toBe(AgentRole.ARCHITECT);
    expect(roleFactory.getOptimalRole(developmentTask)).toBe(AgentRole.DEVELOPER);
    expect(roleFactory.getOptimalRole(debugTask)).toBe(AgentRole.DEBUGGER);
    expect(roleFactory.getOptimalRole(testTask)).toBe(AgentRole.VALIDATOR);
  });

  it('should analyze tasks correctly', () => {
    const architectureTask = 'Plan the system architecture';
    const analysis = roleFactory.analyzeTask(architectureTask);

    expect(analysis.primaryRole).toBe(AgentRole.ARCHITECT);
    expect(analysis.confidence).toBeGreaterThan(0.8);
    expect(analysis.reasoning).toContain('design');
    expect(analysis.supportingRoles).toContain(AgentRole.DEVELOPER);
  });

  it('should recommend appropriate agent combinations', () => {
    const complexTask = 'Build a new feature with tests and documentation';
    const agents = roleFactory.getRecommendedAgents(complexTask, 3);

    expect(agents).toHaveLength(3);
    expect(agents).toContain(AgentRole.DEVELOPER);
    
    // Should include complementary roles
    const hasValidator = agents.includes(AgentRole.VALIDATOR);
    const hasReviewer = agents.includes(AgentRole.REVIEWER);
    expect(hasValidator || hasReviewer).toBe(true);
  });

  it('should validate role combinations', () => {
    const validCombination = [AgentRole.DEVELOPER, AgentRole.VALIDATOR];
    const invalidCombination = Array(6).fill(AgentRole.DEVELOPER);
    const emptyCombination: AgentRole[] = [];

    const validResult = roleFactory.validateRoleCombination(validCombination);
    const invalidResult = roleFactory.validateRoleCombination(invalidCombination);
    const emptyResult = roleFactory.validateRoleCombination(emptyCombination);

    expect(validResult.valid).toBe(true);
    expect(validResult.issues).toHaveLength(0);

    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.issues).toContain('Too many agents (maximum 5)');

    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.issues).toContain('At least one agent role is required');
  });

  it('should return roles sorted by priority', () => {
    const rolesByPriority = roleFactory.getRolesByPriority();
    
    expect(rolesByPriority).toHaveLength(5);
    
    // Verify sorting (lower priority number = higher priority)
    for (let i = 1; i < rolesByPriority.length; i++) {
      expect(rolesByPriority[i].priority).toBeGreaterThanOrEqual(rolesByPriority[i - 1].priority);
    }
  });

  it('should handle unknown role gracefully', () => {
    expect(() => {
      roleFactory.createRole('unknown' as AgentRole);
    }).toThrow('Unknown agent role: unknown');
  });

  it('should provide role descriptions', () => {
    const developerRole = roleFactory.createRole(AgentRole.DEVELOPER);
    const architectRole = roleFactory.createRole(AgentRole.ARCHITECT);

    expect(developerRole.description).toBeDefined();
    expect(developerRole.description.length).toBeGreaterThan(0);
    expect(architectRole.description).toBeDefined();
    expect(architectRole.description).toContain('architecture');
  });
});
