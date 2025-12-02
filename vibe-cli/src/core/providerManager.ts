/**
 * Provider manager with fallback logic
 */

import { Provider, ChatMessage, ChatOptions, LLMTokenChunk } from './provider';
import { OpenRouterProvider } from './providers/openrouter';
import { MegaLLMProvider } from './providers/megallm';
import { AgentRouterProvider } from './providers/agentrouter';
import { RoutewayProvider } from './providers/routeway';
import { MODEL_REGISTRY } from './models';

export class ProviderManager {
  private providers: Map<string, Provider>;
  private providerOrder = ['megallm', 'agentrouter', 'routeway', 'openrouter'];

  constructor() {
    this.providers = new Map();
    this.providers.set('openrouter', new OpenRouterProvider());
    this.providers.set('megallm', new MegaLLMProvider());
    this.providers.set('agentrouter', new AgentRouterProvider());
    this.providers.set('routeway', new RoutewayProvider());
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  async *chatWithFallback(
    providerId: string,
    modelId: string,
    messages: ChatMessage[],
    opts: ChatOptions = {}
  ): AsyncIterable<LLMTokenChunk> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Try primary model with all available keys
    const providerConfig = MODEL_REGISTRY.providers[providerId as keyof typeof MODEL_REGISTRY.providers];
    const allKeys = [providerConfig.defaultKey, ...providerConfig.fallbackKeys];
    
    for (const apiKey of allKeys) {
      try {
        provider.apiKey = apiKey;
        yield* provider.chatStream(messages, { ...opts, model: modelId });
        return;
      } catch (error: any) {
        console.error(`Key failed for ${providerId}: ${error.message}`);
        continue;
      }
    }

    // Try other models from same provider
    const otherModels = provider.models.filter(m => m.id !== modelId);
    for (const model of otherModels) {
      for (const apiKey of allKeys) {
        try {
          provider.apiKey = apiKey;
          console.log(`Falling back to model: ${model.label}`);
          yield* provider.chatStream(messages, { ...opts, model: model.id });
          return;
        } catch (error: any) {
          continue;
        }
      }
    }

    // Try other providers
    const otherProviders = this.providerOrder.filter(p => p !== providerId);
    for (const otherProviderId of otherProviders) {
      const otherProvider = this.providers.get(otherProviderId);
      if (!otherProvider) continue;

      const otherConfig = MODEL_REGISTRY.providers[otherProviderId as keyof typeof MODEL_REGISTRY.providers];
      const otherKeys = [otherConfig.defaultKey, ...otherConfig.fallbackKeys];

      for (const model of otherProvider.models) {
        for (const apiKey of otherKeys) {
          try {
            otherProvider.apiKey = apiKey;
            console.log(`Falling back to provider: ${otherProvider.name}, model: ${model.label}`);
            yield* otherProvider.chatStream(messages, { ...opts, model: model.id });
            return;
          } catch (error: any) {
            continue;
          }
        }
      }
    }

    throw new Error('All providers and models failed');
  }
}
