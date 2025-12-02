import { VM } from 'vm2';
import fs from 'fs';
import { emitToken, emitComplete, emitError } from '../utils/ndjson';

export async function handleRuntimeCommand(args: string[], opts: any): Promise<void> {
  const [op, file] = args;

  if (op === 'preview') {
    const code = fs.readFileSync(file, 'utf8');
    if (opts.json) emitComplete('ok', { code, timeout: opts.timeout || 5000 });
    else console.log(code);
    return;
  }

  if (op === 'run') {
    const code = fs.readFileSync(file, 'utf8');
    const vm = new VM({
      timeout: opts.timeout || 5000,
      sandbox: {
        console: {
          log: (...args: any[]) => {
            const msg = args.join(' ');
            if (opts.json) emitToken(msg);
            else console.log(msg);
          }
        }
      }
    });

    try {
      vm.run(code);
      if (opts.json) emitComplete('ok', { exitCode: 0 });
    } catch (error: any) {
      if (opts.json) emitError(error.message);
      else console.error(error.message);
    }
  }
}
