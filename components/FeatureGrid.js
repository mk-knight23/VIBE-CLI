const features = [
  { title: 'Terminal-first', desc: 'Compose, refactor, and review without leaving your shell.' },
  { title: 'Context injection', desc: 'Inject files, diffs, globs, command outputs, and docs snippets.' },
  { title: 'Safe file edits', desc: 'Create, edit, append, move, and delete with explicit confirmation.' },
  { title: 'Docs-aware', desc: 'Pull relevant OpenRouter docs snippets inline.' },
  { title: 'Defensive by design', desc: 'Focus on secure, defensive tasks; refusals for abuse patterns.' },
  { title: 'Git-native', desc: 'Generate commit messages, PR descriptions, and release notes.' },
];

export default function FeatureGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <h2 className="text-2xl md:text-3xl font-bold">Built for developers</h2>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="p-5 rounded-lg border border-gray-800 bg-black/20">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-gray-300 mt-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
