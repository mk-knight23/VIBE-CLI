"use client";

import Link from 'next/link';
import { Github, Menu, Moon, Search } from 'lucide-react';
import Logo from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { useState } from 'react';

const navLinks = [
  { href: '/installation', label: 'Install' },
  { href: '/quick-start', label: 'Quick Start' },
  { href: '/commands', label: 'Commands' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/faq', label: 'FAQ' },
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
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
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
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium transition-colors hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 rounded-lg border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground">
                  <p className="font-medium mb-2">Sections</p>
                  <p className="leading-relaxed">
                    Pages are now separated for faster access and clearer structure. Use the links above to
                    browse installation, quick start, command reference, pricing, docs, and FAQ.
                  </p>
                </div>
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
            <Button variant="ghost" size="icon" className="hidden md:inline-flex">
              <Moon className="h-5 w-5" />
              <span className="sr-only">Toggle Theme</span>
            </Button>
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
