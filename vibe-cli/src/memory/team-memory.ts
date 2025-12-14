import * as fs from 'fs';
import * as path from 'path';

export interface TeamMemory {
  version: string;
  lastUpdated: Date;
  sharedGoals: string[];
  decisions: TeamDecision[];
  blockers: TeamBlocker[];
  auditLog: AuditEntry[];
  permissions: { [userId: string]: PermissionRole };
}

export interface TeamDecision {
  id: string;
  description: string;
  madeBy: string;
  timestamp: Date;
  rationale: string;
  impact: string;
  tags: string[];
}

export interface TeamBlocker {
  id: string;
  description: string;
  reportedBy: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved';
  assignedTo?: string;
  resolution?: string;
}

export type PermissionRole = 'admin' | 'contributor' | 'read-only';

export interface AuditEntry {
  timestamp: Date;
  userId: string;
  action: string;
  change: object;
  before: object;
  after: object;
}

export interface Conflict {
  type: 'concurrent_edit' | 'permission_denied' | 'version_mismatch';
  description: string;
  resolution: string;
}

export class TeamMemoryManager {
  private memoryPath: string;
  private currentUser: string;

  constructor(projectRoot: string, userId: string = 'anonymous') {
    this.memoryPath = path.join(projectRoot, '.vibe', 'team-memory.json');
    this.currentUser = userId;
    this.ensureVibeDirectory(projectRoot);
  }

  async loadTeamMemory(): Promise<TeamMemory> {
    if (!fs.existsSync(this.memoryPath)) {
      return this.createDefaultMemory();
    }

    try {
      const content = fs.readFileSync(this.memoryPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert date strings back to Date objects
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated),
        decisions: data.decisions.map((d: any) => ({
          ...d,
          timestamp: new Date(d.timestamp)
        })),
        blockers: data.blockers.map((b: any) => ({
          ...b,
          timestamp: new Date(b.timestamp)
        })),
        auditLog: data.auditLog.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }))
      };
    } catch (error) {
      console.warn(`Failed to load team memory: ${error}`);
      return this.createDefaultMemory();
    }
  }

  async saveTeamMemory(memory: TeamMemory): Promise<void> {
    try {
      // Update metadata
      memory.lastUpdated = new Date();
      memory.version = this.incrementVersion(memory.version);

      // Add audit entry for the save
      const auditEntry: AuditEntry = {
        timestamp: new Date(),
        userId: this.currentUser,
        action: 'save_memory',
        change: { type: 'full_save' },
        before: {},
        after: { version: memory.version }
      };
      memory.auditLog.push(auditEntry);

      // Keep audit log manageable
      if (memory.auditLog.length > 1000) {
        memory.auditLog = memory.auditLog.slice(-500);
      }

      const content = JSON.stringify(memory, null, 2);
      fs.writeFileSync(this.memoryPath, content);
    } catch (error) {
      throw new Error(`Failed to save team memory: ${error}`);
    }
  }

  async addDecision(decision: Omit<TeamDecision, 'id' | 'timestamp'>): Promise<void> {
    const memory = await this.loadTeamMemory();
    
    if (!this.hasPermission('contributor')) {
      throw new Error('Insufficient permissions to add decisions');
    }

    const newDecision: TeamDecision = {
      ...decision,
      id: this.generateId(),
      timestamp: new Date(),
      madeBy: this.currentUser
    };

    memory.decisions.push(newDecision);
    
    this.addAuditEntry(memory, 'add_decision', {}, newDecision);
    await this.saveTeamMemory(memory);
  }

  async addBlocker(blocker: Omit<TeamBlocker, 'id' | 'timestamp' | 'reportedBy'>): Promise<void> {
    const memory = await this.loadTeamMemory();
    
    if (!this.hasPermission('contributor')) {
      throw new Error('Insufficient permissions to add blockers');
    }

    const newBlocker: TeamBlocker = {
      ...blocker,
      id: this.generateId(),
      timestamp: new Date(),
      reportedBy: this.currentUser
    };

    memory.blockers.push(newBlocker);
    
    this.addAuditEntry(memory, 'add_blocker', {}, newBlocker);
    await this.saveTeamMemory(memory);
  }

  async updateBlocker(blockerId: string, updates: Partial<TeamBlocker>): Promise<void> {
    const memory = await this.loadTeamMemory();
    
    if (!this.hasPermission('contributor')) {
      throw new Error('Insufficient permissions to update blockers');
    }

    const blockerIndex = memory.blockers.findIndex(b => b.id === blockerId);
    if (blockerIndex === -1) {
      throw new Error(`Blocker ${blockerId} not found`);
    }

    const oldBlocker = { ...memory.blockers[blockerIndex] };
    memory.blockers[blockerIndex] = { ...memory.blockers[blockerIndex], ...updates };
    
    this.addAuditEntry(memory, 'update_blocker', oldBlocker, memory.blockers[blockerIndex]);
    await this.saveTeamMemory(memory);
  }

  async syncWithTeam(): Promise<void> {
    // In a real implementation, this would sync with a remote repository
    // For now, we'll simulate by checking if the file has been modified
    
    try {
      const stats = fs.statSync(this.memoryPath);
      const memory = await this.loadTeamMemory();
      
      console.log(`Team memory last modified: ${stats.mtime}`);
      console.log(`Memory version: ${memory.version}`);
      
      // In production, this would:
      // 1. Pull latest changes from git
      // 2. Merge conflicts if any
      // 3. Push local changes
      
    } catch (error) {
      console.warn(`Sync failed: ${error}`);
    }
  }

  private createDefaultMemory(): TeamMemory {
    return {
      version: '1.0.0',
      lastUpdated: new Date(),
      sharedGoals: [],
      decisions: [],
      blockers: [],
      auditLog: [],
      permissions: {
        [this.currentUser]: 'admin'
      }
    };
  }

  private hasPermission(requiredRole: PermissionRole): boolean {
    const memory = this.loadTeamMemorySync();
    const userRole = memory.permissions[this.currentUser];
    
    if (!userRole) return false;
    
    const roleHierarchy = { 'read-only': 0, 'contributor': 1, 'admin': 2 };
    const requiredLevel = roleHierarchy[requiredRole];
    const userLevel = roleHierarchy[userRole];
    
    return userLevel >= requiredLevel;
  }

  private loadTeamMemorySync(): TeamMemory {
    // Synchronous version for permission checks
    if (!fs.existsSync(this.memoryPath)) {
      return this.createDefaultMemory();
    }

    try {
      const content = fs.readFileSync(this.memoryPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return this.createDefaultMemory();
    }
  }

  private addAuditEntry(memory: TeamMemory, action: string, before: object, after: object): void {
    const entry: AuditEntry = {
      timestamp: new Date(),
      userId: this.currentUser,
      action,
      change: { action },
      before,
      after
    };
    
    memory.auditLog.push(entry);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private ensureVibeDirectory(projectRoot: string): void {
    const vibeDir = path.join(projectRoot, '.vibe');
    if (!fs.existsSync(vibeDir)) {
      fs.mkdirSync(vibeDir, { recursive: true });
    }
  }
}

export class TeamPermissionManager {
  checkPermission(userId: string, action: string, memory: TeamMemory): boolean {
    const userRole = memory.permissions[userId];
    if (!userRole) return false;

    const actionPermissions = {
      'read': ['read-only', 'contributor', 'admin'],
      'add_decision': ['contributor', 'admin'],
      'add_blocker': ['contributor', 'admin'],
      'update_blocker': ['contributor', 'admin'],
      'manage_permissions': ['admin'],
      'delete': ['admin']
    };

    const allowedRoles = actionPermissions[action as keyof typeof actionPermissions] || [];
    return allowedRoles.includes(userRole);
  }

  getRole(userId: string, memory: TeamMemory): PermissionRole | null {
    return memory.permissions[userId] || null;
  }

  updatePermission(userId: string, role: PermissionRole, memory: TeamMemory, requestingUser: string): void {
    const requestingRole = memory.permissions[requestingUser];
    
    if (requestingRole !== 'admin') {
      throw new Error('Only admins can update permissions');
    }

    memory.permissions[userId] = role;
  }
}

export class AuditLogger {
  logChange(userId: string, action: string, before: object, after: object, memory: TeamMemory): void {
    const entry: AuditEntry = {
      timestamp: new Date(),
      userId,
      action,
      change: { action },
      before,
      after
    };

    memory.auditLog.push(entry);
  }

  getAuditTrail(memory: TeamMemory, limit?: number): AuditEntry[] {
    const sorted = memory.auditLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  exportAuditLog(memory: TeamMemory, format: 'json' | 'csv'): string {
    const trail = this.getAuditTrail(memory);

    if (format === 'csv') {
      const headers = 'Timestamp,UserId,Action,Change';
      const rows = trail.map(entry => 
        `${entry.timestamp.toISOString()},${entry.userId},${entry.action},"${JSON.stringify(entry.change).replace(/"/g, '""')}"`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(trail, null, 2);
  }
}

export class TeamSyncManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async pullLatest(): Promise<void> {
    // In production, this would pull from git
    console.log('Pulling latest team memory changes...');
    
    try {
      // Simulate git pull
      // execSync('git pull origin main', { cwd: this.projectRoot });
      console.log('Team memory synchronized');
    } catch (error) {
      throw new Error(`Failed to pull latest changes: ${error}`);
    }
  }

  async pushChanges(changes: object[]): Promise<void> {
    // In production, this would commit and push to git
    console.log(`Pushing ${changes.length} changes...`);
    
    try {
      // Simulate git commit and push
      // execSync('git add .vibe/team-memory.json', { cwd: this.projectRoot });
      // execSync('git commit -m "Update team memory"', { cwd: this.projectRoot });
      // execSync('git push origin main', { cwd: this.projectRoot });
      console.log('Changes pushed successfully');
    } catch (error) {
      throw new Error(`Failed to push changes: ${error}`);
    }
  }

  async detectConflicts(): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    // In production, this would check for git conflicts
    // For now, simulate conflict detection
    
    return conflicts;
  }

  async resolveConflict(conflict: Conflict): Promise<void> {
    console.log(`Resolving conflict: ${conflict.description}`);
    
    switch (conflict.type) {
      case 'concurrent_edit':
        // Merge changes or prompt user
        break;
      case 'permission_denied':
        // Check permissions and retry
        break;
      case 'version_mismatch':
        // Pull latest and retry
        break;
    }
  }
}
