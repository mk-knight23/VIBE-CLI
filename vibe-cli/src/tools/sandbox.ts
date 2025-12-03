import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export type SandboxType = 'docker' | 'podman' | 'sandbox-exec' | false;

interface SandboxConfig {
  enabled: boolean;
  type: SandboxType;
  profile?: string;
  flags?: string;
  setUidGid?: boolean;
}

const DEFAULT_SEATBELT_PROFILE = 'permissive-open';

export function getSandboxConfig(): SandboxConfig {
  const envSandbox = process.env.VIBE_SANDBOX;
  const envProfile = process.env.SEATBELT_PROFILE || DEFAULT_SEATBELT_PROFILE;
  const envFlags = process.env.SANDBOX_FLAGS || '';
  const envUidGid = process.env.SANDBOX_SET_UID_GID;

  let type: SandboxType = false;
  let enabled = false;

  if (envSandbox === 'true') {
    enabled = true;
    type = process.platform === 'darwin' ? 'sandbox-exec' : 'docker';
  } else if (envSandbox === 'docker' || envSandbox === 'podman' || envSandbox === 'sandbox-exec') {
    enabled = true;
    type = envSandbox;
  }

  return {
    enabled,
    type,
    profile: envProfile,
    flags: envFlags,
    setUidGid: envUidGid === 'true'
  };
}

export async function executeSandboxed(command: string, workDir: string): Promise<{ stdout: string; stderr: string }> {
  const config = getSandboxConfig();

  if (!config.enabled || !config.type) {
    return execAsync(command, { cwd: workDir, env: { ...process.env, VIBE_CLI: '1' } });
  }

  switch (config.type) {
    case 'sandbox-exec':
      return executeMacOSSandbox(command, workDir, config);
    case 'docker':
    case 'podman':
      return executeContainerSandbox(command, workDir, config);
    default:
      return execAsync(command, { cwd: workDir, env: { ...process.env, VIBE_CLI: '1' } });
  }
}

async function executeMacOSSandbox(command: string, workDir: string, config: SandboxConfig): Promise<{ stdout: string; stderr: string }> {
  const profilePath = path.join(__dirname, '../../sandbox-profiles', `${config.profile}.sb`);
  
  if (!fs.existsSync(profilePath)) {
    const defaultProfile = `(version 1)
(allow default)
(deny file-write* (subpath "/"))
(allow file-write* (subpath "${workDir}"))`;
    
    const profileDir = path.dirname(profilePath);
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(profilePath, defaultProfile);
  }

  const sandboxCmd = `sandbox-exec -f "${profilePath}" sh -c '${command.replace(/'/g, "'\\''")}'`;
  return execAsync(sandboxCmd, { cwd: workDir, env: { ...process.env, VIBE_CLI: '1', SANDBOX: 'true' } });
}

async function executeContainerSandbox(command: string, workDir: string, config: SandboxConfig): Promise<{ stdout: string; stderr: string }> {
  const containerCmd = config.type === 'podman' ? 'podman' : 'docker';
  const imageName = 'vibe-cli-sandbox:latest';

  // Check if image exists, create if not
  try {
    await execAsync(`${containerCmd} image inspect ${imageName}`);
  } catch {
    await buildSandboxImage(containerCmd);
  }

  const flags = config.flags || '';
  const uidGid = config.setUidGid && process.platform === 'linux' && process.getuid && process.getgid
    ? `--user ${process.getuid()}:${process.getgid()}` 
    : '';

  const containerCommand = `${containerCmd} run --rm ${flags} ${uidGid} -v "${workDir}:/workspace" -w /workspace -e VIBE_CLI=1 -e SANDBOX=true ${imageName} sh -c '${command.replace(/'/g, "'\\''")}'`;

  return execAsync(containerCommand);
}

async function buildSandboxImage(containerCmd: string): Promise<void> {
  const dockerfile = `FROM node:18-alpine
RUN apk add --no-cache bash git curl
WORKDIR /workspace
ENV VIBE_CLI=1
ENV SANDBOX=true`;

  const dockerfilePath = path.join(process.cwd(), '.vibe', 'Dockerfile.sandbox');
  const dir = path.dirname(dockerfilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(dockerfilePath, dockerfile);

  await execAsync(`${containerCmd} build -t vibe-cli-sandbox:latest -f "${dockerfilePath}" "${dir}"`);
}

export function isSandboxEnabled(): boolean {
  return getSandboxConfig().enabled;
}

export function getSandboxInfo(): string {
  const config = getSandboxConfig();
  if (!config.enabled) return 'Sandbox: Disabled';
  
  return `Sandbox: ${config.type}${config.profile ? ` (${config.profile})` : ''}`;
}
