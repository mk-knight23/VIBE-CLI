#!/usr/bin/env node
const axios = require('axios');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL_ID = 'z-ai/glm-4.5-air:free';

(async () => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('Set OPENROUTER_API_KEY');
    const messages = [
      { role: 'system', content: 'You are an assistant software engineer.' },
      { role: 'user', content: 'In one short sentence, say hello from the smoke test.' },
    ];
    const res = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      { model: DEFAULT_MODEL_ID, messages },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'vibe-cli' }, timeout: 30000 }
    );
    const content = res.data?.choices?.[0]?.message?.content || '';
    console.log(String(content).slice(0, 200));
  } catch (e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    console.error('Smoke test error:', status || '', data || e.message || e);
    process.exit(1);
  }
})();
