import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, ExternalLink } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/installation", label: "Installation" },
    { href: "/features", label: "Features" },
    { href: "https://github.com/mk-knight23/vibe", label: "Documentation", external: true },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="font-serif text-2xl font-bold tracking-tighter text-foreground hover:opacity-80 transition-opacity">
              VIBE
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative"
              >
                {link.label}
                {link.external && <ExternalLink size={12} />}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a 
              href="https://vibe-main.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/25 hover:shadow-xl transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Try Vibe Website Builder
                <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-foreground p-2 hover:bg-secondary/50 rounded-md transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-lg">
          <div className="p-4 flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className="flex items-center gap-2 text-lg font-medium py-3 px-2 hover:bg-secondary/50 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
                {link.external && <ExternalLink size={16} />}
              </Link>
            ))}
            <div className="pt-4">
              <a 
                href="https://vibe-main.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
              >
                <Button className="w-full justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-purple-500/25 hover:shadow-xl">
                  <span className="flex items-center gap-2">
                    Try Vibe Website Builder
                    <ExternalLink size={16} />
                  </span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}