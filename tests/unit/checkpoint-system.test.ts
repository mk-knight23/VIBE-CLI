/**
 * VIBE-CLI v12 - Checkpoint System Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { StateSerializer } from '../../src/core/checkpoint-system/state-serializer';
import { CheckpointManager } from '../../src/core/checkpoint-system/checkpoint-manager';

describe('StateSerializer', () => {
  let serializer: StateSerializer;

  beforeEach(() => {
    serializer = new StateSerializer();
  });

  describe('serialize', () => {
    it('should serialize and deserialize a map of file contents', async () => {
      const files = new Map<string, string>();
      files.set('src/index.ts', 'const a = 1;');
      files.set('src/utils.ts', 'export const helper = () => {};');

      const result = await serializer.serialize(files, { format: 'json-gzip' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.fileCount).toBe(2);
      expect(result.metadata?.format).toBe('json-gzip');
    });

    it('should handle empty file map', async () => {
      const files = new Map<string, string>();

      const result = await serializer.serialize(files);

      expect(result.success).toBe(true);
      expect(result.metadata?.fileCount).toBe(0);
    });

    it('should skip files larger than max size', async () => {
      const files = new Map<string, string>();
      const largeContent = 'x'.repeat(20 * 1024 * 1024); // 20MB
      files.set('large-file.txt', largeContent);

      const result = await serializer.serialize(files, { maxFileSize: 10 * 1024 * 1024 });

      expect(result.success).toBe(true);
      expect(result.metadata?.fileCount).toBe(0);
    });

    it('should support different formats', async () => {
      const files = new Map<string, string>();
      files.set('test.json', '{"key": "value"}');

      const jsonResult = await serializer.serialize(files, { format: 'json' });
      expect(jsonResult.success).toBe(true);

      const binaryResult = await serializer.serialize(files, { format: 'binary' });
      expect(binaryResult.success).toBe(true);
    });
  });

  describe('deserialize', () => {
    it('should deserialize data correctly', async () => {
      const original = new Map<string, string>();
      original.set('file1.ts', 'content 1');
      original.set('file2.ts', 'content 2');

      const serializeResult = await serializer.serialize(original, { format: 'json-gzip' });
      expect(serializeResult.success).toBe(true);

      const deserializeResult = await serializer.deserialize(serializeResult.data!, 'json-gzip');
      expect(deserializeResult.success).toBe(true);
      expect(deserializeResult.data?.size).toBe(2);
      expect(deserializeResult.data?.get('file1.ts')).toBe('content 1');
      expect(deserializeResult.data?.get('file2.ts')).toBe('content 2');
    });
  });

  describe('file operations', () => {
    const testDir = path.join(__dirname, 'test-serialize');

    beforeEach(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should serialize to file', async () => {
      const files = new Map<string, string>();
      files.set('test.txt', 'test content');

      const result = await serializer.serializeToFile(files, path.join(testDir, 'test.json.gz'));

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'test.json.gz'))).toBe(true);
    });

    it('should deserialize from file', async () => {
      const files = new Map<string, string>();
      files.set('test.txt', 'test content');

      await serializer.serializeToFile(files, path.join(testDir, 'test.json.gz'));
      const result = await serializer.deserializeFromFile(path.join(testDir, 'test.json.gz'));

      expect(result.success).toBe(true);
      expect(result.data?.get('test.txt')).toBe('test content');
    });
  });
});

describe('CheckpointManager', () => {
  let manager: CheckpointManager;
  const testDir = path.join(__dirname, 'test-checkpoints');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Change to test directory
    process.chdir(testDir);

    // Mock .vibe/checkpoints directory
    const checkpointsDir = path.join(testDir, '.vibe', 'checkpoints');
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }

    manager = new CheckpointManager();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint', async () => {
      // Create a test file
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test content');

      const checkpoint = await manager.createCheckpoint('test-session', {
        name: 'test-checkpoint',
        description: 'Test checkpoint',
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.name).toBe('test-checkpoint');
      expect(checkpoint.sessionId).toBe('test-session');
      expect(checkpoint.fileCount).toBeGreaterThan(0);
    });

    it('should track checkpoints in memory', async () => {
      await manager.createCheckpoint('session-1', { name: 'cp1' });
      await manager.createCheckpoint('session-1', { name: 'cp2' });

      const list = manager.listCheckpoints({ sessionId: 'session-1' });
      expect(list.length).toBe(2);
    });
  });

  describe('listCheckpoints', () => {
    it('should list checkpoints with filtering', async () => {
      await manager.createCheckpoint('session-filter', { name: 'cp1' });
      await manager.createCheckpoint('session-filter', { name: 'cp2' });
      await manager.createCheckpoint('other-session', { name: 'cp3' });

      const all = manager.listCheckpoints();
      expect(all.length).toBeGreaterThanOrEqual(3);

      const filtered = manager.listCheckpoints({ sessionId: 'session-filter' });
      expect(filtered.length).toBe(2);

      const limited = manager.listCheckpoints({ limit: 1 });
      expect(limited.length).toBe(1);
    });
  });

  describe('getCheckpoint', () => {
    it('should return undefined for non-existent checkpoint', () => {
      const cp = manager.getCheckpoint('non-existent-id');
      expect(cp).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await manager.createCheckpoint('stats-session', { name: 'stats-cp' });

      const stats = manager.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.active).toBeGreaterThanOrEqual(1);
    });
  });
});
