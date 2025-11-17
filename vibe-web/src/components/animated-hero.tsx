"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import CodeBlock from "./code-block";

export default function AnimatedHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      className="relative overflow-hidden py-24 text-center sm:py-40"
      style={{ y, opacity }}
    >
      {/* Enhanced ambient gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.10),transparent_60%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.08),transparent_65%)]" />
      </div>

      {/* Animated floating particles */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute left-[15%] top-[30%] h-2 w-2 rounded-full bg-primary/30"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute right-[20%] top-[55%] h-3 w-3 rounded-full bg-accent/30"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute left-[35%] top-[70%] h-1 w-1 rounded-full bg-primary/20"
        />
        <motion.div
          animate={{
            x: [0, 120, 0],
            y: [0, -80, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          className="absolute right-[10%] bottom-[20%] h-2 w-2 rounded-full bg-accent/40"
        />
      </div>

      {/* Main heading with gradient effect - FIXED VISIBILITY */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1
          className="relative z-10 font-headline font-semibold tracking-tight text-[3.2rem] md:text-[4.2rem] leading-[1.05]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ 
            background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            display: 'block'
          }}
        >
          Vibe: Your Free AI Coding CLI
        </motion.h1>
      </motion.div>

      {/* Subtitle with fade-in animation */}
      <motion.p
        className="relative z-10 mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-muted-foreground"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        Agentic workflows in your Terminal. Anonymous by design, routes to free / open models via OpenRouter.
        Integrates with your editor and Git for a focused defensive-only workflow.
      </motion.p>

      {/* CTA buttons with staggered animation */}
      <motion.div
        className="relative z-10 mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            asChild
            size="lg"
            className="ease-smooth px-8 py-6 text-base font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-[0_0_0_2px_rgba(255,255,255,0.15),0_0_30px_-5px_rgba(34,211,238,0.45)]"
          >
            <Link href="#onboarding">Quick Start</Link>
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto glow-border ambient rounded-xl"
        >
          <CodeBlock
            code="npm i -g github:mk-knight23/vibe-cli"
            className="text-left rounded-xl"
          />
        </motion.div>
      </motion.div>

      {/* Installation alternatives with staggered animation */}
      <motion.div
        className="relative z-10 mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <motion.span
          className="uppercase tracking-wide text-xs text-muted-foreground/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          Or use curl
        </motion.span>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl glow-border ambient rounded-xl"
        >
          <CodeBlock
            code="curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash"
            className="text-left rounded-xl"
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}