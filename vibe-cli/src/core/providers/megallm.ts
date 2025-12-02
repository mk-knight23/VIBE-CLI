import fetch from 'node-fetch';
import { Provider, ChatMessage, ChatOptions, CompletionOptions, LLMTokenChunk, CompletionResult, HealthStatus, ModelDescriptor } from '../provider';
import { MODEL_REGISTRY } from '../models';

export class MegaLLMProvider implements Provider {
  id = 'megallm';
  name = 'MegaLLM';
  baseUrl: string;
  apiKey: string;
  models: ModelDescriptor[];

  constructor(apiKey?: string) {
    this.baseUrl = MODEL_REGISTRY.providers.megallm.base;
    this.apiKey = apiKey || MODEL_REGISTRY.providers.megallm.defaultKey;
    this.models = MODEL_REGISTRY.providers.megallm.models as ModelDescriptor[];
  }

  async *chatStream(messages: ChatMessage[], opts: ChatOptions = {}): AsyncIterable<LLMTokenChunk> {
    const model = opts.model || this.models[0].id;
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: opts.temperature || 0.7,
          max_tokens: opts.maxTokens || 4096
        })
      });

      if (!response.ok) {
        throw new Error(`MegaLLM API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body;
      if (!reader) throw new Error('No response body');

      let buffer = '';
      for await (const chunk of reader) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'token', content };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      yield { type: 'error', error: error.message };
    }
  }

  async completion(prompt: string, opts: CompletionOptions = {}): Promise<CompletionResult> {
    const model = opts.model || this.models[0].id;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: opts.temperature || 0.7,
        max_tokens: opts.maxTokens || 4096
      })
    });

    if (!response.ok) {
      throw new Error(`MegaLLM API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model,
      usage: data.usage
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return { ok: response.ok, latencyMs: 0 };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}
