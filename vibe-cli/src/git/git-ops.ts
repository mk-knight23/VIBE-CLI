// Git Operations Suite
import simpleGit, { SimpleGit } from 'simple-git';
import { ApiClient } from '../core/api';

export class GitOps {
  private git: SimpleGit;
  private client?: ApiClient;
  private model?: string;

  constructor(client?: ApiClient, model?: string) {
    this.git = simpleGit();
    this.client = client;
    this.model = model;
  }

  async smartCommit(message?: string): Promise<string> {
    const status = await this.git.status();
    
    if (status.files.length === 0) {
      return 'No changes to commit';
    }

    // Generate AI commit message if not provided
    if (!message && this.client && this.model) {
      message = await this.generateCommitMessage(status.files);
    }

    await this.git.add('.');
    await this.git.commit(message || 'Update files');
    
    return `Committed: ${message}`;
  }

  private async generateCommitMessage(files: any[]): Promise<string> {
    if (!this.client || !this.model) return 'Update files';

    const fileList = files.map(f => `${f.path} (${f.working_dir})`).join('\n');
    const prompt = `Generate a conventional commit message for these changes:\n${fileList}`;

    try {
      const response = await this.client.chat([
        { role: 'user', content: prompt }
      ], this.model, { maxTokens: 100 });

      return response.choices?.[0]?.message?.content?.trim() || 'Update files';
    } catch {
      return 'Update files';
    }
  }

  async createPR(title?: string, description?: string): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    
    if (!title && this.client && this.model) {
      const commits = await this.git.log({ maxCount: 10 });
      const commitArray = Array.from(commits.all);
      title = await this.generatePRTitle(commitArray);
      description = await this.generatePRDescription(commitArray);
    }

    return `PR: ${title}\n\n${description}\n\nBranch: ${branch}`;
  }

  private async generatePRTitle(commits: any[]): Promise<string> {
    if (!this.client || !this.model) return 'Update';

    const commitMsgs = Array.from(commits).map((c: any) => c.message).join('\n');
    const prompt = `Generate a PR title for these commits:\n${commitMsgs}`;

    try {
      const response = await this.client.chat([
        { role: 'user', content: prompt }
      ], this.model, { maxTokens: 50 });

      return response.choices?.[0]?.message?.content?.trim() || 'Update';
    } catch {
      return 'Update';
    }
  }

  private async generatePRDescription(commits: any[]): Promise<string> {
    if (!this.client || !this.model) return 'Changes made';

    const commitMsgs = Array.from(commits).map((c: any) => c.message).join('\n');
    const prompt = `Generate a PR description for these commits:\n${commitMsgs}`;

    try {
      const response = await this.client.chat([
        { role: 'user', content: prompt }
      ], this.model, { maxTokens: 200 });

      return response.choices?.[0]?.message?.content?.trim() || 'Changes made';
    } catch {
      return 'Changes made';
    }
  }

  async branch(name: string, checkout: boolean = true): Promise<string> {
    await this.git.checkoutLocalBranch(name);
    return `Created branch: ${name}`;
  }

  async merge(branch: string): Promise<string> {
    try {
      await this.git.merge([branch]);
      return `Merged ${branch}`;
    } catch (err: any) {
      return `Merge conflict: ${err.message}`;
    }
  }

  async resolveConflicts(): Promise<string> {
    const status = await this.git.status();
    const conflicts = status.conflicted;

    if (conflicts.length === 0) {
      return 'No conflicts';
    }

    return `Conflicts in: ${conflicts.join(', ')}`;
  }

  async sync(): Promise<string> {
    await this.git.pull();
    await this.git.push();
    return 'Synced with remote';
  }

  async status(): Promise<any> {
    return await this.git.status();
  }

  async diff(file?: string): Promise<string> {
    return await this.git.diff(file ? [file] : []);
  }

  async log(count: number = 10): Promise<any> {
    return await this.git.log({ maxCount: count });
  }
}
