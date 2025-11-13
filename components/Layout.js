export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-ink text-gray-200">
      <header className="sticky top-0 z-20 backdrop-blur bg-ink/80 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/" className="font-bold tracking-tight">CLI Vibe</a>
          <nav className="ml-auto flex items-center gap-5 text-sm text-gray-300">
            <a href="/features" className="hover:text-white">Features</a>
            <a href="/pricing" className="hover:text-white">Pricing</a>
            <a href="/docs" className="hover:text-white">Docs</a>
            <a href="/changelog" className="hover:text-white">Changelog</a>
          </nav>
          <a href="https://github.com/mk-knight23/vibe-cli" className="text-sm bg-white text-black px-3 py-1.5 rounded-md">GitHub</a>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-400 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} CLI Vibe</div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
