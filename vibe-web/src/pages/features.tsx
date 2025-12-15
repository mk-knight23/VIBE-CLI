import { Navbar } from "@/components/navigation/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Terminal, Code2, Zap, Shield, MessageSquare, Settings, GitBranch, Cpu, Lock, Eye, Copy, Trash2, Palette, Users, Layers, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Features() {
  const cliFeatures = [
    {
      icon: Terminal,
      title: "Terminal-First Workflow",
      description: "Seamless CLI integration that feels natural in your development environment",
      items: [
        "Native terminal commands",
        "Shell integration", 
        "Multi-step agent workflows",
        "Git automation tools"
      ]
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with minimal overhead and instant responses",
      items: [
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
      items: [
        "No data collection",
        "Local processing",
        "Encrypted communications",
        "Open source transparency"
      ]
    }
  ];

  const vscodeFeatures = [
    {
      icon: Code2,
      title: "VS Code Integration", 
      description: "Full AI assistance integrated directly in your editor",
      items: [
        "Six specialized AI modes",
        "Multi-provider support (OpenRouter, MegaLLM)",
        "Context-aware responses",
        "Real-time suggestions"
      ]
    },
    {
      icon: MessageSquare,
      title: "Rich Chat Interface",
      description: "Interactive chat with copyable messages and clear history",
      items: [
        "Click-to-copy message content",
        "Clear chat functionality", 
        "Smooth scrolling with custom scrollbars",
        "Dark/light theme support"
      ]
    },
    {
      icon: Settings,
      title: "Advanced Controls",
      description: "Customizable settings and workflow controls",
      items: [
        "Multiple AI personas",
        "Model selection",
        "Chat vs Agent mode",
        "Keyboard shortcuts"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground mb-4">
              Powerful Features
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need for AI-powered development workflows with both CLI and VS Code
            </p>
          </div>

          <Tabs defaultValue="cli" className="space-y-12">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="cli" className="flex items-center gap-2">
                <Terminal size={16} />
                Vibe CLI
              </TabsTrigger>
              <TabsTrigger value="vscode" className="flex items-center gap-2">
                <Code2 size={16} />
                Vibe Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cli" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                {cliFeatures.map((feature, index) => (
                  <Card key={index} className="border border-border hover:shadow-lg transition-shadow">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <feature.icon className="text-primary" size={24} />
                        </div>
                        <h3 className="text-xl font-semibold font-serif">{feature.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="vscode" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                {vscodeFeatures.map((feature, index) => (
                  <Card key={index} className="border border-border hover:shadow-lg transition-shadow">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <feature.icon className="text-primary" size={24} />
                        </div>
                        <h3 className="text-xl font-semibold font-serif">{feature.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* CTA Section */}
          <div className="mt-20 text-center bg-card rounded-2xl p-12 border border-border">
            <h2 className="text-3xl font-bold font-serif mb-4">
              Ready to get started with both tools?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the power of AI-assisted development with CLI and VS Code
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/installation">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg">
                  Install Vibe CLI
                </Button>
              </Link>
              <Link href="/installation">
                <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg border-border hover:bg-accent">
                  Get VS Code Extension
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">© 2025 CLI Vibe. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
