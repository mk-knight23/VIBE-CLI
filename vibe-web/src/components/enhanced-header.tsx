"use client";

import Link from 'next/link';
import { Github, Menu, Search } from 'lucide-react';
import Logo from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { NavigationDropdown } from './navigation-dropdown';

const navSections = [
  {
    title: 'Getting Started',
    items: [
      { href: '/installation', label: 'Install', description: 'Curl, npm, Windows binary methods' },
      { href: '/quick-start', label: 'Quick Start', description: 'Onboarding steps & progress tracker' },
    ]
  },
  {
    title: 'Features',
    items: [
      { href: '/commands', label: 'Commands', description: 'Chat, agent, refactor, test, model ops' },
      { href: '/features', label: 'Features', description: 'Core ergonomics & capability overview' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { href: '/pricing', label: 'Pricing', description: 'Free usage model + future tiers' },
      { href: '/docs', label: 'Docs', description: 'Capabilities & integration surfaces' },
      { href: '/faq', label: 'FAQ', description: 'Common questions & security stance' },
    ]
  },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
          </Link>
          <nav className="flex items-center space-x-8 text-sm font-medium">
            {navSections.map((section) => (
              <NavigationDropdown
                key={section.title}
                title={section.title}
                items={section.items}
              />
            ))}
          </nav>
        </div>

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="p-4">
                <SheetTitle className="sr-only">Main navigation</SheetTitle>
                <Link href="/" className="mb-6 flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                  <Logo />
                </Link>
                <nav className="flex flex-col gap-6">
                  {navSections.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{section.title}</h3>
                      <div className="flex flex-col gap-2">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="text-lg font-medium transition-colors hover:text-primary"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search can be implemented here */}
          </div>
          <nav className="flex items-center">
            <Button variant="ghost" size="icon" className="hidden md:inline-flex">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
            <ThemeToggle />
            <a
              href="https://github.com/mk-knight23/vibe-cli"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
            >
              <Button variant="ghost" size="icon">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Button>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;