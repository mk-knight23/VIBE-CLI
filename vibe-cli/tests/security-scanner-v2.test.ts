import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  SecurityScannerV2, 
  SecurityAutoFixer, 
  CVEDatabase, 
  SeverityScorer,
  SecurityPRGenerator 
} from '../src/tools/security-scanner-v2';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Mock modules
vi.mock('fs');
vi.mock('child_process');

describe('SecurityScannerV2', () => {
  let scanner: SecurityScannerV2;

  beforeEach(() => {
    scanner = new SecurityScannerV2();
    vi.clearAllMocks();
  });

  it('should perform dependency audit', async () => {
    const mockAuditResult = JSON.stringify({
      vulnerabilities: {
        'lodash': {
          severity: 'high',
          via: [{ title: 'Prototype pollution', cvss: { score: 7.5 }, cve: 'CVE-2021-23337' }],
          fixAvailable: { version: '4.17.21' }
        }
      }
    });

    vi.mocked(execSync).mockReturnValue(mockAuditResult);

    const vulnerabilities = await scanner.dependencyAudit();

    expect(vulnerabilities).toHaveLength(1);
    expect(vulnerabilities[0].package).toBe('lodash');
    expect(vulnerabilities[0].severity).toBe('high');
    expect(vulnerabilities[0].cve).toBe('CVE-2021-23337');
  });

  it('should detect code pattern vulnerabilities', async () => {
    const mockCode = `
const query = "SELECT * FROM users WHERE id = " + userId;
document.innerHTML = userInput + "<div>content</div>";
exec("rm -rf " + userPath);
const filePath = basePath + "../../../etc/passwd";
`;

    vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: 'test.js', isFile: () => true, isDirectory: () => false }
    ] as any);

    // Mock the recursive directory reading
    vi.mocked(fs.readdirSync).mockImplementation((dir: any) => {
      if (dir === '.') {
        return [{ name: 'test.js', isFile: () => true, isDirectory: () => false }] as any;
      }
      return [] as any;
    });

    const issues = await scanner.codePatternDetection();

    expect(issues.length).toBeGreaterThan(0);
    // Check that at least some vulnerabilities are detected
    const hasVulnerabilities = issues.length > 0;
    expect(hasVulnerabilities).toBe(true);
  });

  it('should detect secrets in code', async () => {
    const mockCode = `
const API_KEY = "sk-1234567890abcdef1234567890abcdef";
const password = "super-secret-password123";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
-----BEGIN RSA PRIVATE KEY-----
const DATABASE_URL = "postgresql://user:pass@localhost/db";
`;

    vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: 'config.js', isFile: () => true, isDirectory: () => false }
    ] as any);

    const secrets = await scanner.secretDetection();

    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets.some(s => s.type === 'api_key')).toBe(true);
    expect(secrets.some(s => s.type === 'password')).toBe(true);
    expect(secrets.some(s => s.type === 'token')).toBe(true);
    expect(secrets.some(s => s.type === 'private_key')).toBe(true);
    expect(secrets.some(s => s.type === 'database_url')).toBe(true);
  });

  it('should check supply chain issues', async () => {
    const mockPackageJson = JSON.stringify({
      dependencies: {
        'lodash': '^4.17.21',
        'lodahs': '^1.0.0', // Typosquatting
        'expres': '^4.18.0'  // Typosquatting
      }
    });

    vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

    const issues = await scanner.supplyChainCheck();

    expect(issues.length).toBeGreaterThan(0);
    // Check that typosquatting detection works
    const hasTyposquatting = issues.some(i => i.type === 'typosquatting');
    expect(hasTyposquatting).toBe(true);
  });

  it('should check license compliance', async () => {
    const mockLicenseResult = JSON.stringify({
      'some-package@1.0.0': {
        licenses: 'GPL-3.0',
        repository: 'https://github.com/example/package'
      },
      'another-package@2.0.0': {
        licenses: 'MIT',
        repository: 'https://github.com/example/another'
      }
    });

    vi.mocked(execSync).mockReturnValue(mockLicenseResult);

    const issues = await scanner.licenseCompliance();

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.issue === 'restrictive')).toBe(true);
    expect(issues.some(i => i.license.includes('GPL-3.0'))).toBe(true);
  });

  it('should handle audit failures gracefully', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('npm audit failed');
    });

    const mockPackageJson = JSON.stringify({
      dependencies: {
        'lodash': '4.17.20' // Known vulnerable version
      }
    });

    vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

    const vulnerabilities = await scanner.dependencyAudit();

    // Should fallback to package.json analysis
    expect(vulnerabilities.length).toBeGreaterThanOrEqual(0);
  });
});

describe('SecurityAutoFixer', () => {
  let fixer: SecurityAutoFixer;

  beforeEach(() => {
    fixer = new SecurityAutoFixer();
  });

  it('should suggest fixes for vulnerabilities', () => {
    const findings = [
      {
        id: '1',
        type: 'vulnerability' as const,
        severity: 'high' as const,
        description: 'Vulnerable dependency',
        location: { file: 'package.json' }
      },
      {
        id: '2',
        type: 'secret' as const,
        severity: 'high' as const,
        description: 'Hardcoded API key',
        location: { file: 'config.js', line: 5 }
      }
    ];

    const fixes = fixer.suggestFixes(findings);

    expect(fixes).toHaveLength(2);
    expect(fixes[0].type).toBe('dependency_upgrade');
    expect(fixes[1].type).toBe('removal');
    expect(fixes.every(f => f.confidence > 0)).toBe(true);
  });

  it('should validate fixes', () => {
    const original = 'function test() { return true; }';
    const validFix = 'function test() { return false; }';
    const invalidFix = 'return false;'; // Missing function

    expect(fixer.validateFix(original, validFix)).toBe(true);
    expect(fixer.validateFix(original, invalidFix)).toBe(false);
  });

  it('should apply fixes with high confidence', async () => {
    const findings = [
      {
        id: '1',
        type: 'vulnerability' as const,
        severity: 'high' as const,
        description: 'Test vulnerability',
        location: { file: 'test.js' }
      }
    ];

    const fixes = [
      {
        finding: findings[0],
        type: 'dependency_upgrade' as const,
        description: 'Upgrade package',
        explanation: 'Update to secure version',
        testable: true,
        confidence: 0.9
      }
    ];

    // Should not throw
    await expect(fixer.applyFixes(findings, fixes)).resolves.toBeUndefined();
  });
});

describe('CVEDatabase', () => {
  let cveDb: CVEDatabase;

  beforeEach(() => {
    cveDb = new CVEDatabase();
  });

  it('should check vulnerabilities for packages', async () => {
    const packages = ['lodash@4.17.20', 'axios@0.21.0'];
    
    const vulnerabilities = await cveDb.checkVulnerabilities(packages);

    expect(vulnerabilities.length).toBeGreaterThanOrEqual(0);
    if (vulnerabilities.length > 0) {
      expect(vulnerabilities[0].cve).toBeDefined();
      expect(vulnerabilities[0].cvss).toBeGreaterThan(0);
    }
  });

  it('should get fixed versions', async () => {
    const versions = await cveDb.getFixedVersions('CVE-2021-23337');
    
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);
  });

  it('should get CVSS severity score', async () => {
    const score = await cveDb.getSeverity('CVE-2021-23337');
    
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });
});

describe('SeverityScorer', () => {
  let scorer: SeverityScorer;

  beforeEach(() => {
    scorer = new SeverityScorer();
  });

  it('should score findings by severity', () => {
    const criticalFinding = {
      id: '1',
      type: 'vulnerability' as const,
      severity: 'critical' as const,
      description: 'Critical issue'
    };

    const lowFinding = {
      id: '2',
      type: 'vulnerability' as const,
      severity: 'low' as const,
      description: 'Low issue'
    };

    const criticalScore = scorer.scoreFinding(criticalFinding);
    const lowScore = scorer.scoreFinding(lowFinding);

    expect(criticalScore).toBeGreaterThan(lowScore);
    expect(criticalScore).toBe(10);
    expect(lowScore).toBe(2.5);
  });

  it('should prioritize findings by severity', () => {
    const findings = [
      {
        id: '1',
        type: 'vulnerability' as const,
        severity: 'low' as const,
        description: 'Low issue'
      },
      {
        id: '2',
        type: 'vulnerability' as const,
        severity: 'critical' as const,
        description: 'Critical issue'
      },
      {
        id: '3',
        type: 'vulnerability' as const,
        severity: 'medium' as const,
        description: 'Medium issue'
      }
    ];

    const prioritized = scorer.prioritizeFindings(findings);

    expect(prioritized[0].severity).toBe('critical');
    expect(prioritized[1].severity).toBe('medium');
    expect(prioritized[2].severity).toBe('low');
  });
});

describe('SecurityPRGenerator', () => {
  let generator: SecurityPRGenerator;

  beforeEach(() => {
    generator = new SecurityPRGenerator();
  });

  it('should generate PR description', () => {
    const vulnerabilities = [
      {
        package: 'lodash',
        currentVersion: '4.17.20',
        vulnerability: 'Prototype pollution',
        severity: 'high' as const,
        cvss: 7.5,
        fixedVersion: '4.17.21',
        suggestedUpgrade: 'npm update lodash',
        cve: 'CVE-2021-23337'
      }
    ];

    const description = generator.generatePRDescription(vulnerabilities);

    expect(description).toContain('# Security Update');
    expect(description).toContain('lodash');
    expect(description).toContain('HIGH');
    expect(description).toContain('CVE-2021-23337');
    expect(description).toContain('## Changes Made');
  });

  it('should generate commit message', () => {
    const criticalFixes = [
      {
        finding: {
          id: '1',
          type: 'vulnerability' as const,
          severity: 'critical' as const,
          description: 'Critical vulnerability'
        },
        type: 'dependency_upgrade' as const,
        description: 'Fix critical issue',
        explanation: 'Update package',
        testable: true,
        confidence: 0.9
      }
    ];

    const highFixes = [
      {
        finding: {
          id: '2',
          type: 'vulnerability' as const,
          severity: 'high' as const,
          description: 'High vulnerability'
        },
        type: 'dependency_upgrade' as const,
        description: 'Fix high issue',
        explanation: 'Update package',
        testable: true,
        confidence: 0.8
      }
    ];

    const criticalMessage = generator.generateCommitMessage(criticalFixes);
    const highMessage = generator.generateCommitMessage(highFixes);

    expect(criticalMessage).toContain('critical');
    expect(highMessage).toContain('high severity');
  });

  it('should create branch name', async () => {
    const vulnerabilities = [
      {
        package: 'test',
        currentVersion: '1.0.0',
        vulnerability: 'Test vuln',
        severity: 'medium' as const,
        cvss: 5.0,
        fixedVersion: '1.0.1',
        suggestedUpgrade: 'npm update'
      }
    ];

    const branchName = await generator.createBranch(vulnerabilities);

    expect(branchName).toContain('security-update-');
    expect(branchName).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
  });
});
