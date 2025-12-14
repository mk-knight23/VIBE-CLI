#!/usr/bin/env node

// VIBE Ecosystem Version Synchronizer
const fs = require('fs');
const path = require('path');

const VERSIONS = {
  cli: '9.0.0',
  extension: '5.0.0', 
  web: '2.0.0'
};

function updatePackageJson(filePath, version) {
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated ${filePath} to v${version}`);
}

function syncVersions() {
  console.log('🔄 Syncing VIBE ecosystem versions...');
  
  // Update CLI
  updatePackageJson('vibe-cli/package.json', VERSIONS.cli);
  
  // Update Extension
  updatePackageJson('vibe-code/package.json', VERSIONS.extension);
  
  // Update Web
  updatePackageJson('vibe-web/package.json', VERSIONS.web);
  
  // Update compatibility matrix
  const compatibility = JSON.parse(fs.readFileSync('ecosystem-compatibility.json', 'utf8'));
  compatibility.vibe_ecosystem.current_versions = VERSIONS;
  fs.writeFileSync('ecosystem-compatibility.json', JSON.stringify(compatibility, null, 2) + '\n');
  
  console.log('✅ All versions synchronized');
}

syncVersions();
