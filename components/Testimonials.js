export default function Testimonials() {
  const quotes = [
    { q: 'I ship PRs faster without leaving my shell.', a: 'Lena Ortiz, Staff Engineer' },
    { q: 'Great dev UX. It feels native to my terminal.', a: 'Vikram Shah, Senior Developer' },
    { q: 'OpenRouter flexibility fits our team.', a: 'Mia Chang, Engineering Manager' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <h2 className="text-2xl md:text-3xl font-bold">What developers say</h2>
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {quotes.map((t, idx) => (
          <div key={idx} className="p-5 rounded-lg border border-gray-800 bg-black/20">
            <p className="text-lg">“{t.q}”</p>
            <p className="mt-3 text-sm text-gray-400">— {t.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
