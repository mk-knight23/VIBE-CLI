import Link from "next/link";
import HeroSection from "../components/marketing/hero-section";
import TestimonialsSection from "../components/marketing/testimonials-section";

/**
 * Home (Landing Page)
 * Simplified into a hub now that sections have dedicated pages.
 * Provides quick navigation cards instead of inlined full content.
 */
const hubLinks = [
  { href: "/installation", title: "Install", description: "Curl, npm, Windows binary methods." },
  { href: "/quick-start", title: "Quick Start", description: "Onboarding steps & progress tracker." },
  { href: "/commands", title: "Commands", description: "Chat, agent, refactor, test, model ops." },
  { href: "/features", title: "Features", description: "Core ergonomics & capability overview." },
  { href: "/pricing", title: "Pricing", description: "Free usage model + future tiers." },
  { href: "/docs", title: "Docs", description: "Capabilities & integration surfaces." },
  { href: "/faq", title: "FAQ", description: "Common questions & security stance." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 space-y-28">
      <HeroSection />

      <section className="relative">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.4rem] md:text-[3rem]">
            Explore
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Navigate focused pages for installation, onboarding, command reference, features, documentation, and support.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hubLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm glow-border ambient ease-smooth hover:-translate-y-1 hover:border-accent/50"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent group-hover:scale-125 ease-smooth" />
                {link.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <TestimonialsSection />
    </div>
  );
}
