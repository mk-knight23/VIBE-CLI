import { ApiClient } from '../core/api';

export interface Command {
  name: string;
  aliases?: string[];
  category: 'basic' | 'ai' | 'file' | 'code' | 'project' | 'advanced';
  description: string;
  usage: string;
  crossPlatform: boolean;
  handler: (client: ApiClient, model: string, args?: any) => Promise<string | void>;
}

export const commands: Command[] = [
  // BASIC COMMANDS
  {
    name: 'help',
    aliases: ['h', '?'],
    category: 'basic',
    description: 'Display help information and available commands',
    usage: '/help [command]',
    crossPlatform: true,
    handler: async () => 'help'
  },
  {
    name: 'quit',
    aliases: ['exit', 'q'],
    category: 'basic',
    description: 'Exit the CLI application',
    usage: '/quit',
    crossPlatform: true,
    handler: async () => 'quit'
  },
  {
    name: 'clear',
    aliases: ['cls', 'reset'],
    category: 'basic',
    description: 'Clear conversation history and start fresh',
    usage: '/clear',
    crossPlatform: true,
    handler: async () => 'clear'
  },
  {
    name: 'version',
    aliases: ['v'],
    category: 'basic',
    description: 'Show CLI version information',
    usage: '/version',
    crossPlatform: true,
    handler: async () => 'version'
  },

  // AI CONFIGURATION
  {
    name: 'model',
    aliases: ['m'],
    category: 'ai',
    description: 'Change AI model (interactive selection)',
    usage: '/model',
    crossPlatform: true,
    handler: async () => 'model'
  },
  {
    name: 'provider',
    aliases: ['p'],
    category: 'ai',
    description: 'Switch AI provider (OpenRouter, MegaLLM, AgentRouter, Routeway)',
    usage: '/provider',
    crossPlatform: true,
    handler: async () => 'provider'
  },

  // FILE OPERATIONS
  {
    name: 'create',
    aliases: ['c'],
    category: 'file',
    description: 'Create files from last AI response',
    usage: '/create',
    crossPlatform: true,
    handler: async () => 'create'
  },
  {
    name: 'tools',
    aliases: ['t'],
    category: 'file',
    description: 'List all available tools and their capabilities',
    usage: '/tools',
    crossPlatform: true,
    handler: async () => 'tools'
  },

  // CODE GENERATION
  {
    name: 'api',
    category: 'code',
    description: 'Generate REST API with multiple endpoints',
    usage: '/api',
    crossPlatform: true,
    handler: async () => 'api'
  },

  // PROJECT MANAGEMENT
  {
    name: 'analyze',
    aliases: ['scan'],
    category: 'project',
    description: 'Analyze project structure, dependencies, and statistics',
    usage: '/analyze',
    crossPlatform: true,
    handler: async () => 'analyze'
  },
  {
    name: 'init',
    category: 'project',
    description: 'Initialize new project with templates',
    usage: '/init [template]',
    crossPlatform: true,
    handler: async () => 'init'
  },

  // ADVANCED
  {
    name: 'agent',
    aliases: ['auto'],
    category: 'advanced',
    description: 'Start autonomous agent mode for multi-step tasks',
    usage: '/agent',
    crossPlatform: true,
    handler: async () => 'agent'
  },
  {
    name: 'workflow',
    aliases: ['wf'],
    category: 'advanced',
    description: 'Manage and execute workflows',
    usage: '/workflow [list|run|info] [id]',
    crossPlatform: true,
    handler: async () => 'workflow'
  },
  {
    name: 'metrics',
    category: 'advanced',
    description: 'View performance metrics and statistics',
    usage: '/metrics [show|errors|clear]',
    crossPlatform: true,
    handler: async () => 'metrics'
  }
];

export function findCommand(input: string): Command | undefined {
  const name = input.toLowerCase();
  return commands.find(cmd => 
    cmd.name === name || cmd.aliases?.includes(name)
  );
}

export function getCommandsByCategory(category: string): Command[] {
  return commands.filter(cmd => cmd.category === category);
}
