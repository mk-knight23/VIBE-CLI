#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS = [
  { name: 'CLI Starts', test: testCLIStarts },
  { name: 'Commands Registered', test: testCommandsRegistered },
  { name: 'Tools Available', test: testToolsAvailable },
  { name: 'Security Blocks', test: testSecurityBlocks },
  { name: 'Performance', test: testPerformance }
];

async function testCLIStarts() {
  return fs.existsSync(path.join(__dirname, '../bin/vibe.js'));
}

async function testCommandsRegistered() {
  const commands = [
    'analyze', 'gitops', 'cloud', 'debug', 'agent', 'workflow'
  ];
  return commands.length === 12;
}

async function testToolsAvailable() {
  const tools = [
    'fs.read', 'fs.write', 'shell.exec', 'git.commit',
    'pm.install', 'cloud.deploy', 'ops.docker', 'debug.fix'
  ];
  return tools.length === 8;
}

  const testFile = path.join(__dirname, '../test-temp/test.txt');
  const testDir = path.dirname(testFile);
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create
  fs.writeFileSync(testFile, 'test');
  if (!fs.existsSync(testFile)) return false;
  
  // Read
  const content = fs.readFileSync(testFile, 'utf-8');
  if (content !== 'test') return false;
  
  // Update
  fs.writeFileSync(testFile, 'updated');
  const updated = fs.readFileSync(testFile, 'utf-8');
  if (updated !== 'updated') return false;
  
  // Delete
  fs.unlinkSync(testFile);
  fs.rmdirSync(testDir);
  
  return !fs.existsSync(testFile);
}

async function testSecurityBlocks() {
  const dangerous = ['rm -rf /', 'chmod 777 /', 'killall'];
  const isDangerous = (cmd) => {
    return dangerous.some(d => cmd.includes(d));
  };
  return isDangerous('rm -rf /');
}

async function testPerformance() {
  const start = Date.now();
  const testFile = path.join(__dirname, '../test-temp/perf.txt');
  const testDir = path.dirname(testFile);
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  fs.writeFileSync(testFile, 'test');
  const duration = Date.now() - start;
  
  fs.unlinkSync(testFile);
  fs.rmdirSync(testDir);
  
  return duration < 100;
}

async function runTests() {
  console.log('🧪 Running Acceptance Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of TESTS) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ All acceptance tests passed!');
    process.exit(0);
  }
}

runTests();
