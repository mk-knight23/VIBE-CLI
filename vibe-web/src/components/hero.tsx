import { motion } from "framer-motion";
import { Terminal, Copy, Code2, Sparkles, ArrowRight, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function Hero() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const installCommand = "npm install -g vibe-ai-cli";

  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50/80 via-transparent to-transparent"></div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Sparkles size={16} />
            <span>Built for developers</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[0.9] mb-8"
          >
            AI-powered
            <br />
            <span className="text-primary italic font-serif">development</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-12 max-w-3xl mx-auto"
          >
            Work with AI directly in your terminal and editor. Build, debug, and ship faster. 
            <br />Describe what you need, and Vibe handles the rest.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <div className="flex items-center bg-[#1e1e1e] text-white rounded-lg px-4 py-3 font-mono text-sm border border-gray-700">
              <span className="text-gray-400 mr-2">$</span>
              <span>{installCommand}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-3 text-gray-400 hover:text-white hover:bg-gray-700 p-1 h-auto"
                onClick={() => copyToClipboard(installCommand)}
              >
                {copiedText === installCommand ? "Copied!" : <Copy size={14} />}
              </Button>
            </div>
            <span className="text-muted-foreground text-sm">Or</span>
            <Link href="/installation" className="text-primary hover:text-primary/80 text-sm font-medium underline underline-offset-4">
              read the documentation
            </Link>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-semibold text-center mb-8">Use Vibe where you work</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Terminal, title: "Terminal", desc: "CLI integration" },
              { icon: Code2, title: "IDE", desc: "VS Code extension" },
              { icon: Sparkles, title: "Web", desc: "Browser access" },
              { icon: ArrowRight, title: "More", desc: "Coming soon" }
            ].map((item, index) => (
              <div key={index} className="text-center p-6 rounded-xl border border-border hover:shadow-lg transition-all bg-white/50 backdrop-blur-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <item.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative"
        >
          <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 bg-[#2d2d2d] border-b border-gray-700">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                <Terminal size={12} /> vibe-cli — v8.0.2
              </div>
            </div>
            <div className="p-8 font-mono text-sm leading-relaxed text-gray-300 min-h-[400px]">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <span className="text-green-400 mr-2">╭───────────────────────────╮</span>
                </div>
                <div className="flex items-center mb-4">
                  <span className="text-green-400 mr-2">│</span>
                  <span className="text-white mx-4">✶ Welcome to Vibe CLI</span>
                  <span className="text-green-400 ml-auto">│</span>
                </div>
                <div className="flex items-center mb-6">
                  <span className="text-green-400 mr-2">╰───────────────────────────╯</span>
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-green-400">➜</span> <span className="text-blue-400">~</span> <span className="text-purple-400">vibe</span> <span className="text-gray-400">"Create a React component for user authentication"</span>
              </div>
              
              <div className="mb-6 text-orange-300">
                <span className="mr-2">⚡</span>Vibe AI (OpenRouter - Claude 3.5 Sonnet)
              </div>

              <div className="mb-6 text-white">
                <div className="typing-animation">
                  I'll create a comprehensive authentication component with login and signup forms.
                  <br/><br/>
                  Creating <span className="text-yellow-400">AuthComponent.tsx</span>...
                  <br/>
                  - Added form validation
                  <br/>
                  - Included error handling  
                  <br/>
                  - Added loading states
                  <br/>
                  - Responsive design included
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded border border-gray-700/50 mb-4">
                <code className="text-xs text-blue-300">
                  <span className="text-purple-400">import</span> &#123; useState &#125; <span className="text-purple-400">from</span> <span className="text-green-400">"react"</span>;<br/>
                  <br/>
                  <span className="text-purple-400">export function</span> <span className="text-yellow-400">AuthComponent</span>() &#123;<br/>
                  &nbsp;&nbsp;<span className="text-purple-400">const</span> [isLogin, setIsLogin] = <span className="text-yellow-400">useState</span>(<span className="text-orange-400">true</span>);<br/>
                  &nbsp;&nbsp;<span className="text-gray-500">// Component logic...</span><br/>
                  &#125;
                </code>
              </div>
              
              <div className="animate-pulse flex items-center text-gray-400">
                <span className="text-green-400 mr-2">➜</span> Ready for next command...
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/installation">
              <Button size="lg" className="bg-foreground text-white hover:bg-foreground/90 rounded-full px-8 py-6 text-lg h-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                Get Started
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg h-auto bg-white border-border hover:bg-gray-50 text-foreground">
                <Play size={16} className="mr-2" />
                See Features
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Free forever. No account required. Works offline.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
