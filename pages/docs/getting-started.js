export default function GettingStarted() {
  return (
    <main className="container">
      <h1>Getting started</h1>
      <h2>Install</h2>
      <pre>curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash</pre>
      <pre>npm i -g github:mk-knight23/vibe-cli</pre>
      <h2>API key</h2>
      <pre>export OPENROUTER_API_KEY="sk-or-..."</pre>
      <h2>Run</h2>
      <pre>vibe</pre>
    </main>
  );
}
