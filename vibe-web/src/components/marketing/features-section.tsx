import React from "react";

/**
 * FeaturesSection
 * Dark redesign with elevated card treatments & gradient heading.
 * No new functional features.
 */
export default function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(34,211,238,0.08),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.07),transparent_65%)]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.6rem] md:text-[3.1rem]">
          Why free?
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Built for developer velocity, privacy, and safety—without a paywall. The focus is a frictionless defensive-only workflow.
        </p>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "No Paywall", desc: "Uses community free OpenRouter models." },
          { title: "Anonymous Usage", desc: "Bring your own key—no accounts needed." },
          { title: "Defensive & Safe", desc: "Explicit approval steps; refuses abuse." },
          { title: "Open Source", desc: "Transparent roadmap & changelog." },
          { title: "Donation-Based Future", desc: "Optional tier may extend context limits." },
        ].map((item) => (
          <div
            key={item.title}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/70 p-7 backdrop-blur-sm ease-smooth hover:-translate-y-2 hover:bg-card/90 hover:border-accent/50 glow-border ambient"
          >
            <div className="relative z-10">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}