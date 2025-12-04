import inquirer from 'inquirer';
import pc from 'picocolors';
import ora from 'ora';
import { ApiClient } from '../core/api';
import { logger } from '../utils/logger';
import { tools, executeTool } from '../tools';
import { parseFilesFromResponse } from '../utils/file-parser';
import { executeBashCommands } from '../utils/bash-executor';
import { handleCommand } from './command-handler';

const VERSION = '7.0.0';
const DEFAULT_MODEL = 'qwen/qwen3-next-80b-a3b-instruct';
const SYSTEM_PROMPT = `You are VIBE v7.0.0, an AI-powered development platform created by KAZI.

🔥 CRITICAL RULES:
1. ALWAYS create files in code blocks with clear filenames
2. ALWAYS include bash commands in \`\`\`bash blocks
3. Create COMPLETE, WORKING code - no placeholders
4. Use proper project structure with folders

📁 FILE FORMAT (use this):
\`\`\`html
<!-- filename: project-name/index.html -->
<!DOCTYPE html>
<html>...</html>
\`\`\`

\`\`\`css
/* filename: project-name/style.css */
* { margin: 0; }
\`\`\`

🔧 COMMAND FORMAT:
\`\`\`bash
cd project-name
npm install
npm start
\`\`\`

🎯 EXAMPLES:

User: "create a todo app"
YOU RESPOND:
\`\`\`html
<!-- filename: todo-app/index.html -->
<!DOCTYPE html>
<html>
<head><title>Todo App</title></head>
<body>
  <div id="app"></div>
  <script src="script.js"></script>
</body>
</html>
\`\`\`

\`\`\`css
/* filename: todo-app/style.css */
* { margin: 0; padding: 0; }
body { font-family: Arial; }
\`\`\`

\`\`\`javascript
// filename: todo-app/script.js
const todos = [];
// Complete implementation
\`\`\`

\`\`\`bash
cd todo-app
python -m http.server 8000
\`\`\`

User: "install express"
YOU RESPOND:
\`\`\`bash
npm install express
\`\`\`

User: "list files"
YOU RESPOND:
\`\`\`bash
ls -la
\`\`\`

⚠️ NEVER say "here's how" or "you can" - JUST DO IT!
⚠️ ALWAYS include complete code, not snippets
⚠️ ALWAYS use proper filenames in comments`;



export async function startInteractive(client: ApiClient): Promise<void> {
  logger.box('🎨 VIBE v7.0.0 🔥 Made by KAZI', 'AI-Powered Development Platform\nType /help for commands, /quit to exit');
  
  // Set default provider to MegaLLM (working)
  client.setProvider('megallm');
  
  const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  let currentModel = DEFAULT_MODEL;
  let lastResponse = '';
  
  while (true) {
    const { input } = await inquirer.prompt<{ input: string }>([{
      type: 'input',
      name: 'input',
      message: pc.cyan('You:')
    }]);
    
    if (!input.trim()) continue;
    
    // Handle commands
    if (input.startsWith('/')) {
      const handled = await handleCommand(input, client, currentModel);
      if (handled === 'quit') break;
      if (handled === 'clear') {
        messages.length = 1; // Keep system prompt
        lastResponse = '';
        continue;
      }
      if (handled === 'create') {
        // Parse last response for files
        if (!lastResponse) {
          logger.warn('No previous response to parse');
          continue;
        }
        
        // Infer project name from last user input
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        let projectName = 'project';
        const createMatch = lastUserMsg.match(/create\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        const buildMatch = lastUserMsg.match(/build\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        const makeMatch = lastUserMsg.match(/make\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        
        if (createMatch) projectName = createMatch[1] + '-app';
        else if (buildMatch) projectName = buildMatch[1] + '-app';
        else if (makeMatch) projectName = makeMatch[1] + '-app';
        
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        const files: Array<{path: string, content: string}> = [];
        
        while ((match = codeBlockRegex.exec(lastResponse)) !== null) {
          const lang = match[1] || 'txt';
          const content = match[2];
          
          const lines = lastResponse.substring(0, match.index).split('\n');
          const lastLines = lines.slice(-5).join(' ');
          
          let filename = '';
          
          // Check for explicit filename
          const filenameMatch = lastLines.match(/(?:file|create|save|write)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[`"]?/i);
          if (filenameMatch) {
            filename = filenameMatch[1];
          } else {
            // Infer from language
            if (lastLines.match(/index\.html/i) || (lang === 'html' && !filename)) filename = 'index.html';
            else if (lastLines.match(/style\.css/i) || lastLines.match(/main\.css/i)) filename = 'style.css';
            else if (lastLines.match(/script\.js/i) || lastLines.match(/app\.js/i)) filename = 'script.js';
            else if (lastLines.match(/package\.json/i)) filename = 'package.json';
            else if (lastLines.match(/README/i)) filename = 'README.md';
            else if (lang === 'html') filename = 'index.html';
            else if (lang === 'css') filename = 'style.css';
            else if (lang === 'javascript' || lang === 'js') filename = 'script.js';
            else if (lang === 'json') filename = 'package.json';
            else if (lang === 'python' || lang === 'py') filename = 'main.py';
            else if (lang === 'markdown' || lang === 'md') filename = 'README.md';
            else filename = `file.${lang}`;
          }
          
          // Add project folder prefix
          if (!filename.includes('/')) {
            filename = `${projectName}/${filename}`;
          } else if (!filename.startsWith(projectName)) {
            filename = `${projectName}/${filename}`;
          }
          
          files.push({ path: filename, content });
        }
        
        if (files.length === 0) {
          logger.warn('No code blocks found in last response');
          continue;
        }
        
        console.log(`\n${pc.cyan(`Creating project: ${projectName}`)}\n`);
        console.log(`${pc.cyan(`Found ${files.length} file(s) to create`)}\n`);
        
        // Batch create all files in parallel
        const results = await Promise.all(files.map(async (file) => {
          try {
            await executeTool('write_file', { file_path: file.path, content: file.content });
            return { path: file.path, success: true };
          } catch (err: any) {
            return { path: file.path, success: false, error: err.message };
          }
        }));
        
        results.forEach(r => {
          if (r.success) {
            logger.success(`✓ Created ${r.path}`);
          } else {
            logger.error(`✗ Failed ${r.path}: ${r.error}`);
          }
        });
        
        const successCount = results.filter(r => r.success).length;
        console.log(`\n${pc.green(`✓ Project created: ${projectName}/ (${successCount}/${files.length} files)`)}\n`);
        continue;
      }
      if (handled === 'model') {
        const spinner = ora('Fetching models...').start();
        try {
          const models = await client.fetchModels();
          spinner.stop();
          
          if (models.length === 0) {
            logger.warn('No models available for current provider');
            continue;
          }
          
          const choices = models.map((m: any) => ({
            name: `${m.id || m.name} (${m.contextLength || 'N/A'} tokens)`,
            value: m.id || m.name
          }));
          
          const { model } = await inquirer.prompt<{ model: string }>([{
            type: 'list',
            name: 'model',
            message: 'Select model:',
            choices,
            default: currentModel,
            pageSize: 15
          }]);
          
          currentModel = model;
          logger.success(`Switched to ${model}`);
        } catch (error: any) {
          spinner.stop();
          logger.error(`Failed to fetch models: ${error.message}`);
        }
      }
      continue;
    }
    
    messages.push({ role: 'user', content: input });
    
    let fullResponse = '';
    const spinner = ora('AI is thinking...').start();
    
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
      
      const response = await client.chat(messages, currentModel, {
        temperature: 0.7,
        maxTokens: 4000,
        tools: toolSchemas
      });
      
      spinner.stop();
      
      const assistantMessage = response.choices?.[0]?.message;
      const reply = assistantMessage?.content || '';
      const toolCalls = assistantMessage?.tool_calls || [];
      
      fullResponse = reply;
      
      let actionsPerformed = false;
      
      // ALWAYS parse and execute files from response
      if (reply) {
        // Infer project name from user input
        let projectName = 'project';
        const createMatch = input.match(/create\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        const buildMatch = input.match(/build\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        const makeMatch = input.match(/make\s+(?:a\s+)?(?:an\s+)?(\w+(?:-\w+)*)/i);
        const upgradeMatch = input.match(/upgrade\s+(\w+(?:-\w+)*)/i);
        
        if (createMatch) projectName = createMatch[1] + '-app';
        else if (buildMatch) projectName = buildMatch[1] + '-app';
        else if (makeMatch) projectName = makeMatch[1] + '-app';
        else if (upgradeMatch) projectName = upgradeMatch[1];
        
        // Parse files using simple parser
        const files = parseFilesFromResponse(reply, projectName);
        
        if (files.length > 0) {
          console.log(`\n${pc.cyan('━'.repeat(60))}`);
          console.log(`${pc.cyan(`📁 Creating: ${projectName}`)}`);
          console.log(`${pc.cyan('━'.repeat(60))}\n`);
          
          const created: string[] = [];
          const failed: string[] = [];
          
          // Batch create files in parallel
          await Promise.all(files.map(async (file) => {
            try {
              await executeTool('write_file', { file_path: file.path, content: file.content });
              created.push(file.path);
              console.log(`${pc.green('✓')} ${file.path}`);
            } catch (err: any) {
              failed.push(file.path);
              console.log(`${pc.red('✗')} ${file.path}: ${err.message}`);
            }
          }));
          
          console.log(`\n${pc.cyan('━'.repeat(60))}`);
          console.log(`${pc.green(`✅ Created ${created.length} file(s)`)}`);
          if (failed.length > 0) {
            console.log(`${pc.red(`❌ Failed ${failed.length} file(s)`)}`);
          }
          console.log(`${pc.cyan('━'.repeat(60))}\n`);
          
          actionsPerformed = true;
        }
        
        // Execute bash commands from response
        if (reply.includes('```bash') || reply.includes('```shell') || reply.includes('```sh')) {
          console.log(`\n${pc.cyan('━'.repeat(60))}`);
          console.log(`${pc.cyan('🔧 Executing commands...')}`);
          console.log(`${pc.cyan('━'.repeat(60))}\n`);
          
          const executed = await executeBashCommands(reply);
          
          if (executed.length > 0) {
            console.log(`\n${pc.green(`✅ Executed ${executed.length} command(s)`)}`);
            actionsPerformed = true;
          }
        }
      }
      
      // Only show AI response if no actions were performed
      if (reply && !actionsPerformed) {
        console.log(`\n${pc.green('Vibe:')} ${reply}\n`);
      }
      
      // Store response for later use
      lastResponse = reply;
      messages.push({ role: 'assistant', content: reply });
      
      // Execute tool calls
      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          const tool = tools.find(t => t.name === call.function.name);
          if (!tool) continue;
          
          const args = JSON.parse(call.function.arguments);
          logger.info(`🔧 ${tool.displayName}: ${JSON.stringify(args).substring(0, 100)}...`);
          
          // Auto-approve or ask for confirmation
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
            try {
              const result = await executeTool(call.function.name, args);
              logger.success(`✓ ${tool.displayName} completed`);
              
              // Add tool result to conversation
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify(result)
              });
            } catch (err: any) {
              logger.error(`✗ ${tool.displayName}: ${err.message}`);
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: `Error: ${err.message}`
              });
            }
          }
        }
        
        // Get AI's next response after tool execution
        if (toolCalls.length > 0) {
          const followUp = ora('Processing results...').start();
          try {
            const nextResponse = await client.chat(messages, currentModel, {
              temperature: 0.7,
              maxTokens: 4000,
              tools: toolSchemas
            });
            followUp.stop();
            
            const nextReply = nextResponse.choices?.[0]?.message?.content || '';
            if (nextReply) {
              console.log(`\n${pc.green('Vibe:')} ${nextReply}\n`);
              messages.push({ role: 'assistant', content: nextReply });
            }
          } catch (err: any) {
            followUp.stop();
            logger.error(`Follow-up error: ${err.message}`);
          }
        }
      }
    } catch (error: any) {
      spinner.stop();
      logger.error(`API Error: ${error.message}`);
    }
  }
}
