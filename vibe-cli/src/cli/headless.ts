import { ApiClient } from '../core/api';

export interface HeadlessOptions {
  prompt: string;
  model?: string;
  provider?: string;
  format?: 'text' | 'json';
  temperature?: number;
}

export async function startHeadless(client: ApiClient, options: HeadlessOptions): Promise<void> {
  if (options.provider) {
    client.setProvider(options.provider as any);
  }
  
  const model = options.model || 'qwen/qwen3-next-80b-a3b-instruct';
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: options.prompt }
  ];
  
  try {
    const response = await client.chat(messages, model, {
      temperature: options.temperature || 0.7
    });
    
    const content = response.choices?.[0]?.message?.content || '';
    
    if (options.format === 'json') {
      console.log(JSON.stringify({
        success: true,
        response: content,
        model,
        provider: client.getProvider()
      }, null, 2));
    } else {
      console.log(content);
    }
  } catch (error: any) {
    if (options.format === 'json') {
      console.log(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}
