#!/usr/bin/env node

import { startInteractive } from './interactive';
import { ApiClient } from '../core/api';

const VERSION = '7.0.0';
const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎨 VIBE v7.0.0                                         ║
║   AI-Powered Development Platform                        ║
║                                                           ║
║   🔥 Made by KAZI                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main() {
  const args = process.argv.slice(2);

  // Show version
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`VIBE v${VERSION}`);
    process.exit(0);
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(BANNER);
    console.log(`
Usage: vibe [options]

Options:
  -v, --version     Show version
  -h, --help        Show help
  
Commands:
  vibe              Start interactive mode
  
Examples:
  vibe              Start VIBE CLI
  vibe --version    Show version
  vibe --help       Show this help
    `);
    process.exit(0);
  }

  // Start interactive mode
  console.log(BANNER);
  console.log('Type /help for available commands\n');
  
  try {
    const client = new ApiClient();
    await startInteractive(client);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
