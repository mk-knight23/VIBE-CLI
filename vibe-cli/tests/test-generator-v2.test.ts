import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TestGeneratorV2, 
  EdgeCaseDetector, 
  BDDScenarioGenerator, 
  SelfHealingTestManager,
  CoverageAnalyzer 
} from '../src/tools/test-generator-v2';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs');

describe('TestGeneratorV2', () => {
  let generator: TestGeneratorV2;

  beforeEach(() => {
    generator = new TestGeneratorV2();
    vi.clearAllMocks();
  });

  it('should generate unit tests for functions', async () => {
    const mockCode = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export async function fetchData(url: string): Promise<any> {
  return fetch(url);
}
`;
    
    vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
    
    const tests = await generator.generateUnitTests('test.ts');
    
    expect(tests).toHaveLength(2);
    expect(tests[0].name).toContain('calculateSum');
    expect(tests[0].type).toBe('unit');
    expect(tests[0].code).toContain('describe');
    expect(tests[0].code).toContain('expect');
  });

  it('should generate integration tests', async () => {
    const projectContext = {
      files: ['src/api/users.ts', 'src/routes/auth.ts', 'src/index.ts']
    };
    
    const tests = await generator.generateIntegrationTests(projectContext);
    
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.some(t => t.type === 'integration')).toBe(true);
    expect(tests.some(t => t.name.includes('integration'))).toBe(true);
  });

  it('should generate edge case tests', async () => {
    const mockCode = `
function processArray(arr: number[]): number {
  return arr.length > 0 ? arr[0] : 0;
}

function divide(a: number, b: number): number {
  return a / b;
}
`;
    
    vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
    
    const tests = await generator.generateEdgeCases('test.ts');
    
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.some(t => t.type === 'edge-case')).toBe(true);
    expect(tests.some(t => t.name.includes('edge case'))).toBe(true);
  });

  it('should generate BDD scenarios from requirements', async () => {
    const requirements = `
User should be able to login with email and password
User should see error message for invalid credentials
User should be redirected after successful login
`;
    
    const features = await generator.generateBDDScenarios(requirements);
    
    expect(features).toHaveLength(1);
    expect(features[0].scenarios.length).toBeGreaterThan(0);
    expect(features[0].scenarios.some(s => s.given.length > 0)).toBe(true);
    expect(features[0].scenarios.some(s => s.when.length > 0)).toBe(true);
    expect(features[0].scenarios.some(s => s.then.length > 0)).toBe(true);
  });
});

describe('EdgeCaseDetector', () => {
  let detector: EdgeCaseDetector;

  beforeEach(() => {
    detector = new EdgeCaseDetector();
  });

  it('should detect boundary conditions', () => {
    const code = `
function processArray(arr: number[]): number {
  return arr.length > 0 ? arr[0] : 0;
}
`;
    
    const cases = detector.detectBoundaryConditions(code);
    
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some(c => c.type === 'zero')).toBe(true);
    expect(cases.some(c => c.description.includes('array'))).toBe(true);
  });

  it('should detect null cases', () => {
    const code = `
function processData(data?: any): string {
  return data?.name || 'default';
}
`;
    
    const cases = detector.detectNullCases(code);
    
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some(c => c.type === 'null' || c.type === 'undefined')).toBe(true);
  });

  it('should detect type errors', () => {
    const code = `
function validateInput(input: any): boolean {
  return typeof input === 'string';
}
`;
    
    const cases = detector.detectTypeErrors(code);
    
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some(c => c.type === 'wrong-type')).toBe(true);
  });

  it('should detect all edge cases', () => {
    const code = `
function complexFunction(arr: number[], data?: any): number {
  if (typeof arr !== 'object') return -1;
  return arr.length + (data?.value || 0);
}
`;
    
    const cases = detector.detectAll(code);
    
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every(c => c.description && c.testCode)).toBe(true);
  });
});

describe('BDDScenarioGenerator', () => {
  let generator: BDDScenarioGenerator;

  beforeEach(() => {
    generator = new BDDScenarioGenerator();
  });

  it('should generate features from requirements', () => {
    const requirements = `
User should be able to create an account
User should receive confirmation email
System should validate email format
`;
    
    const features = generator.generateFromRequirements(requirements);
    
    expect(features).toHaveLength(1);
    expect(features[0].name).toBe('User Requirements');
    expect(features[0].scenarios.length).toBe(3);
  });

  it('should convert to Cucumber code', () => {
    const feature = {
      name: 'User Login',
      scenarios: [
        {
          name: 'Successful login',
          given: ['Given user has valid credentials'],
          when: ['When user submits login form'],
          then: ['Then user is redirected to dashboard']
        }
      ],
      stepDefinitions: []
    };
    
    const code = generator.convertToCode(feature, 'cucumber');
    
    expect(code).toContain('Feature: User Login');
    expect(code).toContain('Scenario: Successful login');
    expect(code).toContain('Given user has valid credentials');
    expect(code).toContain('When user submits login form');
    expect(code).toContain('Then user is redirected to dashboard');
  });

  it('should convert to Vitest BDD code', () => {
    const feature = {
      name: 'User Registration',
      scenarios: [
        {
          name: 'Valid registration',
          given: ['Given registration form is displayed'],
          when: ['When user fills valid data'],
          then: ['Then account is created']
        }
      ],
      stepDefinitions: []
    };
    
    const code = generator.convertToCode(feature, 'vitest');
    
    expect(code).toContain('describe(\'User Registration\'');
    expect(code).toContain('describe(\'Valid registration\'');
    expect(code).toContain('it(\'should meet requirements\'');
    expect(code).toContain('// Given: Given registration form is displayed');
    expect(code).toContain('expect(true).toBe(true)');
  });
});

describe('SelfHealingTestManager', () => {
  let manager: SelfHealingTestManager;

  beforeEach(() => {
    manager = new SelfHealingTestManager();
    vi.clearAllMocks();
  });

  it('should detect broken tests', async () => {
    const mockTestCode = `
describe('Test Suite', () => {
  it('should work', () => {
    expect(result); // Missing matcher
  });
});
`;
    
    vi.mocked(fs.readFileSync).mockReturnValue(mockTestCode);
    
    const brokenTests = await manager.detectBrokenTests('test.spec.ts');
    
    expect(brokenTests.length).toBeGreaterThan(0);
    expect(brokenTests[0].testName).toContain('Malformed expect statement');
    expect(brokenTests[0].suggestedFix).toBeDefined();
  });

  it('should suggest fixes for broken tests', async () => {
    const brokenTests = [
      {
        filePath: 'test.spec.ts',
        testName: 'Incomplete test',
        error: 'Missing assertion',
        suggestedFix: 'Add proper assertion'
      }
    ];
    
    const fixes = await manager.suggestFixes(brokenTests);
    
    expect(fixes).toHaveLength(1);
    expect(fixes[0].description).toContain('Fix');
    expect(fixes[0].confidence).toBeGreaterThan(0);
  });

  it('should auto-fix tests when enabled', async () => {
    const brokenTests = [
      {
        filePath: 'test.spec.ts',
        testName: 'Broken test',
        error: 'Syntax error',
        suggestedFix: 'Fix syntax'
      }
    ];
    
    vi.mocked(fs.readFileSync).mockReturnValue('expect(result)');
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    
    const result = await manager.autoFix(brokenTests, true);
    
    expect(result).toContain('Auto-fixed');
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
  });

  it('should not auto-fix when disabled', async () => {
    const brokenTests = [
      {
        filePath: 'test.spec.ts',
        testName: 'Broken test',
        error: 'Syntax error',
        suggestedFix: 'Fix syntax'
      }
    ];
    
    const result = await manager.autoFix(brokenTests, false);
    
    expect(result).toContain('Use --auto-fix');
    expect(vi.mocked(fs.writeFileSync)).not.toHaveBeenCalled();
  });
});

describe('CoverageAnalyzer', () => {
  let analyzer: CoverageAnalyzer;

  beforeEach(() => {
    analyzer = new CoverageAnalyzer();
    vi.clearAllMocks();
  });

  it('should analyze file coverage', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('function test() { return true; }');
    
    const report = analyzer.analyzeFile('test.ts');
    
    expect(report.file).toBe('test.ts');
    expect(report.lineCoverage).toBeGreaterThan(0);
    expect(report.branchCoverage).toBeGreaterThan(0);
    expect(report.functionCoverage).toBeGreaterThan(0);
    expect(Array.isArray(report.uncoveredLines)).toBe(true);
  });

  it('should generate aggregate report', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('function test() { return true; }');
    
    const files = ['test1.ts', 'test2.ts', 'test3.ts'];
    const report = analyzer.generateReport(files);
    
    expect(report.totalCoverage).toBeGreaterThan(0);
    expect(report.files).toHaveLength(3);
    expect(report.files.every(f => f.lineCoverage > 0)).toBe(true);
  });

  it('should identify uncovered areas', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('function test() { return true; }');
    
    const uncovered = analyzer.identifyUncovered('test.ts');
    
    expect(Array.isArray(uncovered)).toBe(true);
    expect(uncovered.every(area => area.suggestion)).toBe(true);
    expect(uncovered.every(area => area.type)).toBe(true);
  });
});
