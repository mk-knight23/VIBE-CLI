import { ProviderManager } from '../core/providerManager';
import { emitToken, emitComplete } from '../utils/ndjson';

export async function handleChatCommand(args: string[], opts: any): Promise<void> {
  const message = args.join(' ');
  const manager = new ProviderManager();

  if (opts.stream) {
    const { result: provider } = await manager.requestWithFallback(async (p) => p);
    
    for await (const chunk of provider.chatStream([{ role: 'user', content: message }], {})) {
      if (chunk.type === 'token' && chunk.content) {
        if (opts.json) emitToken(chunk.content);
        else process.stdout.write(chunk.content);
      } else if (chunk.type === 'done') {
        if (opts.json) emitComplete('ok');
        else console.log();
      }
    }
  } else {
    const { result } = await manager.requestWithFallback(
      async (p) => p.completion(message, {})
    );
    
    if (opts.json) emitComplete('ok', { content: result.content });
    else console.log(result.content);
  }
}
