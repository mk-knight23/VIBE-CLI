#!/usr/bin/env node

import { program } from './commands';
import { logger } from '../utils/logger';

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error: any) {
    logger.error(error.message || 'An unexpected error occurred');
    process.exit(1);
  }
}

main();
