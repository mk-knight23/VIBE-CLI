/**
 * Shim wrapper for TypeScript authoritative implementation.
 * Prefers compiled artifact generated via: npm run build:cli
 * Falls back to legacy inline JS implementation if build not yet run.
 */
const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, 'dist', 'apikey.js');

if (!fs.existsSync(distFile)) {
  throw new Error('TypeScript build not found. Run `npm run build` in vibe-cli/ to generate dist/apikey.js');
}

module.exports = require(distFile);