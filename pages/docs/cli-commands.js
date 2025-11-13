export default function CLICommands() {
  const cmds = [
    'help','models','model','system','clear','save [name]','search <q>','docs <page>','run <cmd>','open <glob>','files','write <path>','edit <path>','append <path>','move <src> <dst>','delete <path|glob>','multiline','exit'
  ];
  return (
    <main className="container">
      <h1>CLI commands</h1>
      <ul>{cmds.map(c => (<li key={c}><code>{c}</code></li>))}</ul>
    </main>
  );
}
