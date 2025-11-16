"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import CodeBlock from "../code-block";

/**
 * HeroSection
 * Dark redesign with enhanced typography & ambient visuals.
 * No new functional features added.
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 text-center sm:py-40">
      {/* Soft ambient gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.10),transparent_60%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.08),transparent_65%)]" />
      </div>

      <h1 className="relative z-10 font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[3.2rem] md:text-[4.2rem] leading-[1.05]">
        Vibe: Your Free AI Coding CLI
      </h1>
      <p className="relative z-10 mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-muted-foreground">
        Agentic workflows in your Terminal. Anonymous by design, routes to free / open models via OpenRouter.
        Integrates with your editor and Git for a focused defensive-only workflow.
      </p>

      <div className="relative z-10 mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="ease-smooth px-8 py-6 text-base font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-[0_0_0_2px_rgba(255,255,255,0.15),0_0_30px_-5px_rgba(34,211,238,0.45)] hover:scale-[1.04]"
        >
          <Link href="#onboarding">Quick Start</Link>
        </Button>
        <div className="w-full sm:w-auto glow-border ambient rounded-xl">
          <CodeBlock
            code="npm i -g github:mk-knight23/vibe-cli"
            className="text-left rounded-xl"
          />
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <span className="uppercase tracking-wide text-xs text-muted-foreground/70">
          Or use curl
        </span>
        <div className="w-full max-w-2xl glow-border ambient rounded-xl">
          <CodeBlock
            code="curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash"
            className="text-left rounded-xl"
          />
        </div>
      </div>

      {/* Decorative floating particles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[30%] h-2 w-2 rounded-full bg-primary/30 animate-ping" />
        <div className="absolute right-[20%] top-[55%] h-3 w-3 rounded-full bg-accent/30 animate-bounce" />
        <div className="absolute left-[35%] top-[70%] h-1 w-1 rounded-full bg-primary/20 animate-pulse" />
      </div>
    </section>
  );
}