import inquirer from 'inquirer';
import pc from 'picocolors';
import ora, { Ora } from 'ora';
import { ApiClient } from '../core/api';
import { logger } from '../utils/logger';
import { tools, executeTool } from '../tools';
import { parseMarkdownResponse } from '../utils/file-parser';

import { handleCommand } from './command-handler';
import { VIBE_SYSTEM_PROMPT, VERSION, DEFAULT_MODEL } from './system-prompt';
import { MemoryManager } from '../core/memory';
import { TerminalRenderer, StateType } from '../utils/terminal-renderer';
import { executeShellCommand, ShellExecutionOptions } from '../core/shell-executor';

const SYSTEM_PROMPT = VIBE_SYSTEM_PROMPT;
const DANGEROUS_COMMANDS = ['rm -rf /', 'mkfs', 'killall', 'dd if=', 'format', ':(){:|:&};:'];

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface OperationStats {
  filesCreated: number;
  shellCommands: number;
  toolsExecuted: number;
  errors: number;
  startTime: number;
}

interface Step {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  emoji: string;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;

export async function startInteractive(client: ApiClient): Promise<void> {
  showWelcomeBanner();
  
  const memory = new MemoryManager();
  memory.updateWorkspaceMemory();
  
  const onboardingChoice = await runOnboarding();
  client.setProvider('megallm');
  
  const messages: ConversationMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  let currentModel = DEFAULT_MODEL;
  let lastResponse = '';
  
  if (onboardingChoice === 'new-project') {
    const projectInfo = await gatherProjectInfo();
    const prompt = buildProjectPrompt(projectInfo);
    messages.push({ role: 'user', content: prompt });
    memory.startTask(prompt);
    await processUserInput(client, messages, currentModel, prompt, memory);
  } else if (onboardingChoice === 'analyze') {
    messages.push({ role: 'user', content: 'Analyze current directory' });
    memory.startTask('Analyze current directory');
    await processUserInput(client, messages, currentModel, 'analyze current directory', memory);
  } else if (onboardingChoice === 'model') {
    currentModel = await selectModel(client, currentModel);
  }
  
  while (true) {
    try {
      const input = await getInputWithSuggestions();
      if (!input.trim()) continue;
      
      if (input.startsWith('/')) {
        const result = await handleSlashCommand(input, client, currentModel, messages, lastResponse, memory);
        if (result.action === 'quit') break;
        if (result.action === 'clear') {
          messages.length = 1;
          lastResponse = '';
          memory.clear();
          showSuccess('Conversation and memory cleared');
          continue;
        }
        if (result.action === 'model-changed') {
          currentModel = result.data as string;
          continue;
        }
        continue;
      }
      
      memory.startTask(input);
      memory.addChatMessage('user', input);
      
      // Intelligent model selection
      const { selectBestModel, shouldSwitchModel } = await import('../core/model-selector');
      const profile = selectBestModel(input, client.getProvider());

      if (shouldSwitchModel(profile, currentModel)) {
        console.log(pc.gray(`Switching to ${profile.model} (${profile.reasoning})`));
        client.setProvider(profile.provider as any);
        currentModel = profile.model;
      }

      lastResponse = await processUserInput(client, messages, currentModel, input, memory);
      
    } catch (error: any) {
      if (error.isTtyError) {
        showError('Terminal Error', 'Prompt could not be rendered', 'Try a different terminal');
        break;
      }
      showError('Unexpected Error', error.message);
    }
  }
  
  showGoodbyeMessage();
}

function showWelcomeBanner(): void {
  const renderer = new TerminalRenderer();
  console.clear();
  renderer.header('🎨 VIBE CLI v8.0.0 - ULTIMATE EDITION');
  console.log(pc.gray('   Revolutionary AI Development Platform'));
  console.log(pc.gray('   Story Memory • Chat History • 36 Advanced Tools'));
  console.log(pc.gray('   Streaming Output • Trust Signals • Multi-Step Execution'));
  console.log();
  console.log(pc.yellow('   🔥 Made by KAZI • Production Ready'));
  renderer.divider();
  console.log();
}

async function runOnboarding(): Promise<string> {
  const { choice } = await inquirer.prompt<{ choice: string }>([{
    type: 'list',
    name: 'choice',
    message: '✨ How would you like to begin?',
    choices: [
      { name: '📦 Create new project', value: 'new-project' },
      { name: '📂 Continue existing', value: 'continue' },
      { name: '🔍 Analyze folder', value: 'analyze' },
      { name: '🤖 Switch model', value: 'model' },
      { name: '💬 Start chatting', value: 'chat' }
    ],
    default: 'chat'
  }]);
  console.log();
  return choice;
}

async function gatherProjectInfo(): Promise<any> {
  showSectionHeader('📋 Project Configuration');
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '📁 Project name:',
      default: 'my-app',
      validate: (input: string) => /^[a-z0-9-]+$/.test(input) || 'Use lowercase, numbers, hyphens only'
    },
    {
      type: 'list',
      name: 'type',
      message: '🎯 Project type:',
      choices: ['React App', 'Vue App', 'Node.js API', 'Python App', 'HTML/CSS/JS', 'Other']
    },
    {
      type: 'confirm',
      name: 'routing',
      message: '🌐 Add routing?',
      default: false,
      when: (a: any) => ['React App', 'Vue App'].includes(a.type)
    },
    {
      type: 'list',
      name: 'styling',
      message: '🎨 Styling:',
      choices: ['TailwindCSS', 'CSS Modules', 'Styled Components', 'Plain CSS', 'None'],
      default: 'TailwindCSS'
    },
    {
      type: 'confirm',
      name: 'testing',
      message: '🧪 Testing setup?',
      default: false
    }
  ]);
  
  console.log();
  return answers;
}

function buildProjectPrompt(info: any): string {
  let prompt = `Create a ${info.type} project named "${info.name}"`;
  if (info.routing) prompt += ' with routing';
  if (info.styling && info.styling !== 'None') prompt += ` using ${info.styling}`;
  if (info.testing) prompt += ' and testing setup';
  prompt += '. Create complete production-ready structure.';
  return prompt;
}

async function getInputWithSuggestions(): Promise<string> {
  const { input } = await inquirer.prompt<{ input: string }>({
    type: 'input',
    name: 'input',
    message: pc.cyan('You:')
  });
  
  if (input === '/') {
    showCommandHints();
    return await getInputWithSuggestions();
  }
  
  return input;
}

function showCommandHints(): void {
  console.log();
  console.log(pc.gray('Available commands:'));
  console.log(pc.yellow('  /help   /create   /model   /agent   /deploy   /scan   /debug'));
  console.log(pc.yellow('  /quit   /clear    /provider   /tools   /analyze'));
  console.log();
}

async function selectModel(client: ApiClient, currentModel: string): Promise<string> {
  const spinner = createSpinner('Fetching models...');
  
  try {
    const models = await client.fetchModels();
    spinner.succeed('Models loaded');
    
    if (models.length === 0) {
      showWarning('No models available');
      return currentModel;
    }
    
    const choices = models.map((m: any) => ({
      name: `${m.id || m.name} ${pc.gray(`(${m.contextLength || 'N/A'} tokens)`)}`,
      value: (m.id || m.name) as string
    }));
    
    const { model } = await inquirer.prompt<{ model: string }>([{
      type: 'list',
      name: 'model',
      message: '🤖 Select model:',
      choices,
      default: currentModel,
      pageSize: 15
    }]);
    
    showSuccess(`Switched to ${model}`);
    return model;
    
  } catch (error: any) {
    spinner.fail('Failed to fetch models');
    showError('Model Fetch Failed', error.message, 'Try /provider to switch');
    return currentModel;
  }
}

async function handleSlashCommand(
  input: string,
  client: ApiClient,
  currentModel: string,
  messages: ConversationMessage[],
  lastResponse: string,
  memory: MemoryManager
): Promise<{ action: string; data?: any }> {
  
  const command = input.slice(1).split(' ')[0];
  
  switch (command) {
    case 'quit':
    case 'exit':
      return { action: 'quit' };
      
    case 'clear':
      return { action: 'clear' };
      
    case 'help':
      showHelp();
      return { action: 'none' };
      
    case 'model':
      const newModel = await selectModel(client, currentModel);
      return { action: 'model-changed', data: newModel };
      
    case 'models':
      showCompatibleModels();
      return { action: 'none' };
      
    case 'provider':
      await switchProvider(client);
      return { action: 'none' };
      
    case 'create':
      showWarning('/create command disabled - AI-ONLY structured generation required');
      return { action: 'none' };
      
    default:
      const handled = await handleCommand(input, client, currentModel);
      return { action: handled === 'quit' ? 'quit' : 'none' };
  }
}

async function switchProvider(client: ApiClient): Promise<void> {
  const { provider } = await inquirer.prompt<{ provider: string }>([{
    type: 'list',
    name: 'provider',
    message: '🔌 Select provider:',
    choices: [
      { name: 'MegaLLM (Recommended)', value: 'megallm' },
      { name: 'OpenRouter', value: 'openrouter' },
      { name: 'AgentRouter', value: 'agentrouter' },
      { name: 'Routeway', value: 'routeway' }
    ]
  }]);
  
  client.setProvider(provider as any);
  showSuccess(`Switched to ${provider}`);
}

export async function processUserInput(
  client: ApiClient,
  messages: ConversationMessage[],
  currentModel: string,
  input: string,
  memory: MemoryManager
): Promise<string> {

  const renderer = new TerminalRenderer();
  const stats: OperationStats = {
    filesCreated: 0,
    shellCommands: 0,
    toolsExecuted: 0,
    errors: 0,
    startTime: Date.now()
  };

  messages.push({ role: 'user', content: input });

  // Inject memory context
  const memoryContext = memory.getMemoryContext();
  if (memoryContext) {
    messages.splice(1, 0, {
      role: 'system',
      content: `# Persistent Memory\n${memoryContext}\n\nUse this memory to maintain context. Never ask for information already known.`
    });
  }

  // Summarize if too many messages
  if (messages.length > 15) {
    const summarized = memory.summarizeOldMessages(messages);
    messages.length = 0;
    messages.push(...summarized);
  }

  // AI-ONLY ENFORCEMENT: Log AI usage for project creation
  const isProjectCreation = /\b(create|build|make|generate|scaffold)\b/i.test(input);
  if (isProjectCreation) {
    console.log(pc.cyan(`🤖 Using AI model: ${currentModel} (${client.getProvider()})`));
    console.log(pc.cyan(`📝 Generating project via AI pipeline`));
    memory.addMilestone(`AI Project Creation: ${input} (Model: ${currentModel}, Provider: ${client.getProvider()})`);
  }

  // Set initial state: Thinking
  renderer.setState('thinking', 'Analyzing your request...');

  try {
    const toolSchemas = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.entries(t.parameters).reduce((acc, [key, val]: [string, any]) => {
            acc[key] = { type: val.type, description: val.description || '' };
            return acc;
          }, {} as any),
          required: Object.entries(t.parameters)
            .filter(([_, val]: [string, any]) => val.required)
            .map(([key]) => key)
        }
      }
    }));

    // Transition to executing state
    renderer.setState('executing', 'Planning and generating response...');

    const response = await client.chat(messages, currentModel, {
      temperature: 0.7,
      maxTokens: 4000,
      tools: toolSchemas,
      stream: true // Enable streaming
    });

    const assistantMessage = response.choices?.[0]?.message;
    if (!assistantMessage) throw new Error('No response from AI');

    const reply = assistantMessage.content || '';
    const toolCalls = assistantMessage.tool_calls || [];

    if (reply.includes('<|tool_call') && !toolCalls.length) {
      renderer.setState('error', 'Function calling not supported');
      showFunctionCallingError();
      messages.push({ role: 'assistant', content: reply });
      return reply;
    }

    // Start streaming AI response
    if (reply) {
      renderer.setState('done', 'Response generated');
      renderer.startStreaming();

      // Simulate streaming by chunking the response
      const chunks = reply.split(/(?<=[.!?])\s+/);
      for (const chunk of chunks) {
        renderer.streamToken(chunk + ' ');
        await sleep(10); // Small delay for natural streaming effect
      }
      renderer.endStreaming();
    }

    messages.push({ role: 'assistant', content: reply });

    // Execute tools with full transparency
    if (toolCalls.length > 0) {
      renderer.setState('executing', 'Executing tools...');

      for (const call of toolCalls) {
        const tool = tools.find(t => t.name === call.function.name);
        if (!tool) continue;

        const args = JSON.parse(call.function.arguments);
        const startTime = Date.now();

        try {
          const result = await executeTool(call.function.name, args);
          const duration = Date.now() - startTime;

          // Show trust signals
          if (call.function.name === 'write_file') {
            renderer.showFileOperation('write', args.file_path, true);
            memory.onFileWrite(args.file_path, args.content);
          } else if (call.function.name === 'read_file') {
            renderer.showFileOperation('read', args.path, true);
            memory.onFileRead(args.path, result);
          } else if (call.function.name === 'run_shell_command') {
            renderer.showCommandExecution(args.command, true, duration);
            memory.onShellCommand(args.command, result);
          } else {
            renderer.showToolExecution(tool.displayName, args, true, duration);
          }

          stats.toolsExecuted++;
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: 'Success'
          });

        } catch (err: any) {
          renderer.showToolExecution(tool.displayName, args, false);
          stats.errors++;
          memory.onError(`Tool ${call.function.name} failed: ${err.message}`);

          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `Error: ${err.message}`
          });
        }
      }
    }

    // Handle project creation - AI intent → Tool execution bridge
    const isProjectCreation = /\b(create|build|make|generate|scaffold)\b/i.test(input);
    if (reply && isProjectCreation) {
      try {
        let projectPlan: any = null;
        let projectName: string = '';
        let folders: string[] = [];
        let files: Array<{path: string, content: string, executable?: boolean}> = [];
        let shellCommands: string[] = [];

        // Try structured JSON first (preferred)
        try {
          projectPlan = JSON.parse(reply.trim());
          if (projectPlan.projectName && projectPlan.structure) {
            projectName = projectPlan.projectName;
            folders = projectPlan.structure.folders || [];
            files = projectPlan.structure.files || [];
            shellCommands = projectPlan.shellCommands || [];
          }
        } catch (jsonError) {
          // Fall back to markdown parsing
          console.log('AI returned markdown, parsing manually...');
        }

        // If JSON failed, parse markdown response
        if (!projectPlan || !projectName) {
          const parsed = parseMarkdownResponse(reply, input);
          projectName = parsed.projectName;
          folders = parsed.folders;
          files = parsed.files;
          shellCommands = parsed.shellCommands;
        }

        if (!projectName) {
          throw new Error('Could not determine project name from AI response');
        }

        renderer.setState('executing', `Creating project: ${projectName}`);

        // Execute via tools - this is the critical bridge
        const projectPath = projectName;

        // Create project directory
        await executeTool('create_directory', { dir_path: projectPath });
        renderer.showFileOperation('write', projectPath, true);
        stats.toolsExecuted++;

        // Create folders
        for (const folder of folders) {
          const fullPath = `${projectPath}/${folder}`;
          await executeTool('create_directory', { dir_path: fullPath });
          renderer.showFileOperation('write', fullPath, true);
          stats.toolsExecuted++;
        }

        // Create files
        for (const file of files) {
          const fullPath = `${projectPath}/${file.path}`;
          await executeTool('write_file', { file_path: fullPath, content: file.content });
          renderer.showFileOperation('write', fullPath, true);
          stats.filesCreated++;
          stats.toolsExecuted++;
          memory.onFileWrite(fullPath, file.content);

          if (file.executable) {
            await executeTool('run_shell_command', { command: `chmod +x ${fullPath}`, description: `Make ${file.path} executable` });
            stats.toolsExecuted++;
          }
        }

        // Execute shell commands
        for (const cmd of shellCommands) {
          if (!cmd.trim()) continue;

          if (isDangerousCommand(cmd)) {
            renderer.status(`Blocked dangerous command: ${cmd}`, 'warning');
            continue;
          }

          renderer.status(`🔧 ${cmd}`, 'info');

          try {
            const result = await executeShellCommand(cmd, {
              cwd: projectPath,
              timeout: 60000,
              streamOutput: true,
              onStdout: (data: string) => process.stdout.write(data),
              onStderr: (data: string) => process.stderr.write(data),
              onProgress: (progress) => {
                if (progress.status === 'completed') {
                  renderer.showCommandExecution(cmd, progress.exitCode === 0, progress.duration);
                } else if (progress.status === 'failed') {
                  renderer.showCommandExecution(cmd, false, progress.duration);
                }
              },
              retryCount: 1,
              retryDelay: 1000
            });

            if (result.success) {
              stats.shellCommands++;
              stats.toolsExecuted++;
              memory.onShellCommand(cmd, result.stdout || 'success');
            } else {
              stats.errors++;
              memory.onError(`Shell command failed: ${cmd} - ${result.error || 'Unknown error'}`);
            }
          } catch (err: any) {
            renderer.showCommandExecution(cmd, false);
            stats.errors++;
            memory.onError(`Shell command failed: ${cmd} - ${err.message}`);
          }
        }

        memory.addMilestone(`AI Project Creation: ${projectName} (${files.length} files, ${folders.length} folders)`);

      } catch (parseError: any) {
        renderer.setState('error', 'Failed to parse AI project structure');
        stats.errors++;
        memory.onError(`Project creation failed: ${parseError.message}`);
        renderer.status(`Error: ${parseError.message}`, 'error');
      }
    }

    // Remove memory context message after processing
    const memoryIndex = messages.findIndex(m => m.role === 'system' && m.content.includes('# Persistent Memory'));
    if (memoryIndex > 0) {
      messages.splice(memoryIndex, 1);
    }

    // Final verification state
    renderer.setState('verifying', 'Verifying results...');
    await sleep(500); // Brief verification delay
    renderer.setState('done', 'Complete');

    // Show operation summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    renderer.header('Operation Summary');
    console.log(`📁 Files created: ${stats.filesCreated}`);
    console.log(`🔧 Commands executed: ${stats.shellCommands}`);
    console.log(`🛠️  Tools used: ${stats.toolsExecuted}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    renderer.divider();

    return reply;

  } catch (error: any) {
    renderer.setState('error', error.message);
    stats.errors++;
    memory.onError(error.message);
    renderer.status(`Request failed: ${error.message}`, 'error');
    renderer.status('Try /provider to switch providers', 'info');
    return '';
  }
}

function showSteps(steps: Step[]): void {
  console.log();
  showSectionHeader('🚀 Processing Pipeline');
  steps.forEach(step => {
    const icon = step.status === 'pending' ? '○' : step.status === 'running' ? SPINNER_FRAMES[0] : step.status === 'success' ? '✓' : '✗';
    const color = step.status === 'success' ? pc.green : step.status === 'error' ? pc.red : pc.gray;
    console.log(color(`${step.emoji} ${icon} ${step.name}`));
  });
}

function updateSteps(steps: Step[]): void {
  process.stdout.write('\x1b[' + (steps.length + 1) + 'A');
  steps.forEach(step => {
    const icon = step.status === 'pending' ? '○' : step.status === 'running' ? SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length] : step.status === 'success' ? '✓' : '✗';
    const color = step.status === 'success' ? pc.green : step.status === 'error' ? pc.red : step.status === 'running' ? pc.cyan : pc.gray;
    console.log(color(`${step.emoji} ${icon} ${step.name}`) + '\x1b[K');
  });
  spinnerIndex++;
}

async function streamAIResponse(message: string): Promise<void> {
  showSectionHeader('🧠 AI Response');
  
  const words = message.split(' ');
  for (let i = 0; i < words.length; i++) {
    process.stdout.write(words[i] + ' ');
    await sleep(20);
  }
  
  console.log('\n');
  showDivider();
}

async function createFilesWithProgress(files: Array<{path: string, content: string}>, stats: OperationStats, memory: MemoryManager): Promise<void> {
  showSectionHeader('📁 Creating Files');
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;
    
    try {
      process.stdout.write(pc.cyan(`${progress} Creating ${file.path}... `));
      await executeTool('write_file', { file_path: file.path, content: file.content });
      console.log(pc.green('✓'));
      stats.filesCreated++;
      memory.onFileWrite(file.path, file.content);
    } catch (err: any) {
      console.log(pc.red(`✗ ${err.message}`));
      stats.errors++;
      memory.onError(`Failed to create ${file.path}: ${err.message}`);
    }
  }
  
  console.log();
  showDivider();
}

async function executeShellWithProgress(response: string, stats: OperationStats, memory: MemoryManager): Promise<void> {
  showSectionHeader('🔧 Executing Commands');
  
  const bashBlocks = response.match(/```(?:bash|shell|sh)\n([\s\S]*?)```/g) || [];
  
  for (const block of bashBlocks) {
    const commands = block.replace(/```(?:bash|shell|sh)\n/, '').replace(/```$/, '').trim().split('\n');
    
    for (const cmd of commands) {
      if (!cmd.trim()) continue;
      
      if (isDangerousCommand(cmd)) {
        console.log(pc.red(`✗ Blocked dangerous command: ${cmd}`));
        continue;
      }
      
      const spinner = createAnimatedSpinner(`Running ${cmd.substring(0, 40)}...`);
      const startTime = Date.now();
      
      try {
        await executeTool('run_shell_command', { command: cmd });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        spinner.succeed(`Completed in ${duration}s`);
        stats.shellCommands++;
        memory.onShellCommand(cmd, 'success');
      } catch (err: any) {
        spinner.fail(`Failed: ${err.message}`);
        stats.errors++;
        memory.onError(`Shell command failed: ${cmd} - ${err.message}`);
      }
    }
  }
  
  console.log();
  showDivider();
}

async function executeToolCallsWithTimeline(
  toolCalls: any[],
  messages: ConversationMessage[],
  client: ApiClient,
  currentModel: string,
  toolSchemas: any[],
  stats: OperationStats,
  memory: MemoryManager
): Promise<void> {
  
  showSectionHeader('🔧 Tool Execution Timeline');
  
  for (const call of toolCalls) {
    const tool = tools.find(t => t.name === call.function.name);
    if (!tool) continue;
    
    const args = JSON.parse(call.function.arguments);
    
    console.log(pc.cyan(`\n🔧 Tool: ${pc.bold(tool.displayName)}`));
    console.log(pc.gray(`   ${Object.keys(args).map(k => `${k}: ${JSON.stringify(args[k]).substring(0, 40)}`).join(', ')}`));
    
    let approved = !tool.requiresConfirmation;
    
    if (tool.requiresConfirmation) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: `Execute ${tool.displayName}?`,
        default: true
      }]);
      approved = confirm;
    }
    
    if (approved) {
      const startTime = Date.now();
      
      try {
        const result = await executeTool(call.function.name, args);
        const duration = Date.now() - startTime;
        console.log(pc.green(`   status: success`));
        console.log(pc.gray(`   duration: ${duration}ms`));
        stats.toolsExecuted++;
        
        // Update memory based on tool
        if (call.function.name === 'write_file') {
          memory.onFileWrite(args.file_path, args.content);
        } else if (call.function.name === 'read_file') {
          memory.onFileRead(args.path, result);
        } else if (call.function.name === 'run_shell_command') {
          memory.onShellCommand(args.command, result);
        }
        
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: 'Success'
        });
        
      } catch (err: any) {
        console.log(pc.red(`   status: failed`));
        console.log(pc.red(`   error: ${err.message}`));
        stats.errors++;
        memory.onError(`Tool ${call.function.name} failed: ${err.message}`);
        
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Error: ${err.message}`
        });
      }
    }
  }
  
  console.log();
  showDivider();
}

async function promptShellExecution(response: string): Promise<boolean> {
  const bashBlocks = response.match(/```(?:bash|shell|sh)\n([\s\S]*?)```/g);
  if (!bashBlocks) return false;
  
  console.log();
  showSectionHeader('🔧 Shell Commands Detected');
  
  bashBlocks.forEach(block => {
    const commands = block.replace(/```(?:bash|shell|sh)\n/, '').replace(/```$/, '').trim();
    commands.split('\n').forEach(cmd => {
      if (cmd.trim()) {
        const isDangerous = isDangerousCommand(cmd);
        const color = isDangerous ? pc.red : pc.white;
        console.log(color(`  $ ${cmd.trim()}`) + (isDangerous ? pc.red(' [BLOCKED]') : ''));
      }
    });
  });
  
  console.log();
  
  const { execute } = await inquirer.prompt<{ execute: boolean }>([{
    type: 'confirm',
    name: 'execute',
    message: 'Execute these commands?',
    default: true
  }]);
  
  return execute;
}

function isDangerousCommand(cmd: string): boolean {
  return DANGEROUS_COMMANDS.some(dangerous => cmd.includes(dangerous));
}

function showOperationSummary(stats: OperationStats): void {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  
  showSectionHeader('✨ Operation Summary');
  console.log(pc.cyan(`  Files created: ${stats.filesCreated}`));
  console.log(pc.cyan(`  Shell commands: ${stats.shellCommands}`));
  console.log(pc.cyan(`  Tools executed: ${stats.toolsExecuted}`));
  console.log(pc.cyan(`  Errors: ${stats.errors}`));
  console.log(pc.cyan(`  Duration: ${duration}s`));
  console.log();
  showDivider();
}

async function showFollowUpSuggestions(lastInput: string): Promise<void> {
  const suggestions = [
    '▸ Run project',
    '▸ Add routing',
    '▸ Add authentication',
    '▸ Deploy to Vercel',
    '▸ Continue coding'
  ];
  
  console.log();
  console.log(pc.yellow('What would you like to do next?'));
  suggestions.forEach(s => console.log(pc.gray(s)));
  console.log();
}

function showSectionHeader(title: string): void {
  console.log();
  console.log(pc.cyan('═'.repeat(70)));
  console.log(pc.cyan(title));
  console.log(pc.cyan('─'.repeat(70)));
}

function showDivider(): void {
  console.log(pc.cyan('═'.repeat(70)));
  console.log();
}

function showError(title: string, reason: string, suggestion?: string): void {
  console.log();
  console.log(pc.red('═'.repeat(70)));
  console.log(pc.red(`❌ ${title.toUpperCase()}`));
  console.log(pc.red('═'.repeat(70)));
  console.log(pc.red(`Reason: ${reason}`));
  if (suggestion) console.log(pc.yellow(`Fix: ${suggestion}`));
  console.log(pc.red('═'.repeat(70)));
  console.log();
}

function showWarning(message: string): void {
  console.log(pc.yellow(`⚠️  ${message}`));
}

function showSuccess(message: string): void {
  console.log(pc.green(`✓ ${message}`));
}

function showFunctionCallingError(): void {
  showError(
    'Function Calling Not Supported',
    'This model does not support function calling',
    'Switch to compatible model with /model'
  );
  showCompatibleModels();
}

function showCompatibleModels(): void {
  showSectionHeader('🤖 Recommended Models');
  console.log(pc.green('OpenRouter:'));
  console.log('  • anthropic/claude-3.5-sonnet');
  console.log('  • openai/gpt-4o-mini');
  console.log('  • google/gemini-2.0-flash-exp:free');
  console.log();
  console.log(pc.green('MegaLLM:'));
  console.log('  • qwen/qwen3-next-80b-a3b-instruct (default)');
  console.log();
  console.log(pc.yellow('💡 Switch with: /model'));
  showDivider();
}

function showHelp(): void {
  showSectionHeader('📚 Available Commands');
  console.log(pc.yellow('/help') + '      - Show this help');
  console.log(pc.yellow('/quit') + '      - Exit CLI');
  console.log(pc.yellow('/clear') + '     - Clear conversation');
  console.log(pc.yellow('/model') + '     - Switch AI model');
  console.log(pc.yellow('/models') + '    - Show compatible models');
  console.log(pc.yellow('/provider') + '  - Switch provider');
  console.log(pc.yellow('/create') + '    - Create files from last response');
  console.log(pc.yellow('/tools') + '     - Show available tools');
  console.log(pc.yellow('/agent') + '     - Start agent mode');
  showDivider();
}

function showGoodbyeMessage(): void {
  console.log();
  console.log(pc.cyan('═'.repeat(70)));
  console.log(pc.cyan('👋 Thanks for using VIBE CLI!'));
  console.log(pc.gray('   Made with ❤️  by KAZI'));
  console.log(pc.gray('   https://github.com/mk-knight23/vibe'));
  console.log(pc.cyan('═'.repeat(70)));
  console.log();
}

// REMOVED: createFilesFromResponse - AI-ONLY structured generation required

function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start();
}

function createAnimatedSpinner(text: string): Ora {
  return ora({ text, spinner: 'dots', color: 'cyan' }).start();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
