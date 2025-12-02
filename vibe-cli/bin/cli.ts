#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { exec } from 'child_process';
import fg from 'fast-glob';
import { webSearch, webFetchDocs, getApiKey, chatCompletion, quickRefactor, quickDebug, quickTestGeneration, smartCommit, runAutonomousAgent, generateCode, generateCompletion, reviewChanges, createPR, smartStatus, getApiKeyStatus, clearApiKey, loadConfig, saveConfig } from '../core/index';
import { extractFileOperations, executeOperations, shouldAutoExecute } from '../core/auto-executor';

// HTTP helpers using native fetch with timeout and axios-compatible errors
async function fetchWithTimeout(resource: string, options: { timeout?: number; [key: string]: any } = {}) {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const result = await fetch(resource, { ...rest, signal: controller.signal });
    return result;
  } finally {
    clearTimeout(id);
  }
}

async function httpGetJson(url: string, { headers = {}, timeout = 30000 }: { headers?: Record<string, string>; timeout?: number } = {}) {
  const res = await fetchWithTimeout(url, { headers, timeout, method: 'GET' });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw { response: { status: res.status, data: body } };
  }
  return { data: body };
}

async function httpPostJson(url: string, body: any, { headers = {}, timeout = 30000 }: { headers?: Record<string, string>; timeout?: number } = {}) {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    timeout,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw { response: { status: res.status, data } };
  }
  return { data };
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MEGALLM_BASE = 'https://ai.megallm.io/v1';
const TRANSCRIPTS_DIR = path.join(process.cwd(), 'transcripts');

// Defaults requested by user
const DEFAULT_MODEL_ID = 'qwen/qwen3-next-80b-a3b-instruct';
const DEFAULT_SYSTEM_PROMPT = 'You are an interactive CLI assistant for software engineering. When creating files, ALWAYS format them as:\n\n**filename.ext**:\n```language\ncode here\n```\n\nFor projects, create a project folder first, then all files inside it. Example:\n\nCreate folder: project-name\n\n**project-name/index.html**:\n```html\ncode\n```\n\n**project-name/style.css**:\n```css\ncode\n```\n\n**project-name/script.js**:\n```javascript\ncode\n```\n\nBe concise and direct. Only assist with defensive security tasks.';

// Enhanced command history
const COMMAND_HISTORY: string[] = [];
const MAX_HISTORY = 50;

function isFreeModel(model: any): boolean {
  try {
    if (model?.is_free) return true;
    const pricing = model?.pricing || model?.top_provider?.pricing;
    if (!pricing) return false;
    const nums: number[] = [];
    const pushNum = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return;
      if (typeof val === 'string') {
        const n = Number(val.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) nums.push(n);
      } else if (typeof val === 'number') {
        nums.push(val);
      }
    };
    pushNum(pricing.prompt);
    pushNum(pricing.completion);
    pushNum(pricing.input);
    pushNum(pricing.output);
    return nums.length > 0 && nums.every((n) => n === 0);
  } catch (_) {
    return false;
  }
}

async function fetchModels(apiKey: string, provider: 'openrouter' | 'megallm' = 'openrouter') {
  if (provider === 'openrouter') {
    const res = await httpGetJson(`${OPENROUTER_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });
    const models = res.data?.data || res.data || [];
    const freeModels = models.filter(isFreeModel);
    if (!freeModels.length) {
      throw new Error('No free models available from OpenRouter at this time.');
    }
    return freeModels;
  } else if (provider === 'megallm') {
    // For MegaLLM, return the premium models from core/index.ts
    // We need to import the MEGALLM_MODELS array
    // Since we can't import directly in this file, we'll use a workaround
    // by returning the hardcoded list of MegaLLM premium models
    return [
      { id: 'openai-gpt-oss-20b', name: 'OpenAI GPT OSS 20B', ctx: 128000, note: 'Advanced language model with superior reasoning capabilities', provider: 'OpenAI' },
      { id: 'llama3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', ctx: 131072, note: 'Open-source large language model', provider: 'Meta' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', ctx: 128000, note: 'Open-source large language model', provider: 'Meta' },
      { id: 'alibaba-qwen3-32b', name: 'Alibaba Qwen3 32B', ctx: 131072, note: 'Qwen3 32B - Advanced AI model', provider: 'Alibaba' },
      { id: 'openai-gpt-oss-120b', name: 'OpenAI GPT OSS 120B', ctx: 128000, note: 'Advanced language model with superior reasoning capabilities', provider: 'OpenAI' },
      { id: 'llama3-8b-instruct', name: 'Llama 3 8B Instruct', ctx: 8192, note: 'Open-source large language model', provider: 'Meta' },
      { id: 'moonshotai/kimi-k2-instruct-0905', name: 'MoonshotAI Kimi K2 Instruct 0905', ctx: 256000, note: 'MoonshotAI Kimi K2 Instruct 0905 - Advanced AI model', provider: 'moonshotai' },
      { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek AI DeepSeek V3.1 Terminus', ctx: 163840, note: 'DeepSeek AI DeepSeek V3.1 Terminus - Advanced AI model', provider: 'DeepSeek' },
      { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen Qwen3 Next 80B A3B Instruct', ctx: 262144, note: 'Qwen Qwen3 Next 80B A3B Instruct - Advanced AI model', provider: 'Alibaba' },
      { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek AI DeepSeek V3.1', ctx: 128000, note: 'DeepSeek AI DeepSeek V3.1 - Advanced AI model', provider: 'DeepSeek' },
      { id: 'mistralai/mistral-nemotron', name: 'Mistral AI Mistral Nemotron', ctx: 128000, note: 'High-performance open-source language model', provider: 'Mistral AI' },
      { id: 'minimaxai/minimax-m2', name: 'MinimaxAI Minimax M2', ctx: 128000, note: 'MinimaxAI Minimax M2 - Advanced AI model', provider: 'minimaxai/minimax-m2' }
    ];
  }
  throw new Error('Invalid provider');
}

async function selectModel(models: any[], provider: 'openrouter' | 'megallm' = 'openrouter') {
  if (!models || models.length === 0) throw new Error('No models available.');
  const choices = models.map((m) => {
    let name = m.name || m.id;
    if (provider === 'openrouter') {
      name += isFreeModel(m) ? ' (free)' : '';
    } else if (provider === 'megallm') {
      name += ' (premium)';
    }
    return {
      name: name.trim(),
      value: m.id || m.slug || m.name,
    };
  });
  const { modelId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'modelId',
      pageSize: 15,
      message: 'Select a model to chat with:',
      choices,
    },
  ]);
  return modelId;
}

function setupToolAccess() {
  return {
    async search(query: string) {
      return await webSearch(query);
    },
  };
}

function isDisallowedSecurityRequest(text: string): boolean {
  try {
    const s = String(text || '').toLowerCase();
    const bad = [
      'ddos','ransomware','keylogger','malware','botnet','exploit','zero-day','zero day','backdoor','rootkit',
      'phishing','sql injection payload','xss payload','bypass','privilege escalation','crack','keygen','create a virus','write code to hack'
    ];
    return bad.some(k => s.includes(k));
  } catch {
    return false;
  }
}

function ensureDir(dir: string) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function saveTranscript(filename: string | undefined, messages: any[]) {
  ensureDir(TRANSCRIPTS_DIR);
  const safe = filename || `chat_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const file = path.join(TRANSCRIPTS_DIR, safe);
  const lines = messages.map((m) => `[${m.role}] ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`);
  fs.writeFileSync(file, lines.join('\n\n'), 'utf8');
  return file;
}

function printHelp() {
  console.log(pc.bold(pc.cyan('\n=== Vibe CLI Interactive Commands ===')));
  console.log(pc.yellow('\n🤖 Chat & AI Commands:'));
  console.log('  ' + pc.yellow('/help') + '                 Show this help');
  console.log('  ' + pc.yellow('/models') + '               List and select from free models');
  console.log('  ' + pc.yellow('/model') + '                Change the current model (opens picker)');
  console.log('  ' + pc.yellow('/provider') + '             Switch between OpenRouter and MegaLLM');
  console.log('  ' + pc.yellow('/system') + '               Edit system prompt');
  console.log('  ' + pc.yellow('/clear') + '                Clear chat context');
  console.log('  ' + pc.yellow('/context') + '              Show context info and token usage');
  console.log('  ' + pc.yellow('/multiline') + '            Toggle multiline editor mode');

  console.log(pc.yellow('\n💾 File & Project Commands:'));
  console.log('  ' + pc.yellow('/files') + '                Show project files (interactive tree view)');
  console.log('  ' + pc.yellow('/open <glob>') + '          Read files by glob and inject their contents');
  console.log('  ' + pc.yellow('/write <path>') + '         Create/overwrite a file via editor');
  console.log('  ' + pc.yellow('/edit <path>') + '          Edit an existing file via editor');
  console.log('  ' + pc.yellow('/append <path>') + '        Append to a file via editor');
  console.log('  ' + pc.yellow('/move <src> <dst>') + '     Move/rename a file');
  console.log('  ' + pc.yellow('/delete <path|glob>') + '   Delete file(s)');

  console.log(pc.yellow('\n🔧 Code Operations:'));
  console.log('  ' + pc.yellow('/generate <prompt>') + '    Generate code using AI');
  console.log('  ' + pc.yellow('/complete <file>') + '      Get code completion suggestions');
  console.log('  ' + pc.yellow('/refactor <pattern>') + '   Refactor code with AI assistance');
  console.log('  ' + pc.yellow('/debug <error>') + '        Debug errors and issues');
  console.log('  ' + pc.yellow('/test <file>') + '          Generate tests for code');
  console.log('  ' + pc.yellow('/review <file>') + '        Review code for issues');

  console.log(pc.yellow('\n🌐 Web & System Commands:'));
  console.log('  ' + pc.yellow('/search <q>') + '          Web search and inject context');
  console.log('  ' + pc.yellow('/docs <page>') + '          OpenRouter docs: quick-start | models | api-reference | sdks | guides | errors | authentication | rate-limits');
  console.log('  ' + pc.yellow('/run <cmd>') + '            Execute a shell command and inject output');
  console.log('  ' + pc.yellow('/execute <code>') + '       Execute code block and inject result');

  console.log(pc.yellow('\n📦 Session Management:'));
  console.log('  ' + pc.yellow('/save [name]') + '         Save transcript to transcripts/');
  console.log('  ' + pc.yellow('/export [format]') + '      Export session (json|txt|md)');
  console.log('  ' + pc.yellow('/history') + '              Show command history');

  console.log(pc.yellow('\n🤖 Advanced Features:'));
  console.log('  ' + pc.yellow('/git <cmd>') + '            Git operations with AI assistance');
  console.log('  ' + pc.yellow('/agent <task>') + '         Run autonomous agent task');
  console.log('  ' + pc.yellow('/feedback') + '            Report issues: https://github.com/user/vibe-cli/issues');
  console.log('  ' + pc.yellow('/exit') + '                 Quit');
  console.log('');
  console.log(pc.gray('💡 Tip: Press Tab for command suggestions, use ↑/↓ to navigate command history'));
}

function showCommandHistory() {
  console.log(pc.cyan('\n=== Command History ==='));
  if (COMMAND_HISTORY.length === 0) {
    console.log(pc.gray('No commands executed yet'));
    return;
  }
  COMMAND_HISTORY.slice(-10).reverse().forEach((cmd, i) => {
    console.log(`  ${pc.yellow(`${COMMAND_HISTORY.length - i}.`)} ${cmd}`);
  });
}

// Function to create a visual file tree
function createFileTree(dir: string, prefix = '', maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];

  const items = fs.readdirSync(dir);
  const tree: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const fullPath = path.join(dir, item);
    const isLast = i === items.length - 1;
    const currentPrefix = isLast ? '└── ' : '├── ';
    const icon = fs.statSync(fullPath).isDirectory() ? '📁' : '📄';

    tree.push(`${prefix}${currentPrefix}${icon} ${item}`);

    if (fs.statSync(fullPath).isDirectory()) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      tree.push(...createFileTree(fullPath, nextPrefix, maxDepth, currentDepth + 1));
    }
  }

  return tree;
}

async function startChat(initialModel: string, selectedProvider: string = 'megallm') {
  let model = initialModel || DEFAULT_MODEL_ID;
  console.log(pc.green(`Starting chat with ${selectedProvider}/${model}`));
  console.log('Type ' + pc.yellow('"/help"') + ' for available commands.');
  console.log(pc.gray('💡 Tip: Press Tab for command suggestions, use ↑/↓ to navigate command history'));

  // Get API key using centralized management
  const apiKey = await getApiKey();
  
  // Use selected provider
  const providerBaseUrls: Record<string, string> = {
    'openrouter': 'https://openrouter.ai/api/v1',
    'megallm': 'https://ai.megallm.io/v1',
    'agentrouter': 'https://agentrouter.org/v1',
    'routeway': 'https://api.routeway.ai/v1'
  };
  
  const baseUrl = providerBaseUrls[selectedProvider] || OPENROUTER_BASE;

  const tools = setupToolAccess();
  const messages = [
    { role: 'system', content: 'You are Vibe CLI assistant. Help users with code, answer questions, and create files when needed. Be concise and helpful.' },
  ];
  let systemIndex = 0;

  let multiline = false;

  const ask = async () => {
    if (!multiline) {
      const { userInput } = await inquirer.prompt([
        { 
          type: 'input', 
          name: 'userInput', 
          message: pc.cyan('You:'),
          transformer: (input: string) => {
            if (input.startsWith('/')) {
              const suggestions = ['/help', '/models', '/generate', '/edit', '/files', '/search', '/run', '/exit'];
              if (suggestions.some(s => s.startsWith(input.toLowerCase()))) {
                return pc.gray(input);
              }
            }
            return input;
          }
        },
      ]);
      return userInput;
    } else {
      const { lines } = await inquirer.prompt([
        { type: 'editor', name: 'lines', message: 'Multiline input (save & close):' },
      ]);
      return lines;
    }
  };

  while (true) {
    const raw = await ask();
    const trimmed = (raw || '').trim();
    if (!trimmed) continue;

    const norm = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    const lower = norm.toLowerCase();

    if (lower === '/help') {
      printHelp();
      continue;
    }

    if (lower === '/exit') {
      console.log(pc.gray('Goodbye!'));
      break;
    }

    if (lower === '/context') {
      const tokenCount = messages.reduce((acc, msg) => acc + msg.content.length, 0);
      console.log(pc.cyan('\n=== Context Info ==='));
      console.log(`Messages: ${messages.length}`);
      console.log(`Approx tokens: ${Math.ceil(tokenCount / 4)}`);
      console.log(`Current model: ${model}`);
      console.log(`Multiline mode: ${multiline ? 'ON' : 'OFF'}`);
      console.log(`Command history: ${COMMAND_HISTORY.length} commands`);
      continue;
    }

    if (lower === '/history') {
      showCommandHistory();
      continue;
    }

    if (lower.startsWith('/export')) {
      const format = trimmed.split(' ')[1] || 'txt';
      const filename = `session_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
      const file = path.join(TRANSCRIPTS_DIR, filename);

      let content;
      if (format === 'json') {
        content = JSON.stringify(messages, null, 2);
      } else if (format === 'md') {
        content = messages.map(m => `**${m.role.toUpperCase()}:**\n\n${m.content}`).join('\n\n---\n\n');
      } else {
        content = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
      }

      ensureDir(TRANSCRIPTS_DIR);
      fs.writeFileSync(file, content, 'utf8');
      console.log(pc.green(`Session exported to: ${file}`));
      continue;
    }

    if (lower.startsWith('/execute ')) {
      const code = norm.slice(9).trim();
      if (!code) { console.log('Usage: /execute <code>'); continue; }

      console.log(pc.gray(`Executing code: ${code}`));
      try {
        const result = await new Promise((resolve, reject) => {
          exec(code, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve(stdout || stderr || '(no output)');
          });
        });
        const injected = `Code execution result for "${code}":\n${result}`;
        messages.push({ role: 'system', content: injected });
        console.log(pc.gray('(Code execution result injected into context)'));
      } catch (e: any) {
        console.error(pc.red('Code execution failed:'), e.message);
      }
      continue;
    }

    if (lower === '/tools') {
      console.log(pc.cyan('Available tools:'));
      console.log('- search(query): quick web search (DuckDuckGo Instant Answer)');
      console.log('- run(cmd): execute a shell command and inject output');
      console.log('- open(glob): inject contents of matching files');
      continue;
    }

    if (lower === '/clear') {
      messages.length = 0;
      messages.push({ role: 'system', content: 'You are a helpful assistant.' });
      systemIndex = 0;
      console.log(pc.gray('Context cleared.'));
      continue;
    }

    if (lower.startsWith('/save')) {
      const name = trimmed.split(' ').slice(1).join(' ').trim();
      const file = saveTranscript(name || undefined, messages);
      console.log(pc.green(`Saved transcript to ${file}`));
      continue;
    }

    if (lower === '/system') {
      const { newSystem } = await inquirer.prompt([
        { type: 'editor', name: 'newSystem', message: 'Edit system prompt:' },
      ]);
      const val = (newSystem || '').trim();
      if (val) {
        if (typeof systemIndex === 'number' && messages[systemIndex]?.role === 'system') {
          messages[systemIndex].content = val;
        } else {
          messages.unshift({ role: 'system', content: val });
          systemIndex = 0;
        }
        console.log(pc.green('System prompt updated.'));
      }
      continue;
    }

    if (lower === '/multiline') {
      multiline = !multiline;
      console.log(pc.gray(`Multiline mode: ${multiline ? 'ON' : 'OFF'}`));
      continue;
    }

    if (lower === '/models' || lower === '/model') {
      try {
        const apiKeyStatus = getApiKeyStatus();
        const provider = apiKeyStatus.provider || 'openrouter';
        const listSpinner = ora(`Fetching ${provider === 'openrouter' ? 'free' : 'premium'} models...`).start();
        const models = await fetchModels(apiKey, provider);
        listSpinner.succeed(`${provider === 'openrouter' ? 'Free' : 'Premium'} models loaded`);
        const selectedModel = await selectModel(models, provider);
        model = selectedModel;
        console.log(pc.green(`Switched to model: ${model}`));
      } catch (e: any) {
        console.error('Failed to switch model:', e?.message || e);
      }
      continue;
    }

    if (lower === '/provider') {
      try {
        const apiKeyStatus = getApiKeyStatus();
        const currentProvider = apiKeyStatus.provider || 'openrouter';
        const newProvider = currentProvider === 'openrouter' ? 'megallm' : 'openrouter';
        
        // Get the appropriate hardcoded key for the new provider
        const DEFAULT_OPENROUTER_KEY = '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';
        const DEFAULT_MEGALLM_KEY = 'sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820';
        
        // Update config directly
        const cfg = loadConfig();
        
        // Clear any existing provider config
        if (cfg.openrouter) {
          delete cfg.openrouter.apiKey;
        }
        if (cfg.megallm) {
          delete cfg.megallm.apiKey;
        }
        
        // Set the new provider's API key
        cfg[newProvider] = cfg[newProvider] || {};
        cfg[newProvider].apiKey = newProvider === 'openrouter' ? DEFAULT_OPENROUTER_KEY : DEFAULT_MEGALLM_KEY;
        if (newProvider === 'megallm') {
          cfg[newProvider].baseUrl = 'https://ai.megallm.io/v1';
        }
        
        saveConfig(cfg);
        
        // Clear the in-memory key to force reload
        clearApiKey();
        
        console.log(pc.green(`Switched from ${currentProvider} to ${newProvider}`));
        console.log(pc.gray(`New API key has been set automatically for ${newProvider}`));
        
        // Show current provider status
        const newStatus = getApiKeyStatus();
        console.log(pc.cyan(`Current provider: ${newStatus.provider}`));
        
      } catch (e: any) {
        console.error('Failed to switch provider:', e?.message || e);
      }
      continue;
    }

    if (lower.startsWith('/docs ')) {
      const page = norm.slice(6).trim();
      if (!page) {
        console.log('Please provide a docs page: quick-start | models | api-reference | sdks | guides | errors | authentication | rate-limits');
        continue;
      }
      const content = await webFetchDocs(page);
      const injected = `OpenRouter docs (${page}) snippet:\n${String(content).slice(0, 4000)}`;
      messages.push({ role: 'system', content: injected });
      console.log(pc.gray('(Docs snippet injected into context)'));
      continue;
    }

    if (lower.startsWith('/search ')) {
      const query = norm.slice(8).trim();
      if (!query) {
        console.log('Please provide a search query after /search');
        continue;
      }
      console.log(pc.gray(`Searching the web for: ${query}`));
      try {
        const spinner = ora('Searching web...').start();
        const result = await tools.search(query);
        spinner.succeed('Search completed');
        const injected = `Web search results for "${query}":\n${result}`;
        messages.push({ role: 'system', content: injected });
        console.log(pc.gray('(Search results injected into context)'));
      } catch (e: any) {
        console.error('Search failed:', e?.message || e);
      }
      continue;
    }

    // Execute commands like Claude Code CLI
    if (lower.startsWith('/run ')) {
      const cmd = norm.slice(5);
      console.log(pc.gray(`Executing: ${cmd}`));
      const spinner = ora('Running command...').start();
      const out = await new Promise((resolve) => {
        exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) resolve(`Command error: ${err.message}\n${stderr}`);
          else resolve(stdout || stderr || '(no output)');
        });
      });
      spinner.succeed('Command completed');
      const injected = `Shell command output for "${cmd}":\n${out}`;
      messages.push({ role: 'system', content: injected });
      console.log(pc.gray('(Command output injected into context)'));
      continue;
    }

    if (lower.startsWith('/open ')) {
      const pattern = norm.slice(6).trim() || '**/*';
      const spinner = ora(`Reading files matching ${pattern}...`).start();
      const files = await fg(pattern, { onlyFiles: true, dot: false });
      spinner.stop();
      if (!files.length) {
        console.log(pc.gray('No files matched.'));
        continue;
      }
      const maxBytes = 150_000; // prevent huge injections
      let injectedText = '';
      for (const f of files.slice(0, 20)) { // cap number of files
        try {
          const text = fs.readFileSync(f, 'utf8');
          if (injectedText.length + text.length > maxBytes) break;
          injectedText += `\n\n===== File: ${f} =====\n${text}`;
        } catch (_) {}
      }
      if (!injectedText) {
        console.log(pc.gray('Files too large to inject or empty.'));
        continue;
      }
      messages.push({ role: 'system', content: `Injected file contents:${injectedText}` });
      console.log(pc.gray('(File contents injected into context)'));
      continue;
    }

    if (lower === '/files') {
      try {
        console.log(pc.cyan('\n📁 Project File Structure:\n'));
        const tree = createFileTree(process.cwd());
        console.log(tree.join('\n'));
        console.log(pc.gray('\nShowing files and directories in current directory (max depth: 2)'));
      } catch (e) {
        const files = await fg('**/*', { onlyFiles: true, dot: false });
        console.log(files.join('\n'));
      }
      continue;
    }

    if (lower.startsWith('/write ')) {
      const target = norm.slice(7).trim();
      if (!target) { console.log('Usage: /write <path>'); continue; }

      // Check if file exists and confirm overwrite
      if (fs.existsSync(target)) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `File ${target} exists. Overwrite?`,
            default: false
          }
        ]);
        if (!confirm) {
          console.log(pc.yellow('Write cancelled.'));
          continue;
        }
      }

      const { body } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'body',
          message: `Write file ${target}:`,
          default: fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : ''
        }
      ]);
      ensureDir(path.dirname(target));
      fs.writeFileSync(target, body || '', 'utf8');
      console.log(pc.green(`Wrote ${target}`));
      continue;
    }

    if (lower.startsWith('/edit ')) {
      const target = norm.slice(6).trim();
      if (!target) { console.log('Usage: /edit <path>'); continue; }
      if (!fs.existsSync(target)) {
        console.error(pc.red(`File not found: ${target}`));
        continue;
      }

      const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      const { body } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'body',
          message: `Edit file ${target}:`,
          default: existing
        }
      ]);
      ensureDir(path.dirname(target));
      fs.writeFileSync(target, body || '', 'utf8');
      console.log(pc.green(`Saved ${target}`));
      continue;
    }

    if (lower.startsWith('/append ')) {
      const target = norm.slice(8).trim();
      if (!target) { console.log('Usage: /append <path>'); continue; }
      const { body } = await inquirer.prompt([
        { type: 'editor', name: 'body', message: `Append to ${target}:` }
      ]);
      ensureDir(path.dirname(target));
      fs.appendFileSync(target, body || '', 'utf8');
      console.log(pc.green(`Appended to ${target}`));
      continue;
    }

    if (lower.startsWith('/move ')) {
      const parts = norm.split(/\s+/).slice(1);
      if (parts.length < 2) { console.log('Usage: /move <src> <dst>'); continue; }
      const [src, dst] = parts;

      if (!fs.existsSync(src)) {
        console.error(pc.red(`Source file not found: ${src}`));
        continue;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Move ${src} to ${dst}?`,
          default: false
        }
      ]);
      if (!confirm) {
        console.log(pc.yellow('Move cancelled.'));
        continue;
      }

      ensureDir(path.dirname(dst));
      fs.renameSync(src, dst);
      console.log(pc.green(`Moved ${src} -> ${dst}`));
      continue;
    }

    if (lower.startsWith('/delete ')) {
      const pat = norm.slice(8).trim();
      if (!pat) { console.log('Usage: /delete <path|glob>'); continue; }
      const matches = await fg(pat, { onlyFiles: true, dot: false });
      if (!matches.length) {
        console.log('No files matched');
        continue;
      }

      console.log(pc.yellow(`Files to be deleted:`));
      matches.forEach(f => console.log(`  - ${f}`));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Really delete ${matches.length} file(s)?`,
          default: false
        }
      ]);
      if (!confirm) {
        console.log(pc.yellow('Delete cancelled.'));
        continue;
      }

      for (const f of matches) {
        try {
          fs.unlinkSync(f);
          console.log(pc.green(`Deleted ${f}`));
        } catch (e: any) {
          console.log(pc.red(`Failed ${f}: ${e?.message||e}`));
        }
      }
      continue;
    }

    // Enhanced commands integration
    if (lower.startsWith('/generate ')) {
      const prompt = norm.slice(10).trim();
      if (!prompt) { console.log('Usage: /generate <prompt>'); continue; }

      const spinner = ora('Generating code...').start();
      try {
        // generateCode is now available from core import
        const result = await generateCode(prompt);
        spinner.succeed('Code generation completed');
        console.log(pc.green(`Generated ${result.language} code:`));
        
        // Display code in a plain, simple box
        const codeLines = (result.code as string).split('\n');
        const maxLineLength = Math.max(...codeLines.map(line => line.length));
        const boxWidth = Math.max(80, maxLineLength + 2);
        
        // Top border
        console.log('+' + '-'.repeat(boxWidth - 2) + '+');
        
        // Code lines
        codeLines.forEach(line => {
          console.log('|' + line + '|');
        });
        
        // Bottom border
        console.log('+' + '-'.repeat(boxWidth - 2) + '+');
        
        // Simple copy instruction
        console.log('\nCopy code: Select the code above and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)');
        
        const injected = `Generated code:\n\`\`\`${result.language}\n${result.code}\n\`\`\``;
        messages.push({ role: 'system', content: injected });
      } catch (e: any) {
        spinner.fail('Code generation failed');
        console.error(pc.red('Code generation failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/complete ')) {
      const filePath = norm.slice(10).trim();
      if (!filePath) { console.log('Usage: /complete <file>'); continue; }

      if (!fs.existsSync(filePath)) {
        console.error(pc.red(`File not found: ${filePath}`));
        continue;
      }

      const spinner = ora(`Getting completion for: ${filePath}`).start();
      try {
        // generateCompletion is now available from core import
        const result = await generateCompletion(filePath);
        spinner.succeed('Completion suggestions ready');
        console.log(pc.green(`Found ${result.suggestions.length} suggestions:`));
        result.suggestions.forEach((suggestion: string, index: number) => {
          console.log(`\n${pc.cyan(`Suggestion ${index + 1}:`)}`);
          
          // Display suggestion in a plain, simple box
          const codeLines = suggestion.split('\n');
          const maxLineLength = Math.max(...codeLines.map(line => line.length));
          const boxWidth = Math.max(80, maxLineLength + 2);
          
          // Top border
          console.log('+' + '-'.repeat(boxWidth - 2) + '+');
          
          // Code lines
          codeLines.forEach(line => {
            console.log('|' + line + '|');
          });
          
          // Bottom border
          console.log('+' + '-'.repeat(boxWidth - 2) + '+');
          
          // Simple copy instruction
          console.log('\nCopy code: Select the code above and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)');
        });
      } catch (e: any) {
        spinner.fail('Code completion failed');
        console.error(pc.red('Code completion failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/refactor ')) {
      const pattern = norm.slice(10).trim();
      if (!pattern) { console.log('Usage: /refactor <pattern>'); continue; }

      const spinner = ora(`Refactoring: ${pattern}`).start();
      try {
        // quickRefactor is now available from core import
        const result = await quickRefactor(pattern, { strategy: 'clean' });
        spinner.succeed('Refactoring completed');
        if (result.success) {
          console.log(pc.green('Refactoring completed successfully!'));
          
          // Display refactored code in a box with copy indicator
          const codeLines = (result.refactoredCode as string).split('\n');
          const maxLineLength = Math.max(...codeLines.map(line => line.length));
          const boxWidth = Math.max(80, maxLineLength + 4);
          
          console.log(pc.cyan('┌' + '─'.repeat(boxWidth - 2) + '┐'));
          console.log(pc.cyan('│') + pc.yellow(' COPY ').padEnd(boxWidth - 3) + pc.cyan('│'));
          console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
          codeLines.forEach(line => {
            console.log(pc.cyan('│') + pc.yellow('  ') + line + pc.yellow('  ').repeat(Math.max(0, boxWidth - 4 - line.length)) + pc.cyan('│'));
          });
          console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
          console.log(pc.cyan('└' + '─'.repeat(boxWidth - 2) + '┘'));
          console.log(pc.gray(`\nTo copy: Select the code above and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)`));
        } else {
          console.log(pc.yellow(result.message));
        }
      } catch (e: any) {
        spinner.fail('Refactoring failed');
        console.error(pc.red('Refactoring failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/debug ')) {
      const error = norm.slice(7).trim();
      if (!error) { console.log('Usage: /debug <error-message|file>'); continue; }

      const spinner = ora('Debugging...').start();
      try {
        // quickDebug is now available from core import
        const result = await quickDebug(error);
        spinner.succeed('Debug analysis completed');
        console.log(pc.green('Debug analysis completed'));
        
        // Display debug analysis in a box with copy indicator
        const analysisLines = (result.analysis as string).split('\n');
        const maxLineLength = Math.max(...analysisLines.map(line => line.length));
        const boxWidth = Math.max(80, maxLineLength + 4);
        
        console.log(pc.cyan('┌' + '─'.repeat(boxWidth - 2) + '┐'));
        console.log(pc.cyan('│') + pc.yellow(' COPY ').padEnd(boxWidth - 3) + pc.cyan('│'));
        console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
        analysisLines.forEach(line => {
          console.log(pc.cyan('│') + pc.yellow('  ') + line + pc.yellow('  ').repeat(Math.max(0, boxWidth - 4 - line.length)) + pc.cyan('│'));
        });
        console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
        console.log(pc.cyan('└' + '─'.repeat(boxWidth - 2) + '┘'));
        console.log(pc.gray(`\nTo copy: Select the code above and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)`));
      } catch (e: any) {
        spinner.fail('Debug analysis failed');
        console.error(pc.red('Debug analysis failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/test ')) {
      const filePath = norm.slice(6).trim();
      if (!filePath) { console.log('Usage: /test <file>'); continue; }

      const spinner = ora(`Generating tests for: ${filePath}`).start();
      try {
        // quickTestGeneration is now available from core import
        const result = await quickTestGeneration(filePath);
        spinner.succeed('Test generation completed');
        console.log(pc.green('Test generation completed'));
        
        // Display test code in a box with copy indicator
        const testLines = (result.tests as string).split('\n');
        const maxLineLength = Math.max(...testLines.map(line => line.length));
        const boxWidth = Math.max(80, maxLineLength + 4);
        
        console.log(pc.cyan('┌' + '─'.repeat(boxWidth - 2) + '┐'));
        console.log(pc.cyan('│') + pc.yellow(' COPY ').padEnd(boxWidth - 3) + pc.cyan('│'));
        console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
        testLines.forEach(line => {
          console.log(pc.cyan('│') + pc.yellow('  ') + line + pc.yellow('  ').repeat(Math.max(0, boxWidth - 4 - line.length)) + pc.cyan('│'));
        });
        console.log(pc.cyan('│') + ' '.repeat(boxWidth - 2) + pc.cyan('│'));
        console.log(pc.cyan('└' + '─'.repeat(boxWidth - 2) + '┘'));
        console.log(pc.gray(`\nTo copy: Select the code above and press Cmd+C (Mac) or Ctrl+C (Windows/Linux)`));
      } catch (e: any) {
        spinner.fail('Test generation failed');
        console.error(pc.red('Test generation failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/review ')) {
      const target = norm.slice(9).trim();
      if (!target) { console.log('Usage: /review <file|git>'); continue; }

      const spinner = ora(`Reviewing: ${target}`).start();
      try {
        // reviewChanges is now available from core import
        const result = await reviewChanges({
          file: target === 'git' ? null : target,
          focus: 'all'
        });
        spinner.succeed('Code review completed');
        if (result.success) {
          console.log(pc.green('Code review completed'));
        }
      } catch (e: any) {
        spinner.fail('Code review failed');
        console.error(pc.red('Code review failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/git ')) {
      const gitCmd = norm.slice(5).trim();
      if (!gitCmd) { console.log('Usage: /git <commit|review|pr|status>'); continue; }

      const spinner = ora(`Git operation: ${gitCmd}`).start();
      try {
        // These functions are now available from core import

        if (gitCmd.startsWith('commit')) {
          const result = await smartCommit({ addAll: true });
          spinner.succeed('Git operation completed');
          if (result.success) {
            console.log(pc.green(`Committed: ${result.message}`));
          }
        } else if (gitCmd.startsWith('review')) {
          const result = await reviewChanges({ focus: 'all' });
          spinner.succeed('Git operation completed');
          if (result.success) {
            console.log(pc.green('Git review completed'));
          }
        } else if (gitCmd.startsWith('pr')) {
          const result = await createPR({ dryRun: true });
          spinner.succeed('Git operation completed');
          if (result.success) {
            console.log(pc.green('PR description generated'));
          }
        } else if (gitCmd.startsWith('status')) {
          const result = await smartStatus({ includeSuggestions: true });
          spinner.succeed('Git operation completed');
          console.log(pc.green(`Git status: ${result.branch}`));
        }
      } catch (e: any) {
        spinner.fail('Git operation failed');
        console.error(pc.red('Git operation failed:'), e.message);
      }
      continue;
    }

    if (lower.startsWith('/agent ')) {
      const task = norm.slice(7).trim();
      if (!task) { console.log('Usage: /agent <task>'); continue; }

      const spinner = ora(`Running agent task: ${task}`).start();
      try {
        // runAutonomousAgent is now available from core import
        const result = await runAutonomousAgent(task, { auto: false });
        spinner.succeed('Agent task completed');
        if (result.success) {
          console.log(pc.green('Agent task completed successfully!'));
        } else {
          console.log(pc.yellow('Agent task completed with issues'));
        }
      } catch (e: any) {
        spinner.fail('Agent task failed');
        console.error(pc.red('Agent task failed:'), e.message);
      }
      continue;
    }

    // Regular user message
    if (isDisallowedSecurityRequest(trimmed)) {
      console.log(pc.red('Refusing: only defensive security assistance is allowed. You can ask for analysis, detection rules, or defensive guidance.'));
      continue;
    }

    // Add command to history (for non-system commands)
    if (trimmed && !trimmed.startsWith('/')) {
      COMMAND_HISTORY.push(trimmed);
      if (COMMAND_HISTORY.length > MAX_HISTORY) {
        COMMAND_HISTORY.shift();
      }
    } else if (trimmed && trimmed.startsWith('/')) {
      const cmd = trimmed.split(' ')[0].toLowerCase();
      if (!['/context', '/history', '/help', '/exit'].includes(cmd)) {
        COMMAND_HISTORY.push(trimmed);
        if (COMMAND_HISTORY.length > MAX_HISTORY) {
          COMMAND_HISTORY.shift();
        }
      }
    }

    messages.push({ role: 'user', content: trimmed });

    // Spinner for model call
    const spinner = ora('Thinking...').start();
    try {
      // Use ProviderManager for automatic fallback
      const { ProviderManager } = await import('../src/core/providerManager');
      const manager = new ProviderManager();
      
      let content = '';
      try {
        for await (const chunk of manager.chatWithFallback(selectedProvider, model, messages as any)) {
          if (chunk.type === 'token' && chunk.content) {
            content += chunk.content;
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error);
          }
        }
      } catch (error: any) {
        spinner.fail('All providers failed');
        console.error(pc.red(`Error: ${error.message}`));
        continue;
      }
      
      spinner.succeed('Response received');

      if (!content) {
        console.log(pc.gray('(No content returned)'));
      } else {
        console.log('\n' + pc.bold('Assistant:') + ' ' + content + '\n');
        messages.push({ role: 'assistant', content });
        
        // Auto-execute file operations if detected
        if (shouldAutoExecute(trimmed)) {
          const operations = extractFileOperations(content);
          if (operations.length > 0) {
            await executeOperations(operations);
          }
        }
      }
    } catch (err: any) {
      spinner.fail('Request failed');
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Error calling API:', status || '', data || err.message || err);
      if (status === 401) {
        console.error('Authentication failed. Check your API key.');
      }
    }
  }
}

function printAsciiWelcome() {
  if (process.env.VIBE_NO_BANNER === '1') return;
  try {
    const os = require('os');
    const username = (os.userInfo && os.userInfo().username) || process.env.USER || process.env.USERNAME || 'User';
    const pkgPath = path.join(__dirname, '..', 'package.json');
    let version = 'v1.0';
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg && pkg.version) version = 'v' + pkg.version;
    } catch {}

    // Recent activity: show most recent transcript file or none
    let recent = 'No recent activity';
    try {
      if (fs.existsSync(TRANSCRIPTS_DIR)) {
        const files = fs.readdirSync(TRANSCRIPTS_DIR)
          .filter(f => !f.startsWith('.'))
          .map(f => ({ f, t: fs.statSync(path.join(TRANSCRIPTS_DIR, f)).mtimeMs }))
          .sort((a, b) => b.t - a.t);
        if (files.length) {
          recent = `Last: ${files[0].f}`;
        }
      }
    } catch {}

    const cwd = process.cwd();
    const fit = (s: string, n: number) => {
      const str = String(s);
      return str.length > n ? str.slice(0, n-1) + '…' : str.padEnd(n);
    };

    const box = String.raw`+-------------------------------- VIBE-CLI ${version} ---------------------------------+
|                                   | Tips for getting started                    |
|          Welcome back ${username}!${' '.repeat(Math.max(0, 10 - String(username).length))} | - Type /help to see all commands            |
|                                   | - Use /models to select a free model       |
|   | |█████| |                          | - /save [name] to save a transcript        |
|  | |█████| | ← Initializing…         | ------------------------------------------- |
|    | | | |   ← Boot Sequence OK      | Recent activity                             |
|                                   | ${fit(recent,41)} |
|                                   |                                              |
|   VIBE AI · Free Model Access     |                                              |
|       ${fit(cwd,42)} |
+---------------------------------------------------------------------------------------------+`;

    process.stdout.write('\n' + box + '\n\n');
  } catch (e) {
    // Fallback: ignore banner errors
  }
}

async function main() {
  try {
    printAsciiWelcome();

    // Detect non-interactive terminal early and fail fast instead of hanging on inquirer prompts.
    const NON_TTY = !process.stdout.isTTY || !process.stdin.isTTY || process.env.TERM === 'dumb';
    if (NON_TTY) {
      // Check if this is a command being passed
      const args = process.argv.slice(2);
      if (args.length > 0) {
        // Handle direct commands like 'vibe chat "Hello"' without starting the interactive session
        const command = args[0];
        const rest = args.slice(1).join(' ');

        // File system commands
        if (command === 'create' || command === 'write') {
          const [filePath, ...contentParts] = rest.split(' ');
          const content = contentParts.join(' ');
          if (!filePath) {
            console.error(pc.red('Usage: vibe create <file> <content>'));
            return;
          }
          const dir = path.dirname(filePath);
          if (dir !== '.' && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, content || '', 'utf8');
          console.log(pc.green(`✓ Created ${filePath}`));
          return;
        } else if (command === 'mkdir') {
          const dirPath = rest.trim();
          if (!dirPath) {
            console.error(pc.red('Usage: vibe mkdir <directory>'));
            return;
          }
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(pc.green(`✓ Created directory ${dirPath}`));
          return;
        } else if (command === 'read') {
          const filePath = rest.trim();
          if (!filePath || !fs.existsSync(filePath)) {
            console.error(pc.red('File not found'));
            return;
          }
          console.log(fs.readFileSync(filePath, 'utf8'));
          return;
        } else if (command === 'ls') {
          const dirPath = rest.trim() || '.';
          const files = fs.readdirSync(dirPath);
          files.forEach(f => console.log(f));
          return;
        } else if (command === 'edit') {
          const [filePath, ...instructionParts] = rest.split(' ');
          const instruction = instructionParts.join(' ');
          if (!filePath || !fs.existsSync(filePath)) {
            console.error(pc.red('File not found'));
            return;
          }
          const currentContent = fs.readFileSync(filePath, 'utf8');
          const apiKey = await getApiKey();
          const spinner = ora('Generating changes...').start();
          const completion = await httpPostJson(
            `${OPENROUTER_BASE}/chat/completions`,
            {
              model: DEFAULT_MODEL_ID,
              messages: [
                { role: 'system', content: 'You are a code editor. Return ONLY the complete modified file content, no explanations.' },
                { role: 'user', content: `File: ${filePath}\n\nCurrent content:\n${currentContent}\n\nInstruction: ${instruction}\n\nReturn the complete modified file:` }
              ]
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost',
                'X-Title': 'vibe-cli',
              },
              timeout: 60000,
            }
          );
          spinner.stop();
          const newContent = completion.data?.choices?.[0]?.message?.content || '';
          if (newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(pc.green(`✓ Updated ${filePath}`));
          }
          return;
        } else if (command === 'chat' && rest) {
          // Handle simple chat command
          const apiKey = await getApiKey();
          const completion = await httpPostJson(
            `${OPENROUTER_BASE}/chat/completions`,
            {
              model: DEFAULT_MODEL_ID,
              messages: [
                { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
                { role: 'user', content: rest }
              ]
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost',
                'X-Title': 'vibe-cli',
              },
              timeout: 60000,
            }
          );

          const content = completion.data?.choices?.[0]?.message?.content || '';
          if (content) {
            console.log(content);
          }
          return;
        } else if (command === '--version' || command === 'version' || command === '-v') {
          const pkgPath = path.join(__dirname, '..', 'package.json'); // Look in parent directory
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          console.log(pkg.version);
          return;
        }
      }

      console.error(pc.red('Interactive terminal not detected (TERM=' + (process.env.TERM || '') + ').'));
      console.error(pc.yellow('Fix your VSCode terminal:'));
      console.error('- Open a new integrated terminal (Ctrl+`) or restart VSCode.');
      console.error('- Ensure TERM is set (e.g. export TERM=xterm-256color).');
      console.error('- Ensure PS1 is set by your shell startup files (.zshrc / .bashrc).');
      console.error('- Set API key non-interactively: export OPENROUTER_API_KEY=YOUR_KEY');
      console.error('Fallback usage (non-interactive): node bin/vibe.cjs chat "Hello world"');
      return; // Do not proceed to interactive chat loop
    }

    // Show welcome and select provider + model
    const { showWelcomeAndSelect } = await import('../core/startup-selector');
    const { provider, model } = await showWelcomeAndSelect();
    
    await startChat(model, provider);
  } catch (e: any) {
    console.error('Fatal:', e?.message || e);
    process.exitCode = 1;
  }
}

main();

export { fetchModels, selectModel, startChat, setupToolAccess };