"use client";

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Progress } from './ui/progress';
import CodeBlock from './code-block';

/* Dark redesign: elevated container & gradient progress bar. */
const items = [
  {
    value: "item-1",
    title: "1. Install Vibe CLI",
    content: (
      <>
        <p className="mb-4 text-sm md:text-base text-muted-foreground">
          Install globally via npm (GitHub source) or one-line curl script.
        </p>
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
              # Option A: npm (GitHub)
            </p>
            <CodeBlock code="npm i -g github:mk-knight23/vibe-cli" />
          </div>
          <div>
            <p className="mb-2 font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
              # Option B: curl bootstrap
            </p>
            <CodeBlock code="curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash" />
          </div>
        </div>
      </>
    )
  },
  {
    value: "item-2",
    title: "2. Set OpenRouter API key",
    content: "Set OPENROUTER_API_KEY to access free/open models. Keep the key local—workflow remains privacy-first."
  },
  {
    value: "item-3",
    title: "3. Launch interactive chat",
    content: "Start a focused session to ask, refactor, generate tests, or draft code with explicit approval steps."
  },
  {
    value: "item-4",
    title: "4. List & select free models",
    content: "Rotate across free models to find highest quality for your current task; resilience if a model slows."
  },
  {
    value: "item-5",
    title: "5. Explore agents & automation",
    content: "Discover emerging agentic workflows for multi-step tasks (test generation, review orchestration)."
  },
];

const QuickStartSection = () => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const progress = (openItems.length / items.length) * 100;

  return (
    <section id="onboarding" className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(34,211,238,0.06),transparent_60%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.05),transparent_65%)]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.4rem] md:text-[3rem]">
          Quick start (≈2 minutes)
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Open panels to reach 100% onboarding. Each step reinforces privacy & defensive-only constraints—
          accelerate safely.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border/50 bg-card/70 p-8 backdrop-blur-sm glow-border ambient ease-smooth">
        {/* Progress (Radix) + label */}
        <div className="mb-8 flex w-full items-center gap-5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Progress</span>
          <div className="flex-1">
            <Progress
              value={progress}
              className="h-3 w-full bg-secondary/40 ring-1 ring-inset ring-border/40"
            />
          </div>
          <span className="text-sm font-semibold text-primary min-w-[3ch] text-right">{Math.round(progress)}%</span>
        </div>

        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={(v) => setOpenItems(v)}
          className="w-full space-y-3"
        >
          {items.map((item, index) => (
            <AccordionItem
              value={item.value}
              key={item.value}
              className="overflow-hidden rounded-xl border border-border/50 bg-card/60 transition-all ease-smooth hover:border-accent/50 hover:bg-card/80"
            >
              <AccordionTrigger className="group flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-accent/25 text-sm font-semibold text-primary shadow-inner group-hover:from-primary/35 group-hover:to-accent/35 ease-smooth">
                    {index + 1}
                  </span>
                  <span className="text-sm md:text-base font-medium">{item.title}</span>
                </div>
                <div className="ease-smooth group-data-[state=open]:rotate-180">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-muted-foreground"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-6 pt-2 text-sm text-muted-foreground animate-in fade-in-50 slide-in-from-top-2">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {progress === 100 && (
          <div className="mt-10 rounded-xl border border-accent/40 bg-accent/10 p-5 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_-6px_rgba(34,211,238,0.25)] animate-in fade-in-50">
            <div className="mx-auto flex max-w-md items-center justify-center gap-3 text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="font-medium tracking-wide">All steps complete — you are ready to use Vibe CLI.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default QuickStartSection;
