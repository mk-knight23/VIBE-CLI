"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CheckCircle2, FileTerminal, ArrowRight, ShieldCheck, GitMerge, Shuffle } from "lucide-react";

/**
 * CapabilitiesTabsSection
 * Dark redesign: unified ambient backdrop & glow-border elements.
 * No new functional content.
 */
const coreCliFeatures = [
  {
    icon: FileTerminal,
    title: "Terminal-first workflows",
    description: "Chat, refactor, test-gen, and review without leaving your shell.",
  },
  {
    icon: ArrowRight,
    title: "Context injection primitives",
    description: "Inject diffs, globs, command output, docs, file sets, and system prompts precisely.",
  },
  {
    icon: ShieldCheck,
    title: "Defensive-only stance",
    description: "Hard refusal logic for abusive security prompts; explicit safe workflow.",
  },
  {
    icon: GitMerge,
    title: "Git-native operations",
    description: "Commit messages, PR descriptions, status insights, code reviews.",
  },
  {
    icon: FileTerminal,
    title: "Structured file editing",
    description: "Multi-file diff planning with confirmation. No silent mutations.",
  },
  {
    icon: Shuffle,
    title: "Multi-model free access",
    description: "Rotate among free OpenRouter models; resilience if one is degraded.",
  },
];

export default function CapabilitiesTabsSection() {
  // Controlled tab state to ensure reliable switching (fix for user report tabs not opening)
  const [tabValue, setTabValue] = React.useState("core-cli");
  return (
    <section id="docs" className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(34,211,238,0.07),transparent_60%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.06),transparent_65%)]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.4rem] md:text-[3rem]">
          Explore Vibe Capabilities
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Core CLI ergonomics, emerging agent automation, integration surfaces, and a neutral comparison snapshot.
        </p>
      </div>

      <div className="mt-16 glow-border ambient rounded-2xl p-2">
        <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/40 p-1 relative z-10">
            {[
              { value: "core-cli", label: "Core CLI" },
              { value: "agents", label: "Agents" },
              { value: "integrations", label: "Integrations" },
              { value: "comparison", label: "Comparison" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg px-4 py-2 text-sm font-medium ease-smooth data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-2px_rgba(34,211,238,0.35)] hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="core-cli" className="mt-8 animate-in fade-in-50 slide-in-from-top-2">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {coreCliFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm ease-smooth hover:-translate-y-2 hover:bg-card/90 hover:border-accent/50 glow-border ambient"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary group-hover:scale-110 ease-smooth">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold">{feature.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="agents" className="mt-8 text-center animate-in fade-in-50 slide-in-from-top-2">
            <div className="inline-flex items-center justify-center rounded-xl border border-dashed border-accent/50 bg-accent/5 p-10">
              <div className="text-center">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10"
                  >
                    <path d="M12 2v4"></path>
                    <path d="M12 18v4"></path>
                    <path d="M4.93 4.93l2.83 2.83"></path>
                    <path d="M16.24 16.24l2.83 2.83"></path>
                    <path d="M2 12h4"></path>
                    <path d="M18 12h4"></path>
                    <path d="M4.93 19.07l2.83-2.83"></path>
                    <path d="M16.24 7.76l2.83-2.83"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-muted-foreground">Agentic task automation</p>
                <p className="mt-2 text-sm text-muted-foreground/80">
                  Features under active development. Stay tuned for updates!
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-8 animate-in fade-in-50 slide-in-from-top-2">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                "Plain terminal (bash, zsh, fish)",
                "iTerm2 / Windows Terminal",
                "Git / GitHub Integration",
                "VS Code sidebar [PLANNED]",
                "JetBrains plugin [PLANNED]",
              ].map((item) => (
                <div
                  key={item}
                  className="relative overflow-hidden rounded-xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm ease-smooth hover:-translate-y-2 hover:bg-card/90 hover:border-accent/50 glow-border ambient"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold">{item}</h4>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-8 text-center animate-in fade-in-50 slide-in-from-top-2">
            <div className="inline-flex items-center justify-center rounded-xl border border-dashed border-accent/50 bg-accent/5 p-10">
              <div className="text-center">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10"
                  >
                    <path d="M12 2v4"></path>
                    <path d="M12 18v4"></path>
                    <path d="M4.93 4.93l2.83 2.83"></path>
                    <path d="M16.24 16.24l2.83 2.83"></path>
                    <path d="M2 12h4"></path>
                    <path d="M18 12h4"></path>
                    <path d="M4.93 19.07l2.83-2.83"></path>
                    <path d="M16.24 7.76l2.83-2.83"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-muted-foreground">Feature comparison</p>
                <p className="mt-2 text-sm text-muted-foreground/80">
                  Neutral matrix compilation in progress.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}