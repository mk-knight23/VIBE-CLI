import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiAgentExecutor, Agent, ProjectContext } from '../src/orchestration/multi-agent-executor';
import { AgentRole } from '../src/orchestration/agent-roles';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MultiAgentExecutor', () => {
  let executor: MultiAgentExecutor;
  let testContext: ProjectContext;
  let tempDir: string;

  beforeEach(async () => {
    executor = new MultiAgentExecutor();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-test-'));
    
    testContext = {
      workingDir: tempDir,
      files: ['test.js'],
      language: 'javascript'
    };

    // Create a test file
    await fs.writeFile(path.join(tempDir, 'test.js'), 'console.log("test");');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  it('should execute 2 agents in parallel', async () => {
    const agents: Agent[] = [
      {
        role: 'developer',
        task: 'Create a simple function',
        context: testContext,
        sandbox: '',
        timeout: 30000
      },
      {
        role: 'validator',
        task: 'Validate the function',
        context: testContext,
        sandbox: '',
        timeout: 30000
      }
    ];

    const results = await executor.spawnParallelAgents('Test task', agents);

    expect(results).toHaveLength(2);
    expect(results[0].role).toBe('developer');
    expect(results[1].role).toBe('validator');
    expect(results.every(r => r.agentId)).toBe(true);
  });

  it('should execute 5 agents in parallel (stress test)', async () => {
    const agents: Agent[] = [
      { role: 'architect', task: 'Design system', context: testContext, sandbox: '', timeout: 30000 },
      { role: 'developer', task: 'Implement code', context: testContext, sandbox: '', timeout: 30000 },
      { role: 'validator', task: 'Test code', context: testContext, sandbox: '', timeout: 30000 },
      { role: 'debugger', task: 'Debug issues', context: testContext, sandbox: '', timeout: 30000 },
      { role: 'reviewer', task: 'Review code', context: testContext, sandbox: '', timeout: 30000 }
    ];

    const startTime = Date.now();
    const results = await executor.spawnParallelAgents('Complex task', agents);
    const executionTime = Date.now() - startTime;

    expect(results).toHaveLength(5);
    expect(executionTime).toBeLessThan(60000); // Should complete within 1 minute
    expect(results.every(r => r.agentId)).toBe(true);
    
    // Verify all roles are represented
    const roles = results.map(r => r.role);
    expect(roles).toContain('architect');
    expect(roles).toContain('developer');
    expect(roles).toContain('validator');
    expect(roles).toContain('debugger');
    expect(roles).toContain('reviewer');
  });

  it('should handle agent timeout correctly', async () => {
    // Set environment variable to simulate delay
    process.env.VIBE_TEST_DELAY = '200'; // 200ms delay
    
    const agents: Agent[] = [
      {
        role: 'developer',
        task: 'Long running task',
        context: testContext,
        sandbox: '',
        timeout: 100 // Very short timeout (100ms)
      }
    ];

    const results = await executor.spawnParallelAgents('Timeout test', agents);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
    expect(results[0].error).toContain('timed out');
    
    // Clean up
    delete process.env.VIBE_TEST_DELAY;
  });

  it('should compare agent results correctly', async () => {
    const mockResults = [
      {
        agentId: '1',
        role: 'developer',
        success: true,
        output: 'Good implementation',
        executionTime: 5000,
        artifacts: ['file1.js']
      },
      {
        agentId: '2',
        role: 'validator',
        success: true,
        output: 'Tests pass',
        executionTime: 3000,
        artifacts: ['test1.js']
      }
    ];

    const scoredResults = await executor.compareAgentResults(mockResults);

    expect(scoredResults).toHaveLength(2);
    expect(scoredResults[0].score).toBeGreaterThan(0);
    expect(scoredResults[0].confidence).toBeGreaterThan(0);
    expect(scoredResults[0].reasoning).toBeDefined();
  });

  it('should prevent race conditions', async () => {
    const agents: Agent[] = [
      { role: 'developer', task: 'Task 1', context: testContext, sandbox: '', timeout: 30000 },
      { role: 'developer', task: 'Task 2', context: testContext, sandbox: '', timeout: 30000 }
    ];

    // Execute multiple times concurrently
    const promises = [
      executor.spawnParallelAgents('Race test 1', agents),
      executor.spawnParallelAgents('Race test 2', agents)
    ];

    const results = await Promise.all(promises);

    expect(results[0]).toHaveLength(2);
    expect(results[1]).toHaveLength(2);
    
    // Verify unique agent IDs
    const allAgentIds = [...results[0], ...results[1]].map(r => r.agentId);
    const uniqueIds = new Set(allAgentIds);
    expect(uniqueIds.size).toBe(allAgentIds.length);
  });

  it('should emit execution events', async () => {
    const events: any[] = [];
    
    executor.on('execution-started', (data) => events.push({ type: 'started', data }));
    executor.on('agent-started', (data) => events.push({ type: 'agent-started', data }));
    executor.on('agent-completed', (data) => events.push({ type: 'agent-completed', data }));
    executor.on('execution-completed', (data) => events.push({ type: 'completed', data }));

    const agents: Agent[] = [
      {
        role: 'developer',
        task: 'Test task',
        context: testContext,
        sandbox: '',
        timeout: 30000
      }
    ];

    await executor.spawnParallelAgents('Event test', agents);

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === 'started')).toBe(true);
    expect(events.some(e => e.type === 'agent-started')).toBe(true);
  });

  it('should handle empty agent array', async () => {
    await expect(
      executor.spawnParallelAgents('Empty test', [])
    ).rejects.toThrow('At least one agent is required');
  });

  it('should handle too many agents', async () => {
    const agents: Agent[] = Array(10).fill(null).map((_, i) => ({
      role: 'developer',
      task: `Task ${i}`,
      context: testContext,
      sandbox: '',
      timeout: 30000
    }));

    await expect(
      executor.spawnParallelAgents('Too many agents', agents)
    ).rejects.toThrow('Cannot spawn more than 5 agents');
  });
});
