// Git integration utilities
const { chatCompletion } = require('../core');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

// Initialize git instance
function getGitInstance(basePath = process.cwd()) {
  return simpleGit({ baseDir: basePath });
}

// Generate AI-powered commit message
async function generateCommitMessage(diff, options = {}) {
  const { model = null, style = 'conventional' } = options;
  
  const systemPrompt = `You are an expert software developer specializing in writing ${style} commit messages. Analyze the provided git diff and generate a concise, descriptive commit message.

For conventional commits, use the format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
Keep the message under 50 characters for the subject line.`;

  const userPrompt = `Generate a ${style} commit message for these changes:\n\n${diff.slice(0, 4000)}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'git-analysis',
      prompt: userPrompt,
      model,
      messages,
      temperature: 0.2
    });
    
    return {
      message: response.message?.content || '',
      model: response.model,
      style
    };
  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

// Generate pull request description
async function generatePRDescription(diff, options = {}) {
  const { model = null, includeDiffs = false } = options;
  
  const systemPrompt = `You are an expert software developer. Analyze the provided git diff and generate a comprehensive pull request description that includes:

1. Clear title summarizing the changes
2. Detailed description of what was changed
3. Why these changes are necessary
4. Any breaking changes or migration notes
5. Testing recommendations
6. Additional context for reviewers

Format the response in markdown with appropriate sections.`;

  let userPrompt = `Generate a pull request description for these changes:\n\n`;
  
  if (includeDiffs) {
    userPrompt += diff.slice(0, 6000);
  } else {
    // Just include file changes summary
    const lines = diff.split('\n');
    const fileChanges = lines.filter(line => line.startsWith('diff --git'));
    userPrompt += fileChanges.join('\n');
  }
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'git-analysis',
      prompt: userPrompt,
      model,
      messages,
      temperature: 0.3
    });
    
    return {
      description: response.message?.content || '',
      model: response.model
    };
  } catch (error) {
    throw new Error(`Failed to generate PR description: ${error.message}`);
  }
}

// Analyze code changes for review
async function analyzeChangesForReview(diff, options = {}) {
  const { model = null, focus = 'all' } = options;
  
  const systemPrompt = `You are an expert code reviewer. Analyze the provided git diff and provide a comprehensive code review that includes:

1. Security vulnerabilities or concerns
2. Performance implications
3. Code quality and maintainability issues
4. Bug risks or logic errors
5. Best practices violations
6. Suggestions for improvements
7. Positive feedback on good practices

Be constructive and specific in your feedback. Format the review clearly with sections.`;
  
  const userPrompt = `Review these code changes:\n\n${diff.slice(0, 8000)}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await chatCompletion({
      taskType: 'code-review',
      prompt: userPrompt,
      model,
      messages,
      temperature: 0.2
    });
    
    return {
      review: response.message?.content || '',
      model: response.model,
      focus
    };
  } catch (error) {
    throw new Error(`Failed to analyze changes for review: ${error.message}`);
  }
}

// Smart commit with AI-generated message
async function smartCommit(options = {}) {
  const { 
    addAll = true, 
    style = 'conventional', 
    customMessage = null,
    dryRun = false 
  } = options;
  
  const git = getGitInstance();
  
  try {
    // Check git status
    const status = await git.status();
    
    if (status.staged.length === 0 && status.modified.length === 0) {
      return { success: false, message: 'No changes to commit' };
    }
    
    // Stage changes if requested
    if (addAll && status.modified.length > 0) {
      await git.add('.');
    }
    
    // Get staged diff
    const diff = await git.diff(['--staged']);
    
    if (!diff) {
      return { success: false, message: 'No staged changes to commit' };
    }
    
    // Generate commit message
    let commitMessage;
    if (customMessage) {
      commitMessage = { message: customMessage };
    } else {
      console.log(pc.cyan('Generating commit message...'));
      commitMessage = await generateCommitMessage(diff, { style });
    }
    
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: commitMessage.message,
        diff: diff.slice(0, 1000) + '...'
      };
    }
    
    // Commit with generated message
    await git.commit(commitMessage.message);
    
    return {
      success: true,
      message: commitMessage.message,
      model: commitMessage.model,
      files: status.staged.length
    };
    
  } catch (error) {
    throw new Error(`Smart commit failed: ${error.message}`);
  }
}

// Create pull request with AI-generated description
async function createPR(options = {}) {
  const { 
    title = null, 
    base = 'main', 
    head = 'HEAD',
    includeDiffs = false,
    dryRun = false 
  } = options;
  
  const git = getGitInstance();
  
  try {
    // Get current branch
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;
    
    // Get diff between branches
    const diff = await git.diff([`${base}...${currentBranch}`]);
    
    if (!diff) {
      return { success: false, message: 'No differences between branches' };
    }
    
    // Generate PR description
    console.log(pc.cyan('Generating pull request description...'));
    const prDesc = await generatePRDescription(diff, { includeDiffs });
    
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        title: title || `PR: ${currentBranch} → ${base}`,
        description: prDesc.description,
        branch: currentBranch
      };
    }
    
    // Note: Actual PR creation would require GitHub/GitLab API integration
    // For now, we'll return the generated content
    return {
      success: true,
      title: title || `PR: ${currentBranch} → ${base}`,
      description: prDesc.description,
      branch: currentBranch,
      base,
      note: 'Manual PR creation required - use generated content above'
    };
    
  } catch (error) {
    throw new Error(`PR creation failed: ${error.message}`);
  }
}

// Review current changes
async function reviewChanges(options = {}) {
  const { 
    focus = 'all', 
    staged = false, 
    file = null,
    output = 'console' 
  } = options;
  
  const git = getGitInstance();
  
  try {
    let diff;
    
    if (file) {
      // Review specific file
      diff = await git.diff([staged ? '--staged' : '--', file]);
    } else if (staged) {
      // Review staged changes
      diff = await git.diff(['--staged']);
    } else {
      // Review all changes
      diff = await git.diff();
    }
    
    if (!diff) {
      return { success: false, message: 'No changes to review' };
    }
    
    console.log(pc.cyan('Analyzing changes for review...'));
    const review = await analyzeChangesForReview(diff, { focus });
    
    if (output === 'console') {
      console.log(pc.green('\n=== Code Review ==='));
      console.log(review.review);
    }
    
    return {
      success: true,
      review: review.review,
      focus,
      model: review.model
    };
    
  } catch (error) {
    throw new Error(`Code review failed: ${error.message}`);
  }
}

// Git status with AI insights
async function smartStatus(options = {}) {
  const { model = null, includeSuggestions = true } = options;
  
  const git = getGitInstance();
  
  try {
    const status = await git.status();
    
    let insights = '';
    
    if (includeSuggestions && (status.modified.length > 0 || status.staged.length > 0)) {
      // Get diff for insights
      const diff = await git.diff();
      
      const systemPrompt = `You are a git expert. Analyze the git status and provide insights about:
1. What type of work is in progress
2. Suggested next steps
3. Potential issues or risks
4. Branching recommendations

Be concise and actionable.`;
      
      const userPrompt = `Git status analysis:\n\nModified: ${status.modified.join(', ')}\nStaged: ${status.staged.join(', ')}\nUntracked: ${status.not_added?.join(', ') || 'None'}\n\nRecent changes:\n${diff.slice(0, 2000)}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const response = await chatCompletion({
        taskType: 'git-analysis',
        prompt: userPrompt,
        model,
        messages,
        temperature: 0.3
      });
      
      insights = response.message?.content || '';
    }
    
    return {
      status,
      insights,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified,
      staged: status.staged,
      untracked: status.not_added || []
    };
    
  } catch (error) {
    throw new Error(`Smart status failed: ${error.message}`);
  }
}

// Interactive git workflow
async function interactiveGitWorkflow(options = {}) {
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  
  console.log(pc.cyan('\n=== Interactive Git Workflow ===\n'));
  
  // Get current status
  const statusResult = await smartStatus({ includeSuggestions: true });
  
  console.log(pc.green('Current Status:'));
  console.log(`  Branch: ${statusResult.branch}`);
  console.log(`  Modified: ${statusResult.modified.length} file(s)`);
  console.log(`  Staged: ${statusResult.staged.length} file(s)`);
  console.log(`  Untracked: ${statusResult.untracked.length} file(s)`);
  
  if (statusResult.insights) {
    console.log(pc.cyan('\nAI Insights:'));
    console.log(statusResult.insights);
  }
  
  // Ask what to do
  const { action } = await inquirerModule.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Smart commit (AI-generated message)', value: 'commit' },
        { name: 'Review changes', value: 'review' },
        { name: 'Create pull request description', value: 'pr' },
        { name: 'Stage all changes', value: 'stage' },
        { name: 'Show detailed status', value: 'status' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);
  
  switch (action) {
    case 'commit':
      const commitResult = await smartCommit();
      if (commitResult.success) {
        console.log(pc.green(`✓ Committed: ${commitResult.message}`));
      }
      break;
      
    case 'review':
      const reviewResult = await reviewChanges();
      if (reviewResult.success) {
        console.log(pc.green('✓ Review completed'));
      }
      break;
      
    case 'pr':
      const prResult = await createPR({ dryRun: true });
      if (prResult.success) {
        console.log(pc.cyan('\n=== Pull Request Content ==='));
        console.log(pc.bold(`Title: ${prResult.title}`));
        console.log(prResult.description);
      }
      break;
      
    case 'stage':
      const gitInstance = getGitInstance();
      await gitInstance.add('.');
      console.log(pc.green('✓ All changes staged'));
      break;
      
    case 'status':
      const gitStatusInstance = getGitInstance();
      const detailedStatus = await gitStatusInstance.status();
      console.log(JSON.stringify(detailedStatus, null, 2));
      break;
      
    case 'exit':
      console.log(pc.gray('Exiting git workflow.'));
      break;
  }
  
  return {
    action,
    success: true
  };
}

module.exports = {
  getGitInstance,
  generateCommitMessage,
  generatePRDescription,
  analyzeChangesForReview,
  smartCommit,
  createPR,
  reviewChanges,
  smartStatus,
  interactiveGitWorkflow
};