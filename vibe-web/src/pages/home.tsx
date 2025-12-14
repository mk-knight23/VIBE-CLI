import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Button } from "@/components/ui/button";
import { ArrowRight, Twitter, Github, Linkedin, Instagram } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main>
        <Hero />
        
        {/* CTA Section */}
        <section className="py-24 bg-foreground text-background">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold font-serif mb-6 text-white">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Install Vibe CLI or VS Code extension and start building with AI today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/installation">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg">
                  Install Vibe CLI
                </Button>
              </Link>
              <Link href="/installation">
                <Button size="lg" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg">
                  VS Code Extension
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-sm text-gray-500">
              v4.0 available for macOS, Linux, and Windows.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background py-16 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div>
                <h4 className="font-bold text-foreground mb-4 font-serif">Explore VIBE</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors flex items-center">Installation</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors flex items-center">Features</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors flex items-center">Documentation</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-4 font-serif">Resources</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">AI Chat</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Commands</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-4 font-serif">Community</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">GitHub</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-4 font-serif">Legal</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            
            <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <span className="font-serif text-xl font-bold text-foreground">Vibe CLI</span>
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">v4.0</span>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex gap-4 text-muted-foreground">
                    <Twitter size={20} className="hover:text-foreground cursor-pointer transition-colors"/>
                    <Github size={20} className="hover:text-foreground cursor-pointer transition-colors"/>
                    <Linkedin size={20} className="hover:text-foreground cursor-pointer transition-colors"/>
                 </div>
                 <div className="text-sm text-muted-foreground">
                    © 2025 CLI Vibe. All rights reserved.
                 </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}