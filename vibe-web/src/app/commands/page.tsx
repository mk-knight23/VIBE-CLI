import CodeBlock from "../../components/code-block";

/**
 * Commands Reference Page
 * Extracted from previous landing page sections.
 * Purely presentational: exposes core CLI usage groups.
 */

const groups: { title: string; code: string; description?: string }[] = [
  {
    title: "Basic usage",
    code: `vibe                 # Start interactive chat
vibe chat "message"  # One-off message
vibe help            # List commands`,
    description: "Entry points for interactive or one-off prompting."
  },
  {
    title: "AI agent & tooling",
    code: `vibe agent start
vibe codegen
vibe debug
vibe refactor
vibe testgen
vibe gittools
vibe multiedit`,
    description: "Automation and structured editing / review / generation flows."
  },
  {
    title: "Model management",
    code: `vibe model list
vibe model use <name>
vibe cost`,
    description: "Rotate among available models and inspect usage cost."
  },
  {
    title: "Development workflow",
    code: `vibe plan "feature"
vibe fix
vibe test
vibe run --yolo      # Auto-approval (use carefully)`,
    description: "Higher-level iterative workflow helpers. --yolo skips confirmations (use with caution)."
  },
  {
    title: "Configuration",
    code: `vibe config set <key> <value>
vibe theme set light
vibe resume`,
    description: "Persist CLI settings locally; resume previous session context."
  }
];

export default function CommandsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 space-y-14">
      <header className="text-center">
        <h1 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.6rem] md:text-[3.2rem]">
          Core Commands
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Reference for interactive chat, agent tooling, model rotation, development helpers, and configuration.
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-2">
        {groups.map(group => (
          <div
            key={group.title}
            className="space-y-4 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm glow-border ambient"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group.title}
            </h2>
            {group.description && (
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                {group.description}
              </p>
            )}
            <CodeBlock code={group.code} className="text-left" />
          </div>
        ))}
      </section>

      <footer className="pt-4 text-center text-xs text-muted-foreground/70">
        Need installation or onboarding? Visit the Install or Quick Start pages in the navigation.
      </footer>
    </div>
  );
}