import fs from 'fs';
import { AuditLogger } from '../core/audit';
import { BackupManager } from '../core/backup';
import { emitComplete } from '../utils/ndjson';

export async function handleFsCommand(args: string[], opts: any): Promise<void> {
  const [op, ...params] = args;
  const audit = new AuditLogger();
  const backup = new BackupManager();

  switch (op) {
    case 'ls':
      const files = fs.readdirSync(params[0] || '.');
      if (opts.json) emitComplete('ok', { files });
      else files.forEach(f => console.log(f));
      audit.log({ op: 'fs.ls', path: params[0] || '.', dryRun: false });
      break;

    case 'read':
      const content = fs.readFileSync(params[0], 'utf8');
      if (opts.json) emitComplete('ok', { content });
      else console.log(content);
      audit.log({ op: 'fs.read', path: params[0], dryRun: false });
      break;

    case 'write':
      if (!opts.dryRun) {
        const backupPath = backup.createBackup(params[0]);
        fs.writeFileSync(params[0], params.slice(1).join(' '), 'utf8');
        audit.log({ op: 'fs.write', path: params[0], dryRun: false, backup: backupPath });
      }
      if (opts.json) emitComplete('ok', { dryRun: opts.dryRun });
      break;

    case 'mkdir':
      if (!opts.dryRun) {
        fs.mkdirSync(params[0], { recursive: true });
        audit.log({ op: 'fs.mkdir', path: params[0], dryRun: false });
      }
      if (opts.json) emitComplete('ok', { dryRun: opts.dryRun });
      break;

    case 'rm':
      if (!opts.dryRun) {
        const backupPath = backup.createBackup(params[0]);
        fs.rmSync(params[0], { recursive: true, force: true });
        audit.log({ op: 'fs.rm', path: params[0], dryRun: false, backup: backupPath });
      }
      if (opts.json) emitComplete('ok', { dryRun: opts.dryRun });
      break;

    default:
      throw new Error(`Unknown fs operation: ${op}`);
  }
}
