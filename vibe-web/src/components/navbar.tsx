import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

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
            <Link href="/installation" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Installation</Link>
            <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="https://github.com/mk-knight23/vibe" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documentation</Link>
            <Link href="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a href="https://vibe-main.vercel.app" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/25 hover:shadow-xl animate-pulse">
              Try Vibe Website Builder
            </a>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-foreground p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background border-b border-border p-4 flex flex-col space-y-4 shadow-lg animate-in slide-in-from-top-5">
          <Link href="/installation" className="text-lg font-medium py-2">Installation</Link>
          <Link href="/features" className="text-lg font-medium py-2">Features</Link>
          <Link href="https://github.com/mk-knight23/vibe" className="text-lg font-medium py-2">Documentation</Link>
          <Link href="/faq" className="text-lg font-medium py-2">FAQ</Link>
          <div className="pt-4 flex flex-col space-y-3">
            <a href="https://vibe-main.vercel.app" target="_blank" rel="noopener noreferrer">
              <Button className="w-full justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-purple-500/25 hover:shadow-xl animate-pulse">
                Try Vibe Website Builder
              </Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}