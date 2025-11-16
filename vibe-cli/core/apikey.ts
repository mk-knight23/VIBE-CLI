/**
 * Centralized API Key Management (TypeScript authoritative source).
 * The existing CommonJS shim (apikey.cjs) will load the compiled JS from dist.
 *
 * Responsibilities:
 * - Obtain OpenRouter API key (env -> config file -> interactive prompt).
 * - Cache key for session (in-memory).
 * - Persist key to ~/.vibe/config.json if user opts in.
 * - Provide status and utility helpers.
 */

import fs from 'fs';
import path from 'path';

import inquirerImport from 'inquirer';
const inquirer = (inquirerImport as any).default || inquirerImport;

export interface OpenRouterConfig {
  openrouter?: {
    apiKey?: string;
    defaultModel?: string;
    topFreeModels?: any[];
  };
  [key: string]: any;
}

let globalApiKey: string | undefined;
let apiKeyPrompted = false;

/**
 * Load ~/.vibe/config.json (silent failure returns empty object).
 */
export function loadConfig(): OpenRouterConfig {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const file = path.join(home, '.vibe', 'config.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Persist config to ~/.vibe/config.json ensuring directory exists.
 */
export function saveConfig(cfg: OpenRouterConfig): void {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const dir = path.join(home, '.vibe');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Determine if an API key is already available from any source.
 */
export function hasApiKey(): boolean {
  return Boolean(
    globalApiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_KEY ||
      loadConfig()?.openrouter?.apiKey
  );
}

export interface ApiKeyStatus {
  hasKey: boolean;
  isCached: boolean;
  fromEnv: boolean;
  fromConfig: boolean;
  wasPrompted: boolean;
}

/**
 * Return a structured status snapshot for diagnostics / UI display.
 */
export function getApiKeyStatus(): ApiKeyStatus {
  return {
    hasKey: hasApiKey(),
    isCached: Boolean(globalApiKey),
    fromEnv: Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY),
    fromConfig: Boolean(loadConfig()?.openrouter?.apiKey),
    wasPrompted: apiKeyPrompted,
  };
}

/**
 * Clear in-memory key (test / session reset).
 */
export function clearApiKey(): void {
  globalApiKey = undefined;
  apiKeyPrompted = false;
}

/**
 * Acquire API key (interactive if required).
 * Resolution order:
 *  1. Session cache
 *  2. Environment variable (OPENROUTER_API_KEY / OPENROUTER_KEY)
 *  3. Config file (~/.vibe/config.json)
 *  4. Prompt user once (optionally save to config)
 */
export async function getApiKey(): Promise<string> {
  if (globalApiKey) return globalApiKey;

  const envKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (envKey) {
    globalApiKey = String(envKey).trim();
    return globalApiKey;
  }

  const cfg = loadConfig();
  if (cfg?.openrouter?.apiKey) {
    globalApiKey = cfg.openrouter.apiKey;
    return globalApiKey;
  }

  if (!apiKeyPrompted) {
    apiKeyPrompted = true;
    try {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your OpenRouter API key (will be cached for this session):',
          mask: '*',
          validate: (v: string) => (v && v.trim().length > 0) || 'API key is required',
        },
      ]);

      globalApiKey = (apiKey || '').trim();

      const { saveToConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveToConfig',
          message: 'Save API key to config for future use?',
          default: false,
        },
      ]);

      if (saveToConfig) {
        cfg.openrouter = cfg.openrouter || {};
        // globalApiKey is guaranteed set (non-empty string) here.
        cfg.openrouter.apiKey = globalApiKey!;
        saveConfig(cfg);
        // Avoid importing picocolors here to keep ts output lean; shim prints handled in cjs if needed.
        console.log('\x1b[32m%s\x1b[0m', '✓ API key saved to config');
      }

      console.log('\x1b[32m%s\x1b[0m', '✓ API key cached for this session');
      // At this point globalApiKey is a non-empty string.
      return globalApiKey!;
    } catch (error: any) {
      throw new Error('Failed to get API key: ' + error.message);
    }
  }

  throw new Error(
    'API key is required. Set OPENROUTER_API_KEY env variable or configure it via CLI.'
  );
}

export default {
  getApiKey,
  clearApiKey,
  hasApiKey,
  getApiKeyStatus,
  loadConfig,
  saveConfig,
};