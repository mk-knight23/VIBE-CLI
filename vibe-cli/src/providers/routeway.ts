import { loadConfig } from '../core/config';
import { DEFAULT_KEYS, PROVIDERS, fetchWithTimeout } from './index';

export async function getRoutewayKey(): Promise<string> {
  const cfg = loadConfig();
  return (
    process.env.ROUTEWAY_API_KEY ||
    cfg.routeway?.apiKey ||
    DEFAULT_KEYS.routeway
  );
}

export async function fetchRoutewayModels(): Promise<any[]> {
  return [
    { id: 'kimi-k2-0905:free', name: 'Kimi K2', contextLength: 200000, isFree: true },
    { id: 'minimax-m2:free', name: 'MiniMax M2', contextLength: 200000, isFree: true },
    { id: 'glm-4.6:free', name: 'GLM 4.6', contextLength: 128000, isFree: true },
    { id: 'mai-ds-r1:free', name: 'MAI DS R1', contextLength: 64000, isFree: true },
    { id: 'deepseek-v3-0324:free', name: 'DeepSeek V3', contextLength: 64000, isFree: true },
    { id: 'llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', contextLength: 8000, isFree: true }
  ];
}

export async function routewayChat(
  messages: any[],
  model: string,
  options: any = {}
): Promise<any> {
  const apiKey = await getRoutewayKey();
  const res = await fetchWithTimeout(`${PROVIDERS.routeway.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
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
