#!/usr/bin/env node
/**
 * Robust Next.js dev launcher to permanently avoid stale lock + port conflicts.
 *
 * Behavior:
 * 1. Determines a free port starting from process.env.PORT || 3000, incrementing until available.
 * 2. (Optional) Kills any stale "next dev" processes that could hold .next/dev/lock (unless --no-kill passed).
 * 3. Removes the .next/dev/lock file safely if present.
 * 4. Spawns "next dev -p <port>" and pipes stdio.
 * 5. Gracefully shuts down on SIGINT/SIGTERM, forwarding signals to child.
 *
 * Usage:
 *   npm run dev
 *   PORT=3050 npm run dev
 *   npm run dev -- --no-kill   (skip killing other processes)
 *
 * This does NOT add new app features; it only stabilizes local development startup.
 */

const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const skipKill = args.includes('--no-kill');

const projectRoot = process.cwd();
const lockFile = path.join(projectRoot, '.next', 'dev', 'lock');

function log(msg) {
  process.stdout.write(`[dev-port] ${msg}\n`);
}

function isPortInUse(port) {
  try {
    // lsof returns 0 exit code if something uses the port.
    execSync(`lsof -i :${port} -sTCP:LISTEN -P -n`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findFreePort(start) {
  let port = start;
  const maxTries = 100;
  for (let i = 0; i < maxTries; i++) {
    if (!isPortInUse(port)) return port;
    port++;
  }
  throw new Error(`No free port found after ${maxTries} attempts starting at ${start}`);
}

function killStaleProcesses() {
  if (skipKill) {
    log('Skipping stale process cleanup (--no-kill provided).');
    return;
  }
  try {
    // List processes with command matching next dev
    const psOut = execSync(`ps aux | grep 'next dev' | grep -v grep || true`).toString();
    const lines = psOut.split('\n').filter(l => l.trim().length);
    if (!lines.length) {
      log('No stale next dev processes found.');
      return;
    }
    const pids = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[1];
      if (pid && /^\d+$/.test(pid)) pids.push(pid);
    }
    if (pids.length) {
      log(`Killing stale next dev processes: ${pids.join(', ')}`);
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore if already gone
        }
      }
    }
  } catch (err) {
    log(`Process cleanup encountered an error (continuing): ${err.message}`);
  }
}

function removeLockFile() {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      log('Removed stale .next/dev/lock');
    } else {
      log('No lock file detected.');
    }
  } catch (err) {
    log(`Failed to remove lock file (continuing): ${err.message}`);
  }
}

function main() {
  const basePort = parseInt(process.env.PORT, 10) || 3000;
  killStaleProcesses();
  removeLockFile();
  const port = findFreePort(basePort);
  log(`Launching Next.js dev on port ${port}`);
  log(`(Set PORT env var to choose a different starting port. Use --no-kill to skip cleanup.)`);

  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', String(port)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) }
  });

  function handleExit(signal) {
    log(`Received ${signal}, forwarding to child and exiting.`);
    try {
      child.kill(signal);
    } catch {}
  }

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      log(`Next dev exited due to signal: ${signal}`);
    } else {
      log(`Next dev exited with code: ${code}`);
    }
    process.exit(code === null ? 0 : code);
  });

  child.on('error', (err) => {
    log(`Failed to start next dev: ${err.message}`);
    process.exit(1);
  });
}

main();