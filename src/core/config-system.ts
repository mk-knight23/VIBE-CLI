import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import dotenv from 'dotenv';

// Load .env files
dotenv.config();

const ModelConfigSchema = z.object({
    defaultTier: z.enum(['fast', 'balanced', 'reasoning', 'max']).default('balanced'),
    providers: z.array(z.string()).default(['minimax', 'anthropic', 'openai']),
    fallbackOrder: z.array(z.string()).default(['minimax', 'anthropic', 'openai']),
    maxContextTokens: z.number().default(128000),
});

const ApprovalConfigSchema = z.object({
    defaultPolicy: z.enum(['prompt', 'always', 'never']).default('prompt'),
    autoApprovePatterns: z.array(z.string()).default(['tests/**', 'docs/**']),
    dangerousCommands: z.array(z.string()).default(['rm -rf', 'format', 'mkfs', 'drop']),
});

const SecurityConfigSchema = z.object({
    scanEnabled: z.boolean().default(true),
    failOnCritical: z.boolean().default(true),
    allowedDomains: z.array(z.string()).default(['*.github.com', '*.npmjs.com']),
});

const VibeConfigSchema = z.object({
    model: ModelConfigSchema.default({
        defaultTier: 'balanced',
        providers: ['minimax', 'anthropic', 'openai'],
        fallbackOrder: ['minimax', 'anthropic', 'openai'],
        maxContextTokens: 128000
    }),
    approval: ApprovalConfigSchema.default({
        defaultPolicy: 'prompt',
        autoApprovePatterns: ['tests/**', 'docs/**'],
        dangerousCommands: ['rm -rf', 'format', 'mkfs', 'drop']
    }),
    security: SecurityConfigSchema.default({
        scanEnabled: true,
        failOnCritical: true,
        allowedDomains: ['*.github.com', '*.npmjs.com']
    }),
    telemetry: z.boolean().default(true),
    theme: z.enum(['dark', 'light', 'nord', 'solarized']).default('dark'),
});

export type VibeConfig = z.infer<typeof VibeConfigSchema>;

export class ConfigManager {
    private static instance: ConfigManager;
    private config: VibeConfig;
    private configPath: string;

    private constructor() {
        this.configPath = path.join(process.cwd(), '.vibe', 'config.json');
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadConfig(): VibeConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const parsed = JSON.parse(raw);
                return VibeConfigSchema.parse(parsed);
            }
        } catch (error) {
            console.warn('⚠️  Could not load .vibe/config.json, using defaults.');
        }
        return VibeConfigSchema.parse({});
    }

    public getConfig(): VibeConfig {
        return this.config;
    }

    public saveConfig(newConfig: Partial<VibeConfig>): void {
        this.config = VibeConfigSchema.parse({ ...this.config, ...newConfig });
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    public getEnv(key: string): string | undefined {
        return process.env[key];
    }
}

export const configManager = ConfigManager.getInstance();
