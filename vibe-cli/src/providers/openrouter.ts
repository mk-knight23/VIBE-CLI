import { loadConfig } from '../core/config';
import { DEFAULT_KEYS, PROVIDERS, fetchWithTimeout } from './index';

const FREE_MODELS = [
  { id: 'x-ai/grok-4.1-fast:free', name: 'Grok 4.1 Fast', contextLength: 128000 },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', contextLength: 128000 },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek Chat V3', contextLength: 64000 },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder', contextLength: 32000 },
  { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B', contextLength: 8000 },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', contextLength: 1000000 }
];

export async function getOpenRouterKey(): Promise<string> {
  const cfg = loadConfig();
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    cfg.openrouter?.apiKey ||
    DEFAULT_KEYS.openrouter
  );
}

export async function fetchOpenRouterModels(): Promise<any[]> {
  return FREE_MODELS;
}

export async function openRouterChat(
  messages: any[],
  model: string,
  options: any = {}
): Promise<any> {
  const apiKey = await getOpenRouterKey();
  const res = await fetchWithTimeout(`${PROVIDERS.openrouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/mk-knight23/vibe',
      'X-Title': 'Vibe CLI'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000
    }),
    timeout: 60000
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`${res.status}: ${error}`);
  }
  
  return await res.json();
}
