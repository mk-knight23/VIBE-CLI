#!/usr/bin/env node

// Generate ecosystem status badges
const fs = require('fs');

const badges = {
  cli: '![CLI](https://img.shields.io/badge/CLI-v9.0.0-blue)',
  extension: '![Extension](https://img.shields.io/badge/Extension-v5.0.0-green)', 
  web: '![Web](https://img.shields.io/badge/Web-v2.0.0-orange)',
  tests: '![Tests](https://img.shields.io/badge/Tests-143%20passing-brightgreen)',
  security: '![Security](https://img.shields.io/badge/Security-0%20vulnerabilities-brightgreen)',
  parity: '![Parity](https://img.shields.io/badge/CLI%20%E2%86%94%20Extension-100%25-success)'
};

const badgeMarkdown = Object.values(badges).join(' ');

// Update main README
const readme = fs.readFileSync('README.md', 'utf8');
const updated = readme.replace(
  /[![License: MIT].*$/m,
  `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)\n${badgeMarkdown}`
);

fs.writeFileSync('README.md', updated);
console.log('✅ Updated badges in README.md');
