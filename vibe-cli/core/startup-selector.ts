import inquirer from 'inquirer';
import pc from 'picocolors';
import { ProviderManager } from '../src/core/providerManager';

export async function showWelcomeAndSelect(): Promise<{ provider: string; model: string }> {
  // Welcome box
  console.clear();
  console.log(pc.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(pc.cyan('║') + pc.bold(pc.white('              🚀 Welcome to Vibe CLI v4.0 🚀              ')) + pc.cyan('║'));
  console.log(pc.cyan('╠════════════════════════════════════════════════════════════╣'));
  console.log(pc.cyan('║') + '  AI-Powered Development Assistant                        ' + pc.cyan('║'));
  console.log(pc.cyan('║') + '  • Multi-Provider Support (4 providers)                  ' + pc.cyan('║'));
  console.log(pc.cyan('║') + '  • Auto File Creation                                     ' + pc.cyan('║'));
  console.log(pc.cyan('║') + '  • Code Generation & Refactoring                          ' + pc.cyan('║'));
  console.log(pc.cyan('║') + '  • Complete Project Setup                                 ' + pc.cyan('║'));
  console.log(pc.cyan('╠════════════════════════════════════════════════════════════╣'));
  console.log(pc.cyan('║') + pc.bold(pc.magenta('                🔥 Made by KAZI 🔥                        ')) + pc.cyan('║'));
  console.log(pc.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Provider selection
  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: pc.bold('Select AI Provider:'),
    choices: [
      {
        name: pc.green('🚀 MegaLLM') + ' - 12 models, up to 200k context',
        value: 'megallm'
      },
      {
        name: pc.blue('🤖 AgentRouter') + ' - Claude & DeepSeek (7 models)',
        value: 'agentrouter'
      },
      {
        name: pc.yellow('⚡ Routeway') + ' - 6 free models, long context',
        value: 'routeway'
      },
      {
        name: pc.magenta('🌐 OpenRouter') + ' - 6 free models, Gemini 2.0',
        value: 'openrouter'
      }
    ],
    default: 'megallm'
  }]);

  // Get models for selected provider
  const manager = new ProviderManager();
  const selectedProvider = manager.getProvider(provider);
  
  if (!selectedProvider) {
    throw new Error('Provider not found');
  }

  const modelChoices = selectedProvider.models.map(m => ({
    name: `${m.label} - ${(m.contextTokens / 1000).toFixed(0)}k tokens`,
    value: m.id
  }));

  const { model } = await inquirer.prompt([{
    type: 'list',
    name: 'model',
    message: pc.bold(`Select Model from ${selectedProvider.name}:`),
    choices: modelChoices,
    default: selectedProvider.models[0].id
  }]);

  console.log('');
  console.log(pc.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(pc.cyan('║') + pc.bold(pc.green('  ✓ You selected:                                          ')) + pc.cyan('║'));
  console.log(pc.cyan('║') + `    Provider: ${pc.bold(pc.white(selectedProvider.name))}`.padEnd(59) + pc.cyan('║'));
  console.log(pc.cyan('║') + `    Model: ${pc.bold(pc.white(model))}`.padEnd(59) + pc.cyan('║'));
  console.log(pc.cyan('║') + '                                                            ' + pc.cyan('║'));
  console.log(pc.cyan('║') + pc.bold(pc.yellow('  🎉 Happy chatting with Vibe CLI! 🎉                     ')) + pc.cyan('║'));
  console.log(pc.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(pc.dim('Type your message or /help for commands'));
  console.log('');

  return { provider, model };
}
