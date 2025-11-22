/**
 * Consolidated core functionality for Vibe CLI
 * Combines API key management, OpenRouter integration, and core utilities
 */

import fs from 'fs';
import path from 'path';
import inquirerImport from 'inquirer';
import pc from 'picocolors';
import simpleGit from 'simple-git';

const inquirer = (inquirerImport as any).default || inquirerImport;

// API KEY MANAGEMENT
export interface ApiProviderConfig {
  openrouter?: {
    apiKey?: string;
    defaultModel?: string;
    topFreeModels?: any[];
  };
  megallm?: {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    models?: any[];
  };
  [key: string]: any;
}

let globalApiKey: string | undefined;
let globalApiProvider: 'openrouter' | 'megallm' | null = null;
let apiKeyPrompted = false;

export function loadConfig(): ApiProviderConfig {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const file = path.join(home, '.vibe', 'config.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

export function saveConfig(cfg: ApiProviderConfig): void {
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

export function hasApiKey(): boolean {
  const cfg = loadConfig();
  return Boolean(
    globalApiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_KEY ||
      cfg.openrouter?.apiKey ||
      cfg.megallm?.apiKey
  );
}

export interface ApiKeyStatus {
  hasKey: boolean;
  isCached: boolean;
  fromEnv: boolean;
  fromConfig: boolean;
  wasPrompted: boolean;
  provider: 'openrouter' | 'megallm' | null;
}

export function getApiKeyStatus(): ApiKeyStatus {
  const cfg = loadConfig();
  return {
    hasKey: hasApiKey(),
    isCached: Boolean(globalApiKey),
    fromEnv: Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY),
    fromConfig: Boolean(cfg.openrouter?.apiKey || cfg.megallm?.apiKey),
    wasPrompted: apiKeyPrompted,
    provider: globalApiProvider || (cfg.megallm?.apiKey ? 'megallm' : cfg.openrouter?.apiKey ? 'openrouter' : null),
  };
}

export function clearApiKey(): void {
  globalApiKey = undefined;
  globalApiProvider = null;
  apiKeyPrompted = false;
}

export async function getApiKey(): Promise<string> {
  if (globalApiKey) return globalApiKey;

  // Hardcoded default API keys
  const DEFAULT_OPENROUTER_KEY = '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';
  const DEFAULT_MEGALLM_KEY = 'sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820';

  // Check environment variables first
  const envKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (envKey) {
    globalApiKey = String(envKey).trim();
    globalApiProvider = 'openrouter';
    return globalApiKey;
  }

  // Check config file
  const cfg = loadConfig();
  if (cfg.megallm?.apiKey) {
    globalApiKey = cfg.megallm.apiKey;
    globalApiProvider = 'megallm';
    return globalApiKey;
  }
  if (cfg.openrouter?.apiKey) {
    globalApiKey = cfg.openrouter.apiKey;
    globalApiProvider = 'openrouter';
    return globalApiKey;
  }

  // Use hardcoded defaults if no key is configured
  if (!apiKeyPrompted) {
    apiKeyPrompted = true;
    try {
      // Show welcome screen with both providers
      console.log(pc.bold(pc.cyan('\n=== Vibe CLI Welcome ===')));
      console.log(pc.green('Welcome to Vibe CLI - Your AI Coding Assistant!'));
      console.log(pc.gray('We support two powerful AI providers:'));
      console.log(pc.cyan('  • OpenRouter - Access to 100+ free models'));
      console.log(pc.cyan('  • MegaLLM - High-performance models with 128K context'));
      console.log('');
      console.log(pc.yellow('Please select your preferred AI provider:'));
      console.log('');

      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select AI Provider:',
          choices: [
            { name: 'OpenRouter (Recommended - Free Models)', value: 'openrouter' },
            { name: 'MegaLLM (High-Performance)', value: 'megallm' },
          ],
        },
      ]);

      // Use hardcoded default key for selected provider
      globalApiKey = provider === 'openrouter' ? DEFAULT_OPENROUTER_KEY : DEFAULT_MEGALLM_KEY;
      globalApiProvider = provider;

      // Show confirmation with key info
      console.log(pc.green(`✓ Using ${provider === 'openrouter' ? 'OpenRouter' : 'MegaLLM'} with default API key`));
      console.log(pc.gray('Your API key has been set automatically. You can change it later with "vibe config"'));
      console.log('');

      // Save to config
      cfg[provider] = cfg[provider] || {};
      cfg[provider].apiKey = globalApiKey!;
      if (provider === 'megallm') {
        cfg[provider].baseUrl = 'https://ai.megallm.io/v1';
      }
      saveConfig(cfg);
      console.log('\x1b[32m%s\x1b[0m', `✓ API key saved to config for ${provider}`);

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

// API PROVIDERS
export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
export const MEGALLM_BASE = 'https://ai.megallm.io/v1';

export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

export const TOP_FREE_MODELS = [
  { id: 'qwen/qwen3-next-80b-a3b-instruct', ctx: 262144, note: 'Qwen Qwen3 Next 80B A3B Instruct - Advanced AI model', provider: 'Alibaba' },
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

export const MEGALLM_MODELS = [
  { id: 'openai-gpt-oss-20b', ctx: 128000, note: 'Advanced language model with superior reasoning capabilities', provider: 'OpenAI' },
  { id: 'llama3.3-70b-instruct', ctx: 131072, note: 'Open-source large language model', provider: 'Meta' },
  { id: 'deepseek-r1-distill-llama-70b', ctx: 128000, note: 'Open-source large language model', provider: 'Meta' },
  { id: 'alibaba-qwen3-32b', ctx: 131072, note: 'Qwen3 32B - Advanced AI model', provider: 'Alibaba' },
  { id: 'openai-gpt-oss-120b', ctx: 128000, note: 'Advanced language model with superior reasoning capabilities', provider: 'OpenAI' },
  { id: 'llama3-8b-instruct', ctx: 8192, note: 'Open-source large language model', provider: 'Meta' },
  { id: 'moonshotai/kimi-k2-instruct-0905', ctx: 256000, note: 'moonshotai/kimi-k2-instruct-0905 - Advanced AI model', provider: 'moonshotai' },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', ctx: 163840, note: 'deepseek-ai/deepseek-v3.1-terminus - Advanced AI model', provider: 'DeepSeek' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', ctx: 262144, note: 'qwen/qwen3-next-80b-a3b-instruct - Advanced AI model', provider: 'Alibaba' },
  { id: 'deepseek-ai/deepseek-v3.1', ctx: 128000, note: 'deepseek-ai/deepseek-v3.1 - Advanced AI model', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-nemotron', ctx: 128000, note: 'High-performance open-source language model', provider: 'Mistral AI' },
  { id: 'minimaxai/minimax-m2', ctx: 128000, note: 'minimaxai/minimax-m2 - Advanced AI model', provider: 'minimaxai/minimax-m2' },
];

export const TASK_MODEL_MAPPING: Record<string, string[]> = {
  'code-generation': ['qwen/qwen3-next-80b-a3b-instruct', 'deepseek/deepseek-coder-v2-lite'],
  chat: ['qwen/qwen3-next-80b-a3b-instruct', 'mistral/mistral-nemo-instruct'],
  debug: ['qwen/qwen3-next-80b-a3b-instruct', 'kwaipilot/kat-coder-pro'],
  'long-context': ['google/gemini-2.0-flash-exp:free'],
  refactor: ['qwen/qwen3-next-80b-a3b-instruct', 'deepseek/deepseek-coder-v2-lite'],
  'test-generation': ['qwen/qwen3-next-80b-a3b-instruct', 'deepseek/deepseek-coder-v2-lite'],
  completion: ['qwen/qwen3-next-80b-a3b-instruct', 'qwen/qwen2.5-coder-7b'],
  'multi-edit': ['qwen/qwen3-next-80b-a3b-instruct', 'z-ai/glm-4.5-air:free'],
  'git-analysis': ['qwen/qwen3-next-80b-a3b-instruct', 'mistral/mistral-nemo-instruct'],
  'code-review': ['qwen/qwen3-next-80b-a3b-instruct', 'qwen/qwen3-coder-480b-a35b:free'],
  agent: ['qwen/qwen3-next-80b-a3b-instruct', 'deepseek/deepseek-coder-v2-lite'],
};

// Prefer built-in fetch (Node 18+). Fallback dynamic import if missing.
const dynamicFetch: typeof fetch = (...args: Parameters<typeof fetch>) => {
  if (typeof fetch !== 'undefined') return fetch(...args);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node-fetch')(...(args as [RequestInfo, RequestInit?]));
};

export function detectTaskType(prompt: string, command: string | null = null): string {
  const text = (prompt || '').toLowerCase();

  if (command) {
    switch (command) {
      case 'generate': return 'code-generation';
      case 'complete': return 'completion';
      case 'refactor': return 'refactor';
      case 'edit': return 'multi-edit';
      case 'debug': return 'debug';
      case 'test': return 'test-generation';
      case 'git': return 'git-analysis';
      case 'review': return 'code-review';
      case 'chat': return 'chat';
      case 'agent': return 'agent';
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
  if (text.match(/\b(agent|task|plan)\b/)) return 'agent';

  return 'chat';
}

export function routeModel(taskType: string, fallbackModel: string | null = null): string[] {
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

export function getModelDefaults(): { defaultModel: string; topFreeModels: any[] } {
  const cfg = loadConfig();
  const def = cfg?.openrouter?.defaultModel || 'qwen/qwen3-next-80b-a3b-instruct';
  const list = cfg?.openrouter?.topFreeModels || TOP_FREE_MODELS;
  const normalized = Array.isArray(list)
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
}: {
  apiKey?: string;
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  taskType?: string;
  prompt?: string;
}): Promise<{ model: string; message: Record<string, unknown>; data: any }> {
  try {
    const key = apiKey || (await getApiKey());
    const apiKeyStatus = getApiKeyStatus();
    const provider = apiKeyStatus.provider || 'openrouter';

    let modelOrder: string[];
    if (taskType || prompt) {
      const detectedType = taskType || detectTaskType(prompt || '');
      modelOrder = routeModel(detectedType, model || null);
    } else {
      const { topFreeModels } = getModelDefaults();
      const ids = topFreeModels.map((m: any) => m.id);
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

        const baseUrl = provider === 'megallm' ? MEGALLM_BASE : OPENROUTER_BASE;
        const headers: Record<string, string> = {
          ...DEFAULT_HEADERS,
          Authorization: `Bearer ${key}`,
        };

        // For MegaLLM, we need to use the model ID directly without prefix
        if (provider === 'megallm') {
          // MegaLLM expects the model ID as-is
          // No additional headers needed beyond the API key
        } else {
          // OpenRouter requires the additional headers
          headers['HTTP-Referer'] = 'https://openrouter.ai';
          headers['X-Title'] = 'Vibe CLI';
        }

        const res = await dynamicFetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
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
    console.error(pc.red('API Error:'), error.message);
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

export function listTopFreeModels(): { defaultModel: string; models: any[] } {
  const { topFreeModels, defaultModel } = getModelDefaults();
  return { defaultModel, models: topFreeModels };
}

export function setDefaultModel(id: string): void {
  const cfg = loadConfig();
  cfg.openrouter = cfg.openrouter || {};
  cfg.openrouter.defaultModel = id;
  saveConfig(cfg);
}

export function ensureDefaults(): void {
  const cfg = loadConfig();
  if (!cfg.openrouter) {
    cfg.openrouter = {
      defaultModel: 'qwen/qwen3-next-80b-a3b-instruct',
      topFreeModels: TOP_FREE_MODELS,
    };
    saveConfig(cfg);
  }
}

// CODE GENERATION UTILITIES
export function detectLanguage(context: string = '', filePath: string | null = null): string {
  const text = context.toLowerCase();

  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const extensionMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'react',
      '.tsx': 'react-typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.sql': 'sql',
      '.sh': 'bash',
      '.md': 'markdown'
    };

    if (extensionMap[ext]) {
      return extensionMap[ext];
    }
  }

  if (text.includes('function') || text.includes('const') || text.includes('let') || text.includes('var')) {
    return 'javascript';
  }
  if (text.includes('def ') || text.includes('import ') || text.includes('from ')) {
    return 'python';
  }
  if (text.includes('public class') || text.includes('import java')) {
    return 'java';
  }
  if (text.includes('using System') || text.includes('namespace ')) {
    return 'csharp';
  }
  if (text.includes('package ') || text.includes('import java')) {
    return 'java';
  }
  if (text.includes('package main') || text.includes('func main')) {
    return 'go';
  }
  if (text.includes('fn main') || text.includes('use std')) {
    return 'rust';
  }
  if (text.includes('class React') || text.includes('useState') || text.includes('useEffect')) {
    return 'react';
  }
  if (text.includes('<html') || text.includes('<div') || text.includes('<body')) {
    return 'html';
  }

  return 'javascript';
}

export async function generateCode(prompt: string, options: any = {}) {
  const {
    language = null,
    context = '',
    filePath = null,
    model = null,
    stream = false
  } = options;

  const detectedLanguage = language || detectLanguage(context, filePath);

  const systemPrompt = `You are an expert ${detectedLanguage} developer. Generate clean, efficient, and well-documented code. Follow best practices and include error handling where appropriate. Only output the code without explanations unless specifically asked.`;

  let userPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;

  if (context) {
    userPrompt += `\n\nContext:\n${context}`;
  }

  if (filePath) {
    userPrompt += `\n\nFile path: ${filePath}`;
  }

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'code-generation',
      prompt,
      model,
      messages,
      temperature: 0.2
    });

    return {
      code: response.message?.content || '',
      language: detectedLanguage,
      model: response.model
    };
  } catch (error: any) {
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

export async function generateCompletion(filePath: string, options: any = {}) {
  const {
    line = null,
    contextLines = 100,
    maxSuggestions = 3,
    model = null
  } = options;

  const context = readFileContext(filePath, line, contextLines);

  let prompt = `Complete the code at the cursor position in this ${context.language} file.\n\n`;

  if (line !== null) {
    prompt += `Context (lines ${context.startLine}-${context.endLine}):\n`;
    prompt += context.beforeCursor;
    prompt += '\n[CURSOR POSITION]\n';
    prompt += context.afterCursor;
  } else {
    prompt += `File content:\n${context.content}`;
  }

  prompt += '\n\nProvide multiple completion suggestions that are syntactically correct and contextually appropriate.';

  const systemPrompt = `You are an expert ${context.language} developer specializing in code completion and autocompletion. Provide accurate, context-aware code completions. Format your response as a numbered list of suggestions, each containing only the code to be inserted without explanations.`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'completion',
      prompt: `Complete ${context.language} code`,
      model,
      messages,
      temperature: 0.1
    });

    const content = (response.message?.content as string) || '';

    const suggestions: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && suggestions.length < maxSuggestions) {
        suggestions.push(match[1].trim());
      }
    }

    if (suggestions.length === 0) {
      const codeBlocks = content.split('```').filter((_, i) => i % 2 === 1);
      for (const block of codeBlocks.slice(0, maxSuggestions)) {
        suggestions.push(block.trim());
      }
    }

    if (suggestions.length === 0) {
      suggestions.push(content.trim());
    }

    return {
      suggestions: suggestions.slice(0, maxSuggestions),
      language: context.language,
      model: response.model,
      context: {
        filePath,
        line,
        beforeCursor: context.beforeCursor,
        afterCursor: context.afterCursor
      }
    };
  } catch (error: any) {
    throw new Error(`Code completion failed: ${error.message}`);
  }
}

function readFileContext(filePath: string, targetLine: number | null = null, contextLines = 100) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    if (targetLine === null) {
      return {
        content,
        lines,
        language: detectLanguage(content, filePath)
      };
    }

    const start = Math.max(0, targetLine - contextLines);
    const end = Math.min(lines.length, targetLine + contextLines);

    const contextLinesArray = lines.slice(start, end);
    const beforeCursor = contextLinesArray.slice(0, targetLine - start).join('\n');
    const afterCursor = contextLinesArray.slice(targetLine - start).join('\n');

    return {
      beforeCursor,
      afterCursor,
      content: contextLinesArray.join('\n'),
      lines: contextLinesArray,
      language: detectLanguage(content, filePath),
      targetLine,
      startLine: start + 1,
      endLine: end
    };
  } catch (error: any) {
    throw new Error(`Failed to read file context: ${error.message}`);
  }
}

// REFACTORING UTILITIES
export async function quickRefactor(input: string, options: { model?: string; strategy?: string } | string = {}): Promise<any> {
  let model: string | null = null;
  let strategy: string = 'clean';
  
  if (typeof options === 'string') {
    strategy = options;
  } else if (typeof options === 'object') {
    ({ model = null, strategy = 'clean' } = options);
  }
  
  const actualModel = model || undefined;

  let refactoringInput = input;
  let context = '';

  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    const fileContent = fs.readFileSync(input, 'utf8');
    context = `\n\nFile: ${input}\nContent:\n${fileContent}`;
    refactoringInput = `Refactor the following code from ${input}: ${fileContent}`;
  }

  const systemPrompt = `You are an expert software refactoring engineer. Apply the ${strategy} refactoring strategy to the provided code. Focus on:
  - Improving code readability and maintainability
  - Following best practices for the detected language
  - Preserving functionality while improving structure
  - Using appropriate design patterns
  - Adding or improving documentation`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: refactoringInput }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'refactor',
      prompt: `Refactor: ${input}`,
      model: actualModel,
      messages,
      temperature: 0.2
    });

    return {
      refactoredCode: response.message?.content || '',
      model: response.model,
      strategy,
      context,
      success: true,
      message: 'Refactoring completed successfully'
    };
  } catch (error: any) {
    throw new Error(`Refactoring failed: ${error.message}`);
  }
}

// DEBUG UTILITIES
export async function quickDebug(input: string, options: { model?: string; verbose?: boolean } = {}) {
  const { model = null, verbose = false } = options;
  const actualModel = model || undefined;

  let debugInput = input;
  let context = '';

  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    const fileContent = fs.readFileSync(input, 'utf8');
    context = `\n\nFile: ${input}\nContent:\n${fileContent}`;
    debugInput = `Debug the following code from ${input}: ${fileContent}`;
  }

  if (verbose) {
    console.log(pc.cyan(`Debugging input: ${debugInput}`));
  }

  const systemPrompt = `You are an expert software debugger. Analyze the provided code, error, or debugging request. Identify:
  - The root cause of the issue (if any)
  - Potential fixes or solutions
  - Best practices that could prevent similar issues
  - Security concerns if applicable

Provide a clear, structured analysis with actionable steps.`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: debugInput }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'debug',
      prompt: `Debug: ${input}`,
      model: actualModel,
      messages,
      temperature: 0.2
    });

    return {
      analysis: response.message?.content || '',
      model: response.model,
      context
    };
  } catch (error: any) {
    throw new Error(`Debug analysis failed: ${error.message}`);
  }
}

// TEST GENERATION UTILITIES
export async function quickTestGeneration(target: string, options: { model?: string; testFramework?: string; language?: string } = {}) {
  const { model = null, testFramework = 'jest', language = null } = options;
  const actualModel = model || undefined;

  let fileContent = '';
  let filePath = target;
  let detectedLanguage = language;

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    fileContent = fs.readFileSync(target, 'utf8');
    filePath = target;
    
    if (!detectedLanguage) {
      const ext = path.extname(target).toLowerCase();
      switch (ext) {
        case '.js':
        case '.jsx':
          detectedLanguage = 'javascript';
          break;
        case '.ts':
        case '.tsx':
          detectedLanguage = 'typescript';
          break;
        case '.py':
          detectedLanguage = 'python';
          break;
        case '.java':
          detectedLanguage = 'java';
          break;
        case '.go':
          detectedLanguage = 'go';
          break;
        case '.rs':
          detectedLanguage = 'rust';
          break;
        case '.php':
          detectedLanguage = 'php';
          break;
        case '.rb':
          detectedLanguage = 'ruby';
          break;
        default:
          detectedLanguage = 'javascript';
      }
    }
  } else {
    fileContent = target;
    detectedLanguage = language || 'javascript';
  }

  const systemPrompt = `You are an expert test engineer. Generate comprehensive tests for the provided code using ${testFramework} framework and ${detectedLanguage} language.
  Include:
  - Unit tests for individual functions/methods
  - Edge case tests
  - Error handling tests
  - Integration tests if applicable
  - Follow best practices for the specified framework
  - Use appropriate test descriptions and assertions`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate tests for:\n\n${fileContent}` }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'test-generation',
      prompt: `Generate tests for ${filePath || 'code'}`,
      model: actualModel,
      messages,
      temperature: 0.3
    });

    return {
      tests: response.message?.content || '',
      model: response.model,
      testFramework,
      language: detectedLanguage,
      target: filePath
    };
  } catch (error: any) {
    throw new Error(`Test generation failed: ${error.message}`);
  }
}

// GIT TOOLS

export async function smartCommit(options: any = {}) {
  const {
    addAll = true,
    style = 'conventional',
    customMessage = null,
    dryRun = false
  } = options;

  const git = simpleGit();

  try {
    const status = await git.status();

    if (status.staged.length === 0 && status.modified.length === 0) {
      return { success: false, message: 'No changes to commit' };
    }

    if (addAll && status.modified.length > 0) {
      await git.add('.');
    }

    const diff = await git.diff(['--staged']);

    if (!diff) {
      return { success: false, message: 'No staged changes to commit' };
    }

    let commitMessage;
    if (customMessage) {
      commitMessage = { message: customMessage };
    } else {
      console.log(pc.cyan('Generating commit message...'));
      commitMessage = await generateCommitMessage(diff, { style });
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: commitMessage.message,
        diff: diff.slice(0, 1000) + '...'
      };
    }

    await git.commit(commitMessage.message);

    return {
      success: true,
      message: commitMessage.message,
      model: commitMessage.model,
      files: status.staged.length
    };
  } catch (error: any) {
    throw new Error(`Smart commit failed: ${error.message}`);
  }
}

async function generateCommitMessage(diff: string, options: any = {}) {
  const { model = null, style = 'conventional' } = options;
  const actualModel = model || undefined;

  const systemPrompt = `You are an expert software developer specializing in writing ${style} commit messages. Analyze the provided git diff and generate a concise, descriptive commit message.

For conventional commits, use the format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
Keep the message under 50 characters for the subject line.`;

  const userPrompt = `Generate a ${style} commit message for these changes:\n\n${diff.slice(0, 4000)}`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'git-analysis',
      prompt: userPrompt,
      model: actualModel,
      messages,
      temperature: 0.2
    });

    return {
      message: response.message?.content || '',
      model: response.model,
      style
    };
  } catch (error: any) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

// GIT UTILITIES

export async function reviewChanges(options: any = {}) {
  const { focus = 'all', staged = false, file = null, output = 'console' } = options;

  const git = simpleGit();

  try {
    let diff: string;

    if (file) {
      diff = await git.diff([staged ? '--staged' : '--', file]);
    } else if (staged) {
      diff = await git.diff(['--staged']);
    } else {
      diff = await git.diff();
    }

    if (!diff) {
      return { success: false, message: 'No changes to review' };
    }

    console.log(pc.cyan('Analyzing changes for review...'));
    const review = await quickDebug(diff, { verbose: false }); // Using quickDebug as a general analyzer

    if (output === 'console') {
      console.log(pc.green('\n=== Code Review ==='));
      console.log(review.analysis);
    }

    return {
      success: true,
      review: review.analysis,
      focus,
      model: review.model
    };
  } catch (error: any) {
    throw new Error(`Code review failed: ${error.message}`);
  }
}

export async function createPR(options: any = {}) {
  const {
    title = null,
    base = 'main',
    head = 'HEAD',
    includeDiffs = false,
    dryRun = false
  } = options;

  const git = simpleGit();

  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;

    const diff = await git.diff([`${base}...${currentBranch}`]);

    if (!diff) {
      return { success: false, message: 'No differences between branches' };
    }

    console.log(pc.cyan('Generating pull request description...'));
    const prDesc = await quickDebug(`Create a PR description for these changes: ${diff.slice(0, 2000)}`, { verbose: false });

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        title: title || `PR: ${currentBranch} → ${base}`,
        description: prDesc.analysis,
        branch: currentBranch
      };
    }

    return {
      success: true,
      title: title || `PR: ${currentBranch} → ${base}`,
      description: prDesc.analysis,
      branch: currentBranch,
      base,
      note: 'Manual PR creation required - use generated content above'
    };
  } catch (error: any) {
    throw new Error(`PR creation failed: ${error.message}`);
  }
}

export async function smartStatus(options: any = {}) {
  const { model = null, includeSuggestions = true } = options;

  const git = simpleGit();

  try {
    const status = await git.status();

    let insights = '';

    if (includeSuggestions && (status.modified.length > 0 || status.staged.length > 0)) {
      const diff = await git.diff();
      insights = `Based on your changes, consider: ...`; // Simplified
    }

    return {
      status,
      insights,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified,
      staged: status.staged,
      untracked: status.not_added || []
    };
  } catch (error: any) {
    throw new Error(`Smart status failed: ${error.message}`);
  }
}

// AGENT UTILITIES
export async function runAutonomousAgent(task: string, options: { auto?: boolean; maxSteps?: number } = {}) {
  const { auto = false, maxSteps = 10 } = options;

  console.log(pc.cyan(`\n=== Autonomous Agent Mode ===`));
  console.log(pc.gray(`Task: ${task}`));
  console.log(pc.gray(`Auto mode: ${auto ? 'ON' : 'OFF (permission prompts)'}\n`));

  try {
    console.log(pc.cyan('Breaking down task into steps...'));
    const breakdown = await breakDownTask(task);
    const steps = parseSteps(breakdown.steps);

    console.log(pc.green(`Generated ${steps.length} steps using model: ${(breakdown.model as string) || 'unknown'}`));

    let completedSteps = 0;
    const results: any[] = [];

    for (let i = 0; i < Math.min(steps.length, maxSteps); i++) {
      const step = steps[i];
      console.log(pc.cyan(`\nStep ${i + 1}/${steps.length}: ${step.description}`));

      try {
        let result: any;
        result = await executeShellCommand(step.description, auto);

        step.completed = result.success;
        step.result = result;
        results.push(result);

        if (result.success) {
          console.log(pc.green(`✓ Completed: ${step.description}`));
          completedSteps++;
        } else {
          console.log(pc.red(`✗ Failed: ${step.description}`));
          console.log(pc.yellow(`  Error: ${result.message || result.error}`));

          if (!auto) {
            const { cont } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'cont',
                message: 'Continue with next step?',
                default: true
              }
            ]);
            if (!cont) break;
          }
        }

      } catch (error: any) {
        console.log(pc.red(`✗ Error in step: ${error.message}`));
        step.result = { success: false, error: error.message };
        results.push(step.result);
      }
    }

    console.log(pc.cyan(`\n=== Agent Execution Summary ===`));
    console.log(pc.green(`Completed: ${completedSteps}/${steps.length} steps`));

    if (completedSteps === steps.length) {
      console.log(pc.green('🎉 Task completed successfully!'));
    } else {
      console.log(pc.yellow('⚠️  Task completed with some failures'));
    }

    return {
      success: completedSteps === steps.length,
      completedSteps,
      totalSteps: steps.length,
      results,
      steps
    };

  } catch (error: any) {
    console.error(pc.red('Agent execution failed:'), error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function breakDownTask(task: string) {
  const systemPrompt = `You are an expert project manager and software engineer. Break down the following task into specific, actionable steps. Each step should be:
 1. Clear and specific
 2. Executable by an AI agent
 3. Include the type of operation (file, shell, git, etc.)
 4. Ordered logically

 Format your response as a numbered list of steps.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Break down this task into actionable steps: ${task}` }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'agent',
      prompt: `Break down task: ${task}`,
      messages,
      temperature: 0.2
    });

    return {
      steps: (response.message?.content as string) || '',
      model: (response.model as string) || ''
    };
  } catch (error: any) {
    throw new Error(`Failed to break down task: ${error.message}`);
  }
}

function parseSteps(stepsText: string) {
  const lines = stepsText.split('\n');
  const steps: { description: string; completed: boolean; result: any }[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      steps.push({
        description: match[1].trim(),
        completed: false,
        result: null
      });
    }
  }

  return steps;
}

async function executeShellCommand(command: string, auto = false) {
  const { exec } = await import('child_process');

  if (!auto) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Execute shell command: ${command}?`,
        default: false
      }
    ]);
    if (!confirm) {
      return { success: false, message: 'Cancelled by user' };
    }
  }

  return new Promise((resolve, reject) => {
    console.log(pc.cyan(`Executing: ${command}`));

    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          stderr,
          stdout
        });
      } else {
        resolve({
          success: true,
          stdout: stdout || stderr || '(no output)',
          stderr
        });
      }
    });
  });
}

// TOOLS UTILITY FUNCTIONS
export async function webSearch(query: string): Promise<string> {
  if (!query || !query.trim()) return 'Empty query';
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const resp = await fetchWithTimeout(url, { timeout: 15000 });
    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Heading) parts.push(`Heading: ${data.Heading}`);
    if (Array.isArray(data.RelatedTopics)) {
      const tops = data.RelatedTopics
        .map((t: any) => (t.Text || t.Result || '').replace(/<[^>]*>/g, ''))
        .filter(Boolean)
        .slice(0, 5);
      if (tops.length) parts.push('Related: ' + tops.join(' | '));
    }
    const combined = parts.join('\n');
    return combined || 'No instant answer found.';
  } catch (e: any) {
    return `Search error: ${e?.message || e}`;
  }
}

const OPENROUTER_DOCS = 'https://openrouter.ai/docs';
const ALLOWED_PAGES = new Set(['quick-start','models','api-reference','sdks','guides','errors','authentication','rate-limits']);

export async function webFetchDocs(page: string): Promise<string> {
  const p = String(page || '').trim();
  if (!ALLOWED_PAGES.has(p)) return 'Invalid docs page';
  try {
    const url = `${OPENROUTER_DOCS}/${p}`;
    const resp = await fetchWithTimeout(url, { timeout: 20000 });
    const contentType = resp.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await resp.json() : await resp.text();
    if (typeof body === 'string') return body.slice(0, 20000);
    return JSON.stringify(body).slice(0, 20000);
  } catch (e: any) {
    return `Docs fetch error: ${e?.message || e}`;
  }
}

async function fetchWithTimeout(resource: string, options: { timeout?: number; [key: string]: any } = {}) {
  const { timeout = 15000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const result = await fetch(resource, { ...rest, signal: controller.signal });
    return result;
  } finally {
    clearTimeout(id);
  }
}