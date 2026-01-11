#!/usr/bin/env node

/**
 * VIBE CLI v13 - Production Entry Point
 */

// Load environment variables
require('dotenv').config();

// Attempt to run the compiled source
try {
  const { run } = require('../dist/cli/main');
  run().catch(err => {
    console.error('❌ Fatal Error:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error('❌ Error: VIBE CLI has not been built yet. Please run "npm run build" first.');
  } else {
    console.error('❌ Error loading VIBE CLI:', err.message);
  }
  process.exit(1);
}
