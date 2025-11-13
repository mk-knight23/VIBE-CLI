export default function FAQ() {
  const items = [
    { q: 'Do I need a server?', a: 'No. CLI Vibe runs locally in your terminal; no backend required.' },
    { q: 'How does it use OpenRouter?', a: 'You supply your OpenRouter API key; CLI Vibe calls free/open models available via OpenRouter.' },
    { q: 'Will it change my files automatically?', a: 'No. It always asks for permission. You approve edits before they’re written.' },
    { q: 'Security stance?', a: 'Defensive-only. Refuses requests that could be used maliciously.' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <h2 className="text-2xl md:text-3xl font-bold">FAQ</h2>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {items.map((it, i) => (
          <div key={i} className="p-5 rounded-lg border border-gray-800 bg-black/20">
            <h3 className="font-semibold">{it.q}</h3>
            <p className="text-sm text-gray-300 mt-2">{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
