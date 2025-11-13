export default function Integrations() {
  const items = ['VS Code sidebar (planned)', 'JetBrains plugin (planned)', 'Plain terminal (bash, zsh, fish)', 'iTerm2/Windows Terminal', 'Git/GitHub integration'];
  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <h2 className="text-2xl md:text-3xl font-bold">Integrations</h2>
      <ul className="mt-6 grid md:grid-cols-2 gap-2 list-disc list-inside text-gray-300">
        {items.map(i => (<li key={i}>{i}</li>))}
      </ul>
    </section>
  );
}
