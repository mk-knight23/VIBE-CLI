import { exec } from 'child_process';
import { promisify } from 'util';
import pc from 'picocolors';

const execAsync = promisify(exec);

export async function executeBashCommands(response: string): Promise<string[]> {
  const executed: string[] = [];
  const bashBlocks = response.matchAll(/```(?:bash|shell|sh)\s*\n([\s\S]*?)```/g);
  
  const allCommands: string[] = [];
  for (const block of bashBlocks) {
    const commands = block[1].trim().split('\n')
      .map(c => c.trim())
      .filter(c => c && !c.startsWith('#') && !isDangerous(c));
    allCommands.push(...commands);
  }
  
  if (allCommands.length === 0) return [];
  
  // Batch execute commands in parallel (max 5 at a time)
  const batchSize = 5;
  for (let i = 0; i < allCommands.length; i += batchSize) {
    const batch = allCommands.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (command) => {
      try {
        console.log(`${pc.cyan('$ ')}${command}`);
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          timeout: 60000
        });
        
        if (stdout) console.log(pc.gray(stdout.trim()));
        if (stderr) console.log(pc.yellow(stderr.trim()));
        
        executed.push(command);
      } catch (error: any) {
        console.log(`${pc.red('✗')} ${error.message}`);
      }
    }));
  }
  
  return executed;
}

function isDangerous(command: string): boolean {
  const dangerous = [
    'rm -rf /',
    'rm -rf *',
    'rm -rf ~',
    'del /s',
    'format',
    'mkfs',
    'dd if=',
    'chmod 777',
    'killall'
  ];
  
  return dangerous.some(d => command.toLowerCase().includes(d.toLowerCase()));
}
