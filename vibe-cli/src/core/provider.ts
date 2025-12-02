/**
 * Provider interface for Vibe CLI v4.0+
 */

export type ModelDescriptor = {
  id: string;
  label: string;
  contextTokens: number;
  category: 'free' | 'premium';
  recommendedFor: string[];
};

export type HealthStatus = {
  ok: boolean;
  latencyMs?: number;
  lastSuccess?: string;
  error?: string;
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMTokenChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: ModelDescriptor[];
  chatStream(messages: ChatMessage[], opts: ChatOptions): AsyncIterable<LLMTokenChunk>;
  completion(prompt: string, opts: CompletionOptions): Promise<CompletionResult>;
  healthCheck(): Promise<HealthStatus>;
}
