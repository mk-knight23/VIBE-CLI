/**
 * Shim wrapper for TypeScript authoritative implementation (openrouter.ts).
 * Redirects to compiled dist/openrouter.js if present.
 * Falls back to legacy inline JS implementation prior to build.
 */
const fs = require('fs');
const path = require('path');
const distFile = path.join(__dirname, 'dist', 'openrouter.js');

let __distLoaded = false;
if (fs.existsSync(distFile)) {
  try {
    module.exports = require(distFile);
    __distLoaded = true;
  } catch (e) {
    // fall through to legacy
  }
}
if (!__distLoaded) {
  // Fallback legacy implementation (will be removed after full TS migration)
  const { getApiKey, loadConfig, saveConfig } = require('./apikey.cjs');
  const pc = require('picocolors');
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const fsLegacy = require('fs');

  const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
  const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://openrouter.ai',
    'X-Title': 'Vibe CLI',
  };

  const TOP_FREE_MODELS = [
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

  const TASK_MODEL_MAPPING = {
    'code-generation': ['deepseek/deepseek-coder-v2-lite', 'qwen/qwen2.5-coder-7b'],
    'chat': ['z-ai/glm-4.5-air:free', 'mistral/mistral-nemo-instruct'],
    'debug': ['qwen/qwen3-coder-480b', 'kwaipilot/kat-coder-pro'],
    'long-context': ['google/gemini-2.0-flash-exp:free'],
    'refactor': ['kwaipilot/kat-coder-pro-v1:free', 'deepseek/deepseek-coder-v2-lite'],
    'test-generation': ['qwen/qwen3-coder-480b-a35b:free', 'deepseek/deepseek-coder-v2-lite'],
    'completion': ['deepseek/deepseek-coder-v2-lite', 'qwen/qwen2.5-coder-7b'],
    'multi-edit': ['kwaipilot/kat-coder-pro-v1:free', 'z-ai/glm-4.5-air:free'],
    'git-analysis': ['z-ai/glm-4.5-air:free', 'mistral/mistral-nemo-instruct'],
    'code-review': ['kwaipilot/kat-coder-pro-v1:free', 'qwen/qwen3-coder-480b-a35b:free']
  };

  function detectTaskType(prompt, command = null) {
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
      }
    }
    if (text.includes('generate') || text.includes('create') || text.includes('implement') || text.includes('write')) return 'code-generation';
    if (text.includes('debug') || text.includes('error') || text.includes('fix') || text.includes('issue')) return 'debug';
    if (text.includes('refactor') || text.includes('optimize') || text.includes('improve')) return 'refactor';
    if (text.includes('test') || text.includes('spec') || text.includes('unit test')) return 'test-generation';
    if (text.includes('complete') || text.includes('finish') || text.includes('autocomplete')) return 'completion';
    if (text.includes('edit') || text.includes('modify') || text.includes('change')) return 'multi-edit';
    if (text.includes('git') || text.includes('commit') || text.includes('pr') || text.includes('merge')) return 'git-analysis';
    if (text.includes('review') || text.includes('analyze') || text.includes('critique')) return 'code-review';
    return 'chat';
  }

  function routeModel(taskType, fallbackModel = null) {
    const models = TASK_MODEL_MAPPING[taskType] || TASK_MODEL_MAPPING['chat'];
    const cfg = loadConfig();
    const defaultModel = fallbackModel || cfg?.openrouter?.defaultModel || 'z-ai/glm-4.5-air:free';
    if (models.includes(defaultModel)) {
      return [defaultModel, ...models.filter(m => m !== defaultModel)];
    }
    return [...models, defaultModel];
  }

  function getApiKeyFromConfig() {
    const envKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    if (envKey) return envKey.trim();
    const cfg = loadConfig();
    return cfg?.openrouter?.apiKey || '';
  }

  function getModelDefaults() {
    const cfg = loadConfig();
    const def = cfg?.openrouter?.defaultModel || 'z-ai/glm-4.5-air:free';
    const list = cfg?.openrouter?.topFreeModels || TOP_FREE_MODELS;
    return { defaultModel: def, topFreeModels: list };
  }

  async function chatCompletion({ apiKey, model, messages, temperature, maxTokens, thinking, taskType, prompt }) {
    try {
      const key = apiKey || await getApiKey();
      let modelOrder;
      if (taskType || prompt) {
        const detectedType = taskType || detectTaskType(prompt);
        modelOrder = routeModel(detectedType, model);
      } else {
        const { topFreeModels } = getModelDefaults();
        const list = Array.isArray(topFreeModels) ? topFreeModels.map(m => typeof m === 'string' ? { id: m } : m) : TOP_FREE_MODELS;
        const ids = list.map(m => m.id);
        const start = model || (loadConfig()?.openrouter?.defaultModel) || 'z-ai/glm-4.5-air:free';
        modelOrder = [start, ...ids.filter(m => m !== start)];
      }

      let lastErr;
      for (const mid of modelOrder) {
        try {
          const body = {
            model: mid,
            messages,
            temperature: temperature ?? 0.2,
            max_tokens: maxTokens,
          };
            if (thinking !== undefined) body.reasoning = { effort: thinking ? 'medium' : 'low' };
          const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
            method: 'POST',
            headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
          });
          if (res.status === 429) throw new Error('429');
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          const data = await res.json();
          const msg = data?.choices?.[0]?.message || {};
          return { model: mid, message: msg, data };
        } catch (e) {
          lastErr = e;
          if (String(e.message).includes('429')) {
            await new Promise(r => setTimeout(r, (loadConfig()?.core?.rateLimitBackoff) || 5000));
            continue;
          }
        }
      }
      throw lastErr || new Error('All models failed');
    } catch (error) {
      console.error(pc.red('OpenRouter API Error:'), error.message);
      throw error;
    }
  }

  async function encodeImageToDataUrl(filePath) {
    const mime = filePath.toLowerCase().endsWith('.png') ? 'image/png'
      : filePath.toLowerCase().match(/\.(jpg|jpeg)$/) ? 'image/jpeg'
      : 'application/octet-stream';
    const buf = fsLegacy.readFileSync(filePath);
    const b64 = buf.toString('base64');
    return `data:${mime};base64,${b64}`;
  }

  function listTopFreeModels() {
    const { topFreeModels, defaultModel } = getModelDefaults();
    const list = Array.isArray(topFreeModels) ? topFreeModels.map(m => typeof m === 'string' ? { id: m } : m) : TOP_FREE_MODELS;
    return { defaultModel: defaultModel || 'z-ai/glm-4.5-air:free', models: list };
  }

  module.exports = {
    loadConfig,
    saveConfig,
    getApiKeyFromConfig,
    getModelDefaults,
    chatCompletion,
    encodeImageToDataUrl,
    listTopFreeModels,
    TOP_FREE_MODELS,
    detectTaskType,
    routeModel,
    TASK_MODEL_MAPPING,
  };
}