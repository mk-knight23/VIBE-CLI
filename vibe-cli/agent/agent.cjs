// Agentic reasoning loop and utilities (migrated copy)
/* Transitional imports: updated after folder rename (vibe-cli).
   Use relative intra-package paths (../code, ../edit) instead of legacy ../../cli/... */
const { chatCompletion, getModelDefaults, detectTaskType } = require('../core/index.cjs');
const { generateCode, generateFunction, saveCodeToFile } = require('../code/codegen.cjs');
const { editFiles } = require('../edit/multiedit.cjs');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { spawn, exec } = require('child_process');
const pc = require('picocolors');
const simpleGit = require('simple-git');

function sessionDir() {
  const dir = path.join(process.cwd(), '.vibe', 'sessions');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function saveSession(name, data) {
  const file = path.join(sessionDir(), `${name || 'latest'}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

function loadLatestSession() {
  const file = path.join(sessionDir(), 'latest.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

async function plan(task) {
  const sys = { role: 'system', content: 'You are a senior Node.js CLI engineer and AI agent. Output a numbered action plan and rationale. Be concise.' };
  const user = { role: 'user', content: `Create a step-by-step plan for: ${task}` };
  const { defaultModel } = getModelDefaults();
  const res = await chatCompletion({ model: defaultModel, messages: [sys, user], thinking: true });
  return res.message?.content || '';
}

async function fix(repoSummary) {
  const sys = { role: 'system', content: 'You are a code repair agent. Propose minimal diffs and commands to fix failing tests or errors. Use patch format.' };
  const user = { role: 'user', content: repoSummary || 'Analyze the repository and propose fixes.' };
  const { defaultModel } = getModelDefaults();
  const res = await chatCompletion({ model: defaultModel, messages: [sys, user], thinking: true });
  return res.message?.content || '';
}

function startWatcher(paths = ['src/', 'tests/'], onEvent) {
  const watcher = chokidar.watch(paths, { ignoreInitial: true });
  watcher.on('all', (ev, p) => onEvent?.(ev, p));
  return watcher;
}

// Break down complex tasks into steps
async function breakDownTask(task) {
  const systemPrompt = `You are an expert project manager and software engineer. Break down the following task into specific, actionable steps. Each step should be:
 1. Clear and specific
 2. Executable by an AI agent
 3. Include the type of operation (file, shell, git, etc.)
 4. Ordered logically

 Format your response as a numbered list of steps.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Break down this task into actionable steps: ${task}` }
  ];

  try {
    const response = await chatCompletion({
      taskType: 'agent',
      prompt: `Break down task: ${task}`,
      messages,
      temperature: 0.2
    });

    return {
      steps: response.message?.content || '',
      model: response.model
    };
  } catch (error) {
    throw new Error(`Failed to break down task: ${error.message}`);
  }
}

// Parse steps from breakdown
function parseSteps(stepsText) {
  const lines = stepsText.split('\n');
  const steps = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      steps.push({
        description: match[1].trim(),
        completed: false,
        result: null
      });
    }
  }

  return steps;
}

// Execute file operations
async function executeFileOperation(operation, auto = false) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;

  // Parse operation type and parameters
  const opMatch = operation.match(/^(read|write|modify|create|delete)\s+(.+)$/i);
  if (!opMatch) {
    throw new Error(`Invalid file operation: ${operation}`);
  }

  const [, opType, target] = opMatch;
  const filePath = target.trim();

  switch (opType.toLowerCase()) {
    case 'read':
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content, filePath };

    case 'write':
    case 'create':
      if (!auto) {
        const { confirm } = await inquirerModule.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Write to file: ${filePath}?`,
            default: false
          }
        ]);
        if (!confirm) {
          return { success: false, message: 'Cancelled by user' };
        }
      }

      // Generate content for the file
      const prompt = `Create content for file: ${filePath}`;
      const result = await generateCode(prompt, { filePath });
      
      await saveCodeToFile(result.code, filePath);
      return { success: true, filePath, content: result.code };

    case 'modify':
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      if (!auto) {
        const { confirm } = await inquirerModule.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Modify file: ${filePath}?`,
            default: false
          }
        ]);
        if (!confirm) {
          return { success: false, message: 'Cancelled by user' };
        }
      }

      // Use multi-file editing for single file
      const editResult = await editFiles(`Modify this file: ${operation}`, filePath, {
        interactive: !auto,
        backup: true
      });

      return editResult;

    case 'delete':
      if (!auto) {
        const { confirm } = await inquirerModule.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Delete file: ${filePath}?`,
            default: false
          }
        ]);
        if (!confirm) {
          return { success: false, message: 'Cancelled by user' };
        }
      }

      fs.unlinkSync(filePath);
      return { success: true, filePath, deleted: true };

    default:
      throw new Error(`Unsupported file operation: ${opType}`);
  }
}

// Execute shell commands
async function executeShellCommand(command, auto = false) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;

  if (!auto) {
    const { confirm } = await inquirerModule.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Execute shell command: ${command}?`,
        default: false
      }
    ]);
    if (!confirm) {
      return { success: false, message: 'Cancelled by user' };
    }
  }

  return new Promise((resolve, reject) => {
    console.log(pc.cyan(`Executing: ${command}`));
    
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
            error: error.message,
          stderr,
          stdout
        });
      } else {
        resolve({
          success: true,
          stdout: stdout || stderr || '(no output)',
          stderr
        });
      }
    });
  });
}

// Execute git operations
async function executeGitOperation(operation, auto = false) {
  const git = simpleGit();
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;

  const opMatch = operation.match(/^(add|commit|push|pull|status|log|diff)\s*(.*)$/i);
  if (!opMatch) {
    throw new Error(`Invalid git operation: ${operation}`);
  }

  const [, opType, target] = opMatch;

  try {
    switch (opType.toLowerCase()) {
      case 'add':
        const files = target.trim() || '.';
        if (!auto) {
          const { confirm } = await inquirerModule.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Git add: ${files}?`,
              default: false
            }
          ]);
          if (!confirm) {
            return { success: false, message: 'Cancelled by user' };
          }
        }
        await git.add(files);
        return { success: true, operation: `git add ${files}` };

      case 'commit':
        const message = target.trim() || 'chore: changes via Vibe CLI agent';
        if (!auto) {
          const { confirm } = await inquirerModule.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Git commit with message: "${message}"?`,
              default: false
            }
          ]);
          if (!confirm) {
            return { success: false, message: 'Cancelled by user' };
          }
        }
        await git.commit(message);
        return { success: true, operation: `git commit -m "${message}"` };

      case 'status':
        const status = await git.status();
        return { success: true, operation: 'git status', status };

      case 'push':
        if (!auto) {
          const { confirm } = await inquirerModule.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Git push changes?',
              default: false
            }
          ]);
          if (!confirm) {
            return { success: false, message: 'Cancelled by user' };
          }
        }
        await git.push();
        return { success: true, operation: 'git push' };

      case 'pull':
        if (!auto) {
          const { confirm } = await inquirerModule.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Git pull changes?',
              default: false
            }
          ]);
          if (!confirm) {
            return { success: false, message: 'Cancelled by user' };
          }
        }
        await git.pull();
        return { success: true, operation: 'git pull' };

      default:
        throw new Error(`Unsupported git operation: ${opType}`);
    }
  } catch (error) {
    return { success: false, error: error.message, operation };
  }
}

// Enhanced autonomous agent execution
async function runAutonomousAgent(task, options = {}) {
  const { auto = false, maxSteps = 10 } = options;
  
  console.log(pc.cyan(`\n=== Autonomous Agent Mode ===`));
  console.log(pc.gray(`Task: ${task}`));
  console.log(pc.gray(`Auto mode: ${auto ? 'ON' : 'OFF (permission prompts)'}\n`));

  try {
    // Break down task into steps
    console.log(pc.cyan('Breaking down task into steps...'));
    const breakdown = await breakDownTask(task);
    const steps = parseSteps(breakdown.steps);
    
    console.log(pc.green(`Generated ${steps.length} steps using model: ${breakdown.model}`));
    
    // Execute steps
    let completedSteps = 0;
    const results = [];
    
    for (let i = 0; i < Math.min(steps.length, maxSteps); i++) {
      const step = steps[i];
      console.log(pc.cyan(`\nStep ${i + 1}/${steps.length}: ${step.description}`));
      
      try {
        let result;
        
        // Determine operation type
        if (step.description.toLowerCase().includes('file') ||
            step.description.toLowerCase().includes('read') ||
            step.description.toLowerCase().includes('write') ||
            step.description.toLowerCase().includes('create') ||
            step.description.toLowerCase().includes('modify') ||
            step.description.toLowerCase().includes('delete')) {
          result = await executeFileOperation(step.description, auto);
        } else if (step.description.toLowerCase().includes('git')) {
          result = await executeGitOperation(step.description, auto);
        } else if (step.description.toLowerCase().includes('run') ||
                   step.description.toLowerCase().includes('execute') ||
                   step.description.toLowerCase().includes('command') ||
                   step.description.toLowerCase().includes('shell')) {
          result = await executeShellCommand(step.description, auto);
        } else {
          // Default to shell command
          result = await executeShellCommand(step.description, auto);
        }
        
        step.completed = result.success;
        step.result = result;
        results.push(result);
        
        if (result.success) {
          console.log(pc.green(`✓ Completed: ${step.description}`));
          completedSteps++;
        } else {
          console.log(pc.red(`✗ Failed: ${step.description}`));
          console.log(pc.yellow(`  Error: ${result.message || result.error}`));
          
          // Ask if user wants to continue on failure
          if (!auto) {
            const inquirer = require('inquirer');
            const inquirerModule = inquirer.default || inquirer;
            const { cont } = await inquirerModule.prompt([
              {
                type: 'confirm',
                name: 'cont',
                message: 'Continue with next step?',
                default: true
              }
            ]);
            if (!cont) break;
          }
        }
        
      } catch (error) {
        console.log(pc.red(`✗ Error in step: ${error.message}`));
        step.result = { success: false, error: error.message };
        results.push(step.result);
      }
    }
    
    // Summary
    console.log(pc.cyan(`\n=== Agent Execution Summary ===`));
    console.log(pc.green(`Completed: ${completedSteps}/${steps.length} steps`));
    
    if (completedSteps === steps.length) {
      console.log(pc.green('🎉 Task completed successfully!'));
    } else {
      console.log(pc.yellow('⚠️  Task completed with some failures'));
    }
    
    return {
      success: completedSteps === steps.length,
      completedSteps,
      totalSteps: steps.length,
      results,
      steps
    };
    
  } catch (error) {
    console.error(pc.red('Agent execution failed:'), error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Legacy autonomous function for backward compatibility
async function runAutonomous({ yolo = false } = {}) {
  const git = simpleGit();
  console.log(pc.cyan('Planning changes...'));
  const planText = await plan('Run tests, identify failures, and propose minimal diffs to fix.');
  console.log(planText);
  if (!yolo) {
    const inquirer = require('inquirer');
    const { cont } = await inquirer.prompt([{ type:'confirm', name:'cont', message:'Proceed with attempted fixes?', default:false }]);
    if (!cont) return { status:'aborted' };
  }
  // Attempt to run tests
  console.log(pc.cyan('Running tests...'));
  const hasNpmTest = !!(require('../../package.json')?.scripts?.test);
  const testCmd = hasNpmTest ? ['npm',['test']] : ['node',['-e','console.log("No test script; skipping")']];
  const { spawnSync } = require('child_process');
  const r = spawnSync(testCmd[0], testCmd[1], { stdio: 'inherit' });
  // Commit whatever has changed (if any)
  try {
    await git.add('./*');
    const st = await git.status();
    if (st.staged.length) {
      await git.commit('chore: autonomous run via Vibe CLI');
      console.log(pc.green('Committed autonomous changes.'));
    } else {
      console.log(pc.gray('No changes to commit.'));
    }
  } catch (e) {
    console.log(pc.yellow('Git commit skipped: ' + (e.message||e)));
  }
  return { status:'done', testExitCode: r.status };
}

module.exports = {
  saveSession,
  loadLatestSession,
  plan,
  fix,
  startWatcher,
  runAutonomous,
  runAutonomousAgent,
  breakDownTask,
  parseSteps,
  executeFileOperation,
  executeShellCommand,
  executeGitOperation
};