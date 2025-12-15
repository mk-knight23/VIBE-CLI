import { Navbar } from "@/components/navigation/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Download, Package, Code2, Copy } from "lucide-react";
import { useState } from "react";

export default function Installation() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const CodeBlock = ({ children, label }: { children: string; label: string }) => (
    <div className="relative bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 border border-gray-700">
      <pre className="overflow-x-auto">{children}</pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-700"
        onClick={() => copyToClipboard(children, label)}
      >
        {copiedText === label ? "Copied!" : <Copy size={14} />}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground mb-4">
              Installation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the fastest method for your platform. All approaches are local & privacy-first.
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
                VS Code Extension
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cli" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold font-serif mb-2">Install Vibe CLI</h2>
                <p className="text-muted-foreground">Terminal-based AI coding assistant</p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Terminal className="text-primary" size={20} />
                      <h3 className="text-lg font-semibold">Quick Install (macOS / Linux)</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2"># Auto-detect latest version</p>
                        <CodeBlock label="quick-install">curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe/main/vibe-cli/install.sh | bash</CodeBlock>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2"># Install specific version</p>
                        <CodeBlock label="version-install">VERSION=v2.1.8 curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe/main/vibe-cli/install.sh | bash</CodeBlock>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Download className="text-primary" size={20} />
                      <h3 className="text-lg font-semibold">Windows Install</h3>
                    </div>
                    <div className="space-y-4">
                      <CodeBlock label="windows-install">{`# Download release asset:
#   vibe-win-x64.exe
# Add directory to PATH as 'vibe'
# Then run:
vibe help

# Or via package managers:
choco install vibe-ai-cli    # Chocolatey
scoop install vibe-ai-cli    # Scoop`}</CodeBlock>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Package className="text-primary" size={20} />
                      <h3 className="text-lg font-semibold">Install via npm</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2"># Global install</p>
                        <CodeBlock label="npm-global">npm install -g vibe-ai-cli</CodeBlock>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2"># One-off run</p>
                        <CodeBlock label="npm-npx">npx vibe-ai-cli</CodeBlock>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Package className="text-primary" size={20} />
                      <h3 className="text-lg font-semibold">Install via Homebrew (macOS/Linux)</h3>
                    </div>
                    <CodeBlock label="homebrew">{`# Add the tap and install
brew tap mk-knight23/tap
brew install vibe-ai-cli`}</CodeBlock>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="vscode" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold font-serif mb-2">Install Vibe VS Code Extension</h2>
                <p className="text-muted-foreground">In-editor AI assistance for Visual Studio Code</p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Code2 className="text-primary" size={20} />
                    <h3 className="text-lg font-semibold">Install from VS Code Marketplace</h3>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <p>1. Open Visual Studio Code</p>
                    <p>2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)</p>
                    <p>3. Search for "vibe-vscode" or "Vibe VS Code" by mktech</p>
                    <p>4. Click the "Install" button</p>
                    <p>5. Restart VS Code to complete installation</p>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Alternative installation methods:</p>
                    <CodeBlock label="vsix-install">{`# Install from VSIX file
# Download vibe-vscode-*.vsix from GitHub releases
# In VS Code Command Palette: Extensions: Install from VSIX...`}</CodeBlock>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
