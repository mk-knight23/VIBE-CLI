import fs from 'fs';
import path from 'path';

export interface ApiProviderConfig {
  openrouter?: {
    apiKey?: string;
    defaultModel?: string;
  };
  megallm?: {
    apiKey?: string;
    defaultModel?: string;
  };
  agentrouter?: {
    apiKey?: string;
    defaultModel?: string;
  };
  routeway?: {
    apiKey?: string;
    defaultModel?: string;
  };
  [key: string]: any;
}

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.vibe');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): ApiProviderConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveConfig(cfg: ApiProviderConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

export function getConfigValue(key: string): any {
  const cfg = loadConfig();
  return key.split('.').reduce((obj, k) => obj?.[k], cfg as any);
}

export function setConfigValue(key: string, value: any): void {
  const cfg = loadConfig();
  const keys = key.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((obj, k) => {
    if (!obj[k]) obj[k] = {};
    return obj[k];
  }, cfg as any);
  target[last] = value;
  saveConfig(cfg);
}
