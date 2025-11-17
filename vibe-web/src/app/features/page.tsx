"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Terminal, Zap, Shield, Users, Code } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

const features = [
  {
    icon: Terminal,
    title: "Terminal-First Workflow",
    description: "Seamless CLI integration that feels natural in your development environment",
    details: [
      "Native terminal commands",
      "Shell integration",
      "Command history",
      "Auto-completion"
    ]
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed with minimal overhead and instant responses",
    details: [
      "Sub-second response times",
      "Efficient API calls",
      "Cached responses",
      "Background processing"
    ]
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your code stays local with anonymous usage and BYO key support",
    details: [
      "No data collection",
      "Local processing",
      "Encrypted communications",
      "Open source transparency"
    ]
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built by developers for developers with community feedback",
    details: [
      "Open source development",
      "Community contributions",
      "Regular updates",
      "Feature requests welcome"
    ]
  },
  {
    icon: Code,
    title: "Multi-Language Support",
    description: "Works with all major programming languages and frameworks",
    details: [
      "JavaScript/TypeScript",
      "Python, Go, Rust",
      "Java, C++, C#",
      "Ruby, PHP, Swift"
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      {/* Hero Section */}
      <motion.div
        className="mx-auto max-w-3xl text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.8rem] md:text-[3.5rem] leading-[1.1]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Powerful Features
        </motion.h1>
        <motion.p
          className="mt-6 text-xl leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Everything you need for AI-powered development workflows in your terminal
        </motion.p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm glow-border ambient"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Section */}
      <motion.div
        className="mx-auto mt-16 max-w-2xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-8">
          Experience the power of AI-assisted development in your terminal today
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
            <Link href="/installation">Install Vibe</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/quick-start">View Quick Start</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}