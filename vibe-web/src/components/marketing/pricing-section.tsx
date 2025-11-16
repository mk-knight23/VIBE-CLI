import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

/**
 * PricingSection
 * Dark redesign: enhanced cards & gradient heading. No new pricing logic.
 */
export default function PricingSection() {
  const freeFeatures = [
    "OpenRouter free models",
    "Terminal-first workflows",
    "Git-native tooling",
    "Community support",
    "Privacy-first (BYO key)",
  ];

  const futureFeatures = [
    "Priority feature previews",
    "Extended context limits",
    "Optional support channel",
  ];

  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(34,211,238,0.08),transparent_60%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.07),transparent_65%)]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.4rem] md:text-[3rem]">
          Pricing
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Free forever with no paywalls. Donations help sustain development.
        </p>
      </div>

      <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
        <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_-6px_rgba(34,211,238,0.25)] ease-smooth hover:-translate-y-3 hover:border-accent/50 glow-border ambient">
          <div className="absolute left-5 top-5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1 text-xs font-bold text-primary-foreground shadow-md">
            Most Popular
          </div>
          <CardHeader className="pt-14">
            <CardTitle className="text-2xl">Free Forever</CardTitle>
            <CardDescription className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                $0
              </span>
              <span className="text-muted-foreground">/mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow pt-6">
            <ul className="space-y-4">
              {freeFeatures.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_0_35px_-6px_rgba(34,211,238,0.45)] ease-smooth hover:scale-[1.02]">
              Get Started
            </Button>
          </div>
        </Card>

        <Card className="relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_-6px_rgba(34,211,238,0.18)] ease-smooth hover:-translate-y-3 hover:border-accent/50 glow-border ambient">
          <CardHeader className="pt-14">
            <CardTitle className="text-2xl">Future Pro</CardTitle>
            <CardDescription className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                ?
              </span>
              <span className="text-muted-foreground">/mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow pt-6">
            <ul className="space-y-4">
              {futureFeatures.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm italic text-muted-foreground">
              Not enabled yet — emphasis on free access today.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button className="w-full border border-accent bg-transparent text-accent hover:bg-accent/15 ease-smooth">
              Stay Tuned
            </Button>
          </div>
        </Card>
      </div>

      <p className="mx-auto mt-14 max-w-2xl text-center text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Why free?</strong> Vibe routes to community free models via
        OpenRouter—no accounts required. Donations may fund infra & advanced features without paywalls.
      </p>
    </section>
  );
}