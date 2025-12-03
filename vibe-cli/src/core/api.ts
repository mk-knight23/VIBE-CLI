import {
  openRouterChat,
  megaLLMChat,
  agentRouterChat,
  routewayChat,
  fetchOpenRouterModels,
  fetchMegaLLMModels,
  fetchAgentRouterModels,
  fetchRoutewayModels
} from '../providers';

export type ProviderType = 'openrouter' | 'megallm' | 'agentrouter' | 'routeway';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
}

export class ApiClient {
  private provider: ProviderType;
  
  constructor(provider: ProviderType = 'megallm') {
    this.provider = provider;
  }
  
  setProvider(provider: ProviderType): void {
    this.provider = provider;
  }
  
  getProvider(): ProviderType {
    return this.provider;
  }
  
  async fetchModels(): Promise<any[]> {
    switch (this.provider) {
      case 'openrouter':
        return await fetchOpenRouterModels();
      case 'megallm':
        return await fetchMegaLLMModels();
      case 'agentrouter':
        return await fetchAgentRouterModels();
      case 'routeway':
        return await fetchRoutewayModels();
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
  
  async chat(messages: any[], model: string, options: ChatOptions = {}): Promise<any> {
    switch (this.provider) {
      case 'openrouter':
        return await openRouterChat(messages, model, options);
      case 'megallm':
        return await megaLLMChat(messages, model, options);
      case 'agentrouter':
        return await agentRouterChat(messages, model, options);
      case 'routeway':
        return await routewayChat(messages, model, options);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
}

export const defaultClient = new ApiClient();
