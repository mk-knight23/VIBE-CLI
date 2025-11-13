import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';

export default function Chat() {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('z-ai/glm-4.5-air:free');
  const [system, setSystem] = useState('You are an assistant software engineer with broad knowledge. Provide clear, accurate, and practical guidance.');
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/models');
        const j = await r.json();
        if (Array.isArray(j.models)) {
          setModels(j.models);
          // Ensure default exists, else pick first
          const ids = j.models.map(m => m.id || m.slug || m.name);
          if (!ids.includes(model) && ids.length) setModel(ids[0]);
        } else if (j.error) {
          setError(j.error);
        }
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  const choices = useMemo(() => (models || []).map(m => ({ id: m.id || m.slug || m.name, name: m.name || m.id })), [models]);

  async function send() {
    if (!input.trim()) return;
    setBusy(true);
    setError('');
    const next = [...msgs];
    if (!next.length) next.push({ role: 'system', content: system });
    next.push({ role: 'user', content: input });
    setMsgs(next);
    setInput('');

    try {
      if (!stream) {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: next }),
        });
        const j = await r.json();
        const content = j?.completion?.choices?.[0]?.message?.content || j?.error || '(no content)';
        setMsgs(prev => [...prev, { role: 'assistant', content }]);
      } else {
        // streaming
        setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);
        const res = await fetch('/api/chat?stream=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: next }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          if (chunk.value) {
            const text = decoder.decode(chunk.value);
            setMsgs(prev => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last && last.role === 'assistant') last.content += text;
              return arr;
            });
          }
        }
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Vibe Chat (OpenRouter Free)</h1>
      <p>This web UI chats via server-side API routes using your server OPENROUTER_API_KEY. Only free models are listed.</p>

      {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
        <label>
          Model:
          <select value={model} onChange={e => setModel(e.target.value)} style={{ marginLeft: 8 }}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          System prompt:
          <textarea value={system} onChange={e => setSystem(e.target.value)} rows={3} style={{ width: '100%' }} />
        </label>
      </section>

      <section style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 6, background: '#fafafa' }}>
        {msgs.length === 0 ? <p style={{ color: '#666' }}>No messages yet. Start the conversation below.</p> : null}
        {msgs.map((m, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <strong>{m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'System'}:</strong>
            <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? marked.parse(m.content || '') : (m.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;') }} />
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={stream} onChange={e => setStream(e.target.checked)} />
          Stream
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
          }}
        />
        <button onClick={send} disabled={busy} style={{ padding: '8px 16px' }}>
          {busy ? 'Sending...' : 'Send'}
        </button>
      </section>
    </main>
  );
}
