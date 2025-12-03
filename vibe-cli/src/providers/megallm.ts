import { loadConfig } from '../core/config';
import { DEFAULT_KEYS, PROVIDERS, fetchWithTimeout } from './index';

const MODELS = [
  { id: 'openai-gpt-oss-20b', name: 'GPT OSS 20B', contextLength: 8000 },
  { id: 'llama3.3-70b-instruct', name: 'Llama 3.3 70B', contextLength: 128000 },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill', contextLength: 64000 },
  { id: 'alibaba-qwen3-32b', name: 'Qwen3 32B', contextLength: 32000 },
  { id: 'openai-gpt-oss-120b', name: 'GPT OSS 120B', contextLength: 8000 },
  { id: 'llama3-8b-instruct', name: 'Llama 3 8B', contextLength: 8000 },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2', contextLength: 200000 },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek V3.1 Terminus', contextLength: 64000 },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next 80B', contextLength: 32000 },
  { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek V3.1', contextLength: 64000 },
  { id: 'mistralai/mistral-nemotron', name: 'Mistral Nemotron', contextLength: 128000 },
  { id: 'minimaxai/minimax-m2', name: 'MiniMax M2', contextLength: 200000 }
];

export async function getMegaLLMKey(): Promise<string> {
  const cfg = loadConfig();
  return (
    process.env.MEGALLM_API_KEY ||
    cfg.megallm?.apiKey ||
    DEFAULT_KEYS.megallm
  );
}

export async function fetchMegaLLMModels(): Promise<any[]> {
  return MODELS;
}

export async function megaLLMChat(
  messages: any[],
  model: string,
  options: any = {}
): Promise<any> {
  const apiKey = await getMegaLLMKey();
  const res = await fetchWithTimeout(`${PROVIDERS.megallm.baseUrl}/chat/completions`, {
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
