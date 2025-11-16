/**
 * Shim wrapper for TypeScript authoritative implementation.
 * Prefers compiled artifact generated via: npm run build:cli
 * Falls back to legacy inline JS implementation if build not yet run.
 */
const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, 'dist', 'apikey.js');
let __distLoaded = false;
try {
  if (fs.existsSync(distFile)) {
    // Attempt to use compiled TS output (CommonJS expected). If Node mis-classifies as ESM, catch and fallback.
    module.exports = require(distFile);
    __distLoaded = true;
  }
} catch (e) {
  // Swallow and fallback (ESM vs CJS mismatch or other load error)
}
if (!__distLoaded) {
  // Fallback legacy inline implementation (kept temporarily to avoid breakage before build)
  const inquirer = require('inquirer');
  const inquirerModule = inquirer.default || inquirer;
  const pc = require('picocolors');

  let globalApiKey = null;
  let apiKeyPrompted = false;

  function loadConfig() {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const file = path.join(home, '.vibe', 'config.json');
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
  }

  function saveConfig(cfg) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const dir = path.join(home, '.vibe');
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
    const file = path.join(dir, 'config.json');
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf8');
  }

  async function getApiKey() {
    if (globalApiKey) return globalApiKey;

    // Prefer environment variable first
    const envKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    if (envKey) {
      globalApiKey = String(envKey).trim();
      return globalApiKey;
    }

    // Config file fallback
    const cfg = loadConfig();
    if (cfg?.openrouter?.apiKey) {
      globalApiKey = cfg.openrouter.apiKey;
      return globalApiKey;
    }

    // Detect non-interactive / broken terminal (VSCode sometimes sets TERM=dumb)
    const NON_TTY = !process.stdout.isTTY || !process.stdin.isTTY || process.env.TERM === 'dumb';

    if (!apiKeyPrompted) {
      apiKeyPrompted = true;

      if (NON_TTY) {
        // Non-interactive environment: do NOT attempt inquirer prompt (would hang).
        // Provide clear instructions and fail fast.
        const cfg2 = loadConfig();
        if (cfg2?.openrouter?.apiKey) {
          globalApiKey = cfg2.openrouter.apiKey;
          return globalApiKey;
        }
        const msg = 'Interactive prompt unavailable (TERM=' + (process.env.TERM || '') + '). Set OPENROUTER_API_KEY env var or add {"openrouter":{"apiKey":"..."} } to ~/.vibe/config.json';
        throw new Error(msg);
      }

      try {
        const { apiKey } = await inquirerModule.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your OpenRouter API key (will be cached for this session):',
            mask: '*',
            validate: (v) => (v && v.trim().length > 0) || 'API key is required',
          },
        ]);

        globalApiKey = (apiKey || '').trim();

        const { saveToConfig } = await inquirerModule.prompt([
          {
            type: 'confirm',
            name: 'saveToConfig',
            message: 'Save API key to config for future use?',
            default: false,
          },
        ]);

        if (saveToConfig) {
          cfg.openrouter = cfg.openrouter || {};
          cfg.openrouter.apiKey = globalApiKey;
          saveConfig(cfg);
          console.log(pc.green('✓ API key saved to config'));
        }

        console.log(pc.green('✓ API key cached for this session'));
        return globalApiKey;
      } catch (error) {
        throw new Error('Failed to get API key: ' + error.message);
      }
    }

    throw new Error('API key is required. Please set OPENROUTER_API_KEY environment variable or configure it.');
  }

  function clearApiKey() {
    globalApiKey = null;
    apiKeyPrompted = false;
  }

  function hasApiKey() {
    return !!globalApiKey ||
      !!process.env.OPENROUTER_API_KEY ||
      !!process.env.OPENROUTER_KEY ||
      !!loadConfig()?.openrouter?.apiKey;
  }

  function getApiKeyStatus() {
    return {
      hasKey: hasApiKey(),
      isCached: !!globalApiKey,
      fromEnv: !!(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY),
      fromConfig: !!loadConfig()?.openrouter?.apiKey,
      wasPrompted: apiKeyPrompted
    };
  }

  module.exports = {
    getApiKey,
    clearApiKey,
    hasApiKey,
    getApiKeyStatus,
    loadConfig,
    saveConfig
  };
}