import os from 'os';

export type OSType = 'windows' | 'macos' | 'linux' | 'unknown';

export function detectOS(): OSType {
  const platform = os.platform();
  
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  
  return 'unknown';
}

export function getShellCommand(command: string): string {
  const osType = detectOS();
  
  // Convert common commands to OS-specific versions
  const conversions: Record<string, Record<OSType, string>> = {
    'ls': {
      windows: 'dir',
      macos: 'ls -la',
      linux: 'ls -la',
      unknown: 'ls'
    },
    'rm': {
      windows: 'del',
      macos: 'rm',
      linux: 'rm',
      unknown: 'rm'
    },
    'mkdir': {
      windows: 'mkdir',
      macos: 'mkdir -p',
      linux: 'mkdir -p',
      unknown: 'mkdir'
    },
    'copy': {
      windows: 'copy',
      macos: 'cp',
      linux: 'cp',
      unknown: 'cp'
    },
    'move': {
      windows: 'move',
      macos: 'mv',
      linux: 'mv',
      unknown: 'mv'
    }
  };
  
  const baseCmd = command.split(' ')[0];
  if (conversions[baseCmd]) {
    return command.replace(baseCmd, conversions[baseCmd][osType]);
  }
  
  return command;
}

export function isDestructiveCommand(command: string): boolean {
  const dangerous = [
    'rm -rf /',
    'del /s /q',
    'format',
    'chmod 777',
    'kill -9',
    'sudo rm',
    'rmdir /s',
    'deltree'
  ];
  
  return dangerous.some(d => command.toLowerCase().includes(d));
}

export function getOSInfo() {
  return {
    type: detectOS(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir()
  };
}
