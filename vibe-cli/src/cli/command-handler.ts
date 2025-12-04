import inquirer from 'inquirer';
import pc from 'picocolors';
import { ApiClient } from '../core/api';
import { commands, findCommand, getCommandsByCategory } from '../commands/registry';
import { agentCommand } from '../commands/agent';
import { tools } from '../tools';

export async function handleCommand(
  input: string,
  client: ApiClient,
  currentModel: string
): Promise<string | void> {
  const parts = input.slice(1).trim().split(' ');
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const command = findCommand(cmdName);
  
  if (!command) {
    console.log(pc.red(`Unknown command: ${cmdName}`));
    console.log(pc.yellow('Type /help for available commands'));
    return;
  }

  // Execute command
  switch (command.name) {
    case 'help':
      showHelp(args[0]);
      break;
    
    case 'quit':
      console.log(pc.cyan('\n👋 Goodbye!\n'));
      return 'quit';
    
    case 'clear':
      console.log(pc.green('✓ Conversation cleared'));
      return 'clear';
    
    case 'version':
      console.log(pc.cyan('\nVibe CLI v6.0.0'));
      console.log(pc.gray('Node.js AI Development Assistant\n'));
      break;
    
    case 'model':
      return 'model';
    
    case 'provider':
      return 'provider';
    
    case 'create':
      return 'create';
    
    case 'tools':
      showTools();
      break;
    
    case 'api':
      break;
    
    case 'analyze':
      return 'analyze';
    
    case 'init':
      return 'init';
    
    case 'agent':
      await agentCommand(client, currentModel);
      break;
    
    case 'workflow':
      return 'workflow';
    
    case 'metrics':
      return 'metrics';
    
    default:
      console.log(pc.yellow(`Command "${command.name}" not yet implemented`));
  }
}

function showHelp(specificCommand?: string): void {
  if (specificCommand) {
    const cmd = findCommand(specificCommand);
    if (cmd) {
      console.log(`\n${pc.bold(pc.cyan(cmd.name.toUpperCase()))}`);
      console.log(pc.gray('─'.repeat(60)));
      console.log(`${pc.bold('Description:')} ${cmd.description}`);
      console.log(`${pc.bold('Usage:')} ${cmd.usage}`);
      if (cmd.aliases?.length) {
        console.log(`${pc.bold('Aliases:')} ${cmd.aliases.join(', ')}`);
      }
      console.log(`${pc.bold('Cross-platform:')} ${cmd.crossPlatform ? '✓' : '✗'}`);
      console.log();
    } else {
      console.log(pc.red(`Command not found: ${specificCommand}`));
    }
    return;
  }

  console.log(`
${pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))}
${pc.bold(pc.cyan('              🎨 VIBE v7.0.0 🔥 Made by KAZI'))}
${pc.bold(pc.cyan('           AI-Powered Development Platform'))}
${pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))}

${pc.bold('BASIC COMMANDS')}
${formatCommands(getCommandsByCategory('basic'))}

${pc.bold('AI CONFIGURATION')}
${formatCommands(getCommandsByCategory('ai'))}

${pc.bold('FILE OPERATIONS')}
${formatCommands(getCommandsByCategory('file'))}

${pc.bold('CODE GENERATION')}
${formatCommands(getCommandsByCategory('code'))}

${pc.bold('PROJECT MANAGEMENT')}
${formatCommands(getCommandsByCategory('project'))}

${pc.bold('ADVANCED FEATURES')}
${formatCommands(getCommandsByCategory('advanced'))}

${pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))}
${pc.bold('USAGE EXAMPLES')}

${pc.gray('Natural language:')}
  create a todo app
  install express and create server
  analyze the codebase

${pc.gray('Commands:')}
  /agent         Start autonomous mode
  /analyze       Analyze project

${pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))}
${pc.gray('Type /help <command> for detailed information')}
${pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))}
  `);
}

function formatCommands(cmds: any[]): string {
  return cmds.map(cmd => {
    const aliases = cmd.aliases ? pc.gray(` (${cmd.aliases.join(', ')})`) : '';
    return `  ${pc.cyan(`/${cmd.name}`)}${aliases}\n    ${pc.gray(cmd.description)}`;
  }).join('\n\n');
}

function showTools(): void {
  console.log(`\n${pc.bold(pc.cyan('AVAILABLE TOOLS'))}`);
  console.log(pc.gray('─'.repeat(60)));
  
  const categories = {
    'File System': ['list_directory', 'read_file', 'write_file', 'glob', 'search_file_content', 'replace'],
    'Execution': ['run_shell_command'],
    'Web': ['web_fetch', 'google_web_search'],
    'Memory': ['save_memory', 'write_todos'],
  };

  Object.entries(categories).forEach(([category, toolNames]) => {
    console.log(`\n${pc.bold(category)}`);
    toolNames.forEach(name => {
      const tool = tools.find(t => t.name === name);
      if (tool) {
        console.log(`  ${pc.cyan(tool.displayName)} - ${pc.gray(tool.description)}`);
      }
    });
  });
  console.log();
}
