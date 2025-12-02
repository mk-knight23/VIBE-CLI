// AI Provider System with Fallback Chain
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
}

export interface AIProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
}

export class AIProvider {
  private providers: AIProviderConfig[] = [];
  private currentIndex = 0;

  constructor(configs: AIProviderConfig[]) {
    this.providers = configs.filter(c => c.apiKey);
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    for (let i = 0; i < this.providers.length; i++) {
      try {
        const provider = this.providers[this.currentIndex];
        const response = await this.callProvider(provider, messages, model);
        return response;
      } catch (error) {
        console.error(`Provider ${this.providers[this.currentIndex].name} failed:`, error);
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
        if (i === this.providers.length - 1) throw error;
      }
    }
    throw new Error('All providers failed');
  }

  private async callProvider(provider: AIProviderConfig, messages: AIMessage[], model?: string): Promise<AIResponse> {
    const targetModel = model || provider.models[0];
    const response = await fetch(`${provider.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data: any = await response.json();
    return {
      content: data.choices[0].message.content,
      model: targetModel,
      provider: provider.name
    };
  }

  async *chatStream(messages: AIMessage[], model?: string): AsyncGenerator<string> {
    const provider = this.providers[this.currentIndex];
    const targetModel = model || provider.models[0];
    
    const response = await fetch(`${provider.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
      
      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }
}
