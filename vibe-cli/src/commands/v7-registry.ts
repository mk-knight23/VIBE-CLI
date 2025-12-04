// Vibe-CLI v7.0.0 Command Registry
import { ApiClient } from '../core/api';
import { V7Engine } from '../core/v7-engine';

export interface V7Command {
  name: string;
  category: string;
  aliases: string[];
  description: string;
  usage: string;
  flags: Record<string, any>;
  handler: (engine: V7Engine, args: any) => Promise<any>;
}

export const v7Commands: V7Command[] = [
  // BASIC
  {
    name: 'help',
    category: 'basic',
    aliases: ['h', '?'],
    description: 'Display help information',
    usage: '/help [command]',
    flags: { all: 'boolean', search: 'string' },
    handler: async (engine, args) => ({ action: 'show_help', args })
  },
  
  // FILE SYSTEM
  {
    name: 'fs',
    category: 'filesystem',
    aliases: [],
    description: 'File system operations',
    usage: '/fs <action> [args]',
    flags: {},
    handler: async (engine, args) => {
      const [action, ...params] = args;
      switch (action) {
        case 'read': return { action: 'read_file', path: params[0] };
        case 'write': return { action: 'write_file', path: params[0], content: params[1] };
        case 'edit': return { action: 'edit_file', path: params[0] };
        case 'patch': return { action: 'patch_files', pattern: params[0] };
        case 'tree': return { action: 'show_tree', path: params[0] || '.' };
        case 'search': return { action: 'search_content', pattern: params[0] };
        case 'watch': return { action: 'watch_files', path: params[0] };
        case 'diff': return { action: 'diff_files', file1: params[0], file2: params[1] };
        default: return { error: 'Unknown fs action' };
      }
    }
  },

  // CODE GENERATION
  {
    name: 'generate',
    category: 'codegen',
    aliases: ['gen'],
    description: 'Generate code',
    usage: '/generate <type> <name> [flags]',
    flags: { framework: 'string', typescript: 'boolean', test: 'boolean' },
    handler: async (engine, args) => {
      const [type, name] = args;
      return { action: 'generate_code', type, name };
    }
  },

  // PROJECT
  {
    name: 'init',
    category: 'project',
    aliases: ['new'],
    description: 'Initialize project',
    usage: '/init [template]',
    flags: { template: 'string', typescript: 'boolean', git: 'boolean' },
    handler: async (engine, args) => ({ action: 'init_project', args })
  },

  {
    name: 'scan',
    category: 'project',
    aliases: ['analyze'],
    description: 'Analyze project',
    usage: '/scan [path]',
    flags: { deep: 'boolean', security: 'boolean' },
    handler: async (engine, args) => ({ action: 'scan_project', args })
  },

  // RUNTIME
  {
    name: 'run',
    category: 'runtime',
    aliases: ['exec'],
    description: 'Execute code/commands',
    usage: '/run <type> [args]',
    flags: { sandbox: 'boolean', timeout: 'number' },
    handler: async (engine, args) => {
      const [type, ...params] = args;
      return { action: 'run_' + type, params };
    }
  },

  // DEVELOPMENT
  {
    name: 'dev',
    category: 'development',
    aliases: [],
    description: 'Development tools',
    usage: '/dev <action> [args]',
    flags: {},
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'dev_' + action, params };
    }
  },

  // PACKAGE MANAGERS
  {
    name: 'pm',
    category: 'package',
    aliases: ['pkg'],
    description: 'Package management',
    usage: '/pm <action> [packages]',
    flags: { dev: 'boolean', global: 'boolean' },
    handler: async (engine, args) => {
      const [action, ...packages] = args;
      return { action: 'pm_' + action, packages };
    }
  },

  // GIT OPERATIONS
  {
    name: 'git',
    category: 'git',
    aliases: [],
    description: 'Git operations',
    usage: '/git <action> [args]',
    flags: {},
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'git_' + action, params };
    }
  },

  // CLOUD
  {
    name: 'cloud',
    category: 'cloud',
    aliases: [],
    description: 'Cloud operations',
    usage: '/cloud <action> [args]',
    flags: { provider: 'string' },
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'cloud_' + action, params };
    }
  },

  // DEVOPS
  {
    name: 'ops',
    category: 'devops',
    aliases: [],
    description: 'DevOps operations',
    usage: '/ops <action> [args]',
    flags: {},
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'ops_' + action, params };
    }
  },

  // DEBUG
  {
    name: 'debug',
    category: 'debug',
    aliases: [],
    description: 'Debugging tools',
    usage: '/debug <action> [args]',
    flags: {},
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'debug_' + action, params };
    }
  },

  // AGENT
  {
    name: 'agent',
    category: 'agent',
    aliases: ['auto'],
    description: 'Agent operations',
    usage: '/agent <action> [args]',
    flags: { parallel: 'number', selftest: 'boolean' },
    handler: async (engine, args) => {
      const [action, ...params] = args;
      return { action: 'agent_' + action, params };
    }
  }
];

export function findV7Command(name: string): V7Command | undefined {
  return v7Commands.find(cmd => 
    cmd.name === name || cmd.aliases.includes(name)
  );
}

export function getV7CommandsByCategory(category: string): V7Command[] {
  return v7Commands.filter(cmd => cmd.category === category);
}
