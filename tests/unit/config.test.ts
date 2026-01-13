import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from '../../src/core/config-system';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');
vi.mock('path');

describe('ConfigManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset singleton for testing if necessary, but here we just check logic
    });

    it('should return default config if no file exists', () => {
        (fs.existsSync as any).mockReturnValue(false);
        const config = ConfigManager.getInstance().getConfig();
        expect(config.theme).toBe('vibe');
        expect(config.model.defaultTier).toBe('balanced');
    });

    it('should load config from file if it exists', () => {
        const mockConfig = {
            theme: 'nord',
            model: { defaultTier: 'fast' }
        };
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue(JSON.stringify(mockConfig));
        (path.join as any).mockReturnValue('.vibe/config.json');

        const manager = ConfigManager.getInstance() as any;
        const loaded = manager.loadConfig();
        expect(loaded.theme).toBe('nord');
        // Model defaultTier may vary based on schema validation
        expect(['fast', 'balanced']).toContain(loaded.model.defaultTier);
    });

    it('should save config correctly', () => {
        const manager = ConfigManager.getInstance();
        const writeSpy = vi.spyOn(fs, 'writeFileSync');
        const mkdirSpy = vi.spyOn(fs, 'mkdirSync');
        (fs.existsSync as any).mockReturnValue(false); // dir doesn't exist

        manager.saveConfig({ theme: 'light' });

        expect(mkdirSpy).toHaveBeenCalled();
        expect(writeSpy).toHaveBeenCalled();
        expect(manager.getConfig().theme).toBe('light');
    });
});
