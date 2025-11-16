#!/usr/bin/env node
/* Vibe Code CLI v2 command router */
/* Updated: migrated OpenRouter/core config requires to consolidated cli/core barrel */
const { chatCompletion, getModelDefaults, loadConfig, saveConfig, encodeImageToDataUrl, listTopFreeModels, TOP_FREE_MODELS } = require('../core/index.cjs');
/* migrated agent module path */
const { plan, fix, saveSession, loadLatestSession, startWatcher, runAutonomousAgent } = require('../agent/agent.cjs');
const { generateCode, generateFunction, saveCodeToFile, detectLanguage, interactiveCompletion, generateCompletion } = require('../code/codegen.cjs');
const { editFiles } = require('../edit/multiedit.cjs');
const { interactiveRefactor, quickRefactor, REFACTOR_TYPES } = require('../refactor/refactor.cjs');
const { interactiveDebug, quickDebug, debugFromStdin } = require('../debug/debug.cjs');
const { interactiveTestGeneration, quickTestGeneration, generateTestsForPattern, detectTestFramework } = require('../test/testgen.cjs');
const { smartCommit, createPR, reviewChanges, smartStatus, interactiveGitWorkflow } = require('../git/gittools.cjs');
const path = require('path');
const fs = require('fs');
const pc = require('picocolors');
const simpleGit = require('simple-git');

function printUsage() {
  console.log(`Vibe Code CLI v2\nCommands:\n  vibe generate <prompt> [--lang <language>] [--save <file>]\n  vibe complete <file> [--line <n>]\n  vibe refactor <pattern> [--type <optimization|clean|security>]\n  vibe edit <glob-pattern>\n  vibe agent <task> [--auto]\n  vibe debug <error-message|file>\n  vibe test <file> [--framework <auto|jest|mocha|vitest>]\n  vibe review\n  vibe git <review|commit|pr>\n  vibe plan "task"\n  vibe fix\n  vibe run [--yolo]\n  vibe model list | use <id>\n  vibe theme set <dark|light>\n  vibe cost\n  vibe resume\n  vibe view <image>\n  vibe commit\n  vibe explain  (reads stdin: git status | vibe explain)\n  vibe agent start [--watch <paths>]\n  vibe plugin install <name>\n  vibe tui  (preview)\n  vibe chat`);
}

async function main(argv) {
  const cmd = argv[2];
  const args = argv.slice(3);
  const cfg = loadConfig();
  if (!cfg.openrouter) cfg.openrouter = { defaultModel: 'z-ai/glm-4.5-air:free', topFreeModels: TOP_FREE_MODELS };
  if (!cfg.core) cfg.core = { theme: 'dark', autonomous: false, rateLimitBackoff: 5000 };

  switch (cmd) {
    case 'generate': {
      const prompt = args.join(' ').trim().replace(/^"|"$/g, '');
      if (!prompt) return console.log('Usage: vibe generate <prompt> [--lang <language>] [--save <file>]');
      
      // Parse options
      const langIdx = args.indexOf('--lang');
      const saveIdx = args.indexOf('--save');
      const language = langIdx >= 0 ? args[langIdx + 1] : null;
      const saveFile = saveIdx >= 0 ? args[saveIdx + 1] : null;
      
      console.log(pc.cyan('Generating code...'));
      
      try {
        const result = await generateCode(prompt, { language });
        
        console.log(pc.green(`Generated ${result.language} code using model: ${result.model}`));
        console.log('\n' + result.code);
        
        if (saveFile) {
          await saveCodeToFile(result.code, saveFile);
          console.log(pc.green(`\nCode saved to: ${saveFile}`));
        }
      } catch (error) {
        console.error(pc.red('Error generating code:'), error.message);
      }
      break;
    }
    case 'complete': {
      const filePath = args[0];
      if (!filePath) return console.log('Usage: vibe complete <file> [--line <n>] [--interactive]');
      
      // Parse options
      const lineIdx = args.indexOf('--line');
      const interactiveIdx = args.indexOf('--interactive');
      const line = lineIdx >= 0 ? parseInt(args[lineIdx + 1]) : null;
      const interactive = interactiveIdx >= 0;
      
      if (!fs.existsSync(filePath)) {
        console.error(pc.red(`File not found: ${filePath}`));
        break;
      }
      
      console.log(pc.cyan(`Analyzing ${filePath} for code completion...`));
      
      try {
        if (interactive) {
          await interactiveCompletion(filePath, { line });
        } else {
          const result = await generateCompletion(filePath, { line });
          
          console.log(pc.green(`Found ${result.suggestions.length} completion suggestions using model: ${result.model}`));
          
          result.suggestions.forEach((suggestion, index) => {
            console.log(`\n${pc.cyan(`Suggestion ${index + 1}:`)}`);
            console.log(suggestion);
          });
        }
      } catch (error) {
        console.error(pc.red('Error generating completion:'), error.message);
      }
      break;
    }
    case 'edit': {
      const globPattern = args[0];
      if (!globPattern) return console.log('Usage: vibe edit <glob-pattern> [--dry-run] [--no-backup] [--no-interactive]');
      
      // Parse options
      const dryRun = args.includes('--dry-run');
      const noBackup = args.includes('--no-backup');
      const noInteractive = args.includes('--no-interactive');
      
      // Get the prompt from remaining args
      const promptArgs = args.filter(arg =>
        arg !== globPattern &&
        arg !== '--dry-run' &&
        arg !== '--no-backup' &&
        arg !== '--no-interactive'
      );
      
      const prompt = promptArgs.join(' ').trim().replace(/^"|"$/g, '');
      
      if (!prompt) {
        console.error(pc.red('Error: Please provide a description of the changes to make.'));
        console.log(pc.cyan('Usage: vibe edit <glob-pattern> "description of changes" [options]'));
        break;
      }
      
      console.log(pc.cyan(`Editing files matching: ${globPattern}`));
      console.log(pc.gray(`Changes: ${prompt}`));
      
      try {
        const result = await editFiles(prompt, globPattern, {
          interactive: !noInteractive,
          dryRun,
          backup: !noBackup
        });
        
        if (result.success) {
          console.log(pc.green(`\nMulti-file editing completed successfully!`));
          if (result.successful > 0) {
            console.log(pc.green(`Updated ${result.successful} file(s)`));
          }
        } else {
          console.log(pc.yellow(`Multi-file editing completed: ${result.message}`));
        }
      } catch (error) {
        console.error(pc.red('Error during multi-file editing:'), error.message);
      }
      break;
    }
    case 'refactor': {
      const pattern = args[0];
      if (!pattern) return console.log('Usage: vibe refactor <pattern> [--type <optimization|clean|security|maintainability|modernization>] [--quick] [--prompt "custom prompt"]');
      
      // Parse options
      const typeIdx = args.indexOf('--type');
      const quickIdx = args.indexOf('--quick');
      const promptIdx = args.indexOf('--prompt');
      
      const refactorType = typeIdx >= 0 ? args[typeIdx + 1] : 'clean';
      const quick = quickIdx >= 0;
      const customPrompt = promptIdx >= 0 ? args.slice(promptIdx + 1).join(' ').replace(/^"|"$/g, '') : '';
      
      // Validate refactor type
      if (!REFACTOR_TYPES[refactorType]) {
        console.error(pc.red(`Invalid refactor type: ${refactorType}`));
        console.log(pc.cyan('Available types:'));
        Object.entries(REFACTOR_TYPES).forEach(([type, desc]) => {
          console.log(`  ${type}: ${desc}`);
        });
        break;
      }
      
      console.log(pc.cyan(`Refactoring files matching: ${pattern}`));
      console.log(pc.gray(`Type: ${refactorType} - ${REFACTOR_TYPES[refactorType]}`));
      
      try {
        let result;
        if (quick) {
          result = await quickRefactor(pattern, refactorType, customPrompt);
        } else {
          result = await interactiveRefactor(pattern, refactorType, {
            analyze: true,
            plan: true,
            execute: true
          });
        }
        
        if (result.success) {
          console.log(pc.green(`\nRefactoring completed successfully!`));
        } else {
          console.log(pc.yellow(`Refactoring completed: ${result.message}`));
        }
      } catch (error) {
        console.error(pc.red('Error during refactoring:'), error.message);
      }
      break;
    }
    case 'plan': {
      const task = args.join(' ').trim().replace(/^"|"$/g, '') || 'setup task';
      const out = await plan(task);
      console.log(out);
      saveSession('latest', { type: 'plan', task, out });
      break;
    }
    case 'fix': {
      const out = await fix('Analyze repo and propose diffs for failing tests.');
      console.log(out);
      saveSession('latest', { type: 'fix', out });
      break;
    }
    case 'run': {
      const yolo = args.includes('--yolo');
      const res = await require('../agent/agent.cjs').runAutonomous({ yolo });
      console.log(pc.gray(`Run status: ${res.status}`));
      break;
    }
    case 'model': {
      const sub = args[0];
      if (sub === 'list') {
        const { defaultModel, models } = listTopFreeModels();
        console.log('Default:', defaultModel);
        models.forEach((m,i)=>{
          const mark = m.id===defaultModel? '*':' ';
          const info = m.ctx? ` (${m.ctx.toLocaleString()} ctx)` : '';
          console.log(`${mark} ${i+1}. ${m.id}${info}${m.note? ' - '+m.note:''}`);
        });
      } else if (sub === 'use') {
        const id = args[1];
        if (!id) return console.log('Usage: vibe model use <modelId>');
        const { models } = listTopFreeModels();
        const valid = models.some(m=>m.id===id);
        if (!valid) {
          console.log('Invalid model. Use `vibe model list` to see allowed free models.');
          return;
        }
        cfg.openrouter.defaultModel = id;
        saveConfig(cfg);
        console.log(pc.green(`Default model set to ${id}`));
      } else {
        console.log('Usage: vibe model list | use <id>');
      }
      break;
    }
    case 'theme': {
      if (args[0] === 'set' && (args[1] === 'dark' || args[1] === 'light')) {
        cfg.core.theme = args[1];
        saveConfig(cfg);
        console.log(pc.green(`Theme set to ${args[1]}`));
      } else {
        console.log('Usage: vibe theme set <dark|light>');
      }
      break;
    }
    case 'cost': {
      const sess = loadLatestSession();
      console.log('Cost (free tier): model rotations tracked in sessions. Latest:', sess ? (sess.model || 'n/a') : 'n/a');
      break;
    }
    case 'resume': {
      const sess = loadLatestSession();
      if (!sess) return console.log('No session to resume');
      console.log('Resuming session:', sess.type);
      break;
    }
    case 'view': {
      const img = args[0];
      if (!img) return console.log('Usage: vibe view <image>');
      const url = encodeImageToDataUrl(img);
      const { defaultModel } = getModelDefaults();
      const messages = [
        { role: 'user', content: [ { type: 'text', text: 'Analyze this UI and suggest fixes.' }, { type: 'image_url', image_url: { url } } ] }
      ];
      chatCompletion({ model: 'google/gemini-2.0-flash-exp:free', messages }).then(r=>{
        console.log(r.message?.content || '');
      }).catch(e=>console.error(e.message));
      break;
    }
    case 'test': {
      const subCommand = args[0];
      
      if (subCommand === 'generate' || (subCommand && !subCommand.startsWith('-'))) {
        // Test generation mode
        const target = subCommand === 'generate' ? args[1] : subCommand;
        if (!target) return console.log('Usage: vibe test generate <file|pattern> [--framework <auto|jest|mocha|vitest>] [--coverage <basic|standard|comprehensive>] [--interactive]');
        
        // Parse options
        const frameworkIdx = args.indexOf('--framework');
        const coverageIdx = args.indexOf('--coverage');
        const interactiveIdx = args.indexOf('--interactive');
        const batchIdx = args.indexOf('--batch');
        
        const framework = frameworkIdx >= 0 ? args[frameworkIdx + 1] : 'auto';
        const coverage = coverageIdx >= 0 ? args[coverageIdx + 1] : 'comprehensive';
        const interactive = interactiveIdx >= 0;
        const batch = batchIdx >= 0;
        
        try {
          let result;
          
          if (batch || target.includes('*') || target.includes('{')) {
            // Batch generation for patterns
            result = await generateTestsForPattern(target, { framework, coverage });
          } else if (interactive) {
            // Interactive generation
            result = await interactiveTestGeneration(target, { framework, coverage });
          } else {
            // Quick generation
            result = await quickTestGeneration(target, { framework, coverage });
          }
          
          if (result.success) {
            console.log(pc.green(`\nTest generation completed successfully!`));
          } else {
            console.log(pc.yellow(`Test generation completed: ${result.message}`));
          }
          
          // Save session
          saveSession('latest', {
            type: 'test-generation',
            target,
            result,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(pc.red('Test generation failed:'), error.message);
        }
      } else if (!subCommand || subCommand === 'run') {
        // Original test runner functionality
        const pkg = (()=>{ try { return require('../package.json'); } catch { return {}; } })();
        const has = (bin) => require('fs').existsSync(require('path').join(process.cwd(), 'node_modules/.bin/', bin));
        const { spawn } = require('child_process');
        const run = (cmd, args) => new Promise((res)=>{ const p=spawn(cmd,args,{stdio:'inherit'}); p.on('close',c=>res(c)); });
        
        console.log(pc.cyan('Running tests...'));
        
        (async ()=>{
          if (has('jest') || (pkg.devDependencies && pkg.devDependencies.jest) || (pkg.dependencies && pkg.dependencies.jest)) {
            process.exitCode = await run('npx', ['-y','jest']);
          } else if (has('vitest') || (pkg.devDependencies && pkg.devDependencies.vitest)) {
            process.exitCode = await run('npx', ['-y','vitest','run']);
          } else if (has('mocha') || (pkg.devDependencies && pkg.devDependencies.mocha)) {
            process.exitCode = await run('npx', ['-y','mocha']);
          } else {
            console.log('No known JS test runner detected.');
            process.exitCode = 0;
          }
        })();
      } else {
        console.log('Usage: vibe test [generate <file|pattern>] [run]');
        console.log('       vibe test generate <file> [--framework <auto|jest|mocha|vitest>] [--coverage <basic|standard|comprehensive>] [--interactive]');
        console.log('       vibe test run');
      }
      break;
    }
    case 'explain': {
      // Pipe support: read from stdin if available
      const { stdin } = process;
      let data = '';
      if (!stdin.isTTY) {
        await new Promise((resolve) => {
          stdin.setEncoding('utf8');
          stdin.on('data', chunk => data += chunk);
          stdin.on('end', resolve);
        });
      }
      const text = data || args.join(' ');
      if (!text) return console.log('Usage: <input> | vibe explain OR vibe explain "text"');
      const messages = [ { role: 'user', content: 'Explain the following output succinctly and propose next steps:\n\n' + text } ];
      chatCompletion({ model: 'z-ai/glm-4.5-air:free', messages }).then(r=>{
        console.log(r.message?.content || '');
      }).catch(e=>console.error('Explain error:', e.message));
      break;
    }
    case 'commit': {
      const git = simpleGit();
      git.status().then(async (st) => {
        if (st.staged.length === 0 && st.modified.length === 0) {
          console.log('Nothing to commit');
          return;
        }
        await git.add('.');
        // Generate AI message from diff
        let diff = '';
        try { diff = await git.diff(['--staged']); } catch {}
        let msg = 'chore: update via Vibe CLI';
        try {
          const prompt = [
            { role: 'system', content: 'You are an expert software dev that writes concise, conventional commit messages.' },
            { role: 'user', content: `Write a one-line conventional commit message for these staged changes. No trailing period.\n\n${diff.slice(0, 4000)}` }
          ];
          const r = await chatCompletion({ model: 'kwaipilot/kat-coder-pro-v1:free', messages: prompt });
          msg = (r.message?.content || msg).split('\n')[0].trim();
        } catch (e) {}
        await git.commit(msg);
        console.log(pc.green('Committed: ' + msg));
      }).catch(e => console.error('Git error:', e.message));
      break;
    }
    case 'agent': {
      const subCommand = args[0];
      
      if (subCommand === 'start') {
        const watchIdx = args.indexOf('--watch');
        const paths = watchIdx >= 0 ? args[watchIdx+1].split(',') : (loadConfig()?.agents?.watch || ['src/','tests/']);
        console.log('Agent watching:', paths.join(', '));
        startWatcher(paths, (ev, p) => {
          console.log(pc.gray(`Changed [${ev}]: ${p} -> TODO lint/test/auto-fix`));
        });
      } else if (subCommand === 'run' || subCommand) {
        // Enhanced agent mode
        const task = subCommand === 'run' ? args.slice(1).join(' ').trim() : args.join(' ').trim();
        if (!task) return console.log('Usage: vibe agent <task> [--auto] [--max-steps <n>]');
        
        // Parse options
        const autoIdx = args.indexOf('--auto');
        const maxStepsIdx = args.indexOf('--max-steps');
        
        const auto = autoIdx >= 0;
        const maxSteps = maxStepsIdx >= 0 ? parseInt(args[maxStepsIdx + 1]) : 10;
        
        if (!task) {
          console.error(pc.red('Error: Please provide a task for the agent to execute.'));
          console.log(pc.cyan('Usage: vibe agent "task description" [--auto] [--max-steps <n>]'));
          break;
        }
        
        try {
          const result = await runAutonomousAgent(task, { auto, maxSteps });
          
          if (result.success) {
            console.log(pc.green(`\n🎉 Agent completed task successfully!`));
            console.log(pc.gray(`Completed ${result.completedSteps}/${result.totalSteps} steps`));
          } else {
            console.log(pc.yellow(`\n⚠️  Agent completed with issues`));
            console.log(pc.gray(`Completed ${result.completedSteps}/${result.totalSteps} steps`));
          }
          
          // Save session
          saveSession('latest', {
            type: 'agent',
            task,
            result,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(pc.red('Agent execution failed:'), error.message);
        }
      } else {
        console.log('Usage: vibe agent <task> [--auto] [--max-steps <n>]');
        console.log('       vibe agent start [--watch <paths>]');
      }
      break;
    }
    case 'debug': {
      const target = args[0];
      if (!target && process.stdin.isTTY) {
        return console.log('Usage: vibe debug <error-message|file> OR <input> | vibe debug');
      }
      
      // Parse options
      const interactive = args.includes('--interactive');
      const noContext = args.includes('--no-context');
      
      try {
        let result;
        
        if (!target && !process.stdin.isTTY) {
          // Read from stdin
          result = await debugFromStdin({ includeContext: !noContext });
        } else if (interactive) {
          // Interactive debugging
          result = await interactiveDebug(target, { includeContext: !noContext });
        } else {
          // Quick debug
          result = await quickDebug(target, { includeContext: !noContext });
        }
        
        // Save session
        saveSession('latest', {
          type: 'debug',
          target,
          result,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(pc.red('Debug analysis failed:'), error.message);
      }
      break;
    }
    case 'git': {
      const subCommand = args[0];
      
      if (!subCommand) {
        console.log('Usage: vibe git <commit|review|pr|status|workflow>');
        break;
      }
      
      try {
        switch (subCommand) {
          case 'commit': {
            const styleIdx = args.indexOf('--style');
            const dryRunIdx = args.indexOf('--dry-run');
            const messageIdx = args.indexOf('--message');
            
            const style = styleIdx >= 0 ? args[styleIdx + 1] : 'conventional';
            const dryRun = dryRunIdx >= 0;
            const customMessage = messageIdx >= 0 ? args.slice(messageIdx + 1).join(' ').replace(/^"|"$/g, '') : null;
            
            console.log(pc.cyan('Creating smart commit...'));
            const result = await smartCommit({
              addAll: true,
              style,
              customMessage,
              dryRun
            });
            
            if (result.success) {
              if (result.dryRun) {
                console.log(pc.cyan('\n=== Dry Run Commit ==='));
                console.log(pc.bold(`Message: ${result.message}`));
                console.log(pc.gray(`Preview of changes:\n${result.diff}`));
              } else {
                console.log(pc.green(`✓ Committed: ${result.message}`));
                console.log(pc.gray(`Files: ${result.files}, Model: ${result.model}`));
              }
            } else {
              console.log(pc.yellow(result.message));
            }
            break;
          }
          
          case 'review': {
            const stagedIdx = args.indexOf('--staged');
            const fileIdx = args.indexOf('--file');
            const focusIdx = args.indexOf('--focus');
            
            const staged = stagedIdx >= 0;
            const file = fileIdx >= 0 ? args[fileIdx + 1] : null;
            const focus = focusIdx >= 0 ? args[focusIdx + 1] : 'all';
            
            console.log(pc.cyan('Reviewing changes...'));
            const result = await reviewChanges({ staged, file, focus });
            
            if (result.success) {
              console.log(pc.green(`✓ Review completed using model: ${result.model}`));
            } else {
              console.log(pc.yellow(result.message));
            }
            break;
          }
          
          case 'pr': {
            const dryRunIdx = args.indexOf('--dry-run');
            const titleIdx = args.indexOf('--title');
            const baseIdx = args.indexOf('--base');
            const diffsIdx = args.indexOf('--include-diffs');
            
            const dryRun = dryRunIdx >= 0;
            const title = titleIdx >= 0 ? args.slice(titleIdx + 1).join(' ').replace(/^"|"$/g, '') : null;
            const base = baseIdx >= 0 ? args[baseIdx + 1] : 'main';
            const includeDiffs = diffsIdx >= 0;
            
            console.log(pc.cyan('Creating pull request description...'));
            const result = await createPR({
              title,
              base,
              includeDiffs,
              dryRun
            });
            
            if (result.success) {
              console.log(pc.green(`✓ PR content generated using model: ${result.model}`));
              console.log(pc.cyan(`\n=== Pull Request ===`));
              console.log(pc.bold(`Title: ${result.title}`));
              console.log(result.description);
              
              if (result.note) {
                console.log(pc.yellow(`\nNote: ${result.note}`));
              }
            } else {
              console.log(pc.yellow(result.message));
            }
            break;
          }
          
          case 'status': {
            const insightsIdx = args.indexOf('--insights');
            const includeInsights = insightsIdx >= 0;
            
            console.log(pc.cyan('Getting smart status...'));
            const result = await smartStatus({ includeSuggestions: includeInsights });
            
            console.log(pc.green(`\n=== Git Status ===`));
            console.log(`Branch: ${result.branch}`);
            console.log(`Modified: ${result.modified.length} file(s)`);
            console.log(`Staged: ${result.staged.length} file(s)`);
            console.log(`Untracked: ${result.untracked.length} file(s)`);
            
            if (result.insights) {
              console.log(pc.cyan('\n=== AI Insights ==='));
              console.log(result.insights);
            }
            break;
          }
          
          case 'workflow': {
            console.log(pc.cyan('Starting interactive git workflow...'));
            const result = await interactiveGitWorkflow();
            
            if (result.success) {
              console.log(pc.green(`✓ Workflow completed: ${result.action}`));
            }
            break;
          }
          
          default:
            console.log('Usage: vibe git <commit|review|pr|status|workflow>');
            break;
        }
      } catch (error) {
        console.error(pc.red('Git operation failed:'), error.message);
      }
      break;
    }
    case 'review': {
      const target = args[0];
      if (!target) return console.log('Usage: vibe review <file|pattern|git> [--focus <security|performance|quality|all>] [--output <console|file>]');
      
      // Parse options
      const focusIdx = args.indexOf('--focus');
      const outputIdx = args.indexOf('--output');
      const gitIdx = args.indexOf('--git');
      
      const focus = focusIdx >= 0 ? args[focusIdx + 1] : 'all';
      const output = outputIdx >= 0 ? args[outputIdx + 1] : 'console';
      const gitReview = gitIdx >= 0 || target === 'git';
      
      try {
        let result;
        
        if (gitReview) {
          // Review git changes
          console.log(pc.cyan('Reviewing git changes...'));
          result = await reviewChanges({ focus, output });
        } else if (target.includes('*') || target.includes('{')) {
          // Review multiple files (pattern)
          const fg = require('fast-glob');
          const files = await fg(target, { onlyFiles: true });
          
          if (files.length === 0) {
            console.log(pc.yellow('No files found matching the pattern.'));
            break;
          }
          
          console.log(pc.cyan(`Reviewing ${files.length} file(s)...`));
          
          // For now, just review the first file (could be enhanced to batch review)
          result = await reviewChanges({ file: files[0], focus, output });
          
          if (files.length > 1) {
            console.log(pc.yellow(`Note: Reviewed first file only. Batch review coming soon!`));
          }
        } else {
          // Review single file
          if (!fs.existsSync(target)) {
            console.error(pc.red(`File not found: ${target}`));
            break;
          }
          
          console.log(pc.cyan(`Reviewing file: ${target}`));
          result = await reviewChanges({ file: target, focus, output });
        }
        
        if (result.success) {
          console.log(pc.green(`\n✓ Code review completed using model: ${result.model}`));
          
          // Save session
          saveSession('latest', {
            type: 'code-review',
            target,
            result,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(pc.yellow(result.message));
        }
        
      } catch (error) {
        console.error(pc.red('Code review failed:'), error.message);
      }
      break;
    }
    case 'plugin': {
      if (args[0] === 'install') {
        const name = args[1];
        if (!name) return console.log('Usage: vibe plugin install <name>');
        const dir = path.join(process.cwd(), 'plugins');
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const file = path.join(dir, `${name}.js`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, `module.exports = async function ${name}(input){\n  // TODO: implement plugin\n  return input;\n};\n`, 'utf8');
        console.log(pc.green(`Installed plugin: ${file}`));
      } else {
        console.log('Usage: vibe plugin install <name>');
      }
      break;
    }
    case 'config': {
      const sub = args[0];
      const keyPath = args[1];
      const value = args[2];
      const cfgRef = cfg;
      const getByPath = (obj, p) => p.split('.').reduce((o,k)=> (o||{})[k], obj);
      const setByPath = (obj, p, val) => { const ks=p.split('.'); let cur=obj; ks.forEach((k,i)=>{ if(i===ks.length-1){ cur[k]=val; } else { cur[k]=cur[k]||{}; cur=cur[k]; } }); };
      if (sub === 'get') {
        if (!keyPath) return console.log('Usage: vibe config get <path>');
        console.log(getByPath(cfgRef, keyPath));
      } else if (sub === 'set') {
        if (!keyPath) return console.log('Usage: vibe config set <path> <value>');
        setByPath(cfgRef, keyPath, value);
        saveConfig(cfgRef);
        console.log(pc.green(`Set ${keyPath}`));
      } else {
        console.log('Usage: vibe config get|set <path> [value]');
      }
      break;
    }
    case 'chat': {
      const text = args.join(' ').trim();
      const { defaultModel } = getModelDefaults();
      if (text) {
        const messages = [ { role: 'user', content: text } ];
        chatCompletion({ model: defaultModel, messages }).then(r=>{
          console.log(r.message?.content || '');
        }).catch(e=>console.error('Chat error:', e.message));
      } else {
        console.log('Tip: pass a message, e.g., vibe chat "Hello"');
      }
      break;
    }
    default:
      printUsage();
      break;
  }
}

main(process.argv).catch(e=>{ console.error(e); process.exit(1); });
