import CodeBlock from "../../components/code-block";

/**
 * Installation Page
 * Extracted from previous landing page section.
 * Purely presentational; no new functionality introduced.
 */

export default function InstallationPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 space-y-16">
      <header className="text-center">
        <h1 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.6rem] md:text-[3.2rem]">
          Installation
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Choose the fastest method for your platform. All approaches are local & privacy-first.
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm glow-border ambient">
          <h2 className="text-lg font-semibold">Quick Install (macOS / Linux)</h2>
          <CodeBlock
            code={`# Auto-detect latest version
curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash

# Install specific version
VERSION=v1.0.5 curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash`}
            className="text-left"
          />
        </div>

        <div className="space-y-6 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm glow-border ambient">
          <h2 className="text-lg font-semibold">Windows Install</h2>
          <CodeBlock
            code={`# Download release asset:
#   vibe-win-x64.exe
# Add directory to PATH as 'vibe'
# Then run:
vibe help`}
            className="text-left"
          />
        </div>

        <div className="space-y-6 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm glow-border ambient md:col-span-2">
          <h2 className="text-lg font-semibold">Install via npm</h2>
          <CodeBlock
            code={`# Global install
npm install -g vibe-cli

# GitHub source (pinned version)
npm i -g github:mk-knight23/vibe-cli#v1.0.5

# One-off run
npx vibe-cli`}
            className="text-left"
          />
        </div>
      </section>
    </div>
  );
}