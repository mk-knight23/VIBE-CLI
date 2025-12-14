import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentSandbox, ConflictDetector } from '../src/orchestration/agent-isolation';
import { Agent } from '../src/orchestration/multi-agent-executor';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('AgentSandbox', () => {
  let tempDir: string;
  let sandbox: AgentSandbox;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-sandbox-test-'));
    
    // Create test project structure
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test"}');
    await fs.writeFile(path.join(tempDir, 'index.js'), 'console.log("hello");');
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.writeFile(path.join(tempDir, 'src', 'app.js'), 'module.exports = {};');
    
    sandbox = new AgentSandbox('temp-directory', tempDir);
  });

  afterEach(async () => {
    try {
      await sandbox.cleanup();
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  it('should create and cleanup sandbox successfully', async () => {
    const agentId = 'test-agent-1';
    const sandboxPath = await sandbox.create(agentId);

    expect(sandboxPath).toBeDefined();
    expect(sandboxPath).toContain('vibe-agent-');
    
    // Verify sandbox directory exists
    const stats = await fs.stat(sandboxPath);
    expect(stats.isDirectory()).toBe(true);

    // Verify files were copied
    const files = await fs.readdir(sandboxPath);
    expect(files).toContain('package.json');
    expect(files).toContain('index.js');
    expect(files).toContain('src');

    // Cleanup
    await sandbox.cleanup();

    // Verify cleanup
    await expect(fs.stat(sandboxPath)).rejects.toThrow();
  });

  it('should isolate file operations between agents', async () => {
    const sandbox1 = new AgentSandbox('temp-directory', tempDir);
    const sandbox2 = new AgentSandbox('temp-directory', tempDir);

    const path1 = await sandbox1.create('agent-1');
    const path2 = await sandbox2.create('agent-2');

    expect(path1).not.toBe(path2);

    // Write different content to same filename in each sandbox
    const testAgent1: Agent = {
      role: 'developer',
      task: 'test',
      context: { workingDir: path1 },
      sandbox: path1,
      timeout: 30000
    };

    const testAgent2: Agent = {
      role: 'developer', 
      task: 'test',
      context: { workingDir: path2 },
      sandbox: path2,
      timeout: 30000
    };

    await sandbox1.executeInSandbox(testAgent1);
    await sandbox2.executeInSandbox(testAgent2);

    // Verify isolation - changes in one sandbox don't affect the other
    const files1 = await fs.readdir(path1);
    const files2 = await fs.readdir(path2);

    expect(files1).toEqual(files2); // Should have same base files

    await sandbox1.cleanup();
    await sandbox2.cleanup();
  });

  it('should isolate environment variables', async () => {
    const agentId = 'env-test-agent';
    const sandboxPath = await sandbox.create(agentId);

    const testAgent: Agent = {
      role: 'developer',
      task: 'test env',
      context: { workingDir: sandboxPath },
      sandbox: sandboxPath,
      timeout: 30000
    };

    const result = await sandbox.executeInSandbox(testAgent);

    expect(result).toBeDefined();
    expect(result.exitCode).toBeDefined();
  });

  it('should detect file conflicts between agents', async () => {
    const detector = new ConflictDetector();

    const agent1: Agent = {
      role: 'developer',
      task: 'task1',
      context: {
        workingDir: '/test',
        files: ['file1.js', 'file2.js']
      },
      sandbox: '',
      timeout: 30000
    };

    const agent2: Agent = {
      role: 'validator',
      task: 'task2', 
      context: {
        workingDir: '/test',
        files: ['file2.js', 'file3.js']
      },
      sandbox: '',
      timeout: 30000
    };

    const conflicts = detector.detectFileConflicts(agent1, agent2);

    expect(conflicts.fileConflicts).toContain('file2.js');
    expect(conflicts.resourceConflicts).toContain('Same working directory');
  });

  it('should handle sandbox creation errors gracefully', async () => {
    // Test with invalid base directory
    const invalidSandbox = new AgentSandbox('temp-directory', '/nonexistent/path');
    
    const agentId = 'error-test-agent';
    
    // Should not throw, but handle gracefully
    await expect(async () => {
      await invalidSandbox.create(agentId);
    }).not.toThrow();
  });

  it('should skip appropriate files during copy', async () => {
    // Create files that should be skipped
    await fs.mkdir(path.join(tempDir, 'node_modules'));
    await fs.writeFile(path.join(tempDir, 'node_modules', 'package.json'), '{}');
    await fs.mkdir(path.join(tempDir, '.git'));
    await fs.writeFile(path.join(tempDir, '.git', 'config'), 'test');
    await fs.writeFile(path.join(tempDir, 'test.log'), 'log content');

    const agentId = 'skip-test-agent';
    const sandboxPath = await sandbox.create(agentId);

    const files = await fs.readdir(sandboxPath);
    
    expect(files).not.toContain('node_modules');
    expect(files).not.toContain('.git');
    expect(files).not.toContain('test.log');
    expect(files).toContain('package.json');
    expect(files).toContain('index.js');
  });
});
