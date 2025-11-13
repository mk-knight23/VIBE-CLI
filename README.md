  Chat with OpenRouter free models from your terminal, with Claude Code–style     │
│ power commands. A simple Next.js web UI is included.                            │
│                                                                                 │
│ Repository: https://github.com/mk-knight23/vibe-cli                             │
│                                                                                 │
│ Quick install (copy/paste)                                                      │
│                                                                                 │
│ Option A: Install directly from GitHub (no npm account)                         │
│                                                                                 │
│  • Global install: npm i -g github:mk-knight23/vibe-cli                         │
│  • One-off run (no install): npx github:mk-knight23/vibe-cli                    │
│                                                                                 │
│ Option B: Prebuilt binaries (from GitHub Releases)                              │
│                                                                                 │
│  • macOS/Linux quick install: curl -fsSL                                        │
│    https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh |     │
│    bash                                                                         │
│  • Windows:                                                                     │
│     • Download the latest "vibe-win-x64.exe" from the Releases page and run it  │
│                                                                                 │
│ Environment variable (required) Set your OpenRouter API key before running the  │
│ CLI or smoke test.                                                              │
│                                                                                 │
│  • macOS/Linux: export OPENROUTER_API_KEY="sk-or-..."                           │
│  • Windows PowerShell: setx OPENROUTER_API_KEY "sk-or-..."  # then restart your │
│    terminal                                                                     │
│  • Windows CMD (temporary for this session): set OPENROUTER_API_KEY=sk-or-...   │
│                                                                                 │
│ Run the CLI                                                                     │
│                                                                                 │
│  • Globally installed: vibe                                                     │
│  • From source: npm start Inside the chat, type "/help" for the full command    │
│    list.                                                                        │
│                                                                                 │
│ Smoke test (copy/paste)                                                         │
│                                                                                 │
│  • npm run smoke This sends a tiny request to a free model and prints a short   │
│    reply.                                                                       │
│                                                                                 │
│ Key features                                                                    │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│  • Only lists/selects OpenRouter free models                                    │
│  • Commands:                                                                    │
│     • /help — show commands                                                     │
│     • /models or /model — pick a free model mid-session                         │
│     • /system — edit system prompt                                              │
│     • /clear — clear context                                                    │
│     • /save [name] — save transcript to transcripts/                            │
│     • /search  — quick web search (DuckDuckGo Instant Answer)                   │
│     • /run  — run shell command and inject output                               │
│     • /open  — inject file contents (size-capped)                               │
│     • /files — list project files                                               │
│     • /multiline — toggle multiline editor mode                                 │
│     • /exit — quit                                                              │
│                                                                                 │
│ Web UI (Next.js)                                                                │
│                                                                                 │
│  • Local development: export OPENROUTER_API_KEY="sk-or-..." npm run dev Open    │
│    http://localhost:3000/chat                                                   │
│  • Deploy to Vercel:                                                            │
│     1 Import repo at https://vercel.com/new                                     │
│     2 Project Settings → Environment Variables:                                 │
│        • Name: OPENROUTER_API_KEY                                               │
│        • Value: your key                                                        │
│        • Scope: Production, Preview, Development                                │
│     3 Deploy and visit /chat                                                    │
│                                                                                 │
│ Releases with prebuilt binaries                                                 │
│                                                                                 │
│  • Tag a version to trigger GitHub Actions release workflow: git tag v1.0.0 git │
│    push origin v1.0.0                                                           │
│  • The workflow builds and uploads:                                             │
│     • vibe-linux-x64                                                            │
│     • vibe-macos-x64                                                            │
│     • vibe-win-x64.exe                                                          │
│                                                                                 │
│ Troubleshooting                                                                 │
│                                                                                 │
│  • Use Node 18+ (Node 14+ minimum)                                              │
│  • If editor prompts (/system or /multiline) fail, set your $EDITOR or use      │
│    single-line input                                                            │
│  • If you see ESM/CJS errors, update Node and reinstall dependencies (rm -rf    │
│    node_modules && npm i)                                                       │
│                                                                                 │
│ License                                                                         │
│                                                                                 │
│  • MIT                                                                          │
│                                                                                 │
│ Contributing                                                                    │
│                                                                                 │
│  • Issues: https://github.com/mk-knight23/vibe-cli/issues                       │
│  • Pull requests welcome                                                        │
│                                                                                 │
│ Would you like me to prepare a pull request on GitHub that updates README.md    │
│ with this content, or proceed to add Homebrew and Scoop manifests for           │
│ platform-native installs? 