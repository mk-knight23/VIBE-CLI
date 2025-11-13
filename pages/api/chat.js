import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export default async function handler(req, res) {
  const isStream = req.method === 'POST' && (req.query?.stream === '1' || req.query?.stream === 'true');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: missing OPENROUTER_API_KEY' });
    const { model, messages } = req.body || {};
    if (!model || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid payload' });

    if (!isStream) {
      const r = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        { model, messages },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': req.headers['origin'] || 'http://localhost', 'X-Title': 'vibe-cli-web' }, timeout: 60000 }
      );
      return res.status(200).json({ completion: r.data });
    }

    // Streaming path
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const upstream = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      { model, messages, stream: true },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': req.headers['origin'] || 'http://localhost', 'X-Title': 'vibe-cli-web' }, responseType: 'stream', timeout: 0 }
    );

    upstream.data.on('data', (chunk) => {
      res.write(chunk);
    });
    upstream.data.on('end', () => {
      res.end();
    });
    upstream.data.on('error', (err) => {
      console.error('Upstream stream error', err?.message || err);
      try { res.end(); } catch {}
    });
  } catch (e) {
    const status = e?.response?.status || 500;
    const data = e?.response?.data || { error: e.message };
    console.error('Chat API error:', status, data);
    if (!res.headersSent) res.status(status).json(data); else try { res.end(); } catch {}
  }
}
