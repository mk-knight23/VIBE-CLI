import { loadConfig } from '../core/config';
import { DEFAULT_KEYS, PROVIDERS, fetchWithTimeout } from './index';

export async function getAgentRouterKey(): Promise<string> {
  const cfg = loadConfig();
  return (
    process.env.AGENTROUTER_API_KEY ||
    cfg.agentrouter?.apiKey ||
    DEFAULT_KEYS.agentrouter
  );
}

export async function fetchAgentRouterModels(): Promise<any[]> {
  return [
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextLength: 200000, isFree: true },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', contextLength: 200000, isFree: true },
    { id: 'deepseek-r1-0528', name: 'DeepSeek R1', contextLength: 64000, isFree: true },
    { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', contextLength: 64000, isFree: true },
    { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', contextLength: 64000, isFree: true },
    { id: 'glm-4.5', name: 'GLM 4.5', contextLength: 128000, isFree: true },
    { id: 'glm-4.6', name: 'GLM 4.6', contextLength: 128000, isFree: true }
  ];
}

export async function agentRouterChat(
  messages: any[],
  model: string,
  options: any = {}
): Promise<any> {
  const apiKey = await getAgentRouterKey();
  const res = await fetchWithTimeout(`${PROVIDERS.agentrouter.baseUrl}/chat/completions`, {
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
