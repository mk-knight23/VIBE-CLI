#!/usr/bin/env node
const inquirerModule = require('inquirer');
const inquirer = inquirerModule.default || inquirerModule;
// Replaced axios with native fetch to support pkg snapshot builds
// Node 18+ provides global fetch

const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const oraModule = require('ora');
const ora = oraModule.default || oraModule;
const { exec } = require('child_process');
const { webSearch, webFetchDocs } = require(path.join(__dirname, '..', 'tools.cjs'));
const { getApiKey } = require(path.join(__dirname, '..', 'core', 'apikey.cjs'));
const fg = require('fast-glob');

// HTTP helpers using native fetch with timeout and axios-compatible errors
function fetchWithTimeout(resource, options = {}) {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

async function httpGetJson(url, { headers = {}, timeout = 30000 } = {}) {
  const res = await fetchWithTimeout(url, { headers, timeout, method: 'GET' });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw { response: { status: res.status, data: body } };
  }
  return { data: body };
}

async function httpPostJson(url, body, { headers = {}, timeout = 30000 } = {}) {
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
const TRANSCRIPTS_DIR = path.join(process.cwd(), 'transcripts');

// Defaults requested by user
const DEFAULT_MODEL_ID = 'z-ai/glm-4.5-air:free';
const DEFAULT_SYSTEM_PROMPT = 'You are an interactive CLI assistant for software engineering. Be concise and direct. Only assist with defensive security tasks; refuse to create, modify, or improve code that may be used maliciously. Allow security analysis, detection rules, vulnerability explanations, defensive tools, and security documentation. Never guess URLs; only use user-provided or known programming docs URLs. Minimize output.';

// Enhanced command history
const COMMAND_HISTORY = [];
const MAX_HISTORY = 50;

function isFreeModel(model) {
  try {
    if (model?.is_free) return true;
    const pricing = model?.pricing || model?.top_provider?.pricing;
    if (!pricing) return false;
    const nums = [];
    const pushNum = (val) => {
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

async function fetchModels(apiKey) {
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
}

async function selectModel(models) {
  if (!models || models.length === 0) throw new Error('No models available.');
  const choices = models.map((m) => ({
    name: `${m.name || m.id} ${isFreeModel(m) ? '(free)' : ''}`.trim(),
    value: m.id || m.slug || m.name,
  }));
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
    async search(query) {
      return await webSearch(query);
    },
  };
}

function isDisallowedSecurityRequest(text) {
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

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function saveTranscript(filename, messages) {
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
function createFileTree(dir, prefix = '', maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];

  const items = fs.readdirSync(dir);
  const tree = [];

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

async function startChat(initialModel) {
  let model = initialModel || DEFAULT_MODEL_ID;
  console.log(pc.green(`\nStarting chat with model: ${model}`));
  console.log('Type ' + pc.yellow('"/help"') + ' for available commands.');
  console.log(pc.gray('💡 Tip: Press Tab for command suggestions, use ↑/↓ to navigate command history'));

  // Get API key using centralized management
  const apiKey = await getApiKey();

  const tools = setupToolAccess();
  const messages = [
    { role: 'system', content: 'You are an interactive CLI assistant for software engineering. Be concise and direct. Only assist with defensive security tasks; refuse to create, modify, or improve code that may be used maliciously. Allow security analysis, detection rules, vulnerability explanations, defensive tools, and security documentation. Never guess URLs; only use user-provided or known programming docs URLs. Minimize output.' },
  ];
  let systemIndex = 0;
  // Optional system prompt (defaults to user-specified default)
  let sysPrompt = '';
  try {
    const ans = await inquirer.prompt([
      {
        type: 'input',
        name: 'sysPrompt',
        message: 'Optional: Provide a system prompt (or leave blank):',
        default: DEFAULT_SYSTEM_PROMPT,
      },
    ]);
    sysPrompt = ans.sysPrompt;
  } catch {}
  if ((sysPrompt && sysPrompt.trim()) || DEFAULT_SYSTEM_PROMPT) {
    const val = (sysPrompt && sysPrompt.trim()) || DEFAULT_SYSTEM_PROMPT;
    messages.push({ role: 'system', content: val });
    systemIndex = messages.length - 1;
  }

  let multiline = false;

  const ask = async () => {
    if (!multiline) {
      const { userInput } = await inquirer.prompt([
        { type: 'input', name: 'userInput', message: pc.cyan('You:'),
          // Add history for command recall
          suggestOnly: true,
          transformer: (input) => {
            if (input.startsWith('/')) {
              // Show suggestions for commands
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
      } catch (e) {
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
        const listSpinner = ora('Fetching free models...').start();
        const models = await fetchModels(apiKey);
        listSpinner.succeed('Free models loaded');
        const selectedModel = await selectModel(models);
        model = selectedModel;
        console.log(pc.green(`Switched to model: ${model}`));
      } catch (e) {
        console.error('Failed to switch model:', e?.message || e);
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
      } catch (e) {
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
        } catch (e) {
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
        const { generateCode } = require(path.join(__dirname, '..', 'code', 'codegen.cjs'));
        const result = await generateCode(prompt);
        spinner.succeed('Code generation completed');
        console.log(pc.green(`Generated ${result.language} code:`));
        console.log(result.code);

        const injected = `Generated code:\n\`\`\`${result.language}\n${result.code}\n\`\`\``;
        messages.push({ role: 'system', content: injected });
      } catch (e) {
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
        const { generateCompletion } = require(path.join(__dirname, '..', 'code', 'codegen.cjs'));
        const result = await generateCompletion(filePath);
        spinner.succeed('Completion suggestions ready');
        console.log(pc.green(`Found ${result.suggestions.length} suggestions:`));
        result.suggestions.forEach((suggestion, index) => {
          console.log(`\n${pc.cyan(`Suggestion ${index + 1}:`)}`);
          console.log(suggestion);
        });
      } catch (e) {
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
        const { quickRefactor } = require(path.join(__dirname, '..', 'refactor', 'refactor.cjs'));
        const result = await quickRefactor(pattern, 'clean');
        spinner.succeed('Refactoring completed');
        if (result.success) {
          console.log(pc.green('Refactoring completed successfully!'));
        } else {
          console.log(pc.yellow(result.message));
        }
      } catch (e) {
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
        const { quickDebug } = require(path.join(__dirname, '..', 'debug', 'debug.cjs'));
        const result = await quickDebug(error);
        spinner.succeed('Debug analysis completed');
        console.log(pc.green('Debug analysis completed'));
      } catch (e) {
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
        const { quickTestGeneration } = require(path.join(__dirname, '..', 'test', 'testgen.cjs'));
        const result = await quickTestGeneration(filePath);
        spinner.succeed('Test generation completed');
        console.log(pc.green('Test generation completed'));
      } catch (e) {
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
        const { reviewChanges } = require(path.join(__dirname, '..', 'git', 'gittools.cjs'));
        const result = await reviewChanges({
          file: target === 'git' ? null : target,
          focus: 'all'
        });
        spinner.succeed('Code review completed');
        if (result.success) {
          console.log(pc.green('Code review completed'));
        }
      } catch (e) {
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
        const { smartCommit, reviewChanges, createPR, smartStatus } = require('./git/gittools.cjs');

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
      } catch (e) {
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
        const { runAutonomousAgent } = require(path.join(__dirname, '..', 'agent', 'agent.cjs'));
        const result = await runAutonomousAgent(task, { auto: false });
        spinner.succeed('Agent task completed');
        if (result.success) {
          console.log(pc.green('Agent task completed successfully!'));
        } else {
          console.log(pc.yellow('Agent task completed with issues'));
        }
      } catch (e) {
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
      const completion = await httpPostJson(
        `${OPENROUTER_BASE}/chat/completions`,
        { model, messages },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'vibe-cli',
          },
          timeout: 60000,
        }
      );
      spinner.succeed('Response received');

      const content = completion.data?.choices?.[0]?.message?.content || '';
      if (!content) {
        console.log(pc.gray('(No content returned)'));
      } else {
        console.log('\n' + pc.bold('Assistant:') + ' ' + content + '\n');
        messages.push({ role: 'assistant', content });
      }
    } catch (err) {
      spinner.fail('Request failed');
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Error calling OpenRouter:', status || '', data || err.message || err);
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
    const pkgPath = path.join(__dirname, 'package.json');
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
    const fit = (s, n) => {
      const str = String(s);
      return str.length > n ? str.slice(0, n-1) + '…' : str.padEnd(n);
    };

    const box = String.raw`+-------------------------------- Vibe-CLI ${version} ---------------------------------+
|                                   | Tips for getting started                    |
|          Welcome back ${username}!${' '.repeat(Math.max(0, 10 - String(username).length))} | - Type /help to see all commands            |
|                                   | - Use /models to select a free model       |
|   | |█████| |                          | - /save [name] to save a transcript        |
|  | |█████| | ← Initializing…         | ------------------------------------------- |
|    | | | |   ← Boot Sequence OK      | Recent activity                             |
|                                   | ${fit(recent,41)} |
|                                   |                                              |
|   Vibe AI · Free Model Access     |                                              |
|       ${fit(cwd,42)} |
+---------------------------------------------------------------------------------------------+`;

    process.stdout.write('\n' + box + '\n\n');
    process.stdout.flush();
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

        if (command === 'chat' && rest) {
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

    let selectedModel = DEFAULT_MODEL_ID;
    try {
      const apiKey = await getApiKey();
      const models = await fetchModels(apiKey);
      selectedModel = (models.find(m => (m.id||m.slug||m.name) === DEFAULT_MODEL_ID)?.id) || (await selectModel(models));
    } catch (e) {
      // If fetching free models fails, continue with default model
      selectedModel = DEFAULT_MODEL_ID;
    }
    await startChat(selectedModel);
  } catch (e) {
    console.error('Fatal:', e?.message || e);
    process.exitCode = 1;
  }
}

main();

module.exports = { fetchModels, selectModel, startChat, setupToolAccess };
