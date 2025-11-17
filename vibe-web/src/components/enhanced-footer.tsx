"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Github, Twitter, Mail, Heart, Star, BookOpen, MessageCircle, Users, LifeBuoy, MessageSquare, Activity } from "lucide-react";
import Logo from "./logo";

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features", icon: Star },
      { href: "/pricing", label: "Pricing", icon: Star },
      { href: "/installation", label: "Installation", icon: BookOpen },
      { href: "/quick-start", label: "Quick Start", icon: BookOpen },
    ]
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation", icon: BookOpen },
      { href: "/commands", label: "Commands", icon: MessageCircle },
      { href: "/faq", label: "FAQ", icon: MessageCircle },
      { href: "/blog", label: "Blog", icon: BookOpen },
    ]
  },
  {
    title: "Community",
    links: [
      { href: "https://github.com/mk-knight23/vibe-cli", label: "GitHub", icon: Github, external: true },
      { href: "https://twitter.com/vibecli", label: "Twitter", icon: Twitter, external: true },
      { href: "/community", label: "Community", icon: Users },
    ]
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact", icon: Mail },
      { href: "/support", label: "Support", icon: LifeBuoy },
      { href: "/feedback", label: "Feedback", icon: MessageSquare },
    ]
  }
];

const socialLinks = [
  { href: "https://github.com/mk-knight23/vibe-cli", icon: Github, label: "GitHub" },
  { href: "https://twitter.com/vibecli", icon: Twitter, label: "Twitter" },
];

export default function EnhancedFooter() {
  return (
    <footer className="relative border-t border-border/40 bg-background/50 backdrop-blur-sm">
      {/* Decorative gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.05),transparent_50%)]" />
      </div>

      <div className="container mx-auto max-w-6xl px-5 py-12">
        {/* Main footer content */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand section */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="flex items-center space-x-2">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your Free AI Coding CLI. Agentic workflows in your terminal, anonymous by design.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                  transition={{ delay: index * 0.1 }}
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Footer sections */}
          {footerSections.map((section, index) => (
            <motion.div
              key={section.title}
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <link.icon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom section */}
        <motion.div
          className="mt-12 pt-8 border-t border-border/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 CLI Vibe. All rights reserved. Made with{" "}
              <Heart className="inline h-3 w-3 text-red-500" /> by the community.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}