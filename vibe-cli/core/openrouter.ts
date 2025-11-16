/**
 * OpenRouter integration (TypeScript authoritative version)
 * Features:
 *  - Centralized API key usage (delegates to apikey.ts)
 *  - Task type detection and model routing
 *  - Automatic rotation + rate-limit backoff
 *  - Image (vision) support via data URL encoding
 *  - Graceful fallbacks
 */

import { getApiKey, loadConfig, saveConfig } from './apikey';
import pc from 'picocolors';
import fs from 'fs';

// Prefer built-in fetch (Node 18+). Fallback dynamic import if missing.
const dynamicFetch: typeof fetch = (...args: Parameters<typeof fetch>) => {
  if (typeof fetch !== 'undefined') return fetch(...args);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node-fetch')(...(args as [RequestInfo, RequestInit?]));
};

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://openrouter.ai',
  'X-Title': 'Vibe CLI',
};

export interface FreeModel {
  id: string;
  ctx?: number;
  note?: string;
}

export const TOP_FREE_MODELS: FreeModel[] = [
  { id: 'tng/deepseek-r1t2-chimera:free', ctx: 164000, note: 'long-context reasoning' },
  { id: 'z-ai/glm-4.5-air:free', ctx: 131000, note: 'default, agentic coding' },
  { id: 'tng/deepseek-r1t-chimera:free', ctx: 164000, note: 'balanced reasoning' },
  { id: 'kwaipilot/kat-coder-pro-v1:free', ctx: 256000, note: 'SWE-Bench strong' },
  { id: 'deepseek/deepseek-v3-0324:free', ctx: 164000, note: 'flagship chat' },
  { id: 'deepseek/r1-0528:free', ctx: 164000, note: 'open reasoning' },
  { id: 'qwen/qwen3-coder-480b-a35b:free', ctx: 262000, note: 'MoE code gen' },
  { id: 'google/gemini-2.0-flash-exp:free', ctx: 1050000, note: 'multimodal/fast' },
  { id: 'google/gemma-3-27b:free', ctx: 131000, note: 'vision/math/reasoning' },
];

export type TaskType =
  | 'code-generation'
  | 'chat'
  | 'debug'
  | 'long-context'
  | 'refactor'
  | 'test-generation'
  | 'completion'
  | 'multi-edit'
  | 'git-analysis'
  | 'code-review';

export const TASK_MODEL_MAPPING: Record<TaskType, string[]> = {
  'code-generation': ['deepseek/deepseek-coder-v2-lite', 'qwen/qwen2.5-coder-7b'],
  chat: ['z-ai/glm-4.5-air:free', 'mistral/mistral-nemo-instruct'],
  debug: ['qwen/qwen3-coder-480b', 'kwaipilot/kat-coder-pro'],
  'long-context': ['google/gemini-2.0-flash-exp:free'],
  refactor: ['kwaipilot/kat-coder-pro-v1:free', 'deepseek/deepseek-coder-v2-lite'],
  'test-generation': ['qwen/qwen3-coder-480b-a35b:free', 'deepseek/deepseek-coder-v2-lite'],
  completion: ['deepseek/deepseek-coder-v2-lite', 'qwen/qwen2.5-coder-7b'],
  'multi-edit': ['kwaipilot/kat-coder-pro-v1:free', 'z-ai/glm-4.5-air:free'],
  'git-analysis': ['z-ai/glm-4.5-air:free', 'mistral/mistral-nemo-instruct'],
  'code-review': ['kwaipilot/kat-coder-pro-v1:free', 'qwen/qwen3-coder-480b-a35b:free'],
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  // OpenRouter messages can have content either as string or array of objects for multimodal
  content:
    | string
    | {
        type: string;
        text?: string;
        image_url?: { url: string };
      }[];
}

export interface ChatCompletionArgs {
  apiKey?: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  taskType?: TaskType;
  prompt?: string; // raw user prompt for detection fallback
}

export interface ChatCompletionResult {
  model: string;
  message: Record<string, unknown>;
  data: any; // raw OpenRouter response
}

export function detectTaskType(prompt: string, command: string | null = null): TaskType {
  const text = (prompt || '').toLowerCase();

  if (command) {
    switch (command) {
      case 'generate':
        return 'code-generation';
      case 'complete':
        return 'completion';
      case 'refactor':
        return 'refactor';
      case 'edit':
        return 'multi-edit';
      case 'debug':
        return 'debug';
      case 'test':
        return 'test-generation';
      case 'git':
        return 'git-analysis';
      case 'review':
        return 'code-review';
      case 'chat':
        return 'chat';
    }
  }

  if (text.match(/\b(generate|create|implement|write)\b/)) return 'code-generation';
  if (text.match(/\b(debug|error|fix|issue)\b/)) return 'debug';
  if (text.match(/\b(refactor|optimize|improve)\b/)) return 'refactor';
  if (text.match(/\b(test|spec|unit test)\b/)) return 'test-generation';
  if (text.match(/\b(complete|finish|autocomplete)\b/)) return 'completion';
  if (text.match(/\b(edit|modify|change)\b/)) return 'multi-edit';
  if (text.match(/\b(git|commit|pr|merge)\b/)) return 'git-analysis';
  if (text.match(/\b(review|analyze|critique)\b/)) return 'code-review';

  return 'chat';
}

export function routeModel(taskType: TaskType, fallbackModel: string | null = null): string[] {
  const models = TASK_MODEL_MAPPING[taskType] || TASK_MODEL_MAPPING['chat'];
  const cfg = loadConfig();
  const defaultModel =
    fallbackModel ||
    cfg?.openrouter?.defaultModel ||
    'z-ai/glm-4.5-air:free';

  if (models.includes(defaultModel)) {
    return [defaultModel, ...models.filter((m) => m !== defaultModel)];
  }
  return [...models, defaultModel];
}

export function getApiKeyFromConfig(): string {
  const envKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (envKey) return envKey.trim();
  const cfg = loadConfig();
  return cfg?.openrouter?.apiKey || '';
}

export function getModelDefaults(): { defaultModel: string; topFreeModels: FreeModel[] } {
  const cfg = loadConfig();
  const def = cfg?.openrouter?.defaultModel || 'z-ai/glm-4.5-air:free';
  const list = cfg?.openrouter?.topFreeModels || TOP_FREE_MODELS;
  const normalized: FreeModel[] = Array.isArray(list)
    ? list.map((m: any) => (typeof m === 'string' ? { id: m } : m))
    : TOP_FREE_MODELS;
  return { defaultModel: def, topFreeModels: normalized };
}

export async function chatCompletion({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  thinking,
  taskType,
  prompt,
}: ChatCompletionArgs): Promise<ChatCompletionResult> {
  try {
    const key = apiKey || (await getApiKey());

    let modelOrder: string[];
    if (taskType || prompt) {
      const detectedType = taskType || detectTaskType(prompt || '');
      modelOrder = routeModel(detectedType, model || null);
    } else {
      // Fallback logic when no task hint present
      const { topFreeModels } = getModelDefaults();
      const ids = topFreeModels.map((m) => m.id);
      const start =
        model ||
        loadConfig()?.openrouter?.defaultModel ||
        'z-ai/glm-4.5-air:free';
      modelOrder = [start, ...ids.filter((m) => m !== start)];
    }

    let lastErr: any;
    for (const mid of modelOrder) {
      try {
        const body: any = {
          model: mid,
          messages,
          temperature: temperature ?? 0.2,
          max_tokens: maxTokens,
        };
        if (thinking !== undefined) {
          body.reasoning = { effort: thinking ? 'medium' : 'low' };
        }

        const res = await dynamicFetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
        });

        if (res.status === 429) throw new Error('429');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        const msg = data?.choices?.[0]?.message || {};
        return { model: mid, message: msg, data };
      } catch (e: any) {
        lastErr = e;
        if (String(e.message).includes('429')) {
          await new Promise((r) =>
            setTimeout(r, loadConfig()?.core?.rateLimitBackoff || 5000),
          );
          continue;
        }
      }
    }
    throw lastErr || new Error('All models failed');
  } catch (error: any) {
    console.error(pc.red('OpenRouter API Error:'), error.message);
    throw error;
  }
}

export function encodeImageToDataUrl(filePath: string): string {
  const lower = filePath.toLowerCase();
  const mime = lower.endsWith('.png')
    ? 'image/png'
    : lower.match(/\.(jpg|jpeg)$/)
    ? 'image/jpeg'
    : 'application/octet-stream';
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  return `data:${mime};base64,${b64}`;
}

export function listTopFreeModels(): { defaultModel: string; models: FreeModel[] } {
  const { topFreeModels, defaultModel } = getModelDefaults();
  return { defaultModel, models: topFreeModels };
}

/**
 * Persist new default model.
 */
export function setDefaultModel(id: string): void {
  const cfg = loadConfig();
  cfg.openrouter = cfg.openrouter || {};
  cfg.openrouter.defaultModel = id;
  saveConfig(cfg);
}

/**
 * Ensure user config is initialized with defaults if missing.
 */
export function ensureDefaults(): void {
  const cfg = loadConfig();
  if (!cfg.openrouter) {
    cfg.openrouter = {
      defaultModel: 'z-ai/glm-4.5-air:free',
      topFreeModels: TOP_FREE_MODELS,
    };
    saveConfig(cfg);
  }
}

/* Removed redundant re-export block to avoid TS duplicate export errors.
   All symbols are already exported at their declaration sites. */