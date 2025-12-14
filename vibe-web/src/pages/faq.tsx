import { Navbar } from "@/components/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Terminal, Code2, MessageCircle, Book } from "lucide-react";

export default function FAQ() {
  const cliFaqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is Vibe CLI?",
          a: "Vibe CLI is a terminal-based AI coding assistant that helps you build faster with AI assistance. It supports 4 providers, 40+ models, and is completely free to use."
        },
        {
          q: "How do I install Vibe CLI?",
          a: "You can install Vibe CLI via curl script (macOS/Linux), npm, Homebrew, or download the Windows executable. See our Installation page for detailed instructions."
        },
        {
          q: "Do I need an account to use Vibe CLI?",
          a: "No, Vibe CLI works completely locally without requiring any account registration. Just install and start using it immediately."
        }
      ]
    },
    {
      category: "Security & Privacy",
      questions: [
        {
          q: "Is my code safe with Vibe CLI?",
          a: "Yes, your code is completely safe. Vibe CLI processes everything locally and only sends prompts to AI providers when you explicitly request assistance. Your code never leaves your machine unless you choose to share it."
        },
        {
          q: "What data does Vibe CLI collect?",
          a: "Vibe CLI collects no personal data or telemetry. All processing happens locally on your machine, ensuring complete privacy."
        },
        {
          q: "Can I use Vibe CLI offline?",
          a: "Vibe CLI requires internet connection only when making AI requests. All file operations, code analysis, and local features work completely offline."
        }
      ]
    },
    {
      category: "Usage & Features",
      questions: [
        {
          q: "Which programming languages are supported?",
          a: "Vibe CLI supports all major programming languages including JavaScript, TypeScript, Python, Go, Rust, Java, C++, and many more. The AI models are trained on diverse codebases."
        },
        {
          q: "How does the defensive workflow work?",
          a: "The defensive workflow ensures safe code modifications by creating backups, validating changes, and providing rollback options. It prevents accidental overwrites and maintains code integrity."
        },
        {
          q: "Can I customize Vibe CLI's behavior?",
          a: "Yes, Vibe CLI offers extensive customization through configuration files, environment variables, and command-line flags. You can customize AI providers, models, and workflow preferences."
        }
      ]
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What models does Vibe CLI use?",
          a: "Vibe CLI supports 40+ models across 4 providers: OpenRouter (GPT-4, Claude, Gemini), MegaLLM (Llama, DeepSeek), AgentRouter (Claude variants), and Routeway (specialized models)."
        },
        {
          q: "How do I update Vibe CLI?",
          a: "Run 'vibe update' to check for and install the latest version. You can also reinstall using your original installation method (npm, brew, etc.)."
        },
        {
          q: "Is Vibe CLI open source?",
          a: "Yes, Vibe CLI is open source under the MIT license. You can find the source code, contribute, and report issues on our GitHub repository."
        }
      ]
    },
    {
      category: "Pricing & Future",
      questions: [
        {
          q: "Is Vibe CLI really free?",
          a: "Yes, Vibe CLI is completely free and will remain free forever. We believe in making AI-powered development accessible to everyone."
        },
        {
          q: "What are the future plans for Vibe CLI?",
          a: "We're continuously adding new features, models, and providers. Upcoming features include enhanced memory systems, better code analysis, and expanded language support."
        }
      ]
    }
  ];

  const vscodeFaqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is Vibe VS Code Extension?",
          a: "Vibe VS Code Extension is an in-editor AI assistant that provides intelligent code completion, refactoring suggestions, and AI-powered development features directly within Visual Studio Code."
        },
        {
          q: "How do I install the Vibe Extension?",
          a: "Install from the VS Code Marketplace by searching for 'Vibe VS Code' or 'vibe-vscode', then click Install. Alternatively, download the VSIX file from GitHub releases."
        },
        {
          q: "Do I need an account to use Vibe Code?",
          a: "No account required. Vibe Code works locally and integrates seamlessly with VS Code without any registration or setup."
        }
      ]
    },
    {
      category: "Security & Privacy",
      questions: [
        {
          q: "Is my code safe with Vibe Code?",
          a: "Absolutely. Vibe Code processes everything locally within VS Code. Your code remains on your machine and is only shared with AI providers when you explicitly request assistance."
        },
        {
          q: "What data does Vibe Code collect?",
          a: "Vibe Code collects no telemetry or personal data. All operations are performed locally, ensuring complete privacy and security."
        },
        {
          q: "Can I use Vibe Code offline?",
          a: "Local features like syntax highlighting and code analysis work offline. AI features require internet connection only when making requests to AI providers."
        }
      ]
    },
    {
      category: "Usage & Features",
      questions: [
        {
          q: "What AI modes are available in Vibe Code?",
          a: "Vibe Code offers multiple AI modes including code completion, refactoring assistance, documentation generation, bug detection, and interactive chat for coding questions."
        },
        {
          q: "How do I switch between AI modes?",
          a: "Use the Vibe sidebar panel or command palette (Ctrl+Shift+P) to access different AI modes. You can also use keyboard shortcuts for quick mode switching."
        },
        {
          q: "Can I customize Vibe Code's behavior?",
          a: "Yes, Vibe Code provides extensive settings for customizing AI providers, models, keybindings, and UI preferences through VS Code's settings panel."
        }
      ]
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What models does Vibe Code use?",
          a: "Vibe Code uses the same 40+ models as Vibe CLI across 4 providers, ensuring consistent AI quality and capabilities between terminal and editor experiences."
        },
        {
          q: "How do I update Vibe Code?",
          a: "VS Code automatically updates extensions. You can also manually update through the Extensions panel or download the latest VSIX from GitHub releases."
        },
        {
          q: "Is Vibe Code open source?",
          a: "Yes, Vibe Code is open source under the MIT license. Source code, documentation, and issue tracking are available on GitHub."
        }
      ]
    },
    {
      category: "Pricing & Future",
      questions: [
        {
          q: "Is Vibe Code really free?",
          a: "Yes, Vibe Code is completely free and will always remain free. We're committed to providing accessible AI-powered development tools for everyone."
        },
        {
          q: "What are the future plans for Vibe Code?",
          a: "We're working on enhanced IntelliSense integration, better debugging assistance, project-wide AI analysis, and deeper VS Code ecosystem integration."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about Vibe CLI and Vibe Code
            </p>
          </div>

          <Tabs defaultValue="cli" className="space-y-8">
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
              {cliFaqs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-4">
                  <h2 className="text-xl font-semibold font-serif text-foreground">
                    {category.category}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`cli-${categoryIndex}-${faqIndex}`}
                        className="border border-border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="vscode" className="space-y-8">
              {vscodeFaqs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-4">
                  <h2 className="text-xl font-semibold font-serif text-foreground">
                    {category.category}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`vscode-${categoryIndex}-${faqIndex}`}
                        className="border border-border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="mt-16 text-center bg-card rounded-2xl p-8 border border-border">
            <h2 className="text-2xl font-bold font-serif mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              We're here to help. Reach out to our community or check out our documentation for more information.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="https://github.com/mk-knight23/vibe/discussions" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              >
                <MessageCircle size={16} />
                Join Community
              </a>
              <a 
                href="https://github.com/mk-knight23/vibe" 
                className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-full hover:bg-accent transition-colors"
              >
                <Book size={16} />
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
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
