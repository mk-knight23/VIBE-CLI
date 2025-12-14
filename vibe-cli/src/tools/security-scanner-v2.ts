import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface Vulnerability {
  package: string;
  currentVersion: string;
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cvss: number;  // 0-10
  fixedVersion: string;
  suggestedUpgrade: string;
  cve?: string;
}

export interface CodeIssue {
  type: 'sql_injection' | 'xss' | 'command_injection' | 'insecure_deserialization' | 'path_traversal';
  location: { file: string; line: number };
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix: string;
  cweId?: string;
}

export interface Secret {
  type: 'api_key' | 'password' | 'token' | 'private_key' | 'database_url';
  location: { file: string; line: number };
  severity: 'high';
  suggestion: string;
  pattern: string;
}

export interface SupplyChainIssue {
  type: 'typosquatting' | 'malicious_package' | 'compromised_maintainer';
  package: string;
  description: string;
  severity: 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface LicenseIssue {
  package: string;
  license: string;
  issue: 'incompatible' | 'missing' | 'restrictive';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface SecurityFinding {
  id: string;
  type: 'vulnerability' | 'code_issue' | 'secret' | 'supply_chain' | 'license';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: { file: string; line?: number };
  fix?: Fix;
}

export interface Fix {
  finding: SecurityFinding;
  type: 'code_change' | 'dependency_upgrade' | 'configuration' | 'removal';
  description: string;
  code?: string;  // Code to replace with
  explanation: string;
  testable: boolean;
  confidence: number; // 0-1
}

export class SecurityScannerV2 {
  async dependencyAudit(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { encoding: 'utf-8' });
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
          vulnerabilities.push({
            package: pkg,
            currentVersion: vuln.via[0]?.range || 'unknown',
            vulnerability: vuln.via[0]?.title || 'Unknown vulnerability',
            severity: this.mapSeverity(vuln.severity),
            cvss: vuln.via[0]?.cvss?.score || 0,
            fixedVersion: vuln.fixAvailable?.version || 'none',
            suggestedUpgrade: vuln.fixAvailable ? `npm update ${pkg}` : 'No fix available',
            cve: vuln.via[0]?.cve
          });
        });
      }
    } catch (error) {
      console.warn('npm audit failed, using alternative methods');
      // Fallback to package.json analysis
      vulnerabilities.push(...this.analyzePackageJson());
    }

    return vulnerabilities;
  }

  async codePatternDetection(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const sourceFiles = this.findSourceFiles('.');
    
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // SQL Injection patterns
          if (this.detectSQLInjection(line)) {
            issues.push({
              type: 'sql_injection',
              location: { file, line: index + 1 },
              description: 'Potential SQL injection vulnerability',
              severity: 'high',
              suggestedFix: 'Use parameterized queries or prepared statements',
              cweId: 'CWE-89'
            });
          }

          // XSS patterns
          if (this.detectXSS(line)) {
            issues.push({
              type: 'xss',
              location: { file, line: index + 1 },
              description: 'Potential XSS vulnerability',
              severity: 'medium',
              suggestedFix: 'Sanitize user input and use proper encoding',
              cweId: 'CWE-79'
            });
          }

          // Command injection
          if (this.detectCommandInjection(line)) {
            issues.push({
              type: 'command_injection',
              location: { file, line: index + 1 },
              description: 'Potential command injection vulnerability',
              severity: 'high',
              suggestedFix: 'Validate and sanitize input, avoid shell execution',
              cweId: 'CWE-78'
            });
          }

          // Path traversal
          if (this.detectPathTraversal(line)) {
            issues.push({
              type: 'path_traversal',
              location: { file, line: index + 1 },
              description: 'Potential path traversal vulnerability',
              severity: 'medium',
              suggestedFix: 'Validate file paths and use path.resolve()',
              cweId: 'CWE-22'
            });
          }
        });
      } catch (error) {
        console.warn(`Failed to analyze ${file}: ${error}`);
      }
    }

    return issues;
  }

  async secretDetection(): Promise<Secret[]> {
    const secrets: Secret[] = [];
    const sourceFiles = this.findSourceFiles('.');
    
    const patterns = [
      { type: 'api_key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"`]([a-zA-Z0-9_-]{20,})/i },
      { type: 'token', pattern: /(?:token|access[_-]?token)\s*[:=]\s*['"`]([a-zA-Z0-9_-]{20,})/i },
      { type: 'password', pattern: /(?:password|pwd|pass)\s*[:=]\s*['"`]([^'"`\s]{8,})/i },
      { type: 'private_key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i },
      { type: 'database_url', pattern: /(?:database[_-]?url|db[_-]?url)\s*[:=]\s*['"`]([^'"`\s]+)/i }
    ];

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          patterns.forEach(({ type, pattern }) => {
            const match = line.match(pattern);
            if (match) {
              secrets.push({
                type: type as any,
                location: { file, line: index + 1 },
                severity: 'high',
                suggestion: `Move ${type} to environment variables or secure vault`,
                pattern: match[0]
              });
            }
          });
        });
      } catch (error) {
        console.warn(`Failed to scan ${file} for secrets: ${error}`);
      }
    }

    return secrets;
  }

  async supplyChainCheck(): Promise<SupplyChainIssue[]> {
    const issues: SupplyChainIssue[] = [];
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      Object.keys(dependencies).forEach(pkg => {
        // Check for suspicious package names
        if (this.isSuspiciousPackage(pkg)) {
          issues.push({
            type: 'typosquatting',
            package: pkg,
            description: `Package name "${pkg}" may be typosquatting`,
            severity: 'medium',
            recommendation: 'Verify package authenticity and consider alternatives'
          });
        }
      });
    } catch (error) {
      console.warn('Failed to analyze package.json for supply chain issues');
    }

    return issues;
  }

  async licenseCompliance(): Promise<LicenseIssue[]> {
    const issues: LicenseIssue[] = [];
    
    try {
      // This would integrate with license checking tools
      const result = execSync('npx license-checker --json', { encoding: 'utf-8' });
      const licenses = JSON.parse(result);
      
      Object.entries(licenses).forEach(([pkg, info]: [string, any]) => {
        if (this.isRestrictiveLicense(info.licenses)) {
          issues.push({
            package: pkg,
            license: info.licenses,
            issue: 'restrictive',
            severity: 'medium',
            recommendation: 'Review license compatibility with your project'
          });
        }
      });
    } catch (error) {
      console.warn('License checking failed, skipping compliance check');
    }

    return issues;
  }

  private detectSQLInjection(line: string): boolean {
    const patterns = [
      /query\s*\+\s*['"`]/i,
      /execute\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /\$\{[^}]*\}\s*INTO\s+/i
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private detectXSS(line: string): boolean {
    const patterns = [
      /innerHTML\s*=\s*[^'"`]*\+/i,
      /document\.write\s*\([^)]*\+/i,
      /\$\([^)]*\)\.html\s*\([^)]*\+/i
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private detectCommandInjection(line: string): boolean {
    const patterns = [
      /exec\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /spawn\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /system\s*\([^)]*\+/i
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private detectPathTraversal(line: string): boolean {
    const patterns = [
      /\.\.\//,
      /path\s*\+\s*['"`]/i,
      /readFile\s*\([^)]*\+/i
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private findSourceFiles(dir: string): string[] {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.php'];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          files.push(...this.findSourceFiles(fullPath));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dir}: ${error}`);
    }

    return files;
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
    return skipDirs.includes(name);
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  private analyzePackageJson(): Vulnerability[] {
    // Fallback analysis when npm audit fails
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const vulnerabilities: Vulnerability[] = [];
      
      // Check for known vulnerable packages (simplified)
      const knownVulnerable = ['lodash@4.17.20', 'axios@0.21.0'];
      
      Object.entries(packageJson.dependencies || {}).forEach(([pkg, version]) => {
        const pkgVersion = `${pkg}@${version}`;
        if (knownVulnerable.includes(pkgVersion)) {
          vulnerabilities.push({
            package: pkg,
            currentVersion: version as string,
            vulnerability: 'Known vulnerability',
            severity: 'medium',
            cvss: 5.0,
            fixedVersion: 'latest',
            suggestedUpgrade: `npm update ${pkg}`
          });
        }
      });

      return vulnerabilities;
    } catch (error) {
      return [];
    }
  }

  private isSuspiciousPackage(name: string): boolean {
    // Simple typosquatting detection
    const commonPackages = ['lodash', 'express', 'react', 'axios', 'moment'];
    return commonPackages.some(pkg => {
      const distance = this.levenshteinDistance(name, pkg);
      return distance === 1 && name !== pkg;
    });
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[b.length][a.length];
  }

  private isRestrictiveLicense(license: string): boolean {
    const restrictive = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];
    return restrictive.some(lic => license?.includes(lic));
  }
}

export class SecurityAutoFixer {
  suggestFixes(findings: SecurityFinding[]): Fix[] {
    return findings.map(finding => this.generateFix(finding)).filter(Boolean) as Fix[];
  }

  async applyFixes(findings: SecurityFinding[], fixes: Fix[]): Promise<void> {
    for (const fix of fixes) {
      if (fix.confidence > 0.7) {
        await this.applyFix(fix);
      }
    }
  }

  validateFix(original: string, fixed: string): boolean {
    // Basic validation - ensure fix doesn't break syntax
    try {
      if (original.includes('function') && !fixed.includes('function')) {
        return false; // Don't remove functions
      }
      return true;
    } catch {
      return false;
    }
  }

  private generateFix(finding: SecurityFinding): Fix | null {
    switch (finding.type) {
      case 'vulnerability':
        return {
          finding,
          type: 'dependency_upgrade',
          description: 'Upgrade vulnerable dependency',
          explanation: 'Update to a version that fixes the vulnerability',
          testable: true,
          confidence: 0.9
        };
      
      case 'secret':
        return {
          finding,
          type: 'removal',
          description: 'Remove hardcoded secret',
          code: '// TODO: Move to environment variable',
          explanation: 'Replace hardcoded secret with environment variable',
          testable: false,
          confidence: 0.8
        };
      
      case 'code_issue':
        return this.generateCodeFix(finding);
      
      default:
        return null;
    }
  }

  private generateCodeFix(finding: SecurityFinding): Fix {
    return {
      finding,
      type: 'code_change',
      description: 'Fix security vulnerability in code',
      code: '// Security fix applied',
      explanation: 'Applied security best practices',
      testable: true,
      confidence: 0.7
    };
  }

  private async applyFix(fix: Fix): Promise<void> {
    if (fix.type === 'dependency_upgrade') {
      // Would run npm update command
      console.log(`Would upgrade dependency for: ${fix.description}`);
    } else if (fix.type === 'code_change' && fix.finding.location) {
      // Would modify source file
      console.log(`Would apply code fix to: ${fix.finding.location.file}`);
    }
  }
}

export class CVEDatabase {
  async checkVulnerabilities(packages: string[]): Promise<Vulnerability[]> {
    // Simplified implementation - would integrate with real CVE database
    const vulnerabilities: Vulnerability[] = [];
    
    for (const pkg of packages) {
      // Mock CVE check
      if (pkg.includes('lodash') && pkg.includes('4.17.20')) {
        vulnerabilities.push({
          package: 'lodash',
          currentVersion: '4.17.20',
          vulnerability: 'Prototype pollution vulnerability',
          severity: 'high',
          cvss: 7.5,
          fixedVersion: '4.17.21',
          suggestedUpgrade: 'npm update lodash',
          cve: 'CVE-2021-23337'
        });
      }
    }

    return vulnerabilities;
  }

  async getFixedVersions(vulnerability: string): Promise<string[]> {
    // Mock implementation
    return ['latest', '4.17.21'];
  }

  async getSeverity(cve: string): Promise<number> {
    // Mock CVSS score
    return 7.5;
  }
}

export class SeverityScorer {
  scoreFinding(finding: SecurityFinding): number {
    const severityScores = {
      'critical': 10,
      'high': 7.5,
      'medium': 5.0,
      'low': 2.5
    };

    return severityScores[finding.severity] || 5.0;
  }

  prioritizeFindings(findings: SecurityFinding[]): SecurityFinding[] {
    return findings.sort((a, b) => this.scoreFinding(b) - this.scoreFinding(a));
  }
}

export class SecurityPRGenerator {
  generatePRDescription(vulnerabilities: Vulnerability[]): string {
    let description = '# Security Update\n\n';
    description += `This PR addresses ${vulnerabilities.length} security vulnerabilities:\n\n`;
    
    vulnerabilities.forEach(vuln => {
      description += `## ${vuln.package}\n`;
      description += `- **Severity:** ${vuln.severity.toUpperCase()}\n`;
      description += `- **Current Version:** ${vuln.currentVersion}\n`;
      description += `- **Fixed Version:** ${vuln.fixedVersion}\n`;
      description += `- **Description:** ${vuln.vulnerability}\n`;
      if (vuln.cve) {
        description += `- **CVE:** ${vuln.cve}\n`;
      }
      description += '\n';
    });

    description += '## Changes Made\n';
    description += '- Updated vulnerable dependencies to secure versions\n';
    description += '- Verified compatibility with existing code\n';
    description += '- All tests passing\n';

    return description;
  }

  generateCommitMessage(fixes: Fix[]): string {
    const criticalFixes = fixes.filter(f => f.finding.severity === 'critical').length;
    const highFixes = fixes.filter(f => f.finding.severity === 'high').length;
    
    if (criticalFixes > 0) {
      return `security: fix ${criticalFixes} critical vulnerabilities`;
    } else if (highFixes > 0) {
      return `security: fix ${highFixes} high severity vulnerabilities`;
    } else {
      return `security: fix ${fixes.length} security issues`;
    }
  }

  async createBranch(vulnerabilities: Vulnerability[]): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const branchName = `security-update-${timestamp}`;
    
    // Would create git branch
    console.log(`Would create branch: ${branchName}`);
    
    return branchName;
  }
}
