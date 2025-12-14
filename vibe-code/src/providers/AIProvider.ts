// AI Provider System with Fallback Chain and Streaming Support
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  abortController?: AbortController;
}

export interface AIProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  supportsStreaming?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export class AIProvider {
  private providers: AIProviderConfig[] = [];
  private currentIndex = 0;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff

  constructor(configs: AIProviderConfig[]) {
    this.providers = configs.filter(c => c.apiKey);
  }

  async chat(messages: AIMessage[], model?: string, options: { timeout?: number } = {}): Promise<AIResponse> {
    const errors: Error[] = [];

    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.providers[this.currentIndex];

      try {
        const response = await this.callProvider(provider, messages, model, false, options.timeout);
        return response;
      } catch (error: any) {
        console.error(`Provider ${provider.name} failed:`, error.message);
        errors.push(error);

        // Try next provider
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;

        // If we've tried all providers, throw the last error
        if (attempt === this.providers.length - 1) {
          throw new Error(`All providers failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('All providers failed');
  }

  async *chatStream(
    messages: AIMessage[],
    model?: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<string> {
    const errors: Error[] = [];

    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.providers[this.currentIndex];

      try {
        yield* this.callProviderStream(provider, messages, model, options);
        return; // Success, exit
      } catch (error: any) {
        console.error(`Provider ${provider.name} streaming failed:`, error.message);
        errors.push(error);
        options.onError?.(error);

        // Try next provider
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;

        // If we've tried all providers, throw the last error
        if (attempt === this.providers.length - 1) {
          throw new Error(`All providers streaming failed. Last error: ${error.message}`);
        }
      }
    }
  }

  private async callProvider(
    provider: AIProviderConfig,
    messages: AIMessage[],
    model?: string,
    stream = false,
    timeout?: number
  ): Promise<AIResponse> {
    const targetModel = model || provider.models[0];
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    try {
      const requestBody: any = {
        model: targetModel,
        messages,
        temperature: 0.2,
        max_tokens: 4000,
        stream: false
      };

      // Add provider-specific headers and body modifications
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      };

      let url = `${provider.baseURL}/chat/completions`;

      // Provider-specific configurations
      if (provider.name === 'OpenRouter') {
        headers['HTTP-Referer'] = 'https://github.com/mk-knight23/vibe';
        headers['X-Title'] = 'Vibe VS Code Extension';
      } else if (provider.name === 'AgentRouter') {
        headers['User-Agent'] = 'Vibe VS Code Extension v4.0';
      } else if (provider.name === 'Routeway') {
        headers['User-Agent'] = 'Vibe VS Code Extension v4.0';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from provider');
      }

      return {
        content: data.choices[0].message.content,
        model: targetModel,
        provider: provider.name,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async *callProviderStream(
    provider: AIProviderConfig,
    messages: AIMessage[],
    model?: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<string> {
    const targetModel = model || provider.models[0];
    const controller = options.abortController || new AbortController();

    try {
      const requestBody: any = {
        model: targetModel,
        messages,
        temperature: 0.2,
        max_tokens: 4000,
        stream: true
      };

      // Add provider-specific headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      };

      let url = `${provider.baseURL}/chat/completions`;

      // Provider-specific configurations
      if (provider.name === 'OpenRouter') {
        headers['HTTP-Referer'] = 'https://github.com/mk-knight23/vibe';
        headers['X-Title'] = 'Vibe VS Code Extension';
      } else if (provider.name === 'AgentRouter') {
        headers['User-Agent'] = 'Vibe VS Code Extension v4.0';
      } else if (provider.name === 'Routeway') {
        headers['User-Agent'] = 'Vibe VS Code Extension v4.0';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                options.onComplete?.(fullContent);
                return;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle different streaming formats
                let content = '';

                if (parsed.choices?.[0]?.delta?.content) {
                  // OpenAI-style format
                  content = parsed.choices[0].delta.content;
                } else if (parsed.choices?.[0]?.text) {
                  // Alternative format
                  content = parsed.choices[0].text;
                } else if (parsed.response) {
                  // Some providers use 'response' field
                  content = parsed.response;
                }

                if (content) {
                  fullContent += content;
                  options.onChunk?.(content);
                  yield content;
                }
              } catch (parseError) {
                // Skip invalid JSON chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      options.onComplete?.(fullContent);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    }
  }

  // Retry with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (attempt < maxAttempts - 1) {
          const delay = this.retryDelays[attempt] || 4000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Get current provider info
  getCurrentProvider(): AIProviderConfig | null {
    return this.providers[this.currentIndex] || null;
  }

  // Switch to next provider
  switchToNextProvider(): void {
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
  }

  // Get all available providers
  getProviders(): AIProviderConfig[] {
    return [...this.providers];
  }
}
